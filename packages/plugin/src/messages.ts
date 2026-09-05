/**
 * Le domicile unique des messages qui traversent la frontière sandbox ↔ UI.
 *
 * **Pourquoi ce fichier existe (U0.6).** Les demandes de l'UI étaient typées
 * dans `code.ts` ; les messages qui partent dans l'autre sens ne l'étaient
 * NULLE PART. L'UI les reconnaissait par une suite de `if` sur `message.type`,
 * et le sandbox les fabriquait à la main, littéral par littéral, à neuf endroits
 * différents. Deux listes qui ne se croisent jamais : ajouter un type d'un côté
 * sans l'autre ne casse rien de visible — le message part, personne ne l'écoute,
 * et le silence a l'air d'un cas qui ne s'est pas produit. La refonte de
 * l'interface en ajoute plusieurs, dont des structures et non plus des phrases ;
 * c'est avant le dixième qu'il fallait un endroit.
 *
 * **Ce que ce type contraint, et ce qu'il ne contraint pas.** L'UI est écrite en
 * JavaScript : rien ne l'oblige à respecter cette liste, et ce fichier ne le
 * prétend pas. Il contraint le CÔTÉ SANDBOX — chaque envoi passe par une porte
 * typée (`versUi` dans `code.ts`), donc aucun message ne peut plus partir sans
 * figurer ici. Pour l'UI, il vaut comme liste de référence : l'endroit où lire
 * ce qu'elle peut recevoir. Passer l'UI en TypeScript rendrait la contrainte
 * réciproque ; c'est une décision à prendre une fois, et elle est posée en U6.2.
 */
import type { PublicSettings, SettingsInput } from './config';
import type { EtatConnexion, EtatDuDepot } from './connexion';
import type { Cible } from './cible';
import type { CodeVerdict } from './prevol';

/**
 * Ce qu'un handler d'export dit de son avancement (U2.6).
 *
 * Il ANNONCE, il ne décide de rien : le moteur nomme l'étape qu'il traverse, et
 * seul `code.ts` sait qu'il faut en faire un message. C'est ce qui permet à
 * cette annonce de traverser le moteur sans lui donner de dépendance vers l'UI.
 */
export type Annonce = (etape: string) => void;

/** Niveau d'une ligne de journal : il décide de sa couleur et de son marqueur. */
export type LogLevel = 'info' | 'success' | 'error';

/** Ce que l'UI demande au sandbox. */
export type UiRequest =
  /**
   * Analyser, puis publier : deux demandes, jamais une (U3.1). L'analyse
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
   * plugin tout seul — aucune API ne l'expose et rien ne le fait à sa place —,
   * donc la demande vient de l'UI, et le sandbox seul peut l'exécuter (U1.10).
   */
  | { type: 'resize'; largeur: number; hauteur: number }
  /**
   * Montrer le calque dont un avertissement parle (U4.4).
   *
   * Le sandbox seul peut poser une sélection et déplacer la vue. Ce n'est pas
   * une modification du document — voir « Sélectionner et cadrer ne sont pas
   * modifier » dans `SPEC.md` —, et le plugin n'appelle jamais `commitUndo()`,
   * ce qu'un test de source refuse.
   */
  | { type: 'montrer-le-calque'; nodeId: string };

