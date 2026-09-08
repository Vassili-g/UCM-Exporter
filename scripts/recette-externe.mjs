
/**
 * Ce qui, dans une publication, ne peut pas être prouvé sans Figma ni GitHub.
 *
 * Le relevé nomme les déclencheurs touchés et rend toujours 0. La publication
 * est gardée par `npm test`, par l'épreuve du registre qui réinstalle la
 * version publiée depuis un dossier vierge, et par le contrôle des pins
 * servis. `docs/RECETTE.md` dit quoi rejouer et quand.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Les quatre déclencheurs de la recette externe, et les fichiers qui les portent.
 */
export const DECLENCHEURS = [
  {
    nom: "le format publié ou sa fenêtre de lecture",
    prefixes: [
      "packages/kit/src/format/version.ts",
      "packages/kit/src/format/types.ts",
      "packages/kit/src/lecteurs/version-contrat.mjs",
      "packages/kit/schema/",
    ],
  },
  {
    nom: "`ucm init` ou le workflow qu'il génère",
    prefixes: ["packages/cli/src/init.mjs"],
  },
  {
    nom: "le routage GitHub du plugin",
    prefixes: [
      "packages/plugin/src/github.ts",
      "packages/plugin/src/config.ts",
      "packages/plugin/src/cible.ts",
    ],
  },
  {
    nom: "la découverte d'un adaptateur",
    prefixes: ["packages/cli/src/adaptateur.mjs"],
  },
];

/**
 * Un chemin déclaré désigne un dossier quand il finit par `/`, et un fichier
 * sinon. La nuance a coûté un faux positif dès le premier test :
 * `init.mjs.bak` commence par `init.mjs`, et un tri au seul `startsWith`
 * réclamait la recette pour un fichier de sauvegarde. Un garde-fou qui se
 * déclenche à tort est celui qu'on apprend le plus vite à déclarer sans le
 * faire.
 */
function touche(fichier, prefixe) {
  return prefixe.endsWith("/") ? fichier.startsWith(prefixe) : fichier === prefixe;
}

/**
 * Vrai si une ligne changée porte du code, et non un commentaire ou du vide.
 *
 * Une passe de style sur les commentaires d'un fichier déclencheur pèse dans un
 * diff autant qu'une refonte. Seules les lignes de code décident donc du
 * relevé.
 *
 * La classification est une heuristique, dont le sens d'erreur est choisi : une
 * ligne de gabarit commençant par `//`, une URL, passe pour un commentaire, et
 * le déclencheur reste silencieux. Aucune publication ne dépend de sa réponse.
 *
 * Les `description` du schéma comptent pour de la prose bien que JSON n'ait pas
 * de commentaires : elles sont le JSDoc de `types.ts` régénéré, et les compter
 * ferait rentrer par le schéma ce que la règle écarte de sa source.
 */
export function ligneEstDuCode(ligne, chemin = "") {
  const nue = ligne.trim();
  if (nue === "") return false;
  if (chemin.endsWith(".json")) return !/^"description"\s*:/.test(nue);
  return !(nue.startsWith("//") || nue.startsWith("/*") || nue.startsWith("*"));
}

/** Les déclencheurs qu'une liste de fichiers touche, avec les fichiers en cause. */
export function declencheursTouches(fichiers) {
  return DECLENCHEURS.map(({ nom, prefixes }) => ({
    nom,
    fichiers: fichiers.filter((fichier) => prefixes.some((prefixe) => touche(fichier, prefixe))),
  })).filter(({ fichiers }) => fichiers.length > 0);
}

function git(...arguments_) {
  return execFileSync("git", ["-c", "core.fileMode=false", ...arguments_], {
    cwd: racine,
    encoding: "utf8",
  });
}

/** La version qu'un `package.json` porte à un commit donné, ou `null`. */
function versionAuCommit(commit, chemin) {
  try {
    return JSON.parse(git("show", `${commit}:${chemin}`)).version;
  } catch {
    return null;
  }
}

/**
 * Le commit qui a posé le numéro courant d'un paquet, la même règle que
 * `tests/versionSuitLeContenu.test.mjs`, et pour la même raison : c'est lui qui
 * date le contenu publié, pas le dernier commit qui a touché le manifeste.
 */
export function commitDuNumero(chemin, versionCourante) {
  const commits = git("log", "--format=%H", "--", chemin).split("\n").filter(Boolean);
  if (commits.length === 0) return null;

  const anterieur = commits.findIndex((commit) => versionAuCommit(commit, chemin) !== versionCourante);
  if (anterieur === 0) return null;
  return anterieur === -1 ? commits.at(-1) : commits[anterieur - 1];
}

/**
 * Le commit le plus récent où le manifeste portait ce numéro, ou `null`.
 *
 * `commitDuNumero` ne répond que pour le numéro courant : il s'arrête au
 * premier commit qui en diffère. Retrouver un numéro quelconque demande de
 * parcourir l'historique jusqu'à lui.
 */
function commitDeLaVersion(chemin, version) {
  const commits = git("log", "--format=%H", "--", chemin).split("\n").filter(Boolean);
  return commits.find((commit) => versionAuCommit(commit, chemin) === version) ?? null;
}

