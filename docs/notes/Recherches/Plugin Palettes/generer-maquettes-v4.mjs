#!/usr/bin/env node
/**
 * Écrit MAQUETTES-RECETTE-V4.html, les maquettes du lot X2 du quatrième plan,
 * avec les couleurs et les ratios que le moteur calcule pour #1E6FD9 et
 * #16A34A. Les libellés, les badges et les couleurs de l'interface de test
 * viennent des fonctions du plugin qui les produisent.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v4.mjs"
 *
 * La feuille de style reprend celle de generer-maquettes-v3.mjs, lue dans ce
 * fichier, et y ajoute les règles propres à ce tour.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  contraste,
  distanceOk,
  ecrireArrondi,
  ecrireContraste,
  emploisDuCran,
  lireHexa,
  mesurerCran,
  recetteParDefaut,
  verifierPromesses,
} from '../../../../packages/couleur/src/index.ts';
import { analyserPalette } from '../../../../packages/plugin-palettes/src/analyse.ts';
import { ajouter, nouvellePalette, renommer } from '../../../../packages/plugin-palettes/src/edition.ts';
import { couleursDeLInterface } from '../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts';
import { TEXTES_DE_L_INTERFACE_DE_TEST, gesteDeGeneration, jugementDuSeuil, niveauEcrit } from '../../../../packages/plugin-palettes/src/ui/textes.ts';

const ICI = path.dirname(fileURLToPath(import.meta.url));

/* Le moteur */

const DEFAUT = recetteParDefaut();
const RECETTE = [['Bleu', '#1E6FD9'], ['Vert', '#16A34A']].reduce(
  (recette, [nom, hexa], rang) => ajouter(recette, renommer(nouvellePalette(recette, `p-0000000${rang + 1}`, hexa), nom)),
  DEFAUT,
);
const [BLEU, VERT] = RECETTE.palettes;
const ANALYSES = { Bleu: analyserPalette(RECETTE, BLEU), Vert: analyserPalette(RECETTE, VERT) };
const FONDS = RECETTE.fonds;
/** Deux fonds personnalisés saturés, pour la nuance 50. */
const FONDS_PERSONNALISES = { light: '#FFF1C2', dark: '#1B2340' };
const NOMS_DE_MODE = { light: 'Light', dark: 'Dark' };
const NOMS_DE_PROFIL = { soft: 'Soft', vivid: 'Vivid' };

/* Écriture */

const esc = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rgb = (hexa) => lireHexa(hexa);
const encreSur = (hexa) => (contraste(rgb(hexa), [30, 30, 30]) >= contraste(rgb(hexa), [245, 245, 245]) ? '#1E1E1E' : '#F5F5F5');
const ratio = (a, b) => `${ecrireContraste(contraste(rgb(a), rgb(b)))}:1`;

function panneau(contenu, { largeur = 500 } = {}) {
  return `<div class="fp" style="width:${largeur}px"><div class="fp-barre"><span class="actif">Palettes</span><span class="inactif">Planches</span><span class="engrenage">⚙</span></div><div class="fp-corps">${contenu}</div></div>`;
}

const selecteur = (palette) => `<div class="fp-select"><div class="champ grand"><span class="pastille rond" style="background:${palette.reference}"></span><b class="coupe">${esc(palette.nom)}</b><span class="fleche">▾</span></div><div class="btn-f">Nouvelle palette</div><div class="bouton-icone grand">⋯</div></div>`;

/** Un badge de niveau, tel que `badgeDeNiveau` l'écrit. */
function badge(valeur, jugement) {
  const niveau = niveauEcrit(valeur, jugement);
  return `<span class="bdg${niveau.atteint ? '' : ' ko'}" title="${esc(niveau.etiquette)}">${esc(niveau.ecrit)}</span>`;
}

const bouton = (texte, genre = 'second', inactif = false) => `<span class="b4 ${genre}${inactif ? ' inactif' : ''}">${esc(texte)}</span>`;

/* X2.1 : création d'une palette */

function creation(disposition) {
  const champs = (selection) => `<div class="trois">
    <div><span class="libelle">Nom de la palette</span><div class="champ">Vert</div></div>
    <div><span class="libelle">Couleur de référence</span><div class="champ-ligne"><span class="pipette-f" style="background:#16A34A"></span><div class="champ">#16A34A</div></div>${selection ? '<span class="lien petit">Prendre la couleur sélectionnée dans Figma</span>' : ''}</div>
    <div><span class="libelle">Palette de base</span><div class="segment"><span class="on">Auto</span><span>Soft</span><span>Vivid</span></div></div></div>`;
  const creer = bouton('Créer la palette', 'principal');
  const selection = bouton('Utiliser la couleur sélectionnée dans Figma');
  const annuler = bouton('Annuler');
  const gestes = {
    A: `<div class="gestes-4">${creer}${selection}${annuler}</div>`,
    B: `<div class="gestes-4 ecartes"><span>${selection}</span><span class="droite-4">${annuler}${creer}</span></div>`,
    C: `<div class="gestes-4 a-droite">${annuler}${creer}</div>`,
  }[disposition];
  return panneau(`${selecteur(BLEU)}<div class="carte-f"><div class="carte-titre">Nouvelle palette</div>${champs(disposition === 'C')}${gestes}</div>`);
}

