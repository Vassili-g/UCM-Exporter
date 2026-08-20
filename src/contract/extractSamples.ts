/**
 * Ce que la maquette Figma MONTRE — l'échantillon, unique autorité.
 *
 * Le contrat décrit ce qu'un composant peut rendre ; il ne disait pas ce que le
 * designer y a réellement écrit. Cette information existait déjà, mais par
 * accident : Figma nomme un calque texte d'après son contenu tant que personne
 * ne l'a renommé, si bien que `figmaLayer` répondait tantôt « quel calque »,
 * tantôt « quel texte », sans qu'on puisse distinguer les deux. Ce module démêle
 * l'identité du contenu et rend le second fiable.
 *
 * Trois règles le tiennent, et elles valent pour tout ce qui suit :
 *
 * 1. **Rien que des valeurs de props.** Du texte, un booléen, une valeur d'enum,
 *    un nom de composant — jamais un token, une couleur, une dimension. Une
 *    donnée de rendu qui manquerait ici manque au contrat normatif, et c'est là
 *    qu'il faut la corriger.
 * 2. **Aucun geste demandé.** L'échantillon n'avertit de rien et ne dégrade
 *    jamais la couverture : ce qu'il ne sait pas lire, il l'omet. Il donne du
 *    contexte, il n'engage personne.
 * 3. **On lit ce qu'une instance EXPOSE, jamais ce qu'elle contient.** Les
 *    calques d'une dépendance appartiennent à son contrat. Seules ses props et
 *    ce que CE parent y a CHANGÉ remontent ici : les surcharges que
 *    `InstanceNode.overrides` rapporte, et les remplacements d'instance qu'il ne
 *    rapporte pas, lus en comparant l'instance à son maître.
 */
import { ownerComponentName } from './composedComponents';
import type { MasterInstanceDefaults, SwapDefaults } from './composedComponents';
import { isStaticallyHidden, nearestAncestorIn } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import type { PublishedNodePaths } from './extractLayout';
import { textSlots } from './extractVariantTypography';
import {
  extractContractPropertyModel,
  isDisabledStateValue,
  isStateProperty,
  normalizePropKey,
  normalizePropValue,
} from './parsers';
import type { ContractPropertyModel } from './parsers';
import { figmaPath } from './slotRelations';
import type {
  ContractSample,
  SampleInstance,
  SampleOverride,
  SampleSwap,
  SampleText,
} from './types';

/** Ce que le module a besoin de savoir d'un variant pour l'échantillonner. */
export type SampleSource = {
  component: ComponentNode;
  /** Chemins de l'arbre exact, collectés pendant l'extraction de sa vue. */
  paths: PublishedNodePaths;
};

/** Lecture gardée : `componentProperties` lève sur une instance orpheline. */
function componentPropertiesOf(instance: InstanceNode): ComponentProperties {
  try {
    return instance.componentProperties;
  } catch {
    return {};
  }
}

/**
 * Traduit les propriétés appliquées d'une instance dans les clés publiques du
 * contrat de son composant.
 *
 * Le modèle vient de `extractContractPropertyModel`, la fonction PURE qui
 * produit précisément ces clés lors de l'export de la dépendance : les noms
 * publiés ici sont donc les siens, renommage sémantique compris. Ses
 * avertissements sont jetés — ils appartiennent à cet export-là, pas à
 * celui-ci.
 */
