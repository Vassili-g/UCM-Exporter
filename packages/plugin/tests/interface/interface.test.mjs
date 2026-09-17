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
      if (event.data.pluginMessage?.type?.startsWith('analyser') || event.data.pluginMessage?.type === 'publier' || event.data.pluginMessage?.type === 'gerer-tokens') {
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

const reglages = (destination, tokens = true) => ({
  type: 'settings',
  settings: { repoUrl: 'https://github.com/mon-org/ds', baseBranch: 'main', forgeDuJeton: 'github', destination, tokens },
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

test('le jeton enregistré ne s’annonce que pour sa forge, et l’adresse d’un dossier dit ce qui est retenu', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer({
      type: 'settings',
      settings: { repoUrl: 'https://github.com/mon-org/ds', baseBranch: 'main', forgeDuJeton: 'github', destination: A, tokens: true },
    });
    await page.locator('.icon-button').first().click();
    await page.getByRole('tab', { name: 'Dépôts' }).click();
    const jeton = page.locator('input[name="jeton"]');
    const adresse = page.locator('input[name="repoUrl"]');
    assert.match(await jeton.getAttribute('placeholder'), /Token enregistré/);

    await adresse.fill('https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines?ref_type=heads');
    assert.equal(await jeton.getAttribute('placeholder'), '');
    const champ = page.locator('label.field', { has: adresse });
    assert.match(await champ.innerText(), /Projet GitLab : mon-groupe\/design-system/);
    assert.match(await champ.innerText(), /désignait un dossier/);
    assert.match(await page.locator('label.field', { has: jeton }).innerText(), /Jeton d’accès[\s\S]*scope api/);

    await adresse.fill('https://github.com/mon-org/ds');
    assert.match(await jeton.getAttribute('placeholder'), /Token enregistré/);
    assert.doesNotMatch(await champ.innerText(), /désignait un dossier/);
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
    assert.equal(await page.locator('input[name="repoUrl"]').isVisible(), true);
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
