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
  /** `local` : l'export local est activé, un choix du designer et non une panne. */
  state: 'checking' | 'connected' | 'disconnected' | 'local';
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
  /** Le nom du dépôt actif, dernier segment de son adresse. */
  nom?: string;
  /** Pourquoi aucun dépôt n'est visé, pour la cause `non-configure`. */
  repli?: CauseDeRepli;
};

/**
 * L'unique autorité sur ce que l'interface affiche d'une connexion.
 *
 * Sans termes, la forge n'est pas connue : c'est le cas d'une configuration
 * absente, et les textes nomment alors les deux demandes. La pastille nomme le
 * dépôt actif, dans ses succès comme dans ses échecs : avec plusieurs dépôts,
 * « connecté » seul ne dit pas où l'export ira.
 */
export function etatDeConnexion(cause: CauseConnexion, precision: PrecisionConnexion = {}): EtatConnexion {
  const termes = precision.termes ?? null;
  const forge = termes?.forge ?? 'la forge';
  const depot = termes?.depot ?? 'repository';
  const jeton = termes?.nomDuJeton ?? 'jeton d’accès';
  const nomme = (texte: string) => (precision.nom ? `${precision.nom} : ${texte}` : texte);
  switch (cause) {
    case 'verification':
      return { state: 'checking', pastille: nomme('connexion…'), geste: null };
    case 'connecte':
      return { state: 'connected', pastille: `${precision.nom ?? depot} connecté`, geste: null };
    case 'non-configure':
      // Le designer a choisi l'export local : aucun geste n'est attendu de lui.
      if (precision.repli === 'debranche') return { state: 'local', pastille: 'export local', geste: null };
      return precision.repli === 'aucun-actif'
        ? {
            state: 'disconnected',
            pastille: 'aucun dépôt actif',
            geste:
              'Cliquez « Se connecter » sur un dépôt de la configuration. Sans dépôt actif, un export est '
              + 'téléchargé sur votre poste au lieu d’ouvrir une pull request ou une merge request.',
          }
        : {
            state: 'disconnected',
            pastille: 'aucun dépôt',
            geste:
              'Ajoutez un dépôt et son jeton dans la configuration. Sans dépôt, un export est téléchargé '
              + 'sur votre poste au lieu d’ouvrir une pull request ou une merge request.',
          };
    case 'jeton-refuse':
      return {
        state: 'disconnected',
        pastille: nomme('jeton refusé'),
        geste:
          `${termes?.forge ?? 'La forge'} refuse ce ${jeton}. Créez-en un nouveau sur ${forge}, `
          + 'puis collez-le dans le champ ci-dessus.',
      };
    case 'acces-refuse':
      return {
        state: 'disconnected',
        pastille: nomme('accès refusé'),
        geste:
          `Le jeton est reconnu, mais il n’a pas les droits sur ce ${depot}. `
          + `Donnez-lui ${termes?.droits ?? 'le droit d’écrire et d’ouvrir une demande de fusion'}.`,
      };
    case 'depot-introuvable':
      return {
        state: 'disconnected',
        pastille: nomme(`${depot} introuvable`),
        geste:
          `${termes?.forge ?? 'La forge'} ne trouve aucun ${depot} à cette adresse avec ce jeton. `
          + `Vérifiez l’URL. Si le ${depot} est privé, donnez au jeton l’accès à ce ${depot}.`,
      };
    case 'reseau':
      return {
        state: 'disconnected',
        pastille: nomme(`${termes?.forge ?? 'forge'} injoignable`),
        geste: `La requête vers ${forge} n’a pas abouti. Vérifiez votre connexion, puis réessayez.`,
      };
    case 'depot-mal-decrit':
      return {
        state: 'disconnected',
        pastille: nomme(`${NOM_CONFIGURATION} fautif`),
        geste:
          `Un développeur doit corriger le fichier qui décrit ce ${depot}. `
          + 'Tant qu’il est fautif, aucun export ne peut être publié. '
          + (precision.detail ?? ''),
      };
    case 'forge-indisponible':
      return {
        state: 'disconnected',
        pastille: nomme(`${termes?.forge ?? 'forge'} indisponible`),
        geste:
          `${termes?.forge ?? 'La forge'} a répondu ${precision.statut ?? 'une erreur'} à la demande du plugin. `
          + 'Réessayez dans un moment. '
          + 'Si la réponse ne change pas, un mainteneur du plugin doit la regarder.',
      };
  }
}

