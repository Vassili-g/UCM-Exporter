/**
 * Un fichier Figma de variables, pour exécuter « Export tokens » hors de Figma.
 *
 * Il couvre ce que la forme de `tokens.json` doit tenir : couleurs opaques,
 * transparentes et de précision élevée, dimensions nulles, fractionnaires et
 * négatives, familles prouvées, ambiguës et sans preuve, graisses reconnues,
 * numériques et libres, durées, easings avec et sans courbe, plusieurs modes,
 * alias directs et en chaîne, cibles absentes, clés héritées
 * d'`Object.prototype`. Figma refuse une boucle d'alias ; le fichier en porte
 * une, parce que l'export doit rester borné si l'API en rendait une.
 *
 * `exporterLeFichier` pose un `figma` minimal le temps d'un export, puis rend
 * celui qui était là : un test qui échoue ne laisse pas son faux runtime aux
 * suivants.
 */
import { handleExportTokens } from '../src/tokens/exportTokens';
import type { TokensExport } from '../src/tokens/exportTokens';

/** Les trois valeurs que `figma.root.documentColorProfile` peut prendre. */
export type ProfilColorimetrique = 'SRGB' | 'DISPLAY_P3' | 'LEGACY';

/** Les collections et les variables, dans l'ordre où l'API les rendrait. */
export type FichierDeVariables = {
  collections: VariableCollection[];
  variables: Variable[];
  /** Les text styles locaux, dont les liaisons prouvent l'usage d'une famille. */
  textStyles: TextStyle[];
};

type Valeur = VariableValue | undefined;

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
const rgba = (r: number, g: number, b: number, a: number) => ({ r, g, b, a });
const bezier = (x1: number, y1: number, x2: number, y2: number) =>
  ({ type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1, y1, x2, y2 } }) as MotionEasing;
const easing = (type: MotionEasing['type']) => ({ type }) as MotionEasing;

/** Un text style local, réduit à ce que l'export en lit. */
function textStyle(
  name: string,
  boundVariables: Partial<Record<VariableBindableTextField, VariableAlias>>,
): TextStyle {
  return { id: `style-${name}`, name, type: 'TEXT', boundVariables } as unknown as TextStyle;
}

function collection(id: string, name: string, modes: string[]): VariableCollection {
  const modesFigma = modes.map((mode, rang) => ({ modeId: `${id}:${rang}`, name: mode }));
  return {
    id,
    name,
    modes: modesFigma,
    defaultModeId: modesFigma[0].modeId,
    variableIds: [],
  } as unknown as VariableCollection;
}

/** Une variable dont chaque mode reçoit la valeur de même rang ; `undefined` laisse le mode vide. */
function variable(
  proprietaire: VariableCollection,
  id: string,
  name: string,
  resolvedType: VariableResolvedDataType,
  valeurs: Valeur[],
  scopes: VariableScope[] = ['ALL_SCOPES'],
): Variable {
  const valuesByMode: Record<string, VariableValue> = {};
  proprietaire.modes.forEach((mode, rang) => {
    const valeur = valeurs[rang];
    if (valeur !== undefined) valuesByMode[mode.modeId] = valeur;
  });
  (proprietaire.variableIds as string[]).push(id);
  return {
    id, name, resolvedType, scopes, valuesByMode, variableCollectionId: proprietaire.id,
  } as unknown as Variable;
}

