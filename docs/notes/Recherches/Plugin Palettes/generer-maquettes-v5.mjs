#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-V5.html, les maquettes du lot Y2 du cinquième plan,
 * avec les couleurs, les ratios et les nombres de calques que le moteur et le
 * modèle de planche calculent pour #1E6FD9, #16A34A, #DC2626 et #A0B599.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v5.mjs"
 *
 * Une palette à une intensité se calcule comme le profil porteur forcé
 * d'aujourd'hui ([ENT-11]) : la palette reçoit `base`, et seule la rampe de
 * ce profil se montre. Les cadres de Y2.4 sont le modèle de planche du plugin,
 * rendu en HTML ; les dispositions proposées transforment son arbre, et leurs
 * calques se comptent par `compterCalques`. Les règles des fonds sombres (Y2.5)
 * refabriquent les crans 50 à 300 du thème Dark par `fabriquerCran`.
 *
 * La feuille de style reprend celles des tours 3 et 4, lues dans leurs
 * générateurs, et y ajoute les règles propres à ce tour.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PAIRES,
  TABLE_DES_EMPLOIS,
  boutsDe,
  contraste,
  distanceOk,
  ecrireArrondi,
  ecrireContraste,
  fabriquerCran,
  lireHexa,
  partsDe,
  plafond,
  rampesDe,
  recetteParDefaut,
  referenceDe,
  rgb8VersOklch,
  teinteA,
} from '../../../../packages/couleur/src/index.ts';
import { analyserPalette } from '../../../../packages/plugin-palettes/src/analyse.ts';
import { ajouter, nouvellePalette, renommer } from '../../../../packages/plugin-palettes/src/edition.ts';
import { STYLES_DE_TEXTE, TRAME, compterCalques, modeleDeCadre } from '../../../../packages/plugin-palettes/src/planche/modele.ts';
import { couleursDeLInterface } from '../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts';
import { TEXTES_DE_LA_PLANCHE, TEXTES_DU_DETAIL, contrasteEcrit, jugementDuSeuil, niveauEcrit } from '../../../../packages/plugin-palettes/src/ui/textes.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));

/* Le moteur */

const REFERENCES = [['Bleu', '#1E6FD9'], ['Vert', '#16A34A'], ['Rouge', '#DC2626'], ['Sauge', '#A0B599']];
const RECETTE = REFERENCES.reduce(
  (recette, [nom, hexa], rang) => ajouter(recette, renommer(nouvellePalette(recette, `p-0000000${rang + 1}`, hexa), nom)),
  recetteParDefaut(),
);
const FONDS = RECETTE.fonds;
const CRANS = RECETTE.crans;
const NOMS_DE_MODE = { light: 'Light', dark: 'Dark' };
const NOMS_DE_PROFIL = { soft: 'Soft', vivid: 'Vivid' };
const AUTRE = { soft: 'vivid', vivid: 'soft' };

/**
 * Une palette lue deux fois : telle qu'aujourd'hui, à deux intensités, et à
 * une intensité, calculée comme son profil porteur forcé.
 */
function lire(nom) {
  const palette = RECETTE.palettes.find((p) => p.nom === nom);
  const deux = analyserPalette(RECETTE, palette);
  const porteur = deux.ancrage.profil;
  const seule = { ...palette, base: porteur };
  const une = analyserPalette(RECETTE, seule);
  return { nom, palette, seule, deux, une, porteur, partUne: une.parts[porteur] };
}
const P = Object.fromEntries(REFERENCES.map(([nom]) => [nom, lire(nom)]));

/* Écriture */

const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rgb = (hexa) => lireHexa(hexa);
const encreSur = (hexa) => (contraste(rgb(hexa), [30, 30, 30]) >= contraste(rgb(hexa), [245, 245, 245]) ? '#1E1E1E' : '#F5F5F5');
const virgule = (x, n = 2) => ecrireArrondi(x, n);
const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cran = (numero) => CRANS.indexOf(numero);

function panneau(onglet, contenu, { largeur = 650 } = {}) {
  const barre = onglet === 'Réglages'
    ? '<span class="fp-titre">Réglages communs</span><span class="b4 droite-b">Retour aux palettes et à la planche</span>'
    : `<span class="fp-titre">UCM Palettes</span><span class="bouton-icone">⚙</span>`;
  const onglets = onglet === 'Réglages' ? '' : `<div class="fp-onglets"><span class="${onglet === 'Palettes' ? 'on' : ''}">Palettes</span><span class="${onglet === 'Planches' ? 'on' : ''}">Planches</span></div>`;
  return `<div class="fp" style="width:${largeur}px"><div class="fp-haut">${barre}</div>${onglets}<div class="fp-corps">${contenu}</div></div>`;
}

const bouton = (texte, genre = 'second', { inactif = false, compact = false } = {}) => `<span class="b4 ${genre}${compact ? ' compact' : ''}${inactif ? ' inactif' : ''}">${esc(texte)}</span>`;
const segment = (options, actif, { petit = false } = {}) => `<div class="segment${petit ? ' petit' : ''}">${options.map((o) => `<span class="${o === actif ? 'on' : ''}">${esc(o)}</span>`).join('')}</div>`;
const onglets = (options, actif) => `<div class="onglets-y">${options.map((o) => `<span class="${o === actif ? 'on' : ''}">${esc(o)}</span>`).join('')}</div>`;
const interrupteur = (allume, { inactif = false } = {}) => `<span class="inter${allume ? ' on' : ''}${inactif ? ' inactif' : ''}"><b></b></span>`;
const accordeon = (titre, resume, { ouvert = false } = {}) => `<div class="accordeon"><span class="chevron">${ouvert ? '⌄' : '›'}</span><b>${esc(titre)}</b><span class="resume">${esc(resume)}</span></div>`;

/** La barre du sélecteur, le filet à 15 px (Y1.1), puis « Palette [nom] » seul (Y1.2). */
function teteDePalette(lu, creation = '') {
  return `<div class="zone-y"><div class="fp-select"><div class="champ grand"><span class="pastille rond" style="background:${lu.palette.reference}"></span><b class="coupe">${esc(lu.nom)}</b><span class="fleche">▾</span></div>${bouton('Nouvelle palette', 'principal')}<div class="bouton-icone grand">⋯</div></div>${creation}</div>
    <div class="titre-y">Palette ${esc(lu.nom)}</div>`;
}

/* Le nuancier de l'aperçu */

/**
 * Les rangées d'une palette : une rangée sans nom pour une intensité, Soft et
 * Vivid pour deux, avec ◆ sur la référence exacte et ≈ où les profils se
 * confondent.
 */
function rangees(lu, intensites, mode) {
  if (intensites === 1) {
    const a = lu.une;
    return [{ nom: '', crans: a.rampes[lu.porteur][mode].map((c, rang) => ({ hexa: c.hexa, ref: a.ancrage.rangs[mode] === rang })) }];
  }
  const a = lu.deux;
  return ['soft', 'vivid'].map((profil) => ({
    nom: NOMS_DE_PROFIL[profil],
    crans: a.rampes[profil][mode].map((c, rang) => ({
      hexa: c.hexa,
      ref: a.ancrage.profil === profil && a.ancrage.rangs[mode] === rang,
      confondu: a.confusions.some((x) => x.mode === mode && x.cran === CRANS[rang]),
    })),
  }));
}

function nuancier(lu, intensites, mode, { onSolid = true, numeros = true } = {}) {
  const lignes = rangees(lu, intensites, mode);
  const avecNom = lignes.some((l) => l.nom);
  const colonnes = `${avecNom ? '36px ' : ''}${onSolid ? '28px ' : ''}repeat(${CRANS.length}, 1fr)`;
  const tete = numeros ? `${avecNom ? '<span></span>' : ''}${onSolid ? '<span></span>' : ''}${CRANS.map((n) => `<span class="nu-num">${n}</span>`).join('')}` : '';
  const corps = lignes.map((ligne, i) => `${avecNom ? `<span class="nu-prof">${ligne.nom}</span>` : ''}${onSolid && i === 0 ? `<span class="nu-onsolid" style="grid-row:span ${lignes.length}"></span>` : ''}${ligne.crans.map((c) => `<span class="nu-sw" style="background:${c.hexa};color:${encreSur(c.hexa)}">${c.ref ? '◆' : c.confondu ? '≈' : ''}</span>`).join('')}`).join('');
  return `<div class="nu" style="background:${FONDS[mode]};color:${encreSur(FONDS[mode])}"><div class="nu-grille" style="grid-template-columns:${colonnes}">${tete}${corps}</div></div>`;
}

function carteDApercu(lu, intensites, mode) {
  const a = intensites === 1 ? lu.une : lu.deux;
  const reference = intensites === 1 ? `◆ Référence : nuance ${a.ancrage.crans[mode]}` : `◆ Référence : ${NOMS_DE_PROFIL[a.ancrage.profil]} · nuance ${a.ancrage.crans[mode]}`;
  const note = intensites === 2 && a.confusions.some((x) => x.mode === mode) ? '<span class="aide petit">≈ : Soft et Vivid presque identiques à cette nuance.</span>' : '';
  return `<div class="carte-f"><div class="tete-apercu">${onglets(['Thème Light', 'Thème Dark'], `Thème ${NOMS_DE_MODE[mode]}`)}<div class="fond-f"><span class="libelle">Fond</span><span class="pastille-fond"><i style="background:${FONDS[mode]}"></i>${FONDS[mode]}</span></div></div>${nuancier(lu, intensites, mode)}<div class="ref-ligne">${reference}</div>${note}</div>`;
}

/* Y2.1 : le choix des intensités */

const TEXTES_Y21 = {
  intensites: 'Intensités',
  une: 'Une',
  deux: 'Deux',
  aideUne: (part) => `Celle de la couleur de référence : ${part}`,
  porteur: 'Référence exacte dans',
  auto: (profil) => `Auto a choisi ${profil}`,
  interrupteur: 'Deux intensités, Soft et Vivid',
  carteUne: { titre: 'Une intensité', texte: 'L’intensité de la couleur de référence. Pour une couleur de marque.' },
  carteDeux: { titre: 'Deux intensités', texte: 'Une douce, Soft, et une vive, Vivid ; chaque composant choisit. Pour les couleurs d’état : succès, erreur.' },
};

const colonneNom = (nom) => `<div><span class="libelle">Nom de la palette</span><div class="champ">${esc(nom)}</div></div>`;
function colonneReference(hexa, { ajuster = false } = {}) {
  return `<div><span class="libelle">Couleur de référence</span><div class="champ-ligne"><span class="pipette-f" style="background:${hexa}"></span><div class="champ">${hexa}</div></div>${ajuster ? '<span class="lien petit souligne">Ajuster la référence</span>' : ''}</div>`;
}

/** Le choix du profil porteur, seulement avec deux intensités (Q5.4). */
function choixDuPorteur(lu, { creation }) {
  return `<span class="libelle">${TEXTES_Y21.porteur}</span>${segment(['Auto', 'Soft', 'Vivid'], 'Auto')}<span class="aide">${creation ? `Auto choisira ${NOMS_DE_PROFIL[lu.deux.ancrage.profil]}` : TEXTES_Y21.auto(NOMS_DE_PROFIL[lu.deux.ancrage.profil])}</span>`;
}

