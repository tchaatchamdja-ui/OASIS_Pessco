#!/bin/sh
# OASIS — sauvegarde horodatée du répertoire de données (DEP-02).
# Usage :  scripts/sauvegarde.sh [répertoire de destination] [jours de rétention]
# Exemple de planification quotidienne (crontab) :
#   0 2 * * * /chemin/vers/oasis/scripts/sauvegarde.sh /var/sauvegardes/oasis 30
set -eu

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${OASIS_DATA_DIR:-$RACINE/data}"
DESTINATION="${1:-$RACINE/sauvegardes}"
RETENTION="${2:-30}"
HORODATAGE="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$DESTINATION/oasis-data-$HORODATAGE.tgz"

[ -d "$SOURCE" ] || { echo "Répertoire de données introuvable : $SOURCE" >&2; exit 1; }
mkdir -p "$DESTINATION"

# L'écriture du store est atomique (fichier temporaire puis renommage) : une
# archive prise à chaud ne peut pas contenir de fichier à moitié écrit.
tar czf "$ARCHIVE" -C "$(dirname "$SOURCE")" "$(basename "$SOURCE")"
echo "Sauvegarde : $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Rétention : les archives plus anciennes que N jours sont supprimées.
find "$DESTINATION" -name 'oasis-data-*.tgz' -type f -mtime "+$RETENTION" -delete
echo "Archives conservées : $(find "$DESTINATION" -name 'oasis-data-*.tgz' | wc -l | tr -d ' ')"
