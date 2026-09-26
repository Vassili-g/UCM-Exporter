/**
 * L'onglet Palettes (section 13.2) : le choix ou la création d'une palette,
 * le titre « Palette [nom] » seul sur sa ligne, puis les cartes :
 * Configuration de la palette, aperçu, Intensités et Dérive de teinte
 * repliables, Garanties de contraste, et l'Interface de test en dernier
 * ([UI-12]). Un message se lit sous la carte qu'il concerne. La génération
 * appartient à l'onglet Planches ([UI-05]).
 *
 * Une saisie recalcule l'aperçu dans l'interface ([ENT-02]). La recette
 * s'enregistre à la fin de chaque geste : valider un champ, relâcher un
 * curseur, créer, dupliquer, réordonner ou supprimer une palette (D-D). Jamais
 * pendant la saisie.
 */
import {
  estPresqueGrise,
  profilAutomatique,
  type Classement,
  type Mode,
  type Palette,
  type Recette,
  type Refus,
} from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { analyserPalette } from '../analyse';
import { poserFond } from '../configuration';
import {
  MOTIF_HEXA,
  ajouter,
  appliquerLAjustement,
  basculerNuance,
  changerReference,
  choisirLaBase,
  cransLibresParDefaut,
  deplacer,
  dupliquer,
  nouvelIdentifiant,
  nouvellePalette,
  passerEnLibre,
  remplacerPalette,
  renommer,
  revenirALOriginale,
  revenirAuModele,
  supprimer,
} from '../edition';
import { CIBLES_COMMUNES, carteDuMessage, type CarteDuMessage, type CibleDAction } from '../presentation';
import { blocDeConstat, listeDesMessages, type Message } from './constats';
import { createAjustement } from './ajustement';
import { createCarte } from './carte';
import { champEnColonne, createChoixDeBase, createChoixDuModele, createPuces, type ChoixDeBase } from './champs';
import { nuancesProposees } from './couleur/propositions';
import { createPipette, fermerLeSelecteur } from './couleur/selecteur';
import { createCreation } from './creation';
import { createEditeur } from './derive/editeur';
import type { StatutDuRangement } from './frontiere';
import { createGaranties } from './garanties';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { createIntensites } from './intensites';
import { createInterfaceDeTest } from './interfaceDeTest';
import { createMenuPalette, type GesteDePalette } from './menuPalette';
import { messagesDeLaPalette } from './messagesDePalette';
import { createNuancier } from './nuancier';
import { createSelecteur } from './selecteur';
import {
  TEXTES,
  TEXTES_DE_L_AJUSTEMENT,
  TEXTES_DE_LA_BASE,
  TEXTES_DE_LA_DERIVE,
  TEXTES_DE_L_ONGLET,
  TEXTES_DU_SELECTEUR,
  confirmationDeSuppression,
  hexaInvalide,
  ligneDeLaReference,
  nomDeLaCopie,
  nomDeLaPalette,
  originaleRetiree,
  palettesDuFichier,
  rangementInvalide,
  recetteFuture,
  recetteIllisible,
  recetteModifieeAilleurs,
  resumeDeLaDerive,
  resumeDesIntensites,
  type Constat,
} from './textes';

/** Ce que l'onglet demande au sandbox, par la frontière, et au reste de l'interface. */
export interface DemandesDeLOnglet {
  ranger(recette: Recette): void;
  recharger(): void;
  /** Exporte la recette que l'onglet montre, brouillon compris : le geste de sortie d'un conflit (V12.1). */
  exporterLeBrouillon(): void;
  /** Un entier de 32 bits tiré au hasard, pour les identifiants de palette (D-K). */
  tirer(): number;
  /** Les gestes de la recette en fichier, que le blocage d'une recette illisible ou future offre ([REC-11]). */
  recetteEnFichier: GestesDeLaRecetteUi;
  /** Ouvre les Réglages communs sur le groupe qu'un message nomme ([VER-15]). */
  ouvrirReglages(cible: CibleDAction): void;
}

