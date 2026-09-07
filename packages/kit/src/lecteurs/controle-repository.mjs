/**
 * Orchestre une seule fois les lecteurs et le rapport destiné au designer.
 * Les adaptateurs mesurent les écarts propres à leur stack ; le noyau décide
 * des verdicts et de leur rédaction. La publication du rapport reste au CLI.
 */
import { basename, join } from "node:path";
import { readFileSync } from "node:fs";

import { CONFIGURATION_PAR_DEFAUT, versionDeContrat } from "@ucm-kit/core/format";

import { avertissementsCorrigeables, resumeTerminalAvertissements, sectionAvertissementsExport } from "./avertissements-export.mjs";
import { aUnEcartDeParite, resumeTerminalEcartsDeParite, sectionEcartsDeParite } from "./diagnostic-parite.mjs";
import { diagnosticEchecsDeTests, resumeTerminalEchecsDeTests } from "./diagnostic-tests.mjs";
import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
import { resumeTerminalTokensManquants, sectionTokensManquants } from "./diagnostic-tokens.mjs";
import { cheminImplementation, implementationPresente } from "./implementation.mjs";
import { collecterReferences, sansEchantillon } from "./references-token.mjs";
import { selectionnerBilansDuRapport } from "./perimetre-rapport.mjs";
import { indexerTokensDtcg, referencesAbsentes } from "./tokens-dtcg.mjs";
import { erreursTypesTypographiques } from "./typography-token-types.mjs";
import { trouverContrats } from "./trouver-contrats.mjs";
import { champsInvalidesDuContrat } from "./validation-contrat.mjs";
import { validerGrapheDesContrats } from "./validation-graphe-contrats.mjs";
import { bilanEstBloquant, enteteDuVerdict } from "./verdict-bilan.mjs";
import { VERSION_CONTRAT_MAXIMALE, VERSION_CONTRAT_MINIMALE, verdictDeVersion } from "./version-contrat.mjs";

const VERSIONS_CONTRAT_SUPPORTEES = VERSION_CONTRAT_MINIMALE === VERSION_CONTRAT_MAXIMALE
  ? VERSION_CONTRAT_MINIMALE
  : `${VERSION_CONTRAT_MINIMALE} à ${VERSION_CONTRAT_MAXIMALE}`;

/** Un relevé de parité vierge : la forme que tout adaptateur doit rendre. */
function pariteVide() {
  return {
    implementationAbsente: false,
    implementationNonLue: null,
    interfaceAbsente: null,
    fonctionAbsente: null,
    manquantes: [],
    typesIncorrects: [],
    valeursNonImplementees: [],
    booleensNonUtilises: [],
    enumsSansEffet: [],
    compositionsIncorrectes: [],
  };
}

/**
 * L'adaptateur de celui qui n'en a pas — et il n'est pas un bouchon.
 *
 * Un repo sans adaptateur n'est pas un repo sans réponse : le noyau sait dire
 * où une implémentation devrait être et si elle y est, et c'est
 * exactement ce que cet objet répond. Ce qu'il ne fait jamais, c'est conclure
 * « conforme » de ce qu'il n'a pas lu — un fichier présent devient
 * `implementationNonLue`, la seule phrase vraie quand personne n'a de
 * vérificateur pour ce langage.
 *
 * C'est la règle de tri n° 3 rendue exécutable : le noyau est utile seul, et
 * l'adaptateur n'ajoute que ce que lui seul peut mesurer.
 */
export const ADAPTATEUR_VIDE = Object.freeze({
  lireApiPublique: () => new Map(),
  nomInterfaceAttendue: () => null,
  ecartsDeParite: (_contrat, _releve, _nomInterface, options = {}) =>
    (options.presente
      ? { ...pariteVide(), implementationNonLue: options.chemin ?? null }
      : { ...pariteVide(), implementationAbsente: true }),
});

/**
 * Analyse un contrat sans jamais lever : un fichier illisible est un
 * diagnostic à afficher, pas un plantage du garde-fou (une stack trace Node
 * n'aide personne, et surtout pas la personne qui a produit l'export).
 */
