/**
 * Extraction des text styles de chaque calque texte, sur toute la matrice.
 *
 * Le nom du style décrit son identité Figma ; ses `boundVariables` fournissent
 * les vraies références DTCG. Aucun lien n'est déduit d'une convention de nom.
 */
import normalizeName from '../utils';
import { firstVariableAlias, toRef } from '../variables';
import type { TokenResolver } from '../variables';
import type { VariantMatrix } from './componentTree';
import { textNodes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import type { VariantLayoutNodes } from './layoutNodes';
import { normalizePropValue } from './parsers';
import { assignSlots, composedWrapperSlots } from './slotNames';
import { composedSlotDependencies } from './slotRelations';
import { insertVariantLeaf } from './extractVariantTokens';
import type {
  TextStyleDefinition,
  TextStyleUse,
  TypographyTokens,
  VariantTypography,
} from './types';

type TextStyleLoader = (id: string) => Promise<BaseStyle | null>;

type TextSlot = {
  slotPath: string[];
  textNode: TextNode;
};

type LoadedStyle = {
  id: string;
  key: string;
  definition: TextStyleDefinition;
};

const TYPOGRAPHY_FIELDS: Array<{
  contractField: keyof TypographyTokens;
  figmaFields: VariableBindableTextField[];
  label: string;
}> = [
  { contractField: 'fontFamily', figmaFields: ['fontFamily'], label: 'font family' },
  { contractField: 'fontSize', figmaFields: ['fontSize'], label: 'font size' },
  {
    contractField: 'fontWeight',
    figmaFields: ['fontWeight', 'fontStyle'],
    label: 'font weight',
  },
  { contractField: 'lineHeight', figmaFields: ['lineHeight'], label: 'line height' },
  {
    contractField: 'letterSpacing',
    figmaFields: ['letterSpacing'],
    label: 'letter spacing',
  },
];

/** Nodes qui relient un conteneur à ses textes, textes compris. */
function textBranchNodeIds(root: SceneNode, texts: readonly TextNode[]): Set<string> {
  const ids = new Set<string>();
  for (const text of texts) {
    let current: BaseNode | null | undefined = text;
    while (current && current !== root) {
      if ('id' in current) ids.add(current.id);
      current = current.parent;
    }
  }
  return ids;
}

/**
 * Retrouve les mêmes chemins textuels que `structure.children`.
 *
 * Les règles sont celles de l'extraction, à leur niveau respectif : un slot n'a
 * de parts que s'il porte PLUSIEURS textes (`extractChild` y décide
 * `describesParts`) ; en dessous, la descente continue tant que le node n'est
 * pas un vrai `TEXT` (`extractTextBranch`). Sans cette distinction, le chemin
 * d'une description rangée seule dans un frame désignerait ce frame et non la
 * part que le contrat décrit.
 *
 * Un cadre de dépendances n'est pas une exception : depuis qu'il décrit tous
 * ses calques, ses slots se nomment comme les autres, un rang plus bas.
 */
export function textSlots(
  layoutNode: SceneNode,
  iconNames: ReadonlySet<string> = new Set(),
  composed: ComposedInstances = new Map(),
): TextSlot[] {
  /** Une part interne : la feuille est le calque texte lui-même. */
  const visitPart = (node: SceneNode, slotPath: string[]): TextSlot[] => {
    if (node.type === 'TEXT') return [{ slotPath, textNode: node }];

    const texts = textNodes(node, [], composed);
    if (texts.length === 0) return [];
    const branchIds = textBranchNodeIds(node, texts);
    return assignSlots(node, iconNames, [], composed).flatMap(({ child, slot }) =>
      branchIds.has(child.id) ? visitPart(child, [...slotPath, slot]) : [],
    );
  };

  /**
   * Un slot publié, à quelque profondeur qu'il vive.
   *
   * La règle est celle de `extractChild`, appliquée au même arbre : l'instance
   * d'une dépendance n'a aucun texte à nous, le cadre qui la range décrit tous
   * ses calques — donc on y descend —, un slot à un seul texte est une feuille,
   * et un slot à plusieurs textes décrit ses parts. `composedWrapperSlots`
   * tranche le seul cas ambigu : un cadre dont aucune branche ne mène à une
   * dépendance ne publie rien, et y descendre désignerait des slots que
   * `structure.children` ne contient pas.
   */
  const visitSlot = (child: SceneNode, slotPath: string[]): TextSlot[] => {
    if (composed.has(child.id)) return [];
    if (composedSlotDependencies(child, composed).length > 0) {
      return composedWrapperSlots(assignSlots(child, iconNames, [], composed), composed)
        .flatMap(({ child: branch, slot }) => visitSlot(branch, [...slotPath, slot]));
    }
    const texts = textNodes(child, [], composed);
    if (texts.length === 0) return [];
    if (texts.length === 1) return [{ slotPath, textNode: texts[0] }];
    return visitPart(child, slotPath);
  };

  return assignSlots(layoutNode, iconNames, [], composed)
    .flatMap(({ child, slot }) => visitSlot(child, [slot]));
}

/** Lit les liaisons du style lui-même, jamais celles recopiées sur le calque. */
async function loadTextStyle(
  textNode: TextNode,
  resolver: TokenResolver,
  warnings: string[],
  loadStyle: TextStyleLoader,
): Promise<LoadedStyle | null> {
  const styleId = textNode.textStyleId;
  if (typeof styleId !== 'string' || !styleId) {
    warnings.push(
      `Layer « ${textNode.name} » : aucun text style unique n'est appliqué. Sa typographie ` +
        `manquera au développeur. Appliquez un text style au layer entier, puis réexportez.`,
    );
    return null;
  }

  const style = await loadStyle(styleId).catch(() => null);
  if (!style || style.type !== 'TEXT') {
    warnings.push(
      `Layer « ${textNode.name} » : le text style appliqué est introuvable. Sa typographie ` +
        `manquera au développeur. Appliquez de nouveau un text style publié, puis réexportez.`,
    );
    return null;
  }

  const key = normalizeName(style.name);
  if (!key) {
    warnings.push(
      `Text style « ${style.name} » sur le layer « ${textNode.name} » : son nom ne produit ` +
        `aucun identifiant exportable. Renommez le style, puis réexportez.`,
    );
    return null;
  }

  const tokens: TypographyTokens = {};
  for (const { contractField, figmaFields, label } of TYPOGRAPHY_FIELDS) {
    let token: string | null = null;
    for (const field of figmaFields) {
      token = await resolver.resolve(firstVariableAlias(style.boundVariables?.[field]), {
        nodeName: style.name,
        field: label,
      });
      if (token) break;
    }
    if (token) tokens[contractField] = toRef(token);
    else {
      warnings.push(
        `Text style « ${style.name} » — ${label} : aucune variable Figma n'est reliée. ` +
          `Cette propriété typographique manquera au développeur. Reliez-la à une variable ` +
          `dans le text style, puis réexportez.`,
      );
    }
  }

  if (Object.keys(tokens).length === 0) return null;
  return { id: styleId, key, definition: { figmaName: style.name, tokens } };
}

/**
 * Extrait le catalogue et son usage exact sur toutes les combinaisons d'axes.
 *
 * `layoutNodes` porte le node de layout déjà élu pour chaque variant
 * (`layoutNodes.ts`). Élire de nouveau ici désignerait parfois un autre node —
 * y compris pour le variant de référence, que le contrat accuserait alors de
 * diverger de lui-même — et toute la typographie disparaîtrait.
 */
export async function extractVariantTypography(
  matrix: VariantMatrix,
  layoutNodes: VariantLayoutNodes,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  iconNames: ReadonlySet<string> = new Set(),
  allowedSlotPaths?: ReadonlySet<string>,
  loadStyle: TextStyleLoader = (id) => figma.getStyleByIdAsync(id),
): Promise<{
  textStyles: Record<string, TextStyleDefinition>;
  variantTypography: VariantTypography;
}> {
  // Les clés viennent du nom normalisé d'un text style Figma. Une `Map` n'a
  // aucune clé héritée : dans un objet littéral, un style nommé « __proto__ »
  // fixerait le prototype au lieu d'occuper une clé, et `variantTypography`
  // citerait un style absent de `textStyles`. Même structure que sa jumelle
  // `styleIdByKey`, qui arbitre déjà les homonymes.
  const textStyles = new Map<string, TextStyleDefinition>();
  const styleIdByKey = new Map<string, string>();
  const styleCache = new Map<string, Promise<LoadedStyle | null>>();
  const variantTypography: VariantTypography = {};
  const axes = matrix.axes.length > 0 ? matrix.axes : ['variant'];

  for (const entry of matrix.variants) {
    const layoutNode = layoutNodes.get(entry.component) ?? entry.component;
    const uses: TextStyleUse[] = [];
    for (const { slotPath, textNode } of textSlots(layoutNode, iconNames, composed)) {
      if (allowedSlotPaths && !allowedSlotPaths.has(JSON.stringify(slotPath))) {
        warnings.push(
          `Variant « ${entry.component.name} » — layer « ${textNode.name} » : son chemin de ` +
            `slots diffère du variant de référence. Son text style ne peut pas être situé dans ` +
            `le contrat. Alignez les branches de texte entre variants, puis réexportez.`,
        );
        continue;
      }
      const styleId = typeof textNode.textStyleId === 'string' ? textNode.textStyleId : '';
      let pending = styleCache.get(styleId);
      if (!pending) {
        pending = loadTextStyle(textNode, resolver, warnings, loadStyle);
        if (styleId) styleCache.set(styleId, pending);
      }
      const loaded = await pending;
      if (!loaded) continue;

      const existingId = styleIdByKey.get(loaded.key);
      if (existingId && existingId !== loaded.id) {
        warnings.push(
          `Text style « ${loaded.definition.figmaName} » : son nom normalisé « ${loaded.key} » ` +
            `est déjà utilisé par un autre text style. Son usage sur le layer ` +
            `« ${textNode.name} » n'est pas exporté. Renommez l'un des deux styles.`,
        );
        continue;
      }
      styleIdByKey.set(loaded.key, loaded.id);
      textStyles.set(loaded.key, loaded.definition);
      uses.push({ slotPath, style: loaded.key });
    }

    const values = matrix.axes.length > 0
      ? entry.values
      : { variant: normalizePropValue(entry.component.name) };
    insertVariantLeaf(variantTypography, axes, values, uses, warnings);
  }

  return { textStyles: Object.fromEntries(textStyles), variantTypography };
}
