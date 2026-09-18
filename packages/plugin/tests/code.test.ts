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
  const appels = { analyses: 0, publications: 0, forges: 0, lectures: 0, connexions: 0, collections: 0, avecTokens: [] as boolean[], jetons: [] as string[] };
  const exporte = { traiter: async () => resultat('tokens.json') };
  const publication = { traiter: async () => ({ status: 'created', path: 'tokens.json', pullRequestUrl: 'https://github.com/o/r/pull/1' }) };
  const resumeDesTokens = { traiter: async () => ({ presents: true, resume: '1 variable' }) };
  /** Le test de connexion, par configuration reçue. */
  const connexionDe = { traiter: async (_config: { projet: string; jeton: string }): Promise<Diagnostic> => ({ cause: 'connecte', layout: null }) };
  const runtime = {
    showUI() {}, notify() {}, openExternal() {},
    currentPage: { selection: [{ id: 'a', type: 'COMPONENT', name: 'Exemple' }] },
    ui: { postMessage: (message: PluginMessage) => messages.push(message), resize() {}, onmessage: async (_message: UiRequest) => {} },
    on: (nom: string, rappel: () => void) => evenements.set(nom, rappel),
    clientStorage: {
      // Comme clientStorage, la valeur se lit après l'appel : la reprise lancée au
      // chargement du routeur voit ce que le test écrit juste après `ouvrir()`.
      getAsync: async (cle: string) => { await null; return stockage.get(cle); },
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
    './tokens/exportTokens': { default: handler, annonceDuFormat: () => null, etatDesTokensDuFichier: async () => { appels.collections += 1; return resumeDesTokens.traiter(); } },
    './forges/forge': { ErreurDeForge: Error },
    './forges/termes': termes,
    './forges': {
      forgeDe: (configuration: { projet: string; jeton: string }) => {
        appels.forges += 1;
        appels.jetons.push(`${configuration.projet} ${configuration.jeton}`);
        return { termes: termes.TERMES_GITHUB, configuration };
      },
    },
    './depot': {
      diagnostiquerConnexion: async (forge: { configuration: { projet: string; jeton: string } }) => {
        appels.connexions += 1;
        return connexionDe.traiter(forge.configuration);
      },
      lireAvantEcriture: async (_forge: unknown, _artefact: unknown, options: { avecTokens: boolean }) => { appels.lectures += 1; appels.avecTokens.push(options.avecTokens); return { path: 'tokens.json', layout: { source: 'configuration' } }; },
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
    messages, appels, exporte, publication, connexionDe, resumeDesTokens, runtime, stockage,
    envoyer: (message: UiRequest) => runtime.ui.onmessage(message),
    selectionner(id: string) {
      runtime.currentPage.selection = [{ id, type: 'COMPONENT', name: 'Exemple' }];
      evenements.get('selectionchange')!();
    },
    connecter() {
      stockage.set('depots', [{ repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test' }]);
      stockage.set('depotActif', 'github:o/r');
    },
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

test('une annulation après la dernière phase interdit le verdict et le téléchargement, puis permet une nouvelle analyse', async () => {
  const h = ouvrir();
  const attente = differe<ReturnType<typeof resultat>>();
  h.exporte.traiter = () => attente.promesse;
  const analyse = h.envoyer({ type: 'analyser-composant', operation: 1 });
  await tourner();
  h.selectionner('b');
  attente.resoudre(resultat('annule.contract.json'));
  await analyse;
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  assert.equal(h.messages.some(({ type }) => type === 'verdict' || type === 'download'), false);
  h.exporte.traiter = async () => resultat('nouveau.contract.json');
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
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

test('une panne du stockage pendant l’enregistrement rend une erreur générale', async () => {
  const h = ouvrir();
  h.runtime.clientStorage.setAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: { repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test' }, id: null });
  assert.ok(h.messages.some((message) => message.type === 'depot-enregistre' && /stockage du plugin a refusé/.test(message.erreurs.general ?? '')));
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
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: {
    repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test',
  }, id: null });
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
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: { repoUrl: 'https://github.com/O/R', baseBranch: 'main', jeton: 'nouveau-secret' }, id: 'github:o/r' });
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
 * Le jeton d'un dépôt ne part que vers ce dépôt : la forge est la seule porte
 * vers le réseau, et chaque forge créée relève le projet et le jeton reçus.
 */
test('le jeton du dépôt A n’accompagne aucune requête vers B, avant comme après une bascule', async () => {
  const h = ouvrir();
  h.stockage.set('depots', [
    { repoUrl: 'https://github.com/mon-org/design-system-v3', baseBranch: 'main', jeton: 'ghp_a' },
    { repoUrl: 'https://gitlab.com/mon-groupe/design-system', baseBranch: 'main', jeton: 'glpat-b' },
  ]);
  h.stockage.set('depotActif', 'github:mon-org/design-system-v3');
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  // Une autre fenêtre du plugin active B.
  h.stockage.set('depotActif', 'gitlab:mon-groupe/design-system');
  await h.envoyer({ type: 'analyser-composant', operation: 3 });
  await h.envoyer({ type: 'publier', genre: 'component', operation: 4 });

  const recus = new Set(h.appels.jetons);
  assert.deepEqual([...recus].sort(), ['mon-groupe/design-system glpat-b', 'mon-org/design-system-v3 ghp_a']);
  assert.equal(h.appels.publications, 2);
  assert.doesNotMatch(JSON.stringify(h.messages), /ghp_a|glpat-b/);
});

const reglages = (projet: string) => ({ repoUrl: `https://github.com/${projet}`, baseBranch: 'main', jeton: 'secret-test' });
const provenance = (message: PluginMessage) => message as PluginMessage & { destination?: string; operation?: number };

/**
 * E6. Le premier jeton répond lentement « connecté », le second vite « jeton
 * refusé » : la pastille finale décrit le jeton enregistré en dernier.
 */
test('deux enregistrements rapprochés : la pastille décrit le second, et le test périmé ne poste rien', async () => {
  const h = ouvrir();
  const lent = differe<Diagnostic>();
  h.connecter();
  h.connexionDe.traiter = async ({ jeton }) => (jeton === 'jeton-lent' ? lent.promesse : { cause: 'jeton-refuse', statut: 401, layout: null });
  const premier = h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: { ...reglages('o/r'), jeton: 'jeton-lent' }, id: 'github:o/r' });
  await tourner();
  assert.equal(h.appels.connexions, 1);
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: { ...reglages('o/r'), jeton: 'jeton-rapide' }, id: 'github:o/r' });
  const avant = h.messages.length;
  lent.resoudre({ cause: 'connecte', layout: null });
  await premier;

  assert.deepEqual(h.messages.slice(avant).map(({ type }) => type), []);
  const pastilles = h.messages.flatMap((message) => (message.type === 'connection' ? [message.pastille] : []));
  assert.equal(pastilles.at(-1), 'r : Jeton refusé');
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
    h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: { ...reglages('o/r'), baseBranch: 'develop' }, id: 'github:o/r' }),
    h.envoyer({ type: 'publier', genre: 'component', operation: 2 }),
  ]);

  const textes = h.messages.flatMap((message) => (message.type === 'status' ? [message.text] : []));
  assert.equal(h.appels.publications, 0);
  assert.equal(textes.some((texte) => /La sélection a changé/.test(texte)), false, textes.join(' | '));
  assert.ok(textes.some((texte) => /La destination a changé depuis l.analyse : le dépôt actif est maintenant r\./.test(texte)), textes.join(' | '));
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
    await h.envoyer({ type: 'supprimer-depot', id: 'github:o/r' });

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

const statuts = (h: ReturnType<typeof ouvrir>) => h.messages.flatMap((message) => (message.type === 'status' ? [message.text] : []));

test('gestion des tokens désactivée : aucune lecture des collections à l’ouverture', async () => {
  const h = ouvrir();
  h.stockage.set('gestionDesTokens', false);
  await h.envoyer({ type: 'ui-ready' });

  assert.equal(h.appels.collections, 0);
  assert.equal(h.messages.some(({ type }) => type === 'tokens'), false);
  const reglages = h.messages.find((message) => message.type === 'settings');
  assert.ok(reglages?.type === 'settings');
  assert.equal(reglages.settings.tokens, false);
});

test('gestion des tokens désactivée : analyse et publication des tokens refusées', async () => {
  const h = ouvrir();
  await h.envoyer({ type: 'analyser-tokens', operation: 1 });
  h.stockage.set('gestionDesTokens', false);
  await h.envoyer({ type: 'publier', genre: 'tokens', operation: 2 });
  await h.envoyer({ type: 'analyser-tokens', operation: 3 });

  assert.equal(h.appels.analyses, 1);
  assert.equal(h.messages.some(({ type }) => type === 'download'), false);
  assert.deepEqual(statuts(h).filter((texte) => /Gérer les tokens/.test(texte)).length, 2);
});

test('gestion des tokens désactivée : l’analyse d’un composant ne lit pas l’état des tokens, et son extraction a lieu', async () => {
  const h = ouvrir();
  h.connecter();
  h.stockage.set('gestionDesTokens', false);
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  h.stockage.delete('gestionDesTokens');
  await h.envoyer({ type: 'analyser-composant', operation: 2 });

  assert.equal(h.appels.analyses, 2);
  assert.deepEqual(h.appels.avecTokens, [false, true]);
});

test('un résumé des tokens lancé avant la désactivation ne s’affiche pas après elle', async () => {
  const h = ouvrir();
  const lent = differe<{ presents: boolean; resume: string }>();
  h.resumeDesTokens.traiter = () => lent.promesse;
  const ouverture = h.envoyer({ type: 'ui-ready' });
  await tourner();
  assert.equal(h.appels.collections, 1);
  await h.envoyer({ type: 'gerer-tokens', valeur: false });
  lent.resoudre({ presents: true, resume: '3 variables' });
  await ouverture;

  assert.equal(h.messages.some(({ type }) => type === 'tokens'), false);
  assert.equal(h.stockage.get('gestionDesTokens'), false);
});

test('réactiver la gestion des tokens relit les collections du fichier', async () => {
  const h = ouvrir();
  h.stockage.set('gestionDesTokens', false);
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'gerer-tokens', valeur: true });

  assert.equal(h.appels.collections, 1);
  assert.ok(h.messages.some(({ type }) => type === 'tokens'));
});

