/**
 * L'onglet Palettes (section 13.2) : le choix ou la création d'une palette,
 * puis « Configuration de la palette » en cartes : Couleur de base, Aperçu,
 * Intensités et Dérive de teinte repliables, et la génération en dernière
 * carte. Un message se lit sous la carte qu'il concerne.
 *
 * Une saisie recalcule l'aperçu dans l'interface ([ENT-02]). La recette
 * s'enregistre à la fin de chaque geste : valider un champ, relâcher un
 * curseur, créer, dupliquer, réordonner ou supprimer une palette (D-D). Jamais
 * pendant la saisie.
 */
import {
  alertesDePalette,
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
import {
  MOTIF_HEXA,
  ajouter,
  changerReference,
  choisirLaBase,
  deplacer,
  dupliquer,
  nouvelIdentifiant,
  nouvellePalette,
  remplacerPalette,
  renommer,
  supprimer,
} from '../edition';
import { PLANCHE_SANS_CADRE, type EtatDeLaPlanche, type LectureDeSelection, type ProfilDuDocument } from '../lecture';
import { fraicheurDUnePalette } from '../planche/fraicheur';
import { CIBLES_COMMUNES, carteDuMessage, type CarteDuMessage, type CibleDAction } from '../presentation';
import { blocDeConstat, listeDesMessages, type Message } from './constats';
import { createCarte } from './carte';
import { createCreation } from './creation';
import { createEditeur } from './derive/editeur';
import type { EtatDuDessin, GestesDuResultat } from './dessin';
import type { StatutDuRangement } from './frontiere';
import { createGaranties } from './garanties';
import { createGeneration, type CadreDeLaPalette } from './generation';
import type { GestesDeLaRecetteUi } from './gestesDeLaRecette';
import { createIntensites } from './intensites';
import { createMenuPalette, type GesteDePalette } from './menuPalette';
import { messagesDeLaPalette } from './messagesDePalette';
import { createNuancier } from './nuancier';
import { createSelecteur } from './selecteur';
import {
  NOM_DU_PROFIL,
  STATUTS_DU_RANGEMENT,
  TEXTES,
  TEXTES_DE_LA_BASE,
  TEXTES_DE_LA_DERIVE,
  TEXTES_DE_L_ONGLET,
  confirmationDeSuppression,
  couleurRamenee,
  hexaInvalide,
  ligneDeLaReference,
  nomDeLaCopie,
  nomDeLaPalette,
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
  /** Ouvre une palette dans le thème que sa fiche de l'onglet Planche montrait (V8.3). */
  ouvrirLaPalette(id: string, mode: Mode): void;
}

function ligneDEtat(texte: string): HTMLParagraphElement {
  const ligne = document.createElement('p');
  ligne.className = 'etat-lecture';
  ligne.textContent = texte;
  return ligne;
}

/** Un champ de la carte Couleur de base : son libellé au-dessus, ses saisies sur une ligne ([UI-11]). */
function champEnColonne(libelle: string, ...saisies: HTMLElement[]): HTMLLabelElement {
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-colonne';
  const texte = document.createElement('span');
  texte.className = 'libelle-de-champ';
  texte.textContent = libelle;
  const ligne = document.createElement('span');
  ligne.className = 'champ-ligne';
  ligne.append(...saisies);
  etiquette.append(texte, ligne);
  return etiquette;
}

export function createOngletPalettes(demandes: DemandesDeLOnglet): OngletPalettesUi {
  const element = document.createElement('div');
  element.className = 'page-stack colonne';

  let recette: Recette | null = null;
  let classementLu: Classement | null = null;
  let profil: ProfilDuDocument = 'SRGB';
  let planche: EtatDeLaPlanche = PLANCHE_SANS_CADRE;
  let idOuvert = '';
  let creationOuverte = false;
  let suppressionDemandee = false;
  let note: Constat | null = null;
  let statut: StatutDuRangement = 'lu';
  let refus: Constat | null = null;
  let dernierDessin: { etat: EtatDuDessin; noms: { readonly [id: string]: string } } = { etat: { phase: 'repos' }, noms: {} };

  // Le choix ou la création d'une palette, en tête de l'onglet.
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

  const choix = document.createElement('div');
  choix.className = 'choix-de-palette';
  choix.append(barre, confirmation, zoneDeLaNote);

  // Le titre de premier rang, et l'état de l'enregistrement au rang 3.
  const titreDeConfiguration = document.createElement('h2');
  titreDeConfiguration.className = 'titre-de-premier-rang';
  titreDeConfiguration.textContent = TEXTES_DE_L_ONGLET.titre;
  const indication = document.createElement('span');
  indication.className = 'etat-rangement ligne-secondaire';
  indication.setAttribute('aria-live', 'polite');
  const teteDeConfiguration = document.createElement('div');
  teteDeConfiguration.className = 'tete-de-configuration';
  teteDeConfiguration.append(titreDeConfiguration, indication);

  // Carte Couleur de base ([UI-11]).
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
  const colonneDeLaReference = champEnColonne(TEXTES.reference, pipette, hexa);
  colonneDeLaReference.append(erreurHexa);
  // La palette de base : Auto, Soft ou Vivid ([UI-11], [ENT-11]).
  const choixDeBase = document.createElement('div');
  choixDeBase.className = 'bascule bascule-de-base';
  choixDeBase.setAttribute('role', 'group');
  choixDeBase.setAttribute('aria-label', TEXTES_DE_LA_BASE.libelle);
  const boutonsDeBase = (['auto', 'soft', 'vivid'] as const).map((valeur) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bascule-option';
    bouton.textContent = valeur === 'auto' ? TEXTES_DE_LA_BASE.auto : NOM_DU_PROFIL[valeur];
    bouton.addEventListener('click', () => {
      const courante = ouverte();
      if (recette && courante) valider(remplacerPalette(recette, choisirLaBase(courante, valeur)));
    });
    choixDeBase.append(bouton);
    return { valeur, bouton };
  });
  const choixAutomatique = document.createElement('span');
  choixAutomatique.className = 'ligne-secondaire';
  const libelleDeLaBase = document.createElement('span');
  libelleDeLaBase.className = 'libelle-de-champ';
  libelleDeLaBase.textContent = TEXTES_DE_LA_BASE.libelle;
  const colonneDeLaBase = document.createElement('div');
  colonneDeLaBase.className = 'champ-colonne';
  colonneDeLaBase.append(libelleDeLaBase, choixDeBase, choixAutomatique);

  const colonnes = document.createElement('div');
  colonnes.className = 'colonnes-de-base';
  colonnes.append(champEnColonne(TEXTES.nom, nom), colonneDeLaReference, colonneDeLaBase);
  const carteDeBase = createCarte({ titre: TEXTES_DE_L_ONGLET.couleurDeBase });
  const messagesDeBase = document.createElement('div');
  carteDeBase.corps.append(colonnes, messagesDeBase);

  // Carte Aperçu ([UI-04]) : la bascule des thèmes et le fond dans l'en-tête.
  const nuancier = createNuancier({
    surMode: () => rendre(),
    modifierLeFond: () => demandes.ouvrirReglages('fonds'),
    choisirGarantie: (association) => garanties.choisir(association),
  });
  const carteDApercu = createCarte({ titre: TEXTES_DE_L_ONGLET.apercu });
  carteDApercu.tete.append(nuancier.tete);
  const repereDeReference = document.createElement('p');
  repereDeReference.className = 'repere-de-la-reference';
  carteDApercu.corps.append(repereDeReference, nuancier.element);
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
    voirLesGaranties: () => {
      garanties.element.scrollIntoView({ block: 'start' });
      garanties.element.querySelector<HTMLElement>('.carte-bascule')?.focus({ preventScroll: true });
    },
  });
  carteDeLaDerive.corps.append(editeur.element);
  // L'éditeur ne se dessine que déplié : l'ouvrir le dessine.
  carteDeLaDerive.surBascule(() => rendre());
  const messagesDeLaDerive = document.createElement('div');

  // La génération ferme la configuration, dans une carte au fond du panneau ([UI-05]).
  const generation = createGeneration({
    ...demandes.resultat,
    generer: () => {
      const courante = ouverte();
      if (courante) demandes.dessiner([courante.id], { [courante.id]: nomDeLaPalette(courante) });
    },
  });
  const carteDeGeneration = createCarte({ titre: TEXTES_DE_L_ONGLET.generation, plate: true });
  carteDeGeneration.corps.append(generation.element);

  const configuration = document.createElement('div');
  configuration.className = 'configuration-de-la-palette';
  configuration.append(
    teteDeConfiguration,
    carteDeBase.element,
    carteDApercu.element,
    messagesDApercu,
    garanties.element,
    carteDesIntensites.element,
    carteDeLaDerive.element,
    messagesDeLaDerive,
    carteDeGeneration.element,
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

  /**
   * L'état du cadre de la palette ouverte. Le calcul reconstruit le modèle du
   * cadre : il suit la fin d'un geste et chaque lecture, jamais un glisser.
   */
  let cadreOuvert: CadreDeLaPalette = { etat: 'jamais-dessinee', page: null, cadre: null };
  function recalculerLeCadre(): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    const { etat, page, cadre } = fraicheurDUnePalette(recette, profil, planche, courante.id);
    cadreOuvert = { etat, page, cadre };
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
    bloc.append(createButton({ label: TEXTES.recharger, onClick: () => demandes.recharger() }));
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
    poser(pipette, courante.reference.toLowerCase());
    poser(nom, courante.nom ?? '');
    nom.placeholder = courante.reference;
    const base = courante.base ?? 'auto';
    for (const { valeur, bouton } of boutonsDeBase) bouton.setAttribute('aria-pressed', String(valeur === base));
    choixAutomatique.textContent = courante.base ? '' : TEXTES_DE_LA_BASE.choixAutomatique(profilAutomatique(lue, courante));
    choixAutomatique.hidden = Boolean(courante.base);
    repereDeReference.textContent = `◆ ${ligneDeLaReference(analyse.ancrage, nuancier.mode())}`;

    const confusions = alertesDePalette(lue, courante).flatMap((alerte) => (alerte.code === 'profils-confondus' ? alerte.crans : []));
    nuancier.afficher({ recette: lue, analyse, confondues: confusions });

    const nomDe = (id: string) => {
      const trouvee = lue.palettes.find((candidate) => candidate.id === id);
      return trouvee ? nomDeLaPalette(trouvee) : id;
    };
    const messages = messagesDeLaPalette(analyse, courante, { recette: lue, nomDe });
    garanties.afficher({ recette: lue, palette: courante, analyse, mode: nuancier.mode() });
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
    ouvrirLaPalette(id, mode) {
      idOuvert = id;
      suppressionDemandee = false;
      creationOuverte = false;
      recalculerLeCadre();
      rendre();
      nuancier.choisirLeTheme(mode);
    },
  };
}
