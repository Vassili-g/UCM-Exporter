/** Les promesses des emplois ([VER-03] à [VER-07]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRANS_DES_EMPLOIS,
  PAIRES,
  TABLE_DES_EMPLOIS,
  compterManquees,
  emploisDuCran,
  contraste,
  ecrireHexa,
  lireHexa,
  mesurerCran,
  rampesDe,
  recetteParDefaut,
  verifierPromesses,
  type MembrePaire,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-0000000a', '#1E6FD9');
const recette = recetteAvec(BLEU);

/** La promesse d'une paire pour un mode et un profil. */
function promesse(r: Recette, palette: Palette, numero: number, mode: Mode, profil: Profil): Promesse {
  const trouvee = verifierPromesses(r, palette).find((p) => p.paire.numero === numero && p.mode === mode && p.profil === profil);
  assert.ok(trouvee, `paire ${numero} absente en ${mode}, ${profil}`);
  return trouvee;
}

/**
 * La table des emplois et les paires de la section 11.2, recopiées ici : les
 * tests ci-dessous bouclent sur elles, pas sur le moteur, sans quoi une paire
 * retirée du moteur retirerait son propre test.
 */
const EMPLOIS_11_2 = {
  solid: 700,
  'on-solid': 'fond',
  text: 700,
  surface: 100,
  'border-control': 600,
  'border-decorative': 300,
  focus: 600,
};

/** Numéro, premier membre, second membre, seuil, puis les crans visés sur les crans par défaut. */
const TABLE_11_2: [number, string, string, 'texte' | 'nonTexte', number | 'fond', number | 'fond'][] = [
  [1, 'text', 'fond', 'texte', 700, 'fond'],
  [2, 'text', 'surface', 'texte', 700, 100],
  [3, 'text+1', 'surface+1', 'texte', 800, 200],
  [4, 'text+2', 'surface+2', 'texte', 900, 300],
  [5, 'on-solid', 'solid', 'texte', 'fond', 700],
  [6, 'on-solid', 'solid+1', 'texte', 'fond', 800],
  [7, 'on-solid', 'solid+2', 'texte', 'fond', 900],
  [8, 'border-control', 'fond', 'nonTexte', 600, 'fond'],
  [9, 'border-control', 'surface', 'nonTexte', 600, 100],
  [10, 'border-control+1', 'surface+1', 'nonTexte', 700, 200],
  [11, 'border-control+2', 'surface+2', 'nonTexte', 800, 300],
  [12, 'focus', 'fond', 'nonTexte', 600, 'fond'],
  [13, 'focus', 'surface', 'nonTexte', 600, 100],
  [14, 'solid+1', 'fond', 'nonTexte', 800, 'fond'],
];

const ecrire = (membre: MembrePaire) =>
  'fond' in membre ? 'fond' : `${membre.emploi}${membre.decalage ? `+${membre.decalage}` : ''}`;

test('[VER-03] la table des emplois est celle de la section 11.2', () => {
  assert.deepEqual(TABLE_DES_EMPLOIS, EMPLOIS_11_2);
});

test('[VER-03] le moteur porte les quatorze paires de la section 11.2, dans leur ordre', () => {
  assert.deepEqual(
    PAIRES.map((p) => [p.numero, ecrire(p.premier), ecrire(p.second), p.seuil]),
    TABLE_11_2.map(([numero, premier, second, seuil]) => [numero, premier, second, seuil]),
  );
});

test('[VER-05] les paires visent, sur les crans par défaut, exactement les crans que la validation exige', () => {
  const vises = new Set(TABLE_11_2.flatMap(([, , , , a, b]) => [a, b]).filter((c) => c !== 'fond'));
  assert.deepEqual([...vises].sort((a, b) => (a as number) - (b as number)), [...CRANS_DES_EMPLOIS]);
});

const nature = (couleur: 'fond' | number) => couleur === 'fond' ? 'fond' : 'cran';

/**
 * Une recette où la paire échoue pour ce mode et ce profil : le membre fond
 * prend la couleur de l'autre membre, ou, entre deux crans, le second prend la
 * clarté du premier. Le contraste tombe près de 1.
 */
function recettePourEchouer(p: Promesse): Recette {
  const r = copie(recette);
  if (p.premier.nature === 'fond' || p.second.nature === 'fond') {
    const autre = p.premier.nature === 'fond' ? p.second : p.premier;
    r.fonds[p.mode] = ecrireHexa(autre.couleur);
  } else {
    const rangs = [p.premier, p.second].map((d) => r.crans.indexOf((d as { cran: number }).cran));
    r.courbes[p.mode][rangs[1]] = r.courbes[p.mode][rangs[0]];
  }
  return r;
}

