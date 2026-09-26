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
    if (['lire-etat', 'ranger-recette', 'dessiner', 'voir-sur-la-planche', 'retirer-cadre'].includes(type)) window.demandes.push(event.data.pluginMessage);
  });
</script>`;

/** La taille minimale de la fenêtre ([UI-01]). */
const MINIMALE = { width: 500, height: 520 };

/** Ouvre l'interface, par défaut à 440 × 520, sous la largeur minimale. */
async function ouvrir(viewport = { width: 440, height: 520 }) {
  const page = await navigateur.newPage({ viewport });
  page.setDefaultTimeout(5000);
  await page.setContent(html.replace('<head>', () => `<head>${RELEVE}`));
  return page;
}

test('la fenêtre s’ouvre sur l’onglet Palettes et demande l’état du fichier', async () => {
  const page = await ouvrir();
  try {
    const palettes = page.getByRole('tab', { name: 'Palettes', exact: true });
    assert.equal(await palettes.getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('tab', { name: 'Planches', exact: true }).getAttribute('aria-selected'), 'false');
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
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    assert.equal(await page.getByRole('tablist').isVisible(), false);
    assert.equal(await page.locator('.page-title').textContent(), 'Réglages communs');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
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
    assert.match(await page.locator('#panneau-palettes .constat-ou').textContent(), /format 9/);
  } finally {
    await page.close();
  }
});

/** Les messages des états de la galerie : l'interface est éprouvée sur les mêmes scénarios. */
const { ETATS } = createRequire(import.meta.url)('../../galerie/etats.cjs');
const messageDe = (id) => ETATS.find((etat) => etat.id === id).atteinte[0].message;

async function ouvrirSur(id, viewport) {
  const page = await ouvrir(viewport);
  await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), messageDe(id));
  await page.locator('.titre-de-premier-rang').waitFor();
  return page;
}

/** Une carte d'un onglet, par son titre ; l'onglet Palettes par défaut. */
const carteDeLOnglet = (page, titre, panneau = '#panneau-palettes') => page.locator(`${panneau} .carte[aria-label="${titre}"]`);
/** L'en-tête d'une carte repliable : le bouton qui la déplie ([UI-12]). */
const bascule = (page, titre, panneau) => carteDeLOnglet(page, titre, panneau).locator('> .carte-bascule');

/** Déplie une carte repliée à l'ouverture ([UI-09], [UI-12], [UI-14], V8.5) ; une carte ouverte le reste. */
async function deplierLaCarte(page, titre, panneau) {
  if ((await carteDeLOnglet(page, titre, panneau).getAttribute('data-ouverte')) !== 'true') await bascule(page, titre, panneau).click();
}

/** Une carte des Réglages communs, par son titre ([ENT-12]) : le panneau masque l'onglet, qui a lui aussi une carte Intensités. */
const reglage = (page, titre) => page.locator(`.carte[aria-label="${titre}"]:visible`);

const dansLaFenetre = async (locator) => {
  const boite = await locator.boundingBox();
  return boite !== null && boite.y >= 0 && boite.y + boite.height <= 520;
};

test('[UI-03] [UI-11] à 500 × 520, le sélecteur, le titre seul sur sa ligne, la carte « Configuration de la palette » et le haut de l’aperçu se lisent sans défiler', async () => {
  const page = await ouvrirSur('promesses-manquees', MINIMALE);
  try {
    const visibles = {
      sélecteur: page.locator('.selecteur-bouton'),
      titre: page.locator('.titre-de-premier-rang'),
      configuration: page.locator('[aria-label="Configuration de la palette"]'),
      'onglets de thème': page.locator('.nuancier-tete .bascule'),
      'rampe Soft': page.locator('.pastille[data-profil="soft"]').first(),
    };
    for (const [nom, locator] of Object.entries(visibles)) assert.equal(await dansLaFenetre(locator), true, `${nom} hors de la fenêtre`);
    assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop), 0);
    // La génération appartient à l'onglet Planches : la tête de la palette ne porte que le titre, dans le flux ([UI-05]).
    const tete = page.locator('#panneau-palettes .tete-de-la-palette');
    assert.equal(await tete.textContent(), 'Palette Bleu');
    assert.equal(await tete.locator('button, [role="status"], [aria-live]').count(), 0, 'ni geste, ni état, ni progression sous le titre');
    assert.equal(await tete.evaluate((element) => getComputedStyle(element).position), 'static');
  } finally {
    await page.close();
  }
});

test('[UI-04] les flèches déplacent le focus sur les pastilles ; Entrée choisit la nuance et ouvre son détail, puis la relâche', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const active = page.locator('.nuancier-grille [tabindex="0"]');
    assert.equal(await active.count(), 1);
    await active.focus();
    const focalisee = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    assert.match(await focalisee(), /^Profil Vivid, nuance 700,/);
    await page.keyboard.press('ArrowRight');
    assert.match(await focalisee(), /^Profil Vivid, nuance 800,/);
    await page.keyboard.press('ArrowUp');
    assert.match(await focalisee(), /^Profil Soft, nuance 800,/);
    // La pastille on-solid précède les rampes : Origine s'y pose, la flèche droite rend la première nuance.
    await page.keyboard.press('Home');
    assert.match(await focalisee(), /^on-solid, fond du thème,/);
    await page.keyboard.press('ArrowRight');
    assert.match(await focalisee(), /^Profil Soft, nuance 50,/);
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false, 'le focus seul n’ouvre pas le détail');
    await page.keyboard.press('Enter');
    const choisie = page.locator('[aria-label^="Profil Soft, nuance 50,"]');
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Soft · 50');
    assert.match(await page.locator('.nuancier-detail .detail-code').textContent(), /^#[0-9A-F]{6}$/);
    assert.equal(await choisie.getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.nuancier-grille [tabindex="0"]').count(), 1);
    // Le même geste relâche la nuance et referme son détail ; le focus reste sur elle.
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false);
    assert.equal(await choisie.getAttribute('aria-selected'), 'false');
    assert.match(await focalisee(), /^Profil Soft, nuance 50,/);
    await page.keyboard.press(' ');
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Soft · 50');
    await page.keyboard.press(' ');
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[UI-04] [UI-10] un clic sur une nuance donne son code, ses rôles et ses contrastes, sans copier ni naviguer ; un second clic la relâche', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const nuance = page.locator('[aria-label^="Profil Vivid, nuance 700,"]');
    await nuance.hover();
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false, 'le survol ne remplace pas le détail');
    await nuance.click();
    const detail = page.locator('.nuancier-detail');
    assert.equal(await detail.locator('.detail-titre').textContent(), 'Vivid · 700');
    assert.match(await detail.locator('.detail-code').textContent(), /^#[0-9A-F]{6}$/);
    const [sertA, contrastes] = await detail.locator('.detail-groupe').allInnerTexts();
    for (const role of ['solid · default', 'text · default', 'border-control · hover']) assert.ok(sertA.includes(role), role);
    assert.match(sertA, /✓ sur surface 100 : \d+,\d\d:1\s*AA/);
    // Chaque ratio porte le nom de ce qu'il compare, une seule fois.
    const lignes = await detail.locator('.detail-contraste').evaluateAll((rangees) => rangees.map((rangee) => rangee.innerText.split('\n').filter(Boolean)));
    assert.deepEqual(lignes.map(([nom]) => nom), ['Fond du thème', 'Blanc', 'Noir']);
    for (const [, ratio, badge] of lignes) {
      assert.match(ratio, /^\d+,\d\d:1$/);
      assert.match(badge, /^AAA?( ✗)?$/);
    }
    assert.equal((contrastes.match(/Fond du thème/g) ?? []).length, 1);
    assert.deepEqual(await page.evaluate(() => window.demandes.map((demande) => demande.type)), ['lire-etat']);
    await nuance.click();
    assert.equal(await detail.isVisible(), false);
    assert.equal(await nuance.getAttribute('aria-selected'), 'false');
  } finally {
    await page.close();
  }
});

test('[UI-12] l’onglet se règle avant de se juger : titre, configuration, aperçu, Intensités, Dérive de teinte, Garanties de contraste, Interface de test, les cartes repliables repliées', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const configuration = page.locator('#panneau-palettes .configuration-de-la-palette');
    assert.equal(await configuration.locator('> :first-child').getAttribute('class'), 'tete-de-la-palette');
    assert.deepEqual(await configuration.locator('> .carte').evaluateAll((cartes) => cartes.map((carte) => [carte.getAttribute('aria-label'), carte.dataset.ouverte])), [
      ['Configuration de la palette', 'true'],
      ['Aperçu', 'true'],
      ['Intensités', 'false'],
      ['Dérive de teinte', 'false'],
      ['Garanties de contraste', 'false'],
      ['Interface de test', 'false'],
    ]);
    // La carte Dérive de teinte ne redit pas les garanties : ni bilan, ni lien vers leur carte.
    await deplierLaCarte(page, 'Dérive de teinte');
    const derive = carteDeLOnglet(page, 'Dérive de teinte');
    assert.equal(await derive.getByRole('button', { name: 'Voir les garanties' }).count(), 0);
    assert.doesNotMatch(await derive.textContent(), /Garanties :/);
  } finally {
    await page.close();
  }
});

test('[MOT-17] [UI-04] la nuance qui porte la référence porte son repère, qui change de colonne avec le thème', async () => {
  const page = await ouvrirSur('reference-vivid');
  try {
    // #A855F7 : Vivid 600 en Light, Vivid 700 en Dark.
    const reperee = () => page.locator('.pastille[data-reference="true"]').evaluate((pastille) => `${pastille.dataset.profil} ${pastille.dataset.cran}`);
    await page.getByRole('button', { name: 'Thème Light', exact: true }).click();
    assert.equal(await reperee(), 'vivid 600');
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Vivid · nuance 600');
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    assert.equal(await reperee(), 'vivid 700');
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Vivid · nuance 700');
    assert.equal(await page.locator('.pastille[data-reference="true"]').count(), 1);
  } finally {
    await page.close();
  }
});

test('[UI-04] le nuancier porte le fond du thème choisi, et ses textes s’y lisent', async () => {
  const page = await ouvrirSur('fond-personnalise');
  try {
    const { fond, encre } = await page.locator('.nuancier-surface').evaluate((surface) => ({ fond: getComputedStyle(surface).backgroundColor, encre: getComputedStyle(surface).color }));
    assert.equal(fond, 'rgb(255, 216, 77)');
    assert.equal(encre, 'rgb(30, 30, 30)');
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => getComputedStyle(surface).backgroundColor), 'rgb(18, 18, 18)');
  } finally {
    await page.close();
  }
});

test('[UI-09] repliées, les garanties gardent le résultat des deux profils ; la première ligne en échec est choisie, et un clic ou Entrée en choisit une autre, qui trace un arc par état', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    const garanties = carteDeLOnglet(page, 'Garanties de contraste');
    assert.equal(await garanties.getAttribute('data-ouverte'), 'false');
    assert.equal(await garanties.locator('.carte-resume').textContent(), 'Soft ✗ 1 · Vivid ✗ 1');
    await deplierLaCarte(page, 'Garanties de contraste');
    assert.equal(await garanties.locator('.carte-resume').textContent(), 'Thème Light');
    // Le profil porteur est choisi, et chaque segment porte le résultat de son profil.
    assert.deepEqual(await garanties.locator('.bascule-des-profils button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')])), [['Soft ✗ 1', 'false'], ['Vivid ✗ 1', 'true']]);
    const choisie = () => garanties.locator('.garantie[aria-pressed="true"]').getAttribute('data-association');
    const arcs = () => garanties.locator('.reglette-arc').evaluateAll((traits) => traits.map((trait) => trait.dataset.verdict));
    assert.equal(await choisie(), 'text/surface');
    assert.deepEqual(await arcs(), ['manquee', 'tenue', 'tenue']);
    assert.match(await garanties.locator('.garantie-echec').first().innerText(), /^État default : 4,19:1 pour un minimum de 4,5:1/);
    await garanties.locator('.garantie[data-association="text/fond"]').click();
    assert.equal(await choisie(), 'text/fond');
    assert.deepEqual(await arcs(), ['tenue']);
    await garanties.locator('.garantie[data-association="on-solid/solid"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await choisie(), 'on-solid/solid');
    assert.equal((await arcs()).length, 3);
    // Le choix se conserve au changement de profil.
    await garanties.locator('.bascule-des-profils button').first().click();
    assert.equal(await choisie(), 'on-solid/solid');
  } finally {
    await page.close();
  }
});

test('[UI-09] des garanties manquées dans l’autre thème se comptent, basculent l’aperçu sur ce thème, et un bouton ramène au thème d’avant', async () => {
  // Le cran 700 plus clair fait manquer text sur surface en Light ; l'aperçu montre Dark.
  const page = await ouvrirSur('garantie-en-echec');
  try {
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    await deplierLaCarte(page, 'Garanties de contraste');
    const autre = carteDeLOnglet(page, 'Garanties de contraste').locator('.autre-theme');
    assert.equal(await autre.isVisible(), true);
    await autre.locator('.lien-de-constat').click();
    assert.equal(await page.getByRole('button', { name: 'Thème Light', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await carteDeLOnglet(page, 'Garanties de contraste').locator('.carte-resume').textContent(), 'Thème Light');
    await page.getByRole('button', { name: 'Revenir au thème Dark' }).click();
    assert.equal(await page.getByRole('button', { name: 'Thème Dark', exact: true }).getAttribute('aria-pressed'), 'true');
  } finally {
    await page.close();
  }
});

test('la bascule montre la rampe sombre', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const clair = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Thème Dark', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), clair);
  } finally {
    await page.close();
  }
});

test('[ENT-02] une référence saisie recalcule l’aperçu et la dérive sans passer par le sandbox', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    const avant = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    // #FACC15 est le 300 de vivid en Light, #1E6FD9 son 600 : le pivot de la dérive change de colonne.
    assert.equal(await colonneDuPivot(page), 3);
    await page.locator('#panneau-palettes .champ-hexa').fill('#1E6FD9');
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), avant);
    assert.equal(await colonneDuPivot(page), 6);
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

test('le banc de galerie joue un clic : le détail de la nuance choisie s’affiche', async () => {
  const page = await pageDeGalerie('palette-en-saisie');
  try {
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Vivid · 700');
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').inputValue(), '#7C3AED');
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue une touche : le focus avance d’un cran', async () => {
  const page = await pageDeGalerie('promesses-manquees');
  try {
    assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /^Profil Vivid, nuance 800,/);
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
    await page.getByRole('button', { name: 'Créer la palette', exact: true }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.empreinteLue, null);
    assert.equal(demande.recette.palettes.length, 1);
    assert.match(demande.recette.palettes[0].id, /^p-[0-9a-f]{8}$/);
    // Un enregistrement réussi ne s'annonce pas : la ligne du titre ne porte que « Palette [nom] ».
    await envoyer(page, rangee(demande.demande));
    assert.equal(await page.locator('#panneau-palettes .tete-de-la-palette').textContent(), 'Palette #1E6FD9');
  } finally {
    await page.close();
  }
});

test('D-D : un nom se range quand le champ est validé, jamais pendant la saisie', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    const nom = page.getByRole('textbox', { name: 'Nom de la palette' });
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
      await page.getByRole('button', { name: 'Actions sur la palette' }).click();
      await page.getByRole('menuitem', { name: nom }).click();
      return avant;
    };
    let demande = await prochaine(page, await geste('Dupliquer la palette'));
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune', 'Copie de Jaune', 'Bleu']);
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Copie de Jaune');
    await envoyer(page, rangee(demande.demande));
    demande = await prochaine(page, await geste('Déplacer vers le haut'));
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Copie de Jaune', 'Jaune', 'Bleu']);
    await envoyer(page, rangee(demande.demande));
    const avant = await geste('Supprimer la palette');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'la suppression attend sa confirmation');
    await page.locator('.confirmation').getByRole('button', { name: 'Supprimer la palette' }).click();
    demande = await prochaine(page, avant);
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune', 'Bleu']);
  } finally {
    await page.close();
  }
});

test('[UI-02] « Supprimer la palette » porte le fond plein du danger, et son survol un rouge plus soutenu, jamais la couleur de marque', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer la palette' }).click();
    const bouton = page.locator('.confirmation').getByRole('button', { name: 'Supprimer la palette' });
    const peinture = () => bouton.evaluate((element) => ({ fond: getComputedStyle(element).backgroundColor, texte: getComputedStyle(element).color }));
    // Les valeurs de repli du socle, hors de Figma : #F24822, puis #DC3412 au survol, texte blanc.
    assert.deepEqual(await peinture(), { fond: 'rgb(242, 72, 34)', texte: 'rgb(255, 255, 255)' });
    await bouton.hover();
    assert.deepEqual(await peinture(), { fond: 'rgb(220, 52, 18)', texte: 'rgb(255, 255, 255)' });
    const marque = await page.evaluate(() => {
      const temoin = document.createElement('span');
      document.body.append(temoin);
      const couleurs = ['--fond-marque', '--fond-marque-survol'].map((jeton) => {
        temoin.style.background = `var(${jeton})`;
        return getComputedStyle(temoin).backgroundColor;
      });
      temoin.remove();
      return couleurs;
    });
    assert.ok(!marque.includes((await peinture()).fond), 'le survol n’hérite pas du bouton principal');
  } finally {
    await page.close();
  }
});

test('[REC-10] un rangement refusé propose « Recharger », qui relit l’état', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    let avant = await compte(page);
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer la palette' }).click();
    const demande = await prochaine(page, avant);
    await envoyer(page, { type: 'rangement', demande: demande.demande, issue: { issue: 'modifiee-ailleurs' } });
    avant = await compte(page);
    await page.getByRole('button', { name: 'Recharger les palettes' }).click();
    const relecture = await prochaine(page, avant);
    assert.equal(relecture.type, 'lire-etat');
    await envoyer(page, { ...messageDe('alertes-seules'), demande: relecture.demande });
    assert.equal(await page.getByRole('button', { name: 'Recharger les palettes' }).count(), 0);
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

test('un hexa impossible se signale sous le champ, et l’aperçu ne change pas', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await page.locator('#panneau-palettes .champ-hexa').fill('#FACZ15');
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').getAttribute('aria-invalid'), 'true');
    assert.match(await carteDeLOnglet(page, 'Configuration de la palette').locator('.field-error:visible').textContent(), /n’est pas accepté/);
    assert.equal(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), avant);
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

test('[UI-03] un nom de palette long ne pousse ni les gestes ni le champ du nom hors de la fenêtre', async () => {
  const page = await ouvrir();
  try {
    const message = structuredClone(messageDe('alertes-seules'));
    message.classement.recette.palettes[0].nom = 'Jaune principal de la marque, déclinaison institutionnelle';
    await envoyer(page, message);
    // Le bord droit du contenu est celui de l'en-tête : il est hors des grilles de l'onglet.
    const enTete = await page.locator('.header').boundingBox();
    const largeur = enTete.x + enTete.width;
    for (const locator of [page.getByRole('button', { name: 'Actions sur la palette' }), page.locator('.titre-de-premier-rang'), page.getByRole('textbox', { name: 'Nom de la palette' })]) {
      const boite = await locator.boundingBox();
      assert.ok(boite.x + boite.width <= largeur, JSON.stringify(boite));
    }
    assert.equal(await page.locator('.titre-de-premier-rang').evaluate((element) => element.scrollWidth > element.clientWidth), true, 'le nom long se coupe');
  } finally {
    await page.close();
  }
});

test('[UI-06] à 500 px, la liste prend la largeur libre, les deux gestes ont sa hauteur, et un nom long se coupe', async () => {
  const page = await ouvrir(MINIMALE);
  try {
    const message = structuredClone(messageDe('alertes-seules'));
    message.classement.recette.palettes[0].nom = 'Jaune principal de la marque, déclinaison institutionnelle';
    await envoyer(page, message);
    const liste = await page.locator('.selecteur-bouton').boundingBox();
    const nouvelle = await page.getByRole('button', { name: 'Nouvelle palette', exact: true }).boundingBox();
    const menu = await page.getByRole('button', { name: 'Actions sur la palette' }).boundingBox();
    const barre = await page.locator('.barre-gestes').boundingBox();
    assert.deepEqual([nouvelle.height, menu.height], [liste.height, liste.height]);
    // La liste occupe ce que les deux gestes et leurs écarts laissent : 8 px chacun.
    assert.equal(Math.round(liste.width), Math.round(barre.width - nouvelle.width - menu.width - 16));
    assert.ok(menu.x + menu.width <= barre.x + barre.width + 0.5, JSON.stringify({ menu, barre }));
    const coupe = await page.locator('.selecteur-nom').evaluate((nom) => nom.scrollWidth > nom.clientWidth && getComputedStyle(nom).textOverflow === 'ellipsis');
    assert.equal(coupe, true);
  } finally {
    await page.close();
  }
});

test('[UI-11] le titre dit « Palette [nom] » et suit la saisie du nom, sans retirer le focus du champ', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const titre = page.locator('.titre-de-premier-rang');
    assert.equal(await titre.textContent(), 'Palette Jaune');
    assert.equal(await page.locator('[aria-label="Configuration de la palette"] .carte-titre').textContent(), 'Configuration de la palette');
    const nom = page.getByRole('textbox', { name: 'Nom de la palette' });
    await nom.click();
    await nom.press('End');
    await page.keyboard.type(' vif');
    assert.equal(await titre.textContent(), 'Palette Jaune vif');
    assert.equal(await nom.evaluate((champ) => champ === document.activeElement), true);
  } finally {
    await page.close();
  }
});

test('[UI-06] la création est une carte en trois colonnes, en Standard et Auto, ses gestes à gauche ; Entrée crée avec la palette de base choisie, Échap annule', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const nouvelle = page.getByRole('button', { name: 'Nouvelle palette', exact: true });
    await nouvelle.click();
    const carte = page.locator('[aria-label="Nouvelle palette"]');
    assert.deepEqual(await carte.locator('.colonnes-de-base .libelle-de-champ').allTextContents(), ['Nom de la palette', 'Couleur de référence', 'Modèle', 'Palette de base']);
    assert.equal(await carte.getByRole('button', { name: 'Standard', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await carte.getByRole('button', { name: 'Auto', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await carte.locator('.creation-ligne button').allTextContents(), ['Créer la palette', 'Annuler']);
    const [gestes, corps] = [await carte.locator('.creation-ligne button').first().boundingBox(), await carte.locator('.carte-corps').boundingBox()];
    assert.ok(gestes.x - corps.x < corps.width / 4, 'les gestes de la création sont à gauche');
    assert.equal(await page.locator('.champ-creation').evaluate((champ) => champ === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await carte.isVisible(), false);
    assert.equal(await nouvelle.evaluate((bouton) => bouton === document.activeElement), true);

    await nouvelle.click();
    await carte.getByRole('button', { name: 'Vivid', exact: true }).click();
    await carte.getByRole('textbox', { name: 'Nom de la palette' }).fill('Menthe');
    const avant = await compte(page);
    await page.locator('.champ-creation').fill('#16A34A');
    await page.locator('.champ-creation').press('Enter');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.deepEqual(
      (({ nom, reference, base }) => ({ nom, reference, base }))(demande.recette.palettes.at(-1)),
      { nom: 'Menthe', reference: '#16A34A', base: 'vivid' },
    );
    assert.equal(await page.locator('.titre-de-premier-rang').textContent(), 'Palette Menthe');
  } finally {
    await page.close();
  }
});

test('[UI-04] la carte d’aperçu n’a pas de titre : les onglets de thème à gauche, l’actif sur un fond plus foncé, la référence sous la surface', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const carte = page.locator('[aria-label="Aperçu"]');
    assert.equal(await carte.locator('.carte-titre').count(), 0);
    const onglets = await carte.locator('.nuancier-tete .bascule').boundingBox();
    const fond = await carte.locator('.pastille-du-fond').boundingBox();
    const tete = await carte.locator('.carte-tete').boundingBox();
    assert.equal(Math.round(onglets.x), Math.round(tete.x), 'les onglets ouvrent l’en-tête');
    assert.ok(fond.x > onglets.x + onglets.width);
    const fondDe = (nom) => carte.getByRole('button', { name: nom, exact: true }).evaluate((bouton) => getComputedStyle(bouton).backgroundColor);
    assert.notEqual(await fondDe('Thème Light'), await fondDe('Thème Dark'));
    assert.notEqual(await fondDe('Thème Light'), await carte.evaluate((element) => getComputedStyle(element).backgroundColor), 'l’onglet actif se détache de la carte');
    const ordre = await carte.locator('.nuancier-surface, .repere-de-la-reference').evaluateAll((elements) => elements.map((element) => element.className));
    assert.deepEqual(ordre, ['nuancier-surface', 'repere-de-la-reference']);
  } finally {
    await page.close();
  }
});

test('[UI-04] W4.1 la pastille du fond ouvre le sélecteur en Hex avec la mention du fond commun ; une frappe prévisualise, Entrée range, et les Réglages communs le montrent', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Modifier le fond du thème Light, actuellement #F7F7F7' }).click();
    // L'étiquette suit la valeur : la pastille se retrouve ensuite par sa classe.
    const pastille = page.locator('.pastille-du-fond');
    const selecteur = page.getByRole('dialog', { name: 'Fond du thème Light' });
    assert.equal(await selecteur.isVisible(), true);
    assert.equal(await pastille.getAttribute('aria-expanded'), 'true');
    assert.equal(await selecteur.getByRole('combobox', { name: 'Format du code' }).inputValue(), 'hex');
    const code = selecteur.getByRole('textbox', { name: 'Code hexadécimal' });
    assert.equal(await code.evaluate((champ) => champ === document.activeElement), true, 'le code a le focus à l’ouverture');
    assert.equal(await code.inputValue(), 'F7F7F7');
    assert.equal(await selecteur.locator('.selecteur-mention').textContent(), 'Ce fond s’applique à toutes les palettes.');
    assert.equal(await selecteur.locator('.selecteur-titre').textContent(), 'Fonds par défaut et premières nuances');
    const noms = await selecteur.locator('.selecteur-pastille').evaluateAll((boutons) => boutons.map((bouton) => bouton.getAttribute('aria-label')));
    assert.deepEqual(noms.slice(0, 3), ['Fond Light par défaut, #F7F7F7', 'Fond Dark par défaut, #121212', 'Blanc, #FFFFFF']);
    assert.match(noms[3], /^Vivid 50, #[0-9A-F]{6}$/);
    assert.equal(noms.length, 5);

    const avant = await compte(page);
    await code.fill('ffd84d');
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => surface.style.background), 'rgb(255, 216, 77)');
    assert.equal(await compte(page), avant, 'la frappe ne range rien');
    await code.press('Enter');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.fonds.light, '#FFD84D');
    assert.equal(await code.inputValue(), 'FFD84D');
    assert.equal(await page.getByRole('button', { name: 'Modifier le fond du thème Light, actuellement #FFD84D' }).count(), 1);

    await page.keyboard.press('Escape');
    assert.equal(await selecteur.isVisible(), false);
    assert.equal(await pastille.evaluate((bouton) => bouton === document.activeElement), true, 'Échap rend le focus à la pastille');
    assert.equal(await pastille.getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    assert.equal(await page.locator('.champ-hexa[aria-label="Fond du thème Light"]').inputValue(), '#FFD84D');
  } finally {
    await page.close();
  }
});

test('W4.1 un glisser dans la zone prévisualise sans ranger, et le relâcher range une seule fois', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: /^Modifier le fond du thème Light/ }).click();
    const zone = page.getByRole('slider', { name: 'Saturation et luminosité' });
    const boite = await zone.boundingBox();
    const avant = await compte(page);
    await page.mouse.move(boite.x + boite.width * 0.9, boite.y + boite.height * 0.1);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width * 0.5, boite.y + boite.height * 0.3, { steps: 5 });
    const pendant = await page.locator('.nuancier-surface').evaluate((surface) => surface.style.background);
    assert.notEqual(pendant, 'rgb(247, 247, 247)', 'l’aperçu suit le glisser');
    assert.equal(await compte(page), avant, 'le glisser ne range rien');
    await page.mouse.up();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.notEqual(demande.recette.fonds.light, '#F7F7F7');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    assert.equal(await compte(page), avant + 1);
    const code = await page.getByRole('textbox', { name: 'Code hexadécimal' }).inputValue();
    assert.equal(`#${code}`, demande.recette.fonds.light);
  } finally {
    await page.close();
  }
});

