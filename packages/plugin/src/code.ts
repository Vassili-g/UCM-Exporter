
/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { extractRules, hasUsableRules } from './contract/extractRules';
import handleExportComponent from './contract/exportComponent';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import handleExportTokens, { annonceDuFormat, etatDesTokensDuFichier } from './tokens/exportTokens';
import {
  cleDeDestination,
  ecrireGestionDesTokens,
  lireGestionDesTokens,
  lireInstantane,
  memeDepot,
  nomDuDepot,
  enregistrerDepot,
  reprendreLAncienneConfiguration,
  supprimerDepot,
} from './config';
import type { ConfigurationDuDepot, Instantane } from './config';
import { publishArtifact, diagnostiquerConnexion, lireAvantEcriture } from './depot';
import type { EtatDesTokens } from './depot';
import type { ArtifactKind, RepositoryLayout } from './depot';
import { ErreurDeForge } from './forges/forge';
import { forgeDe } from './forges';
import { TERMES } from './forges/termes';
import type { TermesDeForge } from './forges/termes';
import { verdictDePrevol } from './prevol';
import type { CodeVerdict } from './prevol';
import type { Annonce, PluginMessage, Provenance, UiRequest } from './messages';
import {
  etatDeConnexion,
  etatDuDepot,
  gesteApresEchecDePublication,
  refusDeDestinationChangee,
  textesDePublication,
  TOKENS_DESACTIVES,
} from './connexion';
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

/**
 * Envoie un état (chargement / succès / erreur) à l'UI, avec trace dans le journal.
 * Sans provenance, l'état ne vient d'aucune opération.
 */
