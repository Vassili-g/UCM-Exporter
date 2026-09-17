
/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { extractRules, hasUsableRules } from './contract/extractRules';
import handleExportComponent from './contract/exportComponent';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import handleExportTokens, { annonceDuFormat, etatDesTokensDuFichier } from './tokens/exportTokens';
import { lireAdresseDuDepot, loadConfiguration, loadPublicSettings, saveSettings, supprimerPat } from './config';
import type { ConfigurationDuDepot, SettingsInput } from './config';
import { publishArtifact, diagnostiquerConnexion, lireAvantEcriture } from './depot';
import type { EtatDesTokens } from './depot';
import type { ArtifactKind, RepositoryLayout } from './depot';
import { ErreurDeForge } from './forges/forge';
import { forgeDe } from './forges';
import { TERMES } from './forges/termes';
import type { TermesDeForge } from './forges/termes';
import { verdictDePrevol } from './prevol';
import type { CodeVerdict } from './prevol';
import type { Annonce, PluginMessage, UiRequest } from './messages';
import { etatDeConnexion, etatDuDepot, gesteApresEchecDePublication, textesDePublication } from './connexion';
import { etatDeCible, detailDeCible } from './cible';
import type { CauseConnexion, PrecisionConnexion } from './connexion';

import { TAILLE_PAR_DEFAUT, lireTaille, rangerTaille, tailleValide } from './fenetre';

/*
 * La fenêtre s'ouvre à sa taille par défaut, puis reprend celle que le designer lui
 * a donnée. L'ordre est imposé : `showUI` est synchrone et doit partir tout de
 * suite, tandis que `clientStorage` est asynchrone. Ouvrir petit puis agrandir se
 * voit ; ne pas ouvrir du tout se voit bien davantage.
 */
figma.showUI(__html__, {
  themeColors: true,
  width: TAILLE_PAR_DEFAUT.largeur,
  height: TAILLE_PAR_DEFAUT.hauteur,
});
void lireTaille().then((taille) => figma.ui.resize(taille.largeur, taille.hauteur));

