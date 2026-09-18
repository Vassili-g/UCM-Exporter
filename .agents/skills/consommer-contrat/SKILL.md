---
name: consommer-contrat
description: Reconstruire à froid un composant jetable depuis son contrat UCM.
---

# Reconstruire un composant depuis son contrat

## Périmètre

Charger cette skill uniquement quand la reconstruction à froid est demandée.
Le composant produit est un artefact jetable. Le contrat reste la seule source
du rendu.

Ne pas ouvrir une ancienne implémentation, son historique, son diff, une
sauvegarde, une capture Figma ou un composant voisin. Une comparaison visuelle
vient après la reconstruction.

Le chemin du composant doit être absent avant de commencer. S'il existe encore,
s'arrêter et le signaler sans l'ouvrir.

## Préparer

Depuis le repository consommateur, lancer le relais installé par `ucm init`.
Il exécute la version épinglée de cette commande :

```sh
ucm guide <chemin du contrat> --out <fichier temporaire>
```

Lire le guide produit, puis le contrat cible une fois. Le guide donne la
procédure, les conventions applicables, les aides, les modes, les icônes, les
diagnostics d'export et l'API des dépendances.

Ne modifier ni le contrat, ni les tokens, ni un fichier généré, ni un contrôle.

## Écrire

Suivre la procédure et les aides du guide dans leur ordre. Produire une
transcription statique : le composant ne charge pas le contrat et ne
l'interprète pas à l'exécution.

Les seules sources supplémentaires autorisées sont les types générés et les
points d'intégration publics que les conventions nomment. Les erreurs du
contrôle de type peuvent révéler une prop applicative attendue par les
consommateurs. L'ajouter à la surface publique et la nommer dans le compte
rendu.

## Vérifier

Exécuter les contrôles que le guide demande. Relire le composant contre le
contrat avant toute comparaison visuelle.

Rapporter chaque donnée normative absente, jointure ambiguë, diagnostic
d'export et ajout applicatif. Ne corriger aucun artefact exporté pour masquer un
écart.
