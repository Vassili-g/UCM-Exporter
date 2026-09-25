/**
 * Point d'entrée du sandbox d'UCM Palettes : ouvre l'interface, lit l'état du
 * fichier et route les demandes de l'interface.
 *
 * Le routage n'a qu'une porte par geste d'écriture ([ARC-14]) : « ranger la
 * recette » et « dessiner ».
 */
import { dessinerLaRecetteRangee } from './ecriture/planche';
import { rangerRecette } from './ecriture/recette';
import { TAILLE_PAR_DEFAUT, lireTaille, rangerTaille, tailleValide } from './fenetre';
import { couleurDeLaSelection, lireEtat, lireLaPlanche } from './lecture';
import type { PluginMessage, UiRequest } from './messages';
import { voirSurLaPlanche } from './navigation';

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

async function envoyerEtat(demande: number, toutesLesPages: boolean): Promise<void> {
  versUi({ type: 'etat', demande, ...lireEtat(figma.root), planche: await lireLaPlanche(figma, toutesLesPages) });
}

async function traiterMessage(message: UiRequest): Promise<void> {
  if (message.type === 'lire-etat') {
    await envoyerEtat(message.demande, message.recherche === 'fichier');
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

  if (message.type === 'dessiner') {
    const resultat = await dessinerLaRecetteRangee(figma, message, (fait, total, nom) =>
      versUi({ type: 'progression', demande: message.demande, fait, total, nom }));
    versUi({ type: 'dessin', demande: message.demande, resultat });
    return;
  }

  if (message.type === 'voir-sur-la-planche') {
    await voirSurLaPlanche(figma, message.page, message.cadres);
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
