/**
 * Deux contrats au même emplacement : le même composant, ou deux composants
 * différents que le nommage a fait se rencontrer ?
 *
 * **La question n'a l'air de rien et elle décide d'une perte de données.**
 * `codeIdentifier` projette un nom Figma sur un identifiant de code, et cette
 * projection n'est pas injective : « Icon / Button » et « IconButton » rendent
 * tous deux `IconButton`. Or l'identifiant nomme le dossier ET le fichier de
 * contrat. Deux composants qui entrent en collision écrivent donc au même
 * chemin, le second export écrase le premier, et la CI ne voit ensuite qu'un
 * seul contrat — donc aucun doublon, donc aucune erreur. Le garde-fou de
 * graphe existe, il est bloquant, et il est **inatteignable** : il ne se
 * déclenche que si quelqu'un range deux contrats à la main dans deux dossiers
 * distincts. La détection doit donc avoir lieu AVANT l'écriture, chez le
 * producteur (T4.3, D9).
 *
 * **Pourquoi dans `format` et pas dans le plugin.** C'est la même raison que
 * pour `ucm.config.json` : ce que « le même composant » veut dire est une règle
 * du FORMAT, pas une règle de l'outil qui écrit. Le plugin la pose avant
 * d'écrire ; un lecteur qui voudra un jour repérer un contrat orphelin — même
 * composant, deux identifiants, après un renommage dans Figma — posera la même
 * question, et les deux doivent y répondre pareil. Ce module ne lit aucun
 * fichier et n'importe rien : il juge deux contrats déjà analysés.
 *
 * **L'arbitre, et pourquoi ce n'est pas `name`.** `contract.name` est le nom
 * d'affichage Figma : c'est exactement ce qu'un renommage change alors que le
 * composant, lui, n'a pas bougé. Le prendre pour arbitre ferait refuser des
 * réexports parfaitement légitimes — le champ qui varie serait celui qui
 * décide. L'identité est donc cherchée en cascade, sur le signal le plus fort
 * que les DEUX contrats portent :
 *
 * 1. `componentKey`, la clé de publication. Elle survit à un renommage et à une
 *    copie du fichier Figma. Absente pour un composant non publié
 *    (`exportComponent.ts` ne l'écrit que `if (componentSet.key)`), d'où la
 *    cascade plutôt qu'un champ unique.
 * 2. `nodeId`, toujours présent.
 *
 * **`fileName` est porté pour le message et ne vote jamais.** Le faire voter
 * protégerait d'une coïncidence qui demande deux accidents simultanés — deux
 * fichiers Figma distincts attribuant le même `nodeId` à deux composants dont
 * les noms se projettent en plus sur le même identifiant — au prix d'un refus
 * sur un geste courant : renommer le fichier Figma. Le coût est inversé.
 *
 * **L'indécidable refuse.** Un contrat déjà présent sans identité Figma lisible
 * — écrit à la main, ou par un outil qui n'est pas celui-ci — ne permet pas de
 * distinguer un réexport d'une collision. Passer outre écraserait peut-être le
 * travail de quelqu'un sans un mot, et c'est le défaut même que ce module
 * existe pour supprimer.
 */

/** Le champ qui a tranché. `null` quand rien n'a pu trancher. */
export type ArbitreIdentite = 'componentKey' | 'nodeId';

/**
 * Ce que la comparaison rend, en un seul objet : la réponse, le champ qui l'a
 * donnée, et les deux noms d'affichage. Les noms sont là parce que le seul
 * appelant qui compte ensuite écrit un message à un designer, et qu'un refus
 * qui ne nomme pas les deux composants en cause ne se corrige pas.
 */
export type VerdictIdentite = {
  /**
   * `meme` : le même composant Figma, donc un réexport — l'écriture est légitime.
   * `distinct` : deux composants différents au même chemin — c'est la collision.
   * `indecidable` : aucun signal commun ; personne ne peut trancher ici.
   */
  verdict: 'meme' | 'distinct' | 'indecidable';
  arbitre: ArbitreIdentite | null;
  nomExistant: string | null;
  nomCandidat: string | null;
};

/** Une chaîne utilisable comme identité : ni vide, ni faite d'espaces. */
function texteUtile(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur.trim() !== '' ? valeur : null;
}

type IdentiteFigma = {
  nom: string | null;
  nodeId: string | null;
  componentKey: string | null;
};

/**
 * L'identité que porte un contrat déjà analysé.
 *
 * Rendue même incomplète : c'est la comparaison qui décide de ce qui manque,
 * pas la lecture. Un objet qui n'est pas un contrat rend une identité vide,
 * jamais une exception — un garde-fou qui explose sur une entrée douteuse ne
 * garde plus rien.
 */
function identiteFigma(brut: unknown): IdentiteFigma {
  const vide: IdentiteFigma = { nom: null, nodeId: null, componentKey: null };
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return vide;

  const contrat = brut as { name?: unknown; meta?: unknown };
  const nom = texteUtile(contrat.name);
  const meta = contrat.meta;
  if (meta === null || typeof meta !== 'object') return { ...vide, nom };

  const figma = (meta as { figma?: unknown }).figma;
  if (figma === null || typeof figma !== 'object') return { ...vide, nom };

  const champs = figma as { nodeId?: unknown; componentKey?: unknown };
  return {
    nom,
    nodeId: texteUtile(champs.nodeId),
    componentKey: texteUtile(champs.componentKey),
  };
}

/**
 * Le contrat présent et celui qu'on s'apprête à écrire décrivent-ils le même
 * composant Figma ?
 *
 * Les deux arguments sont du JSON DÉJÀ analysé : ce module ne sait pas d'où
 * viennent ces objets — un disque, l'API GitHub, un test — et n'a pas à le
 * savoir.
 */
export function comparerIdentiteDeContrat(existant: unknown, candidat: unknown): VerdictIdentite {
  const gauche = identiteFigma(existant);
  const droite = identiteFigma(candidat);
  const noms = { nomExistant: gauche.nom, nomCandidat: droite.nom };

  // La cascade s'arrête au premier champ que LES DEUX portent. Comparer un
  // champ présent d'un côté seulement ne dirait rien : un composant dépublié
  // de sa bibliothèque perd sa clé sans cesser d'être lui-même.
  if (gauche.componentKey !== null && droite.componentKey !== null) {
    return {
      verdict: gauche.componentKey === droite.componentKey ? 'meme' : 'distinct',
      arbitre: 'componentKey',
      ...noms,
    };
  }

  if (gauche.nodeId !== null && droite.nodeId !== null) {
    return {
      verdict: gauche.nodeId === droite.nodeId ? 'meme' : 'distinct',
      arbitre: 'nodeId',
      ...noms,
    };
  }

  return { verdict: 'indecidable', arbitre: null, ...noms };
}
