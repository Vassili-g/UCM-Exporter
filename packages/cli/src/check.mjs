/**
 * Publie le contrôle défini par `@ucm-kit/core/lecteurs` : cette commande ne
 * redéfinit ni le contrôle ni le rapport. `--report` commande explicitement
 * l'écriture ; `--base` reçoit de la CI le SHA qui borne la pull request.
 * Codes : 0 succès, 1 contrôles rouges, 2 invocation ou configuration fautive.
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
  adaptateur,
  echecsDeTests,
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
    // ce que la scission en a sorti. Le filet du workflow publie déjà un
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

  const verdict = controlerRepository(racine, {
    configuration,
    adaptateur,
    echecsDeTests,
    ...perimetre,
  });

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