function analyser(chemin, contexte, erreursGraphe = []) {
  const { racine, motif, apiPublique, adaptateur, tokensExistants, tokensDtcg } = contexte;
  const fichier = basename(chemin);
  const relatif = chemin.replace(racine, ".");
  const vide = {
    fichier, relatif, illisible: false, champsAbsents: [], version: null,
    avertissements: [],
    manquants: [], typesTypographiques: [], total: 0,
    graphe: erreursGraphe,
    parite: pariteVide(),
    // **Un relevé vide n'est pas un relevé vierge**, et les confondre était un
    // défaut réel, trouvé en passant un repo neuf au contrôle. Chaque sortie
    // anticipée — fichier illisible, champs absents, version hors fenêtre —
    // rend `parite` sans l'avoir mesurée, et le terminal y lisait
    // « code conforme » : la phrase exacte qu'une classe entière
    // de code pour ne plus jamais prononcer sans avoir lu.
    pariteMesuree: false,
  };

  let contrat;
  try {
    // Un BOM en tête de fichier ferait échouer JSON.parse : on le retire.
    contrat = JSON.parse(readFileSync(chemin, "utf8").replace(/^﻿/, ""));
  } catch {
    return { ...vide, illisible: true };
  }

  // La version se lit par la règle du format, pas par un accès écrit ici : le
  // champ qui la porte est le même que celui que le producteur annonce dans le
  // corps de sa pull request, et deux idées de « où vit la version »
  // divergeraient sans que rien ne le dise.
  const version = versionDeContrat(contrat);
  // On garde le SENS de l'écart, pas seulement son existence : c'est lui qui
  // dit à qui appartient le geste correctif.
  const verdict = verdictDeVersion(version);
  const versionIncompatible = verdict === "ok" ? null : { valeur: version, verdict };

  // **La version se juge AVANT les champs, et l'ordre inverse était un défaut.**
  //
  // `champsInvalidesDuContrat` refuserait un contrat hors fenêtre pour ses
  // champs, `analyser` sortirait tôt, et le verdict de version serait perdu.
  // `enteteDuVerdict` écrirait alors « contrats invalides » — un titre qui
  // accuse le designer pour un contrat parfaitement formé dont seule la version
  // n'est pas lue. C'est le critère de réussite n° 4 du plan qui tombe : le
  // message doit dire QUI corrige.
  //
  // La condition n'est pas « la version est mauvaise » mais « la version est
  // LISIBLE et mauvaise ». Un fichier vidé de sa substance (`{}`, JSON
  // parfaitement valide) n'a pas une version trop ancienne : il n'en a pas, et
  // c'est un contrat cassé, pas un contrat périmé. Sans cette nuance, l'ordre
  // inversé remplacerait une accusation fausse par une autre.
  //
  // *Ce qu'on accepte de perdre, et le plan l'assume :* le diagnostic DÉTAILLÉ
  // d'un contrat hors fenêtre. Il reçoit un verdict de version qui nomme le bon
  // geste et le bon responsable, pas la liste de ses champs manquants — que ce
  // validateur-ci n'a de toute façon pas le droit de dresser pour une grammaire
  // qu'il ne lit pas.
  //
  // `versionDeContrat` rend `null` dans ce cas exact — champ absent, vide, ou
  // d'un autre type —, ce qui est aussi la condition testée ici.
  if (versionIncompatible && version !== null) {
    return { ...vide, version: versionIncompatible };
  }

  // Le garde-fou vérifie ensuite qu'il a bien de quoi travailler. Sans ce
  // contrôle, un fichier vidé de sa substance (`{}`, JSON parfaitement valide)
  // passerait au vert : zéro référence citée, donc zéro référence manquante.
  const champsAbsents = champsInvalidesDuContrat(contrat);
  if (champsAbsents.length > 0) return { ...vide, champsAbsents };

  const implementation = cheminImplementation(chemin, motif);
  // La présence se demande au disque, pas au relevé : c'est elle qui distingue
  // « pas encore écrit » de « écrit, mais illisible par cet adaptateur ».
  const parite = adaptateur.ecartsDeParite(
    contrat,
    apiPublique.get(implementation),
    adaptateur.nomInterfaceAttendue(implementation),
    { presente: implementationPresente(chemin, { motif }), chemin: basename(implementation) },
  );

  // Le contrat ne publie aucun index de ses tokens depuis la 11.0, et
  // `champsInvalidesDuContrat` refuse celui qui en porterait un. Le relevé du
  // contrat est donc la seule source de ce qui est cité.
  const citees = collecterReferences(sansEchantillon(contrat));

  return {
    ...vide,
    pariteMesuree: true,
    version: versionIncompatible,
    // Ce que l'export a signalé. Le contrat le porte déjà ; il ne manquait
    // qu'un lecteur du côté de la CI.
    avertissements: avertissementsCorrigeables(contrat),
    parite,
    manquants: referencesAbsentes(citees, tokensExistants),
    typesTypographiques: erreursTypesTypographiques(contrat, tokensDtcg),
    total: citees.size,
  };
}

