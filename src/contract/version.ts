/**
 * Version du schéma de contrat, et unique endroit où elle est écrite.
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
