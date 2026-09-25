/**
 * La trace de mesure : muette hors du build de mesure, une seule sortie par
 * analyse dans ce build, et une empreinte qui ignore la date d'export.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import handleExportComponent from '../src/contract/exportComponent';
import { empreinteDuContrat } from '../src/contract/mesure';
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

/** Les sorties `[ucm:mesure]` de `console.log` pendant `corps`. */
async function tracesPendant(corps: () => Promise<unknown>): Promise<string[]> {
  const traces: string[] = [];
  const log = console.log;
  console.log = (...args: unknown[]) => {
    if (args[0] === '[ucm:mesure]') traces.push(String(args[1]));
    else log(...args);
  };
  try {
    await corps();
  } finally {
    console.log = log;
  }
  return traces;
}

function poserLaConstante(valeur: boolean | undefined): void {
  if (valeur === undefined) delete (globalThis as { __UCM_MESURE__?: boolean }).__UCM_MESURE__;
  else (globalThis as { __UCM_MESURE__?: boolean }).__UCM_MESURE__ = valeur;
}

test('sans la constante, l’analyse n’imprime aucune trace et le contrat ne change pas', async () => {
  const restaurer = monterUnComposant();
  try {
    poserLaConstante(true);
    let mesure = '';
    await tracesPendant(async () => {
      mesure = (await handleExportComponent()).content;
    });
    poserLaConstante(undefined);
    let sans = '';
    const traces = await tracesPendant(async () => {
      sans = (await handleExportComponent()).content;
    });
    assert.deepEqual(traces, []);
    assert.equal(empreinteDuContrat(sans), empreinteDuContrat(mesure));
  } finally {
    poserLaConstante(undefined);
    restaurer();
  }
});

test('avec la constante, chaque analyse imprime une seule trace, étapes et compteurs compris', async () => {
  const restaurer = monterUnComposant();
  try {
    poserLaConstante(true);
    let contenu = '';
    const traces = await tracesPendant(async () => {
      contenu = (await handleExportComponent()).content;
    });
    assert.equal(traces.length, 1);
    const trace = JSON.parse(traces[0]);
    assert.equal(trace.empreinte, empreinteDuContrat(contenu));
    const etapes = trace.etapes.map((entree: { nom: string }) => entree.nom);
    for (const nom of ['index', 'composition', 'wrapper', 'structure', 'echantillons', 'compaction', 'serialisation']) {
      assert.ok(etapes.includes(nom), `étape ${nom} absente de ${etapes.join(', ')}`);
    }
    assert.ok(trace.compteurs.appelsGetAllNodes > 0);
    assert.ok(trace.compteurs.nodesParcourus > 0);

    const secondes = await tracesPendant(() => handleExportComponent());
    assert.equal(secondes.length, 1);
  } finally {
    poserLaConstante(undefined);
    restaurer();
  }
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