test('basculer la gestion des tokens annule une analyse en cours et laisse finir une publication', async () => {
  const h = ouvrir();
  h.connecter();
  const extraction = differe<ReturnType<typeof resultat>>();
  h.exporte.traiter = () => extraction.promesse;
  const analyse = h.envoyer({ type: 'analyser-composant', operation: 1 });
  await tourner();
  await h.envoyer({ type: 'gerer-tokens', valeur: false });
  extraction.resoudre(resultat('exemple.contract.json'));
  await analyse;
  assert.equal(h.messages.some(({ type }) => type === 'verdict'), false);
  assert.equal(statuts(h).at(-1), 'Analyse annulée : les réglages du plugin ont changé. Relancez l’analyse.');

  h.exporte.traiter = async () => resultat('exemple.contract.json');
  await h.envoyer({ type: 'analyser-composant', operation: 2 });
  const envoi = differe<Awaited<ReturnType<typeof h.publication.traiter>>>();
  h.publication.traiter = () => envoi.promesse;
  const publication = h.envoyer({ type: 'publier', genre: 'component', operation: 3 });
  await tourner();
  await h.envoyer({ type: 'gerer-tokens', valeur: true });
  envoi.resoudre({ status: 'created', path: 'x.contract.json', pullRequestUrl: 'https://github.com/o/r/pull/3' });
  await publication;
  assert.equal(h.appels.publications, 1);
  assert.match(statuts(h).at(-1) ?? '', /Pull request créée/);
});

