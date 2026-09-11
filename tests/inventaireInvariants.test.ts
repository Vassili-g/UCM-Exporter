
/**
 * Tient l'accord entre `AGENTS.md` et le dépôt, dans les deux sens, et tient
 * les deux spécifications contre leur propre appauvrissement.
 *
 * Vers le document : un raccourcissement ne peut pas supprimer un invariant
 * entier, ni retirer un test de la carte du code. Vers le code : une autorité
 * que le document cite existe encore là où il la situe. Les deux sens sont
 * nécessaires, et l'un sans l'autre laisse passer exactement ce que l'autre
 * attrape : un document appauvri, ou un document qui nomme ce qui a été
 * renommé.
 *
 * `docs/FORMAT.md` et `packages/plugin/SPEC.md` portent la règle et son
 * pourquoi, et rien ne les tenait. Deux listes les couvrent : leur vocabulaire,
 * qui voit un nom disparaître, et leur squelette de titres et d'énoncés, qui
 * voit partir une règle entière.
 */
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

/**
 * Termes dont la disparition signalerait une règle perdue.
 *
 * La liste sert deux contrôles : le document les nomme encore, et le code les
 * porte encore. Une entrée qui contient `/` ou finit par `.ts` ou `.mjs` est un
 * chemin, et un fichier du dépôt doit s'y terminer ; toute autre est un
 * vocabulaire, et chacun de ses segments doit apparaître comme mot entier dans
 * les sources du produit.
 */
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
  'joinTokenPath',
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

/**
 * Le même contrôle, porté sur les deux spécifications.
 *
 * `AGENTS.md` était seul tenu, alors que la règle et son pourquoi vivent dans
 * `docs/FORMAT.md` et `packages/plugin/SPEC.md` : un raccourcissement pouvait y
 * retirer une règle entière sans qu'un lien ne meure ni qu'un invariant ne
 * bouge. Chaque terme est un nom que la spécification employait quand la liste
 * a été relevée, donc un endroit où elle dit quelque chose.
 */
const AUTORITES_FORMAT = [
  'BOOLEAN_OPERATION', 'COMPONENT_SET', 'CONTRACT_VERSION', 'FIXED', 'GridTrackSize.value',
  'INSTANCE_SWAP', 'InstanceNode.overrides', 'LINE', 'POLYGON', 'SLOT', 'STAR', 'VECTOR',
  'alignItems', 'alignSelf', 'args', 'bounds', 'colorKeys', 'columnSizes', 'columnStart',
  'componentProperties', 'componentPropertyReferences', 'composes', 'constraints',
  'contractVersion', 'divider.background', 'figmaLayer', 'figmaName', 'fileName',
  'flexGrow', 'format/version.ts', 'icons.*.size', 'indexVariables()', 'inset',
  'justifyContent', 'kebabCase', 'mainComponent', 'masterPath', 'mergeIconRules',
  'meta.coverage.portable', 'meta.figma.url', 'nodeId', 'normalizeName()',
  'override.visible', 'packages/kit/schema/ucm-contract.schema.json', 'padding.x',
  'paintPlacements', 'propertyBindingDefinitions', 'propertyBindings.appliedValue',
  'rendering.keyRoles', 'rendering.roles', 'rowGap', 'rowSizes', 'rowStart', 'runtimeProp',
  'samples', 'stateModel', 'structuralSize', 'structure.children', 'structure.sizing',
  'structureTree.ts', 'swaps', 'textStyles', 'tokenCssVariable', 'tokens.json', 'types.ts',
  'userinput.background', 'variantAxes', 'variantViews', 'variants[].bindings',
  'variants[].tokens', 'visibilityProp', 'visibilityTargets',
];

const AUTORITES_SPEC = [
  'COMPONENT_SET', 'Constat', 'ELLIPSE', 'FIXED', 'LINE', 'RECTANGLE', 'codeIdentifier',
  'composes', 'enablePrivatePluginApi', 'figma.fileKey', 'figmaName', 'fileName',
  'meta.diagnostics', 'meta.figma.url', 'nodeId', 'normalizeName()', 'stateModel',
  'textStyles', 'tokens.json', 'variantViews', 'variants[].tokens',
];