function postStatus(state: 'loading' | 'success' | 'error', text: string, provenance: Partial<Provenance> = {}): void {
  versUi({ type: 'status', state, text, ...provenance });
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
function postDepot(layout: RepositoryLayout | null, config: ConfigurationDuDepot | null, tokens: boolean): void {
  const depot = config
    ? { forge: TERMES[config.forge].forge, projet: config.projet, baseBranch: config.baseBranch }
    : null;
  versUi({ type: 'depot', ...etatDuDepot(layout, depot, tokens) });
}

/** Envoie le fichier généré à l'UI pour déclencher le téléchargement local. */
function postDownload(filename: string, content: string, provenance: Partial<Provenance> = {}): void {
  versUi({ type: 'download', filename, content, ...provenance });
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

/*
 * La file du stockage de configuration.
 *
 * Le routeur traite les messages en parallèle. Chaque écriture de la
 * configuration, et chaque lecture qui prépare une analyse, une publication ou
 * `settings`, attend la fin de la tâche précédente : une lecture n'observe
 * jamais une écriture à moitié faite dans cette fenêtre. Un rejet ne bloque pas
 * la tâche suivante. Les appels réseau partent après la sortie de la file. Deux
 * fenêtres du plugin ne partagent pas cette file. La taille de la fenêtre n'y
 * passe pas : elle s'écrit à chaque geste de la poignée et ne décide d'aucune
 * destination.
 *
 * La reprise des clés du plugin à un seul dépôt ouvre la file : aucune lecture
 * de la configuration ne la précède. Un échec la laisse à la prochaine
 * ouverture.
 */
let fileDuStockage: Promise<unknown> = reprendreLAncienneConfiguration().catch(() => undefined);

function parLaFile<T>(tache: () => Promise<T>): Promise<T> {
  const resultat = fileDuStockage.then(tache);
  fileDuStockage = resultat.catch(() => undefined);
  return resultat;
}

/**
 * Génération du test de connexion. Tout test lancé l'incrémente, et une
 * mutation de la configuration aussi, avant sa première attente : un test dont
 * la génération n'est plus la dernière ne poste rien.
 */
let generationDeConnexion = 0;

/** La dernière clé de destination envoyée à l'interface dans `settings`. */
let destinationAnnoncee: string | null = null;

/**
 * Envoie les réglages publics et leur destination. Une destination qui change
 * sous une analyse en cours l'annule : son verdict décrirait l'ancienne.
 */
function annoncerReglages(instantane: Instantane): void {
  if (
    destinationDeLAnalyse !== null
    && instantane.destination !== destinationDeLAnalyse
    && !publicationEnCours
  ) {
    annulation ??= 'reglages';
  }
  destinationAnnoncee = instantane.destination;
  versUi({
    type: 'settings',
    settings: {
      destination: instantane.destination,
      tokens: instantane.tokens,
      actif: instantane.actif,
      depots: instantane.depots,
    },
  });
}

/**
 * Teste la forge de l'instantané. Le jeton reste exclusivement dans ce sandbox.
 */
async function testerConnexion({ depots, actif, validation, tokens }: Instantane, generation: number): Promise<void> {
  if (!validation.valid || !validation.config) {
    const forge = depots.find(({ id }) => id === actif)?.forge;
    postConnection('non-configure', { termes: forge ? TERMES[forge] : null });
    postDepot(null, null, tokens);
    return;
  }
  postConnection('verification');
  const diagnostic = await diagnostiquerConnexion(forgeDe(validation.config));
  if (generation !== generationDeConnexion) return;
  postConnection(diagnostic.cause, {
    statut: diagnostic.statut,
    detail: diagnostic.detail,
    termes: TERMES[validation.config.forge],
  });
  postDepot(diagnostic.layout, validation.config, tokens);
}

/**
 * Relit la configuration, l'envoie à l'interface, puis teste la forge.
 *
 * `reglages: false` n'envoie `settings` que si la destination a changé : après
 * un enregistrement refusé, le formulaire garde ainsi la saisie à corriger.
 */
async function refreshConfiguration({ reglages = true } = {}): Promise<void> {
  const generation = (generationDeConnexion += 1);
  const instantane = await parLaFile(lireInstantane);
  if (generation !== generationDeConnexion) return;
  if (reglages || instantane.destination !== destinationAnnoncee) annoncerReglages(instantane);
  await testerConnexion(instantane, generation);
}

/**
 * Aligne l'interface sur une destination relue par une opération. Un écart
 * vient d'une autre fenêtre du plugin : la pastille doit nommer le dépôt que
 * le verdict vise.
 */
function suivreLaDestination(instantane: Instantane): void {
  if (instantane.destination === destinationAnnoncee) return;
  const generation = (generationDeConnexion += 1);
  annoncerReglages(instantane);
  void testerConnexion(instantane, generation).catch(signalerEchec);
}

/** Ce qui sépare la destination d'une analyse de celle qu'un instantané désigne. */
function changementDeDestination(avant: string, { validation, destination }: Instantane) {
  if (memeDepot(avant, destination)) return 'tokens' as const;
  return { nom: validation.config ? nomDuDepot(validation.config.projet) : null };
}

/**
 * Génération de la lecture du résumé des tokens : un résumé lancé avant un
 * changement du réglage ne s'affiche pas après lui.
 */
let generationDuResume = 0;

async function resumerLesTokens(): Promise<void> {
  const generation = (generationDuResume += 1);
  const resume = await etatDesTokensDuFichier();
  if (generation === generationDuResume) versUi({ type: 'tokens', ...resume });
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
    if (operationEnCours === 'component' && !publicationEnCours) annulation ??= 'demandee';
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
  /** La clé lue au pré-vol : une publication vers une autre destination est refusée. */
  destination: string;
};

const analysesGardees = new Map<ArtifactKind, AnalyseGardee>();
let selectionCourante = figma.currentPage.selection.map((node) => node.id).join(',');
let operationEnCours: ArtifactKind | null = null;
let publicationEnCours = false;
/** La destination de l'analyse en cours, `null` hors analyse. */
let destinationDeLAnalyse: string | null = null;

/**
 * L'annulation coopérative.
 *
 * Rien ne peut interrompre un appel Figma déjà parti. La demande est donc lue
 * entre deux étapes, là où le moteur annonce la suivante : l'annulation prend
 * effet à la fin de l'étape en cours, et rien n'est publié après elle.
 * `demandee` vient du bouton ou d'un changement de sélection, `reglages` d'une
 * destination qui a changé pendant l'analyse.
 */
class ExportAnnule extends Error {}
let annulation: 'demandee' | 'reglages' | null = null;

function verifierAnnulation(): void {
  if (annulation !== null) throw new ExportAnnule();
}

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
  provenance: Provenance,
  precision: { chemin?: string | null; source?: string | null; ou?: string | null; tokens?: EtatDesTokens | null; demande?: string } = {},
): void {
  versUi({
    type: 'verdict',
    ...verdictDePrevol({ code, genre: analyse.kind, avertissements: analyse.avertissements, ...precision }),
    ...provenance,
  });
}

/**
 * Premier temps : analyser. Rien n'est écrit ici, ni sur le poste ni sur la forge.
 * L'analyse refait tout le chemin de lecture (emplacement, immobilité, collision)
 * parce qu'un pré-vol qui annoncerait « rien à changer » sans avoir vu une collision
 * d'identifiant mentirait sur le seul point qui, lui, est un vrai refus.
 *
 * La destination se lit avant le premier message : chaque résultat la porte, et
 * l'interface écarte ceux d'une destination qu'elle n'affiche plus. Relue après
 * l'extraction, une destination différente annule l'analyse.
 */
async function analyser(
  loadingText: string,
  succes: string,
  artifactKind: ArtifactKind,
  operation: number,
  handler: (annoncer: Annonce) => Promise<{
    filename: string;
    content: string;
    warningCount: number;
    warnings?: string[];
  }>,
): Promise<void> {
  if (operationEnCours !== null) return;
  operationEnCours = artifactKind;
  annulation = null;
  analysesGardees.delete(artifactKind);
  let analyseProduite: AnalyseGardee | null = null;
  // Un stockage illisible n'empêche pas l'extraction : la lecture suivante lève
  // alors, et le fichier produit est téléchargé.
  const depart = await parLaFile(lireInstantane).catch(() => null);
  const provenance: Provenance = {
    destination: depart?.destination ?? destinationAnnoncee ?? cleDeDestination(null, true),
    operation,
  };
  destinationDeLAnalyse = provenance.destination;
  try {
    if (depart) suivreLaDestination(depart);
    // Masquer la carte ne suffit pas : une demande peut précéder le réglage.
    if (artifactKind === 'tokens' && depart && !depart.tokens) {
      postStatus('error', TOKENS_DESACTIVES, provenance);
      return;
    }
    postStatus('loading', loadingText, provenance);
    const result = await handler((etape) => {
      verifierAnnulation();
      versUi({ type: 'phase', texte: etape, ...provenance });
    });
    verifierAnnulation();

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
        ...provenance,
      });
    }

    const analyse: AnalyseGardee = {
      kind: artifactKind,
      filename: result.filename,
      content: result.content,
      warnings: result.warnings ?? [],
      succes,
      avertissements: result.warningCount,
      destination: provenance.destination,
    };
    analyseProduite = analyse;

    if (artifactKind === 'tokens') {
      const annonce = annonceDuFormat(result.content);
      if (annonce) versUi({ type: 'format-tokens', texte: annonce });
    }

    const instantane = await parLaFile(lireInstantane);
    if (instantane.destination !== provenance.destination) annulation ??= 'reglages';
    verifierAnnulation();
    suivreLaDestination(instantane);
    const { validation } = instantane;
    if (!validation.valid || !validation.config) {
      analysesGardees.set(artifactKind, analyse);
      postVerdict(analyse, 'sans-depot', provenance);
      return;
    }

    versUi({ type: 'phase', texte: 'Lecture du repository…', ...provenance });
    const forge = forgeDe(validation.config);
    // Gestion des tokens désactivée, l'analyse ne lit pas l'état des tokens du
    // dépôt et le verdict ne porte aucune consigne à leur sujet.
    const lecture = await lireAvantEcriture(forge, artefactDe(analyse), { avecTokens: instantane.tokens });
    verifierAnnulation();

    if (lecture.refus) {
      postStatus('error', lecture.refus, provenance);
      return;
    }
    if (lecture.jumeau) {
      // Le message indique où le contenu identique se trouve déjà.
      if (lecture.jumeau.url) {
        versUi({
          type: 'demande',
          url: lecture.jumeau.url,
          libelle: textesDePublication(forge.termes).lienVers(lecture.path),
          ...provenance,
        });
      }
      postVerdict(analyse, 'identique', provenance, { ou: lecture.jumeau.ou });
      return;
    }

    analysesGardees.set(artifactKind, analyse);
    postVerdict(analyse, 'a-publier', provenance, {
      chemin: lecture.path,
      source: lecture.layout.source,
      tokens: lecture.tokens,
      demande: forge.termes.demande,
    });
  } catch (error) {
    if (error instanceof ExportAnnule || annulation !== null) {
      analysesGardees.delete(artifactKind);
      await annoncerLAnnulation(provenance);
      return;
    }
    if (analyseProduite) postDownload(analyseProduite.filename, analyseProduite.content, provenance);
    const message = error instanceof Error ? error.message : 'Erreur inconnue pendant l’export.';
    postStatus('error', message, provenance);
    figma.notify(message, { error: true });
  } finally {
    operationEnCours = null;
    destinationDeLAnalyse = null;
  }
}

