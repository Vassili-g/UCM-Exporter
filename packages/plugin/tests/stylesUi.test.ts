/**
 * Le DOM de l'interface et sa feuille de style doivent parler des mêmes classes.
 *
 * **Ce test existe parce que les deux avaient déjà divergé, dans les deux
 * sens.** `styles.css` portait une règle `.config-title-row` qu'aucun élément
 * ne recevait plus ; à l'inverse, l'UI posait `space-y-1`, `log-panel`,
 * `btn-icon` et surtout `log-info` — cette dernière étant la classe censée
 * distinguer une note d'un avertissement, que rien ne stylisait. Une
 * distinction qu'on croit faire et qu'on ne fait pas est pire qu'une
 * distinction absente : elle se lit comme faite.
 *
 * Les deux sens sont vérifiés. Les classes fabriquées par gabarit — `btn-` et
 * `log-` — ne sont pas énumérées ici : leurs valeurs sont LUES à leur source,
 * pour qu'un niveau de journal ajouté à `LogLevel` réclame sa règle du même
 * geste.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const dossierUi = path.join(racine, 'src/ui');

/** `figma-dark` est posée par l'hôte sur `html`, jamais par ce code (U1.8). */
const POSEES_PAR_FIGMA = new Set(['figma-dark']);

function sourcesUi(): string {
  const fichiers = [
    path.join(dossierUi, 'index.js'),
    ...fs
      .readdirSync(path.join(dossierUi, 'components'))
      .map((nom) => path.join(dossierUi, 'components', nom)),
  ];
  return fichiers.map((fichier) => fs.readFileSync(fichier, 'utf8')).join('\n');
}

const source = sourcesUi();
const feuille = fs.readFileSync(path.join(dossierUi, 'styles.css'), 'utf8');

/** Les niveaux de journal, lus dans le domicile unique des messages. */
function niveauxDeJournal(): string[] {
  const declaration = /export type LogLevel =([^;]+);/.exec(
    fs.readFileSync(path.join(racine, 'src/messages.ts'), 'utf8'),
  );
  assert.ok(declaration, 'LogLevel introuvable dans messages.ts');
  return [...declaration[1].matchAll(/'([^']+)'/g)].map((trouve) => trouve[1]);
}

/** Les variantes de bouton : leur défaut, et chaque valeur passée à `createButton`. */
function variantesDeBouton(): string[] {
  const defaut = /variant = '([^']+)'/.exec(source);
  const passees = [...source.matchAll(/variant: '([^']+)'/g)].map((trouve) => trouve[1]);
  return [...new Set([...(defaut ? [defaut[1]] : []), ...passees])];
}

/** Toutes les classes que l'UI peut poser : littérales, puis fabriquées. */
function classesPosees(): Set<string> {
  const posees = new Set<string>();
  for (const affectation of source.matchAll(/className = '([^']+)'/g)) {
    for (const classe of affectation[1].split(/\s+/)) posees.add(classe);
  }
  // Les gabarits : `btn btn-${variant}` donne `btn`, puis une classe par valeur.
  for (const gabarit of source.matchAll(/className = `([^`]+)`/g)) {
    for (const morceau of gabarit[1].split(/\s+/)) {
      const fabrique = /^([a-z-]+)-\$\{(\w+)\}$/.exec(morceau);
      if (!fabrique) {
        posees.add(morceau);
        continue;
      }
      const valeurs = fabrique[2] === 'level' ? niveauxDeJournal() : variantesDeBouton();
      assert.ok(valeurs.length > 0, `aucune valeur trouvée pour ${morceau}`);
      for (const valeur of valeurs) posees.add(`${fabrique[1]}-${valeur}`);
    }
  }
  return posees;
}

/** Les classes que la feuille stylise, hors pseudo-classes et sélecteurs d'attribut. */
function classesStylisees(): Set<string> {
  const sansCommentaires = feuille.replace(/\/\*[\s\S]*?\*\//g, '');
  const stylisees = new Set<string>();
  for (const selecteur of sansCommentaires.matchAll(/\.([a-z][\w-]*)/g)) stylisees.add(selecteur[1]);
  return stylisees;
}

test('toute classe posée par l’interface a une règle dans styles.css', () => {
  const stylisees = classesStylisees();
  const sansRegle = [...classesPosees()].filter((classe) => !stylisees.has(classe));
  assert.deepEqual(
    sansRegle,
    [],
    `Classes posées que rien ne stylise : ${sansRegle.join(', ')}`,
  );
});

test('toute classe stylisée est posée quelque part par l’interface', () => {
  const posees = classesPosees();
  const mortes = [...classesStylisees()].filter(
    (classe) => !posees.has(classe) && !POSEES_PAR_FIGMA.has(classe),
  );
  assert.deepEqual(mortes, [], `Règles visant une classe que rien ne pose : ${mortes.join(', ')}`);
});

test('la feuille n’écrit aucune couleur en dur hors de ses rôles', () => {
  // Les replis vivent dans le bloc de rôles, en tête de fichier, et NULLE PART
  // ailleurs (U1.8) : une couleur écrite dans une règle est un repli que
  // personne ne relira au moment de vérifier les deux thèmes.
  const apresLesRoles = feuille.slice(feuille.indexOf('* {'));
  const couleurs = [...apresLesRoles.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((trouve) => trouve[0]);
  assert.deepEqual(couleurs, [], `Couleurs en dur hors du bloc de rôles : ${couleurs.join(', ')}`);
});
