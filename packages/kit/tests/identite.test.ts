/**
 * L'arbitre de l'identité d'un contrat.
 *
 * Ce que ces tests protègent tient en une asymétrie : refuser à tort bloque un
 * designer, qui voit le message et renomme ; accepter à tort écrase un contrat
 * sans un mot. Les cas ci-dessous sont donc écrits dans les deux sens — ce qui
 * DOIT passer autant que ce qui doit être refusé —, parce qu'un garde-fou qui
 * ne refuserait rien et un garde-fou qui refuserait tout sont aussi inutiles
 * l'un que l'autre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { comparerIdentiteDeContrat } from '../src/format/identite';

/** Un contrat réduit à ce que la comparaison regarde. */
function contrat(
  name: string,
  figma: { nodeId?: string; componentKey?: string; fileName?: string },
) {
  return { name, meta: { contractVersion: '1.0.0', figma: { fileName: 'DS', ...figma } } };
}

test('deux composants Figma différents au même chemin sont une collision', () => {
  // Le cas de la tâche : « Icon / Button » et « IconButton » se projettent tous
  // deux sur l'identifiant `IconButton`, donc sur le même fichier.
  const verdict = comparerIdentiteDeContrat(
    contrat('Icon / Button', { nodeId: '12:345' }),
    contrat('IconButton', { nodeId: '67:890' }),
  );
  assert.equal(verdict.verdict, 'distinct');
  assert.equal(verdict.arbitre, 'nodeId');
  // Le refus doit pouvoir NOMMER les deux composants : un message qui dit
  // seulement « collision » ne se corrige pas.
  assert.equal(verdict.nomExistant, 'Icon / Button');
  assert.equal(verdict.nomCandidat, 'IconButton');
});

test('le même composant réexporté passe, même renommé dans Figma', () => {
  // La raison pour laquelle `name` n'est pas l'arbitre : c'est exactement ce
  // qu'un renommage change alors que le composant n'a pas bougé.
  const verdict = comparerIdentiteDeContrat(
    contrat('Icon / Button', { nodeId: '12:345' }),
    contrat('IconButton', { nodeId: '12:345' }),
  );
  assert.equal(verdict.verdict, 'meme');
  assert.equal(verdict.arbitre, 'nodeId');
});

test('la clé de publication prime sur le nœud quand les deux contrats la portent', () => {
  // Une copie du fichier Figma conserve les ids de nœud. La clé, elle, désigne
  // le composant publié : c'est le signal le plus fort, et il passe devant.
  const verdict = comparerIdentiteDeContrat(
    contrat('Button', { nodeId: '12:345', componentKey: 'abc' }),
    contrat('Button', { nodeId: '12:345', componentKey: 'def' }),
  );
  assert.equal(verdict.verdict, 'distinct');
  assert.equal(verdict.arbitre, 'componentKey');
});

test('la cascade redescend au nœud dès qu’un seul côté porte la clé', () => {
  // Dépublier un composant de sa bibliothèque lui retire sa clé sans le rendre
  // autre. Comparer un champ présent d'un seul côté ne dirait rien.
  const verdict = comparerIdentiteDeContrat(
    contrat('Button', { nodeId: '12:345', componentKey: 'abc' }),
    contrat('Button', { nodeId: '12:345' }),
  );
  assert.equal(verdict.verdict, 'meme');
  assert.equal(verdict.arbitre, 'nodeId');
});

test('le nom du fichier Figma ne vote pas', () => {
  // Renommer le fichier Figma est un geste courant. Le laisser décider ferait
  // refuser tous les réexports suivants — un coût certain contre une
  // coïncidence qui demanderait deux accidents simultanés.
  const verdict = comparerIdentiteDeContrat(
    contrat('Button', { nodeId: '12:345', fileName: 'Design System' }),
    contrat('Button', { nodeId: '12:345', fileName: 'Design System v2' }),
  );
  assert.equal(verdict.verdict, 'meme');
});

test('un contrat sans identité Figma lisible est indécidable, jamais « le même »', () => {
  // Écrit à la main, ou par un autre outil. Répondre « le même » ici
  // écraserait le travail de quelqu'un en silence — le défaut que ce module
  // existe pour supprimer.
  for (const existant of [
    { name: 'Button' },
    { name: 'Button', meta: {} },
    { name: 'Button', meta: { figma: {} } },
    { name: 'Button', meta: { figma: { nodeId: '   ' } } },
    'pas un objet',
    null,
    [],
  ]) {
    const verdict = comparerIdentiteDeContrat(existant, contrat('Button', { nodeId: '12:345' }));
    assert.equal(verdict.verdict, 'indecidable', JSON.stringify(existant));
    assert.equal(verdict.arbitre, null);
  }
});

test('une entrée douteuse est jugée, pas levée', () => {
  // Un garde-fou qui explose sur une entrée inattendue ne garde plus rien : il
  // remplace un refus lisible par une trace de pile.
  assert.doesNotThrow(() => comparerIdentiteDeContrat(undefined, undefined));
  assert.equal(comparerIdentiteDeContrat(undefined, undefined).verdict, 'indecidable');
});
