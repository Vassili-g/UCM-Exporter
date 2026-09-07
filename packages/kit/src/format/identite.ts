/**
 * Protège l'écriture quand deux noms se projettent sur le même chemin.
 * `componentKey`, stable au renommage, tranche avant `nodeId`. Le nom et le
 * fichier servent au message sans voter ; faute de signal commun, le verdict
 * reste indécidable afin de ne pas autoriser un écrasement silencieux.
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
   * `meme` : le même composant Figma, donc un réexport, l'écriture est légitime.
   * `distinct` : deux composants différents au même chemin, c'est la collision.
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

/** Origine d'un contrat : deux arbitres d'identité et trois champs d'affichage. */
export type IdentiteDeContrat = {
  /** Nom d'affichage Figma. N'arbitre pas : c'est ce qu'un renommage change. */
  nom: string | null;
  nodeId: string | null;
  componentKey: string | null;
  /** Fichier Figma d'origine. Porté pour le message, ne vote jamais. */
  fileName: string | null;
  /**
   * Lien direct vers le composant. Souvent absent en distribution Community,
   * où `figma.fileKey` requiert `enablePrivatePluginApi`. Ne vote jamais.
   */
  url: string | null;
};

/**
 * L'identité que porte un contrat déjà analysé.
 *
 * Rendue même incomplète : c'est la comparaison qui décide de ce qui manque,
 * pas la lecture. Un objet qui n'est pas un contrat rend une identité vide,
 * jamais une exception : un garde-fou qui explose sur une entrée douteuse ne
 * garde plus rien.
 */
export function identiteDeContrat(brut: unknown): IdentiteDeContrat {
  const vide: IdentiteDeContrat = {
    nom: null, nodeId: null, componentKey: null, fileName: null, url: null,
  };
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return vide;

  const contrat = brut as { name?: unknown; meta?: unknown };
  const nom = texteUtile(contrat.name);
  const meta = contrat.meta;
  if (meta === null || typeof meta !== 'object') return { ...vide, nom };

  const figma = (meta as { figma?: unknown }).figma;
  if (figma === null || typeof figma !== 'object') return { ...vide, nom };

  const champs = figma as {
    nodeId?: unknown; componentKey?: unknown; fileName?: unknown; url?: unknown;
  };
  return {
    nom,
    nodeId: texteUtile(champs.nodeId),
    componentKey: texteUtile(champs.componentKey),
    fileName: texteUtile(champs.fileName),
    url: texteUtile(champs.url),
  };
}

/**
 * Le contrat présent et celui qu'on s'apprête à écrire décrivent-ils le même
 * composant Figma ?
 *
 * Les deux arguments sont du JSON déjà analysé : ce module ne sait pas d'où
 * viennent ces objets (un disque, l'API GitHub, un test) et n'a pas à le
 * savoir.
 */
export function comparerIdentiteDeContrat(existant: unknown, candidat: unknown): VerdictIdentite {
  const gauche = identiteDeContrat(existant);
  const droite = identiteDeContrat(candidat);
  const noms = { nomExistant: gauche.nom, nomCandidat: droite.nom };

  // La cascade s'arrête au premier champ que les deux portent. Comparer un
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
