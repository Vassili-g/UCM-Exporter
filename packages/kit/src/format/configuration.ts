/**
 * Grammaire portable de `ucm.config.json`, partagée par le plugin et la CI.
 * Ce module valide un objet sans lire de fichier. La configuration facultative
 * décrit trois chemins, l'attribut HTML des axes de modes et le repli des
 * familles typographiques, jamais la version du format ; un fichier présent mais
 * invalide est une erreur, tandis que son absence applique les valeurs par défaut.
 */

/** Le nom du fichier, écrit une fois. */
export const NOM_CONFIGURATION = 'ucm.config.json';

/**
 * Le motif retenu par défaut, parce que le premier consommateur est React et
 * qu'un défaut absent obligerait chaque appelant à réécrire la convention.
 *
 * Il n'y a que deux jetons, volontairement : `{dir}` le dossier du contrat,
 * `{id}` son identifiant. Les transformations de casse (`{id:snake}`,
 * `{id:kebab}`) s'ajouteront le jour où une cible réelle les demande, les
 * inventer maintenant, ce serait figer une grammaire sur des besoins supposés.
 */
export const MOTIF_IMPLEMENTATION_PAR_DEFAUT = '{dir}/{id}.tsx';

/** Ce qu'un repository déclare de lui-même : trois chemins et deux sections facultatives, jamais une version. */
export type ConfigurationRepository = {
  /** Dossier sous lequel les contrats sont cherchés, récursivement. */
  components: string;
  /** Chemin du fichier de tokens DTCG : un fichier, pas un dossier. */
  tokens: string;
  /** Motif qui résout le chemin d'une implémentation depuis celui du contrat. */
  implementation: string;
  /**
   * L'attribut HTML d'un axe de `tokens.json`, quand ce n'est pas celui que
   * `attributDeMode` dérive de son nom. Une clé qui ne nomme aucun axe est
   * refusée par les commandes qui lisent aussi le fichier de tokens.
   */
  modes?: Record<string, string>;
  /** Ce que la feuille CSS des tokens ajoute aux valeurs du fichier. */
  css?: { fontFamilyFallback?: string };
};

/** Les champs qui portent un chemin, et qui ont un défaut. */
const CHAMPS_DE_CHEMIN = ['components', 'tokens', 'implementation'] as const;

/**
 * Ce qu'un repository vierge décrit sans rien écrire.
 *
 * `components` à la racine et non `src/components` : le critère de réussite
 * décrit « un repo GitHub neuf, un dossier `components/`, rien d'autre ». Un
 * repo qui range autrement le dit, et c'est précisément à quoi sert ce fichier.
 *
 * `tokens` est un fichier, et l'ambiguïté a coûté un défaut : le plugin
 * enregistrait un dossier (`src/tokens`) auquel il ajoutait `/tokens.json`. Les
 * deux conventions ne se distinguaient pas tant que le dossier s'appelait
 * `tokens` : le nom du fichier ressemblait au nom du dossier. Ici, le champ
 * porte le nom du fichier, toujours.
 */
export const CONFIGURATION_PAR_DEFAUT: Readonly<ConfigurationRepository> = Object.freeze({
  components: 'components',
  tokens: 'tokens.json',
  implementation: MOTIF_IMPLEMENTATION_PAR_DEFAUT,
});

const estTexteNonVide = (valeur: unknown): boolean =>
  typeof valeur === 'string' && valeur.trim() !== '';

/**
 * Un chemin qui reste dans le repository : des segments séparés par `/`, aucun
 * vide, aucun `.` ni `..`, aucune barre oblique inverse, et pas de lettre de
 * lecteur en tête.
 *
 * Le plugin écrit l'export à ce chemin avec le jeton du designer, et GitHub
 * garde un segment `..` dans l'URL : `fetch` la normalise alors vers un autre
 * endpoint de l'API. La CI lit à ce chemin par `resolve`, qui sort de la
 * racine sur un chemin absolu. `ucm init` applique la même règle à ce qu'on
 * lui tape.
 */
export function estCheminDuRepository(valeur: unknown): boolean {
  if (typeof valeur !== 'string' || valeur.trim() !== valeur || valeur === '') return false;
  if (valeur.indexOf('\\') !== -1 || /^[A-Za-z]:/.test(valeur)) return false;
  return valeur.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

const estObjet = (valeur: unknown): valeur is Record<string, unknown> =>
  valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);

/**
 * `Object.hasOwn` n'est pas disponible ici, et ce n'est pas un oubli : ce
 * sous-chemin cible ES2019 parce qu'il est bundlé pour le sandbox Figma. Une
 * méthode plus récente compilerait sans broncher et manquerait à l'exécution,
 * dans le seul environnement où l'erreur n'apparaît qu'après le build et après
 * la CI.
 */
