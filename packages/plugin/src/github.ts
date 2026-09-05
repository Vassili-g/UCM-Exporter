/**
 * Client GitHub REST minimal pour déposer un artefact Unified Component Exporter dans une
 * branche dédiée puis ouvrir une PR. Aucun PAT n'est logué ni renvoyé à l'UI.
 */
import {
  NOM_CONFIGURATION,
  comparerIdentiteDeContrat,
  configurationDepuisJson,
  identiteDeContrat,
  versionDeContrat,
} from '@ucm-kit/core/format';

import type { GithubConfig } from './config';
import { decodeBase64, encodeBase64, utf8ByteLength } from './base64';
import { causeDepuisStatut } from './connexion';
import type { CauseConnexion } from './connexion';
export { decodeBase64, encodeBase64, utf8ByteLength } from './base64';

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

export type ArtifactKind = 'component' | 'tokens';

export type RepositoryArtifact = {
  kind: ArtifactKind;
  filename: string;
  content: string;
  /** Ce que l'export n'a pas pu décrire, rédigé pour le designer. */
  warnings: string[];
};

/**
 * Ce qu'une publication a fait, et pour un export immobile, OÙ le contenu
 * identique se trouve déjà.
 *
 * **Pourquoi `ou` sur `unchanged` (T4.5).** Jusqu'ici il n'y avait qu'un seul
 * endroit possible — la branche de base — et le taire ne coûtait rien. Depuis
 * que les pull requests d'export ouvertes sont comparées elles aussi, « aucun
 * changement » sans l'endroit enverrait le designer chercher sur la branche de
 * base un fichier qui n'y est pas encore. `pullRequestUrl` mène alors à la page
 * où le geste restant se fait — fusionner — et vaut `null` sur la branche de
 * base, où il n'y a précisément plus rien à faire.
 */
export type PublishResult =
  | {
    status: 'unchanged';
    path: string;
    source: LayoutSource;
    ou: string;
    pullRequestUrl: string | null;
  }
  | { status: 'created'; path: string; branch: string; pullRequestUrl: string; source: LayoutSource };

/** Qui a décidé où l'artefact s'écrit — le repo, ou les réglages du plugin. */
export type LayoutSource = typeof NOM_CONFIGURATION | 'réglages du plugin';

/**
 * Où le repository cible range ses fichiers.
 *
 * `tokens` est un CHEMIN DE FICHIER, jamais un dossier. Les réglages du plugin,
 * eux, ont toujours enregistré un dossier auquel ils ajoutaient `/tokens.json` :
 * les deux conventions ne se distinguaient pas tant que le dossier s'appelait
 * `tokens`, et c'est l'une des désynchronisations que T4.1 referme.
 */
export type RepositoryLayout = {
  components: string | null;
  tokens: string | null;
  source: LayoutSource;
};

type GithubFile = {
  type: string;
  sha: string;
  content?: string;
  encoding?: string;
};

type GithubBlob = {
  content: string;
  encoding: string;
};

/** Erreur réseau nettoyée : elle contient un statut et un message, jamais les headers. */
export class GithubApiError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'GithubApiError';
  }
}

/**
 * Le repository répond, mais il se décrit mal.
 *
 * Elle existe pour être RECONNUE (U5.1) : sans elle, un `ucm.config.json`
 * illisible et une panne de réseau arrivent tous deux avec un statut nul, et le
 * test de connexion enverrait le designer vérifier sa connexion pendant qu'un
 * développeur doit corriger un fichier.
 */
export class ErreurDeDescription extends GithubApiError {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurDeDescription';
  }
}

/** Encode chaque segment sans casser les dossiers imbriqués. */
function encodePath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

/**
 * Neutralise la seule donnée volatile d'un artefact : `meta.exportedAt`,
 * régénérée à chaque export. Sans cela, deux exports identiques côté design
 * différeraient toujours par leur horodatage et l'invariant
 * « aucun changement = aucune PR » ne tiendrait jamais pour un contrat.
 */
function withoutExportTimestamp(content: string): string {
  try {
    const parsed = JSON.parse(content) as { meta?: { exportedAt?: unknown } };
    if (parsed && typeof parsed === 'object' && parsed.meta && typeof parsed.meta === 'object') {
      delete parsed.meta.exportedAt;
    }
    return JSON.stringify(parsed);
  } catch {
    return content; // Contenu non JSON : comparé tel quel.
  }
}

