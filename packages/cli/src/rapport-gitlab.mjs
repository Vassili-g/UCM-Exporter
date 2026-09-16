/**
 * `ucm rapport-gitlab` : publie le rapport de `ucm check` en note d'une merge
 * request GitLab, et remplace au push suivant la note qu'il a déjà écrite.
 *
 * La commande existe parce que l'image `node:22` d'un job GitLab n'a ni `glab`
 * ni `jq`, et qu'un script recopié dans le YAML du repository ne se teste pas.
 *
 * **Le jeton se lit dans `UCM_GITLAB_TOKEN`, jamais dans un argument**, et
 * n'apparaît dans aucune sortie : le journal d'un job se lit par tout membre
 * du projet. Sans jeton, la commande le dit et sort en 0, parce que le rapport
 * reste dans les artefacts du job et que le contrôle, lui, a déjà rendu son
 * verdict.
 *
 * **Seule la note de ce compte portant le marqueur est remplacée.** Une note
 * d'un autre compte qui recopie le marqueur reste intacte : la remplacer
 * écraserait le texte d'un humain.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const MARQUEUR_RAPPORT = "<!-- ucm-rapport -->";

const API_PAR_DEFAUT = "https://gitlab.com/api/v4";

const USAGE = "ucm rapport-gitlab --projet <id> --merge-request <iid> --fichier <chemin> [--api <url>]";

const OPTIONS = { "--projet": "projet", "--merge-request": "mergeRequest", "--fichier": "fichier", "--api": "api" };

/** Lit les arguments ; rend `erreur` pour une invocation fautive. */
export function lireArgumentsRapport(arguments_) {
  const valeurs = { api: API_PAR_DEFAUT };
  for (let i = 0; i < arguments_.length; i += 1) {
    const cle = OPTIONS[arguments_[i]];
    if (!cle) return { erreur: `Argument inconnu : ${arguments_[i]}` };
    const valeur = arguments_[i + 1];
    if (valeur === undefined || valeur.startsWith("--") || valeur === "") {
      return { erreur: `${arguments_[i]} attend une valeur.` };
    }
    valeurs[cle] = valeur;
    i += 1;
  }
  for (const [option, cle] of Object.entries(OPTIONS)) {
    if (valeurs[cle] === undefined) return { erreur: `${option} est obligatoire.` };
  }
  if (!/^https:\/\//.test(valeurs.api)) return { erreur: `--api attend une adresse https : ${valeurs.api} n'en est pas une.` };
  return { valeurs: { ...valeurs, api: valeurs.api.replace(/\/+$/, "") } };
}

/** Une réponse d'API refusée, avec son statut. */
class RefusGitlab extends Error {
  constructor(statut, geste) {
    super(geste);
    this.statut = statut;
  }
}

/** Le geste qu'un statut demande, écrit pour la personne qui lit le journal du job. */
function gesteDuStatut(statut, action) {
  if (statut === 401) {
    return `GitLab refuse le jeton de UCM_GITLAB_TOKEN (401) en voulant ${action}. `
      + "Un mainteneur du projet doit créer un nouveau jeton de scope api, puis remplacer la valeur de cette variable.";
  }
  if (statut === 403) {
    return `Le jeton de UCM_GITLAB_TOKEN n'a pas le droit de ${action} (403). `
      + "Un mainteneur du projet doit lui donner le scope api et le rôle Reporter sur ce projet.";
  }
  if (statut === 404) {
    return `GitLab ne trouve pas la merge request en voulant ${action} (404). `
      + "Vérifiez --projet et --merge-request, et que le jeton a accès à ce projet.";
  }
  return `GitLab a répondu ${statut} en voulant ${action}. Relancez le job ; si la réponse ne change pas, un développeur doit la regarder.`;
}

/**
 * Publie ou remplace la note du rapport.
 *
 * Codes : 0 note écrite ou jeton absent, 1 refus de GitLab ou rapport
 * illisible, 2 invocation fautive.
 */
export async function rapportGitlab(arguments_, {
  racine = process.cwd(),
  env = process.env,
  fetch: requete = globalThis.fetch,
  ecrire = console.log,
  alerter = console.error,
} = {}) {
  const { valeurs, erreur } = lireArgumentsRapport(arguments_);
  if (erreur) {
    alerter(`${erreur}\n\n${USAGE}`);
    return 2;
  }

  const jeton = env.UCM_GITLAB_TOKEN?.trim();
  if (!jeton) {
    ecrire("UCM_GITLAB_TOKEN est absente : le rapport n'est pas publié sur la merge request. "
      + "Il reste dans les artefacts du job. Pour le publier, un mainteneur du projet doit créer "
      + "cette variable, masquée et non protégée, avec un jeton de scope api d'un compte au rôle Reporter sur ce projet.");
    return 0;
  }

  let rapport;
  try {
    rapport = readFileSync(resolve(racine, valeurs.fichier), "utf8");
  } catch (erreurLecture) {
    alerter(`Le rapport ${valeurs.fichier} ne se lit pas (${erreurLecture?.code ?? erreurLecture?.message}) : aucune note n'est publiée.`);
    return 1;
  }
  const corps = `${MARQUEUR_RAPPORT}\n${rapport}`;
  const projet = encodeURIComponent(valeurs.projet);
  const notes = `${valeurs.api}/projects/${projet}/merge_requests/${encodeURIComponent(valeurs.mergeRequest)}/notes`;

  async function appeler(url, action, init = {}) {
    let reponse;
    try {
      reponse = await requete(url, {
        ...init,
        headers: { "PRIVATE-TOKEN": jeton, "Content-Type": "application/json" },
      });
    } catch (panne) {
      throw new RefusGitlab(null, `La requête vers GitLab n'a pas abouti en voulant ${action} (${panne?.message ?? panne}). Relancez le job.`);
    }
    if (!reponse.ok) throw new RefusGitlab(reponse.status, gesteDuStatut(reponse.status, action));
    return reponse;
  }

  try {
    const compte = await (await appeler(`${valeurs.api}/user`, "lire le compte du jeton")).json();

    let existante = null;
    let page = "1";
    while (page && !existante) {
      const reponse = await appeler(`${notes}?per_page=100&sort=asc&page=${page}`, "lire les notes de la merge request");
      const lues = await reponse.json();
      existante = lues.find((note) => !note.system && note.author?.id === compte.id
        && typeof note.body === "string" && note.body.includes(MARQUEUR_RAPPORT)) ?? null;
      page = reponse.headers.get("x-next-page");
    }

    if (existante) {
      await appeler(`${notes}/${existante.id}`, "remplacer la note du rapport", { method: "PUT", body: JSON.stringify({ body: corps }) });
      ecrire(`Rapport remplacé dans la note ${existante.id} de la merge request !${valeurs.mergeRequest}.`);
    } else {
      await appeler(notes, "écrire la note du rapport", { method: "POST", body: JSON.stringify({ body: corps }) });
      ecrire(`Rapport publié en note de la merge request !${valeurs.mergeRequest}.`);
    }
    return 0;
  } catch (refus) {
    if (!(refus instanceof RefusGitlab)) throw refus;
    alerter(refus.message);
    return 1;
  }
}
