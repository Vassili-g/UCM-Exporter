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
 * pour parler du même format : sa forme, sa version, les TROIS règles de
 * nommage qui font qu'un même objet porte le même nom partout — vers le token,
 * vers le code, vers la variable CSS —, la forme d'une référence de token,
 * celle que le moteur pose et que le validateur exige, la grammaire de
 * `ucm.config.json`, que la CI ouvre sur un disque et que le plugin lit par
 * l'API GitHub, et la question « ces deux contrats décrivent-ils le même
 * composant ? », que le producteur pose avant d'écrire et qu'un lecteur pourra
 * poser après.
 */
/*
 * Les extensions `.js` sont obligatoires, pas décoratives : `tsc` recopie le
 * spécificateur tel quel, et Node en ESM refuse un import relatif sans
 * extension. Sans elles, le paquet fonctionne chez qui passe par un bundler ou
 * par `tsx` — donc dans tout ce repository — et casse net chez le premier
 * consommateur qui l'exécute avec Node. `paquetPublie.test.mjs` le vérifie.
 */
export type * from './types.js';
export { CONTRACT_VERSION, versionDeContrat } from './version.js';
export { codeIdentifier, normalizeName, tokenCssVariable } from './names.js';
export { TOKEN_REFERENCE, isTokenReference, refPath, toRef } from './references.js';
export { comparerIdentiteDeContrat } from './identite.js';
export type { ArbitreIdentite, VerdictIdentite } from './identite.js';
export {
  NOM_CONFIGURATION,
  MOTIF_IMPLEMENTATION_PAR_DEFAUT,
  CONFIGURATION_PAR_DEFAUT,
  champsInvalidesDeLaConfiguration,
  configurationDepuisJson,
} from './configuration.js';
export type { ConfigurationRepository } from './configuration.js';
