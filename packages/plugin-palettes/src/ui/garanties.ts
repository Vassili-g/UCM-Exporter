/**
 * La carte « Garanties de contraste » ([UI-09]) : pour le thème de l'aperçu,
 * une bascule Soft/Vivid qui porte le résultat de chaque profil, une réglette
 * des nuances où la garantie choisie se trace en arcs, puis une ligne par
 * association (section 9.4), groupées par minimum. Une ligne en échec porte
 * l'état fautif et les réglages qui peuvent agir ([VER-06], [VER-15]).
 *
 * Le profil affiché et la garantie choisie durent tant que la palette reste
 * ouverte ; ils se conservent au changement de profil et de thème.
 */
import {
  ASSOCIATIONS,
  MODES,
  PROFILS,
  TABLE_DES_EMPLOIS,
  associationDe,
  cleDeLAssociation,
  etatDeLaPaire,
  lireHexa,
  type Association,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
  type Rgb8,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { ciblesDeLaPromesse, type CibleDAction } from '../presentation';
import { createCarte } from './carte';
import { encresSur } from './nuancier';
import { specimenDuRole } from './specimens';
import {
  LIBELLES_DES_CIBLES,
  NOM_DE_L_ETAT,
  NOM_DU_PROFIL,
  NOM_DU_ROLE,
  TEXTES_DES_GARANTIES,
  TEXTES_DE_L_ONGLET,
  contrasteEcrit,
  resultatDuProfil,
  resultatDuProfilEnMots,
} from './textes';

export interface GestesDesGaranties {
  /** Ouvre le réglage qu'une ligne en échec nomme ([VER-15]). */
  ouvrir(cible: CibleDAction): void;
  /** Montre l'autre thème dans l'aperçu, avec un retour ([UI-09]). */
  montrerLeTheme(mode: Mode): void;
}

export interface EntreesDesGaranties {
  readonly recette: Recette;
  readonly palette: Palette;
  readonly analyse: AnalyseDePalette;
  readonly mode: Mode;
}

export interface GarantiesUi {
  element: HTMLElement;
  afficher(entrees: EntreesDesGaranties): void;
  /** Choisit une garantie, depuis le détail d'une nuance : la carte s'ouvre et la montre. */
  choisir(association: Association): void;
}

const SVG = 'http://www.w3.org/2000/svg';
/** La trame de la réglette : une case de nuance, son pas, et la case `on-solid` à gauche. */
const CASE = 37;
const PAS = 40.5;
const ON_SOLID = { x: -44, largeur: 36 };
const TIRETS: Record<number, string> = { 0: '', 1: '4 3', 2: '1.5 2.5' };

function element<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const noeud = document.createElementNS(SVG, nom);
  for (const [cle, valeur] of Object.entries(attributs)) noeud.setAttribute(cle, String(valeur));
  return noeud;
}

function paragraphe(texte: string, classe = ''): HTMLParagraphElement {
  const noeud = document.createElement('p');
  noeud.textContent = texte;
  if (classe) noeud.className = classe;
  return noeud;
}

function code(texte: string): HTMLElement {
  const noeud = document.createElement('code');
  noeud.className = 'code-du-role';
  noeud.textContent = texte;
  return noeud;
}

const manquees = (promesses: readonly Promesse[]): number => promesses.filter((promesse) => promesse.verdict === 'manquee').length;

/** Le numéro d'un membre dans une promesse, ou « fond ». */
function numeroDuMembre(promesse: Promesse, rang: 'premier' | 'second'): string {
  const designe = promesse[rang];
  return designe.nature === 'cran' ? String(designe.cran) : TEXTES_DES_GARANTIES.fond;
}

/** Le spécimen d'une promesse : le premier membre posé sur le second, un texte `on-solid` dans son bouton. */
function specimenDeLaPromesse(promesse: Promesse, fond: Rgb8): HTMLElement {
  const association = associationDe(promesse.paire);
  if (association.premier === 'on-solid') return specimenDuRole('solid', promesse.second.couleur, fond, promesse.premier.couleur);
  return specimenDuRole(association.premier, promesse.premier.couleur, promesse.second.couleur);
}

