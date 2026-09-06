/**
 * Le JSON Schema du contrat, tel que l'exporteur le publie.
 * Il est généré depuis `types.ts` par `npm run schema`, jamais corrigé à la
 * main. La validation qui refuse une PR reste dans `validation-contrat.mjs`.
 * Ces exports sont publics même si les dépôts présents ne les consomment pas.
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
