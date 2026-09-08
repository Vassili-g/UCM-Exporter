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
 * Résultat d'une publication. Pour un contenu inchangé, `ou` distingue la
 * branche de base d'une PR ouverte et `pullRequestUrl` mène à cette PR.
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

/** Qui a décidé où l'artefact s'écrit : le repo, ou les réglages du plugin. */
export type LayoutSource = typeof NOM_CONFIGURATION | 'réglages du plugin';

/** Emplacements effectifs ; `tokens` est un chemin de fichier, jamais un dossier. */
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

/**
 * Erreur réseau nettoyée : statut et message, jamais les headers. Le statut
 * distingue notamment une panne réseau d'une configuration du dépôt invalide.
 */
export class GithubApiError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'GithubApiError';
  }
}

/**
 * Le repository répond, mais il se décrit mal.
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
 * Le préfixe que porte toute branche d'export, et la seule chose qui permette
 * de les reconnaître après coup.
 *
 * Il est extrait parce qu'un second lecteur en dépend : la détection de
 * collision doit retrouver les exports encore en vol (voir
 * `cheminsOccupesParUnExportEnCours`). Deux écritures du même préfixe
 * dériveraient, et la dérive serait muette : la recherche ne trouverait
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
    // tokens ». Les deux chemins sont un repli facultatif, et un
    // repli absent ne s'invente pas : il se dit.
    tokens: config.tokensPath ? `${config.tokensPath}/tokens.json` : null,
    source: 'réglages du plugin',
  };
}

/**
 * Où écrire, demandé au repository lui-même.
 *
 * **Les chemins viennent du repository, jamais des réglages du plugin.** Ceux-ci
 * rendent `src/components` et `src/tokens` : sur un repo aux conventions
 * différentes, l'export écrirait à un endroit que la CI ne regarde pas, et
 * personne ne verrait rien, la pull request s'ouvrant sur un contrôle qui ne
 * trouve aucun contrat nouveau.
 *
 * **Un `ucm.config.json` présent et mal formé refuse l'export.** Retomber en
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
 * réglages, qui ne portent aucun chemin obligatoire. Le message
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
 * Identité annoncée en tête de PR. La version est lue dans l'artefact, jamais
 * dans la constante du plugin ; l'origine emploie l'URL disponible ou, à défaut,
 * `fileName` et `nodeId`. Les intitulés passent par `sansLienAutomatique`.
 * `tokens.json`, qui n'est ni un contrat ni un composant, n'a pas ces lignes.
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
 * L'en-tête porte l'identité de l'artefact ; la liste ne contient que les
 * diagnostics qui demandent un geste dans Figma.
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
 * Il rend une cause, pas un booléen. L'ancienne version avalait l'erreur
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
   * Le repository répond ; on lui demande maintenant où il range ses fichiers.
   * Cette lecture n'avait lieu qu'à la publication, c'est-à-dire après
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
 * Son propre échec est ignoré : c'est l'erreur d'origine qui doit remonter à
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
 * **Pourquoi un refus et pas un avertissement.** L'identifiant nomme le
 * dossier et le fichier de contrat : deux composants Figma qui se projettent
 * sur le même identifiant écrivent au même chemin, et le second export écrase
 * le premier. La CI ne voit ensuite qu'un seul contrat, donc aucun doublon,
 * donc aucune erreur. Avertir en écrivant quand même laisserait passer
 * exactement la perte silencieuse que cette détection existe pour supprimer.
 *
 * Le message nomme les deux composants et le geste : renommer dans Figma. Un
 * refus qui dit seulement « collision » ne se corrige pas : le designer ne sait
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
 * `ou` est la phrase que les messages reprennent telle quelle : le refus de
 * collision comme le journal du plugin. Une seule écriture de l'endroit : deux
 * en donneraient deux versions, et celle que le designer lit ne serait plus
 * celle que le code a regardée.
 */
type ExportEnVol = { contenu: string; ou: string; url: string | null };

/**
 * Les exports du même artefact encore en vol, c'est-à-dire dans une pull request
 * ouverte et pas encore fusionnée.
 * Ils ferment les collisions de contrats et les doublons avant fusion. Un seul
 * appel liste les PR, puis seules les branches au préfixe d'export sont lues ;
 * un échec de lecture n'est jamais assimilé à une liste vide.
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
 * Ce que le repository apprend avant toute écriture.
 * La même lecture est rejouée à la publication, car branche et PR peuvent avoir
 * changé depuis le pré-vol ; deux implémentations de ce contrôle divergeraient.
 */
