/** La lecture de la planche, sa fraîcheur et les écarts de peinture ([PLA-01], [PLA-19], [PLA-20], [PLA-25], [ENT-03], [PLA-26], L6.14, V8.2, V8.6, V8.8). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { dessinerLaPlanche } from '../src/ecriture/planche';
import { PLANCHE_SANS_CADRE, lireLaPlanche } from '../src/lecture';
import { fraicheurDeLaPlanche } from '../src/planche/fraicheur';
import { modeleDeCadre } from '../src/planche/modele';
import { ecartsDePeinture } from '../src/planche/peints';
import { FauxFigma } from './figmaDeTest';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9')!, nom: 'Bleu' };
const AMBRE = { ...nouvellePalette(VIDE, 'p-0000000b', '#F2A900')!, nom: 'Ambre' };
const VERT = { ...nouvellePalette(VIDE, 'p-0000000c', '#16A34A')!, nom: 'Vert' };
const RECETTE: Recette = [BLEU, AMBRE, VERT].reduce(ajouter, VIDE);

/** Bleu dessiné avec la grille, Ambre sans, Vert jamais. */
async function plancheDessinee(): Promise<FauxFigma> {
  const figma = new FauxFigma();
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU], grille: true });
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [AMBRE], grille: false });
  return figma;
}

/** Une copie du cadre de Bleu, comme Figma la fait : les données de plugin suivent, l'identifiant change. */
function copierLeCadre(figma: FauxFigma, source: ReturnType<FauxFigma['page']>['enfants'][number]): ReturnType<FauxFigma['createFrame']> {
  const copie = figma.createFrame();
  figma.page('Palettes').appendChild(copie);
  copie.name = `${source.name} copie`;
  for (const cle of ['cadre', 'proprietaire', 'empreinte', 'grille']) copie.setSharedPluginData('ucm_palettes', cle, source.getSharedPluginData('ucm_palettes', cle));
  return copie;
}

test('[PLA-01] la lecture charge la seule page de la planche et relève ses cadres de palette, copies comprises', async () => {
  const figma = await plancheDessinee();
  const page = figma.page('Palettes');
  const [bleu, ambre] = page.enfants;
  const copie = copierLeCadre(figma, bleu);
  const libre = figma.createFrame();
  libre.name = 'Notes du designer';
  page.appendChild(libre);
  page.charge = false;

  const planche = await lireLaPlanche(figma.api());
  assert.equal(page.charge, true);
  assert.equal((figma.root.enfants[0] as unknown as { charge: boolean }).charge, false, 'aucune autre page ne se charge');
  const sur = { page: page.id, nomDeLaPage: 'Palettes' };
  assert.deepEqual(planche, {
    page: page.id,
    nomDeLaPage: 'Palettes',
    cadres: [
      { palette: BLEU.id, cadre: bleu.id, nom: 'Bleu', ...sur, empreinte: modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).empreinte, grille: true, possede: true },
      { palette: AMBRE.id, cadre: ambre.id, nom: 'Ambre', ...sur, empreinte: modeleDeCadre(RECETTE, AMBRE, 'SRGB').empreinte, grille: false, possede: true },
      { palette: BLEU.id, cadre: copie.id, nom: 'Bleu copie', ...sur, empreinte: bleu.getSharedPluginData('ucm_palettes', 'empreinte'), grille: true, possede: false },
    ],
    manquants: [],
    recherche: 'page',
    suiviFutur: false,
  });
});

test('[PLA-04] sans planche rangée, la planche est vide ; quand sa page a disparu, ses cadres sont introuvables', async () => {
  assert.deepEqual(await lireLaPlanche(new FauxFigma().api()), PLANCHE_SANS_CADRE);
  const figma = await plancheDessinee();
  const [bleu, ambre] = figma.page('Palettes').enfants;
  figma.page('Palettes').remove();
  assert.deepEqual(await lireLaPlanche(figma.api()), {
    ...PLANCHE_SANS_CADRE,
    manquants: [{ palette: BLEU.id, cadre: bleu.id, raison: 'introuvable' }, { palette: AMBRE.id, cadre: ambre.id, raison: 'introuvable' }],
  });
});

