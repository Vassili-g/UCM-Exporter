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
  rgb8VersOklch,
  lireHexa,
  mesurerCran,
  recetteParDefaut,
  verifierPromesses,
} from '../../../../packages/couleur/src/index.ts';
import { changementAuPasVoisin, garantiesComparees, manqueesParProfil, propositionAuPas } from '../../../../packages/plugin-palettes/src/ajustementDeLaReference.ts';
import { analyserPalette } from '../../../../packages/plugin-palettes/src/analyse.ts';
import { ajouter, appliquerLAjustement, nouvellePalette, renommer } from '../../../../packages/plugin-palettes/src/edition.ts';
import { couleursDeLInterface } from '../../../../packages/plugin-palettes/src/ui/interfaceDeTest.ts';
import { TEXTES_DE_L_INTERFACE_DE_TEST, annonceDuPas, gesteDeGeneration, jugementDuSeuil, niveauEcrit } from '../../../../packages/plugin-palettes/src/ui/textes.ts';

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

/* Second passage, après les retours du mainteneur sur le premier */

/** La pastille pleine B, en teintes adoucies, telle que le socle la peint. */
function pastille(valeur, jugement) {
  const niveau = niveauEcrit(valeur, jugement);
  return `<span class="pst${niveau.atteint ? '' : ' ko'}" title="${esc(niveau.etiquette)}">${esc(niveau.ecrit)}</span>`;
}

/** La barre et le titre tels que codés après X1.10 : « Nouvelle palette » principal, filet, génération secondaire. */
function teteCodee(palette, etat = 'jamais-dessinee', { creation = '' } = {}) {
  const geste = gesteDeGeneration(etat);
  return `<div class="zone-choix"><div class="fp-select"><div class="champ grand"><span class="pastille rond" style="background:${palette.reference}"></span><b class="coupe">${esc(palette.nom)}</b><span class="fleche">▾</span></div>${bouton('Nouvelle palette', 'principal')}<div class="bouton-icone grand">⋯</div></div>${creation}</div>
    <div class="t4"><div class="t4-ligne"><span class="t4-nom">Palette ${esc(palette.nom)}</span>${bouton(geste.libelle, 'second', !geste.actif)}</div><div class="t4-dessous"><span class="sec">Enregistré</span>${etat === 'a-jour' || etat === 'perimee' ? '<span class="sec"> · </span><span class="lien">Afficher dans Figma</span>' : ''}</div></div>`;
}

/* X2.7 : création, configuration et ajustement */

const segment = (options, actif) => `<div class="segment">${options.map((o) => `<span class="${o === actif ? 'on' : ''}">${o}</span>`).join('')}</div>`;
const PUCES = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000, 1050];

function colonneModele(modele) {
  return `<div><span class="libelle">Modèle</span>${segment(['Standard', 'Libre'], modele)}${modele === 'Standard'
    ? `<span class="libelle">Palette de base</span>${segment(['Auto', 'Soft', 'Vivid'], 'Auto')}`
    : '<span class="aide">Sans rôles ni garanties</span>'}</div>`;
}

function carteDeCreation(modele, disposition) {
  const puces = modele === 'Libre'
    ? `<div class="nuances-libres"><span class="libelle">Nuances · 6 sur 13 au plus</span><div class="puces">${PUCES.map((n) => `<span class="puce${[100, 200, 400, 600, 800, 900].includes(n) ? ' on' : ''}">${n}</span>`).join('')}</div></div>`
    : '';
  const gestes = disposition === 'droite'
    ? `<div class="gestes-4 a-droite">${bouton('Annuler')}${bouton('Créer la palette', 'principal')}</div>`
    : `<div class="gestes-4">${bouton('Créer la palette', 'principal')}${bouton('Annuler')}</div>`;
  return `<div class="carte-f"><div class="carte-titre">Nouvelle palette</div><div class="trois">
    <div><span class="libelle">Nom de la palette</span><div class="champ">Vert</div></div>
    <div><span class="libelle">Couleur de référence</span><div class="champ-ligne"><span class="pipette-f" style="background:#16A34A"></span><div class="champ">#16A34A</div></div></div>
    ${colonneModele(modele)}</div>${puces}${gestes}</div>`;
}

/** La colonne de la couleur de référence de « Configuration de la palette », avec la trace d'un ajustement. */
function colonneReference(reference, { ajustee = false, ouverte = false } = {}) {
  return `<div><span class="libelle">Couleur de référence</span><div class="champ-ligne"><span class="pipette-f${ouverte ? ' ouverte' : ''}" style="background:${reference}"></span><div class="champ">${reference}</div></div>
    <span class="lien petit">Ajuster la référence</span>${ajustee ? '<span class="aide petit">Ajustée depuis #16A34A · <span class="lien">Revenir à l’originale</span></span>' : ''}</div>`;
}

