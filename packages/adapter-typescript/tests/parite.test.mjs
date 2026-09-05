import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  adaptateurTypeScript,
  ecartsDeParite,
  lireApiPublique,
  nomInterfaceAttendue,
} from "../src/index.mjs";

const racinePaquet = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(racinePaquet, "tests", "fixtures", "StressFixture.tsx");

test("la porte publique possède la forme attendue par le noyau", () => {
  assert.deepEqual(Object.keys(adaptateurTypeScript).sort(), [
    "ecartsDeParite",
    "lireApiPublique",
    "nomInterfaceAttendue",
  ]);
  assert.equal(nomInterfaceAttendue(fixture), "StressFixtureProps");
});

test("le relevé résout les props héritées et les BOOLEAN réellement lues", () => {
  const releve = lireApiPublique([fixture], racinePaquet).get(fixture);

  assert.equal(releve.props.label.type, "autre");
  assert.equal(releve.props.label.utilisee, true);
  assert.equal(releve.props.disabled.type, "boolean");
  assert.equal(releve.props.disabled.utilisee, true);
  assert.equal(releve.props.ignored.type, "boolean");
  assert.equal(releve.props.ignored.utilisee, false);
});

test("les vues locales s'additionnent dans une vue et gardent le maximum entre vues", () => {
  const { composants } = lireApiPublique([fixture], racinePaquet).get(fixture);

  assert.deepEqual(Object.fromEntries(composants), { Alert: 1, Button: 3, TileLink: 3 });
  assert.equal(composants.has("VueSimple"), false);
  assert.equal(composants.has("VueDetaillee"), false);
});

/**
 * Le dépliage ne s'arrête pas au premier cran, et une vue partagée compte
 * autant de fois qu'elle est rendue.
 *
 * Un composant réel délègue en cascade — une vue appelle une grille, la grille
 * appelle les dépendances. Un relevé qui ne descendrait que d'un cran
 * annoncerait zéro dépendance là où le contrat en publie sept, et le rapport
 * resterait vert. C'est l'écart que R8 a mesuré ; seul le corpus du
 * consommateur le verrouillait jusqu'ici.
 */
test("le dépliage traverse deux crans de vues locales, et additionne la vue partagée", () => {
  const imbrique = join(racinePaquet, "tests", "fixtures", "VuesImbriqueesFixture.tsx");
  const { composants } = lireApiPublique([imbrique], racinePaquet).get(imbrique);

  // La brève : Alert + une grille de 3. La longue : Button + deux grilles, donc 6.
  assert.deepEqual(Object.fromEntries(composants), { Alert: 1, Button: 1, TileLink: 6 });
  assert.equal(composants.has("Grille"), false, "une vue locale n'est pas une dépendance");
});

/**
 * Une vue locale qui se rend elle-même — un arbre, une liste imbriquée — est
 * une écriture ordinaire. Le relevé doit en sortir avec une cardinalité finie ;
 * sans borne, ce n'est pas un chiffre faux qui sort, c'est `ucm check` qui
 * meurt sur un débordement de pile, et le designer ne reçoit aucun rapport.
 */
test("une vue locale qui se rend elle-même rend une cardinalité finie", () => {
  const recursive = join(racinePaquet, "tests", "fixtures", "VueRecursiveFixture.tsx");
  const { composants } = lireApiPublique([recursive], racinePaquet).get(recursive);

  assert.deepEqual(Object.fromEntries(composants), { TileLink: 1 });
});

test("la comparaison relève props, types, utilisation et cardinalité", () => {
  const releve = lireApiPublique([fixture], racinePaquet).get(fixture);
  const ecarts = ecartsDeParite({
    name: "StressFixture",
    props: {
      disabled: { type: "boolean" },
      ignored: { type: "boolean" },
      mode: { type: "enum", values: ["simple", "detail"] },
      missing: { type: "text" },
    },
    composes: [
      { component: "Alert" },
      { component: "Button" },
      { component: "Button" },
      { component: "Button" },
      { component: "Tile Link" },
      { component: "Tile Link" },
      { component: "Tile Link" },
    ],
  }, releve, "StressFixtureProps");

  assert.deepEqual(ecarts.manquantes, ["missing"]);
  assert.deepEqual(ecarts.booleensNonUtilises, ["ignored"]);
  assert.deepEqual(ecarts.typesIncorrects, []);
  assert.deepEqual(ecarts.compositionsIncorrectes, []);
});

test("un tsconfig racine manque comme précondition explicite", () => {
  assert.throws(
    () => lireApiPublique([fixture], join(racinePaquet, "tests")),
    /exige un tsconfig\.json à la racine/,
  );
});