test('une analyse faite avant un changement du réglage des tokens ne se publie pas', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  await h.envoyer({ type: 'gerer-tokens', valeur: false });
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });

  assert.equal(h.appels.publications, 0);
  assert.equal(statuts(h).at(-1), 'La destination a changé depuis l’analyse : la gestion des tokens a changé. Relancez l’analyse.');
});

/**
 * La modification a lu la liste avant la suppression ; sa propre écriture est
 * retenue jusqu'à ce que la suppression ait pu passer. Sans file, elle ferait
 * revenir l'entrée, jeton compris.
 */
test('une suppression et une modification envoyées ensemble ne font pas revenir l’entrée', async () => {
  const h = ouvrir();
  h.connecter();
  await tourner();
  const ecrire = h.runtime.clientStorage.setAsync;
  const retenue = differe<void>();
  let premiere = true;
  h.runtime.clientStorage.setAsync = async (cle: string, valeur: unknown) => {
    if (cle === 'depots' && premiere && (valeur as unknown[]).length > 0) {
      premiere = false;
      await retenue.promesse;
    }
    return ecrire(cle, valeur);
  };
  const modification = h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: { ...reglages('o/r'), jeton: 'autre-secret' }, id: 'github:o/r' });
  const suppression = h.envoyer({ type: 'supprimer-depot', id: 'github:o/r' });
  await tourner();
  retenue.resoudre();
  await Promise.all([modification, suppression]);

  assert.deepEqual(h.stockage.get('depots'), []);
  assert.equal(h.stockage.has('depotActif'), false);
});

test('un échec d’écriture ne bloque pas la demande suivante', async () => {
  const h = ouvrir();
  await tourner();
  const ecrire = h.runtime.clientStorage.setAsync;
  let pannes = 1;
  h.runtime.clientStorage.setAsync = async (cle: string, valeur: unknown) => {
    if (pannes > 0) { pannes -= 1; throw new Error('stockage indisponible'); }
    return ecrire(cle, valeur);
  };
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: reglages('o/r'), id: null });
  assert.ok(h.messages.some((message) => message.type === 'depot-enregistre' && /stockage du plugin a refusé/.test(message.erreurs.general ?? '')));
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: reglages('o/r'), id: null });
  assert.equal(h.stockage.get('depotActif'), 'github:o/r');
});

/**
 * Le premier dépôt s'écrit, puis devient actif : une analyse demandée entre
 * les deux écritures attend la fin de l'enregistrement.
 */
