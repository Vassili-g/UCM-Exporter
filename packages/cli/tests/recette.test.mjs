/**
 * La recette du repo vierge — Phase 7 du plan d'industrialisation.
 *
 * ## Ce qu'elle mesure, et pourquoi elle n'est pas un test de plus
 *
 * `cli.test.mjs` et `check.test.mjs` appellent `init` et `check` **en
 * processus**, depuis l'intérieur du monorepo, et lisent la valeur que les
 * fonctions rendent. C'est le bon point de vue pour juger la COUCHE OUTIL, et
 * c'est le leur.
 *
 * Ce fichier-ci est au point de vue inverse, le seul qui reste : celui du
 * repository qui reçoit des contrats. Il en découle quatre différences, et
 * chacune répond à une leçon écrite dans le plan.
 *
 * 1. **Le repository est construit par `ucm init`, et par rien d'autre.** Pas
 *    un dossier fabriqué à la main qui ressemblerait au résultat — le résultat
 *    lui-même. Le critère de réussite n° 1 dit « zéro ligne à la main » ; le
 *    seul moyen de le vérifier est de n'en écrire aucune.
 * 2. **La commande est lancée comme un PROCESSUS**, depuis ce dossier, par le
 *    fichier que `bin` désigne. Le plan a enregistré deux fois la même leçon —
 *    « une publication n'est pas un événement, c'est un état qu'il faut
 *    vérifier depuis dehors » —, et la seconde fois le paquet publié était
 *    cassé alors que toute la suite était verte. Un appel en processus ne
 *    traverse ni la garde de `process.argv[1]`, ni la résolution de
 *    `@ucm-kit/core` depuis un autre dossier, ni le code de sortie réel.
 * 3. **Le dossier est hors du monorepo et ne porte aucun `package.json`**, ni
 *    lui ni aucun de ses parents — le harnais le vérifie plutôt que d'y
 *    croire. C'est T3.4 : un repo iOS, un dossier de contrats et rien d'autre.
 * 4. **Les oracles sont ceux de T7.0c**, et il n'y en a pas d'autres : le code
 *    de sortie du processus, et les titres présents ou absents dans
 *    `ci-report.md`. Le rapport est le seul message que le designer reçoit ;
 *    ce qu'un développeur lirait dans un log n'est pas ce qui est jugé ici.
 *
 * ## Ce qu'elle ne fait pas
 *
 * Elle n'ouvre aucune pull request et ne parle à aucun GitHub. Le repo de
 * recette réel — créé et tenu par le mainteneur, hors du plan — reste ce qui
 * éprouve le workflow lui-même. Ce fichier tient la part qui se rejoue à chaque
 * commit, c'est-à-dire tout ce qui se passe entre le dossier et le rapport.
 *
 * Elle n'installe rien depuis le registre non plus : `npx --yes @ucm-kit/cli@x`
 * jugerait la version publiée, pas celle qu'on est en train d'écrire. Le
 * chemin traversé est le même, à l'installation près.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { VERSION_CONTRAT_MAXIMALE, VERSION_CONTRAT_MINIMALE } from "@ucm-kit/core/lecteurs";

/** Le fichier que `bin` désigne : le point d'entrée réel, pas un module voisin. */
const BINAIRE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "ucm.mjs");

/**
 * Le `tokens.json` minimal de la recette — T7.0b.
 *
 * Deux tokens, et le second est là pour une raison précise. `%` est la classe
 * de divergence que T6.0 a mesurée : la projection CSS le supprime, donc `50%`
 * et `50` rendraient la même variable. Aucun token du corpus réel n'en porte —
 * vérifié —, et le garde-fou du consommateur ne peut donc pas s'exercer.
 *
 * Ce qu'il prouve ICI est l'autre moitié, et c'est celle qui compte pour la
 * portabilité : le chemin portable ne passe PAS par la projection CSS. Un token
 * qu'aucun nom de variable ne saurait porter fidèlement est trouvé quand même,
 * parce que le contrôle d'existence compare des CHEMINS dans le fichier DTCG
 * (T2.4) et non des noms dans une feuille de style. Le jour où ce contrôle
 * repasserait par un nom CSS, ce token le ferait rougir.
 */
