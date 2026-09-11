/**
 * Ce qu'un calque publié porte dans Figma et que le schéma ne sait pas écrire.
 *
 * Le contrat ne prétend pas décrire tout Figma, mais une propriété qui change
 * le rendu et qu'aucun champ ne porte doit être dite : une ombre absente du
 * contrat est une ombre absente de l'écran.
 *
 * Deux garde-fous encadrent ce module, et ils comptent autant que la liste
 * elle-même :
 *
 * - **On n'avertit que sur ce qu'on publie.** Les appels vivent dans
 *   l'extraction, sur les calques qui reçoivent réellement un slot. Balayer
 *   tout le sous-arbre ferait crier sur les entrailles de chaque icône, que le
 *   contrat n'a jamais prétendu décrire.
 * - **Aucune valeur neutre n'avertit.** Une propriété au défaut de Figma ne
 *   manque à personne. Un `clipsContent`, activé par défaut sur toute frame,
 *   n'est donc pas relevé : un rapport que le designer cesse de lire ne protège
 *   plus rien.
 *
 * Ces deux garde-fous se répondent, et c'est ce qui a longtemps laissé passer
 * `isMask`. Le silence lui avait été accordé au nom du second (le masque
 * interne d'une icône) mais ces calques-là relèvent du premier : ils ne sont
 * jamais publiés, donc jamais soumis à ce relevé. Le silence ne protégeait aucun
 * design correct, et coûtait un découpage à chaque design qui l'employait pour
 * de bon.
 *
 * Une propriété que le contrat écrit n'entre pas dans ce relevé, `rotation`
 * comprise : `flexLayout.rotationDegrees` en est l'autorité, seuil compris.
 */
import { pointDe, sujet } from './localisation';
import type { PointACorriger } from './localisation';

/** `boundVariables` et les propriétés visuelles ne sont pas typées champ par champ. */
type FigmaPropertyBag = Record<string, unknown>;

function asPropertyBag(node: SceneNode): FigmaPropertyBag {
  return node as unknown as FigmaPropertyBag;
}

/**
 * Vrai si Figma rend cette valeur « mixed » : plusieurs valeurs dans un même
 * calque. Le symbole n'est pas exposé hors du runtime du plugin : on le
 * reconnaît à ce qu'il n'est ni un tableau, ni une valeur primitive attendue.
 */
export function estMixed(value: unknown): boolean {
  return typeof value === 'symbol'
    || (typeof value === 'object' && value !== null && !Array.isArray(value)
      && String(value) === 'Symbol(figma.mixed)');
}

/** Les peintures visibles d'un champ, ou `null` quand Figma les dit « mixed ». */
function peinturesVisibles(value: unknown): Paint[] | null {
  if (estMixed(value)) return null;
  if (!Array.isArray(value)) return [];
  return (value as Paint[]).filter((paint) => paint && paint.visible !== false);
}

/**
 * Une propriété relevée : le libellé du panneau Figma, et ce qui manquera.
 * Le message final est composé par `unsupportedPropertyWarnings`, pour que la
 * forme « où / quoi / comment » n'existe qu'à un seul endroit.
 */
type ProprieteNonPortee = {
  /** Intitulé tel que le panneau Figma l'affiche. */
  champ: string;
  /** Ce que le développeur n'aura pas, en une proposition. */
  manque: string;
  /** Le geste à faire dans Figma, sans le « puis réexportez » final. */
  geste: string;
};

/** Les modes de fusion que Figma considère comme neutres. */
const FUSIONS_NEUTRES: ReadonlySet<unknown> = new Set(['PASS_THROUGH', 'NORMAL']);

/**
 * Relève, sur un calque publié, ce que le schéma ne sait pas porter.
 *
 * Fonction pure : elle ne lit que le node et ne connaît ni la matrice, ni le
 * contrat en cours. C'est ce qui la rend vérifiable sans le runtime Figma.
 */