/**
 * Le commit à partir duquel comparer, ou `null` quand aucun ne convient.
 *
 * La borne est la version que le registre sert. Un dépôt monte parfois son
 * numéro plusieurs fois entre deux publications, et le commit du numéro courant
 * laisse alors hors comparaison un changement jamais publié. Le commit qui a
 * posé la version servie porte le contenu servi, donc la comparaison part de
 * lui.
 *
 * Sans réponse du registre, la borne devient le parent du commit qui a posé le
 * numéro courant, ce commit portant lui-même son changement. Le relevé nomme
 * alors des chemins qu'une publication précédente couvrait peut-être déjà.
 */
function borneDeComparaison(chemin, courante, servie) {
  if (servie && servie !== courante) {
    const publie = commitDeLaVersion(chemin, servie);
    if (publie !== null) return publie;
  }

  const commit = commitDuNumero(chemin, courante);
  // Numéro monté dans la copie de travail : la comparaison n'a pas de borne
  // fiable, et tout ce que le dépôt porte de non commité compte déjà.
  if (commit === null) return null;

  const parent = git("rev-list", "--parents", "-n", "1", commit).trim().split(" ")[1];
  return parent ?? git("hash-object", "-t", "tree", "/dev/null").trim();
}

/** Ce qui a changé depuis la publication précédente du paquet visé. */
function fichiersDeLaVersion(paquet) {
  const chemin = `packages/${paquet}/package.json`;
  const manifeste = JSON.parse(readFileSync(join(racine, chemin), "utf8"));
  const servie = versionServie(manifeste.name);
  const commun = { nom: manifeste.name, version: manifeste.version, servie };

  const depuis = borneDeComparaison(chemin, manifeste.version, servie);
  if (depuis === null) return { ...commun, depuis: "HEAD", fichiers: [] };

  return {
    ...commun,
    depuis,
    fichiers: git("diff", "--name-only", depuis, "HEAD").split("\n").filter(Boolean),
  };
}

/**
 * Ceux de ces fichiers dont le diff porte au moins une ligne de code.
 *
 * `--unified=0` ne rend que les lignes changées : sans lui, le contexte d'un
 * changement de commentaire ramènerait le code voisin et tout fichier
 * compterait.
 */
function fichiersOuLeCodeABouge(fichiers, depuis) {
  return fichiers.filter((fichier) => {
    const patch = git("diff", "--unified=0", depuis, "HEAD", "--", fichier).split("\n");
    return patch.some(
      (ligne) =>
        /^[+-]/.test(ligne)
        && !/^(\+\+\+|---)/.test(ligne)
        && ligneEstDuCode(ligne.slice(1), fichier),
    );
  });
}

/**
 * La version que le registre sert, ou `null` s'il ne répond pas.
 *
 * Sans elle, ce script déduisait de Git seul un état qui vit sur npm : il
 * comparait « depuis le commit qui a posé le numéro courant », ce qui ne
 * désigne la publication précédente que si le numéro courant n'est pas encore
 * publié. Sur un dépôt à jour, il réclamait donc la recette pour des paquets
 * que le registre servait déjà, et un garde-fou qui crie à tort est celui
 * qu'on apprend le plus vite à ignorer.
 *
 * L'absence de réponse ne vaut jamais autorisation : hors ligne, on retombe
 * sur la lecture de Git, qui est prudente puisqu'elle réclame la recette
 * plutôt que de l'omettre.
 */
function versionServie(nom) {
  try {
    return execFileSync("npm", ["view", nom, "version"], {
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || null;
  } catch {
    return null;
  }
}

/** `node scripts/recette-externe.mjs <dossier de paquet>` */
function principal(arguments_) {
  const paquet = arguments_.find((argument) => !argument.startsWith("--"));
  if (!paquet) {
    console.error("Usage : node scripts/recette-externe.mjs <kit|cli|adapter-typescript>");
    return 2;
  }

  const { nom, version, servie, depuis, fichiers } = fichiersDeLaVersion(paquet);

  // Rien à publier, donc rien à relever. La recette précède une publication ;
  // la nommer pour un numéro que le registre sert déjà porterait une question
  // sans objet, à laquelle `npm publish` répondrait de toute façon par un 409.
  if (servie === version) {
    console.log(`${nom}@${version} est déjà servi par le registre : rien à publier, donc rien à recetter.`);
    return 0;
  }

  const touches = declencheursTouches(fichiersOuLeCodeABouge(fichiers, depuis));

  if (touches.length === 0) {
    console.log(
      `Aucun déclencheur de recette externe depuis ${depuis.slice(0, 7)} `
        + `(${fichiers.length} fichier(s) changés pour la ${version}).`,
    );
    return 0;
  }

  console.log(
    `Depuis ${depuis.slice(0, 7)}, borne de la version publiée précédente, le code a `
      + "changé dans des chemins que seule la recette externe parcourt de bout en bout :",
  );
  for (const { nom, fichiers: causes } of touches) {
    console.log(`  • ${nom}`);
    for (const cause of causes) console.log(`      ${cause}`);
  }

  console.log(
    "\nCes chemins passent par Figma, par GitHub et par une pull request, qu'aucun"
      + "\ntest ne parcourt. La publication continue ; docs/RECETTE.md dit quoi"
      + "\nrejouer.",
  );
  return 0;
}

if (process.argv[1]?.endsWith("recette-externe.mjs")) {
  process.exit(principal(process.argv.slice(2)));
}
