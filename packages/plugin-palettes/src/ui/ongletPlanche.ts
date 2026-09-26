/**
 * L'onglet Planches (section 13.2, [UI-02]) : une fiche par palette, dans
 * l'ordre de la recette, avec ses rampes Soft et Vivid dans le thème choisi
 * en tête, sa référence, le résultat de ses garanties et l'état de son cadre
 * (V8.1, V8.2). Chaque fiche porte ses gestes dans cet ordre : « Générer sur
 * Figma » ou « Actualiser sur Figma », bouton principal, quand le cadre en
 * demande un ; « Afficher » pour un cadre localisé ; « Modifier ». Tous ont la
 * taille compacte du socle. Suivent « Mettre à jour » et « Générer tout »
 * (V8.4), une carte par palette supprimée dont le cadre reste dans Figma
 * ([PLA-27]), les notices, puis la carte repliée « Palettes et réglages »
 * (V8.5).
 *
 * Chaque génération dessine la grille des contrastes (section 9.5). Au-delà de
 * six palettes, une génération groupée demande confirmation ([PLA-24], D-I).
 */
import { MODES, type Classement, type Mode, type Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { analyserPalette } from '../analyse';
import type { IssueDuRetrait } from '../ecriture/planche';
import { VERSION_DU_SUIVI, type CadreLu, type EtatDeLaPlanche, type ProfilDuDocument } from '../lecture';
import { fraicheurDeLaPlanche, type CadreDUnePalette, type FraicheurDeLaPlanche } from '../planche/fraicheur';
import { apercuCompact, resultatsDesGaranties } from './apercuCompact';
import { createCarte } from './carte';
import { blocDeConstat } from './constats';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import {
  TEXTES,
  TEXTES_DE_LA_PALETTE_SUPPRIMEE,
  TEXTES_DU_DESSIN,
  confirmationDuDessin,
  copieDeCadre,
  detailsTechniques,
  enTeteDeLaPlanche,
  etatDuCadreEcrit,
  genererLesPalettesPasAJour,
  genererToutesLesPalettes,
  ligneDeLaReference,
  nomDeLaPalette,
  noticeDisplayP3,
  pageDuCadre,
  premierGesteDeLaFiche,
  progressionDuDessin,
  rechercheBornee,
  recetteFuture,
  recetteIllisible,
  suiviFutur,
  suppressionRefusee,
  type Constat,
} from './textes';

/** Au-delà de ce nombre, une génération groupée demande confirmation (D-I). */
export const SEUIL_DE_CONFIRMATION = 6;

export interface OngletPlancheUi {
  element: HTMLDivElement;
  afficher(classement: Classement, recette: Recette | null, planche: EtatDeLaPlanche, profil: ProfilDuDocument, empreinte: string | null): void;
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
  /** Rend les gestes de génération inactifs, avec la raison ; `null` les rend (V12.1). */
  bloquer(raison: string | null): void;
  /**
   * L'issue de « Supprimer définitivement » ([PLA-27]). Un cadre retiré ou
   * déjà absent quitte la planche par l'état suivant ; sa carte disparaît
   * alors, et le focus passe à la carte suivante, ou au compte des palettes.
   */
  recevoirRetrait(issue: IssueDuRetrait): void;
}

export interface GestesDeLaPlanche extends GestesDuResultat {
  dessiner(palettes: readonly string[], noms: { readonly [id: string]: string }): void;
  versLesPalettes(): void;
  /** Ouvre la palette dans l'onglet Palettes, dans le thème des fiches (V8.3). */
  modifier(id: string, mode: Mode): void;
  /** Relit la planche ; `'fichier'` cherche les cadres sur toutes les pages (V8.6, V8.7). */
  actualiser(recherche?: 'fichier'): void;
  /** Demande le retrait du cadre d'une palette supprimée ; `false` quand rien ne part, pendant un conflit. */
  retirer(palette: string, cadre: string): boolean;
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
  // Le focus y revient quand la dernière carte de palette supprimée disparaît.
  compte.tabIndex = -1;
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
  const genererTout = createButton({ label: genererToutesLesPalettes(0), variant: 'secondary', onClick: () => demander(recette?.palettes.map((palette) => palette.id) ?? []) });
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
  pied.className = 'creation-ligne gestes-globaux';
  pied.append(genererPasAJour, genererTout);

  // Import, export, rapport et détails techniques, repliés (V8.5).
  const carteDeLaRecette = createCarte({ titre: TEXTES_DU_DESSIN.palettesEtReglages, repliable: { ouverte: false } });
  const details = document.createElement('p');
  details.className = 'ligne-secondaire';
  carteDeLaRecette.corps.append(gestes.recetteEnFichier.element, details);

  // Les palettes supprimées dont le cadre reste dans Figma, puis l'issue du dernier retrait ([PLA-27]).
  const supprimees = document.createElement('div');
  supprimees.className = 'liste-planche';
  const annonceDuRetrait = document.createElement('div');
  annonceDuRetrait.className = 'page-stack';
  annonceDuRetrait.setAttribute('role', 'status');
  annonceDuRetrait.hidden = true;

  element.append(enTete, zoneDuResultat, vide, liste, confirmation, pied, supprimees, annonceDuRetrait, notices, carteDeLaRecette.element);

  let recette: Recette | null = null;
  let planche: EtatDeLaPlanche | null = null;
  /**
   * La fraîcheur et les analyses ne dépendent pas du thème des fiches : elles
   * se calculent à chaque état lu, pas à chaque bascule de thème.
   */
  let fraicheur: FraicheurDeLaPlanche | null = null;
  const analyses = new Map<string, ReturnType<typeof analyserPalette>>();
  let profil: ProfilDuDocument = 'SRGB';
  let pasAJour: readonly string[] = [];
  let enCours = false;
  let blocage: string | null = null;
  /** Le retrait demandé, jusqu'à son issue : le cadre, son nom et le rang de sa carte. */
  let retraitEnCours: { readonly cadre: string; readonly nom: string; readonly rang: number } | null = null;
  /** Le rang de la carte retirée, que le focus rejoint au rendu qui la fait disparaître. */
  let focusApresRetrait: number | null = null;

  /** Les gestes de génération, inactifs pendant un dessin ou un conflit d'enregistrement. */
  function rendreLesGestes(): void {
    const inactif = enCours || blocage !== null;
    for (const bouton of [genererTout, genererPasAJour, ...Array.from(liste.querySelectorAll<HTMLButtonElement>('[data-geste="generer"]'))]) {
      bouton.disabled = inactif;
      bouton.title = blocage ?? '';
    }
    for (const bouton of Array.from(supprimees.querySelectorAll<HTMLButtonElement>('[data-geste="supprimer"]'))) {
      bouton.disabled = inactif || retraitEnCours !== null;
      bouton.title = blocage === null ? '' : TEXTES_DE_LA_PALETTE_SUPPRIMEE.enConflit;
    }
  }

  function retirer(cadre: CadreLu, rang: number): void {
    if (retraitEnCours || !gestes.retirer(cadre.palette, cadre.cadre)) return;
    retraitEnCours = { cadre: cadre.cadre, nom: cadre.nom, rang };
    annonceDuRetrait.replaceChildren();
    rendreLesGestes();
  }

  /** La carte d'une palette supprimée : son nom, une phrase, « Afficher dans Figma » et « Supprimer définitivement ». */
  function carteSupprimee(cadre: CadreLu, rang: number): HTMLElement {
    const carte = createCarte({ titre: cadre.nom });
    carte.element.classList.add('fiche-planche', 'carte-supprimee');
    carte.element.dataset.cadre = cadre.cadre;
    const texte = document.createElement('p');
    texte.textContent = TEXTES_DE_LA_PALETTE_SUPPRIMEE.texte;
    const gestesDeLaCarte = document.createElement('div');
    gestesDeLaCarte.className = 'fiche-gestes';
    const voir = createButton({ label: TEXTES_DU_DESSIN.voirSurLaPlanche, variant: 'secondary', compact: true, onClick: () => gestes.voirSurLaPlanche(cadre.page, [cadre.cadre]) });
    voir.dataset.geste = 'voir';
    const supprimer = createButton({ label: TEXTES_DE_LA_PALETTE_SUPPRIMEE.supprimer, variant: 'danger', compact: true, onClick: () => retirer(cadre, rang) });
    supprimer.dataset.geste = 'supprimer';
    gestesDeLaCarte.append(voir, supprimer);
    carte.corps.append(texte, gestesDeLaCarte);
    return carte.element;
  }

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

  function ficheDePalette(lue: Recette, id: string, cadre: CadreDUnePalette, sansGeneration: boolean): HTMLElement {
    const palette = lue.palettes.find((candidate) => candidate.id === id)!;
    const analyse = analyses.get(id) ?? analyserPalette(lue, palette);
    analyses.set(id, analyse);
    const nom = nomDeLaPalette(palette);
    const fiche = createCarte({ titre: nom });
    fiche.element.classList.add('fiche-planche');
    fiche.element.dataset.palette = id;
    fiche.element.dataset.etat = cadre.etat;

    const reference = document.createElement('p');
    reference.className = 'ligne-secondaire';
    reference.textContent = `◆ ${ligneDeLaReference(analyse.ancrage, mode)}`;

    // L'état du cadre est un autre sujet que les garanties : un ratio manqué n'est pas une panne (V8.2).
    const etat = document.createElement('p');
    etat.className = 'etat-du-cadre';
    etat.dataset.etat = cadre.etat;
    const horsDeLaPlanche = cadre.page !== null && planche !== null && cadre.page !== planche.page && cadre.nomDeLaPage;
    etat.textContent = horsDeLaPlanche ? `${etatDuCadreEcrit(cadre.etat)} · ${pageDuCadre(cadre.nomDeLaPage!)}` : etatDuCadreEcrit(cadre.etat);
    // Un cadre jamais dessiné n'a pas d'état écrit : « Générer sur Figma » le dit.
    etat.hidden = etat.textContent === '';

    const gestesDeLaFiche = document.createElement('div');
    gestesDeLaFiche.className = 'fiche-gestes';
    const premier = sansGeneration ? null : premierGesteDeLaFiche(cadre.etat);
    if (premier) {
      const generer = createButton({ label: premier, compact: true, onClick: () => lancer([id]) });
      generer.dataset.geste = 'generer';
      generer.disabled = enCours || blocage !== null;
      generer.title = blocage ?? '';
      gestesDeLaFiche.append(generer);
    }
    if (cadre.cadre && cadre.page) {
      const voir = createButton({ label: TEXTES_DU_DESSIN.afficher, variant: 'secondary', compact: true, onClick: () => gestes.voirSurLaPlanche(cadre.page!, [cadre.cadre!]) });
      voir.dataset.geste = 'voir';
      gestesDeLaFiche.append(voir);
    }
    const modifier = createButton({ label: TEXTES_DU_DESSIN.modifier, variant: 'secondary', compact: true, onClick: () => gestes.modifier(id, mode) });
    modifier.dataset.geste = 'modifier';
    gestesDeLaFiche.append(modifier);

    fiche.corps.append(apercuCompact(lue, analyse, mode), reference, resultatsDesGaranties(analyse, mode), etat, gestesDeLaFiche);
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

    fraicheur ??= fraicheurDeLaPlanche(lue, profil, planche);
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
    if (!enCours) genererTout.setLabel(genererToutesLesPalettes(palettes.length));

    const introuvables = fraicheur.palettes.filter(({ etat }) => etat === 'introuvable').map(({ palette }) => noms()[palette] ?? palette);
    const bornee: HTMLElement[] = [];
    if (planche.recherche === 'page' && introuvables.length > 0) {
      const bloc = blocDeConstat(rechercheBornee(planche.nomDeLaPage, introuvables), 'notice');
      bloc.append(bouton(TEXTES_DU_DESSIN.chercherPartout, 'bouton-discret', () => gestes.actualiser('fichier')));
      bornee.push(bloc);
    }
    // Une carte se reconstruit comme une fiche : le focus d'un geste revient au même geste de la même carte.
    const repereSupprime = actif && supprimees.contains(actif) ? { cadre: actif.closest<HTMLElement>('.carte-supprimee')?.dataset.cadre, geste: actif.dataset.geste } : null;
    supprimees.replaceChildren(...fraicheur.orphelins.map((cadre, rang) => carteSupprimee(cadre, rang)));
    supprimees.hidden = fraicheur.orphelins.length === 0;
    rendreLesGestes();
    if (focusApresRetrait !== null) {
      const suivante = supprimees.querySelectorAll<HTMLElement>('.carte-supprimee')[focusApresRetrait];
      (suivante?.querySelector<HTMLElement>('[data-geste="voir"]') ?? compte).focus();
      focusApresRetrait = null;
    } else if (repereSupprime?.cadre && repereSupprime.geste) {
      supprimees.querySelector<HTMLElement>(`.carte-supprimee[data-cadre="${repereSupprime.cadre}"] [data-geste="${repereSupprime.geste}"]`)?.focus();
    }

    notices.replaceChildren(
      ...bornee,
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
      fraicheur = null;
      analyses.clear();
      rendre();
    },
    afficherDessin(etat, nomsDuDessin) {
      enCours = etat.phase === 'en-cours';
      actualiser.disabled = enCours;
      genererTout.setLabel(etat.phase === 'en-cours' ? progressionDuDessin(etat.fait, etat.total, etat.nom) : genererToutesLesPalettes(recette?.palettes.length ?? 0));
      rendreLesGestes();
      const resultat = blocDuResultat(etat, nomsDuDessin, gestes);
      zoneDuResultat.replaceChildren(...(resultat ? [resultat] : []));
      zoneDuResultat.hidden = !resultat;
    },
    bloquer(raison) {
      blocage = raison;
      gestes.recetteEnFichier.bloquer(raison);
      rendreLesGestes();
    },
    recevoirRetrait(issue) {
      const retrait = retraitEnCours;
      retraitEnCours = null;
      if (!retrait) return;
      if (issue.issue === 'retire' || issue.issue === 'deja-absent') {
        focusApresRetrait = retrait.rang;
        const annonce = document.createElement('p');
        annonce.className = 'ligne-secondaire';
        annonce.textContent = TEXTES_DE_LA_PALETTE_SUPPRIMEE.supprime(retrait.nom);
        // Un cadre déjà absent n'a rien que Ctrl+Z puisse rendre : sa carte disparaît sans annonce.
        annonceDuRetrait.replaceChildren(...(issue.issue === 'retire' ? [annonce] : []));
      } else {
        const constat = issue.issue === 'suivi-futur' ? suiviFutur() : suppressionRefusee(retrait.nom);
        annonceDuRetrait.replaceChildren(blocDeConstat(constat, issue.issue === 'suivi-futur' ? 'bloquant' : 'notice'));
      }
      annonceDuRetrait.hidden = annonceDuRetrait.childElementCount === 0;
      rendreLesGestes();
    },
  };
}
