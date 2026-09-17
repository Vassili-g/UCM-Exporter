/**
 * `ucm init` : ce qu'un repository doit avoir pour recevoir des contrats.
 *
 * Elle existe pour qu'un repository n'ait aucune ligne à écrire à la main, et
 * sa seule difficulté est de savoir ce qu'elle a le droit d'écrire.
 *
 * **Elle n'écrase jamais un fichier existant.** Un `init` lancé deux fois, ou
 * lancé dans un repo déjà installé, est sans effet et le dit : écraser un
 * workflow que quelqu'un a adapté serait la seule faute irréversible que cette
 * commande puisse commettre.
 *
 * **Elle n'écrit aucune version du format**, nulle part : la configuration
 * n'en porte aucune (voir `configuration.mjs` du kit), et le paquet installé
 * dit ce qu'il lit. Le seul numéro écrit est le pin de la CLI, dans le workflow
 * et dans les deux relais d'agent.
 *
 * **`--components`, `--tokens` et `--implementation` décident une seule fois.** Le
 * `ucm.config.json` écrit ici est la seule autorité sur l'endroit où les
 * exports atterrissent : le plugin Figma le lit, et `ucm check` le lit. Un
 * repository qui range ailleurs que sous `components/` le dit donc à
 * l'installation, au lieu de le corriger après un premier export déposé où
 * personne ne le cherche. Un repository qui n'écrit pas de React dit de même
 * comment nommer ses fichiers d'implémentation, au lieu de porter un `.tsx`
 * faux dès le jour de son installation.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CONFIGURATION_PAR_DEFAUT,
  MOTIF_IMPLEMENTATION_PAR_DEFAUT,
  NOM_CONFIGURATION,
  estCheminDuRepository,
} from "@ucm-kit/core/format";
import { lireConfiguration } from "@ucm-kit/core/lecteurs";

import { NOM_ADAPTATEUR_TYPESCRIPT } from "./adaptateur.mjs";
import { CHEMIN_CONVENTIONS } from "./conventions.mjs";

/** Les options qui reçoivent un dossier, et la clé que chacune décide. */
const OPTIONS_DE_DOSSIER = { "--components": "components", "--tokens": "tokens" };

/**
 * Le nom du fichier de tokens, lu dans le défaut du kit plutôt que réécrit ici.
 *
 * Les deux options attendent un dossier, parce que c'est ce qu'un repository
 * range. Le champ `tokens` de la configuration, lui, reste un chemin de
 * fichier : le kit le lit ainsi, et changer sa nature ferait pointer toute
 * configuration déjà écrite vers `tokens.json/tokens.json`, sans un mot.
 */
const NOM_FICHIER_TOKENS = CONFIGURATION_PAR_DEFAUT.tokens.split("/").pop();

/**
 * Le chemin tapé, écrit comme la grammaire du kit l'accepte, ou `null`.
 *
 * Le clavier tolère `\` et des barres obliques de bord ; le fichier écrit n'en
 * garde aucune, et la grammaire décide du reste.
 */
function cheminAcceptable(valeur) {
  const normalise = valeur.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return estCheminDuRepository(normalise) ? normalise : null;
}

/**
 * Lit les arguments d'`ucm init`.
 *
 * `--components` et `--tokens` attendent un dossier ; `--tokens` y ajoute le nom
 * du fichier avant de l'écrire, la configuration gardant un chemin de fichier.
 * `--implementation` reçoit un motif, et non un dossier.
 *
 * Même forme que `lireArguments` de `check.mjs`, y compris le refus d'une
 * valeur qui commence par `--` : sans lui, `--components --tokens x` prendrait
 * « --tokens » pour un dossier et écrirait une configuration que personne n'a
 * demandée. Un argument inconnu est refusé au lieu d'être ignoré, faute de quoi
 * `ucm init --composants src` sortirait en 0 sans avoir rien fait de ce qui
 * était demandé.
 */
