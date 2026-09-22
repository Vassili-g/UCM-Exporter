/**
 * Le domicile unique des messages qui traversent la frontière sandbox ↔ UI.
 *
 * Le type contraint les deux sens : les envois du sandbox par `versUi` dans
 * `code.ts`, ceux de l'interface par `versSandbox` dans `ui/pont.ts`. Un champ
 * renommé ici fait donc échouer la construction des deux côtés.
 */
import type { SettingsInput, SettingsValidation } from './config';
import type { NomDeForge } from './forges/termes';
import type { EtatConnexion, EtatDeCarte, EtatDuDepot, ResumeDepot } from './connexion';
import type { Cible } from './cible';
import type { CodeVerdict } from './prevol';
import type { Offre } from './template/sources';

/**
 * Annonce une étape sans donner au moteur de dépendance vers l'UI.
 */
export type Annonce = (etape: string) => void;

/** Niveau d'une ligne de compte rendu : il décide de sa couleur et de son marqueur. */
export type LogLevel = 'info' | 'success' | 'error';

/**
 * D'où vient un résultat d'opération : la clé de destination que l'opération a
 * lue, et le numéro que l'interface a donné à sa demande. L'interface écarte un
 * résultat d'une autre destination ou d'une opération plus ancienne.
 */
export type Provenance = { destination: string; operation: number };

/** Un dépôt enregistré, tel que l'interface le voit : sans son jeton. */
export type DepotPublic = {
  /** `forge:projet`, projet en minuscules : `gitlab:mon-groupe/design-system`. */
  id: string;
  forge: NomDeForge;
  projet: string;
  /** Le dernier segment du projet, calculé par le sandbox. */
  nom: string;
  repoUrl: string;
  baseBranch: string;
  /** La présence d'un jeton, jamais sa valeur. */
  jeton: boolean;
};

/** Ce que `settings` porte : les dépôts, le dépôt actif et les réglages du poste. */
export type ReglagesPublics = {
  /** La clé de destination : l'interface vide ses cartes quand elle change. */
  destination: string;
  /** Le réglage « Gérer les tokens » : la carte des tokens n'est affichée qu'à `true`. */
  tokens: boolean;
  /** Le réglage « Activer l'export local » : aucune carte n'est alors connectée. */
  exportLocal: boolean;
  /** Le dépôt actif enregistré, gardé pendant l'export local pour le rebranchement. */
  actif: string | null;
  depots: DepotPublic[];
};

/** Ce que l'UI demande au sandbox. */
export type UiRequest =
  /**
   * Analyser, puis publier : deux demandes, jamais une. L'analyse n'écrit
   * rien ; la publication consomme ce qu'elle a produit.
   */
  | { type: 'ui-ready' }
  | { type: 'analyser-composant' | 'analyser-tokens'; operation: number }
  | { type: 'publier'; genre: 'component' | 'tokens'; operation: number }
  /**
   * Enregistre un dépôt nouveau (`id` nul), ou la branche et le jeton de
   * l'entrée `id`. `requete` et `carte` reviennent dans `depot-enregistre` :
   * une carte nouvelle porte un identifiant temporaire jusqu'à sa réponse.
   */
  | { type: 'enregistrer-depot'; requete: number; carte: string; id: string | null; settings: SettingsInput }
  /** « Se connecter » : ce dépôt devient la destination des exports, et l'export local se désactive. */
  | { type: 'activer-depot'; id: string }
  /** Retire une entrée entière, jeton compris. */
  | { type: 'supprimer-depot'; id: string }
  /**
   * Remplace une liste de dépôts illisible par une liste vide. Seule écriture
   * qui n'en lit pas l'état : toutes les autres lèvent sur cette liste.
   */
  | { type: 'reinitialiser-depots' }
  /**
   * L'interrupteur « Gérer les tokens ». L'effet est immédiat : une analyse en
   * cours est annulée, une publication va à son terme.
   */
  | { type: 'gerer-tokens'; valeur: boolean }
  /**
   * L'interrupteur « Activer l'export local ». Activé, aucun export ne part vers
   * une forge ; désactivé, le dernier dépôt actif redevient la destination.
   */
  | { type: 'export-local'; valeur: boolean }
  | { type: 'open-external'; url: string }
  /**
   * La poignée de redimensionnement. Figma ne redimensionne pas une fenêtre de
   * plugin tout seul (aucune API ne l'expose et rien ne le fait à sa place),
   * donc la demande vient de l'UI, et le sandbox seul peut l'exécuter.
   */
  | { type: 'resize'; largeur: number; hauteur: number }
  /**
   * Sélectionne et cadre ensemble les calques d'un point à corriger, sans
   * modifier le document Figma.
   */
  | { type: 'montrer-les-calques'; nodeIds: string[] }
  /**
   * La seule demande qui écrive dans le document : elle pose une instance de
   * « .componentRules » à côté du composant sélectionné, ou remplit une
   * instance vierge que le designer a collée. Supprimer cette instance défait
   * la création. Toutes les autres demandes lisent, sélectionnent ou cadrent.
   */
  | { type: 'creer-regles'; operation: number };

