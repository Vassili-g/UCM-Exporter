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

const { FORMAT_RECETTE, classerRecette, fnv1a, octetsUtf8, recetteParDefaut } = chargerLeMoteur();

/** L'état que le sandbox envoie pour un texte rangé sous la clé de la recette. */
function etatDuFichier(texte) {
  return {
    message: {
      type: 'etat',
      demande: 1,
      classement: classerRecette(texte),
      empreinte: texte === '' ? null : fnv1a(octetsUtf8(texte)),
      profil: 'SRGB',
    },
  };
}

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
  ...[
    ['premier-lancement-palette-creee', 'Premier lancement, palette créée', 'La première palette est ouverte, la recette est rangée.', 'L4.13'],
    ['palette-en-saisie', 'Palette en saisie', 'L’aperçu suit la saisie, rien n’est dessiné.', 'L4.6'],
    ['configuration-de-la-recette', 'Configuration de la recette', 'Courbes, parts et seuils, avec le nombre de palettes que chaque champ modifie.', 'L4.18'],
    ['courbe-hors-garantie', 'Courbe hors garantie', 'Une clarté éditée ne tient plus 600 à 3:1 ou 700 à 4,5:1 contre le cran 50.', 'L4.18'],
    ['hexa-invalide', 'Hexa invalide', 'Le champ de référence refuse la saisie, l’aperçu ne change pas.', 'L4.13'],
    ['recette-modifiee-ailleurs', 'Recette modifiée ailleurs', 'Le rangement est refusé ; le geste « Recharger » est proposé.', 'L4.13'],
    ['notice-legacy', 'Notice LEGACY', 'Le document n’a pas de profil de couleur géré.', 'L4.6'],
    ['derive-liee-tailwind', 'Dérive liée, préréglage Tailwind', 'Une courbe, repères Tailwind confondus avec les poignées.', 'L5.4'],
    ['derive-deliee-libre', 'Dérive déliée et libre', 'Deux courbes, repères Tailwind visibles à l’écart.', 'L5.4'],
    ['reference-hors-rampe', 'Référence hors de la rampe', 'Une poignée masquée et sa note.', 'L5.4'],
    ['couleur-presque-grise', 'Couleur presque grise', 'Éditeur désactivé, alerte.', 'L4.6'],
    ['promesses-manquees', 'Palette avec promesses manquées', 'Verdict et lignes au premier rang.', 'L4.6'],
    ['alertes-seules', 'Palette avec alertes seules', 'Verdict « prête », alertes dessous.', 'L4.6'],
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
