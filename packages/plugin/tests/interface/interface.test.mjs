/** Interactions de l'interface construite, avec les messages du sandbox simulés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import { chromium } from 'playwright';

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });
const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');
const cible = (selectionId, offre = null) => ({
  type: 'cible', selectionId, cible: { nom: 'Exemple', genre: 'component', variants: 1 },
  detail: 'Component', raison: null, offre, avertissement: null,
});
const verdict = { type: 'verdict', code: 'sans-depot', texte: 'Prêt', action: 'Télécharger', etat: '' };

async function ouvrir() {
  const page = await navigateur.newPage({ viewport: { width: 320, height: 420 } });
  page.setDefaultTimeout(5000);
  await page.setContent(html);
  await page.evaluate(() => {
    window.demandes = [];
    window.addEventListener('message', (event) => {
      if (event.data.pluginMessage?.type?.startsWith('analyser') || event.data.pluginMessage?.type === 'publier' || ['gerer-tokens', 'export-local', 'enregistrer-depot', 'activer-depot', 'supprimer-depot', 'creer-regles', 'open-external'].includes(event.data.pluginMessage?.type)) {
        window.demandes.push(event.data.pluginMessage);
      }
    });
  });
  const envoyer = async (message) => {
    await page.evaluate((pluginMessage) => window.postMessage({ pluginMessage }, '*'), message);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
  };
  await envoyer(cible('a'));
  await envoyer({ type: 'tokens', presents: true, resume: '1 variable' });
  return { page, envoyer };
}

test('une analyse occupe les deux cartes et chaque publication nomme son artefact', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer(reglages(A));
    await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
    assert.equal(await page.locator('.carte-tokens').getAttribute('inert'), '');
    await page.locator('.carte-tokens button').first().evaluate((bouton) => bouton.click());
    assert.equal(await page.evaluate(() => window.demandes.length), 1);
    await envoyer(verdict);
    await page.getByRole('button', { name: 'Analyser les tokens du fichier', exact: true }).click();
    await envoyer(verdict);
    await page.locator('.carte-composant').getByRole('button', { name: 'Télécharger', exact: true }).click();
    await page.waitForFunction(() => window.demandes.at(-1)?.type === 'publier');
    assert.deepEqual(await page.evaluate(() => window.demandes.at(-1)), { type: 'publier', genre: 'component', operation: 3 });
  } finally {
    await page.close();
  }
});

test('un composant homonyme invalide le verdict, une seconde notification du même composant le conserve', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
    await envoyer(verdict);
    await envoyer(cible('a'));
    const bouton = page.getByRole('button', { name: 'Télécharger', exact: true });
    assert.equal(await bouton.isVisible(), true);
    await envoyer(cible('b'));
    assert.equal(await bouton.isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Analyser le composant', exact: true }).isEnabled(), true);
  } finally {
    await page.close();
  }
});

const creer = (page) => page.getByRole('button', { name: 'Créer les règles d’usage', exact: true });

test('le bouton de création suit l’offre de la page : actif, inactif sous sa note, ou absent', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    // Le premier message d'une sélection part avant la lecture de la page.
    assert.equal(await creer(page).count(), 0);

    await envoyer(cible('b', 'creer'));
    assert.equal(await creer(page).isEnabled(), true);
    assert.equal(await page.locator('.creation-sans-source').isVisible(), false);

    await envoyer(cible('c', 'remplir'));
    assert.equal(await creer(page).isEnabled(), true);

    await envoyer(cible('d', 'sans-source'));
    assert.equal(await creer(page).isVisible(), true);
    assert.equal(await creer(page).isDisabled(), true);
    assert.match(await page.locator('.creation-sans-source').innerText(), /Aucune instance de « .componentRules »/);

    await envoyer(cible('e', null));
    assert.equal(await creer(page).count(), 0);
    assert.equal(await page.locator('.creation-sans-source').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('la création occupe les deux gestes de la carte et n’offre aucune annulation', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer(cible('b', 'creer'));
    await creer(page).click();
    assert.deepEqual(await derniere(page, 'creer-regles'), { type: 'creer-regles', operation: 1 });
    await envoyer({ type: 'status', state: 'loading', text: 'Création des règles d’usage…', operation: 1 });
    assert.equal(await creer(page).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Analyser le composant', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.carte-composant').getByRole('button').count(), 2);

    await envoyer({ type: 'status', state: 'success', text: '7 règles posées.', operation: 1 });
    assert.equal(await page.getByRole('button', { name: 'Analyser le composant', exact: true }).isEnabled(), true);
    assert.match(await page.locator('.carte-composant .note').innerText(), /7 règles posées\./);
  } finally {
    await page.close();
  }
});

test('un point à corriger pose ses éléments en liste, un par ligne', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer(cible('b', 'creer'));
    await creer(page).click();
    await envoyer({
      type: 'diagnostic',
      severite: 'danger',
      titre: 'Le composant « Exemple » intègre « Button », dont 3 propriétés ne sont pas documentées :',
      elements: ['size', 'label', 'iconLeft'],
      impact: 'Sans les règles de « Button », le contrat décrit ses internes.',
      action: 'Créez et complétez les règles de « Button ».',
      operation: 1,
    });
    const liste = page.locator('.carte-danger .carte-liste li');
    assert.deepEqual(await liste.allInnerTexts(), ['size', 'label', 'iconLeft']);
    // La liste se lit entre le titre et la conséquence : les propriétés sont ce
    // que le titre annonce, pas un ajout après coup.
    assert.deepEqual(
      await page.locator('.carte-danger > *').evaluateAll(
        (enfants) => enfants.map((enfant) => enfant.className),
      ),
      ['pastille pastille-danger', 'carte-titre', 'carte-liste', 'carte-impact', 'carte-action'],
    );
  } finally {
    await page.close();
  }
});

test('un point sans éléments ne pose aucune liste', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
    await envoyer({
      type: 'diagnostic',
      titre: 'Layer « Border » : l’alignement du stroke est illisible.',
      impact: 'Le développeur ne saura pas de quel côté poser le trait.',
      action: 'Choisissez un alignement, puis réexportez.',
      operation: 1,
    });
    assert.equal(await page.locator('.carte-liste').count(), 0);
  } finally {
    await page.close();
  }
});

/**
 * Le moteur émet les points bloquants après les avertissements : il lit le
 * contrat qu'il vient de produire pour les relever. Les lire en dernier ferait
 * corriger dix détails avant d'apprendre que le contrat est faux.
 */
