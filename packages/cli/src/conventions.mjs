/**
 * `.ucm/conventions.md` : ce qu'un repository dit de sa stack et de ses
 * écritures, lu sans bibliothèque.
 *
 * Le texte avant la première section est l'écriture de l'aide `composant`. Une
 * section `## <aide>` remplace l'écriture par défaut de cette aide, ou répond à
 * un ancrage. Une ligne `Contrôle :` ajoute ses commandes entre accents graves à
 * la preuve. Le fichier le plus proche du contrat s'applique, sans fusion.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { NOM_CONFIGURATION, isTokenReference } from "@ucm-kit/core/format";

export const CHEMIN_CONVENTIONS = join(".ucm", "conventions.md");

const MARQUEUR = /^ucm:copie\s+(\S+)\s+(\S+)(?:\s+([0-9a-f]+))?$/;
const COMMENTAIRE = /<!--([\s\S]*?)-->/g;

/**
 * L'empreinte d'une écriture par défaut. Le marqueur d'une section copiée la
 * porte : une empreinte qui ne correspond plus signale une écriture qui a changé
 * depuis la copie.
 */
export function empreinteDEcriture(ecriture) {
  return createHash("sha256").update(ecriture.trim()).digest("hex").slice(0, 8);
}

/** Le commentaire qui marque une section copiée depuis l'écriture par défaut. */
export function marqueurDeCopie(aide, version, ecriture) {
  return `<!-- ucm:copie ${aide} ${version} ${empreinteDEcriture(ecriture)} -->`;
}

/** Vrai quand `dossier` n'est ni `racine` ni l'un de ses descendants. */
export function horsDeLaRacine(dossier, racine) {
  const chemin = relative(resolve(racine), resolve(dossier));
  return chemin === ".." || chemin.startsWith(`..${sep}`) || isAbsolute(chemin);
}

/**
 * Le chemin du fichier de conventions le plus proche de `depart`, ou `null`,
 * aussi quand `depart` est hors de `racine`.
 *
 * La recherche remonte les dossiers et s'arrête au premier qui contient
 * `ucm.config.json`, ou à `racine` : un fichier de conventions situé au-dessus
 * du repository ne le concerne pas.
 */
export function conventionsLesPlusProches(depart, racine) {
  const limite = resolve(racine);
  let dossier = resolve(depart);
  if (horsDeLaRacine(dossier, limite)) return null;
  for (;;) {
    const candidat = join(dossier, CHEMIN_CONVENTIONS);
    if (existsSync(candidat)) return candidat;
    const parent = dirname(dossier);
    if (dossier === limite || existsSync(join(dossier, NOM_CONFIGURATION)) || parent === dossier) return null;
    dossier = parent;
  }
}

/** Retire les lignes `Contrôle :` d'un texte, et rend leurs commandes entre accents graves. */
function extraireControles(texte) {
  const controles = [];
  const lignes = texte.split("\n").filter((ligne) => {
    const controle = /^Contrôle\s*:(.*)$/.exec(ligne.trim());
    if (!controle) return true;
    controles.push(...[...controle[1].matchAll(/`([^`]+)`/g)].map((trouve) => trouve[1]));
    return false;
  });
  return { texte: lignes.join("\n").trim(), controles };
}

/**
 * Le contenu d'un fichier de conventions.
 *
 * `aides` associe chaque nom d'aide connu à sa description. Rend
 * `ecrituresParDefaut`, la `tete` et ses `controles`, les `sections` par nom
 * d'aide, et les `anomalies` à imprimer en tête : titre inconnu, section en
 * double, section `composant`, valeur inconnue du drapeau, référence de token
 * citée. Ne lève pas.
 */
export function lireConventions(texte, aides) {
  const anomalies = [];
  const nettoye = texte.normalize("NFC").replace(/\r\n/g, "\n")
    .replace(COMMENTAIRE, (entier, contenu) => (MARQUEUR.test(contenu.trim()) ? entier : ""));
  const lignes = nettoye.split("\n");

  let ecrituresParDefaut = true;
  const premiere = lignes.findIndex((ligne) => ligne.trim() !== "");
  const drapeau = premiere === -1 ? null : /^ecritures-par-defaut\s*:\s*(.*)$/.exec(lignes[premiere].trim());
  if (drapeau) {
    if (drapeau[1] === "non") ecrituresParDefaut = false;
    else if (drapeau[1] !== "oui") {
      anomalies.push(`ecritures-par-defaut vaut « ${drapeau[1]} » : seules les valeurs oui et non existent.`);
    }
    lignes.splice(premiere, 1);
  }

  const blocs = [{ titre: null, lignes: [] }];
  let dansUnBlocDeCode = false;
  for (const ligne of lignes) {
    if (/^\s*(```|~~~)/.test(ligne)) dansUnBlocDeCode = !dansUnBlocDeCode;
    const titre = dansUnBlocDeCode ? null : /^## (.+)$/.exec(ligne);
    if (titre) blocs.push({ titre: titre[1].trim(), lignes: [] });
    else blocs[blocs.length - 1].lignes.push(ligne);
  }

  const { texte: tete, controles } = extraireControles(blocs[0].lignes.join("\n"));
  const sections = new Map();
  for (const { titre, lignes: contenu } of blocs.slice(1)) {
    if (titre === "composant") {
      anomalies.push("La section « composant » ne s'applique pas : le texte avant la première section est l'écriture de cette aide.");
      continue;
    }
    if (!aides.has(titre)) {
      anomalies.push(`La section « ${titre} » ne nomme aucune aide.`);
      continue;
    }
    if (sections.has(titre)) {
      anomalies.push(`La section « ${titre} » est écrite deux fois : seule la première s'applique.`);
      continue;
    }
    let copie = null;
    const sansMarqueur = contenu.join("\n").replace(COMMENTAIRE, (entier, commentaire) => {
      const marqueur = MARQUEUR.exec(commentaire.trim());
      if (marqueur) copie = { aide: marqueur[1], version: marqueur[2], empreinte: marqueur[3] ?? null };
      return "";
    });
    const section = { ...extraireControles(sansMarqueur), copie };
    if ([...section.texte.matchAll(/\{[^{}\s]+\}/g)].some(([reference]) => isTokenReference(reference))) {
      anomalies.push(`La section « ${titre} » cite une référence de token : une écriture ne dépend d'aucune valeur de contrat.`);
    }
    sections.set(titre, section);
  }

  return { ecrituresParDefaut, tete, controles, sections, anomalies };
}

/**
 * Les sections copiées à relire : celles dont l'écriture par défaut a changé
 * depuis la copie, et celles dont le marqueur ne porte pas d'empreinte, pour
 * lesquelles `sansEmpreinte` vaut `true` puisque rien ne dit si elle a changé.
 */
export function sectionsARelire(conventions, aides) {
  return [...conventions.sections].filter(([nom, { copie }]) => (
    copie !== null && copie.empreinte !== empreinteDEcriture(aides.get(nom)?.ecriture ?? "")
  )).map(([nom, { copie }]) => ({ nom, version: copie.version, sansEmpreinte: copie.empreinte === null }));
}
