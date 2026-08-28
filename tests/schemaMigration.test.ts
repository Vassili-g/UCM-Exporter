/**
 * Le schéma 11.0 accepte-t-il ce que le moteur 11.0 écrit ?
 *
 * `schema.test.ts` confronte le schéma aux contrats du corpus — mais il ne
 * confronte QUE ceux qui déclarent déjà la version courante, et c'est
 * délibéré : monter `CONTRACT_VERSION` rendrait sinon `npm test` rouge jusqu'à
 * ce qu'un humain rouvre Figma. La conséquence est un angle mort exactement
 * pendant la migration, là où le risque est le plus grand.
 *
 * Ce contrôle-ci le ferme sans rien réexporter : il MIGRE chaque contrat du
 * corpus avec les fonctions du moteur, puis valide le résultat contre le schéma
 * commité. Un champ que l'élision retire alors que le schéma le déclare requis
 * échoue ici, au lieu d'échouer chez le consommateur après un export réel.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { CHEMIN_DU_SCHEMA } from '../scripts/build-schema';
import { migrer } from '../scripts/verifier-migration';

const corpus = join(dirname(fileURLToPath(import.meta.url)), 'test-exports');
const schema = JSON.parse(readFileSync(CHEMIN_DU_SCHEMA, 'utf8')) as Record<string, unknown>;
const valider = new Ajv({ allErrors: true, strict: false }).compile(schema);

const contrats = readdirSync(corpus)
  .filter((nom) => nom.endsWith('.contract.json'))
  .map((nom) => ({
    nom,
    valeur: JSON.parse(readFileSync(join(corpus, nom), 'utf8').replace(/^﻿/, '')) as any,
  }))
  .filter(({ valeur }) => valeur.meta?.contractVersion === '10.3');

for (const { nom, valeur } of contrats) {
  test(`${nom} migré en 11.0 valide le schéma commité`, () => {
    const migre = migrer(valeur) as Record<string, unknown>;
    (migre.meta as Record<string, unknown>).contractVersion = schema['x-ucm-contract-version'];
    assert.ok(
      valider(migre),
      `${nom} : ${JSON.stringify(valider.errors?.slice(0, 5), null, 1)}`,
    );
  });
}

test('le corpus porte encore de quoi exercer ce contrôle', () => {
  // Le jour où le corpus sera réexporté en 11.0, ce test-ci n'aura plus rien à
  // migrer — et `schema.test.ts` prendra le relais sur les vrais exports.
  const total = readdirSync(corpus).filter((nom) => nom.endsWith('.contract.json')).length;
  assert.ok(total > 0);
});
