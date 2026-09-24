/**
 * L'onglet Palettes (section 13.2) : la barre du haut porte le sélecteur, la
 * création, les gestes de la palette, le verdict et « Dessiner », au rang 1 ;
 * viennent ensuite la référence et le nom, la ligne repliée de la dérive,
 * l'aperçu, et les constats.
 *
 * Une saisie recalcule l'aperçu dans l'interface ([ENT-02]). La recette se
 * range à la fin de chaque geste : valider un champ, créer, dupliquer,
 * réordonner ou supprimer une palette (D-D). Jamais pendant la saisie.
 */
import { estPresqueGrise, type Classement, type Palette, type Recette, type Refus } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { analyserPalette } from '../analyse';
import {
  MOTIF_HEXA,
  ajouter,
  changerReference,
  deplacer,
  dupliquer,
  nouvelIdentifiant,
  nouvellePalette,
  remplacerPalette,
  renommer,
  supprimer,
} from '../edition';
import type { LectureDeSelection, ProfilDuDocument } from '../lecture';
import { createApercu } from './apercu';
import { createAvance } from './avance';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { blocDeConstat, listeDesConstats } from './constats';
import { createCreation } from './creation';
import { blocDuResultat, type EtatDuDessin, type GestesDuResultat } from './dessin';
import { createEditeur } from './derive/editeur';
import type { StatutDuRangement } from './frontiere';
import { createMenuPalette, type GesteDePalette } from './menuPalette';
import { createSelecteur } from './selecteur';
import {
  STATUTS_DU_RANGEMENT,
  TEXTES,
  TEXTES_DE_LA_DERIVE,
  confirmationDeSuppression,
  couleurRamenee,
  hexaInvalide,
  ligneDeLaDerive,
  ligneDeLaReference,
  nomDeLaCopie,
  nomDeLaPalette,
  palettesDuFichier,
  progressionDuDessin,
  rangementInvalide,
  recetteFuture,
  recetteIllisible,
  recetteModifieeAilleurs,
  verdict,
  type Constat,
} from './textes';

/** Ce que l'onglet demande au sandbox, par la frontière. */
export interface DemandesDeLOnglet {
  ranger(recette: Recette): void;
  lireLaSelection(): void;
  recharger(): void;
  /** Un entier de 32 bits tiré au hasard, pour les identifiants de palette (D-K). */
  tirer(): number;
  /** Dessine la palette ouverte ([UI-05]). */
  dessiner(palettes: readonly string[], noms: { readonly [id: string]: string }): void;
  /** Les gestes du résultat d'un dessin. */
  resultat: GestesDuResultat;
  /** Les gestes de la recette en fichier, que le bloquant d'une recette illisible ou future offre ([REC-11]). */
  recetteEnFichier: GestesDeLaRecetteUi;
}

export interface OngletPalettesUi {
  element: HTMLDivElement;
  afficher(classement: Classement, profil: ProfilDuDocument): void;
  recevoirSelection(lecture: LectureDeSelection): void;
  poserStatut(statut: StatutDuRangement, refus: readonly Refus[]): void;
  /** La recette affichée, `null` quand elle ne se lit pas. */
  recette(): Recette | null;
  /** Une recette en cours de saisie ailleurs, dans la configuration : l'aperçu la suit. */
  previsualiser(recette: Recette): void;
  /** Une recette validée ailleurs : elle se range. */
  appliquer(recette: Recette): void;
  /** Une recette importée, ou la recette par défaut : elle remplace celle du fichier, même illisible, et se range. */
  importer(recette: Recette): void;
  /** Le dessin en cours ou fini, que la barre et la zone du résultat montrent. */
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
}

function ligneDEtat(texte: string): HTMLParagraphElement {
  const ligne = document.createElement('p');
  ligne.className = 'etat-lecture';
  ligne.textContent = texte;
  return ligne;
}

