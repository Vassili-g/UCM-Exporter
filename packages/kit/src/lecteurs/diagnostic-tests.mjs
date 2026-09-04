/**
 * Ce que le designer doit lire d'une suite de tests en échec.
 *
 * **Ce module ne lance rien et n'analyse aucune sortie de lanceur.** C'est la
 * moitié RAPPORT de ce qui vivait chez le consommateur ; l'autre moitié — lire
 * du TAP, reconnaître un `*.test.tsx`, distinguer une `AssertionError` d'une
 * erreur d'exécution — est un ADAPTATEUR et reste là-bas. La coupure est
 * exactement celle que T2.3 a faite pour la parité, et pour la même raison :
 * un repo Swift a des tests, ils échouent de la même façon aux yeux du
 * designer, et rien de ce qui suit ne dépend du langage.
 *
 * Les tests pilotés par le contrat sont un garde-fou au même titre que les
 * contrôles de contrat. Une assertion rouge peut signaler une donnée du contrat
 * figée dans le code ; une erreur d'exécution dit seulement que le test n'a pas
 * pu rendre ce verdict. Les deux doivent atteindre le **même** lecteur, avec
 * des formulations distinctes.
 *
 * ## Ce que l'adaptateur doit fournir
 *
 * Un échec est `{ fichier, composant, assertion, test, nomErreur, erreur }` :
 *
 * - `fichier` — chemin d'affichage, jamais interprété ici ;
 * - `composant` — le composant exporté que ce test met en cause, ou `null` si
 *   l'échec concerne l'outillage du repository. **Seul l'adaptateur peut
 *   répondre** : la convention qui relie un fichier de test à un composant est
 *   celle d'une stack ;
 * - `assertion` — `true` si le test a rendu un verdict (le code s'écarte du
 *   contrat), `false` s'il s'est interrompu avant de pouvoir le rendre. **Seul
 *   l'adaptateur peut répondre** : reconnaître une assertion demande de
 *   connaître les erreurs de son lanceur ;
 * - `test`, `nomErreur`, `erreur` — le détail, affiché tel quel.
 */
import { TITRE_AVERTISSEMENTS } from "./avertissements-export.mjs";
import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";

/**
 * Sépare ce qui concerne un composant exporté de ce qui concerne l'outillage.
 *
 * Le propriétaire du constat n'est pas le même : une assertion d'un test de
 * rendu compare le code au contrat, une erreur dans ce test empêche la
 * comparaison, et l'échec d'un test d'outillage concerne le repository.
 *
 * Le tri ne lit plus que les deux réponses de l'adaptateur : il ne reste ici
 * aucune convention de nom de fichier ni aucun nom d'erreur.
 */
export function repartirEchecs(echecs) {
  return {
    rendu: echecs.filter(({ composant, assertion }) => composant != null && assertion),
    testsComposants: echecs.filter(({ composant, assertion }) => composant != null && !assertion),
    gardeFous: echecs.filter(({ composant }) => composant == null),
  };
}

/** Écart de rendu présenté par composant, sans chemin technique. */
function detailEchecRendu({ composant, test }) {
  return `**${composant}** : ${test}`;
}

/** Erreur technique présentée par composant. */
function detailErreurTest({ composant, test, nomErreur, erreur }) {
  const detail = nomErreur ? `${nomErreur}${erreur ? ` : ${erreur}` : ""}` : "erreur inconnue";
  return `**${composant}** : ${test}. ${detail}`;
}

/**
 * Section du rapport de pull request pour les tests en échec.
 *
 * Le designer lit d'abord un verdict, puis le détail technique nommé par
 * composant, pour le développeur qui reprendra le code dans la même pull
 * request.
 *
 * Ce verdict affirmait « votre export est valide, ré-exporter n'y changera
 * rien ». C'est vrai tant que l'export a tout décrit — et faux sinon : une
 * propriété qu'il n'a pas pu décrire disparaît du contrat, les tests qui la
 * relisent échouent, et c'est bien un ré-export qui débloquera. Disculper
 * Figma est un constat que ce module ne peut pas produire seul ; il lui faut
 * `avertissements`, que l'export a écrits.
 *
 * Trois états, pas deux : une liste vide dit « l'export n'a rien signalé »,
 * et `null` dit « on n'a pas pu le vérifier » — c'est le cas des sorties
 * anticipées, qui publient avant d'avoir lu le moindre contrat. Les confondre
 * ferait disculper Figma sans l'avoir consulté.
 */
