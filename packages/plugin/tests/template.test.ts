import assert from 'node:assert/strict';
import test from 'node:test';
import type { Contract } from '@ucm-kit/core/format';
import { extractRules } from '../src/contract/extractRules';
import { modeleDeRegles, nombreDeRegles } from '../src/template/modele';
import type { ModeleDeRegles } from '../src/template/modele';
import { offreDeCreation, resoudreLesSources } from '../src/template/sources';

type ContratLu = Pick<Contract, 'props' | 'stateModel'>;

/**
 * Une ligne par section : son tag, puis ses éléments. Une règle s'écrit par sa
 * cible, ou par son tag quand elle n'en a pas ; un séparateur s'écrit `|`.
 */
function resume(modele: ModeleDeRegles): string[] {
  return modele.sections.map((section) => `${section.tag} : ${section.elements
    .map((element) => (element.genre === 'separateur' ? '|' : element.cible ?? `@${element.tag}`))
    .join(' ')}`);
}

const contratDeRoot: ContratLu = {
  props: {
    tone: { type: 'enum', values: ['a', 'b'] },
    scale: { type: 'enum', values: ['s', 'm', 'l'] },
    mark: { type: 'boolean', default: false },
  },
};

test('le modèle pose une @usage, une @prop par valeur groupée par axe, une @boolean et une @icons', () => {
  const modele = modeleDeRegles('Root', contratDeRoot);

  assert.equal(modele.nom, 'Root');
  assert.deepEqual(resume(modele), [
    'usage : @usage',
    'prop : tone.a tone.b | scale.s scale.m scale.l',
    'boolean : mark',
    'icons : @icons',
  ]);
  assert.equal(nombreDeRegles(modele), 8);
});

test('un axe renommé par la couche sémantique écrit sa clé publiée, jamais son nom Figma', () => {
  const modele = modeleDeRegles('Root', {
    props: { size: { type: 'enum', values: ['small', 'medium'], figmaName: 'Scale' } },
  });

  assert.deepEqual(resume(modele)[1], 'prop : size.small size.medium');
});

test('l’axe d’états vient en dernier groupe, et son disabled ne donne aucune @boolean', () => {
  const modele = modeleDeRegles('Root', {
    props: {
      tone: { type: 'enum', values: ['a', 'b'] },
      disabled: { type: 'boolean', default: false },
      mark: { type: 'boolean', default: true },
    },
    stateModel: {
      axis: 'states',
      states: { default: {}, hover: { selector: ':hover' }, disable: { selector: '[disabled]' } },
      precedence: ['disable', 'hover', 'default'],
    },
  });

  assert.deepEqual(resume(modele), [
    'usage : @usage',
    'prop : tone.a tone.b | states.default states.hover states.disable',
    'boolean : mark',
    'icons : @icons',
  ]);
});

test('un booléen disabled sans axe d’états reste une @boolean', () => {
  const modele = modeleDeRegles('Root', { props: { disabled: { type: 'boolean', default: false } } });

  assert.deepEqual(resume(modele)[1], 'boolean : disabled');
});

test('un composant sans propriété donne les sections générale et icônes seules', () => {
  assert.deepEqual(resume(modeleDeRegles('Root', {})), ['usage : @usage', 'icons : @icons']);
});

