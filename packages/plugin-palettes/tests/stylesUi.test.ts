/**
 * Le DOM de l'interface et ses feuilles parlent des mêmes classes. La loi est
 * celle du socle. Les règles mortes se cherchent dans la feuille du plugin
 * seule : celles du socle servent aussi UCM Exporter, dont le test les tient.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ORDRE_DES_SEVERITES } from 'ucm-couleur';

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

/** Les sources de l'interface, sous-dossiers compris : l'éditeur de dérive vit dans `derive/`. */
function sourcesUi(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return sourcesUi(chemin);
    return entree.name.endsWith('.ts') ? [chemin] : [];
  });
}

const source = [...sourcesUi(dossierUi), ...sourcesDuSocle()].map(lire).join('\n');
const feuilleDuPlugin = lire(path.join(dossierUi, 'styles.css'));

const ENTREES: EntreesLoiDesStyles = {
  source,
  feuille: feuilleDuSocle() + feuilleDuPlugin,
  valeursDeGabarit: {
    variant: () => variantesDeBouton(source),
    severite: () => [...ORDRE_DES_SEVERITES],
  },
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
