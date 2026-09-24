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
    if (['lire-etat', 'lire-selection', 'ranger-recette', 'dessiner', 'voir-sur-la-planche'].includes(type)) window.demandes.push(event.data.pluginMessage);
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
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant').count(), 0);
    await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), etat(1, { etat: 'future', version: 9 }));
    await page.locator('#panneau-palettes .constat-bloquant').waitFor();
    assert.match(await page.locator('#panneau-palettes .constat-ou').textContent(), /version 9/);
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
    assert.equal(await dessiner.isDisabled(), false);
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
    await page.locator('#panneau-palettes .champ-hexa').fill('#1E6FD9');
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
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').inputValue(), '#1E6FD9');
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
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').inputValue(), '#7C3AED');
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
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').inputValue(), '#16A34A');
  } finally {
    await page.close();
  }
});

test('un hexa impossible se signale sous le champ, et l’aperçu ne change pas', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await page.locator('[aria-label^="vivid.700 "]').getAttribute('aria-label');
    await page.locator('#panneau-palettes .champ-hexa').fill('#FACZ15');
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('#panneau-palettes .ligne-reference + .field-error').first().textContent(), /n’est pas une couleur/);
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
    // Courbes, parts, fonds, seuils de contraste, profils confondus, palettes proches, référence grise.
    assert.deepEqual(comptes, [
      '3 palettes touchées',
      '1 palette touchée',
      '3 palettes touchées',
      '3 palettes touchées',
      '2 palettes touchées',
      '3 palettes touchées',
      '2 palettes touchées',
    ]);
  } finally {
    await page.close();
  }
});

test('[ENT-05] un fond et un seuil se saisissent dans la configuration, et se rangent à la validation', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir la configuration' }).click();
    const fond = page.getByRole('textbox', { name: 'Fond sombre' });
    assert.equal(await fond.inputValue(), '#121212');
    const avant = await compte(page);
    await fond.fill('#1c1c1c');
    await fond.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.fonds, { light: '#F7F7F7', dark: '#1C1C1C' });
    await envoyer(page, rangee(rangement.demande));

    await fond.fill('#12');
    await fond.press('Tab');
    assert.equal(await page.locator('.config-groupe .field-error:visible').textContent(), '« #12 » n’est pas une couleur : six chiffres hexadécimaux, #1E6FD9 par exemple.');
    assert.equal(await compte(page), avant + 1, 'une couleur refusée ne se range pas');

    const texte = page.getByRole('textbox', { name: 'Texte', exact: true });
    await texte.fill('7');
    await texte.press('Tab');
    assert.equal((await prochaine(page, avant + 1)).recette.seuils.texte, 7);
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
    // La référence exacte porte la dernière nuance claire : le pivot tombe dans cette colonne ([DER-02]).
    assert.equal(await page.locator('.derive-pivot').count(), 1);
    assert.equal(await colonneDuPivot(page), 10);
    assert.match(await page.locator('.editeur-derive > .ligne-secondaire').textContent(), /plus sombre que le bout sombre/);
  } finally {
    await page.close();
  }
});

/** Le rang de la colonne où le pivot tombe, lu sur les cases de la rampe sous le graphe. */
async function colonneDuPivot(page) {
  return page.evaluate(() => {
    const x = Number(/^M ([\d.]+)/.exec(document.querySelector('.derive-pivot').getAttribute('d'))[1]);
    const cases = [...document.querySelectorAll('.derive-graphe rect')].filter((_, rang) => rang % 2 === 1);
    return cases.findIndex((rect) => Math.abs(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2 - x) < 1e-6);
  });
}

test('[DER-04] synchronisés, les profils montrent le porteur : la rampe de Soft et sa référence exacte', async () => {
  const page = await ouvrirSur('reference-soft');
  try {
    await deplier(page);
    assert.equal(await page.locator('.ligne-infos').first().textContent().then((texte) => texte.includes('Référence : Soft · nuance 400')), true);
    assert.equal(await colonneDuPivot(page), 4);
    const rampe = await page.evaluate(() => [...document.querySelectorAll('.derive-graphe rect')].filter((_, rang) => rang % 2 === 1).map((rect) => rect.getAttribute('fill')));
    assert.equal(rampe[4], '#A0B599');
  } finally {
    await page.close();
  }
});

