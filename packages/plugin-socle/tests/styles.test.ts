/** La loi des styles lit chaque forme par laquelle une interface pose une classe. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { classesPosees } from '../lois/styles';

const lire = (source: string) =>
  [...classesPosees({ source, feuille: '', valeursDeGabarit: {}, poseesParLHote: new Set() })].sort();

test('une classe posée par className, littérale ou par gabarit, est lue', () => {
  const source = "a.className = 'carte carte-vide';\nb.className = `btn btn-${variant}`;";
  assert.deepEqual(
    [...classesPosees({ source, feuille: '', valeursDeGabarit: { variant: () => ['primary'] }, poseesParLHote: new Set() })].sort(),
    ['btn', 'btn-primary', 'carte', 'carte-vide'],
  );
});

test('un élément SVG pose sa classe par setAttribute ou classList, et la loi la lit', () => {
  const source = [
    "trait.setAttribute('class', 'derive-trait derive-trait-soft');",
    "poignee.classList.add('derive-poignee', 'derive-poignee-claire');",
    "poignee.classList.toggle('derive-poignee-active', actif);",
  ].join('\n');
  assert.deepEqual(lire(source), [
    'derive-poignee',
    'derive-poignee-active',
    'derive-poignee-claire',
    'derive-trait',
    'derive-trait-soft',
  ]);
});
