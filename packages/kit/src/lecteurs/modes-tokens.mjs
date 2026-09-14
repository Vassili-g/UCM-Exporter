/**
 * Les axes de modes de `tokens.json`, et ce qu'un contexte en fait.
 *
 * Un axe est une collection Figma à plusieurs modes. La racine les déclare dans
 * `$extensions["com.ucm.axes"]`, et chaque feuille à modes nomme le sien dans
 * `com.ucm.axis`. Ce module n'écrit aucun CSS : il dit l'état du fichier, la
 * valeur d'une feuille dans un contexte, les axes dont dépend chaque feuille,
 * les contextes où vérifier un composant et les cycles d'alias qu'un contexte
 * réalise.
 *
 * Un contexte associe un nom d'axe à un mode, sous forme d'objet ou de `Map`.
 * Un axe absent du contexte prend son défaut. Le contexte d'une collection
 * étendue se nomme `axeDesExtensions(axe)` et vaut `base` par défaut, `base`
 * désignant la collection elle-même.
 */
import { collecterReferences, sansEchantillon } from "./references-token.mjs";
import { cheminDeReference, indexerTokensDtcg } from "./tokens-dtcg.mjs";

const AXES = "com.ucm.axes";
const AXE = "com.ucm.axis";
const MODES = "com.ucm.modes";
const SURCHARGES = "com.ucm.extensions";

/** Le nombre de cycles énumérés au-delà duquel `cyclesActifs` s'arrête sur un refus. */
export const BORNE_DES_CYCLES = 10_000;

const estObjet = (valeur) => Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);

/** Une clé écrite dans le fichier : une clé héritée du prototype n'en est pas une. */
const possede = (objet, cle) => Object.prototype.hasOwnProperty.call(objet, cle);

const extensionsDe = (feuille) => (estObjet(feuille?.$extensions) ? feuille.$extensions : {});

const surchargesDe = (feuille) => {
  const surcharges = extensionsDe(feuille)[SURCHARGES];
  return estObjet(surcharges) ? surcharges : {};
};

/** Le nom du contexte des collections étendues d'un axe. */
export function axeDesExtensions(axe) {
  return `${axe}-extensions`;
}

/**
 * Les axes et leurs axes d'extension, chacun juste après son parent.
 *
 * Un axe d'extension a pour contextes `base` puis les extensions déclarées,
 * pour défaut `base`, pour feuilles celles qu'au moins une extension surcharge,
 * et nomme son axe dans `parent`. `axes` est la liste que rend `axesDeTokens`.
 */
export function contextesDesAxes(document, axes) {
  const index = indexDe(document);
  return axes.flatMap((axe) => {
    const extensions = Object.keys(axe.extensions ?? {});
    if (extensions.length === 0) return [axe];
    return [axe, {
      nom: axeDesExtensions(axe.nom),
      modes: ["base", ...extensions],
      defaut: "base",
      extensions: {},
      feuilles: axe.feuilles.filter((chemin) => Object.keys(surchargesDe(index.get(chemin))).length > 0),
      parent: axe.nom,
    }];
  });
}

/**
 * L'extension la plus proche de `extension`, elle comprise, qui surcharge la
 * feuille, ou `base`. La chaîne de parentes a été validée par `axesDeTokens`.
 */
function surchargeLaPlusProche(axe, surcharges, extension) {
  for (let courante = extension; courante !== undefined && courante !== "base"; courante = axe.extensions[courante]?.parent) {
    if (possede(surcharges, courante)) return courante;
  }
  return "base";
}

/**
 * L'index des feuilles d'un document, construit une fois par document. Un
 * document modifié après une première lecture garde son ancien index : les
 * lecteurs de ce module ne réécrivent jamais le document qu'ils reçoivent.
 */
const indexParDocument = new WeakMap();
function indexDe(document) {
  if (!estObjet(document)) return new Map();
  let index = indexParDocument.get(document);
  if (!index) {
    index = indexerTokensDtcg(document);
    indexParDocument.set(document, index);
  }
  return index;
}

function valeurDuContexte(contexte, cle) {
  if (contexte instanceof Map) return contexte.get(cle);
  return estObjet(contexte) && possede(contexte, cle) ? contexte[cle] : undefined;
}

