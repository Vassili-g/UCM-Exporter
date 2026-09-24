/**
 * Les messages de l'interface ([VER-09], [VER-14]) : un bloc par message, avec
 * ses trois parties séparées, ses mesures, son détail technique replié et les
 * liens vers les réglages qu'il nomme ; et la liste des messages d'une
 * palette, groupés par sévérité sous un titre qui les compte.
 */
import type { Severite } from 'ucm-couleur';

import type { CibleDAction } from '../presentation';
import { LIBELLES_DES_CIBLES, TEXTES, titreDeGroupe, type ConstatIllustre } from './textes';

function paragraphe(texte: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  return element;
}

/** Ce qu'un bloc peut offrir en plus de ses trois parties. */
export interface OptionsDuBloc {
  /** Les réglages que le message nomme ; chacun devient un lien qui l'ouvre. */
  readonly cibles?: readonly CibleDAction[];
  readonly ouvrir?: (cible: CibleDAction) => void;
  /** Désigne dans le nuancier les deux couleurs que le message relie ([UI-04]). */
  readonly inspecter?: () => void;
}

/**
 * Un message et son filet de sévérité. Seul un blocage demande une
 * intervention immédiate : lui seul s'annonce par `role="alert"` ([VER-14]).
 * Les classes s'écrivent en littéral ou par le gabarit de sévérité : la loi
 * des styles ne lit que ces deux formes.
 */
export function blocDeConstat(constat: ConstatIllustre, severite: Severite, options: OptionsDuBloc = {}): HTMLDivElement {
  const bloc = document.createElement('div');
  bloc.className = `constat constat-${severite}`;
  if (severite === 'bloquant') bloc.setAttribute('role', 'alert');
  const ou = paragraphe(constat.ou);
  ou.className = 'constat-ou';
  const quoi = paragraphe(constat.quoi);
  quoi.className = 'constat-quoi';
  bloc.append(ou, quoi);
  if (constat.mesures && constat.mesures.length > 0) {
    const liste = document.createElement('ul');
    liste.className = 'constat-mesures';
    for (const mesure of constat.mesures) {
      const ligne = document.createElement('li');
      ligne.textContent = mesure;
      liste.append(ligne);
    }
    bloc.append(liste);
  }
  const geste = paragraphe(constat.geste);
  geste.className = 'constat-geste';
  bloc.append(geste);
  const { cibles, ouvrir, inspecter } = options;
  if ((cibles && cibles.length > 0 && ouvrir) || inspecter) {
    const liens = document.createElement('div');
    liens.className = 'constat-liens';
    if (inspecter) {
      const voir = document.createElement('button');
      voir.type = 'button';
      voir.className = 'lien-de-constat';
      voir.dataset.geste = 'inspecter';
      voir.textContent = TEXTES.voirLesDeuxCouleurs;
      voir.addEventListener('click', () => inspecter());
      liens.append(voir);
    }
    for (const cible of ouvrir ? cibles ?? [] : []) {
      const lien = document.createElement('button');
      lien.type = 'button';
      lien.className = 'lien-de-constat';
      lien.dataset.cible = cible;
      lien.textContent = LIBELLES_DES_CIBLES[cible];
      lien.addEventListener('click', () => ouvrir?.(cible));
      liens.append(lien);
    }
    bloc.append(liens);
  }
  if (constat.detail) {
    const detail = document.createElement('details');
    detail.className = 'constat-detail';
    const resume = document.createElement('summary');
    resume.textContent = TEXTES.detailTechnique;
    detail.append(resume, paragraphe(constat.detail));
    bloc.append(detail);
  }
  return bloc;
}

/** Un message prêt à s'afficher : son texte, sa sévérité, ses cibles, et le nombre de contrôles qu'il compte. */
export interface Message {
  readonly severite: Severite;
  readonly constat: ConstatIllustre;
  readonly cibles: readonly CibleDAction[];
  /** Le poids du message dans le compte de son groupe : deux profils manqués comptent deux promesses. */
  readonly compte: number;
  readonly inspecter?: () => void;
}

const TITRES: Record<Severite, string> = {
  bloquant: TEXTES.titrePromesses,
  promesse: TEXTES.titrePromesses,
  alerte: TEXTES.titreAlertes,
  notice: TEXTES.titreNotices,
};

/**
 * Les messages d'une palette, groupés par sévérité dans l'ordre reçu, chaque
 * groupe sous son titre et son nombre ([VER-14]).
 */
export function listeDesMessages(messages: readonly Message[], ouvrir: (cible: CibleDAction) => void): HTMLDivElement {
  const liste = document.createElement('div');
  liste.className = 'constats';
  let groupe: Severite | null = null;
  for (const message of messages) {
    if (message.severite !== groupe) {
      groupe = message.severite;
      const severite = message.severite;
      const nombre = messages.filter((autre) => autre.severite === severite).reduce((total, autre) => total + autre.compte, 0);
      const titre = paragraphe(titreDeGroupe(TITRES[severite], nombre));
      titre.className = `constats-titre constats-titre-${severite}`;
      liste.append(titre);
    }
    liste.append(blocDeConstat(message.constat, message.severite, { cibles: message.cibles, ouvrir, inspecter: message.inspecter }));
  }
  return liste;
}
