# P8 — Téléchargement d'une pièce

Diagramme : [`P8-telechargement-piece.bpmn`](P8-telechargement-piece.bpmn)

**Déclencheur** : l'agent clique « Exporter » ou « Télécharger ».
**Participants** : Agent ; OASIS — couloirs Module (écran), Navigateur (navigation de premier niveau), Serveur.
**Appelle** : S2.

## Étapes

1. La demande tient dans une adresse → `telecharger(url)`, c'est-à-dire `window.location.href = url`.
2. Sinon, un POST de préparation (avec `X-OASIS-Request`) produit la pièce et la dépose sous un jeton (5 min, lié au compte, usage unique). L'écran navigue ensuite vers l'adresse du jeton.
3. Le GET de navigation arrive sans `X-OASIS-Request` ; S2 contrôle la session.
4. `pageDeRefus` est posé : tout refus ≥ 400 devient une page HTML lisible.
5. Deux cas :
   - **GET direct** : contrôle du droit de lecture (403 en page), puis production de la pièce ;
   - **jeton** : connu, non expiré et du même compte, sinon page 404 `piece_expiree`. Le jeton est retiré au service.
6. La pièce est servie avec `Content-Disposition: attachment` ; le navigateur l'enregistre sans quitter la page.

## Règles et leur source

| Règle | Code |
|---|---|
| Toujours une navigation, jamais `fetch` + ancre cliquée (qui échoue sans bruit après une attente) | `frontend/socle/commun.ts:400-437` |
| Une navigation se reconnaît à l'absence de `X-OASIS-Request` | `src/telechargement.js:75` |
| Un refus devient une page HTML ; un succès et un appel d'API restent en JSON | `src/telechargement.js:94-140` |
| En-tête `Content-Disposition` en deux formes (RFC 6266), posé à un seul endroit | `src/telechargement.js:53-71` |
| POST de préparation, puis GET du jeton : le garde d'origine reste entier | `src/telechargement.js:141-164` ; `src/modules/execution/routes-dossiers.js:608-637` |
| Jeton : 5 min, lié au compte, usage unique, balayage à chaque dépôt | `src/telechargement.js:165-191` |

## Fins

Fichier enregistré · page de refus 403 ou 404 · 401 en JSON brut.

## Écarts

- **[lu] Le 401 d'une navigation n'est jamais mis en page.** Sur chaque route, `requireAuth` précède `pageDeRefus` (ex. `routes-partage.js:161`, `routes-dossiers.js:633`, `routes-excel.js:152`). `requireAuth` répond donc (`server.js:112`) avant que `res.json` soit enveloppé. Un agent dont la session a expiré voit `{"error":"unauthenticated"}` brut, et la phrase prévue (`src/telechargement.js:95`) n'est jamais servie. Le contrôle `tests/smoke/unitaires.smoke.js:1995-2031` éprouve le middleware isolé et ne le voit pas. À mesurer dans un navigateur.
- **[lu]** Les pièces préparées vivent dans la mémoire du processus (`src/telechargement.js:167`) : un redémarrage entre le POST et le GET donne une page 404. C'est voulu (`157-158`), et sans gravité.
