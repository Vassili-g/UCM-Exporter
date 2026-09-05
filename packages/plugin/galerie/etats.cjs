/**
 * L'inventaire des états de l'interface (U1.1), sous une forme ATTEIGNABLE.
 *
 * **Pourquoi c'est un fichier de données et pas un paragraphe.** U1.1 demande
 * trois choses d'un état : qu'il soit atteignable, qu'il soit regardé dans les
 * deux thèmes, et qu'il serve de liste de vérification aux phases suivantes.
 * Une liste en prose ne tient que la troisième, et encore : elle vieillit sans
 * rougir. Ici l'inventaire EST le scénario — chaque état porte la suite exacte
 * de messages qui le produit, `build-galerie.cjs` en fabrique une page, et
 * `tests/galerie.test.ts` refuse qu'un message déclaré dans `messages.ts` n'ait
 * aucun état où être regardé. Un état ajouté en silence devient impossible.
 *
 * **Ce que la galerie n'est pas.** Elle ne remplace pas Figma : les couleurs y
 * viennent d'un décalque (`theme-figma.css`), pas de l'hôte. Elle sert à juger
 * la hiérarchie, la densité et la place des choses — pas à conclure sur un
 * contraste. U1.8 reste une vérification dans Figma.
 */
const fs = require('fs');
const path = require('path');

/**
 * Les textes de connexion sont LUS au sandbox, jamais recopiés ici.
 *
 * `etatDeConnexion` est leur unique autorité (U5.2) ; une galerie qui en
 * garderait une copie montrerait un jour des phrases que le plugin ne dit plus,
 * et c'est exactement ce qu'une galerie ne doit pas pouvoir faire. `esbuild`
 * est déjà une dépendance du paquet : compiler ce seul module coûte quelques
 * millisecondes.
 */
function chargerSandbox(nom) {
  const compile = path.resolve(__dirname, `../dist/galerie-${nom}.cjs`);
  require('esbuild').buildSync({
    entryPoints: [path.resolve(__dirname, `../src/${nom}.ts`)],
    outfile: compile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
  });
  return require(compile);
}

const { etatDeConnexion, etatDuDepot, gesteApresEchecDePublication } = chargerSandbox('connexion');
const { etatDeCible, detailDeCible } = chargerSandbox('cible');
const { resumeDesTokens } = chargerSandbox('tokens/exportTokens');
const { verdictDePrevol } = chargerSandbox('prevol');

/** Le verdict du pré-vol, calculé par le sandbox et non recopié ici (U3.1). */
const verdict = (entree) => ({
  message: {
    type: 'verdict',
    ...verdictDePrevol(entree),
    etat: entree.avertissements > 0 ? 'warning' : '',
  },
});

/**
 * La version de schéma est LUE à sa source. Une capture qui afficherait un
 * numéro que le code ne produit plus enseignerait exactement le contraire de
 * ce que ce pied de page existe pour dire (U0.1).
 */
const VERSION_CONTRAT = /CONTRACT_VERSION = '([^']+)'/.exec(
  fs.readFileSync(path.resolve(__dirname, '../../kit/src/format/version.ts'), 'utf8'),
)[1];

/*
 * Les avertissements ci-dessous sont copiés du moteur, verbatim, parce que
 * U1.3 (d) exige de regarder l'interface sous le PIRE CONTENU RÉEL et non sous
 * un texte d'exemple qui tiendrait toujours sur une ligne. Ce sont des
 * échantillons, pas une autorité : si le moteur reformule le sien, la capture
 * perd un peu de réalisme, rien de plus.
 */
const AVERTISSEMENT_STROKE = // extractSlotTokens.ts, strokeAlignment
  "Layer « Border » : l’alignement du stroke est illisible. Le contrat ne dira pas s’il est inside, center ou outside. Vérifiez ce réglage dans Figma, puis réexportez.";
const AVERTISSEMENT_AUTO_LAYOUT = // extractLayout.ts, warnMissingDirection
  "Layer « Button / Primary » : il n'utilise pas d'auto layout. Le contrat annonce malgré tout une disposition horizontale, la seule qu'il sache écrire par défaut, et le développeur placera donc ses layers autrement que dans Figma. Appliquez un auto layout à ce layer, puis réexportez.";
