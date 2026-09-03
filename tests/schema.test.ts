/**
 * Le JSON Schema publié suit-il `types.ts` ?
 *
 * C'est la seule question qui se tranche sans contrat sous la main : le fichier
 * commité est-il celui que le générateur produit aujourd'hui, et refuse-t-il ce
 * qu'un schéma doit refuser.
 *
 * L'autre moitié — le schéma accepte-t-il ce que le MOTEUR écrit — ne peut pas
 * se poser ici : y répondre demanderait un contrat, donc soit un artefact
 * commité qui n'a rien à faire dans ce repository, soit un objet écrit à la
 * main qui ne prouverait que l'accord du schéma avec l'imagination de son
 * auteur. Elle est posée sur chaque sortie du moteur dans
 * `exportComponent.test.ts`, via `verifierLeSchema`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv from 'ajv';
import { CONTRACT_VERSION } from '../src/contract/exportComponent';
import { CHEMIN_DU_SCHEMA, construireLeSchema } from '../scripts/build-schema';

const schemaCommite = JSON.parse(readFileSync(CHEMIN_DU_SCHEMA, 'utf8')) as Record<string, unknown>;

/** Ajv en draft-07, tolérant aux mots-clés `x-` que le schéma porte. */
function valideur(schema: Record<string, unknown>) {
  return new Ajv({ allErrors: true, strict: false }).compile(schema);
}

test('le schéma commité est celui que produit types.ts aujourd\'hui', () => {
  // La comparaison porte sur le JSON analysé, pas sur les octets. `.gitattributes`
  // fige bien ce fichier en LF, mais une copie de travail issue d'un autre outil
  // peut le rendre en CRLF : comparer le texte serait rouge sans aucune dérive.
  assert.deepEqual(
    schemaCommite,
    construireLeSchema(),
    'schema/ucm-contract.schema.json est périmé. Lancez « npm run schema ».',
  );
});

test('le schéma publie la version de contrat que le moteur écrit', () => {
  assert.equal(schemaCommite['x-ucm-contract-version'], CONTRACT_VERSION);
});

test('le schéma refuse un contrat vidé de sa substance', () => {
  const valider = valideur(schemaCommite);
  assert.equal(valider({}), false);
});
