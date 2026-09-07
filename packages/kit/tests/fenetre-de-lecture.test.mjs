/** Vérifie que chaque lecteur respecte la fenêtre de versions annoncée. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VERSION_CONTRAT_MINIMALE,
  champsInvalidesDuContrat,
  validerAdressesDEchantillons,
  validerGrapheDesContrats,
  verdictDeVersion,
  vueExacteDuVariant,
} from "../src/lecteurs/index.mjs";

const racine = dirname(fileURLToPath(import.meta.url));

/** Les contrats figés de la version précédente, tels qu'ils ont été fusionnés. */
function contratsPrecedents() {
  const dossier = join(racine, "..", "fixtures", "contrats", VERSION_CONTRAT_MINIMALE);
  return readdirSync(dossier)
    .filter((nom) => nom.endsWith(".contract.json"))
    .map((nom) => ({
      chemin: join(dossier, nom),
      contrat: JSON.parse(readFileSync(join(dossier, nom), "utf8").replace(/^\uFEFF/, "")),
    }));
}

test("les contrats de la version précédente existent, et la déclarent", () => {
  const documents = contratsPrecedents();
  // Un dossier vide passerait tous les tests suivants sans rien prouver : c'est
  // la faute que ce premier contrôle rend impossible.
  assert.ok(
    documents.length > 0,
    `Aucun contrat figé en ${VERSION_CONTRAT_MINIMALE} : la borne basse de la `
      + `fenêtre a monté sans que les fixtures suivent, et plus rien ne l'éprouve.`,
  );

  for (const { chemin, contrat } of documents) {
    assert.equal(contrat?.meta?.contractVersion, VERSION_CONTRAT_MINIMALE, chemin);
    assert.equal(verdictDeVersion(contrat.meta.contractVersion), "ok", chemin);
  }
});

test("aucun lecteur ne refuse ce que la fenêtre annonce accepter", () => {
  const documents = contratsPrecedents();

  const refus = [];
  for (const { chemin, contrat } of documents) {
    for (const champ of champsInvalidesDuContrat(contrat)) {
      refus.push(`${chemin} — champ invalide : ${JSON.stringify(champ)}`);
    }
    for (const variant of Array.isArray(contrat.variants) ? contrat.variants : []) {
      try {
        vueExacteDuVariant(contrat, variant);
      } catch (erreur) {
        refus.push(`${chemin} — vue irrésoluble : ${erreur.message}`);
      }
    }
  }

  const verdictDuGraphe = validerGrapheDesContrats(documents);
  for (const [cle, valeur] of Object.entries(verdictDuGraphe ?? {})) {
    if (Array.isArray(valeur) ? valeur.length > 0 : valeur) {
      refus.push(`graphe — ${cle} : ${JSON.stringify(valeur)}`);
    }
  }

  // `validerAdressesDEchantillons` reçoit l'index par nom que son appelant
  // construit : le lecteur ne le fabrique pas, il le reçoit.
  const parNom = new Map();
  for (const document of documents) {
    const nom = document.contrat?.name;
    parNom.set(nom, [...(parNom.get(nom) ?? []), document]);
  }
  validerAdressesDEchantillons(documents, parNom, (chemin, message) => {
    refus.push(`${chemin} — échantillon : ${message}`);
  });

  assert.deepEqual(
    refus,
    [],
    `La fenêtre déclare lire la ${VERSION_CONTRAT_MINIMALE}, et un lecteur la `
      + `refuse. Une fenêtre qui accueille pour renvoyer trois lignes plus bas est `
      + `pire qu'une fenêtre fermée : le message ne dit plus quel geste corrige.\n`
      + refus.join("\n"),
  );
});
