/**
 * Ce que vaut la connexion au repository, et ce que le designer doit en faire.
 *
 * **Le défaut que ce fichier referme (U5.2).** `testGithubConnection` rendait un
 * booléen : pas de configuration, jeton refusé et repository introuvable
 * donnaient la même pastille rouge, alors que le geste diffère dans les trois
 * cas. L'information existait à la source — `GithubApiError` porte son statut
 * HTTP — et se perdait au retour.
 *
 * **Pourquoi les textes sont ici et pas dans l'UI.** Le sandbox envoie déjà des
 * phrases entières à l'interface (`status`, `note`, `log`) ; l'UI, elle, est en
 * JavaScript et aucun test ne l'atteint. Écrire ces textes ici les rend
 * vérifiables, et surtout les rend UNIQUES : la pastille inventait les siens de
 * son côté, ce qui faisait deux autorités sur la même chose.
 */
import { NOM_CONFIGURATION } from '@ucm-kit/core/format';


/**
 * Ce qui a été observé, jamais ce qu'on en déduit.
 *
 * `acces-refuse` et `depot-introuvable` sont bien deux causes distinctes : un
 * 403 dit que le jeton est reconnu mais n'a pas le droit, un 404 que GitHub ne
 * trouve rien à cette adresse avec ce jeton. Les confondre reviendrait à
 * envoyer le designer changer une URL correcte.
 */
export type CauseConnexion =
  | 'verification'
  | 'connecte'
  | 'non-configure'
  | 'jeton-refuse'
  | 'acces-refuse'
  | 'depot-introuvable'
  /**
   * Le repository répond, mais son `ucm.config.json` est illisible et
   * `repositoryLayout` refuse alors l'export. Le lire au test de connexion
   * transforme un blocage découvert APRÈS le travail en information immédiate
   * (U5.1) : c'est tout l'objet de cette cause.
   */
  | 'depot-mal-decrit'
  | 'github-indisponible'
  | 'reseau';

/** Ce que l'interface montre : une pastille, et le geste quand il y en a un. */
export type EtatConnexion = {
  state: 'checking' | 'connected' | 'disconnected';
  /** Le texte de la pastille. Court : il vit dans l'en-tête, au rang 3. */
  pastille: string;
  /** Le constat et le geste, lus dans la configuration. `null` quand tout va bien. */
  geste: string | null;
};

/** Traduit le statut HTTP d'un échec en cause. `null` = la requête n'a pas abouti. */
export function causeDepuisStatut(statut: number | null): CauseConnexion {
  if (statut === null) return 'reseau';
  if (statut === 401) return 'jeton-refuse';
  if (statut === 403) return 'acces-refuse';
  if (statut === 404) return 'depot-introuvable';
  return 'github-indisponible';
}

/**
 * L'unique autorité sur ce que l'interface affiche d'une connexion.
 *
 * `precision` ne sert qu'aux deux causes dont le geste dépend d'un détail que ce
 * fichier ne peut pas connaître d'avance : le statut renvoyé par GitHub, et le
 * message exact que le repository a produit sur son propre fichier.
 */
export function etatDeConnexion(
  cause: CauseConnexion,
  precision: { statut?: number | null; detail?: string } = {},
): EtatConnexion {
  switch (cause) {
    case 'verification':
      return { state: 'checking', pastille: 'connexion…', geste: null };
    case 'connecte':
      return { state: 'connected', pastille: 'repository connecté', geste: null };
    case 'non-configure':
      return {
        state: 'disconnected',
        pastille: 'aucun repository',
        geste:
          'Renseignez l’URL du repository et un Personal Access Token. '
          + 'Sans eux, un export est téléchargé sur votre poste au lieu d’ouvrir une pull request.',
      };
    case 'jeton-refuse':
      return {
        state: 'disconnected',
        pastille: 'jeton refusé',
        geste:
          'GitHub refuse ce Personal Access Token. Créez-en un nouveau sur GitHub, '
          + 'puis collez-le dans le champ ci-dessus.',
      };
    case 'acces-refuse':
      return {
        state: 'disconnected',
        pastille: 'accès refusé',
        geste:
          'Le jeton est reconnu, mais il n’a pas les droits sur ce repository. '
          + 'Donnez-lui Contents: Read and write et Pull requests: Read and write.',
      };
    case 'depot-introuvable':
      return {
        state: 'disconnected',
        pastille: 'repository introuvable',
        geste:
          'GitHub ne trouve aucun repository à cette adresse avec ce jeton. '
          + 'Vérifiez l’URL. Si le repository est privé, donnez au jeton l’accès à ce repository.',
      };
    case 'reseau':
      return {
        state: 'disconnected',
        pastille: 'GitHub injoignable',
        geste: 'La requête vers GitHub n’a pas abouti. Vérifiez votre connexion, puis réessayez.',
      };
    case 'depot-mal-decrit':
      return {
        state: 'disconnected',
        pastille: 'repository mal décrit',
        geste:
          'Un développeur doit corriger le fichier qui décrit ce repository. '
          + 'Tant qu’il est fautif, aucun export ne peut être publié. '
          + (precision.detail ?? ''),
      };
    case 'github-indisponible':
      return {
        state: 'disconnected',
        pastille: 'GitHub indisponible',
        geste:
          `GitHub a répondu ${precision.statut ?? 'une erreur'} à la demande du plugin. `
          + 'Réessayez dans un moment. '
          + 'Si la réponse ne change pas, un mainteneur du plugin doit la regarder.',
      };
  }
}
/** Ce que le plugin sait de l'endroit où le repository range ses exports. */
export type LayoutConnu = {
  components: string | null;
  tokens: string | null;
  source: string;
};

