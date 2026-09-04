/**
 * Ce que le sous-chemin `lecteurs` promet à un consommateur TypeScript.
 *
 * Les modules restent du JavaScript et le resteront : compiler des lecteurs
 * n'ajouterait rien qu'un consommateur puisse utiliser, et le TypeScript n'est
 * imposé à personne. Mais « ne pas imposer TypeScript » n'est pas « ne rien
 * dire à ceux qui en font », et le premier prix de ce silence était déjà payé :
 * le plugin de ce même dépôt avait recopié à la main deux signatures dans ses
 * tests. Chaque consommateur aurait écrit les siennes, et elles auraient
 * divergé — la maladie que la déduplication des références venait de soigner un
 * étage plus bas.
 *
 * Écrit à la main plutôt que dérivé du JSDoc : dériver imposerait une passe
 * `tsc` sur des `.mjs`, donc un build là où la décision est justement de n'en
 * avoir aucun pour ce sous-chemin.
 *
 * Bornes de lecture, à connaître avant de s'y fier. Un contrat est typé
 * `unknown` là où le lecteur accepte n'importe quoi — c'est le contrat de ces
 * fonctions, elles ne lèvent pas sur une entrée malformée, elles la jugent.
 * Là où une structure de retour est riche et non figée, elle est décrite au
 * niveau où elle est stable, pas au-delà : une déclaration trop précise
 * mentirait à la première évolution, et une déclaration qui ment est pire que
 * pas de déclaration.
 */

declare module "@ucm-kit/core/lecteurs" {
  // ─── Version ──────────────────────────────────────────────────────────────

  /** Version de contrat la plus ancienne que ce paquet accepte. */
  export const VERSION_CONTRAT_MINIMALE: string;

  /** Version de contrat la plus récente que ce paquet accepte. */
  export const VERSION_CONTRAT_MAXIMALE: string;

  /**
   * Le SENS d'un écart de version, jamais un simple booléen.
   *
   * `ancien` : le contrat précède des champs dont le code dépend ; un réexport
   * depuis Figma le corrige, et le geste appartient au designer.
   * `recent` : le contrat vient d'un plugin en avance ; aucun réexport n'y
   * changera rien, c'est le repository qui doit monter de version.
   */
  export function verdictDeVersion(
    version: unknown,
    bornes?: { minimum?: string; maximum?: string },
  ): "ok" | "ancien" | "recent";

  // ─── Forme d'un contrat ───────────────────────────────────────────────────

  /**
   * Les chemins des champs absents ou mal formés, `[]` si le contrat tient.
   * Ne lève jamais : une entrée qui n'est pas un objet est un contrat invalide,
   * pas une erreur de programmation.
   */
  export function champsInvalidesDuContrat(contrat: unknown): string[];

  /**
   * Ce que le schéma ne peut pas juger : composition, doublons et collisions
   * d'identifiant sur un ENSEMBLE de contrats co-localisés.
   *
   * Rend les erreurs par chemin de fichier — un contrat sans erreur y figure
   * avec une liste vide, ce qui distingue « examiné et sain » de « absent ».
   */
  export function validerGrapheDesContrats(
    documents: ReadonlyArray<{ chemin: string; contrat: unknown }>,
  ): Map<string, string[]>;

  /** Les adresses que les échantillons visent, vérifiées contre l'arbre publié. */
  export function validerAdressesDEchantillons(
    documents: ReadonlyArray<{ chemin: string; contrat: unknown }>,
    parNom: Map<string, unknown>,
    ajouter: (chemin: string, message: string) => void,
  ): void;

  /** Les chemins des `*.contract.json` d'un dossier, `node_modules` exclu. */
  export function trouverContrats(dossier: string): string[];

  /** Le motif d'implémentation retenu par défaut : `{dir}/{id}.tsx`. */
  export const MOTIF_IMPLEMENTATION_PAR_DEFAUT: string;

  /** L'identifiant d'artefact que porte un chemin de contrat. */
  export function identifiantDuContrat(cheminContrat: string): string;

  /** Le chemin où l'implémentation de ce contrat est censée se trouver. */
  export function cheminImplementation(cheminContrat: string, motif?: string): string;

  /** L'implémentation de ce contrat existe-t-elle ? */
  export function implementationPresente(
    cheminContrat: string,
    options?: { motif?: string; existe?: (chemin: string) => boolean },
  ): boolean;

  /** Le nom du fichier de configuration d'un repository. */
  export const NOM_CONFIGURATION: string;

  /** Ce qu'un repository vierge décrit sans rien écrire. */
  export const CONFIGURATION_PAR_DEFAUT: {
    readonly components: string;
    readonly tokens: string;
    readonly implementation: string;
  };

  /** Les champs absents ou mal formés d'une configuration. */
  export function champsInvalidesDeLaConfiguration(configuration: unknown): string[];

