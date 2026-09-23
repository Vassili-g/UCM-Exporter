/**
 * Ce que la configuration de la recette modifie (section 8.3) : les deux
 * courbes, les parts des profils et le seuil des profils confondus. La liste
 * des crans ne s'y modifie pas ([ENT-08]).
 */
import type { Mode, Profil, Recette } from 'ucm-couleur';

/** Un champ de la configuration. */
export type ChampDeConfiguration =
  | { readonly courbe: Mode; readonly rang: number }
  | { readonly part: Profil }
  | { readonly seuil: 'profilsConfondus' };

/** Un nombre saisi, à virgule ou à point ; `null` pour une saisie qui n'en est pas un. */
export function lireNombre(saisie: string): number | null {
  const nettoyee = saisie.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(nettoyee)) return null;
  return Number(nettoyee);
}

/** La recette où le champ prend la valeur, sans validation : `validerRecette` en juge. */
export function poserValeur(recette: Recette, champ: ChampDeConfiguration, valeur: number): Recette {
  if ('courbe' in champ) {
    const courbe = [...recette.courbes[champ.courbe]];
    courbe[champ.rang] = valeur;
    return { ...recette, courbes: { ...recette.courbes, [champ.courbe]: courbe } };
  }
  if ('part' in champ) {
    return { ...recette, profils: { ...recette.profils, [champ.part]: { part: valeur } } };
  }
  return { ...recette, seuils: { ...recette.seuils, profilsConfondus: valeur } };
}

/** La valeur que le champ porte dans la recette. */
export function valeurDe(recette: Recette, champ: ChampDeConfiguration): number {
  if ('courbe' in champ) return recette.courbes[champ.courbe][champ.rang];
  if ('part' in champ) return recette.profils[champ.part].part;
  return recette.seuils.profilsConfondus;
}

/**
 * Le nombre de palettes qu'un groupe de champs modifie ([ENT-07]). Une courbe
 * les modifie toutes. Une part de profil épargne les palettes qui portent
 * leurs parts propres. Le seuil des profils confondus épargne les palettes aux
 * parts `grise`, pour lesquelles l'alerte se tait ([ENT-09]).
 */
export function palettesModifiees(recette: Recette, groupe: 'courbes' | 'parts' | 'profilsConfondus'): number {
  if (groupe === 'courbes') return recette.palettes.length;
  if (groupe === 'parts') return recette.palettes.filter((palette) => !palette.parts).length;
  return recette.palettes.filter((palette) => palette.parts?.origine !== 'grise').length;
}