/**
 * Le squelette de chaque spécification : ses titres et ses énoncés en gras.
 *
 * La liste de vocabulaire ci-dessus ne voit disparaître un nom qu'à sa
 * dernière mention. Le paragraphe « La règle d'adressage » a été retiré de
 * `FORMAT.md` pour l'éprouver : le contrôle est resté vert, parce que ses noms
 * vivaient ailleurs dans le document. Ce second contrôle porte donc sur ce qui
 * disparaît avec une règle entière, son titre ou son énoncé en gras.
 */
const ENONCES_FORMAT = [
  "La règle commune",
  "1. Props",
  "D'où vient une valeur par défaut",
  "2. Tokens de variantes",
  "3. Layout",
  "4. Modèle d'interaction",
  "5. Typographie",
  "6. Structure",
  "Flux et alignement",
  "Dimensions et bornes",
  "Position absolue",
  "Rotation",
  "Grilles",
  "Propriétés non portables",
  "Passage à la ligne",
  "7. Intention et documentation des props",
  "Ce que le contrat ne dit pas d'une icône",
  "8. Rendu sémantique et garde-fous",
  "9. Échantillon de maquette",
  "Sortie",
  "Fichier et exemple",
  "Composition et dépendances",
  "Cadre de dépendance",
  "Métadonnées",
  "Ce que le schéma décrit, et ce qu'il documente",
  "Projeter un token en propriété personnalisée CSS.",
  "Ce que le contrat ne garantit pas.",
  "Une clé que deux couleurs partagent s'allonge.",
  "séparent",
  "Les côtés peuvent différer.",
  "Un tracé n'est pas une boîte.",
  "La descente ne connaît ni profondeur, ni nature de composant.",
  "Une absence de dimensionnement vaut `Hug`.",
  "Dimensions figées des slots.",
  "Dimensionnement du composant.",
  "Bornes de taille.",
  "Sous une grille, c'est la cellule qui décide de la boîte.",
  "Cette exception s'étend de la piste à la cellule, et là seulement.",
  "Ce que Figma porte et qu'aucun champ du schéma n'écrit",
  "traduire un nom d'icône vers quelque chose qui se dessine.",
  "Ce que le contrat garantit.",
  "Ce qu'il ne garantit pas, et ne garantira pas.",
  "La contrepartie de cette responsabilité est `ucm icons`.",
  "Une clé de couleur n'est pas un rôle",
  "Aucun rôle de contour ne cite une propriété qui consomme la boîte.",
  "Ce que l'échantillon porte.",
  "La règle d'adressage.",
  "La frontière avec la composition.",
  "Ce que `overrides` ne peut pas voir : `swaps`.",
  "Quand la dépendance expose son remplacement.",
  "Ce qu'il ne demande jamais.",
  "Le contenu d'une dépendance se lit en deux temps",
  "La reconstruction est un zipper récursif, pas une recherche globale.",
  "Ce qu'il ne publie pas, faute d'apporter quoi que ce soit.",
  "Une dimension géométrique ne se lit qu'à un endroit, et lequel dépend du\ncomposant.",
  "Un cadre qui enveloppe une ou plusieurs dépendances.",
  "`meta.figma.url` est optionnel, et son absence est un état normal.",
  "2. Résolution des alias (tous types)",
  "référence DTCG",
  "3. Modes = marques",
  "4. DTCG",
];

