/** Séquences du routeur réel ; seuls les exports et les appels GitHub sont différés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { afterEach } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as format from '@ucm-kit/core/format';
import * as config from '../src/config';
import * as connexion from '../src/connexion';
import * as cible from '../src/cible';
import * as fenetre from '../src/fenetre';
import * as prevol from '../src/prevol';
import type { PluginMessage, UiRequest } from '../src/messages';

const source = ts.transpileModule(readFileSync(join(__dirname, '../src/code.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function differe<T>() {
  let resoudre!: (valeur: T) => void;
  const promesse = new Promise<T>((resolve) => { resoudre = resolve; });
  return { promesse, resoudre };
}

const resultat = (nom: string) => ({ filename: nom, content: '{}', warningCount: 0, warnings: [] });
const globalFigma = globalThis as unknown as { figma?: unknown };
const figmaInitial = globalFigma.figma;
afterEach(() => { globalFigma.figma = figmaInitial; });

function ouvrir() {
  const messages: PluginMessage[] = [];
  const evenements = new Map<string, () => void>();
  const temporisations = new Map<number, () => void>();
  const stockage = new Map<string, unknown>();
  const appels = { analyses: 0, publications: 0 };
  const exporte = { traiter: async () => resultat('tokens.json') };
  const publication = { traiter: async () => ({ status: 'created', path: 'tokens.json', pullRequestUrl: 'https://github.com/o/r/pull/1' }) };
  const runtime = {
    showUI() {}, notify() {}, openExternal() {},
    currentPage: { selection: [{ id: 'a', type: 'COMPONENT', name: 'Exemple' }] },
    ui: { postMessage: (message: PluginMessage) => messages.push(message), resize() {}, onmessage: async (_message: UiRequest) => {} },
    on: (nom: string, rappel: () => void) => evenements.set(nom, rappel),
    clientStorage: {
      getAsync: async (cle: string) => stockage.get(cle),
      setAsync: async (cle: string, valeur: unknown) => { stockage.set(cle, valeur); },
      deleteAsync: async (cle: string) => { stockage.delete(cle); },
    },
  };
  // La configuration et la fenêtre emploient le même runtime que le routeur.
  (globalThis as unknown as { figma: unknown }).figma = runtime;
  const handler = async () => { appels.analyses += 1; return exporte.traiter(); };
  const modules: Record<string, unknown> = {
    '@ucm-kit/core/format': format, './config': config, './connexion': connexion,
    './cible': cible, './fenetre': fenetre, './prevol': prevol,
    './contract/extractRules': { extractRules: async () => ({}), hasUsableRules: () => true },
    './contract/exportComponent': { default: handler },
    './tokens/exportTokens': { default: handler, annonceDuFormat: () => null, etatDesTokensDuFichier: async () => ({ presents: true, resume: '1 variable' }) },
    './github': {
      GithubApiError: Error,
      lireAvantEcriture: async () => ({ path: 'tokens.json', layout: { source: 'configuration' } }),
      publishArtifact: async () => { appels.publications += 1; return publication.traiter(); },
    },
  };
  runInNewContext(source, {
    figma: runtime, __html__: '', exports: {}, Error,
    require: (nom: string) => { assert.ok(nom in modules, nom); return modules[nom]; },
    setTimeout: (rappel: () => void) => { const id = temporisations.size + 1; temporisations.set(id, rappel); return id; },
    clearTimeout: (id: number) => temporisations.delete(id),
  });
  return {
    messages, appels, exporte, publication, runtime, stockage,
    envoyer: (message: UiRequest) => runtime.ui.onmessage(message),
    selectionner(id: string) {
      runtime.currentPage.selection = [{ id, type: 'COMPONENT', name: 'Exemple' }];
      evenements.get('selectionchange')!();
    },
    connecter() { stockage.set('repoUrl', 'https://github.com/o/r'); stockage.set('baseBranch', 'main'); stockage.set('github_pat', 'secret-test'); },
  };
}

test('deux demandes simultanées ne lancent qu’une analyse', async () => {
  const h = ouvrir();
  const attente = differe<ReturnType<typeof resultat>>();
  h.exporte.traiter = () => attente.promesse;
  const premiere = h.envoyer({ type: 'analyser-tokens' });
  const seconde = h.envoyer({ type: 'analyser-composant' });
  assert.equal(h.appels.analyses, 1);
  attente.resoudre(resultat('tokens.json'));
  await Promise.all([premiere, seconde]);
});

test('annuler après la dernière phase interdit le verdict et le téléchargement, puis permet une nouvelle analyse', async () => {
  const h = ouvrir();
  const attente = differe<ReturnType<typeof resultat>>();
  h.exporte.traiter = () => attente.promesse;
  const analyse = h.envoyer({ type: 'analyser-tokens' });
  await h.envoyer({ type: 'annuler' });
  attente.resoudre(resultat('annule.json'));
  await analyse;
  await h.envoyer({ type: 'publier', genre: 'tokens' } as UiRequest);
  assert.equal(h.messages.some(({ type }) => type === 'verdict' || type === 'download'), false);
  h.exporte.traiter = async () => resultat('nouveau.json');
  await h.envoyer({ type: 'analyser-tokens' });
  assert.ok(h.messages.some(({ type }) => type === 'verdict'));
});

for (const pendant of [true, false]) {
  test(`une sélection homonyme change ${pendant ? 'pendant' : 'après'} l’analyse : aucun ancien contrat ne se publie`, async () => {
    const h = ouvrir();
    const attente = differe<ReturnType<typeof resultat>>();
    h.exporte.traiter = () => attente.promesse;
    const analyse = h.envoyer({ type: 'analyser-composant' });
    if (pendant) h.selectionner('b');
    attente.resoudre(resultat('ancien.contract.json'));
    await analyse;
    if (!pendant) h.selectionner('b');
    await h.envoyer({ type: 'publier', genre: 'component' } as UiRequest);
    assert.equal(h.messages.some(({ type }) => type === 'download'), false);
  });
}

test('chaque commande publie son propre artefact après deux analyses', async () => {
  const h = ouvrir();
  h.exporte.traiter = async () => resultat('exemple.contract.json');
  await h.envoyer({ type: 'analyser-composant' });
  h.exporte.traiter = async () => resultat('tokens.json');
  await h.envoyer({ type: 'analyser-tokens' });
  await h.envoyer({ type: 'publier', genre: 'component' } as UiRequest);
  const telechargement = [...h.messages].reverse().find((message) => message.type === 'download');
  assert.ok(telechargement?.type === 'download');
  assert.equal(telechargement.filename, 'exemple.contract.json');
});

test('une panne du stockage pendant la sauvegarde libère le formulaire', async () => {
  const h = ouvrir();
  h.runtime.clientStorage.setAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'save-settings', settings: { repoUrl: 'https://github.com/o/r', baseBranch: 'main', githubPat: 'secret-test' } });
  assert.ok(h.messages.some(({ type }) => type === 'settings-save-error'));
  assert.doesNotMatch(JSON.stringify(h.messages), /secret-test/);
});

test('une panne de lecture du stockage pendant la publication conserve le téléchargement', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'analyser-tokens' });
  h.runtime.clientStorage.getAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'publier', genre: 'tokens' } as UiRequest);
  assert.ok(h.messages.some(({ type }) => type === 'download'));
  assert.ok(h.messages.some((message) => message.type === 'status' && message.state === 'error'));
});

test('publier sans analyse termine la demande par un message', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'publier', genre: 'tokens' } as UiRequest);
  assert.ok(h.messages.some((message) => message.type === 'status' && message.state === 'error'));
});

test('deux publications simultanées ne créent qu’une pull request', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'analyser-tokens' });
  const attente = differe<Awaited<ReturnType<typeof h.publication.traiter>>>();
  h.publication.traiter = () => attente.promesse;
  const premiere = h.envoyer({ type: 'publier', genre: 'tokens' });
  const seconde = h.envoyer({ type: 'publier', genre: 'tokens' });
  attente.resoudre({ status: 'created', path: 'tokens.json', pullRequestUrl: 'https://github.com/o/r/pull/1' });
  await Promise.all([premiere, seconde]);
  assert.equal(h.appels.publications, 1);
});

test('une notification de sélection inchangée conserve le résultat', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'analyser-composant' });
  h.selectionner('a');
  await h.envoyer({ type: 'publier', genre: 'component' });
  assert.ok(h.messages.some(({ type }) => type === 'download'));
});

test('une panne du moteur termine l’analyse et permet de recommencer', async () => {
  const h = ouvrir();
  h.exporte.traiter = async () => { throw new Error('lecture impossible'); };
  await h.envoyer({ type: 'analyser-composant' });
  assert.ok(h.messages.some((message) => message.type === 'status' && message.state === 'error'));
  h.exporte.traiter = async () => resultat('tokens.json');
  await h.envoyer({ type: 'analyser-tokens' });
  assert.ok(h.messages.some(({ type }) => type === 'verdict'));
});

test('une panne du stockage après l’export conserve le fichier produit', async () => {
  const h = ouvrir();
  h.runtime.clientStorage.getAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'analyser-tokens' });
  assert.ok(h.messages.some(({ type }) => type === 'download'));
});

test('les messages sans type ou inconnus restent sans effet', async () => {
  const h = ouvrir();
  for (const message of [null, {}, { type: 'inconnu' }]) await h.envoyer(message as UiRequest);
  assert.equal(h.messages.length, 0);
});
