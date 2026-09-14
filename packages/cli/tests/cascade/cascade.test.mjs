/**
 * La preuve de cascade de la section 4.4 du plan final : la feuille des tokens,
 * chargée dans Chromium, Firefox et WebKit, rend dans chaque élément relevé la
 * valeur que `valeurDansLeContexte` lit sur le document, pour chaque feuille du
 * document. L'oracle ne lit jamais la feuille CSS.
 *
 * Se lance par `npm run cascade`, hors de `npm test` : les trois moteurs
 * s'installent à part, par `npx playwright install`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { tokenCssVariable } from "@ucm-kit/core/format";
import {
  axesDeTokens,
  cheminDeReference,
  indexerTokensDtcg,
  valeurDansLeContexte,
} from "@ucm-kit/core/lecteurs";
import { chromium, firefox, webkit } from "playwright";

import { attributsDesAxes, feuilleDesTokens } from "../../src/tokens-css.mjs";
import {
  ARBRES_AXES,
  ARBRES_EXTENSIONS,
  ELEMENT_A_TROIS_ATTRIBUTS,
  ORDRES_DE_DECLARATION,
} from "./arbres.mjs";
import { DEUX_AXES, EXTENSIONS, TROIS_AXES, avecOrdreDesAxes } from "./documents.mjs";
import { emettre } from "./emetteur-provisoire.mjs";

const lire = (nom) => readFileSync(new URL(nom, import.meta.url), "utf8").replace(/\r\n/g, "\n");

const CSS_DEUX_AXES = lire("./attendu-deux-axes.css");
const CSS_EXTENSIONS = lire("./attendu-extensions.css");

/** La feuille qu'`ucm tokens css` écrit pour un document sans extension, en-tête retiré. */
function feuilleDeLaCommande(document) {
  const { axes } = axesDeTokens(document);
  const { css, refus } = feuilleDesTokens(document, { axes, attributs: attributsDesAxes(axes).attributs });
  assert.deepEqual(refus, []);
  return css;
}

test("la commande rend le CSS écrit à la main et la sortie de l'émetteur provisoire", () => {
  assert.equal(feuilleDeLaCommande(DEUX_AXES), CSS_DEUX_AXES);
  assert.equal(feuilleDeLaCommande(TROIS_AXES), emettre(TROIS_AXES).css);
});

test("l'émetteur provisoire rend le CSS écrit à la main des extensions", () => {
  assert.equal(emettre(EXTENSIONS).css, CSS_EXTENSIONS);
});

const CAS = [
  ...ARBRES_AXES.map((arbre) => ({ ...arbre, document: DEUX_AXES, css: feuilleDeLaCommande(DEUX_AXES), source: "deux axes" })),
  ...ARBRES_AXES.map((arbre) => ({ ...arbre, document: TROIS_AXES, css: feuilleDeLaCommande(TROIS_AXES), source: "trois axes" })),
  ...ORDRES_DE_DECLARATION.map((ordre) => {
    const document = avecOrdreDesAxes(TROIS_AXES, ordre);
    return { ...ELEMENT_A_TROIS_ATTRIBUTS, document, css: feuilleDeLaCommande(document), source: `axes ${ordre.join(", ")}` };
  }),
  ...ARBRES_EXTENSIONS.map((arbre) => ({ ...arbre, document: EXTENSIONS, css: CSS_EXTENSIONS, source: "extensions" })),
];

function pageDe({ css, racine = {}, corps }) {
  const attributs = Object.entries(racine).map(([nom, valeur]) => ` ${nom}="${valeur}"`).join("");
  return `<!doctype html><html${attributs}><head><style>${css}</style></head><body>${corps}</body></html>`;
}

/** Pour chaque sonde : les attributs de ses ancêtres, de la racine à elle, et ses valeurs calculées. */
function relever(page, noms) {
  return page.evaluate((proprietes) => Array.from(document.querySelectorAll("[data-sonde]"), (element) => {
    const chaine = [];
    for (let noeud = element; noeud; noeud = noeud.parentElement) {
      chaine.unshift(Object.fromEntries(Array.from(noeud.attributes, (attribut) => [attribut.name, attribut.value])));
    }
    const style = getComputedStyle(element);
    return {
      sonde: element.getAttribute("data-sonde"),
      chaine,
      valeurs: Object.fromEntries(proprietes.map((nom) => [nom, style.getPropertyValue(nom).trim()])),
    };
  }), noms);
}

/** Le contexte effectif : pour chaque axe, l'ancêtre le plus proche dont la valeur est un de ses contextes. */
function contexteDe(chaine, axes) {
  const contexte = new Map();
  for (const axe of axes) {
    const porteur = [...chaine].reverse().find((attributs) => axe.contextes.includes(attributs[axe.attribut]));
    if (porteur) contexte.set(axe.nom, porteur[axe.attribut]);
  }
  return contexte;
}

/** Le littéral qu'une feuille prend dans un contexte, alias suivis. */
function valeurResolue(document, chemin, contexte) {
  const vus = new Set();
  let courant = chemin;
  for (;;) {
    if (vus.has(courant)) throw new Error(`cycle d'alias sur ${chemin}`);
    vus.add(courant);
    const valeur = valeurDansLeContexte(document, courant, contexte);
    const cible = cheminDeReference(valeur);
    if (cible === null) return valeur;
    courant = cible;
  }
}

const cheminsDe = (document) => [...indexerTokensDtcg(document).keys()];

function ecarts(releves, { document }) {
  const { axes } = emettre(document);
  const fautes = [];
  for (const { sonde, chaine, valeurs } of releves) {
    const contexte = contexteDe(chaine, axes);
    for (const chemin of cheminsDe(document)) {
      const attendu = String(valeurResolue(document, chemin, contexte));
      const rendu = valeurs[tokenCssVariable(chemin)];
      if (rendu !== attendu) fautes.push(`sonde ${sonde}, ${chemin} : attendu ${attendu}, rendu ${rendu}`);
    }
  }
  return fautes;
}

for (const [nom, moteur] of Object.entries({ chromium, firefox, webkit })) {
  test(`la cascade rend la valeur de l'oracle dans ${nom}`, async (contexte) => {
    const navigateur = await moteur.launch();
    try {
      contexte.diagnostic(`${nom} ${navigateur.version()}`);
      const page = await navigateur.newPage();
      for (const cas of CAS) {
        await contexte.test(`${cas.source} : ${cas.nom}`, async () => {
          await page.setContent(pageDe(cas));
          const noms = cheminsDe(cas.document).map(tokenCssVariable);
          const fautes = ecarts(await relever(page, noms), cas);
          for (const etape of cas.etapes ?? []) {
            await page.evaluate(({ selecteur, attribut, valeur }) => {
              const element = document.querySelector(selecteur);
              if (valeur === null) element.removeAttribute(attribut);
              else element.setAttribute(attribut, valeur);
            }, etape);
            const apres = `après ${etape.attribut}=${etape.valeur}`;
            fautes.push(...ecarts(await relever(page, noms), cas).map((faute) => `${apres}, ${faute}`));
          }
          assert.deepEqual(fautes, []);
        });
      }
    } finally {
      await navigateur.close();
    }
  });
}
