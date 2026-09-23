/**
 * Tous les textes que l'interface montre au designer (D-J). Ils sont
 * provisoires : la rédaction A de `TEXTES-A-VALIDER.md`, jusqu'au choix du
 * mainteneur au point M2. Un constat a trois parties : où, quoi, geste
 * ([VER-09]).
 */
import {
  FORMAT_RECETTE,
  ecrireArrondi,
  ecrireContraste,
  type Alerte,
  type DeriveRangee,
  type EmploiDUnCran,
  type ManqueDeGarantie,
  type MembrePaire,
  type Mode,
  type Palette,
  type Promesse,
  type Recette,
  type Refus,
  type RegleRecette,
} from 'ucm-couleur';

export const TEXTES = {
  titre: 'UCM Palettes',
  titreConfiguration: 'Configuration de la recette',
  etiquetteDesOnglets: 'Vues du plugin',
  ongletPalettes: 'Palettes',
  ongletPlanche: 'Planche',
  lectureEnCours: 'Lecture de la recette du fichier…',
  recetteAbsente: 'Aucune recette dans ce fichier : la recette par défaut s’appliquera à la première palette.',
  choisirUnePalette: 'Choisir la palette ouverte',
  dessiner: 'Dessiner',
  dessinAVenir: 'Le dessin sur la planche n’est pas encore disponible.',
  prete: 'Prête',
  reference: 'Référence',
  nom: 'Nom',
  apercu: 'Aperçu des rampes',
  modesDeLApercu: 'Mode de l’aperçu',
  modeClair: 'Clair',
  modeSombre: 'Sombre',
  detailParDefaut: 'Survolez une pastille pour lire son hexa, ses contrastes et ses emplois.',
  titrePromesses: 'Promesses manquées',
  titreAlertes: 'Alertes',
  titreNotices: 'Notices',
  nouvellePalette: 'Nouvelle palette',
  creer: 'Créer',
  depuisLaSelection: 'Depuis la sélection',
  annuler: 'Annuler',
  gestesDeLaPalette: 'Gestes de la palette',
  dupliquer: 'Dupliquer',
  monter: 'Monter',
  descendre: 'Descendre',
  supprimer: 'Supprimer',
  recharger: 'Recharger',
  selectionVide: 'Aucun calque n’est sélectionné dans Figma.',
  selectionSansRemplissage: 'Aucun calque sélectionné ne porte un remplissage uni, visible et opaque.',
} as const;

/** Les libellés de la configuration de la recette (section 8.3). */
export const TEXTES_DE_CONFIGURATION = {
  courbes: 'Courbes de clarté',
  cran: 'Cran',
  clair: 'Clair',
  sombre: 'Sombre',
  parts: 'Parts de chroma',
  seuilProfilsConfondus: 'Seuil des profils confondus (ΔEok)',
  sansRecette: 'La recette du fichier ne se lit pas : sa configuration attend une recette lisible.',
} as const;

/** Le nombre de palettes qu'un groupe de champs modifie ([ENT-07]). */
export function palettesTouchees(nombre: number): string {
  if (nombre === 0) return 'aucune palette touchée';
  return nombre === 1 ? '1 palette touchée' : `${nombre} palettes touchées`;
}

/** Un nombre tel que la configuration l'affiche, à virgule. */
export function nombreEcrit(valeur: number): string {
  return String(valeur).replace('.', ',');
}

/** Une saisie qui n'est pas un nombre. */
export function nombreInvalide(saisie: string): string {
  return `« ${saisie} » n’est pas un nombre : 0,5 ou 0.5 par exemple.`;
}

/** La courbe qui ne tient plus la garantie de l'architecture ([ENT-10]). */
export function constatDeGarantie(manque: ManqueDeGarantie): Constat {
  return {
    ou: `Courbe ${ADJECTIF_DU_MODE[manque.mode]}, cran ${manque.cran}, ${manque.profil}`,
    quoi: `Contre le cran 50, le contraste descend à ${ecrireContraste(manque.contraste)} à la teinte ${manque.teinte}°, pour ${seuilEcrit(manque.seuil)} garanti.`,
    geste: `Éloignez la clarté du cran ${manque.cran} de celle du cran 50, ou gardez la courbe en connaissance de cause.`,
  };
}

