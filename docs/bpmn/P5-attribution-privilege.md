# P5 — Attribution d'un privilège (Gestion des Droits)

Diagramme : [`P5-attribution-privilege.bpmn`](P5-attribution-privilege.bpmn)

**Déclencheur** : un administrateur enregistre les droits d'un compte dans l'écran DROITS (un module à la fois : `window.DR_MODULE`, PLAN par défaut — `frontend/droits/i18n.ts:457`).
**Participants** : Administrateur (SUPERADMIN ou ADMIN) ; OASIS — couloirs Module DROITS (écran), Serveur, Magasin (`module_rights`).
**Appelle** : S2, S1 (journal du socle, puis journal du module).

## Étapes

1. `PUT /api/m/droits/<module>/users/<compte>` avec `{ privilege, scopes }`.
2. Gardes du socle : origine (403), forme du corps (400), S2 (401 ou 429).
3. Refus successifs :
   - rôle autre que SUPERADMIN ou ADMIN : 403 ;
   - compte inconnu : 404 ;
   - module absent de ses modules : 400 `no_module_access` ;
   - rôle non géré pour ce module : 400 `role_hors_perimetre` ;
   - privilège inconnu : 400 `unknown_privilege`.
4. Les portées sont normalisées : domaine exigé, doublons ôtés, organismes connus seulement pour PRESTATAIRE.
5. LECTEUR sans portée → l'entrée du compte est retirée (retour au défaut) et `DROITS_MODULE_DEFAUT` est journalisé. Sinon l'entrée est écrite et `DROITS_MODULE_MODIFIES` journalisé.
6. Réponse ; l'écran relit la liste. En parallèle, l'audit du module s'inscrit dans la chaîne de PLAN.

## Règles et leur source

| Règle | Code |
|---|---|
| Gérer les droits est réservé aux rôles SUPERADMIN et ADMIN, non au privilège GESTIONNAIRE | `src/module_rights.js:167, 307` |
| Privilèges : GESTIONNAIRE, VALIDATEUR, CONTRIBUTEUR, LECTEUR ; PRESTATAIRE en plus pour SURV et RAMP | `src/module_rights.js:17-31` |
| Rôles gérés : SUPERADMIN, ADMIN, AAC ; ADMIN_PRESTATAIRE en plus pour SURV et RAMP | `src/module_rights.js:37-44` |
| Défaut LECTEUR : absence d'entrée | `src/module_rights.js:19, 59-63, 331-335` |
| Portées : domaine obligatoire, privilège de portée parmi les cinq (AUCUN compris), une seule par couple domaine-secteur | `src/module_rights.js:133-143` |
| Portées d'organisme : organismes connus du référentiel seulement | `src/module_rights.js:148-155` |
| Écriture atomique de `module_rights`, instantané mis à jour | `src/module_rights.js:68-76` ; `src/instantane.js:104-109` |
| La liste des comptes est filtrée par instance | `src/module_rights.js:278-305` |

## Fins

Liste à jour (défaut ou droits posés) · 400, 401, 403, 404, 429.

## Écarts

- **[lu] Pas de cloisonnement par instance à l'écriture.** La liste est filtrée par l'instance de l'administrateur (`module_rights.js:282-283`), mais le `PUT` cherche le compte dans tout l'annuaire (`310`). Un ADMIN d'une AAC peut modifier les droits d'un compte d'une autre s'il connaît son identifiant. Non mesuré.
- **[lu] Les droits de tous les modules s'inscrivent dans le journal de PLAN** : le manifeste de DROITS déclare `auditModule: "PLAN"` (`src/modules/droits/module.json`), et l'action est `DROITS` (`src/module_audit.js:55`). Un droit SURV ne figure donc pas dans la chaîne de SURV.
- **[lu] Deux lectures de l'accès divergent.** `can()` lit l'absence de liste `modules` comme « tout accès » (`module_rights.js:99`) ; `/me` et `/my-access` la lisent comme « aucun accès » (`218, 255`). Un écran peut donc dire « pas d'accès » à un compte que le serveur laisse écrire.
- **[lu]** Une portée invalide est ôtée sans être signalée (`module_rights.js:141-142`) : l'administrateur croit l'avoir posée.
- **[lu]** L'entrée d'audit suit l'écriture sans lui être liée (`338-339`) : un échec du journal laisse les droits changés.
- **Question** : un ADMIN peut modifier les droits d'un SUPERADMIN, puisque ce rôle est « géré » (`module_rights.js:37`). Est-ce voulu ?
