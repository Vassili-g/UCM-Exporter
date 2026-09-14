/**
 * `ucm aides` : le catalogue des aides à l'implémentation, une aide en entier,
 * et la copie d'une écriture par défaut dans les conventions du repository.
 *
 * Codes : 0 succès, 2 invocation fautive, aide inconnue ou conventions absentes.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHEMIN_CONVENTIONS,
  conventionsLesPlusProches,
  lireConventions,
  marqueurDeCopie,
  sectionsARelire,
} from "./conventions.mjs";

export const DOSSIER_AIDES = fileURLToPath(new URL("../aides/", import.meta.url));

export const USAGE_AIDES = "ucm aides [<aide> [--personnaliser [<chemin>]]]";

/** Une aide lue depuis son fichier : en-tête, puis sections Sens, Écriture par défaut et Preuve. */
export function lireAide(texte) {
  const normalise = texte.replace(/\r\n/g, "\n");
  const [, entete = "", corps = ""] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalise) ?? [];
  const cles = Object.fromEntries(entete.split("\n").map((ligne) => {
    const separateur = ligne.indexOf(":");
    return [ligne.slice(0, separateur).trim(), ligne.slice(separateur + 1).trim()];
  }));
  const sections = {};
  for (const bloc of corps.split(/^## /m).slice(1)) {
    const [titre, ...reste] = bloc.split("\n");
    sections[titre.trim()] = reste.join("\n").trim();
  }
  return {
    nom: cles.aide,
    quand: cles.quand,
    ancrage: sections["Écriture par défaut"] === undefined,
    sens: sections.Sens ?? "",
    ecriture: sections["Écriture par défaut"] ?? "",
    preuve: sections.Preuve ?? "",
  };
}

/** Le catalogue, par nom d'aide et dans l'ordre alphabétique. */
export function catalogueDesAides(dossier = DOSSIER_AIDES) {
  return new Map(readdirSync(dossier)
    .filter((fichier) => fichier.endsWith(".md"))
    .sort()
    .map((fichier) => lireAide(readFileSync(resolve(dossier, fichier), "utf8")))
    .map((aide) => [aide.nom, aide]));
}

function versionDeLaCli() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

/** Lit les arguments de `ucm aides`, sans lever. */
export function lireArgumentsAides(arguments_) {
  const [aide, ...reste] = arguments_;
  if (aide === undefined) return { options: { aide: null, personnaliser: false, chemin: null } };
  if (aide.startsWith("--")) return { erreur: `Argument inconnu : ${aide}` };
  if (reste.length === 0) return { options: { aide, personnaliser: false, chemin: null } };
  if (reste[0] !== "--personnaliser") return { erreur: `Argument inconnu : ${reste[0]}` };
  if (reste.length > 2 || reste[1]?.startsWith("--")) return { erreur: `Argument inconnu : ${reste.at(-1)}` };
  return { options: { aide, personnaliser: true, chemin: reste[1] ?? null } };
}

/** Les conventions qui s'appliquent depuis un dossier, lues, ou `null`. */
function conventionsDepuis(depart, racine, catalogue) {
  const chemin = conventionsLesPlusProches(depart, racine);
  if (chemin === null) return { chemin: null, conventions: null };
  return { chemin, conventions: lireConventions(readFileSync(chemin, "utf8"), catalogue) };
}

/** Les anomalies et les sections à relire, à imprimer avant tout le reste. */
function avertissements(conventions, chemin, racine, catalogue) {
  if (!conventions) return [];
  const ou = relative(racine, chemin).split("\\").join("/");
  return [
    ...conventions.anomalies.map((anomalie) => `⚠ ${ou} : ${anomalie}`),
    ...sectionsARelire(conventions, catalogue).map(({ nom, version }) => (
      `⚠ ${ou} : la section « ${nom} » copie l'écriture par défaut de la version ${version}, qui a changé depuis. Relisez-la.`
    )),
  ];
}

function origine(aide, conventions) {
  const section = conventions?.sections.get(aide.nom);
  if (aide.ancrage) return section && section.texte !== "" ? "ancrage répondu" : "ancrage sans réponse";
  if (aide.nom === "composant") return conventions && conventions.tete !== "" ? "conventions, texte de tête" : "UCM";
  return section ? "conventions" : "UCM";
}

/**
 * La commande `ucm aides`, et son code de sortie.
 *
 * Sans argument, elle liste le catalogue et l'origine de chaque écriture d'après
 * les conventions les plus proches de `racine`. Avec une aide, elle l'imprime.
 * Avec `--personnaliser`, elle ajoute la section de l'aide à la fin du fichier de
 * conventions le plus proche du chemin donné, et n'écrit rien si elle existe.
 */
export function aides(arguments_, {
  racine = process.cwd(),
  ecrire = console.log,
  alerter = console.error,
  ecrireFichier = writeFileSync,
  catalogue = catalogueDesAides(),
} = {}) {
  const { options, erreur } = lireArgumentsAides(arguments_);
  if (erreur) {
    alerter(`${erreur}\n\n${USAGE_AIDES}`);
    return 2;
  }

  if (options.aide === null) {
    const { chemin, conventions } = conventionsDepuis(racine, racine, catalogue);
    const lignes = avertissements(conventions, chemin, racine, catalogue);
    lignes.push(chemin
      ? `${catalogue.size} aides, écritures d'après ${relative(racine, chemin).split("\\").join("/")} :`
      : `${catalogue.size} aides, sans fichier ${CHEMIN_CONVENTIONS.split("\\").join("/")} :`);
    const largeur = Math.max(...[...catalogue.keys()].map((nom) => nom.length));
    for (const aide of catalogue.values()) {
      lignes.push(`  ${aide.nom.padEnd(largeur)}  ${aide.quand.padEnd(22)}  ${origine(aide, conventions)}`);
    }
    ecrire(lignes.join("\n"));
    return 0;
  }

  const aide = catalogue.get(options.aide);
  if (!aide) {
    alerter(`Aide inconnue : ${options.aide}. \`ucm aides\` liste le catalogue.`);
    return 2;
  }

  if (!options.personnaliser) {
    const parties = [`# ${aide.nom}`, "", "## Sens", "", aide.sens];
    if (!aide.ancrage) parties.push("", "## Écriture par défaut", "", aide.ecriture);
    parties.push("", "## Preuve", "", aide.preuve);
    ecrire(parties.join("\n"));
    return 0;
  }

  const depart = resolve(racine, options.chemin ?? ".");
  const { chemin, conventions } = conventionsDepuis(depart, racine, catalogue);
  if (chemin === null) {
    alerter(`Aucun ${CHEMIN_CONVENTIONS.split("\\").join("/")} ne s'applique à ${relative(racine, depart) || "."}. `
      + "Lancez `ucm init`, ou créez ce fichier dans le dossier concerné.");
    return 2;
  }
  const ou = relative(racine, chemin).split("\\").join("/");
  if (conventions.sections.has(aide.nom)) {
    ecrire(`${ou} porte déjà une section « ${aide.nom} » : rien n'est écrit.`);
    return 0;
  }

  const contenu = readFileSync(chemin, "utf8");
  const corps = aide.ancrage ? "<!-- Écrire ici la réponse du repository. -->" : aide.ecriture;
  const section = `## ${aide.nom}\n${marqueurDeCopie(aide.nom, versionDeLaCli(), aide.ecriture)}\n\n${corps}\n`;
  ecrireFichier(chemin, `${contenu.replace(/\s*$/, "")}\n\n${section}`, "utf8");
  ecrire(`${ou} : section « ${aide.nom} » ajoutée, à éditer.`);
  return 0;
}
