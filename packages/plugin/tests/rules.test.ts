import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRules,
  compactName,
  extractRules,
  hasUsableRules,
  iconPolicyFromVisibility,
  ruleTagFromValue,
  rulesContainerOwner,
} from '../src/contract/extractRules';
import { indexContractedNames } from '../src/contract/composedComponents';

test('ruleTagFromValue reconnaît @boolean comme les autres variantes de règle', () => {
  assert.equal(ruleTagFromValue('@boolean'), 'boolean');
  assert.equal(ruleTagFromValue('BOOLEAN'), 'boolean');
  assert.equal(ruleTagFromValue('@inconnu'), null);
});

test('buildRules assemble usage / do (répétable) / dont / pairs', () => {
  const { intent, warnings } = buildRules([
    { tag: 'usage', content: 'Action principale' },
    { tag: 'do', content: 'Utiliser un verbe' },
    { tag: 'do', content: 'Être concis' },
    { tag: 'dont', content: 'Empiler' },
    { tag: 'pairs', content: 'Dialog, Form' },
  ]);

  assert.deepEqual(intent, {
    usage: 'Action principale',
    do: ['Utiliser un verbe', 'Être concis'],
    dont: ['Empiler'],
    pairs: ['Dialog', 'Form'],
  });
  assert.equal(warnings.length, 0);
});

test('buildRules range @prop dans propDescriptions (prop et valeur normalisées)', () => {
  const { propDescriptions } = buildRules([
    { tag: 'prop', prop: 'variant.contained', content: 'Action la plus importante' },
    { tag: 'prop', prop: 'Size.Big', content: 'CTA custom' },
  ]);

  assert.deepEqual(propDescriptions, {
    variant: { contained: 'Action la plus importante' },
    size: { big: 'CTA custom' },
  });
});

test('buildRules garde la première @prop d’une valeur et signale le doublon', () => {
  const { propDescriptions, warnings } = buildRules([
    { tag: 'prop', prop: 'variant.contained', content: 'Première description' },
    { tag: 'prop', prop: 'Variant.Contained', content: 'Seconde description' },
  ]);

  // Deux règles Figma décrivant la même valeur se contredisent : c'est au
  // designer de trancher, jamais à l'export d'écraser en silence.
  assert.deepEqual(propDescriptions, { variant: { contained: 'Première description' } });
  assert.deepEqual(warnings, [
    'Règle @prop « variant.contained » : elle apparaît deux fois. Seule la première est exportée. Supprimez la seconde, puis réexportez.',
  ]);
});

test('buildRules range @boolean par nom de prop normalisé', () => {
  const result = buildRules([
    { tag: 'boolean', prop: 'icon-left', content: 'Affiche l’icône de gauche.' },
    { tag: 'boolean', prop: 'Label', content: 'Affiche le libellé.' },
  ]);

  assert.deepEqual(result.booleanDescriptions, {
    iconLeft: 'Affiche l’icône de gauche.',
    label: 'Affiche le libellé.',
  });
  assert.deepEqual(result.warnings, []);
  assert.equal(hasUsableRules(result), true);
});

test('buildRules garde la première @boolean et signale cible absente et doublon', () => {
  const { booleanDescriptions, warnings } = buildRules([
    { tag: 'boolean', prop: 'icon-left', content: 'Première description' },
    { tag: 'boolean', prop: 'Icon Left', content: 'Seconde description' },
    { tag: 'boolean', prop: ' ', content: 'Sans cible' },
  ]);

  assert.deepEqual(booleanDescriptions, { iconLeft: 'Première description' });
  assert.deepEqual(warnings, [
    'Règle @boolean « iconLeft » : elle apparaît deux fois. Seule la première est exportée. Supprimez la seconde, puis réexportez.',
    'Règle @boolean : le layer « prop » est vide. La règle n’est pas exportée. Écrivez-y le nom de la boolean property du composant, par exemple « icon-left », puis réexportez.',
  ]);
});

