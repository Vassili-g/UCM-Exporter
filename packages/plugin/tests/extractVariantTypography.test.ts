/** Non-régression du lien TextStyle Figma → tokens → usages par variant. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractVariantTypography, textSlots } from '../src/contract/extractVariantTypography';
import { extractLayout } from '../src/contract/extractLayout';
import { findLayoutNode } from '../src/contract/layoutNodes';
import type { ChildStructure } from '@ucm-kit/core/format';
import { collecterReferences } from '@ucm-kit/core/lecteurs';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

function node(type: string, id: string, name: string, children: any[] = [], extra: object = {}) {
  const result: any = {
    type,
    id,
    name,
    children,
    boundVariables: {},
    ...extra,
  };
  for (const child of children) child.parent = result;
  result.findAll = (predicate: (candidate: any) => boolean) => {
    const found: any[] = [];
    const visit = (items: any[]) => {
      for (const item of items) {
        if (predicate(item)) found.push(item);
        visit(item.children ?? []);
      }
    };
    visit(children);
    return found;
  };
  return result;
}

/**
 * L'élection du node de layout appartient à `layoutNodes.ts` : la typographie
 * la reçoit, elle ne la refait pas. Les tests fournissent le même relevé.
 */
function nodesDeLayout(...components: ComponentNode[]) {
  return new Map(components.map((component) => [component, findLayoutNode(component)]));
}

function variant(name: string, titleStyle: string, bodyStyle: string) {
  const title = node('TEXT', `${name}-title`, 'Titre', [], { textStyleId: titleStyle });
  const body = node('TEXT', `${name}-body`, 'Description', [], { textStyleId: bodyStyle });
  const content = node('FRAME', `${name}-content`, 'Text', [title, body], {
    layoutMode: 'VERTICAL',
  });
  return node('COMPONENT', name, name, [content], {
    layoutMode: 'HORIZONTAL',
    variantProperties: { Size: name },
  }) as ComponentNode;
}

function style(name: string, prefix: string): BaseStyle {
  return {
    type: 'TEXT',
    name,
    boundVariables: {
      fontFamily: alias(`${prefix}-family`),
      fontSize: alias(`${prefix}-size`),
      fontWeight: alias(`${prefix}-weight`),
      lineHeight: alias(`${prefix}-line`),
      letterSpacing: alias(`${prefix}-spacing`),
    },
  } as unknown as BaseStyle;
}

test('textSlots reprend les chemins des parts textuelles récursives', () => {
  const component = variant('Big', 'body-large', 'body-small');

  assert.deepEqual(
    textSlots(component).map(({ slotPath, textNode }) => ({ slotPath, layer: textNode.name })),
    [
      { slotPath: ['label', 'label'], layer: 'Titre' },
      { slotPath: ['label', 'label-2'], layer: 'Description' },
    ],
  );
});

test('extractVariantTypography lie les styles à leurs tokens sur chaque variant', async () => {
  const big = variant('Big', 'body-large', 'body-small');
  const small = variant('Small', 'body-medium', 'body-small');
  const styles: Record<string, BaseStyle> = {
    'body-large': style('Body/Large', 'large'),
    'body-medium': style('Body/Medium', 'medium'),
    'body-small': style('Body/Small', 'small'),
  };
  const tokens = Object.fromEntries(
    ['large', 'medium', 'small'].flatMap((size) => [
      [`${size}-family`, 'primitives.fontfamily.base'],
      [`${size}-size`, `typography.body.${size}.fontsize`],
      [`${size}-weight`, `typography.body.${size}.fontweight`],
      [`${size}-line`, `typography.body.${size}.lineheight`],
      [`${size}-spacing`, `typography.body.${size}.letterspacing`],
    ]),
  );
  const warnings: string[] = [];
  const loads: string[] = [];

  const result = await extractVariantTypography(
    {
      axes: ['size'],
      variants: [
        { values: { size: 'big' }, component: big },
        { values: { size: 'small' }, component: small },
      ],
    },
    nodesDeLayout(big, small),
    resolverFor(tokens),
    warnings,
    new Map(),
    new Set(),
    undefined,
    async (id) => {
      loads.push(id);
      return styles[id] ?? null;
    },
  );

  assert.deepEqual(result.variantTypography, {
    big: [
      { slotPath: ['label', 'label'], style: 'body.large' },
      { slotPath: ['label', 'label-2'], style: 'body.small' },
    ],
    small: [
      { slotPath: ['label', 'label'], style: 'body.medium' },
      { slotPath: ['label', 'label-2'], style: 'body.small' },
    ],
  });
  assert.deepEqual(result.textStyles['body.large'], {
    figmaName: 'Body/Large',
    tokens: {
      fontFamily: '{primitives.fontfamily.base}',
      fontSize: '{typography.body.large.fontsize}',
      fontWeight: '{typography.body.large.fontweight}',
      lineHeight: '{typography.body.large.lineheight}',
      letterSpacing: '{typography.body.large.letterspacing}',
    },
  });
  assert.equal(loads.filter((id) => id === 'body-small').length, 1);
  assert.ok(
    collecterReferences(result).has('{typography.body.small.letterspacing}'),
  );
  assert.deepEqual(warnings, []);
});