test('un point bloquant émis en dernier se lit en premier', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
    const avertissement = (nom) => ({
      type: 'diagnostic',
      titre: `Layer « ${nom} » : il n’est pas à l’intérieur de « Contenu ».`,
      impact: 'Impact.',
      action: 'Action.',
      operation: 1,
    });
    await envoyer(avertissement('Badge'));
    await envoyer(avertissement('Divider'));
    await envoyer({
      type: 'diagnostic',
      severite: 'danger',
      titre: 'Le composant « Exemple » intègre « Alert », qui n’a pas ses règles d’usage.',
      impact: 'Sans les règles de « Alert », le contrat décrit ses internes.',
      action: 'Créez et complétez les règles de « Alert ».',
      operation: 1,
    });
    assert.deepEqual(
      await page.locator('.groupe-liste .carte').evaluateAll(
        (cartes) => cartes.map((carte) => carte.className),
      ),
      ['carte carte-danger', 'carte carte-avertissement', 'carte carte-avertissement'],
    );
    // L'ordre d'arrivée survit entre eux : deux bloquants se suivent comme le
    // moteur les a écrits, et les avertissements gardent le leur.
    assert.match(
      await page.locator('.groupe-liste .carte').nth(1).innerText(),
      /« Badge »/,
    );
  } finally {
    await page.close();
  }
});

/**
 * Une iframe de plugin n'a pas de navigateur : un lien suivi y remplacerait
 * l'interface par la page visée, sans retour possible.
 */
test('le lien de la note sans source passe par le sandbox, sans quitter l’interface', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer(cible('b', 'sans-source'));
    const avant = page.url();
    await page.getByRole('link', { name: 'Ouvrir le kit de règles' }).click();
    const demande = await derniere(page, 'open-external');
    assert.equal(demande.type, 'open-external');
    assert.match(demande.url, /^https:\/\/www\.figma\.com\/community\/file\//);
    assert.equal(page.url(), avant);
  } finally {
    await page.close();
  }
});

