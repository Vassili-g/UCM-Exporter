/**
 * L'onglet Palettes (section 13.2), en deux sections à filet : le choix ou la
 * création d'une palette, puis la configuration de la palette ouverte. La
 * configuration porte la référence et le nom, le nuancier, les intensités, la
 * dérive, les messages, et se ferme sur « Générer sur Figma ».
 *
 * Une saisie recalcule l'aperçu dans l'interface ([ENT-02]). La recette
 * s'enregistre à la fin de chaque geste : valider un champ, relâcher un
 * curseur, créer, dupliquer, réordonner ou supprimer une palette (D-D). Jamais
 * pendant la saisie.
 */
import {
  alertesDePalette,
  estPresqueGrise,
  type Classement,
  type Palette,
  type Recette,
  type Refus,
} from 'ucm-couleur';
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
import type { EtatDeLaPlanche, LectureDeSelection, ProfilDuDocument } from '../lecture';
import { fraicheurDUnePalette } from '../planche/fraicheur';
import { CIBLES_COMMUNES, type CibleDAction, type GroupeDePromesses } from '../presentation';
import { blocDeConstat, listeDesMessages } from './constats';
import { createCreation } from './creation';
import { createEditeur } from './derive/editeur';
import type { EtatDuDessin, GestesDuResultat } from './dessin';
import type { StatutDuRangement } from './frontiere';
import { createGeneration, type CadreDeLaPalette } from './generation';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { createIntensites } from './intensites';
import { createMenuPalette, type GesteDePalette } from './menuPalette';
import { messagesDeLaPalette } from './messagesDePalette';
import { createNuancier } from './nuancier';
import type { OptionsDeGeneration } from './optionsDeGeneration';
import { createSelecteur } from './selecteur';
import {
  STATUTS_DU_RANGEMENT,
  TEXTES,
  TEXTES_AVANCES,
  TEXTES_DE_LA_DERIVE,
  TEXTES_DE_L_ONGLET,
  bilanDesPromesses,
  confirmationDeSuppression,
  couleurRamenee,
  hexaInvalide,
  ligneDeLaDerive,
  ligneDeLaReference,
  nomDeLaCopie,
  nomDeLaPalette,
  palettesDuFichier,
  rangementInvalide,
  recetteFuture,
  recetteIllisible,
  recetteModifieeAilleurs,
  verdict,
  type Constat,
} from './textes';

/** Ce que l'onglet demande au sandbox, par la frontière, et au reste de l'interface. */
export interface DemandesDeLOnglet {
  ranger(recette: Recette): void;
  lireLaSelection(): void;
  recharger(): void;
  /** Un entier de 32 bits tiré au hasard, pour les identifiants de palette (D-K). */
  tirer(): number;
  /** Génère la palette ouverte ([UI-05]). */
  dessiner(palettes: readonly string[], noms: { readonly [id: string]: string }): void;
  /** Les gestes du résultat d'une génération. */
  resultat: GestesDuResultat;
  /** Les gestes de la recette en fichier, que le blocage d'une recette illisible ou future offre ([REC-11]). */
  recetteEnFichier: GestesDeLaRecetteUi;
  /** Ouvre les Réglages communs sur le groupe qu'un message nomme ([VER-15]). */
  ouvrirReglages(cible: CibleDAction): void;
  /** Les options de génération, partagées avec l'onglet Planche. */
  options: OptionsDeGeneration;
}

export interface OngletPalettesUi {
  element: HTMLDivElement;
  afficher(classement: Classement, profil: ProfilDuDocument, planche: EtatDeLaPlanche): void;
  recevoirSelection(lecture: LectureDeSelection): void;
  poserStatut(statut: StatutDuRangement, refus: readonly Refus[]): void;
  /** La recette affichée, `null` quand elle ne se lit pas. */
  recette(): Recette | null;
  /** Une recette en cours de saisie ailleurs, dans les Réglages communs : l'aperçu la suit. */
  previsualiser(recette: Recette): void;
  /** Une recette validée ailleurs : elle s'enregistre. */
  appliquer(recette: Recette): void;
  /** Une recette importée, ou la recette par défaut : elle remplace celle du fichier, même illisible, et s'enregistre. */
  importer(recette: Recette): void;
  /** La génération en cours ou finie, que la ligne de l'action montre. */
  afficherDessin(etat: EtatDuDessin, noms: { readonly [id: string]: string }): void;
  /** Ouvre une palette, depuis la fiche de l'onglet Planche. */
  ouvrirLaPalette(id: string): void;
}

function ligneDEtat(texte: string): HTMLParagraphElement {
  const ligne = document.createElement('p');
  ligne.className = 'etat-lecture';
  ligne.textContent = texte;
  return ligne;
}

