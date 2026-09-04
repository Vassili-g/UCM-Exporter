/** Ce que le contrat cesse d'écrire, et ce qu'il continue d'écrire. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  CATALOGUES_DE_VUES,
  ENTREES_PROTEGEES,
  elideContract,
  elideNeutrals,
  estProtege,
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
  assert.deepEqual(
    elideNeutrals({ padding: { x: null, y: null } }),
    { padding: {} },
  );
});

test('sous un dictionnaire, une entrée vide survit : sa clé EST la donnée', () => {
  // Le cas qui a coûté un export. L'état par défaut n'a aucun sélecteur : son
  // descripteur vaut `{}` dès la sortie de `buildStateModel`. Le retirer ne
  // retire pas un silence, il retire l'ÉTAT — que `precedence` cite encore, et
  // qu'un consommateur refuserait alors comme valeur d'axe inconnue.
  const modele = { states: { default: {}, hover: { selector: ':hover' } }, precedence: ['default'] };
  assert.deepEqual(
    elideNeutrals(modele, 'stateModel'),
    modele,
  );
  // Une taille qui ne relie aucune dimension garde sa clé, pour la même raison.
  assert.deepEqual(
    elideNeutrals({ sizes: { big: {}, small: { gap: '{g}' } } }, 'structure'),
    { sizes: { big: {}, small: { gap: '{g}' } } },
  );
  // Hors dictionnaire, la même valeur vide disparaît : là, l'absence suffit.
  assert.deepEqual(elideNeutrals({ strokes: {} }, 'variants'), {});
});

test('estProtege distingue le chemin exact, pas un préfixe', () => {
  assert.equal(estProtege('stateModel.states.default'), true);
  assert.equal(estProtege('stateModel.states'), false);
  assert.equal(estProtege('stateModel.states.default.selector'), false);
  assert.equal(estProtege('viewPaintPlacements.pp1.fills.background'), true);
  assert.equal(estProtege('viewPaintPlacements.pp1.fills'), false);
});

test('ENTREES_PROTEGEES couvre tous les dictionnaires du schéma qui peuvent être vides', () => {
  // La preuve que la liste est complète, et qu'elle le restera : elle est
  // confrontée au JSON Schema, pas à une relecture de `types.ts`. Un
  // `Record<string, X>` ajouté demain, dont `X` peut être vide, fait échouer ce
  // test au lieu de faire disparaître une entrée en silence.
  // Le schéma appartient au kit, et se lit par sa carte `exports`.
  const schema = JSON.parse(
    readFileSync(createRequire(import.meta.url).resolve('@ucm/kit/schema'), 'utf8'),
  ) as Record<string, any>;
  const deref = (noeud: any): any => {
    let courant = noeud;
    for (let garde = 0; courant && courant.$ref && garde < 20; garde += 1) {
      courant = schema.definitions[String(courant.$ref).replace('#/definitions/', '')];
    }
    return courant;
  };
  /** Vrai si ce schéma décrit une valeur qui peut être `{}` ou `[]`. */
  const peutEtreVide = (noeud: any): boolean => {
    const cible = deref(noeud);
    if (!cible) return false;
    if (cible.type === 'array') return true;
    const branches = cible.anyOf ?? cible.oneOf;
    if (branches) return branches.some(peutEtreVide);
    if (cible.type !== 'object') return false;
    if (cible.additionalProperties) return true;
    return (cible.required ?? []).length === 0;
  };
  const manquants: string[] = [];
  const vus = new Set<string>();
  const parcourir = (noeud: any, chemin: string, profondeur: number): void => {
    if (profondeur > 8) return;
    const cible = deref(noeud);
    if (!cible) return;
    const signature = `${chemin}|${JSON.stringify(noeud)}`;
    if (vus.has(signature)) return;
    vus.add(signature);
    for (const branche of cible.anyOf ?? cible.oneOf ?? []) {
      parcourir(branche, chemin, profondeur + 1);
    }
    if (cible.items) parcourir(cible.items, chemin, profondeur + 1);
    for (const [cle, sous] of Object.entries(cible.properties ?? {})) {
      parcourir(sous, chemin ? `${chemin}.${cle}` : cle, profondeur + 1);
    }
    const valeurs = cible.additionalProperties;
    if (valeurs && typeof valeurs === 'object') {
      const cheminDEntree = `${chemin}.*`;
      if (peutEtreVide(valeurs) && !estProtege(cheminDEntree)) manquants.push(cheminDEntree);
      parcourir(valeurs, cheminDEntree, profondeur + 1);
    }
  };
  parcourir(schema.definitions.Contract, '', 0);

  assert.deepEqual(
    [...new Set(manquants)].sort(),
    [],
    'ces entrées de dictionnaire peuvent être vides et ne sont pas protégées',
  );
  // Et l'inverse : pas de motif mort, qui laisserait croire à une garde.
  assert.ok(ENTREES_PROTEGEES.length > 0);
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
