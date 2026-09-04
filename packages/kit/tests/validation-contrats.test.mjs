/**
 * Tests purs du schéma minimal et du graphe de composition des contrats.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { champsInvalidesDuContrat } from "../src/lecteurs/validation-contrat.mjs";
import { validerGrapheDesContrats } from "../src/lecteurs/validation-graphe-contrats.mjs";
import { contratCourant, contrat120 } from "./contrats-fabriques.mjs";

function contrat(nom, composes = [], children = []) {
  return {
    name: nom,
    meta: {
      contractVersion: "4.0",
      exportedAt: "2026-07-30T00:00:00.000Z",
      figma: {},
      warnings: [],
    },
    props: {},
    structure: {
      children,
      variantAxes: [],
      variantTokens: {},
      variantStrokes: {},
    },
    stateModel: null,
    rendering: { roles: {} },
    icons: {},
    composes,
    tokensUsed: [],
    intent: null,
  };
}

const document = (chemin, valeur) => ({ chemin, contrat: valeur });

test("un contrat 4.0 complet accepte les blocs vides et les valeurs null prévues", () => {
  assert.deepEqual(champsInvalidesDuContrat(contrat("Button")), []);
});

/**
 * La forme de CHAQUE prop est validée, pas seulement celle du bloc `props`.
 * Sans cela, un enum sans valeurs passait au vert ici puis faisait lever le
 * générateur de types : un plantage de script au lieu d'un diagnostic.
 */
test("une prop enum sans valeurs est diagnostiquée, pas laissée au générateur", () => {
  const casse = contrat("Button");
  casse.props = { size: { type: "enum" } };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["props.size.values"]);
});

test("une liste de valeurs vide ou mal typée est refusée", () => {
  for (const values of [[], ["ok", ""], ["ok", 3]]) {
    const casse = contrat("Button");
    casse.props = { size: { type: "enum", values } };
    assert.deepEqual(champsInvalidesDuContrat(casse), ["props.size.values"]);
  }
});

test("une prop sans type est refusée", () => {
  const casse = contrat("Button");
  casse.props = { size: { values: ["big"] } };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["props.size.type"]);
});

test("un défaut d'enum hors de ses valeurs est refusé", () => {
  const casse = contrat("Button");
  casse.props = { size: { type: "enum", values: ["big", "small"], default: "medium" } };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["props.size.default"]);
});

test("une prop booléenne reste valide sans liste de valeurs", () => {
  const valide = contrat("Button");
  valide.props = { disabled: { type: "boolean", default: false } };
  assert.deepEqual(champsInvalidesDuContrat(valide), []);
});

test("un contrat 4.0 tronqué ne transforme pas composes absent en composant simple", () => {
  const incomplet = contrat("Button");
  delete incomplet.composes;
  delete incomplet.meta.warnings;
  delete incomplet.rendering;

  assert.deepEqual(champsInvalidesDuContrat(incomplet), [
    "meta.warnings",
    "composes",
    "rendering.roles",
  ]);
});

test("les ajouts 4.1 optionnels sont validés lorsqu’ils sont présents", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.1";
  valeur.structure.children = [{
    slot: "content",
    visibilityTargets: [{ visibilityProp: "title", figmaPath: [] }],
  }];
  valeur.icons = {
    circleCheck: {
      policy: "strict",
      figmaName: "circle-check",
      variants: [],
    },
  };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.children[0].visibilityTargets",
    "icons.circleCheck.variants",
  ]);
});

test("les ajouts 4.2 relient chaque icône à un slot réel", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.2";
  valeur.structure.children = [{ slot: "icon", figmaLayer: "circle-info" }];
  valeur.icons = {
    // Les deux icônes se relaient sur le même slot : c'est le cas que la 4.2
    // rend rendable, et il doit rester valide.
    circleInfo: { policy: "strict", figmaName: "circle-info", slot: "icon", size: "{a.base}" },
    circleCheck: { policy: "strict", figmaName: "circle-check", slot: "icon", size: "{a.base}" },
  };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  // Un slot qui n'existe nulle part rendrait l'icône impossible à placer.
  valeur.icons.circleCheck.slot = "icon-2";
  valeur.icons.circleInfo.size = "";
  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "icons.circleInfo.size",
    "icons.circleCheck.slot",
  ]);
});

test("la 4.3 valide les parties textuelles à toute profondeur", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.3";
  valeur.structure.children = [{
    slot: "label",
    figmaLayer: "Text",
    layout: "flex-column",
    gap: "{components.alert.sizes.text-gap}",
    children: [
      {
        slot: "label",
        figmaLayer: "Titre",
        visibilityProp: "title",
        typography: { fontSize: "{components.alert.sizes.title-size}" },
      },
      {
        slot: "label-2",
        figmaLayer: "Description",
        typography: { fontSize: "{components.alert.sizes.description-size}" },
      },
    ],
  }];

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la 4.3 refuse une récursion ambiguë ou mal formée", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.3";
  valeur.structure.children = [
    {
      slot: "label",
      typography: { fontSize: "{a.title}" },
      layout: "diagonal",
      gap: 8,
      children: [{ slot: "", typography: {} }],
    },
    { slot: "content", children: "pas-un-tableau" },
    { slot: "leaf", layout: "flex-row", gap: "{a.gap}" },
  ];

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.children[0].typography",
    "structure.children[0].layout",
    "structure.children[0].gap",
    "structure.children[0].children[0].slot",
    "structure.children[0].children[0].typography",
    "structure.children[1].children",
    "structure.children[2].layout",
    "structure.children[2].gap",
  ]);
});

test("un contrat 4.2 ne peut pas annoncer la récursion introduite en 4.3", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.2";
  valeur.structure.children = [{ slot: "label", children: [{ slot: "label" }] }];

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.children[0].children",
  ]);
});

test("la 4.4 valide le placement Flex du conteneur et de ses slots", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.4";
  valeur.structure.justifyContent = "flex-start";
  valeur.structure.alignItems = "center";
  valeur.structure.children = [
    { slot: "icon" },
    { slot: "label", flexGrow: 1 },
    { slot: "action", alignSelf: "stretch" },
  ];

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la 4.4 refuse un placement Flex incomplet ou hors vocabulaire", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.4";
  valeur.structure.justifyContent = "around";
  valeur.structure.children = [
    { slot: "icon", alignSelf: "middle", flexGrow: 0 },
    { slot: "content", children: [{ slot: "label" }], alignItems: "center" },
  ];

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.justifyContent",
    "structure.alignItems",
    "structure.children[0].alignSelf",
    "structure.children[0].flexGrow",
    "structure.children[1].justifyContent",
  ]);
});

test("un contrat 4.3 ne peut pas annoncer les propriétés Flex introduites en 4.4", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.3";
  valeur.structure.justifyContent = "flex-start";
  valeur.structure.alignItems = "center";
  valeur.structure.children = [{ slot: "label", flexGrow: 1, alignSelf: "stretch" }];

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.justifyContent",
    "structure.alignItems",
    "structure.children[0].alignSelf",
    "structure.children[0].flexGrow",
  ]);
});

test("la 4.5 réserve la font size des slots à la carte des tailles", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.5";
  valeur.structure.sizes = {
    compact: { gap: null, padding: { x: null, y: null }, radius: null, fontSize: "{a.compact}" },
    comfortable: { gap: null, padding: { x: null, y: null }, radius: null, fontSize: "{a.comfortable}" },
  };
  valeur.structure.children = [{
    slot: "content",
    children: [{ slot: "label", typography: { fontWeight: "{a.weight}" } }],
  }];

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  valeur.structure.children[0].children[0].typography.fontSize = "{a.reference}";
  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.children[0].children[0].typography.fontSize",
  ]);
});

