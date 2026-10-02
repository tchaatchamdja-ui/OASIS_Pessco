// Couche de persistance du socle (fichiers JSON).
//
// La cible reste PostgreSQL 16, une base par État (note technique §4). Le
// magasin est écrit et sa reprise éprouvée contre un vrai serveur —
// `src/store_pg.js`, `scripts/migrer-pg.js` —, et la bascule est décidée
// (ADR-002, jalon n° 7). Elle n'est pas faite : `load` et `save` sont
// synchrones, aucun client PostgreSQL ne l'est, et 450 appels en dépendent.
//
// **Ce que ces deux fonctions garantissent sans le dire.** Étant synchrones,
// rien ne s'intercale entre un `load` et le `save` qui le suit : Node ne rend
// la main qu'aux `await`, et il n'y en a pas. C'est ce qui rend sûr le geste
// que font presque tous les appels du socle — lire, ajouter une ligne,
// réécrire. La conversion en asynchrone **détruit cette garantie**, avant même
// qu'un second processus existe ; chaque appel de cette forme devra devenir un
// `modifier`, non un `load` et un `save` suivis d'`await`.
//
// Mesures, défauts trouvés et suite qui les garde : docs/MAGASIN-POSTGRESQL.md.
const fs = require('fs');
const path = require('path');

// ── Répertoire de données : lu à chaque appel, et non figé à l'import ──
//
// Il l'était, et **cela a détruit `data/users.json`**. Un module du socle chargé
// avant que `OASIS_DATA_DIR` soit posé figeait le vrai `data/` pour toute la durée
// du processus ; la variable posée ensuite n'avait plus aucun effet, et les
// contrôles écrivaient dans les données de travail. Le chemin complet de
// l'incident est dans l'en-tête de `tests/smoke/bac.js`.
//
// Une fonction, donc — comme le fait déjà `src/journal.js`, son voisin. Lire
// `process.env` coûte moins qu'un appel système, et il y a un accès disque juste
// après.
//
// Le répertoire se crée **à la première écriture**, et non à l'import : créer un
// `data/` du seul fait de charger un module faisait apparaître un répertoire que
// personne n'avait demandé, là où le processus avait été lancé.
const dossier = () => process.env.OASIS_DATA_DIR || path.join(__dirname, '..', 'data');

// Cache mémoire, invalidé dès que le fichier change sur le disque : deux
// processus servant le même répertoire (déploiement multi-instance, seconde
// instance lancée par mégarde) ne se rendent plus mutuellement aveugles.
//
// **Indexé par chemin complet, non par nom** : le répertoire pouvant changer,
// deux `users` de deux répertoires se seraient rendus l'un pour l'autre — un
// contrôle aurait lu les comptes de production depuis son bac, sans rien
// toucher mais en les croyant siens.
const cache = new Map();     // chemin -> { valeur, mtimeMs }

function file(name) {
  return path.join(dossier(), name + '.json');
}

function mtime(chemin) {
  try { return fs.statSync(chemin).mtimeMs; } catch { return 0; }
}

function load(name, fallback) {
  const chemin = file(name);
  const surDisque = mtime(chemin);
  const enCache = cache.get(chemin);
  if (enCache && enCache.mtimeMs === surDisque) return enCache.valeur;

  let valeur = fallback;
  if (surDisque) {
    try {
      valeur = JSON.parse(fs.readFileSync(chemin, 'utf-8'));
    } catch {
      valeur = fallback;
    }
  }
  cache.set(chemin, { valeur, mtimeMs: surDisque });
  return valeur;
}

function save(name, value) {
  const rep = dossier();
  if (!fs.existsSync(rep)) fs.mkdirSync(rep, { recursive: true });
  const chemin = path.join(rep, name + '.json');
  const tmp = chemin + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, chemin);
  // Le cache retient la version écrite et la date du fichier qui la porte.
  cache.set(chemin, { valeur: value, mtimeMs: mtime(chemin) });
}

module.exports = { load, save };
