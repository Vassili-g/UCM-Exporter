/**
 * Le bundle injecté dans `dist/ui.html` doit y arriver intact.
 *
 * `String.replace` interprète `$&`, `` $` ``, `$'`, `$$` et `$n` dans une
 * chaîne de remplacement. esbuild nomme `$` une de ses variables minifiées
 * lorsque son réservoir de noms courts est épuisé, si bien qu'un `$&&x` suffit
 * à tronquer le bundle — sans que le build ni les tests ne rougissent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { inlineAssets, STYLE_MARKER, SCRIPT_MARKER } = require_('../scripts/build-ui.js') as {
  inlineAssets: (template: string, css: string, javascript: string) => string;
  STYLE_MARKER: string;
  SCRIPT_MARKER: string;
};

const template = `<html><head>${STYLE_MARKER}</head><body>${SCRIPT_MARKER}</body></html>`;

test('un bundle contenant des motifs de remplacement arrive intact', () => {
  const javascript = 'var $=1,a=$&&2,b="$`",c="$\'",d="$$",e="$1";console.log(a,b,c,d,e);';
  const css = '.a::after{content:"$&"}';

  const html = inlineAssets(template, css, javascript);

  assert.ok(html.includes(`<script>${javascript}</script>`), 'le JavaScript doit être intact');
  assert.ok(html.includes(`<style>${css}</style>`), 'le CSS doit être intact');
  assert.equal(html.includes(SCRIPT_MARKER), false, 'la balise doit avoir disparu');
  assert.equal(html.includes(STYLE_MARKER), false);
});
