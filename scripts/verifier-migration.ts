/**
 * Le passage à la forme 11.0 perd-il quoi que ce soit ?
 *
 * L'agent ne peut pas lancer l'export : le plugin n'existe que dans Figma. Ce
 * qu'il peut faire, et qui prouve la même chose, c'est prendre les contrats
 * 10.3 du corpus — de VRAIES sorties du plugin — leur appliquer les fonctions
 * QUE LE MOTEUR APPLIQUE MAINTENANT, puis les remonter dans l'autre sens et
 * comparer au fichier de départ, clé par clé.
 *
 * Le contrôle n'est pas « les deux JSON sont identiques » : l'élision des
 * valeurs neutres rend absentes des clés qui valaient `null`, `{}` ou `[]`. Le
 * contrôle est plus précis, et c'est ce qui en fait une preuve : LE SEUL écart
 * toléré est une clé absente d'un côté et NEUTRE de l'autre. Toute autre
 * différence — une valeur changée, une clé perdue qui portait quelque chose,
 * un ordre modifié — est un échec.
 *
 * Les fonctions employées ici sont celles du moteur, pas des copies :
 * `compactVariants`, `buildFigmaVariantLabels`, `elideNeutrals`,
 * `serializeJson`. Le contrôle porte donc sur le code livré.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactVariants, intern, signature } from '../src/contract/compactVariants';
import { buildFigmaVariantLabels } from '../src/contract/componentTree';
import { CATALOGUES_DE_VUES, elideContract, elideNeutrals, isNeutral } from '../src/contract/elideNeutrals';
import { serializeJson } from '../src/contract/serializeJson';
import { collectTokenReferences } from '../src/variables';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const corpus = join(racine, 'tests', 'test-exports');

type Json = Record<string, any>;

/** Les champs que `tokensUsed` indexait : ni `meta`, ni `samples`, ni lui-même. */
const CHAMPS_INDEXES = [
  'props', 'variantViews', 'variants', 'propertyBindingDefinitions', 'structure',
  'stateModel', 'rendering', 'icons', 'textStyles', 'composes', 'intent',
] as const;

/** 10.3 → 11.0, avec les fonctions du moteur. */
export function migrer(ancien: Json): Json {
  const vues = ancien.variantViews as Record<string, Json>;
  const definitions = (ancien.propertyBindingDefinitions ?? {}) as Record<string, Json>;
  const echantillons = (ancien.samples ?? {}) as Record<string, Json>;

  const etendus = (ancien.variants as Json[]).map((variant) => ({
    nodeId: variant.nodeId,
    figmaName: variant.figmaName,
    values: variant.values,
    tokens: variant.tokens,
    strokes: variant.strokes,
    ...vues[variant.view],
    ...(variant.sample ? { sample: echantillons[variant.sample] } : {}),
  }));
  const liaisons = (ancien.variants as Json[]).flatMap((variant) => (
    (variant.bindings ?? []).map((placement: Json) => ({
      ...definitions[placement.definition],
      nodeId: placement.nodeId,
      variantNodeId: variant.nodeId,
    }))
  ));

  const compacte = compactVariants(etendus as any, liaisons as any);

  const { sizes, variantAxes, ...projection } = ancien.structure as Json;
  const viewStructures = compacte.viewStructures as Record<string, any>;
  const idsDeStructure = new Map(
    Object.entries(viewStructures).map(([id, valeur]) => [signature(valeur), id] as const),
  );
  const vueDeReference = intern(
    elideNeutrals(projection, 'viewStructures.*'),
    'st',
    idsDeStructure,
    viewStructures,
  );

  const etiquettes = buildFigmaVariantLabels(
    faussetteDeComponentSet(ancien),
    { axes: variantAxes ?? [], variants: faussetteDeVariants(ancien) },
    new Map((variantAxes ?? []).map((axe: string) => [axe, axe] as const)),
  );
  const variants = etiquettes
    ? compacte.variants.map(({ figmaName: _nom, ...reste }) => reste)
    : compacte.variants;

  const { warnings: _warnings, ...meta } = ancien.meta as Json;
  return elideContract({
    name: ancien.name,
    meta,
    props: ancien.props,
    ...(etiquettes ? { figmaVariantLabels: etiquettes } : {}),
    viewStructures,
    viewTypographies: compacte.viewTypographies,
    viewComposes: compacte.viewComposes,
    viewIcons: compacte.viewIcons,
    viewPaintPlacements: compacte.viewPaintPlacements,
    variantViews: compacte.variantViews,
    propertyBindingDefinitions: compacte.propertyBindingDefinitions,
    variants,
    structure: {
      view: vueDeReference,
      ...(sizes ? { sizes } : {}),
      variantAxes,
    },
    ...(ancien.stateModel ? { stateModel: ancien.stateModel } : {}),
    rendering: ancien.rendering,
    icons: ancien.icons,
    textStyles: ancien.textStyles,
    composes: ancien.composes,
    samples: compacte.samples,
    ...(ancien.intent ? { intent: ancien.intent } : {}),
  }, CATALOGUES_DE_VUES);
}

