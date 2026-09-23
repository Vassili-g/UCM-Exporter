/**
 * Le sélecteur de la palette ouverte ([UI-06]) : chaque palette sous son nom
 * ou son hexa, avec une pastille de sa référence. Un `<select>` natif ne porte
 * pas de pastille : la liste suit le motif WAI-ARIA « listbox » derrière un
 * bouton. Flèches et Entrée choisissent, Échap referme.
 */
import type { Palette } from 'ucm-couleur';

import { TEXTES, nomDeLaPalette } from './textes';

export interface SelecteurUi {
  element: HTMLDivElement;
  afficher(palettes: readonly Palette[], idOuvert: string): void;
}

function pastilleDe(palette: Palette): HTMLSpanElement {
  const pastille = document.createElement('span');
  pastille.className = 'pastille-reference';
  pastille.style.background = palette.reference;
  return pastille;
}

export function createSelecteur(onChoix: (id: string) => void): SelecteurUi {
  const element = document.createElement('div');
  element.className = 'selecteur';

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'selecteur-bouton';
  bouton.setAttribute('aria-haspopup', 'listbox');
  bouton.setAttribute('aria-expanded', 'false');
  bouton.setAttribute('aria-label', TEXTES.choisirUnePalette);

  const liste = document.createElement('ul');
  liste.className = 'selecteur-liste';
  liste.setAttribute('role', 'listbox');
  liste.setAttribute('aria-label', TEXTES.choisirUnePalette);
  liste.tabIndex = -1;
  liste.hidden = true;

  let options: { id: string; element: HTMLLIElement }[] = [];
  let ouvert = '';
  let visee = 0;

  function viser(rang: number): void {
    if (options.length === 0) return;
    visee = (rang + options.length) % options.length;
    options.forEach(({ element: option }, position) => option.dataset.visee = String(position === visee));
    liste.setAttribute('aria-activedescendant', options[visee].element.id);
  }

  function ouvrir(): void {
    liste.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    viser(Math.max(0, options.findIndex(({ id }) => id === ouvert)));
    liste.focus();
  }

  function fermer(rendreLeFocus: boolean): void {
    liste.hidden = true;
    bouton.setAttribute('aria-expanded', 'false');
    if (rendreLeFocus) bouton.focus();
  }

  function choisir(rang: number): void {
    fermer(true);
    const choisie = options[rang];
    if (choisie && choisie.id !== ouvert) onChoix(choisie.id);
  }

  bouton.addEventListener('click', () => (liste.hidden ? ouvrir() : fermer(false)));
  bouton.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return;
    evenement.preventDefault();
    ouvrir();
  });
  liste.addEventListener('keydown', (evenement) => {
    const gestes: Record<string, () => void> = {
      ArrowDown: () => viser(visee + 1),
      ArrowUp: () => viser(visee - 1),
      Home: () => viser(0),
      End: () => viser(options.length - 1),
      Enter: () => choisir(visee),
      ' ': () => choisir(visee),
      Escape: () => fermer(true),
    };
    const geste = gestes[evenement.key];
    if (!geste) return;
    evenement.preventDefault();
    geste();
  });
  element.addEventListener('focusout', (evenement) => {
    if (!element.contains(evenement.relatedTarget as Node | null)) fermer(false);
  });

  element.append(bouton, liste);

  return {
    element,
    afficher(palettes, idOuvert) {
      ouvert = idOuvert;
      const courante = palettes.find((palette) => palette.id === idOuvert);
      const nom = document.createElement('span');
      nom.className = 'selecteur-nom';
      nom.textContent = courante ? nomDeLaPalette(courante) : '';
      const fleche = document.createElement('span');
      fleche.className = 'selecteur-fleche';
      fleche.setAttribute('aria-hidden', 'true');
      fleche.textContent = '▾';
      bouton.replaceChildren(...(courante ? [pastilleDe(courante)] : []), nom, fleche);

      options = palettes.map((palette, rang) => {
        const option = document.createElement('li');
        option.className = 'selecteur-option';
        option.id = `option-${palette.id}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(palette.id === idOuvert));
        const texte = document.createElement('span');
        texte.textContent = nomDeLaPalette(palette);
        option.append(pastilleDe(palette), texte);
        option.addEventListener('mousedown', (evenement) => evenement.preventDefault());
        option.addEventListener('click', () => choisir(rang));
        return { id: palette.id, element: option };
      });
      liste.replaceChildren(...options.map(({ element: option }) => option));
    },
  };
}