test('un texte sans style et une liaison incomplète avertissent sans valeur brute', async () => {
  const component = variant('Big', '', 'body-small');
  const warnings: string[] = [];
  const result = await extractVariantTypography(
    { axes: ['size'], variants: [{ values: { size: 'big' }, component }] },
    nodesDeLayout(component),
    resolverFor({ size: 'typography.body.small.fontsize' }),
    warnings,
    new Map(),
    new Set(),
    undefined,
    async () => ({
      type: 'TEXT',
      name: 'Body/Small',
      boundVariables: { fontSize: alias('size') },
    } as unknown as BaseStyle),
  );

  assert.deepEqual(result.variantTypography, {
    big: [{ slotPath: ['label', 'label-2'], style: 'body.small' }],
  });
  assert.deepEqual(result.textStyles['body.small'].tokens, {
    fontSize: '{typography.body.small.fontsize}',
  });
  assert.ok(warnings.some((warning) => warning.includes('aucun text style unique')));
  assert.ok(warnings.some((warning) => warning.includes('letter spacing')));
});

test('deux variantes aux mêmes coordonnées gardent leurs usages typographiques exacts', async () => {
  const component = (id: string, styleId: string) => node(
    'COMPONENT',
    id,
    `State=${id}`,
    [node('TEXT', `${id}-label`, 'Label', [], { textStyleId: styleId })],
    { layoutMode: 'HORIZONTAL' },
  ) as ComponentNode;
  const first = component('first', 'style-first');
  const second = component('second', 'style-second');
  const styles: Record<string, BaseStyle> = {
    'style-first': {
      type: 'TEXT', name: 'Body/First', boundVariables: { fontSize: alias('first-size') },
    } as unknown as BaseStyle,
    'style-second': {
      type: 'TEXT', name: 'Body/Second', boundVariables: { fontSize: alias('second-size') },
    } as unknown as BaseStyle,
  };
  const warnings: string[] = [];

  const result = await extractVariantTypography(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'focus' }, component: first },
        { values: { state: 'focus' }, component: second },
      ],
    },
    nodesDeLayout(first, second),
    resolverFor({
      'first-size': 'typography.body.first.fontsize',
      'second-size': 'typography.body.second.fontsize',
    }),
    warnings,
    new Map(),
    new Set(),
    undefined,
    async (id) => styles[id] ?? null,
  );

  assert.deepEqual(result.typographyByComponent.get(first), [
    { slotPath: ['label'], style: 'body.first' },
  ]);
  assert.deepEqual(result.typographyByComponent.get(second), [
    { slotPath: ['label'], style: 'body.second' },
  ]);
  assert.deepEqual(result.variantTypography, {
    focus: [{ slotPath: ['label'], style: 'body.first' }],
  });
});

/** Un variant d'un seul calque texte, sous l'axe `state`. */
function variantAUnTexte(id: string, calque: string, extra: object = {}) {
  return node('COMPONENT', id, `State=${id}`, [
    node('TEXT', `${id}-label`, calque, [], { textStyleId: 'overline', ...extra }),
  ], { layoutMode: 'HORIZONTAL' }) as ComponentNode;
}