/** La troisième colonne, selon la forme du choix. */
function colonneDuModele(lu, forme, intensites, { creation }) {
  const modele = `<span class="libelle">Modèle</span>${segment(['Standard', 'Libre'], 'Standard')}`;
  if (forme === 'F1') {
    const suite = intensites === 1
      ? `<span class="aide">${TEXTES_Y21.aideUne(virgule(lu.partUne))}</span>`
      : choixDuPorteur(lu, { creation });
    return `<div>${modele}<span class="libelle">${TEXTES_Y21.intensites}</span>${segment([TEXTES_Y21.une, TEXTES_Y21.deux], intensites === 1 ? TEXTES_Y21.une : TEXTES_Y21.deux)}${suite}</div>`;
  }
  if (forme === 'F2') {
    const suite = intensites === 2 ? choixDuPorteur(lu, { creation }) : `<span class="aide">${TEXTES_Y21.aideUne(virgule(lu.partUne))}</span>`;
    return `<div>${modele}<span class="ligne-inter">${interrupteur(intensites === 2)}<span>${TEXTES_Y21.interrupteur}</span></span>${suite}</div>`;
  }
  return `<div>${modele}</div>`;
}

/** Les deux cartes de F3, chacune avec sa rampe d'aperçu dans le thème Light. */
function cartesDIntensite(lu, intensites, { creation }) {
  const carte = (n, textes) => `<div class="choix-carte${intensites === n ? ' on' : ''}"><div class="choix-tete"><span class="radio${intensites === n ? ' on' : ''}"></span><b>${textes.titre}</b></div><span class="aide">${textes.texte}</span>${nuancier(lu, n, 'light', { onSolid: false, numeros: false })}${intensites === 2 && n === 2 ? `<div class="choix-porteur">${choixDuPorteur(lu, { creation })}</div>` : ''}${intensites === 1 && n === 1 ? `<span class="aide">${TEXTES_Y21.aideUne(virgule(lu.partUne))}</span>` : ''}</div>`;
  return `<div class="choix-cartes">${carte(1, TEXTES_Y21.carteUne)}${carte(2, TEXTES_Y21.carteDeux)}</div>`;
}

function carteDeCreation(lu, forme, intensites) {
  const gestes = `<div class="gestes-4 a-droite">${bouton('Annuler')}${bouton('Créer la palette', 'principal')}</div>`;
  return `<div class="carte-f"><div class="carte-titre">Nouvelle palette</div><div class="trois">${colonneNom(lu.nom)}${colonneReference(lu.palette.reference)}${colonneDuModele(lu, forme, intensites, { creation: true })}</div>${forme === 'F3' ? cartesDIntensite(lu, intensites, { creation: true }) : ''}${gestes}</div>`;
}

function carteDeConfiguration(lu, intensites, forme = 'F1') {
  return `<div class="carte-f"><div class="carte-titre">Configuration de la palette</div><div class="trois">${colonneNom(lu.nom)}${colonneReference(lu.palette.reference, { ajuster: true })}${colonneDuModele(lu, forme, intensites, { creation: false })}</div>${forme === 'F3' ? cartesDIntensite(lu, intensites, { creation: false }) : ''}</div>`;
}

/** Le curseur d'une intensité, tel que la carte Intensités le dessine. */
function curseur(libelle, valeur, repere = null) {
  return `<div class="curseur-ligne"><b>${esc(libelle)}</b><span class="piste"><i style="width:${valeur * 100}%"></i><b style="left:${valeur * 100}%"></b>${repere === null ? '' : `<u style="left:${repere * 100}%" title="Intensité de la couleur de référence"></u>`}</span><span class="mini-champ-f large">${virgule(valeur)}</span></div>`;
}

function carteDesIntensites(lu) {
  const { parts, part } = lu.deux;
  return `<div class="carte-f corps-ouvert">${curseur('Intensité Soft', parts.soft, part)}${curseur('Intensité Vivid', parts.vivid, part)}<span class="aide">Le triangle marque l’intensité de la couleur de référence, ${virgule(part)}. Les intensités de cette palette suivent les réglages communs.</span></div>`;
}

/** Les garanties d'un profil dans un thème, à l'état default, en lignes courtes. */
function lignesDeGaranties(analyse, profil, mode) {
  const nom = (m) => ('fond' in m ? 'fond' : m.emploi);
  return analyse.promesses
    .filter((p) => p.profil === profil && p.mode === mode && [p.paire.premier, p.paire.second].every((m) => !('decalage' in m) || m.decalage === 0))
    .slice(0, 6)
    .map((p) => `<div class="g-ligne-y"><span class="spec-y" style="background:${p.second.couleur ? `rgb(${p.second.couleur.join(',')})` : FONDS[mode]};color:rgb(${p.premier.couleur.join(',')})">Aa</span><span><code>${nom(p.paire.premier)}</code> sur <code>${nom(p.paire.second)}</code></span><span class="mono">${contrasteEcrit(p.contraste)}</span><span class="${p.verdict === 'tenue' ? 'ok-t' : 'ko-t'}">${p.verdict === 'tenue' ? '✓' : '✗'}</span></div>`)
    .join('');
}

function carteDesGaranties(lu, intensites, mode) {
  const a = intensites === 1 ? lu.une : lu.deux;
  const profil = intensites === 1 ? lu.porteur : a.ancrage.profil;
  const manquees = (p) => a.promesses.filter((x) => x.profil === p && x.mode === mode && x.verdict === 'manquee').length;
  const resume = intensites === 1 ? (manquees(profil) ? `✗ ${manquees(profil)}` : 'Toutes tenues ✓') : `Soft ${manquees('soft') ? `✗ ${manquees('soft')}` : '✓'} · Vivid ${manquees('vivid') ? `✗ ${manquees('vivid')}` : '✓'}`;
  const bascule = intensites === 2 ? onglets(['Soft', 'Vivid'], NOMS_DE_PROFIL[profil]) : '';
  return `${accordeon('Garanties de contraste', resume, { ouvert: true })}<div class="carte-f corps-ouvert">${bascule}${lignesDeGaranties(a, profil, mode)}<span class="aide petit">… 16 garanties par thème</span></div>`;
}

/** L'écran de l'interface de test, peint de la rampe choisie. */
function ecranDeTest(analyse, mode) {
  const c = couleursDeLInterface(RECETTE, analyse, mode);
  const e = (emploi, etat = 0) => c.emploi(emploi, etat);
  const bord = e('border-decorative');
  return `<div class="rx" style="background:${c.fond};color:${c.encre};border-color:${bord}">
    <aside class="rx-nav" style="border-color:${bord}"><b>Studio Nord</b><span style="background:${e('surface')};color:${e('text')}">Paramètres</span><span>Membres</span><span>Facturation</span></aside>
    <div class="rx-corps">
      <div class="rx-tete"><div><b class="rx-titre">Membres de l’équipe</b><span class="rx-sous" style="color:${c.encreSeconde}">4 membres · 1 invitation</span></div><span class="rx-btn" style="background:${e('solid')};color:${c.fond}">Inviter</span></div>
      <div class="rx-callout" style="background:${e('surface')};color:${e('text')}">ⓘ L’invitation de Camille expire dans 2 jours. <u>Renvoyer</u></div>
      <div class="rx-options"><span><i class="rx-case" style="background:${e('solid')};color:${c.fond}">✓</i>Notifier</span><span><i class="rx-inter" style="background:${e('solid')}"><b style="background:${c.fond}"></b></i>Accès invité</span><span class="rx-badge" style="background:${e('surface')};color:${e('text')}">Invitée</span></div>
    </div></div>`;
}

function carteDeLInterface(lu, intensites, mode) {
  const a = intensites === 1 ? lu.une : lu.deux;
  const resume = intensites === 1 ? `Thème ${NOMS_DE_MODE[mode]}` : `Thème ${NOMS_DE_MODE[mode]} · ${NOMS_DE_PROFIL[a.ancrage.profil]}`;
  const bascules = intensites === 1 ? onglets(['Écran', 'États'], 'Écran') : `<div class="deux-bascules">${onglets(['Écran', 'États'], 'Écran')}${onglets(['Soft', 'Vivid'], NOMS_DE_PROFIL[a.ancrage.profil])}</div>`;
  return `${accordeon('Interface de test', resume, { ouvert: true })}<div class="carte-f corps-ouvert">${bascules}${ecranDeTest(a, mode)}</div>`;
}

function ongletPalettesComplet(lu, intensites, mode) {
  const intensitesUi = intensites === 2 ? `${accordeon('Intensités', `Communes · Soft ${virgule(lu.deux.parts.soft)} · Vivid ${virgule(lu.deux.parts.vivid)}`, { ouvert: true })}${carteDesIntensites(lu)}` : '';
  const derive = accordeon('Dérive de teinte', intensites === 2 ? 'Tailwind · synchronisée' : 'Tailwind');
  return panneau('Palettes', `${teteDePalette(lu)}${carteDeConfiguration(lu, intensites)}${carteDApercu(lu, intensites, mode)}${intensitesUi}${derive}${carteDesGaranties(lu, intensites, mode)}${carteDeLInterface(lu, intensites, mode)}`);
}

