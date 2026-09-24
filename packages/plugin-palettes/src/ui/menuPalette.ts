/**
 * Les gestes qui portent sur la palette ouverte ([ENT-03]) : dupliquer, monter,
 * descendre, supprimer. Un menu selon le motif WAI-ARIA « menu button » : ils
 * n'occupent l'écran qu'à la demande, le compte des objets restant sous la
 * douzaine (protocole de relecture, point (e)).
 */
import { TEXTES } from './textes';

export type GesteDePalette = 'dupliquer' | 'monter' | 'descendre' | 'supprimer';

export interface MenuPaletteUi {
  element: HTMLDivElement;
  /** Désactive « Monter » sur la première palette et « Descendre » sur la dernière. */
  afficher(rang: number, nombre: number): void;
  /** Rend le focus au bouton du menu, après une confirmation annulée. */
  focaliser(): void;
}

const GESTES: readonly { geste: GesteDePalette; libelle: string }[] = [
  { geste: 'dupliquer', libelle: TEXTES.dupliquer },
  { geste: 'monter', libelle: TEXTES.monter },
  { geste: 'descendre', libelle: TEXTES.descendre },
  { geste: 'supprimer', libelle: TEXTES.supprimer },
];

export function createMenuPalette(onGeste: (geste: GesteDePalette) => void): MenuPaletteUi {
  const element = document.createElement('div');
  element.className = 'menu-palette';

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'icon-button';
  bouton.textContent = '⋯';
  bouton.setAttribute('aria-label', TEXTES.gestesDeLaPalette);
  bouton.setAttribute('aria-haspopup', 'menu');
  bouton.setAttribute('aria-expanded', 'false');

  const liste = document.createElement('ul');
  liste.className = 'menu-liste';
  liste.setAttribute('role', 'menu');
  liste.hidden = true;

  const options = GESTES.map(({ geste, libelle }) => {
    const option = document.createElement('li');
    option.className = 'menu-option';
    option.setAttribute('role', 'menuitem');
    option.dataset.geste = geste;
    option.tabIndex = -1;
    option.textContent = libelle;
    option.addEventListener('click', () => choisir(option));
    liste.append(option);
    return option;
  });

  const actives = () => options.filter((option) => option.getAttribute('aria-disabled') !== 'true');

  function fermer(rendreLeFocus: boolean): void {
    liste.hidden = true;
    bouton.setAttribute('aria-expanded', 'false');
    if (rendreLeFocus) bouton.focus();
  }

  function choisir(option: HTMLLIElement): void {
    if (option.getAttribute('aria-disabled') === 'true') return;
    fermer(true);
    onGeste(option.dataset.geste as GesteDePalette);
  }

  bouton.addEventListener('click', () => {
    if (!liste.hidden) {
      fermer(false);
      return;
    }
    liste.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    actives()[0]?.focus();
  });
  liste.addEventListener('keydown', (evenement) => {
    const disponibles = actives();
    const rang = disponibles.indexOf(document.activeElement as HTMLLIElement);
    const gestes: Record<string, () => void> = {
      ArrowDown: () => disponibles[(rang + 1) % disponibles.length]?.focus(),
      ArrowUp: () => disponibles[(rang - 1 + disponibles.length) % disponibles.length]?.focus(),
      Enter: () => { if (disponibles[rang]) choisir(disponibles[rang]); },
      ' ': () => { if (disponibles[rang]) choisir(disponibles[rang]); },
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
    focaliser: () => bouton.focus(),
    afficher(rang, nombre) {
      for (const option of options) {
        const bloquee = (option.dataset.geste === 'monter' && rang === 0)
          || (option.dataset.geste === 'descendre' && rang === nombre - 1);
        option.setAttribute('aria-disabled', String(bloquee));
      }
    },
  };
}
