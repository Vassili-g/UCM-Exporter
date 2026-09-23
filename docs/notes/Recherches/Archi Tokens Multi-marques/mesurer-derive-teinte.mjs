#!/usr/bin/env node
/**
 * Mesure la dérive de teinte le long d'une rampe, et l'erreur de trois règles
 * qui prétendent la reproduire.
 *
 *   node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-derive-teinte.mjs"
 *
 * Les rampes du Playground sont relevées par `mesurer-rampes.mjs` sur
 * `UCM-Playground/src/tokens/tokens.json`. Les rampes Tailwind sont celles de
 * `packages/tailwindcss/theme.css`, version 4, en OKLCH. Chaque rampe donne la
 * clarté et la teinte de ses crans, du plus clair au plus sombre.
 */

const RAMPES = {
  'playground warning': {
    L: [0.980, 0.954, 0.901, 0.837, 0.758, 0.705, 0.646, 0.553, 0.470, 0.408],
    H: [74, 75, 71, 66, 56, 48, 41, 38, 37, 38],
  },
  'playground danger': {
    L: [0.971, 0.936, 0.885, 0.808, 0.711, 0.637, 0.577, 0.505, 0.444, 0.396],
    H: [17, 18, 18, 20, 22, 25, 27, 28, 27, 26],
  },
  'playground success': {
    L: [0.982, 0.962, 0.925, 0.871, 0.800, 0.723, 0.627, 0.527, 0.448, 0.393],
    H: [156, 157, 156, 154, 152, 150, 149, 150, 151, 153],
  },
  'playground info': {
    L: [0.977, 0.951, 0.901, 0.828, 0.754, 0.685, 0.588, 0.500, 0.443, 0.391],
    H: [237, 237, 231, 230, 233, 237, 242, 243, 241, 241],
  },
  'tailwind yellow': {
    L: [0.987, 0.973, 0.945, 0.905, 0.852, 0.795, 0.681, 0.554, 0.476, 0.421, 0.286],
    H: [102.2, 103.2, 101.5, 98.1, 91.9, 86.0, 75.8, 66.4, 61.9, 57.7, 53.8],
  },
  'tailwind amber': {
    L: [0.987, 0.962, 0.924, 0.879, 0.828, 0.769, 0.666, 0.555, 0.473, 0.414, 0.279],
    H: [95.3, 95.6, 95.7, 91.6, 84.4, 70.1, 58.3, 49.0, 46.2, 45.9, 45.6],
  },
  'tailwind red': {
    L: [0.971, 0.936, 0.885, 0.808, 0.704, 0.637, 0.577, 0.505, 0.444, 0.396, 0.258],
    H: [17.4, 17.7, 18.3, 19.6, 22.2, 25.3, 27.3, 27.5, 26.9, 25.7, 26.0],
  },
  'tailwind blue': {
    L: [0.970, 0.932, 0.882, 0.809, 0.707, 0.623, 0.546, 0.488, 0.424, 0.379, 0.282],
    H: [254.6, 255.6, 254.1, 251.8, 254.6, 259.8, 262.9, 264.4, 265.6, 265.5, 267.9],
  },
  'tailwind green': {
    L: [0.982, 0.962, 0.925, 0.871, 0.792, 0.723, 0.627, 0.527, 0.448, 0.393, 0.266],
    H: [155.8, 157.0, 156.7, 154.4, 151.7, 149.6, 149.2, 150.1, 150.9, 152.5, 152.9],
  },
};

/** L'indice du cran 500 : le sixième cran de chaque rampe. */
const MILIEU = 5;

/** Interpolation linéaire en clarté entre deux crans d'ancrage. */
function entre(r, a, b, L) {
  const t = (L - r.L[b]) / (r.L[a] - r.L[b]);
  return r.H[b] + (r.H[a] - r.H[b]) * t;
}

