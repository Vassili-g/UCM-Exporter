/**
 * Clé d'une couleur dans la feuille d'un variant — unique autorité.
 *
 * La clé est le dernier segment du nom de la variable Figma. C'est une
 * IDENTITÉ, pas un rôle : ce que la couleur peint se lit sur le calque qui la
 * porte (`paintSiteRole`), jamais sur ce nom.
 *
 * Quand des couleurs qui COHABITENT dans la feuille d'un même variant portent
 * le même dernier segment, la clé s'allonge de segments du chemin. Le design
 * system les nomme déjà distinctement — `…userinput.colors.background` et
 * `…divider.colors.background` — et tronquer au dernier segment faisait perdre
 * une couleur pour de bon.
 */

/** Clé de base : le dernier segment du nom de la variable. */
export function tokenKey(token: string): string {
  const segments = token.split('.');
  return segments[segments.length - 1] || token;
}

/** Segment d'un chemin à une profondeur comptée depuis la fin, ou null. */
function segmentAt(segments: readonly string[], depth: number): string | null {
  return segments[segments.length - depth] ?? null;
}

/**
 * Clé induite par une sélection de profondeurs : les segments retenus, du plus
 * profond au moins profond — donc dans l'ordre du chemin — puis le dernier.
 *
 * Un chemin trop court pour une profondeur retenue n'y contribue rien. Sa clé
 * peut alors rester celle de base ; elle reste distincte des autres, ce qui
 * suffit.
 */
function keyFor(segments: readonly string[], depths: readonly number[]): string {
  const chosen = depths
    .slice()
    .sort((left, right) => right - left)
    .map((depth) => segmentAt(segments, depth))
    .filter((segment): segment is string => segment !== null);
  return [...chosen, segments[segments.length - 1]].join('.');
}

/** L'optimum exact reste abordable jusqu'à 2^16 états ; au-delà, coût borné. */
const MAX_EXACT_CANDIDATES = 16;

function keysFor(
  tokens: readonly string[],
  paths: ReadonlyMap<string, readonly string[]>,
  depths: readonly number[],
): Map<string, string> {
  return new Map(tokens.map((token) => [token, keyFor(paths.get(token)!, depths)]));
}

function separatesAll(
  keys: ReadonlyMap<string, string>,
  cohabitations: ReadonlyArray<readonly [string, string]>,
): boolean {
  return cohabitations.every(([left, right]) => keys.get(left) !== keys.get(right));
}

/**
 * Repli polynomial pour les chemins artificiellement très profonds.
 *
 * À chaque tour on choisit la profondeur qui sépare le plus de conflits encore
 * ouverts, puis celle qui fabrique le moins de clés. Une passe finale retire
 * toute profondeur redevenue inutile. La stratégie est déterministe et son
 * coût est borné par candidats × conflits × tokens — aucun `2^n` caché.
 */
function greedyDepths(
  tokens: readonly string[],
  paths: ReadonlyMap<string, readonly string[]>,
  candidates: readonly number[],
  cohabitations: ReadonlyArray<readonly [string, string]>,
): number[] {
  const selected: number[] = [];
  const remaining = new Set(candidates);

  while (true) {
    const currentKeys = keysFor(tokens, paths, selected);
    const unresolved = cohabitations.filter(
      ([left, right]) => currentKeys.get(left) === currentKeys.get(right),
    );
    if (unresolved.length === 0) break;

    let best: { depth: number; separated: number; distinct: number } | null = null;
    for (const depth of remaining) {
      const trial = keysFor(tokens, paths, [...selected, depth]);
      const separated = unresolved.filter(
        ([left, right]) => trial.get(left) !== trial.get(right),
      ).length;
      const distinct = new Set(trial.values()).size;
      if (
        !best
        || separated > best.separated
        || (separated === best.separated && distinct < best.distinct)
        || (separated === best.separated && distinct === best.distinct && depth < best.depth)
      ) best = { depth, separated, distinct };
    }
    if (!best || best.separated === 0) break;
    selected.push(best.depth);
    remaining.delete(best.depth);
  }

  for (const depth of [...selected]) {
    const without = selected.filter((candidate) => candidate !== depth);
    if (separatesAll(keysFor(tokens, paths, without), cohabitations)) {
      selected.splice(selected.indexOf(depth), 1);
    }
  }
  return selected.sort((left, right) => left - right);
}

/**
 * Allonge la clé d'un groupe de tokens jusqu'à séparer ceux qui cohabitent.
 *
 * `cohabitations` liste les paires de tokens présents dans une même feuille.
 * Une sélection de profondeurs est VALIDE si elle sépare les deux extrémités de
 * chaque paire ; on retient celle qui produit LE MOINS DE CLÉS DISTINCTES.
 *
 * Ce dernier critère est ce qui garde une coordonnée de variant hors de la clé.
 * Un Button dont trente tokens `…<color>.<variant>.<state>.background` ne
 * cohabitent jamais, plus une surface partagée qui cohabite avec eux, admet
 * plusieurs sélections valides ; celle qui produit deux clés seulement laisse
 * les trente garder la même dans toutes les feuilles. Une sélection choisie
 * « jusqu'à ce que tous les tokens soient uniques » aurait publié une clé
 * différente par variant, et plus rien n'aurait été indexable.
 *
 * Une solution existe toujours : la sélection de TOUTES les profondeurs
 * candidates distingue les tokens deux à deux, deux chemins distincts différant
 * forcément quelque part.
 */
