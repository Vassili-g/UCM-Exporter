/**
 * Le suivi d'un dessin, que les deux onglets montrent ([UI-05], [PLA-24]) : la
 * progression cadre par cadre, puis le résultat et son geste. Pendant le
 * dessin, aucun autre geste n'est possible (section 13.3, « Dessin en
 * cours »).
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { PluginMessage, ResultatDuDessin } from '../messages';
import { blocDeConstat } from './constats';
import type { Frontiere } from './frontiere';
import {
  TEXTES,
  TEXTES_DU_DESSIN,
  dessinInterrompu,
  dessinSurUneAutreRecette,
  palettesDessinees,
  policeIndisponible,
} from './textes';

export type EtatDuDessin =
  | { readonly phase: 'repos' }
  | { readonly phase: 'en-cours'; readonly fait: number; readonly total: number; readonly nom: string }
  | { readonly phase: 'fini'; readonly resultat: ResultatDuDessin };

export interface SuiviDuDessin {
  /** Dessine les palettes nommées ; `noms` donne le nom affiché de chacune. */
  dessiner(palettes: readonly string[], grille: boolean, noms: { readonly [id: string]: string }): void;
  /** Relance le dernier dessin demandé. */
  reessayer(): void;
  /** Le nom affiché de chaque palette du dernier dessin. */
  noms(): { readonly [id: string]: string };
  recevoir(message: Extract<PluginMessage, { type: 'progression' | 'dessin' }>): void;
  etat(): EtatDuDessin;
  abonner(surEtat: (etat: EtatDuDessin) => void): void;
}

export function createSuiviDuDessin(frontiere: Frontiere, surFin: () => void): SuiviDuDessin {
  let courant: EtatDuDessin = { phase: 'repos' };
  let noms: { readonly [id: string]: string } = {};
  let derniereDemande: { palettes: readonly string[]; grille: boolean } | null = null;
  const abonnes: ((etat: EtatDuDessin) => void)[] = [];

  function poser(etat: EtatDuDessin): void {
    courant = etat;
    for (const abonne of abonnes) abonne(etat);
  }

  function dessiner(palettes: readonly string[], grille: boolean, nomsDesPalettes: { readonly [id: string]: string }): void {
    if (courant.phase === 'en-cours' || palettes.length === 0) return;
    noms = nomsDesPalettes;
    derniereDemande = { palettes, grille };
    poser({ phase: 'en-cours', fait: 0, total: palettes.length, nom: noms[palettes[0]] ?? '' });
    frontiere.dessiner(palettes, grille, () => poser({ phase: 'repos' }));
  }

  return {
    dessiner,
    reessayer() {
      if (derniereDemande) dessiner(derniereDemande.palettes, derniereDemande.grille, noms);
    },
    noms: () => noms,
    recevoir(message) {
      if (!frontiere.accepterDessin(message)) return;
      if (message.type === 'progression') {
        poser({ phase: 'en-cours', fait: message.fait, total: message.total, nom: message.nom });
        return;
      }
      poser({ phase: 'fini', resultat: message.resultat });
      surFin();
    },
    etat: () => courant,
    abonner(surEtat) {
      abonnes.push(surEtat);
    },
  };
}

/** Ce qu'un résultat offre comme geste. */
export interface GestesDuResultat {
  voirSurLaPlanche(page: string, cadres: readonly string[]): void;
  reessayer(): void;
  recharger(): void;
}

/**
 * Le résultat d'un dessin en mots, avec son geste ; `null` au repos et pendant
 * le dessin. Un résultat réussi se lit au rang 3 et propose « Voir sur la
 * planche » (E18) ; un échec est un bloquant.
 */
export function blocDuResultat(etat: EtatDuDessin, noms: { readonly [id: string]: string }, gestes: GestesDuResultat): HTMLElement | null {
  if (etat.phase !== 'fini') return null;
  const { resultat } = etat;
  if (resultat.issue === 'dessinee') {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-secondaire ligne-infos';
    const texte = document.createElement('span');
    texte.textContent = palettesDessinees(resultat.cadres.length);
    const voir = document.createElement('button');
    voir.type = 'button';
    voir.className = 'bouton-discret';
    voir.textContent = TEXTES_DU_DESSIN.voirSurLaPlanche;
    voir.addEventListener('click', () => gestes.voirSurLaPlanche(resultat.page, resultat.cadres.map(({ cadre }) => cadre)));
    ligne.append(texte, voir);
    return ligne;
  }
  if (resultat.issue === 'sans-recette') return null;
  const constat = resultat.issue === 'police'
    ? policeIndisponible(resultat.style)
    : resultat.issue === 'interrompue'
      ? dessinInterrompu(noms[resultat.palette] ?? resultat.palette, resultat.message, resultat.dessines)
      : dessinSurUneAutreRecette();
  const bloc = blocDeConstat(constat, 'bloquant');
  bloc.append(resultat.issue === 'modifiee-ailleurs'
    ? createButton({ label: TEXTES.recharger, onClick: () => gestes.recharger() })
    : createButton({ label: TEXTES_DU_DESSIN.reessayer, onClick: () => gestes.reessayer() }));
  return bloc;
}
