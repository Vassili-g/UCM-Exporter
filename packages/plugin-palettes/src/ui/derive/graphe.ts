/**
 * Le graphe de l'éditeur de dérive, en SVG ([DER-01] à [DER-05], [ARC-08]) :
 * la ligne brisée de chaque profil, le pivot, les deux poignées, puis la bande
 * de teintes et la rampe, alignées sur les onze colonnes des crans.
 *
 * Les couleurs de trait viennent des rôles de la feuille ; seules les couleurs
 * des crans, qui sont des données, s'écrivent dans le SVG.
 */
import {
  PROFILS,
  boutsDe,
  fabriquerCran,
  normaliserTeinte,
  rgb8VersOklch,
  referenceDe,
  teinteA,
  type Ancrage,
  type Cran,
  type Grille,
  type Palette,
  type Profil,
  type Recette,
} from 'ucm-couleur';

import { abscisse, ligneBrisee, ordonnee, reperes, type Cadre } from './geometrie';
import { NOM_DU_PROFIL, TEXTES_DE_LA_DERIVE, etiquetteDePoignee, graduation, infobulleDuPivot, valeurDePoignee } from '../textes';

const SVG = 'http://www.w3.org/2000/svg';

/** Le viewBox : 396 unités, la largeur utile de la fenêtre minimale, pour 24 px par cran au moins ([DER-16]). */
export const CADRE: Cadre = { largeur: 396, hauteur: 150, gauche: 36, droite: 8, haut: 10, bas: 10 };
const Y_CRANS = 164;
const Y_BANDE = 172;
const Y_RAMPE = 192;
const HAUTEUR_DE_CASE = 16;
/** La hauteur du viewBox : un glisser convertit l'ordonnée du pointeur à cette échelle. */
export const HAUTEUR_TOTALE = Y_RAMPE + HAUTEUR_DE_CASE;

/**
 * La clarté à laquelle la bande peint chaque teinte : celle d'un cran moyen,
 * où la chroma de `vivid` montre la teinte sans la noyer dans le blanc ou le
 * noir ([DER-04]).
 */
const CLARTE_DE_LA_BANDE = 0.7;

/** Ce que le graphe dessine. */
export interface EntreesDuGraphe {
  readonly recette: Recette;
  readonly palette: Palette;
  /** Le profil dont les poignées se règlent. */
  readonly profil: Profil;
  /** La rampe Light du profil réglé, peinte sous la bande ([DER-04]). */
  readonly rampe: readonly Cran[];
  /** Où la référence exacte se place ([MOT-17]) : le pivot tombe sur son rang clair. */
  readonly ancrage: Ancrage;
  /** La liste de la palette, commune ou libre : une colonne par nuance (W6). */
  readonly grille: Grille;
  /** L'échelle de l'ordonnée, en degrés ([DER-01]) : l'éditeur la fige pendant un glisser. */
  readonly echelle: number;
}

function element<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const noeud = document.createElementNS(SVG, nom);
  for (const [cle, valeur] of Object.entries(attributs)) noeud.setAttribute(cle, String(valeur));
  return noeud;
}

export interface GrapheUi {
  element: SVGSVGElement;
  afficher(entrees: EntreesDuGraphe): void;
  /** Les poignées dessinées, par bout ; absente quand la référence n'a pas de segment de ce côté ([DER-14]). */
  poignees(): { clair: SVGGElement | null; sombre: SVGGElement | null };
}