test('W4.2 le sélecteur de la référence : nuances Vivid, formats, code invalide gardé, clavier, focus rendu, Hex à chaque ouverture', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const configuration = page.locator('[aria-label="Configuration de la palette"]');
    const pipette = configuration.getByRole('button', { name: 'Couleur de référence' });
    const reference = await configuration.locator('.champ-hexa').inputValue();
    await pipette.click();
    const selecteur = page.getByRole('dialog', { name: 'Couleur de référence' });
    assert.equal(await selecteur.getByRole('textbox', { name: 'Code hexadécimal' }).inputValue(), reference.slice(1));
    assert.equal(await selecteur.locator('.selecteur-mention').isVisible(), false);
    assert.equal(await selecteur.locator('.selecteur-titre').textContent(), 'Nuances de la palette ouverte');
    const noms = await selecteur.locator('.selecteur-pastille').evaluateAll((boutons) => boutons.map((bouton) => bouton.getAttribute('aria-label')));
    assert.equal(noms.length, 11);
    assert.match(noms[0], /^Vivid 50, #/);
    assert.match(noms[10], /^Vivid 950, #/);

    // RGB : trois champs ; un canal hors bornes reste dans son champ, marqué, et rien ne se range.
    await selecteur.getByRole('combobox', { name: 'Format du code' }).selectOption('rgb');
    const rouge = selecteur.getByRole('textbox', { name: 'Rouge, de 0 à 255' });
    assert.equal(await selecteur.locator('.selecteur-champ').count(), 3);
    const avant = await compte(page);
    await rouge.fill('300');
    await rouge.press('Tab');
    assert.equal(await rouge.inputValue(), '300');
    assert.equal(await rouge.getAttribute('aria-invalid'), 'true');
    assert.equal(await compte(page), avant, 'un code invalide ne se range pas');
    assert.equal(await configuration.locator('.champ-hexa').inputValue(), reference);

    // HSL : la teinte au clavier, un degré puis dix avec Maj ; chaque pression range.
    await selecteur.getByRole('combobox', { name: 'Format du code' }).selectOption('hsl');
    const teinte = selecteur.getByRole('slider', { name: 'Teinte' });
    const depart = Number(await teinte.getAttribute('aria-valuenow'));
    await teinte.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(Number(await teinte.getAttribute('aria-valuenow')), (depart + 1) % 360);
    await page.keyboard.press('Shift+ArrowRight');
    assert.equal(Number(await teinte.getAttribute('aria-valuenow')), (depart + 11) % 360);
    assert.equal(await selecteur.getByRole('textbox', { name: 'Teinte, en degrés' }).inputValue(), String((depart + 11) % 360));
    // Un rangement à la fois : le second attend la réponse au premier.
    for (const rang of [avant, avant + 1]) {
      const rangement = await prochaine(page, rang);
      assert.equal(rangement.type, 'ranger-recette');
      await envoyer(page, rangee(rangement.demande));
    }
    const zone = selecteur.getByRole('slider', { name: 'Saturation et luminosité' });
    const valeur = await zone.getAttribute('aria-valuetext');
    await zone.focus();
    await page.keyboard.press('ArrowDown');
    assert.notEqual(await zone.getAttribute('aria-valuetext'), valeur);
    await envoyer(page, rangee((await prochaine(page, avant + 2)).demande));

    // Échap rend le focus à la pastille ; la réouverture revient à Hex.
    await page.keyboard.press('Escape');
    assert.equal(await pipette.evaluate((bouton) => bouton === document.activeElement), true);
    await pipette.click();
    assert.equal(await selecteur.getByRole('combobox', { name: 'Format du code' }).inputValue(), 'hex');

    // Une pastille proposée devient la référence, d'un clic.
    const vivid500 = selecteur.getByRole('button', { name: /^Vivid 500, / });
    const hexa = (await vivid500.getAttribute('aria-label')).split(', ')[1];
    const rang = await compte(page);
    await vivid500.click();
    const rangement = await prochaine(page, rang);
    assert.ok(rangement.recette.palettes.some((palette) => palette.reference === hexa));
    assert.equal(await configuration.locator('.champ-hexa').inputValue(), hexa);
    assert.equal(await vivid500.getAttribute('aria-pressed'), 'true');

    // Un clic hors du sélecteur le referme.
    await page.locator('.titre-de-premier-rang').click();
    assert.equal(await selecteur.isVisible(), false);
  } finally {
    await page.close();
  }
});