const declare = (objet: Record<string, unknown>, cle: string): boolean =>
  Object.prototype.hasOwnProperty.call(objet, cle);

/**
 * Un attribut de mode : `data-` suivi de lettres minuscules, de chiffres ou de
 * tirets, avec au moins une lettre ou un chiffre. Une lettre sans casse passe,
 * puisque `attributDeMode` la garde.
 */
function estAttributDeMode(valeur: unknown): boolean {
  if (typeof valeur !== 'string' || !/^data-[\p{L}\p{N}-]+$/u.test(valeur)) return false;
  const suite = valeur.slice('data-'.length);
  return suite === suite.toLowerCase() && /[\p{L}\p{N}]/u.test(suite);
}

/**
 * Les champs absents ou mal formés d'une configuration.
 *
 * Même forme de réponse que `champsInvalidesDuContrat` (une liste de chemins,
 * vide quand tout va bien) pour que l'appelant traite les deux refus de la
 * même façon. Un champ absent n'est pas invalide : il prend son défaut. Seul
 * un champ écrit et inutilisable l'est.
 */
export function champsInvalidesDeLaConfiguration(configuration: unknown): string[] {
  if (!estObjet(configuration)) return [NOM_CONFIGURATION];
  const objet = configuration;
  const invalides: string[] = [];
  for (const cle of CHAMPS_DE_CHEMIN) {
    if (declare(objet, cle) && !estCheminDuRepository(objet[cle])) invalides.push(cle);
  }
  // Un numéro de version écrit ici est refusé, pas ignoré. L'ignorer laisserait
  // croire qu'il compte : quelqu'un le mettrait à jour en pensant déplacer la
  // fenêtre de lecture, et rien ne bougerait, un geste sans effet est pire
  // qu'un geste refusé.
  for (const cle of ['contractVersion', 'version', 'schemaVersion']) {
    if (declare(objet, cle)) invalides.push(cle);
  }

  if (declare(objet, 'modes')) {
    const modes = objet.modes;
    if (!estObjet(modes)) invalides.push('modes');
    else {
      for (const [axe, attribut] of Object.entries(modes)) {
        if (!estAttributDeMode(attribut)) invalides.push(`modes.${axe}`);
      }
    }
  }
  if (declare(objet, 'css')) {
    const css = objet.css;
    if (!estObjet(css)) invalides.push('css');
    else if (
      declare(css, 'fontFamilyFallback')
      && (!estTexteNonVide(css.fontFamilyFallback) || /[;{}\r\n]/.test(css.fontFamilyFallback as string))
    ) {
      invalides.push('css.fontFamilyFallback');
    }
  }
  return invalides.sort();
}

/**
 * La configuration que porte un JSON déjà analysé, ou l'erreur qui l'en empêche.
 *
 * Rend toujours une configuration complète : l'appelant qui choisit de passer
 * outre une erreur travaille sur les défauts, jamais sur `undefined`. Ce module
 * ne lève pas, pour la même raison que le validateur de contrats ne lève pas :
 * un garde-fou doit diagnostiquer là où il serait tentant d'exploser.
 */
export function configurationDepuisJson(
  brut: unknown,
): { configuration: ConfigurationRepository; erreur: string | null } {
  const invalides = champsInvalidesDeLaConfiguration(brut);
  if (invalides.length > 0) {
    return {
      configuration: { ...CONFIGURATION_PAR_DEFAUT },
      erreur:
        `${NOM_CONFIGURATION} : ${invalides.join(', ')}. `
        + 'Un chemin est relatif au repository, en `/`, sans segment vide, `.` ni `..` ; un attribut de `modes` commence par `data-`, '
        + 'suivi de minuscules, de chiffres ou de tirets ; aucun numéro de version ne s\'y '
        + 'écrit, car la fenêtre de versions lues appartient au paquet installé.',
    };
  }

  const objet = brut as Record<string, unknown>;
  const configuration: ConfigurationRepository = { ...CONFIGURATION_PAR_DEFAUT };
  for (const cle of CHAMPS_DE_CHEMIN) {
    if (declare(objet, cle)) configuration[cle] = objet[cle] as string;
  }
  if (declare(objet, 'modes')) configuration.modes = { ...(objet.modes as Record<string, string>) };
  if (declare(objet, 'css')) configuration.css = { ...(objet.css as { fontFamilyFallback?: string }) };
  return { configuration, erreur: null };
}
