/**
 * La génération de la palette ouverte, dans la ligne du titre ([UI-05]) : le
 * bouton se pose à droite de « Palette [nom] », avec le libellé que l'état du
 * cadre donne. Sous le titre, une ligne secondaire porte l'état d'un cadre
 * introuvable ou illisible, la progression, et « Afficher dans Figma » quand
 * le cadre est localisé ; puis une seule zone pour l'erreur ou les écarts de
 * peinture, que chaque génération remplace. La génération n'a pas d'option.
 */
import { createButton, type BoutonUi } from 'ucm-plugin-socle/src/ui/Button';

import type { EtatDuCadre } from '../planche/fraicheur';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import { TEXTES_DU_DESSIN, etatDuCadreEcrit, gesteDeGeneration, progressionDuDessin } from './textes';

/** Le cadre de la palette ouverte : son état, et où le montrer quand il est localisé. */
export interface CadreDeLaPalette {
  readonly etat: EtatDuCadre;
  readonly page: string | null;
  readonly cadre: string | null;
}

export interface GenerationUi {
  /** Le bouton, que l'onglet pose à droite du titre. */
  bouton: BoutonUi;
  /** La ligne secondaire sous le titre : l'onglet y ajoute l'état de l'enregistrement. */
  ligne: HTMLDivElement;
  /** La zone du résultat, sous la ligne secondaire. */
  zone: HTMLDivElement;
  afficherLeCadre(cadre: CadreDeLaPalette): void;
  /** Le dessin en cours ou fini ; `ouverte` est la palette de l'onglet, seule dont le résultat s'affiche. */
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }, ouverte: string): void;
  /** Rend le bouton inactif, avec la raison ; `null` le rend (V12.1). */
  bloquer(raison: string | null): void;
}

export interface GestesDeLaGeneration extends GestesDuResultat {
  generer(): void;
}

/** L'état écrit sous le titre : seuls un cadre introuvable ou illisible en ont un, le bouton dit les autres. */
function etatSousLeTitre(etat: EtatDuCadre): string {
  return etat === 'introuvable' || etat === 'illisible' ? etatDuCadreEcrit(etat) : '';
}

export function createGeneration(gestes: GestesDeLaGeneration): GenerationUi {
  const bouton = createButton({ label: TEXTES_DU_DESSIN.dessiner, variant: 'secondary', onClick: () => gestes.generer() });
  bouton.classList.add('bouton-du-titre');
  const ligne = document.createElement('div');
  ligne.className = 'generation-ligne';
  const etat = document.createElement('span');
  etat.className = 'etat-du-cadre';
  etat.setAttribute('aria-live', 'polite');
  const voir = document.createElement('button');
  voir.type = 'button';
  voir.className = 'lien-de-constat';
  voir.textContent = TEXTES_DU_DESSIN.voirSurLaPlanche;
  voir.hidden = true;
  ligne.append(etat, voir);
  const zone = document.createElement('div');
  zone.className = 'page-stack';
  zone.hidden = true;

  let cadre: CadreDeLaPalette = { etat: 'jamais-dessinee', page: null, cadre: null };
  let progression: string | null = null;
  let blocage: string | null = null;

  voir.addEventListener('click', () => {
    if (cadre.page && cadre.cadre) gestes.voirSurLaPlanche(cadre.page, [cadre.cadre]);
  });

  function rendre(): void {
    const geste = gesteDeGeneration(cadre.etat);
    const enCours = progression !== null;
    bouton.setLabel(enCours ? TEXTES_DU_DESSIN.generationEnCours : geste.libelle);
    bouton.disabled = enCours || blocage !== null || !geste.actif;
    bouton.title = blocage ?? '';
    bouton.dataset.etat = cadre.etat;
    etat.textContent = progression ?? etatSousLeTitre(cadre.etat);
    etat.dataset.etat = enCours ? 'en-cours' : cadre.etat;
    etat.hidden = etat.textContent === '';
    voir.hidden = enCours || !cadre.page || !cadre.cadre;
  }
  rendre();

  return {
    bouton,
    ligne,
    zone,
    afficherLeCadre(suivant) {
      cadre = suivant;
      rendre();
    },
    afficherDessin(suivi, noms, ouverte) {
      progression = suivi.phase === 'en-cours' ? progressionDuDessin(suivi.fait, suivi.total, suivi.nom) : null;
      rendre();
      // Un résultat ne survit pas à son sujet : celui d'une autre palette ne s'affiche pas ici.
      const concerne = suivi.phase !== 'fini' || resultatConcerne(suivi, ouverte);
      const bloc = concerne ? blocDuResultat(suivi, noms, gestes) : null;
      zone.replaceChildren(...(bloc ? [bloc] : []));
      zone.hidden = !bloc;
    },
    bloquer(raison) {
      blocage = raison;
      rendre();
    },
  };
}

/** Vrai quand le résultat d'un dessin porte sur la palette ouverte. */
function resultatConcerne(suivi: Extract<EtatDuDessin, { phase: 'fini' }>, ouverte: string): boolean {
  const { resultat } = suivi;
  return 'cadres' in resultat ? resultat.cadres.some(({ palette }) => palette === ouverte) : true;
}