/** Vert ajusté d'un pas plus sombre, lu par les fonctions du panneau. */
function ajustementDonnees() {
  const proposition = propositionAuPas(RECETTE, VERT, -1);
  const apres = appliquerLAjustement(RECETTE, VERT, proposition);
  const avant = manqueesParProfil(RECETTE, VERT);
  const ensuite = manqueesParProfil(RECETTE, apres);
  const comparee = garantiesComparees(RECETTE, VERT, apres)[0];
  return { originale: VERT.reference, proposition, avant, ensuite, comparee };
}
/** Le résultat d'un profil, avant puis après la proposition. */
const resultat = (manquees) => (manquees ? `✗ ${manquees}` : '✓');
const bilan = (profil, { avant, ensuite }) => (avant[profil] === ensuite[profil]
  ? `${NOMS_DE_PROFIL[profil]} ${resultat(avant[profil])} inchangé`
  : `${NOMS_DE_PROFIL[profil]} ${resultat(avant[profil])} → ${resultat(ensuite[profil])}`);
/** La première garantie qui change : l'association, le thème, les deux contrastes et la pastille d'après. */
function ligneComparee({ comparee }) {
  const { avant, apres } = comparee;
  const second = 'emploi' in avant.paire.second ? avant.paire.second.emploi : 'fond';
  return `<span class="sec">${avant.paire.premier.emploi} sur ${second}, ${NOMS_DE_MODE[avant.mode]}</span><span class="mono">${ecrireContraste(avant.contraste)} → ${ecrireContraste(apres.contraste)}</span>${pastille(apres.contraste, jugementDuSeuil(apres.paire.seuil))}`;
}

/** R1 : le panneau en place sous les colonnes, resserré. */
function ajustementR1() {
  const donnees = ajustementDonnees();
  const { originale, proposition } = donnees;
  return `<div class="carte-f"><div class="carte-titre">Configuration de la palette</div><div class="trois"><div><span class="libelle">Nom de la palette</span><div class="champ">Vert</div></div>${colonneReference(originale)}${colonneModele('Standard')}</div>
    <div class="aj-bloc"><div class="aj-ligne"><b>Ajuster la référence</b><span class="sec">Vivid · nuance 600</span></div>
      <div class="aj-ligne"><span class="aj-duo"><i style="background:${originale}"></i><i style="background:${proposition}"></i></span><span class="mono">${originale} → ${proposition}</span>${bouton('−')}<span class="mono">L ${ecrireArrondi(rgb8VersOklch(rgb(proposition)).L, 3)}</span>${bouton('+')}</div>
      <div class="aj-ligne"><span class="sec">Nuance visée : 600 dans les deux thèmes</span></div>
      <div class="aj-ligne"><span>Garanties : ${bilan('vivid', donnees)} · ${bilan('soft', donnees)}</span>${ligneComparee(donnees)}</div>
      <div class="gestes-4 a-droite">${bouton('Annuler')}${bouton('Appliquer', 'principal')}</div></div></div>`;
}

/** R2 et R3 : une fenêtre ancrée sous la couleur de référence, par-dessus le contenu. */
function fenetreDAjustement(avecOnglets) {
  const donnees = ajustementDonnees();
  const { originale, proposition } = donnees;
  const graduation = [0.55, 0.58, 0.61, 0.64, 0.67, 0.7].map((l, i) => `<span class="aj-cran${i === 2 ? ' ici' : ''}" style="left:${i * 20}%"></span>`).join('');
  return `<div class="aj-fenetre">${avecOnglets ? `<div class="segment petit"><span>Choisir</span><span class="on">Ajuster</span></div>` : '<b>Ajuster la référence</b>'}
    <div class="aj-grands"><div><i style="background:${originale}"></i><span class="sec">Originale</span><span class="mono">${originale}</span></div><div><i style="background:${proposition}"></i><span class="sec">Proposition</span><span class="mono">${proposition}</span></div></div>
    <div class="aj-reglette"><span class="sec">Luminosité</span>${bouton('−')}<div class="aj-piste">${graduation}<b style="left:40%"></b></div>${bouton('+')}</div>
    <p class="sec petit">Un trait marque le passage d’une nuance à la suivante. ${[-1, 1].map((sens) => {
      const changement = changementAuPasVoisin(RECETTE, VERT, -1, sens);
      return changement && changement.length ? annonceDuPas(sens, changement) : '';
    }).join(' ')}</p>
    <div class="aj-gar"><span>Garanties : ${bilan('vivid', donnees)} · ${bilan('soft', donnees)}</span></div>
    <div class="aj-gar">${ligneComparee(donnees)}</div>
    <div class="gestes-4 a-droite">${bouton('Annuler')}${bouton('Appliquer', 'principal')}</div></div>`;
}

function ajustementFenetre(avecOnglets) {
  return `<div class="carte-f"><div class="carte-titre">Configuration de la palette</div><div class="trois"><div><span class="libelle">Nom de la palette</span><div class="champ">Vert</div></div>${colonneReference('#0DA047', { ajustee: true, ouverte: true })}${colonneModele('Standard')}</div>
    <div class="ancre-aj">${fenetreDAjustement(avecOnglets)}</div><div class="aj-place"></div></div>`;
}

