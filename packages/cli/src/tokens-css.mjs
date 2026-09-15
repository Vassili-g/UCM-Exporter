/**
 * `ucm tokens css` : la feuille CSS des tokens, écrite depuis `tokens.json`.
 *
 * La base se déclare sur `:root`. Chaque axe de modes reçoit une règle par mode
 * sur ses feuilles, une règle commune sur le reste de son cône, et un
 * croisement `@scope` pour chaque feuille d'un autre axe que ce cône atteint.
 * Toutes les règles ont la spécificité `(0,1,0)` et la feuille se charge hors
 * couche : entre deux attributs imbriqués, la proximité de `@scope` départage.
 * `tests/cascade/` le vérifie dans Chromium, Firefox et WebKit.
 *
 * Codes : 0 feuille écrite, 1 fichier de tokens refusé, 2 invocation ou
 * configuration fautive. Un refus laisse la feuille précédente en place.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import {
  NOM_CONFIGURATION,
  PREFIXE_DES_INTERMEDIAIRES,
  attributDeMode,
  axeDesExtensions,
  etatDuFormatDeTokens,
  tokenCssVariable,
} from "@ucm-kit/core/format";
import {
  axesDeTokens,
  cheminDeReference,
  collecterReferences,
  contextesDesAxes,
  cyclesActifs,
  indexerTokensDtcg,
  lireConfiguration,
  sansEchantillon,
} from "@ucm-kit/core/lecteurs";

import { contratsDuDossier } from "./contrats.mjs";

export const USAGE_TOKENS = "ucm tokens css --out <fichier> [--sans-modes]";

const possede = (objet, cle) => Object.prototype.hasOwnProperty.call(objet, cle);
const fini = (valeur) => typeof valeur === "number" && Number.isFinite(valeur);

/**
 * Une chaîne CSS entre guillemets. Les guillemets et les antislashs s'échappent,
 * et les trois caractères qui ferment une chaîne CSS, saut de ligne, retour et
 * saut de page, s'écrivent par leur code.
 */
function chaineCss(texte) {
  const echappe = texte
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\a ")
    .replace(/\r/g, "\\d ")
    .replace(/\f/g, "\\c ");
  return `"${echappe}"`;
}

/** L'écriture CSS d'un littéral de ce `$type`, ou `null` quand sa forme n'est pas celle du format. */
function litteral(type, valeur, repliDeFamille) {
  switch (type) {
    case "color": {
      const espace = valeur?.colorSpace === "srgb" || valeur?.colorSpace === "display-p3";
      const composantes = Array.isArray(valeur?.components)
        && valeur.components.length === 3
        && valeur.components.every(fini);
      if (!espace || !composantes || !fini(valeur.alpha)) return null;
      return `color(${valeur.colorSpace} ${valeur.components.join(" ")} / ${valeur.alpha})`;
    }
    case "dimension":
      return fini(valeur?.value) && valeur.unit === "px" ? `${valeur.value}px` : null;
    case "duration":
      return fini(valeur?.value) && valeur.unit === "s" ? `${valeur.value}s` : null;
    case "cubicBezier": {
      const courbe = Array.isArray(valeur) && valeur.length === 4 && valeur.every(fini)
        && valeur[0] >= 0 && valeur[0] <= 1 && valeur[2] >= 0 && valeur[2] <= 1;
      return courbe ? `cubic-bezier(${valeur.join(", ")})` : null;
    }
    case "number":
      return fini(valeur) ? String(valeur) : null;
    case "fontFamily": {
      const familles = typeof valeur === "string" ? [valeur] : valeur;
      const lisibles = Array.isArray(familles) && familles.length > 0
        && familles.every((famille) => typeof famille === "string" && famille !== "");
      if (!lisibles) return null;
      return [...familles.map(chaineCss), ...(repliDeFamille ? [repliDeFamille] : [])].join(", ");
    }
    case "string":
      return typeof valeur === "string" ? chaineCss(valeur) : null;
    case "boolean":
      return typeof valeur === "boolean" ? String(valeur) : null;
    default:
      return null;
  }
}

/**
 * L'attribut HTML de chaque axe, et ce que la configuration a de fautif.
 *
 * Un axe prend `modes[axe]`, sinon `attributDeMode(axe)`. Deux axes partagent
 * un attribut quand leurs ensembles de modes sont égaux ; leurs défauts peuvent
 * différer, et `notes` le dit. Une clé de `modes` qui ne nomme aucun axe, et
 * deux ensembles de modes différents sous un même attribut, vont dans `erreurs`.
 */
