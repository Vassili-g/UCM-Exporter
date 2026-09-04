/**
 * Version du schéma de contrat : l'unique endroit où elle est écrite, et
 * l'unique endroit qui sache où elle se relit dans un contrat.
 *
 * À incrémenter à chaque changement de FORME du JSON, avec la spécification,
 * les fixtures et les consommateurs dans le même changement.
 * La forme courante est décrite par UCM-EXPORTER-SPEC.md et `types.ts` ;
 * ce qui a changé d'une version à l'autre se lit dans Git.
 *
 * Ce module ne dépend de RIEN — ni de Figma, ni de Node. C'est ce qui permet
 * au générateur de schéma de la lire sans tirer les vingt modules du moteur
 * d'extraction, et au bundle du plugin de la porter sans rien d'autre.
 */
export const CONTRACT_VERSION = '12.0';

/**
 * La version de schéma que porte un contrat déjà analysé, telle qu'elle y est
 * écrite.
 *
 * **Pourquoi une fonction pour un accès à deux niveaux.** Ce module est le seul
 * endroit où la version courante est ÉCRITE ; il devient ici le seul endroit
 * qui sache OÙ elle se relit. Les deux moitiés de la même règle vivaient dans
 * des paquets qui ne partagent aucun runtime : le producteur écrit
 * `meta.contractVersion`, le contrôle du repository l'y relit à la main, et le
 * corps de la pull request l'y annonce (T4.2). Trois lectures du même champ,
 * dont le désaccord serait muet — c'est la maladie que T4.1 et T4.3 ont
 * refermée ailleurs, et c'est la même réponse : la règle du FORMAT vit dans le
 * format.
 *
 * **Elle ne juge pas, et c'est délibéré.** Une valeur présente mais informe —
 * `"douze"` — est rendue telle quelle. Dire si une version est lisible, et si
 * elle tombe dans la fenêtre que ce repository sait lire, appartient à
 * `verdictDeVersion`, seul à connaître cette fenêtre. Reproduire ici la
 * grammaire `majeure.mineure` créerait la seconde autorité que cette fonction
 * existe pour supprimer. `null` ne dit donc qu'une chose : le champ est absent,
 * ou n'est pas du texte utilisable.
 *
 * Comme `comparerIdentiteDeContrat`, elle reçoit du JSON DÉJÀ analysé et ne
 * lève jamais : un garde-fou qui explose sur une entrée douteuse ne garde plus
 * rien.
 */
export function versionDeContrat(brut: unknown): string | null {
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const meta = (brut as { meta?: unknown }).meta;
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const version = (meta as { contractVersion?: unknown }).contractVersion;
  return typeof version === 'string' && version.trim() !== '' ? version : null;
}
