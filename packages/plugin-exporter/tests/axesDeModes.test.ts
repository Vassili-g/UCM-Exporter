/**
 * Les axes de modes que l'export des tokens écrit : `com.ucm.axes` à la racine,
 * `com.ucm.axis` sur chaque feuille d'un axe retenu, et les constats qui
 * écartent un axe ou nomment un alias d'un autre type. Chaque fichier est
 * réduit aux collections que le cas demande.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { alias, collection, exporterLeFichier, rgba, variable } from './fichierDeVariables';

/** Exporte un fichier réduit, sans text style, et rend le document relu et les avertissements. */
async function exporter(collections: VariableCollection[], variables: Variable[]) {
  const exporte = await exporterLeFichier({ fichier: { collections, variables, textStyles: [] } });
  return { tokens: JSON.parse(exporte.content), warnings: exporte.warnings };
}

const blanc = rgba(1, 1, 1, 1);
const noir = rgba(0, 0, 0, 1);

test('une collection à plusieurs modes devient un axe, défaut non premier compris, et sa feuille le nomme', async () => {
  const primitives = collection('primitives', 'Primitives', ['Mode 1']);
  const theme = collection('theme', 'Theme', ['Light', 'Dark'], 'Dark');
  const { tokens, warnings } = await exporter([primitives, theme], [
    variable(primitives, 'blanc', 'color/white', 'COLOR', [blanc]),
    variable(theme, 'fond', 'surface', 'COLOR', [alias('blanc'), noir]),
  ]);

  assert.deepEqual(Object.keys(tokens.$extensions), ['com.ucm.formatVersion', 'com.ucm.axes']);
  assert.deepEqual(tokens.$extensions['com.ucm.axes'], { theme: { modes: ['light', 'dark'], default: 'dark' } });
  assert.deepEqual(Object.keys(tokens.theme.surface.$extensions), ['com.ucm.axis', 'com.ucm.modes']);
  assert.equal(tokens.theme.surface.$extensions['com.ucm.axis'], 'theme');
  assert.deepEqual(tokens.theme.surface.$value, { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 });
  assert.equal(tokens.primitives.color.white.$extensions, undefined);
  assert.deepEqual(warnings, []);
});

test('des préfixes imbriqués gardent chacun leur axe : le premier segment ne désigne pas la collection', async () => {
  const couleur = collection('couleur', 'Color', ['Light', 'Dark']);
  const marque = collection('marque', 'Color/Brand', ['A', 'B']);
  const { tokens } = await exporter([couleur, marque], [
    variable(couleur, 'surface', 'surface', 'COLOR', [blanc, noir]),
    variable(marque, 'primaire', 'primary', 'COLOR', [blanc, noir]),
    // Le nom répète le préfixe : `joinTokenPath` ne l'ajoute pas une seconde fois.
    variable(couleur, 'texte', 'color/text', 'COLOR', [noir, blanc]),
  ]);

  assert.deepEqual(Object.keys(tokens.$extensions['com.ucm.axes']), ['color', 'color.brand']);
  assert.equal(tokens.color.surface.$extensions['com.ucm.axis'], 'color');
  assert.equal(tokens.color.brand.primary.$extensions['com.ucm.axis'], 'color.brand');
  assert.equal(tokens.color.text.$extensions['com.ucm.axis'], 'color');
});

test('un fichier sans collection à plusieurs modes ne déclare aucun axe', async () => {
  const primitives = collection('primitives', 'Primitives', ['Mode 1']);
  const { tokens } = await exporter([primitives], [variable(primitives, 'blanc', 'color/white', 'COLOR', [blanc])]);
  assert.deepEqual(tokens.$extensions, { 'com.ucm.formatVersion': 2 });
});

