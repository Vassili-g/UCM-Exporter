/**
 * Ce que la configuration de la recette modifie (section 8.3) : les deux
 * courbes, les parts des profils, les deux fonds et les cinq seuils. La liste
 * des crans ne s'y modifie pas ([ENT-08]).
 */
import { ajusterPartsGrises, ecrireHexa, lireHexa, type Mode, type Profil, type Recette, type Seuils } from 'ucm-couleur';

/** Un champ numérique de la configuration. */
export type ChampDeConfiguration =
  | { readonly courbe: Mode; readonly rang: number }
  | { readonly part: Profil }
  | { readonly seuil: keyof Seuils };

/** Les groupes de champs, chacun avec le compte des palettes qu'il modifie ([ENT-07]). */
export type GroupeDeConfiguration = 'courbes' | 'parts' | 'fonds' | 'contraste' | 'profilsConfondus' | 'palettesProches' | 'chromaGrise';

/**
 * Un nombre saisi, à virgule ou à point, signe moins ordinaire ou
 * typographique ; `null` pour une saisie qui n'en est pas un.
 */
export function lireNombre(saisie: string): number | null {
  const nettoyee = saisie.trim().replace(',', '.').replace('−', '-');
  if (!/^-?\d+(\.\d+)?$/.test(nettoyee)) return null;
  return Number(nettoyee);
}

/**
 * La recette où le champ prend la valeur, sans validation : `validerRecette` en
 * juge. Le seuil de chroma grise décide quelles palettes portent des parts
 * `grise` ([ENT-09]) : le changer les recalcule toutes.
 */
export function poserValeur(recette: Recette, champ: ChampDeConfiguration, valeur: number): Recette {
  if ('courbe' in champ) {
    const courbe = [...recette.courbes[champ.courbe]];
    courbe[champ.rang] = valeur;
    return { ...recette, courbes: { ...recette.courbes, [champ.courbe]: courbe } };
  }
  if ('part' in champ) {
    return { ...recette, profils: { ...recette.profils, [champ.part]: { part: valeur } } };
  }
  const suivante = { ...recette, seuils: { ...recette.seuils, [champ.seuil]: valeur } };
  if (champ.seuil !== 'chromaGrise') return suivante;
  return { ...suivante, palettes: suivante.palettes.map((palette) => ajusterPartsGrises(suivante, palette)) };
}

/** La valeur que le champ porte dans la recette. */
export function valeurDe(recette: Recette, champ: ChampDeConfiguration): number {
  if ('courbe' in champ) return recette.courbes[champ.courbe][champ.rang];
  if ('part' in champ) return recette.profils[champ.part].part;
  return recette.seuils[champ.seuil];
}

/** La recette où le fond du mode prend l'hexa saisi, écrit en majuscules ; `null` pour une saisie qui n'est pas une couleur. */
export function poserFond(recette: Recette, mode: Mode, saisie: string): Recette | null {
  const couleur = lireHexa(saisie);
  return couleur ? { ...recette, fonds: { ...recette.fonds, [mode]: ecrireHexa(couleur) } } : null;
}

/**
 * Le nombre de palettes qu'un groupe de champs modifie ([ENT-07]). Courbes,
 * fonds et seuils de contraste les modifient toutes. Une part de profil
 * épargne les palettes qui portent leurs parts propres. Le seuil des profils
 * confondus épargne les palettes aux parts `grise`, pour lesquelles l'alerte
 * se tait ; celui de chroma grise, les palettes aux parts du designer, qu'il
 * ne touche jamais. Le seuil des palettes proches compare deux palettes : seul,
 * une palette n'en a aucune à comparer.
 */
export function palettesModifiees(recette: Recette, groupe: GroupeDeConfiguration): number {
  const { palettes } = recette;
  switch (groupe) {
    case 'parts': return palettes.filter((palette) => !palette.parts).length;
    case 'profilsConfondus': return palettes.filter((palette) => palette.parts?.origine !== 'grise').length;
    case 'chromaGrise': return palettes.filter((palette) => palette.parts?.origine !== 'designer').length;
    case 'palettesProches': return palettes.length < 2 ? 0 : palettes.length;
    default: return palettes.length;
  }
}
