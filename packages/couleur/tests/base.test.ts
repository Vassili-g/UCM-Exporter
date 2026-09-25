/**
 * La palette de base ([ENT-11]) : Soft ou Vivid force le profil porteur, et ce
 * profil prend l'intensité de la référence, calculée à la lecture.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORMAT_RECETTE,
  MODES,
  PROFILS,
  ajusterPartsGrises,
  alertesDePalette,
  ancrageDe,
  arrondir,
  classerRecette,
  jsonCanonique,
  lireHexa,
  partDeChroma,
  partsDe,
  profilAutomatique,
  profilPorteur,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  type Palette,
  type Profil,
  type Recette,
} from '../src/index';
import { paletteTailwind } from './fabrique';

/** Une recette d'une seule palette de cette référence, forcée sur `base`, parts grises posées s'il le faut. */
function forcee(reference: string, base?: Profil, recette: Recette = recetteParDefaut()): { recette: Recette; palette: Palette } {
  const palette = ajusterPartsGrises(recette, paletteTailwind('p-000000b1', reference, base ? { base } : {}));
  return { recette: { ...recette, palettes: [palette] }, palette };
}

const partDe = (reference: string): number => arrondir(partDeChroma(lireHexa(reference)!, 'srgb'), 3);

const codesDAlerte = (recette: Recette, palette: Palette): string[] => alertesDePalette(recette, palette).map((alerte) => alerte.code);

test('[ENT-11] une référence terne forcée en Vivid : Vivid prend son intensité, Soft descend à elle', () => {
  const { recette, palette } = forcee('#A0B599', 'vivid');
  assert.equal(profilAutomatique(recette, palette), 'soft');
  assert.equal(profilPorteur(recette, palette), 'vivid');
  const part = partDe('#A0B599');
  assert.deepEqual(partsDe(recette, palette), { soft: Math.min(0.45, part), vivid: part });
  assert.ok(!codesDAlerte(recette, palette).includes('reference-plus-terne'));
  assert.ok(!codesDAlerte(recette, palette).includes('reference-plus-vive'));
});

test('[ENT-11] une référence saturée forcée en Soft : Soft prend son intensité, Vivid ne descend pas sous elle', () => {
  const { recette, palette } = forcee('#1E6FD9', 'soft');
  assert.equal(profilAutomatique(recette, palette), 'vivid');
  assert.equal(profilPorteur(recette, palette), 'soft');
  const part = partDe('#1E6FD9');
  assert.deepEqual(partsDe(recette, palette), { soft: part, vivid: Math.max(0.95, part) });
  assert.ok(!codesDAlerte(recette, palette).some((code) => code === 'reference-plus-terne' || code === 'reference-plus-vive'));
});

test('[ENT-11] forcer le profil qu’Auto aurait choisi aligne quand même son intensité sur la référence', () => {
  const { recette, palette } = forcee('#1E6FD9', 'vivid');
  assert.equal(profilPorteur(recette, palette), profilAutomatique(recette, palette));
  assert.deepEqual(partsDe(recette, palette), { soft: 0.45, vivid: partDe('#1E6FD9') });
});

test('[ENT-11] sans palette de base, les intensités reviennent aux réglages communs', () => {
  const { recette, palette } = forcee('#1E6FD9');
  assert.deepEqual(partsDe(recette, palette), { soft: 0.45, vivid: 0.95 });
  assert.equal(profilPorteur(recette, palette), 'vivid');
});

test('[ENT-11] [ENT-09] un gris et le noir forcés gardent leurs parts grises, et le profil forcé les porte', () => {
  for (const reference of ['#6B7280', '#000000']) {
    for (const base of PROFILS) {
      const { recette, palette } = forcee(reference, base);
      assert.equal(palette.parts?.origine, 'grise', reference);
      assert.equal(profilPorteur(recette, palette), base, `${reference} ${base}`);
      assert.equal(partsDe(recette, palette).soft, partsDe(recette, palette).vivid);
    }
  }
});