test('TEXT, INSTANCE_SWAP, SLOT et icône runtime ne donnent aucune règle', () => {
  const modele = modeleDeRegles('Root', {
    props: {
      label: { type: 'string', default: 'Texte' },
      glyph: { type: 'instance-swap', default: '1:2' },
      content: { type: 'slot', default: true },
      leadName: { type: 'icon', policy: 'modifiable' },
    },
  });

  assert.deepEqual(resume(modele), ['usage : @usage', 'icons : @icons']);
  const tags = modele.sections.flatMap((section) => section.elements)
    .flatMap((element) => (element.genre === 'regle' ? [element.tag] : []));
  for (const absent of ['default', 'do', 'dont', 'pairs']) {
    assert.equal(tags.includes(absent as never), false, absent);
  }
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

/** Un node qui écrit un nom dans son calque « component-name ». */
function porteurDeNom(type: string, nomEcrit: string, nomDuNode = '.componentRules') {
  return noeud(type, nomDuNode, [
    noeud('TEXT', 'component-name', [], { characters: nomEcrit }),
  ]);
}

/**
 * Monte une page comme page courante, et la démonte à la sortie du test.
 *
 * Les deux appels que la recherche s'interdit lèvent : un module qui quitterait
 * la page active, ou irait chercher un maître par sa clé, fait rougir le test
 * qui l'emploie, quel qu'il soit.
 */
function monterPage(t: { after: (fn: () => void) => void }, enfants: any[]) {
  const precedent = (globalThis as { figma?: unknown }).figma;
  t.after(() => {
    (globalThis as { figma?: unknown }).figma = precedent;
  });
  const interdit = (appel: string) => () => {
    throw new Error(`${appel} est interdit ici`);
  };
  (globalThis as any).figma = {
    currentPage: noeud('PAGE', 'Composants', enfants),
    loadAllPagesAsync: interdit('loadAllPagesAsync'),
    importComponentByKeyAsync: interdit('importComponentByKeyAsync'),
  };
}

/** L'offre que la page rend pour un composant nommé « Root ». */
async function offreDeLaPage(t: Parameters<typeof monterPage>[0], enfants: any[]) {
  monterPage(t, enfants);
  const rules = await extractRules({ name: 'Root' } as ComponentSetNode);
  return offreDeCreation(rules.releve);
}

test('un conteneur qui écrit le nom du composant ne donne aucune offre', async (t) => {
  assert.equal(await offreDeLaPage(t, [porteurDeNom('INSTANCE', 'Root')]), null);
});

test('une instance dont le nom porte le marqueur se remplit plutôt que de se doubler', async (t) => {
  assert.equal(
    await offreDeLaPage(t, [porteurDeNom('INSTANCE', '[À compléter] Nom du composant')]),
    'remplir',
  );
});

test('une instance qui documente un autre composant sert de source à une création', async (t) => {
  assert.equal(await offreDeLaPage(t, [porteurDeNom('INSTANCE', 'Chip')]), 'creer');
});

test('le maître « .componentRules » de la page sert de source à une création', async (t) => {
  assert.equal(await offreDeLaPage(t, [porteurDeNom('COMPONENT', 'Chip', '.componentRules')]), 'creer');
});

test('une page sans aucun modèle à copier laisse le bouton sans source', async (t) => {
  assert.equal(await offreDeLaPage(t, [noeud('FRAME', 'Root')]), 'sans-source');
});

test('le maître prime, et le conteneur vierge prime sur les deux', async (t) => {
  // Une instance vierge est le geste du designer, qui l'a posée où il la
  // voulait : la remplir passe avant toute création ailleurs.
  const offre = await offreDeLaPage(t, [
    porteurDeNom('COMPONENT', 'Chip', '.componentRules'),
    porteurDeNom('INSTANCE', '[à compléter] Nom du composant', 'Collé ici'),
  ]);
  assert.equal(offre, 'remplir');
});

/** Une instance de règle qui écrit `texte` dans son calque « content ». */
function regleEcrite(texte: string) {
  return noeud('INSTANCE', 'Règle', [noeud('TEXT', 'content', [], { characters: texte })]);
}

test('un conteneur au nom marqué dont une règle est rédigée n’est pas vierge', async (t) => {
  // Le remplir détruirait ce que le designer y a écrit : le plugin en crée un
  // autre à côté du composant plutôt que d'écraser celui-là.
  const conteneur = porteurDeNom('INSTANCE', '[À compléter] Nom du composant');
  conteneur.children.push(regleEcrite('Action principale du formulaire.'));

  assert.equal(await offreDeLaPage(t, [conteneur]), 'creer');
});

test('un conteneur au nom marqué dont les règles portent toutes le marqueur est vierge', async (t) => {
  const conteneur = porteurDeNom('INSTANCE', '[À compléter] Nom du composant');
  conteneur.children.push(regleEcrite('[À compléter] Décrivez à quoi sert le composant.'));

  assert.equal(await offreDeLaPage(t, [conteneur]), 'remplir');
});

/** Les textes d'aide de 6.3, ceux que l'écriture ne remplit pas. */
const AIDES = {
  usage: { content: '[À compléter] Décrivez à quoi sert le composant.' },
  prop: {
    prop: '[À compléter] propriété.valeur',
    content: '[À compléter] Décrivez quand choisir cette valeur.',
  },
  boolean: {
    prop: '[À compléter] nom-de-la-propriété',
    content: '[À compléter] Décrivez ce que cette option affiche.',
  },
  icons: { icon: '[À compléter] Nom exact du calque d’icône' },
  default: {
    prop: '[À compléter] propriété.valeur',
    content: 'Écrivez dans prop la valeur par défaut.',
  },
};

/** Les calques d'une règle : celui qui affiche son tag, puis ses textes. */
function calquesDeRegle(tag: string, textes: Record<string, string>) {
  return [
    noeud('TEXT', `@${tag}`, [], { characters: `@${tag}` }),
    ...Object.entries(textes).map(([nom, texte]) => noeud('TEXT', nom, [], { characters: texte })),
  ];
}

/** Une instance, reliée au maître qu'elle copie. */
function instanceDe(maitre: any, nom: string, enfants: any[] = []) {
  return noeud('INSTANCE', nom, enfants, { getMainComponentAsync: async () => maitre });
}

/** Le component set « .ruleItem » : une variante par tag, plus le séparateur. */
function catalogueDeRegles(
  aides: Record<string, Record<string, string>> = AIDES,
  avecSeparateur = true,
) {
  const variantes = Object.entries(aides)
    .map(([tag, textes]) => noeud('COMPONENT', `Type=@${tag}`, calquesDeRegle(tag, textes)));
  if (avecSeparateur) variantes.push(noeud('COMPONENT', 'Type=divider'));
  const catalogue = noeud('COMPONENT_SET', '.ruleItem', variantes);
  for (const variante of variantes) variante.parent = catalogue;
  return catalogue;
}

/** La variante d'un tag dans un catalogue. */
function varianteDe(catalogue: any, tag: string) {
  return catalogue.children.find((variante: any) => variante.name === `Type=@${tag}`);
}

/**
 * Le maître « .componentRules » et ses exemples, rangés par section.
 *
 * Un exemple ne porte que le calque de son tag : les textes d'aide vivent sur
 * la variante, et c'est là que la vérification doit les lire.
 */
function maitreDeRegles(catalogue: any, sections: Record<string, string[]>) {
  const catalogueDeSections = noeud('COMPONENT_SET', '.rulesSection', []);
  const exemples = Object.entries(sections).map(([nom, tags]) => {
    const maitreDeSection = noeud('COMPONENT', `Section=${nom}`);
    maitreDeSection.parent = catalogueDeSections;
    catalogueDeSections.children.push(maitreDeSection);
    return instanceDe(maitreDeSection, '.rulesSection', tags.map((tag) => instanceDe(
      varianteDe(catalogue, tag),
      '.ruleItem',
      [noeud('TEXT', `@${tag}`, [], { characters: `@${tag}` })],
    )));
  });
  return noeud('COMPONENT', '.componentRules', [
    noeud('TEXT', 'component-name', [], { characters: '[À compléter] Nom du composant' }),
    ...exemples,
  ]);
}

/** Les sections du maître mesuré en 3.1, réduites aux tags que le modèle pose. */
const SECTIONS = {
  general: ['usage', 'default'],
  props: ['prop'],
  options: ['boolean'],
  icons: ['icons'],
};

/** Les sources que la page rend pour un composant nommé « Root ». */
async function sourcesDeLaPage(t: Parameters<typeof monterPage>[0], enfants: any[]) {
  monterPage(t, enfants);
  const rules = await extractRules({ name: 'Root' } as ComponentSetNode);
  return resoudreLesSources(rules.releve);
}

/** Les noms des maîtres d'une table de résolution, tag par tag. */
function nomsResolus(table: Map<string, { name: string }> | undefined) {
  return [...(table ?? new Map())].map(([tag, maitre]) => [tag, maitre.name]);
}

test('les maîtres des sections et des règles se lisent sur les exemples du maître', async (t) => {
  const catalogue = catalogueDeRegles();
  const maitre = maitreDeRegles(catalogue, SECTIONS);

  const { sources, refus } = await sourcesDeLaPage(t, [maitre]);

  assert.equal(refus, null);
  assert.equal(sources?.maitre, maitre);
  assert.deepEqual(nomsResolus(sources?.regles as never), [
    ['usage', 'Type=@usage'],
    ['default', 'Type=@default'],
    ['prop', 'Type=@prop'],
    ['boolean', 'Type=@boolean'],
    ['icons', 'Type=@icons'],
  ]);
  assert.deepEqual(nomsResolus(sources?.sections as never), [
    ['usage', 'Section=general'],
    ['default', 'Section=general'],
    ['prop', 'Section=props'],
    ['boolean', 'Section=options'],
    ['icons', 'Section=icons'],
  ]);
});

test('le séparateur est la variante du catalogue qui ne porte aucun calque texte', async (t) => {
  const { sources } = await sourcesDeLaPage(t, [maitreDeRegles(catalogueDeRegles(), SECTIONS)]);

  assert.equal(sources?.separateur?.name, 'Type=divider');
});

test('un catalogue sans variante muette ne donne aucun séparateur', async (t) => {
  // Le template pose alors ses règles à la suite : un groupe de moins se voit,
  // tandis qu'un conteneur refusé ne se rédige pas.
  const catalogue = catalogueDeRegles(AIDES, false);

  const { sources, refus } = await sourcesDeLaPage(t, [maitreDeRegles(catalogue, SECTIONS)]);

  assert.equal(refus, null);
  assert.equal(sources?.separateur, null);
});

test('sans maître sur la page, les exemples se lisent sur celui d’une instance', async (t) => {
  // L'instance documente un autre composant : elle n'est ni lue ni modifiée,
  // elle ne sert qu'à remonter au maître, qui vit sur la page des règles.
  const maitre = maitreDeRegles(catalogueDeRegles(), SECTIONS);
  const instance = instanceDe(maitre, '.componentRules', [
    noeud('TEXT', 'component-name', [], { characters: 'Chip' }),
  ]);

  const { sources, refus } = await sourcesDeLaPage(t, [instance]);

  assert.equal(refus, null);
  assert.equal(sources?.maitre, maitre);
  assert.equal(sources?.regles.get('usage')?.name, 'Type=@usage');
});

test('l’instance vierge à remplir accompagne les maîtres résolus', async (t) => {
  const maitre = maitreDeRegles(catalogueDeRegles(), SECTIONS);
  const vierge = porteurDeNom('INSTANCE', '[À compléter] Nom du composant', 'Collé ici');

  const { sources } = await sourcesDeLaPage(t, [maitre, vierge]);

  assert.equal(sources?.aRemplir, vierge);
});

test('un content d’aide sans marqueur refuse la création', async (t) => {
  // Sans ce refus, le texte d'aide du maître partirait dans le contrat comme
  // la documentation du composant.
  const catalogue = catalogueDeRegles({
    ...AIDES,
    prop: {
      prop: '[À compléter] propriété.valeur',
      content: 'Décrivez quand choisir cette valeur.',
    },
  });

  const { sources, refus } = await sourcesDeLaPage(t, [maitreDeRegles(catalogue, SECTIONS)]);

  assert.equal(sources, null);
  assert.equal(
    refus,
    'Les textes d’aide de « .ruleItem » ne commencent pas par « [À compléter] ». '
      + 'Ajoutez-le dans le composant « .ruleItem », puis recommencez.',
  );
});

test('l’icon d’aide de @icons est vérifié, et son content ne l’est pas', async (t) => {
  // `@icons` ne lit aucun `content` : exiger le marqueur sur un calque que le
  // moteur ignore refuserait un maître correct.
  const sansMarqueur = catalogueDeRegles({
    ...AIDES,
    icons: { icon: 'Nom exact du calque d’icône', content: 'Texte libre' },
  });

  const { refus } = await sourcesDeLaPage(t, [maitreDeRegles(sansMarqueur, SECTIONS)]);
  assert.match(refus ?? '', /textes d’aide/);

  const correct = catalogueDeRegles({
    ...AIDES,
    icons: { icon: '[À compléter] Nom exact du calque d’icône', content: 'Texte libre' },
  });
  const { refus: aucun } = await sourcesDeLaPage(t, [maitreDeRegles(correct, SECTIONS)]);
  assert.equal(aucun, null);
});

test('un maître sans exemple de règle refuse la création', async (t) => {
  const { sources, refus } = await sourcesDeLaPage(t, [maitreDeRegles(catalogueDeRegles(), {})]);

  assert.equal(sources, null);
  assert.match(refus ?? '', /aucun exemple de règle/);
});

test('une page qui ne porte aucune source refuse la création', async (t) => {
  const { sources, refus } = await sourcesDeLaPage(t, [noeud('FRAME', 'Root')]);

  assert.equal(sources, null);
  assert.match(refus ?? '', /introuvable/);
});

/** Une règle posée par le template : son tag, ses textes, son maître. */
function reglePosee(catalogue: any, tag: string, textes: Record<string, string>) {
  return instanceDe(varianteDe(catalogue, tag), '.ruleItem', calquesDeRegle(tag, textes));
}

/**
 * Le conteneur tel que l'écriture le laissera : le nom du composant écrit, une
 * instance par élément du modèle, et les textes d'aide du maître hérités.
 */
function poserLeModele(modele: ModeleDeRegles, catalogue: any) {
  const aides = AIDES as Record<string, Record<string, string>>;
  const regles = modele.sections.flatMap((section) => section.elements.map((element) => (
    element.genre === 'separateur'
      ? instanceDe(catalogue.children.at(-1), '.ruleItem', [])
      : reglePosee(catalogue, element.tag, {
        ...aides[element.tag],
        ...(element.cible ? { prop: element.cible } : {}),
      })
  )));
  return noeud('INSTANCE', '.componentRules', [
    noeud('TEXT', 'component-name', [], { characters: modele.nom }),
    ...regles,
  ]);
}

test('un conteneur fraîchement posé se relit en avertissements du marqueur, et rien d’autre', async (t) => {
  const conteneur = poserLeModele(modeleDeRegles('Root', contratDeRoot), catalogueDeRegles());
  monterPage(t, [conteneur]);

  const rules = await extractRules({ name: 'Root' } as ComponentSetNode);

  assert.equal(rules.sectionFound, true);
  assert.equal(rules.intent, null);
  assert.deepEqual(rules.propDescriptions, {});
  assert.deepEqual(rules.booleanDescriptions, {});
  assert.deepEqual(rules.iconRules, []);

  const marques = rules.warnings.filter((message) => message.includes('[À compléter]'));
  assert.deepEqual(marques.map((message) => message.slice(0, message.indexOf(' contien'))), [
    'Layer « .ruleItem » : une règle @usage',
    'Layer « .ruleItem » : 5 règles @prop',
    'Layer « .ruleItem » : une règle @boolean',
    'Layer « .ruleItem » : une règle @icons',
  ]);
  // Le séparateur n'écrit rien : il traverse la lecture sans un mot. Le
  // conteneur n'est pas vide non plus, et l'absence d'intention se dit
  // ailleurs, à l'export du composant.
  const autres = rules.warnings.filter((message) => !message.includes('[À compléter]'));
  assert.deepEqual(autres, []);
});
