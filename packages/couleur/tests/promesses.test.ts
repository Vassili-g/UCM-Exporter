/** Les promesses des rôles ([VER-03] à [VER-07]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAIRES,
  compterManquees,
  contraste,
  lireHexa,
  mesurerCran,
  ordonnerCandidats,
  recetteParDefaut,
  verifierPromesses,
  type Cible,
  type MembrePaire,
  type Paire,
  type Palette,
  type Role,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-0000000a', '#1E6FD9');
const recette = recetteAvec(BLEU);
const CRANS = recette.crans;

/** La promesse d'une paire dans un mode, pour une palette donnée. */
function promesse(palette: Palette, numero: number, mode: 'light' | 'dark') {
  const trouvee = verifierPromesses(recetteAvec(palette), palette).find((p) => p.paire.numero === numero && p.mode === mode);
  assert.ok(trouvee, `paire ${numero} absente`);
  return trouvee;
}

const cibleDe = (membre: MembrePaire): Cible | 'fond' =>
  'fond' in membre ? 'fond' : recette.cablage[membre.role];

/**
 * Un câblage propre qui fait échouer la paire : le rôle du premier membre qui
 * vise un cran rejoint l'autre membre, pour un contraste proche de 1.
 */
function cablagePourEchouer(paire: Paire): { [R in Role]?: Cible } {
  const membres = [paire.premier, paire.second];
  const mobile = membres.find((m) => 'role' in m && typeof cibleDe(m) === 'object' && 'cran' in (cibleDe(m) as object));
  assert.ok(mobile && 'role' in mobile, `paire ${paire.numero} sans membre mobile`);
  const autre = membres.find((m) => m !== mobile)!;
  const cibleAutre = cibleDe(autre);
  let rang = 0;
  if (typeof cibleAutre === 'object' && 'cran' in cibleAutre && 'role' in autre) {
    rang = CRANS.indexOf(cibleAutre.cran) + autre.decalage - mobile.decalage;
  }
  return { [mobile.role]: { profil: 'vivid', cran: CRANS[rang] } };
}

/**
 * La table de la section 11.2, recopiée ici : les tests ci-dessous bouclent sur
 * elle, pas sur `PAIRES`, sans quoi une paire retirée du moteur retirerait son
 * propre test.
 */
const TABLE_11_2: [number, string, string, 'texte' | 'nonTexte'][] = [
  [1, 'text', 'fond', 'texte'],
  [2, 'text', 'surface', 'texte'],
  [3, 'text+1', 'surface+1', 'texte'],
  [4, 'text+2', 'surface+2', 'texte'],
  [5, 'on-solid', 'solid', 'texte'],
  [6, 'on-solid', 'solid+1', 'texte'],
  [7, 'on-solid', 'solid+2', 'texte'],
  [8, 'border-control', 'fond', 'nonTexte'],
  [9, 'border-control', 'surface', 'nonTexte'],
  [10, 'border-control+1', 'surface+1', 'nonTexte'],
  [11, 'border-control+2', 'surface+2', 'nonTexte'],
  [12, 'focus', 'fond', 'nonTexte'],
  [13, 'focus', 'surface', 'nonTexte'],
  [14, 'solid+1', 'fond', 'nonTexte'],
];

const ecrire = (membre: MembrePaire) =>
  'fond' in membre ? 'fond' : `${membre.role}${membre.decalage ? `+${membre.decalage}` : ''}`;

test('[VER-03] le moteur porte les quatorze paires de la section 11.2, dans leur ordre', () => {
  assert.deepEqual(PAIRES.map((p) => [p.numero, ecrire(p.premier), ecrire(p.second), p.seuil]), TABLE_11_2);
});

for (const [numero] of TABLE_11_2) {
  test(`[VER-03] paire ${numero} : tenue par défaut, manquée quand ses membres se rejoignent`, () => {
    const paire = PAIRES.find((p) => p.numero === numero);
    assert.ok(paire, `le moteur n'a pas de paire ${numero}`);
    for (const mode of ['light', 'dark'] as const) {
      assert.equal(promesse(BLEU, paire.numero, mode).verdict, 'tenue', `défaut, ${mode}`);
    }
    const echec = promesse({ ...BLEU, cablage: cablagePourEchouer(paire) }, paire.numero, 'light');
    assert.equal(echec.verdict, 'manquee', JSON.stringify(echec));
  });
}

test('[VER-03] une palette compte vingt-huit promesses, quatorze par mode', () => {
  const promesses = verifierPromesses(recette, BLEU);
  assert.equal(promesses.length, 28);
  assert.deepEqual(promesses.slice(0, 14).map((p) => p.mode), Array(14).fill('light'));
});

