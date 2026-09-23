/** La forme de la recette, sa validation et son classement ([REC-03] à [REC-05]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORMAT_RECETTE,
  classerRecette,
  recetteParDefaut,
  validerRecette,
  type RegleRecette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const valide = () => copie(recetteAvec(paletteTailwind('p-0000000a', '#1E6FD9'), paletteTailwind('p-0000000b', '#F2A900')));

test('[REC-05] la recette par défaut et une recette à deux palettes sont valides', () => {
  assert.deepEqual(validerRecette(copie(recetteParDefaut())), { recette: recetteParDefaut() });
  assert.ok('recette' in validerRecette(valide()));
});

/** Pour chaque règle : une altération de la recette valide, et le refus qu'elle doit produire. */
const CAS: [RegleRecette, string, (r: any) => void][] = [
  ['forme', 'crans', (r) => delete r.crans],
  ['forme', 'palettes[0].derive.lien', (r) => { r.palettes[0].derive.lien = 'oui'; }],
  // Seule la présence des clés refuse ici : l'origine absente est aussi une origine inconnue.
  ['forme', 'palettes[1].derive.vivid.origine', (r) => {
    r.palettes[1].derive.lien = false;
    delete r.palettes[1].derive.vivid.origine;
  }],
  ['cle-inconnue', 'planche', (r) => { r.planche = { page: '', cadres: {} }; }],
  ['cle-inconnue', 'palettes[1].couleur', (r) => { r.palettes[1].couleur = '#000000'; }],
  ['crans-croissants', 'crans[3]', (r) => { r.crans[3] = 150; }],
  ['courbes-longueur', 'courbes.light', (r) => { r.courbes.light.pop(); }],
  ['courbes-bornes', 'courbes.dark[10]', (r) => { r.courbes.dark[10] = 1.2; }],
  ['courbe-claire-decroissante', 'courbes.light[5]', (r) => { r.courbes.light[5] = 0.8; }],
  ['courbe-sombre-croissante', 'courbes.dark[5]', (r) => { r.courbes.dark[5] = 0.35; }],
  ['parts-bornes', 'profils.vivid.part', (r) => { r.profils.vivid.part = 1.2; }],
  ['parts-ordre', 'profils', (r) => { r.profils.soft.part = 0.96; }],
  ['parts-ordre', 'palettes[0].parts', (r) => { r.palettes[0].parts = { soft: 0.5, vivid: 0.4, origine: 'designer' }; }],
  ['gamut-inconnu', 'gamut', (r) => { r.gamut = 'display-p3'; }],
  ['hexa-invalide', 'fonds.light', (r) => { r.fonds.light = '#GGGGGG'; }],
  ['hexa-invalide', 'palettes[1].reference', (r) => { r.palettes[1].reference = 'bleu'; }],
  ['seuils-positifs', 'seuils.texte', (r) => { r.seuils.texte = 0; }],
  ['derives-nombre', 'derives', (r) => { r.derives = r.derives.slice(0, 1); }],
  ['derives-noms', 'derives[1]', (r) => { r.derives[1][0] = r.derives[0][0]; }],
  ['derives-teintes', 'derives[2]', (r) => { r.derives[2][2] = 360; }],
  ['derives-teintes-claires', 'derives[1]', (r) => { r.derives[1][1] = r.derives[0][1]; }],
  ['derive-bornes', 'palettes[0].derive.soft.clair', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.soft.clair = 95;
  }],
  ['derive-lien', 'palettes[0].derive', (r) => { r.palettes[0].derive.vivid.sombre += 1; }],
  ['origine-inconnue', 'palettes[1].derive.vivid.origine', (r) => {
    r.palettes[1].derive.lien = false;
    r.palettes[1].derive.vivid.origine = 'auto';
  }],
  ['origine-inconnue', 'palettes[0].parts.origine', (r) => { r.palettes[0].parts = { soft: 0.4, vivid: 0.5, origine: 'auto' }; }],
  ['identifiant-forme', 'palettes[0].id', (r) => { r.palettes[0].id = 'p-1'; }],
  ['identifiants-uniques', 'palettes[1].id', (r) => { r.palettes[1].id = r.palettes[0].id; }],
  ['role-absent', 'cablage.focus', (r) => delete r.cablage.focus],
  ['cible-forme', 'cablage.text', (r) => { r.cablage.text = { profil: 'vivid' }; }],
  ['cible-cran-inconnu', 'palettes[0].cablage.surface.cran', (r) => { r.palettes[0].cablage = { surface: { profil: 'soft', cran: 750 } }; }],
];

for (const [regle, chemin, alterer] of CAS) {
  test(`[REC-05] ${regle} : refusé en ${chemin}`, () => {
    const recette = valide();
    alterer(recette);
    const resultat = validerRecette(recette);
    assert.ok('refus' in resultat, 'la recette altérée a été acceptée');
    assert.ok(
      resultat.refus.some((refus) => refus.regle === regle && refus.chemin === chemin),
      `refus attendu ${regle} en ${chemin}, obtenus : ${JSON.stringify(resultat.refus)}`,
    );
  });
}

test('[REC-05] un refus montre la valeur lue quand elle est un nombre ou un texte', () => {
  const recette = valide();
  recette.crans[3] = 150;
  const resultat = validerRecette(recette);
  assert.ok('refus' in resultat);
  assert.deepEqual(resultat.refus[0], { regle: 'crans-croissants', chemin: 'crans[3]', valeur: 150 });
});

test('[REC-03] une recette absente propose la recette par défaut', () => {
  assert.deepEqual(classerRecette(undefined), { etat: 'absente', recette: recetteParDefaut() });
  assert.deepEqual(classerRecette(''), { etat: 'absente', recette: recetteParDefaut() });
});

test('[REC-03] une recette de la version courante est lue', () => {
  const recette = valide();
  assert.deepEqual(classerRecette(JSON.stringify(recette)), { etat: 'courante', recette });
});

test('[REC-03] une version antérieure connue est migrée en mémoire', () => {
  const ancienne = { ...valide(), formatVersion: 0 };
  const migrations = { 0: (objet: Record<string, unknown>) => ({ ...objet, formatVersion: 1 }) };
  const classement = classerRecette(JSON.stringify(ancienne), migrations);
  assert.equal(classement.etat, 'migree');
  assert.ok(classement.etat === 'migree' && classement.depuis === 0 && classement.recette.formatVersion === FORMAT_RECETTE);
});

test('[REC-03] une version antérieure sans migration est illisible', () => {
  assert.equal(classerRecette(JSON.stringify({ ...valide(), formatVersion: 0 })).etat, 'illisible');
});

test('[REC-03] une version supérieure est future', () => {
  assert.deepEqual(classerRecette(JSON.stringify({ ...valide(), formatVersion: FORMAT_RECETTE + 1 })), {
    etat: 'future',
    version: FORMAT_RECETTE + 1,
  });
});

test('[REC-04] une recette illisible est refusée sans recette de remplacement', () => {
  const cassee = valide();
  cassee.crans[3] = 150;
  for (const texte of ['{pas du json', '[]', '"texte"', JSON.stringify(cassee), JSON.stringify({ formatVersion: 'un' })]) {
    const classement = classerRecette(texte);
    assert.equal(classement.etat, 'illisible', texte);
    assert.ok(!('recette' in classement), texte);
  }
});
