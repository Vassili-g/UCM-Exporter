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
const PLANCHE_VIDE = { page: null, cadres: [] };

/** L'état que le sandbox envoie pour un texte rangé sous la clé de la recette. */
function etatDuFichier(texte, profil = 'SRGB', planche = PLANCHE_VIDE) {
  return {
    message: {
      type: 'etat',
      demande: 1,
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
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)), boutsDe(recette.courbes));
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
 * contraire : le cadre est alors périmé.
 */
function cadreDessine(texte, palette, cadre, { profil = 'SRGB', ...reglages } = {}) {
  const recette = classerRecette(texte).recette;
  const rangeeDansLaRecette = recette.palettes.find((candidate) => candidate.id === palette.id) ?? palette;
  const empreinte = modeleDeCadre(recette, rangeeDansLaRecette, profil).empreinte;
  return { palette: palette.id, cadre, nom: palette.nom, empreinte, grille: false, possede: true, ...reglages };
}
const PAGE_DE_LA_PLANCHE = '40:1';
const ouvrirLaPlanche = { clic: '#onglet-planche' };

/** Le designer choisit un fichier de recette dans l'onglet Planche. */
const importer = (contenu) => ({ fichier: { dans: '#panneau-planche input[type="file"]', nom: 'palettes.recette.json', contenu } });