export function lireArgumentsInit(arguments_) {
  const chemins = {};
  let sansAgents = false;
  let forge;

  for (let i = 0; i < arguments_.length; i += 1) {
    const argument = arguments_[i];
    if (argument === "--sans-agents") {
      sansAgents = true;
      continue;
    }
    if (argument === "--forge") {
      const valeur = arguments_[i + 1];
      if (!FORGES.includes(valeur)) {
        return { erreur: `--forge attend github ou gitlab${valeur === undefined ? "." : ` : ${valeur} n'en est pas une.`}` };
      }
      forge = valeur;
      i += 1;
      continue;
    }
    const cle = OPTIONS_DE_DOSSIER[argument];
    if (!cle && argument !== "--implementation") {
      return { erreur: `Argument inconnu : ${argument}` };
    }

    const valeur = arguments_[i + 1];
    if (valeur === undefined || valeur.startsWith("--")) {
      return { erreur: `${argument} attend une valeur.` };
    }
    i += 1;

    const resolu = cheminAcceptable(valeur);
    if (!resolu) {
      const attendu = cle ? "un dossier relatif" : "un motif relatif";
      return {
        erreur: `${argument} attend ${attendu} au repository, sans « .. » : ${valeur} n'en est pas un.`,
      };
    }

    if (!cle) {
      // Sans `{id}`, tous les contrats désigneraient le même fichier, et le
      // rapport dirait « implémentation absente » pour tous sauf un.
      if (!resolu.includes("{id}")) {
        return {
          erreur: `--implementation attend un motif contenant {id}, par exemple `
            + `"${MOTIF_IMPLEMENTATION_PAR_DEFAUT}" : ${valeur} n'en est pas un.`,
        };
      }
      chemins.implementation = resolu;
      continue;
    }

    chemins[cle] = cle === "tokens" ? `${resolu}/${NOM_FICHIER_TOKENS}` : resolu;
  }

  return { chemins, sansAgents, forge };
}

const FORGES = ["github", "gitlab"];

/** Le fichier qu'`init` écrit pour GitLab, et que `.gitlab-ci.yml` inclut. */
export const CHEMIN_CI_GITLAB = ".gitlab/ucm.gitlab-ci.yml";

/** L'URL du remote `origin`, ou `null` sans git ni remote. */
function remoteOrigin(racine) {
  try {
    return execFileSync("git", ["remote", "get-url", "origin"], { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** L'hôte d'une URL de remote, en HTTPS, SSH ou forme `git@hôte:chemin`. */
function hoteDuRemote(url) {
  return /^(?:[a-z][a-z+]*:\/\/)?(?:[^@/]+@)?([^/:]+)/i.exec(url)?.[1]?.toLowerCase() ?? null;
}

/**
 * La forge dont `init` écrit la CI, et le signal qui l'a désignée.
 *
 * Ordre : l'option, l'hôte du remote `origin`, la présence de `.gitlab-ci.yml`,
 * puis GitHub. Le compte rendu nomme le signal : une forge devinée en silence
 * écrirait une CI que la forge réelle ne lance jamais, et rien ne le dirait.
 * Un hôte qui commence par `gitlab.` désigne une instance GitLab
 * auto-hébergée, que le fichier écrit sait joindre par `CI_API_V4_URL`.
 */
export function forgeDuRepository(racine, { forge, git = remoteOrigin } = {}) {
  if (forge) return { nom: forge, signal: "l'option --forge" };
  const url = git(racine);
  const hote = url ? hoteDuRemote(url) : null;
  if (hote === "github.com") return { nom: "github", signal: `l'hôte du remote origin, ${hote}` };
  if (hote === "gitlab.com" || hote?.startsWith("gitlab.")) return { nom: "gitlab", signal: `l'hôte du remote origin, ${hote}` };
  if (existsSync(join(racine, ".gitlab-ci.yml"))) return { nom: "gitlab", signal: "la présence de .gitlab-ci.yml" };
  return { nom: "github", signal: "aucun signal, GitHub par défaut" };
}

/** La version de `@ucm-kit/cli`, lue dans son propre `package.json`. */
function versionDuPaquet() {
  const chemin = new URL("../package.json", import.meta.url);
  return JSON.parse(readFileSync(chemin, "utf8")).version;
}

/**
 * Le pin est exact, sans `^` ni `~`.
 *
 * Une plage laisserait npm choisir une version que personne n'a essayée, et la
 * CI d'un designer basculerait sans qu'aucun fichier du repo n'ait bougé. Un
 * chiffre qu'on lit dans le dépôt est ce qui rend un rapport explicable.
 *
 * `rappel` porte la ligne à ajouter à la main quand le fichier existe déjà.
 * Trois des cinq fichiers se partagent avec ce que le repository y met déjà, et
 * les laisser tels quels sans un mot laisserait survenir en silence la panne
 * que le fichier écrit existe pour empêcher. Les deux autres n'ont rien à
 * rappeler.
 *
 * `marqueurs` dit à quoi se reconnaît un fichier qui porte déjà la règle. Tous
 * présents, le rappel se tait : trois lignes réclamées pour rien sont trois
 * lignes qu'on apprend à sauter.
 */
function fichiers(version, chemins, { agents = true, gabarits = [], forge = "github" } = {}) {
  return [
    {
      chemin: NOM_CONFIGURATION,
      contenu: `${JSON.stringify(
        // Pas de `$schema` : aucun schéma de configuration n'est publié
        // aujourd'hui, et pointer vers une URL qui rend 404 apprendrait à
        // l'éditeur — et à qui lit le fichier — à ignorer cette ligne.
        { ...CONFIGURATION_PAR_DEFAUT, ...chemins },
        null,
        2,
      )}\n`,
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
      marqueurs: ["*.contract.json", "tokens.json", "eol=lf"],
      rappel: "ajoutez-y `*.contract.json text eol=lf` et `tokens.json text eol=lf`. Sans ces deux lignes, un export depuis une machine Windows rend un diff entier à chaque fois et la revue devient impossible à faire.",
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
      marqueurs: ["ucm-contract.schema.json"],
      rappel: "ajoutez-y l'association de `*.contract.json` vers `./node_modules/@ucm-kit/core/schema/ucm-contract.schema.json`. Sans elle, l'éditeur ne valide aucun contrat et une faute de forme n'apparaît qu'en CI.",
    },
    {
      chemin: ".gitignore",
      contenu: [
        "# Le rapport de `ucm check --report`, réécrit à chaque exécution.",
        "# Commité, il montrerait le verdict d'un contrôle passé, pas celui du",
        "# code en cours.",
        "ci-report.md",
        "",
      ].join("\n"),
      marqueurs: ["ci-report.md"],
      rappel: "ajoutez-y `ci-report.md`. `ucm check --report` le réécrit à chaque exécution ; commité, il montrerait le verdict d'un contrôle passé, pas celui du code en cours.",
    },
    ...(forge === "gitlab"
      ? [
        { chemin: CHEMIN_CI_GITLAB, contenu: workflowGitlab(version) },
        {
          chemin: ".gitlab-ci.yml",
          contenu: `include:\n  - local: ${CHEMIN_CI_GITLAB}\n`,
          marqueurs: [CHEMIN_CI_GITLAB],
          rappel: `ajoutez \`- local: ${CHEMIN_CI_GITLAB}\` à sa liste \`include:\`. Sans cette ligne, le job ucm ne tourne jamais et aucune merge request n'est contrôlée.`,
        },
      ]
      : [{ chemin: ".github/workflows/ucm.yml", contenu: workflow(version) }]),
    ...(agents
      ? [
        { chemin: ".agents/skills/ucm-implementer/SKILL.md", contenu: relais(version) },
        { chemin: ".claude/skills/ucm-implementer/SKILL.md", contenu: relais(version) },
        { chemin: CHEMIN_CONVENTIONS.split("\\").join("/"), contenu: CONVENTIONS },
        ...gabarits,
      ]
      : []),
  ];
}

/**
 * Le relais qu'un agent découvre dans `.agents/skills` ou `.claude/skills`. Il
 * épingle la CLI et renvoie à `ucm guide`, qui imprime la procédure et les
 * aides du contrat : le relais ne recopie aucune règle.
 */
function relais(version) {
  return [
    "---",
    "name: ucm-implementer",
    "description: Implémenter ou modifier un composant décrit par un fichier *.contract.json. Charger avant d'écrire le code du composant.",
    "---",
    "",
    `Lancer \`npx --yes @ucm-kit/cli@${version} guide <chemin du contrat>\`, puis suivre sa sortie.`,
    "",
  ].join("\n");
}

/** Le fichier de conventions : sa marche à suivre et son exemple, en commentaire que la lecture retire. */
const CONVENTIONS = [
  "<!-- ucm : marche à suivre, retirée à la lecture.",
  "",
  "Le texte avant la première section décrit la stack, l'architecture et le",
  "gabarit ou le composant de référence du repository.",
  "",
  "Une section « ## <aide> » remplace l'écriture par défaut de cette aide, ou",
  "répond à un ancrage. `ucm aides` liste les aides ; `ucm aides <aide>",
  "--personnaliser` ajoute la section, à éditer.",
  "",
  "Une ligne « Contrôle : `commande` » ajoute la commande à la preuve de l'aide.",
  "",
  "« ecritures-par-defaut: non » en première ligne retire les écritures par",
  "défaut, pour un repository qui n'écrit pas de CSS.",
  "",
  "Exemple :",
  "",
  "Stack : React 19 et CSS Modules. Un composant par dossier, tests à côté.",
  "Gabarit : `.ucm/gabarits/composant.tsx`.",
  "",
  "## contour-ring",
  "",
  "Classe `ring` de `src/styles/contours.module.css`.",
  "",
  "Contrôle : `npm run lint:css`",
  "-->",
  "",
].join("\n");

/**
 * Les gabarits qu'un adaptateur publie, à copier dans `.ucm/gabarits/`. Rend
 * `erreur` quand le dossier annoncé ne se lit pas.
 */
function gabaritsDe(adaptateur) {
  const dossier = adaptateur?.cheminGabarits;
  if (typeof dossier !== "string") return { gabarits: [], erreur: null };
  try {
    const gabarits = readdirSync(dossier, { withFileTypes: true })
      .filter((entree) => entree.isFile())
      .map(({ name }) => ({ chemin: `.ucm/gabarits/${name}`, contenu: readFileSync(join(dossier, name), "utf8") }));
    return { gabarits, erreur: null };
  } catch (erreur) {
    return { gabarits: [], erreur: `ses gabarits ne se lisent pas (${erreur?.code ?? erreur?.message ?? erreur})` };
  }
}

/**
 * Les lignes qu'`init` n'écrit pas, parce qu'elles vivent dans un fichier que
 * le repository possède, chacune avec son fichier. Une ligne déjà présente ne
 * se réclame pas.
 */
function lignesRestantes(racine, version, configuration) {
  const lignes = [];
  let manifeste = null;
  try {
    manifeste = JSON.parse(readFileSync(join(racine, "package.json"), "utf8"));
  } catch {
    // Un repository sans package.json lisible ne génère pas la feuille des tokens par npm.
  }
  if (manifeste !== null) {
    const epingle = manifeste.devDependencies?.["@ucm-kit/cli"] ?? manifeste.dependencies?.["@ucm-kit/cli"];
    // Une archive, un lien ou un espace de travail installent la CLI sans numéro à comparer.
    if (epingle === undefined || (epingle !== version && !/^[a-z][a-z+]*:/i.test(epingle))) {
      lignes.push({ fichier: "package.json", ligne: `ajoutez \`"@ucm-kit/cli": "${version}"\` aux devDependencies.` });
    }
    const scripts = Object.values(manifeste.scripts ?? {}).join("\n");
    if (!scripts.includes("ucm tokens css")) {
      lignes.push({
        fichier: "package.json",
        ligne: "lancez `ucm tokens css --out src/generated/tokens.css` en tête des scripts dev et build, à la place de tout autre générateur de la même feuille.",
      });
      lignes.push({ fichier: "l'entrée CSS de l'application", ligne: "importez la feuille générée, `src/generated/tokens.css`." });
    }
  }
  if (configuration && configuration.modes === undefined) {
    try {
      const axes = JSON.parse(readFileSync(join(racine, configuration.tokens), "utf8"))?.$extensions?.["com.ucm.axes"];
      if (axes && typeof axes === "object" && Object.keys(axes).length > 0) {
        lignes.push({
          fichier: NOM_CONFIGURATION,
          ligne: "la section modes, facultative, nomme l'attribut HTML de chaque axe ; sans elle, un axe prend `data-` suivi de son nom.",
        });
      }
    } catch {
      // Sans fichier de tokens lisible, aucun axe ne se lit.
    }
  }
  return lignes;
}

/**
 * Le workflow de contrôle, écrit pour un repository quelconque.
 *
 * **Un repo sans `package.json` n'installe rien.** Si un `package-lock.json`
 * existe, ses dépendances sont installées : c'est ainsi qu'un adaptateur de
 * stack optionnel devient visible. Le repo iOS qui ne déclare aucun paquet
 * garde donc le chemin minimal `npx --yes`, et le repo TypeScript reçoit la
 * parité qu'il a explicitement installée.
 *
 * **Le sha de base passe par l'environnement, jamais par interpolation dans le
 * shell.** `${{ }}` écrit sa valeur dans le script avant qu'il ne s'exécute ;
 * la règle vaut même quand la valeur vient de GitHub et pas d'un humain,
 * puisque c'est l'habitude qui protège, pas le cas particulier.
 *
 * **Un filet, et un seul, parce que l'autre n'est pas portable.** Le
 * repository de démonstration en porte deux, « la construction a échoué » et
 * « le rapport manque ». Le premier décrit sa chaîne de construction, qu'un
 * repo Swift n'a pas. Le second est universel : une pull request refusée sans
 * un mot laisse le designer sans recours.
 *
 * **Le job qui exécute le code du repository n'écrit nulle part.** `npm ci`
 * lance les scripts d'installation des dépendances, et un paquet compromis
 * lirait le jeton du job, même hors de l'environnement. Le commentaire part
 * donc d'un second job, sans checkout ni npm, qui reçoit le rapport en
 * artefact. L'auteur d'une branche du repository peut réécrire ce fichier :
 * la séparation ne borne que ce qu'une dépendance obtient. Une fourche reçoit
 * de GitHub un jeton en lecture seule, et son commentaire échoue.
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
    "# Le job `contrats` exécute le code du repository et ses dépendances : il",
    "# ne porte aucun droit d'écriture. Seul `commentaire`, qui n'exécute rien",
    "# du repository, écrit sur la pull request.",
    "#",
    "# Écrit par `ucm init`. Adaptez-le : il ne sera jamais réécrit par-dessus.",
    "name: ucm",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "",
    "permissions:",
    "  contents: read",
    "",
    "jobs:",
    "  contrats:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      # Le job exécute le code de la pull request : il n'a aucune raison de",
    "      # garder un jeton git utilisable.",
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
    "      # Un adaptateur appartient à la stack du repository. Sans lockfile,",
    "      # cette étape est absente de fait et le noyau portable reste seul.",
    "      - name: Installer la stack déclarée",
    "        if: hashFiles('package-lock.json') != ''",
    "        run: npm ci",
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
    "      # Le rapport passe au job `commentaire`. Une dépendance a pu le",
    "      # réécrire : il part en corps de commentaire, jamais en commande.",
    "      - name: Transmettre le rapport",
    "        if: always() && github.event_name == 'pull_request'",
    "        uses: actions/upload-artifact@v4",
    "        with:",
    "          name: ucm-rapport",
    "          path: ci-report.md",
    "          retention-days: 1",
    "",
    "  commentaire:",
    "    needs: contrats",
    "    # `!cancelled()` et non `always()` : un run annulé ne commente pas.",
    "    if: ${{ !cancelled() && github.event_name == 'pull_request' }}",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      pull-requests: write",
    "    steps:",
    "      - uses: actions/download-artifact@v4",
    "        with:",
    "          name: ucm-rapport",
    "",
    "      - name: Publier le diagnostic sur la pull request",
    "        env:",
    "          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}",
    "          NUMERO: ${{ github.event.number }}",
    "        # --edit-last met à jour le commentaire précédent au lieu d'en empiler",
    "        # un nouveau à chaque push ; s'il n'en existe pas encore, on en crée un.",
    "        run: |",
    '          printf "<!-- ucm-rapport -->\\n" > ucm-report.md',
    '          cat ci-report.md >> ucm-report.md',
    '          COMPTE="$(gh api user --jq .login)"',
    '          NOTE="$(gh api "repos/$GITHUB_REPOSITORY/issues/$NUMERO/comments" --paginate \\',
    '            --jq ".[] | select(.user.login == \\\"$COMPTE\\\") | select(.body | startswith(\\\"<!-- ucm-rapport -->\\\")) | .id" | tail -n 1)"',
    '          if [ -n "$NOTE" ]; then',
    '            gh api --method PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$NOTE" -f body="$(cat ucm-report.md)"',
    '          else',
    '            gh pr comment "$NUMERO" -R "$GITHUB_REPOSITORY" --body-file ucm-report.md',
    '          fi',
    "",
  ].join("\n");
}

/**
 * Le contrôle pour GitLab, dans un fichier que `.gitlab-ci.yml` inclut.
 *
 * **Deux jobs, aucune clé globale.** Ni `workflow`, ni `image`, ni `variables`,
 * ni `stages` : un fichier inclus qui en déclarerait changerait les pipelines
 * de tous les jobs du projet. Chaque job porte ses propres règles.
 *
 * **Le job qui installe les dépendances ne publie pas la note.** Une variable
 * CI/CD non protégée entre dans l'environnement de tous les jobs, et un script
 * d'installation la lirait. `ucm` la retire avant `npm ci`, ce qui ne vaut que
 * pour les exécuteurs qui posent les variables dans le script ; `ucm-rapport`
 * publie sans clone, depuis un dossier vide, sans script d'installation. Qui
 * pousse une branche peut réécrire ce fichier et lire la variable : seul le
 * rôle du compte qui porte le jeton borne ce qu'il en tire.
 *
 * **La note ne refuse jamais une fusion.** `ucm-rapport` tourne après un échec
 * de `ucm`, et `allow_failure` garde le pipeline de la couleur du contrôle
 * quand GitLab refuse le jeton : le rapport reste dans les artefacts.
 */
function workflowGitlab(version) {
  const cli = `npx --yes @ucm-kit/cli@${version}`;
  return [
    "# Contrôle des contrats UCM, inclus par .gitlab-ci.yml.",
    "#",
    "# Le rapport publié en note de la merge request est le seul message que",
    "# reçoit le designer qui valide un export : il n'ouvre pas les journaux de",
    "# la CI. Toute étape qui refuse une fusion doit donc lui laisser un message.",
    "#",
    "# Ce fichier ne déclare que deux jobs et aucune clé globale : les autres jobs",
    "# du projet gardent leurs règles. Les deux jobs prennent le stage `test`.",
    "#",
    "# Un job rouge ne bloque la fusion que si « Pipelines must succeed » est",
    "# coché dans Settings > Merge requests. La note demande la variable",
    "# UCM_GITLAB_TOKEN, masquée et non protégée. Tout pipeline d'une branche du",
    "# projet la lit : son jeton, de scope api, appartient à un compte de rôle",
    "# Reporter sur ce seul projet.",
    "#",
    "# Écrit par `ucm init`. Adaptez-le : il ne sera jamais réécrit par-dessus.",
    "ucm:",
    "  image: node:22",
    "  # Le before_script d'un default: du projet tournerait avec le jeton de la",
    "  # note. Les variables globales, elles, restent héritées.",
    "  inherit:",
    "    default: false",
    "  variables:",
    "    # Le diff avec la base délimite les états informatifs du rapport.",
    '    GIT_DEPTH: "0"',
    "  rules:",
    '    - if: $CI_PIPELINE_SOURCE == "merge_request_event"',
    "    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH",
    "  script:",
    "    # Les scripts d'installation ne reçoivent pas le jeton de la note.",
    "    - unset UCM_GITLAB_TOKEN",
    "    # Un adaptateur appartient à la stack du repository. Sans lockfile, le",
    "    # noyau portable reste seul.",
    "    - if [ -f package-lock.json ]; then npm ci; fi",
    "    - |",
    '      if [ -n "$CI_MERGE_REQUEST_DIFF_BASE_SHA" ]; then',
    `        ${cli} check --report ci-report.md --base "$CI_MERGE_REQUEST_DIFF_BASE_SHA"`,
    "      else",
    `        ${cli} check --report ci-report.md`,
    "      fi",
    "  artifacts:",
    "    when: always",
    "    paths:",
    "      - ci-report.md",
    "",
    "ucm-rapport:",
    "  image: node:22",
    "  # Sans clone, le before_script d'un default: du projet échouerait.",
    "  inherit:",
    "    default: false",
    "  needs:",
    "    - job: ucm",
    "      artifacts: true",
    "  rules:",
    '    - if: $CI_PIPELINE_SOURCE == "merge_request_event"',
    "      when: always",
    "  # Un jeton refusé ne rend pas rouge un pipeline dont les contrats sont verts.",
    "  allow_failure: true",
    "  variables:",
    "    # Aucun clone : ni .npmrc ni node_modules du repository.",
    "    GIT_STRATEGY: empty",
    '    NPM_CONFIG_IGNORE_SCRIPTS: "true"',
    "  script:",
    "    # Filet : sans rapport, `ucm` s'est arrêté avant le contrôle (clone,",
    "    # installation, plantage).",
    "    - |",
    "      if [ ! -f ci-report.md ]; then",
    "        printf '%s\\n\\n%s\\n\\n%s\\n' \\",
    "          \"## ❌ La vérification n'a pas pu rendre son diagnostic\" \\",
    "          \"Les contrôles se sont arrêtés avant d'avoir pu analyser cet export : le rapport habituel n'a pas été produit. **Votre design n'est pas en cause** et réexporter depuis Figma n'y changerait rien.\" \\",
    "          \"**Action attendue :** un développeur doit ouvrir [le pipeline de la CI]($CI_PIPELINE_URL) pour en connaître la raison.\" \\",
    "          > ci-report.md",
    "      fi",
    "    # Depuis un dossier vide, npx ne lit ni configuration ni paquet laissés",
    "    # par un job précédent sur le runner.",
    "    - cd \"$(mktemp -d)\"",
    `    - ${cli} rapport-gitlab --projet "$CI_PROJECT_ID" --merge-request "$CI_MERGE_REQUEST_IID" --fichier "$CI_PROJECT_DIR/ci-report.md" --api "$CI_API_V4_URL"`,
    "",
  ].join("\n");
}

/**
 * Le texte d'une clé de premier niveau d'un YAML, lignes indentées comprises,
 * ou `null` quand la clé est absente.
 *
 * La CLI n'a aucune dépendance YAML : ce découpage lit la forme qu'écrit un
 * `.gitlab-ci.yml` courant. Une clé venue d'un `include:` n'est pas vue.
 */
function blocDeRacine(yaml, cle) {
  const bloc = new RegExp(`^${cle}:([^\\n]*(?:\\n(?:[ \\t]+[^\\n]*|-[^\\n]*|#[^\\n]*|[ \\t]*)(?=\\n|$))*)`, "m").exec(yaml);
  return bloc ? bloc[1] : null;
}

/**
 * Les lignes qu'`init` ne peut pas écrire pour GitLab : des réglages du projet,
 * un `stages:` qui refuserait le job, et un `workflow:rules` qui ne crée aucun
 * pipeline de merge request.
 */
function lignesGitlab(racine) {
  const lignes = [
    {
      fichier: "Settings > CI/CD > Variables",
      ligne: "créez `UCM_GITLAB_TOKEN`, masquée et non protégée. Sa valeur : un jeton de scope api d'un compte de service membre de ce seul projet, au rôle Reporter, ou un jeton d'accès de projet au rôle Reporter si l'offre le permet. Sans cette variable, le rapport n'est pas publié sur la merge request. Non protégée, parce que les branches d'export ne le sont pas ; tout pipeline d'une branche la lit, et le rôle Reporter borne ce qu'on en tire à lire et commenter.",
    },
    {
      fichier: "Settings > Merge requests",
      ligne: "cochez « Pipelines must succeed ». Sans cette case, un rapport rouge annonce une fusion bloquée qui ne l'est pas.",
    },
  ];
  try {
    const ci = readFileSync(join(racine, ".gitlab-ci.yml"), "utf8");
    const stages = blocDeRacine(ci, "stages");
    if (stages !== null && !/(?:^|[\s,\[])(?:-\s*)?test(?=$|[\s,\]])/m.test(stages)) {
      lignes.push({
        fichier: ".gitlab-ci.yml",
        ligne: "ajoutez `test` à `stages:`. Le job ucm s'y range, et GitLab refuse un pipeline dont un job vise un stage absent.",
      });
    }
    const workflow = blocDeRacine(ci, "workflow");
    const exclutLesMr = /if:\s*[^\n]*merge_request_event[\s\S]{0,160}?when:\s*never/.test(workflow ?? '');
    if (workflow !== null && /^[ \t]+rules:/m.test(workflow) && (!workflow.includes("merge_request_event") || exclutLesMr)) {
      lignes.push({
        fichier: ".gitlab-ci.yml",
        ligne: "ajoutez `- if: $CI_PIPELINE_SOURCE == \"merge_request_event\"` en tête de `workflow:rules`. Sans cette règle, GitLab ne crée aucun pipeline de merge request et le job ucm ne contrôle aucun export.",
      });
    }
  } catch {
    // Sans .gitlab-ci.yml, celui qu'`init` écrit ne déclare aucun stage.
  }
  return lignes;
}

/**
 * Écrit ce qui manque, et rend le compte rendu de ce qui a été fait.
 *
 * Rien n'est écrit avant que tout soit décidé : un `init` interrompu à
 * mi-chemin laisserait un repo à moitié installé, état que rien ne sait
 * diagnostiquer ensuite.
 */
export function init(racine, {
  ecrire = writeFileSync,
  chemins = {},
  sansAgents = false,
  adaptateur = null,
  erreurAdaptateur = null,
  forge: forgeDemandee,
  git,
} = {}) {
  const version = versionDuPaquet();
  const aEcrire = [];
  const deja = [];
  const { gabarits, erreur: erreurGabarits } = sansAgents ? { gabarits: [], erreur: null } : gabaritsDe(adaptateur);
  // Lue avant toute écriture : le `.gitlab-ci.yml` qu'`init` écrirait ne doit
  // pas devenir le signal qui désigne GitLab.
  const forge = forgeDuRepository(racine, { forge: forgeDemandee, git });

  for (const fichier of fichiers(version, chemins, { agents: !sansAgents, gabarits, forge: forge.nom })) {
    const cible = join(racine, fichier.chemin);
    if (existsSync(cible)) deja.push({ ...fichier, cible });
    else aEcrire.push({ ...fichier, cible });
  }

  for (const fichier of aEcrire) {
    mkdirSync(dirname(fichier.cible), { recursive: true });
    ecrire(fichier.cible, fichier.contenu, "utf8");
  }

  const optionsDemandees = Object.keys(chemins).length > 0;
  return {
    ecrits: aEcrire.map((f) => f.chemin),
    conserves: deja.map((f) => f.chemin),
    rappels: deja.filter((f) => f.rappel && !porteLaRegle(f)).map((f) => ({
      chemin: f.chemin,
      rappel: f.rappel,
    })),
    /*
     * Des chemins demandés à une commande qui n'écrase rien, sur un repository
     * qui a déjà sa configuration. Le silence se lirait comme « c'est fait »,
     * et le premier export irait ailleurs que là où on croit l'avoir envoyé.
     * Ce n'est pas un `rappel` : les trois rappels nomment une ligne à ajouter
     * à un fichier partagé, et les mélanger ferait de la liste entière quelque
     * chose qu'on apprend à sauter.
     */
    optionsIgnorees: optionsDemandees && deja.some((f) => f.chemin === NOM_CONFIGURATION),
    /*
     * Les chemins écrits, et `null` quand la configuration a été conservée :
     * ce sont alors ceux du fichier déjà là, qu'`init` n'a pas lu. Les
     * afficher quand même reviendrait à annoncer un endroit sur la foi d'un
     * défaut, devant un fichier qui dit peut-être autre chose.
     */
    chemins: aEcrire.some((f) => f.chemin === NOM_CONFIGURATION)
      ? { ...CONFIGURATION_PAR_DEFAUT, ...chemins }
      : null,
    version,
    forge,
    agents: !sansAgents,
    // `absent` quand aucun adaptateur n'est installé, le message quand il n'a pas pu servir.
    adaptateur: erreurAdaptateur
      ? { erreur: erreurAdaptateur?.message ?? String(erreurAdaptateur) }
      : erreurGabarits ? { erreur: erreurGabarits } : adaptateur ? "trouve" : "absent",
    nodeJs: existsSync(join(racine, "package.json")),
    lignes: [
      ...lignesRestantes(
        racine,
        version,
        aEcrire.some((f) => f.chemin === NOM_CONFIGURATION)
          ? { ...CONFIGURATION_PAR_DEFAUT, ...chemins }
          : lireConfiguration(racine).configuration,
      ),
      ...(forge.nom === "gitlab" ? lignesGitlab(racine) : []),
    ],
  };
}

/**
 * Un fichier conservé porte-t-il déjà la règle que son rappel réclame ?
 *
 * Un fichier illisible répond non : mieux vaut une ligne réclamée en trop qu'un
 * silence sur la seule chose que cette commande ne sait pas installer.
 */
function porteLaRegle(fichier) {
  // Un fichier sans marqueur n'a rien à reconnaître. Sans cette ligne, la
  // réponse serait juste par accident : `undefined.every` lève, et c'est le
  // `catch` écrit pour un fichier illisible qui rendrait `false`.
  if (!fichier.marqueurs) return false;
  try {
    const contenu = readFileSync(fichier.cible, "utf8");
    return fichier.marqueurs.every((marqueur) => contenu.includes(marqueur));
  } catch {
    return false;
  }
}

/**
 * Le compte rendu terminal, qui dit toujours ce qu'il n'a pas touché.
 *
 * Un fichier conservé qui porte un `rappel` reçoit sa ligne, et « laissé tel
 * quel » ne suffit pas à la remplacer : cette mention se lit comme « rien à
 * faire », alors que la moitié de l'installation manque précisément là.
 */
export function rendreInit({
  ecrits,
  conserves,
  rappels = [],
  optionsIgnorees = false,
  chemins = null,
  version,
  forge = null,
  agents = false,
  adaptateur = "absent",
  nodeJs = false,
  lignes: restantes = [],
}) {
  const lignes = [];
  for (const chemin of ecrits) lignes.push(`✓ ${chemin}`);
  for (const chemin of conserves) lignes.push(`· ${chemin} existait déjà, laissé tel quel`);
  lignes.push("");
  // L'endroit vient de la configuration écrite, jamais d'une convention
  // recopiée ici : les deux dériveraient dès qu'un drapeau en décide autrement.
  const ou = chemins
    ? `Placez vos contrats sous \`${chemins.components}/\`, vos tokens dans `
      + `\`${chemins.tokens}\`, puis lancez \`ucm check\`.`
    : `Les chemins restent ceux que ce repository déclare dans son ${NOM_CONFIGURATION}. `
      + "Lancez `ucm check`.";
  lignes.push(
    ecrits.length > 0
      ? `Installé avec @ucm-kit/cli ${version}.\n${ou}`
      : restantes.length === 0
        ? "Rien à faire : ce repository est déjà installé."
        : "Aucun fichier à écrire : ce repository est déjà installé.",
  );
  if (forge) {
    lignes.push("");
    lignes.push(`CI écrite pour ${forge.nom === "gitlab" ? "GitLab" : "GitHub"}, d'après ${forge.signal}.`);
    lignes.push("L'option `--forge github` ou `--forge gitlab` en choisit une autre.");
  }

  if (optionsIgnorees) {
    lignes.push("");
    lignes.push(
      `· \`${NOM_CONFIGURATION}\` existait déjà : les chemins passés en option n'ont pas été `
      + "écrits. Ce fichier décide seul de l'endroit où les exports atterrissent ; modifiez-le "
      + "à la main pour en changer.",
    );
  }

  for (const { chemin, rappel } of rappels) {
    lignes.push("");
    lignes.push(`· \`${chemin}\` existait déjà : ${rappel}`);
  }

  if (typeof adaptateur === "object" && adaptateur !== null) {
    lignes.push("");
    lignes.push(`· ${NOM_ADAPTATEUR_TYPESCRIPT} est installé mais n'a pas servi : ${adaptateur.erreur}. `
      + "Les gabarits n'ont pas été copiés ; le reste de l'installation est fait.");
  } else if (agents && nodeJs && adaptateur === "absent") {
    lignes.push("");
    lignes.push(`· Relancez \`ucm init\` après avoir installé ${NOM_ADAPTATEUR_TYPESCRIPT} pour recevoir le gabarit `
      + "dans `.ucm/gabarits/`.");
  }

  if (restantes.length > 0) {
    lignes.push("");
    lignes.push("Reste à ajouter à la main :");
    // L'endroit en tête, puis une phrase par ligne : le geste d'abord, ses
    // raisons ensuite, sans qu'un paragraphe replié par le terminal les mêle.
    for (const { fichier, ligne } of restantes) {
      lignes.push("");
      lignes.push(`- ${fichier}`);
      for (const phrase of ligne.split(/(?<=\.) (?=\p{Lu})/u)) {
        lignes.push(`  ${phrase[0].toUpperCase()}${phrase.slice(1)}`);
      }
    }
  }
  return lignes.join("\n");
}
