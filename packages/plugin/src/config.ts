/**
 * Configuration optionnelle des dépôts : sur quelle forge publier, où, et avec
 * quel jeton.
 *
 * Les dépôts sont rangés dans `figma.clientStorage`, donc localement sur la
 * machine de l'utilisateur et jamais dans le document Figma. Le jeton ne quitte
 * le sandbox que lorsqu'il est saisi par l'UI au moment de l'enregistrement.
 *
 * Ce qui est rangé ici décrit une machine, pas un repository : l'endroit où un
 * export atterrit n'en fait donc pas partie, et vit dans `depot.ts`, qui le
 * demande au repository lui-même.
 */
import { TERMES } from './forges/termes';
import type { NomDeForge } from './forges/termes';
import type { DepotPublic } from './messages';

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

/** Valeurs envoyées par l'UI lors d'un enregistrement. */
export type SettingsInput = RepositorySettings & {
  /** Vide = conserver le jeton déjà enregistré pour ce dépôt. */
  jeton?: string;
};

/**
 * Un dépôt tel que le stockage le garde. Le jeton voyage dans l'entrée de son
 * adresse, écrite en une seule écriture : aucune étape ne l'associe à une autre.
 */
export type DepotEnregistre = RepositorySettings & { jeton: string };

const STORAGE_KEYS = {
  /** Tableau de `DepotEnregistre`, dans l'ordre d'ajout. */
  depots: 'depots',
  /** Identité du dépôt actif ; une identité absente de `depots` vaut « aucun ». */
  depotActif: 'depotActif',
  /** Booléen, absent vaut `true` : l'équipe du design system emploie les tokens. */
  gestionDesTokens: 'gestionDesTokens',
} as const;

/**
 * Les clés du plugin à un seul dépôt, lues une fois par la reprise puis
 * effacées. Un jeton sans `forge_du_jeton` a été saisi pour GitHub.
 */
const ANCIENNES_CLES = {
  repoUrl: 'repoUrl',
  baseBranch: 'baseBranch',
  jeton: 'github_pat',
  forgeDuJeton: 'forge_du_jeton',
} as const;

