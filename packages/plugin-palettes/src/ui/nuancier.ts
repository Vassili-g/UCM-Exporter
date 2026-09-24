/**
 * Le nuancier de la palette ouverte ([UI-04]) : une surface peinte du fond du
 * thème choisi, les numéros de nuance alignés sur les rampes Soft et Vivid, la
 * référence exacte repérée ([MOT-17]), les plages de chaque usage par famille,
 * et le détail de la nuance, de l'usage ou de la promesse choisis.
 *
 * Les pastilles forment une grille au sens WAI-ARIA : une seule est atteinte
 * par la tabulation, les flèches, Origine et Fin déplacent le focus, Entrée et
 * Espace choisissent. Le survol signale seulement la cible. La copie d'un code
 * est un bouton du détail, distinct du choix d'une nuance.
 */
import {
  ASSOCIATIONS,
  PROFILS,
  TABLE_DES_EMPLOIS,
  associationDe,
  cleDeLAssociation,
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
import type { GroupeDePromesses } from '../presentation';
import {
  FAMILLES_D_USAGES,
  NOM_DE_L_EMPLOI,
  NOM_DU_PROFIL,
  TEXTES,
  TEXTES_DE_LA_PLANCHE,
  TEXTES_DU_NUANCIER,
  associationEcrite,
  contrasteEcrit,
  emploiEcrit,
  niveauxEcrits,
  type FamilleDUsages,
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
  /** Le thème a changé : l'éditeur de dérive et la ligne de référence le suivent. */
  surMode(): void;
  /** « Modifier » ouvre les couleurs de fond des Réglages communs ([UI-04]). */
  modifierLeFond(): void;
}

export interface NuancierUi {
  element: HTMLDivElement;
  afficher(entrees: EntreesDuNuancier): void;
  mode(): Mode;
  /**
   * Désigne les deux couleurs d'une promesse et montre son spécimen. Une
   * promesse de l'autre thème bascule le thème, et un bouton ramène au thème
   * d'avant.
   */
  inspecter(groupe: GroupeDePromesses): void;
}

type Choix =
  | { readonly nature: 'nuance'; readonly profil: Profil; readonly rang: number }
  | { readonly nature: 'usage'; readonly emploi: Emploi }
  | { readonly nature: 'promesse'; readonly association: Association; readonly etat: number };

const nombreDeColonnes = (recette: Recette): string => String(recette.crans.length);

/** L'encre qui se lit sur le fond du thème : la sombre ou la claire des couleurs de la planche. */
function encresSur(fond: Rgb8): { encre: string; seconde: string; bordure: string } {
  const sombre = contraste(fond, [30, 30, 30]) >= contraste(fond, [245, 245, 245]);
  return sombre
    ? { encre: '#1E1E1E', seconde: 'rgba(30, 30, 30, 0.72)', bordure: 'rgba(30, 30, 30, 0.28)' }
    : { encre: '#F5F5F5', seconde: 'rgba(245, 245, 245, 0.72)', bordure: 'rgba(245, 245, 245, 0.32)' };
}

function bouton(classe: string, texte = ''): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = classe;
  element.textContent = texte;
  return element;
}

