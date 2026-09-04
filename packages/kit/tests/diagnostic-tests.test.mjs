/**
 * Ce qu'une suite de tests rouge dit au designer.
 *
 * Ces cas viennent du consommateur, moins ceux qui portaient sur le TAP : lire
 * la sortie d'un lanceur est un travail d'adaptateur, et il reste chez lui
 * (T5.2). Ce qui est vérifié ici n'a plus besoin d'aucun langage — les échecs
 * arrivent déjà catégorisés, avec un `composant` et un `assertion` que seul
 * l'adaptateur pouvait renseigner.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  diagnosticEchecsDeTests,
  repartirEchecs,
  resumeTerminalEchecsDeTests,
} from "../src/lecteurs/diagnostic-tests.mjs";

test("un test de rendu et un test de garde-fou ne s'adressent pas au même lecteur", () => {
  const { rendu, testsComposants, gardeFous } = repartirEchecs([
    { fichier: "src/components/Alert/Alert.test.tsx", composant: "Alert", assertion: true, test: "un rendu" },
    { fichier: "src/components/Button/Button.test.tsx", composant: "Button", assertion: false, nomErreur: "TypeError", test: "un test cassé" },
    { fichier: "scripts/parite.test.mjs", composant: null, assertion: true, test: "un garde-fou" },
    { fichier: null, composant: null, assertion: true, test: "un lanceur muet" },
  ]);

  assert.deepEqual(rendu.map(({ test: nom }) => nom), ["un rendu"]);
  assert.deepEqual(testsComposants.map(({ test: nom }) => nom), ["un test cassé"]);
  assert.deepEqual(gardeFous.map(({ test: nom }) => nom), ["un garde-fou", "un lanceur muet"]);
});

test("un test de composant interrompu est rapporté sans accuser le rendu", () => {
  const rapport = diagnosticEchecsDeTests({
    echoue: true,
    echecs: [{
      fichier: "src/components/Button/Button.test.tsx",
      composant: "Button",
      assertion: false,
      nomErreur: "TypeError",
      erreur: "Cannot read properties of undefined",
      test: "le token de fond suit le contrat",
    }],
  }, []).join("\n");

  assert.match(rapport, /tests n'ont pas pu vérifier la conformité/);
  assert.match(rapport, /Cannot read properties of undefined/);
  assert.match(rapport, /vérifier la lecture du contrat/);
  assert.doesNotMatch(rapport, /Le code n'est plus conforme aux contrats/);
});

const ECHEC_DE_RENDU = {
  echoue: true,
  echecs: [{
    fichier: "src/components/Alert/Alert.test.tsx",
    composant: "Alert",
    assertion: true,
    test: "le flux Flex 4.4",
  }],
};

test("le rapport nomme le composant et écarte le ré-export quand l’export n’a rien signalé", () => {
  const rapport = diagnosticEchecsDeTests(ECHEC_DE_RENDU, []).join("\n");

  assert.match(rapport, /Alert/);
  assert.match(rapport, /le flux Flex 4\.4/);
  assert.match(rapport, /Réexporter depuis Figma ne corrigera pas ces écarts/);
});

test("un point non décrit interdit d’écarter le ré-export", () => {
  // Une propriété que l'export n'a pas pu décrire manque au contrat, et le
  // test qui la relit échoue pour cette seule raison : c'est bien un ré-export
  // qui débloquera. Affirmer le contraire envoyait le designer à l'opposé.
  const rapport = diagnosticEchecsDeTests(ECHEC_DE_RENDU, [
    "Layer « Size=Medium », gap (variant « medium ») : aucune variable Figma n'est reliée.",
  ]).join("\n");

  assert.match(rapport, /Vérifiez les 1 avertissement/);
  assert.match(rapport, /L'export n'a pas pu décrire certaines informations/);
  assert.match(rapport, /corrigez ce point dans Figma puis réexportez/);
  assert.doesNotMatch(rapport, /Réexporter depuis Figma ne corrigera pas/);
});

test("sans avoir consulté l’export, le rapport ne disculpe pas Figma", () => {
  // Les sorties anticipées publient avant d'avoir lu le moindre contrat :
  // elles ne savent pas si l'export a signalé quelque chose. `null` dit cette
  // ignorance, là où une liste vide affirmerait qu'il n'y a rien.
  const rapport = diagnosticEchecsDeTests(ECHEC_DE_RENDU).join("\n");

  assert.match(rapport, /Alert/);
  assert.doesNotMatch(rapport, /Ré-exporter depuis Figma n’y changera rien|Ré-exporter depuis Figma n'y changera rien/);
  assert.doesNotMatch(rapport, /l'export a signalé/);
});

test("une suite interrompue avant son verdict le dit quand même", () => {
  const rapport = diagnosticEchecsDeTests({ echoue: true, echecs: [] }).join("\n");

  assert.notEqual(rapport, "");
  assert.match(rapport, /consulter les logs de la CI/);
  assert.match(rapport, /La fusion reste bloquée/);
});

test("le problème précède la liste des composants et les écarts", () => {
  const rapport = diagnosticEchecsDeTests({
    echoue: true,
    echecs: [
      { fichier: "src/components/Alert/Alert.test.tsx", composant: "Alert", assertion: true, test: "le texte suit son style" },
      { fichier: "src/components/Button/Button.test.tsx", composant: "Button", assertion: true, test: "le fond suit son token" },
    ],
  }, []).join("\n");

  assert.match(rapport, /^### ❌ Le code n'est plus conforme aux contrats \(2 composants\)/);
  assert.ok(rapport.indexOf("- Alert") < rapport.indexOf("#### Écarts détectés"));
  assert.ok(rapport.indexOf("- Button") < rapport.indexOf("#### Écarts détectés"));
  assert.ok(rapport.indexOf("#### Écarts détectés") < rapport.indexOf("#### Action"));
  assert.doesNotMatch(rapport, /—|Action attendue|Votre export est arrivé|Que faire/);
});

test("une suite au vert n'ajoute aucune section au rapport", () => {
  assert.deepEqual(diagnosticEchecsDeTests({ echoue: false, echecs: [] }), []);
});

/**
 * Le terminal dit la même chose que le rapport, et il le dit avec le chemin :
 * son lecteur est un développeur, qui a besoin d'ouvrir le fichier.
 */
test("le résumé terminal nomme les fichiers et distingue les deux causes", () => {
  const lignes = resumeTerminalEchecsDeTests({
    echoue: true,
    echecs: [
      { fichier: "src/components/Alert/Alert.test.tsx", composant: "Alert", assertion: true, test: "le texte suit son style" },
      { fichier: "src/components/Button/Button.test.tsx", composant: "Button", assertion: false, nomErreur: "TypeError", test: "le fond suit son token" },
    ],
  }).join("\n");

  assert.match(lignes, /✗ src\/components\/Alert\/Alert\.test\.tsx : le texte suit son style/);
  assert.match(lignes, /✗ 2 tests en échec\./);
  assert.match(lignes, /Assertions de rendu en échec/);
  assert.match(lignes, /Tests interrompus par une erreur/);
});

test("une suite au vert ne dit rien au terminal non plus", () => {
  assert.deepEqual(resumeTerminalEchecsDeTests({ echoue: false, echecs: [] }), []);
});
