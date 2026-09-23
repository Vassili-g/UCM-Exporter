/**
 * Le bundle injecté dans `dist/ui.html` doit y arriver intact.
 *
 * `String.replace` interprète `$&`, `` $` ``, `$'`, `$$` et `$n` dans une
 * chaîne de remplacement. esbuild nomme `$` une de ses variables minifiées
 * lorsque son réservoir de noms courts est épuisé, si bien qu'un `$&&x` suffit
 * à tronquer le bundle, sans que le build ni les tests ne rougissent.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const { inlineAssets, STYLE_MARKER, SCRIPT_MARKER } = require_('../scripts/build-ui.cjs') as {
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

/**
 * Le test ci-dessus fabrique son gabarit à partir des repères, donc il prouve le
 * remplacement sans vérifier que le gabarit réel contient ce qu'on y remplace.
 *
 * Renommer le point d'entrée déplace le repère du script. `String.replace` rend
 * la chaîne inchangée sur un motif introuvable, si bien que `dist/ui.html`
 * partirait avec sa balise intacte, pointant un fichier absent de `dist` : build
 * et tests verts, plugin vide dans Figma.
 */
test('le gabarit réel porte les deux repères que le build remplace', () => {
  const gabarit = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'ui', 'index.html'),
    'utf8',
  );

  assert.ok(
    gabarit.includes(STYLE_MARKER),
    `src/ui/index.html ne contient pas ${STYLE_MARKER} : le CSS ne serait pas inliné.`,
  );
  assert.ok(
    gabarit.includes(SCRIPT_MARKER),
    `src/ui/index.html ne contient pas ${SCRIPT_MARKER} : le bundle ne serait pas inliné, `
      + `et le plugin s'ouvrirait vide sans qu'aucun contrôle échoue.`,
  );
});
