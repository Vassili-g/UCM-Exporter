# Mesurer le moteur

Depuis la racine du dépôt :

```sh
node packages/plugin-exporter/scripts/mesurer-export.cjs
node packages/plugin-exporter/scripts/mesurer-export.cjs HEAD~1
```

Le second appel compare chaque fichier mesuré à la révision indiquée. Les
dépendances importées restent celles du répertoire de travail. Le script
vérifie l'égalité des résultats, hors date d'export, avant d'afficher les temps.

Chaque durée est la médiane de sept exécutions après deux passages de chauffe.
Les scénarios couvrent les arbres profonds, les arbres larges, les variantes,
la recherche des règles et un export sans instance dans un document de
101 pages. Le nombre de chargements des pages est relevé séparément.

Ces objets synthétiques mesurent le JavaScript du moteur. Le coût des appels
natifs et du chargement des pages doit être mesuré dans Figma sur un réexport.
