/** Le banc de galerie, pour un plugin quelconque. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const { construireGalerie, MODES } = require('../galerie/banc.cjs') as {
  construireGalerie: (galerie: { racine: string; etats: unknown[]; largeur: number; hauteur: number; dossier?: string }) => void;
  MODES: Record<string, { classe: string }>;
};

const GABARIT = '<!doctype html>\n<html lang="fr">\n<head><style>.a{}</style></head>\n<body><main id="app"></main></body>\n</html>\n';

test('chaque état atteignable a une page par mode, à la taille de la fenêtre du plugin', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-banc-'));
  fs.mkdirSync(path.join(racine, 'dist'));
  fs.writeFileSync(path.join(racine, 'dist', 'ui.html'), GABARIT);
  const etats = [
    { id: 'vide', titre: 'Vide', existe: true, atteinte: [{ message: { type: 'etat', texte: '$&</script>' } }] },
    { id: 'plus-tard', titre: 'Plus tard', existe: false, attendu: 'L3.8' },
  ];

  construireGalerie({ racine, etats, largeur: 600, hauteur: 720 });

  const sortie = path.join(racine, 'dist', 'galerie');
  for (const [nom, mode] of Object.entries(MODES)) {
    const page = fs.readFileSync(path.join(sortie, nom, 'vide.html'), 'utf8');
    assert.ok(page.includes(`<html lang="fr" class="${mode.classe}">`), nom);
    // Le scénario arrive intact : ni `$&` interprété, ni balise fermée trop tôt.
    assert.ok(page.includes('"texte":"$&<\\/script>"'), nom);
    assert.equal(fs.existsSync(path.join(sortie, nom, 'plus-tard.html')), false, nom);
    assert.ok(fs.readFileSync(path.join(sortie, nom, 'planche-1.html'), 'utf8').includes('width: 600px; height: 720px'), nom);
  }
  assert.ok(fs.readFileSync(path.join(sortie, 'index.html'), 'utf8').includes('<strong>Plus tard</strong> — attendu par L3.8'));
  fs.rmSync(racine, { recursive: true, force: true });
});

test('une galerie qui nomme son dossier s’écrit sous dist, dans ce dossier', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-banc-'));
  fs.mkdirSync(path.join(racine, 'dist'));
  fs.writeFileSync(path.join(racine, 'dist', 'ui.html'), GABARIT);
  const etats = [{ id: 'vide', titre: 'Vide', existe: true, atteinte: [{ message: { type: 'etat' } }] }];

  construireGalerie({ racine, etats, largeur: 440, hauteur: 520, dossier: 'galerie-minimale' });

  const sortie = path.join(racine, 'dist', 'galerie-minimale');
  assert.ok(fs.existsSync(path.join(sortie, 'clair', 'vide.html')));
  assert.ok(fs.readFileSync(path.join(sortie, 'clair', 'planche-1.html'), 'utf8').includes('width: 440px; height: 520px'));
  assert.equal(fs.existsSync(path.join(racine, 'dist', 'galerie')), false);
  fs.rmSync(racine, { recursive: true, force: true });
});
