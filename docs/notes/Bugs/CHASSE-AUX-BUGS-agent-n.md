# Chasse aux bugs, niveau 5

Statut : en cours, depuis le commit `50c9de1`, le `2026-09-17`.

## 1. Périmètre et ligne de base

Les cibles sont les vingt-six fichiers de niveau 5 de la mission, dans les
quatre paquets. Toute exécution a lieu dans un worktree détaché de `50c9de1`,
extrait en LF dans le dossier temporaire du système. Les chemins de documents
cités dans les reproductions sont ceux de `50c9de1`.

Une note `CHASSE-AUX-BUGS.md`, voisine de celle-ci, vient d'une chasse
précédente sur `68a710d` et liste des pistes non vérifiées. Cette chasse les
reprend comme pistes et les soumet à la même réfutation.

Ligne de base sur `50c9de1`, après `npm ci` et le build du kit :

| Commande | Résultat |
|---|---|
| `npm test` | 1 302 tests, 0 échec, 0 ignoré |
| `npm run typecheck` | vert |
| `npm run build` | vert |

`npm ci` sous npm 12 bloque le script d'installation d'esbuild, et le build
passe quand même. Rien n'est rouge sur `HEAD`.

Familles de corrections récentes qui touchent une cible :

| Commit | Famille | Cibles |
|---|---|---|
| `35e5a25` | geste du rapport quand `tokens.json` manque | `controle-repository.mjs` |
| `864fbb2` | refus 400 de GitLab mal attribué | `connexion.ts`, `code.ts` |
| `02ba563` | CI GitLab sans pipeline de merge request, héritage de `default:` | `init.mjs` |
| `e6da1d8` | argument inconnu ignoré par une sous-commande | `ucm.mjs` |
| `298eca0` | jeton exposé à `npm ci`, chemin de configuration hors du repository | `init.mjs`, `rapport-gitlab.mjs`, `format/configuration.ts` |
| `1bb26e0` | fichier vide lu comme absent | `forges/github.ts`, `forges/gitlab.ts` |
| `07f9a7b` | concurrence du plugin, corps trop long, pile épuisée, repli de famille, accents | `code.ts`, `messages.ts`, `controle-repository.mjs`, `format/names.ts`, `format/configuration.ts` |
| `58c4dde` | lecteurs de modes qui laissaient passer trois fautes | `modes-tokens.mjs`, `tokens-css.mjs` |
| `13c6d51` | dossier de contrats absent | `tokens-css.mjs` |
| `f4cdd37` | pile épuisée par les cycles, source écrasée par `--out` | `tokens-css.mjs` |

## 2. Invariants et autorités

Chaque ligne donne la règle, son autorité parmi les cibles, et le test qui la
tient. Les règles viennent d'[AGENTS.md](../../../AGENTS.md#invariants).

| Règle | Autorité | Test |
|---|---|---|
| Trois projections de nom, sans copie | `format/names.ts` | `kit/tests/names.test.ts` |
| Accents composés et décomposés, même propriété CSS | `tokenCssVariable` | `kit/tests/names.test.ts` |
| Numéro courant du format de tokens écrit une fois | `TOKENS_FORMAT_VERSION`, `format/tokens.ts` | `kit/tests/formatDeTokens.test.ts` |
| Classement de la marque, fenêtre énumérée | `etatDuFormatDeTokens` | `kit/tests/formatDeTokens.test.ts` |
| Axes de modes classés par le lecteur | `axesDeTokens`, `modes-tokens.mjs` | `kit/tests/modes-tokens.test.mjs`, `modes-tokens-aleatoire.test.mjs` |
| Fenêtre de lecture des contrats, deux versions | `version-contrat.mjs` | `kit/tests/version-contrat.test.mjs`, `fenetre-de-lecture.test.mjs` |
| Numéro annoncé lu dans le fichier déposé | `versionDeContrat`, `format/version.ts` ; `depot.ts` | `kit/tests/versionDeContrat.test.ts` ; aucun test sur l'en-tête de la demande hors `github.test.ts` |
| Ce qui refuse une fusion, et son titre | `bilanEstBloquant`, `enteteDuVerdict` | `kit/tests/verdict-bilan.test.mjs` |
| Chemin de configuration dans le repository | `estCheminDuRepository`, `format/configuration.ts` | `kit/tests/configuration.test.mjs` |
| Deux enfants d'un même parent, deux slots | `validation-contrat.mjs` côté lecteur | `kit/tests/validation-contrats.test.mjs` |
| L'échantillon ne dégrade aucune validation | `validation-echantillons.mjs` | aucun test ne tient la borne « jamais » |
| Un export identique n'ouvre pas de seconde demande | `exportsEnVol`, `depot.ts` | `plugin/tests/github.test.ts`, `gitlab.test.ts` ; `inventaireInvariants.test.ts` ne vérifie que le nom |
| Formes Markdown actives neutralisées par forge | `forges/github.ts`, `forges/gitlab.ts` | `plugin/tests/gitlab.test.ts` ; `sansLienAutomatiqueGithub` n'est nommé par aucun test |
| Un jeton ne part que vers sa forge, ordre d'écriture | `validateSettings`, `config.ts` | `plugin/tests/config.test.ts` |
| CI générée sans jeton visible par `npm ci` | `init.mjs` | `cli/tests/gitlab.test.mjs`, `cli.test.mjs` |

## 3. Constats

Chaque reproduction se lance depuis la racine d'un clone de `50c9de1`, après
`npm ci` et `npm run build --workspace @ucm-kit/core`. Le script se range dans
le dossier indiqué par son nom ; ses chemins d'import sont relatifs à ce dossier.

### Haute

#### [HAUTE] `ucm check` refuse comme « contrat inexploitable » un contrat que le moteur écrit pour un padding tokenisé sur un seul axe

- **Où** : `packages/kit/src/lecteurs/validation-contrat.mjs:604-611`, qui exige
  `padding.x` et `padding.y`, appliqué lignes 519, 922, 1757 et 1785 ; le moteur
  écrit l'axe résolu seul dans `packages/plugin/src/contract/extractLayout.ts:303`
  et `:758`, et `extractSizes.ts:107`. Paquets kit et plugin.
