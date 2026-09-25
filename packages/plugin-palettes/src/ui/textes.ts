/**
 * Tous les textes que l'interface et la planche montrent au designer (D14).
 * Ils viennent de l'inventaire validé par le mainteneur
 * (`docs/notes/Recherches/Plugin Palettes/INVENTAIRE-TEXTES-ET-PROPOSITIONS.md`) ;
 * un texte que l'inventaire ne portait pas y est ajouté sous un identifiant
 * `N`. Un message a trois parties : où, quoi, geste ([VER-09]).
 *
 * Les clés `soft`, `vivid`, `light`, `dark` et les codes d'emploi restent
 * ceux des données ; seul leur affichage se traduit ici.
 */
import {
  FORMAT_RECETTE,
  ecrireArrondi,
  ecrireContraste,
  niveauxWcag,
  type Alerte,
  type Ancrage,
  type Association,
  type DeriveRangee,
  type Emploi,
  type EmploiDUnCran,
  type EtatDePaire,
  type ManqueDeGarantie,
  type MembrePaire,
  type Mode,
  type NiveauxWcag,
  type Palette,
  type Profil,
  type Recette,
  type Refus,
  type RegleRecette,
} from 'ucm-couleur';

import type { CibleDAction, GroupeDePromesses } from '../presentation';

export const TEXTES = {
  titre: 'UCM Palettes',
  titreConfiguration: 'Réglages communs',
  etiquetteDesOnglets: 'Navigation du plugin',
  ongletPalettes: 'Palettes',
  ongletPlanche: 'Planche',
  lectureEnCours: 'Chargement des palettes et des réglages…',
  recetteAbsente: 'Créez votre première palette. Les réglages par défaut seront utilisés.',
  choisirUnePalette: 'Choisir une palette',
  dessiner: 'Générer sur Figma',
  prete: 'Prête',
  reference: 'Couleur de référence',
  nom: 'Nom de la palette',
  apercu: 'Aperçu des nuances',
  modesDeLApercu: 'Thème de l’aperçu',
  modeClair: 'Thème Light',
  modeSombre: 'Thème Dark',
  titrePromesses: 'Promesses à corriger',
  titreAlertes: 'Points à vérifier',
  titreNotices: 'À savoir',
  nouvellePalette: 'Ajouter une palette',
  creer: 'Créer la palette',
  depuisLaSelection: 'Utiliser la couleur sélectionnée dans Figma',
  annuler: 'Annuler',
  gestesDeLaPalette: 'Actions sur la palette',
  dupliquer: 'Dupliquer la palette',
  monter: 'Déplacer vers le haut',
  descendre: 'Déplacer vers le bas',
  supprimer: 'Supprimer la palette',
  recharger: 'Recharger les palettes',
  selectionVide: 'Sélectionnez un calque dans Figma pour récupérer sa couleur.',
  selectionSansRemplissage: 'Sélectionnez un calque avec une couleur de remplissage unie, visible et sans transparence.',
  detailTechnique: 'Détail technique',
  ouvrirLesReglages: 'Ouvrir les réglages communs',
  reglagesCommuns: 'Réglages communs',
  retour: 'Retour aux palettes et à la planche',
} as const;

/** Le titre de premier rang de l'onglet Palettes et les titres de ses cartes (N026, N027). */
export const TEXTES_DE_L_ONGLET = {
  titre: 'Configuration de la palette',
  couleurDeBase: 'Couleur de base',
  apercu: 'Aperçu',
  garanties: 'Garanties de contraste',
  intensites: 'Intensités',
  derive: 'Dérive de teinte',
  generation: 'Génération',
} as const;

/** Le titre d'un groupe de messages et son nombre ([VER-14]) : « Promesses à corriger · 2 ». */
export function titreDeGroupe(titre: string, nombre: number): string {
  return `${titre} · ${nombre}`;
}

/** Le libellé du lien qu'un message pose vers un réglage ([VER-15]). */
export const LIBELLES_DES_CIBLES: Record<CibleDAction, string> = {
  reference: 'Couleur de référence',
  'intensites-palette': 'Intensités de la palette',
  derive: 'Dérive de teinte',
  'luminosite-commune': 'Luminosité des nuances',
  fonds: 'Couleurs de fond',
  'intensites-communes': 'Intensités communes',
};

/** Les libellés des Réglages communs (section 8.3), dans l'ordre du panneau. */
export const TEXTES_DE_CONFIGURATION = {
  courbes: 'Luminosité des nuances',
  cran: 'Nuance',
  clair: 'Thème Light',
  sombre: 'Thème Dark',
  parts: 'Intensités',
  seuilProfilsConfondus: 'Écart minimal entre soft et vivid',
  fonds: 'Couleurs de fond',
  fondDuMode: { light: 'Fond du thème Light', dark: 'Fond du thème Dark' },
  seuilsDeContraste: 'Minimums des promesses',
  seuilTexte: 'Texte',
  seuilNonTexte: 'Éléments graphiques',
  couleursProches: 'Détection des couleurs proches',
  seuilPalettesProches: 'Écart minimal entre deux palettes',
  seuilChromaGrise: 'Seuil de détection du gris (chroma)',
  sansRecette: 'Les palettes et les réglages enregistrés sont illisibles. Importez une sauvegarde valide pour accéder aux réglages.',
  aideParts: 'Une valeur proche de 0 produit des nuances plus grises. Une valeur proche de 1 utilise davantage la couleur disponible.',
  aideCourbes: 'Réglez la luminosité de chaque nuance entre 0 et 1. Les changements s’appliquent à toutes les palettes.',
  aideEcarts: 'Ce seuil déclenche un signalement lorsque les couleurs sont trop proches. Augmentez-le pour signaler davantage de ressemblances. Unité : ΔEok, la distance entre deux couleurs dans l’espace Oklab.',
  aideMinimums: 'Ces valeurs définissent les contrastes minimums de vos promesses. Les modifier change leur résultat, sans modifier les couleurs ni les niveaux WCAG.',
  aideGris: 'En dessous de cette valeur de chroma, la couleur est considérée comme presque grise. Le réglage de dérive de teinte est alors désactivé.',
  retablir: 'Rétablir',
  // N059 : la garantie des courbes ne remplace pas celles des palettes (V9.4).
  garantieCommune: 'Cette vérification porte sur les courbes communes, pour toutes les teintes. Les garanties d’une palette se lisent dans sa carte « Garanties de contraste ».',
  // N060 : « Rétablir » des courbes, quand la liste des nuances a changé par import.
  courbesSansDefaut: 'Ces réglages n’ont pas les onze nuances par défaut : les courbes par défaut ne s’y appliquent pas.',
  // N061 : les unités des mesures avancées (V9.8).
  uniteDeContraste: ':1',
  uniteDEcart: 'ΔEok',
  uniteDeChroma: 'chroma',
} as const;

/** La tête des Réglages communs : la palette ouverte et le thème de son aperçu (V9.3, N055). */
export function paletteDeLApercu(nom: string, mode: Mode): string {
  return `Palette ouverte : ${nom} · ${mode === 'light' ? 'Thème Light' : 'Thème Dark'}`;
}

/** La légende du tracé des courbes (V9.4, N056). */
export function legendeDesCourbes(reference: { readonly nom: string; readonly crans: { readonly [M in Mode]: number } } | null): string {
  const traits = 'Trait plein : Thème Light · tireté : Thème Dark.';
  if (!reference) return traits;
  return `${traits} ◆ : la référence de « ${reference.nom} », insérée à la nuance ${reference.crans.light} en Thème Light et ${reference.crans.dark} en Thème Dark, à sa propre luminosité.`;
}

/** Le résumé replié de la carte « Minimums des promesses » (V9.2, N057). */
export function resumeDesMinimums(texte: number, nonTexte: number): string {
  return `Texte ${nombreEcrit(texte)}:1 · Éléments graphiques ${nombreEcrit(nonTexte)}:1`;
}

/** Le résumé replié de la carte « Détection des couleurs proches » (V9.2, N057). */
export function resumeDesEcarts(profilsConfondus: number, palettesProches: number, chromaGrise: number): string {
  return `Soft et Vivid ${nombreEcrit(profilsConfondus)} · Deux palettes ${nombreEcrit(palettesProches)} · Gris ${nombreEcrit(chromaGrise)}`;
}

/** Le nom accessible de « Rétablir », qui nomme la carte (V9.5, N058). */
export function retablirLaCarte(titre: string): string {
  return `Rétablir les valeurs par défaut : ${titre}`;
}