export function attributsDesAxes(axes, modes = {}) {
  const erreurs = [];
  const notes = [];
  for (const cle of Object.keys(modes)) {
    if (!axes.some((axe) => axe.nom === cle)) {
      erreurs.push(`${NOM_CONFIGURATION}, modes.${cle} : aucun axe du fichier de tokens ne porte ce nom.`);
    }
  }

  const attributs = new Map();
  const parAttribut = new Map();
  for (const axe of axes) {
    const attribut = possede(modes, axe.nom) ? modes[axe.nom] : attributDeMode(axe.nom);
    attributs.set(axe.nom, attribut);
    parAttribut.set(attribut, [...(parAttribut.get(attribut) ?? []), axe]);
  }

  for (const [attribut, porteurs] of parAttribut) {
    if (porteurs.length < 2) continue;
    const [premier, ...autres] = porteurs;
    const noms = porteurs.map((axe) => `« ${axe.nom} »`).join(", ");
    const memesModes = autres.every((axe) => (
      axe.modes.length === premier.modes.length && axe.modes.every((mode) => premier.modes.includes(mode))
    ));
    if (!memesModes) {
      erreurs.push(`L'attribut « ${attribut} » porte les axes ${noms}, dont les modes diffèrent. `
        + `Nommez un attribut par axe dans la section modes de ${NOM_CONFIGURATION}.`);
    } else if (autres.some((axe) => axe.defaut !== premier.defaut)) {
      notes.push(`L'attribut « ${attribut} » porte les axes `
        + `${porteurs.map((axe) => `« ${axe.nom} » (défaut « ${axe.defaut} »)`).join(", ")} : `
        + "sans attribut, chaque axe garde son défaut.");
    }
  }
  return { attributs, erreurs, notes };
}

/** Les refus de deux axes au même nom : un axe déclaré porte celui de l'axe d'extension d'un autre. */
function axesHomonymes(axes) {
  const refus = [];
  const parNom = new Map();
  for (const axe of axes) {
    if (parNom.has(axe.nom)) {
      const parent = axe.parent ?? parNom.get(axe.nom).parent;
      refus.push(`Deux axes portent le nom « ${axe.nom} », dont l'axe d'extension de « ${parent} ».`);
    }
    parNom.set(axe.nom, axe);
  }
  return refus;
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

/** Règles de style, déclarations et octets d'une feuille. */
export function statistiquesDeFeuille(css) {
  const lignes = css.split("\n");
  return {
    regles: lignes.filter((ligne) => ligne.endsWith(" {") && !ligne.startsWith("@scope")).length,
    declarations: lignes.filter((ligne) => /^\s*--[^:]+:/.test(ligne)).length,
    octets: Buffer.byteLength(css, "utf8"),
  };
}

const citees = (texte) => (texte === null ? [] : [...texte.matchAll(/var\((--[^)]+)\)/g)].map((trouve) => trouve[1]));

/** Toutes les valeurs qu'une variable déclare, un contexte après l'autre. */
function textesDe(variable) {
  if (variable.valeurs) return [...variable.valeurs.values()];
  if (variable.propres) return [variable.base, ...variable.propres.values()];
  return [variable.valeur];
}

/** La valeur d'une variable dans un contexte de son axe. */
function valeurDans(variable, contexte) {
  if (variable.valeurs) return variable.valeurs.get(contexte);
  return variable.propres.get(contexte) ?? variable.base;
}

/** Le début d'une phrase de refus : la feuille, et le mode et l'extension de la valeur. */
function lieuDeLaValeur(chemin, mode, extension) {
  if (mode === undefined) return `La feuille « ${chemin} »`;
  return `La feuille « ${chemin} », en mode « ${mode} »${extension ? ` de l'extension « ${extension} »` : ""},`;
}

/**
 * Les refus du graphe d'alias d'un document déjà lu : une cible absente, un
 * mode ou une surcharge qui cite une feuille d'un autre type, un cycle actif,
 * et l'arrêt de l'analyse des cycles à sa borne.
 *
 * `axes` porte les axes à générer, tels qu'`axesDeTokens` les rend. Une feuille
 * d'un de ces axes est lue dans chaque mode et chaque surcharge, toute autre
 * feuille dans sa `$value`. `ucm guide` pose la même question que la feuille.
 */