/** Contrats valides qui attendent encore leur première implémentation. */
function implementationsEnAttente(bilans) {
  return bilans.filter(
    (bilan) =>
      bilan.parite.implementationAbsente
      && !bilan.illisible
      && bilan.champsAbsents.length === 0
      && !bilan.version
      && bilan.graphe.length === 0,
  );
}

/** Ajoute au rapport l'état informatif des contrats encore sans implémentation. */
function ajouterImplementationsEnAttente(lignes, bilans) {
  const attentes = implementationsEnAttente(bilans);
  if (attentes.length === 0) return;

  lignes.push("", ...rendreDiagnostic({
    severity: "info",
    title: attentes.length === 1
      ? "Un composant n'a pas encore d'implémentation"
      : "Des composants n'ont pas encore d'implémentation",
    count: attentes.length,
    itemSingular: "composant",
    summary: "Ces contrats sont valides et peuvent être fusionnés avant leur implémentation :",
    items: attentes.map((bilan) => `\`${bilan.fichier}\``),
    status: "La conformité sera vérifiée dès que l'implémentation du composant sera ajoutée, et signalée sans bloquer.",
  }));
}

/** Rapport markdown destiné au designer : ce qui bloque, et quoi faire. */
function rapportMarkdown(bilans, fautifs, bilansDuRapport, contexte) {
  const { echecsDeTests, tokensModifies, sourceTokens } = contexte;
  // Une PR de tokens peut rendre obsolète n'importe quel contrat : dans ce
  // cas, tous les écarts nouvellement visibles sont utiles. Dans une autre PR,
  // on limite cet avertissement aux contrats effectivement modifiés.
  const bilansTokensManquants = tokensModifies ? bilans : bilansDuRapport;

  // Un rapport vert alors que la pull request est refusée est pire que pas de
  // rapport du tout : le designer chercherait la panne ailleurs. Le verdict
  // couvre donc aussi ce que ce module n'a pas exécuté lui-même.
  if (fautifs.length === 0 && !echecsDeTests.echoue) {
    const tokens = bilans.reduce((somme, bilan) => somme + bilan.total, 0);
    const lignes = [
      "## ✅ Aucun blocage détecté",
      "",
      `${libelleNombre(bilans.length, "contrat")} et ${libelleNombre(tokens, "référence")} de token contrôlés. Les contrôles bloquants sont passés.`,
    ];
    lignes.push(...sectionTokensManquants(bilansTokensManquants, { tokensModifies, sourceTokens }));
    // Le verdict est exact, mais il ne porte que sur ce qui a été exporté. Une
    // propriété que l'export n'a pas pu décrire n'est citée par personne et ne
    // produit donc aucun écart : sans ce rappel, elle passerait sous un ✅.
    lignes.push(...sectionAvertissementsExport(bilansDuRapport));
    lignes.push(...sectionEcartsDeParite(bilansDuRapport));
    ajouterImplementationsEnAttente(lignes, bilansDuRapport);
    return lignes.join("\n");
  }

  // Le titre sépare les erreurs internes du contrat des échecs du repository,
  // et il ne dit que ce qui est LITTÉRALEMENT vrai : un contrat invalide est un
  // contrat illisible, incomplet, incompatible ou incohérent — jamais un code
  // en retard, jamais un test rouge ailleurs. `bilanEstBloquant` tient cette
  // définition et rien d'autre n'entre dans `fautifs` ; `enteteDuVerdict` en
  // tire le titre. Une référence absente des tokens et un écart de parité
  // n'entrent dans aucun des deux verdicts : leurs sections avertissent sans
  // laisser croire qu'elles retiennent la fusion.
  const avertissements = bilansDuRapport.flatMap((bilan) => bilan.avertissements);
  const lignes = enteteDuVerdict(fautifs, avertissements.length > 0);

  // La cause la plus probable se lit en premier, et une seule fois : les
  // diagnostics qui suivent y renvoient au lieu de recopier les mêmes
  // citations à chaque section.
  lignes.push(...sectionAvertissementsExport(bilansDuRapport, { bloquant: true }));
  lignes.push(...sectionTokensManquants(bilansTokensManquants, { tokensModifies, sourceTokens }));

  for (const bilan of fautifs) {
    if (bilan.illisible) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Le contrat n'est pas un fichier JSON valide : \`${bilan.fichier}\``,
        summary: "Le repository ne peut pas lire ce fichier.",
        action: "Réexportez le composant depuis Figma. Ne corrigez pas le fichier JSON à la main.",
        status: "La fusion reste bloquée.",
      }));
      continue;
    }
    if (bilan.champsAbsents.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Le contrat est incomplet : \`${bilan.fichier}\``,
        summary: "Le fichier ne contient pas toutes les informations nécessaires.",
        detailsTitle: "Champs absents ou invalides",
        details: bilan.champsAbsents.map((champ) => `\`${champ}\``),
        action: "Réexportez le composant depuis Figma. Ne corrigez pas le fichier JSON à la main.",
        status: "La fusion reste bloquée.",
      }));
      continue;
    }
    if (bilan.version) {
      const recente = bilan.version.verdict === "recent";
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `La version du contrat n'est pas prise en charge : \`${bilan.fichier}\``,
        summary: `Le contrat utilise le schéma ${bilan.version.valeur}. Le repository prend en charge les schémas ${VERSIONS_CONTRAT_SUPPORTEES}.`,
        action: recente
          ? "Un développeur doit auditer le nouveau schéma et adapter ce repository. Réexporter ne corrigera pas ce problème."
          : "Réexportez le composant avec la version actuelle du plugin.",
        status: "La fusion reste bloquée.",
      }));
    }
    if (bilan.graphe.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `La composition du contrat est incohérente : \`${bilan.fichier}\``,
        detailsTitle: "Écarts détectés",
        details: bilan.graphe,
        action: "Un développeur doit vérifier les contrats co-localisés, les slots composés et les cycles.",
        status: "La fusion reste bloquée.",
      }));
    }
    if (bilan.typesTypographiques.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Des tokens typographiques ont un type incompatible : \`${bilan.fichier}\``,
        count: bilan.typesTypographiques.length,
        itemSingular: "token",
        detailsTitle: "Écarts détectés",
        details: bilan.typesTypographiques.map(({ chemin, reference, attendu, recu }) =>
          `\`${chemin}\` utilise \`${reference}\` de type \`${recu}\`. Type attendu : \`${attendu}\`.`),
        action: "Un développeur doit corriger l'exporteur, puis un designer doit réexporter les tokens depuis Figma.",
        status: "La fusion reste bloquée.",
      }));
    }
  }

  // Les deux diagnostics reçoivent ce que l'export a signalé, mot pour mot :
  // ni l'un ni l'autre ne conclut à sa place, mais aucun ne peut plus disculper
  // Figma sans l'avoir consulté.
  lignes.push(...diagnosticEchecsDeTests(echecsDeTests, avertissements));

  lignes.push(...sectionEcartsDeParite(bilansDuRapport));
  ajouterImplementationsEnAttente(lignes, bilansDuRapport);
  return lignes.join("\n");
}

