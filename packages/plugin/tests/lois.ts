/**
 * Les lois qu'un contrat doit tenir, quelle que soit sa provenance.
 *
 * Elles ne vivent pas dans un fichier de test parce qu'elles servent DEUX
 * lecteurs : chaque contrat que le moteur fabrique pendant `npm test`, et les
 * exports réels du corpus. Le premier est le filet de régression — il change
 * dès que le code change. Le second constate que de vraies données Figma les
 * satisfont aussi, ce qu'aucun montage synthétique ne peut prouver.
 *
 * Aucune loi ici ne connaît le nom d'un composant : elles se lisent sur la
 * forme du contrat, jamais sur ce qu'il décrit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Ajv from 'ajv';
import { champsInvalidesDuContrat, verdictDeVersion } from '@ucm-kit/core/lecteurs';
import { serializeJson } from '../src/contract/serializeJson';

/**
 * Le schéma publié par le kit, atteint par sa carte `exports`.
 *
 * Pas par un chemin de fichier : le kit est un paquet, et lui emprunter un
 * chemin interne rétablirait exactement le couplage que la coupure supprime.
 * Ce que le plugin peut lire du kit est ce que le kit déclare publier.
 */
const CHEMIN_DU_SCHEMA = createRequire(import.meta.url).resolve('@ucm-kit/core/schema');

/** Chaque partie d'une vue, et le catalogue où son renvoi se résout. */
export type Partie = 'structure' | 'typography' | 'composes' | 'icons' | 'paintPlacements';
export const CATALOGUE: Record<Partie, string> = {
  structure: 'viewStructures',
  typography: 'viewTypographies',
  composes: 'viewComposes',
  icons: 'viewIcons',
  paintPlacements: 'viewPaintPlacements',
};

type Noeud = {
  slot?: string;
  children?: Noeud[];
  position?: string;
  inset?: Record<string, unknown>;
  rotation?: unknown;
};
type Dependance = { component?: string; figmaLayer?: string };
type Rendu = { kind?: string };
export type Contrat = {
  variants?: {
    view?: string;
    sample?: string;
    tokens?: Record<string, unknown>;
    strokes?: Record<string, unknown>;
  }[];
  rendering?: {
    roles?: Record<string, Rendu>;
    keyRoles?: { fills?: Record<string, string>; strokes?: Record<string, string> };
  };
  variantViews?: Record<string, Partial<Record<Partie, string>>>;
  structure?: { view?: string };
  icons?: Record<string, { slot?: string }>;
  textStyles?: Record<string, unknown>;
  samples?: Record<string, unknown>;
  composes?: Dependance[];
  viewStructures?: Record<string, Noeud>;
  viewTypographies?: Record<string, { slotPath?: string[]; style?: string }[]>;
  viewComposes?: Record<string, Dependance[]>;
  viewPaintPlacements?: Record<string, Record<string, Record<string, string[][]>>>;
} & Record<string, unknown>;

/** `Object.hasOwn` n'existe pas dans la cible du projet ; la forme longue le fait. */
const porte = (objet: unknown, cle: string | undefined) => (
  cle !== undefined && Object.prototype.hasOwnProperty.call(objet ?? {}, cle)
);

const catalogue = (c: Contrat, nom: string) => (c[nom] ?? {}) as Record<string, unknown>;

/** Descend un chemin de slots dans un arbre publié ; `undefined` si un cran manque. */
function descendre(racine: Noeud | undefined, chemin: readonly string[]): Noeud | undefined {
  let noeud = racine;
  for (const segment of chemin) {
    noeud = noeud?.children?.find((enfant) => enfant.slot === segment);
    if (!noeud) return undefined;
  }
  return noeud;
}

