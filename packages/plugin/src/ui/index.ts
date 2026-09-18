
/**
 * Point d'entrée de l'interface UCM Contract Exporter.
 * Il assemble les vues et route les messages entre le DOM et le sandbox Figma.
 */
import type { PluginMessage, Provenance } from '../messages';
import type { CarteCommandeUi } from './components/CarteCommande';
import type { PageEnTete } from './components/Header';
import { createHeader } from './components/Header';
import { createConfigurationPage } from './components/ConfigurationPage';
import type { OngletConfiguration } from './components/ConfigurationPage';
import { createCarteComposant } from './components/CarteComposant';
import { createCarteTokens } from './components/CarteTokens';
import { createResizeGrip } from './components/ResizeGrip';
import { versSandbox } from './pont';

/**
 * `index.html` déclare ce conteneur, et ce bundle n'est chargé dans aucun autre
 * document. Son absence signalerait un gabarit cassé, que le build refuse déjà
 * (`tests/buildUi.test.ts`).
 */
const app = document.getElementById('app') as HTMLElement;
app.className = 'container';

const exportPage = document.createElement('div');
exportPage.className = 'page-stack';

const composant = createCarteComposant({
  onAnalyser: () => demanderAnalyse(composant, 'analyser-composant'),
  onPublier: () => demanderPublication(composant),
});

const tokens = createCarteTokens({
  onAnalyser: () => demanderAnalyse(tokens, 'analyser-tokens'),
  onPublier: () => demanderPublication(tokens),
});

/*
 * La carte des tokens attend le réglage : l'afficher par défaut la ferait
 * apparaître puis disparaître quand la gestion des tokens est désactivée.
 */
tokens.element.hidden = true;

const depotRepli = document.createElement('p');
depotRepli.className = 'depot-repli';
depotRepli.hidden = true;

const configurationPage = createConfigurationPage();
const configPage = configurationPage.element;

/**
 * Ce que l'en-tête annonce, par page.
 */
const PAGES: Record<'export' | 'configuration', PageEnTete> = {
  export: {
    title: 'UCM Contract Exporter',

  },
  configuration: {
    title: 'Configuration',
  },
};

/**
 * Tous les états de la pastille concernent les dépôts : elle ouvre Dépôts.
 * L'engrenage rouvre le dernier onglet consulté pendant la session, Général au
 * premier clic.
 */
function showConfiguration(onglet: OngletConfiguration = configurationPage.ongletActif()) {
  configurationPage.ouvrirOnglet(onglet);
  exportPage.hidden = true;
  // Le statut de la carte du dépôt actif remplace la pastille sur cette page.
  header.connection.hidden = true;
  configPage.hidden = false;
  header.settingsButton.hidden = true;
  header.backButton.hidden = false;
  header.setPage(PAGES.configuration);
}

function showExports() {
  configPage.hidden = true;
  exportPage.hidden = false;
  header.connection.hidden = false;
  header.settingsButton.hidden = false;
  header.backButton.hidden = true;
  header.setPage(PAGES.export);
}

const header = createHeader(PAGES.export, {
  onSettings: () => showConfiguration(),
  onConnection: () => {
    showConfiguration('depots');
    configurationPage.montrerLActifEnEchec();
  },
  onBack: showExports,
});

let active: CarteCommandeUi = composant;
let occupee = false;

/** La destination du dernier `settings` reçu, `null` avant le premier. */
let destinationCourante: string | null = null;
/** Le réglage « Gérer les tokens » du dernier `settings`, `null` avant le premier. */
let gestionDesTokens: boolean | null = null;
/** Le numéro de la dernière analyse ou publication demandée. */
let operationLancee = 0;

/**
 * Un résultat s'affiche s'il vient de la dernière opération et de la
 * destination affichée. Un message sans provenance vient du routeur, hors de
 * toute opération.
 */
function resultatActuel({ destination, operation }: Partial<Provenance>): boolean {
  if (operation !== undefined && operation !== operationLancee) return false;
  return destination === undefined || destinationCourante === null || destination === destinationCourante;
}

/** La fin de la dernière opération libère l'interface, même quand son résultat est écarté. */
function finDeLOperation({ operation }: Partial<Provenance>): boolean {
  return operation === undefined || operation === operationLancee;
}

function occuper(valeur: boolean) {
  occupee = valeur;
  active.marquerOccupee(valeur);
  for (const carte of [composant, tokens]) carte.element.inert = valeur && carte !== active;
  app.setAttribute('aria-busy', String(valeur));
}

