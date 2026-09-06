import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeEnumDefaults } from '../src/contract/mergeEnumDefaults';
import { extractContractProps } from '../src/contract/parsers';
import type { ContractProp } from '@ucm-kit/core/format';

/** Un axe dont le premier variant du set n'est PAS celui que le designer veut. */
function axeDeCouleur() {
  return {
    Color: {
      type: 'VARIANT',
      defaultValue: 'Primary',
      variantOptions: ['Primary', 'Secondary'],
    },
  } as unknown as ComponentPropertyDefinitions;
}

test('sans @default, aucun axe ne publie de valeur par défaut', () => {
  assert.deepEqual(extractContractProps(axeDeCouleur()), {
    color: { type: 'enum', values: ['primary', 'secondary'] },
  });
});

/**
 * Le défaut suivait la POSITION du variant dans le component set, que rien
 * n'affiche dans Figma et que l'ordre du set choisit pour la lisibilité. Le
 * contrat publiait donc un effet de bord de mise en page comme une décision.
 */
test('la première position du set ne l’emporte plus sur la règle', () => {
  const props = extractContractProps(axeDeCouleur());
  const warnings: string[] = [];

  mergeEnumDefaults(props, { color: 'secondary' }, warnings);

  assert.deepEqual(props.color, {
    type: 'enum',
    values: ['primary', 'secondary'],
    default: 'secondary',
  });
  assert.deepEqual(warnings, []);
});

test('un @default qui vise une valeur inexistante ne pose rien et le dit', () => {
  const props = extractContractProps(axeDeCouleur());
  const warnings: string[] = [];

  mergeEnumDefaults(props, { color: 'tertiary' }, warnings);

  assert.deepEqual(props.color, { type: 'enum', values: ['primary', 'secondary'] });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /n’a pas de valeur « tertiary »/);
});

test('un @default qui vise un axe inexistant ne pose rien et le dit', () => {
  const props = extractContractProps(axeDeCouleur());
  const warnings: string[] = [];

  mergeEnumDefaults(props, { couleur: 'primary' }, warnings);

  assert.deepEqual(props, { color: { type: 'enum', values: ['primary', 'secondary'] } });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /aucun axe de variantes portant ce nom/);
});

/**
 * Le rapport de ces avertissements est lu par un designer : il nomme la
 * propriété et la valeur, jamais le vocabulaire du code.
 */
test('aucun avertissement de @default n’emploie le vocabulaire du code', () => {
  const props = extractContractProps(axeDeCouleur());
  const warnings: string[] = [];

  mergeEnumDefaults(props, { couleur: 'primary' }, warnings);
  mergeEnumDefaults(props, { color: 'tertiary' }, warnings);

  const texte = warnings.join('\n');
  assert.doesNotMatch(texte, /\bprops?\b/i);
  assert.doesNotMatch(texte, /\benums?\b/i);
});

test('un @default ne touche pas une prop qui n’est pas un axe', () => {
  const props: Record<string, ContractProp> = {
    label: { type: 'string', default: 'Valider' },
  };
  const warnings: string[] = [];

  mergeEnumDefaults(props, { label: 'Annuler' }, warnings);

  assert.deepEqual(props.label, { type: 'string', default: 'Valider' });
  assert.equal(warnings.length, 1);
});
