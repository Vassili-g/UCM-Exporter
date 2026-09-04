/**
 * Les trois règles de nommage du format.
 *
 * Elles étaient testées avec `variables.ts`, qui a besoin des globals Figma :
 * la coupure format/moteur les sépare, et c'est bien ce qu'elle doit faire —
 * ces deux fonctions ne connaissent ni Figma ni Node, et c'est la propriété
 * qui leur permet de voyager dans le bundle du plugin comme dans un navigateur.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { codeIdentifier, normalizeName, tokenCssVariable } from '../src/format/names';

test('normalizeName suit la convention commune des tokens', () => {
  assert.equal(normalizeName('Brand Tokens/Primary/default'), 'brand-tokens.primary.default');
  assert.equal(normalizeName(' Primitives / Grey   Titanium / 600 '), 'primitives.grey-titanium.600');
  assert.equal(normalizeName('///'), '');
});

test('codeIdentifier produit un nom TypeScript stable sans perdre le nom Figma du contrat', () => {
  assert.equal(codeIdentifier('Icon / Button'), 'IconButton');
  assert.equal(codeIdentifier('bouton-primaire'), 'BoutonPrimaire');
  assert.equal(codeIdentifier('État vide'), 'EtatVide');
  assert.equal(codeIdentifier('2e bouton'), 'Component2eBouton');
  assert.equal(codeIdentifier('///'), 'Component');
});

test('tokenCssVariable projette un chemin de token sur sa propriété CSS', () => {
  assert.equal(
    tokenCssVariable('components.button.sizes.medium.gap'),
    '--components-button-sizes-medium-gap',
  );
  // Le point n'a rien de spécial : il tombe sous la règle générale, comme le
  // tiret déjà présent dans un segment.
  assert.equal(tokenCssVariable('color-brands.intencial.primary.400'), '--color-brands-intencial-primary-400');
  assert.equal(tokenCssVariable('components.button.sizes.medium.padding-x'), '--components-button-sizes-medium-padding-x');
});

test("tokenCssVariable ferme la virgule décimale, qui rendait une valeur fausse et muette", () => {
  // Le défaut d'origine. `var(--layouts-sizing-0,5)` se lit en CSS « variable
  // --layouts-sizing-0, repli 5 » : la variable existe, vaut 0px, et le contrat
  // demandait 2px. Aucune erreur n'était levée.
  assert.equal(tokenCssVariable('layouts.sizing.0,5'), '--layouts-sizing-0-5');
  assert.equal(tokenCssVariable('layouts.sizing.3,5'), '--layouts-sizing-3-5');
  assert.equal(tokenCssVariable('layouts.sizing.0'), '--layouts-sizing-0');
});

test("tokenCssVariable ne coupe pas sur les bosses de casse, là où un kebabCase le ferait", () => {
  // La différence délibérée avec le `name/kebab` de Style Dictionary, qui rend
  // 'semi-bold'. Le format ne connaît pas la casse camel : sa règle tient en
  // une phrase, et une chaîne écrite dans une autre langue peut la tenir.
  assert.equal(tokenCssVariable('layouts.fontweight.semiBold'), '--layouts-fontweight-semibold');
});

test('tokenCssVariable rend un nom utilisable quoi qu’on lui donne', () => {
  // Les lettres accentuées survivent : une propriété personnalisée CSS les
  // accepte, et les retirer perdrait un segment entier d'un design system
  // francophone.
  assert.equal(tokenCssVariable('couleurs.été'), '--couleurs-été');
  // Suites collapsées, tirets de bord retirés — sans quoi `--a-b-` et un nom
  // vide se glisseraient dans la feuille.
  assert.equal(tokenCssVariable('a...b'), '--a-b');
  assert.equal(tokenCssVariable('.a.'), '--a');
  assert.equal(tokenCssVariable('...'), '--');
  // La borne assumée : la projection n'est pas une bijection, et c'est au
  // consommateur de refuser la collision. Le format la rend visible ici plutôt
  // que de prétendre l'empêcher.
  assert.equal(tokenCssVariable('a.50%'), tokenCssVariable('a.50'));
});
