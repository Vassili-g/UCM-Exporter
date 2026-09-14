/**
 * Les axes de modes de `tokens.json` : l'état d'un fichier, la valeur d'une
 * feuille dans un contexte, les cônes, les axes d'un contrat, les contextes à
 * vérifier et les cycles actifs. Chaque document est synthétique.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  BORNE_DES_CYCLES,
  axeDesExtensions,
  axesDeTokens,
  axesDuContrat,
  conesDesAxes,
  contextesDeVerification,
  cyclesActifs,
  valeurDansLeContexte,
} from "@ucm-kit/core/lecteurs";

function feuille(axe, modes, surcharges) {
  const extensions = { "com.ucm.modes": modes };
  if (axe !== undefined) extensions["com.ucm.axis"] = axe;
  if (surcharges) extensions["com.ucm.extensions"] = surcharges;
  return { $type: "number", $value: Object.values(modes)[0], $extensions: extensions };
}

const alias = (reference) => ({ $type: "number", $value: reference });

/** Un document dont la racine déclare `axes` et porte les groupes donnés. */
function documentAvec(axes, groupes) {
  const racine = { "com.ucm.formatVersion": 2 };
  if (axes !== undefined) racine["com.ucm.axes"] = axes;
  return { $extensions: racine, ...groupes };
}

const THEME = { modes: ["light", "dark"], default: "light" };
const MARQUE = { modes: ["m1", "m2"], default: "m2" };

test("un fichier dont aucune feuille ne porte de modes est sans-modes", () => {
  const sansModes = documentAvec(undefined, { espace: { petit: { $type: "number", $value: 4 } } });
  assert.deepEqual(axesDeTokens(sansModes), { etat: "sans-modes", axes: [], constats: [] });

  const voisin = documentAvec({ theme: THEME }, { theme: { fond: feuille("theme", { light: 1, dark: 2 }) } });
  assert.equal(axesDeTokens(voisin).etat, "complet");
});

test("des modes sans déclaration d'axes à la racine viennent d'un export antérieur", () => {
  const anterieur = documentAvec(undefined, { theme: { fond: feuille(undefined, { light: 1, dark: 2 }) } });
  const { etat, constats } = axesDeTokens(anterieur);
  assert.equal(etat, "anterieur");
  assert.equal(constats[0].code, "axes-absents");

  const voisin = documentAvec({}, { theme: { fond: feuille(undefined, { light: 1, dark: 2 }) } });
  assert.equal(axesDeTokens(voisin).etat, "axe-ecarte");
});

test("une feuille à modes sans axe, sous une racine qui déclare les axes, a perdu son axe à l'export", () => {
  const ecarte = documentAvec({ theme: THEME }, {
    theme: { fond: feuille("theme", { light: 1, dark: 2 }) },
    marque: { primaire: feuille(undefined, { m1: 1, m2: 2 }) },
  });
  const { etat, constats } = axesDeTokens(ecarte);
  assert.equal(etat, "axe-ecarte");
  assert.deepEqual(constats.map(({ code, chemin }) => [code, chemin]), [["axe-ecarte", "marque.primaire"]]);

  const voisin = documentAvec({ theme: THEME, marque: MARQUE }, {
    theme: { fond: feuille("theme", { light: 1, dark: 2 }) },
    marque: { primaire: feuille("marque", { m1: 1, m2: 2 }) },
  });
  assert.equal(axesDeTokens(voisin).etat, "complet");
});

test("un axe inconnu, des modes divergents ou un défaut hors des modes rendent le fichier incohérent", () => {
  const cas = [
    documentAvec({ theme: THEME }, { marque: { primaire: feuille("marque", { m1: 1, m2: 2 }) } }),
    documentAvec({ theme: THEME }, { theme: { fond: feuille("theme", { light: 1, sombre: 2 }) } }),
    documentAvec({ theme: { modes: ["light", "dark"], default: "clair" } }, {
      theme: { fond: feuille("theme", { light: 1, dark: 2 }) },
    }),
    documentAvec({ theme: THEME }, {
      theme: {
        fond: { $type: "number", $value: 1, $extensions: { "com.ucm.axis": "theme" } },
        texte: feuille("theme", { light: 1, dark: 2 }),
      },
    }),
  ];
  assert.deepEqual(
    cas.map((document) => axesDeTokens(document).constats.map(({ code }) => code)),
    [["axe-inconnu"], ["modes-divergents"], ["axe-illisible"], ["modes-absents"]],
  );
  for (const document of cas) assert.equal(axesDeTokens(document).etat, "incoherent");

  const voisin = documentAvec({ theme: THEME }, { theme: { fond: feuille("theme", { dark: 2, light: 1 }) } });
  assert.equal(axesDeTokens(voisin).etat, "complet", "l'ordre des clés d'une feuille ne compte pas");
});

