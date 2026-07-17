const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'manifest.json');
const distDir = path.join(rootDir, 'dist');
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
