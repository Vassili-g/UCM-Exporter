#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-V3.html, les maquettes du troisième tour, avec les
 * couleurs, les ratios et les comptes de calques que le moteur calcule pour
 * #1E6FD9 et #16A34A.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v3.mjs"
 *
 * Les rampes des deux candidats au préréglage de treize nuances sont calculées
 * de la même façon. Une planche de la maquette se construit comme un arbre de
 * calques : chaque cadre et chaque texte compte pour un calque, comme dans
 * `compterCalques`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TABLE_DES_EMPLOIS,
  ancrageDe,
  compterManquees,
  contraste,
  decalagesDeLEmploi,
  ecrireContraste,
  garantieDesCourbes,
  lireHexa,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  verifierPromesses,
} from '../../../../packages/couleur/src/index.ts';
import { ajouter, nouvellePalette, renommer } from '../../../../packages/plugin-palettes/src/edition.ts';
import { compterCalques, modeleDeCadre } from '../../../../packages/plugin-palettes/src/planche/modele.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));

/* Le moteur */

const REFERENCES = [['Bleu', '#1E6FD9'], ['Vert', '#16A34A']];

function recetteAvec(crans, courbes) {
  const base = { ...recetteParDefaut(), crans, courbes };
  return REFERENCES.reduce((recette, [nom, hexa], rang) => ajouter(recette, renommer(nouvellePalette(recette, `p-0000000${rang + 1}`, hexa), nom)), base);
}

/** La luminosité d'un numéro ajouté, interpolée linéairement sur les numéros de la courbe. */
function interpoler(crans, courbe, numero) {
  const rang = crans.findIndex((cran) => cran > numero);
  const t = (numero - crans[rang - 1]) / (crans[rang] - crans[rang - 1]);
  return Math.round((courbe[rang - 1] + t * (courbe[rang] - courbe[rang - 1])) * 1000) / 1000;
}

function inserer(crans, courbes, ajouts) {
  const liste = [...crans, ...ajouts.map(({ numero }) => numero)].sort((a, b) => a - b);
  const valeur = (mode, numero) => {
    const ajout = ajouts.find((candidat) => candidat.numero === numero);
    if (!ajout) return courbes[mode][crans.indexOf(numero)];
    return ajout[mode] ?? interpoler(crans, courbes[mode], numero);
  };
  return { crans: liste, courbes: { light: liste.map((n) => valeur('light', n)), dark: liste.map((n) => valeur('dark', n)) } };
}

/** Ce que les maquettes lisent d'une palette : rampes, ancrage, promesses. */
function lire(recette, palette) {
  const rampes = rampesDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  const promesses = verifierPromesses(recette, palette);
  return {
    nom: palette.nom,
    reference: palette.reference,
    profil: ancrage.profil,
    reperes: { light: recette.crans[ancrage.rangs.light], dark: recette.crans[ancrage.rangs.dark] },
    promesses,
    manquees: (mode, profil) => promesses.filter((p) => p.verdict === 'manquee' && (!mode || p.mode === mode) && (!profil || p.profil === profil)).length,
    total: compterManquees(promesses),
    rampe: (profil, mode) => rampes[profil][mode].map((cran, rang) => ({ numero: recette.crans[rang], hexa: cran.hexa, couleur: cran.couleur })),
  };
}

const DEFAUT = recetteParDefaut();
const COURANTE = recetteAvec(DEFAUT.crans, DEFAUT.courbes);
const [BLEU, VERT] = COURANTE.palettes.map((palette) => lire(COURANTE, palette));
const FONDS = DEFAUT.fonds;
const CALQUES_ACTUELS = {
  sansGrille: compterCalques(modeleDeCadre(COURANTE, COURANTE.palettes[0], 'SRGB', { grille: false }).racine),
  avecGrille: compterCalques(modeleDeCadre(COURANTE, COURANTE.palettes[0], 'SRGB', { grille: true }).racine),
};
const CALQUES_DE_LA_GRILLE = CALQUES_ACTUELS.avecGrille - CALQUES_ACTUELS.sansGrille;

const CANDIDATS = {
  A: { titre: '450 et 550', ...inserer(DEFAUT.crans, DEFAUT.courbes, [{ numero: 450 }, { numero: 550 }]) },
  // Au-delà de 950, la courbe continue à pas décroissants : 0,055 puis 0,05 en Light, la moitié de l'écart restant au blanc en Dark.
  B: { titre: '1000 et 1050', ...inserer(DEFAUT.crans, DEFAUT.courbes, [{ numero: 1000, light: 0.215, dark: 0.96 }, { numero: 1050, light: 0.165, dark: 0.98 }]) },
};
for (const candidat of Object.values(CANDIDATS)) {
  const recette = recetteAvec(candidat.crans, candidat.courbes);
  candidat.valide = 'recette' in validerRecette(recette);
  candidat.garantie = garantieDesCourbes(recette).length;
  candidat.palettes = recette.palettes.map((palette) => lire(recette, palette));
}

/* Écriture */

const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nombre = (x) => String(x).replace('.', ',');
const encre = (rgb) => (contraste(rgb, [0, 0, 0]) >= contraste(rgb, [255, 255, 255]) ? '#000000' : '#FFFFFF');
const rgbDe = (hexa) => lireHexa(hexa);
const NOMS_DE_PROFIL = { soft: 'Soft', vivid: 'Vivid' };
const NOMS_DE_MODE = { light: 'Light', dark: 'Dark' };

/** Teinte, saturation et valeur d'un hexa, pour placer le curseur du sélecteur de couleur. */
function hsv(hexa) {
  const [r, g, b] = rgbDe(hexa).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round(((h * 60) + 360) % 360), s: max ? d / max : 0, v: max };
}

/** Saturation et luminosité HSL, en pourcentages, pour le format HSL du sélecteur. */
function hsl(hexa) {
  const [r, g, b] = rgbDe(hexa).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s: Math.round(s * 100), l: Math.round(l * 100) };
}

function panneau(onglet, contenu, { largeur = 500 } = {}) {
  const onglets = onglet === 'Réglages communs'
    ? '<span class="retour">← Retour aux palettes et à la planche</span><span class="actif-titre">Réglages communs</span>'
    : `<span class="${onglet === 'Palettes' ? 'actif' : 'inactif'}">Palettes</span><span class="${onglet === 'Planches' ? 'actif' : 'inactif'}">Planches</span><span class="engrenage">⚙</span>`;
  return `<div class="fp" style="width:${largeur}px"><div class="fp-barre">${onglets}</div><div class="fp-corps">${contenu}</div></div>`;
}

function barreDuSelecteur(palette) {
  return `<div class="fp-select"><div class="champ grand"><span class="pastille rond" style="background:${palette.reference}"></span><b class="coupe">${esc(palette.nom)}</b><span class="fleche">▾</span></div><div class="btn-f">+ Nouvelle palette</div><div class="bouton-icone grand">⋯</div></div><div class="fp-h1"><span>Palette ${esc(palette.nom)}</span><span class="aide">Enregistré</span></div>`;
}

/** L'en-tête de la carte d'aperçu : onglets de thème à gauche, pastille du fond à droite. */
function teteDApercu(mode, { ouverte = false } = {}) {
  const onglet = (m) => `<span class="${m === mode ? 'on' : ''}">Thème ${NOMS_DE_MODE[m]}</span>`;
  return `<div class="tete-apercu"><div class="onglets-theme">${onglet('light')}${onglet('dark')}</div><div class="fond-f"><span class="libelle">Fond</span><span class="pastille-fond${ouverte ? ' ouverte' : ''}"><i style="background:${FONDS[mode]}"></i>${FONDS[mode]}</span></div></div>`;
}

/** Le sélecteur de couleur embarqué : zone, teinte, format et code, puis les pastilles proposées. */
function selecteurDeCouleur(hexa, { pastilles, titrePastilles, mention, pointe = 'droite', format = 'Hex' }) {
  const { h, s, v } = hsv(hexa);
  const code = format === 'Hex' ? hexa.slice(1) : format === 'RGB' ? rgbDe(hexa).join('   ') : `${h}°   ${hsl(hexa).s} %   ${hsl(hexa).l} %`;
  return `<div class="picker pointe-${pointe}">
    <div class="sv" style="background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${h} 100% 50%))"><i style="left:${(s * 100).toFixed(1)}%;top:${((1 - v) * 100).toFixed(1)}%"></i></div>
    <div class="hue"><i style="left:${((h / 360) * 100).toFixed(1)}%"></i></div>
    <div class="picker-ligne"><span class="format">${format} ▾</span><span class="code${format === 'Hex' ? ' focus' : ''}">${code}</span></div>
    ${mention ? `<p class="mention">${esc(mention)}</p>` : ''}
    <div class="picker-sep"></div>
    <div class="picker-titre">${esc(titrePastilles)}</div>
    <div class="picker-pastilles">${pastilles.map(({ hexa: p, titre }) => `<i title="${esc(titre)}" style="background:${p}"${p === hexa ? ' class="choisie"' : ''}></i>`).join('')}</div>
  </div>`;
}