/** Porte typée unique vers l'UI ; aucun message sandbox ne la contourne. */
function versUi(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

/** Envoie un état (chargement / succès / erreur) à l'UI, avec trace dans le journal. */
function postStatus(state: 'loading' | 'success' | 'error', text: string): void {
  versUi({ type: 'status', state, text });
}

function signalerEchec(): void {
  const texte = 'La demande n’a pas abouti. Réessayez ; si l’erreur persiste, relancez le plugin.';
  if (operationEnCours === null) postStatus('error', texte);
  figma.notify(texte, { error: true });
}

/**
 * Met à jour l'indicateur de connexion toujours visible dans l'en-tête.
 *
 * Il prend une cause, jamais un état d'affichage : `etatDeConnexion` est seul à
 * décider ce que la pastille dit et quel geste elle demande.
 */
function postConnection(cause: CauseConnexion, precision: PrecisionConnexion = {}): void {
  versUi({ type: 'connection', ...etatDeConnexion(cause, precision) });
}

/**
 * Envoie les chemins effectifs et leur autorité : le `ucm.config.json` du
 * repository, ou les défauts du kit quand il n'en a pas.
 */
function postDepot(layout: RepositoryLayout | null, config: ConfigurationDuDepot | null): void {
  const depot = config
    ? { forge: TERMES[config.forge].forge, projet: config.projet, baseBranch: config.baseBranch }
    : null;
  versUi({ type: 'depot', ...etatDuDepot(layout, depot) });
}

/** Envoie le fichier généré à l'UI pour déclencher le téléchargement local. */
function postDownload(filename: string, content: string): void {
  versUi({ type: 'download', filename, content });
}

/**
 * Ouvre une URL dans le navigateur par défaut. Seul le sandbox peut le faire :
 * l'iframe de l'UI est isolée, un `target="_blank"` n'y aboutit nulle part.
 * On n'ouvre que du `https://`, le sandbox ne relaie pas aveuglément ce que
 * l'iframe lui demande.
 */
function openExternal(url: string): void {
  if (url.startsWith('https://')) figma.openExternal(url);
}

/**
 * Charge les champs publics puis teste automatiquement la forge quand la config
 * est valide. Le jeton reste exclusivement dans ce sandbox.
 *
 * Un jeton saisi pour l'autre forge rend la configuration invalide : aucun
 * appel ne part, et la pastille nomme cette cause.
 */
async function refreshConfiguration(): Promise<void> {
  const publicSettings = await loadPublicSettings();
  versUi({ type: 'settings', settings: publicSettings });
  const validation = await loadConfiguration();
  if (!validation.valid || !validation.config) {
    const adresse = lireAdresseDuDepot(publicSettings.repoUrl);
    postConnection(
      validation.jetonAutreForge ? 'jeton-autre-forge' : 'non-configure',
      { termes: adresse ? TERMES[adresse.forge] : null },
    );
    postDepot(null, null);
    return;
  }
  postConnection('verification');
  const diagnostic = await diagnostiquerConnexion(forgeDe(validation.config));
  postConnection(diagnostic.cause, {
    statut: diagnostic.statut,
    detail: diagnostic.detail,
    termes: TERMES[validation.config.forge],
  });
  postDepot(diagnostic.layout, validation.config);
}

/** Jeton anti-course : seule la dernière analyse de sélection met à jour la note. */
let selectionToken = 0;

/**
 * Analyse la sélection courante et prévient l'utilisateur avant toute action.
 * Les règles enrichissent la documentation ; elles ne conditionnent pas la capture.
 */
async function reportSelectionState(): Promise<void> {
  const token = (selectionToken += 1);
  const selection = figma.currentPage.selection;
  const etat = etatDeCible(
    selection.map((layer) => ({
      type: layer.type,
      name: layer.name,
      variants: layer.type === 'COMPONENT_SET' ? layer.children.length : undefined,
    })),
  );

  const selectionId = selection.map((node) => node.id).join(',');
  versUi({ type: 'cible', ...etat, selectionId, detail: detailDeCible(etat.cible), avertissement: null });
  if (!etat.cible) return;

  const component = selection[0] as ComponentNode | ComponentSetNode;
  const rules = await extractRules(component);

  // La sélection a pu changer pendant la lecture asynchrone : on abandonne alors.
  if (token !== selectionToken) return;
  if (hasUsableRules(rules)) return;

  versUi({
    type: 'cible',
    ...etat,
    selectionId,
    detail: detailDeCible(etat.cible),
    avertissement:
      `Aucune règle d’usage exploitable ne documente quand l’utiliser. Les diagnostics diront `
      + `ce que le contrat sait décrire, et intent vaudra null.`,
  });
}

/** Immobilité exigée avant d'analyser une sélection. */
const SELECTION_DEBOUNCE_MS = 200;
let selectionTimer: number | null = null;

figma.on('selectionchange', () => {
  const identite = figma.currentPage.selection.map((node) => node.id).join(',');
  if (identite !== selectionCourante) {
    selectionCourante = identite;
    selectionToken += 1;
    analysesGardees.delete('component');
    if (operationEnCours === 'component' && !publicationEnCours) annulationDemandee = true;
  }
  if (selectionTimer !== null) clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    selectionTimer = null;
    void reportSelectionState().catch(signalerEchec);
  }, SELECTION_DEBOUNCE_MS);
});

/**
 * Ce qu'une analyse a produit, gardé pour la publication qui la consomme.
 * La publication réutilise ce contenu mais revérifie le dépôt, qui a pu changer.
 * Le conserver rend aussi une publication échouée reprenable.
 */
type AnalyseGardee = {
  kind: ArtifactKind;
  filename: string;
  content: string;
  warnings: string[];
  succes: string;
  avertissements: number;
};

const analysesGardees = new Map<ArtifactKind, AnalyseGardee>();
let selectionCourante = figma.currentPage.selection.map((node) => node.id).join(',');
let operationEnCours: ArtifactKind | null = null;
let publicationEnCours = false;

/**
 * L'annulation coopérative.
 *
 * Rien ne peut interrompre un appel Figma déjà parti. Le drapeau est donc lu
 * entre deux étapes, là où le moteur annonce la suivante : l'annulation prend
 * effet à la fin de l'étape en cours, et rien n'est publié après elle.
 */
class ExportAnnule extends Error {}
let annulationDemandee = false;

/** L'artefact tel que le repository le reçoit. */
function artefactDe(analyse: AnalyseGardee) {
  return {
    kind: analyse.kind,
    filename: analyse.filename,
    content: analyse.content,
    warnings: analyse.warnings,
  };
}

