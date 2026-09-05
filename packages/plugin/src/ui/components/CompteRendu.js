/**
 * Le compte rendu d'un export : deux groupes au lieu d'un flux (U4.1, U4.2).
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
 *
 * **Chaque avertissement est une CARTE (U4.8)**, pas un paragraphe : pastille,
 * titre, conséquence, geste, et un bouton vers le calque quand il y en a un. Un
 * export sain ne montre donc aucun groupe de diagnostic — son verdict et sa
 * publication suffisent.
 *
 * **Le groupe « Constats » a disparu avec son contenu (U4.7).** Il rendait
 * visibles des transformations que le contrat publie exactement : le designer y
 * relisait le fonctionnement interne de l'exporteur pour s'entendre dire qu'il
 * n'avait rien à faire. Ce n'était pas un problème de présentation, et aucune
 * carte ni couleur ne l'aurait réparé — le moteur ne les émet plus.
 */
export function createCompteRendu(journal) {
  const section = document.createElement('section');
  section.className = 'compte-rendu';

  const aCorriger = creerGroupe('À corriger dans Figma');
  const publication = creerGroupe('Publication', { compte: false });

  const details = document.createElement('details');
  details.className = 'details-techniques';
  const resume = document.createElement('summary');
  resume.textContent = 'Détails techniques';
  details.append(resume, journal.element);

  section.append(aCorriger.element, publication.element, details);

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
      publication.vider();
      details.open = false;
      journal.clear();
    },
    /**
     * `point` est ce que le moteur a écrit : titre, impact, action, node.
     *
     * Le journal, lui, garde la PHRASE — la même que `meta.diagnostics` et la
     * pull request publient. C'est ce qui permet de comparer une trace à une
     * pull request sans se demander laquelle des deux a été reformulée.
     */
    ajouterDiagnostic(point) {
      aCorriger.ajouter(creerDiagnostic(point));
      journal.append([point.titre, point.impact, point.action].filter(Boolean).join(' '));
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