/** Compare les artefacts sans fin de ligne du repo ni horodatage d'export. */
function sameContent(left: string, right: string): boolean {
  const normalize = (value: string) => withoutExportTimestamp(value.replace(/\r\n/g, '\n').trimEnd());
  return normalize(left) === normalize(right);
}

/**
 * Génère le nom de branche déterministe demandé par la spécification.
 * Le type d'artefact et les secondes évitent la collision du flux courant :
 * exporter le contrat puis les tokens dans la même minute.
 */
export function exportBranchName(kind: ArtifactKind, date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${prefixeDeBranche(kind)}${day}-${time}`;
}

/**
 * Le préfixe que porte TOUTE branche d'export, et la seule chose qui permette
 * de les reconnaître après coup.
 *
 * Il est extrait parce qu'un second lecteur en dépend : la détection de
 * collision doit retrouver les exports encore en vol (voir
 * `cheminsOccupesParUnExportEnCours`). Deux écritures du même préfixe
 * dériveraient, et la dérive serait muette — la recherche ne trouverait
 * simplement plus rien, ce qui se lit exactement comme « aucune collision ».
 */
function prefixeDeBranche(kind: ArtifactKind): string {
  return `ucm-exporter/export-${kind}-`;
}

/**
 * Ce que les réglages locaux du plugin décrivent, faute de mieux.
 *
 * C'est le repli, pas la référence : ces valeurs vivent sur la machine du
 * designer et ne savent rien du repository. Elles ne servent que lorsque celui-ci
 * ne se décrit pas lui-même.
 */
export function layoutDesReglages(config: GithubConfig): RepositoryLayout {
  return {
    components: config.componentsPath,
    // `null` est une réponse : « ces réglages ne disent pas où ranger les
    // tokens ». Depuis U5.1, les deux chemins sont un repli facultatif, et un
    // repli absent ne s'invente pas — il se dit.
    tokens: config.tokensPath ? `${config.tokensPath}/tokens.json` : null,
    source: 'réglages du plugin',
  };
}

/**
 * Où ÉCRIRE, demandé au repository lui-même.
 *
 * **C'est T4.1, et le défaut qu'elle referme était masqué par une
 * coïncidence :** les réglages du plugin rendent `src/components` et
 * `src/tokens`, ce que le repository de démonstration utilise justement. Au
 * premier repo aux conventions différentes, l'export aurait écrit à un endroit
 * que la CI ne regarde pas — et personne n'aurait rien vu : la PR s'ouvre, le
 * contrôle ne trouve aucun contrat nouveau, tout est vert.
 *
 * **Un `ucm.config.json` présent et mal formé REFUSE l'export.** Retomber en
 * silence sur les réglages écrirait le contrat ailleurs que là où son
 * propriétaire l'a demandé, et le silence est précisément ce qui rend le défaut
 * incompréhensible. C'est la même doctrine que côté CI : le fichier absent est
 * le cas nominal, le fichier fautif est une erreur.
 */
export async function repositoryLayout(config: GithubConfig): Promise<RepositoryLayout> {
  const fichier = await getRepositoryFile(config, NOM_CONFIGURATION);
  if (!fichier || fichier.type !== 'file' || !fichier.content) return layoutDesReglages(config);

  let brut: unknown;
  try {
    // Un BOM en tête ferait échouer JSON.parse, et l'éditeur qui l'a écrit ne
    // le montre pas.
    brut = JSON.parse(decodeBase64(fichier.content).replace(/^﻿/, ''));
  } catch {
    throw new ErreurDeDescription(
      `${NOM_CONFIGURATION} du repository n'est pas du JSON valide : impossible de savoir où écrire cet export. Un développeur doit corriger ce fichier.`,
    );
  }

  const { configuration, erreur } = configurationDepuisJson(brut);
  if (erreur) throw new ErreurDeDescription(`${erreur} Un développeur doit corriger ce fichier.`);

  return {
    components: configuration.components,
    tokens: configuration.tokens,
    source: NOM_CONFIGURATION,
  };
}

/*
 * Personne ne sait où écrire : ni le repository, qui ne se décrit pas, ni les
 * réglages, qui ne portent plus de chemin obligatoire depuis U5.1. Le message
 * nomme les deux gestes possibles et leur acteur, parce qu'ils n'appartiennent
 * pas à la même personne.
 */
