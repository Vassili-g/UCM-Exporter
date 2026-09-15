/**
 * Les axes de modes sur des documents tirés au hasard, graine fixe. Les cycles
 * actifs et les cônes se comparent à une recherche exhaustive sur chaque
 * contexte, et les lecteurs reçoivent des valeurs JSON quelconques.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { axeDesExtensions } from "@ucm-kit/core/format";
import {
  axesDeTokens,
  axesDuContrat,
  caracteristiquesDuContrat,
  cheminDeReference,
  conesDesAxes,
  contextesDesAxes,
  cyclesActifs,
  indexerTokensDtcg,
  valeurDansLeContexte,
} from "@ucm-kit/core/lecteurs";

/** Un générateur congruentiel : la même graine rend la même suite. */
function tirage(graine) {
  let etat = graine;
  const suivant = () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
  return { suivant, choisir: (liste) => liste[Math.floor(suivant() * liste.length)] };
}

/**
 * Un document complet : un à trois axes, des extensions sur deux générations,
 * des feuilles sans axe, et des alias vers n'importe quelle feuille.
 */
function documentAleatoire({ suivant, choisir }, probabiliteDAlias) {
  const axes = {};
  const plan = [];
  for (let rang = 0, nombre = 1 + Math.floor(suivant() * 3); rang < nombre; rang += 1) {
    const modes = Array.from({ length: 1 + Math.floor(suivant() * 2) + (rang === 0 ? 1 : 0) }, (_, position) => `m${position}`);
    const declaration = { modes, default: choisir(modes) };
    if (suivant() < 0.5) {
      const extensions = {};
      for (let position = 0, total = 1 + Math.floor(suivant() * 3); position < total; position += 1) {
        extensions[`e${position}`] = { parent: position === 0 ? "base" : choisir(["base", ...Object.keys(extensions)]) };
      }
      declaration.extensions = extensions;
    }
    axes[`a${rang}`] = declaration;
    for (let feuille = 0, total = 1 + Math.floor(suivant() * 3); feuille < total; feuille += 1) plan.push([`a${rang}.f${feuille}`, `a${rang}`]);
  }
  for (let feuille = 0, total = Math.floor(suivant() * 3); feuille < total; feuille += 1) plan.push([`libre.f${feuille}`, null]);

  const chemins = plan.map(([chemin]) => chemin);
  const valeur = () => (suivant() < probabiliteDAlias ? `{${choisir(chemins)}}` : Math.floor(suivant() * 100));
  const document = { $extensions: { "com.ucm.formatVersion": 2, "com.ucm.axes": axes } };
  for (const [chemin, axe] of plan) {
    const [groupe, nom] = chemin.split(".");
    document[groupe] ??= {};
    if (axe === null) {
      document[groupe][nom] = { $type: "number", $value: valeur() };
      continue;
    }
    const declaration = axes[axe];
    const modes = Object.fromEntries(declaration.modes.map((mode) => [mode, valeur()]));
    const extensions = { "com.ucm.axis": axe, "com.ucm.modes": modes };
    if (declaration.extensions && suivant() < 0.7) {
      const surcharges = {};
      for (const extension of Object.keys(declaration.extensions)) {
        if (suivant() < 0.5) continue;
        surcharges[extension] = Object.fromEntries(declaration.modes.filter(() => suivant() < 0.6).map((mode) => [mode, valeur()]));
      }
      extensions["com.ucm.extensions"] = surcharges;
    }
    document[groupe][nom] = { $type: "number", $value: modes[declaration.default], $extensions: extensions };
  }
  return document;
}

/** Chaque contexte complet : un mode par axe, et une extension par axe qui en déclare. */
function tousLesContextes(axes) {
  let contextes = [{}];
  for (const axe of axes) {
    contextes = contextes.flatMap((contexte) => axe.modes.map((mode) => ({ ...contexte, [axe.nom]: mode })));
    const extensions = Object.keys(axe.extensions ?? {});
    if (extensions.length === 0) continue;
    contextes = contextes.flatMap((contexte) => ["base", ...extensions].map((extension) => (
      { ...contexte, [axeDesExtensions(axe.nom)]: extension }
    )));
  }
  return contextes;
}

/** Le littéral d'une feuille dans un contexte, alias suivis, ou `CYCLE`. */
function resolue(document, index, chemin, contexte) {
  const vus = new Set();
  for (let courant = chemin; ;) {
    if (vus.has(courant)) return "CYCLE";
    vus.add(courant);
    const valeur = valeurDansLeContexte(document, courant, contexte);
    const cible = cheminDeReference(valeur);
    if (cible === null || !index.has(cible)) return valeur;
    courant = cible;
  }
}

