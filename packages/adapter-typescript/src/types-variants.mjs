/** Produit le type discriminé des combinaisons d'enums réellement exportées. */
export function typeVariantesExactes(composant, nomsEnums, variants) {
  const combinaisons = [];
  const vues = new Set();
  for (const variant of Array.isArray(variants) ? variants : []) {
    const valeurs = Object.fromEntries(
      nomsEnums
        .filter((nom) => Object.hasOwn(variant?.values ?? {}, nom))
        .map((nom) => [nom, variant.values[nom]]),
    );
    if (Object.keys(valeurs).length !== nomsEnums.length) continue;
    const signature = JSON.stringify(valeurs);
    if (vues.has(signature)) continue;
    vues.add(signature);
    combinaisons.push(valeurs);
  }
  if (combinaisons.length === 0) return null;

  const membres = combinaisons.map((valeurs) => {
    const proprietes = Object.entries(valeurs)
      .map(([nom, valeur]) => `${JSON.stringify(nom)}: ${JSON.stringify(valeur)}`)
      .join("; ");
    return `  | { ${proprietes} }`;
  });
  return `/** Combinaisons de props réellement présentes dans Figma. */\n`
    + `export type ${composant}VariantProps =\n${membres.join("\n")};`;
}

/** Les enums d'API ne sont pas tous des axes : un wrapper peut en ajouter. */
export function nomsEnumsDeVariantes(nomsEnums, axes) {
  const axesPublies = new Set(Array.isArray(axes) ? axes : []);
  return nomsEnums.filter((nom) => axesPublies.has(nom));
}
