/**
 * Lecture des règles d'usage d'un composant depuis son « .componentRules ».
 *
 * Chaque composant décrit ses règles dans une instance du composant Figma
 * `.componentRules`, posée sur la même page que lui. Le lien entre les deux ne
 * passe plus par un nom de calque mais par un texte affiché : le calque
 * « component-name » du conteneur porte le nom du composant documenté.
 *
 * Le conteneur range des instances de `.rulesItems`, une par règle, dont le
 * calque nommé `@usage`, `@prop`, `@boolean`, `@do`, `@dont`, `@pairs`,
 * `@icons` ou `@default` porte le tag, et dont le calque « content » porte le
 * texte (plus un calque « prop » pour `@prop`, `@boolean` et `@default`, ex.
 * « variant.contained » ou « icon-left », un calque « icon » pour `@icons`).
 *
 * Aucune logique spécifique à un composant : le conteneur, le composant de
 * règle et les tags sont des conventions uniformes, valables pour n'importe
 * quel composant.
 *
 * Le plugin n'écrit jamais dans Figma : ce conteneur reste la source de vérité,
 * lu tel quel et reversé dans le contrat.
 */
import {
  buildRules,
  iconPolicyFromVisibility,
  ruleTagFromLayerName,
  ruleTagFromValue,
} from './rulesModel';
import type { RuleEntry, RuleTag, RulesResult } from './rulesModel';
export {
  buildRules,
  hasUsableRules,
  iconPolicyFromVisibility,
  ruleTagFromLayerName,
  ruleTagFromValue,
} from './rulesModel';
import {
  noterSansNode,
  pointDe,
  pousserLocalise,
  pousserNote,
  pousserSansNode,
  reporterLocalisations,
  sujetNomme,
  sujetSansNode,
} from './localisation';
export type { IconRule, RuleEntry, RuleTag, RulesResult } from './rulesModel';

/**
 * Nom canonique du composant qui porte un jeu de règles, tel qu'un message le
 * nomme. Exporté parce qu'il ne sert pas qu'à lire les règles : posséder un tel
 * conteneur est ce qui déclare un composant comme dépendance UCM, plutôt que
 * comme détail interne à parcourir (cf. `composedComponents.ts`). Il ne
 * conditionne plus l'export du composant lui-même depuis la 8.0.
 */
export const RULES_CONTAINER_NAME = '.componentRules';
/** Calque du conteneur qui porte le nom du composant documenté. */
export const COMPONENT_NAME_LAYER = 'component-name';
/** Nom (compacté) du composant qui matérialise une règle. */
const RULES_COMPONENT_NAME = '.rulesitems';
/** Compacte un nom (sans espaces, en minuscules) pour comparer un nom de composant. */
export function compactName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

/** Résultat de lecture enrichi pour distinguer l'absence du conteneur de son contenu invalide. */
export type ExtractedRules = RulesResult & { sectionFound: boolean };

/**
 * Ce qu'un node doit offrir pour qu'on cherche un calque dans sa descendance.
 *
 * `findOne` est facultatif parce que le prédicat d'un `findAll` de page reçoit
 * tous les types de node, feuilles comprises : un `TextNode` n'a pas de
 * descendance, et exiger la méthode ferait de ce fait un cast.
 */
type NodeFouillable = {
  type: string;
  findOne?: (predicat: (child: SceneNode) => boolean) => SceneNode | null;
};

/** Texte du premier calque texte d'un nom donné dans un node (vide si absent). */
function textOfLayer(node: NodeFouillable, layerName: string): string {
  const found = layerOfName(node, layerName.trim().toLowerCase());
  return found ? found.characters : '';
}

/** Premier calque texte d'un nom donné, ou null : `textOfLayer` confond les deux. */
function layerOfName(node: NodeFouillable, target: string): TextNode | null {
  const found = node.findOne?.(
    (child) => child.type === 'TEXT' && child.name.trim().toLowerCase() === target,
  );
  return (found ?? null) as TextNode | null;
}