test("la 4.6 relie chaque texte de chaque variant à un text style tokenisé", () => {
  const valeur = contrat("Alert");
  valeur.meta.contractVersion = "4.6";
  valeur.structure.variantAxes = ["severity"];
  valeur.structure.children = [{
    slot: "content",
    children: [
      { slot: "label", figmaLayer: "Titre" },
      { slot: "label-2", figmaLayer: "Description" },
    ],
  }];
  valeur.textStyles = {
    "body.large": {
      figmaName: "Body/Large",
      tokens: {
        fontSize: "{typography.body.large.fontsize}",
        letterSpacing: "{typography.body.large.letterspacing}",
      },
    },
    "body.small": {
      figmaName: "Body/Small",
      tokens: { fontSize: "{typography.body.small.fontsize}" },
    },
  };
  valeur.structure.variantTypography = {
    info: [
      { slotPath: ["content", "label"], style: "body.large" },
      { slotPath: ["content", "label-2"], style: "body.small" },
    ],
  };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la 4.6 refuse les anciennes autorités et les liens typographiques orphelins", () => {
  const valeur = contrat("Button");
  valeur.meta.contractVersion = "4.6";
  valeur.structure.children = [{
    slot: "label",
    typography: "Label/Large",
  }];
  valeur.structure.sizes = {
    big: {
      gap: null,
      padding: { x: null, y: null },
      radius: null,
      fontSize: "{legacy.fontsize}",
    },
  };
  valeur.textStyles = {
    "label.large": {
      figmaName: "Label/Large",
      tokens: { fontSize: "{typography.label.large.fontsize}" },
    },
    unused: {
      figmaName: "Unused",
      tokens: { fontSize: "{typography.unused.fontsize}" },
    },
  };
  valeur.structure.variantTypography = {
    default: [
      { slotPath: ["missing"], style: "label.large" },
      { slotPath: ["label"], style: "unknown" },
    ],
  };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.children[0].typography",
    "structure.sizes.big.fontSize",
    "structure.variantTypography.default[0].slotPath",
    "structure.variantTypography.default[1].style",
    "textStyles.unused",
  ]);
});

/**
 * Le dimensionnement rend une absence lisible : sans lui, un slot sans
 * `flexGrow` couvre aussi bien un contenu qui se suffit qu'une largeur imposée.
 */
test("la 4.8 publie le dimensionnement du composant et les deux côtés d’un slot", () => {
  const valeur = contrat("Card");
  valeur.meta.contractVersion = "4.8";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  valeur.structure.children = [
    { slot: "icon", size: "{components.icons.sizes.base}" },
    { slot: "media", size: { width: "{components.card.width}", height: "{components.card.height}" } },
    { slot: "label", size: { width: "{components.card.label-width}" } },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la 4.8 refuse un dimensionnement incomplet ou une taille vide", () => {
  const valeur = contrat("Card");
  valeur.meta.contractVersion = "4.8";
  // `fill` est le mot de Figma : la 4.8 attend celui de CSS.
  valeur.structure.sizing = { width: "fill", height: "fit-content" };
  valeur.structure.children = [
    { slot: "media", size: {} },
    { slot: "label", size: { depth: "{components.card.depth}" } },
    { slot: "icon", size: { width: "16px" } },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.sizing",
    "structure.children[0].size",
    "structure.children[1].size",
    "structure.children[2].size",
  ]);
});

test("un contrat 4.8 sans dimensionnement est incomplet, pas silencieusement fit-content", () => {
  const valeur = contrat("Card");
  valeur.meta.contractVersion = "4.8";
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), ["structure.sizing"]);
});

test("la 5.2 accepte un axe du composant dimensionné par un token", () => {
  // Une tuile carrée dont le design system nomme le côté : la dimension figée
  // décrit le composant, elle ne présente plus le component set.
  const valeur = contrat("TileLink");
  valeur.meta.contractVersion = "5.2";
  valeur.structure.sizing = {
    width: "{components.tilelink.sizes.tile}",
    height: "{components.tilelink.sizes.tile}",
  };
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  // Les deux mots CSS restent valides : un axe qui hug ou qui s'étire n'a
  // aucun token à citer.
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  // Une dimension brute reste refusée — c'est tout l'objet de la règle.
  valeur.structure.sizing = { width: "96px", height: "fit-content" };
  assert.deepEqual(champsInvalidesDuContrat(valeur), ["structure.sizing"]);
});

test("un contrat 5.1 ne peut pas annoncer un dimensionnement tokenisé", () => {
  const valeur = contrat("TileLink");
  valeur.meta.contractVersion = "5.1";
  valeur.structure.sizing = {
    width: "{components.tilelink.sizes.tile}",
    height: "{components.tilelink.sizes.tile}",
  };
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), ["structure.sizing"]);
});

/**
 * Une borne n'est pas une taille : elle s'applique quel que soit le menu de
 * dimensionnement, et le cas courant est celui qu'aucun `size` ne sait écrire —
 * un layer qui remplit son axe sans dépasser une largeur.
 */
test("la 5.3 publie les bornes du composant et celles d’un slot", () => {
  const valeur = contrat("Divider");
  valeur.meta.contractVersion = "5.3";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  valeur.structure.bounds = { maxWidth: "{components.divider.max-width}" };
  valeur.structure.children = [
    {
      slot: "rule",
      flexGrow: 1,
      bounds: {
        minWidth: "{components.divider.min-width}",
        maxWidth: "{components.divider.max-width}",
      },
    },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la 5.3 refuse une borne brute, inconnue ou vide", () => {
  const valeur = contrat("Divider");
  valeur.meta.contractVersion = "5.3";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  // Un nombre écrit à la main est une mesure de maquette : l'Exporter avertit
  // au lieu de le publier, et le validateur refuse qu'il arrive ici.
  valeur.structure.bounds = { maxWidth: "640px" };
  valeur.structure.children = [
    { slot: "rule", bounds: {} },
    { slot: "gutter", bounds: { maxDepth: "{components.divider.max-depth}" } },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.bounds",
    "structure.children[0].bounds",
    "structure.children[1].bounds",
  ]);
});

test("un contrat 5.2 ne peut pas annoncer de bornes", () => {
  const valeur = contrat("Divider");
  valeur.meta.contractVersion = "5.2";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  valeur.structure.bounds = { maxWidth: "{components.divider.max-width}" };
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), ["structure.bounds"]);
});

test("un contrat 4.7 déjà fusionné garde les axes et les mots de Figma", () => {
  const valeur = contrat("Card");
  valeur.meta.contractVersion = "4.7";
  valeur.structure.sizing = { horizontal: "fill", vertical: "hug" };
  valeur.structure.children = [
    { slot: "media", size: { width: "{components.card.width}" } },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  // La forme CSS appartient à la 4.8 : sous 4.7, elle n'est pas reconnue.
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  assert.deepEqual(champsInvalidesDuContrat(valeur), ["structure.sizing"]);
});

test("un contrat 4.6 ne peut pas annoncer le dimensionnement introduit en 4.7", () => {
  const valeur = contrat("Card");
  valeur.meta.contractVersion = "4.6";
  valeur.structure.sizing = { horizontal: "fill", vertical: "hug" };
  valeur.structure.children = [
    { slot: "media", size: { width: "{components.card.width}" } },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.sizing",
    "structure.children[0].size",
  ]);
});