const DEPOT = {
  id: 'github:mon-org/ds', forge: 'github', projet: 'mon-org/ds', nom: 'ds',
  repoUrl: 'https://github.com/mon-org/ds', baseBranch: 'main', jeton: true,
};
const reglages = (destination, tokens = true, depots = [DEPOT]) => ({
  type: 'settings',
  settings: { destination, tokens, exportLocal: false, actif: depots[0]?.id ?? null, depots },
});
const A = JSON.stringify(['github', 'mon-org/ds', 'main', true]);
const B = JSON.stringify(['github', 'mon-org/autre', 'main', true]);
const point = { titre: 'Layer « Border » : l’alignement du stroke est illisible.', impact: 'Impact.', action: 'Action.' };

/** Analyse le composant sous la destination A, avec un point à corriger. */
async function analyserSousA(page, envoyer) {
  await envoyer(reglages(A));
  await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
  await envoyer({ type: 'diagnostic', ...point, destination: A, operation: 1 });
  await envoyer({ type: 'verdict', code: 'a-publier', texte: 'Prêt', action: 'Publier le composant', etat: 'warning', destination: A, operation: 1 });
}

test('une publication réussie garde son lien et ses points à corriger après le rechargement des réglages', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await analyserSousA(page, envoyer);
    await page.getByRole('button', { name: 'Publier le composant', exact: true }).click();
    await envoyer({ type: 'demande', url: 'https://github.com/mon-org/ds/pull/1', libelle: 'Ouvrir la pull request', destination: A, operation: 2 });
    await envoyer(reglages(A));
    await envoyer({ type: 'status', state: 'success', text: 'Contrat généré. Pull request créée.', destination: A, operation: 2 });
    assert.equal(await page.getByRole('link', { name: 'Ouvrir la pull request' }).isVisible(), true);
    assert.equal(await page.getByText(point.titre).isVisible(), true);
  } finally {
    await page.close();
  }
});

test('un changement de destination rend l’analyse disponible, un enregistrement à destination inchangée garde le résultat', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await analyserSousA(page, envoyer);
    const publier = page.getByRole('button', { name: 'Publier le composant', exact: true });
    await envoyer(reglages(A));
    assert.equal(await publier.isVisible(), true);
    assert.equal(await page.getByText(point.titre).isVisible(), true);

    await envoyer(reglages(B));
    assert.equal(await publier.isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Analyser le composant', exact: true }).isEnabled(), true);
  } finally {
    await page.close();
  }
});

const DEPOT_GITLAB = {
  id: 'gitlab:mon-groupe/design-system', forge: 'gitlab', projet: 'mon-groupe/design-system', nom: 'design-system',
  repoUrl: 'https://gitlab.com/mon-groupe/design-system', baseBranch: 'main', jeton: true,
};
const DEUX = (actif = DEPOT.id) => ({
  type: 'settings',
  settings: { destination: A, tokens: true, exportLocal: false, actif, depots: [DEPOT, DEPOT_GITLAB] },
});
const teste = (id, etat, statut, generation = 1) => ({
  type: 'depot-teste', id, generation, etat, statut, geste: null, destination: null,
});

/** Ouvre l'onglet Dépôts avec la liste reçue. */
async function ouvrirDepots(page, envoyer, reglages) {
  await envoyer(reglages);
  await page.locator('.icon-button').first().click();
  await page.getByRole('tab', { name: 'Dépôts' }).click();
}

const derniere = (page, type) => page.waitForFunction((attendu) => window.demandes.at(-1)?.type === attendu, type)
  .then(() => page.evaluate(() => window.demandes.at(-1)));

