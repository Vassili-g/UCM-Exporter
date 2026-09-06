# Pistes d’évolution — UCM

Ce document rassemble ce qui n’est **pas** décidé : le positionnement du modèle
dans son écosystème, les options ouvertes, les risques qui les motivent, et un
point de vue sur la direction générale. Il ne décrit ni le comportement actuel,
défini dans [docs/FORMAT.md](./docs/FORMAT.md) et
[packages/plugin/SPEC.md](./packages/plugin/SPEC.md), ni les priorités
engagées, suivies dans [ROADMAP.md](./ROADMAP.md), ni les principes du modèle,
posés dans [CONCEPT.md](./CONCEPT.md).

Règle d’admission, valable pour tout ce qui suit : une option n’entre dans la
spécification qu’après **un besoin observé sur un composant réel**, **un
propriétaire clair dans le modèle** et **un plan de validation côté
consommateur**. Une évolution améliore la robustesse ou la confiance sur un cas
vu, sans créer une nouvelle source de vérité.

---

## 1. Positionnement

Le problème traité est largement reconnu ; les solutions existantes n’en
couvrent chacune qu’une part.

| Solution ou standard | Ce qu’elle apporte | Différence avec l’UCM |
|---|---|---|
| [Figma Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect) | Relie composants Figma et code réel, mappe les propriétés, enrichit le contexte servi aux agents par Figma | Le mapping et les exemples restent dans l’écosystème Figma ; l’UCM produit une spécification autonome, versionnée dans le repository et lisible sans accès à Figma |
| [Storybook](https://storybook.js.org/docs/8/writing-docs/autodocs) | Documente les composants depuis le code, les stories et les métadonnées de props | La source y est le code ; Storybook n’extrait ni la vérité visuelle ni les règles Figma |
| [UXPin Merge](https://www.uxpin.com/docs/merge/merge-design-system-documentation/) | Fait concevoir avec les composants codés réels | Approche code-first ; l’UCM maintient deux responsabilités distinctes et reliées |
| [Backlight](https://backlight.dev/docs/make-your-first-design-system) | Réunit source, stories, tests, doc et ressources design | La co-localisation est proche, sans contrat structuré exporté depuis Figma ni conçu pour des agents |
| [DTCG](https://tr.designtokens.org/format/) | Standardise l’échange des tokens entre outils | Couvre les tokens, pas la spécification d’un composant — l’UCM l’utilise plutôt qu’il ne le concurrence |

Aucun de ces ingrédients n’est neuf isolément. La différenciation tient à leur
combinaison : extraction déterministe depuis Figma, contrat générique par
composant, co-localisé avec le code, réunissant variantes exactes, états,
tokens, icônes, composition et règles d’usage, exploitable sans Figma par un
humain, une CI ou un agent, et éprouvé par un test en contexte froid.

Le positionnement juste est celui d’une **couche de contrat design, Git-native
et lisible par les agents, posée à côté du code réel**. Elle complète Code
Connect, Storybook et DTCG ; elle ne les remplace pas.

**Où le gain est réel** : équipes disposant à la fois d’un design system Figma
et d’une bibliothèque de composants, travaillant avec plusieurs agents ou
environnements assistés, tenant à la traçabilité Git, partageant un design
system entre plusieurs frameworks, ou constatant des divergences de nommage
entre Figma, la documentation et le code.

**Où il est faible** : petite bibliothèque peu structurée, design system
entièrement code-first, ou organisation déjà engagée dans un outil où les
composants codés servent directement à concevoir.

---

## 2. Options ouvertes — le contrat portable

### Manifeste d’icônes

Une prop d’icône modifiable n’énonce pas les noms acceptés par le kit de
l’application. Un manifeste séparé pourrait associer nom Figma et identifiant de
code, sans faire du catalogue d’icônes un détail interne de chaque contrat.

*À ouvrir si* un test froid doit inventer un nom d’icône. Il faudra alors dire
qui publie le manifeste, comment il est versionné, et comment le consommateur
valide une référence.

### Propriétés visuelles supplémentaires

`textCase` et `textDecoration` sont les premiers candidats connus. Une propriété
n’est ajoutée qu’avec : le calque qui en est propriétaire, sa forme portable,
son applicabilité et ses valeurs neutres, le comportement en liaison partielle
ou `figma.mixed`, un diagnostic designer et un test de consommation.

L’arbre actuel reste l’unique autorité pour décider qu’un calque est publié. Une
extension ne recopie pas l’arbre Figma et n’ouvre pas les tracés d’une icône.

### Localisation structurée des diagnostics

Le type prévoit une localisation facultative (`figma.variantName`,
`figma.nodeName`, `figma.nodeId`, `figma.property`, `contractPath`) que l’export
ne renseigne pas. L’alimenter permettrait de corréler une propriété absente avec
le diagnostic qui l’explique.

*Condition* : un collecteur typé partagé par tous les extracteurs. Quelques
localisations isolées donneraient une carte trompeuse.

### Compatibilité et interopérabilité

Le JSON Schema est publié et dérivé de `types.ts` ; ce qu’il laisse ouvert le
reste : `tokens.json` n’a pas de version propre, et la politique de
compatibilité n’est écrite nulle part.

Une porte de CI fondée sur ce schéma a été examinée puis écartée : le
consommateur prouve déjà la forme, et une seconde autorité sur la même
convention finit par accepter ce que la première refuse. Elle ne se rouvrira que
pour un consommateur hors Node.

### Distribution du plugin, et le lien vers Figma qui en dépend

**Tranché le 5 septembre 2026 (T4.4) : le plugin se distribue par la Figma
Community.** `enablePrivatePluginApi` est retiré du manifest, `figma.fileKey`
n'arrive donc plus, et `meta.figma.url` n'est plus écrit. Ce qui suit garde les
termes de l'arbitrage — la décision se relit mieux à côté de ce qu'elle a
écarté.

Le manifest déclarait `enablePrivatePluginApi`, réservé aux plugins privés d'une
organisation. Un seul appel en dépendait : `figma.fileKey`, qui alimentait
`meta.figma.url` — le lien direct vers le composant source
(`packages/plugin/src/contract/exportComponent.ts`). Une publication publique sur la Community
suppose de retirer ce drapeau, et le choix de distribution décide donc du
contenu des contrats.

**Rester plugin privé d'organisation.** Le contrat garde `meta.figma.url`, et
une revue de pull request ouvre le composant source d'un clic. La distribution
se limite en revanche aux membres de l'organisation Figma : personne d'autre ne
peut installer le plugin, donc personne d'autre ne peut produire de contrat.

**Publier sur la Community.** N'importe qui installe le plugin et produit des
contrats. `figma.fileKey` devient indisponible : `meta.figma.url` disparaît, et
la traçabilité repose sur `fileName` et `nodeId`, que le contrat conserve.
L'export n'est pas bloqué et aucune information de rendu n'est perdue — c'est
un raccourci de navigation qui tombe, pas une donnée du design. Reconstituer le
lien à la main reste possible pour qui connaît la clé du fichier.

**Ce que la décision a coûté, et ce qu'elle a rendu.** Le point de bascule
énoncé ici était « le nombre de personnes hors organisation qui doivent pouvoir
exporter ». Il a cessé de valoir zéro, et la première option perd alors sa
gratuité : elle n'est plus « le lien en plus », elle devient « personne d'autre
ne peut exporter ». Le prix payé est un raccourci de relecture ; il est rendu
autrement, voir ci-dessous.

Les deux conditions posées avant d'ouvrir la publication, et où elles en sont :

- **que l'absence de `meta.figma.url` soit traitée par tous les lecteurs comme
  un cas normal** — tenu. Le champ était déjà OPTIONNEL dans `ContractMeta`,
  aucun lecteur ne le réclame, et rien dans le schéma ne change : la
  publication ne touche pas à la version du contrat. Ce qui a dû changer est
  ailleurs, et c'est le point suivant.
- **que la traçabilité par `fileName` et `nodeId` suffise réellement à une
  revue, ce qui se constate sur une pull request réelle et pas en principe** —
  la condition est désormais *observable*, ce qu'elle n'était pas. Le corps de
  la pull request annonce l'origine sur sa page de couverture :
  `Composant Figma : « Alert » — fichier « Design System », nœud 12:345`
  (`lignesDIdentite`, `packages/plugin/src/github.ts`). Le constat se fait sur
  les revues à venir. Si `fileName` et `nodeId` ne suffisent pas, c'est là qu'on
  le verra, et la troisième voie ci-dessous devient la réponse.

**L'avertissement « Lien vers Figma absent » est supprimé, et c'est la moitié la
plus importante de l'exécution.** Il était écrit quand le cas était l'exception.
La Community l'inverse : la clé n'arrive plus JAMAIS, donc le message se serait
imprimé sur chaque export, dans le corps de chaque pull request, pour un constat
que le designer ne peut pas corriger. Une liste dont on apprend qu'elle se
survole coûte la lecture de celles qui demandent un geste — la règle du projet,
appliquée à sa propre décision. Un état normal du format se documente une fois,
dans le type et dans la spécification, pas par un diagnostic répété à l'infini.

Une troisième voie existe et n'a pas été évaluée : publier sans le drapeau, et
demander la clé du fichier dans la configuration du plugin pour reconstruire
l'URL. Elle échange une donnée obtenue automatiquement contre une saisie
manuelle, donc contre une source d'erreur de plus ; elle ne se justifierait que
si le lien s'avérait indispensable en revue. **Elle reste ouverte, et le code ne
lui barre pas la route :** le calcul de l'URL est laissé en place dans
`buildMeta`, et le corps de la pull request rend l'URL en lien dès qu'un contrat
en porte une.

**Ce que la décision rouvrait, et qui n'était pas technique — tranché le même
jour.** Publier sur la Community met le projet devant un public non
francophone, et la Phase 8 du plan d'industrialisation avait fait de cet
événement précis le seul qui rouvre la question de la langue, à trancher à ce
moment-là parce que les noms de symboles d'un paquet npm publié sont quasi
irréversibles. **Le français reste**, et le choix est assumé plutôt que subi :
le paquet npm est lu par un repository consommateur que le projet connaît, le
plugin publié s'adresse de fait à des designers francophones, et les deux
surfaces n'ont donc pas le même public. Le jour où un consommateur non
francophone existera, il rouvrira la question avec un cas réel — à un coût de
renommage plus élevé, ce qui fait partie de ce qui a été accepté ici.

### Diff sémantique

Une revue gagnerait à lire un résumé plutôt qu’un JSON :

```text
Bouton

Ruptures
- valeur "outlined" supprimée de variant
- prop iconLeft renommée

Ajouts compatibles
- taille "compact" ajoutée
- état "loading" ajouté

Tokens
- primary.contained.hover.background remplacé
```

Le diff reste **entièrement dérivé** des deux JSON comparés : commentaire de
pull request ou rapport CI, jamais une nouvelle vérité. Il conditionne tout
niveau de confiance différencié en revue — documentation auto-approuvée, token
relu par un designer.

---

## 3. Options ouvertes — le repository consommateur

### Vérification générique du rendu

Détaillée dans [PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md). Elle reste
une proposition de recherche, sans décision.

Ce qui lui manque n’est pas une première preuve : les reconstructions à froid
ont été faites et comparées à Figma de nombreuses fois, à l’œil, et elles
tiennent. Ce qui manque est leur **répétabilité** — une comparaison qui se
rejoue à chaque réexport, sur une matrice entière, sans mobiliser un humain.
Tant qu’un composant se compare en quelques minutes, l’œil suffit ; le calcul
change avec le nombre de combinaisons et la fréquence des changements.

Deux garde-fous à ne pas perdre en l’ouvrant : elle ne doit connaître le nom
d’aucun composant, et elle ne doit pas devenir une seconde implémentation du
protocole de reconstruction porté par le skill `consommer-contrat` — deux
implémentations divergent, et c’est la non-jetable qui deviendrait la vérité.

### Parité au-delà de l’existence

La parité statique compare aujourd’hui l’API publique déclarée et les
dépendances comptées dans le JSX. Restent candidats : valeurs d’enum réellement
gérées, valeurs par défaut vérifiables, et surtout **exceptions volontaires
déclarées**. Sans divergence annotable, une parité devient une prison qu’on finit
par contourner — et une CI contournée ne protège plus rien.

### Liaison explicite avec l’implémentation

La co-localisation suffit au prototype. À l’échelle, un manifeste du repository
pourrait associer contrat, source et export public :

```json
{
  "contract": "./Button.contract.json",
  "implementation": { "source": "./Button.tsx", "export": "Button" }
}
```

Cette information appartient au consommateur, jamais à Figma : elle dépend du
framework et de l’organisation du code. Elle pourrait ensuite alimenter un
mapping Code Connect sans double saisie.

### Nom des props : accord amont, mapping en échappatoire

Le nom est fixé **en amont**, à la co-construction du composant Figma
([CONCEPT.md](./CONCEPT.md) §3) : il voyage intact jusqu’au code, donc aucun
mapping à maintenir. Une table de correspondance
(`contrat.iconLeft ↔ code.iconStart`) n’a d’intérêt que le jour où un renommage
devient inévitable. L’ajouter avant, c’est outiller un problème qu’on n’a pas.

### Retour dans l’éditeur

Les contrôles statiques pourraient devenir des règles de linter : chemin de
token assemblé, référence absente du contrat, valeur visuelle brute. Utile
seulement après mesure des faux positifs, avec des exceptions rares, explicites
et révisables.

### Multi-marque au runtime

Les modes Figma sont exportés en DTCG. Leur projection CSS, leur sélection au
runtime et leur prévisualisation restent à concevoir dans le consommateur. Le
multi-**plateforme** (React Native, iOS, Android via Style Dictionary) est une
portée, pas le cœur du concept.

### Extraction multi-repository — faite

Ce n’est plus une piste. `@ucm-kit/core` et `@ucm-kit/cli` sont publiés, et
l’extraction a été décidée sur l’argument inverse de celui qui la retenait :
un seul consommateur ne justifie pas de publier, mais il ne justifie pas non
plus de garder l’outillage chez lui, parce qu’un repository qui n’en a pas
d’autre ne peut jamais prouver que son outillage est portable.

Ce que le découpage devait **réaliser** — et non préserver — est l’autorité
unique sur les conventions de version, d’identifiant et de références de
tokens. Elle vit dans `@ucm-kit/core/format` : `CONTRACT_VERSION`,
`codeIdentifier`, `isTokenReference` et `tokenCssVariable`, chacune écrite une
fois. Les copies qui vivaient chez le consommateur sont parties — la dernière
regex de référence avec T2.7, la dernière projection de nom de token avec T6.0,
et `identifiant-code.mjs` avec T2.1.

### Passerelles

Une fois le format stable, des adaptateurs pourraient alimenter Code Connect,
une documentation, des stories ou d’autres pipelines DTCG. Une passerelle adapte
le contrat ; elle ne lui ajoute ni comportement applicatif ni donnée de
framework.

---

## 4. Risques

Le modèle a trois coutures, et chacune se défait à sa manière.

**Figma → contrat : la péremption.** L’export est manuel ; aucun contrôle du
repository ne peut prouver qu’un fichier représente le dernier état de Figma. Un
contrat frais d’apparence peut décrire un composant modifié depuis des semaines,
et toute la chaîne repose alors sur un humain qui pense à réexporter. C’est le
risque le plus sournois parce qu’il ne produit aucun signal rouge. Réponse
proportionnée : date d’export visible, ancienneté signalée en revue, discipline
côté design.

**Contrat → code : la divergence silencieuse.** La co-localisation rapproche
sans garantir. La CI sait détecter une forme invalide, une référence de token
cassée, une prop absente ; elle ne sait pas prouver un rendu. Annoncer une
parité de rendu serait une fausse promesse — chaque contrôle doit dire ce qu’il
vérifie **et** ce qu’il ne vérifie pas.

**Code → runtime : les conventions cachées.** Ce que le contrat ne porte pas se
réfugie dans le consommateur : dette non tokenisée, dépendance à un kit distant,
convention de rendu implicite. Chaque convention de ce type est une mini-source
de vérité parallèle, à résorber par tokenisation ou à assumer dans un adaptateur
documenté.

**Deux risques transverses.** Un contrat trop large — événements, `aria-*`,
règles de formulaire, détails React — perdrait sa portabilité et dupliquerait
une autre vérité. Une CI sujette aux faux positifs finit par être contournée :
le coût quotidien des contrôles fait partie de leur conception.

---

## 5. Point de vue — prouver la chaîne, pas les maillons

*Lecture macro, à réévaluer à chaque validation réelle. Rien ici n’engage la
roadmap.*

**Ce qui est acquis.** L’effort a porté sur l’amont : forme du contrat, vues
exactes par catalogues, élision des neutres, composition récursive, schéma
publié. Cette moitié du problème est à un optimum local — le contrat dit
beaucoup, en peu de tokens, sans règle liée à un nom. Le maillon
`Figma → contrat → composant` a été parcouru et vérifié à l’œil de nombreuses
fois : il tient. **Ajouter des champs maintenant serait la manière la plus
confortable de ne pas affronter ce qui reste.**

**Ce qui reste est d’un autre ordre.** Ce n’est pas un maillon de plus : c’est
la chaîne. Le concept ne promet pas qu’un composant se reconstruit — il promet
qu’une intention de design devient une interface juste, et le reste, pendant que
tout bouge. Cette chaîne-là n’a jamais été parcourue en entier une seule fois.

```text
        ┌───────────────── la boucle du changement ─────────────────┐
        │                                                           ▼
 intention ──► composant Figma ──► contrat + tokens ──► composant codé ──► écran ──► application
    (0)             (1)                  (2)                  (3)           (4)          (5)
                    ▲                                                        │
                    └──────────── détection de péremption ───────────────────┘
```

| Maillon | Ce qu’il faudrait prouver | État |
|---|---|---|
| (0) → (1) | un composant Figma est constructible de façon conforme, sans savoir tacite | non modélisé : l’exporteur diagnostique après coup, rien ne guide avant |
| (1) → (2) | l’extraction est déterministe et portable | prouvé : lois testées sur chaque contrat fabriqué |
| (2) → (3) | un agent reconstruit le composant depuis le seul contrat | prouvé plusieurs fois à l’œil ; ni consigné ni rejouable |
| (3) → (4) | des composants s’assemblent en un écran réel, fidèle à sa maquette | **jamais tenté** : le consommateur est une galerie, pas une interface |
| (4) → (5) | thème, marque et modes se choisissent au runtime | modes exportés, jamais rendus |
| boucle | un token, un variant, une prop qui changent traversent la chaîne sans divergence | non modélisé : tout est raisonné en création |
| retour | une maquette en retard sur le code est signalée | non modélisé, et à ne jamais transformer en écriture |
| valeur | la chaîne coûte moins qu’elle ne rapporte | aucune mesure |

Les quatre lignes en gras ou vides sont la vraie carte du travail restant. Elles
se traduisent en quatre chantiers, dans cet ordre.

### A. L’écran comme unité de preuve

C’est le pas le plus grand pour le coût le plus faible, parce qu’il repose sur
une hypothèse que le modèle porte déjà sans l’avoir testée : **un écran est un
composé de composés**. Si elle tient, la chaîne monte d’un cran sans un seul
champ nouveau — `composes`, les slots et les catalogues de vues décrivent une
page comme ils décrivent un bouton.

Si elle casse, elle cassera à des endroits précis et instructifs : le layout de
page et ses grilles, le responsive, les données réelles, et tout ce qui dans une
maquette n’est pas un composant. C’est **la meilleure question ouverte du
projet** — le contrat s’arrête-t-il au composant, ou décrit-il aussi un
assemblage ? — et elle se tranche par un export réel, pas par un débat.

Le geste : exporter un écran depuis Figma, le reconstruire à froid, comparer. Ce
que l’exercice révèle vaut plus que son résultat.

### B. Le cycle du changement, joué en entier

Le cas dominant en vie réelle n’est pas la création, c’est la modification. Tout
le modèle est aujourd’hui raisonné à l’endroit de la naissance d’un composant.

Un scénario canonique à rejouer de bout en bout, quatre changements qui couvrent
les formes connues de rupture : une valeur de token qui change ; un variant
ajouté ; une prop renommée ; un composant simple qui devient composé. Pour
chacun, la même question : que voit le réexport, que dit le diff, que voit la
revue, que doit faire l’agent, que doit trancher l’humain, et qu’est-ce qui
casse silencieusement.

C’est là — et seulement là — que le diff sémantique, la parité étendue et les
exceptions déclarées trouvent leur spécification. Construits sans ce scénario,
ils devinent la leur. La robustesse ne se prouve pas en montrant qu’un système
naît juste, mais qu’**il vieillit sans diverger**.

### C. Le banc d’essai mesuré

La preuve du concept est comparative, pas absolue. Même tâche, même agent, deux
conditions : avec contrat, sans contrat. Se mesurent le nombre d’allers-retours
jusqu’à un rendu accepté, les props, valeurs et tokens inventés, les écarts au
design constatés, et le coût réel — qui se compte en contexte multiplié par
tours, pas en lignes produites.

Le test froid est déjà l’instrument ; il lui manque un témoin et un cahier. Sans
ce chiffre, « les agents travaillent mieux avec un contrat » reste une
conviction d’auteur ; avec, c’est un argument opposable à une équipe qui n’a
aucune raison de croire sur parole.

### D. La péremption, dans les deux sens

Le seul des trois risques qu’aucun outillage n’effleure, et le seul qui se
manifeste sans jamais produire de rouge. Deux détections symétriques : un
contrat en retard sur Figma, une maquette en retard sur le code. Aucune écriture
dans le document, jamais — la détection bidirectionnelle est légitime, la
synchronisation ne l’est pas.

### Ce qui attend, volontairement

**Rendre la CI bloquante.** Une protection de branche sur un repository à un
contributeur prouverait qu’on sait configurer GitHub, pas que le modèle tient.
Le consommateur actuel est un banc d’essai, pas une production : la question
revient — avec `CODEOWNERS` encodant l’arbitrage designer/développeur — le jour
où une équipe réelle entre dans la boucle, et elle est déjà rangée dans
[ROADMAP.md](./ROADMAP.md).

**Les multiplicateurs.** Documentation et stories dérivées du contrat, niveaux
de confiance en revue, prévisualisation d’un changement de token : ils
multiplient une valeur qui doit d’abord exister.

**Ce qui s’achète.** La régression visuelle est un marché mûr ; un moteur maison
serait une distraction. Un tableau de bord des divergences n’a de sens qu’à une
échelle que le projet n’a pas.

**Le test de généricité du moteur** reste une famille de composants de plus, pas
un champ de plus : états booléens, `SLOT` réel, `INSTANCE_SWAP` native, grille,
typographie variable. Il se poursuit en parallèle des chantiers ci-dessus, sans
les commander.

### L’horizon

Si la chaîne tient de bout en bout, ce que le projet a produit n’est pas un
plugin : c’est un **format et un protocole**. Le plugin est une implémentation
d’extraction parmi d’autres possibles — un autre outil de design, un catalogue
de tokens, un design system déjà codé pourraient produire le même contrat ; un
autre framework, une autre plateforme, un autre agent pourraient le consommer.
La valeur défendable est là : dans un artefact que personne ne possède et que
tout le monde peut lire.

Il serait prématuré de le formuler comme un objectif, et ce document ne le fait
pas. Mais construire d’une manière qui l’interdirait serait une erreur nette —
et c’est pourquoi « le contrat ne connaît ni framework, ni nom de composant, ni
représentation Figma » est un invariant, pas un goût.

Reste, derrière tout cela, une question que rien n’a tranchée : **qui possède le
cycle de vie d’un contrat** quand plusieurs repositories, plusieurs versions du
design system et plusieurs équipes le consomment. Le versionner comme un package
nommé est la réponse la plus probable. Elle n’est pas urgente ; elle deviendra
structurante le jour où le premier consommateur externe apparaîtra.

---

## 6. Ce qui ne doit pas être construit

- écriture automatique du code vers Figma, et plus largement toute
  synchronisation bidirectionnelle — la **détection** qu’une maquette est en
  retard reste légitime, l’écriture dans le document jamais ;
- interprétation du contrat par le code de production au runtime ;
- enrichissement du contrat au-delà du design : snippets, documentation
  complète, arbre Figma brut, événements applicatifs, `aria-*`, règles de
  formulaire ;
- moteur maison de régression visuelle quand un outil spécialisé suffit ;
- plateforme centrale, service tiers ou tableau de bord avant que l’usage réel
  le justifie.

## 7. Questions ouvertes

- **Le contrat s’arrête-t-il au composant ?** Un écran est-il un composé comme
  un autre, ou demande-t-il un vocabulaire que le modèle n’a pas — grille de
  page, responsive, données ? C’est la question qui décide de la portée réelle
  du projet ; elle se tranche par un export (§5.A).
- **Ce que le contrat contrôle**, à geler explicitement : props, valeurs, états,
  références de tokens, slot d’icône, dépendances de composition. Ce qui n’y est
  pas listé ne sera jamais vérifié par la parité.
- **Sécurité du dépôt** : le PAT fine-grained local suffit-il, ou une politique
  interne imposera-t-elle un proxy serveur ?
- **Versionner le design system en package nommé**, et à quel grain.
