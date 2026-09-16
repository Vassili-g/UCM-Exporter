/** Les props se décomposent dans le corps, pas dans la signature. */
export interface PropsDansLeCorpsFixtureProps {
  disabled?: boolean;
  ton?: "info" | "danger";
  ignored?: boolean;
}

export function PropsDansLeCorpsFixture(props: PropsDansLeCorpsFixtureProps) {
  const { disabled, ton: tonAffiche, ignored } = props;
  return <button disabled={disabled} data-ton={tonAffiche} />;
}
