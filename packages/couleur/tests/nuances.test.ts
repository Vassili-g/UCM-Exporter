/** W6 et W7 : les préréglages, la palette libre, le format 3 et la proposition d'ajustement (CONCEPTION-NUANCES-ET-FORMAT-3.md). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORMAT_RECETTE,
  PREREGLAGES,
  alertesDeRecette,
  ancrageDe,
  boutsDe,
  classerRecette,
  confusionsDe,
  distanceDePalettes,
  ecrireHexa,
  emploisDuCran,
  fabriquerPalette,
  grilleAuPrereglage,
  grilleDe,
  jsonCanonique,
  lireHexa,
  luminositeAuNumero,
  nombreDeNuancesDe,
  propositionDAjustement,
  pasDepuisLOriginale,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  verifierPromesses,
  type Palette,
  type Recette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const proche = (valeur: number, attendue: number) => assert.ok(Math.abs(valeur - attendue) < 1e-9, `${valeur} ≠ ${attendue}`);

/** La recette par défaut passée à un préréglage, avec les palettes données. */
function recetteA(nombre: 9 | 11 | 13, ...palettes: Palette[]): Recette {
  const { crans, courbes } = grilleAuPrereglage(recetteParDefaut(), nombre);
  return { ...recetteAvec(...palettes), crans, courbes };
}

/** Les hexas d'une palette par nuance, dans chaque profil et chaque thème. */
function hexasParNuance(recette: Recette, palette: Palette): Map<string, string> {
  const rampes = rampesDe(recette, palette);
  const { crans } = grilleDe(recette, palette);
  const hexas = new Map<string, string>();
  for (const profil of ['soft', 'vivid'] as const) {
    for (const mode of ['light', 'dark'] as const) rampes[profil][mode].forEach((cran, rang) => hexas.set(`${profil}/${mode}/${crans[rang]}`, cran.hexa));
  }
  return hexas;
}

test('W6 : les trois préréglages se reconnaissent, et la recette par défaut est celle de onze nuances', () => {
  assert.equal(nombreDeNuancesDe(recetteParDefaut().crans), 11);
  assert.equal(nombreDeNuancesDe(PREREGLAGES[9].crans), 9);
  assert.equal(nombreDeNuancesDe(PREREGLAGES[13].crans), 13);
  assert.equal(nombreDeNuancesDe([50, 100, 200, 300, 400, 500, 600, 700, 800, 900]), null);
  assert.deepEqual(PREREGLAGES[13].crans.slice(-2), [1000, 1050]);
  for (const nombre of [9, 11, 13] as const) assert.ok('recette' in validerRecette(recetteA(nombre)), String(nombre));
});

test('W6.8 : chaque préréglage garde les rôles et leurs états à leurs numéros', () => {
  const emploisParNumero = (recette: Recette) => new Map(recette.crans.map((cran, rang) => [cran, emploisDuCran(recette.crans, rang)]));
  const onze = emploisParNumero(recetteParDefaut());
  for (const nombre of [9, 13] as const) {
    const autres = emploisParNumero(recetteA(nombre));
    for (const [cran, emplois] of onze) if (emplois.length > 0) assert.deepEqual(autres.get(cran), emplois, `${nombre} : ${cran}`);
  }
});

test('W6 : la luminosité d’un numéro, dans la liste, entre deux numéros, après et avant la liste', () => {
  const defaut = recetteParDefaut();
  assert.equal(luminositeAuNumero(defaut, 'light', 600), 0.585);
  proche(luminositeAuNumero(defaut, 'light', 450), (0.76 + 0.67) / 2);
  proche(luminositeAuNumero(defaut, 'light', 1000), 0.215);
  proche(luminositeAuNumero(defaut, 'light', 1050), 0.165);
  proche(luminositeAuNumero(defaut, 'dark', 1000), 0.96);
  proche(luminositeAuNumero(defaut, 'dark', 1050), 0.98);
  // Une courbe Dark réglée près du blanc : la règle proportionnelle reste monotone et n'atteint pas 1.
  const reglee = { ...defaut, courbes: { ...defaut.courbes, dark: defaut.courbes.dark.map((L, rang) => (rang === 10 ? 0.97 : L)) } };
  const [mille, milleCinquante] = [1000, 1050].map((numero) => luminositeAuNumero(reglee, 'dark', numero));
  assert.ok(mille > 0.97 && milleCinquante > mille && milleCinquante < 1, `${mille} ${milleCinquante}`);
  // Avant la liste : une liste importée qui commence à 100 prolonge vers le blanc en Light.
  const importee = { crans: defaut.crans.slice(1), courbes: { light: defaut.courbes.light.slice(1), dark: defaut.courbes.dark.slice(1) } };
  const cinquante = luminositeAuNumero(importee, 'light', 50);
  assert.ok(cinquante > 0.95 && cinquante < 1, String(cinquante));
});

