/** Les textes validés : blocages, refus de validation, messages, aperçu et niveaux WCAG. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, PAIRES, classerRecette, recetteParDefaut, verifierPromesses, type Alerte, type Promesse } from 'ucm-couleur';

import { nouvellePalette } from '../src/edition';

import type { GroupeDePromesses } from '../src/presentation';
import {
  TEXTES_DES_GARANTIES,
  consequenceSurLaPlanche,
  constatDAlerte,
  constatDeGroupe,
  dessinInterrompu,
  ecartDePeinture,
  ligneDesValeurs,
  genererLesPalettesPasAJour,
  genererToutesLesPalettes,
  jugementDuSeuil,
  lignesDeNature,
  niveauEcrit,
  nommerChamp,
  premierGesteDeLaFiche,
  recetteFuture,
  recetteIllisible,
  resultatDuProfil,
  resultatDuProfilEnMots,
  resumeDeLaDerive,
  resumeDesIntensites,
  texteDuRefus,
  titreDeGroupe,
  verdict,
} from '../src/ui/textes';

test('un chemin de champ s’écrit en mots du designer', () => {
  assert.equal(nommerChamp('crans[3]'), '4e nuance');
  assert.equal(nommerChamp('crans[0]'), '1re nuance');
  assert.equal(nommerChamp('courbes.light[5]'), 'Luminosité du thème Light, 6e nuance');
  assert.equal(nommerChamp('fonds.dark'), 'Fond du thème Dark');
  assert.equal(nommerChamp('palettes[1].derive.soft.clair'), 'Palette 2, dérive de teinte, soft, côté clair');
  assert.equal(nommerChamp('seuils.texte'), 'Minimum ou seuil : texte');
  assert.equal(nommerChamp(''), 'Palettes et réglages');
});

test('W6.3 : un refus du format 3 nomme la palette, la nuance fautive et le geste', () => {
  assert.equal(nommerChamp('palettes[1].crans[2]'), 'Palette 2, 3e nuance');
  assert.equal(nommerChamp('palettes[0].originale'), 'Palette 1, couleur de référence d’origine');
  assert.equal(
    texteDuRefus({ regle: 'crans-libres-numeros', chemin: 'palettes[0].crans[1]', valeur: 225 }),
    'Palette 1, 2e nuance : « 225 » n’est pas accepté. Utilisez un multiple de 50 entre 50 et 1050, plus grand que le numéro précédent.',
  );
  assert.equal(texteDuRefus({ regle: 'crans-libres-nombre', chemin: 'palettes[0].crans', valeur: 3 }), 'Palette 1, nuances de la palette libre : choisissez entre 4 et 13 nuances. Nombre trouvé : 3.');
});

test('un refus porte le champ et la valeur, virgule décimale', () => {
  assert.equal(
    texteDuRefus({ regle: 'courbe-claire-decroissante', chemin: 'courbes.light[5]', valeur: 0.8 }),
    'Luminosité du thème Light, 6e nuance : la luminosité doit être inférieure à celle de la nuance précédente. Valeur reçue : 0,8.',
  );
});

test('une recette illisible compte ses erreurs de validation et nomme la première', () => {
  const recette = recetteParDefaut();
  const light = [...recette.courbes.light];
  light[5] = 0.8;
  const cassee = { ...recette, courbes: { ...recette.courbes, light }, fonds: { ...recette.fonds, dark: '#12121' } };
  const classement = classerRecette(JSON.stringify(cassee));
  assert.ok(classement.etat === 'illisible');
  const constat = recetteIllisible(classement.refus);
  assert.equal(constat.ou, 'Palettes et réglages illisibles');
  assert.match(constat.quoi, /^La génération est indisponible : 2 erreurs de validation\. Première erreur : Luminosité du thème Light, 6e nuance/);
  assert.ok(constat.geste.length > 0);
});

test('une recette future nomme son format et celui que le plugin lit', () => {
  const constat = recetteFuture(FORMAT_RECETTE + 1);
  assert.equal(constat.ou, `Sauvegarde au format ${FORMAT_RECETTE + 1}`);
  assert.ok(constat.quoi.includes(`accepte le format ${FORMAT_RECETTE}`));
});

const RECETTE = {
  ...recetteParDefaut(),
  palettes: [{
    id: 'p-0000000a',
    nom: 'Bleu',
    reference: '#1E6FD9',
    derive: {
      lien: false,
      soft: { clair: -7.53, sombre: 5.11, origine: 'tailwind' as const },
      vivid: { clair: 6, sombre: 0, origine: 'libre' as const },
    },
  }],
};
const CONTEXTE = { recette: RECETTE, nomDe: (id: string) => (id === 'p-0000000a' ? 'Bleu' : 'Violet') };

/** Une alerte de chaque code : `Record` refuse à la compilation un code oublié. */
const ALERTES: Record<Alerte['code'], Alerte> = {
  'profils-confondus': { code: 'profils-confondus', palette: 'p-0000000a', crans: [{ mode: 'light', cran: 100, distance: 0.012 }], seuil: 0.02 },
  'palettes-proches': { code: 'palettes-proches', palettes: ['p-0000000a', 'p-0000000b'], distance: 0.03, seuil: 0.05 },
  'couleur-presque-grise': { code: 'couleur-presque-grise', palette: 'p-0000000a', chroma: 0.021, seuil: 0.03 },
  'reference-plus-terne': { code: 'reference-plus-terne', palette: 'p-0000000a', part: 0.226, partSoft: 0.45 },
  'reference-plus-vive': { code: 'reference-plus-vive', palette: 'p-0000000a', part: 0.983, partVivid: 0.95 },
  'reference-hors-rampe': { code: 'reference-hors-rampe', palette: 'p-0000000a', clarte: 0.254, boutClair: 0.975, boutSombre: 0.27 },
  'fond-hors-courbe': { code: 'fond-hors-courbe', mode: 'light', clarte: 0.949, cran: 0.975 },
};

