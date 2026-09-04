/**
 * Ce que le contrôle d'un repository produit, verrouillé de bout en bout.
 *
 * **Ces scénarios viennent du consommateur, et c'est ce qui fait leur valeur.**
 * Ils ont été écrits par T5.1 sur `check-contract.mjs` AVANT que cinq tâches le
 * réécrivent — D1, T2.3, T2.4, T2.6 et T5.2 —, précisément pour que chacune
 * voie ce qu'elle déplaçait. T5.2 est la dernière des cinq : elle les amène ici
 * avec le code qu'ils tiennent.
 *
 * Ils ne disent pas ce que le rapport DEVRAIT écrire. Ils enregistrent ce qu'il
 * écrit. Un échec ne signale donc pas forcément une régression : il signale un
 * CHANGEMENT. La question à se poser est « est-ce celui que je voulais », et la
 * réponse s'écrit en mettant l'attendu à jour dans le même commit que le
 * changement — jamais en affaiblissant l'assertion pour retrouver du vert.
 *
 * *Ce que le déplacement a rendu au harnais.* Chez le consommateur, il fallait
 * recopier tout `scripts/` dans un repo jouet vivant DANS le repository : le
 * script déduisait sa racine de sa propre position et n'acceptait aucun
 * argument, et l'adaptateur TypeScript exigeait un `node_modules` atteignable.
 * `controlerRepository` prend une racine et une configuration ; il ne reste
 * qu'un dossier temporaire et un appel de fonction.
 *
 * Le corpus est SYNTHÉTIQUE, jamais celui d'un repository réel : des contrats
 * réels changent à chaque réexport, et un test de caractérisation assis dessus
 * mesurerait Figma au lieu de mesurer ce module.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { controlerRepository } from "../src/lecteurs/controle-repository.mjs";

/**
 * La configuration du repo jouet — délibérément PAS celle par défaut.
 *
 * Les scénarios viennent d'un repository qui range ses contrats sous `src/` :
 * les garder tels quels transporte les attentes mot pour mot, et fait au
 * passage passer un `ucm.config.json` non trivial dans le contrôle.
 */
const CONFIGURATION = {
  components: "src",
  tokens: "src/tokens/tokens.json",
  implementation: "{dir}/{id}.tsx",
};

/** Contrat 12.0 minimal et valide, citant une seule référence de token. */
function contrat() {
  return {
    name: "Widget",
    meta: {
      contractVersion: "12.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      figma: { fileName: "f", nodeId: "1:1" },
      coverage: { portable: "complete" },
    },
    viewStructures: {
      st1: {
        layout: "flex-row",
        sizing: { width: "fit-content", height: "fit-content" },
        children: [{ slot: "label", tokens: { color: "{couleurs.texte.principal}" } }],
      },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, tokens: {}, view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  };
}

const TOKENS = { couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } } };
const TSX = `export interface WidgetProps { children?: unknown }
export function Widget(_props: WidgetProps) { return null; }
`;

/**
 * Monte un repository jouet et rend sa racine.
 *
 * `composants` est un dictionnaire `Nom → { contrat, tsx }` : `contrat` est
 * l'objet à écrire, `tsx` la source de l'implémentation, absente si le scénario
 * veut une implémentation manquante.
 */
function preparerRepo({ composants = {}, tokens = {} }) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-caracterisation-"));
  mkdirSync(join(racine, "src", "tokens"), { recursive: true });
  writeFileSync(join(racine, CONFIGURATION.tokens), JSON.stringify(tokens, null, 2));

  for (const [nom, { contrat: document, tsx }] of Object.entries(composants)) {
    const dossier = join(racine, "src", "components", nom);
    mkdirSync(dossier, { recursive: true });
    if (document !== undefined) {
      writeFileSync(join(dossier, `${nom}.contract.json`), JSON.stringify(document, null, 2));
    }
    if (tsx !== undefined) writeFileSync(join(dossier, `${nom}.tsx`), tsx);
  }
  return racine;
}

