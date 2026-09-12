/**
 * Les valeurs Figma de mouvement traduites en DTCG : une variable `TIMING`
 * devient une durée, une variable `EASING` une courbe cubique.
 *
 * Figma compte une `TIMING` en secondes. L'export recopie ce nombre sans le
 * convertir ni l'arrondir, pour qu'un second export du même fichier rende les
 * mêmes octets.
 *
 * Une `EASING` n'a de courbe que dans deux cas : `LINEAR`, dont les points
 * sont connus par définition, et `CUSTOM_CUBIC_BEZIER`, qui les publie. Les
 * douze autres membres de `MotionEasing.type`, ressorts et `HOLD` compris, ne
 * décrivent aucune courbe cubique que l'API expose. `easingsSansCourbe` les
 * relève avant la première feuille, et `packages/plugin/SPEC.md` dit ce que
 * l'export en fait.
 */
import type { CourbeDeToken, DureeDeToken } from '@ucm-kit/core/format';

import { firstVariableAlias } from '../variables';

/** Ce que la décision lit : l'index des variables exportées, et leurs collections. */
export type GrapheDesVariables = {
  collectionById: ReadonlyMap<string, VariableCollection>;
  variableById: ReadonlyMap<string, Variable>;
  pathById: ReadonlyMap<string, string>;
};

/**
 * Pourquoi une valeur `EASING` n'a pas de courbe.
 *
 * Les deux causes appellent deux gestes différents dans Figma, d'où la
 * distinction : `sans-courbe` demande de changer d'easing, `abscisse` de
 * ramener une poignée de la courbe personnalisée dans son intervalle.
 */
export type CauseSansCourbe = 'sans-courbe' | 'abscisse';

/** Un mode dont la valeur `EASING` n'a pas de courbe. */
export type ModeSansCourbe = { modeId: string; cause: CauseSansCourbe };

/** La durée d'une valeur `TIMING`, dans l'unité que Figma emploie. */
export function dureeDeToken(valeur: number): DureeDeToken {
  return { value: valeur, unit: 's' };
}

/** Vrai si la coordonnée est un nombre réel, donc ni `NaN` ni infinie. */
function estFini(coordonnee: unknown): coordonnee is number {
  return typeof coordonnee === 'number' && Number.isFinite(coordonnee);
}

/**
 * La courbe d'une valeur `EASING`, ou la cause de son absence.
 *
 * DTCG borne les abscisses à `[0, 1]` et laisse les ordonnées libres : une
 * courbe à dépassement, dont `y` sort de l'intervalle, est valide et passe.
 */
export function courbeDeToken(valeur: unknown): { courbe: CourbeDeToken } | { cause: CauseSansCourbe } {
  const easing = valeur as MotionEasing | undefined;
  if (easing?.type === 'LINEAR') return { courbe: [0, 0, 1, 1] };
  if (easing?.type !== 'CUSTOM_CUBIC_BEZIER') return { cause: 'sans-courbe' };

  const points = easing.easingFunctionCubicBezier;
  if (!points) return { cause: 'sans-courbe' };
  const { x1, y1, x2, y2 } = points;
  if (![x1, y1, x2, y2].every(estFini)) return { cause: 'sans-courbe' };
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return { cause: 'abscisse' };
  return { courbe: [x1, y1, x2, y2] };
}

/**
 * Les variables `EASING` qu'au moins un mode empêche de publier, et les modes
 * en cause.
 *
 * Une variable entière est relevée dès qu'un seul de ses modes n'a pas de
 * courbe : publier les autres modes laisserait la feuille incomplète sous un
 * type qui promet une courbe dans chacun. Un mode sans valeur et un mode qui
 * porte un alias ne sont pas relevés ici : l'export les traite déjà, le
 * premier par son avertissement de mode vide, le second en conservant la
 * référence.
 */
export function easingsSansCourbe(graphe: GrapheDesVariables): Map<string, ModeSansCourbe[]> {
  const releve = new Map<string, ModeSansCourbe[]>();

  for (const id of graphe.pathById.keys()) {
    const variable = graphe.variableById.get(id);
    if (!variable || variable.resolvedType !== 'EASING') continue;
    const collection = graphe.collectionById.get(variable.variableCollectionId);
    if (!collection) continue;

    const modes: ModeSansCourbe[] = [];
    for (const mode of collection.modes) {
      const valeur = variable.valuesByMode[mode.modeId];
      if (valeur === undefined || firstVariableAlias(valeur)) continue;
      const resultat = courbeDeToken(valeur);
      if ('cause' in resultat) modes.push({ modeId: mode.modeId, cause: resultat.cause });
    }
    if (modes.length > 0) releve.set(id, modes);
  }

  return releve;
}
