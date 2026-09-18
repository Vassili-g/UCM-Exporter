/**
 * `ucm guide <contrat>` : ce qu'un agent lit avant d'implémenter un contrat, en
 * une seule commande.
 *
 * La sortie est un Markdown, dans cet ordre : ce qui est à relire avant de
 * commencer, la procédure, le texte de tête des conventions, les limites de
 * l'export et l'API des dépendances, les aides que ses caractéristiques
 * emploient, les ancrages que les conventions ne tranchent pas, les modes, les
 * icônes, puis la taille de chaque partie.
 *
 * Codes : 0 guide rendu, 1 graphe de composition ou fichier de tokens
 * incohérent, 2 invocation, configuration ou contrat illisible.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { NOM_CONFIGURATION, etatDuFormatDeTokens } from "@ucm-kit/core/format";
import {
  CARACTERISTIQUES,
  axesDeTokens,
  axesDuContrat,
  caracteristiquesDuContrat,
  champsInvalidesDuContrat,
  conesDesAxes,
  contextesDeVerification,
  contextesDesAxes,
  lireConfiguration,
  messagesDExport,
  validerGrapheDesContrats,
  verdictDeVersion,
  vueExacteDuVariant,
} from "@ucm-kit/core/lecteurs";

import { avertissements, catalogueDesAides } from "./aides.mjs";
import { contratsDuDossier } from "./contrats.mjs";
import { conventionsLesPlusProches, lireConventions } from "./conventions.mjs";
import { attributsDesAxes, memeFichier, refusDuGrapheDesTokens } from "./tokens-css.mjs";

export const USAGE_GUIDE = "ucm guide <contrat> [--out <fichier>]";

const PROCEDURE = new URL("../procedure.md", import.meta.url);

/** Les fichiers où un repository épingle `@ucm-kit/cli`, `package.json` à part. */
const FICHIERS_EPINGLES = [
  ".agents/skills/ucm-implementer/SKILL.md",
  ".claude/skills/ucm-implementer/SKILL.md",
  ".github/workflows/ucm.yml",
  ".gitlab/ucm.gitlab-ci.yml",
];

const estObjet = (valeur) => Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
const enSlash = (chemin) => chemin.split("\\").join("/");
const lireJson = (chemin) => JSON.parse(readFileSync(chemin, "utf8").replace(/^\uFEFF/, ""));

/** Lit les arguments de `ucm guide`, sans lever. */
export function lireArgumentsGuide(arguments_) {
  const options = { contrat: null, out: null };
  for (let i = 0; i < arguments_.length; i += 1) {
    const argument = arguments_[i];
    if (argument === "--out") {
      const valeur = arguments_[i + 1];
      if (valeur === undefined || valeur.startsWith("--")) return { erreur: "--out attend un chemin de fichier." };
      options.out = valeur;
      i += 1;
      continue;
    }
    if (argument.startsWith("--") || options.contrat !== null) return { erreur: `Argument inconnu : ${argument}` };
    options.contrat = argument;
  }
  if (options.contrat === null) return { erreur: "ucm guide attend le chemin d'un contrat." };
  return { options };
}

/** Une ligne par entrée : la clé, puis sa valeur en JSON compact. */
function lignesJson(valeur) {
  if (!estObjet(valeur)) return [JSON.stringify(valeur)];
  return Object.entries(valeur).map(([cle, entree]) => `${JSON.stringify(cle)}: ${JSON.stringify(entree)}`);
}

function blocJson(titre, valeur) {
  if (valeur === undefined) return [];
  return [`### ${titre}`, "", "```json", ...lignesJson(valeur), "```", ""];
}

/** Les entrées d'un dictionnaire dont la clé est citée, dans l'ordre du contrat. */
function entreesCitees(dictionnaire, cles) {
  if (!estObjet(dictionnaire)) return undefined;
  const choisies = Object.entries(dictionnaire).filter(([cle]) => cles.has(cle));
  return choisies.length === 0 ? undefined : Object.fromEntries(choisies);
}

/** Les noms des dépendances, dans l'ordre du contrat. */
function dependancesDuContrat(contrat) {
  const noms = [];
  for (const dependance of Array.isArray(contrat.composes) ? contrat.composes : []) {
    const nom = dependance?.component;
    if (typeof nom === "string" && !noms.includes(nom)) noms.push(nom);
  }
  return noms;
}

