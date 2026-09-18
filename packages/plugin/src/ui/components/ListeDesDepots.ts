/**
 * La liste des dépôts de l'onglet Dépôts : une carte par dépôt enregistré,
 * dans l'ordre d'ajout, et les cartes nouvelles en fin de liste.
 *
 * La liste se rend par identité : un message `settings` met à jour les cartes
 * existantes sans refermer une carte dépliée ni remplacer une saisie en cours.
 */
import type { PluginMessage, ReglagesPublics } from '../../messages';
import { createButton } from './Button';
import { createCarteDepot } from './CarteDepot';
import type { CarteDepotUi } from './CarteDepot';
import { versSandbox } from '../pont';

type DepotEnregistre = Extract<PluginMessage, { type: 'depot-enregistre' }>;
type DepotTeste = Extract<PluginMessage, { type: 'depot-teste' }>;
type DepotsIllisibles = Extract<PluginMessage, { type: 'depots-illisibles' }>;

export interface ListeDesDepotsUi {
  element: HTMLDivElement;
  accepterReglages(reglages: ReglagesPublics): void;
  recevoirEnregistrement(message: DepotEnregistre): void;
  recevoirTest(message: DepotTeste): void;
  /** Remplace la liste par le constat et le geste, tant qu'elle ne se lit pas. */
  signalerIllisible(message: DepotsIllisibles): void;
  /** L'arrivée par la pastille : un dépôt actif en échec se déplie et vient dans la vue. */
  montrerLActifEnEchec(): void;
  liberer(): void;
}

