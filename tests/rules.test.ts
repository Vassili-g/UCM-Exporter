import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRules,
  compactName,
  extractRules,
  hasUsableRules,
  iconPolicyFromVisibility,
  ruleTagFromValue,
  rulesContainerOwner,
} from '../src/contract/extractRules';
import { indexContractedNames } from '../src/contract/composedComponents';

test('ruleTagFromValue reconnaît @boolean comme les autres variantes de règle', () => {
  assert.equal(ruleTagFromValue('@boolean'), 'boolean');
  assert.equal(ruleTagFromValue('BOOLEAN'), 'boolean');
  assert.equal(ruleTagFromValue('@inconnu'), null);
});

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
    'Règle @prop « variant.contained » : elle apparaît deux fois. Seule la première est exportée ; supprimez la seconde.',
  ]);
});

test('buildRules range @boolean par nom de prop normalisé', () => {
  const result = buildRules([
    { tag: 'boolean', prop: 'icon-left', content: 'Affiche l’icône de gauche.' },
    { tag: 'boolean', prop: 'Label', content: 'Affiche le libellé.' },
  ]);

  assert.deepEqual(result.booleanDescriptions, {
    iconLeft: 'Affiche l’icône de gauche.',
    label: 'Affiche le libellé.',
  });
  assert.deepEqual(result.warnings, []);
  assert.equal(hasUsableRules(result), true);
});

test('buildRules garde la première @boolean et signale cible absente et doublon', () => {
  const { booleanDescriptions, warnings } = buildRules([
    { tag: 'boolean', prop: 'icon-left', content: 'Première description' },
    { tag: 'boolean', prop: 'Icon Left', content: 'Seconde description' },
    { tag: 'boolean', prop: ' ', content: 'Sans cible' },
  ]);

  assert.deepEqual(booleanDescriptions, { iconLeft: 'Première description' });
  assert.deepEqual(warnings, [
    'Règle @boolean « iconLeft » : elle apparaît deux fois. Seule la première est exportée ; supprimez la seconde.',
    'Règle @boolean : le layer « prop » est vide. Écrivez-y le nom de la boolean property du composant, par exemple « icon-left ».',
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
    'Règle @icons « fa-warning » : aucune politique n’est choisie. Rendez visible exactement un des deux layers « modifiable » ou « strict ».',
  ]);
});

test('iconPolicyFromVisibility exige une visibilité exclusive', () => {
  assert.equal(iconPolicyFromVisibility(true, false), 'modifiable');
  assert.equal(iconPolicyFromVisibility(false, true), 'strict');
  assert.equal(iconPolicyFromVisibility(true, true), undefined);
  assert.equal(iconPolicyFromVisibility(false, false), undefined);
  assert.equal(iconPolicyFromVisibility(null, false), undefined);
});

test('le conteneur de règles est reconnu par UNE seule règle, à la casse près', async () => {
  // Le Component Set s'appelle « Icon Button », le conteneur « iconbutton-Rules ».
  // Les deux lectures doivent conclure la même chose : un composant reconnu comme
  // dépendance unifiée par ses parents doit rester exportable lui-même.
  const container = { type: 'FRAME', name: 'iconbutton-Rules', findAll: () => [] };
  const page = { findAll: (predicat: (node: any) => boolean) => [container].filter(predicat) };
  (globalThis as any).figma = { currentPage: page };

  const componentSet = { name: 'Icon Button' } as ComponentSetNode;
  const rules = await extractRules(componentSet);

  assert.equal(rules.sectionFound, true);
  assert.equal(rulesContainerOwner(container), compactName(componentSet.name));
  assert.deepEqual([...indexContractedNames(page as unknown as PageNode)], ['iconbutton']);
});

test('rulesContainerOwner ignore un conteneur qui n’en est pas un', () => {
  assert.equal(rulesContainerOwner({ type: 'FRAME', name: 'Button' }), null);
  assert.equal(rulesContainerOwner({ type: 'COMPONENT', name: 'Button-Rules' }), null);
  assert.equal(rulesContainerOwner({ type: 'SECTION', name: '-Rules' }), null);
  assert.equal(rulesContainerOwner({ type: 'SECTION', name: ' Button-Rules ' }), 'button');
});
