const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/ui');
const distDir = path.resolve(__dirname, '../dist');
const distHtml = path.join(distDir, 'ui.html');
const compiledJavaScript = path.join(distDir, 'ui.js');

if (!fs.existsSync(compiledJavaScript)) {
  throw new Error('Missing dist/ui.js. Run build:ui:js first.');
}

const javascript = fs.readFileSync(compiledJavaScript, 'utf8').replace(/<\/script/gi, '<\\/script');
const css = fs
  .readFileSync(path.join(srcDir, 'styles.css'), 'utf8')
  .replace(/<\/style/gi, '<\\/style');
const template = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const html = template
  .replace('<link rel="stylesheet" href="./ui/styles.css" />', `<style>${css}</style>`)
  .replace('<script type="module" src="./ui/index.js"></script>', `<script>${javascript}</script>`);

fs.writeFileSync(distHtml, html);
fs.rmSync(compiledJavaScript);
console.log(`Created self-contained UI entry ${distHtml}`);