const TOKENS = {
  couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } },
  opacites: { "50%": { $type: "number", $value: 0.5 } },
};

/** Un contrat valide dans la version que ce kit lit, citant les deux tokens. */
function contrat(nom, version = VERSION_CONTRAT_MAXIMALE) {
  return {
    name: nom,
    meta: {
      contractVersion: version,
      exportedAt: "2026-01-01T00:00:00.000Z",
      figma: { fileName: "Design System", nodeId: "1:1" },
      coverage: { portable: "complete" },
    },
    viewStructures: {
      st1: {
        layout: "flex-row",
        sizing: { width: "fit-content", height: "fit-content" },
        children: [{
          slot: "label",
          tokens: {
            color: "{couleurs.texte.principal}",
            opacity: "{opacites.50%}",
          },
        }],
      },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, tokens: {}, view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  };
}

/**
 * La version immédiatement sous la fenêtre de lecture, calculée depuis le kit.
 *
 * Elle n'est pas écrite en dur : le jour où D8 élargit la fenêtre à deux
 * versions, « une version de retard » deviendra une version LUE et ce fichier
 * jugerait le contraire de ce que le kit fait. Ce qui est hors fenêtre par
 * construction, c'est la majeure d'en dessous.
 */
function versionSousLaFenetre() {
  return `${Number(VERSION_CONTRAT_MINIMALE.split(".")[0]) - 1}.0`;
}

/** Aucun `package.json` de la racine du repo jusqu'à celle du disque (T3.4). */
function aucunProjetNodeAuDessus(racine) {
  const sommet = parse(racine).root;
  for (let dossier = racine; ; dossier = dirname(dossier)) {
    if (existsSync(join(dossier, "package.json"))) return false;
    if (dossier === sommet) return true;
  }
}

/** Lance `ucm` comme un processus, depuis le repository, et rend tout ce qu'il dit. */
function ucm(racine, arguments_ = []) {
  const execution = spawnSync(process.execPath, [BINAIRE, ...arguments_], {
    cwd: racine,
    encoding: "utf8",
  });
  if (execution.error) throw execution.error;
  const chemin = join(racine, "ci-report.md");
  return {
    code: execution.status,
    terminal: `${execution.stdout}${execution.stderr}`,
    rapport: existsSync(chemin) ? readFileSync(chemin, "utf8") : null,
  };
}

/** `ucm check --report`, l'invocation exacte que le workflow écrit. */
function controler(racine) {
  return ucm(racine, ["check", "--report", "ci-report.md"]);
}

/**
 * Un repository neuf, installé par la commande, puis rempli — dans cet ordre.
 *
 * `implementation` par défaut décrit un repo dont les composants ne sont PAS en
 * TypeScript : c'est la condition de T7.1, et la mettre par défaut évite qu'un
 * scénario retombe par inadvertance sur la stack du premier consommateur.
 */
function repoDeRecette({ composants = {}, tokens = TOKENS, implementation = "{dir}/{id}.swift" } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-recette-"));

  assert.equal(
    aucunProjetNodeAuDessus(racine),
    true,
    "la recette perdrait son objet dans un dossier qu'un package.json couvre",
  );

  const installation = ucm(racine, ["init"]);
  assert.equal(installation.code, 0, installation.terminal);
  assert.ok(existsSync(join(racine, "ucm.config.json")), "init n'a pas écrit la configuration");

  // La seule ligne écrite à la main dans ce repository, et elle est le sujet du
  // scénario : ce repo dit où vivent SES implémentations. Le critère de
  // réussite n° 1 parle d'un repo qui n'a rien à déclarer ; celui-ci en a une.
  const configuration = JSON.parse(readFileSync(join(racine, "ucm.config.json"), "utf8"));
  writeFileSync(
    join(racine, "ucm.config.json"),
    `${JSON.stringify({ ...configuration, implementation }, null, 2)}\n`,
    "utf8",
  );

  if (tokens !== null) {
    writeFileSync(join(racine, "tokens.json"), `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
  }
  for (const [nom, document] of Object.entries(composants)) {
    ecrireContrat(racine, nom, document);
  }
  return racine;
}

/** Dépose un contrat comme l'export le ferait : un dossier par composant. */
function ecrireContrat(racine, nom, document) {
  const dossier = join(racine, "components", nom);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(
    join(dossier, `${nom}.contract.json`),
    typeof document === "string" ? document : `${JSON.stringify(document, null, 2)}\n`,
    "utf8",
  );
}

/** Exécute un scénario et nettoie, quoi qu'il arrive. */
function surLeRepo(options, scenario) {
  const racine = repoDeRecette(options);
  try {
    scenario(racine);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------------ */
/* T7.1 — un contrat sans implémentation, dans un repo qui n'est pas en TS.   */
/* ------------------------------------------------------------------------ */

/**
 * L'état d'avancement est un état, pas une erreur (critère de réussite n° 6),
 * et il doit être JUSTE sur la pull request d'export elle-même — celle que le
 * designer lit. C'est la coupure de T2.3 : avant elle, le moteur répondait
 * « implémentation en attente » à tout repo non-TypeScript, y compris quand le
 * composant était écrit.
 */
test("T7.1 — un contrat sans implémentation ne bloque pas, et le rapport le dit", () => {
  surLeRepo({ composants: { Badge: contrat("Badge") } }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 0, "un contrat sans implémentation n'est pas un échec");
    assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.match(rapport, /^### ℹ️ Un composant n'a pas encore d'implémentation \(1 composant\)$/m);
    assert.match(rapport, /^- `Badge\.contract\.json`$/m);
  });
});

/**
 * Le même repo, l'implémentation posée — en Swift, que rien ici ne sait lire.
 *
 * Deux affirmations sont attendues et une troisième est interdite : l'état
 * d'attente disparaît, aucun écart de parité n'est inventé, et le mot
 * « conforme » ne s'écrit nulle part. Conclure « conforme » d'un fichier qu'on
 * n'a pas lu est exactement la moitié du défaut que T2.3 corrige.
 */
test("T7.1 — une implémentation que rien ne sait lire n'est ni en attente ni conforme", () => {
  surLeRepo({ composants: { Badge: contrat("Badge") } }, (racine) => {
    writeFileSync(join(racine, "components", "Badge", "Badge.swift"), "struct Badge {}\n", "utf8");
    const { code, rapport, terminal } = controler(racine);

    assert.equal(code, 0);
    assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.doesNotMatch(rapport, /n'a pas encore d'implémentation/);
    assert.doesNotMatch(rapport, /Le code est en retard sur le contrat/);
    assert.match(terminal, /implémentation présente, non lue par l'adaptateur \(Badge\.swift\)/);
    assert.doesNotMatch(terminal, /code conforme/);
  });
});

/* ------------------------------------------------------------------------ */
/* T7.2 — les tokens sont résolus sans aucune chaîne CSS.                     */
/* ------------------------------------------------------------------------ */

/**
 * Le verrou de la portabilité (T2.4) : le contrôle d'existence lit le fichier
 * DTCG, jamais la feuille CSS qu'il produirait. Ce repo n'a ni Style
 * Dictionary, ni PostCSS, ni un seul `.css` — et les deux références du contrat
 * sont comptées.
 *
 * `opacites.50%` est le token de T7.0b : son nom ne survit pas à la projection
 * CSS, et il est trouvé quand même.
 */
test("T7.2 — les références sont résolues sans la moindre chaîne CSS", () => {
  surLeRepo({ composants: { Badge: contrat("Badge") } }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 0);
    assert.match(rapport, /1 contrat et 2 références de token contrôlés/);
    assert.doesNotMatch(rapport, /tokens absents de la source/);
  });
});

/**
 * Une référence disparue avertit sans bloquer (critère de réussite n° 5). Les
 * tokens sont la source de vérité, et un contrat exporté hier ne retient pas
 * leur évolution : refuser la fusion arrêterait le designer pour un fichier
 * qu'il n'a pas touché.
 */
test("T7.2 — une référence absente de la source avertit sans refuser la fusion", () => {
  const disparu = { couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } } };
  surLeRepo({ composants: { Badge: contrat("Badge") }, tokens: disparu }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 0, "un token retiré du design system ne refuse pas l'export");
    assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.match(rapport, /tokens absents de la source/);
    assert.match(rapport, /opacites\.50%/);
  });
});

/**
 * Le préalable manquant se dit, il ne se devine pas. Une pull request refusée
 * sans un mot laisse le designer sans recours — et « aucun token » se lirait
 * comme « rien à signaler » si le rapport se taisait.
 */
test("T7.2 — un fichier de tokens absent est refusé en nommant le préalable", () => {
  surLeRepo({ composants: { Badge: contrat("Badge") }, tokens: null }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 1);
    assert.match(rapport, /^## ❌ `tokens\.json` est introuvable$/m);
  });
});

/* ------------------------------------------------------------------------ */
/* T7.3 — une version non lue : refus, et le BON coupable désigné.            */
/* ------------------------------------------------------------------------ */

/**
 * Critère de réussite n° 4 : le message dit QUI corrige. Un contrat en avance
 * vient d'un plugin que ce repository n'a pas rattrapé ; le geste appartient à
 * un développeur, et réexporter ne ferait rien.
 */
test("T7.3 — un contrat en avance accuse le repository, du titre à l'action", () => {
  const futur = contrat("Badge", "99.0");
  surLeRepo({ composants: { Badge: futur } }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 1);
    assert.match(rapport, /^## ❌ 1 contrat dans une version que ce repository ne lit pas$/m);
    assert.match(rapport, /C'est le repository qui doit rattraper le format/);
    assert.match(rapport, /Un développeur doit auditer le nouveau schéma/);
    assert.doesNotMatch(rapport, /^## ❌ 1 contrat invalide$/m);
  });
});

/**
 * L'autre sens, et **c'est le scénario qui a trouvé un défaut**.
 *
 * Le titre écrivait « réexporter n'y changerait rien » trois lignes au-dessus
 * d'une action qui demande de réexporter. Deux phrases vraies séparément, qui
 * se contredisent dans le même rapport, la fausse étant la première que le
 * designer lit. Aucun test ne l'avait vu parce que tous fabriquaient une
 * version FUTURE : le sens `ancien` n'était éprouvé qu'au niveau de la section.
 */
test("T7.3 — un contrat en retard demande un réexport, et le titre ne le dément pas", () => {
  const perime = contrat("Badge", versionSousLaFenetre());
  surLeRepo({ composants: { Badge: perime } }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 1);
    assert.match(rapport, /^## ❌ 1 contrat dans une version que ce repository ne lit pas$/m);
    assert.match(rapport, /réexportez-le depuis Figma/);
    assert.match(rapport, /Réexportez le composant avec la version actuelle du plugin/);
    assert.doesNotMatch(
      rapport,
      /réexporter n'y changerait rien/i,
      "le titre et l'action ne peuvent pas nommer deux responsables",
    );
  });
});

/* ------------------------------------------------------------------------ */
/* T7.4 — un contrat réellement cassé bloque.                                 */
/* ------------------------------------------------------------------------ */

/**
 * Critère de réussite n° 7. Le geste demandé est un réexport, jamais une
 * retouche du JSON : un fichier produit par une machine et corrigé à la main
 * redevient faux au prochain export, sans que personne le sache.
 */
test("T7.4 — un contrat illisible bloque et renvoie vers l'export", () => {
  surLeRepo({ composants: { Badge: "{ ceci n'est pas du json" } }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 1);
    assert.match(rapport, /^### ❌ Le contrat n'est pas un fichier JSON valide : `Badge\.contract\.json`$/m);
    assert.match(rapport, /Ne corrigez pas le fichier JSON à la main/);
  });
});

/**
 * Un fichier vidé de sa substance est du JSON parfaitement valide, et c'est
 * précisément le piège : sans contrôle de champs, il passerait au vert — zéro
 * référence citée, donc zéro référence manquante.
 *
 * Il n'a pas non plus une version « trop ancienne » : il n'en a pas du tout.
 * Le rapport doit dire « incomplet », pas « périmé ».
 */
test("T7.4 — un contrat vidé de sa substance est incomplet, pas périmé", () => {
  surLeRepo({ composants: { Badge: {} } }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 1);
    assert.match(rapport, /^### ❌ Le contrat est incomplet : `Badge\.contract\.json`$/m);
    assert.doesNotMatch(rapport, /version que ce repository ne lit pas/);
  });
});

/**
 * Un contrat cassé et un contrat sain dans le même repository : le refus est
 * global, mais l'accusation reste nominative. Le rapport doit nommer le fichier
 * en cause et ne pas ranger l'autre parmi les fautifs.
 */
test("T7.4 — un contrat cassé ne salit pas ses voisins", () => {
  surLeRepo({
    composants: { Badge: contrat("Badge"), Casse: "{" },
  }, (racine) => {
    const { code, rapport } = controler(racine);

    assert.equal(code, 1);
    assert.match(rapport, /^## ❌ 1 contrat invalide$/m);
    assert.match(rapport, /`Casse\.contract\.json`/);
    assert.doesNotMatch(rapport, /❌ Le contrat n'est pas un fichier JSON valide : `Badge/);
  });
});

