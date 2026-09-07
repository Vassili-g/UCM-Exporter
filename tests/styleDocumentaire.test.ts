
/** Contrôle les deux tics documentaires mesurés par le dépôt. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

const TIRET_CADRATIN = '—';

/**
 * Aucun document n'est exempté : les plans de travail, qui l'étaient parce
 * qu'ils racontaient un chantier, ont été retirés du dépôt. Leur histoire vit
 * dans Git, qui n'a pas de règle de style.
 */
const EMPHASE = [
  'CE', 'EST', 'SON', 'ET', 'TOUTES', 'SANS', 'MÊME', 'UN', 'UNE', 'CONTIENT',
  'CONTIENNENT', 'DEUX', 'TROIS', 'JAMAIS', 'PAS', 'TOUS', 'TOUT', 'SEUL',
  'SEULE', 'AUCUN', 'AUCUNE', 'CHAQUE', 'ICI', 'DANS', 'QUE', 'SI', 'SUR',
  'AVANT', 'APRÈS', 'NOM', 'CLÉ', 'FORME', 'LISTE', 'DÉFAUT', 'POURQUOI',
  'LU', 'LIT', 'ÉCRIT', 'PUBLIÉ', 'ABSENT', 'IDENTIQUE', 'DIFFÉRENT',
  'PROPRE', 'RÉELLE', 'RÉELLEMENT', 'NORMATIF', 'MUET',
  // Ajoutées après un relevé qui a montré que la liste laissait passer une
  // cinquantaine d'emphases, surtout dans le changelog et la spécification.
  'COURANTE', 'TEMPORAIRE', 'RUPTURE', 'CONSOMMATEUR', 'LECTURE', 'IDENTITÉ',
  'MOTEUR', 'DICTIONNAIRE', 'ENVELOPPE', 'PRÉSOMPTION', 'PRÉSOMPTIONS',
  'RETIRER', 'POINTS', 'OU', 'CELLULE', 'MONTRE', 'ADRESSES', 'IMMÉDIAT',
  'SES', 'SA', 'ÊTRE', 'NOMBRE', 'ENTRE', 'CÔTÉ', 'DÉRIVE', 'NOMMER',
  'DÉCIDE', 'TRACÉ', 'RELÈVE', 'REND', 'EXPORT', 'TEXTE', 'LEQUEL', 'GESTES',
  'FICHIER', 'ÉDITEUR', 'NE', 'CHAÎNE', 'COMMANDE', 'ADAPTATEUR', 'LECTEURS',
  'SENS', 'OUVRIR', 'OÙ', 'PERDU', 'PIRE', 'RÉEL',
];

/** Recense les documents portables sans parcourir les dépendances ni les fixtures. */
function documents(dossier: string): string[] {
  const trouves: string[] = [];
  const dansTests = path.basename(dossier) === 'tests';
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const nom = entree.name;
    if (nom === 'node_modules' || nom === '.git' || nom === 'dist') continue;
    if (nom === 'fixtures' && dansTests) continue;
    if (nom.startsWith('_')) continue;
    const complet = path.join(dossier, nom);
    if (entree.isDirectory()) trouves.push(...documents(complet));
    else if (nom.endsWith('.md')) trouves.push(complet);
  }
  return trouves;
}

const relatif = (complet: string): string =>
  path.relative(racine, complet).split(path.sep).join('/');

/** Écarte titres, tableaux, code et fragments placés entre accents graves. */
function lignesDeProse(contenu: string): { numero: number; texte: string }[] {
  const gardees: { numero: number; texte: string }[] = [];
  let dansUnBloc = false;
  contenu.split(/\r?\n/).forEach((ligne, index) => {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBloc = !dansUnBloc;
      return;
    }
    if (dansUnBloc) return;
    if (ligne.startsWith('#') || ligne.startsWith('|')) return;

    gardees.push({ numero: index + 1, texte: ligne.replace(/`[^`\n]*`/g, '') });
  });
  return gardees;
}

/** Les documents soumis à ces règles, une seule fois pour les deux tests. */
function documentsSoumis(): { chemin: string; contenu: string }[] {
  const tous = documents(racine).map((complet) => ({ chemin: relatif(complet), complet }));

  // Zéro document passerait sans rien contrôler : un dossier renommé, et le
  // garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  assert.ok(tous.length >= 15, `seuls ${tous.length} documents trouvés`);

  return tous.map(({ chemin, complet }) => ({
    chemin,
    contenu: fs.readFileSync(complet, 'utf8'),
  }));
}

test('aucun tiret cadratin ne sert d’incise dans la documentation', () => {
  const fautes: string[] = [];

  for (const { chemin, contenu } of documentsSoumis()) {
    for (const { numero, texte } of lignesDeProse(contenu)) {
      if (texte.includes(TIRET_CADRATIN)) fautes.push(`${chemin}:${numero} ${texte.trim()}`);
    }
  }

  assert.deepEqual(
    fautes,
    [],
    'Ces lignes emploient un tiret cadratin comme incise :\n'
      + `${fautes.join('\n')}\n`
      + 'Employer un point, un point-virgule, une virgule, deux points ou une '
      + 'parenthèse. Il reste admis dans un titre et dans une cellule de tableau.',
  );
});

test('aucun mot français n’est mis en capitales pour insister', () => {
  const motif = new RegExp(
    `(?<![A-Za-zÀ-ÿ0-9_/.\\-])(${EMPHASE.join('|')})(?![A-Za-zÀ-ÿ0-9_/.\\-])`,
    'g',
  );

  const fautes: string[] = [];
  for (const { chemin, contenu } of documentsSoumis()) {
    for (const { numero, texte } of lignesDeProse(contenu)) {
      for (const trouve of texte.matchAll(motif)) {
        fautes.push(`${chemin}:${numero} « ${trouve[1]} » dans : ${texte.trim()}`);
      }
    }
  }

  assert.deepEqual(
    fautes,
    [],
    'Ces mots sont mis en capitales pour insister :\n'
      + `${fautes.join('\n')}\n`
      + 'Le gras fait le même travail. Ajouter un mot à EMPHASE plutôt que '
      + 'd’élargir le motif ; la liste ne contient que des mots français, ce qui '
      + 'est ce qui la rend reproductible.',
  );
});