test('buildRules garde le premier @usage et avertit sur les suivants', () => {
  const { intent, warnings } = buildRules([
    { tag: 'usage', content: 'Premier' },
    { tag: 'usage', content: 'Second' },
  ]);

  assert.equal(intent?.usage, 'Premier');
  assert.equal(warnings.length, 1);
});

test('buildRules avertit sur @prop mal formée et contenu vide', () => {
  const { intent, warnings } = buildRules([
    { tag: 'prop', prop: 'variant', content: 'Sans point séparateur' },
    { tag: 'usage', content: '   ' },
  ]);

  assert.equal(intent, null);
  assert.equal(warnings.length, 2);
});

test('buildRules sans entrée exploitable → intent null', () => {
  assert.equal(buildRules([]).intent, null);
});

test('buildRules interprète les politiques @icons', () => {
  const result = buildRules([
    { tag: 'icons', content: '', iconName: 'arrow-left-long', iconPolicy: 'modifiable' },
    { tag: 'icons', content: '', iconName: 'fa-warning', iconPolicy: 'strict' },
  ]);

  assert.deepEqual(result.iconRules, [
    { iconName: 'arrow-left-long', policy: 'modifiable' },
    { iconName: 'fa-warning', policy: 'strict' },
  ]);
});

test('buildRules avertit quand une règle @icons n a pas de politique visible', () => {
  const result = buildRules([{ tag: 'icons', content: '', iconName: 'fa-warning' }]);

  assert.deepEqual(result.iconRules, []);
  assert.deepEqual(result.warnings, [
    'Règle @icons « fa-warning » : aucune politique n’est choisie. La règle n’est pas exportée, et l’icône ne sera pas décrite. Rendez visible exactement un des deux layers « modifiable » ou « strict », puis réexportez.',
  ]);
});

test('iconPolicyFromVisibility exige une visibilité exclusive', () => {
  assert.equal(iconPolicyFromVisibility(true, false), 'modifiable');
  assert.equal(iconPolicyFromVisibility(false, true), 'strict');
  assert.equal(iconPolicyFromVisibility(true, true), undefined);
  assert.equal(iconPolicyFromVisibility(false, false), undefined);
  assert.equal(iconPolicyFromVisibility(null, false), undefined);
});

/** Un faux node dont la descendance se parcourt comme dans Figma. */
function noeud(
  type: string,
  name: string,
  enfants: any[] = [],
  extra: Record<string, unknown> = {},
): any {
  const self: any = { type, name, id: `${type}:${name}`, children: enfants, ...extra };
  const descendants = (n: any): any[] =>
    (n.children ?? []).flatMap((enfant: any) => [enfant, ...descendants(enfant)]);
  self.findAll = (predicat?: (n: any) => boolean) =>
    descendants(self).filter((n) => !predicat || predicat(n));
  self.findOne = (predicat: (n: any) => boolean) => descendants(self).find(predicat) ?? null;
  return self;
}

/** Un conteneur de règles : une instance dont un calque écrit le nom documenté. */
function conteneur(nomEcrit: string, regles: any[] = [], nomDeLInstance = '.componentRules') {
  return noeud('INSTANCE', nomDeLInstance, [
    noeud('FRAME', 'component-name-wrap', [
      noeud('TEXT', 'component-name', [], { characters: nomEcrit }),
    ]),
    ...regles,
  ]);
}

/**
 * Une règle telle que Figma la porte : une instance de `.rulesItems` dont un
 * calque nomme le tag. `variante` dit ce que la valeur de variante range, et
 * vaut par défaut le tag lui-même.
 */
function regle(tagAffiche: string, calques: any[] = [], variante = tagAffiche) {
  return noeud('INSTANCE', 'Règle', [
    noeud('FRAME', 'rule-ids', [noeud('TEXT', tagAffiche, [], { characters: tagAffiche })]),
    ...calques,
  ], {
    variantProperties: { Type: variante },
    getMainComponentAsync: async () => ({
      name: `Type=${variante}`,
      parent: { type: 'COMPONENT_SET', name: '.rulesItems' },
    }),
  });
}

