/** Un JSX de documentation ne doit pas satisfaire la composition du composant. */
import { ParityFixture } from "./ParityFixture.tsx";

export const preview = <ParityFixture enabled />;

export interface CompositionHorsComposantFixtureProps {
  action?: boolean;
}

export function CompositionHorsComposantFixture({
  action,
}: CompositionHorsComposantFixtureProps) {
  return <div data-action={action} />;
}
