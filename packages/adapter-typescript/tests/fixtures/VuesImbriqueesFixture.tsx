/**
 * Deux niveaux de vues locales, et une grille partagée par les deux branches.
 *
 * Un composant réel ne délègue pas d'un seul cran : une vue appelle une grille,
 * qui appelle les dépendances. La cardinalité doit traverser les DEUX crans.
 */
import { Alert, Button, TileLink } from "./Dependances";

export interface VuesImbriqueesFixtureProps {
  detaille?: boolean;
}

function Grille() {
  return <><TileLink /><TileLink /><TileLink /></>;
}

function VueBreve() {
  return <><Alert /><Grille /></>;
}

function VueLongue() {
  return <div><Button /><Grille /><Grille /></div>;
}

export function VuesImbriqueesFixture({ detaille }: VuesImbriqueesFixtureProps) {
  return <section>{detaille ? <VueLongue /> : <VueBreve />}</section>;
}
