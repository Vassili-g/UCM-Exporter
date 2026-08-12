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
    'Variant property « Taille » : ses valeurs sont des tailles, mais une autre component property porte déjà le nom « size ». Elle reste exportée sous « taille ». Renommez l\'une des deux si vous voulez « size ».',
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
    'Component properties « Icon Left » et « icon-left » : leurs noms deviennent identiques une fois normalisés (« iconLeft »). Seule « Icon Left » est exportée. Renommez l’une des deux.',
  ]);
});

test('extractContractProps priorise State sur un BOOLEAN Disabled dans les deux ordres', () => {
  const state = { type: 'VARIANT', defaultValue: 'Disable', variantOptions: ['Default', 'Disable'] };
  const boolean = { type: 'BOOLEAN', defaultValue: false };
  const firstWarnings: string[] = [];
  const secondWarnings: string[] = [];
  const expected = {
    disabled: { type: 'boolean', default: true },
  };

  assert.deepEqual(extractContractProps({ State: state, Disabled: boolean } as ComponentPropertyDefinitions, firstWarnings), expected);
  assert.deepEqual(extractContractProps({ Disabled: boolean, State: state } as ComponentPropertyDefinitions, secondWarnings), expected);
  assert.deepEqual(firstWarnings, secondWarnings);
  assert.deepEqual(firstWarnings, [
    'Component property « Disabled » : l’axe « State » possède déjà le variant « Disable », qui devient la prop ' +
      'publique « disabled ». Cette boolean property n’est pas exportée séparément, donc sa valeur par défaut ' +
      'manquerait au développeur. Supprimez-la si elle pilote le même état ; sinon renommez-la selon le layer ' +
      'distinct qu’elle pilote, puis réexportez.',
  ]);
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
