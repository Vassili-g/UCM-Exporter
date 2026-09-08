
/**
 * L'inventaire des états de l'interface, sous une forme atteignable.
 */
const fs = require('fs');
const path = require('path');

/**
 * Les textes de connexion sont lus au sandbox, jamais recopiés ici.
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
const { etatDesTokens } = chargerSandbox('tokens/exportTokens');
const { verdictDePrevol } = chargerSandbox('prevol');

/** Le verdict du pré-vol, calculé par le sandbox et non recopié ici. */
const verdict = (entree) => ({
  message: {
    type: 'verdict',
    ...verdictDePrevol(entree),
    etat: entree.avertissements > 0 ? 'warning' : '',
  },
});

/**
 * La version de schéma est lue à sa source. Une capture qui afficherait un
 * numéro que le code ne produit plus enseignerait exactement le contraire de
 * ce que ce pied de page existe pour dire.
 */
const VERSION_CONTRAT = /CONTRACT_VERSION = '([^']+)'/.exec(
  fs.readFileSync(path.resolve(__dirname, '../../kit/src/format/version.ts'), 'utf8'),
)[1];

/*
 * Les avertissements ci-dessous sont copiés du moteur, verbatim, parce que
 * le protocole de relecture exige de regarder l'interface sous le pire contenu
 * réel et non sous
 * un texte d'exemple qui tiendrait toujours sur une ligne. Ce sont des
 * échantillons, pas une autorité : si le moteur reformule le sien, la capture
 * perd un peu de réalisme, rien de plus.
 *
 * Ils sont écrits en trois parties, comme le moteur les écrit : une
 * carte se regarde avec les longueurs réelles de chacune, pas avec un
 * paragraphe recoupé pour la capture.
 */
const AVERTISSEMENT_STROKE = { // extractSlotTokens.ts, strokeAlignment
  titre: "Layer « Border » : l’alignement du stroke est illisible.",
  impact: "Le contrat ne dira pas s’il est inside, center ou outside.",
  action: "Vérifiez ce réglage dans Figma, puis réexportez.",
};
const AVERTISSEMENT_AUTO_LAYOUT = { // extractLayout.ts, warnMissingDirection
  titre: "Layer « Button / Primary » : il n'utilise pas d'auto layout.",
  impact: "Le contrat annonce malgré tout une disposition horizontale, la seule qu'il sache écrire par défaut, et le développeur placera donc ses layers autrement que dans Figma.",
  action: "Appliquez un auto layout à ce layer, puis réexportez.",
};
const AVERTISSEMENT_TEXT_STYLE = { // extractVariantTypography.ts — nomme un style, pas un node
  titre: "Text style « Body / Regular », line height : aucune variable Figma n'est reliée.",
  impact: "Cette propriété typographique manquera au développeur.",
  action: "Reliez-la à une variable dans le text style, puis réexportez.",
};
const AVERTISSEMENT_COMPOSE = { // exportComponent.ts, dépendance non placée
  titre: "Layer « Icon slot » : il porte le composant « Icon », qui a son propre contrat, mais le contrat n'a trouvé aucun emplacement où le situer.",
  impact: "La dépendance ne sera ni décrite dans structure.children, ni déclarée dans composes : le développeur ne la rendra pas.",
  action: "Placez ce layer dans l'auto layout frame que le composant décrit, puis réexportez.",
};

const COMPOSANT = 'Button / Primary';
const CHEMIN = 'src/components/Button/Button.contract.json';
const CHEMIN_STRESSTEST = 'src/components/StressTest/StressTest.contract.json';
const CHEMIN_TOKENS = 'src/tokens/tokens.json';
/** Qui a décidé de l'emplacement : le verdict le dit. */
const SOURCE_CONFIG = 'ucm.config.json';
const BRANCHE_EN_VOL = 'ucm-exporter/export-component-2026-09-05-1412';
const URL_PR = 'https://github.com/mon-org/design-system-v3/pull/128';

