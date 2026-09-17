/**
 * Mesure la prose du dépôt et écrit le relevé en JSON sur la sortie standard.
 *
 * Deux grandeurs sont mesurées. Le Markdown est réparti par genre de ligne,
 * parce qu'un tableau et un bloc de code ne se réduisent pas comme une phrase.
 * Les sources sont réparties par bloc de commentaire, parce que la masse vit
 * dans les blocs moyens et qu'un total seul ne le montre pas.
 *
 * Groupage des blocs, à connaître pour reproduire un chiffre : des lignes `//`
 * consécutives, séparées par des espaces seuls, comptent pour un bloc unique ;
 * un `/* ... *\/` compte pour un bloc, quel que soit son nombre de lignes ; une
 * ligne vide entre deux `//` termine le bloc. Sans cette convention, le même
 * dépôt donne deux distributions différentes.
 *
 * Le périmètre est celui de `git ls-files`, donc ni `node_modules`, ni `dist`,
 * ni un fichier non suivi.
 *
 * Limite du repérage : le scanner suit les chaînes `'`, `"` et `` ` `` mais ne
 * reconnaît pas les littéraux d'expression régulière. Un `//` écrit dans une
 * regex ouvrirait un commentaire fantôme. Le dépôt n'en contient pas, et un
 * écart de quelques centaines de caractères ne changerait aucune décision.
 *
 * Usage : `node scripts/mesurer-prose.mjs > docs/notes/baseline-prose.json`
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Bornes de la distribution, en caractères, du plus grand au plus petit. */
const PALIERS = [1200, 600, 300, 150, 0];

/** Fichiers suivis par Git, en chemins relatifs à séparateur `/`. */
function fichiersSuivis() {
  const sortie = execFileSync('git', ['ls-files'], { cwd: racine, encoding: 'utf8' });
  return sortie.split(/\r?\n/).filter(Boolean);
}

const lire = (chemin) => fs.readFileSync(path.join(racine, chemin), 'utf8');

/**
 * Classe chaque ligne d'un document en un genre.
 *
 * Le genre commande ce qui est réductible : `prose` l'est, `tableau` et
 * `code` ne le sont pas au même prix, `titre` ne l'est pas du tout puisqu'un
 * titre est la cible d'un lien.
 */
function genresDeLigne(contenu) {
  const total = { titre: 0, tableau: 0, code: 0, prose: 0, vide: 0 };
  let dansUnBloc = false;

  for (const ligne of contenu.split(/\r?\n/)) {
    const taille = ligne.length + 1;
    if (ligne.trimStart().startsWith('```')) {
      dansUnBloc = !dansUnBloc;
      total.code += taille;
      continue;
    }
    if (dansUnBloc) total.code += taille;
    else if (ligne.trim() === '') total.vide += taille;
    else if (ligne.startsWith('#')) total.titre += taille;
    else if (ligne.trimStart().startsWith('|')) total.tableau += taille;
    else total.prose += taille;
  }
  return total;
}

/**
 * Repère les blocs de commentaire d'une source et rend leur taille.
 *
 * Le scanner avance caractère par caractère pour ne pas prendre un `//` écrit
 * dans une chaîne pour un commentaire, faute qui gonflait le relevé de
 * plusieurs milliers de caractères sur les fichiers de messages.
 */
function blocsDeCommentaire(contenu) {
  const blocs = [];
  let i = 0;
  let ligneCourante = null;

  const fermerLigneCourante = () => {
    if (ligneCourante !== null) {
      blocs.push(ligneCourante);
      ligneCourante = null;
    }
  };

  while (i < contenu.length) {
    const c = contenu[i];
    const suivant = contenu[i + 1];

    if (c === '"' || c === "'" || c === '`') {
      fermerLigneCourante();
      const ouvrant = c;
      i += 1;
      while (i < contenu.length) {
        if (contenu[i] === '\\') i += 2;
        else if (contenu[i] === ouvrant) { i += 1; break; }
        else i += 1;
      }
      continue;
    }

    if (c === '/' && suivant === '*') {
      fermerLigneCourante();
      const fin = contenu.indexOf('*/', i + 2);
      const arret = fin === -1 ? contenu.length : fin + 2;
      blocs.push(arret - i);
      i = arret;
      continue;
    }

    if (c === '/' && suivant === '/') {
      let fin = contenu.indexOf('\n', i);
      if (fin === -1) fin = contenu.length;
      const taille = fin - i;
      // Une ligne `//` prolonge le bloc précédent si rien d'autre qu'un
      // commentaire ne les sépare. Le drapeau `ligneCourante` tombe dès qu'un
      // caractère de code ou une ligne vide passe.
      ligneCourante = ligneCourante === null ? taille : ligneCourante + taille;
      i = fin;
      continue;
    }

    if (c === '\n') {
      let j = i + 1;
      while (j < contenu.length && (contenu[j] === ' ' || contenu[j] === '\t')) j += 1;
      const prolonge = contenu[j] === '/' && contenu[j + 1] === '/';
      if (!prolonge) fermerLigneCourante();
      i = j;
      continue;
    }

    if (c !== ' ' && c !== '\t' && c !== '\r') fermerLigneCourante();
    i += 1;
  }

  fermerLigneCourante();
  return blocs;
}

function distribution(blocs) {
  const paliers = PALIERS.map((borne) => ({ borne, blocs: 0, caracteres: 0 }));
  for (const taille of blocs) {
    const palier = paliers.find((p) => taille >= p.borne);
    palier.blocs += 1;
    palier.caracteres += taille;
  }
  return paliers;
}

const suivis = fichiersSuivis();

const markdown = { fichiers: 0, caracteres: 0, titre: 0, tableau: 0, code: 0, prose: 0, vide: 0 };
for (const chemin of suivis.filter((c) => c.endsWith('.md'))) {
  const contenu = lire(chemin);
  const genres = genresDeLigne(contenu);
  markdown.fichiers += 1;
  markdown.caracteres += contenu.length;
  for (const genre of ['titre', 'tableau', 'code', 'prose', 'vide']) markdown[genre] += genres[genre];
}

const sources = { fichiers: 0, caracteres: 0, commentaires: 0, blocs: 0 };
const parFichier = [];
let toutesLesTailles = [];
for (const chemin of suivis.filter((c) => /\.(ts|tsx|mjs|cjs)$/.test(c))) {
  const contenu = lire(chemin);
  const tailles = blocsDeCommentaire(contenu);
  const commentaires = tailles.reduce((somme, taille) => somme + taille, 0);
  sources.fichiers += 1;
  sources.caracteres += contenu.length;
  sources.commentaires += commentaires;
  sources.blocs += tailles.length;
  toutesLesTailles = toutesLesTailles.concat(tailles);
  parFichier.push({ chemin, caracteres: contenu.length, commentaires, blocs: tailles.length });
}

parFichier.sort((a, b) => b.commentaires - a.commentaires);

const releve = {
  markdown,
  sources,
  distribution: distribution(toutesLesTailles),
  proseTotale: markdown.prose + markdown.titre + markdown.tableau + sources.commentaires,
  parFichier: parFichier.slice(0, 40),
};

process.stdout.write(`${JSON.stringify(releve, null, 2)}\n`);