export type LectureDuDepot = {
  layout: RepositoryLayout;
  path: string;
  /** Le fichier déjà présent sur la branche de base, s'il y en a un. */
  surLaBase: { contenu: string; sha: string } | null;
  /** Le même contenu, déjà déposé quelque part. Rien à publier alors. */
  jumeau: { ou: string; url: string | null } | null;
  /** Le refus de collision d'identité, quand il y en a un. */
  refus: string | null;
};

export async function lireAvantEcriture(
  config: GithubConfig,
  artifact: RepositoryArtifact,
): Promise<LectureDuDepot> {
  const repository = `${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  // Le repository est interrogé avant toute écriture : il est seul à savoir où
  // ses contrats vivent, et se tromper d'endroit est indétectable ensuite.
  const layout = await repositoryLayout(config);
  const path = artifactPath(artifact, layout);
  const ouLaBase = `branche ${config.baseBranch}`;
  const existing = await getRepositoryFile(config, path);
  const surLaBase = existing?.type === 'file' && existing.content
    ? { contenu: decodeBase64(existing.content), sha: existing.sha }
    : null;

  if (surLaBase && sameContent(surLaBase.contenu, artifact.content)) {
    return { layout, path, surLaBase, jumeau: { ou: ouLaBase, url: null }, refus: null };
  }

  // Le contrôle ci-dessus ne regarde que la branche de base, et c'est là
  // qu'un artefact déjà exporté n'est pas encore : il attend dans sa pull
  // request. Réexporter un contenu strictement identique en ouvrait donc une
  // seconde, en tout point pareille : un doublon que rien ne signalait.
  //
  // La lecture est celle de la détection de collision, étendue et non
  // dupliquée. Elle vient après la branche de base et pas avant, parce que le
  // cas courant (rien n'a changé depuis la dernière fusion) se tranche alors
  // sans lister aucune pull request.
  const enVol = await exportsEnVol(config, repository, artifact.kind, path);
  const jumeau = enVol.find((occupant) => sameContent(occupant.contenu, artifact.content));
  if (jumeau) return { layout, path, surLaBase, jumeau, refus: null };

  // Ce n'est pas un refus, et son pendant n'existe pas : un contenu différent
  // pendant qu'une pull request d'export est ouverte, c'est un réexport après
  // correction dans Figma, le geste normal, que bloquer reviendrait à punir.
  // Git dit le reste : deux branches qui modifient le même fichier depuis la
  // même base entrent en conflit à la seconde fusion, et un conflit, lui, se
  // voit.

  // La collision se cherche après le contrôle d'immobilité : un contenu
  // identique est un réexport par construction, et le faire passer par
  // l'arbitre d'identité ne pourrait que rendre la même réponse plus cher.
  //
  // Elle ne concerne que les contrats. `tokens.json` est unique par
  // repository : son chemin ne se dispute avec rien, et il ne porte aucune
  // identité Figma à comparer.
  if (artifact.kind === 'component') {
    const occupants = [...(surLaBase ? [{ contenu: surLaBase.contenu, ou: ouLaBase }] : []), ...enVol];
    for (const occupant of occupants) {
      const refus = refusDeCollision(occupant.contenu, artifact.content, path, occupant.ou);
      if (refus) return { layout, path, surLaBase, jumeau: null, refus };
    }
  }

  return { layout, path, surLaBase, jumeau: null, refus: null };
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
  // La lecture est refaite ici, même quand le pré-vol vient de la faire : entre
  // les deux, le dépôt a pu bouger. Une analyse qui autoriserait une
  // écriture sur la foi d'une lecture périmée serait pire que pas d'analyse.
  const { layout, path, surLaBase, jumeau, refus } = await lireAvantEcriture(config, artifact);
  if (jumeau) {
    return { status: 'unchanged', path, source: layout.source, ou: jumeau.ou, pullRequestUrl: jumeau.url };
  }
  if (refus) throw new GithubApiError(refus);

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
        ...(surLaBase ? { sha: surLaBase.sha } : {}),
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
  // supprimée sous elle, cela la refermerait aussitôt.
  if (!pullRequest?.html_url) throw new GithubApiError('La PR a été créée sans URL exploitable.');

  return { status: 'created', path, branch, pullRequestUrl: pullRequest.html_url, source: layout.source };
}