test('[DER-02] le pivot tombe dans la colonne de la nuance qui porte la référence, et son infobulle la nomme', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplier(page);
    // #FACC15 est le 300 de vivid en Light.
    assert.equal(await colonneDuPivot(page), 3);
    assert.match(await page.locator('.derive-pivot title').textContent(), /Vivid · nuance 300 en Thème Light, 900 en Thème Dark/);
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

const ID_DU_BLEU = 'p-3fa2c91e';
const dessinDe = (demande, resultat) => ({ type: 'dessin', demande, resultat });

test('[PLA-24] [UI-05] « Dessiner » envoie la palette ouverte, dit la progression et rend les onglets inertes', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const avant = await compte(page);
    await page.locator('.barre-verdict .btn').click();
    const demande = await prochaine(page, avant);
    assert.deepEqual(demande, { type: 'dessiner', demande: demande.demande, palettes: [ID_DU_BLEU], grille: false, empreinteLue: messageDe('dessin-en-cours').empreinte, etrangersConfirmes: [] });
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.getByRole('button', { name: 'Ouvrir la configuration' }).isDisabled(), true);
    await envoyer(page, { type: 'progression', demande: demande.demande, fait: 0, total: 1, nom: 'Bleu' });
    assert.equal(await page.locator('.barre-verdict .btn').textContent(), 'Dessin de Bleu…');

    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    await envoyer(page, dessinDe(demande.demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('.barre-verdict .btn').textContent(), 'Dessiner');
    // Un dessin fini a posé des cadres : l'état se relit.
    const relecture = await prochaine(page, avant + 1);
    assert.equal(relecture.type, 'lire-etat');
    assert.match(await page.locator('#panneau-palettes .ligne-infos').first().textContent(), /^1 palette dessinée sur la planche\./);
    await page.getByRole('button', { name: 'Voir sur la planche' }).click();
    assert.deepEqual(await prochaine(page, avant + 2), { type: 'voir-sur-la-planche', demande: relecture.demande + 1, page: '5:6', cadres: ['12:34'] });
  } finally {
    await page.close();
  }
});

test('[PLA-24] D-I : au-delà de six palettes, tout dessiner se confirme, et suit la grille cochée', async () => {
  const page = await ouvrirSur('confirmation-six-palettes');
  try {
    await page.getByRole('tab', { name: 'Planche', exact: true }).click();
    assert.equal(await page.locator('.ligne-planche').count(), 7);
    await page.getByRole('checkbox', { name: 'Grille de contraste' }).check();
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Dessiner toutes les palettes' }).click();
    assert.equal(await page.locator('#panneau-planche .confirmation').textContent(), 'Dessiner les 7 palettes ? Chacune pose plus de cinq cents calques sur la planche.DessinerAnnuler');
    await page.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await page.locator('#panneau-planche .confirmation').isVisible(), false);
    await page.getByRole('button', { name: 'Dessiner toutes les palettes' }).click();
    await page.locator('#panneau-planche .confirmation').getByRole('button', { name: 'Dessiner' }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'dessiner');
    assert.equal(demande.palettes.length, 7);
    assert.equal(demande.grille, true);
    assert.equal(await compte(page), avant + 1, 'aucune demande pendant la confirmation');
  } finally {
    await page.close();
  }
});