test('W4.1 la création ouvre le sélecteur sans pastille, et la couleur choisie remplit le code', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Nouvelle palette', exact: true }).click();
    const creation = page.locator('[aria-label="Nouvelle palette"]');
    await creation.getByRole('button', { name: 'Couleur de référence' }).click();
    const selecteur = page.getByRole('dialog', { name: 'Couleur de référence' });
    assert.equal(await selecteur.locator('.selecteur-pastilles').isVisible(), false);
    const code = selecteur.getByRole('textbox', { name: 'Code hexadécimal' });
    assert.equal(await code.inputValue(), '1E6FD9', 'le sélecteur part de l’exemple du champ vide');
    await code.fill('16a34a');
    await code.press('Enter');
    assert.equal(await creation.getByRole('textbox', { name: 'Couleur de référence' }).inputValue(), '#16A34A');
  } finally {
    await page.close();
  }
});

test('W4.3 Luminosité des nuances : chaque champ sous son point du tracé, flèches à 0,005 et 0,05 avec Maj, puis « Rétablir »', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const carte = page.locator('[aria-label="Luminosité des nuances"]');
    for (const mode of ['light', 'dark']) {
      const points = await carte.locator(`.trace-point[data-mode="${mode}"]`).evaluateAll((cercles) => cercles.map((cercle) => {
        const boite = cercle.getBoundingClientRect();
        return boite.x + boite.width / 2;
      }));
      const champs = await carte.locator(`.champ-de-courbe[data-mode="${mode}"]`).evaluateAll((saisies) => saisies.map((saisie) => {
        const boite = saisie.getBoundingClientRect();
        return { centre: boite.x + boite.width / 2, droite: boite.right, deborde: saisie.scrollWidth > saisie.clientWidth };
      }));
      assert.equal(champs.length, 11);
      champs.forEach(({ centre, deborde }, rang) => {
        assert.ok(Math.abs(centre - points[rang]) <= 2, `${mode} ${rang} : champ à ${centre}, point à ${points[rang]}`);
        assert.equal(deborde, false, `${mode} ${rang} : la valeur est rognée`);
      });
      assert.ok(champs[10].droite <= 500, 'la table tient dans la fenêtre');
    }

    const champ = page.getByRole('textbox', { name: 'Thème Light 700' });
    assert.equal(await champ.inputValue(), '0,5');
    const avant = await compte(page);
    await champ.focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await champ.inputValue(), '0,505');
    const premier = await prochaine(page, avant);
    assert.equal(premier.recette.courbes.light[7], 0.505);
    await envoyer(page, rangee(premier.demande));
    await page.keyboard.press('Shift+ArrowDown');
    assert.equal(await champ.inputValue(), '0,455');
    const second = await prochaine(page, avant + 1);
    assert.equal(second.recette.courbes.light[7], 0.455);
    await envoyer(page, rangee(second.demande));

    const retablir = carte.getByRole('button', { name: /^Rétablir/ });
    assert.equal(await retablir.isDisabled(), false);
    await retablir.click();
    const retour = await prochaine(page, avant + 2);
    assert.equal(retour.recette.courbes.light[7], 0.5);
    assert.equal(await champ.inputValue(), '0,5');
  } finally {
    await page.close();
  }
});