/**
 * Nom écrit dans le calque « component-name » d'un node, ou null si le node
 * n'en porte pas.
 *
 * La chaîne vide et l'absence ne disent pas la même chose, et c'est pourquoi
 * elles ne se confondent pas ici : un conteneur au calque vide documente
 * personne et peut se signaler, tandis qu'un node ordinaire n'a rien à dire.
 *
 * Le type `INSTANCE` est exigé pour une raison mesurée : le composant maître
 * `.componentRules` porte lui aussi ce calque, pré-rempli avec le nom du
 * composant qui a servi de modèle. Sans cette borne, ce maître revendiquerait
 * les règles d'un composant qu'il ne documente pas.
 */
function nomDeComposantEcrit(node: NodeFouillable): string | null {
  if (node.type !== 'INSTANCE') return null;
  const calque = layerOfName(node, COMPONENT_NAME_LAYER);
  return calque ? calque.characters : null;
}

/**
 * Nom compacté du composant dont ce node porte les règles, ou null si ce n'en
 * est pas un conteneur.
 *
 * Unique définition de « ce node porte les règles de X ». `extractRules`
 * l'utilise pour enrichir le contrat et `composedComponents` pour reconnaître
 * une dépendance unifiée. L'absence de règles n'empêche pas de capturer le
 * composant sélectionné, mais elle empêche ses parents de supposer qu'un
 * contrat autonome existe déjà pour lui.
 *
 * Le critère est le calque, jamais le composant maître : une instance de
 * `.componentRules` que le designer renomme reste un conteneur, et résoudre son
 * maître demanderait un aller-retour asynchrone sur chaque instance de chaque
 * page, sur le chemin que le designer sent passer à chaque sélection.
 *
 * La comparaison ignore la casse et les espaces : dans un nom écrit à la main,
 * ils ne portent aucune intention de design et ne doivent bloquer aucun export.
 */
export function rulesContainerOwner(node: NodeFouillable): string | null {
  const nom = nomDeComposantEcrit(node);
  return nom === null ? null : compactName(nom) || null;
}

/** Vrai d'un conteneur dont le calque de nom existe mais ne nomme personne. */
function estUnConteneurSansNom(node: NodeFouillable): boolean {
  const nom = nomDeComposantEcrit(node);
  return nom !== null && compactName(nom) === '';
}

/**
 * Lit la visibilité d'un calque de règle. `null` signifie que le calque est
 * absent : on le distingue d'un calque présent mais masqué pour diagnostiquer
 * correctement une configuration Figma incomplète.
 */
function visibilityOfLayer(instance: InstanceNode, layerName: string): boolean | null {
  const target = layerName.trim().toLowerCase();
  const node = instance.findOne((child) => child.name.trim().toLowerCase() === target) as
    | (SceneNode & { visible?: boolean })
    | null;
  return node ? node.visible !== false : null;
}

/** Construit l'entrée `@icons` à partir de ses trois calques dédiés. */
function iconRuleEntry(instance: InstanceNode): RuleEntry {
  const modifiable = visibilityOfLayer(instance, 'modifiable');
  const strict = visibilityOfLayer(instance, 'strict');

  return {
    tag: 'icons',
    content: '',
    iconName: textOfLayer(instance, 'icon'),
    iconPolicy: iconPolicyFromVisibility(modifiable, strict),
  };
}

/**
 * Vrai si une instance est bien un `.rulesItems` : on remonte à son composant
 * maître, puis à son component set, qui porte le nom du composant de règle.
 *
 * Le coût asynchrone est borné au sous-arbre du conteneur déjà trouvé, et non
 * à la page : c'est ce qui permet à `rulesContainerOwner` de rester synchrone.
 */
async function isRuleInstance(instance: InstanceNode): Promise<boolean> {
  const main = await instance.getMainComponentAsync().catch(() => null);
  const owner = main?.parent?.type === 'COMPONENT_SET' ? main.parent.name : main?.name ?? '';
  return compactName(owner) === RULES_COMPONENT_NAME;
}

/** Les calques par lesquels une règle écrit quelque chose : son texte ou sa cible. */
const RULE_CONTENT_LAYERS: readonly string[] = ['content', 'prop', 'icon'];

/**
 * Vrai d'une instance de règle qui n'écrit ni texte ni cible.
 *
 * Le catalogue `.rulesItems` porte des variants de mise en page, `divider` par
 * exemple, qui ne documentent aucune règle. Les écarter sans un mot est ce que
 * la borne du dépôt demande : rien n'est perdu, donc rien ne se dit, et un
 * message qui réclame un geste déjà fait apprend au designer à survoler.
 *
 * Le critère est ce que l'instance écrit, jamais le nom d'un variant : un
 * séparateur ajouté plus tard ne demandera aucune mise à jour du moteur.
 */
