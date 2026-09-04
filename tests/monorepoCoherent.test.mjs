/**
 * Chaque paquet de ce dépôt voit-il le kit de CE dépôt, ou une copie du registre ?
 *
 * **Ce test existe parce que la réponse a été « non » pendant six versions, sans
 * que rien ne le dise.** `packages/plugin` épinglait `@ucm-kit/core` à `0.1.0`
 * — un pin exact, la règle D7 appliquée là où elle ne vaut pas. Le kit local
 * étant passé à 0.1.6, npm ne pouvait plus satisfaire ce pin avec le workspace :
 * il a téléchargé **0.1.0 depuis le registre** dans
 * `packages/plugin/node_modules/`, et le plugin a construit, typé et testé
 * contre une copie vieille de six versions. Tout était vert.
 *
 * C'est le pire genre de défaut de ce projet : deux autorités pour la même
 * chose, dont le désaccord est muet. Le moteur produisait des contrats avec une
 * idée du format, et le lecteur les jugeait avec une autre.
 *
 * **La règle, et sa borne.** D7 exige un pin EXACT pour ce qu'un repository
 * CONSOMMATEUR installe : une plage y laisserait npm choisir une version que
 * personne n'a essayée. Elle ne dit rien d'un frère dans le même dépôt, qui
 * n'installe pas — il lit la source d'à côté, et doit la lire toujours.
 * `packages/plugin` est privé et ne se publie jamais : `*` y est la bonne
 * réponse. `packages/cli`, lui, se publie et garde son pin exact — c'est
 * pourquoi ce test vérifie la RÉSOLUTION plutôt que le texte du pin : la
 * question n'est pas ce qui est écrit, c'est ce que Node ouvre.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const kit = realpathSync(join(racine, "packages", "kit"));

/** Les workspaces de ce dépôt, lus au lieu d'être énumérés. */
function paquets() {
  return readdirSync(join(racine, "packages"), { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => entree.name);
}

test("chaque paquet qui déclare le kit résout la source de ce dépôt", () => {
  const noms = paquets();
  // Une liste vide passerait sans rien contrôler : un dossier renommé, et le
  // garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  assert.ok(noms.length >= 2, "aucun paquet trouvé sous packages/");

  const fautes = [];
  for (const nom of noms) {
    const manifeste = JSON.parse(readFileSync(join(racine, "packages", nom, "package.json"), "utf8"));
    const dependances = { ...manifeste.dependencies, ...manifeste.devDependencies };
    if (!("@ucm-kit/core" in dependances)) continue;
    if (manifeste.name === "@ucm-kit/core") continue;

    // La résolution se demande DEPUIS le paquet, comme Node la ferait pour son
    // code : c'est le seul point de vue qui dise la vérité.
    const depuis = createRequire(resolve(racine, "packages", nom, "package.json"));
    const resolu = realpathSync(dirname(depuis.resolve("@ucm-kit/core/package.json")));
    if (resolu !== kit) {
      const version = JSON.parse(readFileSync(join(resolu, "package.json"), "utf8")).version;
      fautes.push(
        `packages/${nom} déclare "${dependances["@ucm-kit/core"]}" et ouvre ${resolu} (${version}) `
          + `au lieu de packages/kit.`,
      );
    }
  }

  assert.deepEqual(
    fautes,
    [],
    "un paquet de ce dépôt lit une copie du registre au lieu du kit d'à côté",
  );
});

/**
 * Le pin d'un paquet PUBLIÉ doit suivre la version réelle du kit.
 *
 * Le test ci-dessus attrape la rechute une fois qu'elle est installée ; celui-ci
 * l'attrape à l'écriture. Sans lui, monter le kit sans monter le pin du CLI
 * laisse un paquet publié qui réclame une version que le dépôt n'a plus — et le
 * jour où npm ne peut plus lier le workspace, on retombe exactement dans le
 * défaut du plugin.
 */
test("un paquet publié épingle la version du kit que ce dépôt porte", () => {
  const versionDuKit = JSON.parse(readFileSync(join(kit, "package.json"), "utf8")).version;

  for (const nom of paquets()) {
    const manifeste = JSON.parse(readFileSync(join(racine, "packages", nom, "package.json"), "utf8"));
    if (manifeste.private === true || manifeste.name === "@ucm-kit/core") continue;
    const pin = manifeste.dependencies?.["@ucm-kit/core"];
    if (pin === undefined) continue;

    assert.equal(
      pin,
      versionDuKit,
      `packages/${nom} épingle @ucm-kit/core ${pin}, et ce dépôt porte ${versionDuKit}. `
        + `Un paquet publié garde un pin exact (D7) ; il doit donc monter avec le kit.`,
    );
  }
});
