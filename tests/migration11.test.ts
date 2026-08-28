/**
 * Le passage du schéma 10.3 au 11.0 ne perd rien.
 *
 * Un poste de développement ne peut pas lancer l'export : le plugin n'existe
 * que dans Figma. Ce contrôle-ci prouve la même chose autrement — il prend les
 * contrats 10.3 encore présents dans le corpus, de VRAIES sorties du plugin,
 * leur applique les fonctions que le moteur applique maintenant, les remonte
 * dans l'autre sens, et compare au fichier de départ clé par clé.
 *
 * Le seul écart toléré est « clé absente ↔ valeur neutre » : c'est exactement
 * ce que l'élision fait, et rien d'autre. Une valeur changée, une clé perdue
 * qui portait quelque chose, un ordre modifié — tout le reste échoue.
 *
 * Ce test s'éteint de lui-même quand le corpus est réexporté en 11.0. Il porte
 * la migration, pas la forme : `schema.test.ts` et `verifier-migration` gardent
 * la suite.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ecarts, estUneAbsenceDeNeutre, migrer, remonter } from '../scripts/verifier-migration';

const corpus = join(dirname(fileURLToPath(import.meta.url)), 'test-exports');
const contrats = readdirSync(corpus)
  .filter((nom) => nom.endsWith('.contract.json'))
  .map((nom) => ({
    nom,
    valeur: JSON.parse(readFileSync(join(corpus, nom), 'utf8').replace(/^﻿/, '')),
  }))
  .filter(({ valeur }) => valeur.meta?.contractVersion === '10.3');

test('le corpus de référence est là', () => {
  assert.ok(readdirSync(corpus).some((nom) => nom.endsWith('.contract.json')));
});

for (const { nom, valeur } of contrats) {
  test(`${nom} : la migration 10.3 → 11.0 ne perd aucune donnée`, () => {
    const anormaux = ecarts(remonter(migrer(valeur)), valeur)
      .filter((ecart) => !estUneAbsenceDeNeutre(ecart));
    assert.deepEqual(
      anormaux.map(({ chemin, remonte, origine }) => (
        `${chemin} : ${JSON.stringify(remonte)} ≠ ${JSON.stringify(origine)}`
      )),
      [],
    );
  });

  test(`${nom} : la migration retire vraiment des valeurs neutres`, () => {
    // Le contrôle ci-dessus serait vert sur une migration qui ne fait rien.
    const neutres = ecarts(remonter(migrer(valeur)), valeur).filter(estUneAbsenceDeNeutre);
    assert.ok(neutres.length > 0, 'aucune valeur neutre retirée : la migration n’a rien fait');
  });
}
