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

import { lireLImport } from '../importation';
import type { PluginMessage } from '../messages';
import { ecartsDePeinture } from '../planche/peints';
import { createConfiguration } from './configuration';
import { createSuiviDuDessin, type GestesDuResultat } from './dessin';
import { createFrontiere } from './frontiere';
import { createGestesDeLaRecette, type DemandesDeLaRecette } from './gestesDeLaRecette';
import { createOngletPalettes } from './ongletPalettes';
import { createOngletPlanche } from './ongletPlanche';
import { telecharger } from './telechargement';
import { versSandbox } from './pont';
import { TEXTES } from './textes';

/** `index.html` déclare ce conteneur ; `tests/buildUi.test.ts` tient le gabarit. */
const app = document.getElementById('app') as HTMLElement;
app.className = 'container';

const titre = document.createElement('h1');
titre.className = 'page-title';
titre.textContent = TEXTES.titre;

const settingsButton = createSettingsButton(ouvrirConfiguration);
const backButton = createBackButton(ouvrirTravail);

const enTete = document.createElement('div');
enTete.className = 'header';
const ligneDuHaut = document.createElement('div');
ligneDuHaut.className = 'header-topline';
ligneDuHaut.append(titre, settingsButton, backButton);
enTete.append(ligneDuHaut);

const frontiere = createFrontiere(versSandbox, (statut, refus) => {
  ongletPalettes.poserStatut(statut, refus);
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

const demandesDeLaRecette: DemandesDeLaRecette = {
  exporter: () => telecharger('palettes.recette.json', texteAExporter()),
  lire: (texte) => lireLImport(texte, ongletPalettes.recette()),
  remplacer: remplacerLaRecette,
  recetteParDefaut,
};

const ongletPalettes = createOngletPalettes({
  ranger: (recette) => frontiere.ranger(recette),
  lireLaSelection: () => frontiere.lireLaSelection(),
  recharger: () => frontiere.lireLEtat(),
  tirer: () => crypto.getRandomValues(new Uint32Array(1))[0],
  dessiner: (palettes, noms) => suivi.dessiner(palettes, ongletPlanche.grille(), noms),
  resultat: gestesDuResultat,
  recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
});
const ongletPlanche = createOngletPlanche({
  ...gestesDuResultat,
  dessiner: (palettes, grille, noms) => suivi.dessiner(palettes, grille, noms),
  versLesPalettes: () => onglets.selectionner('palettes'),
  recetteEnFichier: createGestesDeLaRecette(demandesDeLaRecette),
});

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
  if (id === 'planche') afficherLaPlanche();
});

const travail = document.createElement('div');
travail.className = 'page-stack colonne';
travail.append(onglets.liste, ongletPalettes.element, ongletPlanche.element);

// Pendant un dessin, aucun geste n'est possible : les panneaux se figent, la progression se lit.
suivi.abonner((etat) => {
  const enCours = etat.phase === 'en-cours';
  ongletPalettes.element.inert = enCours;
  ongletPlanche.element.inert = enCours;
  settingsButton.disabled = enCours;
  ongletPalettes.afficherDessin(etat, suivi.noms());
  ongletPlanche.afficherDessin(etat, suivi.noms());
});

const panneauDeConfiguration = createConfiguration({
  lire: () => ongletPalettes.recette(),
  previsualiser: (recette) => ongletPalettes.previsualiser(recette),
  appliquer: (recette) => ongletPalettes.appliquer(recette),
});
const configuration = panneauDeConfiguration.element;
configuration.hidden = true;

function bascule(): ElementsDeBascule {
  return { travail, configuration, settingsButton, backButton };
}

function ouvrirConfiguration(): void {
  panneauDeConfiguration.afficher();
  montrerConfiguration(bascule());
  titre.textContent = TEXTES.titreConfiguration;
}

function ouvrirTravail(): void {
  montrerTravail(bascule());
  titre.textContent = TEXTES.titre;
}

app.append(enTete, travail, configuration, createResizeGrip(versSandbox));

onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;
  if (message.type === 'etat' && frontiere.accepterEtat(message)) {
    ongletPalettes.afficher(message.classement, message.profil);
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