function sectionCreationBis() {
  return `<section class="bloc" id="x2-7">
  <div class="tete"><span class="sur">X2.7 · Création et configuration, second passage</span><h2>Le Modèle dès la création, et « Ajuster la référence » redessiné</h2></div>
  <p>La sélection Figma est retirée du plugin (X1.8). La carte de création reprend les trois colonnes de « Configuration de la palette » : Nom, Couleur de référence, Modèle, et la palette de base sous le Modèle. En Libre, les puces des numéros viennent sous les colonnes, comme dans la configuration.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${panneau(teteCodee(BLEU, 'a-jour', { creation: carteDeCreation('Standard', 'droite') }))}<p class="legende"><b>Création, Standard, gestes à droite.</b> Annuler puis Créer, au bord droit : l’ordre des dialogues de Figma.</p></div>
    <div>${panneau(teteCodee(BLEU, 'a-jour', { creation: carteDeCreation('Libre', 'droite') }))}<p class="legende"><b>Création, Libre.</b> La palette de base laisse la place à « Sans rôles ni garanties », et les puces choisissent les numéros avant de créer.</p></div>
    <div>${panneau(teteCodee(BLEU, 'a-jour', { creation: carteDeCreation('Standard', 'gauche') }))}<p class="legende"><b>Variante : gestes à gauche.</b> Créer d’abord, comme aujourd’hui.</p></div>
  </div></div>
  <p>« Ajuster la référence » : aujourd’hui un bloc de huit lignes s’ouvre sous les colonnes et pousse l’aperçu. Trois refontes, sur Vert (#16A34A), après un pas plus sombre :</p>
  <div class="scene"><div class="scene-rangee">
    <div>${panneau(teteCodee(VERT, 'perimee') + ajustementR1())}<p class="legende"><b>R1 · Bloc resserré en place.</b> Quatre lignes : les deux pastilles et les codes, le pas ; la nuance visée ; le bilan des garanties avec une ligne d’exemple ; les gestes.</p></div>
    <div>${panneau(teteCodee(VERT, 'perimee') + ajustementFenetre(false))}<p class="legende"><b>R2 · Fenêtre ancrée.</b> Comme le sélecteur de couleur : 260 px sous la couleur de référence, par-dessus l’aperçu, sans le pousser. Grandes pastilles côte à côte ; une piste de luminosité qui marque, d’un trait, le passage d’une nuance à la suivante.</p></div>
    <div>${panneau(teteCodee(VERT, 'perimee') + ajustementFenetre(true))}<p class="legende"><b>R3 · Onglet du sélecteur de couleur.</b> La même fenêtre, dans le sélecteur de la couleur de référence : « Choisir » pour une autre couleur, « Ajuster » pour la luminosité seule. « Ajuster la référence » ouvre le sélecteur sur cet onglet.</p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>Les gestes de la création.</b> <span class="reco">Recommandé : à droite</span>, Annuler puis Créer.</li>
    <li><b>Le Modèle dès la création.</b> Standard par défaut ; Libre montre les puces avant de créer. <span class="reco">Recommandé.</span></li>
    <li><b>« Ajuster la référence ».</b> <span class="reco">Recommandé : R3</span>, un seul point d’entrée pour la couleur de référence, qui ne pousse pas le contenu. R2 garde une fenêtre à part ; R1 reste dans le flux, plus court qu’aujourd’hui.</li>
    <li><b>La piste de luminosité (R2, R3).</b> Elle remplace l’annonce écrite du changement de nuance : un trait par frontière, et la phrase seulement quand le pas suivant la franchit. <span class="reco">Recommandé.</span></li>
  </ol></div>
</section>`;
}

/* X2.8 : détail d'une nuance, hiérarchie */

function detailHierarchise(nuance, variante) {
  const { cran, mesure, emplois, reference, numero, profil } = nuance;
  const fond = FONDS[nuance.mode];
  const encre = encreSur(fond);
  const lignes = [['Fond du thème', mesure.fond], ['Blanc', mesure.blanc], ['Noir', mesure.noir]];
  const garantie = (p, emploi, decalage) => {
    const premier = p.paire.premier;
    const estPremier = 'emploi' in premier && premier.emploi === emploi && premier.decalage === decalage;
    const autre = estPremier ? p.paire.second : p.paire.premier;
    const designe = estPremier ? p.second : p.premier;
    const nom = 'fond' in autre ? 'fond' : designe.nature === 'cran' ? `${autre.emploi} ${designe.cran}` : autre.emploi;
    return `<span class="gar">${p.verdict === 'tenue' ? '✓' : '✗'} ${estPremier ? `sur ${nom}` : `${nom} dessus`} ${ecrireContraste(p.contraste)}:1 ${pastille(p.contraste, jugementDuSeuil(p.paire.seuil))}</span>`;
  };
  const roles = emplois.length === 0
    ? '<p class="h-vide">Aucun rôle du modèle ne vise cette nuance.</p>'
    : emplois.map(({ emploi, decalage }) => `<div class="h-role"><span class="spec" style="background:${emploi === 'surface' || emploi === 'solid' ? cran.hexa : 'transparent'};border-color:${cran.hexa}"></span><div><b><code>${emploi}</code> · ${NOMS_DES_ETATS[decalage]}</b><div class="d-gars">${nuance.promesses(emploi, decalage).map((p) => garantie(p, emploi, decalage)).join('')}</div></div></div>`).join('');
  const table = `<div class="d-table">${lignes.map(([nom, valeur]) => `<span class="sec">${nom}</span><span>${ecrireContraste(valeur)}:1</span>${pastille(valeur, 'texte')}`).join('')}</div>`;
  const entete = `<div class="d-tete"><span class="d-pastille grand" style="background:${cran.hexa}"></span><div><b class="h-titre">${NOMS_DE_PROFIL[profil]} · ${numero}</b><div class="mono">${cran.hexa}</div>${reference ? '<div class="h-ref">◆ Votre couleur de référence exacte</div>' : ''}</div><span class="d-copier">Copier le code</span></div>`;
  const titreRoles = emplois.length === 0 ? 'Sans rôle' : 'Sert à';
  if (variante === 'H1') {
    return `<div class="d4 h1" style="background:${fond};color:${encre}">${entete}
      <div class="h-groupe"><div class="h-titre-groupe">${titreRoles}</div>${roles}</div>
      <div class="h-groupe"><div class="h-titre-groupe">Contrastes de la nuance</div>${table}</div>
      <div class="d-repli">▸ OKLCH</div></div>`;
  }
  return `<div class="d4 h2" style="background:${fond};color:${encre}">${entete}
    <div class="h-colonnes"><div class="h-groupe"><div class="h-titre-groupe">${titreRoles}</div>${roles}</div>
    <div class="h-groupe"><div class="h-titre-groupe">Contrastes</div>${table}<div class="d-repli">▸ OKLCH</div></div></div></div>`;
}

