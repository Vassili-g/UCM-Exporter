import assert from 'node:assert/strict';
import test from 'node:test';
import { extractContractProps, normalizePropKey, parseIntent } from '../src/contract/parsers';

test('normalizePropKey retire les identifiants Figma et produit du camelCase', () => {
  assert.equal(normalizePropKey('Icon Position#12:3'), 'iconPosition');
});

test('normalizePropKey préserve un nom déjà en camelCase (iconLeft/iconRight)', () => {
  assert.equal(normalizePropKey('iconLeft'), 'iconLeft');
  assert.equal(normalizePropKey('iconRight#4:5'), 'iconRight');
});

test('normalizePropKey conserve fidèlement le nom réel du wrapper (Button-Construc-Type)', () => {
  assert.equal(normalizePropKey('Button-Construc-Type'), 'buttonConstrucType');
});

test('extractContractProps exclut State et expose disabled', () => {
  const definitions = {
    Color: {
      type: 'VARIANT',
      defaultValue: 'Primary',
      variantOptions: ['Primary', 'Secondary'],
    },
    Variant: {
      type: 'VARIANT',
      defaultValue: 'Contained',
      variantOptions: ['Contained', 'Outlined', 'Text'],
    },
    State: {
      type: 'VARIANT',
      defaultValue: 'Default',
      variantOptions: ['Default', 'Hover', 'Focus', 'Press', 'Disable'],
    },
  } as ComponentPropertyDefinitions;

  assert.deepEqual(extractContractProps(definitions), {
    color: { type: 'enum', values: ['primary', 'secondary'], default: 'primary' },
    variant: {
      type: 'enum',
      values: ['contained', 'outlined', 'text'],
      default: 'contained',
    },
    disabled: { type: 'boolean', default: false },
  });
});

test('extractContractProps expose iconLeft/iconRight comme booléens indépendants', () => {
  const definitions = {
    'Button-Construc-Type': {
      type: 'VARIANT',
      defaultValue: 'Medium',
      variantOptions: ['Big', 'Medium', 'Small'],
    },
    iconLeft: { type: 'BOOLEAN', defaultValue: true },
    iconRight: { type: 'BOOLEAN', defaultValue: true },
  } as unknown as ComponentPropertyDefinitions;

  assert.deepEqual(extractContractProps(definitions), {
    size: {
      type: 'enum',
      values: ['big', 'medium', 'small'],
      default: 'medium',
      figmaName: 'Button-Construc-Type',
    },
    iconLeft: { type: 'boolean', default: true },
    iconRight: { type: 'boolean', default: true },
  });
});

test('extractContractProps mappe un axe de tailles vers "size" et garde le nom Figma', () => {
  const definitions = {
    'Button-Construc-Type': {
      type: 'VARIANT',
      defaultValue: 'Medium',
      variantOptions: ['Big', 'Medium', 'Small'],
    },
  } as unknown as ComponentPropertyDefinitions;

  assert.deepEqual(extractContractProps(definitions), {
    size: {
      type: 'enum',
      values: ['big', 'medium', 'small'],
      default: 'medium',
      figmaName: 'Button-Construc-Type',
    },
  });
});

test('extractContractProps laisse un enum non-taille sous son nom, sans figmaName', () => {
  const definitions = {
    Variant: {
      type: 'VARIANT',
      defaultValue: 'Contained',
      variantOptions: ['Contained', 'Outlined', 'Text'],
    },
  } as ComponentPropertyDefinitions;

  assert.deepEqual(extractContractProps(definitions), {
    variant: { type: 'enum', values: ['contained', 'outlined', 'text'], default: 'contained' },
  });
});

test('parseIntent lit les tags répétables et les paires', () => {
  assert.deepEqual(
    parseIntent(`@usage Action principale\n@do Utiliser un verbe\n@do Être concis\n@dont Empiler\n@pairs Icon, Tooltip`),
    {
      usage: 'Action principale',
      do: ['Utiliser un verbe', 'Être concis'],
      dont: ['Empiler'],
      pairs: ['Icon', 'Tooltip'],
    },
  );
  assert.equal(parseIntent('Description sans tags'), null);
});
