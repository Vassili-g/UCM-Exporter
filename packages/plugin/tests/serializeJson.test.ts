/**
 * L'écriture d'un artefact change de forme, jamais de contenu.
 *
 * Le gain le plus important de la forme actuelle — un tiers des tokens — et
 * aussi le plus facile à casser sans s'en apercevoir : une virgule oubliée
 * produit un fichier que personne ne relit avant qu'un consommateur ne s'y
 * casse les dents.
 *
 * Les cas ci-dessous sont des CLAUSES, une par test, sur la valeur minimale qui
 * exerce la clause. L'aller-retour sur une valeur riche, lui, se joue sur ce
 * que le moteur produit vraiment — `verifierLaSerialisation`, appelée à chaque
 * export de `exportComponent.test.ts`. Une donnée écrite ici pour l'occasion ne
 * prouverait que l'accord du sérialiseur avec l'imagination de son auteur.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { PROFONDEUR_DE_DECOUPAGE, serializeJson } from '../src/contract/serializeJson';

test('une entrée de collection de premier niveau tient sur une ligne', () => {
  // C'est la promesse faite à la revue de pull request : un variant ajouté, une
  // ligne ajoutée, et un diff qui se relit.
  const ecrit = serializeJson({
    name: 'X',
    variants: [{ nodeId: '1:1', view: 'v1' }, { nodeId: '1:2', view: 'v1' }],
    variantViews: { v1: { structure: 'st1' }, v2: { structure: 'st2' } },
  });
  assert.equal(ecrit.split('\n').filter((l) => l.includes('"nodeId"')).length, 2);
  assert.equal(ecrit.split('\n').filter((l) => l.includes('"structure"')).length, 2);
});

test('la forme ne dépend pas du nombre d’entrées', () => {
  // Un seuil ferait reformater tout un fichier au quatrième variant, et
  // produirait un diff intégral sans qu'aucun design ait changé.
  const lignes = (n: number) => serializeJson({
    variants: Array.from({ length: n }, (_, i) => ({ nodeId: `1:${i}` })),
  }).split('\n').length;
  // Une ligne par variant, plus l'enveloppe : la pente est constante, elle ne
  // change ni au troisième variant, ni au quatrième.
  for (let n = 1; n < 12; n += 1) assert.equal(lignes(n), n + 4, `${n} variants`);
});

test('une collection vide ne coûte pas trois lignes', () => {
  assert.equal(serializeJson({ a: [], b: {} }), '{\n  "a":[],\n  "b":{}\n}');
});

test('le découpage s’arrête à la profondeur annoncée', () => {
  assert.equal(PROFONDEUR_DE_DECOUPAGE, 2);
  const ecrit = serializeJson({ a: { b: { c: { d: 1 } } } });
  assert.equal(ecrit, '{\n  "a":{\n    "b":{"c":{"d":1}}\n  }\n}');
});

test('les caractères que JSON échappe le restent', () => {
  const valeur = { texte: 'guillemet " et \\ et\nretour', accent: 'élément', cle: { 'a"b': 1 } };
  assert.deepEqual(JSON.parse(serializeJson(valeur)), valeur);
});
