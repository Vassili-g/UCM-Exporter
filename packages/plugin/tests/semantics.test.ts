import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStateModel,
  defaultRenderingSemantics,
  paintSiteRole,
  renderingSemanticsFor,
  roleKind,
} from '../src/contract/semantics';

test('buildStateModel associe les états connus à leurs déclencheurs et à leur priorité', () => {
  const warnings: string[] = [];
  const model = buildStateModel(
    ['color', 'state'],
    [
      { color: 'primary', state: 'default' },
      { color: 'primary', state: 'hover' },
      { color: 'primary', state: 'focus' },
      { color: 'primary', state: 'press' },
      { color: 'primary', state: 'disable' },
    ],
    warnings,
  );

  assert.deepEqual(model, {
    axis: 'state',
    states: {
      default: {},
      hover: { selector: ':hover' },
      focus: { selector: ':focus-visible' },
      press: { selector: ':active' },
      disable: { selector: '[disabled]' },
    },
    precedence: ['disable', 'press', 'focus', 'hover', 'default'],
  });
  assert.deepEqual(warnings, []);
});

test('buildStateModel conserve un état inconnu et avertit sans bloquer', () => {
  const warnings: string[] = [];
  const model = buildStateModel(['status'], [{ status: 'loading' }, { status: 'default' }], warnings);

  assert.equal(model?.states.loading.selector, undefined);
  assert.deepEqual(model?.precedence, ['default', 'loading']);
  assert.deepEqual(warnings, [
    'Variant property « status » : l\'état « loading » n\'est pas reconnu, le contrat ne dira pas quand l\'afficher. États reconnus : default, hover, focus, press, disable. Renommez cette valeur avec l\'un d\'eux, puis réexportez.',
  ]);
});

test('renderingSemanticsFor nomme le rôle de chaque clé qui n’en porte pas le nom', () => {
  const semantics = renderingSemanticsFor({
    fills: new Map([
      ['title', 'foreground'],
      ['scale-1', 'background'],
      ['glyph', 'icon'],
      // Une clé qui s'appelle comme un rôle mais qui peint autre chose se dit
      // ICI : le vocabulaire partagé, lui, ne bouge dans aucun contrat.
      ['border', 'background'],
      // Une clé dont le rôle porte déjà le nom n'a rien à publier.
      ['background', 'background'],
    ]),
    strokes: new Map([['halo', 'ring'], ['foreground', 'border']]),
  });

  // Le vocabulaire partagé reste strictement celui de tous les contrats.
  assert.deepEqual(semantics.roles, defaultRenderingSemantics().roles);
  // Les clés sont triées : deux exports d'un design inchangé donnent le même
  // JSON, et les deux côtés ne se mélangent jamais — une même clé courte peut
  // désigner deux tokens différents, l'un en peinture, l'autre en contour.
  assert.deepEqual(semantics.keyRoles, {
    fills: { border: 'background', glyph: 'icon', 'scale-1': 'background', title: 'foreground' },
    strokes: { foreground: 'border', halo: 'ring' },
  });
  assert.deepEqual(Object.keys(semantics.keyRoles?.fills ?? {}), [
    'border', 'glyph', 'scale-1', 'title',
  ]);
});

test('un design system dont chaque couleur nomme son rôle publie le vocabulaire partagé, inchangé', () => {
  // Garantie de compatibilité : un composant dont toutes les clés nomment leur
  // rôle ne publie aucun `keyRoles`, et son `rendering` ne bouge pas d'un octet.
  assert.deepEqual(
    renderingSemanticsFor({ fills: new Map(), strokes: new Map() }),
    defaultRenderingSemantics(),
  );
  assert.deepEqual(
    renderingSemanticsFor({ fills: new Map([['background', 'background']]), strokes: new Map() }),
    defaultRenderingSemantics(),
  );
});

test('renderingSemanticsFor range une clé héritée d’Object.prototype comme une autre', () => {
  // Les clés viennent de Figma. Écrite en affectation simple, une variable
  // nommée « __proto__ » fixerait le prototype au lieu d'occuper une clé : le
  // contrat citerait un rendu qu'il ne publie pas.
  const semantics = renderingSemanticsFor({
    fills: new Map([['__proto__', 'foreground']]),
    strokes: new Map(),
  });
  const fills = semantics.keyRoles?.fills as Record<string, unknown>;

  assert.ok(Object.prototype.hasOwnProperty.call(fills, '__proto__'));
  assert.equal(fills.__proto__, 'foreground');
});

test('roleKind répond la nature d’un rôle partagé, et rien pour un autre nom', () => {
  // C'est cette fonction qui empêche le moteur d'avoir un avis : un nom ne peut
  // préciser un rôle que DANS la nature que le calque a déjà tranchée.
  assert.equal(roleKind('background'), 'paint');
  assert.equal(roleKind('ring'), 'stroke');
  assert.equal(roleKind('scale-1'), null);
  assert.equal(roleKind('constructor'), null);
});

test('paintSiteRole lit le calque, jamais le nom du token', () => {
  const role = (site: { isStroke?: boolean; isText?: boolean; isIconTarget?: boolean }) =>
    paintSiteRole({ isStroke: false, isText: false, isIconTarget: false, ...site });

  assert.equal(role({ isText: true }), 'foreground');
  assert.equal(role({ isIconTarget: true }), 'icon');
  assert.equal(role({}), 'background');
  // Un contour se rend en bordure ; c'est `align`, déjà publié sur la feuille,
  // qui dira au consommateur de le dessiner en box-shadow. Le contrat n'a pas
  // à deviner un « ring ».
  assert.equal(role({ isStroke: true }), 'border');
  // Même priorité que `semanticSlotName` : le texte d'abord, l'icône ensuite.
  assert.equal(role({ isText: true, isIconTarget: true }), 'foreground');
});

test('defaultRenderingSemantics publie le vocabulaire de rendu partagé', () => {
  assert.deepEqual(defaultRenderingSemantics(), {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color', 'fill'] },
      icon: { kind: 'paint', cssProperties: ['color', 'fill'] },
      // Un stroke Figma se dessine hors du flux : le rendre en bordure CSS
      // élargirait la boîte et décalerait tout le contenu du composant.
      border: { kind: 'stroke', cssProperties: ['box-shadow'] },
      ring: {
        kind: 'stroke',
        cssProperties: ['outline-color', 'outline-width'],
        fallback: 'box-shadow',
      },
    },
  });
});

test('un état homonyme d’Object.prototype reste un état comme un autre', () => {
  const warnings: string[] = [];
  const model = buildStateModel(
    ['state'],
    [{ state: 'default' }, { state: 'constructor' }, { state: '__proto__' }],
    warnings,
  );

  // « __proto__ » fixait le prototype de `states` au lieu d'y occuper une clé,
  // alors que `precedence` se construit depuis les valeurs : le contrat citait
  // un état qu'il ne décrivait nulle part.
  assert.deepEqual(Object.keys(model!.states), ['default', 'constructor', '__proto__']);
  assert.deepEqual(
    model!.precedence.filter(
      (state) => !Object.prototype.hasOwnProperty.call(model!.states, state),
    ),
    [],
    'precedence ne doit citer aucun état absent de states',
  );

  // « constructor » appartient à Object.prototype : la lecture du déclencheur
  // le tenait pour inconnu (déclencheur nul) pendant que l'avertissement le
  // tenait pour connu, et le designer n'apprenait donc rien.
  assert.deepEqual(
    warnings.filter((warning) => warning.includes('constructor')).length,
    1,
  );
  assert.equal(warnings.filter((warning) => warning.includes('__proto__')).length, 1);
});
