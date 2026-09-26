/**
 * Les champs que la configuration d'une palette, sa création et les Réglages
 * communs partagent : un libellé au-dessus de ses saisies ([UI-11]), le
 * choix des intensités en deux cartes ([ENT-14]), le choix du profil qui
 * porte la référence en trois segments, le choix du modèle et les numéros
 * d'une palette libre (W6.5).
 */
import { BORNES_DES_CRANS_LIBRES, type Profil } from 'ucm-couleur';

import { NOM_DU_PROFIL, TEXTES_DE_LA_BASE, TEXTES_DES_INTENSITES_DE_PALETTE, TEXTES_DU_MODELE } from './textes';

/** Un libellé au-dessus de ses saisies, qui tiennent sur une ligne. */
export function champEnColonne(libelle: string, ...saisies: HTMLElement[]): HTMLLabelElement {
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-colonne';
  const texte = document.createElement('span');
  texte.className = 'libelle-de-champ';
  texte.textContent = libelle;
  const ligne = document.createElement('span');
  ligne.className = 'champ-ligne';
  ligne.append(...saisies);
  etiquette.append(texte, ligne);
  return etiquette;
}

export type ChoixDeBase = 'auto' | Profil;

export interface ChoixDeBaseUi {
  /** La colonne entière : libellé, segments, puis la ligne d'aide que l'appelant remplit. */
  readonly element: HTMLDivElement;
  /** La ligne sous les segments : « Auto a choisi Vivid » dans la configuration. */
  readonly aide: HTMLSpanElement;
  poser(choix: ChoixDeBase): void;
}

/** Les segments Auto, Soft et Vivid ([ENT-11]) ; un clic appelle `surChoix`, l'appelant pose l'état pressé. */
export function createChoixDeBase(surChoix: (choix: ChoixDeBase) => void): ChoixDeBaseUi {
  const segments = document.createElement('div');
  segments.className = 'bascule bascule-de-base';
  segments.setAttribute('role', 'group');
  segments.setAttribute('aria-label', TEXTES_DE_LA_BASE.libelle);
  const boutons = (['auto', 'soft', 'vivid'] as const).map((valeur) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-option';
    bouton.textContent = valeur === 'auto' ? TEXTES_DE_LA_BASE.auto : NOM_DU_PROFIL[valeur];
    bouton.addEventListener('click', () => surChoix(valeur));
    segments.append(bouton);
    return { valeur, bouton };
  });
  const aide = document.createElement('span');
  aide.className = 'ligne-secondaire';
  const libelle = document.createElement('span');
  libelle.className = 'libelle-de-champ';
  libelle.textContent = TEXTES_DE_LA_BASE.libelle;
  const element = document.createElement('div');
  element.className = 'champ-colonne';
  element.append(libelle, segments, aide);
  return {
    element,
    aide,
    poser(choix) {
      for (const { valeur, bouton } of boutons) bouton.setAttribute('aria-pressed', String(valeur === choix));
    },
  };
}

/** Ce que les deux cartes du choix des intensités montrent. */
export interface EtatDuChoixDesIntensites {
  readonly intensites: 1 | 2;
  /** La rampe que chaque choix donnerait, en Thème Light ; `null` avant une couleur de référence lisible. */
  readonly apercu: ((intensites: 1 | 2) => HTMLElement) | null;
  /** La part de la couleur de référence, écrite ; `null` avant une couleur lisible. */
  readonly part: string | null;
}

export interface ChoixDesIntensitesUi {
  /** La rangée entière : le libellé « Intensités », puis les deux cartes. */
  readonly element: HTMLDivElement;
  /** Le choix du profil qui porte la référence, posé dans la carte « Deux intensités ». */
  readonly base: ChoixDeBaseUi;
  poser(etat: EtatDuChoixDesIntensites): void;
}

/**
 * Le choix des intensités ([ENT-14], maquettes Y2.1 et Y2.6) : deux cartes,
 * « Une intensité » et « Deux intensités », chacune avec la rampe qu'elle
 * donnerait. La carte choisie porte la suite du choix : la part de la
 * référence pour une intensité, le profil qui porte la référence pour deux.
 * Un clic appelle `surChoix` ; l'appelant pose l'état.
 */
