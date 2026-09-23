#!/usr/bin/env node
/**
 * Produit les nombres cités par ARCHITECTURE-FINALE-MULTIMARQUES.md.
 *
 * Aucune entrée : le script porte les deux courbes de clarté proposées et
 * mesure ce qu'elles donnent. Chaque promesse est éprouvée sur les 360 teintes
 * entières, les deux profils et les deux modes, et le rapport nomme la teinte
 * du pire cas. Pour mesurer les rampes d'un fichier réel, employer
 * `mesurer-rampes.mjs`.
 *
 *   node "docs/notes/Recherches/Archi Tokens Multi-marques/verifier-courbes.mjs"
 *   node ".../verifier-courbes.mjs" --section=roles
 *
 * Le script sort en échec dès qu'une promesse de la section 5 du document est
 * manquée.
 */

/** Les deux courbes de clarté. Le cran 50 est le fond de page dans les deux modes. */
export const COURBES = {
  light: [0.975, 0.950, 0.905, 0.845, 0.760, 0.670, 0.585, 0.500, 0.420, 0.340, 0.270],
  dark: [0.180, 0.225, 0.275, 0.330, 0.400, 0.490, 0.580, 0.670, 0.760, 0.850, 0.930],
};
export const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Les parts de chroma des deux profils, en fraction du plafond du gamut. */
const PROFILS = { doux: 0.45, vibrant: 0.95 };
/** Toutes les teintes entières du cercle. Un pire cas se cache entre deux teintes d'un échantillon. */
const TEINTES = Array.from({ length: 360 }, (_, i) => i);
/**
 * Seuil de distinction entre deux profils, en chroma.
 *
 * Paramètre de conception, pas un seuil perceptuel établi. Il se calibre sur
 * des palettes réelles, et le document le déclare comme tel.
 */
const SEUIL_VISIBLE = 0.02;

