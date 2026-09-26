/**
 * La trace de mesure : muette hors d'une trace ouverte, une étape par étape
 * prévue, un avancement qui ne recule pas, et une empreinte qui ignore la date
 * d'export.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import handleExportComponent, { ETAPES_DE_L_ANALYSE } from '../src/contract/exportComponent';
import {
  abandonnerLaMesure, avancementCourant, avancer, compter, empreinteDuContrat, etape, fermerLaMesure,
  ouvrirLaMesure,
  retenirLeMaximum,
} from '../src/contract/mesure';
import { node } from './aides/figmaFaux';
import { tempsRestant } from '../src/ui/components/CarteCommande';

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

test('le temps restant s’estime après 2 s et 5 % d’avancement, d’après le temps écoulé', () => {
  ouvrirLaMesure([{ nom: 'a', poids: 1 }, { nom: 'b', poids: 1 }, { nom: 'c', poids: 98 }]);
  const debut = Date.now();
  try {
    etape('a');
    etape('b');
    // 1 % fait : trop peu pour extrapoler, même après 10 s.
    assert.equal(avancementCourant(debut + 10_000)?.resteMs, undefined);
    etape('c');
    avancer(48, 98);
    // 50 % fait : avant 2 s, rien ; à 4 s, il reste autant que fait.
    assert.equal(avancementCourant(debut + 1_500)?.resteMs, undefined);
    const reste = avancementCourant(debut + 4_000)?.resteMs ?? 0;
    assert.ok(reste >= 3_900 && reste <= 4_100, `${reste} ms`);
  } finally {
    abandonnerLaMesure();
  }
});

test('le rythme du temps restant se mesure depuis l’étape qui en marque l’origine', () => {
  ouvrirLaMesure([
    { nom: 'a', poids: 50 },
    { nom: 'b', poids: 0, origineDuRythme: true },
    { nom: 'c', poids: 50 },
  ]);
  try {
    etape('a');
    avancer(1, 2);
    // 25 % fait, mais avant l'origine : aucune estimation, même après 10 s.
    assert.equal(avancementCourant(Date.now() + 10_000)?.resteMs, undefined);
    etape('b');
    const origine = Date.now();
    etape('c');
    avancer(25, 50);
    // 75 % fait, dont 25 % depuis l'origine en 4 s : il reste 25 %, donc 4 s.
    const reste = avancementCourant(origine + 4_000)?.resteMs ?? 0;
    assert.ok(reste >= 3_900 && reste <= 4_100, `${reste} ms`);
  } finally {
    abandonnerLaMesure();
  }
});

test('une étape prévue sans compte tait celui de sa boucle', () => {
  ouvrirLaMesure([{ nom: 'a', poids: 1, compte: false }, { nom: 'b', poids: 1 }]);
  try {
    etape('a');
    avancer(1, 4);
    assert.deepEqual(avancementCourant(), { fraction: 0.125 });
    etape('b');
    avancer(1, 4);
    assert.deepEqual(avancementCourant(), { fraction: 0.625, fait: 1, total: 4 });
  } finally {
    abandonnerLaMesure();
  }
});

test('le temps restant s’écrit en secondes, par pas de 5 au-delà de 20, puis en minutes', () => {
  assert.equal(tempsRestant(300), 'Environ 1 s restante');
  assert.equal(tempsRestant(7_200), 'Environ 8 s restantes');
  assert.equal(tempsRestant(23_000), 'Environ 25 s restantes');
  assert.equal(tempsRestant(58_500), 'Environ 1 min restante');
  assert.equal(tempsRestant(61_000), 'Environ 1 min restante');
  assert.equal(tempsRestant(150_000), 'Environ 3 min restantes');
});

test('chaque étape porte ce que les compteurs additifs ont gagné pendant elle, sans les maximums', () => {
  ouvrirLaMesure();
  compter('respirations');
  etape('a');
  compter('respirations', 2);
  retenirLeMaximum('plusLongSilenceMs', 5);
  etape('b');
  etape('c');
  compter('respirations');
  const trace = fermerLaMesure('{}');
  assert.deepEqual(trace?.etapes.map((entree) => entree.compteurs), [
    { respirations: 2 },
    undefined,
    { respirations: 1 },
  ]);
  assert.equal(trace?.compteurs.respirations, 4);
});

test('un maximum retient le plus grand relevé, et se tait hors d’une trace ouverte', () => {
  retenirLeMaximum('plusLongSilenceMs', 40);
  ouvrirLaMesure();
  retenirLeMaximum('plusLongSilenceMs', 12);
  retenirLeMaximum('plusLongSilenceMs', 30);
  retenirLeMaximum('plusLongSilenceMs', 5);
  assert.equal(fermerLaMesure('{}')?.compteurs.plusLongSilenceMs, 30);
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
