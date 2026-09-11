/**
 * La version du format de tokens : où elle se lit, et les quatre états qu'elle
 * donne à un fichier.
 *
 * `etatDuFormatDeTokens` est l'unique lecture de la marque. Le contrôle du
 * repository l'appelle avant de lire un seul token, et le plugin l'appelle pour
 * annoncer la version dans la pull request : deux lectures de la même marque
 * divergeraient sans que rien ne le dise.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXTENSION_VERSION_TOKENS,
  TOKENS_FORMAT_VERSION,
  etatDuFormatDeTokens,
} from '../src/format/tokens';
import type { DocumentDeTokens, GroupeDeTokens } from '../src/format/tokens';
import * as porte from '@ucm-kit/core/format';

const avecMarque = (valeur: unknown) => ({ $extensions: { [EXTENSION_VERSION_TOKENS]: valeur }, a: {} });

test('la version courante est 1, et sa marque vit sous com.ucm.formatVersion', () => {
  assert.equal(TOKENS_FORMAT_VERSION, 1);
  assert.equal(EXTENSION_VERSION_TOKENS, 'com.ucm.formatVersion');
});

test('un fichier sans marque est dans la forme d’origine', () => {
  assert.deepEqual(etatDuFormatDeTokens({}), { etat: 'origine' });
  assert.deepEqual(etatDuFormatDeTokens({ couleurs: { rouge: { $value: '#ff0000', $type: 'color' } } }), {
    etat: 'origine',
  });
  // Une autre extension de document ne porte pas de version.
  assert.deepEqual(etatDuFormatDeTokens({ $extensions: { 'com.figma': { fichier: 'x' } } }), {
    etat: 'origine',
  });
});

test('la marque 1 est la version courante', () => {
  assert.deepEqual(etatDuFormatDeTokens(avecMarque(1)), { etat: 'courante', version: 1 });
  assert.deepEqual(etatDuFormatDeTokens(avecMarque(TOKENS_FORMAT_VERSION)), {
    etat: 'courante',
    version: TOKENS_FORMAT_VERSION,
  });
});

test('un entier supérieur est une version future, jamais présumée lisible', () => {
  assert.deepEqual(etatDuFormatDeTokens(avecMarque(2)), { etat: 'future', version: 2 });
  assert.deepEqual(etatDuFormatDeTokens(avecMarque(40)), { etat: 'future', version: 40 });
});

test('toute autre marque est invalide, et sa valeur est rendue telle quelle', () => {
  for (const valeur of [0, -1, 1.5, '1', 'un', { version: 1 }, [1], true, null]) {
    assert.deepEqual(etatDuFormatDeTokens(avecMarque(valeur)), { etat: 'invalide', valeur }, String(valeur));
  }
});

test('des $extensions qui ne sont pas un objet rendent le fichier invalide', () => {
  for (const extensions of [null, 1, 'com.ucm.formatVersion', [{ 'com.ucm.formatVersion': 1 }]]) {
    assert.deepEqual(etatDuFormatDeTokens({ $extensions: extensions }), {
      etat: 'invalide',
      valeur: extensions,
    });
  }
});

test('un document qui n’est pas un objet est invalide', () => {
  for (const document of [null, undefined, 'tokens', 12, [], [{}]]) {
    assert.deepEqual(etatDuFormatDeTokens(document), { etat: 'invalide', valeur: document });
  }
});

test('seule la racine est lue : une marque sous un groupe ne compte pas', () => {
  assert.deepEqual(
    etatDuFormatDeTokens({ couleurs: { $extensions: { [EXTENSION_VERSION_TOKENS]: 2 } } }),
    { etat: 'origine' },
  );
  assert.deepEqual(
    etatDuFormatDeTokens({
      $extensions: { [EXTENSION_VERSION_TOKENS]: 1 },
      couleurs: { $extensions: { [EXTENSION_VERSION_TOKENS]: 2 } },
    }),
    { etat: 'courante', version: 1 },
  );
});

test('une marque héritée du prototype n’est pas une marque', () => {
  const extensions = Object.create({ [EXTENSION_VERSION_TOKENS]: 2 });
  assert.deepEqual(etatDuFormatDeTokens({ $extensions: extensions }), { etat: 'origine' });
  const document = Object.create({ $extensions: { [EXTENSION_VERSION_TOKENS]: 2 } });
  assert.deepEqual(etatDuFormatDeTokens(document), { etat: 'origine' });
});

test('les types publics portent la marque à la racine, et nulle part ailleurs', () => {
  const document: DocumentDeTokens = {
    $extensions: { [EXTENSION_VERSION_TOKENS]: 1 },
    couleurs: {
      rouge: {
        $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 },
        $type: 'color',
        $extensions: { 'com.ucm.modes': { clair: '{couleurs.rouge}' } },
      },
    },
  };
  // @ts-expect-error : un groupe ne porte pas de marque de version.
  const groupe: GroupeDeTokens = { $extensions: { [EXTENSION_VERSION_TOKENS]: 1 } };
  assert.ok(document && groupe);
});

test('la porte publique @ucm-kit/core/format expose la lecture de la marque et la constante', () => {
  // Par la carte `exports`, comme un consommateur installé : le plugin et les
  // lecteurs passent par elle, jamais par le chemin du source.
  assert.equal(porte.TOKENS_FORMAT_VERSION, TOKENS_FORMAT_VERSION);
  assert.equal(porte.EXTENSION_VERSION_TOKENS, EXTENSION_VERSION_TOKENS);
  assert.deepEqual(porte.etatDuFormatDeTokens(avecMarque(2)), { etat: 'future', version: 2 });
  assert.deepEqual(porte.etatDuFormatDeTokens({}), { etat: 'origine' });
});
