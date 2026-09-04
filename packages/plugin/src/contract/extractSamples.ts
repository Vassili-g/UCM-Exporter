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
import type {
  DependencyPropertySurface,
  DependencyPropertySurfaces,
  MasterInstanceDefaults,
  SwapDefaults,
} from './composedComponents';
import type { ComposedInstances } from './exportableNodes';
import type { PublishedNodePaths } from './extractLayout';
import { textSlots } from './extractVariantTypography';
import {
  isDisabledStateValue,
  isStateProperty,
  normalizePropKey,
  normalizePropValue,
} from './parsers';
import type { ContractPropertyModel } from './parsers';
import { figmaPath } from './slotRelations';
import type {
  ComposedDependency,
  ContractSample,
  SampleInstance,
  SampleOverride,
  SampleSwap,
  SampleText,
} from '@ucm/kit/format';

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
 * Visibilité effective d'un node dans l'instantané courant, `owner` inclus.
 *
 * Contrairement à `isStaticallyHidden`, une liaison dynamique ne transforme
 * pas `false` en « potentiellement visible » : l'échantillon décrit ce que la
 * maquette affiche maintenant.
 *
 * Ce que cette lecture filtre n'est PAS « tout ce qui est rendu » : c'est le
 * relevé POSITIONNEL NU — `text`, `override.text`, `swaps` —, celui qui rapporte
 * ce qu'un calque porte sans rapporter la condition qui le masque. Une valeur
 * d'`args` n'en est jamais : le booléen qui la masque voyage dans le MÊME
 * `args`, et la reconstruction n'a donc besoin de rien retirer pour être juste.
 * Filtrer `args` publierait au contraire `false` pour une prop qui vaut `true`.
 *
 * La frontière est toujours la racine du composant exporté, jamais l'instance
 * de dépendance : un cadre optionnel masqué AU-DESSUS d'une dépendance ne montre
 * rien de ce qu'elle contient. Elle se compose — `node` visible jusqu'à son
 * instance, puis l'instance visible jusqu'à la racine — pour que la remontée
 * garde au passage sa garde de confinement.
 */
