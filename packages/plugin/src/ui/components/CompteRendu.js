/**
 * Le compte rendu d'un export : trois groupes au lieu d'un flux (U4.1, U4.2).
 *
 * **Ce qu'il remplace.** Un journal chronologique de 96 px, en 11 px monospace,
 * qui mêlait la version de schéma, les avertissements, les notes, l'emplacement,
 * un échec GitHub, un téléchargement et le lien de pull request. Il défilait
 * vers sa fin à chaque ligne ajoutée, si bien que les avertissements — les
 * premiers arrivés, et les seuls qui demandent un geste — étaient exactement ce
 * qu'il cachait : à vingt avertissements, l'écran était identique à un export
 * qui n'en avait qu'un.
 *
 * **Les trois groupes, dans cet ordre.** Le problème avant le détail, le geste
 * séparé du constat. C'est une ADAPTATION de la règle de CONTRIBUTING.md, qui
 * est écrite pour un rapport agrégé de CI et non pour le résultat d'un export
 * unique ; ce qui la motive est gardé.
 *
 * **Le journal brut survit, replié.** Tant que le plugin n'a pas d'autre canal
 * de débogage, la trace chronologique reste la seule façon de comprendre un
 * enchaînement. Elle ne coûte plus la lecture de ce qui demande un geste.
 */
export function createCompteRendu(journal) {
  const section = document.createElement('section');
  section.className = 'compte-rendu';

  const groupes = {
    avertissement: creerGroupe('À corriger dans Figma'),
    constat: creerGroupe('Constats'),
  };

  const publication = creerGroupe('Publication', { compte: false });

  const details = document.createElement('details');
  details.className = 'details-techniques';
  const resume = document.createElement('summary');
  resume.textContent = 'Détails techniques';
  details.append(resume, journal.element);

  section.append(groupes.avertissement.element, groupes.constat.element, publication.element, details);

  /** Un groupe se cache tant qu'il est vide : un titre à zéro entrée ne dit rien. */
  function creerGroupe(titre, { compte = true } = {}) {
    const element = document.createElement('div');
    element.className = 'groupe';
    element.hidden = true;

    const entete = document.createElement('div');
    entete.className = 'groupe-titre';
    entete.textContent = titre;

    const liste = document.createElement('div');
    liste.className = 'groupe-liste';

    element.append(entete, liste);
    let total = 0;

    return {
      element,
      liste,
      ajouter(noeud) {
        total += 1;
        entete.textContent = compte ? `${titre} (${total})` : titre;
        element.hidden = false;
        liste.appendChild(noeud);
      },
      vider() {
        total = 0;
        entete.textContent = titre;
        element.hidden = true;
        liste.replaceChildren();
      },
    };
  }

  /** Une entrée est un bloc de hauteur libre, jamais une ligne tronquée (U4.2). */
  function creerDiagnostic(texte, nature) {
    const entree = document.createElement('p');
    entree.className = `entree entree-${nature}`;
    entree.textContent = texte;
    return entree;
  }

  function creerLignePublication(texte, niveau) {
    const entree = document.createElement('p');
    entree.className = `entree entree-publication entree-${niveau}`;
    entree.textContent = texte;
    return entree;
  }

  return {
    element: section,
    /** Un export qui commence efface le compte rendu du précédent, pas la cible. */
    reinitialiser() {
      for (const groupe of Object.values(groupes)) groupe.vider();
      publication.vider();
      details.open = false;
      journal.clear();
    },
    ajouterDiagnostic(nature, texte) {
      const groupe = groupes[nature] ?? groupes.constat;
      groupe.ajouter(creerDiagnostic(texte, nature));
      journal.append(texte);
    },
    ajouterPublication(texte, niveau = 'info') {
      publication.ajouter(creerLignePublication(texte, niveau));
      journal.append(texte, niveau);
    },
    /** Le lien de pull request est une SORTIE, pas une ligne de texte. */
    ajouterLien(libelle, url) {
      const lien = document.createElement('a');
      lien.className = 'entree entree-lien';
      lien.href = url;
      lien.textContent = libelle;
      // Seul le sandbox Figma sait ouvrir le navigateur : on lui délègue.
      lien.addEventListener('click', (evenement) => {
        evenement.preventDefault();
        parent.postMessage({ pluginMessage: { type: 'open-external', url } }, '*');
      });
      publication.ajouter(lien);
      journal.appendLink(libelle, url);
    },
  };
}
