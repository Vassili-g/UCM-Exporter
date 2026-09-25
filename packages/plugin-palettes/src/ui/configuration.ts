/**
 * Les Réglages communs, derrière l'engrenage ([UI-02], section 8.3, lot V9).
 * En tête, l'aperçu compact de la palette ouverte et le résultat de ses
 * garanties (V9.3). Suivent cinq cartes, dans l'ordre de V9.2 : Couleurs de
 * fond, Intensités, Luminosité des nuances, puis, repliées, Minimums des
 * promesses et Détection des couleurs proches. Chaque groupe dit combien de
 * palettes il modifie ([ENT-07]) ; chaque carte se remet aux valeurs par
 * défaut sans toucher aux autres ni aux palettes (V9.5).
 *
 * Une saisie valide recalcule la garantie des courbes, le tracé et l'aperçu ;
 * la validation du champ range la recette (D-D). Une saisie intermédiaire
 * garde son champ. Un refus de `[REC-05]` s'écrit sous la carte, et rien
 * n'est rangé.
 */
import {
  MODES,
  PROFILS,
  garantieDesCourbes,
  rgb8VersOklch,
  referenceDe,
  validerRecette,
  type Mode,
  type Profil,
  type Recette,
} from 'ucm-couleur';

import { analyserPalette } from '../analyse';
import {
  carteDuGroupe,
  estParDefaut,
  lireNombre,
  palettesModifiees,
  poserFond,
  poserValeur,
  retablir,
  valeurDe,
  type CarteDesReglages,
  type ChampDeConfiguration,
  type GroupeDeConfiguration,
} from '../configuration';
import { apercuCompact, resultatsDesGaranties } from './apercuCompact';
import { createCarte, type CarteUi } from './carte';
import { blocDeConstat } from './constats';
import {
  NOM_DU_PROFIL,
  TEXTES_DE_CONFIGURATION,
  TEXTES_DES_INTENSITES,
  constatDeGarantie,
  hexaInvalide,
  legendeDesCourbes,
  nomDeLaPalette,
  nombreEcrit,
  nombreInvalide,
  paletteDeLApercu,
  palettesConcernees,
  resumeDesEcarts,
  resumeDesMinimums,
  retablirLaCarte,
  texteDuRefus,
} from './textes';
import { dessinerLesCourbes, geometrieDesCourbes } from './traceDesCourbes';

export interface ConfigurationUi {
  element: HTMLDivElement;
  /** Relit la recette ; un champ en cours de saisie garde sa valeur. */
  afficher(): void;
  /** Ouvre la carte du groupe, y fait défiler et focalise son premier champ ([VER-15], V9.7). */
  focaliser(groupe: GroupeDeConfiguration): void;
}

/** Ce que la configuration lit et modifie : la recette de l'onglet Palettes. */
export interface RecetteDeLaConfiguration {
  lire(): Recette | null;
  /** La palette ouverte dans l'onglet Palettes, et le thème de son aperçu ; `null` sans palette. */
  ouverte(): { readonly id: string; readonly mode: Mode } | null;
  /** Une saisie en cours : l'aperçu la suit, rien ne se range. */
  previsualiser(recette: Recette): void;
  /** La fin d'un geste : la recette se range. */
  appliquer(recette: Recette): void;
}

/** Un groupe de champs : ce qu'un lien vise, et où son compte s'écrit ([ENT-07]). */
interface Groupe {
  readonly carte: CarteDesReglages;
  /** Ce qu'un lien fait défiler, et dont il focalise le premier champ. */
  readonly element: HTMLElement;
  compter(texte: string): void;
}

