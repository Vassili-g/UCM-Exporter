/** Les bornes de la fenêtre, pour des bornes quelconques. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireTaille, rangerTaille, tailleValide, type BornesFenetre } from '../src/fenetre';

const BORNES: BornesFenetre = { defaut: { largeur: 600, hauteur: 720 }, minimale: { largeur: 440, hauteur: 520 }, cle: 'essai' };

test('une taille sous le minimum remonte au minimum, axe par axe', () => {
  assert.deepEqual(tailleValide({ largeur: 70, hauteur: 900 }, BORNES), { largeur: 440, hauteur: 900 });
});

test('une valeur qui n’est pas un nombre fini retombe sur le défaut', () => {
  assert.deepEqual(tailleValide({ largeur: Number.NaN, hauteur: undefined }, BORNES), BORNES.defaut);
  assert.deepEqual(tailleValide(null, BORNES), BORNES.defaut);
});

test('la taille se range et se relit sous la clé du plugin, bornée', async () => {
  const stockage = new Map<string, unknown>();
  (globalThis as unknown as { figma: unknown }).figma = {
    clientStorage: {
      getAsync: async (cle: string) => stockage.get(cle),
      setAsync: async (cle: string, valeur: unknown) => { stockage.set(cle, valeur); },
    },
  };
  await rangerTaille({ largeur: 100.6, hauteur: 800 }, BORNES);
  assert.deepEqual(stockage.get('essai'), { largeur: 440, hauteur: 800 });
  assert.deepEqual(await lireTaille(BORNES), { largeur: 440, hauteur: 800 });
});
