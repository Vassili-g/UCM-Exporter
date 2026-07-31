import assert from 'node:assert/strict';
import test from 'node:test';
import { extractContractProps, normalizePropKey } from '../src/contract/parsers';

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

test('extractContractProps ne laisse pas le nom sémantique voler la clé d’une autre prop', () => {
  // « Taille » veut devenir `size`, mais une vraie prop Size existe : sans la
  // première passe, l'axe de tailles disparaissait entièrement du contrat.
  const definitions = {
    Taille: { type: 'VARIANT', defaultValue: 'Medium', variantOptions: ['Big', 'Medium', 'Small'] },
    Size: { type: 'TEXT', defaultValue: 'texte libre' },
  } as unknown as ComponentPropertyDefinitions;
  const warnings: string[] = [];

  assert.deepEqual(extractContractProps(definitions, warnings), {
    taille: { type: 'enum', values: ['big', 'medium', 'small'], default: 'medium' },
    size: { type: 'string', default: 'texte libre' },
  });
  assert.deepEqual(warnings, [
    'Propriété « Taille » : ses valeurs sont des tailles, mais une autre propriété porte déjà le nom « size ». Elle reste exportée sous « taille ». Renommez l\'une des deux si vous voulez « size ».',
  ]);
});

test('extractContractProps donne le même résultat quel que soit l’ordre Figma', () => {
  const axe = { type: 'VARIANT', defaultValue: 'Medium', variantOptions: ['Big', 'Medium', 'Small'] };
  const texte = { type: 'TEXT', defaultValue: 'texte libre' };

  const avant = extractContractProps({ Taille: axe, Size: texte } as unknown as ComponentPropertyDefinitions);
  const apres = extractContractProps({ Size: texte, Taille: axe } as unknown as ComponentPropertyDefinitions);

  assert.deepEqual(avant, apres);
});

test('extractContractProps conserve la première prop quand deux écritures donnent la même clé', () => {
  // « Icon Left » et « icon-left » sont deux propriétés Figma distinctes et
  // légales qui se normalisent toutes deux en `iconLeft`.
  const definitions = {
    'Icon Left': { type: 'BOOLEAN', defaultValue: true },
    'icon-left': { type: 'TEXT', defaultValue: 'chevron' },
  } as unknown as ComponentPropertyDefinitions;
  const warnings: string[] = [];

  assert.deepEqual(extractContractProps(definitions, warnings), {
    iconLeft: { type: 'boolean', default: true },
  });
  assert.deepEqual(warnings, [
    'Propriétés « Icon Left » et « icon-left » : leurs noms deviennent identiques une fois normalisés (« iconLeft »). Seule « Icon Left » est exportée. Renommez l’une des deux.',
  ]);
});

test('extractContractProps protège le défaut de disabled contre un BOOLEAN homonyme', () => {
  // L'axe State impose `disabled: true` ; un BOOLEAN « Disabled » à false
  // renversait ce défaut sans laisser de trace.
  const definitions = {
    State: { type: 'VARIANT', defaultValue: 'Disable', variantOptions: ['Default', 'Disable'] },
    Disabled: { type: 'BOOLEAN', defaultValue: false },
  } as unknown as ComponentPropertyDefinitions;
  const warnings: string[] = [];

  assert.deepEqual(extractContractProps(definitions, warnings), {
    disabled: { type: 'boolean', default: true },
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /identiques une fois normalisés \(« disabled »\)/);
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
