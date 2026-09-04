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
 * Ce que ce sous-chemin ne contient PAS encore : le rapport lu par le designer
 * (`check-contract` et ses diagnostics), qui vit toujours chez le consommateur
 * et rejoindra le paquet en T5.2.
 */

/** Retrouver les contrats d'un dossier. */
export { trouverContrats } from "./trouver-contrats.mjs";

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
