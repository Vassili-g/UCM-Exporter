import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStateModel,
  defaultRenderingSemantics,
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

test('variantRoleWarnings agrège un rôle inconnu en UN seul message, avec un exemple', () => {
  // Le même calque mal nommé revient dans chaque variante : 3 occurrences ici,
  // 30 sur un vrai Button. Le journal doit rester lisible.
  const warnings = variantRoleWarnings(
    {
      primary: {
        default: { bg: '{c.primary.default.bg}' },
        hover: { bg: '{c.primary.hover.bg}' },
      },
      secondary: {
        default: { bg: '{c.secondary.default.bg}' },
      },
    },
    {},
  );

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^Token \{c\..* : son dernier segment « bg » n’indique pas/);
  assert.match(warnings[0], /sur 3 layers/);
  // Le message nomme le geste correctif : les segments attendus dans Figma.
  assert.match(warnings[0], /background, foreground, icon, border, ring\.$/);
});

test('variantRoleWarnings signale un rôle connu employé sur le mauvais support', () => {
  const warnings = variantRoleWarnings(
    // « border » est déclaré « stroke » : posé en remplissage, il ne sera pas rendu.
    { primary: { default: { border: '{c.primary.default.border}' } } },
    // « background » est déclaré « paint » : posé en contour, même conséquence.
    { primary: { default: { background: { color: '{c.primary.default.background}', width: null, align: 'inside' } } } },
  );

  assert.deepEqual(warnings, [
    'Token {c.primary.default.background} : son dernier segment « background » désigne un fill, mais il est appliqué en stroke — rien ne sera affiché (sur 1 layer). Appliquez-le du bon côté dans Figma, ou renommez-le.',
    'Token {c.primary.default.border} : son dernier segment « border » désigne un stroke, mais il est appliqué en fill — rien ne sera affiché (sur 1 layer). Appliquez-le du bon côté dans Figma, ou renommez-le.',
  ]);
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