/** Le nuancier de la carte d'aperçu, en réduction : numéros et deux rangées. */
function nuancier(palette, mode, { accolades = true, crans = null } = {}) {
  const soft = palette.rampe('soft', mode);
  const vivid = palette.rampe('vivid', mode);
  const garder = (rampe) => (crans ? rampe.filter(({ numero }) => crans.includes(numero)) : rampe);
  const colonnes = garder(vivid).length;
  const ligne = (rampe, profil) => garder(rampe).map((cran) => `<span class="sw${palette.profil === profil && palette.reperes[mode] === cran.numero ? ' ref' : ''}" style="background:${cran.hexa};color:${encre(cran.couleur)}"></span>`).join('');
  const onSolid = crans ? '' : `<span class="sw onsolid" style="background:${FONDS[mode]}"></span>`;
  return `<div class="surface" style="background:${FONDS[mode]};--col:${colonnes};--encre:${mode === 'light' ? '#1E1E1E' : '#F5F5F5'}">
    <div class="grille${crans ? ' libre' : ''}"><span></span>${crans ? '' : '<span></span>'}${garder(vivid).map(({ numero }) => `<span class="num">${numero}</span>`).join('')}
    <span class="prof">Soft</span>${onSolid}${ligne(soft, 'soft')}<span class="prof">Vivid</span>${ligne(vivid, 'vivid')}</div>
    ${accolades && !crans ? '<div class="acc-note">accolades des rôles : on-solid · surface · solid · text, puis border-decorative · border-control · focus</div>' : ''}
  </div>`;
}

const refLigne = (palette, mode) => `<div class="ref-ligne">◆ Référence : ${NOMS_DE_PROFIL[palette.profil]} · nuance ${palette.reperes[mode]}</div>`;

/* W3.1 : sélecteur de couleur */

function sectionSelecteur() {
  const rampeBleue = BLEU.rampe('vivid', 'light');
  const surFond = panneau('Palettes', `${barreDuSelecteur(BLEU)}
    <div class="carte-f">${teteDApercu('light', { ouverte: true })}
      <div class="ancre-picker">${selecteurDeCouleur(FONDS.light, {
        pastilles: [{ hexa: FONDS.light, titre: 'Fond Light par défaut' }, { hexa: '#FFFFFF', titre: 'Blanc' }, { hexa: FONDS.dark, titre: 'Fond Dark par défaut' }, ...rampeBleue.slice(0, 2).map((c) => ({ hexa: c.hexa, titre: `Vivid ${c.numero}` }))],
        titrePastilles: 'Fonds par défaut et nuances claires',
        mention: 'Ce fond s’applique à toutes les palettes.',
      })}</div>
      ${nuancier(BLEU, 'light')}${refLigne(BLEU, 'light')}
    </div>
    <div class="accordeon"><span class="chevron">⌄</span><b>Garanties de contraste</b><span class="resume">Thème Light · Soft ✓ Vivid ✓</span></div>
    <div class="accordeon"><span class="chevron">›</span><b>Intensités</b><span class="resume">Communes · Soft 0,45 · Vivid 0,95</span></div>
    <div class="accordeon"><span class="chevron">›</span><b>Dérive de teinte</b><span class="resume">Tailwind · synchronisée</span></div>`);
  const surReference = panneau('Palettes', `${barreDuSelecteur(BLEU)}
    <div class="carte-f"><div class="carte-titre">Configuration de la palette</div>
      <div class="trois"><div><span class="libelle">Nom de la palette</span><div class="champ">Bleu</div></div>
      <div><span class="libelle">Couleur de référence</span><div class="champ-ligne"><span class="pipette-f ouverte" style="background:${BLEU.reference}"></span><div class="champ">${BLEU.reference}</div></div></div>
      <div><span class="libelle">Palette de base</span><div class="segment"><span class="on">Auto</span><span>Soft</span><span>Vivid</span></div><span class="aide">Auto a choisi Vivid</span></div></div>
      <div class="ancre-picker gauche">${selecteurDeCouleur(BLEU.reference, {
        pastilles: rampeBleue.map((c) => ({ hexa: c.hexa, titre: `Vivid ${c.numero}` })),
        titrePastilles: 'Nuances de la palette ouverte',
        pointe: 'gauche',
      })}</div>
    </div>
    <div class="carte-f">${teteDApercu('light')}${nuancier(BLEU, 'light')}${refLigne(BLEU, 'light')}</div>
    <div class="accordeon"><span class="chevron">⌄</span><b>Garanties de contraste</b><span class="resume">Thème Light · Soft ✓ Vivid ✓</span></div>`);
  const formats = ['Hex', 'RGB', 'HSL'].map((format) => `<div class="mini-picker"><b>${format}</b>${selecteurDeCouleur(BLEU.reference, { pastilles: [], titrePastilles: '', format })}</div>`).join('');
  return `<section class="bloc" id="w3-1">
  <div class="tete"><span class="sur">W3.1 · Sélecteur de couleur</span><h2>Choisir une couleur en hexadécimal, sans quitter le panneau</h2></div>
  <p>Le sélecteur s’ouvre sous le contrôle qui l’appelle, par-dessus le contenu, sans le pousser. Zone de saturation et de luminosité, curseur de teinte, puis le code, en hexadécimal par défaut. Le menu de format propose RGB et HSL ; le code saisi reste dans son champ tant qu’il est invalide, comme aujourd’hui. Aucune opacité : une palette n’en a pas.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${surFond}<p class="legende">Ouvert depuis la pastille du fond, Thème Light. La mention du fond commun se lit sous le code. Les pastilles proposent les deux fonds par défaut, le blanc et les deux nuances les plus claires de la palette ouverte.</p></div>
    <div>${surReference}<p class="legende">Ouvert depuis la pastille de la couleur de référence. Les pastilles sont les onze nuances Vivid de la palette ouverte : prendre la 500 comme nouvelle référence est un clic.</p></div>
  </div></div>
  <div class="scene"><div class="scene-rangee">${formats}</div></div>
  <p class="legende">Le même code, #1E6FD9, dans les trois formats. Le champ du code reçoit le focus à l’ouverture en Hex ; en RGB et HSL, trois champs séparés par Tab.</p>
  <div class="faits">
    <div><b>Clavier</b><span>Flèches sur la zone : 1 % de saturation ou de valeur, 10 % avec Maj. Flèches sur la teinte : 1°, 10° avec Maj. Entrée valide le code saisi ; Échap referme et rend le focus au contrôle d’origine.</span></div>
    <div><b>Enregistrement</b><span>Un glisser prévisualise l’aperçu ; sa fin enregistre, comme les curseurs d’intensité. Une saisie du code enregistre à Entrée ou à la sortie du champ.</span></div>
    <div><b>Pipette de l’écran</b><span>Pas dessinée. L’API <code>EyeDropper</code> n’a pas été vérifiée dans l’iframe de Figma ; le test <code>'EyeDropper' in window</code> se fait à la recette, avant de l’ajouter.</span></div>
    <div><b>Sans requête</b><span>Dégradés en CSS, conversions par le moteur de couleur déjà inclus dans l’interface.</span></div>
  </div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>Les pastilles proposées.</b> Sur la référence, les onze nuances Vivid de la palette ; sur un fond, les fonds par défaut, le blanc et les deux nuances les plus claires. <span class="reco">Recommandé : ces deux listes.</span> Autre choix : les références des autres palettes.</li>
    <li><b>Le format retenu.</b> Le menu revient à Hex à chaque ouverture, ou garde le dernier format choisi pendant la session. <span class="reco">Recommandé : Hex à chaque ouverture</span>, puisque c’est l’exigence.</li>
    <li><b>La place.</b> Un sélecteur de 232 px sous le contrôle, aligné sur son bord. <span class="reco">Recommandé.</span> Autre choix : une carte pleine largeur sous la ligne du contrôle, qui pousse le contenu.</li>
  </ol></div>
</section>`;
}

/* W3.2 : luminosité des nuances */

function traceDesCourbes(largeur, hauteur) {
  const { crans, courbes } = DEFAUT;
  const x = (rang) => 8 + (rang * (largeur - 16)) / (crans.length - 1);
  const y = (L) => 6 + (1 - L) * (hauteur - 12);
  const ligne = (courbe) => courbe.map((L, rang) => `${x(rang).toFixed(1)},${y(L).toFixed(1)}`).join(' ');
  const points = (courbe) => courbe.map((L, rang) => `<circle cx="${x(rang).toFixed(1)}" cy="${y(L).toFixed(1)}" r="2.2"/>`).join('');
  return `<svg class="trace" viewBox="0 0 ${largeur} ${hauteur}" width="${largeur}" height="${hauteur}"><g stroke="#5E5E5E" stroke-width="1"><line x1="0" x2="${largeur}" y1="${y(0.5)}" y2="${y(0.5)}" stroke-dasharray="2 3"/></g><polyline points="${ligne(courbes.light)}" fill="none" stroke="#E6E6E6" stroke-width="1.5"/><polyline points="${ligne(courbes.dark)}" fill="none" stroke="#E6E6E6" stroke-width="1.5" stroke-dasharray="4 3"/><g fill="#E6E6E6">${points(courbes.light)}${points(courbes.dark)}</g><text x="${largeur - 4}" y="12" text-anchor="end" fill="#B3B3B3" font-size="9">Trait plein : Light · tireté : Dark</text></svg>`;
}

