/**
 * La trace de mesure d'une analyse : durée de chaque étape, compteurs,
 * empreinte du contrat, et l'avancement que la barre de chargement affiche.
 *
 * Elle court à chaque analyse, sans build dédié : une étape coûte un
 * `Date.now()`, un compteur une addition. `code.ts` l'ouvre au clic, la ferme
 * au verdict, l'imprime dans la console et l'envoie au pied de page. Elle
 * n'entre jamais dans le contrat, ni dans `meta.diagnostics`.
 *
 * Hors d'une trace ouverte, chaque fonction est sans effet : la création des
 * règles appelle le moteur sans rien mesurer.
 */

/** Les compteurs de la trace, décrits dans la conception, section 5.1. */
export type Compteur =
  | 'pagesChargees'
  | 'pagesBalayees'
  | 'pagesReutilisees'
  | 'nodesParcourus'
  | 'appelsGetAllNodes'
  | 'appelsFindAllWithCriteria'
  | 'appelsGetMainComponentAsync'
  | 'maitresReutilises'
  | 'respirations'
  | 'tailleIndex'
  | 'porteeRefusee';

/** Une étape attendue de l'analyse, et sa part du temps total supposé. */
export type EtapePrevue = { nom: string; poids: number };

/** Ce que la trace rend à sa fermeture. */
export type TraceDeMesure = {
  totalMs: number;
  etapes: Array<{ nom: string; ms: number }>;
  compteurs: Partial<Record<Compteur, number>>;
  empreinte: string;
};

/** L'avancement d'une analyse, entre 0 et 1, et le compte de la boucle en cours. */
export type Avancement = { fraction: number; fait?: number; total?: number };

type Trace = {
  debut: number;
  etapes: Array<{ nom: string; ms: number }>;
  enCours: { nom: string; debut: number } | null;
  compteurs: Partial<Record<Compteur, number>>;
  prevues: readonly EtapePrevue[] | null;
  /** Rang dans `prevues` de la dernière étape prévue ouverte, -1 avant la première. */
  rang: number;
  /** Où en est la boucle de l'étape en cours. */
  boucle: { fait: number; total: number; montrer: boolean } | null;
  /** La plus grande fraction rendue : la barre ne recule jamais. */
  atteinte: number;
};

let trace: Trace | null = null;

/**
 * Ouvre la trace d'une analyse ; une trace restée ouverte par un échec est
 * jetée. Sans `prevues`, la trace ne rend aucun avancement.
 */
export function ouvrirLaMesure(prevues: readonly EtapePrevue[] | null = null): void {
  trace = {
    debut: Date.now(),
    etapes: [],
    enCours: null,
    compteurs: {},
    prevues,
    rang: -1,
    boucle: null,
    atteinte: 0,
  };
}

function clore(ouverte: Trace, maintenant: number): void {
  if (!ouverte.enCours) return;
  ouverte.etapes.push({ nom: ouverte.enCours.nom, ms: maintenant - ouverte.enCours.debut });
  ouverte.enCours = null;
}

/**
 * Ouvre l'étape `nom` et clôt la précédente. Une étape absente des étapes
 * prévues compte dans la trace et laisse l'avancement où il est.
 */
export function etape(nom: string): void {
  if (!trace) return;
  const maintenant = Date.now();
  clore(trace, maintenant);
  trace.enCours = { nom, debut: maintenant };
  const rang = trace.prevues?.findIndex((prevue) => prevue.nom === nom) ?? -1;
  if (rang > trace.rang) {
    trace.rang = rang;
    trace.boucle = null;
  }
}

/**
 * Dit où en est la boucle de l'étape en cours. `montrer` à faux garde le
 * compte hors de l'interface : un total qui grandit en route, comme les pages
 * de l'index, ne se lit pas comme « 3 / 4 ».
 */
export function avancer(fait: number, total: number, montrer = true): void {
  if (!trace || total <= 0) return;
  trace.boucle = { fait: Math.min(fait, total), total, montrer };
}

/** Ajoute `n` au compteur ; sans effet hors d'une trace ouverte. */
export function compter(nom: Compteur, n = 1): void {
  if (!trace) return;
  trace.compteurs[nom] = (trace.compteurs[nom] ?? 0) + n;
}

/**
 * L'avancement de l'analyse, ou `null` hors trace ou sans étapes prévues.
 *
 * Les étapes closes comptent pour leur poids entier, l'étape en cours pour la
 * part que sa boucle a faite.
 */
export function avancementCourant(): Avancement | null {
  if (!trace?.prevues) return null;
  const { prevues, rang, boucle } = trace;
  const total = prevues.reduce((somme, prevue) => somme + prevue.poids, 0);
  if (total <= 0) return null;
  let fait = 0;
  for (let index = 0; index < rang; index += 1) fait += prevues[index].poids;
  if (rang >= 0 && boucle) fait += prevues[rang].poids * (boucle.fait / boucle.total);
  trace.atteinte = Math.max(trace.atteinte, Math.min(1, fait / total));
  return {
    fraction: trace.atteinte,
    ...(boucle?.montrer ? { fait: boucle.fait, total: boucle.total } : {}),
  };
}

/**
 * FNV-1a 32 bits du contrat sérialisé, `exportedAt` remplacé par une valeur
 * fixe : deux exports du même composant à deux dates ont la même empreinte.
 */
export function empreinteDuContrat(content: string): string {
  const stable = content.replace(/("exportedAt"\s*:\s*)"[^"]*"/, '$1"-"');
  let hash = 0x811c9dc5;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Clôt la trace et la rend, avec l'empreinte du contrat produit ; `null` hors trace. */
export function fermerLaMesure(content: string): TraceDeMesure | null {
  if (!trace) return null;
  const maintenant = Date.now();
  const { debut, etapes, compteurs } = trace;
  clore(trace, maintenant);
  trace = null;
  return {
    totalMs: maintenant - debut,
    etapes,
    compteurs,
    empreinte: empreinteDuContrat(content),
  };
}

/** Jette la trace ouverte sans rien imprimer : l'analyse a échoué ou a été annulée. */
export function abandonnerLaMesure(): void {
  trace = null;
}
