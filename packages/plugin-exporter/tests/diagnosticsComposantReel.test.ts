/**
 * Scénario de reproduction des diagnostics relevés sur un component set réel
 * (docs/notes/Recherches/Diagnostics d'un composant réel/).
 *
 * L'arbre est synthétique et ses noms sont neutres. Il réunit les structures
 * qui produisaient les messages en trop : une racine de variant à borne brute
 * et à ombre, un wrapper interne exposé, un composant publié sans règles fait
 * d'un tracé, un texte masqué réglé `Fill`, un calque absolu à côté du wrapper,
 * un axe d'état en `-ed` et une racine atténuée sans variable. Chaque lot du
 * plan fait évoluer l'attendu de la famille qu'il corrige.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { conteneurDeRegles, handleExportComponent, node, regle } from './aides/figmaFaux';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

/** Un fill lié à la variable de couleur du scénario. */
const peintureLiee = () => ({
  fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('fond') } }],
});

/**
 * Ce que le composant publié imbriqué est pour le scénario : sans règles et
 * doté d'une variant property (le composant réel), contracté, ou icône sans
 * propriété.
 */
type Glyphe = 'sans-regles' | 'contracte' | 'icone';

/** Le maître du composant publié imbriqué, dans son component set. */
function maitreDuGlyphe(glyphe: Glyphe) {
  const set = {
    type: 'COMPONENT_SET',
    id: 'set-Glyph',
    name: 'Glyph',
    componentPropertyDefinitions: glyphe === 'icone'
      ? {}
      : { Tone: { type: 'VARIANT', variantOptions: ['Neutral'], defaultValue: 'Neutral' } },
  };
  return { type: 'COMPONENT', id: 'maitre-Glyph', name: 'Tone=Neutral', parent: set };
}

