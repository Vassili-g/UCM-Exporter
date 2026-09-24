/**
 * Point d'entrée de l'interface d'UCM Palettes : l'en-tête du socle, deux
 * onglets et la configuration derrière l'engrenage ([UI-02]).
 */
import {
  createBackButton,
  createSettingsButton,
  montrerConfiguration,
  montrerTravail,
  type ElementsDeBascule,
} from 'ucm-plugin-socle/src/ui/EnTete';
import { createOnglets } from 'ucm-plugin-socle/src/ui/Onglets';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { PluginMessage } from '../messages';
import { createConfiguration } from './configuration';
import { createSuiviDuDessin, type GestesDuResultat } from './dessin';
import { createFrontiere } from './frontiere';
import { createOngletPalettes } from './ongletPalettes';
import { createOngletPlanche } from './ongletPlanche';
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

const frontiere = createFrontiere(versSandbox, (statut, refus) => ongletPalettes.poserStatut(statut, refus));
// Un dessin fini a posé des cadres : l'état relu dit lesquels à l'onglet Planche.
const suivi = createSuiviDuDessin(frontiere, () => frontiere.lireLEtat());
const gestesDuResultat: GestesDuResultat = {
  voirSurLaPlanche: (page, cadres) => frontiere.voirSurLaPlanche(page, cadres),
  reessayer: () => suivi.reessayer(),
  recharger: () => frontiere.lireLEtat(),
};
const ongletPalettes = createOngletPalettes({
  ranger: (recette) => frontiere.ranger(recette),
  lireLaSelection: () => frontiere.lireLaSelection(),
  recharger: () => frontiere.lireLEtat(),
  tirer: () => crypto.getRandomValues(new Uint32Array(1))[0],
  dessiner: (palettes, noms) => suivi.dessiner(palettes, ongletPlanche.grille(), noms),
  resultat: gestesDuResultat,
});
const ongletPlanche = createOngletPlanche({
  ...gestesDuResultat,
  dessiner: (palettes, grille, noms) => suivi.dessiner(palettes, grille, noms),
  versLesPalettes: () => onglets.selectionner('palettes'),
});

/** Le dernier état accepté : l'onglet Planche le relit quand on l'ouvre. */
let dernierEtat: Extract<PluginMessage, { type: 'etat' }> | null = null;

function afficherLaPlanche(): void {
  if (!dernierEtat) return;
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
