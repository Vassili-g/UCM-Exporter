/**
 * Tests du module de nommage commun aux deux commandes.
 *
 * L'enjeu central est ici : `normalizeName()` a plusieurs entrées pour une
 * sortie, donc deux variables Figma peuvent se disputer un nom de token. Si
 * les deux commandes ne tranchent pas de la MÊME façon, un contrat cite un
 * token dont la valeur appartient à une autre variable — une couleur fausse
 * qui traverse tous les garde-fous, puisque le token existe bel et bien.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { indexVariables, VariableNameResolver } from '../src/variables';

const collection = (id: string, name: string) =>
  ({ id, name }) as unknown as VariableCollection;
const variable = (id: string, name: string, collectionId: string) =>
  ({ id, name, variableCollectionId: collectionId }) as unknown as Variable;

/** Stub minimal de l'API Figma : le résolveur n'en utilise que ces deux appels. */
function stubFigma(variables: Variable[], collections: VariableCollection[]) {
  const previous = (globalThis as { figma?: unknown }).figma;
  const variableById = new Map(variables.map((entry) => [entry.id, entry]));
  const collectionById = new Map(collections.map((entry) => [entry.id, entry]));
  let appels = 0;
  (globalThis as { figma?: unknown }).figma = {
    variables: {
      getVariableByIdAsync: async (id: string) => {
        appels += 1;
        return variableById.get(id) ?? null;
      },
      getVariableCollectionByIdAsync: async (id: string) => collectionById.get(id) ?? null,
    },
  };
  return {
    appels: () => appels,
    restaurer: () => {
      (globalThis as { figma?: unknown }).figma = previous;
    },
  };
}

test('indexVariables départage deux collections qui donnent le même nom normalisé', () => {
  // Cas non évident : la collision ne vient pas des variables mais des
  // COLLECTIONS, « Brand Tokens » et « brand-tokens » donnant le même préfixe.
  const premiere = variable('v1', 'primary', 'c1');
  const seconde = variable('v2', 'primary', 'c2');

  const index = indexVariables(
    [premiere, seconde],
    new Map([
      ['c1', collection('c1', 'Brand Tokens')],
      ['c2', collection('c2', 'brand-tokens')],
    ]),
  );

  assert.deepEqual([...index.variableByPath.keys()], ['brand-tokens.primary']);
  assert.equal(index.ambiguous.get('v2')?.path, 'brand-tokens.primary');
});

test('indexVariables refuse une collision feuille/groupe quel que soit l’ordre Figma', () => {
  const feuille = variable('leaf', 'Foo', 'c');
  const enfant = variable('child', 'Foo/Bar', 'c');
  const collections = new Map([['c', collection('c', 'Brand')]]);

  const feuilleDabord = indexVariables([feuille, enfant], collections);
  assert.deepEqual([...feuilleDabord.variableByPath.keys()], ['brand.foo']);
  assert.equal(feuilleDabord.pathById.has('child'), false);
  assert.deepEqual(feuilleDabord.ambiguous.get('child'), {
    name: 'Foo/Bar',
    owner: 'Foo',
    path: 'brand.foo.bar',
    ownerPath: 'brand.foo',
    kind: 'leaf-group',
  });

  const enfantDabord = indexVariables([enfant, feuille], collections);
  assert.deepEqual([...enfantDabord.variableByPath.keys()], ['brand.foo.bar']);
  assert.equal(enfantDabord.pathById.has('leaf'), false);
  assert.deepEqual(enfantDabord.ambiguous.get('leaf'), {
    name: 'Foo',
    owner: 'Foo/Bar',
    path: 'brand.foo',
    ownerPath: 'brand.foo.bar',
    kind: 'leaf-group',
  });
});

test('le résolveur ne produit jamais un alias vers la variable écartée d’une collision feuille/groupe', async () => {
  const feuille = variable('leaf', 'Foo', 'c');
  const enfant = variable('child', 'Foo/Bar', 'c');
  const collections = [collection('c', 'Brand')];
  const figmaStub = stubFigma([feuille, enfant], collections);

  try {
    const index = indexVariables([feuille, enfant], new Map([['c', collections[0]]]));
    const warnings: string[] = [];
    const resolver = new VariableNameResolver({ index, warnings });

    assert.equal(
      await resolver.resolve({ type: 'VARIABLE_ALIAS', id: 'child' } as VariableAlias),
      null,
    );
    assert.equal(figmaStub.appels(), 0);
    assert.match(warnings[0], /à la fois une valeur et un groupe de tokens/);
  } finally {
    figmaStub.restaurer();
  }
});

