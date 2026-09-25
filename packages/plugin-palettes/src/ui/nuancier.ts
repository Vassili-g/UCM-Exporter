/**
 * L'aperçu de la palette ouverte ([UI-04]) : une surface peinte du fond du
 * thème choisi, les numéros de nuance alignés sur les rampes Soft et Vivid, la
 * pastille `on-solid` avant elles, la référence exacte repérée ([MOT-17]), les
 * accolades des rôles, et le détail de la nuance choisie ([UI-10]).
 *
 * Les pastilles forment une grille au sens WAI-ARIA : une seule est atteinte
 * par la tabulation, les flèches, Origine et Fin déplacent le focus, Entrée et
 * Espace choisissent. La pastille `on-solid` est la première colonne des deux
 * rangées. Le survol signale seulement la cible. La copie d'un code est un
 * bouton du détail, distinct du choix d'une nuance. Les accolades ne se
 * focalisent pas.
 */
import {
  PROFILS,
  TABLE_DES_EMPLOIS,
  associationDe,
  contraste,
  decalagesDeLEmploi,
  emploisDuCran,
  etatDeLaPaire,
  lireHexa,
  mesurerCran,
  niveauxWcag,
  type Association,
  type Cran,
  type Emploi,
  type Mode,
  type Profil,
  type Promesse,
  type Recette,
  type Rgb8,
} from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { accoladesDe } from '../presentation';
import { fondsProposes } from './couleur/propositions';
import { ouvrirLeSelecteur, suivreLaCouleur } from './couleur/selecteur';
import { specimenDuRole } from './specimens';
import {
  NOM_DE_L_ETAT,
  NOM_DU_PROFIL,
  NOM_DU_ROLE,
  TEXTES,
  TEXTES_DE_CONFIGURATION,
  TEXTES_DU_DETAIL,
  TEXTES_DU_NUANCIER,
  TEXTES_DU_SELECTEUR,
  contrasteEcrit,
  niveauxEcrits,
} from './textes';

/** Ce que le nuancier montre. */
export interface EntreesDuNuancier {
  readonly recette: Recette;
  readonly analyse: AnalyseDePalette;
  /** Les nuances où soft et vivid se confondent ([VER-11]) : un indice discret les marque. */
  readonly confondues: readonly { readonly mode: Mode; readonly cran: number }[];
}

/** Ce que le nuancier demande à l'onglet. */
export interface GestesDuNuancier {
  /** Le thème a changé : la carte des garanties et l'éditeur de dérive le suivent. */
  surMode(): void;
  /**
   * Un fond saisi dans le sélecteur de couleur de la pastille ([UI-04]) :
   * `fin` à la fin du geste, qui enregistre.
   */
  saisirFond(mode: Mode, hexa: string, fin: boolean): void;
  /** Une garantie du détail se choisit dans la carte des garanties ([UI-10]). */
  choisirGarantie(association: Association): void;
}

export interface NuancierUi {
  /** La surface peinte, dans le corps de la carte Aperçu. */
  element: HTMLDivElement;
  /** Les onglets de thème à gauche, le retour, puis le fond à droite, dans l'en-tête de la carte. */
  tete: HTMLDivElement;
  afficher(entrees: EntreesDuNuancier): void;
  mode(): Mode;
  /** Montre un autre thème, et offre de revenir à celui d'avant ([UI-09]). */
  montrerLeTheme(mode: Mode): void;
  /** Pose le thème, sans retour : celui qu'une fiche de l'onglet Planche montrait (V8.3). */
  choisirLeTheme(mode: Mode): void;
}

type Choix =
  | { readonly nature: 'nuance'; readonly profil: Profil; readonly rang: number }
  | { readonly nature: 'fond' };