test("un cycle est actif exactement quand un contexte le réalise, sur 600 documents tirés au hasard", () => {
  const hasard = tirage(1);
  let actifs = 0;
  for (let tour = 0; tour < 600; tour += 1) {
    const document = documentAleatoire(hasard, tour % 2 === 0 ? 0.45 : 0.2);
    const { etat, axes } = axesDeTokens(document);
    assert.equal(etat, "complet");
    const index = indexerTokensDtcg(document);
    const attendu = tousLesContextes(axes).some((contexte) => (
      [...index.keys()].some((chemin) => resolue(document, index, chemin, contexte) === "CYCLE")
    ));
    const { cycles, interrompue } = cyclesActifs(document, axes);
    assert.equal(interrompue, false);
    assert.equal(cycles.length > 0, attendu, JSON.stringify(document));
    if (attendu) actifs += 1;
  }
  assert.ok(actifs > 100 && actifs < 500, `${actifs} documents à cycle actif : le tirage ne couvre plus les deux cas`);
});

test("une feuille dont la valeur change avec un axe a cet axe dans son cône, sur 600 documents sans cycle", () => {
  const hasard = tirage(2);
  let verifies = 0;
  for (let tour = 0; tour < 600; tour += 1) {
    const document = documentAleatoire(hasard, 0.25);
    const { axes } = axesDeTokens(document);
    if (cyclesActifs(document, axes).cycles.length > 0) continue;
    const index = indexerTokensDtcg(document);
    const cones = conesDesAxes(document, axes);
    const contextes = tousLesContextes(axes);
    for (const axe of contextesDesAxes(document, axes)) {
      for (const chemin of index.keys()) {
        const depend = contextes.some((contexte) => new Set(axe.modes.map((mode) => (
          JSON.stringify(resolue(document, index, chemin, { ...contexte, [axe.nom]: mode }))
        ))).size > 1);
        if (depend) assert.ok(cones.get(chemin)?.has(axe.nom), `${chemin} dépend de ${axe.nom}\n${JSON.stringify(document)}`);
        verifies += 1;
      }
    }
  }
  assert.ok(verifies > 1000, `${verifies} couples vérifiés`);
});

const CLES = ["$value", "$type", "$extensions", "com.ucm.axes", "com.ucm.axis", "com.ucm.modes", "com.ucm.extensions",
  "modes", "default", "extensions", "parent", "base", "__proto__", "constructor", "a", "light", "composes", "component",
  "viewStructures", "children", "layout", "variants", "strokes", "tokens", "rendering", "keyRoles", "stateModel",
  "states", "selector", "samples", "meta", "coverage", "portable", "structure", "sizes", "viewTypographies", "icons"];
const SCALAIRES = [null, 0, -1, 1.5, "", "base", "light", "{a.b}", "{a}", true, "partial", ":focus", "ring", "grid", "absolute"];

/** Une valeur JSON quelconque, clés du format comprises, `__proto__` en propriété propre. */
function valeurQuelconque({ suivant, choisir }, profondeur = 0) {
  const tire = suivant();
  if (profondeur > 5 || tire < 0.35) return choisir(SCALAIRES);
  if (tire < 0.5) return Array.from({ length: Math.floor(suivant() * 4) }, () => valeurQuelconque({ suivant, choisir }, profondeur + 1));
  const objet = {};
  for (let reste = Math.floor(suivant() * 5); reste > 0; reste -= 1) {
    Object.defineProperty(objet, choisir(CLES), {
      value: valeurQuelconque({ suivant, choisir }, profondeur + 1), enumerable: true, configurable: true, writable: true,
    });
  }
  return objet;
}

test("les lecteurs des modes et des caractéristiques ne lèvent sur aucune valeur JSON", () => {
  const hasard = tirage(3);
  for (let tour = 0; tour < 3000; tour += 1) {
    const document = valeurQuelconque(hasard);
    const contrat = valeurQuelconque(hasard);
    const { axes } = axesDeTokens(document);
    valeurDansLeContexte(document, hasard.choisir(["a", "a.b", "__proto__"]), valeurQuelconque(hasard, 3));
    const cones = conesDesAxes(document, axes);
    cyclesActifs(document, axes);
    axesDuContrat(contrat, new Map([["a", valeurQuelconque(hasard, 2)]]), cones);
    caracteristiquesDuContrat(contrat, new Map(), cones);
  }
});
