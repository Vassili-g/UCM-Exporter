/**
 * Le badge d'un niveau WCAG ([VER-13]) : « AAA », « AA » ou « AA ✗ », à côté
 * du contraste qu'il juge. Il se lit dans `niveauxWcag`, aux seuils fixes du
 * WCAG ; l'assistance technique lit ce qu'il juge et son résultat,
 * « Texte courant : AA atteint, AAA non atteint ».
 */
import { niveauEcrit, type Jugement } from './textes';

export function badgeDeNiveau(valeur: number, jugement: Jugement): HTMLSpanElement {
  const niveau = niveauEcrit(valeur, jugement);
  const badge = document.createElement('span');
  badge.className = 'badge-de-niveau';
  badge.dataset.atteint = String(niveau.atteint);
  badge.textContent = niveau.ecrit;
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', niveau.etiquette);
  badge.title = niveau.etiquette;
  return badge;
}
