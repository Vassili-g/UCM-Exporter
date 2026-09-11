/**
 * Non-régression des propriétés Figma que le schéma ne sait pas écrire.
 *
 * Deux invariants s'y jouent, et le second est le plus fragile :
 *
 * 1. une propriété à effet visuel que le contrat ne porte pas est dite ;
 * 2. une propriété au défaut de Figma ne dit rien. Le corps de la pull request
 *    est la seule page que le designer lit ; un rapport qui crie sur chaque
 *    frame correcte cesse d'être lu, et ne protège alors plus rien.
 *
 * Les tests « ne dit rien » ci-dessous valent donc autant que les autres :
 * chacun fige un faux positif qui aurait rendu le rapport illisible.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { rotationDegrees } from '../src/contract/flexLayout';
import { unsupportedPropertyWarnings } from '../src/contract/unsupportedProperties';
import { phraseDe } from '../src/contract/localisation';

/**
 * La phrase compacte de chaque point, dérivée de ses trois parties.
 *
 * Ces tests portent sur ce qui est dit au designer, pas sur la mise en page de
 * la carte : ils lisent donc la phrase, seule forme dont la composition soit
 * garantie par `phraseDe`.
 */
const avertissementsDe = (node: SceneNode): string[] =>
  unsupportedPropertyWarnings(node).map(phraseDe);

/** Une frame aux valeurs par défaut de Figma, telle qu'un designer la crée. */
const frameParDefaut = (extra: Record<string, unknown> = {}) => ({
  type: 'FRAME',
  name: 'Container',
  // `clipsContent` est activé par défaut sur toute frame Figma, `isMask` et
  // `rotation` sont les valeurs neutres d'un calque ordinaire : aucun des trois
  // ne doit produire le moindre message.
  clipsContent: true,
  isMask: false,
  rotation: 0,
  opacity: 1,
  blendMode: 'PASS_THROUGH',
  fills: [{ type: 'SOLID', visible: true }],
  strokes: [],
  effects: [],
  dashPattern: [],
  ...extra,
}) as unknown as SceneNode;

/** Un calque texte aux valeurs par défaut, dimensionné en Hug sur les deux axes. */
const texteParDefaut = (extra: Record<string, unknown> = {}) => ({
  type: 'TEXT',
  name: 'Suivant',
  opacity: 1,
  blendMode: 'PASS_THROUGH',
  fills: [{ type: 'SOLID', visible: true }],
  strokes: [],
  effects: [],
  dashPattern: [],
  layoutSizingHorizontal: 'HUG',
  layoutSizingVertical: 'HUG',
  textAlignHorizontal: 'LEFT',
  textAlignVertical: 'TOP',
  textCase: 'ORIGINAL',
  textDecoration: 'NONE',
  textTruncation: 'DISABLED',
  maxLines: null,
  listSpacing: 0,
  hangingList: false,
  hangingPunctuation: false,
  ...extra,
}) as unknown as SceneNode;

test('un layer aux valeurs par défaut de Figma ne produit aucun avertissement', () => {
  assert.deepEqual(avertissementsDe(frameParDefaut()), []);
  assert.deepEqual(avertissementsDe(texteParDefaut()), []);
});

test('« clip content » n’est pas une anomalie : c’est le défaut de Figma', () => {
  const suspect = frameParDefaut({ clipsContent: true });
  assert.deepEqual(avertissementsDe(suspect), []);
});

test('une rotation n’est plus une propriété manquante : le contrat l’écrit', () => {
  // Ce relevé dit ce que le schéma ne sait pas porter. La rotation en est
  // sortie le jour où `ChildStructure.rotation` l'a portée : la réclamer encore
  // enverrait le designer redresser un layer que le développeur rend incliné.
  assert.deepEqual(avertissementsDe(frameParDefaut({ rotation: -90 })), []);
  assert.deepEqual(avertissementsDe(frameParDefaut({ rotation: 3e-13 })), []);
});

test('rotationDegrees traduit dans la convention de CSS, et tait le bruit de Figma', () => {
  // Figma compte les degrés à l'envers de CSS : une valeur recopiée telle
  // quelle ferait tourner chaque layer dans le mauvais sens.
  assert.equal(rotationDegrees(frameParDefaut({ rotation: -90 })), '90deg');
  assert.equal(rotationDegrees(frameParDefaut({ rotation: 45 })), '-45deg');
  assert.equal(rotationDegrees(frameParDefaut({ rotation: 12.3456 })), '-12.35deg');

  // Une transformation successive laisse dans Figma un résidu que personne ne
  // voit et que personne ne peut remettre à zéro : le publier ferait bouger
  // l'artefact d'un export à l'autre sans qu'aucun design ait changé.
  assert.equal(rotationDegrees(frameParDefaut({ rotation: 3e-13 })), null);
  assert.equal(rotationDegrees(frameParDefaut({ rotation: -1e-9 })), null);
  assert.equal(rotationDegrees(frameParDefaut({})), null);
});