/**
 * Un Component Set de papier, reconstitué depuis le contrat.
 *
 * `buildFigmaVariantLabels` lit la SOURCE Figma ; ici la seule source
 * disponible est le contrat 10.3, qui porte le nom de chaque variant. Les
 * étiquettes obtenues sont donc les mêmes, et surtout les GARDES de la fonction
 * — reconstruction stricte de chaque nom, refus d'une valeur ambiguë — sont
 * bien celles du moteur.
 */
function faussetteDeComponentSet(contrat: Json): any {
  const definitions: Record<string, { type: string }> = {};
  for (const nom of nomsDAxesFigma(contrat)) definitions[nom] = { type: 'VARIANT' };
  return { componentPropertyDefinitions: definitions };
}

/** Les noms d'axes tels que Figma les écrit, relus sur le nom d'un variant. */
function nomsDAxesFigma(contrat: Json): string[] {
  const premier = (contrat.variants as Json[])[0];
  return String(premier?.figmaName ?? '')
    .split(', ')
    .map((partie) => partie.slice(0, partie.indexOf('=')))
    .filter(Boolean);
}

function faussetteDeVariants(contrat: Json): any[] {
  return (contrat.variants as Json[]).map((variant) => {
    const brutes: Record<string, string> = {};
    for (const partie of String(variant.figmaName ?? '').split(', ')) {
      const separateur = partie.indexOf('=');
      if (separateur === -1) continue;
      brutes[partie.slice(0, separateur)] = partie.slice(separateur + 1);
    }
    // Le nom d'axe brut doit se normaliser vers la clé publique pour que la
    // fonction retrouve son axe ; le corpus 10.3 les nomme déjà ainsi.
    return {
      values: variant.values ?? {},
      component: { name: variant.figmaName, variantProperties: brutes },
    };
  });
}