/** Ce qui rend une déclaration d'axe illisible, ou `null`. */
function defautDeDeclaration(declaration) {
  if (!estObjet(declaration)) return "n'est pas un objet";
  const { modes } = declaration;
  const modesLisibles = Array.isArray(modes) && modes.length > 0
    && modes.every((mode) => typeof mode === "string" && mode !== "")
    && new Set(modes).size === modes.length;
  if (!modesLisibles) return "ne déclare pas une liste de modes distincts et non vides";
  if (!modes.includes(declaration.default)) return "déclare un défaut qui n'est pas un de ses modes";
  if (!possede(declaration, "extensions")) return null;

  const { extensions } = declaration;
  if (!estObjet(extensions)) return "déclare des extensions qui ne sont pas un objet";
  for (const [nom, extension] of Object.entries(extensions)) {
    if (nom === "base") return "déclare une extension nommée « base », qui désigne la collection elle-même";
    const parent = extension?.parent;
    if (parent !== "base" && !possede(extensions, parent)) {
      return `déclare l'extension « ${nom} » avec une parente inconnue`;
    }
  }
  for (const nom of Object.keys(extensions)) {
    const vues = new Set();
    for (let courante = nom; courante !== "base"; courante = extensions[courante].parent) {
      if (vues.has(courante)) return `déclare une chaîne de parentes qui boucle sur « ${nom} »`;
      vues.add(courante);
    }
  }
  return null;
}

/** Ce qui rend les surcharges d'une feuille illisibles pour son axe, ou `null`. */
function defautDeSurcharges(extensions, axe) {
  if (!possede(extensions, SURCHARGES)) return null;
  const surcharges = extensions[SURCHARGES];
  if (!estObjet(surcharges)) return "ne sont pas un objet";
  for (const [extension, parMode] of Object.entries(surcharges)) {
    if (!possede(axe.extensions, extension)) return `nomment l'extension « ${extension} », que l'axe ne déclare pas`;
    if (!estObjet(parMode)) return `de l'extension « ${extension} » ne sont pas un objet`;
    const inconnu = Object.keys(parMode).find((mode) => !axe.modes.includes(mode));
    if (inconnu !== undefined) return `de l'extension « ${extension} » nomment le mode « ${inconnu} », que l'axe ne déclare pas`;
  }
  return null;
}

const memesModes = (cles, modes) => cles.length === modes.length && cles.every((cle) => modes.includes(cle));

/**
 * L'état des modes d'un document, ses axes et ce qui l'empêche d'être complet.
 *
 * - `sans-modes` : aucune feuille ne porte `com.ucm.modes` ;
 * - `anterieur` : des feuilles portent des modes, la racine ne déclare aucun axe ;
 * - `incoherent` : une feuille nomme un axe que la racine ne déclare pas, ses
 *   modes diffèrent de ceux de son axe, ou une déclaration est illisible ;
 * - `axe-ecarte` : une feuille porte des modes sans axe, l'export ayant écarté
 *   sa collection ;
 * - `complet` : chaque feuille à modes a un axe déclaré et ses modes.
 *
 * `incoherent` l'emporte sur `axe-ecarte`. Chaque axe rendu porte ses
 * `feuilles` dans l'ordre du document. Ne lève jamais.
 */