test('un mask est signalé : le contrat ne perd pas sa surface, il l’invente', () => {
  // Les autres propriétés de ce relevé manquent au rendu. Celle-ci fait pire :
  // la couleur du mask entre bien dans `variants[].tokens`, et le développeur la
  // peindrait par-dessus le contenu qu'elle était censée découper.
  const masque = frameParDefaut({ isMask: true });
  const avertissements = avertissementsDe(masque);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('Layer « Container », mask'));
  assert.ok(avertissements[0].includes('par-dessus les layers qu’il masque'));
});

test('une ombre visible est signalée, une ombre masquée ne l’est pas', () => {
  const avecOmbre = frameParDefaut({
    effects: [{ type: 'DROP_SHADOW', visible: true }],
  });
  const avertissements = avertissementsDe(avecOmbre);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('Layer « Container », effect'));
  assert.ok(avertissements[0].includes('l’ombre ou le flou'));
  assert.ok(avertissements[0].includes('réexportez'));

  const ombreMasquee = frameParDefaut({
    effects: [{ type: 'DROP_SHADOW', visible: false }],
  });
  assert.deepEqual(avertissementsDe(ombreMasquee), []);
});

test('une opacité partielle est signalée — c’est le réglage courant d’un état disabled', () => {
  const avertissements = avertissementsDe(frameParDefaut({ opacity: 0.4 }));
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('opacity'));
  assert.ok(avertissements[0].includes('rendu opaque'));
});

test('un dégradé est signalé : le relevé des couleurs ne le voit pas', () => {
  // `boundVariables.fills` ne porte rien pour une peinture non unie : la
  // surface disparaîtrait du contrat sans que le relevé s'en aperçoive.
  const degrade = frameParDefaut({
    fills: [{ type: 'GRADIENT_LINEAR', visible: true }],
  });
  const avertissements = avertissementsDe(degrade);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes(', fill'));
  assert.ok(avertissements[0].includes('dégradé'));

  // Un stroke non uni suit exactement la même règle, sur son propre champ.
  const strokeImage = frameParDefaut({ strokes: [{ type: 'IMAGE', visible: true }] });
  assert.ok(avertissementsDe(strokeImage)[0].includes(', stroke'));
});

test('des fills « mixed » sont signalés : le contrat n’en décrit qu’un jeu par layer', () => {
  const melange = frameParDefaut({ fills: Symbol('figma.mixed') });
  const avertissements = avertissementsDe(melange);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes(', fill'));
});

test('un blend mode et un pointillé sont signalés, leurs valeurs neutres non', () => {
  assert.equal(avertissementsDe(frameParDefaut({ blendMode: 'MULTIPLY' })).length, 1);
  assert.deepEqual(avertissementsDe(frameParDefaut({ blendMode: 'NORMAL' })), []);
  assert.equal(avertissementsDe(frameParDefaut({ dashPattern: [4, 4] })).length, 1);
});

test('textAlignHorizontal, textAlignVertical, textCase, textDecoration et textTruncation n’avertissent pas : le contrat les écrit', () => {
  // `textStyles.*.literals` et l'usage du style les publient. Un avertissement
  // demanderait au designer de retirer un réglage que le développeur reçoit.
  for (const reglage of [
    { textAlignHorizontal: 'CENTER', layoutSizingHorizontal: 'FILL' },
    { textAlignVertical: 'BOTTOM', layoutSizingVertical: 'FILL' },
    { textCase: 'UPPER' },
    { textDecoration: 'UNDERLINE' },
    { textTruncation: 'ENDING', maxLines: 2 },
  ]) {
    assert.deepEqual(avertissementsDe(texteParDefaut(reglage)), [], JSON.stringify(reglage));
  }
});

test('listSpacing, hangingList et hangingPunctuation avertissent hors de leur valeur par défaut', () => {
  const espacement = avertissementsDe(texteParDefaut({ listSpacing: 8 }));
  assert.equal(espacement.length, 1);
  assert.ok(espacement[0].includes('list spacing'));
  // « mixed » avertit comme une valeur non nulle.
  assert.equal(
    avertissementsDe(texteParDefaut({ listSpacing: Symbol('figma.mixed') })).length,
    1,
  );

  const puces = avertissementsDe(texteParDefaut({ hangingList: true }));
  assert.equal(puces.length, 1);
  assert.ok(puces[0].includes('hanging lists'));

  const ponctuation = avertissementsDe(texteParDefaut({ hangingPunctuation: true }));
  assert.equal(ponctuation.length, 1);
  assert.ok(ponctuation[0].includes('hanging punctuation'));
});

