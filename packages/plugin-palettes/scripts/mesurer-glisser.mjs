#!/usr/bin/env node
/**
 * Mesure ce qu'un mouvement de poignée coûte ([DER-13]) : l'analyse d'une
 * palette dans Node, puis, dans Chromium, un glisser réel sur la galerie
 * construite, la durée du `pointermove` : analyse, aperçu et graphe redessinés
 * avant que le navigateur peigne l'image. Médianes de cinquante
 * mouvements. Aucun test ne porte ce seuil : le chiffre entre dans le message
 * du commit.
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   npx tsx packages/plugin-palettes/scripts/mesurer-glisser.mjs
 */
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { recetteParDefaut } from 'ucm-couleur';
import { analyserPalette } from '../src/analyse.ts';
import { nouvellePalette, reglerBout } from '../src/edition.ts';

const mediane = (durees) => [...durees].sort((a, b) => a - b)[Math.floor(durees.length / 2)];

const recette = recetteParDefaut();
const palette = nouvellePalette(recette, 'p-0000000a', '#1E6FD9');
const avec = { ...recette, palettes: [palette] };
const durees = [];
for (let rang = 0; rang < 50; rang += 1) {
  const suivante = reglerBout(avec, palette, 'vivid', 'clair', rang - 25);
  const debut = performance.now();
  analyserPalette({ ...avec, palettes: [suivante] }, suivante, 'SRGB');
  durees.push(performance.now() - debut);
}
console.log(`Analyse d'une palette, médiane de 50 : ${mediane(durees).toFixed(2)} ms.`);

const page = fileURLToPath(new URL('../dist/galerie/clair/derive-liee-tailwind.html', import.meta.url));
const navigateur = await chromium.launch();
const onglet = await navigateur.newPage({ viewport: { width: 600, height: 720 } });
await onglet.goto(`file:///${page.replace(/\\/g, '/')}`);
await onglet.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
const { mesures: images, valeur } = await onglet.evaluate(async () => {
  const svg = document.querySelector('.derive-graphe');
  const rond = document.querySelector('.derive-poignee[data-bout="clair"] circle').getBoundingClientRect();
  const x = rond.left + rond.width / 2;
  const depart = rond.top + rond.height / 2;
  const options = (y) => ({ bubbles: true, pointerId: 1, clientX: x, clientY: y, isPrimary: true });
  document.querySelector('.derive-poignee[data-bout="clair"]').dispatchEvent(new PointerEvent('pointerdown', options(depart)));
  const mesures = [];
  for (let rang = 0; rang < 50; rang += 1) {
    const debut = performance.now();
    svg.dispatchEvent(new PointerEvent('pointermove', options(depart - (rang % 20) * 2)));
    mesures.push(performance.now() - debut);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  const valeur = document.querySelector('.derive-poignee[data-bout="clair"]').getAttribute('aria-valuenow');
  svg.dispatchEvent(new PointerEvent('pointerup', options(depart)));
  return { mesures, valeur };
});
console.log(`Glisser dans Chromium, travail d'un pointermove, médiane de 50 : ${mediane(images).toFixed(1)} ms ; pire : ${Math.max(...images).toFixed(1)} ms ; poignée claire à ${valeur}° au dernier mouvement.`);
await navigateur.close();
