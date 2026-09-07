/**
 * L'inventaire des états ne doit pas pouvoir vieillir en silence.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

type Etape = {
  message?: { type: string; titre?: string; impact?: string; action?: string };
  clic?: string;
  erreurUi?: string;
};
type Etat = {
  id: string;
  titre: string;
  quand: string;
  regarder: string | null;
  existe: boolean;
  attendu?: string;
  atteinte?: Etape[];
};

const require_ = createRequire(import.meta.url);
const { ETATS } = require_('../galerie/etats.cjs') as { ETATS: Etat[] };
const racine = path.resolve(__dirname, '..');
const lire = (relatif: string): string => fs.readFileSync(path.join(racine, relatif), 'utf8');

/**
 * Les commentaires sont retirés AVANT toute lecture de structure. Ceux de
 * `messages.ts` sont longs et écrits en français : le point-virgule d'une
 * phrase y ferme sinon une union quatre membres trop tôt, et la loi ci-dessous
 * passe alors au vert en n'ayant regardé que la moitié de la liste.
 */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Les littéraux de `type` d'une union TypeScript, lus en suivant la profondeur
 * des accolades : l'union se termine au premier `;` de profondeur zéro.
 */
function typesDeLUnion(brut: string, nom: string): Set<string> {
  const source = sansCommentaires(brut);
  const depart = source.indexOf(`export type ${nom} =`);
  assert.notEqual(depart, -1, `Union ${nom} introuvable dans messages.ts`);
  let profondeur = 0;
  let fin = depart;
  for (let rang = depart; rang < source.length; rang += 1) {
    const caractere = source[rang];
    if (caractere === '{') profondeur += 1;
    else if (caractere === '}') profondeur -= 1;
    else if (caractere === ';' && profondeur === 0) {
      fin = rang;
      break;
    }
  }
  const bloc = source.slice(depart, fin);
  const trouves = new Set<string>();
  for (const litteral of bloc.matchAll(/type:\s*'([^']+)'/g)) {
    for (const membre of litteral[1].split('|')) trouves.add(membre.trim());
  }
  return trouves;
}

/** Les variables de thème déclarées par un sélecteur du décalque. */
function variablesDeclarees(css: string, selecteur: string): Set<string> {
  const debut = css.indexOf(`${selecteur} {`);
  assert.notEqual(debut, -1, `Sélecteur ${selecteur} absent du décalque`);
  const bloc = css.slice(debut, css.indexOf('}', debut));
  return new Set([...bloc.matchAll(/(--figma-color-[\w-]+)\s*:/g)].map((trouve) => trouve[1]));
}

test('chaque état porte son identité, sa situation et ce qu’on regarde dessus', () => {
  const identifiants = ETATS.map((etat) => etat.id);
  assert.deepEqual(
    identifiants.filter((id, rang) => identifiants.indexOf(id) !== rang),
    [],
    'deux états partagent un identifiant',
  );
  for (const etat of ETATS) {
    assert.match(etat.id, /^[a-z0-9-]+$/, `identifiant non conforme : ${etat.id}`);
    assert.ok(etat.titre?.length > 0, `${etat.id} n'a pas de titre`);
    assert.ok(etat.quand?.length > 0, `${etat.id} ne dit pas dans quelle situation il arrive`);
  }
});

test('une situation que l’interface ne montre pas encore nomme la tâche qui la créera', () => {
  for (const etat of ETATS.filter((candidat) => !candidat.existe)) {
    assert.match(
      etat.attendu ?? '',
      /^[UT]\d+\.\d+$/,
      `${etat.id} n'existe pas et ne nomme aucune tâche`,
    );
    assert.equal(etat.atteinte, undefined, `${etat.id} n'existe pas mais porte un scénario`);
  }
});

test('un état atteignable dit ce qu’on regarde sur sa capture', () => {
  for (const etat of ETATS.filter((candidat) => candidat.existe)) {
    assert.ok((etat.regarder ?? '').length > 0, `${etat.id} est capturé sans qu'on sache pourquoi`);
    assert.ok((etat.atteinte ?? []).length > 0, `${etat.id} n'a aucune étape`);
    for (const etape of etat.atteinte ?? []) {
      const gestes = [etape.message, etape.clic, etape.erreurUi].filter(Boolean);
      assert.equal(gestes.length, 1, `${etat.id} porte une étape qui n'est pas un geste unique`);
    }
  }
});

