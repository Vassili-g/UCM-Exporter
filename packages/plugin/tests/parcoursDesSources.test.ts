/** Le parcours qui cherche un `.componentRules` hors de la page active. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { chercherLaSourceDansLeDocument } from '../src/template/sources';

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

/** Ce qu'une page compte pendant le test : chargements et recherches natives. */
type Compteurs = { charges: string[]; parCriteres: string[] };

/**
 * Une page qui sert `loadAsync` et `findAllWithCriteria`, comme Figma.
 *
 * Le filtrage par type reproduit celui de l'API : seuls les types demandés
 * remontent, et le compteur dit que le parcours est passé par cette voie plutôt
 * que par un prédicat.
 */
function page(nom: string, enfants: any[], compteurs: Compteurs) {
  const self = noeud('PAGE', nom, enfants);
  self.loadAsync = async () => {
    compteurs.charges.push(nom);
  };
  self.findAllWithCriteria = ({ types }: { types: string[] }) => {
    compteurs.parCriteres.push(`${nom}:${types.join(',')}`);
    return self.findAll((n: any) => types.includes(n.type));
  };
  return self;
}

/** Monte un document de plusieurs pages, et le démonte à la sortie du test. */
function monterDocument(
  t: { after: (fn: () => void) => void },
  pages: any[],
  active = pages[0],
): Compteurs {
  const precedent = (globalThis as { figma?: unknown }).figma;
  t.after(() => {
    (globalThis as { figma?: unknown }).figma = precedent;
  });
  const compteurs: Compteurs = { charges: [], parCriteres: [] };
  (globalThis as any).figma = {
    currentPage: active,
    root: { children: pages },
    skipInvisibleInstanceChildren: false,
    loadAllPagesAsync: () => {
      throw new Error('loadAllPagesAsync est interdit ici');
    },
  };
  return compteurs;
}

/** Les pages d'un document, chacune tenant ses compteurs de la même mesure. */
function documentDe(
  t: { after: (fn: () => void) => void },
  contenus: { nom: string; enfants: any[] }[],
) {
  const compteurs: Compteurs = { charges: [], parCriteres: [] };
  const pages = contenus.map((contenu) => page(contenu.nom, contenu.enfants, compteurs));
  const monte = monterDocument(t, pages);
  monte.charges = compteurs.charges;
  monte.parCriteres = compteurs.parCriteres;
  (globalThis as any).figma.currentPage = pages[0];
  return { pages, compteurs };
}

const rienAAttendre = async () => {};

test('la page active porte le maître : aucune autre page n’est chargée', async (t) => {
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.ok(trouvee?.maitreLocal, 'le maître de la page active n’est pas rendu');
  assert.deepEqual(compteurs.charges, [], 'une page a été chargée pour rien');
});

test('le maître rangé sur une autre page est trouvé', async (t) => {
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal?.name, '.componentRules');
  assert.deepEqual(compteurs.charges, ['Règles']);
});

test('une instance qui documente un autre composant sert de source à distance', async (t) => {
  documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Doc', enfants: [porteurDeNom('INSTANCE', 'Chip')] },
  ]);

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal, null);
  assert.equal(trouvee?.instanceSource?.name, '.componentRules');
});

test('le parcours s’arrête à la première page qui porte une source', async (t) => {
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
    { nom: 'Archives', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);

  await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.deepEqual(compteurs.charges, ['Règles'], 'le parcours a dépassé la première source');
});

test('un document sans aucune source rend null après avoir tout parcouru', async (t) => {
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Brouillons', enfants: [noeud('FRAME', 'Autre')] },
  ]);

  assert.equal(await chercherLaSourceDansLeDocument(rienAAttendre), null);
  assert.deepEqual(compteurs.charges, ['Brouillons']);
});

test('le filtrage par type passe par findAllWithCriteria, jamais par un prédicat', async (t) => {
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);

  await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.deepEqual(compteurs.parCriteres, [
    'Composants:COMPONENT',
    'Composants:INSTANCE',
    'Règles:COMPONENT',
  ]);
});

test('le drapeau des calques invisibles reprend sa valeur d’avant', async (t) => {
  documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);
  (globalThis as any).figma.skipInvisibleInstanceChildren = false;

  await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal((globalThis as any).figma.skipInvisibleInstanceChildren, false);
});

test('le drapeau est posé pendant le relevé d’une page', async (t) => {
  const releve: boolean[] = [];
  const espion = noeud('FRAME', 'Espion');
  const pages = [noeud('PAGE', 'Composants', [espion])];
  (pages[0] as any).findAllWithCriteria = () => {
    releve.push((globalThis as any).figma.skipInvisibleInstanceChildren);
    return [];
  };
  monterDocument(t, pages);

  await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.deepEqual(releve, [true, true], 'le relevé ne descend pas sans le drapeau');
});

test('la main est rendue avant chaque page chargée, et jamais pour la page active', async (t) => {
  documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Brouillons', enfants: [noeud('FRAME', 'Autre')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);
  let mains = 0;

  await chercherLaSourceDansLeDocument(async () => {
    mains += 1;
  });

  assert.equal(mains, 2, 'la main n’est pas rendue une fois par page chargée');
});
