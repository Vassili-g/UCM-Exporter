#!/usr/bin/env node
/**
 * Relève ce qu'un `tokens.json` écrit plusieurs fois.
 *
 * Aucune opinion : le programme ne lit que le fichier et n'en déduit rien. Il
 * imprime sept relevés, chacun répondant à une question du document
 * RECHERCHE-ARCHI-MULTIMARQUES.md, et rien d'autre.
 *
 *   node mesurer-duplication.mjs <tokens.json> [--json]
 *
 * Les sept relevés :
 *   1. les feuilles par collection racine ;
 *   2. les axes déclarés, leurs modes et leur défaut ;
 *   3. par axe, les feuilles dont toutes les colonnes de modes sont égales ;
 *      une colonne morte est un fait écrit n fois au lieu d'une ;
 *   4. les jumelles `X.light.Y` / `X.dark.Y`, et celles dont les deux branches
 *      portent la même valeur dans tous les modes ;
 *   5. la matrice des citations d'une collection vers une autre : une couche
 *      basse qui cite une couche haute signale une inversion ;
 *   6. les feuilles dont le nom porte un mode (`-[light]`, `-[dark]`, `light`,
 *      `dark`), un mode qu'aucun contexte ne peut donc commuter ;
 *   7. les valeurs nulles par axe et par mode.
 */
import { readFileSync } from "node:fs";

const [, , chemin, ...options] = process.argv;
if (chemin === undefined) {
  console.error("usage : node mesurer-duplication.mjs <tokens.json> [--json]");
  process.exit(2);
}
const enJson = options.includes("--json");
const document = JSON.parse(readFileSync(chemin, "utf8"));
const axes = document.$extensions?.["com.ucm.axes"] ?? {};

/** Toutes les feuilles du document, du chemin pointé vers la feuille. */
function feuilles(noeud, prefixe = "") {
  if (noeud === null || typeof noeud !== "object") return [];
  if (Object.prototype.hasOwnProperty.call(noeud, "$value")) return [[prefixe, noeud]];
  const sortie = [];
  for (const cle of Object.keys(noeud)) {
    if (cle.startsWith("$")) continue;
    sortie.push(...feuilles(noeud[cle], prefixe === "" ? cle : `${prefixe}.${cle}`));
  }
  return sortie;
}

const toutes = feuilles(document);
const racineDe = (cheminDeFeuille) => cheminDeFeuille.split(".")[0];
const modesDe = (feuille) => feuille.$extensions?.["com.ucm.modes"] ?? null;
const axeDe = (feuille) => feuille.$extensions?.["com.ucm.axis"] ?? null;
const empreinte = (valeur) => JSON.stringify(valeur ?? null);

/** La cible d'un alias `{a.b.c}`, ou `null` quand la valeur est littérale. */
function cible(valeur) {
  if (typeof valeur !== "string") return null;
  const trouve = /^\{([^}]+)\}$/.exec(valeur.trim());
  return trouve === null ? null : trouve[1];
}

// 1. Les feuilles par collection racine.
const parRacine = new Map();
for (const [cheminDeFeuille] of toutes) {
  const racine = racineDe(cheminDeFeuille);
  parRacine.set(racine, (parRacine.get(racine) ?? 0) + 1);
}

// 2 et 3. Les axes, et les colonnes mortes de chacun.
const relevéDesAxes = [];
for (const [nom, axe] of Object.entries(axes)) {
  const possedees = toutes.filter(([, feuille]) => axeDe(feuille) === nom);
  let identiques = 0;
  for (const [, feuille] of possedees) {
    const modes = modesDe(feuille);
    if (modes === null) continue;
    const valeurs = axe.modes.map((mode) => empreinte(modes[mode]));
    if (new Set(valeurs).size === 1) identiques += 1;
  }
  relevéDesAxes.push({
    axe: nom,
    modes: axe.modes,
    defaut: axe.default,
    extensions: Object.keys(axe.extensions ?? {}),
    feuilles: possedees.length,
    colonnesMortes: identiques,
    partMorte: possedees.length === 0 ? 0 : Math.round((identiques / possedees.length) * 1000) / 10,
    valeursEcrites: possedees.length * axe.modes.length,
    valeursUtiles: possedees.length * axe.modes.length - identiques * (axe.modes.length - 1),
  });
}