test('une lecture n’observe pas une activation à moitié écrite', async () => {
  const h = ouvrir();
  await tourner();
  const ecrire = h.runtime.clientStorage.setAsync;
  const liste = differe<void>();
  h.runtime.clientStorage.setAsync = async (cle: string, valeur: unknown) => {
    await ecrire(cle, valeur);
    if (cle === 'depots') await liste.promesse;
  };
  const enregistrement = h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: reglages('o/r'), id: null });
  await tourner();
  const analyse = h.envoyer({ type: 'analyser-composant', operation: 1 });
  await tourner();
  liste.resoudre();
  await Promise.all([enregistrement, analyse]);
  const verdict = h.messages.find((message) => message.type === 'verdict');
  assert.ok(verdict?.type === 'verdict');
  assert.equal(verdict.code, 'a-publier');
});

test('une modification ne change pas l’adresse d’un dépôt, et l’identité se compare en minuscules', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: reglages('o/autre'), id: 'github:o/r' });
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'c', settings: reglages('O/R'), id: null });
  const erreurs = h.messages.flatMap((message) => (message.type === 'depot-enregistre' ? [message.erreurs.repoUrl] : []));
  assert.equal(erreurs.length, 2);
  assert.match(erreurs[0] ?? '', /ne change pas/);
  assert.equal(erreurs[1], 'Ce repository est déjà dans la liste.');
  assert.deepEqual(h.stockage.get('depots'), [{ repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test' }]);
  assert.doesNotMatch(JSON.stringify(h.messages), /secret-test/);
});

test('les anciennes clés d’un seul dépôt sont reprises avant toute lecture', async () => {
  const h = ouvrir();
  h.stockage.set('repoUrl', 'https://github.com/o/r');
  h.stockage.set('baseBranch', 'main');
  h.stockage.set('github_pat', 'secret-test');
  await h.envoyer({ type: 'ui-ready' });
  assert.equal(h.stockage.get('depotActif'), 'github:o/r');
  assert.equal(h.stockage.has('github_pat'), false);
  assert.ok(h.appels.jetons.includes('o/r secret-test'));
});

const DEUX_DEPOTS = [
  { repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'jeton-a' },
  { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', jeton: 'glpat-b' },
];
const testsDe = (h: ReturnType<typeof ouvrir>, id: string) => h.messages.flatMap((message) => (
  message.type === 'depot-teste' && message.id === id ? [message] : []
));

test('enregistrer un dépôt inactif teste ce dépôt pour sa carte, et ne vide aucune analyse', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const pastilles = h.messages.filter(({ type }) => type === 'connection').length;
  h.connexionDe.traiter = async ({ jeton }) => (jeton === 'glpat-b' ? { cause: 'jeton-refuse', statut: 401, layout: null } : { cause: 'connecte', layout: null });
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'nouvelle-1', id: null, settings: { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', jeton: 'glpat-b' } });

  const reponse = h.messages.find((message) => message.type === 'depot-enregistre');
  assert.deepEqual(JSON.parse(JSON.stringify(reponse)), { type: 'depot-enregistre', requete: 1, carte: 'nouvelle-1', id: 'gitlab:g/p', erreurs: {} });
  assert.deepEqual(testsDe(h, 'gitlab:g/p').map(({ statut }) => statut), ['Connexion…', 'Jeton refusé']);
  assert.ok(h.appels.jetons.includes('g/p glpat-b'));
  // La pastille décrit toujours le dépôt actif : aucun message ne la change.
  assert.equal(h.messages.filter((message) => message.type === 'connection').length, pastilles);
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  assert.equal(h.appels.publications, 1);
});

test('le test d’une carte périmé par une suppression ne s’affiche pas', async () => {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'github:o/r');
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = async ({ jeton }) => (jeton === 'glpat-b' ? lent.promesse : { cause: 'connecte', layout: null });
  const enregistrement = h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'gitlab:g/p', id: 'gitlab:g/p', settings: { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'develop', jeton: '' } });
  await tourner();
  await tourner();
  assert.deepEqual(testsDe(h, 'gitlab:g/p').map(({ statut }) => statut), ['Connexion…']);
  await h.envoyer({ type: 'supprimer-depot', id: 'gitlab:g/p' });
  lent.resoudre({ cause: 'connecte', layout: null });
  await enregistrement;
  assert.deepEqual(testsDe(h, 'gitlab:g/p').map(({ statut }) => statut), ['Connexion…']);
});

test('« Se connecter » change la destination, teste le nouveau dépôt actif, et sa carte reçoit le test', async () => {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'github:o/r');
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'activer-depot', id: 'gitlab:g/p' });

  assert.equal(h.stockage.get('depotActif'), 'gitlab:g/p');
  const reglages = h.messages.filter((message) => message.type === 'settings').at(-1);
  assert.ok(reglages?.type === 'settings');
  assert.equal(reglages.settings.actif, 'gitlab:g/p');
  assert.equal(h.appels.jetons.at(-1), 'g/p glpat-b');
  assert.equal(testsDe(h, 'gitlab:g/p').at(-1)?.statut, 'Connecté');
});

