/**
 * L'aperçu compact d'une palette : les rampes de ses intensités peintes du
 * fond d'un thème, la référence marquée ◆, et le résultat de ses garanties
 * dans ce thème, comme la bascule des garanties le donne (V4.2). La fiche de
 * l'onglet Planche (V8.1), la tête des Réglages communs (V9.3) et les cartes
 * du choix des intensités ([ENT-14]) le montrent.
 */
import { lireHexa, rampeDe, type Intensite, type Mode, type Recette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { encresSur } from './nuancier';
import { NOM_DU_PROFIL, TEXTES, resultatDuProfil, resultatDuProfilEnMots } from './textes';

/** Les rampes des intensités présentes, peintes du fond du thème, la référence marquée ◆ ; la rampe unique n'a pas de nom. */
export function apercuCompact(recette: Recette, analyse: AnalyseDePalette, mode: Mode): HTMLDivElement {
  const surface = document.createElement('div');
  surface.className = 'fiche-apercu';
  surface.style.background = recette.fonds[mode];
  const encres = encresSur(lireHexa(recette.fonds[mode]) ?? [255, 255, 255]);
  surface.style.setProperty('--encre-surface', encres.encre);
  surface.style.setProperty('--bordure-surface', encres.bordure);
  surface.style.setProperty('--colonnes', String(analyse.grille.crans.length));
  surface.setAttribute('aria-hidden', 'true');
  for (const profil of analyse.intensites) {
    const rangee = document.createElement('div');
    rangee.className = 'fiche-rangee';
    rangee.dataset.intensite = profil;
    const nom = document.createElement('span');
    nom.className = 'fiche-profil';
    nom.textContent = profil === 'unique' ? '' : NOM_DU_PROFIL[profil];
    rangee.append(nom);
    rampeDe(analyse.rampes, profil)[mode].forEach((cran, rang) => {
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

/** Le nombre de garanties qu'une intensité manque dans un thème. */
export function garantiesManquees(analyse: AnalyseDePalette, profil: Intensite, mode: Mode): number {
  return analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === profil && promesse.verdict === 'manquee').length;
}

/**
 * « Soft ✓ · Vivid ✗ 2 », ou « Garanties ✓ » pour une palette à une
 * intensité, dans un thème, chaque résultat dit en mots pour
 * l'assistance technique. Une palette libre n'a pas de garantie : zéro
 * manquée s'écrirait « ✓ », et le résultat dit « Palette libre · N nuances ».
 */
export function resultatsDesGaranties(analyse: AnalyseDePalette, mode: Mode): HTMLParagraphElement {
  const resultats = document.createElement('p');
  resultats.className = 'fiche-garanties';
  if (analyse.libre) {
    resultats.textContent = TEXTES.paletteLibre(analyse.grille.crans.length);
    return resultats;
  }
  for (const profil of analyse.intensites) {
    const manquees = garantiesManquees(analyse, profil, mode);
    const resultat = document.createElement('span');
    resultat.textContent = resultatDuProfil(profil, manquees);
    resultat.dataset.verdict = manquees === 0 ? 'tenue' : 'manquee';
    resultat.setAttribute('aria-label', resultatDuProfilEnMots(profil, manquees));
    resultats.append(resultat);
  }
  return resultats;
}