/** Tout renvoi cité par une vue, un variant ou la projection de référence se résout. */
function lesRenvoisSeResolvent(c: Contrat, ou: string): void {
  for (const [vue, renvois] of Object.entries(c.variantViews ?? {})) {
    for (const [partie, cle] of Object.entries(renvois) as [Partie, string][]) {
      assert.ok(
        porte(catalogue(c, CATALOGUE[partie]), cle),
        `${ou} : variantViews.${vue}.${partie} renvoie à « ${cle} », absent de ${CATALOGUE[partie]}`,
      );
    }
  }
  for (const [i, variant] of (c.variants ?? []).entries()) {
    assert.ok(
      porte(c.variantViews, variant.view),
      `${ou} : variants[${i}].view « ${variant.view} » est absent de variantViews`,
    );
    if (variant.sample !== undefined) {
      assert.ok(
        porte(c.samples, variant.sample),
        `${ou} : variants[${i}].sample « ${variant.sample} » est absent de samples`,
      );
    }
  }
  // Le renvoi de la projection de référence est INCONDITIONNEL : elle ne se
  // recopie jamais, même quand elle ne correspond à la structure d'aucun variant.
  assert.equal(typeof c.structure?.view, 'string', `${ou} : structure.view manque`);
  assert.ok(
    porte(c.viewStructures, c.structure?.view),
    `${ou} : structure.view « ${c.structure?.view} » est absent de viewStructures`,
  );
}

/** Un catalogue ne porte ni deux entrées identiques, ni une entrée que personne n'atteint. */
function lesCataloguesSontNetsEtAtteints(c: Contrat, ou: string): void {
  for (const [partie, cat] of Object.entries(CATALOGUE) as [Partie, string][]) {
    const atteintes = new Set(
      Object.values(c.variantViews ?? {}).map((r) => r[partie]).filter(Boolean),
    );
    if (partie === 'structure' && c.structure?.view) atteintes.add(c.structure.view);

    const parSignature = new Map<string, string>();
    for (const [cle, contenu] of Object.entries(catalogue(c, cat))) {
      // Un doublon trahirait un partage manqué ; une entrée que personne
      // n'atteint est du poids mort qu'un consommateur transporte.
      const signature = JSON.stringify(contenu);
      assert.ok(
        !parSignature.has(signature),
        `${ou} : ${cat} — « ${cle} » et « ${parSignature.get(signature)} » ont le même contenu`,
      );
      parSignature.set(signature, cle);
      assert.ok(atteintes.has(cle), `${ou} : ${cat}.${cle} n'est référencé par aucune vue`);
    }
  }
}

/** Une adresse publiée désigne un calque de l'arbre qui la porte, jamais d'un autre. */
function lesAdressesDesignentUnCalqueReel(c: Contrat, ou: string): void {
  for (const [vue, renvois] of Object.entries(c.variantViews ?? {})) {
    const arbre = renvois.structure === undefined
      ? undefined
      : c.viewStructures?.[renvois.structure];

    const typographies = renvois.typography === undefined
      ? []
      : c.viewTypographies?.[renvois.typography] ?? [];
    for (const usage of typographies) {
      assert.ok(
        descendre(arbre, usage.slotPath ?? []),
        `${ou} : ${vue} — le slotPath [${usage.slotPath}] de « ${usage.style} » n'est pas dans sa structure`,
      );
      assert.ok(
        porte(c.textStyles, usage.style),
        `${ou} : ${vue} — le style « ${usage.style} » est absent de textStyles`,
      );
    }

    const peintures = renvois.paintPlacements === undefined
      ? {}
      : c.viewPaintPlacements?.[renvois.paintPlacements] ?? {};
    for (const [genre, cibles] of Object.entries(peintures)) {
      for (const [cle, chemins] of Object.entries(cibles)) {
        for (const chemin of chemins) {
          // `[]` est une adresse à part entière : elle désigne la racine.
          assert.ok(
            descendre(arbre, chemin),
            `${ou} : ${vue} — ${genre}.${cle} vise [${chemin}], introuvable dans sa structure`,
          );
        }
      }
    }
  }

  const slotsPublies = new Set<string>();
  for (const arbre of Object.values(c.viewStructures ?? {})) {
    (function relever(noeud: Noeud) {
      for (const enfant of noeud.children ?? []) {
        if (enfant.slot) slotsPublies.add(enfant.slot);
        relever(enfant);
      }
    })(arbre);
  }
  for (const [cle, icone] of Object.entries(c.icons ?? {})) {
    if (icone.slot === undefined) continue;
    assert.ok(
      slotsPublies.has(icone.slot),
      `${ou} : icons.${cle}.slot « ${icone.slot} » n'est un slot d'aucune structure`,
    );
  }
}

