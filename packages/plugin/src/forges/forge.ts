/**
 * Le port qu'une forge implémente pour recevoir un export : lire le dépôt,
 * lister les demandes ouvertes, écrire puis ouvrir une demande.
 *
 * Ce qui ne dépend d'aucune forge vit dans `depot.ts`. Un adaptateur ne décide
 * ni du chemin, ni de l'immobilité, ni de la collision : il transporte.
 */

/**
 * Erreur réseau nettoyée : statut et message, jamais les en-têtes. Le statut
 * distingue une panne réseau d'une configuration du dépôt invalide.
 */
export class ErreurDeForge extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'ErreurDeForge';
  }
}

/** Le dépôt répond, mais il se décrit mal. */
export class ErreurDeDescription extends ErreurDeForge {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurDeDescription';
  }
}

/**
 * Ce qui identifie la version lue d'un fichier, dans le vocabulaire de la
 * forge qui l'a rendue. Seul l'adaptateur qui l'a produite la relit.
 */
export type VersionDeFichier = Readonly<Record<string, string>>;

export type FichierLu = { contenu: string; version: VersionDeFichier };

/** Une demande ouverte vers la branche de base. `url` manque quand la forge ne l'a pas rendue. */
export type DemandeOuverte = { branche: string; url: string | null };

export type EcritureDemandee = {
  branche: string;
  base: string;
  chemin: string;
  contenu: string;
  /** La version lue sur la base ; `null` quand le fichier n'y existe pas. */
  version: VersionDeFichier | null;
  message: string;
  titre: string;
  corps: string;
};

/** Les mots et les limites propres à une forge. Tout texte qui nomme une forge les lit ici. */
export type TermesDeForge = {
  forge: string;
  /** Le nom de la demande de fusion, au singulier et en minuscules. */
  demande: string;
  abreviation: string;
  /** Au-delà, le fichier ne se publie pas et reste téléchargé sur le poste. */
  limiteDeFichier: { octets: number; libelle: string };
  /** Au-delà, la forge refuse le corps de la demande. */
  limiteDeCorps: number;
};

export interface Forge {
  readonly termes: TermesDeForge;
  readonly baseBranch: string;
  /** Lit le projet ; lève une `ErreurDeForge` qui porte le statut. */
  testerDepot(): Promise<void>;
  /** Le fichier décodé et sa version, ou `null` s'il n'existe pas à cette `ref`. */
  lireFichier(chemin: string, ref?: string): Promise<FichierLu | null>;
  /** Les demandes ouvertes vers la branche de base. */
  demandesOuvertes(): Promise<DemandeOuverte[]>;
  /**
   * Écrit le fichier sur une nouvelle branche, ouvre la demande et rend son
   * URL. La branche est retirée quand l'écriture ou l'ouverture échoue.
   */
  publier(ecriture: EcritureDemandee): Promise<string>;
  /** Rend inertes les formes que la page de la forge relierait ou exécuterait. */
  sansLienAutomatique(texte: string): string;
}