function carteLuminosite(disposition) {
  const { crans, courbes } = DEFAUT;
  const tete = '<div class="carte-titre"><span>Luminosité des nuances</span><span class="droite"><span class="aide">2 palettes concernées</span><span class="lien">Rétablir</span></span></div>';
  if (disposition === 'A') {
    const rang = (titre, valeurs) => `<span class="libelle">${titre}</span>${valeurs.map((v) => `<span class="mini-champ-f">${nombre(v)}</span>`).join('')}`;
    return `<div class="carte-f">${tete}${traceDesCourbes(466, 110)}
      <div class="table-lum"><span></span>${crans.map((n) => `<span class="num-f">${n}</span>`).join('')}${rang('Light', courbes.light)}${rang('Dark', courbes.dark)}</div>
      <p class="aide">Luminosité OKLCH de chaque nuance, entre 0 et 1. Les changements s’appliquent à toutes les palettes.</p></div>`;
  }
  const lignes = crans.map((n, i) => `<span class="num-f g">${n}</span><span class="mini-champ-f">${nombre(courbes.light[i])}</span><span class="mini-champ-f">${nombre(courbes.dark[i])}</span>`).join('');
  return `<div class="carte-f">${tete}<div class="cote-a-cote">${traceDesCourbes(270, 260)}<div class="liste-lum"><span></span><span class="libelle c">Light</span><span class="libelle c">Dark</span>${lignes}</div></div>
    <p class="aide">Luminosité OKLCH de chaque nuance, entre 0 et 1. Les changements s’appliquent à toutes les palettes.</p></div>`;
}

function sectionLuminosite() {
  const apercu = `<div class="reglages-tete"><span class="libelle">Palette ouverte : Bleu · Thème Light</span><span class="aide">Soft ✓ Vivid ✓</span></div>`;
  return `<section class="bloc" id="w3-2">
  <div class="tete"><span class="sur">W3.2 · Luminosité des nuances</span><h2>Des champs à la taille du reste de l’interface</h2></div>
  <p>Les champs passent de la taille d’un titre à celle du corps de l’interface, 11 px, dans des champs de 24 px de haut : ce sont des valeurs à régler une à une, pas à lire de loin. Les trois niveaux de titre restent ceux de l’onglet Palettes : titre de carte à 12 px, libellé et valeur à 11 px.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${panneau('Réglages communs', apercu + carteLuminosite('A'))}<p class="legende"><b>A · Table sous le tracé.</b> Le tracé prend la largeur de la carte ; dessous, une colonne par nuance, alignée sur les points du tracé, Light puis Dark. Onze champs de 36 px tiennent à 500 px.</p></div>
    <div>${panneau('Réglages communs', apercu + carteLuminosite('B'))}<p class="legende"><b>B · Tracé et liste côte à côte.</b> Une ligne par nuance, Light et Dark sur la même ligne. La carte gagne 150 px de haut, et le tracé se lit plus petit.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : A</span>, qui aligne chaque champ sur son point du tracé et garde la carte basse. B se lit mieux nuance par nuance, au prix de la hauteur.</li>
    <li><b>Le pas des flèches.</b> Flèche haut et bas dans un champ : 0,005, et 0,05 avec Maj. <span class="reco">Recommandé.</span></li>
  </ol></div>
</section>`;
}

/* W3.3 : minimums et détection */

function cartesDesSeuils(disposition) {
  const { seuils } = DEFAUT;
  const minimums = [['Texte', seuils.texte, ':1', 'Pour text sur surface, on-solid sur solid et text sur fond.'], ['Éléments graphiques', seuils.nonTexte, ':1', 'Pour la bordure de champ, l’anneau de focus et le fond plein au survol.']];
  const detection = [['Soft et Vivid', seuils.profilsConfondus, 'ΔEok', 'Écart minimal entre les deux profils d’une même nuance.'], ['Deux palettes', seuils.palettesProches, 'ΔEok', 'Écart minimal entre deux palettes, mesuré sur les nuances 500 à 700.'], ['Couleur presque grise', seuils.chromaGrise, 'chroma', 'Sous ce seuil, la dérive de teinte se désactive.']];
  const tete = (titre, resume) => `<div class="carte-titre"><span>${titre}</span><span class="droite"><span class="aide">${resume}</span><span class="lien">Rétablir</span></span></div>`;
  if (disposition === 'A') {
    const lignes = (liste) => liste.map(([libelle, valeur, unite, aide]) => `<div class="seuil-ligne"><div><span>${libelle}</span><span class="aide petit">${aide}</span></div><span class="mini-champ-f large">${nombre(valeur)}</span><span class="unite">${unite}</span></div>`).join('');
    return `<div class="carte-f">${tete('Minimums des promesses', 'Texte 4,5:1 · Éléments graphiques 3:1')}${lignes(minimums)}<p class="aide">Ces minimums décident du résultat des garanties. Les couleurs ne changent pas.</p></div>
      <div class="carte-f">${tete('Détection des couleurs proches', 'Soft et Vivid 0,02 · Deux palettes 0,05 · Gris 0,03')}${lignes(detection)}<p class="aide">Ces seuils déclenchent des signalements. Ils ne mesurent pas la lisibilité.</p></div>`;
  }
  const colonnes = (liste) => `<div class="seuil-grille" style="--n:${liste.length}">${liste.map(([libelle, valeur, unite]) => `<div><span class="libelle">${libelle}</span><div class="champ-ligne"><span class="mini-champ-f large">${nombre(valeur)}</span><span class="unite">${unite}</span></div></div>`).join('')}</div>`;
  const aides = (liste) => `<ul class="aides">${liste.map(([libelle, , , aide]) => `<li><b>${libelle}</b> : ${aide.charAt(0).toLowerCase()}${aide.slice(1)}</li>`).join('')}</ul>`;
  return `<div class="carte-f">${tete('Minimums des promesses', 'Texte 4,5:1 · Éléments graphiques 3:1')}${colonnes(minimums)}${aides(minimums)}</div>
    <div class="carte-f">${tete('Détection des couleurs proches', 'Soft et Vivid 0,02 · Deux palettes 0,05 · Gris 0,03')}${colonnes(detection)}${aides(detection)}</div>`;
}

function sectionSeuils() {
  return `<section class="bloc" id="w3-3">
  <div class="tete"><span class="sur">W3.3 · Minimums des promesses et détection des couleurs proches</span><h2>Libellé, valeur et unité sur une ligne, l’aide sans infobulle</h2></div>
  <p>Les deux cartes sont dépliées ; repliées, leur en-tête garde le résumé actuel. Chaque valeur a son unité à droite du champ, et son aide se lit sans survol.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${panneau('Réglages communs', cartesDesSeuils('A'))}<p class="legende"><b>A · Une ligne par seuil.</b> Le libellé et son aide à gauche, le champ et l’unité alignés à droite, sur la même colonne pour tous les seuils.</p></div>
    <div>${panneau('Réglages communs', cartesDesSeuils('B'))}<p class="legende"><b>B · Champs en colonnes, aides dessous.</b> Le modèle des colonnes de « Configuration de la palette » ; les aides forment une liste sous les champs.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : A</span>, qui garde chaque aide à côté de sa valeur et aligne les champs. B est plus basse mais sépare l’aide de son champ.</li>
    <li><b>L’unité ΔEok.</b> Le designer ne la connaît pas. <span class="reco">Recommandé : la garder</span>, l’aide dit ce qu’elle compare.</li>
  </ol></div>
</section>`;
}

/* W3.4 : planche, second tour */

let calques = 0;
/** Un cadre de la planche : il compte pour un calque, comme dans le modèle. */
const F = (style, ...enfants) => { calques += 1; return `<div class="c" style="${style}">${enfants.join('')}</div>`; };
const T = (style, texte) => { calques += 1; return `<span class="t" style="${style}">${esc(texte)}</span>`; };
/** Compte les calques d'un morceau de planche, sans toucher au compte en cours. */
function mesurer(construire) {
  const avant = calques;
  calques = 0;
  const html = construire();
  const n = calques;
  calques = avant + n;
  return { html, n };
}

const ROLES = [
  { emploi: 'surface', titre: 'Fonds légers', fr: 'fond d’un bloc, d’un bouton soft' },
  { emploi: 'text', titre: 'Textes colorés', fr: 'lien, texte d’accent' },
  { emploi: 'solid', titre: 'Fonds pleins', fr: 'bouton principal, badge plein' },
  { emploi: 'border-control', titre: 'Bordures de champ', fr: 'champ de saisie, case' },
  { emploi: 'focus', titre: 'Anneau de focus', fr: 'focus clavier' },
  { emploi: 'border-decorative', titre: 'Séparateurs', fr: 'filet, bordure de carte' },
];
/** Le vocabulaire des états, celui des composants : `focus` est l'état que porte son propre emploi. */
const ETATS = ['default', 'hover', 'active'];
const MONO = "'IBM Plex Mono',monospace";
const PAS = 56;
const ECART = 4;
const LIBELLE = 48;

function encresDe(mode) {
  return mode === 'light'
    ? { encre: '#1E1E1E', seconde: 'rgba(30,30,30,.62)', filet: 'rgba(30,30,30,.14)', neutre: 'rgba(30,30,30,.06)' }
    : { encre: '#F5F5F5', seconde: 'rgba(245,245,245,.62)', filet: 'rgba(245,245,245,.16)', neutre: 'rgba(245,245,245,.06)' };
}

/** Les nuances d'un profil et d'un thème, par numéro. */
function nuances(palette, profil, mode) {
  const rampe = palette.rampe(profil, mode);
  return (numero) => rampe.find((c) => c.numero === numero).hexa;
}

