/**
 * Configuration optionnelle du dépôt : sur quelle forge publier, où, et avec
 * quel jeton.
 *
 * Les champs sont stockés un par un dans `figma.clientStorage`, donc localement
 * sur la machine de l'utilisateur et jamais dans le document Figma. Le jeton ne
 * quitte le sandbox que lorsqu'il est saisi par l'UI au moment de la sauvegarde.
 *
 * Ce qui est rangé ici décrit une machine, pas un repository : l'endroit où un
 * export atterrit n'en fait donc pas partie, et vit dans `depot.ts`, qui le
 * demande au repository lui-même.
 */
import { TERMES } from './forges/termes';
import type { NomDeForge } from './forges/termes';

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

/** Configuration complète qu'un adaptateur de forge reçoit. */
export type ConfigurationDuDepot = RepositorySettings & {
  forge: NomDeForge;
  /** `propriétaire/repository` sur GitHub, chemin du projet sur GitLab. */
  projet: string;
  jeton: string;
};

/** Valeurs envoyées par l'UI lors d'une sauvegarde. */
export type SettingsInput = RepositorySettings & {
  /** Vide = conserver le jeton déjà enregistré, s'il appartient à la forge de l'URL. */
  jeton?: string;
};

/**
 * État public renvoyé à l'UI sans jamais révéler le jeton enregistré :
 * seulement la forge qui l'a reçu, ou `null` sans jeton.
 */
export type PublicSettings = RepositorySettings & { forgeDuJeton: NomDeForge | null };

/*
 * `github_pat` garde son nom d'avant GitLab : le renommer retirerait le jeton
 * des utilisateurs actuels à la mise à jour du plugin. Un jeton sans
 * `forge_du_jeton` a été saisi pour GitHub.
 */
const STORAGE_KEYS = {
  repoUrl: 'repoUrl',
  baseBranch: 'baseBranch',
  jeton: 'github_pat',
  forgeDuJeton: 'forge_du_jeton',
} as const;

/** Résultat de validation détaillé pour alimenter les erreurs inline de l'UI. */
export type SettingsValidation = {
  valid: boolean;
  errors: Partial<Record<keyof SettingsInput, string>>;
  config: ConfigurationDuDepot | null;
  /**
   * `true` quand le seul jeton disponible a été saisi pour l'autre forge. La
   * configuration est alors invalide, et aucun appel réseau ne part.
   */
  jetonAutreForge: boolean;
};

/** Ce qu'une adresse désigne, et si une partie de son chemin a été ignorée. */
export type AdresseDuDepot = { forge: NomDeForge; projet: string; cheminRetire: boolean };

const HOTES: Record<string, NomDeForge> = { 'github.com': 'github', 'gitlab.com': 'gitlab' };

const SEGMENT = /^[\w.-]+$/;

export const ERREUR_D_ADRESSE =
  'Utilisez l’adresse d’un repository https://github.com/propriétaire/repository '
  + 'ou d’un projet https://gitlab.com/groupe/projet.';

/**
 * Lit une adresse de repository GitHub ou de projet GitLab, y compris l'adresse
 * d'une page du projet.
 *
 * La forge vient de l'hôte, et de lui seul. Sur GitLab, tout ce qui suit `/-/`
 * désigne une page et est retiré ; le reste est le chemin du projet,
 * sous-groupes compris. Sur GitHub, les deux premiers segments forment le
 * repository. La branche et le dossier d'une adresse sont ignorés : un nom de
 * branche peut contenir `/`, si bien que rien ne sépare sûrement l'un de
 * l'autre.
 *
 * @example lireAdresseDuDepot('https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines?ref_type=heads')
 * // → { forge: 'gitlab', projet: 'mon-groupe/design-system', cheminRetire: true }
 */
