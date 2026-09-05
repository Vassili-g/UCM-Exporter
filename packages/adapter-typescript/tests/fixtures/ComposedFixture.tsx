/** Dépendance rendue sous un alias d'import. */
import { ParityFixture as Renomme } from "./ParityFixture.tsx";

export interface ComposedFixtureProps {
  action?: boolean;
}

export function ComposedFixture({ action }: ComposedFixtureProps) {
  return <div>{action ? <Renomme enabled /> : null}</div>;
}