test('un dépôt actif retiré laisse le repli « aucun dépôt actif » quand d’autres restent', async () => {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'github:o/r');
  await h.envoyer({ type: 'supprimer-depot', id: 'github:o/r' });
  const depot = h.messages.filter((message) => message.type === 'depot').at(-1);
  assert.ok(depot?.type === 'depot');
  assert.equal(depot.repli, 'aucun-actif');
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const verdict = h.messages.find((message) => message.type === 'verdict');
  assert.match(verdict?.type === 'verdict' ? verdict.texte : '', /^Aucun dépôt actif\. Le contrat sera téléchargé/);
});

const pastillesDe = (h: ReturnType<typeof ouvrir>) => h.messages.flatMap((message) => (message.type === 'connection' ? [message.pastille] : []));
const etatDeLaPastille = (h: ReturnType<typeof ouvrir>) => h.messages
  .flatMap((message) => (message.type === 'connection' ? [message.state] : [])).at(-1);

/**
 * Deux générations se croisent : `generationDeConnexion` pour la pastille et la
 * destination, `generationsDesDepots` pour chaque carte. Une demande qui périme
 * l'une pendant que l'autre attend la forge doit laisser la pastille et toutes
 * les cartes encore listées sur un état terminal. Sans cette loi, un test
 * périmé des deux côtés ne laisserait aucun message pour remplacer son
 * « Connexion… », et l'interface resterait sur une attente qui ne finit pas.
 */
function verifierLesAttentes(h: ReturnType<typeof ouvrir>, croisement: string): void {
  assert.notEqual(etatDeLaPastille(h), 'checking', `${croisement} : la pastille reste sur Connexion…`);
  for (const { id } of derniersReglages(h).depots) {
    assert.notEqual(testsDe(h, id).at(-1)?.etat, 'checking', `${croisement} : la carte ${id} reste sur Connexion…`);
  }
}

/**
 * Enregistre le dépôt GitLab, dont le test reste en vol, envoie la demande qui
 * croise ce test, puis laisse le test rendre son résultat.
 */
async function croiserLeTestDeLaCarte(demande: UiRequest): Promise<ReturnType<typeof ouvrir>> {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'github:o/r');
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = async ({ jeton }) => (jeton === 'glpat-b' ? lent.promesse : { cause: 'connecte', layout: null });
  const enregistrement = h.envoyer({
    type: 'enregistrer-depot', requete: 1, carte: 'gitlab:g/p', id: 'gitlab:g/p',
    settings: { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'develop', jeton: '' },
  });
  await tourner();
  await tourner();
  assert.deepEqual(testsDe(h, 'gitlab:g/p').map(({ statut }) => statut), ['Connexion…']);
  const croisee = h.envoyer(demande);
  await tourner();
  lent.resoudre({ cause: 'connecte', layout: null });
  await enregistrement;
  await croisee;
  return h;
}

test('une demande qui croise le test d’une carte laisse la pastille et les cartes sur un état terminal', async () => {
  for (const [croisement, demande] of [
    ['activer un dépôt', { type: 'activer-depot', id: 'gitlab:g/p' }],
    ['supprimer un autre dépôt', { type: 'supprimer-depot', id: 'github:o/r' }],
    ['basculer l’export local', { type: 'export-local', valeur: true }],
    ['réinitialiser la liste', { type: 'reinitialiser-depots' }],
  ] as [string, UiRequest][]) {
    verifierLesAttentes(await croiserLeTestDeLaCarte(demande), croisement);
  }
});

/**
 * `testerDepot` ne lit que `generationsDesDepots` : la bascule de l'export
 * local, qui ne périme que `generationDeConnexion`, ne l'arrête pas. Son
 * résultat arrive donc après elle, et c'est correct, parce qu'il ne touche que
 * sa carte : la pastille et la destination restent celles de l'export local.
 */
test('un test de carte rendu après la bascule de l’export local ne touche que sa carte', async () => {
  const h = await croiserLeTestDeLaCarte({ type: 'export-local', valeur: true });
  assert.equal(testsDe(h, 'gitlab:g/p').at(-1)?.statut, 'Connecté');
  assert.equal(etatDeLaPastille(h), 'local');
  assert.equal(dernierDepot(h).repli, 'debranche');
});

