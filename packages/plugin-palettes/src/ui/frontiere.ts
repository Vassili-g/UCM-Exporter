/**
 * Les demandes de l'interface au sandbox et le sort de leurs réponses
 * ([UI-08], [REC-06], [REC-10]).
 *
 * Un seul compteur numérote toutes les demandes. Un état n'est accepté que
 * s'il répond à la dernière demande envoyée : un état demandé avant un
 * rangement décrirait la recette d'avant. Un seul rangement est en vol ; un
 * geste qui arrive pendant ce temps attend la réponse, puis part avec
 * l'empreinte qu'elle apporte. Après un refus, rien ne se range avant
 * « Recharger ».
 */
import type { Recette, Refus } from 'ucm-couleur';

import type { PluginMessage, UiRequest } from '../messages';

/** Ce que l'indication de rangement affiche. */
export type StatutDuRangement = 'lu' | 'en-cours' | 'range' | 'refuse' | 'invalide';

export interface Frontiere {
  lireLEtat(): void;
  lireLaSelection(): void;
  ranger(recette: Recette): void;
  /** Vrai quand l'état répond à la dernière demande : l'interface l'affiche. */
  accepterEtat(message: Extract<PluginMessage, { type: 'etat' }>): boolean;
  /** Vrai quand la couleur répond à la dernière lecture de la sélection. */
  accepterSelection(message: Extract<PluginMessage, { type: 'selection' }>): boolean;
  recevoirRangement(message: Extract<PluginMessage, { type: 'rangement' }>): void;
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
        else poser('range');
      } else {
        enAttente = null;
        if (issue.issue === 'modifiee-ailleurs') poser('refuse');
        else poser('invalide', issue.refus);
      }
    },
    auRepos: () => !enVol && enAttente === null,
    statut: () => courant,
  };
}
