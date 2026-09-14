/**
 * Les documents de tokens de la preuve de cascade. Les valeurs sont des
 * nombres : un moteur les rend tels quels dans une propriété personnalisée, là
 * où chacun sérialise une couleur à sa façon.
 */

const MARQUE = { "com.ucm.formatVersion": 2 };

function feuille(axe, modes, { defaut, surcharges } = {}) {
  const extensions = { "com.ucm.axis": axe, "com.ucm.modes": modes };
  if (surcharges) extensions["com.ucm.extensions"] = surcharges;
  return { $type: "number", $value: modes[defaut ?? Object.keys(modes)[0]], $extensions: extensions };
}

const alias = (reference) => ({ $type: "number", $value: reference });

/** Deux axes croisés : `theme.fond` cite une feuille de `marque` qui change dans le seul mode `dark`. */
export const DEUX_AXES = {
  $extensions: {
    ...MARQUE,
    "com.ucm.axes": {
      marque: { modes: ["m1", "m2"], default: "m1" },
      theme: { modes: ["light", "dark"], default: "light" },
    },
  },
  marque: {
    primaire: feuille("marque", { m1: 1, m2: 2 }),
    sombre: feuille("marque", { m1: 3, m2: 4 }),
  },
  theme: { fond: feuille("theme", { light: "{marque.primaire}", dark: "{marque.sombre}" }) },
  composant: { fond: alias("{theme.fond}") },
};

/**
 * Trois axes liés en chaîne, un axe indépendant déclaré entre eux, un défaut
 * qui n'est pas le premier mode, et un losange : `theme.losange` rejoint
 * `marque.haut` par deux chemins selon le mode.
 */
export const TROIS_AXES = {
  $extensions: {
    ...MARQUE,
    "com.ucm.axes": {
      marque: { modes: ["m1", "m2"], default: "m1" },
      libre: { modes: ["x", "y"], default: "x" },
      theme: { modes: ["light", "dark"], default: "light" },
      densite: { modes: ["compact", "confort"], default: "confort" },
    },
  },
  marque: {
    primaire: feuille("marque", { m1: 1, m2: 2 }),
    sombre: feuille("marque", { m1: 3, m2: 4 }),
    haut: feuille("marque", { m1: 5, m2: 6 }),
  },
  libre: { valeur: feuille("libre", { x: 7, y: 8 }) },
  theme: {
    fond: feuille("theme", { light: "{marque.primaire}", dark: "{marque.sombre}" }),
    losange: feuille("theme", { light: "{losange.gauche}", dark: "{losange.droite}" }),
  },
  densite: {
    espace: feuille("densite", { compact: 100, confort: "{theme.fond}" }, { defaut: "confort" }),
  },
  losange: { gauche: alias("{marque.haut}"), droite: alias("{marque.haut}") },
  composant: { fond: alias("{densite.espace}") },
};

/** `TROIS_AXES` avec ses axes déclarés dans un autre ordre. */
export function avecOrdreDesAxes(document, ordre) {
  const axes = document.$extensions["com.ucm.axes"];
  return {
    ...document,
    $extensions: {
      ...document.$extensions,
      "com.ucm.axes": Object.fromEntries(ordre.map((nom) => [nom, axes[nom]])),
    },
  };
}

/**
 * Une collection étendue sur trois générations, `base`, `marque-b` et
 * `sous-marque`, croisée avec `densite`. `color.f2` cite `color.f1` dans la
 * surcharge de `marque-b`, et les deux sont surchargées dans des modes
 * différents ; `sous-marque` ne surcharge pas `color.f2`.
 */
export const EXTENSIONS = {
  $extensions: {
    ...MARQUE,
    "com.ucm.axes": {
      color: {
        modes: ["light", "dark"],
        default: "light",
        extensions: { "marque-b": { parent: "base" }, "sous-marque": { parent: "marque-b" } },
      },
      densite: { modes: ["confort", "compact"], default: "confort" },
    },
  },
  color: {
    f1: feuille("color", { light: 10, dark: 11 }, {
      surcharges: { "marque-b": { dark: 21 }, "sous-marque": { light: 30 } },
    }),
    f2: feuille("color", { light: 12, dark: 13 }, { surcharges: { "marque-b": { light: "{color.f1}" } } }),
    f3: feuille("color", { light: 14, dark: 15 }),
  },
  densite: { espace: feuille("densite", { confort: "{color.f1}", compact: "{color.f2}" }) },
  composant: { fond: alias("{densite.espace}") },
};

/**
 * Le document de la mesure de taille : une collection à deux modes, des
 * extensions qui surchargent chacune des feuilles distinctes dans un mode, et
 * une feuille de composant par feuille surchargée. La seconde moitié des
 * extensions hérite de la première, pour que la profondeur compte.
 */
export function documentDeTaille({ extensions, surchargesParExtension }) {
  const color = {};
  const composant = {};
  for (let indice = 0; indice < extensions * surchargesParExtension; indice += 1) {
    color[`t${indice}`] = feuille("color", { light: indice, dark: indice + 0.5 });
    composant[`c${indice}`] = alias(`{color.t${indice}}`);
  }

  const declarations = {};
  const moitie = extensions / 2;
  for (let rang = 0; rang < extensions; rang += 1) {
    const nom = `marque-${rang}`;
    declarations[nom] = { parent: rang < moitie ? "base" : `marque-${rang - moitie}` };
    for (let decalage = 0; decalage < surchargesParExtension; decalage += 1) {
      const surchargee = color[`t${rang * surchargesParExtension + decalage}`];
      surchargee.$extensions["com.ucm.extensions"] = { [nom]: { dark: 1000 + rang } };
    }
  }

  return {
    $extensions: {
      ...MARQUE,
      "com.ucm.axes": { color: { modes: ["light", "dark"], default: "light", extensions: declarations } },
    },
    color,
    composant,
  };
}