function sectionIntensites() {
  const vert = P.Vert;
  const bleu = P.Bleu;
  const vignette = (contenu, legende) => `<div>${panneau('Palettes', contenu)}<p class="legende">${legende}</p></div>`;
  const creation = (forme, n) => `${teteDePalette(bleu, carteDeCreation(vert, forme, n))}`;
  const lectureSeule = `<div class="carte-f"><div class="carte-titre">Intensités</div><div class="curseur-ligne"><b>Intensité</b><span class="piste fixe"><i style="width:${bleu.partUne * 100}%"></i></span><span class="mini-champ-f large inactif">${virgule(bleu.partUne)}</span></div><span class="aide">Celle de la couleur de référence : la changer changerait la référence. Passez à deux intensités pour en régler une autre.</span></div>`;
  return `<section class="bloc" id="y2-1">
  <div class="tete"><span class="sur">Y2.1 · Choix des intensités</span><h2>Une ou deux intensités, dès la création</h2></div>
  <p>« Palette de base » disparaît. À sa place, le choix du nombre d’intensités ; avec deux, le choix du profil qui porte la référence exacte (Q5.4). Une palette à une intensité prend celle de sa couleur de référence, qui reste exacte dans sa rampe ; ses tokens n’ont pas de segment de profil : <code>theme.primary.700</code>. Les trois formes ci-dessous tiennent dans la carte de création ; la carte de configuration reprend la même, au même endroit (Y2.1, décision « Configuration de la palette »). Vert, #16A34A, en création ; Auto choisirait ${NOMS_DE_PROFIL[vert.deux.ancrage.profil]}, et son intensité vaut ${virgule(vert.partUne)}.</p>
  <h3>Création</h3>
  <div class="scene"><div class="scene-rangee">
    ${vignette(creation('F1', 1), '<b>F1 · Segments, une intensité.</b> Sous Modèle, « Intensités : Une · Deux ». Avec une, l’aide dit l’intensité retenue.')}
    ${vignette(creation('F1', 2), '<b>F1 · Segments, deux intensités.</b> Le choix du profil porteur paraît dessous, avec ce qu’Auto choisira.')}
  </div><div class="scene-rangee">
    ${vignette(creation('F2', 1), '<b>F2 · Interrupteur, éteint.</b> Une intensité par défaut ; l’interrupteur ajoute Soft et Vivid.')}
    ${vignette(creation('F2', 2), '<b>F2 · Interrupteur, allumé.</b> Même suite que F1.')}
  </div><div class="scene-rangee">
    ${vignette(creation('F3', 1), '<b>F3 · Deux cartes, une intensité.</b> Chaque carte montre la rampe qu’elle produira pour la couleur saisie, en Thème Light, et dit à quoi elle sert.')}
    ${vignette(creation('F3', 2), '<b>F3 · Deux cartes, deux intensités.</b> Le choix du profil porteur paraît dans la carte choisie.')}
  </div></div>
  <h3>Ce que l’onglet montre ensuite</h3>
  <p>Bleu, #1E6FD9, avec la forme F1 dans la configuration. À gauche une intensité (${virgule(bleu.partUne)}, celle de la référence), à droite deux, comme aujourd’hui. La ligne du titre ne porte plus que « Palette Bleu » (Y1.2), et le filet a 15 px de chaque côté (Y1.1). Les cartes Intensités, Garanties et Interface de test sont ouvertes pour la comparaison ; elles restent repliées à l’ouverture.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${ongletPalettesComplet(bleu, 1, 'light')}<p class="legende"><b>Une intensité.</b> Aperçu sur une rangée sans nom de profil, ni ≈. Pas de carte Intensités (I1). Dérive : un seul tracé, sans lien de synchronisation. Garanties : une série, sans bascule. Interface de test : peinte de la seule rampe.</p></div>
    <div>${ongletPalettesComplet(bleu, 2, 'light')}<p class="legende"><b>Deux intensités.</b> Aperçu Soft et Vivid, ≈ où ils se confondent. Intensités : deux curseurs et le repère de la référence. Garanties : bascule Soft et Vivid. Interface de test : une bascule Soft et Vivid s’ajoute, sur le profil porteur à l’ouverture.</p></div>
  </div><div class="scene-rangee">
    <div>${panneau('Palettes', lectureSeule)}<p class="legende"><b>I2 · Une intensité, carte gardée en lecture seule.</b> Le curseur ne se manipule pas : il montre la valeur et dit pourquoi.</p></div>
    <div>${panneau('Palettes', carteDeConfiguration(bleu, 1, 'F3'))}<p class="legende"><b>F3 dans la configuration.</b> Les deux cartes s’ajoutent sous les colonnes et poussent l’aperçu d’environ 110 px.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La forme du choix.</b> <span class="reco">Recommandé : F1</span>, qui tient dans la troisième colonne à côté du Modèle, se lit comme lui, et reste identique dans la configuration. F3 explique mieux la différence à la première création, mais pousse le contenu de la configuration à chaque ouverture. F2 cache le mot « intensité » derrière un interrupteur, et « éteint » ne dit pas ce qu’on obtient.</li>
    <li><b>Les libellés.</b> a : « Intensités : Une · Deux », aide « Celle de la couleur de référence : ${virgule(vert.partUne)} ». b : « Rampes : Une · Soft et Vivid ». c : « Nuancier : Simple · Double ». <span class="reco">Recommandé : a</span>, le mot déjà employé par la carte Intensités et les Réglages communs.</li>
    <li><b>Le choix du profil porteur (Q5.4).</b> « Référence exacte dans : Auto · Soft · Vivid », seulement avec deux intensités, avec « Auto a choisi Vivid » dessous. <span class="reco">Recommandé.</span> Autre libellé : « Couleur de référence dans ».</li>
    <li><b>La valeur par défaut à la création.</b> <span class="reco">Recommandé : Une</span>, le cas des couleurs de marque, et le plus simple à lire ; les recettes existantes se lisent avec deux intensités.</li>
    <li><b>La carte Intensités d’une palette à une intensité.</b> I1 : elle se retire, l’aide de la configuration dit la valeur. I2 : elle reste, en lecture seule. <span class="reco">Recommandé : I1</span> ; un curseur qu’on ne peut pas bouger est un faux réglage.</li>
    <li><b>L’interface de test à deux intensités.</b> Une bascule Soft et Vivid, ouverte sur le profil porteur. <span class="reco">Recommandé.</span> Sans elle, la rampe douce ne s’essaie nulle part.</li>
    <li><b>Passer de deux à une.</b> La seconde rampe et ses réglages propres (dérive, intensités propres) se perdent, et le cadre passe « À mettre à jour ». <span class="reco">Recommandé : sans confirmation</span>, avec cette phrase dans l’aide sous le choix tant que la palette a des réglages propres.</li>
    <li><b>Palette libre.</b> Le choix se cache, comme la palette de base aujourd’hui ; une palette libre garde ses deux rampes. <span class="reco">Recommandé pour ce plan</span> ; l’ouvrir aux palettes libres se décidera à la revue Y3.1.</li>
  </ol></div>
</section>`;
}

/* Y2.2 : la fiche d'une palette dans l'onglet Planches */

const ETATS_ECRITS = {
  'jamais-dessinee': 'Pas encore sur Figma',
  perimee: 'À mettre à jour',
  'a-jour': 'À jour',
  introuvable: 'Cadre introuvable',
  illisible: 'Lecture impossible',
};
const TON_DE_L_ETAT = { 'jamais-dessinee': 'neutre', perimee: 'attention', 'a-jour': 'ok', introuvable: 'ko', illisible: 'ko' };

/** Le premier geste d'un état, et les deux autres ; `ajour` choisit entre aucun geste et un geste inactif. */
function gestesDeLaFiche(etat, { ajour = 'aucun' } = {}) {
  const premier = {
    'jamais-dessinee': bouton('Générer sur Figma', 'principal', { compact: true }),
    perimee: bouton('Actualiser sur Figma', 'principal', { compact: true }),
    introuvable: bouton('Générer sur Figma', 'principal', { compact: true }),
    'a-jour': ajour === 'inactif' ? bouton('À jour sur Figma', 'principal', { compact: true, inactif: true }) : '',
    illisible: '',
  }[etat];
  const afficher = etat === 'jamais-dessinee' || etat === 'introuvable' ? '' : bouton('Afficher', 'second', { compact: true });
  return `${premier}${afficher}${bouton('Modifier', 'second', { compact: true })}`;
}

function garantiesCourtes(lu, intensites, mode) {
  const a = intensites === 1 ? lu.une : lu.deux;
  const profils = intensites === 1 ? [lu.porteur] : ['soft', 'vivid'];
  return profils.map((p) => {
    const n = a.promesses.filter((x) => x.profil === p && x.mode === mode && x.verdict === 'manquee').length;
    const nom = intensites === 1 ? 'Garanties' : NOMS_DE_PROFIL[p];
    return `<span class="${n ? 'ko-t' : ''}">${nom} ${n ? `✗ ${n}` : '✓'}</span>`;
  }).join(' ');
}

function referenceCourte(lu, intensites, mode) {
  const a = intensites === 1 ? lu.une : lu.deux;
  return `<span class="ref-mini"><i style="background:${lu.palette.reference}"></i>${lu.palette.reference}</span><span class="sec">◆ ${intensites === 2 ? `${NOMS_DE_PROFIL[a.ancrage.profil]} · ` : ''}nuance ${a.ancrage.crans[mode]}</span>`;
}

const puce = (etat) => `<span class="etat-puce ${TON_DE_L_ETAT[etat]}">${ETATS_ECRITS[etat]}</span>`;

function mini(lu, intensites, mode, { fin = false } = {}) {
  const lignes = rangees(lu, intensites, mode);
  const avecNom = lignes.length > 1 && !fin;
  return `<div class="mini-apercu${fin ? ' fin' : ''}" style="background:${FONDS[mode]};color:${encreSur(FONDS[mode])}">${lignes.map((l) => `<div class="mini-rangee">${avecNom ? `<span class="mini-nom">${l.nom}</span>` : ''}${l.crans.map((c) => `<span style="background:${c.hexa};color:${encreSur(c.hexa)}">${c.ref && !fin ? '◆' : ''}</span>`).join('')}</div>`).join('')}</div>`;
}

/** A0 : la fiche d'aujourd'hui, gestes dans l'ordre de Y1.9. */
function ficheA0(lu, intensites, etat, mode = 'light') {
  const a = intensites === 1 ? lu.une : lu.deux;
  return `<div class="carte-f fiche"><div class="carte-titre">${esc(lu.nom)}</div>${mini(lu, intensites, mode)}<span class="sec">◆ Référence : ${intensites === 2 ? `${NOMS_DE_PROFIL[a.ancrage.profil]} · ` : ''}nuance ${a.ancrage.crans[mode]}</span><span>${garantiesCourtes(lu, intensites, mode)}</span>${etat === 'jamais-dessinee' ? '' : `<span class="sec${TON_DE_L_ETAT[etat] === 'ko' ? ' ko-t' : ''}">${ETATS_ECRITS[etat]}</span>`}<div class="gestes-4">${gestesDeLaFiche(etat)}</div></div>`;
}

/** A : en-tête nom et état, aperçu, ligne d'information, gestes. */
function ficheA(lu, intensites, etat, { ajour = 'aucun', mode = 'light' } = {}) {
  return `<div class="carte-f fiche"><div class="fiche-tete"><b class="fiche-nom">${esc(lu.nom)}</b>${puce(etat)}</div>${mini(lu, intensites, mode)}<div class="fiche-info"><span class="fiche-ref">${referenceCourte(lu, intensites, mode)}</span><span>${garantiesCourtes(lu, intensites, mode)}</span></div><div class="gestes-4">${gestesDeLaFiche(etat, { ajour })}</div></div>`;
}

/** B : une ligne par palette. */
function ficheB(lu, intensites, etat, { ajour = 'aucun', mode = 'light' } = {}) {
  return `<div class="fiche-b"><div class="fiche-b-nom"><span class="pastille rond" style="background:${lu.palette.reference}"></span><div><b>${esc(lu.nom)}</b><span class="fiche-b-sous">${puce(etat)}<span class="fiche-b-gar">${garantiesCourtes(lu, intensites, mode)}</span></span></div></div>${mini(lu, intensites, mode, { fin: true })}<div class="gestes-4 a-droite">${gestesDeLaFiche(etat, { ajour })}</div></div>`;
}

const LISTE = [['Bleu', 2, 'perimee'], ['Vert', 1, 'jamais-dessinee'], ['Rouge', 2, 'a-jour'], ['Sauge', 1, 'introuvable']];

function barreDesPlanches(nombre) {
  return `<div class="planches-tete"><b>${nombre} palettes</b><span class="planches-droite">${onglets(['Thème Light', 'Thème Dark'], 'Thème Light')}${bouton('Actualiser', 'second', { compact: true })}</span></div>`;
}

function pied(aGenerer, total) {
  const pluriel = (n) => `${n} palette${n > 1 ? 's' : ''}`;
  return `<div class="gestes-globaux">${bouton(`Mettre à jour (${pluriel(aGenerer)})`, 'principal')}${bouton(`Générer tout (${pluriel(total)})`)}</div>
    <div class="carte-f carte-supprimee-y"><b>Ardoise</b><span>Palette supprimée du plugin. Ce cadre ne sera plus mis à jour.</span><div class="gestes-4">${bouton('Afficher dans Figma', 'second', { compact: true })}${bouton('Supprimer définitivement', 'danger', { compact: true })}</div></div>
    ${accordeon('Palettes et réglages', '')}`;
}

function listeDesPlanches(disposition) {
  const aGenerer = LISTE.filter(([, , etat]) => etat !== 'a-jour').length;
  const fiches = LISTE.map(([nom, n, etat]) => (disposition === 'A0' ? ficheA0 : disposition === 'A' ? ficheA : ficheB)(P[nom], n, etat)).join('');
  if (disposition === 'C') {
    const groupe = (titre, lignes) => `<div class="groupe-fiches"><div class="groupe-titre">${titre}</div><div class="liste-b">${lignes.map(([nom, n, etat]) => ficheB(P[nom], n, etat)).join('')}</div></div>`;
    return panneau('Planches', `${barreDesPlanches(LISTE.length)}${groupe(`À générer · ${aGenerer}`, LISTE.filter(([, , e]) => e !== 'a-jour'))}${groupe('À jour · 1', LISTE.filter(([, , e]) => e === 'a-jour'))}${pied(aGenerer, LISTE.length)}`);
  }
  const contenu = disposition === 'B' ? `<div class="liste-b">${fiches}</div>` : fiches;
  return panneau('Planches', `${barreDesPlanches(LISTE.length)}${contenu}${pied(aGenerer, LISTE.length)}`);
}

