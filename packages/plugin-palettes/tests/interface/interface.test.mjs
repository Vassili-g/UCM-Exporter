/** Interactions de l'interface construite d'UCM Palettes, avec les messages du sandbox simulés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

/** Les messages des états de la galerie : l'interface est éprouvée sur les mêmes scénarios. */
const { ETATS } = createRequire(import.meta.url)('../../galerie/etats.cjs');
const messageDe = (id) => ETATS.find((etat) => etat.id === id).atteinte[0].message;

async function ouvrirSur(id) {
  const page = await ouvrir();
  await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), messageDe(id));
  await page.locator('.barre-palette').waitFor();
  return page;
}

const dansLaFenetre = async (locator) => {
  const boite = await locator.boundingBox();
  return boite !== null && boite.y >= 0 && boite.y + boite.height <= 520;
};

test('[UI-03] à 440 × 520, verdict, « Dessiner » et première promesse manquée se lisent sans défiler', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    assert.equal(await page.locator('.verdict').textContent(), '2 promesses manquées');
    assert.equal(await dansLaFenetre(page.locator('.verdict')), true);
    const dessiner = page.getByRole('button', { name: 'Dessiner' });
    assert.equal(await dessiner.isDisabled(), true);
    assert.equal(await dansLaFenetre(dessiner), true);
    assert.equal(await dansLaFenetre(page.locator('.constat-promesse').first()), true);
    assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop), 0);
  } finally {
    await page.close();
  }
});

test('[UI-04] les flèches déplacent le focus sur les pastilles, et le détail suit', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const active = page.locator('.grille-apercu [tabindex="0"]');
    assert.equal(await active.count(), 1);
    await active.focus();
    const focalisee = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    assert.match(await focalisee(), /^vivid\.700 /);
    await page.keyboard.press('ArrowRight');
    assert.match(await focalisee(), /^vivid\.800 /);
    await page.keyboard.press('ArrowUp');
    assert.match(await focalisee(), /^soft\.800 /);
    await page.keyboard.press('Home');
    assert.match(await focalisee(), /^soft\.50 /);
    assert.match(await page.locator('.detail-cran').textContent(), /^soft\.50 · #[0-9A-F]{6} · fond /);
    assert.equal(await page.locator('.grille-apercu [tabindex="0"]').count(), 1);
  } finally {
    await page.close();
  }
});

test('[UI-04] le survol d’une pastille donne son hexa, ses contrastes et ses emplois', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.locator('[aria-label^="vivid.700 "]').hover();
    assert.match(await page.locator('.detail-cran').textContent(), /^vivid\.700 · #[0-9A-F]{6} · fond .* · solid, text, border-control survol$/);
  } finally {
    await page.close();
  }
});

test('la bascule montre la rampe sombre', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const clair = await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Sombre' }).click();
    assert.equal(await page.getByRole('button', { name: 'Sombre' }).getAttribute('aria-pressed'), 'true');
    assert.notEqual(await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label'), clair);
  } finally {
    await page.close();
  }
});

test('[ENT-02] une référence saisie recalcule l’aperçu et la dérive sans passer par le sandbox', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label');
    const derive = await page.locator('.ligne-secondaire').nth(1).textContent();
    await page.locator('.champ-hexa').fill('#1E6FD9');
    assert.notEqual(await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label'), avant);
    assert.notEqual(await page.locator('.ligne-secondaire').nth(1).textContent(), derive);
    assert.deepEqual(await page.evaluate(() => window.demandes.map((demande) => demande.type)), ['lire-etat']);
  } finally {
    await page.close();
  }
});

test('[UI-06] le sélecteur liste les palettes et ouvre celle qu’on choisit au clavier', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.locator('.selecteur-bouton').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('listbox').isVisible(), true);
    assert.deepEqual(await page.getByRole('option').allTextContents(), ['Jaune', 'Bleu']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('listbox').isVisible(), false);
    assert.equal(await page.locator('.champ-hexa').inputValue(), '#1E6FD9');
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Bleu');
  } finally {
    await page.close();
  }
});

/** Une page de la galerie, jouée par le pilote du banc jusqu'à son image stable. */
async function pageDeGalerie(id) {
  const page = await navigateur.newPage({ viewport: { width: 600, height: 720 } });
  page.setDefaultTimeout(5000);
  await page.goto(new URL(`../../dist/galerie/clair/${id}.html`, import.meta.url).href);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  return page;
}

test('le banc de galerie joue un survol : le détail du cran survolé s’affiche', async () => {
  const page = await pageDeGalerie('palette-en-saisie');
  try {
    assert.match(await page.locator('.detail-cran').textContent(), /^vivid\.700 · #/);
    assert.equal(await page.locator('.champ-hexa').inputValue(), '#7C3AED');
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue une touche : le focus avance d’un cran', async () => {
  const page = await pageDeGalerie('promesses-manquees');
  try {
    assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /^vivid\.800 /);
  } finally {
    await page.close();
  }
});
