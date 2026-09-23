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
import { createOngletPalettes } from './ongletPalettes';
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

const ongletPalettes = createOngletPalettes();
const panneauPlanche = document.createElement('div');
panneauPlanche.className = 'page-stack';

const onglets = createOnglets(TEXTES.etiquetteDesOnglets, [
  { id: 'palettes', libelle: TEXTES.ongletPalettes, panneau: ongletPalettes.element },
  { id: 'planche', libelle: TEXTES.ongletPlanche, panneau: panneauPlanche },
]);

const travail = document.createElement('div');
travail.className = 'page-stack';
travail.append(onglets.liste, ongletPalettes.element, panneauPlanche);

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

const lecture = document.createElement('p');
lecture.className = 'etat-lecture';
lecture.textContent = TEXTES.lectureEnCours;
ongletPalettes.element.append(lecture);
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
  ongletPalettes.afficher(message.classement, message.profil);
};

lireLEtat();