/** Ce qu'une carte de la liste des dépôts affiche après le test de son dépôt. */
export type EtatDeCarte = {
  etat: EtatConnexion['state'];
  /** Le statut court, à droite du nom de la carte repliée. */
  statut: string;
  /** Le geste, en tête de la carte dépliée. `null` quand tout va bien. */
  geste: string | null;
};

/**
 * Le statut et le geste d'une carte. Le geste s'affiche au-dessus des champs
 * de la carte : pour un jeton refusé ou un dépôt introuvable, il désigne le
 * champ où agir, ce que la pastille de l'en-tête ne peut pas faire.
 */
export function etatDeCarte(cause: CauseConnexion, precision: PrecisionConnexion = {}): EtatDeCarte {
  const termes = precision.termes ?? null;
  const forge = termes?.forge ?? 'La forge';
  const depot = termes?.depot ?? 'dépôt';
  const { state, geste } = etatDeConnexion(cause, precision);
  const statuts: Record<CauseConnexion, string> = {
    verification: 'Connexion…',
    connecte: 'Connecté',
    'non-configure': 'Jeton manquant',
    'jeton-refuse': 'Jeton refusé',
    'acces-refuse': 'Accès refusé',
    'depot-introuvable': `${avecMajuscule(depot)} introuvable`,
    'depot-mal-decrit': `${NOM_CONFIGURATION} fautif`,
    reseau: `${termes?.forge ?? 'Forge'} injoignable`,
    'forge-indisponible': `${termes?.forge ?? 'Forge'} indisponible`,
  };
  const gestes: Partial<Record<CauseConnexion, string>> = {
    'jeton-refuse': `${forge} refuse ce ${termes?.nomDuJeton ?? 'jeton d’accès'}. Collez-en un nouveau ci-dessous, puis enregistrez.`,
    'depot-introuvable':
      `${forge} ne trouve aucun ${depot} à cette adresse avec ce jeton. `
      + `Si le ${depot} est privé, donnez au jeton l’accès à ce ${depot}. `
      + 'Si l’adresse est fausse, supprimez ce dépôt, puis ajoutez la bonne adresse.',
  };
  return { etat: state, statut: statuts[cause], geste: gestes[cause] ?? geste };
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
export function gesteApresEchecDePublication(statut: number | null, termes: TermesDeForge, reponse = ''): string {
  if (statut === null && reponse) {
    return `${reponse} Corrigez ce point, puis relancez la publication.`;
  }
  if (statut !== null && termes.statutsDeRegle.includes(statut)) {
    return reponse
      ? `${reponse} Transmettez ce message à un mainteneur du ${termes.depot} : une règle de push du ${termes.depot} ou une branche du même nom produit ce refus.`
      : `${termes.forge} a refusé l’écriture sans donner de raison. Un mainteneur du ${termes.depot} doit vérifier ses règles de push.`;
  }
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
  /** La forge, le dépôt et sa branche, ou la phrase du repli sur l'écran de travail. */
  ligne: string | null;
  /**
   * Pourquoi l'export sera téléchargé sur le poste, `null` quand un dépôt est
   * visé. Le repli est un comportement correct, mais il était subi : découvert
   * à l'arrivée, après le travail, alors que le bouton avait promis une pull
   * request.
   */
  repli: CauseDeRepli | null;
};

/**
 * Pourquoi aucun dépôt n'est visé : aucun n'est enregistré, aucun n'est actif,
 * ou l'export local est activé.
 */
export type CauseDeRepli = 'aucun-depot' | 'aucun-actif' | 'debranche';

/**
 * Ce que le plugin dit d'un repli, à trois endroits : la ligne sous la carte
 * du composant avant le clic, le verdict de l'analyse, et le journal de la
 * publication.
 */
export const TEXTES_DE_REPLI: Record<CauseDeRepli, { ligne: string; verdict: string; journal: string }> = {
  'aucun-depot': {
    ligne: 'Aucun dépôt enregistré. L’export sera téléchargé sur votre poste.',
    verdict: 'Aucun dépôt enregistré.',
    journal: 'Aucun dépôt enregistré : téléchargement sur votre poste.',
  },
  'aucun-actif': {
    ligne: 'Aucun dépôt actif. L’export sera téléchargé sur votre poste.',
    verdict: 'Aucun dépôt actif.',
    journal: 'Aucun dépôt actif : téléchargement sur votre poste.',
  },
  debranche: {
    ligne: 'Export local : l’export sera téléchargé sur votre poste.',
    verdict: 'Export local.',
    journal: 'Export local : téléchargement sur votre poste.',
  },
};

/**
 * La phrase que la configuration affiche sur l'endroit où les exports vont.
 *
 * Elle répond à la question que le designer se posait après coup, en lisant une
 * ligne de journal : qui a décidé de l'endroit ? Deux réponses, et deux
 * seulement, parce qu'il n'y a plus qu'une autorité : le repository l'a écrit,
 * ou il laisse s'appliquer les défauts que le contrôle applique aussi.
 *
 * Gestion des tokens désactivée, la phrase ne parle que des composants : le
 * chemin des tokens reste validé par `repositoryLayout`, mais aucun export ne
 * l'emploie.
 */
export function etatDuDepot(
  layout: LayoutConnu | null,
  depot: DepotVise | CauseDeRepli = 'aucun-depot',
  tokens = true,
): EtatDuDepot {
  // Sans dépôt visé, la ligne dit ce qui va se passer, avant le clic.
  const situation = typeof depot === 'string'
    ? { ligne: TEXTES_DE_REPLI[depot].ligne, repli: depot }
    : { ligne: `${depot.forge} · ${depot.projet} · ${depot.baseBranch}`, repli: null };

  if (!layout) return { ...situation, resume: null };

  if (layout.source !== NOM_CONFIGURATION) {
    return {
      ...situation,
      resume: {
        ton: 'avertissement',
        titre: `Attention, le ${NOM_CONFIGURATION} de ce repository n'est pas configuré.`,
        detail: `Le fichier de configuration ${NOM_CONFIGURATION} permet de définir l'endroit où `
          + `seront poussés ${tokens ? 'les composants et les tokens' : 'les composants'}.`,
      },
    };
  }

  return {
    ...situation,
    resume: {
      ton: 'info',
      titre: tokens
        ? `Contrats dans ${layout.components}, tokens dans ${layout.tokens}.`
        : `Contrats dans ${layout.components}.`,
      detail: `Ce repository le déclare dans son ${NOM_CONFIGURATION}.`,
    },
  };
}

/**
 * Le refus d'une publication dont la destination a changé depuis l'analyse.
 * Il dit le fait sans en supposer la cause : le changement a pu venir d'une
 * autre fenêtre du plugin. `tokens` quand seul le réglage des tokens a changé,
 * `local` quand l'export local est activé ; sinon le nom du dépôt, `null` quand
 * aucun dépôt n'est actif.
 */
export function refusDeDestinationChangee(changement: { nom: string | null } | 'tokens' | 'local'): string {
  const destination = changement === 'tokens'
    ? 'la gestion des tokens a changé'
    : changement === 'local'
      ? 'les exports sont téléchargés sur votre poste'
      : changement.nom
      ? `le dépôt actif est maintenant ${changement.nom}`
      : 'aucun dépôt n’est actif';
  return `La destination a changé depuis l’analyse : ${destination}. Relancez l’analyse.`;
}

/** Le refus d'une commande des tokens quand leur gestion est désactivée sur ce poste. */
export const TOKENS_DESACTIVES =
  'La gestion des tokens est désactivée. Activez « Gérer les tokens » dans l’onglet Général de la configuration.';

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
