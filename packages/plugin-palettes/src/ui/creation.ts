/**
 * La création d'une palette, sous le sélecteur ([UI-06], [ENT-03]) : une
 * carte sur le modèle de « Configuration de la palette », disposée en P2
 * (maquette Y2.6) : le nom et la couleur de référence sur une ligne, puis une
 * rangée pour le modèle et une pour les intensités, les numéros d'une palette
 * libre dessous, puis Créer et Annuler, à gauche. Une palette n'a pas de
 * référence par défaut : la créer demande un code saisi, au clavier ou par le
 * sélecteur de couleur. « Une intensité » est le choix de départ ([ENT-14]).
 */
import type { Profil } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { MOTIF_HEXA } from '../edition';
import { createCarte } from './carte';
import { champEnColonne, createChoixDesIntensites, createChoixDuModele, createPuces, type ChoixDeBase, type ChoixDuModele } from './champs';
import { createPipette } from './couleur/selecteur';
import { TEXTES, TEXTES_DE_LA_BASE } from './textes';

/** Ce qu'une couleur saisie donnerait : la rampe de chaque choix, la part de la référence et le profil qu'Auto choisirait. */
export interface ApercuDeLaSaisie {
  readonly apercu: (intensites: 1 | 2) => HTMLElement;
  readonly part: string;
  readonly porteur: Profil;
}

export interface CreationUi {
  element: HTMLElement;
  /** Montre la carte vide, en Standard, à une intensité et en Auto ; `annulable` montre « Annuler », absent quand aucune palette n'existe. */
  ouvrir(annulable: boolean): void;
  signaler(erreur: string | null): void;
  /** Donne le focus au code de la couleur de référence. */
  focaliser(): void;
}

export function createCreation(gestes: {
  /** `crans` vaut `null` en Standard, la liste des numéros en Libre ; une palette libre n'a qu'une rampe, sans choix d'intensités. */
  onCreer: (saisie: string, nom: string, intensites: 1 | 2, base: ChoixDeBase, crans: readonly number[] | null) => void;
  /** Les numéros que Libre allume d'abord, lus dans la recette au moment du choix. */
  cransLibres: () => readonly number[];
  /** Ce que la couleur saisie donnerait ; `null` pour un code qui ne se lit pas encore. */
  apercuDeLaSaisie: (saisie: string) => ApercuDeLaSaisie | null;
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
      rendreLesIntensites();
    },
  }));
  saisie.addEventListener('input', () => {
    pipette.poser(saisie.value);
    rendreLesIntensites();
  });

  let intensites: 1 | 2 = 1;
  let base: ChoixDeBase = 'auto';
  const choixDesIntensites = createChoixDesIntensites((choix) => {
    intensites = choix;
    rendreLesIntensites();
  }, (choix) => {
    base = choix;
    rendreLesIntensites();
  });

  function rendreLesIntensites(): void {
    const lue = gestes.apercuDeLaSaisie(saisie.value);
    choixDesIntensites.poser({ intensites, apercu: lue?.apercu ?? null, part: lue?.part ?? null });
    choixDesIntensites.base.poser(base);
    const { aide } = choixDesIntensites.base;
    aide.textContent = base === 'auto' && lue ? TEXTES_DE_LA_BASE.choixAVenir(lue.porteur) : '';
    aide.hidden = aide.textContent === '';
  }

  // Le modèle ; en Libre, les puces remplacent le choix des intensités.
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

  function rendreLeModele(): void {
    choixDuModele.poser(modele);
    choixDesIntensites.element.hidden = modele === 'libre';
    puces.element.hidden = modele !== 'libre';
    puces.poser(crans);
  }

  const colonnes = document.createElement('div');
  colonnes.className = 'colonnes-de-base';
  colonnes.append(champEnColonne(TEXTES.nom, champDuNom), champEnColonne(TEXTES.reference, pipette.bouton, saisie));

  const creer = () => gestes.onCreer(saisie.value, champDuNom.value, intensites, base, modele === 'libre' ? crans : null);
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

  carte.corps.append(colonnes, choixDuModele.element, choixDesIntensites.element, puces.element, erreur, gestesDeCreation);

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
      intensites = 1;
      base = 'auto';
      modele = 'modele';
      crans = [];
      rendreLeModele();
      rendreLesIntensites();
      annuler.hidden = !annulable;
      signaler(null);
    },
    signaler,
    focaliser: () => saisie.focus(),
  };
}
