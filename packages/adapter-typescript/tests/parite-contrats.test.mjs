import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ecartsDeParite, lireApiPublique } from "../src/index.mjs";

const racinePaquet = join(dirname(fileURLToPath(import.meta.url)), "..");
const cheminFixture = (nom) => join(racinePaquet, "tests", "fixtures", nom);
const contrat = {
  props: {
    variant: { type: "enum" },
    disabled: { type: "boolean" },
  },
};
const releveConforme = {
  props: {
    variant: { type: "autre", typescript: '"info" | "error" | undefined', utilisee: true },
    disabled: { type: "boolean", typescript: "boolean | undefined", utilisee: true },
  },
  composants: new Map(),
};

test("une implémentation absente et une implémentation non lue restent distinctes", () => {
  const absente = ecartsDeParite(contrat, undefined, "AlertProps");
  const nonLue = ecartsDeParite(contrat, undefined, "AlertProps", {
    presente: true,
    chemin: "Alert.swift",
  });

  assert.equal(absente.implementationAbsente, true);
  assert.equal(absente.implementationNonLue, null);
  assert.equal(nonLue.implementationAbsente, false);
  assert.equal(nonLue.implementationNonLue, "Alert.swift");
});

test("la comparaison relève interface, props, types et BOOLEAN ignorés", () => {
  assert.equal(
    ecartsDeParite(contrat, { props: null }, "AlertProps").interfaceAbsente,
    "AlertProps",
  );
  assert.deepEqual(
    ecartsDeParite(
      contrat,
      { props: { variant: releveConforme.props.variant }, composants: new Map() },
      "AlertProps",
    ).manquantes,
    ["disabled"],
  );
  assert.deepEqual(
    ecartsDeParite(
      contrat,
      {
        props: {
          variant: releveConforme.props.variant,
          disabled: { type: "autre", typescript: "string | undefined", utilisee: true },
        },
        composants: new Map(),
      },
      "AlertProps",
    ).typesIncorrects,
    [{ prop: "disabled", attendu: "boolean", recu: "string | undefined" }],
  );
  assert.deepEqual(
    ecartsDeParite(
      contrat,
      {
        props: {
          variant: releveConforme.props.variant,
          disabled: { type: "boolean", typescript: "boolean | undefined", utilisee: false },
        },
        composants: new Map(),
      },
      "AlertProps",
    ).booleensNonUtilises,
    ["disabled"],
  );
});

test("la composition compare sa cardinalité et son identifiant JSX canonique", () => {
  const compose = {
    ...contrat,
    composes: [
      { component: "Icon / Button" },
      { component: "Icon / Button" },
    ],
  };
  const ecarts = ecartsDeParite(
    compose,
    { ...releveConforme, composants: new Map([["IconButton", 1]]) },
    "AlertProps",
  );

  assert.deepEqual(ecarts.compositionsIncorrectes, [
    { component: "Icon / Button", attendu: 2, rendu: 1 },
  ]);
});

test("le relevé résout les membres hérités", () => {
  const fixture = cheminFixture("ParityFixture.tsx");
  const { props } = lireApiPublique([fixture], racinePaquet).get(fixture);

  assert.equal(props.enabled.type, "boolean");
  assert.equal(props.enabled.utilisee, true);
  assert.equal(props.invalid.type, "autre");
  assert.match(props.invalid.typescript, /string/);
  assert.equal(props.nullable.type, "autre");
  assert.equal(props.ignored.utilisee, false);
});

test("le relevé résout les alias et ignore le JSX extérieur au composant", () => {
  const composee = cheminFixture("ComposedFixture.tsx");
  const exterieure = cheminFixture("CompositionHorsComposantFixture.tsx");
  const releves = lireApiPublique([composee, exterieure], racinePaquet);

  assert.deepEqual(Object.fromEntries(releves.get(composee).composants), {
    ParityFixture: 1,
  });
  assert.equal(releves.get(exterieure).composants.has("ParityFixture"), false);
});

test("le relevé traverse memo(forwardRef(…))", () => {
  const fixture = cheminFixture("EmballeFixture.tsx");
  const releve = lireApiPublique([fixture], racinePaquet).get(fixture);

  assert.equal(releve.fonctionTrouvee, true);
  assert.equal(releve.props.action.utilisee, true);
  assert.equal(releve.composants.get("ParityFixture"), 1);
});

test("une fonction introuvable produit un seul écart structurel", () => {
  const fixture = cheminFixture("SansFonctionFixture.tsx");
  const releve = lireApiPublique([fixture], racinePaquet).get(fixture);
  const ecarts = ecartsDeParite(
    {
      name: "SansFonctionFixture",
      props: { action: { type: "boolean" } },
      composes: [{ component: "Button" }],
    },
    releve,
    "SansFonctionFixtureProps",
  );

  assert.equal(ecarts.fonctionAbsente, "SansFonctionFixture");
  assert.deepEqual(ecarts.booleensNonUtilises, []);
  assert.deepEqual(ecarts.compositionsIncorrectes, []);
});