test("le graphe refuse une cible sans contrat local", () => {
  const alert = contrat(
    "Alert",
    [{ component: "Ghost", figmaLayer: "Action" }],
    [{ slot: "action", composes: "Ghost" }],
  );
  const erreurs = validerGrapheDesContrats([document("Alert.json", alert)]);

  assert.deepEqual(erreurs.get("Alert.json"), [
    "La dépendance « Ghost » n’a aucun contrat local.",
  ]);
});

test("le graphe compare la séquence et la cardinalité des slots composés", () => {
  const alert = contrat(
    "Alert",
    [
      { component: "Button", figmaLayer: "Primaire" },
      { component: "Button", figmaLayer: "Secondaire" },
    ],
    [{ slot: "action", composes: "Button" }],
  );
  const erreurs = validerGrapheDesContrats([
    document("Alert.json", alert),
    document("Button.json", contrat("Button")),
  ]);

  assert.deepEqual(erreurs.get("Alert.json"), [
    "`composes` et les slots récursifs de `structure.children` ne décrivent pas la même séquence de dépendances.",
  ]);
});

test("le graphe 4.3 relève une composition descendue dans l'arbre textuel", () => {
  const alert = contrat(
    "Alert",
    [{ component: "Button", figmaLayer: "Action" }],
    [{
      slot: "content",
      children: [{ slot: "action", composes: "Button" }],
    }],
  );
  alert.meta.contractVersion = "4.3";

  const erreurs = validerGrapheDesContrats([
    document("Alert.json", alert),
    document("Button.json", contrat("Button")),
  ]);

  assert.deepEqual(erreurs.get("Alert.json"), []);
});

test("le graphe v8 conserve une dépendance présente seulement dans un variant non-référence", () => {
  const alert = contratV8();
  alert.name = "Alert";
  alert.composes = [{ component: "Button", figmaLayer: "Action" }];
  alert.structure.children = [];
  alert.variants = [
    {
      ...alert.variants[0],
      nodeId: "10:1",
      figmaName: "State=Default",
      values: { state: "default" },
      structure: { ...alert.variants[0].structure, children: [] },
      composes: [],
    },
    {
      ...alert.variants[0],
      nodeId: "10:2",
      figmaName: "State=With action",
      values: { state: "with-action" },
      structure: {
        ...alert.variants[0].structure,
        children: [{ slot: "action", composes: "Button" }],
      },
      composes: [{ component: "Button", figmaLayer: "Action" }],
    },
  ];

  const erreurs = validerGrapheDesContrats([
    document("Alert.json", alert),
    document("Button.json", contrat("Button")),
  ]);

  assert.deepEqual(erreurs.get("Alert.json"), []);
});

test("le graphe v9 résout la composition dans les vues cataloguées", () => {
  const alert = contratV9();
  alert.name = "Alert";
  alert.composes = [{ component: "Button", figmaLayer: "Action" }];
  alert.variantViews.v1 = {
    ...alert.variantViews.v1,
    structure: {
      ...alert.variantViews.v1.structure,
      children: [{ slot: "action", composes: "Button" }],
    },
    composes: [{ component: "Button", figmaLayer: "Action" }],
  };

  const erreurs = validerGrapheDesContrats([
    document("Alert.json", alert),
    document("Button.json", contrat("Button")),
  ]);

  assert.deepEqual(erreurs.get("Alert.json"), []);
});

test("le graphe refuse les noms de contrat dupliqués", () => {
  const erreurs = validerGrapheDesContrats([
    document("a/Button.json", contrat("Button")),
    document("b/Button.json", contrat("Button")),
  ]);

  assert.deepEqual(erreurs.get("a/Button.json"), [
    "Plusieurs contrats déclarent le composant « Button ».",
  ]);
  assert.deepEqual(erreurs.get("b/Button.json"), [
    "Plusieurs contrats déclarent le composant « Button ».",
  ]);
});

test("le graphe refuse deux noms Figma qui produisent le même identifiant de code", () => {
  const erreurs = validerGrapheDesContrats([
    document("a/IconButton.json", contrat("Icon Button")),
    document("b/IconButton.json", contrat("Icon/Button")),
  ]);

  const message =
    "Les noms Figma « Icon Button » et « Icon/Button » donnent le même identifiant de code « IconButton ».";
  assert.deepEqual(erreurs.get("a/IconButton.json"), [message]);
  assert.deepEqual(erreurs.get("b/IconButton.json"), [message]);
});

test("le graphe détecte un cycle de composition", () => {
  const alert = contrat(
    "Alert",
    [{ component: "Card", figmaLayer: "Card" }],
    [{ slot: "card", composes: "Card" }],
  );
  const card = contrat(
    "Card",
    [{ component: "Alert", figmaLayer: "Alert" }],
    [{ slot: "alert", composes: "Alert" }],
  );
  const erreurs = validerGrapheDesContrats([
    document("Alert.json", alert),
    document("Card.json", card),
  ]);

  assert.match(erreurs.get("Alert.json")[0], /Alert → Card → Alert/);
  assert.match(erreurs.get("Card.json")[0], /Alert → Card → Alert/);
});

/**
 * Le passage à la ligne, introduit par la 5.4.
 *
 * `wrap` n'a qu'une valeur légale : le contrat ne publie que les exceptions, et
 * une absence dit déjà « une seule ligne ». `rowGap` n'existe que sous `wrap` —
 * et son absence y vaut le `gap`, la lecture de Figma comme celle de CSS.
 */
test("la 5.4 publie le wrap du composant et celui d’un slot conteneur", () => {
  const valeur = contrat("Tags");
  valeur.meta.contractVersion = "5.4";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  valeur.structure.wrap = true;
  valeur.structure.rowGap = "{components.tags.sizes.row-gap}";
  valeur.structure.children = [
    {
      slot: "ligne",
      layout: "flex-row",
      justifyContent: "flex-start",
      alignItems: "center",
      wrap: true,
      rowGap: "{components.tags.sizes.row-gap}",
      children: [{ slot: "label", figmaLayer: "Tag" }],
    },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la 5.4 refuse un wrap qui n’est pas true et un rowGap sans wrap", () => {
  const valeur = contrat("Tags");
  valeur.meta.contractVersion = "5.4";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  valeur.structure.wrap = "wrap";
  valeur.structure.children = [
    { slot: "ligne", rowGap: "{components.tags.sizes.row-gap}" },
  ];
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "structure.wrap",
    "structure.children[0].rowGap",
  ]);
});

test("un contrat 5.3 ne peut pas annoncer de wrap", () => {
  const valeur = contrat("Tags");
  valeur.meta.contractVersion = "5.3";
  valeur.structure.sizing = { width: "stretch", height: "fit-content" };
  valeur.structure.wrap = true;
  valeur.textStyles = {};
  valeur.structure.variantTypography = { default: [] };

  assert.deepEqual(champsInvalidesDuContrat(valeur), ["structure.wrap"]);
});

/** Un contrat de la version demandée, dont la structure est réglée sur mesure. */
function contratVersionne(version, structure) {
  const valeur = contrat("Galerie");
  valeur.meta.contractVersion = version;
  // Depuis la 4.6, la typographie vit dans son propre catalogue et ses usages.
  valeur.textStyles = {};
  valeur.structure = {
    ...valeur.structure,
    layout: "flex-column",
    sizing: { width: "stretch", height: "fit-content" },
    variantTypography: { default: [] },
    ...structure,
  };
  return valeur;
}