export function isVisibleInSample(node: SceneNode, owner: SceneNode): boolean {
  let current: BaseNode | null | undefined = node;
  while (current) {
    if ('visible' in current && current.visible === false) return false;
    if (current === owner) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Le calque que chaque liaison `mainComponent` de cette instance désigne.
 *
 * Le relevé s'arrête sur une dépendance de la dépendance : ses calques sont
 * liés à SES propriétés, et un nom technique homonyme y volerait la réponse.
 * Il ne descend pas non plus sous un calque déjà lié — une INSTANCE_SWAP place
 * un composant entier, dont les liaisons internes appartiennent à celui-ci.
 *
 * Un `SLOT`, en revanche, ne coupe RIEN ici. Cette borne-là appartient aux
 * comparaisons POSITIONNELLES, qui supposent l'instance isomorphe à son maître ;
 * cette lecture-ci est NOMINALE — elle joint `componentPropertyReferences` à une
 * propriété déclarée. Couper sur un `SLOT` retirerait la clé d'`args` ET la
 * cible de `viaProps`, sans que `swaps` reprenne la main : le fait n'aurait plus
 * aucun propriétaire.
 */
function swapTargets(
  scope: InstanceNode,
  composed: ComposedInstances,
): Map<string, InstanceNode> {
  const cibles = new Map<string, InstanceNode>();
  const stack: SceneNode[] = [scope];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    if (node !== scope) {
      if (composed.has(node.id)) continue;
      const reference = swapReferenceOf(node);
      if (reference && node.type === 'INSTANCE') {
        // L'ordre du document tranche : Figma interdit deux calques liés à la
        // même INSTANCE_SWAP, mais la lecture ne doit pas en dépendre.
        if (!cibles.has(reference)) cibles.set(reference, node);
        continue;
      }
    }
    const children = 'children' in node ? node.children : [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }
  return cibles;
}

/** La propriété INSTANCE_SWAP dont ce calque tient son composant, si Figma en déclare une. */
function swapReferenceOf(node: SceneNode): string | undefined {
  try {
    return node.componentPropertyReferences?.mainComponent ?? undefined;
  } catch {
    return undefined;
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
 *
 * `resolveSwap` existe parce que `componentProperties` rend, pour une
 * INSTANCE_SWAP, l'IDENTIFIANT du node placé — « 1:1 » — et jamais son nom.
 * Publier cette valeur brute donnerait à `args` une clé publique et une valeur
 * illisible, là où la règle 1 n'admet que ce qu'un développeur pourrait écrire
 * lui-même. `propertyBindings.appliedValue` avait déjà tranché la question pour
 * le composant exporté ; l'échantillon d'une dépendance n'en avait pas hérité.
 */
function argumentsOf(
  properties: ComponentProperties,
  model: ContractPropertyModel,
  args: Record<string, string | boolean>,
  resolveSwap: (figmaName: string) => InstanceNode | undefined,
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
  viaProps: Set<string>,
  acceptedKeys?: ReadonlySet<string>,
): void {
  for (const [figmaName, property] of Object.entries(properties)) {
    const brute = normalizePropKey(figmaName);
    // Une VARIANT property est indexée sans son « #id », les autres avec.
    const key = model.publicPropertyKeyByFigmaName.get(figmaName)
      ?? model.publicVariantKeyByRawKey.get(brute);
    // Une propriété rejetée du modèle public ne doit jamais réapparaître sous
    // sa clé brute. Même garde pour une clé du wrapper écartée par collision.
    if (!key || (acceptedKeys && !acceptedKeys.has(key))) continue;

    let value: string | boolean | undefined;
    let cible: InstanceNode | undefined;
    if (property.type === 'VARIANT' && typeof property.value === 'string') {
      value = normalizePropValue(property.value);
    } else if (property.type === 'BOOLEAN' && typeof property.value === 'boolean') {
      value = property.value;
    } else if (property.type === 'TEXT' && typeof property.value === 'string') {
      value = property.value;
    } else if (property.type === 'INSTANCE_SWAP') {
      cible = resolveSwap(figmaName);
      const main = cible ? mainByInstanceId.get(cible.id) : undefined;
      // Un remplacement qu'on ne sait pas nommer est OMIS, jamais deviné : la
      // règle 2 interdit de dégrader, et `swaps` reste alors le seul relevé.
      value = main ? ownerComponentName(main) : undefined;
    }

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
    if (value === undefined) continue;
    if (Object.prototype.hasOwnProperty.call(args, key)) continue;
    Object.defineProperty(args, key, {
      value, enumerable: true, writable: true, configurable: true,
    });
    // Ce calque a désormais son propriétaire dans `args` : `swaps` ne doit plus
    // le rapporter. Cf. `swapsOf`.
    if (cible) viaProps.add(cible.id);
  }
}

/** Ce qu'une instance applique, et les calques dont `args` répond déjà. */
type InstanceArguments = {
  args: Record<string, string | boolean>;
  /** Ids des calques qu'une INSTANCE_SWAP publiée a déjà nommés. Cf. `swapsOf`. */
  viaProps: Set<string>;
};

/**
 * Les valeurs appliquées d'une instance et de son seul wrapper public élu.
 *
 * Figma peut remonter plusieurs instances exposées au niveau de l'instance
 * englobante. Seule celle dont l'owner est le wrapper de dimensions élu lors
 * de l'export autonome appartient toutefois à la surface publique du contrat.
 * Les autres restent des détails internes et ne sont jamais aplaties ici.
 *
 * L'ordre suit la règle de fusion de l'export : les clés du composant lui-même
 * l'emportent, celles du wrapper élu ne comblent que les trous.
 *
 * Le relevé des cibles d'INSTANCE_SWAP est PARESSEUX : un composé dont aucune
 * dépendance n'expose de remplacement natif ne parcourt aucun sous-arbre de
 * plus qu'avant.
 */
function instanceArguments(
  instance: InstanceNode,
  surface: DependencyPropertySurface,
  composed: ComposedInstances,
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
): InstanceArguments {
  const args: Record<string, string | boolean> = {};
  const viaProps = new Set<string>();
  const resolveurPour = (scope: InstanceNode) => {
    let cibles: Map<string, InstanceNode> | null = null;
    return (figmaName: string): InstanceNode | undefined => {
      cibles ??= swapTargets(scope, composed);
      return cibles.get(figmaName);
    };
  };

  argumentsOf(
    componentPropertiesOf(instance), surface.direct, args,
    resolveurPour(instance), mainByInstanceId, viaProps,
  );

  if (surface.wrapper && surface.wrapperOwnerId) {
    let exposees: readonly InstanceNode[] = [];
    try {
      exposees = instance.exposedInstances ?? [];
    } catch {
      exposees = [];
    }
    const wrappers = exposees.filter((exposee) => {
      const main = mainByInstanceId.get(exposee.id);
      if (!main) return false;
      const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
      return owner.id === surface.wrapperOwnerId;
    });
    // Zéro ou plusieurs correspondances ne donnent aucune réponse fiable :
    // jamais de première occurrence arbitraire.
    if (wrappers.length === 1) {
      const wrapper = wrappers[0];
      argumentsOf(
        componentPropertiesOf(wrapper), surface.wrapper.model, args,
        resolveurPour(wrapper), mainByInstanceId, viaProps,
        surface.wrapper.acceptedKeys,
      );
    }
  }
  return { args, viaProps };
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
  root: SceneNode,
  nodesById: ReadonlyMap<string, SceneNode>,
): Array<{ node: SceneNode; override: SampleOverride }> {
  // Une instance que la maquette ne montre pas n'affiche aucun de ses textes.
  // Le calcul se fait une fois pour tout le relevé, pas par surcharge.
  const instanceVisible = isVisibleInSample(instance, root);
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
    if (
      champs.has('characters')
      && node.type === 'TEXT'
      && instanceVisible
      && isVisibleInSample(node, instance)
    ) {
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
  propertySurfaces: DependencyPropertySurfaces = new Map(),
): ContractSample {
  const sample: ContractSample = {};

  if (applied && Object.keys(applied).length > 0) sample.args = { ...applied };

  // Un texte que porte une TEXT property est déjà dans `args` : le republier
  // ici donnerait deux propriétaires au même fait.
  const texts: SampleText[] = [];
  for (const { slotPath, textNode, leaf } of textSlots(source.component, iconNames, composed)) {
    if (textNode.componentPropertyReferences?.characters) continue;
    if (!isVisibleInSample(textNode, source.component)) continue;
    // `figmaLayer` qui vaut le texte lui-même est le cas ORDINAIRE : Figma nomme
    // un calque texte d'après ce qu'il dit tant que personne ne l'a renommé. Le
    // signal reste entier sans être écrit deux fois — son absence dit « jamais
    // renommé », exactement ce que la redondance disait.
    texts.push({
      slotPath,
      ...(leaf.name === textNode.characters ? {} : { figmaLayer: leaf.name }),
      value: textNode.characters,
    });
  }
  if (texts.length > 0) sample.text = texts;

  const composes = dependencySamples(
    source,
    composed,
    mainByInstanceId,
    swapDefaults,
    propertySurfaces,
  );
  if (composes.length > 0) sample.composes = composes;

  return sample;
}

/**
 * Les instances que CE parent a remplacées dans une dépendance.
 *
 * Figma ne rapporte pas un remplacement : `NodeChangeProperty` ne contient pas
 * `mainComponent`, et `InstanceNode.overrides` reste donc muet. Il se lit par
 * comparaison avec le composant maître, position par position — la structure
 * d'une instance est isomorphe à celle de son maître hors contenu libre d'un
 * SLOT.
 *
 * Deux bornes, qui sont la frontière de composition elle-même :
 *
 * 1. On ne descend pas dans une dépendance de la dépendance : ce qu'elle
 *    contient appartient à SON contrat, et elle a son propre échantillon.
 * 2. On ne descend ni dans le contenu libre d'un SLOT, ni sous un calque déjà
 *    déclaré remplacé : son contenu vient d'un autre composant, et plus aucune
 *    position n'y correspond au maître.
 *
 * Le relevé suit la visibilité effective, racine du composant exportée comprise.
 * La perte est assumée et se lit dans l'autre sens : un remplacement posé sous
 * un cadre que CE variant masque n'est pas publié, parce que l'échantillon dit
 * ce que la maquette montre, variant par variant — le variant qui affiche ce
 * cadre publie, lui, le remplacement.
 *
 * La comparaison porte sur le composant PROPRIÉTAIRE, jamais sur la variante :
 * choisir une autre variante d'un même component set n'est pas un
 * remplacement, et le contrat de la dépendance décrit déjà ce choix.
 *
 * Troisième borne, et elle vient d'ailleurs : ce qu'`args` a déjà nommé n'est
 * pas republié. Quand la dépendance expose une INSTANCE_SWAP sur ce calque,
 * son contrat en tire une prop — `mergeIconRules` y pose `runtimeProp` plutôt
 * qu'une prop de synthèse, précisément « pour ne pas obliger le consommateur à
 * choisir entre deux sources de vérité ». Ce relevé-ci ne doit pas rouvrir le
 * choix que celui-là a fermé : un même fait n'a jamais deux propriétaires.
 */
function swapsOf(
  instance: InstanceNode,
  root: SceneNode,
  defaults: MasterInstanceDefaults,
  composed: ComposedInstances,
  mainByInstanceId: ReadonlyMap<string, ComponentNode>,
  viaProps: ReadonlySet<string>,
): SampleSwap[] {
  const swaps: SampleSwap[] = [];
  const stack: Array<{
    node: SceneNode;
    indexes: readonly number[];
    visible: boolean;
  }> = [{ node: instance, indexes: [], visible: isVisibleInSample(instance, root) }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    if (
      !current.visible
      || (current.node !== instance && composed.has(current.node.id))
    ) continue;

    if (current.node !== instance && current.node.type === 'INSTANCE') {
      // `args` répond déjà pour ce calque : le contenu vient d'ailleurs, et
      // plus aucune position n'y correspond au maître — comme après un swap.
      if (viaProps.has(current.node.id)) continue;
      const defaut = defaults.get(current.indexes.join('.'));
      const main = mainByInstanceId.get(current.node.id);
      if (defaut && main) {
        const component = ownerComponentName(main);
        if (component !== defaut.component) {
          swaps.push({ masterPath: defaut.masterPath, component });
          continue;
        }
      }
    }

    if (current.node.type === 'SLOT') continue;
    const children = 'children' in current.node ? current.node.children : [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      stack.push({
        node: child,
        indexes: [...current.indexes, index],
        // La visibilité héritée voyage avec le parcours : chaque calque est
        // lu une seule fois, même sur un arbre très profond.
        visible: current.visible && child.visible !== false,
      });
    }
  }
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
  propertySurfaces: DependencyPropertySurfaces,
): SampleInstance[] {
  const index = indexSampleDependencies(source.component, composed);
  if (index.entries.length === 0) return [];

  // `propertySurfaces` est l'UNIQUE autorité sur la surface publique d'une
  // dépendance : c'est elle qui a élu le wrapper, du même geste que l'export
  // autonome de cette dépendance. En fabriquer une ici en dernier recours
  // donnerait une seconde réponse — sans wrapper, faute de pouvoir l'élire
  // sans aller-retour — à une question qui n'en admet qu'une. Un owner absent
  // de l'index laisse donc la dépendance sans `args`, jamais avec des `args`
  // que l'export de cette dépendance contredirait.
  const surfaceOf = (instance: InstanceNode): DependencyPropertySurface | null => {
    const main = mainByInstanceId.get(instance.id);
    if (!main) return null;
    const owner = main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
    return propertySurfaces.get(owner.id) ?? null;
  };

  const echantillons = new Map<string, SampleInstance>();
  const racines: SampleInstance[] = [];
  const enfantsPar = new Map<string, SampleInstance[]>();

  for (const { instance, dependency, parent } of index.entries) {
    const echantillon: SampleInstance = {
      figmaLayer: instance.name,
      component: dependency.component,
    };
    const surface = surfaceOf(instance);
    const { args, viaProps } = surface
      ? instanceArguments(instance, surface, composed, mainByInstanceId)
      : { args: {}, viaProps: new Set<string>() };
    if (Object.keys(args).length > 0) echantillon.args = args;

    const main = mainByInstanceId.get(instance.id);
    const defauts = main ? swapDefaults.get(main.id) : undefined;
    const swaps = defauts
      ? swapsOf(instance, source.component, defauts, composed, mainByInstanceId, viaProps)
      : [];
    if (swaps.length > 0) echantillon.swaps = swaps;

    echantillons.set(instance.id, echantillon);
    if (!parent) {
      // Une dépendance que l'arbre publié ne situe pas est déjà signalée
      // ailleurs, et absente de `composes` : la publier sans chemin ferait
      // passer une racine non placée pour une dépendance imbriquée.
      if (!source.paths.has(instance.id)) continue;
      echantillon.slotPath = source.paths.get(instance.id);
      racines.push(echantillon);
      continue;
    }
    const fratrie = enfantsPar.get(parent.id) ?? [];
    fratrie.push(echantillon);
    enfantsPar.set(parent.id, fratrie);
  }

  attribuerSurcharges(
    index.entries.map(({ instance }) => instance),
    source.component,
    echantillons,
    index.nodesById,
    index.ownerByNodeId,
  );

  for (const [id, enfants] of enfantsPar) {
    const parent = echantillons.get(id);
    if (parent && enfants.length > 0) parent.composes = enfants;
  }
  return racines;
}

type IndexedSampleDependency = {
  instance: InstanceNode;
  dependency: ComposedDependency;
  /** Dépendance propriétaire immédiate, absente pour une racine. */
  parent: InstanceNode | null;
};

/**
 * Indexe en une passe les dépendances et le propriétaire de chaque node.
 *
 * Transporter le propriétaire pendant la descente évite de remonter les parents
 * pour chaque dépendance et chaque surcharge. L'ordre reste celui du document.
 */
function indexSampleDependencies(
  root: ComponentNode,
  composed: ComposedInstances,
): {
  entries: IndexedSampleDependency[];
  nodesById: Map<string, SceneNode>;
  ownerByNodeId: Map<string, InstanceNode>;
} {
  const entries: IndexedSampleDependency[] = [];
  const nodesById = new Map<string, SceneNode>();
  const ownerByNodeId = new Map<string, InstanceNode>();

  const stack: Array<{ node: SceneNode; owner: InstanceNode | null }> = [
    { node: root, owner: null },
  ];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    const { node, owner } = current;
    nodesById.set(node.id, node);
    // Le node qui EST une dépendance appartient encore à son parent ; ses
    // descendants, eux, lui appartiennent. C'est la sémantique exacte de
    // `nearestAncestorIn`, sans une remontée par trouvaille.
    if (owner) ownerByNodeId.set(node.id, owner);

    let childOwner = owner;
    const dependency = composed.get(node.id);
    if (dependency && node.type === 'INSTANCE') {
      entries.push({ instance: node, dependency, parent: owner });
      childOwner = node;
    }

    const children = 'children' in node ? node.children : [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], owner: childOwner });
    }
  }
  return { entries, nodesById, ownerByNodeId };
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
 * Le contenu d'une dépendance imbriquée lui appartient, pas à son parent : sans
 * ce routage, un composé publierait sous une dépendance des valeurs qui en
 * concernent une autre.
 */
function attribuerSurcharges(
  instances: readonly InstanceNode[],
  root: SceneNode,
  echantillons: ReadonlyMap<string, SampleInstance>,
  nodesById: ReadonlyMap<string, SceneNode>,
  ownerByNodeId: ReadonlyMap<string, InstanceNode>,
): void {
  const vues = new Set<string>();

  for (const instance of instances) {
    for (const { node, override } of overridesOf(instance, root, nodesById)) {
      if (vues.has(node.id)) continue;
      vues.add(node.id);
      const proprietaire = ownerByNodeId.get(node.id);
      if (!proprietaire) continue;
      const echantillon = echantillons.get(proprietaire.id);
      if (!echantillon) continue;
      override.figmaPath = figmaPath(node, proprietaire);
      (echantillon.overrides ??= []).push(override);
    }
  }
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
  variants: ReadonlyArray<{ figmaName?: string; sample?: string }>,
): string | null {
  const references = variants.filter(
    (variant): variant is { figmaName: string; sample: string } =>
      Boolean(variant.sample) && Boolean(variant.figmaName),
  );
  const distincts = new Set(references.map((variant) => variant.sample));
  if (distincts.size <= 1) return null;

  // Le contenu le plus répandu sert de référence : ce sont les autres qui
  // s'en écartent, et que le message nomme.
  const counts = new Map<string, number>();
  for (const variant of references) {
    counts.set(variant.sample, (counts.get(variant.sample) ?? 0) + 1);
  }
  let majoritaire = '';
  let meilleur = 0;
  for (const [cle, compte] of counts) {
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
