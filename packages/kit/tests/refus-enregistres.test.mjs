/** Déclenche chaque contrôle par mutation et fige l'empreinte de ses refus. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { champsInvalidesDuContrat } from "../src/lecteurs/validation-contrat.mjs";
import { contrat120, contratCourant } from "./contrats-fabriques.mjs";

const ici = dirname(fileURLToPath(import.meta.url));
const dossierFiges = join(ici, "..", "fixtures", "contrats", "11.0");
const cheminReference = join(ici, "refus-enregistres.json");

/**
 * Tous les chemins d'un contrat : les feuilles ET les conteneurs.
 *
 * Un objet ou un tableau vide compte : `{}` et `[]` sont des valeurs publiées
 * que le format distingue de l'absence, et les sauter laisserait hors mutation
 * les champs « bloc vide » que la 4.0 a introduits précisément pour ça.
 *
 * **Les conteneurs ont été ajoutés après coup, et l'oubli valait la peine
 * d'être trouvé.** Le plan disait « muter chaque feuille » ; à ne muter que
 * les feuilles, `viewStructures` n'était jamais muté — seulement ses
 * descendants —, et le contrôle « `viewStructures` est un objet » n'apparaissait
 * dans aucun inventaire. Or c'est exactement la forme de contrôle qu'un élagage
 * trop large emporte : celle qui juge le BLOC, pas son contenu. Un harnais qui
 * ne mesure pas cette classe-là mesure la moitié du risque.
 */
function chemins(valeur, prefixe = "") {
  if (Array.isArray(valeur)) {
    const enfants = valeur.flatMap((item, index) => chemins(item, `${prefixe}[${index}]`));
    return prefixe === "" ? enfants : [prefixe, ...enfants];
  }
  if (valeur !== null && typeof valeur === "object") {
    const enfants = Object.keys(valeur).flatMap(
      (cle) => chemins(valeur[cle], prefixe ? `${prefixe}.${cle}` : cle),
    );
    return prefixe === "" ? enfants : [prefixe, ...enfants];
  }
  return [prefixe];
}

/** Découpe `a.b[0].c` en segments exploitables. */
function segments(chemin) {
  return chemin
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter((segment) => segment !== "");
}

/** Applique `transformer` à la feuille désignée, sur une copie profonde. */
function muter(contrat, chemin, transformer) {
  const copie = structuredClone(contrat);
  const parties = segments(chemin);
  let noeud = copie;
  for (const partie of parties.slice(0, -1)) {
    if (noeud === null || typeof noeud !== "object") return copie;
    noeud = noeud[partie];
  }
  if (noeud === null || typeof noeud !== "object") return copie;
  transformer(noeud, parties.at(-1));
  return copie;
}

/**
 * Les deux mutations, et pourquoi exactement celles-là.
 *
 * SUPPRIMER répond à « ce champ est-il exigé ? ». REMPLACER par une valeur d'un
 * autre type répond à « sa FORME est-elle contrôlée ? » — un champ présent mais
 * absurde est le cas que le format rencontre vraiment, et celui qu'un contrôle
 * mal élagué cesse de voir en premier.
 */
const MUTATIONS = [
  ["supprime", (noeud, cle) => { delete noeud[cle]; }],
  ["remplace", (noeud, cle) => { noeud[cle] = 424242; }],
];

/**
 * Le même contrôle, quelle que soit la position où il se déclenche.
 *
 * `children[3].slot` et `children[7].slot` ne sont pas deux contrôles : c'est
 * le même, atteint deux fois. Les distinguer gonflait l'inventaire de Button à
 * 1 394 entrées et le rendait illisible, donc inutile — un artefact qu'on ne
 * relit pas ne prouve rien. L'index n'est pas perdu pour autant : l'empreinte,
 * elle, porte les chemins entiers.
 */
function sansIndex(champ) {
  return champ.replace(/\[\d+\]/g, "[]");
}