/** Un composant publié imbriqué dont le contenu n'est qu'un tracé. */
function glyphe(nom: string, maitre: ReturnType<typeof maitreDuGlyphe>) {
  const maitreDuTrace = {
    type: 'COMPONENT',
    id: 'maitre-Shape',
    name: 'Shape',
    remote: true,
    componentPropertyDefinitions: {},
  };
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
    getMainComponentAsync: async () => maitre,
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
function wrapper(texteVisible: boolean, maitre: ReturnType<typeof maitreDuGlyphe>) {
  return node('INSTANCE', 'Wrapper', [
    glyphe('Leading', maitre),
    libelle(texteVisible),
    glyphe('Trailing', maitre),
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
function racine(
  etat: string,
  maitre: ReturnType<typeof maitreDuGlyphe>,
  options: { effet?: boolean; texteVisible?: boolean; absolu?: boolean; opacite?: number },
) {
  return node('COMPONENT', `State=${etat}`, [
    wrapper(options.texteVisible ?? true, maitre),
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
    ...(options.opacite !== undefined ? { opacity: options.opacite } : {}),
  });
}

function monterLeScenario(leGlyphe: Glyphe) {
  const maitre = maitreDuGlyphe(leGlyphe);
  const parDefaut = racine('Default', maitre, { texteVisible: false });
  const set = node('COMPONENT_SET', 'Root', [
    parDefaut,
    racine('Focused', maitre, { effet: true }),
    racine('Pressed', maitre, { effet: true, absolu: true }),
    // Atténué sans variable, comme l'état désactivé du composant réel.
    racine('Disabled', maitre, { opacite: 0.5 }),
  ], {
    key: 'cle-root',
    componentPropertyDefinitions: {
      State: {
        type: 'VARIANT',
        variantOptions: ['Default', 'Focused', 'Pressed', 'Disabled'],
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
  const reglesDuGlyphe = leGlyphe === 'contracte' ? [conteneurDeRegles('Glyph')] : [];
  const page = node('PAGE', 'Composants', [set, regles, ...reglesDuGlyphe]);

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
    // Un style par identifiant : le text style du libellé, l'effect style de
    // l'ombre des racines. Un identifiant inconnu n'a pas de style.
    getStyleByIdAsync: async (id: string) => ({
      'style-label': {
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
      },
      'S:ombre': { type: 'EFFECT', id: 'S:ombre', name: 'Shadow/Focus', effects: [ombre] },
    } as Record<string, unknown>)[id] ?? null,
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
 * Les familles dont la cause est le moteur, reconnues à un extrait de leur
 * message. Une famille ne réunit que les messages qu'un même lot fait taire.
 */
const FAMILLES = {
  borneSansVariable: /^Propriété sans token associé\. Des variants déclarent un \*\*min width\*\*/,
  effet: /^Propriété non supportée par le moteur\. Le contrat n’exportera pas l’ombre ou le flou/,
  opaciteDuCalqueAbsolu: /^Layer « Overlay », opacity : le contrat n’a aucun champ/,
  opaciteDeRacine: /^Layer « State=Disabled », opacity : le contrat n’a aucun champ/,
  opaciteSansVariable: /^Layer « Overlay », opacity : aucune variable associée\./,
  opaciteDesVariants: /^opacity : aucune variable associée\. Le contrat ne transmettra pas l'opacité des variants/,
  couleurDOmbre: /^Effect style « Shadow\/Focus », color : aucune variable associée\./,
  cadreSansAutoLayout: /^Layer « Overlay » : il range 2 layers mais n'utilise pas d'auto layout\. Les layers ne se déplaceront pas automatiquement/,
  dimensionSousContrainte: /^Layer « (Mask|Circle) », (width|height) :/,
  resteDuCalqueAbsolu: /^Layer « (Mask », mask|Circle », corner radius|Overlay », width|Overlay », height) :/,
  horsDuNodeElu: /n’est pas à l’intérieur de/,
  dessinImbrique: /^Layer « Shape » : il n’est fait que de tracés vectoriels/,
  imbriqueSansRegles: /^Le composant « Root » intègre « Glyph », dont une propriété n’est pas documentée : tone./,
  hauteurDuTexteMasque: /^Layer « Label », height :/,
  etatNonReconnu: /l'état « (focused|pressed) » n'est pas reconnu/,
  intentionAbsente: /aucune règle @usage, @do, @dont ou @pairs n’est déclarée/,
  regleIconsSansMarqueur: /^Règle @icons « icon-name »/,
} as const;

type Famille = keyof typeof FAMILLES;

/** Les familles qu'un lot du plan a fait taire sur ce scénario. */
const CORRIGEES: ReadonlySet<Famille> = new Set<Famille>([
  'intentionAbsente',
  'etatNonReconnu',
  'hauteurDuTexteMasque',
  'horsDuNodeElu',
  'dessinImbrique',
  'opaciteDuCalqueAbsolu',
  'opaciteDeRacine',
  'effet',
]);

/** Le nombre de lignes de chaque famille dans une liste de messages. */
function compterLesFamilles(messages: readonly string[]): Record<Famille, number> {
  const comptes = {} as Record<Famille, number>;
  for (const [famille, motif] of Object.entries(FAMILLES) as Array<[Famille, RegExp]>) {
    comptes[famille] = messages.filter((message) => motif.test(message)).length;
  }
  return comptes;
}

async function exporterLeScenario(leGlyphe: Glyphe = 'sans-regles') {
  const restaurer = monterLeScenario(leGlyphe);
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);
    return { resultat, contrat, comptes: compterLesFamilles(resultat.warnings) };
  } finally {
    restaurer();
  }
}

test('le scénario du composant réel passe les lois, et seules les familles corrigées se taisent', async () => {
  const { resultat, contrat, comptes } = await exporterLeScenario();

  // Le plugin, `meta.diagnostics` et la demande de fusion lisent la même liste.
  assert.deepEqual(
    contrat.meta.diagnostics.map((diagnostic: { message: string }) => diagnostic.message),
    resultat.warnings,
  );
  for (const [famille, lignes] of Object.entries(comptes) as Array<[Famille, number]>) {
    if (CORRIGEES.has(famille)) {
      assert.equal(lignes, 0, `la famille « ${famille} » sort encore`);
      continue;
    }
    assert.ok(lignes > 0, `la famille « ${famille} » ne sort pas`);
  }
});

test('le calque que l’élection écarte figure dans la vue exacte, et rien ne le dit perdu', async () => {
  const { contrat, comptes } = await exporterLeScenario();
  const vuesQuiLePublient = Object.values(contrat.viewStructures as Record<string, {
    children?: Array<{ slot: string; figmaLayer?: string }>;
  }>).filter((vue) => (vue.children ?? []).some(
    (enfant) => (enfant.figmaLayer ?? enfant.slot) === 'Overlay',
  ));

  assert.equal(comptes.horsDuNodeElu, 0);
  assert.ok(vuesQuiLePublient.length > 0, 'aucune vue exacte ne publie le calque absolu');
});

test('la borne des racines de variant se regroupe en une ligne', async () => {
  const { resultat, comptes } = await exporterLeScenario();
  const cibles = (famille: Famille) =>
    [...resultat.localisations].find(([message]) => FAMILLES[famille].test(message))?.[1];

  assert.equal(comptes.borneSansVariable, 1);
  assert.equal(cibles('borneSansVariable')?.length, 4);
});

test('l’ombre des racines se publie par son effect style, et sa couleur sans variable avertit une fois', async () => {
  const { contrat, comptes } = await exporterLeScenario();

  assert.equal(comptes.couleurDOmbre, 1);
  assert.deepEqual(contrat.effectStyles, {
    'shadow.focus': {
      figmaName: 'Shadow/Focus',
      effects: [{ type: 'drop-shadow', blur: '{tokens.space.x}', spread: '{tokens.space.x}' }],
    },
  });
  const usages = Object.values(contrat.viewEffects as Record<string, unknown[]>);
  assert.deepEqual(usages, [[{ slotPath: [], style: 'shadow.focus' }]]);
});

test('le cadre sans auto layout place ses layers et avertit toujours, une fois', async () => {
  const { contrat, comptes } = await exporterLeScenario();
  const overlay = Object.values(contrat.viewStructures as Record<string, {
    children?: Array<{ figmaLayer?: string; children?: Array<{ position?: string }> }>;
  }>).flatMap((vue) => vue.children ?? []).find((enfant) => enfant.figmaLayer === 'Overlay');

  assert.equal(comptes.cadreSansAutoLayout, 1);
  // Une contrainte ne dispense pas un axe figé de sa variable.
  assert.equal(comptes.dimensionSousContrainte, 4);
  assert.deepEqual(overlay?.children?.map((enfant) => enfant.position), ['absolute', 'absolute']);
});

test('l’opacité sans variable dit une ligne pour le calque et une pour les variants', async () => {
  const { resultat, comptes } = await exporterLeScenario();
  const cibles = (famille: Famille) =>
    [...resultat.localisations].find(([message]) => FAMILLES[famille].test(message))?.[1];

  assert.equal(comptes.opaciteSansVariable, 1);
  assert.equal(comptes.opaciteDesVariants, 1);
  // Seule la racine `Disabled` est atténuée.
  assert.equal(cibles('opaciteDesVariants')?.length, 1);
});

test('un imbriqué sans règles donne son point en tête, en perte de portabilité, et ses dessins se taisent', async () => {
  const { resultat, contrat, comptes } = await exporterLeScenario('sans-regles');
  const diagnostics = contrat.meta.diagnostics as Array<{ code: string; message: string }>;

  assert.match(diagnostics[0].message, FAMILLES.imbriqueSansRegles);
  assert.equal(diagnostics[0].code, 'UCM_PORTABLE_PROJECTION_WARNING');
  assert.equal(contrat.meta.coverage.portable, 'partial');
  assert.equal(comptes.imbriqueSansRegles, 1);
  assert.equal(comptes.dessinImbrique, 0);
  // Une instance par variant et par place : Leading et Trailing, dans les quatre.
  assert.equal(resultat.localisations.get(diagnostics[0].message)?.length, 8);
  const point = resultat.parties.get(diagnostics[0].message);
  assert.equal(point?.severite, 'danger');
  assert.deepEqual(point?.elements, ['tone']);
});

test('un imbriqué contracté ne donne ni point ni dessin', async () => {
  const { comptes } = await exporterLeScenario('contracte');

  assert.equal(comptes.imbriqueSansRegles, 0);
  assert.equal(comptes.dessinImbrique, 0);
});

test('un imbriqué sans propriété qui n’est qu’un dessin garde le message de dessin, sans point', async () => {
  const { resultat, comptes } = await exporterLeScenario('icone');

  assert.equal(resultat.warnings.some((message) => message.includes('intègre « Glyph »')), false);
  assert.equal(comptes.dessinImbrique, 1);
});
