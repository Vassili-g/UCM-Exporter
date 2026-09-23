import fs from 'node:fs';

const t = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const get = (p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), t);

function resolve(v, d = 0) {
  if (d > 12 || typeof v !== 'string') return v ?? null;
  const m = /^\{(.+)\}$/.exec(v.trim());
  if (!m) return v;
  const n = get(m[1]);
  return n ? resolve(n.$value, d + 1) : null;
}

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** Rend [r, g, b] en 0-255 depuis un hex ou depuis la forme DTCG `components`. */
function canal(v) {
  if (v && typeof v === 'object' && Array.isArray(v.components)) {
    return v.components.slice(0, 3).map((c) => c * 255);
  }
  const m = /^#?([0-9a-fA-F]{6})/.exec(String(v));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function oklch(valeur) {
  const rgb = canal(valeur);
  if (!rgb) return null;
  const r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m2 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m2 - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m2 + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m2 - 0.8086757660 * s;
  let H = Math.atan2(B, A) * 180 / Math.PI;
  if (H < 0) H += 360;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { L, C: Math.hypot(A, B), H, Y };
}

const contraste = (y1, y2) => {
  const [a, b] = y1 > y2 ? [y1, y2] : [y2, y1];
  return (a + 0.05) / (b + 0.05);
};

const CRANS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function montrer(label, src, crans = CRANS) {
  const o = crans.map((c) => (src && src[c] ? oklch(resolve(src[c].$value)) : null));
  if (o.every((x) => x === null)) return;
  console.log('### ' + label);
  console.log('  cran ' + crans.map((c) => c.padStart(6)).join(''));
  console.log('  L    ' + o.map((x) => (x ? x.L.toFixed(3) : '-').padStart(6)).join(''));
  console.log('  C    ' + o.map((x) => (x ? x.C.toFixed(3) : '-').padStart(6)).join(''));
  console.log('  H    ' + o.map((x) => (x ? x.H.toFixed(0) : '-').padStart(6)).join(''));
  // contraste WCAG contre le cran 50 de la meme rampe
  const base = o[0];
  if (base) {
    console.log('  K/50 ' + o.map((x) => (x ? contraste(x.Y, base.Y).toFixed(1) : '-').padStart(6)).join(''));
  }
}

for (const m of Object.keys(t['color-brands'] || {})) {
  for (const f of ['primary', 'secondary']) montrer(m + '.' + f, t['color-brands'][m][f]);
}
for (const f of ['success', 'warning', 'info', 'danger']) {
  montrer('utilities.' + f, (t['color-utilities'] || {})[f]);
}
montrer('utilities.neutral', (t['color-utilities'] || {}).neutral,
  ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000', '1100']);
