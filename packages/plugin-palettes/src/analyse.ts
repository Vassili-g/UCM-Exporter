/**
 * Ce que le moteur dit d'une palette, calculé dans l'interface sans
 * aller-retour avec le sandbox ([ENT-02]) : ses rampes ancrées, ses promesses,
 * les alertes qui la concernent, et l'ancrage de sa référence.
 * `presentation.ts` en fait les messages de l'onglet.
 */
import {
  alertesDePalette,
  alertesDesFonds,
  ancrageDe,
  compterManquees,
  confusionsDe,
  distanceDePalettes,
  estLibre,
  grilleDe,
  intensitesDe,
  partDeChroma,
  partsDe,
  rampesDe,
  referenceDe,
  verifierPromesses,
  type Alerte,
  type Ancrage,
  type Confusion,
  type Grille,
  type Intensite,
  type Palette,
  type PartsDePalette,
  type Promesse,
  type Rampes,
  type Recette,
} from 'ucm-couleur';

export interface AnalyseDePalette {
  /**
   * La liste de la palette et ses luminosités : la liste commune, ou sa liste
   * libre (W6). Les vues lisent les colonnes d'une palette ici, jamais dans la
   * recette : une liste libre de longueur différente y serait mal étiquetée.
   */
  readonly grille: Grille;
  /** Vrai pour une palette libre, sortie du modèle : ni rôles, ni garanties. */
  readonly libre: boolean;
  /** Les intensités que la palette porte, dans l'ordre de l'affichage ([ENT-14]) : toute vue les lit ici. */
  readonly intensites: readonly Intensite[];
  readonly rampes: Rampes;
  readonly promesses: readonly Promesse[];
  readonly manquees: number;
  /** Toutes les alertes qui concernent la palette, dans l'ordre du moteur : le rapport les garde toutes. */
  readonly alertes: readonly Alerte[];
  /** La part de chroma de la référence, et celles que la palette emploie, par intensité présente. */
  readonly part: number;
  readonly parts: PartsDePalette;
  /** L'intensité et les nuances qui portent la référence exacte ([MOT-17]). */
  readonly ancrage: Ancrage;
  /** Les nuances où Soft et Vivid se confondent, sur toute la liste : le repère ≈ ([PLA-15]). */
  readonly confusions: readonly Confusion[];
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
  return {
    grille: grilleDe(recette, palette),
    libre: estLibre(palette),
    intensites: intensitesDe(palette),
    rampes: rampesDe(recette, palette),
    promesses,
    manquees: compterManquees(promesses),
    alertes: alertesQuiLaConcernent(recette, palette),
    part: partDeChroma(referenceDe(palette), recette.gamut),
    parts: partsDe(recette, palette),
    ancrage: ancrageDe(recette, palette),
    confusions: confusionsDe(recette, palette),
  };
}
