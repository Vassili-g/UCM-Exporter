/**
 * La trace de mesure : muette hors d'une trace ouverte, une étape par étape
 * prévue, un avancement qui ne recule pas, et une empreinte qui ignore la date
 * d'export.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import handleExportComponent, { ETAPES_DE_L_ANALYSE } from '../src/contract/exportComponent';
import {
  abandonnerLaMesure, avancementCourant, avancer, empreinteDuContrat, etape, fermerLaMesure, ouvrirLaMesure,
} from '../src/contract/mesure';
import { node } from './aides/figmaFaux';

/** Un composant seul, un texte, et le strict nécessaire du faux `figma`. */
function monterUnComposant(texte = 'Suivant') {
  const composant = node('COMPONENT', 'Root', [
    node('TEXT', 'Leaf', [], { characters: texte }),
  ], { layoutMode: 'HORIZONTAL', componentPropertyDefinitions: {} });
  const page = node('PAGE', 'Page', [composant]);
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, { selection: [composant] }),
    root: { name: 'Fichier' },
    fileKey: null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => [],
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => null,
    },
  };
  return () => {
    (globalThis as { figma?: unknown }).figma = precedent;
  };
}

test('hors d’une trace ouverte, l’analyse ne relève rien et le contrat ne change pas', async () => {
  const restaurer = monterUnComposant();
  try {
    ouvrirLaMesure(ETAPES_DE_L_ANALYSE);
    const mesure = (await handleExportComponent()).content;
    assert.ok(fermerLaMesure(mesure));
    const sans = (await handleExportComponent()).content;
    assert.equal(fermerLaMesure(sans), null);
    assert.equal(avancementCourant(), null);
    assert.equal(empreinteDuContrat(sans), empreinteDuContrat(mesure));
  } finally {
    restaurer();
  }
});

test('une trace ouverte relève chaque étape prévue de l’analyse, ses compteurs et l’empreinte', async () => {
  const restaurer = monterUnComposant();
  try {
    ouvrirLaMesure(ETAPES_DE_L_ANALYSE);
    const contenu = (await handleExportComponent()).content;
    const trace = fermerLaMesure(contenu);
    assert.ok(trace);
    assert.equal(trace.empreinte, empreinteDuContrat(contenu));
    const etapes = trace.etapes.map((entree) => entree.nom);
    assert.deepEqual(etapes, ETAPES_DE_L_ANALYSE.map((prevue) => prevue.nom));
    assert.ok((trace.compteurs.appelsGetAllNodes ?? 0) > 0);
    assert.ok((trace.compteurs.nodesParcourus ?? 0) > 0);
  } finally {
    restaurer();
  }
});

test('l’avancement pèse les étapes prévues, compte la boucle en cours et ne recule jamais', () => {
  ouvrirLaMesure([{ nom: 'a', poids: 1 }, { nom: 'b', poids: 2 }, { nom: 'c', poids: 1 }]);
  try {
    assert.deepEqual(avancementCourant(), { fraction: 0 });
    etape('a');
    assert.deepEqual(avancementCourant(), { fraction: 0 });
    etape('b');
    assert.deepEqual(avancementCourant(), { fraction: 0.25 });
    avancer(1, 2);
    assert.deepEqual(avancementCourant(), { fraction: 0.5, fait: 1, total: 2 });
    // Une étape imprévue, puis une étape déjà passée, laissent la barre en place.
    etape('imprevue');
    etape('a');
    assert.equal(avancementCourant()?.fraction, 0.5);
    avancer(0, 4, false);
    assert.deepEqual(avancementCourant(), { fraction: 0.5 });
    etape('c');
    assert.equal(avancementCourant()?.fraction, 0.75);
  } finally {
    abandonnerLaMesure();
  }
  assert.equal(avancementCourant(), null);
});

test('sans étapes prévues, la trace mesure sans rendre d’avancement', () => {
  ouvrirLaMesure();
  etape('lecture');
  assert.equal(avancementCourant(), null);
  const trace = fermerLaMesure('{}');
  assert.deepEqual(trace?.etapes.map((entree) => entree.nom), ['lecture']);
});

test('l’empreinte ignore la date d’export et suit le composant', async () => {
  const restaurerA = monterUnComposant('Suivant');
  let premier: string;
  try {
    premier = (await handleExportComponent()).content;
  } finally {
    restaurerA();
  }
  const autreDate = premier.replace(/("exportedAt"\s*:\s*)"[^"]*"/, '$1"2001-01-01T00:00:00.000Z"');
  assert.notEqual(autreDate, premier);
  assert.equal(empreinteDuContrat(autreDate), empreinteDuContrat(premier));

  const restaurerB = monterUnComposant('Précédent');
  try {
    const second = (await handleExportComponent()).content;
    assert.notEqual(empreinteDuContrat(second), empreinteDuContrat(premier));
  } finally {
    restaurerB();
  }
});