function champ(libelle: string, saisie: HTMLInputElement): HTMLLabelElement {
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-ligne';
  const texte = document.createElement('span');
  texte.className = 'field-label';
  texte.textContent = libelle;
  etiquette.append(texte, saisie);
  return etiquette;
}

export function createOngletPalettes(demandes: DemandesDeLOnglet): OngletPalettesUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  let recette: Recette | null = null;
  let classementLu: Classement | null = null;
  let profil: ProfilDuDocument = 'SRGB';
  let idOuvert = '';
  let creationOuverte = false;
  let suppressionDemandee = false;
  let note: Constat | null = null;
  let statut: StatutDuRangement = 'lu';
  let refus: Constat | null = null;

  const selecteur = createSelecteur((id) => {
    idOuvert = id;
    suppressionDemandee = false;
    rendre();
  });
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'icon-button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', TEXTES.nouvellePalette);
  plus.addEventListener('click', () => ouvrirLaCreation());
  const menu = createMenuPalette(agir);
  const verdictDeLaPalette = document.createElement('span');
  verdictDeLaPalette.className = 'verdict';
  verdictDeLaPalette.setAttribute('aria-live', 'polite');
  const dessiner = createButton({
    label: TEXTES.dessiner,
    onClick: () => {
      const courante = ouverte();
      if (courante) demandes.dessiner([courante.id], { [courante.id]: nomDeLaPalette(courante) });
    },
  });
  const gauche = document.createElement('div');
  gauche.className = 'barre-gestes';
  gauche.append(selecteur.element, plus, menu.element);
  const droite = document.createElement('div');
  droite.className = 'barre-verdict';
  droite.append(verdictDeLaPalette, dessiner);
  const barre = document.createElement('div');
  barre.className = 'barre-palette';
  barre.append(gauche, droite);

  const creation = createCreation({
    onCreer: (saisie) => creer(saisie, null),
    onSelection: () => demandes.lireLaSelection(),
    onAnnuler: () => {
      creationOuverte = false;
      rendre();
    },
  });

  const confirmation = document.createElement('div');
  confirmation.className = 'confirmation';
  const texteDeConfirmation = document.createElement('p');
  const gestesDeConfirmation = document.createElement('div');
  gestesDeConfirmation.className = 'confirmation-gestes';
  gestesDeConfirmation.append(
    createButton({ label: TEXTES.supprimer, onClick: () => confirmerLaSuppression() }),
    createButton({ label: TEXTES.annuler, variant: 'secondary', onClick: () => { suppressionDemandee = false; rendre(); } }),
  );
  confirmation.append(texteDeConfirmation, gestesDeConfirmation);

  const pipette = document.createElement('input');
  pipette.type = 'color';
  pipette.className = 'pipette';
  pipette.setAttribute('aria-label', TEXTES.reference);
  const hexa = document.createElement('input');
  hexa.type = 'text';
  hexa.className = 'input champ-hexa';
  hexa.spellcheck = false;
  hexa.maxLength = 7;
  const erreurHexa = document.createElement('p');
  erreurHexa.className = 'field-error';
  erreurHexa.hidden = true;
  const nom = document.createElement('input');
  nom.type = 'text';
  nom.className = 'input';
  const reference = document.createElement('div');
  reference.className = 'ligne-reference';
  const couleur = champ(TEXTES.reference, hexa);
  couleur.insertBefore(pipette, hexa);
  reference.append(couleur, champ(TEXTES.nom, nom));

  const repereDeReference = document.createElement('span');
  const indication = document.createElement('span');
  indication.className = 'etat-rangement';
  indication.setAttribute('aria-live', 'polite');
  const infos = document.createElement('p');
  infos.className = 'ligne-secondaire ligne-infos';
  infos.append(repereDeReference, indication);
  const derive = document.createElement('span');
  const regler = document.createElement('button');
  regler.type = 'button';
  regler.className = 'bouton-discret';
  regler.setAttribute('aria-expanded', 'false');
  regler.addEventListener('click', () => {
    editeurOuvert = !editeurOuvert;
    rendre();
  });
  const ligneDeDerive = document.createElement('div');
  ligneDeDerive.className = 'ligne-secondaire ligne-infos';
  ligneDeDerive.append(derive, regler);
  const editeur = createEditeur({
    previsualiser: (suivante) => modifier(suivante),
    valider: (suivante) => {
      if (recette) valider(remplacerPalette(recette, suivante));
    },
  });
  let editeurOuvert = false;
  const apercu = createApercu(() => rendre());
  const constats = document.createElement('div');
  const avance = createAvance({
    previsualiser: (suivante) => modifier(suivante),
    valider: (suivante) => {
      if (recette) valider(remplacerPalette(recette, suivante));
    },
  });

  function ouverte(): Palette | null {
    if (!recette || recette.palettes.length === 0) return null;
    return recette.palettes.find((candidate) => candidate.id === idOuvert) ?? recette.palettes[0];
  }

  /** Remplace la recette affichée, sans la ranger : une saisie en cours. */
  function modifier(suivante: Palette): void {
    if (!recette) return;
    recette = remplacerPalette(recette, suivante);
    rendre();
  }

  /** La fin d'un geste : la recette se range. */
  function valider(suivante: Recette): void {
    recette = suivante;
    rendre();
    demandes.ranger(suivante);
  }

  function ouvrirLaCreation(): void {
    creationOuverte = true;
    suppressionDemandee = false;
    creation.ouvrir(Boolean(recette && recette.palettes.length > 0));
    rendre();
  }

  function creer(saisie: string, notice: Constat | null): void {
    if (!recette) return;
    const id = nouvelIdentifiant(recette, demandes.tirer);
    const palette = nouvellePalette(recette, id, saisie);
    if (!palette) {
      creation.signaler(hexaInvalide(saisie));
      return;
    }
    idOuvert = id;
    creationOuverte = false;
    note = notice;
    valider(ajouter(recette, palette));
  }

  function agir(geste: GesteDePalette): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    note = null;
    if (geste === 'dupliquer') {
      const id = nouvelIdentifiant(recette, demandes.tirer);
      const suivante = dupliquer(recette, courante.id, id, nomDeLaCopie(nomDeLaPalette(courante)));
      idOuvert = id;
      valider(suivante);
    } else if (geste === 'monter' || geste === 'descendre') {
      valider(deplacer(recette, courante.id, geste === 'monter' ? -1 : 1));
    } else {
      suppressionDemandee = true;
      creationOuverte = false;
      rendre();
    }
  }

  function confirmerLaSuppression(): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    const rang = recette.palettes.indexOf(courante);
    const suivante = supprimer(recette, courante.id);
    idOuvert = suivante.palettes[Math.min(rang, suivante.palettes.length - 1)]?.id ?? '';
    suppressionDemandee = false;
    valider(suivante);
  }

  /** Une saisie d'hexa : l'aperçu suit une valeur complète, une valeur impossible se signale. */
  function saisirReference(saisie: string, fin: boolean): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    const suivante = changerReference(recette, courante, saisie);
    const impossible = !/^#?[0-9a-f]{0,6}$/i.test(saisie.trim()) || (fin && !MOTIF_HEXA.test(saisie.trim()));
    erreurHexa.textContent = impossible ? hexaInvalide(saisie) : '';
    erreurHexa.hidden = !impossible;
    hexa.setAttribute('aria-invalid', String(impossible));
    if (!suivante) return;
    note = null;
    if (fin) valider(remplacerPalette(recette, suivante));
    else modifier(suivante);
  }

  hexa.addEventListener('input', () => saisirReference(hexa.value, false));
  hexa.addEventListener('change', () => saisirReference(hexa.value, true));
  pipette.addEventListener('input', () => saisirReference(pipette.value, false));
  pipette.addEventListener('change', () => saisirReference(pipette.value, true));
  nom.addEventListener('input', () => {
    const courante = ouverte();
    if (courante) modifier(renommer(courante, nom.value));
  });
  nom.addEventListener('change', () => {
    if (recette) valider(recette);
  });

  /** Un champ que le designer est en train de saisir garde sa valeur. */
  function poser(saisie: HTMLInputElement, valeur: string): void {
    if (document.activeElement !== saisie) saisie.value = valeur;
  }

  /*
   * La structure ne se reconstruit jamais : un champ retiré du DOM perd son
   * focus, et `change` le rangerait en pleine saisie. Chaque zone se montre ou
   * se cache ; seuls les blocs de texte se remplacent. Une zone vide se cache :
   * la grille compterait sinon son espacement.
   */
  const zoneDuRefus = document.createElement('div');
  const zoneDuDessin = document.createElement('div');
  zoneDuDessin.hidden = true;
  const zoneDuBloquant = document.createElement('div');
  zoneDuBloquant.className = 'page-stack';
  const zoneDeLaNote = document.createElement('div');
  const ligneVide = ligneDEtat('');
  const vide = document.createElement('div');
  vide.className = 'page-stack colonne';
  vide.append(ligneVide);
  const vue = document.createElement('div');
  vue.className = 'page-stack colonne';
  vue.append(barre, zoneDuDessin, confirmation, zoneDeLaNote, reference, erreurHexa, infos, ligneDeDerive, editeur.element, apercu.element, constats, avance.element);
  element.append(zoneDuRefus, zoneDuBloquant, vide, vue);

  /** Le panneau de création suit la vue montrée : seul, ou sous la barre. */
  function placerLaCreation(parent: HTMLElement, avant: Node | null): void {
    if (creation.element.parentElement !== parent) parent.insertBefore(creation.element, avant);
  }

  function rendreRefus(): void {
    zoneDuRefus.hidden = !refus;
    if (!refus) {
      zoneDuRefus.replaceChildren();
      return;
    }
    const bloc = blocDeConstat(refus, 'bloquant');
    bloc.append(createButton({ label: TEXTES.recharger, onClick: () => demandes.recharger() }));
    zoneDuRefus.replaceChildren(bloc);
  }

  function rendrePalette(courante: Palette, lue: Recette): void {
    idOuvert = courante.id;
    const analyse = analyserPalette(lue, courante);
    selecteur.afficher(lue.palettes, courante.id);
    menu.afficher(lue.palettes.indexOf(courante), lue.palettes.length);
    verdictDeLaPalette.textContent = verdict(analyse.manquees);
    verdictDeLaPalette.dataset.etat = analyse.manquees > 0 ? 'manque' : 'pret';
    poser(hexa, courante.reference);
    poser(pipette, courante.reference.toLowerCase());
    poser(nom, courante.nom ?? '');
    nom.placeholder = courante.reference;
    repereDeReference.textContent = ligneDeLaReference(analyse.ancrage, apercu.mode());
    derive.textContent = ligneDeLaDerive(courante);
    // Une référence presque grise n'a pas de teinte : l'éditeur se désactive ([DER-15]).
    const grise = estPresqueGrise(lue, courante);
    if (grise) editeurOuvert = false;
    regler.disabled = grise;
    regler.title = grise ? TEXTES_DE_LA_DERIVE.grisDesactive : '';
    regler.textContent = editeurOuvert ? TEXTES_DE_LA_DERIVE.replier : TEXTES_DE_LA_DERIVE.regler;
    regler.setAttribute('aria-expanded', String(editeurOuvert));
    editeur.element.hidden = !editeurOuvert;
    if (editeurOuvert) editeur.afficher(lue, courante, analyse.rampes, analyse.ancrage);
    apercu.afficher(lue, analyse.rampes);
    const nomDe = (id: string) => {
      const trouvee = lue.palettes.find((candidate) => candidate.id === id);
      return trouvee ? nomDeLaPalette(trouvee) : id;
    };
    constats.replaceChildren(listeDesConstats(analyse, { recette: lue, nomDe }, nomDeLaPalette(courante)));
    avance.afficher(lue, courante);
    texteDeConfirmation.textContent = confirmationDeSuppression(nomDeLaPalette(courante));
    confirmation.hidden = !suppressionDemandee;
    placerLaCreation(vue, zoneDeLaNote);
    creation.element.hidden = !creationOuverte;
    zoneDeLaNote.replaceChildren(...(note ? [blocDeConstat(note, 'notice')] : []));
    zoneDeLaNote.hidden = !note;
  }

  /**
   * Montre une seule des trois zones. La visibilité se pose avant le
   * remplissage : un élément caché ne reçoit pas le focus, et la poignée
   * redessinée de l'éditeur doit le reprendre.
   */
  function montrer(zone: HTMLElement): void {
    for (const candidate of [zoneDuBloquant, vide, vue]) candidate.hidden = candidate !== zone;
  }

  function rendre(): void {
    indication.textContent = STATUTS_DU_RANGEMENT[statut];
    rendreRefus();
    if (!classementLu) {
      montrer(vide);
      ligneVide.textContent = TEXTES.lectureEnCours;
      return;
    }
    if (classementLu.etat === 'future' || classementLu.etat === 'illisible') {
      montrer(zoneDuBloquant);
      const constat = classementLu.etat === 'future' ? recetteFuture(classementLu.version) : recetteIllisible(classementLu.refus);
      demandes.recetteEnFichier.afficher(classementLu);
      zoneDuBloquant.replaceChildren(blocDeConstat(constat, 'bloquant'), demandes.recetteEnFichier.element);
      return;
    }
    const courante = ouverte();
    if (!recette || !courante) {
      montrer(vide);
      ligneVide.textContent = classementLu.etat === 'absente' ? TEXTES.recetteAbsente : palettesDuFichier(0);
      placerLaCreation(vide, null);
      creation.element.hidden = false;
      return;
    }
    montrer(vue);
    rendrePalette(courante, recette);
  }

  creation.ouvrir(false);
  creation.element.hidden = true;
  vide.append(creation.element);
  rendre();

  return {
    element,
    afficher(classement, profilLu) {
      classementLu = classement;
      profil = profilLu;
      recette = classement.etat === 'future' || classement.etat === 'illisible' ? null : classement.recette;
      refus = null;
      rendre();
    },
    recevoirSelection(lecture) {
      if ('raison' in lecture) {
        creation.signaler(lecture.raison === 'vide' ? TEXTES.selectionVide : TEXTES.selectionSansRemplissage);
        return;
      }
      creer(lecture.hexa, lecture.ramenee ? couleurRamenee(lecture.hexa) : null);
    },
    recette: () => recette,
    previsualiser(suivante) {
      recette = suivante;
      rendre();
    },
    appliquer: (suivante) => valider(suivante),
    importer(suivante) {
      classementLu = { etat: 'courante', recette: suivante };
      valider(suivante);
    },
    afficherDessin(etat, noms) {
      dessiner.disabled = etat.phase === 'en-cours';
      dessiner.setLabel(etat.phase === 'en-cours' ? progressionDuDessin(etat.fait, etat.total, etat.nom) : TEXTES.dessiner);
      const resultat = blocDuResultat(etat, noms, demandes.resultat);
      zoneDuDessin.replaceChildren(...(resultat ? [resultat] : []));
      zoneDuDessin.hidden = !resultat;
    },
    poserStatut(suivant, refusDuSandbox) {
      statut = suivant;
      if (suivant === 'refuse') refus = recetteModifieeAilleurs();
      else if (suivant === 'invalide') refus = rangementInvalide(refusDuSandbox);
      rendre();
    },
  };
}
