/**
 * La fenêtre d'UCM Palettes : ses bornes et sa clé ([UI-01]). La lecture, le
 * rangement et le bornage sont ceux du socle.
 */
import * as socle from 'ucm-plugin-socle/src/fenetre';

/** La taille d'ouverture, tant que rien n'a été rangé. */
export const TAILLE_PAR_DEFAUT = { largeur: 600, hauteur: 720 } as const;

/** En dessous, les trois colonnes de la couleur de base et l'aperçu ne tiennent plus en largeur. */
export const TAILLE_MINIMALE = { largeur: 500, hauteur: 520 } as const;

/** Une clé propre au plugin, distincte de celle d'UCM Exporter. */
export const CLE_DE_LA_FENETRE = 'ucm-palettes/tailleFenetre';

const BORNES: socle.BornesFenetre = { defaut: TAILLE_PAR_DEFAUT, minimale: TAILLE_MINIMALE, cle: CLE_DE_LA_FENETRE };

/** Ramène une demande de taille dans les bornes d'UCM Palettes. */
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