export function createChoixDesIntensites(surChoix: (intensites: 1 | 2) => void, surBase: (choix: ChoixDeBase) => void): ChoixDesIntensitesUi {
  const t = TEXTES_DES_INTENSITES_DE_PALETTE;
  const libelle = document.createElement('span');
  libelle.className = 'libelle-de-champ';
  libelle.textContent = t.libelle;
  const cartes = document.createElement('div');
  cartes.className = 'choix-des-intensites';
  cartes.setAttribute('role', 'radiogroup');
  cartes.setAttribute('aria-label', t.libelle);
  const base = createChoixDeBase(surBase);
  const part = document.createElement('span');
  part.className = 'ligne-secondaire';
  const cartesParNombre = ([1, 2] as const).map((nombre) => {
    const carte = document.createElement('div');
    carte.className = 'carte-d-intensite';
    const choix = document.createElement('button');
    choix.type = 'button';
    choix.className = 'carte-d-intensite-choix';
    choix.setAttribute('role', 'radio');
    const titre = document.createElement('span');
    titre.className = 'carte-d-intensite-titre';
    titre.textContent = nombre === 1 ? t.une.titre : t.deux.titre;
    const texte = document.createElement('span');
    texte.className = 'ligne-secondaire';
    texte.textContent = nombre === 1 ? t.une.texte : t.deux.texte;
    const apercu = document.createElement('div');
    apercu.className = 'carte-d-intensite-apercu';
    choix.append(titre, texte, apercu);
    choix.addEventListener('click', () => surChoix(nombre));
    carte.append(choix);
    cartes.append(carte);
    return { nombre, carte, choix, apercu };
  });
  const element = document.createElement('div');
  element.className = 'champ-colonne';
  element.append(libelle, cartes);
  return {
    element,
    base,
    poser({ intensites, apercu, part: partEcrite }) {
      for (const { nombre, carte, choix, apercu: zone } of cartesParNombre) {
        const choisie = nombre === intensites;
        choix.setAttribute('aria-checked', String(choisie));
        carte.dataset.choisie = String(choisie);
        zone.replaceChildren(...(apercu ? [apercu(nombre)] : []));
        zone.hidden = !apercu;
      }
      // La suite du choix se pose dans la carte choisie, sous son bouton.
      const [une, deux] = cartesParNombre;
      part.textContent = partEcrite === null ? '' : t.partDeLaReference(partEcrite);
      part.hidden = intensites !== 1 || partEcrite === null;
      une.carte.append(part);
      deux.carte.append(base.element);
      base.element.hidden = intensites !== 2;
    },
  };
}

export type ChoixDuModele = 'modele' | 'libre';

export interface ChoixDuModeleUi {
  /** La colonne entière : libellé, segments, puis l'aide d'une palette libre. */
  readonly element: HTMLDivElement;
  poser(choix: ChoixDuModele): void;
}

/**
 * Le choix du modèle (W6.5) : Design system ou Libre, à la place de la
 * palette de base, qui n'a de sens que dans le modèle (maquette W3.5).
 */
export function createChoixDuModele(surChoix: (choix: ChoixDuModele) => void): ChoixDuModeleUi {
  const segments = document.createElement('div');
  segments.className = 'bascule bascule-de-base';
  segments.setAttribute('role', 'group');
  segments.setAttribute('aria-label', TEXTES_DU_MODELE.libelle);
  const boutons = (['modele', 'libre'] as const).map((valeur) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-option';
    bouton.textContent = TEXTES_DU_MODELE[valeur];
    bouton.addEventListener('click', () => surChoix(valeur));
    segments.append(bouton);
    return { valeur, bouton };
  });
  const libelle = document.createElement('span');
  libelle.className = 'libelle-de-champ';
  libelle.textContent = TEXTES_DU_MODELE.libelle;
  const aide = document.createElement('span');
  aide.className = 'ligne-secondaire';
  aide.textContent = TEXTES_DU_MODELE.aideLibre;
  const element = document.createElement('div');
  element.className = 'champ-colonne';
  element.append(libelle, segments, aide);
  return {
    element,
    poser(choix) {
      for (const { valeur, bouton } of boutons) bouton.setAttribute('aria-pressed', String(valeur === choix));
      aide.hidden = choix !== 'libre';
    },
  };
}

export interface PucesUi {
  readonly element: HTMLDivElement;
  /** Allume les numéros de la liste ; une puce qui sortirait des bornes se désactive. */
  poser(crans: readonly number[]): void;
}

/**
 * Les numéros d'une palette libre (W6.5) : une puce par multiple de 50, de 50
 * à 1050, allumée quand la palette le porte. Une puce allumée ne s'éteint pas
 * sous quatre numéros, une puce éteinte ne s'allume pas au-delà de treize.
 */
export function createPuces(surBascule: (numero: number) => void): PucesUi {
  const { premier, dernier, pas, nombre } = BORNES_DES_CRANS_LIBRES;
  const libelle = document.createElement('span');
  libelle.className = 'libelle-de-champ';
  const groupe = document.createElement('div');
  groupe.className = 'puces-de-nuances';
  groupe.setAttribute('role', 'group');
  const puces: { numero: number; bouton: HTMLButtonElement }[] = [];
  for (let numero = premier; numero <= dernier; numero += pas) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'puce-de-nuance';
    bouton.textContent = String(numero);
    bouton.setAttribute('aria-label', TEXTES_DU_MODELE.puce(numero));
    const ici = numero;
    bouton.addEventListener('click', () => surBascule(ici));
    groupe.append(bouton);
    puces.push({ numero, bouton });
  }
  const element = document.createElement('div');
  element.className = 'champ-colonne';
  element.append(libelle, groupe);
  return {
    element,
    poser(crans) {
      libelle.textContent = TEXTES_DU_MODELE.nuances(crans.length);
      groupe.setAttribute('aria-label', libelle.textContent);
      for (const { numero, bouton } of puces) {
        const allumee = crans.includes(numero);
        bouton.setAttribute('aria-pressed', String(allumee));
        bouton.disabled = allumee ? crans.length <= nombre[0] : crans.length >= nombre[1];
      }
    },
  };
}

