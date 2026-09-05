import assert from "node:assert/strict";
import test from "node:test";
import { bilanEstBloquant, enteteDuVerdict } from "../src/lecteurs/verdict-bilan.mjs";

function bilan(overrides = {}) {
  return {
    illisible: false,
    champsAbsents: [],
    version: null,
    graphe: [],
    manquants: [],
    nonListes: [],
    fantomes: [],
    typesTypographiques: [],
    ...overrides,
  };
}

test("une référence absente des tokens ne bloque pas le contrat", () => {
  assert.equal(bilanEstBloquant(bilan({ manquants: ["{ancien.token}"] })), false);
});

test("les incohérences internes du contrat restent bloquantes", () => {
  assert.equal(bilanEstBloquant(bilan({ nonListes: ["{token.non.indexe}"] })), true);
  assert.equal(bilanEstBloquant(bilan({ champsAbsents: ["props"] })), true);
  assert.equal(bilanEstBloquant(bilan({ version: { valeur: "99.0" } })), true);
});

/**
 * Le titre du rapport annonce des CONTRATS invalides. Un `.tsx` qui s'écarte de
 * son contrat n'en rend aucun invalide : le verdict l'ignore, faute de quoi le
 * titre mentirait et la pull request d'un designer serait refusée pour un geste
 * qui ne lui appartient pas.
 */
test("un écart contrat ↔ code ne rend pas le contrat bloquant", () => {
  const enEcart = bilan({
    parite: {
      manquantes: ["disabled"],
      compositionsIncorrectes: [{ component: "TileLink", attendu: 7, rendu: 14 }],
    },
  });

  assert.equal(bilanEstBloquant(enEcart), false);
});

test("le titre n'accuse les contrats que lorsqu'un contrat est en cause", () => {
  assert.match(enteteDuVerdict(1)[0], /^## ❌ 1 contrat invalide$/);
  assert.match(enteteDuVerdict(3)[0], /^## ❌ 3 contrats invalides$/);
});

/**
 * Une pull request peut être refusée par un test rouge ou un build cassé sans
 * qu'aucun contrat n'y soit pour rien. Le titre le dit alors du repository.
 */
test("sans contrat fautif, le titre nomme le repository et disculpe les contrats", () => {
  const entete = enteteDuVerdict(0);

  assert.equal(entete[0], "## ❌ Les contrôles du repository bloquent la fusion");
  assert.match(entete[2], /^Les contrats sont valides\./);
  assert.doesNotMatch(entete.join("\n"), /invalide/);
});

test("les avertissements d'export sont annoncés comme non bloquants à eux seuls", () => {
  assert.match(enteteDuVerdict(0, true)[2], /ne bloquent pas à eux seuls/);
});

/**
 * Un contrat que seule sa version bloque n'est pas un contrat invalide.
 *
 * T2.1b. Il est parfaitement formé, et aucun réexport ne le rendra lisible :
 * c'est le repository qui est en retard sur le format. Le titre le dit
 * désormais, à l'endroit le plus visible du rapport.
 */
test("le titre distingue un contrat cassé d'une version que le repo ne lit pas", () => {
  const versionSeule = bilan({ version: { valeur: "99.0", verdict: "recent" } });
  const entete = enteteDuVerdict([versionSeule]);

  assert.match(entete[0], /^## ❌ 1 contrat dans une version que ce repository ne lit pas$/);
  assert.match(entete[2], /C'est le repository qui doit rattraper/);
});

/**
 * T7.3 — le titre et la section ne doivent pas nommer deux responsables.
 *
 * Le défaut a survécu parce que tous les tests de ce fichier fabriquaient une
 * version FUTURE : le sens `ancien` n'était éprouvé qu'au niveau de la section.
 * L'en-tête écrivait alors « réexporter n'y changerait rien » trois lignes
 * au-dessus d'une action qui demande de réexporter, et c'est la première phrase
 * que le designer lit.
 */
test("le sens de l'écart de version décide du responsable annoncé", () => {
  const ancien = enteteDuVerdict([bilan({ version: { valeur: "11.0", verdict: "ancien" } })]);

  assert.match(ancien[0], /^## ❌ 1 contrat dans une version que ce repository ne lit pas$/);
  assert.match(ancien[2], /réexportez-le depuis Figma/);
  assert.doesNotMatch(
    ancien[2],
    /réexporter n'y changerait rien/,
    "un contrat trop ancien se corrige précisément par un réexport",
  );
});

/**
 * Une version illisible — champ absent, vide, ou d'un autre type — est traitée
 * comme ancienne par `verdictDeVersion` : c'est le seul cas qu'un réexport
 * corrige. Le titre doit suivre la même règle plutôt que de retomber sur la
 * phrase du sens opposé.
 */
test("une version sans verdict lisible est annoncée comme un réexport", () => {
  const entete = enteteDuVerdict([bilan({ version: { valeur: "onze" } })]);
  assert.match(entete[2], /réexportez-le depuis Figma/);
});

/**
 * Les deux sens dans le même rapport : aucune phrase unique n'est vraie. En
 * choisir une accuserait la moitié des contrats à tort — on renvoie au détail,
 * qui nomme le geste contrat par contrat.
 */
test("deux sens d'écart dans le même rapport ne désignent aucun responsable unique", () => {
  const entete = enteteDuVerdict([
    bilan({ version: { valeur: "11.0", verdict: "ancien" } }),
    bilan({ version: { valeur: "99.0", verdict: "recent" } }),
  ]);

  assert.match(entete[0], /^## ❌ 2 contrats dans une version que ce repository ne lit pas$/);
  assert.match(entete[2], /le détail ci-dessous nomme le geste attendu/);
  assert.doesNotMatch(entete[2], /réexportez-les|rattraper le format/);
});

test("un seul contrat réellement cassé ramène le titre à « invalide »", () => {
  // La règle est « tous », pas « au moins un » : dès qu'un contrat est cassé, le
  // rapport doit le dire en premier — c'est le seul des deux qu'un réexport
  // corrige, donc le seul qui appelle un geste immédiat.
  const entete = enteteDuVerdict([
    bilan({ version: { valeur: "99.0", verdict: "recent" } }),
    bilan({ champsAbsents: ["rendering.roles"] }),
  ]);

  assert.match(entete[0], /^## ❌ 2 contrats invalides$/);
});

test("un nombre reste accepté, pour les appels qui ne comptent que", () => {
  assert.match(enteteDuVerdict(2)[0], /^## ❌ 2 contrats invalides$/);
});
