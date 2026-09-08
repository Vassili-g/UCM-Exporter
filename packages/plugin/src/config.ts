/**
 * Configuration optionnelle du dépôt GitHub : à qui publier, et avec quel jeton.
 *
 * Les champs sont stockés un par un dans `figma.clientStorage`, donc localement
 * sur la machine de l'utilisateur et jamais dans le document Figma. Le PAT ne
 * quitte le sandbox que lorsqu'il est saisi par l'UI au moment de la sauvegarde.
 *
 * Ce qui est rangé ici décrit une machine, pas un repository : l'endroit où un
 * export atterrit n'en fait donc pas partie, et vit dans `github.ts`, qui le
 * demande au repository lui-même.
 */

/**
 * Champs visibles et éditables dans la page de configuration.
 *
 * Aucun chemin ici : l'endroit où un export atterrit appartient au repository,
 * qui le déclare dans son `ucm.config.json` ou laisse s'appliquer les défauts
 * du kit. Un chemin rangé sur le poste du designer ne pouvait décider que
 * lorsque le repository ne se décrivait pas, c'est-à-dire au moment précis où
 * la CI applique ces mêmes défauts : il ne pouvait donc que faire écrire
 * l'export là où le contrôle ne regarde pas.
 */
export type RepositorySettings = {
  repoUrl: string;
  baseBranch: string;
};

/** Configuration complète utilisée par le client GitHub. */
export type GithubConfig = RepositorySettings & {
  owner: string;
  repo: string;
  githubPat: string;
};

/** Valeurs envoyées par l'UI lors d'une sauvegarde. */
export type SettingsInput = RepositorySettings & {
  /** Vide = conserver le PAT déjà enregistré, s'il existe. */
  githubPat?: string;
};

/** État public renvoyé à l'UI sans jamais révéler le PAT enregistré. */
export type PublicSettings = RepositorySettings & { hasPat: boolean };

const STORAGE_KEYS = {
  repoUrl: 'repoUrl',
  baseBranch: 'baseBranch',
  githubPat: 'github_pat',
} as const;

/** Résultat de validation détaillé pour alimenter les erreurs inline de l'UI. */
export type SettingsValidation = {
  valid: boolean;
  errors: Partial<Record<keyof SettingsInput, string>>;
  config: GithubConfig | null;
};

/**
 * Extrait `owner/repo` d'une URL HTTPS GitHub.
 *
 * @example parseGithubRepository('https://github.com/acme/design-system.git')
 * // → { owner: 'acme', repo: 'design-system' }
 */
export function parseGithubRepository(repoUrl: string): { owner: string; repo: string } | null {
  // Accepte aussi le lien Markdown copié depuis GitHub ou une conversation.
  const markdownLink = repoUrl.trim().match(/^\[[^\]]+\]\((https:\/\/github\.com\/[^)\s]+)\)$/i);
  const value = markdownLink?.[1] ?? repoUrl.trim();
  // On évite `URL`, dont le comportement diffère selon les contextes sandbox Figma.
  const match = value.match(/^https:\/\/github\.com\/([^/?#\s]+)\/([^/?#\s]+)\/?(?:[?#].*)?$/i);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');
  return owner && repo ? { owner, repo } : null;
}

/** Valide et normalise les réglages avant tout appel GitHub. */
export function validateSettings(input: SettingsInput, storedPat = ''): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};
  const repository = parseGithubRepository(input.repoUrl);
  if (!repository) errors.repoUrl = 'Utilisez une URL https://github.com/owner/repo valide.';

  const baseBranch = input.baseBranch.trim();
  if (!baseBranch) errors.baseBranch = 'La branche de base est obligatoire.';

  const githubPat = input.githubPat?.trim() || storedPat.trim();
  if (!githubPat) errors.githubPat = 'Le Personal Access Token est obligatoire pour créer une PR.';

  if (!repository || !baseBranch || !githubPat) return { valid: false, errors, config: null };

  return {
    valid: true,
    errors,
    config: {
      repoUrl: input.repoUrl.trim(),
      baseBranch,
      owner: repository.owner,
      repo: repository.repo,
      githubPat,
    },
  };
}

/**
 * Retire le PAT du poste.
 *
 * Aucun geste ne le faisait : ni rotation, ni changement de repository, ni
 * départ. Un champ vide signifie « conserver le jeton enregistré », si bien que
 * le formulaire ne pouvait que le remplacer, jamais l'effacer.
 */
export async function supprimerPat(): Promise<void> {
  await figma.clientStorage.deleteAsync(STORAGE_KEYS.githubPat);
}

/** Charge les trois clés locales et ne renvoie jamais le PAT à l'UI. */
export async function loadPublicSettings(): Promise<PublicSettings> {
  const [repoUrl, baseBranch, githubPat] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_KEYS.repoUrl),
    figma.clientStorage.getAsync(STORAGE_KEYS.baseBranch),
    figma.clientStorage.getAsync(STORAGE_KEYS.githubPat),
  ]);
  return {
    repoUrl: typeof repoUrl === 'string' ? repoUrl : '',
    baseBranch: typeof baseBranch === 'string' ? baseBranch : 'main',
    hasPat: typeof githubPat === 'string' && githubPat.trim().length > 0,
  };
}

/** Charge et valide la configuration complète, PAT inclus côté sandbox seulement. */
export async function loadGithubConfig(): Promise<SettingsValidation> {
  const settings = await loadPublicSettings();
  const githubPat = await figma.clientStorage.getAsync(STORAGE_KEYS.githubPat);
  return validateSettings(settings, typeof githubPat === 'string' ? githubPat : '');
}

/** Sauvegarde les réglages ; un PAT vide conserve la valeur déjà enregistrée. */
export async function saveSettings(input: SettingsInput): Promise<SettingsValidation> {
  const storedPat = await figma.clientStorage.getAsync(STORAGE_KEYS.githubPat);
  const validation = validateSettings(input, typeof storedPat === 'string' ? storedPat : '');
  // Une erreur de saisie ne doit jamais écraser une configuration déjà valable.
  if (!validation.valid) return validation;

  await Promise.all([
    figma.clientStorage.setAsync(STORAGE_KEYS.repoUrl, input.repoUrl.trim()),
    figma.clientStorage.setAsync(STORAGE_KEYS.baseBranch, input.baseBranch.trim()),
    input.githubPat?.trim()
      ? figma.clientStorage.setAsync(STORAGE_KEYS.githubPat, input.githubPat.trim())
      : Promise.resolve(),
  ]);
  return validation;
}
