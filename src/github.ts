/**
 * Client GitHub REST minimal pour déposer un artefact Unified Component Exporter dans une
 * branche dédiée puis ouvrir une PR. Aucun PAT n'est logué ni renvoyé à l'UI.
 */
import type { GithubConfig } from './config';
import { decodeBase64, encodeBase64, utf8ByteLength } from './base64';
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
  /** Ce que l'export documente sans rien perdre : aucun geste n'est demandé. */
  infos?: string[];
};

export type PublishResult =
  | { status: 'unchanged'; path: string }
  | { status: 'created'; path: string; branch: string; pullRequestUrl: string };

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
  return `ucm-exporter/export-${kind}-${day}-${time}`;
}

/** Déduit le path repo sans demander de saisie par composant. */
export function artifactPath(config: GithubConfig, artifact: RepositoryArtifact): string {
  if (artifact.kind === 'tokens') return `${config.tokensPath}/tokens.json`;
  const componentName = artifact.filename.replace(/\.contract\.json$/i, '');
  return `${config.componentsPath}/${componentName}/${artifact.filename}`;
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
 * Deux listes, parce qu'un export produit deux natures de constats. Un
 * AVERTISSEMENT dit qu'une information manque à l'artefact et nomme le geste
 * qui la ramènera. Une NOTE dit ce que le contrat publie sous une forme
 * inhabituelle : la valeur y est, et rien n'est à corriger. Les ranger sous le
 * même titre réclamerait une correction que le texte de la note dit inutile.
 */
export function pullRequestBody(
  path: string,
  warnings: string[],
  infos: string[] = [],
): string {
  const header = `Export automatique depuis Figma.\n\nFichier : \`${path}\``;
  const notes = infos.length === 0 ? [] : [
    '',
    `## Notes d’export (${infos.length} note${infos.length === 1 ? '' : 's'})`,
    '',
    'Ces points sont dans l’artefact exporté et n’appellent aucune correction :',
    '',
    ...infos.map((info) => `- ${info}`),
  ];
  if (warnings.length === 0) {
    return [header, '', `Aucun avertissement d'export.`, ...notes].join('\n');
  }

  const points = `${warnings.length} point${warnings.length === 1 ? '' : 's'}`;
  return [
    header,
    '',
    `## ⚠️ L'export n'a pas pu décrire certaines informations (${points})`,
    '',
    'Les informations suivantes sont absentes de l’artefact exporté :',
    '',
    ...warnings.map((warning) => `- ${warning}`),
    '',
    '### Action',
    '',
    'Corrigez chaque point dans Figma, puis relancez l’export.',
    '',
    'Ces avertissements ne bloquent pas la fusion.',
    ...notes,
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

/** Test automatique de connexion demandé à l'ouverture et après sauvegarde. */
export async function testGithubConnection(config: GithubConfig): Promise<boolean> {
  try {
    await githubRequest(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`);
    return true;
  } catch {
    return false;
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

/** Lit un fichier sur la branche de base ; `null` signifie qu'il n'existe pas encore. */
async function getRepositoryFile(
  config: GithubConfig,
  path: string,
): Promise<GithubFile | null> {
  const file = await githubRequest<GithubFile>(
    config,
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(config.baseBranch)}`,
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
 * Crée une branche, écrit l'unique artefact de l'export puis ouvre la PR.
 * Le fichier existant est lu avant la branche afin d'éviter toute PR vide.
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
  const path = artifactPath(config, artifact);
  const existing = await getRepositoryFile(config, path);
  if (existing?.type === 'file' && existing.content && sameContent(decodeBase64(existing.content), artifact.content)) {
    return { status: 'unchanged', path };
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
        body: pullRequestBody(path, artifact.warnings, artifact.infos ?? []),
      }),
    });
  } catch (error) {
    await deleteBranch(config, repository, branch);
    throw error;
  }

  // Hors du try : une PR bel et bien créée ne doit pas voir sa branche
  // supprimée sous elle — cela la refermerait aussitôt.
  if (!pullRequest?.html_url) throw new GithubApiError('La PR a été créée sans URL exploitable.');

  return { status: 'created', path, branch, pullRequestUrl: pullRequest.html_url };
}
