/**
 * Assemble le JavaScript et le CSS compilés d'un plugin dans l'unique HTML
 * autonome qu'une interface de plugin Figma exige.
 */
const fs = require('fs');
const path = require('path');

/**
 * Les deux balises que ce script remplace dans le gabarit.
 *
 * Leurs chemins sont écrits comme depuis `dist/`, alors que le gabarit se trouve
 * dans `src/ui/` : ils servent de repères de remplacement et ne se suivent pas.
 * Chaque plugin vérifie par un test que son gabarit les contient encore, parce
 * qu'un repère introuvable laisse la balise en place au lieu de lever, et que le
 * plugin s'ouvre alors vide dans Figma sans qu'aucun contrôle échoue.
 */
const STYLE_MARKER = '<link rel="stylesheet" href="./ui/styles.css" />';
const SCRIPT_MARKER = '<script type="module" src="./ui/index.ts"></script>';

/**
 * Remplace les deux balises du gabarit par leur contenu inline.
 *
 * Les remplacements passent par une fonction, jamais par une chaîne : dans une
 * chaîne de remplacement, `String.replace` interprète `$&`, `` $` ``, `$'`,
 * `$$` et `$1`. Or esbuild nomme ses variables minifiées `$` une fois son
 * réservoir de noms courts épuisé, et produit alors des suites comme `$&&x` :
 * le bundle serait tronqué et remplacé par la balise elle-même. Le build
 * resterait vert, les tests aussi, et le plugin ne se lancerait plus dans
 * Figma.
 */
function inlineAssets(template, css, javascript) {
  return template
    .replace(STYLE_MARKER, () => `<style>${css}</style>`)
    .replace(SCRIPT_MARKER, () => `<script>${javascript}</script>`);
}

/**
 * Écrit `dist/ui.html` à partir de `dist/ui.js`, des feuilles de `srcDir` dans
 * l'ordre donné, et du gabarit `srcDir/index.html`, puis retire `dist/ui.js`.
 * L'ordre des feuilles est celui de la cascade.
 */
function construireUi({ srcDir, distDir, feuilles }) {
  const distHtml = path.join(distDir, 'ui.html');
  const compiledJavaScript = path.join(distDir, 'ui.js');

  if (!fs.existsSync(compiledJavaScript)) {
    throw new Error('Missing dist/ui.js. Run build:ui:js first.');
  }

  const javascript = fs
    .readFileSync(compiledJavaScript, 'utf8')
    .replace(/<\/script/gi, '<\\/script');
  const css = feuilles
    .map((feuille) => fs.readFileSync(path.resolve(srcDir, feuille), 'utf8'))
    .join('')
    .replace(/<\/style/gi, '<\\/style');
  const template = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');

  fs.writeFileSync(distHtml, inlineAssets(template, css, javascript));
  fs.rmSync(compiledJavaScript);
  console.log(`Created self-contained UI entry ${distHtml}`);
}

module.exports = { inlineAssets, construireUi, STYLE_MARKER, SCRIPT_MARKER };
