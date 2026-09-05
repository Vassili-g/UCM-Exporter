/**
 * Mesure la parité entre un contrat UCM et une implémentation TypeScript.
 *
 * Le vérificateur de types résout les membres hérités et les alias d'import.
 * L'adaptateur ne compare que ce que le contrat gouverne : les props qu'il
 * déclare, les BOOLEAN réellement lues et les dépendances composées rendues.
 */
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { codeIdentifier } from "@ucm-kit/core/format";
import ts from "typescript";

/** Nom de l'interface qui porte l'API publique du composant. */
export function nomInterfaceAttendue(fichierComposant) {
  return `${basename(fichierComposant, extname(fichierComposant))}Props`;
}

/** Nom textuel d'une clé de binding, quand elle est statiquement connaissable. */
function nomDeBinding(noeud) {
  return ts.isIdentifier(noeud) || ts.isStringLiteral(noeud) || ts.isNumericLiteral(noeud)
    ? noeud.text
    : null;
}

/** Fonction portée par une expression, à travers les emballages usuels. */
function fonctionEmballee(noeud) {
  if (!noeud) return null;
  if (ts.isArrowFunction(noeud) || ts.isFunctionExpression(noeud)) return noeud;
  if (!ts.isCallExpression(noeud)) return null;
  for (const argument of noeud.arguments) {
    const fonction = fonctionEmballee(argument);
    if (fonction) return fonction;
  }
  return null;
}

/** Recherche la fonction qui porte le même nom que le fichier, ou l'export par défaut. */
function trouverFonctionComposant(source, nomComposant) {
  let nommee = null;
  let parDefaut = null;

  ts.forEachChild(source, (noeud) => {
    if (ts.isFunctionDeclaration(noeud) && noeud.name?.text === nomComposant) {
      nommee = noeud;
      return;
    }
    if (ts.isExportAssignment(noeud) && !noeud.isExportEquals) {
      parDefaut = fonctionEmballee(noeud.expression);
      return;
    }
    if (!ts.isVariableStatement(noeud)) return;
    for (const declaration of noeud.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === nomComposant) {
        nommee = fonctionEmballee(declaration.initializer) ?? nommee;
      }
    }
  });

  return nommee ?? parDefaut;
}

/** Vrai si un symbole local est réellement lu dans le corps du composant. */
function symboleLuDans(noeud, symbole, verificateur) {
  let lu = false;
  const visiter = (enfant) => {
    if (lu) return;
    if (ts.isIdentifier(enfant)) {
      const symboleValeur = ts.isShorthandPropertyAssignment(enfant.parent)
        ? verificateur.getShorthandAssignmentValueSymbol(enfant.parent)
        : verificateur.getSymbolAtLocation(enfant);
      if (symboleValeur === symbole) {
        lu = true;
        return;
      }
    }
    ts.forEachChild(enfant, visiter);
  };
  visiter(noeud);
  return lu;
}