const ouvrirLaConfiguration = { clic: '[aria-label="Ouvrir la configuration"]' };
const dessinerLaPalette = { clic: '.barre-verdict .btn' };

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
    regarder: 'L’aperçu recalculé pour #7C3AED, la ligne de part et de dérive, et le détail du cran 700 vivid au survol.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU])),
      { saisie: { dans: '#panneau-palettes .champ-hexa', valeur: '#7C3AED' } },
      { survol: '[aria-label^="vivid.700 "]' },
    ],
  },
  {
    id: 'promesses-manquees',
    titre: 'Palette avec promesses manquées',
    quand: 'La courbe claire place le cran 700 à 0,55 : text sur surface ne tient plus 4,5 en clair.',
    regarder: 'Le verdict et la première promesse manquée sans défiler à 440 × 520, et le focus clavier déplacé sur la rampe.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE], cranSeptCentsPlusClair)),
      { touche: { dans: '.grille-apercu [tabindex="0"]', cle: 'ArrowRight' } },
    ],
  },
  {
    id: 'alertes-seules',
    titre: 'Palette avec alertes seules',
    quand: 'Une référence jaune, plus claire que le bouton et plus vive que vivid.',
    regarder: 'Le verdict « Prête », puis l’alerte avec ses deux pastilles, puis la notice en couleur secondaire.',
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
    id: 'notice-legacy',
    titre: 'Notice LEGACY',
    quand: 'Le document n’a pas de profil de couleur géré.',
    regarder: 'La notice en dernier, en couleur secondaire, après les alertes.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU]), 'LEGACY')],
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
    regarder: 'Le refus en tête, au-dessus de la barre, son geste « Recharger », et « non rangé ».',
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
      { clic: '[aria-label="Nouvelle palette"]' },
      { clic: '[data-geste="selection"]' },
      { message: { type: 'selection', demande: 2, lecture: { hexa: '#FF2D1F', ramenee: true } } },
      { message: { type: 'rangement', demande: 3, issue: { issue: 'rangee', empreinte: '9b41d0e2' } } },
    ],
  },
  {
    id: 'configuration-de-la-recette',
    titre: 'Configuration de la recette',
    quand: 'Le designer ouvre l’engrenage sur un fichier de trois palettes, dont une aux parts propres et une grise.',
    regarder: 'Les onze lignes des deux courbes, et le compte des palettes touchées : 3 par les courbes, 1 par les parts, 2 par le seuil.',
    existe: true,
    atteinte: [etatDuFichier(rangee(TROIS_PALETTES)), ouvrirLaConfiguration],
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
    regarder: 'Une seule ligne brisée, le pivot sur 0° entre les crans 600 et 700, les deux poignées et leurs étiquettes, la bande et la rampe sous les mêmes colonnes.',
    existe: true,
    atteinte: [etatDuFichier(rangee([BLEU])), { clic: '.ligne-infos .bouton-discret' }],
  },
  {
    id: 'derive-deliee-libre',
    titre: 'Dérive déliée et libre',
    quand: 'soft garde le préréglage, vivid a une dérive libre : les profils sont déliés.',
    regarder: 'Deux lignes, pleine et tiretée, et les poignées marquées de l’initiale du profil réglé.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([{ ...BLEU, derive: { lien: false, soft: BLEU.derive.soft, vivid: { clair: 20, sombre: -25, origine: 'libre' } } }])),
      { clic: '.ligne-infos .bouton-discret' },
    ],
  },
  {
    id: 'reference-hors-rampe',
    titre: 'Référence hors de la rampe',
    quand: 'La référence #0B1F4B est plus sombre que le bout sombre de la rampe.',
    regarder: 'La poignée sombre masquée, sa note sous le graphe, et aucun pivot sur la ligne.',
    existe: true,
    atteinte: [etatDuFichier(rangee([palette('p-2b7e40c1', 'Nuit', '#0B1F4B')])), { clic: '.ligne-infos .bouton-discret' }],
  },
  {
    id: 'dessin-en-cours',
    titre: 'Dessin en cours',
    quand: 'Le designer clique « Dessiner » : le sandbox annonce le premier cadre.',
    regarder: 'Le bouton qui dit la progression, et les deux onglets inertes : aucun geste possible.',
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
    quand: 'Le designer clique « Dessiner toutes les palettes » sur un fichier de sept palettes.',
    regarder: 'La confirmation qui compte les cadres, sous la liste, et ses deux gestes.',
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
    regarder: 'Chaque ligne dit « à jour », sans geste ; seul « Dessiner toutes les palettes » reste.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE]), 'SRGB', {
        page: PAGE_DE_LA_PLANCHE,
        cadres: [cadreDessine(rangee([BLEU, JAUNE]), BLEU, '40:2'), cadreDessine(rangee([BLEU, JAUNE]), JAUNE, '40:3')],
      }),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'planche-perimee',
    titre: 'Planche périmée',
    quand: 'Le cadre de Jaune a été dessiné sur une recette d’avant ; Ardoise n’a jamais été dessinée.',
    regarder: 'Bleu à jour, Jaune « périmée » avec « Redessiner », Ardoise « jamais dessinée » avec « Dessiner ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee(TROIS_PALETTES), 'SRGB', {
        page: PAGE_DE_LA_PLANCHE,
        cadres: [cadreDessine(rangee(TROIS_PALETTES), BLEU, '40:2'), cadreDessine(rangee(TROIS_PALETTES), JAUNE, '40:3', { empreinte: '0badc0de' })],
      }),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'cadre-orphelin',
    titre: 'Cadre orphelin',
    quand: 'La palette Ardoise a été supprimée ; son cadre est resté sur la planche.',
    regarder: 'La notice sous « Dessiner toutes les palettes », qui nomme le cadre, dit qu’aucun dessin ne le touche plus, et propose « Voir sur la planche ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', {
        page: PAGE_DE_LA_PLANCHE,
        cadres: [cadreDessine(rangee([BLEU]), BLEU, '40:2'), { palette: 'p-5c1d0e77', cadre: '40:4', nom: 'Ardoise', empreinte: '0badc0de', grille: false, possede: true }],
      }),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'copie-de-cadre',
    titre: 'Copie de cadre',
    quand: 'Le designer a dupliqué le cadre de Bleu sur la planche.',
    regarder: 'Bleu à jour, et la notice de la copie, qui dit que le plugin ne la redessine pas.',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', {
        page: PAGE_DE_LA_PLANCHE,
        cadres: [cadreDessine(rangee([BLEU]), BLEU, '40:2'), cadreDessine(rangee([BLEU]), BLEU, '40:5', { nom: 'Bleu copie', possede: false })],
      }),
      ouvrirLaPlanche,
    ],
  },
  {
    id: 'calques-etrangers',
    titre: 'Calques étrangers',
    quand: 'Le designer a posé une note et une flèche dans le cadre de Bleu, puis clique « Dessiner ».',
    regarder: 'La confirmation qui nomme les deux calques, et ses gestes « Redessiner quand même » et « Annuler ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU]), 'SRGB', { page: PAGE_DE_LA_PLANCHE, cadres: [cadreDessine(rangee([BLEU]), BLEU, '40:2')] }),
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
      etatDuFichier(rangee([BLEU]), 'DISPLAY_P3', {
        page: PAGE_DE_LA_PLANCHE,
        cadres: [cadreDessine(rangee([BLEU]), BLEU, '40:2', { profil: 'DISPLAY_P3' })],
      }),
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
    quand: 'Le fichier importé renomme Bleu, retire Jaune, ajoute Ardoise et relève le seuil de texte.',
    regarder: 'La confirmation : une ligne par genre d’écart, la phrase qui dit que l’import ne redessine rien, et ses gestes « Importer » et « Annuler ».',
    existe: true,
    atteinte: [
      etatDuFichier(rangee([BLEU, JAUNE])),
      ouvrirLaPlanche,
      importer(rangee([{ ...BLEU, nom: 'Bleu roi' }, palette('p-5c1d0e77', 'Ardoise', '#6B7280')], (recette) => ({ ...recette, seuils: { ...recette.seuils, texte: 7 } }))),
    ],
  },
];

module.exports = { ETATS };
