/** Une déclaration de fonction exportée par défaut, sans nom. */
export interface DefautAnonymeFixtureProps {
  action?: boolean;
}

export default function ({ action }: DefautAnonymeFixtureProps) {
  return <div data-action={action} />;
}
