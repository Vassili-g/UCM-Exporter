/**
 * La génération de la palette ouverte, qui ferme sa configuration ([UI-05]) :
 * « Générer sur Figma », l'état de son cadre et « Afficher dans Figma » sur une
 * seule ligne, puis une seule zone pour la progression, l'erreur ou les écarts
 * de peinture, que chaque génération remplace. Les options suivent, repliées.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { EtatDuCadre } from '../planche/fraicheur';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import type { OptionsDeGeneration } from './optionsDeGeneration';
import { TEXTES_DU_DESSIN, etatDuCadreEcrit, progressionDuDessin } from './textes';

/** Le cadre de la palette ouverte : son état, et où le montrer quand il est localisé. */
export interface CadreDeLaPalette {
  readonly etat: EtatDuCadre;
  readonly page: string | null;
  readonly cadre: string | null;
}

export interface GenerationUi {
  element: HTMLDivElement;
  afficherLeCadre(cadre: CadreDeLaPalette): void;
  /** Le dessin en cours ou fini ; `ouverte` est la palette de l'onglet, seule dont le résultat s'affiche. */
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }, ouverte: string): void;
}

export interface GestesDeLaGeneration extends GestesDuResultat {
  generer(): void;
}

export function createGeneration(gestes: GestesDeLaGeneration, options: OptionsDeGeneration): GenerationUi {
  const element = document.createElement('div');
  element.className = 'generation';
  const ligne = document.createElement('div');
  ligne.className = 'generation-ligne';
  const generer = createButton({ label: TEXTES_DU_DESSIN.dessiner, onClick: () => gestes.generer() });
  const etat = document.createElement('span');
  etat.className = 'etat-du-cadre';
  etat.setAttribute('aria-live', 'polite');
  const voir = document.createElement('button');
  voir.type = 'button';
  voir.className = 'lien-de-constat';
  voir.textContent = TEXTES_DU_DESSIN.voirSurLaPlanche;
  voir.hidden = true;
  ligne.append(generer, etat, voir);
  const zone = document.createElement('div');
  zone.className = 'page-stack';
  zone.hidden = true;
  element.append(ligne, zone, options.creerRepli());

  let cadre: CadreDeLaPalette = { etat: 'jamais-dessinee', page: null, cadre: null };
  let enCours = false;

  voir.addEventListener('click', () => {
    if (cadre.page && cadre.cadre) gestes.voirSurLaPlanche(cadre.page, [cadre.cadre]);
  });

  function rendreLeCadre(): void {
    etat.hidden = enCours;
    etat.textContent = etatDuCadreEcrit(cadre.etat);
    etat.dataset.etat = cadre.etat;
    voir.hidden = enCours || !cadre.page || !cadre.cadre;
  }

  return {
    element,
    afficherLeCadre(suivant) {
      cadre = suivant;
      rendreLeCadre();
    },
    afficherDessin(suivi, noms, ouverte) {
      enCours = suivi.phase === 'en-cours';
      generer.disabled = enCours;
      generer.setLabel(suivi.phase === 'en-cours' ? progressionDuDessin(suivi.fait, suivi.total, suivi.nom) : TEXTES_DU_DESSIN.dessiner);
      rendreLeCadre();
      // Un résultat ne survit pas à son sujet : celui d'une autre palette ne s'affiche pas ici.
      const concerne = suivi.phase !== 'fini' || resultatConcerne(suivi, ouverte);
      const bloc = concerne ? blocDuResultat(suivi, noms, gestes) : null;
      zone.replaceChildren(...(bloc ? [bloc] : []));
      zone.hidden = !bloc;
    },
  };
}

/** Vrai quand le résultat d'un dessin porte sur la palette ouverte. */
function resultatConcerne(suivi: Extract<EtatDuDessin, { phase: 'fini' }>, ouverte: string): boolean {
  const { resultat } = suivi;
  return 'cadres' in resultat ? resultat.cadres.some(({ palette }) => palette === ouverte) : true;
}