const ENONCES_SPEC = [
  "Algorithme",
  "La règle commune",
  "1. Props",
  "2. Tokens de variantes",
  "3. Layout",
  "4. Modèle d'interaction",
  "5. Typographie",
  "6. Structure",
  "Un dessin que rien ne déclare",
  "Position absolue : pourquoi des pixels",
  "Rotation : le seuil de neutralité",
  "Propriétés non portables : la portée du relevé",
  "Passage à la ligne : les mots du message",
  "9. Échantillon de maquette",
  "7. Intention et documentation des props",
  "8. Rendu sémantique et garde-fous",
  "Ce que l'export écrit",
  "Le nom du fichier, et ce qu'il unifie",
  "Composition et dépendances",
  "Métadonnées",
  "Les variables d'environnement, et pourquoi elles ne sont pas une interface",
  "Sélectionner et cadrer ne sont pas modifier",
  "Entrée",
  "Applicabilité avant liaison.",
  "Un dessin qu'aucune règle ne désigne avertit.",
  "Pourquoi un nombre, ici.",
  "Une notice, jamais un avertissement.",
  "Ce que l'export unifie avant d'écrire.",
  "Ce qui entre dans ce catalogue est borné :",
  "1. Lister",
  "Le corps de la pull request a deux zones, et la frontière compte.",
  "Le schéma annoncé est lu dans le fichier déposé, jamais dans la constante du\nplugin.",
  "Les trois parties voyagent séparées jusqu'à l'interface.",
  "Un avertissement arrive inerte dans la page GitHub.",
  "Aucune de ces trois interfaces n'est figée, délibérément.",
  "Tranché, et la question se reposera.",
  "Ce qui reste à vérifier, et qui n'est pas vérifiable depuis ce dépôt :",
  "La frontière que cette décision ne déplace pas.",
];

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

test("aucune autorite citee par un invariant n'a disparu du document", () => {
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

/**
 * Les fichiers que la carte du code range sous `tests/`.
 *
 * La carte vit dans un bloc `text` et n'a aucune syntaxe : le bloc `tests/`
 * commence à la ligne qui porte ce nom en début de colonne, et se termine à la
 * première ligne qui n'est plus une entrée indentée.
 */
function testsListesParLaCarte(): string[] {
  const contenu = fs.readFileSync(path.join(racine, 'AGENTS.md'), 'utf8');
  const lignes = contenu.split(/\r?\n/);
  const depart = lignes.findIndex((ligne) => ligne.startsWith('tests/'));
  assert.ok(depart !== -1, "la carte du code d'AGENTS.md n'a plus de bloc « tests/ »");

  const listes: string[] = [];
  for (const ligne of lignes.slice(depart + 1)) {
    const entree = ligne.match(/^ {2}(\S+)/);
    if (!entree) break;
    listes.push(entree[1]);
  }
  return listes;
}

/**
 * La carte du code annonce ce que le dépôt contient, donc elle se périme comme
 * tout inventaire tenu à la main. Un test ajouté sans y être écrit reste
 * invisible à qui lit le guide avant de modifier, et c'est arrivé.
 *
 * Le contrôle porte sur `tests/` seul : c'est le seul bloc de la carte qui
 * énumère des fichiers un par un, là où les autres décrivent des dossiers et
 * des familles.
 */
test('la carte du code liste exactement les tests du monorepo', () => {
  const reels = fs.readdirSync(path.join(racine, 'tests'))
    .filter((nom) => nom.endsWith('.test.ts') || nom.endsWith('.test.mjs'))
    .sort();

  assert.ok(reels.length >= 5, `seuls ${reels.length} tests trouvés sous tests/`);
  assert.deepEqual(
    testsListesParLaCarte().sort(),
    reels,
    "La carte du code d'AGENTS.md ne décrit plus le dossier `tests/`. Y ajouter le "
      + 'test manquant avec ce qu\'il tient, ou en retirer la ligne devenue fausse.',
  );
});

/** Les fichiers du dépôt, en chemins relatifs à séparateur `/`. */
function fichiersDuDepot(dossier: string = racine): string[] {
  const trouves: string[] = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entree.name)) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDuDepot(complet));
    else trouves.push(path.relative(racine, complet).split(path.sep).join('/'));
  }
  return trouves;
}

/**
 * Les sources du produit, schéma publié compris, en un seul texte.
 *
 * Les tests en sont exclus : une autorité qui n'existerait plus que dans un
 * test qui la nomme aurait déjà disparu du produit, et le contrôle passerait au
 * vert sur sa propre trace.
 */