/** Le spécimen d'un rôle, peint des nuances de la rampe. */
function specimen(emploi, hexa, n, fond, encres) {
  const boite = 'border-radius:6px;padding:0 10px;height:30px;width:96px;display:flex;align-items:center';
  switch (emploi) {
    case 'surface': return F(`${boite};background:${hexa}`, T(`color:${n(700)};font-size:11px;font-weight:600`, 'Soft'));
    case 'text': return F(`${boite};padding:0`, T(`color:${hexa};font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:3px`, 'Lien coloré'));
    case 'solid': return F(`${boite};background:${hexa};justify-content:center`, T(`color:${fond};font-size:11px;font-weight:600`, 'Bouton'));
    case 'border-control': return F(`${boite};background:${fond};box-shadow:inset 0 0 0 1px ${hexa}`, T(`color:${encres.seconde};font-size:11px`, 'Champ'));
    case 'focus': return F(`${boite};background:${fond};box-shadow:inset 0 0 0 1px ${n(600)},0 0 0 2px ${fond},0 0 0 4px ${hexa}`, T(`color:${encres.encre};font-size:11px`, 'Champ'));
    default: return F(`${boite};padding:0`, F(`height:1px;width:96px;background:${hexa}`));
  }
}

/** La garantie d'un état dans ce profil et ce thème : celle où il est premier membre, sinon second. */
function garantieDe(palette, emploi, decalage, profil, mode) {
  const est = (membre) => 'emploi' in membre && membre.emploi === emploi && membre.decalage === decalage;
  const ici = palette.promesses.filter((p) => p.mode === mode && p.profil === profil);
  return ici.find((p) => est(p.paire.premier)) ?? ici.find((p) => est(p.paire.second)) ?? null;
}

function sectionDesUsages(palette, mode, encres) {
  const profil = palette.profil;
  const rampe = palette.rampe(profil, mode);
  const n = nuances(palette, profil, mode);
  const fond = FONDS[mode];
  const colonne = 'width:112px;flex:none';
  const entete = F(`display:flex;gap:12px;padding-bottom:6px`,
    F('width:176px;flex:none'),
    ...ETATS.map((etat) => T(`${colonne};font:600 10px/12px ${MONO};color:${encres.seconde};letter-spacing:.04em`, etat)));
  const lignes = ROLES.map(({ emploi, titre, fr }) => {
    const depart = rampe.findIndex((c) => c.numero === TABLE_DES_EMPLOIS[emploi]);
    const cellules = decalagesDeLEmploi(emploi).map((decalage) => {
      const cran = rampe[depart + decalage];
      const garantie = garantieDe(palette, emploi, decalage, profil, mode);
      const manquee = garantie?.verdict === 'manquee';
      const mesure = garantie ? `${manquee ? '✗' : '✓'} ${ecrireContraste(garantie.contraste)}:1` : '';
      return F(`display:flex;flex-direction:column;gap:6px;${colonne}`,
        specimen(emploi, cran.hexa, n, fond, encres),
        F('display:flex;gap:6px;align-items:baseline',
          T(`font:600 10px/12px ${MONO};color:${encres.encre}`, String(cran.numero)),
          ...(mesure ? [T(`font:${manquee ? 600 : 400} 10px/12px ${MONO};color:${manquee ? '#C7321B' : encres.seconde}`, mesure)] : [])));
    });
    return F(`display:flex;gap:12px;padding:12px 0;border-top:1px solid ${encres.filet};align-items:flex-start`,
      F('display:flex;flex-direction:column;gap:2px;width:176px;flex:none',
        T(`font-size:12px;font-weight:600;color:${encres.encre}`, titre),
        T(`font:500 10px/13px ${MONO};color:${encres.seconde}`, `${emploi}${emploi === 'focus' ? ' · état focus' : ''}`),
        T(`font-size:10px;line-height:13px;color:${encres.seconde}`, fr)),
      ...cellules);
  });
  return F('display:flex;flex-direction:column',
    T(`font-size:15px;font-weight:600;color:${encres.encre};padding-bottom:10px`, `Quelle nuance pour quel usage · ${NOMS_DE_PROFIL[profil]}`),
    entete, ...lignes);
}

/** Une rampe en rangée de pastilles, colonnes de PAS pixels : la grille des contrastes s'aligne dessous. */
function rangeeDeRampe(palette, profil, mode, encres, { codes = true } = {}) {
  return F(`display:flex;gap:${ECART}px;align-items:flex-start`,
    T(`width:${LIBELLE - ECART}px;font-size:11px;font-weight:600;color:${encres.encre};padding-top:9px`, NOMS_DE_PROFIL[profil]),
    ...palette.rampe(profil, mode).map((cran) => F(`display:flex;flex-direction:column;gap:3px;width:${PAS}px`,
      F(`height:32px;border-radius:6px;background:${cran.hexa};display:flex;align-items:center;justify-content:center`,
        ...(palette.profil === profil && palette.reperes[mode] === cran.numero ? [T(`color:${encre(cran.couleur)};font-size:11px`, '◆')] : [])),
      ...(codes ? [T(`font:500 9.5px/12px ${MONO};color:${encres.seconde}`, cran.hexa.slice(1))] : []))));
}

function numeros(palette, mode, encres) {
  return F(`display:flex;gap:${ECART}px`, F(`width:${LIBELLE - ECART}px`),
    ...palette.rampe('vivid', mode).map(({ numero }) => T(`width:${PAS}px;font:600 10px/12px ${MONO};color:${encres.seconde}`, String(numero))));
}

function sectionDesRampes(palette, mode, encres) {
  return F('display:flex;flex-direction:column;gap:8px',
    T(`font-size:15px;font-weight:600;color:${encres.encre}`, 'Les deux rampes'),
    numeros(palette, mode, encres), rangeeDeRampe(palette, 'soft', mode, encres), rangeeDeRampe(palette, 'vivid', mode, encres));
}

/**
 * La grille des contrastes d'un profil, alignée sur les rampes : la ligne dit le fond, la colonne le texte.
 * Une case qui tient 3:1 se peint de sa vraie paire ; en dessous, elle s'efface.
 */
function grilleDesContrastes(palette, profil, mode, encres) {
  const rampe = palette.rampe(profil, mode);
  const { texte, nonTexte } = DEFAUT.seuils;
  const lignes = rampe.map((fond) => F(`display:flex;gap:${ECART}px;align-items:center`,
    F(`width:${LIBELLE - ECART}px;display:flex;align-items:center;gap:4px`,
      F(`width:12px;height:12px;border-radius:3px;background:${fond.hexa}`),
      T(`font:600 9.5px/12px ${MONO};color:${encres.seconde}`, String(fond.numero))),
    ...rampe.map((lettre) => {
      const valeur = contraste(fond.couleur, lettre.couleur);
      if (fond.numero === lettre.numero) return F(`width:${PAS}px;height:24px`);
      if (valeur < nonTexte) return F(`width:${PAS}px;height:24px;border-radius:4px;background:${encres.neutre};display:flex;align-items:center;justify-content:center`, T(`font:400 9.5px/12px ${MONO};color:${encres.seconde};opacity:.7`, ecrireContraste(valeur)));
      return F(`width:${PAS}px;height:24px;border-radius:4px;background:${fond.hexa};display:flex;align-items:center;justify-content:center`,
        T(`font:${valeur >= texte ? 700 : 400} 10.5px/12px ${MONO};color:${lettre.hexa}`, ecrireContraste(valeur)));
    })));
  return F('display:flex;flex-direction:column;gap:4px',
    rangeeDeRampe(palette, profil, mode, encres, { codes: false }), ...lignes);
}

function sectionDesContrastes(palette, mode, encres) {
  const { texte, nonTexte } = DEFAUT.seuils;
  return F(`display:flex;flex-direction:column;gap:14px;padding-top:16px;border-top:1px solid ${encres.filet}`,
    F('display:flex;justify-content:space-between;align-items:baseline',
      T(`font-size:15px;font-weight:600;color:${encres.encre}`, 'Contrastes, nuance par nuance'),
      T(`font-size:10px;color:${encres.seconde}`, `Ligne : fond · colonne : texte · gras ≥ ${nombre(texte)}:1 · maigre ≥ ${nombre(nonTexte)}:1 · effacé en dessous`)),
    grilleDesContrastes(palette, 'soft', mode, encres),
    grilleDesContrastes(palette, 'vivid', mode, encres));
}

/* Interfaces d'exemple, à la manière de Radix Themes : le profil porteur, ses emplois et leurs états. */

const bouton = (style, texte, couleur) => F(`height:30px;padding:0 12px;border-radius:6px;display:flex;align-items:center;${style}`, T(`font-size:11px;font-weight:600;color:${couleur}`, texte));

/** Les variantes d'un bouton : l'état avance d'une nuance, fond et texte ensemble. */
function variantesDeBouton(n, fond, etat) {
  const d = [0, 100, 200][etat];
  return [
    ['solid', `background:${n(700 + d)}`, fond],
    ['soft', `background:${n(100 + d)}`, n(700)],
    ['outline', `box-shadow:inset 0 0 0 1px ${n(600 + d)};background:${etat ? n(etat === 1 ? 100 : 200) : 'transparent'}`, n(700)],
    ['ghost', `background:${etat ? n(etat === 1 ? 100 : 200) : 'transparent'}`, n(700)],
  ];
}

