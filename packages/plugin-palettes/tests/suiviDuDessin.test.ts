/** Le suivi d'un dessin : la reprise d'une génération interrompue (V8.4). */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { PluginMessage } from '../src/messages';
import type { Frontiere } from '../src/ui/frontiere';
import { createSuiviDuDessin } from '../src/ui/dessin';
import { dessinInterrompu } from '../src/ui/textes';

const NOMS = { a: 'Bleu', b: 'Ambre', c: 'Vert' };

/** Un suivi branché sur une frontière qui note chaque dessin demandé et accepte chaque réponse. */
function banc() {
  const demandes: (readonly string[])[] = [];
  const frontiere = {
    dessiner: ({ palettes }: { palettes: readonly string[] }) => demandes.push(palettes),
    accepterDessin: () => true,
  } as unknown as Frontiere;
  const suivi = createSuiviDuDessin(frontiere, () => {}, () => []);
  const interrompre = (palette: string) =>
    suivi.recevoir({ type: 'dessin', demande: 1, resultat: { issue: 'interrompue', palette, message: 'refus', dessines: 0 } } as Extract<PluginMessage, { type: 'dessin' }>);
  return { suivi, demandes, interrompre };
}

test('[PLA-24] V8.4 : « Réessayer » reprend une génération interrompue à la palette fautive', () => {
  const { suivi, demandes, interrompre } = banc();
  suivi.dessiner(['a', 'b', 'c'], true, NOMS);
  interrompre('b');
  const fini = suivi.etat();
  assert.ok(fini.phase === 'fini');
  assert.deepEqual(fini.demandees, ['a', 'b', 'c'], 'le résultat garde les palettes demandées, pour les nommer');
  suivi.reessayer();
  assert.deepEqual(demandes, [['a', 'b', 'c'], ['b', 'c']]);
});

test('[PLA-24] V8.4 : interrompue à la première palette, la génération reprend entière', () => {
  const { suivi, demandes, interrompre } = banc();
  suivi.dessiner(['a', 'b', 'c'], true, NOMS);
  interrompre('a');
  suivi.reessayer();
  assert.deepEqual(demandes, [['a', 'b', 'c'], ['a', 'b', 'c']]);
});

test('[PLA-24] V8.4 : une génération partielle nomme la palette conservée et celle qui attend', () => {
  const partielle = dessinInterrompu('Ambre', 'refus', ['Bleu'], ['Vert']);
  assert.match(partielle.quoi, /celle de « Bleu » est conservée/);
  assert.match(partielle.quoi, /« Vert » n’a pas encore été générée/);
  assert.equal(partielle.geste, 'Réessayez : la génération reprend à cette palette.');
  assert.equal(dessinInterrompu('Bleu', 'refus').geste, 'Réessayez de générer la palette.');
});
