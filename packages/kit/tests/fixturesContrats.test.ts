/**
 * Ce test vérifie que les contrats figés n'ont pas bougé.
 *
 * Le moteur ne fabrique que la version courante : ces contrats sont donc la
 * seule donnée réelle d'une version que plus rien ne produit, et leur valeur
 * tient entièrement à leur immobilité. Un réexport, une reformulation ou une
 * conversion de fin de ligne les rendrait inutiles sans rien casser d'autre :
 * l'échec ne se verrait qu'au moment où quelqu'un croirait mesurer la
 * compatibilité N-1 sur des contrats devenus N.
 *
 * Ce n'est pas un test du moteur, et il ne doit jamais le devenir : comparer
 * ces fichiers à une sortie du moteur rouvrirait exactement le défaut que
 * `AGENTS.md` interdit, un instantané qui ne bouge qu'au réexport ne prouve
 * que sa propre immobilité.
 *
 * Les empreintes ne sont pas recopiées ici : elles sont lues dans le README
 * voisin, qui reste leur unique domicile. Une empreinte corrigée d'un seul
 * côté ne peut donc pas passer.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Le kit est un paquet ESM : `__dirname` n'y existe pas.
const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..', 'fixtures', 'contrats');

/** Chaque jeu figé porte, dans le nom de son dossier, la version qu'il documente. */
const versions = fs
  .readdirSync(racine, { withFileTypes: true })
  .filter((entree) => entree.isDirectory())
  .map((entree) => entree.name)
  .sort();

/** Empreintes publiées par le README d'un jeu, seule autorité sur ce que valent ces octets. */
function empreintesPubliees(dossier: string): Map<string, string> {
  const readme = fs.readFileSync(path.join(dossier, 'README.md'), 'utf8');
  const table = new Map<string, string>();
  for (const [, somme, nom] of readme.matchAll(/^([0-9a-f]{64})\s+(\S+\.contract\.json)$/gm)) {
    table.set(nom, somme);
  }
  return table;
}

test('chaque jeu figé est un dossier nommé par sa version', () => {
  assert.ok(versions.length > 0, 'aucun jeu figé dans fixtures/contrats');
  for (const version of versions) assert.match(version, /^\d+\.\d+$/, version);
});

for (const version of versions) {
  const dossier = path.join(racine, version);
  const publiees = empreintesPubliees(dossier);
  const presents = fs
    .readdirSync(dossier)
    .filter((nom) => nom.endsWith('.contract.json'))
    .sort();

  test(`le README ${version} publie une empreinte pour chaque contrat figé, et réciproquement`, () => {
    assert.deepEqual(presents, [...publiees.keys()].sort());
    assert.ok(presents.length > 0, `le jeu ${version} a disparu du dossier`);
  });

  for (const nom of presents) {
    test(`${version}/${nom} est intact, en ${version} et en LF`, () => {
      const octets = fs.readFileSync(path.join(dossier, nom));

      assert.equal(
        createHash('sha256').update(octets).digest('hex'),
        publiees.get(nom),
        `${nom} a changé depuis son gel. S'il a été réexporté, il ne documente plus `
          + `la ${version} : le geste juste est de le retirer du jeu, pas de rafraîchir `
          + `son empreinte.`,
      );

      assert.ok(
        !octets.includes(0x0d),
        `${nom} porte des CRLF. Le moteur écrit des LF (serializeJson.ts) ; `
          + `vérifier la règle .gitattributes plutôt que le fichier.`,
      );

      const contrat = JSON.parse(octets.toString('utf8'));
      assert.equal(contrat.meta.contractVersion, version);
    });
  }
}