test('W6 : les bouts de la dérive se lisent aux numéros 50 et 950, préréglage 9 compris', () => {
  for (const nombre of [9, 11, 13] as const) {
    const bouts = boutsDe(PREREGLAGES[nombre]);
    proche(bouts.clair, 0.975);
    proche(bouts.sombre, 0.27);
  }
});

test('W6 : passer de 11 à 13 nuances ne change aucune couleur existante, hors des deux cas d’ancrage', () => {
  for (const hexa of ['#1E6FD9', '#16A34A', '#F2A900', '#6B7280', '#7C3AED']) {
    const palette = paletteTailwind('p-0000000a', hexa);
    const onze = hexasParNuance(recetteA(11, palette), palette);
    const treize = hexasParNuance(recetteA(13, palette), palette);
    for (const [cle, valeur] of onze) assert.equal(treize.get(cle), valeur, `${hexa} ${cle}`);
  }
  // Sous 0,2425 de luminosité, la référence s'ancre au 1000 en Light, et le 950 reprend sa couleur calculée.
  const sombre = paletteTailwind('p-0000000b', '#0B1A33');
  assert.equal(ancrageDe(recetteA(11, sombre), sombre).crans.light, 950);
  assert.equal(ancrageDe(recetteA(13, sombre), sombre).crans.light, 1000);
  const auDessus = paletteTailwind('p-0000000c', '#1A2A45');
  assert.equal(ancrageDe(recetteA(13, auDessus), auDessus).crans.light, 950, 'au-dessus du seuil, l’ancrage reste au 950');
});

test('W6 : passer de 11 à 9 nuances déplace l’ancrage d’une référence au 400', () => {
  const palette = paletteTailwind('p-0000000a', '#8FB8F0');
  assert.equal(ancrageDe(recetteA(11, palette), palette).crans.light, 400);
  assert.equal(ancrageDe(recetteA(9, palette), palette).crans.light, 300);
});

test('W6.4 : un préréglage garde les luminosités réglées ; un numéro ajouté prend la sienne, ou la règle quand ses voisines l’empêchent', () => {
  const neuf = recetteA(9);
  const retour = grilleAuPrereglage(neuf, 11);
  assert.deepEqual(retour.courbes, recetteParDefaut().courbes, '9 → 11 rend les courbes par défaut');
  const reglee = { ...recetteParDefaut(), courbes: { ...recetteParDefaut().courbes, light: recetteParDefaut().courbes.light.map((L, rang) => (rang === 10 ? 0.2 : L)) } };
  const treize = grilleAuPrereglage(reglee, 13);
  assert.equal(treize.courbes.light[10], 0.2, 'la valeur réglée est gardée');
  assert.ok(treize.courbes.light[11] < 0.2 && treize.courbes.light[12] < treize.courbes.light[11], 'la courbe reste monotone');
  assert.ok('recette' in validerRecette({ ...reglee, ...treize }));
});

test('W6 : une palette libre suit les courbes communes, garde sa référence exacte, et n’a ni promesse ni alerte des emplois', () => {
  const libre: Palette = { ...paletteTailwind('p-0000000a', '#1E6FD9'), crans: [100, 200, 400, 600, 800, 900] };
  const recette = recetteAvec(libre);
  assert.ok('recette' in validerRecette(recette));
  const grille = grilleDe(recette, libre);
  assert.deepEqual(grille.crans, [100, 200, 400, 600, 800, 900]);
  assert.deepEqual(grille.courbes.light, [0.95, 0.905, 0.76, 0.585, 0.42, 0.34]);
  const ancrage = ancrageDe(recette, libre);
  assert.deepEqual(ancrage.crans, { light: 600, dark: 600 });
  assert.equal(rampesDe(recette, libre)[ancrage.profil].light[ancrage.rangs.light].hexa, '#1E6FD9');
  assert.deepEqual(verifierPromesses(recette, libre), []);
  assert.ok(!alertesDeRecette(recette).some((alerte) => alerte.code === 'profils-confondus'));
  // À numéro égal et parts égales, hors de la nuance de la référence, la couleur est celle du modèle.
  const modele = paletteTailwind('p-0000000b', '#1E6FD9');
  const hexasDuModele = hexasParNuance(recetteAvec(modele), modele);
  for (const [cle, valeur] of hexasParNuance(recette, libre)) if (!cle.endsWith('/600')) assert.equal(valeur, hexasDuModele.get(cle), cle);
  // Le repère ≈ vaut sur toute nuance : le 100 de ce bleu confond Soft et Vivid.
  assert.ok(confusionsDe(recette, libre).some(({ cran }) => cran === 100));
});

