# P3 — Écriture d'un enregistrement (patron des modules)

Diagramme : [`P3-ecriture-enregistrement.bpmn`](P3-ecriture-enregistrement.bpmn)

**Déclencheur** : un module envoie une écriture (POST, PUT, DELETE) sur son préfixe d'API.
**Exemple suivi** : `POST /api/m/pr/evaluations/:id/soumettre-directeur` (`src/modules/profil_risque/routes-workflow.js:28-40`). Les gardes du socle sont communes à tous les modules ; la partie « lecture, privilège, écriture » varie de route en route, et le diagramme en donne le patron.
**Participants** : Agent ; OASIS — couloirs Module (écran), Serveur, Magasin.
**Appelle** : S2, S1 (deux fois).

## Étapes

1. Le module envoie la requête par `json()`.
2. Gardes du socle, dans l'ordre :
   - en-tête `X-OASIS-Request` (403 sinon) ;
   - forme du corps (400) ;
   - écoute d'audit posée ;
   - S2 (401 ou 429) ;
   - schéma propre à la route, s'il y en a un (400).
3. Lecture de l'enregistrement courant (404 s'il est absent).
4. Privilège effectif calculé : accès au module, portée secteur, portée domaine, puis privilège de base. Rang insuffisant → 403.
5. Transformation atomique dans le magasin : file par collection, relecture, application, fichier temporaire puis renommage. Enregistrement disparu entre-temps → 404.
6. Journal du socle (S1) avec l'action propre à la route, puis réponse 2xx.
7. Réponse partie : l'écran s'affiche et, en parallèle, l'audit du module s'inscrit (S1) sans être attendu.

## Règles et leur source

| Règle | Code |
|---|---|
| Origine applicative exigée pour toute écriture sur `/api/` | `src/protections.js:197-205` ; posée par `server.js:90` |
| Forme bornée du corps sur chaque préfixe de module | `src/module_loader.js:59-66` ; `src/valider.js:191-219` |
| Schéma déclaratif, sur les seules routes qui le déclarent | `src/valider.js:71-106, 153-175` |
| Privilège : accès au module, puis portée secteur > domaine > privilège de base | `src/module_rights.js:95-122` |
| Rang : GESTIONNAIRE > VALIDATEUR > CONTRIBUTEUR > LECTEUR > AUCUN | `src/module_rights.js:20, 124-131` |
| Un compte d'organisme n'a pas ce privilège | `src/modules/profil_risque/roles.js:23-26` |
| Lire-modifier-réécrire atomique, une file par collection | `src/magasin.js:154-161, 206-215` |
| Écriture de fichier atomique (temporaire puis renommage) | `src/store.js:74-83` |
| Retrait logique (`retire_le`) plutôt que suppression, là où il est employé | `src/magasin_module.js:90-114` |
| Audit du module : toute mutation 2xx, action déduite de l'URL | `src/module_audit.js:44-56, 173-227` |
| Erreur imprévue : 500 avec une référence, journalisée | `server.js:1148-1160` |

## Fins

Écran à jour et entrées d'audit · 400, 401, 403, 404, 429 · 500 (non dessiné : possible à chaque étape).

## Écarts

- **[lu] Le contrôle et l'écriture sont séparés.** Le privilège est évalué sur la portée (domaine, secteur) lue avant la transformation (`routes-workflow.js:29-31`) et n'est pas revérifié dedans (`33-36`). Une portée modifiée entre-temps n'est pas vue. La route suivie ne pose en outre aucune précondition de statut : deux soumissions concurrentes passent toutes deux, la seconde réécrivant les dates de la première. D'autres routes ont leurs propres gardes, non relues ici.
- **[lu] L'audit du module n'est pas attendu.** Il est inscrit après le départ de la réponse (`src/module_audit.js:196, 205-227`). Un échec ne laisse qu'une trace, et un arrêt du processus entre les deux laisse un acte sans entrée. Ses détails viennent du corps reçu, non de ce qui a été écrit (`198-204`).
- **[lu] L'audit du socle est attendu, mais après l'écriture** (`routes-workflow.js:33-38`). Un échec du journal rend 500 alors que l'écriture est faite.
- **[lu] Un fichier JSON illisible devient la valeur par défaut** (`src/store.js:62-68`), et l'écriture suivante l'écrase sans bruit : une collection corrompue disparaît au premier enregistrement.
- **[lu]** Le schéma par route n'est déclaré que sur une minorité de routes (`grep -rn "enregistrement(\|valider({" src/modules`) ; ailleurs, seule la forme bornée protège.
