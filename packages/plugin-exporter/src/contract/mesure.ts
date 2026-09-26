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
  | 'msGetAllNodes'
  | 'appelsFindAllWithCriteria'
  | 'appelsGetMainComponentAsync'
  | 'maitresReutilises'
  | 'respirations'
  | 'msEnRespiration'
  | 'plusLongSilenceMs'
  | 'tailleIndex'
  | 'porteeRefusee';

/**
 * Une étape attendue de l'analyse, et sa part du temps total supposé.
 *
 * `compte` à faux tait le compte de sa boucle : deux boucles de 0 à 140 à la
 * suite se liraient comme une boucle qui recommence. `origineDuRythme` marque
 * l'étape d'où se mesure le rythme du temps restant : les étapes d'avant
 * dépendent du document et de ses caches, pas du composant, et une lecture
 * lente y ferait annoncer plusieurs minutes.
 */
export type EtapePrevue = { nom: string; poids: number; compte?: false; origineDuRythme?: true };

/** Ce que la trace rend à sa fermeture. */
export type TraceDeMesure = {
  totalMs: number;
  etapes: EtapeMesuree[];
  compteurs: Partial<Record<Compteur, number>>;
  empreinte: string;
};

/** Une étape close, et ce que chaque compteur additif a gagné pendant elle. */
export type EtapeMesuree = { nom: string; ms: number; compteurs?: Partial<Record<Compteur, number>> };

/**
 * L'avancement d'une analyse, entre 0 et 1, le compte de la boucle en cours,
 * et le temps restant estimé en millisecondes.
 */
export type Avancement = { fraction: number; fait?: number; total?: number; resteMs?: number };

/**
 * Depuis l'origine du rythme, le temps et l'avancement à mesurer avant
 * d'estimer : plus tôt, l'estimation extrapole trop peu de mesure.
 */
const ESTIMATION_APRES_MS = 2000;
const ESTIMATION_APRES_FRACTION = 0.05;

type Trace = {
  debut: number;
  etapes: EtapeMesuree[];
  enCours: { nom: string; debut: number; compteurs: Partial<Record<Compteur, number>> } | null;
  compteurs: Partial<Record<Compteur, number>>;
  prevues: readonly EtapePrevue[] | null;
  /** Rang dans `prevues` de la dernière étape prévue ouverte, -1 avant la première. */
  rang: number;
  /** Où en est la boucle de l'étape en cours. */
  boucle: { fait: number; total: number; montrer: boolean } | null;
  /** La plus grande fraction rendue : la barre ne recule jamais. */
  atteinte: number;
  /** Où se mesure le rythme ; null tant que l'étape qui le marque n'est pas ouverte. */
  origine: { instant: number; fraction: number } | null;
};

let trace: Trace | null = null;

/**
 * Ouvre la trace d'une analyse ; une trace restée ouverte par un échec est
 * jetée. Sans `prevues`, la trace ne rend aucun avancement.
 */
export function ouvrirLaMesure(prevues: readonly EtapePrevue[] | null = null): void {
  const debut = Date.now();
  trace = {
    debut,
    etapes: [],
    enCours: null,
    compteurs: {},
    prevues,
    rang: -1,
    boucle: null,
    atteinte: 0,
    origine: prevues?.some((prevue) => prevue.origineDuRythme) ? null : { instant: debut, fraction: 0 },
  };
}

function poidsTotal(prevues: readonly EtapePrevue[]): number {
  return prevues.reduce((somme, prevue) => somme + prevue.poids, 0);
}

/** Les maximums ne se découpent pas par étape : une différence n'y dit rien. */
const MAXIMUMS: ReadonlySet<Compteur> = new Set(['plusLongSilenceMs']);

function clore(ouverte: Trace, maintenant: number): void {
  if (!ouverte.enCours) return;
  const { nom, debut, compteurs: auDebut } = ouverte.enCours;
  const gagnes: Partial<Record<Compteur, number>> = {};
  for (const [cle, valeur] of Object.entries(ouverte.compteurs) as Array<[Compteur, number]>) {
    const gain = valeur - (auDebut[cle] ?? 0);
    if (gain > 0 && !MAXIMUMS.has(cle)) gagnes[cle] = gain;
  }
  ouverte.etapes.push({
    nom,
    ms: maintenant - debut,
    ...(Object.keys(gagnes).length > 0 ? { compteurs: gagnes } : {}),
  });
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
  trace.enCours = { nom, debut: maintenant, compteurs: { ...trace.compteurs } };
  const rang = trace.prevues?.findIndex((prevue) => prevue.nom === nom) ?? -1;
  if (rang > trace.rang) {
    trace.rang = rang;
    trace.boucle = null;
    const prevues = trace.prevues!;
    if (prevues[rang].origineDuRythme && poidsTotal(prevues) > 0) {
      const avant = poidsTotal(prevues.slice(0, rang));
      trace.origine = { instant: maintenant, fraction: avant / poidsTotal(prevues) };
    }
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

/** Garde le plus grand des `n` relevés sous ce nom ; sans effet hors d'une trace ouverte. */
export function retenirLeMaximum(nom: Compteur, n: number): void {
  if (!trace) return;
  trace.compteurs[nom] = Math.max(trace.compteurs[nom] ?? 0, n);
}

/**
 * L'avancement de l'analyse, ou `null` hors trace ou sans étapes prévues.
 *
 * Les étapes closes comptent pour leur poids entier, l'étape en cours pour la
 * part que sa boucle a faite. Le temps restant prolonge le rythme mesuré
 * depuis l'origine, et suppose que les poids disent la vraie part de chaque
 * étape.
 */
export function avancementCourant(maintenant = Date.now()): Avancement | null {
  if (!trace?.prevues) return null;
  const { prevues, rang, boucle, origine } = trace;
  const total = poidsTotal(prevues);
  if (total <= 0) return null;
  let fait = 0;
  for (let index = 0; index < rang; index += 1) fait += prevues[index].poids;
  if (rang >= 0 && boucle) fait += prevues[rang].poids * (boucle.fait / boucle.total);
  trace.atteinte = Math.max(trace.atteinte, Math.min(1, fait / total));
  const fraction = trace.atteinte;
  const montrer = boucle?.montrer && prevues[rang]?.compte !== false;
  const ecoule = origine ? maintenant - origine.instant : 0;
  const progres = origine ? fraction - origine.fraction : 0;
  const estimable = ecoule >= ESTIMATION_APRES_MS && progres >= ESTIMATION_APRES_FRACTION;
  return {
    fraction,
    ...(montrer ? { fait: boucle.fait, total: boucle.total } : {}),
    ...(estimable ? { resteMs: Math.round(ecoule * (1 - fraction) / progres) } : {}),
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
