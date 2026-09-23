/**
 * La décision de famille typographique, prise sur le module seul.
 *
 * Elle porte sur une composante connexe du graphe d'alias, et non sur la
 * feuille courante : un test qui ne lirait qu'une variable à la fois ne
 * verrait pas la propagation vers la primitive, qui est le cas que le format
 * doit tenir.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { famillesDeTokens } from '../src/tokens/familles';
import type { GrapheDesVariables, LiaisonsDeTextStyles } from '../src/tokens/familles';
import { graissesNumeriques } from '../src/tokens/graisses';
import { indexVariables } from '../src/variables';
import { fichierDeVariables } from './fichierDeVariables';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const SANS_LIAISON: LiaisonsDeTextStyles = {
  parFontFamily: new Set(),
  parAutreChampDeChaine: new Set(),
};

type Brouillon = {
  id: string;
  chemin: string;
  modes: Array<VariableValue | undefined>;
  scopes?: VariableScope[];
  resolvedType?: VariableResolvedDataType;
};

/**
 * Un graphe d'une seule collection, dont chaque variable reçoit les valeurs de
 * ses modes dans l'ordre. Le nombre de modes vient de la plus longue liste.
 */
function graphe(brouillons: Brouillon[]): GrapheDesVariables {
  const nombreDeModes = Math.max(1, ...brouillons.map(({ modes }) => modes.length));
  const modes = Array.from({ length: nombreDeModes }, (_, rang) => ({
    modeId: `m${rang}`,
    name: `Mode ${rang + 1}`,
  }));
  const collection = {
    id: 'c', name: 'Collection', modes, defaultModeId: 'm0', variableIds: [],
  } as unknown as VariableCollection;

  const variables = brouillons.map(({ id, chemin, modes: valeurs, scopes, resolvedType }) => {
    const valuesByMode: Record<string, VariableValue> = {};
    modes.forEach((mode, rang) => {
      const valeur = valeurs[rang] ?? valeurs[0];
      if (valeur !== undefined) valuesByMode[mode.modeId] = valeur;
    });
    return {
      id,
      name: chemin,
      resolvedType: resolvedType ?? 'STRING',
      scopes: scopes ?? ['ALL_SCOPES'],
      valuesByMode,
      variableCollectionId: 'c',
    } as unknown as Variable;
  });

  return {
    collectionById: new Map([['c', collection]]),
    variableById: new Map(variables.map((variable) => [variable.id, variable])),
    pathById: new Map(brouillons.map(({ id, chemin }) => [id, chemin])),
  };
}

const liaisons = (parFontFamily: string[], parAutreChampDeChaine: string[] = []) => ({
  parFontFamily: new Set(parFontFamily),
  parAutreChampDeChaine: new Set(parAutreChampDeChaine),
});

test('une liaison directe type toute la composante, source et cible', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'primitive', chemin: 'primitives.fontfamily.base', modes: ['Open Sans'] },
      { id: 'semantique', chemin: 'semantic.family', modes: [alias('primitive')] },
    ]),
    new Set(),
    liaisons(['semantique']),
  );

  // La preuve porte sur la sémantique ; la primitive la reçoit par la
  // composante, sans qu'aucune marche ne parte de la feuille courante.
  assert.deepEqual([...decision.familles].sort(), ['primitive', 'semantique']);
  assert.deepEqual(decision.ambigues, []);
  assert.deepEqual(decision.probables, []);
});

test('la preuve se propage aussi de la primitive vers ce qui la cite', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'primitive', chemin: 'primitives.fontfamily.base', modes: ['Open Sans'] },
      { id: 'marque', chemin: 'brand.family', modes: [alias('primitive')] },
      { id: 'composant', chemin: 'components.card.family', modes: [alias('marque')] },
    ]),
    new Set(),
    liaisons(['primitive']),
  );

  assert.deepEqual([...decision.familles].sort(), ['composant', 'marque', 'primitive']);
});

test('un scope limité à Font family suffit, et un scope large ne prouve rien', () => {
  const precis = famillesDeTokens(
    graphe([{ id: 'a', chemin: 'primitives.family', modes: ['Inter'], scopes: ['FONT_FAMILY'] }]),
    new Set(),
    SANS_LIAISON,
  );
  assert.deepEqual([...precis.familles], ['a']);

  const large = famillesDeTokens(
    graphe([{ id: 'a', chemin: 'primitives.family', modes: ['Inter'], scopes: ['ALL_SCOPES'] }]),
    new Set(),
    SANS_LIAISON,
  );
  assert.deepEqual([...large.familles], []);
});

test('un scope de famille accompagné d’un scope de texte est un conflit, pas une preuve', () => {
  for (const contraire of ['ALL_SCOPES', 'FONT_STYLE', 'TEXT_CONTENT'] as VariableScope[]) {
    const decision = famillesDeTokens(
      graphe([{
        id: 'a', chemin: 'primitives.fontfamily.base', modes: ['Inter'],
        scopes: ['FONT_FAMILY', contraire],
      }]),
      new Set(),
      SANS_LIAISON,
    );
    // Sans preuve positive, la composante n'est pas ambiguë : elle est
    // seulement nommée comme une famille sans que rien ne l'établisse.
    assert.deepEqual([...decision.familles], [], contraire);
    assert.deepEqual(decision.ambigues, [], contraire);
    assert.deepEqual(decision.probables, ['a'], contraire);
  }
});

test('des littéraux différents selon les modes reçoivent le même type', () => {
  const decision = famillesDeTokens(
    graphe([{
      id: 'a', chemin: 'brand.family', modes: ['Open Sans', 'Roboto Mono'],
      scopes: ['FONT_FAMILY'],
    }]),
    new Set(),
    SANS_LIAISON,
  );

  assert.deepEqual([...decision.familles], ['a']);
});

