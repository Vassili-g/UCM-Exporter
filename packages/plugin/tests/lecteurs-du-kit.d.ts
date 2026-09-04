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

  /**
   * Toute référence de token contenue dans une valeur, à profondeur quelconque.
   *
   * Le plugin en portait une copie exacte (`collectTokenReferences`), qu'aucun
   * code de production n'appelait ; ses tests appellent celle-ci.
   *
   * ⚠ Elle ne connaît AUCUN schéma : sur un contrat entier, elle ramasserait le
   * texte de maquette de `samples`. Le kit publie `sansEchantillon` pour cela.
   * Les appels d'ici portent sur des fragments d'extraction, jamais sur un
   * contrat complet — sauf `exportComponent.test.ts`, dont l'assertion est
   * exhaustive et vérifiée telle quelle.
   */
  export function collecterReferences(valeur: unknown, trouvees?: Set<string>): Set<string>;
}