- **Invariant violé** : `types.ts:443` déclare
  `Padding = { x?: PaddingX; y?: PaddingY }` ; une valeur neutre fournie par
  Figma « reste absente sans un mot »
  ([FORMAT.md](../../format/FORMAT.md)) ; le lecteur doit accepter « ce que le
  moteur écrit, et non ce que `types.ts` déclare »
  ([AGENTS.md](../../../AGENTS.md#vérification)).
- **Verdict** : `CONFIRMÉ`, par le vrai moteur sur le faux `figma` des tests,
  puis `ucm check` en sous-processus.
- **Scénario** : un Component Set dont le padding horizontal est lié à
  `sizes/padding-x` et le padding vertical vaut 0 sans variable. Le moteur publie
  `padding: {"x": …}` sans avertissement, les lois et le schéma l'acceptent.
  Obtenu : `ucm check` sort en 1, « contrat inexploitable, champs absents →
  variantViews.v1.structure.padding, structure.padding » et « ré-exportez le
  composant depuis Figma », geste qui ne change rien. Même refus avec un
  padding vertical de 8 non lié, ou le seul axe vertical lié. Attendu : code 0.
  Un padding vertical nul est un cas nominal.
- **Reproduction** : `.chasse-n/validation/harnais.ts` (repris de
  `exportComponent.test.ts`), `.chasse-n/validation/padding-un-axe.ts`, et
  `.chasse-n/verif-validation/bout-en-bout.ts`, qui porte aussi le constat
  suivant. Commandes : `npx tsx .chasse-n/validation/padding-un-axe.ts` et
  `npx tsx .chasse-n/verif-validation/bout-en-bout.ts`.

`harnais.ts` :

```ts
/**
 * Harnais minimal recopié de packages/plugin/tests/exportComponent.test.ts :
 * un faux `figma` monté sur globalThis, puis le vrai moteur.
 */
import exporterLeComposant from '../../packages/plugin/src/contract/exportComponent';

let compteur = 0;

export function node(type: string, name: string, children: any[] = [], extra: any = {}): any {
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

export const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

const setDeRegles = { type: 'COMPONENT_SET', name: '.ruleItem' };
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
function conteneurDeRegles(nom: string) {
  return node('INSTANCE', '.componentRules', [
    node('FRAME', 'component-name-wrap', [node('TEXT', 'component-name', [], { characters: nom })]),
    regle('@usage', [node('TEXT', 'content', [], { characters: 'Action principale' })]),
  ]);
}

/**
 * Monte un Component Set de deux variants ; `reglagesDuVariant` s'ajoute aux
 * propriétés de chaque COMPONENT, `variablesEnPlus` aux variables locales.
 */
export async function exporter(options: {
  reglagesDuVariant?: () => Record<string, any>;
  variablesEnPlus?: any[];
}) {
  const variant = (nom: string) => {
    const reglages = options.reglagesDuVariant?.() ?? {};
    return node('COMPONENT', nom, [
      node('TEXT', 'Suivant', [], { characters: 'Suivant' }),
    ], {
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'CENTER',
      variantProperties: { Variant: nom.split('=')[1] },
      ...reglages,
      boundVariables: { itemSpacing: alias('gap'), ...(reglages.boundVariables ?? {}) },
    });
  };
  const contained = variant('Variant=Contained');
  const outlined = variant('Variant=Outlined');
  const componentSet = node('COMPONENT_SET', 'Button', [contained, outlined], {
    key: 'cle-button',
    componentPropertyDefinitions: {
      Variant: { type: 'VARIANT', variantOptions: ['Contained', 'Outlined'], defaultValue: 'Contained' },
    },
    defaultVariant: contained,
  });
  const page = node('PAGE', 'Composants', [componentSet, conteneurDeRegles('Button')]);
  const collection = {
    id: 'collection', name: 'Tokens', defaultModeId: 'mode',
    modes: [{ modeId: 'mode', name: 'Défaut' }],
  };
  const variables = [
    {
      id: 'gap', name: 'sizes/gap', variableCollectionId: 'collection',
      resolvedType: 'FLOAT', scopes: ['GAP'], valuesByMode: { mode: 8 },
    },
    ...(options.variablesEnPlus ?? []),
  ];
  (globalThis as any).figma = {
    currentPage: Object.assign(page, { selection: [componentSet] }),
    root: { name: 'Design System' },
    fileKey: null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [collection],
      getLocalVariablesAsync: async () => variables,
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => collection,
    },
  };
  const resultat = await exporterLeComposant();
  return { resultat, contrat: JSON.parse(resultat.content) };
}
```

`padding-un-axe.ts` :

```ts
/**
 * Un conteneur dont seul le padding horizontal est lié à une variable, le
 * padding vertical valant 0 : le moteur écrit `padding: { x }`, le kit exige
 * `x` ET `y`.
 */
import { champsInvalidesDuContrat, verdictDeVersion } from '@ucm-kit/core/lecteurs';
import {
  verifierLeSchema,
  verifierLesLois,
} from '../../packages/plugin/tests/lois';
import { alias, exporter } from './harnais';

(async () => {
const { contrat } = await exporter({
  reglagesDuVariant: () => ({
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 0,
    paddingBottom: 0,
    boundVariables: { paddingLeft: alias('pad'), paddingRight: alias('pad') },
  }),
  variablesEnPlus: [{
    id: 'pad', name: 'sizes/padding-x', variableCollectionId: 'collection',
    resolvedType: 'FLOAT', scopes: ['GAP'], valuesByMode: { mode: 12 },
  }],
});

console.log('contractVersion :', contrat.meta.contractVersion,
  '→ verdict', verdictDeVersion(contrat.meta.contractVersion));
console.log('structure de référence :', JSON.stringify(contrat.viewStructures[contrat.structure.view]));
console.log('diagnostics padding :', JSON.stringify((contrat.meta.diagnostics ?? []).map((d: any) => d.message).filter((m: string) => m.includes('padding'))));
let lois = 'ok';
try { verifierLesLois(contrat, 'sortie du moteur'); } catch (e) { lois = (e as Error).message; }
console.log('lois.ts :', lois);
let schema = 'ok';
try { verifierLeSchema(contrat, 'sortie du moteur'); } catch (e) { schema = (e as Error).message; }
console.log('schéma publié :', schema);
console.log('champsInvalidesDuContrat :', JSON.stringify(champsInvalidesDuContrat(contrat)));
})();
```

Sortie observée :

```text
contractVersion : 13.0 → verdict ok
structure de référence : {"layout":"flex-row","sizing":{"width":"stretch","height":"stretch"},"justifyContent":"flex-start","alignItems":"center","gap":"{tokens.sizes.gap}","padding":{"x":"{tokens.sizes.padding-x}"},"children":[{"slot":"label","figmaLayer":"Suivant"}]}
diagnostics padding : []
lois.ts : ok
schéma publié : ok
champsInvalidesDuContrat : ["variantViews.v1.structure.padding","structure.padding"]
```

`bout-en-bout.ts` :

```ts
import { champsInvalidesDuContrat } from '@ucm-kit/core/lecteurs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { alias, exporter } from '../validation/harnais';

const FLOAT = (id: string, name: string, v: number) => ({ id, name, variableCollectionId: 'collection', resolvedType: 'FLOAT', scopes: ['GAP'], valuesByMode: { mode: v } });
const COUL = { id: 'border', name: 'components/standalone/colors/border', variableCollectionId: 'collection', resolvedType: 'COLOR', scopes: ['STROKE_COLOR'], valuesByMode: { mode: { r: 0, g: 0, b: 0, a: 1 } } };
const scen: Record<string, any> = {
  'V1 x lié, y=0 non lié': { reglagesDuVariant: () => ({ paddingLeft: 12, paddingRight: 12, paddingTop: 0, paddingBottom: 0, boundVariables: { paddingLeft: alias('pad'), paddingRight: alias('pad') } }), variablesEnPlus: [FLOAT('pad', 'sizes/padding-x', 12)] },
  'V1 x lié, y lié à var=0': { reglagesDuVariant: () => ({ paddingLeft: 12, paddingRight: 12, paddingTop: 0, paddingBottom: 0, boundVariables: { paddingLeft: alias('pad'), paddingRight: alias('pad'), paddingTop: alias('z'), paddingBottom: alias('z') } }), variablesEnPlus: [FLOAT('pad', 'sizes/padding-x', 12), FLOAT('z', 'sizes/zero', 0)] },
  'V1 x lié, y=8 non lié': { reglagesDuVariant: () => ({ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, boundVariables: { paddingLeft: alias('pad'), paddingRight: alias('pad') } }), variablesEnPlus: [FLOAT('pad', 'sizes/padding-x', 12)] },
  'V1 y lié seul, x=0': { reglagesDuVariant: () => ({ paddingLeft: 0, paddingRight: 0, paddingTop: 4, paddingBottom: 4, boundVariables: { paddingTop: alias('pad'), paddingBottom: alias('pad') } }), variablesEnPlus: [FLOAT('pad', 'sizes/padding-y', 4)] },
  'V1 aucun padding lié, tout 0': { reglagesDuVariant: () => ({ paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 }) },
  'V2 weight 1 non lié, INSIDE': { reglagesDuVariant: () => ({ strokeWeight: 1, strokeAlign: 'INSIDE', strokes: [{ type: 'SOLID', visible: true, boundVariables: { color: alias('border') } }], boundVariables: { strokes: [alias('border')] } }), variablesEnPlus: [COUL] },
  'V2 weight lié, INSIDE': { reglagesDuVariant: () => ({ strokeWeight: 1, strokeAlign: 'INSIDE', strokes: [{ type: 'SOLID', visible: true, boundVariables: { color: alias('border') } }], boundVariables: { strokes: [alias('border')], strokeWeight: alias('sw') } }), variablesEnPlus: [COUL, FLOAT('sw', 'sizes/stroke', 1)] },
  'V2 weight 0 non lié': { reglagesDuVariant: () => ({ strokeWeight: 0, strokeAlign: 'INSIDE', strokes: [{ type: 'SOLID', visible: true, boundVariables: { color: alias('border') } }], boundVariables: { strokes: [alias('border')] } }), variablesEnPlus: [COUL] },
};

function tokensDe(c: any) {
  const refs = new Set<string>();
  JSON.stringify(c).replace(/\{([a-z0-9.\-_]+)\}/gi, (_m, r) => { refs.add(r); return ''; });
  const t: any = {};
  for (const r of refs) {
    const p = r.split('.'); let o = t;
    p.slice(0, -1).forEach((k) => { o = o[k] ??= {}; });
    o[p.at(-1)!] = /colors/.test(r) ? { $type: 'color', $value: '#000000' } : { $type: 'dimension', $value: { value: 1, unit: 'px' } };
  }
  return t;
}

(async () => {
  for (const [nom, opt] of Object.entries(scen)) {
    const { contrat } = await exporter(opt);
    const racine = mkdtempSync(join(tmpdir(), 'ucm-v-'));
    writeFileSync(join(racine, 'tokens.json'), JSON.stringify(tokensDe(contrat)));
    mkdirSync(join(racine, 'components', 'Button'), { recursive: true });
    writeFileSync(join(racine, 'components/Button/Button.contract.json'), JSON.stringify(contrat, null, 2));
    let code = 0, out = '';
    try { out = execFileSync('node', [join(process.cwd(), 'packages/cli/src/ucm.mjs'), 'check'], { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e: any) { code = e.status; out = (e.stdout ?? '') + (e.stderr ?? ''); }
    const vue = contrat.viewStructures?.[contrat.structure.view];
    console.log(`\n[${nom}] padding=${JSON.stringify(vue?.padding)} strokes=${JSON.stringify(contrat.variants[0].strokes)} kit=${JSON.stringify(champsInvalidesDuContrat(contrat))} check=${code}`);
    console.log(out.split('\n').filter(Boolean).slice(0, 6).map((l) => '   ' + l.slice(0, 220)).join('\n'));
  }
})();
```

Sortie observée :

```text
[V1 x lié, y=0 non lié] padding={"x":"{tokens.sizes.padding-x}"} strokes=undefined kit=["variantViews.v1.structure.padding","structure.padding"] check=1
   ✗ Button.contract.json : contrat inexploitable, champs absents → variantViews.v1.structure.padding, structure.padding (.\components\Button\Button.contract.json)
   ✗ 1 contrat en défaut.
     JSON illisible ou incomplet : ré-exportez le composant depuis Figma.

[V1 x lié, y lié à var=0] padding={"x":"{tokens.sizes.padding-x}","y":"{tokens.sizes.zero}"} strokes=undefined kit=[] check=0
   ✓ Button.contract.json : 3 références contrôlées, implémentation en attente (autorisé) (.\components\Button\Button.contract.json)
   ✓ Contrats valides. Les références absentes et les écarts contrat ↔ code éventuels ont été signalés sans bloquer.

[V1 x lié, y=8 non lié] padding={"x":"{tokens.sizes.padding-x}"} strokes=undefined kit=["variantViews.v1.structure.padding","structure.padding"] check=1
   ✗ Button.contract.json : contrat inexploitable, champs absents → variantViews.v1.structure.padding, structure.padding (.\components\Button\Button.contract.json)
   ✗ 1 contrat en défaut.
     JSON illisible ou incomplet : ré-exportez le composant depuis Figma.

[V1 y lié seul, x=0] padding={"y":"{tokens.sizes.padding-y}"} strokes=undefined kit=["variantViews.v1.structure.padding","structure.padding"] check=1
   ✗ Button.contract.json : contrat inexploitable, champs absents → variantViews.v1.structure.padding, structure.padding (.\components\Button\Button.contract.json)
   ✗ 1 contrat en défaut.
     JSON illisible ou incomplet : ré-exportez le composant depuis Figma.

[V1 aucun padding lié, tout 0] padding=undefined strokes=undefined kit=[] check=0
   ✓ Button.contract.json : 1 référence contrôlée, implémentation en attente (autorisé) (.\components\Button\Button.contract.json)
   ✓ Contrats valides. Les références absentes et les écarts contrat ↔ code éventuels ont été signalés sans bloquer.

[V2 weight 1 non lié, INSIDE] padding=undefined strokes={"border":{"color":"{tokens.components.standalone.colors.border}","align":"inside"}} kit=["variants[0].strokes.border","variants[1].strokes.border"] check=1
   ✗ Button.contract.json : contrat inexploitable, champs absents → variants[0].strokes.border, variants[1].strokes.border (.\components\Button\Button.contract.json)
   ✗ 1 contrat en défaut.
     JSON illisible ou incomplet : ré-exportez le composant depuis Figma.

[V2 weight lié, INSIDE] padding=undefined strokes={"border":{"color":"{tokens.components.standalone.colors.border}","width":"{tokens.sizes.stroke}","align":"inside"}} kit=[] check=0
   ✓ Button.contract.json : 3 références contrôlées, implémentation en attente (autorisé) (.\components\Button\Button.contract.json)
   ✓ Contrats valides. Les références absentes et les écarts contrat ↔ code éventuels ont été signalés sans bloquer.

[V2 weight 0 non lié] padding=undefined strokes={"border":{"color":"{tokens.components.standalone.colors.border}","align":"inside"}} kit=["variants[0].strokes.border","variants[1].strokes.border"] check=1
   ✗ Button.contract.json : contrat inexploitable, champs absents → variants[0].strokes.border, variants[1].strokes.border (.\components\Button\Button.contract.json)
   ✗ 1 contrat en défaut.
     JSON illisible ou incomplet : ré-exportez le composant depuis Figma.
```

- **Garde-fou** : `verifierLeLecteur` est sur le chemin d'appel de
  `exportComponent.test.ts`, mais aucun scénario ne lie un seul axe ; les tests
  du kit n'emploient que la forme antérieure `{ x: null, y: null }`, et les
  fixtures 12.0 portent les deux axes.
- **Famille** : l'élision des valeurs neutres de la 11.0, dont le lecteur a
  gardé l'exigence des deux clés. Cousin : le constat suivant.
- **Piste de correction** : accepter `padding` avec au moins un axe, et ajouter
  au harnais du moteur un scénario à padding sur un seul axe.

#### [HAUTE] `ucm check` refuse comme « contrat inexploitable » un contour dont l'épaisseur n'est pas liée

- **Où** : `packages/kit/src/lecteurs/validation-contrat.mjs:844-845`
  (`largeurDeStrokeValide(undefined)` rend faux) et `:861` (`align` absent
  refusé), appelés en `:1176` ; le moteur pose `width: null` dans
  `packages/plugin/src/contract/extractSlotTokens.ts:344-348`, qu'`elideNeutrals`
  retire. Paquets kit et plugin.
- **Invariant violé** : `types.ts:735` et `:741` déclarent `width?` et `align?` ;
  « Le contrat n'écrit aucune valeur neutre : une clé qui vaudrait `null`, `{}`
  ou `[]` est absente »
  ([AGENTS.md](../../../AGENTS.md#portée-et-forme-du-contrat)). « Une donnée
  facultative incomplète avertit »
  ([AGENTS.md](../../../AGENTS.md#diagnostics)).
- **Verdict** : `CONFIRMÉ`, même chaîne que le constat précédent.
- **Scénario** : un contour SOLID dont la couleur est liée et l'épaisseur de
  1 px ne l'est pas. Le moteur publie
  `{"border":{"color":…,"align":"inside"}}` et avertit « stroke weight : aucune
  variable Figma n'est reliée ». Obtenu : `ucm check` sort en 1, « contrat
  inexploitable, champs absents → variants[0].strokes.border ». Attendu : code 0
  avec l'avertissement relayé. Une bordure de 1 px non liée est courante.
- **Reproduction** : `harnais.ts` et `bout-en-bout.ts` du constat précédent,
  puis `.chasse-n/validation/contour-sans-epaisseur-liee.ts`, lancé par
  `npx tsx`.

```ts
/**
 * Un contour dont la couleur est liée à une variable et dont l'épaisseur (1px)
 * ne l'est pas : le moteur publie une feuille `strokes` sans `width`, le kit
 * exige `width` (référence, détail par côté, ou null).
 */
import { champsInvalidesDuContrat, verdictDeVersion } from '@ucm-kit/core/lecteurs';
import { verifierLeSchema, verifierLesLois } from '../../packages/plugin/tests/lois';
import { alias, exporter } from './harnais';

(async () => {
  const { contrat, resultat } = await exporter({
    reglagesDuVariant: () => ({
      strokeWeight: 1,
      strokeAlign: process.argv[2] === 'sans-align' ? undefined : 'INSIDE',
      strokes: [{ type: 'SOLID', visible: true, boundVariables: { color: alias('border') } }],
      boundVariables: { strokes: [alias('border')] },
    }),
    variablesEnPlus: [{
      id: 'border', name: 'components/standalone/colors/border', variableCollectionId: 'collection',
      resolvedType: 'COLOR', scopes: ['STROKE_COLOR'], valuesByMode: { mode: { r: 0, g: 0, b: 0, a: 1 } },
    }],
  });
  console.log('contractVersion :', contrat.meta.contractVersion, '→', verdictDeVersion(contrat.meta.contractVersion));
  console.log('variants :', JSON.stringify(contrat.variants.map((v: any) => v.strokes)));
  console.log('diagnostics :', JSON.stringify((contrat.meta.diagnostics ?? []).map((d: any) => d.message)));
  let lois = 'ok';
  try { verifierLesLois(contrat, 'moteur'); } catch (e) { lois = (e as Error).message; }
  console.log('lois.ts :', lois);
  let schema = 'ok';
  try { verifierLeSchema(contrat, 'moteur'); } catch (e) { schema = (e as Error).message; }
  console.log('schéma publié :', schema);
  console.log('champsInvalidesDuContrat :', JSON.stringify(champsInvalidesDuContrat(contrat)));
  void resultat;
})();
```

Sortie observée :

```text
contractVersion : 13.0 → ok
variants : [{"border":{"color":"{tokens.components.standalone.colors.border}","align":"inside"}},{"border":{"color":"{tokens.components.standalone.colors.border}","align":"inside"}}]
diagnostics : ["Layer « Variant=Contained », stroke weight : aucune variable Figma n'est reliée. Le développeur n'aura pas cette valeur. Reliez-la à une variable, puis réexportez.","Layer « Variant=Outlined », stroke weight : aucune variable Figma n'est reliée. Le développeur n'aura pas cette valeur. Reliez-la à une variable, puis réexportez.","Layer « Variant=Contained », horizontal padding : aucune variable Figma n'est reliée. Le développeur n'aura pas cette valeur. Reliez-la à une variable, puis réexportez.","Layer « Variant=Contained », vertical padding : aucune variabl
lois.ts : ok
schéma publié : ok
champsInvalidesDuContrat : ["variants[0].strokes.border","variants[1].strokes.border"]
```

- **Garde-fou** : aucun scénario de `exportComponent.test.ts` ne fabrique un
  contour ; aucun test du kit ne construit un stroke sans `width`.
- **Famille** : le constat précédent. La phrase de FORMAT.md § 2 « Une
  représentation absente vaut `null` » date d'avant l'élision.
- **Piste de correction** : accepter `width` et `align` absents, et donner un
  contour au harnais du moteur.

#### [HAUTE] Un bouton « Télécharger les tokens » écrit sur la forge et ouvre une pull request quand la configuration a été enregistrée après l'analyse

- **Où** : `packages/plugin/src/code.ts:302-303` garde l'analyse sous le verdict
  `sans-depot` ; `code.ts:369-385` et `:401`, `publier` relit la configuration
  et publie ; `code.ts:497-505`, la sauvegarde ne touche pas l'analyse gardée ;
  `packages/plugin/src/ui/index.ts:139-172`, aucun message de configuration ne
  remet la carte à zéro. Paquet plugin.
- **Promesse violée** : le plugin ouvre la demande dans le navigateur, et « le
  libellé du bouton l'annonce, faute de quoi trois exports d'affilée ouvrent
  trois onglets que rien n'avait laissé prévoir »
  ([SPEC.md](../../../packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)).
- **Verdict** : `CONFIRMÉ`, par le vrai `code.ts` transpilé avec une forge en
  mémoire, puis par l'UI construite rejouée dans Chromium.
- **Scénario** : analyser les tokens sans configuration, ouvrir les réglages
  depuis l'en-tête, enregistrer une configuration GitHub valide, revenir et
  cliquer « Télécharger les tokens ». Obtenu : écriture de `tokens.json` sur la
  forge, pull request créée, onglet ouvert. Attendu : un téléchargement, ou un
  bouton retiré ou renommé après la sauvegarde.
- **Reproduction** : trois fichiers dans `.chasse-n/etat/`. `harnais.ts` sert
  aussi aux trois constats suivants de l'état du plugin. Commandes :
  `npx tsx .chasse-n/etat/etat-perime.ts` (bloc B), puis
  `node .chasse-n/etat/ui-rejeu.mjs` (bloc B), qui demande
  `npm run build --workspace ucm-exporter-plugin` et Chromium.

`harnais.ts` :

```ts
/** Harnais du routeur réel, calqué sur packages/plugin/tests/code.test.ts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as format from '@ucm-kit/core/format';
import * as config from '../../packages/plugin/src/config';
import * as connexion from '../../packages/plugin/src/connexion';
import * as cible from '../../packages/plugin/src/cible';
import * as fenetre from '../../packages/plugin/src/fenetre';
import * as prevol from '../../packages/plugin/src/prevol';
import * as termes from '../../packages/plugin/src/forges/termes';
import * as forgeModule from '../../packages/plugin/src/forges/forge';
import * as depot from '../../packages/plugin/src/depot';
import type { Forge } from '../../packages/plugin/src/forges/forge';
import type { PluginMessage, UiRequest } from '../../packages/plugin/src/messages';

const source = ts.transpileModule(readFileSync(join(__dirname, '../../packages/plugin/src/code.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

export function differe<T>() {
  let resoudre!: (valeur: T) => void;
  const promesse = new Promise<T>((resolve) => { resoudre = resolve; });
  return { promesse, resoudre };
}

export type Resultat = { filename: string; content: string; warningCount: number; warnings: string[] };
export const resultat = (nom: string, content = '{}'): Resultat => ({ filename: nom, content, warningCount: 0, warnings: [] });

/** Un faux dépôt en mémoire derrière le port `Forge` réel ; `depot.ts` reste le vrai. */
export function fauxDepot(nom: 'github' | 'gitlab') {
  const fichiers = new Map<string, string>();
  const ecritures: string[] = [];
  const forge: Forge = {
    termes: termes.TERMES[nom],
    baseBranch: 'main',
    async testerDepot() {},
    async lireFichier(chemin: string) {
      const contenu = fichiers.get(chemin);
      return contenu === undefined ? null : { contenu, version: { sha: 'x' } };
    },
    async demandesOuvertes() { return []; },
    async publier(ecriture) { ecritures.push(ecriture.chemin); return `https://${nom}.com/o/r/pull/1`; },
    sansLienAutomatique: (texte: string) => texte,
  };
  return { forge, fichiers, ecritures };
}

export function ouvrir(options: { forgeDe?: (c: config.ConfigurationDuDepot) => Forge; depot?: Record<string, unknown> } = {}) {
  const messages: PluginMessage[] = [];
  const ouverts: string[] = [];
  const evenements = new Map<string, () => void>();
  const temporisations = new Map<number, () => void>();
  const stockage = new Map<string, unknown>();
  const appels = { analyses: 0, publications: 0, forges: 0 };
  const exporte: { traiter: () => Promise<Resultat> } = { traiter: async () => resultat('tokens.json') };
  const runtime = {
    showUI() {}, notify() {}, openExternal(url: string) { ouverts.push(url); },
    currentPage: { selection: [{ id: 'a', type: 'COMPONENT', name: 'Exemple' }] },
    ui: { postMessage: (message: PluginMessage) => messages.push(message), resize() {}, onmessage: async (_message: UiRequest) => {} },
    on: (nom: string, rappel: () => void) => evenements.set(nom, rappel),
    clientStorage: {
      getAsync: async (cle: string) => stockage.get(cle),
      setAsync: async (cle: string, valeur: unknown) => { stockage.set(cle, valeur); },
      deleteAsync: async (cle: string) => { stockage.delete(cle); },
    },
  };
  (globalThis as unknown as { figma: unknown }).figma = runtime;
  const handler = async () => { appels.analyses += 1; return exporte.traiter(); };
  const modules: Record<string, unknown> = {
    '@ucm-kit/core/format': format, './config': config, './connexion': connexion,
    './cible': cible, './fenetre': fenetre, './prevol': prevol,
    './contract/extractRules': { extractRules: async () => ({}), hasUsableRules: () => true },
    './contract/exportComponent': { default: handler },
    './tokens/exportTokens': { default: handler, annonceDuFormat: () => null, etatDesTokensDuFichier: async () => ({ presents: true, resume: '1 variable' }) },
    './forges/forge': forgeModule,
    './forges/termes': termes,
    './forges': { forgeDe: (c: config.ConfigurationDuDepot) => { appels.forges += 1; return options.forgeDe!(c); } },
    './depot': options.depot ?? depot,
  };
  runInNewContext(source, {
    figma: runtime, __html__: '', exports: {}, Error,
    require: (nom: string) => { assert.ok(nom in modules, nom); return modules[nom]; },
    setTimeout: (rappel: () => void) => { const id = temporisations.size + 1; temporisations.set(id, rappel); return id; },
    clearTimeout: (id: number) => temporisations.delete(id),
  });
  return {
    messages, ouverts, appels, exporte, runtime, stockage,
    envoyer: (message: UiRequest) => runtime.ui.onmessage(message),
    connecter(url = 'https://github.com/o/r', jeton = 'secret-test', forge?: string) {
      stockage.set('repoUrl', url); stockage.set('baseBranch', 'main'); stockage.set('github_pat', jeton);
      if (forge) stockage.set('forge_du_jeton', forge);
    },
  };
}

export const resume = (m: PluginMessage) => {
  if (m.type === 'download') return { type: m.type, filename: m.filename, octets: m.content.length };
  return m;
};
```

`etat-perime.ts`, blocs A, B et C :

```ts
/** Trois interférences entre une opération en cours et une commande de configuration. */
import { differe, fauxDepot, ouvrir, resultat, resume } from './harnais';
import * as depot from '../../packages/plugin/src/depot';

async function pastillePerimee() {
  console.log('\n=== A. suppression du jeton pendant une publication');
  const d = fauxDepot('github');
  const attente = differe<string>();
  d.forge.publier = async () => attente.promesse;
  const h = ouvrir({ forgeDe: () => d.forge });
  h.connecter('https://github.com/o/r', 'ghp_xxxx', 'github');
  h.exporte.traiter = async () => resultat('tokens.json', '{"c":1}');
  await h.envoyer({ type: 'analyser-tokens' });
  const debut = h.messages.length;
  const publication = h.envoyer({ type: 'publier', genre: 'tokens' });
  await new Promise((r) => setTimeout(r, 20));
  await h.envoyer({ type: 'supprimer-token' });
  attente.resoudre('https://github.com/o/r/pull/7');
  await publication;
  for (const m of h.messages.slice(debut)) if (m.type === 'connection' || m.type === 'status') console.log(' ', JSON.stringify(m));
  console.log('jeton stocké :', h.stockage.get('github_pat') ?? '(aucun)');
  const derniere = h.messages.filter((m) => m.type === 'connection').at(-1);
  console.log('dernière pastille reçue par l’UI :', derniere && 'pastille' in derniere ? derniere.pastille : null);
}

async function telechargerDevientPublier() {
  console.log('\n=== B. verdict « Télécharger », configuration enregistrée, clic sur ce bouton');
  const d = fauxDepot('github');
  const h = ouvrir({ forgeDe: () => d.forge });
  h.exporte.traiter = async () => resultat('tokens.json', '{"c":1}');
  await h.envoyer({ type: 'analyser-tokens' });
  console.log('verdict :', JSON.stringify(h.messages.filter((m) => m.type === 'verdict').at(-1)));
  await h.envoyer({ type: 'save-settings', settings: { repoUrl: 'https://github.com/o/r', baseBranch: 'main', jeton: 'ghp_xxxx' } });
  const debut = h.messages.length;
  await h.envoyer({ type: 'publier', genre: 'tokens' });
  for (const m of h.messages.slice(debut)) console.log(' ', JSON.stringify(resume(m)));
  console.log('écritures sur la forge :', d.ecritures, '; onglets ouverts :', h.ouverts);
}

async function statutEtrangerPendantAnalyse() {
  console.log('\n=== C. panne de clientStorage au redimensionnement pendant une analyse de composant');
  const d = fauxDepot('github');
  const h = ouvrir({ forgeDe: () => d.forge });
  // Une analyse de tokens déjà faite, gardée.
  h.exporte.traiter = async () => resultat('tokens.json', '{"t":1}');
  await h.envoyer({ type: 'analyser-tokens' });
  const attente = differe<ReturnType<typeof resultat>>();
  h.exporte.traiter = () => attente.promesse;
  const debut = h.messages.length;
  const analyse = h.envoyer({ type: 'analyser-composant' });
  h.runtime.clientStorage.setAsync = async () => { throw new Error('stockage indisponible'); };
  await h.envoyer({ type: 'resize', largeur: 400, hauteur: 600 });
  const seconde = h.envoyer({ type: 'analyser-tokens' });
  attente.resoudre(resultat('exemple.contract.json', '{"k":1}'));
  await Promise.all([analyse, seconde]);
  await h.envoyer({ type: 'publier', genre: 'tokens' });
  for (const m of h.messages.slice(debut)) console.log(' ', JSON.stringify(resume(m)));
  console.log('analyses lancées au total :', h.appels.analyses);
}

async function main() {
  await pastillePerimee();
  await telechargerDevientPublier();
  await statutEtrangerPendantAnalyse();
}
void depot;
void main();
```

`ui-rejeu.mjs`, blocs B et C :

```js
/** Rejoue dans l'UI construite les séquences de messages que le sandbox réel a émises (etat-perime.ts). */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const html = readFileSync(new URL('../../packages/plugin/dist/ui.html', import.meta.url), 'utf8');
const cible = { type: 'cible', selectionId: 'a', cible: { nom: 'Exemple', genre: 'component', variants: 1 }, detail: 'Component', raison: null, avertissement: null };

async function ouvrir(navigateur) {
  const page = await navigateur.newPage({ viewport: { width: 360, height: 700 } });
  page.setDefaultTimeout(3000);
  await page.setContent(html);
  await page.evaluate(() => {
    window.demandes = [];
    window.addEventListener('message', (e) => { const m = e.data.pluginMessage; if (m && (m.type.startsWith('analyser') || m.type === 'publier')) window.demandes.push(m); });
  });
  const envoyer = async (m) => { await page.evaluate((pluginMessage) => window.postMessage({ pluginMessage }, '*'), m); await page.evaluate(() => new Promise((r) => setTimeout(r, 0))); };
  await envoyer(cible);
  await envoyer({ type: 'tokens', presents: true, resume: '1 variable' });
  return { page, envoyer };
}

const navigateur = await chromium.launch();
try {
  // B : verdict « Télécharger les tokens », puis la sauvegarde (messages de refreshConfiguration).
  {
    const { page, envoyer } = await ouvrir(navigateur);
    await page.getByRole('button', { name: 'Analyser les tokens du fichier', exact: true }).click();
    await envoyer({ type: 'verdict', code: 'sans-depot', texte: 'Aucun repository connecté. Les tokens sera téléchargé sur votre poste.', action: 'Télécharger les tokens', etat: '' });
    await envoyer({ type: 'settings-validation', errors: {} });
    await envoyer({ type: 'settings', settings: { repoUrl: 'https://github.com/o/r', baseBranch: 'main', forgeDuJeton: 'github' } });
    await envoyer({ type: 'connection', state: 'checking', pastille: 'connexion…', geste: null });
    await envoyer({ type: 'connection', state: 'connected', pastille: 'repository connecté', geste: null });
    await envoyer({ type: 'depot', resume: null, ligne: 'GitHub · o/r · main', repli: false });
    const bouton = page.locator('.carte-tokens').getByRole('button', { name: 'Télécharger les tokens', exact: true });
    console.log('B. bouton « Télécharger les tokens » visible après la sauvegarde :', await bouton.isVisible());
    await bouton.click();
    await page.waitForFunction(() => window.demandes.at(-1)?.type === 'publier');
    console.log('B. demande émise par ce clic :', JSON.stringify(await page.evaluate(() => window.demandes.at(-1))));
    await page.close();
  }
  // C : l'échec étranger libère l'UI pendant l'analyse du composant.
  {
    const { page, envoyer } = await ouvrir(navigateur);
    await page.getByRole('button', { name: 'Analyser les tokens du fichier', exact: true }).click();
    await envoyer({ type: 'verdict', code: 'sans-depot', texte: 'Aucun repository connecté. Les tokens sera téléchargé sur votre poste.', action: 'Télécharger les tokens', etat: '' });
    await page.getByRole('button', { name: 'Analyser le composant', exact: true }).click();
    await envoyer({ type: 'status', state: 'loading', text: 'Analyse du composant…' });
    await envoyer({ type: 'status', state: 'error', text: 'La demande n’a pas abouti. Réessayez ; si l’erreur persiste, relancez le plugin.' });
    const analyserTokens = page.getByRole('button', { name: 'Analyser les tokens du fichier', exact: true });
    console.log('C. « Analyser les tokens » cliquable pendant l’analyse du composant :', await analyserTokens.isEnabled(), '; carte tokens inerte :', await page.locator('.carte-tokens').getAttribute('inert'));
    await analyserTokens.click();
    // Le sandbox ignore cette demande en silence ; le verdict du composant arrive ensuite.
    await envoyer({ type: 'verdict', code: 'sans-depot', texte: 'Aucun repository connecté. Le contrat sera téléchargé sur votre poste.', action: 'Télécharger le contrat', etat: '' });
    const surTokens = page.locator('.carte-tokens').getByRole('button', { name: 'Télécharger le contrat', exact: true });
    console.log('C. bouton « Télécharger le contrat » posé sur la carte des tokens :', await surTokens.isVisible());
    console.log('C. note de la carte des tokens :', await page.locator('.carte-tokens .note').textContent());
    await surTokens.click();
    await page.waitForFunction(() => window.demandes.at(-1)?.type === 'publier');
    console.log('C. demande émise par ce clic :', JSON.stringify(await page.evaluate(() => window.demandes.at(-1))));
    await page.close();
  }
} finally {
  await navigateur.close();
}
```

Sortie observée de `etat-perime.ts` :

```text
=== A. suppression du jeton pendant une publication
  {"type":"status","state":"loading","text":"Publication sur GitHub…"}
  {"type":"connection","state":"disconnected","pastille":"aucun repository","geste":"Renseignez l’URL du repository et un Personal Access Token. Sans eux, un export est téléchargé sur votre poste au lieu d’ouvrir une pull request."}
  {"type":"connection","state":"connected","pastille":"repository connecté","geste":null}
  {"type":"status","state":"success","text":"Tokens exportés. Pull request créée."}
jeton stocké : (aucun)
dernière pastille reçue par l’UI : repository connecté

=== B. verdict « Télécharger », configuration enregistrée, clic sur ce bouton
verdict : {"type":"verdict","code":"sans-depot","texte":"Aucun repository connecté. Les tokens sera téléchargé sur votre poste.","action":"Télécharger les tokens","etat":""}
  {"type":"status","state":"loading","text":"Publication sur GitHub…"}
  {"type":"demande","url":"https://github.com/o/r/pull/1","libelle":"Ouvrir la pull request de tokens.json"}
  {"type":"connection","state":"connected","pastille":"repository connecté","geste":null}
  {"type":"status","state":"success","text":"Tokens exportés. Pull request créée."}
écritures sur la forge : [ 'tokens.json' ] ; onglets ouverts : [ 'https://github.com/o/r/pull/1' ]

=== C. panne de clientStorage au redimensionnement pendant une analyse de composant
  {"type":"status","state":"loading","text":"Analyse du composant…"}
  {"type":"status","state":"error","text":"La demande n’a pas abouti. Réessayez ; si l’erreur persiste, relancez le plugin."}
  {"type":"verdict","code":"sans-depot","texte":"Aucun repository connecté. Le contrat sera téléchargé sur votre poste.","action":"Télécharger le contrat","etat":""}
  {"type":"download","filename":"tokens.json","octets":7}
  {"type":"log","text":"Aucun repository connecté : téléchargement sur votre poste."}
  {"type":"status","state":"success","text":"Tokens exportés. Téléchargement terminé."}
analyses lancées au total : 2
```

Sortie observée de `ui-rejeu.mjs` :

```text
B. bouton « Télécharger les tokens » visible après la sauvegarde : true
B. demande émise par ce clic : {"type":"publier","genre":"tokens"}
C. « Analyser les tokens » cliquable pendant l’analyse du composant : true ; carte tokens inerte : null
C. bouton « Télécharger le contrat » posé sur la carte des tokens : true
C. note de la carte des tokens : Aucun repository connecté. Le contrat sera téléchargé sur votre poste.
C. demande émise par ce clic : {"type":"publier","genre":"tokens"}
```

- **Garde-fou** : `code.test.ts` n'enregistre jamais de configuration entre
  l'analyse et la publication ; `interface.test.mjs` n'envoie aucun message de
  configuration après un verdict.
- **Famille** : `07f9a7b`, « chaque bouton publie son propre artefact » et
  aucun résultat périmé publié.
- **Piste de correction** : invalider l'analyse gardée à chaque sauvegarde ou
  suppression du jeton, côté sandbox comme côté carte.

#### [HAUTE] Un export identique ouvre une seconde demande de fusion dès que plus de 100 demandes sont ouvertes vers la base

- **Où** : `packages/plugin/src/forges/github.ts:329` et
  `packages/plugin/src/forges/gitlab.ts:114`, qui lisent la seule première page
  (`per_page=100`) ; lus par `exportsEnVol`, `packages/plugin/src/depot.ts:408`.
  Paquet plugin.
- **Invariant violé** : « Un export identique n'ouvre jamais une seconde
  demande de fusion. L'immobilité se juge sur la branche de base **et** sur les
  demandes d'export encore ouvertes (`exportsEnVol()`, `src/depot.ts`), sur
  l'une et l'autre forge. »
  ([AGENTS.md](../../../AGENTS.md#diagnostics))
- **Verdict** : `PLAUSIBLE`. La reproduction passe par un `fetch` simulé. Le tri
  et la taille de page viennent de la documentation publique : GitHub trie les
  pull requests par `created` décroissant avec 100 par page au plus, GitLab
  trie les merge requests par `created_at` décroissant avec la même borne.
- **Scénario** : 101 demandes ouvertes vers `main`, dont une demande d'export
  ancienne qui porte déjà le même contrat. Le filtre de préfixe s'applique après
  la lecture : 100 pull requests de dépendances ou 100 composants exportés
  sans fusion suffisent. Obtenu : `status=created` et une nouvelle demande sur
  les deux forges. Attendu : `unchanged` et l'URL de la demande existante. Le
  même trou cache la collision d'identité avec une demande au-delà du rang 100,
  et `etatDesTokens` répond `absents` au lieu de `en-attente`.
- **Reproduction** : `.chasse-n/forges/pagination.ts`, lancé par
  `npx tsx .chasse-n/forges/pagination.ts`.

```ts
import { encodeBase64 } from '../../packages/plugin/src/base64';
import { publishArtifact } from '../../packages/plugin/src/depot';
import type { RepositoryArtifact } from '../../packages/plugin/src/depot';
import { forgeGithub } from '../../packages/plugin/src/forges/github';
import { forgeGitlab } from '../../packages/plugin/src/forges/gitlab';

const CONTRAT = JSON.stringify({
  name: 'Button',
  meta: { contractVersion: '3.0', exportedAt: '2026-09-01T10:00:00.000Z', figma: { fileName: 'DS', nodeId: '1:2' } },
});
const artifact: RepositoryArtifact = { kind: 'component', filename: 'Button.contract.json', content: CONTRAT, warnings: [] };
const CHEMIN = 'src/components/Button/Button.contract.json';
const BRANCHE_ANCIENNE = 'ucm-exporter/export-component-20260901-100000';
const json = (c: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(c), { status, headers });

async function scenario(nom: string, forge: ReturnType<typeof forgeGithub>, repondre: (url: string, method: string) => Response) {
  const appels: string[] = [];
  const precedent = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    appels.push(`${method} ${url}`);
    return repondre(url, method);
  };
  try {
    const r = await publishArtifact(forge, { ...artifact, content: CONTRAT.replace('2026-09-01', '2026-09-16') });
    console.log(`[${nom}] statut=${r.status}`, r.status === 'created' ? `pullRequestUrl=${r.pullRequestUrl}` : `ou=${r.ou}`);
    console.log(`[${nom}] listes demandées :`, appels.filter((a) => a.includes('pulls?') || a.includes('merge_requests?')));
    console.log(`[${nom}] page 2 jamais lue :`, !appels.some((a) => a.includes('page=2')));
  } finally {
    globalThis.fetch = precedent;
  }
}

const pr = (i: number) => ({ head: { ref: `ucm-exporter/export-component-20260915-${String(i).padStart(6, '0')}` }, html_url: `https://github.com/acme/ds/pull/${i}` });
const mr = (i: number) => ({ source_branch: `ucm-exporter/export-component-20260915-${String(i).padStart(6, '0')}`, project_id: 7, source_project_id: 7, web_url: `https://gitlab.com/g/ds/-/merge_requests/${i}` });

async function main() {
  await scenario('github', forgeGithub({ projet: 'acme/ds', baseBranch: 'main', jeton: 't' }), (url, method) => {
    if (url.includes('ucm.config.json')) return json({ message: 'Not Found' }, 404);
    if (url.includes('/pulls?')) {
      if (url.includes('page=2')) return json([{ head: { ref: BRANCHE_ANCIENNE }, html_url: 'https://github.com/acme/ds/pull/1' }]);
      return json(Array.from({ length: 100 }, (_, i) => pr(200 - i)), 200, { Link: '<https://api.github.com/repositories/1/pulls?state=open&base=main&per_page=100&page=2>; rel="next"' });
    }
    if (url.includes(`/contents/${CHEMIN}?ref=${encodeURIComponent(BRANCHE_ANCIENNE)}`)) {
      return json({ type: 'file', sha: 's', content: encodeBase64(CONTRAT), encoding: 'base64' });
    }
    if (url.includes('/contents/') && method === 'GET') return json({ message: 'Not Found' }, 404);
    if (url.includes('/git/ref/heads/main')) return json({ object: { sha: 'tete' } });
    if (url.endsWith('/git/refs') && method === 'POST') return json({}, 201);
    if (url.includes('/contents/') && method === 'PUT') return json({}, 201);
    if (url.endsWith('/pulls') && method === 'POST') return json({ html_url: 'https://github.com/acme/ds/pull/999' }, 201);
    return json({ message: 'inattendu ' + url }, 500);
  });

  await scenario('gitlab', forgeGitlab({ projet: 'g/ds', baseBranch: 'main', jeton: 't' }), (url, method) => {
    if (url.includes('ucm.config.json')) return json({ message: '404 File Not Found' }, 404);
    if (url.includes('/merge_requests?')) {
      if (url.includes('page=2')) return json([{ ...mr(1), source_branch: BRANCHE_ANCIENNE }]);
      return json(Array.from({ length: 100 }, (_, i) => mr(200 - i)), 200, { 'X-Next-Page': '2', 'X-Total': '101' });
    }
    if (url.includes(`/files/${encodeURIComponent(CHEMIN)}?ref=${encodeURIComponent(BRANCHE_ANCIENNE)}`)) {
      return json({ content: encodeBase64(CONTRAT), commit_id: 'c', last_commit_id: 'l' });
    }
    if (url.includes('/repository/files/') && method === 'GET') return json({ message: '404 File Not Found' }, 404);
    if (url.includes('/repository/branches/main')) return json({ commit: { id: 'tete' } });
    if (url.endsWith('/repository/commits') && method === 'POST') return json({ id: 'x' }, 201);
    if (url.endsWith('/merge_requests') && method === 'POST') return json({ web_url: 'https://gitlab.com/g/ds/-/merge_requests/999' }, 201);
    return json({ message: 'inattendu ' + url }, 500);
  });
}
main();
```

Sortie observée :

```text
[github] statut=created pullRequestUrl=https://github.com/acme/ds/pull/999
[github] listes demandées : [
  'GET https://api.github.com/repos/acme/ds/pulls?state=open&base=main&per_page=100'
]
[github] page 2 jamais lue : true
[gitlab] statut=created pullRequestUrl=https://gitlab.com/g/ds/-/merge_requests/999
[gitlab] listes demandées : [
  'GET https://gitlab.com/api/v4/projects/g%2Fds/merge_requests?state=opened&target_branch=main&per_page=100'
]
[gitlab] page 2 jamais lue : true
```

- **Garde-fou** : `github.test.ts` (« un artefact identique déjà déposé en vol
  ne crée pas un second export ») et `gitlab.test.ts` simulent une liste courte,
  sans en-tête `Link` ni `X-Next-Page`. `inventaireInvariants.test.ts` ne
  vérifie que le nom `exportsEnVol`.
- **Famille** : `07f9a7b` pour la publication d'un résultat périmé. La chasse
  sur `68a710d` notait déjà la piste.
- **Piste de correction** : suivre la pagination des deux forges jusqu'à la
  dernière page, ou filtrer côté forge sur le préfixe de branche.

### Moyenne

#### [MOYENNE] `css.fontFamilyFallback` accepté par la configuration tronque la feuille, et `ucm tokens css` sort en 0

- **Où** : `packages/kit/src/format/configuration.ts:139-147`, qui ne refuse
  que `;`, `{`, `}`, `\r` et `\n` ; `packages/cli/src/tokens-css.mjs:85`, qui
  recopie le repli sans échappement. Paquets kit et CLI.
- **Promesse violée** : l'en-tête de `tokens-css.mjs` annonce « 0 feuille
  écrite, 1 fichier de tokens refusé, 2 invocation ou configuration fautive ».
  Le test `configuration.test.mjs` « un repli de famille qui fermerait la
  déclaration CSS est refusé » dit qu'un tel repli « cassait la suite de la
  feuille sans message ». Voir aussi
  [README de la CLI](../../../packages/cli/README.md).
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : `ucm.config.json` vaut
  `{"css":{"fontFamilyFallback":"sans-serif /*"}}`, avec un token `fontFamily`
  suivi d'un token `dimension` et d'un axe `theme`. La commande rend 0. Chromium
  ne garde qu'une règle sur trois, et `--zeta-espace` comme le mode sombre sont
  vides. Attendu : un refus en code 2 sur `css.fontFamilyFallback`. `(`, `[`,
  `url(`, un guillemet seul et un antislash final donnent la même perte ; un
  guillemet oublié est une faute de frappe plausible.
- **Reproduction** : `.chasse-n/tokens-css/repli-famille-2.mjs`, qui demande
  Playwright et Chromium (`npx playwright install chromium`).

```js
// css.fontFamilyFallback accepté par la grammaire de ucm.config.json : code de sortie, et ce que Chromium lit de la feuille.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { executer } from "../../packages/cli/src/ucm.mjs";

const tokens = {
  $extensions: {
    "com.ucm.formatVersion": 2,
    "com.ucm.axes": { theme: { modes: ["clair", "sombre"], default: "clair" } },
  },
  typo: { famille: { $type: "fontFamily", $value: "Inter" } },
  zeta: { espace: { $type: "dimension", $value: { value: 8, unit: "px" } } },
  theme: {
    fond: {
      $type: "number", $value: 1,
      $extensions: { "com.ucm.axis": "theme", "com.ucm.modes": { clair: 1, sombre: 2 } },
    },
  },
};

const replis = ["sans-serif", "sans-serif /*", "sans-serif(", "sans-serif [", "url(x", "sans-serif\\", "\"sans-serif", "'sans-serif", "sans-serif)", "sans-serif]"];
const navigateur = await chromium.launch();
for (const repli of replis) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-repli-"));
  writeFileSync(join(racine, "tokens.json"), JSON.stringify(tokens));
  writeFileSync(join(racine, "ucm.config.json"), JSON.stringify({ css: { fontFamilyFallback: repli } }));
  const journal = [];
  const code = await executer(["tokens", "css", "--out", "tokens.css"], {
    racine, ecrire: (t) => journal.push(t), alerter: (t) => journal.push(t),
  });
  const css = readFileSync(join(racine, "tokens.css"), "utf8");
  const page = await navigateur.newPage();
  await page.setContent(`<style>${css}</style><div data-theme="sombre"><p id="s"></p></div>`);
  const lu = await page.evaluate(() => {
    const racine = getComputedStyle(document.documentElement);
    const sombre = getComputedStyle(document.getElementById("s"));
    return {
      famille: racine.getPropertyValue("--typo-famille"),
      espace: racine.getPropertyValue("--zeta-espace"),
      fondSombre: sombre.getPropertyValue("--theme-fond"),
      regles: document.styleSheets[0].cssRules.length,
    };
  });
  console.log(JSON.stringify({ repli, code, lu }));
  await page.close();
}
await navigateur.close();
```

Commande : `node .chasse-n/tokens-css/repli-famille-2.mjs`. Sortie observée :

```text
{"repli":"sans-serif","code":0,"lu":{"famille":"\"Inter\", sans-serif","espace":"8px","fondSombre":"2","regles":3}}
{"repli":"sans-serif /*","code":0,"lu":{"famille":"\"Inter\", sans-serif","espace":"","fondSombre":"","regles":1}}
{"repli":"sans-serif(","code":0,"lu":{"famille":"","espace":"","fondSombre":"","regles":1}}
{"repli":"sans-serif [","code":0,"lu":{"famille":"","espace":"","fondSombre":"","regles":1}}
{"repli":"url(x","code":0,"lu":{"famille":"","espace":"","fondSombre":"","regles":1}}
{"repli":"sans-serif\\","code":0,"lu":{"famille":"\"Inter\", sans-serif\\;\n  --zeta-espace: 8px","espace":"","fondSombre":"2","regles":3}}
{"repli":"\"sans-serif","code":0,"lu":{"famille":"","espace":"","fondSombre":"2","regles":3}}
{"repli":"'sans-serif","code":0,"lu":{"famille":"","espace":"","fondSombre":"2","regles":3}}
{"repli":"sans-serif)","code":0,"lu":{"famille":"","espace":"8px","fondSombre":"2","regles":3}}
{"repli":"sans-serif]","code":0,"lu":{"famille":"","espace":"8px","fondSombre":"2","regles":3}}
```

- **Garde-fou** : `configuration.test.mjs` n'essaie que `;`, `}`, `{` et `\n` ;
  `tokens-css.test.mjs` n'emploie que `"sans-serif"` ; `tests/cascade/` ne pose
  aucun repli.
- **Famille** : `07f9a7b` a posé la liste noire actuelle. La chasse sur
  `68a710d` notait déjà la piste.
- **Piste de correction** : décider la grammaire du repli, une liste de noms de
  familles, et la valider par une lecture positive plutôt que par des
  caractères interdits.

#### [MOYENNE] Le rapport rouge déclare « valide, peut être fusionné » un contrat refusé pour un type typographique

- **Où** : `packages/kit/src/lecteurs/controle-repository.mjs:172-181`
  (`implementationsEnAttente`), qui écarte les contrats illisibles, incomplets,
  hors version ou au graphe cassé, mais pas `typesTypographiques`, que
  `bilanEstBloquant` (`verdict-bilan.mjs:91-97`) compte. Paquet kit.
- **Promesse violée** : `enteteDuVerdict` « écrit l'en-tête du rapport rouge,
  et rien d'autre que ce qui est vrai » ; le commentaire de
  `implementationsEnAttente` vise des « contrats valides ».
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : un contrat 13.0 `Etiquette` dont `textStyles.corps.tokens.fontSize`
  cite `{typo.taille}`, un `tokens.json` où ce token est `number`, et aucune
  implémentation. Obtenu : code 1 et « ❌ 1 contrat invalide », puis sous le
  même titre « Ces contrats sont valides et peuvent être fusionnés avant leur
  implémentation : `Etiquette.contract.json` ». Attendu : code 1 sans cette
  section pour ce contrat.
- **Reproduction** : `.chasse-n/controle/typo-attente-valide.mjs`.

```js
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

const contrat = {
  name: "Etiquette",
  meta: {
    contractVersion: "13.0",
    exportedAt: "2026-01-01T00:00:00.000Z",
    figma: { fileName: "f", nodeId: "1:1" },
    coverage: { portable: "complete" },
  },
  viewStructures: {
    st1: { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" }, children: [{ slot: "label" }] },
  },
  textStyles: { corps: { figmaName: "Corps", tokens: { fontSize: "{typo.taille}" } } },
  viewTypographies: { ty1: [{ slotPath: ["label"], style: "corps" }] },
  variantViews: { v1: { structure: "st1", typography: "ty1" } },
  variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, view: "v1" }],
  structure: { view: "st1" },
  rendering: { roles: {} },
};
const tokens = {
  $extensions: { "com.ucm.formatVersion": 2 },
  typo: { taille: { $type: "number", $value: 16 } },
};

const racine = mkdtempSync(join(tmpdir(), "ucm-typo-attente-"));
mkdirSync(join(racine, "components"));
writeFileSync(join(racine, "tokens.json"), JSON.stringify(tokens));
writeFileSync(join(racine, "components", "Etiquette.contract.json"), JSON.stringify(contrat));
const journal = [];
const code = await executer(["check", "--report", "rapport.md"], {
  racine, ecrire: (t) => journal.push(t), avertir: (t) => journal.push(t), alerter: (t) => journal.push(t),
});
console.log(`code ${code}`);
console.log(journal.join("\n"));
console.log("--- rapport.md");
console.log(readFileSync(join(racine, "rapport.md"), "utf8"));
```

Sortie observée, abrégée :

```text
code 1
✗ Etiquette.contract.json : type typographique incompatible → textStyles.corps.tokens.fontSize, {typo.taille} est number, attendu dimension
✗ Etiquette.contract.json : 1 référence contrôlée, implémentation en attente (autorisé) (.\components\Etiquette.contract.json)
✗ 1 contrat en défaut.
--- rapport.md
## ❌ 1 contrat invalide
...
### ❌ Des tokens typographiques ont un type incompatible : `Etiquette.contract.json` (1 token)
...
### ℹ️ Un composant n'a pas encore d'implémentation (1 composant)

Ces contrats sont valides et peuvent être fusionnés avant leur implémentation :

- `Etiquette.contract.json`
```

- **Garde-fou** : `controleRepository.test.mjs` teste le refus typographique
  avec une implémentation toujours présente, si bien que la section n'est
  jamais produite.
- **Famille** : `35e5a25`, geste du rapport. Cousin possible : tout futur motif
  de `bilanEstBloquant` que `implementationsEnAttente` ne recopie pas.
- **Piste de correction** : filtrer `implementationsEnAttente` par
  `bilanEstBloquant` au lieu d'une liste de motifs recopiée.

#### [MOYENNE] `ucm check --base` perd les notices du contrat modifié quand git cite son chemin, par exemple sous un dossier de contrats accentué

- **Où** : `packages/cli/src/check.mjs:59-63`, qui lit `git diff --name-only`
  sans `-z` ni `core.quotePath=false` ; `packages/kit/src/lecteurs/perimetre-rapport.mjs:11-33`,
  qui compare cette sortie telle quelle au chemin du bilan. Paquets CLI et kit.
- **Promesse violée** : `ucm --help`, « --base limite les états informatifs
  aux contrats modifiés depuis ce sha » ; le
  [README de la CLI](../../../packages/cli/README.md), « Limits informational
  notices to contracts changed since that commit ».
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : `ucm.config.json` vaut `{"components":"écrans"}`, chemin que
  `estCheminDuRepository` accepte. Un commit ajoute un contrat qui porte un
  avertissement d'export. git rend `"\303\251crans/Bouton/Bouton.contract.json"`.
  Obtenu : code 0, et l'avertissement disparaît du terminal comme de
  `rapport.md`, avec l'implémentation en attente. Le témoin `composants` les
  affiche. Attendu : les mêmes notices dans les deux cas. Les deux gabarits de
  CI écrits par `ucm init` passent `--base`.
- **Reproduction** : `.chasse-n/principal/perimetre-accents.mjs`.

```js
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

const contrat = (exportedAt) => JSON.stringify({
  name: "Bouton",
  meta: {
    contractVersion: "13.0",
    exportedAt,
    figma: { fileName: "f", nodeId: "1:1" },
    coverage: { portable: "partial" },
    diagnostics: [{ code: "UCM_PORTABLE_PROJECTION_WARNING", severity: "warning", message: "« Fond » : la couleur n'est liée à aucune variable. Liez-la dans Figma, puis réexportez." }],
  },
  viewStructures: { st1: { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" } } },
  variantViews: { v1: { structure: "st1" } },
  variants: [{ nodeId: "1:2", figmaName: "Default", view: "v1" }],
  structure: { view: "st1" },
  rendering: { roles: {} },
});

async function scenario(dossier) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-perimetre-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: racine, encoding: "utf8" });
  git("init", "-q");
  writeFileSync(join(racine, "ucm.config.json"), JSON.stringify({ components: dossier }));
  writeFileSync(join(racine, "tokens.json"), JSON.stringify({ $extensions: { "com.ucm.formatVersion": 2 } }));
  git("add", "-A");
  git("commit", "-qm", "base");
  const base = git("rev-parse", "HEAD").trim();
  mkdirSync(join(racine, dossier, "Bouton"), { recursive: true });
  writeFileSync(join(racine, dossier, "Bouton", "Bouton.contract.json"), contrat("2026-01-01T00:00:00.000Z"));
  git("add", "-A");
  git("commit", "-qm", "export");
  console.log(`--- components = ${dossier}`);
  console.log("git diff --name-only :", JSON.stringify(git("diff", "--name-only", base, "HEAD")));
  const journal = [];
  const sortie = (t) => journal.push(String(t));
  const code = await executer(["check", "--base", base, "--report", "rapport.md"], { racine, ecrire: sortie, avertir: sortie, alerter: sortie });
  const texte = journal.join("\n");
  const rapport = readFileSync(join(racine, "rapport.md"), "utf8");
  console.log(texte);
  console.log(`code ${code} ; avertissement d'export dans rapport.md : ${rapport.includes("Liez-la dans Figma")}`);
}

await scenario("composants");
await scenario("écrans");
```

Sortie observée :

```text
--- components = composants
git diff --name-only : "composants/Bouton/Bouton.contract.json\n"
✓ Bouton.contract.json : 0 références contrôlées, implémentation en attente (autorisé) (.\composants\Bouton\Bouton.contract.json)

⚠ 1 point signalé par l'export. Consultez le rapport publié.

✓ Contrats valides. Les références absentes et les écarts contrat ↔ code éventuels ont été signalés sans bloquer.
code 0 ; avertissement d'export dans rapport.md : true
--- components = écrans
git diff --name-only : "\"\\303\\251crans/Bouton/Bouton.contract.json\"\n"
✓ Bouton.contract.json : 0 références contrôlées, implémentation en attente (autorisé) (.\écrans\Bouton\Bouton.contract.json)

✓ Contrats valides. Les références absentes et les écarts contrat ↔ code éventuels ont été signalés sans bloquer.
code 0 ; avertissement d'export dans rapport.md : false
```

- **Garde-fou** : `check.test.mjs` lance git sur des chemins ASCII ;
  `perimetre-rapport.test.mjs` reçoit des chemins déjà relatifs à la racine.
- **Famille** : la chasse sur `68a710d` notait le même rapprochement depuis un
  sous-dossier, réfuté ici en section 4 pour l'usage réel.
- **Piste de correction** : lire le diff par `git -c core.quotePath=false diff -z --name-only`
  et découper sur le caractère nul.

#### [MOYENNE] Une adresse d'échantillon morte refuse la fusion sous le titre et le geste d'un graphe de composition, alors que le constat demande de réexporter

- **Où** : `packages/kit/src/lecteurs/validation-graphe-contrats.mjs:239-243`,
  qui verse les constats de `validerAdressesDEchantillons` dans `bilan.graphe` ;
  `controle-repository.mjs:303-311` pour le titre et l'action du rapport, et
  `:447-448` pour le rappel du terminal. Paquet kit.
- **Promesse violée** : un message au designer nomme « le geste à faire »
  ([AGENTS.md](../../../AGENTS.md#diagnostics)). Le rapport en donne deux qui se
  contredisent.
- **Verdict** : `CONFIRMÉ` pour le titre et le geste. Le refus lui-même est
  voulu : voir la section 4.
- **Scénario** : `Carte` compose `Badge` et son échantillon pose
  `args.tone = "danger"`. `Badge` est réexporté avec `tone` limité à `info` et
  `critical`. Obtenu : code 1, « La composition du contrat est incohérente :
  `Carte.contract.json` », « Action : Un développeur doit vérifier les contrats
  co-localisés, les slots composés et les cycles », et au terminal « ajoutez les
  contrats cibles, alignez les slots et supprimez les cycles ». Le constat
  lui-même dit « Réexportez les deux composants depuis Figma ». Attendu : un
  titre et un geste qui désignent l'échantillon et le réexport.
- **Reproduction** : `.chasse-n/controle/echantillon-bloquant-rapport.mjs`.

```js
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

const meta = (nodeId) => ({
  contractVersion: "13.0",
  exportedAt: "2026-01-01T00:00:00.000Z",
  figma: { fileName: "f", nodeId },
  coverage: { portable: "complete" },
});
const sizing = { width: "fit-content", height: "fit-content" };

const badge = (valeurs) => ({
  name: "Badge",
  meta: meta("2:1"),
  props: { tone: { type: "enum", values: valeurs, default: valeurs[0] } },
  viewStructures: { st1: { layout: "flex-row", sizing } },
  variantViews: { v1: { structure: "st1" } },
  variants: valeurs.map((valeur, index) => ({
    nodeId: `2:${index + 2}`, figmaName: `Tone=${valeur}`, values: { tone: valeur }, view: "v1",
  })),
  structure: { view: "st1", variantAxes: ["tone"] },
  rendering: { roles: {} },
});

const carte = {
  name: "Carte",
  meta: meta("1:1"),
  viewStructures: {
    st1: { layout: "flex-row", sizing, children: [{ slot: "badge", composes: "Badge" }] },
  },
  viewComposes: { c1: [{ component: "Badge", figmaLayer: "Badge" }] },
  variantViews: { v1: { structure: "st1", composes: "c1" } },
  variants: [{ nodeId: "1:2", figmaName: "Default", view: "v1", sample: "s1" }],
  structure: { view: "st1" },
  composes: [{ component: "Badge", figmaLayer: "Badge" }],
  samples: { s1: { composes: [{ component: "Badge", figmaLayer: "Badge", slotPath: ["badge"], args: { tone: "danger" } }] } },
  rendering: { roles: {} },
};

for (const [etape, valeurs] of [["avant", ["info", "danger"]], ["après réexport de Badge", ["info", "critical"]]]) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-echantillon-"));
  mkdirSync(join(racine, "components"));
  writeFileSync(join(racine, "tokens.json"), JSON.stringify({ $extensions: { "com.ucm.formatVersion": 2 } }));
  writeFileSync(join(racine, "components", "Badge.contract.json"), JSON.stringify(badge(valeurs)));
  writeFileSync(join(racine, "components", "Carte.contract.json"), JSON.stringify(carte));
  const journal = [];
  const code = await executer(["check", "--report", "rapport.md"], {
    racine, ecrire: (t) => journal.push(t), avertir: (t) => journal.push(t), alerter: (t) => journal.push(t),
  });
  console.log(`--- ${etape} : code ${code}`);
  console.log(journal.join("\n"));
  console.log(readFileSync(join(racine, "rapport.md"), "utf8"));
}
```

Sortie observée pour la seconde étape, la première rendant 0 :

```text
--- après réexport de Badge : code 1
✓ Badge.contract.json : 0 références contrôlées, implémentation en attente (autorisé) (.\components\Badge.contract.json)
✗ Carte.contract.json : graphe de composition incohérent → Le sample pose « tone = danger » sur la dépendance « Badge », dont le contrat n'admet que « info », « critical ». Réexportez les deux composants depuis Figma.
✗ Carte.contract.json : 0 références contrôlées, implémentation en attente (autorisé) (.\components\Carte.contract.json)

✗ 1 contrat en défaut.
  Graphe de composition incohérent : ajoutez les contrats cibles, alignez les slots et supprimez les cycles.
## ❌ 1 contrat invalide

Les contrôles ont détecté des contrats inexploitables, incompatibles ou incohérents.

### ❌ La composition du contrat est incohérente : `Carte.contract.json`

#### Écarts détectés

- Le sample pose « tone = danger » sur la dépendance « Badge », dont le contrat n'admet que « info », « critical ». Réexportez les deux composants depuis Figma.

#### Action

Un développeur doit vérifier les contrats co-localisés, les slots composés et les cycles.

La fusion reste bloquée.
```

- **Garde-fou** : `validation-contrats.test.mjs` affirme le refus en unitaire ;
  aucun test de `controleRepository.test.mjs` ne relie une adresse
  d'échantillon au titre et au geste du rapport.
- **Famille** : `35e5a25` et `864fbb2`, un geste mal adressé.
- **Piste de correction** : ranger les adresses d'échantillon dans une section
  à part du bilan, avec son titre et le geste de réexport.

#### [MOYENNE] `ucm init` ne rappelle pas le stage `test` quand `stages:` contient `test-e2e` ou `unit-test`

- **Où** : `packages/cli/src/init.mjs:663`, où `/\btest\b/` reconnaît `test` dans
  `test-e2e`, le tiret faisant frontière de mot. Paquet CLI.
- **Promesse violée** : `init.mjs:645-646` imprime les lignes qu'`init` ne peut
  pas écrire, dont « un `stages:` qui refuserait le job » ; le
  [README de la CLI](../../../packages/cli/README.md) : « keep `test` in
  `stages:` when `.gitlab-ci.yml` declares them: GitLab refuses a pipeline whose
  job names a missing stage ».
- **Verdict** : `CONFIRMÉ`. La documentation GitLab assigne le stage `test` à un
  job sans `stage:`.
- **Scénario** : `.gitlab-ci.yml` déclare `stages: [build, test-e2e]`. Obtenu :
  aucun rappel. Le designer ajoute l'`include:` et GitLab refuse tous les
  pipelines du projet. Attendu : le rappel, comme pour `[build, deploy]`.
- **Reproduction** : `.chasse-n/init/g1-lignes-gitlab.mjs`, lancé par `node`.
  Il porte aussi le constat suivant et le témoin `--tokens design`.

```js
// Chasse G : lignesGitlab sur des .gitlab-ci.yml existants, et --tokens design.
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

async function jouer(nom, ci, args = ["init", "--forge", "gitlab", "--sans-agents"]) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-g1-"));
  if (ci !== null) writeFileSync(join(racine, ".gitlab-ci.yml"), ci);
  const sorties = [];
  const code = await executer(args, { racine, ecrire: (t) => sorties.push(t), alerter: (t) => sorties.push("ALERTE " + t), git: () => null });
  const texte = sorties.join("\n");
  console.log(`=== ${nom} (code ${code})`);
  console.log("  réclame stage test :", /jOUTEZ `test` à `stages:`/i.test(texte));
  console.log("  réclame workflow:rules :", texte.includes("en tête de `workflow:rules`"));
  return { racine, texte };
}

await jouer("stages sans test, avec test-e2e", "stages:\n  - build\n  - test-e2e\n\nbuild:\n  stage: build\n  script: echo\n");
await jouer("stages sans test, avec unit-test", "stages: [build, unit-test]\n");
await jouer("stages sans test (témoin)", "stages:\n  - build\n  - deploy\n");
await jouer("workflow exclut les MR par when: never",
  "workflow:\n  rules:\n    - if: $CI_PIPELINE_SOURCE == \"merge_request_event\"\n      when: never\n    - if: $CI_COMMIT_BRANCH\n");
await jouer("workflow sans MR (témoin)", "workflow:\n  rules:\n    - if: $CI_COMMIT_BRANCH\n");

const { racine, texte } = await jouer("--tokens design", null, ["init", "--tokens", "design", "--forge", "github", "--sans-agents"]);
console.log("  ucm.config.json :", readFileSync(join(racine, "ucm.config.json"), "utf8").trim().replace(/\n\s*/g, " "));
console.log("  compte rendu :", texte.split("\n").find((l) => l.includes("tokens dans")));
```

Sortie observée :

```text
=== stages sans test, avec test-e2e (code 0)
  réclame stage test : false
  réclame workflow:rules : false
=== stages sans test, avec unit-test (code 0)
  réclame stage test : false
  réclame workflow:rules : false
=== stages sans test (témoin) (code 0)
  réclame stage test : true
  réclame workflow:rules : false
=== workflow exclut les MR par when: never (code 0)
  réclame stage test : false
  réclame workflow:rules : false
=== workflow sans MR (témoin) (code 0)
  réclame stage test : false
  réclame workflow:rules : true
=== --tokens design (code 0)
  réclame stage test : false
  réclame workflow:rules : false
  ucm.config.json : { "components": "components", "tokens": "design/tokens.json", "implementation": "{dir}/{id}.tsx" }
  compte rendu : Placez vos contrats sous `components/`, vos tokens dans `design/tokens.json`, puis lancez `ucm check`.
```

- **Garde-fou** : `gitlab.test.mjs` n'essaie que `[build, deploy]` et
  `[build, test]`.
- **Famille** : `02ba563`, les lignes GitLab qu'`init` imprime.
- **Piste de correction** : lire les éléments de la liste `stages:` et chercher
  l'élément `test` exact.

#### [MOYENNE] `ucm init` ne signale pas un `workflow:rules` qui nomme `merge_request_event` pour l'exclure

- **Où** : `packages/cli/src/init.mjs:670`, qui teste la seule présence de la
  chaîne `merge_request_event`. Paquet CLI.
- **Promesse violée** : `init.mjs:646-647`, rappel pour « un `workflow:rules`
  qui ne crée aucun pipeline de merge request ».
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : `workflow:rules` commence par
  `if: $CI_PIPELINE_SOURCE == "merge_request_event"` et `when: never`, motif
  courant contre les pipelines en double. Obtenu : aucun rappel, et `ucm` ne
  tourne sur aucune merge request, sans erreur. Attendu : le rappel, comme pour
  le témoin sans merge request.
- **Reproduction** : `g1-lignes-gitlab.mjs` du constat précédent, cas
  `workflow exclut les MR par when: never`.
- **Garde-fou** : `gitlab.test.mjs` n'a pas de cas `when: never`.
- **Famille** : `02ba563`, qui a introduit ce rappel pour la même panne
  silencieuse.
- **Piste de correction** : lire la règle qui nomme l'événement et son `when`,
  ou rappeler dès que la règle n'est pas un `when` positif.

#### [MOYENNE] La CI GitHub écrite par `ucm init` remplace le dernier commentaire de tout workflow qui emploie `GITHUB_TOKEN`

- **Où** : `packages/cli/src/init.mjs:520-524`, `gh pr comment --edit-last`
  sans marqueur. Paquet CLI.
- **Promesse violée** : `init.mjs:520`, « --edit-last met à jour le commentaire
  précédent au lieu d'en empiler un nouveau » ; le README de la CLI, « posts
  it, replacing its previous comment ». `rapport-gitlab.mjs:14-16` pose la
  règle attendue pour GitLab : seule la note qui porte le marqueur est
  remplacée.
- **Verdict** : `PLAUSIBLE`. Le manuel de `gh` dit « Edit the last comment of
  the current user » ; `gh` reconnaît l'auteur par `viewerDidAuthor`, et
  `GITHUB_TOKEN` agit sous la même identité dans tous les workflows du
  repository.
- **Scénario** : un workflow de couverture commente la pull request avec
  `GITHUB_TOKEN` après le contrôle UCM. Au push suivant, UCM remplace ce
  commentaire par son rapport. Attendu : seul le commentaire UCM est remplacé.
- **Reproduction** : `.chasse-n/init/g3-gabarits.mjs`, lancé par `node` ; il
  demande `bash` et porte aussi les deux constats GitLab suivants.

```js
// Chasse G : lignes des gabarits écrits par init, filet GitLab rejoué dans un
// espace de travail réutilisé, et corps de note transmis tel quel.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../../packages/cli/src/init.mjs";
import { executer } from "../../packages/cli/src/ucm.mjs";

// 1. GitHub : la ligne de publication.
const gh = mkdtempSync(join(tmpdir(), "ucm-g3-gh-"));
init(gh, { sansAgents: true, forge: "github" });
console.log("=== .github/workflows/ucm.yml");
for (const l of readFileSync(join(gh, ".github/workflows/ucm.yml"), "utf8").split("\n")) if (/gh pr comment/.test(l)) console.log("  " + l.trim());

// 2. GitLab : le filet de ucm-rapport, rejoué dans un CI_PROJECT_DIR réutilisé.
const gl = mkdtempSync(join(tmpdir(), "ucm-g3-gl-"));
init(gl, { sansAgents: true, forge: "gitlab" });
const yaml = readFileSync(join(gl, ".gitlab/ucm.gitlab-ci.yml"), "utf8");
const rapport = yaml.slice(yaml.indexOf("ucm-rapport:"));
console.log("=== ucm-rapport");
for (const l of rapport.split("\n")) if (/GIT_STRATEGY|if \[ ! -f|rapport-gitlab/.test(l)) console.log("  " + l.trim());
const bloc = /    - \|\n((?:      .*\n)+)/.exec(rapport)[1].replace(/^      /gm, "");
const projet = mkdtempSync(join(tmpdir(), "ucm-g3-builds-"));
// Laissé par le job `ucm` d'un pipeline précédent sur le même runner.
writeFileSync(join(projet, "ci-report.md"), "## ✅ Rapport d'une AUTRE merge request, vert\n");
execFileSync("bash", ["-c", bloc], { cwd: projet, env: { ...process.env, CI_PIPELINE_URL: "https://exemple/p/1" } });
console.log("  ci-report.md publié :", JSON.stringify(readFileSync(join(projet, "ci-report.md"), "utf8")));

// 3. Un corps réécrit avec une ligne d'action rapide part tel quel.
writeFileSync(join(projet, "ci-report.md"), "## rapport\n/label ~approuve\n/assign_reviewer @quelquun\n");
const envoyes = [];
const fetch = async (url, init = {}) => {
  if (init.body) envoyes.push(JSON.parse(init.body).body);
  const corps = url.endsWith("/user") ? { id: 1 } : [];
  return new Response(JSON.stringify(corps), { status: 200, headers: { "content-type": "application/json" } });
};
const code = await executer(["rapport-gitlab", "--projet", "42", "--merge-request", "7", "--fichier", "ci-report.md"],
  { racine: projet, env: { UCM_GITLAB_TOKEN: "x" }, fetch, ecrire: () => {}, alerter: console.error });
console.log("=== rapport-gitlab, code", code, ": corps POST", JSON.stringify(envoyes[0]));
```

Sortie observée :

```text
=== .github/workflows/ucm.yml
  gh pr comment "$NUMERO" -R "$GITHUB_REPOSITORY" --body-file ci-report.md --edit-last \
  || gh pr comment "$NUMERO" -R "$GITHUB_REPOSITORY" --body-file ci-report.md
=== ucm-rapport
  GIT_STRATEGY: none
  if [ ! -f ci-report.md ]; then
  - npx --yes @ucm-kit/cli@0.1.44 rapport-gitlab --projet "$CI_PROJECT_ID" --merge-request "$CI_MERGE_REQUEST_IID" --fichier "$CI_PROJECT_DIR/ci-report.md" --api "$CI_API_V4_URL"
  ci-report.md publié : "## ✅ Rapport d'une AUTRE merge request, vert\n"
=== rapport-gitlab, code 0 : corps POST "<!-- ucm-rapport -->\n## rapport\n/label ~approuve\n/assign_reviewer @quelquun\n"
```

- **Garde-fou** : `cli.test.mjs` vérifie la présence de `--edit-last`, sans
  marqueur.
- **Famille** : `298eca0`, qui a séparé le job de commentaire.
- **Piste de correction** : retrouver le commentaire UCM par un marqueur, comme
  le fait `rapport-gitlab`.

#### [MOYENNE] GitLab : sur un runner qui réutilise son dossier, un vieux `ci-report.md` fait taire le filet et part sur une autre merge request

- **Où** : `packages/cli/src/init.mjs:611` (`GIT_STRATEGY: none`), `:617`
  (`[ ! -f ci-report.md ]`) et `:627`. Paquet CLI.
- **Promesse violée** : `init.mjs:614-615`, « Filet : sans rapport, `ucm` s'est
  arrêté avant le contrôle » ;
  [RECETTE.md](../../guides/RECETTE.md), « `ucm-rapport` tourne quand même et
  publie le rapport minimal ».
- **Verdict** : `PLAUSIBLE`. La documentation GitLab des runners dit qu'avec
  `none`, « cache and artifact files from previous pipelines might still be
  present ». Les runners hébergés de gitlab.com repartent d'une machine neuve :
  le cas vise un runner auto-hébergé.
- **Scénario** : le job `ucm` de la merge request A laisse un rapport vert ; le
  job `ucm` de la merge request B échoue au clone sans artefact ; `ucm-rapport`
  de B tourne sur le même runner. Obtenu : le rapport vert de A publié en note
  de B. Le job `ucm` reste rouge. Attendu : le rapport minimal.
- **Reproduction** : `g3-gabarits.mjs` du constat précédent, partie 2, qui
  extrait le bloc shell du YAML généré.
- **Garde-fou** : `gitlab.test.mjs` exige `GIT_STRATEGY` égal à `none`.
- **Famille** : `298eca0` et `02ba563`.
- **Piste de correction** : `GIT_STRATEGY: empty`, ou retirer tout
  `ci-report.md` avant de rapatrier l'artefact.

#### [MOYENNE] Un échec étranger libère l'interface pendant une analyse, et le bouton d'une carte publie l'artefact de l'autre

- **Où** : `packages/plugin/src/code.ts:52-56` (`signalerEchec` émet un
  `status: error` global), `:254` (seconde analyse ignorée sans message),
  `:513-521` ; `packages/plugin/src/ui/index.ts:90-107`, `:154-158` et
  `:185-188`, où la variable `active` bascule avant la réponse du sandbox.
  Paquet plugin.
- **Promesse violée** : « Chaque commande conserve son résultat et la demande
  de publication indique lequel envoyer »
  ([SPEC.md](../../../packages/plugin/SPEC.md)) ; `07f9a7b`, « chaque bouton
  publie son propre artefact ».
- **Verdict** : `PLAUSIBLE`. L'entrelacement des messages est rejoué avec le
  vrai `code.ts` et l'UI construite ; la poignée envoie `resize` à chaque
  déplacement, et Figma n'attend pas un gestionnaire asynchrone. La panne de
  `clientStorage` au bon moment exige Figma.
- **Scénario** : tokens déjà analysés. Pendant l'analyse du composant, un
  `resize` dont `setAsync` rejette envoie `status: error` ; l'interface se
  libère ; un clic « Analyser les tokens » est ignoré par le sandbox, mais la
  carte des tokens devient active ; le verdict du composant s'y affiche avec
  « Télécharger le contrat », et ce bouton envoie `genre: 'tokens'`. Obtenu :
  `tokens.json` téléchargé, ou publié une fois un dépôt connecté. Attendu :
  l'interface occupée jusqu'à la fin, ou le contrat livré.
- **Reproduction** : `harnais.ts`, `etat-perime.ts` et `ui-rejeu.mjs` du
  constat haut sur le bouton « Télécharger les tokens », blocs C.
- **Garde-fou** : `code.test.ts` « deux demandes simultanées ne lancent qu'une
  analyse » compte les analyses sans regarder ce que l'UI reçoit ;
  `interface.test.mjs` n'envoie aucun `status: error` pendant l'occupation.
- **Famille** : `07f9a7b`. Cousins non reproduits : `selectionchange` et un
  échec de `save-settings` passent aussi par `signalerEchec`.
- **Piste de correction** : rattacher un échec à l'opération qui l'a produit, et
  ne rendre la main qu'à la fin de l'opération en cours.

### Basse

#### [BASSE] Des clés ajoutées à `structure` échappent au validateur, et `projectionDeReference` les applique par-dessus l'arbre du catalogue

- **Où** : `packages/kit/src/lecteurs/validation-contrat.mjs:1356` et
  `:1406-1414`, où la forme canonique ne reprend de `structure` que `view`,
  `sizes` et `variantAxes` ; `packages/kit/src/lecteurs/variant-views.mjs:68`,
  `return arbre ? { ...arbre, ...reste } : reste;`. Paquet kit.
- **Invariant violé** : deux enfants d'un même parent ne portent jamais le même
  slot, « et les lecteurs refusent un arbre qui les confond »
  ([AGENTS.md](../../../AGENTS.md#arbre-des-slots)).
- **Verdict** : `CONFIRMÉ`. Le moteur n'écrit pas ces clés : seul un contrat
  retouché les porte. Le schéma les refuse, mais `ucm check` ne l'exécute pas.
- **Scénario** : `structure.children` vaut deux enfants au slot `label`. Obtenu :
  `champsInvalidesDuContrat` rend `[]`, `ucm check` 0, et la projection lue
  contient ces deux enfants. Le même doublon dans le catalogue est refusé.
- **Reproduction** : `harnais.ts` du constat haut sur le padding, puis
  `.chasse-n/validation/schema-sur-mutations.ts`, lancé par `npx tsx`, qui
  porte aussi le constat suivant.

```ts
/** Le schéma publié et le kit sur les mutations des pistes 3 et 4, plus padding sous `sizes`. */
import { champsInvalidesDuContrat, valideurDeSchema, nomFigmaDuVariant } from '@ucm-kit/core/lecteurs';
import { exporter } from './harnais';

(async () => {
  const { contrat: base } = await exporter({});
  const valider = valideurDeSchema();
  const sonder = (nom: string, muter: (c: any) => void) => {
    const c = structuredClone(base);
    muter(c);
    const ok = valider(c);
    console.log(`[${nom}] schéma=${ok ? 'accepte' : 'refuse ' + JSON.stringify(valider.errors?.slice(0, 2).map((e: any) => `${e.instancePath} ${e.message} ${JSON.stringify(e.params)}`))} kit=${JSON.stringify(champsInvalidesDuContrat(c))}`);
    return c;
  };
  sonder('structure.children inline', (c) => { c.structure.children = [{ slot: 'label' }, { slot: 'label' }]; });
  const f = sonder('figmaName faux + table d’étiquettes', (c) => { c.variants[0].figmaName = 'Variant=Outlined'; });
  console.log('  nomFigmaDuVariant(variants[0], values=contained) →', nomFigmaDuVariant(f, f.variants[0]));
  const g = sonder('figmaName vide + table d’étiquettes', (c) => { c.variants[0].figmaName = ''; });
  console.log('  nomFigmaDuVariant →', JSON.stringify(nomFigmaDuVariant(g, g.variants[0])));
  sonder('figmaName vide, SANS table d’étiquettes', (c) => { c.variants[0].figmaName = ''; c.variants[1].figmaName = 'Variant=Outlined'; delete c.figmaVariantLabels; });
  sonder('sizes.medium.padding x seul', (c) => { c.structure.sizes = { medium: { padding: { x: '{tokens.p}' } } }; });
})();
```

Sortie observée :

```text
[structure.children inline] schéma=refuse ["/structure must NOT have additional properties {\"additionalProperty\":\"children\"}"] kit=[]
[figmaName faux + table d’étiquettes] schéma=accepte kit=[]
  nomFigmaDuVariant(variants[0], values=contained) → Variant=Outlined
[figmaName vide + table d’étiquettes] schéma=accepte kit=[]
  nomFigmaDuVariant → ""
[figmaName vide, SANS table d’étiquettes] schéma=accepte kit=["variants[0].figmaName"]
[sizes.medium.padding x seul] schéma=accepte kit=["structure.sizes.medium.padding"]
```

- **Garde-fou** : `refus-enregistres.test.mjs` mute les chemins existants et
  n'ajoute jamais de clé.
- **Famille** : la forme canonique de la 11.0.
- **Piste de correction** : refuser toute clé de `structure` hors `view`,
  `sizes` et `variantAxes`.

#### [BASSE] Le validateur résout le nom Figma d'un variant autrement que `nomFigmaDuVariant`, et accepte un `figmaName` vide ou faux

- **Où** : `packages/kit/src/lecteurs/validation-contrat.mjs:1325-1326` et
  `:1401` (`estTexte`, puis la table `figmaVariantLabels`) contre
  `packages/kit/src/lecteurs/variant-views.mjs:81` (toute chaîne présente).
  Paquet kit.
- **Promesse violée** : `variant-views.mjs:10`, « Tout cela se résout ici, et
  nulle part ailleurs. Un second résolveur, même équivalent en apparence,
  finirait par lire une vue que le contrat ne contient pas » ; `:76-78`, les deux
  chemins « ne coexistent jamais ».
- **Verdict** : `CONFIRMÉ`. Le moteur n'écrit jamais `figmaName` avec la table.
- **Scénario** : `variants[0].figmaName` vaut `""` à côté de la table. Obtenu :
  le kit rend `[]` et `nomFigmaDuVariant` rend `""`. Sans la table, le même
  champ est refusé.
- **Reproduction** : `schema-sur-mutations.ts` du constat précédent.
- **Garde-fou** : aucun test.
- **Famille** : un second résolveur, que l'en-tête de `variant-views.mjs`
  interdit.
- **Piste de correction** : valider par `nomFigmaDuVariant`, et refuser la
  coexistence des deux chemins.

#### [BASSE] Un échec de publication sans statut HTTP demande de vérifier la connexion, même quand la cause est une limite de taille ou un `ucm.config.json` invalide

- **Où** : `packages/plugin/src/code.ts:407` et `:416-418` passent `null` à
  `causeDepuisStatut`, qui répond `reseau` (`packages/plugin/src/connexion.ts:53`
  et `:180`). Les erreurs sans statut viennent de `depot.ts:532` (limite de
  fichier), `:543` (collision) et `:145-151` (configuration). Paquet plugin.
- **Promesse violée** : le commentaire de `diagnostiquerConnexion`,
  `depot.ts:313-314` : « Une erreur qui n'est pas une réponse de la forge ne dit
  rien du réseau ni des droits : la nommer autrement serait attribuer une cause
  non établie. » Le même module suit cette règle au test de connexion et
  l'oublie à la publication.
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : GitLab et un `tokens.json` de 21 Mo, ou GitHub et un
  `ucm.config.json` devenu invalide entre l'analyse et la publication. Obtenu :
  « Vérifiez votre connexion, puis réessayez » et « Réessayer la publication »,
  alors que le journal donne la vraie cause et que réessayer ne change rien.
  Attendu : le geste de la cause. Le fichier est téléchargé dans les deux cas.
- **Reproduction** : `harnais.ts` du constat haut, puis
  `.chasse-n/etat/geste-sans-statut.ts`, lancé par `npx tsx`.

```ts
/**
 * Une publication qui échoue sans statut HTTP, alors que la forge a répondu
 * (ou n'a même pas été appelée), reçoit le geste « vérifiez votre connexion ».
 */
import { fauxDepot, ouvrir, resultat, resume } from './harnais';

async function scenario(titre: string, preparer: (d: ReturnType<typeof fauxDepot>) => { url: string; jeton: string; nom: 'github' | 'gitlab'; contenu: string }, avantPublication: (d: ReturnType<typeof fauxDepot>) => void, nom: 'github' | 'gitlab') {
  const d = fauxDepot(nom);
  const p = preparer(d);
  const h = ouvrir({ forgeDe: () => d.forge });
  h.connecter(p.url, p.jeton, p.nom);
  h.exporte.traiter = async () => resultat('tokens.json', p.contenu);
  await h.envoyer({ type: 'analyser-tokens' });
  const verdictAnalyse = h.messages.filter((m) => m.type === 'verdict').at(-1);
  avantPublication(d);
  const debut = h.messages.length;
  await h.envoyer({ type: 'publier', genre: 'tokens' });
  console.log(`\n=== ${titre}`);
  console.log('verdict de l’analyse :', JSON.stringify(verdictAnalyse));
  for (const m of h.messages.slice(debut)) console.log(' ', JSON.stringify(resume(m)));
  console.log('écritures sur la forge :', d.ecritures.length);
}

async function main() {
  // 1. tokens.json de 21 Mo vers GitLab : l'analyse ne mesure pas, la publication refuse avant tout appel.
  await scenario(
    'GitLab, tokens.json de 21 Mo',
    () => ({ url: 'https://gitlab.com/g/p', jeton: 'glpat-xxxx', nom: 'gitlab', contenu: JSON.stringify({ a: 'x'.repeat(21 * 1024 * 1024) }) }),
    () => {},
    'gitlab',
  );
  // 2. ucm.config.json devenu illisible entre l'analyse et la publication.
  await scenario(
    'GitHub, ucm.config.json cassé entre analyse et publication',
    () => ({ url: 'https://github.com/o/r', jeton: 'ghp_xxxx', nom: 'github', contenu: '{"b":1}' }),
    (d) => { d.fichiers.set('ucm.config.json', '{ pas du json'); },
    'github',
  );
}

void main();
```

Sortie observée :

```text
=== GitLab, tokens.json de 21 Mo
verdict de l’analyse : {"type":"verdict","code":"a-publier","texte":"Prêt à publier dans tokens.json (d’après les valeurs par défaut).","action":"Publier les tokens","etat":""}
  {"type":"status","state":"loading","text":"Publication sur GitLab…"}
  {"type":"log","text":"Échec GitLab : Le contrat dépasse la limite GitLab de 20 Mo. Il reste disponible en téléchargement local."}
  {"type":"download","filename":"tokens.json","octets":22020104}
  {"type":"status","state":"error","text":"Échec GitLab. Le fichier a été téléchargé sur votre poste."}
  {"type":"verdict","code":"a-publier","texte":"Échec de la publication. La requête vers GitLab n’a pas abouti. Vérifiez votre connexion, puis réessayez.","action":"Réessayer la publication","etat":"error"}
écritures sur la forge : 0

=== GitHub, ucm.config.json cassé entre analyse et publication
verdict de l’analyse : {"type":"verdict","code":"a-publier","texte":"Prêt à publier dans tokens.json (d’après les valeurs par défaut).","action":"Publier les tokens","etat":""}
  {"type":"status","state":"loading","text":"Publication sur GitHub…"}
  {"type":"log","text":"Échec GitHub : ucm.config.json du repository n'est pas du JSON valide : impossible de savoir où écrire cet export. Un développeur doit corriger ce fichier."}
  {"type":"download","filename":"tokens.json","octets":7}
  {"type":"status","state":"error","text":"Échec GitHub. Le fichier a été téléchargé sur votre poste."}
  {"type":"verdict","code":"a-publier","texte":"Échec de la publication. La requête vers GitHub n’a pas abouti. Vérifiez votre connexion, puis réessayez.","action":"Réessayer la publication","etat":"error"}
écritures sur la forge : 0
```

- **Garde-fou** : `connexion.test.ts` fige `null` sur le geste réseau pour la
  fonction pure ; aucun test ne publie avec le vrai `depot.ts`.
- **Famille** : `864fbb2`, un refus 400 de GitLab mal attribué.
- **Piste de correction** : distinguer à la publication une
  `ErreurDeDescription` et un refus local d'une requête sans réponse, comme le
  fait `diagnostiquerConnexion`.

#### [BASSE] `ucm check` lancé depuis un sous-dossier applique les défauts sans le dire, et sort en 0 sur un repository qui porte un contrat illisible

- **Où** : `packages/cli/src/ucm.mjs:111` (`racine = process.cwd()`),
  `packages/cli/src/check.mjs:107` (`lireConfiguration(racine)`), sans remontée
  vers `ucm.config.json` ni vers la racine git ;
  `controle-repository.mjs:551-553` écrit « déclaré par `ucm.config.json` »
  sans que le fichier existe. Paquets CLI et kit.
- **Promesse violée** : le [README de la CLI](../../../packages/cli/README.md),
  « Each path is relative to the repository root » et « A faulty invocation
  never exits with `1`, so it cannot pass for failed checks ». Ici, une
  invocation depuis le mauvais dossier passe pour un contrôle vert.
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : `components/Bouton.contract.json` vaut `{ tronqué`. Depuis la
  racine : code 1, « JSON illisible ». Depuis `docs/` : code 0, « Aucun contrat
  dans components : ce repository n'a pas encore reçu d'export ». Les CI
  écrites par `ucm init` lancent la commande à la racine : l'effet se borne au
  poste local.
- **Reproduction** : `.chasse-n/controle/sous-dossier-vert.mjs`.

```js
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

const repo = mkdtempSync(join(tmpdir(), "ucm-sous-dossier-vert-"));
mkdirSync(join(repo, "components"));
mkdirSync(join(repo, "docs"));
writeFileSync(join(repo, "ucm.config.json"), JSON.stringify({ components: "components", tokens: "tokens.json" }));
writeFileSync(join(repo, "tokens.json"), JSON.stringify({ $extensions: { "com.ucm.formatVersion": 2 } }));
writeFileSync(join(repo, "components", "Bouton.contract.json"), "{ tronqué");

for (const racine of [repo, join(repo, "docs")]) {
  const journal = [];
  const code = await executer(["check", "--report", "rapport.md"], {
    racine, ecrire: (t) => journal.push(t), avertir: (t) => journal.push(t), alerter: (t) => journal.push(t),
  });
  console.log(`--- cwd = ${racine === repo ? "racine" : "docs/"} ; code ${code}`);
  console.log(journal.join("\n"));
}
```

Sortie observée :

```text
--- cwd = racine ; code 1
✗ Bouton.contract.json : JSON illisible (.\components\Bouton.contract.json)

✗ 1 contrat en défaut.
  JSON illisible ou incomplet : ré-exportez le composant depuis Figma.
--- cwd = docs/ ; code 0
✓ Aucun contrat dans components : ce repository n'a pas encore reçu d'export. Rien à contrôler.
```

- **Garde-fou** : aucun test de `check.test.mjs` ne lance la commande hors du
  dossier qui porte `ucm.config.json`.
- **Famille** : `13c6d51`, le dossier de contrats absent lu comme un repository
  neuf.
- **Piste de correction** : chercher la racine en remontant vers
  `ucm.config.json` ou la racine git, ou refuser en code 2 un dossier sans
  configuration ni dossier de contrats.

#### [BASSE] Un contrat d'environ 3 500 niveaux de `children` épuise la pile du validateur, et `ucm check` sort en 2 sans nommer le fichier

- **Où** : `packages/kit/src/lecteurs/validation-contrat.mjs`, parcours
  récursif de `children`. Paquet kit.
- **Promesse violée** : l'en-tête de `packages/kit/src/lecteurs/configuration.mjs`
  pose que « le validateur de contrats ne lève pas : un garde-fou doit
  diagnostiquer là où il serait tentant d'exploser ».
- **Verdict** : `CONFIRMÉ`. Le moteur borne la profondeur à 12 niveaux : seul un
  contrat écrit à la main atteint ce seuil, et le code 2 refuse la fusion.
- **Scénario** : un contrat valide dont `viewStructures.st1.children` descend
  sur 5 000 niveaux. `champsInvalidesDuContrat` lève `RangeError` dès 3 500
  niveaux ; `ucm check` rend 2 et « Maximum call stack size exceeded » sans
  désigner le contrat. Attendu : un champ invalide nommé, ou une profondeur
  refusée.
- **Reproduction** : `.chasse-n/principal/profondeur-check.mjs`.

```js
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

const contrat = (profondeur) => {
  const base = JSON.stringify({
    name: "X",
    meta: { contractVersion: "13.0", exportedAt: "2026-01-01T00:00:00.000Z", figma: { fileName: "f", nodeId: "1:1" }, coverage: { portable: "complete" } },
    viewStructures: { st1: { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" } } },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  });
  return base.replace('"sizing"', '"children":' + '[{"slot":"s","children":'.repeat(profondeur) + "[]" + "}]".repeat(profondeur) + ',"sizing"');
};

const racine = mkdtempSync(join(tmpdir(), "ucm-chasse-"));
mkdirSync(join(racine, "components", "X"), { recursive: true });
writeFileSync(join(racine, "tokens.json"), JSON.stringify({ $extensions: { "com.ucm.formatVersion": 2 } }));
writeFileSync(join(racine, "components", "X", "X.contract.json"), contrat(5000));
const journal = [];
const sortie = (t) => journal.push(String(t));
const code = await executer(["check"], { racine, ecrire: sortie, avertir: sortie, alerter: sortie });
console.log(`check : code ${code}`);
console.log(journal.join("\n"));
```

Sortie observée :

```text
check : code 2
La commande ucm check n'a pas pu aboutir : Maximum call stack size exceeded
Un développeur doit corriger l'erreur signalée, puis relancer la commande.
```

- **Garde-fou** : aucun test ne dépasse la profondeur que le moteur produit.
- **Famille** : `f4cdd37` et `07f9a7b`, la pile épuisée par les cycles de
  tokens et par un arbre de 8 000 groupes.
- **Piste de correction** : parcourir `children` par une pile explicite, ou
  refuser au-delà d'une profondeur bornée en nommant le champ.

#### [BASSE] `axesDeTokens` lève sur une extension déclarée `null` sous la clé `"undefined"`, malgré « Ne lève jamais »

- **Où** : `packages/kit/src/lecteurs/modes-tokens.mjs:110-123`
  (`defautDeDeclaration`). `extension?.parent` vaut `undefined`,
  `possede(extensions, undefined)` trouve la clé `"undefined"`, puis la seconde
  boucle lit `.parent` sur `null`. Paquet kit.
- **Promesse violée** : la documentation de `axesDeTokens`, « Ne lève jamais ».
- **Verdict** : `CONFIRMÉ`. L'exporteur n'écrit que `{ parent: string }` : seul
  un `tokens.json` retouché produit ce cas. `ucm check` n'appelle pas
  `axesDeTokens` ; `ucm tokens css` et `ucm guide` sortent en 2 avec le message
  brut.
- **Scénario** : un axe `couleur` qui déclare `extensions: { "undefined": null }`
  et une feuille qui le nomme. Obtenu : `TypeError: Cannot read properties of
  null (reading 'parent')`. Attendu : l'état `incoherent`, comme pour
  `{ "x": null }`.
- **Reproduction** : `.chasse-n/principal/axes-null.mjs`.

```js
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { axesDeTokens } from "../../packages/kit/src/lecteurs/modes-tokens.mjs";
import { executer } from "../../packages/cli/src/ucm.mjs";

const document = (extensions) => ({
  $extensions: { "com.ucm.formatVersion": 2, "com.ucm.axes": { couleur: { modes: ["clair"], default: "clair", extensions } } },
  fond: { $type: "number", $value: 1, $extensions: { "com.ucm.modes": { clair: 1 }, "com.ucm.axis": "couleur" } },
});
for (const extensions of [{ x: null }, { undefined: null }]) {
  try {
    console.log(JSON.stringify(extensions), "->", axesDeTokens(document(extensions)).etat);
  } catch (erreur) {
    console.log(JSON.stringify(extensions), "-> lève", erreur.constructor.name, erreur.message);
  }
}
const racine = mkdtempSync(join(tmpdir(), "ucm-axes-"));
writeFileSync(join(racine, "tokens.json"), JSON.stringify(document({ undefined: null })));
const journal = [];
const code = await executer(["tokens", "css", "--out", "tokens.css"], { racine, ecrire: (t) => journal.push(t), alerter: (t) => journal.push(t) });
console.log(`ucm tokens css : code ${code}\n${journal.join("\n")}`);
```

Sortie observée :

```text
{"x":null} -> incoherent
{"undefined":null} -> lève TypeError Cannot read properties of null (reading 'parent')
ucm tokens css : code 2
La commande ucm tokens n'a pas pu aboutir : Cannot read properties of null (reading 'parent')
Un développeur doit corriger l'erreur signalée, puis relancer la commande.
```

- **Garde-fou** : `modes-tokens-aleatoire.test.mjs` ne tire pas de clé
  `"undefined"`.
- **Famille** : `58c4dde`, qui a fait classer `incoherent` des modes illisibles.
- **Piste de correction** : tester que chaque extension est un objet avant de
  lire sa parente.

#### [BASSE] Un chemin de token sans lettre ni chiffre se projette sur `--`, et la feuille perd ce token et ses alias sous un code 0

- **Où** : `packages/cli/src/tokens-css.mjs:293-304` et `:317`. Le même
  fichier refuse aux lignes 277-280 une extension qui « ne donne aucun nom
  CSS ». Paquet CLI.
- **Promesse violée** : le [README de la CLI](../../../packages/cli/README.md)
  dit que la commande écrit une propriété par token et sort en 1 quand le
  fichier ne donne pas une feuille correcte. CSS Custom Properties Level 1
  réserve `--` seul.
- **Verdict** : `CONFIRMÉ`.
- **Scénario** : une collection `★` et une variable `☆`, que `normalizeName` et
  `joinTokenPath` gardent, puis un alias vers elle. La commande écrit
  `--: 7; --alias-etoile: var(--); --zeta: 8;` et rend 0. Chromium ne garde que
  `--zeta`. Attendu : un refus en code 1, comme pour une extension.
- **Reproduction** : `.chasse-n/tokens-css/projection-vide.mjs`.

```js
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { executer } from "../../packages/cli/src/ucm.mjs";

const tokens = {
  $extensions: { "com.ucm.formatVersion": 2 },
  "★": { "☆": { $type: "number", $value: 7 } },
  alias: { etoile: { $type: "number", $value: "{★.☆}" } },
  zeta: { $type: "number", $value: 8 },
};
const racine = mkdtempSync(join(tmpdir(), "ucm-vide-"));
writeFileSync(join(racine, "tokens.json"), JSON.stringify(tokens));
const journal = [];
const code = await executer(["tokens", "css", "--out", "tokens.css"], {
  racine, ecrire: (t) => journal.push(t), alerter: (t) => journal.push(t),
});
const css = readFileSync(join(racine, "tokens.css"), "utf8");
console.log(`code ${code}\n${journal.join("\n")}\n${css}`);
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.setContent(`<style>${css}</style><p id=s></p>`);
console.log(JSON.stringify(await page.evaluate(() => {
  const s = getComputedStyle(document.getElementById("s"));
  return {
    valeurs: Object.fromEntries(["--", "--alias-etoile", "--zeta"].map((p) => [p, s.getPropertyValue(p)])),
    reglesLues: [...document.styleSheets[0].cssRules].map((r) => r.cssText),
  };
})));
await navigateur.close();
```

Sortie observée :

```text
code 0
tokens.css : 1 règles, 2 déclarations, 168 octets.
/* Généré par ucm tokens css depuis tokens.json. Relancer la commande plutôt que modifier ce fichier. */
:root {
  --: 7;
  --alias-etoile: var(--);
  --zeta: 8;
}
{"valeurs":{"--":"","--alias-etoile":"","--zeta":"8"},"reglesLues":[":root { --zeta: 8; }"]}
```

- **Garde-fou** : `tokens-css.test.mjs` ne teste que la collision de deux
  chemins ; `constatsDeNomsCss` du plugin ne signale que la collision et le
  préfixe réservé.
- **Famille** : la non-bijectivité documentée dans
  [FORMAT.md](../../format/FORMAT.md#nommer-et-citer-un-token), qui ne couvre
  que la collision.
- **Piste de correction** : refuser un token dont la projection est `--`, dans
  la CLI comme pour une extension, et le signaler à l'export.

#### [BASSE] Un chemin `tokens` qui contient `*/` ferme le commentaire d'en-tête, et `:root` est perdu sous un code 0

- **Où** : `packages/cli/src/tokens-css.mjs:572`, qui recopie
  `configuration.tokens` dans le commentaire ; `estCheminDuRepository`
  (`packages/kit/src/format/configuration.ts:77-81`) accepte `*`. Paquets CLI et
  kit.
- **Promesse violée** : l'en-tête de `tokens-css.mjs`, « 0 feuille écrite ».
- **Verdict** : `CONFIRMÉ`, sur un système de fichiers simulé : Windows interdit
  `*` dans un nom de dossier, Linux et git l'acceptent.
- **Scénario** : `{"tokens":"design*/tokens.json"}`. L'en-tête devient
  `/* Généré par ucm tokens css depuis design*/tokens.json. ... */`, la suite de
  la phrase devient le prélude de la règle, et Chromium lit `cssRules: []` sous
  un code 0. Attendu : un en-tête qui ne se ferme pas, ou un chemin refusé.
- **Reproduction** : `.chasse-n/tokens-css/en-tete.mjs`. Le script redirige
  les seules lectures d'un chemin qui contient `*` vers un fichier réel ;
  l'en-tête se construit sans accès disque.

```js
import fs, { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const racine = mkdtempSync(join(tmpdir(), "ucm-entete-"));
const reel = join(racine, "tokens.json");
writeFileSync(reel, JSON.stringify({
  $extensions: { "com.ucm.formatVersion": 2 },
  espace: { $type: "dimension", $value: { value: 8, unit: "px" } },
}));
writeFileSync(join(racine, "ucm.config.json"), JSON.stringify({ tokens: "design*/tokens.json" }));

const rediriger = (original) => (chemin, ...reste) => original(
  typeof chemin === "string" && chemin.includes("*") ? reel : chemin, ...reste);
fs.existsSync = rediriger(fs.existsSync);
fs.readFileSync = rediriger(fs.readFileSync);
syncBuiltinESMExports();

const { executer } = await import("../../packages/cli/src/ucm.mjs");
const journal = [];
const code = await executer(["tokens", "css", "--out", "tokens.css"], {
  racine, ecrire: (t) => journal.push(t), alerter: (t) => journal.push(t),
});
const css = readFileSync(join(racine, "tokens.css"), "utf8");
console.log(`code ${code}\n${journal.join("\n")}\n---\n${css}---`);

const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.setContent(`<style>${css}</style>`);
console.log(JSON.stringify(await page.evaluate(() => ({
  espace: getComputedStyle(document.documentElement).getPropertyValue("--espace"),
  regles: [...document.styleSheets[0].cssRules].map((r) => r.cssText),
}))));
await navigateur.close();
```

Sortie observée :

```text
code 0
tokens.css : 1 règles, 1 déclarations, 144 octets.
---
/* Généré par ucm tokens css depuis design*/tokens.json. Relancer la commande plutôt que modifier ce fichier. */
:root {
  --espace: 8px;
}
---
{"espace":"","regles":[]}
```

- **Garde-fou** : aucun test ne passe un chemin `tokens` à caractères
  spéciaux jusqu'à la feuille.
- **Famille** : `298eca0`, qui a borné les chemins de configuration sans
  regarder leurs usages en texte.
- **Piste de correction** : échapper `*/` dans l'en-tête, ou ne pas y recopier
  le chemin.

#### [BASSE] `ucm rapport-gitlab` suit une redirection de l'API vers http et y envoie `PRIVATE-TOKEN` en clair

- **Où** : `packages/cli/src/rapport-gitlab.mjs:115-118`, un `fetch` sans
  `redirect: "manual"`. La garde de `:45` ne vérifie que l'adresse de départ.
  Paquet CLI.
- **Promesse violée** : `rapport-gitlab.mjs:45`, « --api attend une adresse
  https ». La spécification Fetch ne retire que `Authorization` sur une
  redirection vers une autre origine, et garde `PRIVATE-TOKEN`.
- **Verdict** : `CONFIRMÉ` avec le vrai `fetch` de Node contre deux serveurs
  locaux. La gravité reste basse : `--api` vaut `$CI_API_V4_URL`, et seule une
  instance auto-hébergée qui redirige son API vers http expose le jeton.
- **Scénario** : `--api https://localhost:P/api/v4` répond 301 vers
  `http://127.0.0.1:Q`. Obtenu : le serveur http reçoit
  `glpat-SECRET0123456789`. Attendu : aucun envoi hors de l'API https.
- **Reproduction** : `.chasse-n/init/g2-rapport.mjs`, lancé par `node` ; il
  demande `openssl` et porte aussi les deux constats suivants.

```js
// Chasse G : rapport-gitlab avec le vrai fetch de Node contre des serveurs locaux,
// et avec un fetch simulé. Aucun appel ne sort de la machine.
import { createServer as createHttps } from "node:https";
import { createServer as createHttp } from "node:http";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executer } from "../../packages/cli/src/ucm.mjs";

const dossier = mkdtempSync(join(tmpdir(), "ucm-g2-"));
writeFileSync(join(dossier, "ci-report.md"), "## rapport\n");
const JETON = "glpat-SECRET0123456789";

async function lancer(nom, env, fetch, api = null) {
  const sorties = [];
  const args = ["rapport-gitlab", "--projet", "42", "--merge-request", "7", "--fichier", "ci-report.md"];
  if (api) args.push("--api", api);
  const code = await executer(args, {
    racine: dossier, env, fetch,
    ecrire: (t) => sorties.push("OUT " + t), alerter: (t) => sorties.push("ERR " + t),
  });
  console.log(`=== ${nom} : code ${code}`);
  for (const s of sorties) console.log("  " + s);
  return sorties.join("\n");
}

// 1. Redirection https -> http : le vrai fetch suit-il en gardant PRIVATE-TOKEN ?
const cle = join(dossier, "k.pem"), cert = join(dossier, "c.pem");
let tls = null;
try {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", cle, "-out", cert, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
  tls = { key: readFileSync(cle), cert: readFileSync(cert) };
} catch (e) { console.log("openssl indisponible :", e.message); }

if (tls) {
  const recus = [];
  const clair = createHttp((req, res) => {
    recus.push({ url: req.url, jeton: req.headers["private-token"] });
    res.writeHead(401); res.end("{}");
  });
  await new Promise((r) => clair.listen(0, "127.0.0.1", r));
  const portClair = clair.address().port;
  const chiffre = createHttps(tls, (req, res) => {
    res.writeHead(301, { location: `http://127.0.0.1:${portClair}${req.url}` }); res.end();
  });
  await new Promise((r) => chiffre.listen(0, "127.0.0.1", r));
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // certificat auto-signé du serveur local seulement
  await lancer("redirection https -> http", { UCM_GITLAB_TOKEN: JETON }, globalThis.fetch, `https://localhost:${chiffre.address().port}/api/v4`);
  console.log("  reçu en clair par le serveur http :", JSON.stringify(recus));
  clair.close(); chiffre.close();
}

// 2. Jeton avec saut de ligne intérieur : le message d'erreur l'imprime-t-il ?
const casse = await lancer("jeton à saut de ligne intérieur", { UCM_GITLAB_TOKEN: "glpat-SECRET01\n23456789" }, globalThis.fetch);
console.log("  la sortie contient le jeton :", casse.includes("SECRET01"));

// 3. Réponse 200 qui n'est pas du JSON (page HTML d'un proxy) : quel code ?
await lancer("200 non JSON", { UCM_GITLAB_TOKEN: JETON }, async () => new Response("<html>login</html>", { status: 200 }));
```

Sortie observée :

```text
(node:4544) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
(Use `node --trace-warnings ...` to show where the warning was created)
=== redirection https -> http : code 1
  ERR GitLab refuse le jeton de UCM_GITLAB_TOKEN (401) en voulant lire le compte du jeton. Un mainteneur du projet doit créer un nouveau jeton de scope api, puis remplacer la valeur de cette variable.
  reçu en clair par le serveur http : [{"url":"/api/v4/user","jeton":"glpat-SECRET0123456789"}]
=== jeton à saut de ligne intérieur : code 1
  ERR La requête vers GitLab n'a pas abouti en voulant lire le compte du jeton (Headers.append: "glpat-SECRET01
23456789" is an invalid header value.). Relancez le job.
  la sortie contient le jeton : true
=== 200 non JSON : code 2
  ERR La commande ucm rapport-gitlab n'a pas pu aboutir : Unexpected token '<', "<html>login</html>" is not valid JSON
Un développeur doit corriger l'erreur signalée, puis relancer la commande.
```

- **Garde-fou** : `gitlab.test.mjs` teste `--api` avec un `fetch` simulé, sans
  redirection.
- **Famille** : `298eca0`, jeton de la CI.
- **Piste de correction** : refuser toute redirection sur les appels qui
  portent le jeton.

#### [BASSE] `ucm rapport-gitlab` imprime en entier un jeton qui contient un saut de ligne

- **Où** : `packages/cli/src/rapport-gitlab.mjs:120`, qui recopie le message de
  `Headers.append`, lequel cite la valeur. Paquet CLI.
- **Promesse violée** : `rapport-gitlab.mjs:8-9`, le jeton « n'apparaît dans
  aucune sortie » ; le README de la CLI, « never prints it ».
- **Verdict** : `CONFIRMÉ`. La procédure écrite exige une variable masquée, que
  GitLab veut sur une seule ligne : seule une variable non masquée produit ce
  cas.
- **Scénario** : `UCM_GITLAB_TOKEN` vaut `glpat-SECRET01`, un saut de ligne,
  puis `23456789`. Obtenu : le journal du job contient le jeton. Attendu : un
  refus qui ne le cite pas.
- **Reproduction** : `g2-rapport.mjs` du constat précédent, partie 2.
- **Garde-fou** : `gitlab.test.mjs` n'emploie que des jetons valides.
- **Famille** : `298eca0`.
- **Piste de correction** : ne jamais recopier le message d'une erreur levée
  pendant la construction de la requête.

#### [BASSE] `ucm rapport-gitlab` sort en 2, « invocation fautive », sur une réponse 200 qui n'est pas du JSON

- **Où** : `packages/cli/src/rapport-gitlab.mjs:127`, `:133-134` et `:148` ;
  l'erreur de `.json()` n'est pas un `RefusGitlab` et `executer` la rend en 2.
  Paquet CLI.
- **Promesse violée** : `rapport-gitlab.mjs:77-78`, « Codes : 0 note écrite ou
  jeton absent, 1 refus de GitLab ou rapport illisible, 2 invocation fautive ».
- **Verdict** : `CONFIRMÉ`. `allow_failure` garde la couleur du pipeline.
- **Scénario** : un proxy ou une page de connexion rend
  `<html>login</html>` en 200. Obtenu : code 2 et « Un développeur doit corriger
  l'erreur signalée ». Attendu : code 1, réponse de GitLab illisible.
- **Reproduction** : `g2-rapport.mjs`, partie 3.
- **Garde-fou** : aucun test.
- **Famille** : `e6da1d8`, un code de sortie qui ne dit pas la cause.
- **Piste de correction** : ranger une réponse illisible parmi les refus de
  GitLab.

#### [BASSE] `ucm rapport-gitlab` publie telle quelle une ligne qui commence par `/`, que GitLab exécute en action rapide

- **Où** : `packages/cli/src/rapport-gitlab.mjs:108`. Paquet CLI.
- **Promesse violée** : la neutralisation d'« une ligne qui commence par `/`
  sur GitLab, où cette ligne serait exécutée comme action rapide »
  ([AGENTS.md](../../../AGENTS.md#diagnostics)) ; le gabarit GitHub
  (`init.mjs:494-495`) traite le rapport comme réécrit par une dépendance.
- **Verdict** : `PLAUSIBLE`. Le rendu du kit neutralise déjà ces lignes : seul
  un `ci-report.md` réécrit par une dépendance lancée par `npm ci`, ou par une
  branche poussée, en porte une. L'exécution par une note créée par l'API est
  rapportée par l'issue GitLab 16721 ; le compte du jeton a le rôle Reporter.
- **Scénario** : `ci-report.md` contient `/label ~approuve`. Obtenu : la note
  part avec cette ligne. Attendu : la ligne en `code`.
- **Reproduction** : `g3-gabarits.mjs` du constat sur `--edit-last`, partie 3.
- **Garde-fou** : aucun test.
- **Famille** : `298eca0`, le job qui publie ne lance pas `npm ci`.
- **Piste de correction** : neutraliser les lignes `/` du fichier avant l'envoi,
  comme le fait le rendu du kit.

#### [BASSE] La pastille affiche « repository connecté » après la suppression du jeton pendant une publication

- **Où** : `packages/plugin/src/code.ts:402`, qui envoie
  `postConnection('connecte')` à la fin d'une publication sans relire la
  configuration, et `:529-535`, où `supprimer-token` n'attend pas l'opération en
  cours. Paquet plugin.
- **Promesse violée** : « L'en-tête expose en permanence l'état de la
  connexion » ([SPEC.md](../../../packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)).
- **Verdict** : `PLAUSIBLE`. L'en-tête n'est jamais inerte, et la suppression
  se fait pendant la publication dans l'UI construite ; l'entrelacement exige
  Figma.
- **Scénario** : une publication GitHub est en vol, le designer supprime le
  jeton, puis la pull request est créée. Obtenu : dernière pastille « repository
  connecté », jeton stocké absent. Attendu : « aucun repository ».
- **Reproduction** : `harnais.ts` et `etat-perime.ts` du constat haut, bloc A ;
  la sortie y figure.
- **Garde-fou** : aucun test ne mêle une commande de configuration à une
  publication en vol.
- **Famille** : `07f9a7b`.
- **Piste de correction** : relire la configuration avant d'annoncer l'état de
  la connexion.

#### [BASSE] La borne du corps GitLab compte des unités UTF-16, alors que GitLab borne la description en octets

- **Où** : `packages/plugin/src/depot.ts:267-273` (`.length`) contre
  `limiteDeCorps: 1_048_576` (`packages/plugin/src/forges/termes.ts:74`). Le
  même fichier emploie déjà `utf8ByteLength` pour la taille de l'artefact.
  Paquet plugin.
- **Promesse violée** : [SPEC.md](../../../packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge),
  « Le corps s'arrête avant la limite de la forge ».
- **Verdict** : `PLAUSIBLE`. GitLab valide `description` par
  `bytesize: { maximum: description_and_note_max_size }`
  (`app/models/concerns/issuable.rb`), 1 048 576 octets par défaut selon la
  documentation des réglages d'application.
- **Scénario** : 6 000 avertissements en français. Obtenu : 1 048 393 unités
  UTF-16 sous la borne, soit 1 132 220 octets. GitLab refuserait la merge
  request, le plugin supprime la branche et retombe sur le téléchargement
  local ; le 400 est de plus rangé sous « règle de push du projet ». Attendu : un
  corps sous 1 048 576 octets.
- **Reproduction** : `.chasse-n/forges/corps-octets.ts`, lancé par `npx tsx`.

```ts
import { utf8ByteLength } from '../../packages/plugin/src/base64';
import { corpsDeLaDemande } from '../../packages/plugin/src/depot';
import { forgeGitlab } from '../../packages/plugin/src/forges/gitlab';

const forge = forgeGitlab({ projet: 'g/ds', baseBranch: 'main', jeton: 't' });
const limite = forge.termes.limiteDeCorps;
const phrase = (i: number) =>
  `« Icône ${i} » : le contrat ne décrit pas les tracés : le développeur connaîtra la place et les `
  + `dimensions, pas le dessin. Ajoutez une règle d’icône dont le layer « icon » porte « Icône ${i} », puis réexportez.`;
const warnings = Array.from({ length: 6000 }, (_, i) => phrase(i));
const corps = corpsDeLaDemande('src/tokens/tokens.json', { kind: 'component', filename: 'A.contract.json', content: '{}', warnings }, forge);
console.log('limiteDeCorps           =', limite);
console.log('corps.length (UTF-16)   =', corps.length, corps.length <= limite ? '<= limite' : '> limite');
console.log('corps en octets UTF-8   =', utf8ByteLength(corps), utf8ByteLength(corps) <= limite ? '<= limite' : '> 1 048 576 : GitLab refuse');
console.log('points listés / omis    =', corps.split('\n').filter((l) => l.startsWith('- ')).length, '/', (corps.match(/(\d+) autres points/) ?? [])[1]);
```

Sortie observée :

```text
limiteDeCorps           = 1048576
corps.length (UTF-16)   = 1048393 <= limite
corps en octets UTF-8   = 1132220 > 1 048 576 : GitLab refuse
points listés / omis    = 4930 / 1070
```

- **Garde-fou** : `gitlab.test.ts` borne le corps avec de l'ASCII seul, où
  unités et octets coïncident. GitHub compte des caractères, et le compte UTF-16
  y reste prudent.
- **Famille** : `07f9a7b`, le corps GitHub borné à 65 536 caractères.
- **Piste de correction** : mesurer le corps GitLab par `utf8ByteLength`, et
  décrire la borne en octets dans SPEC.md.

#### [BASSE] La neutralisation Markdown pose des accents graves qui s'apparient avec un accent grave du nom, et remet `@icons` hors du code

- **Où** : `packages/plugin/src/forges/github.ts:234-248` et
  `packages/plugin/src/forges/gitlab.ts:25-48`. Sur GitLab, `ACTION_RAPIDE`
  s'applique après `FORMES_AUTOLIEES` et enveloppe un texte qui en porte déjà.
  Paquet plugin.
- **Invariant violé** : « chaque forge y neutralise ses formes actives.
  `sansLienAutomatique()` publie en `code` `@nom` et `#123` sur GitHub »
  ([AGENTS.md](../../../AGENTS.md#diagnostics)).
- **Verdict** : `PLAUSIBLE`. Le découpage suit la règle CommonMark des code
  spans ; le rendu final appartient à la forge.
- **Scénario** : un calque nommé ``Chevron` `` qui déclenche l'avertissement
  réel sur `@icons`. Le corps publié garde deux `@icons` hors de tout code span,
  sur les deux forges. Sur GitLab, un nom `a` suivi d'une ligne `/@bob` devient
  `` `/`@bob`` ``, et `@bob` ressort. Attendu : aucune mention hors code.
- **Reproduction** : `.chasse-n/forges/span-casse.ts`, lancé par `npx tsx`.

```ts
import { corpsDeLaDemande } from '../../packages/plugin/src/depot';
import { pousserLocalise } from '../../packages/plugin/src/contract/localisation';
import { forgeGithub, sansLienAutomatiqueGithub } from '../../packages/plugin/src/forges/github';
import { forgeGitlab, sansLienAutomatiqueGitlab } from '../../packages/plugin/src/forges/gitlab';

const BT = String.fromCharCode(96);

function horsCode(ligne: string): string {
  let dehors = '';
  let i = 0;
  while (i < ligne.length) {
    if (ligne[i] !== BT) { dehors += ligne[i]; i += 1; continue; }
    let n = 0;
    while (ligne[i + n] === BT) n += 1;
    let j = i + n;
    let ferme = -1;
    while (j < ligne.length) {
      if (ligne[j] !== BT) { j += 1; continue; }
      let m = 0;
      while (ligne[j + m] === BT) m += 1;
      if (m === n) { ferme = j; break; }
      j += m;
    }
    if (ferme === -1) { dehors += ligne.slice(i, i + n); i += n; continue; }
    dehors += ' ';
    i = ferme + n;
  }
  return dehors;
}

const actives = (texte: string, re: RegExp) =>
  texte.split('\n').flatMap((l) => horsCode(l).match(re) ?? []);

const warnings: string[] = [];
pousserLocalise(warnings, 'Layer', { id: '1:2', name: 'Chevron' + BT }, {
  manque: `il ne contient qu'un dessin, et aucune règle @icons ne le désigne.`,
  impact: 'Le contrat ne décrit pas les tracés.',
  action: `Ajoutez une règle @icons dont le layer « icon » porte « Chevron${BT} », puis réexportez.`,
});
const artefact = { kind: 'component' as const, filename: 'A.contract.json', content: '{}', warnings };
for (const [nom, forge] of [
  ['github', forgeGithub({ projet: 'acme/ds', baseBranch: 'main', jeton: 't' })],
  ['gitlab', forgeGitlab({ projet: 'g/ds', baseBranch: 'main', jeton: 't' })],
] as const) {
  const corps = corpsDeLaDemande('a/A/A.contract.json', artefact, forge);
  const ligne = corps.split('\n').find((l) => l.startsWith('- '))!;
  console.log(`[${nom}] mentions hors code :`, actives(ligne, /(^|[^\w])@[A-Za-z0-9][\w-]*/g));
}
const temoin = sansLienAutomatiqueGithub('Layer « Chevron » : aucune règle @icons ne le désigne. Ajoutez une règle @icons.');
console.log('[témoin github] mentions hors code :', actives(temoin, /(^|[^\w])@[A-Za-z0-9][\w-]*/g));

for (const brut of ['Calque « a\n/@bob »', 'Calque « a\n/#12 »']) {
  const sortie = sansLienAutomatiqueGitlab(brut);
  console.log('[gitlab] ', JSON.stringify(brut), '->', JSON.stringify(sortie),
    '| hors code :', actives(sortie, /@[A-Za-z0-9][\w-]*|#\d+/g));
}
```

Sortie observée :

```text
[github] mentions hors code : [ ' @icons', ' @icons' ]
[gitlab] mentions hors code : [ ' @icons', ' @icons' ]
[témoin github] mentions hors code : []
[gitlab]  "Calque « a\n/@bob »" -> "Calque « a\n`/`@bob`` »" | hors code : [ '@bob' ]
[gitlab]  "Calque « a\n/#12 »" -> "Calque « a\n`/`#12`` »" | hors code : [ '#12' ]
```

- **Garde-fou** : `gitlab.test.ts` ne vérifie que du code déjà bien formé et
  `/close` suivi d'une espace ; aucun test ne relit le résultat sous la règle
  des code spans.
- **Famille** : la neutralisation du kit (`diagnostic-markdown.mjs`), hors
  périmètre, emploie le même procédé.
- **Piste de correction** : entourer la forme d'une suite d'accents graves plus
  longue que toute suite présente dans le texte, et traiter l'action rapide
  avant les formes.

#### [BASSE] Des références GitLab restent actives : raccourci de namespace et formes croisées `$`, `~`, `%`, `&`

- **Où** : `packages/plugin/src/forges/gitlab.ts:25-34`. La forme croisée ne
  couvre que `#` et `!` ; les formes courtes exigent un caractère hors mot à
  gauche. Paquet plugin.
- **Invariant violé** : « en plus `!123`, `~label`, `%jalon`, `$123`, `&123`, la
  référence croisée et une ligne qui commence par `/` sur GitLab »
  ([AGENTS.md](../../../AGENTS.md#diagnostics)).
- **Verdict** : `PLAUSIBLE`. La documentation GitLab Markdown liste
  `project!123`, `project#123`, `project$123`, `namespace/project~123`,
  `namespace/project%123` et `group/subgroup&123`. Le lien n'existe que si le
  projet visé existe ; sur `!`, `#` et `&`, GitLab ajoute une note « mentioned
  in » sur la cible.
- **Scénario** : un calque nommé `Onglet design-system!3` dans un groupe qui
  contient un projet `design-system`. La ligne est publiée telle quelle.
  Attendu : la forme en `code`.
- **Reproduction** : `.chasse-n/forges/reference-abregee.ts`, lancé par
  `npx tsx`.

```ts
import { corpsDeLaDemande } from '../../packages/plugin/src/depot';
import { forgeGitlab, sansLienAutomatiqueGitlab } from '../../packages/plugin/src/forges/gitlab';

const formes = ['design-system!3', 'design-system#12', 'design-system$4', 'groupe/ds$4', 'groupe/ds~5', 'groupe/ds%6', 'groupe/sous&7'];
for (const f of formes) {
  const sortie = sansLienAutomatiqueGitlab(`Calque « ${f} » : x.`);
  console.log(JSON.stringify(f).padEnd(22), '->', JSON.stringify(sortie), sortie.includes('`') ? 'neutralisé' : 'ACTIF');
}
const forge = forgeGitlab({ projet: 'groupe/ds', baseBranch: 'main', jeton: 't' });
const corps = corpsDeLaDemande('a/A/A.contract.json', {
  kind: 'component', filename: 'A.contract.json', content: '{}',
  warnings: ['Layer « Onglet design-system!3 » : il ne contient qu\'un dessin. Ajoutez une règle, puis réexportez.'],
}, forge);
console.log(corps.split('\n').find((l) => l.startsWith('- ')));
```

Sortie observée :

```text
"design-system!3"      -> "Calque « design-system!3 » : x." ACTIF
"design-system#12"     -> "Calque « design-system#12 » : x." ACTIF
"design-system$4"      -> "Calque « design-system$4 » : x." ACTIF
"groupe/ds$4"          -> "Calque « groupe/ds$4 » : x." ACTIF
"groupe/ds~5"          -> "Calque « groupe/ds~5 » : x." ACTIF
"groupe/ds%6"          -> "Calque « groupe/ds%6 » : x." ACTIF
"groupe/sous&7"        -> "Calque « groupe/sous&7 » : x." ACTIF
- Layer « Onglet design-system!3 » : il ne contient qu'un dessin. Ajoutez une règle, puis réexportez.
```

- **Garde-fou** : `gitlab.test.ts` couvre `a/b#6` et `g/s/p!7`, et fige `v1!2`
  comme inerte, ce qui ne vaut que sans projet `v1` dans le namespace.
- **Famille** : `ee15ba7`, qui a introduit la neutralisation GitLab. SPEC.md
  n'énumère que `groupe/projet#123` et `groupe/projet!123` en référence croisée.
- **Piste de correction** : suivre la liste des références de la documentation
  GitLab, raccourci de namespace compris.

## 4. Pistes réfutées

| Piste | Raison |
|---|---|
| `ucm check --base` perd les notices quand la racine UCM est un sous-dossier `app/` du dépôt git | Le plugin lit `ucm.config.json` à la racine du dépôt, `ucm init` écrit la CI à la racine, et GitHub comme GitLab n'exécutent pas une CI rangée dans `app/`. Le cas exige une CI écrite à la main. |
| Une adresse d'échantillon morte ne devrait pas refuser la fusion | Le refus est voulu et écrit : en-tête de `validation-echantillons.mjs`, tests « le graphe refuse un args que la dépendance ne publie pas », et `ROADMAP.md` qui range les adresses d'échantillon parmi les contrôles du consommateur. La phrase d'AGENTS.md vise la structure normative et les avertissements de l'export. La tension entre ces textes reste à trancher par le mainteneur ; le titre et le geste faux sont un constat en section 3. |
| `etatDuFormatDeTokens` mal classé sur `null`, tableau, `-0`, `0`, `"2"`, `1e300`, `__proto__` | Chaque cas rend l'état documenté : `invalide`, `future`, ou `origine` pour une marque héritée du prototype. |
| `verdictDeVersion` sur `"013.0"`, `"13.00"`, un nombre, une chaîne vide | Une version illisible est traitée comme ancienne, ce que le module écrit ; `"013.0"` se lit `13.0`. |
| `estCheminDuRepository` et `%2e%2e`, `...`, `.git/hooks` | `encodeURIComponent` encode `%` sur les deux forges ; `...` est un nom de dossier ; la forge refuse d'écrire sous `.git`. |
| `validateSettings` envoie un jeton vers l'autre forge | L'hôte seul décide de la forge, un préfixe de l'autre forge est refusé, un jeton hérité appartient à GitHub, et `saveSettings` retire l'ancien jeton avant d'écrire la forge, le jeton puis l'URL. Une sauvegarde interrompue laisse un jeton qui porte sa forge. |
| `tokens css` : référence non résolue, alias aplati, collision, `NaN`, `display-p3`, `cubicBezier`, nom de mode ou attribut `modes` injecté, `--out` sur une entrée | Refusés en code 1 ou 2, échappés par `chaineCss`, ou valides dans Chromium ; mille documents aléatoires comparés à `valeurDansLeContexte` sans écart. |
| Forges : jeton vers l'autre hôte, chemin hors du repository, BOM, CRLF, `exportedAt`, fourche GitHub, action rapide dans le titre | Chaque adaptateur n'appelle que son hôte ; `estCheminDuRepository` et l'encodage ferment le chemin ; `sameContent` normalise ; le titre n'exécute rien et un avertissement commence par `- `. |
| La fenêtre de versions de contrat est une plage : `"12.5"`, `"13.00"` et `"013.0"` rendent `ok` | Voulu et écrit : COMPATIBILITE.md dit que `VERSION_CONTRAT_MINIMALE` et `VERSION_CONTRAT_MAXIMALE` « portent la plage que les lecteurs acceptent », et `version-contrat.test.mjs` garde une plage ouverte pendant une migration. La règle « énumérée » vise le format de tokens. Aucun producteur n'écrit ces graphies. |
| Kit : valeurs neutres écrites, `inset` en flux, `textOverflow` sans `lineClamp`, doublons de catalogue acceptés | Ce sont des lois du producteur (`lois.ts`) ; AGENTS.md ne promet pas leur refus côté lecteur. |
| `init --tokens design` écrit un dossier alors que `tokens` est un fichier | `init` écrit `design/tokens.json`, comme l'aide et le README l'annoncent. |
| Injection YAML ou shell par `--components`, `--tokens`, `--implementation`, le remote ou la branche | Aucune de ces valeurs n'entre dans un gabarit ; la configuration passe par `JSON.stringify` après `estCheminDuRepository`. |
| Références GitHub `owner/repo#12` et `GH-12` | SPEC.md limite GitHub à `@nom` et `#123`, limite écrite. |

## 5. Couverture et angles morts
