/** Refuse dans le moteur toute écriture ou création de nœud Figma. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(racine, 'src');

/**
 * Le balayage exclut `src/ui`. L'interface s'exécute dans une iframe où le
 * global `figma` est absent, donc aucune des portes listées ci-dessous n'y est
 * atteignable, et ses `appendChild` construisent le panneau du plugin.
 *
 * Ses demandes au sandbox passent par `UiRequest`, dont un seul membre écrit
 * dans le document : `creer-regles`. `messages.ts` porte cette liste, et le
 * commentaire de ce membre dit ce qu'il écrit.
 */
const HORS_SANDBOX = path.join(SOURCE, 'ui');

/**
 * Le seul fichier du moteur qui écrit dans le document.
 *
 * Un dossier entier exclu laisserait un fichier de lecture ajouté plus tard
 * échapper au balayage sans que rien ne le dise : `src/template/modele.ts` et
 * `src/template/sources.ts` restent donc balayés, et c'est ce qui garde
 * l'écriture dans un seul fichier.
 */
const FICHIER_QUI_ECRIT = path.join(SOURCE, 'template', 'ecriture.ts');

/**
 * Les appels qui écrivent dans le document, et eux seuls.
 *
 * La liste est nommément courte : elle vise les portes d'écriture de l'API, pas
 * tout ce qui ressemble à une mutation. `figma.currentPage.selection = …` n'y
 * est pas, et son absence est une décision écrite, pas un oubli. L'affectation
 * de `.name` et de `.visible` n'y est pas non plus : le moteur écrit ces deux
 * noms sur ses propres objets, et le motif lèverait des faux positifs.
 *
 * Borne : la loi lit la source ligne par ligne. Une écriture par
 * `Object.assign`, par crochets (`node['x'] = …`) ou répartie sur deux lignes
 * lui échappe.
 */