test('le résolveur refuse d’écrire une référence pour une variable ambiguë', async () => {
  const gagnante = variable('v1', 'Foo Bar', 'c');
  const perdante = variable('v2', 'foo-bar', 'c');
  const collections = [collection('c', 'Brand')];
  const figmaStub = stubFigma([gagnante, perdante], collections);

  try {
    const index = indexVariables([gagnante, perdante], new Map([['c', collections[0]]]));
    const warnings: string[] = [];
    const resolver = new VariableNameResolver({ index, warnings });

    const surLaGagnante = await resolver.resolve({ type: 'VARIABLE_ALIAS', id: 'v1' } as VariableAlias);
    const surLaPerdante = await resolver.resolve({ type: 'VARIABLE_ALIAS', id: 'v2' } as VariableAlias);

    // La gagnante garde son nom : c'est bien elle que porte `tokens.json`.
    assert.equal(surLaGagnante, 'brand.foo-bar');
    // La perdante n'en obtient AUCUN : écrire « brand.foo-bar » ici peindrait
    // le calque avec la valeur de sa rivale.
    assert.equal(surLaPerdante, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /« foo-bar » : une fois normalisé, son nom est identique à celui de « Foo Bar »/);
  } finally {
    figmaStub.restaurer();
  }
});

test('le résolveur ne signale une variable ambiguë qu’une fois, même liée partout', async () => {
  const gagnante = variable('v1', 'Foo Bar', 'c');
  const perdante = variable('v2', 'foo-bar', 'c');
  const collections = [collection('c', 'Brand')];
  const figmaStub = stubFigma([gagnante, perdante], collections);

  try {
    const index = indexVariables([gagnante, perdante], new Map([['c', collections[0]]]));
    const warnings: string[] = [];
    const resolver = new VariableNameResolver({ index, warnings });
    const alias = { type: 'VARIABLE_ALIAS', id: 'v2' } as VariableAlias;

    await Promise.all([resolver.resolve(alias), resolver.resolve(alias), resolver.resolve(alias)]);

    // Un composant lie la même variable des dizaines de fois : le cache du
    // résolveur doit valoir aussi pour le message.
    assert.equal(warnings.length, 1);
  } finally {
    figmaStub.restaurer();
  }
});

test('le résolveur sert l’index sans appeler l’API, et garde l’API pour les bibliothèques', async () => {
  const locale = variable('v1', 'Primary/default', 'c');
  const collections = [collection('c', 'Brand')];
  const figmaStub = stubFigma([locale], collections);

  try {
    const index = indexVariables([locale], new Map([['c', collections[0]]]));
    const resolver = new VariableNameResolver({ index });

    assert.equal(
      await resolver.resolve({ type: 'VARIABLE_ALIAS', id: 'v1' } as VariableAlias),
      'brand.primary.default',
    );
    // Variable locale : lue dans l'index, sans aller-retour.
    assert.equal(figmaStub.appels(), 0);

    // Variable d'une bibliothèque partagée : absente de l'index, donc résolue
    // par l'API — ce chemin ne doit surtout pas disparaître.
    await resolver.resolve({ type: 'VARIABLE_ALIAS', id: 'distante' } as VariableAlias);
    assert.equal(figmaStub.appels(), 1);
  } finally {
    figmaStub.restaurer();
  }
});

test('le résolveur signale une variable liée introuvable une seule fois avec son contexte', async () => {
  const figmaStub = stubFigma([], []);

  try {
    const warnings: string[] = [];
    const resolver = new VariableNameResolver({ warnings });
    const missing = { type: 'VARIABLE_ALIAS', id: 'VariableID:deleted' } as VariableAlias;

    const resolved = await Promise.all([
      resolver.resolve(missing, { nodeName: 'Ancien fond', field: 'remplissage' }),
      resolver.resolve(missing, { nodeName: 'Autre calque', field: 'strokes' }),
      resolver.resolve(missing, { nodeName: 'Troisième calque', field: 'remplissage' }),
    ]);

    assert.deepEqual(resolved, [null, null, null]);
    assert.equal(figmaStub.appels(), 1);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Variable introuvable/);
    assert.match(warnings[0], /Ancien fond/);
    assert.match(warnings[0], /remplissage/);
    assert.match(warnings[0], /Reliez de nouveau une variable existante/);
  } finally {
    figmaStub.restaurer();
  }
});

test('le résolveur ne fabrique pas un chemin sans collection pour une variable distante', async () => {
  const distante = variable('remote', 'Primary/default', 'collection-missing');
  const figmaStub = stubFigma([distante], []);

  try {
    const warnings: string[] = [];
    const resolver = new VariableNameResolver({ warnings });

    const resolved = await resolver.resolve(
      { type: 'VARIABLE_ALIAS', id: 'remote' } as VariableAlias,
      { nodeName: 'Fond', field: 'remplissage' },
    );

    assert.equal(resolved, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /sa collection est introuvable/);
    assert.match(warnings[0], /Primary\/default/);
  } finally {
    figmaStub.restaurer();
  }
});
