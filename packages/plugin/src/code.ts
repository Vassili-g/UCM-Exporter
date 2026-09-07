
/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { extractRules, hasUsableRules } from './contract/extractRules';
import handleExportComponent from './contract/exportComponent';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import handleExportTokens, { etatDesTokensDuFichier } from './tokens/exportTokens';
import { loadGithubConfig, loadPublicSettings, saveSettings, supprimerPat } from './config';
import type { GithubConfig, SettingsInput } from './config';
import { GithubApiError, publishArtifact, diagnostiquerConnexion, lireAvantEcriture } from './github';
import type { ArtifactKind, RepositoryLayout } from './github';
import { verdictDePrevol } from './prevol';
import type { CodeVerdict } from './prevol';
import type { Annonce, PluginMessage, UiRequest } from './messages';
import { etatDeConnexion, etatDuDepot, gesteApresEchecDePublication } from './connexion';
import { etatDeCible, detailDeCible } from './cible';
import type { CauseConnexion } from './connexion';

/** Ce qu'`etatDeConnexion` accepte en plus de la cause. */
type PrecisionConnexion = { statut?: number | null; detail?: string };
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

/**
 * Met à jour l'indicateur de connexion toujours visible dans l'en-tête.
 *
 * Il prend une CAUSE, jamais un état d'affichage : `etatDeConnexion` est seul à
 * décider ce que la pastille dit et quel geste elle demande.
 */
function postConnection(cause: CauseConnexion, precision: PrecisionConnexion = {}): void {
  versUi({ type: 'connection', ...etatDeConnexion(cause, precision) });
}

/**
 * Envoie les chemins effectifs et leur autorité : configuration du dépôt ou
 * réglages de repli du plugin.
 */
function postDepot(layout: RepositoryLayout | null, config: GithubConfig | null): void {
  const depot = config ? { owner: config.owner, repo: config.repo, baseBranch: config.baseBranch } : null;
  versUi({ type: 'depot', ...etatDuDepot(layout, depot) });
}

