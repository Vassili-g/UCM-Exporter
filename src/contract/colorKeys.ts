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

/** Toutes les parties d'un ensemble de profondeurs, la plus petite d'abord. */
function subsets(depths: readonly number[]): number[][] {
  const all: number[][] = [];
  for (let mask = 0; mask < 2 ** depths.length; mask += 1) {
    all.push(depths.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return all.sort(
    (left, right) => left.length - right.length || left.join('.').localeCompare(right.join('.')),
  );
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

  // Une profondeur où tous les tokens portent le même segment ne sépare rien :
  // l'ajouter allongerait la clé sans rien distinguer.
  const candidates: number[] = [];
  for (let depth = 2; depth <= longest; depth += 1) {
    const segments = new Set(tokens.map((token) => segmentAt(paths.get(token)!, depth) ?? ''));
    if (segments.size > 1) candidates.push(depth);
  }

  let best: { depths: number[]; distinct: number } | null = null;
  for (const depths of subsets(candidates)) {
    const keys = new Map(tokens.map((token) => [token, keyFor(paths.get(token)!, depths)]));
    const separates = cohabitations.every(([left, right]) => keys.get(left) !== keys.get(right));
    if (!separates) continue;
    const distinct = new Set(keys.values()).size;
    // `subsets` est déjà trié par taille puis lexicographiquement : à nombre de
    // clés égal, la première rencontrée est la plus petite sélection, et deux
    // exports d'un design inchangé produisent le même contrat.
    if (!best || distinct < best.distinct) best = { depths, distinct };
  }

  const depths = best ? best.depths : candidates;
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