/**
 * Dit pourquoi une analyse s'est arrêtée. Une annulation par les réglages est
 * écrite sous la destination nouvelle : l'interface a vidé ses cartes pour
 * elle, et le texte doit y rester.
 */
async function annoncerLAnnulation(provenance: Provenance): Promise<void> {
  if (annulation !== 'reglages') {
    postStatus('error', "Export annulé. Rien n'a été écrit.", provenance);
    return;
  }
  const actuel = await parLaFile(lireInstantane).catch(() => null);
  if (actuel) suivreLaDestination(actuel);
  postStatus(
    'error',
    'Analyse annulée : les réglages du plugin ont changé. Relancez l’analyse.',
    { destination: actuel?.destination ?? provenance.destination, operation: provenance.operation },
  );
}

/**
 * Second temps : publier ce que l'analyse a produit.
 *
 * `publishArtifact` refait la lecture du repository de son côté : l'analyse
 * informe, elle ne fait pas autorité. Entre les deux, quelqu'un a pu fusionner
 * ou ouvrir une branche.
 *
 * La publication garde la destination qu'elle a lue à son départ. Ses
 * résultats la portent : après une bascule, l'interface les écarte et se libère.
 */
async function publier(genre: ArtifactKind, operation: number): Promise<void> {
  if (operationEnCours !== null) return;
  const analyse = analysesGardees.get(genre);
  if (!analyse) {
    postStatus('error', 'Aucune analyse disponible. Relancez l’analyse avant de publier.', { operation });
    return;
  }
  operationEnCours = genre;
  publicationEnCours = true;
  const provenance: Provenance = { destination: analyse.destination, operation };
  let termes: TermesDeForge | null = null;
  try {
    const instantane = await parLaFile(lireInstantane);
    if (analysesGardees.get(genre) !== analyse) {
      postStatus('error', 'La sélection a changé. Analysez le composant sélectionné avant de publier.', provenance);
      return;
    }
    if (genre === 'tokens' && !instantane.tokens) {
      analysesGardees.delete(genre);
      suivreLaDestination(instantane);
      postStatus('error', TOKENS_DESACTIVES, { destination: instantane.destination, operation });
      return;
    }
    if (instantane.destination !== analyse.destination) {
      analysesGardees.delete(genre);
      suivreLaDestination(instantane);
      postStatus(
        'error',
        refusDeDestinationChangee(changementDeDestination(analyse.destination, instantane)),
        { destination: instantane.destination, operation },
      );
      return;
    }
    const { validation } = instantane;
    if (!validation.valid || !validation.config) {
      postDownload(analyse.filename, analyse.content, provenance);
      versUi({ type: 'log', text: 'Aucun repository connecté : téléchargement sur votre poste.', ...provenance });
      postStatus('success', `${analyse.succes}. Téléchargement terminé.`, provenance);
      figma.notify(`${analyse.succes}. Téléchargement terminé.`);
      return;
    }
    const forge = forgeDe(validation.config);
    termes = forge.termes;
    const textes = textesDePublication(termes);
    postStatus('loading', textes.enCours, provenance);
    const publication = await publishArtifact(forge, artefactDe(analyse));
    if (publication.status === 'unchanged') {
      // Le dépôt a bougé entre l'analyse et la publication : c'est exactement le
      // cas que la revérification existe pour attraper.
      if (publication.pullRequestUrl) {
        versUi({ type: 'demande', url: publication.pullRequestUrl, libelle: textes.lienVers(publication.path), ...provenance });
      }
      postVerdict(analyse, 'identique', provenance, { ou: publication.ou });
      postStatus('success', `Aucun changement pour ${publication.path} (${publication.ou}).`, provenance);
      figma.notify(textes.aucunChangement);
      return;
    }

    versUi({ type: 'demande', url: publication.pullRequestUrl, libelle: textes.lienVers(publication.path), ...provenance });
    // Une demande d'export est faite pour être relue tout de suite par le designer
    // qui vient de l'ouvrir : on l'amène dessus sans lui demander un clic.
    openExternal(publication.pullRequestUrl);
    // Après une bascule, la connexion affichée est celle du nouveau dépôt, que
    // son propre test décrit déjà.
    if (destinationAnnoncee === analyse.destination) await refreshConfiguration();
    postStatus('success', textes.creee(analyse.succes), provenance);
    figma.notify(textes.creee(analyse.succes));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    const statut = error instanceof ErreurDeForge ? error.status : null;
    // La réponse de la forge est un fait de publication ; le verdict dit ce que le
    // designer a entre les mains. L'analyse est gardée : la publication se
    // réessaie sans repasser par Figma, vers la même destination seulement. Sans
    // termes, l'échec précède la lecture de la configuration, et aucune forge
    // n'a été appelée.
    const textes = termes ? textesDePublication(termes) : null;
    versUi({
      type: 'log',
      text: textes ? textes.echecDansLeJournal(message) : `Échec de la publication : ${message}`,
      ...provenance,
    });
    postDownload(analyse.filename, analyse.content, provenance);
    postStatus('error', textes?.echec ?? 'Échec de la publication. Le fichier a été téléchargé sur votre poste.', provenance);
    const geste = termes
      ? gesteApresEchecDePublication(statut, termes, message)
      : 'La demande n’a pas abouti. Réessayez ; si l’erreur persiste, relancez le plugin.';
    // Un stockage illisible ne dit pas que la destination a changé.
    const destinationActuelle = await parLaFile(lireInstantane).then(
      ({ destination }) => destination,
      () => analyse.destination,
    );
    versUi({
      type: 'verdict',
      code: 'a-publier',
      texte: `Échec de la publication. ${geste}`,
      action: destinationActuelle === analyse.destination ? 'Réessayer la publication' : null,
      etat: 'error',
      ...provenance,
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
    // taille avant de partir. Le réglage des tokens se lit avant tout : désactivé,
    // les collections du fichier ne sont pas lues.
    const gestionDesTokens = await parLaFile(lireGestionDesTokens);
    await Promise.all([
      reportSelectionState(),
      refreshConfiguration(),
      gestionDesTokens ? resumerLesTokens() : null,
    ]);
    return;
  }

  if (message.type === 'gerer-tokens') {
    generationDeConnexion += 1;
    generationDuResume += 1;
    try {
      await parLaFile(() => ecrireGestionDesTokens(message.valeur));
    } catch (erreur) {
      // L'interrupteur revient à l'état conservé.
      void refreshConfiguration().catch(() => undefined);
      throw erreur;
    }
    // La destination change : `annoncerReglages` annule une analyse en cours.
    await refreshConfiguration();
    if (message.valeur) await resumerLesTokens();
    return;
  }

  if (message.type === 'save-settings') {
    // La configuration active change : un test déjà parti ne décrit plus rien.
    generationDeConnexion += 1;
    try {
      const { validation } = await parLaFile(() => enregistrerDepot(message.settings, message.id));
      versUi({ type: 'settings-validation', errors: validation.errors });
      if (!validation.valid) {
        versUi({ type: 'settings-save-error' });
        await refreshConfiguration({ reglages: false });
        return;
      }
    } catch (erreur) {
      // La configuration conservée n'a plus de test en cours : il repart.
      void refreshConfiguration({ reglages: false }).catch(() => undefined);
      throw erreur;
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

  if (message.type === 'montrer-les-calques') {
    await montrerLesCalques(message.nodeIds);
    return;
  }

  if (message.type === 'supprimer-depot') {
    generationDeConnexion += 1;
    await parLaFile(() => supprimerDepot(message.id));
    // L'entrée active retirée, aucun dépôt n'est actif : la destination change,
    // et la pastille le dit du même geste.
    await refreshConfiguration();
    return;
  }

  if (message.type === 'annuler') {
    annulation ??= 'demandee';
    return;
  }

  if (message.type === 'publier') {
    await publier(message.genre, message.operation);
    return;
  }

  if (message.type === 'analyser-composant') {
    await analyser('Analyse du composant…', 'Contrat généré', 'component', message.operation, handleExportComponent);
    return;
  }

  if (message.type === 'analyser-tokens') {
    await analyser('Lecture des variables…', 'Tokens exportés', 'tokens', message.operation, handleExportTokens);
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
