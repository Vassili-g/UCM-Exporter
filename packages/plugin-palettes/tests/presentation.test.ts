/** Les messages avant leur mise en mots : groupes de promesses, place des alertes, cibles d'action ([VER-06], [VER-15]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, verifierPromesses, type Alerte, type Recette } from 'ucm-couleur';

import { changerReference } from '../src/edition';
import { accoladesDe, ciblesDeLAlerte, groupesManques, placeDeLAlerte } from '../src/presentation';

const DEFAUT = recetteParDefaut();
const BLEU = changerReference(DEFAUT, {
  id: 'p-0000000a',
  reference: '#000000',
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'tailwind' }, vivid: { clair: 0, sombre: 0, origine: 'tailwind' } },
}, '#1E6FD9')!;

/** La courbe claire place le cran 700 à 0,55 : text sur surface manque 4,5 en Light, pour les deux profils. */
function recetteAMoitieRatee(): Recette {
  const light = [...DEFAUT.courbes.light];
  light[7] = 0.55;
  return { ...DEFAUT, palettes: [BLEU], courbes: { ...DEFAUT.courbes, light } };
}

test('[VER-06] deux profils en échec sur la même paire font un groupe, et comptent deux contrôles', () => {
  const recette = recetteAMoitieRatee();
  const promesses = verifierPromesses(recette, BLEU);
  const groupes = groupesManques(promesses);
  assert.deepEqual(groupes.map((groupe) => `${groupe.association.premier}/${groupe.association.second} ${groupe.mode} ${groupe.etat} ${groupe.manquees}`), ['text/surface light 0 2']);
  assert.equal(groupes.reduce((total, groupe) => total + groupe.manquees, 0), promesses.filter((promesse) => promesse.verdict === 'manquee').length);
  assert.deepEqual(groupes[0].resultats.map((promesse) => promesse.profil), ['soft', 'vivid']);
});

test('[VER-06] un groupe garde le résultat du profil qui tient sa promesse', () => {
  const promesses = verifierPromesses(recetteAMoitieRatee(), BLEU).map((promesse) =>
    (promesse.profil === 'soft' ? { ...promesse, verdict: 'tenue' as const } : promesse));
  const [groupe] = groupesManques(promesses);
  assert.equal(groupe.manquees, 1);
  assert.deepEqual(groupe.resultats.map((promesse) => promesse.verdict), ['tenue', 'manquee']);
});

test('aucune promesse manquée, aucun groupe', () => {
  assert.deepEqual(groupesManques(verifierPromesses({ ...DEFAUT, palettes: [BLEU] }, BLEU)), []);
});

test('[VER-10] [VER-11] les alertes qui comparent les intensités se lisent près du réglage d’intensité', () => {
  const place = (code: Alerte['code']) => placeDeLAlerte({ code } as Alerte);
  assert.deepEqual(
    ['profils-confondus', 'reference-plus-terne', 'reference-plus-vive', 'palettes-proches', 'couleur-presque-grise', 'reference-hors-rampe', 'fond-hors-courbe'].map((code) => place(code as Alerte['code'])),
    ['intensite', 'intensite', 'intensite', 'liste', 'liste', 'liste', 'liste'],
  );
});

test('[VER-15] des profils confondus mènent aux intensités de la palette si elle a les siennes, sinon aux intensités communes', () => {
  const alerte: Alerte = { code: 'profils-confondus', palette: BLEU.id, crans: [], seuil: 0.02 };
  assert.deepEqual(ciblesDeLAlerte(alerte, BLEU), ['intensites-communes']);
  assert.deepEqual(ciblesDeLAlerte(alerte, { ...BLEU, parts: { soft: 0.3, vivid: 0.9, origine: 'designer' } }), ['intensites-palette']);
  assert.deepEqual(ciblesDeLAlerte({ code: 'fond-hors-courbe', mode: 'light', clarte: 0.9, cran: 0.975 }, BLEU), ['fonds']);
});

test('[VER-11] [ENT-11] des profils confondus sous une palette de base forcée mènent aux intensités de la palette', () => {
  const alerte: Alerte = { code: 'profils-confondus', palette: BLEU.id, crans: [], seuil: 0.02 };
  assert.deepEqual(ciblesDeLAlerte(alerte, { ...BLEU, base: 'vivid' }), ['intensites-palette']);
  assert.deepEqual(ciblesDeLAlerte(alerte, BLEU), ['intensites-communes']);
});

test('[UI-04] les accolades se déduisent de la table des emplois : deux lignes, des libellés qui ne se chevauchent pas', () => {
  const decrire = accoladesDe(DEFAUT.crans).map((ligne) => ligne.map((accolade) => `${accolade.emplois.join('·')} ${accolade.debut}-${accolade.fin} [${accolade.libelle.debut}-${accolade.libelle.fin} ${accolade.libelle.alignement}]`));
  assert.deepEqual(decrire, [
    ['on-solid -1--1 [-2-0 center]', 'surface 1-3 [1-6 start]', 'solid·text 7-9 [7-10 start]'],
    // surface-card, une colonne entre on-solid et surface, passe sur la seconde ligne : son libellé s'y centre.
    ['surface-card 0-0 [-2-2 center]', 'border-decorative 3-3 [3-5 start]', 'border-control·focus 6-8 [6-10 start]'],
  ]);
});