export function refusDuGrapheDesTokens(document, axes = []) {
  const index = indexerTokensDtcg(document);
  const refus = [];
  const proprietaire = new Map();
  for (const axe of axes) for (const chemin of axe.feuilles) proprietaire.set(chemin, axe);

  const juger = (chemin, feuille, valeur, mode, extension) => {
    const cible = cheminDeReference(valeur);
    if (cible === null) return;
    const ou = lieuDeLaValeur(chemin, mode, extension);
    if (!index.has(cible)) {
      refus.push(`${ou} cite « ${cible} », absente du fichier de tokens.`);
    } else if (mode !== undefined && index.get(cible).$type !== feuille.$type) {
      refus.push(`${ou} cite « ${cible} », de type « ${index.get(cible).$type} » et non « ${feuille.$type} ».`);
    }
  };

  for (const [chemin, feuille] of index) {
    const axe = proprietaire.get(chemin);
    if (!axe) {
      juger(chemin, feuille, feuille.$value);
      continue;
    }
    const modes = feuille.$extensions["com.ucm.modes"];
    for (const mode of axe.modes) juger(chemin, feuille, modes[mode], mode);
    const surcharges = feuille.$extensions["com.ucm.extensions"] ?? {};
    for (const extension of Object.keys(axe.extensions ?? {})) {
      if (!possede(surcharges, extension)) continue;
      for (const mode of axe.modes) {
        if (possede(surcharges[extension], mode)) juger(chemin, feuille, surcharges[extension][mode], mode, extension);
      }
    }
  }

  const { cycles, interrompue } = cyclesActifs(document, axes);
  if (interrompue) {
    refus.push("L'analyse des cycles d'alias s'est arrêtée à sa borne : la commande ne peut pas "
      + "établir qu'aucun cycle n'est actif.");
  }
  for (const cycle of cycles) refus.push(`Cycle d'alias : ${cycle.join(" → ")}.`);
  return refus;
}

/**
 * La feuille d'un document de tokens déjà lu, sans en-tête ni écriture.
 *
 * `axes` porte les axes à générer, tels qu'`axesDeTokens` les rend ; vide, la
 * feuille ne déclare que la base. `attributs` associe chaque axe, axes
 * d'extension compris, à son attribut. Rend `{ css, refus, notes }` : un refus
 * empêche d'écrire, une note nomme une feuille sans valeur, déclarée `initial`
 * dans chaque contexte où elle n'en a pas.
 *
 * Une collection étendue se ramène aux axes simples. Pour chaque feuille
 * surchargée `f`, `--ucm-x-base--f` et `--ucm-x-<e>--f`, pour chaque extension
 * `e` qui la surcharge, appartiennent à l'axe parent ; `f` appartient à l'axe
 * d'extension, qui la déclare dans une règle de repli sur `base`, puis dans la
 * règle propre de chaque extension qui la surcharge elle-même ou par un ancêtre.
 */
