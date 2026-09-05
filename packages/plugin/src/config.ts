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

/**
 * Ce qu'un chemin de repli vaut une fois validé : un chemin, ou rien.
 *
 * Les deux chemins étaient OBLIGATOIRES, alors que `repositoryLayout` les
 * ignore dès qu'un `ucm.config.json` lisible existe (U5.1). Exiger une valeur
 * que le dépôt contredit revient à faire saisir une donnée sans effet, puis à
 * la faire croire vraie.
 */
export type CheminDeRepli = string | null;

/** Configuration complète utilisée par le client GitHub. */
export type GithubConfig = Omit<RepositorySettings, 'componentsPath' | 'tokensPath'> & {
  componentsPath: CheminDeRepli;
  tokensPath: CheminDeRepli;
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

/**
 * Un chemin de repli : sa forme normalisée, `null` quand il est vide, et
 * `false` quand il est écrit mais inutilisable. Les trois cas se distinguent —
 * confondre « absent » et « fautif » ferait taire la seule erreur de saisie que
 * ces champs peuvent encore produire.
 */
function cheminDeRepli(valeur: string): CheminDeRepli | false {
  if (!valeur.trim()) return null;
  return normalizeRepositoryPath(valeur) ?? false;
}

/** Valide et normalise les réglages avant tout appel GitHub. */
export function validateSettings(input: SettingsInput, storedPat = ''): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};
  const repository = parseGithubRepository(input.repoUrl);
  if (!repository) errors.repoUrl = 'Utilisez une URL https://github.com/owner/repo valide.';

  const baseBranch = input.baseBranch.trim();
  if (!baseBranch) errors.baseBranch = 'La branche de base est obligatoire.';

  /*
   * Les deux chemins sont un REPLI depuis U5.1 : vides, ils laissent le
   * repository décider par son `ucm.config.json`. Leur forme reste vérifiée —
   * un chemin qui remonte hors du repository n'est jamais une réponse — mais
   * leur absence n'est plus une erreur.
   */
  const componentsPath = cheminDeRepli(input.componentsPath);
  if (componentsPath === false) {
    errors.componentsPath = 'Le chemin des composants doit rester relatif au repository.';
  }

  const tokensPath = cheminDeRepli(input.tokensPath);
  if (tokensPath === false) {
    errors.tokensPath = 'Le chemin des tokens doit rester relatif au repository.';
  }

  const githubPat = input.githubPat?.trim() || storedPat.trim();
  if (!githubPat) errors.githubPat = 'Le Personal Access Token est obligatoire pour créer une PR.';

  if (!repository || !baseBranch || componentsPath === false || tokensPath === false || !githubPat) {
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

/**
 * Retire le PAT du poste (U5.4).
 *
 * Aucun geste ne le faisait : ni rotation, ni changement de repository, ni
 * départ. Un champ vide signifie « conserver le jeton enregistré », si bien que
 * le formulaire ne pouvait que le remplacer, jamais l'effacer.
 */
export async function supprimerPat(): Promise<void> {
  await figma.clientStorage.deleteAsync(STORAGE_KEYS.githubPat);
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
    // Aucun chemin par défaut : un repli inventé écrirait l'export à un endroit
    // que personne n'a demandé, et le ferait croire choisi (U5.1).
    componentsPath: typeof componentsPath === 'string' ? componentsPath : '',
    tokensPath: typeof tokensPath === 'string' ? tokensPath : '',
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
    // (le rangement garde la saisie telle quelle : la validation ci-dessus a
    // déjà refusé ce qui n'était pas un chemin acceptable)
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
