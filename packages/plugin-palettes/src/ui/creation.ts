/**
 * La création d'une palette, sous le sélecteur ([UI-06], [ENT-03], [ENT-04]) :
 * une carte sur le modèle de « Configuration de la palette », en trois
 * colonnes (nom, couleur de référence, palette de base), puis ses gestes sur
 * une ligne. Une palette n'a pas de référence par défaut : la créer demande
 * un code saisi ou la couleur de la sélection Figma.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { createCarte } from './carte';
import { champEnColonne, createChoixDeBase, type ChoixDeBase } from './champs';
import { TEXTES } from './textes';

export interface CreationUi {
  element: HTMLElement;
  /** Montre la carte vide, en Auto ; `annulable` montre « Annuler », absent quand aucune palette n'existe. */
  ouvrir(annulable: boolean): void;
  signaler(erreur: string | null): void;
  /** Le nom saisi, que la couleur de la sélection reprend aussi. */
  nom(): string;
  /** La palette de base choisie, que la couleur de la sélection reprend aussi. */
  base(): ChoixDeBase;
  /** Donne le focus au code de la couleur de référence. */
  focaliser(): void;
}

export function createCreation(gestes: {
  onCreer: (saisie: string, nom: string, base: ChoixDeBase) => void;
  onSelection: () => void;
  onAnnuler: () => void;
}): CreationUi {
  const carte = createCarte({ titre: TEXTES.titreDeLaCreation });

  const champDuNom = document.createElement('input');
  champDuNom.type = 'text';
  champDuNom.className = 'input';

  const pipette = document.createElement('input');
  pipette.type = 'color';
  pipette.className = 'pipette';
  pipette.setAttribute('aria-label', TEXTES.reference);
  const saisie = document.createElement('input');
  saisie.type = 'text';
  saisie.className = 'input champ-creation';
  saisie.placeholder = '#1E6FD9';
  saisie.spellcheck = false;
  saisie.maxLength = 7;
  // Le libellé de la colonne nomme la pastille, premier champ qu'il contient : le code a le sien.
  saisie.setAttribute('aria-label', TEXTES.reference);
  pipette.addEventListener('input', () => { saisie.value = pipette.value.toUpperCase(); });

  let base: ChoixDeBase = 'auto';
  const choixDeBase = createChoixDeBase((choix) => {
    base = choix;
    choixDeBase.poser(base);
  });
  choixDeBase.aide.hidden = true;

  const colonnes = document.createElement('div');
  colonnes.className = 'colonnes-de-base';
  colonnes.append(champEnColonne(TEXTES.nom, champDuNom), champEnColonne(TEXTES.reference, pipette, saisie), choixDeBase.element);

  const creer = () => gestes.onCreer(saisie.value, champDuNom.value, base);
  const boutonCreer = createButton({ label: TEXTES.creer, onClick: creer });
  const depuisLaSelection = createButton({ label: TEXTES.depuisLaSelection, variant: 'secondary', onClick: gestes.onSelection });
  depuisLaSelection.dataset.geste = 'selection';
  const annuler = createButton({ label: TEXTES.annuler, variant: 'secondary', onClick: gestes.onAnnuler });
  for (const champ of [saisie, champDuNom]) {
    champ.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter') creer();
      if (evenement.key === 'Escape' && !annuler.hidden) gestes.onAnnuler();
    });
  }

  const gestesDeCreation = document.createElement('div');
  gestesDeCreation.className = 'creation-ligne';
  gestesDeCreation.append(boutonCreer, depuisLaSelection, annuler);

  const erreur = document.createElement('p');
  erreur.className = 'field-error';
  erreur.hidden = true;

  carte.corps.append(colonnes, erreur, gestesDeCreation);

  function signaler(texte: string | null): void {
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
    saisie.setAttribute('aria-invalid', String(texte !== null));
  }

  return {
    element: carte.element,
    ouvrir(annulable) {
      saisie.value = '';
      champDuNom.value = '';
      base = 'auto';
      choixDeBase.poser(base);
      annuler.hidden = !annulable;
      signaler(null);
    },
    signaler,
    nom: () => champDuNom.value,
    base: () => base,
    focaliser: () => saisie.focus(),
  };
}
