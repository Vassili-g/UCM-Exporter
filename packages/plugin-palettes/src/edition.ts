/**
 * Les modifications qu'une saisie du designer fait à une palette, sans rien
 * ranger : le rangement suit la fin du geste (D-D).
 */
import {
  BORNES_DES_CRANS_LIBRES,
  DERIVE_MAXIMALE,
  PROFILS,
  ajusterPartsGrises,
  arrondir,
  boutsDe,
  ecrireHexa,
  lireHexa,
  partsDe,
  prereglageTailwind,
  rgb8VersOklch,
  type Derive,
  type DeriveRangee,
  type Palette,
  type Profil,
  type Recette,
} from 'ucm-couleur';

/** Un hexa de six chiffres, avec ou sans dièse. */
export const MOTIF_HEXA = /^#?[0-9a-f]{6}$/i;

/**
 * La palette avec une nouvelle référence ([ENT-01]). Une dérive d'origine
 * `tailwind` suit le préréglage recalculé sur la recette ; une dérive `libre`
 * ou `constante` reste telle quelle. Les parts `grise` se posent ou se
 * retirent selon la nouvelle référence ([ENT-09]). Une nouvelle référence
 * retire `originale` : seul `appliquerLAjustement` la garde. Rend `null` pour
 * un hexa qui ne se lit pas.
 */
export function changerReference(recette: Recette, palette: Palette, saisie: string): Palette | null {
  if (!MOTIF_HEXA.test(saisie.trim())) return null;
  const couleur = lireHexa(saisie.trim().startsWith('#') ? saisie.trim() : `#${saisie.trim()}`);
  if (!couleur) return null;
  const prereglage = prereglageTailwind(
    rgb8VersOklch(couleur),
    boutsDe(recette),
    recette.derives,
    recette.seuils.chromaGrise,
  );
  const suivre = (derive: DeriveRangee): DeriveRangee =>
    derive.origine === 'tailwind' ? { ...prereglage, origine: 'tailwind' } : derive;
  const { originale: _originale, ...sansOriginale } = palette;
  return ajusterPartsGrises(recette, {
    ...sansOriginale,
    reference: ecrireHexa(couleur),
    derive: { ...palette.derive, soft: suivre(palette.derive.soft), vivid: suivre(palette.derive.vivid) },
  });
}

/** La couleur de référence d'avant le premier ajustement : `originale`, ou la référence d'une palette jamais ajustée. */
export function originaleDe(palette: Palette): string {
  return palette.originale ?? palette.reference;
}

/**
 * « Appliquer » du panneau d'ajustement (W7.3) : la proposition devient la
 * référence, par le même chemin qu'une saisie, et l'originale se garde, celle
 * du premier ajustement. Une proposition égale à l'originale vaut « Revenir à
 * l'originale ». Rend `null` pour un hexa qui ne se lit pas.
 */
export function appliquerLAjustement(recette: Recette, palette: Palette, proposition: string): Palette | null {
  const originale = originaleDe(palette);
  const suivante = changerReference(recette, palette, proposition);
  if (!suivante || suivante.reference === originale.toUpperCase()) return suivante;
  return { ...suivante, originale: originale.toUpperCase() };
}

/** « Revenir à l'originale » : l'originale redevient la référence, et le champ `originale` se retire. */
export function revenirALOriginale(recette: Recette, palette: Palette): Palette {
  return palette.originale ? changerReference(recette, palette, palette.originale) ?? palette : palette;
}

/** La palette avec un nouveau nom ; un nom vide retire la clé, et la palette s'affiche sous son hexa. */
export function renommer(palette: Palette, nom: string): Palette {
  const { nom: _ancien, ...sansNom } = palette;
  return nom.trim() === '' ? sansNom : { ...sansNom, nom };
}

/**
 * Un identifiant de palette neuf (D-K) : `p-` et huit chiffres hexadécimaux
 * tirés par `tirer`, qui rend un entier de 32 bits. Le hasard vient de
 * l'interface ; le moteur reste sans hasard. Un tirage déjà pris se refait.
 */
export function nouvelIdentifiant(recette: Recette, tirer: () => number): string {
  const pris = new Set(recette.palettes.map((palette) => palette.id));
  for (;;) {
    const id = `p-${(tirer() >>> 0).toString(16).padStart(8, '0')}`;
    if (!pris.has(id)) return id;
  }
}

/**
 * Une palette neuve de référence `saisie`, au préréglage Tailwind, profils
 * liés. Rend `null` pour un hexa qui ne se lit pas.
 */
