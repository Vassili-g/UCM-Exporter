/**
 * Déposer un artefact UCM dans le dépôt d'une forge : où l'écrire, s'il a
 * changé, s'il entre en collision, et le corps de la demande qui le porte. Le
 * transport appartient à l'adaptateur de la forge (`forges/`).
 */
import {
  CONFIGURATION_PAR_DEFAUT,
  NOM_CONFIGURATION,
  comparerIdentiteDeContrat,
  configurationDepuisJson,
  etatDuFormatDeTokens,
  identiteDeContrat,
  versionDeContrat,
} from '@ucm-kit/core/format';

import { utf8ByteLength } from './base64';
import { causeDepuisStatut } from './connexion';
import type { CauseConnexion } from './connexion';
import { ErreurDeDescription, ErreurDeForge } from './forges/forge';
import type { Forge, VersionDeFichier } from './forges/forge';

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
 * branche de base d'une demande ouverte et `pullRequestUrl` mène à cette demande.
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

/** Qui a décidé où l'artefact s'écrit : le repository, ou les défauts du kit. */
export type LayoutSource = typeof NOM_CONFIGURATION | 'les valeurs par défaut';

/**
 * Emplacements effectifs ; `tokens` est un chemin de fichier, jamais un dossier.
 *
 * Les deux sont toujours renseignés : un champ absent de la configuration
 * prend son défaut, et un champ écrit mais vide fait refuser le fichier
 * entier. Aucun export ne peut donc plus être sans destination.
 */
export type RepositoryLayout = {
  components: string;
  tokens: string;
  source: LayoutSource;
};

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
 * `exportsEnVol`). Deux écritures du même préfixe
 * dériveraient, et la dérive serait muette : la recherche ne trouverait
 * simplement plus rien, ce qui se lit exactement comme « aucune collision ».
 */
function prefixeDeBranche(kind: ArtifactKind): string {
  return `ucm-exporter/export-${kind}-`;
}

/**
 * Où écrire, demandé au repository lui-même.
 *
 * **L'endroit vient du repository, ou des défauts que la CI applique aussi.**
 * Le plugin portait deux chemins de repli, rangés sur le poste du designer.
 * Ils ne servaient que face à un repository sans `ucm.config.json`, et c'est
 * exactement là que `ucm check` applique `CONFIGURATION_PAR_DEFAUT` : ils ne
 * pouvaient donc que déposer l'export à un endroit que le contrôle ne regarde
 * pas, la pull request s'ouvrant sur un rapport qui ne trouve aucun contrat
 * nouveau.
 *
 * **Un `ucm.config.json` présent et mal formé refuse l'export.** Retomber en
 * silence sur les défauts écrirait le contrat ailleurs que là où son
 * propriétaire l'a demandé, et le silence est précisément ce qui rend le défaut
 * incompréhensible. C'est la même doctrine que côté CI : le fichier absent est
 * le cas nominal, le fichier fautif est une erreur.
 */