/** Les libellés de l'éditeur de dérive (section 12). */
export const TEXTES_DE_LA_DERIVE = {
  regler: 'Régler',
  replier: 'Replier',
  grisDesactive: 'La référence est presque grise : sa dérive ne se voit pas.',
  sansSegmentClair: 'La référence est plus claire que le bout clair de la rampe : la dérive claire n’a pas de segment à régler.',
  sansSegmentSombre: 'La référence est plus sombre que le bout sombre de la rampe : la dérive sombre n’a pas de segment à régler.',
  prereglage: 'Préréglage',
  tailwind: 'Tailwind',
  constante: 'Constante',
  libre: 'Libre',
  lien: 'soft = vivid',
  profilRegle: 'Profil réglé',
  aligner: 'Aligner',
  annuler: 'Annuler',
  confirmationDuLien: 'Aligner soft sur vivid ? La dérive de soft sera remplacée par celle de vivid.',
  bout: { clair: 'Bout clair', sombre: 'Bout sombre' },
  deriveAuBout: { clair: 'Dérive au bout clair', sombre: 'Dérive au bout sombre' },
  ramenerAuPrereglage: { clair: 'Ramener le bout clair au préréglage Tailwind', sombre: 'Ramener le bout sombre au préréglage Tailwind' },
} as const;

/** Ce qu'une poignée annonce au lecteur d'écran ([DER-09]) : l'angle et la teinte absolue. */
export function valeurDePoignee(angle: number, teinte: number): string {
  return `${angleEcrit(angle)}, teinte ${Math.round(teinte) % 360}°`;
}

/** Le repère Tailwind d'une réglette ([DER-06]). */
export function repereTailwind(angle: number): string {
  return `Tailwind ${angleEcrit(angle)}`;
}

/** Un angle signé, au dixième : « −7,5° », « +5,1° », « 0,0° ». */
export function angleEcrit(degres: number): string {
  const signe = degres > 0 ? '+' : degres < 0 ? '−' : '';
  return `${signe}${ecrireArrondi(Math.abs(degres), 1)}°`;
}

/** Une graduation du graphe : « +30° », « 0° ». */
export function graduation(degres: number): string {
  return `${degres > 0 ? '+' : degres < 0 ? '−' : ''}${Math.abs(degres)}°`;
}

/** L'étiquette d'une poignée ([DER-03]) : l'angle signé et la teinte absolue. */
export function etiquetteDePoignee(angle: number, teinte: number): string {
  return `${angleEcrit(angle)} · ${Math.round(teinte) % 360}°`;
}

/** L'infobulle du pivot ([DER-02]). */
export function infobulleDuPivot(teinte: number): string {
  return `couleur de référence, teinte fixe, ${Math.round(teinte) % 360}°`;
}

/** L'indication discrète de rangement, au rang 3 (D-D). */
export const STATUTS_DU_RANGEMENT = {
  lu: '',
  'en-cours': 'rangement…',
  range: 'rangé',
  refuse: 'non rangé',
  invalide: 'non rangé',
} as const;

/** Le nom d'une copie de palette. */
export function nomDeLaCopie(nom: string): string {
  return `${nom} (copie)`;
}

/** Un hexa que le champ refuse : il le dit sous le champ, l'aperçu ne change pas. */
export function hexaInvalide(saisie: string): string {
  return `« ${saisie} » n’est pas une couleur : six chiffres hexadécimaux, #1E6FD9 par exemple.`;
}

/** La confirmation d'une suppression ([ENT-03]). */
export function confirmationDeSuppression(nom: string): string {
  return `Supprimer « ${nom} » ? Son cadre restera sur la planche, signalé orphelin.`;
}

/** Le refus d'un rangement : la recette rangée a changé depuis sa lecture ([REC-10]). */
export function recetteModifieeAilleurs(): Constat {
  return {
    ou: 'Recette du fichier',
    quoi: 'Elle a changé depuis sa lecture, par un autre designer ou par une annulation dans Figma : votre dernière modification n’est pas rangée.',
    geste: 'Rechargez la recette du fichier. Votre dernière modification sera perdue.',
  };
}