test('W6.8 : une palette libre sans 500 ne se compare à aucune ; deux palettes qui portent 500, 600 et 700 se comparent', () => {
  const sans500: Palette = { ...paletteTailwind('p-0000000a', '#1E6FD9'), crans: [100, 300, 600, 700, 900] };
  const voisine = paletteTailwind('p-0000000b', '#1D6DDB');
  assert.equal(distanceDePalettes(recetteAvec(sans500, voisine), sans500, voisine), null);
  const avec500: Palette = { ...paletteTailwind('p-0000000c', '#1E6FD9'), crans: [100, 500, 600, 700] };
  const recette = recetteAvec(avec500, voisine);
  const distance = distanceDePalettes(recette, avec500, voisine);
  assert.ok(distance !== null && distance < recette.seuils.palettesProches);
  assert.ok(alertesDeRecette(recette).some((alerte) => alerte.code === 'palettes-proches'));
});

test('W6.3 : les règles du format 3 refusent une liste libre hors bornes, une base sur une palette libre et une originale identique', () => {
  const refus = (palette: Record<string, unknown>) => {
    const jugee = validerRecette({ ...recetteParDefaut(), palettes: [palette] });
    return 'refus' in jugee ? jugee.refus.map(({ regle, chemin }) => `${regle} ${chemin}`) : [];
  };
  const base = copie(paletteTailwind('p-0000000a', '#1E6FD9'));
  assert.deepEqual(refus({ ...base, crans: [100, 200, 300] }), ['crans-libres-nombre palettes[0].crans']);
  assert.deepEqual(refus({ ...base, crans: Array.from({ length: 14 }, (_, rang) => 50 + 50 * rang) }), ['crans-libres-nombre palettes[0].crans']);
  assert.deepEqual(refus({ ...base, crans: [100, 250, 225, 1100] }), ['crans-libres-numeros palettes[0].crans[2]', 'crans-libres-numeros palettes[0].crans[3]']);
  assert.deepEqual(refus({ ...base, crans: [100, 200, '300', 400] }), ['forme palettes[0].crans[2]']);
  assert.deepEqual(refus({ ...base, crans: [100, 200, 300, 400], base: 'soft' }), ['base-libre palettes[0].base']);
  assert.deepEqual(refus({ ...base, originale: '#1e6fd9' }), ['originale-identique palettes[0].originale']);
  assert.deepEqual(refus({ ...base, originale: '#12' }), ['hexa-invalide palettes[0].originale']);
  assert.deepEqual(refus({ ...base, crans: [...recetteParDefaut().crans], originale: '#16A34A' }), [], 'une liste égale à la liste commune est admise');
});

test('W6.3 : une recette de format 2 se migre au format 3 sans changer son texte, et une liste importée sans 950 change de couleurs', () => {
  const palette = paletteTailwind('p-0000000a', '#1E6FD9');
  const ancienne = { ...recetteAvec(palette), formatVersion: 2 };
  const classement = classerRecette(jsonCanonique(ancienne));
  assert.ok(classement.etat === 'migree' && classement.depuis === 2 && classement.recette.formatVersion === FORMAT_RECETTE);
  assert.deepEqual(classement.recette.palettes, [palette]);
  // Une liste de neuf nuances rangée en format 2 lisait son bout sombre au 900, 0,34 ; elle le lit désormais à 950, 0,27.
  const neuf = recetteA(9, palette);
  const rampes = (bouts: { clair: number; sombre: number }) => fabriquerPalette({
    reference: lireHexa(palette.reference)!,
    courbes: neuf.courbes,
    bouts,
    parts: { soft: neuf.profils.soft.part, vivid: neuf.profils.vivid.part },
    derives: { soft: palette.derive.soft, vivid: palette.derive.vivid },
    gamut: neuf.gamut,
  }).vivid.light.map(({ hexa }) => hexa);
  assert.notDeepEqual(rampes(boutsDe(neuf)), rampes({ clair: 0.975, sombre: 0.34 }));
});

test('W7.6 : un pas sombre sur #16A34A donne #0DA047, zéro pas rend l’originale, et le pas se retrouve depuis la référence', () => {
  const originale = lireHexa('#16A34A')!;
  assert.equal(ecrireHexa(propositionDAjustement(originale, -1, 'srgb')!), '#0DA047');
  assert.equal(propositionDAjustement(originale, 0, 'srgb'), originale);
  assert.equal(propositionDAjustement(originale, 100, 'srgb'), null, 'hors de [0, 1]');
  assert.equal(pasDepuisLOriginale(originale, lireHexa('#0DA047')!, 'srgb'), -1);
  assert.equal(pasDepuisLOriginale(originale, lireHexa('#0DA048')!, 'srgb'), null, 'un code saisi à la main n’est pas une proposition');
});
