/** Le dessin de la planche, contre un double de Figma ([PLA-01] à [PLA-06], [PLA-22], [PLA-25], E12, E14 à E17). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { fnv1a, jsonCanonique, octetsUtf8, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { ECART_ENTRE_CADRES, dessinerLaPlanche, dessinerLaRecetteRangee } from '../src/ecriture/planche';
import { lirePlanche } from '../src/lecture';
import { compterCalques, modeleDeCadre } from '../src/planche/modele';
import { FauxFigma } from './figmaDeTest';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9')!, nom: 'Bleu' };
const AMBRE = { ...nouvellePalette(VIDE, 'p-0000000b', '#F2A900')!, nom: 'Ambre' };
const VERT = { ...nouvellePalette(VIDE, 'p-0000000c', '#16A34A')!, nom: 'Vert' };
const RECETTE: Recette = [BLEU, AMBRE, VERT].reduce(ajouter, VIDE);

const dessiner = (figma: FauxFigma, palettes: Palette[], progression?: (fait: number, total: number, nom: string) => void) =>
  dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes, grille: false }, progression);

const cadres = (figma: FauxFigma, page = 'Palettes') => figma.page(page).enfants;

test('[PLA-01] [PLA-02] un premier dessin crée la page « Palettes », un cadre possédé par palette, et range la planche', async () => {
  const figma = new FauxFigma();
  const issue = await dessiner(figma, [BLEU, AMBRE]);
  assert.equal(issue.issue, 'dessinee');
  const [bleu, ambre] = cadres(figma);
  assert.deepEqual([bleu.name, ambre.name], ['Bleu', 'Ambre']);
  for (const [cadre, palette] of [[bleu, BLEU], [ambre, AMBRE]] as const) {
    assert.equal(cadre.getSharedPluginData('ucm_palettes', 'cadre'), palette.id);
    assert.equal(cadre.getSharedPluginData('ucm_palettes', 'proprietaire'), cadre.id);
    assert.equal(cadre.getSharedPluginData('ucm_palettes', 'empreinte'), modeleDeCadre(RECETTE, palette, 'SRGB').empreinte);
  }
  assert.deepEqual(lirePlanche(figma.root), { page: figma.page('Palettes').id, cadres: { [BLEU.id]: bleu.id, [AMBRE.id]: ambre.id } });
});

test('D-H : chaque calque posé porte le marqueur du plugin', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const poses = figma.sous(cadres(figma)[0]);
  assert.equal(poses.length, compterCalques(modeleDeCadre(RECETTE, BLEU, 'SRGB').racine));
  assert.deepEqual(poses.filter((noeud) => noeud.getSharedPluginData('ucm_palettes', 'calque') !== '1'), []);
});

test('E16 : une page « Palettes » étrangère laisse la planche prendre « Palettes (UCM) »', async () => {
  const figma = new FauxFigma(['Page 1', 'Palettes']);
  await dessiner(figma, [BLEU]);
  assert.equal(cadres(figma, 'Palettes (UCM)').length, 1);
  assert.equal(figma.page('Palettes').enfants.length, 0);
});

test('E14 : la page se charge avant qu’un cadre y soit lu ou posé', async () => {
  const redessin = new FauxFigma();
  await dessiner(redessin, [BLEU]);
  redessin.page('Palettes').charge = false;
  redessin.journal.length = 0;
  await dessiner(redessin, [BLEU]);
  const charger = redessin.journal.indexOf('charger Palettes');
  assert.ok(charger >= 0 && charger < redessin.journal.indexOf('créer cadre'), redessin.journal.slice(0, 6).join(' | '));
});

test('[PLA-03] redessiner garde la place du cadre et remplace son contenu', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const ancien = cadres(figma)[0];
  ancien.x = 640;
  ancien.y = -120;
  await dessiner(figma, [BLEU]);
  const [neuf] = cadres(figma);
  assert.equal(cadres(figma).length, 1);
  assert.equal(ancien.removed, true);
  assert.deepEqual([neuf.x, neuf.y], [640, -120]);
  assert.equal(lirePlanche(figma.root).cadres[BLEU.id], neuf.id);
});

test('[PLA-05] E17 : un cadre neuf se pose à 200 px à droite du plus à droite, aligné sur le haut du premier', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU, AMBRE]);
  const [bleu, ambre] = cadres(figma);
  assert.deepEqual([ambre.x, ambre.y], [bleu.x + bleu.width + ECART_ENTRE_CADRES, bleu.y]);
  bleu.y = 300;
  ambre.x = 2000;
  await dessiner(figma, [VERT]);
  const vert = cadres(figma)[2];
  assert.deepEqual([vert.x, vert.y], [2000 + ambre.width + ECART_ENTRE_CADRES, 300]);
});

test('[PLA-04] une page supprimée par le designer est recréée, et son identifiant remplacé', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const ancienne = figma.page('Palettes');
  ancienne.remove();
  await dessiner(figma, [BLEU]);
  const neuve = figma.page('Palettes');
  assert.notEqual(neuve.id, ancienne.id);
  assert.equal(lirePlanche(figma.root).page, neuve.id);
  assert.equal(neuve.enfants.length, 1);
});

test('[PLA-25] E15 : la copie d’un cadre n’est ni possédée, ni réécrite, ni retirée', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const page = figma.page('Palettes');
  const copie = figma.createFrame();
  page.appendChild(copie);
  copie.name = 'Bleu copie';
  copie.setSharedPluginData('ucm_palettes', 'cadre', BLEU.id);
  copie.setSharedPluginData('ucm_palettes', 'proprietaire', cadres(figma)[0].id);
  await dessiner(figma, [BLEU]);
  assert.equal(copie.removed, false);
  assert.equal(page.enfants.filter((cadre) => cadre.getSharedPluginData('ucm_palettes', 'cadre') === BLEU.id).length, 2);
});

test('[PLA-22] une police qui ne se charge pas arrête le dessin avant tout calque', async () => {
  const figma = new FauxFigma();
  figma.policesAbsentes.add('Medium');
  assert.deepEqual(await dessiner(figma, [BLEU]), { issue: 'police', style: 'Inter Medium' });
  assert.deepEqual(figma.journal.filter((entree) => entree.startsWith('créer') || entree === 'commitUndo'), []);
});

test('[PLA-22] une erreur au milieu d’un cadre le retire ; les cadres déjà dessinés restent', async () => {
  const figma = new FauxFigma();
  const textesParCadre = new FauxFigma();
  await dessiner(textesParCadre, [BLEU]);
  const nombre = textesParCadre.journal.filter((entree) => entree === 'créer texte').length;
  figma.echouerAuTexte = nombre + 10;
  const issue = await dessiner(figma, [BLEU, AMBRE]);
  assert.equal(issue.issue, 'interrompue');
  assert.ok(issue.issue === 'interrompue' && issue.palette === AMBRE.id && issue.dessines === 1);
  assert.deepEqual(cadres(figma).map((cadre) => cadre.name), ['Bleu']);
  // Les calques se comparent par leur nom : un calque porte tout le document, et son écart ne s'écrirait pas.
  const restes = [...figma.registre.values()].filter((noeud) => !noeud.removed && noeud.type !== 'PAGE' && noeud.type !== 'DOCUMENT');
  assert.deepEqual(restes.filter((noeud) => !figma.sous(cadres(figma)[0]).includes(noeud)).map((noeud) => noeud.name), [], 'aucun reste du cadre interrompu');
  assert.deepEqual(lirePlanche(figma.root).cadres, { [BLEU.id]: cadres(figma)[0].id });
});

test('[PLA-06] E12 : un seul commitUndo clôt le dessin, après le dernier cadre', async () => {
  const figma = new FauxFigma();
  const annonces: string[] = [];
  await dessiner(figma, [BLEU, AMBRE, VERT], (fait, total, nom) => annonces.push(`${fait}/${total} ${nom}`));
  assert.deepEqual(figma.journal.filter((entree) => entree === 'commitUndo'), ['commitUndo']);
  assert.equal(figma.journal.at(-1), 'commitUndo');
  assert.deepEqual(annonces, ['0/3 Bleu', '1/3 Ambre', '2/3 Vert']);
});

/** Un fichier où la recette est rangée, et l'empreinte que l'interface en a lue. */
function fichierRange(): { figma: FauxFigma; empreinte: string } {
  const figma = new FauxFigma();
  const texte = jsonCanonique(RECETTE);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', texte);
  return { figma, empreinte: fnv1a(octetsUtf8(texte)) };
}