export function diagnosticEchecsDeTests({ echoue, echecs }, avertissements = null) {
  if (!echoue) return [];
  if (echecs.length === 0) {
    return rendreDiagnostic({
      severity: "error",
      title: "Les tests n'ont pas terminé",
      summary: "La suite s'est arrêtée avant de produire un résultat exploitable.",
      action: "Un développeur doit consulter les logs de la CI et corriger l'exécution des tests.",
      status: "La fusion reste bloquée.",
    });
  }

  const { rendu, testsComposants, gardeFous } = repartirEchecs(echecs);
  const lignes = [];

  if (rendu.length > 0) {
    const composants = [...new Set(rendu.map(({ composant }) => composant))];
    const action = avertissements === null
      ? "Un développeur doit déterminer si l'écart vient d'une information absente du contrat ou du code, puis corriger la source concernée."
      : avertissements.length > 0
        ? [
          `Vérifiez les ${libelleNombre(avertissements.length, "avertissement")} dans la section « ${TITRE_AVERTISSEMENTS} ».`,
          "Si un avertissement concerne le même composant et la même propriété, corrigez ce point dans Figma puis réexportez. Sinon, un développeur doit mettre à jour le composant.",
        ]
        : [
          "Un développeur doit mettre à jour les composants concernés dans cette pull request.",
          "Réexporter depuis Figma ne corrigera pas ces écarts.",
        ];

    lignes.push(...rendreDiagnostic({
      severity: "error",
      title: "Le code n'est plus conforme aux contrats",
      count: composants.length,
      itemSingular: "composant",
      summary: "Les tests de conformité entre composants et contrats échouent pour :",
      items: composants,
      detailsTitle: "Écarts détectés",
      details: rendu.map(detailEchecRendu),
      action,
      status: "La fusion reste bloquée.",
    }));
  }

  if (testsComposants.length > 0) {
    const composants = [...new Set(testsComposants.map(({ composant }) => composant))];
    lignes.push(...rendreDiagnostic({
      severity: "error",
      title: "Les tests n'ont pas pu vérifier la conformité",
      count: composants.length,
      itemSingular: "composant",
      summary: "Les tests se sont arrêtés avant de comparer le rendu aux contrats pour :",
      items: composants,
      detailsTitle: "Erreurs détectées",
      details: testsComposants.map(detailErreurTest),
      action: "Un développeur doit vérifier la lecture du contrat, puis corriger le test ou le code qui provoque l'erreur.",
      status: "La fusion reste bloquée tant que ces tests ne produisent pas de résultat.",
    }));
  }

  if (gardeFous.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "error",
      title: gardeFous.length === 1
        ? "Un garde-fou du repository est en échec"
        : "Des garde-fous du repository sont en échec",
      count: gardeFous.length,
      itemSingular: "test",
      summary: "Ces tests contrôlent l'outillage du repository, pas l'export Figma.",
      detailsTitle: "Tests en échec",
      details: gardeFous.map(({ fichier, test }) => `\`${fichier ?? "?"}\` : ${test}`),
      action: "Un développeur du repository doit corriger ces contrôles.",
      status: "La fusion reste bloquée.",
    }));
  }

  return lignes;
}

/** Même constat, pour le terminal du développeur. */
export function resumeTerminalEchecsDeTests({ echoue, echecs }) {
  if (!echoue) return [];
  if (echecs.length === 0) {
    return ["✗ La suite de tests n'a pas terminé. Consultez la sortie ci-dessus."];
  }
  const { rendu, testsComposants } = repartirEchecs(echecs);
  const lignes = [
    ...echecs.map(({ fichier, test }) => `✗ ${fichier ?? "?"} : ${test}`),
    `\n✗ ${libelleNombre(echecs.length, "test")} en échec.`,
  ];
  if (rendu.length > 0) {
    lignes.push("  Assertions de rendu en échec : le composant et le contrat ne correspondent plus.");
  }
  if (testsComposants.length > 0) {
    lignes.push("  Tests interrompus par une erreur : vérifier d'abord leur lecture du contrat avant de conclure sur le rendu.");
  }
  return lignes;
}