function sectionDetailBis() {
  const avecRole = lireLaNuance('Bleu', 'vivid', 600);
  const sansRole = lireLaNuance('Bleu', 'vivid', 500);
  const carte = (nuance, variante) => panneau(`<div class="carte-f"><div class="tete-apercu"><div class="onglets-theme"><span class="on">Thème Light</span><span>Thème Dark</span></div></div>${detailHierarchise(nuance, variante)}</div>`);
  return `<section class="bloc" id="x2-8">
  <div class="tete"><span class="sur">X2.8 · Détail d’une nuance, second passage</span><h2>Trois rangs lisibles, et les contrastes à part des rôles</h2></div>
  <p>La disposition A reste. Trois rangs : l’en-tête (grande pastille, numéro en titre, code), puis chaque groupe dans son propre encadré, titre de groupe en capitales discrètes, puis OKLCH replié. « Contrastes de la nuance » ne suit plus la dernière ligne de rôle : son encadré commence après un espace de 12 px.</p>
  <div class="scene"><div class="scene-rangee">
    <div>${carte(avecRole, 'H1')}<p class="legende"><b>H1 · Groupes encadrés, l’un sous l’autre.</b></p></div>
    <div>${carte(avecRole, 'H2')}<p class="legende"><b>H2 · Deux colonnes.</b> Les rôles à gauche, les contrastes à droite : le détail gagne en largeur ce qu’il perd en hauteur.</p></div>
  </div><div class="scene-rangee">
    <div>${carte(sansRole, 'H1')}<p class="legende"><b>H1 · Sans rôle.</b> Le groupe dit qu’aucun rôle ne vise la nuance.</p></div>
    <div>${carte(sansRole, 'H2')}<p class="legende"><b>H2 · Sans rôle.</b></p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La hiérarchie.</b> <span class="reco">Recommandé : H1</span>, qui garde la lecture de haut en bas et sépare nettement les deux groupes. H2 met les contrastes à côté des rôles, mais une garantie longue passe à la ligne dans une colonne de 200 px.</li>
    <li><b>Le titre du groupe des contrastes.</b> « Contrastes de la nuance », pour le distinguer des garanties des rôles. <span class="reco">Recommandé.</span></li>
  </ol></div>
</section>`;
}

/* X2.9 : badges */

function sectionBadgesBis() {
  const valeurs = [7.12, 5.34, 4.19, 2.07];
  const surFond = (mode) => `<div class="d4" style="background:${FONDS[mode]};color:${encreSur(FONDS[mode])}"><div class="d-table">${valeurs.map((v) => `<span class="sec">Texte courant</span><span>${ecrireContraste(v)}:1</span>${pastille(v, 'texte')}`).join('')}</div></div>`;
  return `<section class="bloc" id="x2-9">
  <div class="tete"><span class="sur">X2.9 · Badges, second passage</span><h2>La pastille pleine, en teintes adoucies</h2></div>
  <p>Codée : vert pâle et texte vert sombre quand le niveau est atteint, rose pâle et texte rouge sombre sinon, 7,7:1 et 6,9:1 entre le texte et la pastille. La pastille porte son propre fond : elle se lit pareil sur le fond Light, le fond Dark et le panneau de Figma. Le « ✗ » d’un niveau manqué reste, pour qui ne distingue pas le vert du rouge.</p>
  <div class="scene"><div class="scene-rangee"><div>${panneau(surFond('light'))}<p class="legende">Sur le fond Light de l’aperçu.</p></div><div>${panneau(surFond('dark'))}<p class="legende">Sur le fond Dark.</p></div></div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>Les teintes.</b> <span class="reco">Recommandé : celles-ci.</span> Plus pâles encore, la pastille se détacherait mal du fond Light.</li>
    <li><b>Le « ✗ ».</b> <span class="reco">Recommandé : le garder</span> (critère WCAG 1.4.1, l’information ne passe pas par la couleur seule).</li>
  </ol></div>
</section>`;
}

