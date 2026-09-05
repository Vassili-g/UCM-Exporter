/**
 * Fabrique la galerie d'états de l'interface (U1.1) à partir de `dist/ui.html`.
 *
 * **Le principe : ne rien réimplémenter.** Chaque page de la galerie EST
 * l'interface du plugin, telle que le build vient de la produire, à laquelle on
 * ajoute deux choses : le décalque des variables de thème, et un pilote qui
 * rejoue la suite de messages déclarée par l'état. Aucune vue n'est redessinée
 * ici — une galerie qui recopierait l'UI finirait par montrer autre chose
 * qu'elle, et le jour où elle mentirait serait invisible.
 *
 * Le pilote parle le protocole réel : `window.postMessage({ pluginMessage })`,
 * exactement ce que le sandbox envoie. Les gestes qui ne passent pas par un
 * message — ouvrir la configuration, déclencher une erreur d'interface — sont
 * des clics et des événements, pas des raccourcis dans l'état interne.
 *
 * Sortie : `dist/galerie/<mode>/<id>.html` (une fenêtre de plugin, 380 × 500),
 * `dist/galerie/<mode>/planche-N.html` (quatre états côte à côte, pour la
 * capture et pour l'œil) et `dist/galerie/index.html`.
 */
const fs = require('fs');
const path = require('path');
const { ETATS } = require('./etats.cjs');

const LARGEUR = 380;
const HAUTEUR = 500;
/** Quatre états par planche : c'est ce qui tient sans réduire la capture. */
const PAR_PLANCHE = 4;

/**
 * Les trois manières de servir les couleurs à l'interface.
 *
 * `replis` n'est pas un thème de Figma : c'est le cas où l'hôte ne sert AUCUNE
 * des variables demandées et où les valeurs de repli de `styles.css`
 * s'appliquent seules. Il existe pour U1.8, qui doit regarder ce que devient
 * un repli écrit pour le thème clair quand l'éditeur est sombre.
 */
const MODES = {
  clair: { titre: 'Thème clair', classe: '', variables: true },
  sombre: { titre: 'Thème sombre', classe: 'figma-dark', variables: true },
  replis: { titre: 'Thème sombre, aucune variable servie', classe: 'figma-dark', variables: false },
};

const racine = path.resolve(__dirname, '..');
const dist = path.join(racine, 'dist');
const sortie = path.join(dist, 'galerie');

/**
 * Toutes les substitutions passent par une FONCTION, jamais par une chaîne.
 * C'est la leçon de `build-ui.cjs` : dans une chaîne de remplacement,
 * `String.replace` interprète `$&`, `` $` ``, `$'`, `$$` et `$1`. Le bundle
 * minifié, le CSS et le JSON des scénarios en contiennent.
 */
function remplacer(source, motif, contenu) {
  if (!source.includes(motif)) throw new Error(`Motif introuvable dans dist/ui.html : ${motif}`);
  return source.replace(motif, () => contenu);
}

/** Un `</script>` dans une chaîne fermerait la balise qui la porte. */
function neutraliserBalises(texte) {
  return texte.replace(/<\/script/gi, '<\\/script').replace(/<\/style/gi, '<\\/style');
}

/**
 * Le pilote. Il attend une image stable avant de se déclarer prêt : la capture
 * s'appuie sur `data-galerie` pour ne pas photographier un écran à moitié joué.
 */
function pilote(etat) {
  const scenario = neutraliserBalises(JSON.stringify(etat.atteinte));
  return `<script>
(function () {
  var scenario = ${scenario};
  var pause = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  (async function () {
    for (var rang = 0; rang < scenario.length; rang += 1) {
      var etape = scenario[rang];
      if (etape.message) window.postMessage({ pluginMessage: etape.message }, '*');
      else if (etape.clic) {
        var cible = document.querySelector(etape.clic);
        if (!cible) throw new Error('Galerie : aucun élément pour ' + etape.clic);
        cible.click();
      } else if (etape.erreurUi) {
        window.dispatchEvent(new ErrorEvent('error', { message: etape.erreurUi }));
      }
      await pause(8);
    }
    document.documentElement.dataset.galerie = 'pret';
  })();
})();
</script>`;
}

/** Une page = l'interface réelle, le décalque de thème, et le pilote. */
function pageEtat(gabarit, mode, etat) {
  const decalque = mode.variables
    ? `<style>${neutraliserBalises(fs.readFileSync(path.join(__dirname, 'theme-figma.css'), 'utf8'))}</style>`
    : '<!-- aucune variable servie : les replis de styles.css s\'appliquent seuls -->';
  let page = remplacer(gabarit, '<html lang="fr">', `<html lang="fr" class="${mode.classe}">`);
  page = remplacer(page, '</head>', `${decalque}</head>`);
  return remplacer(page, '</body>', `${pilote(etat)}</body>`);
}

