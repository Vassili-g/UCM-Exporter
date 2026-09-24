/**
 * La création d'une palette, sous le sélecteur ([UI-06], [ENT-03], [ENT-04]) :
 * une couleur de référence saisie ou prise dans la sélection Figma, et un nom
 * facultatif. Une palette n'a pas de référence par défaut : la créer demande
 * l'une ou l'autre.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { TEXTES } from './textes';

export interface CreationUi {
  element: HTMLDivElement;
  /** Montre le panneau vide ; `annulable` montre « Annuler », absent quand aucune palette n'existe. */
  ouvrir(annulable: boolean): void;
  signaler(erreur: string | null): void;
  /** Le nom saisi, que la couleur de la sélection reprend aussi. */
  nom(): string;
}

export function createCreation(gestes: {
  onCreer: (saisie: string, nom: string) => void;
  onSelection: () => void;
  onAnnuler: () => void;
}): CreationUi {
  const element = document.createElement('div');
  element.className = 'creation';

  const titre = document.createElement('p');
  titre.className = 'field-label';
  titre.textContent = TEXTES.nouvellePalette;

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
  saisie.setAttribute('aria-label', TEXTES.reference);
  pipette.addEventListener('input', () => { saisie.value = pipette.value.toUpperCase(); });

  const couleur = document.createElement('label');
  couleur.className = 'champ-ligne';
  const libelleDeCouleur = document.createElement('span');
  libelleDeCouleur.className = 'field-label';
  libelleDeCouleur.textContent = TEXTES.reference;
  couleur.append(libelleDeCouleur, pipette, saisie);

  const champDuNom = document.createElement('input');
  champDuNom.type = 'text';
  champDuNom.className = 'input';
  const nom = document.createElement('label');
  nom.className = 'champ-ligne';
  const libelleDuNom = document.createElement('span');
  libelleDuNom.className = 'field-label';
  libelleDuNom.textContent = TEXTES.nom;
  nom.append(libelleDuNom, champDuNom);

  const creer = createButton({ label: TEXTES.creer, onClick: () => gestes.onCreer(saisie.value, champDuNom.value) });
  const depuisLaSelection = createButton({ label: TEXTES.depuisLaSelection, variant: 'secondary', onClick: gestes.onSelection });
  depuisLaSelection.dataset.geste = 'selection';
  const annuler = createButton({ label: TEXTES.annuler, variant: 'secondary', onClick: gestes.onAnnuler });
  for (const champ of [saisie, champDuNom]) {
    champ.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter') gestes.onCreer(saisie.value, champDuNom.value);
      if (evenement.key === 'Escape' && !annuler.hidden) gestes.onAnnuler();
    });
  }

  const gestesDeCreation = document.createElement('div');
  gestesDeCreation.className = 'creation-ligne';
  gestesDeCreation.append(creer, depuisLaSelection, annuler);

  const erreur = document.createElement('p');
  erreur.className = 'field-error';
  erreur.hidden = true;

  element.append(titre, couleur, nom, erreur, gestesDeCreation);

  function signaler(texte: string | null): void {
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
    saisie.setAttribute('aria-invalid', String(texte !== null));
  }

  return {
    element,
    ouvrir(annulable) {
      saisie.value = '';
      champDuNom.value = '';
      annuler.hidden = !annulable;
      signaler(null);
    },
    signaler,
    nom: () => champDuNom.value,
  };
}
