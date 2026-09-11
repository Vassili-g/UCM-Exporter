/**
 * Version du schéma de contrat : l'unique endroit où elle est écrite, et
 * l'unique endroit qui sache où elle se relit dans un contrat.
 *
 * À incrémenter à chaque changement de forme du JSON, avec la spécification,
 * les fixtures et les consommateurs dans le même changement.
 * La forme courante est décrite par docs/FORMAT.md et `types.ts` ; ce que
 * chaque version a publié, et ce que la suivante casse, par
 * docs/CHANGELOG-FORMAT.md, où une entrée se rédige quand la version est
 * adoptée.
 *
 * Ce module ne dépend de rien, ni de Figma, ni de Node. C'est ce qui permet
 * au générateur de schéma de la lire sans tirer les vingt modules du moteur
 * d'extraction, et au bundle du plugin de la porter sans rien d'autre.
 */
export const CONTRACT_VERSION = '13.0';

/**
 * La version de schéma que porte un contrat déjà analysé, telle qu'elle y est
 * écrite. Cette fonction centralise l'emplacement `meta.contractVersion`, mais
 * ne juge pas sa syntaxe ni sa compatibilité ; elle rend `null` si le champ est
 * absent ou inutilisable et ne lève jamais sur du JSON douteux.
 */
export function versionDeContrat(brut: unknown): string | null {
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const meta = (brut as { meta?: unknown }).meta;
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const version = (meta as { contractVersion?: unknown }).contractVersion;
  return typeof version === 'string' && version.trim() !== '' ? version : null;
}
