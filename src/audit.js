// Journal d'audit inaltérable (TDR §F.3) : ajout seul + chaînage
// cryptographique. Chaque entrée embarque l'empreinte de la précédente ; toute
// altération rompt la chaîne.
//
// Le support est `src/journal.js` : une entrée par ligne, ajoutée en fin de
// fichier. Le tableau JSON d'avant était relu et réécrit en entier à chaque
// ligne ajoutée ; il est converti à la première écriture, entrée par entrée et
// sans toucher à un seul caractère — empreintes comprises, de sorte que
// `verifyChain()` reste vérifiable sur tout l'historique.
const crypto = require('crypto');
const journal = require('./journal');
const horloge = require('./horloge');

const GENESIS = 'AEROSUP-GENESIS';
const NOM = 'audit';

function entryHash(prevHash, entry) {
  return crypto
    .createHash('sha256')
    .update(prevHash + '|' + entry.ts + '|' + entry.user + '|' + entry.action + '|' + JSON.stringify(entry.details || {}))
    .digest('hex');
}

// Reprise du format, une fois pour toutes : le tableau hérité est recopié
// ligne à ligne. Idempotente — si le journal en lignes existe, il fait foi.
function reprendre() {
  if (journal.converti(NOM)) return false;
  const herite = journal.lireHerite(NOM);
  if (!Array.isArray(herite)) return false;
  journal.ecrireTout(NOM, herite);
  return true;
}

function log(user, action, details) {
  reprendre();
  const entries = journal.lire(NOM);
  const prevHash = entries.length ? entries[entries.length - 1].hash : GENESIS;
  const entry = {
    id: entries.length + 1,
    ts: horloge.maintenant(),
    user: user || 'système',
    action,
    details: details || {},
    prevHash,
  };
  entry.hash = entryHash(prevHash, entry);
  journal.ajouter(NOM, entry);
  return entry;
}

function list() {
  reprendre();
  return journal.lire(NOM);
}

function verifyChain() {
  const entries = list();
  let prevHash = GENESIS;
  for (const e of entries) {
    if (e.prevHash !== prevHash || entryHash(prevHash, e) !== e.hash) {
      return { valid: false, brokenAt: e.id, total: entries.length };
    }
    prevHash = e.hash;
  }
  return { valid: true, total: entries.length };
}

module.exports = { log, list, verifyChain, reprendre };
