/**
 * Les gestes de la recette en fichier (section 10.1) : exporter, importer
 * avec l'écart et sa confirmation ([REC-08]), et, quand la recette rangée est
 * illisible ou future, repartir de la recette par défaut ([REC-11], E19).
 * Sur une recette lisible, le rapport de vérification s'exporte aussi
 * ([VER-01]).
 * L'onglet Planche les porte ; le bloquant de l'onglet Palettes aussi.
 */
import type { Classement, Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { LectureDImport } from '../importation';
import { blocDeConstat } from './constats';
import {
  NOMS_DES_PARAMETRES,
  TEXTES_DE_LA_RECETTE,
  importFutur,
  importInvalide,
  ligneDEcart,
  nomDeLaPalette,
  titreDeLImport,
} from './textes';

export interface GestesDeLaRecetteUi {
  element: HTMLDivElement;
  afficher(classement: Classement): void;
}

/** Ce que les gestes demandent au reste de l'interface. */
export interface DemandesDeLaRecette {
  exporter(): void;
  exporterLeRapport(): void;
  lire(texte: string): LectureDImport;
  /** Remplace la recette du fichier : l'import confirmé, ou le départ de la recette par défaut. */
  remplacer(recette: Recette): void;
  recetteParDefaut(): Recette;
}

function paragraphe(texte: string, classe = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

export function createGestesDeLaRecette(demandes: DemandesDeLaRecette): GestesDeLaRecetteUi {
  const element = document.createElement('div');
  element.className = 'page-stack';

  const fichier = document.createElement('input');
  fichier.type = 'file';
  fichier.accept = 'application/json,.json';
  fichier.hidden = true;
  fichier.setAttribute('aria-label', TEXTES_DE_LA_RECETTE.importer);

  const repartir = createButton({ label: TEXTES_DE_LA_RECETTE.repartir, variant: 'secondary', onClick: () => montrer(confirmationDuDepart()) });
  repartir.hidden = true;
  const rapport = createButton({ label: TEXTES_DE_LA_RECETTE.exporterLeRapport, variant: 'secondary', onClick: () => demandes.exporterLeRapport() });
  const ligne = document.createElement('div');
  ligne.className = 'creation-ligne';
  ligne.append(
    createButton({ label: TEXTES_DE_LA_RECETTE.exporter, variant: 'secondary', onClick: () => demandes.exporter() }),
    createButton({ label: TEXTES_DE_LA_RECETTE.importer, variant: 'secondary', onClick: () => fichier.click() }),
    repartir,
    rapport,
    fichier,
  );
  const zone = document.createElement('div');
  zone.hidden = true;
  element.append(ligne, zone);

  function montrer(contenu: HTMLElement | null): void {
    zone.replaceChildren(...(contenu ? [contenu] : []));
    zone.hidden = !contenu;
  }

  function gestes(confirmer: string, surConfirmation: () => void): HTMLDivElement {
    const rangee = document.createElement('div');
    rangee.className = 'confirmation-gestes';
    rangee.append(
      createButton({ label: confirmer, onClick: () => { montrer(null); surConfirmation(); } }),
      createButton({ label: TEXTES_DE_LA_RECETTE.annuler, variant: 'secondary', onClick: () => montrer(null) }),
    );
    return rangee;
  }

  function confirmationDuDepart(): HTMLDivElement {
    const bloc = document.createElement('div');
    bloc.className = 'confirmation';
    bloc.append(
      paragraphe(TEXTES_DE_LA_RECETTE.confirmationDuDepart),
      gestes(TEXTES_DE_LA_RECETTE.confirmerLeDepart, () => demandes.remplacer(demandes.recetteParDefaut())),
    );
    return bloc;
  }

  /** L'écart d'un import prêt, ligne par ligne, et sa confirmation. */
  function confirmationDeLImport(nom: string, lecture: Extract<LectureDImport, { issue: 'prete' }>): HTMLDivElement {
    const { ecart } = lecture;
    const lignes = [
      ecart.ajoutees.length > 0 ? ligneDEcart('ajoutees', ecart.ajoutees.map(nomDeLaPalette)) : null,
      ecart.retirees.length > 0 ? ligneDEcart('retirees', ecart.retirees.map(nomDeLaPalette)) : null,
      ecart.modifiees.length > 0 ? ligneDEcart('modifiees', ecart.modifiees.map(nomDeLaPalette)) : null,
      ecart.parametres.length > 0 ? ligneDEcart('parametres', ecart.parametres.map((cle) => NOMS_DES_PARAMETRES[cle])) : null,
    ].filter((texte): texte is string => texte !== null);
    const bloc = document.createElement('div');
    bloc.className = 'confirmation';
    bloc.append(
      paragraphe(titreDeLImport(nom), 'field-label'),
      ...(lignes.length > 0 ? lignes : [TEXTES_DE_LA_RECETTE.sansEcart]).map((texte) => paragraphe(texte)),
      paragraphe(TEXTES_DE_LA_RECETTE.importSansDessin, 'ligne-secondaire'),
      gestes(TEXTES_DE_LA_RECETTE.confirmerLImport, () => demandes.remplacer(lecture.recette)),
    );
    return bloc;
  }

  fichier.addEventListener('change', async () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    if (!choisi) return;
    const lecture = demandes.lire(await choisi.text());
    if (lecture.issue === 'prete') montrer(confirmationDeLImport(choisi.name, lecture));
    else {
      const constat = lecture.issue === 'future' ? importFutur(choisi.name, lecture.version) : importInvalide(choisi.name, lecture.refus);
      montrer(blocDeConstat(constat, 'bloquant'));
    }
  });

  return {
    element,
    afficher(classement) {
      const bloquante = classement.etat === 'future' || classement.etat === 'illisible';
      repartir.hidden = !bloquante;
      rapport.hidden = bloquante;
    },
  };
}