/** Relève les props effectivement consommées par la fonction du composant. */
function propsConsommees(fonction, nomsProps, verificateur) {
  const consommees = new Set();
  const parametre = fonction?.parameters[0];
  if (!parametre || !fonction.body) return consommees;

  if (ts.isObjectBindingPattern(parametre.name)) {
    for (const element of parametre.name.elements) {
      if (element.dotDotDotToken || !ts.isIdentifier(element.name)) continue;
      const nom = nomDeBinding(element.propertyName ?? element.name);
      const symbole = verificateur.getSymbolAtLocation(element.name);
      if (nom && symbole && symboleLuDans(fonction.body, symbole, verificateur)) {
        consommees.add(nom);
      }
    }
    return consommees;
  }

  if (!ts.isIdentifier(parametre.name)) return consommees;
  const symboleParametre = verificateur.getSymbolAtLocation(parametre.name);
  if (!symboleParametre) return consommees;

  const estLeParametre = (expression) => (
    ts.isIdentifier(expression)
    && verificateur.getSymbolAtLocation(expression) === symboleParametre
  );
  const visiter = (noeud) => {
    if (ts.isPropertyAccessExpression(noeud) && estLeParametre(noeud.expression)) {
      consommees.add(noeud.name.text);
    } else if (
      ts.isElementAccessExpression(noeud)
      && estLeParametre(noeud.expression)
      && noeud.argumentExpression
      && ts.isStringLiteral(noeud.argumentExpression)
    ) {
      consommees.add(noeud.argumentExpression.text);
    } else if (
      (ts.isJsxSpreadAttribute(noeud) || ts.isSpreadAssignment(noeud))
      && estLeParametre(noeud.expression)
    ) {
      for (const nom of nomsProps) consommees.add(nom);
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fonction.body);
  return consommees;
}

/** Additionne des occurrences rendues ensemble. */
function additionnerRendus(...releves) {
  const somme = new Map();
  for (const releve of releves) {
    for (const [nom, occurrences] of releve) {
      somme.set(nom, (somme.get(nom) ?? 0) + occurrences);
    }
  }
  return somme;
}

/** Garde, composant par composant, la cardinalité maximale de vues alternatives. */
function maximumRendus(...releves) {
  const maximum = new Map();
  for (const releve of releves) {
    for (const [nom, occurrences] of releve) {
      maximum.set(nom, Math.max(maximum.get(nom) ?? 0, occurrences));
    }
  }
  return maximum;
}

/** Fonction portée par le symbole d'une balise locale. */
function fonctionLocale(symbole) {
  for (const declaration of symbole?.declarations ?? []) {
    if (ts.isFunctionDeclaration(declaration)) return declaration;
    if (ts.isVariableDeclaration(declaration)) {
      const fonction = fonctionEmballee(declaration.initializer);
      if (fonction) return fonction;
    }
  }
  return null;
}

/**
 * Relève les composants rendus par une fonction et ses vues locales.
 *
 * Les frères s'additionnent. Les branches alternatives gardent leur maximum,
 * comme le `composes` global du contrat. Une vue locale est dépliée jusqu'aux
 * composants importés et n'est jamais prise pour une dépendance contractuelle.
 */
function composantsRendus(fonction, verificateur) {
  const enCours = new Set();

  const releverFonction = (fonctionLue) => {
    if (!fonctionLue?.body || enCours.has(fonctionLue)) return new Map();
    enCours.add(fonctionLue);
    const rendus = releverNoeud(fonctionLue.body);
    enCours.delete(fonctionLue);
    return rendus;
  };

  const releverBalise = (balise) => {
    if (!ts.isIdentifier(balise) || !/^[A-Z]/.test(balise.text)) return new Map();
    const symbole = verificateur.getSymbolAtLocation(balise);
    const locale = symbole && !(symbole.flags & ts.SymbolFlags.Alias)
      ? fonctionLocale(symbole)
      : null;
    if (locale) return releverFonction(locale);

    let nom = balise.text;
    if (symbole && symbole.flags & ts.SymbolFlags.Alias) {
      const nomOriginal = verificateur.getAliasedSymbol(symbole).getName();
      if (nomOriginal !== "default") nom = nomOriginal;
    }
    return new Map([[nom, 1]]);
  };

  function releverNoeud(noeud) {
    if (ts.isConditionalExpression(noeud)) {
      return maximumRendus(releverNoeud(noeud.whenTrue), releverNoeud(noeud.whenFalse));
    }
    if (
      ts.isBinaryExpression(noeud)
      && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken]
        .includes(noeud.operatorToken.kind)
    ) {
      return releverNoeud(noeud.right);
    }
    if (ts.isJsxSelfClosingElement(noeud)) return releverBalise(noeud.tagName);
    if (ts.isJsxElement(noeud)) {
      return additionnerRendus(
        releverBalise(noeud.openingElement.tagName),
        ...noeud.children.map(releverNoeud),
      );
    }

    const enfants = [];
    // `forEachChild` s'arrête si le callback rend une valeur truthy. La forme
    // en bloc est donc nécessaire : `enfants.push(...)` rendrait sa longueur
    // et couperait le parcours au premier enfant.
    ts.forEachChild(noeud, (enfant) => {
      enfants.push(releverNoeud(enfant));
    });
    return additionnerRendus(...enfants);
  }

  return releverFonction(fonction);
}

/** Lit le `tsconfig.json` racine, précondition explicite de l'adaptateur. */
function optionsTypeScript(racine) {
  const chemin = join(racine, "tsconfig.json");
  if (!existsSync(chemin)) {
    throw new Error(`L'adaptateur TypeScript exige un tsconfig.json à la racine du repository : ${chemin}`);
  }
  const config = ts.readConfigFile(chemin, ts.sys.readFile);
  if (config.error) {
    const message = ts.flattenDiagnosticMessageText(config.error.messageText, "\n");
    throw new Error(`Le tsconfig.json du repository est illisible : ${message}`);
  }
  const analysee = ts.parseJsonConfigFileContent(config.config, ts.sys, racine);
  if (analysee.errors.length > 0) {
    const message = analysee.errors
      .map((erreur) => ts.flattenDiagnosticMessageText(erreur.messageText, "\n"))
      .join("\n");
    throw new Error(`Le tsconfig.json du repository est invalide : ${message}`);
  }
  return analysee.options;
}