export function axesDeTokens(document) {
  const index = indexDe(document);
  const feuilles = [...index];
  if (!feuilles.some(([, feuille]) => estObjet(extensionsDe(feuille)[MODES]))) {
    return { etat: "sans-modes", axes: [], constats: [] };
  }

  const racine = estObjet(document.$extensions) ? document.$extensions : {};
  if (!possede(racine, AXES)) {
    return {
      etat: "anterieur",
      axes: [],
      constats: [{
        code: "axes-absents",
        message: "Des feuilles portent des modes, mais la racine ne déclare aucun axe : "
          + "ce fichier vient d'un export antérieur aux axes.",
      }],
    };
  }

  const constats = [];
  const axes = new Map();
  if (!estObjet(racine[AXES])) {
    constats.push({ code: "axes-illisibles", message: "La déclaration des axes n'est pas un objet." });
  } else {
    for (const [nom, declaration] of Object.entries(racine[AXES])) {
      const defaut = defautDeDeclaration(declaration);
      if (defaut) {
        constats.push({ code: "axe-illisible", axe: nom, message: `L'axe « ${nom} » ${defaut}.` });
        continue;
      }
      axes.set(nom, {
        nom,
        modes: [...declaration.modes],
        defaut: declaration.default,
        extensions: { ...(declaration.extensions ?? {}) },
        feuilles: [],
      });
    }
  }

  const ecartees = [];
  for (const [chemin, feuille] of feuilles) {
    const extensions = extensionsDe(feuille);
    const aDesModes = estObjet(extensions[MODES]);
    if (!possede(extensions, AXE)) {
      if (aDesModes) ecartees.push(chemin);
      continue;
    }
    const nom = extensions[AXE];
    const axe = typeof nom === "string" ? axes.get(nom) : undefined;
    if (!axe) {
      if (typeof nom === "string" && estObjet(racine[AXES]) && possede(racine[AXES], nom)) continue;
      constats.push({
        code: "axe-inconnu",
        chemin,
        message: `La feuille « ${chemin} » nomme l'axe « ${String(nom)} », que la racine ne déclare pas.`,
      });
      continue;
    }
    if (!aDesModes) {
      constats.push({
        code: "modes-absents",
        chemin,
        axe: axe.nom,
        message: `La feuille « ${chemin} » nomme l'axe « ${axe.nom} » sans porter de modes.`,
      });
      continue;
    }
    if (!memesModes(Object.keys(extensions[MODES]), axe.modes)) {
      constats.push({
        code: "modes-divergents",
        chemin,
        axe: axe.nom,
        message: `Les modes de la feuille « ${chemin} » diffèrent de ceux de l'axe « ${axe.nom} ».`,
      });
      continue;
    }
    const defaut = defautDeSurcharges(extensions, axe);
    if (defaut) {
      constats.push({
        code: "surcharges-illisibles",
        chemin,
        axe: axe.nom,
        message: `Les surcharges de la feuille « ${chemin} » ${defaut}.`,
      });
      continue;
    }
    axe.feuilles.push(chemin);
  }

  const rendus = [...axes.values()];
  if (constats.length > 0) return { etat: "incoherent", axes: rendus, constats };
  if (ecartees.length > 0) {
    return {
      etat: "axe-ecarte",
      axes: rendus,
      constats: ecartees.map((chemin) => ({
        code: "axe-ecarte",
        chemin,
        message: `La feuille « ${chemin} » porte des modes sans axe : l'export a écarté sa collection `
          + "et l'a dit dans son compte rendu.",
      })),
    };
  }
  return { etat: "complet", axes: rendus, constats: [] };
}

/**
 * La valeur d'une feuille dans un contexte, alias conservés.
 *
 * Une feuille sans axe rend sa `$value`. Une feuille à axe rend la valeur du
 * mode du contexte, ou de son défaut ; dans une collection étendue, la première
 * surcharge trouvée en remontant l'extension du contexte jusqu'à `base`
 * l'emporte. Rend `undefined` pour un chemin absent, un mode que l'axe ne
 * déclare pas ou une extension inconnue. Ne lève jamais.
 */
export function valeurDansLeContexte(document, chemin, contexte = {}) {
  const feuille = indexDe(document).get(chemin);
  if (!feuille) return undefined;
  const extensions = extensionsDe(feuille);
  const nomAxe = extensions[AXE];
  const modes = extensions[MODES];
  const declarations = estObjet(document.$extensions?.[AXES]) ? document.$extensions[AXES] : {};
  if (typeof nomAxe !== "string" || !estObjet(modes) || !possede(declarations, nomAxe)) return feuille.$value;

  const declaration = declarations[nomAxe];
  const mode = valeurDuContexte(contexte, nomAxe) ?? declaration?.default;
  if (typeof mode !== "string" || !possede(modes, mode)) return undefined;

  const surcharges = estObjet(extensions[SURCHARGES]) ? extensions[SURCHARGES] : {};
  const parentes = estObjet(declaration.extensions) ? declaration.extensions : {};
  const vues = new Set();
  let extension = valeurDuContexte(contexte, axeDesExtensions(nomAxe)) ?? "base";
  while (extension !== "base") {
    if (vues.has(extension) || !possede(parentes, extension)) return undefined;
    vues.add(extension);
    const parMode = possede(surcharges, extension) ? surcharges[extension] : undefined;
    if (estObjet(parMode) && possede(parMode, mode)) return parMode[mode];
    extension = parentes[extension]?.parent;
  }
  return modes[mode];
}

/** Toutes les valeurs qu'une feuille peut prendre : `$value`, chaque mode, chaque surcharge. */
function valeursDe(feuille) {
  const extensions = extensionsDe(feuille);
  const valeurs = [feuille.$value];
  if (estObjet(extensions[MODES])) valeurs.push(...Object.values(extensions[MODES]));
  if (estObjet(extensions[SURCHARGES])) {
    for (const parMode of Object.values(extensions[SURCHARGES])) {
      if (estObjet(parMode)) valeurs.push(...Object.values(parMode));
    }
  }
  return valeurs;
}