/** Les icônes que les vues des variants placent. */
function iconesUtilisees(contrat) {
  const cles = new Set();
  for (const variant of Array.isArray(contrat.variants) ? contrat.variants : []) {
    const icones = vueExacteDuVariant(contrat, variant)?.icons;
    for (const cle of Object.keys(estObjet(icones) ? icones : {})) cles.add(cle);
  }
  return cles;
}

/**
 * Le contexte qui complète le contrat cible : limites constatées par l'export,
 * puis API et échantillons des dépendances directes.
 *
 * Le contrat cible reste sa propre source. Le recopier ici augmentait la sortie
 * sans éviter sa lecture lors des reconstructions mesurées.
 */
function extraction(contrat, contratsParNom) {
  const lignes = [
    "## Contexte du contrat",
    "",
    `Version ${contrat.meta?.contractVersion}, couverture portable ${contrat.meta?.coverage?.portable ?? "non déclarée"}.`,
    "",
  ];
  const diagnostics = messagesDExport(contrat);
  if (diagnostics.length > 0) {
    lignes.push("Ce que l'export n'a pas su décrire, à rapporter au développeur :", "", ...diagnostics.map((message) => `- ${message}`), "");
  }

  for (const nom of dependancesDuContrat(contrat)) {
    const dependance = contratsParNom.get(nom);
    lignes.push(`### Dépendance ${nom}`, "");
    if (!estObjet(dependance)) {
      lignes.push("Contrat introuvable ou ambigu dans ce repository.", "");
      continue;
    }
    lignes.push("```json", ...lignesJson({ props: dependance.props, samples: dependance.samples }), "```", "");
  }

  lignes.push(
    "### Limites",
    "",
    "- Le contrat cible se lit dans son fichier. Ce guide ne le recopie pas.",
    "- Le comportement, l'accessibilité et les événements relèvent des conventions et de la relecture.",
    "- Ce guide ne prouve pas qu'un sens a été appliqué : la preuve de chaque aide le vérifie.",
    "",
  );
  return lignes.join("\n");
}

/** Le rang d'une aide : celui de sa caractéristique, `composant` en tête des aides de tout contrat. */
function rangDAide(aide) {
  const rang = CARACTERISTIQUES.findIndex(({ id }) => id === aide.quand);
  return [rang, aide.nom === "composant" ? 0 : 1, aide.nom];
}

function comparerAides(gauche, droite) {
  const [a, b] = [rangDAide(gauche), rangDAide(droite)];
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
}

/** Les aides employées, rendues ; et les ancrages que les conventions ne tranchent pas. */
function aidesDuContrat(caracteristiques, catalogue, conventions) {
  const employees = [...catalogue.values()].filter((aide) => caracteristiques.includes(aide.quand)).sort(comparerAides);
  const rendues = [];
  const nonTranches = [];
  const ecrituresParDefaut = conventions?.ecrituresParDefaut ?? true;

  for (const aide of employees) {
    const section = conventions?.sections.get(aide.nom);
    if (aide.ancrage && !(section && section.texte !== "")) {
      nonTranches.push(`- **${aide.nom}** : ${aide.sens.replace(/\s*\n\s*/g, " ")}`);
      continue;
    }
    const parties = [`### ${aide.nom}`, "", "**Sens.**", "", aide.sens, ""];
    if (aide.ancrage) parties.push("**Réponse du repository.**", "", section.texte, "");
    else if (aide.nom === "composant" && conventions?.tete) parties.push("**Écriture.** Le texte de tête des conventions, plus haut.", "");
    else if (section) parties.push("**Écriture du repository.**", "", section.texte, "");
    else if (ecrituresParDefaut) parties.push("**Écriture par défaut.**", "", aide.ecriture, "");

    const controles = [...(section?.controles ?? []), ...(aide.nom === "composant" ? conventions?.controles ?? [] : [])];
    parties.push("**Preuve.**", "", aide.preuve, "");
    if (controles.length > 0) parties.push(`Contrôles du repository : ${controles.map((commande) => `\`${commande}\``).join(", ")}.`, "");
    rendues.push(parties.join("\n"));
  }

  return {
    aides: ["## Aides", "", ...rendues].join("\n"),
    nonTranches: nonTranches.length === 0 ? "" : ["## Non tranché : demander au développeur", "", ...nonTranches, ""].join("\n"),
  };
}

/** Le numéro de `@ucm-kit/cli` qu'un fichier épingle, ou `null`. */
function pinDans(texte) {
  return /@ucm-kit\/cli@(\d+\.\d+\.\d+[^\s`"']*)/.exec(texte)?.[1] ?? null;
}

