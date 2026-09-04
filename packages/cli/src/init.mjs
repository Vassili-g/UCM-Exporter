/**
 * `ucm init` : ce qu'un repository doit avoir pour recevoir des contrats.
 *
 * Le critère de réussite n° 1 dit « moins de 15 minutes, zéro ligne à la main ».
 * Cette commande est ce qui rend ce zéro possible, et sa seule difficulté est
 * de savoir ce qu'elle a le droit d'écrire.
 *
 * **Elle n'écrase JAMAIS un fichier existant.** Un `init` lancé deux fois, ou
 * lancé dans un repo déjà installé, doit être sans effet et le dire — pas
 * remplacer un workflow que quelqu'un a adapté. Écraser serait la seule faute
 * irréversible que cette commande puisse commettre, et elle la commettrait au
 * moment où l'utilisateur a le moins de raisons de s'en méfier.
 *
 * **Elle n'écrit aucun numéro de version**, nulle part : ni dans la
 * configuration (voir `configuration.mjs` du kit), ni dans le workflow, qui
 * épingle le paquet et laisse le paquet dire ce qu'il lit.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { CONFIGURATION_PAR_DEFAUT, NOM_CONFIGURATION } from "@ucm-kit/core/lecteurs";

/** La version de `@ucm-kit/cli`, lue dans son propre `package.json`. */
function versionDuPaquet() {
  const chemin = new URL("../package.json", import.meta.url);
  return JSON.parse(readFileSync(chemin, "utf8")).version;
}

/**
 * Le pin est EXACT, sans `^` ni `~`, et c'est D7.
 *
 * Une plage laisserait npm choisir une version que personne n'a essayée, et le
 * jour où elle changerait de verdict, la CI d'un designer basculerait sans
 * qu'aucun fichier du repo n'ait bougé. Un chiffre qu'on lit dans le dépôt est
 * ce qui rend un rapport explicable.
 */
function fichiers(version) {
  return [
    {
      chemin: NOM_CONFIGURATION,
      contenu: `${JSON.stringify(
        // Pas de `$schema` : aucun schéma de configuration n'est publié
        // aujourd'hui, et pointer vers une URL qui rend 404 apprendrait à
        // l'éditeur — et à qui lit le fichier — à ignorer cette ligne.
        { ...CONFIGURATION_PAR_DEFAUT },
        null,
        2,
      )}\n`,
      pourquoi: "où sont les contrats, les tokens et les implémentations",
    },
    {
      chemin: ".gitattributes",
      contenu: [
        "# Les contrats et les tokens sont produits par l'export et relus dans une",
        "# pull request. En CRLF, chaque réexport depuis une machine Windows rendrait",
        "# un diff entier là où deux lignes ont changé, et la revue deviendrait",
        "# impossible à faire. Ce n'est pas une exigence des tests : ceux du kit",
        "# comparent le JSON analysé, pas les octets.",
        "*.contract.json text eol=lf",
        "tokens.json text eol=lf",
        "",
      ].join("\n"),
      pourquoi: "un diff lisible quand l'export vient d'une machine Windows",
    },
    {
      chemin: ".vscode/settings.json",
      contenu: `${JSON.stringify(
        {
          "json.schemas": [
            {
              fileMatch: ["*.contract.json"],
              // Le paquet INSTALLÉ, jamais une copie locale : une copie
              // vieillirait sans que rien ne le dise, et l'éditeur validerait
              // alors contre un format que le repo ne lit plus.
              url: "./node_modules/@ucm-kit/core/schema/ucm-contract.schema.json",
            },
          ],
        },
        null,
        2,
      )}\n`,
      pourquoi: "l'éditeur valide un contrat contre le schéma du paquet installé",
    },
  ];
}

/**
 * Le workflow n'est PAS écrit, et l'absence est délibérée.
 *
 * T3.2 le demande, et il attendra T3.3. Un workflow qui appelle `ucm check`
 * alors que la commande n'existe pas installe une CI rouge dans un repo neuf,
 * au moment exact où son propriétaire n'a aucun moyen de savoir si la faute
 * vient de lui. Une installation incomplète qui le dit vaut mieux qu'une
 * installation complète qui ment.
 *
 * *Et l'ordre du plan a un trou, mesuré ici :* `ucm check` (T3.3) a besoin de
 * l'orchestration que porte `check-contract.mjs`, laquelle vit chez le
 * consommateur et ne rejoint le kit qu'en T5.2 — Phase 5, que l'ordre
 * d'exécution place APRÈS la Phase 3. Écrire une seconde orchestration ici
 * créerait deux rapports qui divergent, c'est-à-dire exactement la maladie que
 * T2.7, T6.0 et T2.6 ont soignée ailleurs. Le trou est enregistré dans le plan
 * plutôt que contourné.
 */

/**
 * Écrit ce qui manque, et rend le compte rendu de ce qui a été fait.
 *
 * Rien n'est écrit avant que tout soit décidé : un `init` interrompu à
 * mi-chemin laisserait un repo à moitié installé, état que rien ne sait
 * diagnostiquer ensuite.
 */
export function init(racine, { ecrire = writeFileSync } = {}) {
  const version = versionDuPaquet();
  const aEcrire = [];
  const deja = [];

  for (const fichier of fichiers(version)) {
    const cible = join(racine, fichier.chemin);
    if (existsSync(cible)) deja.push(fichier);
    else aEcrire.push({ ...fichier, cible });
  }

  for (const fichier of aEcrire) {
    mkdirSync(dirname(fichier.cible), { recursive: true });
    ecrire(fichier.cible, fichier.contenu, "utf8");
  }

  return { ecrits: aEcrire.map((f) => f.chemin), conserves: deja.map((f) => f.chemin), version };
}

/** Le compte rendu terminal, qui dit toujours ce qu'il n'a PAS touché. */
export function rendreInit({ ecrits, conserves, version }) {
  const lignes = [];
  for (const chemin of ecrits) lignes.push(`✓ ${chemin}`);
  for (const chemin of conserves) lignes.push(`· ${chemin} existait déjà, laissé tel quel`);
  lignes.push("");
  lignes.push(
    ecrits.length === 0
      ? "Rien à faire : ce repository est déjà installé."
      : `Installé avec @ucm-kit/cli ${version}.\n`
        + "Le workflow de CI n'est pas encore écrit : `ucm check` n'existe pas (T3.3), "
        + "et un workflow qui l'appellerait installerait une CI rouge.",
  );
  return lignes.join("\n");
}