export async function repositoryLayout(forge: Forge): Promise<RepositoryLayout> {
  const fichier = await forge.lireFichier(NOM_CONFIGURATION);
  if (!fichier) {
    return {
      components: CONFIGURATION_PAR_DEFAUT.components,
      tokens: CONFIGURATION_PAR_DEFAUT.tokens,
      source: 'les valeurs par défaut',
    };
  }

  let brut: unknown;
  try {
    // Un BOM en tête ferait échouer JSON.parse, et l'éditeur qui l'a écrit ne
    // le montre pas.
    brut = JSON.parse(fichier.contenu.replace(/^﻿/, ''));
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

/** Déduit le path repo sans demander de saisie par composant. */
export function artifactPath(
  artifact: RepositoryArtifact,
  layout: RepositoryLayout,
): string {
  if (artifact.kind === 'tokens') return layout.tokens;
  const componentName = artifact.filename.replace(/\.contract\.json$/i, '');
  return `${layout.components}/${componentName}/${artifact.filename}`;
}

/** L'artefact analysé, ou `null` s'il n'est pas du JSON : une ligne de couverture ne lève pas. */
function lireArtefact(artifact: RepositoryArtifact): unknown {
  try {
    return JSON.parse(artifact.content);
  } catch {
    return null;
  }
}

/**
 * La version du format que porte `tokens.json`, lue dans le fichier déposé par
 * la même lecture que le contrôle du repository, jamais dans
 * `TOKENS_FORMAT_VERSION`. Une marque illisible annonce le refus que ce
 * contrôle rendra.
 */
function ligneDeFormatDeTokens(artifact: RepositoryArtifact): string {
  const format = etatDuFormatDeTokens(lireArtefact(artifact));
  if (format.etat === 'origine') {
    return 'Version du format de tokens : absente du fichier, qui est dans la forme d’origine.';
  }
  if (format.etat === 'invalide') {
    return 'Version du format de tokens : illisible. Le contrôle du repository refusera ce fichier.';
  }
  return `Version du format de tokens : \`${format.version}\``;
}

/**
 * Identité annoncée en tête de la demande. La version est lue dans l'artefact,
 * jamais dans la constante du plugin ; l'origine emploie l'URL disponible ou, à
 * défaut, `fileName` et `nodeId`. Les intitulés passent par
 * `sansLienAutomatique`. `tokens.json`, qui n'est ni un contrat ni un
 * composant, n'annonce que sa version du format de tokens.
 */
function lignesDIdentite(artifact: RepositoryArtifact, forge: Forge): string[] {
  if (artifact.kind === 'tokens') return [ligneDeFormatDeTokens(artifact)];
  if (artifact.kind !== 'component') return [];

  // Un artefact illisible n'a ni version ni origine : le dire est exactement ce
  // que les deux branches ci-dessous écrivent.
  const contrat = lireArtefact(artifact);

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

  const nom = origine.nom === null ? 'Composant' : `« ${forge.sansLienAutomatique(origine.nom)} »`;
  const designation = origine.url === null ? nom : `[${nom}](${origine.url})`;
  const fichier = origine.fileName === null
    ? ''
    : `fichier « ${forge.sansLienAutomatique(origine.fileName)} », `;
  lignes.push(`Composant Figma : ${designation} — ${fichier}nœud \`${origine.nodeId}\``);
  return lignes;
}

/**
 * Corps de la demande ouverte pour un export.
 * L'en-tête porte l'identité de l'artefact ; la liste ne contient que les
 * diagnostics qui demandent un geste dans Figma.
 */
export function corpsDeLaDemande(path: string, artifact: RepositoryArtifact, forge: Forge): string {
  const warnings = artifact.warnings;
  const header = [
    'Export automatique depuis Figma.',
    '',
    `Fichier : \`${path}\``,
    ...lignesDIdentite(artifact, forge),
  ].join('\n');
  if (warnings.length === 0) {
    return [header, '', `Aucun avertissement d'export.`].join('\n');
  }

  const points = `${warnings.length} point${warnings.length === 1 ? '' : 's'}`;
  const debut = [
    header,
    '',
    `## ⚠️ L'export n'a pas pu décrire certaines informations (${points})`,
    '',
    'Les informations suivantes sont absentes de l’artefact exporté :',
    '',
  ];
  const fin = [
    '',
    '### Action',
    '',
    'Corrigez chaque point dans Figma, puis relancez l’export.',
    '',
    'Ces avertissements ne bloquent pas la fusion.',
  ];
  // La marge garde la place de la ligne qui compte les points omis.
  let reste = forge.termes.limiteDeCorps - 200 - [...debut, ...fin].join('\n').length;
  const lignes: string[] = [];
  for (const warning of warnings) {
    const ligne = `- ${forge.sansLienAutomatique(warning)}`;
    if (ligne.length + 1 > reste) break;
    lignes.push(ligne);
    reste -= ligne.length + 1;
  }
  const omis = warnings.length - lignes.length;
  if (omis > 0) {
    lignes.push(
      '',
      `${omis} autre${omis === 1 ? ' point ne tient' : 's points ne tiennent'} pas dans cette page : `
        + 'le compte rendu du plugin les liste tous après l’export.',
    );
  }
  return [...debut, ...lignes, ...fin].join('\n');
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
 * et rendait `false` : le statut HTTP que `ErreurDeForge` porte déjà se
 * perdait au retour, si bien qu'un jeton refusé, un droit manquant et une URL
 * fautive arrivaient à l'identique devant le designer, dont le geste diffère
 * pourtant dans les trois cas.
 */
export async function diagnostiquerConnexion(forge: Forge): Promise<DiagnosticConnexion> {
  try {
    await forge.testerDepot();
  } catch (error) {
    // Une erreur qui n'est pas une réponse de la forge ne dit rien du réseau ni
    // des droits : la nommer autrement serait attribuer une cause non établie.
    if (!(error instanceof ErreurDeForge)) return { cause: 'github-indisponible', layout: null };
    return { cause: causeDepuisStatut(error.status), statut: error.status, layout: null };
  }

  /*
   * Le repository répond ; on lui demande maintenant où il range ses fichiers.
   * Cette lecture n'avait lieu qu'à la publication, c'est-à-dire après
   * le travail : un `ucm.config.json` fautif refusait alors l'export, et le
   * designer l'apprenait une fois son composant analysé.
   */
  try {
    return { cause: 'connecte', layout: await repositoryLayout(forge) };
  } catch (error) {
    if (error instanceof ErreurDeDescription) {
      return { cause: 'depot-mal-decrit', detail: error.message, layout: null };
    }
    if (error instanceof ErreurDeForge) {
      return { cause: causeDepuisStatut(error.status), statut: error.status, layout: null };
    }
    return { cause: 'github-indisponible', layout: null };
  }
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
 * Les exports du même artefact encore en vol, c'est-à-dire dans une demande
 * ouverte et pas encore fusionnée.
 * Ils ferment les collisions de contrats et les doublons avant fusion. Un seul
 * appel liste les demandes, puis seules les branches au préfixe d'export sont
 * lues ; un échec de lecture n'est jamais assimilé à une liste vide.
 */
async function exportsEnVol(forge: Forge, kind: ArtifactKind, path: string): Promise<ExportEnVol[]> {
  const prefixe = prefixeDeBranche(kind);
  const trouves: ExportEnVol[] = [];
  for (const demande of await forge.demandesOuvertes()) {
    if (demande.branche.indexOf(prefixe) !== 0) continue;
    const fichier = await forge.lireFichier(path, demande.branche);
    if (fichier) {
      trouves.push({
        contenu: fichier.contenu,
        ou: `${forge.termes.demande} d'export ouverte, branche ${demande.branche}`,
        // L'URL n'est utile qu'au doublon, qui envoie le designer fusionner ce
        // qui est déjà déposé. Le refus de collision, lui, ne s'en sert pas :
        // le geste qu'il demande se fait dans Figma, pas sur la forge.
        url: demande.url,
      });
    }
  }
  return trouves;
}

/**
 * Ce que le repository apprend avant toute écriture.
 * La même lecture est rejouée à la publication, car branche et demandes peuvent
 * avoir changé depuis le pré-vol ; deux implémentations de ce contrôle
 * divergeraient.
 */
export type LectureDuDepot = {
  layout: RepositoryLayout;
  path: string;
  /** Le fichier déjà présent sur la branche de base, s'il y en a un. */
  surLaBase: { contenu: string; version: VersionDeFichier } | null;
  /** Le même contenu, déjà déposé quelque part. Rien à publier alors. */
  jumeau: { ou: string; url: string | null } | null;
  /** Le refus de collision d'identité, quand il y en a un. */
  refus: string | null;
};

export async function lireAvantEcriture(
  forge: Forge,
  artifact: RepositoryArtifact,
): Promise<LectureDuDepot> {
  // Le repository est interrogé avant toute écriture : il est seul à savoir où
  // ses contrats vivent, et se tromper d'endroit est indétectable ensuite.
  const layout = await repositoryLayout(forge);
  const path = artifactPath(artifact, layout);
  const ouLaBase = `branche ${forge.baseBranch}`;
  const surLaBase = await forge.lireFichier(path);

  if (surLaBase && sameContent(surLaBase.contenu, artifact.content)) {
    return { layout, path, surLaBase, jumeau: { ou: ouLaBase, url: null }, refus: null };
  }

  // Le contrôle ci-dessus ne regarde que la branche de base, et c'est là
  // qu'un artefact déjà exporté n'est pas encore : il attend dans sa demande.
  // Réexporter un contenu strictement identique en ouvrait donc une
  // seconde, en tout point pareille : un doublon que rien ne signalait.
  //
  // La lecture est celle de la détection de collision, étendue et non
  // dupliquée. Elle vient après la branche de base et pas avant, parce que le
  // cas courant (rien n'a changé depuis la dernière fusion) se tranche alors
  // sans lister aucune demande.
  const enVol = await exportsEnVol(forge, artifact.kind, path);
  const jumeau = enVol.find((occupant) => sameContent(occupant.contenu, artifact.content));
  if (jumeau) return { layout, path, surLaBase, jumeau, refus: null };

  // Ce n'est pas un refus, et son pendant n'existe pas : un contenu différent
  // pendant qu'une demande d'export est ouverte, c'est un réexport après
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
 * Écrit l'unique artefact de l'export sur une branche dédiée, puis ouvre la
 * demande.
 *
 * Rien n'est écrit avant d'avoir cherché l'artefact aux deux seuls endroits où
 * il peut déjà être : la branche de base, et les demandes d'export encore
 * ouvertes. Une demande vide n'a jamais eu de raison d'exister ; une seconde
 * demande identique non plus.
 */
export async function publishArtifact(
  forge: Forge,
  artifact: RepositoryArtifact,
  date = new Date(),
): Promise<PublishResult> {
  const { forge: nomDeForge, limiteDeFichier } = forge.termes;
  if (utf8ByteLength(artifact.content) > limiteDeFichier.octets) {
    throw new ErreurDeForge(
      `Le contrat dépasse la limite ${nomDeForge} de ${limiteDeFichier.libelle}. Il reste disponible en téléchargement local.`,
    );
  }
  // La lecture est refaite ici, même quand le pré-vol vient de la faire : entre
  // les deux, le dépôt a pu bouger. Une analyse qui autoriserait une
  // écriture sur la foi d'une lecture périmée serait pire que pas d'analyse.
  const { layout, path, surLaBase, jumeau, refus } = await lireAvantEcriture(forge, artifact);
  if (jumeau) {
    return { status: 'unchanged', path, source: layout.source, ou: jumeau.ou, pullRequestUrl: jumeau.url };
  }
  if (refus) throw new ErreurDeForge(refus);

  const branch = exportBranchName(artifact.kind, date);
  const titre = `UCM Contract Exporter: export ${artifact.filename}`;
  const pullRequestUrl = await forge.publier({
    branche: branch,
    base: forge.baseBranch,
    chemin: path,
    contenu: artifact.content,
    version: surLaBase?.version ?? null,
    message: titre,
    titre,
    corps: corpsDeLaDemande(path, artifact, forge),
  });

  return { status: 'created', path, branch, pullRequestUrl, source: layout.source };
}
