
/** Carte de la commande tokens et de son résultat. */
import { createCarteCommande } from './CarteCommande.js';

/** N'autorise l'analyse que lorsque le fichier contient des variables. */
export function createCarteTokens({ onAnalyser, onPublier, onAnnuler }) {
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
  carte.sujet.append(resume);

  return {
    ...carte,

    afficher({ resume: texte, presents }) {
      resume.textContent = texte;
      carte.analyser.hidden = !presents;
    },
  };
}