/** Le repository visé, tel que les réglages validés le décrivent. */
export type DepotVise = { owner: string; repo: string; baseBranch: string };

/** Qui décide de l'endroit, et ce que l'interface en dit. */
export type EtatDuDepot = {
  /** `repository` marque les deux champs de la configuration comme un repli. */
  gouverne: 'repository' | 'reglages' | null;
  /** La phrase de la configuration : qui gouverne les chemins. */
  resume: string | null;
  /** Le repository et sa branche, sur l'écran de travail (U2.2). */
  ligne: string | null;
  /** Où les deux artefacts atterrissent, quand c'est connu. */
  chemins: string | null;
  /**
   * `true` quand aucun repository n'est connecté : l'export sera téléchargé sur
   * le poste. C'est un comportement correct, mais il était SUBI (U2.5) —
   * découvert à l'arrivée, après le travail, alors que le bouton avait promis
   * une pull request.
   */
  repli: boolean;
};

/**
 * La phrase que la configuration affiche au-dessus des deux chemins (U5.1).
 *
 * Elle répond à la question que le designer se posait APRÈS coup, en lisant une
 * ligne de journal : qui a décidé de l'endroit ? Le troisième cas est le plus
 * utile, et il n'existait pas — personne ne décide, et l'export sera refusé.
 */
export function etatDuDepot(layout: LayoutConnu | null, depot: DepotVise | null = null): EtatDuDepot {
  /*
   * Sans repository, la ligne dit ce qui VA se passer (U2.5). Le repli en
   * téléchargement local est un comportement correct, mais il était subi :
   * découvert à l'arrivée, alors que le bouton avait promis une pull request.
   * L'annoncer avant le clic en fait un mode choisi.
   */
  const ligne = depot
    ? `${depot.owner}/${depot.repo} · ${depot.baseBranch}`
    : 'Aucun repository connecté. L’export sera téléchargé sur votre poste.';
  const chemins = layout
    ? `Contrats : ${layout.components ?? 'aucun chemin'}. Tokens : ${layout.tokens ?? 'aucun chemin'}.`
    : null;
  const situation = { ligne, chemins, repli: depot === null };

  if (!layout) return { ...situation, gouverne: null, resume: null };

  if (layout.source === NOM_CONFIGURATION) {
    return {
      ...situation,
      gouverne: 'repository',
      resume:
        `Ce repository décrit lui-même où ranger les exports, dans son ${NOM_CONFIGURATION} : `
        + `${layout.components ?? 'aucun chemin'} pour les contrats, `
        + `${layout.tokens ?? 'aucun chemin'} pour les tokens. `
        + 'Les deux chemins ci-dessous ne servent que si ce fichier disparaît.',
    };
  }

  if (!layout.components && !layout.tokens) {
    return {
      ...situation,
      gouverne: 'reglages',
      resume:
        `Ce repository ne dit pas où ranger les exports, et aucun chemin n'est renseigné ici. `
        + `Un développeur doit ajouter un ${NOM_CONFIGURATION} au repository, ou renseignez `
        + 'les chemins ci-dessous. Sans l’un des deux, un export est refusé.',
    };
  }

  return {
    ...situation,
    gouverne: 'reglages',
    resume:
      'Ce repository ne dit pas où ranger les exports : les chemins ci-dessous décident. '
      + `Un développeur peut les remplacer en ajoutant un ${NOM_CONFIGURATION} au repository.`,
  };
}
