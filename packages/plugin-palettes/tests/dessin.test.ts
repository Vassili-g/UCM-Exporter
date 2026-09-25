/** Le dessin de la planche, contre un double de Figma ([PLA-01] à [PLA-06], [PLA-19], [PLA-22], [PLA-25], D-H, E12, E14 à E17, L6.14). */
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
  assert.deepEqual(lirePlanche(figma.root), { version: 2, page: figma.page('Palettes').id, cadres: { [BLEU.id]: bleu.id, [AMBRE.id]: ambre.id } });
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
  figma.policesAbsentes.add('Semi Bold');
  assert.deepEqual(await dessiner(figma, [BLEU]), { issue: 'police', style: 'Inter Semi Bold' });
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
  const issue = await dessinerLaRecetteRangee(figma.api(), { palettes: [BLEU.id], grille: false, empreinteLue: '00000000', etrangersConfirmes: [] });
  assert.deepEqual(issue, { issue: 'modifiee-ailleurs' });
  assert.deepEqual(creations(figma), []);
});

test('[REC-04] sans recette rangée, rien ne se dessine', async () => {
  const figma = new FauxFigma();
  assert.deepEqual(await dessinerLaRecetteRangee(figma.api(), { palettes: [BLEU.id], grille: false, empreinteLue: null, etrangersConfirmes: [] }), { issue: 'sans-recette' });
  assert.deepEqual(creations(figma), []);
});

test('[ARC-11] le dessin prend les palettes nommées dans la recette rangée, dans son ordre', async () => {
  const { figma, empreinte } = fichierRange();
  const issue = await dessinerLaRecetteRangee(figma.api(), { palettes: [VERT.id, 'p-inconnue', BLEU.id], grille: false, empreinteLue: empreinte, etrangersConfirmes: [] });
  assert.equal(issue.issue, 'dessinee');
  assert.deepEqual(cadres(figma).map((cadre) => cadre.name), ['Bleu', 'Vert']);
  assert.equal(cadres(figma)[1].getSharedPluginData('ucm_palettes', 'empreinte'), modeleDeCadre(RECETTE, VERT, 'SRGB').empreinte);
});

test('[PLA-19] chaque cadre range son empreinte et la grille avec laquelle il a été dessiné', async () => {
  const figma = new FauxFigma();
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU], grille: true });
  await dessiner(figma, [AMBRE]);
  const [bleu, ambre] = cadres(figma);
  assert.equal(bleu.getSharedPluginData('ucm_palettes', 'grille'), '1');
  assert.equal(bleu.getSharedPluginData('ucm_palettes', 'empreinte'), modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).empreinte);
  assert.equal(ambre.getSharedPluginData('ucm_palettes', 'grille'), '');
});

/** Un cadre de Bleu dessiné, où le designer a posé une note dans une section et une flèche à la racine. */
async function cadreAnnote(): Promise<{ figma: FauxFigma; cadre: ReturnType<typeof cadres>[number]; note: ReturnType<FauxFigma['createFrame']>; fleche: ReturnType<FauxFigma['createFrame']> }> {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU, AMBRE]);
  const [cadre] = cadres(figma);
  const note = figma.createFrame();
  note.name = 'Note';
  note.appendChild(figma.createFrame());
  cadre.enfants[0].appendChild(note);
  const fleche = figma.createFrame();
  fleche.name = 'Flèche';
  cadre.appendChild(fleche);
  return { figma, cadre, note, fleche };
}

test('[PLA-03] D-H : un calque ajouté par le designer arrête le redessin avant tout calque, et se nomme', async () => {
  const { figma, cadre, note, fleche } = await cadreAnnote();
  const avant = figma.journal.length;
  const issue = await dessiner(figma, [BLEU, AMBRE]);
  assert.deepEqual(issue, { issue: 'etrangers', cadres: [{ palette: BLEU.id, calques: [{ id: note.id, nom: 'Note' }, { id: fleche.id, nom: 'Flèche' }] }] });
  assert.deepEqual(creations({ journal: figma.journal.slice(avant) } as FauxFigma), []);
  assert.equal(cadre.removed, false);
});

