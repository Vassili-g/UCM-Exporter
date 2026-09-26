
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

const {
  etatDeCarte, etatDeConnexion, etatDuDepot, gesteApresEchecDePublication, refusDeDestinationChangee, textesDePublication,
  GESTE_DEPOTS_ILLISIBLES, TEXTES_DE_REPLI,
} = chargerSandbox('connexion');
const { TERMES_GITHUB, TERMES_GITLAB } = chargerSandbox('forges/termes');
const {
  cleDeDestination, identiteDuDepot, lireAdresseDuDepot, nomDuDepot, validateSettings, DEPOTS_ILLISIBLES,
} = chargerSandbox('config');
const { etatDeCible, detailDeCible } = chargerSandbox('cible');
const { annonceDuFormat, resumeDesTokens } = chargerSandbox('tokens/exportTokens');
const { verdictDePrevol } = chargerSandbox('prevol');

/** Le verdict du pré-vol ; un verdict `a-publier` nomme le repository GitHub, sauf mention contraire. */
const verdict = (entree) => ({ message: { type: 'verdict', ...verdictDePrevol({ nom: 'design-system-v3', ...entree }) } });

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
  impact: "Le contrat annonce par défaut une disposition horizontale : le développeur placera ses calques autrement que dans Figma.",
  action: "Appliquez un auto layout à ce calque, puis réexportez.",
};
const AVERTISSEMENT_TEXT_STYLE = { // extractVariantTypography.ts — nomme un style, pas un node
  titre: "Style de texte « Body / Regular », line height : aucune variable Figma n'est reliée.",
  impact: "Cette propriété typographique manquera au développeur.",
  action: "Reliez-la à une variable dans le style de texte, puis réexportez.",
};
const AVERTISSEMENT_SANS_TEXT_STYLE = { // extractVariantTypography.ts, loadTextStyle
  titre: "Layer « text » : aucun style de texte unique n'est appliqué.",
  impact: "Sa typographie manquera au développeur.",
  action: "Appliquez un style de texte au calque entier, puis réexportez.",
};
// Les trois messages qui visent la racine de chaque variant du set exporté.
const AVERTISSEMENT_BORNE_DES_VARIANTS = { // nodeBindings.ts, resolveSizeBounds
  titre: "Dimensions minimales ou maximales sans variable associée.",
  impact: "Ces variants définissent un **min width** sans variable. Ces valeurs ne seront pas exportées.",
  action: "Reliez ces paramètres à une variable dans chaque variant concerné, puis réexportez.",
};
const AVERTISSEMENT_OMBRE_DES_VARIANTS = { // effectStyles.ts, effet sans effect style
  titre: "effect : aucun style d’effets appliqué.",
  impact: "Le contrat ne transmettra pas les ombres ou les flous des variants concernés.",
  action: "Appliquez un style d’effets à chaque variant concerné, puis réexportez.",
};
const AVERTISSEMENT_FILL_DES_VARIANTS = { // extractSlotTokens.ts, warnPeinturesLibres
  titre: "fill : couleur sans variable associée.",
  impact: "Le contrat ne transmettra pas les couleurs sans variable associée.",
  action: "Reliez chaque couleur concernée à une variable dans les variants sélectionnés, puis réexportez.",
};
const AVERTISSEMENT_GAP_DES_VARIANTS = { // nodeBindings.ts, resolveGroup
  titre: "gap : aucune variable Figma n’est reliée à cette propriété.",
  impact: "Le contrat n'exportera pas cette propriété.",
  action: "Reliez cette propriété à une variable Figma, puis réexportez.",
};
const AVERTISSEMENT_COMPOSE = { // exportComponent.ts, dépendance non placée
  titre: "Layer « Icon slot » : il contient le composant « Icon », mais le contrat ne décrit ce calque nulle part.",
  impact: "Le développeur ne rendra pas « Icon » dans ce composant.",
  action: "Placez ce calque dans le cadre en auto layout qui porte le gap et le padding, puis réexportez.",
};

// code.ts, signalerLesImbriques. Sept propriétés : c'est ce volume qui a fait
// passer l'énumération en liste, et l'état doit le montrer.
const IMBRIQUE_SANS_REGLES_BOUTON = {
  severite: 'danger',
  titre: 'Le composant « Alert » intègre « Button », dont 7 propriétés ne sont pas documentées :',
  elements: ['color', 'variant', 'state', 'size', 'label', 'iconLeft', 'iconRight'],
  impact: 'Le contrat de « Alert » décrit les calques de « Button » sans indiquer qu’il faut réutiliser ce composant.',
  action: 'Sélectionnez le composant principal « Button », puis créez et complétez ses règles d’usage. Relancez ensuite l’analyse de « Alert ».',
};
const IMBRIQUE_SANS_REGLES_ICONE = {
  severite: 'danger',
  titre: 'Le composant « Alert » intègre « Icon », dont une propriété n’est pas documentée :',
  elements: ['iconName'],
  impact: 'Le contrat de « Alert » décrit les calques de « Icon » sans indiquer qu’il faut réutiliser ce composant.',
  action: 'Sélectionnez le composant principal « Icon », puis créez et complétez ses règles d’usage. Relancez ensuite l’analyse de « Alert ».',
};
/** Un imbriqué qui ne déclare rien : le point n'a aucune liste à poser. */
const IMBRIQUE_SANS_REGLES_NU = {
  severite: 'danger',
  titre: 'Le composant « Alert » intègre « Divider », qui n’a pas ses règles d’usage.',
  impact: 'Sans les règles de « Divider », le contrat de « Alert » décrit les internes de « Divider » au lieu de le réutiliser.',
  action: 'Créez et complétez les règles de « Divider », puis relancez l’analyse de « Alert » avant de l’exporter.',
};
/** Un imbriqué venu d'une bibliothèque : le geste se fait dans un autre fichier. */
const IMBRIQUE_SANS_REGLES_DISTANT = {
  severite: 'danger',
  titre: 'Le composant « Alert » intègre « Chip », dont 2 propriétés ne sont pas documentées :',
  elements: ['tone', 'removable'],
  impact: 'Sans les règles de « Chip », le contrat de « Alert » décrit les internes de « Chip » au lieu de le réutiliser.',
  action: 'Les règles de « Chip » vivent dans le fichier de sa bibliothèque. Créez-les là-bas, republiez la bibliothèque, puis relancez l’analyse de « Alert ».',
};

/** Six points bloquants : la pile que le pire composé d'un fichier peut rendre. */
function sixImbriques() {
  const noms = ['Button', 'TileLink', 'Divider', 'Chip', 'Avatar', 'Badge'];
  return noms.map((nom, rang) => diagnostic({
    severite: 'danger',
    titre: `Le composant « Écran » intègre « ${nom} », dont ${rang + 1} propriétés ne sont pas documentées :`,
    elements: Array.from({ length: rang + 1 }, (_, index) => `prop${index + 1}`),
    impact: `Sans les règles de « ${nom} », le contrat de « Écran » décrit les internes de « ${nom} » au lieu de le réutiliser.`,
    action: `Créez et complétez les règles de « ${nom} », puis relancez l’analyse de « Écran » avant de l’exporter.`,
  }, [`12:${400 + rang}`]));
}

