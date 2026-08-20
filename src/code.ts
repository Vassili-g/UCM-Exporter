/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { extractRules, hasUsableRules } from './contract/extractRules';
import handleExportComponent, { CONTRACT_VERSION } from './contract/exportComponent';
import handleExportTokens from './tokens/exportTokens';
import { loadGithubConfig, loadPublicSettings, saveSettings } from './config';
import type { SettingsInput } from './config';
import { publishArtifact, testGithubConnection } from './github';
import type { ArtifactKind } from './github';

/** Messages que l'UI peut envoyer au plugin. */
type UiRequest =
  | { type: 'export-component' | 'export-tokens' | 'ui-ready' }
  | { type: 'save-settings'; settings: SettingsInput }
  | { type: 'open-external'; url: string };

figma.showUI(__html__, { themeColors: true, width: 380, height: 500 });

/** Envoie un état (chargement / succès / erreur) à l'UI, avec trace dans le journal. */
function postStatus(state: 'loading' | 'success' | 'error', text: string): void {
  figma.ui.postMessage({ type: 'status', state, text });
}

/**
 * Met à jour la seule note d'état (sans écrire dans le journal) : sert au retour
 * en direct à la sélection. `state` vide = style neutre par défaut.
 */
function postNote(state: '' | 'warning' | 'success', text: string): void {
  figma.ui.postMessage({ type: 'note', state, text });
}

/** Met à jour l'indicateur de connexion toujours visible dans l'en-tête. */
function postConnection(state: 'checking' | 'connected' | 'disconnected'): void {
  figma.ui.postMessage({ type: 'connection', state });
}

/** Envoie le fichier généré à l'UI pour déclencher le téléchargement local. */
function postDownload(filename: string, content: string): void {
  figma.ui.postMessage({ type: 'download', filename, content });
}

/**
 * Ouvre une URL dans le navigateur par défaut. Seul le sandbox peut le faire :
 * l'iframe de l'UI est isolée, un `target="_blank"` n'y aboutit nulle part.
 * On n'ouvre que du `https://` — le sandbox ne relaie pas aveuglément ce que
 * l'iframe lui demande.
 */
function openExternal(url: string): void {
  if (url.startsWith('https://')) figma.openExternal(url);
}

/**
 * Charge les champs publics puis teste automatiquement GitHub quand la config
 * est valide. Le PAT reste exclusivement dans ce sandbox.
 */
async function refreshConfiguration(): Promise<void> {
  const publicSettings = await loadPublicSettings();
  figma.ui.postMessage({ type: 'settings', settings: publicSettings });
  const validation = await loadGithubConfig();
  if (!validation.valid || !validation.config) {
    postConnection('disconnected');
    return;
  }
  postConnection('checking');
  const connected = await testGithubConnection(validation.config);
  postConnection(connected ? 'connected' : 'disconnected');
}

/** Jeton anti-course : seule la dernière analyse de sélection met à jour la note. */
let selectionToken = 0;

/**
 * Analyse la sélection courante et prévient l'utilisateur AVANT toute action.
 * Les règles enrichissent la documentation ; elles ne conditionnent pas la capture.
 */
async function reportSelectionState(): Promise<void> {
  const token = (selectionToken += 1);
  const selection = figma.currentPage.selection;

  if (
    selection.length !== 1
    || (selection[0].type !== 'COMPONENT_SET' && selection[0].type !== 'COMPONENT')
  ) {
    postNote('', 'Sélectionnez un Component ou Component Set dans Figma, puis utilisez les actions ci-dessus.');
    return;
  }

  const component = selection[0];
  const rules = await extractRules(component);
  // La sélection a pu changer pendant la lecture asynchrone : on abandonne alors.
  if (token !== selectionToken) return;

  if (!hasUsableRules(rules)) {
    postNote(
      'warning',
      `« ${component.name} » est exportable, mais aucune règle d’usage exploitable ne documente `
        + `quand l’utiliser. Les diagnostics diront ce que le contrat sait décrire, et intent `
        + `vaudra null.`,
    );
  } else {
    postNote('success', `« ${component.name} » prêt à l'export.`);
  }
}

/** Immobilité exigée avant d'analyser une sélection. */
const SELECTION_DEBOUNCE_MS = 200;
let selectionTimer: number | null = null;

// Retour en direct : à chaque changement de sélection dans Figma — mais pas
// avant que la sélection se stabilise. Une analyse balaye TOUTE la page (pour
// trouver le conteneur de règles) puis interroge Figma une fois par instance
// trouvée. Parcourir ses variantes aux flèches lancerait autant de balayages
// concurrents, dont un seul servira : le jeton anti-course jette bien les
// résultats périmés, mais après que le travail a été payé.
figma.on('selectionchange', () => {
  if (selectionTimer !== null) clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    selectionTimer = null;
    void reportSelectionState();
  }, SELECTION_DEBOUNCE_MS);
});