/** Résultat de validation détaillé pour alimenter les erreurs inline de l'UI. */
export type SettingsValidation = {
  valid: boolean;
  /** Par champ, et `general` pour une erreur qui ne tient à aucun champ. */
  errors: Partial<Record<keyof SettingsInput | 'general', string>>;
  config: ConfigurationDuDepot | null;
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

/** Le jeton enregistré pour un dépôt, et la forge qui l'a reçu. */
export type JetonEnregistre = { jeton: string; forge: NomDeForge | null };

/**
 * Valide et normalise les réglages d'un dépôt avant tout appel réseau.
 *
 * L'ouverture, le pré-vol, la publication, l'enregistrement et la reprise des
 * anciennes clés passent tous par ici, entrée par entrée, avec le jeton de
 * cette entrée. Un champ vide conserve le jeton enregistré seulement si sa forge
 * est celle de l'URL : la reprise d'une ancienne configuration en dépend.
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

  if (adresse) {
    const termes = TERMES[adresse.forge];
    const prefixe = forgeDuPrefixe(saisi);
    if (saisi && prefixe && prefixe !== adresse.forge) {
      errors.jeton = `Ce jeton est un jeton ${TERMES[prefixe].forge}. Collez un ${termes.nomDuJeton} ${termes.forge}.`;
      jeton = '';
    } else if (!saisi && stocke && forgeStockee === adresse.forge) {
      jeton = stocke;
    } else if (!saisi && stocke) {
      errors.jeton = `Le jeton enregistré ne sert pas pour ${termes.forge}. Collez un ${termes.nomDuJeton} ${termes.forge}.`;
    } else if (!saisi) {
      errors.jeton = `Le ${termes.nomDuJeton} est obligatoire pour ouvrir une ${termes.demande}.`;
    }
  } else if (!saisi && !stocke) {
    errors.jeton = 'Le jeton d’accès est obligatoire.';
  }

  if (!adresse || !baseBranch || !jeton || errors.jeton) {
    return { valid: false, errors, config: null };
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
  };
}

/**
 * L'identité d'un dépôt : sa forge et son projet, le projet en minuscules.
 * GitHub et GitLab servent un chemin quelle que soit sa casse : deux entrées
 * pour un même projet ne se distinguent pas autrement.
 */
export function identiteDuDepot({ forge, projet }: { forge: NomDeForge; projet: string }): string {
  return `${forge}:${projet.toLowerCase()}`;
}

/** L'adresse d'une entrée enregistrée, que la lecture du stockage a déjà validée. */
function adresseDe(entree: DepotEnregistre): AdresseDuDepot {
  return lireAdresseDuDepot(entree.repoUrl) as AdresseDuDepot;
}

function estUneEntree(valeur: unknown): valeur is DepotEnregistre {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const { repoUrl, baseBranch, jeton } = valeur as Record<string, unknown>;
  return typeof repoUrl === 'string' && typeof baseBranch === 'string' && typeof jeton === 'string'
    && lireAdresseDuDepot(repoUrl) !== null;
}

/**
 * La liste `depots`, ou `null` quand elle n'a jamais été écrite. Une liste que
 * le plugin n'a pas pu écrire ainsi lève : la reprise ne l'écrase jamais.
 */
async function lireDepots(): Promise<DepotEnregistre[] | null> {
  const valeur = await figma.clientStorage.getAsync(STORAGE_KEYS.depots);
  if (valeur === undefined) return null;
  if (!Array.isArray(valeur) || !valeur.every(estUneEntree)) {
    throw new Error('La liste des dépôts enregistrés sur ce poste est illisible.');
  }
  return valeur;
}

/** Le jeton d'une entrée, rattaché à la forge de son adresse. */
function jetonDe(entree: DepotEnregistre): JetonEnregistre {
  return { jeton: entree.jeton, forge: adresseDe(entree).forge };
}

/**
 * Reprend le dépôt du plugin à un seul dépôt, puis efface ses quatre clés.
 *
 * Tant que `depots` est absente, la configuration ancienne passe par
 * `validateSettings` ; valide, elle devient la première entrée, active. Écrire
 * `depots`, même vide, marque la reprise faite : une ouverture suivante ne
 * termine que l'effacement, sans réimporter ni écraser. Un échec d'écriture de
 * `depots` laisse les anciennes clés pour la prochaine ouverture.
 */
export async function reprendreLAncienneConfiguration(): Promise<void> {
  if ((await lireDepots()) === null) {
    const [repoUrl, baseBranch, jeton, forge] = await Promise.all([
      figma.clientStorage.getAsync(ANCIENNES_CLES.repoUrl),
      figma.clientStorage.getAsync(ANCIENNES_CLES.baseBranch),
      figma.clientStorage.getAsync(ANCIENNES_CLES.jeton),
      figma.clientStorage.getAsync(ANCIENNES_CLES.forgeDuJeton),
    ]);
    const { config } = validateSettings(
      {
        repoUrl: typeof repoUrl === 'string' ? repoUrl : '',
        baseBranch: typeof baseBranch === 'string' ? baseBranch : 'main',
      },
      {
        jeton: typeof jeton === 'string' ? jeton : '',
        forge: forge === 'github' || forge === 'gitlab' ? forge : null,
      },
    );
    const reprise = config ? [{ repoUrl: config.repoUrl, baseBranch: config.baseBranch, jeton: config.jeton }] : [];
    await figma.clientStorage.setAsync(STORAGE_KEYS.depots, reprise);
    if (config) await figma.clientStorage.setAsync(STORAGE_KEYS.depotActif, identiteDuDepot(config));
  }
  for (const cle of Object.values(ANCIENNES_CLES)) await figma.clientStorage.deleteAsync(cle);
}

/**
 * La clé de destination : l'endroit où un export irait et ce que son analyse
 * vérifie, sans le jeton.
 *
 * Un tuple JSON, parce qu'une branche peut contenir `|`, `@` ou `/`. La forge
 * et le projet passent en minuscules : GitHub et GitLab servent un chemin
 * quelle que soit sa casse. La branche garde la sienne. Sans configuration
 * valide, l'export est téléchargé : le dépôt vaut alors `aucune`. Le dernier
 * membre est le réglage de la gestion des tokens.
 */
export function cleDeDestination(
  config: Pick<ConfigurationDuDepot, 'forge' | 'projet' | 'baseBranch'> | null,
  tokens: boolean,
): string {
  const depot = config ? [config.forge.toLowerCase(), config.projet.toLowerCase(), config.baseBranch] : ['aucune'];
  return JSON.stringify([...depot, tokens]);
}

/** `true` quand deux clés de destination désignent le même dépôt, quel que soit le réglage des tokens. */
export function memeDepot(cle: string, autre: string): boolean {
  const depot = (valeur: string) => JSON.stringify((JSON.parse(valeur) as unknown[]).slice(0, -1));
  return depot(cle) === depot(autre);
}

/** Le réglage « Gérer les tokens » de ce poste. */
export async function lireGestionDesTokens(): Promise<boolean> {
  return (await figma.clientStorage.getAsync(STORAGE_KEYS.gestionDesTokens)) !== false;
}

export async function ecrireGestionDesTokens(valeur: boolean): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEYS.gestionDesTokens, valeur);
}