/** E1 : les composants par variante et par état, comme la page de thème de Radix. */
function exempleComposants(palette, mode, encres) {
  const n = nuances(palette, palette.profil, mode);
  const fond = FONDS[mode];
  const colonne = 'width:96px;flex:none';
  const entete = F('display:flex;gap:12px', F('width:64px;flex:none'), ...ETATS.map((etat) => T(`${colonne};font:600 10px/12px ${MONO};color:${encres.seconde}`, etat)));
  const lignes = ['solid', 'soft', 'outline', 'ghost'].map((variante, rang) => F('display:flex;gap:12px;align-items:center',
    T(`width:64px;flex:none;font:500 10px/12px ${MONO};color:${encres.seconde}`, variante),
    ...ETATS.map((_, etat) => { const [, style, couleur] = variantesDeBouton(n, fond, etat)[rang]; return F(colonne, bouton(style, 'Bouton', couleur)); })));
  const badges = F('display:flex;gap:8px;align-items:center',
    T(`width:64px;flex:none;font:500 10px/12px ${MONO};color:${encres.seconde}`, 'badge'),
    F(`padding:2px 8px;border-radius:999px;background:${n(700)}`, T(`font-size:10px;font-weight:600;color:${fond}`, 'Solid')),
    F(`padding:2px 8px;border-radius:999px;background:${n(100)}`, T(`font-size:10px;font-weight:600;color:${n(700)}`, 'Soft')),
    F(`padding:2px 8px;border-radius:999px;box-shadow:inset 0 0 0 1px ${n(300)}`, T(`font-size:10px;font-weight:600;color:${n(700)}`, 'Outline')));
  const champs = F('display:flex;gap:12px;align-items:center',
    T(`width:64px;flex:none;font:500 10px/12px ${MONO};color:${encres.seconde}`, 'champ'),
    ...[['default', n(600), ''], ['hover', n(700), ''], ['focus', n(600), `,0 0 0 2px ${fond},0 0 0 4px ${n(600)}`]].map(([etat, bord, anneau]) => F(`${colonne};height:30px;border-radius:6px;background:${fond};box-shadow:inset 0 0 0 1px ${bord}${anneau};display:flex;align-items:center;padding:0 10px`, T(`font-size:11px;color:${encres.seconde}`, etat))));
  const controles = F('display:flex;gap:12px;align-items:center',
    T(`width:64px;flex:none;font:500 10px/12px ${MONO};color:${encres.seconde}`, 'contrôles'),
    F(`width:16px;height:16px;border-radius:4px;background:${n(700)};display:flex;align-items:center;justify-content:center`, T(`font-size:11px;color:${fond};font-weight:700`, '✓')),
    F(`width:16px;height:16px;border-radius:4px;box-shadow:inset 0 0 0 1px ${n(600)}`),
    F(`width:32px;height:18px;border-radius:9px;background:${n(700)};display:flex;align-items:center;justify-content:flex-end;padding:2px`, F(`width:14px;height:14px;border-radius:50%;background:${fond}`)),
    F(`width:120px;height:6px;border-radius:3px;background:${n(200)};display:flex`, F(`width:72px;height:6px;border-radius:3px;background:${n(700)}`)));
  return F('display:flex;flex-direction:column;gap:10px', entete, ...lignes, badges, champs, controles);
}

/** E2 : un écran composé, une carte de réglages où chaque emploi a sa place. */
function exempleEcran(palette, mode, encres) {
  const n = nuances(palette, palette.profil, mode);
  const fond = FONDS[mode];
  return F(`display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:12px;background:${fond};box-shadow:inset 0 0 0 1px ${n(300)};width:420px`,
    F('display:flex;justify-content:space-between;align-items:center',
      T(`font-size:15px;font-weight:600;color:${encres.encre}`, 'Paramètres de l’équipe'),
      F(`padding:2px 8px;border-radius:999px;background:${n(100)}`, T(`font-size:10px;font-weight:600;color:${n(700)}`, 'Nouveau'))),
    F(`display:flex;gap:16px;box-shadow:inset 0 -1px 0 ${n(300)}`,
      F(`padding:0 0 8px;box-shadow:inset 0 -2px 0 ${n(700)}`, T(`font-size:11px;font-weight:600;color:${encres.encre}`, 'Général')),
      F('padding:0 0 8px', T(`font-size:11px;color:${encres.seconde}`, 'Membres')),
      F('padding:0 0 8px', T(`font-size:11px;color:${encres.seconde}`, 'Facturation'))),
    F('display:flex;flex-direction:column;gap:6px',
      T(`font-size:11px;font-weight:500;color:${encres.encre}`, 'Nom de l’équipe'),
      F(`height:30px;border-radius:6px;background:${fond};box-shadow:inset 0 0 0 1px ${n(600)},0 0 0 2px ${fond},0 0 0 4px ${n(600)};display:flex;align-items:center;padding:0 10px`, T(`font-size:11px;color:${encres.encre}`, 'Studio Nord'))),
    F('display:flex;gap:16px;align-items:center',
      F('display:flex;gap:8px;align-items:center',
        F(`width:16px;height:16px;border-radius:4px;background:${n(700)};display:flex;align-items:center;justify-content:center`, T(`font-size:11px;color:${fond};font-weight:700`, '✓')),
        T(`font-size:11px;color:${encres.encre}`, 'Notifier les membres')),
      F('display:flex;gap:8px;align-items:center',
        F(`width:32px;height:18px;border-radius:9px;background:${n(700)};display:flex;align-items:center;justify-content:flex-end;padding:2px`, F(`width:14px;height:14px;border-radius:50%;background:${fond}`)),
        T(`font-size:11px;color:${encres.encre}`, 'Accès invité'))),
    F(`display:flex;gap:8px;padding:10px 12px;border-radius:8px;background:${n(100)};box-shadow:inset 0 0 0 1px ${n(300)}`,
      T(`font-size:11px;font-weight:700;color:${n(700)}`, 'ⓘ'),
      T(`font-size:11px;line-height:15px;color:${n(700)}`, 'Les membres invités reçoivent un e-mail. En savoir plus')),
    F('display:flex;gap:8px;justify-content:flex-end',
      bouton('background:transparent', 'Annuler', n(700)),
      bouton(`background:${n(100)}`, 'Brouillon', n(700)),
      bouton(`background:${n(700)}`, 'Enregistrer', fond)));
}

const EXEMPLES = { E1: { titre: 'Composants par variante', faire: exempleComposants }, E2: { titre: 'Écran composé', faire: exempleEcran } };

function sectionDExemple(palette, mode, encres, cle) {
  return F(`display:flex;flex-direction:column;gap:12px;padding-top:16px;border-top:1px solid ${encres.filet}`,
    T(`font-size:15px;font-weight:600;color:${encres.encre}`, `Interface d’exemple · ${NOMS_DE_PROFIL[palette.profil]}`),
    EXEMPLES[cle].faire(palette, mode, encres));
}

/** Un thème du cadre : en-tête et verdict, usages, rampes, interface d'exemple, contrastes. */
function themeDuCadre(palette, mode, { exemple, grilles }) {
  const encres = encresDe(mode);
  const echecs = palette.manquees(mode);
  return F(`display:flex;flex-direction:column;gap:24px;padding:24px;background:${FONDS[mode]};border-radius:12px`,
    F('display:flex;justify-content:space-between;align-items:baseline',
      T(`font:600 11px/14px ${MONO};color:${encres.seconde};letter-spacing:.06em;text-transform:uppercase`, `Thème ${NOMS_DE_MODE[mode]} · fond ${FONDS[mode]}`),
      F(`padding:3px 10px;border-radius:999px;background:${echecs ? 'rgba(199,50,27,.12)' : encres.neutre}`,
        T(`font-size:11px;font-weight:600;color:${echecs ? '#C7321B' : encres.encre}`, echecs ? `${echecs} garantie${echecs > 1 ? 's' : ''} manquée${echecs > 1 ? 's' : ''}` : '✓ Toutes les garanties tenues'))),
    sectionDesUsages(palette, mode, encres),
    sectionDesRampes(palette, mode, encres),
    ...(exemple ? [sectionDExemple(palette, mode, encres, exemple)] : []),
    ...(grilles ? [sectionDesContrastes(palette, mode, encres)] : []));
}

function cadre(palette, { exemple = null, grilles = true } = {}) {
  calques = 0;
  const largeur = 2 * 24 + 2 * 24 + LIBELLE + palette.rampe('vivid', 'light').length * (PAS + ECART);
  const html = F(`display:flex;flex-direction:column;gap:16px;padding:24px;background:#FFFFFF;border-radius:4px;width:${largeur}px`,
    F('display:flex;flex-direction:column;gap:4px;padding-bottom:4px',
      T('font-size:28px;font-weight:600;color:#1E1E1E;letter-spacing:-.01em', palette.nom),
      T('font-size:12px;color:#555', `Couleur de référence ${palette.reference} · ${NOMS_DE_PROFIL[palette.profil]} · nuance ${palette.reperes.light} en Thème Light, ${palette.reperes.dark} en Thème Dark`)),
    themeDuCadre(palette, 'light', { exemple, grilles }),
    themeDuCadre(palette, 'dark', { exemple, grilles }));
  return { html, calques };
}