test('[ENT-11] des intensités du designer passent avant celles de la palette de base', () => {
  const { recette, palette } = forcee('#1E6FD9', 'soft');
  const designer: Palette = { ...palette, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } };
  assert.deepEqual(partsDe(recette, designer), { soft: 0.3, vivid: 0.8 });
  assert.equal(profilPorteur(recette, designer), 'soft');
});

test('[ENT-11] changer les intensités communes ne déplace pas une référence forcée', () => {
  const { recette, palette } = forcee('#A0B599', 'vivid');
  const autre: Recette = { ...recette, profils: { soft: { part: 0.1 }, vivid: { part: 0.2 } } };
  assert.equal(profilPorteur(autre, palette), 'vivid');
  assert.equal(partsDe(autre, palette).soft, Math.min(0.1, partDe('#A0B599')));
});

test('[ENT-11] propriété : sur des teintes, clartés et intensités communes variées, la palette forcée se valide et porte sa référence exacte', () => {
  const communes: [number, number][] = [[0.45, 0.95], [0.1, 0.2], [0.6, 0.6], [0, 1]];
  for (let teinte = 0; teinte < 360; teinte += 37) {
    for (const clarte of [25, 45, 65, 85]) {
      const reference = hsl(teinte, 70, clarte);
      for (const [soft, vivid] of communes) {
        for (const base of PROFILS) {
          const recette: Recette = { ...recetteParDefaut(), profils: { soft: { part: soft }, vivid: { part: vivid } } };
          const { recette: avec, palette } = forcee(reference, base, recette);
          const nom = `${reference} ${base} ${soft}/${vivid}`;
          assert.ok('recette' in validerRecette(avec), nom);
          const parts = partsDe(avec, palette);
          assert.ok(parts.soft <= parts.vivid, nom);
          assert.equal(ancrageDe(avec, palette).profil, base, nom);
          const rampes = rampesDe(avec, palette);
          for (const mode of MODES) assert.equal(rampes[base][mode][ancrageDe(avec, palette).rangs[mode]].hexa, reference, `${nom} ${mode}`);
          if (palette.parts?.origine !== 'grise') {
            assert.ok(!codesDAlerte(avec, palette).some((code) => code === 'reference-plus-terne' || code === 'reference-plus-vive'), nom);
          }
        }
      }
    }
  }
});

test('[REC-05] une palette de base autre que soft ou vivid est refusée', () => {
  const recette = { ...recetteParDefaut(), palettes: [{ ...paletteTailwind('p-000000b1', '#1E6FD9'), base: 'auto' }] };
  const lue = validerRecette(recette);
  assert.ok('refus' in lue);
  assert.deepEqual(lue.refus, [{ regle: 'base-inconnue', chemin: 'palettes[0].base', valeur: 'auto' }]);
});

test('[REC-03] une recette de format 1 se migre jusqu’au format 3 sans changer ses palettes', () => {
  assert.equal(FORMAT_RECETTE, 3);
  const grise = ajusterPartsGrises(recetteParDefaut(), paletteTailwind('p-000000b2', '#6B7280'));
  const designer = paletteTailwind('p-000000b3', '#1E6FD9', { parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } });
  const ancienne = { ...recetteParDefaut(), formatVersion: 1, palettes: [grise, designer] };
  const classement = classerRecette(jsonCanonique(ancienne));
  assert.ok(classement.etat === 'migree' && classement.depuis === 1);
  assert.deepEqual(classement.recette.palettes, [grise, designer]);
  assert.equal(classement.recette.formatVersion, 3);
});

/** Un hexa depuis teinte, saturation et luminosité HSL, en entiers. */
function hsl(teinte: number, saturation: number, luminosite: number): string {
  const s = saturation / 100;
  const l = luminosite / 100;
  const a = s * Math.min(l, 1 - l);
  const canal = (n: number): string => {
    const k = (n + teinte / 30) % 12;
    const valeur = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(valeur * 255).toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`;
}
