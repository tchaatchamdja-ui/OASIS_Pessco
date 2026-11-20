# P1 — Connexion et double authentification

Diagramme : [`P1-connexion-double-authentification.bpmn`](P1-connexion-double-authentification.bpmn)

**Déclencheur** : l'agent soumet le formulaire de `/login.html`.
**Participants** : Agent de l'AAC ; Messagerie (boîte noire) ; OASIS — couloirs Portail (page de connexion), Serveur, Magasin.
**Appelle** : S1 pour chaque entrée d'audit (`LOGIN`, `LOGIN_ECHEC`, `COMPTE_BLOQUE`, `MFA_*`).

## Étapes

1. La page bloque le bouton et envoie `POST /api/login`.
2. Limitation par IP : plus de 20 essais en 15 min → 429.
3. Le serveur relit l'annuaire, puis enchaîne les refus : identifiants absents (400), compte inconnu ou inactif, compte bloqué, mot de passe temporaire expiré, mot de passe faux (401). Un mot de passe faux incrémente le compteur et bloque au 5ᵉ échec.
4. Mot de passe juste → compteur remis à zéro.
5. **Sans MFA** : la session est créée et `LOGIN` journalisé, puis l'instance du compte est contrôlée. Si elle est désactivée → 403 ; sinon le cookie est posé et la page va à `/`.
6. **Avec MFA** : l'instance est contrôlée (403 si désactivée). Un défi est posé (6 chiffres, empreinte salée, 10 min), le code part sans être attendu, et la page affiche l'étape du code.
7. Le geste de l'agent :
   - **annulation** : retour au formulaire ;
   - **renvoi** : l'ancien défi est retiré et un nouveau posé ;
   - **code** : `POST /api/login/mfa`, vérifié dans une transformation atomique.
8. Verdict :
   - défi absent ou expiré : 401 ;
   - 5 essais atteints : 401 ;
   - code faux : essais restants affichés, retour à l'étape du code ;
   - code juste : compte actif ? (401 sinon), puis session créée, `LOGIN` (mfa), cookie posé, accueil.

## Règles et leur source

| Règle | Code |
|---|---|
| 20 essais d'authentification par IP et par 15 min | `src/protections.js:62-89` |
| Mot de passe haché par scrypt, comparaison à temps constant | `src/auth.js:42-51` |
| Blocage au seuil `maxFailedAttempts`, décompte arrêté dans la transformation atomique | `src/auth.js:243-263` |
| Mot de passe temporaire valable 48 h | `server.js:40` ; `src/auth.js:238-242` |
| Session unique : les autres sessions du compte sont retirées | `src/auth.js:192-200` |
| MFA : `OASIS_MFA` l'emporte sur `security.mfaEnabled` | `server.js:214-225` |
| Instance désactivée : refus après l'authentification, pour ne pas dire qui existe | `server.js:236-243` |
| Code à 6 chiffres, 10 min, 5 essais, empreinte SHA-256 salée, jamais en clair | `src/mfa.js:23-25, 33, 65-85` |
| Verdict arrêté dans la transformation atomique (pas de force brute par parallélisme) | `src/mfa.js:107-143` |
| L'envoi du code n'est pas attendu ; un échec ne part qu'aux traces | `src/mfa.js:87-101` |
| Cookie `HttpOnly; SameSite=Lax`, `Secure` en production, sans `Max-Age` | `server.js:206-212` |
| La page va toujours à `/` après connexion | `frontend/portail/pages/login-page.ts:132, 191` |

## Fins

Session ouverte · 400 / 401 (`invalid`, `locked`, `temp_expired`, `mfa_expired`, `mfa_too_many_attempts`) · 403 `instance_desactivee` · 429.

## Écarts

- **[mesuré] Le renvoi du code ne lie pas le défi à son compte.** `POST /api/login/mfa/resend` prend `username` dans le corps (`server.js:273-277`), et `mfa.resend` ne vérifie que l'existence du défi (`src/mfa.js:145-155`). Mesure : un défi posé pour A, renvoyé au nom de B, crée un défi pour B. `/api/login/mfa` ouvre ensuite la session au nom du défi (`server.js:262-266`) : le mot de passe de B n'est jamais demandé. Une session de correction est ouverte à part.
- **[lu]** Sans MFA, la session est créée et `LOGIN` journalisé (`src/auth.js:270-271`) avant le refus pour instance désactivée (`server.js:241-243`). La session reste dans la table sans cookie, et l'audit dit « connecté » pour une connexion refusée.
- **[lu]** `/api/login/mfa` ne revérifie ni l'instance désactivée ni le blocage (`server.js:264-265`). Un compte bloqué ou une instance désactivée entre le mot de passe et le code n'empêche pas l'ouverture.
- **[lu]** Les réponses `locked` et `temp_expired` distinctes d'`invalid` (`src/auth.js:234-242`) révèlent l'existence du compte. Choix d'ergonomie possible, à trancher.
- **[mesuré]** L'historique des mots de passe ne refuse aucune réutilisation, pas même du mot de passe courant (`src/auth.js:282-284`). C'est le geste de changement qui suit la connexion ; il n'est pas dessiné ici.
