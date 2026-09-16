/**
 * Les mots et les limites de chaque forge. Tout texte du plugin qui nomme une
 * forge, sa demande de fusion ou son jeton les lit ici ; aucun message ne teste
 * la forge. Ce module n'appelle aucun réseau : l'interface l'importe.
 */

export type NomDeForge = 'github' | 'gitlab';

export type TermesDeForge = {
  forge: string;
  /** Le nom de la demande de fusion, au singulier et en minuscules. */
  demande: string;
  abreviation: string;
  /** Le nom du dépôt dans le vocabulaire de la forge. */
  depot: string;
  /** Le nom que la forge donne au jeton, tel qu'il figure dans ses réglages. */
  nomDuJeton: string;
  /** L'aide sous le champ du jeton : quel jeton créer, et avec quels droits. */
  aideDuJeton: string;
  /** Les droits qu'un 403 demande de donner, complément de « Donnez-lui ». */
  droits: string;
  /** Les statuts d'une branche ou d'une demande refusée parce qu'elle existe déjà. */
  statutsDeRefus: readonly number[];
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
  aideDuJeton:
    'Utilisez un fine-grained token limité à ce repo avec Contents: Read and write et Pull requests: Read and write.',
  droits: 'Contents: Read and write et Pull requests: Read and write',
  statutsDeRefus: [422],
  statutsDeConflit: [409],
  limiteDeFichier: { octets: 100 * 1024 * 1024, libelle: '100 Mo' },
  // Au-delà, GitHub refuse la pull request en 422 et l'export échoue entier.
  limiteDeCorps: 65_536,
};

/*
 * GitLab refuse en 400 une branche existante et en 409 une seconde merge
 * request sur la même branche : les deux demandent le même geste. Le commit
 * part de la version lue, si bien qu'aucun statut ne signale un conflit.
 */
export const TERMES_GITLAB: TermesDeForge = {
  forge: 'GitLab',
  demande: 'merge request',
  abreviation: 'MR',
  depot: 'projet',
  nomDuJeton: 'jeton d’accès',
  aideDuJeton:
    'Utilisez un jeton d’accès projet de rôle Developer, ou à défaut un jeton personnel, avec le seul scope api.',
  droits: 'le scope api et le rôle Developer sur ce projet',
  statutsDeRefus: [400, 409],
  statutsDeConflit: [],
  // L'API de commits ralentit au-delà de 20 Mo et refuse au-delà de 300 Mo.
  limiteDeFichier: { octets: 20 * 1024 * 1024, libelle: '20 Mo' },
  limiteDeCorps: 1_048_576,
};

export const TERMES: Record<NomDeForge, TermesDeForge> = { github: TERMES_GITHUB, gitlab: TERMES_GITLAB };

export function avecMajuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