/** Le fil du terminal, contrat par contrat, dans l'ordre où il s'écrit. */
function terminalDesBilans(bilans) {
  const fil = [];
  for (const bilan of bilans) {
    if (bilan.illisible) {
      fil.push({ flux: "error", texte: `✗ ${bilan.fichier} : JSON illisible (${bilan.relatif})` });
      continue;
    }
    if (bilan.champsAbsents.length > 0) {
      fil.push({ flux: "error", texte: `✗ ${bilan.fichier} : contrat inexploitable, champs absents → ${bilan.champsAbsents.join(', ')} (${bilan.relatif})` });
      continue;
    }
    if (bilan.version) {
      fil.push({
        flux: "error",
        texte: bilan.version.verdict === "recent"
          ? `✗ ${bilan.fichier} : contrat en ${bilan.version.valeur}. Ce repository lit les schémas ${VERSIONS_CONTRAT_SUPPORTEES}. Un développeur doit adapter les lecteurs ; réexporter n'y changera rien.`
          : `✗ ${bilan.fichier} : contrat en ${bilan.version.valeur}. Ce repository lit les schémas ${VERSIONS_CONTRAT_SUPPORTEES}. Réexportez le composant depuis Figma.`,
      });
    }
    for (const token of bilan.manquants) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : référence absente de la source de tokens → ${token}` });
    }
    for (const { chemin, reference, attendu, recu } of bilan.typesTypographiques) {
      fil.push({ flux: "error", texte: `✗ ${bilan.fichier} : type typographique incompatible → ${chemin}, ${reference} est ${recu}, attendu ${attendu}` });
    }
    for (const erreur of bilan.graphe) {
      fil.push({ flux: "error", texte: `✗ ${bilan.fichier} : graphe de composition incohérent → ${erreur}` });
    }
    // Le terminal marque la parité en ⚠ et non en ✗ : le rapport ne la compte
    // pas parmi les contrats fautifs, et deux symboles contradictoires pour le
    // même constat feraient chercher un blocage qui n'existe pas.
    if (bilan.parite.interfaceAbsente) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : interface ${bilan.parite.interfaceAbsente} introuvable dans le composant` });
    }
    if (bilan.parite.fonctionAbsente) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : fonction du composant ${bilan.parite.fonctionAbsente} introuvable → nommez-la comme le fichier, ou exportez-la par défaut` });
    }
    for (const prop of bilan.parite.manquantes) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : prop du contrat absente du composant → ${prop}` });
    }
    for (const { prop, attendu, recu } of bilan.parite.typesIncorrects) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : type de prop incompatible → ${prop} doit être ${attendu}, reçu ${recu}` });
    }
    for (const { prop, valeurs } of bilan.parite.valeursNonImplementees ?? []) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : valeurs du contrat absentes de l'union du code → ${prop} : ${valeurs.join(", ")}` });
    }
    for (const { prop } of bilan.parite.enumsSansEffet ?? []) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : prop enum déclarée mais non utilisée par le composant → ${prop}` });
    }
    for (const prop of bilan.parite.booleensNonUtilises) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : prop BOOLEAN déclarée mais non utilisée par le composant → ${prop}` });
    }
    for (const { component, attendu, rendu } of bilan.parite.compositionsIncorrectes) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : cardinalité de composition incorrecte → ${component}, attendu ${attendu}, rendu ${rendu}` });
    }

    const ecartDeParite = aUnEcartDeParite(bilan);
    // La validité porte sur le contrat. Un code en retard n'invalide pas le
    // fichier qu'il devrait suivre : il se lit dans `etatDuCode`, juste après.
    const contratValide = bilan.typesTypographiques.length === 0
      && bilan.graphe.length === 0
      && !bilan.version;
    const aAvertir = bilan.manquants.length > 0 || ecartDeParite;
    const marque = contratValide ? (aAvertir ? "⚠" : "✓") : "✗";
    const etatDuCode = !bilan.pariteMesuree
      // L'analyse s'est arrêtée avant la parité : le contrat est illisible, ou
      // sa version n'est pas lue. Rien n'a été comparé, et le dire est la seule
      // phrase vraie — « conforme » accuserait le contraire de ce qui s'est
      // passé, sur la ligne même qui annonce le refus.
      ? "code non examiné"
      : bilan.parite.implementationAbsente
        ? "implémentation en attente (autorisé)"
        // Ne jamais dire « conforme » de ce qu'on n'a pas lu : c'est la moitié
        // de ce défaut. Le fichier est là, l'adaptateur n'en a
        // rien tiré.
        : bilan.parite.implementationNonLue
          ? `implémentation présente, non lue par l'adaptateur (${bilan.parite.implementationNonLue})`
          : ecartDeParite
            ? "code en écart"
            : "code conforme";
    fil.push({
      flux: "log",
      texte: `${marque} ${bilan.fichier} : ${libelleNombre(bilan.total, "référence")} contrôlée${bilan.total === 1 ? "" : "s"}, ${etatDuCode} (${bilan.relatif})`,
    });
  }
  return fil;
}

