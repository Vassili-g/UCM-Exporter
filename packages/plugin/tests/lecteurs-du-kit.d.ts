/**
 * Ce que le plugin lit du sous-chemin `lecteurs` du kit.
 *
 * Les lecteurs se publient en JavaScript, sans déclarations — décision écrite
 * dans `packages/kit/src/lecteurs/index.mjs`, et qui tient : le TypeScript
 * n'est imposé à aucun consommateur. Ce fichier n'est donc pas une promesse du
 * kit ; c'est la lecture qu'en fait le plugin, réduite aux fonctions qu'il
 * appelle vraiment.
 *
 * Il ne peut pas mentir longtemps. Ces fonctions sont exécutées à chaque
 * `npm test` sur des contrats réellement fabriqués : un renommage côté kit
 * casse l'exécution, pas seulement la compilation. C'est le contraire d'une
 * déclaration de complaisance — elle décrit un appel qui a lieu.
 */
declare module '@ucm-kit/core/lecteurs' {
  /** Les champs absents ou mal formés pour la version déclarée ; `[]` si le contrat tient. */
  export function champsInvalidesDuContrat(contrat: unknown): string[];

  /** `ok`, `ancien` ou `recent` : le sens de l'écart entre le contrat et ce que le kit lit. */
  export function verdictDeVersion(version: unknown): 'ok' | 'ancien' | 'recent';
}