/** Un rangement que le sandbox refuse pour une recette invalide : l'interface en est la cause. */
export function rangementInvalide(refus: readonly Refus[]): Constat {
  return {
    ou: 'Recette du fichier',
    quoi: refus.length > 0
      ? `Le plugin a produit une recette invalide, qui n’a pas été rangée : ${texteDuRefus(refus[0])}`
      : 'Le plugin a produit une recette invalide, qui n’a pas été rangée.',
    geste: 'Rechargez la recette du fichier, puis refaites la modification.',
  };
}

/** La notice d'une couleur de sélection ramenée dans le gamut sRGB (E10). */
export function couleurRamenee(hexa: string): Constat {
  return {
    ou: `Référence ${hexa}`,
    quoi: 'La couleur Display P3 de la sélection sortait du gamut sRGB : elle a été ramenée à la plus proche que sRGB porte.',
    geste: 'Gardez cette référence, ou choisissez une couleur que sRGB porte.',
  };
}

/** Le nom qu'une palette affiche : son nom, ou son hexa de référence. */
export function nomDeLaPalette(palette: Palette): string {
  return palette.nom?.trim() ? palette.nom : palette.reference;
}

/** Le verdict d'une palette ([VER-07]). */
export function verdict(manquees: number): string {
  if (manquees === 0) return TEXTES.prete;
  return manquees === 1 ? '1 promesse manquée' : `${manquees} promesses manquées`;
}

const ADJECTIF_DU_MODE: Record<Mode, string> = { light: 'claire', dark: 'sombre' };
const NOM_DU_MODE: Record<Mode, string> = { light: 'clair', dark: 'sombre' };

/** Un seuil de contraste : « 4,5 », « 3 ». */
const seuilEcrit = (valeur: number): string => ecrireArrondi(valeur, 1).replace(/,0$/, '');

/** La part de la référence, celles des deux profils, et le cran le plus proche ([PLA-08]). */
export function ligneDeLaPart(part: number, soft: number, vivid: number, cranProche: number): string {
  return `part de chroma ${ecrireArrondi(part, 2)} · soft ${ecrireArrondi(soft, 2)} · vivid ${ecrireArrondi(vivid, 2)} · proche du cran ${cranProche}`;
}

const ORIGINES: Record<DeriveRangee['origine'], string> = { tailwind: 'Tailwind', constante: 'Constante', libre: 'Libre' };

function uneDerive(derive: DeriveRangee): string {
  return `${ORIGINES[derive.origine]} · clair ${angleEcrit(derive.clair)} · sombre ${angleEcrit(derive.sombre)}`;
}

/** La ligne repliée de la dérive (E22) : une seule quand les profils sont liés. */
export function ligneDeLaDerive(palette: Palette): string {
  const { lien, soft, vivid } = palette.derive;
  return lien ? `Dérive ${uneDerive(vivid)}` : `Dérive soft ${uneDerive(soft)} ; vivid ${uneDerive(vivid)}`;
}

const ETATS_DU_DECALAGE = ['', ' survol', ' appui'];

/** Un emploi et son état : « text survol ». */
export function emploiEcrit({ emploi, decalage }: EmploiDUnCran): string {
  return `${emploi}${ETATS_DU_DECALAGE[decalage] ?? ` +${decalage}`}`;
}

function membre(membrePaire: MembrePaire): string {
  return 'fond' in membrePaire ? 'fond' : emploiEcrit(membrePaire);
}

/** Ce qu'un cran de l'aperçu montre au survol et au focus ([UI-04]). */
export interface DetailDuCran {
  readonly nom: string;
  readonly hexa: string;
  readonly fond: number;
  readonly seuilTenu: number | null;
  readonly blanc: number;
  readonly noir: number;
  readonly emplois: readonly EmploiDUnCran[];
}

export function detailDuCran(detail: DetailDuCran): string {
  const seuil = detail.seuilTenu === null ? '–' : seuilEcrit(detail.seuilTenu);
  const emplois = detail.emplois.length > 0 ? detail.emplois.map(emploiEcrit).join(', ') : 'aucun emploi';
  return [
    detail.nom,
    detail.hexa,
    `fond ${ecrireContraste(detail.fond)} (${seuil})`,
    `blanc ${ecrireContraste(detail.blanc)}`,
    `noir ${ecrireContraste(detail.noir)}`,
    emplois,
  ].join(' · ');
}

/** Un constat qui montre aussi des pastilles côte à côte ([VER-12]). */
export interface ConstatIllustre extends Constat {
  readonly pastilles?: readonly string[];
}

