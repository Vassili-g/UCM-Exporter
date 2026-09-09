import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collidingVariantAxes,
  extractContractPropertyModel,
  extractContractProps,
  normalizePropKey,
  propByName,
} from '../src/contract/parsers';

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
    color: { type: 'enum', values: ['primary', 'secondary'] },
    variant: { type: 'enum', values: ['contained', 'outlined', 'text'] },
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
    taille: { type: 'enum', values: ['big', 'medium', 'small'] },
    size: { type: 'string', default: 'texte libre' },
  });
  assert.deepEqual(warnings, [
    'Variant property « Taille » : ses valeurs sont des tailles, mais une autre component property porte déjà le nom « size ». Elle reste exportée sous « taille ». Renommez l\'une des deux si vous voulez « size », puis réexportez.',
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
    'Component properties « Icon Left » et « icon-left » : leurs noms deviennent identiques une fois normalisés (« iconLeft »). Seule « Icon Left » est exportée. Renommez l’une des deux, puis réexportez.',
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
    variant: { type: 'enum', values: ['contained', 'outlined', 'text'] },
  });
});

test('extractContractPropertyModel conserve INSTANCE_SWAP, SLOT et leurs noms techniques', () => {
  const definitions = {
    'Leading icon#12:3': {
      type: 'INSTANCE_SWAP',
      defaultValue: 'component-id',
      preferredValues: [{ type: 'COMPONENT', key: 'icon-key' }],
    },
    'Content#12:4': {
      type: 'SLOT',
      defaultValue: '',
      preferredValues: [{ type: 'COMPONENT_SET', key: 'content-key' }],
      description: 'Contenu libre',
      slotSettings: {
        stretchChildOnInsert: true,
        displayEmptyByDefault: false,
        minChildren: 0,
        maxChildren: 2,
        allowPreferredValuesOnly: true,
      },
    },
  } as unknown as ComponentPropertyDefinitions;

  const model = extractContractPropertyModel(definitions);

  assert.deepEqual(model.props.leadingIcon, {
    type: 'instance-swap',
    default: 'component-id',
    preferredValues: [{ type: 'COMPONENT', key: 'icon-key' }],
  });
  assert.deepEqual(model.props.content, {
    type: 'slot',
    default: '',
    preferredValues: [{ type: 'COMPONENT_SET', key: 'content-key' }],
    description: 'Contenu libre',
    settings: {
      stretchChildOnInsert: true,
      displayEmptyByDefault: false,
      minChildren: 0,
      maxChildren: 2,
      allowPreferredValuesOnly: true,
    },
  });
  assert.equal(model.publicPropertyKeyByFigmaName.get('Leading icon#12:3'), 'leadingIcon');
  assert.equal(model.publicPropertyKeyByFigmaName.get('Content#12:4'), 'content');
});

test('une component property nommée « __proto__ » ne disparaît pas dans le prototype', () => {
  // Le seul canal par lequel un nom Figma arrive jusqu'à une écriture d'objet.
  // `props[key] = prop` aurait fixé le prototype au lieu d'occuper une clé : la
  // prop quittait le contrat sans un mot, et `propByName` continuait de répondre
  // qu'elle n'existait pas. Tout le reste du moteur se protège déjà ainsi.
  // Le littéral `{ __proto__: … }` fixerait le prototype au lieu de créer une
  // clé : on construit la définition comme Figma la livre, en propriété propre.
  const definitions = {} as unknown as ComponentPropertyDefinitions;
  Object.defineProperty(definitions, '__proto__', {
    value: { type: 'BOOLEAN', defaultValue: true }, enumerable: true, configurable: true,
  });
  const props = extractContractProps(definitions);

  assert.deepEqual(Object.keys(props), ['__proto__']);
  assert.deepEqual(propByName(props, '__proto__'), { type: 'boolean', default: true });
  assert.equal(Object.getPrototypeOf(props), Object.prototype);
});

test('collidingVariantAxes nomme les deux axes dont les noms se confondent', () => {
  const axe = (options: string[]) => ({ type: 'VARIANT', defaultValue: options[0], variantOptions: options });
  const kindA = axe(['A']);
  const kindB = axe(['B']);

  assert.deepEqual(
    collidingVariantAxes({ Kind: kindA, kind: kindB } as unknown as ComponentPropertyDefinitions),
    ['Kind', 'kind'],
  );
  // L'ordre de déclaration ne change que l'ordre des deux noms cités.
  assert.deepEqual(
    collidingVariantAxes({ kind: kindB, Kind: kindA } as unknown as ComponentPropertyDefinitions),
    ['kind', 'Kind'],
  );
  // Un espace ne distingue pas deux clés : `normalizePropKey` le mange. Le nom
  // cité au designer garde cet espace, seul indice qui distingue les deux
  // propriétés dans le panneau de Figma.
  assert.deepEqual(
    collidingVariantAxes({ 'Kind ': kindA, Kind: kindB } as unknown as ComponentPropertyDefinitions),
    ['Kind ', 'Kind'],
  );
  // L'identifiant interne ne distingue pas deux clés non plus.
  assert.deepEqual(
    collidingVariantAxes({ 'Kind#1:1': kindA, 'Kind#2:2': kindB } as unknown as ComponentPropertyDefinitions),
    ['Kind', 'Kind'],
  );
});

