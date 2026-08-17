/**
 * Tests de l'ASSEMBLAGE du contrat — le seul fichier qui enchaîne toute la
 * commande, et le seul qu'aucun test n'exécutait.
 *
 * Ce que ces tests prouvent : le câblage. Que le pré-vol bloque avant toute
 * extraction, que les étapes se transmettent bien leurs résultats, et que le
 * contrat sort avec la forme annoncée.
 *
 * Ce qu'ils ne prouvent PAS : la fidélité à Figma. Le faux `figma` ci-dessous
 * est un modèle, et un modèle faux rendrait ces tests verts en prouvant que le
 * moteur s'accorde avec lui. C'est `tests/test-exports/` — de vrais exports
 * produits dans Figma — qui tient ce rôle, et lui seul (AGENTS.md, « Limites
 * d'environnement »).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import handleExportComponent, {
  componentContractFilename,
  mergeWrapperProps,
} from '../src/contract/exportComponent';
import type { ContractProp } from '../src/contract/types';

let compteur = 0;

/** Node Figma minimal, avec le `findAll` récursif de l'API et un parent chaîné. */
function node(type: string, name: string, children: any[] = [], extra: any = {}): any {
  const self: any = {
    type,
    id: `${name}-${(compteur += 1)}`,
    name,
    visible: true,
    boundVariables: {},
    children,
    ...extra,
  };
  self.findAll = (predicat: (candidat: any) => boolean = () => true) => {
    const trouves: any[] = [];
    const parcourir = (nodes: any[]) => {
      for (const enfant of nodes) {
        if (predicat(enfant)) trouves.push(enfant);
        parcourir(enfant.children ?? []);
      }
    };
    parcourir(children);
    return trouves;
  };
  self.findOne = (predicat: (candidat: any) => boolean) => self.findAll(predicat)[0] ?? null;
  for (const enfant of children) enfant.parent = self;
  return self;
}

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

/**
 * Une règle `@usage` telle que Figma la porte : une instance de
 * `ComponentConfiguration` dont la VARIANTE est le tag et dont le calque
 * « content » porte le texte.
 */
function regleUsage(texte: string) {
  const setDeConfiguration = { type: 'COMPONENT_SET', name: 'ComponentConfiguration' };
  const instance = node('INSTANCE', 'Règle', [node('TEXT', 'content', [], { characters: texte })], {
    variantProperties: { Type: '@usage' },
    componentProperties: {},
    getMainComponentAsync: async () => ({ name: '@usage', parent: setDeConfiguration }),
  });
  return instance;
}

/** Un variant : un auto layout horizontal dont le gap cite une variable. */
function variant(nom: string, enfantsEnPlus: any[] = []) {
  return node('COMPONENT', nom, [
    node('TEXT', 'Suivant', [], { characters: 'Suivant' }),
    ...enfantsEnPlus,
  ], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    variantProperties: { Variant: nom.split('=')[1] },
    boundVariables: { itemSpacing: alias('gap') },
  });
}

/** Le fichier Figma complet dont l'export a besoin, monté sur `globalThis`. */
function monterFigma(options: {
  selection?: unknown[];
  avecRegles?: boolean;
  /** Calques ajoutés à CHAQUE variant. Une fabrique : les ids doivent différer. */
  enfantsDuVariant?: () => any[];
  /** Composants que la page reconnaît comme unifiés, par leur conteneur de règles. */
  dependancesContractees?: string[];
  /** Clé du fichier, telle que l API la donne à un plugin privé. */
  fileKey?: string | null;
} = {}) {
  const contained = variant('Variant=Contained', options.enfantsDuVariant?.() ?? []);
  const outlined = variant('Variant=Outlined', options.enfantsDuVariant?.() ?? []);
  const componentSet = node('COMPONENT_SET', 'Button', [contained, outlined], {
    key: 'cle-button',
    componentPropertyDefinitions: {
      Variant: {
        type: 'VARIANT',
        variantOptions: ['Contained', 'Outlined'],
        defaultValue: 'Contained',
      },
    },
    defaultVariant: contained,
  });

  const enfantsDeLaPage: any[] = [componentSet];
  if (options.avecRegles !== false) {
    enfantsDeLaPage.push(node('FRAME', 'Button-Rules', [regleUsage('Action principale')]));
  }
  for (const nom of options.dependancesContractees ?? []) {
    enfantsDeLaPage.push(node('FRAME', `${nom}-Rules`, []));
  }
  const page = node('PAGE', 'Composants', enfantsDeLaPage);

  const collection = {
    id: 'collection',
    name: 'Tokens',
    defaultModeId: 'mode',
    modes: [{ modeId: 'mode', name: 'Défaut' }],
  };
  const variableGap = {
    id: 'gap',
    name: 'sizes/gap',
    variableCollectionId: 'collection',
    resolvedType: 'FLOAT',
    scopes: ['GAP'],
    valuesByMode: { mode: 8 },
  };

  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, {
      selection: options.selection ?? [componentSet],
    }),
    root: { name: 'Design System' },
    fileKey: options.fileKey ?? null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => [variableGap],
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => collection,
    },
  };

  return {
    componentSet,
    restaurer: () => {
      (globalThis as { figma?: unknown }).figma = precedent;
    },
  };
}

