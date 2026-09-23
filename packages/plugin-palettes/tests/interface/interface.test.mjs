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
    if (['lire-etat', 'lire-selection', 'ranger-recette'].includes(type)) window.demandes.push(event.data.pluginMessage);
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

const envoyer = async (page, message) => {
  await page.evaluate((pluginMessage) => window.postMessage({ pluginMessage }, '*'), message);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
};
const demandes = (page) => page.evaluate(() => window.demandes);
const compte = async (page) => (await demandes(page)).length;
/** La prochaine demande que l'interface envoie après la `rang`-ième : `postMessage` est asynchrone. */
async function prochaine(page, rang) {
  await page.waitForFunction((n) => window.demandes.length > n, rang);
  return (await demandes(page))[rang];
}
const rangee = (demande) => ({ type: 'rangement', demande, issue: { issue: 'rangee', empreinte: '0000000f' } });

test('[ENT-03] au premier lancement, créer une palette la range, sans empreinte lue', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('premier-lancement'));
    const avant = await compte(page);
    await page.locator('.champ-creation').fill('#1E6FD9');
    await page.getByRole('button', { name: 'Créer', exact: true }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.empreinteLue, null);
    assert.equal(demande.recette.palettes.length, 1);
    assert.match(demande.recette.palettes[0].id, /^p-[0-9a-f]{8}$/);
    assert.equal(await page.locator('.etat-rangement').textContent(), 'rangement…');
    await envoyer(page, rangee(demande.demande));
    assert.equal(await page.locator('.etat-rangement').textContent(), 'rangé');
  } finally {
    await page.close();
  }
});

test('D-D : un nom se range quand le champ est validé, jamais pendant la saisie', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    const nom = page.getByRole('textbox', { name: 'Nom' });
    await nom.fill('Soleil');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'la saisie ne range rien');
    await nom.press('Tab');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.palettes[0].nom, 'Soleil');
    assert.equal(demande.empreinteLue, messageDe('alertes-seules').empreinte);
  } finally {
    await page.close();
  }
});

test('[ENT-03] dupliquer, monter, puis supprimer après confirmation', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const geste = async (nom) => {
      const avant = await compte(page);
      await page.getByRole('button', { name: 'Gestes de la palette' }).click();
      await page.getByRole('menuitem', { name: nom }).click();
      return avant;
    };
    let demande = await prochaine(page, await geste('Dupliquer'));
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune', 'Jaune (copie)', 'Bleu']);
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Jaune (copie)');
    await envoyer(page, rangee(demande.demande));
    demande = await prochaine(page, await geste('Monter'));
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune (copie)', 'Jaune', 'Bleu']);
    await envoyer(page, rangee(demande.demande));
    const avant = await geste('Supprimer');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'la suppression attend sa confirmation');
    await page.locator('.confirmation').getByRole('button', { name: 'Supprimer' }).click();
    demande = await prochaine(page, avant);
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune', 'Bleu']);
  } finally {
    await page.close();
  }
});

test('[REC-10] un rangement refusé propose « Recharger », qui relit l’état', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    let avant = await compte(page);
    await page.getByRole('button', { name: 'Gestes de la palette' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer' }).click();
    const demande = await prochaine(page, avant);
    await envoyer(page, { type: 'rangement', demande: demande.demande, issue: { issue: 'modifiee-ailleurs' } });
    avant = await compte(page);
    await page.getByRole('button', { name: 'Recharger' }).click();
    const relecture = await prochaine(page, avant);
    assert.equal(relecture.type, 'lire-etat');
    await envoyer(page, { ...messageDe('alertes-seules'), demande: relecture.demande });
    assert.equal(await page.getByRole('button', { name: 'Recharger' }).count(), 0);
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Jaune');
  } finally {
    await page.close();
  }
});

test('E13 : la fenêtre relit l’état quand elle reprend le focus', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });
    assert.equal((await prochaine(page, avant)).type, 'lire-etat');
  } finally {
    await page.close();
  }
});

