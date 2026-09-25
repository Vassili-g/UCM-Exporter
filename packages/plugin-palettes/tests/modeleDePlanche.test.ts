/** Le modèle de planche d'une palette ([ARC-07], section 9). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { contraste, lireHexa, recetteParDefaut, rgb8VersP3, type Palette, type Recette, type Rgb8 } from 'ucm-couleur';

import { ajouter, nouvellePalette, renommer } from '../src/edition';
import {
  COULEURS_DE_LA_PLANCHE,
  STYLES_DE_TEXTE,
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
/** La courbe claire descend à 0,55 au cran 700 : text sur surface manque 4,5 en clair, dans les deux profils. */
const RECETTE_EN_ECHEC: Recette = { ...RECETTE, courbes: { ...RECETTE.courbes, light: RECETTE.courbes.light.map((clarte, rang) => (rang === 7 ? 0.55 : clarte)) } };
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

test('[PLA-07] V10.1 : l’en-tête donne le nom, la référence avec son profil et le résultat Soft et Vivid, sans version, empreinte ni avertissement', () => {
  const enTete = trouver(MODELE.racine, 'en-tête').enfants as NoeudTexte[];
  assert.deepEqual(enTete.map((noeud) => noeud.contenu), ['Bleu', 'Couleur de référence #1E6FD9 · Vivid · nuance 600', 'Garanties : Soft ✓ · Vivid ✓']);
  assert.equal(enTete[0].style, 'palette');
  assert.match(MODELE.empreinte, /^[0-9a-f]{8}$/);
  assert.ok(!textes(MODELE.racine).some((noeud) => noeud.contenu.includes(MODELE.empreinte)), 'aucun texte n’imprime l’empreinte');
  assert.ok(!textes(MODELE.racine).some((noeud) => /version|SRGB|sRGB|remplac/i.test(noeud.contenu)), 'ni version, ni espace de couleur, ni avertissement');
  const echec = modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB');
  assert.match((trouver(echec.racine, 'en-tête').enfants[2] as NoeudTexte).contenu, /^Garanties : Soft ✗ \d+ · Vivid ✗ \d+$/);
});

test('[PLA-08] V10.2 : la référence montre sa pastille, son code, son profil porteur, un tableau légendé des contrastes et ses mesures à part', () => {
  const reference = trouver(MODELE.racine, 'Couleur de référence');
  assert.equal(reference.enfants[0].type === 'cadre' && reference.enfants[0].fond?.hexa, '#1E6FD9');
  const contenu = (nom: string) => textes(reference).find((noeud) => noeud.nom === nom)!.contenu;
  assert.equal(contenu('code'), '#1E6FD9');
  assert.equal(contenu('porteur'), 'Profil porteur : Vivid · nuance 600');
  const tableau = trouver(reference, 'Contrastes de la couleur de référence');
  assert.deepEqual(tableau.enfants.filter((noeud) => noeud.type === 'cadre').map((noeud) => noeud.nom), ['titres', 'Blanc', 'Noir', 'Fond du thème Light', 'Fond du thème Dark']);
  assert.deepEqual(textes(trouver(tableau, 'Blanc')).map((noeud) => noeud.contenu), ['Blanc', '4,84:1', 'Texte courant : AA · éléments graphiques : Minimum 3:1 atteint']);
  assert.equal(textes(trouver(reference, 'Mesures avancées'))[1].contenu, 'Luminosité L : 0,555 · chroma C : 0,179 · teinte H : 257° · intensité : 0,89\nCSS : oklch(0.555 0.179 257)');
});

test('V10.2 : une palette de base choisie se lit sous le profil porteur', () => {
  const forcee = { ...BLEU, base: 'soft' as const };
  const porteur = textes(modeleDeCadre(avec(forcee), forcee, 'SRGB').racine).find((noeud) => noeud.nom === 'porteur')!.contenu;
  assert.match(porteur, /^Profil porteur : Soft · nuance \d+(.*)?\nPalette de base : Soft, choisie pour cette palette$/);
});