function distinguish(
  tokens: readonly string[],
  cohabitations: ReadonlyArray<readonly [string, string]>,
): Map<string, string> {
  const paths = new Map(tokens.map((token) => [token, token.split('.')]));
  const longest = Math.max(...tokens.map((token) => paths.get(token)!.length));

  // Seule une profondeur qui SÉPARE une paire cohabitante peut servir. Les
  // autres ne font que raffiner : ajouter une profondeur à une sélection ne peut
  // que scinder des clés, jamais en fondre deux, si bien qu'une profondeur qui
  // ne sépare rien reste retirable d'une sélection valide sans rien lui coûter.
  // La restriction préserve donc EXACTEMENT l'optimum — et elle borne le coût,
  // exponentiel dans le nombre de candidates : trente tokens
  // `…<color>.<variant>.<state>.background` diffèrent à trois profondeurs, mais
  // s'ils ne se disputent leur base qu'avec une seule surface partagée, une
  // seule profondeur les sépare.
  const separeUnePaire = (depth: number) =>
    cohabitations.some(([left, right]) =>
      (segmentAt(paths.get(left)!, depth) ?? '') !== (segmentAt(paths.get(right)!, depth) ?? ''));

  const candidates: number[] = [];
  for (let depth = 2; depth <= longest; depth += 1) {
    if (separeUnePaire(depth)) candidates.push(depth);
  }

  let depths: number[];
  if (candidates.length <= MAX_EXACT_CANDIDATES) {
    let best: { depths: number[]; distinct: number } | null = null;
    const combinations = 2 ** candidates.length;
    for (let mask = 0; mask < combinations; mask += 1) {
      const selected = candidates.filter((_, index) => (mask & (2 ** index)) !== 0);
      const keys = keysFor(tokens, paths, selected);
      if (!separatesAll(keys, cohabitations)) continue;
      const distinct = new Set(keys.values()).size;
      const lexicographic = selected.join('.');
      const bestLexicographic = best?.depths.join('.') ?? '';
      if (
        !best
        || distinct < best.distinct
        || (distinct === best.distinct && selected.length < best.depths.length)
        || (distinct === best.distinct && selected.length === best.depths.length
          && lexicographic.localeCompare(bestLexicographic) < 0)
      ) best = { depths: selected, distinct };
    }
    depths = best?.depths ?? candidates;
  } else {
    depths = greedyDepths(tokens, paths, candidates, cohabitations);
  }
  return new Map(tokens.map((token) => [token, keyFor(paths.get(token)!, depths)]));
}

/**
 * Décide la clé de chaque couleur du composant, sur TOUTE la matrice.
 *
 * `sheets` porte une entrée par (variant publié × champ) : la liste des tokens
 * DISTINCTS qui s'y côtoient. Les peintures et les contours vivent dans deux
 * arbres séparés, donc dans deux feuilles séparées — un fill et un stroke ne se
 * disputent jamais rien.
 *
 * La table est calculée une seule fois pour le composant : la clé d'un token
 * est ainsi la même dans toutes les feuilles où il apparaît.
 */
export function resolveColorKeys(
  sheets: ReadonlyArray<ReadonlyArray<string>>,
): Map<string, string> {
  // Les clés viennent de Figma. Une `Map` n'a aucune clé héritée, là où un objet
  // littéral ferait passer « constructor » pour une base déjà occupée.
  const tokensByBase = new Map<string, string[]>();
  const cohabitations = new Map<string, Array<readonly [string, string]>>();

  for (const sheet of sheets) {
    for (const token of sheet) {
      const base = tokenKey(token);
      const known = tokensByBase.get(base);
      if (!known) tokensByBase.set(base, [token]);
      else if (!known.includes(token)) known.push(token);
    }
    // Deux tokens distincts d'une même base dans la même feuille : c'est la
    // seule chose qui conteste une clé.
    for (let left = 0; left < sheet.length; left += 1) {
      for (let right = left + 1; right < sheet.length; right += 1) {
        const base = tokenKey(sheet[left]);
        if (base !== tokenKey(sheet[right])) continue;
        const pairs = cohabitations.get(base) ?? [];
        pairs.push([sheet[left], sheet[right]] as const);
        cohabitations.set(base, pairs);
      }
    }
  }

  const keys = new Map<string, string>();
  for (const [base, tokens] of tokensByBase) {
    const contested = cohabitations.get(base);
    if (!contested || tokens.length < 2) {
      for (const token of tokens) keys.set(token, base);
      continue;
    }
    for (const [token, key] of distinguish(tokens, contested)) keys.set(token, key);
  }
  return keys;
}
