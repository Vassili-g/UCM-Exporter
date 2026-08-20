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
import { publishedSlots, publishesChildren } from './structureTree';
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
  /**
   * Le calque PUBLIÉ qui occupe ce slot.
   *
   * Il n'est pas toujours `textNode` : un cadre dont la seule information est un
   * unique texte reste ce texte, et c'est alors le CADRE que l'arbre publie sous
   * ce slot. Qui veut nommer le calque d'un slot doit donc lire celui-ci, sous
   * peine de contredire le `figmaLayer` que la vue publie au même chemin.
   */
  leaf: SceneNode;
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

/**
 * Retrouve les mêmes chemins que `structure.children`, avec la même autorité.
 *
 * `structureTree.publishesChildren` décide de la descente, ici comme dans
 * `extractLayout` : un second calcul finirait par viser un slot que le contrat
 * ne contient pas, et le consommateur refuse une typographie qui désigne un
 * slot absent. La profondeur part de 1, comme celle de l'extraction.
 */
export function textSlots(
  layoutNode: SceneNode,
  iconNames: ReadonlySet<string> = new Set(),
  composed: ComposedInstances = new Map(),
): TextSlot[] {
  const visit = (child: SceneNode, slotPath: string[], depth: number): TextSlot[] => {
    if (composed.has(child.id)) return [];
    if (publishesChildren(child, iconNames, composed, depth)) {
      return publishedSlots(child, iconNames, composed).flatMap(({ child: branch, slot }) =>
        visit(branch, [...slotPath, slot], depth + 1));
    }
    // Une feuille qui enveloppe une dépendance ne porte aucun texte à nous :
    // `describeNode` s'y arrête de la même façon.
    if (composedSlotDependencies(child, composed).length > 0) return [];
    const texts = textNodes(child, [], composed);
    return texts.length === 0 ? [] : [{ slotPath, textNode: texts[0], leaf: child }];
  };

  return publishedSlots(layoutNode, iconNames, composed)
    .flatMap(({ child, slot }) => visit(child, [slot], 1));
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
        `Text style « ${style.name} », ${label} : aucune variable Figma n'est reliée. ` +
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
  pathNotices: string[] = warnings,
): Promise<{
  textStyles: Record<string, TextStyleDefinition>;
  variantTypography: VariantTypography;
  /** Usages exacts par node, même si deux variants partagent leurs coordonnées. */
  typographyByComponent: Map<ComponentNode, TextStyleUse[]>;
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
  const typographyByComponent = new Map<ComponentNode, TextStyleUse[]>();
  const axes = matrix.axes.length > 0 ? matrix.axes : ['variant'];

  for (const entry of matrix.variants) {
    const layoutNode = layoutNodes.get(entry.component) ?? entry.component;
    const uses: TextStyleUse[] = [];
    for (const { slotPath, textNode } of textSlots(layoutNode, iconNames, composed)) {
      if (allowedSlotPaths && !allowedSlotPaths.has(JSON.stringify(slotPath))) {
        pathNotices.push(
          `Variant « ${entry.component.name} », layer « ${textNode.name} » : son chemin de ` +
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
    typographyByComponent.set(entry.component, uses);
    // Cet index reste un détail interne depuis la v9. Les usages exacts sont
    // tous conservés dans les vues, même si deux variants partagent les mêmes
    // coordonnées normalisées.
    insertVariantLeaf(variantTypography, axes, values, uses, []);
  }

  return {
    textStyles: Object.fromEntries(textStyles),
    variantTypography,
    typographyByComponent,
  };
}
