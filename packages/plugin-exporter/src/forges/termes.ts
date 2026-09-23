/**
 * Les mots et les limites de chaque forge. Tout texte du plugin qui nomme une
 * forge, sa demande de fusion ou son jeton les lit ici ; aucun message ne teste
 * la forge. Ce module n'appelle aucun réseau : l'interface l'importe.
 */

export type NomDeForge = 'github' | 'gitlab';

/**
 * L'aide sous le champ du jeton, en trois morceaux plutôt qu'en un paragraphe.
 *
 * Le designer recopie ces droits un par un dans l'écran de la forge, et GitLab
 * en demande cinq : une phrase continue les noierait dans une fenêtre large de
 * 320 px. Les droits gardent les mots exacts de la forge, en anglais, parce que
 * c'est ainsi qu'ils sont écrits dans l'écran où il faut les cocher.
 */
export type AideDuJeton = {
  intro: string;
  /** Une ligne par droit à cocher. */
  droits: readonly string[];
  /** Ce qui convient aussi, en une phrase. `null` quand rien d'autre ne convient. */
  aussi: string | null;
};

/** L'aide tant que l'adresse saisie ne désigne aucune forge. */
export const AIDE_SANS_FORGE: AideDuJeton = {
  intro: 'Un Personal Access Token GitHub ou un jeton d’accès GitLab, selon l’adresse saisie.',
  droits: [],
  aussi: null,
};

export type TermesDeForge = {
  forge: string;
  /** Le nom de la demande de fusion, au singulier et en minuscules. */
  demande: string;
  abreviation: string;
  /** Le nom du dépôt dans le vocabulaire de la forge. */
  depot: string;
  /** Le nom que la forge donne au jeton, tel qu'il figure dans ses réglages. */
  nomDuJeton: string;
  /** L'aide sous le champ du jeton : quel jeton créer, et que cocher dedans. */
  aideDuJeton: AideDuJeton;
  /** Les droits qu'un 403 demande de donner, complément de « Donnez-lui ». */
  droits: string;
  /** Les statuts d'une branche ou d'une demande refusée parce qu'elle existe déjà. */
  statutsDeRefus: readonly number[];
  /**
   * Les statuts d'un refus dont seule la réponse de la forge donne la cause :
   * une règle du dépôt, ou une branche qui existe déjà.
   */
  statutsDeRegle: readonly number[];
  /** Les statuts d'un dépôt qui a changé pendant la publication. */
  statutsDeConflit: readonly number[];
  /** Au-delà, le fichier ne se publie pas et reste téléchargé sur le poste. */
  limiteDeFichier: { octets: number; libelle: string };
  /** Au-delà, la forge refuse le corps de la demande. */
  limiteDeCorps: number;
};

export const TERMES_GITHUB: TermesDeForge = {
  forge: 'GitHub',
  demande: 'pull request',
  abreviation: 'PR',
  depot: 'repository',
  nomDuJeton: 'Personal Access Token',
  aideDuJeton: {
    intro: 'Un fine-grained token limité à ce repository, avec :',
    droits: ['Contents : Read and write', 'Pull requests : Read and write'],
    aussi: null,
  },
  droits: 'Contents: Read and write et Pull requests: Read and write',
  statutsDeRefus: [422],
  statutsDeRegle: [],
  statutsDeConflit: [409],
  limiteDeFichier: { octets: 100 * 1024 * 1024, libelle: '100 Mo' },
  // Au-delà, GitHub refuse la pull request en 422 et l'export échoue entier.
  limiteDeCorps: 65_536,
};

/*
 * GitLab refuse en 409 une seconde merge request sur la même branche. Son 400
 * couvre une branche existante et les règles de push du projet (message de
 * commit, nom de branche) : seule sa réponse les distingue. Le commit part de
 * la version lue, si bien qu'aucun statut ne signale un conflit.
 */
export const TERMES_GITLAB: TermesDeForge = {
  forge: 'GitLab',
  demande: 'merge request',
  abreviation: 'MR',
  depot: 'projet',
  nomDuJeton: 'jeton d’accès',
  aideDuJeton: {
    intro: 'Un jeton personnel fine-grained limité à ce projet, avec :',
    droits: [
      'Project : Read',
      'Repository : Read',
      'Branch : Read, Delete',
      'Commit : Create',
      'Merge Request : Read, Create',
    ],
    aussi: 'Un jeton de scope api convient aussi : personnel, ou de projet au rôle Developer.',
  },
  droits: 'les droits listés sous le champ du jeton, dans la configuration',
  statutsDeRefus: [409],
  statutsDeRegle: [400],
  statutsDeConflit: [],
  // L'API de commits ralentit au-delà de 20 Mo et refuse au-delà de 300 Mo.
  limiteDeFichier: { octets: 20 * 1024 * 1024, libelle: '20 Mo' },
  limiteDeCorps: 1_048_576,
};

export const TERMES: Record<NomDeForge, TermesDeForge> = { github: TERMES_GITHUB, gitlab: TERMES_GITLAB };

export function avecMajuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