export function feuilleDesTokens(document, { axes = [], attributs = new Map(), repliDeFamille } = {}) {
  const index = indexerTokensDtcg(document);
  const refus = [];
  const notes = [];
  const axesGeneres = contextesDesAxes(document, axes);
  refus.push(...axesHomonymes(axesGeneres));
  const axeParNom = new Map(axesGeneres.map((axe) => [axe.nom, axe]));

  // Le nom d'une extension entre dans ceux des intermédiaires : deux extensions
  // qui s'y rejoignent déclareraient la même propriété, et la dernière gagnerait.
  for (const axe of axes) {
    const parProjection = new Map();
    for (const extension of Object.keys(axe.extensions ?? {})) {
      const projection = tokenCssVariable(extension).slice(2);
      if (projection === "" || projection === "base") {
        refus.push(projection === ""
          ? `L'extension « ${extension} » de l'axe « ${axe.nom} » ne donne aucun nom CSS.`
          : `L'extension « ${extension} » de l'axe « ${axe.nom} » donne le nom CSS « base », réservé à la collection elle-même.`);
      } else if (parProjection.has(projection)) {
        refus.push(`Les extensions « ${parProjection.get(projection)} » et « ${extension} » de l'axe « ${axe.nom} » `
          + `donnent le même nom CSS « ${projection} ».`);
      } else {
        parProjection.set(projection, extension);
      }
    }
  }

  const proprietaire = new Map();
  for (const axe of axes) for (const chemin of axe.feuilles) proprietaire.set(chemin, axe);

  const parNom = new Map();
  for (const chemin of index.keys()) {
    const nom = tokenCssVariable(chemin);
    if (nom.startsWith(PREFIXE_DES_INTERMEDIAIRES)) {
      refus.push(`La feuille « ${chemin} » donne la propriété « ${nom} », dont le préfixe ${PREFIXE_DES_INTERMEDIAIRES} est réservé aux collections étendues.`);
    }
    if (parNom.has(nom)) {
      refus.push(`Les feuilles « ${parNom.get(nom)} » et « ${chemin} » donnent la même propriété CSS « ${nom} ».`);
    } else {
      parNom.set(nom, chemin);
    }
  }

  /** Le texte CSS d'une valeur, ou `null` quand elle ne se déclare pas. */
  const texteDe = (chemin, feuille, valeur, mode, extension) => {
    const ou = lieuDeLaValeur(chemin, mode, extension);
    // Sans déclaration, la propriété hériterait de la valeur d'un contexte
    // englobant. `initial` la rend absente, et le repli d'un `var()` s'applique.
    if (valeur === null || valeur === undefined) {
      notes.push(`${ou} n'a pas de valeur : elle se déclare initial, qu'un var() lit comme une valeur absente.`);
      return "initial";
    }
    // Une cible absente ou d'un autre type se refuse dans `refusDuGrapheDesTokens`.
    const cible = cheminDeReference(valeur);
    if (cible !== null) return `var(${tokenCssVariable(cible)})`;
    const texte = litteral(feuille.$type, valeur, repliDeFamille);
    if (texte === null) refus.push(`${ou} porte une valeur que le type « ${feuille.$type} » ne décrit pas.`);
    return texte;
  };

  const variables = [];
  for (const [chemin, feuille] of index) {
    const axe = proprietaire.get(chemin);
    const nom = tokenCssVariable(chemin);
    if (!axe) {
      variables.push({ nom, axe: null, valeur: texteDe(chemin, feuille, feuille.$value) });
      continue;
    }
    const modes = feuille.$extensions["com.ucm.modes"];
    const parMode = (valeurDuMode, extension) => new Map(axe.modes.map((mode) => (
      [mode, valeurDuMode(mode, extension)]
    )));
    const surcharges = feuille.$extensions["com.ucm.extensions"] ?? {};
    const extensions = Object.keys(axe.extensions ?? {});
    if (extensions.length === 0 || Object.keys(surcharges).length === 0) {
      variables.push({ nom, axe: axe.nom, valeurs: parMode((mode) => texteDe(chemin, feuille, modes[mode], mode)) });
      continue;
    }

    const suffixe = nom.slice(2);
    const intermediaire = (extension) => `${PREFIXE_DES_INTERMEDIAIRES}${tokenCssVariable(extension).slice(2)}--${suffixe}`;
    const plusProche = (extension) => {
      for (let courante = extension; courante !== undefined && courante !== "base"; courante = axe.extensions[courante]?.parent) {
        if (possede(surcharges, courante)) return courante;
      }
      return "base";
    };

    variables.push({
      nom: intermediaire("base"),
      axe: axe.nom,
      valeurs: parMode((mode) => texteDe(chemin, feuille, modes[mode], mode)),
    });
    for (const extension of extensions) {
      if (!possede(surcharges, extension)) continue;
      const repli = `var(${intermediaire(plusProche(axe.extensions[extension].parent))})`;
      variables.push({
        nom: intermediaire(extension),
        axe: axe.nom,
        valeurs: parMode((mode) => (
          possede(surcharges[extension], mode)
            ? texteDe(chemin, feuille, surcharges[extension][mode], mode, extension)
            : repli
        ), extension),
      });
    }
    const propres = new Map();
    for (const extension of extensions) {
      const proche = plusProche(extension);
      if (proche !== "base") propres.set(extension, `var(${intermediaire(proche)})`);
    }
    variables.push({ nom, axe: axeDesExtensions(axe.nom), base: `var(${intermediaire("base")})`, propres });
  }

  refus.push(...refusDuGrapheDesTokens(document, axes));

  if (refus.length > 0) return { css: "", refus, notes };

  // Les cônes se calculent sur les variables CSS, intermédiaires compris : une
  // surcharge qui cite une autre feuille surchargée rattache son intermédiaire
  // au cône de l'axe d'extension.
  const citants = new Map();
  for (const variable of variables) {
    for (const cite of textesDe(variable).flatMap(citees)) {
      if (!citants.has(cite)) citants.set(cite, []);
      citants.get(cite).push(variable.nom);
    }
  }
  const coneDe = (axe) => {
    const atteintes = new Set();
    const pile = variables.filter((variable) => variable.axe === axe.nom).map((variable) => variable.nom);
    while (pile.length > 0) {
      for (const citant of citants.get(pile.pop()) ?? []) {
        if (atteintes.has(citant)) continue;
        atteintes.add(citant);
        pile.push(citant);
      }
    }
    return atteintes;
  };

  const declarer = (entrees) => entrees.filter(([, valeur]) => valeur !== null);
  const parDefaut = (variable) => (variable.axe === null ? variable.valeur : valeurDans(variable, axeParNom.get(variable.axe).defaut));
  // Un nom de mode normalisé garde les guillemets et les antislashs de Figma.
  const selecteurDe = (axe, mode) => `[${attributs.get(axe.nom)}=${chaineCss(mode)}]`;
  const tousLesContextes = (axe) => `:is(${axe.modes.map((mode) => selecteurDe(axe, mode)).join(", ")})`;

  let css = regle(":root", declarer(variables.map((variable) => [variable.nom, parDefaut(variable)])));

  for (const axe of axesGeneres) {
    const possedees = variables.filter((variable) => variable.axe === axe.nom);
    const tous = tousLesContextes(axe);
    if (axe.parent !== undefined) {
      css += regle(tous, declarer(possedees.map((variable) => [variable.nom, variable.base])));
      for (const extension of axe.modes.slice(1)) {
        css += regle(selecteurDe(axe, extension), possedees
          .filter((variable) => variable.propres.has(extension))
          .map((variable) => [variable.nom, variable.propres.get(extension)]));
      }
    } else {
      for (const mode of axe.modes) {
        css += regle(selecteurDe(axe, mode), declarer(possedees.map((variable) => [variable.nom, variable.valeurs.get(mode)])));
      }
    }

    const cone = coneDe(axe);
    const reste = variables.filter((variable) => variable.axe !== axe.nom && cone.has(variable.nom));
    css += regle(tous, declarer(reste.map((variable) => [variable.nom, parDefaut(variable)])));

    for (const autre of axesGeneres) {
      if (autre === axe) continue;
      const croisees = reste.filter((variable) => variable.axe === autre.nom);
      if (croisees.length === 0) continue;
      if (autre.parent !== undefined) {
        css += bloc(tousLesContextes(autre), tous, declarer(croisees.map((variable) => [variable.nom, variable.base])));
        for (const extension of autre.modes.slice(1)) {
          css += bloc(selecteurDe(autre, extension), tous, croisees
            .filter((variable) => variable.propres.has(extension))
            .map((variable) => [variable.nom, variable.propres.get(extension)]));
        }
      } else {
        for (const mode of autre.modes) {
          css += bloc(selecteurDe(autre, mode), tous, declarer(croisees.map((variable) => [variable.nom, variable.valeurs.get(mode)])));
        }
      }
    }
  }

  return { css, refus, notes };
}