test("l'incohérence l'emporte sur un axe écarté", () => {
  const document = documentAvec({ theme: THEME }, {
    theme: { fond: feuille("theme", { light: 1, sombre: 2 }) },
    marque: { primaire: feuille(undefined, { m1: 1, m2: 2 }) },
  });
  assert.equal(axesDeTokens(document).etat, "incoherent");
});

test("des extensions illisibles rendent le fichier incohérent, des extensions lisibles le laissent complet", () => {
  const avecExtensions = (extensions, surcharges) => documentAvec(
    { color: { ...THEME, extensions } },
    { color: { fond: feuille("color", { light: 1, dark: 2 }, surcharges) } },
  );
  assert.equal(axesDeTokens(avecExtensions({ base: { parent: "base" } })).etat, "incoherent");
  assert.equal(axesDeTokens(avecExtensions({ b: { parent: "c" }, c: { parent: "b" } })).etat, "incoherent");
  assert.equal(axesDeTokens(avecExtensions({ b: { parent: "base" } }, { inconnue: { dark: 3 } })).etat, "incoherent");
  assert.equal(axesDeTokens(avecExtensions({ b: { parent: "base" } }, { b: { sombre: 3 } })).etat, "incoherent");

  const { etat, axes } = axesDeTokens(avecExtensions({ b: { parent: "base" } }, { b: { dark: 3 } }));
  assert.equal(etat, "complet");
  assert.deepEqual(axes[0].extensions, { b: { parent: "base" } });
});

test("un fichier complet rend ses axes dans l'ordre de la racine, défaut non premier compris", () => {
  const document = documentAvec({ theme: THEME, marque: MARQUE }, {
    marque: { primaire: feuille("marque", { m1: 1, m2: 2 }) },
    theme: { fond: feuille("theme", { light: "{marque.primaire}", dark: 3 }) },
  });
  assert.deepEqual(axesDeTokens(document), {
    etat: "complet",
    axes: [
      { nom: "theme", modes: ["light", "dark"], defaut: "light", extensions: {}, feuilles: ["theme.fond"] },
      { nom: "marque", modes: ["m1", "m2"], defaut: "m2", extensions: {}, feuilles: ["marque.primaire"] },
    ],
    constats: [],
  });
});

test("valeurDansLeContexte garde les alias et prend le défaut d'un axe absent du contexte", () => {
  const document = documentAvec({ theme: THEME, marque: MARQUE }, {
    marque: { primaire: feuille("marque", { m1: 1, m2: 2 }) },
    theme: { fond: feuille("theme", { light: "{marque.primaire}", dark: 3 }) },
    composant: { fond: alias("{theme.fond}") },
  });
  assert.equal(valeurDansLeContexte(document, "theme.fond", {}), "{marque.primaire}");
  assert.equal(valeurDansLeContexte(document, "theme.fond", { theme: "dark" }), 3);
  assert.equal(valeurDansLeContexte(document, "marque.primaire", {}), 2, "le défaut vient de la déclaration");
  assert.equal(valeurDansLeContexte(document, "marque.primaire", new Map([["marque", "m1"]])), 1);
  assert.equal(valeurDansLeContexte(document, "composant.fond", { theme: "dark" }), "{theme.fond}");
  assert.equal(valeurDansLeContexte(document, "theme.fond", { theme: "sepia" }), undefined);
  assert.equal(valeurDansLeContexte(document, "theme.absent", {}), undefined);
});

