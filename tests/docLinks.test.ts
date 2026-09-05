/**
 * Les liens entre documents remplacent des règles sinon recopiées. Un lien
 * mort rend donc une règle introuvable au lieu de la répéter : ce test tient la
 * contrepartie de « une règle, un domicile » (CONTRIBUTING.md).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

/**
 * Fichiers markdown du dépôt, hors dépendances installées et hors fixtures.
 *
 * `tests/fixtures/` porte des documents FIGÉS, cités par un test et par lui
 * seul : leurs liens relatifs valaient depuis l'endroit d'où on les a gelés, et
 * les rejuger ici ferait rougir un contrôle sur une adresse que plus personne
 * ne suit.
 */
function fichiersMarkdown(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'node_modules' || entree.name === '.git') continue;
    if (entree.name === 'fixtures') continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersMarkdown(complet));
    else if (entree.name.endsWith('.md')) trouves.push(complet);
  }
  return trouves;
}

/** Lignes hors blocs de code : un `#` en JSON n'est pas un titre. */
function lignesHorsCode(contenu: string): string[] {
  let dansUnBloc = false;
  const gardees: string[] = [];
  for (const ligne of contenu.split(/\r?\n/)) {
    if (/^\s*```/.test(ligne)) {
      dansUnBloc = !dansUnBloc;
      continue;
    }
    if (!dansUnBloc) gardees.push(ligne);
  }
  return gardees;
}

/**
 * Ancre GitHub : minuscules, ponctuation retirée, espaces en tirets, accents
 * conservés. Un slug déjà pris reçoit son rang, comme les trois « Invariants »
 * de la spécification.
 */
function ancres(contenu: string): Set<string> {
  const vues = new Map<string, number>();
  const resultat = new Set<string>();
  for (const ligne of lignesHorsCode(contenu)) {
    const titre = /^(#{1,6})\s+(.*?)\s*$/.exec(ligne);
    if (!titre) continue;
    const base = titre[2]
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      // Un espace donne un tiret, sans fusionner les suites : la ponctuation
      // retirée d'un titre en laisse deux, et GitHub les conserve tous les deux.
      .replace(/\s/g, '-');
    const rang = vues.get(base) ?? 0;
    vues.set(base, rang + 1);
    resultat.add(rang === 0 ? base : `${base}-${rang}`);
  }
  return resultat;
}

/** Liens markdown relatifs, hors blocs de code et hors URL externes. */
function liensRelatifs(contenu: string): string[] {
  const trouves: string[] = [];
  const motif = /\]\(([^)\s]+)\)/g;
  for (const ligne of lignesHorsCode(contenu)) {
    for (const lien of ligne.matchAll(motif)) {
      const cible = lien[1];
      if (/^[a-z]+:/i.test(cible) || cible.startsWith('//')) continue;
      trouves.push(cible);
    }
  }
  return trouves;
}

test('aucun lien entre documents ne pointe vers un fichier ou une ancre absente', () => {
  const documents = fichiersMarkdown(racine);
  assert.ok(documents.length > 0, 'aucun document markdown trouvé');

  const ancresParFichier = new Map<string, Set<string>>();
  const ancresDe = (fichier: string): Set<string> => {
    let connues = ancresParFichier.get(fichier);
    if (!connues) {
      connues = ancres(fs.readFileSync(fichier, 'utf8'));
      ancresParFichier.set(fichier, connues);
    }
    return connues;
  };

  const morts: string[] = [];
  for (const document of documents) {
    const contenu = fs.readFileSync(document, 'utf8');
    const relatif = path.relative(racine, document).replace(/\\/g, '/');

    for (const lien of liensRelatifs(contenu)) {
      const [chemin, ancre] = lien.split('#');
      const cible = chemin === '' ? document : path.resolve(path.dirname(document), chemin);

      if (!fs.existsSync(cible)) {
        morts.push(`${relatif} → ${lien} (fichier absent)`);
        continue;
      }
      if (!ancre) continue;
      if (!cible.endsWith('.md')) {
        morts.push(`${relatif} → ${lien} (ancre sur un fichier non markdown)`);
        continue;
      }
      if (!ancresDe(cible).has(decodeURIComponent(ancre))) {
        morts.push(`${relatif} → ${lien} (ancre absente)`);
      }
    }
  }

  assert.deepEqual(morts, [], `Liens morts :\n${morts.join('\n')}`);
});

/**
 * Les deux documents de spécification, depuis la scission (T8.1) : la forme de
 * ce qui est publié, et ce que le plugin lit pour le produire.
 */
const SPECIFICATIONS = ['docs/FORMAT.md', 'packages/plugin/SPEC.md'];

/**
 * Le test précédent interdit un renvoi mort ; celui-ci interdit l'absence de
 * renvoi. Un invariant d'`AGENTS.md` porte la règle et sa borne, jamais son
 * pourquoi : sans lien, ce pourquoi devient introuvable, et la version courte
 * se met à faire autorité toute seule.
 *
 * Il compte donc les renvois plutôt que de nommer un fichier et un seuil. La
 * version d'avant la scission codait « au moins dix ancres de
 * UCM-EXPORTER-SPEC.md » : elle serait passée au vert sur un document devenu
 * la moitié de lui-même.
 */
test('les invariants renvoient aux DEUX spécifications, et chaque ancre existe', () => {
  const agents = fs.readFileSync(path.join(racine, 'AGENTS.md'), 'utf8');

  const absentes: string[] = [];
  const comptes = SPECIFICATIONS.map((relatif) => {
    const connues = ancres(fs.readFileSync(path.join(racine, relatif), 'utf8'));
    const motif = new RegExp(`${relatif.replace(/[./]/g, '\\$&')}#([^)\\s]+)`, 'g');
    const vises = [...agents.matchAll(motif)].map((lien) => decodeURIComponent(lien[1]));
    absentes.push(...vises.filter((ancre) => !connues.has(ancre)).map((a) => `${relatif}#${a}`));
    return { relatif, vises: vises.length };
  });

  assert.deepEqual(absentes, [], `Ancres absentes : ${absentes.join(', ')}`);

  const muets = comptes.filter(({ vises }) => vises === 0).map(({ relatif }) => relatif);
  assert.deepEqual(muets, [], `AGENTS.md ne renvoie à aucune ancre de : ${muets.join(', ')}`);

  const total = comptes.reduce((somme, { vises }) => somme + vises, 0);
  assert.ok(total >= 20, `AGENTS.md ne renvoie qu'à ${total} ancres de spécification`);
});