const MANQUE_CHEMIN_COMPOSANTS =
  'Ce repository ne dit pas où ranger les contrats. Un développeur doit y ajouter un '
  + `${NOM_CONFIGURATION}. Vous pouvez aussi renseigner le chemin des composants dans la `
  + 'configuration du plugin.';

const MANQUE_CHEMIN_TOKENS =
  'Ce repository ne dit pas où ranger les tokens. Un développeur doit y ajouter un '
  + `${NOM_CONFIGURATION}. Vous pouvez aussi renseigner le chemin des tokens dans la `
  + 'configuration du plugin.';

/** Déduit le path repo sans demander de saisie par composant. */
export function artifactPath(
  artifact: RepositoryArtifact,
  layout: RepositoryLayout,
): string {
  if (artifact.kind === 'tokens') {
    if (!layout.tokens) throw new GithubApiError(MANQUE_CHEMIN_TOKENS);
    return layout.tokens;
  }
  if (!layout.components) throw new GithubApiError(MANQUE_CHEMIN_COMPOSANTS);
  const componentName = artifact.filename.replace(/\.contract\.json$/i, '');
  return `${layout.components}/${componentName}/${artifact.filename}`;
}

/**
 * Formes qu'une page GitHub relie d'elle-même : `@nom` vers un compte, `#123`
 * vers une issue. La borne de gauche est capturée faute de lookbehind dans le
 * moteur du plugin ; elle exclut l'accent grave, car ce qui est déjà du code
 * l'est.
 */
