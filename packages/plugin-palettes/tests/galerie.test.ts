/** L'inventaire des états de la galerie ne vieillit pas en silence. La loi est celle du socle. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  ecartsDesMessages,
  fautesDAttente,
  fautesDeScenario,
  fautesDIdentite,
  scriptsQuiNeCompilentPas,
  typesDeLUnion,
  variablesAbsentesDuDecalque,
  type EtatDeGalerie,
} from 'ucm-plugin-socle/lois/galerie';
import { feuilleDuSocle } from 'ucm-plugin-socle/lois/styles';

const racine = path.resolve(__dirname, '..');
const { ETATS } = require('../galerie/etats.cjs') as { ETATS: EtatDeGalerie[] };

test('chaque état porte son identité et sa situation', () => {
  assert.deepEqual(fautesDIdentite(ETATS), []);
});

test('un état absent nomme la case du plan qui le créera', () => {
  // `L6.14` est une case du plan de développement, `R4.7` une case du premier
  // plan d'ergonomie, `V4.2` une case du second, `W2.2` une case du troisième.
  assert.deepEqual(fautesDAttente(ETATS, /^(L\d+[a-z]?|R\d+b?|V\d+|W\d+)\.\d+$/), []);
});

test('un état atteignable dit ce qu’on regarde, et chaque étape porte un seul geste', () => {
  assert.deepEqual(fautesDeScenario(ETATS), []);
});

test('tout message que le sandbox peut envoyer a un état où le regarder', () => {
  const declares = typesDeLUnion(fs.readFileSync(path.join(racine, 'src', 'messages.ts'), 'utf8'), 'PluginMessage');
  assert.ok(declares.size > 0);
  assert.deepEqual(ecartsDesMessages(declares, ETATS), { jamaisRegardes: [], inventes: [] });
});

test('le décalque sert toutes les variables de thème que les feuilles demandent', () => {
  const feuilles = feuilleDuSocle() + fs.readFileSync(path.join(racine, 'src', 'ui', 'styles.css'), 'utf8');
  assert.deepEqual(variablesAbsentesDuDecalque(feuilles), []);
});

test('chaque script de la galerie se compile', () => {
  const dossier = path.join(racine, 'galerie');
  assert.ok(fs.readdirSync(dossier).includes('capturer.cjs'), 'capturer.cjs a quitté la galerie');
  assert.deepEqual(scriptsQuiNeCompilentPas(dossier), []);
});