/**
 * Exécute un export et pilote toute la communication avec l'UI :
 * statut de chargement, envoi du fichier à télécharger, bilan des
 * avertissements, et affichage d'erreur si le handler échoue.
 */
async function runExport(
  loadingText: string,
  successLabel: string,
  artifactKind: ArtifactKind,
  handler: () => Promise<{
    filename: string;
    content: string;
    warningCount: number;
    warnings?: string[];
    infos?: string[];
  }>,
): Promise<void> {
  postStatus('loading', loadingText);
  try {
    const result = await handler();
    // On liste chaque avertissement dans le journal (ex. « largeur de stroke non tokenisée »).
    for (const warning of result.warnings ?? []) {
      figma.ui.postMessage({ type: 'log', text: `⚠︎ ${warning}` });
    }
    // Les notes disent ce que le contrat publie, pas ce qui lui manque : elles
    // portent donc une puce neutre et ne gonflent pas le compte d'avertissements.
    for (const info of result.infos ?? []) {
      figma.ui.postMessage({ type: 'log', text: `• ${info}` });
    }
    const warningText = result.warningCount > 0
      ? ` ${result.warningCount} avertissement${result.warningCount === 1 ? '' : 's'}.`
      : '';
    const successText = `${successLabel}.${warningText}`;
    const validation = await loadGithubConfig();
    if (!validation.valid || !validation.config) {
      postDownload(result.filename, result.content);
      figma.ui.postMessage({ type: 'log', text: 'Configuration GitHub absente ou invalide : téléchargement local.' });
      postStatus('success', `${successText} Téléchargement local terminé.`);
      figma.notify(successText);
      return;
    }

    try {
      const publication = await publishArtifact(validation.config, {
        kind: artifactKind,
        filename: result.filename,
        content: result.content,
        warnings: result.warnings ?? [],
        infos: result.infos ?? [],
      });
      if (publication.status === 'unchanged') {
        const message = `Aucun changement pour ${publication.path} : aucune PR créée.`;
        figma.ui.postMessage({ type: 'log', text: message });
        postStatus('success', message);
        figma.notify('Aucun changement : aucune PR créée.');
        return;
      }

      figma.ui.postMessage({
        type: 'pull-request',
        url: publication.pullRequestUrl,
        path: publication.path,
      });
      // Une PR d'export est faite pour être relue tout de suite par le designer
      // qui vient de l'ouvrir : on l'amène dessus sans lui demander un clic.
      openExternal(publication.pullRequestUrl);
      postConnection('connected');
      postStatus('success', `${successText} Pull request créée.`);
      figma.notify(`${successText} Pull request créée.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur GitHub inconnue.';
      // Un échec de publication (conflit de branche, contenu invalide, etc.)
      // ne remet pas en cause le dernier test de connexion réussi.
      figma.ui.postMessage({ type: 'log', text: `Échec GitHub : ${message}` });
      postDownload(result.filename, result.content);
      postStatus('error', `Échec GitHub. Le fichier a été téléchargé localement : ${message}`);
      figma.notify('Échec GitHub : fichier téléchargé localement.', { error: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’export.';
    postStatus('error', message);
    figma.notify(message, { error: true });
  }
}

// Routeur des demandes de l'UI vers le bon handler.
figma.ui.onmessage = async (message: UiRequest) => {
  if (message.type === 'ui-ready') {
    // Figma peut servir un bundle plus ancien que celui du disque. Sans version
    // affichée, un export « sans changement » est indiscernable d'un plugin
    // périmé : on annonce d'emblée le schéma que ce code produit.
    figma.ui.postMessage({ type: 'log', text: `Schéma de contrat ${CONTRACT_VERSION}.` });
    // L'UI est prête : sélection, champs sauvegardés et test GitHub automatique.
    await Promise.all([reportSelectionState(), refreshConfiguration()]);
    return;
  }

  if (message.type === 'save-settings') {
    const validation = await saveSettings(message.settings);
    figma.ui.postMessage({ type: 'settings-validation', errors: validation.errors });
    if (!validation.valid) {
      figma.ui.postMessage({ type: 'settings-save-error' });
      return;
    }
    await refreshConfiguration();
    return;
  }

  if (message.type === 'open-external') {
    openExternal(message.url);
    return;
  }

  if (message.type === 'export-component') {
    await runExport('Analyse du composant…', 'Contrat généré', 'component', handleExportComponent);
    return;
  }

  if (message.type === 'export-tokens') {
    await runExport('Lecture des variables…', 'Tokens exportés', 'tokens', handleExportTokens);
  }
};
