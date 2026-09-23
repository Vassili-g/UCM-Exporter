/**
 * Le moteur rend les promesses que l'architecture multi-marques a mesurées.
 *
 * `verifier-courbes.mjs` (dossier « Archi Tokens Multi-marques ») éprouve le
 * câblage par défaut sur les 360 teintes entières, les deux profils et les deux
 * modes, à teinte constante et en virgule flottante. Ses minima, relevés au lot
 * 0 du plan du plugin Palettes, sont figés ici : le chemin sans arrondi du
 * moteur doit les rendre à 0,01 près. Le même balayage, arrondi à 8 bits, doit
 * tenir chaque seuil.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  atteintLeSeuil,
  contraste,
  cranFlottant,
  fabriquerCran,
  luminanceLineaire,
  rapportDeLuminances,
  type Mode,
} from '../src/index';

const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const COURBES: Record<Mode, number[]> = {
  light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
  dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
};
const PARTS = [0.45, 0.95];
const MODES: Mode[] = ['light', 'dark'];

/** Un membre de paire : un cran de la rampe, ou le fond de page, le gris du cran 50. */
type Membre = number | 'fond';

/** Nom, seuil, les deux membres, et le minimum relevé par `verifier-courbes.mjs`. */
const PROMESSES: [string, number, Membre, Membre, number][] = [
  ['text sur fond de page', 4.5, 700, 'fond', 5.23],
  ['text sur surface au repos', 4.5, 700, 100, 4.99],
  ['text survolé sur surface survolée', 4.5, 800, 200, 6.32],
  ['text pressé sur surface pressée', 4.5, 900, 300, 7.28],
  ['on-solid sur solid', 4.5, 'fond', 700, 5.23],
  ['on-solid sur solid survolé', 4.5, 'fond', 800, 7.45],
  ['on-solid sur solid pressé', 4.5, 'fond', 900, 10.5],
  ['border-control sur fond de page', 3, 600, 'fond', 3.63],
  ['border-control sur surface au repos', 3, 600, 100, 3.46],
  ['border-control survolé sur surface survolée', 3, 700, 200, 4.46],
  ['border-control pressé sur surface pressée', 3, 800, 300, 5.25],
  ['focus sur fond de page', 3, 600, 'fond', 3.63],
  ['focus sur surface au repos', 3, 600, 100, 3.46],
  ['solid survolé sur fond de page', 3, 800, 'fond', 7.45],
];

/** Clarté, teinte et part d'un membre : le fond est gris, sa teinte ne compte pas. */
function membre(mode: Mode, quoi: Membre, teinte: number, part: number): [number, number, number] {
  if (quoi === 'fond') return [COURBES[mode][0], 0, 0];
  return [COURBES[mode][CRANS.indexOf(quoi)], teinte, part];
}

/** Le plus petit contraste d'une paire sur tout le balayage, pour une mesure donnée. */
function minimum(a: Membre, b: Membre, mesure: (x: [number, number, number], y: [number, number, number]) => number) {
  let plusPetit = Infinity;
  for (const mode of MODES) {
    for (const part of PARTS) {
      for (let teinte = 0; teinte < 360; teinte += 1) {
        plusPetit = Math.min(plusPetit, mesure(membre(mode, a, teinte, part), membre(mode, b, teinte, part)));
      }
    }
  }
  return plusPetit;
}

const sansArrondi = (x: [number, number, number], y: [number, number, number]) =>
  rapportDeLuminances(
    luminanceLineaire(cranFlottant(x[0], x[1], x[2], 'srgb')),
    luminanceLineaire(cranFlottant(y[0], y[1], y[2], 'srgb')),
  );

const aHuitBits = (x: [number, number, number], y: [number, number, number]) =>
  contraste(fabriquerCran(x[0], x[1], x[2], 'srgb').couleur, fabriquerCran(y[0], y[1], y[2], 'srgb').couleur);

for (const [nom, , a, b, releve] of PROMESSES) {
  test(`architecture : sans arrondi, « ${nom} » descend à ${releve} comme le relevé`, () => {
    const obtenu = minimum(a, b, sansArrondi);
    assert.ok(Math.abs(obtenu - releve) <= 0.01, `${obtenu} au lieu de ${releve}`);
  });
}

test('vecteur : à dérive nulle, les quatorze promesses tiennent après arrondi à 8 bits', () => {
  const manquees = PROMESSES
    .map(([nom, seuil, a, b]) => ({ nom, seuil, obtenu: minimum(a, b, aHuitBits) }))
    .filter(({ seuil, obtenu }) => !atteintLeSeuil(obtenu, seuil))
    .map(({ nom, seuil, obtenu }) => `${nom} : ${obtenu} pour ${seuil}`);
  assert.deepEqual(manquees, []);
});
