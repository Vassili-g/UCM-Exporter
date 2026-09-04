/**
 * L'échantillon est-il JOIGNABLE ?
 *
 * `samples` n'est pas normatif : aucun contrôle ne le compare au code, et ce
 * module n'en change rien. Il ne demande jamais si une valeur est JUSTE — la
 * maquette du jour de l'export n'engage personne. Il demande si un lecteur peut
 * l'ATTEINDRE : une clé qui ne désigne aucune prop, un calque qui ne désigne
 * aucun slot, une dépendance imbriquée que son propriétaire ne déclare pas sont
 * des adresses mortes. Le consommateur ne peut alors ni les appliquer ni les
 * signaler, et l'écart ne se voit qu'à l'écran — c'est exactement ainsi que des
 * sous-composants se sont retrouvés mal configurés sans qu'aucun contrôle ne
 * bronche.
 *
 * La forme d'un échantillon vit ailleurs, dans `validation-contrat.mjs` : ici on
 * suppose la forme acquise et on joint les adresses. La moitié de ces jointures
 * traverse deux contrats, l'autre reste dans un seul ; les rassembler tient à ce
 * qu'elles répondent toutes à la même question, et à ce qu'un `masterPath` et un
 * `slotPath` ne se contrôlent pas dans deux endroits différents.
 *
 * Le geste attendu est presque toujours le même : réexporter. Deux contrats qui
 * ne se joignent plus sont, dans l'immense majorité des cas, deux exports pris à
 * des dates différentes.
 */
import { compositionsExactesDuVariant, vueExacteDuVariant } from "./variant-views.mjs";

