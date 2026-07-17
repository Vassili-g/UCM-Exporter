import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStateModel, defaultRenderingSemantics } from '../src/contract/semantics';

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
  assert.deepEqual(warnings, ['Axe d\'état « status » : état « loading » sans déclencheur connu.']);
});

test('defaultRenderingSemantics publie le vocabulaire de rendu partagé', () => {
  assert.deepEqual(defaultRenderingSemantics(), {
    roles: {
      background: { kind: 'paint', cssProperties: ['background-color'] },
      foreground: { kind: 'paint', cssProperties: ['color', 'fill'] },
      border: { kind: 'stroke', cssProperties: ['border-color', 'border-width'] },
      ring: {
        kind: 'stroke',
        cssProperties: ['outline-color', 'outline-width'],
        fallback: 'box-shadow',
      },
    },
  });
});
