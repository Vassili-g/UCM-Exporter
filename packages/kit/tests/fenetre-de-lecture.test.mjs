/**
 * La fenêtre de lecture est-elle réelle, ou seulement déclarée ?
 *
 * **Ce test existe parce que la fenêtre a menti une fois.** D8 décidait « la
 * courante et la précédente » ; le code lisait une seule version, et le
 * commentaire de `version-contrat.mjs` l'assumait contre la décision. T7.5 l'a
 * mesuré, T7.6 l'a tranché en donnant raison à D8 — et une décision qu'aucun
 * contrôle n'éprouve redeviendra fausse de la même façon.
 *
 * **Déclarer une borne basse ne coûte rien ; la TENIR est le sujet.** Dire
 * `VERSION_CONTRAT_MINIMALE = "11.0"` fait passer `verdictDeVersion`, et ne
 * prouve rien du reste : le verdict de version est le premier contrôle, pas le
 * dernier. Si `champsInvalidesDuContrat` refuse ensuite un 11.0, le
 * consommateur a une fenêtre qui l'accueille pour le renvoyer trois lignes plus
 * bas — c'est pire qu'une fenêtre fermée, parce que le message ne dit plus quoi
 * faire.
 *
 * Ce test fait donc passer les quatre contrats 11.0 figés (T7.0/T2.1b) par
 * TOUS les lecteurs, pas seulement par le verdict de version. C'est leur seul
 * emploi restant, et c'est celui-là.
 *
 * **Ce qu'il ne prouve pas.** Que le rendu d'un 11.0 soit correct : aucun test
 * ne le dit, seule une reconstruction à froid comparée à Figma le dirait. Il
 * dit que les lecteurs ne REFUSENT pas ce que la fenêtre annonce accepter.
 *
 * **Durée de vie.** Il vit tant que la fenêtre en porte deux. Le jour où la
 * borne basse monte, les fixtures figées doivent monter avec elle, sinon ce
 * test devient le seul endroit du dépôt à croire encore à la 11.0.
 */
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

/** Les contrats figés de la version PRÉCÉDENTE, tels qu'ils ont été fusionnés. */
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