function argumentsOf(
  properties: ComponentProperties,
  model: ContractPropertyModel,
  args: Record<string, string | boolean>,
): void {
  for (const [figmaName, property] of Object.entries(properties)) {
    const brute = normalizePropKey(figmaName);
    // Une VARIANT property est indexée sans son « #id », les autres avec.
    const key = model.publicPropertyKeyByFigmaName.get(figmaName)
      ?? model.publicVariantKeyByRawKey.get(brute)
      ?? brute;
    const value = property.type === 'VARIANT' && typeof property.value === 'string'
      ? normalizePropValue(property.value)
      : property.value;

    // L'axe d'états n'est pas une prop — le contrat de la dépendance le publie
    // dans `stateModel`. Sa valeur reste néanmoins publiée sous la clé de
    // l'axe : c'est elle qui permet de rapprocher cet échantillon d'un
    // `variants[].values` de ce contrat-là. Sa valeur « Disable » porte en plus
    // la prop publique que le contrat en tire.
    if (isStateProperty(key) && isDisabledStateValue(property.value)) {
      Object.defineProperty(args, 'disabled', {
        value: true, enumerable: true, writable: true, configurable: true,
      });
    }
    if (Object.prototype.hasOwnProperty.call(args, key)) continue;
    Object.defineProperty(args, key, {
      value, enumerable: true, writable: true, configurable: true,
    });
  }
}

/**
 * Les valeurs appliquées d'une instance, y compris celles de ses instances
 * exposées.
 *
 * Une instance exposée n'est pas un interne : Figma remonte ses propriétés au
 * niveau de l'instance englobante, elles font donc partie de sa surface
 * publique. C'est ce qui rattrape une prop portée par le wrapper de dimensions
 * d'une dépendance — `size` chez un Button — que `componentProperties` seul ne
 * voit pas.
 *
 * L'ordre suit la règle de fusion de l'export : les clés du composant lui-même
 * l'emportent, celles d'une instance exposée ne comblent que les trous.
 */
function instanceArguments(
  instance: InstanceNode,
  modelOf: (instance: InstanceNode) => ContractPropertyModel | null,
): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const model = modelOf(instance);
  if (model) argumentsOf(componentPropertiesOf(instance), model, args);

  let exposees: readonly InstanceNode[] = [];
  try {
    exposees = instance.exposedInstances ?? [];
  } catch {
    exposees = [];
  }
  for (const exposee of exposees) {
    const exposeeModel = modelOf(exposee);
    if (exposeeModel) argumentsOf(componentPropertiesOf(exposee), exposeeModel, args);
  }
  return args;
}

/**
 * Ce que CE parent a changé dans une instance, indexé par le node touché.
 *
 * `instance.overrides` ne rend que les surcharges DIRECTES : ce que le composant
 * de la dépendance fournit lui-même n'y figure pas, et c'est exactement la
 * frontière recherchée. La lecture est défensive de bout en bout — un
 * identifiant qu'on ne sait pas résoudre, un champ hors des deux retenus, un
 * runtime qui n'expose pas le tableau : rien de tout cela ne doit interrompre un
 * export dont ce champ n'est qu'un complément.
 */
function overridesOf(
  instance: InstanceNode,
  nodesById: ReadonlyMap<string, SceneNode>,
): Array<{ node: SceneNode; override: SampleOverride }> {
  let releves: readonly { id: string; overriddenFields: NodeChangeProperty[] }[] = [];
  try {
    releves = instance.overrides ?? [];
  } catch {
    return [];
  }

  // Deux champs seulement. `NodeChangeProperty` en compte des dizaines, mais
  // toutes les autres décrivent du RENDU — remplissage, rayon, dimension — que
  // la règle 1 écarte. `mainComponent` n'y figure pas du tout : Figma ne
  // l'expose pas dans ce relevé, et une icône substituée sans propriété reste
  // donc hors de portée. Le geste attendu est d'exposer un INSTANCE_SWAP, et le
  // cas rejoint alors `args`.
  const resultats: Array<{ node: SceneNode; override: SampleOverride }> = [];
  for (const releve of releves) {
    const node = nodesById.get(releve.id);
    if (!node || node === instance) continue;
    const champs = new Set<string>(releve.overriddenFields ?? []);
    const override: SampleOverride = { figmaPath: [] };
    let porte = false;
    if (champs.has('characters') && node.type === 'TEXT') {
      override.text = node.characters;
      porte = true;
    }
    if (champs.has('visible')) {
      override.visible = node.visible !== false;
      porte = true;
    }
    if (porte) resultats.push({ node, override });
  }
  return resultats;
}