function sectionFiches() {
  const etats = ['jamais-dessinee', 'perimee', 'a-jour', 'introuvable', 'illisible'];
  const bleu = P.Bleu;
  const variantesA = etats.map((etat) => `<div class="etat-vignette"><span class="sec petit">${ETATS_ECRITS[etat]}</span>${ficheA(bleu, 2, etat)}</div>`).join('');
  const variantesB = etats.map((etat) => `<div class="etat-vignette"><span class="sec petit">${ETATS_ECRITS[etat]}</span>${ficheB(bleu, 2, etat)}</div>`).join('');
  const ajourInactif = `<div class="etat-vignette"><span class="sec petit">À jour, geste inactif</span>${ficheA(bleu, 2, 'a-jour', { ajour: 'inactif' })}</div>`;
  const ajourInactifB = `<div class="etat-vignette"><span class="sec petit">À jour, geste inactif</span>${ficheB(bleu, 2, 'a-jour', { ajour: 'inactif' })}</div>`;
  return `<section class="bloc" id="y2-2">
  <div class="tete"><span class="sur">Y2.2 · Fiche d’une palette</span><h2>L’onglet Planches : quelles palettes générer, en un regard</h2></div>
  <p>La génération n’appartient plus qu’à cet onglet (Y1.2). Les gestes d’une fiche suivent l’ordre dicté : « Générer sur Figma » ou « Actualiser sur Figma » en bouton principal, puis « Afficher », puis « Modifier », tous à 24 px (Y1.6, Y1.9). Les gestes globaux, la carte supprimée plus discrète et ses boutons à la même hauteur sont les corrections dictées de Y1. Quatre palettes, dans quatre états : Bleu à mettre à jour, Vert jamais générée, Rouge à jour, Sauge dont le cadre a disparu. Vert et Sauge ont une intensité.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${listeDesPlanches('A0')}<p class="legende"><b>A0 · En place, gestes réordonnés.</b> Nom, aperçu, référence, garanties, état, gestes : six rangs, l’état au cinquième, en gris.</p></div>
    <div>${listeDesPlanches('A')}<p class="legende"><b>A · L’état en tête.</b> Le nom et l’état sur la première ligne, l’état dans une pastille de couleur ; la référence et les garanties sur une ligne ; les gestes dessous.</p></div>
  </div><div class="scene-rangee">
    <div>${listeDesPlanches('B')}<p class="legende"><b>B · Une ligne par palette.</b> Pastille, nom et état ; la rampe en fin bandeau ; les garanties ; les gestes à droite. La référence exacte n’est plus écrite : elle se lit dans l’onglet Palettes.</p></div>
    <div>${listeDesPlanches('C')}<p class="legende"><b>C · B regroupé par état.</b> « À générer » d’abord, « À jour » ensuite. L’ordre des palettes suit l’état, pas l’ordre de la recette.</p></div>
  </div></div>
  <h3>Chaque état du cadre</h3>
  <div class="scene"><div class="scene-rangee"><div class="fp" style="width:650px"><div class="fp-corps etats-fiches">${variantesA}${ajourInactif}</div></div><div class="fp" style="width:650px"><div class="fp-corps etats-fiches">${variantesB}${ajourInactifB}</div></div></div></div>
  <p class="legende">À gauche la disposition A, à droite B, pour Bleu. « Pas encore sur Figma » et « Cadre introuvable » n’ont pas « Afficher » : il n’y a rien à montrer. « Lecture impossible » n’a pas de premier geste : générer remplacerait un cadre que le plugin ne sait pas lire.</p>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : A</span>, qui met l’état, la question de cet onglet, à côté du nom, et garde l’aperçu lisible. B tient quatre palettes dans la hauteur d’une fiche A, mais perd la référence et serre les gestes : à 500 px, « Actualiser sur Figma » passe sous le nom. C répond le mieux à « quoi générer », au prix d’un ordre qui change à chaque génération.</li>
    <li><b>« À jour ».</b> Aucun premier geste, ou « À jour sur Figma » inactif. <span class="reco">Recommandé : aucun</span> ; la pastille dit déjà « À jour », et un bouton inactif ne se lit pas au clavier.</li>
    <li><b>Le libellé d’un cadre jamais généré.</b> Aujourd’hui aucun ; proposé : « Pas encore sur Figma ». <span class="reco">Recommandé</span>, pour que chaque fiche ait une pastille.</li>
    <li><b>« Lecture impossible ».</b> Aucun premier geste, « Afficher » et « Modifier » seuls ; ou « Remplacer sur Figma » en principal. <span class="reco">Recommandé : aucun</span>, le remplacement reste dans le constat détaillé d’aujourd’hui.</li>
    <li><b>Les couleurs des pastilles.</b> Orange pour « À mettre à jour », vert pour « À jour », rouge pour introuvable et illisible, gris pour « Pas encore sur Figma ». <span class="reco">Recommandé.</span></li>
  </ol></div>
</section>`;
}

/* Y2.4 : le cadre de la planche, rendu depuis le modèle du plugin */

const JUSTIFIER = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
const ALIGNER = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end' };

function rendre(noeud) {
  if (noeud.type === 'texte') {
    const style = STYLES_DE_TEXTE[noeud.style];
    const largeur = noeud.largeur === undefined ? 'white-space:nowrap' : `width:${noeud.largeur}px`;
    return `<span class="nt" style="font-size:${style.taille}px;font-weight:${style.style === 'Semi Bold' ? 600 : 400};color:${noeud.couleur.hexa};${largeur}">${esc(noeud.contenu)}</span>`;
  }
  const a = noeud.alignement ?? {};
  const style = [
    `flex-direction:${noeud.direction === 'VERTICAL' ? 'column' : 'row'}`,
    `gap:${noeud.espacement}px`,
    `padding:${noeud.marge}px ${noeud.margeLaterale ?? noeud.marge}px`,
    `justify-content:${JUSTIFIER[a.principal ?? 'MIN']}`,
    `align-items:${ALIGNER[a.secondaire ?? 'MIN']}`,
  ];
  if (noeud.fond) style.push(`background:${noeud.fond.hexa}`);
  if (noeud.rayon) style.push(`border-radius:${noeud.rayon}px`);
  if (noeud.trait) style.push(`box-shadow:inset 0 0 0 ${noeud.trait.epaisseur}px ${noeud.trait.couleur.hexa}`);
  if (noeud.largeur !== undefined) style.push(`width:${noeud.largeur}px`);
  if (noeud.hauteur !== undefined) style.push(`height:${noeud.hauteur}px`);
  if (noeud.remplir) style.push('align-self:stretch');
  return `<div class="nc" style="${style.join(';')}">${noeud.enfants.map(rendre).join('')}</div>`;
}

/** Une copie de l'arbre où `f` rend un nœud, un autre, ou `null` pour le retirer. */
function transformer(noeud, f) {
  const rendu = f(noeud);
  if (rendu === null) return null;
  if (rendu.type === 'texte') return rendu;
  return { ...rendu, enfants: rendu.enfants.map((e) => transformer(e, f)).filter(Boolean) };
}
function trouver(noeud, predicat) {
  if (predicat(noeud)) return noeud;
  if (noeud.type === 'texte') return null;
  for (const enfant of noeud.enfants) {
    const trouve = trouver(enfant, predicat);
    if (trouve) return trouve;
  }
  return null;
}
const espaceVide = (largeur) => ({ type: 'cadre', nom: 'espace', direction: 'HORIZONTAL', espacement: 0, marge: 0, fond: null, rayon: 0, largeur, hauteur: 1, enfants: [] });
const texteNu = (nom, contenu, style, couleur, largeur) => ({ type: 'texte', nom, contenu, style, couleur, ...(largeur ? { largeur } : {}) });
const cadreNu = (nom, direction, enfants, reglages = {}) => ({ type: 'cadre', nom, direction, espacement: TRAME, marge: 0, fond: null, rayon: 0, ...reglages, enfants });

/** Le cadre d'une palette à une intensité : le modèle du profil porteur forcé, sans la seconde rampe ni sa grille. */
function cadreAUneIntensite(lu, grille) {
  const modele = modeleDeCadre(RECETTE, lu.seule, 'SRGB', { grille });
  const autre = AUTRE[lu.porteur];
  const nomDuPorteur = NOMS_DE_PROFIL[lu.porteur];
  return transformer(modele.racine, (n) => {
    if (n.type === 'cadre' && (n.nom === `rampe ${autre}` || /^grille (light|dark) /.test(n.nom) && n.nom.endsWith(autre))) return null;
    if (n.type === 'texte' && n.nom === 'confondu') return null;
    if (n.type === 'texte' && n.nom === 'profil') return espaceVide(n.largeur);
    if (n.type === 'texte' && n.contenu === TEXTES_DE_LA_PLANCHE.rampes) return { ...n, contenu: 'La rampe' };
    if (n.type === 'texte' && n.nom === 'note') return { ...n, contenu: TEXTES_DE_LA_PLANCHE.noteDuRepere };
    if (n.type === 'texte' && n.contenu.includes(` · ${nomDuPorteur}`)) return { ...n, contenu: n.contenu.replace(` · ${nomDuPorteur}`, '') };
    return n;
  });
}

/**
 * La section des usages d'un profil, tirée de celle du porteur : chaque
 * couleur de la rampe porteuse prend la nuance de même rang de l'autre
 * profil, et chaque garantie se récrit avec la promesse de l'autre profil.
 */
function usagesDuProfil(lu, section, mode, profil) {
  const a = lu.deux;
  const porteur = a.ancrage.profil;
  if (profil === porteur) return section;
  const table = new Map(a.rampes[porteur][mode].map((c, rang) => [c.hexa, a.rampes[profil][mode][rang].hexa]));
  const peindre = (p) => (p && table.has(p.hexa) ? { ...p, hexa: table.get(p.hexa) } : p);
  const seconde = trouver(section, (n) => n.type === 'texte' && n.nom === 'rôle').couleur;
  const danger = { hexa: mode === 'light' ? '#B42318' : '#FF9C8A', composantes: [0, 0, 0] };
  return transformer(section, (n) => {
    if (n.type === 'texte') {
      const numero = /^garantie (\d+)$/.exec(n.nom);
      if (numero) {
        const promesse = a.promesses.find((p) => p.paire.numero === Number(numero[1]) && p.mode === mode && p.profil === profil);
        const sens = /^[✓✗] (.*) : /.exec(n.contenu)[1];
        const tenue = promesse.verdict === 'tenue';
        return { ...n, contenu: `${TEXTES_DU_DETAIL.garantie(tenue, sens, promesse.contraste)} · ${niveauEcrit(promesse.contraste, jugementDuSeuil(promesse.paire.seuil)).ecrit}`, style: tenue ? 'note' : 'chiffre', couleur: tenue ? seconde : danger };
      }
      if (n.nom === 'titre') return { ...n, contenu: TEXTES_DE_LA_PLANCHE.titreDesUsages(NOMS_DE_PROFIL[profil]) };
      return { ...n, couleur: peindre(n.couleur) };
    }
    return { ...n, fond: peindre(n.fond), ...(n.trait ? { trait: { ...n.trait, couleur: peindre(n.trait.couleur) } } : {}) };
  });
}

