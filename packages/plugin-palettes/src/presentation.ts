/**
 * Ce que l'interface fait des résultats du moteur, avant leur mise en mots :
 * les promesses manquées groupées par association, mode et état ([VER-06]),
 * la place de chaque alerte, et le réglage que chaque message ouvre
 * ([VER-15]). Pur : ni DOM, ni texte.
 */
import {
  ASSOCIATIONS,
  MODES,
  associationDe,
  cleDeLAssociation,
  etatDeLaPaire,
  type Alerte,
  type Association,
  type EtatDePaire,
  type Mode,
  type Palette,
  type Promesse,
} from 'ucm-couleur';

/**
 * Le réglage qu'un message ouvre et focalise ([VER-15]). Les trois premiers
 * sont dans l'onglet Palettes, les trois derniers dans les Réglages communs.
 */
export type CibleDAction =
  | 'reference'
  | 'intensites-palette'
  | 'derive'
  | 'luminosite-commune'
  | 'fonds'
  | 'intensites-communes';

/** Les cibles qui ouvrent les Réglages communs. */
export const CIBLES_COMMUNES: readonly CibleDAction[] = ['luminosite-commune', 'fonds', 'intensites-communes'];

/** Une association, un mode et un état où au moins un profil manque sa promesse. */
export interface GroupeDePromesses {
  readonly association: Association;
  readonly mode: Mode;
  readonly etat: EtatDePaire;
  readonly seuil: number;
  /** Le résultat de chaque profil, tenu ou manqué : le message les montre tous les deux. */
  readonly soft: Promesse;
  readonly vivid: Promesse;
  /** Le nombre de contrôles manqués du groupe, 1 ou 2 : le compteur compte les contrôles. */
  readonly manquees: number;
}

/**
 * Les groupes de promesses manquées, par mode, puis dans l'ordre des
 * associations, puis par état. Deux profils en échec sur la même paire font un
 * groupe et comptent deux contrôles.
 */
export function groupesManques(promesses: readonly Promesse[]): GroupeDePromesses[] {
  const groupes: GroupeDePromesses[] = [];
  for (const mode of MODES) {
    for (const association of ASSOCIATIONS) {
      const cle = cleDeLAssociation(association);
      const ici = promesses.filter((promesse) => promesse.mode === mode && cleDeLAssociation(associationDe(promesse.paire)) === cle);
      const etats = [...new Set(ici.map((promesse) => etatDeLaPaire(promesse.paire)))].sort((a, b) => a - b);
      for (const etat of etats) {
        const duProfil = (profil: 'soft' | 'vivid') => ici.find((promesse) => promesse.profil === profil && etatDeLaPaire(promesse.paire) === etat);
        const soft = duProfil('soft');
        const vivid = duProfil('vivid');
        if (!soft || !vivid) throw new Error(`Promesses incomplètes pour ${cle}, ${mode}, état ${etat}.`);
        const manquees = [soft, vivid].filter((promesse) => promesse.verdict === 'manquee').length;
        if (manquees > 0) groupes.push({ association, mode, etat, seuil: soft.seuil, soft, vivid, manquees });
      }
    }
  }
  return groupes;
}

/**
 * Où l'onglet Palettes montre une alerte ([VER-10], [VER-11]) : près du
 * réglage d'intensité pour ce qui compare les intensités, dans la liste des
 * points à vérifier pour le reste. Le rapport les garde toutes.
 */
export function placeDeLAlerte(alerte: Alerte): 'intensite' | 'liste' {
  return alerte.code === 'profils-confondus' || alerte.code === 'reference-plus-terne' || alerte.code === 'reference-plus-vive'
    ? 'intensite'
    : 'liste';
}

/**
 * Les réglages qu'une promesse manquée ouvre : l'intensité et la dérive de la
 * palette, puis la luminosité commune, qui touche toutes les palettes.
 */
export function ciblesDeLaPromesse(): CibleDAction[] {
  return ['intensites-palette', 'derive', 'luminosite-commune'];
}

/**
 * Le réglage qu'une alerte ouvre, selon sa cause et la portée du réglage. Une
 * palette aux intensités propres ne suit plus les intensités communes : le
 * geste utile est alors le sien.
 */
export function ciblesDeLAlerte(alerte: Alerte, palette: Palette | null): CibleDAction[] {
  switch (alerte.code) {
    case 'profils-confondus':
      return palette?.parts?.origine === 'designer' ? ['intensites-palette'] : ['intensites-communes'];
    case 'reference-plus-terne':
    case 'reference-plus-vive':
      return ['intensites-palette'];
    case 'palettes-proches':
    case 'couleur-presque-grise':
      return ['reference'];
    case 'reference-hors-rampe':
      return ['derive', 'reference'];
    case 'fond-hors-courbe':
      return ['fonds'];
  }
}
