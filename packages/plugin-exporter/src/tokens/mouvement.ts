/**
 * Les valeurs Figma de mouvement traduites en DTCG : une variable `TIMING`
 * devient une durée, une variable `EASING` une courbe cubique.
 *
 * Figma compte une `TIMING` en secondes. L'export recopie ce nombre sans le
 * convertir ni l'arrondir, pour qu'un second export du même fichier rende les
 * mêmes octets.
 *
 * Une `EASING` a une courbe dès que l'API publie ses quatre points, quel que
 * soit le nom du préréglage, et `LINEAR` en a une par définition. Un ressort
 * n'en a pas, `HOLD` non plus, et un préréglage dont l'API tait les points
 * n'en donne aucune. `easingsSansCourbe` relève ces cas avant la première
 * feuille, et `packages/plugin-exporter/SPEC.md` dit ce que l'export en fait.
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
 * Chaque cause est un fait observé sur la valeur que l'API rend, et non une
 * catégorie du sélecteur de Figma : un préréglage nommé se reconnaît à
 * l'absence de points, un ressort au champ que Figma joint. Les cinq causes
 * appellent cinq phrases différentes, et trois gestes différents.
 */
export type CauseSansCourbe = 'preregle' | 'ressort' | 'tenue' | 'points' | 'abscisse';

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

  // Un ressort passe avant les points : la trajectoire d'un ressort n'est pas
  // cubique, et des points joints à une telle valeur ne la décriraient pas.
  if (easing?.type === 'CUSTOM_SPRING' || easing?.easingFunctionSpring) return { cause: 'ressort' };
  if (easing?.type === 'HOLD') return { cause: 'tenue' };

  // `easingFunctionCubicBezier` est optionnel sur `MotionEasing` quel que soit
  // le `type` : un préréglage dont Figma publierait les points donne donc sa
  // courbe, au lieu d'être écarté sur son seul nom.
  const points = easing?.easingFunctionCubicBezier;
  if (points) {
    const { x1, y1, x2, y2 } = points;
    if (![x1, y1, x2, y2].every(estFini)) return { cause: 'points' };
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return { cause: 'abscisse' };
    return { courbe: [x1, y1, x2, y2] };
  }

  if (easing?.type === 'LINEAR') return { courbe: [0, 0, 1, 1] };
  if (easing?.type === 'CUSTOM_CUBIC_BEZIER') return { cause: 'points' };
  return { cause: 'preregle' };
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
