/**
 * La galerie d'UCM Exporter : ses états et la taille de sa fenêtre, construits
 * par le banc du socle.
 */
const path = require('path');
const { construireGalerie, sortieDe } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const GALERIE = { racine: path.resolve(__dirname, '..'), etats: ETATS, largeur: 380, hauteur: 500 };

module.exports = { GALERIE, sortie: sortieDe(GALERIE) };

if (require.main === module) construireGalerie(GALERIE);
