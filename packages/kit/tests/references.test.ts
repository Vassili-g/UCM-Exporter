/**
 * La forme d'une référence de token.
 *
 * Ces cas vivaient dans `tokensUsed.test.ts` du plugin, à côté de la copie de
 * la regex qui s'y trouvait. Ils suivent la définition : elle est maintenant
 * unique, et son test avec elle. Les deux autres copies — le validateur du kit,
 * le `tokenVar` du repo consommateur — se contentaient de la même forme sans
 * qu'aucun test ne le vérifie ; c'est cette absence de test d'accord qui rendait
 * la divergence possible sans qu'elle se voie.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { isTokenReference, refPath, toRef } from '../src/format/references';

test('une référence se reconnaît à la chaîne entière, jamais dans une phrase', () => {
  assert.equal(isTokenReference('{components.button.sizes.medium.gap}'), true);
  // Un avertissement cite des tokens : il ne devient pas une référence pour autant.
  assert.equal(isTokenReference('Icône « star » : taille {a.base} puis {a.lg}.'), false);
  // Un nom de style de texte reste une chaîne nue, hors de l'index.
  assert.equal(isTokenReference('heading.large'), false);
  // Un seul segment ne suffit pas : une référence désigne un chemin.
  assert.equal(isTokenReference('{sansPoint}'), false);
  // Ni espace ni accolade interne, sans quoi une phrase courte passerait.
  assert.equal(isTokenReference('{a.b c}'), false);
  assert.equal(isTokenReference('{a.{b}}'), false);
  assert.equal(isTokenReference(42), false);
  assert.equal(isTokenReference(undefined), false);
});

test('toRef et refPath sont exactement inverses, et refPath ne déballe rien d’autre', () => {
  const chemin = 'components.button.default.background';
  assert.equal(toRef(chemin), `{${chemin}}`);
  assert.equal(refPath(toRef(chemin)), chemin);
  // Ce qui n'est pas une référence traverse intact : sans cette clause,
  // « border} » deviendrait le dernier segment d'un token qui n'existe pas.
  assert.equal(refPath('heading.large'), 'heading.large');
  assert.equal(refPath('{sansPoint}'), '{sansPoint}');
});
