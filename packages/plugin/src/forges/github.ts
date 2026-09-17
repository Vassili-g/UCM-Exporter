/**
 * Transport GitHub : REST minimal pour lire un dépôt, créer une branche, écrire
 * un fichier et ouvrir une pull request. Aucun jeton n'est logué ni renvoyé à
 * l'UI.
 */
import { decodeBase64, encodeBase64 } from '../base64';
import { ErreurDeForge } from './forge';
import type { DemandeOuverte, EcritureDemandee, FichierLu, Forge } from './forge';
import { TERMES_GITHUB } from './termes';

/** La configuration qu'un adaptateur lit : `projet` vaut `propriétaire/repository`. */
export type ConfigurationDeForge = { projet: string; baseBranch: string; jeton: string };

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

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

/** Encode chaque segment sans casser les dossiers imbriqués. */
function encodePath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

/**
 * Formes qu'une page GitHub relie d'elle-même : `@nom` vers un compte, `#123`
 * vers une issue. La borne de gauche est capturée faute de lookbehind dans le
 * moteur du plugin ; elle exclut l'accent grave, car ce qui est déjà du code
 * l'est.
 */
const FORMES_AUTOLIEES = /(^|[^\w`])(@[A-Za-z0-9][\w-]*|#\d+)/g;

function codeInerte(texte: string): string {
  const longueur = Math.max(0, ...[...texte.matchAll(/`+/g)].map(([suite]) => suite.length)) + 1;
  const borne = '`'.repeat(longueur);
  return `${borne}${texte}${borne}`;
}

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
export function sansLienAutomatiqueGithub(texte: string): string {
  return texte.replace(FORMES_AUTOLIEES, (_entier, avant, forme) => `${avant}${codeInerte(forme)}`);
}

/** Construit l'adaptateur GitHub d'une configuration validée. */
export function forgeGithub(config: ConfigurationDeForge): Forge {
  const repository = config.projet.split('/').map(encodeURIComponent).join('/');

  /** Effectue un appel GitHub authentifié avec un message d'erreur exploitable. */
  async function githubRequest<T>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(`${GITHUB_API}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${config.jeton}`,
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new ErreurDeForge('Impossible de joindre api.github.com.');
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
      throw new ErreurDeForge(`GitHub a répondu ${response.status}${detail}.`, response.status);
    }

    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  }

  /**
   * Retire une branche d'export qui n'a pas abouti à une PR : l'UI retombe alors
   * sur le téléchargement local, et personne n'ira jamais voir cette branche.
   * Son propre échec est ignoré : c'est l'erreur d'origine qui doit remonter à
   * l'utilisateur, pas celle du ménage qui la suit.
   */
  async function deleteBranch(branch: string): Promise<void> {
    await githubRequest(`/repos/${repository}/git/refs/heads/${encodePath(branch)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }

  /**
   * Au-delà de 1 Mo, l'API Contents rend `encoding: none` sans contenu : le
   * fichier se relit alors par son blob.
   *
   * Un fichier vide rend `content: ""`, et se lit comme un contenu vide. Le
   * prendre pour un fichier absent appliquait les défauts à un
   * `ucm.config.json` vide que la CI refuse.
   */
  async function lireFichier(chemin: string, ref = config.baseBranch): Promise<FichierLu | null> {
    let file = await githubRequest<GithubFile>(
      `/repos/${repository}/contents/${encodePath(chemin)}?ref=${encodeURIComponent(ref)}`,
      {},
      true,
    );
    if (file?.type === 'file' && file.encoding === 'none') {
      const blob = await githubRequest<GithubBlob>(
        `/repos/${repository}/git/blobs/${encodeURIComponent(file.sha)}`,
      );
      if (blob) file = { ...file, content: blob.content, encoding: blob.encoding };
    }
    if (file?.type !== 'file') return null;
    if (file.encoding === 'none' || typeof file.content !== 'string') {
      throw new ErreurDeForge(`GitHub ne rend pas le contenu de ${chemin}.`);
    }
    return { contenu: decodeBase64(file.content), version: { sha: file.sha } };
  }

  async function demandesOuvertes(): Promise<DemandeOuverte[]> {
    const demandes: DemandeOuverte[] = [];
    for (let page = 1; ; page += 1) {
      const ouvertes = await githubRequest<{ head: { ref: string }; html_url?: unknown }[]>(
        `/repos/${repository}/pulls?state=open&base=${encodeURIComponent(config.baseBranch)}&per_page=100${page === 1 ? '' : `&page=${page}`}`,
      );
      if (!ouvertes) break;
      demandes.push(...ouvertes
        .filter((pull) => typeof pull.head?.ref === 'string')
        .map((pull) => ({
          branche: pull.head.ref,
          url: typeof pull.html_url === 'string' ? pull.html_url : null,
        })));
      if (ouvertes.length < 100) break;
    }
    return demandes;
  }

  /** Branche depuis la tête de la base, fichier par l'API Contents, puis pull request. */
  async function publier(ecriture: EcritureDemandee): Promise<string> {
    const baseRef = await githubRequest<{ object: { sha: string } }>(
      `/repos/${repository}/git/ref/heads/${encodePath(ecriture.base)}`,
    );
    if (!baseRef) throw new ErreurDeForge('La branche de base ne renvoie aucun SHA.');

    await githubRequest(`/repos/${repository}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${ecriture.branche}`, sha: baseRef.object.sha }),
    });

    // Commit et PR sous le même garde : la branche ne sert qu'à porter la PR.
    let pullRequest: { html_url: string } | null;
    try {
      await githubRequest(`/repos/${repository}/contents/${encodePath(ecriture.chemin)}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: ecriture.message,
          content: encodeBase64(ecriture.contenu),
          branch: ecriture.branche,
          ...(ecriture.version ? { sha: ecriture.version.sha } : {}),
        }),
      });

      pullRequest = await githubRequest<{ html_url: string }>(`/repos/${repository}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title: ecriture.titre,
          head: ecriture.branche,
          base: ecriture.base,
          body: ecriture.corps,
        }),
      });
    } catch (error) {
      await deleteBranch(ecriture.branche);
      throw error;
    }

    // Hors du try : une PR bel et bien créée ne doit pas voir sa branche
    // supprimée sous elle, cela la refermerait aussitôt.
    if (!pullRequest?.html_url) throw new ErreurDeForge('La pull request a été créée sans URL exploitable.');
    return pullRequest.html_url;
  }

  return {
    termes: TERMES_GITHUB,
    baseBranch: config.baseBranch,
    testerDepot: async () => { await githubRequest(`/repos/${repository}`); },
    lireFichier,
    demandesOuvertes,
    publier,
    sansLienAutomatique: sansLienAutomatiqueGithub,
  };
}