test('[VER-09] chaque alerte a ses trois parties, où, quoi et geste', () => {
  for (const alerte of Object.values(ALERTES)) {
    const constat = constatDAlerte(alerte, CONTEXTE);
    for (const partie of [constat.ou, constat.quoi, constat.geste]) assert.ok(partie.trim().length > 0, alerte.code);
    assert.ok(!/undefined|NaN/.test(JSON.stringify(constat)), `${alerte.code} : ${JSON.stringify(constat)}`);
  }
});

test('[VER-08] la mesure d’une proximité et son unité quittent le titre et l’action pour les mesures', () => {
  for (const code of ['profils-confondus', 'palettes-proches'] as const) {
    const constat = constatDAlerte(ALERTES[code], CONTEXTE);
    assert.ok(!/ΔEok/.test(constat.ou + constat.quoi + constat.geste), code);
    assert.match(constat.mesures?.[0] ?? '', /ΔEok/);
  }
});

test('un fond hors de la courbe nomme son thème et son hexa', () => {
  assert.equal(constatDAlerte(ALERTES['fond-hors-courbe'], CONTEXTE).ou, 'Fond du thème Light : #F7F7F7');
});

/** Une promesse de la paire 3, text+1 sur surface+1, en Dark. */
function promesse(profil: 'soft' | 'vivid', contraste: number): Promesse {
  return {
    paire: PAIRES[2],
    mode: 'dark',
    profil,
    premier: { nature: 'cran', cran: 800, couleur: [0, 0, 0] },
    second: { nature: 'cran', cran: 200, couleur: [0, 0, 0] },
    seuil: 4.5,
    contraste,
    verdict: contraste >= 4.5 ? 'tenue' : 'manquee',
  };
}

