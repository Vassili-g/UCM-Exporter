import assert from 'node:assert/strict';
import test from 'node:test';
import type { Contract } from '@ucm-kit/core/format';
import { extractRules } from '../src/contract/extractRules';
import { modeleDeRegles, nombreDeRegles } from '../src/template/modele';
import type { ModeleDeRegles } from '../src/template/modele';
import { offreDeCreation } from '../src/template/sources';

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

/** Monte une page comme page courante, et la démonte à la sortie du test. */
function monterPage(t: { after: (fn: () => void) => void }, enfants: any[]) {
  const precedent = (globalThis as { figma?: unknown }).figma;
  t.after(() => {
    (globalThis as { figma?: unknown }).figma = precedent;
  });
  (globalThis as any).figma = { currentPage: noeud('PAGE', 'Composants', enfants) };
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