/** La portée d'un groupe de réglages, avant toute saisie ([ENT-07]). */
export function palettesConcernees(nombre: number): string {
  if (nombre === 0) return 'Aucune palette concernée';
  return nombre === 1 ? '1 palette concernée' : `${nombre} palettes concernées`;
}

/** Un nombre tel que les réglages l'affichent, à virgule. */
export function nombreEcrit(valeur: number): string {
  return String(valeur).replace('.', ',');
}

/** Une saisie qui n'est pas un nombre. */
export function nombreInvalide(saisie: string): string {
  return `Saisissez un nombre, par exemple 0,5 ou 0.5. « ${saisie} » n’est pas accepté.`;
}

/** Un contraste mesuré avec son unité : « 4,31:1 ». */
export function contrasteEcrit(valeur: number): string {
  return `${ecrireContraste(valeur)}:1`;
}

/** Un seuil de contraste : « 4,5 », « 3 ». */
const seuilEcrit = (valeur: number): string => ecrireArrondi(valeur, 1).replace(/,0$/, '');

/** La courbe qui ne tient plus la garantie des courbes ([ENT-10]). */
export function constatDeGarantie(manque: ManqueDeGarantie): Constat {
  return {
    ou: `Thème ${NOM_DU_MODE[manque.mode]}, nuance ${manque.cran}, profil ${manque.profil}`,
    quoi: `Cette courbe donne un contraste de ${contrasteEcrit(manque.contraste)} avec la nuance 50 pour une teinte de ${manque.teinte}°. Le minimum demandé est de ${seuilEcrit(manque.seuil)}:1.`,
    geste: `Augmentez l’écart de luminosité entre les nuances ${manque.cran} et 50. Si vous conservez ces valeurs, vérifiez les contrastes de chaque palette.`,
  };
}

/** Les réglages propres à une palette (section 8.1, [ENT-09]). */
export const TEXTES_AVANCES = {
  avance: 'Réglages de cette palette',
  partDuProfil: { soft: 'Intensité de la palette Soft', vivid: 'Intensité de la palette Vivid' },
  reprendre: 'Utiliser les réglages communs pour l’intensité',
} as const;

/** Les intensités sous le nuancier (section 8.1). */
export const TEXTES_DES_INTENSITES = {
  libelle: (profil: string) => `Intensité ${profil}`,
  repere: (part: string) => `Intensité de la couleur de référence : ${part}`,
  detailDeLaReference: 'Intensité de la couleur de référence',
} as const;

/** D'où viennent les intensités qu'une palette emploie ; une intensité grise est visible (D-G). */
export function origineDesParts(origine: 'designer' | 'grise' | undefined, base: Profil | undefined, parts: { soft: number; vivid: number }): string {
  if (origine === 'designer') return 'Cette palette utilise ses propres intensités. Les changements d’intensité dans les réglages communs ne s’y appliquent plus.';
  if (origine === 'grise') return `La couleur de référence est presque grise. Les profils soft et vivid utilisent tous les deux son intensité : ${nombreEcrit(parts.soft)}.`;
  if (base) {
    const autre: Profil = base === 'soft' ? 'vivid' : 'soft';
    return `Palette de base ${NOM_DU_PROFIL[base]} : ${NOM_DU_PROFIL[base]} utilise l’intensité de la couleur de référence, ${nombreEcrit(parts[base])}. ${NOM_DU_PROFIL[autre]} suit les réglages communs, sans dépasser cette limite.`;
  }
  return 'Les intensités de cette palette suivent les réglages communs.';
}

/** Le choix de la palette de base, dans la carte Couleur de base (N028, N029, [UI-11]). */
export const TEXTES_DE_LA_BASE = {
  libelle: 'Palette de base',
  auto: 'Auto',
  choixAutomatique: (profil: Profil) => `Auto a choisi ${NOM_DU_PROFIL[profil]}`,
} as const;

/** Les libellés de l'éditeur de dérive (section 12). */
export const TEXTES_DE_LA_DERIVE = {
  regler: 'Configuration de la dérive',
  grisDesactive: 'Le réglage de teinte est désactivé pour cette couleur presque grise. Choisissez une couleur plus saturée pour l’utiliser.',
  sansSegmentClair: 'La couleur de référence est plus claire que toutes les nuances. Seul le réglage de teinte du côté sombre est disponible.',
  sansSegmentSombre: 'La couleur de référence est plus sombre que toutes les nuances. Seul le réglage de teinte du côté clair est disponible.',
  prereglage: 'Dérive de teinte',
  tailwind: 'Tailwind',
  constante: 'Teinte constante',
  libre: 'Personnalisée',
  lien: 'Synchroniser la dérive de soft et vivid',
  profilRegle: 'Profil à modifier',
  aligner: 'Appliquer à soft',
  annuler: 'Annuler',
  confirmationDuLien: 'La dérive de teinte de vivid sera appliquée à soft. Les deux profils partageront ensuite les mêmes réglages.',
  bout: { clair: 'Nuances claires', sombre: 'Nuances sombres' },
  deriveAuBout: { clair: 'Décalage de teinte des nuances claires', sombre: 'Décalage de teinte des nuances sombres' },
  ramenerAuPrereglage: { clair: 'Rétablir la dérive Tailwind des nuances claires', sombre: 'Rétablir la dérive Tailwind des nuances sombres' },
} as const;

/** Ce qu'une poignée annonce au lecteur d'écran ([DER-09]) : l'angle et la teinte absolue. */
export function valeurDePoignee(angle: number, teinte: number): string {
  return `Décalage de ${angleEcrit(angle)}, teinte obtenue : ${Math.round(teinte) % 360}°`;
}

/** Le repère Tailwind d'une réglette ([DER-06]). */
export function repereTailwind(angle: number): string {
  return `Décalage Tailwind : ${angleEcrit(angle)}`;
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
  return `Décalage ${angleEcrit(angle)} · teinte ${Math.round(teinte) % 360}°`;
}

/** L'infobulle du pivot ([DER-02]) : la teinte de la référence, et la nuance qui la porte dans chaque thème. */
export function infobulleDuPivot(teinte: number, ancrage: Ancrage): string {
  return `Couleur de référence : teinte ${Math.round(teinte) % 360}°. ${NOM_DU_PROFIL[ancrage.profil]} · nuance ${ancrage.crans.light} en Thème Light, ${ancrage.crans.dark} en Thème Dark.`;
}

/** L'indication discrète d'enregistrement, au rang 3 (D-D). */
export const STATUTS_DU_RANGEMENT = {
  lu: '',
  'en-cours': 'Enregistrement…',
  range: 'Enregistré',
  refuse: 'Non enregistré',
  invalide: 'Non enregistré',
} as const;

/** Le nom d'une copie de palette. */
export function nomDeLaCopie(nom: string): string {
  return `Copie de ${nom}`;
}

/** Un hexa que le champ refuse : il le dit sous le champ, l'aperçu ne change pas. */
export function hexaInvalide(saisie: string): string {
  return `Saisissez un code couleur à 6 caractères, par exemple #1E6FD9. « ${saisie} » n’est pas accepté.`;
}

/** La confirmation d'une suppression ([ENT-03]). */
export function confirmationDeSuppression(nom: string): string {
  return `La palette « ${nom} » sera supprimée du plugin. Sa présentation restera sur la planche, mais vous ne pourrez plus la mettre à jour.`;
}

/**
 * Le refus d'un enregistrement : les palettes et réglages enregistrés ont
 * changé depuis leur lecture ([REC-10]). Le plugin ne sait pas qui les a
 * changés.
 */
export function recetteModifieeAilleurs(): Constat {
  return {
    ou: 'Modifications non enregistrées',
    quoi: 'Les palettes ou les réglages du fichier ont changé depuis leur chargement. Votre dernière modification n’a pas été enregistrée.',
    geste: 'Rechargez les palettes pour récupérer la version du fichier. Vous perdrez la modification non enregistrée.',
  };
}

/** Un enregistrement que le sandbox refuse pour une recette invalide : l'interface en est la cause. */
export function rangementInvalide(refus: readonly Refus[]): Constat {
  return {
    ou: 'Échec de l’enregistrement',
    quoi: refus.length > 0
      ? `Le plugin n’a pas pu enregistrer votre modification. Détail : ${texteDuRefus(refus[0])}`
      : 'Le plugin n’a pas pu enregistrer votre modification.',
    geste: 'Rechargez les palettes, puis refaites votre modification.',
  };
}

