# P6 — Démarrage du serveur et verrou du répertoire de données

Diagramme : [`P6-demarrage-verrou.bpmn`](P6-demarrage-verrou.bpmn)

**Déclencheur** : l'exploitant ou la plateforme lance `node server.js`.
**Participants** : Exploitant ou plateforme ; OASIS — couloirs Serveur, Système de fichiers (`data/.verrou`), Magasin.

## Étapes

1. Lire la configuration ; monter les modules avec leurs gardes (forme du corps, audit).
2. Verrou :
   - `OASIS_VERROU=0` → alerte, pas de verrou ;
   - sinon créer `.verrou` en mode exclusif. Créé → suite. Autre erreur → refus.
   - S'il existe déjà, le lire. Lisible et posé par une autre machine → refus `VERROU_ETRANGER`. Lisible, de cette machine, processus vivant → refus `VERROU_TENU`. Sinon (illisible ou processus mort) → l'effacer, reposer le sien, alerter.
3. Refus : trace « démarrage refusé » avec la conduite à tenir, puis `exit(1)`.
4. Le verrou est rendu à la sortie (`exit`, `SIGINT`, `SIGTERM`, `SIGHUP`).
5. Amorçage, dans l'ordre :
   - préparer le magasin ;
   - recharger les sessions ;
   - amorcer comptes et référentiels ;
   - contrôler la MFA en production ;
   - reprendre les journaux hérités ;
   - migration RAMP et amorçage des modules.

   Toute erreur → `exit(1)`.
6. Écouter sur `PORT` ; port occupé → `exit(1)`.

En parallèle, sans bloquer, partent la sonde des sauvegardes (P9) et la vérification de l'horloge (`server.js:1225-1249`). Elles ne sont pas dessinées.

## Règles et leur source

| Règle | Code |
|---|---|
| Un processus par répertoire de données | `src/verrou.js:1-19` ; `DEPLOYMENT.md:237-257` |
| Prise atomique par création exclusive (`wx`) | `src/verrou.js:50-56` |
| Processus vivant : signal 0 (EPERM compte comme vivant) | `src/verrou.js:30-34` |
| D'une autre machine, rien n'est vérifiable : refus | `src/verrou.js:76-86` |
| Verrou périmé de cette machine : repris, avec une alerte | `src/verrou.js:88-91` ; `server.js:1168-1171` |
| On ne relâche que son propre verrou | `src/verrou.js:97-104` |
| `OASIS_VERROU=0` lève le verrou, avec une alerte | `src/verrou.js:45` ; `server.js:1172` |
| Ordre d'amorçage ; tout échec arrête le serveur avant l'écoute | `server.js:1288-1323` |
| MFA désactivée en production : alerte et entrée d'audit | `server.js:1182-1201` |
| Port occupé : conduite à tenir tracée | `server.js:1277-1284` |

## Fins

En service · démarrage refusé · amorçage interrompu · port occupé (les trois derniers en `exit(1)`).

## Écarts

- **[lu] La reprise d'un verrou périmé n'est pas atomique** (`src/verrou.js:89-90`). Deux démarrages simultanés qui trouvent le même verrou mort peuvent chacun l'effacer et reposer le leur. Le second efface alors celui du premier, et tous deux se croient seuls.
- **[lu] Un verrou lu pendant qu'il s'écrit passe pour périmé.** Entre la création (`53`) et l'écriture du contenu (`54`), le fichier est vide. Un second démarrage le lit comme illisible (`26-28`) et le reprend (`88-90`) — même effet.
- **[lu] Conteneur recréé après un arrêt brutal.** Son nom de machine change, donc le verrou laissé passe pour « étranger » et le démarrage est refusé (`76-86`) jusqu'à intervention manuelle. C'est documenté (`DEPLOYMENT.md:244-255`), mais le processus n'a pas d'autre issue que la main de l'exploitant.
- **[lu]** Le verrou est posé après le montage des modules (`server.js:1036` puis `1166`) ; sans effet tant que le montage n'écrit rien.
