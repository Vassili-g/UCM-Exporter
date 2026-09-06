
/** Empêche un raccourcissement documentaire de supprimer un invariant entier. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

/** Ordre attendu des domaines d'invariants dans `AGENTS.md`. */
const DOMAINES = [
  'Portee et forme du contrat',
  'Tokens et variables',
  'Couleurs',
  'Composition',
  'Arbre des slots',
  'Layout, dimensions et bornes',
  'Grilles',
  'Diagnostics',
  'Echantillon de maquette',
  'Versionnage',
];

/** Termes dont la disparition signalerait une règle perdue. */
const AUTORITES = [
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'COMPONENT_SET',
  'CONTRACT_VERSION',
  'Constat',
  'ELLIPSE',
  'FIXED',
  'GridTrackSize.value',
  'INSTANCE_SWAP',
  'InstanceNode.overrides',
  'LINE',
  'POLYGON',
  'RECTANGLE',
  'SLOT',
  'SOLID',
  'STAR',
  'VECTOR',
  'alignItems',
  'alignSelf',
  'args',
  'argumentsOf',
  'bounds',
  'clipsContent',
  'codeIdentifier',
  'colorKeys',
  'colorKeys.ts',
  'columnSizes',
  'columnStart',
  'componentProperties',
  'componentPropertyReferences',
  'composes',
  'constraints',
  'contractVersion',
  'defaultRenderingSemantics()',
  'diagnostics[].message',
  'divider.background',
  'elideNeutrals.ts',
  'enablePrivatePluginApi',
  'exportsEnVol()',
  'figma.fileKey',
  'figmaLayer',
  'figmaName',
  'fileName',
  'findLayoutNode',
  'flexGrow',
  'flexLayout.rotationDegrees',
  'format/version.ts',
  'getSlotTokens',
  'hasCompleteBinding',
  'icons.*.size',
  'icons.*.slot',
  'indexVariables()',
  'inset',
  'isMask',
  'isVisibleInSample',
  'justifyContent',
  'kebabCase',
  'layoutNodes.ts',
  'lirePeintures',
  'mainComponent',
  'masterPath',
  'mergeIconRules',
  'meta.coverage.portable',
  'meta.diagnostics',
  'meta.figma.url',
  'nodeBindings.estUnTrace',
  'nodeId',
  'normalizeName',
  'normalizeName()',
  'override.text',
  'override.visible',
  'overrides',
  'packages/kit/schema/ucm-contract.schema.json',
  'packages/kit/src/format/names.ts',
  'packages/plugin/tests/lois.ts',
  'padding.x',
  'padding.y',
  'paintPlacements',
  'phraseDe',
  'propertyBindingDefinitions',
  'propertyBindings.appliedValue',
  'propertySurfaces',
  'rendering.keyRoles',
  'rendering.roles',
  'resolveSlotSize',
  'rowGap',
  'rowSizes',
  'rowStart',
  'rulesContainerOwner',
  'runtimeProp',
  'samples',
  'sansLienAutomatique()',
  'serializeJson.ts',
  'slotNames.ts',
  'src/contract/localisation.ts',
  'src/github.ts',
  'stateModel',
  'stateModel.states.default',
  'structuralSize',
  'structure.children',
  'structure.sizing',
  'structureTree.publishesChildren',
  'structureTree.ts',
  'swaps',
  'tests/loiDesParties.test.ts',
  'textSlots',
  'textStyles',
  'tokenCssVariable',
  'tokens.json',
  'tokensUsed',
  'types.ts',
  'userinput.background',
  'variantAxes',
  'variantViews',
  'variantViews.*.paintPlacements',
  'variants[].bindings',
  'variants[].sample',
  'variants[].tokens',
  'versionDeContrat()',
  'visibilityProp',
  'visibilityTargets',
];

/** Isole la section contrôlée sans dépendre du reste du guide. */
function sectionDesInvariants() {
  const contenu = fs.readFileSync(path.join(racine, 'AGENTS.md'), 'utf8');
  const debut = contenu.indexOf('## Invariants');
  const fin = contenu.indexOf('## Vérification');
  assert.ok(debut !== -1, "AGENTS.md n'a plus de section « Invariants »");
  assert.ok(fin > debut, "AGENTS.md n'a plus de section « Verification » apres les invariants");
  return contenu.slice(debut, fin);
}

const sansAccent = (texte: string): string =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '');

test("les dix domaines d'invariants sont la, dans leur ordre", () => {
  const bloc = sansAccent(sectionDesInvariants());
  const trouves = [...bloc.matchAll(/^### (.+)$/gm)].map((t) => t[1].trim());
  assert.deepEqual(trouves, DOMAINES);
});

test('chaque domaine porte au moins un invariant', () => {
  const bloc = sectionDesInvariants();
  const vides = [];
  const parties = bloc.split(/^### /m).slice(1);
  for (const partie of parties) {
    const titre = partie.split(/\r?\n/, 1)[0].trim();
    if (!/^- /m.test(partie)) vides.push(titre);
  }
  assert.deepEqual(vides, [], `Ces domaines n'ont plus aucune regle : ${vides.join(', ')}`);
});

test("aucune autorite citee par un invariant n'a disparu", () => {
  const bloc = sectionDesInvariants();
  const perdues = AUTORITES.filter((autorite) => !bloc.includes(autorite));

  assert.deepEqual(
    perdues,
    [],
    'Ces autorites ne sont plus nommees par aucun invariant :\n'
      + `${perdues.join('\n')}\n`
      + "Une regle a probablement ete perdue en raccourcissant. Si le retrait est "
      + "voulu, retirer l'entree de AUTORITES dans le meme commit, et dire dans le "
      + 'message quelle regle part avec elle.',
  );
});
