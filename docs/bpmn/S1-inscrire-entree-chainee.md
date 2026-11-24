# S1 — Inscrire une entrée au journal chaîné

Diagramme : [`S1-inscrire-entree-chainee.bpmn`](S1-inscrire-entree-chainee.bpmn) · processus `Proc_S1_Oasis`, appelé par P3, P5 et cité par P1, P4, P6.

**Déclencheur** : tout acte journalisé — `audit.log` pour le socle (`src/audit.js:57`), `moduleAudit.log` pour un module (`src/module_audit.js:102`).
**Couloirs** : Serveur, Magasin.

## Étapes

1. Au premier usage, reprendre le journal hérité (tableau JSON) en lignes, une fois.
2. Selon le magasin :
   - **fichiers** : mettre l'inscription dans la file du journal, lire la chaîne (filtrée par module pour `module_audit`), construire l'entrée, calculer son empreinte, ajouter une ligne au `.jsonl` ;
   - **PostgreSQL** : la même construction, insérée sous une contrainte d'unicité, rejouée si le rang est pris.
3. Fin : entrée chaînée.

## Règles et leur source

| Règle | Code |
|---|---|
| Reprise du format hérité, idempotente, sans toucher une empreinte | `src/audit.js:38-52` ; `src/module_audit.js:65-81` |
| Une file d'attente par journal rend l'inscription atomique sur fichiers | `src/magasin.js:154-161, 261-272` |
| `prevHash` = empreinte de la dernière entrée, ou `GENESIS` (`AEROSUP-GENESIS`, `OASIS-MODULE-GENESIS`) | `src/audit.js:28, 63` ; `src/module_audit.js:23, 108` |
| Empreinte = SHA-256(prevHash, ts, user, action, détails — plus objet et ref pour un module) | `src/audit.js:31-36` ; `src/module_audit.js:95-100` |
| Horodatage et empreinte recalculés si une autre inscription est passée entre-temps | `src/audit.js:59-61` |
| Ajout seul, jamais de réécriture d'une entrée | `src/journal.js:70-79` ; réécriture réservée à la reprise : `81-91` |
| En base : unicité `(nom, cle, rang)`, 20 essais | `src/store_pg.js:262-275` |
| Vérification : chaîne relue depuis `GENESIS`, première rupture signalée | `src/audit.js:82-92` ; `src/module_audit.js:149-170` |

## Écarts

- **[lu]** Une ligne illisible est ignorée à la lecture (`src/journal.js:44-46, 56`). La vérification rompt alors la chaîne à l'entrée suivante, mais l'entrée perdue n'est pas nommée.
- **[lu]** Le cache de lecture est invalidé sur taille et date (`src/journal.js:30-39`). Sur un système de fichiers à résolution grossière, deux ajouts de même taille dans la même milliseconde ne le distingueraient pas — sans effet tant qu'un seul processus écrit (verrou, P6).
