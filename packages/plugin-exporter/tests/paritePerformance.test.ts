/**
 * La portée d'analyse ne change aucun contrat, elle résout chaque maître une
 * fois, et ses respirations ne changent rien au résultat.
 *
 * Le banc lui-même (`aides/parite.ts`) tourne sur chaque export de
 * `figmaFaux.handleExportComponent`. Ce fichier y soumet un set où la mémoire
 * sert : huit variants, deux instances d'une même dépendance dans chacun.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import exporterLeComposant, { ETAPES_DE_L_ANALYSE } from '../src/contract/exportComponent';
import { abandonnerLaMesure, avancementCourant, ouvrirLaMesure } from '../src/contract/mesure';
import type { Avancement } from '../src/contract/mesure';
import { respirerSiBesoin } from '../src/contract/porteeDAnalyse';
import { conteneurDeRegles, handleExportComponent, node } from './aides/figmaFaux';
import { sansDate } from './aides/parite';

/**
 * Un set `Root` de `nombre` variants. Chaque variant embarque deux instances de
 * `Branch`, contracté par un conteneur de règles posé sur la même page.
 * `appels` compte les `getMainComponentAsync` par id d'instance.
 */
function monterLeSet(nombre = 8) {
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
  const tailles = Array.from({ length: nombre }, (_, rang) => `T${rang + 1}`);
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

/**
 * Une horloge qui avance de 31 ms à chaque lecture : chaque appel à
 * `respirerSiBesoin` trouve son budget écoulé.
 */
function horlogeRapide(): () => void {
  const vraie = Date.now;
  let instant = vraie();
  Date.now = () => (instant += 31);
  return () => {
    Date.now = vraie;
  };
}

test('une annulation pendant la boucle des variants arrête l’analyse avant le variant suivant', async () => {
  const fichier = monterLeSet(8);
  const remettre = horlogeRapide();
  try {
    class Annulee extends Error {}
    // Après « Écriture du contrat… », seule la boucle par variant de
    // `extractStructure` respire : le compte dit où l'analyse en est.
    let ecriture = false;
    let dansLaBoucle = 0;
    const annoncer = (etape: string) => {
      if (etape.startsWith('Écriture')) ecriture = true;
    };
    await exporterLeComposant(annoncer, {
      respirer: async () => {
        if (ecriture) dansLaBoucle += 1;
      },
    });
    assert.equal(dansLaBoucle, 8, 'la boucle ne respire pas une fois par variant');

    ecriture = false;
    dansLaBoucle = 0;
    await assert.rejects(exporterLeComposant(annoncer, {
      respirer: async () => {
        if (!ecriture) return;
        dansLaBoucle += 1;
        if (dansLaBoucle === 2) throw new Annulee();
      },
    }), Annulee);
    assert.equal(dansLaBoucle, 2, 'l’analyse a continué après l’annulation');
  } finally {
    remettre();
    fichier.restaurer();
  }
});

test('quarante variants donnent le même contrat et les mêmes avertissements, avec ou sans respirations', async () => {
  const fichier = monterLeSet(40);
  try {
    const sans = await exporterLeComposant();
    let respirations = 0;
    const remettre = horlogeRapide();
    let avec: Awaited<ReturnType<typeof exporterLeComposant>>;
    try {
      avec = await exporterLeComposant(() => {}, {
        respirer: () => {
          respirations += 1;
          return new Promise((resolve) => setTimeout(resolve, 0));
        },
      });
    } finally {
      remettre();
    }
    // Deux entre les trois tranches du relevé de composition, et une par variant.
    assert.ok(respirations >= 42, `${respirations} respirations`);
    assert.equal(sansDate(avec.content), sansDate(sans.content));
    assert.deepEqual(avec.warnings, sans.warnings);
  } finally {
    fichier.restaurer();
  }
});

test('à chaque respiration, l’avancement compte les variants de la boucle et ne recule jamais', async () => {
  const fichier = monterLeSet(8);
  const remettre = horlogeRapide();
  const releves: Avancement[] = [];
  ouvrirLaMesure(ETAPES_DE_L_ANALYSE);
  try {
    await exporterLeComposant(() => {}, {
      respirer: async () => {
        const avancement = avancementCourant();
        if (avancement) releves.push(avancement);
      },
    });
  } finally {
    abandonnerLaMesure();
    remettre();
    fichier.restaurer();
  }
  const comptes = releves.filter(({ total }) => total === 8).map(({ fait }) => fait);
  assert.deepEqual(comptes, [0, 1, 2, 3, 4, 5, 6, 7]);
  for (let rang = 1; rang < releves.length; rang += 1) {
    assert.ok(releves[rang].fraction >= releves[rang - 1].fraction, 'la barre a reculé');
  }
  assert.ok(releves.at(-1)!.fraction < 1);
});

test('hors portée, respirerSiBesoin ne rend jamais la main', async () => {
  const remettre = horlogeRapide();
  try {
    let tic = false;
    setTimeout(() => {
      tic = true;
    }, 0);
    await respirerSiBesoin();
    await respirerSiBesoin();
    assert.equal(tic, false);
  } finally {
    remettre();
  }
});