const AVERTISSEMENT_COMPOSE = // exportComponent.ts, dépendance non placée
  "Layer « Icon slot » : il porte le composant « Icon », qui a son propre contrat, mais le contrat n'a trouvé aucun emplacement où le situer. La dépendance ne sera ni décrite dans structure.children, ni déclarée dans composes : le développeur ne la rendra pas. Placez ce layer dans l'auto layout frame que le composant décrit, puis réexportez.";
const NOTE_ROTATION = // extractLayout.ts, rotation publiée — une NOTE, aucun geste
  "Layer « Chevron » : sa rotation est publiée, et le développeur la rendra. Figma espace toutefois ses voisins d'après sa boîte tournée, là où le rendu web garde sa boîte droite : la place qu'il prend dans « Row » peut différer de quelques pixels. Aucune modification du design n'est demandée.";

const COMPOSANT = 'Button / Primary';
const CHEMIN = 'src/components/Button/Button.contract.json';
const CHEMIN_TOKENS = 'src/tokens/tokens.json';
const BRANCHE_EN_VOL = 'ucm-exporter/export-component-2026-09-05-1412';
const URL_PR = 'https://github.com/mon-org/design-system-v3/pull/128';

/** Les deux messages que le sandbox envoie à l'ouverture, avant toute action. */
const ouverture = (cause) => [
  { message: { type: 'schema-version', version: VERSION_CONTRAT } },
  { message: { type: 'connection', ...etatDeConnexion(cause) } },
  cause === 'non-configure' ? DEPOT_ABSENT : DEPOT_DECRIT,
  { message: { type: 'tokens', resume: resumeDesTokens({ collections: 3, variables: 128, modes: 2 }) } },
];

/** Ce que `reportSelectionState` envoie, calculé par le sandbox lui-même. */
function cible(selection, avertissement = null) {
  const etat = etatDeCible(selection);
  return {
    message: { type: 'cible', ...etat, detail: detailDeCible(etat.cible), avertissement },
  };
}

const SELECTION_VIDE = cible([]);
const SELECTION_MULTIPLE = cible([
  { type: 'COMPONENT', name: 'Button / Primary' },
  { type: 'FRAME', name: 'Card' },
]);
const SELECTION_PRETE = cible([{ type: 'COMPONENT_SET', name: COMPOSANT, variants: 12 }]);

/** La destination, telle que le test de connexion l'a apprise. */
const DEPOT_VISE = { owner: 'mon-org', repo: 'design-system-v3', baseBranch: 'main' };
const depot = (layout, vise = DEPOT_VISE) => ({
  message: { type: 'depot', ...etatDuDepot(layout, vise) },
});
const DEPOT_DECRIT = depot({
  components: 'src/components',
  tokens: 'src/tokens/tokens.json',
  source: 'ucm.config.json',
});
const DEPOT_ABSENT = depot(null, null);

/** Les réglages publics rechargés par `refreshConfiguration`. */
const REGLAGES = {
  repoUrl: 'https://github.com/mon-org/design-system-v3',
  baseBranch: 'main',
  componentsPath: 'src/components',
  tokensPath: 'src/tokens',
  hasPat: true,
};

/** Un constat de l'export, avec la nature que `runExport` lui donne (U4.1). */
const diagnostic = (nature, texte) => ({ message: { type: 'diagnostic', nature, texte } });

/** Vingt avertissements réels : le volume que U1.3 (d) exige de regarder. */
function vingtAvertissements() {
  const modeles = [AVERTISSEMENT_STROKE, AVERTISSEMENT_AUTO_LAYOUT, AVERTISSEMENT_COMPOSE];
  const lignes = [];
  for (let rang = 0; rang < 20; rang += 1) {
    const modele = modeles[rang % modeles.length].replace('« Border »', `« Border ${rang + 1} »`);
    lignes.push(diagnostic('avertissement', modele));
  }
  return lignes;
}

/**
 * Un état : son identité, la situation réelle qui l'amène, la suite exacte qui
 * le reproduit, et ce qu'on regarde dessus.
 *
 * `existe: false` marque une situation que l'interface ne sait PAS montrer
 * aujourd'hui. Elle reste dans l'inventaire, avec la tâche qui la créera :
 * c'est la moitié la plus utile de la liste, celle qu'on oublie sinon.
 */