const NOM_DES_USAGES = 'quelle nuance pour quel usage';

/** Les usages Soft et Vivid d'un thème, dans l'ordre Soft puis Vivid, quel que soit le porteur. */
function lesDeuxSections(lu, theme, mode) {
  const section = theme.enfants.find((e) => e.nom === NOM_DES_USAGES);
  return { soft: usagesDuProfil(lu, section, mode, 'soft'), vivid: usagesDuProfil(lu, section, mode, 'vivid'), section };
}

/** Récrit chaque thème du cadre à deux intensités selon une disposition des usages. */
function cadreADeuxIntensites(lu, disposition, grille) {
  const modele = modeleDeCadre(RECETTE, lu.palette, 'SRGB', { grille });
  if (disposition === 'actuel') return modele.racine;
  return transformer(modele.racine, (n) => {
    if (n.type !== 'cadre' || !/^thème (light|dark)$/.test(n.nom)) return n;
    const { soft, vivid, section } = lesDeuxSections(lu, n, n.nom.slice(6));
    const rang = n.enfants.indexOf(section);
    const filet = n.enfants[rang - 1];
    const remplacants = disposition === 'D1' ? [soft, filet, vivid] : [disposition === 'D2' ? usagesEnColonnes(soft, vivid) : usagesEnLignes(soft, vivid)];
    return { ...n, enfants: [...n.enfants.slice(0, rang), ...remplacants, ...n.enfants.slice(rang + 1)] };
  });
}

/** Le titre d'une section des usages, sans nom de profil. */
const titreSansProfil = (section) => ({ ...section.enfants[0], contenu: 'Quelle nuance pour quel usage' });
const lignesDUsage = (section) => section.enfants.filter((e) => e.type === 'cadre' && e.nom.startsWith('usage '));
const etatsDe = (ligne) => ligne.enfants.slice(1);

/** D2 : deux colonnes, Soft puis Vivid, sous chaque état. */
function usagesEnColonnes(soft, vivid) {
  const entete = soft.enfants[1];
  const seconde = entete.enfants[1].couleur;
  const largeur = entete.enfants[1].largeur;
  const tete = cadreNu('états', 'HORIZONTAL', [entete.enfants[0], ...entete.enfants.slice(1).map((t) => cadreNu(t.nom, 'VERTICAL', [
    { ...t, largeur: 2 * largeur + TRAME },
    cadreNu('profils', 'HORIZONTAL', [texteNu('Soft', 'Soft', 'note', seconde, largeur), texteNu('Vivid', 'Vivid', 'note', seconde, largeur)]),
  ], { espacement: 0 }))], { espacement: 2 * TRAME });
  const lignesV = lignesDUsage(vivid);
  const lignes = lignesDUsage(soft).map((ligne, i) => cadreNu(ligne.nom, 'HORIZONTAL', [
    ligne.enfants[0],
    ...etatsDe(ligne).map((etat, k) => cadreNu(etat.nom, 'HORIZONTAL', [etat, etatsDe(lignesV[i])[k]])),
  ], { espacement: 2 * TRAME }));
  const filet = soft.enfants.find((e) => e.nom === 'filet');
  return cadreNu(NOM_DES_USAGES, 'VERTICAL', [titreSansProfil(soft), tete, ...lignes.flatMap((l) => [filet, l])], { espacement: 2 * TRAME });
}

/** D3 : sous chaque usage, une ligne Soft puis une ligne Vivid. */
function usagesEnLignes(soft, vivid) {
  const entete = soft.enfants[1];
  const encre = lignesDUsage(soft)[0].enfants[0].enfants[0].couleur;
  const tete = cadreNu('états', 'HORIZONTAL', [entete.enfants[0], espaceVide(40), ...entete.enfants.slice(1)], { espacement: 2 * TRAME });
  const lignesV = lignesDUsage(vivid);
  const lignes = lignesDUsage(soft).map((ligne, i) => cadreNu(ligne.nom, 'HORIZONTAL', [
    ligne.enfants[0],
    cadreNu('profils', 'VERTICAL', [
      cadreNu('soft', 'HORIZONTAL', [texteNu('profil', 'Soft', 'role', encre, 40), ...etatsDe(ligne)], { espacement: 2 * TRAME }),
      cadreNu('vivid', 'HORIZONTAL', [texteNu('profil', 'Vivid', 'role', encre, 40), ...etatsDe(lignesV[i])], { espacement: 2 * TRAME }),
    ], { espacement: 2 * TRAME }),
  ], { espacement: 2 * TRAME }));
  const filet = soft.enfants.find((e) => e.nom === 'filet');
  return cadreNu(NOM_DES_USAGES, 'VERTICAL', [titreSansProfil(soft), tete, ...lignes.flatMap((l) => [filet, l])], { espacement: 2 * TRAME });
}

/** Les calques d'un cadre, avec et sans les grilles. */
function calques(construire) {
  return { avec: compterCalques(construire(true)), sans: compterCalques(construire(false)) };
}

function vueDuCadre(racine, { zoom = 0.5 } = {}) {
  return `<div class="planche-y"><div class="zoom" style="zoom:${zoom}">${rendre(racine)}</div></div>`;
}

/** Les usages d'un seul thème, peints de son fond, pour comparer les dispositions. */
function vueDesUsages(racine, mode, zoom = 0.5) {
  const theme = trouver(racine, (n) => n.nom === `thème ${mode}`);
  const debut = theme.enfants.findIndex((e) => e.nom === NOM_DES_USAGES);
  const fin = theme.enfants.findLastIndex((e) => e.nom === NOM_DES_USAGES);
  const morceau = { ...theme, enfants: theme.enfants.slice(debut, fin + 1) };
  return vueDuCadre(morceau, { zoom });
}

function sectionCadre() {
  const bleu = P.Bleu;
  const actuel = (g) => cadreADeuxIntensites(bleu, 'actuel', g);
  const compte = {
    actuel: calques(actuel),
    une: calques((g) => cadreAUneIntensite(bleu, g)),
    D1: calques((g) => cadreADeuxIntensites(bleu, 'D1', g)),
    D2: calques((g) => cadreADeuxIntensites(bleu, 'D2', g)),
    D3: calques((g) => cadreADeuxIntensites(bleu, 'D3', g)),
  };
  const ligne = (nom, c) => `<tr><td>${nom}</td><td>${milliers(c.avec)}</td><td>${milliers(c.sans)}</td></tr>`;
  const sauge = P.Sauge;
  return `<section class="bloc" id="y2-4">
  <div class="tete"><span class="sur">Y2.4 · Cadre de la planche</span><h2>Les rampes de la palette, et les usages de chaque profil</h2></div>
  <p>Aujourd’hui, la section des usages ne montre que le profil porteur : Vivid pour Bleu, qui est saturé, Soft pour Sauge (#A0B599), qui ne l’est pas. D’où l’alternance constatée. Les cadres ci-dessous sont le modèle de planche du plugin, rendu tel qu’il se dessine dans Figma, sans les grilles de contrastes ; les dispositions proposées transforment son arbre, et les calques se comptent sur lui.</p>
  <h3>Une intensité</h3>
  <div class="scene"><div class="scene-rangee">
    <div>${vueDuCadre(cadreAUneIntensite(bleu, false))}<p class="legende"><b>Bleu, une intensité.</b> « La rampe », une rangée sans nom de profil, pastilles nommées <code>light/600</code> ; la note n’explique que ◆ ; les usages de la seule rampe, sans nom de profil dans le titre.</p></div>
    <div>${vueDuCadre(cadreAUneIntensite(sauge, false))}<p class="legende"><b>Sauge, une intensité.</b> Même structure que Bleu : seule la saturation de la rampe change.</p></div>
  </div></div>
  <h3>Deux intensités : où poser les usages de Soft et de Vivid</h3>
  <div class="scene"><div class="scene-rangee">
    <div>${vueDuCadre(actuel(false))}<p class="legende"><b>En place.</b> Les deux rampes, puis les usages du seul profil porteur, Vivid.</p></div>
  </div><div class="scene-rangee">
    <div>${vueDesUsages(cadreADeuxIntensites(bleu, 'D1', false), 'light', 0.6)}<p class="legende"><b>D1 · Une section par profil.</b> « Quelle nuance pour quel usage · Soft », puis « · Vivid », toujours dans cet ordre. Chaque section garde la forme d’aujourd’hui ; le thème s’allonge d’une section. Thème Light seul.</p></div>
  </div><div class="scene-rangee">
    <div>${vueDesUsages(cadreADeuxIntensites(bleu, 'D2', false), 'light', 0.6)}<p class="legende"><b>D2 · Deux colonnes par état.</b> Sous default, hover et active, Soft puis Vivid côte à côte : la comparaison se fait d’un coup d’œil, mais le thème passe de ${48 + CRANS.length * 64} à environ 1 260 px de large.</p></div>
  </div><div class="scene-rangee">
    <div>${vueDesUsages(cadreADeuxIntensites(bleu, 'D3', false), 'light', 0.6)}<p class="legende"><b>D3 · Deux lignes par usage.</b> Sous chaque usage, une ligne Soft et une ligne Vivid, dans les mêmes colonnes d’états. Largeur presque inchangée.</p></div>
  </div></div>
  <div class="recap"><table><tr><th>Cadre de Bleu</th><th>Calques, grilles comprises</th><th>Sans les grilles</th></tr>
    ${ligne('Aujourd’hui (usages du porteur)', compte.actuel)}
    ${ligne('Une intensité', compte.une)}
    ${ligne('Deux intensités, D1', compte.D1)}
    ${ligne('Deux intensités, D2', compte.D2)}
    ${ligne('Deux intensités, D3', compte.D3)}
  </table></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition des usages à deux intensités.</b> <span class="reco">Recommandé : D1</span>, toujours Soft puis Vivid : deux palettes de même configuration donnent le même cadre, quel que soit le porteur, et chaque section se lit comme aujourd’hui. D3 rapproche Soft et Vivid pour un même usage, mais double la hauteur de chaque ligne ; D2 élargit le cadre au-delà des rampes.</li>
    <li><b>L’en-tête du cadre.</b> Avec deux intensités, il nomme le profil porteur : « Couleur de référence #1E6FD9 · Vivid · nuances 600 et 600 » ; avec une, il ne le nomme pas. <span class="reco">Recommandé.</span></li>
    <li><b>Le titre de la section des rampes.</b> « Les deux rampes » avec deux intensités, « La rampe » avec une. <span class="reco">Recommandé.</span> Autre : « Les nuances » dans les deux cas.</li>
  </ol></div>
</section>`;
}

/* Y2.3 : contenu des planches */

function partiesDuCadre(lu) {
  const racine = cadreADeuxIntensites(lu, 'D1', true);
  const theme = (mode) => trouver(racine, (n) => n.nom === `thème ${mode}`);
  const somme = (mode, predicat) => theme(mode).enfants.filter(predicat).reduce((t, e) => t + compterCalques(e), 0);
  const usages = (mode) => somme(mode, (e) => e.nom === NOM_DES_USAGES) + 2;
  const grilles = (mode) => somme(mode, (e) => e.nom === 'contrastes') + 1;
  const parTheme = (mode) => ({ usages: usages(mode), grilles: grilles(mode), note: 1 });
  return {
    total: compterCalques(racine),
    theme: { light: compterCalques(theme('light')), dark: compterCalques(theme('dark')) },
    parTheme: { light: parTheme('light'), dark: parTheme('dark') },
    usages: usages('light') + usages('dark'),
    grilles: grilles('light') + grilles('dark'),
    note: 2,
  };
}