/**
 * Les pins de `@ucm-kit/cli` du repository, comparés entre eux : les deux
 * relais, le workflow et `package.json`. Rend une ligne par fichier quand deux
 * numéros diffèrent, sinon rien.
 */
export function pinsEnDesaccord(racine) {
  const trouves = [];
  for (const chemin of FICHIERS_EPINGLES) {
    const complet = join(racine, chemin);
    if (!existsSync(complet)) continue;
    const version = pinDans(readFileSync(complet, "utf8"));
    if (version !== null) trouves.push({ chemin, version });
  }
  try {
    const manifeste = lireJson(join(racine, "package.json"));
    const version = manifeste.devDependencies?.["@ucm-kit/cli"] ?? manifeste.dependencies?.["@ucm-kit/cli"];
    // Une archive, un lien ou un espace de travail ne portent pas de numéro à comparer.
    if (typeof version === "string" && !/^[a-z][a-z+]*:/i.test(version)) trouves.push({ chemin: "package.json", version });
  } catch {
    // Un repository sans package.json lisible n'épingle rien là.
  }
  if (new Set(trouves.map(({ version }) => version)).size < 2) return [];
  return [
    "⚠ Les pins de @ucm-kit/cli diffèrent : alignez-les sur une seule version.",
    ...trouves.map(({ chemin, version }) => `  ${chemin} : ${version}`),
  ];
}

/**
 * Les modes qui touchent le contrat : un refus quand le fichier de tokens est
 * incohérent, sinon le texte de la section.
 */
function modesDuContrat(contrat, contratsParNom, racine, configuration) {
  const source = resolve(racine, configuration.tokens);
  if (!existsSync(source)) return { texte: `## Modes\n\nAucun fichier de tokens à ${configuration.tokens} : aucun axe ne se lit.\n`, cones: undefined };

  let document;
  try {
    document = lireJson(source);
  } catch {
    return { refus: `${configuration.tokens} est illisible : ce n'est pas du JSON valide.` };
  }
  const format = etatDuFormatDeTokens(document);
  if (format.etat === "future" || format.etat === "invalide") {
    return { refus: `${configuration.tokens} porte une version du format de tokens que cette commande ne lit pas.` };
  }
  const { etat, axes, constats } = axesDeTokens(document);
  if (etat === "incoherent") {
    return { refus: [`${configuration.tokens} déclare des modes incohérents :`, ...constats.map(({ message }) => `  ${message}`)].join("\n") };
  }
  if (etat === "anterieur" || etat === "axe-ecarte") {
    return {
      texte: `## Modes\n\n${configuration.tokens} porte des modes sans axe déclaré : les contextes de ce contrat ne se déterminent pas. Un designer doit réexporter les tokens depuis Figma.\n`,
      cones: undefined,
    };
  }
  const refus = refusDuGrapheDesTokens(document, axes);
  if (refus.length > 0) {
    return { refus: [`${configuration.tokens} ne forme pas un graphe d'alias cohérent :`, ...refus.map((ligne) => `  ${ligne}`)].join("\n") };
  }

  const cones = conesDesAxes(document, axes);
  const generes = contextesDesAxes(document, axes);
  const { attributs, erreurs, notes } = attributsDesAxes(generes, configuration.modes ?? {});
  if (erreurs.length > 0) return { erreurConfiguration: erreurs.join("\n") };

  const touches = axesDuContrat(contrat, contratsParNom, cones);
  const touchants = generes.filter(({ nom }) => touches.axes.includes(nom));
  if (touchants.length === 0) return { texte: "## Modes\n\nAucun axe de modes ne touche ce contrat.\n", cones };

  const axeParNom = new Map(generes.map((axe) => [axe.nom, axe]));
  const lignes = [
    "## Modes",
    "",
    "Chaque axe se pose par un attribut, sur n'importe quel élément. Le composant ne lit pas le mode et ne déclare aucune variable de token.",
    "",
    ...touchants.map((axe) => `- \`${axe.nom}\` : attribut \`${attributs.get(axe.nom)}\`, modes ${axe.modes.map((mode) => (mode === axe.defaut ? `${mode} (défaut)` : mode)).join(", ")}`),
    ...notes.map((note) => `- ${note}`),
    "",
    "Contextes à vérifier :",
    "",
    ...contextesPosables(
      contextesDeVerification(touchants, touches.croisements.filter((couple) => couple.every((nom) => axeParNom.has(nom)))),
      attributs,
    ).map((ligne) => `- ${ligne}`),
    "",
  ];
  return { texte: lignes.join("\n"), cones };
}

