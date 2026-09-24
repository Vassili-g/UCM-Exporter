/**
 * Les demandes de l'interface au sandbox et le sort de leurs réponses
 * ([UI-08], [REC-06], [REC-10]).
 *
 * Un seul compteur numérote toutes les demandes. Un état n'est accepté que
 * s'il répond à la dernière demande envoyée : un état demandé avant un
 * rangement décrirait la recette d'avant. Un seul rangement est en vol ; un
 * geste qui arrive pendant ce temps attend la réponse, puis part avec
 * l'empreinte qu'elle apporte. Après un refus, rien ne se range avant
 * « Recharger ». Un dessin part quand plus rien n'est à ranger : il se fait
 * sur la recette que l'aperçu montre.
 */
import type { Recette, Refus } from 'ucm-couleur';

import type { PluginMessage, UiRequest } from '../messages';

/** Ce que l'indication de rangement affiche. */
export type StatutDuRangement = 'lu' | 'en-cours' | 'range' | 'refuse' | 'invalide';

/** Ce qu'un dessin demande : des palettes, la grille, et les calques étrangers que le designer accepte de perdre (D-H). */
export interface DemandeDeDessin {
  readonly palettes: readonly string[];
  readonly grille: boolean;
  readonly etrangersConfirmes: readonly string[];
}

export interface Frontiere {
  lireLEtat(): void;
  lireLaSelection(): void;
  ranger(recette: Recette): void;
  /**
   * Dessine les palettes nommées, dès que la recette affichée est rangée. Un
   * rangement refusé entre-temps abandonne le dessin : `surAbandon` le dit.
   */
  dessiner(demande: DemandeDeDessin, surAbandon: () => void): void;
  /**
   * Ouvre la planche et cadre les cadres (E18). La demande n'attend aucune
   * réponse : son numéro ne rend caduc aucun état attendu.
   */
  voirSurLaPlanche(page: string, cadres: readonly string[]): void;
  /** Vrai quand la progression ou le résultat répond au dernier dessin demandé. */
  accepterDessin(message: Extract<PluginMessage, { type: 'progression' | 'dessin' }>): boolean;
  /** Vrai quand l'état répond à la dernière demande : l'interface l'affiche. */
  accepterEtat(message: Extract<PluginMessage, { type: 'etat' }>): boolean;
  /** Vrai quand la couleur répond à la dernière lecture de la sélection. */
  accepterSelection(message: Extract<PluginMessage, { type: 'selection' }>): boolean;
  recevoirRangement(message: Extract<PluginMessage, { type: 'rangement' }>): void;
  /** L'empreinte de la recette rangée, telle que la dernière réponse l'a apportée. */
  empreinte(): string | null;
  /** Vrai quand aucun rangement n'est en vol ni en attente. */
  auRepos(): boolean;
  statut(): StatutDuRangement;
}

export function createFrontiere(
  envoyer: (demande: UiRequest) => void,
  surStatut: (statut: StatutDuRangement, refus: readonly Refus[]) => void = () => {},
): Frontiere {
  let compteur = 0;
  let derniereDemande = 0;
  let derniereSelection = 0;
  let dernierRangement = 0;
  let empreinte: string | null = null;
  let enVol = false;
  let enAttente: Recette | null = null;
  let dessinEnAttente: { demande: DemandeDeDessin; surAbandon: () => void } | null = null;
  let dernierDessin = 0;
  let courant: StatutDuRangement = 'lu';

  function numeroter(): number {
    compteur += 1;
    derniereDemande = compteur;
    return compteur;
  }

  function poser(statut: StatutDuRangement, refus: readonly Refus[] = []): void {
    courant = statut;
    surStatut(statut, refus);
  }

  function envoyerDessin({ palettes, grille, etrangersConfirmes }: DemandeDeDessin): void {
    dernierDessin = numeroter();
    envoyer({
      type: 'dessiner',
      demande: dernierDessin,
      palettes: [...palettes],
      grille,
      empreinteLue: empreinte,
      etrangersConfirmes: [...etrangersConfirmes],
    });
  }

  function envoyerRangement(recette: Recette): void {
    dernierRangement = numeroter();
    enVol = true;
    poser('en-cours');
    envoyer({ type: 'ranger-recette', demande: dernierRangement, recette, empreinteLue: empreinte });
  }

  return {
    lireLEtat() {
      envoyer({ type: 'lire-etat', demande: numeroter() });
    },
    lireLaSelection() {
      derniereSelection = numeroter();
      envoyer({ type: 'lire-selection', demande: derniereSelection });
    },
    ranger(recette) {
      if (courant === 'refuse') return;
      if (enVol) enAttente = recette;
      else envoyerRangement(recette);
    },
    dessiner(demande, surAbandon) {
      if (enVol || enAttente) dessinEnAttente = { demande, surAbandon };
      else envoyerDessin(demande);
    },
    voirSurLaPlanche(page, cadres) {
      compteur += 1;
      envoyer({ type: 'voir-sur-la-planche', demande: compteur, page, cadres: [...cadres] });
    },
    accepterDessin(message) {
      return message.demande === dernierDessin;
    },
    accepterEtat(message) {
      if (message.demande < derniereDemande) return false;
      empreinte = message.empreinte;
      enVol = false;
      enAttente = null;
      poser('lu');
      return true;
    },
    accepterSelection(message) {
      return message.demande === derniereSelection;
    },
    recevoirRangement(message) {
      if (message.demande !== dernierRangement) return;
      enVol = false;
      const { issue } = message;
      if (issue.issue === 'rangee') {
        empreinte = issue.empreinte;
        const suivante = enAttente;
        enAttente = null;
        if (suivante) envoyerRangement(suivante);
        else {
          poser('range');
          const dessin = dessinEnAttente;
          dessinEnAttente = null;
          if (dessin) envoyerDessin(dessin.demande);
        }
      } else {
        enAttente = null;
        const abandonne = dessinEnAttente;
        dessinEnAttente = null;
        if (issue.issue === 'modifiee-ailleurs') poser('refuse');
        else poser('invalide', issue.refus);
        abandonne?.surAbandon();
      }
    },
    empreinte: () => empreinte,
    auRepos: () => !enVol && enAttente === null,
    statut: () => courant,
  };
}
