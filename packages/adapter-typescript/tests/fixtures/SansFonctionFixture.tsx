/** L'interface existe, mais aucune fonction ne porte le nom du fichier. */
export interface SansFonctionFixtureProps {
  action?: boolean;
}

export const AutreNom = ({ action }: SansFonctionFixtureProps) => (
  <div data-action={action} />
);
