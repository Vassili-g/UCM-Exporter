/**
 * Le contrôle d'un repository entier, et le rapport qu'un designer en lit.
 *
 * Vérifie trois propriétés d'un contrat, sans jamais le croire sur parole :
 *
 * 1. **Existence** — toute référence `{chemin.du.token}` citée par le contrat
 *    est cherchée dans le fichier de tokens, à son chemin exact. Une absence
 *    est signalée au designer sans bloquer : les tokens sont la source de
 *    vérité et un ancien contrat ne retient pas leur évolution. Les références
 *    sont RELEVÉES DANS LE CONTRAT, `samples` et `meta` exclus — un texte de
 *    maquette peut valoir « {montant.total} » sans nommer aucun token, et une
 *    phrase d'avertissement peut en citer un.
 * 2. **Parité** — dès qu'une implémentation existe, le contrat et elle sont
 *    confrontés. Ce contrôle AVERTIT sans bloquer : il accuse le code, pas le
 *    contrat, et son geste correctif appartient à un développeur. L'absence
 *    d'implémentation reste autorisée. **La MESURE appartient à un adaptateur**
 *    (T2.3) ; sans lui, ce module dit seulement où l'implémentation devrait
 *    être et si elle y est.
 * 3. **Composition** — chaque cible possède un contrat local, les slots et
 *    `composes` décrivent la même séquence et le graphe est acyclique. Cette
 *    part-là est bloquante : elle se lit dans les contrats seuls.
 *
 * Le même diagnostic est écrit pour deux lecteurs très différents : le
 * terminal pour un développeur, et un rapport markdown pour le **designer**,
 * qui valide les pull requests d'export sans jamais ouvrir un log de CI.
 *
 * Ce rapport est le SEUL message que reçoit le designer : tout ce qui refuse
 * une pull request y figure, y compris ce qui se constate ailleurs — d'où
 * `echecsDeTests`, que l'appelant transmet. Aucune sortie anticipée ne reste
 * muette non plus : un fichier de tokens absent ou illisible se publie comme le
 * reste.
 *
 * La réciproque ne vaut pas : ce qui figure au rapport ne refuse pas forcément
 * la pull request. Un constat que l'export ne peut ni causer ni corriger
 * s'écrit en ⚠ et laisse fusionner — sans quoi le rapport arrêterait la seule
 * personne incapable d'y répondre. Chaque titre dit littéralement ce qu'il a
 * trouvé : « N contrats invalides » n'est écrit que si N contrats le sont
 * (cf. `enteteDuVerdict`).
 *
 * ## Ce que ce module ne fait PAS, et c'est la coupure de T5.2
 *
 * Il **n'écrit aucun fichier, ne lit aucune variable d'environnement et ne sort
 * jamais du processus.** Il rend son verdict ; où celui-ci va — un fichier de
 * rapport, le résumé d'un run de CI, le terminal — appartient à l'outil qui
 * l'appelle. Le CONTENU du rapport est du format, sa PUBLICATION est de
 * l'outil : c'est cette ligne qui permet à `ucm check` et au script d'un repo
 * de rendre le même rapport sans en écrire deux.
 */
import { basename, join } from "node:path";
import { readFileSync } from "node:fs";

import { CONFIGURATION_PAR_DEFAUT } from "@ucm-kit/core/format";

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
    booleensNonUtilises: [],
    compositionsIncorrectes: [],
  };
}