/** Aucune valeur neutre écrite, aux deux exceptions près où le vide EST la donnée. */
function aucuneValeurNeutre(c: Contrat, ou: string): void {
  // Sous un DICTIONNAIRE, la clé parle et l'entrée survit à vide. Sous une
  // PEINTURE, le chemin vide désigne la racine.
  const DICTIONNAIRE = new Set([
    'states', 'roles', 'props', 'icons', 'textStyles', 'variantViews', 'samples',
    'fills', 'strokes', 'tokens', 'args', 'overrides', 'propertyBindingDefinitions',
    ...Object.values(CATALOGUE),
  ]);
  (function parcourir(
    valeur: unknown,
    chemin: string,
    estUnDictionnaire: boolean,
    entreeDeDictionnaire: boolean,
    sousUnePeinture: boolean,
  ) {
    assert.notEqual(valeur, null, `${ou} : null publié à ${chemin}`);
    if (Array.isArray(valeur)) {
      assert.ok(valeur.length > 0 || sousUnePeinture, `${ou} : [] publié à ${chemin}`);
      valeur.forEach((enfant, i) => {
        parcourir(enfant, `${chemin}[${i}]`, false, false, sousUnePeinture);
      });
    } else if (valeur && typeof valeur === 'object') {
      const entrees = Object.entries(valeur);
      assert.ok(entrees.length > 0 || entreeDeDictionnaire, `${ou} : {} publié à ${chemin}`);
      for (const [cle, enfant] of entrees) {
        parcourir(
          enfant,
          `${chemin}.${cle}`,
          DICTIONNAIRE.has(cle),
          estUnDictionnaire,
          sousUnePeinture || cle === 'fills' || cle === 'strokes',
        );
      }
    }
  })(c, '', false, false, false);
}

/**
 * Toute clé de couleur se résout en un rôle de la BONNE nature.
 *
 * C'est la loi qui remplace un ancien avertissement, et elle vaut mieux : le
 * moteur n'a plus d'avis sur le nom qu'un design system donne à ses tokens —
 * un `…/foreground` posé en contour peint un contour —, mais le contrat doit
 * toujours dire au consommateur, sans ambiguïté et d'un seul geste, comment
 * peindre chaque clé qu'il publie.
 *
 * Les deux côtés sont vérifiés séparément parce que les clés le sont : la même
 * clé courte peut désigner deux tokens différents, l'un en peinture, l'autre en
 * contour. Une table unique en perdrait un en silence, et c'est précisément ce
 * que cette loi rend impossible.
 */
function chaqueCouleurSaitCommentSePeindre(c: Contrat, ou: string): void {
  const roles = c.rendering?.roles ?? {};
  const cote = (
    feuille: Record<string, unknown> | undefined,
    table: Record<string, string> | undefined,
    nom: 'fills' | 'strokes',
    nature: 'paint' | 'stroke',
  ) => {
    for (const cle of Object.keys(feuille ?? {})) {
      const role = table?.[cle] ?? cle;
      assert.ok(
        porte(roles, role),
        `${ou} : la clé de couleur « ${cle} » (${nom}) se résout en « ${role} », absent de rendering.roles`,
      );
      assert.equal(
        roles[role]?.kind,
        nature,
        `${ou} : la clé « ${cle} » vit sous ${nom} mais son rôle « ${role} » n'est pas de nature ${nature}`,
      );
    }
  };
  for (const variant of c.variants ?? []) {
    cote(variant.tokens, c.rendering?.keyRoles?.fills, 'fills', 'paint');
    cote(variant.strokes, c.rendering?.keyRoles?.strokes, 'strokes', 'stroke');
  }
  // Une entrée de `keyRoles` qui ne dit rien de plus que la clé elle-même est du
  // bruit : la règle de résolution y répondrait sans elle.
  for (const table of [c.rendering?.keyRoles?.fills, c.rendering?.keyRoles?.strokes]) {
    for (const [cle, role] of Object.entries(table ?? {})) {
      assert.notEqual(cle, role, `${ou} : rendering.keyRoles.${cle} répète la clé`);
    }
  }
}

