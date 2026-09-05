import { Alert, Button, TileLink } from "./Dependances";

interface BaseProps {
  label: string;
}

export interface StressFixtureProps extends BaseProps {
  disabled?: boolean;
  ignored?: boolean;
  mode: "simple" | "detail";
}

function VueSimple() {
  return <><Alert /><Button /><TileLink /><TileLink /></>;
}

function VueDetaillee() {
  return <><Button /><Button /><Button />{true && <TileLink />}<TileLink /><TileLink /></>;
}

export function StressFixture({ disabled, label }: StressFixtureProps) {
  return <section aria-disabled={disabled} aria-label={label}>
    {disabled ? <VueSimple /> : <VueDetaillee />}
  </section>;
}
