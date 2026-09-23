/**
 * Tous les textes que l'interface montre au designer (D-J). Ils sont
 * provisoires : la rédaction A de `TEXTES-A-VALIDER.md`, jusqu'au choix du
 * mainteneur au point M2. Un constat a trois parties : où, quoi, geste
 * ([VER-09]).
 */
import { FORMAT_RECETTE, type Refus, type RegleRecette } from 'ucm-couleur';

export const TEXTES = {
  titre: 'UCM Palettes',
  titreConfiguration: 'Configuration de la recette',
  etiquetteDesOnglets: 'Vues du plugin',
  ongletPalettes: 'Palettes',
  ongletPlanche: 'Planche',
  lectureEnCours: 'Lecture de la recette du fichier…',
  recetteAbsente: 'Aucune recette dans ce fichier : la recette par défaut s’appliquera à la première palette.',
} as const;

/** Le nombre de palettes que la recette rangée porte. */
export function palettesDuFichier(nombre: number): string {
  if (nombre === 0) return 'Aucune palette dans ce fichier.';
  return nombre === 1 ? '1 palette dans ce fichier.' : `${nombre} palettes dans ce fichier.`;
}

/** Un message en trois parties. */
export interface Constat {
  readonly ou: string;
  readonly quoi: string;
  readonly geste: string;
}

/** Un nombre écrit à la française : virgule décimale. */
function nombre(valeur: string | number | undefined): string {
  return typeof valeur === 'number' ? String(valeur).replace('.', ',') : String(valeur ?? '');
}

const rangEcrit = (rang: number): string => (rang === 0 ? '1ᵉʳ' : `${rang + 1}ᵉ`);

const MODES: Record<string, string> = { light: 'claire', dark: 'sombre' };
const FONDS: Record<string, string> = { light: 'Fond clair', dark: 'Fond sombre' };
const CLES_DE_PALETTE: Record<string, string> = {
  id: 'identifiant',
  nom: 'nom',
  reference: 'référence',
  derive: 'dérive',
  parts: 'parts propres',
  clair: 'bout clair',
  sombre: 'bout sombre',
  lien: 'lien des profils',
  origine: 'origine',
};

/**
 * Le chemin d'un champ en mots du designer : `crans[3]` devient « 4ᵉ cran »,
 * `palettes[1].derive.soft.clair` « Palette 2, dérive, soft, bout clair ». Un
 * chemin que la table ne connaît pas s'écrit tel quel.
 */