/* X2.10 : ligne du titre */

function sectionTitreBis() {
  const vignette = (etat, legende, creation = '') => `<div>${panneau(`${teteCodee(BLEU, etat, { creation })}<div class="carte-f"><div class="carte-titre">Configuration de la palette</div><div class="aide">…</div></div>`)}<p class="legende">${legende}</p></div>`;
  return `<section class="bloc" id="x2-10">
  <div class="tete"><span class="sur">X2.10 · Ligne du titre, second passage</span><h2>« Nouvelle palette » en action principale, un filet sous la zone de choix</h2></div>
  <p>Codé : « Nouvelle palette » prend le bleu de l’action principale, le bouton de génération passe en secondaire, et un filet sépare la barre du sélecteur, et la carte de création quand elle est ouverte, de la palette ouverte.</p>
  <div class="scene"><div class="scene-rangee">
    ${vignette('jamais-dessinee', '<b>Jamais générée.</b>')}
    ${vignette('perimee', '<b>Cadre changé.</b>')}
    ${vignette('a-jour', '<b>Création ouverte.</b> La carte de création reste au-dessus du filet.', carteDeCreation('Standard', 'droite'))}
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>Le filet.</b> Un trait de la bordure du socle, 12 px sous la barre. <span class="reco">Recommandé.</span> Autre choix : un fond différent pour la zone de choix.</li>
  </ol></div>
</section>`;
}

/* X2.11 : interface de test, refonte */

function ecranRadix(mode) {
  const c = couleursDeLInterface(RECETTE, ANALYSES.Bleu, mode);
  const e = (emploi, etat = 0) => c.emploi(emploi, etat);
  const bord = e('border-decorative');
  return `<div class="rx" style="background:${c.fond};color:${c.encre};border-color:${bord}">
    <aside class="rx-nav" style="border-color:${bord}"><b>Studio Nord</b><span style="background:${e('surface')};color:${e('text')}">Paramètres</span><span>Membres</span><span>Facturation</span><span>Intégrations</span></aside>
    <div class="rx-corps">
      <div class="rx-tete"><div><b class="rx-titre">Membres de l’équipe</b><span class="rx-sous" style="color:${c.encreSeconde}">4 membres · 1 invitation en attente</span></div><span class="rx-btn" style="background:${e('solid')};color:${c.fond}">Inviter</span></div>
      <div class="rx-callout" style="background:${e('surface')};color:${e('text')}">ⓘ L’invitation de camille@nord.studio expire dans 2 jours. <u>Renvoyer</u></div>
      <div class="rx-table" style="border-color:${bord}">
        ${[['Alex Martin', 'Administrateur', true], ['Camille Roy', 'Invitée', false], ['Inès Diallo', 'Membre', false]].map(([nom, role, admin], i) => `<div class="rx-ligne" style="border-color:${bord};${i === 1 ? `background:${e('surface')}` : ''}"><span class="rx-avatar" style="background:${e('surface', 1)};color:${e('text')}">${nom[0]}</span><span>${nom}</span><span class="rx-badge" style="${admin ? `background:${e('solid')};color:${c.fond}` : `background:${e('surface')};color:${e('text')}`}">${role}</span></div>`).join('')}
      </div>
      <div class="rx-form"><span>Rôle par défaut</span><span class="rx-champ" style="border-color:${e('border-control')};box-shadow:0 0 0 2px ${c.fond},0 0 0 4px ${e('focus')}">Membre ▾</span></div>
      <div class="rx-options"><span><i class="rx-case" style="background:${e('solid')};color:${c.fond}">✓</i>Notifier par e-mail</span><span><i class="rx-inter" style="background:${e('solid')}"><b style="background:${c.fond}"></b></i>Accès invité</span></div>
      <div class="rx-actions"><span style="color:${e('text')}">Annuler</span><span style="background:${e('surface')};color:${e('text')}">Brouillon</span><span style="background:${e('solid')};color:${c.fond}">Enregistrer</span></div>
    </div></div>`;
}

