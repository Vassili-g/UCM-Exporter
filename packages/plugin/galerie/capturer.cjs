/**
 * Capture la galerie avec le Chrome installé sur le poste.
 *
 * U1.1 exige de REGARDER chaque état, dans les deux thèmes, et de recommencer à
 * chaque phase qui en ajoute un. Une capture faite à la main une fois ne
 * survivrait pas à la deuxième fois : ce script est ce qui rend la vérification
 * répétable. Il ne remplace pas le regard, il lui fournit ses images.
 *
 * Chrome est cherché aux emplacements habituels ; `UCM_CHROME` force le chemin.
 * Aucune dépendance n'est ajoutée au dépôt pour cela : un navigateur headless
 * installé par npm pèserait plus lourd que tout le plugin.
 *
 *   node galerie/capturer.cjs              → les planches des trois modes
 *   node galerie/capturer.cjs sombre       → les planches d'un mode
 *   node galerie/capturer.cjs sombre --etats → une image par état
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { MODES, LARGEUR, HAUTEUR, sortie } = require('./build-galerie.cjs');
const { ETATS } = require('./etats.cjs');

/** Marges de la planche, reprises de `build-galerie.cjs`. */
const PLANCHE = { largeur: 2 * LARGEUR + 3 * 12, hauteur: 2 * (HAUTEUR + 21) + 3 * 12 };

const CANDIDATS = [
  process.env.UCM_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

function trouverChrome() {
  const trouve = CANDIDATS.filter(Boolean).find((chemin) => fs.existsSync(chemin));
  if (!trouve) {
    throw new Error(
      'Aucun Chrome trouvé. Renseigner UCM_CHROME avec le chemin de l’exécutable.',
    );
  }
  return trouve;
}

function urlFichier(chemin) {
  return `file:///${chemin.replace(/\\/g, '/').replace(/^\//, '')}`;
}

/**
 * Une capture, un profil, une limite de temps.
 *
 * Les deux précautions ont la même cause, trouvée en exécutant U1.1 : l'état
 * `echec-github-repli-local` déclenche un vrai téléchargement (`download` crée
 * un blob et clique un lien), et ce Chrome-là ne rend jamais la main. Avec un
 * profil partagé, le suivant restait bloqué sur le verrou du profil et la
 * campagne s'arrêtait sans un mot, onze captures sur vingt et une. L'image, elle,
 * est écrite AVANT ce blocage : un profil par capture et un `timeout` suffisent
 * donc à la récolter puis à passer au suivant.
 */
function capturer(chrome, racineProfils, page, image, largeur, hauteur) {
  const profil = fs.mkdtempSync(path.join(racineProfils, 'profil-'));
  const resultat = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profil}`,
      `--window-size=${largeur},${hauteur}`,
      // Le pilote de la galerie joue son scénario en quelques dizaines de
      // millisecondes ; le budget laisse la marge, il ne l'attend pas.
      '--virtual-time-budget=2500',
      `--screenshot=${image}`,
      urlFichier(page),
    ],
    { encoding: 'utf8', timeout: 45000, killSignal: 'SIGKILL' },
  );
  if (!fs.existsSync(image)) {
    throw new Error(`Capture manquante : ${image}\n${resultat.stderr || resultat.stdout}`);
  }
}

function main() {
  const arguments_ = process.argv.slice(2);
  const parEtat = arguments_.includes('--etats');
  const demandes = arguments_.filter((valeur) => !valeur.startsWith('--'));
  const modes = demandes.length > 0 ? demandes : Object.keys(MODES);
  for (const mode of modes) {
    if (!MODES[mode]) throw new Error(`Mode inconnu : ${mode}. Attendus : ${Object.keys(MODES).join(', ')}`);
  }

  const chrome = trouverChrome();
  const profils = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-galerie-'));
  let comptees = 0;
  try {
    for (const mode of modes) {
      const dossier = path.join(sortie, mode);
      const pages = parEtat
        ? ETATS.filter((etat) => etat.existe).map((etat) => etat.id)
        : fs
            .readdirSync(dossier)
            .filter((nom) => /^planche-\d+\.html$/.test(nom))
            .map((nom) => nom.replace(/\.html$/, ''))
            .sort();
      for (const nom of pages) {
        capturer(
          chrome,
          profils,
          path.join(dossier, `${nom}.html`),
          path.join(dossier, `${nom}.png`),
          parEtat ? LARGEUR : PLANCHE.largeur,
          parEtat ? HAUTEUR : PLANCHE.hauteur,
        );
        comptees += 1;
      }
    }
  } finally {
    fs.rmSync(profils, { recursive: true, force: true });
  }
  console.log(`${comptees} captures écrites sous ${sortie}`);
}

if (require.main === module) main();
