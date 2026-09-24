/**
 * Ce que l'onglet Palettes montre d'une palette, calculé par le moteur sans
 * aller-retour avec le sandbox ([ENT-02]) : ses rampes, ses promesses, ses
 * alertes et ses notices, dans l'ordre des sévérités (section 11.4).
 */
import {
  alertesDePalette,
  alertesDesFonds,
  ancrageDe,
  compterManquees,
  distanceDePalettes,
  partDeChroma,
  partsDe,
  rampesDe,
  referenceDe,
  severiteDeLAlerte,
  trierParSeverite,
  verifierPromesses,
  type Alerte,
  type Ancrage,
  type Palette,
  type Parts,
  type Promesse,
  type Rampes,
  type Recette,
} from 'ucm-couleur';

/** Une ligne de la liste des constats, avant sa mise en mots. */
export type ConstatDePalette =
  | { readonly severite: 'promesse'; readonly promesse: Promesse }
  | { readonly severite: 'alerte' | 'notice'; readonly alerte: Alerte };

export interface AnalyseDePalette {
  readonly rampes: Rampes;
  readonly promesses: readonly Promesse[];
  readonly manquees: number;
  readonly constats: readonly ConstatDePalette[];
  /** La part de chroma de la référence, et celles que la palette emploie. */
  readonly part: number;
  readonly parts: Parts;
  /** Le profil et les nuances qui portent la référence exacte ([MOT-17]). */
  readonly ancrage: Ancrage;
}

/**
 * Les alertes qui concernent la palette : les siennes, celles des fonds, et
 * chaque palette proche d'elle. La distance ne se calcule que contre elle, pas
 * entre toutes les paires de la recette.
 */
function alertesQuiLaConcernent(recette: Recette, palette: Palette): Alerte[] {
  const alertes = [...alertesDePalette(recette, palette), ...alertesDesFonds(recette)];
  for (const autre of recette.palettes) {
    if (autre.id === palette.id) continue;
    const distance = distanceDePalettes(recette, palette, autre);
    if (distance !== null && distance < recette.seuils.palettesProches) {
      alertes.push({ code: 'palettes-proches', palettes: [palette.id, autre.id], distance, seuil: recette.seuils.palettesProches });
    }
  }
  return alertes;
}

/** Analyse une palette d'une recette validée. */
export function analyserPalette(recette: Recette, palette: Palette): AnalyseDePalette {
  const promesses = verifierPromesses(recette, palette);
  const constats: ConstatDePalette[] = [
    ...promesses.filter((promesse) => promesse.verdict === 'manquee')
      .map((promesse) => ({ severite: 'promesse' as const, promesse })),
    ...alertesQuiLaConcernent(recette, palette).map((alerte) => ({ severite: severiteDeLAlerte(alerte), alerte })),
  ];
  return {
    rampes: rampesDe(recette, palette),
    promesses,
    manquees: compterManquees(promesses),
    constats: trierParSeverite(constats),
    part: partDeChroma(referenceDe(palette), recette.gamut),
    parts: partsDe(recette, palette),
    ancrage: ancrageDe(recette, palette),
  };
}