function etatsParComposant(mode) {
  const c = couleursDeLInterface(RECETTE, ANALYSES.Bleu, mode);
  const e = (emploi, etat = 0) => c.emploi(emploi, etat);
  const colonnes = ['default', 'hover', 'active'];
  const rangees = [
    ['Bouton plein', (i) => `<span class="rx-btn" style="background:${e('solid', i)};color:${c.fond}">Action</span>`],
    ['Bouton soft', (i) => `<span class="rx-btn" style="background:${e('surface', i)};color:${e('text', i)}">Action</span>`],
    ['Bouton contour', (i) => `<span class="rx-btn" style="border:1px solid ${e('border-control', i)};color:${e('text', i)}">Action</span>`],
    ['Bouton sans fond', (i) => `<span class="rx-btn" style="${i ? `background:${e('surface', i - 1)};` : ''}color:${e('text', i)}">Action</span>`],
    ['Champ', (i) => `<span class="rx-champ petit" style="border-color:${e('border-control', i)}">Texte</span>`],
    ['Lien', (i) => `<span style="color:${e('text', i)};text-decoration:underline">Lien coloré</span>`],
    ['Badge', (i) => (i === 0 ? `<span class="rx-badge" style="background:${e('surface')};color:${e('text')}">Nouveau</span>` : '<span class="sec">—</span>')],
  ];
  return `<div class="rx-etats" style="background:${c.fond};color:${c.encre}"><span></span>${colonnes.map((col) => `<span class="rx-col" style="color:${c.encreSeconde}">${col}</span>`).join('')}<span class="rx-col" style="color:${c.encreSeconde}">focus</span>
    ${rangees.map(([nom, rendu]) => `<span class="rx-nom">${nom}</span>${[0, 1, 2].map((i) => `<span>${rendu(i)}</span>`).join('')}<span>${nom === 'Champ' || nom.startsWith('Bouton') ? `<span class="rx-focus" style="box-shadow:0 0 0 2px ${c.fond},0 0 0 4px ${e('focus')}">${rendu(0)}</span>` : '<span class="sec">—</span>'}</span>`).join('')}
  </div>`;
}

function sectionInterfaceBis() {
  const carte = (contenu, resume, bascule = '') => panneau(`<div class="accordeon"><span class="chevron">⌄</span><b>Interface de test</b><span class="resume">${resume}</span></div><div class="carte-f">${bascule}${contenu}</div>`, { largeur: 500 });
  const bascule = (actif) => `<div class="segment petit rx-bascule">${['Écran', 'États'].map((o) => `<span class="${o === actif ? 'on' : ''}">${o}</span>`).join('')}</div>`;
  return `<section class="bloc" id="x2-11">
  <div class="tete"><span class="sur">X2.11 · Interface de test, refonte</span><h2>Essayer la palette sur un écran de Radix Themes, et voir chaque état</h2></div>
  <p>Ta demande du troisième tour : d’autres interfaces d’exemple, sur le modèle de Radix. L’écran de réglages actuel montre chaque emploi une fois, et ne montre les états qu’au survol. Trois refontes, peintes de Bleu par la table des emplois :</p>
  <div class="scene"><div class="scene-rangee">
    <div>${carte(ecranRadix('light'), 'Thème Light · Vivid')}<p class="legende"><b>A · Écran composé.</b> Une page « Membres de l’équipe » : navigation latérale avec l’entrée active en surface, encart, tableau avec une ligne sélectionnée, badges soft et plein, champ au focus, case, interrupteur, trois boutons.</p></div>
    <div>${carte(etatsParComposant('light'), 'Thème Light · Vivid')}<p class="legende"><b>B · Composants par état.</b> Le modèle E1 : une rangée par composant, une colonne par état, focus compris. Tous les états se lisent sans survol.</p></div>
  </div><div class="scene-rangee">
    <div>${carte(ecranRadix('dark'), 'Thème Dark · Vivid', bascule('Écran'))}<p class="legende"><b>C · Les deux, par une bascule.</b> « Écran » montre A, « États » montre B ; la carte garde le choix pendant la session. Ici en Thème Dark.</p></div>
    <div>${carte(etatsParComposant('dark'), 'Thème Dark · Vivid', bascule('États'))}<p class="legende"><b>C · États, Thème Dark.</b></p></div>
  </div></div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>La refonte.</b> <span class="reco">Recommandé : C</span>, l’écran pour juger l’ensemble, les états pour vérifier chaque token. A seul cache les états, B seul ne montre pas une interface réelle.</li>
    <li><b>Les composants de B.</b> Boutons plein, soft, contour et sans fond ; champ ; lien ; badge. <span class="reco">Recommandé.</span> Autres possibles : case, interrupteur, onglets.</li>
    <li><b>L’écran de A.</b> Une page d’équipe, plus riche que l’écran de réglages actuel. <span class="reco">Recommandé.</span> Autre choix : garder l’écran de réglages actuel, enrichi du tableau.</li>
  </ol></div>
</section>`;
}

/* X2.12 : nuance 50, A et D */