function nEcritRien(instance: InstanceNode): boolean {
  return RULE_CONTENT_LAYERS.every((calque) => textOfLayer(instance, calque).trim() === '');
}

/**
 * Le tag d'une règle, lu sur deux témoins : le calque `@…` que le designer voit
 * et la valeur de variante que Figma range.
 *
 * Le calque tranche, parce qu'il est le seul des deux à s'afficher, et parce
 * que Figma auto-nomme un variant ajouté « TypeN » sans toucher à ce qu'il
 * montre. Une valeur de variante qui ne nomme aucun tag n'est donc pas une
 * contradiction mais un témoin muet, et rien ne se dit puisque rien n'est
 * perdu. Deux témoins qui nomment chacun un tag différent se contredisent, et
 * c'est au designer de trancher.
 */
function ruleTagOf(instance: InstanceNode, warnings: string[]): RuleTag | null {
  const calque = instance.findOne(
    (child) => child.type === 'TEXT' && ruleTagFromLayerName(child.name) !== null,
  );
  const affiche = calque ? ruleTagFromLayerName(calque.name) : null;
  const range = Object.values(instance.variantProperties ?? {})
    .map(ruleTagFromValue)
    .find((value): value is RuleTag => value !== null) ?? null;

  if (affiche !== null && range !== null && affiche !== range) {
    pousserLocalise(warnings, 'Layer', instance, {
      manque: `il affiche le tag « @${affiche} », mais son variant est « @${range} ».`,
      impact: `Le contrat range cette règle en « @${affiche} », pas en « @${range} ».`,
      action: 'Choisissez le variant qui correspond au tag voulu, puis réexportez.',
    });
  }
  return affiche ?? range;
}

/**
 * Point d'entrée : lit le `.componentRules` du composant sélectionné et en tire
 * l'intention + la doc par valeur. `sectionFound` distingue « pas de conteneur »
 * (composant sans règles) de « conteneur présent mais vide », pour un warning
 * précis.
 *
 * La lecture porte sur la page courante, alors que l'index des dépendances
 * couvre tout le document. Le conteneur étant désormais une instance d'un même
 * maître, rien n'empêche plus de regrouper les règles sur une page de
 * documentation ; l'étendre ici demanderait un `loadAllPagesAsync` à chaque
 * changement de sélection, et le premier constat dit donc « de cette page ».
 */