/**
 * La grille de la 6.0 et ses pistes de la 7.0.
 *
 * Un conteneur de grille porte des LIGNES sans passer à la ligne : exiger `wrap`
 * à côté de son `rowGap` refusait toute grille correctement tokenisée — c'est ce
 * qui a bloqué le premier export 7.0.
 */
test("une grille complète de la 7.0 est acceptée", () => {
  const valide = contratVersionne("7.0", {
    children: [{
      slot: "tilesgrid",
      layout: "grid",
      columns: 2,
      rows: 2,
      columnSizes: ["1fr", "1fr"],
      rowSizes: [null, "fit-content"],
      columnGap: "{sizes.gap-col}",
      rowGap: "{sizes.gap-row}",
      children: [
        { slot: "tile", columnStart: 1, rowStart: 1 },
        { slot: "tile-2", columnStart: 2, rowStart: 1, columnSpan: 2, justifySelf: "center" },
      ],
    }],
  });
  assert.deepEqual(champsInvalidesDuContrat(valide), []);
});

test("un rowGap sans wrap reste refusé hors d’une grille", () => {
  const casse = contratVersionne("7.0", {
    children: [{
      slot: "cadre",
      layout: "flex-row",
      rowGap: "{sizes.gap-row}",
      children: [{ slot: "label" }],
    }],
  });
  assert.deepEqual(champsInvalidesDuContrat(casse), ["structure.children[0].rowGap"]);
});

test("un champ de grille porteur d’une valeur hors d’une grille est refusé", () => {
  const casse = contratVersionne("7.0", {
    children: [{
      slot: "cadre",
      layout: "flex-row",
      columns: 3,
      children: [{ slot: "label" }],
    }],
  });
  assert.deepEqual(champsInvalidesDuContrat(casse), ["structure.children[0].columns"]);
});

test("un columnGap null hors d’une grille n’affirme rien et passe", () => {
  // La convention du contrat partout ailleurs : `null` dit qu'il n'y a rien à
  // publier, pas qu'il y a une grille.
  const valide = contratVersionne("7.0", { columnGap: null, rowGap: null });
  assert.deepEqual(champsInvalidesDuContrat(valide), []);
});

test("un tableau de pistes qui contredit le nombre de pistes est refusé", () => {
  const casse = contratVersionne("7.0", {
    children: [{
      slot: "tilesgrid",
      layout: "grid",
      rows: 3,
      rowSizes: ["1fr", "1fr"],
      children: [{ slot: "tile" }],
    }],
  });
  assert.deepEqual(champsInvalidesDuContrat(casse), ["structure.children[0].rowSizes"]);
});

test("une grille annoncée par un contrat antérieur à la 6.0 est refusée", () => {
  const casse = contratVersionne("5.5", {
    children: [{ slot: "tilesgrid", layout: "grid", children: [{ slot: "tile" }] }],
  });
  assert.deepEqual(champsInvalidesDuContrat(casse), ["structure.children[0].layout"]);
});

test("les pistes et les ancres sont refusées à un contrat 6.0", () => {
  const casse = contratVersionne("6.0", {
    children: [{
      slot: "tilesgrid",
      layout: "grid",
      rowSizes: ["1fr"],
      children: [{ slot: "tile", rowStart: 1 }],
    }],
  });
  assert.deepEqual(champsInvalidesDuContrat(casse), [
    "structure.children[0].rowSizes",
    "structure.children[0].children[0].rowStart",
  ]);
});

function contratV8() {
  const valeur = contratVersionne("8.0", {});
  valeur.props = {
    icon: {
      type: "instance-swap",
      default: "1:2",
      preferredValues: [{ type: "COMPONENT_SET", key: "icon-key" }],
    },
    content: {
      type: "slot",
      default: "",
      preferredValues: [],
      settings: { stretchChildOnInsert: true },
    },
  };
  const structure = {
    layout: "flex-row",
    sizing: { width: "stretch", height: "fit-content" },
    children: [],
  };
  valeur.variants = [{
    nodeId: "10:1",
    figmaName: "Variant=Default",
    values: {},
    structure,
    tokens: {},
    strokes: {},
    typography: [],
    composes: [],
    icons: {},
  }];
  valeur.propertyBindings = [{
    prop: "icon",
    figmaPropName: "Icon#4:2",
    target: "mainComponent",
    nodeId: "10:4",
    figmaPath: ["Icon"],
    variant: {},
  }];
  valeur.meta.diagnostics = [];
  valeur.meta.coverage = { portable: "complete" };
  return valeur;
}

function contratV9() {
  const valeur = contratV8();
  valeur.meta.contractVersion = "9.0";
  const [variant] = valeur.variants;
  valeur.variantViews = {
    v1: {
      structure: variant.structure,
      typography: variant.typography,
      composes: variant.composes,
      icons: variant.icons,
    },
  };
  valeur.propertyBindingDefinitions = {
    b1: {
      prop: "icon",
      figmaPropName: "Icon#4:2",
      target: "mainComponent",
      figmaPath: ["Icon"],
    },
  };
  valeur.variants = [{
    nodeId: variant.nodeId,
    figmaName: variant.figmaName,
    values: variant.values,
    view: "v1",
    tokens: variant.tokens,
    strokes: variant.strokes,
    bindings: [{ definition: "b1", nodeId: "10:4" }],
  }];
  delete valeur.propertyBindings;
  delete valeur.structure.variantTokens;
  delete valeur.structure.variantStrokes;
  delete valeur.structure.variantTypography;
  return valeur;
}

function contratV10() {
  const valeur = contratV9();
  valeur.meta.contractVersion = "10.0";
  valeur.variantViews.v1.paintPlacements = { fills: {}, strokes: {} };
  return valeur;
}

/** Un contrat 10.2, dont le catalogue d'échantillons est cohérent. */
function contratV102() {
  const valeur = contratV10();
  valeur.meta.contractVersion = "10.2";
  valeur.samples = {
    s1: {
      text: [{ slotPath: ["label"], figmaLayer: "Titre", value: "Bonjour" }],
    },
  };
  valeur.variants[0].sample = "s1";
  return valeur;
}

test("un contrat 10.2 accepte un catalogue d'échantillons dont les renvois existent", () => {
  assert.deepEqual(champsInvalidesDuContrat(contratV102()), []);
});

test("la 10.2 exige le catalogue, même vide", () => {
  const casse = contratV102();
  delete casse.samples;
  delete casse.variants[0].sample;
  assert.deepEqual(champsInvalidesDuContrat(casse), ["samples"]);

  const vide = contratV102();
  vide.samples = {};
  delete vide.variants[0].sample;
  assert.deepEqual(champsInvalidesDuContrat(vide), []);
});

test("la 10.2 refuse un renvoi d'échantillon vers une entrée absente", () => {
  const casse = contratV102();
  casse.variants[0].sample = "s404";
  assert.deepEqual(champsInvalidesDuContrat(casse), [
    "variants[0].sample",
    "samples.s1",
  ]);
});

test("la 10.2 refuse un échantillon que personne ne référence", () => {
  const casse = contratV102();
  casse.samples.s2 = { text: [] };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["samples.s2"]);
});

test("le contenu d'un échantillon n'est jamais validé", () => {
  // C'est la promesse du champ : il donne du contexte, il n'engage personne.
  // Le contrôler ici en ferait une obligation déguisée, et un agent finirait
  // par « corriger » une maquette pour faire passer un garde-fou.
  const libre = contratV102();
  libre.samples.s1 = {
    args: { peuImporte: "n’importe quoi", autre: false },
    text: [{ slotPath: ["slot", "absent"], figmaLayer: "", value: "" }],
    composes: [{ figmaLayer: "X", component: "Inconnu", overrides: [{ figmaPath: [] }] }],
  };
  assert.deepEqual(champsInvalidesDuContrat(libre), []);
});

