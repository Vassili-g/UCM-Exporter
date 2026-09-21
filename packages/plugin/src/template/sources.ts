/**
 * Ce que la page active offre pour créer les règles d'un composant.
 *
 * Le module lit, et rien d'autre : il dit quel bouton l'interface montre, et
 * il trouve les maîtres que l'écriture emploiera. La recherche ne quitte
 * jamais la page active, sans `loadAllPagesAsync` ni `importComponentByKeyAsync` :
 * un conteneur rangé sur une autre page n'est pas cherché, et le bouton en
 * crée un ici.
 */
import {
  MARQUEUR_A_COMPLETER,
  RULES_COMPONENT_NAME,
  RULES_CONTAINER_NAME,
  RULE_ITEM_NAME,
  nomDuCatalogue,
  porteLeMarqueur,
  ruleTagFromLayerName,
  textOfLayer,
} from '../contract/extractRules';
import type { ReleveDeSource, RuleTag } from '../contract/extractRules';

/**
 * Ce que le bouton de création propose.
 *
 * `remplir` vise une instance collée et jamais remplie, que le designer a
 * posée où il la voulait ; `creer` en pose une neuve à côté du composant ;
 * `sans-source` dit que la page ne porte aucun modèle à copier, et le bouton
 * reste inactif sous la note qui mène au kit.
 */
export type Offre = 'creer' | 'remplir' | 'sans-source';

/**
 * L'offre que le relevé de la page justifie, ou `null` quand il n'y a rien à
 * proposer.
 *
 * Un composant qui a déjà son conteneur n'en reçoit aucune : le créer une
 * seconde fois ferait deux instances revendiquant le même nom, ce que
 * l'analyse signale ensuite comme un doublon.
 */
export function offreDeCreation(releve: ReleveDeSource): Offre | null {
  if (releve.conteneurDuComposant) return null;
  if (releve.conteneurVierge) return 'remplir';
  if (releve.maitreLocal || releve.instanceSource) return 'creer';
  return 'sans-source';
}

/**
 * Nom (compacté) du component set des sections.
 *
 * Il ne vit pas avec les noms que le moteur lit : le moteur ignore les
 * sections (FORMAT.md, section 7), et seul le template a besoin de les
 * reconnaître pour ranger chaque règle dans la sienne.
 */
const SECTION_COMPACTEE = '.rulessection';

/**
 * Les maîtres que l'écriture emploiera, résolus une fois au clic.
 *
 * Les tables sont indexées par tag : une section se désigne par le tag de son
 * exemple, jamais par son nom, et le maître range déjà un exemple de chaque tag
 * dans la sienne.
 */
export type SourcesDeCreation = {
  /** Le maître « .componentRules », dont une instance neuve naîtra. */
  maitre: ComponentNode;
  /** L'instance vierge à remplir, quand la page en porte une. */
  aRemplir: InstanceNode | null;
  /** Le maître de la section qui porte l'exemple de chaque tag. */
  sections: Map<RuleTag, ComponentNode>;
  /** La variante de « .ruleItem » qui porte l'exemple de chaque tag. */
  regles: Map<RuleTag, ComponentNode>;
  /** La variante muette du catalogue de règles, ou `null` s'il n'en porte pas. */
  separateur: ComponentNode | null;
};

/** Les maîtres résolus, ou le refus qui dit au designer quoi corriger. */
export type ResolutionDeSources = {
  sources: SourcesDeCreation | null;
  refus: string | null;
};

/** Un refus, sans aucune source à rendre. */
function refuser(refus: string): ResolutionDeSources {
  return { sources: null, refus };
}

/**
 * Le maître de la page, dans l'ordre de la section 5.2 : le composant local
 * d'abord, puis le maître de la première instance qui porte « component-name ».
 *
 * Cette instance n'est ni lue ni modifiée : la page d'un composant porte des
 * instances, la page des règles porte le maître, et remonter à lui est ce qui
 * évite de chercher hors de la page active.
 */
async function maitreDeLaPage(releve: ReleveDeSource): Promise<ComponentNode | null> {
  if (releve.maitreLocal) return releve.maitreLocal;
  if (!releve.instanceSource) return null;
  return await releve.instanceSource.getMainComponentAsync().catch(() => null);
}

/** Les instances de la descendance d'un node, dans l'ordre du document. */
function instancesDe(node: ComponentNode | InstanceNode): InstanceNode[] {
  return node.findAll((enfant) => enfant.type === 'INSTANCE') as InstanceNode[];
}

/** Le maître d'une instance, quand il vient du catalogue nommé. */
async function maitreDuCatalogue(
  instance: InstanceNode,
  catalogue: string,
): Promise<ComponentNode | null> {
  const main = await instance.getMainComponentAsync().catch(() => null);
  return main && nomDuCatalogue(main) === catalogue ? main : null;
}

/**
 * Le tag qu'un exemple affiche.
 *
 * Le calque tranche seul, sans le second témoin que la lecture des règles
 * consulte : ici le tag ne juge personne, il choisit la variante à copier, et
 * une valeur de variante auto-nommée par Figma n'a rien à dire sur ce choix.
 */