test('enregistrer un dépôt pendant le test du dépôt actif laisse les deux cartes sur leur résultat', async () => {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'github:o/r');
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = async ({ jeton }) => (jeton === 'jeton-a' ? lent.promesse : { cause: 'connecte', layout: null });
  const ouverture = h.envoyer({ type: 'ui-ready' });
  await tourner();
  await tourner();
  assert.equal(etatDeLaPastille(h), 'checking');
  const enregistrement = h.envoyer({
    type: 'enregistrer-depot', requete: 1, carte: 'gitlab:g/p', id: 'gitlab:g/p',
    settings: { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'develop', jeton: '' },
  });
  await tourner();
  await tourner();
  lent.resoudre({ cause: 'connecte', layout: null });
  await ouverture;
  await enregistrement;

  verifierLesAttentes(h, 'enregistrer pendant le test du dépôt actif');
  assert.deepEqual(testsDe(h, 'github:o/r').map(({ statut }) => statut), ['Connexion…', 'Connecté']);
  assert.deepEqual(testsDe(h, 'gitlab:g/p').map(({ statut }) => statut), ['Connexion…', 'Connecté']);
});
const derniersReglages = (h: ReturnType<typeof ouvrir>) => {
  const reglagesRecus = h.messages.filter((message) => message.type === 'settings').at(-1);
  assert.ok(reglagesRecus?.type === 'settings');
  return reglagesRecus.settings;
};
const dernierDepot = (h: ReturnType<typeof ouvrir>) => {
  const depot = h.messages.filter((message) => message.type === 'depot').at(-1);
  assert.ok(depot?.type === 'depot');
  return depot;
};

test('export local : aucune opération réseau à l’ouverture, à l’analyse ni à la publication, et le contrat est téléchargé', async () => {
  const h = ouvrir();
  h.connecter();
  h.stockage.set('exportLocal', true);
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });

  assert.deepEqual([h.appels.forges, h.appels.connexions, h.appels.lectures, h.appels.publications], [0, 0, 0, 0]);
  assert.deepEqual(pastillesDe(h), ['Export en local']);
  assert.equal(dernierDepot(h).repli, 'debranche');
  const verdict = h.messages.find((message) => message.type === 'verdict');
  assert.equal(verdict?.type === 'verdict' ? verdict.texte : '', 'Export local. Le contrat sera téléchargé sur votre poste.');
  assert.ok(h.messages.some((message) => message.type === 'log' && message.text === 'Export local : téléchargement sur votre poste.'));
  assert.ok(h.messages.some(({ type }) => type === 'download'));
  assert.equal(h.stockage.get('depotActif'), 'github:o/r');
});

test('export local : enregistrer un dépôt le teste pour sa seule carte, sans toucher au dépôt actif, à la pastille ni à la destination', async () => {
  const h = ouvrir();
  h.connecter();
  h.stockage.set('exportLocal', true);
  await h.envoyer({ type: 'ui-ready' });
  const pastilles = pastillesDe(h).length;
  const depots = h.messages.filter(({ type }) => type === 'depot').length;
  const destination = derniersReglages(h).destination;
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'github:o/r', id: 'github:o/r', settings: { ...reglages('o/r'), jeton: 'autre-secret' } });
  await h.envoyer({ type: 'enregistrer-depot', requete: 2, carte: 'nouvelle-1', id: null, settings: { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', jeton: 'glpat-b' } });

  assert.deepEqual(testsDe(h, 'github:o/r').map(({ statut }) => statut), ['Connexion…', 'Connecté']);
  assert.deepEqual(testsDe(h, 'gitlab:g/p').map(({ statut }) => statut), ['Connexion…', 'Connecté']);
  assert.equal(h.appels.connexions, 2);
  assert.equal(pastillesDe(h).length, pastilles);
  assert.equal(h.messages.filter(({ type }) => type === 'depot').length, depots);
  assert.equal(derniersReglages(h).destination, destination);
  assert.equal(derniersReglages(h).actif, 'github:o/r');
  assert.equal(h.stockage.get('depotActif'), 'github:o/r');
});

test('en export local, le premier dépôt enregistré ne devient pas actif', async () => {
  const h = ouvrir();
  h.stockage.set('exportLocal', true);
  await h.envoyer({ type: 'enregistrer-depot', requete: 1, carte: 'nouvelle-1', id: null, settings: reglages('o/r') });

  assert.equal(h.stockage.has('depotActif'), false);
  assert.deepEqual(testsDe(h, 'github:o/r').map(({ statut }) => statut), ['Connexion…', 'Connecté']);
  assert.deepEqual(pastillesDe(h), ['Export en local']);
});

test('activer l’export local laisse finir une publication lancée, sans rétablir la connexion', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const envoi = differe<Awaited<ReturnType<typeof h.publication.traiter>>>();
  h.publication.traiter = () => envoi.promesse;
  const publication = h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  await tourner();
  await h.envoyer({ type: 'export-local', valeur: true });
  const avant = h.messages.length;
  envoi.resoudre({ status: 'created', path: 'x.contract.json', pullRequestUrl: 'https://github.com/o/r/pull/4' });
  await publication;

  assert.equal(h.appels.publications, 1);
  assert.match(statuts(h).at(-1) ?? '', /Pull request créée/);
  assert.deepEqual(h.messages.slice(avant).filter(({ type }) => type === 'connection' || type === 'settings'), []);
  assert.equal(pastillesDe(h).at(-1), 'Export en local');
});