test("avant la 10.2, un renvoi d'échantillon est une forme inconnue", () => {
  const casse = contratV10();
  casse.variants[0].sample = "s1";
  assert.deepEqual(champsInvalidesDuContrat(casse), ["variants[0].sample"]);
});

test("un contrat 8.0 valide sa projection portable exacte", () => {
  assert.deepEqual(champsInvalidesDuContrat(contratV8()), []);
});

test("un contrat 9.0 résout une vue complète et des bindings normalisés", () => {
  assert.deepEqual(champsInvalidesDuContrat(contratV9()), []);
});

test("un contrat 10.0 situe ses peintures et accepte les côtés tokenisés seuls", () => {
  const valeur = contratV10();
  valeur.variantViews.v1.structure.children = [{
    slot: "scale",
    radius: {
      topLeft: "{sizes.radius-left}",
      bottomLeft: "{sizes.radius-left}",
    },
  }];
  valeur.variants[0].tokens = { surface: "{colors.surface}" };
  valeur.variants[0].strokes = {
    border: { color: "{colors.border}", width: { top: "{sizes.stroke}" }, align: "inside" },
  };
  valeur.variantViews.v1.paintPlacements = {
    fills: { surface: [["scale"]] },
    strokes: { border: [[]] },
  };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("la v10 exige un placement valide pour chaque clé de peinture", () => {
  const valeur = contratV10();
  valeur.variants[0].tokens = { surface: "{colors.surface}" };
  valeur.variantViews.v1.paintPlacements = {
    fills: { surface: [["slot-absent"]] },
    strokes: {},
  };

  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "variantViews.v1.paintPlacements.fills.surface",
  ]);
});

test("la v10 publie les pistes FIXED en px et refuse l'ancien null", () => {
  const valeur = contratV10();
  valeur.variantViews.v1.structure.children = [{
    slot: "tilesgrid",
    layout: "grid",
    columns: 2,
    rows: 2,
    columnSizes: ["1fr", "1fr"],
    rowSizes: ["120px", "fit-content(100%)"],
    children: [{ slot: "tile", columnStart: 1, rowStart: 1 }],
  }];
  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  valeur.variantViews.v1.structure.children[0].rowSizes[0] = null;
  assert.deepEqual(champsInvalidesDuContrat(valeur), [
    "variantViews.v1.structure.children[0].rowSizes",
  ]);
});

test("la v9 refuse une référence orpheline et les anciennes copies parallèles", () => {
  const casse = contratV9();
  casse.variants[0].view = "absente";
  casse.variants[0].structure = casse.variantViews.v1.structure;
  casse.structure.variantTokens = {};
  assert.deepEqual(champsInvalidesDuContrat(casse), [
    "structure.variantTokens",
    "variants[0].view",
    "variants[0].structure",
    "variantViews.v1",
  ]);
});

test("la v9 refuse une définition de binding inutilisée ou inconnue", () => {
  const casse = contratV9();
  casse.variants[0].bindings[0].definition = "absente";
  assert.deepEqual(champsInvalidesDuContrat(casse), [
    "variants[0].bindings[0]",
    "propertyBindingDefinitions.b1",
  ]);
});

test("une icône modifiable peut réutiliser sa prop INSTANCE_SWAP native", () => {
  const valeur = contratV8();
  valeur.icons = {
    glyph: {
      policy: "modifiable",
      figmaName: "Glyph",
      runtimeProp: "icon",
    },
  };
  assert.deepEqual(champsInvalidesDuContrat(valeur), []);

  valeur.icons.glyph.runtimeProp = "content";
  assert.deepEqual(champsInvalidesDuContrat(valeur), ["icons.glyph.runtimeProp"]);
});

test("une prop enum de wrapper reste valide sans devenir un axe de variante", () => {
  const valeur = contratV8();
  valeur.props.wrapperMode = {
    type: "enum",
    values: ["compact", "comfortable"],
    default: "comfortable",
  };
  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("les feuilles exactes refusent les tokens bruts et les strokes incomplets", () => {
  const casse = contratV8();
  casse.variants[0].tokens = { background: "#fff" };
  casse.variants[0].strokes = {
    border: { color: "{colors.border}", width: { top: "{sizes.stroke}" }, align: "inside" },
  };
  assert.deepEqual(champsInvalidesDuContrat(casse), [
    "variants[0].tokens.background",
    "variants[0].strokes.border",
  ]);
});

test("une liaison v8 doit viser une prop et une combinaison réellement publiées", () => {
  const casse = contratV8();
  casse.propertyBindings[0].prop = "inconnue";
  assert.deepEqual(champsInvalidesDuContrat(casse), ["propertyBindings[0]"]);
});

test("une valeur d'enum absente de l'API publique est refusée dans une variante exacte", () => {
  const casse = contratV8();
  casse.props.size = { type: "enum", values: ["small", "large"], default: "small" };
  casse.structure.variantAxes = ["size"];
  casse.variants = [
    { ...casse.variants[0], values: { size: "small" } },
    { ...casse.variants[0], nodeId: "10:2", figmaName: "Medium", values: { size: "medium" } },
  ];
  casse.propertyBindings[0].variant = { size: "small" };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["variants[1].values.size"]);
});

test("les valeurs par défaut des enums doivent former une variante réellement présente", () => {
  const casse = contratV8();
  casse.props.variant = { type: "enum", values: ["contained", "outlined"], default: "contained" };
  casse.props.size = { type: "enum", values: ["small", "large"], default: "large" };
  casse.structure.variantAxes = ["variant", "size"];
  casse.structure.variantTypography = {
    contained: { small: [] },
    outlined: { large: [] },
  };
  casse.variants = [
    { ...casse.variants[0], values: { variant: "contained", size: "small" } },
    { ...casse.variants[0], nodeId: "10:2", figmaName: "Outlined", values: { variant: "outlined", size: "large" } },
  ];
  casse.propertyBindings[0].variant = { variant: "contained", size: "small" };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["variants.defaults"]);
});

test("un layer hors flux publie ses bords d’accroche, et seulement des bords connus", () => {
  const valide = contratVersionne("6.0", {
    children: [{
      slot: "badge",
      position: "absolute",
      constraints: { horizontal: "right", vertical: "top" },
    }],
  });
  assert.deepEqual(champsInvalidesDuContrat(valide), []);

  const casse = contratVersionne("6.0", {
    children: [{ slot: "badge", position: "absolute", constraints: { horizontal: "MAX", vertical: "top" } }],
  });
  assert.deepEqual(champsInvalidesDuContrat(casse), ["structure.children[0].constraints"]);
});

/** Une dépendance synthétique qui publie une icône remplaçable. */
function dependanceAIcone(nom, figmaName, runtimeProp) {
  const valeur = contrat(nom);
  valeur.icons = {
    [runtimeProp.replace(/Name$/, "")]: {
      policy: "modifiable",
      figmaName,
      slot: "icon",
      runtimeProp,
    },
  };
  return valeur;
}

/**
 * Un composé dont l'échantillon place `swaps` à la profondeur voulue.
 *
 * `composes` et les slots restent en miroir — c'est un invariant du graphe, et
 * le violer ferait passer un second diagnostic pour une trouvaille de ce test.
 * Seules les dépendances DIRECTES y figurent : une dépendance imbriquée relève
 * du contrat de celle qui la porte.
 */
