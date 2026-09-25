/**
 * Fabriques du faux `figma` partagées par les tests qui passent par
 * l'assemblage complet du contrat.
 *
 * `handleExportComponent` applique les lois à chaque contrat produit : un
 * fichier de test qui l'importe y soumet ses scénarios sans rien ajouter.
 */
import exporterLeComposant from '../../src/contract/exportComponent';
import {
  verifierLaSerialisation,
  verifierLeLecteur,
  verifierLeSchema,
  verifierLesLois,
} from '../lois';
import { verifierLaLocalisationDesDiagnostics } from '../loiDeLocalisation.test';
import { verifierLesPartiesDesDiagnostics } from '../loiDesParties.test';
import { verifierLaParite } from './parite';

/**
 * Les noms de calques du composant que le scénario courant a monté.
 *
 * Relevés depuis le faux `figma`, donc depuis ce que le moteur a réellement
 * parcouru : une liste écrite à la main vieillirait avec les scénarios.
 */
function nomsDeCalquesDuComposant(): Set<string> {
  const noms = new Set<string>();
  const visiter = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.name === 'string') noms.add(node.name);
    for (const enfant of Array.isArray(node.children) ? node.children : []) visiter(enfant);
  };
  for (const selection of (globalThis as any).figma?.currentPage?.selection ?? []) {
    visiter(selection);
  }
  return noms;
}

/**
 * Chaque contrat que le moteur fabrique ici passe d'abord par les lois de
 * forme et par le banc de parité, avant que le test ne regarde ce qui
 * l'intéresse.
 *
 * C'est le seul endroit du repository où ces lois portent sur du code : le
 * corpus est gelé et ne bouge qu'au réexport, si bien qu'une régression du
 * moteur ne s'y verrait jamais. Ici, elle échoue au scénario qui la produit.
 */
export async function handleExportComponent() {
  const resultat = await exporterLeComposant();
  const contrat = JSON.parse(resultat.content);
  verifierLesLois(contrat, 'sortie du moteur');
  verifierLaLocalisationDesDiagnostics(
    resultat.warnings,
    resultat.localisations,
    resultat.localisationsDeclarees,
    nomsDeCalquesDuComposant(),
    'sortie du moteur',
  );
  verifierLesPartiesDesDiagnostics(resultat.warnings, resultat.parties, 'sortie du moteur');
  verifierLeSchema(contrat, 'sortie du moteur');
  verifierLeLecteur(contrat, 'sortie du moteur');
  verifierLaSerialisation(resultat.content, 'sortie du moteur');
  await verifierLaParite(resultat.content, 'sortie du moteur');
  return resultat;
}

let compteur = 0;

/** Node Figma minimal, avec le `findAll` récursif de l'API et un parent chaîné. */
export function node(type: string, name: string, children: any[] = [], extra: any = {}): any {
  const self: any = {
    type,
    id: `${name}-${(compteur += 1)}`,
    name,
    visible: true,
    boundVariables: {},
    children,
    ...extra,
  };
  self.findAll = (predicat: (candidat: any) => boolean = () => true) => {
    const trouves: any[] = [];
    const parcourir = (nodes: any[]) => {
      for (const enfant of nodes) {
        if (predicat(enfant)) trouves.push(enfant);
        parcourir(enfant.children ?? []);
      }
    };
    parcourir(children);
    return trouves;
  };
  self.findOne = (predicat: (candidat: any) => boolean) => self.findAll(predicat)[0] ?? null;
  for (const enfant of children) enfant.parent = self;
  return self;
}

/** Le component set dont chaque règle est une instance. */
const setDeRegles = { type: 'COMPONENT_SET', name: '.ruleItem' };

/**
 * Une règle telle que Figma la porte : une instance de `.ruleItem` dont un
 * calque nomme le tag, et dont les autres portent le texte et la cible.
 */
export function regle(tag: string, calques: any[]) {
  return node('INSTANCE', 'Règle', [
    node('FRAME', 'rule-ids', [node('TEXT', tag, [], { characters: tag })]),
    ...calques,
  ], {
    variantProperties: { Type: tag },
    componentProperties: {},
    getMainComponentAsync: async () => ({ name: `Type=${tag}`, parent: setDeRegles }),
  });
}

/**
 * Le conteneur de règles d'un composant : une instance de `.componentRules`
 * dont le calque « component-name » écrit le nom documenté.
 */
export function conteneurDeRegles(nom: string, regles: any[] = []) {
  return node('INSTANCE', '.componentRules', [
    node('FRAME', 'component-name-wrap', [node('TEXT', 'component-name', [], { characters: nom })]),
    ...regles,
  ]);
}