test('[VER-06] un groupe de promesses nomme l’association, l’état, le thème, et le résultat de chaque profil', () => {
  const groupe: GroupeDePromesses = {
    association: { premier: 'text', second: 'surface' },
    mode: 'dark',
    etat: 1,
    seuil: 4.5,
    resultats: [promesse('soft', 4.62), promesse('vivid', 4.319)],
    manquees: 1,
  };
  const constat = constatDeGroupe(groupe, 'Bleu');
  assert.equal(constat.ou, 'Texte coloré (text) sur Fond léger (surface), état hover · Bleu, thème Dark');
  assert.equal(constat.quoi, 'Cette association n’atteint pas le contraste demandé, pour un minimum de 4,5:1.');
  assert.deepEqual(constat.mesures, ['Soft : 4,62:1 · Respectée', 'Vivid : 4,31:1 · À corriger']);
  assert.ok(constat.geste.includes('réglages communs'));
});

test('[VER-07] « Prête » quand tout est respecté, sinon le nombre de promesses à corriger', () => {
  assert.equal(verdict(0), 'Prête');
  assert.equal(verdict(1), '1 promesse à corriger');
  assert.equal(verdict(3), '3 promesses à corriger');
  assert.equal(titreDeGroupe('Promesses à corriger', 3), 'Promesses à corriger · 3');
});

test('[VER-13] le badge d’un texte courant suit les seuils du WCAG à la frontière : 4,49 et 4,5, 6,99 et 7', () => {
  const lire = (valeur: number) => niveauEcrit(valeur, 'texte').ecrit;
  assert.deepEqual([4.49, 4.5, 6.99, 7].map(lire), ['AA ✗', 'AA', 'AA', 'AAA']);
  assert.equal(niveauEcrit(4.49, 'texte').atteint, false);
  assert.equal(niveauEcrit(6.99, 'texte').etiquette, 'Texte courant : AA atteint, AAA non atteint');
  assert.equal(niveauEcrit(7, 'texte').etiquette, 'Texte courant : AAA atteint');
  assert.equal(niveauEcrit(4.49, 'texte').etiquette, 'Texte courant : AA non atteint');
});

test('[VER-13] un grand texte atteint AA dès 3:1 et AAA dès 4,5:1', () => {
  assert.deepEqual([2.99, 3, 4.49, 4.5].map((valeur) => niveauEcrit(valeur, 'grandTexte').ecrit), ['AA ✗', 'AA', 'AA', 'AAA']);
});

test('[VER-13] un élément graphique n’a que AA, à 3:1, même au-delà de 7:1', () => {
  assert.deepEqual([2.99, 3, 21].map((valeur) => niveauEcrit(valeur, 'graphique').ecrit), ['AA ✗', 'AA', 'AA']);
  assert.equal(niveauEcrit(21, 'graphique').etiquette, 'Éléments graphiques : AA atteint');
  assert.equal(jugementDuSeuil('nonTexte'), 'graphique');
  assert.equal(jugementDuSeuil('texte'), 'texte');
});

test('[VER-13] Q4.2 : un minimum réglé à 6:1 manque la promesse, et le badge dit toujours AA atteint', () => {
  const recette = recetteParDefaut();
  const exigeante = { ...recette, seuils: { ...recette.seuils, texte: 6 } };
  const bleu = nouvellePalette(exigeante, 'p-0000000a', '#1E6FD9', 2)!;
  const entre = verifierPromesses(exigeante, bleu).filter((promesse) => promesse.paire.seuil === 'texte' && promesse.contraste >= 4.5 && promesse.contraste < 6);
  assert.ok(entre.length > 0, 'une garantie de texte entre 4,5:1 et 6:1');
  for (const promesse of entre) {
    assert.equal(promesse.verdict, 'manquee');
    assert.equal(niveauEcrit(promesse.contraste, jugementDuSeuil(promesse.paire.seuil)).ecrit, 'AA');
  }
});

test('[UI-05] le premier geste d’une fiche suit l’état du cadre : Générer, Actualiser, ou aucun pour un cadre à jour ou illisible', () => {
  assert.equal(premierGesteDeLaFiche('jamais-dessinee'), 'Générer sur Figma');
  assert.equal(premierGesteDeLaFiche('perimee'), 'Actualiser sur Figma');
  assert.equal(premierGesteDeLaFiche('introuvable'), 'Générer sur Figma');
  assert.equal(premierGesteDeLaFiche('a-jour'), null);
  assert.equal(premierGesteDeLaFiche('illisible'), null);
});

