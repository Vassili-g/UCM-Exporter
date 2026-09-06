const TONS = ["info", "success", "warning"] as const;

export interface EnumsFixtureProps {
  /** Union plus petite que les valeurs du contrat : le seul écart visible. */
  ton?: "info" | "success";
  /** Déclarée, jamais lue — le signal que les booléens portent déjà. */
  muet?: (typeof TONS)[number];
  /** Type élargi : aucun littéral, donc aucun verdict. */
  large?: string;
  /** Union plus large que le contrat : accepter plus ne contredit rien. */
  surensemble?: "info" | "success" | "warning" | "danger";
}

export function EnumsFixture({ ton, large, surensemble }: EnumsFixtureProps) {
  return <span data-ton={ton} data-large={large} data-surensemble={surensemble} />;
}
