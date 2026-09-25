/**
 * La section « Interface de test » ([UI-14]), dernière de l'onglet Palettes :
 * l'écran de réglages E2, en HTML, peint de la palette ouverte dans le thème
 * de l'aperçu. Chaque couleur vient de la table des emplois, dans le profil
 * porteur, à l'état que le contrôle prend : repos, survol, appui. L'écran se
 * manipule : onglets, case, interrupteur, champ et boutons répondent au
 * pointeur et au clavier, sans rien enregistrer.
 *
 * Une palette libre n'a pas de rôles : la section se retire, comme la carte
 * des garanties. Repliée à l'ouverture, elle ne se dessine que dépliée.
 */
import { TABLE_DES_EMPLOIS, lireHexa, type Emploi, type Mode, type Recette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { createCarte } from './carte';
import { encresSur } from './nuancier';
import { NOM_DU_PROFIL, TEXTES_DE_L_INTERFACE_DE_TEST } from './textes';

/** Un emploi et son état : 0 au repos, 1 au survol, 2 à l'appui. */
type Etat = 0 | 1 | 2;

/** Les couleurs de l'écran, chacune lue dans la table des emplois, ou le fond et les encres du thème. */
export interface CouleursDeLInterface {
  readonly fond: string;
  readonly encre: string;
  readonly encreSeconde: string;
  /** La couleur d'un emploi à un état, dans le profil porteur. */
  readonly emploi: (emploi: Exclude<Emploi, 'on-solid'>, etat: Etat) => string;
}

/**
 * Les couleurs de l'écran pour une palette et un thème. `on-solid` est le
 * fond du thème. Un état au-delà de la dernière nuance garde la dernière.
 */
export function couleursDeLInterface(recette: Recette, analyse: AnalyseDePalette, mode: Mode): CouleursDeLInterface {
  const fond = recette.fonds[mode];
  const encres = encresSur(lireHexa(fond) ?? [255, 255, 255]);
  const rampe = analyse.rampes[analyse.ancrage.profil][mode];
  return {
    fond,
    encre: encres.encre,
    encreSeconde: encres.seconde,
    emploi(emploi, etat) {
      const depart = analyse.grille.crans.indexOf(TABLE_DES_EMPLOIS[emploi]);
      return rampe[Math.min(rampe.length - 1, depart + etat)].hexa;
    },
  };
}

export interface InterfaceDeTestUi {
  readonly element: HTMLElement;
  /** Dessine l'écran quand la carte est dépliée ; une palette libre retire la section. */
  afficher(recette: Recette, analyse: AnalyseDePalette, mode: Mode): void;
  /** Un geste sur l'en-tête qui déplie la carte : l'onglet redessine. */
  surBascule(action: () => void): void;
}

/** Un élément de l'écran et son texte. Sa classe s'écrit en littéral à l'appel : la loi des styles la lit là. */
function noeud<K extends keyof HTMLElementTagNameMap>(nom: K, texte = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(nom);
  if (texte) element.textContent = texte;
  return element;
}

/** Pose les couleurs d'un contrôle à ses trois états : la feuille les lit au survol et à l'appui. */
function etats(element: HTMLElement, propriete: 'fond' | 'texte' | 'bord', couleurs: readonly [string, string, string]): void {
  element.style.setProperty(`--essai-${propriete}-repos`, couleurs[0]);
  element.style.setProperty(`--essai-${propriete}-survol`, couleurs[1]);
  element.style.setProperty(`--essai-${propriete}-appui`, couleurs[2]);
}

/** Les trois états d'un emploi. */
const troisEtats = (couleurs: CouleursDeLInterface, emploi: Exclude<Emploi, 'on-solid'>): [string, string, string] =>
  [couleurs.emploi(emploi, 0), couleurs.emploi(emploi, 1), couleurs.emploi(emploi, 2)];

/** L'écran E2 : en-tête et badge, onglets, champ, case et interrupteur, encart, trois boutons. */
function ecran(couleurs: CouleursDeLInterface): HTMLDivElement {
  const e = TEXTES_DE_L_INTERFACE_DE_TEST.exemple;
  const racine = noeud('div');
  racine.className = 'essai-ecran';
  racine.setAttribute('role', 'group');
  racine.setAttribute('aria-label', TEXTES_DE_L_INTERFACE_DE_TEST.ecran);
  racine.style.setProperty('--essai-fond', couleurs.fond);
  racine.style.setProperty('--essai-encre', couleurs.encre);
  racine.style.setProperty('--essai-encre-seconde', couleurs.encreSeconde);
  racine.style.setProperty('--essai-separateur', couleurs.emploi('border-decorative', 0));
  racine.style.setProperty('--essai-focus', couleurs.emploi('focus', 0));

  const tete = noeud('div');
  tete.className = 'essai-tete';
  const badge = noeud('span', e.badge);
  badge.className = 'essai-badge';
  badge.style.background = couleurs.emploi('surface', 0);
  badge.style.color = couleurs.emploi('text', 0);
  const titre = noeud('p', e.titre);
  titre.className = 'essai-titre';
  tete.append(titre, badge);

  // Les onglets : l'actif souligné de `solid`, les autres en encre seconde ; un clic change l'actif.
  const onglets = noeud('div');
  onglets.className = 'essai-onglets';
  onglets.setAttribute('role', 'tablist');
  const boutonsDOnglet = e.onglets.map((libelle, rang) => {
    const onglet = noeud('button', libelle);
    onglet.className = 'essai-onglet';
    onglet.type = 'button';
    onglet.setAttribute('role', 'tab');
    onglet.setAttribute('aria-selected', String(rang === 0));
    onglet.style.setProperty('--essai-soulignement', couleurs.emploi('solid', 0));
    onglet.addEventListener('click', () => {
      for (const autre of boutonsDOnglet) autre.setAttribute('aria-selected', String(autre === onglet));
    });
    return onglet;
  });
  onglets.append(...boutonsDOnglet);

  const champ = noeud('label');
  champ.className = 'essai-champ';
  const saisie = noeud('input');
  saisie.className = 'essai-saisie';
  saisie.type = 'text';
  saisie.value = e.valeur;
  etats(saisie, 'bord', troisEtats(couleurs, 'border-control'));
  champ.append(noeud('span', e.libelle), saisie);

  const options = noeud('div');
  options.className = 'essai-options';
  const caseACocher = noeud('button');
  caseACocher.className = 'essai-case';
  caseACocher.type = 'button';
  caseACocher.setAttribute('role', 'checkbox');
  caseACocher.setAttribute('aria-checked', 'true');
  etats(caseACocher, 'fond', troisEtats(couleurs, 'solid'));
  caseACocher.style.setProperty('--essai-bord-repos', couleurs.emploi('border-control', 0));
  const coche = noeud('span', e.coche);
  coche.className = 'essai-coche';
  coche.setAttribute('aria-hidden', 'true');
  caseACocher.append(coche);
  const libelleDeLaCase = noeud('span', e.caseACocher);
  caseACocher.setAttribute('aria-label', e.caseACocher);
  caseACocher.addEventListener('click', () => {
    caseACocher.setAttribute('aria-checked', String(caseACocher.getAttribute('aria-checked') !== 'true'));
  });
  const interrupteur = noeud('button');
  interrupteur.className = 'essai-interrupteur';
  interrupteur.type = 'button';
  interrupteur.setAttribute('role', 'switch');
  interrupteur.setAttribute('aria-checked', 'true');
  interrupteur.setAttribute('aria-label', e.interrupteur);
  etats(interrupteur, 'fond', troisEtats(couleurs, 'solid'));
  interrupteur.style.setProperty('--essai-bord-repos', couleurs.emploi('border-control', 0));
  const curseur = noeud('span');
  curseur.className = 'essai-curseur';
  interrupteur.append(curseur);
  interrupteur.addEventListener('click', () => {
    interrupteur.setAttribute('aria-checked', String(interrupteur.getAttribute('aria-checked') !== 'true'));
  });
  const optionCase = noeud('div');
  optionCase.className = 'essai-option';
  optionCase.append(caseACocher, libelleDeLaCase);
  const optionInterrupteur = noeud('div');
  optionInterrupteur.className = 'essai-option';
  optionInterrupteur.append(interrupteur, noeud('span', e.interrupteur));
  options.append(optionCase, optionInterrupteur);

  const encart = noeud('div');
  encart.className = 'essai-encart';
  encart.style.background = couleurs.emploi('surface', 0);
  encart.style.color = couleurs.emploi('text', 0);
  const icone = noeud('span', e.icone);
  icone.setAttribute('aria-hidden', 'true');
  encart.append(icone, noeud('span', e.encart));

  // Trois boutons : sans fond, `surface`, `solid`. Chaque état avance d'une nuance, texte et fond ensemble.
  const actions = noeud('div');
  actions.className = 'essai-actions';
  const annuler = noeud('button', e.boutons[0]);
  annuler.className = 'essai-bouton';
  etats(annuler, 'texte', troisEtats(couleurs, 'text'));
  etats(annuler, 'fond', ['transparent', couleurs.emploi('surface', 0), couleurs.emploi('surface', 1)]);
  const brouillon = noeud('button', e.boutons[1]);
  brouillon.className = 'essai-bouton';
  etats(brouillon, 'texte', troisEtats(couleurs, 'text'));
  etats(brouillon, 'fond', troisEtats(couleurs, 'surface'));
  const enregistrer = noeud('button', e.boutons[2]);
  enregistrer.className = 'essai-bouton';
  etats(enregistrer, 'texte', [couleurs.fond, couleurs.fond, couleurs.fond]);
  etats(enregistrer, 'fond', troisEtats(couleurs, 'solid'));
  for (const bouton of [annuler, brouillon, enregistrer]) bouton.type = 'button';
  actions.append(annuler, brouillon, enregistrer);

  racine.append(tete, onglets, champ, options, encart, actions);
  return racine;
}

export function createInterfaceDeTest(): InterfaceDeTestUi {
  const carte = createCarte({ titre: TEXTES_DE_L_INTERFACE_DE_TEST.titre, repliable: { ouverte: false } });
  const surface = noeud('div');
  surface.className = 'essai-surface';
  carte.corps.append(surface);
  return {
    element: carte.element,
    afficher(recette, analyse, mode) {
      carte.element.hidden = analyse.libre;
      carte.poserResume(TEXTES_DE_L_INTERFACE_DE_TEST.resume(mode, NOM_DU_PROFIL[analyse.ancrage.profil]));
      if (analyse.libre || !carte.estOuverte()) {
        surface.replaceChildren();
        return;
      }
      surface.replaceChildren(ecran(couleursDeLInterface(recette, analyse, mode)));
    },
    surBascule(action) {
      carte.surBascule(() => action());
    },
  };
}