function sectionPlanche() {
  const sans = cadre(BLEU, { grilles: false });
  const avec = cadre(BLEU);
  const e1 = cadre(BLEU, { exemple: 'E1' });
  const e2 = cadre(BLEU, { exemple: 'E2' });
  const vert = cadre(VERT, { exemple: 'E2' });
  const apercus = ['light', 'dark'].flatMap((mode) => Object.keys(EXEMPLES).map((cle) => {
    const { html } = mesurer(() => F(`padding:20px;background:${FONDS[mode]};border-radius:12px;width:max-content`, EXEMPLES[cle].faire(BLEU, mode, encresDe(mode))));
    return `<div class="planche-scene"><div class="planche-cadre">${html}</div><p class="legende"><b>${cle} · ${EXEMPLES[cle].titre}</b>, Thème ${NOMS_DE_MODE[mode]}.</p></div>`;
  }));
  const coutExemple = (cle) => (cle === 'E1' ? e1 : e2).calques - avec.calques;
  const coutGrilles = avec.calques - sans.calques;
  return `<section class="bloc" id="w3-4">
  <div class="tete"><span class="sur">W3.4 · Planche générée, second tour</span><h2>Quelle nuance pour quel usage, du spécimen à la grille</h2></div>
  <p>Récit R1 retenu. Trois changements depuis le premier tour. Les états portent le vocabulaire des composants : <code>default</code>, <code>hover</code>, <code>active</code>, et <code>focus</code> pour l’anneau, qui est son propre emploi. Deux interfaces d’exemple, prises sur Radix Themes, sont proposées. Les grilles des contrastes passent dans chaque thème, alignées colonne par colonne sur les rampes, et peintes de leurs vraies couleurs.</p>
  <div class="faits">
    <div><b>Les états</b><span>Une en-tête de colonnes <code>default · hover · active</code> par section d’usages, au lieu d’une étiquette par case. Un emploi à un seul état n’occupe que la première colonne ; l’anneau se lit <code>focus</code>.</span></div>
    <div><b>Les grilles</b><span>Une ligne par nuance de fond, une colonne par nuance de texte, sous les pastilles de la rampe. Une paire à 3:1 ou plus se peint telle qu’elle se lira : le fond de la ligne, le ratio écrit dans la couleur de la colonne. En dessous, la case s’efface. Même nombre de cases qu’aujourd’hui.</span></div>
    <div><b>Les interfaces d’exemple</b><span>E1 reprend la page de thème de Radix : chaque variante de bouton dans ses trois états, badges, champ, contrôles. E2 compose un écran de réglages où chaque emploi a sa place : onglet, champ au focus, case, interrupteur, encart, trois boutons.</span></div>
  </div>
  <div class="scene"><div class="scene-rangee">${apercus.join('')}</div></div>
  <p>Le cadre complet de Bleu avec E2, puis celui de Vert, qui manque deux garanties au Thème Light.</p>
  <div class="scene"><div class="scene-rangee">
    <div class="planche-scene"><div class="planche-cadre">${e2.html}</div><p class="legende"><b>Bleu, avec E2.</b> ${e2.calques} calques.</p></div>
    <div class="planche-scene"><div class="planche-cadre">${vert.html}</div><p class="legende"><b>Vert, avec E2.</b> ${vert.calques} calques.</p></div>
  </div></div>
  <div class="recap"><table><thead><tr><th>Cadre de Bleu</th><th>Calques</th></tr></thead><tbody>
    <tr><td>Planche actuelle, sans grilles · avec grilles</td><td>${CALQUES_ACTUELS.sansGrille} · ${CALQUES_ACTUELS.avecGrille}</td></tr>
    <tr><td>R1, sans interface d’exemple ni grilles</td><td>${sans.calques}</td></tr>
    <tr><td>R1, avec grilles</td><td>${avec.calques}</td></tr>
    <tr><td>R1, avec grilles et E1</td><td>${e1.calques}</td></tr>
    <tr><td>R1, avec grilles et E2</td><td>${e2.calques}</td></tr>
  </tbody></table></div>
  <p class="note">Les calques se comptent sur l’arbre de la maquette, un cadre ou un texte pour un calque, comme <code>compterCalques</code>. Les grilles coûtent ${coutGrilles} calques pour les deux thèmes, E1 ${coutExemple('E1')} et E2 ${coutExemple('E2')}.</p>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>L’interface d’exemple.</b> <span class="reco">Recommandé : E2</span>, qui montre les emplois ensemble, là où la section des usages les montre déjà un par un avec leurs états. E1 double cette section, mais se compare directement à Radix.</li>
    <li><b>Les grilles.</b> Peintes de la paire réelle, effacées sous 3:1. <span class="reco">Recommandé.</span> Autre choix : garder les trois teintes de verdict actuelles dans le même alignement.</li>
    <li><b>Le vocabulaire dans le plugin.</b> La carte des garanties dit encore « repos · survol · appui ». <span class="reco">Recommandé : passer aussi à default · hover · active</span>, pour que la planche et le plugin disent la même chose.</li>
  </ol></div>
</section>`;
}

/* W3.5 : palette libre */

function sectionPaletteLibre() {
  const choisis = [100, 200, 400, 600, 800, 900];
  const puces = [];
  for (let n = 50; n <= 1050; n += 50) puces.push(`<span class="puce${choisis.includes(n) ? ' on' : ''}">${n}</span>`);
  const libre = { ...BLEU, nom: 'Bleu illustration' };
  const configuration = panneau('Palettes', `${barreDuSelecteur(libre)}
    <div class="carte-f"><div class="carte-titre">Configuration de la palette</div>
      <div class="trois"><div><span class="libelle">Nom de la palette</span><div class="champ">Bleu illustration</div></div>
      <div><span class="libelle">Couleur de référence</span><div class="champ-ligne"><span class="pipette-f" style="background:${BLEU.reference}"></span><div class="champ">${BLEU.reference}</div></div></div>
      <div><span class="libelle">Modèle</span><div class="segment"><span>Design system</span><span class="on">Libre</span></div><span class="aide">Sans rôles ni garanties</span></div></div>
      <div class="nuances-libres"><span class="libelle">Nuances · 6 sur 13 au plus</span><div class="puces">${puces.join('')}</div></div>
    </div>
    <div class="carte-f">${teteDApercu('light')}${nuancier(BLEU, 'light', { crans: choisis })}${refLigne(BLEU, 'light')}</div>
    <div class="accordeon"><span class="chevron">›</span><b>Intensités</b><span class="resume">Communes · Soft 0,45 · Vivid 0,95</span></div>
    <div class="accordeon"><span class="chevron">›</span><b>Dérive de teinte</b><span class="resume">Tailwind · synchronisée</span></div>`);
  const fiche = panneau('Planches', `<div class="planche-tete-f"><b>3 palettes</b><div class="segment petit"><span class="on">Thème Light</span><span>Thème Dark</span></div><span class="lien">Actualiser</span></div>
    <div class="carte-f"><div class="carte-titre">Bleu illustration</div>${nuancier(BLEU, 'light', { crans: choisis })}<div class="aide">◆ Référence : Vivid · nuance 600</div><div class="fiche-ligne"><span>Palette libre · 6 nuances</span><span class="etat-ok">À jour</span></div><div class="gestes-f"><span>Afficher dans Figma</span><span>Modifier la palette</span><span>Générer sur Figma</span></div></div>`);
  return `<section class="bloc" id="w3-5">
  <div class="tete"><span class="sur">W3.5 · Palette libre</span><h2>Sortir du modèle du design system, pour un autre usage</h2></div>
  <p>Le choix du modèle prend la place de la palette de base, qui n’a de sens que dans le modèle : une palette libre n’a ni Auto, ni Soft forcé. Les numéros se choisissent parmi les multiples de 50 ; la luminosité d’un numéro suit les courbes communes, interpolées. L’aperçu garde les deux profils, sans accolades, sans pastille <code>on-solid</code> ; la carte des garanties disparaît.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${configuration}<p class="legende">Six nuances choisies : 100, 200, 400, 600, 800, 900. La référence garde ses octets exacts, à la nuance la plus proche de sa luminosité.</p></div>
    <div>${fiche}<p class="legende">Sa fiche dans l’onglet Planches : « Palette libre · 6 nuances » à la place des résultats Soft et Vivid.</p></div>
  </div></div>
  <div class="questions"><h3>Décisions du mainteneur</h3><ol>
    <li><b>La place du choix.</b> Dans la troisième colonne, à la place de la palette de base.</li>
    <li><b>Le choix des numéros.</b> Des puces cliquables, 4 à 13 allumées.</li>
    <li><b>Au-delà de 950.</b> Les puces vont jusqu’à 1050, quel que soit le préréglage commun : 1000 et 1050 prennent la luminosité du préréglage de treize nuances. La palette neutre de la bibliothèque, <code>titanium</code>, descend à 0,213 au 1000 et 0,182 au 1100 ; 1050 descend à 0,165.</li>
  </ol></div>
</section>`;
}

/* W6.1 : treize nuances */

