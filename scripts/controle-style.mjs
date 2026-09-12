/**
 * Les règles de style du dépôt, en un seul endroit, pour les deux moments où
 * elles s'appliquent.
 *
 * Le test `tests/styleDocumentaire.test.ts` les rejoue sur tout le dépôt, et le
 * hook `PostToolUse` de `.claude/settings.json` les rejoue sur le fichier qu'un
 * agent vient d'écrire. Le hook donne le retour immédiat et ne couvre que les
 * agents qui le lisent ; le test est la barrière que rien ne franchit. Les deux
 * partagent ce module pour qu'aucun des deux moments ne juge autrement.
 *
 * L'autorité rédactionnelle reste `CONTRIBUTING.md`, section « Rédiger un
 * document », et la skill `.agents/skills/rediger-sans-tics-ia`. Ce module ne
 * contrôle que ce qui se décide sans lire le sens : la question « cette phrase
 * apporte-t-elle un fait » reste à la relecture.
 *
 * Usage : `node scripts/controle-style.mjs [fichier...]`. Sans argument, tous
 * les fichiers suivis par Git. Sortie 1 s'il reste une faute.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIRET_CADRATIN = '—';

/**
 * Ce qu'un mot tout en capitales a le droit d'être : un sigle, un type de
 * l'API Figma, un nom de fichier ou de document du dépôt.
 *
 * La liste tenue auparavant était celle des mots français vus en capitales, et
 * elle laissait passer tout mot qui n'y était pas encore. Le relevé qui a suivi
 * l'extension du contrôle aux commentaires en a trouvé 218 hors liste, dont
 * 218 qui étaient bien des emphases. La liste est donc inversée : un mot en
 * capitales est une emphase tant qu'il n'est pas nommé ici, et un sigle nouveau
 * s'ajoute avec un message qui le dit. Le contrôle échoue alors du bon côté.
 *
 * Un mot d'une seule lettre et un identifiant à `_` ne sont pas concernés,
 * `CONTRACT_VERSION` et `L'` compris.
 */
export const ACRONYMES = [
  'API', 'ASCII', 'BASE', 'BOM', 'BOOLEAN', 'CI', 'CLI', 'COLOR', 'COMPONENT',
  'CRLF', 'CSS', 'DOM', 'DS', 'DTCG', 'EACCES', 'EASING', 'ENOTDIR', 'ESM',
  'FIXED',
  'FLOAT', 'FRAME', 'GET', 'GIT', 'GNU', 'GRID', 'GROUP', 'HTML', 'HTTP',
  'HTTPS', 'HUG', 'IA', 'ID', 'ISO', 'JS', 'JSON', 'JSX', 'JWT', 'LF', 'LGPL',
  'LINE', 'LTR', 'MAX', 'MB', 'MCP', 'MD', 'MIN', 'MIT', 'MVP', 'NODE', 'NONE',
  'NPM', 'OIDC', 'OK', 'PAT', 'PDF', 'POLYGON', 'POST', 'PR', 'PUT', 'RECTANGLE',
  'REST', 'RTL', 'SET', 'SHA', 'SLOT', 'SOLID', 'SPEC', 'STAR', 'STRETCH',
  'STRING', 'SVG', 'TAP', 'TAR', 'TEXT', 'TIMING', 'TS', 'UCM', 'UI', 'URI',
  'URL',
  'UTF', 'VECTOR', 'WRAP', 'YAML', 'ZIP', 'ELLIPSE', 'AUTO',
  // Les documents du dépôt, cités par leur nom sans extension.
  'AGENTS', 'CONCEPT', 'CONTRIBUTING', 'LICENSE', 'README', 'ROADMAP',
];

/** Un mot entièrement en capitales, hors identifiant et hors mot d'une lettre. */
const CAPITALES = /(?<![A-Za-zÀ-ÿ0-9_/\-.])([A-ZÀ-Þ]{2,})(?![A-Za-zÀ-ÿ0-9_/\-]|\.\w)/g;

/**
 * Les qualificatifs que la skill proscrit tant qu'aucun fait ne les établit.
 *
 * Chaque entrée a été relevée dans le dépôt avant d'entrer ici. La skill en
 * nomme deux que ce contrôle laisse passer, parce que le dépôt ne les emploie
 * qu'au sens littéral : « complet » dans « l'historique complet », et « de bout
 * en bout » dans « un dessin de bout en bout », qui décrit une géométrie. Un
 * contrôle qui refuse une phrase exacte se fait désarmer.
 */
