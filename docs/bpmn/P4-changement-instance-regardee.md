# P4 — Changement d'instance regardée

Diagramme : [`P4-changement-instance-regardee.bpmn`](P4-changement-instance-regardee.bpmn)

**Déclencheur** : le super-administrateur régional choisit une instance, ou la vue régionale, dans la liste de la barre supérieure.
**Participants** : Super-administrateur régional ; OASIS — couloirs Portail (barre supérieure), Serveur, Magasin (`data/instances.json`).
**Appelle** : S2, S1.

## Étapes

1. Le portail écarte deux cas : « Nouvelle instance… », qui est un autre geste, et le choix de l'instance déjà courante, qui ne demande rien.
2. `PUT /api/instance { instance }` ; S2 contrôle la session.
3. Refus successifs :
   - rôle autre que SUPERADMIN : 403 `forbidden` ;
   - portée nationale : 403 `portee_nationale` ;
   - nom non déclaré : 400 `instance_inconnue` ;
   - instance désactivée : 400 `instance_desactivee`.
4. Le choix est retenu pour le compte, `INSTANCE_CHANGEE` est journalisé (S1), puis le serveur répond.
5. Le portail se recharge entièrement : chaque route filtre ensuite par l'instance courante.

## Règles et leur source

| Règle | Code |
|---|---|
| La liste n'est offerte qu'au régional, et ne porte que les instances actives | `src/instances.js:331-342` ; `frontend/portail/instances.ts:170-187` |
| Seul le super-administrateur régional change d'instance | `server.js:364-367` ; `src/instances.js:126-134` |
| Vide = vue régionale ; sinon un nom déclaré, et actif | `server.js:368-376` ; `src/instances.js:55-75` |
| Le choix est celui du compte, valable pour le portail et les six modules | `src/instances.js:13-18, 106-115, 146-155` |
| Instance courante : celle choisie pour le régional, celle du compte (ou l'instance locale) pour les autres | `src/instances.js:142-144` |
| Un refus donne un avis et redessine le bandeau ; un succès recharge tout | `frontend/portail/instances.ts:198-205` |

## Fins

Écrans servis dans l'instance choisie · rien à faire · 401, 403, 400.

## Écarts

- **[lu] Le choix vaut pour le compte, non pour la session.** Deux onglets ou deux postes du même régional partagent la même instance : un changement dans l'un change le périmètre de l'autre sans qu'il le sache (`src/instances.js:146-155`).
- **[lu]** `instances` n'est pas une collection migrée (`src/magasin.js:115-129`). Son lire-modifier-réécrire est direct, hors de `magasin.modifier` (`src/instances.js:146-155`) ; sûr aujourd'hui parce que synchrone. En mode PostgreSQL, ce fichier reste hors de la base, donc hors de la réplication voulue.
- **[lu]** Si une instance est désactivée alors qu'un régional la regarde, rien ne remet son choix à zéro (`basculerActivite`, `src/instances.js:79-89`) : il continue de la voir, mais ne pourrait plus la choisir.