test('[PLA-26] V8.6 : un cadre rangé dans une section, ou déplacé sur une autre page, se retrouve par son identifiant', async () => {
  const figma = new FauxFigma(['Page 1', 'Archives']);
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU, AMBRE], grille: true });
  const page = figma.page('Palettes');
  const [bleu, ambre] = page.enfants;
  figma.section(page).appendChild(bleu);
  const archives = figma.page('Archives');
  archives.appendChild(ambre);
  archives.charge = false;

  const planche = await lireLaPlanche(figma.api());
  assert.equal(archives.charge, true, 'la page qui porte un cadre se charge avant sa lecture');
  assert.deepEqual(planche.cadres.map(({ cadre, page: sienne, nomDeLaPage, possede }) => [cadre, sienne, nomDeLaPage, possede]), [
    [bleu.id, page.id, 'Palettes', true],
    [ambre.id, archives.id, 'Archives', true],
  ]);
  assert.deepEqual(planche.manquants, []);
  assert.deepEqual(etats(fraicheurDeLaPlanche(RECETTE, 'SRGB', planche)), [`${BLEU.id} a-jour`, `${AMBRE.id} a-jour`, `${VERT.id} jamais-dessinee`]);
});

test('[PLA-26] V8.6 : la recherche de secours reste sur la page de la planche ; au geste du designer, elle parcourt tout le fichier', async () => {
  const figma = new FauxFigma(['Page 1', 'Archives']);
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU], grille: true });
  const [bleu] = figma.page('Palettes').enfants;
  // Coupé puis collé : Figma donne un nouvel identifiant, et le marqueur de propriété ne le désigne plus.
  const archives = figma.page('Archives');
  const collee = copierLeCadre(figma, bleu);
  archives.appendChild(collee);
  bleu.remove();
  archives.charge = false;

  const bornee = await lireLaPlanche(figma.api());
  assert.equal(archives.charge, false);
  assert.equal(bornee.recherche, 'page');
  assert.deepEqual(bornee.cadres, []);
  assert.deepEqual(bornee.manquants, [{ palette: BLEU.id, cadre: bleu.id, raison: 'introuvable' }]);

  const etendue = await lireLaPlanche(figma.api(), true);
  assert.equal(etendue.recherche, 'fichier');
  assert.deepEqual(etendue.cadres.map(({ cadre, nomDeLaPage, possede }) => [cadre, nomDeLaPage, possede]), [[collee.id, 'Archives', false]]);
  assert.deepEqual(etats(fraicheurDeLaPlanche(RECETTE, 'SRGB', etendue)), [`${BLEU.id} introuvable`, `${AMBRE.id} jamais-dessinee`, `${VERT.id} jamais-dessinee`]);
});

test('[PLA-04] V8.2 : un cadre que Figma refuse de lire est illisible, pas « jamais généré »', async () => {
  const figma = new FauxFigma(['Page 1', 'Archives']);
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU, AMBRE], grille: false });
  const [bleu] = figma.page('Palettes').enfants;
  figma.page('Archives').appendChild(bleu);
  figma.illisibles.add(bleu.id);
  const planche = await lireLaPlanche(figma.api());
  assert.deepEqual(planche.manquants, [{ palette: BLEU.id, cadre: bleu.id, raison: 'illisible' }]);
  assert.deepEqual(etats(fraicheurDeLaPlanche(RECETTE, 'SRGB', planche)), [`${BLEU.id} illisible`, `${AMBRE.id} perimee`, `${VERT.id} jamais-dessinee`]);
});

test('[PLA-26] V8.6 : un cadre illisible par son identifiant, que la recherche de la page lit, est le cadre de sa palette', async () => {
  const figma = await plancheDessinee();
  const [bleu] = figma.page('Palettes').enfants;
  figma.illisibles.add(bleu.id);
  const planche = await lireLaPlanche(figma.api());
  assert.deepEqual(planche.manquants, []);
  assert.deepEqual(etats(fraicheurDeLaPlanche(RECETTE, 'SRGB', planche)), [`${BLEU.id} a-jour`, `${AMBRE.id} perimee`, `${VERT.id} jamais-dessinee`]);
});

test('[PLA-26] V8.6 : un nœud qui lève pendant la recherche de secours ne fait pas échouer la lecture', async () => {
  const figma = await plancheDessinee();
  const [bleu] = figma.page('Palettes').enfants;
  const piege = copierLeCadre(figma, bleu);
  piege.getSharedPluginData = () => {
    throw new Error('nœud annoncé, plus servi');
  };
  const planche = await lireLaPlanche(figma.api());
  assert.deepEqual(planche.cadres.map(({ cadre }) => cadre), [bleu.id, figma.page('Palettes').enfants[1].id]);
});

