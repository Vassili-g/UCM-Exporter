#!/usr/bin/env node
/**
 * Produit les nombres cités par REVUE-CRITIQUE-PLUGIN-PALETTES.md et par les
 * exemples de RECHERCHE-PLUGIN-PALETTES.md.
 *
 *   node "docs/notes/Recherches/Plugin Palettes/mesurer-recette.mjs"
 *
 * Trois relevés : les promesses de rôles sur les dix-sept rampes Tailwind,
 * avant et après arrondi à 8 bits ; la lecture OKLCH de cinq couleurs de
 * référence ; le préréglage Tailwind et les crans produits pour deux couleurs
 * de référence. Les formules sont celles de la section 6 de la spécification.
 * Ce script est un relevé, pas le moteur : le lot 1 recalcule ces nombres avec
 * le moteur avant de les figer.
 *
 * Un contraste s'affiche tronqué, comme sur la planche ([MOT-22]) ; un angle du
 * préréglage est arrondi au centième avant de fabriquer un cran, comme la
 * recette le range.
 */

const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const COURBES = {
  light: [0.975, 0.950, 0.905, 0.845, 0.760, 0.670, 0.585, 0.500, 0.420, 0.340, 0.270],
  dark: [0.180, 0.225, 0.275, 0.330, 0.400, 0.490, 0.580, 0.670, 0.760, 0.850, 0.930],
};
const PROFILS = { soft: 0.45, vivid: 0.95 };
const LC = COURBES.light[0];
const LS = COURBES.light[COURBES.light.length - 1];

/** Les dix-sept rampes colorées de Tailwind : teinte du cran 50, teinte du cran 950. */
const DERIVES = [
  ['rose', 12.422, 12.094], ['red', 17.38, 26.042], ['orange', 73.684, 36.259],
  ['amber', 95.277, 45.635], ['yellow', 102.212, 53.813], ['lime', 120.757, 132.109],
  ['green', 155.826, 152.934], ['emerald', 166.113, 172.552], ['teal', 180.72, 192.524],
  ['cyan', 200.873, 229.695], ['sky', 236.62, 243.157], ['blue', 254.604, 267.935],
  ['indigo', 272.314, 281.288], ['violet', 293.756, 291.089], ['purple', 308.299, 302.717],
  ['fuchsia', 320.058, 325.661], ['pink', 343.198, 3.907],
];

const borner = (x) => Math.min(1, Math.max(0, x));
const ecart = (a, b) => ((b - a + 540) % 360) - 180;
const normaliser = (h) => ((h % 360) + 360) % 360;