/** Les gestes correctifs du terminal : seuls ceux qui s'appliquent. */
function terminalDesFautifs(fautifs) {
  if (fautifs.length === 0) return [];
  const fil = [{ flux: "error", texte: `\n✗ ${libelleNombre(fautifs.length, "contrat")} en défaut.` }];
  if (fautifs.some((bilan) => bilan.illisible || bilan.champsAbsents.length > 0)) {
    fil.push({ flux: "error", texte: '  JSON illisible ou incomplet : ré-exportez le composant depuis Figma.' });
  }
  if (fautifs.some((bilan) => bilan.typesTypographiques.length > 0)) {
    fil.push({ flux: "error", texte: "  Types typographiques incompatibles : corrigez l’exporteur, puis réexportez les tokens depuis Figma ; ne retouchez pas les contrats ni le code." });
  }
  if (fautifs.some((bilan) => bilan.graphe.length > 0)) {
    fil.push({ flux: "error", texte: "  Graphe de composition incohérent : ajoutez les contrats cibles, alignez les slots et supprimez les cycles." });
  }
  return fil;
}

/**
 * Renonce à contrôler, en le disant.
 *
 * Les préalables du garde-fou (fichier de tokens lisible, dossier de contrats
 * atteignable) peuvent manquer : il n'a alors rien à contrôler, mais la pull
 * request est refusée quand même. Sortir en silence laisserait le designer
 * devant un ✗ sans cause ; ce rapport minimal nomme le préalable manquant et le
 * geste attendu.
 */