export function createListeDesDepots(): ListeDesDepotsUi {
  const element = document.createElement('div');
  element.className = 'page-stack';

  /*
   * Sans cette ligne, le designer qui ouvre Dépôts en export local voit des
   * dépôts non connectés sans en lire la raison.
   */
  const exportLocal = document.createElement('p');
  exportLocal.className = 'depot-repli';
  exportLocal.textContent = 'Export local activé dans Général : les exports sont téléchargés sur votre poste.';
  exportLocal.hidden = true;

  const vide = document.createElement('p');
  vide.className = 'subtitle';
  vide.textContent = 'Veuillez ajouter un dépôt.';

  const liste = document.createElement('div');
  liste.className = 'page-stack';

  /*
   * Une liste illisible prend toute la place de l'onglet : le sandbox n'envoie
   * plus de `settings`, donc aucune carte n'est à jour, et toute écriture
   * commence par une lecture qui lève. Ajouter un dépôt échouerait.
   */
  let illisible = false;
  const panneauIllisible = document.createElement('div');
  panneauIllisible.className = 'page-stack';
  panneauIllisible.hidden = true;
  const constatIllisible = document.createElement('p');
  constatIllisible.className = 'depot-repli';
  const gesteIllisible = document.createElement('p');
  gesteIllisible.className = 'subtitle';
  const reinitialiser = createButton({
    label: 'Réinitialiser la liste',
    variant: 'secondary',
    onClick: () => versSandbox({ type: 'reinitialiser-depots' }),
  });
  panneauIllisible.append(constatIllisible, gesteIllisible, reinitialiser);

  /** Les cartes, par clé : l'identité enregistrée, ou un identifiant temporaire. */
  const cartes = new Map<string, CarteDepotUi>();
  /** Les cartes qui attendent le test de leur enregistrement pour se replier. */
  const enAttenteDeTest = new Set<CarteDepotUi>();
  /** La génération du dernier test affiché, par dépôt. */
  const generations = new Map<string, number>();
  let actif: string | null = null;
  let requetes = 0;
  let nouvelles = 0;

  function cleDe(carte: CarteDepotUi): string | undefined {
    return [...cartes].find(([, candidate]) => candidate === carte)?.[0];
  }

  function creer(cle: string): CarteDepotUi {
    const carte = createCarteDepot({
      cle,
      onEnregistrer(emettrice, settings) {
        requetes += 1;
        versSandbox({
          type: 'enregistrer-depot', requete: requetes, carte: cleDe(emettrice) ?? cle, id: emettrice.id(), settings,
        });
        return requetes;
      },
      onSupprimer(emettrice) {
        const id = emettrice.id();
        if (id) {
          versSandbox({ type: 'supprimer-depot', id });
          return;
        }
        const cleNouvelle = cleDe(emettrice);
        if (cleNouvelle) cartes.delete(cleNouvelle);
        emettrice.element.remove();
        rafraichirVide();
      },
      onSeConnecter: (id) => versSandbox({ type: 'activer-depot', id }),
    });
    cartes.set(cle, carte);
    return carte;
  }

  function rafraichirVide() {
    vide.hidden = illisible || cartes.size > 0;
  }

  const ajouter = createButton({
    label: 'Ajouter un dépôt',
    variant: 'secondary',
    onClick: () => {
      nouvelles += 1;
      const carte = creer(`nouvelle-${nouvelles}`);
      liste.appendChild(carte.element);
      rafraichirVide();
      carte.element.querySelector('input')?.focus();
    },
  });

  element.append(exportLocal, panneauIllisible, ajouter, vide, liste);
  rafraichirVide();

  /** Ce que l'onglet montre selon que la liste se lit ou non. */
  function afficherSelonLecture() {
    panneauIllisible.hidden = !illisible;
    ajouter.hidden = illisible;
    liste.hidden = illisible;
    rafraichirVide();
  }

  return {
    element,
    accepterReglages(reglages: ReglagesPublics) {
      // Un `settings` prouve que la liste se lit de nouveau.
      illisible = false;
      afficherSelonLecture();
      // En export local, aucune carte n'est connectée : toutes proposent « Se connecter ».
      actif = reglages.exportLocal ? null : reglages.actif;
      exportLocal.hidden = !reglages.exportLocal;
      const recus = new Set(reglages.depots.map(({ id }) => id));
      for (const [cle, carte] of [...cartes]) {
        const id = carte.id();
        if (id !== null && !recus.has(id)) {
          cartes.delete(cle);
          carte.element.remove();
        }
      }
      const ordre: HTMLElement[] = [];
      for (const depot of reglages.depots) {
        let carte = cartes.get(depot.id)
          ?? [...cartes.values()].find((candidate) => candidate.id() === depot.id);
        if (!carte) {
          carte = creer(depot.id);
          carte.deplier(false);
        }
        carte.poser(depot, depot.id === actif);
        ordre.push(carte.element);
      }
      // Les cartes jamais enregistrées restent en fin de liste, avec leur saisie.
      for (const carte of cartes.values()) if (carte.id() === null) ordre.push(carte.element);
      liste.replaceChildren(...ordre);
      rafraichirVide();
    },
    recevoirEnregistrement({ requete, carte: cle, id, erreurs }: DepotEnregistre) {
      const carte = cartes.get(cle);
      if (!carte) return;
      /*
       * La clé suit l'identité dès que le sandbox en rend une, même quand la
       * carte n'attend plus cette réponse. Le dépôt est alors enregistré, et
       * une clé restée temporaire faisait créer une seconde carte pour lui au
       * `settings` suivant.
       */
      if (id && cle !== id && !cartes.has(id)) {
        cartes.delete(cle);
        cartes.set(id, carte);
      }
      if (!carte.recevoirEnregistrement(requete, id, erreurs)) return;
      enAttenteDeTest.add(carte);
    },
    recevoirTest(message: DepotTeste) {
      const carte = cartes.get(message.id)
        ?? [...cartes.values()].find((candidate) => candidate.id() === message.id);
      if (!carte || (generations.get(message.id) ?? 0) > message.generation) return;
      generations.set(message.id, message.generation);
      carte.afficherTest(message, message.destination);
      if (message.etat === 'checking' || !enAttenteDeTest.has(carte)) return;
      // La carte se replie après un enregistrement accepté et un test réussi ;
      // elle reste dépliée tant que le test échoue.
      enAttenteDeTest.delete(carte);
      if (message.etat === 'connected') carte.deplier(false);
    },
    signalerIllisible({ texte, geste }: DepotsIllisibles) {
      illisible = true;
      constatIllisible.textContent = texte;
      gesteIllisible.textContent = geste;
      exportLocal.hidden = true;
      afficherSelonLecture();
    },
    montrerLActifEnEchec() {
      const carte = actif ? cartes.get(actif) ?? [...cartes.values()].find((candidate) => candidate.id() === actif) : null;
      if (!carte?.enEchec()) return;
      carte.deplier(true);
      carte.element.scrollIntoView({ block: 'nearest' });
    },
    liberer() {
      for (const carte of cartes.values()) carte.liberer();
    },
  };
}