test('en export local, la pastille avertit, aucune carte n’est connectée, et l’onglet Dépôts dit pourquoi', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    const LOCAL = JSON.stringify(['local', true]);
    await envoyer({ ...DEUX(), settings: { ...DEUX().settings, destination: LOCAL, exportLocal: true } });
    await envoyer({ type: 'connection', state: 'local', pastille: 'Export en local', geste: null });
    const pastille = page.locator('.connection-status');
    assert.equal(await pastille.getAttribute('data-state'), 'local');
    assert.notEqual(
      await pastille.evaluate((element) => getComputedStyle(element).color),
      await pastille.evaluate((element) => { element.dataset.state = 'disconnected'; const couleur = getComputedStyle(element).color; element.dataset.state = 'local'; return couleur; }),
    );

    await page.locator('.icon-button').first().click();
    const interrupteur = page.getByRole('switch', { name: 'Activer l’export local' });
    assert.equal(await interrupteur.getAttribute('aria-checked'), 'true');
    await page.getByRole('tab', { name: 'Dépôts' }).click();
    const ligne = page.getByText('Export local activé dans Général : les exports sont téléchargés sur votre poste.');
    assert.equal(await ligne.isVisible(), true);
    await envoyer(teste(DEPOT.id, 'connected', 'Connecté'));
    assert.equal(await page.getByRole('button', { name: 'Se connecter', exact: true }).count(), 2);
    assert.equal(await page.getByText('Connecté', { exact: true }).isVisible(), false);

    await page.getByRole('tab', { name: 'Général' }).click();
    await interrupteur.click();
    assert.deepEqual(await derniere(page, 'export-local'), { type: 'export-local', valeur: false });
    await envoyer(DEUX());
    assert.equal(await ligne.isVisible(), false);
    assert.equal(await interrupteur.getAttribute('aria-checked'), 'false');
  } finally {
    await page.close();
  }
});

test('les onglets gardent une largeur stable et les cartes de dépôt affichent un indice de clic', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer(DEUX());
    await page.locator('.icon-button').first().click();
    await page.getByRole('tab', { name: 'Dépôts' }).click();
    const onglets = page.locator('.onglet');
    const largeurs = await onglets.evaluateAll((elements) =>
      elements.map((onglet) => Math.round(onglet.getBoundingClientRect().width)),
    );
    assert.deepEqual(largeurs, [largeurs[0], largeurs[0]]);
    const alignement = await onglets.first().evaluate((onglet) => getComputedStyle(onglet).alignItems);
    assert.equal(alignement, 'center');

    const hauteurs = await page.locator('.carte-depot-entete').evaluateAll((entetes) =>
      entetes.map((entete) => Math.round(entete.getBoundingClientRect().height)),
    );
    assert.deepEqual(hauteurs, [hauteurs[0], hauteurs[0]]);

    const nom = page.locator('.carte-depot-nom').first();
    await nom.scrollIntoViewIfNeeded();
    const avant = await nom.evaluate((bouton) => bouton.matches(':hover'));
    await nom.hover();
    const survole = await nom.evaluate((bouton) => bouton.matches(':hover'));
    assert.equal(avant, false);
    assert.equal(survole, true);
  } finally {
    await page.close();
  }
});

test('« Se connecter » agit en un clic sans déplier la carte, et la suppression attend un second clic', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, DEUX());
    const carte = page.locator('.carte-depot').nth(1);
    const deplier = carte.getByRole('button', { name: 'design-system', exact: true });
    assert.equal(await deplier.getAttribute('aria-expanded'), 'false');
    await carte.getByRole('button', { name: 'Se connecter', exact: true }).click();
    assert.deepEqual(await derniere(page, 'activer-depot'), { type: 'activer-depot', id: DEPOT_GITLAB.id });
    assert.equal(await deplier.getAttribute('aria-expanded'), 'false');

    await deplier.click();
    await carte.getByRole('button', { name: 'Supprimer', exact: true }).click();
    assert.equal(await page.evaluate(() => window.demandes.at(-1)?.type), 'activer-depot');
    await carte.getByRole('button', { name: 'Confirmer la suppression', exact: true }).click();
    assert.deepEqual(await derniere(page, 'supprimer-depot'), { type: 'supprimer-depot', id: DEPOT_GITLAB.id });
  } finally {
    await page.close();
  }
});

test('la suppression armée se désarme dès que le clic suivant va ailleurs', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, DEUX());
    const carte = page.locator('.carte-depot').nth(1);
    const deplier = carte.getByRole('button', { name: 'design-system', exact: true });
    await deplier.click();
    const supprimer = carte.getByRole('button', { name: 'Supprimer', exact: true });
    await supprimer.click();
    await assert.doesNotReject(carte.getByRole('button', { name: 'Confirmer la suppression', exact: true }).waitFor());

    // Le designer va ailleurs : le bouton reprend son libellé.
    await carte.locator('input[name="baseBranch"]').click();
    await assert.doesNotReject(supprimer.waitFor());

    // Replier la carte désarme aussi : le bouton quitte la vue.
    await supprimer.click();
    await deplier.click();
    await deplier.click();
    await assert.doesNotReject(supprimer.waitFor());

    // Un clic isolé n'a donc jamais supprimé le dépôt.
    assert.equal(await page.evaluate(() => window.demandes.some(({ type }) => type === 'supprimer-depot')), false);
  } finally {
    await page.close();
  }
});