/**
 * L'adaptateur de celui qui n'en a pas — et il n'est pas un bouchon.
 *
 * Un repo sans adaptateur n'est pas un repo sans réponse : le noyau sait dire
 * où une implémentation devrait être et si elle y est (T2.3), et c'est
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
    manquants: [], nonListes: [], fantomes: [], typesTypographiques: [], total: 0,
    graphe: erreursGraphe,
    parite: pariteVide(),
    // **Un relevé vide n'est pas un relevé vierge**, et les confondre était un
    // défaut réel, trouvé en passant un repo neuf au contrôle. Chaque sortie
    // anticipée — fichier illisible, champs absents, version hors fenêtre —
    // rend `parite` sans l'avoir mesurée, et le terminal y lisait
    // « code conforme » : la phrase exacte que T2.3 a écrit une classe entière
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

  const version = contrat?.meta?.contractVersion;
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
  if (versionIncompatible && typeof version === "string" && version !== "") {
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

  // L'index qu'on audite ne se parcourt pas, sinon la comparaison se
  // vérifierait elle-même. Depuis la 11.0 il n'existe plus : le relevé du
  // contrat est alors la seule et unique source.
  const { tokensUsed: index, ...corps } = contrat;
  const citees = collecterReferences(sansEchantillon(corps));
  const indexees = new Set(
    Array.isArray(index) ? index.filter((ref) => typeof ref === "string") : [],
  );

  // L'existence se contrôle sur la RÉUNION des deux ensembles : tant qu'un
  // index existe, ni une référence qu'il oublie ni une entrée citée nulle part
  // ne doit échapper au contrôle.
  const toutes = new Set([...citees, ...indexees]);

  return {
    ...vide,
    pariteMesuree: true,
    version: versionIncompatible,
    // Ce que l'export a signalé. Le contrat le porte déjà ; il ne manquait
    // qu'un lecteur du côté de la CI.
    avertissements: avertissementsCorrigeables(contrat),
    parite,
    manquants: referencesAbsentes(toutes, tokensExistants),
    nonListes: Array.isArray(index)
      ? [...citees].filter((ref) => !indexees.has(ref)).sort()
      : [],
    fantomes: Array.isArray(index)
      ? [...indexees].filter((ref) => !citees.has(ref)).sort()
      : [],
    typesTypographiques: erreursTypesTypographiques(contrat, tokensDtcg),
    total: toutes.size,
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
      && bilan.graphe.length === 0
      && bilan.nonListes.length === 0
      && bilan.fantomes.length === 0,
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
    const ecarts = bilan.nonListes.length + bilan.fantomes.length;
    if (ecarts > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `L'index des tokens du contrat est incohérent : \`${bilan.fichier}\``,
        count: ecarts,
        itemSingular: "écart",
        detailsTitle: "Écarts détectés",
        details: [
          ...bilan.nonListes.map((token) => `\`${token}\` est utilisé mais absent de \`tokensUsed\`.`),
          ...bilan.fantomes.map((token) => `\`${token}\` est listé dans \`tokensUsed\` mais n'est pas utilisé.`),
        ],
        action: "Signalez ce défaut à un développeur du plugin. Réexporter sans corriger l'exporteur ne suffira pas.",
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
    for (const token of bilan.nonListes) {
      fil.push({ flux: "error", texte: `✗ ${bilan.fichier} : utilisé par le contrat mais absent de tokensUsed → ${token}` });
    }
    for (const token of bilan.fantomes) {
      fil.push({ flux: "error", texte: `✗ ${bilan.fichier} : listé dans tokensUsed mais utilisé nulle part → ${token}` });
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
    for (const prop of bilan.parite.booleensNonUtilises) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : prop BOOLEAN déclarée mais non utilisée par le composant → ${prop}` });
    }
    for (const { component, attendu, rendu } of bilan.parite.compositionsIncorrectes) {
      fil.push({ flux: "warn", texte: `⚠ ${bilan.fichier} : cardinalité de composition incorrecte → ${component}, attendu ${attendu}, rendu ${rendu}` });
    }

    const ecartDeParite = aUnEcartDeParite(bilan);
    const tokensValides = bilan.nonListes.length + bilan.fantomes.length === 0
      && bilan.typesTypographiques.length === 0;
    // La validité porte sur le CONTRAT. Un code en retard n'invalide pas le
    // fichier qu'il devrait suivre : il se lit dans `etatDuCode`, juste après.
    const contratValide = tokensValides && bilan.graphe.length === 0 && !bilan.version;
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
        // du défaut que T2.3 corrige. Le fichier est là, l'adaptateur n'en a
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
  if (fautifs.some((bilan) => bilan.nonListes.length + bilan.fantomes.length > 0)) {
    fil.push({ flux: "error", texte: "  Écart avec tokensUsed : signalez ce défaut de l'exporteur à un développeur du plugin." });
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

  // Lire les tokens EUX-MÊMES, et non la sortie CSS qu'ils produisent. Le nom
  // d'un token est son chemin, écrit à l'identique dans le contrat et dans le
  // fichier DTCG : les comparer ne demande aucune traduction. Passer par une
  // feuille CSS en imposait une (`.` → `-`), et cette traduction divergeait.
  // Ce contrôle est le seul qui protège le design ; il ne dépend plus d'aucune
  // chaîne d'outillage entre les tokens et lui.
  const cheminTokens = join(racine, sourceTokens);
  let tokensDtcg;
  try {
    tokensDtcg = JSON.parse(readFileSync(cheminTokens, "utf8").replace(/^﻿/, ""));
  } catch (erreur) {
    // Absent et illisible ne se corrigent pas du même geste : le premier accuse
    // la génération, le second le fichier. Les confondre enverrait le designer
    // réparer un JSON qui n'existe pas.
    const absent = erreur?.code === "ENOENT";
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

  // Troisième filet, ajouté par T5.2 : le dossier des contrats peut ne pas
  // exister. Chez le consommateur d'origine il existait toujours et le cas ne
  // s'était jamais posé ; ailleurs, c'est un `ucm.config.json` qui se trompe de
  // chemin, ou un repo qui n'a pas encore reçu son premier export. Laisser
  // remonter l'ENOENT rendrait une stack trace Node là où ce module s'interdit
  // partout ailleurs d'exploser plutôt que de diagnostiquer.
  const dossierContrats = join(racine, configuration.components);
  let contrats;
  try {
    contrats = trouverContrats(dossierContrats);
  } catch (erreur) {
    if (erreur?.code !== "ENOENT") throw erreur;
    return abandon(
      `\`${configuration.components}\` est introuvable`,
      "Le dossier qui doit contenir les contrats n'existe pas dans le repository : aucun contrat n'a pu être contrôlé. Un développeur doit créer ce dossier ou corriger le chemin déclaré dans `ucm.config.json`.",
      [{ flux: "error", texte: `✗ ${dossierContrats} introuvable : aucun contrat n'a pu être cherché.` }],
      echecsDeTests,
    );
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
  // `cheminImplementation` accepte un motif à cette place (T2.3). Le raccourci
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