/**
 * L'échantillon d'un variant : ce qu'il applique, ce qu'il écrit, ce qu'il
 * embarque.
 *
 * `applied` vient de `extractPropertyBindings`, seul module qui sache quel
 * calque porte quelle prop dans quel variant ; `paths` vient de l'extraction de
 * la vue exacte, seule autorité sur les chemins de slots. Ce module n'en
 * recalcule aucun : deux calculs finiraient par désigner des slots que la vue ne
 * contient pas.
 */
export function extractVariantSample(
  source: SampleSource,
  applied: Record<string, string | boolean> | undefined,
  iconNames: ReadonlySet<string>,
  composed: ComposedInstances,
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
  swapDefaults: SwapDefaults = new Map(),
): ContractSample {
  const sample: ContractSample = {};

  if (applied && Object.keys(applied).length > 0) sample.args = { ...applied };

  // Un texte que porte une TEXT property est déjà dans `args` : le republier
  // ici donnerait deux propriétaires au même fait.
  const texts: SampleText[] = [];
  for (const { slotPath, textNode, leaf } of textSlots(source.component, iconNames, composed)) {
    if (textNode.componentPropertyReferences?.characters) continue;
    texts.push({ slotPath, figmaLayer: leaf.name, value: textNode.characters });
  }
  if (texts.length > 0) sample.text = texts;

  const composes = dependencySamples(source, composed, mainByInstanceId, swapDefaults);
  if (composes.length > 0) sample.composes = composes;

  return sample;
}

/**
 * Les instances que CE parent a remplacées dans une dépendance.
 *
 * Figma ne rapporte pas un remplacement : `NodeChangeProperty` ne contient pas
 * `mainComponent`, et `InstanceNode.overrides` reste donc muet. Il se lit par
 * comparaison avec le composant maître, position par position — la structure
 * d'une instance est isomorphe à celle de son maître, puisqu'on n'y ajoute, n'y
 * retire et n'y réordonne aucun calque.
 *
 * Deux bornes, qui sont la frontière de composition elle-même :
 *
 * 1. On ne descend pas dans une dépendance de la dépendance : ce qu'elle
 *    contient appartient à SON contrat, et elle a son propre échantillon.
 * 2. On ne descend pas sous un calque déjà déclaré remplacé : son contenu vient
 *    d'un autre composant, et plus aucune position n'y correspond au maître.
 *
 * La comparaison porte sur le composant PROPRIÉTAIRE, jamais sur la variante :
 * choisir une autre variante d'un même component set n'est pas un
 * remplacement, et le contrat de la dépendance décrit déjà ce choix.
 */
function swapsOf(
  instance: InstanceNode,
  defaults: MasterInstanceDefaults,
  composed: ComposedInstances,
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
): SampleSwap[] {
  const swaps: SampleSwap[] = [];
  const visit = (node: SceneNode, indexes: readonly number[]) => {
    const children = 'children' in node ? node.children : [];
    children.forEach((child, index) => {
      // Un calque que rien ne peut afficher ne montre rien.
      if (isStaticallyHidden(child)) return;
      if (composed.has(child.id)) return;
      const position = [...indexes, index];
      if (child.type === 'INSTANCE') {
        const defaut = defaults.get(position.join('.'));
        const main = mainByInstanceId.get(child.id);
        if (defaut && main) {
          const component = ownerComponentName(main);
          if (component !== defaut.component) {
            swaps.push({ masterPath: defaut.masterPath, component });
            return;
          }
        }
      }
      visit(child, position);
    });
  };
  visit(instance, []);
  return swaps;
}