function sectionCreation() {
  return `<section class="bloc" id="x2-1">
  <div class="tete"><span class="sur">X2.1 · Création d’une palette</span><h2>Où poser Créer, la sélection Figma et Annuler</h2></div>
  <p>Le retour du round 4 demande de revoir la place des gestes de la carte de création. Aujourd’hui, les trois boutons se suivent sous les colonnes, le geste principal en premier, et « Utiliser la couleur sélectionnée dans Figma » crée la palette tout de suite, sans passer par le champ de la couleur. Cette carte n’a pas changé dans le code : elle attend ta décision.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${creation('A')}<p class="legende"><b>A · Aujourd’hui.</b> Trois boutons sur une ligne, de gauche à droite : Créer, la sélection Figma, Annuler. Annuler, le geste de sortie, finit la ligne après le plus long libellé.</p></div>
    <div>${creation('B')}<p class="legende"><b>B · Geste principal à droite.</b> Annuler et Créer à droite, dans l’ordre des dialogues de Figma ; la sélection seule à gauche, comme un autre chemin.</p></div>
    <div>${creation('C')}<p class="legende"><b>C · La sélection près du champ qu’elle remplit.</b> Un lien sous la couleur de référence prend la couleur du calque sélectionné et remplit le champ ; Créer reste le seul geste qui crée. Annuler et Créer à droite.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : C.</span> La sélection Figma est une autre façon de saisir la couleur : elle se range près du champ, et le designer relit la couleur avant de créer. B garde le comportement actuel avec un ordre plus lisible.</li>
    <li><b>Le comportement de la sélection, si C.</b> Elle remplit le champ sans créer. Une couleur Display P3 ramenée dans sRGB garde sa notice, sous le champ. <span class="reco">Recommandé.</span></li>
  </ol></div>
</section>`;
}

/* X2.2 : détail d'une nuance */

function lireLaNuance(nom, profil, numero, mode = 'light') {
  const analyse = ANALYSES[nom];
  const rang = analyse.grille.crans.indexOf(numero);
  const cran = analyse.rampes[profil][mode][rang];
  const mesure = mesurerCran(cran.couleur, rgb(FONDS[mode]), RECETTE.seuils);
  const emplois = emploisDuCran(analyse.grille.crans, rang);
  const reference = analyse.ancrage.profil === profil && analyse.ancrage.rangs[mode] === rang;
  const promesses = (emploi, decalage) => analyse.promesses.filter((p) => p.mode === mode && p.profil === profil
    && [p.paire.premier, p.paire.second].some((m) => 'emploi' in m && m.emploi === emploi && m.decalage === decalage));
  return { cran, mesure, emplois, reference, promesses, numero, profil, mode };
}

const NOMS_DES_ETATS = ['default', 'hover', 'active'];

function garantieEcrite(promesse, emploi, decalage) {
  const premier = promesse.paire.premier;
  const estPremier = 'emploi' in premier && premier.emploi === emploi && premier.decalage === decalage;
  const autre = estPremier ? promesse.paire.second : promesse.paire.premier;
  const designe = estPremier ? promesse.second : promesse.premier;
  const nom = 'fond' in autre ? 'fond' : designe.nature === 'cran' ? `${autre.emploi} ${designe.cran}` : autre.emploi;
  const sens = estPremier ? `sur ${nom}` : `${nom} dessus`;
  return `<span class="gar${promesse.verdict === 'tenue' ? '' : ' ko'}">${promesse.verdict === 'tenue' ? '✓' : '✗'} ${esc(sens)} : ${ecrireContraste(promesse.contraste)}:1 ${badge(promesse.contraste, jugementDuSeuil(promesse.paire.seuil))}</span>`;
}

