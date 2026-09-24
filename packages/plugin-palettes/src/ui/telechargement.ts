/**
 * Propose un fichier au designer ([REC-07], [VER-01]). Le plugin n'a ni réseau
 * ni accès au disque : l'iframe fabrique un lien vers un blob et le suit.
 */
export function telecharger(nom: string, contenu: string): void {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  lien.download = nom;
  lien.click();
  // Le téléchargement a lu le blob au clic : l'adresse se libère au tour suivant.
  setTimeout(() => URL.revokeObjectURL(lien.href), 0);
}