/**
 * Pour chaque feuille, les axes dont sa valeur dépend dans au moins un
 * contexte : son propre axe, et celui de toute feuille que ses alias
 * atteignent, dans n'importe quel mode ou surcharge. Une feuille surchargée
 * dépend aussi de l'axe d'extension de son axe, et ce qui la cite avec elle.
 *
 * `axes` est la liste que rend `axesDeTokens`. Le graphe inverse des alias est
 * construit une fois, puis parcouru une fois par axe : `O(A × (V + E))`. Une
 * feuille qu'aucun axe n'atteint est absente de la `Map`.
 */
export function conesDesAxes(document, axes) {
  const index = indexDe(document);
  const citants = new Map();
  for (const [chemin, feuille] of index) {
    for (const valeur of valeursDe(feuille)) {
      const cible = cheminDeReference(valeur);
      if (cible === null || !index.has(cible)) continue;
      if (!citants.has(cible)) citants.set(cible, new Set());
      citants.get(cible).add(chemin);
    }
  }

  const cones = new Map();
  for (const axe of contextesDesAxes(document, axes)) {
    const atteintes = new Set(axe.feuilles);
    const pile = [...axe.feuilles];
    while (pile.length > 0) {
      for (const citant of citants.get(pile.pop()) ?? []) {
        if (atteintes.has(citant)) continue;
        atteintes.add(citant);
        pile.push(citant);
      }
    }
    for (const chemin of atteintes) {
      if (!cones.has(chemin)) cones.set(chemin, new Set());
      cones.get(chemin).add(axe.nom);
    }
  }
  return cones;
}

/**
 * Les axes qui touchent un contrat, composition transitive comprise.
 *
 * `contratsParNom` associe un nom de composant à son contrat, ou à un tableau
 * quand plusieurs contrats portent ce nom. Les références de `samples` et de
 * `meta` ne comptent pas. Rend `axes` triés, `croisements`, les couples d'axes
 * qui touchent ensemble une même feuille citée, et `manquantes`, les
 * dépendances absentes ou ambiguës : tant qu'elle n'est pas vide, la réponse ne
 * conclut pas.
 */
export function axesDuContrat(contrat, contratsParNom, cones) {
  const touches = new Set();
  const croisements = new Map();
  const manquantes = [];
  const vus = new Set();
  const pile = [contrat];

  while (pile.length > 0) {
    const courant = pile.pop();
    if (!estObjet(courant) || vus.has(courant)) continue;
    vus.add(courant);

    for (const reference of collecterReferences(sansEchantillon(courant))) {
      const axes = [...(cones.get(cheminDeReference(reference)) ?? [])].sort();
      for (const [rang, axe] of axes.entries()) {
        touches.add(axe);
        for (const autre of axes.slice(rang + 1)) croisements.set(`${axe} ${autre}`, [axe, autre]);
      }
    }

    for (const dependance of Array.isArray(courant.composes) ? courant.composes : []) {
      const nom = dependance?.component;
      const cible = typeof nom === "string" ? contratsParNom.get(nom) : undefined;
      if (!estObjet(cible)) {
        if (!manquantes.includes(nom)) manquantes.push(nom);
        continue;
      }
      pile.push(cible);
    }
  }

  return {
    axes: [...touches].sort(),
    croisements: [...croisements.keys()].sort().map((cle) => croisements.get(cle)),
    manquantes,
  };
}

/**
 * Les contextes où vérifier un composant : le défaut, le premier mode non
 * défaut de chaque axe touchant, puis ce mode pour les deux axes de chaque
 * couple croisé. Un contexte ne nomme que ses axes hors défaut. Au plus
 * `1 + A + C` contextes.
 *
 * `axesTouches` porte les axes tels qu'`axesDeTokens` les rend, `croisements`
 * les couples de noms qu'`axesDuContrat` rend.
 */
