# Refonte de l'interface du plugin — plan

> Toutes les affirmations factuelles de ce plan ont été vérifiées dans le code.
> Une revue indépendante l'a relu ; ses conclusions ont elles-mêmes été
> revérifiées dans le code avant intégration, et huit d'entre elles ont changé le
> plan — la table « Ce que la revue a corrigé » les recense.
>
> **Le code est cité par son symbole, pas par sa ligne.** C'est une entorse
> assumée à la règle 5 de [PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md),
> et elle a une cause mesurée : pendant la rédaction de ce plan, `github.ts` a
> été modifié et toutes ses lignes citées ont glissé d'une trentaine de rangs.
> Un nom de fonction ne glisse pas.

Ce document est **T4.6** de
[PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md), qui en fixe la place
dans l'ordre d'exécution ; le bug promu hors de ce chantier y est **T4.5**.

Ce plan ne touche ni le format du contrat, ni le moteur d'extraction — une seule
tâche s'en approche, U4.3, et elle est écrite pour ne pas franchir la frontière.
Il traite ce que le designer voit et fait dans la fenêtre du plugin : le
fonctionnel autant que le graphique, les deux étant ici le même sujet, ce que
l'interface permet de décider.

## Le constat

L'interface est un **lanceur** : deux boutons, une note d'état, et un journal
monospace haut de 96 à 144 px (`styles.css`, `.log-panel-inner`).

La doctrine, elle, fait du designer le **relecteur de la vérité visuelle
exportée** ([CONCEPT.md](./CONCEPT.md), « Le workflow »). Or tout ce dont ce rôle
a besoin arrive au mauvais moment :

- **ce qui va être exporté** disparaît au clic : la note qui nomme le composant
  est écrasée par « Traitement en cours… » (`ui/index.js`, `requestExport`) ;
- **où ça atterrit** n'apparaît qu'après publication, en ligne de journal
  (`code.ts`, `runExport`, ligne « Emplacement : ») — donc après le point de
  non-retour ;
- **ce qui a été perdu** ne se lit qu'une fois la branche et la pull request
  créées, alors que chaque avertissement nomme un geste à faire dans Figma,
  c'est-à-dire là où le designer se trouvait une seconde plus tôt.

Le geste central de cette refonte est donc un déplacement dans le temps, pas un
habillage : passer du lanceur au **pré-vol, puis compte rendu**.

## Ce que l'interface doit devenir

Trois propriétés, dans cet ordre. Elles servent à trancher : une tâche qui n'en
sert aucune n'entre pas dans ce plan.

**Lisible.** Ce que l'export a produit, ce qu'il a laissé tomber et où il l'a
écrit se lisent sans défiler et sans ouvrir le JSON. Un avertissement se
distingue d'un constat par sa place et sa couleur, jamais par un caractère de
puce.

**Simple à utiliser.** Un composant sélectionné, une action évidente, un résultat
qui dit l'étape suivante. Aucun réglage que rien n'oblige à régler, et aucun clic
qui ne décide de rien.

**Conforme aux conventions graphiques de Figma.** Le plugin est une fenêtre dans
l'outil, pas une application à part : couleurs prises aux variables
`--figma-color-*`, thème clair et sombre suivis sans intervention, densité et
tailles de contrôle de l'hôte, aucune couleur de marque propre.

## Règles de travail

**1. Ne jamais modifier le document Figma.** L'invariant du projet
([AGENTS.md](./AGENTS.md)). La sélection et le viewport sont un cas à trancher
explicitement, pas à supposer : c'est U4.5.

**2. L'UI reste du DOM natif.** `src/ui/index.js` est bundlé par esbuild puis
inliné dans un HTML unique (`scripts/build-ui.cjs`, tenu par
`tests/buildUi.test.ts`). Pas de framework : le choix est déjà écrit dans
`src/ui/components/Button.js`.

**3. Aucune couleur codée en dur qui décide.** Les replis en dur servent au
développement hors de Figma ; ils ne doivent jamais être le chemin normal, et
chacun doit tenir dans les deux thèmes (U1.8).

**4. Tout message visible suit les règles de rédaction.**
[CONTRIBUTING.md](./CONTRIBUTING.md), section « Messages destinés au designer »,
et la skill `rediger-diagnostics-ucm`. Un message qui ne demande aucun geste est
une NOTE, et une note ne se range pas sous un titre qui réclame une correction.

