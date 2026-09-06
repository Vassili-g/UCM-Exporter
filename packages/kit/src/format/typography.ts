/**
 * Traduit les noms de graisse Figma en poids CSS, au niveau du format afin que
 * toutes les cibles partagent la table. La comparaison ignore casse et
 * séparateurs. Un nom inconnu n'est pas fautif : `poidsDeGraisse` rend `null`.
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