/** Chaque règle reçoit la rampe et rend la teinte qu'elle prédit au cran `i`. */
const REGLES = {
  'une teinte, celle du cran 500': (r) => r.H[MILIEU],
  'deux teintes, aux deux bouts': (r, i) => entre(r, 0, r.L.length - 1, r.L[i]),
  'trois teintes, aux bouts et au cran 500': (r, i) => (
    i <= MILIEU ? entre(r, 0, MILIEU, r.L[i]) : entre(r, MILIEU, r.L.length - 1, r.L[i])
  ),
};

/** Les dix-sept rampes colorées de Tailwind : teinte du cran 50, teinte du cran 950. */
const BOUTS_TAILWIND = [
  ['rose', 12.422, 12.094], ['red', 17.38, 26.042], ['orange', 73.684, 36.259],
  ['amber', 95.277, 45.635], ['yellow', 102.212, 53.813], ['lime', 120.757, 132.109],
  ['green', 155.826, 152.934], ['emerald', 166.113, 172.552], ['teal', 180.72, 192.524],
  ['cyan', 200.873, 229.695], ['sky', 236.62, 243.157], ['blue', 254.604, 267.935],
  ['indigo', 272.314, 281.288], ['violet', 293.756, 291.089], ['purple', 308.299, 302.717],
  ['fuchsia', 320.058, 325.661], ['pink', 343.198, 3.907],
];

/** L'écart signé le plus court de `a` à `b` sur le cercle, entre -180 et 180. */
const ecartSigne = (a, b) => ((b - a + 540) % 360) - 180;

console.log('## Tailwind : dérive du bout sombre selon la teinte du bout clair\n');
console.log('  Chaque dérive est aussi prédite par interpolation entre ses deux voisines.\n');
const bouts = BOUTS_TAILWIND
  .map(([nom, clair, sombre]) => ({ nom, clair, sombre, derive: ecartSigne(clair, sombre) }))
  .sort((x, y) => x.clair - y.clair);
let sommeVoisines = 0;
let sommeConstante = 0;
bouts.forEach((r, i) => {
  const p = bouts[(i - 1 + bouts.length) % bouts.length];
  const q = bouts[(i + 1) % bouts.length];
  const t = ((r.clair - p.clair + 360) % 360) / ((q.clair - p.clair + 360) % 360);
  const predite = p.derive + (q.derive - p.derive) * t;
  sommeVoisines += Math.abs(predite - r.derive);
  sommeConstante += Math.abs(r.derive);
  const signe = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(0)}°`;
  console.log(`  ${r.nom.padEnd(8)} ${r.clair.toFixed(0).padStart(3)}° vers ${((r.sombre + 360) % 360).toFixed(0).padStart(3)}°`
    + `  dérive ${signe(r.derive).padStart(5)}  prédite ${signe(predite).padStart(5)}`);
});
console.log(`\n  Teinte constante : erreur moyenne ${(sommeConstante / bouts.length).toFixed(1)}°`);
console.log(`  Interpolation entre voisines : erreur moyenne ${(sommeVoisines / bouts.length).toFixed(1)}°\n`);

console.log('## Dérive de chaque rampe, du bout clair au bout sombre\n');
for (const [nom, r] of Object.entries(RAMPES)) {
  const derive = r.H[r.H.length - 1] - r.H[0];
  console.log(`  ${nom.padEnd(20)} ${derive >= 0 ? '+' : ''}${derive.toFixed(0)}°`);
}

console.log('\n## Erreur de chaque règle, en degrés de teinte\n');
for (const [regle, predire] of Object.entries(REGLES)) {
  let somme = 0;
  let n = 0;
  let pire = { e: 0, ou: '' };
  for (const [nom, r] of Object.entries(RAMPES)) {
    r.H.forEach((h, i) => {
      const e = Math.abs(predire(r, i) - h);
      somme += e;
      n += 1;
      if (e > pire.e) pire = { e, ou: nom };
    });
  }
  console.log(`  ${regle.padEnd(42)} moyenne ${(somme / n).toFixed(1)}°, pire ${pire.e.toFixed(1)}° (${pire.ou})`);
}
