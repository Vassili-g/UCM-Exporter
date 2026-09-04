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

import { CONFIGURATION_PAR_DEFAUT, NOM_CONFIGURATION } from "@ucm-kit/core/format";

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
    {
      chemin: ".gitignore",
      contenu: [
        "# Le rapport écrit par `ucm check --report` : il se régénère à chaque",
        "# exécution et ne décrit que celle-là. Commité, il ferait lire un verdict",
        "# périmé à qui ouvre le fichier.",
        "ci-report.md",
        "",
      ].join("\n"),
      pourquoi: "le rapport régénéré à chaque exécution ne se commite pas",
    },
    {
      chemin: ".github/workflows/ucm.yml",
      contenu: workflow(version),
      pourquoi: "la CI contrôle les contrats et publie le rapport sur la pull request",
    },
  ];
}

/**
 * Le workflow de contrôle, écrit pour un repository quelconque.
 *
 * **Il n'installe rien et n'exige aucun `package.json`** : `npx --yes` avec un
 * pin EXACT (D7) suffit, et c'est ce qui permet à un repo qui n'est pas un
 * projet Node — un repo iOS, un dossier de contrats et rien d'autre — de faire
 * contrôler ses exports. Le seul prérequis est Node sur le runner, que
 * `setup-node` fournit.
 *
 * **Le sha de base passe par l'environnement, jamais par interpolation dans le
 * shell.** `${{ }}` écrit sa valeur DANS le script avant qu'il ne s'exécute ;
 * la règle vaut même quand la valeur vient de GitHub et pas d'un humain,
 * puisque c'est l'habitude qui protège, pas le cas particulier.
 *
 * **Un filet, et un seul, parce que l'autre n'est pas portable (T5.4).** Le
 * repository de démonstration en porte deux : « la construction a échoué » et
 * « le rapport manque ». Le premier décrit SA chaîne de construction et n'a
 * aucun sens ici — un repo Swift ne compile pas du TypeScript. Le second est
 * universel : une pull request refusée sans un mot laisse le designer sans
 * recours, et c'est le seul cas où personne ne peut plus rien lui dire.
 */
function workflow(version) {
  const commande = `npx --yes @ucm-kit/cli@${version} check --report ci-report.md`;
  return [
    "# Contrôle des contrats UCM.",
    "#",
    "# Le rapport publié sur la pull request est le SEUL message que reçoit le",
    "# designer qui valide un export : il n'ouvre pas les logs de la CI. Toute",
    "# étape qui refuse une fusion doit donc lui laisser un message.",
    "#",
    "# Écrit par `ucm init`. Adaptez-le : il ne sera jamais réécrit par-dessus.",
    "name: ucm",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "",
    "# Nécessaire pour publier le diagnostic en commentaire de pull request.",
    "permissions:",
    "  contents: read",
    "  pull-requests: write",
    "",
    "jobs:",
    "  contrats:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      # Le job exécute le code de la pull request : il n'a aucune raison de",
    "      # garder un jeton git utilisable. Le commentaire passe par GITHUB_TOKEN.",
    "      - uses: actions/checkout@v4",
    "        with:",
    "          persist-credentials: false",
    "          # Le diff avec la base délimite les états informatifs du rapport.",
    "          fetch-depth: 0",
    "",
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 22",
    "",
    "      - name: Contrôler les contrats",
    "        env:",
    "          BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "        run: |",
    '          if [ -n "$BASE_SHA" ]; then',
    `            ${commande} --base "$BASE_SHA"`,
    "          else",
    `            ${commande}`,
    "          fi",
    "",
    "      # Le rapport dans le résumé du run : lisible sans dérouler un log.",
    "      - name: Publier le rapport dans le résumé du run",
    "        if: always() && hashFiles('ci-report.md') != ''",
    '        run: cat ci-report.md >> "$GITHUB_STEP_SUMMARY"',
    "",
    "      # Filet : si le rapport manque, c'est que la CI s'est arrêtée avant le",
    "      # contrôle (checkout, installation, plantage). Une pull request refusée",
    "      # sans un mot laisse le designer sans recours ; ce message minimal nomme",
    "      # au moins l'endroit où regarder.",
    "      - name: Garantir un diagnostic même sans rapport",
    "        if: always() && github.event_name == 'pull_request' && hashFiles('ci-report.md') == ''",
    "        env:",
    "          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
    "        run: |",
    "          cat > ci-report.md <<EOF",
    "          ## ❌ La vérification n'a pas pu rendre son diagnostic",
    "",
    "          Les contrôles se sont arrêtés avant d'avoir pu analyser cet export : le rapport habituel n'a pas été produit. **Votre design n'est pas en cause** et ré-exporter depuis Figma n'y changerait rien.",
    "",
    "          **Action attendue :** un développeur doit ouvrir [l'exécution de la CI]($RUN_URL) pour en connaître la raison.",
    "          EOF",
    "",
    "      # `always()` car l'essentiel est justement de commenter les échecs.",
    "      - name: Publier le diagnostic sur la pull request",
    "        if: always() && github.event_name == 'pull_request' && hashFiles('ci-report.md') != ''",
    "        env:",
    "          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}",
    "          NUMERO: ${{ github.event.number }}",
    "        # --edit-last met à jour le commentaire précédent au lieu d'en empiler",
    "        # un nouveau à chaque push ; s'il n'en existe pas encore, on en crée un.",
    "        run: |",
    '          gh pr comment "$NUMERO" --body-file ci-report.md --edit-last \\',
    '            || gh pr comment "$NUMERO" --body-file ci-report.md',
    "",
  ].join("\n");
}

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
        + "Placez vos contrats sous `components/`, vos tokens dans `tokens.json`, "
        + "puis lancez `ucm check`.",
  );
  // Un `.gitignore` existant n'est pas réécrit, et la ligne qui manque doit
  // quand même être dite : sans elle, un `ucm check --report` local laisse un
  // rapport versionnable dans la copie de travail, qui se lira plus tard comme
  // un verdict frais.
  if (conserves.includes(".gitignore")) {
    lignes.push("");
    lignes.push(
      "· `.gitignore` existait déjà : ajoutez-y `ci-report.md`, le rapport que "
        + "`ucm check --report` régénère à chaque exécution.",
    );
  }
  return lignes.join("\n");
}
