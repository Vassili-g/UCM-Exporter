/** Les textes validés : blocages, refus de validation, messages, aperçu et niveaux WCAG. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, PAIRES, classerRecette, niveauxWcag, recetteParDefaut, type Alerte, type Promesse } from 'ucm-couleur';

import type { GroupeDePromesses } from '../src/presentation';
import {
  constatDAlerte,
  constatDeGroupe,
  detailDuCran,
  dessinInterrompu,
  ecartDePeinture,
  ligneDeLaDerive,
  niveauxEcrits,
  nommerChamp,
  recetteFuture,
  recetteIllisible,
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
  assert.equal(constat.ou, 'Texte coloré (text) sur Fond léger (surface) au survol · Bleu, thème Dark');
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
  const interrompu = dessinInterrompu('Bleu', 'in set_characters: font not loaded', 0);
  assert.ok(!interrompu.quoi.includes('set_characters'));
  assert.equal(interrompu.detail, 'Détail de l’erreur : in set_characters: font not loaded');
  const ecart = ecartDePeinture('Bleu', [{ nom: 'soft/light/50', apercu: null, peint: '#FAF5F5' }]);
  assert.equal(ecart.quoi, '1 couleur ne correspond pas à l’aperçu.');
  assert.match(ecart.detail ?? '', /soft\/light\/50 : couleur absente dans l’aperçu, #FAF5F5 sur la planche/);
});

test('E22 : la dérive repliée se résume sur une ligne, un profil ou deux', () => {
  assert.equal(ligneDeLaDerive(RECETTE.palettes[0]), 'soft : Tailwind · nuances claires : −7,5° · nuances sombres : +5,1° · vivid : Personnalisée · nuances claires : +6,0° · nuances sombres : 0,0°');
  const liee = { ...RECETTE.palettes[0], derive: { ...RECETTE.palettes[0].derive, lien: true } };
  assert.equal(ligneDeLaDerive(liee), 'Personnalisée · nuances claires : +6,0° · nuances sombres : 0,0°');
});

test('[UI-04] le détail d’une nuance donne son nom, son hexa, ses contrastes et ses usages', () => {
  const texte = detailDuCran({
    nom: 'vivid.700',
    hexa: '#0E5DC6',
    fond: 5.768,
    seuilTenu: 4.5,
    blanc: 6.17,
    noir: 3.4,
    emplois: [{ emploi: 'solid', decalage: 0 }, { emploi: 'border-control', decalage: 1 }],
  });
  assert.equal(texte, 'vivid.700 · #0E5DC6 · Contraste avec le fond : 5,76:1 · minimum atteint : 4,5:1 · Avec le blanc : 6,17:1 · Avec le noir : 3,40:1 · Fond plein (solid), Bordure de contrôle (border-control) au survol');
});
