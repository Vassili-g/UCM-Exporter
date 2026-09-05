/**
 * Ce qu'un nom de graisse Figma vaut, en poids CSS.
 *
 * **Pourquoi cette table appartient au FORMAT et non à un preset.** Figma
 * exporte la graisse comme un NOM de style — « SemiBold » —, et le format
 * l'écrit tel quel : `TypographyTokens.fontWeight` est une chaîne, jamais un
 * nombre. Traduire ce nom est donc une connaissance du format, pas d'une
 * plateforme. Un preset iOS a exactement le même besoin, avec une projection
 * de sortie différente : la TABLE se partage, la projection ne se partage pas.
 * C'est la coupure de T6.1, et c'est celle que T6.0 avait déjà faite pour le
 * nom d'une variable CSS — pour la raison qui avait coûté quatre tokens :
 * deux exemplaires d'une même règle divergent en silence.
 *
 * **Ce que la table n'est pas.** Elle ne dit pas ce qu'un design system DOIT
 * nommer, et elle n'invente rien : un nom qu'elle ne connaît pas n'est pas une
 * faute, c'est un nom qu'elle ne sait pas traduire — `poidsDeGraisse` rend
 * alors `null`, et l'appelant décide. Refuser à sa place ferait de cette table
 * une seconde autorité sur ce qu'un token a le droit de valoir.
 *
 * Les noms sont ceux des graisses standard, dans les deux conventions que
 * Figma produit selon les fontes (`ExtraLight` / `UltraLight`). La
 * comparaison ignore la casse et les séparateurs : « Semi Bold », « semi-bold »
 * et « semibold » tombent sur la même entrée.
 */

/** Noms de graisse connus → poids CSS, clés déjà normalisées. */
const POIDS_PAR_NOM: Readonly<Record<string, number>> = {
  thin: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

/**
 * La forme sous laquelle un nom de graisse se compare.
 *
 * Minuscules, et tout ce qui n'est ni lettre ni chiffre retiré. La règle est
 * volontairement plus simple que celle de `tokenCssVariable` : ici on ne
 * fabrique aucun identifiant, on rapproche deux écritures du même mot.
 */
function cleDeGraisse(nom: string): string {
  return nom.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Le poids CSS d'un nom de graisse Figma, ou `null` s'il est inconnu.
 *
 * Rend `null` plutôt que de lever ou de replier sur 400 : un nom inconnu est
 * une information — le design system emploie un vocabulaire que cette table ne
 * couvre pas —, et la traiter comme « normal » la ferait disparaître.
 */
export function poidsDeGraisse(nom: unknown): number | null {
  if (typeof nom !== 'string') return null;
  return POIDS_PAR_NOM[cleDeGraisse(nom)] ?? null;
}

/** Les noms de graisse que cette table sait traduire, forme normalisée. */
export function nomsDeGraisseConnus(): string[] {
  return Object.keys(POIDS_PAR_NOM);
}