/** OKLCH vers sRGB linéaire, sans bornage : une composante hors de [0, 1] sort du gamut. */
function srgbLineaire(L, C, teinte) {
  const h = (teinte * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const dansLeGamut = (rgb) => rgb.every((c) => c >= -1e-6 && c <= 1 + 1e-6);

const plafonds = new Map();

/** La chroma maximale que sRGB porte à cette clarté et cette teinte, par dichotomie. */
export function chromaMaximale(L, teinte) {
  const cle = `${L}|${teinte}`;
  if (plafonds.has(cle)) return plafonds.get(cle);
  let bas = 0;
  let haut = 0.45;
  for (let i = 0; i < 60; i += 1) {
    const milieu = (bas + haut) / 2;
    if (dansLeGamut(srgbLineaire(L, milieu, teinte))) bas = milieu;
    else haut = milieu;
  }
  plafonds.set(cle, bas);
  return bas;
}

/** La luminance relative que WCAG mesure. */
function luminance(L, C, teinte) {
  const rgb = srgbLineaire(L, C, teinte).map((c) => Math.min(1, Math.max(0, c)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Le rapport de contraste WCAG entre deux couleurs OKLCH. */
export function contraste(a, b) {
  const ya = luminance(a.L, a.C, a.H);
  const yb = luminance(b.L, b.C, b.H);
  const [haut, bas] = ya > yb ? [ya, yb] : [yb, ya];
  return (haut + 0.05) / (bas + 0.05);
}

const rang = (cran) => CRANS.indexOf(cran);

/** La couleur d'un cran : sa clarté vient de la courbe du mode, sa chroma du profil. */
export function couleur(mode, cran, teinte, part) {
  const L = COURBES[mode][rang(cran)];
  return { L, C: part * chromaMaximale(L, teinte), H: teinte };
}

/**
 * Le cran 50 du neutre, fond de page. Le neutre est une palette fixe, commune
 * aux marques et sans teinte : sa chroma est nulle, et la teinte passée est ignorée.
 */
const fondDePage = (mode) => couleur(mode, 50, 0, 0);

const colonne = (x, n = 7) => String(x).padStart(n);
const titre = (t) => console.log(`\n## ${t}\n`);

/** Le pire cas d'une paire, sur toutes les teintes, les deux profils et les deux modes. */
function pireCas(paire) {
  let min = Infinity;
  let max = 0;
  let ou = null;
  for (const mode of Object.keys(COURBES)) {
    for (const [profil, part] of Object.entries(PROFILS)) {
      for (const teinte of TEINTES) {
        const k = contraste(...paire(mode, teinte, part));
        if (k < min) {
          min = k;
          ou = `${mode}, ${profil}, teinte ${teinte}°`;
        }
        if (k > max) max = k;
      }
    }
  }
  return { min, max, ou };
}

function sectionCrans() {
  titre('1. Ce qu\'un cran garantit contre le fond de page');
  console.log('Contraste contre le cran 50 des neutres, sur 360 teintes et les deux profils.\n');
  console.log('  cran     min     max   tient 3:1   tient 4,5:1');
  for (const cran of CRANS) {
    const { min, max } = pireCas((m, t, q) => [couleur(m, cran, t, q), fondDePage(m, t)]);
    console.log(`  ${colonne(cran, 4)} ${colonne(min.toFixed(2))} ${colonne(max.toFixed(2))}`
      + `${colonne(min >= 3 ? 'oui' : 'non', 12)}${colonne(min >= 4.5 ? 'oui' : 'non', 14)}`);
  }
}

function sectionChroma() {
  titre('2. La chroma déplace-t-elle le contraste ?');
  console.log('À teinte fixe, contraste contre le fond de page, de chroma nulle à chroma maximale.');
  console.log('La colonne retient la teinte où ce balayage ouvre le plus grand écart.\n');
  console.log('  cran   écart dû à la chroma   teinte');
  for (const cran of CRANS) {
    let ecart = 0;
    let ou = null;
    for (const teinte of TEINTES) {
      const valeurs = [0, 0.25, 0.45, 0.7, 0.95, 1].map((part) => (
        contraste(couleur('light', cran, teinte, part), fondDePage('light', teinte))
      ));
      const amplitude = Math.max(...valeurs) - Math.min(...valeurs);
      if (amplitude > ecart) {
        ecart = amplitude;
        ou = `${teinte}°`;
      }
    }
    console.log(`  ${colonne(cran, 4)} ${colonne(ecart.toFixed(2), 20)} ${colonne(ou, 8)}`);
  }
}

function sectionProfils() {
  titre('3. Où le profil doux et le profil vibrant se distinguent-ils ?');
  console.log(`Écart de chroma entre les deux profils. Une étoile marque un écart supérieur à ${SEUIL_VISIBLE}.\n`);
  const repere = [21, 45, 80, 150, 200, 237, 281, 330];
  console.log('  teinte' + CRANS.map((c) => colonne(c, 8)).join(''));
  for (const teinte of repere) {
    const ligne = CRANS.map((cran) => {
      const L = COURBES.light[rang(cran)];
      const ecart = (PROFILS.vibrant - PROFILS.doux) * chromaMaximale(L, teinte);
      return colonne((ecart >= SEUIL_VISIBLE ? '*' : ' ') + ecart.toFixed(3), 8);
    });
    console.log(`  ${String(`${teinte}°`).padEnd(6)}${ligne.join('')}`);
  }
  console.log('\nSur les 360 teintes, le plus petit écart de chaque cran :\n');
  console.log('  cran   écart minimal   sous le seuil');
  for (const cran of CRANS) {
    let min = Infinity;
    for (const mode of Object.keys(COURBES)) {
      for (const teinte of TEINTES) {
        const L = COURBES[mode][rang(cran)];
        min = Math.min(min, (PROFILS.vibrant - PROFILS.doux) * chromaMaximale(L, teinte));
      }
    }
    console.log(`  ${colonne(cran, 4)} ${colonne(min.toFixed(3), 15)} ${colonne(min < SEUIL_VISIBLE ? 'oui' : 'non', 15)}`);
  }
}

function sectionModes() {
  titre('4. Le sombre rend-il les mêmes rapports que le clair ?');
  console.log('Paires courantes, en gris. La colonne « miroir » lit la courbe claire à l\'envers.\n');
  const miroir = [...COURBES.light].reverse();
  const paires = [
    ['texte fort sur fond de page', 900, 50],
    ['texte courant sur fond de page', 800, 50],
    ['texte discret sur fond de page', 700, 50],
    ['bordure de contrôle sur fond de page', 600, 50],
    ['séparateur sur fond de page', 300, 50],
  ];
  const gris = (courbe, cran) => ({ L: courbe[rang(cran)], C: 0, H: 0 });
  console.log(`  ${'paire'.padEnd(38)}${colonne('clair')}${colonne('sombre')}${colonne('miroir')}${colonne('écart')}${colonne('sur-c.')}`);
  for (const [nom, haut, bas] of paires) {
    const k = (courbe) => contraste(gris(courbe, haut), gris(courbe, bas));
    const clair = k(COURBES.light);
    console.log(`  ${nom.padEnd(38)}${colonne(clair.toFixed(2))}${colonne(k(COURBES.dark).toFixed(2))}`
      + `${colonne(k(miroir).toFixed(2))}${colonne(`${((k(COURBES.dark) / clair - 1) * 100).toFixed(1)}%`)}`
      + `${colonne(`${(k(miroir) / clair).toFixed(2)}×`)}`);
  }
  console.log('\nSur les 55 paires de crans, et pas seulement les cinq ci-dessus :\n');
  let ecartMax = 0;
  let facteurMin = Infinity;
  let facteurMax = 0;
  for (let i = 0; i < CRANS.length; i += 1) {
    for (let j = i + 1; j < CRANS.length; j += 1) {
      const k = (courbe) => contraste(gris(courbe, CRANS[j]), gris(courbe, CRANS[i]));
      const clair = k(COURBES.light);
      ecartMax = Math.max(ecartMax, Math.abs(k(COURBES.dark) / clair - 1));
      facteurMin = Math.min(facteurMin, k(miroir) / clair);
      facteurMax = Math.max(facteurMax, k(miroir) / clair);
    }
  }
  console.log(`  Courbe dédiée : écart maximal au clair ${(ecartMax * 100).toFixed(1)} %.`);
  console.log(`  Appariement : sur-contraste de ${facteurMin.toFixed(2)} à ${facteurMax.toFixed(2)} fois.`);
}

/**
 * Les promesses du câblage par défaut, telles que la section 5 du document les écrit.
 *
 * L'anneau de focus se mesure contre le fond de page et contre une surface au
 * repos, parce que le document impose un décalage qui laisse voir ce fond entre
 * l'anneau et le contrôle. Sans ce décalage, l'anneau au cran 600 rendrait
 * 1,40:1 contre un fond plein au cran 700, ce que la dernière section mesure.
 */
const PROMESSES = [
  ['text sur fond de page', 4.5, (m, t, q) => [couleur(m, 700, t, q), fondDePage(m, t)]],
  ['text sur surface au repos', 4.5, (m, t, q) => [couleur(m, 700, t, q), couleur(m, 100, t, q)]],
  ['text survolé sur surface survolée', 4.5, (m, t, q) => [couleur(m, 800, t, q), couleur(m, 200, t, q)]],
  ['text pressé sur surface pressée', 4.5, (m, t, q) => [couleur(m, 900, t, q), couleur(m, 300, t, q)]],
  ['on-solid sur solid', 4.5, (m, t, q) => [fondDePage(m, t), couleur(m, 700, t, q)]],
  ['on-solid sur solid survolé', 4.5, (m, t, q) => [fondDePage(m, t), couleur(m, 800, t, q)]],
  ['on-solid sur solid pressé', 4.5, (m, t, q) => [fondDePage(m, t), couleur(m, 900, t, q)]],
  ['border-control sur fond de page', 3, (m, t, q) => [couleur(m, 600, t, q), fondDePage(m, t)]],
  ['border-control sur surface au repos', 3, (m, t, q) => [couleur(m, 600, t, q), couleur(m, 100, t, q)]],
  ['border-control survolé sur surface survolée', 3, (m, t, q) => [couleur(m, 700, t, q), couleur(m, 200, t, q)]],
  ['border-control pressé sur surface pressée', 3, (m, t, q) => [couleur(m, 800, t, q), couleur(m, 300, t, q)]],
  ['focus sur fond de page', 3, (m, t, q) => [couleur(m, 600, t, q), fondDePage(m, t)]],
  ['focus sur surface au repos', 3, (m, t, q) => [couleur(m, 600, t, q), couleur(m, 100, t, q)]],
  ['solid survolé sur fond de page', 3, (m, t, q) => [couleur(m, 800, t, q), fondDePage(m, t)]],
];

function sectionRoles() {
  titre('5. Le câblage par défaut des rôles tient-il ses promesses ?');
  console.log('Sur 360 teintes, les deux profils et les deux modes.\n');
  console.log(`  ${'promesse'.padEnd(44)}${colonne('seuil')}${colonne('min')}${colonne('max')}  pire cas`);
  let echecs = 0;
  for (const [nom, seuil, paire] of PROMESSES) {
    const { min, max, ou } = pireCas(paire);
    if (min < seuil) echecs += 1;
    console.log(`  ${nom.padEnd(44)}${colonne(`${seuil}:1`)}${colonne(min.toFixed(2))}`
      + `${colonne(max.toFixed(2))}  ${min >= seuil ? `tenue, ${ou}` : `REFUSÉE, ${ou}`}`);
  }
  console.log(`\n  ${echecs} promesse(s) refusée(s).`);
  return echecs;
}

function sectionAnneau() {
  titre('6. Pourquoi l\'anneau de focus demande un décalage');
  console.log('Contraste d\'un anneau posé au contact du contrôle qu\'il entoure.\n');
  console.log(`  ${'paire'.padEnd(44)}${colonne('seuil')}${colonne('min')}  verdict`);
  const contact = [
    ['anneau 600 contre un fond plein 700', 3, (m, t, q) => [couleur(m, 600, t, q), couleur(m, 700, t, q)]],
    ['anneau 900 contre un fond plein 700', 3, (m, t, q) => [couleur(m, 900, t, q), couleur(m, 700, t, q)]],
    ['anneau 950 contre un fond plein 700', 3, (m, t, q) => [couleur(m, 950, t, q), couleur(m, 700, t, q)]],
    ['décalage au fond de page contre un fond plein 700', 3, (m, t, q) => [fondDePage(m, t), couleur(m, 700, t, q)]],
  ];
  for (const [nom, seuil, paire] of contact) {
    const { min } = pireCas(paire);
    console.log(`  ${nom.padEnd(44)}${colonne(`${seuil}:1`)}${colonne(min.toFixed(2))}  ${min >= seuil ? 'tenue' : 'REFUSÉE'}`);
  }
  console.log('\n  Aucun cran de la rampe ne tient 3:1 contre le cran 700 de la même rampe.');
  console.log('  Le décalage qui laisse voir le fond de page est ce qui rend l\'anneau visible.');
}

function sectionEtats() {
  titre('7. Un cran d\'écart se voit-il ?');
  console.log('Écart de clarté entre un cran et le suivant, dans chaque mode.\n');
  console.log('  mode  ' + CRANS.slice(0, -1).map((c, i) => colonne(`${c}→${CRANS[i + 1]}`, 9)).join(''));
  for (const [mode, courbe] of Object.entries(COURBES)) {
    const ecarts = courbe.slice(0, -1).map((L, i) => Math.abs(courbe[i + 1] - L));
    console.log(`  ${mode.padEnd(6)}${ecarts.map((e) => colonne(e.toFixed(3), 9)).join('')}`);
  }
}

function sectionAncre() {
  titre('8. Une couleur de marque trop claire, et ce que les contrôles en disent');
  const L = 0.85;
  const teinte = 95;
  const C = chromaMaximale(L, teinte);
  const ancre = { L, C, H: teinte };
  const blanc = { L: 1, C: 0, H: 0 };
  const noir = { L: 0, C: 0, H: 0 };
  const fond = fondDePage('light', teinte);
  let proche = CRANS[0];
  for (const cran of CRANS) {
    const ecart = Math.abs(COURBES.light[rang(cran)] - L);
    if (ecart < Math.abs(COURBES.light[rang(proche)] - L)) proche = cran;
  }
  console.log(`Ancre : clarté ${L}, teinte ${teinte}°, chroma ${C.toFixed(3)} au plafond du gamut.\n`);
  const lignes = [
    ['Cran le plus proche par la clarté', String(proche), null],
    ['Porter du texte blanc pur', `${contraste(ancre, blanc).toFixed(2)}:1`, 4.5],
    ['Porter du texte noir pur', `${contraste(ancre, noir).toFixed(2)}:1`, 4.5],
    ['Servir de texte sur le fond de page', `${contraste(ancre, fond).toFixed(2)}:1`, 4.5],
    ['Le cran 700 de sa rampe, comme texte sur le fond de page',
      `${contraste(couleur('light', 700, teinte, 0.95), fond).toFixed(2)}:1`, 4.5],
  ];
  for (const [nom, valeur, seuil] of lignes) {
    const tenu = seuil === null ? '' : (parseFloat(valeur) >= seuil ? '  accepté' : '  refusé');
    console.log(`  ${nom.padEnd(56)}${colonne(valeur, 10)}${tenu}`);
  }
}

const SECTIONS = {
  crans: sectionCrans,
  chroma: sectionChroma,
  profils: sectionProfils,
  modes: sectionModes,
  roles: sectionRoles,
  anneau: sectionAnneau,
  etats: sectionEtats,
  ancre: sectionAncre,
};

const demande = process.argv.find((a) => a.startsWith('--section='))?.slice('--section='.length);
if (demande && !SECTIONS[demande]) {
  console.error(`Section inconnue. Sections disponibles : ${Object.keys(SECTIONS).join(', ')}.`);
  process.exit(2);
}
const aJouer = demande ? [SECTIONS[demande]] : Object.values(SECTIONS);
let echecs = 0;
for (const section of aJouer) echecs += section() ?? 0;
process.exit(echecs > 0 ? 1 : 0);