function sourcesDuProduit(): string {
  const chemins = fichiersDuDepot()
    .filter((chemin) => /^packages\/[^/]+\/src\//.test(chemin)
      || chemin.startsWith('packages/kit/schema/'));
  return chemins.map((chemin) => fs.readFileSync(path.join(racine, chemin), 'utf8')).join('\n');
}

/** Les segments qu'une autorité de vocabulaire demande de retrouver. */
function segmentsDe(autorite: string): string[] {
  return autorite
    .replace(/\(\)/g, '')
    .replace(/\[\]/g, '')
    .split('.')
    .filter((segment) => segment && segment !== '*');
}

/**
 * Le second sens, et il est le seul qui regarde le code.
 *
 * Sans lui, renommer `structureTree.publishesChildren` laisse le test au vert
 * tant qu'`AGENTS.md` cite l'ancien nom, ce qui est l'inverse de ce que la
 * liste sert. Le mot entier est exigé : une troncature en resterait sinon une
 * sous-chaîne, donc une trouvaille.
 */
test('chaque autorite citee par un invariant existe encore dans le code', () => {
  const chemins = fichiersDuDepot();
  const sources = sourcesDuProduit();
  const introuvables: string[] = [];

  for (const autorite of AUTORITES) {
    if (autorite.includes('/') || /\.(ts|mjs)$/.test(autorite)) {
      if (!chemins.some((chemin) => chemin.endsWith(autorite))) {
        introuvables.push(`${autorite} : aucun fichier du depot ne porte ce chemin`);
      }
      continue;
    }
    const perdus = segmentsDe(autorite).filter((segment) => {
      const motif = new RegExp(
        `(?<![A-Za-z0-9_])${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`,
      );
      return !motif.test(sources);
    });
    if (perdus.length > 0) {
      introuvables.push(`${autorite} : ${perdus.join(', ')} absent des sources`);
    }
  }

  assert.deepEqual(
    introuvables,
    [],
    "Ces autorites sont nommees par un invariant mais n'existent plus dans le code :\n"
      + `${introuvables.join('\n')}\n`
      + "Un renommage a laisse AGENTS.md derriere lui. Corriger l'invariant et "
      + "l'entree de AUTORITES dans le meme commit que le renommage.",
  );
});

/** Les deux spécifications, avec la liste que chacune doit encore nommer. */
const SPECIFICATIONS: [string, string[]][] = [
  ['docs/FORMAT.md', AUTORITES_FORMAT],
  ['packages/plugin/SPEC.md', AUTORITES_SPEC],
];

for (const [chemin, attendues] of SPECIFICATIONS) {
  test(`aucune autorite citee par ${chemin} n'a disparu du document`, () => {
    const contenu = fs.readFileSync(path.join(racine, chemin), 'utf8');
    const perdues = attendues.filter((autorite) => !contenu.includes(autorite));

    assert.deepEqual(
      perdues,
      [],
      `Ces autorites ne sont plus nommees par ${chemin} :\n`
        + `${perdues.join('\n')}\n`
        + "Une regle a probablement ete perdue en raccourcissant. Si le retrait est "
        + "voulu, retirer l'entree de la liste dans le meme commit, et dire dans le "
        + 'message ou la regle vit desormais.',
    );
  });
}

/** Les deux specifications, avec le squelette que chacune doit encore porter. */
const SQUELETTES: [string, string[]][] = [
  ['docs/FORMAT.md', ENONCES_FORMAT],
  ['packages/plugin/SPEC.md', ENONCES_SPEC],
];

for (const [chemin, attendus] of SQUELETTES) {
  test(`aucune regle entiere n'a disparu de ${chemin}`, () => {
    const contenu = fs.readFileSync(path.join(racine, chemin), 'utf8');
    const perdus = attendus.filter((enonce) => !contenu.includes(enonce));

    assert.deepEqual(
      perdus,
      [],
      `Ces titres ou enonces ne sont plus dans ${chemin} :\n`
        + `${perdus.join('\n')}\n`
        + 'Une regle entiere part avec son titre ou son enonce. Si le retrait est '
        + "voulu, retirer l'entree de la liste dans le meme commit, et dire dans le "
        + 'message ou la regle vit desormais.',
    );
  });
}