const FORMES_AUTOLIEES = /(^|[^\w`])(@[A-Za-z0-9][\w-]*|#\d+)/g;

/**
 * Rend un avertissement inerte dans la page qui l'affiche.
 *
 * Un message est écrit pour Figma et en cite les intitulés tels quels : `@icons`
 * y est le nom d'une variante de règle, que le designer doit taper dans son
 * composant. GitHub, lui, y lit une mention et ouvre le profil d'un inconnu,
 * notifié à chaque export. L'autoliaison s'applique au texte rendu et n'épargne
 * que le code : la forme ambiguë part donc en `code`, où elle se lit exactement
 * comme elle s'écrit dans Figma.
 */
function sansLienAutomatique(warning: string): string {
  return warning.replace(FORMES_AUTOLIEES, '$1`$2`');
}

/**
 * Ce que le dépôt reçoit, annoncé sur sa page de couverture : le schéma de
 * contrat que porte l'artefact déposé (T4.2), et d'où il vient (T4.4).
 *
 * **À quoi sert un numéro de schéma sur cette page.** C'est le seul champ qui
 * décide si le fichier ENTIER est lisible par ce repository : hors de la fenêtre
 * que ses lecteurs supportent, le contrat est refusé en bloc, quel que soit son
 * contenu. Or il est enfoui au milieu d'un diff de plusieurs milliers de lignes,
 * où personne ne va le chercher. Sur la couverture, celui qui décide de
 * fusionner voit quel schéma vient d'arriver sans ouvrir le JSON — et le jour où
 * le repository change de version, les pull requests d'export restées ouvertes
 * disent lesquelles ont été produites avant la bascule.
 *
 * **Le numéro est lu DANS le fichier, jamais dans `CONTRACT_VERSION`.**
 * L'artefact et la constante du plugin sont deux autorités pour la même chose ;
 * annoncer la constante ferait de ce corps de PR un énoncé sur le PLUGIN
 * déguisé en énoncé sur le FICHIER, et le lecteur croirait la couverture plutôt
 * que le contenu. C'est le défaut que T4.1, T4.3 et T3.4 ont chacune trouvé
 * ailleurs — deux autorités pour la même chose, dont le désaccord est muet.
 *
 * **L'origine Figma est là parce que T4.4 lui a retiré son raccourci.** La
 * distribution par la Community interdit `enablePrivatePluginApi`, donc
 * `figma.fileKey`, donc `meta.figma.url` : le lien d'un clic vers le composant
 * source a disparu des contrats. D6 posait la question — « la traçabilité par
 * `fileName` et `nodeId` suffit-elle réellement à une revue ? » — en précisant
 * qu'elle se constate sur une pull request réelle et pas en principe. Elle est
 * donc écrite là où la revue a lieu. Quand un contrat porte encore une URL — un
 * export antérieur, ou un plugin chargé en développement dans une organisation
 * —, elle est rendue en lien : le champ décide, pas la distribution supposée.
 *
 * **Les intitulés Figma passent par `sansLienAutomatique`**, pour la raison qui
 * l'a fait naître : un composant nommé `@icons` ouvrirait le profil d'un
 * inconnu, notifié à chaque export. La règle vaut pour l'en-tête comme pour la
 * liste, et un second traitement du même risque aurait fini par diverger.
 *
 * **`tokens.json` ne reçoit ni l'une ni l'autre, et ce n'est pas un oubli.**
 * C'est un arbre DTCG, pas un contrat : il ne porte aucun schéma UCM, et il
 * n'est le portrait d'aucun composant — ses variables viennent du fichier
 * entier.
 *
 * **Un contrat sans version lisible le dit.** Le plugin en écrit toujours une,
 * donc ce cas ne vient pas de lui ; il vient d'un artefact produit ailleurs, et
 * le contrôle du repository le refusera alors pour champ absent — un verdict
 * dont la cause se lit ici en une ligne au lieu de se chercher dans le rapport.
 * Ce n'est pas un cri de loup : la ligne ne s'écrit que dans un cas réellement
 * fautif. L'origine, elle, s'omet quand elle est illisible : le défaut est déjà
 * nommé une fois au-dessus, et le redire deux fois n'apprend rien.
 *
 * **Pourquoi ceci n'est pas une note au sens de la règle voisine.** Une note est
 * un CONSTAT sur le contenu, dont la conclusion est « rien à faire », et
 * l'admettre dans la liste apprendrait au designer que cette liste se survole.
 * Ni le schéma ni l'origine ne sont des constats : ce sont l'IDENTITÉ de ce qui
 * est déposé, au même titre que le chemin du fichier juste au-dessus. Ils
 * vivent donc dans l'en-tête, et la liste des gestes à faire reste intacte.
 */
function lignesDIdentite(artifact: RepositoryArtifact): string[] {
  if (artifact.kind !== 'component') return [];

  let contrat: unknown;
  try {
    contrat = JSON.parse(artifact.content);
  } catch {
    // Un artefact illisible n'a ni version ni origine : le dire est exactement
    // ce que les deux branches ci-dessous écrivent, et lever ici ferait échouer
    // un export pour une ligne de couverture.
    contrat = null;
  }

  const version = versionDeContrat(contrat);
  const origine = identiteDeContrat(contrat);
  const lignes = [
    version === null
      ? 'Schéma de contrat : absent du fichier — le contrôle du repository refusera ce contrat.'
      : `Schéma de contrat : \`${version}\``,
  ];

  // `nodeId` est ce qui retrouve le composant ; sans lui, la ligne ne
  // tracerait rien et se contenterait d'occuper la page.
  if (origine.nodeId === null) return lignes;

  const nom = origine.nom === null ? 'Composant' : `« ${sansLienAutomatique(origine.nom)} »`;
  const designation = origine.url === null ? nom : `[${nom}](${origine.url})`;
  const fichier = origine.fileName === null
    ? ''
    : `fichier « ${sansLienAutomatique(origine.fileName)} », `;
  lignes.push(`Composant Figma : ${designation} — ${fichier}nœud \`${origine.nodeId}\``);
  return lignes;
}

/**
 * Corps de la pull request ouverte pour un export.
 *
 * Les avertissements y figurent parce que c'est la page que le plugin ouvre
 * juste après l'export : celui qui produit le constat l'écrit là où son
 * destinataire arrive. Un contrat n'a donc pas à être ouvert pour être relu, et
 * `tokens.json`, qui n'a aucun champ où les transporter, est couvert de la même
 * façon que les contrats.
 *
 * Une seule liste, et une règle qui la borne : n'arrive ici que ce qui nomme un
 * geste à faire dans Figma. Le canal `infos` n'y entre pas. Une note dit ce que
 * le contrat publie sous une forme inhabituelle — la valeur y est, rien ne
 * manque, rien n'est à corriger — et la publier ici reviendrait à demander au
 * designer de relire, à chaque export, des lignes dont la conclusion est
 * toujours « rien à faire ». Au bout de quelques PR il ne lirait plus les
 * autres non plus. Les notes restent dans `meta.diagnostics`, où un consommateur
 * du contrat les trouve, et dans le journal du plugin, où le designer les a sous
 * les yeux pendant l'export.
 *
 * **Deux zones, et la frontière compte.** L'en-tête dit l'IDENTITÉ de ce qui
 * est déposé — le chemin, le schéma de contrat, et d'où vient le composant
 * (`lignesDIdentite`, T4.2 et T4.4). La liste qui suit ne porte que des GESTES.
 * Un constat sans geste n'entre ni dans l'une ni dans l'autre.
 */
