/** W4.2 : les formats du sélecteur de couleur, de la position au code et retour. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ecrireHexa, lireHexa, type Rgb8 } from 'ucm-couleur';

import { deplacer, ecrireCode, hsvVersRgb8, lireCode, positionDe } from '../src/ui/couleur/formats';

const BLEU: Rgb8 = [0x1e, 0x6f, 0xd9];

test('le même bleu s’écrit en Hex sans dièse, en RGB et en HSL, et se relit à l’identique', () => {
  assert.deepEqual(ecrireCode('hex', BLEU), ['1E6FD9']);
  assert.deepEqual(ecrireCode('rgb', BLEU), ['30', '111', '217']);
  assert.deepEqual(ecrireCode('hsl', BLEU), ['214', '76', '48']);
  assert.deepEqual(lireCode('hex', ['1E6FD9']), BLEU);
  assert.deepEqual(lireCode('rgb', ['30', '111', '217']), BLEU);
});

test('chaque couleur sRGB revient de sa position dans la zone, octet pour octet', () => {
  for (let rang = 0; rang < 4096; rang += 1) {
    const couleur: Rgb8 = [(rang * 37) % 256, (rang * 101) % 256, (rang * 211) % 256];
    assert.deepEqual(hsvVersRgb8(positionDe(couleur)), couleur, ecrireHexa(couleur));
  }
});

test('un code HSL, arrondi au degré et au pour cent, retombe à trois octets au plus de la couleur écrite', () => {
  for (const hexa of ['#1E6FD9', '#16A34A', '#F7F7F7', '#121212', '#FFD84D']) {
    const couleur = lireHexa(hexa)!;
    const relue = lireCode('hsl', ecrireCode('hsl', couleur))!;
    for (let canal = 0; canal < 3; canal += 1) assert.ok(Math.abs(relue[canal] - couleur[canal]) <= 3, `${hexa} : ${ecrireHexa(relue)}`);
  }
});

test('Hex accepte le dièse, la forme courte et les minuscules ; RGB et HSL leurs unités et la virgule', () => {
  assert.deepEqual(lireCode('hex', ['#1e6fd9']), BLEU);
  assert.deepEqual(lireCode('hex', [' 1e6fd9 ']), BLEU);
  assert.deepEqual(lireCode('hex', ['#FFF']), [255, 255, 255]);
  assert.deepEqual(lireCode('hex', ['FFF']), [255, 255, 255]);
  assert.deepEqual(lireCode('hsl', ['0°', '0 %', '100%']), [255, 255, 255]);
  assert.deepEqual(lireCode('hsl', ['120', '100', '25,1']), [0, 128, 0]);
});

test('un code invalide ne donne aucune couleur', () => {
  for (const champ of ['', '1E6FD', '1E6FD9A', 'GGGGGG', '#1E6FD9FF']) assert.equal(lireCode('hex', [champ]), null, champ);
  assert.equal(lireCode('rgb', ['30', '111']), null);
  assert.equal(lireCode('rgb', ['30', '111', '256']), null);
  assert.equal(lireCode('rgb', ['30', '111', '21.5']), null);
  assert.equal(lireCode('rgb', ['-1', '0', '0']), null);
  assert.equal(lireCode('hsl', ['361', '50', '50']), null);
  assert.equal(lireCode('hsl', ['200', '101', '50']), null);
  assert.equal(lireCode('hsl', ['bleu', '50', '50']), null);
});

test('un gris garde la teinte posée, un noir la saturation posée, et une couleur inchangée sa position exacte', () => {
  const posee = { h: 214.4, s: 0.861, v: 0.85 };
  assert.equal(positionDe([128, 128, 128], posee).h, 214.4);
  assert.equal(positionDe([0, 0, 0], posee).s, 0.861);
  assert.equal(positionDe(hsvVersRgb8(posee), posee), posee);
});

test('les flèches bornent saturation et valeur entre 0 et 1, et font tourner la teinte', () => {
  const position = { h: 355, s: 0.995, v: 0.004 };
  assert.equal(deplacer(position, 's', 0.01).s, 1);
  assert.equal(deplacer(position, 'v', -0.01).v, 0);
  assert.equal(deplacer(position, 'h', 10).h, 5);
  assert.equal(deplacer({ ...position, h: 3 }, 'h', -10).h, 353);
  assert.equal(deplacer({ h: 0, s: 0.5, v: 0.5 }, 's', 0.1).s, 0.6);
});