test('[PLA-09] V10.4 : chaque section est peinte de son fond, bordée d’un filet visible sur le blanc comme sur le noir, et son texte s’y lit', () => {
  for (const mode of ['light', 'dark'] as const) {
    const section = trouver(MODELE.racine, `section ${mode}`);
    assert.equal(section.fond?.hexa, RECETTE.fonds[mode]);
    assert.equal(section.trait?.couleur.hexa, COULEURS_DE_LA_PLANCHE.filet);
    const fond = couleur(RECETTE.fonds[mode]);
    for (const noeud of textes(section).filter((candidat) => candidat.nom !== 'numéro' && candidat.nom !== 'référence')) {
      assert.ok(contraste(couleur(noeud.couleur.hexa), fond) >= 4.5, `${mode} ${noeud.nom}`);
    }
  }
  for (const fond of ['#FFFFFF', '#121212']) assert.ok(contraste(couleur(COULEURS_DE_LA_PLANCHE.filet), couleur(fond)) >= 3, fond);
});

test('[PLA-10] V10.3 : une rangée nomme Soft ou Vivid, sans part de chroma, et le repère de la référence est dans sa pastille', () => {
  const rangee = trouver(trouver(MODELE.racine, 'section light'), 'rangée vivid');
  assert.equal((rangee.enfants[0] as NoeudTexte).contenu, 'Vivid');
  assert.equal(rangee.enfants.length, 13, 'le nom, la colonne on-solid et onze nuances');
  const reperes = cadres(MODELE.racine).filter((noeud) => /^(soft|vivid)\//.test(noeud.nom) && noeud.enfants.some((enfant) => enfant.nom === 'référence' && enfant.type === 'texte'));
  assert.deepEqual(reperes.map((noeud) => noeud.nom), ['vivid/light/600', 'vivid/dark/600']);
});

test('[PLA-11] V10.9 : la légende explique la lecture d’une garantie et Soft et Vivid, sans nom interne de seuil', () => {
  const legende = textes(trouver(MODELE.racine, 'Lire les valeurs')).map((noeud) => noeud.contenu).join('\n');
  assert.match(legende, /Lire une garantie : chaque ligne nomme deux rôles/);
  assert.match(legende, /Soft et Vivid : chaque état montre deux spécimens/);
  assert.match(legende, /un écart sous 0,02 entre Soft et Vivid, ou sous 0,05 entre deux palettes/);
  assert.doesNotMatch(legende, /profilsConfondus|palettesProches|nonTexte|chromaGrise/);
});

test('[PLA-12] V10.5 : une carte donne son code, ses rôles en nom du design system et en français, et son contraste au fond avec son niveau', () => {
  const carte = (nom: string) => (trouver(MODELE.racine, nom).enfants[1] as NoeudTexte).contenu;
  assert.equal(carte('carte vivid.700'), '#0E5DC6\nsolid · fond plein\ntext · texte coloré\nborder-control · bordure de champ · survol\nFond 5,76:1 · AA');
  assert.match(carte('carte vivid.50'), /\nFond 1,\d\d:1 · Insuffisant(\n|$)/);
  assert.doesNotMatch(carte('carte vivid.700'), /Luminosité|blanc|noir/i, 'ni L, C, H, ni blanc, ni noir');
});

test('[PLA-15] une carte où les deux profils se confondent le dit, sur toute nuance', () => {
  const carte = (nom: string) => (trouver(MODELE.racine, nom).enfants[1] as NoeudTexte).contenu;
  assert.match(carte('carte vivid.100'), /\nTrès proche de Soft$/);
  assert.doesNotMatch(carte('carte vivid.700'), /Très proche/);
});

test('V10.5 : la pastille on-solid précède les rampes, peinte du fond du thème et tiretée, et deux lignes d’accolades nomment les rôles', () => {
  for (const mode of ['light', 'dark'] as const) {
    const section = trouver(MODELE.racine, `section ${mode}`);
    const pastille = trouver(section, `on-solid/${mode}`);
    assert.equal(pastille.fond?.hexa, RECETTE.fonds[mode]);
    assert.equal(pastille.trait?.tirets, true);
    assert.equal(trouver(section, 'rangée soft').enfants[1].nom, 'carte on-solid');
    assert.equal(trouver(section, 'rangée vivid').enfants[1].nom, 'espace', 'la seconde rangée garde la colonne, sans répéter la pastille');
    const accolades = section.enfants.filter((noeud) => noeud.nom.startsWith('accolades '));
    assert.equal(accolades.length, 2);
    const roles = textes(section).filter((noeud) => noeud.nom === 'rôle').map((noeud) => noeud.contenu);
    assert.deepEqual(roles, ['on-solid', 'surface', 'solid · text', 'border-decorative', 'border-control · focus']);
  }
  assert.ok(!MODELE.peints.some(({ nom }) => nom.startsWith('on-solid')), 'le fond du thème n’est pas une nuance comparée à l’aperçu');
});

test('[PLA-17] [PLA-18] V10.6 : par thème, deux groupes par minimum, une ligne par association, chaque état avec ses spécimens Soft et Vivid', () => {
  for (const mode of ['light', 'dark'] as const) {
    const garanties = trouver(MODELE.racine, `garanties ${mode}`);
    assert.ok(textes(garanties).some((noeud) => noeud.contenu === 'Chaque rôle correspond au même numéro de nuance dans toutes les palettes de marque.'));
    const lignes = cadres(garanties).filter((noeud) => noeud.nom.startsWith('garantie '));
    assert.equal(lignes.length, 8, 'huit associations');
    const etats = cadres(garanties).filter((noeud) => noeud.nom.startsWith('état '));
    assert.equal(etats.length, 14, 'les quatorze paires du moteur');
    for (const etat of etats) assert.deepEqual(etat.enfants.slice(1).map((noeud) => noeud.nom), ['soft', 'vivid']);
    assert.deepEqual(textes(trouver(garanties, 'groupe texte')).filter((noeud) => noeud.nom === 'rôles').map((noeud) => noeud.contenu), ['text sur fond', 'text sur surface', 'on-solid sur solid']);
    assert.ok(textes(garanties).some((noeud) => noeud.contenu === 'border-decorative 300 · séparateur, sans minimum de contraste'));
  }
  const textSurface = textes(trouver(MODELE.racine, 'garantie text/surface')).filter((noeud) => noeud.nom === 'mesure').map((noeud) => noeud.contenu);
  assert.deepEqual(textSurface, [
    'Soft · 700 / 100 · ✓ 5,19:1', 'Vivid · 700 / 100 · ✓ 5,34:1',
    'Soft · 800 / 200 · ✓ 6,41:1', 'Vivid · 800 / 200 · ✓ 6,54:1',
    'Soft · 900 / 300 · ✓ 7,37:1', 'Vivid · 900 / 300 · ✓ 7,54:1',
  ]);
  assert.match(textes(trouver(MODELE.racine, 'garantie on-solid/solid')).find((noeud) => noeud.nom === 'mesure')!.contenu, /^Soft · fond \/ 700 · /);
});

test('V10.6 : le spécimen pose le premier rôle sur le second : un texte, un aplat ou un contour', () => {
  const garanties = trouver(MODELE.racine, 'garanties light');
  const premier = (cle: string) => trouver(garanties, `garantie ${cle}`);
  const specimen = (cle: string) => cadres(premier(cle)).find((noeud) => noeud.nom === 'spécimen')!;
  assert.equal(specimen('text/surface').enfants[0].type, 'texte');
  assert.equal(specimen('solid/fond').enfants[0].nom, 'aplat');
  assert.equal((specimen('border-control/surface').enfants[0] as NoeudCadre).trait?.epaisseur, 2);
  assert.equal(specimen('text/surface').fond!.hexa, MODELE.peints.find(({ nom }) => nom === 'soft/light/100')?.hexa, 'le second membre peint le fond du spécimen');
});

test('V10.7 : une grille par thème et profil, titrée, numérotée sur ses deux axes, avec sa légende en mots et sa distinction des garanties', () => {
  const avecGrille = modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).racine;
  const grilles = trouver(avecGrille, 'Grilles de contraste');
  assert.match(textes(grilles).find((noeud) => noeud.nom === 'note')!.contenu, /ne sont pas des garanties/);
  assert.equal(textes(grilles).find((noeud) => noeud.nom === 'légende')!.contenu, 'Vert : au moins 4,5:1, pour du texte. Jaune : au moins 3:1, pour un élément visible ou du grand texte. Gris : en dessous de 3:1.');
  const grille = trouver(grilles, 'grille dark vivid');
  assert.equal((grille.enfants[0] as NoeudTexte).contenu, 'Thème Dark · Vivid');
  const axe = trouver(grille, 'axe');
  assert.deepEqual(axe.enfants.slice(1).map((noeud) => textes(noeud as NoeudCadre)[0].contenu), RECETTE.crans.map(String));
  const ligne = trouver(grille, 'ligne 700');
  assert.equal(textes(ligne.enfants[0] as NoeudCadre)[0].contenu, '700');
  assert.equal(ligne.enfants.length, 12);
});