test('Q5.5 : les gestes globaux comptent les palettes en minuscules, au singulier pour une seule', () => {
  assert.equal(genererLesPalettesPasAJour(2), 'Mettre à jour (2 palettes)');
  assert.equal(genererLesPalettesPasAJour(1), 'Mettre à jour (1 palette)');
  assert.equal(genererToutesLesPalettes(7), 'Générer tout (7 palettes)');
  assert.equal(genererToutesLesPalettes(1), 'Générer tout (1 palette)');
});

test('l’exception de Figma et l’exemple d’écart se lisent dans le détail, pas dans le message', () => {
  const interrompu = dessinInterrompu('Bleu', 'in set_characters: font not loaded');
  assert.ok(!interrompu.quoi.includes('set_characters'));
  assert.equal(interrompu.detail, 'Détail de l’erreur : in set_characters: font not loaded');
  const ecart = ecartDePeinture('Bleu', [{ nom: 'soft/light/50', apercu: null, peint: '#FAF5F5' }]);
  assert.equal(ecart.quoi, '1 couleur ne correspond pas à l’aperçu.');
  assert.match(ecart.detail ?? '', /soft\/light\/50 : couleur absente dans l’aperçu, #FAF5F5 sur la planche/);
});

test('[UI-12] une carte repliée se résume : préréglage et synchronisation, origine et intensités, points à vérifier', () => {
  assert.equal(resumeDeLaDerive(RECETTE.palettes[0], false, 0), 'Soft Tailwind · Vivid Personnalisée · désynchronisée');
  const liee = { ...RECETTE.palettes[0], derive: { ...RECETTE.palettes[0].derive, lien: true } };
  assert.equal(resumeDeLaDerive(liee, false, 1), 'Personnalisée · synchronisée · 1 point à vérifier');
  assert.equal(resumeDeLaDerive(liee, true, 0), 'Désactivée pour une couleur presque grise');
  assert.equal(resumeDesIntensites(undefined, undefined, { soft: 0.45, vivid: 0.95 }, 0), 'Communes · Soft 0,45 · Vivid 0,95');
  assert.equal(resumeDesIntensites(undefined, 'vivid', { soft: 0.3, vivid: 0.3 }, 2), 'Référence dans Vivid · Soft 0,3 · Vivid 0,3 · 2 points à vérifier');
  assert.equal(resumeDesIntensites('designer', 'vivid', { soft: 0.2, vivid: 0.8 }, 0), 'Propres · Soft 0,2 · Vivid 0,8');
});

test('[UI-09] le résultat d’un profil se lit en signe et en mots', () => {
  assert.equal(resultatDuProfil('soft', 0), 'Soft ✓');
  assert.equal(resultatDuProfil('vivid', 2), 'Vivid ✗ 2');
  assert.equal(resultatDuProfilEnMots('vivid', 1), 'Vivid : 1 garantie manquée');
  assert.equal(resultatDuProfilEnMots('soft', 0), 'Soft : toutes les garanties sont respectées');
  assert.equal(TEXTES_DES_GARANTIES.echec(0, 2.924, 3), 'État default : 2,92:1 pour un minimum de 3:1');
});

test('V12.2 : l’écart d’import nomme les valeurs modifiées, la nature de l’effet et la conséquence sur la planche', () => {
  assert.equal(ligneDesValeurs([{ nom: 'Bleu', champs: ['reference', 'base'] }]), 'Palette à modifier : Bleu (couleur de référence, palette de base).');
  assert.deepEqual(lignesDeNature({ couleurs: false, minimums: true, detection: false }), ['Minimums des promesses : le résultat des garanties peut changer, sans changer les couleurs.']);
  assert.equal(consequenceSurLaPlanche([], []), 'Sur la planche : aucun cadre à jour n’est touché.');
  assert.equal(consequenceSurLaPlanche(['Marine', 'Vert'], ['Ambre']), 'Sur la planche : 2 cadres passeront « À mettre à jour » (Marine, Vert) ; 1 cadre restera sans palette (Ambre).');
});
