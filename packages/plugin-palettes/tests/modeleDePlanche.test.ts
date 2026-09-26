/** Le modèle de planche d'une palette ([ARC-07], section 9), sur le récit R1 de W3.6. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { PAIRES, contraste, lireHexa, recetteParDefaut, rgb8VersP3, type Palette, type Recette, type Rgb8 } from 'ucm-couleur';

import { ajouter, choisirLesIntensites, nouvellePalette, renommer } from '../src/edition';
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
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Bleu' };
const avec = (...palettes: Palette[]): Recette => palettes.reduce(ajouter, VIDE);
const RECETTE = avec(BLEU);
/** La courbe claire descend à 0,55 au cran 700 : text sur surface manque 4,5 en clair, dans les deux profils. */
const RECETTE_EN_ECHEC: Recette = { ...RECETTE, courbes: { ...RECETTE.courbes, light: RECETTE.courbes.light.map((clarte, rang) => (rang === 7 ? 0.55 : clarte)) } };
/** La recette, sans les grilles de contrastes sur la planche ([PLA-28]). */
const SANS_GRILLES: Recette = { ...RECETTE, contenuDesPlanches: { ...RECETTE.contenuDesPlanches, grilles: false } };
const MODELE = modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB');
const AVEC_GRILLE = modeleDeCadre(RECETTE, BLEU, 'SRGB');

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
/** Les textes d'un thème que le cadre écrit lui-même : ni spécimen, ni grille, ni repère de pastille. */
function legendesDuTheme(theme: NoeudCadre): NoeudTexte[] {
  const exclus = new Set(cadres(theme).filter((noeud) => ['spécimen', 'contrastes'].includes(noeud.nom) || /^(soft|vivid)\//.test(noeud.nom) || noeud.nom === 'verdict').flatMap((noeud) => textes(noeud)));
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

test('W3.6 [UI-14] : chaque thème dit son fond et son verdict, puis les rampes, les usages et les contrastes, dans cet ordre, sans interface d’exemple', () => {
  const racine = AVEC_GRILLE.racine;
  assert.deepEqual(racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème light', 'thème dark']);
  const sections = trouver(racine, 'thème light').enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet');
  assert.deepEqual(sections, ['en-tête', 'les deux rampes', 'quelle nuance pour quel usage soft', 'quelle nuance pour quel usage vivid', 'contrastes']);
  assert.equal(cadres(racine).some((noeud) => noeud.nom === 'écran de réglages'), false, 'l’écran de réglages est dans l’onglet Palettes, pas sur la planche');
  const tete = textes(trouver(trouver(racine, 'thème dark'), 'en-tête')).map((noeud) => noeud.contenu);
  assert.deepEqual(tete, ['Thème Dark · fond #121212', '✓ Toutes les garanties tenues']);
  const echec = trouver(modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB').racine, 'thème light');
  const verdict = textes(trouver(echec, 'verdict'))[0];
  assert.match(verdict.contenu, /^\d+ garanties manquées$/);
  assert.equal(verdict.couleur.hexa, COULEURS_DE_LA_PLANCHE.dangerSombre);
});

test('[PLA-09] chaque thème est peint de son fond, bordé d’un filet visible sur le blanc comme sur le noir, et ses légendes s’y lisent, fond saturé compris', () => {
  const sature = poserFond(RECETTE, 'light', '#FFD84D')!;
  for (const [recette, modele] of [[RECETTE, AVEC_GRILLE], [sature, modeleDeCadre(sature, BLEU, 'SRGB')]] as const) {
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

/** Les usages d'un profil dans un thème ([PLA-18]). */
const usagesDe = (racine: NoeudCadre, mode: 'light' | 'dark', profil: 'soft' | 'vivid') => trouver(trouver(racine, `thème ${mode}`), `quelle nuance pour quel usage ${profil}`);

test('[PLA-18] W3.6 X6 : les usages de chaque profil, Soft puis Vivid, un état par colonne, default, hover et active ; la carte, l’anneau et le séparateur n’en ont qu’un', () => {
  assert.equal((usagesDe(MODELE.racine, 'light', 'soft').enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quel usage · Soft');
  const usages = usagesDe(MODELE.racine, 'light', 'vivid');
  assert.equal((usages.enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quel usage · Vivid');
  assert.deepEqual(textes(trouver(usages, 'états')).map((noeud) => noeud.contenu), ['default', 'hover', 'active']);
  const lignes = usages.enfants.filter((noeud) => noeud.nom.startsWith('usage '));
  assert.deepEqual(lignes.map((noeud) => [noeud.nom, (noeud as NoeudCadre).enfants.length - 1]), [
    ['usage surface-card', 1], ['usage surface', 3], ['usage text', 3], ['usage solid', 3], ['usage border-control', 3], ['usage focus', 1], ['usage border-decorative', 1],
  ]);
  const numero = (nom: string) => textes(trouver(usages, nom)).find((noeud) => noeud.nom === 'numéro')!.contenu;
  assert.deepEqual(['text default', 'text hover', 'text active'].map(numero), ['700', '800', '900']);
  assert.equal(numero('focus default'), '600');
  assert.equal(numero('surface-card default'), '50');
  assert.equal(trouver(trouver(usages, 'surface-card default'), 'spécimen').fond?.hexa, MODELE.peints.find(({ nom }) => nom === 'vivid/light/50')?.hexa);
  const fondDuSpecimen = trouver(trouver(usages, 'surface default'), 'spécimen').fond?.hexa;
  assert.equal(fondDuSpecimen, MODELE.peints.find(({ nom }) => nom === 'vivid/light/100')?.hexa);
  assert.equal(trouver(trouver(usages, 'border-control hover'), 'spécimen').trait?.couleur.hexa, MODELE.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa);
});

test('X6 [VER-05] : une liste sans 50 n’a ni la ligne « Fonds de carte » ni ses garanties, et la planche se construit', () => {
  const sans50: Recette = { ...RECETTE, crans: RECETTE.crans.slice(1), courbes: { light: RECETTE.courbes.light.slice(1), dark: RECETTE.courbes.dark.slice(1) } };
  const usages = usagesDe(modeleDeCadre(sans50, BLEU, 'SRGB').racine, 'light', 'vivid');
  const lignes = usages.enfants.filter((noeud) => noeud.nom.startsWith('usage ')).map((noeud) => noeud.nom);
  assert.equal(lignes.includes('usage surface-card'), false);
  assert.equal(textes(usages).some((noeud) => noeud.nom === 'garantie 15' || noeud.nom === 'garantie 16'), false);
});

test('W5.5 [VER-13] : chaque paire du moteur se lit dans les usages de chaque thème, avec son sens, son résultat, son ratio et son niveau WCAG', () => {
  for (const mode of ['light', 'dark'] as const) {
    const usages = usagesDe(MODELE.racine, mode, 'vivid');
    const lues = new Set(textes(usages).filter((noeud) => noeud.nom.startsWith('garantie ')).map((noeud) => Number(noeud.nom.slice('garantie '.length))));
    assert.deepEqual([...lues].sort((a, b) => a - b), PAIRES.map(({ numero }) => numero), mode);
  }
  const lignes = (nom: string) => textes(trouver(usagesDe(MODELE.racine, 'light', 'vivid'), nom)).filter((noeud) => noeud.nom.startsWith('garantie ')).map((noeud) => noeud.contenu);
  assert.deepEqual(lignes('text default'), ['✓ sur fond : 5,76:1 · AA', '✓ sur surface 100 : 5,34:1 · AA', '✓ sur surface-card 50 : 5,76:1 · AA']);
  // Un élément graphique n'a que AA : 4,19:1 ne se juge pas en texte courant.
  assert.deepEqual(lignes('surface default'), ['✓ text 700 dessus : 5,34:1 · AA', '✓ border-control 600 dessus : 4,19:1 · AA', '✓ focus 600 dessus : 4,19:1 · AA']);
  assert.deepEqual(lignes('solid default'), ['✓ on-solid dessus : 5,76:1 · AA']);
  assert.deepEqual(lignes('border-decorative default'), []);
  const echec = textes(trouver(modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB').racine, 'thème light')).find((noeud) => noeud.nom.startsWith('garantie ') && noeud.contenu.startsWith('✗'))!;
  assert.equal(echec.style, 'chiffre');
  assert.equal(echec.couleur.hexa, COULEURS_DE_LA_PLANCHE.dangerSombre);
});

test('[PLA-16] [VER-13] : une grille par thème et profil, alignée sur les rampes ; une paire lisible se peint de ses vraies couleurs avec son niveau de texte, une paire sous 3:1 s’efface', () => {
  assert.equal(cadres(MODELE.racine).some((noeud) => noeud.nom === 'contrastes'), false, 'sans l’option, pas de grille');
  const contrastes = trouver(trouver(AVEC_GRILLE.racine, 'thème light'), 'contrastes');
  assert.equal(textes(trouver(contrastes, 'en-tête'))[1].contenu, 'Ligne : fond · colonne : texte · gras dès 4,5:1 · maigre dès 3:1 · effacé en dessous · AA dès 4,5:1 · AAA dès 7:1');
  const grille = trouver(contrastes, 'grille light vivid');
  assert.deepEqual(grille.enfants.map((noeud) => noeud.nom), ['teintes vivid', ...RECETTE.crans.map((cran) => `fond ${cran}`)]);
  const hexa = (cran: number) => AVEC_GRILLE.peints.find(({ nom }) => nom === `vivid/light/${cran}`)!.hexa;
  const lisible = trouver(grille, '900/100');
  assert.equal(lisible.fond?.hexa, hexa(900));
  const valeur = (lisible.enfants[0] as NoeudTexte);
  assert.equal(valeur.couleur.hexa, hexa(100));
  assert.equal(valeur.style, 'chiffre');
  assert.equal(valeur.contenu, '10,43 AAA');
  const aa = cadres(grille).find((noeud) => /^\d+\/\d+$/.test(noeud.nom) && (noeud.enfants[0] as NoeudTexte | undefined)?.contenu.endsWith(' AA'));
  assert.ok(aa, 'une paire entre 4,5:1 et 7:1 porte AA');
  const sansNiveau = cadres(grille).filter((noeud) => /^\d+\/\d+$/.test(noeud.nom) && noeud.enfants.length > 0).map((noeud) => (noeud.enfants[0] as NoeudTexte).contenu).filter((contenu) => !/ AAA?$/.test(contenu));
  assert.ok(sansNiveau.length > 0 && sansNiveau.every((contenu) => /^\d+,\d\d$/.test(contenu)), 'sous 4,5:1, le ratio seul');
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
  const modele = modeleDeCadre(avec(libre), libre, 'SRGB');
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
  assert.equal(modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB').empreinte, MODELE.empreinte, 'stable');
  const renomme = renommer(BLEU, 'Marine');
  assert.notEqual(modeleDeCadre(avec(renomme), renomme, 'SRGB').empreinte, MODELE.empreinte);
  assert.notEqual(modeleDeCadre(SANS_GRILLES, BLEU, 'DISPLAY_P3').empreinte, MODELE.empreinte);
  assert.notEqual(AVEC_GRILLE.empreinte, MODELE.empreinte);
  // Le cadre ne montre rien des autres palettes : les renommer ne le touche pas, même proches.
  const voisin = nouvellePalette(VIDE, 'p-0000000d', '#1D6DDB', 2)!;
  const empreinteAvec = (autre: Palette) => modeleDeCadre(avec(BLEU, autre), BLEU, 'SRGB').empreinte;
  assert.equal(empreinteAvec(voisin), empreinteAvec(renommer(voisin, 'Voisin')));
});

test('V10.10 : les styles de texte entrent dans l’empreinte, et un cadre dessiné avant ce modèle est à mettre à jour', () => {
  const avant = STYLES_DE_TEXTE.valeur.taille;
  (STYLES_DE_TEXTE.valeur as { taille: number }).taille = avant + 1;
  try {
    assert.notEqual(modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB').empreinte, MODELE.empreinte);
  } finally {
    (STYLES_DE_TEXTE.valeur as { taille: number }).taille = avant;
  }
  assert.equal(modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB').empreinte, MODELE.empreinte);
});

test('[PLA-24] le compte de calques d’un cadre, relevé pour le temps de dessin', () => {
  const sans = compterCalques(MODELE.racine);
  const avecGrille = compterCalques(AVEC_GRILLE.racine);
  assert.ok(sans > 600 && sans < 1000, String(sans));
  assert.ok(avecGrille > sans + 4 * 110 && avecGrille < 2100, String(avecGrille));
});

/** Bleu à une intensité, la même référence. */
const BLEU_SEUL = choisirLesIntensites(RECETTE, BLEU, 1);
const RECETTE_SEULE = avec(BLEU_SEUL);

test('[PLA-14] [ENT-14] Y5.5 : une palette à une intensité ne montre ni rampe absente ni nom de profil ; ses pastilles se nomment mode/cran', () => {
  const modele = modeleDeCadre(RECETTE_SEULE, BLEU_SEUL, 'SRGB');
  const noms = modele.peints.map(({ nom }) => nom);
  assert.equal(noms.length, 22);
  assert.ok(noms.every((nom) => /^(light|dark)\/\d+$/.test(nom)), noms.join(' '));
  assert.equal(modele.peints.find(({ nom }) => nom === 'light/600')?.hexa, '#1E6FD9');
  for (const mode of ['light', 'dark'] as const) {
    const theme = trouver(modele.racine, `thème ${mode}`);
    assert.deepEqual(theme.enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet'), ['en-tête', 'la rampe', 'quelle nuance pour quel usage', 'contrastes']);
    assert.equal(textes(trouver(theme, 'la rampe')).find((noeud) => noeud.nom === 'titre')?.contenu, 'La rampe');
    assert.equal((trouver(theme, 'quelle nuance pour quel usage').enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quel usage');
    assert.ok(cadres(theme).some((noeud) => noeud.nom === `grille ${mode}`));
  }
  assert.ok(!textes(modele.racine).some((noeud) => /\b(Soft|Vivid)\b/.test(noeud.contenu)), 'aucun nom de profil');
  assert.ok(!cadres(modele.racine).some((noeud) => /\b(soft|vivid)\b/.test(noeud.nom)), 'aucun calque de profil');
  assert.equal((trouver(modele.racine, 'en-tête').enfants[1] as NoeudTexte).contenu, 'Couleur de référence #1E6FD9 · nuance 600');
  assert.ok(!textes(trouver(trouver(modele.racine, 'thème light'), 'la rampe')).some((noeud) => noeud.contenu.includes('≈')), 'la note n’explique pas ≈');
});

test('[PLA-18] Y5.5 : deux palettes à deux intensités donnent deux cadres de même structure, quelle que soit la saturation de leur référence', () => {
  const sauge = { ...nouvellePalette(VIDE, 'p-0000000e', '#A0B599', 2)!, nom: 'Sauge' };
  const recette = avec(BLEU, sauge);
  const structure = (noeud: Noeud): unknown => (noeud.type === 'texte' ? 'texte' : [noeud.nom.replace(/^(Bleu|Sauge)$/, 'palette').replace(/\d+/g, 'n'), noeud.enfants.map(structure)]);
  const bleu = modeleDeCadre(recette, BLEU, 'SRGB');
  const deSauge = modeleDeCadre(recette, sauge, 'SRGB');
  // Le ◆ et ≈ changent de pastille d'une référence à l'autre : on compare les sections, pas le contenu des pastilles.
  const sections = (racine: NoeudCadre) => trouver(racine, 'thème light').enfants.map((noeud) => noeud.nom);
  assert.deepEqual(sections(deSauge.racine), sections(bleu.racine));
  assert.deepEqual(structure(usagesDe(deSauge.racine, 'dark', 'soft')), structure(usagesDe(bleu.racine, 'dark', 'soft')));
  assert.equal(textes(trouver(usagesDe(deSauge.racine, 'light', 'vivid'), 'surface default')).find((noeud) => noeud.nom === 'libellé')?.contenu, 'Fond léger', 'le spécimen de surface ne se lit pas comme un profil');
});

test('[PLA-28] Y5.5 : chaque partie retirée disparaît du modèle et change l’empreinte ; l’en-tête et les rampes restent', () => {
  const complet = AVEC_GRILLE;
  const sans = (partie: 'note' | 'usages' | 'grilles' | 'light' | 'dark') =>
    modeleDeCadre({ ...RECETTE, contenuDesPlanches: { ...RECETTE.contenuDesPlanches, [partie]: false } }, BLEU, 'SRGB');
  const nomsDe = (modele: ReturnType<typeof sans>) => cadres(modele.racine).map((noeud) => noeud.nom);
  for (const partie of ['note', 'usages', 'grilles', 'light', 'dark'] as const) {
    const modele = sans(partie);
    assert.notEqual(modele.empreinte, complet.empreinte, partie);
    assert.ok(nomsDe(modele).includes('en-tête') && nomsDe(modele).includes('les deux rampes'), `${partie} : en-tête et rampes`);
  }
  assert.ok(!textes(sans('note').racine).some((noeud) => noeud.nom === 'note'));
  assert.ok(!nomsDe(sans('usages')).some((nom) => nom.startsWith('quelle nuance')));
  assert.ok(!nomsDe(sans('grilles')).includes('contrastes'));
  assert.deepEqual(sans('light').racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème dark']);
  assert.deepEqual(sans('dark').racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème light']);
});

test('[PLA-24] Y5.4 : les calques du cadre de Bleu, toutes parties dessinées, à une et à deux intensités', () => {
  // Relevé du lot Y5.4 : 1 966 calques à deux intensités, 1 008 à une ; 1 632 pour le cadre d'avant, qui montrait un seul profil d'usages.
  assert.equal(compterCalques(AVEC_GRILLE.racine), 1966);
  assert.equal(compterCalques(modeleDeCadre(RECETTE_SEULE, BLEU_SEUL, 'SRGB').racine), 1008);
});