test('[MOT-17] la planche peint la référence exacte à la nuance que son bloc désigne, dans les deux thèmes', () => {
  const peinte = (nom: string) => MODELE.peints.find((candidate) => candidate.nom === nom)?.hexa;
  assert.equal(peinte('vivid/light/600'), '#1E6FD9');
  assert.equal(peinte('vivid/dark/600'), '#1E6FD9');
  assert.notEqual(peinte('soft/light/600'), '#1E6FD9');
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

test('[PLA-21] tout est en auto layout, sur une trame de 8 px', () => {
  for (const noeud of cadres(MODELE.racine)) {
    assert.ok(['VERTICAL', 'HORIZONTAL'].includes(noeud.direction), noeud.nom);
    assert.equal(noeud.espacement % TRAME, 0, `${noeud.nom} : espacement ${noeud.espacement}`);
    assert.equal(noeud.marge % TRAME, 0, `${noeud.nom} : marge ${noeud.marge}`);
  }
});

test('[PLA-22] V10.8 : cinq styles nommés, du titre de palette à la note, et rien d’autre', () => {
  assert.deepEqual(Object.keys(STYLES_DE_TEXTE), ['palette', 'theme', 'role', 'valeur', 'note']);
  assert.deepEqual([...new Set(textes(modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).racine).map((noeud) => noeud.style))].sort(), ['note', 'palette', 'role', 'theme', 'valeur']);
  // Un titre, un code ou un résultat n'a pas de largeur fixe : il ne se coupe jamais.
  for (const noeud of textes(MODELE.racine).filter((candidat) => ['titre', 'code', 'garanties', 'référence'].includes(candidat.nom))) {
    assert.equal(noeud.largeur, undefined, noeud.contenu);
  }
});

test('[PLA-23] les légendes hors des sections prennent les couleurs du plugin, jamais celles de la palette', () => {
  const constantes = new Set<string>(Object.values(COULEURS_DE_LA_PLANCHE));
  // Seul le spécimen d'une garantie écrit dans les couleurs de la palette.
  for (const nom of ['en-tête', 'garanties light', 'garanties dark', 'Points à vérifier', 'Lire les valeurs']) {
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

test('V10.10 : les styles de texte entrent dans l’empreinte, et un cadre dessiné avant ce modèle est à mettre à jour', () => {
  const avant = STYLES_DE_TEXTE.valeur.taille;
  (STYLES_DE_TEXTE.valeur as { taille: number }).taille = avant + 1;
  try {
    assert.notEqual(modeleDeCadre(RECETTE, BLEU, 'SRGB').empreinte, MODELE.empreinte);
  } finally {
    (STYLES_DE_TEXTE.valeur as { taille: number }).taille = avant;
  }
  assert.equal(modeleDeCadre(RECETTE, BLEU, 'SRGB').empreinte, MODELE.empreinte);
});

test('[PLA-24] le compte de calques d’un cadre, relevé pour le temps de dessin', () => {
  const calques = compterCalques(MODELE.racine);
  assert.ok(calques > 200 && calques < 1000, String(calques));
  const avecGrille = compterCalques(modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true }).racine);
  assert.ok(avecGrille > calques + 4 * 121, String(avecGrille));
});