const ECRITURES: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.create[A-Z]\w*\s*\(/, quoi: 'création de node' },
  {
    motif: /figma\.(union|subtract|intersect|exclude|flatten)\s*\(/,
    quoi: 'création de node par opération booléenne',
  },
  { motif: /\.createInstance\s*\(/, quoi: "création d'instance" },
  { motif: /\.clone\s*\(/, quoi: 'copie de node' },
  { motif: /\.detachInstance\s*\(/, quoi: "détachement d'instance" },
  {
    motif: /\.(setProperties|swapComponent|removeOverrides|resetOverrides|resetSlot)\s*\(/,
    quoi: "écriture d'instance",
  },
  { motif: /figma\.combineAsVariants\s*\(/, quoi: 'création de component set' },
  { motif: /figma\.group\s*\(|figma\.ungroup\s*\(/, quoi: 'regroupement de nodes' },
  { motif: /figma\.commitUndo\s*\(|figma\.triggerUndo\s*\(/, quoi: "entrée d'annulation" },
  { motif: /figma\.variables\.create[A-Z]\w*\s*\(/, quoi: 'écriture de variable' },
  { motif: /figma\.saveVersionHistoryAsync\s*\(/, quoi: "écriture d'historique" },
  { motif: /\.setPluginData\s*\(|\.setSharedPluginData\s*\(/, quoi: 'écriture de plugin data' },
  { motif: /\.remove\s*\(\s*\)/, quoi: 'suppression de node' },
  { motif: /\.appendChild\s*\(|\.insertChild\s*\(/, quoi: 'déplacement de node' },
  {
    motif: /\.(insertCharacters|deleteCharacters|setRange[A-Z]\w*)\s*\(/,
    quoi: 'écriture de texte',
  },
  // Une affectation, précédée ou non d'un opérateur (`+=`), jamais une
  // comparaison : `==`, `<=` et `>=` ne s'y lisent pas.
  { motif: /\.characters\s*[-+*/]?=(?!=)/, quoi: 'écriture de texte' },
  { motif: /\.(x|y)\s*[-+*/]?=(?!=)/, quoi: 'position de node' },
  { motif: /\.mainComponent\s*=(?!=)/, quoi: "remplacement d'instance" },
  {
    motif: /\.(layoutSizingHorizontal|layoutSizingVertical)\s*=(?!=)/,
    quoi: 'dimensionnement de node',
  },
];

function fichiersSource(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (chemin === HORS_SANDBOX || chemin === FICHIER_QUI_ECRIT) return [];
    if (entree.isDirectory()) return fichiersSource(chemin);
    return entree.isFile() && chemin.endsWith('.ts') ? [chemin] : [];
  });
}

/** Tous les fichiers du sandbox, exclusions comprises, pour lire leurs imports. */
function tousLesFichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (chemin === HORS_SANDBOX) return [];
    if (entree.isDirectory()) return tousLesFichiers(chemin);
    return entree.isFile() && chemin.endsWith('.ts') ? [chemin] : [];
  });
}

/** Les chemins importés par un fichier, tels qu'ils sont écrits. */
function importsDe(fichier: string): string[] {
  return [...fs.readFileSync(fichier, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((trouve) => trouve[1]);
}

test('le moteur n’écrit jamais dans le document Figma', () => {
  const fichiers = fichiersSource(SOURCE);
  // Une liste vide passerait ce test sans rien contrôler : un dossier renommé
  // désarmerait le filet en silence.
  assert.ok(fichiers.length > 20, `seulement ${fichiers.length} fichiers balayés`);
  // Renommer `src/ui` sans toucher à ce test rend le balayage rouge, ce qui se
  // voit. La faute inverse, un dossier de sandbox qui passerait sous
  // l'exclusion, ne se verrait pas ; ces deux assertions la refusent.
  assert.ok(fs.existsSync(HORS_SANDBOX), `${HORS_SANDBOX} n'existe plus : l'exclusion vise le vide`);
  assert.ok(
    fichiers.every((fichier) => !fichier.startsWith(HORS_SANDBOX + path.sep)),
    'un fichier de l’interface a été balayé',
  );
  // Le fichier qui écrit est nommé, jamais son dossier : renommé, il redevient
  // balayé et la loi le dit. Et il reste le seul, hors de l'interface.
  assert.ok(
    fs.existsSync(FICHIER_QUI_ECRIT),
    `${FICHIER_QUI_ECRIT} n'existe plus : l'exclusion vise le vide`,
  );
  assert.deepEqual(
    tousLesFichiers(SOURCE).filter((fichier) => !fichiers.includes(fichier)),
    [FICHIER_QUI_ECRIT],
    'un second fichier du moteur est exclu de la loi',
  );

  const fautifs: string[] = [];
  for (const fichier of fichiers) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      // Un commentaire a le droit de nommer ce qu'on s'interdit : c'est même
      // souvent là qu'on explique pourquoi.
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const { motif, quoi } of ECRITURES) {
        if (!motif.test(ligne)) continue;
        fautifs.push(`${path.relative(racine, fichier)}:${rang + 1} — ${quoi}`);
      }
    });
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} appel(s) écriraient dans le document Figma. L'analyse et la `
      + `publication n'y écrivent pas ; un seul geste le fait, la création des règles `
      + `d'usage, et il vit dans src/template/ecriture.ts. Si cette règle doit changer, `
      + `elle se change ici et dans packages/plugin-exporter/SPEC.md, jamais par un appel `
      + `ajouté ailleurs :\n`
      + fautifs.map((f) => `  ${f}`).join('\n'),
  );
});

/**
 * Les modules qui ne doivent jamais atteindre l'écriture.
 *
 * Le moteur de lecture et le chemin de publication n'ont aucune raison de
 * poser un node. Leur interdire l'import est ce qui garde l'écriture derrière
 * une seule porte, `creerRegles` dans `code.ts` : sans ce test, un import
 * ajouté dans `depot.ts` passerait la loi ci-dessus, qui ne lit que des appels.
 */
const SANS_TEMPLATE = [
  path.join(SOURCE, 'contract'),
  path.join(SOURCE, 'tokens'),
  path.join(SOURCE, 'forges'),
  path.join(SOURCE, 'depot.ts'),
  path.join(SOURCE, 'prevol.ts'),
];

test('l’écriture n’est atteignable que par code.ts', () => {
  const fichiers = tousLesFichiers(SOURCE);
  const importeurs = fichiers.filter(
    (fichier) => importsDe(fichier).some((cible) => /(^|\/)template\/ecriture$/.test(cible)),
  );
  assert.deepEqual(
    importeurs.map((fichier) => path.relative(SOURCE, fichier)),
    ['code.ts'],
    'un autre fichier que code.ts atteint l’écriture',
  );

  const fautifs = fichiers
    .filter((fichier) => SANS_TEMPLATE.some(
      (interdit) => fichier === interdit || fichier.startsWith(interdit + path.sep),
    ))
    .filter((fichier) => importsDe(fichier).some((cible) => cible.includes('template/')))
    .map((fichier) => path.relative(SOURCE, fichier));
  assert.deepEqual(fautifs, [], 'la lecture et la publication n’importent pas le template');
});

test('le template charge une page à la fois, et n’importe rien par clé', () => {
  // D5 : le parcours des sources charge une page à la fois, par
  // `PageNode.loadAsync`. Charger le document entier ferait payer au designer
  // des pages que l'arrêt à la première source lui épargne, et un maître ne se
  // rapatrie pas par sa clé. Les deux appels sont donc refusés dans tout le
  // dossier, écriture comprise.
  const fautifs: string[] = [];
  for (const fichier of tousLesFichiers(path.join(SOURCE, 'template'))) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      if (/loadAllPagesAsync|importComponentByKeyAsync/.test(ligne)) {
        fautifs.push(`${path.relative(racine, fichier)}:${rang + 1}`);
      }
    });
  }
  assert.deepEqual(fautifs, [], 'le template quitte la page active');
});

test('le drapeau des calques invisibles se restaure, et aucun await ne le traverse', () => {
  // `visibilityOfLayer` tire la politique d'icône d'un calque masqué. Le drapeau
  // à `true` rend ce calque introuvable : laissé posé, ou posé de part et
  // d'autre d'un `await`, il fait publier à une analyse concurrente une
  // politique que le designer n'a pas choisie.
  //
  // Borne : la loi lit le texte d'un seul fichier, entre la première pose et la
  // première restauration. Elle ne suit pas le graphe d'appels, et rendre
  // asynchrone une fonction appelée depuis ce bloc la laisserait verte. Ce que
  // le bloc appelle est donc gardé court, et nommé dans le commentaire de
  // `sourceDeLaPage`.
  const porteurs = tousLesFichiers(SOURCE).filter(
    (fichier) => /skipInvisibleInstanceChildren/.test(fs.readFileSync(fichier, 'utf8')),
  );
  assert.deepEqual(
    porteurs.map((fichier) => path.relative(SOURCE, fichier)),
    [path.join('template', 'sources.ts')],
    'un autre fichier pose skipInvisibleInstanceChildren',
  );

  const source = fs.readFileSync(porteurs[0], 'utf8');
  const pose = source.indexOf('figma.skipInvisibleInstanceChildren = true');
  const restauration = source.indexOf('figma.skipInvisibleInstanceChildren = avant');
  assert.ok(pose !== -1, 'la pose du drapeau ne se lit pas sous sa forme attendue');
  assert.ok(restauration > pose, 'le drapeau n’est pas restauré après sa pose');
  assert.equal(
    /\bawait\b/.test(source.slice(pose, restauration)),
    false,
    'un await traverse la pose du drapeau',
  );
});
