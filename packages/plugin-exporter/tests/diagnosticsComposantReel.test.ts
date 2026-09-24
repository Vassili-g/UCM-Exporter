/**
 * Scénario de reproduction des diagnostics relevés sur un component set réel
 * (docs/notes/Recherches/Diagnostics d'un composant réel/).
 *
 * L'arbre est synthétique et ses noms sont neutres. Il réunit les structures
 * qui produisaient les messages en trop : une racine de variant à borne brute
 * et à ombre, un wrapper interne exposé, un composant publié sans règles fait
 * d'un tracé, un texte masqué réglé `Fill`, un calque absolu à côté du wrapper
 * et un axe d'état en `-ed`. Chaque lot du plan fait évoluer l'attendu de la
 * famille qu'il corrige.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { conteneurDeRegles, handleExportComponent, node, regle } from './aides/figmaFaux';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

/** Un fill lié à la variable de couleur du scénario. */
const peintureLiee = () => ({
  fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('fond') } }],
});

/** Un maître de component set, tel que `getMainComponentAsync` le rend. */
function maitreDansUnSet(nomDuSet: string, nomDuVariant: string) {
  const set = { type: 'COMPONENT_SET', name: nomDuSet, componentPropertyDefinitions: {} };
  return { type: 'COMPONENT', id: `maitre-${nomDuSet}`, name: nomDuVariant, parent: set };
}

/** Un composant publié sans règles, à une variant property, qui n'est qu'un tracé. */
function glyphe(nom: string) {
  const maitreDuTrace = { type: 'COMPONENT', id: 'maitre-Shape', name: 'Shape', remote: true };
  const trace = node('INSTANCE', 'Shape', [
    node('VECTOR', 'Vector', [], {
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'FIXED',
      constraints: { horizontal: 'SCALE', vertical: 'SCALE' },
    }),
  ], {
    getMainComponentAsync: async () => maitreDuTrace,
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
  });
  return node('INSTANCE', nom, [trace], {
    variantProperties: { Tone: 'Neutral' },
    componentProperties: { Tone: { type: 'VARIANT', value: 'Neutral' } },
    getMainComponentAsync: async () => maitreDansUnSet('Glyph', 'Tone=Neutral'),
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
}

/**
 * Le texte du wrapper. Masqué, il rend `FIXED` sur l'axe secondaire et garde
 * `layoutAlign: STRETCH` (mesuré dans Figma) ; visible, il rend `FILL`.
 */
function libelle(visible: boolean) {
  return node('TEXT', 'Label', [], {
    characters: 'Label',
    visible,
    textStyleId: 'style-label',
    componentPropertyReferences: { visible: 'Show label#0:1' },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: visible ? 'FILL' : 'FIXED',
    layoutAlign: 'STRETCH',
    layoutGrow: 0,
  });
}

const dimensionsLiees = {
  layoutMode: 'HORIZONTAL',
  primaryAxisAlignItems: 'CENTER',
  counterAxisAlignItems: 'CENTER',
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 0,
  paddingBottom: 0,
  itemSpacing: 8,
  cornerRadius: 0,
  height: 32,
  ...peintureLiee(),
  boundVariables: {
    paddingLeft: alias('px'),
    paddingRight: alias('px'),
    itemSpacing: alias('gap'),
    height: alias('hauteur'),
    fills: [alias('fond')],
  },
};

/** Le set interne du wrapper, dont l'axe `Property 1` porte trois tailles. */
const setDuWrapper = (() => {
  const tailles = ['Small', 'Medium', 'Large'];
  const set = node('COMPONENT_SET', '.Wrapper', tailles.map((taille) => node(
    'COMPONENT',
    `Property 1=${taille}`,
    [],
    { ...dimensionsLiees, variantProperties: { 'Property 1': taille } },
  )), {
    componentPropertyDefinitions: {
      'Property 1': { type: 'VARIANT', variantOptions: tailles, defaultValue: 'Medium' },
    },
  });
  return set;
})();

/** Le wrapper interne exposé : il porte paddings, hauteur et gap liés. */
function wrapper(texteVisible: boolean) {
  return node('INSTANCE', 'Wrapper', [
    glyphe('Leading'),
    libelle(texteVisible),
    glyphe('Trailing'),
  ], {
    isExposedInstance: true,
    getMainComponentAsync: async () => setDuWrapper.children[1],
    variantProperties: { 'Property 1': 'Medium' },
    componentProperties: { 'Property 1': { type: 'VARIANT', value: 'Medium' } },
    ...dimensionsLiees,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'FIXED',
    layoutAlign: 'INHERIT',
    layoutGrow: 0,
  });
}

/** Le calque absolu posé à côté du wrapper, fait de deux rectangles en `SCALE`. */
function overlay() {
  const enScale = { horizontal: 'SCALE', vertical: 'SCALE' };
  return node('INSTANCE', 'Overlay', [
    node('RECTANGLE', 'Mask', [], {
      isMask: true, constraints: enScale, width: 80, height: 32, ...peintureLiee(),
      boundVariables: { fills: [alias('fond')] },
    }),
    node('RECTANGLE', 'Circle', [], {
      constraints: enScale, cornerRadius: 100, width: 32, height: 32, ...peintureLiee(),
      boundVariables: { fills: [alias('fond')] },
    }),
  ], {
    getMainComponentAsync: async () => ({ type: 'COMPONENT', id: 'maitre-overlay', name: '.Overlay' }),
    layoutPositioning: 'ABSOLUTE',
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    opacity: 0.3,
    x: 0,
    y: 0,
    width: 80,
    height: 32,
  });
}

const ombre = {
  type: 'DROP_SHADOW',
  visible: true,
  color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 0 },
  radius: 4,
  spread: 2,
  blendMode: 'NORMAL',
  boundVariables: { radius: alias('px'), spread: alias('px') },
};

/** Une racine de variant : auto layout vertical en hug, `minWidth` sans variable. */
function racine(etat: string, options: { effet?: boolean; texteVisible?: boolean; absolu?: boolean }) {
  return node('COMPONENT', `State=${etat}`, [
    wrapper(options.texteVisible ?? true),
    ...(options.absolu ? [overlay()] : []),
  ], {
    variantProperties: { State: etat },
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    minWidth: 32,
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
    width: 80,
    height: 32,
    ...(options.effet ? { effects: [ombre], effectStyleId: 'S:ombre' } : {}),
  });
}

function monterLeScenario() {
  const parDefaut = racine('Default', { texteVisible: false });
  const set = node('COMPONENT_SET', 'Root', [
    parDefaut,
    racine('Focused', { effet: true }),
    racine('Pressed', { effet: true, absolu: true }),
  ], {
    key: 'cle-root',
    componentPropertyDefinitions: {
      State: {
        type: 'VARIANT',
        variantOptions: ['Default', 'Focused', 'Pressed'],
        defaultValue: 'Default',
      },
      'Show label#0:1': { type: 'BOOLEAN', defaultValue: true },
    },
    defaultVariant: parDefaut,
  });

  const regles = conteneurDeRegles('Root', [
    regle('@usage', [node('TEXT', 'content', [], { characters: '[À compléter] Quand l’employer.' })]),
    // Maître ancien : son calque `icon` écrit un exemple sans le marqueur.
    regle('@icons', [
      node('TEXT', 'icon', [], { characters: 'icon-name' }),
      node('FRAME', 'modifiable', [], { visible: true }),
      node('FRAME', 'strict', [], { visible: true }),
    ]),
  ]);
  const page = node('PAGE', 'Composants', [set, regles]);

  const collection = {
    id: 'collection',
    name: 'Tokens',
    defaultModeId: 'mode',
    modes: [{ modeId: 'mode', name: 'Défaut' }],
  };
  const variable = (id: string, name: string) => ({
    id,
    name,
    variableCollectionId: 'collection',
    resolvedType: 'FLOAT',
    scopes: ['ALL_SCOPES'],
    valuesByMode: { mode: 8 },
  });
  const variables = [
    variable('px', 'space/x'),
    variable('gap', 'space/gap'),
    variable('hauteur', 'size/height'),
    variable('taille', 'font/size'),
    variable('graisse', 'font/weight'),
    variable('interligne', 'font/line-height'),
    variable('approche', 'font/letter-spacing'),
    { ...variable('police', 'font/family'), resolvedType: 'STRING', valuesByMode: { mode: 'Inter' } },
    {
      ...variable('fond', 'color/surface'),
      resolvedType: 'COLOR',
      valuesByMode: { mode: { r: 0, g: 0, b: 0, a: 1 } },
    },
  ];

  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, { selection: [set] }),
    root: { name: 'Fichier de test', children: [page] },
    fileKey: null,
    getStyleByIdAsync: async () => ({
      type: 'TEXT',
      name: 'Label/Medium',
      boundVariables: {
        fontFamily: alias('police'),
        fontSize: alias('taille'),
        fontWeight: alias('graisse'),
        lineHeight: alias('interligne'),
        letterSpacing: alias('approche'),
      },
      fontName: { family: 'Inter', style: 'Regular' },
      textCase: 'ORIGINAL',
      textDecoration: 'NONE',
    }),
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => variables,
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => collection,
    },
  };
  return () => {
    (globalThis as { figma?: unknown }).figma = precedent;
  };
}

