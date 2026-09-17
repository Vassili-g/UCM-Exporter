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
import * as termes from '../src/forges/termes';
import type { PluginMessage, UiRequest } from '../src/messages';

const source = ts.transpileModule(readFileSync(join(__dirname, '../src/code.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function differe<T>() {
  let resoudre!: (valeur: T) => void;
  let rejeter!: (erreur: Error) => void;
  const promesse = new Promise<T>((resolve, reject) => { resoudre = resolve; rejeter = reject; });
  return { promesse, resoudre, rejeter };
}

/** Laisse le routeur avancer jusqu'à sa prochaine attente réelle. */
const tourner = () => new Promise((resolve) => setImmediate(resolve));

type Diagnostic = { cause: string; statut?: number; layout: null };

const resultat = (nom: string) => ({ filename: nom, content: '{}', warningCount: 0, warnings: [] });
const globalFigma = globalThis as unknown as { figma?: unknown };
const figmaInitial = globalFigma.figma;
afterEach(() => { globalFigma.figma = figmaInitial; });

function ouvrir() {
  const messages: PluginMessage[] = [];
  const evenements = new Map<string, () => void>();
  const temporisations = new Map<number, () => void>();
  const stockage = new Map<string, unknown>();
  const appels = { analyses: 0, publications: 0, forges: 0, lectures: 0, connexions: 0 };
  const exporte = { traiter: async () => resultat('tokens.json') };
  const publication = { traiter: async () => ({ status: 'created', path: 'tokens.json', pullRequestUrl: 'https://github.com/o/r/pull/1' }) };
  /** Le test de connexion, par configuration reçue. */
  const connexionDe = { traiter: async (_config: { projet: string }): Promise<Diagnostic> => ({ cause: 'connecte', layout: null }) };
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
    './forges/forge': { ErreurDeForge: Error },
    './forges/termes': termes,
    './forges': { forgeDe: (configuration: { projet: string }) => { appels.forges += 1; return { termes: termes.TERMES_GITHUB, configuration }; } },
    './depot': {
      diagnostiquerConnexion: async (forge: { configuration: { projet: string } }) => {
        appels.connexions += 1;
        return connexionDe.traiter(forge.configuration);
      },
      lireAvantEcriture: async () => { appels.lectures += 1; return { path: 'tokens.json', layout: { source: 'configuration' } }; },
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
    messages, appels, exporte, publication, connexionDe, runtime, stockage,
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
  const premiere = h.envoyer({ type: 'analyser-tokens', operation: 1 });
  const seconde = h.envoyer({ type: 'analyser-composant', operation: 2 });
  await tourner();
  assert.equal(h.appels.analyses, 1);
  attente.resoudre(resultat('tokens.json'));
  await Promise.all([premiere, seconde]);
});

test('annuler après la dernière phase interdit le verdict et le téléchargement, puis permet une nouvelle analyse', async () => {
  const h = ouvrir();
  const attente = differe<ReturnType<typeof resultat>>();
  h.exporte.traiter = () => attente.promesse;
  const analyse = h.envoyer({ type: 'analyser-tokens', operation: 1 });
  await h.envoyer({ type: 'annuler' });
  attente.resoudre(resultat('annule.json'));
  await analyse;
  await h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  assert.equal(h.messages.some(({ type }) => type === 'verdict' || type === 'download'), false);
  h.exporte.traiter = async () => resultat('nouveau.json');
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  assert.ok(h.messages.some(({ type }) => type === 'verdict'));
});

for (const pendant of [true, false]) {
  test(`une sélection homonyme change ${pendant ? 'pendant' : 'après'} l’analyse : aucun ancien contrat ne se publie`, async () => {
    const h = ouvrir();
    const attente = differe<ReturnType<typeof resultat>>();
    h.exporte.traiter = () => attente.promesse;
    const analyse = h.envoyer({ type: 'analyser-composant', operation: 1 });
    if (pendant) h.selectionner('b');
    attente.resoudre(resultat('ancien.contract.json'));
    await analyse;
    if (!pendant) h.selectionner('b');
    await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
    assert.equal(h.messages.some(({ type }) => type === 'download'), false);
  });
}

test('chaque commande publie son propre artefact après deux analyses', async () => {
  const h = ouvrir();
  h.exporte.traiter = async () => resultat('exemple.contract.json');
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  h.exporte.traiter = async () => resultat('tokens.json');
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  const telechargement = [...h.messages].reverse().find((message) => message.type === 'download');
  assert.ok(telechargement?.type === 'download');
  assert.equal(telechargement.filename, 'exemple.contract.json');
});

test('une panne du stockage pendant la sauvegarde libère le formulaire', async () => {
  const h = ouvrir();
  h.runtime.clientStorage.setAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'save-settings', settings: { repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test' } });
  assert.ok(h.messages.some(({ type }) => type === 'settings-save-error'));
  assert.doesNotMatch(JSON.stringify(h.messages), /secret-test/);
});

test('une panne de lecture du stockage pendant la publication conserve le téléchargement', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  h.runtime.clientStorage.getAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  assert.ok(h.messages.some(({ type }) => type === 'download'));
  assert.ok(h.messages.some((message) => message.type === 'status' && message.state === 'error'));
});

test('publier sans analyse termine la demande par un message', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  assert.ok(h.messages.some((message) => message.type === 'status' && message.state === 'error'));
});

test('deux publications simultanées ne créent qu’une pull request', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  const attente = differe<Awaited<ReturnType<typeof h.publication.traiter>>>();
  h.publication.traiter = () => attente.promesse;
  const premiere = h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  const seconde = h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  attente.resoudre({ status: 'created', path: 'tokens.json', pullRequestUrl: 'https://github.com/o/r/pull/1' });
  await Promise.all([premiere, seconde]);
  assert.equal(h.appels.publications, 1);
});