const ETATS = [
  {
    id: 'selection-absente',
    titre: 'Aucune sélection',
    quand:
      "À l'ouverture, rien de sélectionné dans Figma. Couvre aussi « connecté » : la pastille verte n'a pas d'autre écran.",
    regarder:
      "Rang 1 de U1.0 — la cible. Il n'y en a pas : la note occupe la place où devrait vivre un nom de composant.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_VIDE,
    ],
  },
  {
    id: 'selection-non-exportable',
    titre: 'Sélection non exportable',
    quand:
      'Deux layers sélectionnés, dont un qui n’est pas un composant. C’était le même écran que « aucune sélection » avant U2.1.',
    regarder:
      'La raison nomme ce qui empêche, et elle diffère de celle d’une sélection vide : le geste n’est pas le même.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_MULTIPLE,
    ],
  },
  {
    id: 'commande-composant-desactivee',
    titre: 'Le bouton composant refuse de partir',
    quand:
      "Aucune sélection exportable. Le bouton partait quand même, et la précondition levait un message d'erreur après coup.",
    regarder:
      "Un aller-retour épargné, et rien de plus : la raison est déjà écrite au-dessus du bouton, elle n'est pas répétée dessous.",
    existe: true,
    atteinte: [...ouverture('connecte'), SELECTION_VIDE],
  },
  {
    id: 'regle-usage-absente',
    titre: "Composant sans règle d'usage exploitable",
    quand: 'Un component set sélectionné, sans conteneur de règles lisible.',
    regarder:
      "Rang 2 : c'est un avertissement, et il est rendu par une note d'information — même bloc, même place, une couleur de plus.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      cible(
        [{ type: 'COMPONENT_SET', name: COMPOSANT, variants: 12 }],
        'Aucune règle d’usage exploitable ne documente quand l’utiliser. Les diagnostics diront '
          + 'ce que le contrat sait décrire, et intent vaudra null.',
      ),
    ],
  },
  {
    id: 'composant-pret',
    titre: 'Composant prêt',
    quand: 'Un component ou component set sélectionné, règles lisibles.',
    regarder:
      "Rang 1 : le nom du composant. Il n'apparaît qu'ici, dans une phrase, et le premier clic l'efface.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
    ],
  },
  {
    id: 'analyse-en-cours',
    titre: 'Analyse en cours',
    quand:
      "Après le clic sur « Exporter le composant ». Le journal est vidé, la note dit « Traitement en cours… », puis le sandbox écrit « Analyse du composant… ».",
    regarder:
      "Ce que l'écran a PERDU au clic : le nom du composant et l'état de la sélection. Rien ne dit sur quoi porte l'attente.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
    ],
  },
  {
    id: 'analyse-par-phase',
    titre: 'Analyse en cours, une phase nommée',
    quand:
      "Le balayage des pages, la phase la plus longue et celle qui fige l'écran le plus longtemps.",
    regarder:
      "L'étape est nommée par ce que le code FAIT, sans durée ni pourcentage : la mesure n'existe pas.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: 'Lecture des composants imbriqués…' } },
    ],
  },
  {
    id: 'resultat-propre',
    titre: 'Résultat propre, pull request créée',
    quand:
      'Export sans avertissement, publication réussie. Couvre « publiée » : le succès et la publication sont le même écran.',
    regarder:
      "Rang 1 : le verdict. Il est en fin de phrase, après le libellé de succès, et le journal répète le même texte une ligne plus bas.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'log', text: `Emplacement : ${CHEMIN} (d'après ucm.config.json).` } },
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, avertissements: 0 }),
    ],
  },
  {
    id: 'resultat-un-avertissement',
    titre: 'Résultat avec un avertissement',
    quand:
      "Un export qui publie et laisse un geste à faire dans Figma. L'avertissement employé est parmi les plus longs que le moteur produise (U1.3 d).",
    regarder:
      "Rang 2 : l'avertissement. Il arrive en 11 px monospace dans un journal de 96 px, sous une puce, sans niveau — `runExport` l'envoie sans `level`.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      diagnostic('avertissement', AVERTISSEMENT_COMPOSE),
      diagnostic('constat', NOTE_ROTATION),
      { message: { type: 'log', text: `Emplacement : ${CHEMIN} (d'après ucm.config.json).` } },
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, avertissements: 1 }),
    ],
  },
  {
    id: 'resultat-vingt-avertissements',
    titre: 'Résultat avec vingt avertissements',
    quand:
      "Une matrice de variants dont le layout n'est pas tokenisé. C'est le volume que U1.3 (d) exige de regarder.",
    regarder:
      'Le compte rendu tient-il ? Vingt entrées dans 144 px de haut, et rien ne dit combien il en reste hors de vue.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      ...vingtAvertissements(),
      { message: { type: 'log', text: `Emplacement : ${CHEMIN} (d'après ucm.config.json).` } },
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, avertissements: 20 }),
    ],
  },
  {
    id: 'resultat-identique',
    titre: 'Résultat identique au dépôt',
    quand:
      "Le contrat est déjà sur la branche de base, mot pour mot. `publishArtifact` rend `unchanged` et n'écrit rien.",
    regarder:
      "Le verdict « aucun changement » et son ENDROIT (T4.5), au même rang visuel qu'une pull request créée.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'log', text: `Emplacement : ${CHEMIN} (d'après ucm.config.json).` } },
      verdict({ code: 'identique', genre: 'component', ou: 'branche main', avertissements: 0 }),
    ],
  },
  {
    id: 'doublon-pull-request',
    titre: 'Une pull request est déjà ouverte pour ce composant',
    quand:
      "Réexport d'un contenu identique pendant qu'une pull request d'export l'attend. C'est le cas que T4.5 a rendu visible.",
    regarder:
      "L'endroit et le lien arrivent ensemble. Le navigateur ne s'ouvre PAS : le lien est la seule sortie, et il est en bas d'un journal.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'log', text: `Emplacement : ${CHEMIN} (d'après ucm.config.json).` } },
      { message: { type: 'pull-request', url: URL_PR, path: CHEMIN } },
      verdict({
        code: 'identique',
        genre: 'component',
        ou: `pull request d'export ouverte, branche ${BRANCHE_EN_VOL}`,
        avertissements: 0,
      }),
    ],
  },
  {
    id: 'publication-en-cours',
    titre: 'Publication en cours',
    quand:
      "Entre la fin de l'analyse et la création de la pull request. Les deux attentes portaient le même texte avant U2.6.",
    regarder:
      "L'attente change de nom quand elle change de nature : plus rien ne se lit dans Figma, tout se joue sur GitHub.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: 'Publication sur GitHub…' } },
    ],
  },
  {
    id: 'echec-github-repli-local',
    titre: 'Échec GitHub, repli en téléchargement local',
    quand:
      'La publication échoue (droits, conflit, branche existante). Le fichier est téléchargé, la branche créée est supprimée.',
    regarder:
      "Trois causes distinctes arrivent sous le même message brut (U5.3), et le résultat d'analyse a disparu (U3.3).",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'log', text: `Emplacement : ${CHEMIN} (d'après ucm.config.json).` } },
      {
        message: {
          type: 'log',
          text: 'Échec GitHub : GitHub a répondu 403 sur POST /repos/mon-org/design-system-v3/git/refs.',
        },
      },
      {
        message: {
          type: 'download',
          filename: 'Button.contract.json',
          content: '{"contractVersion":"12.0"}',
        },
      },
      {
        message: {
          type: 'status',
          state: 'error',
          text: 'Échec GitHub. Le fichier a été téléchargé sur votre poste.',
        },
      },
      {
        message: {
          type: 'verdict',
          code: 'a-publier',
          texte: `Échec de la publication. ${gesteApresEchecDePublication(403)}`,
          action: 'Réessayer la publication',
          etat: 'error',
        },
      },
    ],
  },
  {
    id: 'depot-non-configure',
    titre: 'Dépôt non configuré, au repos',
    quand:
      "Premier lancement : aucun réglage GitHub. Rien d'autre que la pastille rouge ne l'annonce.",
    regarder:
      "Ce que le designer NE sait pas encore : que son export sera téléchargé au lieu d'être publié (U2.5).",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      SELECTION_PRETE,
    ],
  },
  {
    id: 'export-sans-depot',
    titre: 'Export sans dépôt : téléchargement local',
    quand: 'Le même export, mené à son terme sans configuration GitHub valide.',
    regarder:
      "Le repli est SUBI : il s'apprend à l'arrivée, en ligne de journal, alors que le bouton avait promis une pull request.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({ code: 'sans-depot', genre: 'component', avertissements: 0 }),
    ],
  },
  {
    id: 'premier-lancement-annonce',
    titre: 'Premier lancement, ce qui va se passer',
    quand:
      "Un état qui dirait « Aucun dépôt connecté : l'export sera téléchargé sur votre poste » AVANT le clic.",
    regarder: null,
    existe: false,
    attendu: 'U2.5',
  },
  {
    id: 'connexion-en-cours',
    titre: 'Connexion en cours',
    quand:
      "`refreshConfiguration` teste GitHub à l'ouverture. La pastille passe au gris le temps du GET.",
    regarder:
      "La pastille est au-dessus du titre du produit, et elle n'est pas cliquable alors qu'elle porte la seule information qui demande un geste.",
    existe: true,
    atteinte: [
      { message: { type: 'schema-version', version: VERSION_CONTRAT } },
      { message: { type: 'connection', ...etatDeConnexion('verification') } },
      SELECTION_VIDE,
    ],
  },
  {
    id: 'config-depot-illisible',
    titre: 'ucm.config.json mal formé',
    quand:
      "Le dépôt se décrit lui-même, mais son fichier n'est pas du JSON valide. `repositoryLayout` lève, et l'export est refusé.",
    regarder:
      'Un blocage TARDIF : il arrive après une analyse complète, alors que la lecture pourrait se faire au test de connexion (U5.1).',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      {
        message: {
          type: 'status',
          state: 'error',
          text: "ucm.config.json du repository n'est pas du JSON valide : impossible de savoir où écrire cet export. Un développeur doit corriger ce fichier.",
        },
      },
    ],
  },
  {
    id: 'export-tokens-reussi',
    titre: 'Export des tokens publié',
    quand:
      'La seconde commande. Elle ignore la sélection et lit les variables du fichier entier, ce que rien à l’écran ne dit (U2.4).',
    regarder:
      "La note parle encore de sélection au-dessus d'une action qui n'en tient aucun compte (U2.3).",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_VIDE,
      { clic: '.action-panel .btn-secondary' },
      { message: { type: 'status', state: 'loading', text: 'Lecture des variables…' } },
      {
        message: {
          type: 'log',
          text: `Emplacement : ${CHEMIN_TOKENS} (d'après réglages du plugin).`,
        },
      },
      { message: { type: 'pull-request', url: URL_PR, path: CHEMIN_TOKENS } },
      { message: { type: 'status', state: 'success', text: 'Tokens exportés. Pull request créée.' } },
    ],
  },
  {
    id: 'export-annule',
    titre: 'Export annulé',
    quand:
      "Clic sur « Annuler après cette étape » pendant une analyse. L'annulation est coopérative : elle prend effet à la fin de l'étape en cours.",
    regarder:
      "Le message dit que RIEN n'a été écrit. C'est la seule chose que le designer ait besoin de savoir.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.action-panel .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: 'Lecture des composants imbriqués…' } },
      { message: { type: 'status', state: 'error', text: "Export annulé. Rien n'a été écrit." } },
    ],
  },
  {
    id: 'erreur-ui',
    titre: 'Erreur JavaScript dans l’interface',
    quand:
      "Le gestionnaire `window.onerror`. Personne ne l'a jamais regardé, et il écrit dans les deux régions à la fois.",
    regarder:
      "Un message destiné au designer qui expose une trace technique et ne nomme aucun geste — la règle de rédaction ne l'a jamais atteint.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      { erreurUi: "Cannot read properties of undefined (reading 'name')" },
    ],
  },
  {
    id: 'configuration-vierge',
    titre: 'Configuration, aucun réglage enregistré',
    quand: "Clic sur l'engrenage au premier lancement.",
    regarder:
      "Cinq champs obligatoires, dont deux — les chemins — que le dépôt peut contredire sans le dire (U5.1). L'en-tête suit la page depuis U0.3.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      {
        message: {
          type: 'settings',
          settings: {
            repoUrl: '',
            baseBranch: 'main',
            componentsPath: 'src/components',
            tokensPath: 'src/tokens',
            hasPat: false,
          },
        },
      },
      { clic: '.icon-button' },
    ],
  },
  {
    id: 'configuration-remplie',
    titre: 'Configuration enregistrée, token conservé',
    quand: 'Retour dans la configuration après un enregistrement réussi.',
    regarder:
      "Le placeholder du token porte une règle de comportement, et « Supprimer le token enregistré » n'apparaît que s'il y a quelque chose à supprimer (U5.4).",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      { message: { type: 'settings', settings: REGLAGES } },
      { clic: '.icon-button' },
    ],
  },
  {
    id: 'configuration-erreurs-champs',
    titre: 'Configuration refusée par le sandbox',
    quand: '`saveSettings` renvoie ses erreurs de validation, champ par champ.',
    regarder:
      "Le rang de l'erreur est porté par la seule couleur, et le formulaire annonce dans six régions à la fois.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      {
        message: {
          type: 'settings',
          settings: {
            repoUrl: 'https://gitlab.com/mon-org/ds',
            baseBranch: '',
            componentsPath: 'src/components',
            tokensPath: 'src/tokens',
            hasPat: false,
          },
        },
      },
      { clic: '.icon-button' },
      {
        message: {
          type: 'settings-validation',
          errors: {
            repoUrl: 'Utilisez une URL https://github.com/owner/repo valide.',
            baseBranch: 'La branche de base est obligatoire.',
            githubPat: 'Le Personal Access Token est obligatoire.',
          },
        },
      },
      { message: { type: 'settings-save-error' } },
    ],
  },
  {
    id: 'configuration-connexion-reussie',
    titre: 'Configuration enregistrée et connectée',
    quand:
      "Après un enregistrement valide : `refreshConfiguration` renvoie les champs, puis l'état de connexion.",
    regarder:
      "Le même fait est dit deux fois — la pastille de l'en-tête et la phrase de statut — et l'une des deux n'est pas sur l'écran de travail.",
    existe: true,
    atteinte: [
      ...ouverture('verification'),
      { message: { type: 'settings', settings: REGLAGES } },
      { clic: '.icon-button' },
      { message: { type: 'connection', ...etatDeConnexion('connecte') } },
    ],
  },
  {
    id: 'connexion-jeton-refuse',
    titre: 'Jeton refusé, sur l’écran de travail',
    quand: "GitHub répond 401 au test d'ouverture. Deux autres causes existent — droits manquants (403) et repository introuvable (404) — et se corrigent autrement.",
    regarder:
      "La pastille NOMME la cause au lieu de dire « non connecté », et c'est un bouton : le geste se fait là où elle mène.",
    existe: true,
    atteinte: [
      ...ouverture('jeton-refuse'),
      SELECTION_VIDE,
    ],
  },
  {
    id: 'configuration-chemins-du-depot',
    titre: 'Le repository décrit lui-même ses chemins',
    quand:
      "Le test de connexion a lu `ucm.config.json` sur la branche de base. Cette lecture n'avait lieu qu'à la publication, et le designer l'apprenait par une ligne de journal.",
    regarder:
      "Les deux libellés portent « (repli) » et la phrase dit qui décide. Le champ qui ne sert à rien le dit là où on le lit.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      { message: { type: 'settings', settings: REGLAGES } },
      depot({
        components: 'packages/ui/src/components',
        tokens: 'packages/ui/src/tokens/design-tokens.json',
        source: 'ucm.config.json',
      }),
      { clic: '.icon-button' },
    ],
  },
  {
    id: 'configuration-aucun-chemin',
    titre: 'Personne ne dit où ranger les exports',
    quand:
      "Le cas neuf de U5.1 : les chemins ne sont plus obligatoires, et ce repository ne se décrit pas. L'export sera refusé au lieu d'écrire à un endroit inventé.",
    regarder:
      "Le refus est annoncé AVANT l'export, et la phrase nomme les deux gestes possibles avec leur acteur.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      {
        message: {
          type: 'settings',
          settings: { ...REGLAGES, componentsPath: '', tokensPath: '' },
        },
      },
      depot({ components: null, tokens: null, source: 'réglages du plugin' }),
      { clic: '.icon-button' },
    ],
  },
  {
    id: 'configuration-cause-affichee',
    titre: 'La cause de l’échec, là où on la corrige',
    quand: "Arrivée dans la configuration par la pastille, après un 403 : le jeton est reconnu mais n'a pas les droits.",
    regarder:
      "Le geste est écrit sous le formulaire, et il y était AVANT l'arrivée : le statut n'attend plus un enregistrement pour dire quelque chose.",
    existe: true,
    atteinte: [
      ...ouverture('acces-refuse'),
      { message: { type: 'settings', settings: REGLAGES } },
      { clic: '.icon-button' },
    ],
  },
];

module.exports = { ETATS, VERSION_CONTRAT };
