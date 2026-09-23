/**
 * Traduit en CSS les propriétés de texte que Figma ne relie à aucune variable.
 *
 * Les propriétés du text style valent pour tous les calques qui l'emploient :
 * `TextStyleDefinition.literals` les publie. Les propriétés du calque texte ne
 * valent que pour lui : son `TextStyleUse` les publie. Une propriété à sa valeur
 * par défaut dans Figma ne produit rien. Les fonctions sont pures : elles ne
 * lisent qu'un objet Figma.
 */
import { estStyleItalique } from '@ucm-kit/core/format';
import type { TextStyleLiterals, TextStyleUse } from '@ucm-kit/core/format';

type Litteral<Champ extends keyof TextStyleLiterals> = NonNullable<TextStyleLiterals[Champ]>;

/** Les champs d'un `TextStyleUse` lus sur le calque texte. */
export type UsageDuCalque = Omit<TextStyleUse, 'slotPath' | 'style'>;

const TEXT_TRANSFORM_PAR_TEXT_CASE: Partial<Record<TextCase, Litteral<'textTransform'>>> = {
  UPPER: 'uppercase',
  LOWER: 'lowercase',
  TITLE: 'capitalize',
};

// `SMALL_CAPS` rend des petites capitales. `text-transform: uppercase` rendrait
// des capitales de taille normale : ces deux valeurs de `textCase` vont donc
// dans `font-variant-caps`.
const FONT_VARIANT_CAPS_PAR_TEXT_CASE: Partial<Record<TextCase, Litteral<'fontVariantCaps'>>> = {
  SMALL_CAPS: 'small-caps',
  SMALL_CAPS_FORCED: 'all-small-caps',
};

const TEXT_DECORATION_LINE_PAR_TEXT_DECORATION: Partial<Record<
  TextDecoration,
  Litteral<'textDecorationLine'>
>> = {
  UNDERLINE: 'underline',
  STRIKETHROUGH: 'line-through',
};

const TEXT_WRAP_STYLE_PAR_TEXT_WRAP_STYLE: Partial<Record<
  TextWrapStyle,
  Litteral<'textWrapStyle'>
>> = {
  BALANCE: 'balance',
  PRETTY: 'pretty',
};

const TEXT_ALIGN_PAR_TEXT_ALIGN_HORIZONTAL: Partial<Record<
  TextNode['textAlignHorizontal'],
  NonNullable<UsageDuCalque['textAlign']>
>> = {
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFIED: 'justify',
};

const ALIGN_CONTENT_PAR_TEXT_ALIGN_VERTICAL: Partial<Record<
  TextNode['textAlignVertical'],
  NonNullable<UsageDuCalque['alignContent']>
>> = {
  CENTER: 'center',
  BOTTOM: 'end',
};

/**
 * Les propriétés du style que `litterauxDuStyle` publie et qu'un calque peut
 * modifier. `libelle` reprend l'intitulé du panneau de typographie de Figma.
 */
export const PROPRIETES_LITTERALES = [
  { propriete: 'textCase', libelle: 'letter case' },
  { propriete: 'textDecoration', libelle: 'decoration' },
  { propriete: 'textWrapStyle', libelle: 'text wrap' },
  { propriete: 'leadingTrim', libelle: 'vertical trim' },
] as const;

/**
 * Les `literals` d'un text style.
 *
 * `fontWeightCiteFontStyle` vaut vrai quand `tokens.fontWeight` cite la variable
 * reliée à `fontStyle`. Cette variable vaut un style de police entier, « Bold
 * Italic » par exemple : `fontStyle` n'est alors pas publié. Une variable
 * reliée à `fontWeight` est lue en premier et ne porte que la graisse.
 */
export function litterauxDuStyle(
  style: TextStyle,
  fontWeightCiteFontStyle: boolean,
): TextStyleLiterals {
  const literals: TextStyleLiterals = {};
  const textTransform = TEXT_TRANSFORM_PAR_TEXT_CASE[style.textCase];
  if (textTransform) literals.textTransform = textTransform;
  const fontVariantCaps = FONT_VARIANT_CAPS_PAR_TEXT_CASE[style.textCase];
  if (fontVariantCaps) literals.fontVariantCaps = fontVariantCaps;
  const textDecorationLine = TEXT_DECORATION_LINE_PAR_TEXT_DECORATION[style.textDecoration];
  if (textDecorationLine) literals.textDecorationLine = textDecorationLine;
  if (!fontWeightCiteFontStyle && estStyleItalique(style.fontName?.style)) {
    literals.fontStyle = 'italic';
  }
  const textWrapStyle = TEXT_WRAP_STYLE_PAR_TEXT_WRAP_STYLE[style.textWrapStyle];
  if (textWrapStyle) literals.textWrapStyle = textWrapStyle;
  // `CAP_HEIGHT` retire l'espace au-dessus des capitales et sous la ligne de
  // base, comme `text-box: trim-both cap alphabetic`.
  if (style.leadingTrim === 'CAP_HEIGHT') literals.textBox = 'trim-both cap alphabetic';
  return literals;
}

/** Vrai si le calque coupe son texte après un nombre de lignes fixé. */
function coupeApresMaxLines(textNode: TextNode): boolean {
  return textNode.textTruncation === 'ENDING'
    && typeof textNode.maxLines === 'number'
    && textNode.maxLines >= 1;
}

/**
 * Les champs d'usage lus sur le calque texte.
 *
 * L'alignement est publié même dans une boîte en `Hug`, où il place chaque ligne
 * d'un texte qui en compte plusieurs. La troncature n'est publiée qu'avec
 * `maxLines`, que `line-clamp` rend à l'identique. Sans `maxLines`,
 * `tronqueSansMaxLines` dit si elle manque au contrat.
 */
export function usageDuCalque(textNode: TextNode): UsageDuCalque {
  const usage: UsageDuCalque = {};
  const textAlign = TEXT_ALIGN_PAR_TEXT_ALIGN_HORIZONTAL[textNode.textAlignHorizontal];
  if (textAlign) usage.textAlign = textAlign;
  const alignContent = ALIGN_CONTENT_PAR_TEXT_ALIGN_VERTICAL[textNode.textAlignVertical];
  if (alignContent) usage.alignContent = alignContent;
  if (coupeApresMaxLines(textNode)) {
    usage.lineClamp = textNode.maxLines as number;
    usage.textOverflow = 'ellipsis';
  }
  return usage;
}

/**
 * Vrai quand Figma coupe le texte à la taille de sa boîte, sans `maxLines`.
 *
 * La documentation de `textTruncation` borne ce cas : la coupure agit sous
 * `textAutoResize` `NONE` ou `TRUNCATE`, ou quand un `maxHeight` borne la
 * hauteur. `text-overflow: ellipsis` ne coupe qu'une ligne, et aucun champ du
 * contrat ne rend cette coupure.
 */
export function tronqueSansMaxLines(textNode: TextNode): boolean {
  if (textNode.textTruncation !== 'ENDING' || coupeApresMaxLines(textNode)) return false;
  return textNode.textAutoResize === 'NONE'
    || textNode.textAutoResize === 'TRUNCATE'
    || typeof textNode.maxHeight === 'number';
}
