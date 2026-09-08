/**
 * Juge et rédige l'écart contrat ↔ code sans le mesurer. La mesure dépend de la
 * stack et reste dans l'adaptateur ; le noyau ne connaît que la forme du relevé.
 */
import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";

/**
 * Ce relevé de parité porte-t-il un écart ?
 *
 * L'écart accuse le code, pas le contrat. Il ne bloque rien : le geste
 * correctif appartient à un développeur, jamais à l'export ni au designer qui
 * l'a produit, et refuser sa pull request arrêterait la seule personne
 * incapable de la débloquer.
 *
 * `implementationAbsente` n'est même pas un écart : un contrat peut être
 * versionné avant le début de l'implémentation.
 *
 * `implementationNonLue` non plus, et pour une raison différente qui mérite
 * d'être écrite : là, il n'y a personne à qui adresser un geste correctif. Le
 * code est peut-être parfait : c'est l'adaptateur qui ne sait pas le lire, ou
 * il n'y en a aucun. Transformer sa propre limite en reproche serait le pire
 * des deux mondes.
 */
export function pariteEnEcart(ecarts) {
  return Boolean(ecarts.interfaceAbsente)
    || Boolean(ecarts.fonctionAbsente)
    || ecarts.manquantes.length > 0
    || ecarts.typesIncorrects.length > 0
    || (ecarts.valeursNonImplementees ?? []).length > 0
    || ecarts.booleensNonUtilises.length > 0
    || (ecarts.enumsSansEffet ?? []).length > 0
    || ecarts.compositionsIncorrectes.length > 0;
}

/** Vrai si une implémentation existante porte un écart contrat ↔ code. */
export function aUnEcartDeParite(bilan) {
  return pariteEnEcart(bilan.parite);
}

/**
 * Avertit qu'une implémentation s'écarte du contrat qu'elle devrait suivre.
 *
 * **Avertissement, jamais blocage**, à la règle écrite plus haut : réexporter
 * depuis Figma n'y changerait rien, et une implémentation régénérée à froid est
 * attendue en écart tant que la mesure n'a pas été refaite.
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
    ...parite.manquantes.map(
      (nom) => `La propriété \`${nom}\` de Figma n'existe pas dans le code : le composant ne peut pas la recevoir.`,
    ),
    ...parite.typesIncorrects.map(
      ({ prop, recu }) =>
        `La propriété \`${prop}\` vaut oui ou non dans Figma, et le code attend \`${recu}\`.`,
    ),
    ...(parite.valeursNonImplementees ?? []).flatMap(({ valeurs }) => valeurs.map(
      (valeur) => `La variante \`${valeur}\` n'est pas implémentée dans le code.`,
    )),
    ...parite.booleensNonUtilises.map(
      (nom) => `La propriété \`${nom}\` de Figma n'a aucun effet dans le code : l'activer ou non ne change rien à l'affichage.`,
    ),
    ...(parite.enumsSansEffet ?? []).map(({ prop, valeurs }) => (
      `La propriété \`${prop}\` de Figma n'a aucun effet dans le code : ${consequenceSansEffet(valeurs)}.`
    )),
    // Le comptage ne suit pas une boucle. Dire cette limite dans le message
    // même évite qu'un écart attendu se lise comme une faute, et évite surtout
    // le mécanisme d'exception qu'il aurait fallu pour le taire.
    ...parite.compositionsIncorrectes.map(
      ({ component, attendu, rendu }) =>
        `Le contrat déclare ${libelleNombre(attendu, "occurrence")} de \`${component}\`, mais le composant en rend ${rendu}. `
        + `Le comptage est statique ; si les occurrences viennent d'une boucle, cet écart est attendu.`,
    ),
  ];
}

/** Énumère en français : « `a`, `b` et `c` ». */
function listeDeValeurs(valeurs) {
  const citees = valeurs.map((valeur) => `\`${valeur}\``);
  return citees.length < 2
    ? citees.join("")
    : `${citees.slice(0, -1).join(", ")} et ${citees[citees.length - 1]}`;
}

/**
 * Ce que le designer verra, plutôt que le mécanisme. Un axe à une seule valeur
 * n'a rien à comparer : la phrase change au lieu de boiter.
 */
function consequenceSansEffet(valeurs) {
  return valeurs.length < 2
    ? "sa valeur ne change rien à l'affichage"
    : `${listeDeValeurs(valeurs)} s'affichent de la même façon`;
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
