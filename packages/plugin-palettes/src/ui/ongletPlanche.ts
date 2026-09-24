/**
 * L'onglet Planche (section 13.2, [UI-02]) : l'état de la planche, une ligne
 * par palette et son geste, puis « Dessiner toutes les palettes » et
 * l'option de la grille de contraste (section 9.5). Au-delà de six palettes,
 * le dessin de toutes demande confirmation ([PLA-24], D-I). Chaque palette dit
 * si son cadre est à jour ([PLA-20]) ; les cadres orphelins, les copies et le
 * profil Display P3 se lisent en notices, en dernier.
 */
import type { Classement, Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { EtatDeLaPlanche, ProfilDuDocument } from '../lecture';
import { fraicheurDeLaPlanche, type EtatDuCadre } from '../planche/fraicheur';
import { blocDeConstat } from './constats';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import type { OptionsDeGeneration } from './optionsDeGeneration';
import {
  TEXTES_DU_DESSIN,
  cadreOrphelin,
  confirmationDuDessin,
  copieDeCadre,
  enTeteDeLaPlanche,
  nomDeLaPalette,
  noticeDisplayP3,
  progressionDuDessin,
  recetteFuture,
  recetteIllisible,
  type Constat,
} from './textes';

/** Au-delà de ce nombre, « Dessiner toutes les palettes » demande confirmation (D-I). */
export const SEUIL_DE_CONFIRMATION = 6;

export interface OngletPlancheUi {
  element: HTMLDivElement;
  afficher(classement: Classement, recette: Recette | null, planche: EtatDeLaPlanche, profil: ProfilDuDocument, empreinte: string | null): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
}

export interface GestesDeLaPlanche extends GestesDuResultat {
  dessiner(palettes: readonly string[], grille: boolean, noms: { readonly [id: string]: string }): void;
  versLesPalettes(): void;
  /** Les gestes de la recette en fichier, au pied de l'onglet ([UI-02]). */
  recetteEnFichier: GestesDeLaRecetteUi;
  /** Les options de génération, partagées avec l'onglet Palettes. */
  options: OptionsDeGeneration;
}

export function createOngletPlanche(gestes: GestesDeLaPlanche): OngletPlancheUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  const enTete = document.createElement('p');
  enTete.className = 'etat-lecture';
  const zoneDuResultat = document.createElement('div');
  zoneDuResultat.hidden = true;
  const liste = document.createElement('div');
  liste.className = 'liste-planche';
  const notices = document.createElement('div');
  notices.className = 'page-stack';
  const confirmation = document.createElement('div');
  confirmation.className = 'confirmation';
  const texteDeConfirmation = document.createElement('p');
  const gestesDeConfirmation = document.createElement('div');
  gestesDeConfirmation.className = 'confirmation-gestes';
  confirmation.append(texteDeConfirmation, gestesDeConfirmation);


  const vide = document.createElement('div');
  vide.className = 'page-stack';

  let recette: Recette | null = null;
  let confirmationOuverte = false;

  const noms = (): { [id: string]: string } =>
    Object.fromEntries((recette?.palettes ?? []).map((palette) => [palette.id, nomDeLaPalette(palette)]));

  function toutDessiner(): void {
    if (!recette) return;
    confirmationOuverte = false;
    gestes.dessiner(recette.palettes.map((palette) => palette.id), gestes.options.grille(), noms());
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
  pied.append(dessinerTout);

  // Les notices ont le dernier rang : elles suivent « Dessiner toutes les palettes ».
  element.append(enTete, zoneDuResultat, vide, liste, confirmation, pied, gestes.options.creerRepli(), notices, gestes.recetteEnFichier.element);

  function ligneDePalette(id: string, nom: string, etatDuCadre: EtatDuCadre): HTMLDivElement {
    const ligne = document.createElement('div');
    ligne.className = 'ligne-planche';
    const texte = document.createElement('span');
    texte.className = 'ligne-planche-nom';
    texte.textContent = nom;
    const etat = document.createElement('span');
    etat.className = 'ligne-secondaire';
    etat.textContent = { 'a-jour': TEXTES_DU_DESSIN.aJour, perimee: TEXTES_DU_DESSIN.perimee, 'jamais-dessinee': TEXTES_DU_DESSIN.jamaisDessinee }[etatDuCadre];
    ligne.dataset.etat = etatDuCadre;
    ligne.append(texte, etat);
    // Un cadre à jour n'a rien à redessiner ([PLA-20]) : « Dessiner toutes les palettes » reste là.
    if (etatDuCadre === 'a-jour') return ligne;
    const geste = document.createElement('button');
    geste.type = 'button';
    geste.className = 'bouton-discret';
    geste.textContent = TEXTES_DU_DESSIN.dessiner;
    geste.addEventListener('click', () => gestes.dessiner([id], gestes.options.grille(), noms()));
    ligne.append(geste);
    return ligne;
  }

  /** Une notice sur un cadre de la planche, avec le geste qui l'y montre (E18). */
  function noticeDeCadre(constat: Constat, page: string | null, cadre: string): HTMLDivElement {
    const bloc = blocDeConstat(constat, 'notice');
    if (page !== null) {
      const voir = document.createElement('button');
      voir.type = 'button';
      voir.className = 'bouton-discret';
      voir.textContent = TEXTES_DU_DESSIN.voirSurLaPlanche;
      voir.addEventListener('click', () => gestes.voirSurLaPlanche(page, [cadre]));
      bloc.append(voir);
    }
    return bloc;
  }

  return {
    element,
    afficher(classement, lue, planche, profil, empreinte) {
      recette = lue;
      gestes.recetteEnFichier.afficher(classement);
      if (classement.etat === 'future' || classement.etat === 'illisible') {
        enTete.hidden = true;
        liste.replaceChildren();
        notices.replaceChildren();
        pied.hidden = true;
        const constat = classement.etat === 'future' ? recetteFuture(classement.version) : recetteIllisible(classement.refus);
        vide.replaceChildren(blocDeConstat(constat, 'bloquant'));
        vide.hidden = false;
        return;
      }
      const palettes = lue?.palettes ?? [];
      enTete.hidden = false;
      enTete.textContent = enTeteDeLaPlanche(palettes.length);
      pied.hidden = palettes.length === 0;
      vide.hidden = palettes.length > 0;
      if (palettes.length === 0) {
        const texte = document.createElement('p');
        texte.className = 'etat-lecture';
        texte.textContent = TEXTES_DU_DESSIN.plancheSansPalette;
        vide.replaceChildren(texte, createButton({ label: TEXTES_DU_DESSIN.versLesPalettes, variant: 'secondary', onClick: gestes.versLesPalettes }));
      }
      const fraicheur = lue ? fraicheurDeLaPlanche(lue, profil, planche) : { palettes: [], orphelins: [], copies: [] };
      liste.replaceChildren(...palettes.map((palette, rang) => ligneDePalette(palette.id, nomDeLaPalette(palette), fraicheur.palettes[rang].etat)));
      notices.replaceChildren(
        ...fraicheur.orphelins.map(({ nom, cadre }) => noticeDeCadre(cadreOrphelin(nom), planche.page, cadre)),
        ...fraicheur.copies.map(({ nom, cadre }) => noticeDeCadre(copieDeCadre(nom), planche.page, cadre)),
        ...(profil === 'DISPLAY_P3' ? [blocDeConstat(noticeDisplayP3(), 'notice')] : []),
      );
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