export function contextesDeVerification(axesTouches, croisements = []) {
  const premierNonDefaut = new Map();
  for (const axe of axesTouches) {
    const mode = axe.modes.find((candidat) => candidat !== axe.defaut);
    if (mode !== undefined) premierNonDefaut.set(axe.nom, mode);
  }
  const contextes = [{}];
  for (const [nom, mode] of premierNonDefaut) contextes.push(Object.fromEntries([[nom, mode]]));
  for (const [premier, second] of croisements) {
    if (!premierNonDefaut.has(premier) || !premierNonDefaut.has(second)) continue;
    contextes.push(Object.fromEntries([
      [premier, premierNonDefaut.get(premier)],
      [second, premierNonDefaut.get(second)],
    ]));
  }
  return contextes;
}

/** Les composantes fortement connexes, par l'algorithme de Tarjan sans récursion. */
function composantesFortementConnexes(noeuds, aretes) {
  const rang = new Map();
  const bas = new Map();
  const surPile = new Set();
  const pile = [];
  const composantes = [];
  const successeurs = (noeud) => [...(aretes.get(noeud)?.keys() ?? [])];
  const entrer = (noeud) => {
    rang.set(noeud, rang.size);
    bas.set(noeud, rang.get(noeud));
    pile.push(noeud);
    surPile.add(noeud);
    return { noeud, suivants: successeurs(noeud), position: 0 };
  };

  for (const depart of noeuds) {
    if (rang.has(depart)) continue;
    const appels = [entrer(depart)];
    while (appels.length > 0) {
      const cadre = appels[appels.length - 1];
      if (cadre.position < cadre.suivants.length) {
        const suivant = cadre.suivants[cadre.position];
        cadre.position += 1;
        if (!rang.has(suivant)) appels.push(entrer(suivant));
        else if (surPile.has(suivant)) bas.set(cadre.noeud, Math.min(bas.get(cadre.noeud), rang.get(suivant)));
        continue;
      }
      appels.pop();
      if (appels.length > 0) {
        const parent = appels[appels.length - 1].noeud;
        bas.set(parent, Math.min(bas.get(parent), bas.get(cadre.noeud)));
      }
      if (bas.get(cadre.noeud) !== rang.get(cadre.noeud)) continue;
      const composante = [];
      let membre;
      do {
        membre = pile.pop();
        surPile.delete(membre);
        composante.push(membre);
      } while (membre !== cadre.noeud);
      composantes.push(composante.sort((gauche, droite) => rang.get(gauche) - rang.get(droite)));
    }
  }
  return composantes;
}

/** Les cycles élémentaires d'une composante, par l'algorithme de Johnson. */
function enumererCycles(composante, aretes, rapporter) {
  const ordre = new Map(composante.map((noeud, position) => [noeud, position]));
  for (const depart of composante) {
    const debut = ordre.get(depart);
    const bloques = new Set();
    const attente = new Map();
    const chemin = [];
    const successeurs = (noeud) => [...(aretes.get(noeud)?.keys() ?? [])]
      .filter((suivant) => ordre.has(suivant) && ordre.get(suivant) >= debut);
    const debloquer = (noeud) => {
      bloques.delete(noeud);
      const enAttente = attente.get(noeud) ?? new Set();
      attente.delete(noeud);
      for (const autre of enAttente) if (bloques.has(autre)) debloquer(autre);
    };
    const circuit = (noeud) => {
      let trouve = false;
      chemin.push(noeud);
      bloques.add(noeud);
      for (const suivant of successeurs(noeud)) {
        if (suivant === depart) {
          rapporter([...chemin]);
          trouve = true;
        } else if (!bloques.has(suivant) && circuit(suivant)) {
          trouve = true;
        }
      }
      if (trouve) debloquer(noeud);
      else {
        for (const suivant of successeurs(noeud)) {
          if (!attente.has(suivant)) attente.set(suivant, new Set());
          attente.get(suivant).add(noeud);
        }
      }
      chemin.pop();
      return trouve;
    };
    circuit(depart);
  }
}

/**
 * Un cycle est actif si un seul contexte réalise toutes ses arêtes : pour
 * chaque axe, les modes des arêtes qui partent de ses feuilles ont un mode en
 * commun. Une arête d'une feuille sans axe ne pose aucune condition.
 */
function estActif(cycle, aretes, proprietaire) {
  const modesCommuns = new Map();
  for (const [position, source] of cycle.entries()) {
    const cible = cycle[(position + 1) % cycle.length];
    const modes = aretes.get(source).get(cible);
    if (modes === null) continue;
    const axe = proprietaire.get(source);
    const courants = modesCommuns.get(axe);
    const communs = courants ? new Set([...courants].filter((mode) => modes.has(mode))) : new Set(modes);
    if (communs.size === 0) return false;
    modesCommuns.set(axe, communs);
  }
  return true;
}

