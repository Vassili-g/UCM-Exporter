/**
 * Capture les galeries d'UCM Palettes par le banc du socle.
 *
 *   npm run galerie:captures --workspace ucm-palettes-plugin -- [clair|sombre|replis] [--etats]
 */
const { capturerGalerie } = require('ucm-plugin-socle/galerie/capturer.cjs');
const { GALERIES } = require('./build-galerie.cjs');

if (require.main === module) for (const galerie of GALERIES) capturerGalerie(galerie, process.argv.slice(2));
