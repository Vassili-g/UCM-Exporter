/**
 * La portée d'analyse ne change aucun contrat, et elle résout chaque maître
 * une fois.
 *
 * Le banc lui-même (`aides/parite.ts`) tourne sur chaque export de
 * `figmaFaux.handleExportComponent`. Ce fichier y soumet un set où la mémoire
 * sert : huit variants, deux instances d'une même dépendance dans chacun.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import exporterLeComposant from '../src/contract/exportComponent';
import { conteneurDeRegles, handleExportComponent, node } from './aides/figmaFaux';

/**
 * Un set `Root` de huit variants. Chaque variant embarque deux instances de
 * `Branch`, contracté par un conteneur de règles posé sur la même page.
 * `appels` compte les `getMainComponentAsync` par id d'instance.
 */
function monterLeSet() {
  const maitre = node('COMPONENT', 'Taille=Défaut', [node('TEXT', 'Leaf', [], { characters: 'Feuille' })], {
    layoutMode: 'HORIZONTAL',
  });
  const dependance = node('COMPONENT_SET', 'Branch', [maitre], {
    componentPropertyDefinitions: {},
    defaultVariant: maitre,
  });
  const appels = new Map<string, number>();
  const instance = (nom: string) => {
    const cree = node('INSTANCE', nom, [], {
      componentProperties: {},
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      // L'opacité fait relire le maître par `dependencyOpacity`, après
      // `contractedOwner` : sans elle, chaque instance n'est lue qu'une fois,
      // mémoire ou pas.
      opacity: 1,
    });
    cree.getMainComponentAsync = async () => {
      appels.set(cree.id, (appels.get(cree.id) ?? 0) + 1);
      return maitre;
    };
    return cree;
  };
  const tailles = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
  const variants = tailles.map((taille) => node('COMPONENT', `Taille=${taille}`, [
    node('TEXT', 'Glyph', [], { characters: taille }),
    instance('Branch A'),
    instance('Branch B'),
  ], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    variantProperties: { Taille: taille },
  }));
  const racine = node('COMPONENT_SET', 'Root', variants, {
    componentPropertyDefinitions: {
      Taille: { type: 'VARIANT', variantOptions: tailles, defaultValue: 'T1' },
    },
    defaultVariant: variants[0],
  });
  const page = node('PAGE', 'Composants', [racine, dependance, conteneurDeRegles('Branch')]);
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, { selection: [racine] }),
    root: { name: 'Fichier', children: [page] },
    fileKey: null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => [],
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => null,
    },
  };
  return {
    appels,
    restaurer: () => {
      (globalThis as { figma?: unknown }).figma = precedent;
    },
  };
}

test('huit variants qui embarquent la même dépendance donnent le même contrat avec et sans portée', async () => {
  const fichier = monterLeSet();
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);
    // Le scénario n'est probant que si la dépendance est reconnue : sinon la
    // mémoire ne servirait qu'à des instances décrites comme de simples calques.
    assert.deepEqual(
      contrat.composes.map((dependance: { component: string }) => dependance.component),
      ['Branch', 'Branch'],
    );
  } finally {
    fichier.restaurer();
  }
});

test('dans la portée, chaque instance ne demande son maître qu’une fois', async () => {
  const fichier = monterLeSet();
  try {
    await exporterLeComposant();
    assert.equal(fichier.appels.size, 16);
    for (const [id, nombre] of fichier.appels) {
      assert.equal(nombre, 1, `l'instance ${id} a demandé son maître ${nombre} fois`);
    }
  } finally {
    fichier.restaurer();
  }
});
