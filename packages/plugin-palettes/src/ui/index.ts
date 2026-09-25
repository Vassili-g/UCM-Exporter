/**
 * Point d'entrée de l'interface d'UCM Palettes : l'en-tête du socle, deux
 * onglets et la configuration derrière l'engrenage ([UI-02]).
 */
import { jsonCanonique, recetteParDefaut, type Recette } from 'ucm-couleur';
import {
  createBackButton,
  createSettingsButton,
  montrerConfiguration,
  montrerTravail,
  type ElementsDeBascule,
} from 'ucm-plugin-socle/src/ui/EnTete';
import { createOnglets } from 'ucm-plugin-socle/src/ui/Onglets';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { GroupeDeConfiguration } from '../configuration';
import { lireLImport } from '../importation';
import type { CibleDAction } from '../presentation';
import type { EcartDePeinture } from '../planche/peints';
import { rapportDeLaRecette } from '../rapport';
import type { PluginMessage } from '../messages';
import { consequenceDeLImport } from '../planche/fraicheur';
import { ecartsDePeinture } from '../planche/peints';
import { createConfiguration } from './configuration';
import { createSuiviDuDessin, type GestesDuResultat } from './dessin';
import { createFrontiere } from './frontiere';
import { createGestesDeLaRecette, type DemandesDeLaRecette } from './gestesDeLaRecette';
import { createOngletPalettes } from './ongletPalettes';
import { createOngletPlanche } from './ongletPlanche';
import { telecharger } from './telechargement';
import { versSandbox } from './pont';
import { TEXTES, nomDeLaPalette } from './textes';

/** `index.html` déclare ce conteneur ; `tests/buildUi.test.ts` tient le gabarit. */
const app = document.getElementById('app') as HTMLElement;
app.className = 'container';

const titre = document.createElement('h1');
titre.className = 'page-title';
titre.textContent = TEXTES.titre;

/** Le groupe des Réglages communs qu'une cible d'action ouvre ([VER-15]). */
const GROUPE_DE_LA_CIBLE: Partial<Record<CibleDAction, GroupeDeConfiguration>> = {
  'luminosite-commune': 'courbes',
  fonds: 'fonds',
  'intensites-communes': 'parts',
};

const settingsButton = createSettingsButton(ouvrirConfiguration, { etiquette: TEXTES.ouvrirLesReglages, infobulle: TEXTES.reglagesCommuns });
const backButton = createBackButton(ouvrirTravail, TEXTES.retour);

const enTete = document.createElement('div');
enTete.className = 'header';
const ligneDuHaut = document.createElement('div');
ligneDuHaut.className = 'header-topline';
ligneDuHaut.append(titre, settingsButton, backButton);
enTete.append(ligneDuHaut);

const frontiere = createFrontiere(versSandbox, (statut, refus) => {
  ongletPalettes.poserStatut(statut, refus);
  ongletPlanche.bloquer(statut === 'refuse' ? TEXTES.conflitEnCours : null);
  // Une recette rangée peut périmer des cadres ([PLA-20]).
  if (statut === 'range') afficherLaPlanche();
});
// Un dessin fini a posé des cadres : l'état relu dit lesquels à l'onglet Planche.
const suivi = createSuiviDuDessin(frontiere, () => frontiere.lireLEtat(), (resultat) => {
  const recette = ongletPalettes.recette();
  return resultat.issue === 'dessinee' && recette ? ecartsDePeinture(recette, resultat.peints) : [];
});
const gestesDuResultat: GestesDuResultat = {
  voirSurLaPlanche: (page, cadres) => frontiere.voirSurLaPlanche(page, cadres),
  reessayer: () => suivi.reessayer(),
  recharger: () => frontiere.lireLEtat(),
  confirmerEtrangers: () => suivi.confirmerEtrangers(),
  renoncer: () => suivi.renoncer(),
};
/**
 * Le texte qu'exporte « Exporter la recette » ([REC-07]) : la recette que
 * l'aperçu montre, en JSON canonique ; une recette illisible ou future
 * s'exporte telle qu'elle est rangée ([REC-11]).
 */