function paragraphe(texte = '', classe = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

/** Un libellé au-dessus de ses saisies, comme la carte Couleur de base (V9.1). */
function champEnColonne(libelle: string, ...saisies: HTMLElement[]): HTMLLabelElement {
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

function unite(texte: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'unite';
  element.textContent = texte;
  return element;
}

const TITRES: Record<CarteDesReglages, string> = {
  fonds: TEXTES_DE_CONFIGURATION.fonds,
  parts: TEXTES_DE_CONFIGURATION.parts,
  courbes: TEXTES_DE_CONFIGURATION.courbes,
  minimums: TEXTES_DE_CONFIGURATION.seuilsDeContraste,
  proches: TEXTES_DE_CONFIGURATION.couleursProches,
};

export function createConfiguration(recette: RecetteDeLaConfiguration): ConfigurationUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  const sansRecette = paragraphe(TEXTES_DE_CONFIGURATION.sansRecette, 'etat-lecture');

  // Les cartes, fixes ou repliées ; chacune a son erreur et son « Rétablir ».
  const cartes = {} as Record<CarteDesReglages, { readonly ui: CarteUi; readonly erreur: HTMLParagraphElement; readonly retablir: HTMLButtonElement }>;
  for (const carte of Object.keys(TITRES) as CarteDesReglages[]) {
    const repliee = carte === 'minimums' || carte === 'proches';
    const ui = createCarte({ titre: TITRES[carte], ...(repliee ? { repliable: { ouverte: false } } : {}) });
    ui.element.classList.add('carte-de-reglage');
    const erreur = paragraphe('', 'field-error');
    erreur.hidden = true;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-discret';
    bouton.textContent = TEXTES_DE_CONFIGURATION.retablir;
    bouton.setAttribute('aria-label', retablirLaCarte(TITRES[carte]));
    bouton.addEventListener('click', () => retablirLaCarteChoisie(carte));
    // Une carte repliable a pour en-tête un bouton : « Rétablir » va dans son corps.
    if (repliee) {
      const pied = document.createElement('div');
      pied.className = 'pied-de-reglage';
      pied.append(bouton);
      ui.corps.append(erreur, pied);
    } else {
      ui.tete.append(bouton);
      ui.corps.append(erreur);
    }
    cartes[carte] = { ui, erreur, retablir: bouton };
  }

  const champs: { champ: ChampDeConfiguration; saisie: HTMLInputElement }[] = [];
  const groupes = {} as Record<GroupeDeConfiguration, Groupe>;

  /** Un groupe dont le compte s'écrit dans le résumé de sa carte fixe. */
  function groupeDeCarte(nom: GroupeDeConfiguration, carte: CarteDesReglages, cible: HTMLElement): void {
    groupes[nom] = { carte, element: cible, compter: (texte) => cartes[carte].ui.poserResume(texte) };
  }

  function champDeSaisie(champ: ChampDeConfiguration, carte: CarteDesReglages, etiquette: string): HTMLInputElement {
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
    saisie.addEventListener('input', () => saisir(champ, saisie.value, carte, false));
    saisie.addEventListener('change', () => saisir(champ, saisie.value, carte, true));
    champs.push({ champ, saisie });
    return saisie;
  }

  // Tête : l'aperçu compact de la palette ouverte, jamais une palette inventée (V9.3).
  const apercu = document.createElement('div');
  apercu.className = 'reglages-apercu';

  // Couleurs de fond : pastille, sélecteur de couleur et code, comme la couleur de référence (V9.6).
  const nomDuMode: Record<Mode, string> = { light: TEXTES_DE_CONFIGURATION.clair, dark: TEXTES_DE_CONFIGURATION.sombre };
  const colonnesDesFonds = document.createElement('div');
  colonnesDesFonds.className = 'colonnes-de-reglage';
  const saisiesDesFonds = MODES.map((mode) => {
    const pipette = document.createElement('input');
    pipette.type = 'color';
    pipette.className = 'pipette';
    pipette.setAttribute('aria-label', TEXTES_DE_CONFIGURATION.fondDuMode[mode]);
    const saisie = document.createElement('input');
    saisie.type = 'text';
    saisie.className = 'input champ-hexa';
    saisie.spellcheck = false;
    saisie.maxLength = 7;
    saisie.setAttribute('aria-label', TEXTES_DE_CONFIGURATION.fondDuMode[mode]);
    for (const source of [pipette, saisie]) {
      source.addEventListener('input', () => saisirFond(mode, source.value, false));
      source.addEventListener('change', () => saisirFond(mode, source.value, true));
    }
    colonnesDesFonds.append(champEnColonne(TEXTES_DE_CONFIGURATION.fondDuMode[mode], pipette, saisie));
    return { mode, pipette, saisie };
  });
  cartes.fonds.ui.corps.prepend(colonnesDesFonds);
  groupeDeCarte('fonds', 'fonds', colonnesDesFonds);

  // Intensités : un curseur et un champ par profil ; Soft ne dépasse jamais Vivid.
  const reglagesDesParts = document.createElement('div');
  reglagesDesParts.className = 'intensites-reglages';
  const curseurs = PROFILS.map((profil) => {
    const ligne = document.createElement('div');
    ligne.className = 'intensite';
    const libelle = document.createElement('span');
    libelle.className = 'field-label';
    libelle.textContent = TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil]);
    const piste = document.createElement('span');
    piste.className = 'reglette-piste';
    const curseur = document.createElement('input');
    curseur.type = 'range';
    curseur.min = '0';
    curseur.max = '1';
    curseur.step = '0.01';
    curseur.className = 'reglette-curseur';
    curseur.setAttribute('aria-label', TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil]));
    curseur.addEventListener('input', () => glisser(profil, Number(curseur.value), false));
    curseur.addEventListener('change', () => glisser(profil, Number(curseur.value), true));
    piste.append(curseur);
    ligne.append(libelle, piste, champDeSaisie({ part: profil }, 'parts', TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil])));
    reglagesDesParts.append(ligne);
    return { profil, curseur };
  });
  cartes.parts.ui.corps.prepend(reglagesDesParts, paragraphe(TEXTES_DE_CONFIGURATION.aideParts, 'ligne-secondaire'));
  groupeDeCarte('parts', 'parts', reglagesDesParts);

  // Luminosité des nuances : le tracé au-dessus de la table (V9.4).
  const trace = document.createElement('div');
  trace.className = 'trace-des-courbes';
  const legende = paragraphe('', 'ligne-secondaire');
  const table = document.createElement('table');
  table.className = 'table-courbes';
  const garantie = document.createElement('div');
  garantie.className = 'constats';
  const noteDeGarantie = paragraphe(TEXTES_DE_CONFIGURATION.garantieCommune, 'ligne-secondaire');
  cartes.courbes.ui.corps.prepend(trace, legende, paragraphe(TEXTES_DE_CONFIGURATION.aideCourbes, 'ligne-secondaire'), table, garantie, noteDeGarantie);
  groupeDeCarte('courbes', 'courbes', table);

  // Minimums des promesses, repliée : un compte pour les deux seuils.
  const compteDesMinimums = paragraphe('', 'ligne-secondaire');
  const colonnesDesMinimums = document.createElement('div');
  colonnesDesMinimums.className = 'colonnes-de-reglage';
  for (const [seuil, etiquette] of [['texte', TEXTES_DE_CONFIGURATION.seuilTexte], ['nonTexte', TEXTES_DE_CONFIGURATION.seuilNonTexte]] as const) {
    colonnesDesMinimums.append(champEnColonne(etiquette, champDeSaisie({ seuil }, 'minimums', etiquette), unite(TEXTES_DE_CONFIGURATION.uniteDeContraste)));
  }
  cartes.minimums.ui.corps.prepend(compteDesMinimums, colonnesDesMinimums, paragraphe(TEXTES_DE_CONFIGURATION.aideMinimums, 'ligne-secondaire'));
  groupes.contraste = { carte: 'minimums', element: colonnesDesMinimums, compter: (texte) => { compteDesMinimums.textContent = texte; } };

  // Détection des couleurs proches, repliée : un compte par seuil, chacun sous son aide.
  const seuilsProches = [
    { seuil: 'profilsConfondus', etiquette: TEXTES_DE_CONFIGURATION.seuilProfilsConfondus, unite: TEXTES_DE_CONFIGURATION.uniteDEcart, aide: null },
    { seuil: 'palettesProches', etiquette: TEXTES_DE_CONFIGURATION.seuilPalettesProches, unite: TEXTES_DE_CONFIGURATION.uniteDEcart, aide: TEXTES_DE_CONFIGURATION.aideEcarts },
    { seuil: 'chromaGrise', etiquette: TEXTES_DE_CONFIGURATION.seuilChromaGrise, unite: TEXTES_DE_CONFIGURATION.uniteDeChroma, aide: TEXTES_DE_CONFIGURATION.aideGris },
  ] as const;
  const lignesProches = seuilsProches.map(({ seuil, etiquette, unite: texteDUnite, aide }) => {
    const ligne = document.createElement('div');
    ligne.className = 'seuil-de-reglage';
    const compte = paragraphe('', 'ligne-secondaire');
    ligne.append(champEnColonne(etiquette, champDeSaisie({ seuil }, 'proches', etiquette), unite(texteDUnite)), compte);
    if (aide) ligne.append(paragraphe(aide, 'ligne-secondaire'));
    groupes[seuil] = { carte: 'proches', element: ligne, compter: (texte) => { compte.textContent = texte; } };
    return ligne;
  });
  cartes.proches.ui.corps.prepend(...lignesProches);

  const vue = document.createElement('div');
  vue.className = 'page-stack colonne';
  vue.append(apercu, ...Object.values(cartes).map(({ ui }) => ui.element));
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
        cellule.append(champDeSaisie({ courbe: mode, rang }, 'courbes', `${nomDuMode[mode]} ${cran}`));
        ligne.append(cellule);
      }
      return ligne;
    });
    table.replaceChildren(entete, ...lignes);
  }

  function signaler(carte: CarteDesReglages, texte: string | null): void {
    const { erreur } = cartes[carte];
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
  }

  /**
   * Ce que chaque saisie valide redessine sans toucher aux champs : l'aperçu
   * compact, le tracé des courbes et la garantie commune.
   */
  function rendreLesVues(lue: Recette): void {
    const ouverte = recette.ouverte();
    const palette = ouverte ? lue.palettes.find((candidate) => candidate.id === ouverte.id) : undefined;
    const analyse = palette ? analyserPalette(lue, palette) : null;
    if (ouverte && palette && analyse) {
      apercu.replaceChildren(
        paragraphe(paletteDeLApercu(nomDeLaPalette(palette), ouverte.mode), 'ligne-secondaire'),
        resultatsDesGaranties(analyse, ouverte.mode),
        apercuCompact(lue, analyse, ouverte.mode),
      );
    }
    apercu.hidden = !analyse;

    const reference = palette && analyse ? { clarte: rgb8VersOklch(referenceDe(palette)).L, rangs: analyse.ancrage.rangs } : null;
    trace.replaceChildren(dessinerLesCourbes(geometrieDesCourbes(lue.courbes, reference)));
    legende.textContent = legendeDesCourbes(palette && analyse ? { nom: nomDeLaPalette(palette), crans: analyse.ancrage.crans } : null);

    const manques = garantieDesCourbes(lue);
    garantie.replaceChildren(...manques.map((manque) => blocDeConstat(constatDeGarantie(manque), 'alerte')));
    noteDeGarantie.hidden = manques.length === 0;
  }

  /** La recette jugée : une recette valide se prévisualise, et se range à la fin du geste. */
  function proposer(suivante: Recette, carte: CarteDesReglages, fin: boolean): void {
    const jugee = validerRecette(suivante);
    if ('refus' in jugee) {
      if (fin) signaler(carte, texteDuRefus(jugee.refus[0]));
      return;
    }
    signaler(carte, null);
    rendreLesVues(suivante);
    if (fin) recette.appliquer(suivante);
    else recette.previsualiser(suivante);
  }

  /**
   * Une saisie : un nombre qui forme une recette valide se prévisualise, et se
   * range à la validation du champ. Un refus ne se dit qu'à la validation :
   * pendant la frappe, « 0, » n'est pas encore une faute (V9.9).
   */
  function saisir(champ: ChampDeConfiguration, texte: string, carte: CarteDesReglages, fin: boolean): void {
    const lue = recette.lire();
    if (!lue) return;
    const valeur = lireNombre(texte);
    if (valeur === null) {
      if (fin) signaler(carte, nombreInvalide(texte));
      return;
    }
    proposer(poserValeur(lue, champ, valeur), carte, fin);
  }

  /** Un curseur d'intensité, borné pour que Soft ne dépasse pas Vivid. */
  function glisser(profil: Profil, valeur: number, fin: boolean): void {
    const lue = recette.lire();
    if (!lue) return;
    const { soft, vivid } = lue.profils;
    const bornee = profil === 'soft' ? Math.min(valeur, vivid.part) : Math.max(valeur, soft.part);
    proposer(poserValeur(lue, { part: profil }, bornee), 'parts', fin);
    if (fin) afficher();
  }

  /** Un fond saisi, au clavier ou au sélecteur de couleur. */
  function saisirFond(mode: Mode, texte: string, fin: boolean): void {
    const lue = recette.lire();
    if (!lue) return;
    const suivante = poserFond(lue, mode, texte);
    if (suivante === null) {
      if (fin) signaler('fonds', hexaInvalide(texte));
      return;
    }
    proposer(suivante, 'fonds', fin);
    if (fin) afficher();
  }

  function retablirLaCarteChoisie(carte: CarteDesReglages): void {
    const lue = recette.lire();
    const suivante = lue ? retablir(lue, carte) : null;
    if (!suivante) return;
    proposer(suivante, carte, true);
    afficher();
  }

  function afficher(): void {
    const lue = recette.lire();
    sansRecette.hidden = lue !== null;
    vue.hidden = lue === null;
    if (!lue) return;
    batirLaTable(lue.crans);
    for (const { champ, saisie } of champs) {
      if (document.activeElement !== saisie) saisie.value = nombreEcrit(valeurDe(lue, champ));
    }
    for (const { mode, pipette, saisie } of saisiesDesFonds) {
      if (document.activeElement !== saisie) saisie.value = lue.fonds[mode];
      if (document.activeElement !== pipette) pipette.value = lue.fonds[mode].toLowerCase();
    }
    for (const { profil, curseur } of curseurs) {
      if (document.activeElement !== curseur) curseur.value = String(lue.profils[profil].part);
      curseur.setAttribute('aria-valuetext', nombreEcrit(lue.profils[profil].part));
    }
    for (const [nom, groupe] of Object.entries(groupes) as [GroupeDeConfiguration, Groupe][]) {
      groupe.compter(palettesConcernees(palettesModifiees(lue, nom)));
    }
    cartes.minimums.ui.poserResume(resumeDesMinimums(lue.seuils.texte, lue.seuils.nonTexte));
    cartes.proches.ui.poserResume(resumeDesEcarts(lue.seuils.profilsConfondus, lue.seuils.palettesProches, lue.seuils.chromaGrise));
    for (const carte of Object.keys(cartes) as CarteDesReglages[]) {
      const sansDefaut = retablir(lue, carte) === null;
      cartes[carte].retablir.disabled = sansDefaut || estParDefaut(lue, carte);
      cartes[carte].retablir.title = sansDefaut ? TEXTES_DE_CONFIGURATION.courbesSansDefaut : '';
    }
    rendreLesVues(lue);
  }

  return {
    element,
    focaliser(nom) {
      const groupe = groupes[nom];
      cartes[carteDuGroupe(nom)].ui.ouvrir();
      groupe.element.scrollIntoView({ block: 'start' });
      groupe.element.querySelector<HTMLInputElement>('input')?.focus();
    },
    afficher,
  };
}
