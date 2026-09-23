/** Les sévérités et leur ordre d'affichage (section 11.4). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { severiteDeLAlerte, trierParSeverite, type Severite } from '../src/index';

test('les constats se rangent : bloquants, promesses, alertes, notices', () => {
  const constats: { severite: Severite; nom: string }[] = [
    { severite: 'notice', nom: 'n1' },
    { severite: 'alerte', nom: 'a1' },
    { severite: 'promesse', nom: 'p1' },
    { severite: 'bloquant', nom: 'b1' },
    { severite: 'alerte', nom: 'a2' },
    { severite: 'promesse', nom: 'p2' },
  ];
  assert.deepEqual(trierParSeverite(constats).map((c) => c.nom), ['b1', 'p1', 'p2', 'a1', 'a2', 'n1']);
});

test('une alerte reste une alerte, sauf la référence plus vive que vivid', () => {
  assert.equal(severiteDeLAlerte({ code: 'couleur-presque-grise', palette: 'p-0000000a', chroma: 0.01, seuil: 0.03 }), 'alerte');
  assert.equal(severiteDeLAlerte({ code: 'reference-plus-vive', palette: 'p-0000000a', part: 1, partVivid: 0.95 }), 'notice');
});