export function lireAdresseDuDepot(adresse: string): AdresseDuDepot | null {
  // Accepte aussi le lien Markdown copié depuis une page ou une conversation.
  const lienMarkdown = adresse.trim().match(/^\[[^\]]+\]\((https:\/\/[^)\s]+)\)$/i);
  const valeur = lienMarkdown?.[1] ?? adresse.trim();
  // On évite `URL`, dont le comportement diffère selon les contextes sandbox Figma.
  const decoupe = valeur.match(/^https:\/\/(?:www\.)?([^/?#\s]+)(\/[^?#\s]*)?(?:[?#]\S*)?$/i);
  if (!decoupe) return null;
  const forge = HOTES[decoupe[1].toLowerCase()];
  if (!forge) return null;

  let chemin = decoupe[2] ?? '';
  let cheminRetire = false;
  if (forge === 'gitlab') {
    const page = chemin.indexOf('/-/');
    if (page !== -1) {
      chemin = chemin.slice(0, page);
      cheminRetire = true;
    }
  }
  const segments = chemin.replace(/^\/+|\/+$/g, '').split('/');
  if (segments.some((segment) => segment === '')) return null;

  let projet = segments;
  if (forge === 'github') {
    projet = segments.slice(0, 2);
    if (segments.length > 2) cheminRetire = true;
  }
  if (projet.length < 2) return null;
  projet[projet.length - 1] = projet[projet.length - 1].replace(/\.git$/i, '');
  if (!projet.every((segment) => SEGMENT.test(segment))) return null;
  return { forge, projet: projet.join('/'), cheminRetire };
}

/** La forge qu'un préfixe de jeton désigne, ou `null` quand il n'en désigne aucune. */
export function forgeDuPrefixe(jeton: string): NomDeForge | null {
  if (/^(?:ghp_|github_pat_)/.test(jeton)) return 'github';
  if (/^glpat-/.test(jeton)) return 'gitlab';
  return null;
}

/** Le jeton enregistré sur le poste, et la forge qui l'a reçu. */
export type JetonEnregistre = { jeton: string; forge: NomDeForge | null };

/**
 * Valide et normalise les réglages avant tout appel réseau.
 *
 * Un jeton ne part que vers la forge qui l'a reçu. Un champ vide conserve le
 * jeton enregistré seulement si sa forge est celle de l'URL ; sinon la
 * configuration est invalide, et c'est la seule protection qui tienne à
 * l'ouverture, au pré-vol et à la publication, parce que les trois passent par
 * ici.
 */
export function validateSettings(
  input: SettingsInput,
  enregistre: JetonEnregistre = { jeton: '', forge: null },
): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};
  const adresse = lireAdresseDuDepot(input.repoUrl);
  if (!adresse) errors.repoUrl = ERREUR_D_ADRESSE;

  const baseBranch = input.baseBranch.trim();
  if (!baseBranch) errors.baseBranch = 'La branche de base est obligatoire.';

  const saisi = input.jeton?.trim() ?? '';
  const stocke = enregistre.jeton.trim();
  const forgeStockee = stocke ? enregistre.forge ?? 'github' : null;
  let jeton = saisi;
  let jetonAutreForge = false;

  if (adresse) {
    const termes = TERMES[adresse.forge];
    const prefixe = forgeDuPrefixe(saisi);
    if (saisi && prefixe && prefixe !== adresse.forge) {
      errors.jeton = `Ce jeton est un jeton ${TERMES[prefixe].forge}. Collez un ${termes.nomDuJeton} ${termes.forge}.`;
      jeton = '';
    } else if (!saisi && stocke && forgeStockee === adresse.forge) {
      jeton = stocke;
    } else if (!saisi && stocke) {
      jetonAutreForge = true;
      errors.jeton = `Le jeton enregistré ne sert pas pour ${termes.forge}. Collez un ${termes.nomDuJeton} ${termes.forge}.`;
    } else if (!saisi) {
      errors.jeton = `Le ${termes.nomDuJeton} est obligatoire pour ouvrir une ${termes.demande}.`;
    }
  } else if (!saisi && !stocke) {
    errors.jeton = 'Le jeton d’accès est obligatoire.';
  }

  if (!adresse || !baseBranch || !jeton || errors.jeton) {
    return { valid: false, errors, config: null, jetonAutreForge };
  }

  return {
    valid: true,
    errors,
    config: {
      repoUrl: input.repoUrl.trim(),
      baseBranch,
      forge: adresse.forge,
      projet: adresse.projet,
      jeton,
    },
    jetonAutreForge: false,
  };
}

/**
 * Retire le jeton du poste, et la forge qui l'accompagne.
 *
 * Aucun geste ne le faisait : ni rotation, ni changement de repository, ni
 * départ. Un champ vide signifie « conserver le jeton enregistré », si bien que
 * le formulaire ne pouvait que le remplacer, jamais l'effacer.
 */
export async function supprimerPat(): Promise<void> {
  await figma.clientStorage.deleteAsync(STORAGE_KEYS.jeton);
  await figma.clientStorage.deleteAsync(STORAGE_KEYS.forgeDuJeton);
}