function lineaire(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const dansLeGamut = (v) => v.every((c) => c >= -1e-6 && c <= 1 + 1e-6);

function plafond(L, h) {
  let bas = 0;
  let haut = 0.5;
  for (let i = 0; i < 50; i += 1) {
    const milieu = (bas + haut) / 2;
    if (dansLeGamut(lineaire(L, milieu, h))) bas = milieu;
    else haut = milieu;
  }
  return bas;
}

const encoder = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const decoder = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const rgb8 = (L, C, h) => lineaire(L, C, h).map((c) => Math.round(255 * borner(encoder(borner(c)))));
const hexa = (v) => `#${v.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const lireHexa = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Luminance relative WCAG, sur les composantes livrées. */
const luminance = (v) => {
  const [r, g, b] = v.map((x) => decoder(x / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Luminance sans arrondi, pour comparer au relevé en virgule flottante. */
const luminanceFlottante = (L, C, h) => {
  const [r, g, b] = lineaire(L, C, h).map(borner);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (ya, yb) => (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);

/**
 * Deux décimales, tronquées sur l'écriture décimale à dix chiffres.
 * `Math.floor(x * 100) / 100` rendrait 4.34 pour 4.35, dont le produit vaut
 * 434.99999999999994.
 */
function tronquer(x) {
  const [entier, decimales] = x.toFixed(10).split('.');
  return `${entier}.${decimales.slice(0, 2)}`;
}

/** Arrondi au centième, symétrique en signe : -7.525 et 7.525 ont la même valeur absolue arrondie. */
const auCentieme = (x) => Math.sign(x) * (Math.round(Math.abs(x) * 100) / 100);

function oklch(v) {
  const [r, g, b] = v.map((x) => decoder(x / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(a, bb), h: normaliser((Math.atan2(bb, a) * 180) / Math.PI) };
}

/** Teinte d'une clarté sur une rampe Tailwind : interpolation par le plus court chemin, bornée aux deux bouts. */
const teinte = (hc, hs, L) => normaliser(hc + ecart(hc, hs) * borner((LC - L) / (LC - LS)));

/** Dérive totale du préréglage, section 6.5 : interpolation entre les deux rampes voisines sur le cercle. */
function deriveProposee(h) {
  const triees = [...DERIVES].sort((x, y) => x[1] - y[1]);
  let i = triees.findIndex((r) => r[1] > h);
  if (i < 0) i = 0;
  const apres = triees[i];
  const avant = triees[(i - 1 + triees.length) % triees.length];
  const t = ((h - avant[1] + 360) % 360) / ((apres[1] - avant[1] + 360) % 360);
  const da = ecart(avant[1], avant[2]);
  const dp = ecart(apres[1], apres[2]);
  return da + (dp - da) * t;
}

console.log('## Promesses sur des rampes à deux teintes, avant et après arrondi\n');
const rang = (c) => CRANS.indexOf(c);
const PAIRES = [
  ['texte 700 sur fond de page', 4.5, 700, 'fond'],
  ['texte 700 sur surface 100', 4.5, 700, 100],
  ['texte 800 sur surface 200', 4.5, 800, 200],
  ['on-solid sur solid 700', 4.5, 'fond', 700],
  ['bordure 600 sur fond de page', 3, 600, 'fond'],
  ['bordure 600 sur surface 100', 3, 600, 100],
];
for (const [nom, seuil, a, b] of PAIRES) {
  const ligne = [];
  let ecartArrondi = 0;
  for (const part of Object.values(PROFILS)) {
    let minimum = Infinity;
    for (const mode of Object.keys(COURBES)) {
      for (const [, hc, hs] of DERIVES) {
        const cran = (c) => {
          const L = COURBES[mode][rang(c === 'fond' ? 50 : c)];
          if (c === 'fond') return { L, C: 0, h: 0 };
          const h = teinte(hc, hs, L);
          return { L, C: part * plafond(L, h), h };
        };
        const x = cran(a);
        const y = cran(b);
        const livre = contraste(luminance(rgb8(x.L, x.C, x.h)), luminance(rgb8(y.L, y.C, y.h)));
        const flottant = contraste(luminanceFlottante(x.L, x.C, x.h), luminanceFlottante(y.L, y.C, y.h));
        minimum = Math.min(minimum, livre);
        ecartArrondi = Math.max(ecartArrondi, Math.abs(livre - flottant));
      }
    }
    ligne.push(tronquer(minimum));
  }
  console.log(`  ${nom.padEnd(30)} seuil ${seuil}  soft ${ligne[0]}  vivid ${ligne[1]}  arrondi ${ecartArrondi.toFixed(2)}`);
}

console.log('\n## Cinq couleurs de référence\n');
for (const h of ['#1E6FD9', '#5B6B7A', '#FFD400', '#0B1F4B', '#E4007C']) {
  const o = oklch(lireHexa(h));
  let proche = CRANS[0];
  for (const c of CRANS) {
    if (Math.abs(COURBES.light[rang(c)] - o.L) < Math.abs(COURBES.light[rang(proche)] - o.L)) proche = c;
  }
  const part = borner(o.C / plafond(o.L, o.h));
  console.log(`  ${h}  L ${o.L.toFixed(3)}  C ${o.C.toFixed(3)}  H ${o.h.toFixed(1)}  part ${part.toFixed(2)}  cran ${proche}`);
}

/**
 * Teinte pivotée, section 6.4 : la référence fixe la teinte à sa clarté, et
 * chaque bout reçoit sa propre dérive.
 */
function teintePivotee(La, Ha, dClair, dSombre, L) {
  if (L >= La) {
    const u = LC > La ? borner((L - La) / (LC - La)) : 0;
    return normaliser(Ha + dClair * u);
  }
  const v = La > LS ? borner((La - L) / (La - LS)) : 1;
  return normaliser(Ha + dSombre * v);
}

console.log('\n## Préréglage Tailwind et crans produits\n');
for (const reference of ['#1E6FD9', '#F2A900']) {
  const o = oklch(lireHexa(reference));
  const d = deriveProposee(o.h);
  const ta = borner((LC - o.L) / (LC - LS));
  const dClair = auCentieme(-d * ta);
  const dSombre = auCentieme(d * (1 - ta));
  console.log(`  ${reference}  dérive totale ${d.toFixed(2)}  dClair ${dClair.toFixed(2)}  dSombre ${dSombre.toFixed(2)}`);
  for (const mode of Object.keys(COURBES)) {
    const fond = rgb8(COURBES[mode][0], 0, 0);
    const crans = COURBES[mode].map((L, i) => {
      const h = teintePivotee(o.L, o.h, dClair, dSombre, L);
      const v = rgb8(L, PROFILS.vivid * plafond(L, h), h);
      return `${CRANS[i]} ${hexa(v)} ${tronquer(contraste(luminance(v), luminance(fond)))}`;
    });
    console.log(`    vivid, ${mode}, fond ${hexa(fond)}`);
    console.log(`      ${crans.join('\n      ')}`);
  }
}