test('W4.4 Minimums et détection : une ligne par seuil, l’aide lisible sans survol, champs et unités alignés', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    for (const [titre, lignes] of [['Minimums des promesses', 2], ['Détection des couleurs proches', 3]]) {
      const carte = page.locator(`[aria-label="${titre}"]`);
      await carte.locator('.carte-bascule').click();
      const mesures = await carte.locator('.ligne-de-seuil').evaluateAll((elements) => elements.map((ligne) => ({
        champ: ligne.querySelector('.champ-nombre').getBoundingClientRect().x,
        unite: ligne.querySelector('.unite').getBoundingClientRect().x,
        aide: ligne.querySelector('.ligne-de-seuil-textes .ligne-secondaire').textContent,
      })));
      assert.equal(mesures.length, lignes);
      for (const mesure of mesures) {
        assert.equal(Math.round(mesure.champ), Math.round(mesures[0].champ), `${titre} : champs alignés`);
        assert.equal(Math.round(mesure.unite), Math.round(mesures[0].unite), `${titre} : unités alignées`);
        assert.ok(mesure.aide.length > 0);
      }
    }
    assert.deepEqual(await page.locator('.ligne-de-seuil .unite').allTextContents(), [':1', ':1', 'ΔEok', 'ΔEok', 'chroma']);
    const texte = page.getByRole('textbox', { name: 'Texte', exact: true });
    const avant = await compte(page);
    await texte.fill('7');
    await texte.press('Tab');
    assert.equal((await prochaine(page, avant)).recette.seuils.texte, 7);
  } finally {
    await page.close();
  }
});

test('W6.5 passer en Libre retire la palette de base et la carte des garanties ; les puces règlent la liste, bornée de 4 à 13 ; revenir au modèle rend la liste commune', async () => {
  const page = await ouvrirSur('reference-dans-le-selecteur');
  try {
    const configuration = page.locator('[aria-label="Configuration de la palette"]');
    const avant = await compte(page);
    await configuration.getByRole('button', { name: 'Libre', exact: true }).click();
    const libre = await prochaine(page, avant);
    await envoyer(page, rangee(libre.demande));
    const palette = libre.recette.palettes[0];
    assert.deepEqual(palette.crans, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
    assert.equal('base' in palette, false);
    assert.equal(await configuration.getByRole('group', { name: 'Palette de base' }).isVisible(), false);
    assert.equal(await configuration.getByText('Sans rôles ni garanties').isVisible(), true);
    assert.equal(await page.locator('[aria-label="Garanties de contraste"]').isVisible(), false);
    assert.equal(await page.locator('.pastille-on-solid').isVisible(), false);
    assert.equal(await page.locator('.accolades').isVisible(), false);

    // Une puce éteinte s'allume, une allumée s'éteint ; la liste se range triée.
    await configuration.getByRole('button', { name: 'Nuance 1000' , exact: true }).click();
    const plus = await prochaine(page, avant + 1);
    assert.deepEqual(plus.recette.palettes[0].crans.slice(-2), [950, 1000]);
    await envoyer(page, rangee(plus.demande));
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 1000' , exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.nuancier-numero').count(), 12);
    // Treize au plus : à treize, les puces éteintes se désactivent.
    await configuration.getByRole('button', { name: 'Nuance 1050' , exact: true }).click();
    await envoyer(page, rangee((await prochaine(page, avant + 2)).demande));
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 250' , exact: true }).isDisabled(), true);
    assert.match(await configuration.locator('.puces-de-nuances').getAttribute('aria-label'), /^Nuances · 13 sur 13 au plus$/);

    await configuration.getByRole('button', { name: 'Standard', exact: true }).click();
    const modele = await prochaine(page, avant + 3);
    assert.equal('crans' in modele.recette.palettes[0], false);
    await envoyer(page, rangee(modele.demande));
    assert.equal(await page.locator('[aria-label="Garanties de contraste"]').isVisible(), true);
    assert.equal(await page.locator('.nuancier-numero').count(), 11);
  } finally {
    await page.close();
  }
});

