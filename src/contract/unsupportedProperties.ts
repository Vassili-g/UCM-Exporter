/**
 * Ce qu'un calque publié porte dans Figma et que le schéma ne sait pas écrire.
 *
 * Le contrat ne prétend pas décrire tout Figma. Mais une propriété qui change
 * le rendu et qu'aucun champ ne porte doit être DITE, jamais oubliée : c'est la
 * règle du projet — une ombre absente du contrat est une ombre absente de
 * l'écran, et le développeur ne peut pas deviner ce qu'on ne lui dit pas.
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
 * `isMask`. Le silence lui avait été accordé au nom du second — le masque
 * interne d'une icône — mais ces calques-là relèvent du PREMIER : ils ne sont
 * jamais publiés, donc jamais soumis à ce relevé. Le silence ne protégeait aucun
 * design correct, et coûtait un découpage à chaque design qui l'employait pour
 * de bon.
 *
 * `rotation` a quitté cette liste : le contrat l'ÉCRIT maintenant, en
 * vocabulaire CSS (`ChildStructure.rotation`), et une propriété publiée n'a
 * rien à faire dans un relevé de ce qui manque. `flexLayout.rotationDegrees`
 * en est l'autorité, seuil compris.
 */

/** `boundVariables` et les propriétés visuelles ne sont pas typées champ par champ. */
type FigmaPropertyBag = Record<string, unknown>;

function asPropertyBag(node: SceneNode): FigmaPropertyBag {
  return node as unknown as FigmaPropertyBag;
}

/**
 * Vrai si Figma rend cette valeur « mixed » — plusieurs valeurs dans un même
 * calque. Le symbole n'est pas exposé hors du runtime du plugin : on le
 * reconnaît à ce qu'il n'est ni un tableau, ni une valeur primitive attendue.
 */
function estMixed(value: unknown): boolean {
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
 * Relève, sur UN calque publié, ce que le schéma ne sait pas porter.
 *
 * Fonction pure : elle ne lit que le node et ne connaît ni la matrice, ni le
 * contrat en cours. C'est ce qui la rend vérifiable sans le runtime Figma.
 */
function proprietesNonPortees(node: SceneNode): ProprieteNonPortee[] {
  const values = asPropertyBag(node);
  const relevees: ProprieteNonPortee[] = [];

  // Un effet est une décision de design à part entière — une ombre porte la
  // hiérarchie d'une carte, un flou son arrière-plan — et aucun champ du
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
  // révéler — le seul cas où le contrat ne perd pas une propriété mais en
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
 * Les réglages de texte que `textStyles` ne porte pas.
 *
 * Le catalogue des text styles décrit une police, une taille, une graisse, une
 * interligne et un interlettrage — rien de ce qui suit. Un alignement n'est en
 * revanche relevé que s'il a un EFFET : un texte en `Hug` a une boîte à sa
 * mesure, et le centrer n'y change rien. Sans cette réserve, tout label centré
 * d'un bouton produirait un avertissement sans geste possible.
 */
function proprietesDeTexteNonPortees(
  node: SceneNode,
  values: FigmaPropertyBag,
): ProprieteNonPortee[] {
  if (node.type !== 'TEXT') return [];
  const relevees: ProprieteNonPortee[] = [];

  if (values.layoutSizingHorizontal !== 'HUG'
    && values.textAlignHorizontal !== undefined
    && values.textAlignHorizontal !== 'LEFT') {
    relevees.push({
      champ: 'text align',
      manque: 'l’alignement horizontal de ce texte dans sa boîte, qui sera rendu à gauche',
      geste: 'Passez la largeur du layer en « Hug » si l’alignement n’a pas à être contractuel, ou signalez cette limite du schéma',
    });
  }

  if (values.layoutSizingVertical !== 'HUG'
    && values.textAlignVertical !== undefined
    && values.textAlignVertical !== 'TOP') {
    relevees.push({
      champ: 'text align',
      manque: 'l’alignement vertical de ce texte dans sa boîte, qui sera rendu en haut',
      geste: 'Passez la hauteur du layer en « Hug » si l’alignement n’a pas à être contractuel, ou signalez cette limite du schéma',
    });
  }

  // `textCase` et `textDecoration` peuvent être « mixed » : le calque porte
  // alors plusieurs réglages par plage, que le contrat ne sait pas davantage
  // écrire. Les deux cas produisent le même manque, donc le même message.
  if (values.textCase !== undefined
    && (estMixed(values.textCase) || values.textCase !== 'ORIGINAL')) {
    relevees.push({
      champ: 'letter case',
      manque: 'la casse appliquée à ce texte, qui sera rendu tel qu’il est écrit',
      geste: 'Écrivez le texte dans sa casse finale si elle n’a pas à être contractuelle, ou signalez cette limite du schéma',
    });
  }

  if (values.textDecoration !== undefined
    && (estMixed(values.textDecoration) || values.textDecoration !== 'NONE')) {
    relevees.push({
      champ: 'decoration',
      manque: 'le soulignement ou le barré de ce texte, qui sera rendu sans décoration',
      geste: 'Retirez cette decoration si elle n’a pas à être contractuelle, ou signalez cette limite du schéma',
    });
  }

  const tronque = values.textTruncation === 'ENDING'
    || (typeof values.maxLines === 'number' && values.maxLines > 0);
  if (tronque) {
    relevees.push({
      champ: 'truncate text',
      manque: 'la troncature de ce texte, qui sera rendu en entier',
      geste: 'Retirez cette troncature si elle n’a pas à être contractuelle, ou signalez cette limite du schéma',
    });
  }

  return relevees;
}

/**
 * Avertissements d'un calque publié, dans le vocabulaire du designer.
 *
 * Appelée par l'extraction sur chaque calque qui reçoit un slot — et sur lui
 * seul. Un message par calque et par propriété : deux propriétés du même calque
 * demandent deux gestes différents, et les fondre en une phrase priverait le
 * designer de l'un des deux.
 */
export function unsupportedPropertyWarnings(node: SceneNode): string[] {
  return proprietesNonPortees(node).map(({ champ, manque, geste }) =>
    `Layer « ${node.name} », ${champ} : le contrat ne sait pas écrire cette propriété. `
      + `Le développeur n’aura pas ${manque}. ${geste}, puis réexportez.`);
}
