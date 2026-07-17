import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeIconRules } from '../src/contract/exportComponent';

test('mergeIconRules lie une icône modifiable à son nom Figma exact', () => {
  const props = { iconLeft: { type: 'boolean' as const, default: false } };
  const children = [{
    slot: 'arrow-left-long',
    figmaLayer: 'arrow-left-long',
    optional: true,
    visibilityProp: 'iconLeft',
  }];
  const warnings: string[] = [];

  const icons = mergeIconRules(
    props,
    children,
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {
    arrowLeftLong: {
      policy: 'modifiable',
      figmaName: 'arrow-left-long',
      visibilityProp: 'iconLeft',
      runtimeProp: 'iconLeftName',
    },
  });
  assert.deepEqual(props, {
    iconLeft: { type: 'boolean', default: false },
    iconLeftName: {
      type: 'icon',
      default: null,
      policy: 'modifiable',
      visibilityProp: 'iconLeft',
    },
  });
  assert.deepEqual(children, [{
    slot: 'arrow-left-long',
    figmaLayer: 'arrow-left-long',
    optional: true,
    visibilityProp: 'iconLeft',
  }]);
  assert.deepEqual(warnings, []);
});

test('mergeIconRules exporte une icône stricte sans créer de prop', () => {
  const children = [{ slot: 'fa-warning', figmaLayer: 'fa-warning', optional: true }];
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    children,
    [{ iconName: 'fa-warning', policy: 'strict' }],
    warnings,
  );

  assert.deepEqual(icons, {
    faWarning: { policy: 'strict', figmaName: 'fa-warning' },
  });
  assert.deepEqual(warnings, []);
});

test('mergeIconRules avertit au lieu de deviner un calque graphique', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [{ slot: 'arrow-left-long', figmaLayer: 'arrow-left-long', optional: true }],
    [{ iconName: 'arrow-right-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {});
  assert.deepEqual(warnings, ['@icons « arrow-right-long » : aucun calque graphique de ce nom.']);
});

test('mergeIconRules avertit lorsqu une icône modifiable n est liée à aucun booléen Figma', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [{ slot: 'arrow-left-long', figmaLayer: 'arrow-left-long', optional: true }],
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {
    arrowLeftLong: { policy: 'modifiable', figmaName: 'arrow-left-long' },
  });
  assert.deepEqual(warnings, [
    '@icons « arrow-left-long » modifiable : le calque doit lier « visible » à une prop BOOLEAN Figma pour exposer une prop runtime.',
  ]);
});
