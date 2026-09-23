#!/usr/bin/env node
/**
 * Mesure le temps de la garantie des courbes ([ENT-10]) : médiane de vingt
 * calculs, dans Node, chacun sur une courbe claire neuve, comme après la
 * validation d'une clarté dans la configuration.
 *
 *   npx tsx packages/couleur/scripts/mesurer-garantie.mjs
 *
 * Aucun test ne porte ce seuil : le chiffre entre dans le message du commit.
 */
import { performance } from 'node:perf_hooks';

import { garantieDesCourbes, recetteParDefaut } from '../src/index.ts';

const recette = recetteParDefaut();
const durees = [];
for (let rang = 0; rang < 20; rang += 1) {
  const light = [...recette.courbes.light];
  light[7] = 0.5 - rang * 0.001;
  const debut = performance.now();
  garantieDesCourbes({ ...recette, courbes: { ...recette.courbes, light } });
  durees.push(performance.now() - debut);
}
const triees = [...durees].sort((a, b) => a - b);
console.log(`Garantie des courbes, médiane de 20 calculs : ${((triees[9] + triees[10]) / 2).toFixed(1)} ms ; premier calcul : ${durees[0].toFixed(1)} ms.`);