export function pullRequestBody(path: string, artifact: RepositoryArtifact): string {
  const warnings = artifact.warnings;
  const header = [
    'Export automatique depuis Figma.',
    '',
    `Fichier : \`${path}\``,
    ...lignesDIdentite(artifact),
  ].join('\n');
  if (warnings.length === 0) {
    return [header, '', `Aucun avertissement d'export.`].join('\n');
  }

  const points = `${warnings.length} point${warnings.length === 1 ? '' : 's'}`;
  return [
    header,
    '',
    `## ⚠️ L'export n'a pas pu décrire certaines informations (${points})`,
    '',
    'Les informations suivantes sont absentes de l’artefact exporté :',
    '',
    ...warnings.map((warning) => `- ${sansLienAutomatique(warning)}`),
    '',
    '### Action',
    '',
    'Corrigez chaque point dans Figma, puis relancez l’export.',
    '',
    'Ces avertissements ne bloquent pas la fusion.',
  ].join('\n');
}

/** Effectue un appel GitHub authentifié avec un message d'erreur exploitable. */
async function githubRequest<T>(
  config: GithubConfig,
  path: string,
  init: RequestInit = {},
  allowNotFound = false,
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.githubPat}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new GithubApiError('Impossible de joindre api.github.com.');
  }

  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json() as { message?: string };
      detail = body.message ? ` : ${body.message}` : '';
    } catch {
      // Une réponse non JSON reste décrite par son statut HTTP.
    }
    throw new GithubApiError(`GitHub a répondu ${response.status}${detail}.`, response.status);
  }

  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}

/** Ce qu'un test de connexion apprend : une cause, et ce que le dépôt dit de lui-même. */
export type DiagnosticConnexion = {
  cause: CauseConnexion;
  statut?: number | null;
  detail?: string;
  layout: RepositoryLayout | null;
};

/**
 * Test automatique de connexion demandé à l'ouverture et après sauvegarde.
 *
 * Il rend une CAUSE, pas un booléen (U5.2). L'ancienne version avalait l'erreur
 * et rendait `false` : le statut HTTP que `GithubApiError` porte déjà se
 * perdait au retour, si bien qu'un jeton refusé, un droit manquant et une URL
 * fautive arrivaient à l'identique devant le designer, dont le geste diffère
 * pourtant dans les trois cas.
 */
export async function diagnostiquerConnexion(config: GithubConfig): Promise<DiagnosticConnexion> {
  try {
    await githubRequest(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`);
  } catch (error) {
    // Une erreur qui n'est pas une réponse de GitHub ne dit rien du réseau ni
    // des droits : la nommer autrement serait attribuer une cause non établie.
    if (!(error instanceof GithubApiError)) return { cause: 'github-indisponible', layout: null };
    return { cause: causeDepuisStatut(error.status), statut: error.status, layout: null };
  }

  /*
   * Le repository répond ; on lui demande maintenant OÙ il range ses fichiers.
   * Cette lecture n'avait lieu qu'à la publication (U5.1), c'est-à-dire après
   * le travail : un `ucm.config.json` fautif refusait alors l'export, et le
   * designer l'apprenait une fois son composant analysé.
   */
  try {
    return { cause: 'connecte', layout: await repositoryLayout(config) };
  } catch (error) {
    if (error instanceof ErreurDeDescription) {
      return { cause: 'depot-mal-decrit', detail: error.message, layout: null };
    }
    if (error instanceof GithubApiError) {
      return { cause: causeDepuisStatut(error.status), statut: error.status, layout: null };
    }
    return { cause: 'github-indisponible', layout: null };
  }
}

/**
 * Retire une branche d'export qui n'a pas abouti à une PR : l'UI retombe alors
 * sur le téléchargement local, et personne n'ira jamais voir cette branche.
 * Son propre échec est ignoré — c'est l'erreur d'origine qui doit remonter à
 * l'utilisateur, pas celle du ménage qui la suit.
 */
async function deleteBranch(config: GithubConfig, repository: string, branch: string): Promise<void> {
  await githubRequest(config, `/repos/${repository}/git/refs/heads/${encodePath(branch)}`, {
    method: 'DELETE',
  }).catch(() => undefined);
}

/**
 * Lit un fichier sur la branche de base, ou sur la `ref` demandée ; `null`
 * signifie qu'il n'existe pas là.
 */
async function getRepositoryFile(
  config: GithubConfig,
  path: string,
  ref = config.baseBranch,
): Promise<GithubFile | null> {
  const file = await githubRequest<GithubFile>(
    config,
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    {},
    true,
  );
  if (file?.type === 'file' && file.encoding === 'none') {
    const blob = await githubRequest<GithubBlob>(
      config,
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/blobs/${encodeURIComponent(file.sha)}`,
    );
    if (blob) return { ...file, content: blob.content, encoding: blob.encoding };
  }
  return file;
}