/* ------------------------------------------------------------------------ */
/* T7.5 — la montée de version, du refus au réexport.                         */
/* ------------------------------------------------------------------------ */

/**
 * Le repository a rattrapé le format, ses contrats non : c'est l'état où se
 * trouve tout consommateur le lendemain d'une montée du kit.
 *
 * La séquence entière est jouée sur le MÊME dossier, parce que c'est la
 * séquence qui est le sujet : refus qui nomme le designer et son geste,
 * réexport, fermeture. Un test qui vérifierait les deux extrémités sur deux
 * dossiers prouverait deux états, pas une sortie de crise.
 *
 * *Ce que ce scénario a mesuré, et que le plan enregistre :* la fenêtre de
 * lecture ne vaut aujourd'hui qu'UNE version — `VERSION_CONTRAT_MINIMALE` et
 * `VERSION_CONTRAT_MAXIMALE` sont égales. Il n'existe donc aucun recouvrement
 * pendant lequel l'ancienne et la nouvelle version seraient lues toutes les
 * deux : le repository passe au rouge à l'instant où le kit monte, et y reste
 * jusqu'au réexport. C'est ce que D8 voulait éviter, et ce n'est pas tenu. Ce
 * fichier ne le fige pas — il éprouve la version sous la fenêtre, quelle que
 * soit sa largeur.
 */
