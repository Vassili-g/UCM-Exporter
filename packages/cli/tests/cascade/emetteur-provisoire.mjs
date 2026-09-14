/**
 * La feuille CSS de la section 4.3 du plan final, écrite pour éprouver la
 * cascade et mesurer sa taille avant que `ucm tokens css` existe. La commande
 * la remplace, axes simples puis extensions.
 *
 * Une collection étendue se ramène au modèle des axes simples : ses
 * intermédiaires `--ucm-x-*` appartiennent à l'axe parent, et chaque feuille
 * surchargée appartient à l'axe d'extension. Les règles de mode, la règle
 * commune et les croisements s'appliquent alors sans cas particulier, sauf la
 * compression par règle de repli que la section 4.3 décrit.
 */
import { tokenCssVariable } from "@ucm-kit/core/format";
import { cheminDeReference, indexerTokensDtcg } from "@ucm-kit/core/lecteurs";

import { contextesDesAxes, nomDeLAxeDExtension } from "./oracle-provisoire.mjs";

const sansTirets = (nom) => tokenCssVariable(nom).slice(2);

export const attributDeMode = (axe) => `data-${sansTirets(axe)}`;

const intermediaire = (extension, chemin) => `--ucm-x-${sansTirets(extension)}--${sansTirets(chemin)}`;

function expression(valeur) {
  const cible = cheminDeReference(valeur);
  return cible === null ? String(valeur) : `var(${tokenCssVariable(cible)})`;
}

const valeursParMode = (modes) => new Map(Object.entries(modes).map(([mode, valeur]) => [mode, expression(valeur)]));

/** Les variables CSS à déclarer, chacune avec son axe propriétaire et sa valeur par contexte. */
function variablesDuDocument(document) {
  const declarations = document.$extensions?.["com.ucm.axes"] ?? {};
  const variables = new Map();

  for (const [chemin, feuille] of indexerTokensDtcg(document)) {
    const extensions = feuille.$extensions ?? {};
    const axe = extensions["com.ucm.axis"];
    const nom = tokenCssVariable(chemin);
    if (axe === undefined) {
      variables.set(nom, { axe: null, valeur: expression(feuille.$value) });
      continue;
    }
    const surcharges = extensions["com.ucm.extensions"];
    if (!surcharges) {
      variables.set(nom, { axe, valeurs: valeursParMode(extensions["com.ucm.modes"]) });
      continue;
    }

    const declaration = declarations[axe];
    const plusProcheSurcharge = (extension) => {
      for (let courante = extension; courante !== "base"; courante = declaration.extensions[courante].parent) {
        if (surcharges[courante]) return courante;
      }
      return "base";
    };

    variables.set(intermediaire("base", chemin), { axe, valeurs: valeursParMode(extensions["com.ucm.modes"]) });
    for (const [extension, { parent }] of Object.entries(declaration.extensions)) {
      const propres = surcharges[extension];
      if (!propres) continue;
      const repli = `var(${intermediaire(plusProcheSurcharge(parent), chemin)})`;
      variables.set(intermediaire(extension, chemin), {
        axe,
        valeurs: new Map(declaration.modes.map((mode) => [
          mode,
          Object.hasOwn(propres, mode) ? expression(propres[mode]) : repli,
        ])),
      });
    }
    variables.set(nom, {
      axe: nomDeLAxeDExtension(axe),
      valeurs: new Map(["base", ...Object.keys(declaration.extensions)].map((extension) => [
        extension,
        `var(${intermediaire(plusProcheSurcharge(extension), chemin)})`,
      ])),
    });
  }
  return variables;
}

const citees = (texte) => [...texte.matchAll(/var\((--[^)]+)\)/g)].map((trouve) => trouve[1]);

/** Pour chaque axe, les variables qui dépendent d'une de ses variables, dans l'ordre de déclaration. */
function conesDesAxes(variables, axes) {
  const citants = new Map();
  for (const [nom, variable] of variables) {
    const textes = variable.axe === null ? [variable.valeur] : [...variable.valeurs.values()];
    for (const cite of textes.flatMap(citees)) {
      if (!citants.has(cite)) citants.set(cite, new Set());
      citants.get(cite).add(nom);
    }
  }
  const ordre = [...variables.keys()];
  return new Map(axes.map((axe) => {
    const atteintes = new Set();
    const pile = ordre.filter((nom) => variables.get(nom).axe === axe.nom);
    while (pile.length > 0) {
      for (const citant of citants.get(pile.pop()) ?? []) {
        if (atteintes.has(citant)) continue;
        atteintes.add(citant);
        pile.push(citant);
      }
    }
    return [axe.nom, ordre.filter((nom) => atteintes.has(nom))];
  }));
}

