/** Les textes provisoires : bloquants, refus de validation, constats et aperçu. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, classerRecette, recetteParDefaut, type Alerte } from 'ucm-couleur';

import {
  constatDAlerte,
  constatDePromesse,
  detailDuCran,
  ligneDeLaDerive,
  nommerChamp,
  recetteFuture,
  recetteIllisible,
  texteDuRefus,
  verdict,
} from '../src/ui/textes';

test('un chemin de champ s’écrit en mots du designer', () => {
  assert.equal(nommerChamp('crans[3]'), '4ᵉ cran');
  assert.equal(nommerChamp('crans[0]'), '1ᵉʳ cran');
  assert.equal(nommerChamp('courbes.light[5]'), 'Courbe claire, 6ᵉ cran');
  assert.equal(nommerChamp('fonds.dark'), 'Fond sombre');
  assert.equal(nommerChamp('palettes[1].derive.soft.clair'), 'Palette 2, dérive, soft, bout clair');
  assert.equal(nommerChamp(''), 'La recette');
});

test('un refus porte le champ et la valeur, virgule décimale', () => {
  assert.equal(
    texteDuRefus({ regle: 'courbe-claire-decroissante', chemin: 'courbes.light[5]', valeur: 0.8 }),
    'Courbe claire, 6ᵉ cran : 0,8 ne descend pas depuis le cran précédent.',
  );
});

test('une recette illisible compte ses champs invalides et nomme le premier', () => {
  const recette = recetteParDefaut();
  const light = [...recette.courbes.light];
  light[5] = 0.8;
  const cassee = { ...recette, courbes: { ...recette.courbes, light }, fonds: { ...recette.fonds, dark: '#12121' } };
  const classement = classerRecette(JSON.stringify(cassee));
  assert.ok(classement.etat === 'illisible');
  const constat = recetteIllisible(classement.refus);
  assert.equal(constat.ou, 'Recette du fichier');
  assert.match(constat.quoi, /^2 champs sont invalides ; le premier : Courbe claire, 6ᵉ cran/);
  assert.ok(constat.geste.length > 0);
});

test('une recette future nomme sa version et celle que le plugin lit', () => {
  const constat = recetteFuture(FORMAT_RECETTE + 1);
  assert.equal(constat.ou, `Recette du fichier, version ${FORMAT_RECETTE + 1}`);
  assert.ok(constat.quoi.includes(`version ${FORMAT_RECETTE}`));
});

const RECETTE = {
  ...recetteParDefaut(),
  palettes: [{
    id: 'p-0000000a',
    nom: 'Bleu',
    reference: '#1E6FD9',
    derive: {
      lien: false,
      soft: { clair: -7.53, sombre: 5.11, origine: 'tailwind' as const },
      vivid: { clair: 6, sombre: 0, origine: 'libre' as const },
    },
  }],
};
const CONTEXTE = { recette: RECETTE, nomDe: (id: string) => (id === 'p-0000000a' ? 'Bleu' : 'Violet') };

/** Une alerte de chaque code : `Record` refuse à la compilation un code oublié. */
const ALERTES: Record<Alerte['code'], Alerte> = {
  'profils-confondus': { code: 'profils-confondus', palette: 'p-0000000a', crans: [{ mode: 'light', cran: 100, distance: 0.012 }], seuil: 0.02 },
  'reference-plus-claire-que-bouton': { code: 'reference-plus-claire-que-bouton', palette: 'p-0000000a', reference: '#FACC15', bouton: '#8A560E' },
  'palettes-proches': { code: 'palettes-proches', palettes: ['p-0000000a', 'p-0000000b'], distance: 0.03, seuil: 0.05 },
  'couleur-presque-grise': { code: 'couleur-presque-grise', palette: 'p-0000000a', chroma: 0.021, seuil: 0.03 },
  'reference-plus-terne': { code: 'reference-plus-terne', palette: 'p-0000000a', part: 0.226, partSoft: 0.45 },
  'reference-plus-vive': { code: 'reference-plus-vive', palette: 'p-0000000a', part: 0.983, partVivid: 0.95 },
  'reference-hors-rampe': { code: 'reference-hors-rampe', palette: 'p-0000000a', clarte: 0.254, boutClair: 0.975, boutSombre: 0.27 },
  'fond-hors-courbe': { code: 'fond-hors-courbe', mode: 'light', clarte: 0.949, cran: 0.975 },
};

