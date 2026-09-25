/**
 * Les messages qui traversent la frontière sandbox et interface ([UI-07]).
 *
 * Le type contraint les deux sens : les envois du sandbox par `versUi` dans
 * `code.ts`, ceux de l'interface par `versSandbox` dans `ui/pont.ts`. Un
 * message du sandbox entre ici au lot qui le joue dans la galerie :
 * `tests/galerie.test.ts` refuse un membre de `PluginMessage` sans état.
 *
 * `demande` numérote chaque demande de l'interface, d'un seul compteur ; une
 * réponse porte le numéro de la demande qui l'a produite ([UI-08]).
 */
import type { Classement, Recette } from 'ucm-couleur';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { IssueDuRetrait, ResultatDuDessin } from './ecriture/planche';
import type { IssueDuRangement } from './ecriture/recette';
import type { EtatDeLaPlanche, ProfilDuDocument } from './lecture';

/** Ce que l'interface demande au sandbox. */
export type UiRequest =
  /**
   * `recherche: 'fichier'` étend la recherche des cadres à toutes les pages,
   * au geste explicite du designer (V8.6) ; sinon, la seule page de la planche.
   */
  | { type: 'lire-etat'; demande: number; recherche?: 'fichier' }
  /**
   * Première écriture : la recette, sous la clé partagée, après validation et
   * contrôle de l'empreinte lue ([REC-10]).
   */
  | { type: 'ranger-recette'; demande: number; recette: Recette; empreinteLue: string | null }
  /**
   * Seconde écriture : les cadres des palettes nommées, calculés par le sandbox
   * depuis la recette rangée, jamais depuis des hexas de l'interface ([ARC-11]).
   */
  | { type: 'dessiner'; demande: number; palettes: string[]; grille: boolean; empreinteLue: string | null; etrangersConfirmes: string[] }
  | { type: 'voir-sur-la-planche'; demande: number; page: string; cadres: string[] }
  /**
   * Troisième écriture : « Supprimer définitivement » le cadre d'une palette
   * supprimée, que le sandbox vérifie avant de le retirer ([PLA-27]).
   */
  | { type: 'retirer-cadre'; demande: number; palette: string; cadre: string }
  | DemandeDeTaille;

export type { IssueDuRetrait, ResultatDuDessin };

/** Ce que le sandbox envoie à l'interface. */
export type PluginMessage =
  /**
   * L'état du fichier, en réponse à `lire-etat` : la recette classée
   * ([REC-03]), l'empreinte du texte rangé, `null` sans recette, le profil
   * de couleur du document et les cadres de la planche.
   */
  | { type: 'etat'; demande: number; classement: Classement; texte: string; empreinte: string | null; profil: ProfilDuDocument; planche: EtatDeLaPlanche }
  /** L'issue d'un rangement : la nouvelle empreinte, ou le refus ([REC-10]). */
  | { type: 'rangement'; demande: number; issue: IssueDuRangement }
  /** Le cadre en cours de dessin ([PLA-24]). */
  | { type: 'progression'; demande: number; fait: number; total: number; nom: string }
  | { type: 'dessin'; demande: number; resultat: ResultatDuDessin }
  /** L'issue de « Supprimer définitivement », en réponse à `retirer-cadre`. */
  | { type: 'retrait'; demande: number; issue: IssueDuRetrait };
