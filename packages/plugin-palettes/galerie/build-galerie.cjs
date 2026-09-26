/**
 * Les galeries d'UCM Palettes, construites par le banc du socle : une à la
 * taille par défaut de la fenêtre, une à sa taille minimale, où le point (c)
 * du protocole de relecture se regarde.
 */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const racine = path.resolve(__dirname, '..');
const GALERIES = [
  { racine, etats: ETATS, largeur: 650, hauteur: 720 },
  { racine, etats: ETATS, largeur: 500, hauteur: 520, dossier: 'galerie-minimale' },
];

module.exports = { GALERIES };

if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);
