/**
 * Les lois du catalogue d'aides. Chaque caractéristique a une aide, chaque aide
 * nomme une caractéristique, chaque aide a son sens et sa preuve, et chaque
 * couple (définition, propriété) du schéma publié relève d'une aide ou dit
 * pourquoi il n'en a pas.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { CARACTERISTIQUES, CHAMPS, SANS_AIDE, lireLeSchema } from "@ucm-kit/core/lecteurs";

const DOSSIER = new URL("../aides/", import.meta.url);

/** Les aides qui répondent à un ancrage du repository : elles n'ont pas d'écriture par défaut. */
const ANCRAGES = [
  "attributs-natifs",
  "chargement-feuilles",
  "comptage-dependances",
  "controles",
  "focus-clavier",
  "icone-composant",
  "identifiants",
  "portee-mode",
  "resolution-token",
];

/** Une aide lue : son en-tête à deux clés plates, et les titres de ses sections. */
function lireAide(fichier) {
  const texte = readFileSync(new URL(fichier, DOSSIER), "utf8").replace(/\r\n/g, "\n");
  const decoupe = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(texte);
  assert.ok(decoupe, `${fichier} n'a pas d'en-tête`);
  const entete = decoupe[1].split("\n").map((ligne) => {
    const separateur = ligne.indexOf(":");
    return [ligne.slice(0, separateur).trim(), ligne.slice(separateur + 1).trim()];
  });
  return {
    fichier,
    nom: fichier.replace(/\.md$/, ""),
    entete,
    sections: [...decoupe[2].matchAll(/^## (.+)$/gm)].map((titre) => titre[1].trim()),
  };
}

const AIDES = readdirSync(DOSSIER).filter((fichier) => fichier.endsWith(".md")).sort().map(lireAide);
const IDENTIFIANTS = CARACTERISTIQUES.map(({ id }) => id);
const quandDe = (aide) => Object.fromEntries(aide.entete).quand;

test("chaque aide a un en-tête de deux clés, aide et quand, et son nom est celui du fichier", () => {
  assert.ok(AIDES.length > 0, "aucune aide trouvée");
  for (const aide of AIDES) {
    assert.deepEqual(aide.entete.map(([cle]) => cle), ["aide", "quand"], aide.fichier);
    assert.equal(Object.fromEntries(aide.entete).aide, aide.nom, aide.fichier);
  }
});

test("chaque caractéristique est le quand d'au moins une aide", () => {
  const couvertes = new Set(AIDES.map(quandDe));
  assert.deepEqual(IDENTIFIANTS.filter((id) => !couvertes.has(id)), []);
});

test("chaque quand nomme une caractéristique", () => {
  assert.deepEqual(AIDES.filter((aide) => !IDENTIFIANTS.includes(quandDe(aide))).map(({ fichier }) => fichier), []);
});

test("une aide porte Sens, Écriture par défaut et Preuve dans cet ordre ; un ancrage n'a pas d'écriture", () => {
  assert.deepEqual(ANCRAGES.filter((nom) => !AIDES.some((aide) => aide.nom === nom)), [], "ancrage sans fichier");
  for (const aide of AIDES) {
    const attendues = ANCRAGES.includes(aide.nom) ? ["Sens", "Preuve"] : ["Sens", "Écriture par défaut", "Preuve"];
    assert.deepEqual(aide.sections, attendues, aide.fichier);
  }
});

/**
 * Les couples (définition, propriété) du schéma, `*` notant une clé de
 * dictionnaire, et l'énumération que chaque couple porte. Le parcours suit les
 * `$ref` et marque les définitions visitées : deux sont récursives.
 */
function couplesDuSchema(schema) {
  const definitions = schema.definitions ?? {};
  const couples = new Map();
  const visitees = new Set();
  const enumeration = (valeur) => {
    const cible = valeur?.$ref ? definitions[valeur.$ref.split("/").pop()] : valeur;
    if (cible?.enum) return cible.enum;
    return cible?.const !== undefined ? [cible.const] : null;
  };
  const parcourir = (noeud, definition) => {
    if (!noeud || typeof noeud !== "object") return;
    if (noeud.$ref) {
      const cible = noeud.$ref.split("/").pop();
      if (visitees.has(cible)) return;
      visitees.add(cible);
      parcourir(definitions[cible], cible);
      return;
    }
    for (const [cle, valeur] of Object.entries(noeud.properties ?? {})) {
      couples.set(`${definition}.${cle}`, enumeration(valeur));
      parcourir(valeur, definition);
    }
    if (noeud.additionalProperties && typeof noeud.additionalProperties === "object") {
      couples.set(`${definition}.*`, null);
      parcourir(noeud.additionalProperties, definition);
    }
    for (const cle of ["items", "anyOf", "oneOf", "allOf"]) {
      for (const branche of [noeud[cle]].flat()) parcourir(branche, definition);
    }
  };
  parcourir(schema, "Contract");
  return couples;
}

const COUPLES = couplesDuSchema(lireLeSchema());

test("chaque couple du schéma publié relève d'une aide ou dit pourquoi il n'en a pas", () => {
  assert.ok(COUPLES.size > 200, `seuls ${COUPLES.size} couples relevés dans le schéma`);
  const orphelins = [...COUPLES.keys()].filter((couple) => !Object.hasOwn(CHAMPS, couple) && !Object.hasOwn(SANS_AIDE, couple));
  assert.deepEqual(orphelins, [], "ces champs n'ont ni aide ni raison dans SANS_AIDE");
});

test("la table des champs ne nomme aucun couple que le schéma ignore, ni un couple deux fois", () => {
  assert.deepEqual([...Object.keys(CHAMPS), ...Object.keys(SANS_AIDE)].filter((couple) => !COUPLES.has(couple)), []);
  assert.deepEqual(Object.keys(CHAMPS).filter((couple) => Object.hasOwn(SANS_AIDE, couple)), []);
});

test("la table des champs ne relève que des caractéristiques connues", () => {
  const cites = Object.values(CHAMPS).flatMap((valeur) => (
    typeof valeur === "string" ? [valeur] : Array.isArray(valeur) ? valeur : Object.values(valeur.parValeur)
  ));
  assert.deepEqual(cites.filter((id) => !IDENTIFIANTS.includes(id)), []);
});

test("un champ qui relève selon sa valeur couvre chaque valeur de son énumération", () => {
  for (const [couple, valeur] of Object.entries(CHAMPS)) {
    if (typeof valeur !== "object" || Array.isArray(valeur)) continue;
    const valeurs = COUPLES.get(couple);
    assert.ok(valeurs, `${couple} n'est pas une énumération du schéma`);
    assert.deepEqual([...valeurs].sort(), Object.keys(valeur.parValeur).sort(), couple);
  }
});