test('collidingVariantAxes ignore une collision qui ne met pas deux axes en cause', () => {
  const axe = { type: 'VARIANT', defaultValue: 'A', variantOptions: ['A'] };
  const booleen = { type: 'BOOLEAN', defaultValue: true };
  const texte = { type: 'TEXT', defaultValue: 'libre' };

  // Un axe et une propriété non-axe se tranchent par la priorité des axes.
  assert.equal(
    collidingVariantAxes({ Kind: axe, kind: booleen } as unknown as ComponentPropertyDefinitions),
    null,
  );
  // Deux propriétés non-axes gardent le traitement du premier arrivé.
  assert.equal(
    collidingVariantAxes({ Kind: booleen, kind: texte } as unknown as ComponentPropertyDefinitions),
    null,
  );
  // Un axe renommé en `size` ne prend pas la clé d'un autre axe : `taken` le retient.
  assert.equal(
    collidingVariantAxes({
      Echelle: { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Large'] },
      size: { type: 'VARIANT', defaultValue: 'A', variantOptions: ['A'] },
    } as unknown as ComponentPropertyDefinitions),
    null,
  );
});

test('un axe garde sa clé publique face à une propriété déclarée avant lui', () => {
  // Le fichier Figma déclare la BOOLEAN d'abord. Sans la priorité des axes, elle
  // prenait la clé `kind` : `structure.variantAxes` citait alors un nom que
  // `props` décrivait comme un booléen, et les valeurs des variants n'avaient
  // plus d'enum où se lire.
  const definitions = {
    kind: { type: 'BOOLEAN', defaultValue: true },
    Kind: { type: 'VARIANT', defaultValue: 'A', variantOptions: ['A', 'B'] },
  } as unknown as ComponentPropertyDefinitions;
  const warnings: string[] = [];

  const modele = extractContractPropertyModel(definitions, warnings);

  assert.deepEqual(modele.props, { kind: { type: 'enum', values: ['a', 'b'] } });
  assert.equal(modele.publicVariantKeyByRawKey.get('kind'), 'kind');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Kind » et « kind »/);
});

test('State et Status hors variant restent des props, avec leur type', () => {
  // Une BOOLEAN ou une TEXT nommée « State » n'est pas un axe d'états : rien ne la
  // décrit dans `stateModel`, et l'exclure des props la faisait disparaître du
  // contrat sans qu'aucun message ne la nomme.
  const definitions = {
    'State#1:1': { type: 'BOOLEAN', defaultValue: true },
    'Status#1:2': { type: 'TEXT', defaultValue: 'brouillon' },
    'State Icon#1:3': { type: 'INSTANCE_SWAP', defaultValue: 'cle-icone', preferredValues: [] },
    'Status Slot#1:4': { type: 'SLOT', defaultValue: true, preferredValues: [] },
  } as unknown as ComponentPropertyDefinitions;
  const warnings: string[] = [];

  const modele = extractContractPropertyModel(definitions, warnings);

  assert.deepEqual(modele.props, {
    state: { type: 'boolean', default: true },
    status: { type: 'string', default: 'brouillon' },
    stateIcon: { type: 'instance-swap', default: 'cle-icone', preferredValues: [] },
    statusSlot: { type: 'slot', default: true, preferredValues: [] },
  });
  // Aucun de ces types n'est un axe : la table des axes reste vide.
  assert.equal(modele.publicVariantKeyByRawKey.size, 0);
  assert.deepEqual(modele.publicPropertyKeyByFigmaName.get('State#1:1'), 'state');
  assert.deepEqual(modele.publicPropertyKeyByFigmaName.get('Status#1:2'), 'status');
  assert.deepEqual(warnings, []);
});

test('un axe State garde sa clé contre une BOOLEAN homonyme', () => {
  // L'axe reste hors des props, et il détient malgré tout sa clé : la BOOLEAN
  // publierait sous ce nom une prop que `stateModel` décrit déjà comme un axe.
  const definitions = {
    'State#1:1': {
      type: 'VARIANT',
      defaultValue: 'Default',
      variantOptions: ['Default', 'Hover'],
    },
    'State#2:2': { type: 'BOOLEAN', defaultValue: true },
  } as unknown as ComponentPropertyDefinitions;
  const warnings: string[] = [];

  const modele = extractContractPropertyModel(definitions, warnings);

  assert.deepEqual(modele.props, {});
  assert.equal(modele.publicVariantKeyByRawKey.get('state'), 'state');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /leurs noms deviennent identiques une fois normalisés/);
});
