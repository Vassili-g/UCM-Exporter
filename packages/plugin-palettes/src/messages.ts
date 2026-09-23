/**
 * Les messages qui traversent la frontière sandbox et interface ([UI-07]).
 *
 * Le type contraint les deux sens : les envois du sandbox par `versUi` dans
 * `code.ts`, ceux de l'interface par `versSandbox` dans `ui/pont.ts`. Un
 * message du sandbox entre ici au lot qui le joue dans la galerie :
 * `tests/galerie.test.ts` refuse un membre de `PluginMessage` sans état.
 */
import type { Classement, Recette } from 'ucm-couleur';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { ProfilDuDocument } from './lecture';

/** Ce que l'interface demande au sandbox. `demande` numérote la demande ([UI-08]). */
export type UiRequest =
  | { type: 'lire-etat'; demande: number }
  /**
   * Seule demande de ce lot qui écrit dans le document : la recette, sous la
   * clé partagée, après validation et contrôle de l'empreinte lue ([REC-10]).
   */
  | { type: 'ranger-recette'; demande: number; recette: Recette; empreinteLue: string | null }
  | DemandeDeTaille;

/** Ce que le sandbox envoie à l'interface. */
export type PluginMessage =
  /**
   * L'état du fichier, en réponse à `lire-etat` et après chaque rangement :
   * la recette classée ([REC-03]), l'empreinte du texte rangé, `null` sans
   * recette, et le profil de couleur du document.
   */
  | { type: 'etat'; demande: number; classement: Classement; empreinte: string | null; profil: ProfilDuDocument };