function postVerdict(
  analyse: AnalyseGardee,
  code: CodeVerdict,
  precision: { chemin?: string | null; source?: string | null; ou?: string | null; tokens?: EtatDesTokens | null; demande?: string } = {},
): void {
  versUi({
    type: 'verdict',
    ...verdictDePrevol({ code, genre: analyse.kind, avertissements: analyse.avertissements, ...precision }),
  });
}

/**
 * Premier temps : analyser. Rien n'est écrit ici, ni sur le poste ni sur la forge.
 * L'analyse refait tout le chemin de lecture (emplacement, immobilité, collision)
 * parce qu'un pré-vol qui annoncerait « rien à changer » sans avoir vu une collision
 * d'identifiant mentirait sur le seul point qui, lui, est un vrai refus.
 */
async function analyser(
  loadingText: string,
  succes: string,
  artifactKind: ArtifactKind,
  handler: (annoncer: Annonce) => Promise<{
    filename: string;
    content: string;
    warningCount: number;
    warnings?: string[];
  }>,
): Promise<void> {
  if (operationEnCours !== null) return;
  operationEnCours = artifactKind;
  annulationDemandee = false;
  analysesGardees.delete(artifactKind);
  let analyseProduite: AnalyseGardee | null = null;
  postStatus('loading', loadingText);
  try {
    const result = await handler((etape) => {
      if (annulationDemandee) throw new ExportAnnule();
      versUi({ type: 'phase', texte: etape });
    });
    if (annulationDemandee) throw new ExportAnnule();

    const registre = result as {
      localisations?: ReadonlyMap<string, readonly string[]>;
      parties?: ReadonlyMap<string, { titre: string; impact: string; action: string }>;
    };
    for (const warning of result.warnings ?? []) {
      const point = registre.parties?.get(warning);
      // Une loi impose les parties ; ce repli garde néanmoins le message lisible.
      const nodeIds = registre.localisations?.get(warning);
      versUi({
        type: 'diagnostic',
        titre: point?.titre ?? warning,
        impact: point?.impact ?? '',
        action: point?.action ?? '',
        ...(nodeIds && nodeIds.length > 0 ? { nodeIds: [...nodeIds] } : {}),
      });
    }

    const analyse: AnalyseGardee = {
      kind: artifactKind,
      filename: result.filename,
      content: result.content,
      warnings: result.warnings ?? [],
      succes,
      avertissements: result.warningCount,
    };
    analyseProduite = analyse;

    if (artifactKind === 'tokens') {
      const annonce = annonceDuFormat(result.content);
      if (annonce) versUi({ type: 'format-tokens', texte: annonce });
    }

    const validation = await loadConfiguration();
    if (annulationDemandee) throw new ExportAnnule();
    if (!validation.valid || !validation.config) {
      analysesGardees.set(artifactKind, analyse);
      postVerdict(analyse, 'sans-depot');
      return;
    }

    versUi({ type: 'phase', texte: 'Lecture du repository…' });
    const forge = forgeDe(validation.config);
    const lecture = await lireAvantEcriture(forge, artefactDe(analyse), { avecTokens: true });
    if (annulationDemandee) throw new ExportAnnule();

    if (lecture.refus) {
      postStatus('error', lecture.refus);
      return;
    }
    if (lecture.jumeau) {
      // Le message indique où le contenu identique se trouve déjà.
      if (lecture.jumeau.url) {
        versUi({
          type: 'demande',
          url: lecture.jumeau.url,
          libelle: textesDePublication(forge.termes).lienVers(lecture.path),
        });
      }
      postVerdict(analyse, 'identique', { ou: lecture.jumeau.ou });
      return;
    }

    analysesGardees.set(artifactKind, analyse);
    postVerdict(analyse, 'a-publier', {
      chemin: lecture.path,
      source: lecture.layout.source,
      tokens: lecture.tokens,
      demande: forge.termes.demande,
    });
  } catch (error) {
    if (error instanceof ExportAnnule || annulationDemandee) {
      analysesGardees.delete(artifactKind);
      postStatus('error', "Export annulé. Rien n'a été écrit.");
      return;
    }
    if (analyseProduite) postDownload(analyseProduite.filename, analyseProduite.content);
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’export.';
    postStatus('error', message);
    figma.notify(message, { error: true });
  } finally {
    operationEnCours = null;
  }
}

/**
 * Second temps : publier ce que l'analyse a produit.
 *
 * `publishArtifact` refait la lecture du repository de son côté : l'analyse
 * informe, elle ne fait pas autorité. Entre les deux, quelqu'un a pu fusionner
 * ou ouvrir une branche.
 */
