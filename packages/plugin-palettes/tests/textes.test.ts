/** Les textes validés : blocages, refus de validation, messages, aperçu et niveaux WCAG. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, PAIRES, classerRecette, niveauxWcag, recetteParDefaut, type Alerte, type Promesse } from 'ucm-couleur';

import type { GroupeDePromesses } from '../src/presentation';
import {
  TEXTES_DES_GARANTIES,
  consequenceSurLaPlanche,
  constatDAlerte,
  constatDeGroupe,
  dessinInterrompu,
  ecartDePeinture,
  ligneDesValeurs,
  lignesDeNature,
  niveauxEcrits,
  nommerChamp,
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
    soft: promesse('soft', 4.62),
    vivid: promesse('vivid', 4.319),
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

test('[VER-13] un niveau WCAG distingue texte courant, grand texte et éléments graphiques', () => {
  assert.equal(niveauxEcrits(niveauxWcag(3.4)), 'Texte courant : Insuffisant · AA grand texte · éléments graphiques : Minimum 3:1 atteint');
  assert.equal(niveauxEcrits(niveauxWcag(7.2)), 'Texte courant : AAA · éléments graphiques : Minimum 3:1 atteint');
  assert.equal(niveauxEcrits(niveauxWcag(2)), 'Texte courant : Insuffisant · éléments graphiques : Minimum 3:1 non atteint');
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
  assert.equal(resumeDesIntensites(undefined, 'vivid', { soft: 0.3, vivid: 0.3 }, 2), 'Palette de base Vivid · Soft 0,3 · Vivid 0,3 · 2 points à vérifier');
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