export interface OngletPalettesUi {
  element: HTMLDivElement;
  afficher(classement: Classement): void;
  poserStatut(statut: StatutDuRangement, refus: readonly Refus[]): void;
  /** La recette affichée, `null` quand elle ne se lit pas. */
  recette(): Recette | null;
  /** La palette ouverte et le thème de son aperçu, que les Réglages communs montrent (V9.3) ; `null` sans palette. */
  ouverte(): { readonly id: string; readonly mode: Mode } | null;
  /** Une recette en cours de saisie ailleurs, dans les Réglages communs : l'aperçu la suit. */
  previsualiser(recette: Recette): void;
  /** Une recette validée ailleurs : elle s'enregistre. */
  appliquer(recette: Recette): void;
  /** Une recette importée, ou la recette par défaut : elle remplace celle du fichier, même illisible, et s'enregistre. */
  importer(recette: Recette): void;
  /** Ouvre une palette dans le thème que sa fiche de l'onglet Planche montrait (V8.3). */
  ouvrirLaPalette(id: string, mode: Mode): void;
}

function ligneDEtat(texte: string): HTMLParagraphElement {
  const ligne = document.createElement('p');
  ligne.className = 'etat-lecture';
  ligne.textContent = texte;
  return ligne;
}

export function createOngletPalettes(demandes: DemandesDeLOnglet): OngletPalettesUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  let recette: Recette | null = null;
  let classementLu: Classement | null = null;
  let idOuvert = '';
  let creationOuverte = false;
  let suppressionDemandee = false;
  let note: Constat | null = null;
  let statut: StatutDuRangement = 'lu';
  let refus: Constat | null = null;

  // Le choix ou la création d'une palette, en tête de l'onglet : la liste prend la largeur libre ([UI-06]).
  const selecteur = createSelecteur((id) => {
    idOuvert = id;
    suppressionDemandee = false;
    rendre();
  });
  // L'action principale de l'onglet : créer une palette.
  const plus = createButton({ label: TEXTES.nouvellePalette, onClick: () => ouvrirLaCreation() });
  plus.classList.add('bouton-de-barre');
  plus.setAttribute('aria-expanded', 'false');
  const menu = createMenuPalette(agir);
  const barre = document.createElement('div');
  barre.className = 'barre-gestes';
  barre.append(selecteur.element, plus, menu.element);

  const creation = createCreation({
    onCreer: (saisie, nom, base, crans) => creer(saisie, nom, base, crans),
    cransLibres: () => (recette ? cransLibresParDefaut(recette) : []),
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
  const supprimerVraiment = createButton({ label: TEXTES.supprimer, variant: 'danger', onClick: () => confirmerLaSuppression() });
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

  const choix = document.createElement('div');
  choix.className = 'choix-de-palette';
  choix.append(barre, confirmation, zoneDeLaNote);

  // Le titre de premier rang, « Palette [nom] », seul sur sa ligne ([UI-11]) : un nom long se coupe.
  const titreDeConfiguration = document.createElement('h2');
  titreDeConfiguration.className = 'titre-de-premier-rang';
  const teteDeLaPalette = document.createElement('div');
  teteDeLaPalette.className = 'tete-de-la-palette';
  teteDeLaPalette.append(titreDeConfiguration);

  // Carte Configuration de la palette ([UI-11]).
  // La pastille ouvre le sélecteur de couleur, qui propose les nuances Vivid du thème montré (W4.1).
  const pipette = createPipette(TEXTES.reference, () => {
    const courante = ouverte();
    if (!recette || !courante) return null;
    originaleAvantSaisie = courante.originale ?? null;
    return {
      hexa: courante.reference,
      titreDesPastilles: TEXTES_DU_SELECTEUR.nuancesDeLaPalette,
      pastilles: nuancesProposees(analyserPalette(recette, courante), nuancier.mode()),
      saisir: (saisie, fin) => saisirReference(saisie, fin),
      // L'onglet « Ajuster » part de la palette telle qu'elle est à son ouverture (X2.7, R3).
      ajustement: {
        element: ajustement.element,
        preparer: () => {
          const actuelle = ouverte();
          if (recette && actuelle) ajustement.preparer(recette, actuelle);
        },
        focaliser: () => ajustement.focaliser(),
      },
    };
  });
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
  const colonneDeLaReference = champEnColonne(TEXTES.reference, pipette.bouton, hexa);
  /*
   * Sous le code : « Ajuster la référence » ouvre le panneau (W7.1) ; une
   * référence ajustée dit son originale, que « Revenir à l'originale » rend.
   */
  const lienDAjustement = document.createElement('button');
  lienDAjustement.type = 'button';
  lienDAjustement.className = 'lien-de-constat';
  lienDAjustement.textContent = TEXTES_DE_L_AJUSTEMENT.lien;
  lienDAjustement.addEventListener('click', () => pipette.ouvrir('ajuster'));
  const traceDeLAjustement = document.createElement('p');
  traceDeLAjustement.className = 'ligne-secondaire trace-de-l-ajustement';
  const ajusteeDepuis = document.createElement('span');
  const revenir = document.createElement('button');
  revenir.type = 'button';
  revenir.className = 'lien-de-constat';
  revenir.textContent = TEXTES_DE_L_AJUSTEMENT.revenir;
  revenir.addEventListener('click', () => {
    const courante = ouverte();
    if (!recette || !courante) return;
    note = null;
    valider(remplacerPalette(recette, revenirALOriginale(recette, courante)));
    lienDAjustement.focus();
  });
  traceDeLAjustement.append(ajusteeDepuis, ' · ', revenir);
  colonneDeLaReference.append(erreurHexa, lienDAjustement, traceDeLAjustement);
  /** L'originale de la palette au début d'une saisie du code : la retirer se signale (section 3 de la conception). */
  let originaleAvantSaisie: string | null = null;
  hexa.addEventListener('focus', () => {
    originaleAvantSaisie = ouverte()?.originale ?? null;
  });
  // Appliquer porte sur la palette courante : un nom ou une intensité changés pendant l'ajustement se gardent.
  const ajustement = createAjustement((proposition) => {
    const courante = ouverte();
    const ajustee = recette && courante ? appliquerLAjustement(recette, courante, proposition) : null;
    if (!recette || !ajustee) return;
    note = null;
    valider(remplacerPalette(recette, ajustee));
  }, () => fermerLeSelecteur(true));
  // La palette de base : Auto, Soft ou Vivid ([UI-11], [ENT-11]).
  const choixDeBase = createChoixDeBase((valeur) => {
    const courante = ouverte();
    if (recette && courante) valider(remplacerPalette(recette, choisirLaBase(courante, valeur)));
  });
  const choixAutomatique = choixDeBase.aide;
  /*
   * Le modèle prend la troisième colonne (W6.5, maquette W3.5) : dans le
   * modèle, la palette de base se règle dessous ; une palette libre n'en a
   * pas, et ses numéros se choisissent sous les trois colonnes.
   */
  const choixDuModele = createChoixDuModele((valeur) => {
    const courante = ouverte();
    if (!recette || !courante) return;
    valider(remplacerPalette(recette, valeur === 'libre' ? passerEnLibre(recette, courante) : revenirAuModele(courante)));
  });
  const puces = createPuces((numero) => {
    const courante = ouverte();
    if (recette && courante) valider(remplacerPalette(recette, basculerNuance(courante, numero)));
  });
  const colonneDuModele = document.createElement('div');
  colonneDuModele.className = 'colonne-du-modele';
  colonneDuModele.append(choixDuModele.element, choixDeBase.element);

  const colonnes = document.createElement('div');
  colonnes.className = 'colonnes-de-base';
  colonnes.append(champEnColonne(TEXTES.nom, nom), colonneDeLaReference, colonneDuModele);
  const carteDeBase = createCarte({ titre: TEXTES_DE_L_ONGLET.configuration });
  const messagesDeBase = document.createElement('div');
  carteDeBase.corps.append(colonnes, puces.element, messagesDeBase);

  // Carte d'aperçu sans titre ([UI-04]) : thèmes et fond dans l'en-tête, la référence sous la surface.
  const nuancier = createNuancier({
    surMode: () => rendre(),
    saisirFond: (mode, hexa, fin) => saisirFond(mode, hexa, fin),
    choisirGarantie: (association) => garanties.choisir(association),
  });
  const carteDApercu = createCarte({ titre: TEXTES_DE_L_ONGLET.apercu, sansTitre: true });
  carteDApercu.tete.append(nuancier.tete);
  const repereDeReference = document.createElement('p');
  repereDeReference.className = 'repere-de-la-reference';
  carteDApercu.corps.append(nuancier.element, repereDeReference);
  const messagesDApercu = document.createElement('div');

  // Carte Garanties de contraste ([UI-09]) : elle suit le thème de l'aperçu.
  const garanties = createGaranties({
    ouvrir: (cible) => ouvrir(cible),
    montrerLeTheme: (mode) => nuancier.montrerLeTheme(mode),
  });

  // Cartes repliables Intensités et Dérive de teinte ([UI-12]).
  const carteDesIntensites = createCarte({ titre: TEXTES_DE_L_ONGLET.intensites, repliable: { ouverte: false } });
  const intensites = createIntensites({
    previsualiser: (suivante) => modifier(suivante),
    valider: (suivante) => {
      if (recette) valider(remplacerPalette(recette, suivante));
    },
    ouvrir: (cible) => ouvrir(cible),
  });
  carteDesIntensites.corps.append(intensites.element);

  const carteDeLaDerive = createCarte({ titre: TEXTES_DE_L_ONGLET.derive, repliable: { ouverte: false } });
  const editeur = createEditeur({
    previsualiser: (suivante) => modifier(suivante),
    valider: (suivante) => {
      if (recette) valider(remplacerPalette(recette, suivante));
    },
  });
  carteDeLaDerive.corps.append(editeur.element);
  // L'éditeur ne se dessine que déplié : l'ouvrir le dessine.
  carteDeLaDerive.surBascule(() => rendre());
  const messagesDeLaDerive = document.createElement('div');

  // L'interface de test ferme l'onglet ([UI-14]) : repliée, elle ne se dessine qu'ouverte.
  const interfaceDeTest = createInterfaceDeTest();
  interfaceDeTest.surBascule(() => rendre());

  // La palette se règle, puis se juge : Intensités et Dérive sous l'aperçu, les Garanties ensuite ([UI-12]).
  const configuration = document.createElement('div');
  configuration.className = 'configuration-de-la-palette';
  configuration.append(
    teteDeLaPalette,
    carteDeBase.element,
    carteDApercu.element,
    messagesDApercu,
    carteDesIntensites.element,
    carteDeLaDerive.element,
    messagesDeLaDerive,
    garanties.element,
    interfaceDeTest.element,
  );

  /** Les messages de la palette, chacun sous la carte qu'il concerne. */
  const ZONES_DES_MESSAGES: Record<CarteDuMessage, HTMLDivElement> = {
    'couleur-de-base': messagesDeBase,
    apercu: messagesDApercu,
    derive: messagesDeLaDerive,
  };

  function poserLesMessages(liste: readonly Message[]): void {
    for (const [carte, zone] of Object.entries(ZONES_DES_MESSAGES) as [CarteDuMessage, HTMLDivElement][]) {
      const ici = liste.filter((message) => carteDuMessage(message.cibles) === carte);
      zone.replaceChildren(...(ici.length > 0 ? [listeDesMessages(ici, ouvrir)] : []));
      zone.hidden = ici.length === 0;
    }
  }

  /** Ouvre et focalise le réglage qu'un message nomme ([VER-15]) : dans l'onglet, ou dans les Réglages communs. */
  function ouvrir(cible: CibleDAction): void {
    if (CIBLES_COMMUNES.includes(cible)) {
      demandes.ouvrirReglages(cible);
      return;
    }
    if (cible === 'reference') {
      hexa.focus();
      hexa.select();
    } else if (cible === 'ajuster-reference') {
      pipette.ouvrir('ajuster');
    } else if (cible === 'intensites-palette') {
      carteDesIntensites.ouvrir();
      intensites.ouvrir();
    } else {
      carteDeLaDerive.ouvrir();
      if (carteDeLaDerive.estOuverte()) editeur.focaliser();
    }
  }

  function ouverte(): Palette | null {
    if (!recette || recette.palettes.length === 0) return null;
    return recette.palettes.find((candidate) => candidate.id === idOuvert) ?? recette.palettes[0];
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
    rendre();
    demandes.ranger(suivante);
  }

  function ouvrirLaCreation(): void {
    creationOuverte = true;
    suppressionDemandee = false;
    creation.ouvrir(Boolean(recette && recette.palettes.length > 0));
    rendre();
    creation.focaliser();
  }

  function creer(saisie: string, nomSaisi: string, base: ChoixDeBase, crans: readonly number[] | null): void {
    if (!recette) return;
    const id = nouvelIdentifiant(recette, demandes.tirer);
    const palette = nouvellePalette(recette, id, saisie);
    if (!palette) {
      creation.signaler(hexaInvalide(saisie));
      return;
    }
    idOuvert = id;
    creationOuverte = false;
    note = null;
    const dansLeModele = choisirLaBase(renommer(palette, nomSaisi), base);
    valider(ajouter(recette, crans ? { ...passerEnLibre(recette, dansLeModele), crans: [...crans] } : dansLeModele));
    nom.focus();
  }

  /**
   * Un fond saisi depuis la pastille de l'aperçu : il change le réglage commun
   * `fonds` par `poserFond`, comme les Réglages communs, qui le relisent.
   */
  function saisirFond(mode: Mode, hexa: string, fin: boolean): void {
    const suivante = recette ? poserFond(recette, mode, hexa) : null;
    if (!suivante) return;
    if (fin) valider(suivante);
    else {
      recette = suivante;
      rendre();
    }
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
    if (fin) {
      // Un code saisi est une nouvelle référence : il retire l'originale, sauf s'il la rend.
      if (originaleAvantSaisie && suivante.reference !== originaleAvantSaisie.toUpperCase()) note = originaleRetiree(originaleAvantSaisie);
      originaleAvantSaisie = null;
      valider(remplacerPalette(recette, suivante));
    } else modifier(suivante);
  }

  hexa.addEventListener('input', () => saisirReference(hexa.value, false));
  hexa.addEventListener('change', () => saisirReference(hexa.value, true));
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
  vue.className = 'page-stack colonne vue-de-la-palette';
  vue.append(choix, configuration);
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
    const sortie = document.createElement('div');
    sortie.className = 'confirmation-gestes';
    // Pendant un conflit, le brouillon s'exporte avant qu'un rechargement ne le remplace (V12.1).
    if (statut === 'refuse') sortie.append(createButton({ label: TEXTES.exporterLeBrouillon, variant: 'secondary', onClick: () => demandes.exporterLeBrouillon() }));
    sortie.append(createButton({ label: TEXTES.recharger, onClick: () => demandes.recharger() }));
    bloc.append(sortie);
    zoneDuRefus.replaceChildren(bloc);
  }

  function rendrePalette(courante: Palette, lue: Recette): void {
    idOuvert = courante.id;
    const analyse = analyserPalette(lue, courante);
    selecteur.afficher(lue.palettes, courante.id);
    menu.afficher(lue.palettes.indexOf(courante), lue.palettes.length);
    placerLaCreation(choix, confirmation);
    creation.element.hidden = !creationOuverte;
    plus.setAttribute('aria-expanded', String(creationOuverte));
    texteDeConfirmation.textContent = confirmationDeSuppression(nomDeLaPalette(courante));
    confirmation.hidden = !suppressionDemandee;
    zoneDeLaNote.replaceChildren(...(note ? [blocDeConstat(note, 'notice')] : []));
    zoneDeLaNote.hidden = !note;

    poser(hexa, courante.reference);
    pipette.poser(courante.reference);
    ajusteeDepuis.textContent = courante.originale ? TEXTES_DE_L_AJUSTEMENT.ajusteeDepuis(courante.originale) : '';
    traceDeLAjustement.hidden = !courante.originale;
    poser(nom, courante.nom ?? '');
    nom.placeholder = courante.reference;
    titreDeConfiguration.textContent = TEXTES_DE_L_ONGLET.titre(nomDeLaPalette(courante));
    choixDeBase.poser(courante.base ?? 'auto');
    choixDuModele.poser(analyse.libre ? 'libre' : 'modele');
    choixDeBase.element.hidden = analyse.libre;
    puces.element.hidden = !analyse.libre;
    puces.poser(analyse.grille.crans);
    choixAutomatique.textContent = courante.base ? '' : TEXTES_DE_LA_BASE.choixAutomatique(profilAutomatique(lue, courante));
    choixAutomatique.hidden = Boolean(courante.base);
    repereDeReference.textContent = `◆ ${ligneDeLaReference(analyse.ancrage, nuancier.mode())}`;

    nuancier.afficher({ recette: lue, analyse, confondues: analyse.confusions });

    const nomDe = (id: string) => {
      const trouvee = lue.palettes.find((candidate) => candidate.id === id);
      return trouvee ? nomDeLaPalette(trouvee) : id;
    };
    const messages = messagesDeLaPalette(analyse, courante, { recette: lue, nomDe });
    // Une palette libre n'a pas de garantie : sa carte se retire (W6.5).
    garanties.element.hidden = analyse.libre;
    if (!analyse.libre) garanties.afficher({ recette: lue, palette: courante, analyse, mode: nuancier.mode() });
    intensites.afficher(lue, courante, analyse.part, messages.intensite);
    const pointsDIntensite = messages.intensite.filter((message) => message.severite !== 'notice').length;
    carteDesIntensites.poserResume(resumeDesIntensites(courante.parts?.origine, courante.base, analyse.parts, pointsDIntensite));
    poserLesMessages(messages.liste);

    // Une référence presque grise n'a pas de teinte : l'éditeur se désactive ([DER-15]).
    const grise = estPresqueGrise(lue, courante);
    const pointsDeDerive = messages.liste.filter((message) => carteDuMessage(message.cibles) === 'derive').length;
    carteDeLaDerive.poserResume(resumeDeLaDerive(courante, grise, pointsDeDerive));
    carteDeLaDerive.desactiver(grise ? TEXTES_DE_LA_DERIVE.grisDesactive : null);
    if (carteDeLaDerive.estOuverte()) editeur.afficher(lue, courante, analyse.rampes, analyse.ancrage, analyse);
    interfaceDeTest.afficher(lue, analyse, nuancier.mode());
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
    afficher(classement) {
      classementLu = classement;
      recette = classement.etat === 'future' || classement.etat === 'illisible' ? null : classement.recette;
      refus = null;
      rendre();
    },
    recette: () => recette,
    ouverte() {
      const courante = ouverte();
      return courante ? { id: courante.id, mode: nuancier.mode() } : null;
    },
    previsualiser(suivante) {
      recette = suivante;
      rendre();
    },
    appliquer: (suivante) => valider(suivante),
    importer(suivante) {
      classementLu = { etat: 'courante', recette: suivante };
      valider(suivante);
    },
    poserStatut(suivant, refusDuSandbox) {
      statut = suivant;
      demandes.recetteEnFichier.bloquer(suivant === 'refuse' ? TEXTES.conflitEnCours : null);
      if (suivant === 'refuse') refus = recetteModifieeAilleurs();
      else if (suivant === 'invalide') refus = rangementInvalide(refusDuSandbox);
      rendre();
    },
    ouvrirLaPalette(id, mode) {
      idOuvert = id;
      suppressionDemandee = false;
      creationOuverte = false;
      rendre();
      nuancier.choisirLeTheme(mode);
    },
  };
}
