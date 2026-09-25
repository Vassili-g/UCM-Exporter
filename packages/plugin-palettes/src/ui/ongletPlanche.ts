/**
 * L'onglet Planche (section 13.2, [UI-02]) : une fiche par palette, dans
 * l'ordre de la recette, avec ses rampes Soft et Vivid dans le thème choisi
 * en tête, sa référence, le résultat de ses garanties et l'état de son cadre
 * (V8.1, V8.2). Chaque fiche porte trois gestes : « Afficher dans Figma » pour
 * un cadre localisé, « Modifier la palette » et « Générer sur Figma » (V8.3).
 * Suivent la génération des palettes qui ne sont pas à jour et celle de toutes
 * (V8.4), les notices, puis la carte repliée « Palettes et réglages » (V8.5).
 *
 * Chaque génération dessine la grille des contrastes (section 9.5). Au-delà de
 * six palettes, une génération groupée demande confirmation ([PLA-24], D-I).
 */
import { MODES, PROFILS, lireHexa, type Classement, type Mode, type Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { analyserPalette } from '../analyse';
import { VERSION_DU_SUIVI, type EtatDeLaPlanche, type ProfilDuDocument } from '../lecture';
import { fraicheurDeLaPlanche, type CadreDUnePalette } from '../planche/fraicheur';
import { createCarte } from './carte';
import { blocDeConstat } from './constats';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { encresSur } from './nuancier';
import {
  NOM_DU_PROFIL,
  TEXTES,
  TEXTES_DU_DESSIN,
  cadreOrphelin,
  confirmationDuDessin,
  copieDeCadre,
  detailsTechniques,
  enTeteDeLaPlanche,
  etatDuCadreEcrit,
  genererLesPalettesPasAJour,
  ligneDeLaReference,
  nomDeLaPalette,
  noticeDisplayP3,
  pageDuCadre,
  progressionDuDessin,
  rechercheBornee,
  recetteFuture,
  recetteIllisible,
  resultatDuProfil,
  resultatDuProfilEnMots,
  suiviFutur,
  type Constat,
} from './textes';

/** Au-delà de ce nombre, une génération groupée demande confirmation (D-I). */
export const SEUIL_DE_CONFIRMATION = 6;

export interface OngletPlancheUi {
  element: HTMLDivElement;
  afficher(classement: Classement, recette: Recette | null, planche: EtatDeLaPlanche, profil: ProfilDuDocument, empreinte: string | null): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
}

export interface GestesDeLaPlanche extends GestesDuResultat {
  dessiner(palettes: readonly string[], noms: { readonly [id: string]: string }): void;
  versLesPalettes(): void;
  /** Ouvre la palette dans l'onglet Palettes, dans le thème des fiches (V8.3). */
  modifier(id: string, mode: Mode): void;
  /** Relit la planche ; `'fichier'` cherche les cadres sur toutes les pages (V8.6, V8.7). */
  actualiser(recherche?: 'fichier'): void;
  /** Les gestes de la recette en fichier, dans la carte « Palettes et réglages » (V8.5). */
  recetteEnFichier: GestesDeLaRecetteUi;
}

/** Les états d'un cadre qu'une génération groupée « pas à jour » reprend : tous, sauf à jour et illisible. */
const A_GENERER: ReadonlySet<CadreDUnePalette['etat']> = new Set(['perimee', 'jamais-dessinee', 'introuvable']);

function bouton(texte: string, classe: 'bouton-discret' | 'lien-de-constat', surClic: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = classe;
  element.textContent = texte;
  element.addEventListener('click', surClic);
  return element;
}

export function createOngletPlanche(gestes: GestesDeLaPlanche): OngletPlancheUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  // En-tête : le compte des palettes, le thème des fiches et « Actualiser ».
  const compte = document.createElement('p');
  compte.className = 'planche-compte';
  const bascule = document.createElement('div');
  bascule.className = 'bascule';
  bascule.setAttribute('role', 'group');
  bascule.setAttribute('aria-label', TEXTES_DU_DESSIN.themeDesFiches);
  let mode: Mode = 'light';
  const boutonsDeMode = MODES.map((valeur) => {
    const choix = document.createElement('button');
    choix.type = 'button';
    choix.className = 'bascule-option';
    choix.textContent = valeur === 'light' ? TEXTES.modeClair : TEXTES.modeSombre;
    choix.addEventListener('click', () => {
      mode = valeur;
      rendre();
    });
    bascule.append(choix);
    return { valeur, choix };
  });
  const actualiser = bouton(TEXTES_DU_DESSIN.actualiser, 'bouton-discret', () => gestes.actualiser());
  const enTete = document.createElement('div');
  enTete.className = 'planche-tete';
  enTete.append(compte, bascule, actualiser);

  const zoneDuResultat = document.createElement('div');
  zoneDuResultat.hidden = true;
  const liste = document.createElement('div');
  liste.className = 'liste-planche';
  const notices = document.createElement('div');
  notices.className = 'page-stack';
  const vide = document.createElement('div');
  vide.className = 'page-stack';

  // La confirmation d'une génération groupée : elle garde les palettes qu'elle confirme.
  const confirmation = document.createElement('div');
  confirmation.className = 'confirmation';
  const texteDeConfirmation = document.createElement('p');
  const gestesDeConfirmation = document.createElement('div');
  gestesDeConfirmation.className = 'confirmation-gestes';
  confirmation.append(texteDeConfirmation, gestesDeConfirmation);
  confirmation.hidden = true;
  let aConfirmer: readonly string[] | null = null;

  const genererPasAJour = createButton({ label: genererLesPalettesPasAJour(0), onClick: () => demander(pasAJour) });
  const genererTout = createButton({ label: TEXTES_DU_DESSIN.dessinerTout, variant: 'secondary', onClick: () => demander(recette?.palettes.map((palette) => palette.id) ?? []) });
  gestesDeConfirmation.append(
    createButton({ label: TEXTES_DU_DESSIN.confirmer, onClick: () => lancer(aConfirmer ?? []) }),
    createButton({
      label: TEXTES_DU_DESSIN.annuler,
      variant: 'secondary',
      onClick: () => {
        aConfirmer = null;
        confirmation.hidden = true;
      },
    }),
  );
  const pied = document.createElement('div');
  pied.className = 'creation-ligne';
  pied.append(genererPasAJour, genererTout);

  // Import, export, rapport et détails techniques, repliés (V8.5).
  const carteDeLaRecette = createCarte({ titre: TEXTES_DU_DESSIN.palettesEtReglages, repliable: { ouverte: false } });
  const details = document.createElement('p');
  details.className = 'ligne-secondaire';
  carteDeLaRecette.corps.append(gestes.recetteEnFichier.element, details);

  element.append(enTete, zoneDuResultat, vide, liste, confirmation, pied, notices, carteDeLaRecette.element);

  let recette: Recette | null = null;
  let planche: EtatDeLaPlanche | null = null;
  let profil: ProfilDuDocument = 'SRGB';
  let pasAJour: readonly string[] = [];
  let enCours = false;

  const noms = (): { [id: string]: string } =>
    Object.fromEntries((recette?.palettes ?? []).map((palette) => [palette.id, nomDeLaPalette(palette)]));

  function lancer(palettes: readonly string[]): void {
    aConfirmer = null;
    confirmation.hidden = true;
    gestes.dessiner(palettes, noms());
  }

  function demander(palettes: readonly string[]): void {
    if (palettes.length === 0) return;
    if (palettes.length <= SEUIL_DE_CONFIRMATION) {
      lancer(palettes);
      return;
    }
    aConfirmer = palettes;
    texteDeConfirmation.textContent = confirmationDuDessin(palettes.length);
    confirmation.hidden = false;
  }

  /** Les rampes Soft et Vivid d'une palette, peintes du fond du thème choisi, la référence marquée ◆. */
  function apercuDeLaFiche(lue: Recette, analyse: ReturnType<typeof analyserPalette>): HTMLDivElement {
    const surface = document.createElement('div');
    surface.className = 'fiche-apercu';
    surface.style.background = lue.fonds[mode];
    const encres = encresSur(lireHexa(lue.fonds[mode]) ?? [255, 255, 255]);
    surface.style.setProperty('--encre-surface', encres.encre);
    surface.style.setProperty('--bordure-surface', encres.bordure);
    surface.setAttribute('aria-hidden', 'true');
    for (const duProfil of PROFILS) {
      const rangee = document.createElement('div');
      rangee.className = 'fiche-rangee';
      const nom = document.createElement('span');
      nom.className = 'fiche-profil';
      nom.textContent = NOM_DU_PROFIL[duProfil];
      rangee.append(nom);
      analyse.rampes[duProfil][mode].forEach((cran, rang) => {
        const pastille = document.createElement('span');
        pastille.className = 'fiche-pastille';
        pastille.style.background = cran.hexa;
        if (analyse.ancrage.profil === duProfil && analyse.ancrage.rangs[mode] === rang) {
          pastille.dataset.reference = 'true';
          pastille.textContent = '◆';
          pastille.style.color = encresSur(lireHexa(cran.hexa) ?? [255, 255, 255]).encre;
        }
        rangee.append(pastille);
      });
      surface.append(rangee);
    }
    return surface;
  }

  function ficheDePalette(lue: Recette, id: string, cadre: CadreDUnePalette, sansGeneration: boolean): HTMLElement {
    const palette = lue.palettes.find((candidate) => candidate.id === id)!;
    const analyse = analyserPalette(lue, palette);
    const nom = nomDeLaPalette(palette);
    const fiche = createCarte({ titre: nom });
    fiche.element.classList.add('fiche-planche');
    fiche.element.dataset.palette = id;
    fiche.element.dataset.etat = cadre.etat;

    const reference = document.createElement('p');
    reference.className = 'ligne-secondaire';
    reference.textContent = `◆ ${ligneDeLaReference(analyse.ancrage, mode)}`;

    // Le résultat de chaque profil dans le thème choisi, comme la bascule des garanties (V4.2).
    const resultats = document.createElement('p');
    resultats.className = 'fiche-garanties';
    const manquees = (duProfil: (typeof PROFILS)[number]) =>
      analyse.promesses.filter((promesse) => promesse.mode === mode && promesse.profil === duProfil && promesse.verdict === 'manquee').length;
    for (const duProfil of PROFILS) {
      const resultat = document.createElement('span');
      resultat.textContent = resultatDuProfil(duProfil, manquees(duProfil));
      resultat.dataset.verdict = manquees(duProfil) === 0 ? 'tenue' : 'manquee';
      resultat.setAttribute('aria-label', resultatDuProfilEnMots(duProfil, manquees(duProfil)));
      resultats.append(resultat);
    }

    // L'état du cadre est un autre sujet que les garanties : un ratio manqué n'est pas une panne (V8.2).
    const etat = document.createElement('p');
    etat.className = 'etat-du-cadre';
    etat.dataset.etat = cadre.etat;
    const horsDeLaPlanche = cadre.page !== null && planche !== null && cadre.page !== planche.page && cadre.nomDeLaPage;
    etat.textContent = horsDeLaPlanche ? `${etatDuCadreEcrit(cadre.etat)} · ${pageDuCadre(cadre.nomDeLaPage!)}` : etatDuCadreEcrit(cadre.etat);

    const gestesDeLaFiche = document.createElement('div');
    gestesDeLaFiche.className = 'fiche-gestes';
    if (cadre.cadre && cadre.page) {
      const voir = bouton(TEXTES_DU_DESSIN.voirSurLaPlanche, 'bouton-discret', () => gestes.voirSurLaPlanche(cadre.page!, [cadre.cadre!]));
      voir.dataset.geste = 'voir';
      gestesDeLaFiche.append(voir);
    }
    const modifier = bouton(TEXTES_DU_DESSIN.modifier, 'bouton-discret', () => gestes.modifier(id, mode));
    modifier.dataset.geste = 'modifier';
    gestesDeLaFiche.append(modifier);
    if (!sansGeneration && cadre.etat !== 'illisible') {
      const generer = bouton(TEXTES_DU_DESSIN.dessiner, 'bouton-discret', () => lancer([id]));
      generer.dataset.geste = 'generer';
      generer.disabled = enCours;
      gestesDeLaFiche.append(generer);
    }

    fiche.corps.append(apercuDeLaFiche(lue, analyse), reference, resultats, etat, gestesDeLaFiche);
    return fiche.element;
  }

  /** Une notice sur un cadre, avec le geste qui le montre dans Figma (E18). */
  function noticeDeCadre(constat: Constat, page: string, cadre: string): HTMLDivElement {
    const bloc = blocDeConstat(constat, 'notice');
    bloc.append(bouton(TEXTES_DU_DESSIN.voirSurLaPlanche, 'bouton-discret', () => gestes.voirSurLaPlanche(page, [cadre])));
    return bloc;
  }

  function rendre(): void {
    for (const { valeur, choix } of boutonsDeMode) choix.setAttribute('aria-pressed', String(valeur === mode));
    if (!recette || !planche) return;
    const lue = recette;
    const palettes = lue.palettes;
    compte.textContent = enTeteDeLaPlanche(palettes.length);
    details.textContent = detailsTechniques(empreinte, VERSION_DU_SUIVI);

    vide.hidden = palettes.length > 0 && !planche.suiviFutur;
    if (planche.suiviFutur) vide.replaceChildren(blocDeConstat(suiviFutur(), 'bloquant'));
    else if (palettes.length === 0) {
      const texte = document.createElement('p');
      texte.className = 'etat-lecture';
      texte.textContent = TEXTES_DU_DESSIN.plancheSansPalette;
      vide.replaceChildren(texte, createButton({ label: TEXTES_DU_DESSIN.versLesPalettes, variant: 'secondary', onClick: gestes.versLesPalettes }));
    }

    const fraicheur = fraicheurDeLaPlanche(lue, profil, planche);
    pasAJour = fraicheur.palettes.filter(({ etat }) => A_GENERER.has(etat)).map(({ palette }) => palette);

    // Les fiches se reconstruisent : le focus d'un geste revient au même geste de la même fiche.
    const actif = document.activeElement as HTMLElement | null;
    const repere = actif && liste.contains(actif) ? { palette: actif.closest<HTMLElement>('.fiche-planche')?.dataset.palette, geste: actif.dataset.geste } : null;
    liste.replaceChildren(...fraicheur.palettes.map((cadre) => ficheDePalette(lue, cadre.palette, cadre, planche!.suiviFutur)));
    if (repere?.palette && repere.geste) {
      liste.querySelector<HTMLElement>(`.fiche-planche[data-palette="${repere.palette}"] [data-geste="${repere.geste}"]`)?.focus();
    }

    pied.hidden = palettes.length === 0 || planche.suiviFutur;
    genererPasAJour.hidden = pasAJour.length === 0;
    genererPasAJour.setLabel(genererLesPalettesPasAJour(pasAJour.length));

    const introuvables = fraicheur.palettes.filter(({ etat }) => etat === 'introuvable').map(({ palette }) => noms()[palette] ?? palette);
    const bornee: HTMLElement[] = [];
    if (planche.recherche === 'page' && introuvables.length > 0) {
      const bloc = blocDeConstat(rechercheBornee(planche.nomDeLaPage, introuvables), 'notice');
      bloc.append(bouton(TEXTES_DU_DESSIN.chercherPartout, 'bouton-discret', () => gestes.actualiser('fichier')));
      bornee.push(bloc);
    }
    notices.replaceChildren(
      ...bornee,
      ...fraicheur.orphelins.map(({ nom, cadre, page }) => noticeDeCadre(cadreOrphelin(nom), page, cadre)),
      ...fraicheur.copies.map(({ nom, cadre, page }) => noticeDeCadre(copieDeCadre(nom), page, cadre)),
      ...(profil === 'DISPLAY_P3' ? [blocDeConstat(noticeDisplayP3(), 'notice')] : []),
    );
    notices.hidden = notices.childElementCount === 0;
  }

  let empreinte: string | null = null;

  return {
    element,
    afficher(classement, lue, plancheLue, profilLu, empreinteLue) {
      gestes.recetteEnFichier.afficher(classement);
      if (classement.etat === 'future' || classement.etat === 'illisible') {
        recette = null;
        enTete.hidden = true;
        liste.replaceChildren();
        notices.replaceChildren();
        pied.hidden = true;
        const constat = classement.etat === 'future' ? recetteFuture(classement.version) : recetteIllisible(classement.refus);
        vide.replaceChildren(blocDeConstat(constat, 'bloquant'));
        vide.hidden = false;
        // Les gestes de sortie d'une recette illisible ou future se montrent sans clic ([REC-11]).
        carteDeLaRecette.ouvrir();
        return;
      }
      enTete.hidden = false;
      recette = lue;
      planche = plancheLue;
      profil = profilLu;
      empreinte = empreinteLue;
      rendre();
    },
    afficherDessin(etat, nomsDuDessin) {
      enCours = etat.phase === 'en-cours';
      genererTout.disabled = enCours;
      genererPasAJour.disabled = enCours;
      actualiser.disabled = enCours;
      genererTout.setLabel(etat.phase === 'en-cours' ? progressionDuDessin(etat.fait, etat.total, etat.nom) : TEXTES_DU_DESSIN.dessinerTout);
      liste.querySelectorAll<HTMLButtonElement>('[data-geste="generer"]').forEach((generer) => {
        generer.disabled = enCours;
      });
      const resultat = blocDuResultat(etat, nomsDuDessin, gestes);
      zoneDuResultat.replaceChildren(...(resultat ? [resultat] : []));
      zoneDuResultat.hidden = !resultat;
    },
  };
}