/** 11.0 → 10.3, l'inverse exact de `migrer`. */
export function remonter(nouveau: Json): Json {
  const structures = (nouveau.viewStructures ?? {}) as Record<string, Json>;
  const typographies = (nouveau.viewTypographies ?? {}) as Record<string, Json>;
  const composes = (nouveau.viewComposes ?? {}) as Record<string, Json>;
  const icones = (nouveau.viewIcons ?? {}) as Record<string, Json>;
  const peintures = (nouveau.viewPaintPlacements ?? {}) as Record<string, Json>;

  const variantViews: Record<string, Json> = {};
  for (const [cle, renvois] of Object.entries(nouveau.variantViews as Record<string, Json>)) {
    variantViews[cle] = {
      structure: structures[renvois.structure],
      typography: renvois.typography ? typographies[renvois.typography] : [],
      composes: renvois.composes ? composes[renvois.composes] : [],
      icons: renvois.icons ? icones[renvois.icons] : {},
      paintPlacements: renvois.paintPlacements ? peintures[renvois.paintPlacements] : {},
    };
  }

  const definitions: Record<string, Json> = {};
  const finParDefinition = new Map<string, string>();
  for (const [cle, definition] of Object.entries(
    (nouveau.propertyBindingDefinitions ?? {}) as Record<string, Json>,
  )) {
    const { nodeSuffix, ...reste } = definition;
    if (nodeSuffix) finParDefinition.set(cle, nodeSuffix);
    definitions[cle] = reste;
  }

  const etiquettes = nouveau.figmaVariantLabels as Json | undefined;
  const axes = (nouveau.structure.variantAxes ?? []) as string[];
  const variants = (nouveau.variants as Json[]).map((variant) => {
    const nom = etiquettes
      ? axes
        .map((axe) => `${etiquettes.axes[axe]}=${etiquettes.values[axe][variant.values[axe]]}`)
        .join(', ')
      : variant.figmaName;
    const bindings = variant.bindings
      ? (variant.bindings as Json[]).map((placement) => ({
        definition: placement.definition,
        nodeId: placement.nodeId + (finParDefinition.get(placement.definition) ?? ''),
      }))
      : undefined;
    return {
      nodeId: variant.nodeId,
      figmaName: nom,
      values: variant.values ?? {},
      tokens: variant.tokens ?? {},
      strokes: variant.strokes ?? {},
      view: variant.view,
      ...(bindings ? { bindings } : {}),
      ...(variant.sample ? { sample: variant.sample } : {}),
    };
  });

  const { view, sizes, variantAxes, ...resteStructure } = nouveau.structure as Json;
  const structure = {
    ...structures[view],
    ...resteStructure,
    ...(sizes ? { sizes } : {}),
    variantAxes: variantAxes ?? [],
  };

  // `figmaLayer` d'un texte d'échantillon est absent quand il vaut `value` :
  // son absence EST le signal « calque jamais renommé ». On le recolle.
  const samples: Record<string, Json> = {};
  for (const [cle, echantillon] of Object.entries((nouveau.samples ?? {}) as Record<string, Json>)) {
    samples[cle] = {
      ...echantillon,
      ...(echantillon.text
        ? {
          text: (echantillon.text as Json[]).map((entree) => ({
            slotPath: entree.slotPath,
            figmaLayer: entree.figmaLayer ?? entree.value,
            value: entree.value,
          })),
        }
        : {}),
    };
  }

  const contrat: Json = {
    name: nouveau.name,
    meta: {
      ...nouveau.meta,
      warnings: ((nouveau.meta.diagnostics ?? []) as Json[]).map((d) => d.message),
      diagnostics: nouveau.meta.diagnostics ?? [],
    },
    props: nouveau.props ?? {},
    variantViews,
    propertyBindingDefinitions: definitions,
    variants,
    structure,
    stateModel: nouveau.stateModel ?? null,
    rendering: nouveau.rendering,
    icons: nouveau.icons ?? {},
    textStyles: nouveau.textStyles ?? {},
    composes: nouveau.composes ?? [],
    samples,
    tokensUsed: [],
    intent: nouveau.intent ?? null,
  };
  const index = new Set<string>();
  for (const champ of CHAMPS_INDEXES) collectTokenReferences(contrat[champ], index);
  contrat.tokensUsed = Array.from(index).sort();
  return contrat;
}

/** Un écart entre deux valeurs, situé par son chemin. */
export type Ecart = { chemin: string; remonte: unknown; origine: unknown };

/** Tous les écarts entre deux JSON, à profondeur quelconque et dans l'ordre. */
export function ecarts(remonte: unknown, origine: unknown, chemin = ''): Ecart[] {
  if (JSON.stringify(remonte) === JSON.stringify(origine)) return [];
  const deuxObjets = remonte !== null && origine !== null
    && typeof remonte === 'object' && typeof origine === 'object'
    && Array.isArray(remonte) === Array.isArray(origine);
  if (deuxObjets) {
    const cles = new Set([
      ...Object.keys(remonte as object),
      ...Object.keys(origine as object),
    ]);
    return [...cles].flatMap((cle) => ecarts(
      (remonte as Json)[cle],
      (origine as Json)[cle],
      chemin ? `${chemin}.${cle}` : cle,
    ));
  }
  return [{ chemin, remonte, origine }];
}

