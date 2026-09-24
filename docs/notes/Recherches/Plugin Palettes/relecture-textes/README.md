# Relire les textes de Plugin Palettes

Ouvrir [index.html](./index.html) dans un navigateur. La page fonctionne sans connexion et sans installation.

Chaque carte présente le texte actuel et sa proposition modifiable. Choisir « Valider la proposition », « À revoir » ou « Garder l’actuel ». Les choix de vocabulaire et les nouvelles aides ont aussi leurs cartes.

Les décisions et les brouillons sont enregistrés dans ce navigateur. « Exporter mes choix » télécharge `validation-textes-palettes.json` : transmettre ce fichier pour faire reprendre les décisions. « Importer mes choix » recharge un export de la même version de l’inventaire, après confirmation.

Modifier une proposition déjà validée retire sa validation. Les choix ne modifient ni le document d’inventaire ni le plugin.

Pour ouvrir la page sur une adresse locale, lancer depuis la racine du dépôt :

```sh
node "docs/notes/Recherches/Plugin Palettes/relecture-textes/servir.cjs"
```

Puis ouvrir [la relecture locale](http://127.0.0.1:4178).

Le [document d’inventaire](../INVENTAIRE-TEXTES-ET-PROPOSITIONS.md) fournit les textes. Après une modification de ce document, régénérer les données :

```sh
node "docs/notes/Recherches/Plugin Palettes/relecture-textes/generer-donnees.cjs"
```

Les décisions sont liées à la version des données. Un nouvel inventaire utilise une sauvegarde distincte ; les anciennes décisions restent dans le navigateur.