export const INTENSIFICATEURS = [
  'robuste', 'robustes', 'fluide', 'fluides', 'puissant', 'puissante',
  'essentielle', 'essentiels', 'essentielles',
  'précieux', 'précieuse', 'crucial', 'cruciale', 'primordial', 'primordiale',
  'à l’échelle', "à l'échelle", 'dans une logique de',
  'véritable', 'véritablement', 'incontournable', 'élégant', 'élégante',
  'élégance', 'harmonieux', 'sans effort', 'clé en main',
];

/** Ce qui ouvre une opposition décorative en deux temps. */
const OPPOSITION = /n[’']est pas [^.;:!?]{1,90}?,\s*(?:c[’']est|mais bien|mais)\b/gi;

/**
 * Une date posée sur une décision ou sur un constat.
 *
 * `CONTRIBUTING.md` demande qu'un texte décrive l'état actuel : Git date les
 * décisions par construction, et une date recopiée dans un texte ne se met pas
 * à jour quand la décision change. Une date qui appartient à une donnée, comme
 * la version d'API `2022-11-28`, vit dans une chaîne, que le contrôle ne lit
 * pas.
 */
const MOIS = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre'
  + '|octobre|novembre|décembre';
const DATATION = new RegExp(
  `(\\d{1,2}\\s+(?:${MOIS})\\s+\\d{4})|((?:${MOIS})\\s+20\\d\\d)|(\\d{4}-\\d{2}-\\d{2})`,
  'gi',
);

/** Fichiers suivis par Git, en chemins relatifs à séparateur `/`. */
export function fichiersSuivis() {
  const sortie = execFileSync('git', ['ls-files'], { cwd: racine, encoding: 'utf8' });
  return sortie.split(/\r?\n/).filter(Boolean);
}

/**
 * Les lignes d'un document soumises aux règles, code et tableaux écartés.
 *
 * Un titre est la cible d'un lien et une cellule de tableau n'a pas la place
 * d'une ponctuation courante : les deux gardent le droit au tiret cadratin. Les
 * fragments entre accents graves sortent, sinon un nom de champ passerait pour
 * une emphase.
 */