/** Monte une page comme page courante, et la démonte à la sortie du test. */
function monterPage(t: { after: (fn: () => void) => void }, enfants: any[]) {
  const page = noeud('PAGE', 'Composants', enfants);
  const precedent = (globalThis as { figma?: unknown }).figma;
  t.after(() => {
    (globalThis as { figma?: unknown }).figma = precedent;
  });
  (globalThis as any).figma = { currentPage: page };
  return page;
}

test('le conteneur est reconnu par son calque, pas par son nom, à la casse près', async (t) => {
  // Le Component Set s'appelle « Icon Button », et le conteneur est renommé.
  // Les deux lectures doivent conclure la même chose : un composant reconnu
  // comme dépendance unifiée par ses parents doit rester exportable lui-même.
  const container = conteneur(' icon button ', [
    regle('@usage', [noeud('TEXT', 'content', [], { characters: 'Action principale' })]),
  ], 'Règles du bouton');
  const page = monterPage(t, [container]);

  const componentSet = { name: 'Icon Button' } as ComponentSetNode;
  const rules = await extractRules(componentSet);

  assert.equal(rules.sectionFound, true);
  assert.equal(rules.intent?.usage, 'Action principale');
  assert.equal(rulesContainerOwner(container), compactName(componentSet.name));
  assert.deepEqual([...indexContractedNames(page as unknown as PageNode)], ['iconbutton']);
});

test('rulesContainerOwner ignore ce qui n’est pas un conteneur', () => {
  // Le composant maître porte le même calque, pré-rempli avec le composant qui
  // a servi de modèle : sans la borne sur le type, il revendiquerait ses règles.
  const maitre = conteneur('Button');
  assert.equal(rulesContainerOwner({ ...maitre, type: 'COMPONENT' }), null);
  assert.equal(rulesContainerOwner(noeud('FRAME', 'Button')), null);
  assert.equal(rulesContainerOwner(noeud('INSTANCE', 'Bouton')), null);
  assert.equal(rulesContainerOwner(conteneur('   ')), null);
});

test('un conteneur au calque vide ne documente personne, et le constat le situe', async (t) => {
  const orphelin = conteneur('', [
    regle('@usage', [noeud('TEXT', 'content', [], { characters: 'Action principale' })]),
  ]);
  monterPage(t, [orphelin]);

  const rules = await extractRules({ name: 'Button' } as ComponentSetNode);

  assert.equal(rules.sectionFound, false);
  assert.deepEqual(rules.warnings, [
    'Layer « .componentRules » : son calque « component-name » est vide, donc il ne documente '
    + 'aucun composant. Le contrat dira comment utiliser le composant, mais pas quand : ni '
    + 'intention, ni documentation de props, ni règle d’icône. Écrivez « Button » dans ce '
    + 'calque, puis réexportez.',
  ]);
});

test('un @default est lu alors que Figma a rangé son variant sous « Type8 »', async (t) => {
  // Le cas est dans le fichier de référence : ajouter un variant l'auto-nomme
  // « TypeN » sans toucher au tag qu'il affiche. Le calque affiché tranche, et
  // un témoin muet ne contredit rien : aucun avertissement ne part.
  monterPage(t, [conteneur('Button', [
    regle('@default', [noeud('TEXT', 'prop', [], { characters: 'color.secondary' })], 'Type8'),
  ])]);

  const rules = await extractRules({ name: 'Button' } as ComponentSetNode);

  assert.deepEqual(rules.enumDefaults, { color: 'secondary' });
  assert.deepEqual(rules.warnings, []);
});

test('deux témoins qui nomment chacun un tag se contredisent, et le calque l’emporte', async (t) => {
  monterPage(t, [conteneur('Button', [
    regle('@dont', [noeud('TEXT', 'content', [], { characters: 'Empiler' })], '@do'),
  ])]);

  const rules = await extractRules({ name: 'Button' } as ComponentSetNode);

  assert.deepEqual(rules.intent?.dont, ['Empiler']);
  assert.deepEqual(rules.intent?.do, []);
  assert.deepEqual(rules.warnings, [
    'Layer « Règle » : elle affiche « @dont » alors que son variant la range en « @do ». '
    + 'Le tag affiché est exporté, et la règle ne remplira pas le champ que son variant '
    + 'annonce. Choisissez le variant qui porte le tag affiché, puis réexportez.',
  ]);
});

