/**
 * Les options de génération (section 9.5, [UI-05]) : un seul état, partagé par
 * les deux onglets. Chaque onglet en montre un repli, sous l'action qui les
 * emploie, avec le résumé du choix visible replié.
 */
import { TEXTES_DU_DESSIN, resumeDesOptions } from './textes';

export interface OptionsDeGeneration {
  /** Vrai quand la génération ajoute la grille de contraste. */
  grille(): boolean;
  /** Un repli de plus, posé sous une action de génération ; tous suivent le même état. */
  creerRepli(): HTMLDetailsElement;
}

export function createOptionsDeGeneration(): OptionsDeGeneration {
  let grille = false;
  const replis: { resume: HTMLElement; case: HTMLInputElement }[] = [];

  function rendre(): void {
    for (const repli of replis) {
      repli.resume.textContent = `${TEXTES_DU_DESSIN.options} : ${resumeDesOptions(grille)}`;
      repli.case.checked = grille;
    }
  }

  return {
    grille: () => grille,
    creerRepli() {
      const element = document.createElement('details');
      element.className = 'options-de-generation';
      const resume = document.createElement('summary');
      const etiquette = document.createElement('label');
      etiquette.className = 'champ-ligne';
      const caseACocher = document.createElement('input');
      caseACocher.type = 'checkbox';
      caseACocher.className = 'case-a-cocher';
      caseACocher.addEventListener('change', () => {
        grille = caseACocher.checked;
        rendre();
      });
      const texte = document.createElement('span');
      texte.textContent = TEXTES_DU_DESSIN.grille;
      etiquette.append(caseACocher, texte);
      element.append(resume, etiquette);
      replis.push({ resume, case: caseACocher });
      rendre();
      return element;
    },
  };
}