export async function extractRules(
  componentSet: ComponentNode | ComponentSetNode,
): Promise<ExtractedRules> {
  const owner = compactName(componentSet.name);
  // On les cherche tous : n'en lire qu'un alors que la page en porte plusieurs
  // ferait disparaître des règles sans que rien ne le dise.
  const containers = figma.currentPage.findAll(
    (node) => rulesContainerOwner(node) === owner,
  ) as (SceneNode & ChildrenMixin)[];

  const container = containers[0];
  if (!container) {
    const absent: string[] = [];
    // Un conteneur au calque vide ne documente personne, et son travail est
    // perdu en silence. Il ne mérite pas son propre message, qui partirait dans
    // l'export de composants qui n'y sont pour rien : il devient l'action de
    // celui-ci, seul message que son absence de règles concerne vraiment.
    const orphelin = figma.currentPage.findOne(estUnConteneurSansNom);
    if (orphelin) {
      pousserLocalise(absent, 'Layer', orphelin, {
        manque: `son layer « ${COMPONENT_NAME_LAYER} » est vide, donc il ne documente `
          + 'aucun composant.',
        impact: 'Le contrat dira comment utiliser le composant, mais pas quand : ni intention, '
          + 'ni documentation de component properties, ni règle d’icône.',
        action: `Écrivez « ${componentSet.name} » dans ce layer, puis réexportez.`,
      });
    } else {
      // La cible n'existe pas : son absence est déclarée, pas subie. Le message
      // nomme aussi le composant, qui est un calque : sans cette déclaration, la
      // loi de localisation le lirait comme un site qu'on a oublié de convertir.
      const message = pousserSansNode(
        absent,
        sujetSansNode('Layer', RULES_CONTAINER_NAME, 'inexistant'),
        {
          manque: `aucune instance de cette page n’écrit « ${componentSet.name} » dans son `
            + `layer « ${COMPONENT_NAME_LAYER} ».`,
          impact: 'Le contrat dira comment utiliser le composant, mais pas quand : ni intention, '
            + 'ni documentation de component properties, ni règle d’icône.',
          action: `Posez une instance de « ${RULES_CONTAINER_NAME} » à côté du composant, `
            + `écrivez « ${componentSet.name} » dans son layer « ${COMPONENT_NAME_LAYER} », `
            + 'puis réexportez.',
        },
      );
      noterSansNode(absent, message, 'inexistant');
    }
    return {
      intent: null,
      propDescriptions: {},
      booleanDescriptions: {},
      enumDefaults: {},
      iconRules: [],
      warnings: absent,
      sectionFound: false,
    };
  }

  const instances = container
    .findAll((node) => node.type === 'INSTANCE')
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');

  const entries: RuleEntry[] = [];
  const warnings: string[] = [];
  if (containers.length > 1) {
    // La cause n'est pas un rangement à refaire : le maître `.componentRules`
    // est livré avec un `component-name` pré-rempli, et toute instance fraîche
    // revendique donc ce nom-là jusqu'à sa première édition.
    const sujetDuDoublon = sujetNomme('Layer', RULES_CONTAINER_NAME, container);
    const ignorees = containers.length - 1;
    pousserNote(
      warnings,
      pointDe(sujetDuDoublon.texte, {
        manque: `${containers.length} instances écrivent « ${componentSet.name} » dans leur `
          + `layer « ${COMPONENT_NAME_LAYER} », et l’export n’en lit qu’une.`,
        impact: ignorees === 1
          ? 'Les règles de l’autre instance manqueront au développeur.'
          : `Les règles des ${ignorees} autres instances manqueront au développeur.`,
        action: `Ne laissez « ${componentSet.name} » que dans une instance : écrivez dans `
          + 'les autres le nom du composant qu’elles documentent, puis réexportez.',
      }),
      sujetDuDoublon,
    );
  }

  for (const instance of instances) {
    if (!(await isRuleInstance(instance))) continue;

    const tag = ruleTagOf(instance, warnings);
    if (!tag) {
      if (nEcritRien(instance)) continue;
      pousserSansNode(warnings, `Une règle de « ${RULES_CONTAINER_NAME} »`, {
        manque: 'aucun de ses layers ne porte de tag (@usage, @do, @dont, @pairs, @prop, '
          + '@boolean, @icons, @default).',
        impact: 'Sa documentation manquera au développeur.',
        action: 'Choisissez son variant dans Figma, puis réexportez.',
      });
      continue;
    }

    entries.push(
      tag === 'icons'
        ? iconRuleEntry(instance)
        : {
            tag,
            content: textOfLayer(instance, 'content'),
            prop: tag === 'prop' || tag === 'boolean' || tag === 'default'
              ? textOfLayer(instance, 'prop')
              : undefined,
          },
    );
  }

  if (entries.length === 0) {
    const sujetDuConteneur = sujetNomme('Layer', RULES_CONTAINER_NAME, container);
    pousserNote(
      warnings,
      pointDe(sujetDuConteneur.texte, {
        manque: 'il ne contient aucune instance de « .rulesItems » qui porte un tag.',
        impact: 'Le développeur ne recevra aucune règle d’usage pour ce composant.',
        action: 'Ajoutez-y au moins une règle, puis réexportez.',
      }),
      sujetDuConteneur,
    );
  }

  const built = buildRules(entries);
  // Deux canaux fusionnés, donc deux registres à reporter : sans cela le
  // message arrive et ses parties restent derrière.
  const tous = [...warnings, ...built.warnings];
  reporterLocalisations(warnings, tous);
  reporterLocalisations(built.warnings, tous);
  return {
    intent: built.intent,
    propDescriptions: built.propDescriptions,
    booleanDescriptions: built.booleanDescriptions,
    enumDefaults: built.enumDefaults,
    iconRules: built.iconRules,
    warnings: tous,
    sectionFound: true,
  };
}