/**
 * Monte un repository jouet, le passe au contrôle, rend son verdict, et le
 * démonte — même quand l'assertion échoue, sinon un test rouge laisserait un
 * dossier derrière lui à chaque exécution.
 */
function verdict({ composants, tokens = TOKENS, casser } = {}) {
  const racine = preparerRepo({
    composants: composants ?? { Widget: { contrat: contrat(), tsx: TSX } },
    tokens,
  });
  try {
    if (casser) casser(racine);
    return controlerRepository(racine, { configuration: CONFIGURATION });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test("tout valide : rien ne bloque, et un rapport qui ne réclame rien", () => {
  const { bloquant, rapport } = verdict();

  assert.equal(bloquant, false);
  assert.equal(
    rapport,
    "## ✅ Aucun blocage détecté\n\n"
      + "1 contrat et 1 référence de token contrôlés. Les contrôles bloquants sont passés.",
  );
});

/**
 * Le seul contrôle qui protège le design. Depuis T2.4 il interroge la source
 * DTCG, et non plus les variables CSS qu'elle produit : le scénario donne donc
 * un fichier de tokens VIDE, où la référence n'existe réellement pas.
 */
test("référence absente des tokens : avertissement, et la fusion reste ouverte", () => {
  const { bloquant, rapport } = verdict({ tokens: {} });

  assert.equal(bloquant, false, "un token absent n'a jamais bloqué : nul ne le corrige en réexportant");
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /### ⚠️ Des contrats utilisent des tokens absents de la source \(1 référence\)/);
  assert.match(rapport, /- \*\*`Widget\.contract\.json`\*\* : `\{couleurs\.texte\.principal\}`/);
  assert.match(rapport, /Cet avertissement ne bloque pas la fusion\./);
});

/**
 * Ce que T2.4 a fait cesser, et qu'aucun test ne surveillait : Figma nomme des
 * tokens `layouts.sizing.0,5`, une projection CSS en fait
 * `--layouts-sizing-0-5`, et la traduction `.` → `-` cherchait
 * `layouts-sizing-0,5`. Le token existait, le rapport le déclarait absent.
 */
test("un nom que la projection CSS perdait est reconnu", () => {
  const contratVirgule = contrat();
  contratVirgule.viewStructures.st1.children[0].tokens.gap = "{layouts.sizing.0,5}";

  const { bloquant, rapport } = verdict({
    composants: { Widget: { contrat: contratVirgule, tsx: TSX } },
    tokens: {
      ...TOKENS,
      layouts: { sizing: { "0,5": { $type: "dimension", $value: "4px" } } },
    },
  });

  assert.equal(bloquant, false);
  assert.doesNotMatch(rapport, /tokens absents de la source/);
});

/**
 * D1 a retiré ce contrôle en entier : il relève d'un linter, projet distinct.
 *
 * Ce test ne teste plus le contrôle — il teste son ABSENCE, ce qui n'est pas la
 * même chose : sans lui, rien ne dirait qu'un autre contrôle n'a pas repris le
 * blocage au passage. Le contrôle ne lit plus le code du tout ; une
 * implémentation qui cite n'importe quoi ne le regarde plus.
 */
test("token écrit dans le code et non déclaré : plus rien ne le regarde", () => {
  const { bloquant, rapport } = verdict({
    composants: {
      Widget: {
        contrat: contrat(),
        tsx: `import { tokenVar } from "../../tokens";
export interface WidgetProps { children?: unknown }
export function Widget(_props: WidgetProps) {
  return tokenVar("{couleurs.texte.inconnu}");
}
`,
      },
    },
  });

  assert.equal(bloquant, false, "le code n'est plus inspecté : rien ici ne peut bloquer");
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.doesNotMatch(rapport, /utilise des tokens absents des contrats/);
  assert.doesNotMatch(rapport, /construit des noms de tokens à l'exécution/);
});

/**
 * T2.3 a scindé ce constat : l'existence au noyau, la comparaison à
 * l'adaptateur. Le message promettait un `.tsx`, ce qui est faux dans un repo
 * Swift — et faux sur la pull request d'export elle-même, la seule que le
 * designer lise. T2.6 a retiré le mot ; l'attente ci-dessous est la nouvelle
 * formulation, et c'est elle qui rend la correction visible ici.
 */
test("implémentation absente : état d'avancement, pas erreur", () => {
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: contrat() } } });

  assert.equal(bloquant, false, "l'absence d'implémentation est un avancement, pas un échec");
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /### ℹ️ Un composant n'a pas encore d'implémentation \(1 composant\)/);
  assert.match(rapport, /dès que l'implémentation du composant sera ajoutée/);
});