for (const [numero, , , , cranPremier, cranSecond] of TABLE_11_2) {
  for (const profil of ['soft', 'vivid'] as const) {
    test(`[VER-03] paire ${numero}, ${profil} : tenue par défaut, manquée quand ses membres se rejoignent`, () => {
      assert.ok(PAIRES.some((p) => p.numero === numero), `le moteur n'a pas de paire ${numero}`);
      for (const mode of ['light', 'dark'] as const) {
        const p = promesse(recette, BLEU, numero, mode, profil);
        assert.deepEqual(
          [p.premier.nature, p.second.nature],
          [nature(cranPremier), nature(cranSecond)],
          `natures, ${mode}`,
        );
        for (const [designation, attendu] of [[p.premier, cranPremier], [p.second, cranSecond]] as const) {
          const couleur = attendu === 'fond'
            ? lireHexa(recette.fonds[mode])
            : rampesDe(recette, BLEU)[profil][mode][recette.crans.indexOf(attendu)].couleur;
          assert.deepEqual(designation.couleur, couleur, `couleur visée, ${mode}`);
          if (designation.nature === 'cran') assert.equal(designation.cran, attendu);
        }
        assert.equal(p.verdict, 'tenue', `défaut, ${mode}`);
        const echec = promesse(recettePourEchouer(p), BLEU, numero, mode, profil);
        assert.equal(echec.verdict, 'manquee', `${mode} : ${echec.contraste}`);
      }
    });
  }
}

test('[VER-03] une palette compte cinquante-six promesses, par mode, puis par profil, puis par paire', () => {
  const promesses = verifierPromesses(recette, BLEU);
  assert.equal(promesses.length, 56);
  const attendu = ['light', 'dark'].flatMap((mode) =>
    ['soft', 'vivid'].flatMap((profil) => PAIRES.map((paire) => `${mode} ${profil} ${paire.numero}`)));
  assert.deepEqual(promesses.map((p) => `${p.mode} ${p.profil} ${p.paire.numero}`), attendu);
});

test('[VER-06] une promesse manquée nomme la paire, le profil, le contraste et le seuil, sans cran proposé', () => {
  const tenue = promesse(recette, BLEU, 2, 'light', 'soft');
  const manquee = promesse(recettePourEchouer(tenue), BLEU, 2, 'light', 'soft');
  assert.equal(manquee.verdict, 'manquee');
  assert.deepEqual(
    Object.keys(manquee).sort(),
    ['contraste', 'mode', 'paire', 'premier', 'profil', 'second', 'seuil', 'verdict'],
  );
  assert.equal(manquee.seuil, 4.5);
  assert.ok(manquee.contraste < manquee.seuil);
});

test('[VER-07] le verdict d’une palette compte ses promesses manquées', () => {
  assert.equal(compterManquees(verifierPromesses(recette, BLEU)), 0);
  const r = { ...recette, fonds: { light: '#F7F7F7', dark: '#5A5A5A' } };
  const manquees = verifierPromesses(r, BLEU).filter((p) => p.verdict === 'manquee');
  assert.ok(manquees.length > 0);
  assert.equal(compterManquees(verifierPromesses(r, BLEU)), manquees.length);
});

test('[VER-03] un cran reçoit ses contrastes contre le fond, le blanc et le noir, et le seuil tenu', () => {
  const seuils = recetteParDefaut().seuils;
  const fond = lireHexa('#F7F7F7')!;
  const cran700 = lireHexa('#0E5DC6')!;
  assert.deepEqual(mesurerCran(cran700, fond, seuils), {
    fond: contraste(cran700, fond),
    blanc: contraste(cran700, [255, 255, 255]),
    noir: contraste(cran700, [0, 0, 0]),
    seuilTenu: 'texte',
  });
  assert.equal(mesurerCran(lireHexa('#1477ED')!, fond, seuils).seuilTenu, 'nonTexte');
  assert.equal(mesurerCran(lireHexa('#4596FA')!, fond, seuils).seuilTenu, null);
});

test('[VER-04] un cran n’a pas de verdict', () => {
  const mesure = mesurerCran(lireHexa('#0E5DC6')!, lireHexa('#F7F7F7')!, recetteParDefaut().seuils);
  assert.deepEqual(Object.keys(mesure).sort(), ['blanc', 'fond', 'noir', 'seuilTenu']);
});

test('section 9.3 : chaque cran porte les emplois que la table lui confie, états compris', () => {
  const nommer = (rang: number) => emploisDuCran(recette.crans, rang)
    .map(({ emploi, decalage }) => `${emploi}${decalage ? `+${decalage}` : ''}`);
  const parCran = Object.fromEntries(recette.crans.map((cran, rang) => [cran, nommer(rang)]));
  assert.deepEqual(parCran, {
    50: [],
    100: ['surface'],
    200: ['surface+1'],
    300: ['surface+2', 'border-decorative'],
    400: [],
    500: [],
    600: ['border-control', 'focus'],
    700: ['solid', 'text', 'border-control+1'],
    800: ['solid+1', 'text+1', 'border-control+2'],
    900: ['solid+2', 'text+2'],
    950: [],
  });
});
