/**
 * Le domicile unique des messages qui traversent la frontière sandbox ↔ UI.
 *
 * Le type contraint les deux sens : les envois du sandbox par `versUi` dans
 * `code.ts`, ceux de l'interface par `versSandbox` dans `ui/pont.ts`. Un champ
 * renommé ici fait donc échouer la construction des deux côtés.
 */
import type { PublicSettings, SettingsInput } from './config';
import type { EtatConnexion, EtatDuDepot } from './connexion';
import type { Cible } from './cible';
import type { CodeVerdict } from './prevol';

/**
 * Annonce une étape sans donner au moteur de dépendance vers l'UI.
 */
export type Annonce = (etape: string) => void;

/** Niveau d'une ligne de compte rendu : il décide de sa couleur et de son marqueur. */
export type LogLevel = 'info' | 'success' | 'error';

/** Ce que l'UI demande au sandbox. */
export type UiRequest =
  /**
   * Analyser, puis publier : deux demandes, jamais une. L'analyse
   * n'écrit rien ; la publication consomme ce qu'elle a produit, et
   * `annuler` prend effet entre deux étapes.
   */
  | {
      type:
        | 'analyser-composant'
        | 'analyser-tokens'
        | 'publier'
        | 'annuler'
        | 'supprimer-token'
        | 'ui-ready';
    }
  | { type: 'save-settings'; settings: SettingsInput }
  | { type: 'open-external'; url: string }
  /**
   * La poignée de redimensionnement. Figma ne redimensionne pas une fenêtre de
   * plugin tout seul (aucune API ne l'expose et rien ne le fait à sa place),
   * donc la demande vient de l'UI, et le sandbox seul peut l'exécuter.
   */
  | { type: 'resize'; largeur: number; hauteur: number }
  /**
   * Sélectionne et cadre le calque cité, sans modifier le document Figma.
   */
  | { type: 'montrer-le-calque'; nodeId: string };

/** Ce que le sandbox dit à l'UI. */
export type PluginMessage =
  /** Les champs publics rechargés : le PAT ne traverse jamais cette frontière. */
  | { type: 'settings'; settings: PublicSettings }
  | { type: 'settings-validation'; errors: Partial<Record<keyof SettingsInput, string>> }
  | { type: 'settings-save-error' }
  /**
   * Décision unique rendue en état visuel, libellé et geste éventuel.
   */
  | { type: 'connection'; state: EtatConnexion['state']; pastille: string; geste: string | null }
  /**
   * Chemins effectifs ; `source` indique si le dépôt ou le plugin les décide.
   * Les champs valent `null` tant que la réponse est inconnue.
   */
  | ({ type: 'depot' } & EtatDuDepot)
  /**
   * Ce sur quoi l'export va porter.
   *
   * Une structure, pas une phrase : le nom du composant n'existait que dans la
   * note d'état, que le premier clic écrase. Ce que l'interface doit garder
   * affiché ne peut pas voyager dans un texte qu'un autre texte remplace.
   */
  | {
      type: 'cible';
      cible: Cible | null;
      /** « Component set · 12 variants », composé par `detailDeCible`. */
      detail: string | null;
      raison: string | null;
      avertissement: string | null;
    }
  /**
   * Ligne de compte rendu. `level` conserve la distinction : un avertissement demande
   * un geste, une note n'en demande aucun.
   */
  | { type: 'log'; text: string; level?: LogLevel }
  /** L'état de l'action en cours, annoncé et repris dans le compte rendu. */
  | { type: 'status'; state: 'loading' | 'success' | 'error'; text: string }
  | { type: 'download'; filename: string; content: string }
  | { type: 'pull-request'; url: string; path: string }
  /**
   * La version de schéma que ce bundle produit. Elle arrive une fois, à
   * l'ouverture, et l'UI la pose en pied de page : Figma peut servir un bundle
   * plus ancien que celui du disque, et c'est exactement l'information qu'un
   * export « sans changement » rend indispensable.
   */
  | { type: 'schema-version'; version: string }
  /**
   * L'étape en cours. Elle ne va que dans la note : quatre lignes de compte rendu
   * par export dirait le déroulé d'un traitement que personne ne relit, et
   * noierait les avertissements qui, eux, demandent un geste.
   */
  | { type: 'phase'; texte: string }

  /** Résumé des variables locales qui détermine si l'analyse est disponible. */
  | { type: 'tokens'; resume: string; presents: boolean }

  /** Point exigeant un geste dans Figma, conservé dans ses trois parties. */
  | {
      type: 'diagnostic';
      /** « Layer « Border » : l'alignement du stroke est illisible. » */
      titre: string;
      /** Ce que le développeur n'aura pas. Une phrase. */
      impact: string;
      /** Le geste exact à faire dans Figma. Une phrase impérative. */
      action: string;
      /**
       * Node du sujet. Absent pour un style, une variable ou un agrégat ; l'UI
       * ne propose alors aucune navigation.
       */
      nodeId?: string;
    }
  /**
   * Ce que l'analyse conclut, et l'action qu'elle propose.
   *
   * `action` est le libellé du bouton de publication, et `null` quand il n'y a
   * rien à publier : c'est ainsi que le clic supplémentaire n'est demandé que
   * lorsqu'il achète quelque chose.
   */
  | {
      type: 'verdict';
      code: CodeVerdict;
      texte: string;
      action: string | null;
      etat: '' | 'warning' | 'error';
    };