/** Une promesse manquée ([VER-06]). */
export function constatDePromesse(promesse: Promesse, nom: string): Constat {
  const { paire, mode, profil } = promesse;
  const cran = [promesse.premier, promesse.second].find((designation) => designation.nature === 'cran');
  const numero = cran && cran.nature === 'cran' ? cran.cran : '';
  return {
    ou: `${nom}, ${NOM_DU_MODE[mode]}, ${profil} : ${membre(paire.premier)} sur ${membre(paire.second)}`,
    quoi: `Contraste ${ecrireContraste(promesse.contraste)} pour ${seuilEcrit(promesse.seuil)} demandé : le cran ${numero} ne tient pas la table des emplois.`,
    geste: `Réglez la dérive ou les parts de la palette, ou la courbe ${ADJECTIF_DU_MODE[mode]} dans la configuration.`,
  };
}

/** Ce que la mise en mots d'une alerte lit de la recette. */
export interface ContexteDAlerte {
  readonly recette: Recette;
  readonly nomDe: (id: string) => string;
}

const referenceLue = (contexte: ContexteDAlerte, id: string): string =>
  contexte.recette.palettes.find((palette) => palette.id === id)?.reference ?? '';

/** Une alerte ou une notice de la section 11.3. */
export function constatDAlerte(alerte: Alerte, contexte: ContexteDAlerte): ConstatIllustre {
  switch (alerte.code) {
    case 'profils-confondus': {
      const plusProche = Math.min(...alerte.crans.map((cran) => cran.distance));
      const crans = alerte.crans.map((cran) => `${NOM_DU_MODE[cran.mode]} ${cran.cran}`).join(', ');
      return {
        ou: `${contexte.nomDe(alerte.palette)}, crans ${crans}`,
        quoi: `soft et vivid ne s’écartent que de ${ecrireArrondi(plusProche, 3)} ΔEok, sous ${ecrireArrondi(alerte.seuil, 2)}.`,
        geste: 'Éloignez les parts de chroma des deux profils dans la configuration.',
      };
    }
    case 'reference-plus-claire-que-bouton':
      return {
        ou: `${contexte.nomDe(alerte.palette)}, couleur de référence ${alerte.reference}`,
        quoi: `Les boutons ne seront pas de cette couleur. Au cran 700, qui porte les boutons et les textes, elle devient ${alerte.bouton}, plus foncée.`,
        geste: 'Gardez cette couleur pour le logo et les aplats de charte, ou choisissez une référence plus sombre.',
        pastilles: [alerte.reference, alerte.bouton],
      };
    case 'palettes-proches':
      return {
        ou: `${contexte.nomDe(alerte.palettes[0])} et ${contexte.nomDe(alerte.palettes[1])}`,
        quoi: `Crans 500, 600 et 700 en vivid clair : ${ecrireArrondi(alerte.distance, 3)} ΔEok en moyenne, sous ${ecrireArrondi(alerte.seuil, 2)}.`,
        geste: 'Gardez une seule des deux palettes, ou éloignez leurs couleurs de référence.',
      };
    case 'couleur-presque-grise':
      return {
        ou: `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Chroma ${ecrireArrondi(alerte.chroma, 3)}, sous ${ecrireArrondi(alerte.seuil, 2)} : la dérive de teinte est désactivée, et les deux profils prennent la part de la référence.`,
        geste: 'Pour une rampe colorée, choisissez une référence plus saturée.',
      };
    case 'reference-plus-terne':
      return {
        ou: `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Part de chroma ${ecrireArrondi(alerte.part, 2)}, sous celle de soft (${ecrireArrondi(alerte.partSoft, 2)}) : les deux rampes sont plus vives que la référence.`,
        geste: 'Baissez les parts de cette palette dans « Avancé », ou choisissez une référence plus saturée.',
      };
    case 'reference-plus-vive':
      return {
        ou: `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Part de chroma ${ecrireArrondi(alerte.part, 2)}, au-dessus de vivid (${ecrireArrondi(alerte.partVivid, 2)}) : la rampe vivid est un peu plus terne que la référence.`,
        geste: 'Montez la part de vivid dans « Avancé » si la rampe doit l’égaler.',
      };
    case 'reference-hors-rampe':
      return {
        ou: `${contexte.nomDe(alerte.palette)}, couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Clarté ${ecrireArrondi(alerte.clarte, 3)}, hors des bouts de la rampe (${ecrireArrondi(alerte.boutSombre, 3)} à ${ecrireArrondi(alerte.boutClair, 3)}) : un seul segment de dérive se règle.`,
        geste: 'Réglez la dérive du bout qui reste, ou choisissez une référence dans la rampe.',
      };
    case 'fond-hors-courbe': {
      const sens = alerte.mode === 'light' ? 'plus sombre' : 'plus claire';
      return {
        ou: `Fond de référence ${NOM_DU_MODE[alerte.mode]}, ${contexte.recette.fonds[alerte.mode]}`,
        quoi: `Clarté ${ecrireArrondi(alerte.clarte, 3)}, ${sens} que le cran 50 (${ecrireArrondi(alerte.cran, 3)}) : les contrastes promis supposent ce cran.`,
        geste: 'Rapprochez le fond du cran 50, ou acceptez des promesses mesurées sur ce fond.',
      };
    }
  }
}

