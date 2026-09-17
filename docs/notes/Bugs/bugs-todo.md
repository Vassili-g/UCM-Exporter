# Bugs à corriger, zone 1

Suivi des corrections des constats de [BUGS.md](./BUGS.md). Chaque ligne se
coche quand le test de régression passe et a été vu rouge sur le code d'avant.

- [x] 5. Le relevé des refus enregistrés ne correspond plus au validateur.
  Cause : `34e584c` a corrigé quatre contrôles de `validation-contrat.mjs`
  (padding sur un seul axe, contour sans épaisseur, clé inconnue sous
  `structure`, nom Figma du variant) sans régénérer `refus-enregistres.json`.
  Geste : comparer les verdicts avant et après, puis régénérer la référence.
  Fait : les 332 mutations déplacées sur les six contrats figés suppriment
  toutes `padding.x`, `padding.y`, `strokes.*.width` ou `strokes.*.align`,
  que `types.ts` déclare optionnels. Aucun contrôle ne disparaît.
- [x] 1. `validerCycles()` déborde la pile sur une chaîne de 10 000 contrats.
  Geste : parcours par pile explicite, test sur une chaîne de 10 000 contrats.
  Fait : la chaîne se valide en 66 ms, et le test est rouge sur l'ancien code.
  Reste hors de ce constat : un cycle de 10 000 membres prend 11 s, parce que
  `cycleCanonique()` construit et trie toutes ses rotations.
- [x] 4. `validerAdressesDEchantillons()` déborde la pile sur un échantillon
  imbriqué 10 000 fois. Geste : parcours par pile explicite, test de profondeur.
  Fait : le remplacement fautif du niveau le plus profond est signalé, et le
  test lève `RangeError` sur l'ancien code.
- [x] 3. `collecterReferences()` déborde la pile sur un champ inconnu profond
  de 10 000 niveaux. Geste : parcours par pile explicite, même ordre de relevé,
  test de profondeur.
  Fait : la référence du niveau le plus profond est relevée dans l'ordre de
  lecture, et le rapport la cite. Les deux tests épuisent la pile sur l'ancien
  code.
- [ ] 2. Un fichier à la place du dossier `components` fait lever `ENOTDIR` dans
  `controlerRepository()`. Geste : verdict bloquant qui nomme `components`, test
  sur un fichier à la place du dossier.
