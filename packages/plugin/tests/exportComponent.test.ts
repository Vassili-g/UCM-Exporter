/**
 * Tests de l'assemblage du contrat : le seul fichier qui enchaîne toute la
 * commande, et le seul qu'aucun test n'exécutait.
 *
 * Ce que ces tests prouvent : le câblage. Que le pré-vol bloque avant toute
 * extraction, que les étapes se transmettent bien leurs résultats, et que le
 * contrat sort avec la forme annoncée.
 *
 * Ce qu'ils ne prouvent pas : la fidélité à Figma. Le faux `figma` ci-dessous
 * est un modèle, et un modèle faux rendrait ces tests verts en prouvant que le
 * moteur s'accorde avec lui. Aucun test de ce repository ne peut trancher cette
 * question : l'export ne tourne que dans Figma. Elle se tranche chez le
 * consommateur, sur de vrais exports (AGENTS.md, « Limites d'environnement »).
 *
 * En revanche, tout contrat produit ici passe par `lois.ts` : forme, renvois,
 * accord avec le schéma publié et aller-retour de l'écriture. C'est le filet de
 * régression du moteur, et il se pose une fois, sur le chemin d'appel, pour
 * qu'un scénario ajouté demain y soit soumis sans que personne y pense.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import exporterLeComposant, {
  componentContractFilename,
  mergeWrapperProps,
} from '../src/contract/exportComponent';
import { collecterReferences } from '@ucm-kit/core/lecteurs';
import {
  verifierLaSerialisation,
  verifierLeLecteur,
  verifierLeSchema,
  verifierLesLois,
} from './lois';
import { verifierLaLocalisationDesDiagnostics } from './loiDeLocalisation.test';
import { verifierLesPartiesDesDiagnostics } from './loiDesParties.test';
import type { ContractProp } from '@ucm-kit/core/format';

/**
 * Chaque contrat que le moteur fabrique ici passe d'abord par les lois de
 * forme, avant que le test ne regarde ce qui l'intéresse.
 *
 * C'est le seul endroit du repository où ces lois portent sur du code : le
 * corpus est gelé et ne bouge qu'au réexport, si bien qu'une régression du
 * moteur ne s'y verrait jamais. Ici, elle échoue au scénario qui la produit :
 * et la vérification est posée une fois, pas à chaque appel, pour qu'un
 * scénario ajouté demain y soit soumis sans que personne y pense.
 */
/**
 * Les noms de calques du composant que le scénario courant a monté.
 *
 * Relevés depuis le faux `figma`, donc depuis ce que le moteur a réellement
 * parcouru : une liste écrite à la main vieillirait avec les scénarios.
 */
function nomsDeCalquesDuComposant(): Set<string> {
  const noms = new Set<string>();
  const visiter = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.name === 'string') noms.add(node.name);
    for (const enfant of Array.isArray(node.children) ? node.children : []) visiter(enfant);
  };
  for (const selection of (globalThis as any).figma?.currentPage?.selection ?? []) {
    visiter(selection);
  }
  return noms;
}

async function handleExportComponent() {
  const resultat = await exporterLeComposant();
  const contrat = JSON.parse(resultat.content);
  verifierLesLois(contrat, 'sortie du moteur');
  verifierLaLocalisationDesDiagnostics(
    resultat.warnings,
    resultat.localisations,
    resultat.localisationsDeclarees,
    nomsDeCalquesDuComposant(),
    'sortie du moteur',
  );
  verifierLesPartiesDesDiagnostics(resultat.warnings, resultat.parties, 'sortie du moteur');
  verifierLeSchema(contrat, 'sortie du moteur');
  verifierLeLecteur(contrat, 'sortie du moteur');
  verifierLaSerialisation(resultat.content, 'sortie du moteur');
  return resultat;
}

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

/** Le component set dont chaque règle est une instance. */
const setDeRegles = { type: 'COMPONENT_SET', name: '.rulesItems' };

/**
 * Une règle telle que Figma la porte : une instance de `.rulesItems` dont un
 * calque nomme le tag, et dont les autres portent le texte et la cible.
 */
function regle(tag: string, calques: any[]) {
  return node('INSTANCE', 'Règle', [
    node('FRAME', 'rule-ids', [node('TEXT', tag, [], { characters: tag })]),
    ...calques,
  ], {
    variantProperties: { Type: tag },
    componentProperties: {},
    getMainComponentAsync: async () => ({ name: `Type=${tag}`, parent: setDeRegles }),
  });
}

/** Une règle `@usage`, la plus simple : un tag et un texte. */
function regleUsage(texte: string) {
  return regle('@usage', [node('TEXT', 'content', [], { characters: texte })]);
}

/**
 * Le conteneur de règles d'un composant : une instance de `.componentRules`
 * dont le calque « component-name » écrit le nom documenté.
 */
function conteneurDeRegles(nom: string, regles: any[] = []) {
  return node('INSTANCE', '.componentRules', [
    node('FRAME', 'component-name-wrap', [node('TEXT', 'component-name', [], { characters: nom })]),
    ...regles,
  ]);
}