function sectionNuance50Bis() {
  const scene = (nom, mode, option) => {
    const analyse = ANALYSES[nom];
    const rampe = analyse.rampes[analyse.ancrage.profil][mode];
    const n = (numero) => rampe[analyse.grille.crans.indexOf(numero)].hexa;
    const fond = FONDS[mode];
    const surface = option === 'A' ? [n(50), n(100), n(200)] : [n(100), n(200), n(300)];
    const carte = option === 'A' ? surface[0] : n(50);
    const mesure = (a, b) => `ΔEok ${ecrireArrondi(distanceOk(rgb(a), rgb(b)), 3)}`;
    return `<div class="n50b" style="background:${fond};color:${encreSur(fond)}">
      <div class="n50b-ligne"><span class="n50-bouton" style="background:${surface[0]};color:${n(700)}">Bouton soft</span><span class="n50-bouton" style="background:${surface[1]};color:${n(800)}">au survol</span><span class="n50-badge" style="background:${surface[0]};color:${n(700)}">Badge</span></div>
      <span class="petit">Sur le fond : bouton soft ${mesure(surface[0], fond)}</span>
      <div class="n50b-carte" style="background:${carte};border-color:${n(300)}"><span class="petit">${option === 'A' ? 'Carte en surface 50' : 'Carte en fond discret 50'}</span><span class="n50-bouton" style="background:${surface[0]};color:${n(700)}">Bouton soft</span><span class="petit">bouton sur la carte : ${mesure(surface[0], carte)}</span></div>
    </div>`;
  };
  const rangee = (nom, mode) => `<div class="n50b-rangee"><div class="n50-tete" style="color:var(--encre)"><b>${nom} · Thème ${NOMS_DE_MODE[mode]}</b></div>${scene(nom, mode, 'A')}${scene(nom, mode, 'D')}</div>`;
  return `<section class="bloc" id="x2-12">
  <div class="tete"><span class="sur">X2.12 · Nuance 50, A et D</span><h2>Ce qui change à l’usage entre A et D</h2></div>
  <p>A et D donnent tous deux à la 50 le rôle de fond de composant. Ils diffèrent sur <code>surface</code>, le token des composants soft : boutons soft, badges, encarts, et leurs états.</p>
  <ul>
    <li><b>A</b> : <code>surface</code> descend à 50, son survol à 100, son appui à 200. Tous les composants soft deviennent plus pâles, dans toute la bibliothèque : sur le fond par défaut, un bouton soft se voit à peine. Et un bouton soft posé sur une carte en 50 s’y confond, puisque les deux sont en 50.</li>
    <li><b>D</b> : <code>surface</code> reste à 100, 200 et 300, et aucun composant existant ne change. Un token nouveau, par exemple <code>surface-subtle</code>, porte la 50 pour les grands aplats : carte, panneau latéral, ligne alternée. Un bouton soft sur cette carte reste visible.</li>
  </ul>
  <div class="n50-grille"><div class="n50b-rangee entete"><span></span><b>A · surface à 50</b><b>D · surface à 100, fond discret à 50</b></div>${['light', 'dark'].map((mode) => rangee('Bleu', mode)).join('')}${['light', 'dark'].map((mode) => rangee('Vert', mode)).join('')}</div>
  <div class="questions"><h3>Questions</h3><ol>
    <li><b>A ou D.</b> <span class="reco">Recommandé : D.</span> A change la valeur de tous les tokens <code>surface</code> existants et rend les composants soft presque invisibles sur le fond par défaut ; D ajoute un token et ne déplace rien.</li>
    <li><b>Le nom du token, si D.</b> <code>surface-subtle</code>, <code>background-subtle</code> ou <code>surface-muted</code>. <span class="reco">Recommandé : surface-subtle</span>, rangé avec <code>surface</code>.</li>
  </ol></div>
</section>`;
}

