/**
 * Le spécimen d'un rôle ([UI-09], [UI-10]) : la forme que la couleur prend dans
 * une interface, peinte avec les couleurs mesurées. Un fond plein porte un
 * bouton et son texte `on-solid`, un texte coloré un mot, une bordure de champ
 * un cadre, un anneau de focus un contour décalé, un séparateur un trait, un
 * fond léger un aplat, un fond de carte un aplat plus grand, bordé.
 */
import type { Emploi } from 'ucm-couleur';

import { TEXTES_DES_GARANTIES } from './textes';

const rgb = (couleur: readonly number[]): string => `rgb(${couleur.join(', ')})`;

/**
 * Un spécimen posé sur `fond` : `couleur` est celle du rôle, `texte` celle du
 * texte que le rôle porte (`on-solid` sur un fond plein).
 */
export function specimenDuRole(emploi: Emploi, couleur: readonly number[], fond: readonly number[], texte?: readonly number[]): HTMLSpanElement {
  const cadre = document.createElement('span');
  cadre.className = 'specimen-cadre';
  cadre.style.background = rgb(fond);
  const forme = document.createElement('span');
  forme.className = 'specimen-forme';
  forme.dataset.role = emploi;
  forme.setAttribute('aria-hidden', 'true');
  if (emploi === 'solid') {
    forme.style.background = rgb(couleur);
    forme.style.color = rgb(texte ?? fond);
    forme.textContent = TEXTES_DES_GARANTIES.specimenBouton;
  } else if (emploi === 'on-solid') {
    forme.style.background = rgb(fond);
    forme.style.color = rgb(couleur);
    forme.textContent = TEXTES_DES_GARANTIES.specimenBouton;
  } else if (emploi === 'text') {
    forme.style.color = rgb(couleur);
    forme.textContent = TEXTES_DES_GARANTIES.specimenTexte;
  } else if (emploi === 'focus') {
    forme.style.outlineColor = rgb(couleur);
  } else if (emploi === 'surface' || emploi === 'surface-card') {
    forme.style.background = rgb(couleur);
  } else {
    forme.style.borderColor = rgb(couleur);
  }
  cadre.append(forme);
  return cadre;
}