function composeAvecRemplacement(instances) {
  const directes = instances.map(({ component }) => ({ component, figmaLayer: component }));
  const slots = instances.map(({ component }, index) => ({
    slot: index === 0 ? "slot" : `slot-${index + 1}`,
    composes: component,
  }));
  const valeur = contrat("Root", directes, slots);
  valeur.samples = { s1: { composes: instances } };
  return valeur;
}

test("le graphe accepte un remplacement qui joint une icône de sa dépendance", () => {
  const root = composeAvecRemplacement([{
    figmaLayer: "Branch",
    component: "Branch",
    swaps: [{ masterPath: ["Glyph"], component: "GlyphB" }],
  }]);

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", dependanceAIcone("Branch", "Glyph", "glyphName")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), []);
});

test("le graphe refuse un remplacement qui ne joint aucune icône de sa dépendance", () => {
  const root = composeAvecRemplacement([{
    figmaLayer: "Branch",
    component: "Branch",
    swaps: [{ masterPath: ["Missing"], component: "GlyphB" }],
  }]);

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", dependanceAIcone("Branch", "Glyph", "glyphName")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le remplacement « Missing » de la dépendance « Branch » ne joint aucune icône "
      + "de son contrat. Le designer doit faire correspondre ce nom de layer à une seule "
      + "icône de « Branch », puis réexporter les contrats concernés.",
  ]);
});

test("le graphe refuse une jointure ambiguë entre un remplacement et deux icônes", () => {
  const root = composeAvecRemplacement([{
    figmaLayer: "Branch",
    component: "Branch",
    swaps: [{ masterPath: ["Glyph"], component: "GlyphB" }],
  }]);
  const branch = dependanceAIcone("Branch", "Glyph", "leadingName");
  branch.icons.trailing = {
    policy: "modifiable",
    figmaName: "Glyph",
    slot: "trailing",
    runtimeProp: "trailingName",
  };

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", branch),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le remplacement « Glyph » de la dépendance « Branch » joint 2 icônes de son "
      + "contrat. Le designer doit faire correspondre ce nom de layer à une seule icône de "
      + "« Branch », puis réexporter les contrats concernés.",
  ]);
});

test("le graphe voit un remplacement à n’importe quelle profondeur de composition", () => {
  const root = composeAvecRemplacement([{
    figmaLayer: "Branch",
    component: "Branch",
    composes: [{
      figmaLayer: "Leaf",
      component: "Leaf",
      swaps: [{ masterPath: ["Frame", "Missing"], component: "GlyphB" }],
    }],
  }]);

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    // « Branch » doit DÉCLARER la dépendance que le sample situe sous elle :
    // sans ce couple, le lecteur n'a aucune position où poser le remplacement,
    // et c'est un autre contrôle qui parle en premier.
    document("Branch.json", contrat("Branch", [{ component: "Leaf", figmaLayer: "Leaf" }])),
    document("Leaf.json", dependanceAIcone("Leaf", "Glyph", "glyphName")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le remplacement « Missing » de la dépendance « Leaf » ne joint aucune icône "
      + "de son contrat. Le designer doit faire correspondre ce nom de layer à une seule "
      + "icône de « Leaf », puis réexporter les contrats concernés.",
  ]);
});

test("un masterPath vide ou sans composant est une forme refusée dès la 10.3", () => {
  const casse = contratVersionne("10.3", { children: [] });
  casse.samples = { s1: { composes: [{
    figmaLayer: "Branch",
    component: "Branch",
    swaps: [{ masterPath: [], component: "GlyphB" }],
  }] } };
  casse.variants = [{ ...casse.variants?.[0], sample: "s1" }];

  assert.ok(
    champsInvalidesDuContrat(casse).includes("samples.s1.composes[0].swaps"),
    "un chemin de maître vide ne désigne rien qu'un consommateur puisse joindre",
  );
});

/**
 * Un composé 10.3 dont la vue exacte, `composes` et les slots sont dérivés d'une
 * même liste : seul l'échantillon varie d'un test à l'autre, et les contrôles de
 * séquence du graphe restent muets par construction.
 */
function composeVersionne(dependances, echantillon, slots) {
  const children = slots ?? dependances.map(({ component, figmaLayer }, index) => ({
    slot: index === 0 ? "slot" : `slot-${index + 1}`,
    figmaLayer,
    composes: component,
  }));
  const valeur = contrat("Root", dependances, children);
  valeur.meta.contractVersion = "10.3";
  valeur.variantViews = {
    v1: { structure: { children }, composes: dependances, typography: [], icons: {} },
  };
  valeur.variants = [{ values: {}, view: "v1", sample: "s1" }];
  valeur.samples = { s1: echantillon };
  return valeur;
}

/** Une dépendance synthétique qui publie une surface publique. */
function dependanceAvecSurface(nom, props, extra = {}) {
  const valeur = contrat(nom);
  valeur.props = props;
  return { ...valeur, ...extra };
}

const UNE_DEPENDANCE = [{ component: "Branch", figmaLayer: "Branch" }];

test("le graphe refuse un args que la dépendance ne publie pas", () => {
  // La preuve que les deux contrats ne décrivent plus le même composant : `args`
  // est une projection FERMÉE de la surface publique, une clé qui ne joint rien
  // ne peut donc pas être une tolérance.
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{
      figmaLayer: "Branch",
      component: "Branch",
      args: { inconnue: true },
      slotPath: ["slot"],
    }],
  });

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", dependanceAvecSurface("Branch", {
      mode: { type: "enum", values: ["quiet", "loud"], default: "quiet" },
    })),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le sample pose « inconnue » sur la dépendance « Branch », dont le contrat ne publie "
      + "aucune prop ni axe d'états de ce nom. Réexportez les deux composants depuis "
      + "Figma ; si l'écart persiste, la propriété a été renommée d'un seul côté.",
  ]);
});

test("le graphe refuse une valeur d’enum que la dépendance n’admet pas", () => {
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{
      figmaLayer: "Branch",
      component: "Branch",
      args: { mode: "assourdissant" },
      slotPath: ["slot"],
    }],
  });

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", dependanceAvecSurface("Branch", {
      mode: { type: "enum", values: ["quiet", "loud"], default: "quiet" },
    })),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le sample pose « mode = assourdissant » sur la dépendance « Branch », dont le contrat "
      + "n'admet que « quiet », « loud ». Réexportez les deux composants depuis Figma.",
  ]);
});

test("l’axe d’états est une clé d’args légitime, et un slot n’en est jamais une", () => {
  // `args` porte l'axe d'états sous SA clé pour que le lecteur retrouve le
  // variant, alors que cet axe n'est pas une prop et vit dans `stateModel`.
  // Refuser cette clé-là serait le faux positif le plus facile à écrire.
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{
      figmaLayer: "Branch",
      component: "Branch",
      args: { state: "hover", contenu: "libre" },
      slotPath: ["slot"],
    }],
  });

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", dependanceAvecSurface(
      "Branch",
      { contenu: { type: "slot", default: null, preferredValues: [] } },
      {
        stateModel: {
          axis: "state",
          states: { default: { selector: null }, hover: { selector: ":hover" } },
          precedence: ["hover", "default"],
        },
      },
    )),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le sample pose « contenu » sur la dépendance « Branch », dont la prop est un slot : "
      + "son contenu libre n'est pas une valeur qu'un développeur puisse reconstruire. "
      + "Réexportez les deux composants depuis Figma.",
  ]);
});

