/**
 * L'écart contrat ↔ code : le JUGER et le DIRE, sans savoir le mesurer.
 *
 * La coupure est celle de T2.3, poursuivie d'un cran. Mesurer un écart demande
 * un vérificateur de types propre à une cible, et reste chez l'adaptateur.
 * Décider si le relevé qu'il rend porte un écart, et l'écrire pour le rapport,
 * ne demande que la FORME de ce relevé — aucune ligne de code, aucun langage.
 * C'est donc du noyau, et `pariteEnEcart` descend ici avec les deux fonctions
 * qui s'en servent.
 *
 * Ce que cela permet : un repo sans adaptateur reçoit les mêmes verdicts, à
 * ceci près qu'ils portent tous sur ce que le noyau sait seul — le fichier est
 * là, ou il n'est pas là.
 */
import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";

/**
 * Ce relevé de parité porte-t-il un écart ?
 *
 * L'écart accuse le CODE, pas le contrat. Il ne BLOQUE rien : le geste
 * correctif appartient à un développeur, jamais à l'export ni au designer qui
 * l'a produit, et refuser sa pull request arrêterait la seule personne
 * incapable de la débloquer.
 *
 * `implementationAbsente` n'est même pas un écart : un contrat peut être
 * versionné avant le début de l'implémentation.
 *
 * `implementationNonLue` non plus, et pour une raison différente qui mérite
 * d'être écrite : là, il n'y a personne à qui adresser un geste correctif. Le
 * code est peut-être parfait — c'est l'adaptateur qui ne sait pas le lire, ou
 * il n'y en a aucun. Transformer sa propre limite en reproche serait le pire
 * des deux mondes.
 */
export function pariteEnEcart(ecarts) {
  return Boolean(ecarts.interfaceAbsente)
    || Boolean(ecarts.fonctionAbsente)
    || ecarts.manquantes.length > 0
    || ecarts.typesIncorrects.length > 0
    || ecarts.booleensNonUtilises.length > 0
    || ecarts.compositionsIncorrectes.length > 0;
}

/** Vrai si une implémentation existante porte un écart contrat ↔ code. */
export function aUnEcartDeParite(bilan) {
  return pariteEnEcart(bilan.parite);
}

/**
 * Avertit qu'une implémentation s'écarte du contrat qu'elle devrait suivre.
 *
 * **Avertissement, jamais blocage.** Cet écart n'accuse ni le contrat ni
 * l'export : il dit que le CODE est en retard sur ce que le contrat décrit.
 * Le seul geste correctif appartient à un développeur, et réexporter depuis
 * Figma n'y changerait rien. Refuser la pull request reviendrait donc à
 * arrêter la personne qui ne peut pas la débloquer, pour l'état d'un fichier
 * qu'elle ne touche pas — et une implémentation régénérée à froid EST attendue
 * en écart tant que la mesure n'a pas été refaite.
 *
 * Le périmètre suit la même règle que les autres états informatifs : sur une
 * pull request, seuls les contrats qu'elle modifie parlent (cf.
 * `perimetre-rapport.mjs`), de sorte qu'un export de tokens ne mentionne aucun
 * composant. Sur la branche principale et en local, où le lecteur est un
 * développeur, tous les écarts restent affichés.
 */
export function sectionEcartsDeParite(bilans) {
  return bilans.filter(aUnEcartDeParite).flatMap((bilan) => [
    "",
    ...rendreDiagnostic({
      severity: "warning",
      title: `Le code est en retard sur le contrat : \`${bilan.fichier}\``,
      summary: "Le contrat est valide. C'est l'implémentation qui ne le suit pas encore.",
      detailsTitle: "Écarts détectés",
      details: detailsDeLEcart(bilan.parite),
      action: bilan.parite.fonctionAbsente
        ? "Un développeur doit nommer la fonction comme le fichier ou l'exporter par défaut."
        : "Un développeur doit mettre à jour l'API ou le rendu du composant pour suivre le contrat.",
      status: "**Votre design n'est pas en cause** et réexporter depuis Figma n'y changerait rien. Cet écart n'empêche pas la fusion.",
    }),
  ]);
}

/**
 * Détaille l'écart, sans en accumuler les conséquences.
 *
 * Une interface ou une fonction absente rend tout le reste faux : chaque prop
 * paraîtrait manquante et chaque dépendance non rendue. Une seule cause exacte
 * vaut mieux qu'une liste d'accusations dérivées.
 */
function detailsDeLEcart(parite) {
  if (parite.interfaceAbsente) {
    return [`L'interface \`${parite.interfaceAbsente}\` est absente.`];
  }
  if (parite.fonctionAbsente) {
    return [`La fonction \`${parite.fonctionAbsente}\` est introuvable.`];
  }
  return [
    ...parite.manquantes.map((prop) => `La prop \`${prop}\` du contrat n'existe pas dans le composant.`),
    ...parite.typesIncorrects.map(
      ({ prop, attendu, recu }) =>
        `La prop \`${prop}\` doit être \`${attendu}\`, mais le composant expose \`${recu}\`.`,
    ),
    ...parite.booleensNonUtilises.map(
      (prop) => `La prop BOOLEAN \`${prop}\` existe mais n'est jamais lue par le composant.`,
    ),
    ...parite.compositionsIncorrectes.map(
      ({ component, attendu, rendu }) =>
        `Le contrat déclare ${libelleNombre(attendu, "occurrence")} de \`${component}\`, mais le composant en rend ${rendu}.`,
    ),
  ];
}

/**
 * Rappel terminal, sous son propre verdict : l'écart n'entre pas dans le
 * compte des contrats fautifs et ne refuse rien.
 */
export function resumeTerminalEcartsDeParite(bilans) {
  const concernes = bilans.filter(aUnEcartDeParite);
  return concernes.length === 0
    ? null
    : `⚠ ${libelleNombre(concernes.length, "composant")} en retard sur ${concernes.length === 1 ? "son" : "leur"} contrat.` +
      "\n  Un développeur doit mettre à jour l'API ou le rendu ; le code doit rendre exactement la cardinalité déclarée, ni moins ni plus." +
      "\n  Ne réexportez pas depuis Figma : le contrat est valide, et la fusion n'est pas bloquée.";
}
