/**
 * La section « Interface de test » ([UI-14]), dernière de l'onglet Palettes :
 * la palette ouverte, peinte dans le thème de l'aperçu et le profil porteur,
 * en deux vues qu'une bascule choisit. « Écran » montre une page d'équipe sur
 * le modèle de Radix Themes, qui se manipule : survol et appui avancent d'une
 * nuance, la case, l'interrupteur, les lignes et la navigation répondent,
 * sans rien enregistrer. « États » montre chaque composant à chaque état,
 * focus compris, sans survol. Chaque couleur vient de la table des emplois.
 *
 * Une palette libre n'a pas de rôles : la section se retire. Repliée à
 * l'ouverture, elle ne se dessine que dépliée ; la vue choisie dure la session.
 */
import { PROFILS, TABLE_DES_EMPLOIS, lireHexa, rampeDe, type Emploi, type Intensite, type Mode, type Profil, type Recette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { createCarte } from './carte';
import { encresSur } from './nuancier';
import { NOM_DU_PROFIL, TEXTES_DE_L_INTERFACE_DE_TEST } from './textes';

/** Un emploi et son état : 0 au repos, 1 au survol, 2 à l'appui. */
type Etat = 0 | 1 | 2;

/** Les emplois qui ont une nuance : `on-solid` est le fond du thème. */
type EmploiPeint = Exclude<Emploi, 'on-solid'>;

/** Les couleurs de l'écran, chacune lue dans la table des emplois, ou le fond et les encres du thème. */
export interface CouleursDeLInterface {
  readonly fond: string;
  readonly encre: string;
  readonly encreSeconde: string;
  /** La couleur d'un emploi à un état, dans l'intensité montrée. */
  readonly emploi: (emploi: EmploiPeint, etat: Etat) => string;
}

/**
 * Les couleurs de l'écran pour une palette et un thème. `on-solid` est le
 * fond du thème. Un état au-delà de la dernière nuance garde la dernière ;
 * `surface-card`, dans une liste sans 50, prend le fond du thème.
 */
export function couleursDeLInterface(recette: Recette, analyse: AnalyseDePalette, mode: Mode, intensite: Intensite = analyse.ancrage.profil): CouleursDeLInterface {
  const fond = recette.fonds[mode];
  const encres = encresSur(lireHexa(fond) ?? [255, 255, 255]);
  const rampe = rampeDe(analyse.rampes, intensite)[mode];
  return {
    fond,
    encre: encres.encre,
    encreSeconde: encres.seconde,
    emploi(emploi, etat) {
      const depart = analyse.grille.crans.indexOf(TABLE_DES_EMPLOIS[emploi]);
      // Une liste sans 50 n'a pas de fond de carte : la carte prend le fond du thème.
      if (depart < 0) return fond;
      return rampe[Math.min(rampe.length - 1, depart + etat)].hexa;
    },
  };
}

export interface InterfaceDeTestUi {
  readonly element: HTMLElement;
  /** Dessine la vue choisie quand la carte est dépliée ; une palette libre retire la section. */
  /** `palette` est l'identifiant de la palette ouverte : en changer rouvre la bascule du profil sur son porteur. */
  afficher(recette: Recette, analyse: AnalyseDePalette, mode: Mode, palette: string): void;
  /** Un geste sur l'en-tête qui déplie la carte : l'onglet redessine. */
  surBascule(action: () => void): void;
}

type Vue = 'ecran' | 'etats';

/** Un élément et son texte. Sa classe s'écrit en littéral à l'appel : la loi des styles la lit là. */
function noeud<K extends keyof HTMLElementTagNameMap>(nom: K, texte = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(nom);
  if (texte) element.textContent = texte;
  return element;
}

/** Un bouton de l'écran, qui ne soumet rien. */
function boutonDeLEcran(texte: string): HTMLButtonElement {
  const bouton = noeud('button', texte);
  bouton.type = 'button';
  return bouton;
}

/** Pose les couleurs d'un contrôle à ses trois états : la feuille les lit au survol et à l'appui. */
function etats(element: HTMLElement, propriete: 'fond' | 'texte' | 'bord', couleurs: readonly [string, string, string]): void {
  element.style.setProperty(`--essai-${propriete}-repos`, couleurs[0]);
  element.style.setProperty(`--essai-${propriete}-survol`, couleurs[1]);
  element.style.setProperty(`--essai-${propriete}-appui`, couleurs[2]);
}

/** Les trois états d'un emploi. */
const troisEtats = (couleurs: CouleursDeLInterface, emploi: EmploiPeint): [string, string, string] =>
  [couleurs.emploi(emploi, 0), couleurs.emploi(emploi, 1), couleurs.emploi(emploi, 2)];

/** Une bascule à deux états : case ou interrupteur, qui change au clic. */
function basculeDeLEcran(element: HTMLButtonElement, role: 'checkbox' | 'switch', libelle: string): void {
  element.setAttribute('role', role);
  element.setAttribute('aria-checked', 'true');
  element.setAttribute('aria-label', libelle);
  element.addEventListener('click', () => {
    element.setAttribute('aria-checked', String(element.getAttribute('aria-checked') !== 'true'));
  });
}

/** L'écran « Membres de l'équipe » : navigation, en-tête, encart, tableau, champ, options, actions. */
function ecranDeLEquipe(couleurs: CouleursDeLInterface): HTMLDivElement {
  const e = TEXTES_DE_L_INTERFACE_DE_TEST.equipe;
  const c = (emploi: EmploiPeint, etat: Etat = 0) => couleurs.emploi(emploi, etat);
  const racine = noeud('div');
  racine.className = 'essai-ecran';
  racine.setAttribute('role', 'group');
  racine.setAttribute('aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.ecran);

  // La navigation : l'entrée active en surface et en texte coloré ; un clic la déplace.
  const navigation = noeud('nav');
  navigation.className = 'essai-navigation';
  const organisation = noeud('p', e.organisation);
  organisation.className = 'essai-organisation';
  const entrees = e.navigation.map((libelle, rang) => {
    const entree = boutonDeLEcran(libelle);
    entree.className = 'essai-entree';
    etats(entree, 'fond', ['transparent', c('surface'), c('surface', 1)]);
    entree.style.setProperty('--essai-fond-actif', c('surface'));
    entree.style.setProperty('--essai-texte-actif', c('text'));
    if (rang === 0) entree.setAttribute('aria-current', 'page');
    entree.addEventListener('click', () => {
      for (const autre of entrees) autre.removeAttribute('aria-current');
      entree.setAttribute('aria-current', 'page');
    });
    return entree;
  });
  navigation.append(organisation, ...entrees);

  const corps = noeud('div');
  corps.className = 'essai-corps';

  const tete = noeud('div');
  tete.className = 'essai-tete';
  const titres = noeud('div');
  const titre = noeud('p', e.titre);
  titre.className = 'essai-titre';
  const sousTitre = noeud('p', e.sousTitre);
  sousTitre.className = 'essai-sous-titre';
  titres.append(titre, sousTitre);
  const inviter = boutonDeLEcran(e.inviter);
  inviter.className = 'essai-bouton';
  etats(inviter, 'fond', troisEtats(couleurs, 'solid'));
  etats(inviter, 'texte', [couleurs.fond, couleurs.fond, couleurs.fond]);
  tete.append(titres, inviter);

  const encart = noeud('div');
  encart.className = 'essai-encart';
  encart.style.background = c('surface');
  encart.style.color = c('text');
  const icone = noeud('span', e.icone);
  icone.setAttribute('aria-hidden', 'true');
  const renvoyer = boutonDeLEcran(e.renvoyer);
  renvoyer.className = 'essai-lien';
  etats(renvoyer, 'texte', troisEtats(couleurs, 'text'));
  encart.append(icone, noeud('span', e.encart), renvoyer);

  // Le tableau : une ligne se survole en surface, et se choisit au clic.
  const tableau = noeud('div');
  tableau.className = 'essai-tableau';
  tableau.style.background = c('surface-card');
  tableau.setAttribute('role', 'listbox');
  tableau.setAttribute('aria-label', e.titre);
  const lignes = e.membres.map(({ nom, role, plein }, rang) => {
    const ligne = boutonDeLEcran('');
    ligne.className = 'essai-ligne';
    ligne.setAttribute('role', 'option');
    ligne.setAttribute('aria-selected', String(rang === 1));
    etats(ligne, 'fond', ['transparent', c('surface'), c('surface', 1)]);
    ligne.style.setProperty('--essai-fond-actif', c('surface'));
    const avatar = noeud('span', nom[0]);
    avatar.className = 'essai-avatar';
    avatar.style.background = c('surface', 1);
    avatar.style.color = c('text');
    const badge = noeud('span', role);
    badge.className = 'essai-badge';
    badge.style.background = plein ? c('solid') : c('surface');
    badge.style.color = plein ? couleurs.fond : c('text');
    ligne.append(avatar, noeud('span', nom), badge);
    ligne.addEventListener('click', () => {
      for (const autre of lignes) autre.setAttribute('aria-selected', String(autre === ligne));
    });
    return ligne;
  });
  tableau.append(...lignes);

  const champ = noeud('label');
  champ.className = 'essai-champ';
  const saisie = noeud('input');
  saisie.className = 'essai-saisie';
  saisie.type = 'text';
  saisie.value = e.membre;
  etats(saisie, 'bord', troisEtats(couleurs, 'border-control'));
  champ.append(noeud('span', e.roleParDefaut), saisie);

  const options = noeud('div');
  options.className = 'essai-options';
  const caseACocher = boutonDeLEcran('');
  caseACocher.className = 'essai-case';
  basculeDeLEcran(caseACocher, 'checkbox', e.notifier);
  etats(caseACocher, 'fond', troisEtats(couleurs, 'solid'));
  caseACocher.style.setProperty('--essai-bord-repos', c('border-control'));
  const coche = noeud('span', e.coche);
  coche.className = 'essai-coche';
  coche.setAttribute('aria-hidden', 'true');
  caseACocher.append(coche);
  const interrupteur = boutonDeLEcran('');
  interrupteur.className = 'essai-interrupteur';
  basculeDeLEcran(interrupteur, 'switch', e.acces);
  etats(interrupteur, 'fond', troisEtats(couleurs, 'solid'));
  interrupteur.style.setProperty('--essai-bord-repos', c('border-control'));
  const curseur = noeud('span');
  curseur.className = 'essai-curseur';
  interrupteur.append(curseur);
  const optionCase = noeud('div');
  optionCase.className = 'essai-option';
  optionCase.append(caseACocher, noeud('span', e.notifier));
  const optionInterrupteur = noeud('div');
  optionInterrupteur.className = 'essai-option';
  optionInterrupteur.append(interrupteur, noeud('span', e.acces));
  options.append(optionCase, optionInterrupteur);

  // Trois boutons : sans fond, `surface`, `solid`. Chaque état avance d'une nuance, texte et fond ensemble.
  const actions = noeud('div');
  actions.className = 'essai-actions';
  const annuler = boutonDeLEcran(e.boutons[0]);
  annuler.className = 'essai-bouton';
  etats(annuler, 'texte', troisEtats(couleurs, 'text'));
  etats(annuler, 'fond', ['transparent', c('surface'), c('surface', 1)]);
  const brouillon = boutonDeLEcran(e.boutons[1]);
  brouillon.className = 'essai-bouton';
  etats(brouillon, 'texte', troisEtats(couleurs, 'text'));
  etats(brouillon, 'fond', troisEtats(couleurs, 'surface'));
  const enregistrer = boutonDeLEcran(e.boutons[2]);
  enregistrer.className = 'essai-bouton';
  etats(enregistrer, 'texte', [couleurs.fond, couleurs.fond, couleurs.fond]);
  etats(enregistrer, 'fond', troisEtats(couleurs, 'solid'));
  actions.append(annuler, brouillon, enregistrer);

  corps.append(tete, encart, tableau, champ, options, actions);
  racine.append(navigation, corps);
  return racine;
}

/**
 * La grille des composants par état : une rangée par composant, une colonne
 * par état. Chaque cellule est peinte de l'état qu'elle nomme, sans survol ;
 * un composant sans cet état garde un tiret.
 */
function composantsParEtat(couleurs: CouleursDeLInterface): HTMLDivElement {
  const t = TEXTES_DE_L_INTERFACE_DE_TEST.composants;
  const c = (emploi: EmploiPeint, etat: Etat = 0) => couleurs.emploi(emploi, etat);
  const grille = noeud('div');
  grille.className = 'essai-etats';
  grille.setAttribute('role', 'table');
  grille.setAttribute('aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.etats);

  const specimen = (texte: string, fond: string, encre: string, bord: string | null = null): HTMLSpanElement => {
    const element = noeud('span', texte);
    element.className = 'essai-specimen';
    element.style.background = fond;
    element.style.color = encre;
    if (bord) element.style.borderColor = bord;
    return element;
  };
  const focus = (element: HTMLElement): HTMLElement => {
    element.style.boxShadow = `0 0 0 2px ${couleurs.fond}, 0 0 0 4px ${c('focus')}`;
    return element;
  };
  const tiret = (): HTMLSpanElement => {
    const element = noeud('span', t.sansEtat);
    element.className = 'essai-sans-etat';
    return element;
  };
  /** Une rangée : le nom, puis le rendu d'un état ; `null` pour un état que le composant n'a pas. */
  const rangees: [string, (etat: Etat | 'focus') => HTMLElement | null][] = [
    [t.plein, (etat) => (etat === 'focus' ? focus(specimen(t.action, c('solid'), couleurs.fond)) : specimen(t.action, c('solid', etat), couleurs.fond))],
    [t.soft, (etat) => (etat === 'focus' ? focus(specimen(t.action, c('surface'), c('text'))) : specimen(t.action, c('surface', etat), c('text', etat)))],
    [t.contour, (etat) => (etat === 'focus'
      ? focus(specimen(t.action, 'transparent', c('text'), c('border-control')))
      : specimen(t.action, 'transparent', c('text', etat), c('border-control', etat)))],
    [t.sansFond, (etat) => (etat === 'focus'
      ? focus(specimen(t.action, 'transparent', c('text')))
      : specimen(t.action, etat === 0 ? 'transparent' : c('surface', (etat - 1) as Etat), c('text', etat)))],
    [t.champ, (etat) => (etat === 'focus'
      ? focus(specimen(t.texte, couleurs.fond, couleurs.encre, c('border-control', 2)))
      : specimen(t.texte, couleurs.fond, couleurs.encre, c('border-control', etat)))],
    [t.lien, (etat) => {
      if (etat === 'focus') return null;
      const lien = noeud('span', t.lienColore);
      lien.className = 'essai-lien-peint';
      lien.style.color = c('text', etat);
      return lien;
    }],
    [t.badge, (etat) => (etat === 0 ? specimen(t.nouveau, c('surface'), c('text')) : null)],
    [t.carte, (etat) => (etat === 0 ? specimen(t.carte, c('surface-card'), c('text'), c('border-decorative')) : null)],
  ];

  const entete = noeud('div');
  entete.className = 'essai-rangee';
  entete.setAttribute('role', 'row');
  entete.append(noeud('span'), ...t.etats.map((etat) => {
    const colonne = noeud('span', etat);
    colonne.className = 'essai-colonne';
    colonne.setAttribute('role', 'columnheader');
    return colonne;
  }));
  const lignes = rangees.map(([nom, rendu]) => {
    const rangee = noeud('div');
    rangee.className = 'essai-rangee';
    rangee.setAttribute('role', 'row');
    const titre = noeud('span', nom);
    titre.className = 'essai-nom';
    titre.setAttribute('role', 'rowheader');
    rangee.append(titre, ...([0, 1, 2, 'focus'] as const).map((etat) => {
      const cellule = noeud('span');
      cellule.setAttribute('role', 'cell');
      cellule.append(rendu(etat) ?? tiret());
      return cellule;
    }));
    return rangee;
  });
  grille.append(entete, ...lignes);
  return grille;
}

export function createInterfaceDeTest(): InterfaceDeTestUi {
  const carte = createCarte({ titre: TEXTES_DE_L_INTERFACE_DE_TEST.titre, repliable: { ouverte: false } });
  let vue: Vue = 'ecran';
  let dernier: { recette: Recette; analyse: AnalyseDePalette; mode: Mode } | null = null;
  /** Le profil peint d'une palette à deux intensités, ouvert sur son porteur (Y2.6) ; la palette dont il est le choix. */
  let profil: Profil = 'vivid';
  let paletteDuProfil: string | null = null;

  const bascule = noeud('div');
  bascule.className = 'bascule bascule-de-l-essai';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.vue);
  const options = (['ecran', 'etats'] as const).map((valeur) => {
    const option = boutonDeLEcran(TEXTES_DE_L_INTERFACE_DE_TEST.vues[valeur]);
    option.className = 'bascule-option';
    option.addEventListener('click', () => {
      vue = valeur;
      dessiner();
    });
    return { valeur, option };
  });
  bascule.append(...options.map(({ option }) => option));
  // Le profil peint, à droite des vues : seule une palette à deux intensités en a un à choisir ([ENT-14]).
  const basculeDuProfil = noeud('div');
  basculeDuProfil.className = 'bascule bascule-du-profil-essaye';
  basculeDuProfil.setAttribute('role', 'group');
  basculeDuProfil.setAttribute('aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.profil);
  const optionsDuProfil = PROFILS.map((valeur) => {
    const option = boutonDeLEcran(NOM_DU_PROFIL[valeur]);
    option.className = 'bascule-option';
    option.addEventListener('click', () => {
      profil = valeur;
      rendreLeResume();
      dessiner();
    });
    return { valeur, option };
  });
  basculeDuProfil.append(...optionsDuProfil.map(({ option }) => option));
  const tete = noeud('div');
  tete.className = 'essai-bascules';
  tete.append(bascule, basculeDuProfil);
  const surface = noeud('div');
  surface.className = 'essai-surface';
  carte.corps.append(tete, surface);

  /** L'intensité peinte : la rampe unique, ou le profil choisi. */
  const intensiteMontree = (analyse: AnalyseDePalette): Intensite => (analyse.intensites.length === 1 ? 'unique' : profil);

  function rendreLeResume(): void {
    if (!dernier) return;
    const intensite = intensiteMontree(dernier.analyse);
    carte.poserResume(TEXTES_DE_L_INTERFACE_DE_TEST.resume(dernier.mode, intensite === 'unique' ? null : NOM_DU_PROFIL[intensite]));
  }

  function dessiner(): void {
    for (const { valeur, option } of options) option.setAttribute('aria-pressed', String(valeur === vue));
    for (const { valeur, option } of optionsDuProfil) option.setAttribute('aria-pressed', String(valeur === profil));
    basculeDuProfil.hidden = !dernier || dernier.analyse.intensites.length === 1;
    if (!dernier || dernier.analyse.libre || !carte.estOuverte()) {
      surface.replaceChildren();
      return;
    }
    const couleurs = couleursDeLInterface(dernier.recette, dernier.analyse, dernier.mode, intensiteMontree(dernier.analyse));
    surface.style.setProperty('--essai-fond', couleurs.fond);
    surface.style.setProperty('--essai-encre', couleurs.encre);
    surface.style.setProperty('--essai-encre-seconde', couleurs.encreSeconde);
    surface.style.setProperty('--essai-separateur', couleurs.emploi('border-decorative', 0));
    surface.style.setProperty('--essai-focus', couleurs.emploi('focus', 0));
    surface.replaceChildren(vue === 'ecran' ? ecranDeLEquipe(couleurs) : composantsParEtat(couleurs));
  }

  return {
    element: carte.element,
    afficher(recette, analyse, mode, palette) {
      // Une autre palette, ou une palette qui passe à deux intensités, rouvre la bascule sur son profil porteur.
      const { profil: porteur } = analyse.ancrage;
      if (porteur === 'unique') paletteDuProfil = null;
      else if (palette !== paletteDuProfil) {
        profil = porteur;
        paletteDuProfil = palette;
      }
      dernier = { recette, analyse, mode };
      carte.element.hidden = analyse.libre;
      rendreLeResume();
      dessiner();
    },
    surBascule(action) {
      carte.surBascule(() => action());
    },
  };
}
