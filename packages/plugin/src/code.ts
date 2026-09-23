
/**
 * Point d'entrée du plugin (côté « sandbox » Figma).
 * Rôle : afficher l'UI, écouter ses demandes d'export, lancer le bon
 * handler et lui renvoyer le fichier produit ou l'erreur.
 */
import { oublierLIndexDuDocument } from './contract/composedComponents';
import { extractRules, hasUsableRules, MARQUEUR_A_COMPLETER } from './contract/extractRules';
import type { ExtractedRules, ReleveDeSource } from './contract/extractRules';
import handleExportComponent, { getSelectedComponent } from './contract/exportComponent';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import handleExportTokens, { annonceDuFormat, etatDesTokensDuFichier } from './tokens/exportTokens';
import {
  activerDepot,
  cleDeDestination,
  DepotsIllisibles,
  DEPOTS_ILLISIBLES,
  ecrireExportLocal,
  ecrireGestionDesTokens,
  lireGestionDesTokens,
  lireConfigurationDe,
  lireInstantane,
  memeDepot,
  nomDuDepot,
  enregistrerDepot,
  reinitialiserDepots,
  reprendreLAncienneConfiguration,
  supprimerDepot,
} from './config';
import type { ConfigurationDuDepot, Instantane } from './config';
import { publishArtifact, diagnostiquerConnexion, lireAvantEcriture } from './depot';
import type { ArtifactKind, RepositoryLayout } from './depot';
import { ErreurDeForge } from './forges/forge';
import { forgeDe } from './forges';
import { TERMES } from './forges/termes';
import type { TermesDeForge } from './forges/termes';
import { verdictDePrevol } from './prevol';
import type { CodeVerdict } from './prevol';
import {
  chercherLaSourceDansLeDocument,
  offreDeCreation,
  resoudreLesSources,
} from './template/sources';
import type { Offre } from './template/sources';
import { modeleDeRegles, restreindreAuParent } from './template/modele';
import type { ContratLu } from './template/modele';
import { extractContractPropertyModel } from './contract/parsers';
import { creerLesRegles } from './template/ecriture';
import type { Annonce, PluginMessage, Provenance, UiRequest } from './messages';
import {
  etatDeCarte,
  etatDeConnexion,
  etatDuDepot,
  gesteApresEchecDePublication,
  refusDeDestinationChangee,
  textesDePublication,
  GESTE_DEPOTS_ILLISIBLES,
  OPERATION_DEJA_EN_COURS,
  TEXTES_DE_REPLI,
  TOKENS_DESACTIVES,
} from './connexion';
import { etatDeCible, detailDeCible } from './cible';
import type { CauseConnexion, CauseDeRepli, PrecisionConnexion } from './connexion';

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

const ECHEC_GENERIQUE = 'La demande n’a pas abouti. Réessayez ; si l’erreur persiste, relancez le plugin.';

/**
 * Une panne qu'aucun message ne sait décrire.
 *
 * Le statut ne part qu'hors opération : pendant une analyse ou une publication,
 * il s'écrirait sur la carte à la place de la phase en cours, et le résultat de
 * l'opération le remplacerait aussitôt. L'opération pose son propre statut
 * d'échec dans son `catch`, avec le numéro qui va avec.
 */
function signalerEchec(): void {
  if (operationEnCours === null) postStatus('error', ECHEC_GENERIQUE);
  figma.notify(ECHEC_GENERIQUE, { error: true });
}

/**
 * Une panne survenue après le résultat d'une opération, dans un travail de fond
 * qu'elle a lancé. Elle ne s'écrit pas sur la carte : le succès d'une
 * publication y est acquis, et « la demande n'a pas abouti » par-dessus ferait
 * relancer une publication dont la demande de fusion est déjà ouverte.
 */