test('un text style sans variable est publié avec ses literals et sans tokens', async () => {
  const component = variantAUnTexte('default', 'Label', {
    textCase: 'UPPER',
    textAlignHorizontal: 'CENTER',
    textTruncation: 'ENDING',
    maxLines: 2,
  });
  const warnings: string[] = [];

  const result = await extractVariantTypography(
    { axes: ['state'], variants: [{ values: { state: 'default' }, component }] },
    nodesDeLayout(component),
    resolverFor({}),
    warnings,
    new Map(),
    new Set(),
    undefined,
    async () => ({
      type: 'TEXT', name: 'Overline', boundVariables: {}, textCase: 'UPPER',
    } as unknown as BaseStyle),
  );

  assert.deepEqual(result.textStyles.overline, {
    figmaName: 'Overline',
    literals: { textTransform: 'uppercase' },
  });
  assert.deepEqual(result.typographyByComponent.get(component), [{
    slotPath: ['label'],
    style: 'overline',
    textAlign: 'center',
    lineClamp: 2,
    textOverflow: 'ellipsis',
  }]);
  // Chaque propriété sans variable avertit. `textCase`, publié dans literals,
  // n'avertit pas.
  assert.ok(warnings.some((warning) => warning.includes('font size')));
  assert.ok(warnings.every((warning) => !warning.includes('letter case')));
});

test('un calque dont textCase diffère de son text style avertit, même quand le style vient du cache', async () => {
  // `loadTextStyle` ne lit le style qu'une fois : un contrôle placé là ne verrait
  // que « Label », le premier calque rencontré.
  const conforme = variantAUnTexte('default', 'Label', { textCase: 'UPPER' });
  const contredit = variantAUnTexte('hover', 'Libellé', { textCase: 'ORIGINAL' });
  const mixte = variantAUnTexte('press', 'Intitulé', { textCase: Symbol('figma.mixed') });
  const warnings: string[] = [];
  const loads: string[] = [];

  await extractVariantTypography(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'default' }, component: conforme },
        { values: { state: 'hover' }, component: contredit },
        { values: { state: 'press' }, component: mixte },
      ],
    },
    nodesDeLayout(conforme, contredit, mixte),
    resolverFor({ size: 'typography.overline.fontsize' }),
    warnings,
    new Map(),
    new Set(),
    undefined,
    async (id) => {
      loads.push(id);
      return {
        type: 'TEXT', name: 'Overline', boundVariables: { fontSize: alias('size') },
        textCase: 'UPPER',
      } as unknown as BaseStyle;
    },
  );

  assert.equal(loads.length, 1);
  const surcharges = warnings.filter((warning) => warning.includes('letter case'));
  assert.equal(surcharges.length, 2);
  assert.ok(surcharges[0].includes('« Libellé »'));
  assert.ok(surcharges[0].includes('text style « Overline »'));
  assert.ok(surcharges[1].includes('« Intitulé »'));
  assert.ok(surcharges[1].includes('plusieurs valeurs'));
  assert.ok(surcharges.every((surcharge) => surcharge.includes('valeur du text style')));
});

test('paragraphSpacing et paragraphIndent ne réclament une variable que si leur valeur n’est pas zéro', async () => {
  const component = variantAUnTexte('default', 'Label');
  const warnings: string[] = [];

  const result = await extractVariantTypography(
    { axes: ['state'], variants: [{ values: { state: 'default' }, component }] },
    nodesDeLayout(component),
    resolverFor({ indent: 'typography.body.paragraphindent' }),
    warnings,
    new Map(),
    new Set(),
    undefined,
    async () => ({
      type: 'TEXT',
      name: 'Body',
      boundVariables: { paragraphIndent: alias('indent') },
      paragraphSpacing: 8,
      paragraphIndent: 0,
    } as unknown as BaseStyle),
  );

  // Une variable liée est publiée même quand sa valeur vaut zéro.
  assert.deepEqual(result.textStyles.body.tokens, {
    paragraphIndent: '{typography.body.paragraphindent}',
  });
  assert.ok(warnings.some((warning) => warning.includes('paragraph spacing')));
  assert.ok(warnings.every((warning) => !warning.includes('paragraph indent')));
});

