#!/usr/bin/env node
/**
 * Mesure le temps de calcul d'une palette de 44 crans ([MOT-13]) : médiane de
 * cent calculs, dans Node.
 *
 *   npx tsx packages/couleur/scripts/mesurer-temps.mjs
 *
 * Chaque calcul reçoit une dérive neuve, comme pendant un glisser : les teintes
 * changent, et la mémoire du plafond ne sert que pour les crans que la dérive
 * ne touche pas. La mesure « à chaud » répète la même palette. Aucun test ne
 * porte ce seuil : le chiffre entre dans le message du commit.
 */
import { performance } from 'node:perf_hooks';

import { boutsDe, fabriquerPalette, lireHexa, prereglageTailwind, rgb8VersOklch } from '../src/index.ts';

const COURBES = {
  light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
  dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
};
const PARTS = { soft: 0.45, vivid: 0.95 };
const reference = lireHexa('#1E6FD9');
const tailwind = prereglageTailwind(rgb8VersOklch(reference), boutsDe(COURBES));

function palette(derive) {
  return fabriquerPalette({
    reference,
    courbes: COURBES,
    parts: PARTS,
    derives: { soft: derive, vivid: derive },
    gamut: 'srgb',
  });
}

function mediane(durees) {
  const triees = [...durees].sort((a, b) => a - b);
  return (triees[49] + triees[50]) / 2;
}

function mesurer(deriveDuRang) {
  const durees = [];
  for (let rang = 0; rang < 100; rang += 1) {
    const derive = deriveDuRang(rang);
    const debut = performance.now();
    palette(derive);
    durees.push(performance.now() - debut);
  }
  return mediane(durees);
}

// Une première palette charge le module et compile ses fonctions.
palette(tailwind);

const froid = mesurer((rang) => ({ clair: tailwind.clair + rang * 0.37, sombre: tailwind.sombre - rang * 0.23 }));
const chaud = mesurer(() => tailwind);
console.log(`Palette de 44 crans, médiane de 100 calculs : ${froid.toFixed(3)} ms à dérive neuve, ${chaud.toFixed(3)} ms à dérive répétée.`);
