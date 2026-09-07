
/** Coquille commune d'une commande : sujet, actions, note et compte rendu. */
import type { BoutonUi, VarianteBouton } from './Button';
import { createButton } from './Button';
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
  onAnnuler: () => void;
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
 * Les trois gestes qu'une carte concrète reçoit. Son surtitre et son libellé
 * d'analyse sont déclarés par la carte elle-même.
 */
export interface OptionsCarteConcrete {
  onAnalyser: () => void;
  onPublier: () => void;
  onAnnuler: () => void;
}

/** Construit une carte dont l'appelant fournit le sujet et les opérations. */
export function createCarteCommande({
  surtitre,
  libelleAnalyse,
  varianteAnalyse = 'primary',
  onAnalyser,
  onPublier,
  onAnnuler,
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

  const annuler = createButton({
    label: 'Annuler après cette étape',
    variant: 'secondary',
    onClick: () => onAnnuler(),
  });
  annuler.hidden = true;

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

  section.append(titre, sujet, analyser, annuler, publier, note, compteRendu.element);

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
      annuler.hidden = !occupee;
      if (occupee) publier.hidden = true;
    },

    reinitialiser() {
      compteRendu.reinitialiser();
      publier.hidden = true;
      ecrireNote('', '');
    },
  };
}