test('W6.5 une palette libre de six nuances : l’aperçu suit sa liste, le détail n’invente aucun rôle, quatre puces allumées ne s’éteignent plus', async () => {
  const page = await ouvrirSur('palette-libre');
  try {
    assert.deepEqual(await page.locator('.nuancier-numero').allTextContents(), ['100', '200', '400', '600', '800', '900']);
    await page.locator('.pastille[data-profil="vivid"][data-cran="800"]').click();
    const detail = page.locator('.nuancier-detail');
    assert.match(await detail.textContent(), /^Vivid · 800#0846A3/);
    assert.doesNotMatch(await detail.textContent(), /Sert à/);
    const configuration = page.locator('[aria-label="Configuration de la palette"]');
    for (const numero of [100, 200]) {
      const avant = await compte(page);
      await configuration.getByRole('button', { name: `Nuance ${numero}` , exact: true }).click();
      await envoyer(page, rangee((await prochaine(page, avant)).demande));
    }
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 400' , exact: true }).isDisabled(), true, 'à quatre nuances, une puce allumée ne s’éteint plus');
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 50' , exact: true }).isDisabled(), false);
  } finally {
    await page.close();
  }
});

test('W6.4 le préréglage se choisit dans « Luminosité des nuances » : l’effet se lit avant, se range à la confirmation, et Annuler ne range rien', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const carte = page.locator('[aria-label="Luminosité des nuances"]');
    assert.equal(await carte.getByRole('button', { name: '11 nuances' }).getAttribute('aria-pressed'), 'true');
    const avant = await compte(page);
    await carte.getByRole('button', { name: '9 nuances' }).click();
    assert.equal(await carte.locator('.confirmation p').textContent(), 'Passer à 9 nuances retire 400 et 950. Les rôles gardent leurs numéros. Aucune nuance gardée ne change de couleur.');
    await carte.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await carte.locator('.confirmation').isVisible(), false);
    assert.equal(await compte(page), avant, 'Annuler ne range rien');

    await carte.getByRole('button', { name: '13 nuances' }).click();
    assert.match(await carte.locator('.confirmation p').textContent(), /^Passer à 13 nuances ajoute 1000 et 1050\. Les rôles gardent leurs numéros\./);
    await carte.getByRole('button', { name: 'Passer à 13 nuances' }).click();
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.crans.slice(-3), [950, 1000, 1050]);
    assert.deepEqual(rangement.recette.courbes.light.slice(-2), [0.215, 0.165]);
    await envoyer(page, rangee(rangement.demande));
    assert.equal(await carte.getByRole('button', { name: '13 nuances' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await carte.locator('.champ-de-courbe[data-mode="light"]').count(), 13);
    const rognes = await carte.locator('.champ-de-courbe').evaluateAll((champs) => champs.filter((champ) => champ.scrollWidth > champ.clientWidth).length);
    assert.equal(rognes, 0, 'treize valeurs tiennent à 500 px');
    assert.equal(await carte.getByText('Liste importée').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[ENT-10] une clarté éditée fait sonner la garantie, se range à la validation, et l’aperçu la suit', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avantLAperçu = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const clair700 = page.getByRole('textbox', { name: 'Thème Light 700' });
    assert.equal(await clair700.inputValue(), '0,5');
    assert.equal(await reglage(page, 'Luminosité des nuances').locator('.constat-alerte').count(), 0);
    const avant = await compte(page);
    await clair700.fill('0,56');
    assert.equal(await reglage(page, 'Luminosité des nuances').locator('.constat-alerte').count(), 2);
    assert.equal(await compte(page), avant, 'la saisie ne range rien');
    await clair700.press('Tab');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.courbes.light[7], 0.56);
    await envoyer(page, rangee(demande.demande));
    await clair700.fill('0,5');
    assert.equal(await reglage(page, 'Luminosité des nuances').locator('.constat-alerte').count(), 0);
    await clair700.fill('0,56');
    await clair700.press('Tab');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), avantLAperçu);
  } finally {
    await page.close();
  }
});

test('[REC-05] une clarté qui casse la courbe se refuse sous le groupe, et rien n’est rangé', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const avant = await compte(page);
    const clair700 = page.getByRole('textbox', { name: 'Thème Light 700' });
    await clair700.fill('0,9');
    await clair700.press('Tab');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant);
    assert.match(await reglage(page, 'Luminosité des nuances').locator('.field-error').textContent(), /doit être inférieure/);
  } finally {
    await page.close();
  }
});

test('[ENT-07] [ENT-12] chaque carte des Réglages communs compte les palettes qu’elle touche ; les cartes repliées, une ligne par seuil', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const fixes = ['Couleurs de fond', 'Intensités', 'Luminosité des nuances'];
    assert.deepEqual(await Promise.all(fixes.map((titre) => reglage(page, titre).locator('.carte-resume').textContent())), [
      '3 palettes concernées',
      '1 palette concernée',
      '3 palettes concernées',
    ]);
    const comptes = [];
    for (const titre of ['Minimums des promesses', 'Détection des couleurs proches']) {
      assert.equal(await reglage(page, titre).getAttribute('data-ouverte'), 'false');
      await reglage(page, titre).locator('> .carte-bascule').click();
      comptes.push(...await reglage(page, titre).locator('.carte-corps .ligne-secondaire').evaluateAll((lignes) => lignes.map((ligne) => ligne.textContent).filter((texte) => /concernée/.test(texte))));
    }
    // Seuils de contraste, profils confondus, palettes proches, référence grise.
    assert.deepEqual(comptes, [
      '3 palettes concernées',
      '2 palettes concernées',
      '3 palettes concernées',
      '2 palettes concernées',
    ]);
  } finally {
    await page.close();
  }
});

test('[ENT-05] un fond et un seuil se saisissent dans la configuration, et se rangent à la validation', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const fond = page.getByRole('textbox', { name: 'Fond du thème Dark' });
    assert.equal(await fond.inputValue(), '#121212');
    const avant = await compte(page);
    await fond.fill('#1c1c1c');
    await fond.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.fonds, { light: '#F7F7F7', dark: '#1C1C1C' });
    await envoyer(page, rangee(rangement.demande));

    await fond.fill('#12');
    await fond.press('Tab');
    assert.equal(await reglage(page, 'Couleurs de fond').locator('.field-error:visible').textContent(), 'Saisissez un code couleur à 6 caractères, par exemple #1E6FD9. « #12 » n’est pas accepté.');
    assert.equal(await compte(page), avant + 1, 'une couleur refusée ne se range pas');

    await reglage(page, 'Minimums des promesses').locator('> .carte-bascule').click();
    const texte = page.getByRole('textbox', { name: 'Texte', exact: true });
    await texte.fill('7');
    await texte.press('Tab');
    assert.equal((await prochaine(page, avant + 1)).recette.seuils.texte, 7);
  } finally {
    await page.close();
  }
});

const deplier = (page) => deplierLaCarte(page, 'Dérive de teinte');

test('[DER-01] le bouton de la dérive déplie le graphe : une ligne, le pivot, deux poignées, onze colonnes alignées', async () => {
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
    assert.equal(await bascule(page, 'Dérive de teinte').getAttribute('aria-expanded'), 'true');
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
    assert.match(await page.locator('.editeur-derive > .ligne-secondaire').textContent(), /plus sombre que toutes les nuances/);
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
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Soft · nuance 400');
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
    assert.equal(await bascule(page, 'Dérive de teinte').isDisabled(), true);
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
    const avantLApercu = await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label');
    // L'éditeur est sous le nuancier : à 440 × 520, la poignée se fait voir avant d'être saisie.
    await poignee(page, 'clair').scrollIntoViewIfNeeded();
    const boite = await poignee(page, 'clair').locator('circle').boundingBox();
    const avant = await compte(page);
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width / 2, boite.y - 30, { steps: 4 });
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label'), avantLApercu, 'l’aperçu suit le glisser');
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
    assert.match(await poignee(page, 'sombre').getAttribute('aria-valuetext'), /^Décalage de −90,0°, teinte obtenue : \d+°$/);
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
    await page.getByRole('combobox', { name: 'Dérive de teinte' }).selectOption('constante');
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
    await page.getByRole('checkbox', { name: 'Synchroniser la dérive de soft et vivid' }).click();
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.lien, false);
    await page.getByRole('group', { name: 'Profil à modifier' }).getByRole('button', { name: 'soft' }).click();
    await poignee(page, 'clair').focus();
    avant = await compte(page);
    await page.keyboard.press('Shift+ArrowUp');
    palette = await rangementDe(page, avant);
    assert.notDeepEqual(palette.derive.soft, palette.derive.vivid);
    const vivid = palette.derive.vivid;
    avant = await compte(page);
    await page.getByRole('checkbox', { name: 'Synchroniser la dérive de soft et vivid' }).click();
    assert.equal(await page.locator('.editeur-derive .confirmation').isVisible(), true);
    assert.equal(await compte(page), avant, 'relier attend la confirmation');
    await page.getByRole('button', { name: 'Appliquer à soft' }).click();
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

const ETRANGERS = { issue: 'etrangers', cadres: [{ palette: ID_DU_BLEU, calques: [{ id: '40:7', nom: 'Note' }, { id: '40:8', nom: 'Flèche' }] }] };

/** La première demande du type donné, parmi celles qui suivent les `rang` premières. */
async function prochaineDuType(page, type, rang) {
  await page.waitForFunction(([cherche, n]) => window.demandes.slice(n).some((demande) => demande.type === cherche), [type, rang]);
  return (await demandes(page)).slice(rang).find((demande) => demande.type === type);
}

/** Ouvre l'onglet Planches et clique le premier geste de la fiche d'une palette ([UI-05]). */
async function genererDepuisLaFiche(page, palette) {
  await page.getByRole('tab', { name: 'Planches', exact: true }).click();
  await page.locator(`#panneau-planche .fiche-planche[data-palette="${palette}"] [data-geste="generer"]`).click();
}

test('[PLA-24] [UI-05] « Générer sur Figma » d’une fiche envoie sa palette, dit la progression, rend les onglets inertes, puis montre l’état du cadre relu', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    // La génération n'a pas d'option : la grille des contrastes est toujours dessinée.
    assert.deepEqual(demande, { type: 'dessiner', demande: demande.demande, palettes: [ID_DU_BLEU], grille: true, empreinteLue: messageDe('dessin-en-cours').empreinte, etrangersConfirmes: [] });
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).isDisabled(), true);
    await envoyer(page, { type: 'progression', demande: demande.demande, fait: 0, total: 1, nom: 'Bleu' });
    assert.equal(await page.locator('#panneau-planche .gestes-globaux .btn-secondary').textContent(), 'Génération de « Bleu »…', 'la progression prend la place de « Générer tout »');

    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('#panneau-planche .gestes-globaux .btn-secondary').textContent(), 'Générer tout (1 palette)');
    assert.equal(await page.locator('#panneau-planche .constat').count(), 0, 'aucun message de succès empilé');
    // Un dessin fini a posé des cadres : l'état se relit, et la fiche dit l'état du cadre.
    const relecture = await prochaineDuType(page, 'lire-etat', avant);
    await envoyer(page, { ...ETATS.find(({ id }) => id === 'generation-reussie').atteinte[4].message, demande: relecture.demande });
    const fiche = page.locator(`.fiche-planche[data-palette="${ID_DU_BLEU}"]`);
    assert.equal(await fiche.getAttribute('data-etat'), 'a-jour');
    assert.deepEqual(await fiche.locator('.fiche-gestes button').allTextContents(), ['Afficher', 'Modifier'], 'un cadre à jour n’a pas de premier geste');
    const vu = await compte(page);
    await fiche.getByRole('button', { name: 'Afficher', exact: true }).click();
    assert.deepEqual(await prochaine(page, vu), { type: 'voir-sur-la-planche', demande: relecture.demande + 1, page: '40:1', cadres: ['40:2'] });
  } finally {
    await page.close();
  }
});

