/**
 * L'existence d'une implémentation, sans rien savoir du langage.
 *
 * Ce qui est éprouvé ici est la coupure de T2.3 : le noyau répond « présente ou
 * absente » pour n'importe quelle cible, et le défaut qu'il corrige est un
 * MENSONGE — un repo Swift dont le composant est écrit s'entendait dire
 * « implémentation en attente » sur la pull request d'export elle-même.
 *
 * `existe` est injecté partout : ces tests ne touchent pas au disque, donc ils
 * ne peuvent pas passer au vert grâce à un fichier du repo qui se trouverait là
 * par hasard.
 */
import assert from "node:assert/strict";
import { sep } from "node:path";
import test from "node:test";
import {
  cheminImplementation,
  identifiantDuContrat,
  implementationPresente,
} from "@ucm-kit/core/lecteurs";
import { MOTIF_IMPLEMENTATION_PAR_DEFAUT } from "@ucm-kit/core/format";

/** Un chemin attendu, écrit avec les séparateurs de la plateforme hôte. */
const chemin = (...segments) => segments.join(sep);

test("l'identifiant d'un contrat est son nom de base, sans le suffixe", () => {
  assert.equal(identifiantDuContrat("src/components/Button/Button.contract.json"), "Button");
  assert.equal(identifiantDuContrat("Alert.contract.json"), "Alert");
});

test("le motif par défaut place l'implémentation à côté de son contrat", () => {
  assert.equal(
    cheminImplementation("src/components/Button/Button.contract.json"),
    chemin("src", "components", "Button", "Button.tsx"),
  );
});

test("une cible non-React se décrit par son seul motif", () => {
  // Le point de toute la tâche : aucune de ces deux cibles n'écrit de `.tsx`,
  // et le noyau les sert sans connaître ni Swift ni Kotlin.
  assert.equal(
    cheminImplementation("contracts/Button.contract.json", "Sources/UI/{id}.swift"),
    chemin("Sources", "UI", "Button.swift"),
  );
  assert.equal(
    cheminImplementation("ui/Alert.contract.json", "{dir}/{id}.kt"),
    chemin("ui", "Alert.kt"),
  );
});

test("un motif qui répète un jeton le remplace partout", () => {
  // `replaceAll` et non `replace` : un motif `{id}/{id}.ts` est plausible pour
  // une cible qui range chaque composant dans son propre dossier, et un seul
  // remplacement y laisserait un `{id}` littéral dans le chemin.
  assert.equal(
    cheminImplementation("c/Card.contract.json", "{dir}/{id}/{id}.ts"),
    chemin("c", "Card", "Card.ts"),
  );
});

test("l'existence répond oui quand le fichier que le motif nomme est là", () => {
  const vus = [];
  const present = implementationPresente("src/Button.contract.json", {
    existe: (c) => {
      vus.push(c);
      return true;
    },
  });
  assert.equal(present, true);
  // La question posée au disque est bien celle du motif, et une seule fois :
  // sans cette assertion, une implémentation qui chercherait à tâtons
  // plusieurs extensions passerait ce test sans qu'on le sache.
  assert.deepEqual(vus, [chemin("src", "Button.tsx")]);
});

test("l'existence répond non quand il ne l'est pas, et ne devine rien", () => {
  assert.equal(
    implementationPresente("src/Button.contract.json", { existe: () => false }),
    false,
  );
});

test("le motif choisi est celui que l'existence interroge", () => {
  const vus = [];
  implementationPresente("contracts/Tile.contract.json", {
    motif: "Sources/{id}.swift",
    existe: (c) => {
      vus.push(c);
      return false;
    },
  });
  assert.deepEqual(vus, [chemin("Sources", "Tile.swift")]);
});

test("le motif par défaut est publié, pour qu'un appelant puisse le citer", () => {
  assert.equal(MOTIF_IMPLEMENTATION_PAR_DEFAUT, "{dir}/{id}.tsx");
});

test("un motif qui n’est pas du texte est refusé, en nommant le coupable", () => {
  // Le cas réel, et il n'est pas théorique : `contrats.map(cheminDuComposant)`
  // passe l'index de `map` en second argument. Sans ce refus, la panne était un
  // `replaceAll is not a function` levé dans le kit pour une faute commise chez
  // le consommateur — le pire endroit où lire un message d'erreur.
  assert.throws(
    () => cheminImplementation("src/Button.contract.json", 0),
    (erreur) => erreur instanceof TypeError && /map/.test(erreur.message),
  );
});
