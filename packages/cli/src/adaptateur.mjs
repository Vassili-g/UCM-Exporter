/** Découverte optionnelle des adaptateurs officiels depuis le repository contrôlé. */
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const NOM_ADAPTATEUR_TYPESCRIPT = "@ucm-kit/adapter-typescript";

/**
 * Charge l'adaptateur TypeScript s'il est installé par le repository.
 *
 * La résolution part de la racine contrôlée, jamais du CLI lancé par `npx` :
 * autrement un adaptateur présent dans le projet resterait invisible tandis
 * qu'une copie accidentelle dans le cache de `npx` pourrait être choisie.
 */
export async function chargerAdaptateur(racine) {
  const depuisLeRepository = createRequire(join(racine, "package.json"));
  let chemin;
  try {
    chemin = depuisLeRepository.resolve(NOM_ADAPTATEUR_TYPESCRIPT);
  } catch (erreur) {
    if (erreur?.code === "MODULE_NOT_FOUND") return null;
    throw erreur;
  }

  const module = await import(pathToFileURL(chemin).href);
  const adaptateur = module.adaptateurTypeScript ?? module.default;
  const valide = adaptateur
    && typeof adaptateur.lireApiPublique === "function"
    && typeof adaptateur.nomInterfaceAttendue === "function"
    && typeof adaptateur.ecartsDeParite === "function";
  if (!valide) {
    throw new Error(`${NOM_ADAPTATEUR_TYPESCRIPT} ne publie pas un adaptateur UCM valide.`);
  }
  return adaptateur;
}