/** Lit les arguments de `ucm tokens`, sans lever. */
export function lireArgumentsTokens(arguments_) {
  const [sousCommande, ...reste] = arguments_;
  if (sousCommande !== "css") {
    return {
      erreur: sousCommande === undefined
        ? "ucm tokens attend une sous-commande : css."
        : `Sous-commande inconnue : ${sousCommande}`,
    };
  }

  const options = { out: null, sansModes: false };
  for (let i = 0; i < reste.length; i += 1) {
    const argument = reste[i];
    if (argument === "--sans-modes") {
      options.sansModes = true;
      continue;
    }
    if (argument === "--out") {
      const valeur = reste[i + 1];
      if (valeur === undefined || valeur.startsWith("--")) return { erreur: "--out attend un chemin de fichier." };
      options.out = valeur;
      i += 1;
      continue;
    }
    return { erreur: `Argument inconnu : ${argument}` };
  }
  if (options.out === null) return { erreur: "--out est obligatoire : il nomme la feuille à écrire." };
  return { options };
}

/** Les contrats du repository qui citent au moins une référence de token. */
function contratsQuiCitentDesTokens(racine, dossierComponents) {
  const cites = [];
  for (const chemin of contratsDuDossier(join(racine, dossierComponents))) {
    try {
      const contrat = JSON.parse(readFileSync(chemin, "utf8").replace(/^\uFEFF/, ""));
      if (collecterReferences(sansEchantillon(contrat)).size > 0) cites.push(relative(racine, chemin).split("\\").join("/"));
    } catch {
      // Un contrat illisible relève d'`ucm check`.
    }
  }
  return cites;
}