test('une carte dépliée garde sa saisie à la réception des réglages, et se replie après un enregistrement et un test réussis', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, DEUX());
    const carte = page.locator('.carte-depot').first();
    const deplier = carte.getByRole('button', { name: 'ds', exact: true });
    await deplier.click();
    await carte.locator('input[name="baseBranch"]').fill('develop');
    await carte.locator('input[name="jeton"]').fill('ghp_nouveau');
    await envoyer(DEUX());
    assert.equal(await deplier.getAttribute('aria-expanded'), 'true');
    assert.equal(await carte.locator('input[name="baseBranch"]').inputValue(), 'develop');
    assert.equal(await carte.locator('input[name="repoUrl"]').getAttribute('readonly'), '');

    await carte.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    const demande = await derniere(page, 'enregistrer-depot');
    assert.deepEqual(demande.settings, { repoUrl: DEPOT.repoUrl, baseBranch: 'develop', jeton: 'ghp_nouveau' });
    await envoyer({ type: 'depot-enregistre', requete: demande.requete, carte: demande.carte, id: DEPOT.id, erreurs: {} });
    assert.equal(await carte.locator('input[name="jeton"]').inputValue(), '');
    await envoyer(teste(DEPOT.id, 'checking', 'Connexion…'));
    assert.equal(await deplier.getAttribute('aria-expanded'), 'true');
    await envoyer(teste(DEPOT.id, 'connected', 'Connecté'));
    assert.equal(await deplier.getAttribute('aria-expanded'), 'false');
    assert.equal(await carte.locator('.carte-depot-statut').innerText(), 'Connecté');
  } finally {
    await page.close();
  }
});

/**
 * Un test annonce sa génération avant de rendre son résultat, et une génération
 * périmée ne rend rien. La carte qui attend le test de son enregistrement
 * attend donc ce numéro, et non le prochain résultat venu : le test suivant du
 * dépôt, venu d'un rafraîchissement, la repliait sinon sous les yeux du
 * designer, longtemps après l'enregistrement.
 */
test('une carte dont le test a été périmé ne se replie pas sur le test suivant de son dépôt', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, DEUX());
    const carte = page.locator('.carte-depot').first();
    const deplier = carte.getByRole('button', { name: 'ds', exact: true });
    await deplier.click();
    await carte.locator('input[name="jeton"]').fill('ghp_nouveau');
    await carte.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    const demande = await derniere(page, 'enregistrer-depot');
    await envoyer({ type: 'depot-enregistre', requete: demande.requete, carte: demande.carte, id: DEPOT.id, erreurs: {} });
    await envoyer(teste(DEPOT.id, 'checking', 'Connexion…'));
    // La génération 1 est périmée ici : elle ne rendra aucun résultat.
    await envoyer(DEUX());
    await envoyer(teste(DEPOT.id, 'checking', 'Connexion…', 2));
    await envoyer(teste(DEPOT.id, 'connected', 'Connecté', 2));
    assert.equal(await deplier.getAttribute('aria-expanded'), 'true');
    assert.equal(await carte.locator('.carte-depot-statut').innerText(), 'Connecté');
  } finally {
    await page.close();
  }
});