/** Relève en un seul programme les API publiques des fichiers qui existent. */
export function lireApiPublique(fichiers, racine) {
  const api = new Map();
  const existants = fichiers.filter((fichier) => existsSync(fichier));
  if (existants.length === 0) return api;

  const programme = ts.createProgram(existants, optionsTypeScript(racine));
  const verificateur = programme.getTypeChecker();

  for (const fichier of existants) {
    const source = programme.getSourceFile(fichier);
    if (!source) continue;
    const attendue = nomInterfaceAttendue(fichier);
    const nomComposant = basename(fichier, extname(fichier));
    const fonction = trouverFonctionComposant(source, nomComposant);
    let props = null;

    ts.forEachChild(source, (noeud) => {
      if (!ts.isInterfaceDeclaration(noeud) || noeud.name.text !== attendue) return;
      const type = verificateur.getTypeAtLocation(noeud.name);
      const membres = verificateur.getPropertiesOfType(type);
      const consommees = propsConsommees(
        fonction,
        membres.map((membre) => membre.getName()),
        verificateur,
      );
      props = Object.fromEntries(membres.map((membre) => {
        const typeMembre = verificateur.getTypeOfSymbolAtLocation(
          membre,
          membre.valueDeclaration ?? noeud,
        );
        const significatifs = (typeMembre.isUnion() ? typeMembre.types : [typeMembre])
          .filter((item) => !(item.flags & ts.TypeFlags.Undefined));
        const estBoolean = significatifs.length > 0 && significatifs.every(
          (item) => Boolean(item.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)),
        );
        return [membre.getName(), {
          type: estBoolean ? "boolean" : "autre",
          typescript: verificateur.typeToString(typeMembre),
          utilisee: consommees.has(membre.getName()),
        }];
      }));
    });

    api.set(fichier, {
      props,
      fonctionTrouvee: Boolean(fonction),
      composants: composantsRendus(fonction, verificateur),
    });
  }

  return api;
}

/** Compare le contrat au relevé TypeScript, sans rendre le diagnostic. */
export function ecartsDeParite(contrat, releve, nomInterface, options = {}) {
  const vide = {
    implementationAbsente: false,
    implementationNonLue: null,
    interfaceAbsente: null,
    fonctionAbsente: null,
    manquantes: [],
    typesIncorrects: [],
    booleensNonUtilises: [],
    compositionsIncorrectes: [],
  };
  if (!releve) {
    return options.presente
      ? { ...vide, implementationNonLue: options.chemin ?? nomInterface }
      : { ...vide, implementationAbsente: true };
  }

  const { props, composants = new Map(), fonctionTrouvee = true } = releve;
  if (props === null) return { ...vide, interfaceAbsente: nomInterface };
  if (!fonctionTrouvee) return { ...vide, fonctionAbsente: contrat?.name ?? nomInterface };

  const attendues = new Map();
  for (const dependance of contrat?.composes ?? []) {
    if (typeof dependance?.component === "string") {
      attendues.set(
        dependance.component,
        (attendues.get(dependance.component) ?? 0) + 1,
      );
    }
  }
  const compositionsIncorrectes = Array.from(attendues, ([component, attendu]) => ({
    component,
    attendu,
    rendu: composants.get(codeIdentifier(component)) ?? 0,
  }))
    .filter(({ attendu, rendu }) => rendu !== attendu)
    .sort((gauche, droite) => gauche.component.localeCompare(droite.component));

  const declarees = Object.entries(contrat?.props ?? {});
  const manquantes = declarees
    .map(([nom]) => nom)
    .filter((nom) => !(nom in props))
    .sort();
  const typesIncorrects = declarees
    .filter(([nom, prop]) => nom in props && prop?.type === "boolean" && props[nom].type !== "boolean")
    .map(([nom]) => ({ prop: nom, attendu: "boolean", recu: props[nom].typescript }))
    .sort((gauche, droite) => gauche.prop.localeCompare(droite.prop));
  const booleensNonUtilises = declarees
    .filter(([nom, prop]) => (
      nom in props
      && prop?.type === "boolean"
      && props[nom].type === "boolean"
      && props[nom].utilisee !== true
    ))
    .map(([nom]) => nom)
    .sort();

  return { ...vide, manquantes, typesIncorrects, booleensNonUtilises, compositionsIncorrectes };
}

/** Surface que `@ucm-kit/core/lecteurs` attend d'un adaptateur. */
export const adaptateurTypeScript = Object.freeze({
  lireApiPublique,
  nomInterfaceAttendue,
  ecartsDeParite,
});
