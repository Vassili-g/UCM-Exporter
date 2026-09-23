# Le kit de règles d'usage

Le kit de règles est un fichier Figma publié sur la Figma Community :

**<https://www.figma.com/community/file/1684536749543631522>**

Il porte les trois maîtres que le bouton « Créer les règles d'usage » copie :
`.componentRules`, `.rulesSection` et `.ruleItem`. Une équipe qui installe le
plugin depuis la Community n'a aucun de ces maîtres. Sans le kit, le bouton
reste inactif, et la note affichée dessous renvoie au kit.

Ce guide dit comment une équipe l'emploie, puis comment le mainteneur le vérifie
et le republie. La grammaire des règles est dans [FORMAT.md, section
7](../format/FORMAT.md#7-intention-et-documentation-des-props), et le geste de
création dans le [README du
plugin](../../packages/plugin-exporter/README.md#documenter-les-règles-dusage).

## Employer le kit dans son fichier

Dupliquez le kit depuis la Community : la copie arrive dans vos brouillons.
Choisissez ensuite l'un des deux gestes.

| Geste | Ce qu'il demande | Ce que le plugin trouve |
|---|---|---|
| Copier les trois maîtres du kit et les coller sur la page de vos composants | aucun plan payant : un maître copié d'un fichier à l'autre reste un maître | un `COMPONENT` nommé `.componentRules` sur la page active |
| Publier la copie en bibliothèque, puis poser une instance de `.componentRules` sur la page de vos composants | un plan payant, que demande la publication d'une bibliothèque | une instance, dont le maître est distant |

Le premier geste suffit pour un seul fichier de composants. Le second garde une
seule source pour plusieurs fichiers : une mise à jour de la bibliothèque
propage les textes d'aide, sauf dans les calques déjà modifiés.

Sélectionnez ensuite un composant, puis cliquez sur « Créer les règles
d'usage ». Le plugin pose un conteneur à côté du composant, avec une règle par
propriété publiée. Chaque règle porte le marqueur `[À compléter]` jusqu'à ce que
vous la rédigiez.

## Ce que le kit contient

| Contenu | Raison |
|---|---|
| `.componentRules`, avec son calque `component-name` et un slot par section | le plugin pose une instance de ce maître |
| `.rulesSection`, cinq variants : `GÉNÉRAL`, `PROPRIÉTÉS`, `OPTIONS`, `ICONES`, `DOCUMENTATION` | le plugin range chaque règle dans la section de son tag |
| `.ruleItem`, un variant par tag et le variant `divider` | le plugin copie le variant du tag, et sépare deux axes par `divider` |
| Les textes d'aide, marqueur `[À compléter]` compris | une règle qui porte encore le marqueur n'entre pas dans le contrat |

## Vérifier avant de publier

Le mainteneur passe chaque point avant une publication.

- **Noms exacts.** Les maîtres s'appellent `.componentRules`, `.rulesSection` et
  `.ruleItem`. Les calques s'appellent `component-name`, `content`, `prop`,
  `icon`, `modifiable`, `strict`, et un calque par tag (`@usage`, `@prop`…). Le
  plugin rapproche par nom, sans casse ni espaces, jamais par clé : une faute de
  nom rend le kit muet, sans message.
- **Marqueur.** Le calque `content` des variants `@usage`, `@prop` et
  `@boolean` commence par `[À compléter]`. Sinon, le plugin refuse la création,
  parce que ces textes partiraient dans le contrat comme une documentation. Le
  calque `component-name` du maître porte aussi le marqueur : une instance
  collée sans être remplie reste alors vierge, et le plugin la remplit au lieu
  d'en poser une seconde.
- **Autonomie.** Aucun style, aucune variable et aucun composant ne viennent
  d'une bibliothèque tierce. Chez une autre équipe, ces références ne se
  résolvent pas. Une liaison héritée du fichier du design system devient locale,
  ou disparaît.
- **Polices.** Le kit n'emploie que des polices que Figma sert à tous les
  comptes. Une police absente du poste fait refuser l'écriture.
- **Neutralité.** Aucun nom de client, de projet ni couleur de marque, dans le
  fichier, sa description et ses tags.

## Publier et republier

Le fichier du design system du mainteneur fait autorité, et le kit en est une
copie. Republiez le kit quand un texte d'aide change, ou quand la grammaire de
FORMAT.md, section 7, change : un tag ajouté, un calque renommé.

1. Dupliquez le fichier de règles du design system, ou reportez-y les
   changements depuis ce fichier.
2. Passez les vérifications ci-dessus.
3. Publiez depuis l'éditeur, par le menu du fichier. Tout compte disposant d'un
   accès en édition peut publier, sans plan payant. La description dit la
   version du plugin attendue et renvoie à la fiche du plugin :
   <https://www.figma.com/community/plugin/1678431364325816914>.
4. Vérifiez que la description du plugin, sur sa fiche Community, renvoie au
   kit.

Une republication garde l'adresse de la fiche. Si elle en change, remplacez
l'URL dans `LIEN_DU_KIT` (`packages/plugin-exporter/src/ui/components/CarteComposant.ts`)
et dans ce guide, le README du plugin, POUR-LES-DESIGNERS.md et FORMAT.md.
