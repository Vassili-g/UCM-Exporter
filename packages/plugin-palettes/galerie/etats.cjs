/**
 * L'inventaire des états de l'interface d'UCM Palettes (section 13.3 de la
 * spécification). Un état atteignable déclare la suite exacte de messages qui
 * le produit ; un état que l'interface ne sait pas encore montrer nomme la
 * case du plan qui le créera.
 */
const path = require('path');

/**
 * Le moteur est lu à sa source : une recette classée ici est celle que le
 * sandbox classerait, jamais une recopie.
 */
function chargerLeMoteur() {
  const compile = path.resolve(__dirname, '../dist/galerie-couleur.cjs');
  require('esbuild').buildSync({
    entryPoints: [require.resolve('ucm-couleur')],
    outfile: compile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
  });
  return require(compile);
}

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

/** L'état que le sandbox envoie pour un texte rangé sous la clé de la recette. */
function etatDuFichier(texte, profil = 'SRGB') {
  return {
    message: {
      type: 'etat',
      demande: 1,
      classement: classerRecette(texte),
      empreinte: texte === '' ? null : fnv1a(octetsUtf8(texte)),
      profil,
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
    regarder: 'Le bloquant en tête de l’onglet, ses trois parties séparées, et la demande de mise à jour.',
    existe: true,
    atteinte: [etatDuFichier(JSON.stringify({ ...recetteParDefaut(), formatVersion: FORMAT_RECETTE + 1 }))],
  },
  {
    id: 'recette-illisible',
    titre: 'Recette illisible',
    quand: 'La recette rangée ne passe pas la validation : deux champs sont faux.',
    regarder: 'Le compte des champs invalides, le premier refus en mots du designer, et le bloquant sans écriture.',
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
      { saisie: { dans: '.champ-hexa', valeur: '#7C3AED' } },
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
  ...[
    ['premier-lancement-palette-creee', 'Premier lancement, palette créée', 'La première palette est ouverte, la recette est rangée.', 'L4.13'],
    ['configuration-de-la-recette', 'Configuration de la recette', 'Courbes, parts et seuils, avec le nombre de palettes que chaque champ modifie.', 'L4.18'],
    ['courbe-hors-garantie', 'Courbe hors garantie', 'Une clarté éditée ne tient plus 600 à 3:1 ou 700 à 4,5:1 contre le cran 50.', 'L4.18'],
    ['hexa-invalide', 'Hexa invalide', 'Le champ de référence refuse la saisie, l’aperçu ne change pas.', 'L4.13'],
    ['recette-modifiee-ailleurs', 'Recette modifiée ailleurs', 'Le rangement est refusé ; le geste « Recharger » est proposé.', 'L4.13'],
    ['derive-liee-tailwind', 'Dérive liée, préréglage Tailwind', 'Une courbe, repères Tailwind confondus avec les poignées.', 'L5.4'],
    ['derive-deliee-libre', 'Dérive déliée et libre', 'Deux courbes, repères Tailwind visibles à l’écart.', 'L5.4'],
    ['reference-hors-rampe', 'Référence hors de la rampe', 'Une poignée masquée et sa note.', 'L5.4'],
    ['dessin-en-cours', 'Dessin en cours', 'Progression, aucun geste possible.', 'L6.11'],
    ['dessin-interrompu', 'Dessin interrompu', 'Message d’erreur, cadre non posé, geste « Réessayer ».', 'L6.11'],
    ['confirmation-six-palettes', 'Confirmation au-delà de six palettes', '« Dessiner toutes les palettes » demande confirmation.', 'L6.11'],
    ['planche-sans-palette', 'Onglet Planche sans palette', 'Aucun cadre à dessiner, geste vers l’onglet Palettes.', 'L6.11'],
    ['police-indisponible', 'Police indisponible', 'Bloquant, aucun cadre posé.', 'L6.11'],
    ['planche-a-jour', 'Planche à jour', 'Toutes les palettes sont à jour.', 'L6.15'],
    ['planche-perimee', 'Planche périmée', 'Cadres nommés, geste « Redessiner ».', 'L6.15'],
    ['cadre-orphelin', 'Cadre orphelin', 'Palette supprimée, cadre toujours sur la page.', 'L6.15'],
    ['copie-de-cadre', 'Copie de cadre', 'Notice, la copie n’est pas réécrite.', 'L6.15'],
    ['calques-etrangers', 'Calques étrangers', 'Confirmation avant dessin, qui nomme les calques ajoutés.', 'L6.15'],
    ['document-display-p3', 'Document Display P3', 'Notice de conversion.', 'L6.15'],
    ['import-invalide', 'Import invalide', 'Erreurs de forme, recette rangée intacte.', 'L7.6'],
    ['ecart-d-import', 'Écart d’import', 'Palettes et paramètres modifiés, confirmation.', 'L7.6'],
  ].map(([id, titre, quand, attendu]) => ({ id, titre, quand, regarder: null, existe: false, attendu })),
];

module.exports = { ETATS };
