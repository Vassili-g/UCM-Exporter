import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStateModel,
  defaultRenderingSemantics,
  paintSiteRole,
  renderingSemanticsFor,
  variantRoleWarnings,
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
      default: { selector: null },
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

  assert.equal(model?.states.loading.selector, null);
  assert.deepEqual(model?.precedence, ['default', 'loading']);
  assert.deepEqual(warnings, [
    'Variant property « status » : l\'état « loading » n\'est pas reconnu, le contrat ne dira pas quand l\'afficher. États reconnus : default, hover, focus, press, disable.',
  ]);
});

test('variantRoleWarnings reste muet quand tous les rôles sont rendables', () => {
  const warnings = variantRoleWarnings(
    {
      primary: {
        contained: {
          default: { background: '{c.primary.contained.default.background}', foreground: '{c.primary.contained.default.foreground}' },
          hover: { background: '{c.primary.contained.hover.background}' },
        },
      },
    },
    {
      primary: {
        contained: {
          default: {},
          focus: { ring: { color: '{c.primary.contained.focus.ring}', width: '{l.stroke.ring}', align: 'outside' } },
        },
      },
    },
  );

  assert.deepEqual(warnings, []);
});

test('variantRoleWarnings ne réclame plus qu’une clé nomme son rôle', () => {
  // Ce message demandait de renommer le token pour qu'il se termine par un
  // rôle, alors que rien ne l'exige : le rendu se déduit du calque et se publie
  // dans `rendering.roles`.
  const warnings = variantRoleWarnings(
    {
      primary: {
        default: { bg: '{c.primary.default.bg}', 'scale-1': '{c.primary.default.scale-1}' },
        hover: { bg: '{c.primary.hover.bg}' },
      },
      secondary: {
        default: { bg: '{c.secondary.default.bg}' },
      },
    },
    {},
  );

  assert.deepEqual(warnings, []);
});

test('renderingSemanticsFor publie le rendu des clés sans rôle, après les rôles partagés', () => {
  const semantics = renderingSemanticsFor(new Map([
    ['title', 'foreground'],
    ['scale-1', 'background'],
    ['glyph', 'icon'],
    // Une clé qui nomme déjà un rôle partagé garde le rendu publié pour tous :
    // deux contrats ne doivent pas diverger sur le sens du même mot.
    ['border', 'background'],
  ]));

  // Les cinq rôles partagés d'abord, dans leur ordre fixe, puis les clés
  // déduites triées : deux exports d'un design inchangé donnent le même JSON.
  assert.deepEqual(Object.keys(semantics.roles), [
    'background', 'foreground', 'icon', 'border', 'ring',
    'glyph', 'scale-1', 'title',
  ]);
  assert.deepEqual(semantics.roles['scale-1'], { kind: 'paint', cssProperties: ['background-color'] });
  assert.deepEqual(semantics.roles.title, { kind: 'paint', cssProperties: ['color', 'fill'] });
  assert.deepEqual(semantics.roles.border, { kind: 'stroke', cssProperties: ['border-color', 'border-width'] });
});

test('un design system dont chaque couleur nomme son rôle publie le vocabulaire partagé, inchangé', () => {
  // Garantie de compatibilité : Alert, Button, TileLink et le corpus n'ont que
  // des clés qui nomment un rôle. Leur `rendering` ne doit pas bouger d'un
  // octet, sans quoi ce changement imposerait un réexport Figma.
  assert.deepEqual(renderingSemanticsFor(new Map()), defaultRenderingSemantics());
});

test('renderingSemanticsFor range une clé héritée d’Object.prototype comme une autre', () => {
  // Les clés viennent de Figma. Écrite en affectation simple, une variable
  // nommée « __proto__ » fixerait le prototype au lieu d'occuper une clé : le
  // contrat citerait un rendu qu'il ne publie pas.
  const semantics = renderingSemanticsFor(new Map([['__proto__', 'background']]));

  assert.ok(Object.prototype.hasOwnProperty.call(semantics.roles, '__proto__'));
  assert.deepEqual(
    (semantics.roles as Record<string, unknown>).__proto__,
    { kind: 'paint', cssProperties: ['background-color'] },
  );
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

test('variantRoleWarnings signale un rôle connu employé sur le mauvais support', () => {
  const warnings = variantRoleWarnings(
    // « border » est déclaré « stroke » : posé en remplissage, il ne sera pas rendu.
    { primary: { default: { border: '{c.primary.default.border}' } } },
    // « background » est déclaré « paint » : posé en contour, même conséquence.
    { primary: { default: { background: { color: '{c.primary.default.background}', width: null, align: 'inside' } } } },
  );

  assert.deepEqual(warnings, [
    'Token {c.primary.default.background} : son dernier segment « background » désigne un fill, mais il est appliqué en stroke. Rien ne sera affiché (sur 1 layer). Appliquez-le du bon côté dans Figma, ou renommez-le.',
    'Token {c.primary.default.border} : son dernier segment « border » désigne un stroke, mais il est appliqué en fill. Rien ne sera affiché (sur 1 layer). Appliquez-le du bon côté dans Figma, ou renommez-le.',
  ]);
});

test('le garde-fou survit à une clé allongée : il lit le token, pas la clé', () => {
  // `userinput.border` ne nomme aucun rôle partagé. Lu sur la clé de l'arbre,
  // ce garde-fou se tairait pour toutes les couleurs d'un composant à surfaces
  // multiples — exactement celles qui en ont le plus besoin.
  const warnings = variantRoleWarnings(
    { default: { 'userinput.border': '{c.userinput.colors.border}' } },
    {},
  );

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\{c\.userinput\.colors\.border\}/);
  assert.match(warnings[0], /« border » désigne un stroke/);
});

test('defaultRenderingSemantics publie le vocabulaire de rendu partagé', () => {
  assert.deepEqual(defaultRenderingSemantics(), {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color', 'fill'] },
      icon: { kind: 'paint', cssProperties: ['color', 'fill'] },
      border: { kind: 'stroke', cssProperties: ['border-color', 'border-width'] },
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