test("le graphe refuse une dépendance imbriquée que son propriétaire ne déclare pas", () => {
  // L'adressage est relatif au propriétaire IMMÉDIAT. Sans ce couple chez lui,
  // le lecteur n'a aucune position où poser ce que l'enfant porte, et la seule
  // issue serait la recherche globale par nom que le protocole interdit.
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{
      figmaLayer: "Branch",
      component: "Branch",
      slotPath: ["slot"],
      composes: [{ figmaLayer: "Leaf", component: "Leaf" }],
    }],
  });

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", contrat("Branch")),
    document("Leaf.json", contrat("Leaf")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le sample situe « Leaf » sur le layer « Leaf » à l'intérieur de la dépendance "
      + "« Branch », dont le contrat ne déclare aucune dépendance de ce nom sur ce layer. "
      + "Réexportez les deux composants depuis Figma ; si l'écart persiste, ce layer porte "
      + "dans la maquette un composant que « Branch » ne contient pas.",
  ]);
});

test("le graphe refuse plus d’occurrences imbriquées que la dépendance n’en déclare", () => {
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{
      figmaLayer: "Branch",
      component: "Branch",
      slotPath: ["slot"],
      composes: [
        { figmaLayer: "Leaf", component: "Leaf" },
        { figmaLayer: "Leaf", component: "Leaf" },
      ],
    }],
  });

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", contrat("Branch", [{ component: "Leaf", figmaLayer: "Leaf" }])),
    document("Leaf.json", contrat("Leaf")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le sample situe 2 occurrences de « Leaf » sur le layer « Leaf » à l'intérieur de la "
      + "dépendance « Branch », qui n'en déclare que 1. Réexportez les deux composants "
      + "depuis Figma.",
  ]);
});

test("deux occurrences homonymes déclarées restent deux positions valides", () => {
  // Le pendant du test précédent : la cardinalité MAXIMALE que la dépendance
  // publie est la borne, et deux calques homonymes ne se fondent jamais en un.
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{
      figmaLayer: "Branch",
      component: "Branch",
      slotPath: ["slot"],
      composes: [
        { figmaLayer: "Leaf", component: "Leaf" },
        { figmaLayer: "Leaf", component: "Leaf" },
      ],
    }],
  });
  const branch = contrat("Branch", [
    { component: "Leaf", figmaLayer: "Leaf" },
    { component: "Leaf", figmaLayer: "Leaf" },
  ]);

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", branch),
    document("Leaf.json", contrat("Leaf")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), []);
});

test("le graphe refuse un slotPath qui ne désigne pas exactement un slot", () => {
  // Deux frères peuvent porter le même nom de slot : un chemin qui en joint deux
  // ne dit pas où poser la dépendance.
  const dependances = [
    { component: "Branch", figmaLayer: "Branch" },
    { component: "Branch", figmaLayer: "Branch" },
  ];
  const root = composeVersionne(
    dependances,
    {
      composes: [
        { figmaLayer: "Branch", component: "Branch", slotPath: ["slot"] },
        { figmaLayer: "Branch", component: "Branch", slotPath: ["slot"] },
      ],
    },
    [
      { slot: "slot", figmaLayer: "Branch", composes: "Branch" },
      { slot: "slot", figmaLayer: "Branch", composes: "Branch" },
    ],
  );

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", contrat("Branch")),
  ]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le slotPath « slot » du sample « s1 » désigne 2 slot(s) de la vue exacte au segment "
      + "« slot », au lieu d'un seul. Réexportez ce composant depuis Figma.",
  ]);
});

test("le graphe refuse un slotPath dont le slot compose un autre composant", () => {
  const root = composeVersionne(UNE_DEPENDANCE, {
    composes: [{ figmaLayer: "Branch", component: "Branch", slotPath: ["slot"] }],
  }, [{ slot: "slot", figmaLayer: "Branch", composes: "Leaf" }]);

  const erreurs = validerGrapheDesContrats([
    document("Root.json", root),
    document("Branch.json", contrat("Branch")),
    document("Leaf.json", contrat("Leaf")),
  ]);

  const constats = erreurs.get("Root.json") ?? [];
  assert.ok(constats.includes(
    "Le slotPath « slot » du sample « s1 » désigne un slot qui compose « Leaf », pas "
      + "« Branch ». Réexportez ce composant depuis Figma.",
  ));
});

test("une racine omise est tolérée, une racine désordonnée ne l’est pas", () => {
  // L'Exporter retire de l'échantillon une dépendance que l'arbre publié ne situe
  // pas, sous un simple avertissement. Transformer cette dégradation douce en
  // erreur dure violerait la seule promesse que `samples` ait jamais faite.
  const dependances = [
    { component: "Branch", figmaLayer: "Branch" },
    { component: "Leaf", figmaLayer: "Leaf" },
  ];
  const contrats = [
    document("Branch.json", contrat("Branch")),
    document("Leaf.json", contrat("Leaf")),
  ];

  const omise = composeVersionne(dependances, {
    composes: [{ figmaLayer: "Leaf", component: "Leaf", slotPath: ["slot-2"] }],
  });
  assert.deepEqual(
    validerGrapheDesContrats([document("Root.json", omise), ...contrats]).get("Root.json"),
    [],
  );

  const desordonnee = composeVersionne(dependances, {
    composes: [
      { figmaLayer: "Leaf", component: "Leaf", slotPath: ["slot-2"] },
      { figmaLayer: "Branch", component: "Branch", slotPath: ["slot"] },
    ],
  });
  assert.deepEqual(
    validerGrapheDesContrats([document("Root.json", desordonnee), ...contrats]).get("Root.json"),
    [
      "Le sample « s1 » situe « Branch » sur le layer « Branch », que les dépendances "
        + "exactes de ce variant ne contiennent pas dans cet ordre. Réexportez ce composant "
        + "depuis Figma.",
    ],
  );
});

test("le graphe refuse un texte de sample posé sur un slot inconnu", () => {
  // Le canal le plus volumineux d'un composé, et le seul qui porte le contenu
  // réellement affiché : un chemin qui ne joint aucun slot rend ce texte
  // inatteignable — on le voit, on ne sait pas où l'écrire.
  const root = composeVersionne([], {
    text: [{ slotPath: ["absent"], figmaLayer: "Titre", value: "Bonjour" }],
  }, [{ slot: "present" }]);

  const erreurs = validerGrapheDesContrats([document("Root.json", root)]);

  assert.deepEqual(erreurs.get("Root.json"), [
    "Le slotPath « absent » d'un texte du sample « s1 » désigne 0 slot(s) de la vue exacte "
      + "au segment « absent », au lieu d'un seul. Réexportez ce composant depuis Figma.",
  ]);
});

/**
 * Contrat minimal à la forme courante : des catalogues, des renvois, et rien
 * qui se dérive. Construit ici plutôt que copié d'un export, pour pouvoir
 * exercer un cas qu'aucun composant réel ne produit encore.
 */
test("une structure sans enfant reste valide : un [] ne s'écrit pas", () => {
  // Un composant dont aucun descendant ne porte d'information publiable n'a pas
  // de `children`. La validation matérialise ce que l'élision retire ; sans ce
  // rétablissement elle réclamait le champ à la vue exacte ET à la projection de
  // référence, et refusait un contrat que l'exporteur produit légitimement.
  // Aucun composant du sandbox ne l'exerce, d'où ce montage.
  assert.deepEqual(champsInvalidesDuContrat(contratCourant()), []);
});

