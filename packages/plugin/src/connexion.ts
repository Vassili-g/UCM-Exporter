/**
 * Ce que vaut la connexion au repository, et ce que le designer doit en faire.
 * Le statut HTTP distingue configuration absente, jeton refusé et dépôt
 * introuvable. Les textes vivent ici pour rester uniques et testables ; ceux qui
 * nomment une forge lisent ses termes.
 */
import { NOM_CONFIGURATION } from '@ucm-kit/core/format';

import { avecMajuscule } from './forges/termes';
import type { TermesDeForge } from './forges/termes';

/**
 * Ce qui a été observé, jamais ce qu'on en déduit.
 *
 * `acces-refuse` et `depot-introuvable` sont bien deux causes distinctes : un
 * 403 dit que le jeton est reconnu mais n'a pas le droit, un 404 que la forge ne
 * trouve rien à cette adresse avec ce jeton. Les confondre reviendrait à
 * envoyer le designer changer une URL correcte.
 */
export type CauseConnexion =
  | 'verification'
  | 'connecte'
  | 'non-configure'
  /**
   * Le seul jeton enregistré a été saisi pour l'autre forge. La configuration
   * le refuse avant tout appel : aucun réseau n'a été touché.
   */
  | 'jeton-autre-forge'
  | 'jeton-refuse'
  | 'acces-refuse'
  | 'depot-introuvable'
  /**
   * Le repository répond, mais son `ucm.config.json` est illisible et
   * `repositoryLayout` refuse alors l'export. Le lire au test de connexion
   * transforme un blocage découvert après le travail en information immédiate :
   * c'est tout l'objet de cette cause.
   */
  | 'depot-mal-decrit'
  | 'forge-indisponible'
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
  return 'forge-indisponible';
}

/** Ce que `etatDeConnexion` lit en plus de la cause. */
export type PrecisionConnexion = {
  /** Le statut qu'a rendu la forge. */
  statut?: number | null;
  /** Le message exact que le repository a produit sur son propre fichier. */
  detail?: string;
  /** Les termes de la forge visée ; absents tant que l'URL ne se lit pas. */
  termes?: TermesDeForge | null;
};

/**
 * L'unique autorité sur ce que l'interface affiche d'une connexion.
 *
 * Sans termes, la forge n'est pas connue : c'est le cas d'une configuration
 * absente, et les textes nomment alors les deux demandes.
 */
export function etatDeConnexion(cause: CauseConnexion, precision: PrecisionConnexion = {}): EtatConnexion {
  const termes = precision.termes ?? null;
  const forge = termes?.forge ?? 'la forge';
  const depot = termes?.depot ?? 'repository';
  const jeton = termes?.nomDuJeton ?? 'jeton d’accès';
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
          `Renseignez l’URL du ${depot} et un ${jeton}. `
          + 'Sans eux, un export est téléchargé sur votre poste au lieu d’ouvrir une '
          + `${termes?.demande ?? 'pull request ou une merge request'}.`,
      };
    case 'jeton-autre-forge':
      return {
        state: 'disconnected',
        pastille: 'jeton d’une autre forge',
        geste:
          `Le jeton enregistré a été créé pour une autre forge, et le plugin ne l’envoie pas à ${forge}. `
          + `Collez un ${jeton} ${forge} dans le champ du jeton, puis enregistrez.`,
      };
    case 'jeton-refuse':
      return {
        state: 'disconnected',
        pastille: 'jeton refusé',
        geste:
          `${termes?.forge ?? 'La forge'} refuse ce ${jeton}. Créez-en un nouveau sur ${forge}, `
          + 'puis collez-le dans le champ ci-dessus.',
      };
    case 'acces-refuse':
      return {
        state: 'disconnected',
        pastille: 'accès refusé',
        geste:
          `Le jeton est reconnu, mais il n’a pas les droits sur ce ${depot}. `
          + `Donnez-lui ${termes?.droits ?? 'le droit d’écrire et d’ouvrir une demande de fusion'}.`,
      };
    case 'depot-introuvable':
      return {
        state: 'disconnected',
        pastille: `${depot} introuvable`,
        geste:
          `${termes?.forge ?? 'La forge'} ne trouve aucun ${depot} à cette adresse avec ce jeton. `
          + `Vérifiez l’URL. Si le ${depot} est privé, donnez au jeton l’accès à ce ${depot}.`,
      };
    case 'reseau':
      return {
        state: 'disconnected',
        pastille: `${termes?.forge ?? 'forge'} injoignable`,
        geste: `La requête vers ${forge} n’a pas abouti. Vérifiez votre connexion, puis réessayez.`,
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
    case 'forge-indisponible':
      return {
        state: 'disconnected',
        pastille: `${termes?.forge ?? 'forge'} indisponible`,
        geste:
          `${termes?.forge ?? 'La forge'} a répondu ${precision.statut ?? 'une erreur'} à la demande du plugin. `
          + 'Réessayez dans un moment. '
          + 'Si la réponse ne change pas, un mainteneur du plugin doit la regarder.',
      };
  }
}

