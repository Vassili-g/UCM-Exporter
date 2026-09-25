/** Le modèle de planche d'une palette ([ARC-07], section 9), sur le récit R1 de W3.6. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { PAIRES, contraste, lireHexa, recetteParDefaut, rgb8VersP3, type Palette, type Recette, type Rgb8 } from 'ucm-couleur';

import { ajouter, nouvellePalette, renommer } from '../src/edition';
import { poserFond } from '../src/configuration';
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
const AVEC_GRILLE = modeleDeCadre(RECETTE, BLEU, 'SRGB', { grille: true });

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
/** Les textes d'un thème que le cadre écrit lui-même : ni spécimen, ni interface d'exemple, ni grille, ni repère de pastille. */
function legendesDuTheme(theme: NoeudCadre): NoeudTexte[] {
  const exclus = new Set(cadres(theme).filter((noeud) => ['spécimen', 'écran de réglages', 'contrastes'].includes(noeud.nom) || /^(soft|vivid)\//.test(noeud.nom) || noeud.nom === 'verdict').flatMap((noeud) => textes(noeud)));
  return textes(theme).filter((noeud) => !exclus.has(noeud));
}

test('[PLA-02] un cadre par palette, nommé du nom de la palette ou de son hexa', () => {
  assert.equal(MODELE.racine.nom, 'Bleu');
  const sansNom = renommer(BLEU, '');
  assert.equal(modeleDeCadre(avec(sansNom), sansNom, 'SRGB').racine.nom, '#1E6FD9');
});

test('[PLA-07] l’en-tête donne le nom et la référence avec son profil, sans version, empreinte ni avertissement', () => {
  const enTete = trouver(MODELE.racine, 'en-tête').enfants as NoeudTexte[];
  assert.deepEqual(enTete.map((noeud) => noeud.contenu), ['Bleu', 'Couleur de référence #1E6FD9 · Vivid · nuance 600']);
  assert.equal(enTete[0].style, 'palette');
  assert.match(MODELE.empreinte, /^[0-9a-f]{8}$/);
  assert.ok(!textes(MODELE.racine).some((noeud) => noeud.contenu.includes(MODELE.empreinte)), 'aucun texte n’imprime l’empreinte');
  assert.ok(!textes(MODELE.racine).some((noeud) => /version|SRGB|sRGB|remplac/i.test(noeud.contenu)), 'ni version, ni espace de couleur, ni avertissement');
});

test('W3.6 : chaque thème dit son fond et son verdict, puis les rampes, les usages, l’interface d’exemple et les contrastes, dans cet ordre', () => {
  const racine = AVEC_GRILLE.racine;
  assert.deepEqual(racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème light', 'thème dark']);
  const sections = trouver(racine, 'thème light').enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet');
  assert.deepEqual(sections, ['en-tête', 'les deux rampes', 'quelle nuance pour quel usage', 'interface d’exemple', 'contrastes']);
  const tete = textes(trouver(trouver(racine, 'thème dark'), 'en-tête')).map((noeud) => noeud.contenu);
  assert.deepEqual(tete, ['Thème Dark · fond #121212', '✓ Toutes les garanties tenues']);
  const echec = trouver(modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB').racine, 'thème light');
  const verdict = textes(trouver(echec, 'verdict'))[0];
  assert.match(verdict.contenu, /^\d+ garanties manquées$/);
  assert.equal(verdict.couleur.hexa, COULEURS_DE_LA_PLANCHE.dangerSombre);
});

test('[PLA-09] chaque thème est peint de son fond, bordé d’un filet visible sur le blanc comme sur le noir, et ses légendes s’y lisent, fond saturé compris', () => {
  const sature = poserFond(RECETTE, 'light', '#FFD84D')!;
  for (const [recette, modele] of [[RECETTE, AVEC_GRILLE], [sature, modeleDeCadre(sature, BLEU, 'SRGB', { grille: true })]] as const) {
    for (const mode of ['light', 'dark'] as const) {
      const theme = trouver(modele.racine, `thème ${mode}`);
      assert.equal(theme.fond?.hexa, recette.fonds[mode]);
      assert.equal(theme.trait?.couleur.hexa, COULEURS_DE_LA_PLANCHE.filet);
      const fond = couleur(recette.fonds[mode]);
      for (const noeud of legendesDuTheme(theme)) assert.ok(contraste(couleur(noeud.couleur.hexa), fond) >= 4.5, `${recette.fonds[mode]} ${noeud.nom} ${noeud.contenu}`);
    }
  }
  for (const fond of ['#FFFFFF', '#121212']) assert.ok(contraste(couleur(COULEURS_DE_LA_PLANCHE.filet), couleur(fond)) >= 3, fond);
});

test('[PLA-10] [MOT-17] les rampes nomment Soft et Vivid ; le ◆ de la référence est dans sa pastille, peinte de ses octets exacts', () => {
  const rampes = trouver(trouver(MODELE.racine, 'thème light'), 'les deux rampes');
  assert.deepEqual(textes(trouver(rampes, 'numéros')).map((noeud) => noeud.contenu), RECETTE.crans.map(String));
  const vivid = trouver(rampes, 'rampe vivid');
  assert.equal((vivid.enfants[0] as NoeudTexte).contenu, 'Vivid');
  assert.equal(vivid.enfants.length, 12, 'le nom et onze nuances');
  const reperes = cadres(MODELE.racine).filter((noeud) => /^(soft|vivid)\//.test(noeud.nom) && noeud.enfants.some((enfant) => enfant.nom === 'référence'));
  assert.deepEqual(reperes.map((noeud) => noeud.nom), ['vivid/light/600', 'vivid/dark/600']);
  const peinte = (nom: string) => MODELE.peints.find((candidate) => candidate.nom === nom)?.hexa;
  assert.equal(peinte('vivid/light/600'), '#1E6FD9');
  assert.equal(peinte('vivid/dark/600'), '#1E6FD9');
  assert.notEqual(peinte('soft/light/600'), '#1E6FD9');
  assert.equal(textes(trouver(vivid, 'colonne 600')).find((noeud) => noeud.nom === 'code')?.contenu, '1E6FD9');
});

test('[PLA-15] une pastille où les deux profils se confondent porte ≈, sur toute nuance, et une note l’explique', () => {
  const confondu = (nom: string) => trouver(MODELE.racine, nom).enfants.some((enfant) => enfant.nom === 'confondu');
  assert.equal(confondu('vivid/light/100'), true);
  assert.equal(confondu('vivid/light/700'), false);
  assert.match(textes(trouver(trouver(MODELE.racine, 'thème light'), 'les deux rampes')).find((noeud) => noeud.nom === 'note')!.contenu, /≈ : Soft et Vivid presque identiques/);
});

test('[PLA-13] un repère de pastille prend le noir ou le blanc, et s’y lit', () => {
  for (const pastille of cadres(MODELE.racine).filter((noeud) => /^(soft|vivid)\/(light|dark)\/\d+$/.test(noeud.nom))) {
    for (const repere of pastille.enfants as NoeudTexte[]) {
      assert.ok(['#000000', '#FFFFFF'].includes(repere.couleur.hexa), pastille.nom);
      assert.ok(contraste(couleur(repere.couleur.hexa), couleur(pastille.fond!.hexa)) >= 4.5, pastille.nom);
    }
  }
});

test('[PLA-14] quarante-quatre pastilles nommées profil/mode/cran, chacune une fois, grille comprise', () => {
  const noms = AVEC_GRILLE.peints.map(({ nom }) => nom);
  assert.equal(noms.length, 44);
  assert.equal(new Set(noms).size, 44);
  assert.equal(AVEC_GRILLE.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa, '#0E5DC6');
});

test('W3.6 : les usages suivent le profil porteur, un état par colonne, default, hover et active ; l’anneau et le séparateur n’en ont qu’un', () => {
  const usages = trouver(trouver(MODELE.racine, 'thème light'), 'quelle nuance pour quel usage');
  assert.equal((usages.enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quel usage · Vivid');
  assert.deepEqual(textes(trouver(usages, 'états')).map((noeud) => noeud.contenu), ['default', 'hover', 'active']);
  const lignes = usages.enfants.filter((noeud) => noeud.nom.startsWith('usage '));
  assert.deepEqual(lignes.map((noeud) => [noeud.nom, (noeud as NoeudCadre).enfants.length - 1]), [
    ['usage surface', 3], ['usage text', 3], ['usage solid', 3], ['usage border-control', 3], ['usage focus', 1], ['usage border-decorative', 1],
  ]);
  const numero = (nom: string) => textes(trouver(usages, nom)).find((noeud) => noeud.nom === 'numéro')!.contenu;
  assert.deepEqual(['text default', 'text hover', 'text active'].map(numero), ['700', '800', '900']);
  assert.equal(numero('focus default'), '600');
  const fondDuSpecimen = trouver(trouver(usages, 'surface default'), 'spécimen').fond?.hexa;
  assert.equal(fondDuSpecimen, MODELE.peints.find(({ nom }) => nom === 'vivid/light/100')?.hexa);
  assert.equal(trouver(trouver(usages, 'border-control hover'), 'spécimen').trait?.couleur.hexa, MODELE.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa);
});

test('W5.5 : chaque paire du moteur se lit dans les usages de chaque thème, avec son sens, son résultat et son ratio', () => {
  for (const mode of ['light', 'dark'] as const) {
    const usages = trouver(trouver(MODELE.racine, `thème ${mode}`), 'quelle nuance pour quel usage');
    const lues = new Set(textes(usages).filter((noeud) => noeud.nom.startsWith('garantie ')).map((noeud) => Number(noeud.nom.slice('garantie '.length))));
    assert.deepEqual([...lues].sort((a, b) => a - b), PAIRES.map(({ numero }) => numero), mode);
  }
  const lignes = (nom: string) => textes(trouver(MODELE.racine, nom)).filter((noeud) => noeud.nom.startsWith('garantie ')).map((noeud) => noeud.contenu);
  assert.deepEqual(lignes('text default'), ['✓ sur fond : 5,76:1', '✓ sur surface 100 : 5,34:1']);
  assert.deepEqual(lignes('surface default'), ['✓ text 700 dessus : 5,34:1', '✓ border-control 600 dessus : 4,19:1', '✓ focus 600 dessus : 4,19:1']);
  assert.deepEqual(lignes('solid default'), ['✓ on-solid dessus : 5,76:1']);
  assert.deepEqual(lignes('border-decorative default'), []);
  const echec = textes(trouver(modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB').racine, 'thème light')).find((noeud) => noeud.nom.startsWith('garantie ') && noeud.contenu.startsWith('✗'))!;
  assert.equal(echec.style, 'chiffre');
  assert.equal(echec.couleur.hexa, COULEURS_DE_LA_PLANCHE.dangerSombre);
});

test('W5.3 : l’interface d’exemple E2 se peint des nuances du profil porteur, dans chaque thème', () => {
  for (const mode of ['light', 'dark'] as const) {
    const ecran = trouver(trouver(MODELE.racine, `thème ${mode}`), 'écran de réglages');
    const nuance = (cran: number) => MODELE.peints.find(({ nom }) => nom === `vivid/${mode}/${cran}`)?.hexa;
    assert.equal(ecran.fond?.hexa, RECETTE.fonds[mode]);
    assert.equal(trouver(ecran, 'enregistrer').fond?.hexa, nuance(700));
    assert.equal(trouver(ecran, 'brouillon').fond?.hexa, nuance(100));
    assert.equal(trouver(ecran, 'anneau').trait?.couleur.hexa, nuance(600));
    assert.equal(trouver(ecran, 'soulignement').remplir, true);
    assert.equal(textes(trouver(ecran, 'enregistrer'))[0].couleur.hexa, RECETTE.fonds[mode], 'on-solid : le fond du thème sur solid');
  }
});

test('[PLA-16] W3.6 : une grille par thème et profil, alignée sur les rampes ; une paire lisible se peint de ses vraies couleurs, une paire sous 3:1 s’efface', () => {
  assert.equal(cadres(MODELE.racine).some((noeud) => noeud.nom === 'contrastes'), false, 'sans l’option, pas de grille');
  const contrastes = trouver(trouver(AVEC_GRILLE.racine, 'thème light'), 'contrastes');
  assert.equal(textes(trouver(contrastes, 'en-tête'))[1].contenu, 'Ligne : fond · colonne : texte · gras dès 4,5:1 · maigre dès 3:1 · effacé en dessous');
  const grille = trouver(contrastes, 'grille light vivid');
  assert.deepEqual(grille.enfants.map((noeud) => noeud.nom), ['teintes vivid', ...RECETTE.crans.map((cran) => `fond ${cran}`)]);
  const hexa = (cran: number) => AVEC_GRILLE.peints.find(({ nom }) => nom === `vivid/light/${cran}`)!.hexa;
  const lisible = trouver(grille, '900/100');
  assert.equal(lisible.fond?.hexa, hexa(900));
  const valeur = (lisible.enfants[0] as NoeudTexte);
  assert.equal(valeur.couleur.hexa, hexa(100));
  assert.equal(valeur.style, 'chiffre');
  assert.equal(valeur.contenu, '10,43');
  const efface = trouver(grille, '100/200');
  assert.notEqual(efface.fond?.hexa, hexa(100));
  assert.equal((efface.enfants[0] as NoeudTexte).style, 'note');
  assert.equal(trouver(grille, '600/600').enfants.length, 0, 'une nuance ne se compare pas à elle-même');
  // Les colonnes de la grille ont la largeur et l'écart de celles de la rampe.
  const rampe = trouver(trouver(AVEC_GRILLE.racine, 'thème light'), 'rampe vivid');
  const ligne = trouver(grille, 'fond 700');
  assert.deepEqual([ligne.espacement, (ligne.enfants[1] as NoeudCadre).largeur], [rampe.espacement, (rampe.enfants[1] as NoeudCadre).largeur]);
});

test('W5.5 W6.6 : une palette libre n’a ni usages ni interface d’exemple ; ses rampes et ses grilles suivent sa liste, et son en-tête le dit', () => {
  const libre: Palette = { ...BLEU, crans: [100, 200, 400, 600, 800, 900] };
  const modele = modeleDeCadre(avec(libre), libre, 'SRGB', { grille: true });
  for (const mode of ['light', 'dark'] as const) {
    const theme = trouver(modele.racine, `thème ${mode}`);
    assert.deepEqual(theme.enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet'), ['en-tête', 'les deux rampes', 'contrastes']);
    assert.equal(textes(trouver(theme, 'verdict'))[0].contenu, 'Palette libre · 6 nuances');
    assert.deepEqual(textes(trouver(theme, 'numéros')).map((noeud) => noeud.contenu), ['100', '200', '400', '600', '800', '900']);
    assert.deepEqual(trouver(theme, `grille ${mode} vivid`).enfants.slice(1).map((noeud) => noeud.nom), ['fond 100', 'fond 200', 'fond 400', 'fond 600', 'fond 800', 'fond 900']);
  }
  assert.deepEqual(modele.peints.filter(({ nom }) => nom.startsWith('vivid/light/')).map(({ nom }) => nom), ['vivid/light/100', 'vivid/light/200', 'vivid/light/400', 'vivid/light/600', 'vivid/light/800', 'vivid/light/900']);
  assert.equal(modele.peints.find(({ nom }) => nom === 'vivid/light/600')?.hexa, '#1E6FD9');
});

test('[PLA-21] tout est en auto layout, sur une trame de 8 px', () => {
  for (const noeud of cadres(AVEC_GRILLE.racine)) {
    assert.ok(['VERTICAL', 'HORIZONTAL'].includes(noeud.direction), noeud.nom);
    assert.equal(noeud.espacement % TRAME, 0, `${noeud.nom} : espacement ${noeud.espacement}`);
    assert.equal(noeud.marge % TRAME, 0, `${noeud.nom} : marge ${noeud.marge}`);
    assert.equal((noeud.margeLaterale ?? 0) % TRAME, 0, `${noeud.nom} : marge latérale ${noeud.margeLaterale}`);
  }
});

test('[PLA-22] V10.8 : six styles nommés, tous employés, et un titre ou un code ne se coupe jamais', () => {
  assert.deepEqual(Object.keys(STYLES_DE_TEXTE), ['palette', 'theme', 'role', 'valeur', 'note', 'chiffre']);
  assert.deepEqual([...new Set(textes(AVEC_GRILLE.racine).map((noeud) => noeud.style))].sort(), ['chiffre', 'note', 'palette', 'role', 'theme', 'valeur']);
  for (const noeud of textes(AVEC_GRILLE.racine).filter((candidat) => ['titre', 'code', 'référence', 'résultat'].includes(candidat.nom))) {
    assert.equal(noeud.largeur, undefined, noeud.contenu);
  }
});

test('[PLA-23] l’en-tête prend les couleurs du plugin, et les légendes d’un thème jamais celles de la palette', () => {
  const constantes = new Set<string>(Object.values(COULEURS_DE_LA_PLANCHE));
  for (const noeud of textes(trouver(MODELE.racine, 'en-tête'))) assert.ok(constantes.has(noeud.couleur.hexa), noeud.nom);
  const palette = new Set(AVEC_GRILLE.peints.map(({ hexa }) => hexa));
  for (const mode of ['light', 'dark'] as const) {
    for (const noeud of legendesDuTheme(trouver(AVEC_GRILLE.racine, `thème ${mode}`))) assert.ok(!palette.has(noeud.couleur.hexa), `${noeud.nom} ${noeud.couleur.hexa}`);
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
  assert.notEqual(AVEC_GRILLE.empreinte, MODELE.empreinte);
  // Le cadre ne montre rien des autres palettes : les renommer ne le touche pas, même proches.
  const voisin = nouvellePalette(VIDE, 'p-0000000d', '#1D6DDB')!;
  const empreinteAvec = (autre: Palette) => modeleDeCadre(avec(BLEU, autre), BLEU, 'SRGB').empreinte;
  assert.equal(empreinteAvec(voisin), empreinteAvec(renommer(voisin, 'Voisin')));
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
  const sans = compterCalques(MODELE.racine);
  const avecGrille = compterCalques(AVEC_GRILLE.racine);
  assert.ok(sans > 300 && sans < 800, String(sans));
  assert.ok(avecGrille > sans + 4 * 110 && avecGrille < 2000, String(avecGrille));
});
