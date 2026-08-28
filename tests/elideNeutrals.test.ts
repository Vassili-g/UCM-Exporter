/** Ce que le contrat cesse d'écrire, et ce qu'il continue d'écrire. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CATALOGUES_DE_VUES,
  elideContract,
  elideNeutrals,
  isNeutral,
} from '../src/contract/elideNeutrals';

test('les trois écritures du vide disparaissent', () => {
  assert.deepEqual(
    elideNeutrals({ a: null, b: {}, c: [], d: 'reste' }),
    { d: 'reste' },
  );
});

test('false, zéro et la chaîne vide sont des valeurs, pas des silences', () => {
  // `default: false` répond « la prop vaut faux » ; `default: null` répondait
  // « il n'y a pas de défaut ». Les confondre changerait le rendu.
  const garde = { actif: false, compte: 0, texte: '', zero: '0' };
  assert.deepEqual(elideNeutrals(garde), garde);
});

test('un élément vide d’un tableau reste : c’est une donnée', () => {
  // Sous `paintPlacements`, un chemin vide désigne la RACINE du composant.
  assert.deepEqual(
    elideNeutrals({ fills: { background: [[]] } }),
    { fills: { background: [[]] } },
  );
});

test('un objet devenu vide reste écrit : jamais de point fixe', () => {
  // La borne qui protège les dictionnaires. `stateModel.states.default` vaut
  // `{}` pour l'état que rien ne déclenche : un second passage supprimerait
  // l'ÉTAT au lieu de son silence, et `precedence` citerait un état absent.
  assert.deepEqual(
    elideNeutrals({ states: { default: { selector: null }, hover: { selector: ':hover' } } }),
    { states: { default: {}, hover: { selector: ':hover' } } },
  );
  assert.deepEqual(
    elideNeutrals({ padding: { x: null, y: null } }),
    { padding: {} },
  );
});

test('la descente traverse tableaux et objets imbriqués', () => {
  assert.deepEqual(
    elideNeutrals({ children: [{ slot: 'icon', size: null, bounds: {} }] }),
    { children: [{ slot: 'icon' }] },
  );
});

test('elideContract ne repasse pas sur un catalogue déjà élidé', () => {
  // `compactVariants` a dû élider chaque partie pour décider s'il avait quelque
  // chose à ranger. Repasser dessus retirerait un objet devenu vide au PREMIER
  // passage — c'est le point fixe, par la bande.
  const contrat = {
    viewStructures: { st1: { layout: 'flex-row', padding: {} } },
    variantViews: { v1: { structure: 'st1' } },
    viewIcons: {},
    stateModel: { states: { default: { selector: null } } },
  };
  const elide = elideContract(contrat, CATALOGUES_DE_VUES);

  assert.deepEqual(elide.viewStructures, { st1: { layout: 'flex-row', padding: {} } });
  // Un catalogue vide, lui, ne s'écrit pas : sa clé de premier niveau tombe.
  assert.equal('viewIcons' in elide, false);
  // Le reste est élidé, une fois.
  assert.deepEqual(elide.stateModel, { states: { default: {} } });
});

test('isNeutral répond sur les trois formes et sur rien d’autre', () => {
  assert.equal(isNeutral(null), true);
  assert.equal(isNeutral({}), true);
  assert.equal(isNeutral([]), true);
  assert.equal(isNeutral(false), false);
  assert.equal(isNeutral(0), false);
  assert.equal(isNeutral(''), false);
  assert.equal(isNeutral({ a: null }), false);
});

test('une clé héritée d’Object.prototype ne pollue pas le résultat', () => {
  // Les clés viennent de Figma : `__proto__` est un nom de calque valide.
  const piege = JSON.parse('{"__proto__": {"pollue": 1}, "garde": "oui"}');
  const elide = elideNeutrals(piege) as Record<string, unknown>;
  assert.equal(({} as Record<string, unknown>).pollue, undefined);
  assert.equal(elide.garde, 'oui');
});
