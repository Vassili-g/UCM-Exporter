/**
 * Où vit la version de schéma d'un contrat, et ce que « pas de version » veut
 * dire.
 *
 * Ces tests protègent une frontière plus qu'une fonction : `versionDeContrat`
 * dit OÙ le champ se lit et rend ce qu'il y trouve, `verdictDeVersion` dit si
 * cette valeur est lisible et supportée. Le jour où la première se mettrait à
 * juger, ce repository aurait deux idées de ce qu'est une version valide, et
 * leur désaccord serait muet.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTRACT_VERSION, versionDeContrat } from '../src/format/version';

test('la version se lit dans meta.contractVersion', () => {
  assert.equal(versionDeContrat({ meta: { contractVersion: '12.0' } }), '12.0');
  // Ce que le moteur écrit doit se relire par cette porte : sans cela, le
  // producteur et le lecteur regarderaient deux endroits différents.
  assert.equal(versionDeContrat({ meta: { contractVersion: CONTRACT_VERSION } }), CONTRACT_VERSION);
});

test('une version illisible est rendue telle quelle, pas corrigée ni rejetée', () => {
  // C'est `verdictDeVersion` qui connaît la fenêtre de ce repository et la
  // grammaire `majeure.mineure`. Reproduire ce jugement ici créerait la
  // seconde autorité que cette fonction existe pour supprimer — et le rapport
  // qui nomme la version fautive au designer ne pourrait plus la citer.
  assert.equal(versionDeContrat({ meta: { contractVersion: 'douze' } }), 'douze');
  assert.equal(versionDeContrat({ meta: { contractVersion: '99.9' } }), '99.9');
});

test('l’absence de version se distingue d’une version, quelle que soit sa forme', () => {
  // `null` ne dit qu'une chose : le champ est absent ou n'est pas du texte
  // utilisable. Un contrat vidé de sa substance n'a pas une version périmée,
  // il n'en a pas — et les deux appellent des messages opposés côté rapport.
  assert.equal(versionDeContrat({}), null);
  assert.equal(versionDeContrat({ meta: {} }), null);
  assert.equal(versionDeContrat({ meta: { contractVersion: '' } }), null);
  assert.equal(versionDeContrat({ meta: { contractVersion: '   ' } }), null);
  assert.equal(versionDeContrat({ meta: { contractVersion: 12 } }), null);
  assert.equal(versionDeContrat({ contractVersion: '12.0' }), null);
});

test('une entrée douteuse ne fait pas exploser la lecture', () => {
  // Un garde-fou qui lève sur une entrée qu'il n'attendait pas ne garde plus
  // rien : les trois appelants lui passent du JSON venu du disque, de l'API
  // GitHub ou d'un test, et aucun n'a promis sa forme.
  for (const brut of [null, undefined, 'contrat', 42, [], [{ meta: { contractVersion: '12.0' } }]]) {
    assert.equal(versionDeContrat(brut), null);
  }
  assert.equal(versionDeContrat({ meta: null }), null);
  assert.equal(versionDeContrat({ meta: ['12.0'] }), null);
});
