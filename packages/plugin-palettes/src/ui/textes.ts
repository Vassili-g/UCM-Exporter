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
  type Ancrage,
  type DeriveRangee,
  type EmploiDUnCran,
  type ManqueDeGarantie,
  type MembrePaire,
  type Mode,
  type Palette,
  type Profil,
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
  fonds: 'Fonds de référence',
  fondDuMode: { light: 'Fond clair', dark: 'Fond sombre' },
  seuilsDeContraste: 'Seuils de contraste',
  seuilTexte: 'Texte',
  seuilNonTexte: 'Non-texte',
  seuilPalettesProches: 'Seuil des palettes proches (ΔEok)',
  seuilChromaGrise: 'Chroma d’une référence grise',
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

/** La section repliée « Avancé » d'une palette (section 8.1, [ENT-09]). */
export const TEXTES_AVANCES = {
  avance: 'Avancé',
  partDuProfil: { soft: 'Part soft', vivid: 'Part vivid' },
  reprendre: 'Reprendre les parts de la recette',
} as const;

/** D'où viennent les parts qu'une palette emploie ; une part grise est visible (D-G). */
export function origineDesParts(origine: 'designer' | 'grise' | undefined, part: number): string {
  if (origine === 'designer') return 'Parts propres : la configuration ne touche plus les parts de cette palette.';
  if (origine === 'grise') return `Référence presque grise : les deux profils prennent sa part de chroma, ${nombreEcrit(part)}.`;
  return 'Parts de la recette : cette palette suit les parts de la configuration.';
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

/** L'infobulle du pivot ([DER-02]) : la teinte de la référence, et la nuance qui la porte dans chaque thème. */
export function infobulleDuPivot(teinte: number, ancrage: Ancrage): string {
  return `Couleur de référence : teinte ${Math.round(teinte) % 360}°. ${NOM_DU_PROFIL[ancrage.profil]} · nuance ${ancrage.crans.light} en Thème Light, ${ancrage.crans.dark} en Thème Dark.`;
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

/** Le nom d'affichage d'un profil ; la clé `soft` ou `vivid` reste celle des données. */
export const NOM_DU_PROFIL: Record<Profil, string> = { soft: 'Soft', vivid: 'Vivid' };

/** Le profil et la nuance qui portent la référence exacte dans un mode ([MOT-17]). */
export function ligneDeLaReference(ancrage: Ancrage, mode: Mode): string {
  return `Référence : ${NOM_DU_PROFIL[ancrage.profil]} · nuance ${ancrage.crans[mode]}`;
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

/** Les gestes de la recette en fichier (section 10.1, [REC-11]). */
export const TEXTES_DE_LA_RECETTE = {
  exporter: 'Exporter la recette',
  importer: 'Importer une recette',
  repartir: 'Repartir de la recette par défaut',
  exporterLeRapport: 'Exporter le rapport',
  confirmerLImport: 'Importer',
  confirmerLeDepart: 'Repartir',
  annuler: 'Annuler',
  sansEcart: 'Aucun écart avec la recette du fichier.',
  importSansDessin: 'L’import remplace la recette du fichier ; il ne redessine rien.',
  confirmationDuDepart: 'Repartir de la recette par défaut ? La recette rangée sera remplacée : exportez-la d’abord pour la garder.',
} as const;

/** Le titre de la confirmation d'un import ([REC-08]). */
export function titreDeLImport(fichier: string): string {
  return `Importer « ${fichier} » ?`;
}

/** Une ligne de l'écart d'import : des palettes par leur nom, ou des paramètres communs. */
export function ligneDEcart(genre: 'ajoutees' | 'retirees' | 'modifiees' | 'parametres', noms: readonly string[]): string {
  const titres = {
    ajoutees: noms.length === 1 ? 'Palette ajoutée' : 'Palettes ajoutées',
    retirees: noms.length === 1 ? 'Palette retirée' : 'Palettes retirées',
    modifiees: noms.length === 1 ? 'Palette modifiée' : 'Palettes modifiées',
    parametres: noms.length === 1 ? 'Paramètre commun modifié' : 'Paramètres communs modifiés',
  };
  return `${titres[genre]} : ${noms.join(', ')}.`;
}

/** Le nom d'un paramètre commun dans l'écart d'import. */
export const NOMS_DES_PARAMETRES = {
  crans: 'crans',
  courbes: 'courbes de clarté',
  profils: 'parts de chroma',
  fonds: 'fonds de référence',
  seuils: 'seuils',
  derives: 'paires de Tailwind',
  gamut: 'gamut',
} as const;

/** Un fichier importé qui ne se lit pas : la recette rangée reste intacte ([REC-08]). */
export function importInvalide(fichier: string, refus: readonly Refus[]): Constat {
  const compte = refus.length === 1 ? '1 champ est invalide' : `${refus.length} champs sont invalides`;
  return {
    ou: `Import, ${fichier}`,
    quoi: `${compte} ; le premier : ${texteDuRefus(refus[0])} La recette du fichier reste intacte.`,
    geste: 'Corrigez le fichier, puis importez-le de nouveau.',
  };
}

/** Un fichier importé d'une version que ce plugin ne lit pas. */
export function importFutur(fichier: string, version: number): Constat {
  return {
    ou: `Import, ${fichier}, version ${version}`,
    quoi: `Ce plugin lit la version ${FORMAT_RECETTE} : la recette du fichier reste intacte.`,
    geste: 'Mettez UCM Palettes à jour, puis importez de nouveau ce fichier.',
  };
}

/** Les libellés de l'onglet Planche et du dessin (section 13.2). */
export const TEXTES_DU_DESSIN = {
  dessiner: 'Dessiner',
  redessiner: 'Redessiner',
  dessinerTout: 'Dessiner toutes les palettes',
  grille: 'Grille de contraste',
  aJour: 'à jour',
  perimee: 'périmée',
  jamaisDessinee: 'jamais dessinée',
  redessinerQuandMeme: 'Redessiner quand même',
  voirSurLaPlanche: 'Voir sur la planche',
  reessayer: 'Réessayer',
  confirmer: 'Dessiner',
  annuler: 'Annuler',
  plancheSansPalette: 'Aucune palette à dessiner : la planche attend une première palette.',
  versLesPalettes: 'Ouvrir l’onglet Palettes',
} as const;

/** L'en-tête de l'onglet Planche (section 13.2). */
export function enTeteDeLaPlanche(nombre: number, version: number, empreinte: string | null, profil: ProfilDuDocumentEcrit): string {
  const palettes = nombre === 1 ? '1 palette' : `${nombre} palettes`;
  return `Planche : ${palettes} · recette v${version}${empreinte ? ` · empreinte ${empreinte}` : ''} · ${ESPACES[profil]}`;
}

/** La progression d'un dessin, à la place de « Dessiner » ([UI-05], [PLA-24]). */
export function progressionDuDessin(fait: number, total: number, nom: string): string {
  return total === 1 ? `Dessin de ${nom}…` : `Dessin ${fait + 1}/${total} : ${nom}…`;
}

/** Le résultat d'un dessin réussi. */
export function palettesDessinees(nombre: number): string {
  return nombre === 1 ? '1 palette dessinée sur la planche.' : `${nombre} palettes dessinées sur la planche.`;
}

/** La confirmation avant de dessiner beaucoup de palettes ([PLA-24], D-I). */
export function confirmationDuDessin(nombre: number): string {
  return `Dessiner les ${nombre} palettes ? Chacune pose plus de cinq cents calques sur la planche.`;
}

/** Le bloquant d'une police indisponible ([PLA-22]). */
export function policeIndisponible(style: string): Constat {
  return {
    ou: `Planche, police ${style}`,
    quoi: `${style} ne se charge pas : aucun cadre n’a été dessiné.`,
    geste: 'Installez ou activez Inter, puis relancez le dessin.',
  };
}

/** Un dessin interrompu : le cadre en cours est retiré, les précédents restent. */
export function dessinInterrompu(nom: string, message: string, dessines: number): Constat {
  const suite = dessines === 0
    ? 'aucun cadre n’a été posé'
    : `ce cadre n’a pas été posé, ${dessines === 1 ? 'le cadre précédent reste' : `les ${dessines} cadres précédents restent`}`;
  return {
    ou: `Planche, ${nom}`,
    quoi: `Le dessin s’est arrêté (${message}) : ${suite}.`,
    geste: 'Relancez le dessin.',
  };
}

/** Un dessin refusé : la recette rangée n'est plus celle que l'aperçu montre (E13). */
export function dessinSurUneAutreRecette(): Constat {
  return {
    ou: 'Recette du fichier',
    quoi: 'Elle a changé depuis sa lecture : le dessin montrerait d’autres couleurs que l’aperçu. Rien n’a été dessiné.',
    geste: 'Rechargez la recette du fichier, puis relancez le dessin.',
  };
}

const citer = (noms: readonly string[]): string => noms.map((nom) => `« ${nom} »`).join(', ');

/** Les calques qu'un redessin retirerait, à confirmer avant le dessin ([PLA-03], D-H). */
export function constatDesCalquesEtrangers(nom: string, calques: readonly string[]): Constat {
  const seul = calques.length === 1;
  return {
    ou: `Planche, cadre de ${nom}`,
    quoi: seul
      ? `Le calque ${citer(calques)}, ajouté dans ce cadre, disparaîtra au dessin.`
      : `Les ${calques.length} calques ajoutés dans ce cadre disparaîtront au dessin : ${citer(calques)}.`,
    geste: seul ? 'Sortez-le du cadre pour le garder, ou redessinez quand même.' : 'Sortez-les du cadre pour les garder, ou redessinez quand même.',
  };
}

/** Un cadre dont la palette a été supprimée ([ENT-03]). */
export function cadreOrphelin(nom: string): Constat {
  return {
    ou: `Planche, cadre « ${nom} »`,
    quoi: 'Sa palette a été supprimée : aucun dessin ne touche plus ce cadre.',
    geste: 'Supprimez le cadre dans Figma s’il ne sert plus.',
  };
}

/** La copie d'un cadre de palette, faite par le designer ([PLA-25], E15). */
export function copieDeCadre(nom: string): Constat {
  return {
    ou: `Planche, cadre « ${nom} »`,
    quoi: 'Ce cadre est une copie : le plugin ne la redessine pas, et ses couleurs datent du moment de la copie.',
    geste: 'Pour une copie à jour, redessinez la palette, puis copiez de nouveau son cadre.',
  };
}

/** La notice d'un document Display P3 (section 6.7, E11). */
export function noticeDisplayP3(): Constat {
  return {
    ou: 'Document, profil Display P3',
    quoi: 'La planche peint chaque couleur convertie en Display P3 : la pipette de Figma y lit des valeurs P3, différentes de l’hexa des cartes.',
    geste: 'Copiez l’hexa depuis le texte de la carte, pas avec la pipette.',
  };
}

/** Les couleurs d'une palette que la planche peint autrement que l'aperçu (L6.14). */
export function ecartDePeinture(nom: string, ecarts: readonly { readonly nom: string; readonly apercu: string | null; readonly peint: string }[]): Constat {
  const [premier] = ecarts;
  const compte = ecarts.length === 1 ? '1 couleur peinte diffère' : `${ecarts.length} couleurs peintes diffèrent`;
  return {
    ou: `Planche, ${nom}`,
    quoi: `${compte} de l’aperçu, dont ${premier.nom} : aperçu ${premier.apercu ?? 'absent'}, planche ${premier.peint}.`,
    geste: 'Redessinez la palette. Si l’écart reste, signalez-le au mainteneur du plugin.',
  };
}

/** Les textes que la planche porte dans le document (section 9). */
export const TEXTES_DE_LA_PLANCHE = {
  avertissement: 'Dessiné par UCM Palettes. Ce cadre est remplacé à chaque dessin.',
  reference: 'Référence',
  emplois: 'Emplois',
  emploisCites: 'Ces crans sont ceux que les composants citent, dans toutes les marques.',
  etats: 'États',
  alertes: 'Alertes',
  aucuneAlerte: 'Aucune alerte.',
  legende: 'Légende',
  specimen: 'Aa Libellé',
  tenu: 'tenu',
  manque: 'manqué',
  colonnes: ['Emploi', 'Usage', 'Cran', 'Spécimen', 'Contraste', 'Seuil', 'Verdict'],
  mode: { light: 'Light', dark: 'Dark' },
  usage: {
    solid: 'Fond plein d’un bouton, d’un badge',
    'on-solid': 'Texte posé sur ce fond',
    text: 'Texte coloré sur le fond de page',
    surface: 'Fond teinté discret',
    'border-control': 'Contour d’un champ, d’une case',
    'border-decorative': 'Séparateur, filet',
    focus: 'Anneau de focus, décalé du contrôle',
  },
} as const;

const ESPACES: Record<ProfilDuDocumentEcrit, string> = { SRGB: 'sRGB', DISPLAY_P3: 'Display P3', LEGACY: 'profil non géré' };
type ProfilDuDocumentEcrit = 'SRGB' | 'DISPLAY_P3' | 'LEGACY';

/** La ligne d'en-tête d'un cadre ([PLA-07]). */
export function enTeteDuCadre(version: number, empreinte: string, profil: ProfilDuDocumentEcrit, tenues: number, total: number): string {
  return `recette v${version} · empreinte ${empreinte} · ${ESPACES[profil]} · ${tenues}/${total} promesses`;
}

/** Un seuil tenu, tel que la planche l'écrit ([PLA-12]) : « 4,5 », « 3 », ou un tiret. */
export function seuilTenuEcrit(seuil: number | null): string {
  return seuil === null ? '–' : seuilEcrit(seuil);
}

/** La ligne d'une rangée ([PLA-10]) : le profil et la part de chroma employée. */
export function enTeteDeRangee(profil: string, part: number): string {
  return `${profil}\npart ${ecrireArrondi(part, 2)}`;
}

/** L'en-tête d'une section de mode ([PLA-09]). */
export function enTeteDeSection(mode: Mode, fond: string): string {
  return `${TEXTES_DE_LA_PLANCHE.mode[mode]} · fond de référence ${fond}`;
}

/** Ce qu'une carte de cran écrit sous sa pastille (section 9.3). */
export interface TexteDeCarte {
  readonly nom: string;
  readonly hexa: string;
  readonly L: number;
  readonly C: number;
  readonly H: number;
  readonly fond: number;
  readonly seuilTenu: number | null;
  readonly blanc: number;
  readonly noir: number;
  readonly emplois: readonly EmploiDUnCran[];
  /** Le profil dont ce cran se confond, `null` quand les deux s'écartent ([PLA-15]). */
  readonly confondu: string | null;
}

export function texteDeCarte(carte: TexteDeCarte): string {
  const contraire = carte.blanc >= carte.noir ? `blanc ${ecrireContraste(carte.blanc)}` : `noir ${ecrireContraste(carte.noir)}`;
  return [
    carte.nom,
    carte.hexa,
    `L ${ecrireArrondi(carte.L, 3)}`,
    `C ${ecrireArrondi(carte.C, 3)}`,
    `H ${Math.round(carte.H) % 360}°`,
    `fond ${ecrireContraste(carte.fond)} ${seuilTenuEcrit(carte.seuilTenu)}`,
    contraire,
    carte.emplois.length > 0 ? carte.emplois.map(emploiEcrit).join(' · ') : '',
    carte.confondu ? `≈ ${carte.confondu}` : '',
  ].filter((ligne) => ligne !== '').join('\n');
}

/** Le bloc « Référence » d'un cadre ([PLA-08]). */
export interface TexteDeReference {
  readonly hexa: string;
  readonly L: number;
  readonly C: number;
  readonly H: number;
  readonly part: number;
  readonly ancrage: Ancrage;
  /** Contraste et seuil tenu contre le blanc, le noir, le fond clair et le fond sombre. */
  readonly contrastes: readonly { readonly contre: string; readonly valeur: number; readonly seuil: number | null }[];
}

export function texteDeReference(reference: TexteDeReference): string {
  return [
    reference.hexa,
    `L ${ecrireArrondi(reference.L, 3)} · C ${ecrireArrondi(reference.C, 3)} · H ${Math.round(reference.H) % 360}°`,
    `Intensité : ${ecrireArrondi(reference.part, 2)} · ${(['light', 'dark'] as const).map((mode) => `${TEXTES_DE_LA_PLANCHE.mode[mode]} : ${NOM_DU_PROFIL[reference.ancrage.profil]} · nuance ${reference.ancrage.crans[mode]}`).join(' · ')}`,
    reference.contrastes.map(({ contre, valeur, seuil }) => `${contre} ${ecrireContraste(valeur)} ${seuilTenuEcrit(seuil)}`).join(' · '),
  ].join('\n');
}

/** Les dérives d'un cadre ([PLA-08]) : une ligne par profil, ou une seule quand ils sont liés. */
export function texteDesDerives(palette: Palette): string {
  const { lien, soft, vivid } = palette.derive;
  return lien ? `soft et vivid : ${uneDerive(vivid)}` : `soft : ${uneDerive(soft)}\nvivid : ${uneDerive(vivid)}`;
}

/** Une ligne de paire d'état sous une table d'emplois ([PLA-17]). */
export function ligneDePaire(premier: MembrePaire, second: MembrePaire, contraste: number, seuil: number, tenue: boolean): string {
  const verdictDeLaPaire = tenue ? TEXTES_DE_LA_PLANCHE.tenu : TEXTES_DE_LA_PLANCHE.manque;
  return `${membre(premier)} sur ${membre(second)} · ${ecrireContraste(contraste)} · ${seuilEcrit(seuil)} · ${verdictDeLaPaire}`;
}

/** Le titre d'une table d'emplois : son mode et son profil. */
export function titreDeTable(mode: Mode, profil: string): string {
  return `${TEXTES_DE_LA_PLANCHE.emplois} · ${TEXTES_DE_LA_PLANCHE.mode[mode]} · ${profil}`;
}

/** Une ligne d'alerte de la planche : où, puis quoi. */
export function ligneDAlerte(constat: Constat): string {
  return `${constat.ou} : ${constat.quoi}`;
}

/** La légende d'un cadre ([PLA-11]). */
export function legende(seuils: Recette['seuils'], parts: { soft: number; vivid: number }): string {
  return [
    `Seuils de contraste : texte ${seuilEcrit(seuils.texte)}, non-texte ${seuilEcrit(seuils.nonTexte)}.`,
    `profilsConfondus ${ecrireArrondi(seuils.profilsConfondus, 2)} et palettesProches ${ecrireArrondi(seuils.palettesProches, 2)} sont des paramètres de conception, pas des seuils d’accessibilité.`,
    `Parts de chroma de la recette : soft ${ecrireArrondi(parts.soft, 2)}, vivid ${ecrireArrondi(parts.vivid, 2)}.`,
    'fond : contraste contre le fond de référence du mode, puis le seuil tenu. blanc ou noir : le plus fort des deux.',
  ].join('\n');
}
