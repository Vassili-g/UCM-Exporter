/**
 * Point d'entrée de l'interface Unified Component Exporter.
 * Il assemble les vues et route les messages entre le DOM et le sandbox Figma.
 */
import { createHeader } from './components/Header.js';
import { createButton } from './components/Button.js';
import { createConfigurationPage } from './components/ConfigurationPage.js';
import { createLogPanel } from './components/LogPanel.js';
import { createResizeGrip } from './components/ResizeGrip.js';

const app = document.getElementById('app');
app.className = 'container';

const exportPage = document.createElement('div');
exportPage.className = 'page-stack';
const configurationPage = createConfigurationPage((settings) => {
  parent.postMessage({ pluginMessage: { type: 'save-settings', settings } }, '*');
});
const configPage = configurationPage.element;

/**
 * Ce que l'en-tête annonce, par page (U0.3).
 *
 * Le sous-titre n'était écrit qu'une fois, à la construction de l'en-tête :
 * « Transformez vos composants Figma en contrats exploitables » restait donc
 * au-dessus d'un formulaire GitHub. Une page qui change et un titre qui ne
 * change pas, c'est le titre qui a tort.
 */
const PAGES = {
  export: {
    title: 'Unified Component Exporter',
    // Pas de sous-titre : « Transformez vos composants Figma en contrats
    // exploitables » est de la plaquette dans un outil quotidien, et il occupait
    // la place du rang 1 — le nom du composant visé (U1.2).
  },
  configuration: {
    title: 'Configuration',
    subtitle: 'Le dépôt GitHub où les exports sont déposés, et le jeton qui les y autorise.',
  },
};

function showConfiguration() {
  exportPage.hidden = true;
  configPage.hidden = false;
  header.settingsButton.hidden = true;
  header.backButton.hidden = false;
  header.setPage(PAGES.configuration);
}

function showExports() {
  configPage.hidden = true;
  exportPage.hidden = false;
  header.settingsButton.hidden = false;
  header.backButton.hidden = true;
  header.setPage(PAGES.export);
}

const header = createHeader(PAGES.export, showConfiguration, showExports);

/*
 * La seule zone qui porte une surface (U1.7) : c'est ici qu'on agit. Son titre
 * de section est parti — « Actions » au-dessus de deux boutons nomme l'évidence
 * (U1.2).
 */
const actionCard = document.createElement('section');
actionCard.className = 'action-panel';

/**
 * Les libellés disent l'ouverture du navigateur (U0.4).
 *
 * Une pull request créée est ouverte aussitôt par le sandbox (`openExternal`) :
 * trois exports d'affilée ouvrent trois onglets, sans que rien ne l'ait
 * annoncé. Ce n'est pas une préférence à ajouter — un réglage se règle une fois
 * et se relit à chaque ouverture —, c'est un libellé exact, qui ne coûte rien.
 */
const exportComponentButton = createButton({
  label: 'Exporter le composant et ouvrir la pull request',
  variant: 'primary',
  onClick: () => requestExport('export-component'),
});

const exportTokensButton = createButton({
  label: 'Exporter les tokens et ouvrir la pull request',
  variant: 'secondary',
  onClick: () => requestExport('export-tokens'),
});

const statusNote = document.createElement('div');
statusNote.className = 'note';
statusNote.setAttribute('role', 'status');
statusNote.setAttribute('aria-live', 'polite');
statusNote.textContent = 'Sélectionnez un Component ou Component Set dans Figma, puis utilisez les actions ci-dessus.';

const logPanel = createLogPanel('Prêt. Cliquez sur une action pour démarrer.');
const actionButtons = [exportComponentButton, exportTokensButton];

function setBusy(isBusy) {
  for (const button of actionButtons) button.disabled = isBusy;
  app.setAttribute('aria-busy', String(isBusy));
}

function requestExport(type) {
  setBusy(true);
  logPanel.clear();
  statusNote.dataset.state = 'loading';
  statusNote.textContent = 'Traitement en cours…';
  parent.postMessage({ pluginMessage: { type } }, '*');
}

actionCard.append(exportComponentButton, exportTokensButton, statusNote);
exportPage.append(actionCard, logPanel.element);

/**
 * L'UI n'invente plus rien de la connexion : elle place ce que le sandbox a
 * décidé (U5.2). Elle en écrivait auparavant les trois textes de son côté,
 * c'est-à-dire une seconde autorité sur un état qu'elle ne connaît pas.
 */
function updateConnection({ state, pastille, geste }) {
  header.connection.dataset.state = state;
  header.connection.textContent = pastille;
  configurationPage.updateConnection(state, geste);
}

/**
 * Le pied de page porte la version de schéma que ce bundle produit (U0.1).
 *
 * Elle était la première ligne du journal, et `requestExport` vide le journal :
 * le garde-fou contre un bundle Figma périmé disparaissait donc au PREMIER
 * clic — exactement le cas qu'il existe pour couvrir, puisqu'un export « sans
 * changement » devient alors indiscernable d'un plugin obsolète. Ici, rien ne
 * l'efface.
 *
 * Il reste caché tant que le sandbox n'a rien dit : une version inventée par
 * défaut serait pire que pas de version du tout.
 */
const footer = document.createElement('footer');
footer.className = 'app-footer';
footer.hidden = true;

app.append(header.element, exportPage, configPage, footer, createResizeGrip());
parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');

onmessage = (event) => {
  const message = event.data.pluginMessage;
  if (!message) return;

  if (message.type === 'settings') {
    configurationPage.acceptRemoteSettings(message.settings);
  }

  if (message.type === 'layout') configurationPage.afficherGouvernance(message);
  if (message.type === 'settings-validation') configurationPage.renderErrors(message.errors);
  if (message.type === 'settings-save-error') configurationPage.showSaveError();
  if (message.type === 'connection') updateConnection(message);
  // `level` est absent aujourd'hui et le journal retombe alors sur `info` ;
  // c'est U4.1 qui le renseignera à l'envoi. Le lire ici coûte un argument et
  // évite que le champ déclaré reste inerte d'un seul côté.
  if (message.type === 'log') logPanel.append(message.text, message.level);

  if (message.type === 'schema-version') {
    footer.textContent = `Schéma de contrat ${message.version}`;
    footer.hidden = false;
  }

  if (message.type === 'status') {
    const isLoading = message.state === 'loading';
    setBusy(isLoading);
    statusNote.dataset.state = message.state;
    statusNote.textContent = message.text;
    // L'état d'une action et le niveau d'une ligne de journal ne sont pas le
    // même vocabulaire : `loading` n'est pas un `LogLevel`, et la classe
    // `log-loading` qu'il produisait n'était stylée nulle part.
    logPanel.append(message.text, isLoading ? 'info' : message.state);
  }

  if (message.type === 'note') {
    statusNote.dataset.state = message.state || '';
    statusNote.textContent = message.text;
  }

  if (message.type === 'download') {
    const link = document.createElement('a');
    const blob = new Blob([message.content], { type: 'application/json' });
    link.href = URL.createObjectURL(blob);
    link.download = message.filename || 'download.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    logPanel.append(`Fichier téléchargé : ${message.filename || 'download.json'}`, 'success');
  }

  if (message.type === 'pull-request') {
    logPanel.appendLink(`Ouvrir la PR : ${message.path}`, message.url);
  }
};

window.addEventListener('error', (event) => {
  setBusy(false);
  configurationPage.releaseSaveButton();
  statusNote.dataset.state = 'error';
  statusNote.textContent = `Erreur UI : ${event.message}`;
  logPanel.append(statusNote.textContent, 'error');
});