/** `inset` ne se publie que là où il a un sens : sur un calque hors du flux. */
function laPlaceNAppartientQuAuxCalquesHorsDuFlux(c: Contrat, ou: string): void {
  for (const [vue, arbre] of Object.entries(c.viewStructures ?? {})) {
    (function relever(noeud: Noeud, chemin: string) {
      for (const enfant of noeud.children ?? []) {
        const place = `${chemin}.${enfant.slot ?? '?'}`;
        if (enfant.inset !== undefined) {
          assert.equal(
            enfant.position,
            'absolute',
            `${ou} : ${vue}${place} publie un inset sans être hors du flux`,
          );
          for (const [bord, valeur] of Object.entries(enfant.inset)) {
            assert.match(
              String(valeur),
              /^-?\d+(\.\d+)?px$/,
              `${ou} : ${vue}${place}.inset.${bord} n'est pas une mesure en pixels`,
            );
          }
        }
        if (enfant.rotation !== undefined) {
          assert.match(
            String(enfant.rotation),
            /^-?\d+(\.\d+)?deg$/,
            `${ou} : ${vue}${place}.rotation n'est pas un angle CSS`,
          );
        }
        relever(enfant, place);
      }
    })(arbre, '');
  }
}

/** Le `composes` global est l'union ordonnée à cardinalité maximale des vues. */
function composesEstLUnionMaximale(c: Contrat, ou: string): void {
  if (!c.composes) return;
  const signature = (d: Dependance) => `${d.component} ${d.figmaLayer ?? ''}`;
  const maximum = new Map<string, number>();
  for (const renvois of Object.values(c.variantViews ?? {})) {
    const compte = new Map<string, number>();
    const liste = renvois.composes === undefined ? [] : c.viewComposes?.[renvois.composes] ?? [];
    for (const dependance of liste) {
      compte.set(signature(dependance), (compte.get(signature(dependance)) ?? 0) + 1);
    }
    for (const [cle, n] of compte) if (n > (maximum.get(cle) ?? 0)) maximum.set(cle, n);
  }
  assert.equal(
    c.composes.length,
    [...maximum.values()].reduce((a, b) => a + b, 0),
    `${ou} : le composes global ne totalise pas la cardinalité maximale relevée sur les vues`,
  );
}

/**
 * Toutes les lois de forme, sur un contrat déjà analysé.
 *
 * `ou` situe l'échec pour qui lit la sortie du test : un nom de fichier pour un
 * export réel, le scénario pour une sortie du moteur.
 */
export function verifierLesLois(contrat: Contrat, ou: string): void {
  lesRenvoisSeResolvent(contrat, ou);
  lesCataloguesSontNetsEtAtteints(contrat, ou);
  lesAdressesDesignentUnCalqueReel(contrat, ou);
  aucuneValeurNeutre(contrat, ou);
  chaqueCouleurSaitCommentSePeindre(contrat, ou);
  laPlaceNAppartientQuAuxCalquesHorsDuFlux(contrat, ou);
  composesEstLUnionMaximale(contrat, ou);
}

/**
 * L'artefact change de forme, jamais de contenu.
 *
 * Deux clauses. Une entrée par ligne sur deux niveaux, sans seuil : la forme du
 * fichier ne doit jamais dépendre du nombre de variants, sans quoi un variant
 * ajouté reformaterait tout le reste. Et le texte se relit : une virgule
 * oubliée produirait un fichier que personne ne relit avant qu'un consommateur
 * ne s'y casse les dents.
 */
export function verifierLaSerialisation(texte: string, ou: string): void {
  const profondeurs = texte.split('\n').map((ligne) => (ligne.match(/^ +/)?.[0].length ?? 0) / 2);
  assert.ok(
    Math.max(...profondeurs) <= 2,
    `${ou} : une ligne est indentée au-delà du second niveau`,
  );
  // Réécrire ce qu'on vient de relire doit rendre le même texte : c'est
  // l'aller-retour complet, sur une valeur que le moteur a vraiment produite.
  assert.equal(
    serializeJson(JSON.parse(texte)),
    texte,
    `${ou} : l'écriture n'est pas un aller-retour`,
  );
}

/** Le schéma commité, compilé une fois pour tous les appels. */
const validerLeSchema = new Ajv({ allErrors: true, strict: false }).compile(
  JSON.parse(readFileSync(CHEMIN_DU_SCHEMA, 'utf8')) as Record<string, unknown>,
);

/**
 * Le schéma publié accepte-t-il ce que le moteur vient d'écrire ?
 *
 * La question ne se pose qu'ici. Le schéma est dérivé de `types.ts`, donc il
 * suit la forme DÉCLARÉE ; rien ne garantit que le moteur écrive ce que ses
 * types annoncent — un champ requis qu'une élision retire passe le compilateur
 * et casse le consommateur.
 */
