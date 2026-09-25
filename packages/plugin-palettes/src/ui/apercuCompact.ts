/**
 * L'aperçu compact d'une palette : ses rampes Soft et Vivid peintes du fond
 * d'un thème, la référence marquée ◆, et le résultat de ses garanties dans ce
 * thème, comme la bascule des garanties le donne (V4.2). La fiche de l'onglet
 * Planche (V8.1) et la tête des Réglages communs (V9.3) le montrent.
 */
import { PROFILS, lireHexa, type Mode, type Profil, type Recette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { encresSur } from './nuancier';
import { NOM_DU_PROFIL, resultatDuProfil, resultatDuProfilEnMots } from './textes';

/** Les rampes Soft et Vivid, peintes du fond du thème, la référence marquée ◆. */
export function apercuCompact(recette: Recette, analyse: AnalyseDePalette, mode: Mode): HTMLDivElement {
  const surface = document.createElement('div');
  surface.className = 'fiche-apercu';
  surface.style.background = recette.fonds[mode];
  const encres = encresSur(lireHexa(recette.fonds[mode]) ?? [255, 255, 255]);
  surface.style.setProperty('--encre-surface', encres.encre);
  surface.style.setProperty('--bordure-surface', encres.bordure);
  surface.setAttribute('aria-hidden', 'true');
  for (const profil of PROFILS) {
    const rangee = document.createElement('div');
    rangee.className = 'fiche-rangee';
    const nom = document.createElement('span');
    nom.className = 'fiche-profil';
    nom.textContent = NOM_DU_PROFIL[profil];
    rangee.append(nom);
    analyse.rampes[profil][mode].forEach((cran, rang) => {
      const pastille = document.createElement('span');
      pastille.className = 'fiche-pastille';
      pastille.style.background = cran.hexa;
      if (analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang) {
        pastille.dataset.reference = 'true';
        pastille.textContent = '◆';
        pastille.style.color = encresSur(lireHexa(cran.hexa) ?? [255, 255, 255]).encre;
      }
      rangee.append(pastille);
    });
    surface.append(rangee);
  }
  return surface;
}

/** Le nombre de garanties qu'un profil manque dans un thème. */
export function garantiesManquees(analyse: AnalyseDePalette, profil: Profil, mode: Mode): number {
  return analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === profil && promesse.verdict === 'manquee').length;
}

/** « Soft ✓ · Vivid ✗ 2 » dans un thème, chaque résultat dit en mots pour l'assistance technique. */
export function resultatsDesGaranties(analyse: AnalyseDePalette, mode: Mode): HTMLParagraphElement {
  const resultats = document.createElement('p');
  resultats.className = 'fiche-garanties';
  for (const profil of PROFILS) {
    const manquees = garantiesManquees(analyse, profil, mode);
    const resultat = document.createElement('span');
    resultat.textContent = resultatDuProfil(profil, manquees);
    resultat.dataset.verdict = manquees === 0 ? 'tenue' : 'manquee';
    resultat.setAttribute('aria-label', resultatDuProfilEnMots(profil, manquees));
    resultats.append(resultat);
  }
  return resultats;
}