function notifierEchec(): void {
  figma.notify(ECHEC_GENERIQUE, { error: true });
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
function postDepot(layout: RepositoryLayout | null, cible: ConfigurationDuDepot | CauseDeRepli, tokens: boolean): void {
  versUi({ type: 'depot', ...etatDuDepot(layout, depotVise(cible), tokens) });
}

/** Le dépôt visé tel que `etatDuDepot` le lit, ou la cause du repli. */
function depotVise(cible: ConfigurationDuDepot | CauseDeRepli) {
  return typeof cible === 'string'
    ? cible
    : { forge: TERMES[cible.forge].forge, projet: cible.projet, baseBranch: cible.baseBranch };
}

/** Pourquoi un instantané ne vise aucun dépôt. */
function repliDe({ depots, exportLocal }: Instantane): CauseDeRepli {
  if (exportLocal) return 'debranche';
  return depots.length === 0 ? 'aucun-depot' : 'aucun-actif';
}

/**
 * Génération du test de chaque carte. Enregistrer ou supprimer un dépôt
 * périme le test de ce dépôt, et de lui seul : enregistrer B ne périme pas un
 * test de A.
 *
 * Aucune entrée n'en sort, pas même à la suppression de son dépôt. L'interface
 * tient la même carte des générations pour écarter un résultat plus ancien que
 * celui qu'elle affiche ; vider celle-ci seule ferait repartir de zéro un dépôt
 * réenregistré, et l'interface écarterait alors tous ses tests.
 */
const generationsDesDepots = new Map<string, number>();

function perimerLeTestDe(id: string): number {
  const generation = (generationsDesDepots.get(id) ?? 0) + 1;
  generationsDesDepots.set(id, generation);
  return generation;
}

/** Le résultat du test d'un dépôt, pour sa seule carte. */
function postDepotTeste(
  id: string,
  generation: number,
  cause: CauseConnexion,
  precision: PrecisionConnexion,
  destination: ReturnType<typeof etatDuDepot>['resume'],
): void {
  versUi({ type: 'depot-teste', id, generation, ...etatDeCarte(cause, precision), destination });
}

/**
 * Teste un dépôt qui n'est pas actif, pour sa seule carte : la pastille et la
 * destination des exports restent celles du dépôt actif.
 */
async function testerDepot(id: string): Promise<void> {
  const generation = perimerLeTestDe(id);
  const lu = await parLaFile(() => lireConfigurationDe(id));
  if (!lu || generationsDesDepots.get(id) !== generation) return;
  const termes = TERMES[lu.config.forge];
  postDepotTeste(id, generation, 'verification', { termes }, null);
  const diagnostic = await diagnostiquerConnexion(forgeDe(lu.config));
  if (generationsDesDepots.get(id) !== generation) return;
  const destination = etatDuDepot(diagnostic.layout, depotVise(lu.config), lu.tokens).resume;
  postDepotTeste(id, generation, diagnostic.cause, { statut: diagnostic.statut, detail: diagnostic.detail, termes }, destination);
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
/** Le dépôt actif du dernier `settings`. */
let actifAnnonce: string | null = null;

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
  actifAnnonce = instantane.actif;
  versUi({
    type: 'settings',
    settings: {
      destination: instantane.destination,
      tokens: instantane.tokens,
      exportLocal: instantane.exportLocal,
      actif: instantane.actif,
      depots: instantane.depots,
    },
  });
}

/**
 * Teste la forge du dépôt actif de l'instantané : la pastille, la destination
 * des exports et la carte de ce dépôt. Le jeton reste exclusivement dans ce
 * sandbox. En export local, l'instantané ne porte aucune configuration : aucun
 * test ne part.
 */
async function testerConnexion(instantane: Instantane, generation: number): Promise<void> {
  const { actif, validation, tokens } = instantane;
  if (!actif || !validation.valid || !validation.config) {
    postConnection('non-configure', { repli: repliDe(instantane) });
    postDepot(null, repliDe(instantane), tokens);
    return;
  }
  const termes = TERMES[validation.config.forge];
  const nom = nomDuDepot(validation.config.projet);
  const generationDeCarte = perimerLeTestDe(actif);
  postConnection('verification', { termes, nom });
  postDepotTeste(actif, generationDeCarte, 'verification', { termes }, null);
  const diagnostic = await diagnostiquerConnexion(forgeDe(validation.config));
  if (generation !== generationDeConnexion) return;
  const precision = { statut: diagnostic.statut, detail: diagnostic.detail, termes };
  postConnection(diagnostic.cause, { ...precision, nom });
  postDepot(diagnostic.layout, validation.config, tokens);
  if (generationsDesDepots.get(actif) === generationDeCarte) {
    const destination = etatDuDepot(diagnostic.layout, depotVise(validation.config), tokens).resume;
    postDepotTeste(actif, generationDeCarte, diagnostic.cause, precision, destination);
  }
}

/**
 * Relit la configuration, l'envoie à l'interface, puis teste la forge.
 *
 * `reglages: false` n'envoie `settings` que si la destination a changé : après
 * un enregistrement refusé, le formulaire garde ainsi la saisie à corriger.
 */
async function refreshConfiguration({ reglages = true } = {}): Promise<void> {
  const generation = (generationDeConnexion += 1);
  let instantane: Instantane;
  try {
    instantane = await parLaFile(lireInstantane);
  } catch (erreur) {
    if (!(erreur instanceof DepotsIllisibles)) throw erreur;
    if (generation === generationDeConnexion) annoncerDepotsIllisibles();
    return;
  }
  if (generation !== generationDeConnexion) return;
  if (reglages || instantane.destination !== destinationAnnoncee) annoncerReglages(instantane);
  await testerConnexion(instantane, generation);
}

/**
 * Dit que la liste des dépôts de ce poste ne se lit plus, et où la réparer.
 *
 * Sans ce message, l'erreur remontait à `signalerEchec()` : le designer lisait
 * « la demande n'a pas abouti » sur une panne qui ne vient d'aucune demande, et
 * aucun écran ne lui offrait de sortie.
 */
function annoncerDepotsIllisibles(): void {
  postConnection('depots-illisibles');
  versUi({ type: 'depots-illisibles', texte: DEPOTS_ILLISIBLES, geste: GESTE_DEPOTS_ILLISIBLES });
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
function changementDeDestination(avant: string, { validation, destination, exportLocal }: Instantane) {
  if (memeDepot(avant, destination)) return 'tokens' as const;
  if (exportLocal) return 'local' as const;
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
 * Ce que la carte dit d'un composant dont aucune règle n'est exportable.
 *
 * Deux situations s'y rejoignent, et le geste n'est pas le même : le composant
 * n'a pas de conteneur, ou il vient d'en recevoir un dont les règles attendent
 * leur texte. Une création qui vient de réussir se ferait démentir par le
 * constat de l'absence, et le designer chercherait un conteneur qu'il a sous
 * les yeux.
 */
function avertissementDesRegles(regles: ExtractedRules, nomDuComposant: string): string {
  if (regles.aRediger === 0) {
    return `Règles d’usages du composant ${nomDuComposant} manquantes. Veuillez les créer puis `
      + 'les compléter pour documenter l’intégralité de ses paramètres.';
  }
  return regles.aRediger === 1
    ? `La règle posée porte encore « ${MARQUEUR_A_COMPLETER} », donc elle n’est pas exportée. `
      + 'Rédigez-la dans Figma, puis relancez l’analyse.'
    : `Les ${regles.aRediger} règles posées portent encore « ${MARQUEUR_A_COMPLETER} », donc `
      + 'aucune n’est exportée. Rédigez-les dans Figma, puis relancez l’analyse.';
}

/**
 * L'offre de la page active, corrigée par ce que le parcours du document sait.
 *
 * Tant que le parcours court, `sans-source` reste affichée et le bouton reste
 * inactif : promettre une création que le document ne porte peut-être pas la
 * ferait échouer au clic. L'offre est reposée quand le parcours finit.
 */
function offreSelonLeDocument(offre: Offre | null): Offre | null {
  if (offre !== 'sans-source') return offre;
  // Le parcours repart quand sa source a disparu, et la carte remontre alors sa
  // recherche plutôt qu'un bouton qui échouerait au clic.
  if (oublierUneSourceDisparue()) void lancerLeParcours().catch(() => undefined);
  if (!parcoursAcheve) return offre;
  return sourceDuDocument ? 'creer' : 'document-sans-source';
}

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
  versUi({
    type: 'cible', ...etat, selectionId, detail: detailDeCible(etat.cible),
    offre: null, avertissement: null,
  });
  if (!etat.cible) return;

  const component = selection[0] as ComponentNode | ComponentSetNode;
  const rules = await extractRules(component);

  // La sélection a pu changer pendant la lecture asynchrone : on abandonne alors.
  if (token !== selectionToken) return;
  // Un variant se documente avec son component set, jamais séparément : lui
  // offrir ses propres règles poserait un second conteneur pour le même
  // composant. Un parent absent n'est pas une faute : le sandbox rend `null`
  // pour un node détaché.
  const estUnVariant = component.parent?.type === 'COMPONENT_SET';
  const offre = estUnVariant ? null : offreSelonLeDocument(offreDeCreation(rules.releve));
  const exploitables = hasUsableRules(rules);
  if (exploitables && offre === null) return;

  versUi({
    type: 'cible',
    ...etat,
    selectionId,
    detail: detailDeCible(etat.cible),
    offre,
    avertissement: exploitables ? null : avertissementDesRegles(rules, component.name),
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
let operationEnCours: ArtifactKind | 'regles' | null = null;
let publicationEnCours = false;
/** La destination de l'analyse en cours, `null` hors analyse. */
let destinationDeLAnalyse: string | null = null;

/**
 * Le parcours des sources, lancé une fois par session et partagé par tous ceux
 * qui l'attendent. `null` tant qu'il n'a pas été lancé.
 */
let parcoursDesSources: Promise<ReleveDeSource | null> | null = null;
/** Ce que le parcours a trouvé, lisible une fois `parcoursAcheve` vrai. */
let sourceDuDocument: ReleveDeSource | null = null;
let parcoursAcheve = false;
/**
 * Vrai quand un clic attend le parcours.
 *
 * La création est une opération, et le parcours se suspend pendant une
 * opération : sans cette levée, un clic qui attend le parcours attendrait une
 * reprise que son propre `operationEnCours` empêche.
 */
let parcoursReclame = false;
/** Délai entre deux tentatives de reprise du parcours suspendu. */
const PAUSE_PARCOURS_MS = 150;

/**
 * Suspend le parcours tant qu'une opération demandée par le designer court.
 *
 * Le sandbox n'a qu'un fil : une page relevée pendant une analyse la ralentit
 * d'autant, et le designer attend cette analyse.
 */
function laisserPasserLesOperations(): Promise<void> {
  if (operationEnCours === null || parcoursReclame) return Promise.resolve();
  return new Promise((resolve) => {
    const reprendre = () => {
      if (operationEnCours === null || parcoursReclame) resolve();
      else setTimeout(reprendre, PAUSE_PARCOURS_MS);
    };
    setTimeout(reprendre, PAUSE_PARCOURS_MS);
  });
}

/**
 * Lance le parcours des sources, ou rend celui qui court déjà.
 *
 * Un parcours en échec tient le document pour sans source : la carte le dira,
 * et le refus de `resoudreLesSources` reste le message qui compte au clic.
 */
function lancerLeParcours(): Promise<ReleveDeSource | null> {
  parcoursDesSources ??= chercherLaSourceDansLeDocument(laisserPasserLesOperations)
    .catch(() => null)
    .then((trouvee) => {
      sourceDuDocument = trouvee;
      parcoursAcheve = true;
      return trouvee;
    });
  return parcoursDesSources;
}

/** Vrai d'un node que Figma ne sert plus, ou qui refuse de dire s'il existe. */
function disparu(node: SceneNode | null): boolean {
  if (!node) return false;
  try {
    return node.removed;
  } catch {
    return true;
  }
}

/**
 * Oublie une source que le designer a supprimée depuis, et rend vrai quand le
 * parcours doit repartir.
 *
 * Le parcours garde un node d'une autre page pour toute la session. Sans cet
 * oubli, le bouton resterait actif sur un maître effacé, et le clic rendrait
 * au designer l'erreur brute de Figma sur un node inexistant.
 */
function oublierUneSourceDisparue(): boolean {
  if (!sourceDuDocument) return false;
  if (!disparu(sourceDuDocument.maitreLocal) && !disparu(sourceDuDocument.instanceSource)) {
    return false;
  }
  parcoursDesSources = null;
  sourceDuDocument = null;
  parcoursAcheve = false;
  return true;
}

/**
 * Le relevé complété par la source trouvée ailleurs dans le document, quand la
 * page active n'en porte aucune.
 *
 * Le conteneur vierge du relevé n'est jamais remplacé : il vit sur la page
 * active, là où le designer l'a posé, et la page distante ne fournit que les
 * maîtres.
 */
async function avecLaSourceDuDocument(releve: ReleveDeSource): Promise<ReleveDeSource> {
  if (releve.maitreLocal || releve.instanceSource) return releve;
  // Un maître supprimé depuis le parcours ferait échouer l'écriture sur une
  // erreur de Figma : le parcours repart plutôt que de le servir.
  oublierUneSourceDisparue();
  parcoursReclame = true;
  try {
    const distante = await lancerLeParcours();
    if (!distante) return releve;
    return {
      ...releve,
      maitreLocal: distante.maitreLocal,
      instanceSource: distante.instanceSource,
    };
  } finally {
    parcoursReclame = false;
  }
}

/**
 * L'annulation coopérative.
 *
 * Rien ne peut interrompre un appel Figma déjà parti. La demande est donc lue
 * entre deux étapes, là où le moteur annonce la suivante : l'annulation prend
 * effet à la fin de l'étape en cours, et rien n'est publié après elle. Le
 * designer ne la demande jamais directement : `demandee` vient d'un changement
 * de sélection, `reglages` d'une destination qui a changé pendant l'analyse.
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
  precision: Omit<Parameters<typeof verdictDePrevol>[0], 'code' | 'genre' | 'avertissements'> = {},
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
  if (operationEnCours !== null) {
    postStatus('error', OPERATION_DEJA_EN_COURS, { operation });
    return;
  }
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
      postVerdict(analyse, 'sans-depot', provenance, { repli: repliDe(instantane) });
      return;
    }

    versUi({ type: 'phase', texte: 'Lecture du dépôt…', ...provenance });
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
      nom: nomDuDepot(validation.config.projet),
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
    postStatus('error', 'Export annulé. Rien n’a été écrit.', provenance);
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
  if (operationEnCours !== null) {
    postStatus('error', OPERATION_DEJA_EN_COURS, { operation });
    return;
  }
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
      versUi({ type: 'log', text: TEXTES_DE_REPLI[repliDe(instantane)].journal, ...provenance });
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
    // Le succès est acquis dès que la forge a répondu : il se poste avant le
    // rafraîchissement, qui ne concerne plus cette opération. L'attendre tenait
    // l'interface occupée pendant tout le test de connexion, et un rejet de sa
    // lecture faisait annoncer en échec une demande de fusion déjà ouverte.
    postStatus('success', textes.creee(analyse.succes), provenance);
    figma.notify(textes.creee(analyse.succes));
    // Après une bascule, la connexion affichée est celle du nouveau dépôt, que
    // son propre test décrit déjà.
    if (destinationAnnoncee === analyse.destination) void refreshConfiguration().catch(notifierEchec);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    const statut = error instanceof ErreurDeForge ? error.status : null;
    // La réponse de la forge est un fait de publication ; le verdict dit ce que le
    // designer a entre les mains. L'analyse est gardée : la publication se
    // réessaie sans repasser par Figma, vers la même destination seulement. Sans
    // termes, l'échec précède la lecture de la configuration, et aucune forge
    // n'a été appelée.
    const textes = termes ? textesDePublication(termes) : null;
    // La dernière lecture du sandbox passe avant le statut d'échec : celui-ci
    // libère l'interface, et une demande envoyée dans cette fenêtre se heurtait
    // à `operationEnCours` sans recevoir de réponse.
    // Un stockage illisible ne dit pas que la destination a changé.
    const destinationActuelle = await parLaFile(lireInstantane).then(
      ({ destination }) => destination,
      () => analyse.destination,
    );
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

/**
 * Le seul geste du plugin qui écrive dans le document.
 *
 * Il ne lit aucun dépôt et ne publie rien : le contrat sert de modèle, jamais
 * d'artefact. Ses messages ne portent donc pas de destination, et l'interface
 * les accepte sans elle.
 *
 * L'annulation ne l'atteint pas. Elle a été écrite pour une analyse, qu'un
 * changement de sélection rend caduque ; ici, elle laisserait un conteneur à
 * moitié posé sur un geste que le designer n'a pas demandé. Le retour arrière
 * de la création, c'est Ctrl+Z, qui la défait d'un coup.
 */
/**
 * Les clés publiques que le composant sélectionné déclare lui-même. Ce qu'une
 * pièce interne lui prête s'y ajoute plus tard, à l'appel.
 *
 * Elles se lisent sur la même source et par la même fonction que la surface
 * publiée : un axe que la couche sémantique renomme porte donc ici la clé
 * publiée, et non son nom Figma.
 *
 * Figma refuse `componentPropertyDefinitions` sur un variant et renvoie à son
 * component set. Un relevé qui lève ne restreint rien, et le template pose
 * alors ce que le contrat porte.
 */
function clesDeclareesPar(
  composant: ComponentNode | ComponentSetNode,
): ReadonlySet<string> | null {
  const porteur = composant.type === 'COMPONENT' && composant.parent?.type === 'COMPONENT_SET'
    ? composant.parent
    : composant;
  try {
    const { props } = extractContractPropertyModel(porteur.componentPropertyDefinitions, []);
    return new Set(Object.keys(props));
  } catch {
    return null;
  }
}

/** Une énumération lisible : « a », « b » et « c ». */
function enumerer(mots: readonly string[]): string {
  const cites = mots.map((mot) => `« ${mot} »`);
  if (cites.length <= 1) return cites.join('');
  return `${cites.slice(0, -1).join(', ')} et ${cites[cites.length - 1]}`;
}

/** Un composant imbriqué, les propriétés qu'il porte et ses instances. */
type PorteurDeProps = {
  nom: string | null;
  /** Vrai d'une pièce interne, que Figma ne publie pas. */
  interne: boolean;
  cles: string[];
  nodeIds: string[];
};

/**
 * Vrai d'un composant que Figma ne publie pas dans la bibliothèque.
 *
 * Figma retient de la bibliothèque tout composant dont le nom commence par un
 * point ou un tiret bas, et le design system s'en sert pour ses pièces
 * internes : un wrapper de dimensions, une coquille de mise en page. Personne
 * ne peut en poser une instance seule, donc aucune n'aura jamais de contrat ni
 * de règles à elle, et ses propriétés appartiennent au composant qui l'abrite.
 *
 * Le nom, plutôt que `getPublishStatusAsync` : sur une bibliothèque jamais
 * publiée, ou sur une copie de travail, l'API dit tout le monde non publié, et
 * le vrai défaut (un composant à part entière absorbé faute de règles) passerait
 * alors sous silence.
 */
function estUnePieceInterne(nom: string): boolean {
  const premier = nom.trimStart().charAt(0);
  return premier === '.' || premier === '_';
}

/**
 * Le composant nommé dont une instance est une occurrence : son component set
 * quand elle en a un, son maître sinon.
 *
 * Le set porte le nom que le designer lit, alors que le variant porte
 * « Size=Small », et Figma refuse `componentPropertyDefinitions` sur un variant.
 */
function porteurDeLInstance(main: ComponentNode): ComponentNode | ComponentSetNode {
  return main.parent?.type === 'COMPONENT_SET' ? main.parent : main;
}

/**
 * Les propriétés que le contrat publie sans que le parent les déclare,
 * groupées par le composant imbriqué qui les déclare.
 *
 * Elles entrent dans le contrat par l'élection du wrapper, qui fusionne dans la
 * surface du parent celle d'un composant interne. Deux cas s'y présentent sous
 * la même forme, et leur porteur les sépare : une pièce interne prête ses
 * propriétés au parent pour de bon, un composant à part entière ne les prête
 * que le temps qu'il lui manque ses règles.
 *
 * La recherche ne quitte pas le composant sélectionné, et ne part que s'il y a
 * quelque chose à classer. Les clés se comparent après
 * `extractContractPropertyModel`, comme celles du parent : un axe renommé par la
 * couche sémantique porte des deux côtés sa clé publiée.
 *
 * Une propriété qu'aucun imbriqué ne revendique forme un dernier groupe sans
 * nom : la nommer quand même vaut mieux que la taire. Rien ne dit qu'elle vient
 * d'une pièce interne, donc elle reste à documenter ailleurs.
 */
async function porteursDesPropsHorsDuParent(
  composant: ComponentNode | ComponentSetNode,
  horsDuParent: readonly string[],
): Promise<PorteurDeProps[]> {
  if (horsDuParent.length === 0) return [];
  const restantes = new Set(horsDuParent);
  const parPorteur = new Map<string, { porteur: ComponentNode | ComponentSetNode; nodeIds: string[] }>();
  const instances = composant.findAll((node) => node.type === 'INSTANCE') as InstanceNode[];
  for (const instance of instances) {
    const main = await instance.getMainComponentAsync().catch(() => null);
    if (!main) continue;
    const porteur = porteurDeLInstance(main);
    const connu = parPorteur.get(porteur.id);
    if (connu) connu.nodeIds.push(instance.id);
    else parPorteur.set(porteur.id, { porteur, nodeIds: [instance.id] });
  }

  const groupes: PorteurDeProps[] = [];
  for (const { porteur, nodeIds } of parPorteur.values()) {
    if (restantes.size === 0) break;
    let declarees: string[] = [];
    try {
      const { props } = extractContractPropertyModel(porteur.componentPropertyDefinitions, []);
      declarees = Object.keys(props);
    } catch {
      continue;
    }
    const cles = declarees.filter((cle) => restantes.has(cle));
    if (cles.length === 0) continue;
    for (const cle of cles) restantes.delete(cle);
    groupes.push({ nom: porteur.name, interne: estUnePieceInterne(porteur.name), cles, nodeIds });
  }
  if (restantes.size > 0) {
    groupes.push({ nom: null, interne: false, cles: [...restantes], nodeIds: [] });
  }
  return groupes;
}

/**
 * Les points rouges des propriétés que le template ne documente pas, un par
 * composant imbriqué qui les porte.
 *
 * Seul un composant capable de porter ses propres règles arrive ici : la pièce
 * interne n'en aura jamais, et le template la documente au lieu de la signaler.
 * Les taire toutes ferait croire à un template complet, alors que le contrat
 * publié décrirait ces propriétés sans un mot d'usage.
 *
 * Un point par composant plutôt qu'une liste unique : le geste qu'il demande
 * vise un composant, et dix composants donneraient dix gestes noyés dans une
 * seule phrase.
 */
function signalerLesPropsEcartees(
  parent: string,
  ecartes: readonly PorteurDeProps[],
  provenance: Partial<Provenance>,
): void {
  for (const { nom, cles, nodeIds } of ecartes) {
    const uneSeule = cles.length === 1;
    const sujet = uneSeule ? 'Une propriété' : `${cles.length} propriétés`;
    const verbe = uneSeule ? 'n’est pas documentée' : 'ne sont pas documentées';
    const appartiennent = uneSeule ? 'Elle appartient' : 'Elles appartiennent';
    const publie = uneSeule ? 'la publie comme si elle était la sienne' : 'les publie comme si elles étaient les siennes';
    versUi({
      type: 'diagnostic',
      severite: 'danger',
      titre: `Règles de « ${parent} » : ${sujet} ${verbe}, ${enumerer(cles)}.`,
      impact: nom === null
        ? `${appartiennent} à un composant imbriqué que le plugin n’a pas su nommer, et `
          + `« ${parent} » ${publie}.`
        : `${appartiennent} à « ${nom} », qui n’a pas encore ses propres règles, et `
          + `« ${parent} » ${publie}.`,
      action: nom === null
        ? `Créez les règles du composant imbriqué qui les porte, puis relancez l’analyse de `
          + `« ${parent} ».`
        : `Créez les règles de « ${nom} », puis relancez l’analyse de « ${parent} ».`,
      ...(nodeIds.length > 0 ? { nodeIds } : {}),
      ...provenance,
    });
  }
}

async function creerRegles(operation: number): Promise<void> {
  if (operationEnCours !== null) {
    postStatus('error', OPERATION_DEJA_EN_COURS, { operation });
    return;
  }
  operationEnCours = 'regles';
  const provenance = { operation };
  const annoncer: Annonce = (etape) => versUi({ type: 'phase', texte: etape, ...provenance });
  try {
    postStatus('loading', 'Création des règles d’usage…', provenance);
    const composant = getSelectedComponent();
    annoncer('Lecture de la page…');
    const releve = await avecLaSourceDuDocument((await extractRules(composant)).releve);
    const { sources, refus } = await resoudreLesSources(releve);
    if (!sources) {
      postStatus('error', refus ?? ECHEC_GENERIQUE, provenance);
      return;
    }

    annoncer('Analyse du composant…');
    // Le contrat que le développeur recevra est ce que les règles documentent :
    // le modèle se lit dessus, jamais sur les propriétés Figma brutes, qui
    // ignorent la couche sémantique.
    const analyse = await handleExportComponent(annoncer);
    const contrat = JSON.parse(analyse.content) as ContratLu;
    const clesDuParent = clesDeclareesPar(composant);
    // Ce que le contrat publie sans que le parent le déclare vient d'un
    // composant imbriqué. Son porteur dit s'il revient au parent : une pièce
    // interne lui prête ses propriétés pour de bon, un composant à part entière
    // reprendra les siennes dès qu'il aura ses règles.
    const horsDuParent = clesDuParent
      ? Object.keys(contrat.props ?? {}).filter((cle) => !clesDuParent.has(cle))
      : [];
    const porteurs = await porteursDesPropsHorsDuParent(composant, horsDuParent);
    const remontees = porteurs.filter(({ interne }) => interne).flatMap(({ cles }) => cles);
    const surface = clesDuParent ? new Set([...clesDuParent, ...remontees]) : null;
    const propre = surface ? restreindreAuParent(contrat, surface) : contrat;
    const modele = modeleDeRegles(composant.name, propre);

    const resultat = await creerLesRegles(composant, modele, sources, annoncer);
    // Le conteneur posé déclare le composant comme dépendance UCM. L'index
    // gardé l'ignore encore, et `documentchange` arrive par lots.
    oublierLIndexDuDocument();
    // Le contrat suivant ne dira plus la même chose : garder l'analyse d'avant
    // ferait publier un contrat sans les règles qu'on vient de poser.
    analysesGardees.delete('component');
    figma.currentPage.selection = [composant];
    figma.viewport.scrollAndZoomIntoView([composant, resultat.conteneur]);
    postStatus(
      'success',
      `${resultat.regles} règles posées. Rédigez-les dans Figma, puis relancez l’analyse.`,
      provenance,
    );
    // Après le statut : la création a réussi, et ce point dit ce qu'elle laisse
    // au designer plutôt que ce qu'elle a raté.
    signalerLesPropsEcartees(
      composant.name,
      porteurs.filter(({ interne }) => !interne),
      provenance,
    );
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : ECHEC_GENERIQUE;
    postStatus('error', message, provenance);
    figma.notify(message, { error: true });
  } finally {
    operationEnCours = null;
    // Le bouton disparaît une fois le conteneur posé : le relevé le dit.
    await reportSelectionState();
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
    // Le parcours des sources part avant toute lecture qui peut lever, et n'est
    // pas attendu : la carte s'affiche sur le relevé de la page active, et se
    // corrige quand le parcours finit. Lancé plus bas, une lecture de réglages
    // en échec laisserait la carte chercher jusqu'à la fermeture du plugin.
    void lancerLeParcours()
      .then(() => reportSelectionState())
      .catch(signalerEchec);
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

  if (message.type === 'export-local') {
    // Un test lancé avant la bascule ne rétablit pas l'état connecté.
    generationDeConnexion += 1;
    try {
      await parLaFile(() => ecrireExportLocal(message.valeur));
    } catch (erreur) {
      // L'interrupteur revient à l'état conservé.
      void refreshConfiguration().catch(() => undefined);
      throw erreur;
    }
    // La destination change : une analyse en cours est annulée. Désactivé,
    // l'export local rend la destination au dernier dépôt actif, qui se teste.
    await refreshConfiguration();
    return;
  }

  if (message.type === 'enregistrer-depot') {
    const { requete, carte, id, settings } = message;
    if (id !== null) perimerLeTestDe(id);
    // Modifier le dépôt actif périme son test en cours ; enregistrer un autre
    // dépôt ne touche pas à la pastille.
    const actifModifie = id !== null && id === actifAnnonce;
    if (actifModifie) generationDeConnexion += 1;
    let enregistrement;
    try {
      enregistrement = await parLaFile(() => enregistrerDepot(settings, id));
    } catch {
      versUi({
        type: 'depot-enregistre', requete, carte, id,
        erreurs: { general: 'Le dépôt n’a pas été enregistré : le stockage du plugin a refusé l’écriture. Réessayez.' },
      });
      if (actifModifie) void refreshConfiguration({ reglages: false }).catch(() => undefined);
      return;
    }
    const { validation } = enregistrement;
    versUi({ type: 'depot-enregistre', requete, carte, id: enregistrement.id, erreurs: validation.errors });
    if (!validation.valid || !enregistrement.id) {
      if (actifModifie) await refreshConfiguration({ reglages: false });
      return;
    }
    // La liste change dans tous les cas. Actif, le dépôt enregistré se teste par
    // la pastille ; inactif ou en export local, pour sa seule carte, et la
    // pastille ne bouge pas.
    const instantane = await parLaFile(lireInstantane);
    if (instantane.actif === enregistrement.id && !instantane.exportLocal) {
      await refreshConfiguration();
      return;
    }
    if (instantane.destination === destinationAnnoncee) annoncerReglages(instantane);
    else suivreLaDestination(instantane);
    await testerDepot(enregistrement.id);
    return;
  }

  if (message.type === 'activer-depot') {
    generationDeConnexion += 1;
    try {
      await parLaFile(() => activerDepot(message.id));
    } finally {
      // La destination change : `annoncerReglages` annule une analyse en cours,
      // et une publication garde la destination lue à son départ. Le
      // rafraîchissement a lieu même sur un rejet : ces deux écritures ne sont
      // pas atomiques, et l'interface doit montrer ce que le stockage porte.
      await refreshConfiguration();
    }
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
    perimerLeTestDe(message.id);
    generationDeConnexion += 1;
    try {
      await parLaFile(() => supprimerDepot(message.id));
    } finally {
      // L'entrée active retirée, aucun dépôt n'est actif : la destination
      // change, et la pastille le dit du même geste. Le rafraîchissement a lieu
      // même sur un rejet, puisque le retrait de l'entrée et celui du dépôt
      // actif sont deux écritures.
      await refreshConfiguration();
    }
    return;
  }

  if (message.type === 'reinitialiser-depots') {
    generationDeConnexion += 1;
    await parLaFile(reinitialiserDepots);
    // La liste redevient lisible : `settings` repart, et l'interface retrouve
    // l'onglet Dépôts et son bouton d'ajout.
    await refreshConfiguration();
    return;
  }

  if (message.type === 'publier') {
    await publier(message.genre, message.operation);
    return;
  }

  if (message.type === 'creer-regles') {
    await creerRegles(message.operation);
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
    signalerEchec();
  }
};