test('deux collections au même préfixe perdent leur axe, gardent leurs modes, et un constat nomme les deux', async () => {
  const premiere = collection('premiere', 'Brand Tokens', ['A', 'B']);
  const seconde = collection('seconde', 'brand-tokens', ['A', 'B']);
  const { tokens, warnings } = await exporter([premiere, seconde], [
    variable(premiere, 'primaire', 'primary', 'COLOR', [blanc, noir]),
    variable(seconde, 'secondaire', 'secondary', 'COLOR', [noir, blanc]),
  ]);

  assert.deepEqual(tokens.$extensions['com.ucm.axes'], {});
  assert.deepEqual(Object.keys(tokens['brand-tokens'].primary.$extensions), ['com.ucm.modes']);
  assert.deepEqual(warnings, [
    'Collections « Brand Tokens » et « brand-tokens » : leurs noms donnent le même préfixe '
      + '« brand-tokens » dans le fichier de tokens. Le développeur ne pourra pas générer les modes '
      + 'de ces collections. Renommez les collections pour que leurs noms diffèrent, puis réexportez.',
  ]);
});

test('une collection sans préfixe, un mode sans nom ou un défaut introuvable écartent l’axe sous un constat', async () => {
  const sansPrefixe = collection('sans-prefixe', '{}', ['A', 'B']);
  const sansNom = collection('sans-nom', 'Theme', ['Light', '  ']);
  const sansDefaut = collection('sans-defaut', 'Density', ['Compact', 'Comfortable']);
  (sansDefaut as { defaultModeId: string }).defaultModeId = 'inexistant';
  const { tokens, warnings } = await exporter([sansPrefixe, sansNom, sansDefaut], [
    variable(sansPrefixe, 'a', 'orphan', 'COLOR', [blanc, noir]),
    variable(sansNom, 'b', 'surface', 'COLOR', [blanc, noir]),
    variable(sansDefaut, 'c', 'gap', 'FLOAT', [4, 8]),
  ]);

  assert.deepEqual(tokens.$extensions['com.ucm.axes'], {});
  const constats = warnings.filter((message) => message.startsWith('Collection « '));
  assert.deepEqual(constats, [
    'Collection « {} » : son nom ne donne aucun préfixe de token. Le développeur ne pourra pas '
      + 'générer les modes de cette collection. Donnez à la collection un nom qui contient une lettre '
      + 'ou un chiffre, puis réexportez.',
    'Collection « Theme » : un de ses modes n’a pas de nom. Le développeur ne pourra pas générer les '
      + 'modes de cette collection. Nommez chaque mode de la collection, puis réexportez.',
    'Collection « Density » : son mode par défaut est introuvable. Le développeur ne pourra pas '
      + 'générer les modes de cette collection. Choisissez de nouveau le mode par défaut de la '
      + 'collection, puis réexportez.',
  ]);
});

test('deux modes au même nom normalisé écartent l’axe sous le seul constat de collision', async () => {
  const theme = collection('theme', 'Theme', ['Light', 'light']);
  const { tokens, warnings } = await exporter([theme], [variable(theme, 'fond', 'surface', 'COLOR', [blanc, noir])]);

  assert.deepEqual(tokens.$extensions['com.ucm.axes'], {});
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /deux de ses modes donnent le même nom « light »/);
});

test('un mode qui cite une variable d’un autre type garde l’axe et nomme la variable, le mode et la cible', async () => {
  const primitives = collection('primitives', 'Primitives', ['Mode 1']);
  const theme = collection('theme', 'Theme', ['Light', 'Dark']);
  const variables = (cibleSombre: string) => [
    variable(primitives, 'quatre', 'dimensions/4', 'FLOAT', [4]),
    variable(primitives, 'huit', 'dimensions/8', 'FLOAT', [8]),
    variable(primitives, 'opacite', 'opacity/disabled', 'FLOAT', [0.4]),
    variable(theme, 'espace', 'spacing/base', 'FLOAT', [alias('quatre'), alias(cibleSombre)]),
  ];

  const ecart = await exporter([primitives, theme], variables('opacite'));
  assert.equal(ecart.tokens.theme.spacing.base.$extensions['com.ucm.axis'], 'theme');
  assert.deepEqual(ecart.warnings, [
    'Variable « spacing/base » : dans le mode « Dark », elle cite « opacity/disabled », qui est un '
      + 'nombre sans unité, alors qu’elle est une longueur. Le développeur ne pourra pas générer la '
      + 'feuille CSS des tokens. Liez dans ce mode une variable du même type, puis réexportez.',
  ]);

  const voisin = await exporter([primitives, theme], variables('huit'));
  assert.deepEqual(voisin.warnings, []);
});
