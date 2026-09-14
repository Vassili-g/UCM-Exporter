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

test('une collection à un seul mode que des extensions surchargent devient un axe, lu complet par le kit', async () => {
  const theme = collection('theme', 'Theme', ['Default']);
  const variables = [variable(theme, 'fond', 'surface', 'COLOR', [blanc])];
  const marque = extension('marque', 'Marque B', theme, theme, { fond: { 0: bleu } });
  const { tokens, warnings } = await exporter([theme, marque], variables);

  assert.deepEqual(warnings, []);
  assert.deepEqual(tokens.$extensions['com.ucm.axes'], {
    theme: { modes: ['default'], default: 'default', extensions: { 'marque-b': { parent: 'base' } } },
  });
  assert.deepEqual(tokens.theme.surface.$extensions['com.ucm.extensions'], {
    'marque-b': { default: { colorSpace: 'srgb', components: [0, 0, 1], alpha: 1 } },
  });
  assert.equal(axesDeTokens(tokens).etat, 'complet');
  assert.deepEqual(valeurDansLeContexte(tokens, 'theme.surface', { 'theme-extensions': 'marque-b' }), {
    colorSpace: 'srgb', components: [0, 0, 1], alpha: 1,
  });

  const seule = collection('seule', 'Theme', ['Default']);
  const ecartee = extension('base', 'Base', seule, seule, { fond2: { 0: bleu } });
  const voisin = await exporter([seule, ecartee], [variable(seule, 'fond2', 'surface', 'COLOR', [blanc])]);
  assert.equal(voisin.warnings.length, 1, 'le constat de l’extension écartée reste');
  assert.deepEqual(voisin.tokens.$extensions, { 'com.ucm.formatVersion': 2 });
  assert.equal(voisin.tokens.theme.surface.$extensions, undefined);
});

test('une extension d’une collection de bibliothèque est nommée une fois par collection distante', async () => {
  const couleur = collection('couleur', 'Color', ['Light', 'Dark']);
  const variables = [variable(couleur, 'texte', 'text', 'COLOR', [noir, blanc])];
  const bibliotheque = collection('bibliotheque', 'Library', ['Light', 'Dark']);
  const marque = extension('marque', 'Marque B', bibliotheque, bibliotheque, { distante: { 1: bleu } });
  const sousMarque = extension('sous', 'Sous Marque', marque, bibliotheque);
  const { tokens, warnings } = await exporter([couleur, marque, sousMarque], variables);

  assert.deepEqual(warnings, [
    'Collections « Marque B » et « Sous Marque » : elles étendent une collection d’une bibliothèque. '
      + 'Le développeur n’aura pas leurs surcharges. Créez les collections étendues dans le fichier de la '
      + 'bibliothèque, puis réexportez depuis ce fichier.',
  ]);
  assert.deepEqual(tokens.$extensions['com.ucm.axes'], { color: { modes: ['light', 'dark'], default: 'light' } });
});

test('deux extensions dont les noms donnent le même nom CSS, ou un nom CSS base ou vide, sont écartées', async () => {
  const cas: [string[], string][] = [
    [['Marque B', 'Marque_B'], 'Collections « Marque B » et « Marque_B » : leurs noms donnent la même extension « marque-b »'],
    [['Base!'], 'Collection « Base! » : son nom donne l’extension « base »'],
    [['!!!'], 'Collection « !!! » : son nom ne donne aucun nom d’extension.'],
  ];
  for (const [noms, debut] of cas) {
    const couleur = collection('couleur', 'Color', ['Light', 'Dark']);
    const variables = [variable(couleur, 'fond', 'surface', 'COLOR', [blanc, noir])];
    const etendues = noms.map((nom, rang) => extension(`e${rang}`, nom, couleur, couleur, { fond: { 1: bleu } }));
    const { tokens, warnings } = await exporter([couleur, ...etendues], variables);
    assert.equal(warnings.length, 1, noms.join(', '));
    assert.ok(warnings[0].startsWith(debut), warnings[0]);
    assert.equal(tokens.color.surface.$extensions['com.ucm.extensions'], undefined);
  }

  const couleur = collection('couleur', 'Color', ['Light', 'Dark']);
  const voisines = ['Marque B', 'Marque C'].map((nom, rang) => extension(`e${rang}`, nom, couleur, couleur, { fond: { 1: bleu } }));
  const voisin = await exporter([couleur, ...voisines], [variable(couleur, 'fond', 'surface', 'COLOR', [blanc, noir])]);
  assert.deepEqual(voisin.warnings, []);
});

test('une surcharge qui cite un autre type de token, ou une graisse inconnue, nomme la collection étendue et le mode', async () => {
  const exporterAvec = (surchargeEspace: VariableValue, surchargePoids: VariableValue) => {
    const primitives = collection('primitives', 'Primitives', ['Mode 1']);
    const theme = collection('theme', 'Theme', ['Light', 'Dark']);
    const variables = [
      variable(primitives, 'quatre', 'dimensions/4', 'FLOAT', [4]),
      variable(primitives, 'huit', 'dimensions/8', 'FLOAT', [8]),
      variable(primitives, 'opacite', 'opacity/disabled', 'FLOAT', [0.4]),
      variable(theme, 'espace', 'spacing/base', 'FLOAT', [alias('quatre'), alias('quatre')]),
      variable(theme, 'poids', 'fontweight/base', 'STRING', ['Bold', 'Bold']),
    ];
    const marque = extension('marque', 'Marque B', theme, theme, { espace: { 1: surchargeEspace }, poids: { 1: surchargePoids } });
    return exporter([primitives, theme, marque], variables);
  };

  const ecarts = await exporterAvec(alias('opacite'), 'Condensed');
  assert.deepEqual(ecarts.warnings, [
    'Variable « fontweight/base » : dans le mode « Dark » de la collection « Marque B », sa graisse « Condensed » '
      + 'n’est pas un nom de graisse connu. Le développeur ne pourra pas générer la feuille CSS des tokens. '
      + 'Choisissez un nom de graisse standard, comme Regular ou Bold, puis réexportez.',
    'Variable « spacing/base » : dans le mode « Dark » de la collection « Marque B », elle cite « opacity/disabled », '
      + 'qui est un nombre sans unité, alors qu’elle est une longueur. Le développeur ne pourra pas générer la '
      + 'feuille CSS des tokens. Liez dans ce mode une variable du même type, puis réexportez.',
  ]);

  const voisin = await exporterAvec(alias('huit'), 'SemiBold');
  assert.deepEqual(voisin.warnings, []);
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
