# P2 — Session expirée et reprise

Diagramme : [`P2-session-expiree-reprise.bpmn`](P2-session-expiree-reprise.bpmn)

**Déclencheur** : un geste de l'agent (ou le retour du réseau) après plus de `sessionTimeoutMinutes` d'inactivité.
**Participants** : Agent de l'AAC ; OASIS — couloirs Socle navigateur (portail ou module), Serveur.
**Appelle** : S2, P1.

## Étapes

1. Le `fetch` enveloppé pose `X-OASIS-Request` et fusionne deux écritures identiques en vol.
2. S2 contrôle la session. Valide → la requête est traitée et l'écran se met à jour.
3. Expirée → le serveur répond 401. Ce qui suit dépend de l'émetteur :
   - **un écran** (`json()`, `appel()`) : `sessionPerdue()` s'exécute une seule fois, vide `pr_user` et `pr_token`, et envoie la fenêtre de tête vers `/login.html` — un module en cadre emmène le portail avec lui. L'agent se reconnecte (P1) et arrive sur l'accueil ;
   - **le rejeu de la file hors ligne** (RAMP, SURV) : l'entrée est marquée en échec avec son statut et gardée pour un humain.

## Règles et leur source

| Règle | Code |
|---|---|
| Pas de minuteur côté navigateur ; `/api/politique-session` n'est lu que par la page des cookies | `server.js:198-203` ; `frontend/portail/pages/cookies-page.ts:34` |
| `fetch` enveloppé une fois ; POST et DELETE identiques fusionnés | `frontend/socle/requete.ts:64-129` |
| `sessionPerdue()` ne part qu'une fois et vise `window.top` | `frontend/socle/requete.ts:40-50` |
| L'appelant reçoit quand même une erreur, traduite | `frontend/socle/commun.ts:326-332` |
| Après reconnexion, toujours `/` | `frontend/portail/pages/login-page.ts:132, 191` |
| Rejeu : un refus du serveur marque l'entrée en échec, sans la jeter | `frontend/socle/hors-ligne.ts:196-208` |
| Les entrées en échec ne sont pas rejouées | `frontend/socle/hors-ligne.ts:180-182` |

## Fins

Écran à jour · session neuve sans la page ni la saisie · saisie différée bloquée.

## Écarts

- **[lu] Pas de reprise.** La page quittée n'est pas retenue (`login-page.ts:132`), et ce qui était saisi dans l'écran est perdu avec lui. Aucun avertissement n'arrive avant l'expiration, faute de minuteur.
- **[lu] Une session expirée pendant une coupure bloque toute la file hors ligne.** Au retour du réseau, chaque entrée reçoit 401 et passe en échec (`hors-ligne.ts:196-208`). Elle n'est pas rejouée après reconnexion (`180-182`) : un humain doit la reprendre, alors que la cause est seulement la session. Non vérifié dans un navigateur.
