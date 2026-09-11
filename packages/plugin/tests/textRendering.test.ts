/** Traduction en CSS des propriétés de texte sans variable, style et calque. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  litterauxDuStyle,
  tronqueSansMaxLines,
  usageDuCalque,
} from '../src/contract/textRendering';

/** Un text style aux valeurs par défaut de Figma. */
const style = (extra: Record<string, unknown> = {}) => ({
  type: 'TEXT',
  name: 'Label/Large',
  textCase: 'ORIGINAL',
  textDecoration: 'NONE',
  textWrapStyle: 'AUTO',
  leadingTrim: 'NONE',
  fontName: { family: 'Inter', style: 'Regular' },
  ...extra,
}) as unknown as TextStyle;

/** Un calque texte aux valeurs par défaut de Figma. */
const calque = (extra: Record<string, unknown> = {}) => ({
  type: 'TEXT',
  name: 'Label',
  textAlignHorizontal: 'LEFT',
  textAlignVertical: 'TOP',
  textTruncation: 'DISABLED',
  maxLines: null,
  textAutoResize: 'WIDTH_AND_HEIGHT',
  maxHeight: null,
  ...extra,
}) as unknown as TextNode;

test('un text style aux valeurs par défaut de Figma ne publie aucune clé de literals', () => {
  assert.deepEqual(litterauxDuStyle(style(), false), {});
});

test('textCase se publie dans text-transform, et dans font-variant-caps pour les petites capitales', () => {
  assert.deepEqual(litterauxDuStyle(style({ textCase: 'UPPER' }), false), {
    textTransform: 'uppercase',
  });
  assert.deepEqual(litterauxDuStyle(style({ textCase: 'LOWER' }), false), {
    textTransform: 'lowercase',
  });
  assert.deepEqual(litterauxDuStyle(style({ textCase: 'TITLE' }), false), {
    textTransform: 'capitalize',
  });
  // `text-transform: uppercase` rendrait des capitales de taille normale.
  assert.deepEqual(litterauxDuStyle(style({ textCase: 'SMALL_CAPS' }), false), {
    fontVariantCaps: 'small-caps',
  });
  assert.deepEqual(litterauxDuStyle(style({ textCase: 'SMALL_CAPS_FORCED' }), false), {
    fontVariantCaps: 'all-small-caps',
  });
});

test('textDecoration, textWrapStyle et leadingTrim se traduisent en CSS', () => {
  assert.deepEqual(
    litterauxDuStyle(style({
      textDecoration: 'UNDERLINE',
      textWrapStyle: 'BALANCE',
      leadingTrim: 'CAP_HEIGHT',
    }), false),
    {
      textDecorationLine: 'underline',
      textWrapStyle: 'balance',
      textBox: 'trim-both cap alphabetic',
    },
  );
  assert.deepEqual(
    litterauxDuStyle(style({ textDecoration: 'STRIKETHROUGH', textWrapStyle: 'PRETTY' }), false),
    { textDecorationLine: 'line-through', textWrapStyle: 'pretty' },
  );
});

test('fontStyle vaut italic pour un style de police italique, sauf si tokens.fontWeight cite la variable de fontStyle', () => {
  const italique = style({ fontName: { family: 'Inter', style: 'Bold Italic' } });
  assert.deepEqual(litterauxDuStyle(italique, false), { fontStyle: 'italic' });
  // `tokens.fontWeight` cite alors une variable qui vaut « Bold Italic » :
  // l'italique y est déjà.
  assert.deepEqual(litterauxDuStyle(italique, true), {});
});

test('un calque texte aux valeurs par défaut de Figma ne publie aucun champ d’usage', () => {
  assert.deepEqual(usageDuCalque(calque()), {});
});

test('textAlignHorizontal et textAlignVertical se traduisent en CSS', () => {
  assert.deepEqual(
    usageDuCalque(calque({ textAlignHorizontal: 'CENTER', textAlignVertical: 'CENTER' })),
    { textAlign: 'center', alignContent: 'center' },
  );
  assert.deepEqual(
    usageDuCalque(calque({ textAlignHorizontal: 'RIGHT', textAlignVertical: 'BOTTOM' })),
    { textAlign: 'right', alignContent: 'end' },
  );
  assert.deepEqual(usageDuCalque(calque({ textAlignHorizontal: 'JUSTIFIED' })), {
    textAlign: 'justify',
  });
});

test('lineClamp et textOverflow ne sont publiés qu’avec maxLines, sous textTruncation ENDING', () => {
  // L'API le documente : `maxLines` n'agit que sous `ENDING`. Publié seul, il
  // ferait couper par le développeur un texte que Figma affiche en entier.
  assert.deepEqual(usageDuCalque(calque({ maxLines: 2 })), {});
  // `text-overflow: ellipsis` seul ne coupe qu'une ligne, et ne rend pas la
  // coupure de Figma à la taille de la boîte.
  assert.deepEqual(usageDuCalque(calque({ textTruncation: 'ENDING' })), {});
  assert.deepEqual(usageDuCalque(calque({ textTruncation: 'ENDING', maxLines: 2 })), {
    lineClamp: 2,
    textOverflow: 'ellipsis',
  });
});

test('tronqueSansMaxLines est vrai seulement quand Figma coupe à la taille de la boîte', () => {
  const tronque = (extra: Record<string, unknown>) =>
    tronqueSansMaxLines(calque({ textTruncation: 'ENDING', ...extra }));
  assert.equal(tronque({ textAutoResize: 'NONE' }), true);
  assert.equal(tronque({ textAutoResize: 'TRUNCATE' }), true);
  assert.equal(tronque({ textAutoResize: 'HEIGHT', maxHeight: 40 }), true);
  // Sous `HEIGHT` sans `maxHeight`, la boîte grandit avec le texte : rien n'est coupé.
  assert.equal(tronque({ textAutoResize: 'HEIGHT' }), false);
  assert.equal(tronque({ textAutoResize: 'NONE', maxLines: 2 }), false);
  assert.equal(tronqueSansMaxLines(calque({ textAutoResize: 'NONE' })), false);
});