/**
 * Pourquoi une publication a échoué, et le geste.
 *
 * Même perte que pour la connexion, à l'autre bout : un échec devenait « Échec
 * GitHub » suivi du message brut, quel que soit le statut. Un 403 de droits
 * manquants, un conflit et une branche existante ne se corrigent pas du même
 * geste. Les statuts de conflit et de refus diffèrent d'une forge à l'autre :
 * ils se lisent dans ses termes.
 *
 * Deux causes seulement sont propres à la publication ; les autres réemploient
 * le vocabulaire de la connexion, parce que ce sont les mêmes faits vus au même
 * endroit. Les recopier ici en ferait un second domicile, promis à diverger.
 */
export function gesteApresEchecDePublication(statut: number | null, termes: TermesDeForge): string {
  if (statut !== null && termes.statutsDeConflit.includes(statut)) {
    return `Le ${termes.depot} a changé pendant la publication. Relancez l’analyse, puis republiez.`;
  }
  if (statut !== null && termes.statutsDeRefus.includes(statut)) {
    return `${termes.forge} a refusé la branche ou la ${termes.demande}. Une branche du même nom existe `
      + 'peut-être déjà. Réessayez dans un moment.';
  }
  return etatDeConnexion(causeDepuisStatut(statut), { statut, termes }).geste ?? '';
}

/** Ce que le plugin sait de l'endroit où le repository range ses exports. */
export type LayoutConnu = {
  components: string;
  tokens: string;
  source: string;
};

/** Le dépôt visé, tel que les réglages validés le décrivent. `forge` est le nom affiché. */
export type DepotVise = { forge: string; projet: string; baseBranch: string };

/**
 * Ce que la configuration dit de l'endroit où les exports vont.
 *
 * `ton` porte la sévérité, jamais le rang : un repository sans
 * `ucm.config.json` n'a pas choisi cet endroit, et l'avertissement le dit avant
 * l'export plutôt qu'après.
 */
export type ResumeDepot = {
  ton: 'info' | 'avertissement';
  titre: string;
  detail: string;
};

/** Qui décide de l'endroit, et ce que l'interface en dit. */
export type EtatDuDepot = {
  /** Ce que la configuration affiche sur l'endroit. `null` tant qu'il est inconnu. */
  resume: ResumeDepot | null;
  /** La forge, le dépôt et sa branche, sur l'écran de travail. */
  ligne: string | null;
  /**
   * `true` quand aucun repository n'est connecté : l'export sera téléchargé sur
   * le poste. C'est un comportement correct, mais il était subi :
   * découvert à l'arrivée, après le travail, alors que le bouton avait promis
   * une pull request.
   */
  repli: boolean;
};

/**
 * La phrase que la configuration affiche sur l'endroit où les exports vont.
 *
 * Elle répond à la question que le designer se posait après coup, en lisant une
 * ligne de journal : qui a décidé de l'endroit ? Deux réponses, et deux
 * seulement, parce qu'il n'y a plus qu'une autorité : le repository l'a écrit,
 * ou il laisse s'appliquer les défauts que le contrôle applique aussi.
 */
export function etatDuDepot(layout: LayoutConnu | null, depot: DepotVise | null = null): EtatDuDepot {
  /*
   * Sans repository, la ligne dit ce qui va se passer. Le repli en
   * téléchargement local est un comportement correct, mais il était subi :
   * découvert à l'arrivée, alors que le bouton avait promis une pull request.
   * L'annoncer avant le clic en fait un mode choisi.
   */
  const ligne = depot
    ? `${depot.forge} · ${depot.projet} · ${depot.baseBranch}`
    : 'Aucun repository connecté. L’export sera téléchargé sur votre poste.';
  const situation = { ligne, repli: depot === null };

  if (!layout) return { ...situation, resume: null };

  if (layout.source !== NOM_CONFIGURATION) {
    return {
      ...situation,
      resume: {
        ton: 'avertissement',
        titre: `Attention, le ${NOM_CONFIGURATION} de ce repository n'est pas configuré.`,
        detail: `Le fichier de configuration ${NOM_CONFIGURATION} permet de définir l'endroit où `
          + 'seront poussés les composants et les tokens.',
      },
    };
  }

  return {
    ...situation,
    resume: {
      ton: 'info',
      titre: `Contrats dans ${layout.components}, tokens dans ${layout.tokens}.`,
      detail: `Ce repository le déclare dans son ${NOM_CONFIGURATION}.`,
    },
  };
}

/**
 * Les textes d'une publication, du lancement à l'échec. Le routeur et la
 * galerie les lisent ici : la capture montre la phrase que le plugin écrit.
 */
export function textesDePublication(termes: TermesDeForge) {
  return {
    enCours: `Publication sur ${termes.forge}…`,
    creee: (succes: string) => `${succes}. ${avecMajuscule(termes.demande)} créée.`,
    lienVers: (chemin: string) => `Ouvrir la ${termes.demande} de ${chemin}`,
    aucunChangement: `Aucun changement : aucune ${termes.abreviation} créée.`,
    echecDansLeJournal: (message: string) => `Échec ${termes.forge} : ${message}`,
    echec: `Échec ${termes.forge}. Le fichier a été téléchargé sur votre poste.`,
    echecNotifie: `Échec ${termes.forge} : fichier téléchargé localement.`,
  };
}
