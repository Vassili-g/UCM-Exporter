/**
 * Le registre qui dit OÙ regarder, et ce qu'il refuse de promettre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localisationsDe,
  noter,
  partiesDe,
  pousserLocalise,
  reporterLocalisations,
  sujet,
} from '../src/contract/localisation';

const node = (id: string, name: string) => ({ id, name });

/** Un constat quelconque : ces tests portent sur le mécanisme, pas sur le texte. */
const constat = {
  manque: 'son stroke est illisible.',
  impact: 'Le contrat ne dira pas comment le peindre.',
  action: 'Reliez-le à une variable, puis réexportez.',
};
const PHRASE = 'Layer « Badge » : son stroke est illisible. Le contrat ne dira pas comment le '
  + 'peindre. Reliez-le à une variable, puis réexportez.';

test('le sujet forme le texte et retient le node, sans se répéter ailleurs', () => {
  assert.deepEqual(sujet('Layer', node('1:2', 'Badge')), {
    texte: 'Layer « Badge »',
    nodeId: '1:2',
  });
  assert.equal(sujet('Component Set', node('3:4', 'Button')).texte, 'Component Set « Button »');
});

test('un message poussé porte son sujet, et le canal sait où il vit', () => {
  const canal: string[] = [];
  const message = pousserLocalise(canal, 'Layer', node('1:2', 'Badge'), constat);
  assert.deepEqual(canal, [PHRASE]);
  assert.equal(message, canal[0]);
  assert.deepEqual([...localisationsDe(canal)], [[PHRASE, '1:2']]);
});

/**
 * La phrase compacte se DÉRIVE des trois parties, et les parties voyagent avec
 * elle (U4.8). Sans ce report, l'interface ne pourrait qu'afficher un
 * paragraphe où le geste se lit après deux phrases de contexte.
 */
test('les trois parties voyagent avec la phrase, et la phrase en dérive', () => {
  const canal: string[] = [];
  pousserLocalise(canal, 'Layer', node('1:2', 'Badge'), constat);
  const point = partiesDe(canal).get(PHRASE);
  assert.deepEqual(point, {
    titre: 'Layer « Badge » : son stroke est illisible.',
    impact: 'Le contrat ne dira pas comment le peindre.',
    action: 'Reliez-le à une variable, puis réexportez.',
  });
  assert.equal(`${point?.titre} ${point?.impact} ${point?.action}`, PHRASE);
});

test('le champ visé s’écrit entre le sujet et le manque, quand il y en a un', () => {
  const canal: string[] = [];
  pousserLocalise(canal, 'Layer', node('1:2', 'Tile'), {
    champ: 'padding',
    manque: 'les côtés diffèrent.',
    impact: 'Rien n’est exporté pour cette valeur.',
    action: 'Reliez-les à la même variable.',
  });
  assert.deepEqual(canal, [
    'Layer « Tile », padding : les côtés diffèrent. Rien n’est exporté pour cette valeur. '
      + 'Reliez-les à la même variable.',
  ]);
});

/**
 * Le point qui justifie tout le module. Deux calques qui produisent le même
 * texte ne donnent qu'UN constat — c'est le dédoublonnage existant —, donc une
 * seule cible. Retenir le second effacerait celle que le message dédoublonné
 * désigne réellement.
 */
test('deux calques au même message ne laissent qu’une cible, la première', () => {
  const canal: string[] = [];
  pousserLocalise(canal, 'Layer', node('1:2', 'Tile'), constat);
  pousserLocalise(canal, 'Layer', node('9:9', 'Tile'), constat);
  assert.equal(localisationsDe(canal).get('Layer « Tile » : son stroke est illisible. '
    + 'Le contrat ne dira pas comment le peindre. Reliez-le à une variable, puis réexportez.'),
  '1:2');
});

test('un canal sans localisation n’en invente aucune', () => {
  const canal = ['Text style « Corps » : son nom ne produit aucun identifiant.'];
  assert.equal(localisationsDe(canal).size, 0);
});

test('deux canaux ne se contaminent pas : le registre suit le tableau', () => {
  const gauche: string[] = [];
  const droite: string[] = [];
  pousserLocalise(gauche, 'Layer', node('1:1', 'A'), constat);
  pousserLocalise(droite, 'Layer', node('2:2', 'B'), constat);
  assert.deepEqual([...localisationsDe(gauche).values()], ['1:1']);
  assert.deepEqual([...localisationsDe(droite).values()], ['2:2']);
});

/**
 * Une recopie de canal est le seul endroit où une localisation se perd
 * silencieusement : le message arrive, l'id reste derrière.
 */
test('une recopie de canal emporte les localisations si on les reporte', () => {
  const source: string[] = [];
  pousserLocalise(source, 'Layer', node('1:2', 'Badge'), constat);
  const cible = [...source];
  assert.equal(localisationsDe(cible).size, 0, 'la recopie seule ne reporte rien');
  assert.equal(partiesDe(cible).size, 0, 'les parties non plus');
  reporterLocalisations(source, cible);
  assert.equal(localisationsDe(cible).get(PHRASE), '1:2');
  assert.ok(partiesDe(cible).has(PHRASE), 'les parties voyagent par le même chemin');
});

test('une fusion garde la première cible, jamais celle qui arrive après', () => {
  const premier: string[] = [];
  const second: string[] = [];
  pousserLocalise(premier, 'Layer', node('1:1', 'Tile'), constat);
  pousserLocalise(second, 'Layer', node('2:2', 'Tile'), constat);
  const fusion = [...premier, ...second];
  reporterLocalisations(premier, fusion);
  reporterLocalisations(second, fusion);
  assert.equal(localisationsDe(fusion).get('Layer « Tile » : son stroke est illisible. '
    + 'Le contrat ne dira pas comment le peindre. Reliez-le à une variable, puis réexportez.'),
  '1:1');
});

test('noter localise un message qu’un site a formé lui-même', () => {
  const canal: string[] = [];
  const message = 'Layer « Racine » : profondeur maximale atteinte.';
  canal.push(noter(canal, message, sujet('Layer', node('7:7', 'Racine'))));
  assert.equal(localisationsDe(canal).get(message), '7:7');
});

test('le relevé rendu est une copie : le modifier ne déplace aucune cible', () => {
  const canal: string[] = [];
  pousserLocalise(canal, 'Layer', node('1:2', 'Badge'), constat);
  localisationsDe(canal).clear();
  assert.equal(localisationsDe(canal).size, 1);
});
