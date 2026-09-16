import test from "node:test";
import assert from "node:assert/strict";
import { libelleNombre, rendreDiagnostic } from "../src/lecteurs/diagnostic-markdown.mjs";

test("libelleNombre choisit le singulier et le pluriel", () => {
  assert.equal(libelleNombre(1, "composant"), "1 composant");
  assert.equal(libelleNombre(2, "composant"), "2 composants");
  assert.equal(libelleNombre(2, "contrat", "contrats"), "2 contrats");
});

test("un diagnostic présente le constat avant l'action et le statut", () => {
  const lignes = rendreDiagnostic({
    severity: "error",
    title: "Le code n'est plus conforme aux contrats",
    count: 2,
    itemSingular: "composant",
    summary: "Les tests de conformité échouent pour :",
    items: ["Alert", "Button"],
    detailsTitle: "Écarts détectés",
    details: ["Alert : le texte utilise un autre style."],
    action: "Un développeur doit mettre à jour les composants.",
    status: "La fusion reste bloquée.",
  });
  const rapport = lignes.join("\n");

  assert.ok(rapport.indexOf("Les tests de conformité") < rapport.indexOf("Alert"));
  assert.ok(rapport.indexOf("Écarts détectés") < rapport.indexOf("Action"));
  assert.ok(rapport.indexOf("Action") < rapport.indexOf("La fusion reste bloquée"));
  assert.doesNotMatch(rapport, /\w+\(s\)/);
  assert.doesNotMatch(rapport, /—/);
});

/**
 * Le rapport part sur GitHub ou sur GitLab, et le kit ne sait pas laquelle.
 * Chaque forme qu'une des deux relierait ou exécuterait part en code.
 */
test("chaque forme qu'une forge relie ou exécute part en code, dans toutes les parties du rapport", () => {
  const formes = {
    "@icons": "`@icons`",
    "#12": "`#12`",
    "!3": "`!3`",
    "~primaire": "`~primaire`",
    '~"deux mots"': '`~"deux mots"`',
    "%v1": "`%v1`",
    "$4": "`$4`",
    "&5": "`&5`",
    "groupe/projet#6": "`groupe/projet#6`",
    "groupe/sous/projet!7": "`groupe/sous/projet!7`",
  };
  for (const [forme, attendu] of Object.entries(formes)) {
    const rapport = rendreDiagnostic({
      severity: "warning",
      title: `Titre ${forme}.`,
      summary: `Résumé ${forme}.`,
      items: [`Élément ${forme}.`],
      details: [`Détail ${forme}.`],
      action: `Action ${forme}.`,
      status: `État ${forme}.`,
    }).join("\n");
    for (const partie of ["Titre", "Résumé", "Élément", "Détail", "Action", "État"]) {
      assert.ok(rapport.includes(`${partie} ${attendu}.`), `${forme} dans ${partie} :\n${rapport}`);
    }
  }
});

test("une ligne qui commencerait une action rapide GitLab part en code", () => {
  const rapport = rendreDiagnostic({ severity: "error", title: "T", action: "Relisez.\n/close\n  /label ~x" }).join("\n");
  assert.match(rapport, /^`\/close`$/m);
  assert.match(rapport, /^ {2}`\/label` `~x`$/m);
});

test("le code, un lien, un pourcentage et une adresse restent tels quels", () => {
  const texte = "Voir `@icons` et `#12`, [le run](https://gitlab.com/g/p/-/jobs/12#L3), 50 % et 100%, a@b.fr, v1!2.";
  const rapport = rendreDiagnostic({ severity: "info", title: "T", summary: texte }).join("\n");
  assert.ok(rapport.includes(texte), rapport);
});
