/**
 * Ce sur quoi l'export porte, et pourquoi il ne porte pas (U2.1).
 *
 * La galerie a montré que trois situations distinctes produisaient un écran
 * identique : rien de sélectionné, plusieurs layers, un layer qui n'est pas un
 * composant. `reportSelectionState` envoyait le même message dans les trois
 * cas. Ces tests tiennent la distinction, puisque c'est elle qui décide du
 * geste à faire dans Figma.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { detailDeCible, etatDeCible } from '../src/cible';

test('un component set devient une cible, avec son compte de variants', () => {
  const { cible, raison } = etatDeCible([{ type: 'COMPONENT_SET', name: 'Button', variants: 12 }]);
  assert.equal(raison, null);
  assert.deepEqual(cible, { nom: 'Button', genre: 'Component set', variants: 12 });
  assert.equal(detailDeCible(cible), 'Component set · 12 variants');
});

test('un component seul n’a pas de variants : il en est un', () => {
  const { cible } = etatDeCible([{ type: 'COMPONENT', name: 'Icon' }]);
  assert.deepEqual(cible, { nom: 'Icon', genre: 'Component', variants: null });
  assert.equal(detailDeCible(cible), 'Component');
});

test('un seul variant ne se dit pas au pluriel', () => {
  const { cible } = etatDeCible([{ type: 'COMPONENT_SET', name: 'Badge', variants: 1 }]);
  assert.equal(detailDeCible(cible), 'Component set · 1 variant');
});

test('les trois empêchements se distinguent, parce que le geste diffère', () => {
  const raisons = [
    etatDeCible([]).raison,
    etatDeCible([
      { type: 'COMPONENT', name: 'A' },
      { type: 'COMPONENT', name: 'B' },
    ]).raison,
    etatDeCible([{ type: 'FRAME', name: 'Card' }]).raison,
  ];

  assert.equal(raisons.filter((raison) => raison === null).length, 0, 'un empêchement sans raison');
  assert.equal(new Set(raisons).size, 3, 'deux empêchements partagent leur raison');
  assert.match(raisons[1] ?? '', /2 layers/);
  assert.match(raisons[2] ?? '', /« Card »/);
});

test('un empêchement ne rend jamais de cible, et une cible jamais de raison', () => {
  const cas = [
    etatDeCible([]),
    etatDeCible([{ type: 'INSTANCE', name: 'Button' }]),
    etatDeCible([{ type: 'COMPONENT', name: 'Button' }]),
  ];
  for (const etat of cas) {
    assert.equal(etat.cible === null, etat.raison !== null, JSON.stringify(etat));
  }
});
