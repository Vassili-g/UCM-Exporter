/**
 * Transport GitLab : REST v4 de gitlab.com pour lire un projet, écrire un
 * fichier par un commit atomique et ouvrir une merge request. Aucun jeton
 * n'est logué ni renvoyé à l'UI.
 *
 * Le projet, le chemin d'un fichier et le nom d'une branche forment chacun un
 * seul segment d'URL : GitLab les lit encodés en entier, barres comprises.
 */
import { decodeBase64 } from '../base64';
import { ErreurDeForge } from './forge';
import type { DemandeOuverte, EcritureDemandee, FichierLu, Forge } from './forge';
import type { ConfigurationDeForge } from './github';
import { TERMES_GITLAB } from './termes';

const GITLAB_API = 'https://gitlab.com/api/v4';

/**
 * Formes que GitLab relie d'elles-mêmes dans une description ou une note :
 * référence croisée `groupe/projet#1` ou `groupe/projet!1`, `@nom`, `#1`, `!1`,
 * `~label`, `%jalon`, `$1` et `&1`. La référence croisée précède les formes
 * courtes, qui en captureraient la fin. Un point final n'appartient pas au
 * nom. La borne de gauche est capturée faute
 * de lookbehind ; elle exclut l'accent grave, car ce qui est déjà du code l'est.
 */
const FORMES_AUTOLIEES = new RegExp(
  '(^|[^\\w`])('
    + '[\\w.-]+(?:/[\\w.-]+)+[#!]\\d+'
    + '|@[A-Za-z0-9](?:[\\w.-]*[\\w-])?'
    + '|[#!$&]\\d+'
    + '|[~%](?:"[^"\\n]+"|[A-Za-z0-9_](?:[\\w.-]*[\\w-])?)'
    + ')',
  'g',
);

/** Une ligne qui commence par `/` : GitLab l'exécute comme action rapide, puis la retire du texte. */
const ACTION_RAPIDE = /^([ \t]*)(\/\S+)/gm;

/**
 * Rend un texte inerte dans une page GitLab.
 *
 * Un message cite les intitulés Figma tels quels. GitLab en ferait des liens,
 * notifierait un compte, et exécuterait une ligne comme `/close` au moment où
 * la merge request s'ouvre. La forme reconnue part en `code`, que GitLab ne
 * relie ni n'exécute, et qui se lit comme elle s'écrit dans Figma.
 */
export function sansLienAutomatiqueGitlab(texte: string): string {
  return texte.replace(FORMES_AUTOLIEES, '$1`$2`').replace(ACTION_RAPIDE, '$1`$2`');
}

/** Le message d'une réponse d'erreur, qui est une chaîne ou un objet de champs. */
function detailDeReponse(corps: unknown): string {
  if (!corps || typeof corps !== 'object') return '';
  const { message, error } = corps as { message?: unknown; error?: unknown };
  const brut = message ?? error;
  if (brut === undefined) return '';
  return ` : ${typeof brut === 'string' ? brut : JSON.stringify(brut)}`;
}

/** Construit l'adaptateur GitLab d'une configuration validée. */
export function forgeGitlab(config: ConfigurationDeForge): Forge {
  const projet = `/projects/${encodeURIComponent(config.projet)}`;

  async function gitlabRequest<T>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(`${GITLAB_API}${path}`, {
        ...init,
        headers: {
          'PRIVATE-TOKEN': config.jeton,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new ErreurDeForge('Impossible de joindre gitlab.com.');
    }

    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      let detail = '';
      try {
        detail = detailDeReponse(await response.json());
      } catch {
        // Une réponse non JSON reste décrite par son statut HTTP.
      }
      throw new ErreurDeForge(`GitLab a répondu ${response.status}${detail}.`, response.status);
    }

    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  }

  async function lireFichier(chemin: string, ref = config.baseBranch): Promise<FichierLu | null> {
    const fichier = await gitlabRequest<{ content?: string; commit_id: string; last_commit_id: string }>(
      `${projet}/repository/files/${encodeURIComponent(chemin)}?ref=${encodeURIComponent(ref)}`,
      {},
      true,
    );
    // Un fichier vide rend `content: ""` : il existe, et se lit vide.
    if (typeof fichier?.content !== 'string') return null;
    return {
      contenu: decodeBase64(fichier.content),
      version: { commitId: fichier.commit_id, lastCommitId: fichier.last_commit_id },
    };
  }

  async function demandesOuvertes(): Promise<DemandeOuverte[]> {
    const ouvertes = await gitlabRequest<{
      source_branch?: unknown;
      web_url?: unknown;
      project_id?: unknown;
      source_project_id?: unknown;
    }[]>(
      `${projet}/merge_requests?state=opened&target_branch=${encodeURIComponent(config.baseBranch)}&per_page=100`,
    );
    if (!ouvertes) return [];
    // Une merge request venue d'une fourche porte une branche d'un autre projet,
    // que la lecture de fichier chercherait en vain dans celui-ci.
    return ouvertes
      .filter((demande) => typeof demande.source_branch === 'string'
        && demande.source_project_id === demande.project_id)
      .map((demande) => ({
        branche: demande.source_branch as string,
        url: typeof demande.web_url === 'string' ? demande.web_url : null,
      }));
  }

  /**
   * Un commit crée la branche et le fichier d'un seul appel, depuis la version
   * lue : GitLab refuse en 400 une branche qui existe déjà et ne crée alors
   * rien. Seul l'échec de la merge request laisse une branche à retirer.
   */
  async function publier(ecriture: EcritureDemandee): Promise<string> {
    let startSha = ecriture.version?.commitId;
    if (!startSha) {
      const base = await gitlabRequest<{ commit?: { id?: string } }>(
        `${projet}/repository/branches/${encodeURIComponent(ecriture.base)}`,
      );
      startSha = base?.commit?.id;
      if (!startSha) throw new ErreurDeForge('La branche de base ne renvoie aucun SHA.');
    }

    await gitlabRequest(`${projet}/repository/commits`, {
      method: 'POST',
      body: JSON.stringify({
        branch: ecriture.branche,
        start_sha: startSha,
        commit_message: ecriture.message,
        actions: [
          ecriture.version
            ? {
              action: 'update',
              file_path: ecriture.chemin,
              content: ecriture.contenu,
              last_commit_id: ecriture.version.lastCommitId,
            }
            : { action: 'create', file_path: ecriture.chemin, content: ecriture.contenu },
        ],
      }),
    });

    let demande: { web_url?: string } | null;
    try {
      demande = await gitlabRequest<{ web_url?: string }>(`${projet}/merge_requests`, {
        method: 'POST',
        body: JSON.stringify({
          source_branch: ecriture.branche,
          target_branch: ecriture.base,
          title: ecriture.titre,
          description: ecriture.corps,
          remove_source_branch: true,
        }),
      });
    } catch (error) {
      await gitlabRequest(`${projet}/repository/branches/${encodeURIComponent(ecriture.branche)}`, {
        method: 'DELETE',
      }).catch(() => undefined);
      throw error;
    }

    if (!demande?.web_url) throw new ErreurDeForge('La merge request a été créée sans URL exploitable.');
    return demande.web_url;
  }

  return {
    termes: TERMES_GITLAB,
    baseBranch: config.baseBranch,
    testerDepot: async () => { await gitlabRequest(projet); },
    lireFichier,
    demandesOuvertes,
    publier,
    sansLienAutomatique: sansLienAutomatiqueGitlab,
  };
}