test('[PLA-24] six palettes se dessinent sans confirmation', async () => {
  const page = await ouvrir();
  try {
    const sept = messageDe('confirmation-six-palettes');
    const recette = JSON.parse(JSON.stringify(sept.classement.recette));
    recette.palettes = recette.palettes.slice(0, 6);
    await envoyer(page, { ...sept, classement: { ...sept.classement, recette } });
    await page.getByRole('tab', { name: 'Planche', exact: true }).click();
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Dessiner toutes les palettes' }).click();
    assert.equal((await prochaine(page, avant)).palettes.length, 6);
    assert.equal(await page.locator('#panneau-planche .confirmation').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[PLA-22] un dessin interrompu se relance à l’identique par « Réessayer »', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    const avant = await compte(page);
    await page.locator('.barre-verdict .btn').click();
    const premiere = await prochaine(page, avant);
    await envoyer(page, dessinDe(premiere.demande, { issue: 'interrompue', palette: ID_DU_BLEU, message: 'refus', dessines: 0 }));
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant .constat-quoi').textContent(), 'Le dessin s’est arrêté (refus) : aucun cadre n’a été posé.');
    await page.locator('#panneau-palettes').getByRole('button', { name: 'Réessayer' }).click();
    await page.waitForFunction(() => window.demandes.filter((demande) => demande.type === 'dessiner').length === 2);
    const reprise = (await demandes(page)).slice(avant + 1).find((demande) => demande.type === 'dessiner');
    assert.deepEqual({ ...reprise, demande: 0 }, { ...premiere, demande: 0 });
    assert.ok(reprise.demande > premiere.demande);
  } finally {
    await page.close();
  }
});

test('E13 : un dessin refusé sur une autre recette propose de recharger', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    const avant = await compte(page);
    await page.locator('.barre-verdict .btn').click();
    const demande = await prochaine(page, avant);
    await envoyer(page, dessinDe(demande.demande, { issue: 'modifiee-ailleurs' }));
    // La fin du dessin relit déjà l'état : le clic doit en demander une seconde lecture, et aucun dessin.
    assert.equal((await prochaine(page, avant + 1)).type, 'lire-etat');
    await page.locator('#panneau-palettes .constat-bloquant').getByRole('button', { name: 'Recharger' }).click();
    assert.equal((await prochaine(page, avant + 2)).type, 'lire-etat');
    assert.equal(await compte(page), avant + 3);
  } finally {
    await page.close();
  }
});

test('l’onglet Planche d’un fichier sans palette renvoie vers l’onglet Palettes', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('planche-sans-palette'));
    await page.getByRole('tab', { name: 'Planche', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Dessiner toutes les palettes' }).isVisible(), false);
    await page.getByRole('button', { name: 'Ouvrir l’onglet Palettes' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Palettes', exact: true }).getAttribute('aria-selected'), 'true');
  } finally {
    await page.close();
  }
});

test('E13 : un dessin qui attendait un rangement refusé est abandonné, et l’interface redevient active', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Gestes de la palette' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer' }).click();
    const rangement = await prochaine(page, avant);
    await page.locator('.barre-verdict .btn').click();
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), true);
    await envoyer(page, { type: 'rangement', demande: rangement.demande, issue: { issue: 'modifiee-ailleurs' } });
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('.barre-verdict .btn').textContent(), 'Dessiner');
    assert.deepEqual((await demandes(page)).slice(avant).map((demande) => demande.type), ['ranger-recette']);
  } finally {
    await page.close();
  }
});

const ID_DU_JAUNE = 'p-08b7d4a0';
const ouvrirLaPlanche = (page) => page.getByRole('tab', { name: 'Planche', exact: true }).click();
const etatsDesLignes = (page) => page.locator('.ligne-planche').evaluateAll((lignes) => lignes.map((ligne) => ligne.dataset.etat));
const dessinsEnvoyes = async (page) => (await demandes(page)).filter((demande) => demande.type === 'dessiner');
/** Attend le `rang`-ième dessin envoyé, compté à partir de 1. */
async function dessinEnvoye(page, rang) {
  await page.waitForFunction((n) => window.demandes.filter((demande) => demande.type === 'dessiner').length >= n, rang);
  return (await dessinsEnvoyes(page))[rang - 1];
}

test('[PLA-20] l’onglet Planche dit l’état de chaque cadre, et « Redessiner » envoie la seule palette périmée', async () => {
  const page = await ouvrirSur('planche-perimee');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'perimee', 'jamais-dessinee']);
    assert.deepEqual(await page.locator('.ligne-planche .ligne-secondaire').allTextContents(), ['à jour', 'périmée', 'jamais dessinée']);
    assert.equal(await page.locator('.ligne-planche').first().getByRole('button').count(), 0, 'un cadre à jour n’a rien à redessiner');
    await page.locator('.ligne-planche').nth(1).getByRole('button', { name: 'Redessiner' }).click();
    const demande = await dessinEnvoye(page, 1);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'dessiner', demande: 0, palettes: [ID_DU_JAUNE], grille: false, empreinteLue: messageDe('planche-perimee').empreinte, etrangersConfirmes: [] });
  } finally {
    await page.close();
  }
});

test('[PLA-20] une recette rangée périme le cadre de la palette qu’elle change, et lui seul', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'a-jour']);
    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    const avant = await compte(page);
    const nom = page.getByRole('textbox', { name: 'Nom' });
    await nom.fill('Bleu roi');
    await nom.press('Tab');
    const rangement = await prochaine(page, avant);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['perimee', 'a-jour']);
  } finally {
    await page.close();
  }
});

