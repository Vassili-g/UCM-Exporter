/** Le build de l'interface et le manifest de distribution, pour un plugin quelconque. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const { inlineAssets, construireUi, STYLE_MARKER, SCRIPT_MARKER } = require('../build/inline-ui.cjs') as {
  inlineAssets: (template: string, css: string, javascript: string) => string;
  construireUi: (options: { srcDir: string; distDir: string; feuilles: string[] }) => void;
  STYLE_MARKER: string;
  SCRIPT_MARKER: string;
};
const { construireManifest } = require('../build/manifest.cjs') as { construireManifest: (racine: string) => void };

const gabarit = `<html><head>${STYLE_MARKER}</head><body>${SCRIPT_MARKER}</body></html>`;

function dossierTemporaire(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-socle-'));
}

test('un bundle qui contient des motifs de remplacement arrive intact', () => {
  const javascript = 'var $=1,a=$&&2,b="$`",c="$\'",d="$$",e="$1";console.log(a,b,c,d,e);';
  const css = '.a::after{content:"$&"}';
  const html = inlineAssets(gabarit, css, javascript);
  assert.ok(html.includes(`<script>${javascript}</script>`));
  assert.ok(html.includes(`<style>${css}</style>`));
  assert.equal(html.includes(SCRIPT_MARKER), false);
});

test('les feuilles se concatènent dans l’ordre donné, et dist/ui.js disparaît', () => {
  const racine = dossierTemporaire();
  const src = path.join(racine, 'src');
  const dist = path.join(racine, 'dist');
  fs.mkdirSync(src);
  fs.mkdirSync(dist);
  fs.writeFileSync(path.join(src, 'index.html'), gabarit);
  fs.writeFileSync(path.join(src, 'socle.css'), '.a{color:red}');
  fs.writeFileSync(path.join(src, 'propre.css'), '.a{color:blue}</style>');
  fs.writeFileSync(path.join(dist, 'ui.js'), 'console.log("</script>")');

  construireUi({ srcDir: src, distDir: dist, feuilles: ['socle.css', 'propre.css'] });

  const html = fs.readFileSync(path.join(dist, 'ui.html'), 'utf8');
  assert.ok(html.includes('<style>.a{color:red}.a{color:blue}<\\/style></style>'), html);
  assert.ok(html.includes('<script>console.log("<\\/script>")</script>'), html);
  assert.equal(fs.existsSync(path.join(dist, 'ui.js')), false);
  fs.rmSync(racine, { recursive: true, force: true });
});

test('le manifest distribuable ne garde que les noms des bundles', () => {
  const racine = dossierTemporaire();
  fs.writeFileSync(
    path.join(racine, 'manifest.json'),
    JSON.stringify({ name: 'Essai', main: 'dist/code.js', ui: 'dist/ui.html', editorType: ['figma'] }),
  );
  construireManifest(racine);
  const ecrit = JSON.parse(fs.readFileSync(path.join(racine, 'dist', 'manifest.json'), 'utf8'));
  assert.deepEqual(ecrit, { name: 'Essai', main: 'code.js', ui: 'ui.html', editorType: ['figma'] });
  fs.rmSync(racine, { recursive: true, force: true });
});
