/**
 * L'inventaire des états de l'interface d'UCM Palettes (section 13.3 de la
 * spécification). Un état atteignable déclare la suite exacte de messages qui
 * le produit ; un état que l'interface ne sait pas encore montrer nomme la
 * case du plan qui le créera.
 */
const path = require('path');

/**
 * Le moteur et le modèle de planche sont lus à leur source : une recette
 * classée ici est celle que le sandbox classerait, une empreinte de cadre
 * celle que l'interface recalcule, jamais une recopie.
 */
function compiler(entree, nom) {
  const compile = path.resolve(__dirname, `../dist/${nom}.cjs`);
  require('esbuild').buildSync({ entryPoints: [entree], outfile: compile, bundle: true, format: 'cjs', platform: 'node' });
  return require(compile);
}
const chargerLeMoteur = () => compiler(require.resolve('ucm-couleur'), 'galerie-couleur');

const {
  FORMAT_RECETTE,
  ajusterPartsGrises,
  boutsDe,
  classerRecette,
  fnv1a,
  jsonCanonique,
  lireHexa,
  octetsUtf8,
  prereglageTailwind,
  recetteParDefaut,
  rgb8VersOklch,
} = chargerLeMoteur();
const { modeleDeCadre } = compiler(path.resolve(__dirname, '../src/planche/modele.ts'), 'galerie-modele');

/** Une planche sans page, avant tout dessin. */
const PLANCHE_VIDE = { page: null, nomDeLaPage: null, cadres: [], manquants: [], recherche: 'page', suiviFutur: false };

/** L'état que le sandbox envoie pour un texte rangé sous la clé de la recette, en réponse à la demande `demande`. */
function etatDuFichier(texte, profil = 'SRGB', planche = PLANCHE_VIDE, demande = 1) {
  return {
    message: {
      type: 'etat',
      demande,
      classement: classerRecette(texte),
      texte,
      empreinte: texte === '' ? null : fnv1a(octetsUtf8(texte)),
      profil,
      planche,
    },
  };
}

/** Une palette au préréglage Tailwind, profils liés, parts grises posées s'il le faut. */
function palette(id, nom, reference, recette = recetteParDefaut()) {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)), boutsDe(recette));
  return ajusterPartsGrises(recette, {
    id,
    nom,
    reference,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
  });
}

/** Le texte rangé d'une recette : la recette par défaut, modifiée, avec ces palettes. */
function rangee(palettes, modifier = (recette) => recette) {
  return jsonCanonique({ ...modifier(recetteParDefaut()), palettes });
}

const BLEU = palette('p-3fa2c91e', 'Bleu', '#1E6FD9');
const JAUNE = palette('p-08b7d4a0', 'Jaune', '#FACC15');

/** Trois palettes que la configuration ne touche pas toutes : parts du designer, parts grises. */
const TROIS_PALETTES = [
  BLEU,
  { ...JAUNE, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } },
  palette('p-5c1d0e77', 'Ardoise', '#6B7280'),
];
/**
 * Le cadre d'une palette tel que la lecture de la planche le relève. Son
 * empreinte est celle du modèle que la recette rangée donne, sauf réglage
 * contraire : le cadre est alors périmé. Chaque génération dessine la grille.
 */
function cadreDessine(texte, palette, cadre, { profil = 'SRGB', ...reglages } = {}) {
  const recette = classerRecette(texte).recette;
  const rangeeDansLaRecette = recette.palettes.find((candidate) => candidate.id === palette.id) ?? palette;
  const empreinte = modeleDeCadre(recette, rangeeDansLaRecette, profil, { grille: true }).empreinte;
  return { palette: palette.id, cadre, nom: palette.nom, page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte, grille: true, possede: true, ...reglages };
}
const PAGE_DE_LA_PLANCHE = '40:1';

