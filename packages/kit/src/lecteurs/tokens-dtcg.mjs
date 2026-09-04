/**
 * Ce qu'un fichier DTCG contient réellement, et donc ce qui existe.
 *
 * Un module, une question : **ce chemin de token est-il présent dans
 * `tokens.json` ?** La réponse ne passe par aucune projection de nom. Le nom
 * d'un token EST son chemin, écrit à l'identique dans le contrat et dans le
 * fichier de tokens ; les comparer demande une lecture, pas une traduction.
 *
 * Pourquoi cela mérite un module plutôt qu'un `Set` construit sur place : la
 * question précédente se posait à la sortie CSS de Style Dictionary, et la
 * traduction `.` → `-` qu'elle imposait s'écrivait à chaque appelant. Elle
 * diverge déjà sur des données réelles — Figma publie des tokens nommés
 * `layouts.sizing.0,5` (virgule décimale), Style Dictionary écrit
 * `--layouts-sizing-0-5`, la traduction produit `layouts-sizing-0,5`, et le
 * token existant est déclaré absent. Une projection est une occasion de
 * diverger ; ce module en supprime le besoin.
 */

function estObjet(valeur) {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

/**
 * Une FEUILLE DTCG est un nœud qui porte `$value` — c'est `$value` qui fait le
 * token, et lui seul. Indexer sur `$type` paraîtrait équivalent (il l'est sur
 * les 721 feuilles du corpus actuel, toutes typées) mais DTCG autorise un
 * `$type` posé sur un GROUPE et hérité par ses enfants : un `tokens.json`
 * produit par une autre chaîne verrait alors ses feuilles non typées passer
 * pour des groupes, et tous ses tokens pour des absents.
 */
function estFeuille(valeur) {
  return estObjet(valeur) && "$value" in valeur;
}

/**
 * Indexe les feuilles d'un arbre DTCG par leur chemin pointé.
 *
 * Le `$type` rendu avec chaque feuille est celui que DTCG lui reconnaît : le
 * sien s'il en porte un, sinon celui du groupe ancêtre le plus proche. C'est
 * l'héritage que la spécification décrit, et le lire ici évite que chaque
 * appelant le redécouvre — ou l'oublie.
 *
 * Les clés commençant par `$` sont des métadonnées de groupe (`$type`,
 * `$description`, `$extensions`), jamais des enfants : les descendre
 * fabriquerait des chemins qui ne désignent aucun token.
 */
export function indexerTokensDtcg(tokens, chemin = [], index = new Map(), typeHerite = undefined) {
  if (!estObjet(tokens)) return index;

  const type = typeof tokens.$type === "string" ? tokens.$type : typeHerite;

  if (estFeuille(tokens)) {
    index.set(chemin.join("."), type === undefined ? tokens : { ...tokens, $type: type });
    return index;
  }

  for (const [cle, enfant] of Object.entries(tokens)) {
    if (cle.startsWith("$")) continue;
    indexerTokensDtcg(enfant, [...chemin, cle], index, type);
  }
  return index;
}

/**
 * Le chemin que désigne une référence, ou `null` si la chaîne n'en désigne
 * aucun.
 *
 * Volontairement plus permissif que `REFERENCE` de `references-token.mjs`, et
 * ce n'est pas un oubli : les deux répondent à des questions différentes.
 * `REFERENCE` décide ce qui, DANS UN CONTRAT, compte comme une référence de
 * token — elle exige un point pour ne pas confondre `{à définir}` écrit par un
 * designer avec un nom de token. Ici on extrait un chemin d'une chaîne dont on
 * sait déjà qu'elle en est une, y compris à l'intérieur de `tokens.json` où un
 * alias vers un token de premier niveau (`{marque}`) est légitime.
 */
export function cheminDeReference(reference) {
  return typeof reference === "string" && /^\{[^{}\s]+\}$/.test(reference)
    ? reference.slice(1, -1)
    : null;
}

/**
 * Les références qui ne désignent aucun token du fichier DTCG, triées.
 *
 * Prend l'INDEX et non l'arbre : le contrôle se répète pour chaque contrat du
 * repository, et l'arbre ne change pas entre deux.
 *
 * Une chaîne qui n'a pas la forme d'une référence est rendue absente elle
 * aussi. Elle ne peut venir que d'un `tokensUsed` de contrat 10.3 — le relevé
 * automatique, lui, ne ramasse que des références bien formées — et un index
 * qui nomme n'importe quoi désigne, très exactement, un token qui n'existe pas.
 */
export function referencesAbsentes(references, index) {
  // `cheminDeReference` rend `null` sur une chaîne mal formée, et l'index n'a
  // que des chemins pour clés : elle ressort donc absente, sans cas à part.
  return [...references]
    .filter((reference) => !index.has(cheminDeReference(reference)))
    .sort();
}
