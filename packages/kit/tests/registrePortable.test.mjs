/**
 * Le kit parle-t-il une langue qu'un repo non-React puisse lire ?
 *
 * **Ce test vient du consommateur, et il devait venir.** C'est le filet de
 * T2.6, écrit là-bas quand les modules du rapport y vivaient encore : « renommer
 * des chaînes une fois ne coûte rien, les laisser renommées coûte une vigilance
 * que personne n'a ». Le mot revient au premier message écrit dans l'urgence,
 * et il revient là où il fait le plus de dégâts — dans une phrase lue par un
 * designer. Laisser le filet derrière lui pendant que T5.2 déplaçait ce qu'il
 * protégeait, c'était le perdre exactement au moment où ces messages
 * deviennent PUBLIÉS et imprimés par des repos dont aucun n'écrira de `.tsx`.
 *
 * La règle est celle de la Cible du plan, pas une préférence de style : « ce
 * qui décrit la STACK est un adaptateur optionnel ». Un message qui promet un
 * fichier `.tsx` à un repo Swift n'est pas maladroit, il est faux — et il est
 * faux sur la pull request d'export, la seule que le designer ouvre.
 *
 * ## Ce que ce test regarde, et ce qu'il laisse passer
 *
 * Il regarde le CODE, pas les commentaires. Un commentaire qui écrit « en
 * React, en Swift ou en Kotlin » explique la coupure et ne promet rien à
 * personne ; l'interdire obligerait ces fichiers à taire la raison de leur
 * propre existence. Ce qu'on refuse est une stack dans ce qui s'affiche.
 *
 * Une seule exemption nommée, et c'est une VALEUR, pas un message :
 * `MOTIF_IMPLEMENTATION_PAR_DEFAUT`. Un motif de chemin qu'un repo remplace par
 * le sien n'affirme rien à son lecteur — il décrit le cas courant, et T2.2 a
 * écrit pourquoi il en fallait un.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const lecteurs = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lecteurs");

/**
 * Les mots à bannir, et rien de plus large.
 *
 * `TypeScript` n'y est pas : un module a le droit de dire qu'il délègue à un
 * adaptateur TypeScript, puisque c'est exactement ce qu'il fait. Ce qu'on
 * refuse, c'est de PROMETTRE une stack au lecteur — un fichier `.tsx` à créer,
 * un composant React à corriger, un Playground à adapter.
 */
const MOTS_BANNIS = [/\bReact\b/, /\.tsx\b/, /\bTSX\b/, /\bPlayground\b/];

/** Une ligne de commentaire pur : elle explique, elle ne s'affiche pas. */
function estCommentaire(ligne) {
  const nue = ligne.trim();
  return nue.startsWith("*") || nue.startsWith("//") || nue.startsWith("/*");
}

/** La seule valeur qui porte légitimement une extension de fichier. */
function estLeMotifParDefaut(ligne) {
  return ligne.includes("MOTIF_IMPLEMENTATION_PAR_DEFAUT =");
}

test("aucun lecteur du kit ne promet une stack à celui qui lira son rapport", () => {
  const modules = readdirSync(lecteurs).filter((nom) => nom.endsWith(".mjs"));
  // Une liste vide passerait ce test sans rien contrôler : un dossier renommé,
  // et le filet disparaîtrait en silence. C'est la faute qu'il existe pour
  // rendre impossible.
  assert.ok(modules.length > 5, "aucun lecteur trouvé : le filet ne contrôle plus rien");

  const fautes = [];
  for (const module of modules) {
    readFileSync(join(lecteurs, module), "utf8").split("\n").forEach((ligne, index) => {
      if (estCommentaire(ligne) || estLeMotifParDefaut(ligne)) return;
      for (const mot of MOTS_BANNIS) {
        if (mot.test(ligne)) fautes.push(`${module}:${index + 1} — ${ligne.trim()}`);
      }
    });
  }

  assert.deepEqual(fautes, [], "un message du kit promet une stack à son lecteur");
});