function sectionTreize() {
  const ligneDeRampe = (palette, mode, ajouts) => `<div class="rampe-13">${palette.rampe('vivid', mode).map((cran) => `<div class="${ajouts.includes(cran.numero) ? 'ajout' : ''}"><span class="sw13${palette.profil === 'vivid' && palette.reperes[mode] === cran.numero ? ' ref' : ''}" style="background:${cran.hexa};color:${encre(cran.couleur)}"></span><b>${cran.numero}</b><i>${cran.hexa}</i></div>`).join('')}</div>`;
  const blocs = Object.entries(CANDIDATS).map(([cle, candidat]) => {
    const ajouts = candidat.crans.filter((n) => !DEFAUT.crans.includes(n));
    const [bleu, vert] = candidat.palettes;
    const luminosites = ajouts.map((n) => `${n} : ${nombre(candidat.courbes.light[candidat.crans.indexOf(n)])} en Light, ${nombre(candidat.courbes.dark[candidat.crans.indexOf(n)])} en Dark`).join(' ; ');
    const rampes = ['light', 'dark'].map((mode) => `<div class="surface-13" style="background:${FONDS[mode]}"><span class="t13" style="color:${mode === 'light' ? '#1E1E1E' : '#F5F5F5'}">Thème ${NOMS_DE_MODE[mode]}</span>${ligneDeRampe(bleu, mode, ajouts)}${ligneDeRampe(vert, mode, ajouts)}</div>`).join('');
    return `<div class="bloc"><h3>Candidat ${cle} · ${candidat.titre}</h3><p>Luminosités ajoutées : ${luminosites}. Recette ${candidat.valide ? 'valide' : 'refusée'} ; garantie des courbes : ${candidat.garantie === 0 ? 'tenue sur les 360 teintes' : `${candidat.garantie} manques`}.</p>
      <div class="scene">${rampes}</div>
      <ul>${[bleu, vert].map((p) => `<li>${p.nom} : référence en Vivid ${p.reperes.light} en Light, ${p.reperes.dark} en Dark ; ${p.total === 0 ? 'aucune garantie manquée' : `${p.total} garanties manquées`}.</li>`).join('')}</ul></div>`;
  }).join('');
  const b200 = CANDIDATS.B.palettes[0].rampe('vivid', 'light').find((c) => c.numero === 200).hexa;
  const d200 = BLEU.rampe('vivid', 'light').find((c) => c.numero === 200).hexa;
  return `<section class="bloc" id="w6-1">
  <div class="tete"><span class="sur">W6.1 · Préréglage de treize nuances</span><h2>Deux nuances au milieu, ou deux nuances plus foncées</h2></div>
  <p>Rampes Vivid calculées par le moteur, avec la recette par défaut et la luminosité des nuances ajoutées indiquée pour chaque candidat. Les nuances ajoutées sont encadrées ; ◆ marque la référence. Les deux candidats gardent chaque rôle à son numéro.</p>
  ${blocs}
  <div class="faits">
    <div><b>A déplace la référence</b><span>Le vert passe de la nuance 600 à la 550 en Light, et ses deux garanties manquées disparaissent : la 600 redevient une nuance calculée. Le bleu passe à la 550 en Dark.</span></div>
    <div><b>B déplace toutes les nuances d’un cran</b><span>Prolonger la courbe déplace ses bouts, et le préréglage Tailwind de la dérive se calcule sur ces bouts : Bleu 200 passe de ${d200} à ${b200}. Tous les cadres passent « À mettre à jour ».</span></div>
    <div><b>B, en Dark, éclaircit</b><span>En Dark, un numéro plus grand est plus clair : 1000 et 1050 approchent le blanc. Les nuances plus foncées n’existent qu’en Light.</span></div>
    <div><b>B ne corrige pas le vert</b><span>Le vert reste à la 600, avec ses deux garanties manquées à 2,92:1 ; l’ajustement de la référence (W7) les corrige.</span></div>
  </div>
  <div class="questions"><h3>Décision du mainteneur</h3><ol>
    <li><b>Le candidat.</b> B, 1000 et 1050 : un pas de 50 aux extrémités se comprend mieux. Le préréglage Tailwind de la dérive se calcule sur les bouts 50 et 950, pour qu’ajouter 1000 et 1050 ne déplace aucune nuance existante.</li>
  </ol></div>
</section>`;
}

/* La page : documentation autour, panneau Figma sombre à l'échelle 1 dedans. */