/**
 * Les dépendances d'un variant, dans l'ordre du document et rangées comme
 * l'arbre les imbrique.
 *
 * Le relevé de composition a déjà reconnu TOUTES les instances contractées, y
 * compris celles imbriquées dans une autre : la récursion ne coûte donc aucune
 * reconnaissance supplémentaire, seulement de rattacher chacune à son plus
 * proche ancêtre contracté.
 */
function dependencySamples(
  source: SampleSource,
  composed: ComposedInstances,
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
  swapDefaults: SwapDefaults,
): SampleInstance[] {
  const instances = source.component
    .findAll((node) => composed.has(node.id))
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');
  if (instances.length === 0) return [];

  const modelesParOwner = new Map<string, ContractPropertyModel>();
  const modelOf = (instance: InstanceNode): ContractPropertyModel | null => {
    const main = mainByInstanceId.get(instance.id);
    if (!main) return null;
    const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
    const connu = modelesParOwner.get(owner.id);
    if (connu) return connu;
    // Les avertissements de ce modèle appartiennent à l'export de la
    // dépendance, qui les produira sur son propre document.
    //
    // Le repli sur `{}` n'est pas de la superstition : un composant maître peut
    // n'exposer aucune propriété, et l'échantillon ne doit jamais être la raison
    // pour laquelle un export échoue.
    const model = extractContractPropertyModel(owner.componentPropertyDefinitions ?? {}, []);
    modelesParOwner.set(owner.id, model);
    return model;
  };

  const echantillons = new Map<string, SampleInstance>();
  const racines: SampleInstance[] = [];
  const enfantsPar = new Map<string, SampleInstance[]>();

  for (const instance of instances) {
    const dependency = composed.get(instance.id);
    if (!dependency) continue;
    const echantillon: SampleInstance = {
      figmaLayer: instance.name,
      component: dependency.component,
    };
    const args = instanceArguments(instance, modelOf);
    if (Object.keys(args).length > 0) echantillon.args = args;

    const main = mainByInstanceId.get(instance.id);
    const defauts = main ? swapDefaults.get(main.id) : undefined;
    const swaps = defauts ? swapsOf(instance, defauts, composed, mainByInstanceId) : [];
    if (swaps.length > 0) echantillon.swaps = swaps;

    echantillons.set(instance.id, echantillon);
    const parent = nearestAncestorIn(instance, source.component, composed);
    if (!parent) {
      // Une dépendance que l'arbre publié ne situe pas est déjà signalée
      // ailleurs, et absente de `composes` : la publier sans chemin ferait
      // passer une racine non placée pour une dépendance imbriquée.
      if (!source.paths.has(instance.id)) continue;
      echantillon.slotPath = source.paths.get(instance.id);
      racines.push(echantillon);
      continue;
    }
    const parentInstance = instances.find(
      (candidate) => composed.get(candidate.id) === parent,
    );
    if (!parentInstance) continue;
    const fratrie = enfantsPar.get(parentInstance.id) ?? [];
    fratrie.push(echantillon);
    enfantsPar.set(parentInstance.id, fratrie);
  }

  attribuerSurcharges(instances, source.component, composed, echantillons);

  for (const [id, enfants] of enfantsPar) {
    const parent = echantillons.get(id);
    if (parent && enfants.length > 0) parent.composes = enfants;
  }
  return racines;
}

/**
 * Range chaque surcharge sous la dépendance qui la contient au plus près.
 *
 * Le relevé est fait sur TOUTES les instances, et chaque trouvaille est routée
 * vers son propriétaire réel plutôt que rattachée à l'instance qui l'a
 * rapportée. Figma documente `overrides` comme « directes, héritées exclues »
 * sans dire à quel niveau apparaît la surcharge d'une instance imbriquée ;
 * router plutôt que présumer rend la lecture juste dans les deux cas, et le
 * dédoublonnage par node absorbe une éventuelle double déclaration.
 *
 * Le texte que le bouton d'une alerte affiche appartient au bouton, pas à
 * l'alerte : sans ce routage, un composé publierait sous une dépendance des
 * valeurs qui en concernent une autre.
 */