export function nommerChamp(chemin: string): string {
  if (chemin === '') return 'La recette';
  let trouve = /^crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `${rangEcrit(Number(trouve[1]))} cran`;
  trouve = /^courbes\.(light|dark)(?:\[(\d+)\])?$/.exec(chemin);
  if (trouve) return `Courbe ${MODES[trouve[1]]}${trouve[2] ? `, ${rangEcrit(Number(trouve[2]))} cran` : ''}`;
  trouve = /^profils\.(soft|vivid)\.part$/.exec(chemin);
  if (trouve) return `Part de ${trouve[1]}`;
  trouve = /^fonds\.(light|dark)$/.exec(chemin);
  if (trouve) return FONDS[trouve[1]];
  trouve = /^seuils\.(\w+)$/.exec(chemin);
  if (trouve) return `Seuil ${trouve[1]}`;
  trouve = /^derives\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Relevé Tailwind, rampe ${Number(trouve[1]) + 1}`;
  trouve = /^palettes\[(\d+)\]((?:\.\w+)*)$/.exec(chemin);
  if (trouve) {
    const suite = trouve[2].split('.').filter(Boolean).map((cle) => CLES_DE_PALETTE[cle] ?? cle);
    return [`Palette ${Number(trouve[1]) + 1}`, ...suite].join(', ');
  }
  const connus: Record<string, string> = {
    crans: 'Crans',
    profils: 'Parts des profils',
    gamut: 'Gamut',
    formatVersion: 'Version de la recette',
    derives: 'Relevé Tailwind',
    palettes: 'Palettes',
  };
  return connus[chemin] ?? chemin;
}

/** Le texte d'un refus de validation, où et quoi sur la même ligne. */
const REFUS: Record<RegleRecette, (champ: string, valeur: string) => string> = {
  forme: (champ) => `${champ} : valeur absente ou du mauvais type.`,
  'cle-inconnue': (champ) => `${champ} : champ inconnu de cette version de la recette.`,
  'crans-croissants': (_, valeur) => (valeur
    ? `Crans : le cran ${valeur} ne suit pas le précédent.`
    : 'Crans : il en faut deux au moins, en ordre croissant.'),
  'courbes-longueur': (champ, valeur) => `${champ} : ${valeur} clartés, une par cran attendue.`,
  'courbes-bornes': (champ, valeur) => `${champ} : clarté ${valeur}, hors de 0 à 1.`,
  'courbe-claire-decroissante': (champ, valeur) => `${champ} : ${valeur} ne descend pas depuis le cran précédent.`,
  'courbe-sombre-croissante': (champ, valeur) => `${champ} : ${valeur} ne monte pas depuis le cran précédent.`,
  'parts-bornes': (champ, valeur) => `${champ} : ${valeur}, hors de 0 à 1.`,
  'parts-ordre': (champ) => `${champ} : la part de soft dépasse celle de vivid.`,
  'gamut-inconnu': (_, valeur) => `Gamut « ${valeur} » : seul sRGB est pris en charge.`,
  'hexa-invalide': (champ, valeur) => `${champ} : « ${valeur} » n’est pas une couleur hexadécimale.`,
  'seuils-positifs': (champ, valeur) => `${champ} : ${valeur}, il doit être positif.`,
  'derives-nombre': (_, valeur) => `Relevé Tailwind : ${valeur} rampe, il en faut deux au moins.`,
  'derives-noms': (_, valeur) => `Relevé Tailwind : « ${valeur} » apparaît deux fois.`,
  'derives-teintes': (champ, valeur) => `${champ} : teinte ${valeur}, hors de 0 à 360.`,
  'derives-teintes-claires': (_, valeur) => `Relevé Tailwind : deux rampes partagent la teinte claire ${valeur}.`,
  'derive-bornes': (champ, valeur) => `${champ} : ${valeur}°, hors de -90° à +90°.`,
  'derive-lien': (champ) => `${champ} : profils liés, mais dérives différentes.`,
  'origine-inconnue': (champ, valeur) => `${champ} : origine « ${valeur} » inconnue.`,
  'identifiant-forme': (_, valeur) => `Palette « ${valeur} » : identifiant mal formé.`,
  'identifiants-uniques': (_, valeur) => `Deux palettes portent l’identifiant « ${valeur} ».`,
  'crans-emplois': (_, valeur) => `Crans : le cran ${valeur} manque, et la table des emplois l’emploie.`,
};

/** Le texte d'un refus de [REC-05]. */
export function texteDuRefus(refus: Refus): string {
  return REFUS[refus.regle](nommerChamp(refus.chemin), nombre(refus.valeur));
}

/** Le bloquant d'une recette rangée par une version plus récente du plugin. */
export function recetteFuture(version: number): Constat {
  return {
    ou: `Recette du fichier, version ${version}`,
    quoi: `Ce plugin lit la version ${FORMAT_RECETTE} : il ne dessinera rien avec cette recette.`,
    geste: 'Mettez UCM Palettes à jour. Vous pouvez aussi exporter la recette, en importer une autre, ou repartir de la recette par défaut.',
  };
}

/** Le bloquant d'une recette rangée que la validation refuse. */
export function recetteIllisible(refus: readonly Refus[]): Constat {
  const compte = refus.length === 1 ? '1 champ est invalide' : `${refus.length} champs sont invalides`;
  return {
    ou: 'Recette du fichier',
    quoi: `${compte} ; le premier : ${texteDuRefus(refus[0])} Le plugin ne dessinera rien.`,
    geste: 'Exportez la recette pour la corriger, importez une recette valide, ou repartez de la recette par défaut.',
  };
}