export function createGraphe(): GrapheUi {
  const svg = element('svg', { viewBox: `0 0 ${CADRE.largeur} ${HAUTEUR_TOTALE}`, role: 'group' });
  svg.setAttribute('class', 'derive-graphe');
  let poignees: { clair: SVGGElement | null; sombre: SVGGElement | null } = { clair: null, sombre: null };

  /** L'échelle du dernier dessin, que les repères et les poignées lisent. */
  let echelle = 90;

  function repere(angle: number): SVGGElement {
    const groupe = element('g', {});
    const y = ordonnee(angle, CADRE, echelle);
    const trait = element('line', { x1: CADRE.gauche, x2: CADRE.largeur - CADRE.droite, y1: y, y2: y });
    if (angle === 0) trait.setAttribute('class', 'derive-axe');
    else trait.setAttribute('class', 'derive-repere');
    groupe.append(trait);
    if (angle % (echelle <= 45 ? 15 : 30) === 0) {
      const texte = element('text', { x: CADRE.gauche - 4, y: y + 3, 'text-anchor': 'end' });
      texte.setAttribute('class', 'derive-graduation');
      texte.textContent = graduation(angle);
      groupe.append(texte);
    }
    return groupe;
  }

  function poignee(bout: 'clair' | 'sombre', rang: number, angle: number, teinte: number, initiale: string, total: number): SVGGElement {
    // Une poignée est un curseur au sens WAI-ARIA : focalisable, bornée, et qui dit sa valeur ([DER-09]).
    const groupe = element('g', {
      tabindex: 0,
      role: 'slider',
      'aria-label': TEXTES_DE_LA_DERIVE.deriveAuBout[bout],
      'aria-valuemin': -90,
      'aria-valuemax': 90,
      'aria-valuenow': angle,
      'aria-valuetext': valeurDePoignee(angle, teinte),
    });
    groupe.setAttribute('class', 'derive-poignee');
    groupe.dataset.bout = bout;
    const x = abscisse(rang, CADRE, total);
    const y = ordonnee(angle, CADRE, echelle);
    const rond = element('circle', { cx: x, cy: y, r: 7 });
    rond.setAttribute('class', 'derive-poignee-rond');
    const lettre = element('text', { x, y: y + 3, 'text-anchor': 'middle' });
    lettre.setAttribute('class', 'derive-poignee-lettre');
    lettre.textContent = initiale;
    // Près du haut du cadre, l'étiquette passe sous la poignée : au-dessus, elle sortirait du graphe.
    const dessous = angle > echelle * 0.66;
    const etiquette = element('text', { x: bout === 'clair' ? x + 11 : x - 11, y: dessous ? y + 18 : y - 10, 'text-anchor': bout === 'clair' ? 'start' : 'end' });
    etiquette.setAttribute('class', 'derive-graduation');
    etiquette.textContent = etiquetteDePoignee(angle, teinte);
    groupe.append(rond, lettre, etiquette);
    return groupe;
  }

  return {
    element: svg,
    poignees: () => poignees,
    afficher(entrees) {
      const { recette, palette, profil, rampe, ancrage, grille } = entrees;
      const courbe = grille.courbes.light;
      const total = courbe.length;
      const bouts = boutsDe(recette);
      const reference = rgb8VersOklch(referenceDe(palette));
      const lie = palette.derive.lien;
      echelle = entrees.echelle;
      const enfants: SVGElement[] = reperes(echelle).map(repere);

      // Synchronisés, les profils partagent la ligne du porteur. Déliés, deux lignes, pleine et tiretée ([DER-05]).
      for (const trace of lie ? [ancrage.profil] : PROFILS) {
        const rangAncre = trace === ancrage.profil ? ancrage.rangs.light : null;
        const sommets = ligneBrisee(courbe, reference, palette.derive[trace], bouts, rangAncre);
        const points = sommets.map(({ rang, angle }) => `${abscisse(rang, CADRE, total)},${ordonnee(angle, CADRE, echelle)}`);
        const ligne = element('polyline', { points: points.join(' ') });
        if (!lie && trace === 'soft') ligne.setAttribute('class', 'derive-trait derive-trait-soft');
        else ligne.setAttribute('class', 'derive-trait derive-trait-vivid');
        enfants.push(ligne);
        // Déliées, chaque courbe porte le nom de son profil, lisible sans la couleur ni le trait ([DER-05]).
        if (!lie) {
          const avantDernier = sommets.filter(({ rang }) => Number.isInteger(rang))[total - 2];
          const nom = element('text', { x: abscisse(total - 2, CADRE, total), y: ordonnee(avantDernier.angle, CADRE, echelle) - 6, 'text-anchor': 'middle' });
          nom.setAttribute('class', 'derive-graduation derive-nom-de-courbe');
          nom.textContent = NOM_DU_PROFIL[trace];
          enfants.push(nom);
        }
      }

      // Le pivot est la référence exacte, sur son rang clair ([DER-02]).
      const x = abscisse(ancrage.rangs.light, CADRE, total);
      const y = ordonnee(0, CADRE, echelle);
      const losange = element('path', { d: `M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z` });
      losange.setAttribute('class', 'derive-pivot');
      const titre = element('title', {});
      titre.textContent = infobulleDuPivot(reference.H, ancrage);
      losange.append(titre);
      enfants.push(losange);

      // Un bout que la référence dépasse n'a pas de segment à régler ([DER-14]). Une poignée se pose sur la colonne
      // de son numéro, 50 ou 950 ; une liste qui ne le porte pas la pose au bord, du côté de son bout (W6).
      const derive = palette.derive[profil];
      const initiale = lie ? '' : profil[0];
      const colonneDe = (numero: number, bord: number): number => (grille.crans.includes(numero) ? grille.crans.indexOf(numero) : bord);
      poignees = {
        clair: reference.L > bouts.clair ? null
          : poignee('clair', colonneDe(50, 0), derive.clair, teinteA(bouts.clair, reference, derive, bouts), initiale, total),
        sombre: reference.L < bouts.sombre ? null
          : poignee('sombre', colonneDe(950, total - 1), derive.sombre, teinteA(bouts.sombre, reference, derive, bouts), initiale, total),
      };
      if (poignees.clair) enfants.push(poignees.clair);
      if (poignees.sombre) enfants.push(poignees.sombre);

      const largeur = (CADRE.largeur - CADRE.gauche - CADRE.droite) / total;
      courbe.forEach((clarte, rang) => {
        const x = abscisse(rang, CADRE, total);
        const numero = element('text', { x, y: Y_CRANS, 'text-anchor': 'middle' });
        numero.setAttribute('class', 'derive-graduation');
        numero.textContent = String(grille.crans[rang]);
        const teinte = normaliserTeinte(teinteA(clarte, reference, palette.derive.vivid, bouts));
        const bande = element('rect', { x: x - largeur / 2, y: Y_BANDE, width: largeur, height: HAUTEUR_DE_CASE });
        bande.setAttribute('fill', fabriquerCran(CLARTE_DE_LA_BANDE, teinte, recette.profils.vivid.part, recette.gamut).hexa);
        const cran = element('rect', { x: x - largeur / 2 + 1, y: Y_RAMPE, width: largeur - 2, height: HAUTEUR_DE_CASE, rx: 3 });
        cran.setAttribute('fill', rampe[rang].hexa);
        enfants.push(numero, bande, cran);
      });

      svg.replaceChildren(...enfants);
    },
  };
}