/** Envoie le fichier généré à l'UI pour déclencher le téléchargement local. */
function postDownload(filename: string, content: string): void {
  versUi({ type: 'download', filename, content });
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
  versUi({ type: 'settings', settings: publicSettings });
  const validation = await loadGithubConfig();
  if (!validation.valid || !validation.config) {
    postConnection('non-configure');
    postDepot(null, null);
    return;
  }
  postConnection('verification');
  const diagnostic = await diagnostiquerConnexion(validation.config);
  postConnection(diagnostic.cause, { statut: diagnostic.statut, detail: diagnostic.detail });
  postDepot(diagnostic.layout, validation.config);
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
  const etat = etatDeCible(
    selection.map((layer) => ({
      type: layer.type,
      name: layer.name,
      variants: layer.type === 'COMPONENT_SET' ? layer.children.length : undefined,
    })),
  );

  versUi({ type: 'cible', ...etat, detail: detailDeCible(etat.cible), avertissement: null });
  if (!etat.cible) return;

  const component = selection[0] as ComponentNode | ComponentSetNode;
  const rules = await extractRules(component);

  // La sélection a pu changer pendant la lecture asynchrone : on abandonne alors.
  if (token !== selectionToken) return;
  if (hasUsableRules(rules)) return;

  versUi({
    type: 'cible',
    ...etat,
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
  if (selectionTimer !== null) clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    selectionTimer = null;
    void reportSelectionState();
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

let analyseGardee: AnalyseGardee | null = null;

/**
 * L'annulation coopérative.
 *
 * Rien ne peut interrompre un appel Figma déjà parti. Le drapeau est donc lu
 * ENTRE deux étapes, là où le moteur annonce la suivante : l'annulation prend
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
  code: CodeVerdict,
  precision: { chemin?: string | null; source?: string | null; ou?: string | null } = {},
): void {
  if (!analyseGardee) return;
  const verdict = verdictDePrevol({
    code,
    genre: analyseGardee.kind,
    avertissements: analyseGardee.avertissements,
    ...precision,
  });
  versUi({ type: 'verdict', ...verdict, etat: analyseGardee.avertissements > 0 ? 'warning' : '' });
}

/**
 * PREMIER TEMPS : analyser. Rien n'est écrit ici, ni sur le poste ni sur GitHub.
 * L'analyse refait tout le chemin de lecture — emplacement, immobilité, collision —
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
  annulationDemandee = false;
  analyseGardee = null;
  postStatus('loading', loadingText);
  try {
    const result = await handler((etape) => {
      if (annulationDemandee) throw new ExportAnnule();
      versUi({ type: 'phase', texte: etape });
    });

    const registre = result as {
      localisations?: ReadonlyMap<string, string>;
      parties?: ReadonlyMap<string, { titre: string; impact: string; action: string }>;
    };
    for (const warning of result.warnings ?? []) {
      const point = registre.parties?.get(warning);
      // Une loi impose les parties ; ce repli garde néanmoins le message lisible.
      const nodeId = registre.localisations?.get(warning);
      versUi({
        type: 'diagnostic',
        titre: point?.titre ?? warning,
        impact: point?.impact ?? '',
        action: point?.action ?? '',
        ...(nodeId ? { nodeId } : {}),
      });
    }

    analyseGardee = {
      kind: artifactKind,
      filename: result.filename,
      content: result.content,
      warnings: result.warnings ?? [],
      succes,
      avertissements: result.warningCount,
    };

    const validation = await loadGithubConfig();
    if (!validation.valid || !validation.config) {
      postVerdict('sans-depot');
      return;
    }

    versUi({ type: 'phase', texte: 'Lecture du repository…' });
    const lecture = await lireAvantEcriture(validation.config, artefactDe(analyseGardee));
    if (annulationDemandee) throw new ExportAnnule();

    if (lecture.refus) {
      postStatus('error', lecture.refus);
      return;
    }
    if (lecture.jumeau) {
      // Le message indique où le contenu identique se trouve déjà.
      if (lecture.jumeau.url) {
        versUi({ type: 'pull-request', url: lecture.jumeau.url, path: lecture.path });
      }
      postVerdict('identique', { ou: lecture.jumeau.ou });
      return;
    }

    postVerdict('a-publier', { chemin: lecture.path, source: lecture.layout.source });
  } catch (error) {
    if (error instanceof ExportAnnule) {
      analyseGardee = null;
      postStatus('error', "Export annulé. Rien n'a été écrit.");
      return;
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’export.';
    postStatus('error', message);
    figma.notify(message, { error: true });
  }
}

/**
 * SECOND TEMPS : publier ce que l'analyse a produit.
 *
 * `publishArtifact` refait la lecture du repository de son côté : l'analyse
 * informe, elle ne fait pas autorité. Entre les deux, quelqu'un a pu fusionner
 * ou ouvrir une branche.
 */
async function publier(): Promise<void> {
  const analyse = analyseGardee;
  if (!analyse) return;

  const validation = await loadGithubConfig();
  if (!validation.valid || !validation.config) {
    postDownload(analyse.filename, analyse.content);
    versUi({ type: 'log', text: 'Aucun repository connecté : téléchargement sur votre poste.' });
    postStatus('success', `${analyse.succes}. Téléchargement terminé.`);
    figma.notify(`${analyse.succes}. Téléchargement terminé.`);
    return;
  }

  postStatus('loading', 'Publication sur GitHub…');
  try {
    const publication = await publishArtifact(validation.config, artefactDe(analyse));
    if (publication.status === 'unchanged') {
      // Le dépôt a bougé entre l'analyse et la publication : c'est exactement le
      // cas que la revérification existe pour attraper.
      if (publication.pullRequestUrl) {
        versUi({ type: 'pull-request', url: publication.pullRequestUrl, path: publication.path });
      }
      postVerdict('identique', { ou: publication.ou });
      postStatus('success', `Aucun changement pour ${publication.path} (${publication.ou}).`);
      figma.notify('Aucun changement : aucune PR créée.');
      return;
    }

    versUi({ type: 'pull-request', url: publication.pullRequestUrl, path: publication.path });
    // Une PR d'export est faite pour être relue tout de suite par le designer
    // qui vient de l'ouvrir : on l'amène dessus sans lui demander un clic.
    openExternal(publication.pullRequestUrl);
    postConnection('connecte');
    postStatus('success', `${analyse.succes}. Pull request créée.`);
    figma.notify(`${analyse.succes}. Pull request créée.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur GitHub inconnue.';
    const statut = error instanceof GithubApiError ? error.status : null;
    // La réponse de GitHub est un fait de publication ; le verdict dit ce que le
    // designer a entre les mains. L'analyse est GARDÉE : la publication se
    // réessaie sans repasser par Figma.
    versUi({ type: 'log', text: `Échec GitHub : ${message}` });
    postDownload(analyse.filename, analyse.content);
    postStatus('error', 'Échec GitHub. Le fichier a été téléchargé sur votre poste.');
    versUi({
      type: 'verdict',
      code: 'a-publier',
      texte: `Échec de la publication. ${gesteApresEchecDePublication(statut)}`,
      action: 'Réessayer la publication',
      etat: 'error',
    });
    figma.notify('Échec GitHub : fichier téléchargé localement.', { error: true });
  }
}

// Routeur des demandes de l'UI vers le bon handler.
/**
 * Montre le calque dont un avertissement parle : sélection, puis cadrage.
 *
 * **Rien n'est écrit dans le document.** Une sélection et un cadrage sont un
 * état de l'ÉDITEUR, et les actions d'un plugin ne rejoignent l'historique
 * d'annulation que si `commitUndo()` est appelé — ce que ce plugin ne fait
 * jamais. La décision et ses sources sont dans `SPEC.md`.
 *
 * **Un node introuvable ne fait rien, et ne dit rien.** Le designer a pu
 * supprimer le calque, ou changer de page, entre l'export et le clic. Une
 * erreur affichée pour un clic qui n'aboutit pas coûterait plus qu'elle
 * n'apprend : le message d'origine est toujours là, avec le nom du calque.
 *
 * **La page doit être la bonne avant de sélectionner.** Un node vit sur une
 * page, et `currentPage.selection` n'accepte que des nodes de la page courante :
 * sélectionner sans basculer lèverait, sur un composant exporté depuis une
 * autre page — le cas normal quand le designer a navigué depuis.
 */
async function montrerLeCalque(nodeId: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId).catch(() => null);
  if (!node || node.removed) return;

  const page = pageDe(node);
  if (!page) return;
  if (page !== figma.currentPage) await figma.setCurrentPageAsync(page);

  const cible = node as SceneNode;
  figma.currentPage.selection = [cible];
  figma.viewport.scrollAndZoomIntoView([cible]);
}

/** La page qui porte ce node, en remontant ses parents. */
function pageDe(node: BaseNode): PageNode | null {
  let courant: BaseNode | null = node;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant?.type === 'PAGE' ? courant : null;
}

figma.ui.onmessage = async (message: UiRequest) => {
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
    // L'UI est prête : sélection, champs sauvegardés, test GitHub automatique,
    // et ce que l'export des tokens emporterait. Cette dernière lecture
    // est celle qui manquait pour qu'une commande de portée FICHIER annonce sa
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

  if (message.type === 'montrer-le-calque') {
    await montrerLeCalque(message.nodeId);
    return;
  }

  if (message.type === 'supprimer-token') {
    await supprimerPat();
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
    await publier();
    return;
  }

  if (message.type === 'analyser-composant') {
    await analyser('Analyse du composant…', 'Contrat généré', 'component', handleExportComponent);
    return;
  }

  if (message.type === 'analyser-tokens') {
    await analyser('Lecture des variables…', 'Tokens exportés', 'tokens', handleExportTokens);
  }
};