function texteAExporter(): string {
  const classement = dernierEtat?.classement;
  if (dernierEtat && (classement?.etat === 'future' || classement?.etat === 'illisible')) return dernierEtat.texte;
  return jsonCanonique(ongletPalettes.recette() ?? recetteParDefaut());
}

/**
 * Une recette importée, ou la recette par défaut, remplace celle du fichier.
 * L'onglet Planche la relit au rangement qui suit : son dernier état cesse
 * d'être illisible.
 */
function remplacerLaRecette(recette: Recette): void {
  ongletPalettes.importer(recette);
  if (dernierEtat) dernierEtat = { ...dernierEtat, classement: { etat: 'courante', recette } };
  panneauDeConfiguration.afficher();
}

/** Les écarts de peinture du dernier dessin, que le rapport reprend (L6.14). */
let ecartsDuDernierDessin: readonly EcartDePeinture[] | null = null;

const demandesDeLaRecette: DemandesDeLaRecette = {
  exporter: () => telecharger('palettes-et-reglages.json', texteAExporter()),
  exporterLeRapport() {
    const recette = ongletPalettes.recette();
    if (!recette) return;
    const rapport = rapportDeLaRecette(recette, frontiere.empreinte(), dernierEtat?.profil ?? 'SRGB', ecartsDuDernierDessin);
    telecharger('rapport-palettes.json', JSON.stringify(rapport, null, 2));
  },
  lire: (texte) => lireLImport(texte, ongletPalettes.recette()),
  remplacer: remplacerLaRecette,
  recetteParDefaut,
  consequence(importee) {
    const actuelle = ongletPalettes.recette();
    if (!actuelle || !dernierEtat) return null;
    const { aMettreAJour, orphelins } = consequenceDeLImport(actuelle, importee, dernierEtat.profil, dernierEtat.planche);
    return { aMettreAJour: aMettreAJour.map(nomDeLaPalette), orphelins: orphelins.map(nomDeLaPalette) };
  },
};

/** Chaque génération dessine la grille des contrastes (section 9.5, [UI-05]). */
const AVEC_LA_GRILLE = true;

const ongletPalettes = createOngletPalettes({
  ranger: (recette) => frontiere.ranger(recette),
  lireLaSelection: () => frontiere.lireLaSelection(),
  recharger: () => frontiere.lireLEtat(),
  exporterLeBrouillon: () => demandesDeLaRecette.exporter(),
  tirer: () => crypto.getRandomValues(new Uint32Array(1))[0],
  dessiner: (palettes, noms) => suivi.dessiner(palettes, AVEC_LA_GRILLE, noms),
  resultat: gestesDuResultat,
  recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
  ouvrirReglages(cible) {
    ouvrirConfiguration();
    panneauDeConfiguration.focaliser(GROUPE_DE_LA_CIBLE[cible] ?? 'courbes');
  },
});
const ongletPlanche = createOngletPlanche({
  ...gestesDuResultat,
  dessiner: (palettes, noms) => suivi.dessiner(palettes, AVEC_LA_GRILLE, noms),
  versLesPalettes: () => onglets.selectionner('palettes'),
  modifier(id, mode) {
    onglets.selectionner('palettes');
    ongletPalettes.ouvrirLaPalette(id, mode);
  },
  actualiser: relireLaPlanche,
  recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
});

/**
 * Relit l'état pour la planche (V8.7) : à l'accès à l'onglet, et au geste
 * « Actualiser » pour ce que les événements de Figma ne disent pas. Comme au
 * retour du focus, la relecture attend qu'aucun rangement ne soit en vol.
 */
function relireLaPlanche(recherche?: 'fichier'): void {
  if (frontiere.auRepos() && frontiere.statut() !== 'refuse') frontiere.lireLEtat(recherche);
}

/**
 * Le dernier état accepté : l'onglet Planche le relit quand on l'ouvre. Sa
 * fraîcheur recalcule le modèle de chaque cadre ; elle ne se calcule que sur
 * l'onglet ouvert.
 */
let dernierEtat: Extract<PluginMessage, { type: 'etat' }> | null = null;

function afficherLaPlanche(): void {
  if (!dernierEtat || onglets.actif() !== 'planche') return;
  ongletPlanche.afficher(dernierEtat.classement, ongletPalettes.recette(), dernierEtat.planche, dernierEtat.profil, frontiere.empreinte());
}

