/**
 * Point d'entrée du sandbox d'UCM Palettes : ouvre l'interface, lit l'état du
 * fichier et route les demandes de l'interface.
 *
 * Le routage n'a qu'une porte par geste d'écriture ([ARC-14]) : « ranger la
 * recette » ici ; « dessiner » s'ajoute avec la planche.
 */
import { rangerRecette } from './ecriture/recette';
import { TAILLE_PAR_DEFAUT, lireTaille, rangerTaille, tailleValide } from './fenetre';
import { couleurDeLaSelection, lireEtat } from './lecture';
import type { PluginMessage, UiRequest } from './messages';

/*
 * `showUI` part tout de suite à la taille par défaut, puis la fenêtre reprend
 * la taille rangée : `clientStorage` est asynchrone.
 */
figma.showUI(__html__, {
  themeColors: true,
  width: TAILLE_PAR_DEFAUT.largeur,
  height: TAILLE_PAR_DEFAUT.hauteur,
});
void lireTaille().then((taille) => figma.ui.resize(taille.largeur, taille.hauteur));

/** Porte typée unique vers l'interface. */
function versUi(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

function envoyerEtat(demande: number): void {
  versUi({ type: 'etat', demande, ...lireEtat(figma.root) });
}

async function traiterMessage(message: UiRequest): Promise<void> {
  if (message.type === 'lire-etat') {
    envoyerEtat(message.demande);
    return;
  }

  if (message.type === 'lire-selection') {
    const lecture = couleurDeLaSelection(figma.currentPage.selection, figma.root.documentColorProfile);
    versUi({ type: 'selection', demande: message.demande, lecture });
    return;
  }

  if (message.type === 'ranger-recette') {
    versUi({ type: 'rangement', demande: message.demande, issue: rangerRecette(figma, message.recette, message.empreinteLue) });
    return;
  }

  if (message.type === 'resize') {
    const taille = tailleValide({ largeur: message.largeur, hauteur: message.hauteur });
    figma.ui.resize(taille.largeur, taille.hauteur);
    await rangerTaille(taille);
  }
}

figma.ui.onmessage = async (message: UiRequest) => {
  if (!message || typeof message.type !== 'string') return;
  await traiterMessage(message);
};
