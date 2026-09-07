/**
 * Verrouille le verdict rendu sur la version de schéma d'un contrat.
 *
 * Ce test n'énumère plus les versions acceptées : le repository en lit une
 * seule, et une liste écrite à la main se contenterait de recopier la
 * constante. Il vérifie ce qui peut réellement casser — le SENS de l'écart,
 * qui décide à qui appartient le geste correctif — et la comparaison
 * numérique, qui a déjà de quoi se tromper sur une mineure à deux chiffres.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  VERSION_CONTRAT_MAXIMALE,
  VERSION_CONTRAT_MINIMALE,
  verdictDeVersion,
} from "../src/lecteurs/version-contrat.mjs";

test("la version du repository est compatible avec elle-même", () => {
  assert.equal(verdictDeVersion(VERSION_CONTRAT_MINIMALE), "ok");
  assert.equal(verdictDeVersion(VERSION_CONTRAT_MAXIMALE), "ok");
});

test("la fenêtre porte la version courante et la précédente", () => {
  // Avec une seule version, il n'existe aucun recouvrement, et le dépôt d'un
  // consommateur passe au rouge à l'instant où le kit monte. La fenêtre est le
  // temps du réexport.
  //
  // Elle reste un choix explicite : la borne basse décrit la version
  // PRÉCÉDENTE réelle, et se referme d'un cran à chaque montée. La laisser
  // vieillir ferait rentrer en silence un schéma que plus personne n'adapte.
  assert.equal(VERSION_CONTRAT_MINIMALE, "11.0");
  assert.equal(VERSION_CONTRAT_MAXIMALE, "12.0");
  assert.equal(verdictDeVersion("12.0"), "ok");
  assert.equal(verdictDeVersion("11.0"), "ok");
  // Un cran plus bas que la fenêtre reste un réexport à demander.
  assert.equal(verdictDeVersion("10.0"), "ancien");
});

test("une version antérieure est un contrat trop ancien", () => {
  // Le seul verdict qu'un réexport corrige.
  assert.equal(verdictDeVersion("10.3"), "ancien");
  assert.equal(verdictDeVersion("10.2"), "ancien");
  assert.equal(verdictDeVersion("10.1"), "ancien");
  assert.equal(verdictDeVersion("10.0"), "ancien");
  assert.equal(verdictDeVersion("9.0"), "ancien");
  assert.equal(verdictDeVersion("4.2"), "ancien");
});

test("une version postérieure, même mineure, attend une adaptation", () => {
  // Aucun réexport n'y changera rien : c'est le repository qui doit rattraper.
  assert.equal(verdictDeVersion("12.1"), "recent");
  assert.equal(verdictDeVersion("13.0"), "recent");
});

test("une plage ouverte reste utilisable pendant une migration", () => {
  // La forme à deux bornes doit continuer de fonctionner le jour où deux
  // schémas cohabitent, sinon la migration n'aurait aucun chemin.
  assert.equal(verdictDeVersion("4.1", { minimum: "4.0", maximum: "4.2" }), "ok");
  assert.equal(verdictDeVersion("4.3", { minimum: "4.0", maximum: "4.2" }), "recent");
});

test("une mineure se compare en nombre, pas en texte", () => {
  // `4.10` suit `4.9`. Comparé comme du texte, il la précéderait.
  assert.equal(verdictDeVersion("4.10", { minimum: "4.2", maximum: "4.9" }), "recent");
  assert.equal(verdictDeVersion("4.10", { minimum: "4.2", maximum: "4.11" }), "ok");
});

test("une plage de support incohérente fait échouer le garde-fou", () => {
  assert.throws(
    () => verdictDeVersion("4.2", { minimum: "4.3", maximum: "4.2" }),
    /Plage de versions de contrat invalide/,
  );
});

test("une version illisible est traitée comme trop ancienne", () => {
  // C'est le seul verdict qu'un ré-export peut effectivement corriger.
  assert.equal(verdictDeVersion(undefined), "ancien");
  assert.equal(verdictDeVersion("brouillon"), "ancien");
});