  /** Lit la configuration d'un repository ; rend toujours une configuration complète. */
  export function lireConfiguration(racine: string): {
    configuration: { components: string; tokens: string; implementation: string };
    chemin: string | null;
    erreur: string | null;
  };

  // ─── Vue exacte d'un variant ──────────────────────────────────────────────

  /**
   * Résout les cinq renvois d'un variant et rend la vue exacte. Le contrat ne
   * publie que des renvois : sans cette résolution, lire un variant demande de
   * connaître les catalogues, et chaque consommateur les relirait à sa façon.
   */
  export function vueExacteDuVariant(contrat: unknown, variant: unknown): unknown;

  /** Les dépendances composées d'un variant, dans l'ordre de son arbre. */
  export function compositionsExactesDuVariant(contrat: unknown, variant: unknown): unknown[];

  /** La projection du variant de référence, publiée elle aussi par renvoi. */
  export function projectionDeReference(contrat: unknown): unknown;

  /** Le nom Figma d'un variant, tel que le contrat le conserve. */
  export function nomFigmaDuVariant(contrat: unknown, variant: unknown): string | undefined;

  /** Le `nodeId` que porte une liaison, ou `undefined` si elle n'en a pas. */
  export function nodeIdDeLiaison(contrat: unknown, placement: unknown): string | undefined;

  /** Les messages publiés dans `meta.diagnostics`, sans filtrer sur la sévérité. */
  export function messagesDExport(contrat: unknown): string[];

  // ─── Références de token ──────────────────────────────────────────────────

  /**
   * Le contrat privé de ce qui n'est pas normatif — `samples` et `meta`.
   * À appliquer AVANT `collecterReferences` sur un contrat entier : un texte de
   * maquette peut valoir « {montant.total} » sans nommer un token.
   */
  export function sansEchantillon<T>(contrat: T): T;

  /**
   * Toute référence de token contenue dans une valeur, à profondeur quelconque.
   * Ne connaît aucun schéma : un champ qui porterait demain une référence est
   * couvert sans toucher à cette fonction.
   */
  export function collecterReferences(valeur: unknown, trouvees?: Set<string>): Set<string>;

  /** Les incohérences entre un text style et les types DTCG de ses références. */
  export function erreursTypesTypographiques(contrat: unknown, tokens: unknown): string[];

  // ─── Le fichier de tokens DTCG ────────────────────────────────────────────

  /**
   * Indexe les feuilles d'un arbre DTCG par leur chemin pointé. Une feuille est
   * un nœud portant `$value` ; le `$type` rendu est le sien, ou celui du groupe
   * ancêtre le plus proche.
   */
  export function indexerTokensDtcg(
    tokens: unknown,
    chemin?: string[],
    index?: Map<string, unknown>,
    typeHerite?: string,
  ): Map<string, unknown>;

  /** Le chemin que désigne une référence, ou `null` si la chaîne n'en désigne aucun. */
  export function cheminDeReference(reference: unknown): string | null;

  /** Les références qui ne désignent aucun token du fichier DTCG, triées. */
  export function referencesAbsentes(
    references: Iterable<string>,
    index: Map<string, unknown>,
  ): string[];

  // ─── Le schéma publié ─────────────────────────────────────────────────────

  /** Chemin résolu du JSON Schema commité, pour un éditeur ou un test d'accord. */
  export const CHEMIN_DU_SCHEMA: string;

  /** Le schéma, analysé. */
  export function lireLeSchema(): Record<string, unknown>;

  /** La version de contrat que le schéma vendu décrit. */
  export function versionDuSchema(): string;

  /** Un valideur Ajv prêt à l'emploi, compilé sur le schéma publié. */
  export function valideurDeSchema(): (contrat: unknown) => boolean;

  // ─── Diagnostics lus par un humain ────────────────────────────────────────

  /** Titre de la section des avertissements d'export. */
  export const TITRE_AVERTISSEMENTS: string;

  /** Les avertissements d'un contrat sur lesquels le designer peut agir. */
  export function avertissementsCorrigeables(contrat: unknown): string[];

  /** La section markdown des avertissements d'export, ou `null` s'il n'y en a aucun. */
  export function sectionAvertissementsExport(
    bilans: ReadonlyArray<unknown>,
    options?: { bloquant?: boolean },
  ): string | null;

  /** Le résumé terminal des avertissements. */
  export function resumeTerminalAvertissements(bilans: ReadonlyArray<unknown>): string | null;

  /** « 1 contrat » / « 3 contrats » : l'accord, écrit une seule fois. */
  export function libelleNombre(nombre: number, singulier: string, pluriel?: string): string;

  /** Le rendu markdown d'un diagnostic destiné à un humain. */
  export function rendreDiagnostic(diagnostic: {
    severity?: string;
    title?: string;
    count?: number;
    itemSingular?: string;
    itemPlural?: string;
    summary?: string;
    items?: ReadonlyArray<string>;
    detailsTitle?: string;
    details?: ReadonlyArray<string>;
    action?: string;
    status?: string;
    level?: number;
  }): string;
}
