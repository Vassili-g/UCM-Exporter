/**
 * Validation du graphe formé par les contrats UCM co-localisés.
 *
 * Ce module reste pur : il reçoit des documents déjà lus et renvoie les
 * diagnostics par chemin. La forme interne d'un contrat est contrôlée dans
 * `validation-contrat.mjs`.
 */
import { codeIdentifier } from "@ucm-kit/core/format";
import { validerAdressesDEchantillons } from "./validation-echantillons.mjs";
import { compositionsExactesDuVariant, vueExacteDuVariant } from "./variant-views.mjs";

/** Vrai pour un objet JSON, mais pas pour un tableau ni `null`. */
function estObjet(valeur) {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

/** Relève les composants nommés par les slots, dans l'ordre des calques. */
function compositionsDesSlots(children) {
  const compositions = [];
  for (const child of Array.isArray(children) ? children : []) {
    if (!estObjet(child)) continue;
    if (typeof child.composes === "string" && child.composes.trim() !== "") {
      compositions.push(child.composes);
    }
    compositions.push(...compositionsDesSlots(child.children));
  }
  return compositions;
}

/** Même union ordonnée et même cardinalité maximale que l'Exporter depuis la 8.0. */
function dependancesDesVariants(contrat, variants) {
  const resultat = [];
  const maximumParSignature = new Map();
  for (const variant of Array.isArray(variants) ? variants : []) {
    const occurrences = new Map();
    for (const dependance of compositionsExactesDuVariant(contrat, variant)) {
      const signature = JSON.stringify([
        dependance?.component,
        dependance?.figmaLayer,
        dependance?.visibilityProp ?? null,
      ]);
      const occurrence = (occurrences.get(signature) ?? 0) + 1;
      occurrences.set(signature, occurrence);
      if (occurrence > (maximumParSignature.get(signature) ?? 0)) {
        maximumParSignature.set(signature, occurrence);
        resultat.push(dependance);
      }
    }
  }
  return resultat;
}

/** Ajoute un diagnostic une seule fois pour un contrat. */
function ajouter(erreurs, chemin, message) {
  const liste = erreurs.get(chemin) ?? [];
  if (!liste.includes(message)) liste.push(message);
  erreurs.set(chemin, liste);
}

/** Représentation déterministe d'un cycle, indépendante du point de départ du DFS. */
function cycleCanonique(cycle) {
  const sansRetour = cycle.slice(0, -1);
  const rotations = sansRetour.map((_, index) => [
    ...sansRetour.slice(index),
    ...sansRetour.slice(0, index),
  ]);
  rotations.sort((left, right) => left.join("\u0000").localeCompare(right.join("\u0000")));
  return [...rotations[0], rotations[0][0]];
}

/** Indexe les contrats par nom et signale chaque nom dupliqué. */
function indexerParNom(documents, erreurs) {
  const parNom = new Map();
  const parIdentifiant = new Map();
  for (const document of documents) {
    const nom = document.contrat?.name;
    if (typeof nom !== "string" || nom.trim() === "") continue;
    const liste = parNom.get(nom) ?? [];
    liste.push(document);
    parNom.set(nom, liste);

    const identifiant = codeIdentifier(nom);
    const memesIdentifiants = parIdentifiant.get(identifiant) ?? [];
    memesIdentifiants.push({ ...document, nom });
    parIdentifiant.set(identifiant, memesIdentifiants);
  }

  for (const [nom, doublons] of parNom) {
    if (doublons.length < 2) continue;
    for (const { chemin } of doublons) {
      ajouter(erreurs, chemin, `Plusieurs contrats déclarent le composant « ${nom} ».`);
    }
  }

  for (const [identifiant, doublons] of parIdentifiant) {
    const noms = [...new Set(doublons.map(({ nom }) => nom))];
    if (noms.length < 2) continue;
    for (const { chemin } of doublons) {
      ajouter(
        erreurs,
        chemin,
        `Les noms Figma ${noms.map((nom) => `« ${nom} »`).join(" et ")} donnent le même identifiant de code « ${identifiant} ».`,
      );
    }
  }
  return parNom;
}

/** Vérifie les entrées `composes`, leurs cibles et leur miroir dans les slots. */
function validerDependances(documents, parNom, erreurs) {
  for (const { chemin, contrat } of documents) {
    const dependances = Array.isArray(contrat?.composes) ? contrat.composes : [];
    const composantsDeclares = [];

    for (const dependance of dependances) {
      const malFormee = (
        !estObjet(dependance)
        || typeof dependance.component !== "string"
        || dependance.component.trim() === ""
        || typeof dependance.figmaLayer !== "string"
        || dependance.figmaLayer.trim() === ""
        || (
          dependance.visibilityProp !== undefined
          && (
            typeof dependance.visibilityProp !== "string"
            || dependance.visibilityProp.trim() === ""
          )
        )
      );
      if (malFormee) {
        ajouter(
          erreurs,
          chemin,
          "Une entrée de `composes` est mal formée : `component` et `figmaLayer` sont obligatoires.",
        );
        continue;
      }

      composantsDeclares.push(dependance.component);
      if (!parNom.has(dependance.component)) {
        ajouter(
          erreurs,
          chemin,
          `La dépendance « ${dependance.component} » n’a aucun contrat local.`,
        );
      }
      if (dependance.component === contrat.name) {
        ajouter(erreurs, chemin, `Le composant « ${contrat.name} » se compose lui-même.`);
      }
    }

    const versionExacte = Number.parseInt(String(contrat?.meta?.contractVersion), 10) >= 8;
    if (versionExacte) {
      for (const [index, variant] of (Array.isArray(contrat?.variants) ? contrat.variants : []).entries()) {
        const vue = vueExacteDuVariant(contrat, variant);
        const declares = compositionsExactesDuVariant(contrat, variant)
          .map((dependance) => dependance?.component);
        const slots = compositionsDesSlots(vue?.structure?.children);
        if (JSON.stringify(declares) !== JSON.stringify(slots)) {
          ajouter(
            erreurs,
            chemin,
            `variants[${index}].composes et son arbre exact ne décrivent pas la même séquence de dépendances.`,
          );
        }
      }
    }
    const composantsDesSlots = versionExacte
      ? dependancesDesVariants(contrat, contrat?.variants).map((dependance) => dependance?.component)
      : compositionsDesSlots(contrat?.structure?.children);
    if (JSON.stringify(composantsDeclares) !== JSON.stringify(composantsDesSlots)) {
      ajouter(
        erreurs,
        chemin,
        versionExacte
          ? "`composes` et l’agrégat des dépendances exactes de `variants` ne décrivent pas la même séquence."
          : "`composes` et les slots récursifs de `structure.children` ne décrivent pas la même séquence de dépendances.",
      );
    }
  }
}

/** Signale chaque cycle sur tous ses contrats membres. */
function validerCycles(parNom, erreurs) {
  // Les noms dupliqués ne peuvent pas former un graphe non ambigu.
  const uniques = new Map(
    Array.from(parNom)
      .filter(([, entries]) => entries.length === 1)
      .map(([nom, entries]) => [nom, entries[0]]),
  );
  const visites = new Set();
  const actives = [];
  const cyclesVus = new Set();

  const visiter = (nom) => {
    const indexActif = actives.indexOf(nom);
    if (indexActif >= 0) {
      const cycle = cycleCanonique([...actives.slice(indexActif), nom]);
      const cle = cycle.join("\u0000");
      if (cyclesVus.has(cle)) return;
      cyclesVus.add(cle);
      const message = `Cycle de composition détecté : ${cycle.join(" → ")}.`;
      for (const membre of cycle.slice(0, -1)) {
        const document = uniques.get(membre);
        if (document) ajouter(erreurs, document.chemin, message);
      }
      return;
    }
    if (visites.has(nom)) return;

    const document = uniques.get(nom);
    if (!document) return;
    actives.push(nom);
    for (const dependance of Array.isArray(document.contrat?.composes)
      ? document.contrat.composes
      : []) {
      if (typeof dependance?.component === "string" && uniques.has(dependance.component)) {
        visiter(dependance.component);
      }
    }
    actives.pop();
    visites.add(nom);
  };

  for (const nom of uniques.keys()) visiter(nom);
}

/**
 * Vérifie les dépendances entre tous les contrats co-localisés.
 *
 * Invariants : un nom possède un seul contrat, chaque cible existe, les slots
 * et `composes` annoncent la même séquence, et le graphe reste acyclique.
 *
 * L'adressabilité des échantillons est une question distincte — « ce que la
 * maquette montre est-il ATTEIGNABLE ? » plutôt que « le graphe est-il sain ? » —
 * et vit dans `validation-echantillons.mjs`. Elle a besoin du même index par nom,
 * et le reçoit d'ici plutôt que de le reconstruire.
 */
export function validerGrapheDesContrats(documents) {
  const erreurs = new Map(documents.map(({ chemin }) => [chemin, []]));
  const parNom = indexerParNom(documents, erreurs);
  validerDependances(documents, parNom, erreurs);
  validerAdressesDEchantillons(
    documents,
    parNom,
    (chemin, message) => ajouter(erreurs, chemin, message),
  );
  validerCycles(parNom, erreurs);
  return erreurs;
}
