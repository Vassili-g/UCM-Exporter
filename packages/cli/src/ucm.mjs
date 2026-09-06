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
import { check } from "./check.mjs";
import { iconesDuRepository, rendreIcones } from "./icons.mjs";
import { init, rendreInit } from "./init.mjs";

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
  ucm --help          affiche cette aide

  ucm check [--base <sha>] [--report <chemin>]
      --base    limite les états informatifs aux contrats modifiés depuis ce sha
      --report  écrit le rapport markdown à ce chemin, en plus du terminal

Codes de sortie : 0 tout est passé, 1 des contrôles ont échoué, 2 l'invocation
ou la configuration est fautive.`;

/** Le corps de la commande, séparé du processus pour être testable. */
export function executer(arguments_, {
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
    ecrire(rendreInit(init(racine)));
    return 0;
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
      }))
      .catch((erreur) => {
        const alerter = sorties.alerter ?? console.error;
        alerter(
          `L'adaptateur ${NOM_ADAPTATEUR_TYPESCRIPT} est installé mais n'a pas pu être chargé : `
          + `${erreur?.message ?? erreur}\n`
          + "Un développeur doit corriger son installation ou son tsconfig.json.",
        );
        return 2;
      });
  }

  if (commande === "icons") {
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

// Le module s'exporte ET s'exécute : les tests appellent `executer`, le binaire
// passe par ici. Sans cette garde, importer le module lancerait la commande.
//
// La comparaison passe par `realpathSync` parce que npm installe le binaire
// comme un lien : sans résolution, le chemin lancé et celui du module diffèrent,
// et `ucm` se contenterait de ne rien faire — en sortant 0.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exit(await executer(process.argv.slice(2)));
}