function tagAffiche(exemple: InstanceNode): RuleTag | null {
  const calque = exemple.findOne(
    (enfant) => enfant.type === 'TEXT' && ruleTagFromLayerName(enfant.name) !== null,
  );
  return calque ? ruleTagFromLayerName(calque.name) : null;
}

/**
 * Les maîtres lus sur les exemples du maître, section par section.
 *
 * Le parcours descend par les sections : un exemple rangé ailleurs n'aurait
 * aucune section à copier, et le template ne saurait pas où le poser. Le
 * premier exemple d'un tag gagne, comme la lecture des règles garde la première
 * règle d'une cible.
 */
async function exemplesDuMaitre(maitre: ComponentNode): Promise<{
  sections: Map<RuleTag, ComponentNode>;
  regles: Map<RuleTag, ComponentNode>;
}> {
  const sections = new Map<RuleTag, ComponentNode>();
  const regles = new Map<RuleTag, ComponentNode>();
  for (const candidate of instancesDe(maitre)) {
    const maitreDeSection = await maitreDuCatalogue(candidate, SECTION_COMPACTEE);
    if (!maitreDeSection) continue;
    for (const exemple of instancesDe(candidate)) {
      const variante = await maitreDuCatalogue(exemple, RULES_COMPONENT_NAME);
      const tag = variante ? tagAffiche(exemple) : null;
      if (!variante || tag === null || regles.has(tag)) continue;
      regles.set(tag, variante);
      sections.set(tag, maitreDeSection);
    }
  }
  return { sections, regles };
}

/**
 * La variante muette du catalogue dont vient une règle : celle qui ne porte
 * aucun calque texte.
 *
 * Le critère est ce que la variante montre, jamais son nom : un séparateur
 * renommé reste un séparateur, et un `Type=divider` qui se mettrait à écrire
 * n'en serait plus un. Sans catalogue lisible, le template ne pose aucun
 * séparateur et range ses règles à la suite.
 */
function separateurDuCatalogue(regles: Map<RuleTag, ComponentNode>): ComponentNode | null {
  for (const variante of regles.values()) {
    const catalogue = variante.parent;
    if (catalogue?.type !== 'COMPONENT_SET') continue;
    const muette = catalogue.children.find(
      (enfant) => enfant.type === 'COMPONENT'
        && enfant.findOne((calque) => calque.type === 'TEXT') === null,
    );
    if (muette) return muette as ComponentNode;
  }
  return null;
}

/**
 * Les calques d'aide que l'écriture ne remplit pas, et qui doivent donc porter
 * le marqueur : le texte d'une règle que le template pose sans le rédiger.
 *
 * `@default` n'y est pas, le template ne posant aucune règle de ce tag.
 * `@icons` non plus, et pour une raison de forme : sa cible n'est pas une
 * phrase mais un nom de calque, et sa politique se choisit en masquant l'un de
 * ses deux mots. Tant que le designer ne l'a pas fait, la règle ne publie rien,
 * et le moteur le lui dit. Exiger le marqueur en plus refuserait la création
 * sur un maître correct.
 */
const AIDES_LUES: Partial<Record<RuleTag, string>> = {
  usage: 'content',
  prop: 'content',
  boolean: 'content',
};

/** Vrai dès qu'un texte d'aide du maître passerait pour une documentation. */
function aideSansMarqueur(regles: Map<RuleTag, ComponentNode>): boolean {
  return Object.entries(AIDES_LUES).some(([tag, calque]) => {
    const variante = regles.get(tag as RuleTag);
    return variante !== undefined && !porteLeMarqueur(textOfLayer(variante, calque));
  });
}

/**
 * Les maîtres que l'écriture emploiera, ou le refus qui l'arrête avant toute
 * création.
 *
 * Tout se résout ici, au clic : le changement de sélection n'a relevé que ce
 * qu'un parcours synchrone pouvait dire, et remonter à un maître demande un
 * aller-retour par instance. La recherche ne quitte jamais la page active.
 */
export async function resoudreLesSources(releve: ReleveDeSource): Promise<ResolutionDeSources> {
  const maitre = await maitreDeLaPage(releve);
  if (!maitre) {
    return refuser(
      `Le maître de « ${RULES_CONTAINER_NAME} » est introuvable depuis cette page. `
        + 'Collez-y une instance de vos règles, puis recommencez.',
    );
  }

  const { sections, regles } = await exemplesDuMaitre(maitre);
  if (regles.size === 0) {
    return refuser(
      `« ${RULES_CONTAINER_NAME} » ne porte aucun exemple de règle. Ajoutez-y un exemple `
        + `de chaque règle, dans sa section, puis recommencez.`,
    );
  }
  // Avant toute écriture : un maître encore à l'ancienne ferait publier ses
  // textes d'aide comme la documentation du composant.
  if (aideSansMarqueur(regles)) {
    return refuser(
      `Les textes d’aide de « ${RULE_ITEM_NAME} » ne commencent pas par `
        + `« ${MARQUEUR_A_COMPLETER} ». Ajoutez-le dans le composant « ${RULE_ITEM_NAME} », `
        + 'puis recommencez.',
    );
  }

  return {
    sources: {
      maitre,
      aRemplir: releve.conteneurVierge,
      sections,
      regles,
      separateur: separateurDuCatalogue(regles),
    },
    refus: null,
  };
}