/** La couleur d'une sélection ramenée dans le gamut sRGB (E10). */
export function couleurRamenee(hexa: string): Constat {
  return {
    ou: `Couleur de référence convertie : ${hexa}`,
    quoi: 'Cette couleur Display P3 dépasse les couleurs disponibles en sRGB. Le plugin l’a ajustée pour créer une palette en sRGB.',
    geste: 'Vérifiez la couleur obtenue. Si elle ne convient pas, choisissez une autre couleur de référence.',
  };
}

/** Le nom qu'une palette affiche : son nom, ou son hexa de référence. */
export function nomDeLaPalette(palette: Palette): string {
  return palette.nom?.trim() ? palette.nom : palette.reference;
}

/** Le verdict d'une palette ([VER-07]) : « Prête » quand tout est respecté, sinon le nombre à corriger. */
export function verdict(manquees: number): string {
  if (manquees === 0) return TEXTES.prete;
  return manquees === 1 ? '1 promesse à corriger' : `${manquees} promesses à corriger`;
}

/** Le bilan des promesses respectées sur le total évalué ([VER-07], [PLA-07]). */
export function bilanDesPromesses(respectees: number, total: number): string {
  return `${respectees}/${total} promesses respectées`;
}

const NOM_DU_MODE: Record<Mode, string> = { light: 'Light', dark: 'Dark' };

/** Le nom d'affichage d'un profil ; la clé `soft` ou `vivid` reste celle des données. */
export const NOM_DU_PROFIL: Record<Profil, string> = { soft: 'Soft', vivid: 'Vivid' };

/** Le profil et la nuance qui portent la référence exacte dans un mode ([MOT-17]). */
export function ligneDeLaReference(ancrage: Ancrage, mode: Mode): string {
  return `Référence : ${NOM_DU_PROFIL[ancrage.profil]} · nuance ${ancrage.crans[mode]}`;
}

const ORIGINES: Record<DeriveRangee['origine'], string> = { tailwind: 'Tailwind', constante: 'Teinte constante', libre: 'Personnalisée' };

function uneDerive(derive: DeriveRangee): string {
  return `${ORIGINES[derive.origine]} · nuances claires : ${angleEcrit(derive.clair)} · nuances sombres : ${angleEcrit(derive.sombre)}`;
}

/** Le nombre de points à vérifier qu'une carte repliée annonce ([UI-12]). */
function pointsAVerifier(nombre: number): string {
  if (nombre === 0) return '';
  return nombre === 1 ? ' · 1 point à vérifier' : ` · ${nombre} points à vérifier`;
}

const ORIGINE_DES_INTENSITES: Record<'communes' | 'designer' | 'grise', string> = {
  communes: 'Communes',
  designer: 'Propres',
  grise: 'Presque grise',
};

/**
 * Le résumé de la carte Intensités (N040) : leur origine, les deux intensités,
 * puis les points à vérifier. Une palette de base forcée sans intensités
 * propres se nomme par sa base.
 */
export function resumeDesIntensites(origine: 'designer' | 'grise' | undefined, base: Profil | undefined, parts: { soft: number; vivid: number }, points: number): string {
  const nom = !origine && base ? `Palette de base ${NOM_DU_PROFIL[base]}` : ORIGINE_DES_INTENSITES[origine ?? 'communes'];
  return `${nom} · Soft ${nombreEcrit(parts.soft)} · Vivid ${nombreEcrit(parts.vivid)}${pointsAVerifier(points)}`;
}

/** Le résumé de la carte Dérive de teinte (N041) : le préréglage et la synchronisation. */
export function resumeDeLaDerive(palette: Palette, grise: boolean, points: number): string {
  if (grise) return 'Désactivée pour une couleur presque grise';
  const { lien, soft, vivid } = palette.derive;
  const reglage = lien ? `${ORIGINES[vivid.origine]} · synchronisée` : `Soft ${ORIGINES[soft.origine]} · Vivid ${ORIGINES[vivid.origine]} · désynchronisée`;
  return `${reglage}${pointsAVerifier(points)}`;
}

/** Le nom français d'un rôle, sous son nom en police de code (N030) ; la clé reste celle des données. */
export const NOM_DU_ROLE: Record<Emploi, string> = {
  solid: 'fond plein',
  'on-solid': 'texte sur fond plein',
  text: 'texte coloré',
  surface: 'fond léger',
  'border-control': 'bordure de champ',
  'border-decorative': 'séparateur',
  focus: 'anneau de focus',
};

/** Le nom d'un emploi en une phrase, son identifiant entre parenthèses : « Fond plein (solid) ». */
export const NOM_DE_L_EMPLOI = Object.fromEntries(
  (Object.keys(NOM_DU_ROLE) as Emploi[]).map((emploi) => [emploi, `${NOM_DU_ROLE[emploi][0].toUpperCase()}${NOM_DU_ROLE[emploi].slice(1)} (${emploi})`]),
) as Record<Emploi, string>;

/** L'état d'une paire, sous son spécimen (N033). */
export const NOM_DE_L_ETAT: Record<EtatDePaire, string> = { 0: 'repos', 1: 'survol', 2: 'appui' };

/** Le résultat d'un profil (N035) : « Vivid ✓ », « Vivid ✗ 2 ». */
export function resultatDuProfil(profil: Profil, manquees: number): string {
  return manquees === 0 ? `${NOM_DU_PROFIL[profil]} ✓` : `${NOM_DU_PROFIL[profil]} ✗ ${manquees}`;
}

/** Le même résultat, pour l'assistance technique ([UI-09]). */
export function resultatDuProfilEnMots(profil: Profil, manquees: number): string {
  if (manquees === 0) return `${NOM_DU_PROFIL[profil]} : toutes les garanties sont respectées`;
  return manquees === 1 ? `${NOM_DU_PROFIL[profil]} : 1 garantie manquée` : `${NOM_DU_PROFIL[profil]} : ${manquees} garanties manquées`;
}

/** Les textes de la carte « Garanties de contraste » ([UI-09], N031 à N038). */
export const TEXTES_DES_GARANTIES = {
  theme: (mode: Mode) => `Thème ${NOM_DU_MODE[mode]}`,
  profils: 'Profil des garanties',
  textes: 'Textes lisibles',
  visibles: 'Éléments visibles',
  minimum: (seuil: number) => `minimum ${seuilEcrit(seuil)}:1`,
  sur: 'sur',
  fond: 'fond',
  legende: 'Trait plein : repos · tireté : survol · pointillé : appui. L’état avance d’une nuance, texte et fond ensemble.',
  onSolid: 'on-solid est le fond de page du thème, neutral.50 du design system.',
  decoratif: (numero: number) => `${numero} · séparateur, sans minimum de contraste`,
  specimenBouton: 'Bouton',
  specimenTexte: 'Texte',
  autreTheme: (mode: Mode, nombre: number) => (nombre === 1
    ? `Thème ${NOM_DU_MODE[mode]} : 1 garantie manquée`
    : `Thème ${NOM_DU_MODE[mode]} : ${nombre} garanties manquées`),
  voirLeTheme: (mode: Mode) => `Voir le thème ${NOM_DU_MODE[mode]}`,
  echec: (etat: EtatDePaire, contraste: number, seuil: number) =>
    `${NOM_DE_L_ETAT[etat][0].toUpperCase()}${NOM_DE_L_ETAT[etat].slice(1)} : ${contrasteEcrit(contraste)} pour un minimum de ${seuilEcrit(seuil)}:1`,
  numeros: (premier: string, second: string) => `${premier} / ${second}`,
  resultat: (tenue: boolean, contraste: number) => `${tenue ? '✓' : '✗'} ${ecrireContraste(contraste)}`,
  voirLesGaranties: 'Voir les garanties',
  bilan: (soft: string, vivid: string) => `Garanties : ${soft} · ${vivid}`,
} as const;

