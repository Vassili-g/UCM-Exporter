/**
 * La création d'une palette, sous le sélecteur ([UI-06], [ENT-03]) :
 * une carte sur le modèle de « Configuration de la palette », en trois
 * colonnes (nom, couleur de référence, modèle et palette de base), les
 * numéros d'une palette libre dessous, puis Créer et Annuler, à gauche. Une palette n'a pas de référence par défaut : la créer demande
 * un code saisi, au clavier ou par le sélecteur de couleur.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { MOTIF_HEXA } from '../edition';
import { createCarte } from './carte';
import { champEnColonne, createChoixDeBase, createChoixDuModele, createPuces, type ChoixDeBase, type ChoixDuModele } from './champs';
import { createPipette } from './couleur/selecteur';
import { TEXTES } from './textes';

export interface CreationUi {
  element: HTMLElement;
  /** Montre la carte vide, en Standard et en Auto ; `annulable` montre « Annuler », absent quand aucune palette n'existe. */
  ouvrir(annulable: boolean): void;
  signaler(erreur: string | null): void;
  /** Donne le focus au code de la couleur de référence. */
  focaliser(): void;
}

export function createCreation(gestes: {
  /** `crans` vaut `null` en Standard, la liste des numéros en Libre. */
  onCreer: (saisie: string, nom: string, base: ChoixDeBase, crans: readonly number[] | null) => void;
  /** Les numéros que Libre allume d'abord, lus dans la recette au moment du choix. */
  cransLibres: () => readonly number[];
  onAnnuler: () => void;
}): CreationUi {
  const carte = createCarte({ titre: TEXTES.titreDeLaCreation });

  const champDuNom = document.createElement('input');
  champDuNom.type = 'text';
  champDuNom.className = 'input';

  const saisie = document.createElement('input');
  saisie.type = 'text';
  saisie.className = 'input champ-creation';
  saisie.placeholder = '#1E6FD9';
  saisie.spellcheck = false;
  saisie.maxLength = 7;
  // Le libellé de la colonne nomme la pastille, premier champ qu'il contient : le code a le sien.
  saisie.setAttribute('aria-label', TEXTES.reference);
  // Le sélecteur part du code saisi, ou de l'exemple du champ vide ; il ne propose aucune pastille (W4.1).
  const pipette = createPipette(TEXTES.reference, () => ({
    hexa: MOTIF_HEXA.test(saisie.value.trim()) ? saisie.value : saisie.placeholder,
    saisir: (hexa) => {
      saisie.value = hexa;
      pipette.poser(hexa);
      signaler(null);
    },
  }));
  saisie.addEventListener('input', () => pipette.poser(saisie.value));

  let base: ChoixDeBase = 'auto';
  const choixDeBase = createChoixDeBase((choix) => {
    base = choix;
    choixDeBase.poser(base);
  });
  choixDeBase.aide.hidden = true;

  // Le modèle, puis la palette de base dessous ; en Libre, les puces remplacent la palette de base.
  let modele: ChoixDuModele = 'modele';
  let crans: readonly number[] = [];
  const choixDuModele = createChoixDuModele((choix) => {
    modele = choix;
    if (modele === 'libre' && crans.length === 0) crans = gestes.cransLibres();
    rendreLeModele();
  });
  const puces = createPuces((numero) => {
    const present = crans.includes(numero);
    crans = present ? crans.filter((cran) => cran !== numero) : [...crans, numero].sort((a, b) => a - b);
    puces.poser(crans);
  });
  const colonneDuModele = document.createElement('div');
  colonneDuModele.className = 'colonne-du-modele';
  colonneDuModele.append(choixDuModele.element, choixDeBase.element);

  function rendreLeModele(): void {
    choixDuModele.poser(modele);
    choixDeBase.element.hidden = modele === 'libre';
    puces.element.hidden = modele !== 'libre';
    puces.poser(crans);
  }

  const colonnes = document.createElement('div');
  colonnes.className = 'colonnes-de-base';
  colonnes.append(champEnColonne(TEXTES.nom, champDuNom), champEnColonne(TEXTES.reference, pipette.bouton, saisie), colonneDuModele);

  const creer = () => gestes.onCreer(saisie.value, champDuNom.value, base, modele === 'libre' ? crans : null);
  const boutonCreer = createButton({ label: TEXTES.creer, onClick: creer });
  const annuler = createButton({ label: TEXTES.annuler, variant: 'secondary', onClick: gestes.onAnnuler });
  for (const champ of [saisie, champDuNom]) {
    champ.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter') creer();
      if (evenement.key === 'Escape' && !annuler.hidden) gestes.onAnnuler();
    });
  }

  const gestesDeCreation = document.createElement('div');
  gestesDeCreation.className = 'creation-ligne';
  gestesDeCreation.append(boutonCreer, annuler);

  const erreur = document.createElement('p');
  erreur.className = 'field-error';
  erreur.hidden = true;

  carte.corps.append(colonnes, puces.element, erreur, gestesDeCreation);

  function signaler(texte: string | null): void {
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
    saisie.setAttribute('aria-invalid', String(texte !== null));
  }

  return {
    element: carte.element,
    ouvrir(annulable) {
      saisie.value = '';
      pipette.poser('');
      champDuNom.value = '';
      base = 'auto';
      choixDeBase.poser(base);
      modele = 'modele';
      crans = [];
      rendreLeModele();
      annuler.hidden = !annulable;
      signaler(null);
    },
    signaler,
    focaliser: () => saisie.focus(),
  };
}
