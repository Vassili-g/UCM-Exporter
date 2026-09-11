
/** Carte de la commande tokens et de son résultat. */
import type { PluginMessage } from '../../messages';
import type { CarteCommandeUi, OptionsCarteConcrete } from './CarteCommande';
import { createCarteCommande } from './CarteCommande';

/** Le message de tokens, dépouillé de son enveloppe. */
type MessageTokens = Extract<PluginMessage, { type: 'tokens' }>;

/** Ce que le routeur UI pilote sur la carte des tokens. */
export interface CarteTokensUi extends CarteCommandeUi {
  afficher(message: MessageTokens): void;
  /** Le module et la version du format que porte le fichier analysé. */
  annoncerFormat(texte: string): void;
}

/** N'autorise l'analyse que lorsque le fichier contient des variables. */
export function createCarteTokens({
  onAnalyser,
  onPublier,
  onAnnuler,
}: OptionsCarteConcrete): CarteTokensUi {
  const carte = createCarteCommande({
    surtitre: 'Tokens du fichier',
    libelleAnalyse: 'Analyser les tokens du fichier',
    varianteAnalyse: 'secondary',
    onAnalyser,
    onPublier,
    onAnnuler,
  });
  carte.element.className = 'carte-commande carte-tokens';

  const resume = document.createElement('p');
  resume.className = 'tokens-resume';
  resume.textContent = 'Lecture des variables du fichier…';

  // Le format appartient au fichier qu'une analyse a produit : il disparaît
  // quand la suivante commence.
  const format = document.createElement('p');
  format.className = 'tokens-format';
  format.hidden = true;
  carte.sujet.append(resume, format);

  return {
    ...carte,

    afficher({ resume: texte, presents }: MessageTokens) {
      resume.textContent = texte;
      carte.analyser.hidden = !presents;
    },

    annoncerFormat(texte: string) {
      format.textContent = texte;
      format.hidden = false;
    },

    reinitialiser() {
      carte.reinitialiser();
      format.hidden = true;
    },
  };
}
