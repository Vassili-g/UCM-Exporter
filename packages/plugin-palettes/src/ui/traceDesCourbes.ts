/**
 * Le tracé des deux courbes de luminosité, au-dessus de leur table (V9.4,
 * section 8.3). Chaque nuance a sa colonne ; la luminosité monte de 0, en
 * bas, à 1, en haut. Le thème Light se trace en trait plein, le thème Dark en
 * tireté. Le ◆ marque la référence de la palette ouverte à la nuance où elle
 * est réellement insérée, dans chaque thème, et à sa propre luminosité : il se
 * distingue du point que la courbe commune donne à cette nuance.
 *
 * Le tracé est décoratif pour l'assistance technique : la table porte les
 * mêmes valeurs, au clavier.
 */
import { MODES, type Mode } from 'ucm-couleur';

/** Ce que le tracé montre de la palette ouverte : sa luminosité et sa nuance dans chaque thème. */
export interface ReferenceTracee {
  readonly clarte: number;
  readonly rangs: { readonly [M in Mode]: number };
}

/** Les dimensions du tracé, dans le repère de sa `viewBox`. */
export const TRAME_DU_TRACE = { pas: 40, hauteur: 120, marge: 10 } as const;

export interface GeometrieDesCourbes {
  readonly largeur: number;
  readonly hauteur: number;
  /** Les points de chaque courbe, dans l'ordre des nuances. */
  readonly courbes: { readonly [M in Mode]: readonly { readonly x: number; readonly y: number }[] };
  /** Le ◆ de chaque thème, quand une palette est ouverte. */
  readonly references: readonly { readonly mode: Mode; readonly x: number; readonly y: number }[];
}

/** La géométrie du tracé : une colonne par nuance, la luminosité 1 en haut. */
export function geometrieDesCourbes(courbes: { readonly [M in Mode]: readonly number[] }, reference: ReferenceTracee | null): GeometrieDesCourbes {
  const { pas, hauteur, marge } = TRAME_DU_TRACE;
  const x = (rang: number) => rang * pas + pas / 2;
  const y = (clarte: number) => marge + (1 - clarte) * (hauteur - 2 * marge);
  return {
    largeur: courbes.light.length * pas,
    hauteur,
    courbes: {
      light: courbes.light.map((clarte, rang) => ({ x: x(rang), y: y(clarte) })),
      dark: courbes.dark.map((clarte, rang) => ({ x: x(rang), y: y(clarte) })),
    },
    references: reference ? MODES.map((mode) => ({ mode, x: x(reference.rangs[mode]), y: y(reference.clarte) })) : [],
  };
}

const SVG = 'http://www.w3.org/2000/svg';

function noeud<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, nom);
  for (const [cle, valeur] of Object.entries(attributs)) element.setAttribute(cle, String(valeur));
  return element;
}

/** Le tracé SVG d'une géométrie. */
export function dessinerLesCourbes(geometrie: GeometrieDesCourbes): SVGSVGElement {
  const svg = noeud('svg', { viewBox: `0 0 ${geometrie.largeur} ${geometrie.hauteur}`, 'aria-hidden': 'true' });
  svg.classList.add('trace-courbes');
  const { marge, hauteur } = TRAME_DU_TRACE;
  for (const bord of [marge, hauteur - marge]) {
    const repere = noeud('line', { x1: 0, x2: geometrie.largeur, y1: bord, y2: bord });
    repere.classList.add('trace-repere');
    svg.append(repere);
  }
  for (const mode of MODES) {
    const points = geometrie.courbes[mode];
    const ligne = noeud('polyline', { points: points.map(({ x, y }) => `${x},${y}`).join(' ') });
    ligne.classList.add('trace-courbe');
    ligne.dataset.mode = mode;
    svg.append(ligne);
    for (const { x, y } of points) {
      const point = noeud('circle', { cx: x, cy: y, r: 2.5 });
      point.classList.add('trace-point');
      point.dataset.mode = mode;
      svg.append(point);
    }
  }
  for (const { mode, x, y } of geometrie.references) {
    const losange = noeud('text', { x, y: y + 4 });
    losange.classList.add('trace-reference');
    losange.dataset.mode = mode;
    losange.textContent = '◆';
    svg.append(losange);
  }
  return svg;
}