const AVERTISSEMENT_PROFIL = { // exportTokens.ts, avertissementDeProfil
  titre: 'Fichier « Design System » : aucun profil de couleur n’est choisi.',
  impact: 'Le développeur recevra ces couleurs en sRGB, que Figma les affiche en sRGB ou en Display P3.',
  action: 'Choisissez sRGB ou Display P3 dans le menu File color profile, puis réexportez.',
};

/** Le format que porte le fichier produit, annoncé par le sandbox et non recopié. */
const FORMAT_TOKENS = {
  message: {
    type: 'format-tokens',
    texte: annonceDuFormat(JSON.stringify({ $extensions: { 'com.ucm.formatVersion': 1 } })),
  },
};

const COMPOSANT = 'Button / Primary';
const CHEMIN = 'src/components/Button/Button.contract.json';
const CHEMIN_STRESSTEST = 'src/components/StressTest/StressTest.contract.json';
const CHEMIN_TOKENS = 'src/tokens/tokens.json';
/** Qui a décidé de l'emplacement : le verdict le dit. */
const SOURCE_CONFIG = 'ucm.config.json';
const BRANCHE_EN_VOL = 'ucm-exporter/export-component-2026-09-05-1412';
const URL_PR = 'https://github.com/mon-org/design-system-v3/pull/128';
const URL_MR = 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/42';
const PUBLICATION_GITHUB = textesDePublication(TERMES_GITHUB);
const PUBLICATION_GITLAB = textesDePublication(TERMES_GITLAB);

/**
 * Les messages que le sandbox envoie à l'ouverture, avant toute action.
 * Gestion des tokens désactivée, les collections du fichier ne sont pas lues :
 * aucun résumé n'arrive.
 */
const ouverture = (cause, tokens = TOKENS_PRESENTS, termes = TERMES_GITHUB, gestion = true) => {
  // Sans configuration valide, le sandbox n'envoie aucun dépôt visé.
  const sansDepot = cause === 'non-configure';
  const gitlab = termes === TERMES_GITLAB;
  return [
    { message: { type: 'schema-version', version: VERSION_CONTRAT } },
    { message: { type: 'settings', settings: reglagesDe(sansDepot ? 'aucune' : (gitlab ? 'gitlab' : 'github'), gestion) } },
    {
      message: {
        type: 'connection',
        ...etatDeConnexion(cause, sansDepot
          ? { repli: 'aucun-depot' }
          : { termes, nom: DEPOTS_PUBLICS[gitlab ? 'gitlab' : 'github'].nom }),
      },
    },
    sansDepot
      ? DEPOT_ABSENT
      : depot(gitlab ? LAYOUT_GITLAB : LAYOUT_GITHUB, gitlab ? DEPOT_VISE_GITLAB : DEPOT_VISE, gestion),
    ...(gestion ? [tokens] : []),
  ];
};

/**
 * Ce que le fichier porte en variables, calculé par le sandbox.
 *
 * Les deux cas doivent se regarder côte À côte : c'est leur voisinage qui dit
 * si l'absence de bouton se lit comme une réponse (« ce fichier n'a pas de
 * tokens ») ou comme une commande qui aurait disparu.
 */
const tokensDuFichier = (compte) => ({ message: { type: 'tokens', ...resumeDesTokens(compte) } });
const TOKENS_PRESENTS = tokensDuFichier({ collections: 3, variables: 128, modes: 2 });
const TOKENS_ABSENTS = tokensDuFichier({ collections: 0, variables: 0, modes: 0 });

/** Ce que `reportSelectionState` envoie, calculé par le sandbox lui-même. */
function cible(selection, avertissement = null, offre = null) {
  const etat = etatDeCible(selection);
  return {
    message: { type: 'cible', ...etat, detail: detailDeCible(etat.cible), offre, avertissement },
  };
}

const SELECTION_VIDE = cible([]);
const SELECTION_MULTIPLE = cible([
  { type: 'COMPONENT', name: 'Button / Primary' },
  { type: 'FRAME', name: 'Card' },
]);
const SELECTION_PRETE = cible([{ type: 'COMPONENT_SET', name: COMPOSANT, variants: 12 }]);

/** Ce qu'un composant sans règle lisible reçoit, écrit par `reportSelectionState`. */
const SANS_REGLE_LISIBLE = 'Aucune règle d’usage exploitable ne documente quand l’utiliser. '
  + 'Les diagnostics diront ce que le contrat sait décrire, et intent vaudra null.';

/** Ce que le même relevé écrit quand le conteneur est posé mais pas rédigé. */
const REGLES_A_REDIGER = 'Les 22 règles posées portent encore « [À compléter] », donc aucune '
  + 'n’est exportée. Rédigez-les dans Figma, puis relancez l’analyse.';

/**
 * Le pire nom réel d'un component set : quatre segments, aucune coupure
 * naturelle dans le dernier.
 */
const COMPOSANT_LONG = 'Feedback / Notification / Contextual / InlineMessageWithAction';

/** Un composant à documenter, avec l'offre que la page justifie. */
const aCreer = (offre, nom = COMPOSANT_LONG, avertissement = SANS_REGLE_LISIBLE) => cible(
  [{ type: 'COMPONENT_SET', name: nom, variants: 12 }],
  avertissement,
  offre,
);

/** Le clic qui écrit dans le document. Ses messages ne portent aucune destination. */
const CLIC_CREATION = '.carte-composant .btn-secondary';

/*
 * Les textes de la création des règles, copiés de `src/template/sources.ts`,
 * `src/template/ecriture.ts` et `src/code.ts`. Comme les avertissements
 * ci-dessus, ce sont des échantillons et non une autorité : ils servent à
 * regarder la carte sous la longueur réelle de chaque message.
 *
 * Les deux textes d'échec portent la même cause et se séparent sur ce que la
 * création a laissé dans le document : chacun demande sa capture.
 */
const CREATION_FAITE = '22 règles posées. Rédigez-les dans Figma, puis relancez l’analyse.';
const CREATION_CAUSE = 'Le calque « content » n’a pas gardé le texte écrit.';
const CREATION_ECHEC_RETIRE = `${CREATION_CAUSE} Rien n’a été laissé dans le document.`;
const CREATION_ECHEC_RESTE = `${CREATION_CAUSE} Le conteneur à moitié créé n’a pas pu être `
  + 'supprimé : supprimez-le, puis recommencez.';
const CREATION_AIDES_SANS_MARQUEUR = 'Les textes d’aide de « .ruleItem » ne commencent pas par '
  + '« [À compléter] ». Ajoutez-le dans le composant « .ruleItem », puis recommencez.';

/** Une création lancée sur un composant qui n'a pas encore ses règles. */
const lancerLaCreation = (offre = 'creer') => [
  ...ouverture('connecte'),
  aCreer(offre),
  { clic: CLIC_CREATION },
  { message: { type: 'status', state: 'loading', text: 'Création des règles d’usage…' } },
];

/** La destination, telle que le test de connexion l'a apprise. */
const DEPOT_VISE = { forge: TERMES_GITHUB.forge, projet: 'mon-org/design-system-v3', baseBranch: 'main' };
const DEPOT_VISE_GITLAB = { forge: TERMES_GITLAB.forge, projet: 'mon-groupe/design-system', baseBranch: 'main' };
const depot = (layout, vise = DEPOT_VISE, gestion = true) => ({
  message: { type: 'depot', ...etatDuDepot(layout, vise, gestion) },
});
const LAYOUT_GITHUB = { components: 'src/components', tokens: 'src/tokens/tokens.json', source: 'ucm.config.json' };
const LAYOUT_GITLAB = { components: 'guidelines/components', tokens: 'guidelines/tokens.json', source: 'ucm.config.json' };
const DEPOT_ABSENT = depot(null, 'aucun-depot');

