/**
 * Ce que l'interface fait des résultats du moteur, avant leur mise en mots :
 * les promesses manquées groupées par association, mode et état ([VER-06]),
 * la place de chaque alerte, et le réglage que chaque message ouvre
 * ([VER-15]). Pur : ni DOM, ni texte.
 */
import {
  ASSOCIATIONS,
  EMPLOIS,
  MODES,
  TABLE_DES_EMPLOIS,
  associationDe,
  cleDeLAssociation,
  decalagesDeLEmploi,
  etatDeLaPaire,
  type Alerte,
  type Association,
  type Emploi,
  type EtatDePaire,
  type Mode,
  type Palette,
  type Promesse,
  aUneIntensite,
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
  | 'intensites-communes'
  | 'ajuster-reference';

/** Les cibles qui ouvrent les Réglages communs. */
export const CIBLES_COMMUNES: readonly CibleDAction[] = ['luminosite-commune', 'fonds', 'intensites-communes'];

/** Une association, un mode et un état où au moins une intensité manque sa promesse. */
export interface GroupeDePromesses {
  readonly association: Association;
  readonly mode: Mode;
  readonly etat: EtatDePaire;
  readonly seuil: number;
  /** Le résultat de chaque intensité présente, dans l'ordre du moteur, tenu ou manqué : le message les montre toutes. */
  readonly resultats: readonly Promesse[];
  /** Le nombre de contrôles manqués du groupe : le compteur compte les contrôles. */
  readonly manquees: number;
}

/**
 * Les groupes de promesses manquées, par mode, puis dans l'ordre des
 * associations, puis par état. Deux intensités en échec sur la même paire font
 * un groupe et comptent deux contrôles.
 */
export function groupesManques(promesses: readonly Promesse[]): GroupeDePromesses[] {
  const groupes: GroupeDePromesses[] = [];
  for (const mode of MODES) {
    for (const association of ASSOCIATIONS) {
      const cle = cleDeLAssociation(association);
      const ici = promesses.filter((promesse) => promesse.mode === mode && cleDeLAssociation(associationDe(promesse.paire)) === cle);
      const etats = [...new Set(ici.map((promesse) => etatDeLaPaire(promesse.paire)))].sort((a, b) => a - b);
      for (const etat of etats) {
        const resultats = ici.filter((promesse) => etatDeLaPaire(promesse.paire) === etat);
        const manquees = resultats.filter((promesse) => promesse.verdict === 'manquee').length;
        if (manquees > 0) groupes.push({ association, mode, etat, seuil: resultats[0].seuil, resultats, manquees });
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

/** La carte de l'onglet Palettes sous laquelle un message se lit. */
export type CarteDuMessage = 'couleur-de-base' | 'apercu' | 'derive';

/**
 * La carte sous laquelle un message se lit : celle du premier réglage qu'il
 * ouvre. Un message sur les fonds, la luminosité ou les promesses concerne
 * l'aperçu.
 */
export function carteDuMessage(cibles: readonly CibleDAction[]): CarteDuMessage {
  if (cibles[0] === 'reference') return 'couleur-de-base';
  if (cibles[0] === 'derive') return 'derive';
  return 'apercu';
}

/**
 * Les réglages qu'une promesse manquée ouvre : l'intensité et la dérive de la
 * palette, puis la luminosité commune, qui touche toutes les palettes, et
 * enfin l’ajustement de la référence, qui ne touche que sa luminosité (W7.1).
 * Une palette à une intensité n'a pas de carte Intensités ([ENT-14]).
 */
export function ciblesDeLaPromesse(palette: Palette): CibleDAction[] {
  const suite: CibleDAction[] = ['derive', 'luminosite-commune', 'ajuster-reference'];
  return aUneIntensite(palette) ? suite : ['intensites-palette', ...suite];
}

/**
 * Le réglage qu'une alerte ouvre, selon sa cause et la portée du réglage. Une
 * palette aux intensités propres ne suit plus les intensités communes : le
 * geste utile est alors le sien.
 */
export function ciblesDeLAlerte(alerte: Alerte, palette: Palette | null): CibleDAction[] {
  switch (alerte.code) {
    case 'profils-confondus':
      // Une palette de base forcée garde l'intensité de sa référence : son geste utile est dans la palette.
      return palette?.parts?.origine === 'designer' || palette?.base ? ['intensites-palette'] : ['intensites-communes'];
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

/**
 * Une accolade de l'aperçu ([UI-04]) : les rôles qui visent les mêmes
 * nuances, et les colonnes qu'elle couvre. La colonne `-1` est celle de la
 * pastille `on-solid`, `-2` celle du nom des profils ; `0` est la première
 * nuance. Le libellé occupe des colonnes libres de sa ligne, sans chevaucher
 * son voisin.
 */
export interface Accolade {
  readonly emplois: readonly Emploi[];
  readonly debut: number;
  readonly fin: number;
  readonly libelle: { readonly debut: number; readonly fin: number; readonly alignement: 'center' | 'start' | 'end' };
}

/**
 * Les accolades de l'aperçu, sur deux lignes au plus. Les rôles qui partent de
 * la même nuance se réunissent, sur l'union de leurs plages : `focus` n'a pas
 * d'état, et se lit avec `border-control` ; chaque accolade prend la première ligne où elle ne
 * chevauche aucune autre, dans l'ordre de `EMPLOIS`. Un libellé s'étend
 * autant à gauche qu'à droite de son accolade quand il le peut, et reste
 * centré ; sinon il prend toute sa zone libre, aligné du côté de l'accolade.
 */
export function accoladesDe(crans: readonly number[]): Accolade[][] {
  const groupes: { emplois: Emploi[]; debut: number; fin: number }[] = [];
  for (const emploi of EMPLOIS) {
    const cible = TABLE_DES_EMPLOIS[emploi];
    let debut = -1;
    let fin = -1;
    if (cible !== 'fond') {
      debut = crans.indexOf(cible);
      if (debut < 0) continue;
      fin = Math.min(crans.length - 1, debut + Math.max(...decalagesDeLEmploi(emploi)));
    }
    const meme = groupes.find((groupe) => groupe.debut === debut);
    if (meme) {
      meme.emplois.push(emploi);
      meme.fin = Math.max(meme.fin, fin);
    }
    else groupes.push({ emplois: [emploi], debut, fin });
  }
  const lignes: { emplois: Emploi[]; debut: number; fin: number }[][] = [];
  for (const groupe of groupes) {
    // Une colonne libre de chaque côté : le libellé d'une accolade d'une colonne a la place de se centrer.
    const libre = lignes.find((ligne) => ligne.every((autre) => groupe.fin < autre.debut - 1 || groupe.debut > autre.fin + 1));
    if (libre) libre.push(groupe);
    else lignes.push([groupe]);
  }
  return lignes.map((ligne) => {
    const triee = [...ligne].sort((a, b) => a.debut - b.debut);
    let borne = -2;
    return triee.map((groupe, rang): Accolade => {
      const suivante = triee[rang + 1];
      const zone = { debut: borne, fin: suivante ? suivante.debut - 1 : crans.length - 1 };
      const marge = Math.min(groupe.debut - zone.debut, zone.fin - groupe.fin);
      const libelle = marge > 0
        ? { debut: groupe.debut - marge, fin: groupe.fin + marge, alignement: 'center' as const }
        : { ...zone, alignement: groupe.debut === zone.debut ? ('start' as const) : ('end' as const) };
      borne = libelle.fin + 1;
      return { ...groupe, libelle };
    });
  });
}
