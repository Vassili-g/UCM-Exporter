/**
 * Le JSON Schema du contrat, tel que l'exporteur le publie.
 *
 * Ce fichier n'est PAS une seconde autorité sur la forme d'un contrat.
 * `validation-contrat.mjs` reste seule à décider ce que ce repository accepte,
 * et seule à pouvoir refuser une pull request : deux autorités sur la même
 * convention finiraient par diverger, et un contrôle accepterait ce qu'un
 * autre refuse.
 *
 * Le schéma sert à deux choses, et à rien d'autre :
 *
 * 1. l'éditeur, qui valide un `.contract.json` ouvert à la main
 *    (cf. `.vscode/settings.json`) ;
 * 2. `schema-contrat.test.mjs`, qui constate que la copie vendue ici décrit
 *    encore les contrats du repository. Une copie périmée ou trop stricte
 *    devient ainsi un test rouge chez le développeur, jamais un diagnostic
 *    adressé au designer — il n'y pourrait rien.
 *
 * `schema/ucm-contract.schema.json` n'est plus une copie vendue : c'est le
 * schéma du paquet, écrit par `scripts/build-schema.ts` depuis `types.ts`.
 * Il ne se corrige toujours pas à la main — il se régénère (`npm run schema`),
 * et `tests/schema.test.ts` refuse toute divergence avec le générateur.
 */
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Le schéma publié par ce paquet. */
export const CHEMIN_DU_SCHEMA = join(racine, "schema", "ucm-contract.schema.json");

/** Le schéma, analysé. */
export function lireLeSchema() {
  return JSON.parse(readFileSync(CHEMIN_DU_SCHEMA, "utf8"));
}

/**
 * Version de contrat que cette copie décrit.
 *
 * Ce que cette valeur détecte : une montée de `VERSION_CONTRAT_MAXIMALE` sans
 * rafraîchi de la copie. Ce qu'elle ne détecte pas : une correction de
 * `types.ts` qui ne change pas la forme du contrat, donc pas sa version. Le
 * test d'accord ci-contre couvre ce second cas, sur les contrats réels.
 */
export function versionDuSchema() {
  return lireLeSchema()["x-ucm-contract-version"];
}

/**
 * Rend une fonction qui valide un contrat contre le schéma.
 *
 * `strict: false` parce que le schéma porte des mots-clés `x-ucm-*` qu'Ajv ne
 * connaît pas et n'a pas à interpréter.
 */
export function valideurDeSchema() {
  return new Ajv({ allErrors: true, strict: false }).compile(lireLeSchema());
}
