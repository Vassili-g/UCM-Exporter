/**
 * Capture la galerie d'UCM Exporter par le banc du socle.
 *
 *   npm run galerie:captures --workspace ucm-exporter-plugin -- [clair|sombre|replis] [--etats]
 */
const { capturerGalerie } = require('ucm-plugin-socle/galerie/capturer.cjs');
const { GALERIE } = require('./build-galerie.cjs');

if (require.main === module) capturerGalerie(GALERIE, process.argv.slice(2));