test('[PLA-20] une courbe rangée depuis la configuration, ouverte sur l’onglet Planche, périme tous les cadres', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    await page.getByRole('button', { name: 'Ouvrir la configuration' }).click();
    const avant = await compte(page);
    const clair700 = page.getByRole('textbox', { name: 'Clair 700' });
    await clair700.fill('0,56');
    await clair700.press('Tab');
    await envoyer(page, rangee((await prochaine(page, avant)).demande));
    await page.getByRole('button', { name: 'Retour' }).click();
    assert.deepEqual(await etatsDesLignes(page), ['perimee', 'perimee']);
  } finally {
    await page.close();
  }
});

test('[ENT-03] un cadre orphelin se signale en notice, et « Voir sur la planche » le montre', async () => {
  const page = await ouvrirSur('cadre-orphelin');
  try {
    await ouvrirLaPlanche(page);
    const notice = page.locator('#panneau-planche .constat-notice');
    assert.equal(await notice.locator('.constat-ou').textContent(), 'Planche, cadre « Ardoise »');
    const avant = await compte(page);
    await notice.getByRole('button', { name: 'Voir sur la planche' }).click();
    const demande = await prochaine(page, avant);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'voir-sur-la-planche', demande: 0, page: '40:1', cadres: ['40:4'] });
  } finally {
    await page.close();
  }
});

test('[PLA-25] une copie de cadre se signale, et ne compte pas comme le cadre de sa palette', async () => {
  const page = await ouvrirSur('copie-de-cadre');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-planche .constat-notice .constat-ou').textContent(), 'Planche, cadre « Bleu copie »');
  } finally {
    await page.close();
  }
});

test('E11 : un document Display P3 dit de copier l’hexa depuis la carte', async () => {
  const page = await ouvrirSur('document-display-p3');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-planche .constat-notice .constat-ou').textContent(), 'Document, profil Display P3');
  } finally {
    await page.close();
  }
});

const ETRANGERS = { issue: 'etrangers', cadres: [{ palette: ID_DU_BLEU, calques: [{ id: '40:7', nom: 'Note' }, { id: '40:8', nom: 'Flèche' }] }] };

test('D-H : des calques étrangers se confirment ; « Annuler » ne dessine rien, « Redessiner quand même » les nomme au sandbox', async () => {
  const page = await ouvrirSur('calques-etrangers');
  try {
    await page.locator('.barre-verdict .btn').click();
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, ETRANGERS));
    const confirmation = page.locator('#panneau-palettes .confirmation', { hasText: 'disparaîtront au dessin' });
    assert.equal(await confirmation.locator('.constat-quoi').textContent(), 'Les 2 calques ajoutés dans ce cadre disparaîtront au dessin : « Note », « Flèche ».');
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), false);
    await confirmation.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await confirmation.count(), 0);
    assert.equal((await dessinsEnvoyes(page)).length, 1, 'annuler ne dessine rien');

    await page.locator('.barre-verdict .btn').click();
    const seconde = await dessinEnvoye(page, 2);
    await envoyer(page, dessinDe(seconde.demande, ETRANGERS));
    await page.getByRole('button', { name: 'Redessiner quand même' }).click();
    const confirmee = await dessinEnvoye(page, 3);
    assert.deepEqual({ ...confirmee, demande: 0 }, { ...seconde, demande: 0, etrangersConfirmes: ['40:7', '40:8'] });
  } finally {
    await page.close();
  }
});

test('L6.14 : une couleur peinte autrement que l’aperçu se signale en notice ; sans écart, rien ne s’ajoute', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    await page.locator('.barre-verdict .btn').click();
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await page.locator('#panneau-palettes .constat-notice').count(), 0);

    await page.locator('.barre-verdict .btn').click();
    const peints = [{ palette: ID_DU_BLEU, nom: 'vivid/light/700', hexa: '#000000' }];
    await envoyer(page, dessinDe((await dessinEnvoye(page, 2)).demande, { issue: 'dessinee', page: '5:6', cadres, peints }));
    assert.match(
      await page.locator('#panneau-palettes .constat-notice .constat-quoi').textContent(),
      /^1 couleur peinte diffère de l’aperçu, dont vivid\/light\/700 : aperçu #[0-9A-F]{6}, planche #000000\.$/,
    );
  } finally {
    await page.close();
  }
});

