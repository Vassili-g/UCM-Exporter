
/**
 * Point d'entrée de l'interface Unified Component Exporter.
 * Il assemble les vues et route les messages entre le DOM et le sandbox Figma.
 */
import { createHeader } from './components/Header.js';
import { createConfigurationPage } from './components/ConfigurationPage.js';
import { createCarteComposant } from './components/CarteComposant.js';
import { createCarteTokens } from './components/CarteTokens.js';
import { createResizeGrip } from './components/ResizeGrip.js';

const app = document.getElementById('app');
app.className = 'container';

const exportPage = document.createElement('div');
exportPage.className = 'page-stack';

const composant = createCarteComposant({
  onAnalyser: () => demanderAnalyse(composant, 'analyser-composant'),
  onPublier: () => demanderPublication(composant),
  onAnnuler: annuler,
});

const tokens = createCarteTokens({
  onAnalyser: () => demanderAnalyse(tokens, 'analyser-tokens'),
  onPublier: () => demanderPublication(tokens),
  onAnnuler: annuler,
});

const depotRepli = document.createElement('p');
depotRepli.className = 'depot-repli';
depotRepli.hidden = true;

const configurationPage = createConfigurationPage((settings) => {
  parent.postMessage({ pluginMessage: { type: 'save-settings', settings } }, '*');
});
const configPage = configurationPage.element;

/**
 * Ce que l'en-tête annonce, par page.
 */
const PAGES = {
  export: {
    title: 'Unified Component Exporter',

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

let active = composant;

function occuper(valeur) {
  active.marquerOccupee(valeur);
  app.setAttribute('aria-busy', String(valeur));
}

function demanderAnalyse(carte, type) {
  active = carte;
  carte.reinitialiser();
  occuper(true);
  carte.ecrireNote('loading', 'Traitement en cours…');
  parent.postMessage({ pluginMessage: { type } }, '*');
}

function demanderPublication(carte) {
  active = carte;
  occuper(true);
  parent.postMessage({ pluginMessage: { type: 'publier' } }, '*');
}

function annuler() {
  parent.postMessage({ pluginMessage: { type: 'annuler' } }, '*');
}

exportPage.append(composant.element, depotRepli, tokens.element);

function updateConnection({ state, pastille, geste }) {
  header.connection.dataset.state = state;
  header.connection.textContent = pastille;
  configurationPage.updateConnection(state, geste);
}

/**
 * Le pied de page porte la version de schéma que ce bundle produit.
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

  if (message.type === 'cible') {

    composant.afficher(message);
  }

  if (message.type === 'tokens') tokens.afficher(message);

  if (message.type === 'phase') active.ecrireNote('loading', message.texte);

  if (message.type === 'verdict') {

    occuper(false);
    active.ecrireNote(message.etat, message.texte);
    const publier = active.proposerPublication(message.action);
    if (message.action) publier.focus();

    active.marquerAnalysee?.();
  }

  if (message.type === 'depot') {
    configurationPage.afficherGouvernance(message);

    depotRepli.textContent = message.repli ? message.ligne ?? '' : '';
    depotRepli.hidden = !depotRepli.textContent;
  }
  if (message.type === 'settings-validation') configurationPage.renderErrors(message.errors);
  if (message.type === 'settings-save-error') configurationPage.showSaveError();
  if (message.type === 'connection') updateConnection(message);

  if (message.type === 'log') active.compteRendu.ajouterPublication(message.text, message.level);

  if (message.type === 'diagnostic') {
    active.compteRendu.ajouterDiagnostic(message);
  }

  if (message.type === 'schema-version') {
    footer.textContent = `Schéma de contrat ${message.version}`;
    footer.hidden = false;
  }

  if (message.type === 'status') {
    occuper(message.state === 'loading');
    active.ecrireNote(message.state, message.text);
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
    active.compteRendu.ajouterPublication(
      `Fichier téléchargé : ${message.filename || 'download.json'}`,
      'success',
    );
  }

  if (message.type === 'pull-request') {
    active.compteRendu.ajouterLien(`Ouvrir la pull request de ${message.path}`, message.url);
  }
};

window.addEventListener('error', (event) => {
  occuper(false);
  configurationPage.releaseSaveButton();
  active.ecrireNote('error', `Erreur UI : ${event.message}`);
  active.compteRendu.ajouterPublication(`Erreur UI : ${event.message}`, 'error');
});