test('[PLA-01] V8.8 : un suivi des cadres d’une version plus récente ne se lit pas', async () => {
  const figma = await plancheDessinee();
  figma.root.setSharedPluginData('ucm_palettes', 'planche', JSON.stringify({ version: 3, page: figma.page('Palettes').id, cadres: {} }));
  assert.deepEqual(await lireLaPlanche(figma.api()), { ...PLANCHE_SANS_CADRE, suiviFutur: true });
});

const etats = (fraicheur: ReturnType<typeof fraicheurDeLaPlanche>) => fraicheur.palettes.map(({ palette, etat }) => `${palette} ${etat}`);

test('[PLA-20] un cadre dessiné avec la grille est à jour tant que son modèle ne change pas ; sans elle, il est à mettre à jour', async () => {
  const planche = await lireLaPlanche((await plancheDessinee()).api());
  assert.deepEqual(etats(fraicheurDeLaPlanche(RECETTE, 'SRGB', planche)), [`${BLEU.id} a-jour`, `${AMBRE.id} perimee`, `${VERT.id} jamais-dessinee`]);
});

test('[PLA-20] renommer Bleu périme son cadre à jour ; changer le profil du document les périme tous', async () => {
  const planche = await lireLaPlanche((await plancheDessinee()).api());
  const renommee: Recette = { ...RECETTE, palettes: RECETTE.palettes.map((palette): Palette => (palette.id === BLEU.id ? { ...palette, nom: 'Bleu roi' } : palette)) };
  assert.deepEqual(etats(fraicheurDeLaPlanche(renommee, 'SRGB', planche)), [`${BLEU.id} perimee`, `${AMBRE.id} perimee`, `${VERT.id} jamais-dessinee`]);
  assert.deepEqual(etats(fraicheurDeLaPlanche(RECETTE, 'DISPLAY_P3', planche)), [`${BLEU.id} perimee`, `${AMBRE.id} perimee`, `${VERT.id} jamais-dessinee`]);
});

test('[ENT-03] [PLA-25] le cadre d’une palette supprimée est orphelin ; une copie n’est jamais comptée comme cadre de sa palette, dont le cadre supprimé est introuvable', async () => {
  const figma = await plancheDessinee();
  const [bleu, ambre] = figma.page('Palettes').enfants;
  const copieDeBleu = copierLeCadre(figma, bleu);
  const copieDAmbre = copierLeCadre(figma, ambre);
  bleu.remove();
  const sansAmbre: Recette = { ...RECETTE, palettes: RECETTE.palettes.filter((palette) => palette.id !== AMBRE.id) };
  const fraicheur = fraicheurDeLaPlanche(sansAmbre, 'SRGB', await lireLaPlanche(figma.api()));
  assert.deepEqual(etats(fraicheur), [`${BLEU.id} introuvable`, `${VERT.id} jamais-dessinee`]);
  assert.deepEqual(fraicheur.orphelins.map(({ cadre }) => cadre), [ambre.id], 'la copie d’un cadre orphelin reste une copie');
  assert.deepEqual(fraicheur.copies.map(({ cadre }) => cadre), [copieDeBleu.id, copieDAmbre.id]);
});

test('L6.14 : les couleurs relues d’un dessin n’ont aucun écart avec l’aperçu ; une couleur changée en a un', async () => {
  const figma = new FauxFigma();
  const issue = await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU, AMBRE], grille: false });
  assert.ok(issue.issue === 'dessinee');
  assert.deepEqual(ecartsDePeinture(RECETTE, issue.peints), []);

  const [premiere, ...autres] = issue.peints;
  const faussee = [{ ...premiere, hexa: '#000000' }, ...autres, { palette: 'p-ffffffff', nom: 'vivid/light/700', hexa: '#123456' }];
  assert.deepEqual(ecartsDePeinture(RECETTE, faussee), [
    { palette: premiere.palette, nom: premiere.nom, apercu: premiere.hexa, peint: '#000000' },
    { palette: 'p-ffffffff', nom: 'vivid/light/700', apercu: null, peint: '#123456' },
  ]);
});
