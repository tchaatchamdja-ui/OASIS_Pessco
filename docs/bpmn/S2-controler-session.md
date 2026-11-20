# S2 — Contrôler la session (`requireAuth`)

Diagramme : [`S2-controler-session.bpmn`](S2-controler-session.bpmn) · processus `Proc_S2_Oasis`, appelé par P2, P3, P4, P5 et P8.

**Déclencheur** : toute requête vers une route protégée (`server.js:108`).
**Couloirs** : Serveur, Magasin.

## Étapes

1. Lire le cookie `oasis_session`.
2. Chercher le jeton dans la table des sessions en mémoire ; inconnu → 401.
3. Inactivité supérieure à `sessionTimeoutMinutes` → retirer la session, persister la table sans attendre, 401.
4. Sinon repousser `lastActivity`.
5. Relire l'instantané `users`, `referentiels`, `module_rights`.
6. Compte absent ou inactif → 401.
7. Pour une écriture, compter l'écriture du compte sur 60 s ; plafond dépassé → journaliser `ECRITURE_DEBIT_DEPASSE` (S1), 429.
8. Fin : `req.user`, `req.cfg`, `req.token` posés.

## Règles et leur source

| Règle | Code |
|---|---|
| La table en mémoire fait foi ; le magasin n'en garde qu'une copie | `src/auth.js:14-26` |
| Expiration après `sessionTimeoutMinutes` (30 par défaut) sans activité | `src/auth.js:207-219` ; `config` via `server.js:109` |
| Un échec de persistance d'une expiration ne part qu'aux traces | `src/auth.js:212-215` |
| L'instantané est relu une fois par requête | `server.js:113-124` ; `src/instantane.js:75-81` |
| Seuls `active` et l'existence du compte sont vérifiés | `server.js:125-126` |
| Plafond `maxWritesPerMinute` (600 ; 0 le retire), sur les méthodes d'écriture | `src/protections.js:126-148` ; appel `server.js:134` |

La garde d'origine `X-OASIS-Request` (`src/protections.js:197-205`) est posée **avant** les routes, donc avant S2. Elle est montrée dans P3, P5 et P8.

## Écarts

- **[lu]** `locked` et `mustChange` ne sont pas regardés (`server.js:126`). Un compte bloqué par des échecs de connexion venus d'ailleurs garde sa session ouverte. Un compte qui doit changer son mot de passe n'est retenu que par la fenêtre du portail (`frontend/portail/demarrage.ts:214-217`) ; l'API et les modules ouverts directement le laissent passer.
- **[lu]** La dérive de `lastActivity` n'est pas persistée (`src/auth.js:217`). Après un redémarrage, une session active peut être déclarée expirée sur son dernier horodatage écrit (ouverture). C'est voulu par le commentaire `src/auth.js:23-25` ; à confirmer côté maîtrise d'ouvrage.
