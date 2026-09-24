/**
 * La configuration de la recette, derrière l'engrenage ([UI-02], section
 * 8.3) : les deux courbes, les parts des profils, les deux fonds ([ENT-05])
 * et les cinq seuils. Chaque groupe dit combien de palettes il modifie
 * ([ENT-07]).
 *
 * Une saisie recalcule la garantie des courbes et l'aperçu ; la validation du
 * champ range la recette (D-D). Un refus de `[REC-05]` s'écrit sous le groupe,
 * et rien n'est rangé.
 */
import {
  MODES,
  PROFILS,
  garantieDesCourbes,
  validerRecette,
  type Mode,
  type Recette,
} from 'ucm-couleur';

import {
  lireNombre,
  palettesModifiees,
  poserFond,
  poserValeur,
  valeurDe,
  type ChampDeConfiguration,
  type GroupeDeConfiguration,
} from '../configuration';
import { blocDeConstat } from './constats';
import {
  TEXTES_DE_CONFIGURATION,
  constatDeGarantie,
  hexaInvalide,
  nombreEcrit,
  nombreInvalide,
  palettesTouchees,
  texteDuRefus,
} from './textes';

export interface ConfigurationUi {
  element: HTMLDivElement;
  /** Relit la recette ; un champ en cours de saisie garde sa valeur. */
  afficher(): void;
}

/** Ce que la configuration lit et modifie : la recette de l'onglet Palettes. */
export interface RecetteDeLaConfiguration {
  lire(): Recette | null;
  /** Une saisie en cours : l'aperçu la suit, rien ne se range. */
  previsualiser(recette: Recette): void;
  /** La fin d'un geste : la recette se range. */
  appliquer(recette: Recette): void;
}

interface Groupe {
  readonly element: HTMLElement;
  readonly compte: HTMLParagraphElement;
  readonly erreur: HTMLParagraphElement;
}

function paragraphe(texte = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  return element;
}

function groupe(titre: string): Groupe {
  const element = document.createElement('section');
  element.className = 'config-groupe';
  const entete = document.createElement('div');
  entete.className = 'ligne-infos';
  const libelle = paragraphe(titre);
  libelle.className = 'field-label';
  const compte = paragraphe();
  compte.className = 'ligne-secondaire';
  entete.append(libelle, compte);
  const erreur = paragraphe();
  erreur.className = 'field-error';
  erreur.hidden = true;
  element.append(entete);
  return { element, compte, erreur };
}