test('tout message que le sandbox peut envoyer a un état où le regarder', () => {
  const declares = typesDeLUnion(lire('src/messages.ts'), 'PluginMessage');
  const joues = new Set<string>();
  for (const etat of ETATS) {
    for (const etape of etat.atteinte ?? []) if (etape.message) joues.add(etape.message.type);
  }

  const jamaisRegardes = [...declares].filter((type) => !joues.has(type));
  assert.deepEqual(
    jamaisRegardes,
    [],
    `Messages déclarés dans messages.ts sans état dans la galerie : ${jamaisRegardes.join(', ')}`,
  );

  const inventes = [...joues].filter((type) => !declares.has(type));
  assert.deepEqual(inventes, [], `États jouant un message absent de messages.ts : ${inventes.join(', ')}`);
});

/**
 * Une carte incomplète est pire qu'un paragraphe : elle promet une structure
 * qu'elle ne tient pas.
 *
 * La galerie est le seul endroit où l'on REGARDE ces cartes ; un état qui en
 * joue une sans son impact ou sans son geste ferait juger la mise en page sur
 * un contenu que le moteur ne produit pas. La loi jumelle, côté moteur, refuse
 * qu'un tel message sorte (`loiDesParties.test.ts`) : celle-ci refuse qu'on le
 * mette en scène.
 */
test('toute carte jouée par la galerie porte son problème, son impact et son geste', () => {
  const manquants: string[] = [];
  for (const etat of ETATS) {
    for (const etape of etat.atteinte ?? []) {
      if (etape.message?.type !== 'diagnostic') continue;
      const vides = (['titre', 'impact', 'action'] as const)
        .filter((partie) => !(etape.message?.[partie] ?? '').trim());
      if (vides.length > 0) manquants.push(`${etat.id} — ${vides.join(', ')}`);
    }
  }
  assert.deepEqual(
    manquants,
    [],
    `Cartes jouées sans toutes leurs parties : ${manquants.join(' ; ')}`,
  );
});

/**
 * Les trois issues d'un export doivent rester REGARDABLES ensemble.
 *
 * Publication saine, correction demandée, export impossible : c'est leur
 * voisinage qui dit si le verdict porte bien le rang 1, et si le rouge reste
 * réservé au refus. Un état retiré en silence rendrait cette comparaison
 * impossible sans que rien ne rougisse.
 */
test('les trois issues d’un export ont chacune leur état', () => {
  const parId = new Map(ETATS.map((etat) => [etat.id, etat]));
  for (const id of [
    'resultat-transformations-normales',
    'resultat-un-avertissement',
    'export-impossible',
  ]) {
    assert.ok(parId.get(id)?.existe, `l'issue « ${id} » n'a plus d'état atteignable`);
  }
  // La publication saine ne montre AUCUNE carte : c'est tout son propos.
  const saine = parId.get('resultat-transformations-normales');
  assert.deepEqual(
    (saine?.atteinte ?? []).filter((etape) => etape.message?.type === 'diagnostic'),
    [],
    'l’export sain joue un diagnostic : ce n’est plus un export sain',
  );
});

test('le décalque sert toutes les variables de thème que styles.css demande', () => {
  const demandees = new Set(
    [...lire('src/ui/styles.css').matchAll(/var\(\s*(--figma-color-[\w-]+)/g)].map(
      (trouve) => trouve[1],
    ),
  );
  assert.ok(demandees.size > 0, 'aucune variable de thème trouvée dans styles.css');

  const decalque = lire('galerie/theme-figma.css');
  for (const selecteur of [':root', '.figma-dark']) {
    const declarees = variablesDeclarees(decalque, selecteur);
    const manquantes = [...demandees].filter((variable) => !declarees.has(variable));
    assert.deepEqual(
      manquantes,
      [],
      `${selecteur} ne sert pas : ${manquantes.join(', ')} — la galerie montrerait un repli en dur`,
    );
  }
});
