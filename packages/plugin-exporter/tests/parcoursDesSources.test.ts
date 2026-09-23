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

/** Monte un document de pages déjà construites, et le démonte à la sortie. */
function monterDocument(t: { after: (fn: () => void) => void }, pages: any[]): void {
  const precedent = (globalThis as { figma?: unknown }).figma;
  t.after(() => {
    (globalThis as { figma?: unknown }).figma = precedent;
  });
  (globalThis as any).figma = {
    currentPage: pages[0],
    root: { children: pages },
    skipInvisibleInstanceChildren: false,
    loadAllPagesAsync: () => {
      throw new Error('loadAllPagesAsync est interdit ici');
    },
  };
}

/** Les pages d'un document, toutes alimentant les mêmes compteurs. */
function documentDe(
  t: { after: (fn: () => void) => void },
  contenus: { nom: string; enfants: any[] }[],
) {
  const compteurs: Compteurs = { charges: [], parCriteres: [] };
  const pages = contenus.map((contenu) => page(contenu.nom, contenu.enfants, compteurs));
  monterDocument(t, pages);
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

test('une instance nommée « .componentRules » sert de source à distance', async (t) => {
  documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Doc', enfants: [porteurDeNom('INSTANCE', 'Chip')] },
  ]);

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal, null);
  assert.equal(trouvee?.instanceSource?.name, '.componentRules');
});

test('une instance qui écrit un nom sans porter celui du maître n’est pas une source', async (t) => {
  // Le relevé de la page active accepte toute instance qui porte
  // « component-name ». À distance, ce critère élirait la première carte de
  // spécification venue, et le clic refuserait sur un composant que le designer
  // n'a pas choisi. Ici, « Règles » doit gagner contre « Specs ».
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Specs', enfants: [porteurDeNom('INSTANCE', 'Chip', 'Spec card')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal?.name, '.componentRules');
  assert.deepEqual(compteurs.charges, ['Specs', 'Règles']);
});

test('un node dont Figma refuse le nom n’emporte pas le parcours', async (t) => {
  // Figma annonce des nodes qu'il ne sert plus : lire leur nom lève. Le nom se
  // lit donc par `nomLisible`, et non par `node.name`. Sans lui, la page
  // suivante ne serait jamais examinée.
  const pourri = noeud('COMPONENT', 'Pourri');
  Object.defineProperty(pourri, 'name', {
    get() {
      throw new Error('The node with id "1:2" does not exist');
    },
  });
  const { compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Doc', enfants: [pourri] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal?.name, '.componentRules');
  assert.deepEqual(compteurs.charges, ['Doc', 'Règles']);
});

test('une page dont le parcours lève n’emporte pas le reste du document', async (t) => {
  // `nomLisible` couvre le nom d'un node, et rien d'autre : la recherche
  // elle-même peut lever sur une page que Figma sert mal. Le document entier
  // passerait alors pour sans source jusqu'à la fermeture du plugin.
  const { pages, compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Doc', enfants: [noeud('FRAME', 'Autre')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);
  pages[1].findAllWithCriteria = () => {
    throw new Error('The node with id "1:2" does not exist');
  };

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal?.name, '.componentRules');
  assert.deepEqual(compteurs.charges, ['Doc', 'Règles']);
  assert.equal(
    (globalThis as any).figma.skipInvisibleInstanceChildren,
    false,
    'le drapeau n’est pas rendu quand la page lève',
  );
});

test('un chargement de page en échec n’emporte pas le parcours', async (t) => {
  const { pages, compteurs } = documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Doc', enfants: [noeud('FRAME', 'Autre')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);
  pages[1].loadAsync = async () => {
    throw new Error('page illisible');
  };

  const trouvee = await chercherLaSourceDansLeDocument(rienAAttendre);

  assert.equal(trouvee?.maitreLocal?.name, '.componentRules');
  assert.deepEqual(compteurs.charges, ['Règles']);
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

test('la main est rendue avant le chargement puis avant le relevé, jamais pour la page active', async (t) => {
  // Le relevé d'une page fraîchement chargée est synchrone et tient le seul fil
  // du sandbox : le rendre après le chargement seul laisserait une analyse
  // lancée pendant ce chargement attendre la fin du relevé.
  documentDe(t, [
    { nom: 'Composants', enfants: [noeud('FRAME', 'Root')] },
    { nom: 'Brouillons', enfants: [noeud('FRAME', 'Autre')] },
    { nom: 'Règles', enfants: [porteurDeNom('COMPONENT', 'Chip', '.componentRules')] },
  ]);
  const mains: string[] = [];

  await chercherLaSourceDansLeDocument(async () => {
    mains.push('main');
  });

  assert.equal(mains.length, 4, 'la main n’est pas rendue deux fois par page chargée');
});