/**
 * Le refus de collision, écrit pour le designer qui vient de cliquer.
 *
 * **Pourquoi un refus et pas un avertissement (D9).** L'identifiant nomme le
 * dossier ET le fichier de contrat : deux composants Figma qui se projettent
 * sur le même identifiant écrivent au même chemin, et le second export écrase
 * le premier. La CI ne voit ensuite qu'un seul contrat — donc aucun doublon,
 * donc aucune erreur. Avertir en écrivant quand même laisserait passer
 * exactement la perte silencieuse que cette détection existe pour supprimer.
 *
 * Le message nomme les DEUX composants et le geste : renommer dans Figma. Un
 * refus qui dit seulement « collision » ne se corrige pas — le designer ne sait
 * pas quel autre composant est en cause, et ne peut pas aller le chercher.
 *
 * `null` quand l'écriture est légitime.
 */
function refusDeCollision(
  existantBrut: string,
  candidatBrut: string,
  path: string,
  ou: string,
): string | null {
  let existant: unknown;
  let candidat: unknown;
  try {
    existant = JSON.parse(existantBrut);
    candidat = JSON.parse(candidatBrut);
  } catch {
    // Un contrat illisible ne dit rien de son identité : c'est le cas
    // indécidable, traité plus bas comme tel plutôt qu'ignoré.
    existant = null;
    candidat = null;
  }

  const verdict = comparerIdentiteDeContrat(existant, candidat);
  if (verdict.verdict === 'meme') return null;

  const nomCandidat = verdict.nomCandidat ?? 'ce composant';
  if (verdict.verdict === 'indecidable') {
    return (
      `Un contrat occupe déjà \`${path}\` (${ou}), et il ne porte aucune identité Figma `
      + `lisible : impossible de distinguer un réexport de « ${nomCandidat} » d'une collision `
      + `avec un autre composant. Un développeur doit vérifier ce fichier avant que l'export `
      + `puisse l'écrire.`
    );
  }

  const nomExistant = verdict.nomExistant ?? 'un autre composant';
  return (
    `« ${nomExistant} » et « ${nomCandidat} » produisent le même identifiant : leurs deux `
    + `contrats s'écrivent dans \`${path}\`, et cet export écraserait celui de `
    + `« ${nomExistant} » (${ou}). Renommez l'un des deux composants dans Figma, puis `
    + `relancez l'export.`
  );
}

/**
 * Un artefact trouvé au chemin visé, ailleurs que sur la branche de base.
 *
 * `ou` est la phrase que les messages reprennent telle quelle — le refus de
 * collision comme le journal du plugin. Une seule écriture de l'endroit : deux
 * en donneraient deux versions, et celle que le designer lit ne serait plus
 * celle que le code a regardée.
 */
type ExportEnVol = { contenu: string; ou: string; url: string | null };

