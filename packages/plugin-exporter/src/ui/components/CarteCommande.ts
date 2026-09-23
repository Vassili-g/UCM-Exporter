
/** Coquille commune d'une commande : sujet, actions, note et compte rendu. */
import type { BoutonUi, VarianteBouton } from 'ucm-plugin-socle/src/ui/Button';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { CompteRenduUi } from './CompteRendu';
import { createCompteRendu } from './CompteRendu';

/** État visuel d'une note. La chaîne vide efface la note et la masque. */
export type EtatNote = '' | 'loading' | 'warning' | 'error' | 'success';

export interface OptionsCarteCommande {
  surtitre: string;
  libelleAnalyse: string;
  varianteAnalyse?: VarianteBouton;
  onAnalyser: () => void;
  onPublier: () => void;
}

/** La coquille commune que les deux cartes concrètes étendent. */
export interface CarteCommandeUi {
  element: HTMLElement;
  sujet: HTMLDivElement;
  analyser: BoutonUi;
  compteRendu: CompteRenduUi;
  ecrireNote(etat: EtatNote, texte: string | null): void;
  proposerPublication(action: string | null): BoutonUi;
  marquerOccupee(occupee: boolean): void;
  reinitialiser(): void;
}

/**
 * Les deux gestes qu'une carte concrète reçoit. Son surtitre et son libellé
 * d'analyse sont déclarés par la carte elle-même.
 */
export interface OptionsCarteConcrete {
  onAnalyser: () => void;
  onPublier: () => void;
}

/** Construit une carte dont l'appelant fournit le sujet et les opérations. */
export function createCarteCommande({
  surtitre,
  libelleAnalyse,
  varianteAnalyse = 'primary',
  onAnalyser,
  onPublier,
}: OptionsCarteCommande): CarteCommandeUi {

  const section = document.createElement('section');
  section.className = 'carte-commande';

  const titre = document.createElement('p');
  titre.className = 'carte-surtitre';
  titre.textContent = surtitre;

  const sujet = document.createElement('div');
  sujet.className = 'carte-sujet';

  const analyser = createButton({
    label: libelleAnalyse,
    variant: varianteAnalyse,
    onClick: () => onAnalyser(),
  });
  analyser.hidden = true;

  const publier = createButton({
    label: 'Publier',
    variant: 'primary',
    onClick: () => onPublier(),
  });
  publier.hidden = true;

  const note = document.createElement('div');
  note.className = 'note';
  note.setAttribute('role', 'status');
  note.setAttribute('aria-live', 'polite');
  note.hidden = true;

  const compteRendu = createCompteRendu();

  section.append(titre, sujet, analyser, publier, note, compteRendu.element);

  function ecrireNote(etat: EtatNote, texte: string | null) {
    note.dataset.state = etat;
    note.textContent = texte ?? '';
    note.hidden = !note.textContent;
  }

  return {
    element: section,
    sujet,
    analyser,
    compteRendu,
    ecrireNote,

    proposerPublication(action: string | null) {
      publier.hidden = !action;
      if (action) publier.setLabel(action);
      return publier;
    },

    marquerOccupee(occupee: boolean) {
      analyser.disabled = occupee;
      if (occupee) publier.hidden = true;
    },

    reinitialiser() {
      compteRendu.reinitialiser();
      publier.hidden = true;
      ecrireNote('', '');
    },
  };
}
