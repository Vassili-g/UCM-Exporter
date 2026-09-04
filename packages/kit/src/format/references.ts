/**
 * La forme d'une référence de token, et les deux gestes qui la posent et
 * l'enlèvent.
 *
 * Elle vit dans le FORMAT et non chez les lecteurs, parce que les deux côtés en
 * ont besoin et que seul le format voyage partout : le moteur la produit dans
 * le bundle du plugin Figma, le validateur la refuse dans Node, et le repo
 * consommateur la déballe dans un navigateur. Une définition qui ne serait
 * atteignable que par les lecteurs obligerait les deux autres à la recopier —
 * ce qu'ils faisaient.
 */

/**
 * Référence complète : la chaîne ENTIÈRE est entre accolades et porte au moins
 * un point séparateur, sans espace ni accolade interne.
 *
 * C'est cet ancrage qui distingue `{components.button.sizes.medium.gap}` d'une
 * phrase écrite par un designer dans `intent`, d'une note comme `{à définir}`,
 * ou d'un texte de maquette qui cite une référence sans en être une.
 */
export const TOKEN_REFERENCE = /^\{[^{}\s]+\.[^{}\s]+\}$/;

/**
 * Vrai si cette valeur est une référence de token, et rien d'autre.
 *
 * C'est l'unique autorité du projet sur cette question. Elle l'est vraiment
 * depuis T2.7 : trois copies de la regex ci-dessus vivaient dans trois paquets,
 * et une divergence entre elles n'aurait pas produit un refus mais un DÉSACCORD
 * — « ce contrat est valide » d'un côté, « ce token n'existe pas » de l'autre —,
 * et ce désaccord-là est muet.
 */
export function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_REFERENCE.test(value);
}

/**
 * Enrobe un nom de token en RÉFÉRENCE de contrat, entre accolades — même
 * convention que les références DTCG de `tokens.json`. Un token cité dans un
 * contrat est toujours un lien vers `tokens.json`, jamais une valeur : les
 * accolades le rendent explicite et le distinguent d'une chaîne littérale.
 * Le chemin lui-même vient de `normalizeName()` — les accolades sont un
 * enrobage, pas un renommage : les deux commandes restent recoupables.
 *
 * @example toRef('components.button.default.background')
 * // → '{components.button.default.background}'
 */
export function toRef(name: string): string {
  return `{${name}}`;
}

/**
 * Chemin nu d'une référence : l'inverse exact de `toRef`. Une chaîne qui n'est
 * pas une référence est rendue telle quelle.
 *
 * Elle est ici et pas ailleurs pour la même raison que `isTokenReference` :
 * déballer les accolades là où la forme n'est pas définie finirait par lire
 * « border} » comme le dernier segment d'un token, et un garde-fou entier se
 * tairait sans un mot.
 *
 * @example refPath('{components.button.default.border}')
 * // → 'components.button.default.border'
 */
export function refPath(reference: string): string {
  return isTokenReference(reference) ? reference.slice(1, -1) : reference;
}