// La recette change dans l'onglet Palettes : l'onglet Planche la relit à son ouverture.
const onglets = createOnglets(TEXTES.etiquetteDesOnglets, [
  { id: 'palettes', libelle: TEXTES.ongletPalettes, panneau: ongletPalettes.element },
  { id: 'planche', libelle: TEXTES.ongletPlanche, panneau: ongletPlanche.element },
], (id) => {
  if (id !== 'planche') return;
  afficherLaPlanche();
  relireLaPlanche();
});

const travail = document.createElement('div');
travail.className = 'page-stack colonne';
travail.append(onglets.liste, ongletPalettes.element, ongletPlanche.element);

// Pendant un dessin, aucun geste n'est possible : les panneaux se figent, la progression se lit.
suivi.abonner((etat) => {
  if (etat.phase === 'fini' && etat.resultat.issue === 'dessinee') ecartsDuDernierDessin = etat.ecarts;
  const enCours = etat.phase === 'en-cours';
  ongletPalettes.element.inert = enCours;
  ongletPlanche.element.inert = enCours;
  settingsButton.disabled = enCours;
  ongletPalettes.afficherDessin(etat, suivi.noms());
  ongletPlanche.afficherDessin(etat, suivi.noms());
});

const panneauDeConfiguration = createConfiguration({
  lire: () => ongletPalettes.recette(),
  ouverte: () => ongletPalettes.ouverte(),
  previsualiser: (recette) => ongletPalettes.previsualiser(recette),
  appliquer: (recette) => ongletPalettes.appliquer(recette),
});
const configuration = panneauDeConfiguration.element;
configuration.hidden = true;

function bascule(): ElementsDeBascule {
  return { travail, configuration, settingsButton, backButton };
}

/**
 * Le point de lecture de la vue de travail quand les Réglages communs
 * s'ouvrent : le retour y ramène le défilement et rend le focus au geste qui
 * les a ouverts ([VER-15]). La palette, le thème et la nuance choisie restent,
 * leurs éléments n'étant jamais reconstruits.
 */
let pointDeLecture: { defilement: number; focus: HTMLElement | null } | null = null;

function ouvrirConfiguration(): void {
  pointDeLecture = { defilement: document.scrollingElement?.scrollTop ?? 0, focus: document.activeElement as HTMLElement | null };
  panneauDeConfiguration.afficher();
  montrerConfiguration(bascule());
  titre.textContent = TEXTES.titreConfiguration;
}

function ouvrirTravail(): void {
  montrerTravail(bascule());
  titre.textContent = TEXTES.titre;
  const point = pointDeLecture;
  pointDeLecture = null;
  if (!point) return;
  if (document.scrollingElement) document.scrollingElement.scrollTop = point.defilement;
  if (point.focus?.isConnected && point.focus !== document.body) point.focus.focus({ preventScroll: true });
}

app.append(enTete, travail, configuration, createResizeGrip(versSandbox));

onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;
  if (message.type === 'etat' && frontiere.accepterEtat(message)) {
    ongletPalettes.afficher(message.classement, message.profil, message.planche);
    panneauDeConfiguration.afficher();
    dernierEtat = message;
    afficherLaPlanche();
  } else if (message.type === 'selection' && frontiere.accepterSelection(message)) {
    ongletPalettes.recevoirSelection(message.lecture);
  } else if (message.type === 'rangement') {
    frontiere.recevoirRangement(message);
  } else if (message.type === 'progression' || message.type === 'dessin') {
    suivi.recevoir(message);
  }
};

/*
 * Un autre designer, ou un Ctrl+Z dans Figma, a pu changer la recette pendant
 * que la fenêtre n'avait pas le focus (E13). La relecture suit un retour du
 * focus, jamais le premier : l'état vient d'être lu à l'ouverture. Elle attend
 * qu'aucun rangement ne soit en vol, et ne masque pas un refus en cours.
 */
let focusPerdu = false;
window.addEventListener('blur', () => {
  focusPerdu = true;
});
window.addEventListener('focus', () => {
  if (!focusPerdu) return;
  focusPerdu = false;
  if (frontiere.auRepos() && frontiere.statut() !== 'refuse') frontiere.lireLEtat();
});

frontiere.lireLEtat();