/** Les textes du détail d'une nuance ([UI-10], N039). */
export const TEXTES_DU_DETAIL = {
  titre: (profil: Profil, numero: number) => `${NOM_DU_PROFIL[profil]} · ${numero}`,
  reference: '◆ Votre couleur de référence exacte',
  sertA: 'Sert à',
  nuanceLibre: 'Nuance libre : aucun usage prévu',
  mesures: 'Mesures détaillées',
  titreDuFond: 'on-solid · fond du thème',
  fondDePage: (debut: number, fin: number) => `Fond de page du thème, neutral.50 du design system. Il se pose en texte sur solid ${debut} à ${fin}.`,
  garantie: (tenue: boolean, sens: string, contraste: number) => `${tenue ? '✓' : '✗'} ${sens} : ${contrasteEcrit(contraste)}`,
  sur: (partenaire: string) => `sur ${partenaire}`,
  dessus: (partenaire: string) => `${partenaire} dessus`,
} as const;

/** Les textes du nuancier et de son détail ([UI-04]). */
export const TEXTES_DU_NUANCIER = {
  fond: 'Fond',
  modifier: 'Modifier',
  reference: 'Référence',
  copier: 'Copier le code',
  copie: 'Code copié',
  etiquetteDeNuance: (profil: string, numero: number, hexa: string) => `Profil ${profil}, nuance ${numero}, couleur ${hexa}`,
  memeCouleur: (numero: number) => `Même couleur que la nuance ${numero}.`,
  avecLeFond: (valeur: string) => `Contraste avec le fond : ${valeur}`,
  avecLeBlanc: (valeur: string) => `Avec le blanc : ${valeur}`,
  avecLeNoir: (valeur: string) => `Avec le noir : ${valeur}`,
  tresProche: (profil: string) => `Très proche de ${profil}`,
  oklch: (L: number, C: number, H: number) => `Luminosité L : ${ecrireArrondi(L, 3)} · chroma C : ${ecrireArrondi(C, 3)} · teinte H : ${Math.round(H) % 360}°`,
  revenirAuTheme: (mode: Mode) => `Revenir au thème ${NOM_DU_MODE[mode]}`,
  fondCourt: 'fond',
  etiquetteDuFond: (hexa: string) => `on-solid, fond du thème, couleur ${hexa}`,
} as const;

const ETATS_DU_DECALAGE = ['', ' au survol', ' à l’appui'];

/** Un emploi et son état : « Texte coloré (text) au survol ». */
export function emploiEcrit({ emploi, decalage }: EmploiDUnCran): string {
  return `${NOM_DE_L_EMPLOI[emploi]}${ETATS_DU_DECALAGE[decalage] ?? ` (décalage de ${decalage} nuances)`}`;
}

function membre(membrePaire: MembrePaire): string {
  return 'fond' in membrePaire ? 'fond de page' : emploiEcrit(membrePaire);
}

/** Une association et son état : « Texte coloré (text) sur Fond léger (surface) au survol ». */
export function associationEcrite(association: Association, etat: EtatDePaire): string {
  const second = association.second === 'fond' ? 'fond de page' : NOM_DE_L_EMPLOI[association.second];
  return `${NOM_DE_L_EMPLOI[association.premier]} sur ${second}${ETATS_DU_DECALAGE[etat]}`;
}

/** Les niveaux WCAG d'un contraste, en mots ([VER-13]). */
export function niveauxEcrits(niveaux: NiveauxWcag): string {
  const texte = niveaux.texte ?? 'Insuffisant';
  const grand = niveaux.grandTexte === 'AA' ? ' · AA grand texte' : '';
  const graphique = niveaux.graphique ? 'Minimum 3:1 atteint' : 'Minimum 3:1 non atteint';
  return `Texte courant : ${texte}${grand} · éléments graphiques : ${graphique}`;
}

/** Un message qui montre aussi des mesures, une par ligne, ou un détail technique replié. */
export interface ConstatIllustre extends Constat {
  /** Une mesure par profil : « Vivid : 4,31:1 · À corriger ». */
  readonly mesures?: readonly string[];
  /** Un texte technique, l'erreur de Figma par exemple, montré replié sous le message. */
  readonly detail?: string;
}

/**
 * Un groupe de promesses manquées ([VER-06]) : l'association, le thème et
 * l'état, puis le résultat de chaque profil et le minimum demandé.
 */
export function constatDeGroupe(groupe: GroupeDePromesses, nom: string): ConstatIllustre {
  const resultat = (profil: Profil) => {
    const promesse = groupe[profil];
    return `${NOM_DU_PROFIL[profil]} : ${contrasteEcrit(promesse.contraste)} · ${promesse.verdict === 'tenue' ? 'Respectée' : 'À corriger'}`;
  };
  return {
    ou: `${associationEcrite(groupe.association, groupe.etat)} · ${nom}, thème ${NOM_DU_MODE[groupe.mode]}`,
    quoi: `Cette association n’atteint pas le contraste demandé, pour un minimum de ${seuilEcrit(groupe.seuil)}:1.`,
    geste: 'Ajustez l’intensité ou la dérive de teinte de cette palette, puis vérifiez cette association. Le réglage de luminosité est disponible dans les réglages communs.',
    mesures: [resultat('soft'), resultat('vivid')],
  };
}

/** Ce que la mise en mots d'une alerte lit de la recette. */
export interface ContexteDAlerte {
  readonly recette: Recette;
  readonly nomDe: (id: string) => string;
}

const referenceLue = (contexte: ContexteDAlerte, id: string): string =>
  contexte.recette.palettes.find((palette) => palette.id === id)?.reference ?? '';

/**
 * Une alerte de la section 11.3. Le titre et l'action ne portent aucune
 * mesure : la mesure et son unité se lisent dans `mesures`.
 */