function abandon(titre, explication, terminal, echecsDeTests) {
  return {
    bilans: [],
    fautifs: [],
    bloquant: true,
    rapport: [
      `## ❌ ${titre}`,
      "",
      explication,
      "",
      ...diagnosticEchecsDeTests(echecsDeTests),
    ].join("\n"),
    terminal,
  };
}

/**
 * Rend le verdict d'un repository sans aucun contrat : rien à contrôler, donc
 * aucun refus de fusion.
 *
 * Le projet traite déjà une implémentation absente comme un état d'avancement.
 * Un export absent reçoit ici le même traitement. Sans ce verdict, la CI
 * installée par `ucm init` refuse la fusion dès le premier push, avant que le
 * moindre export ait pu avoir lieu.
 *
 * Le rapport demande un geste, exporter, ce qui est la condition à laquelle un
 * message destiné au designer s'écrit.
 *
 * Le dossier cherché est nommé dans le rapport. Un `ucm.config.json` qui vise un
 * dossier inexistant produit le même relevé qu'un repository neuf, et aucune
 * mesure ne les sépare ; nommer l'endroit cherché laisse un développeur repérer
 * un chemin fautif sans que ce module ait à le supposer.
 */
function demarrage({ dossierDeclare, dossierAbsent, sourceTokens, tokensAbsents, echecsDeTests }) {
  const lignes = echecsDeTests.echoue
    ? enteteDuVerdict([], false)
    : [
      "## ✅ Ce repository n'a pas encore reçu d'export",
      "",
      `Aucun contrat n'a été trouvé dans \`${dossierDeclare}\`, il n'y a donc rien à contrôler. Un repository où UCM vient d'être installé se trouve dans cet état jusqu'à son premier export.`,
      "",
    ];

  const etat = [];
  if (tokensAbsents) etat.push(`\`${sourceTokens}\` n'a pas encore été exporté.`);
  if (dossierAbsent) {
    etat.push(`Le dossier \`${dossierDeclare}\`, déclaré par \`ucm.config.json\`, n'existe pas encore. Si des contrats devaient déjà s'y trouver, un développeur doit corriger ce chemin.`);
  }
  if (etat.length > 0) lignes.push(...etat, "");

  lignes.push(
    "#### Action",
    "",
    "Un designer ouvre le plugin dans Figma, lance **Exporter les tokens**, puis exporte un premier composant. Ce rapport contrôlera alors chaque contrat déposé.",
    "",
  );
  lignes.push(...diagnosticEchecsDeTests(echecsDeTests));

  return {
    bilans: [],
    fautifs: [],
    bloquant: echecsDeTests.echoue,
    rapport: lignes.join("\n"),
    terminal: [{
      flux: "log",
      texte: `✓ Aucun contrat dans ${dossierDeclare} : ce repository n'a pas encore reçu d'export. Rien à contrôler.`,
    }],
  };
}

