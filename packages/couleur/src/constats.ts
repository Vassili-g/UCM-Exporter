/**
 * Les sévérités de la section 11.4 et l'ordre dans lequel l'interface les
 * montre : bloquants, promesses manquées, alertes, notices.
 */
import type { Alerte } from './alertes';

export type Severite = 'bloquant' | 'promesse' | 'alerte' | 'notice';

/** L'ordre d'affichage, du premier au dernier rang. */
export const ORDRE_DES_SEVERITES: readonly Severite[] = ['bloquant', 'promesse', 'alerte', 'notice'];

/** Une référence plus vive que `vivid` est une notice : aucun réglage ne la lève ([VER-10]). */
export function severiteDeLAlerte(alerte: Alerte): 'alerte' | 'notice' {
  return alerte.code === 'reference-plus-vive' ? 'notice' : 'alerte';
}

/**
 * Trie des constats par sévérité, sans changer l'ordre de deux constats de
 * même sévérité : l'ordre d'arrivée reste celui de la recette et des paires.
 */
export function trierParSeverite<T extends { readonly severite: Severite }>(constats: readonly T[]): T[] {
  return constats
    .map((constat, rang) => ({ constat, rang }))
    .sort((a, b) =>
      ORDRE_DES_SEVERITES.indexOf(a.constat.severite) - ORDRE_DES_SEVERITES.indexOf(b.constat.severite)
      || a.rang - b.rang)
    .map(({ constat }) => constat);
}
