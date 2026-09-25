/**
 * Les gestes de la recette en fichier (section 10.1) : exporter, importer
 * avec l'écart et sa confirmation ([REC-08]), et, quand la recette rangée est
 * illisible ou future, repartir de la recette par défaut ([REC-11], E19).
 * Sur une recette lisible, le rapport de vérification s'exporte aussi
 * ([VER-01]).
 * L'onglet Planche les porte ; le bloquant de l'onglet Palettes aussi.
 *
 * L'écart d'un import nomme les valeurs modifiées, dit si l'import change les
 * couleurs, les minimums ou les seuls signalements, et ce qu'il ferait aux
 * cadres déjà générés (V12.2). Pendant un conflit d'enregistrement, importer
 * et réinitialiser sont inactifs : ils écriraient sur une version périmée
 * (V12.1).
 */
import type { Classement, Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { natureDeLEcart, type LectureDImport } from '../importation';
import { blocDeConstat } from './constats';
import {
  NOMS_DES_PARAMETRES,
  SEUILS_DE_L_IMPORT,
  TEXTES_DE_LA_RECETTE,
  consequenceSurLaPlanche,
  importFutur,
  importInvalide,
  ligneDEcart,
  ligneDesValeurs,
  lignesDeNature,
  nomDeLaPalette,
  titreDeLImport,
} from './textes';

export interface GestesDeLaRecetteUi {
  element: HTMLDivElement;
  afficher(classement: Classement): void;
  /** Rend inactifs l'import et la réinitialisation, avec la raison ; `null` les rend (V12.1). */
  bloquer(raison: string | null): void;
}

/** Ce que les gestes demandent au reste de l'interface. */
export interface DemandesDeLaRecette {
  exporter(): void;
  exporterLeRapport(): void;
  lire(texte: string): LectureDImport;
  /** Remplace la recette du fichier : l'import confirmé, ou le départ de la recette par défaut. */
  remplacer(recette: Recette): void;
  recetteParDefaut(): Recette;
  /** Les palettes dont le cadre passerait « À mettre à jour » ou deviendrait orphelin ; `null` sans planche lue (V12.2). */
  consequence(recette: Recette): { readonly aMettreAJour: readonly string[]; readonly orphelins: readonly string[] } | null;
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
  const importer = createButton({ label: TEXTES_DE_LA_RECETTE.importer, variant: 'secondary', onClick: () => fichier.click() });
  ligne.append(
    createButton({ label: TEXTES_DE_LA_RECETTE.exporter, variant: 'secondary', onClick: () => demandes.exporter() }),
    importer,
    repartir,
    rapport,
    fichier,
  );
  const zone = document.createElement('div');
  zone.hidden = true;
  element.append(ligne, zone);

  /** La raison du blocage en cours, et le bouton de la confirmation montrée : ils écriraient dans le fichier. */
  let blocage: string | null = null;
  let confirmationMontree: HTMLButtonElement | null = null;

  function appliquerLeBlocage(): void {
    for (const bouton of [importer, repartir, ...(confirmationMontree ? [confirmationMontree] : [])]) {
      bouton.disabled = blocage !== null;
      bouton.title = blocage ?? '';
    }
  }

  function montrer(contenu: HTMLElement | null): void {
    if (!contenu) confirmationMontree = null;
    zone.replaceChildren(...(contenu ? [contenu] : []));
    zone.hidden = !contenu;
  }

  function gestes(confirmer: string, surConfirmation: () => void): HTMLDivElement {
    const rangee = document.createElement('div');
    rangee.className = 'confirmation-gestes';
    const confirmation = createButton({ label: confirmer, onClick: () => { montrer(null); surConfirmation(); } });
    confirmationMontree = confirmation;
    appliquerLeBlocage();
    rangee.append(
      confirmation,
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
    // Les seuils se nomment un à un, plutôt que « minimums et seuils de détection » d'un bloc.
    const parametres = ecart.parametres.flatMap((cle) => (cle === 'seuils' && ecart.seuils.length > 0 ? ecart.seuils.map((seuil) => SEUILS_DE_L_IMPORT[seuil]) : [NOMS_DES_PARAMETRES[cle]]));
    const consequence = demandes.consequence(lecture.recette);
    const lignes = [
      ecart.ajoutees.length > 0 ? ligneDEcart('ajoutees', ecart.ajoutees.map(nomDeLaPalette)) : null,
      ecart.retirees.length > 0 ? ligneDEcart('retirees', ecart.retirees.map(nomDeLaPalette)) : null,
      ecart.modifiees.length > 0 ? ligneDesValeurs(ecart.modifiees.map((palette) => ({ nom: nomDeLaPalette(palette), champs: ecart.champs[palette.id] ?? [] }))) : null,
      parametres.length > 0 ? ligneDEcart('parametres', parametres) : null,
      ...lignesDeNature(natureDeLEcart(ecart)),
      consequence ? consequenceSurLaPlanche(consequence.aMettreAJour, consequence.orphelins) : null,
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
    bloquer(raison) {
      blocage = raison;
      appliquerLeBlocage();
    },
  };
}