/** Un variant : un auto layout horizontal dont le gap cite une variable. */
function variant(nom: string, enfantsEnPlus: any[] = [], reglagesDuTexte: any = {}) {
  return node('COMPONENT', nom, [
    node('TEXT', 'Suivant', [], { characters: 'Suivant', ...reglagesDuTexte }),
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
  /** Calques ajoutés à chaque variant. Une fabrique : les ids doivent différer. */
  enfantsDuVariant?: () => any[];
  /** Composants que la page reconnaît comme unifiés, par leur conteneur de règles. */
  dependancesContractees?: string[];
  /** Clé du fichier, telle que l API la donne à un plugin privé. */
  fileKey?: string | null;
  /** Réglages posés sur le calque texte « Suivant » de chaque variant. */
  reglagesDuTexte?: Record<string, unknown>;
  /** Le text style que `getStyleByIdAsync` rend, quel que soit l'identifiant. */
  styleDeTexte?: unknown;
} = {}) {
  const contained = variant(
    'Variant=Contained',
    options.enfantsDuVariant?.() ?? [],
    options.reglagesDuTexte,
  );
  const outlined = variant(
    'Variant=Outlined',
    options.enfantsDuVariant?.() ?? [],
    options.reglagesDuTexte,
  );
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
    enfantsDeLaPage.push(conteneurDeRegles('Button', [regleUsage('Action principale')]));
  }
  for (const nom of options.dependancesContractees ?? []) {
    enfantsDeLaPage.push(conteneurDeRegles(nom));
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
  const variableBackground = {
    id: 'background',
    name: 'components/standalone/colors/background',
    variableCollectionId: 'collection',
    resolvedType: 'COLOR',
    scopes: ['ALL_FILLS'],
    valuesByMode: { mode: { r: 1, g: 1, b: 1, a: 1 } },
  };

  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    currentPage: Object.assign(page, {
      selection: options.selection ?? [componentSet],
    }),
    root: { name: 'Design System' },
    fileKey: options.fileKey ?? null,
    getStyleByIdAsync: async () => options.styleDeTexte ?? null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => [variableGap, variableBackground],
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

/** L'arbre de la projection de référence, derrière son renvoi au catalogue. */
function structureDe(contrat: any): any {
  return contrat.viewStructures[contrat.structure.view];
}

/** La vue d'un variant, ses cinq parties résolues. */
function vueDe(contrat: any, variant: any): any {
  const vue = contrat.variantViews[variant.view];
  return {
    structure: contrat.viewStructures[vue.structure],
    typography: contrat.viewTypographies?.[vue.typography] ?? [],
    composes: contrat.viewComposes?.[vue.composes] ?? [],
    icons: contrat.viewIcons?.[vue.icons] ?? {},
    paintPlacements: contrat.viewPaintPlacements?.[vue.paintPlacements] ?? {},
  };
}

/** Les messages de l'export, tels que `meta.diagnostics` les porte. */
function messagesDe(contrat: any): string[] {
  return (contrat.meta.diagnostics ?? []).map((diagnostic: any) => diagnostic.message);
}

test('handleExportComponent assemble un contrat complet à partir du Component Set sélectionné', async () => {
  const figmaFaux = monterFigma();
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);

    // Le nom de fichier est l'identifiant de code canonique.
    assert.equal(resultat.filename, componentContractFilename('Button'));
    assert.equal(contrat.name, 'Button');
    assert.equal(contrat.meta.figma.nodeId, figmaFaux.componentSet.id);
    assert.equal(contrat.meta.figma.fileName, 'Design System');

    // Les règles du pré-vol arrivent bien jusqu'à l'intention publiée.
    assert.equal(contrat.intent.usage, 'Action principale');

    // Les props du set, la matrice et le layout se sont transmis leurs résultats.
    assert.deepEqual(contrat.props.variant.values, ['contained', 'outlined']);
    assert.deepEqual(contrat.structure.variantAxes, ['variant']);
    assert.equal(structureDe(contrat).layout, 'flex-row');
    assert.equal(structureDe(contrat).gap, '{tokens.sizes.gap}');
    assert.equal(contrat.variants.length, 2);
    assert.deepEqual(contrat.variants.map((entry: any) => entry.values.variant), [
      'contained',
      'outlined',
    ]);
    assert.ok(contrat.variants.every((entry: any) => contrat.variantViews[entry.view]));
    assert.equal(Object.keys(contrat.variantViews).length, 1);
    // Le contrat ne publie que ce qu'il a : ce composant n'a ni icône, ni text
    // style, ni liaison native, ni axe d'état. Les champs correspondants sont
    // absents, pas vides.
    assert.deepEqual(Object.keys(contrat).sort(), [
      'figmaVariantLabels', 'intent', 'meta', 'name', 'props', 'rendering', 'samples',
      'structure', 'variantViews', 'variants', 'viewStructures',
    ]);
    assert.equal('variantTokens' in structureDe(contrat), false);
    assert.equal('variantStrokes' in structureDe(contrat), false);
    assert.equal('variantTypography' in structureDe(contrat), false);
    // Le renvoi est inconditionnel : `structure` ne recopie plus aucun arbre.
    assert.deepEqual(Object.keys(contrat.structure).sort(), ['variantAxes', 'view']);
    assert.deepEqual(contrat.meta.coverage, { portable: 'partial' });
    assert.ok(contrat.meta.diagnostics.every((diagnostic: any) => (
      Object.keys(diagnostic).sort().join(',') === 'code,message,severity'
    )));
    // Le miroir en texte brut a disparu : `diagnostics` porte tout, une seule fois.
    assert.equal('warnings' in contrat.meta, false);

    // L'index des tokens a disparu lui aussi : il se dérive du contrat terminé,
    // et le contrat cite bien ce qu'il emploie.
    assert.equal('tokensUsed' in contrat, false);
    assert.deepEqual(Array.from(collecterReferences(contrat)), ['{tokens.sizes.gap}']);

    // Un seul canal : ce que l'UI compte, ce que la pull request
    // titre « avertissement » et ce que `meta.diagnostics` publie sont la même
    // liste, et chacun de ses messages demande un geste dans Figma.
    assert.equal(resultat.warningCount, resultat.warnings.length);
    assert.deepEqual(resultat.warnings.slice().sort(), messagesDe(contrat).sort());
    assert.deepEqual(
      contrat.meta.diagnostics.filter((diagnostic: any) => (
        diagnostic.code !== 'UCM_PORTABLE_PROJECTION_WARNING'
          && diagnostic.code !== 'UCM_EXPORT_NOTICE'
      )),
      [],
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('l’échantillon reste hors du contrat normatif : ni token, ni couverture, ni avertissement', async () => {
  // Un texte de maquette peut ressembler à une référence de token : un montant,
  // un gabarit de message. `tokensUsed` se dérive d'une liste blanche de champs
  // dont `samples` est absent : le contrat ne doit pas citer un token que rien
  // ne peint, ni envoyer le designer chercher une variable qui n'existe pas.
  const figmaFaux = monterFigma({
    enfantsDuVariant: () => [
      node('TEXT', 'Montant', [], { characters: '{components.piege.background}' }),
    ],
  });
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);

    assert.equal(
      JSON.stringify(contrat).includes('{components.piege.background}'),
      true,
      'le texte de maquette reste publié dans son échantillon',
    );
    const echantillon = contrat.samples[contrat.variants[0].sample];
    assert.deepEqual(
      echantillon.text.map((entree: any) => entree.value).sort(),
      ['Suivant', '{components.piege.background}'],
    );
    // Le contenu de la maquette est identique sur les deux variants : un seul
    // échantillon, deux renvois, c'est la dédup qui tient la légèreté.
    assert.equal(Object.keys(contrat.samples).length, 1);
    assert.equal(contrat.variants[0].sample, contrat.variants[1].sample);

    // Rien n'est réclamé au designer : les avertissements de ce montage portent
    // tous sur le text style absent, un manque du contrat normatif qui existait
    // avant l'échantillon. Aucun ne vient de lui, et la couverture ne bouge donc
    // pas de ce qu'elle valait sans lui.
    const perteDePortabilite = contrat.meta.diagnostics.filter(
      (diagnostic: any) => diagnostic.code === 'UCM_PORTABLE_PROJECTION_WARNING',
    );
    assert.ok(
      perteDePortabilite.every((diagnostic: any) => !/maquette|samples/.test(diagnostic.message)),
      'aucune perte de portabilité ne vient de l’échantillon',
    );
    assert.ok(
      !resultat.warnings.some((message: string) => message.includes('maquette')),
      'l’échantillon n’ajoute aucun point à corriger',
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('un text style en capitales et un calque centré et coupé passent les lois et le schéma publiés', async () => {
  // `lois.ts` ne juge que ce que le moteur fabrique : sans ce montage, `literals`
  // et les champs d'usage n'y passeraient jamais.
  const reglagesPartages = {
    textCase: 'UPPER', textDecoration: 'NONE', textWrapStyle: 'AUTO', leadingTrim: 'NONE',
  };
  const figmaFaux = monterFigma({
    styleDeTexte: {
      type: 'TEXT',
      name: 'Label/Large',
      boundVariables: {},
      fontName: { family: 'Inter', style: 'Bold Italic' },
      ...reglagesPartages,
    },
    reglagesDuTexte: {
      textStyleId: 'label-large',
      textAlignHorizontal: 'CENTER',
      textTruncation: 'ENDING',
      maxLines: 2,
      ...reglagesPartages,
    },
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.deepEqual(contrat.textStyles['label.large'], {
      figmaName: 'Label/Large',
      literals: { textTransform: 'uppercase', fontStyle: 'italic' },
    });
    assert.deepEqual(vueDe(contrat, contrat.variants[0]).typography, [{
      slotPath: ['label'],
      style: 'label.large',
      textAlign: 'center',
      lineClamp: 2,
      textOverflow: 'ellipsis',
    }]);
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
    const cadre = structureDe(contrat).children.find(
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

test('handleExportComponent refuse une sélection qui n’est pas un seul composant', async () => {
  const figmaFaux = monterFigma({ selection: [] });
  try {
    await assert.rejects(
      handleExportComponent(),
      /Sélectionnez un seul Component ou Component Set/,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('handleExportComponent exporte sans règles et diagnostique la documentation absente', async () => {
  const figmaFaux = monterFigma({ avecRegles: false });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.intent, undefined);
    assert.ok(
      messagesDe(contrat).some((warning: string) => warning.includes(
        'aucune règle @usage, @do, @dont ou @pairs n’est déclarée',
      )),
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('une dépendance absente du variant de référence reste dans la variante exacte et le graphe global', async () => {
  const figmaFaux = monterFigma({ dependancesContractees: ['Link'] });
  const outlined = figmaFaux.componentSet.children[1];
  const link = node('INSTANCE', 'Action secondaire', [], {
    componentProperties: {},
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    getMainComponentAsync: async () => ({
      name: 'Default',
      parent: { type: 'COMPONENT_SET', name: 'Link' },
    }),
  });
  outlined.children.push(link);
  link.parent = outlined;
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);

    const views = contrat.variants.map((variant: any) => vueDe(contrat, variant));
    assert.deepEqual(views[0].composes, []);
    assert.deepEqual(views[1].composes, [
      { component: 'Link', figmaLayer: 'Action secondaire' },
    ]);
    assert.deepEqual(contrat.composes, [
      { component: 'Link', figmaLayer: 'Action secondaire' },
    ]);
    assert.equal(structureDe(contrat).children.some((child: any) => child.composes === 'Link'), false);
    // Les arbres exacts conservent cette composition : rien ne manque, aucun
    // geste n'est demandé, donc rien n'est dit au designer. Ni dans le
    // contrat, ni dans le compteur de l'UI, ni dans la pull request.
    assert.deepEqual(
      (contrat.meta.diagnostics ?? []).filter((diagnostic: any) =>
        diagnostic.message.includes('Composition différente')),
      [],
    );
    assert.equal(
      (resultat.warnings ?? []).some((message) => message.includes('Composition différente')),
      false,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('un COMPONENT standalone produit une variante exacte sans axe', async () => {
  const figmaFaux = monterFigma({ avecRegles: false });
  const standalone = figmaFaux.componentSet.children[0];
  standalone.name = 'Standalone';
  standalone.componentPropertyDefinitions = {};
  standalone.boundVariables = { fills: [alias('background')] };
  (globalThis as any).figma.currentPage.selection = [standalone];
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.name, 'Standalone');
    assert.equal(contrat.structure.variantAxes, undefined);
    // Sans axe, il n'y a rien à nommer : la seule combinaison n'a pas de `values`.
    assert.deepEqual(contrat.variants.map((entry: any) => entry.values), [undefined]);
    assert.deepEqual(contrat.variants[0].tokens, {
      background: '{tokens.components.standalone.colors.background}',
    });
    assert.equal(contrat.variants[0].strokes, undefined);
    const view = vueDe(contrat, contrat.variants[0]);
    assert.deepEqual(view.typography, []);
    assert.deepEqual(view.composes, []);
    assert.deepEqual(view.icons, {});
  } finally {
    figmaFaux.restaurer();
  }
});

test('les notices de documentation ne rendent pas la projection portable partielle', async () => {
  const figmaFaux = monterFigma({ avecRegles: false });
  const standalone = node('COMPONENT', 'Empty', [], {
    key: 'empty-key',
    componentPropertyDefinitions: {},
    layoutMode: 'HORIZONTAL',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
  });
  (globalThis as any).figma.currentPage.selection = [standalone];
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(
      contrat.meta.coverage.portable,
      'complete',
      JSON.stringify(contrat.meta.warnings),
    );
    assert.ok(contrat.meta.diagnostics.length > 0);
    // Aucun de ces constats ne retire quoi que ce soit à l'arbre exact : ce sont
    // des notices de documentation, qui demandent bien un geste mais ne
    // dégradent pas la projection portable.
    assert.ok(
      contrat.meta.diagnostics.every(
        (diagnostic: any) => diagnostic.code === 'UCM_EXPORT_NOTICE',
      ),
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('une piste FIXED de grille est publiée en pixels, sans un mot au designer', async () => {
  // Le réflexe du designer devant un message est de retourner dans Figma. Ici la
  // valeur est dans le contrat et rien n'y manque : le dire enverrait chercher
  // une correction qui n'existe pas. L'export se tait (la règle
  // vit dans la spécification, et ce test en répond).
  const figmaFaux = monterFigma({ avecRegles: false });
  const standalone = node('COMPONENT', 'TilesGrid', [], {
    key: 'grid-key',
    componentPropertyDefinitions: {},
    layoutMode: 'GRID',
    gridRowCount: 2,
    gridColumnCount: 1,
    gridRowSizes: [{ type: 'FIXED', value: 120 }, { type: 'FLEX', value: 1 }],
    gridColumnSizes: [{ type: 'FLEX', value: 1 }],
  });
  (globalThis as any).figma.currentPage.selection = [standalone];
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);
    const enPixels = (message: string) => message.includes('publiées en pixels');

    // Rien ne manque : la piste est publiée telle que Figma la règle.
    assert.deepEqual(structureDe(contrat).rowSizes, ['120px', '1fr']);
    // Et rien n'est dit : ni à l'UI, ni dans la pull request, ni dans le contrat.
    assert.equal(resultat.warnings.some(enPixels), false);
    assert.equal(messagesDe(contrat).some(enPixels), false);
  } finally {
    figmaFaux.restaurer();
  }
});

test('un badge hors du flux est placé et incliné par le moteur, en silence', async () => {
  // Deux propriétés que le designer ne peut pas rendre contractuelles : Figma ne
  // relie une position à aucune variable, et une rotation n'en est pas une. Les
  // réclamer envoyait le designer corriger ce qui n'a pas de correction ; les
  // constater à chaque export lui faisait relire le fonctionnement interne de
  // l'exporteur. Le moteur les calcule, les publie, et se tait.
  const badge = () => node('FRAME', 'Badge', [], {
    layoutPositioning: 'ABSOLUTE',
    constraints: { horizontal: 'MAX', vertical: 'MIN' },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    width: 16,
    height: 16,
    rotation: 45,
    relativeTransform: [
      [Math.SQRT1_2, -Math.SQRT1_2, 100],
      [Math.SQRT1_2, Math.SQRT1_2, 4],
    ],
    fills: [],
  });
  const figmaFaux = monterFigma({ avecRegles: false, enfantsDuVariant: () => [badge()] });
  (globalThis as any).figma.currentPage.selection[0].width = 120;
  (globalThis as any).figma.currentPage.selection[0].height = 40;
  for (const variante of (globalThis as any).figma.currentPage.selection[0].children) {
    variante.width = 120;
    variante.height = 40;
  }
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);
    const slot = structureDe(contrat).children.find((enfant: any) => enfant.figmaLayer === 'Badge');
    const horsDuFlux = (message: string) => message.includes('position « Absolute »');

    assert.equal(slot.position, 'absolute');
    assert.deepEqual(slot.constraints, { horizontal: 'right', vertical: 'top' });
    // Le centre du carré tourné est à (100, 4 + 8√2) : la boîte CSS droite a
    // son coin haut-gauche en (92 ; 7,31), soit 3,31 px plus bas que l'origine
    // Figma. Seul le côté auquel le badge s'accroche est publié sur chaque axe.
    assert.deepEqual(slot.inset, { top: '7.31px', right: '12px' });
    assert.equal(slot.rotation, '-45deg');

    // Ni l'un ni l'autre ne demande un geste, donc ni l'un ni l'autre ne se dit.
    // La place du badge ne retire rien à `meta.coverage.portable`, le corps de
    // la pull request n'en porte rien, et `meta.diagnostics` non plus.
    assert.equal(resultat.warnings.some(horsDuFlux), false);
    assert.equal(messagesDe(contrat).some(horsDuFlux), false);
    assert.equal(
      messagesDe(contrat).some((message) => message.includes('rotation est publiée')),
      false,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('une collision de props rend la projection portable explicitement partielle', async () => {
  const figmaFaux = monterFigma({ avecRegles: false });
  const standalone = node('COMPONENT', 'Collision', [], {
    key: 'collision-key',
    componentPropertyDefinitions: {
      'Icon Left#1:1': { type: 'BOOLEAN', defaultValue: true },
      'icon-left#1:2': { type: 'BOOLEAN', defaultValue: false },
    },
    layoutMode: 'HORIZONTAL',
  });
  (globalThis as any).figma.currentPage.selection = [standalone];
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.meta.coverage.portable, 'partial');
    assert.ok(
      contrat.meta.diagnostics.some(
        (diagnostic: any) => diagnostic.code === 'UCM_PORTABLE_PROJECTION_WARNING',
      ),
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('un Component Set clairsemé exporte uniquement les combinaisons existantes', async () => {
  const figmaFaux = monterFigma();
  const [contained, outlined] = figmaFaux.componentSet.children;
  figmaFaux.componentSet.componentPropertyDefinitions = {
    Variant: {
      type: 'VARIANT',
      variantOptions: ['Contained', 'Outlined'],
      defaultValue: 'Contained',
    },
    Size: {
      type: 'VARIANT',
      variantOptions: ['Small', 'Large'],
      defaultValue: 'Small',
    },
  };
  contained.name = 'Variant=Contained, Size=Small';
  contained.variantProperties = { Variant: 'Contained', Size: 'Small' };
  outlined.name = 'Variant=Outlined, Size=Large';
  outlined.variantProperties = { Variant: 'Outlined', Size: 'Large' };
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.variants.length, 2);
    assert.deepEqual(contrat.variants.map((entry: any) => entry.values), [
      { variant: 'contained', size: 'small' },
      { variant: 'outlined', size: 'large' },
    ]);
    assert.ok(
      messagesDe(contrat).some((warning: string) => (
        warning.includes('combinaisons de valeurs de ses variant properties n\'ont pas de variant')
      )),
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('les props propres au wrapper sont fusionnées avant leurs liaisons natives', async () => {
  const figmaFaux = monterFigma({
    enfantsDuVariant: () => {
      const wrapperSet = node('COMPONENT_SET', 'Dimensions', [], {
        componentPropertyDefinitions: {
          'Wrapper label#2:3': { type: 'TEXT', defaultValue: 'Libellé' },
        },
      });
      return [node('INSTANCE', 'Wrapper', [], {
        layoutMode: 'HORIZONTAL',
        boundVariables: { itemSpacing: alias('gap') },
        componentProperties: { 'Wrapper label#2:3': { type: 'TEXT', value: 'Libellé' } },
        componentPropertyReferences: { characters: 'Wrapper label#2:3' },
        getMainComponentAsync: async () => ({ name: 'Dimensions=Default', parent: wrapperSet }),
      })];
    },
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.props.wrapperLabel.type, 'string');
    assert.ok(contrat.variants.some((variant: any) => (
      (variant.bindings ?? []).some((placement: any) => {
        const binding = contrat.propertyBindingDefinitions[placement.definition];
        return binding.prop === 'wrapperLabel'
          && binding.figmaPropName === 'Wrapper label#2:3'
          && binding.target === 'characters';
      })
    )));
    assert.equal(
      messagesDe(contrat).some((warning: string) => (
        warning.includes('Wrapper label') && warning.includes('mais le contrat ne la publie pas')
      )),
      false,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('un Component Set vide bloque avant de produire une fausse variante', async () => {
  const figmaFaux = monterFigma();
  figmaFaux.componentSet.children = [];
  try {
    await assert.rejects(handleExportComponent(), /ne contient aucun variant\./);
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
 * manifest. **Il a été retiré** : un plugin publié sur la Community n'a pas le
 * droit de le porter, donc `figma.fileKey` reste indéfini et `meta.figma.url`
 * n'est plus écrit. Le calcul reste en place et ces deux tests le tiennent dans
 * les deux sens : il fonctionne dès que l'API rend la clé (une organisation qui
 * charge ce plugin en développement), et son
 * absence est un état normal qui ne se signale plus.
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
      messagesDe(contrat).some((warning: string) => warning.includes('Lien vers Figma')),
      false,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('sans clé de fichier, le contrat n’a pas de lien et n’en fait pas un sujet', async () => {
  // **C'est la moitié la plus importante du passage à la Community.** Le message d'avertissement
  // était écrit quand ce cas était l'exception. La distribution par la
  // Community l'inverse : la clé n'arrive plus jamais, donc le message se
  // serait imprimé sur chaque export et dans le corps de chaque pull request,
  // pour un constat que le designer ne peut pas corriger. Une liste dont on
  // apprend qu'elle se survole coûte la lecture de celles qui demandent un
  // geste : la règle du projet, appliquée à sa propre décision.
  const figmaFaux = monterFigma();
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(contrat.meta.figma.url, undefined);
    // Ce qui remplace le lien est là, et c'est ce que la couverture de la pull
    // request annonce désormais.
    assert.equal(contrat.meta.figma.fileName, 'Design System');
    assert.ok(contrat.meta.figma.nodeId);
    assert.equal(
      messagesDe(contrat).some((message: string) => message.includes('Lien vers Figma')),
      false,
    );
  } finally {
    figmaFaux.restaurer();
  }
});

/*
 * Classification des diagnostics.
 *
 * `handleExportComponent` range chaque message dans l'une de trois catégories,
 * et c'est ce rangement que publient `meta.diagnostics[].code` et
 * `meta.coverage.portable`. Le mécanisme est une fenêtre ouverte avant une
 * étape et refermée après : tout ce que l'étape a poussé entre les deux est
 * une perte de portabilité.
 *
 * Rien ne le vérifiait. Les assertions existantes portent sur le résultat
 * (« la couverture est partielle », « un diagnostic de perte existe ») dans des
 * scénarios où plusieurs étapes produisent une perte : supprimer n'importe
 * laquelle des cinq fermetures laissait la suite entièrement verte. Ces tests
 * portent donc sur le code du message de chaque étape, un par fenêtre : la
 * seule forme d'assertion qu'un oubli de rangement fasse échouer.
 */

/** Le diagnostic unique dont le message contient cet extrait. */
function diagnosticPour(contrat: any, extrait: string) {
  const trouves = contrat.meta.diagnostics.filter(
    (diagnostic: any) => diagnostic.message.includes(extrait),
  );
  assert.equal(
    trouves.length,
    1,
    `attendu un seul diagnostic contenant « ${extrait} ». Diagnostics publiés :\n`
      + contrat.meta.diagnostics.map((d: any) => `  [${d.code}] ${d.message}`).join('\n'),
  );
  return trouves[0];
}

test('une collision de props du set est rangée comme une perte de portabilité', async () => {
  const figmaFaux = monterFigma();
  figmaFaux.componentSet.componentPropertyDefinitions = {
    ...figmaFaux.componentSet.componentPropertyDefinitions,
    'Icon Left#1:1': { type: 'BOOLEAN', defaultValue: true },
    'icon-left#1:2': { type: 'BOOLEAN', defaultValue: false },
  };
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    // Une des deux props n'est pas exportée : le contrat décrit moins que Figma.
    assert.equal(
      diagnosticPour(contrat, 'leurs noms donnent le même nom').code,
      'UCM_PORTABLE_PROJECTION_WARNING',
    );
    assert.equal(contrat.meta.coverage.portable, 'partial');
  } finally {
    figmaFaux.restaurer();
  }
});

test('une collision de props du wrapper est rangée comme une perte de portabilité', async () => {
  // Le wrapper apporte ses propres props, et sa lecture a sa propre fenêtre.
  const figmaFaux = monterFigma({
    enfantsDuVariant: () => {
      const wrapperSet = node('COMPONENT_SET', 'Dimensions', [], {
        componentPropertyDefinitions: {
          'Wrapper label#2:3': { type: 'TEXT', defaultValue: 'Libellé' },
          'wrapper-label#2:4': { type: 'TEXT', defaultValue: 'Doublon' },
        },
      });
      return [node('INSTANCE', 'Wrapper', [], {
        layoutMode: 'HORIZONTAL',
        boundVariables: { itemSpacing: alias('gap') },
        componentProperties: { 'Wrapper label#2:3': { type: 'TEXT', value: 'Libellé' } },
        getMainComponentAsync: async () => ({ name: 'Dimensions=Default', parent: wrapperSet }),
      })];
    },
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(
      diagnosticPour(contrat, 'wrapper-label').code,
      'UCM_PORTABLE_PROJECTION_WARNING',
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('une liaison native sans prop publique est rangée comme une perte de portabilité', async () => {
  // Le layer référence une component property que la collision a écartée : la
  // liaison n'est pas publiée, et le développeur ne saura pas la rendre.
  const figmaFaux = monterFigma({
    enfantsDuVariant: () => [node('FRAME', 'Zone', [], {
      componentPropertyReferences: { visible: 'Fantôme#3:1' },
    })],
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(
      diagnosticPour(contrat, 'mais le contrat ne la publie pas').code,
      'UCM_PORTABLE_PROJECTION_WARNING',
    );
    assert.equal(contrat.meta.coverage.portable, 'partial');
  } finally {
    figmaFaux.restaurer();
  }
});

test('une variable introuvable est rangée comme une perte de portabilité', async () => {
  // Le résolveur écrit pendant l'extraction de la structure, dans la fenêtre
  // de celle-ci : c'est une couleur que le contrat ne publiera pas.
  const figmaFaux = monterFigma({
    enfantsDuVariant: () => [node('FRAME', 'Zone', [], {
      fills: [{
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0 },
        boundVariables: { color: alias('variable-supprimee') },
      }],
      boundVariables: { fills: [alias('variable-supprimee')] },
    })],
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(
      diagnosticPour(contrat, 'Variable introuvable').code,
      'UCM_PORTABLE_PROJECTION_WARNING',
    );
    assert.equal(contrat.meta.coverage.portable, 'partial');
  } finally {
    figmaFaux.restaurer();
  }
});

test('une règle @icons sans layer est rangée comme une perte de portabilité', async () => {
  // La fusion des règles d'icônes a sa propre fenêtre, la dernière des cinq.
  const figmaFaux = monterFigma();
  // La politique se lit sur la visibilité exclusive de deux layers : les deux
  // doivent exister, un seul être visible.
  const regleIcones = regle('@icons', [
    node('TEXT', 'icon', [], { characters: 'fantome' }),
    node('FRAME', 'modifiable', []),
    node('FRAME', 'strict', [], { visible: false }),
  ]);
  const conteneur = (globalThis as any).figma.currentPage.children.find(
    (enfant: any) => enfant.name === '.componentRules',
  );
  conteneur.children.push(regleIcones);
  regleIcones.parent = conteneur;
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.equal(
      diagnosticPour(contrat, 'aucun layer de ce nom').code,
      'UCM_PORTABLE_PROJECTION_WARNING',
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('deux variants dont la grille diffère publient chacun ses pistes, sans un mot', async () => {
  // Le cas qui a fait naître puis mourir un message. Un même calque de grille
  // n'a pas les mêmes pistes dans tous les variants : la note de piste FIXED se
  // contredisait d'un variant à l'autre sur le même nom de calque. La réponse
  // n'était pas de mieux la rédiger : les vues exactes portent déjà les deux
  // grilles, donc rien ne manquait et rien n'était à corriger.
  let appel = 0;
  const figmaFaux = monterFigma({
    avecRegles: false,
    enfantsDuVariant: () => {
      appel += 1;
      return [
        node('FRAME', 'TilesGrid', [node('TEXT', 'Tuile', [], { characters: 'Tuile' })], {
          layoutMode: 'GRID',
          gridRowSizes: appel === 1
            ? [{ type: 'FIXED', value: 15 }, { type: 'HUG' }]
            : [{ type: 'FIXED', value: 15 }, { type: 'FIXED', value: 20 }, { type: 'HUG' }],
          gridColumnSizes: [{ type: 'FLEX', value: 1 }],
        }),
      ];
    },
  });
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);
    // Les deux grilles sont dans le contrat, chacune dans sa vue exacte.
    const pistes = Object.values(contrat.viewStructures as Record<string, any>)
      .flatMap((vue: any) => (vue.children ?? []))
      .map((enfant: any) => enfant.rowSizes)
      .filter(Boolean);
    assert.deepEqual(pistes.sort(), [
      ['15px', '20px', 'fit-content(100%)'],
      ['15px', 'fit-content(100%)'],
    ].sort());
    // Et rien n'est dit au designer : ni un message, ni deux qui se contredisent.
    assert.equal(resultat.warnings.some((m) => m.includes('publiées en pixels')), false);
    assert.equal(messagesDe(contrat).some((m) => m.includes('publiées en pixels')), false);
  } finally {
    figmaFaux.restaurer();
  }
});

/**
 * La preuve d'ensemble : les sept transformations dans un seul export.
 *
 * Les tests voisins prennent chaque cas isolément, et c'est ce qu'il faut pour
 * dire pourquoi chacun se tait. Celui-ci répond à l'autre question, celle que
 * `Stresstest` a posée en vrai : quand les sept arrivent ensemble sur un même
 * composant, le compte rendu reste-t-il vide ? C'est le cas qui a fait retirer
 * le canal des constats,
 * et le seul qui puisse le refermer.
 *
 * Il vérifie les deux moitiés à la fois, et c'est délibéré : que le contrat
 * porte les sept, et que l'export n'en dise aucun. La première seule laisserait
 * revenir un message ; la seconde seule serait verte sur un moteur qui aurait
 * cessé de publier `inset`, `rotation`, `rowSizes` ou `structuralSize`.
 */
test('les sept transformations normales cohabitent sans un mot au designer', async () => {
  let appel = 0;
  const figmaFaux = monterFigma({
    avecRegles: false,
    enfantsDuVariant: () => {
      appel += 1;
      const rang = appel;
      // 6. Un calque hors du flux, 7. incliné dans ce flux.
      const badge = node('FRAME', 'Badge', [], {
        layoutPositioning: 'ABSOLUTE',
        constraints: { horizontal: 'MAX', vertical: 'MIN' },
        layoutSizingHorizontal: 'HUG',
        layoutSizingVertical: 'HUG',
        width: 16,
        height: 16,
        relativeTransform: [[1, 0, 100], [0, 1, 4]],
        fills: [],
      });
      const chevron = node('FRAME', 'Chevron', [], {
        rotation: 45,
        layoutSizingHorizontal: 'HUG',
        layoutSizingVertical: 'HUG',
        relativeTransform: [
          [Math.SQRT1_2, -Math.SQRT1_2, 40],
          [Math.SQRT1_2, Math.SQRT1_2, 4],
        ],
        fills: [],
      });
      // 4. Une piste FIXED publiée en pixels, 5. un enfant qui mesure sa piste
      //    qui hug.
      const tuile = node('FRAME', 'Tile', [], {
        layoutSizingHorizontal: 'FILL',
        // Sous une grille, Figma ne renvoie pas `FILL` sur cet axe : la piste
        // qui hug ne l'expose pas, et il ne rend que la taille résolue.
        layoutSizingVertical: 'FIXED',
        height: 15,
        gridColumnAnchorIndex: 0,
        gridRowAnchorIndex: 1,
        boundVariables: { fills: [alias('background')] },
        fills: [{ type: 'SOLID', visible: true, boundVariables: { color: alias('background') } }],
      });
      const grille = node('FRAME', 'TilesGrid', [tuile], {
        layoutMode: 'GRID',
        gridColumnCount: 1,
        gridRowCount: rang === 1 ? 2 : 3,
        gridColumnSizes: [{ type: 'FLEX', value: 1 }],
        // 3. Un auto layout qui diffère d'un variant à l'autre.
        gridRowSizes: rang === 1
          ? [{ type: 'FIXED', value: 120 }, { type: 'HUG' }]
          : [{ type: 'FIXED', value: 120 }, { type: 'HUG' }, { type: 'HUG' }],
      });
      // 8. Un contenu de maquette qui change d'un variant à l'autre.
      const libelle = node('TEXT', 'Libellé', [], {
        characters: rang === 1 ? 'Continuer' : 'Terminer',
      });
      // 1. et 2. Une composition et une structure propres à un variant : le
      //    second porte un calque que le premier n'a pas.
      return rang === 1
        ? [badge, chevron, grille, libelle]
        : [badge, chevron, grille, libelle, node('FRAME', 'Extra', [], { fills: [] })];
    },
  });
  const composant = (globalThis as any).figma.currentPage.selection[0];
  composant.width = 160;
  composant.height = 80;
  for (const variante of composant.children) {
    variante.width = 160;
    variante.height = 80;
  }
  try {
    const resultat = await handleExportComponent();
    const contrat = JSON.parse(resultat.content);
    const vues = Object.values(contrat.viewStructures as Record<string, any>);
    const enfants = (vue: any): any[] =>
      (vue.children ?? []).flatMap((enfant: any) => [enfant, ...enfants(enfant)]);
    const tousLesEnfants = vues.flatMap(enfants);
    const parCalque = (nom: string) =>
      tousLesEnfants.filter((enfant: any) => (enfant.figmaLayer ?? enfant.slot) === nom);

    // Les sept sont dans le contrat. C'est la moitié qui rend le silence honnête.
    assert.ok(parCalque('Badge').some((badge) => badge.position === 'absolute'), 'position');
    assert.ok(parCalque('Badge').some((badge) => badge.inset), 'inset');
    assert.ok(parCalque('Chevron').some((chevron) => chevron.rotation), 'rotation');
    assert.ok(
      parCalque('TilesGrid').some((grille) => (grille.rowSizes ?? []).includes('120px')),
      'piste FIXED en pixels',
    );
    assert.ok(parCalque('Tile').some((tuile) => tuile.structuralSize), 'mesure de la cellule');
    // Structure, auto layout et composition propres à un variant : deux vues
    // exactes distinctes, et un calque que la seconde seule porte.
    assert.ok(Object.keys(contrat.variantViews).length > 1, 'vues exactes');
    assert.ok(parCalque('Extra').length > 0, 'structure propre à un variant');
    // Contenu de maquette : les deux libellés sont conservés.
    const contenus = JSON.stringify(contrat.samples ?? {});
    assert.ok(contenus.includes('Continuer') && contenus.includes('Terminer'), 'samples');

    // Et aucun des sept ne se dit. Le compte rendu du designer ne parle donc
    // jamais de ce que le contrat a su décrire.
    const interdits = [
      /position « Absolute »/,
      /rotation est publiée/,
      /publiées en pixels/,
      /qui hug publient/,
      /Structure différente/,
      /Auto layout différent/,
      /Composition différente/,
      /Contenu de maquette différent/,
    ];
    for (const interdit of interdits) {
      assert.deepEqual(
        messagesDe(contrat).filter((message) => interdit.test(message)),
        [],
        `un diagnostic est revenu pour ${interdit}`,
      );
      assert.deepEqual(
        resultat.warnings.filter((message) => interdit.test(message)),
        [],
        `un avertissement est revenu pour ${interdit}`,
      );
    }
  } finally {
    figmaFaux.restaurer();
  }
});

test('des calques homonymes reçoivent chacun une adresse, et les peintures la suivent', async () => {
  // Trois cadres nommés « box », « box » et « box-2 » : le nommage par compte
  // donnait deux « box-2 », et le chemin de peinture du troisième désignait le
  // deuxième. Chaque cadre porte la même couleur, si bien que la clé unique
  // relève les trois adresses et qu'un doublon se verrait dans la liste.
  const cadre = (nom: string) => node('FRAME', nom, [], {
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }],
    boundVariables: { fills: [alias('background')] },
  });
  const figmaFaux = monterFigma({
    enfantsDuVariant: () => [cadre('box'), cadre('box'), cadre('box-2')],
  });
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    const slots = structureDe(contrat).children.map((child: any) => child.slot);
    assert.deepEqual(slots, ['label', 'box', 'box-2', 'box-2-2']);
    assert.equal(new Set(slots).size, slots.length);

    // Le troisième cadre garde son nom Figma, que son slot ne dit plus.
    const renomme = structureDe(contrat).children.find((child: any) => child.slot === 'box-2-2');
    assert.equal(renomme.figmaLayer, 'box-2');

    // Les trois cadres sont peints, chacun à son adresse.
    const peintures = vueDe(contrat, contrat.variants[0]).paintPlacements;
    const chemins = Object.values(peintures.fills ?? {}).flat() as string[][];
    for (const attendu of [['box'], ['box-2'], ['box-2-2']]) {
      assert.ok(
        chemins.some((chemin) => JSON.stringify(chemin) === JSON.stringify(attendu)),
        `aucune peinture ne vise [${attendu}] parmi ${JSON.stringify(chemins)}`,
      );
    }
  } finally {
    figmaFaux.restaurer();
  }
});

test('deux axes dont les noms se confondent refusent l’export', async () => {
  // Les props gardaient `kind: ["a"]`, les axes devenaient `["kind", "kind"]` et
  // le variant publiait `kind: "b"` : le lecteur refusait l'artefact produit, et
  // le diagnostic annonçait pourtant la conservation du premier axe.
  const figmaFaux = monterFigma();
  const [contained, outlined] = figmaFaux.componentSet.children;
  figmaFaux.componentSet.componentPropertyDefinitions = {
    Kind: { type: 'VARIANT', variantOptions: ['A'], defaultValue: 'A' },
    kind: { type: 'VARIANT', variantOptions: ['B'], defaultValue: 'B' },
  };
  contained.name = 'Kind=A, kind=B';
  contained.variantProperties = { Kind: 'A', kind: 'B' };
  outlined.name = 'Kind=A, kind=B';
  outlined.variantProperties = { Kind: 'A', kind: 'B' };
  try {
    await assert.rejects(
      handleExportComponent(),
      (erreur: Error) => {
        assert.match(erreur.message, /Variant properties « Kind » et « kind »/);
        assert.match(erreur.message, /aucun fichier n’est écrit/);
        assert.match(erreur.message, /Renommez l’une des deux dans Figma/);
        return true;
      },
    );
  } finally {
    figmaFaux.restaurer();
  }
});

test('deux tailles sans dimension liée restent publiées, chacune à vide', async () => {
  // `structure.sizes.*` est une entrée protégée : c'est la clé qui porte
  // l'information, et retirer l'entrée retirerait la taille de la liste de
  // celles que le composant expose. La loi d'élision refusait cette forme.
  const figmaFaux = monterFigma();
  const [contained, outlined] = figmaFaux.componentSet.children;
  figmaFaux.componentSet.componentPropertyDefinitions = {
    Size: { type: 'VARIANT', variantOptions: ['Small', 'Large'], defaultValue: 'Small' },
  };
  for (const [variantNode, taille] of [[contained, 'Small'], [outlined, 'Large']] as const) {
    variantNode.name = `Size=${taille}`;
    variantNode.variantProperties = { Size: taille };
    // Aucune dimension liée : espacements et rayons restent à zéro, et Figma ne
    // cite aucune variable qui les décrirait.
    variantNode.boundVariables = {};
  }
  try {
    const contrat = JSON.parse((await handleExportComponent()).content);

    assert.deepEqual(contrat.structure.sizes, { small: {}, large: {} });
    // La prop qui sélectionne le catalogue expose bien les deux tailles.
    assert.deepEqual(contrat.props.size.values, ['small', 'large']);
    // Et elles survivent à l'écriture du fichier, où rien ne les élide.
    const texte = (await handleExportComponent()).content;
    assert.match(texte, /"sizes":\{"small":\{\},"large":\{\}\}/);
    assert.deepEqual(JSON.parse(texte).structure.sizes, { small: {}, large: {} });
  } finally {
    figmaFaux.restaurer();
  }
});

test('la loi de l’union des dépendances refuse un agrégat muté', async () => {
  // La loi ne comparait qu'une somme de cardinalités : elle acceptait le
  // remplacement d'une dépendance par une autre et la disparition de l'agrégat,
  // que le contrôle du graphe refuse chez le consommateur.
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
    // `handleExportComponent` passe déjà toutes les lois : le contrat de départ
    // est accepté, et deux occurrences y portent le même composant.
    const contrat = JSON.parse((await handleExportComponent()).content);
    assert.deepEqual(contrat.composes, [
      { component: 'Link', figmaLayer: 'Lien 1' },
      { component: 'Link', figmaLayer: 'Lien 2' },
    ]);

    const mute = (changer: (c: any) => void) => {
      const copie = JSON.parse(JSON.stringify(contrat));
      changer(copie);
      return copie;
    };
    const refuse = (quoi: string, changer: (c: any) => void) => {
      assert.throws(
        () => verifierLesLois(mute(changer), 'agrégat muté'),
        /union ordonnée des dépendances des variants/,
        `la loi accepte ${quoi}`,
      );
    };

    refuse('une dépendance remplacée', (c) => { c.composes[0].component = 'Other'; });
    refuse('un calque remplacé', (c) => { c.composes[0].figmaLayer = 'Ailleurs'; });
    refuse('une occurrence manquante', (c) => { c.composes.pop(); });
    refuse('une occurrence supplémentaire', (c) => { c.composes.push({ ...c.composes[0] }); });
    refuse('une séquence permutée', (c) => { c.composes.reverse(); });
    refuse('une visibilité inventée', (c) => { c.composes[0].visibilityProp = 'afficherLien'; });
    refuse('un agrégat absent', (c) => { delete c.composes; });

    // Et l'inverse : un agrégat que plus aucune vue ne justifie.
    assert.throws(
      () => verifierLesLois(
        mute((c) => {
          for (const vue of Object.values(c.variantViews) as any[]) delete vue.composes;
          delete c.viewComposes;
        }),
        'agrégat sans vue',
      ),
      /composes est publié alors qu’aucune vue ne place de dépendance|composes est publié alors qu'aucune vue ne place de dépendance/,
    );
  } finally {
    figmaFaux.restaurer();
  }
});
