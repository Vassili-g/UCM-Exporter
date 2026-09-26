
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
  /** Avance la barre d'une note en chargement ; sans effet dans un autre état. */
  ecrireAvancement(fraction: number, fait?: number, total?: number, resteMs?: number): void;
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

/**
 * « Environ 8 s restantes », « Environ 1 min restante ». Au-delà de 20 s,
 * l'estimation s'arrondit à 5 s : elle bouge à chaque respiration, et un
 * chiffre qui saute d'une seconde à l'autre se lit comme une erreur.
 */
export function tempsRestant(ms: number): string {
  const secondes = Math.max(1, Math.ceil(ms / 1000));
  const arrondies = secondes > 20 ? Math.round(secondes / 5) * 5 : secondes;
  const [valeur, unite] = arrondies >= 60
    ? [Math.round(secondes / 60), 'min']
    : [arrondies, 's'];
  return `Environ ${valeur} ${unite} ${valeur > 1 ? 'restantes' : 'restante'}`;
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

  const noteTexte = document.createElement('span');

  // Le compte et la barre changent à chaque respiration du moteur : hors de la
  // région annoncée, un lecteur d'écran ne lit que le texte de l'étape.
  const noteCompte = document.createElement('span');
  noteCompte.className = 'note-compte';
  noteCompte.setAttribute('aria-hidden', 'true');
  noteCompte.hidden = true;

  const barre = document.createElement('div');
  barre.className = 'note-barre';
  barre.setAttribute('aria-hidden', 'true');
  barre.hidden = true;
  const barreRemplie = document.createElement('div');
  barreRemplie.className = 'note-barre-remplie';
  barre.append(barreRemplie);

  const noteReste = document.createElement('div');
  noteReste.className = 'note-reste';
  noteReste.setAttribute('aria-hidden', 'true');
  noteReste.hidden = true;

  note.append(noteCompte, noteTexte, barre, noteReste);

  const compteRendu = createCompteRendu();

  section.append(titre, sujet, analyser, publier, note, compteRendu.element);

  function ecrireNote(etat: EtatNote, texte: string | null) {
    note.dataset.state = etat;
    noteTexte.textContent = texte ?? '';
    note.hidden = !noteTexte.textContent;
    if (etat !== 'loading') {
      barre.hidden = true;
      noteCompte.hidden = true;
      noteReste.hidden = true;
      barreRemplie.style.width = '0%';
    }
  }

  function ecrireAvancement(fraction: number, fait?: number, total?: number, resteMs?: number) {
    if (note.dataset.state !== 'loading') return;
    barre.hidden = false;
    barreRemplie.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
    const compte = fait !== undefined && total !== undefined ? `${fait} / ${total}` : '';
    noteCompte.textContent = compte;
    noteCompte.hidden = !compte;
    noteReste.textContent = resteMs !== undefined ? tempsRestant(resteMs) : '';
    noteReste.hidden = !noteReste.textContent;
  }

  return {
    element: section,
    sujet,
    analyser,
    compteRendu,
    ecrireNote,
    ecrireAvancement,

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
