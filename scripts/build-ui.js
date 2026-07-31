/**
 * Assemble le JavaScript et le CSS compilés dans l'unique HTML autonome exigé
 * par une interface de plugin Figma.
 */
const fs = require('fs');
const path = require('path');

const STYLE_MARKER = '<link rel="stylesheet" href="./ui/styles.css" />';
const SCRIPT_MARKER = '<script type="module" src="./ui/index.js"></script>';

/**
 * Remplace les deux balises du gabarit par leur contenu inline.
 *
 * Les remplacements passent par une FONCTION, jamais par une chaîne : dans une
 * chaîne de remplacement, `String.replace` interprète `$&`, `` $` ``, `$'`,
 * `$$` et `$1`. Or esbuild nomme ses variables minifiées `$` une fois son
 * réservoir de noms courts épuisé, et produit alors des suites comme `$&&x` —
 * le bundle serait tronqué et remplacé par la balise elle-même. Le build
 * resterait vert, les tests aussi, et le plugin ne se lancerait plus dans
 * Figma.
 */
function inlineAssets(template, css, javascript) {
  return template
    .replace(STYLE_MARKER, () => `<style>${css}</style>`)
    .replace(SCRIPT_MARKER, () => `<script>${javascript}</script>`);
}

module.exports = { inlineAssets, STYLE_MARKER, SCRIPT_MARKER };

if (require.main === module) {
  const srcDir = path.resolve(__dirname, '../src/ui');
  const distDir = path.resolve(__dirname, '../dist');
  const distHtml = path.join(distDir, 'ui.html');
  const compiledJavaScript = path.join(distDir, 'ui.js');

  if (!fs.existsSync(compiledJavaScript)) {
    throw new Error('Missing dist/ui.js. Run build:ui:js first.');
  }

  const javascript = fs
    .readFileSync(compiledJavaScript, 'utf8')
    .replace(/<\/script/gi, '<\\/script');
  const css = fs
    .readFileSync(path.join(srcDir, 'styles.css'), 'utf8')
    .replace(/<\/style/gi, '<\\/style');
  const template = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');

  fs.writeFileSync(distHtml, inlineAssets(template, css, javascript));
  fs.rmSync(compiledJavaScript);
  console.log(`Created self-contained UI entry ${distHtml}`);
}
