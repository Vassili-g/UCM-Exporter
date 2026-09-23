/**
 * Les mots propres à une forge, pour les deux lois qui cherchent celui d'une
 * autre : `galerie.test.ts` dans les messages d'un état, `textesAffiches.test.ts`
 * dans les littéraux des sources. Un seul domicile, sans quoi une des deux lois
 * garderait une liste courte et laisserait passer ce que l'autre refuse.
 *
 * `repository` est listé en minuscules. La casse le distingue du droit
 * « Repository : Read » que l'aide du jeton GitLab fait cocher, et qui est bien
 * un mot de GitLab.
 *
 * Les mots de GitLab pour le dépôt et pour le jeton, `projet` et
 * `jeton d’accès`, ne sont pas listés : ils servent aussi de français ordinaire
 * et de repli dans les textes écrits avant qu'une forge soit connue.
 */
export const MOTS_DE_FORGE = {
  github: /GitHub|[Pp]ull request|\bPR\b|Personal Access Token|\brepository\b/,
  gitlab: /GitLab|[Mm]erge request|\bMR\b/,
};