export function createConfiguration(recette: RecetteDeLaConfiguration): ConfigurationUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  const sansRecette = paragraphe(TEXTES_DE_CONFIGURATION.sansRecette);
  sansRecette.className = 'etat-lecture';

  const champs: { champ: ChampDeConfiguration; saisie: HTMLInputElement }[] = [];

  function champDeSaisie(champ: ChampDeConfiguration, dans: Groupe, etiquette: string): HTMLInputElement {
    const saisie = document.createElement('input');
    saisie.type = 'text';
    saisie.inputMode = 'decimal';
    saisie.className = 'input champ-nombre';
    saisie.spellcheck = false;
    saisie.setAttribute('aria-label', etiquette);
    if ('courbe' in champ) {
      saisie.dataset.mode = champ.courbe;
      saisie.dataset.rang = String(champ.rang);
    }
    saisie.addEventListener('input', () => saisir(champ, saisie, dans, false));
    saisie.addEventListener('change', () => saisir(champ, saisie, dans, true));
    champs.push({ champ, saisie });
    return saisie;
  }

  const courbes = groupe(TEXTES_DE_CONFIGURATION.courbes);
  const table = document.createElement('table');
  table.className = 'table-courbes';
  const garantie = document.createElement('div');
  garantie.className = 'constats';
  courbes.element.append(table, courbes.erreur, garantie);

  const parts = groupe(TEXTES_DE_CONFIGURATION.parts);
  const ligneDesParts = document.createElement('div');
  ligneDesParts.className = 'ligne-reference';
  for (const profil of PROFILS) {
    const etiquette = document.createElement('label');
    etiquette.className = 'champ-ligne';
    const texte = document.createElement('span');
    texte.className = 'field-label';
    texte.textContent = profil;
    etiquette.append(texte, champDeSaisie({ part: profil }, parts, profil));
    ligneDesParts.append(etiquette);
  }
  parts.element.append(ligneDesParts, parts.erreur);

  const nomDuMode: Record<Mode, string> = { light: TEXTES_DE_CONFIGURATION.clair, dark: TEXTES_DE_CONFIGURATION.sombre };

  /** Une ligne de champs étiquetés, comme celle des parts. */
  function ligneDeChamps(dans: Groupe, entrees: readonly { champ: ChampDeConfiguration; etiquette: string }[]): HTMLDivElement {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-reference';
    for (const { champ, etiquette } of entrees) {
      const conteneur = document.createElement('label');
      conteneur.className = 'champ-ligne';
      const texte = document.createElement('span');
      texte.className = 'field-label';
      texte.textContent = etiquette;
      conteneur.append(texte, champDeSaisie(champ, dans, etiquette));
      ligne.append(conteneur);
    }
    return ligne;
  }

  const fonds = groupe(TEXTES_DE_CONFIGURATION.fonds);
  const ligneDesFonds = document.createElement('div');
  ligneDesFonds.className = 'ligne-reference';
  const saisiesDesFonds = MODES.map((mode) => {
    const conteneur = document.createElement('label');
    conteneur.className = 'champ-ligne';
    const texte = document.createElement('span');
    texte.className = 'field-label';
    texte.textContent = nomDuMode[mode];
    const saisie = document.createElement('input');
    saisie.type = 'text';
    saisie.className = 'input champ-hexa';
    saisie.spellcheck = false;
    saisie.setAttribute('aria-label', TEXTES_DE_CONFIGURATION.fondDuMode[mode]);
    saisie.addEventListener('input', () => saisirFond(mode, saisie, false));
    saisie.addEventListener('change', () => saisirFond(mode, saisie, true));
    conteneur.append(texte, saisie);
    ligneDesFonds.append(conteneur);
    return { mode, saisie };
  });
  fonds.element.append(ligneDesFonds, fonds.erreur);

  const contraste = groupe(TEXTES_DE_CONFIGURATION.seuilsDeContraste);
  contraste.element.append(
    ligneDeChamps(contraste, [
      { champ: { seuil: 'texte' }, etiquette: TEXTES_DE_CONFIGURATION.seuilTexte },
      { champ: { seuil: 'nonTexte' }, etiquette: TEXTES_DE_CONFIGURATION.seuilNonTexte },
    ]),
    contraste.erreur,
  );

  /** Un groupe d'un seul seuil, que son titre nomme. */
  function groupeDeSeuil(seuil: 'profilsConfondus' | 'palettesProches' | 'chromaGrise', titre: string): Groupe {
    const dans = groupe(titre);
    dans.element.append(champDeSaisie({ seuil }, dans, titre), dans.erreur);
    return dans;
  }
  const seuil = groupeDeSeuil('profilsConfondus', TEXTES_DE_CONFIGURATION.seuilProfilsConfondus);
  const proches = groupeDeSeuil('palettesProches', TEXTES_DE_CONFIGURATION.seuilPalettesProches);
  const grise = groupeDeSeuil('chromaGrise', TEXTES_DE_CONFIGURATION.seuilChromaGrise);

  const comptes: readonly (readonly [Groupe, GroupeDeConfiguration])[] = [
    [courbes, 'courbes'],
    [parts, 'parts'],
    [fonds, 'fonds'],
    [contraste, 'contraste'],
    [seuil, 'profilsConfondus'],
    [proches, 'palettesProches'],
    [grise, 'chromaGrise'],
  ];

  const vue = document.createElement('div');
  vue.className = 'page-stack colonne';
  vue.append(...comptes.map(([dans]) => dans.element));
  element.append(sansRecette, vue);

  /** La table n'est bâtie qu'une fois par liste de crans : un champ retiré perdrait son focus. */
  let cransBatis = '';
  function batirLaTable(crans: readonly number[]): void {
    if (cransBatis === crans.join(',')) return;
    cransBatis = crans.join(',');
    for (let rang = champs.length - 1; rang >= 0; rang -= 1) if ('courbe' in champs[rang].champ) champs.splice(rang, 1);
    const entete = document.createElement('tr');
    for (const titre of [TEXTES_DE_CONFIGURATION.cran, TEXTES_DE_CONFIGURATION.clair, TEXTES_DE_CONFIGURATION.sombre]) {
      const cellule = document.createElement('th');
      cellule.textContent = titre;
      entete.append(cellule);
    }
    const lignes = crans.map((cran, rang) => {
      const ligne = document.createElement('tr');
      const titre = document.createElement('th');
      titre.textContent = String(cran);
      ligne.append(titre);
      for (const mode of MODES) {
        const cellule = document.createElement('td');
        cellule.append(champDeSaisie({ courbe: mode, rang }, courbes, `${nomDuMode[mode]} ${cran}`));
        ligne.append(cellule);
      }
      return ligne;
    });
    table.replaceChildren(entete, ...lignes);
  }

  function signaler(dans: Groupe, texte: string | null): void {
    dans.erreur.textContent = texte ?? '';
    dans.erreur.hidden = texte === null;
  }

  function montrerLaGarantie(lue: Recette): void {
    garantie.replaceChildren(...garantieDesCourbes(lue).map((manque) => blocDeConstat(constatDeGarantie(manque), 'alerte')));
  }

  /**
   * Une saisie : un nombre qui forme une recette valide recalcule la garantie
   * et l'aperçu, et se range à la validation du champ. Un refus ne se dit qu'à
   * la validation : pendant la frappe, « 0, » n'est pas encore une faute.
   */
  function saisir(champ: ChampDeConfiguration, saisie: HTMLInputElement, dans: Groupe, fin: boolean): void {
    const lue = recette.lire();
    if (!lue) return;
    const valeur = lireNombre(saisie.value);
    if (valeur === null) {
      if (fin) signaler(dans, nombreInvalide(saisie.value));
      return;
    }
    const suivante = poserValeur(lue, champ, valeur);
    const jugee = validerRecette(suivante);
    if ('refus' in jugee) {
      if (fin) signaler(dans, texteDuRefus(jugee.refus[0]));
      return;
    }
    signaler(dans, null);
    montrerLaGarantie(suivante);
    if (fin) recette.appliquer(suivante);
    else recette.previsualiser(suivante);
  }

  /** Un fond saisi : même parcours qu'un nombre, avec un hexa. */
  function saisirFond(mode: Mode, saisie: HTMLInputElement, fin: boolean): void {
    const lue = recette.lire();
    if (!lue) return;
    const suivante = poserFond(lue, mode, saisie.value);
    if (suivante === null) {
      if (fin) signaler(fonds, hexaInvalide(saisie.value));
      return;
    }
    const jugee = validerRecette(suivante);
    if ('refus' in jugee) {
      if (fin) signaler(fonds, texteDuRefus(jugee.refus[0]));
      return;
    }
    signaler(fonds, null);
    if (fin) recette.appliquer(suivante);
    else recette.previsualiser(suivante);
  }

  return {
    element,
    afficher() {
      const lue = recette.lire();
      sansRecette.hidden = lue !== null;
      vue.hidden = lue === null;
      if (!lue) return;
      batirLaTable(lue.crans);
      for (const { champ, saisie } of champs) {
        if (document.activeElement !== saisie) saisie.value = nombreEcrit(valeurDe(lue, champ));
      }
      for (const { mode, saisie } of saisiesDesFonds) {
        if (document.activeElement !== saisie) saisie.value = lue.fonds[mode];
      }
      for (const [dans, nom] of comptes) dans.compte.textContent = palettesTouchees(palettesModifiees(lue, nom));
      montrerLaGarantie(lue);
    },
  };
}