/** La notice d'un document sans profil de couleur géré. */
export function noticeLegacy(): Constat {
  return {
    ou: 'Document, profil de couleur',
    quoi: 'Profil non géré : Figma ne dit pas dans quel espace les couleurs de la planche seront peintes.',
    geste: 'Choisissez sRGB ou Display P3 dans les réglages de couleur du fichier.',
  };
}

/** Le nombre de palettes que la recette rangée porte. */
export function palettesDuFichier(nombre: number): string {
  if (nombre === 0) return 'Aucune palette dans ce fichier.';
  return nombre === 1 ? '1 palette dans ce fichier.' : `${nombre} palettes dans ce fichier.`;
}

/** Un message en trois parties. */
export interface Constat {
  readonly ou: string;
  readonly quoi: string;
  readonly geste: string;
}

/** Un nombre écrit à la française : virgule décimale. */
function nombre(valeur: string | number | undefined): string {
  return typeof valeur === 'number' ? String(valeur).replace('.', ',') : String(valeur ?? '');
}

const rangEcrit = (rang: number): string => (rang === 0 ? '1ᵉʳ' : `${rang + 1}ᵉ`);

const MODES: Record<string, string> = { light: 'claire', dark: 'sombre' };
const FONDS: Record<string, string> = { light: 'Fond clair', dark: 'Fond sombre' };
const CLES_DE_PALETTE: Record<string, string> = {
  id: 'identifiant',
  nom: 'nom',
  reference: 'référence',
  derive: 'dérive',
  parts: 'parts propres',
  clair: 'bout clair',
  sombre: 'bout sombre',
  lien: 'lien des profils',
  origine: 'origine',
};

/**
 * Le chemin d'un champ en mots du designer : `crans[3]` devient « 4ᵉ cran »,
 * `palettes[1].derive.soft.clair` « Palette 2, dérive, soft, bout clair ». Un
 * chemin que la table ne connaît pas s'écrit tel quel.
 */