/** L'encre qui se lit sur le fond du thème : la sombre ou la claire des couleurs de la planche. */
export function encresSur(fond: Rgb8): { encre: string; seconde: string; bordure: string } {
  const sombre = contraste(fond, [30, 30, 30]) >= contraste(fond, [245, 245, 245]);
  return sombre
    ? { encre: '#1E1E1E', seconde: 'rgba(30, 30, 30, 0.72)', bordure: 'rgba(30, 30, 30, 0.28)' }
    : { encre: '#F5F5F5', seconde: 'rgba(245, 245, 245, 0.72)', bordure: 'rgba(245, 245, 245, 0.32)' };
}

function bouton(classe: 'bouton-discret' | 'bascule-option' | 'lien-de-constat', texte = ''): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  if (classe === 'bouton-discret') element.className = 'bouton-discret';
  else if (classe === 'bascule-option') element.className = 'bascule-option';
  else element.className = 'lien-de-constat';
  element.textContent = texte;
  return element;
}

function paragraphe(texte: string, classe = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

/** Un sous-titre du détail : « Sert à », « Nuance libre ». */
function sousTitre(texte: string): HTMLParagraphElement {
  const element = paragraphe(texte);
  element.className = 'detail-sous-titre';
  return element;
}

/** Un nom de rôle en police de code. */
function codeDuRole(texte: string): HTMLElement {
  const code = document.createElement('code');
  code.className = 'code-du-role';
  code.textContent = texte;
  return code;
}

/** Copie un texte sans l'API du presse-papiers, que l'iframe d'un plugin peut refuser. */
function copier(texte: string): void {
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.append(zone);
  zone.select();
  document.execCommand('copy');
  zone.remove();
}

/** La colonne CSS d'une colonne de l'aperçu : `-2` le nom du profil, `-1` la pastille `on-solid`, `0` la première nuance. */
const colonne = (rang: number): number => rang + 3;

export function createNuancier(gestes: GestesDuNuancier): NuancierUi {
  // En-tête : les deux thèmes à gauche, le retour vers le thème d'avant, et le fond à droite.
  const tete = document.createElement('div');
  tete.className = 'nuancier-tete';
  const bascule = document.createElement('div');
  bascule.className = 'bascule onglets-de-theme';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES.modesDeLApercu);
  const retour = bouton('bouton-discret');
  retour.hidden = true;
  const fond = document.createElement('div');
  fond.className = 'nuancier-fond';
  const libelleDuFond = document.createElement('span');
  libelleDuFond.className = 'libelle-de-champ';
  libelleDuFond.textContent = TEXTES_DU_NUANCIER.fond;
  // La pastille ouvre le sélecteur de couleur sur le fond du thème montré, avec la mention du fond commun.
  const pastilleDuFond = document.createElement('button');
  pastilleDuFond.type = 'button';
  pastilleDuFond.className = 'pastille-du-fond';
  pastilleDuFond.setAttribute('aria-haspopup', 'dialog');
  pastilleDuFond.setAttribute('aria-expanded', 'false');
  const teinteDuFond = document.createElement('span');
  teinteDuFond.className = 'pastille-du-fond-teinte';
  teinteDuFond.setAttribute('aria-hidden', 'true');
  const hexaDuFond = document.createElement('span');
  hexaDuFond.className = 'ligne-secondaire';
  hexaDuFond.setAttribute('aria-hidden', 'true');
  pastilleDuFond.append(teinteDuFond, hexaDuFond);
  fond.append(libelleDuFond, pastilleDuFond);
  tete.append(bascule, retour, fond);

  /** Le thème fixé à l'ouverture du sélecteur : changer de thème pendant la saisie ne détourne pas la valeur. */
  let modeDuSelecteur: Mode = 'light';
  pastilleDuFond.addEventListener('click', () => {
    if (!donnees) return;
    modeDuSelecteur = mode;
    const { recette, analyse } = donnees;
    ouvrirLeSelecteur({
      ancre: pastilleDuFond,
      hexa: recette.fonds[modeDuSelecteur],
      etiquette: TEXTES_DE_CONFIGURATION.fondDuMode[modeDuSelecteur],
      mention: TEXTES_DU_NUANCIER.fondCommun,
      titreDesPastilles: TEXTES_DU_SELECTEUR.fondsProposes,
      pastilles: fondsProposes(recette, analyse.rampes, modeDuSelecteur),
      saisir: (hexa, fin) => gestes.saisirFond(modeDuSelecteur, hexa, fin),
    });
  });

  const surface = document.createElement('div');
  surface.className = 'nuancier-surface';
  const grille = document.createElement('div');
  grille.className = 'nuancier-grille';
  grille.setAttribute('role', 'grid');
  grille.setAttribute('aria-label', TEXTES.apercu);
  const accolades = document.createElement('div');
  accolades.className = 'accolades';
  accolades.setAttribute('aria-hidden', 'true');
  const detail = document.createElement('div');
  detail.className = 'nuancier-detail';
  detail.setAttribute('aria-live', 'polite');
  detail.hidden = true;
  surface.append(grille, accolades, detail);

  let mode: Mode = 'light';
  let modeDAvant: Mode | null = null;
  let choix: Choix | null = null;
  /** La cellule que la tabulation atteint : rang de la rampe, colonne ; la colonne 0 est `on-solid`. */
  let active = { rampe: 1, colonne: 8 };
  let donnees: EntreesDuNuancier | null = null;
  /** Les cellules de chaque rangée ; la pastille `on-solid` ouvre les deux. */
  let cellules: HTMLElement[][] = [];

  const boutonsDeMode = (['light', 'dark'] as const).map((valeur) => {
    const choixDuMode = bouton('bascule-option', valeur === 'light' ? TEXTES.modeClair : TEXTES.modeSombre);
    choixDuMode.addEventListener('click', () => {
      modeDAvant = null;
      changerDeMode(valeur);
    });
    bascule.append(choixDuMode);
    return { valeur, choixDuMode };
  });
  retour.addEventListener('click', () => {
    const cible = modeDAvant;
    modeDAvant = null;
    if (cible) changerDeMode(cible);
  });

  function changerDeMode(suivant: Mode): void {
    mode = suivant;
    dessiner();
    gestes.surMode();
  }

  function activer(rampe: number, rang: number, focaliser: boolean): void {
    if (cellules.length === 0) return;
    const ligne = Math.max(0, Math.min(cellules.length - 1, rampe));
    const place = Math.max(0, Math.min(cellules[ligne].length - 1, rang));
    active = { rampe: ligne, colonne: place };
    cellules.flat().forEach((cellule) => { cellule.tabIndex = -1; });
    const cible = cellules[ligne][place];
    cible.tabIndex = 0;
    if (focaliser) cible.focus();
  }

  /** Le choix qu'une cellule porte : la colonne 0 est la pastille `on-solid`. */
  function choixDe(rampe: number, place: number): Choix {
    return place === 0 ? { nature: 'fond' } : { nature: 'nuance', profil: PROFILS[rampe], rang: place - 1 };
  }

  function choisir(suivant: Choix | null): void {
    choix = suivant;
    dessiner();
  }

  grille.addEventListener('keydown', (evenement) => {
    const largeur = cellules[active.rampe]?.length ?? 0;
    if (evenement.key === 'Enter' || evenement.key === ' ') {
      evenement.preventDefault();
      choisir(choixDe(active.rampe, active.colonne));
      activer(active.rampe, active.colonne, true);
      return;
    }
    const cibles: Record<string, [number, number]> = {
      ArrowRight: [active.rampe, active.colonne + 1],
      ArrowLeft: [active.rampe, active.colonne - 1],
      ArrowDown: [active.rampe + 1, active.colonne],
      ArrowUp: [active.rampe - 1, active.colonne],
      Home: [active.rampe, 0],
      End: [active.rampe, largeur - 1],
    };
    const cible = cibles[evenement.key];
    if (!cible) return;
    evenement.preventDefault();
    activer(cible[0], cible[1], true);
  });

  /** Les promesses du thème montré qui comptent `emploi` au décalage donné, dans un profil. */
  function promessesDuRole(analyse: AnalyseDePalette, profil: Profil, emploi: Emploi, decalage: number): Promesse[] {
    return analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === profil
      && [promesse.paire.premier, promesse.paire.second].some((membre) => 'emploi' in membre && membre.emploi === emploi && membre.decalage === decalage));
  }

  /** Le nom d'un membre dans une relation : « fond », « on-solid » ou « surface 100 ». */
  function nomDuMembre(promesse: Promesse, rang: 'premier' | 'second'): string {
    const membre = promesse.paire[rang];
    if (!('emploi' in membre)) return TEXTES_DU_NUANCIER.fondCourt;
    const designe = promesse[rang];
    return designe.nature === 'cran' ? `${membre.emploi} ${designe.cran}` : membre.emploi;
  }

  /** Une garantie du détail, qui la choisit dans la carte des garanties. */
  function lienDeGarantie(promesse: Promesse, emploi: Emploi, decalage: number): HTMLButtonElement {
    const premier = promesse.paire.premier;
    const estPremier = 'emploi' in premier && premier.emploi === emploi && premier.decalage === decalage;
    const sens = estPremier ? TEXTES_DU_DETAIL.sur(nomDuMembre(promesse, 'second')) : TEXTES_DU_DETAIL.dessus(nomDuMembre(promesse, 'premier'));
    const lien = bouton('lien-de-constat', TEXTES_DU_DETAIL.garantie(promesse.verdict === 'tenue', sens, promesse.contraste));
    lien.classList.add('garantie-du-detail');
    lien.dataset.verdict = promesse.verdict;
    lien.addEventListener('click', () => gestes.choisirGarantie(associationDe(promesse.paire)));
    return lien;
  }

  /** Une ligne « Sert à » : le spécimen, le rôle et son état, son nom français, puis ses garanties. */
  function ligneDUsage(emploi: Emploi, decalage: number, specimen: HTMLElement, promesses: readonly Promesse[]): HTMLDivElement {
    const ligne = document.createElement('div');
    ligne.className = 'usage-du-detail';
    const quoi = document.createElement('div');
    quoi.className = 'usage-quoi';
    const role = document.createElement('p');
    role.append(codeDuRole(emploi), ` · ${NOM_DE_L_ETAT[decalage as 0 | 1 | 2] ?? decalage}`);
    const garanties = document.createElement('p');
    garanties.className = 'usage-garanties';
    for (const promesse of promesses) garanties.append(lienDeGarantie(promesse, emploi, decalage));
    quoi.append(role, paragraphe(NOM_DU_ROLE[emploi], 'ligne-secondaire'), garanties);
    ligne.append(specimen, quoi);
    return ligne;
  }

  /** Les mesures repliées : niveaux WCAG, blanc et noir, OKLCH, nuances identiques ou confondues ([VER-13]). */
  function mesuresDetaillees(cran: Cran, profil: Profil, rang: number, entrees: EntreesDuNuancier, fondDuMode: Rgb8): HTMLDetailsElement {
    const { recette, analyse } = entrees;
    const numero = recette.crans[rang];
    const mesure = mesurerCran(cran.couleur, fondDuMode, recette.seuils);
    const repli = document.createElement('details');
    repli.className = 'constat-detail';
    const resume = document.createElement('summary');
    resume.textContent = TEXTES_DU_DETAIL.mesures;
    repli.append(
      resume,
      paragraphe(`${TEXTES_DU_NUANCIER.avecLeFond(contrasteEcrit(mesure.fond))} · ${niveauxEcrits(niveauxWcag(mesure.fond))}`),
      paragraphe(`${TEXTES_DU_NUANCIER.avecLeBlanc(contrasteEcrit(mesure.blanc))} · ${TEXTES_DU_NUANCIER.avecLeNoir(contrasteEcrit(mesure.noir))}`),
      paragraphe(TEXTES_DU_NUANCIER.oklch(cran.L, cran.C, cran.H)),
    );
    for (const autre of [rang - 1, rang + 1].filter((voisin) => analyse.rampes[profil][mode][voisin]?.hexa === cran.hexa)) {
      repli.append(paragraphe(TEXTES_DU_NUANCIER.memeCouleur(recette.crans[autre])));
    }
    if (entrees.confondues.some((confondue) => confondue.mode === mode && confondue.cran === numero)) {
      repli.append(paragraphe(TEXTES_DU_NUANCIER.tresProche(profil === 'soft' ? 'vivid' : 'soft')));
    }
    return repli;
  }

  /** L'en-tête d'un détail : grande pastille, titre, code et « Copier ». */
  function enTeteDuDetail(couleur: string, titre: string, code: string): HTMLDivElement {
    const enTete = document.createElement('div');
    enTete.className = 'detail-tete';
    const grande = document.createElement('span');
    grande.className = 'detail-pastille';
    grande.style.background = couleur;
    const nomme = document.createElement('div');
    const nomDuDetail = paragraphe(titre);
    nomDuDetail.className = 'detail-titre';
    const codeDuDetail = paragraphe(code);
    codeDuDetail.className = 'detail-code';
    nomme.append(nomDuDetail, codeDuDetail);
    const copie = bouton('bouton-discret', TEXTES_DU_NUANCIER.copier);
    copie.addEventListener('click', () => {
      copier(code);
      copie.textContent = TEXTES_DU_NUANCIER.copie;
    });
    enTete.append(grande, nomme, copie);
    return enTete;
  }

  function detailDeNuance(profil: Profil, rang: number, entrees: EntreesDuNuancier): HTMLElement[] {
    const { recette, analyse } = entrees;
    const cran = analyse.rampes[profil][mode][rang];
    const fondDuMode = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
    const blocs: HTMLElement[] = [enTeteDuDetail(cran.hexa, TEXTES_DU_DETAIL.titre(profil, recette.crans[rang]), cran.hexa)];
    if (analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang) {
      const reference = paragraphe(TEXTES_DU_DETAIL.reference);
      reference.className = 'detail-reference';
      blocs.push(reference);
    }
    const emplois = emploisDuCran(recette.crans, rang);
    if (emplois.length === 0) {
      blocs.push(
        sousTitre(TEXTES_DU_DETAIL.nuanceLibre),
        paragraphe(TEXTES_DU_NUANCIER.avecLeFond(contrasteEcrit(contraste(cran.couleur, fondDuMode)))),
      );
    } else {
      blocs.push(sousTitre(TEXTES_DU_DETAIL.sertA));
      for (const { emploi, decalage } of emplois) {
        blocs.push(ligneDUsage(emploi, decalage, specimenDuRole(emploi, cran.couleur, fondDuMode), promessesDuRole(analyse, profil, emploi, decalage)));
      }
    }
    blocs.push(mesuresDetaillees(cran, profil, rang, entrees, fondDuMode));
    return blocs;
  }

  /** Le détail de la pastille `on-solid` : le fond de page, posé en texte sur `solid`, et ses garanties par profil. */
  function detailDuFond(entrees: EntreesDuNuancier): HTMLElement[] {
    const { recette, analyse } = entrees;
    const fondDuMode = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
    const depart = recette.crans.indexOf(TABLE_DES_EMPLOIS.solid);
    const fin = recette.crans[Math.min(recette.crans.length - 1, depart + Math.max(...decalagesDeLEmploi('on-solid')))];
    const blocs: HTMLElement[] = [
      enTeteDuDetail(recette.fonds[mode], TEXTES_DU_DETAIL.titreDuFond, recette.fonds[mode]),
      paragraphe(TEXTES_DU_DETAIL.fondDePage(TABLE_DES_EMPLOIS.solid, fin)),
      sousTitre(TEXTES_DU_DETAIL.sertA),
    ];
    for (const profil of PROFILS) {
      const promesses = promessesDuRole(analyse, profil, 'on-solid', 0).sort((a, b) => etatDeLaPaire(a.paire) - etatDeLaPaire(b.paire));
      // Le texte on-solid se montre posé sur le fond plein de son premier état.
      const plein = analyse.rampes[profil][mode][depart];
      const ligne = ligneDUsage('on-solid', 0, specimenDuRole('solid', plein.couleur, fondDuMode, fondDuMode), promesses);
      ligne.querySelector('.usage-quoi p')?.prepend(`${NOM_DU_PROFIL[profil]} · `);
      blocs.push(ligne);
    }
    return blocs;
  }

  function rendreLeDetail(entrees: EntreesDuNuancier): void {
    if (!choix) {
      detail.replaceChildren();
      detail.hidden = true;
      return;
    }
    detail.replaceChildren(...(choix.nature === 'nuance' ? detailDeNuance(choix.profil, choix.rang, entrees) : detailDuFond(entrees)));
    detail.hidden = false;
  }

  /** Les deux lignes d'accolades ([UI-04]), calculées par `accoladesDe`. */
  function rendreLesAccolades(recette: Recette): void {
    const lignes = accoladesDe(recette.crans).map((accoladesDeLaLigne) => {
      const ligne = document.createElement('div');
      ligne.className = 'accolades-ligne';
      for (const accolade of accoladesDeLaLigne) {
        const trait = document.createElement('span');
        trait.className = 'accolade';
        trait.style.gridColumn = `${colonne(accolade.debut)} / ${colonne(accolade.fin) + 1}`;
        const libelle = document.createElement('span');
        libelle.className = 'accolade-libelle';
        libelle.style.gridColumn = `${colonne(accolade.libelle.debut)} / ${colonne(accolade.libelle.fin) + 1}`;
        libelle.style.textAlign = accolade.libelle.alignement;
        const role = codeDuRole(accolade.emplois.join(' · '));
        const nom = document.createElement('span');
        nom.className = 'accolade-nom';
        nom.textContent = accolade.emplois.map((emploi) => NOM_DU_ROLE[emploi]).join(' · ');
        libelle.append(role, nom);
        ligne.append(trait, libelle);
      }
      return ligne;
    });
    accolades.replaceChildren(...lignes);
  }

  function dessiner(): void {
    for (const { valeur, choixDuMode } of boutonsDeMode) choixDuMode.setAttribute('aria-pressed', String(valeur === mode));
    retour.hidden = modeDAvant === null;
    if (modeDAvant) retour.textContent = TEXTES_DU_NUANCIER.revenirAuTheme(modeDAvant);
    if (!donnees) return;
    const entrees = donnees;
    const { recette, analyse } = entrees;
    const couleurDuFond = lireHexa(recette.fonds[mode]) ?? [255, 255, 255];
    const encres = encresSur(couleurDuFond);
    surface.style.background = recette.fonds[mode];
    surface.style.setProperty('--encre-surface', encres.encre);
    surface.style.setProperty('--encre-surface-seconde', encres.seconde);
    surface.style.setProperty('--bordure-surface', encres.bordure);
    surface.style.setProperty('--colonnes', String(recette.crans.length));
    teinteDuFond.style.background = recette.fonds[mode];
    hexaDuFond.textContent = recette.fonds[mode];
    pastilleDuFond.setAttribute('aria-label', TEXTES_DU_NUANCIER.modifierLeFond(mode, recette.fonds[mode]));
    suivreLaCouleur(pastilleDuFond, recette.fonds[modeDuSelecteur]);

    const numeros = document.createElement('div');
    numeros.className = 'nuancier-rangee';
    numeros.setAttribute('role', 'row');
    const coin = document.createElement('span');
    coin.className = 'nuancier-profil';
    coin.setAttribute('role', 'columnheader');
    coin.style.gridRow = '1';
    numeros.append(coin, ...recette.crans.map((numero, rang) => {
      const entete = document.createElement('span');
      entete.style.gridColumn = String(colonne(rang));
      entete.style.gridRow = '1';
      entete.className = 'nuancier-numero';
      entete.setAttribute('role', 'columnheader');
      entete.textContent = String(numero);
      return entete;
    }));

    // La pastille on-solid : peinte du fond du thème, sur la hauteur des deux rangées.
    const onSolid = document.createElement('span');
    onSolid.className = 'pastille pastille-on-solid';
    onSolid.setAttribute('role', 'gridcell');
    onSolid.style.gridColumn = String(colonne(-1));
    onSolid.style.gridRow = '2 / span 2';
    onSolid.style.background = recette.fonds[mode];
    onSolid.setAttribute('aria-label', TEXTES_DU_NUANCIER.etiquetteDuFond(recette.fonds[mode]));
    onSolid.setAttribute('aria-selected', String(choix?.nature === 'fond'));
    onSolid.addEventListener('click', () => {
      active = { rampe: active.rampe, colonne: 0 };
      choisir({ nature: 'fond' });
      activer(active.rampe, 0, true);
    });
    onSolid.addEventListener('focus', () => { active = { rampe: active.rampe, colonne: 0 }; });

    const confondues = new Set(entrees.confondues.filter((confondue) => confondue.mode === mode).map((confondue) => confondue.cran));
    cellules = [];
    const rangees = PROFILS.map((profil, rangDeRampe) => {
      const rangee = document.createElement('div');
      rangee.className = 'nuancier-rangee';
      rangee.setAttribute('role', 'row');
      const entete = document.createElement('span');
      entete.className = 'nuancier-profil';
      entete.setAttribute('role', 'rowheader');
      entete.style.gridRow = String(rangDeRampe + 2);
      entete.textContent = NOM_DU_PROFIL[profil];
      rangee.append(entete);
      if (rangDeRampe === 0) rangee.append(onSolid);
      const pastilles = analyse.rampes[profil][mode].map((cran, rang) => {
        const numero = recette.crans[rang];
        const pastille = document.createElement('span');
        pastille.className = 'pastille';
        pastille.setAttribute('role', 'gridcell');
        pastille.dataset.cran = String(numero);
        pastille.dataset.profil = profil;
        pastille.style.gridColumn = String(colonne(rang));
        pastille.style.gridRow = String(rangDeRampe + 2);
        pastille.style.background = cran.hexa;
        pastille.style.color = contraste(cran.couleur, [0, 0, 0]) >= contraste(cran.couleur, [255, 255, 255]) ? '#000000' : '#FFFFFF';
        const reference = analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang;
        const etiquettes = [TEXTES_DU_NUANCIER.etiquetteDeNuance(NOM_DU_PROFIL[profil], numero, cran.hexa)];
        if (reference) {
          pastille.dataset.reference = 'true';
          pastille.textContent = '◆';
          etiquettes.push(TEXTES_DU_NUANCIER.reference);
        }
        if (confondues.has(numero)) {
          pastille.dataset.confondue = 'true';
          etiquettes.push(TEXTES_DU_NUANCIER.tresProche(profil === 'soft' ? 'vivid' : 'soft'));
        }
        pastille.setAttribute('aria-label', etiquettes.join(', '));
        pastille.setAttribute('aria-selected', String(choix?.nature === 'nuance' && choix.profil === profil && choix.rang === rang));
        pastille.tabIndex = -1;
        pastille.addEventListener('click', () => {
          active = { rampe: rangDeRampe, colonne: rang + 1 };
          choisir({ nature: 'nuance', profil, rang });
          activer(rangDeRampe, rang + 1, true);
        });
        pastille.addEventListener('focus', () => { active = { rampe: rangDeRampe, colonne: rang + 1 }; });
        return pastille;
      });
      rangee.append(...pastilles);
      cellules.push([onSolid, ...pastilles]);
      return rangee;
    });
    grille.replaceChildren(numeros, ...rangees);
    activer(active.rampe, active.colonne, false);
    rendreLesAccolades(recette);
    rendreLeDetail(entrees);
  }

  return {
    element: surface,
    tete,
    mode: () => mode,
    afficher(entrees) {
      donnees = entrees;
      dessiner();
    },
    montrerLeTheme(suivant) {
      if (suivant === mode) return;
      modeDAvant = mode;
      changerDeMode(suivant);
    },
    choisirLeTheme(suivant) {
      modeDAvant = null;
      if (suivant === mode) dessiner();
      else changerDeMode(suivant);
    },
  };
}