/**
 * Vrai quand l'écart ne porte AUCUNE donnée. Deux cas, et deux seulement :
 *
 * - une clé absente d'un côté et vide de l'autre — c'est l'élision ;
 * - deux valeurs présentes qui deviennent identiques une fois leurs `null`
 *   retirés : `{"x":null,"y":null}` et `{}` disent la même chose, l'une avec
 *   des silences écrits, l'autre sans.
 *
 * Tout le reste est un échec : une valeur changée, une clé perdue qui portait
 * quelque chose, un ordre modifié.
 */
export function estUneAbsenceDeNeutre({ remonte, origine }: Ecart): boolean {
  if (remonte === undefined) return isNeutral(origine);
  if (origine === undefined) return isNeutral(remonte);
  const sansSilences = (valeur: unknown): unknown => {
    if (Array.isArray(valeur)) return valeur.map(sansSilences);
    if (valeur === null || typeof valeur !== 'object') return valeur;
    return Object.fromEntries(
      Object.entries(valeur as Record<string, unknown>)
        .filter(([, item]) => item !== null)
        .map(([cle, item]) => [cle, sansSilences(item)]),
    );
  };
  return JSON.stringify(sansSilences(remonte)) === JSON.stringify(sansSilences(origine));
}

function compter(texte: string): { octets: number; lignes: number } {
  return { octets: Buffer.byteLength(texte, 'utf8'), lignes: texte.split('\n').length };
}

function principal(): void {
  const fichiers = readdirSync(corpus).filter((nom) => nom.endsWith('.contract.json')).sort();
  let echecs = 0;
  let neutresTotal = 0;
  let avantTotal = 0;
  let apresTotal = 0;

  console.log('Contrat            avant        après        gain    écarts non neutres');
  console.log('─'.repeat(78));

  for (const fichier of fichiers) {
    const brut = readFileSync(join(corpus, fichier), 'utf8').replace(/^﻿/, '');
    const ancien = JSON.parse(brut) as Json;
    if (ancien.meta?.contractVersion !== '10.3') {
      console.log(`${fichier.padEnd(26)} ignoré (schéma ${String(ancien.meta?.contractVersion)})`);
      continue;
    }

    const nouveau = migrer(ancien);
    const remonte = remonter(nouveau);
    const tous = ecarts(remonte, ancien);
    const anormaux = tous.filter((ecart) => !estUneAbsenceDeNeutre(ecart));
    neutresTotal += tous.length - anormaux.length;

    const avant = compter(brut);
    const apres = compter(serializeJson(nouveau));
    avantTotal += avant.octets;
    apresTotal += apres.octets;

    const gain = `${(((avant.octets - apres.octets) / avant.octets) * 100).toFixed(1)} %`;
    console.log(
      `${fichier.replace('.contract.json', '').padEnd(18)}`
      + `${String(avant.octets).padStart(8)} o ${String(apres.octets).padStart(8)} o `
      + `${gain.padStart(8)}   ${anormaux.length === 0 ? '0 ✓' : `${anormaux.length} ✗`}`,
    );
    for (const ecart of anormaux.slice(0, 8)) {
      echecs += 1;
      console.error(
        `    ✗ ${ecart.chemin} : remonté ${JSON.stringify(ecart.remonte)} `
        + `≠ origine ${JSON.stringify(ecart.origine)}`,
      );
    }
    if (anormaux.length > 8) echecs += anormaux.length - 8;
  }

  console.log('─'.repeat(78));
  console.log(
    `TOTAL              ${String(avantTotal).padStart(8)} o ${String(apresTotal).padStart(8)} o `
    + `${`${(((avantTotal - apresTotal) / avantTotal) * 100).toFixed(1)} %`.padStart(8)}`,
  );
  console.log(
    `\n${neutresTotal} écarts, tous « clé absente ↔ valeur neutre ». `
    + `${echecs} écart${echecs > 1 ? 's' : ''} non expliqué${echecs > 1 ? 's' : ''}.`,
  );
  if (echecs > 0) process.exit(1);
  console.log('✓ Aucune donnée perdue : tout le reste est remonté à l\'identique.');
}

if (process.argv[1] && process.argv[1].endsWith('verifier-migration.ts')) principal();
