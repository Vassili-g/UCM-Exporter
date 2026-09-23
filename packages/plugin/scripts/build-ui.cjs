/**
 * Assemble l'interface d'UCM Exporter en un HTML autonome, par le build du
 * socle. Le fichier reste ici parce que `tests/buildUi.test.ts` le charge.
 */
const path = require('path');
const { inlineAssets, construireUi, STYLE_MARKER, SCRIPT_MARKER } = require('ucm-plugin-socle/build/inline-ui.cjs');

module.exports = { inlineAssets, STYLE_MARKER, SCRIPT_MARKER };

if (require.main === module) {
  construireUi({
    srcDir: path.resolve(__dirname, '../src/ui'),
    distDir: path.resolve(__dirname, '../dist'),
    feuilles: ['styles.css'],
  });
}