/** La clé de destination d'un dépôt de la galerie, calculée par le sandbox. */
const DEPOTS_DE_GALERIE = {
  github: { forge: 'github', projet: DEPOT_VISE.projet, baseBranch: 'main' },
  gitlab: { forge: 'gitlab', projet: DEPOT_VISE_GITLAB.projet, baseBranch: 'main' },
  recette: { forge: 'github', projet: 'mon-org/recette-web', baseBranch: 'main' },
  aucune: null,
};
const destinationDe = (forge, gestion = true) => (forge === 'local'
  ? cleDeDestination(null, gestion, true)
  : cleDeDestination(DEPOTS_DE_GALERIE[forge], gestion));

/**
 * Un dépôt enregistré tel que `settings` le décrit, lu par les fonctions du
 * sandbox. L'adresse GitLab est celle d'une page du projet, copiée depuis le
 * navigateur.
 */
const depotPublic = (repoUrl) => {
  const { forge, projet } = lireAdresseDuDepot(repoUrl);
  return { id: identiteDuDepot({ forge, projet }), forge, projet, nom: nomDuDepot(projet), repoUrl, baseBranch: 'main', jeton: true };
};
const DEPOTS_PUBLICS = {
  github: depotPublic('https://github.com/mon-org/design-system-v3'),
  gitlab: depotPublic('https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines?ref_type=heads'),
  recette: depotPublic('https://github.com/mon-org/recette-web'),
};

/** Les termes et le dépôt visé de chaque dépôt de la galerie. */
const TERMES_DE = { github: TERMES_GITHUB, gitlab: TERMES_GITLAB, recette: TERMES_GITHUB };
const VISE_DE = {
  github: DEPOT_VISE,
  gitlab: DEPOT_VISE_GITLAB,
  recette: { forge: TERMES_GITHUB.forge, projet: 'mon-org/recette-web', baseBranch: 'main' },
};

/** La liste de plusieurs dépôts, et le dépôt actif ou aucun. */
const listeDe = (depots, actif) => ({
  message: {
    type: 'settings',
    settings: {
      destination: destinationDe(actif ?? 'aucune'),
      tokens: true,
      exportLocal: false,
      actif: actif ? DEPOTS_PUBLICS[actif].id : null,
      depots: depots.map((cle) => DEPOTS_PUBLICS[cle]),
    },
  },
});

/**
 * L'export local activé : la liste, le dernier dépôt actif gardé et la pastille
 * que `refreshConfiguration` envoie sans aucun test. Ce repli n'a pas de ligne.
 */
const exportLocal = (depots, actif) => [
  {
    message: {
      type: 'settings',
      settings: {
        destination: destinationDe('local'),
        tokens: true,
        exportLocal: true,
        actif: actif ? DEPOTS_PUBLICS[actif].id : null,
        depots: depots.map((cle) => DEPOTS_PUBLICS[cle]),
      },
    },
  },
  { message: { type: 'connection', ...etatDeConnexion('non-configure', { repli: 'debranche' }) } },
  depot(null, 'debranche'),
];

/** Le test d'un dépôt pour sa carte, calculé par le sandbox. */
const carteTestee = (cle, cause, precision = {}, layout = null) => ({
  message: {
    type: 'depot-teste',
    id: DEPOTS_PUBLICS[cle].id,
    generation: 1,
    ...etatDeCarte(cause, { termes: TERMES_DE[cle], ...precision }),
    destination: layout ? etatDuDepot(layout, VISE_DE[cle]).resume : null,
  },
});

/** L'onglet Dépôts, ouvert par l'engrenage. */
const OUVRIR_DEPOTS = [{ clic: '.icon-button' }, { clic: '#onglet-depots' }];
const AJOUTER = '#panneau-depots > .btn';
const carte = (rang) => `#panneau-depots .carte-depot:nth-of-type(${rang})`;

/** Les réglages publics rechargés par `refreshConfiguration`, un seul dépôt actif ou aucun. */
const reglagesDe = (forge, gestion = true) => ({
  destination: destinationDe(forge, gestion),
  tokens: gestion,
  exportLocal: false,
  actif: forge === 'aucune' ? null : DEPOTS_PUBLICS[forge].id,
  depots: forge === 'aucune' ? [] : [DEPOTS_PUBLICS[forge]],
});
const REGLAGES = reglagesDe('github');
const REGLAGES_GITLAB = reglagesDe('gitlab');
const REGLAGES_VIERGES = reglagesDe('aucune');

/**
 * Un point à corriger relevé par l'export : ses trois parties, et les nodes
 * de son sujet quand il en a.
 *
 * L'absence de `nodeIds` n'est pas un raccourci de la galerie : c'est l'état
 * réel d'un message qui nomme un text style, une variable, ou un calque agrégé
 * sur toute la matrice. Les deux formes doivent se regarder côte À côte, parce
 * que c'est leur voisinage qui dit si l'absence du bouton « Sélectionner le
 * calque » se lit comme une réponse ou comme un oubli.
 */