test("une structure avec enfants reste valide de la même façon", () => {
  const valeur = contratCourant();
  valeur.viewStructures.st1.children = [{ slot: "label" }];

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("un contrat de la forme courante refuse ce qui se dérive de lui", () => {
  // `tokensUsed` et `meta.warnings` se recalculent depuis le contrat terminé.
  // Les republier rouvrirait le choix entre deux sources de vérité.
  const avecIndex = contratCourant();
  avecIndex.tokensUsed = [];
  assert.deepEqual(champsInvalidesDuContrat(avecIndex), ["tokensUsed"]);

  const avecMiroir = contratCourant();
  avecMiroir.meta.warnings = [];
  assert.deepEqual(champsInvalidesDuContrat(avecMiroir), ["meta.warnings"]);
});

test("un renvoi de vue qui ne pointe nulle part est refusé", () => {
  const valeur = contratCourant();
  valeur.variantViews.v1.structure = "absente";

  assert.ok(champsInvalidesDuContrat(valeur).length > 0);
});

test("un contrat 12.0 qui place, incline et nomme des rôles est accepté", () => {
  assert.deepEqual(champsInvalidesDuContrat(contrat120()), []);
});

/**
 * `inset` rejoint une famille — `position`, `constraints` — que ce fichier
 * vérifie depuis la 6.0. Un membre non contrôlé serait un oubli, pas un choix.
 */
test("une distance d'accroche mal formée est refusée, côté par côté", () => {
  for (const inset of [
    {},                              // rien à publier ne s'écrit pas
    { top: "4" },                    // sans unité, illisible en CSS
    { top: 4 },                      // un nombre n'est pas la forme publiée
    { haut: "4px" },                 // ce côté n'existe pas
    { top: "4px", right: "8em" },    // une unité qui n'est pas celle du format
  ]) {
    const casse = contrat120();
    casse.viewStructures.st1.children[1].inset = inset;
    assert.deepEqual(
      champsInvalidesDuContrat(casse),
      ["viewStructures.st1.children[1].inset"],
      `inset ${JSON.stringify(inset)} aurait dû être refusé`,
    );
  }
});

/**
 * Une rotation part telle quelle dans un `transform`. Mal formée, elle produit
 * un CSS que le navigateur ignore sans erreur : la perte visuelle muette que le
 * projet refuse partout ailleurs.
 */
test("une rotation qui ne serait pas du CSS est refusée", () => {
  for (const rotation of ["45", "45°", "0.5turn", 45, ""]) {
    const casse = contrat120();
    casse.viewStructures.st1.children[1].rotation = rotation;
    assert.deepEqual(
      champsInvalidesDuContrat(casse),
      ["viewStructures.st1.children[1].rotation"],
      `rotation ${JSON.stringify(rotation)} aurait dû être refusée`,
    );
  }
});

test("la rotation du calque de flux est contrôlée comme celle d'un enfant", () => {
  const casse = contrat120();
  casse.viewStructures.st1.rotation = "un quart de tour";
  assert.deepEqual(champsInvalidesDuContrat(casse), ["viewStructures.st1.rotation"]);
});

/**
 * `keyRoles` est un RENVOI : la résolution du format est
 * `roles[keyRoles[côté][clé] ?? clé]`. Un rôle absent de `roles` rend
 * `undefined`, et la couleur disparaît sans un mot.
 */
test("une clé de couleur qui nomme un rôle inexistant est refusée", () => {
  const casse = contrat120();
  casse.rendering.keyRoles = { fills: { "base.surface": "surface" } };
  assert.deepEqual(
    champsInvalidesDuContrat(casse),
    ["rendering.keyRoles.fills.base.surface"],
  );
});

test("un côté que le format ne connaît pas est refusé", () => {
  const casse = contrat120();
  casse.rendering.keyRoles = { effects: { "base.surface": "background" } };
  assert.deepEqual(champsInvalidesDuContrat(casse), ["rendering.keyRoles.effects"]);
});

/**
 * Le contrôle vit dans le validateur de la 11.0 et non dans la passe
 * matérialisée, qui réécrit la version en « 10.3 » : une capacité « au moins
 * 12.0 » y serait toujours fausse. Ce test tient cette raison — un contrat qui
 * publie du 12.0 sous une version antérieure doit être refusé, ce qui n'arrive
 * que si le contrôle voit la version RÉELLE.
 */
test("un champ de la 12.0 publié sous une version antérieure est refusé", () => {
  const casse = contrat120();
  casse.meta.contractVersion = "11.0";
  assert.deepEqual(champsInvalidesDuContrat(casse).sort(), [
    "rendering.keyRoles",
    "viewStructures.st1.children[1].inset",
    "viewStructures.st1.children[1].rotation",
  ]);
});

/**
 * `icons.<clé>.slot` situe une icône que le variant de référence NE contient
 * pas : la chercher dans la seule projection de référence refusait exactement
 * le cas que ce champ existe pour décrire. Le premier contrat réel à en porter
 * une l'a prouvé, et aucun test ne l'avait vu avant lui.
 */
test("une icône reçoit son slot d'un variant que la référence ne montre pas", () => {
  const valeur = contrat120();
  valeur.viewStructures.st2 = {
    layout: "flex-row",
    sizing: { width: "fit-content", height: "fit-content" },
    children: [{ slot: "skull-holder" }],
  };
  valeur.variantViews.v2 = { structure: "st2" };
  valeur.variants.push({ nodeId: "1:3", figmaName: "Warning", values: {}, tokens: {}, view: "v2" });
  valeur.icons = { skull: { policy: "strict", figmaName: "skull", slot: "skull-holder" } };

  assert.deepEqual(champsInvalidesDuContrat(valeur), []);
});

test("un slot d'icône qui n'existe dans aucune structure reste refusé", () => {
  const valeur = contrat120();
  valeur.icons = { skull: { policy: "strict", figmaName: "skull", slot: "nulle-part" } };

  assert.deepEqual(champsInvalidesDuContrat(valeur), ["icons.skull.slot"]);
});

/**
 * La forme canonique ne ment plus sur la version, et rien ne doit l'y ramener.
 *
 * C'est T2.1b. La normalisation écrivait `"10.3"` dans `meta.contractVersion`,
 * si bien que l'objet circulait en affirmant être un contrat 10.3 : un élagage
 * conduit « par raisonnement sur les gates » aurait supprimé le chemin qui
 * valide en réalité tout le 11.0 et le 12.0. La grammaire de lecture est
 * désormais choisie en un seul endroit et ne voyage plus avec la donnée.
 *
 * Ce test lit la SOURCE, et l'assume. La substitution n'est observable par
 * aucun appelant — c'est tout l'intérêt —, donc aucun test de comportement ne
 * peut la surveiller. Un contrôle de source est le seul qui morde ici, et il
 * mord vraiment : réintroduire l'écriture le fait rougir.
 */
test("la normalisation n'écrit aucune version dans le contrat qu'elle rend", () => {
  const source = readFileSync(
    new URL("../src/lecteurs/validation-contrat.mjs", import.meta.url),
    "utf8",
  );
  const debut = source.indexOf("function formeCanonique(");
  assert.ok(debut > 0, "`formeCanonique` a été renommée : ce test ne surveille plus rien");
  const fin = source.indexOf("\n}", debut);
  const corps = source.slice(debut, fin);

  assert.doesNotMatch(
    corps,
    /contractVersion\s*:/,
    "la forme canonique réécrit une version. La grammaire de lecture est un "
      + "paramètre de `champsInvalidesDuContrat` ; l'inscrire dans la donnée "
      + "rend le mensonge à nouveau voyageur.",
  );
});