function detail(nuance, disposition) {
  const { cran, mesure, emplois, reference, numero, profil, mode } = nuance;
  const fond = FONDS[mode];
  const entete = `<div class="d-tete"><span class="d-pastille" style="background:${cran.hexa}"></span><div><b>${NOMS_DE_PROFIL[profil]} · ${numero}</b><div class="mono">${cran.hexa}</div></div><span class="d-copier">Copier le code</span></div>${reference ? '<b>◆ Votre couleur de référence exacte</b>' : ''}`;
  const lignes = [['Fond du thème', mesure.fond], ['Blanc', mesure.blanc], ['Noir', mesure.noir]];
  const usages = emplois.length === 0
    ? '<div class="d-sous">Sans rôle</div>'
    : `<div class="d-sous">Sert à</div>${emplois.map(({ emploi, decalage }) => `<div class="d-usage"><span class="spec" style="background:${emploi === 'surface' || emploi === 'solid' ? cran.hexa : 'transparent'};border-color:${cran.hexa}"></span><div><code>${emploi}</code> · ${NOMS_DES_ETATS[decalage]}<div class="d-gars">${nuance.promesses(emploi, decalage).map((p) => garantieEcrite(p, emploi, decalage)).join('')}</div></div></div>`).join('')}`;
  const oklch = `L ${ecrireArrondi(cran.L, 3)} · C ${ecrireArrondi(cran.C, 3)} · H ${Math.round(cran.H) % 360}°`;
  if (disposition === 'A') {
    return `<div class="d4" style="background:${fond};color:${encreSur(fond)}">${entete}${usages}
      <div class="d-sous">Contrastes</div><div class="d-table">${lignes.map(([nom, valeur]) => `<span class="sec">${nom}</span><span>${ecrireContraste(valeur)}:1</span>${badge(valeur, 'texte')}`).join('')}</div>
      <div class="d-repli">▸ OKLCH</div></div>`;
  }
  return `<div class="d4" style="background:${fond};color:${encreSur(fond)}">${entete}
    <div class="d-ligne">${lignes.map(([nom, valeur]) => `<span><span class="sec">${nom}</span> ${ecrireContraste(valeur)} ${badge(valeur, 'texte')}</span>`).join('')}</div>${usages}
    <div class="sec mono petit">${oklch}</div></div>`;
}

function sectionDetail() {
  const avecRole = lireLaNuance('Bleu', 'vivid', 600);
  const sansRole = lireLaNuance('Bleu', 'vivid', 500);
  const carte = (nuance, disposition) => panneau(`<div class="carte-f"><div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div></div>${detail(nuance, disposition)}</div>`, { largeur: 500 });
  return `<section class="bloc" id="x2-2">
  <div class="tete"><span class="sur">X2.2 · Détail d’une nuance</span><h2>Une lecture courte : rôles, contrastes, niveaux</h2></div>
  <p>Le détail d’aujourd’hui écrivait deux fois le contraste avec le fond et repliait le reste sous « Mesures détaillées ». Les deux dispositions gardent l’en-tête, les rôles avec leurs garanties et les trois contrastes ; chaque contraste porte son badge de texte courant. Bleu, Vivid 600, porte des rôles ; Vivid 500 n’en porte aucun.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${carte(avecRole, 'A')}<p class="legende"><b>A · Table compacte, en place dans le code.</b> Rôles d’abord, puis une table de trois lignes, un niveau par ligne ; OKLCH replié.</p></div>
    <div>${carte(avecRole, 'B')}<p class="legende"><b>B · Contrastes sous l’en-tête.</b> Les trois contrastes sur une ligne, sous le code ; les rôles ensuite ; OKLCH en clair, en petit, sans repli.</p></div>
  </div><div class="scene-rangee">
    <div>${carte(sansRole, 'A')}<p class="legende"><b>A · Nuance sans rôle.</b> « Sans rôle » à la place de « Sert à », puis la même table.</p></div>
    <div>${carte(sansRole, 'B')}<p class="legende"><b>B · Nuance sans rôle.</b></p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : A</span>, qui répond d’abord à « à quoi sert cette nuance », puis donne les contrastes alignés. B se lit plus vite quand la nuance n’a pas de rôle, mais ses trois contrastes ne s’alignent pas : le regard cherche chaque ratio dans la ligne.</li>
    <li><b>Le libellé d’une nuance sans rôle.</b> « Sans rôle », en place ; « Aucun rôle dans le modèle » ; « Hors des rôles ». « Nuance libre » disparaît : « libre » désigne une palette sortie du modèle. <span class="reco">Recommandé : Sans rôle.</span></li>
    <li><b>OKLCH.</b> Replié (A) ou lisible en petit (B). <span class="reco">Recommandé : replié</span> : il sert à comparer deux nuances, pas à choisir un usage.</li>
  </ol></div>
</section>`;
}

/* X2.3 : niveaux AA et AAA */

