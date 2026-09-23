/**
 * Point d'entrée de l'interface d'UCM Palettes : l'en-tête du socle, deux
 * onglets et la configuration derrière l'engrenage ([UI-02]).
 */
import type { Classement } from 'ucm-couleur';
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
import { versSandbox } from './pont';
import { TEXTES, palettesDuFichier, recetteFuture, recetteIllisible, type Constat } from './textes';

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

const panneauPalettes = document.createElement('div');
panneauPalettes.className = 'page-stack';
const panneauPlanche = document.createElement('div');
panneauPlanche.className = 'page-stack';

const onglets = createOnglets(TEXTES.etiquetteDesOnglets, [
  { id: 'palettes', libelle: TEXTES.ongletPalettes, panneau: panneauPalettes },
  { id: 'planche', libelle: TEXTES.ongletPlanche, panneau: panneauPlanche },
]);

const travail = document.createElement('div');
travail.className = 'page-stack';
travail.append(onglets.liste, panneauPalettes, panneauPlanche);

const configuration = document.createElement('div');
configuration.className = 'page-stack';
configuration.hidden = true;

function bascule(): ElementsDeBascule {
  return { travail, configuration, settingsButton, backButton };
}

function ouvrirConfiguration(): void {
  montrerConfiguration(bascule());
  titre.textContent = TEXTES.titreConfiguration;
}

function ouvrirTravail(): void {
  montrerTravail(bascule());
  titre.textContent = TEXTES.titre;
}

/*
 * Chaque classe s'écrit en littéral : la loi des styles ne lit que les
 * affectations littérales de `className`, et une classe passée en paramètre
 * lui échapperait.
 */
function paragraphe(texte: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  return element;
}

function ligneDEtat(texte: string): HTMLParagraphElement {
  const ligne = paragraphe(texte);
  ligne.className = 'etat-lecture';
  return ligne;
}

/** Un bloquant : ses trois parties restent séparées jusqu'à l'écran. */
function blocBloquant(constat: Constat): HTMLDivElement {
  const bloc = document.createElement('div');
  bloc.className = 'constat constat-bloquant';
  bloc.setAttribute('role', 'alert');
  const ou = paragraphe(constat.ou);
  ou.className = 'constat-ou';
  const quoi = paragraphe(constat.quoi);
  quoi.className = 'constat-quoi';
  const geste = paragraphe(constat.geste);
  geste.className = 'constat-geste';
  bloc.append(ou, quoi, geste);
  return bloc;
}

function afficherClassement(classement: Classement): void {
  if (classement.etat === 'future') {
    panneauPalettes.replaceChildren(blocBloquant(recetteFuture(classement.version)));
  } else if (classement.etat === 'illisible') {
    panneauPalettes.replaceChildren(blocBloquant(recetteIllisible(classement.refus)));
  } else if (classement.etat === 'absente') {
    panneauPalettes.replaceChildren(ligneDEtat(TEXTES.recetteAbsente));
  } else {
    panneauPalettes.replaceChildren(ligneDEtat(palettesDuFichier(classement.recette.palettes.length)));
  }
}

panneauPalettes.append(ligneDEtat(TEXTES.lectureEnCours));
app.append(enTete, travail, configuration, createResizeGrip(versSandbox));

/** Le numéro de la dernière lecture demandée : une réponse plus ancienne est écartée ([UI-08]). */
let derniereLecture = 0;

function lireLEtat(): void {
  derniereLecture += 1;
  versSandbox({ type: 'lire-etat', demande: derniereLecture });
}

onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message || message.type !== 'etat' || message.demande < derniereLecture) return;
  afficherClassement(message.classement);
};

lireLEtat();
