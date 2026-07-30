import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeBooleanDescriptions } from '../src/contract/mergeBooleanDescriptions';
import type { ContractProp } from '../src/contract/types';

test('mergeBooleanDescriptions documente une prop boolean existante', () => {
  const props: Record<string, ContractProp> = {
    iconLeft: { type: 'boolean', default: true },
  };
  const warnings: string[] = [];

  mergeBooleanDescriptions(
    props,
    { iconLeft: 'Affiche l’icône de gauche.' },
    warnings,
  );

  assert.deepEqual(props.iconLeft, {
    type: 'boolean',
    default: true,
    description: 'Affiche l’icône de gauche.',
  });
  assert.deepEqual(warnings, []);
});

test('mergeBooleanDescriptions avertit si la cible est absente ou non boolean', () => {
  const props: Record<string, ContractProp> = {
    variant: { type: 'enum', values: ['contained'], default: 'contained' },
  };
  const warnings: string[] = [];

  mergeBooleanDescriptions(
    props,
    { variant: 'Mauvais type', inconnu: 'Prop absente' },
    warnings,
  );

  assert.deepEqual(warnings, [
    '@boolean « variant » : aucune prop boolean de ce nom.',
    '@boolean « inconnu » : aucune prop boolean de ce nom.',
  ]);
});