function paragraphe(texte: string, classe = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

/** Le titre du détail : une nuance ou un usage. */
function titreDeDetail(texte: string): HTMLParagraphElement {
  const titre = paragraphe(texte);
  titre.className = 'detail-titre';
  return titre;
}

/** Une barre d'usage, qui choisit cet usage ; `surFond` pour `on-solid`, qui n'a pas de nuance. */
function barreDUsage(texte: string, surFond: boolean): HTMLButtonElement {
  const barre = bouton('', texte);
  if (surFond) barre.className = 'usage-barre usage-barre-fond';
  else barre.className = 'usage-barre';
  return barre;
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

export function createNuancier(gestes: GestesDuNuancier): NuancierUi {
  const element = document.createElement('div');
  element.className = 'nuancier';

  // En-tête : les deux thèmes, le retour après une promesse de l'autre thème, et le fond.
  const tete = document.createElement('div');
  tete.className = 'nuancier-tete';
  const bascule = document.createElement('div');
  bascule.className = 'bascule';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES.modesDeLApercu);
  const retour = bouton('bouton-discret');
  retour.hidden = true;
  const fond = document.createElement('div');
  fond.className = 'nuancier-fond';
  const libelleDuFond = document.createElement('span');
  libelleDuFond.className = 'field-label';
  libelleDuFond.textContent = TEXTES_DU_NUANCIER.fond;
  const pastilleDuFond = document.createElement('span');
  pastilleDuFond.className = 'pastille-du-fond';
  const hexaDuFond = document.createElement('span');
  hexaDuFond.className = 'ligne-secondaire';
  const modifier = bouton('lien-de-constat', TEXTES_DU_NUANCIER.modifier);
  modifier.addEventListener('click', () => gestes.modifierLeFond());
  fond.append(libelleDuFond, pastilleDuFond, hexaDuFond, modifier);
  tete.append(bascule, retour, fond);

  const surface = document.createElement('div');
  surface.className = 'nuancier-surface';
  const grille = document.createElement('div');
  grille.className = 'nuancier-grille';
  grille.setAttribute('role', 'grid');
  grille.setAttribute('aria-label', TEXTES.apercu);

  const usages = document.createElement('div');
  usages.className = 'usages';
  const familles = document.createElement('div');
  familles.className = 'bascule usages-familles';
  familles.setAttribute('role', 'group');
  familles.setAttribute('aria-label', TEXTES_DU_NUANCIER.familles);
  const lignesDUsages = document.createElement('div');
  lignesDUsages.className = 'usages-lignes';
  usages.append(familles, lignesDUsages);

  const detail = document.createElement('div');
  detail.className = 'nuancier-detail';
  detail.setAttribute('aria-live', 'polite');
  detail.hidden = true;
  surface.append(grille, usages, detail);
  element.append(tete, surface);

  let mode: Mode = 'light';
  let modeDAvant: Mode | null = null;
  let famille: FamilleDUsages = 'fonds';
  let choix: Choix | null = null;
  /** La pastille que la tabulation atteint : rang de la rampe, rang de la nuance. */
  let active = { rampe: 1, cran: 7 };
  let donnees: EntreesDuNuancier | null = null;

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

  const boutonsDeFamille = (Object.keys(FAMILLES_D_USAGES) as FamilleDUsages[]).map((valeur) => {
    const choixDeFamille = bouton('bascule-option', FAMILLES_D_USAGES[valeur].nom);
    choixDeFamille.addEventListener('click', () => {
      famille = valeur;
      dessiner();
    });
    familles.append(choixDeFamille);
    return { valeur, choixDeFamille };
  });

  function changerDeMode(suivant: Mode): void {
    mode = suivant;
    dessiner();
    gestes.surMode();
  }

  function cellules(): HTMLElement[][] {
    return Array.from(grille.querySelectorAll<HTMLElement>('[role="row"]'))
      .map((rangee) => Array.from(rangee.querySelectorAll<HTMLElement>('[role="gridcell"]')))
      .filter((rangee) => rangee.length > 0);
  }

  function activer(rampe: number, cran: number, focaliser: boolean): void {
    const toutes = cellules();
    if (toutes.length === 0) return;
    const ligne = Math.max(0, Math.min(toutes.length - 1, rampe));
    const colonne = Math.max(0, Math.min(toutes[ligne].length - 1, cran));
    active = { rampe: ligne, cran: colonne };
    toutes.flat().forEach((cellule) => { cellule.tabIndex = -1; });
    const cible = toutes[ligne][colonne];
    cible.tabIndex = 0;
    if (focaliser) cible.focus();
  }

  function choisir(suivant: Choix | null): void {
    choix = suivant;
    dessiner();
  }

  grille.addEventListener('keydown', (evenement) => {
    const largeur = cellules()[active.rampe]?.length ?? 0;
    if (evenement.key === 'Enter' || evenement.key === ' ') {
      evenement.preventDefault();
      choisir({ nature: 'nuance', profil: PROFILS[active.rampe], rang: active.cran });
      activer(active.rampe, active.cran, true);
      return;
    }
    const cibles: Record<string, [number, number]> = {
      ArrowRight: [active.rampe, active.cran + 1],
      ArrowLeft: [active.rampe, active.cran - 1],
      ArrowDown: [active.rampe + 1, active.cran],
      ArrowUp: [active.rampe - 1, active.cran],
      Home: [active.rampe, 0],
      End: [active.rampe, largeur - 1],
    };
    const cible = cibles[evenement.key];
    if (!cible) return;
    evenement.preventDefault();
    activer(cible[0], cible[1], true);
  });

  /** Les promesses d'une association dans le thème montré, par état puis par profil. */
  function promessesDe(association: Association, analyse: AnalyseDePalette): Promesse[] {
    const cle = cleDeLAssociation(association);
    return analyse.promesses.filter((promesse) => promesse.mode === mode && cleDeLAssociation(associationDe(promesse.paire)) === cle);
  }

  /** Les rangs qu'une promesse choisie désigne, par profil, et vrai quand le fond du thème en est membre. */
  function membresDesignes(analyse: AnalyseDePalette, recette: Recette): { rangs: Set<string>; fond: boolean } {
    const rangs = new Set<string>();
    let surFond = false;
    if (choix?.nature !== 'promesse') return { rangs, fond: false };
    const { association, etat } = choix;
    for (const promesse of promessesDe(association, analyse).filter((candidate) => etatDeLaPaire(candidate.paire) === etat)) {
      for (const membre of [promesse.premier, promesse.second]) {
        if (membre.nature === 'fond') surFond = true;
        else rangs.add(`${promesse.profil}:${recette.crans.indexOf(membre.cran)}`);
      }
    }
    return { rangs, fond: surFond };
  }

  function specimen(promesse: Promesse): HTMLDivElement {
    const bloc = document.createElement('div');
    bloc.className = 'specimen';
    const echantillon = document.createElement('span');
    echantillon.className = 'specimen-echantillon';
    echantillon.textContent = TEXTES_DE_LA_PLANCHE.specimen;
    echantillon.style.background = `rgb(${promesse.second.couleur.join(', ')})`;
    echantillon.style.color = `rgb(${promesse.premier.couleur.join(', ')})`;
    const mesure = document.createElement('span');
    mesure.textContent = `${NOM_DU_PROFIL[promesse.profil]} : ${contrasteEcrit(promesse.contraste)} · ${promesse.verdict === 'tenue' ? TEXTES_DE_LA_PLANCHE.tenu : TEXTES_DE_LA_PLANCHE.manque}`;
    bloc.append(echantillon, mesure);
    return bloc;
  }

  /** Le détail d'une association : un état par ligne, le spécimen et le résultat de chaque profil. */
  function detailDAssociation(association: Association, etats: readonly number[] | null, analyse: AnalyseDePalette): HTMLElement[] {
    const promesses = promessesDe(association, analyse);
    const parEtat = [...new Set(promesses.map((promesse) => etatDeLaPaire(promesse.paire)))]
      .filter((etat) => etats === null || etats.includes(etat))
      .sort((a, b) => a - b);
    return parEtat.map((etat) => {
      const ligne = document.createElement('div');
      ligne.className = 'detail-association';
      const titre = paragraphe(associationEcrite(association, etat as 0 | 1 | 2));
      titre.className = 'detail-sous-titre';
      const duEtat = promesses.filter((promesse) => etatDeLaPaire(promesse.paire) === etat);
      const seuil = duEtat[0]?.seuil ?? 0;
      ligne.append(titre, paragraphe(TEXTES_DU_NUANCIER.minimum(seuil), 'ligne-secondaire'), ...duEtat.map(specimen));
      return ligne;
    });
  }

  function detailDeNuance(profil: Profil, rang: number, entrees: EntreesDuNuancier): HTMLElement[] {
    const { recette, analyse } = entrees;
    const cran: Cran = analyse.rampes[profil][mode][rang];
    const numero = recette.crans[rang];
    const fondDuMode = lireHexa(recette.fonds[mode]);
    const enTete = document.createElement('div');
    enTete.className = 'detail-tete';
    enTete.append(titreDeDetail(TEXTES_DU_NUANCIER.titreDeNuance(NOM_DU_PROFIL[profil], numero, cran.hexa)));
    const copie = bouton('lien-de-constat', TEXTES_DU_NUANCIER.copier);
    copie.addEventListener('click', () => {
      copier(cran.hexa);
      copie.textContent = TEXTES_DU_NUANCIER.copie;
    });
    enTete.append(copie);
    const blocs: HTMLElement[] = [enTete];
    const { ancrage } = analyse;
    if (ancrage.profil === profil && ancrage.rangs[mode] === rang) {
      const estLaReference = paragraphe(TEXTES_DU_NUANCIER.estLaReference);
      estLaReference.className = 'detail-reference';
      blocs.push(estLaReference);
    }
    const voisins = [rang - 1, rang + 1].filter((autre) => analyse.rampes[profil][mode][autre]?.hexa === cran.hexa);
    for (const autre of voisins) blocs.push(paragraphe(TEXTES_DU_NUANCIER.memeCouleur(recette.crans[autre]), 'ligne-secondaire'));
    const emplois = emploisDuCran(recette.crans, rang);
    blocs.push(paragraphe(emplois.length > 0 ? emplois.map(emploiEcrit).join(' · ') : TEXTES_DU_NUANCIER.aucunUsage));
    if (fondDuMode) {
      const mesure = mesurerCran(cran.couleur, fondDuMode, recette.seuils);
      blocs.push(
        paragraphe(`${TEXTES_DU_NUANCIER.avecLeFond(contrasteEcrit(mesure.fond))} · ${niveauxEcrits(niveauxWcag(mesure.fond))}`),
        paragraphe(`${TEXTES_DU_NUANCIER.avecLeBlanc(contrasteEcrit(mesure.blanc))} · ${TEXTES_DU_NUANCIER.avecLeNoir(contrasteEcrit(mesure.noir))}`, 'ligne-secondaire'),
      );
    }
    if (entrees.confondues.some((confondue) => confondue.mode === mode && confondue.cran === numero)) {
      blocs.push(paragraphe(TEXTES_DU_NUANCIER.tresProche(profil === 'soft' ? 'vivid' : 'soft'), 'ligne-secondaire'));
    }
    const avancees = document.createElement('details');
    avancees.className = 'constat-detail';
    const resume = document.createElement('summary');
    resume.textContent = TEXTES_DU_NUANCIER.mesuresAvancees;
    avancees.append(resume, paragraphe(TEXTES_DU_NUANCIER.oklch(cran.L, cran.C, cran.H)));
    blocs.push(avancees);
    return blocs;
  }

  function detailDUsage(emploi: Emploi, entrees: EntreesDuNuancier): HTMLElement[] {
    const cible = TABLE_DES_EMPLOIS[emploi];
    const blocs: HTMLElement[] = [
      titreDeDetail(cible === 'fond' ? TEXTES_DU_NUANCIER.titreDUsageSurFond(NOM_DE_L_EMPLOI[emploi]) : TEXTES_DU_NUANCIER.titreDUsage(NOM_DE_L_EMPLOI[emploi], cible)),
      paragraphe(TEXTES_DE_LA_PLANCHE.usage[emploi], 'ligne-secondaire'),
    ];
    const associations = ASSOCIATIONS.filter((association) => association.premier === emploi || association.second === emploi);
    if (associations.length === 0) blocs.push(paragraphe(TEXTES_DU_NUANCIER.sansPromesse));
    for (const association of associations) blocs.push(...detailDAssociation(association, null, entrees.analyse));
    return blocs;
  }

  function rendreLeDetail(entrees: EntreesDuNuancier): void {
    if (!choix) {
      detail.replaceChildren();
      detail.hidden = true;
      return;
    }
    const contenu = choix.nature === 'nuance'
      ? detailDeNuance(choix.profil, choix.rang, entrees)
      : choix.nature === 'usage'
        ? detailDUsage(choix.emploi, entrees)
        : detailDAssociation(choix.association, [choix.etat], entrees.analyse);
    detail.replaceChildren(...contenu);
    detail.hidden = false;
  }

  /** Les colonnes qu'un usage occupe, avec l'état de chacune : son cran, puis survol et appui. */
  function plageDe(emploi: Emploi, recette: Recette): Map<number, number> {
    const plage = new Map<number, number>();
    const cible = TABLE_DES_EMPLOIS[emploi];
    if (cible === 'fond') return plage;
    const depart = recette.crans.indexOf(cible);
    if (depart < 0) return plage;
    for (const decalage of decalagesDeLEmploi(emploi)) {
      if (depart + decalage < recette.crans.length) plage.set(depart + decalage, decalage);
    }
    return plage;
  }

  function rendreLesUsages(recette: Recette): void {
    for (const { valeur, choixDeFamille } of boutonsDeFamille) choixDeFamille.setAttribute('aria-pressed', String(valeur === famille));
    usages.dataset.famille = famille;
    const lignes: HTMLElement[] = [];
    for (const [cle, definition] of Object.entries(FAMILLES_D_USAGES) as [FamilleDUsages, typeof FAMILLES_D_USAGES[FamilleDUsages]][]) {
      const titre = paragraphe(definition.nom);
      titre.className = 'usages-famille';
      titre.dataset.famille = cle;
      lignes.push(titre);
      for (const emploi of definition.emplois) {
        const ligne = document.createElement('div');
        ligne.className = 'usage-ligne';
        ligne.dataset.famille = cle;
        const plage = plageDe(emploi, recette);
        const choisie = choix?.nature === 'usage' && choix.emploi === emploi;
        if (plage.size === 0) {
          // on-solid n'a pas de nuance : il prend le fond du thème, que sa ligne nomme.
          const barre = barreDUsage(`${emploi} · ${TEXTES_DE_LA_PLANCHE.fondDuTheme}`, true);
          barre.setAttribute('aria-pressed', String(choisie));
          barre.addEventListener('click', () => choisir({ nature: 'usage', emploi }));
          ligne.append(barre);
        } else {
          const rangs = [...plage.keys()];
          const debut = Math.min(...rangs);
          const barre = barreDUsage(emploi, false);
          barre.style.gridColumn = `${debut + 2} / span ${rangs.length}`;
          barre.setAttribute('aria-label', `${NOM_DE_L_EMPLOI[emploi]}, ${TEXTES_DU_NUANCIER.plage(rangs.map((rang) => recette.crans[rang]))}`);
          barre.setAttribute('aria-pressed', String(choisie));
          barre.addEventListener('click', () => choisir({ nature: 'usage', emploi }));
          ligne.append(barre);
        }
        lignes.push(ligne);
      }
    }
    lignesDUsages.replaceChildren(...lignes);
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
    surface.style.setProperty('--colonnes', nombreDeColonnes(recette));
    pastilleDuFond.style.background = recette.fonds[mode];
    hexaDuFond.textContent = recette.fonds[mode];
    const designes = membresDesignes(analyse, recette);
    pastilleDuFond.dataset.paire = String(designes.fond);

    const numeros = document.createElement('div');
    numeros.className = 'nuancier-rangee nuancier-numeros';
    numeros.setAttribute('role', 'row');
    const coin = document.createElement('span');
    coin.className = 'nuancier-profil';
    coin.setAttribute('role', 'columnheader');
    numeros.append(coin, ...recette.crans.map((numero, rang) => {
      const entete = document.createElement('span');
      entete.style.gridColumn = String(rang + 2);
      entete.className = 'nuancier-numero';
      entete.setAttribute('role', 'columnheader');
      entete.textContent = String(numero);
      return entete;
    }));

    const confondues = new Set(entrees.confondues.filter((confondue) => confondue.mode === mode).map((confondue) => confondue.cran));
    const rangees = PROFILS.map((profil, rangDeRampe) => {
      const rangee = document.createElement('div');
      rangee.className = 'nuancier-rangee';
      rangee.setAttribute('role', 'row');
      const entete = document.createElement('span');
      entete.className = 'nuancier-profil';
      entete.setAttribute('role', 'rowheader');
      entete.textContent = NOM_DU_PROFIL[profil];
      rangee.append(entete);
      analyse.rampes[profil][mode].forEach((cran, rang) => {
        const numero = recette.crans[rang];
        const pastille = document.createElement('span');
        pastille.className = 'pastille';
        pastille.setAttribute('role', 'gridcell');
        pastille.dataset.cran = String(numero);
        pastille.dataset.profil = profil;
        pastille.style.gridColumn = String(rang + 2);
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
        pastille.dataset.paire = String(designes.rangs.has(`${profil}:${rang}`));
        pastille.tabIndex = -1;
        pastille.addEventListener('click', () => {
          active = { rampe: rangDeRampe, cran: rang };
          choisir({ nature: 'nuance', profil, rang });
          activer(rangDeRampe, rang, true);
        });
        pastille.addEventListener('focus', () => { active = { rampe: rangDeRampe, cran: rang }; });
        rangee.append(pastille);
      });
      return rangee;
    });
    grille.replaceChildren(numeros, ...rangees);
    activer(active.rampe, active.cran, false);
    rendreLesUsages(recette);
    rendreLeDetail(entrees);
  }

  return {
    element,
    mode: () => mode,
    afficher(entrees) {
      donnees = entrees;
      dessiner();
    },
    inspecter(groupe) {
      if (groupe.mode !== mode) {
        modeDAvant = mode;
        mode = groupe.mode;
        gestes.surMode();
      }
      choix = { nature: 'promesse', association: groupe.association, etat: groupe.etat };
      dessiner();
      detail.scrollIntoView({ block: 'nearest' });
    },
  };
}
