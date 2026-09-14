/**
 * La lecture expérimentale des collections étendues, sur une simulation de
 * `ExtendedVariableCollection` : déclaration des extensions, surcharges creuses,
 * remontée des modes, constats, et variables héritées comptées une fois.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { axesDeTokens, valeurDansLeContexte } from '@ucm-kit/core/lecteurs';

import { etatDesTokensDuFichier, modeCollisionWarnings } from '../src/tokens/exportTokens';
import { alias, collection, exporterLeFichier, extension, rgba, variable } from './fichierDeVariables';

async function exporter(collections: VariableCollection[], variables: Variable[]) {
  const exporte = await exporterLeFichier({ fichier: { collections, variables, textStyles: [] } });
  return { tokens: JSON.parse(exporte.content), warnings: exporte.warnings };
}

const blanc = rgba(1, 1, 1, 1);
const noir = rgba(0, 0, 0, 1);
const bleu = rgba(0, 0, 1, 1);

/** Une collection Color en Light et Dark, étendue par Marque B, que Sous Marque étend à son tour. */
function fichierEtendu() {
  const couleur = collection('couleur', 'Color', ['Light', 'Dark']);
  const variables = [
    variable(couleur, 'fond', 'surface', 'COLOR', [blanc, noir]),
    variable(couleur, 'texte', 'text', 'COLOR', [noir, blanc]),
  ];
  const marque = extension('marque', 'Marque B', couleur, couleur, { fond: { 1: bleu } });
  const sousMarque = extension('sous', 'Marques/Sous Marque', marque, couleur, { fond: { 0: alias('texte') } });
  return { collections: [couleur, marque, sousMarque], variables };
}

test('les extensions se déclarent sur leur axe, et chaque surcharge est creuse et nommée par le mode racine', async () => {
  const { collections, variables } = fichierEtendu();
  const { tokens, warnings } = await exporter(collections, variables);

  assert.deepEqual(warnings, []);
  assert.deepEqual(tokens.$extensions['com.ucm.axes'], {
    color: {
      modes: ['light', 'dark'],
      default: 'light',
      extensions: { 'marque-b': { parent: 'base' }, 'marques-sous-marque': { parent: 'marque-b' } },
    },
  });
  assert.deepEqual(tokens.color.surface.$extensions['com.ucm.extensions'], {
    'marque-b': { dark: { colorSpace: 'srgb', components: [0, 0, 1], alpha: 1 } },
    'marques-sous-marque': { light: '{color.text}' },
  });
  assert.equal(tokens.color.text.$extensions['com.ucm.extensions'], undefined);
});

test('le kit lit le fichier exporté comme complet, et remonte la chaîne des extensions', async () => {
  const { collections, variables } = fichierEtendu();
  const { tokens } = await exporter(collections, variables);

  assert.equal(axesDeTokens(tokens).etat, 'complet');
  const contexte = (mode: string, extensionCourante: string) => ({ color: mode, 'color-extensions': extensionCourante });
  assert.deepEqual(valeurDansLeContexte(tokens, 'color.surface', contexte('dark', 'marques-sous-marque')), {
    colorSpace: 'srgb', components: [0, 0, 1], alpha: 1,
  });
  assert.equal(valeurDansLeContexte(tokens, 'color.surface', contexte('light', 'marques-sous-marque')), '{color.text}');
});

test('une extension nommée base, deux extensions homonymes ou une parente absente écartent les extensions sous un constat', async () => {
  const cas = [
    (couleur: VariableCollection) => [extension('b', 'Base', couleur, couleur, { fond: { 1: bleu } })],
    (couleur: VariableCollection) => [
      extension('a', 'Marque B', couleur, couleur, { fond: { 1: bleu } }),
      extension('b', 'marque-b', couleur, couleur),
    ],
    (couleur: VariableCollection) => {
      const distante = collection('bibliotheque', 'Library', ['Light', 'Dark']);
      return [extension('b', 'Marque B', distante, couleur, { fond: { 1: bleu } })];
    },
  ];
  const attendus = [
    'Collection « Base » : son nom donne l’extension « base », qui désigne la collection « Color » elle-même. '
      + 'Le développeur ne pourra pas générer les extensions de la collection « Color ». Renommez la collection '
      + 'étendue, puis réexportez.',
    'Collections « Marque B » et « marque-b » : leurs noms donnent la même extension « marque-b » de la '
      + 'collection « Color ». Le développeur ne pourra pas générer les extensions de la collection « Color ». '
      + 'Renommez les collections étendues pour que leurs noms diffèrent, puis réexportez.',
    'Collection « Marque B » : elle étend une collection qui n’est pas dans ce fichier. Le développeur ne '
      + 'pourra pas générer les extensions de la collection « Color ». Exportez les tokens depuis le fichier '
      + 'qui contient cette collection et sa parente.',
  ];

  for (const [rang, etendues] of cas.entries()) {
    const couleur = collection('couleur', 'Color', ['Light', 'Dark']);
    const variables = [variable(couleur, 'fond', 'surface', 'COLOR', [blanc, noir])];
    const { tokens, warnings } = await exporter([couleur, ...etendues(couleur)], variables);
    assert.deepEqual(warnings, [attendus[rang]], `cas ${rang}`);
    assert.deepEqual(tokens.$extensions['com.ucm.axes'].color, { modes: ['light', 'dark'], default: 'light' });
    assert.equal(tokens.color.surface.$extensions['com.ucm.extensions'], undefined);
    assert.equal(tokens.color.surface.$extensions['com.ucm.axis'], 'color');
  }
});

test('une collection étendue ne devient pas un axe, et ses modes hérités ne répètent pas une collision', () => {
  const couleur = collection('couleur', 'Color', ['Light', 'light']);
  const marque = extension('marque', 'Marque B', couleur, couleur);
  assert.equal(modeCollisionWarnings([couleur, marque]).length, 1);
});

test('le résumé des tokens compte une fois une variable héritée par une extension', async () => {
  const { collections, variables } = fichierEtendu();
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    variables: { getLocalVariableCollectionsAsync: async () => collections },
  };
  try {
    assert.equal(variables.length, 2);
    assert.equal((await etatDesTokensDuFichier()).resume, '3 collections · 2 variables · 2 modes');
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
  }
});