export function createGaranties(gestes: GestesDesGaranties): GarantiesUi {
  const carte = createCarte({ titre: TEXTES_DE_L_ONGLET.garanties, repliable: { ouverte: true } });
  const bascule = document.createElement('div');
  bascule.className = 'bascule bascule-des-profils';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES_DES_GARANTIES.profils);
  const reglette = document.createElement('div');
  reglette.className = 'reglette-des-garanties';
  const legende = paragraphe(TEXTES_DES_GARANTIES.legende, 'ligne-secondaire');
  const liste = document.createElement('div');
  liste.className = 'liste-des-garanties';
  const autreTheme = document.createElement('p');
  autreTheme.className = 'autre-theme';
  carte.corps.append(bascule, reglette, legende, liste, autreTheme);

  let entrees: EntreesDesGaranties | null = null;
  let palette = '';
  let profil: Profil = 'vivid';
  let choisie = '';

  const boutonsDeProfil = PROFILS.map((valeur) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-option';
    bouton.addEventListener('click', () => {
      profil = valeur;
      rendre();
    });
    bascule.append(bouton);
    return { valeur, bouton };
  });
  carte.surBascule(() => rendre());

  const promessesDe = (analyse: AnalyseDePalette, mode: Mode, duProfil: Profil): Promesse[] =>
    analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === duProfil);

  /** La réglette : la case `on-solid`, les nuances numérotées, et un arc par état de la garantie choisie. */
  function dessinerLaReglette(recette: Recette, analyse: AnalyseDePalette, mode: Mode, promesses: readonly Promesse[]): void {
    const fond = recette.fonds[mode];
    const couleurDuFond = lireHexa(fond) ?? [255, 255, 255];
    const encres = encresSur(couleurDuFond);
    reglette.style.background = fond;
    reglette.style.setProperty('--encre-surface', encres.encre);
    reglette.style.setProperty('--encre-surface-seconde', encres.seconde);
    reglette.style.setProperty('--bordure-surface', encres.bordure);
    const largeur = recette.crans.length * PAS;
    const svg = element('svg', { viewBox: `-46 0 ${largeur + 46} 92`, 'aria-hidden': 'true' });
    svg.classList.add('reglette-svg');
    const centre = (promesse: Promesse, rang: 'premier' | 'second'): number => {
      const designe = promesse[rang];
      return designe.nature === 'cran' ? recette.crans.indexOf(designe.cran) * PAS + CASE / 2 : ON_SOLID.x + ON_SOLID.largeur / 2;
    };
    const vises = new Set<string>();
    for (const promesse of promesses) {
      const etat = etatDeLaPaire(promesse.paire);
      const [x1, x2] = [centre(promesse, 'premier'), centre(promesse, 'second')];
      const haut = 6 + 4 * etat;
      const arc = element('path', { d: `M${x1} 48 C${x1} ${haut}, ${x2} ${haut}, ${x2} 48`, 'stroke-dasharray': TIRETS[etat] ?? '' });
      arc.classList.add('reglette-arc');
      arc.dataset.verdict = promesse.verdict;
      svg.append(arc);
      for (const x of [x1, x2]) {
        const bout = element('circle', { cx: x, cy: 48, r: 2.2 });
        bout.classList.add('reglette-bout');
        bout.dataset.verdict = promesse.verdict;
        svg.append(bout);
      }
      for (const rang of ['premier', 'second'] as const) vises.add(numeroDuMembre(promesse, rang));
    }
    const rampe = analyse.rampes[profil][mode];
    rampe.forEach((cran, rang) => {
      svg.append(element('rect', { x: rang * PAS, y: 52, width: CASE, height: 22, rx: 3, fill: cran.hexa }));
      if (analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang) {
        const losange = element('text', { x: rang * PAS + CASE / 2, y: 66.5, fill: cran.L > 0.6 ? '#000000' : '#FFFFFF' });
        losange.classList.add('reglette-reference');
        losange.textContent = '◆';
        svg.append(losange);
      }
      const numero = element('text', { x: rang * PAS + CASE / 2, y: 87 });
      numero.classList.add('reglette-numero');
      numero.dataset.vise = String(vises.has(String(recette.crans[rang])));
      numero.textContent = String(recette.crans[rang]);
      svg.append(numero);
    });
    const caseOnSolid = element('rect', { x: ON_SOLID.x, y: 52, width: ON_SOLID.largeur, height: 22, rx: 3, fill: fond });
    caseOnSolid.classList.add('reglette-on-solid');
    svg.append(caseOnSolid);
    const nomOnSolid = element('text', { x: ON_SOLID.x + ON_SOLID.largeur / 2, y: 87 });
    nomOnSolid.classList.add('reglette-numero');
    nomOnSolid.dataset.vise = String(vises.has(TEXTES_DES_GARANTIES.fond));
    nomOnSolid.textContent = 'on-solid';
    svg.append(nomOnSolid);
    reglette.replaceChildren(svg);
  }

  /** Un état d'une association : son spécimen, les deux numéros, le résultat, puis l'état. */
  function etatDeLaGarantie(promesse: Promesse, fond: Rgb8, nommerLEtat: boolean): HTMLDivElement {
    const bloc = document.createElement('div');
    bloc.className = 'garantie-etat';
    const numeros = paragraphe(TEXTES_DES_GARANTIES.numeros(numeroDuMembre(promesse, 'premier'), numeroDuMembre(promesse, 'second')));
    numeros.className = 'garantie-numeros';
    const resultat = paragraphe(TEXTES_DES_GARANTIES.resultat(promesse.verdict === 'tenue', promesse.contraste));
    resultat.className = 'garantie-resultat';
    resultat.dataset.verdict = promesse.verdict;
    bloc.append(specimenDeLaPromesse(promesse, fond), numeros, resultat);
    if (nommerLEtat) bloc.append(paragraphe(NOM_DE_L_ETAT[etatDeLaPaire(promesse.paire)], 'ligne-secondaire'));
    return bloc;
  }

  /** L'étiquette accessible d'une ligne : la relation, puis chaque état avec ses numéros, son ratio et son résultat. */
  function etiquette(association: Association, promesses: readonly Promesse[]): string {
    const second = association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : association.second;
    const etats = promesses.map((promesse) => `${NOM_DE_L_ETAT[etatDeLaPaire(promesse.paire)]}, ${numeroDuMembre(promesse, 'premier')} ${TEXTES_DES_GARANTIES.sur} ${numeroDuMembre(promesse, 'second')}, ${contrasteEcrit(promesse.contraste)}, ${promesse.verdict === 'tenue' ? '✓' : '✗'}`);
    return `${association.premier} ${TEXTES_DES_GARANTIES.sur} ${second}. ${etats.join(' ; ')}`;
  }

  function ligneDAssociation(association: Association, promesses: readonly Promesse[], fond: Rgb8): HTMLElement[] {
    const cle = cleDeLAssociation(association);
    const ligne = document.createElement('div');
    ligne.className = 'garantie';
    ligne.setAttribute('role', 'button');
    ligne.tabIndex = 0;
    ligne.dataset.association = cle;
    ligne.setAttribute('aria-pressed', String(cle === choisie));
    ligne.setAttribute('aria-label', etiquette(association, promesses));
    const choisir = () => {
      choisie = cle;
      rendre();
      liste.querySelector<HTMLElement>(`[data-association="${cle}"]`)?.focus();
    };
    ligne.addEventListener('click', choisir);
    ligne.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Enter' && evenement.key !== ' ') return;
      evenement.preventDefault();
      choisir();
    });

    const qui = document.createElement('div');
    qui.className = 'garantie-qui';
    const relation = document.createElement('p');
    relation.append(code(association.premier), ` ${TEXTES_DES_GARANTIES.sur} `);
    relation.append(association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : code(association.second));
    const francais = `${NOM_DU_ROLE[association.premier]} ${TEXTES_DES_GARANTIES.sur} ${association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : NOM_DU_ROLE[association.second]}`;
    qui.append(relation, paragraphe(francais, 'ligne-secondaire'));
    if (association.premier === 'on-solid') qui.append(paragraphe(TEXTES_DES_GARANTIES.onSolid, 'ligne-secondaire'));
    const etats = document.createElement('div');
    etats.className = 'garantie-etats';
    const nommer = promesses.length > 1 || etatDeLaPaire(promesses[0].paire) !== 0;
    etats.append(...promesses.map((promesse) => etatDeLaGarantie(promesse, fond, nommer)));
    ligne.append(qui, etats);

    const echecs = promesses.filter((promesse) => promesse.verdict === 'manquee');
    if (echecs.length === 0) return [ligne];
    const echec = document.createElement('div');
    echec.className = 'garantie-echec';
    for (const promesse of echecs) echec.append(paragraphe(TEXTES_DES_GARANTIES.echec(etatDeLaPaire(promesse.paire), promesse.contraste, promesse.seuil)));
    const liens = document.createElement('div');
    liens.className = 'constat-liens';
    for (const cible of ciblesDeLaPromesse()) {
      const lien = document.createElement('button');
      lien.type = 'button';
      lien.className = 'lien-de-constat';
      lien.dataset.cible = cible;
      lien.textContent = LIBELLES_DES_CIBLES[cible];
      lien.addEventListener('click', () => gestes.ouvrir(cible));
      liens.append(lien);
    }
    echec.append(liens);
    return [ligne, echec];
  }

  function rendre(): void {
    if (!entrees) return;
    const { recette, analyse, mode } = entrees;
    const autre: Mode = MODES.find((candidat) => candidat !== mode) ?? mode;
    const parProfil = (duProfil: Profil, dansLeMode: Mode) => manquees(promessesDe(analyse, dansLeMode, duProfil));
    carte.poserResume(carte.estOuverte()
      ? TEXTES_DES_GARANTIES.theme(mode)
      : PROFILS.map((duProfil) => resultatDuProfil(duProfil, MODES.reduce((total, dansLeMode) => total + parProfil(duProfil, dansLeMode), 0))).join(' · '));
    for (const { valeur, bouton } of boutonsDeProfil) {
      bouton.textContent = resultatDuProfil(valeur, parProfil(valeur, mode));
      bouton.dataset.verdict = parProfil(valeur, mode) === 0 ? 'tenue' : 'manquee';
      bouton.setAttribute('aria-label', resultatDuProfilEnMots(valeur, parProfil(valeur, mode)));
      bouton.setAttribute('aria-pressed', String(valeur === profil));
    }

    const promesses = promessesDe(analyse, mode, profil);
    const fond = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
    const deLAssociation = (association: Association) => promesses
      .filter((promesse) => cleDeLAssociation(associationDe(promesse.paire)) === cleDeLAssociation(association))
      .sort((a, b) => etatDeLaPaire(a.paire) - etatDeLaPaire(b.paire));
    dessinerLaReglette(recette, analyse, mode, promesses.filter((promesse) => cleDeLAssociation(associationDe(promesse.paire)) === choisie));

    const groupes = [
      { seuil: 'texte' as const, titre: TEXTES_DES_GARANTIES.textes, minimum: recette.seuils.texte },
      { seuil: 'nonTexte' as const, titre: TEXTES_DES_GARANTIES.visibles, minimum: recette.seuils.nonTexte },
    ];
    const lignes: HTMLElement[] = [];
    for (const groupe of groupes) {
      const titre = document.createElement('p');
      titre.className = 'garanties-groupe';
      const minimum = document.createElement('span');
      minimum.className = 'ligne-secondaire';
      minimum.textContent = TEXTES_DES_GARANTIES.minimum(groupe.minimum);
      titre.append(groupe.titre, minimum);
      lignes.push(titre);
      for (const association of ASSOCIATIONS) {
        const ici = deLAssociation(association);
        if (ici.length === 0 || ici[0].paire.seuil !== groupe.seuil) continue;
        lignes.push(...ligneDAssociation(association, ici, fond));
      }
    }
    const decoratif = document.createElement('p');
    decoratif.className = 'garantie-decorative';
    decoratif.append(code('border-decorative'), ` ${TEXTES_DES_GARANTIES.decoratif(TABLE_DES_EMPLOIS['border-decorative'])}`);
    lignes.push(decoratif);
    liste.replaceChildren(...lignes);

    const ailleurs = PROFILS.reduce((total, duProfil) => total + parProfil(duProfil, autre), 0);
    autreTheme.hidden = ailleurs === 0;
    if (ailleurs > 0) {
      const voir = document.createElement('button');
      voir.type = 'button';
      voir.className = 'lien-de-constat';
      voir.textContent = TEXTES_DES_GARANTIES.voirLeTheme(autre);
      voir.addEventListener('click', () => gestes.montrerLeTheme(autre));
      autreTheme.replaceChildren(`${TEXTES_DES_GARANTIES.autreTheme(autre, ailleurs)} · `, voir);
    }
  }

  return {
    element: carte.element,
    afficher(suivantes) {
      // Une autre palette : son profil porteur, et sa première garantie en échec, sinon text sur surface.
      if (suivantes.palette.id !== palette) {
        palette = suivantes.palette.id;
        profil = suivantes.analyse.ancrage.profil;
        const enEchec = promessesDe(suivantes.analyse, suivantes.mode, profil).find((promesse) => promesse.verdict === 'manquee');
        choisie = enEchec ? cleDeLAssociation(associationDe(enEchec.paire)) : 'text/surface';
      }
      entrees = suivantes;
      rendre();
    },
    choisir(association) {
      choisie = cleDeLAssociation(association);
      carte.ouvrir();
      rendre();
      carte.element.scrollIntoView({ block: 'nearest' });
    },
  };
}