test('une liste à puces ou numérotée avertit, lue plage par plage', () => {
  const avecListes = (...types: string[]) => texteParDefaut({
    getStyledTextSegments: () => types.map((type) => ({ listOptions: { type } })),
  });
  assert.deepEqual(avertissementsDe(avecListes('NONE')), []);

  const puces = avertissementsDe(avecListes('NONE', 'UNORDERED'));
  assert.equal(puces.length, 1);
  assert.ok(puces[0].includes('bulleted list'));
  assert.equal(avertissementsDe(avecListes('ORDERED', 'UNORDERED')).length, 2);

  // Une lecture des plages qui lève ne fait pas échouer le relevé.
  const illisible = texteParDefaut({
    getStyledTextSegments: () => {
      throw new Error('police non chargée');
    },
  });
  assert.deepEqual(avertissementsDe(illisible), []);
});

test('un soulignement que CSS rend à l’identique n’avertit pas, un réglage différent avertit une fois', () => {
  const souligne = (extra: Record<string, unknown> = {}) => texteParDefaut({
    textDecoration: 'UNDERLINE',
    textDecorationStyle: 'SOLID',
    textDecorationOffset: { unit: 'AUTO' },
    textDecorationThickness: { unit: 'AUTO' },
    textDecorationColor: { value: 'AUTO' },
    textDecorationSkipInk: true,
    ...extra,
  });
  assert.deepEqual(avertissementsDe(souligne()), []);

  const reglages: Record<string, unknown>[] = [
    { textDecorationStyle: 'WAVY' },
    { textDecorationOffset: { unit: 'PIXELS', value: 2 } },
    { textDecorationThickness: { unit: 'PERCENT', value: 10 } },
    { textDecorationColor: { value: { type: 'SOLID', color: { r: 1, g: 0, b: 0 } } } },
    { textDecorationSkipInk: false },
    { textDecorationStyle: Symbol('figma.mixed') },
  ];
  reglages.forEach((reglage, rang) => {
    const avertissements = avertissementsDe(souligne(reglage));
    assert.equal(avertissements.length, 1, `réglage ${rang}`);
    assert.ok(avertissements[0].includes(', decoration'), `réglage ${rang}`);
  });

  // Plusieurs réglages différents donnent un seul message, le geste étant le même.
  assert.equal(
    avertissementsDe(souligne({ textDecorationStyle: 'DOTTED', textDecorationSkipInk: false })).length,
    1,
  );
});

test('openTypeFeatures avertit dès qu’un réglage diffère de ce que le navigateur applique seul', () => {
  assert.deepEqual(avertissementsDe(texteParDefaut({ openTypeFeatures: {} })), []);
  // Le crénage et les ligatures courantes sont actifs sans déclaration CSS.
  assert.deepEqual(
    avertissementsDe(texteParDefaut({ openTypeFeatures: { KERN: true, LIGA: true } })),
    [],
  );
  const reglages: unknown[] = [{ SS01: true }, { LIGA: false }, Symbol('figma.mixed')];
  reglages.forEach((openTypeFeatures, rang) => {
    const avertissements = avertissementsDe(texteParDefaut({ openTypeFeatures }));
    assert.equal(avertissements.length, 1, `réglage ${rang}`);
    assert.ok(avertissements[0].includes('OpenType features'), `réglage ${rang}`);
  });
});

test('deux propriétés du même layer donnent deux messages : deux gestes différents', () => {
  const cumul = frameParDefaut({
    opacity: 0.5,
    effects: [{ type: 'LAYER_BLUR', visible: true }],
  });
  const avertissements = avertissementsDe(cumul);
  assert.equal(avertissements.length, 2);
  assert.ok(avertissements.every((message) => message.startsWith('Layer « Container », ')));
});

test('un node qui n’expose aucune de ces propriétés ne fait pas échouer le relevé', () => {
  // Les nodes Figma n'ont pas tous les mêmes champs : un relevé qui les
  // supposerait présents ferait tomber l'export entier sur un calque exotique.
  assert.deepEqual(
    avertissementsDe({ type: 'SLICE', name: 'Repère' } as unknown as SceneNode),
    [],
  );
});