function proprietesNonPortees(node: SceneNode): ProprieteNonPortee[] {
  const values = asPropertyBag(node);
  const relevees: ProprieteNonPortee[] = [];

  // Un effet est une décision de design à part entière (une ombre porte la
  // hiérarchie d'une carte, un flou son arrière-plan) et aucun champ du
  // contrat ne la porte.
  const effets = Array.isArray(values.effects)
    ? (values.effects as Effect[]).filter((effet) => effet && effet.visible !== false)
    : [];
  if (effets.length > 0) {
    relevees.push({
      champ: 'effect',
      manque: 'l’ombre ou le flou de ce layer',
      geste: 'Retirez cet effect si le rendu peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  // L'opacité est le premier réglage d'un état « disabled » : sans elle, le
  // contrat décrit cet état comme identique à l'état par défaut.
  if (typeof values.opacity === 'number' && values.opacity < 1) {
    relevees.push({
      champ: 'opacity',
      manque: 'la transparence de ce layer, qui sera rendu opaque',
      geste: 'Exprimez cette transparence par une couleur reliée à une variable, ou signalez cette limite du schéma',
    });
  }

  // Le contrat ne cite que des tokens de couleur : seule une peinture SOLID
  // reliée à une variable y entre. Un dégradé ou une image disparaît donc sans
  // que le relevé des couleurs s'en aperçoive.
  for (const champ of ['fills', 'strokes'] as const) {
    const peintures = peinturesVisibles(values[champ]);
    const libelle = champ === 'fills' ? 'fill' : 'stroke';
    if (peintures === null) {
      relevees.push({
        champ: libelle,
        manque: `les différents ${libelle}s de ce layer, dont le contrat ne décrit qu’un jeu par layer`,
        geste: `N’appliquez qu’un seul jeu de ${libelle}s au layer entier`,
      });
      continue;
    }
    const nonSolides = peintures.filter((paint) => paint.type !== 'SOLID');
    if (nonSolides.length === 0) continue;
    relevees.push({
      champ: libelle,
      manque: `le ${libelle} de ce layer : le contrat ne sait citer qu’une couleur unie reliée à une variable, jamais un dégradé ni une image`,
      geste: `Remplacez ce ${libelle} par une couleur unie reliée à une variable si sa couleur doit être contractuelle, ou signalez cette limite du schéma`,
    });
  }

  if (!FUSIONS_NEUTRES.has(values.blendMode) && values.blendMode !== undefined) {
    relevees.push({
      champ: 'blend mode',
      manque: 'le mode de fusion de ce layer, qui sera rendu en normal',
      geste: 'Repassez ce layer en blend mode « Normal » si sa fusion n’est pas nécessaire, ou signalez cette limite du schéma',
    });
  }

  // Un mask ne peint pas : il découpe. Le contrat, lui, ne connaît que des
  // surfaces, et publie la sienne dans `variants[].tokens`. Sans ce message, le
  // développeur peindrait par-dessus le contenu la couleur qui était censée le
  // révéler : le seul cas où le contrat ne perd pas une propriété mais en
  // invente une.
  if (values.isMask === true) {
    relevees.push({
      champ: 'mask',
      manque: 'le découpage que ce layer applique : sa surface sera rendue par-dessus les layers qu’il masque',
      geste: 'Aplatissez ce mask dans le dessin qu’il découpe si le rendu peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  if (Array.isArray(values.dashPattern) && values.dashPattern.length > 0) {
    relevees.push({
      champ: 'dash',
      manque: 'le pointillé de son stroke, qui sera rendu en trait plein',
      geste: 'Repassez ce stroke en trait plein si le pointillé n’est pas nécessaire, ou signalez cette limite du schéma',
    });
  }

  relevees.push(...proprietesDeTexteNonPortees(node, values));
  return relevees;
}

/**
 * Les valeurs d'un champ sur chaque plage d'un calque texte.
 *
 * `getStyledTextSegments` manque sur un node qui n'est pas un texte, et peut
 * lever : la lecture rend alors une liste vide.
 */
export function valeursParPlage(
  node: SceneNode,
  champ: 'listOptions' | 'textStyleOverrides',
): unknown[] {
  const lire = (node as unknown as {
    getStyledTextSegments?: (champs: string[]) => Array<Record<string, unknown>>;
  }).getStyledTextSegments;
  if (typeof lire !== 'function') return [];
  try {
    return lire.call(node, [champ]).map((segment) => segment[champ]);
  } catch {
    return [];
  }
}

/**
 * Vrai si un réglage du soulignement s'écarte du rendu CSS sans déclaration.
 *
 * Figma ne documente pas les valeurs par défaut de ces cinq réglages, et les
 * rend à `null` sans soulignement. La valeur neutre est donc celle que CSS rend
 * seul : trait plein, épaisseur, décalage et couleur automatiques, jambages
 * évités.
 */
function soulignementRegle(values: FigmaPropertyBag): boolean {
  const neutre = (valeur: unknown, estNeutre: (valeurLue: Record<string, unknown>) => boolean) =>
    valeur === null || valeur === undefined
      || (!estMixed(valeur) && estNeutre(valeur as Record<string, unknown>));
  return !neutre(values.textDecorationStyle, (valeur) => (valeur as unknown) === 'SOLID')
    || !neutre(values.textDecorationOffset, (valeur) => valeur.unit === 'AUTO')
    || !neutre(values.textDecorationThickness, (valeur) => valeur.unit === 'AUTO')
    || !neutre(values.textDecorationColor, (valeur) => valeur.value === 'AUTO')
    || !neutre(values.textDecorationSkipInk, (valeur) => (valeur as unknown) === true);
}

/**
 * Les fonctionnalités OpenType qu'un navigateur applique sans déclaration :
 * ligatures et alternatives contextuelles courantes, crénage, et celles que
 * l'écriture exige (CSS Fonts, `font-feature-settings`).
 */
const OPENTYPE_ACTIVES_SANS_DECLARATION: ReadonlySet<string> = new Set([
  'LIGA', 'CLIG', 'CALT', 'KERN', 'RLIG', 'RCLT', 'RVRN', 'CCMP', 'LOCL', 'MARK', 'MKMK',
]);

/**
 * Vrai si un réglage OpenType du calque diffère de ce que le navigateur applique
 * seul. Figma ne rend que les fonctionnalités réglées explicitement.
 */
function openTypeRegle(valeur: unknown): boolean {
  if (estMixed(valeur)) return true;
  if (!valeur || typeof valeur !== 'object') return false;
  return Object.entries(valeur as Record<string, unknown>).some(
    ([fonctionnalite, active]) => active !== OPENTYPE_ACTIVES_SANS_DECLARATION.has(fonctionnalite),
  );
}

/**
 * Les réglages de texte que le contrat ne porte pas.
 *
 * `textStyles.*.literals` écrit `textCase`, `textDecoration`, l'italique,
 * `textWrapStyle` et `leadingTrim`. L'usage du style écrit l'alignement et la
 * troncature avec `maxLines` (`textRendering.ts`). Restent les listes, que le
 * contrat ne décrit pas, `hangingPunctuation`, les réglages du soulignement et
 * `openTypeFeatures`.
 */
function proprietesDeTexteNonPortees(
  node: SceneNode,
  values: FigmaPropertyBag,
): ProprieteNonPortee[] {
  if (node.type !== 'TEXT') return [];
  const relevees: ProprieteNonPortee[] = [];

  const typesDeListe = new Set(valeursParPlage(node, 'listOptions')
    .map((options) => (options as TextListOptions | undefined)?.type));
  if (typesDeListe.has('UNORDERED')) {
    relevees.push({
      champ: 'bulleted list',
      manque: 'les puces de ce texte',
      geste: 'Retirez la liste à puces si le texte peut s’en passer, ou signalez cette limite du schéma',
    });
  }
  if (typesDeListe.has('ORDERED')) {
    relevees.push({
      champ: 'numbered list',
      manque: 'la numérotation de ce texte',
      geste: 'Retirez la liste numérotée si le texte peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  // Les cinq réglages ont le même geste : un seul message les réunit.
  if (soulignementRegle(values)) {
    relevees.push({
      champ: 'decoration',
      manque: 'les réglages de ce soulignement, qui sera rendu en trait plein et dans la couleur du texte',
      geste: 'Remettez les réglages du soulignement à leur valeur par défaut si le rendu peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  if (openTypeRegle(values.openTypeFeatures)) {
    relevees.push({
      champ: 'OpenType features',
      manque: 'les fonctionnalités OpenType réglées sur ce texte',
      geste: 'Retirez ces réglages si le rendu peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  // « mixed » : l'espacement change d'une liste à l'autre dans le même calque.
  if (estMixed(values.listSpacing)
    || (typeof values.listSpacing === 'number' && values.listSpacing > 0)) {
    relevees.push({
      champ: 'list spacing',
      manque: 'l’espacement entre les éléments de liste de ce texte',
      geste: 'Retirez cet espacement si la liste peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  if (values.hangingList === true) {
    relevees.push({
      champ: 'hanging lists',
      manque: 'les puces et les numéros de liste placés hors de la boîte de ce texte',
      geste: 'Désactivez ce réglage si le rendu peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  if (values.hangingPunctuation === true) {
    relevees.push({
      champ: 'hanging punctuation',
      manque: 'la ponctuation placée hors de la boîte de ce texte',
      geste: 'Désactivez ce réglage si le rendu peut s’en passer, ou signalez cette limite du schéma',
    });
  }

  return relevees;
}

/**
 * Avertissements d'un calque publié, dans le vocabulaire du designer.
 *
 * Appelée par l'extraction sur chaque calque qui reçoit un slot, et sur lui
 * seul. Un message par calque et par propriété : deux propriétés du même calque
 * demandent deux gestes différents, et les fondre en une phrase priverait le
 * designer de l'un des deux.
 */
export function unsupportedPropertyWarnings(node: SceneNode): PointACorriger[] {
  return proprietesNonPortees(node).map(({ champ, manque, geste }) =>
    pointDe(sujet('Layer', node).texte, {
      champ,
      manque: 'le contrat ne sait pas écrire cette propriété.',
      impact: `Le développeur n’aura pas ${manque}.`,
      action: `${geste}, puis réexportez.`,
    }));
}
