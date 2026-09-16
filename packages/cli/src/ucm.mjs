#!/usr/bin/env node
/**
 * Aiguille la ligne de commande vers le kit et ses adaptateurs. Les commandes
 * publient les décisions du noyau sans dupliquer son orchestration.
 * Codes : 0 succès, 1 contrôles rouges, 2 invocation ou configuration fautive.
 */
import { realpathSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { lireConfiguration } from "@ucm-kit/core/lecteurs";

import { chargerAdaptateur, NOM_ADAPTATEUR_TYPESCRIPT } from "./adaptateur.mjs";
import { aides } from "./aides.mjs";
import { check } from "./check.mjs";
import { guide } from "./guide.mjs";
import { iconesDuRepository, rendreIcones } from "./icons.mjs";
import { init, lireArgumentsInit, rendreInit } from "./init.mjs";
import { rapportGitlab } from "./rapport-gitlab.mjs";
import { tokensCss } from "./tokens-css.mjs";

/** Le verdict de tests qu'un orchestrateur de stack peut transmettre au CLI. */
function echecsDeTestsDepuis(env) {
  if (!env.UCM_ECHECS_DE_TESTS) return { valeur: undefined };
  try {
    const transmis = JSON.parse(env.UCM_ECHECS_DE_TESTS);
    if (typeof transmis !== "object" || transmis === null || !Array.isArray(transmis.echecs)) {
      throw new Error("forme invalide");
    }
    return {
      valeur: { echoue: transmis.echoue === true, echecs: transmis.echecs },
    };
  } catch {
    return {
      erreur: "UCM_ECHECS_DE_TESTS est illisible. L'orchestrateur doit transmettre un objet JSON avec `echoue` et `echecs`.",
    };
  }
}

const AIDE = `ucm — la ligne de commande UCM

  ucm init            installe ce qui manque à ce repository, sans rien écraser
  ucm check           contrôle les contrats et rend le rapport du designer
  ucm icons           liste les icônes que les contrats réclament
  ucm tokens css      écrit la feuille CSS des tokens et de leurs modes
  ucm aides           liste les aides à l'implémentation et leur origine
  ucm guide           imprime ce qu'un agent lit avant d'implémenter un contrat
  ucm rapport-gitlab  publie le rapport en note d'une merge request GitLab
  ucm --help          affiche cette aide

  ucm init [--components <dossier>] [--tokens <dossier>] [--implementation <motif>] [--sans-agents] [--forge github|gitlab]
      --components      dossier sous lequel les contrats sont rangés
      --tokens          dossier qui reçoit tokens.json
      --implementation  où vit l'implémentation d'un contrat, {dir} et {id}
                        pour son dossier et son identifiant
      --sans-agents     n'écrit ni les relais d'agent, ni .ucm/conventions.md,
                        ni les gabarits
      --forge           la forge dont la CI est écrite ; sans elle, l'hôte du
                        remote origin, puis la présence de .gitlab-ci.yml
                        décident, et GitHub sinon
      Les trois n'agissent qu'à la première installation : ucm init n'écrase
      jamais un ucm.config.json existant.

  ucm check [--base <sha>] [--report <chemin>]
      --base    limite les états informatifs aux contrats modifiés depuis ce sha
      --report  écrit le rapport markdown à ce chemin, en plus du terminal

  ucm tokens css --out <fichier> [--sans-modes]
      --out         la feuille à écrire, remplacée seulement si le fichier de
                    tokens donne une feuille
      --sans-modes  écrit la valeur par défaut de chaque token, pour un
                    fichier exporté avant la déclaration des axes

  ucm aides [<aide> [--personnaliser [<chemin>]]]
      <aide>           imprime son sens, son écriture par défaut et sa preuve
      --personnaliser  ajoute la section de l'aide au .ucm/conventions.md le
                       plus proche du chemin, à éditer, sans rien écraser

  ucm guide <contrat> [--out <fichier>]
      <contrat>  le fichier .contract.json à implémenter
      --out      écrit le guide dans ce fichier plutôt que dans le terminal

  ucm rapport-gitlab --projet <id> --merge-request <iid> --fichier <chemin> [--api <url>]
      --projet         l'identifiant ou le chemin du projet GitLab
      --merge-request  le numéro de la merge request dans ce projet
      --fichier        le rapport écrit par ucm check --report
      --api            l'API GitLab, https://gitlab.com/api/v4 par défaut
      Le jeton se lit dans UCM_GITLAB_TOKEN. Sans lui, la commande le dit et
      sort en 0.

Codes de sortie : 0 tout est passé, 1 des contrôles ont échoué, 2 l'invocation
ou la configuration est fautive.`;

/** Rapporte aussi les pannes synchrones et les rejets des commandes asynchrones. */
export function executer(arguments_, options = {}) {
  const signaler = (erreur) => {
    const alerter = options.alerter ?? console.error;
    alerter(`La commande ucm ${arguments_[0]} n'a pas pu aboutir : ${erreur?.message ?? erreur}\n`
      + "Un développeur doit corriger l'erreur signalée, puis relancer la commande.");
    return 2;
  };
  try {
    const resultat = executerCommande(arguments_, options);
    return resultat instanceof Promise ? resultat.catch(signaler) : resultat;
  } catch (erreur) {
    return signaler(erreur);
  }
}

function executerCommande(arguments_, {
  racine = process.cwd(),
  env = process.env,
  ecrire = console.log,
  ...sorties
} = {}) {
  const [commande] = arguments_;

  if (commande === undefined || commande === "--help" || commande === "-h") {
    ecrire(AIDE);
    return 0;
  }

  if (commande === "init") {
    const { chemins, sansAgents, forge, erreur } = lireArgumentsInit(arguments_.slice(1));
    if (erreur) {
      const alerter = sorties.alerter ?? console.error;
      alerter(`${erreur}\n\nucm init [--components <dossier>] [--tokens <dossier>] [--implementation <motif>] [--sans-agents] [--forge github|gitlab]`);
      return 2;
    }
    // Un adaptateur qui ne se charge pas prive le repository de ses gabarits,
    // pas du reste de l'installation : `init` reçoit l'erreur et la rapporte.
    return chargerAdaptateur(racine)
      .then((adaptateur) => ({ adaptateur }), (erreurAdaptateur) => ({ erreurAdaptateur }))
      .then((chargement) => {
        ecrire(rendreInit(init(racine, { chemins, sansAgents, forge, git: sorties.git, ...chargement })));
        return 0;
      });
  }

  if (commande === "check") {
    // Le contrôle écrit sur trois canaux distincts, et le terminal en dépend :
    // un écart de parité en ⚠ et un contrat cassé en ✗ ne doivent pas se lire
    // sur le même flux. Le défaut de `check` les branche sur la console.
    const tests = echecsDeTestsDepuis(env);
    if (tests.erreur) {
      const alerter = sorties.alerter ?? console.error;
      alerter(tests.erreur);
      return 2;
    }
    return chargerAdaptateur(racine)
      .then((adaptateur) => check(arguments_.slice(1), {
        racine,
        adaptateur: adaptateur ?? undefined,
        echecsDeTests: tests.valeur,
        ecrire,
        ...sorties,
      }), (erreur) => {
        const alerter = sorties.alerter ?? console.error;
        alerter(
          `L'adaptateur ${NOM_ADAPTATEUR_TYPESCRIPT} est installé mais n'a pas pu être chargé : `
          + `${erreur?.message ?? erreur}\n`
          + "Un développeur doit corriger son installation ou son tsconfig.json.",
        );
        return 2;
      });
  }

  if (commande === "tokens") {
    return tokensCss(arguments_.slice(1), {
      racine,
      ecrire,
      alerter: sorties.alerter ?? console.error,
    });
  }

  if (commande === "aides") {
    return aides(arguments_.slice(1), { racine, ecrire, alerter: sorties.alerter ?? console.error });
  }

  if (commande === "guide") {
    return guide(arguments_.slice(1), { racine, ecrire, alerter: sorties.alerter ?? console.error });
  }

  if (commande === "rapport-gitlab") {
    return rapportGitlab(arguments_.slice(1), {
      racine,
      env,
      fetch: sorties.fetch,
      ecrire,
      alerter: sorties.alerter ?? console.error,
    });
  }

  if (commande === "icons") {
    if (arguments_.length > 1) {
      const alerter = sorties.alerter ?? console.error;
      alerter(`Argument inconnu : ${arguments_[1]}\n\nucm icons`);
      return 2;
    }
    const { configuration, erreur } = lireConfiguration(racine);
    if (erreur) {
      // La configuration est refusée ici comme ailleurs : retomber sur les
      // défauts ferait chercher les contrats dans un autre dossier et rendre
      // une liste vide, qui se lit comme « aucune icône » alors qu'elle veut
      // dire « je n'ai rien regardé ».
      ecrire(erreur);
      return 2;
    }
    ecrire(rendreIcones(iconesDuRepository(racine, configuration.components)));
    return 0;
  }

  ecrire(`Commande inconnue : ${commande}\n\n${AIDE}`);
  return 2;
}

// Le module s'exporte et s'exécute : les tests appellent `executer`, le binaire
// passe par ici. Sans cette garde, importer le module lancerait la commande.
//
// La comparaison passe par `realpathSync` parce que npm installe le binaire
// comme un lien : sans résolution, le chemin lancé et celui du module diffèrent,
// et `ucm` se contenterait de ne rien faire, en sortant 0.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exit(await executer(process.argv.slice(2)));
}
