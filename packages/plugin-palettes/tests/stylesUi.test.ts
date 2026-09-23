/**
 * Le DOM de l'interface et ses feuilles parlent des mêmes classes. La loi est
 * celle du socle. Les règles mortes se cherchent dans la feuille du plugin
 * seule : celles du socle servent aussi UCM Exporter, dont le test les tient.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  classesSansRegle,
  couleursHorsDesRoles,
  feuilleDuSocle,
  reglesMortes,
  sourcesDuSocle,
  variantesDeBouton,
  type EntreesLoiDesStyles,
} from 'ucm-plugin-socle/lois/styles';

const dossierUi = path.resolve(__dirname, '..', 'src', 'ui');
const lire = (fichier: string): string => fs.readFileSync(fichier, 'utf8');

const source = [
  ...fs.readdirSync(dossierUi).filter((nom) => nom.endsWith('.ts')).map((nom) => path.join(dossierUi, nom)),
  ...sourcesDuSocle(),
].map(lire).join('\n');
const feuilleDuPlugin = lire(path.join(dossierUi, 'styles.css'));

const ENTREES: EntreesLoiDesStyles = {
  source,
  feuille: feuilleDuSocle() + feuilleDuPlugin,
  valeursDeGabarit: { variant: () => variantesDeBouton(source) },
  poseesParLHote: new Set(['figma-dark']),
};

test('toute classe posée par l’interface a une règle dans les feuilles', () => {
  assert.deepEqual(classesSansRegle(ENTREES), []);
});

test('toute règle de la feuille du plugin vise une classe que l’interface pose', () => {
  assert.deepEqual(reglesMortes({ ...ENTREES, feuille: feuilleDuPlugin }), []);
});

test('les feuilles n’écrivent aucune couleur en dur hors du bloc de rôles', () => {
  assert.deepEqual(couleursHorsDesRoles(ENTREES.feuille), []);
});
