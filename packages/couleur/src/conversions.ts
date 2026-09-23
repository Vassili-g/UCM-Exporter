/**
 * Les conversions entre l'hexa, sRGB, sRGB linéaire, Oklab, OKLCH et Display
 * P3 ([MOT-01] à [MOT-05], [MOT-26]).
 *
 * Ce module est le seul domicile des matrices d'Ottosson et de CSS Color 4 dans
 * le code livré. Toutes les fonctions sont pures.
 */

/** Trois canaux entiers de 0 à 255 : la couleur que le plugin produit ([MOT-09]). */
export type Rgb8 = readonly [number, number, number];

/** Trois composantes réelles, sans borne : un vecteur linéaire, Oklab ou P3. */
export type Triplet = readonly [number, number, number];

/** Une couleur en OKLCH : clarté, chroma, teinte en degrés dans `[0, 360)`. */
export interface Oklch {
  readonly L: number;
  readonly C: number;
  readonly H: number;
}

/** Sous cette chroma, la teinte ne se mesure plus et vaut 0 ([MOT-04]). */
export const CHROMA_SANS_TEINTE = 1e-4;

const MOTIF_HEXA_LONG = /^#?([0-9a-f]{6})$/i;
const MOTIF_HEXA_COURT = /^#([0-9a-f]{3})$/i;

/**
 * Lit `#RRGGBB`, `RRGGBB` ou `#RGB`, sans casse imposée ([MOT-01]). Rend `null`
 * pour toute autre forme, un alpha compris.
 */
export function lireHexa(texte: string): Rgb8 | null {
  const long = MOTIF_HEXA_LONG.exec(texte.trim());
  if (long) {
    const chiffres = long[1];
    return [0, 2, 4].map((debut) => parseInt(chiffres.slice(debut, debut + 2), 16)) as unknown as Rgb8;
  }
  const court = MOTIF_HEXA_COURT.exec(texte.trim());
  if (court) {
    return [0, 1, 2].map((rang) => parseInt(court[1][rang] + court[1][rang], 16)) as unknown as Rgb8;
  }
  return null;
}