const deplierAvance = (page) => page.getByRole('button', { name: /Avancé$/ }).click();

test('[ENT-09] « Avancé » pose une part propre, refuse soft au-dessus de vivid, et reprend les parts de la recette', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    assert.equal(await page.getByRole('textbox', { name: 'Part soft' }).isVisible(), false, 'la section est repliée');
    await deplierAvance(page);
    assert.equal(await page.getByRole('button', { name: /Avancé$/ }).getAttribute('aria-expanded'), 'true');
    const soft = page.getByRole('textbox', { name: 'Part soft' });
    assert.equal(await soft.inputValue(), '0,45');
    const avant = await compte(page);
    await soft.fill('0,6');
    await soft.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes[0].parts, { soft: 0.6, vivid: 0.95, origine: 'designer' });
    await envoyer(page, rangee(rangement.demande));

    await soft.fill('0,99');
    await soft.press('Tab');
    assert.equal(await page.locator('#panneau-palettes .field-error:visible').count(), 1);
    assert.equal(await compte(page), avant + 1, 'une part refusée ne se range pas');

    await page.getByRole('button', { name: 'Reprendre les parts de la recette' }).click();
    assert.equal((await prochaine(page, avant + 1)).recette.palettes[0].parts, undefined);
  } finally {
    await page.close();
  }
});

test('D-G : les parts grises se lisent dans « Avancé », avec la part de la référence', async () => {
  const page = await ouvrirSur('couleur-presque-grise');
  try {
    await deplierAvance(page);
    assert.match(await page.locator('#panneau-palettes .page-stack > .ligne-secondaire').last().textContent(), /^Référence presque grise : les deux profils prennent sa part de chroma, 0,\d+\.$/);
    assert.equal(await page.getByRole('button', { name: 'Reprendre les parts de la recette' }).isVisible(), false);
  } finally {
    await page.close();
  }
});

/** Le fichier que « Exporter la recette » propose : son nom et son contenu. */
async function exporter(page, dans) {
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(dans).getByRole('button', { name: 'Exporter la recette' }).click(),
  ]);
  return { nom: telechargement.suggestedFilename(), contenu: readFileSync(await telechargement.path(), 'utf8') };
}
const importerLeFichier = (page, dans, contenu) =>
  page.locator(`${dans} input[type="file"]`).setInputFiles({ name: 'palettes.recette.json', mimeType: 'application/json', buffer: Buffer.from(contenu) });

test('L7.7 : exporter la recette, modifier le JSON, l’importer, voir l’écart, confirmer, puis dessiner', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    assert.equal(await page.getByRole('button', { name: 'Repartir de la recette par défaut' }).count(), 0, 'une recette lisible ne se remplace que par un import');
    const exporte = await exporter(page, '#panneau-planche');
    assert.equal(exporte.nom, 'palettes.recette.json');
    assert.equal(exporte.contenu, messageDe('planche-a-jour').texte, '[REC-07] le JSON canonique de la recette rangée');

    const modifiee = JSON.parse(exporte.contenu);
    modifiee.palettes[0].nom = 'Bleu roi';
    modifiee.seuils.texte = 7;
    const avant = await compte(page);
    await importerLeFichier(page, '#panneau-planche', JSON.stringify(modifiee, null, 2));
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'Importer « palettes.recette.json » ?' });
    assert.deepEqual(await confirmation.locator('p').allTextContents(), [
      'Importer « palettes.recette.json » ?',
      'Palette modifiée : Bleu roi.',
      'Paramètre commun modifié : seuils.',
      'L’import remplace la recette du fichier ; il ne redessine rien.',
    ]);
    assert.equal(await compte(page), avant, 'rien ne se range avant la confirmation');
    await confirmation.getByRole('button', { name: 'Importer' }).click();
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    assert.deepEqual(rangement.recette, modifiee);
    assert.equal(rangement.empreinteLue, messageDe('planche-a-jour').empreinte);
    await envoyer(page, rangee(rangement.demande));

    assert.equal(await page.locator('.ligne-planche-nom').first().textContent(), 'Bleu roi');
    assert.equal(await page.locator('.ligne-planche').first().getAttribute('data-etat'), 'perimee');
    await page.getByRole('button', { name: 'Dessiner toutes les palettes' }).click();
    const dessin = await dessinEnvoye(page, 1);
    assert.deepEqual(dessin.palettes, modifiee.palettes.map(({ id }) => id));
    assert.equal(dessin.empreinteLue, '0000000f', 'le dessin part sur la recette importée');
  } finally {
    await page.close();
  }
});