function demanderAnalyse(
  carte: CarteCommandeUi,
  type: 'analyser-composant' | 'analyser-tokens',
) {
  if (occupee) return;
  active = carte;
  carte.reinitialiser();
  occuper(true);
  carte.ecrireNote('loading', 'Traitement en cours…');
  operationLancee += 1;
  versSandbox({ type, operation: operationLancee });
}

function demanderPublication(carte: CarteCommandeUi) {
  if (occupee) return;
  active = carte;
  occuper(true);
  operationLancee += 1;
  versSandbox({ type: 'publier', genre: carte === composant ? 'component' : 'tokens', operation: operationLancee });
}

exportPage.append(composant.element, depotRepli, tokens.element);

function updateConnection({ state, pastille }: Extract<PluginMessage, { type: 'connection' }>) {
  header.connection.dataset.state = state;
  header.connection.textContent = pastille;
}

/**
 * Le pied de page porte la version de schéma que ce bundle produit.
 */
const footer = document.createElement('footer');
footer.className = 'app-footer';
footer.hidden = true;

app.append(header.element, exportPage, configPage, footer, createResizeGrip());
versSandbox({ type: 'ui-ready' });

onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) return;

  if (message.type === 'settings') {
    configurationPage.acceptRemoteSettings(message.settings);
    const { destination } = message.settings;
    // Un résultat décrit sa destination : il ne survit qu'à des réglages qui la gardent.
    if (destinationCourante !== null && destination !== destinationCourante) {
      composant.reinitialiser();
      tokens.reinitialiser();
    }
    destinationCourante = destination;
    // Réactivée, la carte revient vide : le sandbox relit les collections. Au
    // premier `settings`, le résumé a pu arriver avant lui et reste.
    if (message.settings.tokens && gestionDesTokens === false) tokens.attendreLeResume();
    gestionDesTokens = message.settings.tokens;
    tokens.element.hidden = !gestionDesTokens;
  }

  if (message.type === 'cible') {

    composant.afficher(message);
  }

  if (message.type === 'tokens') tokens.afficher(message);

  if (message.type === 'format-tokens') tokens.annoncerFormat(message.texte);

  if (message.type === 'phase' && resultatActuel(message)) active.ecrireNote('loading', message.texte);

  if (message.type === 'verdict') {
    if (finDeLOperation(message)) occuper(false);
    if (resultatActuel(message)) {
      active.ecrireNote(message.etat, message.texte);
      const publier = active.proposerPublication(message.action);
      if (message.action) publier.focus();

      if ('marquerAnalysee' in active) (active as { marquerAnalysee(): void }).marquerAnalysee();
    }
  }

  if (message.type === 'depot') {
    depotRepli.textContent = message.repli ? message.ligne ?? '' : '';
    depotRepli.hidden = !depotRepli.textContent;
  }
  if (message.type === 'depot-enregistre') configurationPage.recevoirEnregistrement(message);
  if (message.type === 'depot-teste') configurationPage.recevoirTest(message);
  if (message.type === 'connection') updateConnection(message);

  if (message.type === 'log' && resultatActuel(message)) active.compteRendu.ajouterPublication(message.text, message.level);

  if (message.type === 'diagnostic' && resultatActuel(message)) {
    active.compteRendu.ajouterDiagnostic(message);
  }

  if (message.type === 'schema-version') {
    footer.textContent = `Schéma de contrat ${message.version}`;
    footer.hidden = false;
  }

  if (message.type === 'status') {
    const actuel = resultatActuel(message);
    if (message.state === 'loading') {
      if (actuel) occuper(true);
    } else if (finDeLOperation(message)) {
      occuper(false);
    }
    if (actuel) active.ecrireNote(message.state, message.text);
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
    if (resultatActuel(message)) {
      active.compteRendu.ajouterPublication(
        `Fichier téléchargé : ${message.filename || 'download.json'}`,
        'success',
      );
    }
  }

  if (message.type === 'demande' && resultatActuel(message)) {
    active.compteRendu.ajouterLien(message.libelle, message.url);
  }
};

window.addEventListener('error', (event: ErrorEvent) => {
  occuper(false);
  configurationPage.releaseSaveButton();
  active.ecrireNote('error', `Erreur UI : ${event.message}`);
  active.compteRendu.ajouterPublication(`Erreur UI : ${event.message}`, 'error');
});
