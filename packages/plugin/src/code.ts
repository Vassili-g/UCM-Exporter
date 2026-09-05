/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { extractRules, hasUsableRules } from './contract/extractRules';
import handleExportComponent from './contract/exportComponent';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import handleExportTokens, { resumerTokensDuFichier } from './tokens/exportTokens';
import { loadGithubConfig, loadPublicSettings, saveSettings } from './config';
import type { GithubConfig, SettingsInput } from './config';
import { publishArtifact, diagnostiquerConnexion, lireAvantEcriture } from './github';
import type { ArtifactKind, RepositoryLayout } from './github';
import { verdictDePrevol } from './prevol';
import type { CodeVerdict } from './prevol';
import type { Annonce, PluginMessage, UiRequest } from './messages';
import { etatDeConnexion, etatDuDepot } from './connexion';
import { etatDeCible, detailDeCible } from './cible';
import type { CauseConnexion } from './connexion';

/** Ce qu'`etatDeConnexion` accepte en plus de la cause. */
type PrecisionConnexion = { statut?: number | null; detail?: string };
import { TAILLE_PAR_DEFAUT, lireTaille, rangerTaille, tailleValide } from './fenetre';

/*
 * La fenêtre s'ouvre à sa taille par défaut, puis reprend celle que le designer
 * lui a donnée (U1.10). L'ordre est imposé : `showUI` est synchrone et doit
 * partir tout de suite, tandis que `clientStorage` est asynchrone. Ouvrir petit
 * puis agrandir se voit ; ne pas ouvrir du tout se voit bien davantage.
 */
figma.showUI(__html__, {
  themeColors: true,
  width: TAILLE_PAR_DEFAUT.largeur,
  height: TAILLE_PAR_DEFAUT.hauteur,
});
void lireTaille().then((taille) => figma.ui.resize(taille.largeur, taille.hauteur));

/**
 * La porte unique vers l'UI.
 *
 * `figma.ui.postMessage` accepte n'importe quoi : un type de message inventé
 * ici partirait sans erreur et personne ne l'écouterait de l'autre côté. Faire
 * passer chaque envoi par cette fonction est ce qui rend la liste de
 * `messages.ts` contraignante au lieu de décorative (U0.6).
 */
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
 * décider ce que la pastille dit et quel geste elle demande (U5.2).
 */
function postConnection(cause: CauseConnexion, precision: PrecisionConnexion = {}): void {
  versUi({ type: 'connection', ...etatDeConnexion(cause, precision) });
}

/**
 * Envoie ce que le repository dit de lui-même, ou son silence (U5.1).
 *
 * Cette information n'apparaissait qu'après publication, en ligne de journal :
 * le designer apprenait alors que les deux chemins saisis dans la configuration
 * n'avaient servi à rien, parce qu'un `ucm.config.json` les remplaçait.
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

  // La cible part TOUT DE SUITE : son nom, son genre et ses variants sont
  // connus sans rien lire. L'avertissement, lui, coûte un balayage de page ;
  // l'attendre pour afficher le nom faisait patienter devant un écran vide.
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
 * Ce qu'une analyse a produit, gardé pour la publication qui la consomme.
 *
 * L'analyse n'écrit rien : elle fabrique le contrat en mémoire et lit le
 * repository. La publication reprend ce contenu, et REVÉRIFIE tout (U3.1 b).
 * Le garder ici est aussi ce qui rend une publication échouée reprenable, au
 * lieu de perdre le travail avec l'état de l'écran (U3.3).
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
 * L'annulation coopérative (U3.4).
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

/** Le verdict, unique autorité sur ce que l'analyse conclut. */
function postVerdict(code: CodeVerdict, precision: { chemin?: string | null; ou?: string | null } = {}): void {
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
 * PREMIER TEMPS : analyser. Rien n'est écrit ici, ni sur le poste ni sur
 * GitHub. L'analyse refait tout le chemin de lecture — emplacement, immobilité,
 * collision — parce qu'un pré-vol qui annoncerait « rien à changer » sans avoir
 * vu une collision d'identifiant mentirait sur le seul point qui, lui, est un
 * vrai refus (U3.1 c).
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
    infos?: string[];
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

    // Chaque avertissement porte sa NATURE (U4.1) : il demande un geste dans
    // Figma, et le compte rendu le range sous le titre qui le dit.
    for (const warning of result.warnings ?? []) {
      versUi({ type: 'diagnostic', nature: 'avertissement', texte: warning });
    }
    // Les notes disent ce que le contrat publie, pas ce qui lui manque : rien
    // n'y est à corriger, et le compteur les ignore.
    for (const info of result.infos ?? []) {
      versUi({ type: 'diagnostic', nature: 'constat', texte: info });
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
    // QUI a décidé de l'emplacement se dit, toujours (T4.1), et maintenant
    // AVANT l'écriture : un export qui atterrit ailleurs qu'attendu était
    // indétectable après coup.
    versUi({
      type: 'log',
      text: `Emplacement : ${lecture.path} (d'après ${lecture.layout.source}).`,
    });

    if (lecture.refus) {
      postStatus('error', lecture.refus);
      return;
    }
    if (lecture.jumeau) {
      // OÙ le contenu identique se trouve déjà fait partie du message (T4.5).
      if (lecture.jumeau.url) {
        versUi({ type: 'pull-request', url: lecture.jumeau.url, path: lecture.path });
      }
      postVerdict('identique', { ou: lecture.jumeau.ou });
      return;
    }

    // Le verdict EST la conclusion : il occupe la note, au rang 1, et clôt
    // l'attente. Un « Contrat généré » de plus par-dessus l'écraserait avec un
    // texte qui ne décide de rien.
    postVerdict('a-publier', { chemin: lecture.path });
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
    // La réponse de GitHub est un fait de publication ; le verdict dit ce que le
    // designer a entre les mains. L'analyse est GARDÉE : la publication se
    // réessaie sans repasser par Figma (U3.3).
    versUi({ type: 'log', text: `Échec GitHub : ${message}` });
    postDownload(analyse.filename, analyse.content);
    postStatus('error', 'Échec GitHub. Le fichier a été téléchargé sur votre poste.');
    versUi({
      type: 'verdict',
      code: 'a-publier',
      texte: `Échec de la publication. ${message}`,
      action: 'Réessayer la publication',
      etat: 'error',
    });
    figma.notify('Échec GitHub : fichier téléchargé localement.', { error: true });
  }
}

// Routeur des demandes de l'UI vers le bon handler.
figma.ui.onmessage = async (message: UiRequest) => {
  if (message.type === 'ui-ready') {
    // Figma peut servir un bundle plus ancien que celui du disque. Sans version
    // affichée, un export « sans changement » est indiscernable d'un plugin
    // périmé : on annonce d'emblée le schéma que ce code produit.
    //
    // Elle ne passe PLUS par le journal (U0.1). Le premier export appelle
    // `logPanel.clear()`, si bien que ce garde-fou disparaissait au premier
    // clic — c'est-à-dire avant le cas qu'il existe pour couvrir. L'UI la pose
    // en pied de page, où elle reste.
    versUi({ type: 'schema-version', version: CONTRACT_VERSION });
    // L'UI est prête : sélection, champs sauvegardés, test GitHub automatique,
    // et ce que l'export des tokens emporterait (U2.4). Cette dernière lecture
    // est celle qui manquait pour qu'une commande de portée FICHIER annonce sa
    // taille avant de partir.
    await Promise.all([
      reportSelectionState(),
      refreshConfiguration(),
      resumerTokensDuFichier().then((resume) => versUi({ type: 'tokens', resume })),
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