test('[PLA-24] D-I : au-delà de six palettes, tout dessiner se confirme, grille des contrastes comprise', async () => {
  const page = await ouvrirSur('confirmation-six-palettes');
  try {
    await page.getByRole('tab', { name: 'Planches', exact: true }).click();
    assert.equal(await page.locator('.fiche-planche[data-palette]').count(), 7);
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Générer tout (7 palettes)' }).click();
    assert.equal(await page.locator('#panneau-planche .confirmation').textContent(), 'La génération de 7 palettes ajoutera plus de 1 500 calques par palette. Confirmez pour lancer la génération.Générer sur FigmaAnnuler');
    await page.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await page.locator('#panneau-planche .confirmation').isVisible(), false);
    await page.getByRole('button', { name: 'Générer tout (7 palettes)' }).click();
    await page.locator('#panneau-planche .confirmation').getByRole('button', { name: 'Générer sur Figma' }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'dessiner');
    assert.equal(demande.palettes.length, 7);
    assert.equal(demande.grille, true);
    assert.equal(await compte(page), avant + 1, 'aucune demande pendant la confirmation');
  } finally {
    await page.close();
  }
});

test('[UI-05] une fiche à jour n’a pas de premier geste ; une modification enregistrée lui donne « Actualiser sur Figma »', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const fiche = page.locator(`.fiche-planche[data-palette="${ID_DU_BLEU}"]`);
    assert.equal(await fiche.locator('[data-geste="generer"]').count(), 0);
    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    const avant = await compte(page);
    await page.locator('#panneau-palettes .champ-hexa').fill('#2563EB');
    await page.locator('#panneau-palettes .champ-hexa').press('Tab');
    const rangement = await prochaineDuType(page, 'ranger-recette', avant);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    const generer = fiche.locator('[data-geste="generer"]');
    assert.equal(await generer.textContent(), 'Actualiser sur Figma');
    assert.equal(await generer.isDisabled(), false);
    await generer.click();
    assert.deepEqual((await dessinEnvoye(page, 1)).palettes, [ID_DU_BLEU]);
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
    await page.getByRole('tab', { name: 'Planches', exact: true }).click();
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Générer tout (6 palettes)' }).click();
    assert.equal((await dessinEnvoye(page, 1)).palettes.length, 6);
    assert.equal(await page.locator('#panneau-planche .confirmation').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[PLA-22] un dessin interrompu se relance à l’identique par « Réessayer »', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const premiere = await dessinEnvoye(page, 1);
    await envoyer(page, dessinDe(premiere.demande, { issue: 'interrompue', palette: ID_DU_BLEU, message: 'refus', dessines: 0 }));
    assert.equal(await page.locator('#panneau-planche .constat-bloquant .constat-quoi').textContent(), 'La génération s’est arrêtée : aucune nouvelle présentation de palette n’a été créée.');
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant').count(), 0, 'le résultat ne s’affiche que dans l’onglet Planches');
    await page.locator('#panneau-planche').getByRole('button', { name: 'Réessayer' }).click();
    const reprise = await dessinEnvoye(page, 2);
    assert.deepEqual({ ...reprise, demande: 0 }, { ...premiere, demande: 0 });
    assert.ok(reprise.demande > premiere.demande);
  } finally {
    await page.close();
  }
});

test('E13 : un dessin refusé sur une autre recette propose de recharger', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'modifiee-ailleurs' }));
    // La fin du dessin relit déjà l'état : le clic doit en demander une seconde lecture, et aucun dessin.
    assert.equal((await prochaine(page, avant)).type, 'lire-etat');
    await page.locator('#panneau-planche .constat-bloquant').getByRole('button', { name: 'Recharger les palettes' }).click();
    assert.equal((await prochaine(page, avant + 1)).type, 'lire-etat');
    assert.equal(await compte(page), avant + 2);
  } finally {
    await page.close();
  }
});

test('l’onglet Planche d’un fichier sans palette renvoie vers l’onglet Palettes', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('planche-sans-palette'));
    await page.getByRole('tab', { name: 'Planches', exact: true }).click();
    assert.equal(await page.locator('#panneau-planche .gestes-globaux').isVisible(), false);
    await page.getByRole('button', { name: 'Créer une palette' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Palettes', exact: true }).getAttribute('aria-selected'), 'true');
  } finally {
    await page.close();
  }
});

test('E13 : un dessin qui attendait un rangement refusé est abandonné, et l’interface redevient active', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer la palette' }).click();
    const rangement = await prochaine(page, avant);
    // Un rangement en vol : l'onglet Planches ne relit pas l'état à son ouverture.
    await ouvrirLaPlanche(page);
    await page.locator(`#panneau-planche .fiche-planche[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), true);
    await envoyer(page, { type: 'rangement', demande: rangement.demande, issue: { issue: 'modifiee-ailleurs' } });
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), false);
    assert.deepEqual((await demandes(page)).slice(avant).map((demande) => demande.type), ['ranger-recette']);
  } finally {
    await page.close();
  }
});

const ID_DU_JAUNE = 'p-08b7d4a0';
const ouvrirLaPlanche = (page) => page.getByRole('tab', { name: 'Planches', exact: true }).click();
const etatsDesLignes = (page) => page.locator('.fiche-planche[data-palette]').evaluateAll((lignes) => lignes.map((ligne) => ligne.dataset.etat));
const dessinsEnvoyes = async (page) => (await demandes(page)).filter((demande) => demande.type === 'dessiner');
/** Attend le `rang`-ième dessin envoyé, compté à partir de 1. */
async function dessinEnvoye(page, rang) {
  await page.waitForFunction((n) => window.demandes.filter((demande) => demande.type === 'dessiner').length >= n, rang);
  return (await dessinsEnvoyes(page))[rang - 1];
}

test('[PLA-20] l’onglet Planche dit l’état de chaque cadre, et « Actualiser sur Figma » envoie la seule palette périmée', async () => {
  const page = await ouvrirSur('planche-perimee');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'perimee', 'jamais-dessinee']);
    const fiches = page.locator('.fiche-planche[data-palette]');
    // Un cadre jamais dessiné n'a pas d'état écrit : son geste « Générer sur Figma » le dit.
    assert.deepEqual(await fiches.locator('.etat-du-cadre').allTextContents(), ['À jour', 'À mettre à jour', '']);
    // Y1.9 : le premier geste quand le cadre en demande un, puis « Afficher » pour un cadre localisé, puis « Modifier ».
    assert.deepEqual(await fiches.evaluateAll((cartes) => cartes.map((fiche) => [...fiche.querySelectorAll('.fiche-gestes button')].map((bouton) => bouton.textContent))), [
      ['Afficher', 'Modifier'],
      ['Actualiser sur Figma', 'Afficher', 'Modifier'],
      ['Générer sur Figma', 'Modifier'],
    ]);
    assert.deepEqual(await fiches.locator('[data-geste="generer"]').evaluateAll((boutons) => boutons.map((bouton) => bouton.classList.contains('btn-primary'))), [true, true], 'le premier geste est le bouton principal');
    await fiches.nth(1).getByRole('button', { name: 'Actualiser sur Figma' }).click();
    const demande = await dessinEnvoye(page, 1);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'dessiner', demande: 0, palettes: [ID_DU_JAUNE], grille: true, empreinteLue: messageDe('planche-perimee').empreinte, etrangersConfirmes: [] });
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
    const nom = page.getByRole('textbox', { name: 'Nom de la palette' });
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
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const avant = await compte(page);
    const clair700 = page.getByRole('textbox', { name: 'Thème Light 700' });
    await clair700.fill('0,56');
    await clair700.press('Tab');
    await envoyer(page, rangee((await prochaine(page, avant)).demande));
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.deepEqual(await etatsDesLignes(page), ['perimee', 'perimee']);
  } finally {
    await page.close();
  }
});

const carteSupprimee = (page, cadre) => page.locator(`.carte-supprimee[data-cadre="${cadre}"]`);

test('[ENT-03] [UI-02] une palette supprimée se lit en une carte, et « Afficher dans Figma » montre son cadre', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await page.locator('.carte-supprimee .carte-titre').allTextContents(), ['Ardoise', 'Rouge']);
    const ardoise = carteSupprimee(page, '40:4');
    assert.equal(await ardoise.locator('p').first().textContent(), 'Palette supprimée du plugin. Ce cadre ne sera plus mis à jour.');
    assert.equal(await page.locator('#panneau-planche .constat-notice').count(), 0, 'plus de notice pour un cadre sans palette');
    const couleurs = await ardoise.evaluate((carte) => [getComputedStyle(carte).backgroundColor, getComputedStyle(document.querySelector('.fiche-planche[data-palette]')).backgroundColor]);
    assert.notEqual(couleurs[0], couleurs[1], 'la carte porte sa teinte d’avertissement');
    const avant = await compte(page);
    await ardoise.getByRole('button', { name: 'Afficher dans Figma' }).click();
    const demande = await prochaine(page, avant);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'voir-sur-la-planche', demande: 0, page: '40:1', cadres: ['40:4'] });
  } finally {
    await page.close();
  }
});

test('[PLA-27] « Supprimer définitivement » part sans confirmation ; la carte disparaît, le focus passe à la suivante, puis au compte', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    let avant = await compte(page);
    await carteSupprimee(page, '40:4').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const demande = await prochaine(page, avant);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'retirer-cadre', demande: 0, palette: 'p-5c1d0e77', cadre: '40:4' });
    assert.equal(await carteSupprimee(page, '40:6').getByRole('button', { name: 'Supprimer définitivement' }).isDisabled(), true, 'un seul retrait en vol');
    avant = await compte(page);
    await envoyer(page, { type: 'retrait', demande: demande.demande, issue: { issue: 'retire' } });
    assert.equal(await carteSupprimee(page, '40:4').count(), 0);
    assert.equal(await page.locator('#panneau-planche [role="status"]').textContent(), 'Cadre « Ardoise » supprimé. Ctrl+Z dans Figma le rétablit.');
    assert.equal(await carteSupprimee(page, '40:6').getByRole('button', { name: 'Afficher dans Figma' }).evaluate((bouton) => bouton === document.activeElement), true);
    assert.equal((await prochaine(page, avant)).type, 'lire-etat', 'l’état se relit');

    avant = await compte(page);
    await carteSupprimee(page, '40:6').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const second = await prochaine(page, avant);
    await envoyer(page, { type: 'retrait', demande: second.demande, issue: { issue: 'deja-absent' } });
    assert.equal(await page.locator('.carte-supprimee').count(), 0);
    assert.equal(await page.locator('.planche-compte').evaluate((ligne) => ligne === document.activeElement), true);
  } finally {
    await page.close();
  }
});

test('[PLA-27] un retrait refusé laisse la carte et le dit ; pendant un conflit, le geste est inactif et dit pourquoi', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    let avant = await compte(page);
    await carteSupprimee(page, '40:4').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const demande = await prochaine(page, avant);
    await envoyer(page, { type: 'retrait', demande: demande.demande, issue: { issue: 'refuse' } });
    assert.equal(await carteSupprimee(page, '40:4').count(), 1);
    assert.equal(await page.locator('#panneau-planche [role="status"] .constat-ou').textContent(), 'Cadre non supprimé : Ardoise');

    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    avant = await compte(page);
    await page.getByRole('textbox', { name: 'Nom de la palette' }).fill('Bleu roi');
    await page.getByRole('textbox', { name: 'Nom de la palette' }).press('Tab');
    const rangement = await prochaine(page, avant);
    await envoyer(page, { type: 'rangement', demande: rangement.demande, issue: { issue: 'modifiee-ailleurs' } });
    await ouvrirLaPlanche(page);
    const geste = carteSupprimee(page, '40:4').getByRole('button', { name: 'Supprimer définitivement' });
    assert.equal(await geste.isDisabled(), true);
    assert.equal(await geste.getAttribute('title'), 'Exportez vos modifications ou rechargez les palettes avant de supprimer un cadre.');
  } finally {
    await page.close();
  }
});

test('[PLA-25] une copie de cadre se signale, et ne compte pas comme le cadre de sa palette', async () => {
  const page = await ouvrirSur('copie-de-cadre');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-planche .constat-notice .constat-ou').textContent(), 'Copie du cadre « Bleu copie »');
  } finally {
    await page.close();
  }
});

test('E11 : un document Display P3 dit de copier l’hexa depuis la carte', async () => {
  const page = await ouvrirSur('document-display-p3');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-planche .constat-notice .constat-ou').textContent(), 'Fichier Figma en Display P3');
  } finally {
    await page.close();
  }
});


test('D-H : des calques étrangers se confirment ; « Annuler » ne dessine rien, « Remplacer le cadre et son contenu » les nomme au sandbox', async () => {
  const page = await ouvrirSur('calques-etrangers');
  try {
    // Le cadre est périmé : « Actualiser sur Figma » de sa fiche le redessine.
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, ETRANGERS));
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'La mise à jour supprimera' });
    assert.equal(await confirmation.locator('.constat-quoi').textContent(), 'La mise à jour supprimera les 2 calques que vous avez ajoutés dans ce cadre : « Note », « Flèche ».');
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), false);
    await confirmation.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await confirmation.count(), 0);
    assert.equal((await dessinsEnvoyes(page)).length, 1, 'annuler ne dessine rien');

    await page.locator(`#panneau-planche .fiche-planche[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    const seconde = await dessinEnvoye(page, 2);
    await envoyer(page, dessinDe(seconde.demande, ETRANGERS));
    await page.getByRole('button', { name: 'Remplacer le cadre et son contenu' }).click();
    const confirmee = await dessinEnvoye(page, 3);
    assert.deepEqual({ ...confirmee, demande: 0 }, { ...seconde, demande: 0, etrangersConfirmes: ['40:7', '40:8'] });
  } finally {
    await page.close();
  }
});