test('[ENT-04] une palette se crée depuis la couleur de la sélection', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    let avant = await compte(page);
    await page.getByRole('button', { name: 'Nouvelle palette' }).click();
    await page.getByRole('button', { name: 'Depuis la sélection' }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'lire-selection');
    await envoyer(page, { type: 'selection', demande: demande.demande, lecture: { raison: 'sans-remplissage-uni' } });
    assert.match(await page.locator('.creation .field-error').textContent(), /remplissage uni/);
    avant = await compte(page);
    await envoyer(page, { type: 'selection', demande: demande.demande, lecture: { hexa: '#16A34A', ramenee: false } });
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    assert.equal(rangement.recette.palettes.at(-1).reference, '#16A34A');
    assert.equal(await page.locator('.champ-hexa').inputValue(), '#16A34A');
  } finally {
    await page.close();
  }
});

test('un hexa impossible se signale sous le champ, et l’aperçu ne change pas', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label');
    await page.locator('.champ-hexa').fill('#FACZ15');
    assert.equal(await page.locator('.champ-hexa').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('#panneau-palettes .ligne-reference + .field-error').textContent(), /n’est pas une couleur/);
    assert.equal(await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label'), avant);
  } finally {
    await page.close();
  }
});

test('E13 : le premier focus de la fenêtre ne relit rien, l’état vient d’être lu', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant);
  } finally {
    await page.close();
  }
});

test('[UI-03] un nom de palette long ne pousse ni les gestes ni « Dessiner » hors de la fenêtre', async () => {
  const page = await ouvrir();
  try {
    const message = structuredClone(messageDe('alertes-seules'));
    message.classement.recette.palettes[0].nom = 'Jaune principal de la marque, déclinaison institutionnelle';
    await envoyer(page, message);
    // Le bord droit du contenu est celui de l'en-tête : il est hors des grilles de l'onglet.
    const enTete = await page.locator('.header').boundingBox();
    const largeur = enTete.x + enTete.width;
    for (const locator of [page.getByRole('button', { name: 'Gestes de la palette' }), page.getByRole('button', { name: 'Dessiner' }), page.getByRole('textbox', { name: 'Nom' })]) {
      const boite = await locator.boundingBox();
      assert.ok(boite.x + boite.width <= largeur, JSON.stringify(boite));
    }
  } finally {
    await page.close();
  }
});

test('[ENT-10] une clarté éditée fait sonner la garantie, se range à la validation, et l’aperçu la suit', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avantLAperçu = await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Ouvrir la configuration' }).click();
    const clair700 = page.getByRole('textbox', { name: 'Clair 700' });
    assert.equal(await clair700.inputValue(), '0,5');
    assert.equal(await page.locator('.config-groupe .constat-alerte').count(), 0);
    const avant = await compte(page);
    await clair700.fill('0,56');
    assert.equal(await page.locator('.config-groupe .constat-alerte').count(), 2);
    assert.equal(await compte(page), avant, 'la saisie ne range rien');
    await clair700.press('Tab');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.courbes.light[7], 0.56);
    await envoyer(page, rangee(demande.demande));
    await clair700.fill('0,5');
    assert.equal(await page.locator('.config-groupe .constat-alerte').count(), 0);
    await clair700.fill('0,56');
    await clair700.press('Tab');
    await page.getByRole('button', { name: 'Retour' }).click();
    assert.notEqual(await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label'), avantLAperçu);
  } finally {
    await page.close();
  }
});

test('[REC-05] une clarté qui casse la courbe se refuse sous le groupe, et rien n’est rangé', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Ouvrir la configuration' }).click();
    const avant = await compte(page);
    const clair700 = page.getByRole('textbox', { name: 'Clair 700' });
    await clair700.fill('0,9');
    await clair700.press('Tab');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant);
    assert.match(await page.locator('.config-groupe .field-error').first().textContent(), /ne descend pas/);
  } finally {
    await page.close();
  }
});

test('[ENT-07] chaque groupe de la configuration compte les palettes qu’il touche', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir la configuration' }).click();
    const comptes = await page.locator('.config-groupe .ligne-infos .ligne-secondaire').allTextContents();
    assert.deepEqual(comptes, ['3 palettes touchées', '1 palette touchée', '2 palettes touchées']);
  } finally {
    await page.close();
  }
});

const deplier = (page) => page.getByRole('button', { name: 'Régler' }).click();

