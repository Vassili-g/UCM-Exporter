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

export type PublishResult =
  | { status: 'unchanged'; path: string; source: LayoutSource }
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
  components: string;
  tokens: string;
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
    tokens: `${config.tokensPath}/tokens.json`,
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
    throw new GithubApiError(
      `${NOM_CONFIGURATION} du repository n'est pas du JSON valide : impossible de savoir où écrire cet export. Un développeur doit corriger ce fichier.`,
    );
  }

  const { configuration, erreur } = configurationDepuisJson(brut);
  if (erreur) throw new GithubApiError(`${erreur} Un développeur doit corriger ce fichier.`);

  return {
    components: configuration.components,
    tokens: configuration.tokens,
    source: NOM_CONFIGURATION,
  };
}

/** Déduit le path repo sans demander de saisie par composant. */
export function artifactPath(
  artifact: RepositoryArtifact,
  layout: RepositoryLayout,
): string {
  if (artifact.kind === 'tokens') return layout.tokens;
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
 * Les exports du même artefact encore EN VOL, c'est-à-dire dans une pull request
 * ouverte et pas encore fusionnée.
 *
 * **Le trou que ceci referme.** `getRepositoryFile` interroge la branche de
 * base : un contrat qui n'existe que dans une PR d'export ouverte y est
 * invisible. Deux composants en collision exportés coup sur coup ouvriraient
 * donc deux pull requests sur le même chemin sans qu'aucun refus n'ait lieu, et
 * la collision ne se révélerait qu'à la fusion de la seconde — en écrasant la
 * première, c'est-à-dire précisément le cas qu'on prétend avoir fermé.
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
async function contratsEnVol(
  config: GithubConfig,
  repository: string,
  kind: ArtifactKind,
  path: string,
): Promise<{ contenu: string; ou: string }[]> {
  const ouvertes = await githubRequest<{ head: { ref: string } }[]>(
    config,
    `/repos/${repository}/pulls?state=open&base=${encodeURIComponent(config.baseBranch)}&per_page=100`,
  );
  if (!ouvertes) return [];

  const prefixe = prefixeDeBranche(kind);
  const trouves: { contenu: string; ou: string }[] = [];
  for (const pull of ouvertes) {
    const branche = pull.head?.ref;
    if (typeof branche !== 'string' || branche.indexOf(prefixe) !== 0) continue;
    const fichier = await getRepositoryFile(config, path, branche);
    if (fichier?.type === 'file' && fichier.content) {
      trouves.push({
        contenu: decodeBase64(fichier.content),
        ou: `pull request d'export ouverte, branche ${branche}`,
      });
    }
  }
  return trouves;
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
  // Le repository est interrogé AVANT toute écriture : il est seul à savoir où
  // ses contrats vivent, et se tromper d'endroit est indétectable ensuite.
  const layout = await repositoryLayout(config);
  const path = artifactPath(artifact, layout);
  const existing = await getRepositoryFile(config, path);
  if (existing?.type === 'file' && existing.content && sameContent(decodeBase64(existing.content), artifact.content)) {
    return { status: 'unchanged', path, source: layout.source };
  }

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
        ? [{ contenu: decodeBase64(existing.content), ou: `branche ${config.baseBranch}` }]
        : []),
      ...(await contratsEnVol(config, repository, artifact.kind, path)),
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
