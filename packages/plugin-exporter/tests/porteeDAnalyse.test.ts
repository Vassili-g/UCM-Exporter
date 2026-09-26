/** Une ouverture refusée ne peut emprunter la mémoire ni l'annulation d'un autre export. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUDGET_DE_CALCUL_MS, dansUnePorteeDAnalyse, maitreDe, respirerSiBesoin,
} from '../src/contract/porteeDAnalyse';

function attente() {
  let terminer!: () => void;
  const promesse = new Promise<void>((resolve) => { terminer = resolve; });
  return { promesse, terminer };
}

test('une portée refusée ne respire pas avec l’annulation de la portée ouverte', async () => {
  const maintenant = Date.now;
  let horloge = 0;
  Date.now = () => horloge;
  try {
    await dansUnePorteeDAnalyse({ respirer: async () => { throw new Error('annulation étrangère'); } }, async () => {
      await dansUnePorteeDAnalyse({}, async () => {
        horloge += BUDGET_DE_CALCUL_MS + 1;
        await respirerSiBesoin();
      });
    });
  } finally { Date.now = maintenant; }
});

test('une portée refusée encore ouverte empêche une troisième de prêter sa mémoire', async () => {
  const premiere = attente();
  const deuxieme = attente();
  let lectures = 0;
  const maitre = {} as ComponentNode;
  const instance = { id: 'instance', getMainComponentAsync: async () => { lectures += 1; return maitre; } } as InstanceNode;
  const a = dansUnePorteeDAnalyse({}, () => premiere.promesse);
  const b = dansUnePorteeDAnalyse({}, () => deuxieme.promesse);
  premiere.terminer();
  await a;
  await dansUnePorteeDAnalyse({}, async () => {
    await maitreDe(instance);
    await maitreDe(instance);
  });
  deuxieme.terminer();
  await b;
  assert.equal(lectures, 2);
});
