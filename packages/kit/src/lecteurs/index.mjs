/**
 * Porte publique unique des lecteurs Node (`ajv`, `node:fs`). Le sous-chemin
 * `format`, sans dépendance de runtime, reste importable dans Figma et le
 * navigateur. Cette porte expose le contenu du rapport, jamais sa publication.
 */

/** Retrouver les contrats d'un dossier. */
export { trouverContrats } from "./trouver-contrats.mjs";

/**
 * Où vit l'implémentation et si elle existe. La comparaison dépend de la stack
 * et reste dans l'adaptateur ; le motif par défaut appartient au format.
 */
export {
  identifiantDuContrat,
  cheminImplementation,
  implementationPresente,
} from "./implementation.mjs";

/**
 * Ouvre `ucm.config.json` sur disque ; sa grammaire reste dans `format` afin
 * que le plugin Figma utilise la même autorité.
 */
export { lireConfiguration } from "./configuration.mjs";

/** La version : ce que ce paquet sait lire, et le sens d'un écart. */
export {
  VERSION_CONTRAT_MINIMALE,
  VERSION_CONTRAT_MAXIMALE,
  verdictDeVersion,
} from "./version-contrat.mjs";

/** La forme d'un contrat, et son graphe de composition. */
export { champsInvalidesDuContrat } from "./validation-contrat.mjs";
export { validerGrapheDesContrats } from "./validation-graphe-contrats.mjs";
export { validerAdressesDEchantillons } from "./validation-echantillons.mjs";

/** La vue exacte d'un variant, telle que le contrat la décrit. */
export {
  vueExacteDuVariant,
  compositionsExactesDuVariant,
  projectionDeReference,
  nomFigmaDuVariant,
  nodeIdDeLiaison,
  messagesDExport,
} from "./variant-views.mjs";

/**
 * Relève les références d'un contrat. Leur syntaxe reste définie dans
 * `@ucm-kit/core/format`, sans second export concurrent ici.
 */
export { sansEchantillon, collecterReferences } from "./references-token.mjs";
export { erreursTypesTypographiques } from "./typography-token-types.mjs";

/** Ce que le fichier de tokens DTCG contient, et donc ce qui existe. */
export {
  indexerTokensDtcg,
  cheminDeReference,
  referencesAbsentes,
} from "./tokens-dtcg.mjs";

/** Ce que l'export n'a pas su décrire, et comment le dire. */
export {
  avertissementsCorrigeables,
  TITRE_AVERTISSEMENTS,
  sectionAvertissementsExport,
  resumeTerminalAvertissements,
} from "./avertissements-export.mjs";

/** Le JSON Schema publié, pour l'éditeur et les tests d'accord. */
export {
  CHEMIN_DU_SCHEMA,
  lireLeSchema,
  versionDuSchema,
  valideurDeSchema,
} from "./schema-contrat.mjs";

/** Le rendu markdown d'un diagnostic. */
export { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";

/**
 * Le contrôle d'un repository entier, et le rapport qu'un designer en lit.
 *
 * `controlerRepository` n'écrit rien et ne sort d'aucun processus : il rend
 * `{ bilans, fautifs, rapport, terminal, bloquant }`. `ADAPTATEUR_VIDE` est le
 * noyau seul : il dit où une implémentation devrait être et si elle y est, et
 * ne prétend jamais avoir lu du code.
 */
export { ADAPTATEUR_VIDE, controlerRepository } from "./controle-repository.mjs";

/** Ce qui refuse une fusion, et le titre que ce refus mérite. */
export { bilanEstBloquant, enteteDuVerdict } from "./verdict-bilan.mjs";

/** Les états informatifs se limitent aux contrats que la pull request modifie. */
export { selectionnerBilansDuRapport } from "./perimetre-rapport.mjs";

/** Les références qu'un contrat cite et que la source de tokens ne porte pas. */
export {
  sectionTokensManquants,
  resumeTerminalTokensManquants,
} from "./diagnostic-tokens.mjs";

/**
 * L'écart contrat ↔ code : le juger et le dire.
 *
 * Le mesurer reste chez l'adaptateur ; décider si le relevé qu'il rend
 * porte un écart ne demande que la forme de ce relevé.
 */
export {
  pariteEnEcart,
  aUnEcartDeParite,
  sectionEcartsDeParite,
  resumeTerminalEcartsDeParite,
} from "./diagnostic-parite.mjs";

/**
 * Ce que le designer doit lire d'une suite de tests en échec.
 *
 * Lire du TAP, reconnaître un fichier de test, distinguer une assertion d'une
 * erreur d'exécution : autant de questions de stack, qui restent chez
 * l'adaptateur. Ce module n'écrit que le diagnostic.
 */
export {
  repartirEchecs,
  diagnosticEchecsDeTests,
  resumeTerminalEchecsDeTests,
} from "./diagnostic-tests.mjs";