const diagnostic = (point, nodeIds) => ({
  message: { type: 'diagnostic', ...point, ...(nodeIds ? { nodeIds } : {}) },
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
      'Deux calques sélectionnés, dont un qui n’est pas un composant. L’écran distingue ce cas de « aucune sélection ».',
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
      cible([{ type: 'COMPONENT_SET', name: COMPOSANT, variants: 12 }], SANS_REGLE_LISIBLE),
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
    id: 'creation-offerte',
    titre: 'La page porte de quoi créer les règles',
    quand:
      'Un component set sans conteneur de règles, sur une page qui porte une instance de « .componentRules » ou son maître.',
    regarder:
      'Le second geste sous « Analyser le composant » : variante secondaire, et il ne repousse pas le nom hors de vue. Le nom du composant est le plus long qu’une bibliothèque produise.',
    existe: true,
    atteinte: [...ouverture('connecte'), aCreer('creer')],
  },
  {
    id: 'creation-conteneur-vierge',
    titre: 'Un conteneur vierge attend d’être rempli',
    quand:
      'Le designer a collé une instance de « .componentRules » sans rien y écrire. Le plugin la remplira au lieu d’en poser une autre.',
    regarder:
      'Rien ne distingue cet état du précédent : le libellé du bouton ne change pas. Comparer les deux dit si le designer a besoin de savoir laquelle des deux poses l’attend.',
    existe: true,
    atteinte: [...ouverture('connecte'), aCreer('remplir')],
  },
  {
    id: 'creation-sans-source',
    titre: 'Aucune source de règles sur la page',
    quand:
      'Une équipe qui vient d’installer le plugin : aucune instance de « .componentRules » nulle part dans le fichier.',
    regarder:
      'Le bouton reste montré et inactif, et la note dessous dit pourquoi. Le lien est la seule sortie de cet écran ; il vit dans la note, sans surface ni filet de sévérité.',
    existe: true,
    atteinte: [...ouverture('connecte'), aCreer('sans-source')],
  },
  {
    id: 'creation-en-cours',
    titre: 'Création des règles en cours',
    quand: 'Après le clic sur « Créer les règles d’usage », pendant la pose des sections.',
    regarder:
      'Les deux gestes sont inactifs et aucun bouton d’annulation n’apparaît : le retour arrière de la création est Ctrl+Z, pas un geste du plugin.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'phase', texte: 'Création du conteneur…' } },
    ],
  },
  {
    id: 'creation-faite',
    titre: 'Les règles sont posées',
    quand: 'Vingt-deux règles créées à droite du composant, toutes marquées « [À compléter] ».',
    regarder:
      'La note du succès survit au relevé de sélection qui suit, et le bouton de création a disparu : le composant a désormais son conteneur. L’avertissement compte les règles qui attendent leur texte, au lieu de dire qu’aucune règle ne documente le composant. « Analyser le composant » est redevenu disponible.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'status', state: 'success', text: CREATION_FAITE } },
      aCreer(null, COMPOSANT_LONG, REGLES_A_REDIGER),
    ],
  },
  {
    id: 'creation-imbriques-sans-regles',
    titre: 'Les règles sont posées, quatre imbriqués n’en ont pas',
    quand:
      'Le composant en intègre quatre autres qui n’ont pas encore leurs règles d’usage. Le contrat décrira leurs internes au lieu de les réutiliser.',
    regarder:
      'Un point par composant, et non un seul qui les mêlerait : le geste vise un composant à la fois. Le titre nomme les deux composants, celui qu’on a sélectionné et celui sur lequel agir. Les quatre formes du point sont ici côte à côte : une liste de sept propriétés, une liste d’une seule, un composant qui n’en déclare aucune et ne pose donc aucune liste, et un composant de bibliothèque dont le geste se fait dans un autre fichier. Le fond rouge et la pastille « Bloquant » disent que le contrat est déjà faux, et la note du succès reste au-dessus : la création, elle, a réussi.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'status', state: 'success', text: CREATION_FAITE } },
      diagnostic(IMBRIQUE_SANS_REGLES_BOUTON, ['12:350', '12:351']),
      diagnostic(IMBRIQUE_SANS_REGLES_ICONE, ['12:352']),
      diagnostic(IMBRIQUE_SANS_REGLES_NU, ['12:353']),
      diagnostic(IMBRIQUE_SANS_REGLES_DISTANT, ['12:354']),
      aCreer(null, COMPOSANT_LONG, REGLES_A_REDIGER),
    ],
  },
  {
    id: 'creation-imbriques-nombreux',
    titre: 'Six imbriqués sans règles, la pile entière',
    quand:
      'Un écran composé de six composants dont aucun n’a ses règles. C’est le pire cas qu’un fichier réel produise, une fois les icônes écartées du relevé.',
    regarder:
      'Le compteur du titre dit six, et la pile se parcourt au défilement sans repli. Aucun plafond ne les agrège : un point agrégé perdrait le bouton « Sélectionner les calques », seul moyen d’aller voir le composant en cause. C’est l’écran à regarder si un fichier passe la dizaine, pour décider si la forme tient encore.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'status', state: 'success', text: CREATION_FAITE } },
      ...sixImbriques(),
      aCreer(null, COMPOSANT_LONG, REGLES_A_REDIGER),
    ],
  },
  {
    id: 'creation-echec-conteneur-retire',
    titre: 'Création interrompue, document inchangé',
    quand: 'Une écriture perdue en route. Le conteneur à moitié posé a pu être supprimé.',
    regarder:
      'Le texte dit la cause, puis ce que le document a gardé. Le bouton de création est redevenu actif : recommencer est le geste attendu.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'status', state: 'error', text: CREATION_ECHEC_RETIRE } },
      aCreer('creer'),
    ],
  },
  {
    id: 'creation-echec-conteneur-reste',
    titre: 'Création interrompue, conteneur resté en place',
    quand: 'Même échec, mais la suppression du conteneur a échoué à son tour.',
    regarder:
      'Comparer avec l’état précédent : la première phrase est la même, et seule la seconde change. C’est elle qui demande un geste, et elle doit se lire sans relire la première.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'status', state: 'error', text: CREATION_ECHEC_RESTE } },
      aCreer('creer'),
    ],
  },
  {
    id: 'creation-aides-sans-marqueur',
    titre: 'Les textes d’aide du maître n’ont pas le marqueur',
    quand:
      'Le maître de « .ruleItem » est resté à l’ancienne. Le refus arrive avant toute écriture : rien n’a été posé.',
    regarder:
      'Le refus nomme le composant Figma à corriger et le texte à y ajouter. Le document est intact, et rien ne le dit : c’est ce que l’absence de seconde phrase doit se charger de faire.',
    existe: true,
    atteinte: [
      ...lancerLaCreation(),
      { message: { type: 'status', state: 'error', text: CREATION_AIDES_SANS_MARQUEUR } },
      aCreer('creer'),
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
      "L'étape est nommée par ce que le code FAIT. La barre sous le texte avance d'après le poids des étapes, sans compte : l'index ne connaît pas son nombre de pages.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: 'Lecture des composants imbriqués…' } },
      { message: { type: 'avancement', fraction: 0.2 } },
    ],
  },
  {
    id: 'analyse-boucle-des-variants',
    titre: 'Analyse en cours, boucle des variants',
    quand:
      "L'écriture du contrat parcourt les variants un à un ; chaque respiration du moteur envoie où il en est.",
    regarder:
      'Le compte « 12 / 40 » flotte à droite du texte de l’étape, et la barre avance avec lui. Le texte de l’étape ne bouge pas quand le compte change.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: 'Écriture du contrat…' } },
      { message: { type: 'avancement', fraction: 0.62, fait: 12, total: 40 } },
    ],
  },
  {
    id: 'mesure-de-l-analyse',
    titre: 'Durée de la dernière analyse, dépliée',
    quand:
      'Après le verdict d’une analyse, le pied de page porte sa durée ; un clic déplie le détail par étape.',
    regarder:
      'La durée suit la version de schéma sur la même ligne. Le détail aligne les durées à droite, et « Copier la trace » reste lisible sans être un bouton plein.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { message: { type: 'schema-version', version: VERSION_CONTRAT } },
      {
        message: {
          type: 'mesure',
          trace: {
            totalMs: 4210,
            etapes: [
              { nom: 'regles', ms: 912 },
              { nom: 'variants', ms: 64 },
              { nom: 'index', ms: 1630 },
              { nom: 'composition', ms: 402 },
              { nom: 'wrapper', ms: 18 },
              { nom: 'variables', ms: 95 },
              { nom: 'structure', ms: 588 },
              { nom: 'echantillons', ms: 21 },
              { nom: 'compaction', ms: 9 },
              { nom: 'serialisation', ms: 4 },
              { nom: 'depot', ms: 467 },
            ],
            compteurs: { pagesChargees: 2, appelsGetMainComponentAsync: 48 },
            empreinte: '3fa0c1d2',
          },
        },
      },
      { clic: '.pied-mesure > summary' },
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
      "L'ordre de lecture d'une carte de commande : le geste, la publication, le verdict, puis le point à corriger. Tout est dans la carte du composant, et la carte des tokens, quand la gestion des tokens est activée, reste intacte en dessous.",
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
    id: 'resultat-bloquant-en-tete',
    titre: 'Un bloquant au milieu d’avertissements',
    quand:
      'Une analyse qui relève trois strokes illisibles et un composant imbriqué sans règles. Le point bloquant arrive ici après les trois autres : l’interface le place en tête quel que soit son rang d’arrivée.',
    regarder:
      'Le point bloquant EN PREMIER, alors qu’il est arrivé après les trois autres. C’est l’écran qui dit si la pastille et le fond suffisent à le détacher sans rien ajouter. Le compteur du groupe et le verdict annoncent le même nombre : les quatre points sont des gestes, pas trois gestes et une note.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      diagnostic(AVERTISSEMENT_STROKE, ['12:360']),
      diagnostic({
        ...AVERTISSEMENT_STROKE,
        titre: AVERTISSEMENT_STROKE.titre.replace('« Border »', '« Divider »'),
      }, ['12:361', '12:362', '12:363']),
      diagnostic({
        ...AVERTISSEMENT_STROKE,
        titre: AVERTISSEMENT_STROKE.titre.replace('« Border »', '« Outline »'),
      }, ['12:364']),
      diagnostic(IMBRIQUE_SANS_REGLES_BOUTON, ['12:365', '12:366']),
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 4 }),
    ],
  },
  {
    id: 'resultat-avertissement-localisable',
    titre: 'Des avertissements qui mènent à leurs calques',
    quand:
      "Un export dont deux avertissements nomment des calques du composant, et un troisième un style de texte. Le premier vient d'un calque ; le deuxième de trois calques au même nom, un par variant ; le troisième n'a aucun node.",
    regarder:
      "Les trois entrées CÔTE À CÔTE. Les deux premières portent un bouton, et celui de la deuxième compte ses calques ; la troisième est un paragraphe. Ce voisinage décide si l'absence de bouton se lit comme une réponse ou comme un oubli, et c'est pour lui que la loi de couverture existe.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      diagnostic(AVERTISSEMENT_STROKE, ['12:345']),
      diagnostic(AVERTISSEMENT_SANS_TEXT_STYLE, ['12:346', '12:347', '12:348']),
      diagnostic(AVERTISSEMENT_TEXT_STYLE),
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 3 }),
    ],
  },
  {
    id: 'resultat-avertissement-regroupe',
    titre: 'Des avertissements regroupés sur les variants',
    quand:
      "Un component set de cent quarante variants dont chaque racine fixe un min width sans variable, porte une ombre sans style d’effets, laisse son gap sans variable et peint son fill sans variable. Le moteur écrit une phrase par sujet, sans nom de calque, et la carte réunit toutes les racines.",
    regarder:
      "Quatre cartes, et non quatre cent quarante-huit : aucune ne nomme un calque, et le bouton dit « Sélectionner les 140 calques » sur la première, la troisième et la quatrième, « Sélectionner les 28 calques » sur la deuxième. Le nom de la propriété est en gras dans l'impact de la première.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      diagnostic(AVERTISSEMENT_BORNE_DES_VARIANTS, Array.from({ length: 140 }, (_, rang) => `20:${rang + 1}`)),
      diagnostic(AVERTISSEMENT_OMBRE_DES_VARIANTS, Array.from({ length: 28 }, (_, rang) => `21:${rang + 1}`)),
      diagnostic(AVERTISSEMENT_GAP_DES_VARIANTS, Array.from({ length: 140 }, (_, rang) => `22:${rang + 1}`)),
      diagnostic(AVERTISSEMENT_FILL_DES_VARIANTS, Array.from({ length: 140 }, (_, rang) => `23:${rang + 1}`)),
      verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 4 }),
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
          text: 'Export impossible pour « Stresstest » : ce component set ne contient aucun '
            + 'variant. Ajoutez au moins un variant dans Figma, puis réexportez.',
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
      "Le compte rendu tient-il ? Vingt cartes ambre DANS la carte du composant, le compte dans le titre du groupe, et la carte des tokens, quand la gestion des tokens est activée, repoussée très loin sous elles.",
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
      { message: { type: 'demande', url: URL_PR, libelle: PUBLICATION_GITHUB.lienVers(CHEMIN) } },
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
      { message: { type: 'phase', texte: PUBLICATION_GITHUB.enCours } },
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
          text: PUBLICATION_GITHUB.echecDansLeJournal('GitHub a répondu 403 : Resource not accessible by personal access token.'),
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
          text: PUBLICATION_GITHUB.echec,
        },
      },
      {
        message: {
          type: 'verdict',
          code: 'a-publier',
          texte: `Échec de la publication. ${gesteApresEchecDePublication(403, TERMES_GITHUB)}`,
          action: 'Réessayer la publication',
          etat: 'error',
        },
      },
    ],
  },
  {
    id: 'depot-non-configure',
    forge: 'aucune',
    titre: 'Dépôt non configuré, au repos',
    quand:
      "Premier lancement : aucun réglage de dépôt. Rien d'autre que la pastille rouge ne l'annonce.",
    regarder:
      "La ligne ambre « Aucun dépôt enregistré » : le seul reste du bloc destination, et la seule chose qu'il disait que rien d'autre ne dit avant le clic. La pastille dit « aucun dépôt ».",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      SELECTION_PRETE,
    ],
  },
  {
    id: 'export-sans-depot',
    forge: 'aucune',
    titre: 'Export sans dépôt : téléchargement local',
    quand: 'Le même export, mené à son terme sans configuration de dépôt valide.',
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
    id: 'ecran-sans-tokens',
    gestionDesTokens: false,
    titre: 'Gestion des tokens désactivée, écran de travail',
    quand:
      "Le designer a désactivé « Gérer les tokens » dans l'onglet Général. Le sandbox ne lit pas les collections du fichier, et la carte des tokens n'apparaît pas.",
    regarder:
      "Une seule carte, celle du composant, et l'alerte de repli sous elle quand elle existe. La hauteur libérée revient au compte rendu du composant, et rien ne signale l'absence de la seconde carte.",
    existe: true,
    atteinte: [
      ...ouverture('connecte', null, TERMES_GITHUB, false),
      SELECTION_PRETE,
    ],
  },
  {
    id: 'connexion-en-cours',
    titre: 'Connexion en cours',
    quand:
      "`refreshConfiguration` teste la forge à l'ouverture. La pastille passe au gris le temps du GET.",
    regarder:
      "La pastille est au-dessus du titre du produit, et elle n'est pas cliquable alors qu'elle porte la seule information qui demande un geste.",
    existe: true,
    atteinte: [
      { message: { type: 'schema-version', version: VERSION_CONTRAT } },
      { message: { type: 'settings', settings: REGLAGES } },
      { message: { type: 'connection', ...etatDeConnexion('verification', { termes: TERMES_GITHUB, nom: DEPOTS_PUBLICS.github.nom }) } },
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
      'La seconde commande. Elle ignore la sélection et lit les variables du fichier entier, ce que rien à l’écran ne dit. Après la publication, le sandbox renvoie les réglages avant le statut de succès.',
    regarder:
      "Une commande de portée FICHIER menée à son terme SANS sélection : la carte du composant reste vide et sans geste, et le libellé de publication a nommé les tokens. Le lien de la pull request reste sous le statut : les réglages rechargés gardent la même destination.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_VIDE,
      { clic: '.carte-tokens .btn-secondary' },
      { message: { type: 'status', state: 'loading', text: 'Lecture des variables…' } },
      FORMAT_TOKENS,
      { message: { type: 'demande', url: URL_PR, libelle: PUBLICATION_GITHUB.lienVers(CHEMIN_TOKENS) } },
      { message: { type: 'settings', settings: REGLAGES } },
      { message: { type: 'status', state: 'success', text: PUBLICATION_GITHUB.creee('Tokens exportés') } },
    ],
  },
  {
    id: 'tokens-sans-profil',
    titre: 'Tokens d’un fichier sans profil de couleur',
    quand:
      "Un fichier Figma créé avant la gestion des couleurs : son profil vaut LEGACY, et l'export publie ses couleurs en sRGB.",
    regarder:
      'Un seul avertissement dans la carte des tokens, jamais un par couleur, et le format annoncé sous le résumé. Le geste nomme le menu File color profile, que le designer cherche tel quel dans Figma.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_VIDE,
      { clic: '.carte-tokens .btn-secondary' },
      { message: { type: 'status', state: 'loading', text: 'Lecture des variables…' } },
      diagnostic(AVERTISSEMENT_PROFIL),
      FORMAT_TOKENS,
      verdict({ code: 'a-publier', genre: 'tokens', chemin: CHEMIN_TOKENS, source: SOURCE_CONFIG, avertissements: 1 }),
    ],
  },
  {
    id: 'export-annule',
    titre: 'Export annulé',
    quand:
      "La sélection change pendant une analyse du composant. L'annulation est coopérative : elle prend effet à la fin de l'étape en cours.",
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
    id: 'configuration-onglet-general',
    titre: 'Configuration, onglet Général',
    quand: "Clic sur l'engrenage : la configuration s'ouvre sur Général, le dernier onglet consulté ou le premier.",
    regarder:
      "Les deux onglets sous le titre, la description de l'onglet sélectionné, puis l'interrupteur « Gérer les tokens » et son aide. Aucun bouton d'enregistrement : l'interrupteur agit tout de suite.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      { clic: '.icon-button' },
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
    id: 'gitlab-connecte',
    forge: 'gitlab',
    titre: 'GitLab connecté, composant sélectionné',
    quand: "Le projet GitLab répond et déclare ses chemins dans `ucm.config.json`.",
    regarder: "L'écran de travail est celui de GitHub, mot pour mot : aucun texte n'y nomme la forge avant la publication.",
    existe: true,
    atteinte: [
      ...ouverture('connecte', TOKENS_PRESENTS, TERMES_GITLAB),
      SELECTION_PRETE,
    ],
  },
  {
    id: 'depots-aucun',
    forge: 'aucune',
    titre: 'Onglet Dépôts, aucun dépôt enregistré',
    quand: "Premier lancement : la pastille mène à l'onglet Dépôts, vide.",
    regarder: "Le bouton « Ajouter un dépôt », puis la phrase « Ajoutez un dépôt pour publier vos exports. » : rien d'autre ne demande un geste.",
    existe: true,
    atteinte: [...ouverture('non-configure'), ...OUVRIR_DEPOTS],
  },
  {
    id: 'depots-illisibles',
    forge: 'aucune',
    titre: 'Onglet Dépôts, liste illisible',
    quand: "La liste des dépôts rangée sur ce poste n'a plus la forme que le plugin écrit. Aucun `settings` ne part : l'interface n'a ni liste, ni dépôt actif, ni destination.",
    regarder:
      "Le constat, le geste, et « Réinitialiser la liste » : rien d'autre ne s'affiche dans l'onglet, puisque toute autre écriture commencerait par la lecture qui lève. La pastille de l'écran de travail dit « Réglages illisibles » et mène ici.",
    existe: true,
    atteinte: [
      { message: { type: 'schema-version', version: VERSION_CONTRAT } },
      SELECTION_PRETE,
      TOKENS_PRESENTS,
      { message: { type: 'connection', ...etatDeConnexion('depots-illisibles') } },
      { message: { type: 'depots-illisibles', texte: DEPOTS_ILLISIBLES, geste: GESTE_DEPOTS_ILLISIBLES } },
      ...OUVRIR_DEPOTS,
    ],
  },
  {
    id: 'depots-trois-deux-forges',
    forge: 'mixte',
    forgeActive: 'github',
    titre: 'Trois dépôts sur deux forges, repliés',
    quand: "Le mainteneur publie vers un repository GitHub et deux autres dépôts, dont un projet GitLab. Le dépôt GitHub est actif et connecté.",
    regarder:
      "Le compte des objets : titre, « Retour », deux onglets, description, « Ajouter un dépôt », puis le nom et l'état de chaque carte, soit 12. Seul le dépôt actif dit « Connecté » ; les deux autres proposent « Se connecter ».",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      listeDe(['github', 'gitlab', 'recette'], 'github'),
      carteTestee('github', 'connecte', {}, LAYOUT_GITHUB),
      ...OUVRIR_DEPOTS,
    ],
  },
  {
    id: 'depots-nouveau-erreurs',
    forge: 'aucune',
    titre: 'Nouveau dépôt refusé à l’enregistrement',
    quand: "Le designer ajoute un dépôt, colle l'adresse d'un GitLab auto-hébergé, vide la branche et clique « Enregistrer » sans jeton.",
    regarder: "Chaque erreur sous son champ, et la carte reste dépliée. L'erreur d'adresse nomme les deux hôtes acceptés.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      ...OUVRIR_DEPOTS,
      { clic: AJOUTER },
      { saisie: { dans: `${carte(1)} input[name="repoUrl"]`, valeur: 'https://gitlab.example.com/mon-org/ds' } },
      { saisie: { dans: `${carte(1)} input[name="baseBranch"]`, valeur: '' } },
      { clic: `${carte(1)} .carte-depot-actions .btn-primary` },
    ],
  },
  {
    id: 'depots-doublon',
    titre: 'Un repository déjà dans la liste',
    quand: "Le designer ajoute l'adresse d'un repository déjà enregistré, écrite avec une autre casse. Le sandbox compare les identités en minuscules.",
    regarder: 'Le refus sous le champ adresse, dans les mots de la forge, et la carte nouvelle reste dépliée avec sa saisie.',
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      carteTestee('github', 'connecte', {}, LAYOUT_GITHUB),
      ...OUVRIR_DEPOTS,
      { clic: AJOUTER },
      { saisie: { dans: `${carte(2)} input[name="repoUrl"]`, valeur: 'https://github.com/Mon-Org/Design-System-v3' } },
      { saisie: { dans: `${carte(2)} input[name="jeton"]`, valeur: 'jeton-exemple' } },
      { clic: `${carte(2)} .carte-depot-actions .btn-primary` },
      {
        message: {
          type: 'depot-enregistre', requete: 1, carte: 'nouvelle-1', id: null,
          erreurs: { repoUrl: `Ce ${TERMES_GITHUB.depot} est déjà dans la liste.` },
        },
      },
    ],
  },
  {
    id: 'depots-actif-deplie',
    titre: 'Dépôt actif déplié',
    quand: 'Clic sur le nom du dépôt actif, connecté.',
    regarder:
      "L'adresse se lit sans se modifier, le repository retenu dessous, la branche, l'endroit où vont les exports d'après ucm.config.json, puis le jeton enregistré. « Enregistrer » et « Supprimer » ferment la carte.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      carteTestee('github', 'connecte', {}, LAYOUT_GITHUB),
      ...OUVRIR_DEPOTS,
      { clic: `${carte(1)} .carte-depot-nom` },
    ],
  },
  {
    id: 'depots-actif-jeton-refuse',
    titre: 'Dépôt actif en échec, arrivée par la pastille',
    quand: "GitHub refuse le jeton du dépôt actif. Le designer clique sur la pastille « jeton refusé » de l'écran de travail.",
    regarder: "La carte arrive dépliée : « Jeton refusé » en rouge à la place de « Connecté », et le geste en tête de la carte, au-dessus du champ qu'il désigne.",
    existe: true,
    atteinte: [
      ...ouverture('jeton-refuse'),
      carteTestee('github', 'jeton-refuse', { statut: 401 }),
      SELECTION_VIDE,
      { clic: '.connection-status' },
    ],
  },
  {
    id: 'gitlab-depots-actif-introuvable',
    forge: 'gitlab',
    titre: 'Projet GitLab introuvable, arrivée par la pastille',
    quand: 'GitLab répond 404 : adresse fautive, ou projet privé auquel le jeton n’a pas accès.',
    regarder: "Le geste dit que le projet peut être privé, et qu'une adresse fausse se corrige en supprimant ce dépôt puis en ajoutant la bonne : l'adresse ne se modifie plus.",
    existe: true,
    atteinte: [
      ...ouverture('depot-introuvable', TOKENS_PRESENTS, TERMES_GITLAB),
      carteTestee('gitlab', 'depot-introuvable', { statut: 404 }),
      SELECTION_VIDE,
      { clic: '.connection-status' },
    ],
  },
  {
    id: 'depots-suppression-confirmation',
    titre: 'Suppression d’un dépôt, second clic attendu',
    quand: 'Premier clic sur « Supprimer » dans la carte dépliée du dépôt actif.',
    regarder: "Le même bouton demande la confirmation, sans boîte de dialogue. Le second clic retire le dépôt entier, jeton compris.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      carteTestee('github', 'connecte', {}, LAYOUT_GITHUB),
      ...OUVRIR_DEPOTS,
      { clic: `${carte(1)} .carte-depot-nom` },
      { clic: `${carte(1)} .carte-depot-actions .btn-secondary` },
    ],
  },
  {
    id: 'depots-aucun-actif',
    forge: 'aucune',
    titre: 'Des dépôts enregistrés, aucun actif',
    quand: 'Le designer a supprimé le dépôt actif : les autres restent, et aucun ne devient actif à sa place.',
    regarder: "Chaque carte propose « Se connecter », et aucune ne dit « Connecté ». Sur l'écran de travail, la ligne sous la carte du composant dit que l'export sera téléchargé.",
    existe: true,
    atteinte: [
      ...ouverture('non-configure'),
      listeDe(['github', 'recette'], null),
      { message: { type: 'connection', ...etatDeConnexion('non-configure', { repli: 'aucun-actif' }) } },
      depot(null, 'aucun-actif'),
      ...OUVRIR_DEPOTS,
    ],
  },
  {
    id: 'general-export-local-active',
    titre: 'Configuration, export local activé',
    quand: "Le designer active « Activer l'export local » dans l'onglet Général. Le réglage reste mémorisé à la réouverture du plugin.",
    regarder:
      "Les deux interrupteurs l'un sous l'autre, chacun avec son aide. « Activer l'export local » est activé, et son libellé ne change pas avec l'état.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      ...exportLocal(['github'], 'github'),
      { clic: '.icon-button' },
    ],
  },
  {
    id: 'depots-export-local',
    forge: 'mixte',
    forgeActive: 'github',
    titre: 'Onglet Dépôts en export local',
    quand: "L'export local est activé, et trois dépôts sont enregistrés. Le dernier dépôt actif reste enregistré pour le rebranchement.",
    regarder:
      "La ligne ambre sous la description dit pourquoi aucune carte n'est connectée. Chaque carte propose « Se connecter », y compris le dernier dépôt actif. Le compte des objets passe à 13 avec cette ligne.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      ...exportLocal(['github', 'gitlab', 'recette'], 'github'),
      ...OUVRIR_DEPOTS,
    ],
  },
  {
    id: 'travail-export-local',
    titre: 'Écran de travail en export local',
    quand: "L'export local est activé : aucun test ne part vers la forge à l'ouverture.",
    regarder:
      "La pastille « Export en local » porte la couleur d'avertissement, et aucune ligne ne la répète sous la carte du composant. Un export local oublié se lit avant tout clic.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      ...exportLocal(['github'], 'github'),
      SELECTION_PRETE,
    ],
  },
  {
    id: 'export-local-termine',
    titre: 'Export local : contrat téléchargé',
    quand: "Le designer analyse le composant en export local, puis clique « Télécharger le contrat ».",
    regarder:
      "Le verdict dit que le contrat sera téléchargé, sans parler d'immobilité ni de collision : aucune demande de fusion n'est préparée. Le compte rendu confirme le téléchargement.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      ...exportLocal(['github'], 'github'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…', destination: destinationDe('local') } },
      { message: { ...verdict({ code: 'sans-depot', genre: 'component', avertissements: 0, repli: 'debranche' }).message, destination: destinationDe('local') } },
      { clic: '.carte-composant .btn-primary:not([hidden]):not(:disabled)' },
      { message: { type: 'log', text: TEXTES_DE_REPLI.debranche.journal, destination: destinationDe('local') } },
      { message: { type: 'download', filename: 'Button.contract.json', content: '{"contractVersion":"13.0"}', destination: destinationDe('local') } },
      { message: { type: 'status', state: 'success', text: 'Contrat généré. Téléchargement terminé.', destination: destinationDe('local') } },
    ],
  },
  {
    id: 'destination-changee',
    forge: 'mixte',
    forgeActive: 'gitlab',
    titre: 'La destination a changé depuis l’analyse',
    quand:
      "Le composant est analysé pour le repository GitHub, puis une autre fenêtre du plugin active le projet GitLab. Le designer clique « Publier le composant ».",
    regarder: "Les cartes se sont vidées au changement de destination, et le refus dit le fait, sans supposer sa cause : il nomme le dépôt actif et demande une nouvelle analyse.",
    existe: true,
    atteinte: [
      ...ouverture('connecte'),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…', destination: destinationDe('github') } },
      { message: { ...verdict({ code: 'a-publier', genre: 'component', chemin: CHEMIN, source: SOURCE_CONFIG, avertissements: 0 }).message, destination: destinationDe('github') } },
      { clic: '.carte-composant .btn-primary:not([hidden]):not(:disabled)' },
      listeDe(['github', 'gitlab'], 'gitlab'),
      { message: { type: 'connection', ...etatDeConnexion('connecte', { termes: TERMES_GITLAB, nom: DEPOTS_PUBLICS.gitlab.nom }) } },
      {
        message: {
          type: 'status',
          state: 'error',
          text: refusDeDestinationChangee({ nom: DEPOTS_PUBLICS.gitlab.nom }),
          destination: destinationDe('gitlab'),
        },
      },
    ],
  },
  {
    id: 'gitlab-pret-a-publier',
    forge: 'gitlab',
    titre: 'Prêt à publier sur GitLab',
    quand: "L'analyse est finie, le projet GitLab est lu, et le contenu diffère de la branche de base.",
    regarder: 'Le verdict nomme le chemin et le fichier qui l’a décidé, sans nommer la forge.',
    existe: true,
    atteinte: [
      ...ouverture('connecte', TOKENS_PRESENTS, TERMES_GITLAB),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({ code: 'a-publier', genre: 'component', chemin: 'guidelines/components/Button/Button.contract.json',
        nom: DEPOTS_PUBLICS.gitlab.nom, source: SOURCE_CONFIG, avertissements: 0 }),
    ],
  },
  {
    id: 'gitlab-composant-avant-les-tokens',
    forge: 'gitlab',
    titre: 'Composant analysé avant la fusion des tokens',
    quand: "L'analyse est finie, et le projet GitLab n'a de tokens ni sur la branche de base ni dans une merge request ouverte.",
    regarder: 'Le verdict propose toujours la publication, et dit de faire fusionner les tokens d’abord, en nommant la merge request.',
    existe: true,
    atteinte: [
      ...ouverture('connecte', TOKENS_PRESENTS, TERMES_GITLAB),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({
        code: 'a-publier',
        genre: 'component',
        chemin: 'guidelines/components/Button/Button.contract.json',
        nom: DEPOTS_PUBLICS.gitlab.nom,
        source: SOURCE_CONFIG,
        avertissements: 0,
        tokens: 'absents',
        demande: TERMES_GITLAB.demande,
      }),
    ],
  },
  {
    id: 'gitlab-composant-sans-consigne-tokens',
    forge: 'gitlab',
    gestionDesTokens: false,
    titre: 'Composant analysé, gestion des tokens désactivée',
    quand: "L'équipe publie ses contrats sans tokens : l'analyse ne lit pas l'état des tokens du projet GitLab.",
    regarder: 'Le verdict propose la publication sans aucune consigne sur les tokens, et la carte des tokens est absente.',
    existe: true,
    atteinte: [
      ...ouverture('connecte', null, TERMES_GITLAB, false),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      verdict({
        code: 'a-publier',
        genre: 'component',
        chemin: 'guidelines/components/Button/Button.contract.json',
        nom: DEPOTS_PUBLICS.gitlab.nom,
        source: SOURCE_CONFIG,
        avertissements: 0,
        tokens: null,
        demande: TERMES_GITLAB.demande,
      }),
    ],
  },
  {
    id: 'pastille-nom-long',
    forge: 'gitlab',
    titre: 'Pastille d’un projet au nom long, sans séparateur',
    quand:
      "Le projet GitLab actif vit sous deux sous-groupes, et le dernier segment de son adresse est un seul mot de plus de quarante caractères.",
    regarder:
      "À 320 px, la pastille passe à la ligne à l'intérieur du nom, sans déborder de la fenêtre ni tronquer le texte : ni points de suspension, ni barre de défilement horizontale.",
    existe: true,
    atteinte: [
      { message: { type: 'schema-version', version: VERSION_CONTRAT } },
      {
        message: {
          type: 'connection',
          ...etatDeConnexion('jeton-refuse', {
            termes: TERMES_GITLAB,
            nom: nomDuDepot('mon-groupe/equipe-produit/designsystemmobileetwebdeuxmillevingtsix'),
          }),
        },
      },
      SELECTION_PRETE,
    ],
  },
  {
    id: 'gitlab-merge-request-creee',
    forge: 'gitlab',
    titre: 'Merge request créée',
    quand: 'La publication a abouti : commit sur une branche d’export, puis merge request. Le sandbox renvoie les réglages avant le statut de succès.',
    regarder: 'Le lien et le statut nomment la merge request. Le lien reste affiché après les réglages rechargés, qui gardent la même destination.',
    existe: true,
    atteinte: [
      ...ouverture('connecte', TOKENS_PRESENTS, TERMES_GITLAB),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      { message: { type: 'phase', texte: PUBLICATION_GITLAB.enCours } },
      { message: { type: 'demande', url: URL_MR, libelle: PUBLICATION_GITLAB.lienVers('guidelines/components/Button/Button.contract.json') } },
      { message: { type: 'settings', settings: REGLAGES_GITLAB } },
      { message: { type: 'status', state: 'success', text: PUBLICATION_GITLAB.creee('Contrat généré') } },
    ],
  },
  {
    id: 'gitlab-echec-publication',
    forge: 'gitlab',
    titre: 'Échec de la publication sur GitLab',
    quand: "GitLab refuse le commit en 400 : une branche d'export du même nom existe déjà.",
    regarder: 'Le verdict donne le geste de GitLab, et le fichier est téléchargé.',
    existe: true,
    atteinte: [
      ...ouverture('connecte', TOKENS_PRESENTS, TERMES_GITLAB),
      SELECTION_PRETE,
      { clic: '.carte-composant .btn-primary' },
      { message: { type: 'status', state: 'loading', text: 'Analyse du composant…' } },
      {
        message: {
          type: 'log',
          text: PUBLICATION_GITLAB.echecDansLeJournal("GitLab a répondu 400 : A branch called 'ucm-exporter/export-component-20260916-110000' already exists."),
        },
      },
      { message: { type: 'download', filename: 'Button.contract.json', content: '{"contractVersion":"13.0"}' } },
      { message: { type: 'status', state: 'error', text: PUBLICATION_GITLAB.echec } },
      {
        message: {
          type: 'verdict',
          code: 'a-publier',
          texte: `Échec de la publication. ${gesteApresEchecDePublication(400, TERMES_GITLAB, "GitLab a répondu 400 : A branch called 'ucm-exporter/export-component-20260916-110000' already exists.")}`,
          action: 'Réessayer la publication',
          etat: 'error',
        },
      },
    ],
  },
];

