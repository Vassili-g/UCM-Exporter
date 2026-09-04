/**
 * Le jeu N-1 est figé, et ce test est ce qui le fige.
 *
 * Le moteur ne fabrique que la version courante : ces contrats sont donc la
 * seule donnée réelle d'une version que plus rien ne produit, et leur valeur
 * tient entièrement à leur immobilité. Un réexport, une reformulation ou une
 * conversion de fin de ligne les rendrait inutiles sans rien casser d'autre —
 * l'échec ne se verrait qu'au moment où quelqu'un croirait mesurer la
 * compatibilité N-1 sur des contrats devenus N.
 *
 * Ce n'est pas un test du moteur, et il ne doit jamais le devenir : comparer
 * ces fichiers à une sortie du moteur rouvrirait exactement le défaut que
 * `AGENTS.md` interdit — un instantané qui ne bouge qu'au réexport ne prouve
 * que sa propre immobilité.
 *
 * Les empreintes ne sont pas recopiées ici : elles sont LUES dans le README
 * voisin, qui reste leur unique domicile. Une empreinte corrigée d'un seul
 * côté ne peut donc pas passer.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dossier = path.resolve(__dirname, '..', 'fixtures', 'contrats', '11.0');

/** Version que ce jeu documente. Le dossier la porte déjà dans son nom. */
const VERSION_FIGEE = '11.0';

/** Empreintes publiées par le README, seule autorité sur ce que valent ces octets. */
function empreintesPubliees(): Map<string, string> {
  const readme = fs.readFileSync(path.join(dossier, 'README.md'), 'utf8');
  const table = new Map<string, string>();
  for (const [, somme, nom] of readme.matchAll(/^([0-9a-f]{64})\s+(\S+\.contract\.json)$/gm)) {
    table.set(nom, somme);
  }
  return table;
}

const publiees = empreintesPubliees();
const presents = fs
  .readdirSync(dossier)
  .filter((nom) => nom.endsWith('.contract.json'))
  .sort();

test('le README publie une empreinte pour chaque contrat figé, et réciproquement', () => {
  assert.deepEqual(presents, [...publiees.keys()].sort());
  assert.ok(presents.length > 0, 'le jeu N-1 a disparu du dossier');
});

for (const nom of presents) {
  test(`${nom} est intact, en 11.0 et en LF`, () => {
    const octets = fs.readFileSync(path.join(dossier, nom));

    assert.equal(
      createHash('sha256').update(octets).digest('hex'),
      publiees.get(nom),
      `${nom} a changé depuis son gel. S'il a été réexporté, il n'est plus N-1 : `
        + `le geste juste est de le retirer du jeu, pas de rafraîchir son empreinte.`,
    );

    assert.ok(
      !octets.includes(0x0d),
      `${nom} porte des CRLF. Le moteur écrit des LF (serializeJson.ts) ; `
        + `vérifier la règle .gitattributes plutôt que le fichier.`,
    );

    const contrat = JSON.parse(octets.toString('utf8'));
    assert.equal(contrat.meta.contractVersion, VERSION_FIGEE);
  });
}