test('une notification de sélection inchangée conserve le résultat', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  h.selectionner('a');
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  assert.ok(h.messages.some(({ type }) => type === 'download'));
});

test('une panne du moteur termine l’analyse et permet de recommencer', async () => {
  const h = ouvrir();
  h.exporte.traiter = async () => { throw new Error('lecture impossible'); };
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  assert.ok(h.messages.some((message) => message.type === 'status' && message.state === 'error'));
  h.exporte.traiter = async () => resultat('tokens.json');
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  assert.ok(h.messages.some(({ type }) => type === 'verdict'));
});

test('une panne du stockage après l’export conserve le fichier produit', async () => {
  const h = ouvrir();
  h.runtime.clientStorage.getAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  assert.ok(h.messages.some(({ type }) => type === 'download'));
});

test('une configuration enregistrée rend les analyses précédentes impropres à publier', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  await h.envoyer({ type: 'save-settings', settings: {
    repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test',
  } });
  await h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });

  assert.equal(h.appels.publications, 0);
  assert.equal(
    h.messages.filter((message) => message.type === 'status').at(-1)?.text,
    'La destination a changé depuis l’analyse : le dépôt actif est maintenant r. Relancez l’analyse.',
  );
  assert.doesNotMatch(JSON.stringify(h.messages), /secret-test/);
});

/**
 * Le jeton change, la destination non : l'analyse reste publiable, et le test
 * de connexion repart.
 */
test('un enregistrement à destination inchangée garde l’analyse', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const connexions = h.appels.connexions;
  await h.envoyer({ type: 'save-settings', settings: { repoUrl: 'https://github.com/O/R', baseBranch: 'main', jeton: 'nouveau-secret' } });
  assert.equal(h.appels.connexions, connexions + 1);
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });

  assert.equal(h.appels.publications, 1);
});

test('les messages sans type ou inconnus restent sans effet', async () => {
  const h = ouvrir();
  for (const message of [null, {}, { type: 'inconnu' }]) await h.envoyer(message as UiRequest);
  assert.equal(h.messages.length, 0);
});

/**
 * Un jeton GitHub resté sur le poste après une bascule de l'URL vers GitLab ne
 * doit partir nulle part. Le routeur ne construit donc aucune forge, ce qui
 * est la seule porte vers le réseau.
 */
test('un jeton GitHub enregistré avec une URL GitLab n’atteint le réseau ni à l’ouverture, ni au pré-vol, ni à la publication', async () => {
  const h = ouvrir();
  h.stockage.set('repoUrl', 'https://gitlab.com/mon-groupe/design-system');
  h.stockage.set('baseBranch', 'main');
  h.stockage.set('github_pat', 'ghp_secret');
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  await h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  assert.deepEqual({ forges: h.appels.forges, connexions: h.appels.connexions, lectures: h.appels.lectures, publications: h.appels.publications }, { forges: 0, connexions: 0, lectures: 0, publications: 0 });
  const pastilles = h.messages.flatMap((message) => (message.type === 'connection' ? [message.pastille] : []));
  assert.ok(pastilles.includes('jeton d’une autre forge'), pastilles.join(', '));
  assert.ok(h.messages.some(({ type }) => type === 'download'));
});