async function publier(genre: ArtifactKind): Promise<void> {
  if (operationEnCours !== null) return;
  const analyse = analysesGardees.get(genre);
  if (!analyse) {
    postStatus('error', 'Aucune analyse disponible. Relancez l’analyse avant de publier.');
    return;
  }
  operationEnCours = genre;
  publicationEnCours = true;
  let termes: TermesDeForge | null = null;
  try {
    const validation = await loadConfiguration();
    if (analysesGardees.get(genre) !== analyse) {
      postStatus('error', 'La sélection a changé. Analysez le composant sélectionné avant de publier.');
      return;
    }
    if (!validation.valid || !validation.config) {
      postDownload(analyse.filename, analyse.content);
      versUi({ type: 'log', text: 'Aucun repository connecté : téléchargement sur votre poste.' });
      postStatus('success', `${analyse.succes}. Téléchargement terminé.`);
      figma.notify(`${analyse.succes}. Téléchargement terminé.`);
      return;
    }
    const forge = forgeDe(validation.config);
    termes = forge.termes;
    const textes = textesDePublication(termes);
    postStatus('loading', textes.enCours);
    const publication = await publishArtifact(forge, artefactDe(analyse));
    if (publication.status === 'unchanged') {
      // Le dépôt a bougé entre l'analyse et la publication : c'est exactement le
      // cas que la revérification existe pour attraper.
      if (publication.pullRequestUrl) {
        versUi({ type: 'demande', url: publication.pullRequestUrl, libelle: textes.lienVers(publication.path) });
      }
      postVerdict(analyse, 'identique', { ou: publication.ou });
      postStatus('success', `Aucun changement pour ${publication.path} (${publication.ou}).`);
      figma.notify(textes.aucunChangement);
      return;
    }

    versUi({ type: 'demande', url: publication.pullRequestUrl, libelle: textes.lienVers(publication.path) });
    // Une demande d'export est faite pour être relue tout de suite par le designer
    // qui vient de l'ouvrir : on l'amène dessus sans lui demander un clic.
    openExternal(publication.pullRequestUrl);
    await refreshConfiguration();
    postStatus('success', textes.creee(analyse.succes));
    figma.notify(textes.creee(analyse.succes));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    const statut = error instanceof ErreurDeForge ? error.status : null;
    // La réponse de la forge est un fait de publication ; le verdict dit ce que le
    // designer a entre les mains. L'analyse est gardée : la publication se
    // réessaie sans repasser par Figma. Sans termes, l'échec précède la lecture
    // de la configuration, et aucune forge n'a été appelée.
    const textes = termes ? textesDePublication(termes) : null;
    versUi({ type: 'log', text: textes ? textes.echecDansLeJournal(message) : `Échec de la publication : ${message}` });
    postDownload(analyse.filename, analyse.content);
    postStatus('error', textes?.echec ?? 'Échec de la publication. Le fichier a été téléchargé sur votre poste.');
    const geste = termes
      ? gesteApresEchecDePublication(statut, termes, message)
      : 'La demande n’a pas abouti. Réessayez ; si l’erreur persiste, relancez le plugin.';
    versUi({
      type: 'verdict',
      code: 'a-publier',
      texte: `Échec de la publication. ${geste}`,
      action: 'Réessayer la publication',
      etat: 'error',
    });
    figma.notify(textes?.echecNotifie ?? 'Échec de la publication : fichier téléchargé localement.', { error: true });
  } finally {
    operationEnCours = null;
    publicationEnCours = false;
  }
}

// Routeur des demandes de l'UI vers le bon handler.
/**
 * Montre les calques dont un avertissement parle : sélection, puis cadrage.
 *
 * **Rien n'est écrit dans le document.** Une sélection et un cadrage sont un
 * état de l'éditeur, et les actions d'un plugin ne rejoignent l'historique
 * d'annulation que si `commitUndo()` est appelé : ce que ce plugin ne fait
 * jamais. La décision et ses sources sont dans `SPEC.md`.
 *
 * **Un node introuvable est ignoré, sans un mot.** Le designer a pu supprimer
 * un calque entre l'export et le clic, et le message d'origine est toujours là,
 * avec le nom du calque. Les calques retrouvés sont sélectionnés.
 *
 * **La page doit être la bonne avant de sélectionner.** Un node vit sur une
 * page, et `currentPage.selection` n'accepte que des nodes de la page courante :
 * sélectionner sans basculer lèverait, sur un composant exporté depuis une
 * autre page, le cas normal quand le designer a navigué depuis. Les calques
 * d'un point appartiennent au composant exporté, donc à sa page : la page est
 * celle du premier calque retrouvé, et un calque d'une autre page est écarté.
 */