/**
 * Vrai quand deux chemins désignent le même fichier existant. La comparaison
 * porte sur l'identité du fichier : sous Windows et macOS, `TOKENS.JSON` et
 * `tokens.json` sont deux chaînes pour un seul fichier.
 */
export function memeFichier(chemin, autre) {
  if (chemin === autre) return true;
  try {
    const premier = statSync(chemin, { bigint: true });
    const second = statSync(autre, { bigint: true });
    return premier.ino === second.ino && premier.dev === second.dev;
  } catch {
    return false;
  }
}

/**
 * Écrit un fichier terminé à sa place, par remplacement : une écriture interrompue ne laisse pas de demi-feuille.
 * Rend l'erreur du système quand l'écriture échoue, le fichier provisoire retiré.
 */
function remplacer(cible, contenu, ecrireFichier) {
  const provisoire = `${cible}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(cible), { recursive: true });
    ecrireFichier(provisoire, contenu, "utf8");
    renameSync(provisoire, cible);
    return null;
  } catch (erreur) {
    rmSync(provisoire, { force: true });
    return erreur;
  }
}

/**
 * La commande `ucm tokens css`, et son code de sortie.
 *
 * Les sorties sont injectables : `ecrire` reçoit le compte rendu, `alerter`
 * les refus et les feuilles sans valeur.
 */
export function tokensCss(arguments_, {
  racine = process.cwd(),
  ecrire = console.log,
  alerter = console.error,
  ecrireFichier = writeFileSync,
} = {}) {
  const { options, erreur } = lireArgumentsTokens(arguments_);
  if (erreur) {
    alerter(`${erreur}\n\n${USAGE_TOKENS}`);
    return 2;
  }

  const { configuration, erreur: erreurConfiguration } = lireConfiguration(racine);
  if (erreurConfiguration) {
    alerter(erreurConfiguration);
    return 2;
  }

  const cible = resolve(racine, options.out);
  const source = resolve(racine, configuration.tokens);
  const lus = [source, resolve(racine, NOM_CONFIGURATION)];
  if (lus.some((lu) => memeFichier(cible, lu)) || cible.toLowerCase().endsWith(".contract.json")) {
    alerter(`--out désigne ${options.out}, que la commande lit : choisissez un fichier .css à part.`);
    return 2;
  }
  if (existsSync(cible) && statSync(cible).isDirectory()) {
    alerter(`--out désigne le dossier ${options.out} : nommez le fichier .css à écrire.`);
    return 2;
  }
  const echecDEcriture = (erreur) => {
    alerter(`${options.out} n'a pas pu être écrit (${erreur.code ?? erreur.message}) : la feuille précédente reste en place.`);
    return 2;
  };

  const enTete = `/* Généré par ucm tokens css depuis ${configuration.tokens}. Relancer la commande plutôt que modifier ce fichier. */\n`;

  if (!existsSync(source)) {
    const cites = contratsQuiCitentDesTokens(racine, configuration.components);
    if (cites.length > 0) {
      alerter(`${configuration.tokens} est introuvable, et ${cites.length === 1 ? "un contrat cite" : `${cites.length} contrats citent`} `
        + `des tokens : ${cites.join(", ")}. Exportez les tokens depuis Figma, ou corrigez le chemin tokens de ${NOM_CONFIGURATION}.`);
      return 1;
    }
    const echec = remplacer(cible, `${enTete}/* Aucun fichier de tokens, et aucun contrat ne cite de token : cette feuille ne déclare rien. */\n`, ecrireFichier);
    if (echec) return echecDEcriture(echec);
    ecrire(`${options.out} : aucun fichier de tokens, feuille vide écrite.`);
    return 0;
  }

  let document;
  try {
    document = JSON.parse(readFileSync(source, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    alerter(`${configuration.tokens} est illisible : ce n'est pas du JSON valide. Exportez de nouveau les tokens depuis Figma.`);
    return 1;
  }

  const format = etatDuFormatDeTokens(document);
  if (format.etat === "future") {
    alerter(`${configuration.tokens} est dans la version ${format.version} du format de tokens, que cette commande ne lit pas. `
      + "Un développeur doit mettre à jour @ucm-kit/cli.");
    return 1;
  }
  if (format.etat === "invalide") {
    alerter(`${configuration.tokens} porte une marque de version illisible. Exportez de nouveau les tokens depuis Figma.`);
    return 1;
  }

  const { etat, axes, constats } = axesDeTokens(document);
  if (etat === "incoherent") {
    alerter([`${configuration.tokens} déclare des modes incohérents :`, ...constats.map(({ message }) => `  ${message}`)].join("\n"));
    return 1;
  }
  if ((etat === "anterieur" || etat === "axe-ecarte") && !options.sansModes) {
    const cause = etat === "anterieur"
      ? `${configuration.tokens} porte des modes sans déclarer ses axes : réexportez les tokens depuis Figma.`
      : [`${configuration.tokens} porte des modes que l'export n'a rattachés à aucun axe ; son compte rendu dit pourquoi :`,
        ...constats.map(({ message }) => `  ${message}`)].join("\n");
    alerter(`${cause}\nRelancez avec --sans-modes pour écrire la base seule.`);
    return 1;
  }

  const genereModes = etat === "complet" && !options.sansModes;
  const axesGeneres = genereModes ? axes : [];
  const homonymes = axesHomonymes(contextesDesAxes(document, axesGeneres));
  if (homonymes.length > 0) {
    alerter([`${configuration.tokens} ne donne pas de feuille CSS, et ${options.out} reste inchangé :`, ...homonymes.map((ligne) => `  ${ligne}`)].join("\n"));
    return 1;
  }
  // Une clé de `modes` se juge contre les axes déclarés. Un export antérieur n'en
  // déclare aucun, et un axe écarté n'y figure plus : la clé n'y prouve rien.
  const clesJugees = etat === "sans-modes" || etat === "complet";
  const { erreurs: clesInconnues } = attributsDesAxes(
    contextesDesAxes(document, axes),
    clesJugees ? configuration.modes : {},
  );
  const { attributs, erreurs, notes: notesDAttributs } = attributsDesAxes(
    contextesDesAxes(document, axesGeneres),
    genereModes ? configuration.modes : {},
  );
  const fautes = [...new Set([...(clesJugees ? clesInconnues : []), ...erreurs])];
  if (fautes.length > 0) {
    alerter(fautes.join("\n"));
    return 2;
  }

  const { css, refus, notes } = feuilleDesTokens(document, {
    axes: axesGeneres,
    attributs,
    repliDeFamille: configuration.css?.fontFamilyFallback,
  });
  for (const note of notes) alerter(note);
  if (refus.length > 0) {
    alerter([`${configuration.tokens} ne donne pas de feuille CSS, et ${options.out} reste inchangé :`, ...refus.map((ligne) => `  ${ligne}`)].join("\n"));
    return 1;
  }

  const contenu = `${enTete}${css}`;
  const echec = remplacer(cible, contenu, ecrireFichier);
  if (echec) return echecDEcriture(echec);
  const { regles, declarations, octets } = statistiquesDeFeuille(contenu);
  ecrire(`${options.out} : ${regles} règles, ${declarations} déclarations, ${octets} octets.`);
  for (const note of notesDAttributs) ecrire(note);
  if (genereModes) {
    for (const axe of contextesDesAxes(document, axes)) {
      ecrire(`Axe « ${axe.nom} » : attribut ${attributs.get(axe.nom)}, défaut « ${axe.defaut} ».`);
    }
  } else if (etat !== "sans-modes") {
    ecrire(`--sans-modes : la feuille ne déclare que la valeur par défaut de chaque token.`);
  }
  return 0;
}
