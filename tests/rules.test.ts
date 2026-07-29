import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRules, iconPolicyFromVisibility } from '../src/contract/extractRules';

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

test('buildRules garde la première @prop d’une valeur et signale le doublon', () => {
  const { propDescriptions, warnings } = buildRules([
    { tag: 'prop', prop: 'variant.contained', content: 'Première description' },
    { tag: 'prop', prop: 'Variant.Contained', content: 'Seconde description' },
  ]);

  // Deux règles Figma décrivant la même valeur se contredisent : c'est au
  // designer de trancher, jamais à l'export d'écraser en silence.
  assert.deepEqual(propDescriptions, { variant: { contained: 'Première description' } });
  assert.deepEqual(warnings, [
    'Règle @prop « variant.contained » dupliquée : seule la première est retenue.',
  ]);
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

test('buildRules interprète les politiques @icons', () => {
  const result = buildRules([
    { tag: 'icons', content: '', iconName: 'arrow-left-long', iconPolicy: 'modifiable' },
    { tag: 'icons', content: '', iconName: 'fa-warning', iconPolicy: 'strict' },
  ]);

  assert.deepEqual(result.iconRules, [
    { iconName: 'arrow-left-long', policy: 'modifiable' },
    { iconName: 'fa-warning', policy: 'strict' },
  ]);
});

test('buildRules avertit quand une règle @icons n a pas de politique visible', () => {
  const result = buildRules([{ tag: 'icons', content: '', iconName: 'fa-warning' }]);

  assert.deepEqual(result.iconRules, []);
  assert.deepEqual(result.warnings, [
    'Règle @icons « fa-warning » : rendez visible exactement un calque « modifiable » ou « strict ».',
  ]);
});

test('iconPolicyFromVisibility exige une visibilité exclusive', () => {
  assert.equal(iconPolicyFromVisibility(true, false), 'modifiable');
  assert.equal(iconPolicyFromVisibility(false, true), 'strict');
  assert.equal(iconPolicyFromVisibility(true, true), undefined);
  assert.equal(iconPolicyFromVisibility(false, false), undefined);
  assert.equal(iconPolicyFromVisibility(null, false), undefined);
});