test('deux cartes nouvelles reçoivent chacune leur réponse, sans carte en double', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, reglages(JSON.stringify(['aucune', true]), true, []));
    assert.equal(await page.getByText('Veuillez ajouter un dépôt.').isVisible(), true);
    const ajouter = page.getByRole('button', { name: 'Ajouter un dépôt', exact: true });
    await ajouter.click();
    await ajouter.click();
    const cartes = page.locator('.carte-depot');
    assert.equal(await cartes.count(), 2);

    const remplir = async (rang, adresse, jeton) => {
      const carte = cartes.nth(rang);
      await carte.locator('input[name="repoUrl"]').fill(adresse);
      await carte.locator('input[name="jeton"]').fill(jeton);
      await carte.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    };
    await remplir(0, DEPOT.repoUrl, 'ghp_a');
    const premiere = await derniere(page, 'enregistrer-depot');
    await remplir(1, 'https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines', 'glpat-b');
    await page.waitForFunction(() => window.demandes.filter(({ type }) => type === 'enregistrer-depot').length === 2);
    const seconde = await page.evaluate(() => window.demandes.at(-1));
    assert.notEqual(premiere.carte, seconde.carte);
    const texteGitlab = await cartes.nth(1).innerText();
    assert.ok(texteGitlab.includes('Projet GitLab : mon-groupe/design-system'), texteGitlab);
    assert.ok(texteGitlab.includes('désignait un dossier'), texteGitlab);

    await envoyer({ type: 'depot-enregistre', requete: seconde.requete, carte: seconde.carte, id: DEPOT_GITLAB.id, erreurs: {} });
    await envoyer({ type: 'depot-enregistre', requete: premiere.requete, carte: premiere.carte, id: null, erreurs: { repoUrl: 'Ce repository est déjà dans la liste.' } });
    await envoyer(reglages(A, true, [DEPOT_GITLAB]));
    assert.equal(await cartes.count(), 2);
    assert.ok((await cartes.nth(1).innerText()).includes('Ce repository est déjà dans la liste.'));
    assert.equal(await cartes.nth(0).getByRole('button', { name: 'design-system', exact: true }).count(), 1);
  } finally {
    await page.close();
  }
});

/**
 * Une carte vit sous une clé temporaire jusqu'à sa réponse, puis sous son
 * identité, et c'est `settings` qui lui donne son dépôt. Un `settings` qui liste
 * le dépôt avant que la réponse arrive crée donc la carte de ce dépôt : celle de
 * la saisie reste sans identité, aucun `settings` ne la retrouve, et elle
 * resterait en fin de liste sans plus rien recevoir.
 */
test('une réponse d’enregistrement pour un dépôt qui a déjà sa carte n’en laisse qu’une', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, reglages(A, true, [DEPOT]));
    await page.getByRole('button', { name: 'Ajouter un dépôt', exact: true }).click();
    const cartes = page.locator('.carte-depot');
    await cartes.last().locator('input[name="repoUrl"]').fill(DEPOT_GITLAB.repoUrl);
    await cartes.last().locator('input[name="jeton"]').fill('glpat-b');
    await cartes.last().getByRole('button', { name: 'Enregistrer', exact: true }).click();
    const demande = await derniere(page, 'enregistrer-depot');

    await envoyer(DEUX());
    await envoyer({ type: 'depot-enregistre', requete: demande.requete, carte: demande.carte, id: DEPOT_GITLAB.id, erreurs: {} });
    await envoyer(DEUX());
    assert.equal(await cartes.count(), 2);
    assert.equal(await cartes.getByRole('button', { name: 'design-system', exact: true }).count(), 1);
  } finally {
    await page.close();
  }
});

/**
 * La clé d'une carte enregistrée porte les deux-points de son identité, si bien
 * que `corps-github:mon-org/ds` ne se vise par aucun sélecteur CSS sans
 * échappement. L'identifiant reste valide en HTML et `aria-controls` le
 * retrouve : cette loi tient ce point, et aucun code du plugin ne construit de
 * sélecteur sur cet identifiant.
 */
test('le corps d’une carte se retrouve par l’identifiant que son en-tête annonce', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, reglages(A, true, [DEPOT]));
    await page.getByRole('button', { name: 'Ajouter un dépôt', exact: true }).click();
    const annonces = await page.locator('.carte-depot [aria-controls]')
      .evaluateAll((entetes) => entetes.map((entete) => entete.getAttribute('aria-controls')));
    assert.equal(annonces.length, 2);
    assert.ok(annonces.includes(`corps-${DEPOT.id}`), annonces.join(', '));
    for (const identifiant of annonces) {
      assert.equal(
        await page.evaluate((cible) => document.getElementById(cible)?.className, identifiant),
        'carte-depot-corps',
        `${identifiant} ne retrouve pas son corps`,
      );
    }
  } finally {
    await page.close();
  }
});