function carteDuContenu(disposition, etat) {
  const c = partiesDuCadre(P.Bleu);
  const off = new Set(etat.off);
  const moins = ['light', 'dark'].reduce((t, mode) => t + (off.has(mode) ? c.theme[mode] : [...off].reduce((s, partie) => s + (c.parTheme[mode][partie] ?? 0), 0)), 0);
  const unSeulTheme = off.has('light') || off.has('dark');
  const ligne = (nom, aide, cle, { fixe = false } = {}) => {
    const allume = !off.has(cle);
    const bloque = fixe || (unSeulTheme && allume && (cle === 'light' || cle === 'dark'));
    const nombre = cle === 'light' || cle === 'dark' ? c.theme[cle] : c[cle];
    return `<div class="contenu-ligne${allume ? '' : ' eteinte'}"><div><b>${nom}</b><span class="aide">${aide}${bloque && !fixe ? ' · au moins un thème' : ''}</span></div>${nombre ? `<span class="sec mono petit">${milliers(nombre)} calques</span>` : '<span></span>'}${interrupteur(allume, { inactif: bloque })}</div>`;
  };
  const parties = [
    ligne('En-tête et rampes', 'Nom, référence, et les pastilles que la création des variables lit', 'rampes', { fixe: true }),
    ligne('Note sous les rampes', '◆ et ≈ expliqués', 'note'),
    ligne('Quelle nuance pour quel usage', 'Les spécimens et leurs garanties, par profil', 'usages'),
    ligne('Contrastes, nuance par nuance', 'Les grilles de chaque rampe', 'grilles'),
  ].join('');
  const themes = [ligne('Thème Light', `Fond ${FONDS.light}`, 'light'), ligne('Thème Dark', `Fond ${FONDS.dark}`, 'dark')].join('');
  const effet = off.size === 0
    ? '<p class="aide">Tout est généré.</p>'
    : `<p class="effet">Les cadres déjà générés passeront « À mettre à jour ». Cadre de Bleu : ${milliers(c.total)} → ${milliers(c.total - moins)} calques.</p>`;
  const resume = off.size === 0 ? 'Tout est généré' : [...off].map((x) => ({ grilles: 'Sans grilles', usages: 'Sans usages', note: 'Sans note', light: 'Thème Dark seul', dark: 'Thème Light seul' }[x])).join(' · ');
  if (disposition === 'C1') {
    return `${accordeon('Contenu des planches', resume, { ouvert: true })}<div class="carte-f corps-ouvert"><div class="groupe-titre">Parties d’un cadre</div>${parties}<div class="groupe-titre">Thèmes</div>${themes}${effet}<div class="pied-de-reglage">${bouton('Rétablir', 'second', { compact: true })}</div></div>`;
  }
  const bloc = (cle, hauteur, texte) => `<div class="schema-bloc${off.has(cle) ? ' eteint' : ''}" style="height:${hauteur}px">${texte}</div>`;
  const colonne = (mode) => `<div class="schema-theme${off.has(mode) ? ' eteint' : ''}" style="background:${FONDS[mode]};color:${encreSur(FONDS[mode])}">${bloc('rampes', 18, 'Rampes')}${bloc('note', 6, '')}${bloc('usages', 70, 'Usages')}${bloc('grilles', 90, 'Grilles')}</div>`;
  const schema = `<div class="schema"><div class="schema-tete">Bleu</div><div class="schema-themes">${colonne('light')}${colonne('dark')}</div></div>`;
  return `${accordeon('Contenu des planches', resume, { ouvert: true })}<div class="carte-f corps-ouvert"><div class="contenu-c2"><div>${parties}${themes}</div>${schema}</div>${effet}<div class="pied-de-reglage">${bouton('Rétablir', 'second', { compact: true })}</div></div>`;
}

function sectionContenu() {
  const c = partiesDuCadre(P.Bleu);
  const reglages = (contenu) => panneau('Réglages', `${accordeon('Couleurs de fond', '3 palettes concernées')}${accordeon('Intensités', 'Soft 0,45 · Vivid 0,95')}${accordeon('Luminosité des nuances', '11 nuances')}${accordeon('Minimums des promesses', 'Texte 4,5:1 · Éléments graphiques 3:1')}${accordeon('Détection des couleurs proches', 'Soft et Vivid 0,02 · Deux palettes 0,05')}${contenu}`);
  return `<section class="bloc" id="y2-3">
  <div class="tete"><span class="sur">Y2.3 · Contenu des planches</span><h2>Une carte des Réglages communs, un interrupteur par partie du cadre</h2></div>
  <p>Le réglage se range dans la recette (Q5.3) et entre dans l’empreinte : changer une partie fait passer les cadres générés « À mettre à jour ». L’en-tête et les rampes ne se désactivent pas : les pastilles nommées sont ce que la création des variables lira. Il reste toujours au moins un thème. Les calques sont ceux du cadre de Bleu dans la disposition D1 de Y2.4, ${milliers(c.total)} au total. Les autres cartes sont ici repliées.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${reglages(carteDuContenu('C1', { off: [] }))}<p class="legende"><b>C1 · Liste d’interrupteurs, tout allumé.</b> Carte repliable, en dernier, après la Détection des couleurs proches. Chaque ligne dit ce qu’elle retire et combien de calques.</p></div>
    <div>${reglages(carteDuContenu('C1', { off: ['grilles', 'dark'] }))}<p class="legende"><b>C1 · Sans grilles, Thème Light seul.</b> L’interrupteur du thème restant se bloque, avec sa raison. L’effet sur les cadres s’écrit sous la liste.</p></div>
  </div><div class="scene-rangee">
    <div>${reglages(carteDuContenu('C2', { off: ['grilles'] }))}<p class="legende"><b>C2 · La liste et un schéma du cadre.</b> Les parties éteintes se grisent dans le schéma, à la hauteur qu’elles occupent.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : C1</span>, plus courte et lisible à 500 px ; le nombre de calques dit déjà le poids de chaque partie. C2 montre la forme du cadre, mais le schéma prend la moitié de la largeur à 500 px.</li>
    <li><b>Ce qui ne se désactive pas.</b> L’en-tête et les rampes ; au moins un thème. <span class="reco">Recommandé.</span> La note suit les rampes, elle peut s’éteindre seule.</li>
    <li><b>Une palette libre.</b> Elle n’a pas d’usages : l’interrupteur des usages ne la touche pas. <span class="reco">Recommandé</span>, sans mention dans la carte.</li>
    <li><b>La place de la carte.</b> En dernier et repliée, avec un résumé (« Tout est généré », « Sans grilles »). <span class="reco">Recommandé.</span> Autre : dans l’onglet Planches, près des gestes globaux ; mais le réglage est commun à la recette, comme les autres cartes.</li>
  </ol></div>
</section>`;
}

/* Y2.5 : fonds sombres */

const GRILLE = { crans: CRANS, courbes: RECETTE.courbes };
const BOUTS = boutsDe(GRILLE);
const COURBE = RECETTE.courbes.dark;
const RANG_400 = cran(400);
const [L50, L400] = [COURBE[0], COURBE[RANG_400]];
const FONDS_TEINTES = [50, 100, 200, 300];

const REGLES = {
  actuel: { nom: 'Aujourd’hui', reglage: null, part: (part) => part },
  R1: {
    nom: 'R1 · Plafond de chroma',
    reglage: { libelle: 'Chroma maximale des fonds sombres', defaut: 0.045, ecrit: (v) => virgule(v, 3) },
    part: (part, L, H, v) => Math.min(part, v / plafond(L, H)),
  },
  R2: {
    nom: 'R2 · Part propre aux fonds',
    reglage: { libelle: 'Intensité des fonds sombres', defaut: 0.5, ecrit: (v) => `× ${virgule(v)}` },
    part: (part, L, H, v) => part * v,
  },
  R3: {
    nom: 'R3 · Part décroissante',
    reglage: { libelle: 'Intensité gardée au cran 50', defaut: 0.3, ecrit: (v) => `× ${virgule(v)}` },
    part: (part, L, H, v) => part * (v + ((1 - v) * (L - L50)) / (L400 - L50)),
  },
};

/** La rampe Dark d'un profil sous une règle : les crans sous 400 se refabriquent, sauf la référence exacte. */
function rampeSombre(palette, analyse, profil, regle, valeur = REGLES[regle].reglage?.defaut) {
  const reference = rgb8VersOklch(referenceDe(palette));
  const part = partsDe(RECETTE, palette)[profil];
  return analyse.rampes[profil].dark.map((c, rang) => {
    if (rang >= RANG_400 || regle === 'actuel') return c;
    if (analyse.ancrage.profil === profil && analyse.ancrage.rangs.dark === rang) return c;
    const L = COURBE[rang];
    const H = teinteA(L, reference, palette.derive[profil], BOUTS);
    return fabriquerCran(L, H, REGLES[regle].part(part, L, H, valeur), RECETTE.gamut);
  });
}

/** Les paires qui touchent un fond teinté, jugées sur une rampe Dark. */
const PAIRES_DES_FONDS = PAIRES.filter((p) => [p.premier, p.second].some((m) => 'emploi' in m && (m.emploi === 'surface' || m.emploi === 'surface-card')));
function jugerLesFonds(rampe) {
  const couleur = (m) => {
    if ('fond' in m) return rgb(FONDS.dark);
    const cible = TABLE_DES_EMPLOIS[m.emploi];
    return cible === 'fond' ? rgb(FONDS.dark) : rampe[cran(cible) + m.decalage].couleur;
  };
  return PAIRES_DES_FONDS.map((p) => ({ paire: p, contraste: contraste(couleur(p.premier), couleur(p.second)), seuil: RECETTE.seuils[p.seuil] }));
}

/** Le pire cas de chaque paire des fonds, sur les 360 teintes et les deux profils, aux parts communes. */
function pireSurLesTeintes(regle) {
  const pires = new Map();
  for (const profil of ['soft', 'vivid']) {
    const part = RECETTE.profils[profil].part;
    for (let H = 0; H < 360; H += 1) {
      const rampe = COURBE.map((L, rang) => fabriquerCran(L, H, rang < RANG_400 ? REGLES[regle].part(part, L, H, REGLES[regle].reglage?.defaut) : part, RECETTE.gamut));
      for (const jugement of jugerLesFonds(rampe)) {
        const connu = pires.get(jugement.paire.numero);
        if (!connu || jugement.contraste < connu.contraste) pires.set(jugement.paire.numero, { ...jugement, H, profil });
      }
    }
  }
  return [...pires.values()];
}

/** Les crans Dark où Soft et Vivid se confondent, sous une règle. */
function confondus(lu, regle) {
  const soft = rampeSombre(lu.palette, lu.deux, 'soft', regle);
  const vivid = rampeSombre(lu.palette, lu.deux, 'vivid', regle);
  return CRANS.filter((_, rang) => distanceOk(soft[rang].couleur, vivid[rang].couleur) < RECETTE.seuils.profilsConfondus);
}