test('un test de connexion lancé avant l’export local ne rétablit pas l’état connecté', async () => {
  const h = ouvrir();
  h.connecter();
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = () => lent.promesse;
  const ouverture = h.envoyer({ type: 'ui-ready' });
  await tourner();
  await tourner();
  assert.equal(h.appels.connexions, 1);
  await h.envoyer({ type: 'export-local', valeur: true });
  lent.resoudre({ cause: 'connecte', layout: null });
  await ouverture;

  assert.equal(pastillesDe(h).at(-1), 'Export en local');
  assert.equal(dernierDepot(h).repli, 'debranche');
});

test('une analyse faite vers un dépôt ne se publie pas en export local', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  await h.envoyer({ type: 'export-local', valeur: true });
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });

  assert.equal(h.appels.publications, 0);
  assert.equal(h.messages.some(({ type }) => type === 'download'), false);
  assert.equal(statuts(h).at(-1), 'La destination a changé depuis l’analyse : les exports sont téléchargés sur votre poste. Relancez l’analyse.');
});

test('désactiver l’export local rallume le dernier dépôt actif et le teste', async () => {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'gitlab:g/p');
  h.stockage.set('exportLocal', true);
  await h.envoyer({ type: 'ui-ready' });
  assert.equal(h.appels.connexions, 0);
  await h.envoyer({ type: 'export-local', valeur: false });

  assert.equal(h.stockage.get('exportLocal'), false);
  assert.equal(h.appels.jetons.at(-1), 'g/p glpat-b');
  assert.equal(pastillesDe(h).at(-1), 'p connecté');
  assert.equal(testsDe(h, 'gitlab:g/p').at(-1)?.statut, 'Connecté');
});

test('« Se connecter » désactive l’export local', async () => {
  const h = ouvrir();
  h.stockage.set('depots', DEUX_DEPOTS);
  h.stockage.set('depotActif', 'gitlab:g/p');
  h.stockage.set('exportLocal', true);
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'activer-depot', id: 'github:o/r' });

  assert.equal(h.stockage.get('exportLocal'), false);
  assert.deepEqual([derniersReglages(h).exportLocal, derniersReglages(h).actif], [false, 'github:o/r']);
  assert.equal(pastillesDe(h).at(-1), 'r connecté');
});

/** Les messages d'une opération donnée, dans leur ordre d'envoi. */
const operationDe = (h: ReturnType<typeof ouvrir>, operation: number) => h.messages.filter(
  (message) => (message as { operation?: number }).operation === operation,
);

for (const panne of ['une liste illisible', 'un stockage indisponible'] as const) {
  test(`${panne} après la demande de fusion garde le succès de la publication`, async () => {
    const h = ouvrir();
    h.connecter();
    await h.envoyer({ type: 'ui-ready' });
    await h.envoyer({ type: 'analyser-composant', operation: 1 });
    const getAsync = h.runtime.clientStorage.getAsync;
    h.publication.traiter = async () => {
      if (panne === 'une liste illisible') h.stockage.set('depots', 'corrompu');
      else h.runtime.clientStorage.getAsync = async () => { throw new Error('stockage indisponible'); };
      return { status: 'created', path: 'x.contract.json', pullRequestUrl: 'https://github.com/o/r/pull/1' };
    };
    await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
    await tourner();
    h.runtime.clientStorage.getAsync = getAsync;

    assert.equal(h.appels.publications, 1);
    const etats = operationDe(h, 2).flatMap((message) => (message.type === 'status' ? [message.state] : []));
    assert.deepEqual(etats, ['loading', 'success']);
    assert.equal(h.messages.some(({ type }) => type === 'download'), false);
    assert.equal(operationDe(h, 2).some(({ type }) => type === 'verdict'), false);
  });
}

test('le succès d’une publication précède le test de connexion qu’elle relance', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = async () => lent.promesse;
  const enVol = h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  await tourner();
  await tourner();

  const etats = operationDe(h, 2).flatMap((message) => (message.type === 'status' ? [message.state] : []));
  assert.deepEqual(etats, ['loading', 'success']);
  lent.resoudre({ cause: 'connecte', layout: null });
  await enVol;
});

/**
 * Le rafraîchissement qui suit une publication réussie tourne après la fin de
 * l'opération. Sa panne écrivait « la demande n'a pas abouti » sur la carte, par
 * dessus « Pull request créée » et à côté du lien de la demande déjà ouverte.
 */
test('une panne du rafraîchissement après une publication réussie n’écrit rien sur la carte', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const lire = h.runtime.clientStorage.getAsync;
  h.runtime.clientStorage.getAsync = async (cle: string) => {
    if (h.appels.publications > 0) throw new Error('stockage indisponible');
    return lire(cle);
  };
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  await tourner();
  await tourner();
  await tourner();

  const statuts = h.messages.flatMap((message) => (message.type === 'status' ? [message] : []));
  assert.equal(statuts.at(-1)?.state, 'success');
  assert.equal(statuts.at(-1)?.operation, 2);
});

