/**
 * L'inventaire des états ne doit pas pouvoir vieillir en silence.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

import { MOTS_DE_FORGE } from './motsDeForge';

type Etape = {
  message?: { type: string; titre?: string; impact?: string; action?: string };
  clic?: string;
  /** Une valeur tapée dans un champ, comme le designer la taperait. */
  saisie?: { dans: string; valeur: string };
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
 * Les commentaires sont retirés avant toute lecture de structure. Ceux de
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
      const gestes = [etape.message, etape.clic, etape.saisie, etape.erreurUi].filter(Boolean);
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
 * Les trois issues d'un export doivent rester regardables ensemble.
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
  // La publication saine ne montre aucune carte : c'est tout son propos.
  const saine = parId.get('resultat-transformations-normales');
  assert.deepEqual(
    (saine?.atteinte ?? []).filter((etape) => etape.message?.type === 'diagnostic'),
    [],
    'l’export sain joue un diagnostic : ce n’est plus un export sain',
  );
});

/**
 * Ce qu'un état affiche est ce que ses messages portent. Un état GitLab qui
 * montrerait « pull request » ferait juger l'écran sur un texte que le plugin
 * n'écrit pas pour GitLab, et l'inverse vaut pour GitHub. Un état sans dépôt
 * configuré porte `forge: 'aucune'` : son texte nomme les deux demandes.
 *
 * Un état `mixte` montre des dépôts des deux forges, par construction : la
 * liste de l'onglet Dépôts. La loi y vérifie chaque message contre la forge de
 * son sujet : l'entrée désignée par `id` pour `depot-teste`, la clé de
 * destination d'un résultat d'opération, et pour le reste le dépôt actif du
 * dernier `settings`. La liste elle-même, `settings`, nomme les deux.
 */
type EtatDeForge = Etat & { forge?: 'gitlab' | 'aucune' | 'mixte'; forgeActive?: 'github' | 'gitlab' };
type MessageDeForge = {
  type: string;
  id?: string;
  destination?: string;
  settings?: { actif: string | null };
};

/** Les fautes de forge d'un état `mixte`, message par message. */
function fautesMixtes(etat: EtatDeForge): string[] {
  const fautes: string[] = [];
  let actif: string | undefined;
  for (const etape of etat.atteinte ?? []) {
    const message = etape.message as MessageDeForge | undefined;
    if (!message) continue;
    if (message.type === 'settings') {
      actif = message.settings?.actif?.split(':')[0];
      continue;
    }
    const forge = message.type === 'depot-teste'
      ? message.id?.split(':')[0]
      : message.destination ? (JSON.parse(message.destination) as string[])[0] : actif;
    if (forge !== 'github' && forge !== 'gitlab') continue;
    const interdit = forge === 'gitlab' ? MOTS_DE_FORGE.github : MOTS_DE_FORGE.gitlab;
    const trouve = interdit.exec(JSON.stringify(message));
    if (trouve) fautes.push(`${etat.id} : ${message.type} affiche « ${trouve[0]} »`);
  }
  return fautes;
}

test('un état GitLab n’affiche aucun mot de GitHub, et un autre état aucun mot de GitLab', () => {
  const fautes: string[] = [];
  for (const etat of ETATS as EtatDeForge[]) {
    if (etat.forge === 'aucune') continue;
    if (etat.forge === 'mixte') {
      assert.ok(etat.forgeActive, `${etat.id} est mixte sans forgeActive`);
      fautes.push(...fautesMixtes(etat));
      continue;
    }
    const affiche = JSON.stringify(etat.atteinte ?? []);
    const interdit = etat.forge === 'gitlab' ? MOTS_DE_FORGE.github : MOTS_DE_FORGE.gitlab;
    const trouve = interdit.exec(affiche);
    if (trouve) fautes.push(`${etat.id} affiche « ${trouve[0]} »`);
  }
  assert.ok(ETATS.some((etat) => (etat as { forge?: string }).forge === 'gitlab'), 'aucun état GitLab');
  assert.ok(ETATS.some((etat) => (etat as { forge?: string }).forge === 'mixte'), 'aucun état mixte');
  assert.deepEqual(fautes, []);
});

test('le décalque sert toutes les variables de thème que les feuilles demandent', () => {
  // Les rôles de couleur sont dans la feuille du socle, placée avant styles.css.
  const feuilles = fs.readFileSync(require_.resolve('ucm-plugin-socle/socle.css'), 'utf8') + lire('src/ui/styles.css');
  const demandees = new Set(
    [...feuilles.matchAll(/var\(\s*(--figma-color-[\w-]+)/g)].map(
      (trouve) => trouve[1],
    ),
  );
  assert.ok(demandees.size > 0, 'aucune variable de thème trouvée dans les feuilles');

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

/**
 * Un script de la galerie que Node ne compile pas ne se voit qu'au lancement
 * des captures, qu'aucun autre test ne fait. `etats.cjs` est chargé plus haut ;
 * les autres scripts ne le sont nulle part.
 */
test('chaque script de la galerie se compile', () => {
  const dossier = path.join(racine, 'galerie');
  const scripts = fs.readdirSync(dossier).filter((nom) => nom.endsWith('.cjs'));
  assert.ok(scripts.includes('capturer.cjs'), 'capturer.cjs a quitté la galerie');
  for (const nom of scripts) {
    const resultat = spawnSync(process.execPath, ['--check', path.join(dossier, nom)], { encoding: 'utf8' });
    assert.equal(resultat.status, 0, `${nom} ne compile pas :\n${resultat.stderr}`);
  }
});
