/**
 * Les champs que la configuration d'une palette, sa création et les Réglages
 * communs partagent : un libellé au-dessus de ses saisies ([UI-11]), et le
 * choix de la palette de base en trois segments.
 */
import type { Profil } from 'ucm-couleur';

import { NOM_DU_PROFIL, TEXTES_DE_LA_BASE } from './textes';

/** Un libellé au-dessus de ses saisies, qui tiennent sur une ligne. */
export function champEnColonne(libelle: string, ...saisies: HTMLElement[]): HTMLLabelElement {
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-colonne';
  const texte = document.createElement('span');
  texte.className = 'libelle-de-champ';
  texte.textContent = libelle;
  const ligne = document.createElement('span');
  ligne.className = 'champ-ligne';
  ligne.append(...saisies);
  etiquette.append(texte, ligne);
  return etiquette;
}

export type ChoixDeBase = 'auto' | Profil;

export interface ChoixDeBaseUi {
  /** La colonne entière : libellé, segments, puis la ligne d'aide que l'appelant remplit. */
  readonly element: HTMLDivElement;
  /** La ligne sous les segments : « Auto a choisi Vivid » dans la configuration. */
  readonly aide: HTMLSpanElement;
  poser(choix: ChoixDeBase): void;
}

/** Les segments Auto, Soft et Vivid ([ENT-11]) ; un clic appelle `surChoix`, l'appelant pose l'état pressé. */
export function createChoixDeBase(surChoix: (choix: ChoixDeBase) => void): ChoixDeBaseUi {
  const segments = document.createElement('div');
  segments.className = 'bascule bascule-de-base';
  segments.setAttribute('role', 'group');
  segments.setAttribute('aria-label', TEXTES_DE_LA_BASE.libelle);
  const boutons = (['auto', 'soft', 'vivid'] as const).map((valeur) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-option';
    bouton.textContent = valeur === 'auto' ? TEXTES_DE_LA_BASE.auto : NOM_DU_PROFIL[valeur];
    bouton.addEventListener('click', () => surChoix(valeur));
    segments.append(bouton);
    return { valeur, bouton };
  });
  const aide = document.createElement('span');
  aide.className = 'ligne-secondaire';
  const libelle = document.createElement('span');
  libelle.className = 'libelle-de-champ';
  libelle.textContent = TEXTES_DE_LA_BASE.libelle;
  const element = document.createElement('div');
  element.className = 'champ-colonne';
  element.append(libelle, segments, aide);
  return {
    element,
    aide,
    poser(choix) {
      for (const { valeur, bouton } of boutons) bouton.setAttribute('aria-pressed', String(valeur === choix));
    },
  };
}