test("T7.5 — un contrat d'une version révolue est refusé, puis le réexport referme", () => {
  surLeRepo({ composants: { Badge: contrat("Badge", versionSousLaFenetre()) } }, (racine) => {
    const refus = controler(racine);
    assert.equal(refus.code, 1);
    assert.match(refus.rapport, /Réexportez le composant avec la version actuelle du plugin/);

    // Le réexport, tel que le plugin le ferait : le fichier est réécrit, pas
    // rapiécé. C'est le seul geste que le rapport ait demandé.
    ecrireContrat(racine, "Badge", contrat("Badge"));

    const apres = controler(racine);
    assert.equal(apres.code, 0, "le réexport est le geste qui referme, et il doit suffire");
    assert.match(apres.rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.doesNotMatch(apres.rapport, /version que ce repository ne lit pas/);
  });
});

/**
 * D7 : ce que le repository installe est épinglé EXACTEMENT, et la fenêtre de
 * lecture n'est écrite nulle part dans le repository.
 *
 * Les deux règles n'en font qu'une : le repo dit OÙ sont ses fichiers, le
 * paquet dit ce que le format EST. Un numéro recopié dans la configuration
 * créerait une seconde autorité, que quelqu'un mettrait à jour en croyant
 * déplacer la fenêtre — un geste sans effet, pire qu'un geste refusé.
 */
test("T7.5 — le repository épingle son outil et ne redéclare jamais le format", () => {
  surLeRepo({}, (racine) => {
    const workflow = readFileSync(join(racine, ".github", "workflows", "ucm.yml"), "utf8");
    const configuration = readFileSync(join(racine, "ucm.config.json"), "utf8");

    assert.match(workflow, /npx --yes @ucm-kit\/cli@\d+\.\d+\.\d+ check/);
    assert.doesNotMatch(workflow, /@ucm-kit\/cli@[\^~]/, "aucune plage de version");
    assert.doesNotMatch(
      configuration,
      new RegExp(`${VERSION_CONTRAT_MINIMALE}|${VERSION_CONTRAT_MAXIMALE}|contractVersion`),
      "la fenêtre de lecture appartient au paquet installé, jamais au repository",
    );
  });
});
