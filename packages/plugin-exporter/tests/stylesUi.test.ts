/**
 * Le DOM de l'interface et ses feuilles de style doivent parler des mêmes classes.
 *
 * **Ce test existe parce que les deux avaient déjà divergé, dans les deux
 * sens.** `styles.css` portait une règle `.config-title-row` qu'aucun élément
 * ne recevait plus ; à l'inverse, l'UI posait `space-y-1`, `log-panel`,
 * `btn-icon` et surtout `log-info` : cette dernière étant la classe censée
 * distinguer une note d'un avertissement, que rien ne stylisait. Une
 * distinction qu'on croit faire et qu'on ne fait pas est pire qu'une
 * distinction absente : elle se lit comme faite.
 *
 * La loi est celle du socle ; ce test lui donne les sources d'UCM Exporter, ses
 * feuilles et les valeurs de ses gabarits de classe. Les classes fabriquées par
 * gabarit (`btn-` et `log-`) ne sont pas énumérées ici : leurs valeurs sont
 * lues à leur source, pour qu'un niveau de journal ajouté à `LogLevel` réclame
 * sa règle du même geste.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  classesSansRegle,
  couleursHorsDesRoles,
  feuilleDuSocle,
  reglesMortes,
  sourcesDuSocle,
  variantesDeBouton,
  type EntreesLoiDesStyles,
} from 'ucm-plugin-socle/lois/styles';

const racine = path.resolve(__dirname, '..');
const dossierUi = path.join(racine, 'src/ui');

function sourcesUi(): string {
  const fichiers = [
    path.join(dossierUi, 'index.ts'),
    ...fs
      .readdirSync(path.join(dossierUi, 'components'))
      .map((nom) => path.join(dossierUi, 'components', nom)),
    ...sourcesDuSocle(),
  ];
  return fichiers.map((fichier) => fs.readFileSync(fichier, 'utf8')).join('\n');
}

/** Les littéraux d'une déclaration, lus au fichier qui la porte. */
function litterauxDe(motif: RegExp, quoi: string, fichier = 'src/messages.ts'): string[] {
  const source = fs.readFileSync(path.join(racine, fichier), 'utf8');
  const declaration = motif.exec(source);
  assert.ok(declaration, `${quoi} introuvable dans ${fichier}`);
  return [...declaration[1].matchAll(/'([^']+)'/g)].map((trouve) => trouve[1]);
}

const source = sourcesUi();

const ENTREES: EntreesLoiDesStyles = {
  source,
  /** Les deux feuilles, dans l'ordre où le build les concatène. */
  feuille: feuilleDuSocle() + fs.readFileSync(path.join(dossierUi, 'styles.css'), 'utf8'),
  valeursDeGabarit: {
    level: () => litterauxDe(/export type LogLevel =([^;]+);/, 'LogLevel'),
    niveau: () => litterauxDe(/export type LogLevel =([^;]+);/, 'LogLevel'),
    variant: () => variantesDeBouton(source),
    ton: () => litterauxDe(/ {2}ton:([^;]+);/, 'ResumeDepot.ton', 'src/connexion.ts'),
  },
  /** `figma-dark` est posée par l'hôte sur `html`, jamais par ce code. */
  poseesParLHote: new Set(['figma-dark']),
};

test('toute classe posée par l’interface a une règle dans les feuilles', () => {
  const sansRegle = classesSansRegle(ENTREES);
  assert.deepEqual(sansRegle, [], `Classes posées que rien ne stylise : ${sansRegle.join(', ')}`);
});

test('toute classe stylisée est posée quelque part par l’interface', () => {
  const mortes = reglesMortes(ENTREES);
  assert.deepEqual(mortes, [], `Règles visant une classe que rien ne pose : ${mortes.join(', ')}`);
});

test('la feuille n’écrit aucune couleur en dur hors de ses rôles', () => {
  const couleurs = couleursHorsDesRoles(ENTREES.feuille);
  assert.deepEqual(couleurs, [], `Couleurs en dur hors du bloc de rôles : ${couleurs.join(', ')}`);
});
