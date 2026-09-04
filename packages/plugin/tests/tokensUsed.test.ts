/**
 * `tokensUsed` ne cite que des tokens que le contrat emploie réellement.
 *
 * L'index se dérive du contrat terminé. Le relever pendant l'extraction y
 * faisait entrer les tokens que le moteur lit pour DÉCIDER puis écarte : le
 * consommateur les voyait alors comme des références citées nulle part, et
 * refusait la fusion en désignant un défaut de l'exporteur — alors que le geste
 * correctif appartient au designer et que l'export l'avait déjà signalé.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructure } from '../src/contract/extractStructure';
import { extractVariantTokens } from '../src/contract/extractVariantTokens';
import { mergeIconRules } from '../src/contract/mergeIconRules';
import { collectTokenReferences } from '../src/variables';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    (candidate ? tokens[candidate.id] ?? null : null),
});

function node(type: string, name: string, children: any[] = [], extra: any = {}): any {
  const self: any = {
    type, id: `${name}-${Math.random()}`, name, visible: true, boundVariables: {}, children, ...extra,
  };
  self.findAll = (predicate: (candidate: any) => boolean) => {
    const found: any[] = [];
    const walk = (nodes: any[]) => {
      for (const child of nodes) {
        if (predicate(child)) found.push(child);
        walk(child.children ?? []);
      }
    };
    walk(children);
    return found;
  };
  return self;
}

test('une taille d’icône lue sur toute la matrice puis écartée n’entre pas dans l’index', async () => {
  const variante = (nom: string, tailleId: string) => node('COMPONENT', nom, [
    node('VECTOR', 'star', [], { boundVariables: { width: alias(tailleId), height: alias(tailleId) } }),
    node('TEXT', 'Message'),
  ], { layoutMode: 'HORIZONTAL', boundVariables: { itemSpacing: alias('gap') } });

  const info = variante('Severity=Info', 'base');
  const success = variante('Severity=Success', 'grande');

  const { structure, iconLayers } = await extractStructure(
    {
      axes: ['severity'],
      variants: [
        { values: { severity: 'info' }, component: info },
        { values: { severity: 'success' }, component: success },
      ],
    },
    [],
    null,
    info,
    resolverFor({
      gap: 'components.alert.sizes.gap',
      base: 'components.icons.sizes.base',
      grande: 'components.icons.sizes.lg',
    }),
    new Map(),
    ['star'],
  );
  const icons = mergeIconRules({}, iconLayers, [{ iconName: 'star', policy: 'strict' }], []);

  // La taille n'est pas uniforme : le contrat n'en publie aucune sur l'icône.
  assert.equal(icons.star.size, undefined);

  const references = collectTokenReferences({ structure, icons });
  assert.ok(references.has('{components.icons.sizes.base}'), 'la taille du variant de référence est citée');
  assert.equal(
    references.has('{components.icons.sizes.lg}'),
    false,
    'la taille de l’autre variante n’est citée nulle part : elle ne doit pas entrer dans tokensUsed',
  );
});

test('un doublon d’axes garde toutes ses couleurs dans la vue exacte', async () => {
  const variante = (nom: string, valeur: string, couleurId: string) => ({
    type: 'COMPONENT',
    id: nom,
    name: nom,
    visible: true,
    variantProperties: { Color: valeur },
    boundVariables: { fills: [alias(couleurId)] },
    findAll: () => [],
  }) as unknown as ComponentNode;

  const warnings: string[] = [];
  const first = variante('Color=Primary', 'Primary', 'premiere');
  const second = variante('Color=primary', 'primary', 'seconde');
  const { variantTokens, tokensByComponent } = await extractVariantTokens(
    {
      axes: ['color'],
      variants: [
        { values: { color: 'primary' }, component: first },
        { values: { color: 'primary' }, component: second },
      ],
    },
    resolverFor({
      premiere: 'components.button.colors.primary.background',
      seconde: 'components.button.colors.secondary.background',
    }),
    warnings,
  );

  // Deux variantes se normalisent pareil : l'index interne garde la première,
  // mais il n'est pas sérialisé et les deux feuilles exactes restent
  // contractuelles sans demander un renommage au designer.
  assert.deepEqual(warnings, []);

  const references = collectTokenReferences(variantTokens);
  assert.equal(
    references.has('{components.button.colors.secondary.background}'),
    false,
    'l’index historique ne peut porter que la première coordonnée',
  );
  assert.deepEqual(tokensByComponent.get(second), {
    background: '{components.button.colors.secondary.background}',
  });
  assert.equal(
    collectTokenReferences(Array.from(tokensByComponent.values()))
      .has('{components.button.colors.secondary.background}'),
    true,
  );
});