function champ(libelle: string, ...saisies: HTMLElement[]): HTMLLabelElement {
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-ligne';
  const texte = document.createElement('span');
  texte.className = 'field-label';
  texte.textContent = libelle;
  etiquette.append(texte, ...saisies);
  return etiquette;
}

function titreDeSection(texte = ''): HTMLHeadingElement {
  const titre = document.createElement('h2');
  titre.className = 'titre-de-section';
  titre.textContent = texte;
  return titre;
}

export function createOngletPalettes(demandes: DemandesDeLOnglet): OngletPalettesUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  let recette: Recette | null = null;
  let classementLu: Classement | null = null;
  let profil: ProfilDuDocument = 'SRGB';
  let planche: EtatDeLaPlanche = { page: null, cadres: [] };
  let idOuvert = '';
  let creationOuverte = false;
  let suppressionDemandee = false;
  let note: Constat | null = null;
  let statut: StatutDuRangement = 'lu';
  let refus: Constat | null = null;
  let editeurOuvert = false;
  let dernierDessin: { etat: EtatDuDessin; noms: { readonly [id: string]: string } } = { etat: { phase: 'repos' }, noms: {} };

  // Section 1 : choisir ou créer une palette.
  const selecteur = createSelecteur((id) => {
    idOuvert = id;
    suppressionDemandee = false;
    recalculerLeCadre();
    rendre();
  });
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'icon-button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', TEXTES.nouvellePalette);
  plus.setAttribute('aria-expanded', 'false');
  plus.addEventListener('click', () => ouvrirLaCreation());
  const menu = createMenuPalette(agir);
  const barre = document.createElement('div');
  barre.className = 'barre-gestes';
  barre.append(selecteur.element, plus, menu.element);

  const creation = createCreation({
    onCreer: (saisie, nom) => creer(saisie, nom, null),
    onSelection: () => demandes.lireLaSelection(),
    onAnnuler: () => {
      creationOuverte = false;
      rendre();
      plus.focus();
    },
  });

  const confirmation = document.createElement('div');
  confirmation.className = 'confirmation';
  const texteDeConfirmation = document.createElement('p');
  const gestesDeConfirmation = document.createElement('div');
  gestesDeConfirmation.className = 'confirmation-gestes';
  const supprimerVraiment = createButton({ label: TEXTES.supprimer, onClick: () => confirmerLaSuppression() });
  supprimerVraiment.classList.add('bouton-destructif');
  gestesDeConfirmation.append(
    supprimerVraiment,
    createButton({
      label: TEXTES.annuler,
      variant: 'secondary',
      onClick: () => {
        suppressionDemandee = false;
        rendre();
        menu.focaliser();
      },
    }),
  );
  confirmation.append(texteDeConfirmation, gestesDeConfirmation);
  const zoneDeLaNote = document.createElement('div');

  const sectionPalette = document.createElement('section');
  sectionPalette.className = 'section-onglet';
  sectionPalette.setAttribute('aria-label', TEXTES_DE_L_ONGLET.palette);
  sectionPalette.append(titreDeSection(TEXTES_DE_L_ONGLET.palette), barre, confirmation, zoneDeLaNote);

  // Section 2 : configurer la palette ouverte.
  const titreDeConfiguration = titreDeSection();
  const verdictDeLaPalette = document.createElement('span');
  verdictDeLaPalette.className = 'verdict';
  verdictDeLaPalette.setAttribute('aria-live', 'polite');
  const teteDeConfiguration = document.createElement('div');
  teteDeConfiguration.className = 'tete-de-section';
  teteDeConfiguration.append(titreDeConfiguration, verdictDeLaPalette);

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
  reference.append(champ(TEXTES.reference, pipette, hexa), champ(TEXTES.nom, nom));

  const repereDeReference = document.createElement('span');
  repereDeReference.className = 'repere-de-la-reference';
  const indication = document.createElement('span');
  indication.className = 'etat-rangement';
  indication.setAttribute('aria-live', 'polite');
  const infos = document.createElement('p');
  infos.className = 'ligne-infos';
  infos.append(repereDeReference, indication);

  const nuancier = createNuancier({
    surMode: () => rendre(),
    modifierLeFond: () => demandes.ouvrirReglages('fonds'),
  });

  const titreDesIntensites = document.createElement('p');
  titreDesIntensites.className = 'field-label';
  titreDesIntensites.textContent = TEXTES_AVANCES.avance;
  const intensites = createIntensites({
    previsualiser: (suivante) => modifier(suivante),
    valider: (suivante) => {
      if (recette) valider(remplacerPalette(recette, suivante));
    },
    ouvrir: (cible) => ouvrir(cible),
  });

  const regler = document.createElement('button');
  regler.type = 'button';
  regler.className = 'bouton-deplier';
  regler.setAttribute('aria-expanded', 'false');
  regler.addEventListener('click', () => {
    editeurOuvert = !editeurOuvert;
    rendre();
  });
  const resumeDeLaDerive = document.createElement('span');
  resumeDeLaDerive.className = 'ligne-secondaire resume-de-la-derive';
  const ligneDeDerive = document.createElement('div');
  ligneDeDerive.className = 'ligne-de-derive';
  ligneDeDerive.append(regler, resumeDeLaDerive);
  const editeur = createEditeur({
    previsualiser: (suivante) => modifier(suivante),
    valider: (suivante) => {
      if (recette) valider(remplacerPalette(recette, suivante));
    },
  });

  const constats = document.createElement('div');
  const generation = createGeneration({
    ...demandes.resultat,
    generer: () => {
      const courante = ouverte();
      if (courante) demandes.dessiner([courante.id], { [courante.id]: nomDeLaPalette(courante) });
    },
  }, demandes.options);

  const sectionConfiguration = document.createElement('section');
  sectionConfiguration.className = 'section-onglet';
  sectionConfiguration.append(
    teteDeConfiguration,
    reference,
    erreurHexa,
    infos,
    nuancier.element,
    titreDesIntensites,
    intensites.element,
    ligneDeDerive,
    editeur.element,
    constats,
    generation.element,
  );

  /** Ouvre et focalise le réglage qu'un message nomme ([VER-15]) : dans l'onglet, ou dans les Réglages communs. */
  function ouvrir(cible: CibleDAction): void {
    if (CIBLES_COMMUNES.includes(cible)) {
      demandes.ouvrirReglages(cible);
      return;
    }
    if (cible === 'reference') {
      hexa.focus();
      hexa.select();
    } else if (cible === 'intensites-palette') {
      intensites.ouvrir();
    } else if (!regler.disabled) {
      editeurOuvert = true;
      rendre();
      editeur.focaliser();
    }
  }

  function inspecter(groupe: GroupeDePromesses): void {
    nuancier.inspecter(groupe);
    rendre();
  }

  function ouverte(): Palette | null {
    if (!recette || recette.palettes.length === 0) return null;
    return recette.palettes.find((candidate) => candidate.id === idOuvert) ?? recette.palettes[0];
  }

  /**
   * L'état du cadre de la palette ouverte. Le calcul reconstruit le modèle du
   * cadre : il suit la fin d'un geste et chaque lecture, jamais un glisser.
   */
  let cadreOuvert: CadreDeLaPalette = { etat: 'jamais-dessinee', page: null, cadre: null };
  function recalculerLeCadre(): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    const fraicheur = fraicheurDUnePalette(recette, profil, planche, courante.id);
    cadreOuvert = { etat: fraicheur.etat, page: fraicheur.cadre ? planche.page : null, cadre: fraicheur.cadre };
  }

  /** Remplace la recette affichée, sans l'enregistrer : une saisie en cours. */
  function modifier(suivante: Palette): void {
    if (!recette) return;
    recette = remplacerPalette(recette, suivante);
    rendre();
  }

  /** La fin d'un geste : la recette s'enregistre. */
  function valider(suivante: Recette): void {
    recette = suivante;
    recalculerLeCadre();
    rendre();
    demandes.ranger(suivante);
  }

  function ouvrirLaCreation(): void {
    creationOuverte = true;
    suppressionDemandee = false;
    creation.ouvrir(Boolean(recette && recette.palettes.length > 0));
    rendre();
    creation.element.querySelector<HTMLInputElement>('.champ-creation')?.focus();
  }

  function creer(saisie: string, nomSaisi: string, notice: Constat | null): void {
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
    valider(ajouter(recette, renommer(palette, nomSaisi)));
    nom.focus();
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
      supprimerVraiment.focus();
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
    selecteur.focaliser();
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
   * focus, et `change` l'enregistrerait en pleine saisie. Chaque zone se montre
   * ou se cache ; seuls les blocs de texte se remplacent. Une zone vide se
   * cache : la grille compterait sinon son espacement.
   */
  const zoneDuRefus = document.createElement('div');
  const zoneDuBloquant = document.createElement('div');
  zoneDuBloquant.className = 'page-stack';
  const ligneVide = ligneDEtat('');
  const vide = document.createElement('div');
  vide.className = 'page-stack colonne';
  vide.append(ligneVide);
  const vue = document.createElement('div');
  vue.className = 'page-stack colonne';
  vue.append(sectionPalette, sectionConfiguration);
  element.append(zoneDuRefus, zoneDuBloquant, vide, vue);

  /** Le panneau de création suit la vue montrée : seul, ou sous le sélecteur. */
  function placerLaCreation(parent: HTMLElement, avant: Node | null): void {
    if (creation.element.parentElement !== parent || creation.element.nextSibling !== avant) parent.insertBefore(creation.element, avant);
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
    placerLaCreation(sectionPalette, confirmation);
    creation.element.hidden = !creationOuverte;
    plus.setAttribute('aria-expanded', String(creationOuverte));
    texteDeConfirmation.textContent = confirmationDeSuppression(nomDeLaPalette(courante));
    confirmation.hidden = !suppressionDemandee;
    zoneDeLaNote.replaceChildren(...(note ? [blocDeConstat(note, 'notice')] : []));
    zoneDeLaNote.hidden = !note;

    titreDeConfiguration.textContent = TEXTES_DE_L_ONGLET.configuration(nomDeLaPalette(courante));
    verdictDeLaPalette.textContent = analyse.manquees === 0
      ? `${verdict(0)} · ${bilanDesPromesses(analyse.promesses.length, analyse.promesses.length)}`
      : verdict(analyse.manquees);
    verdictDeLaPalette.dataset.etat = analyse.manquees > 0 ? 'manque' : 'pret';
    poser(hexa, courante.reference);
    poser(pipette, courante.reference.toLowerCase());
    poser(nom, courante.nom ?? '');
    nom.placeholder = courante.reference;
    repereDeReference.textContent = `◆ ${ligneDeLaReference(analyse.ancrage, nuancier.mode())}`;

    const confusions = alertesDePalette(lue, courante).flatMap((alerte) => (alerte.code === 'profils-confondus' ? alerte.crans : []));
    nuancier.afficher({ recette: lue, analyse, confondues: confusions });

    const nomDe = (id: string) => {
      const trouvee = lue.palettes.find((candidate) => candidate.id === id);
      return trouvee ? nomDeLaPalette(trouvee) : id;
    };
    const messages = messagesDeLaPalette(analyse, courante, { recette: lue, nomDe }, nomDeLaPalette(courante), inspecter);
    intensites.afficher(lue, courante, analyse.part, messages.intensite);
    constats.replaceChildren(...(messages.liste.length > 0 ? [listeDesMessages(messages.liste, ouvrir)] : []));
    constats.hidden = messages.liste.length === 0;

    resumeDeLaDerive.textContent = ligneDeLaDerive(courante);
    // Une référence presque grise n'a pas de teinte : l'éditeur se désactive ([DER-15]).
    const grise = estPresqueGrise(lue, courante);
    if (grise) editeurOuvert = false;
    regler.disabled = grise;
    regler.title = grise ? TEXTES_DE_LA_DERIVE.grisDesactive : '';
    regler.textContent = `${editeurOuvert ? '▾' : '▸'} ${TEXTES_DE_LA_DERIVE.regler}`;
    regler.setAttribute('aria-expanded', String(editeurOuvert));
    editeur.element.hidden = !editeurOuvert;
    if (editeurOuvert) editeur.afficher(lue, courante, analyse.rampes, analyse.ancrage, analyse);

    generation.afficherLeCadre(cadreOuvert);
    generation.afficherDessin(dernierDessin.etat, dernierDessin.noms, courante.id);
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
    afficher(classement, profilLu, plancheLue) {
      classementLu = classement;
      profil = profilLu;
      planche = plancheLue;
      recette = classement.etat === 'future' || classement.etat === 'illisible' ? null : classement.recette;
      refus = null;
      recalculerLeCadre();
      rendre();
    },
    recevoirSelection(lecture) {
      if ('raison' in lecture) {
        creation.signaler(lecture.raison === 'vide' ? TEXTES.selectionVide : TEXTES.selectionSansRemplissage);
        return;
      }
      creer(lecture.hexa, creation.nom(), lecture.ramenee ? couleurRamenee(lecture.hexa) : null);
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
      dernierDessin = { etat, noms };
      const courante = ouverte();
      if (courante) generation.afficherDessin(etat, noms, courante.id);
    },
    poserStatut(suivant, refusDuSandbox) {
      statut = suivant;
      if (suivant === 'refuse') refus = recetteModifieeAilleurs();
      else if (suivant === 'invalide') refus = rangementInvalide(refusDuSandbox);
      rendre();
    },
    ouvrirLaPalette(id) {
      idOuvert = id;
      suppressionDemandee = false;
      creationOuverte = false;
      recalculerLeCadre();
      rendre();
    },
  };
}
