import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRules } from '../src/contract/extractRules';

test('buildRules assemble usage / do (répétable) / dont / pairs', () => {
  const { intent, warnings } = buildRules([
    { tag: 'usage', content: 'Action principale' },
    { tag: 'do', content: 'Utiliser un verbe' },
    { tag: 'do', content: 'Être concis' },
    { tag: 'dont', content: 'Empiler' },
    { tag: 'pairs', content: 'Dialog, Form' },
  ]);

  assert.deepEqual(intent, {
    usage: 'Action principale',
    do: ['Utiliser un verbe', 'Être concis'],
    dont: ['Empiler'],
    pairs: ['Dialog', 'Form'],
  });
  assert.equal(warnings.length, 0);
});

test('buildRules range @prop dans propDescriptions (prop et valeur normalisées)', () => {
  const { propDescriptions } = buildRules([
    { tag: 'prop', prop: 'variant.contained', content: 'Action la plus importante' },
    { tag: 'prop', prop: 'Size.Big', content: 'CTA custom' },
  ]);

  assert.deepEqual(propDescriptions, {
    variant: { contained: 'Action la plus importante' },
    size: { big: 'CTA custom' },
  });
});

test('buildRules garde le premier @usage et avertit sur les suivants', () => {
  const { intent, warnings } = buildRules([
    { tag: 'usage', content: 'Premier' },
    { tag: 'usage', content: 'Second' },
  ]);

  assert.equal(intent?.usage, 'Premier');
  assert.equal(warnings.length, 1);
});

test('buildRules avertit sur @prop mal formée et contenu vide', () => {
  const { intent, warnings } = buildRules([
    { tag: 'prop', prop: 'variant', content: 'Sans point séparateur' },
    { tag: 'usage', content: '   ' },
  ]);

  assert.equal(intent, null);
  assert.equal(warnings.length, 2);
});

test('buildRules sans entrée exploitable → intent null', () => {
  assert.equal(buildRules([]).intent, null);
});
