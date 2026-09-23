/**
 * L'aperçu d'une palette ([UI-04]) : une bascule entre les modes, deux rampes
 * de pastilles de 24 px, et une ligne qui détaille le cran survolé ou atteint
 * au clavier. Les valeurs ne s'affichent jamais en permanence : la planche est
 * l'endroit où tout se lit.
 *
 * Les pastilles forment une grille au sens WAI-ARIA : une seule est atteinte
 * par la tabulation, les flèches, Origine et Fin déplacent le focus.
 */
import {
  PROFILS,
  emploisDuCran,
  lireHexa,
  mesurerCran,
  type Mode,
  type Profil,
  type Rampes,
  type Recette,
} from 'ucm-couleur';

import { TEXTES, detailDuCran } from './textes';

export interface ApercuUi {
  element: HTMLDivElement;
  afficher(recette: Recette, rampes: Rampes): void;
}

export function createApercu(): ApercuUi {
  const element = document.createElement('div');
  element.className = 'apercu';

  const bascule = document.createElement('div');
  bascule.className = 'bascule';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES.modesDeLApercu);

  const grille = document.createElement('div');
  grille.className = 'grille-apercu';
  grille.setAttribute('role', 'grid');
  grille.setAttribute('aria-label', TEXTES.apercu);

  const detail = document.createElement('p');
  detail.className = 'detail-cran';
  detail.setAttribute('aria-live', 'polite');
  detail.textContent = TEXTES.detailParDefaut;

  let mode: Mode = 'light';
  /** La pastille que la tabulation atteint : rang de la rampe, rang du cran. */
  let active = { rampe: 1, cran: 7 };
  let donnees: { recette: Recette; rampes: Rampes } | null = null;

  const boutons = (['light', 'dark'] as const).map((valeur) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-option';
    bouton.textContent = valeur === 'light' ? TEXTES.modeClair : TEXTES.modeSombre;
    bouton.addEventListener('click', () => {
      mode = valeur;
      dessiner();
    });
    bascule.append(bouton);
    return { valeur, bouton };
  });

  function decrire(profil: Profil, rang: number): string {
    if (!donnees) return TEXTES.detailParDefaut;
    const { recette, rampes } = donnees;
    const cran = rampes[profil][mode][rang];
    const fond = lireHexa(recette.fonds[mode]);
    if (!fond) return TEXTES.detailParDefaut;
    const mesure = mesurerCran(cran.couleur, fond, recette.seuils);
    return detailDuCran({
      nom: `${profil}.${recette.crans[rang]}`,
      hexa: cran.hexa,
      fond: mesure.fond,
      seuilTenu: mesure.seuilTenu === null ? null : recette.seuils[mesure.seuilTenu],
      blanc: mesure.blanc,
      noir: mesure.noir,
      emplois: emploisDuCran(recette.crans, rang),
    });
  }

  function cellules(): HTMLElement[][] {
    return Array.from(grille.querySelectorAll<HTMLElement>('[role="row"]'))
      .map((rangee) => Array.from(rangee.querySelectorAll<HTMLElement>('[role="gridcell"]')));
  }

  function activer(rampe: number, cran: number, focaliser: boolean): void {
    const toutes = cellules();
    if (toutes.length === 0) return;
    const ligne = Math.max(0, Math.min(toutes.length - 1, rampe));
    const colonne = Math.max(0, Math.min(toutes[ligne].length - 1, cran));
    active = { rampe: ligne, cran: colonne };
    toutes.flat().forEach((cellule) => { cellule.tabIndex = -1; });
    const cible = toutes[ligne][colonne];
    cible.tabIndex = 0;
    if (focaliser) cible.focus();
  }

  grille.addEventListener('keydown', (evenement) => {
    const largeur = cellules()[active.rampe]?.length ?? 0;
    const cibles: Record<string, [number, number]> = {
      ArrowRight: [active.rampe, active.cran + 1],
      ArrowLeft: [active.rampe, active.cran - 1],
      ArrowDown: [active.rampe + 1, active.cran],
      ArrowUp: [active.rampe - 1, active.cran],
      Home: [active.rampe, 0],
      End: [active.rampe, largeur - 1],
    };
    const cible = cibles[evenement.key];
    if (!cible) return;
    evenement.preventDefault();
    activer(cible[0], cible[1], true);
  });

  function dessiner(): void {
    for (const { valeur, bouton } of boutons) bouton.setAttribute('aria-pressed', String(valeur === mode));
    if (!donnees) return;
    const { recette, rampes } = donnees;
    grille.replaceChildren(...PROFILS.map((profil, rangDeRampe) => {
      const rangee = document.createElement('div');
      rangee.className = 'rampe';
      rangee.setAttribute('role', 'row');
      const entete = document.createElement('span');
      entete.className = 'rampe-profil';
      entete.setAttribute('role', 'rowheader');
      entete.textContent = profil;
      rangee.append(entete);
      rampes[profil][mode].forEach((cran, rang) => {
        const pastille = document.createElement('span');
        pastille.className = 'pastille';
        pastille.setAttribute('role', 'gridcell');
        pastille.setAttribute('aria-label', `${profil}.${recette.crans[rang]} ${cran.hexa}`);
        pastille.dataset.cran = String(recette.crans[rang]);
        pastille.style.background = cran.hexa;
        pastille.tabIndex = -1;
        const montrer = () => { detail.textContent = decrire(profil, rang); };
        pastille.addEventListener('mouseenter', montrer);
        pastille.addEventListener('focus', () => {
          active = { rampe: rangDeRampe, cran: rang };
          montrer();
        });
        rangee.append(pastille);
      });
      return rangee;
    }));
    activer(active.rampe, active.cran, false);
  }

  element.append(bascule, grille, detail);

  return {
    element,
    afficher(recette, rampes) {
      donnees = { recette, rampes };
      dessiner();
    },
  };
}