/**
 * Contrôle un repository et rend son verdict — sans rien écrire nulle part.
 *
 * `adaptateur` est la seule porte par laquelle une connaissance de stack entre
 * ici. Son défaut, `ADAPTATEUR_VIDE`, n'est pas un mode dégradé : c'est le
 * noyau seul, qui répond « où » et « est-elle là » sans jamais prétendre avoir
 * lu du code.
 */
export function controlerRepository(racine, {
  configuration = CONFIGURATION_PAR_DEFAUT,
  adaptateur = ADAPTATEUR_VIDE,
  echecsDeTests = { echoue: false, echecs: [] },
  contratsModifies,
  tokensModifies = false,
} = {}) {
  const sourceTokens = configuration.tokens;
  const motif = configuration.implementation;

  // Les contrats se cherchent avant que les tokens soient jugés, parce que leur
  // nombre décide de ce qu'un fichier de tokens absent signifie. Un contrat cite
  // des références qu'il faut résoudre ; sans contrat, aucune référence n'existe
  // et l'absence du fichier ne prive aucun contrôle de sa matière. L'ordre
  // inverse refusait la fusion avant d'avoir compté.
  //
  // Un dossier absent compte pour zéro contrat. Il manque tant que le premier
  // export n'a pas eu lieu, ce qui est le cas de tout repository neuf.
  const dossierContrats = join(racine, configuration.components);
  let contrats;
  let dossierAbsent = false;
  try {
    contrats = trouverContrats(dossierContrats);
  } catch (erreur) {
    // Seule l'absence vaut état d'avancement. Un ENOTDIR ou un EACCES signalent
    // une panne, et les avaler ici rendrait un verdict vert pour une panne.
    if (erreur?.code !== "ENOENT") throw erreur;
    contrats = [];
    dossierAbsent = true;
  }

  // Lire les tokens EUX-MÊMES, et non la sortie CSS qu'ils produisent. Le nom
  // d'un token est son chemin, écrit à l'identique dans le contrat et dans le
  // fichier DTCG : les comparer ne demande aucune traduction. Passer par une
  // feuille CSS en imposait une (`.` → `-`), et cette traduction divergeait.
  // Ce contrôle est le seul qui protège le design ; il ne dépend plus d'aucune
  // chaîne d'outillage entre les tokens et lui.
  const cheminTokens = join(racine, sourceTokens);
  let tokensDtcg;
  let tokensAbsents = false;
  try {
    tokensDtcg = JSON.parse(readFileSync(cheminTokens, "utf8").replace(/^﻿/, ""));
  } catch (erreur) {
    // Absent et illisible ne se corrigent pas du même geste : le premier accuse
    // la génération, le second le fichier. Les confondre enverrait le designer
    // réparer un JSON qui n'existe pas.
    //
    // Seule l'absence dépend du compte des contrats. Un fichier tronqué appelle
    // le même geste à tout moment, cesser de l'éditer à la main, y compris dans
    // un repository qui n'a encore rien exporté.
    const absent = erreur?.code === "ENOENT";
    if (!absent || contrats.length > 0) {
      return abandon(
        absent ? `\`${sourceTokens}\` est introuvable` : `\`${sourceTokens}\` est illisible`,
        absent
          ? `Le fichier de tokens est absent du repository : aucune référence n'a pu être vérifiée. Si cette pull request modifie les tokens, relancez **Exporter les tokens** depuis Figma ; sinon, signalez-le à un développeur.`
          : "Le fichier de tokens n'est pas du JSON valide : il a sans doute été tronqué ou modifié à la main. Relancez **Exporter les tokens** depuis Figma plutôt que de le corriger.",
        [{
          flux: "error",
          texte: absent
            ? `✗ ${cheminTokens} introuvable. Régénérez les tokens du repository.`
            : `✗ ${cheminTokens} est illisible. Relancez l’export de tokens depuis Figma.`,
        }],
        echecsDeTests,
      );
    }
    tokensAbsents = true;
    tokensDtcg = {};
  }

  if (contrats.length === 0) {
    return demarrage({
      dossierDeclare: configuration.components,
      dossierAbsent,
      sourceTokens,
      tokensAbsents,
      echecsDeTests,
    });
  }

  const documents = contrats.flatMap((chemin) => {
    try {
      return [{ chemin, contrat: JSON.parse(readFileSync(chemin, "utf8").replace(/^﻿/, "")) }];
    } catch {
      return [];
    }
  });
  const erreursGraphe = validerGrapheDesContrats(documents);

  // L'API publique de tous les composants est relevée d'un coup, avant
  // l'analyse : l'adaptateur peut ainsi ne construire qu'un seul programme.
  // La lambda n'est pas décorative : `map` passe l'index en second argument, et
  // `cheminImplementation` accepte un motif à cette place. Le raccourci
  // `map(cheminImplementation)` ferait donc résoudre un motif valant `0`.
  const implementations = contrats.map((chemin) => cheminImplementation(chemin, motif));
  const apiPublique = adaptateur.lireApiPublique(implementations, racine);

  const contexte = {
    racine, motif, apiPublique, adaptateur,
    tokensExistants: indexerTokensDtcg(tokensDtcg),
    tokensDtcg,
  };
  const bilans = contrats.map((chemin) =>
    analyser(chemin, contexte, erreursGraphe.get(chemin) ?? []),
  );
  const fautifs = bilans.filter(bilanEstBloquant);

  // La validation reste globale. Seuls les états informatifs sont limités aux
  // contrats de la PR afin qu'un export ne parle pas d'un autre composant.
  const bilansDuRapport = selectionnerBilansDuRapport(bilans, contratsModifies);
  const rapport = rapportMarkdown(bilans, fautifs, bilansDuRapport, {
    echecsDeTests, tokensModifies, sourceTokens,
  });

  const terminal = [...terminalDesBilans(bilans), ...terminalDesFautifs(fautifs)];

  // L'écart contrat ↔ code se rappelle à part, sous son propre verdict : il
  // n'entre pas dans le compte des contrats fautifs et ne refuse rien.
  const resumeParite = resumeTerminalEcartsDeParite(bilans);
  if (resumeParite) terminal.push({ flux: "warn", texte: `\n${resumeParite}` });

  // Les tests ont déjà affiché leur propre sortie ; ce rappel sert à ce que le
  // dernier mot du terminal dise la même chose que le rapport publié.
  for (const ligne of resumeTerminalEchecsDeTests(echecsDeTests)) {
    terminal.push({ flux: "error", texte: ligne });
  }

  // Le terminal dit la même chose que le rapport : un point non décrit ne refuse
  // pas la pull request, mais il ne doit pas non plus disparaître du fil.
  const resumeAvertissements = resumeTerminalAvertissements(bilansDuRapport);
  if (resumeAvertissements) terminal.push({ flux: "error", texte: `\n${resumeAvertissements}` });
  const resumeTokensManquants = resumeTerminalTokensManquants(bilans, sourceTokens);
  if (resumeTokensManquants) terminal.push({ flux: "warn", texte: `\n${resumeTokensManquants}` });

  // Le rapport porte le verdict complet : le verdict couvre donc ce que ce
  // module a relayé comme ce qu'il a constaté, sans quoi la chaîne pourrait
  // finir au vert avec un rapport rouge.
  const bloquant = fautifs.length > 0 || echecsDeTests.echoue;
  if (!bloquant) {
    terminal.push({
      flux: "log",
      texte: "\n✓ Contrats valides."
        + " Les références absentes et les écarts contrat ↔ code éventuels ont été signalés sans bloquer.",
    });
  }

  return { bilans, fautifs, rapport, terminal, bloquant };
}