test('[VER-05] un rôle qui vise la référence rend ses paires à cran suivant non vérifiables', () => {
  const palette = { ...BLEU, cablage: { text: { reference: true } as Cible } };
  assert.notEqual(promesse(palette, 2, 'light').verdict, 'non-verifiable');
  for (const numero of [3, 4]) {
    const p = promesse(palette, numero, 'light');
    assert.equal(p.verdict, 'non-verifiable');
    assert.equal(p.premier.nature, 'sans-cran-suivant');
    assert.equal(p.contraste, undefined);
  }
});

test('[VER-05] un cran suivant au-delà du dernier cran rend la paire non vérifiable', () => {
  const palette = { ...BLEU, cablage: { text: { profil: 'vivid', cran: 900 } as Cible } };
  assert.notEqual(promesse(palette, 3, 'light').verdict, 'non-verifiable');
  const p = promesse(palette, 4, 'light');
  assert.equal(p.verdict, 'non-verifiable');
  assert.equal(p.premier.nature, 'debordement');
});

test('[VER-06] une promesse manquée propose le cran le plus proche qui tient toutes les paires du rôle', () => {
  const palette = { ...BLEU, cablage: { text: { profil: 'vivid', cran: 400 } as Cible } };
  const p = promesse(palette, 2, 'light');
  assert.equal(p.verdict, 'manquee');
  assert.deepEqual({ ...p.proposition, contraste: undefined }, { role: 'text', profil: 'vivid', cran: 700, contraste: undefined });
  // Le cran proposé tient toutes les paires de text, dans les deux modes.
  const corrigee = { ...BLEU, cablage: { text: { profil: 'vivid', cran: 700 } as Cible } };
  const duText = verifierPromesses(recetteAvec(corrigee), corrigee)
    .filter(({ paire }) => [paire.premier, paire.second].some((m) => 'role' in m && m.role === 'text'));
  assert.ok(duText.every((q) => q.verdict === 'tenue'));
});

test('[VER-06] quand le premier membre vise le fond, le second bouge', () => {
  const palette = { ...BLEU, cablage: { solid: { profil: 'vivid', cran: 300 } as Cible } };
  const p = promesse(palette, 5, 'light');
  assert.equal(p.verdict, 'manquee');
  assert.equal(p.proposition?.role, 'solid');
  assert.equal(p.proposition?.cran, 700);
});

test('[VER-06] quand le premier membre ne trouve aucun cran, le second bouge', () => {
  // surface au cran 400 : aucun cran de text ne tient text sur surface, surface revient au 200.
  const palette = { ...BLEU, cablage: { surface: { profil: 'vivid', cran: 400 } as Cible } };
  const p = promesse(palette, 2, 'light');
  assert.equal(p.verdict, 'manquee');
  assert.deepEqual([p.proposition?.role, p.proposition?.cran], ['surface', 200]);
});

test('[VER-06] le cran proposé tient les paires du rôle dans les deux modes', () => {
  // Un fond sombre à #333333 demande text au 800 en sombre ; en clair, le 700 suffirait.
  const palette = { ...BLEU, cablage: { text: { profil: 'vivid', cran: 600 } as Cible } };
  const recetteSombre = { ...recetteAvec(palette), fonds: { light: '#F7F7F7', dark: '#333333' } };
  const p = verifierPromesses(recetteSombre, palette).find((q) => q.paire.numero === 1 && q.mode === 'light');
  assert.equal(p?.verdict, 'manquee');
  assert.equal(p?.proposition?.cran, 800);
});

test('[VER-06] sans membre qui vise un cran, rien n’est proposé', () => {
  const palette = { ...BLEU, cablage: { text: { fond: true } as Cible } };
  const p = promesse(palette, 1, 'light');
  assert.equal(p.verdict, 'manquee');
  assert.equal(p.proposition, undefined);
});

test('[VER-06] à distance égale, le candidat le plus contrasté passe devant', () => {
  const ordonnes = ordonnerCandidats([
    { cran: 600, distance: 1, contraste: 4.6 },
    { cran: 950, distance: 3, contraste: 9 },
    { cran: 800, distance: 1, contraste: 5.2 },
  ]);
  assert.deepEqual(ordonnes.map((c) => c.cran), [800, 600, 950]);
});

test('[VER-07] le verdict d’une palette compte ses promesses manquées', () => {
  assert.equal(compterManquees(verifierPromesses(recette, BLEU)), 0);
  const palette = { ...BLEU, cablage: { text: { profil: 'vivid', cran: 400 } as Cible } };
  const manquees = verifierPromesses(recetteAvec(palette), palette).filter((p) => p.verdict === 'manquee');
  assert.ok(manquees.length > 0);
  assert.equal(compterManquees(verifierPromesses(recetteAvec(palette), palette)), manquees.length);
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
