/**
 * La taille de la fenêtre du plugin : ses bornes, sa lecture, son rangement.
 *
 * **Ce que la plateforme impose, vérifié avant d'écrire quoi que ce soit
 * (U1.10).** `figma.ui.resize` accepte tout au-dessus de **70 × 0**, et la
 * documentation ne décrit **aucun redimensionnement natif** : une fenêtre de
 * plugin ne se redimensionne que si le plugin dessine lui-même une poignée. Les
 * deux faits comptent — le premier dit que la plateforme ne protège pas d'une
 * fenêtre inutilisable, le second qu'il faut en ajouter une à l'écran.
 *
 * **Les bornes de CE plugin sont donc les siennes.** 70 px de large ne montre
 * aucun de ses libellés ; le minimum ci-dessous est celui à partir duquel
 * l'interface reste lisible, et c'est la taille que le point (c) du protocole
 * de relecture (CONTRIBUTING.md) demande de regarder.
 *
 * La taille est rangée dans `figma.clientStorage` : elle vit sur la machine du
 * designer, jamais dans le document.
 */

/** La taille d'ouverture, tant que rien n'a été rangé. */
export const TAILLE_PAR_DEFAUT = { largeur: 380, hauteur: 500 } as const;

/** En dessous, l'interface cesse d'être lisible — bien avant le 70 × 0 de Figma. */
export const TAILLE_MINIMALE = { largeur: 320, hauteur: 320 } as const;

export type TailleFenetre = { largeur: number; hauteur: number };

const CLE_TAILLE = 'tailleFenetre';

/**
 * Ramène une demande de taille dans les bornes.
 *
 * Elle est PURE et exportée pour être testée : le reste de ce fichier ne peut
 * l'être qu'avec un `figma` en vie, et c'est ici que vit la seule décision —
 * ce qui sort des bornes, et ce qu'on fait d'une valeur qui n'est pas un
 * nombre. Une taille non finie rendrait `figma.ui.resize` incapable de lever
 * une erreur utile : elle retombe sur le défaut.
 */
export function tailleValide(brut: Partial<TailleFenetre> | null | undefined): TailleFenetre {
  const borner = (valeur: unknown, minimum: number, defaut: number): number => {
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return defaut;
    return Math.max(minimum, Math.round(valeur));
  };
  return {
    largeur: borner(brut?.largeur, TAILLE_MINIMALE.largeur, TAILLE_PAR_DEFAUT.largeur),
    hauteur: borner(brut?.hauteur, TAILLE_MINIMALE.hauteur, TAILLE_PAR_DEFAUT.hauteur),
  };
}

/** La taille rangée la fois précédente, ou celle par défaut. */
export async function lireTaille(): Promise<TailleFenetre> {
  const rangee = await figma.clientStorage.getAsync(CLE_TAILLE);
  return tailleValide(rangee as Partial<TailleFenetre> | undefined);
}

/** Range la taille pour la prochaine ouverture, après l'avoir bornée. */
export async function rangerTaille(taille: TailleFenetre): Promise<void> {
  await figma.clientStorage.setAsync(CLE_TAILLE, tailleValide(taille));
}
