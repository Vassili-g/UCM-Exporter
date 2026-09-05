/** Génère les unions TypeScript dérivées des contrats d'un repository. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { codeIdentifier } from "@ucm-kit/core/format";
import { libelleNombre, lireConfiguration, trouverContrats } from "@ucm-kit/core/lecteurs";

import { nomsEnumsDeVariantes, typeVariantesExactes } from "./types-variants.mjs";

/** « iconLeft » devient « IconLeft », en restant un identifiant TypeScript. */
function pascal(nom) {
  return nom
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, lettre) => lettre.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^./, (lettre) => lettre.toUpperCase());
}

/** Contenu d'un fichier dérivé d'un contrat, ou `null` s'il n'a aucun enum. */
export function typesDuContrat(contrat) {
  const composant = codeIdentifier(String(contrat?.name ?? ""));
  const enums = Object.entries(contrat?.props ?? {}).filter(
    ([, prop]) => (
      prop?.type === "enum"
      && Array.isArray(prop.values)
      && prop.values.length > 0
      && prop.values.every((valeur) => typeof valeur === "string")
    ),
  );
  if (enums.length === 0) return null;

  const types = enums.map(([nom, prop]) => {
    const union = prop.values.map((valeur) => JSON.stringify(valeur)).join(" | ");
    return `/** Valeurs de la prop « ${nom} » du contrat. */\nexport type ${composant}${pascal(nom)} = ${union};`;
  });
  const nomsAxes = nomsEnumsDeVariantes(
    enums.map(([nom]) => nom),
    contrat.structure?.variantAxes,
  );
  const typeExact = nomsAxes.length > 0
    ? typeVariantesExactes(composant, nomsAxes, contrat.variants)
    : null;
  if (typeExact) types.push(typeExact);

  return {
    composant,
    nombreUnions: enums.length,
    contenu: [
      "/**",
      ` * Types dérivés de ${composant}.contract.json — NE PAS ÉDITER À LA MAIN.`,
      " * Régénéré par `ucm-typescript` : ces unions reflètent mécaniquement les",
      " * enums du contrat, comme une feuille de tokens reflète tokens.json.",
      " */",
      "",
      types.join("\n\n"),
      "",
    ].join("\n"),
  };
}

/**
 * Génère tous les fichiers et rend un compte rendu structuré.
 *
 * Un contrat illisible est omis : `ucm check` en possède le diagnostic précis,
 * tandis que ce générateur ne doit jamais masquer ce rapport par une exception.
 */
export function genererTypes(racine = process.cwd(), { dossierSortie = "src/generated/contracts" } = {}) {
  const { configuration, erreur } = lireConfiguration(racine);
  if (erreur) throw new Error(erreur);

  const sortie = resolve(racine, dossierSortie);
  mkdirSync(sortie, { recursive: true });
  const generes = [];
  const omis = [];

  for (const chemin of trouverContrats(join(racine, configuration.components))) {
    let contrat;
    try {
      contrat = JSON.parse(readFileSync(chemin, "utf8").replace(/^﻿/, ""));
    } catch {
      omis.push({ chemin, raison: "illisible" });
      continue;
    }
    const resultat = typesDuContrat(contrat);
    if (!resultat) continue;
    const cible = join(sortie, `${resultat.composant}.ts`);
    writeFileSync(cible, resultat.contenu, "utf8");
    generes.push({ ...resultat, chemin: cible });
  }

  return { generes, omis, dossierSortie: sortie };
}

/** Texte terminal d'un compte rendu de génération. */
export function rendreGeneration({ generes, omis }) {
  return [
    ...generes.map(({ composant, nombreUnions, chemin }) => (
      `✓ ${composant} : ${libelleNombre(nombreUnions, "union")} générée${nombreUnions === 1 ? "" : "s"}. Fichier : ${chemin}`
    )),
    ...omis.map(({ chemin }) => `⚠ ${basename(chemin)} illisible : types non générés (lancez « ucm check »).`),
  ].join("\n");
}