/**
 * Critère de réussite n° 4 du plan : un contrat d'une version non lue est
 * refusé par un message qui dit QUI corrige.
 *
 * *L'écart que ce test tenait ouvert est refermé (T2.1b).* La section le disait
 * correctement, mais le TITRE écrivait « contrat invalide » et accusait le
 * designer pour un contrat parfaitement formé dont seule la version n'est pas
 * lue. Le titre nomme désormais le repository, à l'endroit le plus visible du
 * rapport.
 */
test("version non lue : refus, et la section désigne le développeur", () => {
  const futur = contrat();
  futur.meta.contractVersion = "99.0";
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: futur, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ La version du contrat n'est pas prise en charge : `Widget\.contract\.json`/);
  assert.match(rapport, /Le contrat utilise le schéma 99\.0\. Le repository prend en charge les schémas 12\.0\./);
  assert.match(rapport, /Un développeur doit auditer le nouveau schéma[\s\S]*Réexporter ne corrigera pas ce problème\./);
  assert.match(
    rapport,
    /^## ❌ 1 contrat dans une version que ce repository ne lit pas$/m,
    "le titre ne doit pas accuser le designer pour un contrat que rien ne rend invalide",
  );
  assert.doesNotMatch(rapport, /^## ❌ 1 contrat invalide$/m);
});

/**
 * Le défaut que T2.1b annonçait, rendu visible — il était LATENT.
 *
 * L'analyse appelait `champsInvalidesDuContrat` avant `verdictDeVersion` et
 * sortait tôt. Il suffit d'un contrat hors fenêtre dont les champs, EUX, ne
 * passent pas, pour que le verdict de version soit perdu et que le rapport
 * écrive « contrat invalide » — un titre qui accuse le designer, et un geste
 * correctif qui n'existe pas : réexporter ne rend pas lisible un schéma que le
 * repo ne lit pas.
 */
test("version non lue ET champs invalides : c'est la version qui parle", () => {
  const futur = contrat();
  futur.meta.contractVersion = "99.0";
  // Ce qui manque est réellement exigé — le témoin plus bas le prouve sur un
  // contrat dont la version, elle, est lue.
  delete futur.rendering;
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: futur, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(
    rapport,
    /### ❌ La version du contrat n'est pas prise en charge : `Widget\.contract\.json`/,
    "le verdict de version doit survivre à des champs invalides",
  );
  assert.match(rapport, /Un développeur doit auditer le nouveau schéma/);
  assert.doesNotMatch(
    rapport,
    /### ❌ Le contrat est incomplet/,
    "dresser la liste des champs manquants d'une grammaire qu'on ne lit pas "
      + "n'a aucun sens, et désigne le mauvais responsable",
  );
});

/**
 * Le pendant, et il tient la nuance qui empêche l'inversion d'aller trop loin :
 * un contrat sans version LISIBLE n'est pas un contrat périmé, c'est un contrat
 * cassé. Sans lui, la correction remplacerait une accusation fausse par une
 * autre — « réexportez, votre schéma est trop ancien » pour un fichier vide.
 */
test("un contrat sans version lisible reste cassé, pas périmé", () => {
  const sansVersion = contrat();
  delete sansVersion.meta.contractVersion;
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: sansVersion, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(rapport, /### ❌ Le contrat est incomplet : `Widget\.contract\.json`/);
  assert.match(rapport, /- `meta\.contractVersion`/);
  assert.doesNotMatch(rapport, /La version du contrat n'est pas prise en charge/);
});

test("contrat réellement cassé : refus, et le geste correctif est le réexport", () => {
  const casse = contrat();
  delete casse.rendering;
  const { bloquant, rapport } = verdict({ composants: { Widget: { contrat: casse, tsx: TSX } } });

  assert.equal(bloquant, true);
  assert.match(rapport, /^## ❌ 1 contrat invalide$/m);
  assert.match(rapport, /### ❌ Le contrat est incomplet : `Widget\.contract\.json`/);
  assert.match(rapport, /- `rendering\.roles`/);
  assert.match(rapport, /Réexportez le composant depuis Figma\./);
});

/**
 * Les filets, REPORTÉS par T2.4 sur la source DTCG au lieu de disparaître avec
 * la lecture du CSS : un fichier de tokens absent ou illisible se publie comme
 * le reste, sinon le refus serait muet.
 *
 * Absent et illisible portent des titres DIFFÉRENTS parce qu'ils appellent des
 * gestes différents : régénérer, ou cesser d'éditer le fichier à la main.
 */
test("tokens illisibles ou absents : le refus porte quand même un message", () => {
  const sansTokens = verdict({
    casser: (racine) => rmSync(join(racine, CONFIGURATION.tokens)),
  });
  assert.equal(sansTokens.bloquant, true);
  assert.match(sansTokens.rapport, /^## ❌ `src\/tokens\/tokens\.json` est introuvable$/m);
  assert.match(sansTokens.rapport, /relancez \*\*Exporter les tokens\*\* depuis Figma/);

  const jsonCasse = verdict({
    casser: (racine) => writeFileSync(join(racine, CONFIGURATION.tokens), "{ pas du json"),
  });
  assert.equal(jsonCasse.bloquant, true);
  assert.match(jsonCasse.rapport, /^## ❌ `src\/tokens\/tokens\.json` est illisible$/m);
  assert.match(jsonCasse.rapport, /Relancez \*\*Exporter les tokens\*\* depuis Figma plutôt que de le corriger\./);
});

/**
 * Le troisième filet, ajouté par T5.2 parce que le déplacement le rend
 * atteignable : chez le consommateur d'origine, le dossier des contrats
 * existait toujours. Ailleurs, c'est un `ucm.config.json` qui se trompe de
 * chemin, ou un repo qui n'a pas encore reçu son premier export — et un ENOENT
 * remonté rendrait une stack trace Node là où ce module s'interdit partout
 * ailleurs d'exploser plutôt que de diagnostiquer.
 */
test("dossier de contrats introuvable : un diagnostic, pas une stack trace", () => {
  const racine = preparerRepo({ tokens: TOKENS });
  try {
    const { bloquant, rapport } = controlerRepository(racine, {
      configuration: { ...CONFIGURATION, components: "composants-ailleurs" },
    });
    assert.equal(bloquant, true);
    assert.match(rapport, /^## ❌ `composants-ailleurs` est introuvable$/m);
    assert.match(rapport, /corriger le chemin déclaré dans `ucm\.config\.json`/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Ce que le noyau répond SANS adaptateur, et c'est la règle de tri n° 3 mise à
 * l'épreuve : il ne dit jamais « conforme » de ce qu'il n'a pas lu.
 *
 * Les deux verdicts sont opposés et aucun ne bloque : le fichier n'est pas là,
 * état d'avancement légitime — ou il est là, et personne n'a de vérificateur
 * pour ce langage. Le second n'accuse personne, parce qu'il n'y a personne à
 * qui adresser un geste correctif.
 */
test("sans adaptateur, le noyau dit où est l'implémentation et rien de plus", () => {
  const racine = preparerRepo({
    composants: {
      Ecrit: { contrat: contrat(), tsx: TSX },
      Attendu: { contrat: contrat() },
    },
    tokens: TOKENS,
  });
  try {
    const { bilans, terminal } = controlerRepository(racine, { configuration: CONFIGURATION });
    const parNom = new Map(bilans.map((bilan) => [bilan.fichier, bilan]));

    assert.equal(parNom.get("Attendu.contract.json").parite.implementationAbsente, true);
    assert.equal(parNom.get("Ecrit.contract.json").parite.implementationAbsente, false);
    assert.equal(parNom.get("Ecrit.contract.json").parite.implementationNonLue, "Ecrit.tsx");

    const fil = terminal.map(({ texte }) => texte).join("\n");
    assert.match(fil, /Attendu\.contract\.json : .*implémentation en attente \(autorisé\)/);
    assert.match(fil, /Ecrit\.contract\.json : .*implémentation présente, non lue par l'adaptateur \(Ecrit\.tsx\)/);
    assert.doesNotMatch(fil, /code conforme/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * L'adaptateur est la seule porte par laquelle une connaissance de stack entre.
 *
 * Ce faux adaptateur ne lit aucun langage : il rend un écart directement. Ce
 * qu'on vérifie est le CHEMIN — que le contrôle l'appelle, lui passe le chemin
 * d'implémentation résolu par le motif, et publie son verdict en
 * avertissement sans jamais bloquer.
 */
test("un adaptateur branché est appelé, et son écart avertit sans bloquer", () => {
  const vus = [];
  const adaptateur = {
    lireApiPublique: (implementations) => {
      vus.push(...implementations);
      return new Map(implementations.map((chemin) => [chemin, { props: [] }]));
    },
    nomInterfaceAttendue: () => "WidgetProps",
    ecartsDeParite: () => ({
      implementationAbsente: false,
      implementationNonLue: null,
      interfaceAbsente: null,
      fonctionAbsente: null,
      manquantes: ["label"],
      typesIncorrects: [],
      booleensNonUtilises: [],
      compositionsIncorrectes: [],
    }),
  };

  const racine = preparerRepo({
    composants: { Widget: { contrat: contrat(), tsx: TSX } },
    tokens: TOKENS,
  });
  try {
    const { bloquant, rapport } = controlerRepository(racine, { configuration: CONFIGURATION, adaptateur });

    assert.deepEqual(vus, [join(racine, "src", "components", "Widget", "Widget.tsx")]);
    assert.equal(bloquant, false, "un code en retard n'a jamais refusé la pull request d'un designer");
    assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.match(rapport, /### ⚠️ Le code est en retard sur le contrat : `Widget\.contract\.json`/);
    assert.match(rapport, /La prop `label` du contrat n'existe pas dans le composant\./);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Ce que l'appelant transmet de ce qu'il a exécuté lui-même.
 *
 * Un rapport vert alors que la pull request est refusée est pire que pas de
 * rapport du tout : le designer chercherait la panne ailleurs. Le contrôle
 * couvre donc aussi ce qu'il n'a pas exécuté — et le titre, lui, ne parle pas
 * des contrats, qui sont valides.
 */
test("des tests rouges bloquent, sous un titre qui n'accuse aucun contrat", () => {
  const racine = preparerRepo({
    composants: { Widget: { contrat: contrat(), tsx: TSX } },
    tokens: TOKENS,
  });
  try {
    const { bloquant, rapport } = controlerRepository(racine, {
      configuration: CONFIGURATION,
      echecsDeTests: {
        echoue: true,
        echecs: [
          { fichier: "src/components/Widget/Widget.test.tsx", composant: "Widget", assertion: true, test: "rend la couleur du contrat" },
          { fichier: "scripts/parite.test.mjs", composant: null, assertion: true, test: "relève l'API publique" },
        ],
      },
    });

    assert.equal(bloquant, true);
    assert.match(rapport, /^## ❌ Les contrôles du repository bloquent la fusion$/m);
    assert.match(rapport, /### ❌ Le code n'est plus conforme aux contrats \(1 composant\)/);
    assert.match(rapport, /\*\*Widget\*\* : rend la couleur du contrat/);
    assert.match(rapport, /### ❌ Un garde-fou du repository est en échec \(1 test\)/);
    assert.doesNotMatch(rapport, /contrat invalide/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
