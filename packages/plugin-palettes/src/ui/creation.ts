/**
 * La création d'une palette : une référence saisie, ou la couleur de la
 * sélection ([ENT-03], [ENT-04]). Une palette n'a pas de référence par défaut :
 * la créer demande l'une ou l'autre.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { TEXTES } from './textes';

export interface CreationUi {
  element: HTMLDivElement;
  /** Montre le panneau vide ; `annulable` montre « Annuler », absent quand aucune palette n'existe. */
  ouvrir(annulable: boolean): void;
  signaler(erreur: string | null): void;
}

export function createCreation(gestes: {
  onCreer: (saisie: string) => void;
  onSelection: () => void;
  onAnnuler: () => void;
}): CreationUi {
  const element = document.createElement('div');
  element.className = 'creation';

  const titre = document.createElement('p');
  titre.className = 'field-label';
  titre.textContent = TEXTES.nouvellePalette;

  const saisie = document.createElement('input');
  saisie.type = 'text';
  saisie.className = 'input champ-creation';
  saisie.placeholder = '#1E6FD9';
  saisie.spellcheck = false;
  saisie.maxLength = 7;
  saisie.setAttribute('aria-label', TEXTES.reference);

  const creer = createButton({ label: TEXTES.creer, onClick: () => gestes.onCreer(saisie.value) });
  const depuisLaSelection = createButton({ label: TEXTES.depuisLaSelection, variant: 'secondary', onClick: gestes.onSelection });
  depuisLaSelection.dataset.geste = 'selection';
  const annuler = createButton({ label: TEXTES.annuler, variant: 'secondary', onClick: gestes.onAnnuler });
  saisie.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter') gestes.onCreer(saisie.value);
  });

  const ligne = document.createElement('div');
  ligne.className = 'creation-ligne';
  ligne.append(saisie, creer, depuisLaSelection, annuler);

  const erreur = document.createElement('p');
  erreur.className = 'field-error';
  erreur.hidden = true;

  element.append(titre, ligne, erreur);

  function signaler(texte: string | null): void {
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
    saisie.setAttribute('aria-invalid', String(texte !== null));
  }

  return {
    element,
    ouvrir(annulable) {
      saisie.value = '';
      annuler.hidden = !annulable;
      signaler(null);
    },
    signaler,
  };
}
