/**
 * La section repliée « Avancé » d'une palette (section 8.1) : les parts de
 * chroma que ses deux profils emploient, et leur origine ([ENT-09]). Une part
 * saisie devient une part propre du designer ; des parts grises se lisent,
 * avec la part de la référence (D-G).
 */
import { PROFILS, partsDe, validerRecette, type Palette, type Profil, type Recette } from 'ucm-couleur';

import { lireNombre } from '../configuration';
import { poserPart, remplacerPalette, reprendreLesParts } from '../edition';
import { TEXTES_AVANCES, nombreEcrit, nombreInvalide, origineDesParts, texteDuRefus } from './textes';

export interface AvanceUi {
  element: HTMLDivElement;
  afficher(recette: Recette, palette: Palette): void;
}

/** Ce que la section fait d'une palette modifiée : une saisie se prévisualise, la fin du geste se range. */
export interface GestesAvances {
  previsualiser(palette: Palette): void;
  valider(palette: Palette): void;
}

export function createAvance(gestes: GestesAvances): AvanceUi {
  const element = document.createElement('div');
  element.className = 'page-stack';
  const deplier = document.createElement('button');
  deplier.type = 'button';
  deplier.className = 'bouton-discret';
  deplier.setAttribute('aria-expanded', 'false');
  const contenu = document.createElement('div');
  contenu.className = 'page-stack';
  contenu.hidden = true;
  deplier.addEventListener('click', () => {
    contenu.hidden = !contenu.hidden;
    rendreLeBouton();
  });
  element.append(deplier, contenu);

  const origine = document.createElement('p');
  origine.className = 'ligne-secondaire';
  const ligne = document.createElement('div');
  ligne.className = 'ligne-reference';
  const erreur = document.createElement('p');
  erreur.className = 'field-error';
  erreur.hidden = true;
  const reprendre = document.createElement('button');
  reprendre.type = 'button';
  reprendre.className = 'bouton-discret';
  reprendre.textContent = TEXTES_AVANCES.reprendre;
  reprendre.addEventListener('click', () => {
    if (lue && courante) gestes.valider(reprendreLesParts(lue, courante));
  });
  contenu.append(origine, ligne, erreur, reprendre);

  let lue: Recette | null = null;
  let courante: Palette | null = null;

  const saisies = PROFILS.map((profil) => {
    const etiquette = document.createElement('label');
    etiquette.className = 'champ-ligne';
    const texte = document.createElement('span');
    texte.className = 'field-label';
    texte.textContent = profil;
    const saisie = document.createElement('input');
    saisie.type = 'text';
    saisie.inputMode = 'decimal';
    saisie.className = 'input champ-nombre';
    saisie.spellcheck = false;
    saisie.setAttribute('aria-label', TEXTES_AVANCES.partDuProfil[profil]);
    saisie.addEventListener('input', () => saisir(profil, saisie, false));
    saisie.addEventListener('change', () => saisir(profil, saisie, true));
    etiquette.append(texte, saisie);
    ligne.append(etiquette);
    return { profil, saisie };
  });

  function rendreLeBouton(): void {
    deplier.textContent = `${contenu.hidden ? '▸' : '▾'} ${TEXTES_AVANCES.avance}`;
    deplier.setAttribute('aria-expanded', String(!contenu.hidden));
  }

  function signaler(texte: string | null): void {
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
  }

  /** Comme un champ de la configuration : un refus de [REC-05] ne se dit qu'à la validation. */
  function saisir(profil: Profil, saisie: HTMLInputElement, fin: boolean): void {
    if (!lue || !courante) return;
    const valeur = lireNombre(saisie.value);
    if (valeur === null) {
      if (fin) signaler(nombreInvalide(saisie.value));
      return;
    }
    const suivante = poserPart(lue, courante, profil, valeur);
    const jugee = validerRecette(remplacerPalette(lue, suivante));
    if ('refus' in jugee) {
      if (fin) signaler(texteDuRefus(jugee.refus[0]));
      return;
    }
    signaler(null);
    if (fin) gestes.valider(suivante);
    else gestes.previsualiser(suivante);
  }

  rendreLeBouton();
  return {
    element,
    afficher(recette, palette) {
      if (courante?.id !== palette.id) signaler(null);
      lue = recette;
      courante = palette;
      const parts = partsDe(recette, palette);
      origine.textContent = origineDesParts(palette.parts?.origine, parts.soft);
      for (const { profil, saisie } of saisies) {
        if (document.activeElement !== saisie) saisie.value = nombreEcrit(parts[profil]);
      }
      reprendre.hidden = palette.parts?.origine !== 'designer';
    },
  };
}
