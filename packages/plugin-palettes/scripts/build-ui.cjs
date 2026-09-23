/** Assemble l'interface d'UCM Palettes en un HTML autonome, par le build du socle. */
const path = require('path');
const { construireUi } = require('ucm-plugin-socle/build/inline-ui.cjs');

construireUi({
  srcDir: path.resolve(__dirname, '../src/ui'),
  distDir: path.resolve(__dirname, '../dist'),
  feuilles: [require.resolve('ucm-plugin-socle/socle.css'), 'styles.css'],
});
