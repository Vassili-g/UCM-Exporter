/** Le JSON canonique et son empreinte ([REC-02]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { empreinte, fnv1a, jsonCanonique, octetsUtf8 } from '../src/index';

test('[REC-02] le JSON canonique trie les clés à toute profondeur, et garde l’ordre des tableaux', () => {
  assert.equal(
    jsonCanonique({ b: 1, a: { d: [3, 1], c: 'é' }, e: undefined }),
    '{"a":{"c":"é","d":[3,1]},"b":1}',
  );
});

test('[REC-02] l’empreinte ne dépend pas de l’ordre des clés', () => {
  assert.equal(empreinte({ a: 1, b: { c: 2, d: 3 } }), empreinte({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(empreinte({ a: 1 }), empreinte({ a: 2 }));
  assert.match(empreinte({ a: 1 }), /^[0-9a-f]{8}$/);
});

test('[REC-02] FNV-1a 32 bits rend les vecteurs de référence', () => {
  const ascii = (texte: string) => [...texte].map((c) => c.charCodeAt(0));
  assert.equal(fnv1a([]), '811c9dc5');
  assert.equal(fnv1a(ascii('a')), 'e40c292c');
  assert.equal(fnv1a(ascii('foobar')), 'bf9cf968');
});

test('[REC-02] l’encodeur UTF-8 rend les octets de Node, paires de substitution comprises', () => {
  for (const texte of ['Bleu', 'Vert émeraude', '日本', 'palette 🎨', 'moitié \ud83c seule', '\udfa8']) {
    assert.deepEqual(octetsUtf8(texte), [...Buffer.from(texte, 'utf8')], texte);
  }
});