export function constatDAlerte(alerte: Alerte, contexte: ContexteDAlerte): ConstatIllustre {
  switch (alerte.code) {
    case 'profils-confondus': {
      const plusProche = Math.min(...alerte.crans.map((cran) => cran.distance));
      const crans = alerte.crans.map((cran) => `${NOM_DU_MODE[cran.mode]} ${cran.cran}`).join(', ');
      return {
        ou: `${contexte.nomDe(alerte.palette)} : nuances ${crans}`,
        quoi: 'Les couleurs soft et vivid sont très proches sur ces nuances.',
        geste: 'Augmentez l’écart entre les intensités de soft et vivid. Utilisez les réglages de cette palette si elle a ses propres intensités, sinon les réglages communs.',
        mesures: [`Écart le plus faible : ${ecrireArrondi(plusProche, 3)} ΔEok, pour un minimum de ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    }
    case 'palettes-proches':
      return {
        ou: `Palettes à comparer : ${contexte.nomDe(alerte.palettes[0])} et ${contexte.nomDe(alerte.palettes[1])}`,
        quoi: 'Les nuances vivid 500, 600 et 700 de ces deux palettes sont très proches dans le thème Light.',
        geste: 'Si ces palettes doivent être distinctes, modifiez leur couleur de référence. Vous pouvez aussi supprimer celle qui fait doublon.',
        mesures: [`Écart moyen : ${ecrireArrondi(alerte.distance, 3)} ΔEok, pour un minimum de ${ecrireArrondi(alerte.seuil, 2)} ΔEok`],
      };
    case 'couleur-presque-grise':
      return {
        ou: `${contexte.nomDe(alerte.palette)} : couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Cette couleur est presque grise. Le réglage de teinte est désactivé et les deux profils reprennent son intensité. Chroma : ${ecrireArrondi(alerte.chroma, 3)}, sous le seuil de ${ecrireArrondi(alerte.seuil, 2)}.`,
        geste: 'Choisissez une couleur de référence plus saturée pour obtenir des nuances plus colorées.',
      };
    case 'reference-plus-terne':
      return {
        ou: `${contexte.nomDe(alerte.palette)} : couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Les nuances produites autour de votre couleur de référence utilisent une intensité plus élevée. Intensité de référence : ${ecrireArrondi(alerte.part, 2)} ; soft : ${ecrireArrondi(alerte.partSoft, 2)}.`,
        geste: 'Réduisez les intensités dans « Réglages de cette palette » pour vous rapprocher de la couleur de référence.',
      };
    case 'reference-plus-vive':
      return {
        ou: `${contexte.nomDe(alerte.palette)} : couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `Les nuances vivid produites autour de votre couleur de référence utilisent une intensité plus faible. Intensité de référence : ${ecrireArrondi(alerte.part, 2)} ; vivid : ${ecrireArrondi(alerte.partVivid, 2)}.`,
        geste: 'Augmentez l’intensité de vivid dans « Réglages de cette palette » pour vous rapprocher de la couleur de référence.',
      };
    case 'reference-hors-rampe':
      return {
        ou: `${contexte.nomDe(alerte.palette)} : couleur de référence ${referenceLue(contexte, alerte.palette)}`,
        quoi: `La luminosité de départ (${ecrireArrondi(alerte.clarte, 3)}) est en dehors de la plage des nuances (${ecrireArrondi(alerte.boutSombre, 3)} à ${ecrireArrondi(alerte.boutClair, 3)}). Vous pouvez régler la teinte d’un seul côté.`,
        geste: 'Utilisez le réglage encore disponible. Pour régler les deux côtés, choisissez une couleur de référence dont la luminosité se situe dans cette plage.',
      };
    case 'fond-hors-courbe': {
      const sens = alerte.mode === 'light' ? 'plus sombre' : 'plus clair';
      return {
        ou: `Fond du thème ${NOM_DU_MODE[alerte.mode]} : ${contexte.recette.fonds[alerte.mode]}`,
        quoi: `Ce fond est ${sens} que la nuance 50. Les promesses doivent être vérifiées avec ce fond. Luminosité : ${ecrireArrondi(alerte.clarte, 3)}, contre ${ecrireArrondi(alerte.cran, 3)}.`,
        geste: 'Vérifiez les contrastes calculés avec votre fond. S’ils sont insuffisants, rapprochez sa luminosité de celle de la nuance 50 dans les réglages communs.',
      };
    }
  }
}

/** Le nombre de palettes que le fichier porte. */
export function palettesDuFichier(nombre: number): string {
  if (nombre === 0) return 'Ce fichier ne contient aucune palette.';
  return nombre === 1 ? 'Ce fichier contient 1 palette.' : `Ce fichier contient ${nombre} palettes.`;
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

const rangEcrit = (rang: number): string => (rang === 0 ? '1re' : `${rang + 1}e`);

const MODES: Record<string, string> = { light: 'du thème Light', dark: 'du thème Dark' };
const FONDS: Record<string, string> = { light: 'Fond du thème Light', dark: 'Fond du thème Dark' };
const CLES_DE_PALETTE: Record<string, string> = {
  id: 'identifiant de la palette',
  nom: 'nom de la palette',
  reference: 'couleur de référence',
  derive: 'dérive de teinte',
  parts: 'intensités personnalisées',
  base: 'palette de base',
  clair: 'côté clair',
  sombre: 'côté sombre',
  lien: 'liaison des teintes',
  origine: 'origine du réglage',
};
const NOMS_DES_SEUILS: Record<string, string> = {
  texte: 'texte',
  nonTexte: 'éléments graphiques',
  profilsConfondus: 'écart minimal entre soft et vivid',
  palettesProches: 'écart minimal entre deux palettes',
  chromaGrise: 'détection du gris',
};

/**
 * Le chemin d'un champ en mots du designer : `crans[3]` devient « 4e nuance »,
 * `palettes[1].derive.soft.clair` « Palette 2, dérive de teinte, soft, côté
 * clair ». Un chemin que la table ne connaît pas s'écrit tel quel.
 */
export function nommerChamp(chemin: string): string {
  if (chemin === '') return 'Palettes et réglages';
  let trouve = /^crans\[(\d+)\]$/.exec(chemin);
  if (trouve) return `${rangEcrit(Number(trouve[1]))} nuance`;
  trouve = /^courbes\.(light|dark)(?:\[(\d+)\])?$/.exec(chemin);
  if (trouve) return `Luminosité ${MODES[trouve[1]]}${trouve[2] ? `, ${rangEcrit(Number(trouve[2]))} nuance` : ''}`;
  trouve = /^profils\.(soft|vivid)\.part$/.exec(chemin);
  if (trouve) return `Intensité de ${trouve[1]}`;
  trouve = /^fonds\.(light|dark)$/.exec(chemin);
  if (trouve) return FONDS[trouve[1]];
  trouve = /^seuils\.(\w+)$/.exec(chemin);
  if (trouve) return `Minimum ou seuil : ${NOMS_DES_SEUILS[trouve[1]] ?? trouve[1]}`;
  trouve = /^derives\[(\d+)\]$/.exec(chemin);
  if (trouve) return `Préréglage Tailwind, gamme ${Number(trouve[1]) + 1}`;
  trouve = /^palettes\[(\d+)\]((?:\.\w+)*)$/.exec(chemin);
  if (trouve) {
    const suite = trouve[2].split('.').filter(Boolean).map((cle) => CLES_DE_PALETTE[cle] ?? cle);
    return [`Palette ${Number(trouve[1]) + 1}`, ...suite].join(', ');
  }
  const connus: Record<string, string> = {
    crans: 'Numéros des nuances',
    profils: 'Intensités des profils',
    gamut: 'Espace de couleur',
    formatVersion: 'Version du format de sauvegarde',
    derives: 'Préréglage Tailwind',
    palettes: 'Palettes',
  };
  return connus[chemin] ?? chemin;
}

/** Le texte d'un refus de validation, où et quoi sur la même ligne. */
const REFUS: Record<RegleRecette, (champ: string, valeur: string) => string> = {
  forme: (champ) => `${champ} : une valeur manque ou son format n’est pas reconnu.`,
  'cle-inconnue': (champ) => `${champ} : ce réglage n’est pas reconnu par cette version du plugin.`,
  'crans-croissants': (_, valeur) => (valeur
    ? `Nuances : le numéro ${valeur} n’est pas valide. Utilisez des nombres entiers, sans doublon, du plus petit au plus grand.`
    : 'Ajoutez au moins deux numéros de nuance et classez-les du plus petit au plus grand.'),
  'courbes-longueur': (champ, valeur) => `${champ} contient ${valeur} valeurs. Indiquez une valeur de luminosité pour chaque nuance.`,
  'courbes-bornes': (champ, valeur) => `${champ} : saisissez une luminosité entre 0 et 1. Valeur reçue : ${valeur}.`,
  'courbe-claire-decroissante': (champ, valeur) => `${champ} : la luminosité doit être inférieure à celle de la nuance précédente. Valeur reçue : ${valeur}.`,
  'courbe-sombre-croissante': (champ, valeur) => `${champ} : la luminosité doit être supérieure à celle de la nuance précédente. Valeur reçue : ${valeur}.`,
  'parts-bornes': (champ, valeur) => `${champ} : saisissez une intensité entre 0 et 1. Valeur reçue : ${valeur}.`,
  'parts-ordre': (champ) => `${champ} : l’intensité de soft doit être inférieure ou égale à celle de vivid.`,
  'gamut-inconnu': (_, valeur) => `L’espace de couleur « ${valeur} » n’est pas pris en charge. Utilisez sRGB.`,
  'hexa-invalide': (champ, valeur) => `${champ} : remplacez « ${valeur} » par un code couleur à 6 caractères, par exemple #1E6FD9.`,
  'seuils-positifs': (champ, valeur) => `${champ} : saisissez un nombre supérieur à 0. Valeur reçue : ${valeur}.`,
  'derives-nombre': (_, valeur) => `Le préréglage Tailwind doit contenir au moins deux gammes de couleurs. Nombre trouvé : ${valeur}.`,
  'derives-noms': (_, valeur) => `Préréglage Tailwind : le nom « ${valeur} » est utilisé deux fois. Donnez un nom différent à chaque gamme.`,
  'derives-teintes': (champ, valeur) => `${champ} : saisissez une teinte entre 0° inclus et 360° exclu. Valeur reçue : ${valeur}°.`,
  'derives-teintes-claires': (_, valeur) => `Préréglage Tailwind : deux gammes utilisent la même teinte côté clair (${valeur}°). Attribuez-leur des teintes différentes.`,
  'derive-bornes': (champ, valeur) => `${champ} : saisissez un décalage entre −90° et +90°. Valeur reçue : ${valeur}°.`,
  'derive-lien': (champ) => `${champ} : soft et vivid sont liés, mais leurs variations de teinte diffèrent. Donnez-leur les mêmes valeurs ou désactivez la liaison.`,
  'origine-inconnue': (champ, valeur) => `${champ} : l’origine « ${valeur} » n’est pas reconnue. Faites vérifier ce champ dans le fichier importé.`,
  'identifiant-forme': (_, valeur) => `L’identifiant de palette « ${valeur} » n’a pas le format attendu. Faites vérifier cet identifiant dans le fichier importé.`,
  'identifiants-uniques': (_, valeur) => `Deux palettes utilisent l’identifiant « ${valeur} ». Attribuez un identifiant différent à chacune dans le fichier importé.`,
  'base-inconnue': (champ, valeur) => `${champ} : « ${valeur} » n’est pas reconnu. Indiquez soft ou vivid, ou retirez ce champ pour le choix automatique. Faites vérifier ce champ dans le fichier importé.`,
  'crans-emplois': (_, valeur) => `La nuance ${valeur} manque. Ajoutez-la : elle est nécessaire aux usages et aux contrastes vérifiés par le plugin.`,
};

/** Le texte d'un refus de [REC-05]. */
export function texteDuRefus(refus: Refus): string {
  return REFUS[refus.regle](nommerChamp(refus.chemin), nombre(refus.valeur));
}

/** Le blocage d'une recette enregistrée par une version plus récente du plugin. */
export function recetteFuture(version: number): Constat {
  return {
    ou: `Sauvegarde au format ${version}`,
    quoi: `Cette sauvegarde nécessite une version plus récente d’UCM Palettes. Votre plugin accepte le format ${FORMAT_RECETTE} et ne peut pas générer la planche.`,
    geste: 'Mettez UCM Palettes à jour. Vous pouvez exporter les données actuelles pour les conserver avant d’importer une autre sauvegarde ou de réinitialiser le plugin.',
  };
}

/** Le nombre d'erreurs d'une validation : plusieurs erreurs peuvent porter sur le même champ. */
const erreursDeValidation = (refus: readonly Refus[]): string =>
  (refus.length === 1 ? '1 erreur de validation' : `${refus.length} erreurs de validation`);

/** Le blocage d'une recette enregistrée que la validation refuse. */
export function recetteIllisible(refus: readonly Refus[]): Constat {
  return {
    ou: 'Palettes et réglages illisibles',
    quoi: `La génération est indisponible : ${erreursDeValidation(refus)}. Première erreur : ${texteDuRefus(refus[0])}`,
    geste: 'Importez une sauvegarde valide. Pour conserver les données actuelles, exportez-les avant de choisir « Réinitialiser les palettes et les réglages ».',
  };
}

/** Les gestes des palettes et réglages en fichier (section 10.1, [REC-11]). */
export const TEXTES_DE_LA_RECETTE = {
  exporter: 'Exporter les palettes et les réglages',
  importer: 'Importer les palettes et les réglages',
  repartir: 'Réinitialiser les palettes et les réglages',
  exporterLeRapport: 'Exporter le rapport de vérification',
  confirmerLImport: 'Remplacer par cette sauvegarde',
  confirmerLeDepart: 'Réinitialiser',
  annuler: 'Annuler',
  sansEcart: 'Cette sauvegarde contient les mêmes palettes et les mêmes réglages.',
  importSansDessin: 'L’import remplacera vos palettes et vos réglages dans ce fichier Figma. La planche restera telle quelle jusqu’à sa prochaine mise à jour.',
  confirmationDuDepart: 'Toutes les palettes seront retirées du plugin et les réglages par défaut seront rétablis. Exportez vos données avant de continuer si vous souhaitez les conserver.',
  titre: 'Palettes et réglages',
} as const;

/** Le titre de la confirmation d'un import ([REC-08]). */
export function titreDeLImport(fichier: string): string {
  return `Remplacer les palettes et les réglages par « ${fichier} » ?`;
}

/** Une ligne de l'écart d'import : des palettes par leur nom, ou des réglages communs. */
export function ligneDEcart(genre: 'ajoutees' | 'retirees' | 'modifiees' | 'parametres', noms: readonly string[]): string {
  const titres = {
    ajoutees: noms.length === 1 ? 'Palette à ajouter' : 'Palettes à ajouter',
    retirees: noms.length === 1 ? 'Palette à retirer' : 'Palettes à retirer',
    modifiees: noms.length === 1 ? 'Palette à modifier' : 'Palettes à modifier',
    parametres: noms.length === 1 ? 'Réglage commun à modifier' : 'Réglages communs à modifier',
  };
  return `${titres[genre]} : ${noms.join(', ')}.`;
}

/** Le nom d'un réglage commun dans l'écart d'import. */
export const NOMS_DES_PARAMETRES = {
  crans: 'numéros des nuances',
  courbes: 'luminosité des nuances',
  profils: 'intensités des couleurs',
  fonds: 'couleurs de fond pour les contrastes',
  seuils: 'minimums et seuils de détection',
  derives: 'préréglage Tailwind',
  gamut: 'espace de couleur',
} as const;

/** Un fichier importé qui ne se lit pas : la recette enregistrée reste intacte ([REC-08]). */
export function importInvalide(fichier: string, refus: readonly Refus[]): Constat {
  return {
    ou: `Import impossible : ${fichier}`,
    quoi: `Ce fichier contient ${erreursDeValidation(refus)}. Première erreur : ${texteDuRefus(refus[0])} Vos palettes et vos réglages actuels sont conservés.`,
    geste: 'Corrigez le fichier indiqué, puis réessayez l’import. Vous pouvez aussi sélectionner une autre sauvegarde.',
  };
}

/** Un fichier importé d'une version que ce plugin ne lit pas. */
export function importFutur(fichier: string, version: number): Constat {
  return {
    ou: `Import impossible : ${fichier}, format ${version}`,
    quoi: `Cette sauvegarde nécessite une version plus récente du plugin, qui accepte actuellement le format ${FORMAT_RECETTE}. Vos palettes et vos réglages actuels sont conservés.`,
    geste: 'Installez une version plus récente d’UCM Palettes, puis réimportez cette sauvegarde.',
  };
}

/** Les libellés de la génération et de l'onglet Planche (section 13.2). */
export const TEXTES_DU_DESSIN = {
  dessiner: 'Générer sur Figma',
  dessinerTout: 'Générer toutes les palettes',
  aJour: 'À jour',
  perimee: 'À mettre à jour',
  jamaisDessinee: 'Pas encore sur la planche',
  redessinerQuandMeme: 'Remplacer le cadre et son contenu',
  voirSurLaPlanche: 'Afficher dans Figma',
  reessayer: 'Réessayer',
  confirmer: 'Générer sur Figma',
  annuler: 'Annuler',
  plancheSansPalette: 'Créez une palette dans l’onglet « Palettes » pour pouvoir générer sa présentation ici.',
  versLesPalettes: 'Créer une palette',
  // N009, N010, puis N043 à N047.
  introuvable: 'Cadre introuvable',
  illisible: 'Lecture impossible',
  modifier: 'Modifier la palette',
  actualiser: 'Actualiser',
  chercherPartout: 'Chercher dans tout le fichier',
  palettesEtReglages: 'Palettes et réglages',
  themeDesFiches: 'Thème des fiches',
} as const;

/** L'état d'un cadre de palette, tel que les deux onglets l'écrivent ([PLA-20], V8.2). */
export function etatDuCadreEcrit(etat: 'a-jour' | 'perimee' | 'jamais-dessinee' | 'introuvable' | 'illisible'): string {
  return {
    'a-jour': TEXTES_DU_DESSIN.aJour,
    perimee: TEXTES_DU_DESSIN.perimee,
    'jamais-dessinee': TEXTES_DU_DESSIN.jamaisDessinee,
    introuvable: TEXTES_DU_DESSIN.introuvable,
    illisible: TEXTES_DU_DESSIN.illisible,
  }[etat];
}

/** La page d'un cadre rangé hors de la page de la planche (V8.6, N048). */
export function pageDuCadre(nom: string): string {
  return `Page « ${nom} »`;
}

/** Le geste qui génère les palettes qui ne sont pas à jour (V8.4, N049). */
export function genererLesPalettesPasAJour(nombre: number): string {
  return nombre === 1 ? 'Générer la palette qui n’est pas à jour' : `Générer les ${nombre} palettes qui ne sont pas à jour`;
}

/** La ligne technique de la carte « Palettes et réglages » (V8.5, N050). */
export function detailsTechniques(empreinte: string | null, versionDuSuivi: number): string {
  return `Format des palettes et réglages : ${FORMAT_RECETTE} · empreinte : ${empreinte ?? 'aucune'} · suivi des cadres : version ${versionDuSuivi}`;
}

/** Un cadre introuvable après une recherche bornée à la page de la planche (V8.6, N051). */
export function rechercheBornee(nomDeLaPage: string | null, introuvables: readonly string[]): Constat {
  const seul = introuvables.length === 1;
  return {
    ou: seul ? `Cadre introuvable : ${citer(introuvables)}` : `Cadres introuvables : ${citer(introuvables)}`,
    quoi: `Le plugin a cherché ${seul ? 'ce cadre' : 'ces cadres'} sur la page ${nomDeLaPage ? `« ${nomDeLaPage} »` : 'de la planche'} seulement. Un cadre supprimé, ou coupé puis collé sur une autre page, n’y figure plus. Générer la palette crée un nouveau cadre.`,
    geste: 'Cherchez dans tout le fichier avant de générer, pour ne pas créer de doublon.',
  };
}

/** Une génération refusée : Figma n'a pas pu lire le cadre existant d'une palette (V8.6, N052). */
export function lectureImpossible(noms: readonly string[]): Constat {
  return {
    ou: `Lecture impossible : ${citer(noms)}`,
    quoi: `Figma n’a pas pu lire le cadre existant ${noms.length === 1 ? 'de cette palette' : 'de ces palettes'}. Aucune palette n’a été générée, pour ne pas créer un second cadre à côté du premier.`,
    geste: 'Actualisez l’onglet Planche, puis relancez la génération.',
  };
}

/** Un suivi des cadres écrit par une version plus récente du plugin (V8.8, N053). */
export function suiviFutur(): Constat {
  return {
    ou: 'Planche d’une version plus récente',
    quoi: 'Les cadres de ce fichier ont été générés par une version plus récente d’UCM Palettes. Cette version ne peut ni les lire ni les mettre à jour.',
    geste: 'Mettez le plugin à jour pour générer les palettes.',
  };
}

/** Le nombre de palettes, en tête de l'onglet Planche ([UI-02]). */
export function enTeteDeLaPlanche(nombre: number): string {
  if (nombre === 0) return 'Aucune palette';
  return nombre === 1 ? '1 palette' : `${nombre} palettes`;
}

/** La progression d'une génération, à la place de son bouton ([UI-05], [PLA-24]). */
export function progressionDuDessin(fait: number, total: number, nom: string): string {
  return total === 1 ? `Génération de « ${nom} »…` : `Palette ${fait + 1} sur ${total} : génération de « ${nom} »…`;
}

/** La confirmation avant de générer beaucoup de palettes ([PLA-24], D-I). */
export function confirmationDuDessin(nombre: number): string {
  return `La génération de ${nombre} palettes ajoutera plus de 1 500 calques par palette. Confirmez pour lancer la génération.`;
}

/** Le blocage d'une police indisponible ([PLA-22]). */
export function policeIndisponible(style: string): Constat {
  return {
    ou: `Police indisponible : ${style}`,
    quoi: `Figma n’a pas pu charger ${style}. Aucune palette n’a été générée sur la planche.`,
    geste: 'Activez ou installez la police Inter, puis réessayez.',
  };
}

/**
 * Une génération interrompue : le cadre en cours n'est pas posé, et l'ancien
 * cadre de cette palette reste en place. Une génération de plusieurs palettes
 * nomme celles déjà créées et celles qui attendent (V8.4, N054) ; « Réessayer »
 * reprend à la palette fautive. L'erreur de Figma se lit dans le détail
 * technique.
 */
export function dessinInterrompu(nom: string, message: string, creees: readonly string[] = [], restantes: readonly string[] = []): ConstatIllustre {
  const conservees = creees.length === 0 ? '' : ` ; ${creees.length === 1 ? `celle de ${citer(creees)} est conservée` : `celles de ${citer(creees)} sont conservées`}`;
  const suite = creees.length === 0 && restantes.length === 0
    ? 'aucune nouvelle présentation de palette n’a été créée'
    : `la présentation de cette palette n’a pas été créée${conservees}`;
  const attente = restantes.length === 0 ? '' : ` ${restantes.length === 1 ? `${citer(restantes)} n’a pas encore été générée` : `${citer(restantes)} n’ont pas encore été générées`}.`;
  return {
    ou: `Génération interrompue : ${nom}`,
    quoi: `La génération s’est arrêtée : ${suite}.${attente}`,
    geste: restantes.length === 0 ? 'Réessayez de générer la palette.' : 'Réessayez : la génération reprend à cette palette.',
    detail: `Détail de l’erreur : ${message}`,
  };
}

/** Une génération refusée : la recette enregistrée n'est plus celle que l'aperçu montre (E13). */
export function dessinSurUneAutreRecette(): Constat {
  return {
    ou: 'Les données du fichier ont changé',
    quoi: 'Les palettes ou les réglages ont changé depuis leur chargement. La génération a été annulée pour éviter de créer une planche différente de l’aperçu.',
    geste: 'Rechargez les palettes, vérifiez l’aperçu, puis relancez la génération.',
  };
}

const citer = (noms: readonly string[]): string => noms.map((nom) => `« ${nom} »`).join(', ');

/** Les calques qu'une mise à jour retirerait, à confirmer avant la génération ([PLA-03], D-H). */
export function constatDesCalquesEtrangers(nom: string, calques: readonly string[]): Constat {
  const seul = calques.length === 1;
  return {
    ou: `Contenu ajouté dans le cadre de « ${nom} »`,
    quoi: seul
      ? `La mise à jour supprimera le calque ${citer(calques)} que vous avez ajouté dans ce cadre.`
      : `La mise à jour supprimera les ${calques.length} calques que vous avez ajoutés dans ce cadre : ${citer(calques)}.`,
    geste: seul
      ? 'Déplacez ce calque hors du cadre pour le conserver. Sinon, confirmez son remplacement.'
      : 'Déplacez ces calques hors du cadre pour les conserver. Sinon, confirmez leur remplacement.',
  };
}

/** Un cadre dont la palette a été supprimée ([ENT-03]). */
export function cadreOrphelin(nom: string): Constat {
  return {
    ou: `Palette supprimée : cadre « ${nom} »`,
    quoi: 'Ce cadre reste dans Figma, mais sa palette a été supprimée du plugin. Il ne sera plus mis à jour.',
    geste: 'Vous pouvez conserver ce cadre ou le supprimer directement dans Figma.',
  };
}

/** La copie d'un cadre de palette, faite par le designer ([PLA-25], E15). */
export function copieDeCadre(nom: string): Constat {
  return {
    ou: `Copie du cadre « ${nom} »`,
    quoi: 'Le plugin met à jour le cadre d’origine uniquement. Les couleurs de cette copie peuvent donc être anciennes.',
    geste: 'Mettez à jour la palette, puis dupliquez son cadre d’origine pour obtenir une nouvelle copie.',
  };
}

/** L'information d'un document Display P3 (section 6.7, E11). */
export function noticeDisplayP3(): Constat {
  return {
    ou: 'Fichier Figma en Display P3',
    quoi: 'Dans ce fichier Display P3, la pipette peut afficher un code différent du code sRGB écrit sur la carte.',
    geste: 'Pour récupérer le code sRGB de la palette, copiez le code hexadécimal écrit sur la carte.',
  };
}

/** Les couleurs d'une palette que la planche peint autrement que l'aperçu (L6.14). */
export function ecartDePeinture(nom: string, ecarts: readonly { readonly nom: string; readonly apercu: string | null; readonly peint: string }[]): ConstatIllustre {
  const [premier] = ecarts;
  const compte = ecarts.length === 1 ? '1 couleur ne correspond pas' : `${ecarts.length} couleurs ne correspondent pas`;
  return {
    ou: `Différence entre l’aperçu et la planche : ${nom}`,
    quoi: `${compte} à l’aperçu.`,
    geste: 'Mettez à jour la palette sur la planche. Si la différence persiste, transmettez ce message à la personne qui maintient le plugin.',
    detail: `Exemple, ${premier.nom} : ${premier.apercu ?? 'couleur absente'} dans l’aperçu, ${premier.peint} sur la planche.`,
  };
}

/** Les textes que la planche porte dans le document (section 9, lot V10). */
export const TEXTES_DE_LA_PLANCHE = {
  reference: 'Couleur de référence',
  contrastes: 'Contrastes de la couleur de référence',
  colonnesDesContrastes: ['Comparée avec', 'Contraste', 'Niveau WCAG'],
  contre: { blanc: 'Blanc', noir: 'Noir', light: 'Fond du thème Light', dark: 'Fond du thème Dark' },
  mesures: 'Mesures avancées',
  garanties: 'Garanties de contraste',
  garantiesCitees: 'Chaque rôle correspond au même numéro de nuance dans toutes les palettes de marque.',
  grilles: 'Grilles de contraste',
  noteDesGrilles: 'Chaque case compare librement deux nuances de la même rampe. Ces cases ne sont pas des garanties : elles répondent à la question « quelle nuance puis-je poser sur quelle nuance ».',
  alertes: 'Points à vérifier',
  aucuneAlerte: 'Aucun point signalé ici. Les résultats de contraste se lisent dans les garanties.',
  legende: 'Lire les valeurs',
  specimen: 'Aa',
  reperage: '◆ Référence',
  fond: 'fond',
  onSolid: 'on-solid',
  onSolidEnMots: 'texte sur fond plein : le fond de page du thème, neutral.50 du design system',
  mode: { light: 'Thème Light', dark: 'Thème Dark' },
} as const;

/** Le profil et la nuance de la référence, une fois si les deux thèmes s'accordent (V10.1, V10.2). */
function nuancesDeLaReference(ancrage: Ancrage): string {
  const { light, dark } = ancrage.crans;
  return light === dark ? `nuance ${light}` : `nuance ${light} en Thème Light, ${dark} en Thème Dark`;
}

/** La ligne de la référence sous le nom de la palette (V10.1, N062). */
export function enTeteDeLaReference(hexa: string, ancrage: Ancrage): string {
  return `Couleur de référence ${hexa} · ${NOM_DU_PROFIL[ancrage.profil]} · ${nuancesDeLaReference(ancrage)}`;
}

/** Le résultat Soft et Vivid des garanties, sur les deux thèmes, comme la bascule le donne (V10.1). */
export function enTeteDesGaranties(manqueesSoft: number, manqueesVivid: number): string {
  return TEXTES_DES_GARANTIES.bilan(resultatDuProfil('soft', manqueesSoft), resultatDuProfil('vivid', manqueesVivid));
}

/** Le profil porteur, et la palette de base quand le designer l'a choisie (V10.2, N063). */
export function porteurDeLaReference(ancrage: Ancrage, base: Profil | undefined): string {
  const porteur = `Profil porteur : ${NOM_DU_PROFIL[ancrage.profil]} · ${nuancesDeLaReference(ancrage)}`;
  return base ? `${porteur}\nPalette de base : ${NOM_DU_PROFIL[base]}, choisie pour cette palette` : porteur;
}

/** Les mesures avancées de la référence, chacune nommée, puis sa forme CSS à points décimaux (V10.2, N064). */
export function mesuresDeLaReference(L: number, C: number, H: number, part: number): string {
  const teinte = Math.round(H) % 360;
  return [
    `Luminosité L : ${ecrireArrondi(L, 3)} · chroma C : ${ecrireArrondi(C, 3)} · teinte H : ${teinte}° · intensité : ${ecrireArrondi(part, 2)}`,
    `CSS : oklch(${Number(L.toFixed(3))} ${Number(C.toFixed(3))} ${teinte})`,
  ].join('\n');
}

/** Le niveau WCAG le plus haut qu'un contraste atteint pour du texte, en un mot (section 9.3, N065). */
export function niveauCourt(valeur: number): string {
  const niveaux = niveauxWcag(valeur);
  if (niveaux.texte) return niveaux.texte;
  return niveaux.grandTexte ? 'AA grand texte' : 'Insuffisant';
}

/** L'en-tête d'une section de thème ([PLA-09]). */
export function enTeteDeSection(mode: Mode, fond: string): string {
  return `${TEXTES_DE_LA_PLANCHE.mode[mode]} · fond utilisé pour les contrastes : ${fond}`;
}

/** Ce qu'une carte de nuance écrit sous sa pastille ([PLA-12], V10.5). */
export interface TexteDeCarte {
  readonly hexa: string;
  readonly fond: number;
  readonly emplois: readonly EmploiDUnCran[];
  /** Le profil dont cette nuance se confond, `null` quand les deux s'écartent ([PLA-15]). */
  readonly confondu: string | null;
}

/** Un rôle d'une nuance : son nom dans le design system, son nom français, son état (N066). */
function roleEcrit({ emploi, decalage }: EmploiDUnCran): string {
  const etat = decalage === 0 ? '' : ` · ${NOM_DE_L_ETAT[Math.min(decalage, 2) as EtatDePaire]}`;
  return `${emploi} · ${NOM_DU_ROLE[emploi]}${etat}`;
}

export function texteDeCarte(carte: TexteDeCarte): string {
  return [
    carte.hexa,
    ...carte.emplois.map(roleEcrit),
    `Fond ${contrasteEcrit(carte.fond)} · ${niveauCourt(carte.fond)}`,
    carte.confondu ? `Très proche de ${carte.confondu}` : '',
  ].filter((ligne) => ligne !== '').join('\n');
}

/** Les dérives d'un cadre ([PLA-08]) : une ligne par profil, ou une seule quand ils sont liés. */
export function texteDesDerives(palette: Palette): string {
  const { lien, soft, vivid } = palette.derive;
  return lien
    ? `Dérive de teinte commune à soft et vivid : ${uneDerive(vivid)}`
    : `Dérive de teinte de soft : ${uneDerive(soft)}\nDérive de teinte de vivid : ${uneDerive(vivid)}`;
}

/** Le titre des garanties d'un thème (V10.6). */
export function titreDesGaranties(mode: Mode): string {
  return `${TEXTES_DE_LA_PLANCHE.garanties} · ${TEXTES_DE_LA_PLANCHE.mode[mode]}`;
}

/** La relation d'une association, en noms du design system, puis en français (N030, N031). */
export function relationEcrite(association: Association): { readonly code: string; readonly francais: string } {
  const sur = TEXTES_DES_GARANTIES.sur;
  const second = association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : association.second;
  const francais = association.second === 'fond' ? TEXTES_DES_GARANTIES.fond : NOM_DU_ROLE[association.second];
  return { code: `${association.premier} ${sur} ${second}`, francais: `${NOM_DU_ROLE[association.premier]} ${sur} ${francais}` };
}

/** Sous un spécimen de la planche : le profil, les deux numéros comparés, le résultat et le ratio (V10.6, N067). */
export function mesureDuSpecimen(profil: Profil, premier: string, second: string, tenue: boolean, contraste: number): string {
  return `${NOM_DU_PROFIL[profil]} · ${TEXTES_DES_GARANTIES.numeros(premier, second)} · ${TEXTES_DES_GARANTIES.resultat(tenue, contraste)}:1`;
}

/** Le titre d'une grille de contraste (V10.7). */
export function titreDeGrille(mode: Mode, profil: Profil): string {
  return `${TEXTES_DE_LA_PLANCHE.mode[mode]} · ${NOM_DU_PROFIL[profil]}`;
}

/** La légende des grilles : chaque couleur de fond en mots (V10.7, N068). */
export function legendeDesGrilles(seuils: Recette['seuils']): string {
  return `Vert : au moins ${seuilEcrit(seuils.texte)}:1, pour du texte. Jaune : au moins ${seuilEcrit(seuils.nonTexte)}:1, pour un élément visible ou du grand texte. Gris : en dessous de ${seuilEcrit(seuils.nonTexte)}:1.`;
}

/** Une ligne de point à vérifier sur la planche : l'élément, l'explication, puis l'action. */
export function ligneDAlerte(constat: Constat): string {
  return `${constat.ou} : ${constat.quoi} ${constat.geste}`;
}

/** La légende d'un cadre ([PLA-11], V10.9, N069), sans nom interne de seuil. */
export function legende(seuils: Recette['seuils']): string {
  return [
    `Lire une garantie : chaque ligne nomme deux rôles, le premier posé sur le second. Sous chaque spécimen, les deux numéros de nuance comparés, puis ✓ quand le contraste atteint le minimum de son groupe, ✗ sinon. Minimums demandés : ${seuilEcrit(seuils.texte)}:1 pour les textes, ${seuilEcrit(seuils.nonTexte)}:1 pour les éléments visibles.`,
    'Soft et Vivid : chaque état montre deux spécimens aux mêmes numéros de nuance, Soft, plus doux, puis Vivid, plus intense.',
    '« Fond » donne, sous chaque nuance, son contraste avec le fond du thème et le niveau WCAG le plus haut qu’il atteint pour du texte.',
    `Couleurs proches : un écart sous ${ecrireArrondi(seuils.profilsConfondus, 2)} entre Soft et Vivid, ou sous ${ecrireArrondi(seuils.palettesProches, 2)} entre deux palettes, est signalé. Ces écarts détectent les ressemblances ; ils ne mesurent pas la lisibilité.`,
  ].join('\n');
}