function sectionBadges() {
  const exemples = [7.12, 5.34, 4.19, 3.2, 2.07];
  const formes = (forme) => exemples.map((valeur) => {
    const niveau = niveauEcrit(valeur, 'texte');
    const rendu = forme === 'A' ? badge(valeur, 'texte')
      : forme === 'B' ? `<span class="bdg-plein${niveau.atteint ? '' : ' ko'}">${niveau.atteint ? niveau.ecrit : 'AA'}</span>`
        : `<span class="bdg-texte${niveau.atteint ? '' : ' ko'}">${niveau.atteint ? `${niveau.ecrit} ✓` : 'AA ✗'}</span>`;
    return `<div class="bdg-ex"><span>${ecrireContraste(valeur)}:1</span>${rendu}<span class="sec petit">${esc(niveau.etiquette)}</span></div>`;
  }).join('');
  let minimum = 5;
  let entre = null;
  let nomTrouve = '';
  for (const essai of [5, 5.5, 6]) {
    const exigeante = { ...RECETTE, seuils: { ...RECETTE.seuils, texte: essai } };
    for (const palette of [BLEU, VERT]) {
      entre = entre ?? verifierPromesses(exigeante, palette).find((p) => p.paire.seuil === 'texte' && p.contraste >= 4.5 && p.contraste < essai) ?? null;
      if (entre && !nomTrouve) { nomTrouve = palette.nom; minimum = essai; }
    }
    if (entre) break;
  }
  const minimumEcrit = String(minimum).replace('.', ',');
  const conflit = entre
    ? `<div class="carte-f"><div class="carte-titre">${nomTrouve} · Garanties de contraste · minimum des textes réglé à ${minimumEcrit}:1</div><div class="g-ligne">${[entre.paire.premier, entre.paire.second].map((m) => ('fond' in m ? 'fond' : `<code>${m.emploi}</code>`)).join(' sur ')} · ${NOMS_DE_PROFIL[entre.profil]} · Thème ${NOMS_DE_MODE[entre.mode]}<span class="gar ko">✗ ${ecrireContraste(entre.contraste)} ${badge(entre.contraste, 'texte')}</span></div><p class="aide">État ${NOMS_DES_ETATS[Math.max(0, ...[entre.paire.premier, entre.paire.second].map((m) => ('decalage' in m ? m.decalage : 0)))]} : ${ecrireContraste(entre.contraste)}:1 pour un minimum de ${minimumEcrit}:1. La promesse suit le minimum ; le badge dit le niveau WCAG.</p></div>`
    : '<p class="aide">Aucune garantie de Bleu ni de Vert entre 4,5:1 et 6:1.</p>';
  const endroits = [
    ['Détail d’une nuance, table des contrastes', 'Texte courant', 'Fait'],
    ['Détail d’une nuance, garanties d’un rôle', 'Selon la paire : texte courant, ou élément graphique', 'Fait'],
    ['Carte des garanties, sous chaque spécimen', 'Selon la paire', 'Fait'],
    ['Planche, garanties d’un usage', 'Selon la paire, écrit « · AA » à la fin de la ligne', 'Fait'],
    ['Planche, cases des grilles', 'Texte courant, seulement quand AA est atteint : « 7,11 AAA »', 'Fait'],
    ['Panneau « Ajuster la référence », garanties après', 'Selon la paire', 'Fait'],
    ['Tête des Réglages communs', 'Aucun contraste n’y est écrit ; un badge dirait le niveau que le minimum des textes vise : « 4,5:1 · AA »', 'À décider'],
  ];
  return `<section class="bloc" id="x2-3">
  <div class="tete"><span class="sur">X2.3 · Niveaux AA et AAA</span><h2>Un badge à côté de chaque contraste jugé</h2></div>
  <p>Le badge suit les seuils fixes du WCAG (réponse Q4.2) : texte courant AA dès 4,5:1 et AAA dès 7:1, grand texte AA dès 3:1 et AAA dès 4,5:1, élément graphique AA dès 3:1 sans AAA. Son étiquette, lue par l’assistance technique, dit ce qu’il juge.</p>
  <div class="scene"><div class="scene-rangee">
    <div class="fp bdg-planche"><b>A · Cartouche, en place</b>${formes('A')}</div>
    <div class="fp bdg-planche"><b>B · Pastille pleine</b>${formes('B')}</div>
    <div class="fp bdg-planche"><b>C · Texte seul</b>${formes('C')}</div>
  </div></div>
  <p class="legende">A : un cartouche de la couleur du texte voisin, tireté sous AA. B : un fond vert ou rouge, qui fait porter au badge la couleur de sévérité. C : aucun cadre, le signe dit le résultat.</p>
  <div class="scene"><div class="scene-rangee"><div>${panneau(conflit)}<p class="legende">Minimum des textes réglé à ${minimumEcrit}:1${minimum === 5 ? '' : ', faute d’une garantie de Bleu ou de Vert entre 4,5:1 et 5:1'} : la promesse est manquée, le badge dit AA atteint. Les deux se lisent côte à côte sans se contredire, parce qu’ils ne jugent pas la même chose.</p></div></div></div>
  <div class="recap"><table><tr><th>Endroit</th><th>Ce que le badge juge</th><th>Code</th></tr>${endroits.map((ligne) => `<tr>${ligne.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La forme.</b> <span class="reco">Recommandé : A</span>, qui reste lisible sur le fond peint de l’aperçu et laisse la couleur de sévérité au ✗ de la promesse. B double le signal de couleur ; C se confond avec le ratio.</li>
    <li><b>Les endroits.</b> La table ci-dessus. <span class="reco">Recommandé : sans badge en tête des Réglages communs</span>, qui ne montre aucun contraste mesuré.</li>
    <li><b>Les grilles de la planche.</b> Le niveau suit le ratio dans le même calque, seulement quand AA est atteint. <span class="reco">Recommandé</span> : une case sous 4,5:1 garde son ratio seul, la graisse dit déjà qu’elle ne tient pas le texte courant.</li>
  </ol></div>
</section>`;
}

/* X2.4 : ligne du titre */

function titre(etat, { nom = 'Bleu', enCours = false, conflit = false } = {}) {
  const geste = gesteDeGeneration(etat);
  const libelle = enCours ? 'Génération…' : geste.libelle;
  const inactif = enCours || conflit || !geste.actif;
  const dessous = [];
  dessous.push('<span class="sec">Enregistré</span>');
  if (enCours) dessous.push(`<span class="sec">Génération de « ${esc(nom)} »…</span>`);
  if (!enCours && etat === 'introuvable') dessous.push('<span class="ko-t">Cadre introuvable</span>');
  if (!enCours && etat === 'illisible') dessous.push('<span class="ko-t">Lecture impossible</span>');
  if (!enCours && (etat === 'a-jour' || etat === 'perimee')) dessous.push('<span class="lien">Afficher dans Figma</span>');
  return `<div class="t4"><div class="t4-ligne"><span class="t4-nom">Palette ${esc(nom)}</span>${bouton(libelle, geste.actif && !enCours ? 'principal' : 'principal', inactif)}</div><div class="t4-dessous">${dessous.join('<span class="sec"> · </span>')}</div>${conflit ? '<p class="aide petit">Infobulle du bouton : Exportez vos modifications ou rechargez les palettes avant d’enregistrer, d’importer ou de générer.</p>' : ''}</div>`;
}

function sectionTitre() {
  const etats = [
    ['jamais-dessinee', 'Jamais générée'],
    ['perimee', 'Cadre changé depuis'],
    ['a-jour', 'Cadre à jour'],
    ['introuvable', 'Cadre introuvable'],
    ['illisible', 'Cadre illisible'],
  ];
  const vignette = (contenu, legende) => `<div>${panneau(`${selecteur(BLEU)}${contenu}<div class="carte-f"><div class="carte-titre">Configuration de la palette</div><div class="aide">…</div></div>`)}<p class="legende">${legende}</p></div>`;
  const variantes = etats.map(([etat, legende]) => vignette(titre(etat), `<b>${legende}.</b>`)).join('');
  const autres = [
    vignette(titre('jamais-dessinee', { enCours: true }), '<b>Pendant la génération.</b> Le bouton dit « Génération… », la progression s’écrit dessous.'),
    vignette(titre('perimee', { conflit: true }), '<b>Conflit d’enregistrement.</b> Le bouton est inactif, sa raison en infobulle ; le refus est en tête de l’onglet.'),
    vignette(titre('jamais-dessinee', { nom: 'Bleu institutionnel des parcours de souscription en ligne' }), '<b>Nom long à 500 px.</b> Le nom se coupe, le bouton garde son libellé.'),
  ].join('');
  const variante = `<div>${panneau(`${selecteur(BLEU)}<div class="t4"><div class="t4-ligne"><span class="t4-nom">Palette Bleu</span><span class="sec">À mettre à jour</span>${bouton('Générer sur Figma', 'principal')}</div><div class="t4-dessous"><span class="sec">Enregistré</span></div></div>`)}<p class="legende"><b>B · L’état entre le nom et le bouton.</b> Le bouton garde « Générer sur Figma » et l’état s’écrit à sa gauche : moins de libellés, mais le nom se coupe plus tôt.</p></div>`;
  return `<section class="bloc" id="x2-4">
  <div class="tete"><span class="sur">X2.4 · Ligne du titre</span><h2>« Palette [nom] » et le geste de génération sur une ligne</h2></div>
  <p>Disposition A, en place dans le code : le libellé du bouton dit l’état du cadre. « Actualiser sur Figma » quand le cadre a changé, « À jour sur Figma » inactif quand il est à jour (réponse Q4.5). Sous le titre, une ligne de rang 3 porte l’enregistrement, l’état d’un cadre introuvable ou illisible, la progression et « Afficher dans Figma », qui quittent la carte de génération.</p>
  <div class="scene"><div class="scene-rangee">${variantes}</div><div class="scene-rangee">${autres}${variante}</div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La disposition.</b> <span class="reco">Recommandé : A</span>, où le bouton dit à lui seul si la palette est dans Figma et à jour. B garde un libellé fixe au prix d’un objet de plus sur la ligne.</li>
    <li><b>Introuvable et illisible.</b> Le bouton garde « Générer sur Figma », l’état s’écrit en rouge dessous. <span class="reco">Recommandé.</span></li>
    <li><b>« Afficher dans Figma ».</b> Sous le titre, à côté de « Enregistré ». <span class="reco">Recommandé.</span> Autre choix : dans le menu « … » de la barre.</li>
  </ol></div>
</section>`;
}

/* X2.5 : interface de test */

function ecranE2(mode) {
  const couleurs = couleursDeLInterface(RECETTE, ANALYSES.Bleu, mode);
  const e = TEXTES_DE_L_INTERFACE_DE_TEST.exemple;
  const c = (emploi, etat = 0) => couleurs.emploi(emploi, etat);
  return `<div class="e2" style="background:${couleurs.fond};color:${couleurs.encre};border-color:${c('border-decorative')}">
    <div class="e2-tete"><b>${esc(e.titre)}</b><span class="e2-badge" style="background:${c('surface')};color:${c('text')}">${esc(e.badge)}</span></div>
    <div class="e2-onglets" style="border-color:${c('border-decorative')}">${e.onglets.map((o, i) => `<span style="${i === 0 ? `box-shadow:inset 0 -2px 0 ${c('solid')};font-weight:600` : `color:${couleurs.encreSeconde}`}">${esc(o)}</span>`).join('')}</div>
    <div class="e2-champ"><span>${esc(e.libelle)}</span><span class="e2-saisie" style="border-color:${c('border-control')};box-shadow:0 0 0 2px ${couleurs.fond},0 0 0 4px ${c('focus')}">${esc(e.valeur)}</span></div>
    <div class="e2-options"><span><i class="e2-case" style="background:${c('solid')};color:${couleurs.fond}">✓</i>${esc(e.caseACocher)}</span><span><i class="e2-inter" style="background:${c('solid')}"><b style="background:${couleurs.fond}"></b></i>${esc(e.interrupteur)}</span></div>
    <div class="e2-encart" style="background:${c('surface')};color:${c('text')};border-color:${c('border-decorative')}">ⓘ ${esc(e.encart)}</div>
    <div class="e2-actions"><span style="color:${c('text')}">${esc(e.boutons[0])}</span><span style="background:${c('surface')};color:${c('text')}">${esc(e.boutons[1])}</span><span style="background:${c('solid')};color:${couleurs.fond}">${esc(e.boutons[2])}</span></div>
  </div>`;
}

function sectionInterfaceDeTest() {
  const carte = (mode, ouverte) => `<div class="accordeon"><span class="chevron">${ouverte ? '⌄' : '›'}</span><b>Interface de test</b><span class="resume">Thème ${NOMS_DE_MODE[mode]} · Vivid</span></div>${ouverte ? `<div class="carte-f">${ecranE2(mode)}</div>` : ''}`;
  const avant = '<div class="accordeon"><span class="chevron">›</span><b>Garanties de contraste</b><span class="resume">Thème Light · Soft ✓ Vivid ✓</span></div>';
  const libre = `<div class="accordeon"><span class="chevron">⌄</span><b>Interface de test</b><span class="resume">Palette libre · 6 nuances</span></div><div class="carte-f"><p class="aide">Une palette libre n’a pas de rôles : l’écran de test ne sait pas quelle nuance poser où.</p></div>`;
  return `<section class="bloc" id="x2-5">
  <div class="tete"><span class="sur">X2.5 · Interface de test</span><h2>L’écran de réglages, dans l’onglet et plus sur la planche</h2></div>
  <p>La dernière carte de l’onglet montre l’écran E2 en HTML, peint de la palette ouverte dans le thème de l’aperçu et le profil porteur ; chaque couleur vient de la table des emplois. Dans le plugin, les contrôles se manipulent : survol et appui avancent d’une nuance.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${panneau(avant + carte('light', true))}<p class="legende"><b>Thème Light, dépliée.</b></p></div>
    <div>${panneau(avant + carte('dark', true))}<p class="legende"><b>Thème Dark, dépliée.</b> L’écran suit le thème choisi dans l’aperçu.</p></div>
  </div><div class="scene-rangee">
    <div>${panneau(avant + carte('light', false))}<p class="legende"><b>Repliée à l’ouverture, en place.</b> Son résumé dit le thème et le profil.</p></div>
    <div>${panneau(libre)}<p class="legende"><b>Palette libre, variante B.</b> Aujourd’hui la carte se retire, comme les garanties ; B la garde avec une phrase.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>Ouverte ou repliée à l’ouverture.</b> <span class="reco">Recommandé : repliée</span>, comme Intensités et Dérive, gardée ouverte pendant la session une fois dépliée.</li>
    <li><b>Palette libre.</b> <span class="reco">Recommandé : la carte se retire</span>, comme les garanties ; B explique pourquoi elle manque.</li>
  </ol></div>
</section>`;
}

/* X2.6 : nuance 50 */

function sectionNuance50() {
  const ligne = (nom, mode, fond) => {
    const analyse = ANALYSES[nom];
    const rampe = analyse.rampes[analyse.ancrage.profil][mode];
    const n = (numero) => rampe[analyse.grille.crans.indexOf(numero)].hexa;
    const encre = encreSur(fond);
    const option = (lettre, page, carte, soft, notes) => `<div class="n50" style="background:${page};color:${encreSur(page)}"><b>${lettre}</b><div class="n50-carte" style="background:${carte};border-color:${n(300)}"><span class="n50-bouton" style="background:${soft};color:${n(700)}">Soft</span></div><span class="petit">${notes}</span></div>`;
    const ecart = (a, b) => `ΔEok ${ecrireArrondi(distanceOk(rgb(a), rgb(b)), 3)} · ${ratio(a, b)}`;
    return `<div class="n50-rangee"><div class="n50-tete" style="color:var(--encre)"><b>${nom} · Thème ${NOMS_DE_MODE[mode]}</b><span class="sec">fond ${fond} · 50 ${n(50)} · 100 ${n(100)}</span></div>
      ${option('A', fond, n(50), n(50), `carte et bouton soft en surface 50 ; la carte sur le fond : ${ecart(n(50), fond)}`)}
      ${option('B', n(50), fond, n(100), `fond de page 50 ; la carte garde le fond du thème : ${ecart(fond, n(50))}`)}
      ${option('D', fond, n(50), n(100), `carte en fond discret 50 sur le fond : ${ecart(n(50), fond)} ; bouton soft 100 sur la carte : ${ecart(n(100), n(50))}`)}
      ${option('C', fond, fond, n(100), 'aujourd’hui : la 50 sans emploi, bouton soft en surface 100')}
    </div>`;
  };
  const rangees = [];
  for (const nom of ['Bleu', 'Vert']) for (const mode of ['light', 'dark']) rangees.push(ligne(nom, mode, FONDS[mode]));
  const personnalisees = ['light', 'dark'].map((mode) => ligne('Bleu', mode, FONDS_PERSONNALISES[mode])).join('');
  return `<section class="bloc" id="x2-6">
  <div class="tete"><span class="sur">X2.6 · Nuance 50</span><h2>Quel emploi pour la nuance 50</h2></div>
  <p>Ta réponse à Q4.1 : la 50 serait plutôt un fond de composant qu’un fond de page. Les options, sur une carte posée sur le fond du thème : <b>A</b>, <code>surface</code> passe à 50 (ses états à 100 et 200) ; <b>B</b>, un emploi nouveau à 50, le fond de page teinté ; <b>D</b>, un emploi nouveau à 50, fond discret d’un composant (bandeau, en-tête de carte, ligne alternée de tableau), le deuxième cran de Radix, <code>surface</code> restant à 100 ; <b>C</b>, aucun emploi, comme aujourd’hui. Chaque vignette mesure l’écart de la couleur de la carte avec ce qui l’entoure.</p>
  <div class="n50-grille">${rangees.join('')}</div>
  <p class="legende">Sur un fond personnalisé saturé, #FFF1C2 et #1B2340 :</p>
  <div class="n50-grille">${personnalisees}</div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>L’emploi de la 50.</b> En A comme en D, une carte en 50 se distingue à peine du fond par défaut : sa luminosité est celle du fond, seule sa teinte l’en sépare (ΔEok 0,012 pour Bleu en Light). Un fond de composant en 50 se lit donc bordé, ou posé sur un fond personnalisé. A déplace en plus <code>surface</code>, et un bouton soft y disparaît dans une carte en 50. D garde <code>surface</code> à 100 et ajoute un token. <span class="reco">Recommandé : D</span>, avec un nom à choisir, par exemple <code>surface-subtle</code>, si un fond de composant bordé te suffit ; sinon C.</li>
    <li><b>Si A.</b> Tous les tokens <code>surface</code> de la bibliothèque changent de valeur, et l’équipe du design system est prévenue (X6.2).</li>
  </ol></div>
</section>`;
}

/* La page */

const V3 = fs.readFileSync(path.join(ICI, 'generer-maquettes-v3.mjs'), 'utf8');
const STYLE_V3 = /const STYLE = `([\s\S]*?)`;\n/.exec(V3)[1];
const STYLE = `${STYLE_V3}
.b4 { height: 28px; padding: 0 10px; border-radius: 6px; display: inline-grid; place-items: center; font-weight: 600; white-space: nowrap; border: 1px solid var(--f-bord); }
.b4.principal { background: var(--f-marque); border-color: var(--f-marque); color: #fff; }
.b4.inactif { opacity: .5; }
.gestes-4 { display: flex; flex-wrap: wrap; gap: 8px; }
.gestes-4.ecartes { justify-content: space-between; }
.gestes-4.a-droite { justify-content: flex-end; }
.droite-4 { display: flex; gap: 8px; }
.lien.petit, .petit { font-size: 10px; line-height: 13px; }
.bdg { display: inline-block; margin-left: 4px; padding: 0 3px; border: 1px solid currentColor; border-radius: 3px; font: 600 9px/12px Inter, sans-serif; vertical-align: 1px; }
.bdg.ko { border-style: dashed; }
.bdg-plein { display: inline-block; padding: 0 4px; border-radius: 3px; font: 600 9px/13px Inter, sans-serif; background: #1F7A4A; color: #fff; }
.bdg-plein.ko { background: #B42318; }
.bdg-texte { font: 600 10px/13px Inter, sans-serif; }
.bdg-texte.ko { color: #FF9C8A; }
.bdg-planche { display: grid; gap: 8px; padding: 12px; width: 240px; }
.bdg-ex { display: grid; grid-template-columns: 44px 44px 1fr; gap: 6px; align-items: center; }
.sec { color: var(--f-texte-2); }
.mono { font-family: var(--mono); }
.d4 { border-radius: 6px; padding: 10px; display: grid; gap: 6px; }
.d4 .sec { color: inherit; opacity: .72; }
.d-tete { display: flex; gap: 8px; align-items: center; }
.d-pastille { width: 36px; height: 36px; border-radius: 6px; border: 1px solid rgba(128,128,128,.4); }
.d-copier { margin-left: auto; text-decoration: underline; }
.d-sous { font-size: 10px; font-weight: 600; text-transform: uppercase; opacity: .72; }
.d-usage { display: grid; grid-template-columns: 64px 1fr; gap: 8px; align-items: center; border-top: 1px solid rgba(128,128,128,.3); padding-top: 4px; }
.spec { height: 22px; border-radius: 4px; border: 1.5px solid; }
.d-gars { display: flex; flex-wrap: wrap; gap: 0 10px; }
.gar.ko { text-decoration: underline; }
.d-table { display: grid; grid-template-columns: 96px 56px auto; gap: 2px 8px; justify-items: start; }
.d-repli { opacity: .72; }
.d-ligne { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.g-ligne { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.g-ligne .gar { margin-left: auto; color: #FF9C8A; }
.t4 { display: grid; gap: 2px; }
.t4-ligne { display: flex; align-items: center; gap: 8px; }
.t4-nom { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; line-height: 24px; font-weight: 600; }
.t4-dessous { display: flex; gap: 4px; flex-wrap: wrap; }
.ko-t { color: #FF9C8A; }
.e2 { max-width: 420px; border: 1px solid; border-radius: 12px; padding: 18px; display: grid; gap: 12px; font-size: 11px; }
.e2-tete { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.e2-badge { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
.e2-onglets { display: flex; gap: 14px; border-bottom: 1px solid; }
.e2-onglets span { padding: 4px 0; }
.e2-champ { display: grid; gap: 4px; }
.e2-saisie { height: 30px; border: 1px solid; border-radius: 6px; display: flex; align-items: center; padding: 0 8px; }
.e2-options { display: flex; gap: 16px; }
.e2-options > span { display: flex; gap: 6px; align-items: center; }
.e2-case { width: 16px; height: 16px; border-radius: 4px; display: grid; place-items: center; font-style: normal; font-size: 10px; }
.e2-inter { width: 30px; height: 16px; border-radius: 8px; display: flex; justify-content: flex-end; padding: 2px; box-sizing: border-box; }
.e2-inter b { width: 12px; height: 12px; border-radius: 50%; }
.e2-encart { border: 1px solid; border-radius: 8px; padding: 8px 12px; }
.e2-actions { display: flex; justify-content: flex-end; gap: 8px; }
.e2-actions span { height: 30px; padding: 0 14px; border-radius: 6px; display: grid; place-items: center; font-weight: 600; }
.n50-grille { display: grid; gap: 12px; }
.n50-rangee { display: grid; grid-template-columns: 180px repeat(4, 1fr); gap: 8px; align-items: stretch; }
.n50-tete { display: grid; gap: 4px; align-content: center; font-size: 13px; }
.n50-tete .sec { color: var(--encre-2); font-family: var(--mono); font-size: 11px; }
.n50 { border-radius: 8px; padding: 10px; display: grid; gap: 6px; font: 11px/14px Inter, sans-serif; border: 1px solid var(--filet); }
.n50-carte { height: 52px; border-radius: 6px; display: grid; place-items: center; border: 1px solid; }
.n50-bouton { padding: 4px 12px; border-radius: 6px; font-weight: 600; }
`;

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquettes du quatrième tour</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap">
<style>
${STYLE}</style>
</head>
<body>
<main>
<section class="intro">
  <span class="sur">UCM Palettes · plan d’ergonomie, quatrième tour · lot X2</span>
  <h1>Maquettes à valider</h1>
  <p>Chaque maquette montre le panneau à 500 px, dans le thème sombre de Figma, avec les couleurs et les ratios que le moteur calcule pour #1E6FD9 et #16A34A. Les lots X3, X4 et X5 sont déjà codés : leur disposition en place est la proposition A, face à au moins une autre. X2.1 et X2.6 n’ont rien dans le code. Chaque maquette finit par ses questions et une recommandation ; « recommandé » vaut accord si la question reste sans réponse.</p>
  <p class="note">Page écrite par <code>generer-maquettes-v4.mjs</code>. Pour la régénérer : <code>node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v4.mjs"</code>.</p>
  <nav class="sommaire"><a href="#x2-1">X2.1 Création</a><a href="#x2-2">X2.2 Détail d’une nuance</a><a href="#x2-3">X2.3 Niveaux AA et AAA</a><a href="#x2-4">X2.4 Ligne du titre</a><a href="#x2-5">X2.5 Interface de test</a><a href="#x2-6">X2.6 Nuance 50</a></nav>
</section>
${sectionCreation()}
${sectionDetail()}
${sectionBadges()}
${sectionTitre()}
${sectionInterfaceDeTest()}
${sectionNuance50()}
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(ICI, 'MAQUETTES-RECETTE-V4.html'), page);
process.stdout.write(`MAQUETTES-RECETTE-V4.html : ${page.length} caractères\n`);
