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
    assert.match(warnings[0], /« foo-bar » : même nom normalisé que « Foo Bar »/);
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