async function montrerLesCalques(nodeIds: readonly string[]): Promise<void> {
  const lus = await Promise.all(
    nodeIds.map((nodeId) => figma.getNodeByIdAsync(nodeId).catch(() => null)),
  );
  const retrouves = lus.filter((node): node is BaseNode => node !== null && !node.removed);
  const page = retrouves.length > 0 ? pageDe(retrouves[0]) : null;
  if (!page) return;
  if (page !== figma.currentPage) await figma.setCurrentPageAsync(page);

  const cibles = retrouves.filter((node) => pageDe(node) === page) as SceneNode[];
  figma.currentPage.selection = cibles;
  figma.viewport.scrollAndZoomIntoView(cibles);
}

/** La page qui porte ce node, en remontant ses parents. */
function pageDe(node: BaseNode): PageNode | null {
  let courant: BaseNode | null = node;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant?.type === 'PAGE' ? courant : null;
}

async function traiterMessage(message: UiRequest): Promise<void> {
  if (message.type === 'ui-ready') {
    // Figma peut servir un bundle plus ancien que celui du disque. Sans version
    // affichée, un export « sans changement » est indiscernable d'un plugin
    // périmé : on annonce d'emblée le schéma que ce code produit.
    //
    // Elle ne passe par aucun message de compte rendu : celui-ci se vide à
    // chaque export, si bien que le garde-fou disparaîtrait au premier clic,
    // avant le cas qu'il existe pour couvrir. L'UI la pose en pied de page, où
    // elle reste.
    versUi({ type: 'schema-version', version: CONTRACT_VERSION });
    // L'UI est prête : sélection, champs sauvegardés, test de la forge automatique,
    // et ce que l'export des tokens emporterait. Cette dernière lecture
    // est celle qui manquait pour qu'une commande de portée fichier annonce sa
    // taille avant de partir.
    await Promise.all([
      reportSelectionState(),
      refreshConfiguration(),
      etatDesTokensDuFichier().then((tokens) => versUi({ type: 'tokens', ...tokens })),
    ]);
    return;
  }

  if (message.type === 'save-settings') {
    const validation = await saveSettings(message.settings);
    versUi({ type: 'settings-validation', errors: validation.errors });
    if (!validation.valid) {
      versUi({ type: 'settings-save-error' });
      return;
    }
    analysesGardees.clear();
    await refreshConfiguration();
    return;
  }

  if (message.type === 'open-external') {
    openExternal(message.url);
    return;
  }

  if (message.type === 'resize') {
    // L'UI envoie ce que le pointeur dit, sans rien borner : `tailleValide` est
    // la seule autorité sur ce qu'est une taille acceptable, et l'appliquer
    // comme la ranger passent par elle. Une borne recopiée dans l'UI serait la
    // seconde autorité au désaccord muet que ce dépôt referme partout ailleurs.
    const taille = tailleValide({ largeur: message.largeur, hauteur: message.hauteur });
    figma.ui.resize(taille.largeur, taille.hauteur);
    await rangerTaille(taille);
    return;
  }

  if (message.type === 'montrer-les-calques') {
    await montrerLesCalques(message.nodeIds);
    return;
  }

  if (message.type === 'supprimer-token') {
    await supprimerPat();
    analysesGardees.clear();
    // La configuration est rechargée : sans jeton elle n'est plus valide, et la
    // pastille le dit du même geste.
    await refreshConfiguration();
    return;
  }

  if (message.type === 'annuler') {
    annulationDemandee = true;
    return;
  }

  if (message.type === 'publier') {
    await publier(message.genre);
    return;
  }

  if (message.type === 'analyser-composant') {
    await analyser('Analyse du composant…', 'Contrat généré', 'component', handleExportComponent);
    return;
  }

  if (message.type === 'analyser-tokens') {
    await analyser('Lecture des variables…', 'Tokens exportés', 'tokens', handleExportTokens);
  }
}

figma.ui.onmessage = async (message: UiRequest) => {
  if (!message || typeof message.type !== 'string') return;
  try {
    await traiterMessage(message);
  } catch {
    if (message.type === 'save-settings') versUi({ type: 'settings-save-error' });
    signalerEchec();
  }
};