test('D-H : les calques confirmés disparaissent au redessin ; un calque ajouté depuis redemande confirmation', async () => {
  const { figma, cadre, note, fleche } = await cadreAnnote();
  const confirme = await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU], grille: false, etrangersConfirmes: [note.id, fleche.id] });
  assert.equal(confirme.issue, 'dessinee');
  assert.equal(cadre.removed, true);
  assert.equal(note.removed, true);

  const neuf = cadres(figma).find((candidat) => candidat.getSharedPluginData('ucm_palettes', 'cadre') === BLEU.id)!;
  const autre = figma.createFrame();
  autre.name = 'Commentaire';
  neuf.appendChild(autre);
  const issue = await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU], grille: false, etrangersConfirmes: [note.id, fleche.id] });
  assert.deepEqual(issue, { issue: 'etrangers', cadres: [{ palette: BLEU.id, calques: [{ id: autre.id, nom: 'Commentaire' }] }] });
});

test('L6.14 : le dessin relit la couleur de chaque pastille posée, égale au modèle en sRGB comme en Display P3', async () => {
  for (const profil of ['SRGB', 'DISPLAY_P3'] as const) {
    const figma = new FauxFigma();
    figma.root.documentColorProfile = profil;
    const issue = await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil, palettes: [BLEU, AMBRE], grille: false });
    assert.ok(issue.issue === 'dessinee');
    const attendus = [BLEU, AMBRE].flatMap((palette) => modeleDeCadre(RECETTE, palette, profil).peints.map(({ nom, hexa }) => ({ palette: palette.id, nom, hexa })));
    assert.equal(attendus.length, 88);
    assert.deepEqual(issue.peints, attendus, profil);
  }
});

test('L6.14 : le dessin relit la peinture que Figma garde, pas celle que le modèle demande', async () => {
  const figma = new FauxFigma();
  // Un Figma qui perdrait le rouge de chaque peinture pleine.
  figma.garderLaPeinture = (peinture) => (peinture as { type: string; color: { r: number; g: number; b: number } }[])
    .map((plein) => ({ ...plein, color: { ...plein.color, r: 0 } }));
  const issue = await dessiner(figma, [AMBRE]);
  assert.ok(issue.issue === 'dessinee');
  assert.equal(issue.peints.length, 44);
  assert.deepEqual(issue.peints.filter(({ hexa }) => !hexa.startsWith('#00')), []);
});

test('[PLA-03] V8.6 : un cadre rangé dans une section est redessiné dans la section, à son rang, sans doublon', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU, AMBRE]);
  const page = figma.page('Palettes');
  const section = figma.section(page);
  const [bleu] = cadres(figma);
  const note = figma.createFrame();
  note.name = 'Note';
  section.appendChild(bleu);
  section.appendChild(note);
  bleu.x = 48;
  bleu.y = 64;

  assert.equal((await dessiner(figma, [BLEU])).issue, 'dessinee');
  const [neuf] = section.enfants;
  assert.equal(bleu.removed, true);
  assert.deepEqual(section.enfants.map((enfant) => enfant.name), ['Bleu', 'Note']);
  assert.deepEqual([neuf.x, neuf.y], [48, 64]);
  assert.equal(page.enfants.filter((enfant) => enfant.getSharedPluginData('ucm_palettes', 'cadre') === BLEU.id).length, 0, 'aucun doublon au premier niveau');
  assert.equal(lirePlanche(figma.root).cadres[BLEU.id], neuf.id);
});

test('[PLA-26] V8.6 : un cadre déplacé sur une autre page y est redessiné, et les cadres neufs vont sur la planche', async () => {
  const figma = new FauxFigma(['Page 1', 'Archives']);
  await dessiner(figma, [BLEU]);
  const archives = figma.page('Archives');
  const [bleu] = cadres(figma);
  archives.appendChild(bleu);
  archives.charge = false;

  await dessiner(figma, [BLEU, AMBRE]);
  assert.deepEqual(archives.enfants.map((enfant) => enfant.name), ['Bleu']);
  assert.deepEqual(cadres(figma).map((enfant) => enfant.name), ['Ambre']);
  assert.deepEqual([cadres(figma)[0].x, cadres(figma)[0].y], [0, 0], 'un cadre d’une autre page ne décale pas le premier cadre de la planche');
  assert.deepEqual(lirePlanche(figma.root), { version: 2, page: figma.page('Palettes').id, cadres: { [BLEU.id]: archives.enfants[0].id, [AMBRE.id]: cadres(figma)[0].id } });
});