/**
 * Les exports du même artefact encore EN VOL, c'est-à-dire dans une pull request
 * ouverte et pas encore fusionnée.
 *
 * **Le trou que ceci referme.** `getRepositoryFile` interroge la branche de
 * base : un artefact qui n'existe que dans une PR d'export ouverte y est
 * invisible. Cette cécité produit deux défauts, et c'est pour ça qu'il n'y a ici
 * qu'une seule lecture :
 *
 * - *la collision (T4.3)* — deux composants en collision exportés coup sur coup
 *   ouvriraient deux pull requests sur le même chemin sans qu'aucun refus n'ait
 *   lieu, et la collision ne se révélerait qu'à la fusion de la seconde, en
 *   écrasant la première, c'est-à-dire précisément le cas qu'on prétend avoir
 *   fermé ;
 * - *le doublon (T4.5)* — réexporter un contenu strictement identique pendant
 *   que sa pull request est ouverte en ouvrait une seconde, en tout point
 *   pareille, sans un mot.
 *
 * Le second vaut pour les DEUX genres d'artefact, quand le premier ne concerne
 * que les contrats : `tokens.json` ne se dispute son chemin avec personne, mais
 * il se réexporte comme n'importe quoi d'autre. C'est pourquoi cette fonction
 * ne parle plus de contrats et prend le `kind` au sérieux — le préfixe de
 * branche sépare déjà les deux flux.
 *
 * **Le coût est borné et c'est ce qui rend le contrôle acceptable.** Un seul
 * appel liste les pull requests ouvertes ; seules celles dont la branche porte
 * le préfixe d'export sont ensuite ouvertes, et il n'y en a normalement aucune.
 * Le filtre est STRUCTUREL — le préfixe que `exportBranchName` écrit — et non
 * une comparaison de titres : un titre est du texte, il dérive sans rien casser
 * de visible, et la recherche cesserait alors de trouver quoi que ce soit.
 *
 * Un échec de cet appel n'est pas avalé. Ne pas pouvoir regarder n'est pas la
 * même chose que ne rien trouver, et confondre les deux redonnerait au
 * garde-fou l'apparence du vert qu'il existe pour retirer.
 */
async function exportsEnVol(
  config: GithubConfig,
  repository: string,
  kind: ArtifactKind,
  path: string,
): Promise<ExportEnVol[]> {
  const ouvertes = await githubRequest<{ head: { ref: string }; html_url?: unknown }[]>(
    config,
    `/repos/${repository}/pulls?state=open&base=${encodeURIComponent(config.baseBranch)}&per_page=100`,
  );
  if (!ouvertes) return [];

  const prefixe = prefixeDeBranche(kind);
  const trouves: ExportEnVol[] = [];
  for (const pull of ouvertes) {
    const branche = pull.head?.ref;
    if (typeof branche !== 'string' || branche.indexOf(prefixe) !== 0) continue;
    const fichier = await getRepositoryFile(config, path, branche);
    if (fichier?.type === 'file' && fichier.content) {
      trouves.push({
        contenu: decodeBase64(fichier.content),
        ou: `pull request d'export ouverte, branche ${branche}`,
        // L'URL n'est utile qu'au doublon, qui envoie le designer fusionner ce
        // qui est déjà déposé. Le refus de collision, lui, ne s'en sert pas :
        // le geste qu'il demande se fait dans Figma, pas sur GitHub.
        url: typeof pull.html_url === 'string' ? pull.html_url : null,
      });
    }
  }
  return trouves;
}

/**
 * Crée une branche, écrit l'unique artefact de l'export puis ouvre la PR.
 *
 * Rien n'est écrit avant d'avoir cherché l'artefact aux deux seuls endroits où
 * il peut déjà être : la branche de base, et les pull requests d'export encore
 * ouvertes. Une PR vide n'a jamais eu de raison d'exister ; une seconde PR
 * identique non plus.
 */
