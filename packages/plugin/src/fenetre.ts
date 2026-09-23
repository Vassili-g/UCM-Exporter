/**
 * La fenêtre d'UCM Exporter : ses bornes et sa clé. La lecture, le rangement
 * et le bornage sont ceux du socle.
 */
import * as socle from 'ucm-plugin-socle/src/fenetre';

export type { TailleFenetre } from 'ucm-plugin-socle/src/fenetre';

/** La taille d'ouverture, tant que rien n'a été rangé. */
export const TAILLE_PAR_DEFAUT = { largeur: 380, hauteur: 500 } as const;

/** En dessous, l'interface cesse d'être lisible : bien avant le 70 × 0 de Figma. */
export const TAILLE_MINIMALE = { largeur: 320, hauteur: 320 } as const;

const BORNES: socle.BornesFenetre = { defaut: TAILLE_PAR_DEFAUT, minimale: TAILLE_MINIMALE, cle: 'tailleFenetre' };

/** Ramène une demande de taille dans les bornes d'UCM Exporter. */
export function tailleValide(brut: Partial<socle.TailleFenetre> | null | undefined): socle.TailleFenetre {
  return socle.tailleValide(brut, BORNES);
}

/** La taille rangée la fois précédente, ou celle par défaut. */
export function lireTaille(): Promise<socle.TailleFenetre> {
  return socle.lireTaille(BORNES);
}

/** Range la taille pour la prochaine ouverture, après l'avoir bornée. */
export function rangerTaille(taille: socle.TailleFenetre): Promise<void> {
  return socle.rangerTaille(taille, BORNES);
}