export function lignesDeProse(contenu) {
  const gardees = [];
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

/**
 * Les commentaires d'une source, groupés en blocs et rendus ligne par ligne.
 *
 * Le scanner avance caractère par caractère pour ne pas prendre un `//` écrit
 * dans une chaîne pour un commentaire. Il ne reconnaît pas les littéraux
 * d'expression régulière ; le dépôt n'en écrit aucun qui contienne `//` ou
 * `/*`, et un tel littéral ouvrirait un commentaire fantôme.
 *
 * Chaque bloc porte sa ligne de départ, sa taille en caractères et son texte
 * débarrassé des marqueurs, des accents graves et des adresses. Sans ce
 * nettoyage, un `http://` ou un nom de champ deviendrait une faute.
 */
export function blocsDeCommentaire(contenu) {
  const lignes = contenu.split(/\r?\n/);
  const decalages = [];
  let position = 0;
  for (const ligne of lignes) {
    decalages.push(position);
    position += ligne.length + 1;
  }
  const ligneDe = (index) => {
    let numero = 1;
    while (numero < decalages.length && decalages[numero] <= index) numero += 1;
    return numero;
  };

  const blocs = [];
  let courant = null;
  let i = 0;

  const fermer = () => {
    if (courant !== null) {
      blocs.push(courant);
      courant = null;
    }
  };

  while (i < contenu.length) {
    const c = contenu[i];
    const suivant = contenu[i + 1];

    if (c === '"' || c === "'" || c === '`') {
      fermer();
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
      fermer();
      const fin = contenu.indexOf('*/', i + 2);
      const arret = fin === -1 ? contenu.length : fin + 2;
      blocs.push({
        numero: ligneDe(i), debut: i, fin: arret, taille: arret - i, brut: contenu.slice(i, arret),
      });
      i = arret;
      continue;
    }

    if (c === '/' && suivant === '/') {
      let fin = contenu.indexOf('\n', i);
      if (fin === -1) fin = contenu.length;
      const brut = contenu.slice(i, fin);
      if (courant === null) courant = { numero: ligneDe(i), debut: i, fin, taille: brut.length, brut };
      else {
        courant.taille += brut.length;
        courant.fin = fin;
        courant.brut += `\n${brut}`;
      }
      i = fin;
      continue;
    }

    if (c === '\n') {
      let j = i + 1;
      while (j < contenu.length && (contenu[j] === ' ' || contenu[j] === '\t')) j += 1;
      if (!(contenu[j] === '/' && contenu[j + 1] === '/')) fermer();
      i = j;
      continue;
    }

    if (c !== ' ' && c !== '\t' && c !== '\r') fermer();
    i += 1;
  }

  fermer();
  return blocs.map((bloc) => ({ ...bloc, lignes: lignesDuBloc(bloc) }));
}

/** Découpe un bloc en lignes de prose, marqueurs et code cités retirés. */
function lignesDuBloc(bloc) {
  const depart = bloc.numero;
  return bloc.brut.split('\n').map((ligne, index) => ({
    numero: depart + index,
    texte: ligne
      .replace(/^\s*\/\*+/, '')
      .replace(/\*+\/\s*$/, '')
      .replace(/^\s*\*(?!\/)/, '')
      .replace(/^\s*\/\//, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/`[^`\n]*`/g, ''),
  }));
}

/**
 * Retire ce qui est cité entre guillemets, en suivant les citations sur
 * plusieurs lignes.
 *
 * `CONTRIBUTING.md` et la skill nomment les tournures qu'elles proscrivent, et
 * les nomment entre guillemets. Sans cette coupe, le contrôle refuserait le
 * texte qui écrit la règle, ce qui est le plus court chemin vers un contrôle
 * désarmé. La coupe ne vaut que pour les trois règles qui portent sur un mot
 * employé : citer « MÊME » en capitales reste une emphase.
 */
function sansCitations(lignes) {
  let dedans = false;
  return lignes.map(({ numero, texte }) => {
    let sortie = '';
    for (const caractere of texte) {
      if (caractere === '«') { dedans = true; continue; }
      if (caractere === '»') { dedans = false; continue; }
      if (!dedans) sortie += caractere;
    }
    return { numero, texte: sortie };
  });
}

/**
 * Les fautes d'une suite de lignes, la même quelle que soit leur provenance.
 *
 * Deux passes, parce que deux formes ne se lisent pas à la même échelle. Le
 * tiret cadratin et la capitale tiennent dans un mot, donc dans une ligne. La
 * date, le qualificatif de plusieurs mots et l'opposition en deux temps
 * traversent le retour à la ligne : un contrôle ligne à ligne les laissait
 * passer dès qu'un paragraphe se coupait au milieu, ce que l'épreuve a montré.
 */
function fautesDesLignes(chemin, lignes) {
  const fautes = [];
  const intensificateur = new RegExp(
    `(?<![A-Za-zÀ-ÿ0-9_])(${INTENSIFICATEURS.join('|')})(?![A-Za-zÀ-ÿ0-9_])`,
    'gi',
  );

  for (const { numero, texte } of lignes) {
    const ou = `${chemin}:${numero}`;
    const extrait = texte.trim();

    if (texte.includes(TIRET_CADRATIN)) {
      fautes.push({ regle: 'tiret-cadratin', ou, extrait });
    }
    for (const trouve of texte.matchAll(CAPITALES)) {
      if (ACRONYMES.includes(trouve[1])) continue;
      fautes.push({ regle: 'emphase', ou, extrait: `« ${trouve[1]} » dans : ${extrait}` });
    }
  }

  const citees = sansCitations(lignes);
  const debuts = [];
  let position = 0;
  for (const { numero, texte } of citees) {
    debuts.push({ debut: position, numero });
    position += texte.length + 1;
  }
  const joint = citees.map(({ texte }) => texte).join(' ');
  const ligneDe = (index) => {
    let trouve = debuts[0] ? debuts[0].numero : 1;
    for (const entree of debuts) {
      if (entree.debut > index) break;
      trouve = entree.numero;
    }
    return trouve;
  };

  for (const [regle, motif] of [
    ['intensificateur', intensificateur],
    ['opposition', OPPOSITION],
    ['datation', DATATION],
  ]) {
    for (const trouve of joint.matchAll(motif)) {
      const autour = joint.slice(Math.max(0, trouve.index - 40), trouve.index + 90).trim();
      fautes.push({
        regle,
        ou: `${chemin}:${ligneDe(trouve.index)}`,
        extrait: `« ${trouve[1] ?? trouve[0]} » dans : ${autour}`,
      });
    }
  }
  return fautes;
}

/** Les fautes d'un document Markdown. */
export function fautesDuDocument(chemin, contenu) {
  return fautesDesLignes(chemin, lignesDeProse(contenu));
}

/** Les fautes des commentaires d'une source. */
export function fautesDeLaSource(chemin, contenu) {
  const lignes = blocsDeCommentaire(contenu).flatMap((bloc) => bloc.lignes);
  return fautesDesLignes(chemin, lignes);
}

/** Les fichiers que le contrôle sait juger, et le juge qui leur convient. */
export function fautesDuFichier(chemin, contenu) {
  if (chemin.endsWith('.md')) return fautesDuDocument(chemin, contenu);
  if (/\.(ts|tsx|mjs|cjs|js)$/.test(chemin)) return fautesDeLaSource(chemin, contenu);
  return [];
}

/** Ce que le contrôle ignore : dépendances, fixtures figées, notes de travail. */
export function horsPerimetre(chemin) {
  return chemin.includes('node_modules/')
    || chemin.includes('/dist/')
    || /(^|\/)fixtures\//.test(chemin);
}

/**
 * Les documents d'autorité, au sens de la table « Où vit quelle règle ».
 *
 * Le contrôle de re-narration ne porte que sur eux. Un `README` de paquet en
 * est écarté parce qu'il est publié seul sur npm et doit se suffire, et une
 * note de travail parce qu'elle ne fait autorité sur rien.
 */
export const AUTORITES = [
  'CONCEPT.md',
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'ROADMAP.md',
  'docs/README.md',
  'docs/FORMAT.md',
  'docs/COMPATIBILITE.md',
  'docs/CHANGELOG-FORMAT.md',
  'docs/POUR-LES-DESIGNERS.md',
  'docs/RECETTE.md',
  'packages/plugin/SPEC.md',
];

/**
 * Longueur, en mots, d'un passage recopié qui n'est plus une mention.
 *
 * `CONTRIBUTING.md` autorise une mention d'une phrase à une autre altitude, et
 * refuse la seconde narration. Vingt-cinq mots consécutifs identiques passent
 * la phrase : à ce point, le texte n'est plus mentionné, il est recopié.
 */
export const MOTS_RECOPIES = 25;

/** Réduit un texte à sa suite de mots, avec la ligne d'où chacun vient. */
function motsAvecLigne(contenu) {
  const suite = [];
  let dansUnBloc = false;
  contenu.split(/\r?\n/).forEach((ligne, index) => {
    if (ligne.trimStart().startsWith('```')) {
      dansUnBloc = !dansUnBloc;
      return;
    }
    if (dansUnBloc || ligne.startsWith('#') || ligne.trimStart().startsWith('|')) return;
    const mots = ligne
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (mots === '') return;
    for (const mot of mots.split(' ')) suite.push({ mot, numero: index + 1 });
  });
  return suite;
}

/**
 * Les passages qu'un document d'autorité recopie d'un autre.
 *
 * Le repérage est une empreinte de n-grammes : chaque fenêtre de
 * `MOTS_RECOPIES` mots normalisés sert de clé, et une clé présente dans deux
 * documents est un passage recopié. Le contrôle est déterministe, il ne juge
 * aucun contenu neuf, et du remplissage ne le fait pas passer.
 *
 * `documents` associe un chemin à son contenu.
 */
export function passagesRecopies(documents) {
  const empreintes = new Map();
  for (const [chemin, contenu] of Object.entries(documents)) {
    const suite = motsAvecLigne(contenu);
    for (let i = 0; i + MOTS_RECOPIES <= suite.length; i += 1) {
      const fenetre = suite.slice(i, i + MOTS_RECOPIES);
      const cle = fenetre.map((entree) => entree.mot).join(' ');
      if (!empreintes.has(cle)) empreintes.set(cle, []);
      empreintes.get(cle).push({ chemin, numero: fenetre[0].numero });
    }
  }

  // Un passage plus long que la fenêtre se retrouve dans chaque fenêtre qui le
  // recouvre. Seule la première est gardée : sans cette fusion, un paragraphe
  // recopié se lirait comme quarante fautes.
  const trouves = [];
  for (const [cle, places] of empreintes) {
    const documentsDistincts = new Set(places.map((place) => place.chemin));
    if (documentsDistincts.size < 2) continue;

    const memePassage = trouves.some((garde) => garde.places.length === places.length
      && garde.places.every((precedent, rang) => precedent.chemin === places[rang].chemin
        && places[rang].numero - precedent.numero <= 4));
    if (memePassage) continue;
    trouves.push({ places, passage: cle });
  }
  return trouves;
}

const MESSAGES = {
  'tiret-cadratin': 'Tiret cadratin employé comme incise. Employer un point, un '
    + 'point-virgule, une virgule, deux points ou une parenthèse. Il reste admis '
    + 'dans un titre et dans une cellule de tableau.',
  emphase: 'Mot mis en capitales pour insister. Le gras fait le même travail '
    + 'dans un document, et rien n’est nécessaire dans un commentaire. Si le mot '
    + 'est un sigle, un type de l’API Figma ou un nom de document, l’ajouter à '
    + 'ACRONYMES dans le même commit.',
  intensificateur: 'Qualificatif que rien n’établit. Écrire le mécanisme observé '
    + 'ou la mesure, ou retirer le mot.',
  opposition: 'Opposition décorative en deux temps. Écrire la règle seule, sans '
    + 'la faire précéder de ce qu’elle n’est pas.',
  datation: 'Date posée sur une décision ou sur un constat. Écrire l’état '
    + 'actuel ; Git date les décisions par construction, et une date recopiée '
    + 'ne se met pas à jour quand la décision change.',
  renarration: 'Passage recopié d’un autre document d’autorité. Une mention '
    + 'd’une phrase à une autre altitude est admise ; une seconde narration ne '
    + 'l’est pas. Garder la narration à l’altitude que la table « Où vit quelle '
    + 'règle » désigne, et renvoyer depuis l’autre.',
};

export function messageDeLaRegle(regle) {
  return MESSAGES[regle] ?? regle;
}

/** Rend les fautes groupées par règle, prêtes à imprimer. */
export function rapport(fautes) {
  const parRegle = new Map();
  for (const faute of fautes) {
    if (!parRegle.has(faute.regle)) parRegle.set(faute.regle, []);
    parRegle.get(faute.regle).push(faute);
  }
  const lignes = [];
  for (const [regle, liste] of parRegle) {
    lignes.push(`${regle} (${liste.length}) : ${messageDeLaRegle(regle)}`);
    for (const faute of liste) lignes.push(`  ${faute.ou} ${faute.extrait}`);
    lignes.push('');
  }
  return lignes.join('\n');
}

const lanceDirectement = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (lanceDirectement) {
  const demandes = process.argv.slice(2);
  const chemins = (demandes.length > 0
    ? demandes.map((brut) => path.relative(racine, path.resolve(brut)).split(path.sep).join('/'))
    : fichiersSuivis()).filter((chemin) => !horsPerimetre(chemin));

  const fautes = [];
  for (const chemin of chemins) {
    const complet = path.join(racine, chemin);
    if (!fs.existsSync(complet) || fs.statSync(complet).isDirectory()) continue;
    fautes.push(...fautesDuFichier(chemin, fs.readFileSync(complet, 'utf8')));
  }

  // La re-narration se juge entre documents, donc seulement quand le contrôle
  // les tient tous. Sur un fichier isolé, comme lors d'une écriture, la
  // comparaison n'aurait rien à comparer.
  if (chemins.filter((chemin) => AUTORITES.includes(chemin)).length === AUTORITES.length) {
    const documents = Object.fromEntries(
      AUTORITES.map((chemin) => [chemin, fs.readFileSync(path.join(racine, chemin), 'utf8')]),
    );
    for (const trouve of passagesRecopies(documents)) {
      fautes.push({
        regle: 'renarration',
        ou: trouve.places.map((place) => `${place.chemin}:${place.numero}`).join(' et '),
        extrait: `« ${trouve.passage} »`,
      });
    }
  }

  if (fautes.length > 0) {
    process.stderr.write(`${rapport(fautes)}\n${fautes.length} faute(s) de style.\n`);
    process.exit(1);
  }
  process.stdout.write('Style conforme.\n');
}