/**
 * Les contextes à vérifier, écrits en attributs. Deux axes qui partagent un
 * attribut y prennent le même mode : un contexte qui leur en demande deux ne se
 * pose sur aucun élément et disparaît, et deux contextes qui posent les mêmes
 * attributs n'en font qu'un.
 */
function contextesPosables(contextes, attributs) {
  const lignes = [];
  for (const contexte of contextes) {
    const poses = new Map();
    const posable = Object.entries(contexte).every(([nom, mode]) => {
      const attribut = attributs.get(nom);
      if (poses.has(attribut) && poses.get(attribut) !== mode) return false;
      poses.set(attribut, mode);
      return true;
    });
    if (!posable) continue;
    const ligne = poses.size === 0
      ? "le contexte par défaut"
      : [...poses].map(([attribut, mode]) => `\`${attribut}="${mode}"\``).join(" et ");
    if (!lignes.includes(ligne)) lignes.push(ligne);
  }
  return lignes;
}

/**
 * Les chemins du contrat visé et de ses dépendances transitives. Un nom que
 * plusieurs contrats portent donne tous ces contrats.
 */
function cheminsDuGraphe(cible, documents) {
  const parNom = new Map();
  for (const document of documents) {
    const nom = document.contrat?.name;
    if (typeof nom === "string") parNom.set(nom, [...(parNom.get(nom) ?? []), document]);
  }
  const chemins = [cible];
  const pile = documents.filter(({ chemin }) => chemin === cible);
  while (pile.length > 0) {
    const { contrat } = pile.pop();
    for (const dependance of Array.isArray(contrat?.composes) ? contrat.composes : []) {
      for (const document of parNom.get(dependance?.component) ?? []) {
        if (chemins.includes(document.chemin)) continue;
        chemins.push(document.chemin);
        pile.push(document);
      }
    }
  }
  return chemins;
}

/** Lit les contrats du repository ; le contrat visé est toujours du lot. */
function documentsDuRepository(racine, configuration, cible) {
  const chemins = contratsDuDossier(join(racine, configuration.components)).map((chemin) => resolve(chemin));
  if (!chemins.includes(cible)) chemins.push(cible);
  const documents = [];
  for (const chemin of chemins) {
    try {
      documents.push({ chemin, contrat: lireJson(chemin) });
    } catch {
      // Un contrat voisin illisible relève d'`ucm check`.
    }
  }
  return documents;
}

function indexParNom(documents) {
  const parNom = new Map();
  for (const { contrat } of documents) {
    if (typeof contrat?.name !== "string") continue;
    const deja = parNom.get(contrat.name);
    parNom.set(contrat.name, deja === undefined ? contrat : [...[deja].flat(), contrat]);
  }
  return parNom;
}

/**
 * La commande `ucm guide`, et son code de sortie. `ecrire` reçoit le guide, ou
 * le compte rendu de son écriture avec `--out` ; `alerter` reçoit les refus.
 */
