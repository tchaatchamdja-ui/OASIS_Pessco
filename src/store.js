// Couche de persistance du socle (fichiers JSON).
// Production : remplacée par PostgreSQL 16 — une base par État (cf. Note technique §4).
const fs = require('fs');
const path = require('path');

// Répertoire de données : surchargeable (tests de fumée, instances multiples).
const DATA_DIR = process.env.OASIS_DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Cache mémoire, invalidé dès que le fichier change sur le disque : deux
// processus servant le même répertoire (déploiement multi-instance, seconde
// instance lancée par mégarde) ne se rendent plus mutuellement aveugles.
const cache = new Map();     // nom -> { valeur, mtimeMs }

function file(name) {
  return path.join(DATA_DIR, name + '.json');
}

function mtime(chemin) {
  try { return fs.statSync(chemin).mtimeMs; } catch { return 0; }
}

function load(name, fallback) {
  const chemin = file(name);
  const surDisque = mtime(chemin);
  const enCache = cache.get(name);
  if (enCache && enCache.mtimeMs === surDisque) return enCache.valeur;

  let valeur = fallback;
  if (surDisque) {
    try {
      valeur = JSON.parse(fs.readFileSync(chemin, 'utf-8'));
    } catch {
      valeur = fallback;
    }
  }
  cache.set(name, { valeur, mtimeMs: surDisque });
  return valeur;
}

function save(name, value) {
  const chemin = file(name);
  const tmp = chemin + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, chemin);
  // Le cache retient la version écrite et la date du fichier qui la porte.
  cache.set(name, { valeur: value, mtimeMs: mtime(chemin) });
}

module.exports = { load, save };
