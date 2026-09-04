/**
 * Configuration optionnelle du dépôt GitHub.
 *
 * Les champs sont stockés un par un dans `figma.clientStorage`, donc localement
 * sur la machine de l'utilisateur et jamais dans le document Figma. Le PAT ne
 * quitte le sandbox que lorsqu'il est saisi par l'UI au moment de la sauvegarde.
 */

/** Champs visibles et éditables dans la page de configuration. */
export type RepositorySettings = {
  repoUrl: string;
  baseBranch: string;
  componentsPath: string;
  tokensPath: string;
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
  componentsPath: 'componentsPath',
  tokensPath: 'tokensPath',
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

/**
 * Normalise un dossier de repo : séparateurs `/`, sans slash de bord.
 * Les segments `.` et `..` sont refusés pour éviter de sortir du path prévu.
 */
export function normalizeRepositoryPath(value: string): string | null {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) return null;
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  return segments.join('/');
}

/** Valide et normalise les réglages avant tout appel GitHub. */
export function validateSettings(input: SettingsInput, storedPat = ''): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};
  const repository = parseGithubRepository(input.repoUrl);
  if (!repository) errors.repoUrl = 'Utilisez une URL https://github.com/owner/repo valide.';

  const baseBranch = input.baseBranch.trim();
  if (!baseBranch) errors.baseBranch = 'La branche de base est obligatoire.';

  const componentsPath = normalizeRepositoryPath(input.componentsPath);
  if (!componentsPath) errors.componentsPath = 'Le chemin des composants est obligatoire et doit rester relatif.';

  const tokensPath = normalizeRepositoryPath(input.tokensPath);
  if (!tokensPath) errors.tokensPath = 'Le chemin des tokens est obligatoire et doit rester relatif.';

  const githubPat = input.githubPat?.trim() || storedPat.trim();
  if (!githubPat) errors.githubPat = 'Le Personal Access Token est obligatoire pour créer une PR.';

  if (!repository || !baseBranch || !componentsPath || !tokensPath || !githubPat) {
    return { valid: false, errors, config: null };
  }

  return {
    valid: true,
    errors,
    config: {
      repoUrl: input.repoUrl.trim(),
      baseBranch,
      componentsPath,
      tokensPath,
      owner: repository.owner,
      repo: repository.repo,
      githubPat,
    },
  };
}

/** Charge les cinq clés locales et ne renvoie jamais le PAT à l'UI. */
export async function loadPublicSettings(): Promise<PublicSettings> {
  const [repoUrl, baseBranch, componentsPath, tokensPath, githubPat] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_KEYS.repoUrl),
    figma.clientStorage.getAsync(STORAGE_KEYS.baseBranch),
    figma.clientStorage.getAsync(STORAGE_KEYS.componentsPath),
    figma.clientStorage.getAsync(STORAGE_KEYS.tokensPath),
    figma.clientStorage.getAsync(STORAGE_KEYS.githubPat),
  ]);
  return {
    repoUrl: typeof repoUrl === 'string' ? repoUrl : '',
    baseBranch: typeof baseBranch === 'string' ? baseBranch : 'main',
    componentsPath: typeof componentsPath === 'string' ? componentsPath : 'src/components',
    tokensPath: typeof tokensPath === 'string' ? tokensPath : 'src/tokens',
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

  const settingsToStore: RepositorySettings = {
    repoUrl: input.repoUrl.trim(),
    baseBranch: input.baseBranch.trim(),
    componentsPath: normalizeRepositoryPath(input.componentsPath) ?? input.componentsPath.trim(),
    tokensPath: normalizeRepositoryPath(input.tokensPath) ?? input.tokensPath.trim(),
  };

  await Promise.all([
    figma.clientStorage.setAsync(STORAGE_KEYS.repoUrl, settingsToStore.repoUrl),
    figma.clientStorage.setAsync(STORAGE_KEYS.baseBranch, settingsToStore.baseBranch),
    figma.clientStorage.setAsync(STORAGE_KEYS.componentsPath, settingsToStore.componentsPath),
    figma.clientStorage.setAsync(STORAGE_KEYS.tokensPath, settingsToStore.tokensPath),
    input.githubPat?.trim()
      ? figma.clientStorage.setAsync(STORAGE_KEYS.githubPat, input.githubPat.trim())
      : Promise.resolve(),
  ]);
  return validation;
}