test('fontStyle italic est publié, sauf si tokens.fontWeight cite la variable reliée à fontStyle', async () => {
  const lieAFontWeight = variantAUnTexte('default', 'Label', { textStyleId: 'lie-a-fontweight' });
  const lieAFontStyle = variantAUnTexte('hover', 'Label', { textStyleId: 'lie-a-fontstyle' });
  const styles: Record<string, BaseStyle> = {
    // `tokens.fontWeight` cite la variable de `fontWeight`, lue avant celle de
    // `fontStyle`.
    'lie-a-fontweight': {
      type: 'TEXT', name: 'Quote/Weight', fontName: { family: 'Inter', style: 'Bold Italic' },
      boundVariables: { fontWeight: alias('weight'), fontStyle: alias('style') },
    } as unknown as BaseStyle,
    'lie-a-fontstyle': {
      type: 'TEXT', name: 'Quote/Style', fontName: { family: 'Inter', style: 'Bold Italic' },
      boundVariables: { fontStyle: alias('style') },
    } as unknown as BaseStyle,
  };

  const result = await extractVariantTypography(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'default' }, component: lieAFontWeight },
        { values: { state: 'hover' }, component: lieAFontStyle },
      ],
    },
    nodesDeLayout(lieAFontWeight, lieAFontStyle),
    resolverFor({ weight: 'typography.quote.fontweight', style: 'typography.quote.fontstyle' }),
    [],
    new Map(),
    new Set(),
    undefined,
    async (id) => styles[id] ?? null,
  );

  assert.deepEqual(result.textStyles['quote.weight'], {
    figmaName: 'Quote/Weight',
    tokens: { fontWeight: '{typography.quote.fontweight}' },
    literals: { fontStyle: 'italic' },
  });
  assert.deepEqual(result.textStyles['quote.style'], {
    figmaName: 'Quote/Style',
    tokens: { fontWeight: '{typography.quote.fontstyle}' },
  });
});

test('le chemin d’une part descend jusqu’au calque texte, pas jusqu’à son frame', () => {
  // `extractTextBranch` publie une part pour le frame et pour le texte qu'il
  // contient. Un chemin qui s'arrêtait au frame désignait un slot porteur de
  // `children`, où le consommateur ne trouvait aucune typographie à appliquer.
  const description = node('TEXT', 'description', 'Description', [], {
    textStyleId: 'body-small',
  });
  const bloc = node('FRAME', 'bloc', 'Bloc', [description], { layoutMode: 'VERTICAL' });
  const titre = node('TEXT', 'titre', 'Titre', [], { textStyleId: 'body-large' });
  const contenu = node('FRAME', 'contenu', 'Text', [titre, bloc], { layoutMode: 'VERTICAL' });
  const composant = node('COMPONENT', 'big', 'Big', [contenu], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  assert.deepEqual(
    textSlots(composant).map(({ slotPath, textNode }) => ({ slotPath, layer: textNode.name })),
    [
      { slotPath: ['label', 'label'], layer: 'Titre' },
      { slotPath: ['label', 'label-2', 'label'], layer: 'Description' },
    ],
  );
});

test('textSlots situe les textes qu’un cadre de dépendances range à côté d’elles', async () => {
  // Le cas que StressTest a fait tomber : un cadre qui contient deux boutons et
  // un tag. Le tag est un calque de ce contrat, et sa typographie doit viser un
  // chemin que `structure.children` publie réellement, sans quoi le
  // consommateur refuse le contrat pour un chemin de slots inconnu.
  const bouton = node('INSTANCE', 'btn', 'Button');
  const texteDuTag = node('TEXT', 'tag-txt', 'Nouveau', [], { characters: 'Nouveau' });
  const tag = node('FRAME', 'tag', 'Tag', [texteDuTag]);
  const cadre = node('FRAME', 'cadre', 'UserInput', [bouton, tag], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
  });
  const composant = node('COMPONENT', 'variant', 'Variant=Default', [cadre], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  }) as ComponentNode;
  const composed = new Map([['btn', { component: 'Button', figmaLayer: 'Button' }]]);

  const chemins = textSlots(composant, new Set(), composed)
    .map(({ slotPath, textNode }) => ({ slotPath, layer: textNode.name }));

  // Le tag n'enveloppe qu'un texte, et il est malgré tout décrit comme le cadre
  // qu'il est : sa taille, ses coins et son padding appartiennent au contrat.
  // Le texte vit donc un étage plus bas.
  assert.deepEqual(chemins, [{ slotPath: ['userinput', 'label', 'label'], layer: 'Nouveau' }]);

  // Et ce chemin doit exister dans l'arbre publié : c'est le contrôle exact que
  // le consommateur applique.
  const layout = await extractLayout(
    composant,
    resolverFor({}),
    [],
    composed,
    new Set(),
    composant,
    true,
    new Map(),
  );
  const cheminsPublies = new Set<string>();
  const parcourir = (children: readonly ChildStructure[], prefixe: string[]) => {
    for (const child of children) {
      const chemin = [...prefixe, child.slot];
      cheminsPublies.add(JSON.stringify(chemin));
      if (child.children) parcourir(child.children, chemin);
    }
  };
  parcourir(layout.children, []);
  assert.ok(cheminsPublies.has(JSON.stringify(['userinput', 'label'])));
});