export function guide(arguments_, {
  racine = process.cwd(),
  ecrire = console.log,
  alerter = console.error,
  ecrireFichier = writeFileSync,
  catalogue = catalogueDesAides(),
} = {}) {
  const { options, erreur } = lireArgumentsGuide(arguments_);
  if (erreur) {
    alerter(`${erreur}\n\n${USAGE_GUIDE}`);
    return 2;
  }
  const { configuration, erreur: erreurConfiguration } = lireConfiguration(racine);
  if (erreurConfiguration) {
    alerter(erreurConfiguration);
    return 2;
  }

  const cible = resolve(racine, options.contrat);
  let contrat;
  try {
    contrat = lireJson(cible);
  } catch {
    alerter(`${options.contrat} est introuvable ou n'est pas du JSON valide.`);
    return 2;
  }
  if (!estObjet(contrat)) {
    alerter(`${options.contrat} n'est pas un contrat : sa racine n'est pas un objet.`);
    return 2;
  }
  const verdict = verdictDeVersion(contrat.meta?.contractVersion);
  if (verdict !== "ok") {
    alerter(verdict === "recent"
      ? `${options.contrat} est en version ${contrat.meta?.contractVersion}, que cette CLI ne lit pas encore. Un développeur doit mettre à jour @ucm-kit/cli.`
      : `${options.contrat} est en version ${contrat.meta?.contractVersion}, que cette CLI ne lit plus. Un designer doit réexporter le composant depuis Figma.`);
    return 2;
  }
  const champs = champsInvalidesDuContrat(contrat);
  if (champs.length > 0) {
    alerter(`${options.contrat} n'a pas la forme d'un contrat ${contrat.meta.contractVersion} : ${champs.join(", ")} `
      + "manquent ou sont mal formés. Un designer doit réexporter le composant depuis Figma.");
    return 2;
  }

  const documents = documentsDuRepository(racine, configuration, cible);
  // Une faute d'une dépendance, même indirecte, empêche de conclure sur ce
  // contrat ; celle d'un contrat sans rapport ne le concerne pas.
  const erreursDuGraphe = validerGrapheDesContrats(documents);
  const fautes = cheminsDuGraphe(cible, documents).flatMap((chemin) => (erreursDuGraphe.get(chemin) ?? [])
    .map((faute) => (chemin === cible ? faute : `${enSlash(relative(racine, chemin))} : ${faute}`)));
  if (fautes.length > 0) {
    alerter([`${options.contrat} ne forme pas un graphe de composition cohérent :`, ...fautes.map((faute) => `  ${faute}`)].join("\n"));
    return 1;
  }
  const contratsParNom = indexParNom(documents);

  const modes = modesDuContrat(contrat, contratsParNom, racine, configuration);
  if (modes.erreurConfiguration) {
    alerter(modes.erreurConfiguration);
    return 2;
  }
  if (modes.refus) {
    alerter(modes.refus);
    return 1;
  }

  const cheminConventions = conventionsLesPlusProches(dirname(cible), racine);
  const conventions = cheminConventions === null ? null : lireConventions(readFileSync(cheminConventions, "utf8"), catalogue);
  const caracteristiques = caracteristiquesDuContrat(contrat, contratsParNom, modes.cones);
  const { aides, nonTranches } = aidesDuContrat(caracteristiques, catalogue, conventions);

  const aRelire = [...avertissements(conventions, cheminConventions, racine, catalogue), ...pinsEnDesaccord(racine)];
  const icones = entreesCitees(contrat.icons, iconesUtilisees(contrat));
  const parties = [
    ["à relire", aRelire.length === 0 ? "" : ["## À relire avant de commencer", "", ...aRelire, ""].join("\n")],
    ["procédure", `${readFileSync(PROCEDURE, "utf8").replace(/\r\n/g, "\n").replace(/^(#+) /gm, "#$1 ").trim()}\n`],
    ["conventions", conventions?.tete
      ? `## Conventions du repository\n\n${conventions.tete}\n`
      : `## Conventions du repository\n\nAucun texte de tête dans ${cheminConventions === null ? ".ucm/conventions.md, absent" : enSlash(relative(racine, cheminConventions))}.\n`],
    ["contrat", extraction(contrat, contratsParNom)],
    ["aides", aides],
    ["non tranché", nonTranches],
    ["modes", modes.texte],
    ["icônes", icones === undefined ? "" : ["## Icônes réclamées", "", ...Object.values(icones).map((icone) => `- ${icone?.figmaName}`), ""].join("\n")],
  ].filter(([, texte]) => texte !== "");

  const taille = [
    "## Taille de ce guide",
    "",
    "| Partie | Octets |",
    "|---|---|",
    ...parties.map(([nom, texte]) => `| ${nom} | ${Buffer.byteLength(texte, "utf8")} |`),
    "",
  ].join("\n");
  const sortie = [`# Guide d'implémentation : ${contrat.name}`, "", ...parties.map(([, texte]) => texte), taille].join("\n");

  if (options.out === null) {
    ecrire(sortie);
    return 0;
  }
  const destination = resolve(racine, options.out);
  const lus = [
    ...documents.map(({ chemin }) => chemin),
    resolve(racine, NOM_CONFIGURATION),
    resolve(racine, configuration.tokens),
    ...(cheminConventions === null ? [] : [cheminConventions]),
    ...[...FICHIERS_EPINGLES, "package.json"].map((chemin) => join(racine, chemin)),
  ];
  if (lus.some((lu) => memeFichier(destination, lu)) || destination.toLowerCase().endsWith(".contract.json")) {
    alerter(`--out désigne ${options.out}, que la commande lit : choisissez un fichier à part.`);
    return 2;
  }
  if (existsSync(destination) && statSync(destination).isDirectory()) {
    alerter(`--out désigne le dossier ${options.out} : nommez le fichier Markdown à écrire.`);
    return 2;
  }
  mkdirSync(dirname(destination), { recursive: true });
  ecrireFichier(destination, sortie, "utf8");
  ecrire(`${options.out} : ${Buffer.byteLength(sortie, "utf8")} octets.`);
  return 0;
}