/** Écrit une couleur en `#RRGGBB`, majuscules ([MOT-01]). */
export function ecrireHexa(couleur: Rgb8): string {
  return `#${couleur.map((canal) => canal.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Fonction de transfert sRGB, du linéaire vers l'encodé ([MOT-02]). */
export function encoder(lineaire: number): number {
  return lineaire <= 0.0031308 ? 12.92 * lineaire : 1.055 * lineaire ** (1 / 2.4) - 0.055;
}

/** Fonction de transfert sRGB, de l'encodé vers le linéaire ([MOT-02]). */
export function decoder(encode: number): number {
  return encode <= 0.04045 ? encode / 12.92 : ((encode + 0.055) / 1.055) ** 2.4;
}

/** Les trois canaux d'une couleur à 8 bits, en sRGB linéaire. */
export function rgb8VersLineaire(couleur: Rgb8): Triplet {
  return [decoder(couleur[0] / 255), decoder(couleur[1] / 255), decoder(couleur[2] / 255)];
}

const borner = (x: number): number => Math.min(1, Math.max(0, x));

/**
 * Un vecteur sRGB linéaire vers 8 bits : borné à `[0, 1]`, encodé, multiplié
 * par 255 et arrondi par `Math.round`, demi vers le haut ([MOT-10]).
 */
export function lineaireVersRgb8(lineaire: Triplet): Rgb8 {
  return [
    Math.round(255 * encoder(borner(lineaire[0]))),
    Math.round(255 * encoder(borner(lineaire[1]))),
    Math.round(255 * encoder(borner(lineaire[2]))),
  ];
}

/** sRGB linéaire vers Oklab, matrices de Björn Ottosson ([MOT-03]). */
export function lineaireVersOklab(lineaire: Triplet): Triplet {
  const [r, g, b] = lineaire;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Oklab vers sRGB linéaire, sans bornage : une composante hors de `[0, 1]` sort du gamut ([MOT-03]). */
export function oklabVersLineaire(oklab: Triplet): Triplet {
  const [L, a, b] = oklab;
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Ramène un angle dans `[0, 360)`. */
export function normaliserTeinte(degres: number): number {
  return ((degres % 360) + 360) % 360;
}

/** Oklab vers OKLCH ; sous une chroma de `1e-4`, la teinte vaut 0 ([MOT-04]). */
export function oklabVersOklch(oklab: Triplet): Oklch {
  const [L, a, b] = oklab;
  const C = Math.hypot(a, b);
  const H = C < CHROMA_SANS_TEINTE ? 0 : normaliserTeinte((Math.atan2(b, a) * 180) / Math.PI);
  return { L, C, H };
}

/** OKLCH vers Oklab. */
export function oklchVersOklab(couleur: Oklch): Triplet {
  const angle = (couleur.H * Math.PI) / 180;
  return [couleur.L, couleur.C * Math.cos(angle), couleur.C * Math.sin(angle)];
}

/** OKLCH vers sRGB linéaire, sans bornage. */
export function oklchVersLineaire(couleur: Oklch): Triplet {
  return oklabVersLineaire(oklchVersOklab(couleur));
}

/** La lecture OKLCH d'une couleur à 8 bits ([MOT-11]). */
export function rgb8VersOklch(couleur: Rgb8): Oklch {
  return oklabVersOklch(lineaireVersOklab(rgb8VersLineaire(couleur)));
}

type Matrice = readonly [Triplet, Triplet, Triplet];

function appliquer(matrice: Matrice, v: Triplet): Triplet {
  return [
    matrice[0][0] * v[0] + matrice[0][1] * v[1] + matrice[0][2] * v[2],
    matrice[1][0] * v[0] + matrice[1][1] * v[1] + matrice[1][2] * v[2],
    matrice[2][0] * v[0] + matrice[2][1] * v[1] + matrice[2][2] * v[2],
  ];
}

// Matrices de CSS Color 4, au blanc D65, écrites en fractions exactes comme le
// module de conversion de la spécification les publie.
const SRGB_VERS_XYZ: Matrice = [
  [506752 / 1228815, 87881 / 245763, 12673 / 70218],
  [87098 / 409605, 175762 / 245763, 12673 / 175545],
  [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
];
const XYZ_VERS_SRGB: Matrice = [
  [12831 / 3959, -329 / 214, -1974 / 3959],
  [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
  [705 / 12673, -2585 / 12673, 705 / 667],
];
const P3_VERS_XYZ: Matrice = [
  [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
  [35783 / 156275, 247089 / 357200, 198249 / 2500400],
  [0, 32229 / 714400, 5220557 / 5000800],
];
const XYZ_VERS_P3: Matrice = [
  [446124 / 178915, -333277 / 357830, -72051 / 178915],
  [-14852 / 17905, 63121 / 35810, 423 / 17905],
  [11844 / 330415, -50337 / 660830, 316169 / 330415],
];

/** sRGB linéaire vers Display P3 linéaire, par `XYZ` au blanc D65 ([MOT-05]). */
export function srgbLineaireVersP3Lineaire(lineaire: Triplet): Triplet {
  return appliquer(XYZ_VERS_P3, appliquer(SRGB_VERS_XYZ, lineaire));
}

/** Display P3 linéaire vers sRGB linéaire, l'inverse de [MOT-05] ([MOT-26]). */
export function p3LineaireVersSrgbLineaire(lineaire: Triplet): Triplet {
  return appliquer(XYZ_VERS_SRGB, appliquer(P3_VERS_XYZ, lineaire));
}

/**
 * Les composantes Display P3 encodées d'une couleur à 8 bits, sans arrondi :
 * ce que le plugin peint dans un document `DISPLAY_P3` (section 6.7). Display
 * P3 emploie la fonction de transfert de sRGB.
 */
export function rgb8VersP3(couleur: Rgb8): Triplet {
  const p3 = srgbLineaireVersP3Lineaire(rgb8VersLineaire(couleur));
  return [encoder(p3[0]), encoder(p3[1]), encoder(p3[2])];
}

/** Une couleur lue dans un document `DISPLAY_P3`, ramenée en sRGB 8 bits. */
export interface LectureP3 {
  readonly couleur: Rgb8;
  /** Vrai quand une composante sortait du gamut sRGB et a été bornée. */
  readonly ramenee: boolean;
}

/**
 * Les composantes Display P3 encodées d'une peinture, converties en sRGB à 8
 * bits ([MOT-26]). Une composante qui sort de `[0, 1]` d'au moins un
 * demi-niveau à 8 bits est bornée, et `ramenee` le dit.
 */
export function p3VersRgb8(composantes: Triplet): LectureP3 {
  const srgb = p3LineaireVersSrgbLineaire([
    decoder(composantes[0]),
    decoder(composantes[1]),
    decoder(composantes[2]),
  ]);
  const ramenee = srgb.some((canal) => {
    const encode = canal < 0 ? -encoder(-canal) : encoder(canal);
    return encode < -0.5 / 255 || encode > 1 + 0.5 / 255;
  });
  return { couleur: lineaireVersRgb8(srgb), ramenee };
}
