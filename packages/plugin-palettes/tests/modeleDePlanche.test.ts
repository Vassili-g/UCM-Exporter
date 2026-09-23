/** Le modèle de planche d'une palette ([ARC-07], section 9). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { contraste, lireHexa, recetteParDefaut, rgb8VersP3, type Palette, type Recette, type Rgb8 } from 'ucm-couleur';

import { ajouter, nouvellePalette, renommer } from '../src/edition';
import {
  COULEURS_DE_LA_PLANCHE,
  TRAME,
  compterCalques,
  modeleDeCadre,
  peinture,
  type Noeud,
  type NoeudCadre,
  type NoeudTexte,
} from '../src/planche/modele';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9')!, nom: 'Bleu' };
const avec = (...palettes: Palette[]): Recette => palettes.reduce(ajouter, VIDE);
const RECETTE = avec(BLEU);
const MODELE = modeleDeCadre(RECETTE, BLEU, 'SRGB');

function tous(noeud: Noeud): Noeud[] {
  return noeud.type === 'texte' ? [noeud] : [noeud, ...noeud.enfants.flatMap(tous)];
}
const cadres = (racine: NoeudCadre) => tous(racine).filter((noeud): noeud is NoeudCadre => noeud.type === 'cadre');
const textes = (racine: NoeudCadre) => tous(racine).filter((noeud): noeud is NoeudTexte => noeud.type === 'texte');
const trouver = (racine: NoeudCadre, nom: string) => {
  const trouve = cadres(racine).find((noeud) => noeud.nom === nom);
  assert.ok(trouve, `aucun cadre ${nom}`);
  return trouve;
};
const couleur = (hexa: string): Rgb8 => lireHexa(hexa)!;

test('[PLA-02] un cadre par palette, nommé du nom de la palette ou de son hexa', () => {
  assert.equal(MODELE.racine.nom, 'Bleu');
  const sansNom = renommer(BLEU, '');
  assert.equal(modeleDeCadre(avec(sansNom), sansNom, 'SRGB').racine.nom, '#1E6FD9');
});

test('[PLA-07] l’en-tête donne le nom, la version, l’empreinte du modèle, l’espace et les promesses tenues', () => {
  const [titre, recette] = (trouver(MODELE.racine, 'en-tête').enfants as NoeudTexte[]);
  assert.equal(titre.contenu, 'Bleu');
  assert.equal(titre.style, 'titre');
  assert.equal(recette.contenu, `recette v1 · empreinte ${MODELE.empreinte} · sRGB · 56/56 promesses`);
  assert.match(MODELE.empreinte, /^[0-9a-f]{8}$/);
});

test('[PLA-08] la référence montre sa pastille et ses valeurs, et le bouton quand il est plus foncé qu’elle', () => {
  const reference = trouver(MODELE.racine, 'Référence');
  assert.equal(reference.enfants[0].type === 'cadre' && reference.enfants[0].fond?.hexa, '#1E6FD9');
  const valeurs = (reference.enfants[1] as NoeudTexte).contenu;
  assert.match(valeurs, /^#1E6FD9\nL 0,555 · C 0,179 · H 257°\npart de chroma 0,89 · proche du cran 600\nblanc /);
  assert.ok(cadres(reference).some((noeud) => noeud.nom === 'bouton'), '#1E6FD9 est plus clair que le cran 700');
  const sombre = nouvellePalette(VIDE, 'p-0000000b', '#1D4ED8')!;
  assert.ok(!cadres(modeleDeCadre(avec(sombre), sombre, 'SRGB').racine).some((noeud) => noeud.nom === 'bouton'));
});

test('[PLA-09] chaque section est peinte de son fond, et son texte s’y lit', () => {
  for (const mode of ['light', 'dark'] as const) {
    const section = trouver(MODELE.racine, `section ${mode}`);
    assert.equal(section.fond?.hexa, RECETTE.fonds[mode]);
    const fond = couleur(RECETTE.fonds[mode]);
    for (const noeud of textes(section).filter((candidat) => candidat.nom !== 'numéro')) {
      assert.ok(contraste(couleur(noeud.couleur.hexa), fond) >= 4.5, `${mode} ${noeud.nom}`);
    }
  }
});

test('[PLA-10] une rangée porte à gauche son profil et la part de chroma employée', () => {
  const rangee = trouver(trouver(MODELE.racine, 'section light'), 'rangée vivid');
  assert.equal((rangee.enfants[0] as NoeudTexte).contenu, 'vivid\npart 0,95');
  assert.equal(rangee.enfants.length, 12);
});

test('[PLA-11] la légende dit que deux seuils sont des paramètres de conception', () => {
  const legende = textes(trouver(MODELE.racine, 'Légende')).map((noeud) => noeud.contenu).join('\n');
  assert.match(legende, /profilsConfondus 0,02 et palettesProches 0,05 sont des paramètres de conception, pas des seuils d’accessibilité/);
});

test('[PLA-12] une carte écrit le contraste au fond et le seuil tenu, ou un tiret', () => {
  const carte = (nom: string) => (trouver(MODELE.racine, nom).enfants[1] as NoeudTexte).contenu;
  assert.match(carte('carte vivid.700'), /\nfond 5,76 4,5\n/);
  assert.match(carte('carte vivid.50'), /\nfond 1,\d\d –\n/);
});

test('[PLA-13] le numéro d’une pastille prend le noir ou le blanc, et s’y lit', () => {
  for (const pastille of cadres(MODELE.racine).filter((noeud) => /^(soft|vivid)\/(light|dark)\/\d+$/.test(noeud.nom))) {
    const numero = pastille.enfants[0] as NoeudTexte;
    assert.ok(['#000000', '#FFFFFF'].includes(numero.couleur.hexa), pastille.nom);
    assert.ok(contraste(couleur(numero.couleur.hexa), couleur(pastille.fond!.hexa)) >= 4.5, pastille.nom);
  }
});

test('[PLA-14] quarante-quatre pastilles nommées profil/mode/cran, chacune une fois', () => {
  const noms = MODELE.peints.map(({ nom }) => nom);
  assert.equal(noms.length, 44);
  assert.equal(new Set(noms).size, 44);
  assert.ok(noms.includes('vivid/light/700'));
  assert.equal(MODELE.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa, '#0E5DC6');
});

test('[PLA-15] une carte où les deux profils se confondent porte « ≈ », sur tout cran', () => {
  const carte = (nom: string) => (trouver(MODELE.racine, nom).enfants[1] as NoeudTexte).contenu;
  assert.match(carte('carte vivid.100'), /\n≈ soft$/);
  assert.doesNotMatch(carte('carte vivid.700'), /≈/);
});

test('[PLA-17] [PLA-18] quatre tables d’emplois, sept lignes et neuf paires d’état chacune, et leur note', () => {
  const emplois = trouver(MODELE.racine, 'Emplois');
  assert.ok(textes(emplois).some((noeud) => noeud.contenu === 'Ces crans sont ceux que les composants citent, dans toutes les marques.'));
  for (const mode of ['light', 'dark']) {
    for (const profil of ['soft', 'vivid']) {
      const table = trouver(emplois, `emplois ${mode} ${profil}`);
      assert.equal(table.enfants.filter((noeud) => noeud.type === 'cadre' && noeud.nom !== 'titres').length, 7);
      assert.equal(table.enfants.filter((noeud) => noeud.nom.startsWith('paire ')).length, 9);
    }
  }
  const text = trouver(trouver(emplois, 'emplois light vivid'), 'text');
  assert.deepEqual((text.enfants as Noeud[]).map((noeud) => noeud.type === 'texte' ? noeud.contenu : 'spécimen'), [
    'text', 'Texte coloré sur le fond de page', '700', 'spécimen', '5,76', '4,5', 'tenu',
  ]);
});

test('[PLA-21] tout est en auto layout, sur une trame de 8 px', () => {
  for (const noeud of cadres(MODELE.racine)) {
    assert.ok(['VERTICAL', 'HORIZONTAL'].includes(noeud.direction), noeud.nom);
    assert.equal(noeud.espacement % TRAME, 0, `${noeud.nom} : espacement ${noeud.espacement}`);
    assert.equal(noeud.marge % TRAME, 0, `${noeud.nom} : marge ${noeud.marge}`);
  }
});

test('[PLA-22] trois styles de texte, et rien d’autre', () => {
  assert.deepEqual([...new Set(textes(MODELE.racine).map((noeud) => noeud.style))].sort(), ['section', 'titre', 'valeur']);
});

test('[PLA-23] les légendes hors des sections prennent les couleurs du plugin, jamais celles de la palette', () => {
  const constantes = new Set<string>(Object.values(COULEURS_DE_LA_PLANCHE));
  // Seul le spécimen d'une table d'emplois écrit dans les couleurs de la palette.
  for (const nom of ['en-tête', 'Emplois', 'Alertes', 'Légende']) {
    for (const noeud of textes(trouver(MODELE.racine, nom)).filter((candidat) => candidat.nom !== 'spécimen')) {
      assert.ok(constantes.has(noeud.couleur.hexa), `${nom} ${noeud.nom} ${noeud.couleur.hexa}`);
    }
  }
});

test('section 6.7 : la peinture suit le profil du document', () => {
  const bleu = couleur('#1E6FD9');
  assert.deepEqual(peinture(bleu, 'SRGB').composantes, [30 / 255, 111 / 255, 217 / 255]);
  assert.deepEqual(peinture(bleu, 'LEGACY').composantes, [30 / 255, 111 / 255, 217 / 255]);
  assert.deepEqual(peinture(bleu, 'DISPLAY_P3').composantes, [...rgb8VersP3(bleu)]);
  const p3 = modeleDeCadre(RECETTE, BLEU, 'DISPLAY_P3');
  assert.equal(p3.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa, '#0E5DC6', 'l’hexa annoncé ne change pas');
});

test('[PLA-19] E2 : l’empreinte suit ce que le cadre montre, et seulement cela', () => {
  assert.equal(modeleDeCadre(RECETTE, BLEU, 'SRGB').empreinte, MODELE.empreinte, 'stable');
  const renomme = renommer(BLEU, 'Marine');
  assert.notEqual(modeleDeCadre(avec(renomme), renomme, 'SRGB').empreinte, MODELE.empreinte);
  assert.notEqual(modeleDeCadre(RECETTE, BLEU, 'DISPLAY_P3').empreinte, MODELE.empreinte);
  // Une palette lointaine renommée ne touche pas le cadre ; une palette proche le touche, par son alerte.
  const ambre = nouvellePalette(VIDE, 'p-0000000c', '#F2A900')!;
  const voisin = nouvellePalette(VIDE, 'p-0000000d', '#1D6DDB')!;
  const empreinteAvec = (autre: Palette) => modeleDeCadre(avec(BLEU, autre), BLEU, 'SRGB').empreinte;
  assert.equal(empreinteAvec(ambre), empreinteAvec(renommer(ambre, 'Ambre')));
  assert.notEqual(empreinteAvec(voisin), empreinteAvec(renommer(voisin, 'Voisin')));
});

test('[PLA-24] le compte de calques d’un cadre, relevé pour le temps de dessin', () => {
  const calques = compterCalques(MODELE.racine);
  assert.ok(calques > 200 && calques < 1000, String(calques));
  const avecGrille = compterCalques(modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).racine);
  assert.ok(avecGrille > calques + 4 * 121, String(avecGrille));
});
