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
      if (event.data.pluginMessage?.type?.startsWith('analyser') || event.data.pluginMessage?.type === 'publier') {
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
    await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
    assert.equal(await page.locator('.carte-tokens').getAttribute('inert'), '');
    await page.locator('.carte-tokens button').first().evaluate((bouton) => bouton.click());
    assert.equal(await page.evaluate(() => window.demandes.length), 1);
    await envoyer(verdict);
    await page.getByRole('button', { name: 'Analyser les tokens du fichier', exact: true }).click();
    await envoyer(verdict);
    await page.locator('.carte-composant').getByRole('button', { name: 'Télécharger', exact: true }).click();
    await page.waitForFunction(() => window.demandes.at(-1)?.type === 'publier');
    assert.deepEqual(await page.evaluate(() => window.demandes.at(-1)), { type: 'publier', genre: 'component' });
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

test('le jeton enregistré ne s’annonce que pour sa forge, et l’adresse d’un dossier dit ce qui est retenu', async () => {
  const { page, envoyer } = await ouvrir();
  try {
    await envoyer({
      type: 'settings',
      settings: { repoUrl: 'https://github.com/mon-org/ds', baseBranch: 'main', forgeDuJeton: 'github' },
    });
    await page.locator('.icon-button').first().click();
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
