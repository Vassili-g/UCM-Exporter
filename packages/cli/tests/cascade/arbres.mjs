/**
 * Les arbres de la preuve : l'annexe A.5 et la section 4.4 du plan final.
 * `racine` pose des attributs sur `<html>` ; chaque élément `data-sonde` est
 * relevé ; `etapes` modifie l'arbre et fait relever de nouveau.
 */

const sonde = (nom) => `<p data-sonde="${nom}"></p>`;

function permutations(elements) {
  if (elements.length <= 1) return [elements];
  return elements.flatMap((premier, rang) => (
    permutations([...elements.slice(0, rang), ...elements.slice(rang + 1)]).map((suite) => [premier, ...suite])
  ));
}

const TROIS_ATTRIBUTS = [["data-marque", "m2"], ["data-theme", "dark"], ["data-densite", "compact"]];

/** Chaque ordre d'imbrication de trois attributs, une sonde à chaque niveau. */
const ordresDImbrication = permutations(TROIS_ATTRIBUTS).map((ordre) => ({
  nom: `trois axes imbriqués : ${ordre.map(([attribut]) => attribut).join(", ")}`,
  corps: ordre.reduceRight(
    (dedans, [attribut, valeur], niveau) => `<div ${attribut}="${valeur}">${sonde(`niveau-${niveau}`)}${dedans}</div>`,
    "",
  ),
}));

export const ARBRES_AXES = [
  { nom: "aucun attribut", corps: sonde("seule") },
  {
    nom: "b sur <html>, puis a dans un sous-arbre",
    racine: { "data-marque": "m2" },
    corps: `${sonde("haut")}<section data-marque="m1">${sonde("bas")}</section>`,
  },
  {
    nom: "a, puis b, puis a",
    corps: `<div data-marque="m1">${sonde("1")}<div data-marque="m2">${sonde("2")}`
      + `<div data-marque="m1">${sonde("3")}</div></div></div>`,
  },
  {
    nom: "marque b, puis thème sombre",
    corps: `<div data-marque="m2">${sonde("marque")}<div data-theme="dark">${sonde("theme")}</div></div>`,
  },
  {
    nom: "thème sombre, puis marque b",
    corps: `<div data-theme="dark">${sonde("theme")}<div data-marque="m2">${sonde("marque")}</div></div>`,
  },
  {
    nom: "b et sombre sur le même élément",
    corps: `<div data-sonde="meme" data-marque="m2" data-theme="dark">${sonde("dedans")}</div>`,
  },
  {
    nom: "b sur un conteneur en display: contents",
    corps: `<div style="display: contents" data-marque="m2">${sonde("dedans")}</div>`,
  },
  ...ordresDImbrication,
  {
    nom: "axe indépendant entre deux axes croisés",
    corps: `<div data-marque="m2"><div data-libre="y">${sonde("libre")}<div data-theme="dark">${sonde("bas")}</div></div></div>`
      + `<div data-theme="dark"><div data-libre="y"><div data-marque="m2">${sonde("inverse")}</div></div></div>`,
  },
  {
    nom: "mode inconnu ou attribut vide entre deux portées valides",
    corps: `<div data-marque="m2"><div data-marque="inconnu">${sonde("inconnu")}`
      + `<div data-marque="">${sonde("vide")}<div data-theme="dark" data-marque="autre">${sonde("bas")}</div></div></div></div>`,
  },
  {
    nom: "ajout, changement, puis retrait d'un attribut",
    racine: { "data-theme": "dark" },
    corps: `<div id="cible">${sonde("dedans")}</div>`,
    etapes: [
      { selecteur: "#cible", attribut: "data-marque", valeur: "m2" },
      { selecteur: "#cible", attribut: "data-marque", valeur: "m1" },
      { selecteur: "#cible", attribut: "data-marque", valeur: null },
    ],
  },
  {
    nom: "alias changé dans un seul mode, dépendances en losange",
    corps: ["m1", "m2"].flatMap((marque) => ["light", "dark"].map((theme) => (
      `<div data-sonde="${marque}-${theme}" data-marque="${marque}" data-theme="${theme}"></div>`
      + `<div data-theme="${theme}"><div data-marque="${marque}">${sonde(`${marque}-${theme}-imbrique`)}</div></div>`
    ))).join(""),
  },
];

/** Les permutations de l'ordre de déclaration, pour trois attributs sur un même élément. */
export const ORDRES_DE_DECLARATION = permutations(["marque", "theme", "densite"]).map((ordre) => [...ordre, "libre"]);

export const ELEMENT_A_TROIS_ATTRIBUTS = {
  nom: "trois attributs sur un élément",
  corps: `<div data-sonde="meme" data-marque="m2" data-theme="dark" data-densite="confort">${sonde("dedans")}</div>`,
};

export const ARBRES_SANS_VALEUR = [
  { nom: "aucun attribut", corps: sonde("seule") },
  {
    nom: "mode sans valeur, puis mode par défaut, puis mode sans valeur",
    corps: `<div data-marque="m2">${sonde("1")}<div data-marque="m1">${sonde("2")}`
      + `<div data-marque="m2">${sonde("3")}</div></div></div>`,
  },
];

const E = "data-color-extensions";

export const ARBRES_EXTENSIONS = [
  { nom: "aucun attribut", corps: sonde("seule") },
  {
    nom: "marque-b sur <html>, puis dark",
    racine: { [E]: "marque-b" },
    corps: `${sonde("haut")}<div data-color="dark">${sonde("bas")}</div>`,
  },
  {
    nom: "dark sur <html>, puis sous-marque",
    racine: { "data-color": "dark" },
    corps: `${sonde("haut")}<div ${E}="sous-marque">${sonde("bas")}</div>`,
  },
  {
    nom: "sous-marque et dark sur le même élément",
    corps: `<div data-sonde="meme" ${E}="sous-marque" data-color="dark">${sonde("dedans")}</div>`,
  },
  {
    nom: "marque-b, puis sous-marque, puis base",
    corps: `<div ${E}="marque-b">${sonde("1")}<div ${E}="sous-marque">${sonde("2")}`
      + `<div ${E}="base">${sonde("3")}</div></div></div>`,
  },
  {
    nom: "sous-marque sur <html>, puis compact",
    racine: { [E]: "sous-marque" },
    corps: `<div data-densite="compact">${sonde("dedans")}</div>`,
  },
  {
    nom: "alias entre deux feuilles surchargées",
    corps: ["marque-b", "sous-marque"].flatMap((extension) => ["light", "dark"].map((mode) => (
      `<div data-sonde="${extension}-${mode}" ${E}="${extension}" data-color="${mode}"></div>`
      + `<div data-color="${mode}"><div ${E}="${extension}">${sonde(`${extension}-${mode}-sous-le-mode`)}</div></div>`
      + `<div ${E}="${extension}"><div data-color="${mode}">${sonde(`${extension}-${mode}-sous-l-extension`)}</div></div>`
    ))).join(""),
  },
];
