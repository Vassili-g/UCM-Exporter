/** Interactions de l'interface construite, avec les messages du sandbox simulés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import { chromium } from 'playwright';

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });
const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');
const cible = (selectionId) => ({
  type: 'cible', selectionId, cible: { nom: 'Exemple', genre: 'component', variants: 1 },
  detail: 'Component', raison: null, avertissement: null,
});
const verdict = { type: 'verdict', code: 'sans-depot', texte: 'Prêt', action: 'Télécharger', etat: '' };

async function ouvrir() {
  const page = await navigateur.newPage({ viewport: { width: 320, height: 420 } });
  page.setDefaultTimeout(5000);
  await page.setContent(html);
  await page.evaluate(() => {
    window.demandes = [];
    window.addEventListener('message', (event) => {
      if (event.data.pluginMessage?.type?.startsWith('analyser') || event.data.pluginMessage?.type === 'publier' || ['gerer-tokens', 'export-local', 'enregistrer-depot', 'activer-depot', 'supprimer-depot'].includes(event.data.pluginMessage?.type)) {
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
    await envoyer({ type: 'connection', state: 'local', pastille: 'export local', geste: null });
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
    await envoyer(teste(DEPOT.id, 'connected', 'Connecté', 2));
    assert.equal(await deplier.getAttribute('aria-expanded'), 'false');
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
