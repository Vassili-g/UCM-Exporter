/**
 * L'onglet Planche (section 13.2, [UI-02]) : l'état de la planche, une ligne
 * par palette et son geste, puis « Dessiner toutes les palettes » et
 * l'option de la grille de contraste (section 9.5). Au-delà de six palettes,
 * le dessin de toutes demande confirmation ([PLA-24], D-I).
 */
import type { Classement, Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { PlancheRangee, ProfilDuDocument } from '../lecture';
import { blocDeConstat } from './constats';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import {
  TEXTES_DU_DESSIN,
  confirmationDuDessin,
  enTeteDeLaPlanche,
  nomDeLaPalette,
  progressionDuDessin,
  recetteFuture,
  recetteIllisible,
} from './textes';

/** Au-delà de ce nombre, « Dessiner toutes les palettes » demande confirmation (D-I). */
export const SEUIL_DE_CONFIRMATION = 6;

export interface OngletPlancheUi {
  element: HTMLDivElement;
  afficher(classement: Classement, recette: Recette | null, planche: PlancheRangee, profil: ProfilDuDocument, empreinte: string | null): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
  /** L'option de la grille de contraste, que « Dessiner » de l'onglet Palettes suit aussi. */
  grille(): boolean;
}

export interface GestesDeLaPlanche extends GestesDuResultat {
  dessiner(palettes: readonly string[], grille: boolean, noms: { readonly [id: string]: string }): void;
  versLesPalettes(): void;
}

export function createOngletPlanche(gestes: GestesDeLaPlanche): OngletPlancheUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  const enTete = document.createElement('p');
  enTete.className = 'etat-lecture';
  const zoneDuResultat = document.createElement('div');
  const liste = document.createElement('div');
  liste.className = 'liste-planche';
  const confirmation = document.createElement('div');
  confirmation.className = 'confirmation';
  const texteDeConfirmation = document.createElement('p');
  const gestesDeConfirmation = document.createElement('div');
  gestesDeConfirmation.className = 'confirmation-gestes';
  confirmation.append(texteDeConfirmation, gestesDeConfirmation);

  const grille = document.createElement('input');
  grille.type = 'checkbox';
  grille.className = 'case-a-cocher';
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-ligne';
  const texteDeLaGrille = document.createElement('span');
  texteDeLaGrille.textContent = TEXTES_DU_DESSIN.grille;
  etiquette.append(grille, texteDeLaGrille);

  const vide = document.createElement('div');
  vide.className = 'page-stack';

  let recette: Recette | null = null;
  let confirmationOuverte = false;

  const noms = (): { [id: string]: string } =>
    Object.fromEntries((recette?.palettes ?? []).map((palette) => [palette.id, nomDeLaPalette(palette)]));

  function toutDessiner(): void {
    if (!recette) return;
    confirmationOuverte = false;
    gestes.dessiner(recette.palettes.map((palette) => palette.id), grille.checked, noms());
  }

  const dessinerTout = createButton({
    label: TEXTES_DU_DESSIN.dessinerTout,
    onClick: () => {
      if (!recette) return;
      if (recette.palettes.length > SEUIL_DE_CONFIRMATION) {
        confirmationOuverte = true;
        texteDeConfirmation.textContent = confirmationDuDessin(recette.palettes.length);
        confirmation.hidden = false;
      } else toutDessiner();
    },
  });
  gestesDeConfirmation.append(
    createButton({ label: TEXTES_DU_DESSIN.confirmer, onClick: toutDessiner }),
    createButton({
      label: TEXTES_DU_DESSIN.annuler,
      variant: 'secondary',
      onClick: () => {
        confirmationOuverte = false;
        confirmation.hidden = true;
      },
    }),
  );
  confirmation.hidden = true;
  const pied = document.createElement('div');
  pied.className = 'creation-ligne';
  pied.append(dessinerTout, etiquette);

  element.append(enTete, zoneDuResultat, vide, liste, confirmation, pied);

  function ligneDePalette(id: string, nom: string, dessinee: boolean): HTMLDivElement {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-planche';
    const texte = document.createElement('span');
    texte.className = 'ligne-planche-nom';
    texte.textContent = nom;
    const etat = document.createElement('span');
    etat.className = 'ligne-secondaire';
    etat.textContent = dessinee ? TEXTES_DU_DESSIN.dessinee : TEXTES_DU_DESSIN.jamaisDessinee;
    const geste = document.createElement('button');
    geste.type = 'button';
    geste.className = 'bouton-discret';
    geste.textContent = dessinee ? TEXTES_DU_DESSIN.redessiner : TEXTES_DU_DESSIN.dessiner;
    geste.addEventListener('click', () => gestes.dessiner([id], grille.checked, noms()));
    ligne.append(texte, etat, geste);
    return ligne;
  }

  return {
    element,
    grille: () => grille.checked,
    afficher(classement, lue, planche, profil, empreinte) {
      recette = lue;
      if (classement.etat === 'future' || classement.etat === 'illisible') {
        enTete.hidden = true;
        liste.replaceChildren();
        pied.hidden = true;
        const constat = classement.etat === 'future' ? recetteFuture(classement.version) : recetteIllisible(classement.refus);
        vide.replaceChildren(blocDeConstat(constat, 'bloquant'));
        vide.hidden = false;
        return;
      }
      const palettes = lue?.palettes ?? [];
      enTete.hidden = false;
      enTete.textContent = enTeteDeLaPlanche(palettes.length, lue?.formatVersion ?? 1, empreinte, profil);
      pied.hidden = palettes.length === 0;
      vide.hidden = palettes.length > 0;
      if (palettes.length === 0) {
        const texte = document.createElement('p');
        texte.className = 'etat-lecture';
        texte.textContent = TEXTES_DU_DESSIN.plancheSansPalette;
        vide.replaceChildren(texte, createButton({ label: TEXTES_DU_DESSIN.versLesPalettes, variant: 'secondary', onClick: gestes.versLesPalettes }));
      }
      liste.replaceChildren(...palettes.map((palette) => ligneDePalette(palette.id, nomDeLaPalette(palette), palette.id in planche.cadres)));
      if (!confirmationOuverte) confirmation.hidden = true;
    },
    afficherDessin(etat, nomsDuDessin) {
      const enCours = etat.phase === 'en-cours';
      dessinerTout.disabled = enCours;
      dessinerTout.setLabel(etat.phase === 'en-cours' ? progressionDuDessin(etat.fait, etat.total, etat.nom) : TEXTES_DU_DESSIN.dessinerTout);
      const resultat = blocDuResultat(etat, nomsDuDessin, gestes);
      zoneDuResultat.replaceChildren(...(resultat ? [resultat] : []));
      zoneDuResultat.hidden = !resultat;
    },
  };
}