export async function publishArtifact(
  config: GithubConfig,
  artifact: RepositoryArtifact,
  date = new Date(),
): Promise<PublishResult> {
  const maximumGithubFileSize = 100 * 1024 * 1024;
  if (utf8ByteLength(artifact.content) > maximumGithubFileSize) {
    throw new GithubApiError(
      'Le contrat dépasse la limite GitHub de 100 Mo. Il reste disponible en téléchargement local.',
    );
  }
  const repository = `${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  // Le repository est interrogé AVANT toute écriture : il est seul à savoir où
  // ses contrats vivent, et se tromper d'endroit est indétectable ensuite.
  const layout = await repositoryLayout(config);
  const path = artifactPath(artifact, layout);
  const surLaBase = `branche ${config.baseBranch}`;
  const existing = await getRepositoryFile(config, path);
  if (existing?.type === 'file' && existing.content && sameContent(decodeBase64(existing.content), artifact.content)) {
    return { status: 'unchanged', path, source: layout.source, ou: surLaBase, pullRequestUrl: null };
  }

  // T4.5. Le contrôle ci-dessus ne regarde que la branche de base, et c'est là
  // qu'un artefact déjà exporté n'est PAS encore : il attend dans sa pull
  // request. Réexporter un contenu strictement identique en ouvrait donc une
  // seconde, en tout point pareille — un doublon que rien ne signalait, alors
  // que c'est exactement la perte silencieuse que T4.1 et T4.3 referment
  // ailleurs.
  //
  // La lecture est celle de la détection de collision, ÉTENDUE et non
  // dupliquée : deux chemins de lecture du dépôt divergeraient en silence.
  // Elle vient après la branche de base et pas avant, parce que le cas courant
  // — rien n'a changé depuis la dernière fusion — se tranche alors sans lister
  // aucune pull request.
  const enVol = await exportsEnVol(config, repository, artifact.kind, path);
  const jumeau = enVol.find((occupant) => sameContent(occupant.contenu, artifact.content));
  if (jumeau) {
    return { status: 'unchanged', path, source: layout.source, ou: jumeau.ou, pullRequestUrl: jumeau.url };
  }

  // Ce n'est pas un refus, et son pendant n'existe pas : un contenu DIFFÉRENT
  // pendant qu'une pull request d'export est ouverte, c'est un réexport après
  // correction dans Figma — le geste normal, que bloquer reviendrait à punir.
  // Git dit le reste : deux branches qui modifient le même fichier depuis la
  // même base entrent en conflit à la seconde fusion, et un conflit, lui, se
  // voit.

  // La collision se cherche APRÈS le contrôle d'immobilité : un contenu
  // identique est un réexport par construction, et le faire passer par
  // l'arbitre d'identité ne pourrait que rendre la même réponse plus cher.
  //
  // Elle ne concerne que les contrats. `tokens.json` est unique par
  // repository : son chemin ne se dispute avec rien, et il ne porte aucune
  // identité Figma à comparer.
  if (artifact.kind === 'component') {
    const occupants = [
      ...(existing?.type === 'file' && existing.content
        ? [{ contenu: decodeBase64(existing.content), ou: surLaBase }]
        : []),
      ...enVol,
    ];
    for (const occupant of occupants) {
      const refus = refusDeCollision(occupant.contenu, artifact.content, path, occupant.ou);
      if (refus) throw new GithubApiError(refus);
    }
  }

  const branch = exportBranchName(artifact.kind, date);
  const baseRef = await githubRequest<{ object: { sha: string } }>(
    config,
    `/repos/${repository}/git/ref/heads/${encodePath(config.baseBranch)}`,
  );
  if (!baseRef) throw new GithubApiError('La branche de base ne renvoie aucun SHA.');

  await githubRequest(config, `/repos/${repository}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),
  });

  // Commit et PR sous le même garde : la branche ne sert qu'à porter la PR.
  let pullRequest: { html_url: string } | null;
  try {
    await githubRequest(config, `/repos/${repository}/contents/${encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Unified Component Exporter: export ${artifact.filename}`,
        content: encodeBase64(artifact.content),
        branch,
        ...(existing?.sha ? { sha: existing.sha } : {}),
      }),
    });

    pullRequest = await githubRequest<{ html_url: string }>(config, `/repos/${repository}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: `Unified Component Exporter: export ${artifact.filename}`,
        head: branch,
        base: config.baseBranch,
        body: pullRequestBody(path, artifact),
      }),
    });
  } catch (error) {
    await deleteBranch(config, repository, branch);
    throw error;
  }

  // Hors du try : une PR bel et bien créée ne doit pas voir sa branche
  // supprimée sous elle — cela la refermerait aussitôt.
  if (!pullRequest?.html_url) throw new GithubApiError('La PR a été créée sans URL exploitable.');

  return { status: 'created', path, branch, pullRequestUrl: pullRequest.html_url, source: layout.source };
}