/** Les deux messages que le sandbox envoie à l'ouverture, avant toute action. */
const ouverture = (cause, tokens = TOKENS_PRESENTS) => [
  { message: { type: 'schema-version', version: VERSION_CONTRAT } },
  { message: { type: 'connection', ...etatDeConnexion(cause) } },
  cause === 'non-configure' ? DEPOT_ABSENT : DEPOT_DECRIT,
  tokens,
];

/**
 * Ce que le fichier porte en variables, calculé par le sandbox.
 *
 * Les deux cas doivent se regarder côte À côte : c'est leur voisinage qui dit
 * si l'absence de bouton se lit comme une réponse (« ce fichier n'a pas de
 * tokens ») ou comme une commande qui aurait disparu.
 */
const tokensDuFichier = (compte) => ({ message: { type: 'tokens', ...etatDesTokens(compte) } });
const TOKENS_PRESENTS = tokensDuFichier({ collections: 3, variables: 128, modes: 2 });
const TOKENS_ABSENTS = tokensDuFichier({ collections: 0, variables: 0, modes: 0 });

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
  hasPat: true,
};

/**
 * Un point à corriger relevé par l'export : ses trois parties, et le node
 * de son sujet quand il en a un.
 *
 * L'absence de `nodeId` n'est pas un raccourci de la galerie : c'est l'état
 * réel d'un message qui nomme un text style, une variable, ou un calque agrégé
 * sur toute la matrice. Les deux formes doivent se regarder côte À côte, parce
 * que c'est leur voisinage qui dit si l'absence du bouton « Afficher dans
 * Figma » se lit comme une réponse ou comme un oubli.
 */
const diagnostic = (point, nodeId) => ({
  message: { type: 'diagnostic', ...point, ...(nodeId ? { nodeId } : {}) },
});

/** Vingt avertissements réels : le volume que le protocole de relecture exige. */
function vingtAvertissements() {
  const modeles = [AVERTISSEMENT_STROKE, AVERTISSEMENT_AUTO_LAYOUT, AVERTISSEMENT_COMPOSE];
  const lignes = [];
  for (let rang = 0; rang < 20; rang += 1) {
    const modele = modeles[rang % modeles.length];
    lignes.push(diagnostic({
      ...modele,
      titre: modele.titre.replace('« Border »', `« Border ${rang + 1} »`),
    }));
  }
  return lignes;
}

