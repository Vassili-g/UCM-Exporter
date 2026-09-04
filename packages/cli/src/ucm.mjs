#!/usr/bin/env node
/**
 * `ucm` : la ligne de commande du kit.
 *
 * Aucune commande n'orchestre quoi que ce soit : `ucm check` appelle le
 * contrôle du kit (T5.2) et se contente d'imprimer, d'écrire si on le lui
 * demande et de choisir un code de sortie. En écrire une seconde version ici
 * produirait deux rapports qui divergeraient en silence — la maladie exacte que
 * T2.7, T6.0 et T2.6 ont soignée ailleurs dans ce projet.
 *
 * Le code de sortie est la seule chose qu'un workflow lise sans ambiguïté : 0
 * quand la commande a fait ce qu'on lui demandait, 1 quand des contrôles ont
 * échoué, 2 quand l'invocation ou la configuration est fautive. Le 1 et le 2 ne
 * se confondent jamais, sinon une faute de frappe dans un drapeau se lirait
 * comme un export en défaut.
 */
import { realpathSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { lireConfiguration } from "@ucm-kit/core/lecteurs";

import { check } from "./check.mjs";
import { iconesDuRepository, rendreIcones } from "./icons.mjs";
import { init, rendreInit } from "./init.mjs";

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
export function executer(arguments_, { racine = process.cwd(), ecrire = console.log, ...sorties } = {}) {
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
    return check(arguments_.slice(1), { racine, ecrire, ...sorties });
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
