/** Les props portées par un alias de type plutôt qu'une interface. */
export type AliasDeTypeFixtureProps = { action?: boolean } & { libelle: string };

export function AliasDeTypeFixture({ action, libelle }: AliasDeTypeFixtureProps) {
  return <div data-action={action}>{libelle}</div>;
}