function specimensSombres(rampe) {
  const n = (numero) => rampe[cran(numero)].hexa;
  const fond = FONDS.dark;
  return `<div class="fs" style="background:${fond}">
    <div class="fs-alerte" style="background:${n(100)};color:${n(700)};box-shadow:inset 0 0 0 1px ${n(300)}"><b>Paiement refusé</b><span>Vérifiez la carte, puis réessayez.</span><span class="fs-btn" style="background:${n(700)};color:${fond}">Réessayer</span></div>
    <div class="fs-encart" style="background:${n(200)};color:${n(900)}">ⓘ Encart en surface, état hover (200)</div>
    <div class="fs-carte" style="background:${n(50)};box-shadow:inset 0 0 0 1px ${n(300)};color:#F5F5F5"><b>Carte</b><span class="fs-badge" style="background:${n(100)};color:${n(700)}">Badge</span><span class="fs-champ" style="box-shadow:inset 0 0 0 1px ${n(600)}">Champ</span></div>
    <div class="fs-rampe">${rampe.map((c, rang) => `<i style="background:${c.hexa}" title="${CRANS[rang]} ${c.hexa}"></i>`).join('')}</div>
    <span class="fs-chroma">C ${FONDS_TEINTES.map((numero) => ecrireArrondi(rampe[cran(numero)].C, 3)).join(' · ')}</span>
  </div>`;
}

function sectionFondsSombres() {
  const regles = Object.keys(REGLES);
  const rangee = (lu) => {
    const profil = lu.porteur;
    return `<div class="fs-rangee"><div class="fs-nom"><b>${lu.nom}</b><span class="sec">${lu.palette.reference} · ${NOMS_DE_PROFIL[profil]}</span></div>${regles.map((r) => specimensSombres(rampeSombre(lu.palette, lu.deux, profil, r))).join('')}</div>`;
  };
  const rangeeSoft = (lu) => `<div class="fs-rangee"><div class="fs-nom"><b>${lu.nom}</b><span class="sec">${lu.palette.reference} · Soft</span></div>${regles.map((r) => specimensSombres(rampeSombre(lu.palette, lu.deux, 'soft', r))).join('')}</div>`;
  const entete = `<div class="fs-rangee fs-entete"><span></span>${regles.map((r) => `<b>${REGLES[r].nom}${REGLES[r].reglage ? `<span class="sec"> · ${REGLES[r].reglage.ecrit(REGLES[r].reglage.defaut)}</span>` : ''}</b>`).join('')}</div>`;
  const pires = Object.fromEntries(regles.map((r) => [r, pireSurLesTeintes(r)]));
  const nomDeLaPaire = (p) => {
    const nom = (m) => ('fond' in m ? 'fond' : `${m.emploi}${m.decalage ? ` +${m.decalage}` : ''}`);
    return `<code>${nom(p.premier)}</code> sur <code>${nom(p.second)}</code>`;
  };
  const tableDesGaranties = `<div class="recap"><table><tr><th>Paire, thème Dark</th><th>Seuil</th>${regles.map((r) => `<th>${REGLES[r].nom}</th>`).join('')}</tr>
    ${PAIRES_DES_FONDS.map((p) => `<tr><td>${nomDeLaPaire(p)}</td><td>${ecrireContraste(RECETTE.seuils[p.seuil])}:1</td>${regles.map((r) => {
      const pire = pires[r].find((x) => x.paire.numero === p.numero);
      return `<td class="${pire.contraste >= pire.seuil ? '' : 'ko-c'}">${ecrireContraste(pire.contraste)}:1 <span class="sec">${NOMS_DE_PROFIL[pire.profil]} ${pire.H}°</span></td>`;
    }).join('')}</tr>`).join('')}</table></div>`;
  const tableDesConfusions = `<div class="recap"><table><tr><th>Crans Dark où Soft et Vivid se confondent (≈)</th>${regles.map((r) => `<th>${REGLES[r].nom}</th>`).join('')}</tr>
    ${REFERENCES.map(([nom]) => `<tr><td>${nom}</td>${regles.map((r) => `<td>${confondus(P[nom], r).join(', ') || 'aucun'}</td>`).join('')}</tr>`).join('')}</table></div>`;
  const courbe = (profil) => FONDS_TEINTES.map((numero) => {
    const r = cran(numero);
    const L = COURBE[r];
    const facteur = REGLES.R3.part(1, L, 0, REGLES.R3.reglage.defaut);
    return `${numero} : ${virgule(RECETTE.profils[profil].part * facteur)}`;
  }).join(' · ');
  const reglage = (variante) => panneau('Réglages', `<div class="carte-f"><div class="carte-titre">Intensités<span class="droite"><span class="sec">4 palettes concernées</span>${bouton('Rétablir', 'second', { compact: true })}</span></div>
    ${curseur('Intensité Soft', RECETTE.profils.soft.part)}${curseur('Intensité Vivid', RECETTE.profils.vivid.part)}
    ${variante === 'curseur' ? `<div class="filet-y"></div>${curseur('Fonds du thème Dark', REGLES.R3.reglage.defaut)}<span class="aide">Part de l’intensité que garde la nuance 50 du thème Dark ; elle remonte jusqu’à la nuance 400, qui garde toute la sienne. Parts effectives, Vivid : ${courbe('vivid')}.</span>` : `<div class="filet-y"></div><div class="curseur-ligne"><b>Fonds du thème Dark</b>${segment(['Vifs', 'Adoucis', 'Discrets'], 'Adoucis')}<span></span></div><span class="aide">Adoucis : la nuance 50 garde ${virgule(REGLES.R3.reglage.defaut)} de l’intensité, la 400 toute. Vifs : aujourd’hui. Discrets : 0,15.</span>`}
    <span class="aide">Une valeur proche de 0 produit des nuances plus grises. Une valeur proche de 1 utilise davantage la couleur disponible.</span></div>`);
  return `<section class="bloc" id="y2-5">
  <div class="tete"><span class="sur">Y2.5 · Fonds sombres</span><h2>Des fonds teintés moins saturés en thème Dark, des accents inchangés</h2></div>
  <p>Mesure Y7.1, sur les 360 teintes : en Dark, la nuance 100 (L 0,225) a une chroma médiane de ${ecrireArrondi(0.95 * medianeDuPlafond(1), 3)} en Vivid et de ${ecrireArrondi(0.45 * medianeDuPlafond(1), 3)} en Soft. Les pas 2 et 3 des échelles sombres de Radix, à la même clarté, ont une chroma médiane de 0,019 et 0,047 ; leur part de chroma monte de 0,24 au pas 1 à 0,76 au pas 4. Material 3 peint ses surfaces sombres d’un neutre presque gris (chroma 0,010 à 0,016) et ses conteneurs au ton 30, L 0,40, chroma 0,09. Le détail est dans le plan, Y7.1.</p>
  <p>Trois règles, appliquées aux nuances 50 à 300 du thème Dark, dans chaque profil ; les nuances 400 et au-delà ne changent pas, ni le thème Light. <b>R1</b> plafonne la chroma absolue. <b>R2</b> multiplie la part de chaque profil par un même facteur. <b>R3</b> multiplie la part par un facteur qui part de sa valeur au cran 50 et remonte à 1 au cran 400 ; à ${virgule(REGLES.R3.reglage.defaut)}, la part de Vivid vaut ${courbe('vivid')}, près de la part de Radix aux mêmes clartés. Chaque case montre une alerte (fond 100, texte 700, filet 300, bouton 700), un encart en surface hover (200, texte 900), une carte (50, filet 300, badge 100, champ 600), la rampe Dark entière, et la chroma des nuances 50 à 300.</p>
  <div class="fs-grille">${entete}${REFERENCES.map(([nom]) => rangee(P[nom])).join('')}${rangeeSoft(P.Rouge)}</div>
  <h3>Garanties, pire cas sur les 360 teintes</h3>
  <p class="legende">Aux intensités communes, les deux profils, dérive nulle. Une baisse de chroma à clarté égale change la luminance relative : ces ratios sont ceux que Y7.4 rejouera.</p>
  ${tableDesGaranties}
  ${tableDesConfusions}
  <h3>Le réglage</h3>
  <div class="scene"><div class="scene-rangee">
    <div>${reglage('curseur')}<p class="legende"><b>Dans la carte Intensités, un curseur.</b> La valeur de R3, de 0 à 1 ; 1 rend les couleurs d’aujourd’hui.</p></div>
    <div>${reglage('segments')}<p class="legende"><b>Dans la carte Intensités, trois crans.</b> Vifs (1), Adoucis (${virgule(REGLES.R3.reglage.defaut)}), Discrets (0,15).</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La règle.</b> <span class="reco">Recommandé : R3</span>, qui désature le plus là où le fond est le plus sombre et rejoint les accents sans marche au cran 400, comme Radix. R1 aplatit : 50 et 300 prennent la même chroma pour une teinte saturée, et une teinte peu saturée ne change pas. R2 garde une marche entre 300 et 400.</li>
    <li><b>La valeur par défaut.</b> <span class="reco">Recommandé : ${virgule(REGLES.R3.reglage.defaut)}</span>. Toutes les recettes de format 3 la prennent (Y7.3), et tous les cadres passent « À mettre à jour ».</li>
    <li><b>Le réglage.</b> Un curseur de 0 à 1 dans la carte Intensités des Réglages communs, commun à toutes les palettes. <span class="reco">Recommandé : le curseur</span>, comme les deux intensités au-dessus. Les trois crans cachent la valeur exacte que la recette range.</li>
    <li><b>Les profils confondus.</b> Désaturer rapproche Soft et Vivid dans les fonds sombres : la table ci-dessus compte les nuances où ≈ apparaîtrait. <span class="reco">Recommandé : l’alerte « Profils confondus » ignore les nuances 50 à 300 du thème Dark</span>, où la ressemblance est voulue ; la revue Y3.1 tranchera.</li>
    <li><b>Une référence très sombre.</b> Si la référence exacte tombe entre 50 et 300 en Dark, elle garde ses octets et la règle ne la touche pas. <span class="reco">Recommandé</span>, par cohérence avec <code>[MOT-17]</code>.</li>
  </ol></div>
</section>`;
}

function medianeDuPlafond(rang) {
  const valeurs = Array.from({ length: 360 }, (_, H) => plafond(COURBE[rang], H)).sort((a, b) => a - b);
  return valeurs[180];
}

/* La page */