test('un alias d’un mode non par défaut relie la composante', () => {
  // `resolveRoot` ne suit que le mode par défaut : une décision qui passerait
  // par lui manquerait ce lien, et typerait deux feuilles d'une même chaîne
  // différemment.
  const decision = famillesDeTokens(
    graphe([
      { id: 'primitive', chemin: 'primitives.fontfamily.base', modes: ['Open Sans'] },
      { id: 'marque', chemin: 'brand.family', modes: ['Inter', alias('primitive')] },
    ]),
    new Set(),
    liaisons(['primitive']),
  );

  assert.deepEqual([...decision.familles].sort(), ['marque', 'primitive']);
});

test('une preuve et un conflit sur la même composante la laissent en chaîne', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'primitive', chemin: 'primitives.fontfamily.base', modes: ['Open Sans'] },
      { id: 'italique', chemin: 'primitives.style.italic', modes: [alias('primitive')] },
      { id: 'tiers', chemin: 'brand.family', modes: [alias('primitive')] },
    ]),
    new Set(),
    liaisons(['primitive'], ['italique']),
  );

  assert.deepEqual([...decision.familles], []);
  // Rangées par chemin : `brand.family`, puis les deux primitives.
  assert.deepEqual(decision.ambigues, ['tiers', 'primitive', 'italique']);
});

test('un alias qui quitte l’ensemble des candidates est un conflit', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'famille', chemin: 'primitives.fontfamily.base', modes: [alias('absente')] },
    ]),
    new Set(),
    liaisons(['famille']),
  );

  assert.deepEqual([...decision.familles], []);
  assert.deepEqual(decision.ambigues, ['famille']);
});

test('une variable retenue par les graisses n’entre dans aucune composante', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'famille', chemin: 'primitives.fontfamily.base', modes: ['Open Sans'] },
      { id: 'graisse', chemin: 'primitives.fontweight.bold', modes: ['Bold'] },
    ]),
    new Set(['graisse']),
    liaisons(['famille'], ['graisse']),
  );

  // La graisse est reliée par `fontWeight`, donc conflictuelle au sens de la
  // politique. Elle est décidée avant, et son conflit ne touche pas la famille.
  assert.deepEqual([...decision.familles], ['famille']);
});

test('une boucle d’alias termine, et reste une chaîne sans preuve', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'a', chemin: 'semantic.loop-a', modes: [alias('b')] },
      { id: 'b', chemin: 'semantic.loop-b', modes: [alias('a')] },
    ]),
    new Set(),
    SANS_LIAISON,
  );

  assert.deepEqual([...decision.familles], []);
  assert.deepEqual(decision.probables, []);
});

test('un nom de famille sans preuve est relevé, et ne décide jamais le type', () => {
  const decision = famillesDeTokens(
    graphe([
      { id: 'nommee', chemin: 'primitives.font-family.base', modes: ['Inter'] },
      { id: 'anonyme', chemin: 'primitives.divers.base', modes: ['Inter'] },
    ]),
    new Set(),
    SANS_LIAISON,
  );

  assert.deepEqual([...decision.familles], []);
  // Le tiret du segment ne change rien, et une variable sans ce segment reste
  // hors du relevé.
  assert.deepEqual(decision.probables, ['nommee']);
});

test('l’ordre de visite des variables et des modes ne change pas la décision', () => {
  const brouillons: Brouillon[] = [
    { id: 'primitive', chemin: 'primitives.fontfamily.base', modes: ['Open Sans'] },
    { id: 'marque', chemin: 'brand.family', modes: [alias('primitive')] },
    { id: 'autre', chemin: 'semantic.family', modes: [alias('marque')] },
  ];
  const direct = famillesDeTokens(graphe(brouillons), new Set(), liaisons(['autre']));
  const inverse = famillesDeTokens(graphe([...brouillons].reverse()), new Set(), liaisons(['autre']));

  assert.deepEqual([...direct.familles].sort(), [...inverse.familles].sort());
  assert.deepEqual(direct.ambigues, inverse.ambigues);
  assert.deepEqual(direct.probables, inverse.probables);
});

test('les graisses et les familles du fichier simulé ne se recoupent pas', () => {
  const { collections, variables, textStyles } = fichierDeVariables();
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  // L'index canonique, celui que l'export construit : les deux décisions se
  // prennent sur le chemin du token, pas sur le nom brut de la variable.
  const graphes: GrapheDesVariables = {
    collectionById,
    variableById: new Map(variables.map((variable) => [variable.id, variable])),
    pathById: indexVariables(variables, collectionById).pathById,
  };
  const parFontFamily = new Set<string>();
  const parAutreChampDeChaine = new Set<string>();
  for (const style of textStyles) {
    for (const [champ, liaison] of Object.entries(style.boundVariables ?? {})) {
      const cible = (liaison as VariableAlias).id;
      if (champ === 'fontFamily') parFontFamily.add(cible);
      else parAutreChampDeChaine.add(cible);
    }
  }

  const graisses = graissesNumeriques(graphes);
  const { familles } = famillesDeTokens(graphes, graisses, {
    parFontFamily,
    parAutreChampDeChaine,
  });

  // Une variable dans les deux ensembles recevrait deux types selon l'ordre
  // des tests dans `typeDeFeuille` : l'intersection doit rester vide.
  assert.deepEqual([...familles].filter((id) => graisses.has(id)), []);
  assert.ok(familles.size > 0 && graisses.size > 0);
});