test('[VER-09] chaque alerte a ses trois parties, où, quoi et geste', () => {
  for (const alerte of Object.values(ALERTES)) {
    const constat = constatDAlerte(alerte, CONTEXTE);
    for (const partie of [constat.ou, constat.quoi, constat.geste]) assert.ok(partie.trim().length > 0, alerte.code);
    assert.ok(!/undefined|NaN/.test(JSON.stringify(constat)), `${alerte.code} : ${JSON.stringify(constat)}`);
  }
});

test('[VER-12] l’alerte du bouton montre la référence et le cran 700 côte à côte', () => {
  const constat = constatDAlerte(ALERTES['reference-plus-claire-que-bouton'], CONTEXTE);
  assert.deepEqual(constat.pastilles, ['#FACC15', '#8A560E']);
  assert.ok(constat.quoi.includes('#8A560E'));
});

test('un fond hors de la courbe nomme son mode et son hexa', () => {
  assert.equal(constatDAlerte(ALERTES['fond-hors-courbe'], CONTEXTE).ou, 'Fond de référence clair, #F7F7F7');
});

test('[VER-06] une promesse manquée nomme la paire, le mode, le profil, le contraste et le seuil', () => {
  const constat = constatDePromesse({
    paire: { numero: 3, premier: { emploi: 'text', decalage: 1 }, second: { emploi: 'surface', decalage: 1 }, seuil: 'texte' },
    mode: 'dark',
    profil: 'vivid',
    premier: { nature: 'cran', cran: 800, couleur: [0, 0, 0] },
    second: { nature: 'cran', cran: 200, couleur: [0, 0, 0] },
    seuil: 4.5,
    contraste: 4.319,
    verdict: 'manquee',
  }, 'Bleu');
  assert.equal(constat.ou, 'Bleu, sombre, vivid : text survol sur surface survol');
  assert.equal(constat.quoi, 'Contraste 4,31 pour 4,5 demandé : le cran 800 ne tient pas la table des emplois.');
  assert.ok(constat.geste.includes('courbe sombre'));
});

test('[VER-07] le verdict compte les promesses manquées', () => {
  assert.equal(verdict(0), 'Prête');
  assert.equal(verdict(1), '1 promesse manquée');
  assert.equal(verdict(3), '3 promesses manquées');
});

test('E22 : la dérive repliée tient sur une ligne, un profil ou deux', () => {
  assert.equal(ligneDeLaDerive(RECETTE.palettes[0]), 'Dérive soft Tailwind · clair −7,5° · sombre +5,1° ; vivid Libre · clair +6,0° · sombre 0,0°');
  const liee = { ...RECETTE.palettes[0], derive: { ...RECETTE.palettes[0].derive, lien: true } };
  assert.equal(ligneDeLaDerive(liee), 'Dérive Libre · clair +6,0° · sombre 0,0°');
});

test('[UI-04] le détail d’un cran donne nom, hexa, contrastes et emplois', () => {
  const texte = detailDuCran({
    nom: 'vivid.700',
    hexa: '#0E5DC6',
    fond: 5.768,
    seuilTenu: 4.5,
    blanc: 6.17,
    noir: 3.4,
    emplois: [{ emploi: 'solid', decalage: 0 }, { emploi: 'border-control', decalage: 1 }],
  });
  assert.equal(texte, 'vivid.700 · #0E5DC6 · fond 5,76 (4,5) · blanc 6,17 · noir 3,40 · solid, border-control survol');
});