test('[DER-01] « Régler » déplie le graphe : une ligne, le pivot, deux poignées, onze colonnes alignées', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    assert.equal(await page.locator('.derive-graphe').isVisible(), false, 'replié par défaut (E22)');
    await deplier(page);
    assert.equal(await page.locator('.derive-trait').count(), 1);
    assert.equal(await page.locator('.derive-pivot').count(), 1);
    assert.equal(await page.locator('.derive-poignee').count(), 2);
    const colonnes = await page.evaluate(() => {
      const cases = [...document.querySelectorAll('.derive-graphe rect')];
      return cases.map((rect) => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2);
    });
    assert.equal(colonnes.length, 22, 'onze cases de bande, onze crans');
    for (let rang = 0; rang < 11; rang += 1) assert.ok(Math.abs(colonnes[2 * rang] - colonnes[2 * rang + 1]) < 1e-6);
    assert.equal(await page.getByRole('button', { name: 'Replier' }).getAttribute('aria-expanded'), 'true');
  } finally {
    await page.close();
  }
});

test('[DER-05] deux profils déliés tracent deux lignes, et les poignées portent l’initiale du profil', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('derive-deliee-libre'));
    await deplier(page);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.derive-trait')].map((trait) => trait.getAttribute('class'))), [
      'derive-trait derive-trait-soft',
      'derive-trait derive-trait-vivid',
    ]);
    assert.deepEqual(await page.locator('.derive-poignee-lettre').allTextContents(), ['v', 'v']);
  } finally {
    await page.close();
  }
});

test('[DER-14] une référence plus sombre que le bout sombre masque la poignée sombre et le dit', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('reference-hors-rampe'));
    await deplier(page);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.derive-poignee')].map((poignee) => poignee.dataset.bout)), ['clair']);
    assert.equal(await page.locator('.derive-pivot').count(), 0);
    assert.match(await page.locator('.editeur-derive > .ligne-secondaire').textContent(), /plus sombre que le bout sombre/);
  } finally {
    await page.close();
  }
});

test('[DER-15] une référence presque grise désactive l’éditeur', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('couleur-presque-grise'));
    assert.equal(await page.getByRole('button', { name: 'Régler' }).isDisabled(), true);
  } finally {
    await page.close();
  }
});

/** Le rangement qu'un geste envoie, aussitôt accepté : le geste suivant part avec son empreinte. */
async function rangementDe(page, avant) {
  const demande = await prochaine(page, avant);
  assert.equal(demande.type, 'ranger-recette');
  await envoyer(page, rangee(demande.demande));
  return demande.recette.palettes[0];
}

async function editeurSur(id) {
  const page = await ouvrirSur(id);
  await deplier(page);
  return page;
}

const poignee = (page, bout) => page.locator(`.derive-poignee[data-bout="${bout}"]`);

test('[DER-07] glisser une poignée suit le pointeur sans ranger, puis range au relâchement', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const avantLApercu = await page.locator('[aria-label^="vivid.50 "]').getAttribute('aria-label');
    const boite = await poignee(page, 'clair').locator('circle').boundingBox();
    const avant = await compte(page);
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width / 2, boite.y - 30, { steps: 4 });
    assert.notEqual(await page.locator('[aria-label^="vivid.50 "]').getAttribute('aria-label'), avantLApercu, 'l’aperçu suit le glisser');
    assert.equal(await compte(page), avant, 'rien ne se range pendant le glisser');
    await page.mouse.up();
    const palette = await rangementDe(page, avant);
    assert.ok(palette.derive.vivid.clair > 7.8, JSON.stringify(palette.derive));
    assert.ok(Number.isInteger(palette.derive.vivid.clair), 'au degré près');
    assert.equal(palette.derive.vivid.origine, 'libre');
    assert.deepEqual(palette.derive.soft, palette.derive.vivid);
  } finally {
    await page.close();
  }
});

test('[DER-09] au clavier, une poignée avance d’un degré, de cinq avec Maj, et garde le focus', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    await poignee(page, 'sombre').focus();
    const depart = Number(await poignee(page, 'sombre').getAttribute('aria-valuenow'));
    let avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.sombre, Math.round((depart + 1) * 100) / 100);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.bout), 'sombre', 'le focus survit au redessin');
    avant = await compte(page);
    await page.keyboard.press('Shift+ArrowDown');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.sombre, Math.round((depart - 4) * 100) / 100);
    avant = await compte(page);
    await page.keyboard.press('Home');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.sombre, -90);
    assert.match(await poignee(page, 'sombre').getAttribute('aria-valuetext'), /^−90,0°, teinte \d+°$/);
  } finally {
    await page.close();
  }
});