/**
 * Une liste de dépôts illisible n'envoie aucun `settings`. Les interrupteurs ne
 * reçoivent donc jamais leur valeur, et « Gérer les tokens », posé à `false`,
 * montrait l'inverse de son réglage par défaut.
 */
test('les interrupteurs attendent leur réglage avant de se laisser actionner', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await page.locator('.icon-button').first().click();
    const tokens = page.getByRole('switch', { name: 'Gérer les tokens' });
    const local = page.getByRole('switch', { name: 'Activer l’export local' });
    assert.equal(await tokens.isDisabled(), true);
    assert.equal(await local.isDisabled(), true);
    await envoyer(reglages(A));
    assert.equal(await tokens.isDisabled(), false);
    assert.equal(await tokens.getAttribute('aria-checked'), 'true');
    assert.equal(await local.isDisabled(), false);
    assert.equal(await local.getAttribute('aria-checked'), 'false');
  } finally {
    await page.close();
  }
});

test('la carte des tokens attend le réglage, et suit sa valeur', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    const carte = page.locator('.carte-tokens');
    assert.equal(await carte.isVisible(), false);
    await envoyer(reglages(A));
    assert.equal(await carte.isVisible(), true);
    assert.match(await carte.innerText(), /1 variable/);
    await envoyer(reglages(JSON.stringify(['github', 'mon-org/ds', 'main', false]), false));
    assert.equal(await carte.isVisible(), false);
    await envoyer(reglages(A));
    assert.equal(await carte.isVisible(), true);
    assert.match(await carte.innerText(), /Lecture des variables du fichier/);
    assert.equal(await page.getByRole('button', { name: 'Analyser les tokens du fichier', exact: true }).isVisible(), false);
  } finally {
    await page.close();
  }
});

test('les onglets de la configuration se parcourent au clavier, et chaque entrée ouvre le sien', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer(reglages(A));
    const general = page.getByRole('tab', { name: 'Général' });
    const depots = page.getByRole('tab', { name: 'Dépôts' });
    await page.locator('.icon-button').first().click();
    assert.equal(await general.getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), 'onglet-general');
    assert.equal(await depots.getAttribute('tabindex'), '-1');

    await general.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await depots.getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'onglet-depots');
    assert.equal(await page.getByRole('button', { name: 'Ajouter un dépôt', exact: true }).isVisible(), true);
    await page.keyboard.press('Home');
    assert.equal(await general.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await depots.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await general.getAttribute('aria-selected'), 'true');

    const interrupteur = page.getByRole('switch', { name: 'Gérer les tokens' });
    assert.equal(await interrupteur.getAttribute('aria-checked'), 'true');
    await interrupteur.click();
    await page.waitForFunction(() => window.demandes.at(-1)?.type === 'gerer-tokens');
    assert.deepEqual(await page.evaluate(() => window.demandes.at(-1)), { type: 'gerer-tokens', valeur: false });

    await page.getByRole('button', { name: 'Retour' }).click();
    await page.locator('.connection-status').click();
    assert.equal(await depots.getAttribute('aria-selected'), 'true');
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.locator('.icon-button').first().click();
    assert.equal(await depots.getAttribute('aria-selected'), 'true');
  } finally {
    await page.close();
  }
});

/**
 * Une erreur de fenêtre libère les cartes, donc la carte n'attend plus sa
 * réponse. Le dépôt, lui, est enregistré : sa clé doit suivre son identité,
 * sans quoi le `settings` suivant crée une seconde carte pour le même dépôt.
 */
test('une réponse d’enregistrement arrivée après une erreur de fenêtre ne dédouble pas la carte', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await ouvrirDepots(page, envoyer, reglages(A, true, []));
    await page.getByRole('button', { name: 'Ajouter un dépôt', exact: true }).click();
    const carte = page.locator('.carte-depot').first();
    await carte.locator('input[name="repoUrl"]').fill(DEPOT.repoUrl);
    await carte.locator('input[name="jeton"]').fill('ghp_jeton');
    await carte.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    const demande = await derniere(page, 'enregistrer-depot');

    await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'panne' })));
    await envoyer({ type: 'depot-enregistre', requete: demande.requete, carte: demande.carte, id: DEPOT.id, erreurs: {} });
    await envoyer(reglages(A, true, [DEPOT]));

    assert.equal(await page.locator('.carte-depot').count(), 1);
  } finally {
    await page.close();
  }
});
