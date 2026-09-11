/**
 * Le `tokens.json` d'origine figé n'a pas bougé, et les lecteurs du kit le lisent.
 *
 * Il est la seule donnée d'une forme que le moteur ne produit plus : sa valeur
 * tient à son immobilité, comme celle des contrats figés. L'empreinte est lue
 * dans le README voisin, qui reste son unique domicile.
 *
 * Aucun test d'ici ne le compare à une sortie du moteur : `AGENTS.md` l'interdit.
 */
import assert from "node:assert/strict";
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { cheminDeReference, indexerTokensDtcg, referencesAbsentes } from '../src/lecteurs/tokens-dtcg.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const dossier = path.resolve(ici, '..', 'fixtures', 'tokens', 'origine');
const octets = fs.readFileSync(path.join(dossier, 'tokens.json'));
const tokens = JSON.parse(octets.toString('utf8'));

test("le tokens.json d'origine est intact, et en LF", () => {
  const readme = fs.readFileSync(path.join(dossier, 'README.md'), 'utf8');
  const publiee = readme.match(/^([0-9a-f]{64})\s+tokens\.json$/m)?.[1];

  assert.ok(publiee, "le README n'expose plus l'empreinte de tokens.json");
  assert.equal(
    createHash('sha256').update(octets).digest('hex'),
    publiee,
    "tokens.json a changé depuis son gel. Un réexport ne documente plus la forme d'origine : "
      + 'le geste juste est de le retirer, pas de rafraîchir son empreinte.',
  );
  assert.ok(!octets.includes(0x0d), 'tokens.json porte des CRLF : vérifier la règle .gitattributes.');
});

test("la forme d'origine ne porte aucune marque à sa racine", () => {
  assert.equal(Object.prototype.hasOwnProperty.call(tokens, '$extensions'), false);
});

test("l'index du kit trouve chaque feuille, clés héritées d'Object.prototype comprises", () => {
  const index = indexerTokensDtcg(tokens);

  assert.equal(index.size, 40);
  for (const chemin of ['keys.__proto__.primary', 'keys.constructor.primary', 'keys.prototype.primary']) {
    assert.equal(index.get(chemin)?.$type, 'color', chemin);
  }
});

test("chaque alias du fichier d'origine vise une feuille du même fichier", () => {
  const index = indexerTokensDtcg(tokens);
  const references = new Set();
  for (const feuille of index.values()) {
    const modes = feuille.$extensions?.['com.ucm.modes'] ?? {};
    for (const valeur of [feuille.$value, ...Object.values(modes)]) {
      if (cheminDeReference(valeur) !== null) references.add(valeur);
    }
  }

  assert.ok(references.size > 10, `${references.size} références seulement`);
  assert.deepEqual(referencesAbsentes(references, index), []);
});