export function nouvellePalette(recette: Recette, id: string, saisie: string): Palette | null {
  const nulle: DeriveRangee = { clair: 0, sombre: 0, origine: 'tailwind' };
  return changerReference(recette, { id, reference: '#000000', derive: { lien: true, soft: nulle, vivid: nulle } }, saisie);
}

/** La recette avec la palette ajoutée en dernier. */
export function ajouter(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: [...recette.palettes, palette] };
}

/** Une copie de la palette, sous un autre identifiant et un autre nom, placée juste après elle. */
export function dupliquer(recette: Recette, id: string, nouvelId: string, nom: string): Recette {
  const rang = recette.palettes.findIndex((palette) => palette.id === id);
  if (rang < 0) return recette;
  const copie: Palette = { ...recette.palettes[rang], id: nouvelId, nom };
  const palettes = [...recette.palettes];
  palettes.splice(rang + 1, 0, copie);
  return { ...recette, palettes };
}

/** La palette avancée d'un rang (`1`) ou reculée (`-1`) dans l'ordre d'affichage ; rien aux bouts. */
export function deplacer(recette: Recette, id: string, sens: -1 | 1): Recette {
  const rang = recette.palettes.findIndex((palette) => palette.id === id);
  const cible = rang + sens;
  if (rang < 0 || cible < 0 || cible >= recette.palettes.length) return recette;
  const palettes = [...recette.palettes];
  [palettes[rang], palettes[cible]] = [palettes[cible], palettes[rang]];
  return { ...recette, palettes };
}

/**
 * La recette sans la palette. Son cadre reste sur la planche, et la planche le
 * signalera orphelin ([ENT-03]).
 */
export function supprimer(recette: Recette, id: string): Recette {
  return { ...recette, palettes: recette.palettes.filter((palette) => palette.id !== id) };
}

/** Le préréglage Tailwind de la référence d'une palette, sur le relevé de la recette (section 6.5). */
export function prereglageDe(recette: Recette, palette: Palette): Derive {
  const couleur = lireHexa(palette.reference);
  if (!couleur) return { clair: 0, sombre: 0 };
  return prereglageTailwind(rgb8VersOklch(couleur), boutsDe(recette), recette.derives, recette.seuils.chromaGrise);
}

/**
 * L'origine que deux angles méritent ([DER-11]) : `tailwind` s'ils valent le
 * préréglage, `constante` s'ils valent zéro, `libre` sinon. Les angles se
 * comparent arrondis au centième, comme ils se rangent ([MOT-27]).
 */
export function origineDe(recette: Recette, palette: Palette, derive: Derive): DeriveRangee['origine'] {
  const tailwind = prereglageDe(recette, palette);
  if (derive.clair === tailwind.clair && derive.sombre === tailwind.sombre) return 'tailwind';
  if (derive.clair === 0 && derive.sombre === 0) return 'constante';
  return 'libre';
}

/** Les profils qu'un réglage touche : les deux quand ils sont liés ([DER-12]). */
export function profilsTouches(palette: Palette, profil: Profil): readonly Profil[] {
  return palette.derive.lien ? PROFILS : [profil];
}

function poserDerive(recette: Recette, palette: Palette, profils: readonly Profil[], derive: Derive): Palette {
  const rangee: DeriveRangee = {
    clair: arrondir(Math.max(-DERIVE_MAXIMALE, Math.min(DERIVE_MAXIMALE, derive.clair)), 2) + 0,
    sombre: arrondir(Math.max(-DERIVE_MAXIMALE, Math.min(DERIVE_MAXIMALE, derive.sombre)), 2) + 0,
    origine: 'libre',
  };
  const avecOrigine = { ...rangee, origine: origineDe(recette, palette, rangee) };
  const suivante = { ...palette.derive };
  for (const cible of profils) suivante[cible] = avecOrigine;
  return { ...palette, derive: suivante };
}

/**
 * La palette dont un bout de la dérive prend `angle` ([DER-07], [DER-08]),
 * borné à ±90° et arrondi au centième ([MOT-27]), pour le profil réglé, ou les
 * deux quand ils sont liés.
 */
export function reglerBout(recette: Recette, palette: Palette, profil: Profil, bout: 'clair' | 'sombre', angle: number): Palette {
  const actuelle = palette.derive[profil];
  return poserDerive(recette, palette, profilsTouches(palette, profil), { ...actuelle, [bout]: angle });
}

