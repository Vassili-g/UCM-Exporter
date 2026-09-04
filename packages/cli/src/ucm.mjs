#!/usr/bin/env node
/**
 * `ucm` : la ligne de commande du kit.
 *
 * Elle n'a que deux commandes aujourd'hui, et ne prétend pas en avoir trois.
 * `ucm check` (T3.3) attend que l'orchestration du contrôle rejoigne le kit
 * (T5.2) : l'écrire ici en attendant produirait un second rapport qui
 * divergerait du premier, et le désaccord serait muet — la maladie exacte que
 * T2.7, T6.0 et T2.6 ont soignée ailleurs dans ce projet.
 *
 * Le code de sortie est la seule chose qu'un workflow lise sans ambiguïté : 0
 * quand la commande a fait ce qu'on lui demandait, 2 quand l'invocation
 * elle-même est fautive. Le 1 est réservé à `ucm check`, pour qu'il désigne
 * toujours « des contrôles ont échoué » et jamais « je n'ai pas compris ».
 */
import { realpathSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { lireConfiguration } from "@ucm-kit/core/lecteurs";

import { iconesDuRepository, rendreIcones } from "./icons.mjs";
import { init, rendreInit } from "./init.mjs";

const AIDE = `ucm — la ligne de commande UCM

  ucm init            installe ce qui manque à ce repository, sans rien écraser
  ucm icons           liste les icônes que les contrats réclament
  ucm --help          affiche cette aide

Le contrôle des contrats (\`ucm check\`) n'existe pas encore : l'orchestration
qu'il demande vit toujours chez le repository de démonstration et rejoindra le
paquet avec la Phase 5 du plan d'industrialisation.`;

/** Le corps de la commande, séparé du processus pour être testable. */
export function executer(arguments_, { racine = process.cwd(), ecrire = console.log } = {}) {
  const [commande] = arguments_;

  if (commande === undefined || commande === "--help" || commande === "-h") {
    ecrire(AIDE);
    return 0;
  }

  if (commande === "init") {
    ecrire(rendreInit(init(racine)));
    return 0;
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
  process.exit(executer(process.argv.slice(2)));
}