function attribuerSurcharges(
  instances: readonly InstanceNode[],
  racine: SceneNode,
  composed: ComposedInstances,
  echantillons: ReadonlyMap<string, SampleInstance>,
): void {
  const parInstance = new Map(instances.map((instance) => [instance.id, instance] as const));
  const vues = new Set<string>();

  for (const instance of instances) {
    // Un seul parcours du sous-arbre, pour résoudre les identifiants du relevé.
    const nodesById = new Map<string, SceneNode>();
    for (const node of instance.findAll(() => true)) nodesById.set(node.id, node);
    nodesById.set(instance.id, instance);

    for (const { node, override } of overridesOf(instance, nodesById)) {
      if (vues.has(node.id)) continue;
      vues.add(node.id);
      const proprietaire = trouverProprietaire(node, racine, composed, parInstance);
      if (!proprietaire) continue;
      const echantillon = echantillons.get(proprietaire.id);
      if (!echantillon) continue;
      override.figmaPath = figmaPath(node, proprietaire);
      (echantillon.overrides ??= []).push(override);
    }
  }
}

/** L'instance contractée la plus proche qui contient ce node, si on la connaît. */
function trouverProprietaire(
  node: SceneNode,
  racine: SceneNode,
  composed: ComposedInstances,
  parInstance: ReadonlyMap<string, InstanceNode>,
): InstanceNode | null {
  const dependance = nearestAncestorIn(node, racine, composed);
  if (!dependance) return null;
  for (const instance of parInstance.values()) {
    if (composed.get(instance.id) === dependance) return instance;
  }
  return null;
}

/**
 * Constate qu'un même component set montre plusieurs contenus de maquette.
 *
 * Ce n'est pas un avertissement : rien ne manque, et le contrat conserve chaque
 * contenu. Le message suit ses jumeaux sur la structure et la composition, et
 * emprunte le même canal qu'eux.
 *
 * Il ne demande RIEN, et sa formulation s'y tient. Il réclamait d'aligner les
 * contenus dans Figma « si ces variantes devaient montrer le même texte » :
 * c'était un geste demandé par l'échantillon, que l'invariant lui interdit, et
 * il tombait sur le cas le plus normal qui soit — un axe de variantes existe
 * précisément pour montrer des contenus différents. Reste le constat, qui dit
 * où lire chaque contenu ; c'est au designer de décider s'il y a une
 * incohérence, et le contrat lui donne de quoi la voir.
 */
export function sampleVarianceNotice(
  variants: ReadonlyArray<{ figmaName: string; sample?: string }>,
): string | null {
  const references = variants.filter(
    (variant): variant is { figmaName: string; sample: string } => Boolean(variant.sample),
  );
  const distincts = new Set(references.map((variant) => variant.sample));
  if (distincts.size <= 1) return null;

  // Le contenu le plus répandu sert de référence : ce sont les autres qui
  // s'en écartent, et que le message nomme.
  let majoritaire = '';
  let meilleur = 0;
  for (const cle of distincts) {
    const compte = references.filter((variant) => variant.sample === cle).length;
    if (compte > meilleur) {
      meilleur = compte;
      majoritaire = cle;
    }
  }
  const ecarts = references.filter((variant) => variant.sample !== majoritaire);
  const exemples = ecarts.slice(0, 3).map((variant) => `« ${variant.figmaName} »`).join(', ');
  const reste = ecarts.length - 3;

  return `Contenu de maquette différent sur ${ecarts.length} `
    + `variante${ecarts.length > 1 ? 's' : ''}, ex. ${exemples}`
    + `${reste > 0 ? ` (+${reste})` : ''} : le contrat conserve chaque contenu dans `
    + `« samples ».`;
}