/** Le relevé complet des refus d'un contrat, et son résumé lisible. */
export function releverLesRefus(contrat) {
  const verdicts = [];
  const controles = new Set();
  let refusees = 0;

  for (const chemin of chemins(contrat)) {
    for (const [nom, transformer] of MUTATIONS) {
      const verdict = champsInvalidesDuContrat(muter(contrat, chemin, transformer))
        .slice()
        .sort();
      verdicts.push(`${chemin}\t${nom}\t${verdict.join("|")}`);
      if (verdict.length > 0) {
        refusees += 1;
        for (const champ of verdict) controles.add(sansIndex(champ));
      }
    }
  }

  return {
    mutations: verdicts.length,
    refusees,
    muettes: verdicts.length - refusees,
    controlesDeclenches: [...controles].sort(),
    // Les verdicts sont déjà dans l'ordre déterministe du parcours ; les trier
    // en plus rendrait l'empreinte insensible à un déplacement de contrôle,
    // c'est-à-dire aveugle à ce qu'on veut justement voir.
    empreinte: createHash("sha256").update(verdicts.join("\n")).digest("hex"),
  };
}

/** Les contrats mesurés : le jeu N‑1 figé, plus deux formes fabriquées. */
export function corpusDeMesure() {
  const entrees = readdirSync(dossierFiges)
    .filter((nom) => nom.endsWith(".contract.json"))
    .sort()
    .map((nom) => [`11.0/${nom}`, JSON.parse(readFileSync(join(dossierFiges, nom), "utf8"))]);
  // Les fabriqués atteignent ce que le corpus réel n'exerce pas : un layer hors
  // du flux, une rotation, des rôles nommés. Sans eux, l'élagage pourrait
  // emporter un contrôle 12.0 sans qu'aucune mutation ne s'en aperçoive.
  entrees.push(["fabrique/courant", contratCourant()]);
  entrees.push(["fabrique/12.0", contrat120()]);
  return entrees;
}

/**
 * Le corpus est mesuré UNE fois pour les deux tests.
 *
 * 7 452 mutations, chacune revalidant un contrat entier : le relever deux fois
 * doublait la durée de toute la suite du kit pour ne rien prouver de plus.
 */
const mesure = corpusDeMesure().map(([nom, contrat]) => [nom, contrat, releverLesRefus(contrat)]);

test("les refus du validateur n'ont pas bougé", () => {
  const releve = Object.fromEntries(mesure.map(([nom, , relev]) => [nom, relev]));
  const reference = JSON.parse(readFileSync(cheminReference, "utf8"));

  // Nom par nom, pour qu'un écart désigne le contrat concerné au lieu de rendre
  // un diff de plusieurs milliers de lignes.
  assert.deepEqual(Object.keys(releve).sort(), Object.keys(reference).sort());
  for (const nom of Object.keys(reference).sort()) {
    assert.deepEqual(
      releve[nom].controlesDeclenches,
      reference[nom].controlesDeclenches,
      `${nom} : la liste des contrôles exercés a changé. Un contrôle en moins ici `
        + `est un contrôle PERDU, pas un contrôle déplacé.`,
    );
    assert.deepEqual(
      { refusees: releve[nom].refusees, muettes: releve[nom].muettes },
      { refusees: reference[nom].refusees, muettes: reference[nom].muettes },
      `${nom} : le partage refusé / muet a changé.`,
    );
    assert.equal(
      releve[nom].empreinte,
      reference[nom].empreinte,
      `${nom} : mêmes contrôles et mêmes comptes, mais pas les mêmes verdicts — `
        + `un contrôle s'est déplacé d'une feuille à une autre.`,
    );
  }
});

test("le relevé mord réellement : muter un contrat valide le rend invalide", () => {
  // Un harnais qui n'attraperait rien passerait ce fichier au vert en ne
  // prouvant que son propre silence. Deux bornes suffisent à l'exclure : le
  // contrat de départ est accepté, et une part appréciable des mutations est
  // refusée.
  for (const [nom, contrat, releve] of mesure) {
    assert.deepEqual(champsInvalidesDuContrat(contrat), [], `${nom} devrait être valide`);
    assert.ok(
      releve.refusees > 0 && releve.controlesDeclenches.length > 0,
      `${nom} : aucune mutation n'est refusée, le relevé ne mesure rien`,
    );
  }
});
