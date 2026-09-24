/** La lecture de la planche, sa fraîcheur et les écarts de peinture ([PLA-01], [PLA-19], [PLA-20], [PLA-25], [ENT-03], L6.14). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { dessinerLaPlanche } from '../src/ecriture/planche';
import { lireLaPlanche } from '../src/lecture';
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
  assert.deepEqual(planche, {
    page: page.id,
    cadres: [
      { palette: BLEU.id, cadre: bleu.id, nom: 'Bleu', empreinte: modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).empreinte, grille: true, possede: true },
      { palette: AMBRE.id, cadre: ambre.id, nom: 'Ambre', empreinte: modeleDeCadre(RECETTE, AMBRE, 'SRGB').empreinte, grille: false, possede: true },
      { palette: BLEU.id, cadre: copie.id, nom: 'Bleu copie', empreinte: bleu.getSharedPluginData('ucm_palettes', 'empreinte'), grille: true, possede: false },
    ],
  });
});

test('[PLA-04] sans planche rangée, ou quand sa page a disparu, la planche est vide', async () => {
  assert.deepEqual(await lireLaPlanche(new FauxFigma().api()), { page: null, cadres: [] });
  const figma = await plancheDessinee();
  figma.page('Palettes').remove();
  assert.deepEqual(await lireLaPlanche(figma.api()), { page: null, cadres: [] });
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

test('[ENT-03] [PLA-25] le cadre d’une palette supprimée est orphelin ; une copie n’est jamais comptée comme cadre de sa palette', async () => {
  const figma = await plancheDessinee();
  const [bleu, ambre] = figma.page('Palettes').enfants;
  const copieDeBleu = copierLeCadre(figma, bleu);
  const copieDAmbre = copierLeCadre(figma, ambre);
  bleu.remove();
  const sansAmbre: Recette = { ...RECETTE, palettes: RECETTE.palettes.filter((palette) => palette.id !== AMBRE.id) };
  const fraicheur = fraicheurDeLaPlanche(sansAmbre, 'SRGB', await lireLaPlanche(figma.api()));
  assert.deepEqual(etats(fraicheur), [`${BLEU.id} jamais-dessinee`, `${VERT.id} jamais-dessinee`]);
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