const INTERRUPTION = Symbol("borne des cycles");

/**
 * Les cycles d'alias qu'au moins un contexte réalise.
 *
 * Le graphe réunit les alias de `$value` pour une feuille sans axe, et ceux de
 * chaque mode pour une feuille à axe, chaque arête portant son contexte. Une
 * feuille surchargée appartient à l'axe d'extension : une arête par contexte
 * mène au nœud `chemin@extension` de sa surcharge la plus proche, et ce nœud,
 * de l'axe parent, suit dans chaque mode sa surcharge ou le nœud de son
 * ancêtre. Chaque arête ne pose ainsi de condition que sur un axe.
 *
 * Sans composante fortement connexe, il n'y a aucun cycle, en `O(V + E)`. Dans
 * une composante, les cycles élémentaires sont énumérés et gardés s'ils sont
 * actifs. Rend `{ cycles, interrompue }` ; chaque cycle se referme sur son
 * premier nœud. Au-delà de `BORNE_DES_CYCLES` cycles énumérés, actifs ou non,
 * `interrompue` vaut `true` et la liste est partielle.
 */
export function cyclesActifs(document, axes) {
  const index = indexDe(document);
  const parChemin = new Map();
  for (const axe of axes) for (const chemin of axe.feuilles) parChemin.set(chemin, axe);

  const proprietaire = new Map();
  const aretes = new Map();
  const ajouter = (source, cible, contexte) => {
    if (!aretes.has(source)) aretes.set(source, new Map());
    const parCible = aretes.get(source);
    if (contexte === null) parCible.set(cible, null);
    else {
      if (!parCible.has(cible)) parCible.set(cible, new Set());
      parCible.get(cible)?.add(contexte);
    }
  };
  const vers = (source, valeur, contexte) => {
    const cible = cheminDeReference(valeur);
    if (cible !== null && index.has(cible)) ajouter(source, cible, contexte);
  };

  for (const [chemin, feuille] of index) {
    const axe = parChemin.get(chemin);
    const modes = extensionsDe(feuille)[MODES];
    if (!axe || !estObjet(modes)) {
      vers(chemin, feuille.$value, null);
      continue;
    }
    const surcharges = surchargesDe(feuille);
    const extensions = Object.keys(axe.extensions ?? {});
    if (extensions.length === 0 || Object.keys(surcharges).length === 0) {
      proprietaire.set(chemin, axe.nom);
      for (const [mode, valeur] of Object.entries(modes)) vers(chemin, valeur, mode);
      continue;
    }

    const noeud = (extension) => `${chemin}@${extension}`;
    proprietaire.set(chemin, axeDesExtensions(axe.nom));
    for (const contexte of ["base", ...extensions]) {
      ajouter(chemin, noeud(surchargeLaPlusProche(axe, surcharges, contexte)), contexte);
    }
    proprietaire.set(noeud("base"), axe.nom);
    for (const [mode, valeur] of Object.entries(modes)) vers(noeud("base"), valeur, mode);
    for (const extension of Object.keys(surcharges)) {
      if (!possede(axe.extensions, extension)) continue;
      const parMode = estObjet(surcharges[extension]) ? surcharges[extension] : {};
      const repli = noeud(surchargeLaPlusProche(axe, surcharges, axe.extensions[extension].parent));
      proprietaire.set(noeud(extension), axe.nom);
      for (const mode of axe.modes) {
        if (possede(parMode, mode)) vers(noeud(extension), parMode[mode], mode);
        else ajouter(noeud(extension), repli, mode);
      }
    }
  }

  const cycles = [];
  let enumeres = 0;
  try {
    for (const composante of composantesFortementConnexes([...new Set([...index.keys(), ...aretes.keys()])], aretes)) {
      const seule = composante[0];
      if (composante.length === 1 && !aretes.get(seule)?.has(seule)) continue;
      enumererCycles(composante, aretes, (cycle) => {
        enumeres += 1;
        if (enumeres > BORNE_DES_CYCLES) throw INTERRUPTION;
        if (estActif(cycle, aretes, proprietaire)) cycles.push([...cycle, cycle[0]]);
      });
    }
  } catch (erreur) {
    if (erreur !== INTERRUPTION) throw erreur;
    return { cycles, interrompue: true };
  }
  return { cycles, interrompue: false };
}