**5. La logique sort du DOM pour être testable.** Aucun test n'exerce aujourd'hui
`index.js`, `ConfigurationPage.js`, `Header.js` ni `LogPanel.js` : cette refonte
ajoute de la logique sans filet. La réponse n'est pas un harnais DOM — c'est de
tenir hors du DOM ce qui décide (tri des messages, état de la cible, traduction
d'une erreur réseau) et de tester ces fonctions. Voir U4.6.

**6. Une tâche, une session, un résultat écrit.** Si une session ne peut pas
démarrer du seul plan, c'est le plan qu'il faut corriger.

---

## Phase U0 — Ce qui se corrige sans discussion

Six corrections. Cinq ne demandaient aucune décision et tenaient dans une
session ; U0.5 attendait une décision qui n'appartenait pas à ce plan.

**Faite en entier le 5 septembre 2026**, y compris U0.5 : la décision de langue
qu'elle attendait a été prise le même jour, hors de ce document — le français
reste ([PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md), préambule de la
Phase 8). Deux choses sont sorties de l'exécution et valent pour la suite : le
geste écrit pour U0.2 n'aurait pas corrigé le défaut qu'il visait (voir là-bas),
et U0.6 a livré un type qui CONTRAINT au lieu de documenter, parce qu'une seule
porte le fait respecter.

- [X] **U0.1 — La version de schéma ne doit plus s'effacer.** Le sandbox écrit
      `Schéma de contrat 12.0.` comme première ligne du journal (`code.ts`, à la
      réception de `ui-ready`) ; `requestExport` appelle `logPanel.clear()` au
      début de chaque export. Le garde-fou contre un bundle Figma périmé
      disparaît donc **au premier clic** — exactement le cas qu'il existe pour
      couvrir, puisqu'un export « sans changement » devient alors indiscernable
      d'un plugin obsolète. Geste : sortir la version du journal, la poser en
      pied de page fixe.
      *Fait.* Elle voyage par un message à elle (`schema-version`) plutôt que par
      une ligne de journal, et le pied de page reste CACHÉ tant que le sandbox
      n'a rien dit : une version écrite en dur dans l'UI par défaut serait une
      seconde autorité, et c'est le défaut que ce bloc existe pour révéler.

- [X] **U0.2 — Une seule région annoncée.** La note (`statusNote` dans
      `ui/index.js`) et le journal (`createLogPanel`) portent tous deux
      `aria-live="polite"`, et le message `status` écrit dans les deux : un
      lecteur d'écran annonce deux fois le même texte. Geste : la note reste
      l'unique annonceur, le journal passe en `role="log"` sans `aria-live`. Les
      régions des erreurs de champ (`createField` et le `status` de
      `createConfigurationPage`) sont légitimes : ne pas y toucher.
      *Fait, et le geste écrit ici était faux :* `role="log"` porte un
      `aria-live="polite"` **implicite**. Retirer l'attribut, comme demandé,
      aurait laissé la double annonce en place tout en donnant le sentiment de
      l'avoir supprimée — le pire des deux états. Il faut l'écraser
      explicitement : `role="log"` **et** `aria-live="off"`. C'est la seule
      valeur d'`aria-live` qui doive apparaître dans `LogPanel.js`, et le
      commentaire du fichier dit pourquoi, pour que personne ne la « nettoie ».

- [X] **U0.3 — Le sous-titre suit la page affichée.** `showConfiguration` change
      la carte mais laisse « Transformez vos composants Figma en contrats
      exploitables » au-dessus d'un formulaire GitHub — le sous-titre n'étant
      écrit qu'une fois, dans `createHeader`. Geste : titre et sous-titre pilotés
      par la page.
      *Fait.* `createHeader` prend désormais une PAGE (`{ title, subtitle }`) et
      rend `setPage` ; les deux pages sont déclarées côte à côte dans `index.js`,
      là où le routage les affiche. Une page ajoutée sans son en-tête se verra :
      elle n'aura pas d'entrée dans cette table.

- [X] **U0.4 — Annoncer l'ouverture du navigateur.** `runExport` appelle
      `openExternal` à chaque pull request créée, sans que rien ne l'ait
      annoncé : trois exports d'affilée ouvrent trois onglets. Geste : le bouton
      dit ce qu'il fait — « Publier et ouvrir la pull request ». Pas une
      préférence : un réglage de plus se règle une fois et se relit à chaque
      ouverture, un libellé exact ne coûte rien.
      *Fait, avec le nom de l'artefact conservé :* « Exporter le composant et
      ouvrir la pull request », « Exporter les tokens et ouvrir la pull
      request » — deux commandes qui ne portent pas sur la même chose ne peuvent
      pas partager un libellé. Le repli en téléchargement local n'est PAS annoncé
      ici : c'est U2.5, et le dire deux fois donnerait deux endroits à corriger
      le jour où il change.

- [X] **U0.5 — Une seule langue, une fois la langue tranchée.** Le constat est
      net : `Repo URL`, `Base branch`, `Components path`, `Tokens path` (les cinq
      appels à `createField` de `ConfigurationPage.js`) sont en anglais dans une
      interface dont tout le reste est en français. **Mais le geste ne va plus de
      soi**, et cette tâche est la seule de la phase U0 qui soit bloquée : T4.4 a
      tranché la distribution en faveur de la **Figma Community**, ce que la
      Phase 8 de [PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md) désigne
      comme le seul événement rouvrant la langue du projet — et elle exige de
      trancher **à ce moment-là**, pas après. Traduire ces quatre libellés en
      français serait donc peut-être un geste à refaire en sens inverse.
      Geste : attendre la décision de langue, puis appliquer **une** langue à
      toute l'interface. Ce qui reste vrai dans les deux cas, et se fait sans
      attendre : les libellés ne doivent pas être moitié dans l'une, moitié dans
      l'autre.
      *Débloquée puis faite le 5 septembre 2026 :* la décision est tombée — le
      français reste. Les quatre libellés passent en français ; **« Personal
      Access Token » n'est pas une exception laissée en route**, c'est le nom que
      GitHub donne à la chose, et le traduire enverrait le designer chercher dans
      ses réglages un intitulé qui n'y figure pas. La règle appliquée est « une
      seule langue », pas « aucun mot d'anglais ».

- [X] **U0.6 — Un seul domicile pour les messages sandbox ↔ UI.** Les demandes
      de l'UI sont typées (`UiRequest`, `code.ts`) ; les messages qui vont dans
      l'autre sens ne le sont nulle part, et l'UI les reconnaît par une suite de
      `if` sur `message.type` dans son `onmessage` : `settings`,
      `settings-validation`, `settings-save-error`, `connection`, `log`,
      `status`, `note`, `download`, `pull-request`. La suite de ce plan en ajoute
      plusieurs, dont des structures et non plus des phrases — et U4.1 a besoin
      qu'un message `log` porte enfin son niveau, que `runExport` perd
      aujourd'hui en route : avertissements `⚠︎` et notes `•` partent sans
      niveau, arrivent tous en `log-info`, et aucune règle de `styles.css` ne
      stylise cette classe. Geste : déclarer les deux sens dans un seul type,
      **avant** d'en ajouter un dixième. L'UI est en JavaScript, donc ce type ne
      la contraint pas ; il vaut comme domicile unique de la liste (voir U6.2).
      *Fait — `src/messages.ts`, `UiRequest` et `PluginMessage`.* Et un type
      déclaré n'aurait rien contraint du tout : `figma.ui.postMessage` accepte
      n'importe quoi, donc un dixième type inventé serait parti sans erreur, pour
      n'être écouté par personne. Le sandbox envoie désormais par une PORTE
      unique — `versUi(message: PluginMessage)` —, et c'est elle qui rend la
      liste contraignante côté sandbox. Éprouvé : un type de message inventé fait
      échouer `tsc`, qui le nomme et propose le bon. `log` porte son champ
      `level` (déclaré ici, renseigné par U4.1) et l'UI le lit déjà : un champ
      qu'un seul côté connaît n'est pas un domicile commun.
---

## Phase U1 — La hiérarchie, puis le socle graphique

Ce que `styles.css` fait déjà juste, et qu'il ne faut pas défaire : toutes les
couleurs passent par `--figma-color-*` avec un repli ; `themeColors: true` est
demandé à `figma.showUI` ; `color-scheme: light dark` est posé sur `:root` ;
`scrollbar-gutter: stable` empêche la barre d'ascenseur de décaler l'interface ;
les tailles de contrôle sont déjà proches des conventions Figma.

Ce qui manque n'est pas de la mise en forme, c'est une **décision de
hiérarchie**. Aujourd'hui les trois zones sont la même `.card`, tout le texte est
en 12 px, et la seule variation de taille est un titre à 16 px : la hiérarchie
n'est pas mauvaise, elle est absente. Les quatre premières tâches produisent de
quoi juger ; les six suivantes exécutent.

### U1.0 à U1.3 — De quoi juger la qualité de l'UI

**Faites en entier le 5 septembre 2026**, dans l'ordre, et sans produire une
ligne de style. Deux d'entre elles ont changé ce qui suit : la hiérarchie a
gagné une **troisième borne** que personne n'avait vue en la raisonnant, et
l'inventaire a trouvé l'interface plus pauvre que la liste qui l'annonçait —
plusieurs situations distinctes n'y ont qu'un seul écran, et l'une des deux
tâches qui prétendaient les distinguer n'a rien à distinguer.

- [X] **U1.0 — Écrire la hiérarchie de l'information, et la borner.** C'est le
      livrable contre lequel tout le reste se vérifie ; sans lui, « cet élément
      ressort-il assez ? » n'a pas de réponse vérifiable. Trois rangs — ce qui
      décide de l'action, ce sur quoi on agit, ce qui informe sans rien
      demander — et le moyen visuel de chacun.
      *Faite, et la table a DÉMÉNAGÉ.* Elle vit désormais dans
      [CONTRIBUTING.md](./CONTRIBUTING.md#interface-du-plugin), pas ici : une
      règle en vigueur n'habite pas un plan qui sera coché puis archivé, et la
      recopier aux deux endroits reviendrait à créer la seconde autorité au
      désaccord muet que ce projet poursuit partout ailleurs.
      **La troisième borne vient des captures de U1.1, pas du raisonnement :**
      *un rang 1 hors de vue n'est pas un rang 1.* La fenêtre fait 500 px et,
      **au repos, avant tout résultat, l'interface les dépasse déjà**. Le verdict
      d'un export, le lien de sa pull request et le bouton « Enregistrer » de la
      configuration sont sous la ligne de flottaison. La position est le signal
      du rang 1 ; elle ne signale plus rien quand elle est hors du cadre.

- [X] **U1.1 — Inventorier les états, les dessiner, les regarder.** C'est
      l'équivalent UI d'un jeu de fixtures, et le seul moyen de répondre
      autrement que par une opinion. Geste : rendre chaque état atteignable, le
      capturer **dans les deux thèmes**, et confronter chaque capture à la table
      de U1.0. Un état qui n'a pas été regardé n'est pas conçu.
      *Faite — `packages/plugin/galerie/`, et l'inventaire n'est pas une liste
      en prose.* Une liste en prose ne rend rien atteignable et vieillit sans
      rougir. Ici chaque état déclare la **suite exacte de messages** qui le
      produit, et `build-galerie.cjs` rejoue cette suite dans l'interface RÉELLE
      que le build vient de fabriquer : rien n'est redessiné, donc rien ne peut
      diverger de ce que le designer voit. `capturer.cjs` photographie le tout
      avec le Chrome du poste — aucune dépendance ajoutée —, et
      `tests/galerie.test.ts` refuse qu'un message déclaré dans `messages.ts`
      n'ait aucun écran où être regardé : c'est ce qui interdit à une phase
      suivante d'ajouter un état en silence, comme l'ordre d'exécution l'exige.
      **25 situations déclarées, 21 ont un écran, 4 n'en ont aucun** — la
      publication en cours et l'analyse par phase (U2.6), l'annonce du premier
      lancement (U2.5), l'annulation (U3.4). Cette moitié-là est la plus utile :
      c'est celle qu'une capture ne peut pas montrer.
      **Ce que le regard a trouvé, et que le code seul ne disait pas :**
      **(1)** deux situations que ce plan croyait distinctes ont le **même
      écran** — « aucune sélection » et « sélection non exportable » reçoivent le
      message identique de `reportSelectionState`, et « résultat propre » et
      « publiée » sont le même instant ;
      **(2)** le journal défile vers sa fin à chaque ligne ajoutée
      (`content.scrollTop = content.scrollHeight`), si bien que **les
      avertissements sont exactement ce qu'il cache** : à vingt avertissements,
      la capture est identique à celle d'un seul — seul le compte, dans la note,
      change. Le canal du rang 2 escamote le rang 2 ;
      **(3)** au repos, sans résultat, l'écran porte **onze objets pour zéro
      décision** et déborde déjà de la fenêtre ;
      **(4)** les deux boutons promettent « et ouvrir la pull request » **pendant
      que la pastille dit « repository non connecté »** — le libellé exact de
      U0.4 devient un libellé faux dans le seul état où il compte (U2.5) ;
      **(5)** « Aucun changement … : aucune PR créée » est peint en **vert de
      succès**, alors qu'il annonce, depuis T4.5, un travail qui attend d'être
      fusionné ailleurs ;
      **(6)** tout message `status` s'écrit **deux fois** — note et journal, mot
      pour mot, à quinze pixels d'écart ;
      **(7)** en thème sombre, la gouttière d'ascenseur reste claire : elle suit
      `prefers-color-scheme`, que `color-scheme: light dark` délègue au
      navigateur, et non la classe de thème que Figma pose. **À vérifier dans
      Figma** avant d'en conclure quoi que ce soit — c'est U1.8.

- [X] **U1.2 — Auditer chaque élément sur sa fonction.** Un seul test, appliqué à
      tout ce qui est à l'écran : *quelle décision du designer cet élément
      sert-il, à son cinquantième export ?* Ce qui n'y répond pas sort.
      *Faite, sur les captures et non sur le code.* Le relevé du plan tenait ;
      les captures l'ont complété, et une divergence réelle est apparue là où
      personne ne regardait.

      | Élément | La décision qu'il sert au cinquantième export | Verdict |
      |---|---|---|
      | Pastille de connexion | savoir si l'export publiera ou téléchargera | garde — mais descend sous le titre, et devient cliquable (U5.2) |
      | Engrenage / bouton « Retour » | naviguer | garde — un seul emplacement, une seule forme, quelle que soit la page |
      | Titre « Unified Component Exporter » | aucune | sort, si la fenêtre de Figma porte déjà le nom du plugin — **à vérifier sur une capture réelle** avant de le retirer |
      | Sous-titre « Transformez vos composants… » | aucune | sort — plaquette commerciale, et il occupe la place du rang 1 |
      | Titre de section « Actions » | aucune | sort — il nomme l'évidence au-dessus de deux boutons |
      | Bouton composant | lancer l'action | garde — mais ne promet plus ce que l'état ne peut pas tenir (U2.5) |
      | Bouton tokens | lancer une action de portée *fichier* | garde — cesse de ressembler au premier (U2.3) |
      | Note d'état | trois choses à la fois : la cible, le verdict, l'avertissement | **éclate** — rangs 1 et 2 mêlés dans un bloc de rang 3 |
      | Titre « Journal » | aucune, tant que le journal est le seul canal | suit le sort du journal (U4.2) |
      | « Les messages de l'outil … apparaissent ici » | aucune | sort — il explique un journal à qui en a vu mille |
      | Marqueurs « Erreur : » et « OK : » des lignes | aucune | sortent — la couleur le dit déjà, et sur l'erreur d'interface ils produisent « Erreur : Erreur UI : … » |
      | Pied de page « Schéma de contrat 12.0 » | douter d'un bundle périmé | garde — rang 3, discret, jamais effacé (U0.1) |
      | Carte « Configuration du repository » | aucune | sort — elle répète le titre de la page qui la porte |
      | Chemins des composants et des tokens | rien, dès qu'un `ucm.config.json` existe | deviennent des replis explicites (U5.1) |
      | Bouton « Enregistrer » et son statut | conclure la configuration | gardent — mais **hors de vue aujourd'hui** : il faut défiler pour enregistrer, et pour lire que ça a marché |

      **La divergence trouvée en auditant :** les valeurs par défaut des
      réglages sont écrites DEUX fois — `loadPublicSettings` dans `config.ts` et
      `populate` dans `ConfigurationPage.js` —, et les deux écritures ne disent
      déjà pas la même chose : `config.ts` conserve une chaîne vide,
      `populate` la remplace par `main`, `src/components`, `src/tokens`. Une
      branche de base délibérément vidée se réaffiche donc « main » à la
      réouverture. C'est le défaut favori de ce dépôt — deux autorités, un
      désaccord muet — et son domicile naturel est U5.1, qui traite déjà de qui
      gouverne ces valeurs.

- [X] **U1.3 — Écrire le protocole de relecture, et le tenir court.** Une
      vérification qui coûte cher ne se fait qu'une fois. Cinq points, à passer
      sur les captures de U1.1.
      *Fait — il vit dans
      [CONTRIBUTING.md](./CONTRIBUTING.md#interface-du-plugin), avec la table.*
      Les cinq points sont ceux de l'énoncé ; un seul a changé de statut. Le
      **(b)**, le contraste des textes de sévérité dans les deux thèmes, **ne se
      passe pas sur la galerie** : ses couleurs viennent d'un décalque approché
      des variables `--figma-color-*`, et conclure sur un contraste à partir
      d'une approximation reviendrait à vérifier son propre décalque. Il se
      passe dans Figma, et c'est U1.8. Les quatre autres — la comparaison à un
      panneau natif, la plus petite fenêtre, le pire contenu réel, le compte des
      objets — se passent sur les captures, et l'ont déjà été : le compte des
      objets est **onze au repos** et la douzaine est franchie dès le premier
      résultat.

### U1.4 à U1.10 — Le socle

**Fait en entier le 5 septembre 2026**, contre la table de U1.0 et en repassant
le protocole de relecture sur les captures des deux thèmes. Trois choses en sont
sorties qui dépassent la mise en forme : le socle a rendu la ligne de flottaison
à l'écran de travail, `styles.css` a cessé d'être un endroit où une couleur se
décide, et deux tests neufs empêchent désormais la feuille et le DOM de
diverger. Un fait de plateforme a par ailleurs été vérifié et il change U1.10 :
**Figma ne redimensionne aucune fenêtre de plugin de lui-même.**

- [X] **U1.4 — Descendre la base typographique à 11 px.** `:root` fixait
      `font-size: 12px`, là où l'interface de Figma est à 11 px : le plugin
      paraissait plus gros que son hôte, et l'incohérence était déjà dans le
      fichier — `.field-error` et `.log-panel-inner` redescendaient localement à
      11 px. Geste : 11 px de base, une échelle à trois crans seulement (corps,
      libellé, titre de page), interlignes multiples de 4.
      *Fait :* 11/16 pour le corps, 12/16 pour un libellé, 15/20 pour le titre
      de page. Les trois crans sont des variables ; aucune règle ne fixe plus
      une taille.

- [X] **U1.5 — Une trame de 4 px.** Cohabitaient `gap: 12px`, `padding: 16px`,
      `gap: 10px`, `padding: 9px 10px`, `min-height: 54px`. Geste : n'employer
      que 4, 8, 12, 16, et une variable par rôle d'espacement plutôt qu'une
      valeur par endroit.
      *Fait :* quatre rôles — page, bloc, contrôle, serré — et plus une seule
      valeur d'espacement écrite dans une règle.

- [X] **U1.6 — Deux hauteurs de contrôle, pas trois.** `.btn` faisait 32 px,
      `.icon-button` 30, `.header-back-button` 30, `.input` 32. Geste : 24 px
      pour les contrôles secondaires, 32 px pour les actions et les champs.
      *Fait,* et les deux contrôles secondaires partagent maintenant une seule
      règle : ils avaient deux déclarations quasi identiques, donc deux endroits
      où les faire diverger.

- [X] **U1.7 — Dépenser bordure et fond par rôle.** Actions, journal et
      configuration étaient la même `.card` — bordure, fond secondaire, rayon
      8 px —, donc trois zones de poids visuel égal et aucune hiérarchie.
      Geste : la zone d'action porte le poids ; le compte rendu vit sur le fond
      de la page ; la configuration est un formulaire, pas une carte.
      **Ce que U1.1 avait ajouté :** ces trois cartes ne coûtaient pas que de la
      hiérarchie, elles coûtaient de la HAUTEUR.
      *Fait, et le calcul était juste.* Avec les deux cartes de trop, le titre
      « Actions », la phrase qui explique le journal et le sous-titre de
      plaquette, l'écran de travail **tient désormais dans les 500 px** — au
      repos comme après un résultat, avertissement compris. Il en portait onze
      objets pour zéro décision ; il en porte neuf, et le pied de page est
      poussé en bas de la fenêtre au lieu de flotter après le dernier bloc : sa
      place ne dépend plus de la longueur du journal.

- [X] **U1.8 — Relire chaque repli en dur en thème sombre.** Les replis étaient
      écrits pour le thème clair (`#fff`, `#f5f5f5`, `#fff1d6`) et répétés à
      chaque règle. Si la variable Figma correspondante n'est pas servie par la
      version de l'hôte, c'est cette valeur claire qui s'applique **en thème
      sombre**, et le texte devient illisible.
      *Fait, mais pas par le geste écrit.* Le geste demandait de vérifier dans
      Figma quelles variables sont servies, puis de choisir pour les autres un
      repli qui tienne dans les deux thèmes. **Un tel repli n'existe pas** : une
      couleur de fond ne peut pas être à la fois claire et sombre. La réponse
      est de donner au repli le même thème qu'à la variable — les seize rôles de
      couleur sont déclarés une fois dans `:root` avec un repli clair, et
      redéclarés sous `.figma-dark`, la classe que Figma pose sur `html`, avec
      un repli sombre. Le défaut est donc clos **par construction**, sans
      dépendre de la liste des variables servies par telle version de l'hôte ;
      et si cette classe manquait, le repli clair s'appliquerait comme
      auparavant — ce socle ne peut pas faire pire que ce qu'il remplace.
      `prefers-color-scheme` a été écarté : il dit le thème du système, pas
      celui de Figma, et un éditeur clair sur un système sombre recevrait alors
      des replis sombres.
      **Ce qui n'a pas été fait, et où il vit désormais :** regarder le résultat
      dans Figma. C'est le point (b) du protocole de relecture, une obligation
      qui revient à chaque phase et qui ne pouvait donc pas être la propriété
      d'une tâche qu'on coche une fois. Un test la seconde : `styles.css`
      n'écrit plus aucune couleur hors de son bloc de rôles, et rougit si une
      règle en réintroduit une.

- [X] **U1.9 — Un état de focus partout.** `.btn:focus-visible` existait ;
      `.input`, `.icon-button`, `.header-back-button` et les liens du journal
      n'avaient rien — au clavier, la navigation disparaissait dès qu'elle
      quittait les deux boutons d'action.
      *Fait,* par une règle unique qui les nomme tous les cinq.

- [X] **U1.10 — Fenêtre redimensionnable, taille mémorisée.** `figma.showUI`
      figeait 380 × 500. **À vérifier d'abord :** les bornes que la plateforme
      impose, avant d'annoncer quoi que ce soit.
      *Vérifié, et la vérification a changé la tâche.* La documentation de
      `figma.ui.resize` donne un minimum de **70 × 0** et ne décrit **aucun
      redimensionnement natif** : une fenêtre de plugin ne bouge que si le
      plugin dessine lui-même une poignée. Les deux faits comptent — le premier
      dit que la plateforme ne protège de rien, le second qu'il fallait ajouter
      un objet à l'écran.
      *Fait :* une poignée dans le coin, un message `resize` de plus dans
      `UiRequest`, et `src/fenetre.ts` qui borne, applique et range la taille
      dans `figma.clientStorage`. La borne du plugin — 320 × 320, la taille en
      dessous de laquelle plus un libellé ne tient — est écrite **une seule
      fois** : la poignée envoie ce que le pointeur dit, sans rien borner, parce
      qu'une borne recopiée dans l'UI serait la seconde autorité au désaccord
      muet. `tests/fenetre.test.ts` tient cette responsabilité, puisqu'elle
      n'est écrite que là.
      La fenêtre s'ouvre à sa taille par défaut puis reprend celle qui est
      rangée : `showUI` est synchrone et doit partir tout de suite, quand
      `clientStorage` ne répond qu'après. Ouvrir petit puis agrandir se voit ;
      ne pas ouvrir du tout se voit davantage.

**Deux tests neufs, et ce qu'ils ont trouvé en naissant.**
`tests/stylesUi.test.ts` exige que toute classe posée par l'UI ait une règle et
que toute règle vise une classe posée. Il a trouvé quatre divergences déjà
installées : `.config-title-row` stylisait un élément qui n'existe plus,
`space-y-1` et `log-panel` étaient posées sans qu'aucune règle les suive, et
surtout **`log-info` n'était stylisée nulle part** — c'est-à-dire la classe
censée distinguer une note d'un avertissement. Il a aussi révélé que
`createButton` portait une option `icon` que personne n'a jamais passée et que
rien n'aurait su rendre : une capacité qui n'existe qu'à moitié se découvre le
jour où l'on s'en sert, elle est retirée. Enfin, `index.js` passait l'état d'un
message `status` comme niveau de journal : `loading` n'est pas un `LogLevel`, et
la classe `log-loading` qui en sortait n'était stylisée nulle part non plus.

**Ce que le socle n'a pas pu régler, et qui appartient à U5.1.** La page de
configuration dépasse encore les 500 px : cinq champs obligatoires, dont deux
que le dépôt contredit dès qu'il se décrit lui-même. Retirer la hauteur réservée
sous chaque champ — la même doctrine que pour la note : la stabilité vient de la
place du bloc, pas d'un vide permanent — a ramené le bouton « Enregistrer » à la
limite de l'écran, pas au-dessus. C'est U5.1 qui raccourcira ce formulaire, en
rendant les deux chemins facultatifs.

---

## Phase U2 — L'écran de travail

- [X] **U2.1 — La cible reste affichée.** Le nom du composant n'existe que dans
      la note de sélection (`reportSelectionState`), il est écrasé au clic
      (`requestExport`), et le message de succès ne le renomme pas. Geste : un
      bloc cible persistant — nom Figma, type (`COMPONENT` ou `COMPONENT_SET`),
      nombre de variants. `reportSelectionState` tient déjà le node : il lui
      suffit d'envoyer une structure au lieu d'une phrase. Dépend de U0.6.
      *Faite le 5 septembre 2026 — `src/cible.ts` et le bloc en tête d'écran.*
      La cible part MAINTENANT, avant le balayage de page : son nom, son genre
      et ses variants sont connus sans rien lire, et attendre l'avertissement
      pour les afficher faisait patienter devant un écran vide. Deux
      conséquences non prévues par l'énoncé. Les trois empêchements — rien de
      sélectionné, plusieurs layers, un layer qui n'est pas un composant —
      étaient un seul message ; ils sont trois raisons distinctes, parce que le
      geste diffère, et c'est la galerie qui l'a montré en produisant deux
      captures identiques. Et le message `note` a disparu de `messages.ts` :
      plus personne ne l'émettait, un type déclaré que rien n'envoie est
      exactement ce que U0.6 existe pour empêcher.

- [X] **U2.2 — La destination reste affichée.** Elle n'apparaît qu'après
      publication, parce que `repositoryLayout` n'est appelé que depuis
      `publishArtifact`. Geste : afficher `owner/repo · branche · chemin`, avec
      la source du chemin — `ucm.config.json` ou réglages du plugin. Dépend de
      U5.1.
      *Faite le 5 septembre 2026.* Deux lignes de rang 3 sous la zone d'action :
      `mon-org/design-system-v3 · main`, puis les deux chemins. Elles sont
      composées par `etatDuDepot`, avec la phrase de la configuration : une
      seule lecture du dépôt, deux endroits où elle sert.

- [X] **U2.3 — Deux commandes inégales ne se ressemblent pas.** L'export
      composant exige une sélection (`getSelectedComponent`) ; l'export tokens
      lit les variables locales du fichier entier et ignore la sélection. Les
      deux boutons partagent pourtant une carte, une note qui parle de
      sélection, et le même `setBusy`. **Ce n'est pas un défaut caché** : la
      précondition lève un message clair, remonté en erreur par `runExport`.
      C'est un aller-retour évitable, et la valeur de cette tâche est celle-là,
      pas davantage. Geste : le bouton composant se désactive quand la sélection
      n'est pas exportable, la raison juste sous lui ; l'export tokens devient
      une action distincte, avec son propre résumé.
      *Faite le 5 septembre 2026, avec un écart assumé :* la raison n'est pas
      répétée sous le bouton. Elle est écrite dans le bloc cible de U2.1, juste
      au-dessus, et deux textes pour un même fait en feraient deux à tenir. Les
      deux commandes ne partagent plus ni surface ni note : les tokens ont leur
      section, en bas, séparée par un filet.

- [X] **U2.4 — Les tokens disent ce qu'ils vont emporter.** C'est un export de
      portée *fichier*, et rien à l'écran n'en dit la taille. Geste : au
      chargement, `getLocalVariableCollectionsAsync` et
      `getLocalVariablesAsync` — déjà appelés par `exportTokens` — donnent
      `N collections · N variables · N modes`.
      *Faite le 5 septembre 2026.* Le compte se lit sur les collections seules :
      elles portent déjà leurs identifiants de variables et leurs modes, donc
      `getLocalVariablesAsync` n'est pas payé à l'ouverture. Les modes ne sont
      comptés que s'il y en a plusieurs, un « 1 mode » n'apprenant rien : c'est
      au-delà de un que le contrat publie `com.ucm.modes`.

- [X] **U2.5 — Le premier lancement dit ce qui va se passer.** Sans dépôt
      configuré, `runExport` retombe sur le téléchargement local : un
      comportement correct, mais **subi**, découvert à l'arrivée. Geste : un état
      de premier lancement — « Aucun dépôt connecté : l'export sera téléchargé
      sur votre poste » — et l'accès à la configuration. Le repli devient un mode
      choisi.
      *Faite le 5 septembre 2026 :* c'est la même ligne que U2.2, qui dit ce qui
      VA se passer au lieu de la destination. L'accès à la configuration n'a pas
      été redoublé — la pastille est un bouton depuis U5.2, et elle est juste
      au-dessus.
      **Ce que U1.1 a ajouté, et qui rend la tâche plus urgente :** les deux
      boutons promettent « et ouvrir la pull request » **pendant que la pastille
      dit « repository non connecté »**. Le libellé exact gagné par U0.4 devient
      donc un libellé FAUX dans le seul état où il décide de quelque chose. Ce
      qu'un bouton promet doit suivre l'état de la cible, pas seulement le nom de
      l'artefact.

- [X] **U2.6 — Des phases pendant l'attente.** L'export charge toutes les pages
      puis résout trois fois le même maître par dépendance : un coût nommé et
      **non mesuré** ([ROADMAP.md](./ROADMAP.md), « Fragilités connues »). Un
      seul « Analyse du composant… » figé pendant plusieurs secondes se lit comme
      un plantage. Geste : un statut par phase — pages, variantes, composition,
      écriture. **Nommer les phases par ce que le code fait, jamais par une durée
      ni un pourcentage** : la mesure n'existe pas, et une barre de progression
      inventerait une précision qu'on n'a pas. Bénéfice second : cette mesure
      manquante obtient enfin un endroit où s'observer.
      *Faite le 5 septembre 2026.* Le moteur ANNONCE, il ne décide de rien : les
      deux orchestrations reçoivent un `annoncer` optionnel et nomment quatre
      étapes pour un composant, deux pour les tokens ; `code.ts` en fait un
      message, et lui seul. C'est la seule entorse de cette phase à la frontière
      du moteur, et elle n'ajoute aucune décision — un handler appelé sans
      `annoncer` se comporte exactement comme avant.
      Les étapes vont dans la NOTE et pas dans le journal : quatre lignes de
      déroulé par export noieraient les avertissements, qui sont la seule chose
      de ce journal qui demande un geste. L'attente de publication porte enfin
      un nom à elle, plus rien ne se lisant dans Figma à ce moment.

---

## Phase U3 — Le pré-vol

Le cœur fonctionnel. Aujourd'hui, un clic enchaîne calcul, comparaison, création
de branche, commit, pull request et ouverture du navigateur (`runExport`). Le
designer lit donc les avertissements après que tout a été écrit ; il corrige dans
Figma, réexporte, et obtient une seconde pull request tandis que la première
reste ouverte.

- [X] **U3.0 — La pull request dupliquée n'est pas détectée, par
      construction.** **Close le 5 septembre 2026, hors de ce document :** le bug
      a été promu en **T4.5** du
      [plan d'industrialisation](./PLAN-INDUSTRIALISATION.md), parce qu'il est du
      domaine de la Phase 4 et qu'il devait passer AVANT la Phase 7. Ce qui a été
      fait, ce que l'implémentation a trouvé en plus de l'énoncé et ce qui a été
      délibérément laissé de côté se lisent là-bas ; ce qui suit est l'énoncé
      d'origine, gardé parce que la suite de cette phase s'y adosse. Pour U3.1 et
      U3.2, retenir la forme acquise : la lecture des exports en vol s'appelle
      désormais `exportsEnVol`, elle rend `{ contenu, ou, url }`, elle vaut pour
      les DEUX genres d'artefact, et le verdict `unchanged` de `publishArtifact`
      porte maintenant l'endroit (`ou`) et l'URL de la pull request quand c'en
      est une — le pré-vol a donc déjà de quoi dire « identique » et où.
      C'est un bug fonctionnel, pas de l'UX, et il précède tout
      le reste de cette phase. Le contrôle d'immobilité lit le fichier **sur la
      branche de base seulement** : `getRepositoryFile` prend `config.baseBranch`
      comme `ref` par défaut, et `publishArtifact` l'appelle sans `ref`. Les
      branches des pull requests d'export ouvertes ne sont donc jamais comparées
      — alors que `contratsEnVol` sait déjà les énumérer et lire le fichier sur
      chacune, mais ne sert qu'à refuser une collision d'identité ; quand
      l'identité est la même, `refusDeCollision` rend `null`. Conséquence :
      réexporter un contrat **strictement identique** pendant qu'une pull request
      d'export du même contenu est ouverte crée une seconde pull request
      dupliquée, sans un mot. Geste : comparer aussi aux branches en vol, et le
      dire. Ce n'est **pas** un refus — réexporter après correction est le geste
      normal, et c'est celui que cette phase encourage — c'est une information que
      seul le pré-vol peut donner à temps. Risque de régression :
      `tests/github.test.ts` couvre `publishArtifact`, `repositoryLayout`,
      `contratsEnVol` et `refusDeCollision` en détail ; étendre la comparaison,
      ne pas la dupliquer.

- [ ] **U3.1 — Scinder « analyser » et « publier ».** Geste : l'analyse produit
      le contrat en mémoire et n'écrit rien ; la publication consomme ce
      résultat. Trois contraintes, chacune répondant à une objection de la
      revue :
      **(a) Le cas nominal ne coûte pas un clic pour rien.** L'analyse est le
      seul bouton de départ, et la publication n'apparaît que dans son résultat,
      en action principale focalisée. Un clic de plus uniquement quand il y a
      effectivement quelque chose à publier ; un export sans changement n'atteint
      jamais la publication. Le gain payé par ce clic est réel : un avertissement
      corrigé avant publication supprime une pull request orpheline et un tour de
      revue.
      **(b) L'analyse n'est pas la source de vérité.** Le dépôt a pu bouger entre
      les deux étapes — quelqu'un a fusionné, une branche est apparue. La
      publication **revérifie** immobilité et collision ; l'analyse, elle,
      informe. Sans cette règle, le pré-vol devient une lecture périmée qui
      autorise une écriture.
      **(c) L'analyse doit refaire tout le chemin de lecture**, pas seulement le
      test d'égalité : `repositoryLayout`, puis `exportsEnVol` — pour les DEUX
      genres d'artefact depuis U3.0, la collision restant, elle, réservée aux
      contrats. Un pré-vol qui annoncerait « rien à changer » sans avoir vu une
      collision d'identifiant mentirait sur le seul point qui, lui, est un vrai
      refus.
      Geste d'implémentation : extraire une sous-fonction de lecture partagée par
      les deux étapes, jamais dupliquer le chemin — deux lectures du layout
      divergeraient en silence, ce que T4.1 a refermé ailleurs.

- [ ] **U3.2 — Dire « identique » avant d'écrire.** L'immobilité est déjà
      détectée dans `publishArtifact`, mais à l'intérieur du chemin d'écriture.
      Geste : la rendre lisible au pré-vol. Dépend de U3.0 et U3.1.
      **Ce que U1.1 a ajouté :** aujourd'hui « Aucun changement … : aucune PR
      créée » est peint en VERT DE SUCCÈS. Depuis T4.5, ce verdict annonce aussi
      un travail qui attend d'être fusionné dans une pull request ouverte —
      c'est un état à comprendre, pas une réussite. La couleur ne signale que la
      sévérité : celle-ci est neutre, pas verte.

- [ ] **U3.3 — Une publication qui échoue doit être reprenable.** Sur échec
      GitHub, `runExport` télécharge le fichier localement et `deleteBranch`
      supprime la branche créée : le travail n'est pas perdu, mais l'état de
      l'UI l'est, et le résultat d'analyse a disparu. Geste : garder ce résultat
      et proposer « Réessayer la publication ». Dépend de U3.1.

- [ ] **U3.4 — Pouvoir annuler un export en cours.** Rien n'interrompt un
      export : `setBusy` désactive les boutons et la promesse en vol continue. Un
      export parti sur `loadAllPagesAsync` d'un gros fichier ne laisse d'autre
      recours que fermer le plugin. Geste : une annulation **coopérative**,
      contrôlée entre deux phases — donc à écrire avec U2.6, et à annoncer pour
      ce qu'elle est : elle prend effet à la fin de l'étape en cours, elle
      n'interrompt pas un appel Figma déjà parti. Ne rien publier après une
      annulation. Dépend de U2.6.

---

## Phase U4 — Le compte rendu actionnable

- [X] **U4.1 — Trois groupes au lieu d'un flux.** Le journal mêle dans un ordre
      chronologique la version de schéma, les avertissements `⚠︎`, les notes `•`,
      l'emplacement, un échec GitHub, un téléchargement et le lien de pull
      request — en 11 px monospace, sur 96 à 144 px. La distinction qui structure
      tout le projet — un avertissement demande un geste, une note n'en demande
      aucun (`exportComponent.ts`, `actionableWarnings` contre `exportedInfos`) —
      n'est portée que par le caractère de puce : `runExport` envoie les deux
      sans niveau, tout arrive en `log-info`, et aucune règle de `styles.css` ne
      stylise cette classe. Geste : « À corriger dans Figma (N) », « Constats
      (N) », « Publication ».
      **Statut de cet ordre :** c'est une **adaptation** de la règle de
      [CONTRIBUTING.md](./CONTRIBUTING.md), pas son application littérale — la
      règle est écrite pour un rapport agrégé de CI, pas pour le résultat d'un
      export unique. L'adaptation garde ce qui la motive : le problème avant le
      détail, le geste séparé du constat. Dépend de U0.6.
      **Ce que U1.1 a ajouté :** le journal défile vers sa fin à chaque ligne
      (`content.scrollTop = content.scrollHeight`), et les avertissements
      arrivent en PREMIER. Ils sont donc exactement ce que le journal escamote :
      la capture d'un export à vingt avertissements est identique à celle d'un
      export à un seul, seul le compte change dans la note. Le canal du rang 2
      cache le rang 2 — un groupe « À corriger dans Figma (N) » ne suffira pas
      s'il hérite du même défilement automatique.
      *Faite le 5 septembre 2026, et l'avertissement ci-dessus était fondé :* le
      compte rendu n'hérite d'aucun défilement, parce qu'il n'est plus une boîte
      à hauteur bornée. Un groupe vide reste caché — un titre à zéro entrée ne
      dit rien —, et le compte est dans le titre : « À corriger dans Figma (20) »
      cesse d'être indiscernable de « (1) ».
      La nature voyage désormais dans le MESSAGE (`diagnostic`) et non dans un
      caractère de puce. Ce qui suit en découle sans effort : ranger une entrée
      dans son groupe ne demande plus aucune logique, donc plus aucun test — le
      meilleur sort qu'on puisse réserver à une décision est de ne pas avoir à
      la prendre.
      **Un doublon trouvé en exécutant :** le verdict s'écrivait deux fois, en
      note et en journal, mot pour mot. La note le porte au rang 1 ; le groupe
      « Publication » porte ce que l'export a FAIT.

- [X] **U4.2 — Un avertissement se lit sans défiler.** Geste : chaque entrée est
      un bloc de hauteur libre, pas une ligne monospace tronquée. La police
      monospace ne sert plus que ce qui est littéral : chemin, nom de calque,
      référence de token. Le journal brut passe derrière un dépliant « Détails
      techniques », pour qui débogue. Les marqueurs « Erreur : » et « OK : » que
      `LogPanel` préfixe disparaissent avec lui : la couleur le dit déjà, et sur
      l'erreur d'interface ils produisent « Erreur : Erreur UI : … ».
      *Faite le 5 septembre 2026.* Chaque avertissement est un bloc à filet de
      sévérité, de hauteur libre. Le journal brut survit replié, comme
      l'arbitrage le recommandait : tant que le plugin n'a pas d'autre canal de
      débogage, la trace chronologique reste la seule façon de comprendre un
      enchaînement, et elle ne coûte plus la lecture de ce qui demande un geste.
      Les marqueurs restent DANS cette trace, où ils ne doublent aucun titre.

- [ ] **U4.3 — Écrire la loi de couverture avant de rendre un lien cliquable.**
      Préalable de U4.4, et la seule tâche de ce plan qui touche au moteur.
      État du code : `exportComponent.ts` fabrique ses `diagnostics` depuis de
      simples `string`, le `code` étant déduit par appartenance à un `Set` ;
      `figma.nodeId`, prévu par le format (`ContractDiagnostic` dans
      `packages/kit/src/format/types.ts`), n'est jamais renseigné.
      **Ce que la revue a corrigé ici.** Le plan soutenait d'abord que l'UI
      pouvait exercer une localisation partielle avant le format, un lien absent
      étant invisible. L'objection tient : la réserve de
      [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md) ne porte pas sur le support de
      publication mais sur la fiabilité du signal, et une UI où certains
      avertissements sont cliquables et d'autres pas enseigne une leçon fausse —
      que l'absence de lien signifie « rien à localiser », quand elle signifie
      « cet extracteur n'a pas encore de node ». C'est le mécanisme que
      [CONTRIBUTING.md](./CONTRIBUTING.md) dénonce pour les notes, transposé au
      lien.
      **La réponse n'est pas d'attendre le collecteur complet, c'est de borner la
      couverture par une loi vérifiable :** *tout avertissement qui nomme un
      calque dans son texte porte le node de ce calque.* Un avertissement qui ne
      nomme aucun calque n'a pas de lien, et son absence n'enseigne rien de faux.
      La loi est testable sur l'ensemble des avertissements produits, comme
      celles de `packages/plugin/tests/lois.ts`.
      Geste : écrire cette loi et son test, puis renseigner le node là où la loi
      l'exige. **Ce que cette tâche ne fait pas :** décider d'écrire
      `figma.nodeId` dans le contrat publié. Le canal de l'UI et le champ du
      format restent deux décisions.

- [ ] **U4.4 — Un avertissement mène à son calque.** Un clic sélectionne le
      calque et l'amène dans le viewport. C'est le pas qui transforme « constat +
      geste » en geste effectué : les messages nomment le calque en prose —
      `flexLayout.ts` écrit « Layer « … » : l'alignement du stroke est
      illisible » — et le designer doit le retrouver à la main dans une matrice de
      trente variants. Dépend de U4.3 et U4.5.

- [ ] **U4.5 — Trancher, et écrire, que sélectionner n'est pas modifier.**
      L'invariant est net : le plugin ne modifie **jamais** le document Figma
      ([AGENTS.md](./AGENTS.md), [CONCEPT.md](./CONCEPT.md)). Poser une sélection
      et déplacer le viewport ne sont pas du contenu de document — rien n'est
      écrit, et aucune entrée d'annulation ne devrait être créée. Geste : **le
      vérifier sur un fichier réel**, puis l'écrire dans la spécification, pour
      que la prochaine relecture n'ait pas à trancher une deuxième fois. Une
      tâche de vérification, pas de code.

- [X] **U4.6 — Tester ce qui décide, pas le DOM.** La logique qui mérite un test
      est celle qui range un message dans un groupe, dérive l'état de la cible,
      ou traduit une erreur réseau en cause affichable. Geste : l'extraire en
      fonctions pures et la tester. C'est la règle de travail 5 appliquée : pas
      de harnais DOM — `buildUi.test.ts` couvre le seul risque de build réel,
      l'inlining du bundle — mais rien de neuf ne doit rester enfermé dans un
      `createElement`.
      *Faite le 5 septembre 2026, et elle s'est faite en chemin.* Les trois
      exemples de l'énoncé ont chacun leur module pur et leur test : `cible.ts`
      dérive l'état de la cible, `connexion.ts` traduit une erreur réseau en
      cause affichable et dit qui gouverne les chemins, et ranger un message
      dans un groupe n'existe plus comme décision — la nature voyage dans le
      message (U4.1). S'y ajoutent `fenetre.ts` pour les bornes de la fenêtre et
      `resumeDesTokens` pour ce qu'un export emporte.
      Deux tests de forme complètent le filet, et ils n'étaient pas prévus :
      `stylesUi.test.ts` interdit qu'une classe posée n'ait pas de règle, ou
      l'inverse ; `galerie.test.ts` interdit qu'un message déclaré n'ait aucun
      écran où être regardé. Aucun des deux n'exerce le DOM.

---

## Phase U5 — La configuration honnête

- [X] **U5.1 — Dire qui gouverne les chemins.** `componentsPath` et `tokensPath`
      sont obligatoires et validés (`validateSettings` dans `config.ts`,
      `localErrors` dans `ConfigurationPage.js`), mais `repositoryLayout` les
      **ignore** dès qu'un `ucm.config.json` lisible existe sur la branche de
      base : le designer l'apprend par une ligne de journal, après publication.
      Cette lecture n'a lieu qu'à la publication, jamais au test de connexion —
      `testGithubConnection` ne fait qu'un `GET /repos/...`. Geste : au test de
      connexion, lire `ucm.config.json` et afficher le layout réellement en
      vigueur ; marquer les deux champs comme repli, et ne plus les exiger quand
      le dépôt se décrit lui-même. Bénéfice second, plus important que le
      premier : un `ucm.config.json` mal formé **refuse l'export**
      (`repositoryLayout` lève au lieu de retomber sur les réglages) ; le lire à
      la connexion transforme un blocage tardif, après le travail, en information
      immédiate.
      **Ce que U1.2 a trouvé en auditant, et qui entre ici :** les valeurs par
      défaut de ces réglages sont écrites DEUX fois — `loadPublicSettings` dans
      `config.ts`, `populate` dans `ConfigurationPage.js` — et les deux ne disent
      déjà pas la même chose : `config.ts` conserve une chaîne vide là où
      `populate` la remplace par `main`, `src/components`, `src/tokens`. Une
      branche de base délibérément vidée se réaffiche donc « main » à la
      réouverture. Une seule écriture doit rester, et c'est celle du sandbox.
      *Faite le 5 septembre 2026.* Le test de connexion lit désormais
      `ucm.config.json` et l'interface dit qui gouverne, AVANT la saisie : les
      deux libellés portent « (repli) » quand le repository décide. Les deux
      chemins ne sont plus obligatoires, et `loadPublicSettings` n'invente plus
      `src/components` ni `src/tokens` — un repli inventé écrirait l'export à un
      endroit que personne n'a demandé, en le faisant croire choisi. La
      divergence des valeurs par défaut est refermée du même geste : `populate`
      ne les réécrit plus, les placeholders portent la suggestion et le champ ne
      porte que ce qui est enregistré.
      **Un cas neuf est apparu en rendant ces champs facultatifs**, et il fallait
      le nommer : personne ne décide de l'endroit. `artifactPath` refuse alors
      l'export au lieu d'écrire ailleurs, et le message donne les deux gestes
      avec leur acteur — un développeur ajoute `ucm.config.json`, ou le designer
      renseigne le chemin. La configuration l'annonce avant l'export.
      **Le bénéfice second est acquis :** un `ucm.config.json` illisible se
      découvrait après l'analyse complète du composant. Il a maintenant sa cause
      de connexion, `depot-mal-decrit`, et le message du repository sur son
      propre fichier est repris tel quel. `ErreurDeDescription` existe pour que
      ce cas soit RECONNU : sans elle, un fichier fautif et une panne de réseau
      arrivent tous deux avec un statut nul, et le plugin enverrait vérifier une
      connexion pendant qu'un développeur doit corriger un fichier.

- [X] **U5.2 — Trois causes, trois messages.** `testGithubConnection` avale
      l'erreur et rend un booléen : pas de configuration, token invalide (401) et
      dépôt introuvable ou droits manquants (404) donnent la même pastille rouge,
      alors que le geste diffère dans les trois cas. L'information existe à la
      source — `GithubApiError` porte son `status` — et se perd au retour.
      Geste : rendre la cause et l'afficher ; la pastille devient un bouton vers
      la configuration.
      **Ce que U1.1 a ajouté :** la phrase de statut du formulaire — la seule qui
      dise si l'enregistrement a réussi — est SOUS la ligne de flottaison, comme
      le bouton « Enregistrer » qui la produit. La cause affichée ici doit
      remonter avec elle.
      *Faite le 5 septembre 2026.* `testGithubConnection` rendait un booléen ;
      `diagnostiquerConnexion` rend une cause, et `src/connexion.ts` en est
      l'unique autorité : la pastille, son état d'affichage et le geste sortent
      d'un seul appel. Sept causes, sept gestes, et un test refuse qu'une cause
      d'échec n'en nomme aucun ou en partage un avec une autre.
      **Ce que l'implémentation a trouvé en plus de l'énoncé.** La pastille
      écrivait ses trois textes de son côté : une seconde autorité sur un état
      qu'elle ne connaît pas. Elle ne les écrit plus. Le statut du formulaire
      affirmait « Configuration enregistrée » à CHAQUE test de connexion, y
      compris celui de l'ouverture, où personne n'avait rien enregistré ; il ne
      le dit plus que si un enregistrement a eu lieu, ce que seule l'UI sait.
      Et il ne se cachait plus quand la page était masquée : le designer qui
      arrive par la pastille trouvait un formulaire sans raison. C'est cette
      phrase fausse qui imposait ce silence.
      **La place a été tranchée, elle ne l'était pas.** Le statut remonte SOUS la
      pastille, en tête de page. Le formulaire dépasse la fenêtre dès que le
      repository se décrit : l'un des deux bouts sera toujours à faire défiler,
      et c'est l'arrivée qu'il faut servir, parce que c'est le moment où l'on ne
      sait pas quoi faire. Le résultat d'un enregistrement s'écrit au même
      endroit : deux emplacements pour un même fait en feraient deux faits.

- [ ] **U5.3 — Dire pourquoi la publication a échoué.** Même perte, l'autre
      bout : un échec de publication devient « Échec GitHub » suivi du message
      brut, quel que soit le statut. Un 403 de droits manquants, un 409 de
      conflit et un 422 de branche existante ne se corrigent pas du même geste.
      Geste : traduire le `status` en cause et en geste. Dépend de U5.2, qui pose
      le vocabulaire.

- [ ] **U5.4 — Pouvoir retirer le token.** Un champ vide signifie « conserver le
      PAT enregistré » et `saveSettings` n'écrit alors rien : aucun geste ne
      retire un token du poste — ni rotation, ni changement de dépôt, ni départ.
      Geste : « Supprimer le token enregistré », avec confirmation.

- [ ] **U5.5 — Tester la connexion sans enregistrer.** « Enregistrer » fait
      aujourd'hui les deux. À ne faire que si U5.1 et U5.2 ne suffisent pas :
      deux boutons pour un formulaire de cinq champs se justifient mal.

---

## Phase U6 — À décider avant d'être fait

- [ ] **U6.1 — Historique local des exports.** Les derniers exports —
      composant, date, chemin, pull request — rangés dans `figma.clientStorage`,
      pour retrouver la pull request d'hier que le journal a perdue à la
      fermeture du plugin. À arbitrer : c'est de la donnée locale qui **périme**
      — une pull request fusionnée, une branche supprimée — donc un état de plus
      à entretenir, et une source d'affirmations fausses. À ne pas ouvrir avant
      que U3.0 ait montré si le besoin subsiste : savoir qu'une pull request est
      ouverte pour ce composant est la moitié utile du besoin, et elle se lit
      dans le dépôt, pas dans une mémoire locale.

- [ ] **U6.2 — Passer l'UI en TypeScript.** `build:ui:js` fait déjà passer
      `src/ui/index.js` par esbuild : renommer en `.ts` coûte presque rien, et le
      type unique de U0.6 contraindrait alors les deux côtés au lieu d'un seul.
      Contre : l'UI est volontairement légère et sans outillage. À décider une
      fois, pas deux.

### Abandonné — prévenir d'un écart de version de contrat

L'idée : le pré-vol dirait qu'un contrat produit par ce plugin ne sera pas lu par
ce dépôt, au lieu de le découvrir par la CI après la pull request. Le problème est
réel — un écart de version refuse le contrat **en bloc**, quel que soit son
contenu. **Elle est abandonnée, et par une décision déjà prise dans le code, pas
par prudence.**

Deux vérifications la ferment :

- ce n'est pas une fenêtre, c'est **une** version.
  `packages/kit/src/lecteurs/version-contrat.mjs` pose
  `VERSION_CONTRAT_MINIMALE` et `VERSION_CONTRAT_MAXIMALE` égales, et son propre
  commentaire dit que les changer est un geste manuel et ordonné chez le
  consommateur. Cette valeur vit dans le **kit installé** chez lui ; une plage
  semver dans son `package.json` ne dit ni la version exacte installée, ni ce
  qu'il a verrouillé en local ;
- le seul fichier que le plugin lit dans le dépôt **refuse** de la porter.
  `packages/kit/src/format/configuration.ts` l'écrit comme une règle et non un
  oubli : `contractVersion`, `version` et `schemaVersion` y sont *refusés*, pas
  ignorés, parce que la fenêtre de versions lues appartient au paquet installé.

Déduire cette version d'ailleurs créerait la **seconde autorité au désaccord
muet** que T4.1, T4.2 et T4.3 referment chacune ailleurs. Ne pas rouvrir sans
qu'une décision de format ait d'abord donné à cette information un domicile
lisible.

### Ce qui n'entre pas dans ce plan

- **Un aperçu du contrat dans le plugin.** Le contrat se relit dans la pull
  request, où il est diffé et commentable. Une fenêtre de 380 px n'est pas le
  lieu, et le dupliquer créerait deux endroits pour la même revue.
- **Le multi-fichiers Figma.** Un plugin s'exécute dans le contexte du fichier
  ouvert : il n'y a rien à résoudre.
- **L'export multi-composant en une commande.** Hors périmètre MVP
  ([UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md), « Hors périmètre MVP »).
- **Un framework d'interface.** Le bundle est du DOM natif inliné dans un HTML
  unique ; c'est une contrainte de la sandbox, pas une préférence.
- **Un thème propre au plugin.** Aucune couleur de marque : l'hôte décide.
- **Une écriture dans le document Figma.** L'invariant tient ; U4.5 le précise
  sans l'entamer.
- **Toute préférence que rien n'oblige à régler.**

---

## Quand exécuter ce plan, par rapport à l'industrialisation

[PLAN-INDUSTRIALISATION.md](./PLAN-INDUSTRIALISATION.md) est **en cours** : 33 de
ses 57 tâches sont closes. Sa **Phase 4 — Plugin Figma est fermée** (T4.1 à
T4.4), donc ce plan-ci n'entre en collision avec elle sur aucun fichier ; ce qui
reste est la Phase 7 (le test du repo vierge, son critère de réussite), le reste
de la Phase 5, puis les Phases 6 et 8. La réponse n'est donc **pas** « après tout
ça » — elle se coupe en trois.

**Avant la Phase 7, tout de suite.** Deux morceaux seulement, pour deux raisons
distinctes :

- **U3.0**, parce que c'est un bug et qu'un bug ne fait pas la queue derrière un
  plan. Il a été promu hors de ce document pour cette raison : il est inscrit
  **T4.5** dans le plan d'industrialisation, et sa description normative vit
  là-bas. L'entrée U3.0 ci-dessous reste comme contexte du pré-vol, qui en
  dépend.
- **U0 sauf U0.5**, une session sans décision. U0.1 en particulier n'est pas
  cosmétique ici : la Phase 7 consiste à exporter en boucle vers un dépôt neuf,
  et c'est exactement la situation où un bundle Figma périmé se déguise en
  « aucun changement ». Le garde-fou doit tenir **avant** que ces exports
  commencent, pas après.

**Après la Phase 7, avant la Phase 8.** Tout le reste : U1, U2, U4, puis U3.1 à
U3.4. Deux raisons, et la seconde est la plus forte :

- la Phase 7 valide le **flux** ; dessiner les écrans qui montrent un flux avant
  de l'avoir validé, c'est les redessiner ;
- **T4.4 a changé la nature de ce chantier.** Le plugin part sur la Figma
  Community : son interface cesse d'être un outil interne et devient la vitrine
  du projet, jugée par une revue Figma et par des gens qui n'ont lu aucun de ces
  documents. L'état de premier lancement (U2.5) et la hiérarchie (U1.0) sont ce
  qu'ils verront d'abord. La soumission réclame par ailleurs nom public,
  description, icône et illustration de couverture : les captures de U1.1 les
  fournissent, ce qui fait de l'inventaire des états un livrable à double emploi
  plutôt qu'un coût.

**Deux points d'attention de calendrier.**
U0.5 attend la décision de langue que T4.4 a rouverte — elle ne dépend pas de
ce plan. Et **U4.5 doit passer après T8.1**, qui scinde la spécification : écrire
dans un document que la tâche suivante découpe garantit de réécrire.
Rien n'attend en revanche T5.5, T5.6, T6.1 ni T6.3 : couches optionnelles et
finitions de CI, orthogonales à l'interface.

## Ordre d'exécution

1. **U0 sauf U0.5** — une session, aucune décision, et U0.6 conditionne U2.1 et
   U4.1. **U3.0 dans la même fenêtre**, tant que `github.ts` est frais.
2. *(Phase 7 de l'industrialisation — le test du repo vierge.)* **Passée pour
   l'instant**, le 5 septembre 2026, par décision du propriétaire du projet :
   elle demande un repo de recette créé et tenu hors de ce plan, et des exports
   lancés depuis Figma.
3. **U1.0 à U1.3** — la hiérarchie écrite, les états inventoriés, l'audit de
   fonction et le protocole de relecture. **Rien de visuel ne se dessine avant.**
   Ces quatre tâches ne produisent pas une ligne de style : elles produisent de
   quoi juger celles qui suivent, et sans elles la refonte n'a aucun critère de
   réussite — seulement des avis.
   **Faites le 5 septembre 2026**, la Phase 7 étant passée. Elles ne couraient
   pas le risque que cet ordre existe pour éviter : elles décrivent les écrans
   qui EXISTENT, elles n'en dessinent aucun. **L'étape 4 le court**, elle : le
   socle graphique s'exécute contre une hiérarchie écrite, mais les vues de U2 et
   U4 qu'il prépare montreront un flux que la Phase 7 n'a pas encore validé.
4. **U1.4 à U1.10** — le socle, exécuté contre la table de U1.0, avant toute vue
   nouvelle : sinon les vues de U2 et U4 sont à redessiner deux fois.
   **Fait le 5 septembre 2026.** L'écran de travail tient de nouveau dans sa
   fenêtre, la fenêtre se redimensionne, et `styles.css` a cessé d'être un
   endroit où une couleur se décide.
5. **U5.1** et **U5.2** — la destination réelle et la cause d'un échec sont des
   données que U2.2 affiche. **Faites le 5 septembre 2026.**
6. **U2** — l'écran de travail. **Faite le 5 septembre 2026.**
7. **U4.1**, **U4.2**, **U4.6** — le compte rendu, qui rend U3 lisible.
   **Faits le 5 septembre 2026.**
8. **U3.1** à **U3.4** — le pré-vol, une fois qu'il a un endroit où rendre son
   résultat.
9. **U4.5** — après T8.1 —, puis **U4.3**, puis **U4.4** : la localisation dans
   cet ordre, l'invariant tranché, la loi écrite, le clic ensuite.
10. **U5.3**, **U5.4**, puis **U6** si les conditions sont réunies.

Chaque phase qui ajoute un état repasse le protocole de U1.3 et complète
l'inventaire de U1.1. Une phase livrée sans ses états regardés n'est pas
livrée.

Dépendances dures : U2.1 → U0.6 · U2.2 → U5.1 · U4.1 → U0.6 · U3.2 → U3.0, U3.1 ·
U3.3 → U3.1 · U3.4 → U2.6 · U5.3 → U5.2 · U4.4 → U4.3, U4.5.

## Ce que la revue indépendante a corrigé

| Point | Ce que le plan disait | Ce que le code a montré |
|---|---|---|
| Localisation des diagnostics | l'UI peut être partielle, le contrat non | la réserve porte sur la fiabilité du signal, pas sur son support : U4.3 borne désormais la couverture par une loi vérifiable au lieu de l'assumer partielle |
| Pull request dupliquée | « invisible » au designer | **non détectée par construction** : l'immobilité ne se compare qu'à la branche de base. Promue en U3.0, avant le pré-vol |
| Écart de version de contrat | piste à évaluer, condition à trancher | abandonnée : ce n'est pas une plage, et `ucm.config.json` refuse de porter une version |
| Pré-vol en deux étapes | un clic de plus quand il y a à publier | insuffisant : il faut aussi revérifier à la publication, le dépôt pouvant bouger, et refaire tout le chemin de lecture, collision comprise — U3.1 (b) et (c) |
| Sélection invalide | défaut de l'interface | le chemin d'erreur fonctionne déjà : U2.3 ne vaut que l'aller-retour épargné |
| Ordre du compte rendu | conforme à `CONTRIBUTING.md` | la règle vise un rapport agrégé de CI : U4.1 se déclare adaptation |
| Absence de test sur l'UI | non mentionnée | devenue règle de travail 5, et U4.6 |
| Annulation d'un export, cause d'un échec réseau | absentes | U3.4 et U5.3 |

Une neuvième correction ne vient pas de la revue mais du propriétaire du projet,
et c'est la plus structurante : **le plan ne portait aucun critère de qualité
UI.** Sa phase U1 nettoyait la mise en forme — 11 px, trame de 4, hauteurs de
contrôle — sans jamais dire quel élément mérite du poids, ni comment le vérifier.
Trois manques nommés : aucune hiérarchie écrite, aucun élément audité sur sa
fonction, aucun moyen de juger. U1.0 à U1.3 sont la réponse, et elles passent
devant tout le reste du graphique.

## Ce qui reste à trancher

1. **Le pré-vol remplace-t-il l'export direct ?** Recommandation : oui. Deux
   chemins feraient deux comportements à documenter, à tester et à expliquer, et
   la contrainte (a) de U3.1 répond déjà à l'objection ergonomique.
2. **Le journal brut survit-il à U4.1 ?** Recommandation : oui, replié, tant que
   le plugin n'a pas d'autre canal de débogage.
3. **La sélection depuis l'UI est-elle acceptable au regard de l'invariant ?**
   C'est U4.5, et la réponse doit être écrite, pas supposée.