/**
 * Un état : son identité, la situation réelle qui l'amène, la suite exacte qui
 * le reproduit, et ce qu'on regarde dessus.
 *
 * `existe: false` marque une situation que l'interface ne sait pas montrer
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
      "L'écran au repos : deux cartes, et AUCUN geste sur la première. Le bouton d'analyse n'est plus affiché puis grisé — la raison écrite à la place du nom se suffit.",
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
      'Deux layers sélectionnés, dont un qui n’est pas un composant. L’écran distingue ce cas de « aucune sélection ».',
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
      "Il n'y a plus de bouton du tout. Comparer avec « composant prêt » : c'est l'apparition du geste qui dit qu'une cible est là, pas son passage du gris au bleu.",
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
      "Les deux cartes au repos : surtitre, sujet, geste. Aucune des deux ne porte de résultat tant que rien n'a tourné, et le geste de publication n'existe nulle part.",
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
      "Après le clic sur « Exporter le composant ». La carte se vide de son résultat précédent, la note dit « Traitement en cours… », puis le sandbox écrit « Analyse du composant… ».",
    regarder:
      "Ce que l'écran perd au clic : le nom du composant et l'état de la sélection. Rien ne dit sur quoi porte l'attente.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
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
      { clic: '.carte-composant .btn-primary' },
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
      "Le verdict DANS la carte du composant, sous le geste qui l'a produit, et il nomme lui-même qui a décidé de l'emplacement. Le bouton d'analyse est désarmé : cette cible-là est analysée.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 0 }),
    ],
  },
  {
    id: 'resultat-un-avertissement',
    titre: 'Résultat avec un avertissement',
    quand:
      "Un export qui publie et laisse un geste à faire dans Figma. L'avertissement employé est parmi les plus longs que le moteur produise.",
    regarder:
      "L'ordre de lecture d'une carte de commande : le geste, la publication, le verdict, puis le point à corriger. Tout est dans la carte du composant, et la carte des tokens reste intacte en dessous.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      diagnostic(AVERTISSEMENT_COMPOSE),
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 1 }),
    ],
  },
  {
    id: 'resultat-avertissement-localisable',
    titre: 'Un avertissement qui mène à son calque',
    quand:
      "Un export dont un avertissement nomme un calque du composant, et un autre nomme un style de texte. Le premier porte le node de son sujet, le second n'en a aucun.",
    regarder:
      "Les deux entrées CÔTE À CÔTE. La première se clique et souligne au survol ; la seconde est un paragraphe. C'est ce voisinage qui décide si l'absence de lien se lit comme une réponse ou comme un oubli — et c'est pour lui que la loi de couverture existe.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      diagnostic(AVERTISSEMENT_STROKE, '12:345'),
      diagnostic(AVERTISSEMENT_TEXT_STYLE),
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 2 }),
    ],
  },
  /*
   * Les trois issues d'un export, côte à côte.
   *
   * `resultat-transformations-normales` est la publication saine, celle qui a
   * fait retirer le canal des constats : sept transformations dans le contrat,
   * zéro carte à l'écran.
   * `resultat-un-avertissement` est la correction demandée. `export-impossible`
   * est le refus. Les regarder ensemble est la seule façon de juger si le
   * verdict porte bien le rang 1 et si le rouge reste réservé au troisième.
   */
  {
    id: 'resultat-transformations-normales',
    titre: 'Stresstest, transformations normales',
    quand:
      "L'export réel de « Stresstest » : composition, structure et auto layout propres à un variant, pistes FIXED d'une grille, taille résolue sous une piste qui hug, calque en position Absolute, rotation dans un flux, contenu de maquette différent. Le contrat porte les sept ; le moteur n'en dit aucun.",
    regarder:
      "Ce qu'on NE voit pas : aucun groupe de diagnostic, aucune carte, aucun compteur. L'écran d'un export sain est son verdict et sa publication, rien d'autre. C'est l'état qui a fait retirer le canal des constats : avant, il montrait sept constats dont la conclusion était « rien à faire ».",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      cible([{ type: 'COMPONENT_SET', name: 'Stresstest', variants: 6 }]),
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: 'Lecture des composants imbriqués…' } },
      verdict({
        code: 'a-publier',
        genre: 'component',
        chemin: CHEMIN_STRESSTEST,
        source: SOURCE_CONFIG,
        avertissements: 0,
      }),
    ],
  },
  {
    id: 'export-impossible',
    titre: 'Export impossible',
    quand:
      "Un Component Set sans aucun variant COMPONENT. Le moteur lève avant toute extraction : rien n'est lu, rien n'est écrit.",
    regarder:
      "Le ROUGE, et le fait qu'il soit seul. Il vit dans la note de rang 1, jamais dans une carte : une carte ambre demande une correction, ce message-ci dit que l'export n'a pas eu lieu.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      cible([{ type: 'COMPONENT_SET', name: 'Stresstest', variants: 0 }]),
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      {
        message: {
          type: 'status',
          state: 'error',
          text: 'Export impossible pour « Stresstest » : ce Component Set ne contient aucun '
            + 'variant COMPONENT. Ajoutez au moins un variant dans Figma, puis réexportez.',
        },
      },
    ],
  },
  {
    id: 'resultat-vingt-avertissements',
    titre: 'Résultat avec vingt avertissements',
    quand:
      "Une matrice de variants dont le layout n'est pas tokenisé. C'est le volume que le protocole de relecture exige de regarder.",
    regarder:
      "Le compte rendu tient-il ? Vingt cartes ambre DANS la carte du composant, le compte dans le titre du groupe, et la carte des tokens repoussée très loin sous elles.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      ...vingtAvertissements(),
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 20 }),
    ],
  },
  {
    id: 'resultat-identique',
    titre: 'Résultat identique au dépôt',
    quand:
      "Le contrat est déjà sur la branche de base, mot pour mot. `publishArtifact` rend `unchanged` et n'écrit rien.",
    regarder:
      "Le verdict « aucun changement » et son ENDROIT, au même rang visuel qu'une pull request créée.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({ code: 'identique', genre: 'component', ou: 'branche main', avertissements: 0 }),
    ],
  },
  {
    id: 'doublon-pull-request',
    titre: 'Une pull request est déjà ouverte pour ce composant',
    quand:
      "Réexport d'un contenu identique pendant qu'une pull request d'export l'attend. C'est le cas du doublon de pull request.",
    regarder:
      "L'endroit et le lien arrivent ensemble. Le navigateur ne s'ouvre PAS : le lien est la seule sortie, et il vit sous le verdict, sans titre de groupe pour le coiffer.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
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
      "Entre la fin de l'analyse et la création de la pull request. Les deux attentes portent des textes distincts.",
    regarder:
      "L'attente change de nom quand elle change de nature : plus rien ne se lit dans Figma, tout se joue sur GitHub.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
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
      "Trois causes distinctes arrivent sous le même message brut, et le résultat d'analyse a disparu.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
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
      "La ligne ambre « Aucun repository connecté » : le seul reste du bloc destination, et la seule chose qu'il disait que rien d'autre ne dit avant le clic.",
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
      "Le repli a été ANNONCÉ avant le clic, en ambre sous le compte rendu, et le verdict le confirme ensuite au lieu de l'apprendre.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({ code: 'sans-depot', genre: 'component', avertissements: 0 }),
    ],
  },
  {
    id: 'fichier-sans-tokens',
    titre: 'Fichier sans aucune variable',
    quand:
      "Un fichier Figma qui ne définit aucune variable locale. Le bouton partait quand même, et `handleExportTokens` levait « Aucune variable locale à exporter » APRÈS le clic.",
    regarder:
      "La carte des tokens sans son geste : une phrase à la place du bouton, en couleur de constat et non d'erreur — ce fichier n'a rien de fautif, il n'a simplement rien à exporter.",
    existe: true,
    atteinte: [
      ...ouverture('connecte', TOKENS_ABSENTS),
      SELECTION_PRETE,
    ],
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
      'Un blocage TARDIF : il arrive après une analyse complète, alors que la lecture pourrait se faire au test de connexion.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
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
      'La seconde commande. Elle ignore la sélection et lit les variables du fichier entier, ce que rien à l’écran ne dit.',
    regarder:
      "Une commande de portée FICHIER menée à son terme SANS sélection : la carte du composant reste vide et sans geste, et le libellé de publication a nommé les tokens.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_VIDE,
      { clic: '.carte-tokens .btn-secondary' },
      { message: { type: 'status', state: 'loading', text: 'Lecture des variables…' } },
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
      { clic: '.carte-composant .btn-primary' },
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
      "Trois champs, et aucun chemin : l'endroit appartient au repository. L'en-tête suit la page.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      {
        message: {
          type: 'settings',
          settings: { repoUrl: '', baseBranch: 'main', hasPat: false },
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
      "Le placeholder du token porte une règle de comportement, et « Supprimer le token enregistré » n'apparaît que s'il y a quelque chose à supprimer.",
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
          settings: { repoUrl: 'https://gitlab.com/mon-org/ds', baseBranch: '', hasPat: false },
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
      "Le test de connexion a lu `ucm.config.json` sur la branche de base. Cette lecture n'avait lieu qu'à la publication, et le designer l'apprenait après coup.",
    regarder:
      "La phrase nomme les deux chemins et le fichier qui les porte. Elle se lit, elle ne se saisit pas.",
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
    id: 'configuration-chemins-par-defaut',
    titre: 'Le repository n’a pas de configuration, et le plugin le signale',
    quand:
      "Le repository n'a pas de `ucm.config.json`. C'est le cas nominal d'un dépôt neuf, et les défauts qui s'appliquent ici sont ceux que `ucm check` applique de son côté.",
    regarder:
      "Le bloc porte un filet de sévérité, et il le porte AVANT l'export. Le nom du fichier à écrire est en gras dans la phrase qui le demande.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      { message: { type: 'settings', settings: REGLAGES } },
      depot({ components: 'components', tokens: 'tokens.json', source: 'les valeurs par défaut' }),
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