test('[PLA-03] V8.6 : le cadre neuf prend la transformation de l’ancien ; dans un auto layout, son rang et sa position', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU, AMBRE]);
  const [bleu, ambre] = cadres(figma);
  bleu.lineaire = [[0, -1], [1, 0]];
  bleu.x = 300;
  await dessiner(figma, [BLEU]);
  const tourne = cadres(figma).find((cadre) => cadre.name === 'Bleu')!;
  assert.deepEqual(tourne.relativeTransform, [[0, -1, 300], [1, 0, 0]]);

  // Un cadre du designer en auto layout, où Ambre est le deuxième enfant et Bleu en position absolue.
  const pile = figma.createFrame();
  pile.layoutMode = 'VERTICAL';
  figma.page('Palettes').appendChild(pile);
  const tete = figma.createFrame();
  pile.appendChild(tete);
  pile.appendChild(ambre);
  pile.appendChild(tourne);
  tourne.layoutPositioning = 'ABSOLUTE';
  ambre.x = 999;
  await dessiner(figma, [BLEU, AMBRE]);
  const [, ambreNeuf, bleuNeuf] = pile.enfants;
  assert.deepEqual([ambreNeuf.name, bleuNeuf.name], ['Ambre', 'Bleu']);
  assert.equal(ambreNeuf.layoutPositioning, 'AUTO');
  assert.equal(ambreNeuf.x, 0, 'dans le flux, le rang place le cadre');
  assert.equal(bleuNeuf.layoutPositioning, 'ABSOLUTE');
  assert.deepEqual(bleuNeuf.relativeTransform, [[0, -1, 300], [1, 0, 0]]);
});

test('[PLA-04] V8.6 : un cadre que Figma refuse de lire arrête le dessin avant tout calque, et son entrée reste rangée', async () => {
  const figma = new FauxFigma(['Page 1', 'Archives']);
  await dessiner(figma, [BLEU]);
  const [bleu] = cadres(figma);
  // Hors de la page de la planche, la recherche de secours ne le lit pas.
  figma.page('Archives').appendChild(bleu);
  figma.illisibles.add(bleu.id);
  const avant = figma.journal.length;
  assert.deepEqual(await dessiner(figma, [BLEU, AMBRE]), { issue: 'lecture-impossible', palettes: [BLEU.id] });
  assert.deepEqual(creations({ journal: figma.journal.slice(avant) } as FauxFigma), []);

  assert.equal((await dessiner(figma, [AMBRE])).issue, 'dessinee');
  assert.equal(lirePlanche(figma.root).cadres[BLEU.id], bleu.id, 'l’entrée illisible survit au dessin d’une autre palette');
});

test('[PLA-25] V8.6 : un cadre coupé puis collé est une copie : il n’est pas réécrit, et la palette reçoit un cadre neuf', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const [bleu] = cadres(figma);
  const collee = figma.createFrame();
  figma.page('Palettes').appendChild(collee);
  collee.name = 'Bleu';
  for (const cle of ['cadre', 'proprietaire', 'empreinte', 'grille']) collee.setSharedPluginData('ucm_palettes', cle, bleu.getSharedPluginData('ucm_palettes', cle));
  bleu.remove();

  await dessiner(figma, [BLEU]);
  assert.equal(collee.removed, false);
  const neuf = cadres(figma).find((cadre) => cadre !== collee)!;
  assert.equal(neuf.getSharedPluginData('ucm_palettes', 'proprietaire'), neuf.id);
  assert.equal(lirePlanche(figma.root).cadres[BLEU.id], neuf.id);
});

