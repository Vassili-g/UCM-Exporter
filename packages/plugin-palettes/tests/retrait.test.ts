/** « Supprimer définitivement » le cadre d'une palette supprimée, contre un double de Figma ([PLA-27]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonCanonique, recetteParDefaut, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette, supprimer } from '../src/edition';
import { dessinerLaPlanche, retirerLeCadre } from '../src/ecriture/planche';
import { lirePlanche } from '../src/lecture';
import { createFrontiere } from '../src/ui/frontiere';
import type { UiRequest } from '../src/messages';
import { FauxFigma } from './figmaDeTest';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9')!, nom: 'Bleu' };
const AMBRE = { ...nouvellePalette(VIDE, 'p-0000000b', '#F2A900')!, nom: 'Ambre' };
const RECETTE: Recette = [BLEU, AMBRE].reduce(ajouter, VIDE);

/** Bleu et Ambre dessinés, puis Ambre supprimée de la recette rangée : son cadre reste dans Figma. */
async function ambreSupprimee(): Promise<{ figma: FauxFigma; bleu: string; ambre: string }> {
  const figma = new FauxFigma();
  await dessinerLaPlanche(figma.api(), { recette: RECETTE, profil: 'SRGB', palettes: [BLEU, AMBRE], grille: true });
  const { cadres } = lirePlanche(figma.root);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(supprimer(RECETTE, AMBRE.id)));
  figma.journal.length = 0;
  return { figma, bleu: cadres[BLEU.id], ambre: cadres[AMBRE.id] };
}

const retirer = (figma: FauxFigma, cadre: string, palette = AMBRE.id) => retirerLeCadre(figma.api(), { palette, cadre });

test('[PLA-27] le cadre et son entrée du suivi partent ensemble, et un seul commitUndo clôt l’écriture', async () => {
  const { figma, bleu, ambre } = await ambreSupprimee();
  assert.deepEqual(await retirer(figma, ambre), { issue: 'retire' });
  assert.equal(figma.registre.get(ambre)!.removed, true);
  assert.deepEqual(lirePlanche(figma.root).cadres, { [BLEU.id]: bleu });
  assert.deepEqual(figma.journal.filter((ligne) => ligne === 'commitUndo' || ligne.startsWith('retirer')), ['retirer Ambre', 'commitUndo']);
});

test('[PLA-27] un cadre déjà disparu fait seulement oublier son entrée, sans erreur', async () => {
  const { figma, bleu, ambre } = await ambreSupprimee();
  figma.registre.get(ambre)!.remove();
  figma.journal.length = 0;
  assert.deepEqual(await retirer(figma, ambre), { issue: 'deja-absent' });
  assert.deepEqual(lirePlanche(figma.root).cadres, { [BLEU.id]: bleu });
  assert.deepEqual(figma.journal, ['commitUndo']);
});

test('[PLA-27] un cadre absent et sans entrée ne donne lieu à aucune écriture', async () => {
  const { figma, ambre } = await ambreSupprimee();
  await retirer(figma, ambre);
  figma.journal.length = 0;
  assert.deepEqual(await retirer(figma, ambre), { issue: 'deja-absent' });
  assert.deepEqual(figma.journal, []);
});

test('[PLA-27] rien ne s’écrit quand la recette rangée contient de nouveau la palette', async () => {
  const { figma, ambre } = await ambreSupprimee();
  figma.root.setSharedPluginData('ucm_palettes', 'recette', jsonCanonique(RECETTE));
  assert.deepEqual(await retirer(figma, ambre), { issue: 'refuse' });
  assert.equal(figma.registre.get(ambre)!.removed, false);
  assert.equal(lirePlanche(figma.root).cadres[AMBRE.id], ambre);
  assert.deepEqual(figma.journal, []);
});

test('[PLA-27] [PLA-25] une copie, un cadre d’une autre palette ou un cadre illisible ne se retirent pas', async () => {
  const { figma, bleu, ambre } = await ambreSupprimee();
  figma.registre.get(ambre)!.setSharedPluginData('ucm_palettes', 'proprietaire', 'n:0');
  assert.deepEqual(await retirer(figma, ambre), { issue: 'refuse' }, 'une copie');
  assert.deepEqual(await retirer(figma, bleu), { issue: 'refuse' }, 'le cadre d’une autre palette');
  figma.illisibles.add(ambre);
  assert.deepEqual(await retirer(figma, ambre), { issue: 'refuse' }, 'un cadre que Figma refuse de lire');
  assert.deepEqual(figma.journal, []);
});

test('[PLA-27] un suivi plus récent ou une recette illisible refusent avant toute écriture', async () => {
  const futur = await ambreSupprimee();
  futur.figma.root.setSharedPluginData('ucm_palettes', 'planche', JSON.stringify({ version: 99, page: null, cadres: {} }));
  assert.deepEqual(await retirer(futur.figma, futur.ambre), { issue: 'suivi-futur' });
  const illisible = await ambreSupprimee();
  illisible.figma.root.setSharedPluginData('ucm_palettes', 'recette', '{');
  assert.deepEqual(await retirer(illisible.figma, illisible.ambre), { issue: 'refuse' });
  assert.deepEqual([...futur.figma.journal, ...illisible.figma.journal], []);
});

test('[PLA-27] V12.1 : pendant un conflit d’enregistrement, aucun retrait ne part', () => {
  const envoyees: UiRequest[] = [];
  const frontiere = createFrontiere((demande) => envoyees.push(demande));
  frontiere.ranger(RECETTE);
  frontiere.recevoirRangement({ type: 'rangement', demande: 1, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  assert.equal(frontiere.retirer(AMBRE.id, '1:2'), false);
  assert.deepEqual(envoyees.map((demande) => demande.type), ['ranger-recette']);
});

test('[PLA-27] un retrait numérote sa demande, et rend caduc un état demandé avant lui', () => {
  const envoyees: UiRequest[] = [];
  const frontiere = createFrontiere((demande) => envoyees.push(demande));
  frontiere.lireLEtat();
  assert.equal(frontiere.retirer(AMBRE.id, '1:2'), true);
  assert.deepEqual(envoyees.at(-1), { type: 'retirer-cadre', demande: 2, palette: AMBRE.id, cadre: '1:2' });
  assert.equal(frontiere.accepterRetrait({ type: 'retrait', demande: 2, issue: { issue: 'retire' } }), true);
  assert.equal(frontiere.accepterRetrait({ type: 'retrait', demande: 1, issue: { issue: 'retire' } }), false);
  const etat = { type: 'etat', demande: 1, classement: { etat: 'absente' }, texte: '', empreinte: null, profil: 'SRGB', planche: { page: null, nomDeLaPage: null, cadres: [], manquants: [], recherche: 'page', suiviFutur: false } } as const;
  assert.equal(frontiere.accepterEtat(etat as never), false);
});
