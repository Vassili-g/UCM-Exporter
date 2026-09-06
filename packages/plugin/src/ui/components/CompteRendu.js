
/** Rend séparément les corrections Figma et le résultat de publication. */
export function createCompteRendu() {
  const section = document.createElement('section');
  section.className = 'compte-rendu';

  section.hidden = true;

  const aCorriger = creerGroupe('À corriger dans Figma');

  const publication = document.createElement('div');
  publication.className = 'groupe-liste';
  publication.hidden = true;

  section.append(aCorriger.element, publication);

  function ajouterEntree(noeud) {
    section.hidden = false;
    publication.hidden = false;
    publication.appendChild(noeud);
  }

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
        section.hidden = false;
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

  /**
   * Une CARTE, pas un paragraphe technique (U4.8).
   *
   * Quatre parties, dans l'ordre où on les lit : une pastille qui dit la
   * sévérité, un titre qui nomme l'élément Figma et le manque, la conséquence
   * pour le développeur, puis le geste à faire. Les trois dernières viennent du
   * moteur découpées ; rien n'est redécoupé ici, et rien n'est réécrit.
   *
   * **Elle n'empile pas les signaux.** La pastille et le fond discret portent la
   * sévérité ; le poids et la position portent la hiérarchie. Le rouge n'entre
   * pas dans cette carte : il est réservé à l'impossibilité d'exporter, qui vit
   * dans le verdict de rang 1.
   *
   * **Le lien vers Figma est un bouton distinct (U4.8).** Rendre toute la carte
   * cliquable ferait d'un bloc de trois phrases une cible unique, dont rien ne
   * dit ce que le clic déclenche. Le bouton n'apparaît que si le moteur a passé
   * un node — un message sans `nodeId` nomme un text style, une variable, ou un
   * calque agrégé sur toute la matrice, et le moteur a déclaré pourquoi (U4.3).
   *
   * Un bouton, pas un lien : il n'y a pas d'URL, et un `<a href>` factice
   * mentirait au clavier comme au lecteur d'écran.
   */
  function creerDiagnostic(point) {
    const carte = document.createElement('div');
    carte.className = 'carte carte-avertissement';

    const pastille = document.createElement('span');
    pastille.className = 'pastille pastille-avertissement';
    pastille.textContent = 'À corriger';

    const titre = document.createElement('p');
    titre.className = 'carte-titre';
    titre.textContent = point.titre;

    carte.append(pastille, titre);

    if (point.impact) {
      const impact = document.createElement('p');
      impact.className = 'carte-impact';
      impact.textContent = point.impact;
      carte.appendChild(impact);
    }

    if (point.action) {
      const action = document.createElement('p');
      action.className = 'carte-action';
      action.textContent = point.action;
      carte.appendChild(action);
    }

    if (point.nodeId) {
      const versLeCalque = document.createElement('button');
      versLeCalque.type = 'button';
      versLeCalque.className = 'btn btn-secondary carte-lien';
      versLeCalque.textContent = 'Afficher dans Figma';
      // Seul le sandbox peut poser une sélection : on lui délègue, comme pour
      // l'ouverture d'un lien externe.
      versLeCalque.addEventListener('click', () => {
        parent.postMessage(
          { pluginMessage: { type: 'montrer-le-calque', nodeId: point.nodeId } },
          '*',
        );
      });
      carte.appendChild(versLeCalque);
    }

    return carte;
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
      aCorriger.vider();
      publication.hidden = true;
      publication.replaceChildren();
      section.hidden = true;
    },
    /** `point` est ce que le moteur a écrit : titre, impact, action, node. */
    ajouterDiagnostic(point) {
      aCorriger.ajouter(creerDiagnostic(point));
    },
    ajouterPublication(texte, niveau = 'info') {
      ajouterEntree(creerLignePublication(texte, niveau));
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
      ajouterEntree(lien);
    },
  };
}
