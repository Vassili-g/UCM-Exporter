/**
 * La table « nom de graisse → poids » est une autorité unique : ce test
 * la tient, et il tient surtout ce qu'elle refuse de faire.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { nomsDeGraisseConnus, poidsDeGraisse } from '../src/format/typography.js';

test('un nom de graisse Figma se traduit en poids CSS', () => {
  assert.equal(poidsDeGraisse('Regular'), 400);
  assert.equal(poidsDeGraisse('SemiBold'), 600);
  assert.equal(poidsDeGraisse('Bold'), 700);
});

test('la casse et les séparateurs ne comptent pas', () => {
  // Figma écrit « SemiBold », un designer écrit « Semi Bold », un export
  // d'ailleurs écrit « semi-bold » : les trois nomment la même graisse.
  const attendu = poidsDeGraisse('SemiBold');
  for (const ecriture of ['semibold', 'Semi Bold', 'semi-bold', 'SEMI_BOLD']) {
    assert.equal(poidsDeGraisse(ecriture), attendu, ecriture);
  }
});

test('les deux conventions de nom d’une même graisse tombent au même endroit', () => {
  // Selon les fontes, Figma produit `ExtraLight` ou `UltraLight`.
  assert.equal(poidsDeGraisse('ExtraLight'), poidsDeGraisse('UltraLight'));
  assert.equal(poidsDeGraisse('ExtraBold'), poidsDeGraisse('UltraBold'));
  assert.equal(poidsDeGraisse('SemiBold'), poidsDeGraisse('DemiBold'));
  assert.equal(poidsDeGraisse('Black'), poidsDeGraisse('Heavy'));
});

test('un nom inconnu rend null, et ne se replie jamais sur « normal »', () => {
  // Replier sur 400 ferait disparaître l'information : le design system emploie
  // un vocabulaire que cette table ne couvre pas, et c'est à l'appelant d'en
  // décider, le preset garde la valeur telle quelle, un autre avertira.
  assert.equal(poidsDeGraisse('Chunky'), null);
  assert.equal(poidsDeGraisse(''), null);
  assert.equal(poidsDeGraisse(undefined), null);
  assert.equal(poidsDeGraisse(600), null);
});

test('la table est déclarée sous sa forme normalisée', () => {
  // Une clé écrite « Semi Bold » dans la table ne serait jamais atteinte : la
  // comparaison normalise le nom reçu, pas les clés.
  for (const nom of nomsDeGraisseConnus()) {
    assert.match(nom, /^[a-z0-9]+$/, nom);
    assert.equal(typeof poidsDeGraisse(nom), 'number', nom);
  }
  assert.ok(nomsDeGraisseConnus().length > 0, 'la table est vide');
});