const STYLE_SECOND = `
.pst { display: inline-block; margin-left: 4px; padding: 0 4px; border-radius: 3px; font: 600 9px/13px Inter, sans-serif; background: #CDEFD9; color: #14532D; vertical-align: 1px; }
.pst.ko { background: #F9D8D1; color: #8A2A1B; }
.zone-choix { display: grid; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid var(--f-bord); }
.aj-bloc { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--f-bord); border-radius: 6px; background: var(--f-fond); }
.aj-ligne { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.aj-duo { display: flex; }
.aj-duo i { width: 20px; height: 20px; border-radius: 4px; }
.ancre-aj { position: absolute; top: 118px; left: 160px; z-index: 2; }
.aj-place { height: 330px; }
.aj-fenetre { width: 260px; background: #2C2C2C; border: 1px solid #444; border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.55); padding: 10px; display: grid; gap: 10px; }
.aj-grands { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.aj-grands > div { display: grid; gap: 2px; }
.aj-grands i { height: 40px; border-radius: 6px; }
.aj-reglette { display: grid; grid-template-columns: auto auto 1fr auto; gap: 6px; align-items: center; }
.aj-piste { position: relative; height: 6px; border-radius: 3px; background: linear-gradient(to right, #0A5C2A, #16A34A, #7EDB9E); }
.aj-cran { position: absolute; top: -3px; width: 1px; height: 12px; background: #E6E6E6; }
.aj-piste b { position: absolute; top: -4px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.4); }
.aj-gar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ok-t { color: #85E0A3; }
.d-pastille.grand { width: 44px; height: 44px; }
.h-titre { font-size: 13px; }
.h-ref { font-weight: 600; margin-top: 2px; }
.h-groupe { display: grid; gap: 6px; padding: 8px 10px; border: 1px solid rgba(128,128,128,.35); border-radius: 6px; margin-top: 6px; }
.h-titre-groupe { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .72; }
.h-role { display: grid; grid-template-columns: 56px 1fr; gap: 8px; align-items: center; }
.h-role + .h-role { border-top: 1px solid rgba(128,128,128,.25); padding-top: 6px; }
.h-vide { opacity: .72; }
.h-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: start; }
.h2 .d-table { grid-template-columns: auto auto auto; }
.rx { display: grid; grid-template-columns: 104px 1fr; border: 1px solid; border-radius: 10px; overflow: hidden; font-size: 11px; }
.rx-nav { display: grid; gap: 2px; align-content: start; padding: 12px 8px; border-right: 1px solid; }
.rx-nav b { padding: 0 6px 8px; }
.rx-nav span { padding: 4px 6px; border-radius: 4px; }
.rx-corps { display: grid; gap: 10px; padding: 12px; }
.rx-tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rx-titre { display: block; font-size: 13px; }
.rx-sous { font-size: 10px; }
.rx-btn { height: 26px; padding: 0 10px; border-radius: 6px; display: inline-grid; place-items: center; font-weight: 600; }
.rx-callout { padding: 8px 10px; border-radius: 6px; }
.rx-table { border: 1px solid; border-radius: 6px; overflow: hidden; }
.rx-ligne { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; padding: 6px 8px; border-top: 1px solid; }
.rx-ligne:first-child { border-top: 0; }
.rx-avatar { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-weight: 600; }
.rx-badge { padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.rx-form { display: grid; gap: 4px; }
.rx-champ { height: 28px; border: 1px solid; border-radius: 6px; display: flex; align-items: center; padding: 0 8px; }
.rx-champ.petit { height: 24px; }
.rx-options { display: flex; gap: 14px; }
.rx-options > span { display: flex; gap: 6px; align-items: center; }
.rx-case { width: 14px; height: 14px; border-radius: 3px; display: grid; place-items: center; font-style: normal; font-size: 9px; }
.rx-inter { width: 28px; height: 16px; border-radius: 8px; display: flex; justify-content: flex-end; padding: 2px; box-sizing: border-box; }
.rx-inter b { width: 12px; height: 12px; border-radius: 50%; }
.rx-actions { display: flex; justify-content: flex-end; gap: 6px; }
.rx-actions span { height: 28px; padding: 0 12px; border-radius: 6px; display: grid; place-items: center; font-weight: 600; }
.rx-etats { display: grid; grid-template-columns: 96px repeat(4, 1fr); gap: 8px 6px; align-items: center; padding: 12px; border-radius: 8px; font-size: 11px; }
.rx-col { font-size: 10px; font-weight: 600; }
.rx-nom { font-weight: 600; }
.rx-focus { display: inline-block; border-radius: 6px; }
.rx-bascule { width: 160px; }
.n50b-rangee { display: grid; grid-template-columns: 140px 1fr 1fr; gap: 8px; align-items: stretch; }
.n50b-rangee.entete b { font-size: 13px; }
.n50b { border-radius: 8px; padding: 10px; display: grid; gap: 6px; font: 11px/14px Inter, sans-serif; border: 1px solid var(--filet); }
.n50b-ligne { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.n50b-carte { display: grid; gap: 6px; justify-items: start; padding: 10px; border: 1px solid; border-radius: 8px; }
.n50-badge { padding: 1px 8px; border-radius: 10px; font-weight: 600; }
`;

/* La page */

const V3 = fs.readFileSync(path.join(ICI, 'generer-maquettes-v3.mjs'), 'utf8');
const STYLE_V3 = /const STYLE = `([\s\S]*?)`;\n/.exec(V3)[1];
const STYLE = `${STYLE_V3}${STYLE_SECOND}
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
  <p><b>Second passage</b>, après tes retours sur le premier : X2.7 à X2.12, en tête de page. Ce qui était décidé est déjà codé : sélection Figma retirée, cartes repliées à l’ouverture, « Nouvelle palette » en action principale et filet, pastille B adoucie. Le premier passage, répondu, suit.</p>
  <p>Chaque maquette montre le panneau à 500 px, dans le thème sombre de Figma, avec les couleurs et les ratios que le moteur calcule pour #1E6FD9 et #16A34A. Les lots X3, X4 et X5 sont déjà codés : leur disposition en place est la proposition A, face à au moins une autre. X2.1 et X2.6 n’ont rien dans le code. Chaque maquette finit par ses questions et une recommandation ; « recommandé » vaut accord si la question reste sans réponse.</p>
  <p class="note">Page écrite par <code>generer-maquettes-v4.mjs</code>. Pour la régénérer : <code>node --import tsx "docs/notes/Recherches/Plugin Palettes/generer-maquettes-v4.mjs"</code>.</p>
  <nav class="sommaire"><a href="#x2-7">X2.7 Création et ajustement</a><a href="#x2-8">X2.8 Détail d’une nuance</a><a href="#x2-9">X2.9 Badges</a><a href="#x2-10">X2.10 Ligne du titre</a><a href="#x2-11">X2.11 Interface de test</a><a href="#x2-12">X2.12 Nuance 50</a></nav>
  <nav class="sommaire"><span>Premier passage :</span><a href="#x2-1">X2.1 Création</a><a href="#x2-2">X2.2 Détail d’une nuance</a><a href="#x2-3">X2.3 Niveaux AA et AAA</a><a href="#x2-4">X2.4 Ligne du titre</a><a href="#x2-5">X2.5 Interface de test</a><a href="#x2-6">X2.6 Nuance 50</a></nav>
</section>
${sectionCreationBis()}
${sectionDetailBis()}
${sectionBadgesBis()}
${sectionTitreBis()}
${sectionInterfaceBis()}
${sectionNuance50Bis()}
<section class="intro"><span class="sur">Premier passage · répondu</span><h2>Les maquettes auxquelles tes retours répondent</h2></section>
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
