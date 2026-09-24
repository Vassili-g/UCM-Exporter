/**
 * Contraste, distance et part de chroma ([MOT-21] à [MOT-24]).
 *
 * La distance attendue vient de culori 4.0.2, calculée une fois hors du dépôt.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  atteintLeSeuil,
  contraste,
  distanceOk,
  ecrireArrondi,
  ecrireContraste,
  ecrireTronque,
  lireHexa,
  niveauxWcag,
  partDeChroma,
} from '../src/index';

const hexa = (texte: string) => lireHexa(texte)!;

test('[MOT-21] le contraste WCAG 2 ne dépend pas de l’ordre, et vaut 21 du noir au blanc', () => {
  assert.equal(contraste(hexa('#000000'), hexa('#FFFFFF')), 21);
  assert.equal(contraste(hexa('#0E5DC6'), hexa('#F7F7F7')), contraste(hexa('#F7F7F7'), hexa('#0E5DC6')));
  assert.equal(contraste(hexa('#777777'), hexa('#777777')), 1);
});

test('[MOT-22] l’affichage tronque à deux décimales : 4,499 s’affiche 4,49 et échoue à 4,5', () => {
  assert.equal(ecrireContraste(4.499), '4,49');
  assert.equal(atteintLeSeuil(4.499, 4.5), false);
  assert.equal(ecrireContraste(4.5), '4,50');
  assert.equal(atteintLeSeuil(4.5, 4.5), true);
});

test('[MOT-22] la troncature lit l’écriture décimale : 4,35 s’affiche 4,35', () => {
  // 4.35 * 100 vaut 434.99999999999994 : Math.floor rendrait 4,34.
  assert.equal(Math.floor(4.35 * 100) / 100, 4.34);
  assert.equal(ecrireContraste(4.35), '4,35');
  assert.equal(ecrireTronque(5.7656, 2), '5,76');
  assert.equal(ecrireTronque(12.9, 0), '12');
});

test('[MOT-22] l’affichage et le verdict concordent au voisinage des seuils', () => {
  const discordances: string[] = [];
  for (const seuil of [3, 4.5]) {
    for (let exposant = 1; exposant <= 15; exposant += 1) {
      for (const signe of [-1, 1]) {
        const valeur = seuil + signe * 10 ** -exposant;
        const affiche = Number(ecrireContraste(valeur).replace(',', '.'));
        if ((affiche >= seuil) !== atteintLeSeuil(valeur, seuil)) {
          discordances.push(`${valeur} affiché ${ecrireContraste(valeur)}, seuil ${seuil}`);
        }
      }
    }
  }
  assert.deepEqual(discordances, []);
});

test('[MOT-22] la virgule s’écrit sans Intl, arrondie pour une valeur OKLCH', () => {
  assert.equal(ecrireArrondi(0.5549888, 3), '0,555');
  assert.equal(ecrireArrondi(257.43675, 1), '257,4');
  assert.equal(ecrireArrondi(12, 0), '12');
});

test('[MOT-23] la distance est euclidienne en Oklab, comme culori la mesure', () => {
  // culori, differenceEuclidean('oklab') : 0.05567312198424087, puis
  // 0.41313309416404614. Le premier couple ne diffère presque qu'en clarté, le
  // second surtout sur les axes a et b.
  const proches = distanceOk(hexa('#1E6FD9'), hexa('#0E5DC6'));
  assert.ok(Math.abs(proches - 0.05567312198424087) < 1e-6, `${proches}`);
  const opposees = distanceOk(hexa('#1E6FD9'), hexa('#F2A900'));
  assert.ok(Math.abs(opposees - 0.41313309416404614) < 1e-6, `${opposees}`);
  assert.equal(distanceOk(hexa('#1E6FD9'), hexa('#1E6FD9')), 0);
});

test('[MOT-24] la part de chroma est bornée à [0, 1]', () => {
  assert.equal(ecrireArrondi(partDeChroma(hexa('#1E6FD9')), 2), '0,89');
  assert.equal(ecrireArrondi(partDeChroma(hexa('#5B6B7A')), 2), '0,23');
  // Au plafond, la relecture de l'hexa rend 0,999998 : la couleur à 8 bits est
  // à un arrondi près du bord du gamut.
  assert.equal(ecrireArrondi(partDeChroma(hexa('#FFD400')), 2), '1,00');
  // Le bleu primaire porte une chroma de 0,313 ; le plafond, à sa clarté et sa
  // teinte, rend 0,266 : le rayon sort du gamut avant d'atteindre le coin.
  assert.equal(partDeChroma(hexa('#0000FF')), 1);
  assert.equal(partDeChroma(hexa('#FFFFFF')), 0);
  assert.equal(partDeChroma(hexa('#000000')), 0);
});

test('[VER-13] les niveaux WCAG suivent leurs critères, aux bornes incluses', () => {
  const lire = (valeur: number) => {
    const { texte, grandTexte, graphique } = niveauxWcag(valeur);
    return `${texte ?? '-'} ${grandTexte ?? '-'} ${graphique ? 'graphique' : '-'}`;
  };
  assert.equal(lire(7), 'AAA AAA graphique');
  assert.equal(lire(6.99), 'AA AAA graphique');
  assert.equal(lire(4.5), 'AA AAA graphique');
  assert.equal(lire(4.49), '- AA graphique');
  assert.equal(lire(3), '- AA graphique');
  assert.equal(lire(2.99), '- - -');
  assert.equal(lire(21), 'AAA AAA graphique');
});

test('[VER-13] un contraste affiché 4,50 est AA, comme son verdict', () => {
  // 4,5 moins 1e-11 s'écrit 4,50 et tient le seuil de 4,5 ([MOT-22]).
  assert.equal(niveauxWcag(4.5 - 1e-11).texte, 'AA');
});