async function lireJetonEnregistre(): Promise<JetonEnregistre> {
  const [jeton, forge] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_KEYS.jeton),
    figma.clientStorage.getAsync(STORAGE_KEYS.forgeDuJeton),
  ]);
  return {
    jeton: typeof jeton === 'string' ? jeton : '',
    forge: forge === 'github' || forge === 'gitlab' ? forge : null,
  };
}

/**
 * La clé de destination : l'endroit où un export irait, sans le jeton.
 *
 * Un tuple JSON, parce qu'une branche peut contenir `|`, `@` ou `/`. La forge
 * et le projet passent en minuscules : GitHub et GitLab servent un chemin
 * quelle que soit sa casse. La branche garde la sienne. Sans configuration
 * valide, l'export est téléchargé : la clé vaut alors `aucune`.
 */
export function cleDeDestination(
  config: Pick<ConfigurationDuDepot, 'forge' | 'projet' | 'baseBranch'> | null,
): string {
  if (!config) return JSON.stringify(['aucune']);
  return JSON.stringify([config.forge.toLowerCase(), config.projet.toLowerCase(), config.baseBranch]);
}

/** Le nom que les textes donnent à un dépôt : le dernier segment de son projet. */
export function nomDuDepot(projet: string): string {
  return projet.slice(projet.lastIndexOf('/') + 1);
}

/**
 * Une lecture du stockage, et tout ce qui en dérive : les réglages publics, la
 * configuration validée et la clé de destination. Les trois viennent des mêmes
 * valeurs lues.
 */
export type Instantane = {
  publics: PublicSettings;
  validation: SettingsValidation;
  destination: string;
};

export async function lireInstantane(): Promise<Instantane> {
  const [repoUrl, baseBranch, enregistre] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_KEYS.repoUrl),
    figma.clientStorage.getAsync(STORAGE_KEYS.baseBranch),
    lireJetonEnregistre(),
  ]);
  const publics: PublicSettings = {
    repoUrl: typeof repoUrl === 'string' ? repoUrl : '',
    baseBranch: typeof baseBranch === 'string' ? baseBranch : 'main',
    forgeDuJeton: enregistre.jeton.trim() ? enregistre.forge ?? 'github' : null,
  };
  const validation = validateSettings(publics, enregistre);
  return { publics, validation, destination: cleDeDestination(validation.config) };
}

/** Charge les clés locales et ne renvoie jamais le jeton à l'UI. */
export async function loadPublicSettings(): Promise<PublicSettings> {
  return (await lireInstantane()).publics;
}

/** Charge et valide la configuration complète, jeton inclus côté sandbox seulement. */
export async function loadConfiguration(): Promise<SettingsValidation> {
  return (await lireInstantane()).validation;
}

/**
 * Sauvegarde les réglages ; un jeton vide conserve la valeur déjà enregistrée.
 *
 * L'ordre des écritures est la garantie de D5 face à une sauvegarde
 * interrompue : l'ancien jeton part d'abord quand la forge change, puis la
 * forge du nouveau jeton, le jeton, et l'URL en dernier. À chaque étape, un
 * jeton enregistré porte la forge qui l'a reçu, et la validation refuse de
 * l'envoyer ailleurs.
 */
export async function saveSettings(input: SettingsInput): Promise<SettingsValidation> {
  const enregistre = await lireJetonEnregistre();
  const validation = validateSettings(input, enregistre);
  // Une erreur de saisie ne doit jamais écraser une configuration déjà valable.
  if (!validation.valid || !validation.config) return validation;

  const { forge } = validation.config;
  const saisi = input.jeton?.trim();
  if (saisi) {
    const forgeStockee = enregistre.jeton.trim() ? enregistre.forge ?? 'github' : null;
    if (forgeStockee !== null && forgeStockee !== forge) {
      await figma.clientStorage.deleteAsync(STORAGE_KEYS.jeton);
    }
    await figma.clientStorage.setAsync(STORAGE_KEYS.forgeDuJeton, forge);
    await figma.clientStorage.setAsync(STORAGE_KEYS.jeton, saisi);
  }
  await figma.clientStorage.setAsync(STORAGE_KEYS.repoUrl, input.repoUrl.trim());
  await figma.clientStorage.setAsync(STORAGE_KEYS.baseBranch, input.baseBranch.trim());
  return validation;
}