/** Ce que le sandbox dit à l'UI. */
export type PluginMessage =
  /** Les champs publics rechargés : le PAT ne traverse jamais cette frontière. */
  | { type: 'settings'; settings: PublicSettings }
  | { type: 'settings-validation'; errors: Partial<Record<keyof SettingsInput, string>> }
  | { type: 'settings-save-error' }
  /**
   * L'état de la connexion, et ce que le designer doit en faire (U5.2).
   *
   * Les trois champs viennent d'un seul appel à `etatDeConnexion` : `state`
   * habille la pastille, `pastille` la nomme, `geste` dit quoi corriger et
   * n'existe que lorsqu'il y a quelque chose à corriger. Ils ne sont pas trois
   * décisions, mais une seule, rendue sous trois formes.
   */
  | { type: 'connection'; state: EtatConnexion['state']; pastille: string; geste: string | null }
  /**
   * Où le repository range ses fichiers, tel qu'il le dit lui-même (U5.1).
   *
   * Les trois champs valent `null` tant que rien n'est connu — avant le premier
   * test de connexion, ou quand il échoue. `source` nomme QUI a décidé : le
   * fichier du repository, ou les réglages du plugin. C'est la question que le
   * designer se posait après coup, en lisant une ligne de journal.
   */
  | ({ type: 'depot' } & EtatDuDepot)
  /**
   * Ce sur quoi l'export va porter (U2.1).
   *
   * Une STRUCTURE, pas une phrase : le nom du composant n'existait que dans la
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
   * Une ligne de journal. `level` est déclaré ici parce que la distinction qui
   * structure tout le projet — un avertissement demande un geste, une note n'en
   * demande aucun — n'est aujourd'hui portée que par le caractère de puce, et se
   * perd donc en route. Lui donner un champ est le préalable ; l'utiliser est
   * U4.1.
   */
  | { type: 'log'; text: string; level?: LogLevel }
  /** L'état de l'action en cours, annoncé ET tracé dans le journal. */
  | { type: 'status'; state: 'loading' | 'success' | 'error'; text: string }
  | { type: 'download'; filename: string; content: string }
  | { type: 'pull-request'; url: string; path: string }
  /**
   * La version de schéma que ce bundle produit. Elle arrive une fois, à
   * l'ouverture, et l'UI la pose en pied de page : Figma peut servir un bundle
   * plus ancien que celui du disque, et c'est exactement l'information qu'un
   * export « sans changement » rend indispensable (U0.1).
   */
  | { type: 'schema-version'; version: string }
  /**
   * L'étape en cours. Elle ne va QUE dans la note : un journal de quatre lignes
   * par export dirait le déroulé d'un traitement que personne ne relit, et
   * noierait les avertissements qui, eux, demandent un geste.
   */
  | { type: 'phase'; texte: string }
  /** Ce que l'export des tokens emporterait s'il partait maintenant (U2.4). */
  | { type: 'tokens'; resume: string }
  /**
   * Un point à corriger dans Figma, EN TROIS PARTIES (U4.8).
   *
   * **Le champ `nature` a disparu avec ce qu'il distinguait (U4.7).** Le canal
   * portait aussi des « constats » : ce que le contrat publie sous une forme
   * inhabituelle mais complète — une piste de grille en pixels, un calque hors
   * du flux, une rotation, une structure propre à un variant. Ils ne sont plus
   * émis nulle part, et un champ qui ne sépare plus rien vaut moins que son
   * absence : il laisse croire à un second cas qui n'existe pas.
   *
   * **Le champ `texte` a disparu au profit des trois parties.** Un paragraphe
   * unique obligeait l'interface à lire le geste en dernier, après deux phrases
   * de contexte — ou à découper une `string` dans le DOM, ce qui reviendrait à
   * redéfinir dans l'UI une grammaire dont le moteur est propriétaire. Les
   * parties voyagent donc telles que le moteur les a écrites, et la phrase
   * compacte que publient `meta.diagnostics` et la pull request s'en dérive
   * (`phraseDe`), sans seconde rédaction.
   *
   * Ce qui arrive ici demande toujours un geste dans Figma. Ce qui BLOQUE, lui,
   * ne passe pas par ce message : c'est le verdict de rang 1, et c'est la seule
   * chose que l'interface écrive en rouge.
   */
  | {
      type: 'diagnostic';
      /** « Layer « Border » : l'alignement du stroke est illisible. » */
      titre: string;
      /** Ce que le développeur n'aura pas. Une phrase. */
      impact: string;
      /** Le geste exact à faire dans Figma. Une phrase impérative. */
      action: string;
      /**
       * Le node du SUJET, quand le sujet en désigne un (U4.3).
       *
       * Absent quand le message nomme un text style, une variable, une règle,
       * ou un calque agrégé sur toute la matrice — et cette absence est une
       * réponse, pas un trou : `localisation.ts` en porte les trois raisons.
       * L'interface n'offre donc « Afficher dans Figma » que sur les cartes qui
       * mènent quelque part.
       */
      nodeId?: string;
    }
  /**
   * Ce que l'analyse conclut, et l'action qu'elle propose (U3.1).
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