const styleDePlanche = `
  body { margin: 0; padding: 12px; background: #8f8f8f;
         font: 12px/1.4 Inter, ui-sans-serif, system-ui, sans-serif; color: #fff; }
  .grille { display: grid; grid-template-columns: repeat(2, ${LARGEUR}px); gap: 12px; }
  figure { margin: 0; display: grid; gap: 4px; }
  figcaption { font-weight: 600; }
  iframe { width: ${LARGEUR}px; height: ${HAUTEUR}px; border: 0; display: block; }
`;

/** Une planche : quatre fenêtres de plugin côte à côte, légendées. */
function pagePlanche(mode, nomMode, etats, rang) {
  const cellules = etats
    .map(
      (etat) => `    <figure>
      <figcaption>${etat.id}</figcaption>
      <iframe src="./${etat.id}.html" title="${etat.titre}"></iframe>
    </figure>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Galerie ${nomMode} — planche ${rang}</title>
    <style>${styleDePlanche}</style>
  </head>
  <body>
    <div class="grille">
${cellules}
    </div>
  </body>
</html>
`;
}

/** L'index : les modes, leurs planches, et les états qui n'existent pas encore. */
function pageIndex(planchesParMode) {
  const absents = ETATS.filter((etat) => !etat.existe)
    .map((etat) => `      <li><strong>${etat.titre}</strong> — attendu par ${etat.attendu}</li>`)
    .join('\n');
  const modes = Object.entries(MODES)
    .map(([nom, mode]) => {
      const liens = planchesParMode[nom]
        .map((_, rang) => `<a href="./${nom}/planche-${rang + 1}.html">planche ${rang + 1}</a>`)
        .join(' · ');
      const etats = ETATS.filter((etat) => etat.existe)
        .map((etat) => `        <li><a href="./${nom}/${etat.id}.html">${etat.titre}</a></li>`)
        .join('\n');
      return `    <section>
      <h2>${mode.titre}</h2>
      <p>${liens}</p>
      <ul>
${etats}
      </ul>
    </section>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Galerie des états de l'interface</title>
    <style>
      body { margin: 0 auto; padding: 24px; max-width: 720px;
             font: 14px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; }
      h1 { font-size: 20px; }
      h2 { font-size: 15px; margin-bottom: 4px; }
      ul { margin: 4px 0 16px; }
    </style>
  </head>
  <body>
    <h1>Galerie des états de l'interface</h1>
    <p>Chaque page est l'interface du plugin telle que <code>npm run build</code>
      vient de la produire, pilotée par la suite de messages déclarée dans
      <code>galerie/etats.cjs</code>. Les couleurs viennent d'un décalque, pas de
      Figma : cette galerie sert à juger une hiérarchie, pas un contraste.</p>
    <h2>Situations que l'interface ne sait pas encore montrer</h2>
    <ul>
${absents}
    </ul>
${modes}
  </body>
</html>
`;
}

function construire() {
  const gabarit = path.join(dist, 'ui.html');
  if (!fs.existsSync(gabarit)) throw new Error('dist/ui.html absent. Lancer npm run build:ui.');
  const source = fs.readFileSync(gabarit, 'utf8');

  fs.rmSync(sortie, { recursive: true, force: true });
  const atteignables = ETATS.filter((etat) => etat.existe);
  const planchesParMode = {};

  for (const [nom, mode] of Object.entries(MODES)) {
    const dossier = path.join(sortie, nom);
    fs.mkdirSync(dossier, { recursive: true });
    for (const etat of atteignables) {
      fs.writeFileSync(path.join(dossier, `${etat.id}.html`), pageEtat(source, mode, etat));
    }
    const planches = [];
    for (let debut = 0; debut < atteignables.length; debut += PAR_PLANCHE) {
      planches.push(atteignables.slice(debut, debut + PAR_PLANCHE));
    }
    planches.forEach((etats, rang) => {
      fs.writeFileSync(
        path.join(dossier, `planche-${rang + 1}.html`),
        pagePlanche(mode, mode.titre, etats, rang + 1),
      );
    });
    planchesParMode[nom] = planches;
  }

  fs.writeFileSync(path.join(sortie, 'index.html'), pageIndex(planchesParMode));
  const absents = ETATS.length - atteignables.length;
  console.log(
    `Galerie : ${atteignables.length} états atteignables × ${Object.keys(MODES).length} modes, `
      + `${absents} situations sans écran, dans ${sortie}`,
  );
}

module.exports = { MODES, LARGEUR, HAUTEUR, PAR_PLANCHE, sortie };

if (require.main === module) construire();