test('[DER-10] un double-clic ramène la poignée au préréglage Tailwind', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const tailwind = Number(await poignee(page, 'clair').getAttribute('aria-valuenow'));
    await poignee(page, 'clair').focus();
    let avant = await compte(page);
    await page.keyboard.press('Shift+ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await poignee(page, 'clair').locator('circle').dblclick();
    const palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, tailwind);
    assert.equal(palette.derive.vivid.origine, 'tailwind');
  } finally {
    await page.close();
  }
});

test('[DER-08] le champ et la réglette règlent le bout, virgule acceptée, Maj pour cinq degrés', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const champ = page.locator('.reglette').first().locator('.champ-nombre');
    let avant = await compte(page);
    await champ.fill('12,5');
    await champ.press('Tab');
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, 12.5);
    assert.equal(Number(await poignee(page, 'clair').getAttribute('aria-valuenow')), 12.5, 'le graphe suit le champ');
    avant = await compte(page);
    await page.locator('.reglette').first().locator('.reglette-curseur').focus();
    await page.keyboard.press('Shift+ArrowRight');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, 17.5);
  } finally {
    await page.close();
  }
});

test('[DER-11] le préréglage Constante pose deux dérives nulles', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const avant = await compte(page);
    await page.getByRole('combobox', { name: 'Préréglage' }).selectOption('constante');
    const palette = await rangementDe(page, avant);
    assert.deepEqual(palette.derive.vivid, { clair: 0, sombre: 0, origine: 'constante' });
    assert.deepEqual(palette.derive.soft, palette.derive.vivid);
  } finally {
    await page.close();
  }
});

test('[DER-12] délier règle un seul profil, relier demande confirmation et aligne soft sur vivid', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    let avant = await compte(page);
    await page.getByRole('button', { name: 'soft = vivid' }).click();
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.lien, false);
    await page.getByRole('group', { name: 'Profil réglé' }).getByRole('button', { name: 'soft' }).click();
    await poignee(page, 'clair').focus();
    avant = await compte(page);
    await page.keyboard.press('Shift+ArrowUp');
    palette = await rangementDe(page, avant);
    assert.notDeepEqual(palette.derive.soft, palette.derive.vivid);
    const vivid = palette.derive.vivid;
    avant = await compte(page);
    await page.getByRole('button', { name: 'soft = vivid' }).click();
    assert.equal(await page.locator('.editeur-derive .confirmation').isVisible(), true);
    assert.equal(await compte(page), avant, 'relier attend la confirmation');
    await page.getByRole('button', { name: 'Aligner' }).click();
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.lien, true);
    assert.deepEqual(palette.derive.soft, vivid);
  } finally {
    await page.close();
  }
});

test('E21 : Ctrl+Z dans l’éditeur défait le dernier réglage, hors d’un champ texte', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    await poignee(page, 'clair').focus();
    const depart = Number(await poignee(page, 'clair').getAttribute('aria-valuenow'));
    let avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await page.keyboard.press('Control+z');
    const palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, Math.round((depart + 1) * 100) / 100);
    // Un réglage reste dans la pile : Ctrl+Z dans le champ ne doit pas le défaire.
    const champ = page.locator('.reglette').first().locator('.champ-nombre');
    await champ.focus();
    avant = await compte(page);
    await page.keyboard.press('Control+z');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'dans un champ texte, Ctrl+Z reste au champ');
  } finally {
    await page.close();
  }
});

test('[DER-03] à ±90°, les poignées et leurs étiquettes restent dans le cadre du graphe', async () => {
  for (const [clair, sombre] of [[90, -90], [-90, 90]]) {
    const page = await ouvrir();
    try {
      const message = structuredClone(messageDe('derive-deliee-libre'));
      message.classement.recette.palettes[0].derive.vivid = { clair, sombre, origine: 'libre' };
      await envoyer(page, message);
      await deplier(page);
      const dehors = await page.evaluate(() => {
        const cadre = document.querySelector('.derive-graphe').getBoundingClientRect();
        return [...document.querySelectorAll('.derive-poignee text, .derive-poignee circle')]
          .map((noeud) => noeud.getBoundingClientRect())
          .filter((boite) => boite.top < cadre.top || boite.bottom > cadre.bottom || boite.left < cadre.left || boite.right > cadre.right)
          .length;
      });
      assert.equal(dehors, 0, `clair ${clair}, sombre ${sombre}`);
    } finally {
      await page.close();
    }
  }
});