/** Les cadres de deux palettes supprimées de la recette, restés dans Figma et toujours possédés. */
const CADRES_SUPPRIMES = [
  { palette: 'p-5c1d0e77', cadre: '40:4', nom: 'Ardoise', page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte: '0badc0de', grille: true, possede: true },
  { palette: 'p-1a2b3c4d', cadre: '40:6', nom: 'Rouge', page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', empreinte: '0badc0de', grille: true, possede: true },
];

/** La planche que la lecture relève : sa page, ses cadres, et ce qu'elle n'a pas trouvé. */
const plancheLue = (cadres, reglages = {}) => ({ ...PLANCHE_VIDE, page: PAGE_DE_LA_PLANCHE, nomDeLaPage: 'Palettes', cadres, ...reglages });
const ouvrirLaPlanche = { clic: '#onglet-planche' };

/** Le designer choisit un fichier de recette dans l'onglet Planche. */
const importer = (contenu) => ({ fichier: { dans: '#panneau-planche input[type="file"]', nom: 'palettes-et-reglages.json', contenu } });

const ouvrirLaConfiguration = { clic: '[aria-label="Ouvrir les réglages communs"]' };
const dessinerLaPalette = { clic: '.tete-de-configuration .bouton-du-titre' };
const deplierLInterfaceDeTest = { clic: '[aria-label="Interface de test"] .carte-bascule' };
const montrerLeThemeDark = { clic: '.nuancier-tete .bascule-option:nth-child(2)' };

/** Vert, ajusté d'un pas plus sombre : #16A34A devient #0DA047, et l'originale se garde (W7). */
const VERT_AJUSTE = { ...palette('p-2b3c4d5e', 'Vert', '#0DA047'), originale: '#16A34A' };
const deplierLaDerive = { clic: '[aria-label="Dérive de teinte"] .carte-bascule' };

/** Sept palettes : une de plus que le seuil au-delà duquel tout dessiner se confirme. */
const SEPT_PALETTES = [
  BLEU,
  JAUNE,
  palette('p-5c1d0e77', 'Ardoise', '#6B7280'),
  palette('p-1a2b3c4d', 'Rouge', '#DC2626'),
  palette('p-2b3c4d5e', 'Vert', '#16A34A'),
  palette('p-3c4d5e6f', 'Violet', '#7C3AED'),
  palette('p-4d5e6f70', 'Cyan', '#0891B2'),
];

/** La courbe claire descend à 0,55 au cran 700 : text sur surface manque 4,5 en clair. */
const cranSeptCentsPlusClair = (recette) => {
  const light = [...recette.courbes.light];
  light[7] = 0.55;
  return { ...recette, courbes: { ...recette.courbes, light } };
};

/** Deux fautes : une courbe claire qui remonte au 500, un fond sombre à cinq chiffres. */
function recetteCassee() {
  const recette = recetteParDefaut();
  const light = [...recette.courbes.light];
  light[5] = 0.8;
  return JSON.stringify({ ...recette, courbes: { ...recette.courbes, light }, fonds: { ...recette.fonds, dark: '#12121' } });
}

const ETATS = [
  {
    id: 'premier-lancement',
    titre: 'Premier lancement',
    quand: 'Le fichier ne porte aucune recette : la recette par défaut est proposée, sans palette.',
    regarder: 'Les deux onglets, l’engrenage, et une seule ligne d’état en couleur secondaire.',
    existe: true,
    atteinte: [etatDuFichier('')],
  },
  {
    id: 'recette-future',
    titre: 'Recette future',
    quand: 'Une version plus récente du plugin a rangé la recette.',
    regarder: 'Le bloquant en tête de l’onglet, ses trois parties séparées, la demande de mise à jour, et les trois gestes de sortie : exporter, importer, repartir de la recette par défaut.',
    existe: true,
    atteinte: [etatDuFichier(JSON.stringify({ ...recetteParDefaut(), formatVersion: FORMAT_RECETTE + 1 }))],
  },
  {
    id: 'recette-illisible',
    titre: 'Recette illisible',
    quand: 'La recette rangée ne passe pas la validation : deux champs sont faux.',
    regarder: 'Le compte des champs invalides, le premier refus en mots du designer, le bloquant sans écriture, et ses trois gestes de sortie.',
    existe: true,
    atteinte: [etatDuFichier(recetteCassee())],
  },
  {
    id: 'palette-en-saisie',
    titre: 'Palette en saisie',
    quand: 'Le designer tape une nouvelle référence : l’aperçu suit la saisie, rien n’est dessiné.',
    regarder: 'Le nuancier recalculé pour #7C3AED, le résumé de la dérive, et le détail de la nuance Vivid 700 choisie.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { saisie: { dans: '#panneau-palettes .champ-hexa', valeur: '#7C3AED' } },
      { clic: '[aria-label^="Profil Vivid, nuance 700,"]' },
    ],
  },
  {
    id: 'promesses-manquees',
    titre: 'Palette avec promesses manquées',
    quand: 'La courbe claire place le cran 700 à 0,55 : text sur surface ne tient plus 4,5 en clair.',
    regarder: 'La bascule « Soft ✗ » et « Vivid ✗ » des garanties, la ligne text sur surface choisie en échec, et le focus clavier déplacé sur la rampe.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE], cranSeptCentsPlusClair)),
      { touche: { dans: '.nuancier-grille [tabindex="0"]', cle: 'ArrowRight' } },
    ],
  },
  {
    id: 'alertes-seules',
    titre: 'Palette avec alertes seules',
    quand: 'Une référence jaune, plus vive que vivid : Vivid la porte au 300 en Light.',
    regarder: 'Les garanties respectées, la ligne « Référence : Vivid · nuance 300 », et la notice en couleur secondaire.',
    existe: true,
    atteinte: [etatDuFichier(rangee([JAUNE, BLEU]))],
  },
  {
    id: 'couleur-presque-grise',
    titre: 'Couleur presque grise',
    quand: 'La référence #6B7280 est sous le seuil de chroma : la palette reçoit des parts grises.',
    regarder: 'L’alerte « couleur presque grise », les deux rampes égales, et une dérive nulle.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-5c1d0e77', 'Ardoise', '#6B7280')]))],
  },
  {
    id: 'premier-lancement-palette-creee',
    titre: 'Premier lancement, palette créée',
    quand: 'Sur un fichier sans recette, le designer crée sa première palette : la recette se range.',
    regarder: 'La palette ouverte, son verdict au rang 1, et « rangé » en couleur secondaire.',
    existe: true,
    atteinte: [
      etatDuFichier(''),
      { saisie: { dans: '.champ-creation', valeur: '#1E6FD9' } },
      { clic: '.creation .btn-primary' },
      { message: { type: 'rangement', demande: 2, issue: { issue: 'rangee', empreinte: '5e0c1a7b' } } },
    ],
  },
  {
    id: 'hexa-invalide',
    titre: 'Hexa invalide',
    quand: 'Le designer tape une lettre qui n’est pas hexadécimale dans la référence.',
    regarder: 'L’erreur sous le champ, en rouge, et l’aperçu resté celui de #1E6FD9.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { saisie: { dans: '#panneau-palettes .champ-hexa', valeur: '#1E6FZ9' } }],
  },
  {
    id: 'recette-modifiee-ailleurs',
    titre: 'Recette modifiée ailleurs',
    quand: 'Le designer duplique une palette, mais la recette rangée a changé depuis sa lecture.',
    regarder: 'Le refus en tête, au-dessus de la barre, ses gestes « Exporter mes modifications » et « Recharger les palettes », « Générer sur Figma » inactif avec sa raison en infobulle, et « non rangé ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { clic: '.menu-palette .icon-button' },
      { clic: '[data-geste="dupliquer"]' },
      { message: { type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } } },
    ],
  },
  {
    id: 'creee-depuis-la-selection',
    titre: 'Palette créée depuis la sélection',
    quand: 'Dans un document Display P3, la couleur sélectionnée sort de sRGB : elle est ramenée.',
    regarder: 'La nouvelle palette ouverte, et la notice de couleur ramenée sous la barre.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'DISPLAY_P3'),
      { clic: '.bouton-de-barre' },
      { clic: '[data-geste="selection"]' },
      { message: { type: 'selection', demande: 2, lecture: { hexa: '#FF2D1F', ramenee: true } } },
      { message: { type: 'rangement', demande: 3, issue: { issue: 'rangee', empreinte: '9b41d0e2' } } },
    ],
  },
  {
    id: 'configuration-de-la-recette',
    titre: 'Configuration de la recette',
    quand: 'Le designer ouvre l’engrenage sur un fichier de trois palettes, dont une aux parts propres et une grise.',
    regarder: 'En tête, Bleu en Thème Light avec « Soft ✓ · Vivid ✓ » et ses rampes ; les cartes Couleurs de fond, Intensités et Luminosité des nuances, chacune avec son compte (3, 1 et 3 palettes concernées) et « Rétablir » inactif ; le tracé des deux courbes et les deux ◆ de Bleu, puis une colonne par nuance sous son point, Light puis Dark ; puis Minimums des promesses et Détection des couleurs proches repliées, avec leur résumé.',
    existe: true,
    atteinte: [etatDuFichier(rangee(TROIS_PALETTES)), ouvrirLaConfiguration],
  },
  {
    id: 'reglages-sans-palette',
    titre: 'Réglages communs sans palette',
    quand: 'Le designer ouvre l’engrenage sur un fichier qui n’a encore aucune palette.',
    regarder: 'Les cinq cartes sans aperçu en tête, aucune palette inventée, le tracé sans ◆, et « Aucune palette concernée » dans chaque compte.',
    existe: true,
    atteinte: [etatDuFichier(''), ouvrirLaConfiguration],
  },
  {
    id: 'courbe-hors-garantie',
    titre: 'Courbe hors garantie',
    quand: 'Le designer remonte le cran 700 clair à 0,56 : il ne tient plus 4,5 contre le cran 50.',
    regarder: 'Les deux alertes sous la table, soft et vivid, avec la teinte du pire cas et son contraste.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES)),
      ouvrirLaConfiguration,
      { saisie: { dans: '[data-mode="light"][data-rang="7"]', valeur: '0,56' } },
    ],
  },
  {
    id: 'derive-liee-tailwind',
    titre: 'Dérive liée, préréglage Tailwind',
    quand: 'Le designer déplie l’éditeur d’une palette au préréglage, soft et vivid liés.',
    regarder: 'Une seule ligne brisée, le pivot sur 0° dans la colonne 600, qui porte #1E6FD9, les deux poignées et leurs étiquettes, la bande et la rampe sous les mêmes colonnes.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLaDerive],
  },
  {
    id: 'derive-deliee-libre',
    titre: 'Dérive déliée et libre',
    quand: 'soft garde le préréglage, vivid a une dérive libre : les profils sont déliés.',
    regarder: 'Deux lignes, pleine et tiretée, et les poignées marquées de l’initiale du profil réglé.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([{ ...BLEU, derive: { lien: false, soft: BLEU.derive.soft, vivid: { clair: 20, sombre: -25, origine: 'libre' } } }])),
      deplierLaDerive,
    ],
  },
  {
    id: 'reference-hors-rampe',
    titre: 'Référence hors de la rampe',
    quand: 'La référence #0B1F4B est plus sombre que le bout sombre de la rampe.',
    regarder: 'La poignée sombre masquée, sa note sous le graphe, et le pivot dans la colonne 950, qui porte la référence.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-2b7e40c1', 'Nuit', '#0B1F4B')])), deplierLaDerive],
  },
  {
    id: 'dessin-en-cours',
    titre: 'Dessin en cours',
    quand: 'Le designer clique « Générer sur Figma » : le sandbox annonce le premier cadre.',
    regarder: '« Génération… » inactif à droite du titre, la progression sous le titre, et les deux onglets inertes : aucun geste possible.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      dessinerLaPalette,
      { message: { type: 'progression', demande: 2, fait: 0, total: 1, nom: 'Bleu' } },
    ],
  },
  {
    id: 'dessin-interrompu',
    titre: 'Dessin interrompu',
    quand: 'Figma refuse un calque au milieu du cadre de Bleu.',
    regarder: 'Le bloquant qui nomme la palette et l’erreur, dit qu’aucun cadre n’est resté, et son geste « Réessayer ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      dessinerLaPalette,
      { message: { type: 'dessin', demande: 2, resultat: { issue: 'interrompue', palette: BLEU.id, message: 'in set_characters: font not loaded', dessines: 0 } } },
    ],
  },
  {
    id: 'confirmation-six-palettes',
    titre: 'Confirmation au-delà de six palettes',
    quand: 'Le designer clique « Générer les 7 palettes qui ne sont pas à jour » sur un fichier de sept palettes jamais générées.',
    regarder: 'La confirmation qui compte les palettes et les calques, sous les fiches, et ses deux gestes.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(SEPT_PALETTES)),
      { clic: '#onglet-planche' },
      { clic: '#panneau-planche .creation-ligne .btn' },
    ],
  },
  {
    id: 'planche-sans-palette',
    titre: 'Onglet Planche sans palette',
    quand: 'Le designer ouvre l’onglet Planche d’un fichier sans palette.',
    regarder: 'Le texte qui dit qu’il n’y a rien à dessiner, et le geste vers l’onglet Palettes.',
    existe: true,
    atteinte: [etatDuFichier(''), { clic: '#onglet-planche' }],
  },
  {
    id: 'police-indisponible',
    titre: 'Police indisponible',
    quand: 'Inter Medium ne se charge pas : le dessin s’arrête avant tout calque.',
    regarder: 'Le bloquant qui nomme la police, et son geste « Réessayer ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      dessinerLaPalette,
      { message: { type: 'dessin', demande: 2, resultat: { issue: 'police', style: 'Inter Medium' } } },
    ],
  },
  {
    id: 'planche-a-jour',
    titre: 'Planche à jour',
    quand: 'Bleu et Jaune ont été dessinées, et la recette n’a pas changé depuis.',
    regarder: 'Deux fiches « À jour », chacune avec ses rampes Soft et Vivid, le ◆ de la référence, le résultat de ses garanties et ses trois gestes ; en pied, « Générer toutes les palettes » seul.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '40:2'), cadreDessine(rangee([BLEU, JAUNE]), JAUNE, '40:3')])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'planche-perimee',
    titre: 'Planche périmée',
    quand: 'Le cadre de Jaune a été dessiné sur une recette d’avant ; Ardoise n’a jamais été dessinée.',
    regarder: 'Bleu « À jour », Jaune « À mettre à jour » et son geste « Actualiser sur Figma », Ardoise sans état écrit ni « Afficher dans Figma », et « Générer les 2 palettes qui ne sont pas à jour » en pied.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES), 'SRGB', plancheLue([cadreDessine(rangee(TROIS_PALETTES), BLEU, '40:2'), cadreDessine(rangee(TROIS_PALETTES), JAUNE, '40:3', { empreinte: '0badc0de' })])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'palette-supprimee',
    titre: 'Palette supprimée',
    quand: 'Les palettes Ardoise et Rouge ont été supprimées ; leurs cadres sont restés dans Figma.',
    regarder: 'Une carte par palette supprimée sous les gestes de génération, teinte d’avertissement discrète : son nom, sa phrase, « Afficher dans Figma » et « Supprimer définitivement ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), ...CADRES_SUPPRIMES])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'cadre-supprime',
    titre: 'Cadre supprimé définitivement',
    quand: 'Le designer clique « Supprimer définitivement » sur la carte d’Ardoise ; le sandbox retire le cadre.',
    regarder: 'La carte d’Ardoise disparue, celle de Rouge restante avec le focus sur « Afficher dans Figma », et la ligne qui dit que Ctrl+Z dans Figma rétablit le cadre.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), ...CADRES_SUPPRIMES])),
      ouvrirLaPlanche,
      { clic: '.carte-supprimee[data-cadre="40:4"] [data-geste="supprimer"]' },
      { message: { type: 'retrait', demande: 3, issue: { issue: 'retire' } } },
    ],
  },
  {
    id: 'copie-de-cadre',
    titre: 'Copie de cadre',
    quand: 'Le designer a dupliqué le cadre de Bleu sur la planche.',
    regarder: 'La fiche de Bleu « À jour », et la notice de la copie, qui dit que le plugin ne met à jour que le cadre d’origine.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2'), cadreDessine(rangee([BLEU]), BLEU, '40:5', { nom: 'Bleu copie', possede: false })])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'calques-etrangers',
    titre: 'Calques étrangers',
    quand: 'Le designer a posé une note et une flèche dans le cadre de Bleu, puis clique « Générer sur Figma ».',
    regarder: 'La confirmation qui nomme les deux calques, et ses gestes « Redessiner quand même » et « Annuler ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2')])),
      dessinerLaPalette,
      {
        message: {
          type: 'dessin',
          demande: 2,
          resultat: { issue: 'etrangers', cadres: [{ palette: BLEU.id, calques: [{ id: '40:7', nom: 'Note' }, { id: '40:8', nom: 'Flèche' }] }] },
        },
      },
    ],
  },
  {
    id: 'document-display-p3',
    titre: 'Document Display P3',
    quand: 'Le fichier est en Display P3, et Bleu y a été dessinée.',
    regarder: 'La notice qui dit que la pipette lit des valeurs P3, et de copier l’hexa depuis la carte.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'DISPLAY_P3', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2', { profil: 'DISPLAY_P3' })])),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'import-invalide',
    titre: 'Import invalide',
    quand: 'Le designer importe un fichier dont le fond sombre a cinq chiffres et la courbe claire remonte au cran 500.',
    regarder: 'Le bloquant sous les gestes de la recette, qui nomme le fichier, compte les champs invalides et dit que la recette du fichier reste intacte.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), ouvrirLaPlanche, importer(recetteCassee())],
  },
  {
    id: 'ecart-d-import',
    titre: 'Écart d’import',
    quand: 'Bleu et Jaune sont à jour sur la planche ; le fichier importé renomme Bleu, retire Jaune, ajoute Ardoise et relève le seuil de texte.',
    regarder: 'La confirmation : palettes ajoutées et retirées, « Palette à modifier : Bleu roi (nom) », « minimum des textes », les lignes Couleurs et Minimums, « Sur la planche : 1 cadre passera « À mettre à jour » (Bleu roi) ; 1 cadre restera sans palette (Jaune) », puis ses gestes.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '40:2'), cadreDessine(rangee([BLEU, JAUNE]), JAUNE, '40:3')])),
      ouvrirLaPlanche,
      importer(rangee([{ ...BLEU, nom: 'Bleu roi' }, palette('p-5c1d0e77', 'Ardoise', '#6B7280')], (recette) => ({ ...recette, seuils: { ...recette.seuils, texte: 7 } }))),
    ],
  },
  {
    id: 'creation-ouverte',
    titre: 'Création ouverte',
    quand: 'Le designer clique « Nouvelle palette » : la création s’ouvre sous le sélecteur.',
    regarder: 'La carte « Nouvelle palette » : nom, couleur de référence et palette de base en trois colonnes, Auto pressé, puis « Créer la palette », la sélection Figma et « Annuler » sur une ligne, le focus dans le code.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '.bouton-de-barre' }],
  },
  {
    id: 'reference-soft',
    titre: 'Référence Soft',
    quand: 'Une référence peu intense, #A0B599 : Soft la porte, dans les deux thèmes. Le designer déplie la dérive.',
    regarder: 'La ligne « Référence : Soft · nuance 400 », le ◆ dans la pastille Soft 400, puis dans l’éditeur la ligne et la rampe de Soft, et le pivot dans la colonne 400.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-6a0b5990', 'Sauge', '#A0B599')])), deplierLaDerive],
  },
  {
    id: 'reference-vivid',
    titre: 'Référence Vivid',
    quand: 'Une référence intense, #A855F7 : Vivid la porte, en 600 en Light et en 700 en Dark. Le designer passe au thème Dark.',
    regarder: 'Le ◆ dans la pastille Vivid 700 du thème Dark, la ligne « Référence : Vivid · nuance 700 », et la garantie manquée que l’ancrage fait apparaître.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-a855f700', 'Violet', '#A855F7')])), { clic: '.nuancier-tete .bascule-option:nth-child(2)' }],
  },
  {
    id: 'fond-personnalise',
    titre: 'Fond personnalisé',
    quand: 'Le fond du thème Light est un jaune saturé, #FFD84D : le nuancier le porte.',
    regarder: 'La surface peinte de #FFD84D, ses numéros et ses noms de profil lisibles dessus, et le point à vérifier sur le fond.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU], (recette) => ({ ...recette, fonds: { ...recette.fonds, light: '#FFD84D' } })))],
  },
  {
    id: 'generation-reussie',
    titre: 'Génération réussie',
    quand: 'La palette ouverte vient d’être générée sur Figma, et l’état du fichier est relu.',
    regarder: '« Palette Bleu » et « À jour sur Figma » inactif sur une ligne, « Afficher dans Figma » dessous, sans message de succès empilé.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      dessinerLaPalette,
      { message: { type: 'dessin', demande: 2, resultat: { issue: 'dessinee', page: PAGE_DE_LA_PLANCHE, cadres: [{ palette: BLEU.id, cadre: '40:2' }], peints: [] } } },
      etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2')]), 3),
    ],
  },
  {
    id: 'palette-de-base-forcee',
    titre: 'Palette de base forcée',
    quand: 'Le designer force Soft sur une référence saturée, #1E6FD9, qu’Auto confiait à Vivid.',
    regarder: 'Soft pressé dans la carte Couleur de base, le ◆ passé dans la rangée Soft avec le même code, et le résumé « Palette de base Soft » de la carte Intensités.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '.bascule-de-base .bascule-option:nth-child(2)' }],
  },
  {
    id: 'garanties-respectees',
    titre: 'Garanties respectées',
    quand: 'Bleu tient toutes ses garanties : la carte s’ouvre sur text sur surface.',
    regarder: 'La bascule « Soft ✓ » et « Vivid ✓ », Vivid pressé, trois arcs de 100 vers 700, 200 vers 800 et 300 vers 900 sur la réglette, et les numéros sous chaque spécimen.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]))],
  },
  {
    id: 'garantie-en-echec',
    titre: 'Garantie en échec',
    quand: 'La courbe claire place le cran 700 à 0,55 : text sur surface manque 4,5 en Light.',
    regarder: 'La bascule « ✗ », la ligne en échec choisie d’office, son arc de la couleur de danger, l’état fautif et ses liens vers les réglages.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU, JAUNE], cranSeptCentsPlusClair))],
  },
  {
    id: 'garantie-autre-theme',
    titre: 'Garantie de l’autre thème',
    quand: 'L’aperçu montre le thème Dark, et le thème Light a des garanties manquées : le designer suit la ligne qui les compte.',
    regarder: 'L’aperçu revenu au thème Light, « Revenir au thème Dark » dans son en-tête, et la carte des garanties sur les échecs du thème Light.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU, JAUNE], cranSeptCentsPlusClair)), { clic: '.nuancier-tete .bascule-option:nth-child(2)' }, { clic: '.autre-theme .lien-de-constat' }],
  },
  {
    id: 'detail-de-la-reference',
    titre: 'Détail de la référence',
    quand: 'Le designer choisit la nuance Vivid 600 de Bleu, qui porte la référence.',
    regarder: 'La grande pastille, « Vivid · 600 », « ◆ Votre couleur de référence exacte », sous « Sert à » les rôles border-control et focus avec leurs garanties, les numéros du partenaire et un badge AA ; puis la table des contrastes, fond du thème, blanc et noir, un badge par ligne, et OKLCH replié.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label^="Profil Vivid, nuance 600,"]' }],
  },
  {
    id: 'nuance-libre',
    titre: 'Nuance sans rôle',
    quand: 'Le designer choisit la nuance Vivid 500, qu’aucun rôle n’emploie.',
    regarder: '« Sans rôle », puis la table des contrastes, fond du thème, blanc et noir, chacun avec son badge AA ou AAA, et OKLCH replié : aucun contraste écrit deux fois.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label^="Profil Vivid, nuance 500,"]' }],
  },
  {
    id: 'cartes-repliees',
    titre: 'Cartes repliées',
    quand: 'Bleu à l’ouverture : les cartes Intensités et Dérive de teinte sont repliées.',
    regarder: 'Les deux cartes repliées sur une ligne chacune, leur chevron, et leur résumé aligné à droite.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]))],
  },
  {
    id: 'generation-partielle',
    titre: 'Génération partielle',
    quand: 'Sur trois palettes, la deuxième s’arrête : la première est créée, la troisième attend.',
    regarder: 'Le bloquant en tête de l’onglet Planche : Jaune interrompue, Bleu conservée, Ardoise en attente, et « Réessayer », qui reprend à Jaune.',
    existe: true,
    // L'ouverture de l'onglet relit l'état (demande 2) : la génération porte la demande 3.
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES)),
      ouvrirLaPlanche,
      { clic: '#panneau-planche .creation-ligne .btn' },
      { message: { type: 'dessin', demande: 3, resultat: { issue: 'interrompue', palette: JAUNE.id, message: 'in set_characters: font not loaded', dessines: 1 } } },
    ],
  },
  {
    id: 'cadre-deplace',
    titre: 'Cadre déplacé',
    quand: 'Le designer a rangé le cadre de Bleu dans une section de la page « Archives », et coupé puis collé celui de Jaune, qui change alors d’identifiant.',
    regarder: 'Bleu « À jour · Page « Archives » » avec « Afficher dans Figma », Jaune « Cadre introuvable » en rouge, et la notice qui dit que la recherche s’est bornée à la page « Palettes », avec « Chercher dans tout le fichier ».',
    existe: true,
    atteinte: [
      etatDuFichier(
        rangee([BLEU, JAUNE]),
        'SRGB',
        plancheLue([cadreDessine(rangee([BLEU, JAUNE]), BLEU, '41:2', { page: '41:1', nomDeLaPage: 'Archives' })], {
          manquants: [{ palette: JAUNE.id, cadre: '40:3', raison: 'introuvable' }],
        }),
      ),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'fond-dans-le-selecteur',
    titre: 'Fond dans le sélecteur de couleur',
    quand: 'Le designer clique la pastille du fond, dans l’en-tête de la carte d’aperçu.',
    regarder: 'Le sélecteur de 232 px sous la pastille, par-dessus l’aperçu : la zone, la teinte, le code en Hex, la mention du fond commun, puis les deux fonds par défaut, le blanc et Vivid 50 et 100.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '.pastille-du-fond' }],
  },
  {
    id: 'reference-dans-le-selecteur',
    titre: 'Référence dans le sélecteur de couleur',
    quand: 'Le designer clique la pastille de la couleur de référence, dans « Configuration de la palette ».',
    regarder: 'Le sélecteur aligné sur la pastille, sans mention, et les onze nuances Vivid du thème montré, la référence pressée quand elle en est une.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label="Configuration de la palette"] .pipette' }],
  },
  {
    id: 'palette-libre',
    titre: 'Palette libre',
    quand: 'Une palette sort du modèle du design system : six nuances, numérotées par le designer.',
    regarder: 'Le modèle Libre pressé et « Sans rôles ni garanties » dans la troisième colonne, les puces 100, 200, 400, 600, 800 et 900 allumées, l’aperçu à six colonnes sans on-solid ni accolades, et aucune carte des garanties.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, crans: [100, 200, 400, 600, 800, 900] }]))],
  },
  {
    id: 'reference-ajustee',
    titre: 'Référence ajustée',
    quand: 'La référence #16A34A a été ajustée d’un pas plus sombre, en #0DA047, et l’originale est gardée.',
    regarder: 'Sous le code #0DA047, « Ajuster la référence », puis « Ajustée depuis #16A34A · Revenir à l’originale » ; le ◆ au 600 dans les deux thèmes.',
    existe: true,
    atteinte: [etatDuFichier(rangee([VERT_AJUSTE]))],
  },
  {
    id: 'ajustement-ouvert',
    titre: 'Ajuster la référence',
    quand: 'Sur Vert, #16A34A, le designer ouvre « Ajuster la référence » et fait un pas plus sombre.',
    regarder: 'Le panneau sous les colonnes : Originale #16A34A et Proposition #0DA047 côte à côte, la luminosité entre « − » et « + », le code, « Nuance visée : 600 dans les deux thèmes », les garanties Vivid « ✗ 2 → ✓ » et leurs lignes avant et après avec un badge, puis Appliquer et Annuler.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([palette('p-2b3c4d5e', 'Vert', '#16A34A')])),
      { clic: '[aria-label="Configuration de la palette"] .colonnes-de-base .lien-de-constat' },
      { clic: '[aria-label="Un pas plus sombre"]' },
    ],
  },
  {
    id: 'nuance-deselectionnee',
    titre: 'Nuance désélectionnée',
    quand: 'Le designer choisit la nuance Vivid 600, puis la reclique.',
    regarder: 'Le détail refermé, aucune pastille entourée, et le focus resté sur Vivid 600.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '[aria-label^="Profil Vivid, nuance 600,"]' }, { clic: '[aria-label^="Profil Vivid, nuance 600,"]' }],
  },
  {
    id: 'titre-generer',
    titre: 'Titre et « Générer sur Figma »',
    quand: 'Bleu n’a jamais été générée.',
    regarder: '« Palette Bleu » à gauche et « Générer sur Figma » à droite, sur une ligne, sans état écrit dessous.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]))],
  },
  {
    id: 'titre-actualiser',
    titre: 'Titre et « Actualiser sur Figma »',
    quand: 'Le cadre de Bleu a été dessiné sur une recette d’avant : il a changé depuis.',
    regarder: '« Palette Bleu » et « Actualiser sur Figma » sur une ligne, « Afficher dans Figma » dessous.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]), 'SRGB', plancheLue([cadreDessine(rangee([BLEU]), BLEU, '40:2', { empreinte: '0badc0de' })]))],
  },
  {
    id: 'titre-nom-long',
    titre: 'Titre d’un nom long',
    quand: 'La palette porte un nom de soixante caractères, à la largeur minimale de la fenêtre.',
    regarder: 'Le nom coupé par des points de suspension, et « Générer sur Figma » entier, dans le panneau.',
    existe: true,
    atteinte: [etatDuFichier(rangee([{ ...BLEU, nom: 'Bleu institutionnel des parcours de souscription en ligne' }]))],
  },
  {
    id: 'interface-de-test-light',
    titre: 'Interface de test, thème Light',
    quand: 'Le designer déplie « Interface de test », la dernière carte de l’onglet.',
    regarder: 'L’écran de réglages peint de Bleu sur le fond Light : badge et encart en surface, onglet souligné de solid, champ bordé de border-control, case et interrupteur en solid, trois boutons sans fond, surface et solid.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest],
  },
  {
    id: 'interface-de-test-dark',
    titre: 'Interface de test, thème Dark',
    quand: 'L’aperçu passe au thème Dark, « Interface de test » dépliée.',
    regarder: 'Le même écran sur le fond Dark, peint des nuances Dark, et le résumé de la carte « Thème Dark · Vivid ».',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), deplierLInterfaceDeTest, montrerLeThemeDark],
  },
];

module.exports = { ETATS };