test('[PLA-01] V8.8 : un suivi sans version se lit comme la version 1 ; un suivi plus récent refuse le dessin avant tout calque', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const [bleu] = cadres(figma);
  const page = figma.page('Palettes');
  figma.root.setSharedPluginData('ucm_palettes', 'planche', JSON.stringify({ page: page.id, cadres: { [BLEU.id]: bleu.id } }));
  assert.equal(lirePlanche(figma.root).version, 1);
  await dessiner(figma, [BLEU]);
  assert.equal(cadres(figma).length, 1, 'le cadre de la version 1 est remplacé, pas doublé');
  assert.equal(lirePlanche(figma.root).version, 2);

  figma.root.setSharedPluginData('ucm_palettes', 'planche', JSON.stringify({ version: 3, page: page.id, cadres: {} }));
  const avant = figma.journal.length;
  assert.deepEqual(await dessiner(figma, [BLEU]), { issue: 'suivi-futur' });
  assert.deepEqual(creations({ journal: figma.journal.slice(avant) } as FauxFigma), []);
});

test('V10.4 V10.8 W5.1 : le filet d’un thème se pose en contour intérieur, un filet remplit la largeur de son parent, les alignements et les marges latérales suivent le modèle, chaque style prend sa police', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const [cadre] = cadres(figma);
  const tous = figma.sous(cadre) as unknown as {
    name: string; parent: unknown; strokes: unknown[]; strokeAlign: string; dashPattern: number[]; layoutSizingHorizontal: string;
    primaryAxisAlignItems: string; counterAxisAlignItems: string; paddingLeft: number; paddingTop: number; fontName: { style: string }; fontSize: number;
  }[];
  const nomme = (nom: string) => tous.find((noeud) => noeud.name === nom)!;
  const theme = nomme('thème light');
  assert.equal(theme.strokes.length, 1);
  assert.equal(theme.strokeAlign, 'INSIDE');
  assert.deepEqual(theme.dashPattern, []);
  assert.equal(nomme('filet').layoutSizingHorizontal, 'FILL');
  const enTete = tous.find((noeud) => noeud.name === 'en-tête' && noeud.parent === theme)!;
  assert.deepEqual([enTete.primaryAxisAlignItems, enTete.counterAxisAlignItems], ['SPACE_BETWEEN', 'CENTER']);
  const verdict = nomme('verdict');
  assert.deepEqual([verdict.paddingLeft, verdict.paddingTop], [8, 0]);
  const rampes = nomme('les deux rampes');
  const titre = tous.find((noeud) => noeud.name === 'titre' && noeud.parent === rampes)!;
  assert.deepEqual([titre.fontName.style, titre.fontSize], ['Semi Bold', 16]);
});
test('V8.2 : un cadre introuvable garde son entrée quand une autre palette est dessinée ; il n’est pas « jamais dessiné »', async () => {
  const figma = new FauxFigma();
  await dessiner(figma, [BLEU]);
  const [bleu] = cadres(figma);
  const disparu = bleu.id;
  bleu.remove();
  await dessiner(figma, [AMBRE]);
  assert.equal(lirePlanche(figma.root).cadres[BLEU.id], disparu);
  await dessiner(figma, [BLEU]);
  assert.notEqual(lirePlanche(figma.root).cadres[BLEU.id], disparu, 'redessiner la palette remplace l’entrée');
});

test('[PLA-04] un dessin qui ne remplace que des cadres rangés ailleurs, ou qui s’arrête avant tout calque, ne crée pas de page vide', async () => {
  const figma = new FauxFigma(['Page 1', 'Archives']);
  await dessiner(figma, [BLEU]);
  const [bleu] = cadres(figma);
  figma.page('Archives').appendChild(bleu);
  figma.page('Palettes').remove();
  const issue = await dessiner(figma, [BLEU]);
  assert.equal(issue.issue, 'dessinee');
  assert.ok(issue.issue === 'dessinee' && issue.page === figma.page('Archives').id);
  assert.deepEqual(figma.root.enfants.filter((page) => !page.removed).map((page) => page.name), ['Page 1', 'Archives']);

  const note = figma.createFrame();
  note.name = 'Note';
  figma.page('Archives').enfants[0].appendChild(note);
  assert.equal((await dessiner(figma, [BLEU])).issue, 'etrangers');
  assert.deepEqual(figma.root.enfants.filter((page) => !page.removed).map((page) => page.name), ['Page 1', 'Archives']);
});