const reglages = (projet: string) => ({ repoUrl: `https://github.com/${projet}`, baseBranch: 'main', jeton: 'secret-test' });
const provenance = (message: PluginMessage) => message as PluginMessage & { destination?: string; operation?: number };

/**
 * E6. Le premier dépôt répond lentement « connecté », le second vite « jeton
 * refusé » : la pastille finale décrit le dépôt enregistré en dernier.
 */
test('deux enregistrements rapprochés : la pastille décrit le second, et le test périmé ne poste rien', async () => {
  const h = ouvrir();
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = async ({ projet }) => (projet === 'o/lent' ? lent.promesse : { cause: 'jeton-refuse', statut: 401, layout: null });
  const premier = h.envoyer({ type: 'save-settings', settings: reglages('o/lent') });
  await tourner();
  assert.equal(h.appels.connexions, 1);
  await h.envoyer({ type: 'save-settings', settings: reglages('o/rapide') });
  const avant = h.messages.length;
  lent.resoudre({ cause: 'connecte', layout: null });
  await premier;

  assert.deepEqual(h.messages.slice(avant).map(({ type }) => type), []);
  const pastilles = h.messages.flatMap((message) => (message.type === 'connection' ? [message.pastille] : []));
  assert.equal(pastilles.at(-1), 'jeton refusé');
});

/**
 * E7. L'enregistrement part juste avant la publication : la publication lit la
 * nouvelle destination, et le refus nomme ce changement, pas la sélection.
 */
test('une publication croisée avec un enregistrement refuse en nommant la destination', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  await Promise.all([
    h.envoyer({ type: 'save-settings', settings: reglages('o/autre') }),
    h.envoyer({ type: 'publier', genre: 'component', operation: 2 }),
  ]);

  const textes = h.messages.flatMap((message) => (message.type === 'status' ? [message.text] : []));
  assert.equal(h.appels.publications, 0);
  assert.equal(textes.some((texte) => /La sélection a changé/.test(texte)), false, textes.join(' | '));
  assert.ok(textes.some((texte) => /La destination a changé depuis l.analyse : le dépôt actif est maintenant autre\./.test(texte)), textes.join(' | '));
});

for (const issue of ['réussie', 'échouée'] as const) {
  test(`une publication vers A ${issue} après une bascule vers B ne touche ni la pastille ni le verdict de B, et libère l’interface`, async () => {
    const h = ouvrir();
    h.connecter();
    await h.envoyer({ type: 'analyser-composant', operation: 1 });
    const destinationA = provenance(h.messages.find(({ type }) => type === 'verdict')!).destination;
    assert.ok(destinationA);

    const attente = differe<Awaited<ReturnType<typeof h.publication.traiter>>>();
    h.publication.traiter = () => attente.promesse;
    const publication = h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
    await tourner();
    assert.equal(h.appels.publications, 1);
    await h.envoyer({ type: 'save-settings', settings: reglages('o/b') });

    const avant = h.messages.length;
    if (issue === 'réussie') attente.resoudre({ status: 'created', path: 'x.contract.json', pullRequestUrl: 'https://github.com/o/r/pull/2' });
    else attente.rejeter(new Error('refus'));
    await publication;
    const apres = h.messages.slice(avant);

    assert.deepEqual(apres.filter(({ type }) => type === 'connection' || type === 'settings' || type === 'depot'), []);
    for (const message of apres.filter(({ type }) => ['verdict', 'status', 'log', 'demande'].includes(type))) {
      assert.equal(provenance(message).destination, destinationA, message.type);
      assert.equal(provenance(message).operation, 2, message.type);
    }
    assert.ok(apres.some((message) => message.type === 'status' && message.state !== 'loading'));
    const verdict = apres.find((message) => message.type === 'verdict');
    if (verdict?.type === 'verdict') assert.notEqual(verdict.action, 'Réessayer la publication');
  });
}