test("valeurDansLeContexte remonte les extensions jusqu'à base, alias conservés", () => {
  const document = documentAvec({
    color: { ...THEME, extensions: { "marque-b": { parent: "base" }, "sous-marque": { parent: "marque-b" } } },
  }, {
    color: {
      fond: feuille("color", { light: 1, dark: 2 }, {
        "marque-b": { dark: "{color.nuit}" },
        "sous-marque": { light: 30 },
      }),
      nuit: feuille("color", { light: 5, dark: 6 }),
    },
  });
  const extension = axeDesExtensions("color");
  assert.equal(valeurDansLeContexte(document, "color.fond", { color: "dark" }), 2);
  assert.equal(valeurDansLeContexte(document, "color.fond", { color: "dark", [extension]: "marque-b" }), "{color.nuit}");
  assert.equal(valeurDansLeContexte(document, "color.fond", { color: "dark", [extension]: "sous-marque" }), "{color.nuit}");
  assert.equal(valeurDansLeContexte(document, "color.fond", { [extension]: "sous-marque" }), 30);
  assert.equal(valeurDansLeContexte(document, "color.fond", { [extension]: "marque-b" }), 1);
  assert.equal(valeurDansLeContexte(document, "color.fond", { [extension]: "inconnue" }), undefined);
});

test("conesDesAxes suit les alias de tous les modes, en losange et sur trois axes", () => {
  const document = documentAvec({
    marque: MARQUE,
    theme: { modes: ["dark", "light"], default: "light" },
    densite: { modes: ["confort", "compact"], default: "confort" },
  }, {
    marque: { haut: feuille("marque", { m1: 1, m2: 2 }) },
    losange: { gauche: alias("{marque.haut}"), droite: alias("{marque.haut}") },
    theme: { bas: feuille("theme", { dark: "{losange.gauche}", light: "{losange.droite}" }) },
    densite: { espace: feuille("densite", { confort: 4, compact: "{theme.bas}" }) },
    composant: { fond: alias("{densite.espace}") },
    isole: { valeur: alias(9) },
  });
  const { axes } = axesDeTokens(document);
  const cones = conesDesAxes(document, axes);
  const lire = (chemin) => [...(cones.get(chemin) ?? [])];
  assert.deepEqual(lire("marque.haut"), ["marque"]);
  assert.deepEqual(lire("losange.droite"), ["marque"]);
  assert.deepEqual(lire("theme.bas"), ["marque", "theme"]);
  assert.deepEqual(lire("composant.fond"), ["marque", "theme", "densite"]);
  assert.equal(cones.has("isole.valeur"), false);
});

test("un nom __proto__ reste une donnée, d'axe comme de feuille", () => {
  // Tout passe par JSON.parse : une affectation ou Object.assign ferait de
  // `__proto__` un prototype, là où le fichier en fait une clé.
  const document = JSON.parse(`{
    "$extensions": {
      "com.ucm.formatVersion": 2,
      "com.ucm.axes": { "__proto__": { "modes": ["a", "b"], "default": "a" } }
    },
    "__proto__": { "valeur": { "$type": "number", "$value": 1,
      "$extensions": { "com.ucm.axis": "__proto__", "com.ucm.modes": { "a": 1, "b": 2 } } } },
    "composant": { "fond": { "$type": "number", "$value": "{__proto__.valeur}" } }
  }`);

  const { etat, axes } = axesDeTokens(document);
  assert.equal(etat, "complet");
  assert.deepEqual([...conesDesAxes(document, axes).get("composant.fond")], ["__proto__"]);
  assert.equal(valeurDansLeContexte(document, "__proto__.valeur", JSON.parse('{"__proto__": "b"}')), 2);
});

test("axesDuContrat suit la composition, ignore les échantillons et dit ce qui l'empêche de conclure", () => {
  const document = documentAvec({ theme: THEME, marque: MARQUE }, {
    marque: { primaire: feuille("marque", { m1: 1, m2: 2 }) },
    theme: { fond: feuille("theme", { light: "{marque.primaire}", dark: 3 }), texte: feuille("theme", { light: 1, dark: 2 }) },
  });
  const cones = conesDesAxes(document, axesDeTokens(document).axes);

  const feuilleDeDependance = { name: "Icone", tokens: { fill: "{marque.primaire}" } };
  const dependance = { name: "Badge", composes: [{ component: "Icone" }], tokens: { fill: "{theme.texte}" } };
  const parent = {
    name: "Carte",
    composes: [{ component: "Badge" }],
    tokens: { fill: "{theme.fond}" },
    samples: { text: "{marque.primaire}" },
    meta: { note: "{marque.primaire}" },
  };
  const contratsParNom = new Map([["Badge", dependance], ["Icone", feuilleDeDependance]]);
  assert.deepEqual(axesDuContrat(parent, contratsParNom, cones), {
    axes: ["marque", "theme"],
    croisements: [["marque", "theme"]],
    manquantes: [],
  });

  const seul = { name: "Seul", tokens: { fill: "{theme.texte}" }, samples: { text: "{marque.primaire}" } };
  assert.deepEqual(axesDuContrat(seul, new Map(), cones), { axes: ["theme"], croisements: [], manquantes: [] });

  const ambigu = new Map([["Badge", [dependance, dependance]]]);
  assert.deepEqual(axesDuContrat(parent, ambigu, cones).manquantes, ["Badge"]);
  assert.deepEqual(axesDuContrat(parent, new Map(), cones).manquantes, ["Badge"]);

  const boucle = { name: "Boucle", composes: [{ component: "Boucle" }], tokens: { fill: "{theme.texte}" } };
  assert.deepEqual(axesDuContrat(boucle, new Map([["Boucle", boucle]]), cones).axes, ["theme"]);
});