export function verifierLeSchema(contrat: Contrat, ou: string): void {
  assert.ok(
    validerLeSchema(contrat),
    `${ou} : le contrat ne valide pas le schéma publié — ${JSON.stringify(validerLeSchema.errors?.slice(0, 3))}`,
  );
  // Ce qui suit demande un contrat VALIDE : sur un objet déjà invalide pour une
  // autre raison, un refus ne prouverait rien. D'où leur place ici, et non dans
  // `schema.test.ts` qui n'a aucun contrat sous la main.

  // Les objets à FORME FIXE sont fermés. La garantie ne vaut que là : `props`,
  // `icons` ou `variantViews` sont des dictionnaires dont les clés sont
  // inventées par le composant, et restent libres.
  assert.equal(
    validerLeSchema({ ...contrat, champInvente: true }),
    false,
    `${ou} : le schéma accepte un champ de premier niveau qu'il ne déclare pas`,
  );
  assert.equal(
    validerLeSchema({ ...contrat, meta: { ...(contrat.meta as object), champInvente: true } }),
    false,
    `${ou} : le schéma accepte un champ de meta qu'il ne déclare pas`,
  );

  // Sans le `const` posé par build-schema.ts, `contractVersion` serait une
  // chaîne libre : le schéma accepterait une version antérieure dont la forme
  // colle encore.
  assert.equal(
    validerLeSchema({
      ...contrat,
      meta: { ...(contrat.meta as object), contractVersion: '0.1' },
    }),
    false,
    `${ou} : le schéma accepte un contrat qui se déclare dans une autre version`,
  );
}

/**
 * Le lecteur du kit accepte-t-il ce que le moteur vient d'écrire ?
 *
 * Question différente de celle du schéma, et c'est pourquoi les deux se posent.
 * Le schéma est dérivé de `types.ts` : il décrit une FORME, et ne sait rien des
 * renvois internes ni de la cohérence entre deux champs. `champsInvalidesDuContrat`
 * est l'autre autorité — celle que le consommateur exécute vraiment avant de
 * rendre un composant. Un contrat qui valide le schéma et que ce lecteur refuse
 * est un contrat que le moteur publie et que personne ne peut lire.
 *
 * Ce que cette vérification NE fait pas : le graphe. `validerGrapheDesContrats`
 * répond sur un ENSEMBLE de contrats co-localisés — « cette dépendance a-t-elle
 * un contrat voisin ? » —, et le moteur en fabrique un seul par scénario. Le
 * lancer ici accuserait chaque contrat composé de dépendances manquantes, ce qui
 * ne dit rien du moteur. Cette question-là se pose chez le consommateur, sur un
 * dossier réel.
 *
 * ⚠ Garde-fou, écrit ici parce que c'est ici qu'il se joue. Quand le moteur
 * produit une forme que ce lecteur refuse, la correction la plus rapide est
 * d'assouplir le lecteur — et c'est presque toujours la mauvaise. Un
 * assouplissement qui accompagne un changement de moteur exige un test de refus
 * sur l'ancienne forme, sans quoi le contrôle disparaît sans que rien ne rougisse.
 *
 * *Portée réelle, mesurée et non supposée.* Ce lecteur contrôle la forme des
 * références de token — `variants[].tokens`, les strokes, les bornes de taille —
 * ce que le schéma ne peut pas : il les type `Record<string, string>`. Mais un
 * seul des scénarios de `exportComponent.test.ts` fabrique un variant portant un
 * token ; les autres n'ont aucune référence à contrôler. Le filet est posé au
 * bon endroit, pas encore alimenté : un scénario qui lie des variables profite
 * du contrôle sans rien ajouter, et c'est la raison pour laquelle la
 * vérification vit sur le chemin d'appel plutôt que dans un test à part.
 */
export function verifierLeLecteur(contrat: Contrat, ou: string): void {
  const version = (contrat.meta as { contractVersion?: unknown } | undefined)?.contractVersion;
  assert.equal(
    verdictDeVersion(version),
    'ok',
    `${ou} : le kit ne lit pas la version « ${String(version)} » que le moteur écrit`,
  );
  assert.deepEqual(
    champsInvalidesDuContrat(contrat),
    [],
    `${ou} : le lecteur du kit refuse des champs de ce contrat`,
  );
}
