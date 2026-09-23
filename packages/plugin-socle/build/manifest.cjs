/**
 * Copie le manifest de développement d'un plugin dans son `dist`, en ramenant
 * les chemins des bundles à leurs noms de fichiers distribuables.
 */
const fs = require('fs');
const path = require('path');

/** Écrit `racine/dist/manifest.json` depuis `racine/manifest.json`. */
function construireManifest(racine) {
  const sourcePath = path.join(racine, 'manifest.json');
  const distDir = path.join(racine, 'dist');
  const outputPath = path.join(distDir, 'manifest.json');

  const manifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const output = {
    ...manifest,
    main: path.basename(manifest.main),
    ui: typeof manifest.ui === 'string' ? path.basename(manifest.ui) : manifest.ui,
  };

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Created distributable manifest ${outputPath}`);
}

module.exports = { construireManifest };
