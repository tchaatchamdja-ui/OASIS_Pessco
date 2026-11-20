# P9 — Sauvegarde et sonde des sauvegardes

Diagramme : [`P9-sauvegarde-sonde.bpmn`](P9-sauvegarde-sonde.bpmn)

**Déclencheurs** :
- la tâche planifiée, chaque jour à 2 h, lance `scripts/sauvegarde.sh` ;
- la sonde du serveur s'exécute au démarrage puis toutes les 24 h.

**Participants** : Exploitant ; OASIS — couloirs Script, Système de fichiers, Serveur (sonde).

## Étapes

**Archiver** :
1. Répertoire de données introuvable → `exit 1`.
2. Créer la destination ; `tar czf` vers `oasis-data-AAAAMMJJ-HHMMSS.tgz`, sans `.verrou` ni `.sonde`.
3. `tar` échoue → arrêt (`set -eu`). Sinon, annoncer l'archive, effacer celles de plus de N jours (30), annoncer le nombre conservé.

**Sonder** :
1. Lister les archives au motif attendu.
2. Verdict, tracé au niveau qu'il mérite :
   - `ok` (info) ;
   - `non_configure` (alerte) ;
   - `aucune`, `tronquee` ou `perimee` (erreur).

   `/api/health` le rend aussi.

## Règles et leur source

| Règle | Code |
|---|---|
| Source `OASIS_DATA_DIR` ou `data/`, destination et rétention en arguments | `scripts/sauvegarde.sh:8-11` |
| Le verrou n'entre pas dans l'archive | `scripts/sauvegarde.sh:19-24` |
| Rétention par l'âge | `scripts/sauvegarde.sh:28` |
| Motif des archives ; seuil 26 h ; plancher 10 Kio | `src/sauvegardes.js:36, 41, 49` |
| Cinq verdicts ; « introuvable » n'est pas « vide » | `src/sauvegardes.js:59-125` |
| Niveaux : `non_configure` en alerte, les trois défauts en erreur | `src/sauvegardes.js:146-148` |
| Au démarrage puis chaque jour, sauf `OASIS_SONDE_SAUVEGARDES=0` | `server.js:1225-1228` |
| Le statut global de santé ne passe pas à `degrade` pour une sauvegarde manquante | `DEPLOYMENT.md:312-315` |

## Fins

Archive écrite · données introuvables · archive interrompue · verdict tracé.

## Écarts

- **[lu] `config/` n'est pas archivé.** Le README annonce « archives horodatées de data/ et config/ » ; le script n'archive que le répertoire de données (`scripts/sauvegarde.sh:23-24`).
- **[lu] En mode PostgreSQL, les collections migrées ne sont pas sauvegardées.** Elles vivent en base (`src/magasin.js:115-129`), et le script n'archive que des fichiers ; la sonde peut pourtant dire `ok`.
- **[lu] Une archive interrompue garde son nom final** (`23` sous `set -eu`). Si elle dépasse 10 Kio, la sonde la tient pour valide.
- **[lu] La rétention efface par l'âge seul** (`28`). Si les archives récentes sont toutes tronquées, la dernière bonne finit effacée.
- **[lu] Prise à chaud.** Le commentaire des lignes 17-18 vaut pour les fichiers réécrits par renommage, non pour les journaux `.jsonl` complétés en place (`src/journal.js:72-79`), dont la dernière ligne peut être coupée. La cohérence entre fichiers n'est pas garantie non plus.
- **Manque** : aucune procédure de restauration n'est écrite. Le processus s'arrête à l'archive.