/** Vrai pour un objet JSON, mais pas pour un tableau ni `null`. */
function estObjet(valeur) {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

function estTexte(valeur) {
  return typeof valeur === "string" && valeur.trim() !== "";
}

/**
 * La surface publique qu'un contrat offre à `args`, clés et valeurs admises.
 *
 * `props` ne suffit pas : l'axe d'états n'est pas une prop et vit dans
 * `stateModel`, alors qu'`args` le porte sous sa clé pour que le lecteur puisse
 * retrouver le variant. C'est l'exacte répartition que l'Exporter publie, et la
 * refaire ici serait la seule façon de la contredire.
 */
function surfacePublique(contrat) {
  const surface = new Map();
  for (const [cle, prop] of Object.entries(estObjet(contrat?.props) ? contrat.props : {})) {
    if (estObjet(prop)) surface.set(cle, prop);
  }
  const axe = contrat?.stateModel?.axis;
  if (estTexte(axe) && !surface.has(axe)) {
    surface.set(axe, {
      type: "enum",
      values: Object.keys(estObjet(contrat?.stateModel?.states) ? contrat.stateModel.states : {}),
    });
  }
  return surface;
}

/**
 * Le slot que désigne un chemin, ou la raison pour laquelle il n'en désigne pas
 * exactement un.
 *
 * Deux frères peuvent porter le même nom de slot : l'exiger UNIQUE est le fond
 * du contrôle, pas un détail d'implémentation. Un chemin qui joint deux slots ne
 * dit pas où poser ce qu'il porte.
 */
function slotDuChemin(children, chemin) {
  let niveau = Array.isArray(children) ? children : [];
  let courant = null;
  for (const segment of chemin) {
    const trouves = niveau.filter((child) => estObjet(child) && child.slot === segment);
    if (trouves.length !== 1) return { erreur: trouves.length, segment };
    courant = trouves[0];
    niveau = Array.isArray(courant.children) ? courant.children : [];
  }
  return { slot: courant };
}

/** Signature d'une dépendance : le couple que deux contrats partagent. */
function signature(dependance) {
  return `${dependance?.component}\u0000${dependance?.figmaLayer}`;
}

/** Combien de fois chaque signature apparaît dans une liste de dépendances. */
function cardinalites(dependances) {
  const compte = new Map();
  for (const dependance of Array.isArray(dependances) ? dependances : []) {
    if (!estObjet(dependance)) continue;
    const cle = signature(dependance);
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  return compte;
}

/**
 * Chaque clé d'`args` désigne-t-elle une prop que la dépendance publie ?
 *
 * `args` est une projection FERMÉE de la surface publique : l'Exporter n'y laisse
 * entrer que ce que le modèle de propriétés a accepté. Une clé qui ne joint rien
 * n'est donc pas une tolérance, c'est la preuve que les deux contrats ne
 * décrivent plus le même composant.
 *
 * Le contrôle est une INCLUSION, jamais une couverture : `args` est publié comme
 * un sous-ensemble, et plusieurs types de props n'y entrent structurellement
 * jamais — un `slot`, dont le contenu libre n'est pas une valeur, et une prop
 * d'icône runtime, que les règles `@icons` fabriquent sans porteur Figma.
 */
function validerArgs(instance, dependance, ajouter) {
  const surface = surfacePublique(dependance);
  const nom = instance.component;
  for (const [cle, valeur] of Object.entries(estObjet(instance.args) ? instance.args : {})) {
    const prop = surface.get(cle);
    if (!prop) {
      ajouter(
        `Le sample pose « ${cle} » sur la dépendance « ${nom} », dont le contrat ne publie `
          + `aucune prop ni axe d'états de ce nom. Réexportez les deux composants depuis `
          + `Figma ; si l'écart persiste, la propriété a été renommée d'un seul côté.`,
      );
      continue;
    }
    if (prop.type === "slot") {
      ajouter(
        `Le sample pose « ${cle} » sur la dépendance « ${nom} », dont la prop est un slot : `
          + `son contenu libre n'est pas une valeur qu'un développeur puisse reconstruire. `
          + `Réexportez les deux composants depuis Figma.`,
      );
      continue;
    }
    if (typeof valeur === "boolean" && prop.type !== "boolean") {
      ajouter(
        `Le sample pose le booléen « ${cle} » sur la dépendance « ${nom} », dont la prop est `
          + `de type « ${prop.type} ». Réexportez les deux composants depuis Figma.`,
      );
      continue;
    }
    if (typeof valeur === "string" && prop.type === "boolean") {
      ajouter(
        `Le sample pose le texte « ${cle} » sur la dépendance « ${nom} », dont la prop est `
          + `un booléen. Réexportez les deux composants depuis Figma.`,
      );
      continue;
    }
    if (
      typeof valeur === "string"
      && prop.type === "enum"
      && !(Array.isArray(prop.values) ? prop.values : []).includes(valeur)
    ) {
      const admises = (Array.isArray(prop.values) ? prop.values : [])
        .map((option) => `« ${option} »`).join(", ") || "aucune valeur";
      ajouter(
        `Le sample pose « ${cle} = ${valeur} » sur la dépendance « ${nom} », dont le contrat `
          + `n'admet que ${admises}. Réexportez les deux composants depuis Figma.`,
      );
    }
  }
}

/**
 * Chaque `masterPath` joint-il exactement une icône de sa dépendance ?
 *
 * C'est LE contrôle que seul un lecteur du graphe peut faire, et celui dont
 * l'absence a coûté le plus cher : `swaps` publie un chemin de calques du maître
 * de la dépendance, et le consommateur doit en joindre le dernier segment à
 * `icons.<clé>.figmaName` du contrat de CETTE dépendance pour trouver la prop à
 * renseigner. Zéro ou plusieurs réponses rendent cette prop indécidable sans
 * casser la compilation.
 *
 * Ce que ce contrôle NE dit pas : quelle icône est la bonne.
 */
function validerRemplacements(instance, dependance, ajouter) {
  for (const swap of Array.isArray(instance.swaps) ? instance.swaps : []) {
    if (!estObjet(swap) || !Array.isArray(swap.masterPath)) continue;
    const calque = swap.masterPath[swap.masterPath.length - 1];
    if (typeof calque !== "string") continue;
    const icones = estObjet(dependance.icons) ? Object.values(dependance.icons) : [];
    const correspondances = icones.filter((icone) => icone?.figmaName === calque);
    if (correspondances.length === 1) continue;
    const constat = correspondances.length === 0
      ? "ne joint aucune icône de son contrat"
      : `joint ${correspondances.length} icônes de son contrat`;
    ajouter(
      `Le remplacement « ${calque} » de la dépendance « ${instance.component} » `
        + `${constat}. Le designer doit faire correspondre ce nom de layer à une seule `
        + `icône de « ${instance.component} », puis réexporter les contrats concernés.`,
    );
  }
}

/**
 * Une dépendance imbriquée est-elle une dépendance de son propriétaire IMMÉDIAT ?
 *
 * C'est la contrepartie contrôlable de la règle d'adressage : les `composes`
 * d'une `SampleInstance` se rapprochent des dépendances directes de son
 * propriétaire, dans l'ordre, par le couple `component` + `figmaLayer`. Si ce
 * couple n'existe pas chez le propriétaire, le lecteur n'a aucune position où
 * poser ce qu'il porte, et la seule issue serait la recherche globale par nom
 * que le protocole interdit.
 *
 * La cardinalité se compare au `composes` global de la dépendance — l'union
 * ordonnée à cardinalité MAXIMALE. On ne sait pas quel variant de la dépendance
 * le parent a instancié ; exiger moins serait faux, exiger un variant précis
 * serait invérifiable.
 */
function validerImbrications(instance, dependance, ajouter) {
  const declarees = cardinalites(dependance.composes);
  const observees = cardinalites(instance.composes);
  for (const [cle, observee] of observees) {
    const [composant, calque] = cle.split("\u0000");
    const declaree = declarees.get(cle) ?? 0;
    if (declaree === 0) {
      ajouter(
        `Le sample situe « ${composant} » sur le layer « ${calque} » à l'intérieur de la `
          + `dépendance « ${instance.component} », dont le contrat ne déclare aucune `
          + `dépendance de ce nom sur ce layer. Réexportez les deux composants depuis `
          + `Figma ; si l'écart persiste, ce layer porte dans la maquette un composant `
          + `que « ${instance.component} » ne contient pas.`,
      );
      continue;
    }
    if (observee > declaree) {
      ajouter(
        `Le sample situe ${observee} occurrences de « ${composant} » sur le layer `
          + `« ${calque} » à l'intérieur de la dépendance « ${instance.component} », qui `
          + `n'en déclare que ${declaree}. Réexportez les deux composants depuis Figma.`,
      );
    }
  }
}

/**
 * Les racines d'un échantillon se posent-elles sur les slots du variant ?
 *
 * Deux jointures, toutes deux internes au contrat. La séquence d'abord : les
 * racines suivent, dans l'ordre, les dépendances exactes du variant. On exige
 * une SOUS-SÉQUENCE, pas une égalité — une dépendance que l'arbre publié ne
 * situe pas est retirée de l'échantillon sous un simple avertissement de
 * l'Exporter, et transformer cette dégradation douce en erreur dure violerait la
 * seule promesse que `samples` ait jamais faite : ne jamais rien dégrader. Le
 * désordre et l'invention restent attrapés, l'omission est tolérée.
 *
 * Le `slotPath` ensuite : il doit désigner exactement un slot de la vue exacte,
 * et ce slot doit composer le même composant. C'est l'adresse par laquelle le
 * lecteur pose la dépendance ; deux réponses ou zéro ne lui en donnent aucune.
 */
function validerRacines(contrat, variant, cle, echantillon, ajouter) {
  const vue = vueExacteDuVariant(contrat, variant);
  const racines = Array.isArray(echantillon.composes) ? echantillon.composes : [];
  const exactes = compositionsExactesDuVariant(contrat, variant);

  let curseur = 0;
  for (const racine of racines) {
    if (!estObjet(racine)) continue;
    const cible = signature(racine);
    let position = curseur;
    while (position < exactes.length && signature(exactes[position]) !== cible) position += 1;
    if (position >= exactes.length) {
      ajouter(
        `Le sample « ${cle} » situe « ${racine.component} » sur le layer `
          + `« ${racine.figmaLayer} », que les dépendances exactes de ce variant ne `
          + `contiennent pas dans cet ordre. Réexportez ce composant depuis Figma.`,
      );
      continue;
    }
    curseur = position + 1;

    if (!Array.isArray(racine.slotPath)) continue;
    const resolution = slotDuChemin(vue?.structure?.children, racine.slotPath);
    if (resolution.erreur !== undefined) {
      const chemin = racine.slotPath.join(" / ");
      ajouter(
        `Le slotPath « ${chemin} » du sample « ${cle} » désigne `
          + `${resolution.erreur} slot(s) de la vue exacte au segment `
          + `« ${resolution.segment} », au lieu d'un seul. Réexportez ce composant `
          + `depuis Figma.`,
      );
      continue;
    }
    if (resolution.slot?.composes !== racine.component) {
      ajouter(
        `Le slotPath « ${racine.slotPath.join(" / ")} » du sample « ${cle} » `
          + `désigne un slot qui compose « ${resolution.slot?.composes ?? "rien"} », pas `
          + `« ${racine.component} ». Réexportez ce composant depuis Figma.`,
      );
    }
  }
}

/**
 * Chaque `text` se pose-t-il sur un slot que le variant publie ?
 *
 * C'est le canal qui porte le contenu réellement affiché, et le plus volumineux
 * d'un composé. Un chemin qui ne joint aucun slot rend ce contenu inatteignable
 * — le lecteur voit le texte, mais ne sait pas où l'écrire.
 */
function validerTextes(contrat, variant, cle, echantillon, ajouter) {
  const vue = vueExacteDuVariant(contrat, variant);
  for (const texte of Array.isArray(echantillon.text) ? echantillon.text : []) {
    if (!estObjet(texte) || !Array.isArray(texte.slotPath)) continue;
    const resolution = slotDuChemin(vue?.structure?.children, texte.slotPath);
    if (resolution.erreur === undefined) continue;
    ajouter(
      `Le slotPath « ${texte.slotPath.join(" / ")} » d'un texte du sample `
        + `« ${cle} » désigne ${resolution.erreur} slot(s) de la vue exacte au segment `
        + `« ${resolution.segment} », au lieu d'un seul. Réexportez ce composant depuis `
        + `Figma.`,
    );
  }
}

/**
 * Joint toutes les adresses des échantillons, à toute profondeur.
 *
 * `parNom` vient du graphe : un composant absent ou ambigu y est déjà signalé, et
 * en reparler ici doublerait le message sans rien apprendre. `ajouter` est celui
 * du graphe aussi, qui dédoublonne par contrat — un même échantillon partagé par
 * plusieurs variants ne produit donc qu'un constat.
 */
export function validerAdressesDEchantillons(documents, parNom, ajouter) {
  const visiter = (instance, chemin) => {
    if (!estObjet(instance)) return;
    const cibles = parNom.get(instance.component) ?? [];
    const dependance = cibles.length === 1 ? cibles[0].contrat : null;
    const noter = (message) => ajouter(chemin, message);

    if (dependance) {
      validerArgs(instance, dependance, noter);
      validerRemplacements(instance, dependance, noter);
      validerImbrications(instance, dependance, noter);
    }

    for (const enfant of Array.isArray(instance.composes) ? instance.composes : []) {
      visiter(enfant, chemin);
    }
  };

  for (const { chemin, contrat } of documents) {
    const echantillons = estObjet(contrat?.samples) ? contrat.samples : {};
    for (const echantillon of Object.values(echantillons)) {
      if (!estObjet(echantillon)) continue;
      for (const instance of Array.isArray(echantillon.composes) ? echantillon.composes : []) {
        visiter(instance, chemin);
      }
    }

    // Une paire vue + échantillon vaut pour tous les variants qui la partagent :
    // quatre-vingt-dix variants au rendu identique ne doivent pas produire
    // quatre-vingt-dix fois le même constat.
    const paires = new Set();
    for (const variant of Array.isArray(contrat?.variants) ? contrat.variants : []) {
      const cle = variant?.sample;
      const echantillon = echantillons[cle];
      if (!estObjet(echantillon)) continue;
      const paire = `${variant?.view}\u0000${cle}`;
      if (paires.has(paire)) continue;
      paires.add(paire);
      const noter = (message) => ajouter(chemin, message);
      validerRacines(contrat, variant, cle, echantillon, noter);
      validerTextes(contrat, variant, cle, echantillon, noter);
    }
  }
}
