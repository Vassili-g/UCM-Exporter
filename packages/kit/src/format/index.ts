/**
 * Le format de contrat, et rien d'autre.
 *
 * Ce sous-chemin ne dépend de RIEN : ni de Node, ni de Figma, ni d'un paquet
 * tiers. Ce n'est pas une élégance, c'est une contrainte à deux clients.
 *
 * 1. Le plugin est bundlé pour le sandbox Figma, où `node:fs` n'existe pas.
 *    Un seul `import` de Node ici casserait le bundle, et l'erreur
 *    n'apparaîtrait qu'au chargement du plugin dans Figma — après le build,
 *    après la CI.
 * 2. Le Playground consomme la même projection depuis du code navigateur,
 *    passé par Vite.
 *
 * Les LECTEURS du format — validateurs, rapport, résolution de vues — vivent
 * ailleurs dans ce paquet : ils utilisent `ajv` et `node:fs`, et n'ont donc
 * rien à faire dans un bundle de plugin.
 *
 * Ce que ce module publie est exactement ce dont les deux côtés ont besoin
 * pour parler du même format : sa forme, sa version, et les deux règles de
 * nommage qui font qu'un même objet porte le même nom des deux côtés.
 */
export type * from './types';
export { CONTRACT_VERSION } from './version';
export { codeIdentifier, normalizeName } from './names';