// 4. Les jumelles light / dark posées en dossier plutôt qu'en mode.
const parCle = new Map();
for (const [cheminDeFeuille, feuille] of toutes) {
  const segments = cheminDeFeuille.split(".");
  const rang = segments.findIndex((segment) => segment === "light" || segment === "dark");
  if (rang === -1) continue;
  const cle = [...segments.slice(0, rang), "*", ...segments.slice(rang + 1)].join(".");
  if (!parCle.has(cle)) parCle.set(cle, {});
  parCle.get(cle)[segments[rang]] = feuille;
}
let jumelles = 0;
let jumellesEgales = 0;
for (const paire of parCle.values()) {
  if (paire.light === undefined || paire.dark === undefined) continue;
  jumelles += 1;
  const gauche = modesDe(paire.light) ?? { "": paire.light.$value };
  const droite = modesDe(paire.dark) ?? { "": paire.dark.$value };
  if (empreinte(gauche) === empreinte(droite)) jumellesEgales += 1;
}
const orphelines = [...parCle.values()].filter((paire) => (
  (paire.light === undefined) !== (paire.dark === undefined)
)).length;

// 5. La matrice des citations, collection par collection.
const citations = new Map();
for (const [cheminDeFeuille, feuille] of toutes) {
  const source = racineDe(cheminDeFeuille);
  const modes = modesDe(feuille);
  const valeurs = modes === null ? [feuille.$value] : Object.values(modes);
  for (const surcharge of Object.values(feuille.$extensions?.["com.ucm.extensions"] ?? {})) {
    valeurs.push(...Object.values(surcharge));
  }
  for (const valeur of valeurs) {
    const vise = cible(valeur);
    if (vise === null) continue;
    const cle = `${source} → ${racineDe(vise)}`;
    citations.set(cle, (citations.get(cle) ?? 0) + 1);
  }
}

// 6. Les modes écrits dans les noms.
const modeDansLeNom = toutes.filter(([cheminDeFeuille]) => (
  /-\[(light|dark)\]/.test(cheminDeFeuille) || /(^|\.)(light|dark)(\.|$)/.test(cheminDeFeuille)
)).length;

// 7. Les valeurs nulles, par axe et par mode.
const nulsParAxe = {};
for (const [, feuille] of toutes) {
  const nom = axeDe(feuille);
  const modes = modesDe(feuille);
  if (nom === null || modes === null) continue;
  nulsParAxe[nom] ??= {};
  for (const [mode, valeur] of Object.entries(modes)) {
    if (valeur === null) nulsParAxe[nom][mode] = (nulsParAxe[nom][mode] ?? 0) + 1;
  }
}

const releve = {
  fichier: chemin,
  feuilles: toutes.length,
  parRacine: Object.fromEntries([...parRacine].sort((a, b) => b[1] - a[1])),
  axes: relevéDesAxes,
  jumellesLightDark: { paires: jumelles, identiques: jumellesEgales, orphelines },
  citations: Object.fromEntries([...citations].sort((a, b) => b[1] - a[1])),
  modeDansLeNom,
  nulsParAxe,
};

if (enJson) {
  console.log(JSON.stringify(releve, null, 2));
  process.exit(0);
}

const ligne = (cle, valeur) => console.log(`  ${String(cle).padEnd(46)} ${valeur}`);
console.log(`\n${chemin} — ${toutes.length} feuilles\n`);
console.log("1. Feuilles par collection racine");
for (const [racine, nombre] of Object.entries(releve.parRacine)) ligne(racine, nombre);
console.log("\n2 et 3. Axes, et colonnes de modes identiques");
for (const axe of relevéDesAxes) {
  console.log(`  « ${axe.axe} » : ${axe.modes.length} modes [${axe.modes.join(", ")}], défaut « ${axe.defaut} »`
    + (axe.extensions.length > 0 ? `, extensions [${axe.extensions.join(", ")}]` : ""));
  ligne("feuilles portées par l'axe", axe.feuilles);
  ligne("dont toutes les colonnes sont égales", `${axe.colonnesMortes} (${axe.partMorte} %)`);
  ligne("valeurs écrites / valeurs distinctes", `${axe.valeursEcrites} / ${axe.valeursUtiles}`);
}
console.log("\n4. Jumelles light / dark en dossier");
ligne("paires light+dark", jumelles);
ligne("dont les deux branches sont identiques", jumellesEgales);
ligne("branches sans jumelle", orphelines);
console.log("\n5. Citations, collection vers collection");
for (const [arc, nombre] of Object.entries(releve.citations)) ligne(arc, nombre);
console.log("\n6. Modes écrits dans les noms");
ligne("feuilles dont le chemin porte light ou dark", modeDansLeNom);
console.log("\n7. Valeurs nulles, par axe et par mode");
for (const [axe, modes] of Object.entries(nulsParAxe)) {
  for (const [mode, nombre] of Object.entries(modes)) ligne(`${axe} / ${mode}`, nombre);
}
console.log("");
