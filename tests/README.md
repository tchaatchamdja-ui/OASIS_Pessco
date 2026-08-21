# Tests de fumée

```bash
npm run smoke              # socle + tous les modules
npm run smoke -- plan      # une suite (filtre sur le nom)
```

Chaque suite démarre son propre serveur sur une **copie temporaire** de
`data/` et `config/` (`OASIS_DATA_DIR`, `OASIS_CONFIG_DIR`) : la base de
travail n'est jamais modifiée, et `singleSession` y est désactivé pour ne pas
évincer la session de l'utilisateur.

| Suite | Couverture |
|---|---|
| `socle` | authentification, refus de l'anonyme, catalogue et super-menus, bus de services, référentiels, audit |
| `profil-risque` | contexte, collections, bibliothèque, contrat `PR.riskProfiles`, privilèges |
| `planification` | plans et activités, cycle complet création → soumission → rejet → validation → amendement → annulation, synchronisation des risques, discussions |
| `droits` | contexte, portées, privilèges, évaluateurs éligibles, intégrité de la chaîne d'audit |

Ajouter un module : créer `tests/smoke/<code>.smoke.js` sur le modèle des
suites existantes et l'enregistrer dans `tests/smoke/index.js`.