function regle(selecteur, declarations) {
  if (declarations.length === 0) return "";
  return `${selecteur} {\n${declarations.map(([nom, valeur]) => `  ${nom}: ${valeur};`).join("\n")}\n}\n`;
}

function bloc(racine, cible, declarations) {
  if (declarations.length === 0) return "";
  const lignes = declarations.map(([nom, valeur]) => `    ${nom}: ${valeur};`).join("\n");
  return `@scope (${racine}) {\n  :where(:scope, :scope *)${cible} {\n${lignes}\n  }\n}\n`;
}

/**
 * La feuille d'un document dont chaque feuille à modes nomme son axe.
 * `attributs` remplace l'attribut par défaut d'un axe.
 */
export function emettre(document, attributs = {}) {
  const variables = variablesDuDocument(document);
  const axes = contextesDesAxes(document).map((axe) => ({
    ...axe,
    attribut: attributs[axe.nom] ?? attributDeMode(axe.nom),
  }));
  const axeParNom = new Map(axes.map((axe) => [axe.nom, axe]));
  const cones = conesDesAxes(variables, axes);

  const parDefaut = (variable) => (
    variable.axe === null ? variable.valeur : variable.valeurs.get(axeParNom.get(variable.axe).defaut)
  );
  const selecteurDe = (axe, contexte) => `[${axe.attribut}="${contexte}"]`;
  const tousLesContextes = (axe) => `:is(${axe.contextes.map((contexte) => selecteurDe(axe, contexte)).join(", ")})`;

  let css = regle(":root", [...variables].map(([nom, variable]) => [nom, parDefaut(variable)]));

  for (const axe of axes) {
    const possedees = [...variables].filter(([, variable]) => variable.axe === axe.nom);
    const tous = tousLesContextes(axe);

    if (axe.extension) {
      css += regle(tous, possedees.map(([nom, variable]) => [nom, variable.valeurs.get("base")]));
      for (const contexte of axe.contextes.slice(1)) {
        css += regle(selecteurDe(axe, contexte), possedees
          .filter(([, variable]) => variable.valeurs.get(contexte) !== variable.valeurs.get("base"))
          .map(([nom, variable]) => [nom, variable.valeurs.get(contexte)]));
      }
    } else {
      for (const contexte of axe.contextes) {
        css += regle(selecteurDe(axe, contexte), possedees.map(([nom, variable]) => [nom, variable.valeurs.get(contexte)]));
      }
    }

    const reste = cones.get(axe.nom).filter((nom) => variables.get(nom).axe !== axe.nom);
    css += regle(tous, reste.map((nom) => [nom, parDefaut(variables.get(nom))]));

    for (const autre of axes) {
      if (autre === axe) continue;
      const croisees = reste.filter((nom) => variables.get(nom).axe === autre.nom);
      if (croisees.length === 0) continue;
      const valeurDans = (contexte) => croisees.map((nom) => [nom, variables.get(nom).valeurs.get(contexte)]);
      if (autre.extension) {
        css += bloc(tousLesContextes(autre), tous, valeurDans("base"));
        for (const contexte of autre.contextes.slice(1)) {
          css += bloc(selecteurDe(autre, contexte), tous, croisees
            .filter((nom) => variables.get(nom).valeurs.get(contexte) !== variables.get(nom).valeurs.get("base"))
            .map((nom) => [nom, variables.get(nom).valeurs.get(contexte)]));
        }
      } else {
        for (const contexte of autre.contextes) css += bloc(selecteurDe(autre, contexte), tous, valeurDans(contexte));
      }
    }
  }

  return { css, axes };
}

/** Règles de style, déclarations et octets d'une feuille émise. */
export function statistiques(css) {
  return {
    regles: css.split("\n").filter((ligne) => ligne.endsWith(" {") && !ligne.startsWith("@scope")).length,
    declarations: css.split("\n").filter((ligne) => /^\s*--[^:]+:/.test(ligne)).length,
    octets: Buffer.byteLength(css, "utf8"),
  };
}
