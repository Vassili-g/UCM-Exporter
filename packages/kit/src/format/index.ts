/**
 * Le format de contrat, et rien d'autre.
 *
 * Ce sous-chemin ne dépend de rien : ni de Node, ni de Figma, ni d'un paquet
 * tiers. Deux clients l'exigent.
 *
 * 1. Le plugin est bundlé pour le sandbox Figma, où `node:fs` n'existe pas.
 *    Un seul `import` de Node ici casserait le bundle, et l'erreur
 *    n'apparaîtrait qu'au chargement du plugin dans Figma : après le build,
 *    après la CI.
 * 2. Le Playground consomme la même projection depuis du code navigateur,
 *    passé par Vite.
 *
 * Les lecteurs du format (validateurs, rapport, résolution de vues) vivent
 * ailleurs dans ce paquet : ils utilisent `ajv` et `node:fs`, et n'ont donc
 * rien à faire dans un bundle de plugin.
 *
 * Ce que ce module publie est exactement ce dont les deux côtés ont besoin
 * pour parler du même format : sa forme, sa version, les trois règles de
 * nommage qui font qu'un même objet porte le même nom partout (vers le token,
 * vers le code, vers la variable CSS), la forme d'une référence de token,
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
 * par `tsx` (donc dans tout ce repository) et casse net chez le premier
 * consommateur qui l'exécute avec Node. `paquetPublie.test.mjs` le vérifie.
 */
export type * from './types.js';
export { CONTRACT_VERSION, versionDeContrat } from './version.js';
export {
  EXTENSION_VERSION_TOKENS,
  TOKENS_FORMAT_VERSION,
  VERSIONS_DE_TOKENS_LUES,
  etatDuFormatDeTokens,
} from './tokens.js';
export type {
  CouleurDeToken,
  CourbeDeToken,
  DimensionDeToken,
  DocumentDeTokens,
  DureeDeToken,
  EtatDuFormatDeTokens,
  ExtensionsDuDocument,
  FamilleDeToken,
  GroupeDeTokens,
  TokenDeDocument,
  ValeurDeToken,
} from './tokens.js';
export { codeIdentifier, normalizeName, tokenCssVariable } from './names.js';
export { estStyleItalique, nomsDeGraisseConnus, poidsDeGraisse } from './typography.js';
export { TOKEN_REFERENCE, isTokenReference, refPath, toRef } from './references.js';
export { comparerIdentiteDeContrat, identiteDeContrat } from './identite.js';
export type { ArbitreIdentite, IdentiteDeContrat, VerdictIdentite } from './identite.js';
export {
  NOM_CONFIGURATION,
  MOTIF_IMPLEMENTATION_PAR_DEFAUT,
  CONFIGURATION_PAR_DEFAUT,
  champsInvalidesDeLaConfiguration,
  configurationDepuisJson,
} from './configuration.js';
export type { ConfigurationRepository } from './configuration.js';
