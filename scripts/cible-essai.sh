#!/usr/bin/env bash
# OASIS — Une cible d'essai, repartie de zéro.
#
# Les contrôles de fumée peuvent viser une adresse plutôt que le `server.js`
# qu'ils lancent eux-mêmes (ADR-002, jalon n° 5) :
#
#   OASIS_SMOKE_BASE=http://localhost:4899 npm run smoke -- socle
#
# Mais alors le harnais ne remet plus rien à zéro. Or la suite « socle » efface
# un compte, « planification » supprime des plans, « RAMP » supprime des
# inspections : un second passage sur la même cible échoue, et l'on croit à une
# régression là où il n'y a qu'un jeu de données déjà consommé.
#
# Ce script rend la remise à zéro aussi courte que l'oubli serait coûteux.
#
#   scripts/cible-essai.sh            démarre sur le port 4899
#   scripts/cible-essai.sh 5100       sur un autre port
#
# Le jour où le backend Java servira ces routes, c'est lui qu'on lancera à la
# place — et les contrôles ne changeront pas d'une ligne. C'est tout l'objet.
set -euo pipefail

PORT="${1:-4899}"
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BAC="${OASIS_CIBLE_DIR:-/tmp/oasis-cible-$PORT}"

# Le processus qui tenait ce port, s'il en reste un.
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "· arrêt de ce qui occupait le port $PORT"
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t | xargs kill 2>/dev/null || true
  sleep 1
fi

echo "· jeu de données neuf dans $BAC"
rm -rf "$BAC"
mkdir -p "$BAC/data" "$BAC/config"
cp "$RACINE"/tests/fixtures/* "$BAC/data/"

# Session unique désactivée, comme le fait le harnais : sans cela, deux
# connexions successives s'évincent et la moitié des contrôles tombent.
for f in "$RACINE"/config/*; do
  sed 's/"singleSession": true/"singleSession": false/' "$f" > "$BAC/config/$(basename "$f")"
done

echo "· démarrage sur le port $PORT"
OASIS_DATA_DIR="$BAC/data" \
OASIS_CONFIG_DIR="$BAC/config" \
OASIS_SEED_PASSWORD='Aerosup@2026!Uemoa' \
PORT="$PORT" \
  node "$RACINE/server.js" > "$BAC/journal.txt" 2>&1 &

for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:$PORT/login.html"; then
    echo "· prête : http://localhost:$PORT"
    echo
    echo "  OASIS_SMOKE_BASE=http://localhost:$PORT npm run smoke -- socle"
    echo
    echo "  Journal : $BAC/journal.txt"
    exit 0
  fi
  sleep 0.5
done

echo "· la cible n'a pas répondu — voir $BAC/journal.txt" >&2
exit 1
