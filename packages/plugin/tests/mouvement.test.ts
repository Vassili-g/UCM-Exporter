/**
 * Les deux conversions de mouvement, prises sur le module seul.
 *
 * Les bornes viennent du schéma DTCG figé : les abscisses sont contraintes,
 * les ordonnées libres. Un contrôle posé sur les quatre coordonnées refuserait
 * les courbes à dépassement, que la norme accepte.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { courbeDeToken, dureeDeToken, easingsSansCourbe } from '../src/tokens/mouvement';
import { indexVariables } from '../src/variables';
import { fichierDeVariables } from './fichierDeVariables';

const bezier = (x1: number, y1: number, x2: number, y2: number) =>
  ({ type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1, y1, x2, y2 } }) as MotionEasing;

/** Les douze membres de `MotionEasing.type` qui ne décrivent aucune courbe. */
const SANS_COURBE: Array<MotionEasing['type']> = [
  'EASE_IN', 'EASE_OUT', 'EASE_IN_AND_OUT', 'EASE_IN_BACK', 'EASE_OUT_BACK',
  'EASE_IN_AND_OUT_BACK', 'GENTLE', 'QUICK', 'BOUNCY', 'SLOW', 'CUSTOM_SPRING', 'HOLD',
];

test('une durée garde le nombre de Figma et son unité, sans arrondi ni conversion', () => {
  assert.deepEqual(dureeDeToken(0), { value: 0, unit: 's' });
  assert.deepEqual(dureeDeToken(0.5), { value: 0.5, unit: 's' });
  // Le bruit flottant que Figma rend pour une saisie de 200 ms reste entier :
  // un arrondi ferait diverger deux exports du même fichier.
  assert.deepEqual(dureeDeToken(0.20000000298023224), {
    value: 0.20000000298023224,
    unit: 's',
  });
  assert.deepEqual(dureeDeToken(-1), { value: -1, unit: 's' });
});

test('`LINEAR` a une courbe par définition, et CUSTOM_CUBIC_BEZIER la publie', () => {
  assert.deepEqual(courbeDeToken({ type: 'LINEAR' } as MotionEasing), { courbe: [0, 0, 1, 1] });
  assert.deepEqual(courbeDeToken(bezier(0, 0, 0.58, 1)), { courbe: [0, 0, 0.58, 1] });
  // Aucun arrondi : les points sortent tels que Figma les donne.
  assert.deepEqual(courbeDeToken(bezier(0.33333333333333331, 0, 0.66666666666666663, 1)), {
    courbe: [0.33333333333333331, 0, 0.66666666666666663, 1],
  });
});

test('une ordonnée hors de [0, 1] passe, parce que DTCG ne borne que les abscisses', () => {
  assert.deepEqual(courbeDeToken(bezier(0.34, 1.56, 0.64, 1)), { courbe: [0.34, 1.56, 0.64, 1] });
  assert.deepEqual(courbeDeToken(bezier(0.34, -0.8, 0.64, 1)), { courbe: [0.34, -0.8, 0.64, 1] });
  assert.deepEqual(courbeDeToken(bezier(0, 42, 1, -42)), { courbe: [0, 42, 1, -42] });
});

test('une abscisse hors de [0, 1] est refusée, et sa cause la distingue', () => {
  assert.deepEqual(courbeDeToken(bezier(1.1, 0, 0.64, 1)), { cause: 'abscisse' });
  assert.deepEqual(courbeDeToken(bezier(0.34, 0, -0.2, 1)), { cause: 'abscisse' });
  // Les deux bornes sont incluses.
  assert.deepEqual(courbeDeToken(bezier(0, 0, 1, 1)), { courbe: [0, 0, 1, 1] });
});

test('les douze autres easings de Figma n’ont aucune courbe cubique', () => {
  for (const type of SANS_COURBE) {
    assert.deepEqual(courbeDeToken({ type } as MotionEasing), { cause: 'sans-courbe' }, type);
  }
  assert.equal(SANS_COURBE.length, 12);
});

test('un CUSTOM_CUBIC_BEZIER sans points, ou aux points illisibles, n’a pas de courbe', () => {
  assert.deepEqual(courbeDeToken({ type: 'CUSTOM_CUBIC_BEZIER' } as MotionEasing), {
    cause: 'sans-courbe',
  });
  assert.deepEqual(courbeDeToken(bezier(Number.NaN, 0, 0.64, 1)), { cause: 'sans-courbe' });
  assert.deepEqual(courbeDeToken(bezier(0.34, Number.POSITIVE_INFINITY, 0.64, 1)), {
    cause: 'sans-courbe',
  });
  const sansY2 = { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: 0, y1: 0, x2: 1 } };
  assert.deepEqual(courbeDeToken(sansY2 as unknown as MotionEasing), { cause: 'sans-courbe' });
  assert.deepEqual(courbeDeToken(undefined), { cause: 'sans-courbe' });
});

/** L'index que `easingsSansCourbe` lit, construit depuis le fichier simulé. */
function grapheDuFichier() {
  const { collections, variables } = fichierDeVariables();
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  return {
    collectionById,
    variableById: new Map(variables.map((variable) => [variable.id, variable])),
    pathById: indexVariables(variables, collectionById).pathById,
  };
}

test('le relevé nomme chaque variable sans courbe, et chacun de ses modes fautifs', () => {
  const releve = easingsSansCourbe(grapheDuFichier());

  assert.deepEqual([...releve.keys()].sort(), [
    'easing-abscisse', 'easing-mixte', 'easing-preregle', 'easing-ressort',
    'easing-sans-points', 'easing-tenue',
  ]);
  assert.deepEqual(releve.get('easing-abscisse')?.map(({ cause }) => cause), ['abscisse']);
  assert.deepEqual(releve.get('easing-ressort')?.map(({ cause }) => cause), ['sans-courbe']);
  // Un seul mode sans courbe relève la variable entière : le second mode de
  // `easing/mixed` porte un `LINEAR` valide, et la variable sort quand même.
  assert.deepEqual(releve.get('easing-mixte')?.map(({ cause }) => cause), ['sans-courbe']);
});

test('un alias et un mode vide ne sont pas relevés ici', () => {
  const releve = easingsSansCourbe(grapheDuFichier());

  // `motion/broken-easing` vise une variable écartée : l'export le traite par
  // sa politique de cible absente, pas par le relevé des courbes.
  assert.equal(releve.has('easing-orpheline'), false);
  assert.equal(releve.has('easing-aliasee'), false);
  assert.equal(releve.has('easing-lineaire'), false);
  assert.equal(releve.has('easing-marque'), false);
});