test('[REC-11] E19 : une recette illisible s’exporte telle qu’elle est rangée, et repart de la recette par défaut après confirmation', async () => {
  const page = await ouvrir();
  try {
    const illisible = messageDe('recette-illisible');
    await envoyer(page, illisible);
    const bloquant = '#panneau-palettes';
    assert.equal((await exporter(page, bloquant)).contenu, illisible.texte);
    const avant = await compte(page);
    await page.locator(bloquant).getByRole('button', { name: 'Repartir de la recette par défaut' }).click();
    assert.equal(await compte(page), avant, 'la confirmation vient avant tout rangement');
    await page.locator(bloquant).getByRole('button', { name: 'Repartir', exact: true }).click();
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes, []);
    assert.equal(rangement.empreinteLue, illisible.empreinte);
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant:visible').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Repartir de la recette par défaut' }).count(), 0);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    assert.equal(await page.locator('#panneau-planche .constat-bloquant:visible').count(), 0, 'l’onglet Planche quitte aussi le bloquant');
    assert.equal(await page.getByText('Aucune palette à dessiner : la planche attend une première palette.').isVisible(), true);
  } finally {
    await page.close();
  }
});

test('[REC-08] un fichier d’une version future ou cassé se refuse, et rien ne se range', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaPlanche(page);
    const avant = await compte(page);
    await importerLeFichier(page, '#panneau-planche', JSON.stringify({ formatVersion: 99 }));
    assert.equal(await page.locator('#panneau-planche .constat-bloquant .constat-ou').textContent(), 'Import, palettes.recette.json, version 99');
    await importerLeFichier(page, '#panneau-planche', '{pas du json');
    assert.match(await page.locator('#panneau-planche .constat-bloquant .constat-quoi').textContent(), /La recette du fichier reste intacte\.$/);
    assert.equal(await compte(page), avant);
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue un fichier : l’écart d’import attend sa confirmation', async () => {
  const page = await pageDeGalerie('ecart-d-import');
  try {
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'Importer « palettes.recette.json » ?' });
    assert.equal(await confirmation.locator('p').nth(1).textContent(), 'Palette ajoutée : Ardoise.');
  } finally {
    await page.close();
  }
});

/** Le rapport que « Exporter le rapport » propose, relu en JSON. */
async function exporterLeRapport(page) {
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le rapport' }).click(),
  ]);
  assert.equal(telechargement.suggestedFilename(), 'palettes.rapport.json');
  return JSON.parse(readFileSync(await telechargement.path(), 'utf8'));
}

test('[VER-01] [VER-02] le rapport porte l’empreinte de la recette, ses palettes, et les écarts du dernier dessin', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const avant = await exporterLeRapport(page);
    assert.equal(avant.empreinte, messageDe('planche-a-jour').empreinte);
    assert.deepEqual(avant.palettes.map(({ nom }) => nom), ['Bleu', 'Jaune']);
    assert.equal(avant.palettes[0].promesses.length, 56);
    assert.equal(avant.ecartsDuDernierDessin, null, 'aucun dessin depuis l’ouverture');

    await page.getByRole('button', { name: 'Dessiner toutes les palettes' }).click();
    const peints = [{ palette: ID_DU_BLEU, nom: 'vivid/light/700', hexa: '#000000' }];
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, { issue: 'dessinee', page: '40:1', cadres: [], peints }));
    const apres = await exporterLeRapport(page);
    assert.deepEqual(apres.ecartsDuDernierDessin.map(({ nom, peint }) => [nom, peint]), [['vivid/light/700', '#000000']]);
  } finally {
    await page.close();
  }
});

test('[VER-01] une recette illisible n’a pas de rapport à exporter', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('recette-illisible'));
    await ouvrirLaPlanche(page);
    assert.equal(await page.getByRole('button', { name: 'Exporter la recette' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Exporter le rapport' }).count(), 0);
  } finally {
    await page.close();
  }
});
