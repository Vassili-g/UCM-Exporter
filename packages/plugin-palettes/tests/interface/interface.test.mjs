/** Interactions de l'interface construite d'UCM Palettes, avec les messages du sandbox simulés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, before } from 'node:test';
import { chromium } from 'playwright';

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });
const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');

/**
 * Le relevé des demandes que l'interface envoie au sandbox. Il se pose avant
 * le bundle : l'interface demande l'état dès son chargement.
 */
const RELEVE = `<script>
  window.demandes = [];
  window.addEventListener('message', (event) => {
    const type = event.data.pluginMessage && event.data.pluginMessage.type;
    if (type === 'lire-etat' || type === 'ranger-recette') window.demandes.push(event.data.pluginMessage);
  });
</script>`;

/** Ouvre l'interface à sa taille minimale. */
async function ouvrir() {
  const page = await navigateur.newPage({ viewport: { width: 440, height: 520 } });
  page.setDefaultTimeout(5000);
  await page.setContent(html.replace('<head>', () => `<head>${RELEVE}`));
  return page;
}

test('la fenêtre s’ouvre sur l’onglet Palettes et demande l’état du fichier', async () => {
  const page = await ouvrir();
  try {
    const palettes = page.getByRole('tab', { name: 'Palettes', exact: true });
    assert.equal(await palettes.getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('tab', { name: 'Planche', exact: true }).getAttribute('aria-selected'), 'false');
    assert.equal(await page.locator('#panneau-palettes').isVisible(), true);
    assert.equal(await page.locator('#panneau-planche').isVisible(), false);
    await page.waitForFunction(() => window.demandes.length > 0);
    assert.deepEqual(await page.evaluate(() => window.demandes), [{ type: 'lire-etat', demande: 1 }]);
  } finally {
    await page.close();
  }
});

test('l’engrenage ouvre la configuration, le retour ramène aux onglets', async () => {
  const page = await ouvrir();
  try {
    await page.getByRole('button', { name: 'Ouvrir la configuration' }).click();
    assert.equal(await page.getByRole('tablist').isVisible(), false);
    assert.equal(await page.locator('.page-title').textContent(), 'Configuration de la recette');
    await page.getByRole('button', { name: 'Retour' }).click();
    assert.equal(await page.getByRole('tablist').isVisible(), true);
    assert.equal(await page.locator('.page-title').textContent(), 'UCM Palettes');
  } finally {
    await page.close();
  }
});

test('un état plus ancien que la dernière lecture est écarté', async () => {
  const page = await ouvrir();
  try {
    const etat = (demande, classement) => ({ type: 'etat', demande, classement, empreinte: null, profil: 'SRGB' });
    await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), etat(0, { etat: 'future', version: 9 }));
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await page.locator('.constat-bloquant').count(), 0);
    await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), etat(1, { etat: 'future', version: 9 }));
    await page.locator('.constat-bloquant').waitFor();
    assert.match(await page.locator('.constat-ou').textContent(), /version 9/);
  } finally {
    await page.close();
  }
});
