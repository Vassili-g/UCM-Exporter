/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { extractRules, hasUsableRules } from './contract/extractRules';
import handleExportComponent from './contract/exportComponent';
import handleExportTokens from './tokens/exportTokens';

/** Messages que l'UI peut envoyer au plugin. */
type UiRequest = { type: 'export-component' | 'export-tokens' | 'ui-ready' };

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

/** Jeton anti-course : seule la dernière analyse de sélection met à jour la note. */
let selectionToken = 0;

/**
 * Analyse la sélection courante et prévient l'utilisateur AVANT toute action :
 * un Component Set sans règles ne pourra pas être exporté, on le signale tout de
 * suite en mode « warning ».
 */
async function reportSelectionState(): Promise<void> {
  const token = (selectionToken += 1);
  const selection = figma.currentPage.selection;

  if (selection.length !== 1 || selection[0].type !== 'COMPONENT_SET') {
    postNote('', 'Sélectionnez un Component Set dans Figma, puis utilisez les actions ci-dessus.');
    return;
  }

  const componentSet = selection[0];
  const rules = await extractRules(componentSet);
  // La sélection a pu changer pendant la lecture asynchrone : on abandonne alors.
  if (token !== selectionToken) return;

  if (!hasUsableRules(rules)) {
    postNote('warning', `Impossible d'exporter « ${componentSet.name} » : aucune règle d'utilisation détectée.`);
  } else {
    postNote('success', `« ${componentSet.name} » prêt à l'export.`);
  }
}

// Retour en direct : à chaque changement de sélection dans Figma.
figma.on('selectionchange', () => {
  void reportSelectionState();
});

/**
 * Exécute un export et pilote toute la communication avec l'UI :
 * statut de chargement, envoi du fichier à télécharger, bilan des
 * avertissements, et affichage d'erreur si le handler échoue.
 */
async function runExport(
  loadingText: string,
  successLabel: string,
  handler: () => Promise<{
    filename: string;
    content: string;
    warningCount: number;
    warnings?: string[];
  }>,
): Promise<void> {
  postStatus('loading', loadingText);
  try {
    const result = await handler();
    figma.ui.postMessage({
      type: 'download',
      filename: result.filename,
      content: result.content,
    });
    // On liste chaque avertissement dans le journal (ex. « composant sans règles »).
    for (const warning of result.warnings ?? []) {
      figma.ui.postMessage({ type: 'log', text: `⚠︎ ${warning}` });
    }
    const warningText = result.warningCount > 0 ? ` · ${result.warningCount} avertissement(s)` : '';
    postStatus('success', `${successLabel}${warningText}.`);
    figma.notify(`${successLabel}${warningText}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’export.';
    postStatus('error', message);
    figma.notify(message, { error: true });
  }
}

// Routeur des demandes de l'UI vers le bon handler.
figma.ui.onmessage = async (message: UiRequest) => {
  if (message.type === 'ui-ready') {
    // L'UI est prête : on lui envoie l'état de la sélection déjà en place.
    await reportSelectionState();
    return;
  }

  if (message.type === 'export-component') {
    await runExport('Analyse du Component Set…', 'Contrat généré', handleExportComponent);
    return;
  }

  if (message.type === 'export-tokens') {
    await runExport('Lecture des variables…', 'Tokens exportés', handleExportTokens);
  }
};