/** Le nom que les textes donnent à un dépôt : le dernier segment de son projet. */
export function nomDuDepot(projet: string): string {
  return projet.slice(projet.lastIndexOf('/') + 1);
}

/**
 * Une lecture du stockage, et tout ce qui en dérive : la liste publique des
 * dépôts, la configuration validée du dépôt actif et la clé de destination.
 * Tous viennent des mêmes valeurs lues.
 */
export type Instantane = {
  depots: DepotPublic[];
  /** L'identité du dépôt actif, `null` quand aucune entrée ne la porte. */
  actif: string | null;
  validation: SettingsValidation;
  /** Le réglage « Gérer les tokens ». */
  tokens: boolean;
  destination: string;
};

const AUCUNE_CONFIGURATION: SettingsValidation = { valid: false, errors: {}, config: null };

function publicDe(entree: DepotEnregistre): DepotPublic {
  const { forge, projet } = adresseDe(entree);
  return {
    id: identiteDuDepot({ forge, projet }),
    forge,
    projet,
    nom: nomDuDepot(projet),
    repoUrl: entree.repoUrl,
    baseBranch: entree.baseBranch,
    jeton: entree.jeton.trim() !== '',
  };
}

export async function lireInstantane(): Promise<Instantane> {
  const [enregistres, actifLu, tokens] = await Promise.all([
    lireDepots(),
    figma.clientStorage.getAsync(STORAGE_KEYS.depotActif),
    lireGestionDesTokens(),
  ]);
  const depots = enregistres ?? [];
  // Un `depotActif` qui désigne une entrée absente se lit comme « aucun dépôt actif ».
  const actif = depots.find((entree) => identiteDuDepot(adresseDe(entree)) === actifLu) ?? null;
  const validation = actif ? validateSettings(actif, jetonDe(actif)) : AUCUNE_CONFIGURATION;
  return {
    depots: depots.map(publicDe),
    actif: actif ? identiteDuDepot(adresseDe(actif)) : null,
    validation,
    tokens,
    destination: cleDeDestination(validation.config, tokens),
  };
}

/** Charge et valide la configuration du dépôt actif, jeton inclus côté sandbox seulement. */
export async function loadConfiguration(): Promise<SettingsValidation> {
  return (await lireInstantane()).validation;
}

/** Ce qu'un enregistrement rend : la validation, et l'identité de l'entrée écrite. */
export type Enregistrement = { validation: SettingsValidation; id: string | null };

function refus(errors: SettingsValidation['errors'], id: string | null): Enregistrement {
  return { validation: { valid: false, errors, config: null }, id };
}