const lireStyle = (fichier, motif) => motif.exec(fs.readFileSync(path.join(ICI, fichier), 'utf8'))[1];
const STYLE_V3 = lireStyle('generer-maquettes-v3.mjs', /const STYLE = `([\s\S]*?)`;\n/);
const STYLE_V4 = lireStyle('generer-maquettes-v4.mjs', /const STYLE_SECOND = `([\s\S]*?)`;\n/);
const STYLE_V4_BIS = lireStyle('generer-maquettes-v4.mjs', /\$\{STYLE_SECOND\}\n([\s\S]*?)`;\n/);
const STYLE = `${STYLE_V3}${STYLE_V4}${STYLE_V4_BIS}
main { max-width: 1400px; }
.fp { --f-onglet: #505050; }
.fp-haut { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.fp-titre { font-size: 14px; font-weight: 600; }
.b4.droite-b { height: 28px; }
.fp-onglets { display: flex; gap: 4px; padding: 0 16px 8px; margin: 0 16px; border-bottom: 1px solid var(--f-bord); padding-left: 0; }
.fp-onglets span, .onglets-y span { height: 24px; padding: 0 8px; border-radius: 4px; display: grid; place-items: center; color: var(--f-texte-2); font-weight: 600; white-space: nowrap; }
.fp-onglets .on, .onglets-y .on { background: var(--f-onglet); color: var(--f-texte); }
.onglets-y { display: flex; gap: 4px; }
.deux-bascules { display: flex; justify-content: space-between; }
.zone-y { display: grid; gap: 10px; padding-bottom: 15px; border-bottom: 1px solid var(--f-bord); margin-bottom: 3px; }
.titre-y { font-size: 16px; line-height: 24px; font-weight: 600; }
.b4.compact { height: 24px; padding: 0 8px; font-size: 11px; border-radius: 5px; }
.b4.danger { background: #E03E1A; border-color: #E03E1A; color: #fff; }
.souligne { text-decoration: underline; }
.trois > div > .libelle + .segment, .trois > div > .segment + .libelle, .trois > div > .aide + .libelle { margin-top: 2px; }
.trois > div > .segment + .libelle, .trois > div > .aide + .libelle, .trois > div > .ligne-inter + .aide { margin-top: 6px; }
.ligne-inter { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
.inter { width: 28px; height: 16px; border-radius: 8px; background: var(--f-bord); display: inline-flex; align-items: center; padding: 2px; flex: none; }
.inter b { width: 12px; height: 12px; border-radius: 50%; background: #fff; }
.inter.on { background: var(--f-marque); justify-content: flex-end; }
.inter.inactif { opacity: .45; }
.choix-cartes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.choix-carte { display: grid; gap: 6px; align-content: start; padding: 10px; border: 1px solid var(--f-bord); border-radius: 8px; background: var(--f-fond); }
.choix-carte.on { border-color: var(--f-marque); box-shadow: inset 0 0 0 1px var(--f-marque); }
.choix-tete { display: flex; gap: 8px; align-items: center; }
.radio { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--f-texte-2); }
.radio.on { border: 4px solid var(--f-marque); background: #fff; }
.choix-porteur { display: grid; gap: 4px; }
.nu { border-radius: 6px; padding: 10px; }
.nu-grille { display: grid; gap: 3px; align-items: center; }
.nu-num { text-align: center; font-size: 9.5px; opacity: .7; font-variant-numeric: tabular-nums; }
.nu-prof { font-size: 10px; font-weight: 600; }
.nu-sw { height: 24px; border-radius: 4px; display: grid; place-items: center; font-size: 10px; }
.nu-onsolid { align-self: stretch; border: 1px dashed #8C8C8C; border-radius: 4px; }
.choix-carte .nu { padding: 6px; }
.choix-carte .nu-sw { height: 14px; font-size: 8px; }
.curseur-ligne { display: grid; grid-template-columns: 130px 1fr 56px; gap: 10px; align-items: center; }
.piste { position: relative; height: 6px; border-radius: 3px; background: var(--f-tertiaire); }
.piste i { position: absolute; inset: 0 auto 0 0; border-radius: 3px; background: var(--f-marque); }
.piste > b { position: absolute; top: -5px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.3); }
.piste u { position: absolute; top: -10px; margin-left: -4px; width: 0; height: 0; border: 4px solid transparent; border-top: 5px solid var(--f-texte); }
.piste.fixe i { background: var(--f-texte-2); }
.mini-champ-f.inactif { color: var(--f-texte-2); }
.corps-ouvert { margin-top: -10px; border-top-left-radius: 0; border-top-right-radius: 0; }
.g-ligne-y { display: grid; grid-template-columns: 36px 1fr auto 14px; gap: 8px; align-items: center; }
.spec-y { height: 22px; border-radius: 4px; display: grid; place-items: center; font-weight: 600; border: 1px solid rgba(128,128,128,.4); }
.ko-t { color: #FF9C8A; }
.fiche { gap: 8px; }
.fiche-tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.fiche-nom { font-size: 13px; }
.etat-puce { height: 20px; padding: 0 8px; border-radius: 10px; display: inline-grid; place-items: center; font-size: 10px; font-weight: 600; white-space: nowrap; }
.etat-puce.neutre { background: #4A4A4A; color: #E6E6E6; }
.etat-puce.attention { background: #5A3A12; color: #FFC98A; }
.etat-puce.ok { background: #1E4A30; color: #9BE3B5; }
.etat-puce.ko { background: #5C231B; color: #FFB3A6; }
.fiche-info { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.fiche-ref { display: flex; gap: 8px; align-items: center; }
.ref-mini { display: inline-flex; gap: 4px; align-items: center; font-family: var(--mono); }
.ref-mini i { width: 12px; height: 12px; border-radius: 3px; }
.mini-apercu { border-radius: 6px; padding: 6px; display: grid; gap: 3px; }
.mini-rangee { display: grid; grid-template-columns: 30px repeat(${CRANS.length}, 1fr); gap: 2px; align-items: center; }
.mini-rangee:not(:has(.mini-nom)) { grid-template-columns: repeat(${CRANS.length}, 1fr); }
.mini-rangee span { height: 16px; border-radius: 3px; display: grid; place-items: center; font-size: 8px; }
.mini-rangee .mini-nom { height: auto; font-size: 9.5px; font-weight: 600; place-items: center start; }
.mini-apercu.fin { padding: 3px; width: 120px; }
.mini-apercu.fin .mini-rangee span { height: 7px; border-radius: 1px; }
.liste-b { display: grid; background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; }
.fiche-b { display: grid; grid-template-columns: minmax(0, 1fr) 120px auto; gap: 12px; align-items: center; padding: 8px 10px; }
.fiche-b .gestes-4 { flex-wrap: nowrap; }
.fiche-b + .fiche-b { border-top: 1px solid var(--f-bord); }
.etats-fiches .fiche-b { background: var(--f-bloc); border: 1px solid var(--f-bord); border-radius: 8px; }
.fiche-b-nom { display: flex; gap: 8px; align-items: center; min-width: 0; }
.fiche-b-nom > div { display: grid; gap: 2px; }
.fiche-b-sous { display: flex; gap: 6px; align-items: center; }
.fiche-b-gar { white-space: nowrap; }
.planches-tete { display: flex; justify-content: space-between; align-items: center; }
.planches-droite { display: flex; gap: 8px; align-items: center; }
.gestes-globaux { display: flex; gap: 8px; margin: -2px 0; padding: 10px 0; }
.carte-supprimee-y { background: color-mix(in srgb, #E8A33D 7%, var(--f-fond)); border-color: color-mix(in srgb, #E8A33D 28%, var(--f-bord)); gap: 6px; }
.groupe-fiches { display: grid; gap: 6px; }
.groupe-titre { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--f-texte-2); }
.etats-fiches { display: grid; gap: 10px; }
.etat-vignette { display: grid; gap: 4px; }
.etat-vignette > .sec.petit { color: var(--f-texte-2); }
.planche-y { border: 1px solid var(--filet); border-radius: 6px; background: repeating-conic-gradient(#E5E5E5 0% 25%, #F0F0F0 0% 50%) 50% / 16px 16px; padding: 12px; width: max-content; }
.nc { display: flex; box-sizing: border-box; flex: none; }
.nt { display: block; font-family: Inter, system-ui, sans-serif; line-height: 1.21; flex: none; }
.contenu-ligne { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 6px 0; border-top: 1px solid var(--f-bord); }
.contenu-ligne > div { display: grid; gap: 1px; }
.contenu-ligne.eteinte b { color: var(--f-texte-2); }
.groupe-titre + .contenu-ligne { border-top: 0; }
.effet { color: #FFC98A; }
.contenu-c2 { display: grid; grid-template-columns: 1fr 150px; gap: 14px; align-items: start; }
.schema { border: 1px solid var(--f-bord); border-radius: 6px; padding: 6px; background: #fff; display: grid; gap: 4px; }
.schema-tete { color: #1E1E1E; font-weight: 600; font-size: 10px; }
.schema-themes { display: grid; gap: 4px; }
.schema-theme { display: grid; gap: 3px; padding: 4px; border-radius: 4px; border: 1px solid #8C8C8C; }
.schema-bloc { border-radius: 2px; background: rgba(128,128,128,.35); font-size: 9px; display: grid; place-items: center; }
.schema-bloc.eteint, .schema-theme.eteint { opacity: .2; outline: 1px dashed #8C8C8C; }
.schema-theme.eteint .schema-bloc { visibility: hidden; }
.fs-grille { display: grid; gap: 8px; overflow-x: auto; }
.fs-rangee { display: grid; grid-template-columns: 110px repeat(4, minmax(230px, 1fr)); gap: 8px; align-items: stretch; min-width: 1060px; }
.fs-entete b { font-size: 13px; }
.fs-nom { display: grid; align-content: center; gap: 2px; font-size: 13px; }
.fs-nom .sec { font-family: var(--mono); font-size: 11px; color: var(--encre-2); }
.fs { border-radius: 8px; padding: 10px; display: grid; gap: 6px; font: 11px/14px Inter, sans-serif; color: #F5F5F5; }
.fs-alerte { border-radius: 6px; padding: 8px; display: grid; gap: 2px; justify-items: start; }
.fs-btn { margin-top: 4px; padding: 3px 10px; border-radius: 5px; font-weight: 600; }
.fs-encart { border-radius: 6px; padding: 6px 8px; }
.fs-carte { border-radius: 6px; padding: 8px; display: flex; gap: 8px; align-items: center; }
.fs-badge { padding: 1px 8px; border-radius: 10px; font-weight: 600; }
.fs-champ { margin-left: auto; padding: 2px 8px; border-radius: 4px; color: #B3B3B3; }
.fs-rampe { display: grid; grid-template-columns: repeat(${CRANS.length}, 1fr); gap: 2px; }
.fs-rampe i { height: 12px; border-radius: 2px; }
.fs-chroma { font-family: var(--mono); font-size: 10px; color: #B3B3B3; }
.ko-c { color: var(--ko); font-weight: 600; }
.filet-y { height: 1px; background: var(--f-bord); }
`;

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquettes du cinquième tour</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
${STYLE}</style>
</head>
<body>
<main>
<section class="intro">
  <span class="sur">UCM Palettes · plan d’ergonomie, cinquième tour · lot Y2</span>
  <h1>Maquettes à valider</h1>
  <p>Cinq maquettes, dans l’ordre des lots qui les attendent : Y2.1 débloque le moteur (Y3), Y2.4 et Y2.3 la planche (Y5), Y2.2 les fiches (Y6), Y2.5 les fonds sombres (Y7). Le panneau est à 650 px, dans le thème sombre de Figma, et montre déjà les corrections dictées de Y1 : ligne du titre sans génération, filet à 15 px, onglet actif sur fond, gestes compacts. Les couleurs, les ratios et les nombres de calques sont calculés par le moteur et le modèle de planche pour Bleu #1E6FD9, Vert #16A34A, Rouge #DC2626 et Sauge #A0B599.</p>
  <p>Chaque maquette montre la disposition en place quand elle existe, au moins une autre, puis ses questions avec une recommandation ; « recommandé » vaut accord si la question reste sans réponse. Les libellés sont des propositions : ils entreront dans l’inventaire des textes « À valider ».</p>
  <p class="note">Page écrite par <code>generer-maquettes-v5.mjs</code>. Pour la régénérer : <code>node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v5.mjs"</code>.</p>
  <nav class="sommaire"><a href="#y2-1">Y2.1 Choix des intensités</a><a href="#y2-2">Y2.2 Fiche d’une palette</a><a href="#y2-3">Y2.3 Contenu des planches</a><a href="#y2-4">Y2.4 Cadre de la planche</a><a href="#y2-5">Y2.5 Fonds sombres</a></nav>
</section>
${sectionIntensites()}
${sectionFiches()}
${sectionContenu()}
${sectionCadre()}
${sectionFondsSombres()}
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(ICI, 'MAQUETTES-RECETTE-V5.html'), page);
process.stdout.write(`MAQUETTES-RECETTE-V5.html : ${page.length} caractères\n`);