/** La palette dont les deux dérives prennent un préréglage ([DER-11]) : Tailwind, ou 0° et 0°. */
export function appliquerPrereglage(recette: Recette, palette: Palette, profil: Profil, prereglage: 'tailwind' | 'constante'): Palette {
  const derive = prereglage === 'tailwind' ? prereglageDe(recette, palette) : { clair: 0, sombre: 0 };
  return poserDerive(recette, palette, profilsTouches(palette, profil), derive);
}

/** Délier garde les deux dérives telles quelles ; lier aligne soft sur vivid ([DER-12]). */
export function lierLesProfils(palette: Palette, lien: boolean): Palette {
  const { soft, vivid } = palette.derive;
  return { ...palette, derive: { lien, soft: lien ? vivid : soft, vivid } };
}

/** La recette où la palette d'identifiant `palette.id` est remplacée. */
export function remplacerPalette(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: recette.palettes.map((candidate) => (candidate.id === palette.id ? palette : candidate)) };
}

/**
 * La palette dont un profil prend une part propre ([ENT-09]), rangée au
 * millième (E3). Ses parts passent au designer : l'autre profil garde la part
 * qu'il employait, et la configuration ne les touche plus.
 */
export function poserPart(recette: Recette, palette: Palette, profil: Profil, part: number): Palette {
  const employees = partsDe(recette, palette);
  return { ...palette, parts: { ...employees, [profil]: arrondir(part, 3), origine: 'designer' } };
}

/** La palette sans parts propres : elle reprend celles de la recette, ou des parts grises si sa référence l'est. */
export function reprendreLesParts(recette: Recette, palette: Palette): Palette {
  const { parts: _retirees, ...sansParts } = palette;
  return ajusterPartsGrises(recette, sansParts);
}

/**
 * La palette avec sa palette de base ([ENT-11]) : `auto` retire le choix, Soft
 * ou Vivid force le profil porteur. Forcer un profil retire les intensités du
 * designer, pour que le profil forcé prenne celle de la référence ; les parts
 * grises restent. Un glisser d'intensité ensuite rend la main au designer
 * sans changer de profil porteur.
 */
export function choisirLaBase(palette: Palette, choix: 'auto' | Profil): Palette {
  const { base: _ancienne, ...sansBase } = palette;
  if (choix === 'auto') return sansBase;
  if (sansBase.parts?.origine !== 'designer') return { ...sansBase, base: choix };
  const { parts: _retirees, ...sansParts } = sansBase;
  return { ...sansParts, base: choix };
}

/**
 * Passe une palette en palette libre (W6.5), sur la liste commune bornée à
 * treize numéros admis : le designer retire ensuite ce qu'il ne veut pas. Une
 * palette libre n'a pas de base (conception W6) : la retirer rend les parts
 * communes à une base forcée.
 */
export function passerEnLibre(recette: Recette, palette: Palette): Palette {
  if (palette.crans !== undefined) return palette;
  const { base: _retiree, ...sansBase } = palette;
  return { ...sansBase, crans: cransLibresParDefaut(recette) };
}

/** Les numéros qu'une palette libre reçoit en sortant du modèle : ceux de la liste commune que les bornes admettent. */
export function cransLibresParDefaut(recette: Recette): number[] {
  const { premier, dernier, pas, nombre } = BORNES_DES_CRANS_LIBRES;
  return recette.crans.filter((cran) => cran % pas === 0 && cran >= premier && cran <= dernier).slice(0, nombre[1]);
}

/** Rend une palette libre au modèle du design system : elle suit de nouveau la liste commune, en Auto. */
export function revenirAuModele(palette: Palette): Palette {
  const { crans: _retiree, ...commune } = palette;
  return commune;
}

/**
 * Ajoute ou retire un numéro d'une palette libre, dans l'ordre croissant. Un
 * geste qui sortirait des bornes, moins de quatre ou plus de treize numéros,
 * rend la palette telle quelle : l'interface désactive la puce avant.
 */
export function basculerNuance(palette: Palette, numero: number): Palette {
  if (palette.crans === undefined) return palette;
  const { nombre } = BORNES_DES_CRANS_LIBRES;
  const present = palette.crans.includes(numero);
  const crans = present ? palette.crans.filter((cran) => cran !== numero) : [...palette.crans, numero].sort((a, b) => a - b);
  return crans.length < nombre[0] || crans.length > nombre[1] ? palette : { ...palette, crans };
}

