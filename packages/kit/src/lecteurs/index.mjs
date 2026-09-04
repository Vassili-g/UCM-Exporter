/**
 * Les LECTEURS du format : ce qui juge un contrat déjà écrit.
 *
 * Ce sous-chemin est le pendant de `@ucm-kit/core/format`, et la frontière
 * entre les deux est une contrainte d'exécution, pas un rangement : le format
 * ne dépend de rien et voyage dans le bundle du plugin Figma comme dans un
 * navigateur ; les lecteurs, eux, utilisent `ajv` et `node:fs`. Les mélanger
 * casserait le bundle, et l'erreur n'apparaîtrait qu'au chargement du plugin.
 *
 * Ces modules se publient tels quels, en JavaScript : les compiler n'ajouterait
 * rien qu'un consommateur puisse utiliser, et le TypeScript n'est imposé à
 * personne.
 *
 * Pourquoi une seule porte plutôt qu'un sous-chemin par module : un sous-chemin
 * par fichier ferait de chaque nom de fichier une promesse, et interdirait de
 * réorganiser le dossier sans casser un consommateur. Une porte unique laisse
 * l'organisation interne libre.
 *
 * Ce qu'elle publie est exactement ce que les modules publient déjà, sans tri :
 * ce déplacement ne juge rien. Restreindre la surface est un autre geste, et il
 * se prendra quand le rapport aura rejoint le paquet (T5.2) — à ce moment-là on
 * saura ce qu'un consommateur appelle vraiment. `tests/surfaceLecteurs.test.mjs`
 * tient l'exhaustivité pour qu'un export ajouté à un module ne reste pas
 * enfermé dedans par oubli.
 *
 * Depuis T5.2, il contient AUSSI le rapport lu par le designer. Ce qu'il ne
 * contiendra jamais, en revanche, c'est la publication de ce rapport : où il
 * s'écrit — un fichier, le résumé d'un run de CI, un terminal — appartient à
 * l'outil qui appelle. Le contenu est du format, la publication est de l'outil.
 */

/** Retrouver les contrats d'un dossier. */
export { trouverContrats } from "./trouver-contrats.mjs";

/**
 * Où vit l'implémentation d'un contrat, et si elle est là.
 *
 * L'EXISTENCE est ici parce qu'elle ne dépend d'aucun langage ; la COMPARAISON
 * des props reste chez l'adaptateur du consommateur, qui seul possède un
 * vérificateur de types (T2.3). Le MOTIF par défaut, lui, est une valeur du
 * format : `MOTIF_IMPLEMENTATION_PAR_DEFAUT` vient de `@ucm-kit/core/format`.
 */
export {
  identifiantDuContrat,
  cheminImplementation,
  implementationPresente,
} from "./implementation.mjs";

/**
 * OUVRIR `ucm.config.json` sur un disque.
 *
 * La GRAMMAIRE de ce fichier n'est pas ici : `NOM_CONFIGURATION`,
 * `CONFIGURATION_PAR_DEFAUT`, `champsInvalidesDeLaConfiguration` et
 * `configurationDepuisJson` vivent dans `@ucm-kit/core/format`, que le plugin
 * Figma atteint aussi — il lit ce même fichier par l'API GitHub pour savoir où
 * écrire (T4.1). Les republier ici en ferait un second nom pour la même chose,
 * exactement ce que T2.7 a supprimé.
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
 * Les références de token que porte un contrat.
 *
 * Leur FORME n'est plus ici : `isTokenReference` vit dans
 * `@ucm-kit/core/format`, atteignable par un consommateur navigateur comme par
 * un consommateur Node. La republier ici en ferait un second nom pour la même
 * chose, ce que T2.7 vient précisément de supprimer.
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
 * noyau seul — il dit où une implémentation devrait être et si elle y est, et
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
 * Le MESURER reste chez l'adaptateur (T2.3) ; décider si le relevé qu'il rend
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
