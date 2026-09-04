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

  /** L'identifiant d'artefact que porte un chemin de contrat. */
  export function identifiantDuContrat(cheminContrat: string): string;

  /** Le chemin où l'implémentation de ce contrat est censée se trouver. */
  export function cheminImplementation(cheminContrat: string, motif?: string): string;

  /** L'implémentation de ce contrat existe-t-elle ? */
  export function implementationPresente(
    cheminContrat: string,
    options?: { motif?: string; existe?: (chemin: string) => boolean },
  ): boolean;

  /**
   * La GRAMMAIRE de `ucm.config.json` n'est pas dans ce sous-chemin :
   * `NOM_CONFIGURATION`, `CONFIGURATION_PAR_DEFAUT`,
   * `champsInvalidesDeLaConfiguration`, `configurationDepuisJson` et
   * `MOTIF_IMPLEMENTATION_PAR_DEFAUT` vivent dans `@ucm-kit/core/format`, que
   * le plugin Figma atteint aussi (T4.1). Seule l'OUVERTURE du fichier est ici.
   */

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

  /**
   * Les lignes markdown des avertissements d'export, vides s'il n'y en a aucun.
   *
   * *Corrigé par T5.2 :* cette déclaration annonçait `string | null`. La
   * fonction rend un TABLEAU de lignes, et tous ses appelants la répandent dans
   * le rapport — un `...` sur la chaîne annoncée aurait poussé ses caractères
   * un par un. Une déclaration qui ment est pire que pas de déclaration ; celle
   * de `rendreDiagnostic`, juste en dessous, portait la même faute.
   */
  export function sectionAvertissementsExport(
    bilans: ReadonlyArray<unknown>,
    options?: { bloquant?: boolean },
  ): string[];

  /** Le résumé terminal des avertissements. */
  export function resumeTerminalAvertissements(bilans: ReadonlyArray<unknown>): string | null;

  /** « 1 contrat » / « 3 contrats » : l'accord, écrit une seule fois. */
  export function libelleNombre(nombre: number, singulier: string, pluriel?: string): string;

  /** Le rendu markdown d'un diagnostic destiné à un humain, ligne par ligne. */
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
  }): string[];

  // ─── Le rapport, et le contrôle qui le produit ────────────────────────────

  /**
   * Ce qu'un adaptateur doit savoir faire pour qu'une stack entre dans le
   * contrôle. Les trois fonctions sont décrites au niveau où elles sont
   * stables : le RELEVÉ qui circule entre elles n'appartient qu'à l'adaptateur,
   * qui le produit et le relit lui-même.
   */
  export interface AdaptateurDImplementation {
    /** Relève d'un coup ce que l'adaptateur sait lire des implémentations citées. */
    lireApiPublique(implementations: readonly string[], racine: string): Map<string, unknown>;
    /** Le nom que l'API publique de cette implémentation devrait porter. */
    nomInterfaceAttendue(implementation: string): string | null;
    /** Compare un contrat au relevé, et rend un écart de parité. */
    ecartsDeParite(
      contrat: unknown,
      releve: unknown,
      nomInterface: string | null,
      options: { presente: boolean; chemin: string },
    ): EcartsDeParite;
  }

  /**
   * Un écart de parité, tel que le rapport le lit.
   *
   * `implementationAbsente` et `implementationNonLue` ne sont pas des écarts :
   * le fichier n'est pas là — état d'avancement légitime —, ou il est là et
   * personne ne sait le lire. Aucun des deux n'appelle un geste correctif.
   */
  export interface EcartsDeParite {
    implementationAbsente: boolean;
    implementationNonLue: string | null;
    interfaceAbsente: string | null;
    fonctionAbsente: string | null;
    manquantes: string[];
    typesIncorrects: Array<{ prop: string; attendu: string; recu: string }>;
    booleensNonUtilises: string[];
    compositionsIncorrectes: Array<{ component: string; attendu: number; rendu: number }>;
  }

  /**
   * Un test en échec, tel que le rapport le lit.
   *
   * `composant` et `assertion` ne se déduisent d'aucun chemin : la convention
   * qui relie un fichier de test à un composant, et les erreurs qui distinguent
   * une assertion d'une interruption, appartiennent à un lanceur donc à un
   * adaptateur.
   */
  export interface EchecDeTest {
    fichier: string | null;
    composant: string | null;
    assertion: boolean;
    test: string;
    nomErreur?: string;
    erreur?: string;
  }

  /** Le verdict d'un contrôle : ce qu'il a vu, ce qu'il en écrit, et s'il refuse. */
  export interface VerdictDeControle {
    bilans: unknown[];
    fautifs: unknown[];
    rapport: string;
    terminal: Array<{ flux: "log" | "warn" | "error"; texte: string }>;
    bloquant: boolean;
  }

  /**
   * Contrôle un repository et rend son verdict — sans rien écrire nulle part.
   *
   * Il n'ouvre aucun fichier de sortie, ne lit aucune variable d'environnement
   * et ne sort d'aucun processus : où va le rapport appartient à l'outil qui
   * appelle.
   */
  export function controlerRepository(
    racine: string,
    options?: {
      configuration?: { components: string; tokens: string; implementation: string };
      adaptateur?: AdaptateurDImplementation;
      echecsDeTests?: { echoue: boolean; echecs: readonly EchecDeTest[] };
      contratsModifies?: string;
      tokensModifies?: boolean;
    },
  ): VerdictDeControle;

  /**
   * Le noyau seul : il dit où une implémentation devrait être et si elle y est,
   * et ne prétend jamais avoir lu du code.
   */
  export const ADAPTATEUR_VIDE: AdaptateurDImplementation;

  /** Ce bilan refuse-t-il la fusion ? Vrai du CONTRAT, jamais du code ni des tests. */
  export function bilanEstBloquant(bilan: unknown): boolean;

  /** L'en-tête du rapport rouge, et rien d'autre que ce qui est vrai. */
  export function enteteDuVerdict(
    fautifs: ReadonlyArray<unknown> | number,
    avecAvertissements?: boolean,
  ): string[];

  /**
   * Limite les états informatifs aux contrats que la pull request modifie.
   * Sans liste, tous les bilans restent visibles.
   */
  export function selectionnerBilansDuRapport<T>(
    bilans: readonly T[],
    cheminsModifies?: string,
  ): T[];

  /** La section des références que la source de tokens ne porte pas. */
  export function sectionTokensManquants(
    bilans: ReadonlyArray<unknown>,
    options: { tokensModifies?: boolean; sourceTokens: string },
  ): string[];

  /** Le résumé terminal des références absentes. */
  export function resumeTerminalTokensManquants(
    bilans: ReadonlyArray<unknown>,
    sourceTokens: string,
  ): string | null;

  /** Ce relevé de parité porte-t-il un écart ? */
  export function pariteEnEcart(ecarts: EcartsDeParite): boolean;

  /** Idem, sur un bilan de contrat. */
  export function aUnEcartDeParite(bilan: unknown): boolean;

  /** La section des écarts contrat ↔ code, qui avertit sans jamais bloquer. */
  export function sectionEcartsDeParite(bilans: ReadonlyArray<unknown>): string[];

  /** Le rappel terminal des écarts contrat ↔ code. */
  export function resumeTerminalEcartsDeParite(bilans: ReadonlyArray<unknown>): string | null;

  /** Sépare ce qui concerne un composant exporté de ce qui concerne l'outillage. */
  export function repartirEchecs(echecs: readonly EchecDeTest[]): {
    rendu: EchecDeTest[];
    testsComposants: EchecDeTest[];
    gardeFous: EchecDeTest[];
  };

  /**
   * La section du rapport pour les tests en échec.
   *
   * `avertissements` a TROIS états : une liste vide dit « l'export n'a rien
   * signalé », `null` dit « on n'a pas pu le vérifier ». Les confondre ferait
   * disculper Figma sans l'avoir consulté.
   */
  export function diagnosticEchecsDeTests(
    resultat: { echoue: boolean; echecs: readonly EchecDeTest[] },
    avertissements?: readonly string[] | null,
  ): string[];

  /** Même constat, pour le terminal du développeur. */
  export function resumeTerminalEchecsDeTests(
    resultat: { echoue: boolean; echecs: readonly EchecDeTest[] },
  ): string[];
}
