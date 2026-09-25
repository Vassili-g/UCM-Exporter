
/** Carte de la commande composant et de son résultat. */
import type { Cible } from '../../cible';
import type { PluginMessage } from '../../messages';
import type { Offre } from '../../template/sources';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { CarteCommandeUi, OptionsCarteConcrete } from './CarteCommande';
import { createCarteCommande } from './CarteCommande';

/** Le message de cible, dépouillé de son enveloppe. */
type MessageCible = Extract<PluginMessage, { type: 'cible' }>;

/** Ce que le routeur UI pilote sur la carte du composant. */
export interface CarteComposantUi extends CarteCommandeUi {
  afficher(message: MessageCible): void;
  marquerAnalysee(): void;
}

/** La carte du composant porte un troisième geste, qui n'existe pas ailleurs. */
export interface OptionsCarteComposant extends OptionsCarteConcrete {
  onCreer: () => void;
}

/**
 * Où mène la note d'une page sans source.
 *
 * Une équipe qui vient d'installer le plugin n'a aucune instance de
 * « .componentRules » à copier : le kit de règles publié sur la Community lui
 * donne les trois maîtres (`docs/guides/KIT-DE-REGLES.md`).
 */
const LIEN_DU_KIT = 'https://www.figma.com/community/file/1684536749543631522';

function memeCible(avant: Cible | null, apres: Cible | null): boolean {
  if (!avant || !apres) return avant === apres;
  return avant.nom === apres.nom && avant.genre === apres.genre && avant.variants === apres.variants;
}

/** Réinitialise tout résultat dès que l'identité de la sélection change. */
export function createCarteComposant({
  onAnalyser,
  onPublier,
  onCreer,
}: OptionsCarteComposant): CarteComposantUi {
  const carte = createCarteCommande({
    surtitre: 'Composant',
    libelleAnalyse: 'Analyser le composant',
    varianteAnalyse: 'primary',
    onAnalyser,
    onPublier,
  });
  carte.element.className = 'carte-commande carte-composant';

  const creer = createButton({
    label: 'Créer les règles d’usage',
    variant: 'secondary',
    onClick: () => onCreer(),
  });
  creer.hidden = true;

  // Le parcours des autres pages court encore : le bouton ne peut rien promettre,
  // et cette note dit pourquoi il est inactif.
  const recherche = document.createElement('p');
  recherche.className = 'creation-sans-source';
  recherche.hidden = true;
  recherche.textContent = 'Recherche de vos règles dans les autres pages du document…';

  const sansSource = document.createElement('p');
  sansSource.className = 'creation-sans-source';
  sansSource.hidden = true;
  // Le geste vise cette page, et pas une autre : le parcours ne repart pas de
  // lui-même, alors que le relevé de la page active voit une instance collée
  // dès le changement de sélection.
  sansSource.textContent = 'Le modèle de règles « .componentRules » est absent du document. '
    + 'Copiez une instance depuis le kit de règles et collez-la sur cette page. ';

  /** Le lien vers le kit, que les deux notes portent. */
  function lienDuKit(): HTMLAnchorElement {
    const lien = document.createElement('a');
    lien.className = 'creation-lien';
    lien.href = LIEN_DU_KIT;
    lien.textContent = 'Ouvrir le kit de règles';
    // Une iframe de plugin n'a pas de navigateur : seul le sandbox ouvre un lien.
    lien.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      parent.postMessage({ pluginMessage: { type: 'open-external', url: LIEN_DU_KIT } }, '*');
    });
    return lien;
  }

  // La recherche porte le même lien : une équipe qui n'a aucune source attend
  // sinon la fin du parcours avant de savoir quoi faire.
  recherche.append(' ', lienDuKit());
  sansSource.append(lienDuKit());

  carte.analyser.after(creer, recherche, sansSource);

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
  /** Ce que le document permet de créer, `null` quand rien n'est à proposer. */
  let offre: Offre | null = null;

  function rafraichirGeste() {
    carte.analyser.disabled = occupee || analysee;
    creer.hidden = offre === null;
    // Un document sans source ne porte rien à copier, et un parcours inachevé ne
    // sait pas encore s'il en porte : le geste reste montré pour que la note en
    // dise la cause, et inactif pour qu'il ne mente pas.
    creer.disabled = occupee || offre === 'sans-source' || offre === 'document-sans-source';
    recherche.hidden = offre !== 'sans-source';
    sansSource.hidden = offre !== 'document-sans-source';
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
      offre = cible ? message.offre ?? null : null;

      if (change) analysee = false;
      rafraichirGeste();
      if (change) carte.reinitialiser();
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