test('handleExportComponent assemble un contrat complet à partir du Component Set sélectionné', async () => {
  const figmaFaux = monterFigma();
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);

    // Le nom de fichier EST l'identifiant de code canonique.
    assert.equal(resultat.filename, componentContractFilename('Button'));
    assert.equal(contrat.name, 'Button');
    assert.equal(contrat.meta.figma.nodeId, figmaFaux.componentSet.id);
    assert.equal(contrat.meta.figma.fileName, 'Design System');

    // Les règles du pré-vol arrivent bien jusqu'à l'intention publiée.
    assert.equal(contrat.intent.usage, 'Action principale');

    // Les props du set, la matrice et le layout se sont transmis leurs résultats.
    assert.deepEqual(contrat.props.variant.values, ['contained', 'outlined']);
    assert.deepEqual(contrat.structure.variantAxes, ['variant']);
    assert.equal(contrat.structure.layout, 'flex-row');
    assert.equal(contrat.structure.gap, '{tokens.sizes.gap}');

    // `tokensUsed` se dérive du contrat TERMINÉ : il ne cite donc que ce que le
    // contrat emploie, et il le cite dès qu'un champ le porte.
    assert.deepEqual(contrat.tokensUsed, ['{tokens.sizes.gap}']);

    // Les avertissements comptés sont ceux publiés, et le journal de l'UI reçoit
    // la même liste que le corps de la pull request.
    assert.equal(resultat.warningCount, contrat.meta.warnings.length);
    assert.deepEqual(resultat.warnings, contrat.meta.warnings);
  } finally {
    figmaFaux.restaurer();
  }
});

test('composes se dérive de l’arbre : deux dépendances d’un même cadre y ont chacune leur place', async () => {
  const lien = (nom: string) =>
    node('INSTANCE', nom, [], {
      componentProperties: {},
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      getMainComponentAsync: async () => ({
        name: 'Link',
        parent: { type: 'COMPONENT_SET', name: 'Link' },
      }),
    });
  const figmaFaux = monterFigma({
    dependancesContractees: ['Link'],
    enfantsDuVariant: () => [
      node('FRAME', 'Liens', [lien('Lien 1'), lien('Lien 2')], {
        layoutMode: 'HORIZONTAL',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'CENTER',
        layoutSizingHorizontal: 'HUG',
        layoutSizingVertical: 'HUG',
      }),
    ],
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    // Le cadre appartient au contrat et publie son flux ; les deux dépendances
    // sont ses enfants, chacune à son emplacement.
    const cadre = contrat.structure.children.find(
      (child: any) => child.figmaLayer === 'Liens',
    );
    assert.equal(cadre.layout, 'flex-row');
    assert.deepEqual(cadre.children.map((child: any) => child.composes), ['Link', 'Link']);

    // `composes` décrit la même séquence : c'est le contrôle que le consommateur
    // applique, et il compte les occurrences pour la parité du code.
    assert.deepEqual(contrat.composes, [
      { component: 'Link', figmaLayer: 'Lien 1' },
      { component: 'Link', figmaLayer: 'Lien 2' },
    ]);
  } finally {
    figmaFaux.restaurer();
  }
});

test('handleExportComponent refuse une sélection qui n’est pas un seul Component Set', async () => {
  const figmaFaux = monterFigma({ selection: [] });
  try {
    await assert.rejects(
      handleExportComponent(),
      /Sélectionnez un seul Component Set/,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('handleExportComponent bloque avant toute extraction quand aucune règle n’est lisible', async () => {
  const figmaFaux = monterFigma({ avecRegles: false });
  try {
    await assert.rejects(handleExportComponent(), /aucune règle utilisable/);
  } finally {
    figmaFaux.restaurer();
  }
});

test('mergeWrapperProps garde la prop du set sélectionné et nomme le conflit', () => {
  const props: Record<string, ContractProp> = {
    disabled: { type: 'boolean', default: false },
  };
  const warnings: string[] = [];

  mergeWrapperProps(
    props,
    {
      disabled: { type: 'boolean', default: true },
      iconLeft: { type: 'boolean', default: false },
    },
    warnings,
  );

  // « Une clé publique, un propriétaire » : le set sélectionné l'emporte, la
  // prop propre au wrapper entre, et l'écart est dit au lieu d'être écrasé.
  assert.deepEqual(props.disabled, { type: 'boolean', default: false });
  assert.deepEqual(props.iconLeft, { type: 'boolean', default: false });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« disabled »/);
});

/**
 * Le lien Figma dépend d'un seul réglage : `enablePrivatePluginApi` dans le
 * manifest. Sans lui, `figma.fileKey` reste indéfini et le contrat perd son
 * lien — c'est ce qui est arrivé, sous un avertissement qui présentait la perte
 * comme une fatalité de l'API.
 */
test('meta.figma.url est construit dès que l’API fournit la clé du fichier', async () => {
  const figmaFaux = monterFigma({ fileKey: 'ABCdef123456789012345678' });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    // Le nom du fichier est encodé, et les « : » de l'id de nœud deviennent
    // des « - » : c'est le format que Figma sait rouvrir.
    assert.equal(
      contrat.meta.figma.url,
      'https://www.figma.com/design/ABCdef123456789012345678/Design%20System'
        + `?node-id=${String(contrat.meta.figma.nodeId).replace(/:/g, '-')}`,
    );
    assert.equal(String(contrat.meta.figma.url).split('node-id=')[1].includes(':'), false);
    assert.equal(
      contrat.meta.warnings.some((warning: string) => warning.includes('Lien vers Figma')),
      false,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('sans clé de fichier, le contrat le dit sans bloquer l’export', async () => {
  const figmaFaux = monterFigma();
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.meta.figma.url, null);
    assert.equal(contrat.meta.figma.fileName, 'Design System');
    assert.ok(contrat.meta.figma.nodeId);
    assert.ok(
      contrat.meta.warnings.some((warning: string) => warning.includes('Lien vers Figma')),
    );
  } finally {
    figmaFaux.restaurer();
  }
});
