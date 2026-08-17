/**
 * Non-régression des propriétés Figma que le schéma ne sait pas écrire.
 *
 * Deux invariants s'y jouent, et le second est le plus fragile :
 *
 * 1. une propriété à effet visuel que le contrat ne porte pas est DITE ;
 * 2. une propriété au défaut de Figma ne dit RIEN. Le corps de la pull request
 *    est la seule page que le designer lit ; un rapport qui crie sur chaque
 *    frame correcte cesse d'être lu, et ne protège alors plus rien.
 *
 * Les tests « ne dit rien » ci-dessous valent donc autant que les autres :
 * chacun fige un faux positif qui aurait rendu le rapport illisible.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { unsupportedPropertyWarnings } from '../src/contract/unsupportedProperties';

/** Une frame aux valeurs par défaut de Figma, telle qu'un designer la crée. */
const frameParDefaut = (extra: Record<string, unknown> = {}) => ({
  type: 'FRAME',
  name: 'Container',
  // `clipsContent` est ACTIVÉ par défaut sur toute frame Figma, `isMask` et
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
  ...extra,
}) as unknown as SceneNode;

test('un layer aux valeurs par défaut de Figma ne produit aucun avertissement', () => {
  assert.deepEqual(unsupportedPropertyWarnings(frameParDefaut()), []);
  assert.deepEqual(unsupportedPropertyWarnings(texteParDefaut()), []);
});

test('« clip content », un masque et une rotation ne sont pas des anomalies', () => {
  // `clipsContent` est le défaut de Figma ; `isMask` est le mécanisme normal de
  // dessin d'une icône importée, et une rotation résiduelle accompagne tout
  // tracé vectoriel importé. Les signaler crierait sur des designs corrects.
  const suspects = frameParDefaut({ clipsContent: true, isMask: true, rotation: 1.5 });
  assert.deepEqual(unsupportedPropertyWarnings(suspects), []);
});

test('une ombre visible est signalée, une ombre masquée ne l’est pas', () => {
  const avecOmbre = frameParDefaut({
    effects: [{ type: 'DROP_SHADOW', visible: true }],
  });
  const avertissements = unsupportedPropertyWarnings(avecOmbre);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('Layer « Container » — effect'));
  assert.ok(avertissements[0].includes('l’ombre ou le flou'));
  assert.ok(avertissements[0].includes('réexportez'));

  const ombreMasquee = frameParDefaut({
    effects: [{ type: 'DROP_SHADOW', visible: false }],
  });
  assert.deepEqual(unsupportedPropertyWarnings(ombreMasquee), []);
});

test('une opacité partielle est signalée — c’est le réglage courant d’un état disabled', () => {
  const avertissements = unsupportedPropertyWarnings(frameParDefaut({ opacity: 0.4 }));
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
  const avertissements = unsupportedPropertyWarnings(degrade);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('— fill'));
  assert.ok(avertissements[0].includes('dégradé'));

  // Un stroke non uni suit exactement la même règle, sur son propre champ.
  const strokeImage = frameParDefaut({ strokes: [{ type: 'IMAGE', visible: true }] });
  assert.ok(unsupportedPropertyWarnings(strokeImage)[0].includes('— stroke'));
});

test('des fills « mixed » sont signalés : le contrat n’en décrit qu’un jeu par layer', () => {
  const melange = frameParDefaut({ fills: Symbol('figma.mixed') });
  const avertissements = unsupportedPropertyWarnings(melange);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('— fill'));
});

test('un blend mode et un pointillé sont signalés, leurs valeurs neutres non', () => {
  assert.equal(unsupportedPropertyWarnings(frameParDefaut({ blendMode: 'MULTIPLY' })).length, 1);
  assert.deepEqual(unsupportedPropertyWarnings(frameParDefaut({ blendMode: 'NORMAL' })), []);
  assert.equal(unsupportedPropertyWarnings(frameParDefaut({ dashPattern: [4, 4] })).length, 1);
});

test('un texte centré en Hug ne dit rien, le même texte en Fill est signalé', () => {
  // Un texte en Hug a une boîte à sa mesure : son alignement n'a aucun effet
  // visuel, et le signaler enverrait le designer corriger un bouton correct.
  const centreEnHug = texteParDefaut({ textAlignHorizontal: 'CENTER' });
  assert.deepEqual(unsupportedPropertyWarnings(centreEnHug), []);

  const centreEnFill = texteParDefaut({
    textAlignHorizontal: 'CENTER',
    layoutSizingHorizontal: 'FILL',
  });
  const avertissements = unsupportedPropertyWarnings(centreEnFill);
  assert.equal(avertissements.length, 1);
  assert.ok(avertissements[0].includes('text align'));
  assert.ok(avertissements[0].includes('horizontal'));

  // Même règle sur l'axe vertical, lue indépendamment.
  const basEnFill = texteParDefaut({
    textAlignVertical: 'BOTTOM',
    layoutSizingVertical: 'FILL',
  });
  assert.ok(unsupportedPropertyWarnings(basEnFill)[0].includes('vertical'));
});

test('casse, décoration et troncature d’un texte sont signalées', () => {
  assert.equal(unsupportedPropertyWarnings(texteParDefaut({ textCase: 'UPPER' })).length, 1);
  assert.equal(
    unsupportedPropertyWarnings(texteParDefaut({ textDecoration: 'UNDERLINE' })).length,
    1,
  );
  assert.equal(
    unsupportedPropertyWarnings(texteParDefaut({ textTruncation: 'ENDING' })).length,
    1,
  );
  assert.equal(unsupportedPropertyWarnings(texteParDefaut({ maxLines: 2 })).length, 1);
  // `maxLines: null` est l'absence de troncature, pas une troncature à zéro.
  assert.deepEqual(unsupportedPropertyWarnings(texteParDefaut({ maxLines: null })), []);
});

test('deux propriétés du même layer donnent deux messages : deux gestes différents', () => {
  const cumul = frameParDefaut({
    opacity: 0.5,
    effects: [{ type: 'LAYER_BLUR', visible: true }],
  });
  const avertissements = unsupportedPropertyWarnings(cumul);
  assert.equal(avertissements.length, 2);
  assert.ok(avertissements.every((message) => message.startsWith('Layer « Container » — ')));
});

test('un node qui n’expose aucune de ces propriétés ne fait pas échouer le relevé', () => {
  // Les nodes Figma n'ont pas tous les mêmes champs : un relevé qui les
  // supposerait présents ferait tomber l'export entier sur un calque exotique.
  assert.deepEqual(
    unsupportedPropertyWarnings({ type: 'SLICE', name: 'Repère' } as unknown as SceneNode),
    [],
  );
});