test("contextesDeVerification rend au plus 1 + A + C contextes", () => {
  const theme = { nom: "theme", modes: ["light", "dark"], defaut: "light" };
  const marque = { nom: "marque", modes: ["m1", "m2"], defaut: "m1" };
  const unique = { nom: "unique", modes: ["seul"], defaut: "seul" };
  assert.deepEqual(contextesDeVerification([theme, marque, unique], [["marque", "theme"], ["theme", "absent"]]), [
    {},
    { theme: "dark" },
    { marque: "m2" },
    { marque: "m2", theme: "dark" },
  ]);
  assert.deepEqual(contextesDeVerification([], []), [{}]);
});

test("un cycle que deux modes du même axe réalisent chacun à moitié n'est pas actif", () => {
  const document = documentAvec({ theme: THEME }, {
    theme: { x: feuille("theme", { light: "{theme.y}", dark: 2 }), y: feuille("theme", { light: 1, dark: "{theme.x}" }) },
  });
  assert.deepEqual(cyclesActifs(document, axesDeTokens(document).axes), { cycles: [], interrompue: false });
});

test("un cycle dans un seul mode, par une feuille sans axe ou sur elle-même est actif", () => {
  const memeMode = documentAvec({ theme: THEME }, {
    theme: { x: feuille("theme", { light: 1, dark: "{theme.y}" }), y: feuille("theme", { light: 2, dark: "{theme.x}" }) },
  });
  assert.deepEqual(cyclesActifs(memeMode, axesDeTokens(memeMode).axes).cycles, [["theme.x", "theme.y", "theme.x"]]);

  const parUneFeuilleSansAxe = documentAvec({ theme: THEME }, {
    libre: { x: alias("{theme.y}") },
    theme: { y: feuille("theme", { light: "{libre.x}", dark: 2 }) },
  });
  assert.deepEqual(
    cyclesActifs(parUneFeuilleSansAxe, axesDeTokens(parUneFeuilleSansAxe).axes).cycles,
    [["libre.x", "theme.y", "libre.x"]],
  );

  const surElleMeme = documentAvec(undefined, { libre: { x: alias("{libre.x}") } });
  assert.deepEqual(cyclesActifs(surElleMeme, []).cycles, [["libre.x", "libre.x"]]);
});

/** Un axe à `n` modes où chaque feuille cite toutes les autres, une par mode : un graphe complet. */
function grapheComplet(taille) {
  const modes = Array.from({ length: taille }, (_, rang) => `m${rang}`);
  const groupe = {};
  for (let rang = 0; rang < taille; rang += 1) {
    groupe[`t${rang}`] = feuille("axe", Object.fromEntries(modes.map((mode, cible) => (
      [mode, cible === rang ? rang : `{groupe.t${cible}}`]
    ))));
  }
  return documentAvec({ axe: { modes, default: "m0" } }, { groupe });
}

test("au-delà de la borne, l'énumération des cycles s'arrête et le dit", () => {
  // Sept sommets donnent 2 365 cycles élémentaires, huit en donnent 16 064.
  const sousLaBorne = grapheComplet(7);
  assert.deepEqual(cyclesActifs(sousLaBorne, axesDeTokens(sousLaBorne).axes), { cycles: [], interrompue: false });

  const auDela = grapheComplet(8);
  assert.equal(BORNE_DES_CYCLES, 10_000);
  assert.equal(cyclesActifs(auDela, axesDeTokens(auDela).axes).interrompue, true);
});
