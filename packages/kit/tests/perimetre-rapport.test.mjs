/**
 * Non-régression du périmètre des états informatifs publiés sur une PR, et du
 * verdict « cette demande concerne-t-elle UCM ? » qui décide si le rapport
 * s'écrit.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { perimetreDeLaDemande } from "../src/lecteurs/perimetre-rapport.mjs";

const MOTIF = "{dir}/{id}.tsx";

/**
 * Les chemins d'un bilan portent le séparateur de la plateforme : `analyser`
 * les tire de `chemin.replace(racine, ".")`, et `cheminImplementation` les
 * résout par `node:path`. Un antislash écrit en dur passait sous Windows et
 * désignait un fichier unique sous Linux, où la résolution rendait `index.vue`
 * à la racine.
 */
const bilans = ["Alert", "Button"].map((nom) => ({
  fichier: `${nom}.contract.json`,
  relatif: join(".", "src", "components", nom, `${nom}.contract.json`),
}));

/** Raccourci : le périmètre d'une demande qui modifie ces chemins. */
function perimetre(chemins, options = {}) {
  return perimetreDeLaDemande(bilans, chemins, { motif: MOTIF, ...options });
}

test("une PR Button ne reprend pas l'état en attente de Alert", () => {
  const { bilans: selection } = perimetre("src/components/Button/Button.contract.json");

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Button.contract.json"]);
});

test("une PR sans contrat modifié ne reprend aucun ancien état", () => {
  assert.deepEqual(perimetre("").bilans, []);
});

test("un lancement hors pull request conserve le rapport global", () => {
  assert.equal(perimetreDeLaDemande(bilans, undefined, { motif: MOTIF }).bilans, bilans);
});

/**
 * Le trou que ce périmètre avait ouvert : une demande qui casse la conformité
 * dans le code seul repartait au vert, parce que la sélection ne connaissait
 * que les contrats. L'implémentation se résout par le motif de
 * `ucm.config.json`, jamais par une extension : le format ne connaît aucune
 * stack.
 */
test("une PR qui ne touche que l'implémentation garde l'état de son contrat", () => {
  const { bilans: selection, concerne } = perimetre("src/components/Button/Button.tsx");

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Button.contract.json"]);
  assert.equal(concerne, true);
});

test("le motif décide de l'implémentation, et lui seul", () => {
  const vue = perimetreDeLaDemande(bilans, "src/components/Button/index.vue", {
    motif: "{dir}/index.vue",
  });

  assert.deepEqual(vue.bilans.map((bilan) => bilan.fichier), ["Button.contract.json"]);
  assert.equal(
    perimetre("src/components/Button/index.vue").concerne,
    false,
    "sous le motif .tsx, ce fichier n'est l'implémentation de rien",
  );
});

test("hors pull request, la demande concerne toujours UCM", () => {
  assert.equal(perimetreDeLaDemande(bilans, undefined, { motif: MOTIF }).concerne, true);
});

test("une demande qui ne touche rien d'UCM ne le concerne pas", () => {
  assert.equal(perimetre(".github/workflows/ucm.yml\npackage-lock.json").concerne, false);
});

test("les tokens et la configuration concernent UCM sans qu'un contrat bouge", () => {
  assert.equal(perimetre("docs/lisez-moi.md", { tokensModifies: true }).concerne, true);
  assert.equal(perimetre("ucm.config.json").concerne, true);
});

/**
 * Le contrat se reconnaît à son nom, jamais à sa présence sur le disque.
 * Un premier export déposé hors du dossier déclaré n'est trouvé par personne :
 * c'est exactement la demande où le rapport doit parler, puisque lui seul
 * nomme le dossier cherché.
 */
test("un contrat déposé là où personne ne le cherche concerne quand même UCM", () => {
  const { bilans: selection, concerne } = perimetreDeLaDemande(
    [],
    "src/composants/Button/Button.contract.json",
    { motif: MOTIF },
  );

  assert.deepEqual(selection, []);
  assert.equal(concerne, true);
});

test("un contrat supprimé par la demande la fait concerner UCM", () => {
  assert.equal(perimetre("src/components/Card/Card.contract.json").concerne, true);
});

/**
 * `git diff` rend des `/` sur toute plateforme, et un bilan produit sous
 * Windows porte des `\`. Sans normalisation, aucun contrat ne serait jamais
 * reconnu sur cette plateforme, et tout le rapport y perdrait sa portée.
 */
test("un bilan écrit avec des antislashs désigne le contrat que git nomme avec des slashs", () => {
  const windows = [{
    fichier: "Alert.contract.json",
    relatif: ".\\src\\components\\Alert\\Alert.contract.json",
  }];
  const { bilans: selection } = perimetreDeLaDemande(
    windows,
    "src/components/Alert/Alert.contract.json",
    { motif: MOTIF },
  );

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Alert.contract.json"]);
});
