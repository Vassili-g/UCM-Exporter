/**
 * Un numéro de version publié est immuable : changer ce qu'un paquet publie
 * exige de monter son numéro dans le MÊME commit.
 *
 * **Pourquoi ce garde-fou existe, et il est arrivé deux fois.** La première, le
 * 5 septembre 2026 : T4.1 a ajouté un export à la surface du kit sans monter son
 * numéro, le dépôt portait `0.1.6` et le registre portait un AUTRE `0.1.6`, et
 * `@ucm-kit/cli` est parti en épinglant celui du registre. `publish.yml` en a
 * tiré l'« épreuve du registre », qui va vérifier depuis un dossier vierge ce
 * que le registre sert vraiment. La seconde, exactement au même endroit : le
 * correctif de T7.3 est entré dans `verdict-bilan.mjs` — l'en-tête d'un contrat
 * trop ANCIEN qui écrivait « réexporter n'y changerait rien » trois lignes
 * au-dessus d'une action demandant de réexporter — sans que `0.1.9` bouge.
 *
 * **Et l'épreuve du registre ne pouvait rien y voir, parce qu'elle ne
 * s'exécute qu'APRÈS une publication.** Ici, il n'y a pas eu de publication du
 * tout : le dépôt a simplement cessé de décrire ce qui était en ligne, et le
 * silence a duré. C'est le trou que ce test bouche, et il le bouche à
 * l'endroit inverse — avant, dans le dépôt, sans réseau.
 *
 * **Ce que ce test ne prouve PAS, et il faut l'écrire.** Il ne va pas voir le
 * registre. Il ne dit donc jamais que la version courante est publiée, ni que
 * ce qui est publié sous ce numéro est bien ce texte-ci — seule l'épreuve du
 * registre le dit, depuis dehors. Il dit une chose plus faible et purement
 * locale : *depuis le commit qui a posé ce numéro, rien de ce qui part dans le
 * tarball n'a bougé.* Un numéro jamais publié qu'on monterait pour rien ne
 * coûte rien ; un numéro publié dont le contenu a glissé coûte ce que R1 a
 * coûté.
 *
 * **Ce qu'il regarde, et pourquoi si large.** Tout le dossier du paquet, sauf
 * `tests/` et `fixtures/`, qui ne partent jamais. Pas la liste `files` : `dist/`
 * y figure alors qu'il n'est pas dans Git, et il est fabriqué depuis
 * `src/format` par `tsconfig.build.json` — une découpe fine devrait suivre
 * cette chaîne et se tromperait un jour en silence. Trop large fait monter un
 * numéro pour rien, ce qui ne coûte qu'un numéro ; trop étroit laisse passer
 * exactement la faute qu'on poursuit.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(...arguments_) {
  return execFileSync("git", arguments_, { cwd: racine, encoding: "utf8" });
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