/** Le fichier complet, reconstruit à chaque appel : un test peut le modifier sans toucher aux autres. */
export function fichierDeVariables(): FichierDeVariables {
  const primitives = collection('primitives', 'Primitives', ['Mode 1']);
  const marques = collection('marques', 'Brand Tokens', ['Intencial', 'Marque 2']);
  const semantique = collection('semantique', 'Semantic', ['Mode 1']);
  const cles = collection('cles', 'Keys', ['constructor', '__proto__', 'prototype']);

  const variables = [
    variable(primitives, 'rouge', 'color/red', 'COLOR', [rgba(1, 0, 0, 1)]),
    variable(primitives, 'transparent', 'color/transparent', 'COLOR', [rgba(0, 0, 0, 0)]),
    variable(primitives, 'demi', 'color/half', 'COLOR', [rgba(1, 1, 1, 0.5)]),
    variable(primitives, 'precise', 'color/precise', 'COLOR', [
      rgba(0.123456789, 0.987654321, 0.3333333333333333, 1),
    ]),
    variable(primitives, 'vert', 'color/green', 'COLOR', [rgba(0, 1, 0, 1)]),
    variable(primitives, 'zero', 'dimensions/none', 'FLOAT', [0]),
    variable(primitives, 'quatre', 'dimensions/4', 'FLOAT', [4]),
    variable(primitives, 'demi-pixel', 'dimensions/0,5', 'FLOAT', [0.5]),
    variable(primitives, 'negatif', 'dimensions/negative', 'FLOAT', [-2]),
    variable(primitives, 'famille', 'fontfamily/base', 'STRING', ['Open Sans']),
    variable(primitives, 'regular', 'fontweight/regular', 'STRING', ['Regular']),
    variable(primitives, 'bold', 'fontweight/bold', 'STRING', ['Bold']),
    variable(primitives, 'semibold', 'font-weight/semibold', 'STRING', ['SemiBold']),
    variable(primitives, 'numerique', 'fontweight/numeric', 'STRING', ['700']),
    variable(primitives, 'libre', 'fontweight/free', 'STRING', ['Condensed']),
    variable(primitives, 'opacite', 'opacity/disabled', 'FLOAT', [0.4]),
    variable(primitives, 'graisse-float', 'graisse', 'FLOAT', [600], ['FONT_WEIGHT']),
    variable(primitives, 'drapeau', 'flags/visible', 'BOOLEAN', [true]),
    // Une preuve par scope : la variable n'est offerte qu'au champ Font family.
    variable(primitives, 'famille-mono', 'fontfamily/mono', 'STRING', ['Roboto Mono'],
      ['FONT_FAMILY']),
    variable(primitives, 'famille-sans-preuve', 'fontfamily/unbound', 'STRING', ['Inter']),
    variable(primitives, 'famille-conflit', 'fontfamily/conflit', 'STRING', ['Open Sans']),
    variable(primitives, 'duree-rapide', 'timing/fast', 'TIMING', [0.20000000298023224]),
    variable(primitives, 'duree-nulle', 'timing/none', 'TIMING', [0]),
    variable(primitives, 'easing-lineaire', 'easing/linear', 'EASING', [easing('LINEAR')]),
    variable(primitives, 'easing-depassement', 'easing/overshoot', 'EASING', [
      bezier(0.34, 1.56, 0.64, 1),
    ]),
    // Les cinq suivantes n'ont aucune courbe cubique : l'export les écarte et
    // les nomme, une par cause.
    variable(primitives, 'easing-preregle', 'easing/ease-out', 'EASING', [easing('EASE_OUT')]),
    variable(primitives, 'easing-ressort', 'easing/spring', 'EASING', [{
      type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.4 },
    } as MotionEasing]),
    variable(primitives, 'easing-tenue', 'easing/hold', 'EASING', [easing('HOLD')]),
    variable(primitives, 'easing-sans-points', 'easing/incomplete', 'EASING', [
      easing('CUSTOM_CUBIC_BEZIER'),
    ]),
    variable(primitives, 'easing-abscisse', 'easing/out-of-range', 'EASING', [
      bezier(1.1, 0, 0.64, 1),
    ]),

    variable(marques, 'primaire', 'primary/default', 'COLOR', [alias('rouge'), rgba(0, 0, 1, 1)]),
    variable(marques, 'chaine', 'primary/chain', 'COLOR', [alias('primaire'), alias('primaire')]),
    variable(marques, 'rayon', 'radius/base', 'FLOAT', [alias('quatre'), 8]),
    variable(marques, 'titre', 'fontweight/heading', 'STRING', ['Bold', 'SemiBold']),
    variable(marques, 'mixte', 'fontweight/mixed', 'STRING', ['Bold', 'Condensed']),
    variable(marques, 'corps', 'fontweight/body', 'STRING', [alias('regular'), 'Medium']),
    variable(marques, 'vers-chaine', 'fontweight/numeric', 'STRING', [
      alias('numerique'), alias('numerique'),
    ]),
    variable(marques, 'poids-du-titre', 'typography/heading-weight', 'STRING', [
      alias('bold'), alias('semibold'),
    ]),
    variable(marques, 'famille-du-titre', 'typography/family', 'STRING', [
      alias('famille'), alias('famille'),
    ]),
    variable(marques, 'incomplet', 'fontweight/incomplete', 'STRING', ['Bold', undefined]),
    variable(marques, 'famille-multi', 'typography/family-multi', 'STRING', [
      'Open Sans', 'Roboto Mono',
    ], ['FONT_FAMILY']),
    variable(marques, 'easing-marque', 'easing/brand', 'EASING', [
      easing('LINEAR'), bezier(0.4, 0, 0.2, 1),
    ]),
    // Un seul mode sans courbe suffit à écarter la variable entière.
    variable(marques, 'easing-mixte', 'easing/mixed', 'EASING', [
      easing('LINEAR'), easing('BOUNCY'),
    ]),

    variable(semantique, 'chaine-de-poids', 'text/weight', 'STRING', [alias('poids-du-titre')]),
    variable(semantique, 'couleur-orpheline', 'broken/color', 'COLOR', [alias('absente')]),
    variable(semantique, 'poids-orphelin', 'fontweight/broken', 'STRING', [alias('absente')]),
    variable(semantique, 'boucle-a', 'fontweight/loop-a', 'STRING', [alias('boucle-b')]),
    variable(semantique, 'boucle-b', 'fontweight/loop-b', 'STRING', [alias('boucle-a')]),
    variable(semantique, 'interligne', 'lineheight/base', 'FLOAT', [alias('quatre')]),
    variable(semantique, 'espacement', 'spacing/chain', 'FLOAT', [alias('rayon')]),
    variable(semantique, 'duree-aliasee', 'motion/duration', 'TIMING', [alias('duree-rapide')]),
    variable(semantique, 'easing-aliasee', 'motion/easing', 'EASING', [alias('easing-depassement')]),
    variable(semantique, 'easing-orpheline', 'motion/broken-easing', 'EASING', [
      alias('easing-ressort'),
    ]),

    variable(cles, 'proto', '__proto__/primary', 'COLOR', [
      rgba(1, 0, 0, 1), rgba(0, 1, 0, 1), rgba(0, 0, 1, 1),
    ]),
    variable(cles, 'constructeur', 'constructor/primary', 'COLOR', [
      rgba(1, 0, 0, 1), rgba(0, 1, 0, 1), rgba(0, 0, 1, 1),
    ]),
    variable(cles, 'prototype', 'prototype/primary', 'COLOR', [
      rgba(1, 0, 0, 1), rgba(0, 1, 0, 1), rgba(0, 0, 1, 1),
    ]),
    variable(cles, 'dollar-value', '$value/primary', 'FLOAT', [1, 2, 3]),
    variable(cles, 'dollar-type', '$type/primary', 'FLOAT', [1, 2, 3]),
  ];

  // « Heading/H1 » prouve la famille de `primitives.fontfamily.base`, et la
  // propage à `brand-tokens.typography.family` qui l'alias. « Body/Italic »
  // relie la même variable à deux champs de chaîne : preuve et conflit sur la
  // même composante.
  const textStyles = [
    textStyle('Heading/H1', { fontFamily: alias('famille'), fontWeight: alias('bold') }),
    textStyle('Body/Italic', {
      fontFamily: alias('famille-conflit'), fontStyle: alias('famille-conflit'),
    }),
  ];

  return { collections: [primitives, marques, semantique, cles], variables, textStyles };
}

/**
 * Exporte le fichier sous un profil colorimétrique, comme la commande le ferait
 * dans Figma, et rend ce que l'UI recevrait.
 */
export async function exporterLeFichier(
  { profil = 'SRGB', fichier = fichierDeVariables() }:
  { profil?: ProfilColorimetrique; fichier?: FichierDeVariables } = {},
): Promise<TokensExport> {
  const { collections, variables, textStyles } = fichier;
  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    root: { documentColorProfile: profil, name: 'Fichier de variables' },
    getLocalTextStylesAsync: async () => textStyles,
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
      getVariableByIdAsync: async (id: string) =>
        variables.find((entree) => entree.id === id) ?? null,
      getVariableCollectionByIdAsync: async (id: string) =>
        collections.find((entree) => entree.id === id) ?? null,
    },
  };
  try {
    return await handleExportTokens();
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
  }
}