/**
 * Le repli `cleDeDestination(null, true)` ne sert que si la lecture échoue
 * avant tout `settings`. L'interface n'a alors aucune destination courante et
 * n'en compare aucune : le réglage des tokens que ce repli suppose ne décide
 * de rien.
 */
test('une analyse lancée avant tout réglage, sur un stockage en panne, porte le repli sans destination annoncée', async () => {
  const h = ouvrir();
  h.runtime.clientStorage.getAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  assert.equal(h.messages.some(({ type }) => type === 'settings'), false);
  const resultats = operationDe(h, 1);
  assert.ok(resultats.some(({ type }) => type === 'download'));
  for (const message of resultats) {
    assert.equal((message as { destination?: string }).destination, config.cleDeDestination(null, true));
  }
});

test('une demande arrivée pendant la fin d’une publication reçoit une réponse portant son numéro', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const lente = differe<void>();
  let apresEchec = false;
  const getAsync = h.runtime.clientStorage.getAsync;
  h.runtime.clientStorage.getAsync = async (cle: string) => {
    if (apresEchec && cle === 'depots') await lente.promesse;
    return getAsync(cle);
  };
  h.publication.traiter = async () => { apresEchec = true; throw new Error('boum'); };
  const publication = h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  await tourner();
  await tourner();
  // Le statut d'échec ne part pas avant la dernière lecture du sandbox.
  assert.equal(operationDe(h, 2).some((message) => message.type === 'status' && message.state === 'error'), false);

  const analyse = h.envoyer({ type: 'analyser-composant', operation: 3 });
  await tourner();
  assert.deepEqual(
    operationDe(h, 3).map((message) => message.type),
    ['status'],
    'une demande refusée doit répondre, sinon l’interface reste occupée',
  );

  lente.resoudre();
  await Promise.all([publication, analyse]);
});

test('une liste de dépôts illisible dit son constat et son geste, et la réinitialisation rend la liste', async () => {
  const h = ouvrir();
  h.stockage.set('depots', 'corrompu');
  await h.envoyer({ type: 'ui-ready' });

  assert.equal(pastillesDe(h).at(-1), 'Réglages illisibles');
  const constat = h.messages.find((message) => message.type === 'depots-illisibles');
  assert.ok(constat?.type === 'depots-illisibles');
  assert.equal(constat.texte, 'La liste des dépôts enregistrés sur ce poste est illisible.');
  assert.ok(constat.geste.includes('Réinitialisez la liste'));
  assert.equal(statuts(h).length, 0, 'aucun statut générique ne recouvre le constat');

  await h.envoyer({ type: 'reinitialiser-depots' });
  assert.deepEqual(h.stockage.get('depots'), []);
  assert.deepEqual(derniersReglages(h).depots, []);
  assert.equal(pastillesDe(h).at(-1), 'Aucun dépôt');
});

/**
 * Les deux écritures d'une activation ne sont pas atomiques : la seconde peut
 * échouer seule. L'interface doit alors montrer le stockage, pas ce qu'elle
 * affichait.
 */
test('une activation dont la seconde écriture échoue rend quand même les réglages du stockage', async () => {
  const h = ouvrir();
  h.stockage.set('depots', [
    { repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'secret-test' },
    { repoUrl: 'https://github.com/o/autre', baseBranch: 'main', jeton: 'secret-test' },
  ]);
  h.stockage.set('depotActif', 'github:o/r');
  await h.envoyer({ type: 'ui-ready' });
  const setAsync = h.runtime.clientStorage.setAsync;
  h.runtime.clientStorage.setAsync = async (cle: string, valeur: unknown) => {
    if (cle === 'exportLocal') throw new Error('stockage indisponible');
    return setAsync(cle, valeur);
  };
  await h.envoyer({ type: 'activer-depot', id: 'github:o/autre' });

  assert.equal(h.stockage.get('depotActif'), 'github:o/autre');
  assert.equal(derniersReglages(h).actif, 'github:o/autre');
  assert.equal(pastillesDe(h).at(-1), 'autre connecté');
});

test('une suppression dont le retrait du dépôt actif échoue rend quand même les réglages du stockage', async () => {
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  const deleteAsync = h.runtime.clientStorage.deleteAsync;
  h.runtime.clientStorage.deleteAsync = async (cle: string) => {
    if (cle === 'depotActif') throw new Error('stockage indisponible');
    return deleteAsync(cle);
  };
  await h.envoyer({ type: 'supprimer-depot', id: 'github:o/r' });

  assert.deepEqual(h.stockage.get('depots'), []);
  assert.deepEqual(derniersReglages(h).depots, []);
  assert.equal(pastillesDe(h).at(-1), 'Aucun dépôt');
});
