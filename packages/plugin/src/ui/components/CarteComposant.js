
/** Carte de la commande composant et de son résultat. */
import { createCarteCommande } from './CarteCommande.js';

function memeCible(avant, apres) {
  if (!avant || !apres) return avant === apres;
  return avant.nom === apres.nom && avant.genre === apres.genre && avant.variants === apres.variants;
}

/** Réinitialise tout résultat dès que l'identité de la sélection change. */
export function createCarteComposant({ onAnalyser, onPublier, onAnnuler }) {
  const carte = createCarteCommande({
    surtitre: 'Composant',
    libelleAnalyse: 'Analyser le composant',
    varianteAnalyse: 'primary',
    onAnalyser,
    onPublier,
    onAnnuler,
  });
  carte.element.className = 'carte-commande carte-composant';

  const nom = document.createElement('div');
  nom.className = 'cible-nom';

  const detail = document.createElement('div');
  detail.className = 'cible-detail';

  const avertissement = document.createElement('p');
  avertissement.className = 'cible-avertissement';
  avertissement.hidden = true;

  carte.sujet.append(nom, detail, avertissement);

  let cibleAffichee = null;

  let analysee = false;
  let occupee = false;

  function rafraichirGeste() {
    carte.analyser.disabled = occupee || analysee;
  }

  return {
    ...carte,
    marquerOccupee(valeur) {
      occupee = valeur;
      carte.marquerOccupee(valeur);
      rafraichirGeste();
    },

    afficher(message) {
      const { cible, raison, avertissement: texte } = message;
      const change = !memeCible(cibleAffichee, cible);
      cibleAffichee = cible;

      carte.element.dataset.state = cible ? 'prete' : 'vide';
      nom.textContent = cible ? cible.nom : 'Aucun composant sélectionné';
      detail.textContent = cible ? message.detail : raison ?? '';
      avertissement.textContent = texte ?? '';
      avertissement.hidden = !texte;
      carte.analyser.hidden = !cible;

      if (change) {
        analysee = false;
        rafraichirGeste();
        carte.reinitialiser();
      }
    },

    marquerAnalysee() {
      analysee = true;
      rafraichirGeste();
    },
  };
}
