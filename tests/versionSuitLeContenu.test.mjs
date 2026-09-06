/** Un contenu publiable modifié exige une nouvelle version dans le même commit. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `core.fileMode=false` n'est pas un confort, et la CI l'a prouvé au premier
 * essai : `npm ci` pose le bit exécutable sur `packages/cli/src/ucm.mjs`, qui
 * est le `bin` du CLI et que Git suit en `100644`. Sur Linux, `git diff` compte
 * ce changement de MODE comme un fichier modifié ; sur le poste Windows où ce
 * test est né, `core.fileMode` vaut déjà `false` et il ne le voyait pas. Le
 * garde-fou a donc crié à tort, sur un fichier que personne n'avait touché.
 * Le mode ne part pas au registre — npm pose ce bit à l'empaquetage quoi qu'il
 * arrive —, donc seul le CONTENU se compare ici. Et un garde-fou qui crie à
 * tort est celui qu'on apprend le plus vite à ignorer.
 */
function git(...arguments_) {
  return execFileSync("git", ["-c", "core.fileMode=false", ...arguments_], {
    cwd: racine,
    encoding: "utf8",
  });
}

/** La version qu'un `package.json` porte à un commit donné, ou `null` s'il n'y était pas. */
function versionAuCommit(commit, chemin) {
  try {
    return JSON.parse(git("show", `${commit}:${chemin}`)).version;
  } catch {
    return null;
  }
}

/**
 * Le commit qui a POSÉ le numéro courant — pas le dernier qui a touché le
 * manifeste. Les deux diffèrent dès qu'on corrige une description ou une
 * dépendance sans publier, et c'est le premier qui date le contenu publié.
 *
 * Rend `null` quand le numéro courant n'est dans aucun commit : la montée est
 * dans la copie de travail, donc elle accompagne les changements par
 * construction et il n'y a rien à reprocher.
 */
function commitDuNumero(chemin, versionCourante) {
  const commits = git("log", "--format=%H", "--", chemin).split("\n").filter(Boolean);
  assert.ok(commits.length > 0, `${chemin} n'est dans aucun commit : l'historique ne peut rien dire.`);

  const anterieur = commits.findIndex((commit) => versionAuCommit(commit, chemin) !== versionCourante);
  if (anterieur === 0) return null;
  return anterieur === -1 ? commits.at(-1) : commits[anterieur - 1];
}

/** Ce qui a changé depuis un commit, copie de travail et fichiers neufs compris. */
function changeDepuis(commit, dossier) {
  const suivis = git("diff", "--name-only", commit, "--", dossier);
  const neufs = git("ls-files", "--others", "--exclude-standard", "--", dossier);
  return [...suivis.split("\n"), ...neufs.split("\n")]
    .filter(Boolean)
    .filter((fichier) => !fichier.startsWith(`${dossier}/tests/`))
    .filter((fichier) => !fichier.startsWith(`${dossier}/fixtures/`));
}

/** Les paquets que ce dépôt publie, lus au lieu d'être énumérés. */
function paquetsPublies() {
  return git("ls-files", "--", "packages/*/package.json")
    .split("\n")
    .filter(Boolean)
    .map((chemin) => ({ chemin, manifeste: JSON.parse(readFileSync(join(racine, chemin), "utf8")) }))
    .filter(({ manifeste }) => manifeste.private !== true);
}

test("le contenu publiable d'un paquet n'a pas bougé depuis le commit qui a posé son numéro", () => {
  const paquets = paquetsPublies();
  // Zéro paquet passerait sans rien contrôler : un dossier renommé, et le
  // garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  assert.ok(paquets.length >= 2, "aucun paquet publiable trouvé sous packages/");

  const fautes = [];
  for (const { chemin, manifeste } of paquets) {
    const commit = commitDuNumero(chemin, manifeste.version);
    if (commit === null) continue;

    const dossier = dirname(chemin);
    const changes = changeDepuis(commit, dossier);
    if (changes.length > 0) {
      fautes.push(
        `${manifeste.name} porte ${manifeste.version}, posée en ${commit.slice(0, 7)}, et `
          + `${changes.length} fichier(s) publiable(s) ont changé depuis : ${changes.join(", ")}. `
          + `Le registre sert un ${manifeste.version} qui n'est plus celui-ci — monter le numéro.`,
      );
    }
  }

  assert.deepEqual(fautes, [], "un paquet publie autre chose que ce que son numéro annonce");
});
