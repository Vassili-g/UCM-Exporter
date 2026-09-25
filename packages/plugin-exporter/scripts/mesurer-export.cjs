/**
 * Mesures synthétiques : chaque fichier comparé importe les dépendances courantes.
 * Les durées ne mesurent ni le chargement ni les appels natifs de Figma.
 */
const { buildSync } = require('esbuild');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

const dossier = path.resolve(__dirname, '..');
const reference = process.argv[2];

function charger(fichier, revision) {
  const relatif = `packages/plugin-exporter/src/contract/${fichier}.ts`;
  const source = revision
    ? execFileSync('git', ['show', `${revision}:${relatif}`], { cwd: dossier, encoding: 'utf8' })
    : readFileSync(path.join(dossier, 'src/contract', `${fichier}.ts`), 'utf8');
  const sortie = buildSync({
    stdin: { contents: source, loader: 'ts', resolveDir: path.join(dossier, 'src/contract') },
    bundle: true, write: false, platform: 'node', format: 'cjs',
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', sortie.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}

let numero = 0;
function node(type, name, children = [], extra = {}) {
  const self = { id: String(++numero), type, name, children, visible: true, ...extra };
  for (const enfant of children) enfant.parent = self;
  self.findAll = (predicat = () => true) => {
    const result = [];
    const pile = [...children].reverse();
    while (pile.length) {
      const courant = pile.pop();
      if (predicat(courant)) result.push(courant);
      for (let index = courant.children.length - 1; index >= 0; index -= 1) pile.push(courant.children[index]);
    }
    return result;
  };
  self.findOne = (predicat) => self.findAll(predicat)[0] ?? null;
  self.findAllWithCriteria = ({ types }) => self.findAll((child) => types.includes(child.type));
  return self;
}

async function mesurer(action) {
  const durees = [];
  let resultat;
  for (let index = 0; index < 9; index += 1) {
    const debut = performance.now();
    resultat = await action();
    if (index > 1) durees.push(performance.now() - debut);
  }
  durees.sort((a, b) => a - b);
  return { ms: durees[Math.floor(durees.length / 2)], resultat };
}

async function main() {
  const parcours = charger('exportableNodes');
  const regles = charger('extractRules');
  const avantParcours = reference ? charger('exportableNodes', reference) : null;
  const avantRegles = reference ? charger('extractRules', reference) : null;
  const cas = [];
  for (const [variants, profondeur, largeur] of [[1, 100, 100], [500, 10, 5], [1, 1, 10000]]) {
    const racines = Array.from({ length: variants }, () => {
      let branche = [];
      for (let niveau = 0; niveau < profondeur; niveau += 1) {
        branche = [node('FRAME', 'Cadre', [...branche,
          ...Array.from({ length: largeur }, () => node('RECTANGLE', 'Fond'))])];
      }
      return node('COMPONENT', 'Variant', branche);
    });
    cas.push({ nom: `${variants} variants, profondeur ${profondeur}, largeur ${largeur}`,
      actuel: () => racines.map((root) => parcours.getAllNodes(root).map((n) => n.id)),
      avant: avantParcours && (() => racines.map((root) => avantParcours.getAllNodes(root).map((n) => n.id))),
    });
  }
  let imbrique = node('TEXT', 'Label', [], { characters: 'Texte' });
  for (let index = 0; index < 1000; index += 1) imbrique = node('INSTANCE', 'Pièce', [imbrique]);
  const page = node('PAGE', 'Composants', [imbrique]);
  globalThis.figma = { currentPage: page };
  cas.push({ nom: 'Recherche des règles, 1 000 instances imbriquées',
    actuel: () => regles.extractRules({ name: 'Button' }),
    avant: avantRegles && (() => avantRegles.extractRules({ name: 'Button' })),
  });
  for (const scenario of cas) {
    const courant = await mesurer(scenario.actuel);
    const ancien = scenario.avant ? await mesurer(scenario.avant) : null;
    if (ancien) assert.deepEqual(courant.resultat, ancien.resultat);
    console.log(`${scenario.nom} : ${courant.ms.toFixed(2)} ms`
      + (ancien ? ` ; ${reference} : ${ancien.ms.toFixed(2)} ms ; rapport ${(ancien.ms / courant.ms).toFixed(2)}` : ''));
  }
  const exporter = charger('exportComponent').handleExportComponent;
  const avantExporter = reference ? charger('exportComponent', reference).handleExportComponent : null;
  const variants = Array.from({ length: 1000 }, (_, index) => node('COMPONENT', `Style=${index}`, [], {
    variantProperties: { Style: String(index) }, componentPropertyDefinitions: {},
    layoutMode: 'HORIZONTAL', width: 100, height: 40,
  }));
  const composant = node('COMPONENT_SET', 'Example', variants, {
    defaultVariant: variants[0], componentPropertyDefinitions: {
      Style: { type: 'VARIANT', variantOptions: variants.map((_, index) => String(index)), defaultValue: '0' },
    },
  });
  const pages = Array.from({ length: 100 }, (_, index) => node('PAGE', `Page ${index}`,
    Array.from({ length: 100 }, () => node('TEXT', 'Label', [], { characters: 'Texte' }))));
  const courante = node('PAGE', 'Composants', [composant], { selection: [composant] });
  let chargements = 0;
  globalThis.figma = {
    currentPage: courante, root: { name: 'Mesure', children: [courante, ...pages] },
    loadAllPagesAsync: async () => { chargements += 1; },
    variables: { getLocalVariableCollectionsAsync: async () => [], getLocalVariablesAsync: async () => [] },
    getStyleByIdAsync: async () => null,
  };
  const contenu = async (action) => {
    const contrat = JSON.parse((await action()).content);
    delete contrat.meta.exportedAt;
    return contrat;
  };
  const courant = await mesurer(() => contenu(exporter));
  const chargesCourantes = chargements;
  const ancien = avantExporter ? await mesurer(() => contenu(avantExporter)) : null;
  if (ancien) assert.deepEqual(courant.resultat, ancien.resultat);
  console.log(`Export de 1 000 variants sans instance, 101 pages : ${courant.ms.toFixed(2)} ms`
    + ` ; chargements des autres pages : ${chargesCourantes}`
    + (ancien ? ` ; ${reference} : ${ancien.ms.toFixed(2)} ms ; chargements : ${chargements - chargesCourantes}` : ''));
}

main().catch((erreur) => { console.error(erreur); process.exitCode = 1; });
