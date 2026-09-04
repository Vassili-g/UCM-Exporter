/**
 * Ce qu'un repository dit de lui-même, et ce qu'on refuse de le laisser dire.
 *
 * Deux bornes structurent tout ce fichier, et elles tirent en sens inverse :
 * l'ABSENCE de configuration est le cas nominal — un repo neuf doit marcher
 * sans écrire une ligne —, tandis qu'une configuration PRÉSENTE et mal formée
 * est un refus. Là, quelqu'un a voulu dire quelque chose ; retomber
 * silencieusement sur les défauts ferait chercher un contrat là où il n'est
 * pas, sans que rien ne le signale.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CONFIGURATION_PAR_DEFAUT,
  NOM_CONFIGURATION,
  champsInvalidesDeLaConfiguration,
} from "@ucm-kit/core/format";
import { lireConfiguration } from "@ucm-kit/core/lecteurs";

/** Monte un repository jouet portant le contenu donné, ou aucun fichier. */
function repo(contenu) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-config-"));
  if (contenu !== undefined) {
    writeFileSync(
      join(racine, NOM_CONFIGURATION),
      typeof contenu === "string" ? contenu : JSON.stringify(contenu),
      "utf8",
    );
  }
  return racine;
}

test("un repository sans configuration reçoit les défauts, sans erreur", () => {
  const racine = repo();
  try {
    const { configuration, chemin, erreur } = lireConfiguration(racine);
    assert.deepEqual(configuration, { ...CONFIGURATION_PAR_DEFAUT });
    assert.equal(chemin, null);
    assert.equal(erreur, null, "l'absence de configuration est le cas nominal, pas un défaut");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("les défauts décrivent le repo du critère de réussite : un dossier components", () => {
  // `components` et non `src/components` : le critère décrit « un repo GitHub
  // neuf, un dossier `components/`, rien d'autre ». Un repo qui range autrement
  // le dit — c'est exactement à quoi ce fichier sert.
  assert.equal(CONFIGURATION_PAR_DEFAUT.components, "components");
  assert.equal(CONFIGURATION_PAR_DEFAUT.tokens, "tokens.json");
  assert.equal(CONFIGURATION_PAR_DEFAUT.implementation, "{dir}/{id}.tsx");
});

test("un champ écrit remplace son défaut, et les autres ne bougent pas", () => {
  const racine = repo({ components: "src/components" });
  try {
    const { configuration, erreur } = lireConfiguration(racine);
    assert.equal(erreur, null);
    assert.equal(configuration.components, "src/components");
    assert.equal(configuration.tokens, CONFIGURATION_PAR_DEFAUT.tokens);
    assert.equal(configuration.implementation, CONFIGURATION_PAR_DEFAUT.implementation);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une cible non-React se décrit entièrement par ces trois chemins", () => {
  const racine = repo({
    components: "Contracts",
    tokens: "Design/tokens.json",
    implementation: "Sources/UI/{id}.swift",
  });
  try {
    const { configuration, erreur } = lireConfiguration(racine);
    assert.equal(erreur, null);
    assert.equal(configuration.implementation, "Sources/UI/{id}.swift");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un JSON cassé est refusé, pas retombé en silence sur les défauts", () => {
  const racine = repo("{ components: pas du json }");
  try {
    const { erreur, chemin } = lireConfiguration(racine);
    assert.ok(erreur, "un fichier présent et illisible doit se signaler");
    assert.match(erreur, /illisible/);
    assert.ok(chemin, "le chemin du fautif est nommé");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un chemin vide est un refus, parce qu'il ne désigne rien", () => {
  assert.deepEqual(champsInvalidesDeLaConfiguration({ components: "" }), ["components"]);
  assert.deepEqual(champsInvalidesDeLaConfiguration({ tokens: "   " }), ["tokens"]);
  assert.deepEqual(champsInvalidesDeLaConfiguration({ implementation: 42 }), ["implementation"]);
});

test("un champ absent n'est pas un champ invalide", () => {
  assert.deepEqual(champsInvalidesDeLaConfiguration({}), []);
  assert.deepEqual(champsInvalidesDeLaConfiguration({ components: "c" }), []);
});

/**
 * La règle qui justifie ce fichier autant que ses trois champs.
 *
 * La fenêtre de versions lues appartient au paquet installé (D7, D8). La
 * republier dans le repo créerait une seconde autorité, qui dériverait au
 * premier `npm update` — et le désaccord serait MUET, chacun des deux se
 * croyant le bon. On refuse donc, au lieu d'ignorer : ignorer laisserait croire
 * que le champ compte, quelqu'un le mettrait à jour en pensant déplacer la
 * fenêtre, et rien ne bougerait. Un geste sans effet est pire qu'un geste
 * refusé.
 */
test("un numéro de version écrit dans la configuration est refusé", () => {
  for (const cle of ["contractVersion", "version", "schemaVersion"]) {
    assert.deepEqual(
      champsInvalidesDeLaConfiguration({ [cle]: "12.0" }),
      [cle],
      `${cle} doit être refusé : la fenêtre de lecture n'appartient pas au repo`,
    );
  }
});

test("le refus d'un numéro de version dit pourquoi, pas seulement que", () => {
  const racine = repo({ contractVersion: "12.0" });
  try {
    const { erreur } = lireConfiguration(racine);
    assert.match(erreur, /aucun numéro de version/);
    assert.match(erreur, /appartient au paquet installé/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une configuration qui n'est pas un objet est refusée en bloc", () => {
  assert.deepEqual(champsInvalidesDeLaConfiguration([]), ["ucm.config.json"]);
  assert.deepEqual(champsInvalidesDeLaConfiguration(null), ["ucm.config.json"]);
  assert.deepEqual(champsInvalidesDeLaConfiguration("components"), ["ucm.config.json"]);
});