/**
 * Les familles du tableau de la section 1 du plan dont la cause est le moteur,
 * reconnues à un extrait de leur message.
 */
const FAMILLES = {
  borneSansVariable: /il fixe min width sans variable Figma/,
  effet: /, effect : le contrat n’a aucun champ/,
  calqueAbsolu: /^Layer « (Overlay|Mask|Circle) »/,
  dessinImbrique: /^Layer « Shape » : il n’est fait que de tracés vectoriels/,
  hauteurDuTexteMasque: /^Layer « Label », height :/,
  etatNonReconnu: /l'état « (focused|pressed) » n'est pas reconnu/,
  intentionAbsente: /aucune règle @usage, @do, @dont ou @pairs n’est déclarée/,
  regleIconsSansMarqueur: /^Règle @icons « icon-name »/,
} as const;

type Famille = keyof typeof FAMILLES;

/** Le nombre de lignes de chaque famille dans une liste de messages. */
function compterLesFamilles(messages: readonly string[]): Record<Famille, number> {
  const comptes = {} as Record<Famille, number>;
  for (const [famille, motif] of Object.entries(FAMILLES) as Array<[Famille, RegExp]>) {
    comptes[famille] = messages.filter((message) => motif.test(message)).length;
  }
  return comptes;
}

async function exporterLeScenario() {
  const restaurer = monterLeScenario();
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);
    return { resultat, contrat, comptes: compterLesFamilles(resultat.warnings) };
  } finally {
    restaurer();
  }
}

test('le scénario du composant réel passe les lois et reproduit ses familles de messages', async () => {
  const { resultat, contrat, comptes } = await exporterLeScenario();

  // Le plugin, `meta.diagnostics` et la demande de fusion lisent la même liste.
  assert.deepEqual(
    contrat.meta.diagnostics.map((diagnostic: { message: string }) => diagnostic.message),
    resultat.warnings,
  );
  for (const [famille, lignes] of Object.entries(comptes)) {
    assert.ok(lignes > 0, `la famille « ${famille} » ne sort pas`);
  }
});
