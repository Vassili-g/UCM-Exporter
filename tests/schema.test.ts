/**
 * Le JSON Schema publié décrit-il vraiment les contrats que le plugin produit ?
 *
 * Deux questions distinctes, et les deux comptent : le schéma commité suit-il
 * `types.ts` (sinon il publie une forme périmée), et accepte-t-il les exports
 * réels (sinon il refuserait un contrat parfaitement valide chez un
 * consommateur).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { CONTRACT_VERSION } from '../src/contract/exportComponent';
import { CHEMIN_DU_SCHEMA, construireLeSchema } from '../scripts/build-schema';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpus = join(racine, 'tests', 'test-exports');

const schemaCommite = JSON.parse(readFileSync(CHEMIN_DU_SCHEMA, 'utf8')) as Record<string, unknown>;

/** Ajv en draft-07, tolérant aux mots-clés `x-` que le schéma porte. */
function valideur(schema: Record<string, unknown>) {
  return new Ajv({ allErrors: true, strict: false }).compile(schema);
}

/** Un contrat du corpus, tel que le plugin l'a écrit. */
function contratDuCorpus(nom: string): unknown {
  return JSON.parse(readFileSync(join(corpus, nom), 'utf8').replace(/^\uFEFF/, ''));
}

const contrats = readdirSync(corpus).filter((nom) => nom.endsWith('.contract.json'));

test('le schéma commité est celui que produit types.ts aujourd\'hui', () => {
  // La comparaison porte sur le JSON analysé, pas sur les octets : le dépôt
  // n'a pas de `.gitattributes`, et une extraction sous Windows convertit les
  // fins de ligne. Comparer le texte rendrait ce test rouge sans dérive.
  assert.deepEqual(
    schemaCommite,
    construireLeSchema(),
    'schema/ucm-contract.schema.json est périmé. Lancez « npm run schema ».',
  );
});

test('le schéma publie la version de contrat que le moteur écrit', () => {
  assert.equal(schemaCommite['x-ucm-contract-version'], CONTRACT_VERSION);
});

test('les exports réels du corpus valident le schéma', () => {
  const valider = valideur(schemaCommite);
  assert.ok(contrats.length > 0, 'le corpus de référence a disparu');
  for (const nom of contrats) {
    const contrat = contratDuCorpus(nom);
    assert.ok(
      valider(contrat),
      `${nom} ne valide pas le schéma : ${JSON.stringify(valider.errors?.slice(0, 3))}`,
    );
  }
});

test('le schéma refuse un contrat vidé de sa substance', () => {
  const valider = valideur(schemaCommite);
  assert.equal(valider({}), false);
});

test('un objet à forme fixe refuse un champ qu\'il ne déclare pas', () => {
  // La garantie ne vaut que là : `props`, `icons` ou `variantViews` sont des
  // dictionnaires dont les clés sont inventées par le composant, et restent
  // donc libres.
  const valider = valideur(schemaCommite);
  const contrat = contratDuCorpus(contrats[0]) as Record<string, unknown>;
  assert.equal(valider({ ...contrat, champInvente: true }), false);
  assert.equal(
    valider({ ...contrat, meta: { ...(contrat.meta as object), champInvente: true } }),
    false,
  );
});

test('le schéma refuse un contrat qui se déclare dans une autre version', () => {
  // Sans le `const` posé par build-schema.ts, `contractVersion` serait une
  // chaîne libre : le schéma de la 10.1 accepterait une 9.0 dont la forme colle.
  const valider = valideur(schemaCommite);
  const contrat = contratDuCorpus(contrats[0]) as Record<string, unknown>;
  const meta = { ...(contrat.meta as Record<string, unknown>), contractVersion: '9.0' };
  assert.equal(valider({ ...contrat, meta }), false);
});
