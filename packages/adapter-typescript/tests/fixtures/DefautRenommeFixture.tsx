/** Une déclaration de fonction exportée par défaut sous un autre nom que le fichier. */
export interface DefautRenommeFixtureProps {
  action?: boolean;
}

export default function Rendu({ action }: DefautRenommeFixtureProps) {
  return <div data-action={action} />;
}
