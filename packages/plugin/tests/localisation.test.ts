/**
 * Le registre qui dit OÙ regarder, et ce qu'il refuse de promettre (U4.3).
 *
 * Ces tests portent sur le mécanisme, pas sur les messages : aucun ne cite un
 * texte d'export réel. Ce qui compte ici est que la localisation survive au
 * dédoublonnage et aux fusions de canaux — les deux endroits où elle peut se
 * perdre sans que rien ne rougisse.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localisationsDe,
  noter,
  pousserLocalise,
  reporterLocalisations,
  sujet,
} from '../src/contract/localisation';

const node = (id: string, name: string) => ({ id, name });

test('le sujet forme le texte et retient le node, sans se répéter ailleurs', () => {
  assert.deepEqual(sujet('Layer', node('1:2', 'Badge')), {
    texte: 'Layer « Badge »',
    nodeId: '1:2',
  });
  assert.equal(sujet('Component Set', node('3:4', 'Button')).texte, 'Component Set « Button »');
});

test('un message poussé porte son sujet, et le canal sait où il vit', () => {
  const canal: string[] = [];
  const message = pousserLocalise(canal, 'Layer', node('1:2', 'Badge'), ' : son stroke est illisible.');
  assert.deepEqual(canal, ['Layer « Badge » : son stroke est illisible.']);
  assert.equal(message, canal[0]);
  assert.deepEqual([...localisationsDe(canal)], [['Layer « Badge » : son stroke est illisible.', '1:2']]);
});

test('la suite porte sa propre ponctuation : le sujet ne l’impose pas', () => {
  const canal: string[] = [];
  pousserLocalise(canal, 'Layer', node('1:2', 'Tile'), ', padding : les côtés diffèrent.');
  assert.deepEqual(canal, ['Layer « Tile », padding : les côtés diffèrent.']);
});

/**
 * Le point qui justifie tout le module. Deux calques qui produisent le même
 * texte ne donnent qu'UN constat — c'est le dédoublonnage existant —, donc une
 * seule cible. Retenir le second effacerait celle que le message dédoublonné
 * désigne réellement.
 */
test('deux calques au même message ne laissent qu’une cible, la première', () => {
  const canal: string[] = [];
  const suite = ' : il n’utilise pas d’auto layout.';
  pousserLocalise(canal, 'Layer', node('1:2', 'Tile'), suite);
  pousserLocalise(canal, 'Layer', node('9:9', 'Tile'), suite);
  assert.equal(localisationsDe(canal).get('Layer « Tile »' + suite), '1:2');
});

test('un canal sans localisation n’en invente aucune', () => {
  const canal = ['Text style « Corps » : son nom ne produit aucun identifiant.'];
  assert.equal(localisationsDe(canal).size, 0);
});

test('deux canaux ne se contaminent pas : le registre suit le tableau', () => {
  const gauche: string[] = [];
  const droite: string[] = [];
  pousserLocalise(gauche, 'Layer', node('1:1', 'A'), ' : rien.');
  pousserLocalise(droite, 'Layer', node('2:2', 'B'), ' : rien.');
  assert.deepEqual([...localisationsDe(gauche).values()], ['1:1']);
  assert.deepEqual([...localisationsDe(droite).values()], ['2:2']);
});

/**
 * Une recopie de canal est le seul endroit où une localisation se perd
 * silencieusement : le message arrive, l'id reste derrière.
 */
test('une recopie de canal emporte les localisations si on les reporte', () => {
  const source: string[] = [];
  pousserLocalise(source, 'Layer', node('1:2', 'Badge'), ' : rien.');
  const cible = [...source];
  assert.equal(localisationsDe(cible).size, 0, 'la recopie seule ne reporte rien');
  reporterLocalisations(source, cible);
  assert.equal(localisationsDe(cible).get('Layer « Badge » : rien.'), '1:2');
});

test('une fusion garde la première cible, jamais celle qui arrive après', () => {
  const premier: string[] = [];
  const second: string[] = [];
  const suite = ' : rien.';
  pousserLocalise(premier, 'Layer', node('1:1', 'Tile'), suite);
  pousserLocalise(second, 'Layer', node('2:2', 'Tile'), suite);
  const fusion = [...premier, ...second];
  reporterLocalisations(premier, fusion);
  reporterLocalisations(second, fusion);
  assert.equal(localisationsDe(fusion).get('Layer « Tile »' + suite), '1:1');
});

test('noter localise un message qu’un site a formé lui-même', () => {
  const canal: string[] = [];
  const message = 'Layer « Racine » : profondeur maximale atteinte.';
  canal.push(noter(canal, message, sujet('Layer', node('7:7', 'Racine'))));
  assert.equal(localisationsDe(canal).get(message), '7:7');
});

test('le relevé rendu est une copie : le modifier ne déplace aucune cible', () => {
  const canal: string[] = [];
  pousserLocalise(canal, 'Layer', node('1:2', 'Badge'), ' : rien.');
  localisationsDe(canal).clear();
  assert.equal(localisationsDe(canal).size, 1);
});