/**
 * Enregistre un dépôt nouveau (`id` nul), ou modifie la branche et le jeton de
 * l'entrée `id`. Une entrée s'écrit en une seule écriture de `depots`.
 *
 * L'adresse d'une entrée enregistrée ne change pas : le jeton reste attaché au
 * projet pour lequel il a été collé, même si l'interface a laissé passer le
 * champ. Le premier dépôt d'une liste vide devient actif, par une seconde
 * écriture ; une interruption entre les deux laisse un dépôt enregistré sans
 * dépôt actif.
 */
export async function enregistrerDepot(input: SettingsInput, id: string | null): Promise<Enregistrement> {
  const depots = (await lireDepots()) ?? [];
  const adresse = lireAdresseDuDepot(input.repoUrl);

  if (id !== null) {
    const rang = depots.findIndex((entree) => identiteDuDepot(adresseDe(entree)) === id);
    if (rang === -1) return refus({ general: 'Ce dépôt n’est plus dans la liste.' }, id);
    if (!adresse || identiteDuDepot(adresse) !== id) {
      return refus({ repoUrl: 'L’adresse d’un dépôt enregistré ne change pas. Pour un autre projet, ajoutez un dépôt.' }, id);
    }
    const existante = depots[rang];
    const validation = validateSettings({ ...input, repoUrl: existante.repoUrl }, jetonDe(existante));
    if (!validation.config) return { validation, id };
    const suivants = [...depots];
    suivants[rang] = { repoUrl: existante.repoUrl, baseBranch: validation.config.baseBranch, jeton: validation.config.jeton };
    await figma.clientStorage.setAsync(STORAGE_KEYS.depots, suivants);
    return { validation, id };
  }

  const validation = validateSettings(input);
  if (!validation.config) return { validation, id: null };
  const nouvelle = identiteDuDepot(validation.config);
  if (depots.some((entree) => identiteDuDepot(adresseDe(entree)) === nouvelle)) {
    return refus({ repoUrl: `Ce ${TERMES[validation.config.forge].depot} est déjà dans la liste.` }, null);
  }
  const { repoUrl, baseBranch, jeton } = validation.config;
  await figma.clientStorage.setAsync(STORAGE_KEYS.depots, [...depots, { repoUrl, baseBranch, jeton }]);
  if (depots.length === 0) await figma.clientStorage.setAsync(STORAGE_KEYS.depotActif, nouvelle);
  return { validation, id: nouvelle };
}

/**
 * Retire l'entrée `id`, jeton compris, puis le dépôt actif s'il la désignait.
 * Une interruption entre les deux laisse un `depotActif` sans entrée, lu comme
 * « aucun dépôt actif ».
 */
export async function supprimerDepot(id: string): Promise<void> {
  const depots = (await lireDepots()) ?? [];
  await figma.clientStorage.setAsync(
    STORAGE_KEYS.depots,
    depots.filter((entree) => identiteDuDepot(adresseDe(entree)) !== id),
  );
  if ((await figma.clientStorage.getAsync(STORAGE_KEYS.depotActif)) === id) {
    await figma.clientStorage.deleteAsync(STORAGE_KEYS.depotActif);
  }
}

/**
 * Rend actif le dépôt `id`, par une seule écriture. Une identité absente de la
 * liste ne s'écrit pas : `depotActif` ne désigne qu'une entrée enregistrée.
 */
export async function activerDepot(id: string): Promise<void> {
  const depots = (await lireDepots()) ?? [];
  if (!depots.some((entree) => identiteDuDepot(adresseDe(entree)) === id)) return;
  await figma.clientStorage.setAsync(STORAGE_KEYS.depotActif, id);
}

/**
 * La configuration validée de l'entrée `id`, active ou non, pour le test de sa
 * carte ; `null` quand l'entrée n'est plus dans la liste.
 */
export async function lireConfigurationDe(id: string): Promise<{ config: ConfigurationDuDepot; tokens: boolean } | null> {
  const [depots, tokens] = await Promise.all([lireDepots(), lireGestionDesTokens()]);
  const entree = (depots ?? []).find((candidate) => identiteDuDepot(adresseDe(candidate)) === id);
  const config = entree ? validateSettings(entree, jetonDe(entree)).config : null;
  return config ? { config, tokens } : null;
}
