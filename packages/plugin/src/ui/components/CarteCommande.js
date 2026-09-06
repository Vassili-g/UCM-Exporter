
/** Coquille commune d'une commande : sujet, actions, note et compte rendu. */
import { createButton } from './Button.js';
import { createCompteRendu } from './CompteRendu.js';

/** Construit une carte dont l'appelant fournit le sujet et les opérations. */
export function createCarteCommande({
  surtitre,
  libelleAnalyse,
  varianteAnalyse = 'primary',
  onAnalyser,
  onPublier,
  onAnnuler,
}) {

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

  function ecrireNote(etat, texte) {
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

    proposerPublication(action) {
      publier.hidden = !action;
      if (action) publier.setLabel(action);
      return publier;
    },

    marquerOccupee(occupee) {
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
