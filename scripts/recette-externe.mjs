
/**
 * Ce qui, dans une publication, ne peut pas être prouvé sans Figma ni GitHub.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Les quatre déclencheurs de N7, et les fichiers qui les portent.
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
 * Un chemin déclaré désigne un DOSSIER quand il finit par `/`, et un fichier
 * sinon. La nuance a coûté un faux positif dès le premier test :
 * `init.mjs.bak` commence par `init.mjs`, et un tri au seul `startsWith`
 * réclamait la recette pour un fichier de sauvegarde. Un garde-fou qui se
 * déclenche à tort est celui qu'on apprend le plus vite à déclarer sans le
 * faire.
 */
function touche(fichier, prefixe) {
  return prefixe.endsWith("/") ? fichier.startsWith(prefixe) : fichier === prefixe;
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
 * Le commit qui a POSÉ le numéro courant d'un paquet — la même règle que
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
 * Ce qui a changé depuis la publication précédente du paquet visé.
 *
 * La borne est le PARENT du commit qui a posé le numéro : ce commit contient
 * lui-même le changement, puisque monter le numéro et changer le contenu se
 * font dans le même commit. Sans parent — le tout premier commit du dépôt —, on
 * repart de l'arbre vide, et tout compte.
 */
function fichiersDeLaVersion(paquet) {
  const chemin = `packages/${paquet}/package.json`;
  const manifeste = JSON.parse(readFileSync(join(racine, chemin), "utf8"));
  const commit = commitDuNumero(chemin, manifeste.version);
  // Numéro monté dans la copie de travail : la comparaison n'a pas de borne
  // fiable, et tout ce que le dépôt porte de non commité compte déjà.
  if (commit === null) return { version: manifeste.version, depuis: "HEAD", fichiers: [] };

  const parent = git("rev-list", "--parents", "-n", "1", commit).trim().split(" ")[1];
  const depuis = parent ?? git("hash-object", "-t", "tree", "/dev/null").trim();
  return {
    version: manifeste.version,
    depuis,
    fichiers: git("diff", "--name-only", depuis, "HEAD").split("\n").filter(Boolean),
  };
}

/** `node scripts/recette-externe.mjs <dossier de paquet> [--faite]` */
function principal(arguments_) {
  const faite = arguments_.includes("--faite");
  const paquet = arguments_.find((argument) => !argument.startsWith("--"));
  if (!paquet) {
    console.error("Usage : node scripts/recette-externe.mjs <kit|cli|adapter-typescript> [--faite]");
    return 2;
  }

  const { version, depuis, fichiers } = fichiersDeLaVersion(paquet);
  const touches = declencheursTouches(fichiers);

  if (touches.length === 0) {
    console.log(
      `Aucun déclencheur de recette externe depuis ${depuis.slice(0, 7)} `
        + `(${fichiers.length} fichier(s) changés pour la ${version}).`,
    );
    return 0;
  }

  console.log(
    `Depuis ${depuis.slice(0, 7)}, borne de la version publiée précédente, le dépôt a `
      + "changé dans des chemins que seule la recette N6 parcourt de bout en bout :",
  );
  for (const { nom, fichiers: causes } of touches) {
    console.log(`  • ${nom}`);
    for (const cause of causes) console.log(`      ${cause}`);
  }

  if (faite) {
    console.log("\nRecette N6 déclarée rejouée et consignée. Publication autorisée.");
    return 0;
  }

  console.error(
    "\nCes chemins ne sont parcourus de bout en bout par aucun test : ils passent"
      + "\npar Figma, par GitHub et par une vraie pull request. Rejouer la recette N6 de"
      + "\ndocs/plans/PLAN-NEUTRALISATION-PLAYGROUND.md, consigner son résultat dans le"
      + "\njournal de recette, puis relancer la publication en le déclarant.",
  );
  return 1;
}

if (import.meta.url === `file: //${process.argv[1]}` || process.argv[1]?.endsWith("recette-externe.mjs")) {
  process.exit(principal(process.argv.slice(2)));
}