test('le calque « prop » n’est pas lu comme le tag @prop', async (t) => {
  // Le « @ » est ce qui sépare le calque du tag de celui de la cible : sans lui,
  // une règle sans tag emprunterait celui de sa propre cible.
  const sansTag = noeud('INSTANCE', 'Règle', [
    noeud('FRAME', 'rule-ids', [noeud('TEXT', 'prop', [], { characters: 'variant.contained' })]),
    noeud('TEXT', 'content', [], { characters: 'Action la plus importante' }),
  ], {
    variantProperties: {},
    getMainComponentAsync: async () => ({
      name: 'Type=?',
      parent: { type: 'COMPONENT_SET', name: '.rulesItems' },
    }),
  });
  monterPage(t, [conteneur('Button', [sansTag])]);

  const rules = await extractRules({ name: 'Button' } as ComponentSetNode);

  assert.deepEqual(rules.propDescriptions, {});
  assert.deepEqual(rules.warnings, [
    'Une règle de « .componentRules » : aucun de ses calques ne porte de tag (@usage, @do, '
    + '@dont, @pairs, @prop, @boolean, @icons, @default). Elle est ignorée, et sa '
    + 'documentation manquera au contrat. Choisissez son variant dans Figma, puis réexportez.',
    // La seule règle du conteneur ayant été écartée, il n'en reste aucune :
    // le second constat porte sur le conteneur, et non sur cette règle.
    'Layer « .componentRules » : il ne contient aucune instance de « .rulesItems » lisible. '
    + 'Aucune règle d’usage n’enrichira le contrat. Ajoutez-y au moins une règle, puis '
    + 'réexportez.',
  ]);
});

test('une règle @prop homonyme d’Object.prototype n’écrit pas sur le runtime', () => {
  const { propDescriptions, warnings } = buildRules([
    { tag: 'prop', content: 'Bouton plein', prop: 'constructor.contained' },
  ]);

  // Le layer « prop » est le seul canal de texte libre de tout l'export.
  // `descriptions[nom][valeur] = …` lisait `Object` pour ce nom, le trouvait
  // déjà rempli, puis écrivait la description sur la fonction Object globale.
  assert.equal(
    (Object as unknown as Record<string, unknown>).contained,
    undefined,
    'la fonction Object globale ne doit pas être modifiée',
  );
  assert.deepEqual(Object.keys(propDescriptions), ['constructor']);
  assert.deepEqual(propDescriptions.constructor, { contained: 'Bouton plein' });
  assert.deepEqual(warnings, []);
});

test('ruleTagFromValue reconnaît @default', () => {
  assert.equal(ruleTagFromValue('@default'), 'default');
  assert.equal(ruleTagFromValue('DEFAULT'), 'default');
});

test('buildRules range @default par prop, sans exiger de content', () => {
  const { enumDefaults, warnings } = buildRules([
    { tag: 'default', prop: 'Color.Secondary', content: '' },
  ]);

  assert.deepEqual(enumDefaults, { color: 'secondary' });
  assert.deepEqual(warnings, []);
});

test('buildRules garde le premier @default d’une prop et signale le doublon', () => {
  const { enumDefaults, warnings } = buildRules([
    { tag: 'default', prop: 'color.secondary', content: '' },
    { tag: 'default', prop: 'color.primary', content: '' },
  ]);

  assert.deepEqual(enumDefaults, { color: 'secondary' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /deux fois/);
});

test('un @default sans cible lisible nomme la forme attendue', () => {
  const { enumDefaults, warnings } = buildRules([{ tag: 'default', prop: 'color', content: '' }]);

  assert.deepEqual(enumDefaults, {});
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /propriété.valeur/);
});