/**
 * Le sandbox joint à chaque résultat d'opération la destination qu'elle a lue
 * et le numéro de sa demande. L'interface numérote ses demandes à partir de 1,
 * à chaque clic sur le geste d'une carte : le numéro d'un résultat est celui du
 * dernier de ces clics dans l'état. La destination suit la forge de l'état.
 *
 * La création des règles ne lit aucun dépôt et ne publie rien : ses messages
 * portent leur numéro d'opération et aucune destination.
 */
const RESULTATS_D_OPERATION = new Set(['phase', 'diagnostic', 'verdict', 'status', 'log', 'demande', 'download']);

function avecProvenance(etat) {
  if (!etat.atteinte) return etat;
  const forge = etat.forge === 'mixte' ? etat.forgeActive : etat.forge ?? 'github';
  const destination = destinationDe(forge, etat.gestionDesTokens ?? true);
  let operation = 0;
  let creation = false;
  const atteinte = etat.atteinte.map((etape) => {
    if (etape.clic?.startsWith('.carte-')) {
      operation += 1;
      creation = etape.clic === CLIC_CREATION;
    }
    if (operation === 0 || !RESULTATS_D_OPERATION.has(etape.message?.type)) return etape;
    if (creation) return { message: { ...etape.message, operation } };
    return { message: { destination, ...etape.message, operation } };
  });
  return { ...etat, atteinte };
}

module.exports = { ETATS: ETATS.map(avecProvenance), VERSION_CONTRAT };
