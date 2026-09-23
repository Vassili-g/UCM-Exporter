/**
 * La mémoire du plafond de chroma ([MOT-07]). Le plafond lui-même est éprouvé
 * sur 360 teintes par `proprietes.test.ts`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TAILLE_MEMOIRE_PLAFOND, plafond, tailleMemoirePlafond } from '../src/index';

test('[MOT-07] le plafond se mémorise, et la mémoire ne dépasse jamais 20 000 entrées', () => {
  const premier = plafond(0.61, 33.3);
  assert.equal(plafond(0.61, 33.3), premier);
  for (let i = 0; i < TAILLE_MEMOIRE_PLAFOND + 500; i += 1) {
    plafond(0.5, i / 100);
    assert.ok(tailleMemoirePlafond() <= TAILLE_MEMOIRE_PLAFOND);
  }
  assert.ok(tailleMemoirePlafond() < TAILLE_MEMOIRE_PLAFOND, 'la mémoire a été vidée une fois');
});
