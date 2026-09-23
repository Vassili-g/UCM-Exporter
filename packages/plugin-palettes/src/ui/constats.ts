/**
 * La liste des constats d'une palette : promesses manquées, puis alertes, puis
 * notices ([VER-07], section 11.4). Chaque constat garde ses trois parties
 * séparées jusqu'à l'écran.
 */
import type { Severite } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import {
  TEXTES,
  constatDAlerte,
  constatDePromesse,
  noticeLegacy,
  type ConstatIllustre,
  type ContexteDAlerte,
} from './textes';

function paragraphe(texte: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  return element;
}

/**
 * Un constat et son filet de sévérité. Les classes s'écrivent en littéral ou
 * par le gabarit de sévérité : la loi des styles ne lit que ces deux formes.
 */
export function blocDeConstat(constat: ConstatIllustre, severite: Severite): HTMLDivElement {
  const bloc = document.createElement('div');
  bloc.className = `constat constat-${severite}`;
  if (severite === 'bloquant') bloc.setAttribute('role', 'alert');
  const ou = paragraphe(constat.ou);
  ou.className = 'constat-ou';
  const quoi = paragraphe(constat.quoi);
  quoi.className = 'constat-quoi';
  const geste = paragraphe(constat.geste);
  geste.className = 'constat-geste';
  bloc.append(ou, quoi);
  if (constat.pastilles) {
    const rangee = document.createElement('div');
    rangee.className = 'constat-pastilles';
    for (const hexa of constat.pastilles) {
      const pastille = document.createElement('span');
      pastille.className = 'pastille-exemple';
      pastille.style.background = hexa;
      pastille.title = hexa;
      rangee.append(pastille);
    }
    bloc.append(rangee);
  }
  bloc.append(geste);
  return bloc;
}

const TITRES: Record<'promesse' | 'alerte' | 'notice', string> = {
  promesse: TEXTES.titrePromesses,
  alerte: TEXTES.titreAlertes,
  notice: TEXTES.titreNotices,
};

/** Les constats d'une palette, groupés sous un titre par sévérité, dans l'ordre de l'analyse. */
export function listeDesConstats(analyse: AnalyseDePalette, contexte: ContexteDAlerte, nom: string): HTMLDivElement {
  const liste = document.createElement('div');
  liste.className = 'constats';
  let groupe: string | null = null;
  for (const constat of analyse.constats) {
    if (constat.severite !== groupe) {
      groupe = constat.severite;
      const titre = paragraphe(TITRES[constat.severite]);
      titre.className = 'constats-titre';
      liste.append(titre);
    }
    const texte = 'promesse' in constat
      ? constatDePromesse(constat.promesse, nom)
      : 'alerte' in constat ? constatDAlerte(constat.alerte, contexte) : noticeLegacy();
    liste.append(blocDeConstat(texte, constat.severite));
  }
  return liste;
}