const STYLE = `:root {
  --sol: #F3F4F6; --papier: #FFFFFF; --encre: #17191E; --encre-2: #555C69; --filet: #D9DCE2;
  --accent: #A8511B; --accent-fond: #FBEDE3; --ok: #17784A; --ko: #C7321B;
  --sans: "IBM Plex Sans", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --sol: #15171B; --papier: #1D2026; --encre: #ECEEF2; --encre-2: #A3AAB7;
    --filet: #343944; --accent: #F0A06A; --accent-fond: #3A2618; --ok: #5BD08F; --ko: #FF8C78;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --sol: #15171B; --papier: #1D2026; --encre: #ECEEF2; --encre-2: #A3AAB7;
  --filet: #343944; --accent: #F0A06A; --accent-fond: #3A2618; --ok: #5BD08F; --ko: #FF8C78;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--sol); color: var(--encre); font: 15px/1.55 var(--sans); padding: 32px 16px 64px; }
main { max-width: 1060px; margin: 0 auto; display: grid; gap: 64px; }
h1, h2, h3 { text-wrap: balance; margin: 0; line-height: 1.2; }
h1 { font-size: 30px; font-weight: 600; letter-spacing: -0.01em; }
h2 { font-size: 21px; font-weight: 600; }
h3 { font-size: 15px; font-weight: 600; }
p { margin: 0; max-width: 72ch; }
ul, ol { margin: 0; padding-left: 1.3em; max-width: 72ch; }
li + li { margin-top: 6px; }
code { font-family: var(--mono); font-size: 0.88em; }
.intro, .bloc { display: grid; gap: 16px; min-width: 0; }
.tete { display: grid; gap: 8px; }
.sur { font: 500 12px/1 var(--sans); text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); }
.sommaire { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 14px; }
.sommaire a { color: var(--accent); }
.note { border-left: 3px solid var(--filet); padding: 2px 0 2px 14px; color: var(--encre-2); font-size: 14px; }
.legende { font-size: 13px; color: var(--encre-2); margin-top: 8px; max-width: 500px; }
.options, .faits { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.option, .faits > div { background: var(--papier); border: 1px solid var(--filet); border-radius: 10px; padding: 14px 16px; display: grid; gap: 6px; align-content: start; }
.option.reco { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.option h3 { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.option p, .faits span { font-size: 14px; color: var(--encre-2); }
.faits b { font-size: 15px; }
.chip-reco { font: 600 11px/1 var(--sans); color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
.pour::before { content: "+ "; color: var(--ok); font-weight: 600; }
.contre::before { content: "− "; color: var(--ko); font-weight: 600; }
.questions { background: var(--papier); border: 1px solid var(--filet); border-radius: 12px; padding: 16px 20px; display: grid; gap: 10px; }
.reco { color: var(--accent); font-weight: 600; }
.recap { background: var(--papier); border: 1px solid var(--filet); border-radius: 12px; overflow-x: auto; }
.recap table { border-collapse: collapse; width: 100%; font-size: 14px; }
.recap th, .recap td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--filet); }
.recap tr:last-child td { border-bottom: 0; }
.recap th { font-weight: 600; color: var(--encre-2); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.scene { overflow-x: auto; padding: 4px 0 8px; display: grid; gap: 24px; }
.scene-rangee { display: flex; gap: 24px; align-items: flex-start; width: max-content; }

.fp {
  --f-fond: #2C2C2C; --f-bloc: #383838; --f-tertiaire: #4A4A4A; --f-bord: #5E5E5E; --f-champ: #2C2C2C;
  --f-texte: #FFFFFF; --f-texte-2: #B3B3B3; --f-marque: #0D99FF; --f-lien: #7CC4F8; --f-succes: #85E0A3;
  flex: none; background: var(--f-fond); color: var(--f-texte); font: 11px/16px Inter, system-ui, sans-serif;
  border: 1px solid #1B1B1B; border-radius: 8px; box-shadow: 0 10px 28px rgba(0,0,0,.35); overflow: visible;
}
.fp-barre { height: 32px; display: flex; align-items: center; gap: 14px; padding: 0 16px; border-bottom: 1px solid var(--f-bord); font-weight: 500; }
.fp-barre .actif { box-shadow: inset 0 -2px 0 var(--f-texte); padding: 8px 0 7px; }
.fp-barre .inactif, .fp-barre .retour { color: var(--f-texte-2); }
.fp-barre .actif-titre { margin-left: auto; font-weight: 600; }
.fp-barre .engrenage { margin-left: auto; color: var(--f-texte-2); }
.fp-corps { padding: 16px; display: grid; gap: 12px; }
.fp-select { display: flex; gap: 8px; align-items: center; }
.champ { height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: var(--f-champ); min-width: 0; }
.champ.grand { height: 32px; flex: 1; }
.champ .coupe { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.champ .fleche { color: var(--f-texte-2); }
.pastille.rond { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--f-bord); flex: none; }
.btn-f { height: 32px; padding: 0 12px; border: 1px solid var(--f-bord); border-radius: 6px; display: grid; place-items: center; font-weight: 600; white-space: nowrap; }
.bouton-icone { width: 28px; height: 28px; border: 1px solid var(--f-bord); border-radius: 6px; display: grid; place-items: center; flex: none; }
.bouton-icone.grand { width: 32px; height: 32px; }
.fp-h1 { display: flex; justify-content: space-between; align-items: baseline; font-size: 16px; line-height: 24px; font-weight: 600; }
.fp-h1 .aide { font-size: 11px; font-weight: 400; }
.carte-f { position: relative; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; padding: 12px; display: grid; gap: 10px; }
.carte-titre { font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.carte-titre .droite { display: flex; gap: 10px; font-size: 11px; font-weight: 400; }
.libelle, .aide { color: var(--f-texte-2); }
.aide.petit { font-size: 10px; line-height: 13px; }
.lien { color: var(--f-lien); }
.trois { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.trois > div { display: grid; gap: 4px; align-content: start; min-width: 0; }
.champ-ligne { display: flex; gap: 6px; align-items: center; }
.pipette-f { width: 28px; height: 28px; border-radius: 6px; border: 3px solid var(--f-champ); outline: 1px solid var(--f-bord); flex: none; }
.pipette-f.ouverte, .pastille-fond.ouverte { outline: 2px solid var(--f-marque); outline-offset: 1px; }
.segment { display: flex; border: 1px solid var(--f-bord); border-radius: 6px; height: 28px; padding: 2px; gap: 2px; background: var(--f-champ); }
.segment span { flex: 1; display: grid; place-items: center; border-radius: 4px; color: var(--f-texte-2); white-space: nowrap; padding: 0 6px; }
.segment .on { background: var(--f-tertiaire); color: var(--f-texte); font-weight: 600; }
.segment.petit { height: 24px; }
.tete-apercu { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.onglets-theme { display: flex; gap: 4px; }
.onglets-theme span { height: 24px; padding: 0 8px; border-radius: 4px; display: grid; place-items: center; color: var(--f-texte-2); font-weight: 600; }
.onglets-theme .on { background: var(--f-tertiaire); color: var(--f-texte); }
.fond-f { display: flex; gap: 6px; align-items: center; }
.pastille-fond { display: flex; gap: 6px; align-items: center; padding: 2px 4px; border-radius: 6px; }
.pastille-fond i { width: 16px; height: 16px; border-radius: 4px; border: 1px solid var(--f-bord); }
.ancre-picker { position: absolute; top: 44px; right: 12px; z-index: 2; }
.ancre-picker.gauche { top: 86px; right: auto; left: 176px; }
.picker { width: 232px; background: #2C2C2C; border: 1px solid #444; border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.55); padding: 10px; display: grid; gap: 10px; }
.sv { position: relative; height: 150px; border-radius: 6px; }
.sv i, .hue i { position: absolute; width: 12px; height: 12px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,.4); transform: translate(-50%, -50%); }
.hue { position: relative; height: 10px; border-radius: 5px; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
.hue i { top: 50%; }
.picker-ligne { display: flex; gap: 6px; }
.format { height: 24px; padding: 0 8px; border-radius: 4px; display: grid; place-items: center; color: var(--f-texte-2); border: 1px solid transparent; }
.code { flex: 1; height: 24px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--f-bord); display: flex; align-items: center; font-variant-numeric: tabular-nums; white-space: pre; }
.code.focus { border-color: var(--f-marque); box-shadow: 0 0 0 1px var(--f-marque); }
.mention { color: var(--f-texte-2); }
.picker-sep { height: 1px; background: #444; margin: 0 -10px; }
.picker-titre { color: var(--f-texte-2); }
.picker-pastilles { display: flex; flex-wrap: wrap; gap: 3px; }
.picker-pastilles i { width: 16px; height: 16px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.15); }
.picker-pastilles i.choisie { box-shadow: 0 0 0 2px #2C2C2C, 0 0 0 3.5px #fff; }
.mini-picker { display: grid; gap: 6px; font: 11px/16px Inter, sans-serif; --f-texte: #FFFFFF; --f-texte-2: #B3B3B3; --f-bord: #5E5E5E; --f-marque: #0D99FF; }
.mini-picker .picker { color: var(--f-texte); }
.mini-picker .picker-sep, .mini-picker .picker-titre, .mini-picker .picker-pastilles { display: none; }
.surface { border-radius: 6px; padding: 10px 10px 8px; color: var(--encre); }
.grille { display: grid; grid-template-columns: 34px 30px repeat(var(--col), 1fr); column-gap: 3px; row-gap: 3px; align-items: center; }
.grille.libre { grid-template-columns: 34px repeat(var(--col), 1fr); }
.grille .num { text-align: center; font-size: 9.5px; line-height: 12px; opacity: .7; font-variant-numeric: tabular-nums; }
.grille .prof { font-size: 10px; font-weight: 600; }
.sw { height: 26px; border-radius: 4px; position: relative; }
.sw.onsolid { grid-row: span 2; height: 55px; border: 1px dashed #8C8C8C; }
.sw.ref::after { content: "◆"; position: absolute; inset: 0; display: grid; place-items: center; font-size: 10px; }
.acc-note { margin-top: 6px; font-size: 9.5px; opacity: .6; }
.ref-ligne { font-weight: 600; }
.reglages-tete { display: flex; justify-content: space-between; }
.trace { display: block; width: 100%; height: auto; background: #121212; border-radius: 6px; }
.table-lum { display: grid; grid-template-columns: 36px repeat(11, 1fr); gap: 3px; align-items: center; }
.num-f { text-align: center; font-size: 10px; color: var(--f-texte-2); font-variant-numeric: tabular-nums; }
.num-f.g { text-align: left; }
.mini-champ-f { height: 24px; border: 1px solid var(--f-bord); border-radius: 4px; background: var(--f-champ); display: grid; place-items: center; font-size: 11px; font-variant-numeric: tabular-nums; }
.mini-champ-f.large { width: 56px; }
.cote-a-cote { display: grid; grid-template-columns: 1fr 170px; gap: 12px; align-items: start; }
.liste-lum { display: grid; grid-template-columns: 40px 1fr 1fr; gap: 3px 6px; align-items: center; }
.libelle.c { text-align: center; }
.seuil-ligne { display: grid; grid-template-columns: 1fr 56px 44px; gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--f-bord); }
.seuil-ligne > div { display: grid; gap: 1px; }
.unite { color: var(--f-texte-2); }
.seuil-grille { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 10px; }
.seuil-grille > div { display: grid; gap: 4px; }
.aides { margin: 0; padding-left: 14px; color: var(--f-texte-2); font-size: 10.5px; line-height: 14px; }
.aides li + li { margin-top: 2px; }
.accordeon { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; }
.accordeon b { font-size: 12px; }
.accordeon .resume { margin-left: auto; color: var(--f-texte-2); }
.chevron { color: var(--f-texte-2); width: 10px; }
.nuances-libres { display: grid; gap: 6px; }
.puces { display: flex; flex-wrap: wrap; gap: 4px; }
.puce { height: 22px; min-width: 36px; padding: 0 6px; border-radius: 11px; border: 1px solid var(--f-bord); display: grid; place-items: center; color: var(--f-texte-2); font-variant-numeric: tabular-nums; }
.puce.on { background: var(--f-tertiaire); border-color: var(--f-texte-2); color: var(--f-texte); font-weight: 600; }
.planche-tete-f { display: flex; align-items: center; gap: 10px; }
.planche-tete-f b { margin-right: auto; }
.fiche-ligne { display: flex; justify-content: space-between; }
.etat-ok { color: var(--f-succes); }
.gestes-f { display: flex; gap: 12px; color: var(--f-lien); }
.planche-scene { display: grid; gap: 4px; }
.planche-cadre { width: max-content; border: 1px solid var(--filet); border-radius: 6px; background: repeating-conic-gradient(#E5E5E5 0% 25%, #F0F0F0 0% 50%) 50% / 16px 16px; padding: 24px; }
.planche-cadre .c { box-sizing: border-box; }
.planche-cadre .t { display: block; font-family: Inter, system-ui, sans-serif; }
.surface-13 { border-radius: 8px; padding: 12px; display: grid; gap: 8px; width: max-content; }
.t13 { font-size: 12px; font-weight: 600; }
.rampe-13 { display: flex; gap: 4px; }
.rampe-13 > div { display: grid; gap: 2px; width: 62px; padding: 3px; border-radius: 6px; border: 1px solid transparent; font-size: 10px; line-height: 12px; }
.rampe-13 > div.ajout { border-color: #D98A4A; }
.rampe-13 b { font-weight: 600; }
.rampe-13 i { font-style: normal; font-family: var(--mono); font-size: 9.5px; opacity: .75; }
.surface-13[style*="#121212"] .rampe-13 { color: #F5F5F5; }
.surface-13:not([style*="#121212"]) .rampe-13 { color: #1E1E1E; }
.sw13 { height: 30px; border-radius: 4px; display: grid; place-items: center; font-size: 10px; }
.sw13.ref::after { content: "◆"; }
`;

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquettes du troisième tour</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
${STYLE}</style>
</head>
<body>
<main>
<section class="intro">
  <span class="sur">UCM Palettes · plan d’ergonomie, troisième tour · lot W3</span>
  <h1>Maquettes à valider</h1>
  <p>Chaque maquette montre le panneau à 500 px, dans le thème sombre de Figma, avec les couleurs et les ratios que le moteur calcule pour #1E6FD9 et #16A34A. Chacune finit par ses questions et une recommandation. Une réponse par question suffit ; « recommandé » vaut accord si la question reste sans réponse.</p>
  <p class="note">Page écrite par <code>generer-maquettes-v3.mjs</code>. Pour la régénérer : <code>node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v3.mjs"</code>.</p>
  <nav class="sommaire"><a href="#w3-1">W3.1 Sélecteur de couleur</a><a href="#w3-2">W3.2 Luminosité des nuances</a><a href="#w3-3">W3.3 Minimums et détection</a><a href="#w3-4">W3.4 Planche générée</a><a href="#w3-5">W3.5 Palette libre</a><a href="#w6-1">W6.1 Treize nuances</a></nav>
</section>
${sectionSelecteur()}
${sectionLuminosite()}
${sectionSeuils()}
${sectionPlanche()}
${sectionPaletteLibre()}
${sectionTreize()}
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(ICI, 'MAQUETTES-RECETTE-V3.html'), page);
process.stdout.write(`MAQUETTES-RECETTE-V3.html : ${page.length} caractères\n`);