test('L6.14 : une couleur peinte autrement que l’aperçu est un point à vérifier près de la génération ; sans écart, rien ne s’ajoute', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    const zone = page.locator('#panneau-planche');
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await zone.locator('.constat').count(), 0);

    await page.locator(`#panneau-planche .fiche-planche[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    const peints = [{ palette: ID_DU_BLEU, nom: 'vivid/light/700', hexa: '#000000' }];
    await envoyer(page, dessinDe((await dessinEnvoye(page, 2)).demande, { issue: 'dessinee', page: '5:6', cadres, peints }));
    assert.equal(await zone.locator('.constat-alerte .constat-quoi').textContent(), '1 couleur ne correspond pas à l’aperçu.');
    assert.match(await zone.locator('.constat-alerte .constat-detail p').textContent(), /^Exemple, vivid\/light\/700 : #[0-9A-F]{6} dans l’aperçu, #000000 sur la planche\.$/);
    assert.equal(await zone.locator('.constat').count(), 1, 'le résultat suivant remplace le précédent');
  } finally {
    await page.close();
  }
});

test('[UI-05] le résultat d’une génération se lit dans l’onglet Planches, jamais dans l’onglet Palettes', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    await envoyer(page, dessinDe(demande.demande, ETRANGERS));
    assert.equal(await page.locator('#panneau-planche .confirmation', { hasText: 'La mise à jour supprimera' }).count(), 1);
    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    assert.doesNotMatch(await page.locator('#panneau-palettes').textContent(), /La mise à jour supprimera|Remplacer le cadre/);
  } finally {
    await page.close();
  }
});

test('[ENT-09] [UI-12] l’intensité d’un profil se saisit dans la carte Intensités, repliée sur son résumé ; soft reste sous vivid, et le retour aux réglages communs la retire', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const soft = page.getByRole('textbox', { name: 'Intensité de la palette Soft' });
    assert.equal(await soft.isVisible(), false, 'la carte est repliée à l’ouverture');
    assert.equal(await carteDeLOnglet(page, 'Intensités').locator('.carte-resume').textContent(), 'Communes · Soft 0,45 · Vivid 0,95');
    await deplierLaCarte(page, 'Intensités');
    assert.equal(await soft.inputValue(), '0,45');
    const avant = await compte(page);
    await soft.fill('0,6');
    await soft.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes[0].parts, { soft: 0.6, vivid: 0.95, origine: 'designer' });
    await envoyer(page, rangee(rangement.demande));

    // Soft ne dépasse jamais vivid : une saisie au-dessus s'arrête à l'intensité de vivid.
    await soft.fill('0,99');
    await soft.press('Tab');
    const bornee = await prochaine(page, avant + 1);
    assert.deepEqual(bornee.recette.palettes[0].parts, { soft: 0.95, vivid: 0.95, origine: 'designer' });
    await envoyer(page, rangee(bornee.demande));

    await page.getByRole('button', { name: 'Utiliser les réglages communs pour l’intensité' }).click();
    assert.equal((await prochaine(page, avant + 2)).recette.palettes[0].parts, undefined);
  } finally {
    await page.close();
  }
});

test('[ENT-09] un glisser d’intensité prévisualise sans enregistrer, et Échap rend la valeur d’avant le geste', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Intensités');
    const curseur = page.getByRole('slider', { name: 'Intensité de la palette Vivid' });
    const avantLApercu = await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label');
    const avant = await compte(page);
    await curseur.evaluate((element) => {
      element.value = '0.5';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label'), avantLApercu, 'l’aperçu suit le geste');
    assert.equal(await compte(page), avant, 'rien ne s’enregistre pendant le geste');
    await curseur.press('Escape');
    assert.equal(await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label'), avantLApercu, 'Échap rend l’aperçu d’avant');
    assert.equal(await compte(page), avant);
  } finally {
    await page.close();
  }
});

test('[VER-10] l’intensité de la référence se situe par un repère sur chaque curseur, sans message permanent', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Intensités');
    // #FACC15 a une intensité de 0,98, au-dessus de vivid (0,95).
    const reperes = page.locator('.repere-de-reference');
    assert.equal(await reperes.count(), 2);
    assert.match(await reperes.first().getAttribute('title'), /^Intensité de la couleur de référence : 0,98$/);
    assert.equal(await page.locator('.intensites > .constats .constat').count(), 0, 'aucune notice permanente');
    assert.equal(await page.locator('.intensites > .constat-detail').isVisible(), true, 'le détail reste à la demande');
    assert.equal(await page.locator('#panneau-palettes .constats-titre-notice').count(), 0);
  } finally {
    await page.close();
  }
});

test('[VER-11] [UI-12] des profils confondus s’annoncent sur la carte repliée, se lisent dans les intensités, et mènent aux intensités communes', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    assert.match(await carteDeLOnglet(page, 'Intensités').locator('.carte-resume').textContent(), / · 1 point à vérifier$/);
    await deplierLaCarte(page, 'Intensités');
    const message = page.locator('.intensites .constat-alerte');
    assert.match(await message.locator('.constat-quoi').textContent(), /^Les couleurs soft et vivid sont très proches sur ces nuances\.$/);
    // L'alerte ne nomme que les nuances des emplois ; le repère de l'aperçu porte sur toute la liste ([PLA-15]).
    assert.match(await message.innerText(), /^Bleu : nuances Light 100\n/);
    assert.deepEqual(await page.locator('.pastille[data-confondue="true"]').evaluateAll((pastilles) => pastilles.map((pastille) => `${pastille.dataset.profil} ${pastille.dataset.cran}`)), ['soft 50', 'soft 100', 'vivid 50', 'vivid 100']);
    await message.getByRole('button', { name: 'Intensités communes' }).click();
    assert.equal(await page.locator('.page-title').textContent(), 'Réglages communs');
  } finally {
    await page.close();
  }
});

test('D-G : les intensités grises se lisent sous le nuancier, avec l’intensité de la référence', async () => {
  const page = await ouvrirSur('couleur-presque-grise');
  try {
    assert.match(await page.locator('.intensites > .ligne-secondaire').textContent(), /^La couleur de référence est presque grise\. Les profils soft et vivid utilisent tous les deux son intensité : 0,\d+\.$/);
    assert.equal(await page.getByRole('button', { name: 'Utiliser les réglages communs pour l’intensité' }).isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[VER-15] un lien de message ouvre les Réglages communs sur son groupe, et le retour rend le focus au lien', async () => {
  const page = await ouvrirSur('fond-personnalise');
  try {
    const lien = page.locator('#panneau-palettes .constat-alerte').getByRole('button', { name: 'Couleurs de fond' });
    await lien.click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Fond du thème Light');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Couleurs de fond');
  } finally {
    await page.close();
  }
});

/** Le fichier que « Exporter la recette » propose : son nom et son contenu. */
/** Déplie la carte « Palettes et réglages » de l'onglet Planches, quand l'onglet en a une : un blocage porte ses gestes lui-même. */
async function deplierLaRecette(page, dans) {
  if (await carteDeLOnglet(page, 'Palettes et réglages', dans).count() > 0) await deplierLaCarte(page, 'Palettes et réglages', dans);
}

async function exporter(page, dans) {
  await deplierLaRecette(page, dans);
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(dans).getByRole('button', { name: 'Exporter les palettes et les réglages' }).click(),
  ]);
  return { nom: telechargement.suggestedFilename(), contenu: readFileSync(await telechargement.path(), 'utf8') };
}
const importerLeFichier = async (page, dans, contenu) =>
  (await deplierLaRecette(page, dans), page).locator(`${dans} input[type="file"]`).setInputFiles({ name: 'palettes-et-reglages.json', mimeType: 'application/json', buffer: Buffer.from(contenu) });

test('L7.7 : exporter la recette, modifier le JSON, l’importer, voir l’écart, confirmer, puis dessiner', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    assert.equal(await page.getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).count(), 0, 'une recette lisible ne se remplace que par un import');
    const exporte = await exporter(page, '#panneau-planche');
    assert.equal(exporte.nom, 'palettes-et-reglages.json');
    assert.equal(exporte.contenu, messageDe('planche-a-jour').texte, '[REC-07] le JSON canonique de la recette rangée');

    const modifiee = JSON.parse(exporte.contenu);
    modifiee.palettes[0].nom = 'Bleu roi';
    modifiee.seuils.texte = 7;
    const avant = await compte(page);
    await importerLeFichier(page, '#panneau-planche', JSON.stringify(modifiee, null, 2));
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?' });
    assert.deepEqual(await confirmation.locator('p').allTextContents(), [
      'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?',
      'Palette à modifier : Bleu roi (nom).',
      'Réglage commun à modifier : minimum des textes.',
      'Minimums des promesses : le résultat des garanties peut changer, sans changer les couleurs.',
      'Sur la planche : 2 cadres passeront « À mettre à jour » (Bleu roi, Jaune).',
      'L’import remplacera vos palettes et vos réglages dans ce fichier Figma. La planche restera telle quelle jusqu’à sa prochaine mise à jour.',
    ]);
    assert.equal(await compte(page), avant, 'rien ne se range avant la confirmation');
    await confirmation.getByRole('button', { name: 'Remplacer par cette sauvegarde' }).click();
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    assert.deepEqual(rangement.recette, modifiee);
    assert.equal(rangement.empreinteLue, messageDe('planche-a-jour').empreinte);
    await envoyer(page, rangee(rangement.demande));

    assert.equal(await page.locator('.fiche-planche[data-palette] .carte-titre').first().textContent(), 'Bleu roi');
    assert.equal(await page.locator('.fiche-planche[data-palette]').first().getAttribute('data-etat'), 'perimee');
    await page.getByRole('button', { name: 'Générer tout (2 palettes)' }).click();
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
    await page.locator(bloquant).getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).click();
    assert.equal(await compte(page), avant, 'la confirmation vient avant tout rangement');
    await page.locator(bloquant).getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes, []);
    assert.equal(rangement.empreinteLue, illisible.empreinte);
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant:visible').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).count(), 0);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    assert.equal(await page.locator('#panneau-planche .constat-bloquant:visible').count(), 0, 'l’onglet Planche quitte aussi le bloquant');
    assert.equal(await page.getByText('Créez une palette dans l’onglet « Palettes » pour pouvoir générer sa présentation ici.').isVisible(), true);
  } finally {
    await page.close();
  }
});

test('[REC-08] un fichier d’une version future ou cassé se refuse, et rien ne se range', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaPlanche(page);
    await importerLeFichier(page, '#panneau-planche', JSON.stringify({ formatVersion: 99 }));
    assert.equal(await page.locator('#panneau-planche .constat-bloquant .constat-ou').textContent(), 'Import impossible : palettes-et-reglages.json, format 99');
    await importerLeFichier(page, '#panneau-planche', '{pas du json');
    assert.match(await page.locator('#panneau-planche .constat-bloquant .constat-quoi').textContent(), /Vos palettes et vos réglages actuels sont conservés\.$/);
    // L'onglet Planches relit l'état à son ouverture ([PLA-20]) : seul un rangement compte ici.
    assert.deepEqual((await demandes(page)).filter((demande) => demande.type === 'ranger-recette'), []);
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue un fichier : l’écart d’import attend sa confirmation', async () => {
  const page = await pageDeGalerie('ecart-d-import');
  try {
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?' });
    assert.equal(await confirmation.locator('p').nth(1).textContent(), 'Palette à ajouter : Ardoise.');
  } finally {
    await page.close();
  }
});

/** Le rapport que « Exporter le rapport » propose, relu en JSON. */
async function exporterLeRapport(page) {
  await deplierLaCarte(page, 'Palettes et réglages', '#panneau-planche');
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le rapport de vérification' }).click(),
  ]);
  assert.equal(telechargement.suggestedFilename(), 'rapport-palettes.json');
  return JSON.parse(readFileSync(await telechargement.path(), 'utf8'));
}

test('[VER-01] [VER-02] le rapport porte l’empreinte de la recette, ses palettes, et les écarts du dernier dessin', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const avant = await exporterLeRapport(page);
    assert.equal(avant.empreinte, messageDe('planche-a-jour').empreinte);
    assert.deepEqual(avant.palettes.map(({ nom }) => nom), ['Bleu', 'Jaune']);
    // Seize paires par profil et par thème, dont les deux de surface-card (X6).
    assert.equal(avant.palettes[0].promesses.length, 64);
    assert.equal(avant.ecartsDuDernierDessin, null, 'aucun dessin depuis l’ouverture');

    await page.getByRole('button', { name: 'Générer tout (2 palettes)' }).click();
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
    assert.equal(await page.getByRole('button', { name: 'Exporter les palettes et les réglages' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Exporter le rapport de vérification' }).count(), 0);
  } finally {
    await page.close();
  }
});

/** La couleur de fond calculée d'un élément, et celle de la carte qui le porte. */
const fonds = (locator) => locator.evaluate((element) => [getComputedStyle(element).backgroundColor, getComputedStyle(element.closest('.carte')).backgroundColor]);

test('Y1.4 : l’onglet actif des trois bascules, Thème, Soft et Vivid, Écran et États, a le même fond, distinct de sa carte, aux deux thèmes de Figma', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Garanties de contraste');
    await deplierLaCarte(page, 'Interface de test');
    const actifs = [
      page.locator('.nuancier-tete .bascule-option[aria-pressed="true"]'),
      page.locator('.bascule-des-profils .bascule-option[aria-pressed="true"]'),
      page.locator('.bascule-de-l-essai .bascule-option[aria-pressed="true"]'),
    ];
    for (const theme of ['clair', 'sombre']) {
      if (theme === 'sombre') await page.evaluate(() => document.documentElement.classList.add('figma-dark'));
      const releves = await Promise.all(actifs.map(fonds));
      for (const [onglet, carte] of releves) {
        assert.notEqual(onglet, carte, `${theme} : l’onglet actif se confond avec sa carte`);
        assert.notEqual(onglet, 'rgba(0, 0, 0, 0)', `${theme} : l’onglet actif n’a pas de fond`);
      }
      assert.equal(new Set(releves.map(([onglet]) => onglet)).size, 1, `${theme} : trois fonds différents ${JSON.stringify(releves)}`);
    }
  } finally {
    await page.close();
  }
});

test('Y1.5 : dans la grille des États, deux anneaux de focus de rangées voisines gardent un jour entre eux', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Interface de test');
    await page.locator('.bascule-de-l-essai .bascule-option').nth(1).click();
    // L'anneau déborde de 4 px de chaque spécimen ; le jour se mesure entre les anneaux de deux rangées voisines.
    const jours = await page.locator('.essai-etats').evaluate((grille) => {
      const rangees = [...grille.querySelectorAll('.essai-rangee')].filter((rangee) => rangee.querySelector('.essai-specimen'));
      const bornes = rangees.map((rangee) => {
        const boites = [...rangee.querySelectorAll('.essai-specimen')].map((specimen) => specimen.getBoundingClientRect());
        return { haut: Math.min(...boites.map((boite) => boite.top)) - 4, bas: Math.max(...boites.map((boite) => boite.bottom)) + 4 };
      });
      return bornes.slice(1).map((borne, rang) => borne.haut - bornes[rang].bas);
    });
    assert.ok(jours.length >= 6, JSON.stringify(jours));
    assert.ok(Math.min(...jours) > 0, `deux anneaux se touchent : ${JSON.stringify(jours)}`);
  } finally {
    await page.close();
  }
});

test('Y1.6 : les gestes d’une fiche et ceux d’une palette supprimée ont la même hauteur, « Supprimer définitivement » compris', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    const hauteurs = await page.locator('#panneau-planche .fiche-gestes button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getBoundingClientRect().height]));
    assert.ok(hauteurs.some(([texte]) => texte === 'Supprimer définitivement'), JSON.stringify(hauteurs));
    assert.ok(hauteurs.some(([texte]) => texte === 'Modifier'), JSON.stringify(hauteurs));
    assert.deepEqual([...new Set(hauteurs.map(([, hauteur]) => hauteur))], [24], JSON.stringify(hauteurs));
  } finally {
    await page.close();
  }
});
