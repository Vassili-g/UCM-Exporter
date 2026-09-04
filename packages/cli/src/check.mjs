/**
 * `ucm check` : contrôler les contrats d'un repository, et le dire.
 *
 * **Cette commande n'orchestre rien.** Tout le contrôle et tout le rapport
 * vivent dans `@ucm-kit/core/lecteurs` (T5.2) ; ce fichier lit des arguments,
 * imprime, écrit un fichier si on le lui demande et choisit un code de sortie.
 * C'était l'arbitrage de T3.3 : en écrire une seconde version ici produirait
 * deux rapports qui divergeraient en silence — la maladie exacte que T2.7, T6.0
 * et T2.6 ont soignée trois fois ailleurs dans ce projet. Le CONTENU du rapport
 * est du format, sa PUBLICATION est de l'outil, et cette ligne-là est la seule
 * que ce fichier a le droit de franchir.
 *
 * ## Les trois codes de sortie
 *
 * `0` tout est passé · `1` des contrôles ont échoué · `2` l'invocation ou la
 * configuration est fautive. Le 1 et le 2 ne se confondent jamais : un workflow
 * qui les mélangerait ferait lire « votre export est en défaut » à quelqu'un
 * dont le seul tort est une faute de frappe dans un drapeau.
 *
 * ## Pourquoi `--report` et pas une variable d'environnement
 *
 * Le rapport ne s'écrivait que si `CI` était présente. Écrire toujours
 * laisserait un fichier non versionné dans la copie de travail après chaque
 * exécution — le risque n'est pas de le commiter mais de faire croire à un
 * rapport frais. Ne l'écrire que sous `CI` empêche un développeur de
 * prévisualiser ce que le designer lira, ce qui est précisément ce qu'on veut
 * faire quand on modifie ces messages. Un drapeau explicite règle les deux, et
 * supprime une variable d'environnement magique.
 *
 * ## Pourquoi `--base <sha>` et pas un calcul de CI
 *
 * Le périmètre des états informatifs se limite aux contrats que la pull request
 * modifie, sans quoi un export de tokens reparle indéfiniment d'un composant
 * qu'il ne touche pas. Savoir QUEL sha est la base demande de connaître un
 * système de CI (`pull_request.base.sha`, `fetch-depth: 0`) ; faire le diff, non.
 * Le workflow trouve le sha, cette commande fait le diff.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { controlerRepository, lireConfiguration } from "@ucm-kit/core/lecteurs";

/**
 * Lit les arguments de `ucm check`.
 *
 * Rend `{ erreur }` plutôt que de lever : une invocation fautive est un
 * diagnostic à afficher, pas une stack trace — la même règle que les lecteurs
 * s'appliquent à un contrat malformé.
 */
export function lireArguments(arguments_) {
  const options = { base: null, report: null };

  for (let i = 0; i < arguments_.length; i += 1) {
    const argument = arguments_[i];
    if (argument === "--report" || argument === "--base") {
      const valeur = arguments_[i + 1];
      // Un drapeau suivi d'un autre drapeau est une valeur oubliée, pas une
      // valeur : sans ce contrôle, `--base --report x` prendrait « --report »
      // pour un sha et le diff échouerait trois appels plus loin.
      if (valeur === undefined || valeur.startsWith("--")) {
        return { erreur: `${argument} attend une valeur.` };
      }
      options[argument.slice(2)] = valeur;
      i += 1;
      continue;
    }
    return { erreur: `Argument inconnu : ${argument}` };
  }

  return { options };
}

/**
 * Ce que la pull request modifie, relevé par `git` depuis la base donnée.
 *
 * **Un échec de `git` n'entraîne aucun repli silencieux.** Sans relevé, le
 * périmètre s'ouvrirait à tous les contrats et le rapport parlerait de
 * composants que cette pull request ne touche pas — exactement le défaut que le
 * périmètre existe pour supprimer. Se tromper sans le dire est pire que
 * s'arrêter.
 */
export function releveDuDiff(racine, base, sourceTokens, executer = execFileSync) {
  const git = (arguments_) =>
    executer("git", arguments_, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  let contratsModifies;
  try {
    contratsModifies = git([
      "diff", "--name-only", base, "HEAD", "--", ":(glob)**/*.contract.json",
    ]);
  } catch (erreur) {
    return {
      erreur: `Le diff depuis « ${base} » a échoué : ${erreur?.message ?? erreur}.\n`
        + "Vérifiez que ce sha existe dans le clone — une CI qui limite la profondeur du "
        + "checkout ne le contient pas forcément.",
    };
  }

  // `git diff --quiet` sort en 1 quand il y a une différence : l'exception EST
  // la réponse, et l'absence d'exception veut dire « rien n'a bougé ».
  let tokensModifies = true;
  try {
    git(["diff", "--quiet", base, "HEAD", "--", sourceTokens]);
    tokensModifies = false;
  } catch {
    tokensModifies = true;
  }

  return { contratsModifies, tokensModifies };
}

/**
 * Contrôle un repository et rend le code de sortie.
 *
 * Les sorties sont injectables pour que les tests lisent ce qui a été écrit
 * sans détourner la console du processus.
 */
export function check(arguments_, {
  racine = process.cwd(),
  ecrire = console.log,
  avertir = console.warn,
  alerter = console.error,
  ecrireFichier = writeFileSync,
  executerGit = execFileSync,
} = {}) {
  const { options, erreur: erreurArguments } = lireArguments(arguments_);
  if (erreurArguments) {
    alerter(`${erreurArguments}\n\nucm check [--base <sha>] [--report <chemin>]`);
    return 2;
  }

  const { configuration, erreur: erreurConfiguration } = lireConfiguration(racine);
  if (erreurConfiguration) {
    // Pas de rapport écrit ici, et c'est délibéré : formuler un diagnostic de
    // designer dans le CLI remettrait du vocabulaire de rapport dans l'outil,
    // ce que T5.2 vient d'en sortir. Le filet du workflow (T5.4) publie déjà un
    // message quand le rapport manque — c'est exactement le cas qu'il couvre.
    alerter(erreurConfiguration);
    return 2;
  }

  let perimetre = {};
  if (options.base) {
    const releve = releveDuDiff(racine, options.base, configuration.tokens, executerGit);
    if (releve.erreur) {
      alerter(releve.erreur);
      return 2;
    }
    perimetre = releve;
  }

  const verdict = controlerRepository(racine, { configuration, ...perimetre });

  // Le terminal, toujours, quoi qu'il arrive : c'est le seul canal qu'un
  // développeur lise en local, et le rapport ne s'écrit que sur demande.
  const flux = { log: ecrire, warn: avertir, error: alerter };
  for (const { flux: canal, texte } of verdict.terminal) flux[canal](texte);

  if (options.report) {
    const cible = resolve(racine, options.report);
    mkdirSync(dirname(cible), { recursive: true });
    ecrireFichier(cible, `${verdict.rapport}\n`, "utf8");
  }

  return verdict.bloquant ? 1 : 0;
}
