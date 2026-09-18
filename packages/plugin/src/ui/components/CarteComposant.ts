
/** Carte de la commande composant et de son résultat. */
import type { Cible } from '../../cible';
import type { PluginMessage } from '../../messages';
import type { CarteCommandeUi, OptionsCarteConcrete } from './CarteCommande';
import { createCarteCommande } from './CarteCommande';

/** Le message de cible, dépouillé de son enveloppe. */
type MessageCible = Extract<PluginMessage, { type: 'cible' }>;

/** Ce que le routeur UI pilote sur la carte du composant. */
export interface CarteComposantUi extends CarteCommandeUi {
  afficher(message: MessageCible): void;
  marquerAnalysee(): void;
}

function memeCible(avant: Cible | null, apres: Cible | null): boolean {
  if (!avant || !apres) return avant === apres;
  return avant.nom === apres.nom && avant.genre === apres.genre && avant.variants === apres.variants;
}

/** Réinitialise tout résultat dès que l'identité de la sélection change. */
export function createCarteComposant({
  onAnalyser,
  onPublier,
}: OptionsCarteConcrete): CarteComposantUi {
  const carte = createCarteCommande({
    surtitre: 'Composant',
    libelleAnalyse: 'Analyser le composant',
    varianteAnalyse: 'primary',
    onAnalyser,
    onPublier,
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

  let cibleAffichee: Cible | null = null;
  let selectionAffichee: string | undefined;

  let analysee = false;
  let occupee = false;

  function rafraichirGeste() {
    carte.analyser.disabled = occupee || analysee;
  }

  return {
    ...carte,
    marquerOccupee(valeur: boolean) {
      occupee = valeur;
      carte.marquerOccupee(valeur);
      rafraichirGeste();
    },

    afficher(message: MessageCible) {
      const { cible, raison, avertissement: texte } = message;
      const change = message.selectionId !== selectionAffichee || !memeCible(cibleAffichee, cible);
      selectionAffichee = message.selectionId;
      cibleAffichee = cible;

      carte.element.dataset.state = cible ? 'prete' : 'vide';
      nom.textContent = cible ? cible.nom : 'Aucun composant sélectionné';
      detail.textContent = cible ? message.detail ?? '' : raison ?? '';
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

    /** Sans résultat, la même cible s'analyse de nouveau. */
    reinitialiser() {
      analysee = false;
      rafraichirGeste();
      carte.reinitialiser();
    },
  };
}
