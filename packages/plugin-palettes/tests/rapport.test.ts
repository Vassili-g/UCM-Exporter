/** Le rapport de vérification ([VER-01], [VER-02], L6.14). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ancrageDe, contraste, lireHexa, rampesDe, recetteParDefaut, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { rapportDeLaRecette } from '../src/rapport';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9')!, nom: 'Bleu' };
const JAUNE = nouvellePalette(VIDE, 'p-0000000b', '#FACC15')!;
const RECETTE: Recette = [BLEU, JAUNE].reduce(ajouter, VIDE);

test('[VER-01] chaque palette donne, par mode et par profil, chaque cran avec son hexa et ses contrastes', () => {
  const rapport = rapportDeLaRecette(RECETTE, '0badc0de', 'SRGB', null);
  assert.deepEqual(rapport.palettes.map(({ id, nom }) => [id, nom]), [[BLEU.id, 'Bleu'], [JAUNE.id, null]]);
  const rampes = rampesDe(RECETTE, BLEU);
  const clairVivid = rapport.palettes[0].crans.light.vivid;
  assert.deepEqual(clairVivid.map(({ cran }) => cran), RECETTE.crans);
  assert.deepEqual(clairVivid.map(({ hexa }) => hexa), rampes.vivid.light.map(({ hexa }) => hexa));
  const [cinquante] = rapport.palettes[0].crans.dark.soft;
  assert.equal(cinquante.fond, contraste(rampes.soft.dark[0].couleur, lireHexa(RECETTE.fonds.dark)!));
  assert.equal(cinquante.blanc, contraste(rampes.soft.dark[0].couleur, [255, 255, 255]));
});

test('[VER-01] chaque promesse porte sa paire, son contraste et son verdict ; chaque alerte, sa mesure', () => {
  const [bleu, jaune] = rapportDeLaRecette(RECETTE, null, 'SRGB', null).palettes;
  assert.equal(bleu.promesses.length, 64);
  assert.ok(bleu.promesses.every((promesse) => typeof promesse.contraste === 'number' && ['tenue', 'manquee'].includes(promesse.verdict)), JSON.stringify(bleu.promesses[0]));
  const vive = jaune.alertes.find((alerte) => alerte.code === 'reference-plus-vive');
  assert.ok(vive && vive.code === 'reference-plus-vive' && vive.part > vive.partVivid, JSON.stringify(jaune.alertes));
});

test('[MOT-17] le rapport nomme l’ancrage de chaque palette, le même que l’analyse, et le profil du document', () => {
  const rapport = rapportDeLaRecette(RECETTE, null, 'LEGACY', null);
  assert.equal(rapport.formatDuRapport, 2);
  assert.equal(rapport.profilDuDocument, 'LEGACY');
  for (const [rang, palette] of RECETTE.palettes.entries()) {
    const ancrage = ancrageDe(RECETTE, palette);
    assert.deepEqual(rapport.palettes[rang].ancrage, ancrage);
    for (const mode of ['light', 'dark'] as const) {
      assert.equal(rapport.palettes[rang].crans[mode][ancrage.profil][ancrage.rangs[mode]].hexa, palette.reference, `${palette.id} ${mode}`);
    }
  }
});

test('[VER-02] le rapport porte l’empreinte de la recette et les écarts du dernier dessin, et se relit tel quel en JSON', () => {
  const ecarts = [{ palette: BLEU.id, nom: 'vivid/light/700', apercu: '#0E5DC6', peint: '#000000' }];
  const rapport = rapportDeLaRecette(RECETTE, '0badc0de', 'SRGB', ecarts);
  assert.equal(rapport.empreinte, '0badc0de');
  assert.deepEqual(rapport.ecartsDuDernierDessin, ecarts);
  assert.equal(rapportDeLaRecette(RECETTE, null, 'SRGB', null).ecartsDuDernierDessin, null);
  assert.deepEqual(JSON.parse(JSON.stringify(rapport)), rapport);
});
