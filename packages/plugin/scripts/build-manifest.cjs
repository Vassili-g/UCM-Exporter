/** Écrit le manifest distribuable d'UCM Exporter, par le build du socle. */
const path = require('path');
const { construireManifest } = require('ucm-plugin-socle/build/manifest.cjs');

construireManifest(path.resolve(__dirname, '..'));
