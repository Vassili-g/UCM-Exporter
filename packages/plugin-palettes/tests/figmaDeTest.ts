/**
 * Un double de l'API Figma, réduit à ce que le dessin de la planche emploie.
 * Il refuse ce que Figma refuse et que le dessin doit éviter : lire les
 * enfants d'une page non chargée (`documentAccess: "dynamic-page"`), poser un
 * texte dans une police non chargée. Un journal garde l'ordre des opérations.
 */
import type { FigmaDuDessin } from '../src/ecriture/planche';

let compteur = 0;

class Noeud {
  readonly id = `n:${(compteur += 1)}`;
  name = '';
  removed = false;
  parent: Noeud | null = null;
  x = 0;
  y = 0;
  width = 100;
  height = 20;
  enfants: Noeud[] = [];
  readonly donnees = new Map<string, string>();

  constructor(readonly type: string, readonly figma: FauxFigma) {
    figma.registre.set(this.id, this);
  }

  getSharedPluginData(espace: string, cle: string): string {
    return this.donnees.get(`${espace}/${cle}`) ?? '';
  }

  setSharedPluginData(espace: string, cle: string, valeur: string): void {
    this.donnees.set(`${espace}/${cle}`, valeur);
  }

  get children(): Noeud[] {
    return this.enfants;
  }

  appendChild(enfant: Noeud): void {
    if (enfant.parent) enfant.parent.enfants = enfant.parent.enfants.filter((autre) => autre !== enfant);
    enfant.parent = this;
    this.enfants.push(enfant);
  }

  resize(largeur: number, hauteur: number): void {
    this.width = largeur;
    this.height = hauteur;
  }

  remove(): void {
    if (this.parent) this.parent.enfants = this.parent.enfants.filter((autre) => autre !== this);
    this.parent = null;
    const retirer = (noeud: Noeud): void => {
      noeud.removed = true;
      noeud.enfants.forEach(retirer);
    };
    retirer(this);
    this.figma.journal.push(`retirer ${this.name}`);
  }
}

class Document extends Noeud {
  documentColorProfile: 'SRGB' | 'DISPLAY_P3' | 'LEGACY' = 'SRGB';

  constructor(figma: FauxFigma) {
    super('DOCUMENT', figma);
  }
}

class Page extends Noeud {
  charge = false;

  constructor(figma: FauxFigma) {
    super('PAGE', figma);
  }

  override get children(): Noeud[] {
    if (!this.charge) throw new Error(`La page ${this.name} n'est pas chargée.`);
    return this.enfants;
  }

  async loadAsync(): Promise<void> {
    this.charge = true;
    this.figma.journal.push(`charger ${this.name}`);
  }
}

class Texte extends Noeud {
  private police = { family: 'Inter', style: 'Regular' };
  private contenu = '';
  fills: unknown = [];
  fontSize = 12;
  textAutoResize = 'WIDTH_AND_HEIGHT';

  constructor(figma: FauxFigma) {
    super('TEXT', figma);
    figma.journal.push('créer texte');
  }

  get fontName() {
    return this.police;
  }

  set fontName(police: { family: string; style: string }) {
    if (!this.figma.polices.has(`${police.family} ${police.style}`)) throw new Error(`police non chargée : ${police.style}`);
    this.police = police;
  }

  get characters(): string {
    return this.contenu;
  }

  set characters(contenu: string) {
    if (!this.figma.polices.has(`${this.police.family} ${this.police.style}`)) throw new Error('police non chargée');
    this.contenu = contenu;
  }
}

class Cadre extends Noeud {
  layoutMode = 'NONE';
  itemSpacing = 0;
  paddingTop = 0;
  paddingRight = 0;
  paddingBottom = 0;
  paddingLeft = 0;
  private peinture: unknown = [];
  cornerRadius = 0;
  primaryAxisAlignItems = 'MIN';
  counterAxisAlignItems = 'MIN';
  layoutSizingHorizontal = 'FIXED';
  layoutSizingVertical = 'FIXED';

  constructor(figma: FauxFigma) {
    super('FRAME', figma);
    figma.journal.push('créer cadre');
  }

  get fills(): unknown {
    return this.peinture;
  }

  set fills(peinture: unknown) {
    this.peinture = this.figma.garderLaPeinture(peinture);
  }
}

export class FauxFigma {
  readonly registre = new Map<string, Noeud>();
  readonly journal: string[] = [];
  readonly polices = new Set<string>();
  /** Les styles dont le chargement échoue. */
  readonly policesAbsentes = new Set<string>();
  /** Le nombre de textes créés avant que la création suivante lève ; `null`, jamais. */
  echouerAuTexte: number | null = null;
  /** Ce que Figma garde de la peinture d'un cadre ; un test la fausse pour voir le dessin la relire. */
  garderLaPeinture: (peinture: unknown) => unknown = (peinture) => peinture;
  readonly root: Document;
  readonly pageCourante: Page;

  constructor(nomsDePages: string[] = ['Page 1']) {
    this.root = new Document(this);
    for (const nom of nomsDePages) {
      const page = new Page(this);
      page.name = nom;
      this.root.appendChild(page);
    }
    this.pageCourante = this.root.enfants[0] as Page;
  }

  createPage(): Page {
    const page = new Page(this);
    this.root.appendChild(page);
    this.journal.push('créer page');
    return page;
  }

  createFrame(): Cadre {
    const cadre = new Cadre(this);
    this.pageCourante.enfants.push(cadre);
    cadre.parent = this.pageCourante;
    return cadre;
  }

  createText(): Texte {
    // L'échec lève avant de construire : aucun nœud ne reste inscrit au registre.
    if (this.echouerAuTexte !== null && (this.echouerAuTexte -= 1) < 0) throw new Error('création de texte refusée');
    const texte = new Texte(this);
    this.pageCourante.enfants.push(texte);
    texte.parent = this.pageCourante;
    return texte;
  }

  async getNodeByIdAsync(id: string): Promise<Noeud | null> {
    const noeud = this.registre.get(id);
    return noeud && !noeud.removed ? noeud : null;
  }

  async loadFontAsync(police: { family: string; style: string }): Promise<void> {
    const nom = `${police.family} ${police.style}`;
    if (this.policesAbsentes.has(police.style)) throw new Error(`police absente : ${nom}`);
    this.polices.add(nom);
    this.journal.push(`police ${police.style}`);
  }

  commitUndo(): void {
    this.journal.push('commitUndo');
  }

  /** Le double sous le type que le dessin attend. */
  api(): FigmaDuDessin {
    return this as unknown as FigmaDuDessin;
  }

  /** La page nommée, chargée pour la lecture du test. */
  page(nom: string): Page {
    const page = this.root.enfants.find((candidate) => candidate.name === nom) as Page | undefined;
    if (!page) throw new Error(`aucune page ${nom}`);
    page.charge = true;
    return page;
  }

  /** Tous les nœuds encore présents sous un nœud, lui compris. */
  sous(noeud: Noeud): Noeud[] {
    return [noeud, ...noeud.enfants.flatMap((enfant) => this.sous(enfant))];
  }
}
