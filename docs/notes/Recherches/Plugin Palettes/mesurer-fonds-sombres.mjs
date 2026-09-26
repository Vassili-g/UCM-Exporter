#!/usr/bin/env node
/**
 * Mesure Y7.1 du cinquième plan : la chroma des nuances 50 à 300 du thème
 * Dark, par profil, sur les 360 teintes, face aux pas 1 à 5 des échelles
 * sombres de Radix Colors et aux tons sombres de Material 3.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/mesurer-fonds-sombres.mjs"
 *
 * Radix (@radix-ui/colors 3.0.0) et Material (@material/material-color-utilities
 * 0.3.0) se téléchargent depuis jsDelivr dans un dossier temporaire : aucun des
 * deux n'est une dépendance du dépôt.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { lireHexa, plafond, recetteParDefaut, rgb8VersOklch } from '../../../../packages/couleur/src/index.ts';

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'fonds-sombres-'));
async function telecharger(url, nom) {
  const fichier = path.join(dossier, nom);
  fs.writeFileSync(fichier, await (await fetch(url)).text());
  return fichier;
}
const radix = createRequire(import.meta.url)(await telecharger('https://cdn.jsdelivr.net/npm/@radix-ui/colors@3.0.0/index.js', 'radix.cjs'));
const mcu = await import(pathToFileURL(await telecharger('https://cdn.jsdelivr.net/npm/@material/material-color-utilities@0.3.0/+esm', 'mcu.mjs')).href);

const recette = recetteParDefaut();
const ecrire = (x, n = 3) => x.toFixed(n).replace('.', ',');
const stats = (valeurs) => {
  const triees = [...valeurs].sort((a, b) => a - b);
  return { min: triees[0], mediane: triees[Math.floor(triees.length / 2)], max: triees[triees.length - 1] };
};

process.stdout.write('Moteur, thème Dark, chroma absolue sur les 360 teintes (médiane / maximum)\n');
for (let rang = 0; rang < 5; rang += 1) {
  const L = recette.courbes.dark[rang];
  const plafonds = stats(Array.from({ length: 360 }, (_, H) => plafond(L, H)));
  const parProfil = ['soft', 'vivid'].map((profil) => {
    const part = recette.profils[profil].part;
    return `${profil} ${ecrire(part * plafonds.mediane)} / ${ecrire(part * plafonds.max)}`;
  });
  process.stdout.write(`  ${recette.crans[rang]} (L ${ecrire(L)}) : ${parProfil.join(' · ')}\n`);
}

const GRIS = /gray|mauve|slate|sage|olive|sand/;
const echelles = Object.keys(radix).filter((nom) => /Dark$/.test(nom) && !GRIS.test(nom));
process.stdout.write(`\nRadix, ${echelles.length} échelles sombres colorées (L min–max · C médiane / max · part médiane)\n`);
for (let pas = 0; pas < 5; pas += 1) {
  const lus = echelles.map((nom) => {
    const couleur = rgb8VersOklch(lireHexa(Object.values(radix[nom])[pas]));
    return { ...couleur, part: couleur.C / plafond(couleur.L, couleur.H) };
  });
  const [L, C, part] = [stats(lus.map((x) => x.L)), stats(lus.map((x) => x.C)), stats(lus.map((x) => x.part))];
  process.stdout.write(`  pas ${pas + 1} : L ${ecrire(L.min, 2)}–${ecrire(L.max, 2)} · C ${ecrire(C.mediane)} / ${ecrire(C.max)} · part ${ecrire(part.mediane, 2)}\n`);
}

process.stdout.write('\nMaterial 3, schéma sombre (L · C)\n');
const ROLES = ['surface', 'surfaceContainer', 'surfaceContainerHigh', 'primaryContainer', 'secondaryContainer'];
for (const hexa of ['#1E6FD9', '#16A34A', '#DC2626', '#A0B599']) {
  for (const [nom, Schema] of [['TonalSpot', mcu.SchemeTonalSpot], ['Vibrant', mcu.SchemeVibrant]]) {
    const schema = new Schema(mcu.Hct.fromInt(mcu.argbFromHex(hexa)), true, 0);
    const roles = ROLES.map((role) => {
      const couleur = rgb8VersOklch(lireHexa(mcu.hexFromArgb(mcu.MaterialDynamicColors[role].getArgb(schema))));
      return `${role} ${ecrire(couleur.L, 2)} · ${ecrire(couleur.C)}`;
    });
    process.stdout.write(`  ${hexa} ${nom} : ${roles.join(' | ')}\n`);
  }
}
fs.rmSync(dossier, { recursive: true, force: true });
