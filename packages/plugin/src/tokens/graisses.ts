/**
 * Le type d'une graisse stockée en `STRING` : `number` ou `string`, décidé une
 * fois par variable, sur tous ses modes et tout son graphe d'alias, avant que
 * l'export n'écrive une seule feuille.
 *
 * Figma réserve le scope `FONT_WEIGHT` aux `FLOAT` : une graisse `STRING` ne se
 * reconnaît qu'à son chemin et à ses valeurs. `poidsDeGraisse` du kit est la
 * seule table des noms, et ce module ne la recopie pas.
 * packages/plugin/SPEC.md énumère les règles appliquées ici.
 */
import { poidsDeGraisse } from '@ucm-kit/core/format';

import { firstVariableAlias } from '../variables';

/** Ce que la décision lit : l'index des variables exportées, et leurs collections. */
export type GrapheDesVariables = {
  collectionById: ReadonlyMap<string, VariableCollection>;
  variableById: ReadonlyMap<string, Variable>;
  pathById: ReadonlyMap<string, string>;
};

/** Vrai si un segment du chemin, tirets retirés, nomme la graisse. */
function cheminDeGraisse(chemin: string): boolean {
  return chemin.split('.').some((segment) => segment.replace(/-/g, '') === 'fontweight');
}

/**
 * Les identifiants des variables `STRING` que l'export publie en `number`.
 *
 * Une variable l'est quand chacun de ses modes porte un alias vers une variable
 * déjà `number`, ou un nom que `poidsDeGraisse` reconnaît ; un littéral exige en
 * plus un chemin de graisse. Un mode vide, une cible hors de l'index et une
 * valeur libre laissent la variable en `string`.
 *
 * La décision est mémorisée par variable. Une variable rencontrée pendant sa
 * propre décision est sur une boucle d'alias, que Figma refuse de créer : elle
 * reste `string`, comme chaque membre de la boucle, quel que soit l'ordre de
 * visite.
 */
export function graissesNumeriques(graphe: GrapheDesVariables): Set<string> {
  const decisions = new Map<string, boolean>();
  const enCours = new Set<string>();

  const decider = (id: string): boolean => {
    const variable = graphe.variableById.get(id);
    const chemin = graphe.pathById.get(id);
    const collection = variable && graphe.collectionById.get(variable.variableCollectionId);
    if (!variable || chemin === undefined || !collection || variable.resolvedType !== 'STRING') {
      return false;
    }
    if (collection.modes.length === 0) return false;

    let litteral = false;
    for (const mode of collection.modes) {
      const valeur = variable.valuesByMode[mode.modeId];
      if (valeur === undefined) return false;
      const alias = firstVariableAlias(valeur);
      if (alias) {
        if (!estNumerique(alias.id)) return false;
        continue;
      }
      if (poidsDeGraisse(valeur) === null) return false;
      litteral = true;
    }
    return !litteral || cheminDeGraisse(chemin);
  };

  function estNumerique(id: string): boolean {
    const connue = decisions.get(id);
    if (connue !== undefined) return connue;
    if (enCours.has(id)) return false;
    enCours.add(id);
    const decision = decider(id);
    enCours.delete(id);
    decisions.set(id, decision);
    return decision;
  }

  const graisses = new Set<string>();
  for (const id of graphe.pathById.keys()) {
    if (estNumerique(id)) graisses.add(id);
  }
  return graisses;
}
