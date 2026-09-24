#!/usr/bin/env node
/**
 * Mesure l'effet de l'ancrage de la référence exacte ([MOT-17]) sur ses
 * voisines et sur les promesses, pour les couleurs de référence du plan
 * d'ergonomie : les teintes 500 et 600 de Tailwind, celles du mainteneur, et
 * quatre gris.
 *
 *   npx tsx packages/couleur/scripts/mesurer-ancrage.mjs
 *
 * Pour chaque référence et chaque mode : la nuance porteuse, l'écart ΔEok
 * entre la référence et la nuance commune qu'elle remplace, puis la marche
 * vers chaque voisine, rapportée à la marche commune au même endroit. Les
 * promesses se comptent sur les rampes communes, puis sur les rampes ancrées.
 * Aucun test ne porte ces chiffres : le plan les cite.
 */
import {
  MODES,
  PAIRES,
  PROFILS,
  TABLE_DES_EMPLOIS,
  ajusterPartsGrises,
  ancrageDe,
  atteintLeSeuil,
  boutsDe,
  contraste,
  distanceOk,
  fabriquerPalette,
  lireHexa,
  partDeChroma,
  partsDe,
  prereglageTailwind,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
} from '../src/index.ts';

const TAILWIND_500 = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'];
const TAILWIND_600 = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#059669', '#0D9488', '#0891B2', '#0284C7', '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#E11D48'];
const MAINTENEUR = ['#B00100', '#A0B599', '#FACC15', '#1E6FD9', '#2B760F'];
const GRIS = ['#000000', '#FFFFFF', '#808080', '#6B7280'];

const recetteDeBase = recetteParDefaut();

function paletteNeuve(hexa) {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(hexa)), boutsDe(recetteDeBase.courbes), recetteDeBase.derives, recetteDeBase.seuils.chromaGrise);
  const palette = ajusterPartsGrises(recetteDeBase, {
    id: 'p-00000001',
    reference: hexa,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  });
  return { recette: { ...recetteDeBase, palettes: [palette] }, palette };
}

/** Les promesses manquées d'un jeu de rampes, jugées comme `verifierPromesses` les juge. */
function manquees(recette, rampes) {
  const fonds = { light: lireHexa(recette.fonds.light), dark: lireHexa(recette.fonds.dark) };
  const couleur = (membre, mode, profil) => {
    if ('fond' in membre) return fonds[mode];
    const cible = TABLE_DES_EMPLOIS[membre.emploi];
    if (cible === 'fond') return fonds[mode];
    return rampes[profil][mode][recette.crans.indexOf(cible) + membre.decalage].couleur;
  };
  const echecs = [];
  for (const mode of MODES) {
    for (const profil of PROFILS) {
      for (const paire of PAIRES) {
        const valeur = contraste(couleur(paire.premier, mode, profil), couleur(paire.second, mode, profil));
        if (!atteintLeSeuil(valeur, recette.seuils[paire.seuil])) echecs.push(`${mode}/${profil}/${paire.numero} ${valeur.toFixed(2)}`);
      }
    }
  }
  return echecs;
}

const ecart = (a, b) => distanceOk(a.couleur, b.couleur).toFixed(3);

for (const hexa of [...MAINTENEUR, ...TAILWIND_500, ...TAILWIND_600, ...GRIS]) {
  const { recette, palette } = paletteNeuve(hexa);
  const ancrage = ancrageDe(recette, palette);
  const ancrees = rampesDe(recette, palette);
  const communes = fabriquerPalette({
    reference: lireHexa(hexa),
    courbes: recette.courbes,
    parts: partsDe(recette, palette),
    derives: { soft: palette.derive.soft, vivid: palette.derive.vivid },
    gamut: recette.gamut,
  });
  const modes = MODES.map((mode) => {
    const rang = ancrage.rangs[mode];
    const commune = communes[ancrage.profil][mode];
    const ancree = ancrees[ancrage.profil][mode];
    const marche = (voisin) => (voisin < 0 || voisin >= commune.length
      ? '–'
      : `${ecart(ancree[rang], ancree[voisin])} (${ecart(commune[rang], commune[voisin])})`);
    return `${mode} ${ancrage.crans[mode]} remplace ${ecart(commune[rang], ancree[rang])} · marches ${marche(rang - 1)} / ${marche(rang + 1)}`;
  });
  const avant = manquees(recette, communes);
  const apres = manquees(recette, ancrees);
  console.log(`${hexa} part ${partDeChroma(lireHexa(hexa)).toFixed(2)} → ${ancrage.profil} · ${modes.join(' ; ')} · promesses ${avant.length} → ${apres.length} ${apres.join(', ')}`);
}
