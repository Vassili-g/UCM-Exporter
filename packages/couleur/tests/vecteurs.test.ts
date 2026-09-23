/**
 * Les vecteurs de la section 6.8 de la spécification.
 *
 * Premier jeu : calculé une fois par culori 4.0.2, référence indépendante,
 * dans un script hors du dépôt. culori emploie des matrices d'Oklab plus
 * précises que celles d'Ottosson : l'écart reste sous `1e-7`.
 *
 * Second jeu : relevé par `mesurer-recette.mjs` (dossier de recherche du
 * plugin Palettes), puis recalculé par le moteur, qui rend les mêmes hexas et
 * les mêmes angles.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  boutsDe,
  contraste,
  ecrireContraste,
  ecrireHexa,
  fabriquerCran,
  fabriquerPalette,
  lireHexa,
  prereglageTailwind,
  rgb8VersOklch,
  deriveTailwind,
  type Courbes,
} from '../src/index';

const COURBES: Courbes = {
  light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
  dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
};
const PARTS = { soft: 0.45, vivid: 0.95 };
const hexa = (texte: string) => lireHexa(texte)!;

test('vecteur : #FFFFFF a une clarté 1 et une chroma sous 1e-4', () => {
  const blanc = rgb8VersOklch(hexa('#FFFFFF'));
  assert.ok(Math.abs(blanc.L - 1) < 1e-6, `L = ${blanc.L}`);
  assert.ok(blanc.C < 1e-4, `C = ${blanc.C}`);
});

test('vecteur : #000000 a une clarté 0', () => {
  assert.equal(rgb8VersOklch(hexa('#000000')).L, 0);
});

test('vecteur : #767676 sur #FFFFFF contraste à 4,54', () => {
  // culori : 4.542224959605253.
  const valeur = contraste(hexa('#767676'), hexa('#FFFFFF'));
  assert.ok(Math.abs(valeur - 4.542224959605253) < 1e-9, `${valeur}`);
  assert.equal(ecrireContraste(valeur), '4,54');
});

test('vecteur : #1E6FD9 se lit L 0,555, C 0,179, H 257,4', () => {
  // culori : L 0.5549888954267141, C 0.17940338191418362, H 257.4367507000842.
  const lu = rgb8VersOklch(hexa('#1E6FD9'));
  assert.ok(Math.abs(lu.L - 0.5549888954267141) < 1e-7, `L = ${lu.L}`);
  assert.ok(Math.abs(lu.C - 0.17940338191418362) < 1e-7, `C = ${lu.C}`);
  assert.ok(Math.abs(lu.H - 257.4367507000842) < 1e-5, `H = ${lu.H}`);
});

test('vecteur : les gris de clarté 0,975 et 0,180 sont les fonds par défaut', () => {
  // culori : #f7f7f7 et #121212.
  assert.equal(fabriquerCran(0.975, 0, 0, 'srgb').hexa, '#F7F7F7');
  assert.equal(fabriquerCran(0.18, 0, 0, 'srgb').hexa, '#121212');
});

test('vecteur : #1E6FD9 au préréglage Tailwind, dérive 12,63°, clair -7,53, sombre +5,11', () => {
  const reference = rgb8VersOklch(hexa('#1E6FD9'));
  assert.equal(deriveTailwind(reference.H).toFixed(2), '12.63');
  assert.deepEqual(prereglageTailwind(reference, boutsDe(COURBES)), { clair: -7.53, sombre: 5.11 });
});

test('vecteur : #F2A900 au préréglage Tailwind, dérive -39,63°, clair +10,69, sombre -28,94', () => {
  const reference = rgb8VersOklch(hexa('#F2A900'));
  assert.equal(deriveTailwind(reference.H).toFixed(2), '-39.63');
  assert.deepEqual(prereglageTailwind(reference, boutsDe(COURBES)), { clair: 10.69, sombre: -28.94 });
});

/** Les quatre rampes d'une référence au préréglage Tailwind, les deux profils liés. */
function paletteTailwind(texte: string) {
  const reference = hexa(texte);
  const derive = prereglageTailwind(rgb8VersOklch(reference), boutsDe(COURBES));
  return fabriquerPalette({
    reference,
    courbes: COURBES,
    parts: PARTS,
    derives: { soft: derive, vivid: derive },
    gamut: 'srgb',
  });
}

test('vecteur : #1E6FD9, vivid, clair 700 vaut #0E5DC6 et contraste à 5,76 contre #F7F7F7', () => {
  const cran = paletteTailwind('#1E6FD9').vivid.light[7];
  assert.equal(cran.hexa, '#0E5DC6');
  assert.equal(ecrireContraste(contraste(cran.couleur, hexa('#F7F7F7'))), '5,76');
});

test('vecteur : #1E6FD9, vivid, sombre 200 vaut #021F64, l’angle arrondi au centième', () => {
  const cran = paletteTailwind('#1E6FD9').vivid.dark[2];
  assert.equal(cran.hexa, '#021F64');
  assert.equal(ecrireContraste(contraste(cran.couleur, hexa('#121212'))), '1,23');
});

test('vecteur : #F2A900, vivid, sombre 700 vaut #C9851B et contraste à 6,11 contre #121212', () => {
  const cran = paletteTailwind('#F2A900').vivid.dark[7];
  assert.equal(ecrireHexa(cran.couleur), '#C9851B');
  assert.equal(ecrireContraste(contraste(cran.couleur, hexa('#121212'))), '6,11');
});

test('vecteur : les 44 crans de #1E6FD9 et de #F2A900 en vivid sont ceux du relevé', () => {
  // Relevé de mesurer-recette.mjs, angles arrondis au centième.
  const releve: Record<string, { light: string[]; dark: string[] }> = {
    '#1E6FD9': {
      light: ['#F1F8FF', '#E3F0FE', '#CAE2FD', '#A9D0FD', '#7AB5FB', '#4596FA', '#1477ED', '#0E5DC6', '#0846A3', '#043080', '#021E61'],
      dark: ['#000C35', '#01154B', '#021F64', '#032D7B', '#07409A', '#0D5AC2', '#1476EA', '#4596FA', '#7AB5FB', '#ACD2FD', '#D8EAFE'],
    },
    '#F2A900': {
      light: ['#FFF6E2', '#FEEDC6', '#FDDB95', '#FDC14D', '#E7A222', '#C9851B', '#AC6B14', '#8F520E', '#733D09', '#582905', '#401A02'],
      dark: ['#210A01', '#301201', '#421B02', '#552704', '#6C3807', '#8B500D', '#AA6914', '#C9851B', '#E7A222', '#FDC354', '#FEE5B1'],
    },
  };
  for (const [reference, attendu] of Object.entries(releve)) {
    const rampes = paletteTailwind(reference).vivid;
    assert.deepEqual(rampes.light.map((cran) => cran.hexa), attendu.light, `${reference}, clair`);
    assert.deepEqual(rampes.dark.map((cran) => cran.hexa), attendu.dark, `${reference}, sombre`);
  }
});