export function nommerChamp(chemin: string): string {
  if (chemin === '') return 'La recette';
  let trouve = /^crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `${rangEcrit(Number(trouve[1]))} cran`;
  trouve = /^courbes\.(light|dark)(?:\[(\d+)\])?$/.exec(chemin);
  if (trouve) return `Courbe ${MODES[trouve[1]]}${trouve[2] ? `, ${rangEcrit(Number(trouve[2]))} cran` : ''}`;
  trouve = /^profils\.(soft|vivid)\.part$/.exec(chemin);
  if (trouve) return `Part de ${trouve[1]}`;
  trouve = /^fonds\.(light|dark)$/.exec(chemin);
  if (trouve) return FONDS[trouve[1]];
  trouve = /^seuils\.(\w+)$/.exec(chemin);
  if (trouve) return `Seuil ${trouve[1]}`;
  trouve = /^derives\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Relevé Tailwind, rampe ${Number(trouve[1]) + 1}`;
  trouve = /^palettes\[(\d+)\]((?:\.\w+)*)$/.exec(chemin);
  if (trouve) {
    const suite = trouve[2].split('.').filter(Boolean).map((cle) => CLES_DE_PALETTE[cle] ?? cle);
    return [`Palette ${Number(trouve[1]) + 1}`, ...suite].join(', ');
  }
  const connus: Record<string, string> = {
    crans: 'Crans',
    profils: 'Parts des profils',
    gamut: 'Gamut',
    formatVersion: 'Version de la recette',
    derives: 'Relevé Tailwind',
    palettes: 'Palettes',
  };
  return connus[chemin] ?? chemin;
}

/** Le texte d'un refus de validation, où et quoi sur la même ligne. */
const REFUS: Record<RegleRecette, (champ: string, valeur: string) => string> = {
  forme: (champ) => `${champ} : valeur absente ou du mauvais type.`,
  'cle-inconnue': (champ) => `${champ} : champ inconnu de cette version de la recette.`,
  'crans-croissants': (_, valeur) => (valeur
    ? `Crans : le cran ${valeur} ne suit pas le précédent.`
    : 'Crans : il en faut deux au moins, en ordre croissant.'),
  'courbes-longueur': (champ, valeur) => `${champ} : ${valeur} clartés, une par cran attendue.`,
  'courbes-bornes': (champ, valeur) => `${champ} : clarté ${valeur}, hors de 0 à 1.`,
  'courbe-claire-decroissante': (champ, valeur) => `${champ} : ${valeur} ne descend pas depuis le cran précédent.`,
  'courbe-sombre-croissante': (champ, valeur) => `${champ} : ${valeur} ne monte pas depuis le cran précédent.`,
  'parts-bornes': (champ, valeur) => `${champ} : ${valeur}, hors de 0 à 1.`,
  'parts-ordre': (champ) => `${champ} : la part de soft dépasse celle de vivid.`,
  'gamut-inconnu': (_, valeur) => `Gamut « ${valeur} » : seul sRGB est pris en charge.`,
  'hexa-invalide': (champ, valeur) => `${champ} : « ${valeur} » n’est pas une couleur hexadécimale.`,
  'seuils-positifs': (champ, valeur) => `${champ} : ${valeur}, il doit être positif.`,
  'derives-nombre': (_, valeur) => `Relevé Tailwind : ${valeur} rampe, il en faut deux au moins.`,
  'derives-noms': (_, valeur) => `Relevé Tailwind : « ${valeur} » apparaît deux fois.`,
  'derives-teintes': (champ, valeur) => `${champ} : teinte ${valeur}, hors de 0 à 360.`,
  'derives-teintes-claires': (_, valeur) => `Relevé Tailwind : deux rampes partagent la teinte claire ${valeur}.`,
  'derive-bornes': (champ, valeur) => `${champ} : ${valeur}°, hors de -90° à +90°.`,
  'derive-lien': (champ) => `${champ} : profils liés, mais dérives différentes.`,
  'origine-inconnue': (champ, valeur) => `${champ} : origine « ${valeur} » inconnue.`,
  'identifiant-forme': (_, valeur) => `Palette « ${valeur} » : identifiant mal formé.`,
  'identifiants-uniques': (_, valeur) => `Deux palettes portent l’identifiant « ${valeur} ».`,
  'crans-emplois': (_, valeur) => `Crans : le cran ${valeur} manque, et la table des emplois l’emploie.`,
};

/** Le texte d'un refus de [REC-05]. */
export function texteDuRefus(refus: Refus): string {
  return REFUS[refus.regle](nommerChamp(refus.chemin), nombre(refus.valeur));
}

/** Le bloquant d'une recette rangée par une version plus récente du plugin. */
export function recetteFuture(version: number): Constat {
  return {
    ou: `Recette du fichier, version ${version}`,
    quoi: `Ce plugin lit la version ${FORMAT_RECETTE} : il ne dessinera rien avec cette recette.`,
    geste: 'Mettez UCM Palettes à jour. Vous pouvez aussi exporter la recette, en importer une autre, ou repartir de la recette par défaut.',
  };
}

/** Le bloquant d'une recette rangée que la validation refuse. */
export function recetteIllisible(refus: readonly Refus[]): Constat {
  const compte = refus.length === 1 ? '1 champ est invalide' : `${refus.length} champs sont invalides`;
  return {
    ou: 'Recette du fichier',
    quoi: `${compte} ; le premier : ${texteDuRefus(refus[0])} Le plugin ne dessinera rien.`,
    geste: 'Exportez la recette pour la corriger, importez une recette valide, ou repartez de la recette par défaut.',
  };
}