/** Ce que le sandbox dit à l'UI. */
export type PluginMessage =
  /** Les réglages publics rechargés : aucun jeton ne traverse cette frontière. */
  | { type: 'settings'; settings: ReglagesPublics }
  /**
   * La réponse à `enregistrer-depot` : l'identité enregistrée en cas de succès,
   * sinon les erreurs par champ ou une erreur générale.
   */
  | { type: 'depot-enregistre'; requete: number; carte: string; id: string | null; erreurs: SettingsValidation['errors'] }
  /**
   * Le test d'un dépôt, actif ou venant d'être enregistré, pour sa seule carte.
   * `generation` croît à chaque test du même dépôt ; `destination` porte les
   * chemins effectifs de ce dépôt quand le test les a lus.
   */
  | ({ type: 'depot-teste'; id: string; generation: number; destination: ResumeDepot | null } & EtatDeCarte)
  /**
   * La liste des dépôts de ce poste ne se lit plus. Aucun `settings` ne peut
   * partir : l'interface n'a alors ni liste, ni dépôt actif, ni destination, et
   * ce message est le seul qui lui dise pourquoi et comment en sortir.
   */
  | { type: 'depots-illisibles'; texte: string; geste: string }
  /**
   * Décision unique rendue en état visuel, libellé et geste éventuel.
   */
  | { type: 'connection'; state: EtatConnexion['state']; pastille: string; geste: string | null }
  /**
   * Le repository visé et l'endroit où l'export ira. `resume` vaut `null` tant
   * que la réponse est inconnue, jamais quand elle est incomplète : depuis que
   * le repository décide seul, un endroit à moitié connu n'existe plus.
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
      selectionId?: string;
      cible: Cible | null;
      /** « Component set · 12 variants », composé par `detailDeCible`. */
      detail: string | null;
      raison: string | null;
      /**
       * Ce que le document permet de créer pour ce composant, `null` quand il
       * n'y a rien à proposer. Facultatif : le premier message d'une sélection
       * part avant la lecture de la page, qui seule le sait. Une même sélection
       * en reçoit un second quand le parcours des autres pages finit.
       */
      offre?: Offre | null;
      avertissement: string | null;
    }
  /**
   * Ligne de compte rendu. `level` conserve la distinction : un avertissement demande
   * un geste, une note n'en demande aucun.
   */
  | ({ type: 'log'; text: string; level?: LogLevel } & Provenance)
  /**
   * L'état de l'action en cours, annoncé et repris dans le compte rendu. Sans
   * provenance, il vient du routeur, hors de toute opération.
   */
  | ({ type: 'status'; state: 'loading' | 'success' | 'error'; text: string } & Partial<Provenance>)
  /** Le téléchargement part toujours ; sa ligne de compte rendu suit la provenance. */
  | ({ type: 'download'; filename: string; content: string } & Partial<Provenance>)
  /** Le lien de la demande ouverte ou déjà en vol, et son libellé dans les mots de la forge. */
  | ({ type: 'demande'; url: string; libelle: string } & Provenance)
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
   *
   * La provenance est partielle : la création des règles ne lit aucun dépôt et
   * n'a donc pas de destination à porter.
   */
  | ({ type: 'phase'; texte: string } & Partial<Provenance>)

  /** Résumé des variables locales qui détermine si l'analyse est disponible. */
  | { type: 'tokens'; resume: string; presents: boolean }

  /**
   * Le module DTCG et la version du format de tokens que porte le fichier que
   * l'analyse vient de produire, lus dans ce fichier. Il informe sans rien
   * demander : la carte le pose au rang 3, sous le résumé.
   */
  | { type: 'format-tokens'; texte: string }

  /** Point exigeant un geste dans Figma, conservé dans ses trois parties. */
  | ({
      type: 'diagnostic';
      /** « Layer « Border » : l'alignement du stroke est illisible. » */
      titre: string;
      /** Ce que le développeur n'aura pas. Une phrase. */
      impact: string;
      /** Le geste exact à faire dans Figma. Une phrase impérative. */
      action: string;
      /**
       * Nodes du sujet : chaque calque qui a produit ce message. Absent pour un
       * style, une variable ou un agrégat ; l'UI ne propose alors aucune
       * navigation.
       */
      nodeIds?: string[];
    } & Provenance)
  /**
   * Ce que l'analyse conclut, et l'action qu'elle propose.
   *
   * `action` est le libellé du bouton de publication, et `null` quand il n'y a
   * rien à publier : c'est ainsi que le clic supplémentaire n'est demandé que
   * lorsqu'il achète quelque chose.
   */
  | ({
      type: 'verdict';
      code: CodeVerdict;
      texte: string;
      action: string | null;
      etat: '' | 'warning' | 'error';
    } & Provenance);
