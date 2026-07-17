/**
 * Point d'entrée de l'interface TokenLintel.
 * Il assemble les vues et route les messages entre le DOM et le sandbox Figma.
 */
import { createHeader } from './components/Header.js';
import { createButton } from './components/Button.js';
import { createConfigurationPage } from './components/ConfigurationPage.js';
import { createLogPanel } from './components/LogPanel.js';

const app = document.getElementById('app');
app.className = 'container';

const exportPage = document.createElement('div');
exportPage.className = 'page-stack';
const configurationPage = createConfigurationPage((settings) => {
  parent.postMessage({ pluginMessage: { type: 'save-settings', settings } }, '*');
});
const configPage = configurationPage.element;

function showConfiguration() {
  exportPage.hidden = true;
  configPage.hidden = false;
  header.settingsButton.hidden = true;
  header.backButton.hidden = false;
}

function showExports() {
  configPage.hidden = true;
  exportPage.hidden = false;
  header.settingsButton.hidden = false;
  header.backButton.hidden = true;
}

const header = createHeader(
  'TokenLintel',
  'Transformez vos composants Figma en contrats exploitables.',
  showConfiguration,
  showExports,
);

const actionCard = document.createElement('section');
actionCard.className = 'card action-panel';

const actionTitle = document.createElement('div');
actionTitle.className = 'section-title';
actionTitle.textContent = 'Actions';

const exportComponentButton = createButton({
  label: 'Exporter le composant',
  variant: 'primary',
  onClick: () => requestExport('export-component'),
});

const exportTokensButton = createButton({
  label: 'Exporter les tokens',
  variant: 'secondary',
  onClick: () => requestExport('export-tokens'),
});

const statusNote = document.createElement('div');
statusNote.className = 'note';
statusNote.setAttribute('role', 'status');
statusNote.setAttribute('aria-live', 'polite');
statusNote.textContent = 'Sélectionnez un Component Set dans Figma, puis utilisez les actions ci-dessus.';

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

actionCard.append(actionTitle, exportComponentButton, exportTokensButton, statusNote);
exportPage.append(actionCard, logPanel.element);

function updateConnection(state) {
  header.connection.dataset.state = state;
  header.connection.textContent = state === 'connected'
    ? 'repository connecté'
    : state === 'checking'
      ? 'connexion…'
      : 'repository non connecté';
  configurationPage.updateConnection(state);
}

app.append(header.element, exportPage, configPage);
parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');

onmessage = (event) => {
  const message = event.data.pluginMessage;
  if (!message) return;

  if (message.type === 'settings') {
    configurationPage.acceptRemoteSettings(message.settings);
  }

  if (message.type === 'settings-validation') configurationPage.renderErrors(message.errors);
  if (message.type === 'settings-save-error') configurationPage.showSaveError();
  if (message.type === 'connection') updateConnection(message.state);
  if (message.type === 'log') logPanel.append(message.text);

  if (message.type === 'status') {
    const isLoading = message.state === 'loading';
    setBusy(isLoading);
    statusNote.dataset.state = message.state;
    statusNote.textContent = message.text;
    logPanel.append(message.text, message.state);
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
    logPanel.appendLink(`Ouvrir la PR · ${message.path}`, message.url);
  }
};

window.addEventListener('error', (event) => {
  setBusy(false);
  configurationPage.releaseSaveButton();
  statusNote.dataset.state = 'error';
  statusNote.textContent = `Erreur UI : ${event.message}`;
  logPanel.append(statusNote.textContent, 'error');
});
