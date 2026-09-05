/**
 * Une vue locale qui se rend elle-même — un arbre, une liste imbriquée.
 *
 * Le relevé doit rendre une cardinalité finie plutôt que de descendre sans fin.
 */
import { TileLink } from "./Dependances";

export interface VueRecursiveFixtureProps {
  profond?: boolean;
}

function Noeud() {
  return <><TileLink /><Noeud /></>;
}

export function VueRecursiveFixture({ profond }: VueRecursiveFixtureProps) {
  return <div data-profond={profond}><Noeud /></div>;
}