const creations = (figma: FauxFigma) => figma.journal.filter((entree) => entree.startsWith('créer') || entree === 'commitUndo');

test('E13 : une recette rangée qui n’est plus celle lue n’est pas dessinée', async () => {
  const { figma } = fichierRange();
  const issue = await dessinerLaRecetteRangee(figma.api(), { palettes: [BLEU.id], grille: false, empreinteLue: '00000000' });
  assert.deepEqual(issue, { issue: 'modifiee-ailleurs' });
  assert.deepEqual(creations(figma), []);
});

test('[REC-04] sans recette rangée, rien ne se dessine', async () => {
  const figma = new FauxFigma();
  assert.deepEqual(await dessinerLaRecetteRangee(figma.api(), { palettes: [BLEU.id], grille: false, empreinteLue: null }), { issue: 'sans-recette' });
  assert.deepEqual(creations(figma), []);
});

test('[ARC-11] le dessin prend les palettes nommées dans la recette rangée, dans son ordre', async () => {
  const { figma, empreinte } = fichierRange();
  const issue = await dessinerLaRecetteRangee(figma.api(), { palettes: [VERT.id, 'p-inconnue', BLEU.id], grille: false, empreinteLue: empreinte });
  assert.equal(issue.issue, 'dessinee');
  assert.deepEqual(cadres(figma).map((cadre) => cadre.name), ['Bleu', 'Vert']);
  assert.equal(cadres(figma)[1].getSharedPluginData('ucm_palettes', 'empreinte'), modeleDeCadre(RECETTE, VERT, 'SRGB').empreinte);
});
