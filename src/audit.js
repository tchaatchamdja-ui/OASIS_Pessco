// Journal d'audit inaltérable (TDR §F.3) : append-only + chaînage cryptographique.
// Chaque entrée embarque le hash de la précédente ; toute altération rompt la chaîne.
const crypto = require('crypto');
const store = require('./store');

const GENESIS = 'AEROSUP-GENESIS';

function entryHash(prevHash, entry) {
  return crypto
    .createHash('sha256')
    .update(prevHash + '|' + entry.ts + '|' + entry.user + '|' + entry.action + '|' + JSON.stringify(entry.details || {}))
    .digest('hex');
}

function log(user, action, details) {
  const entries = store.load('audit', []);
  const prevHash = entries.length ? entries[entries.length - 1].hash : GENESIS;
  const entry = {
    id: entries.length + 1,
    ts: new Date().toISOString(),
    user: user || 'système',
    action,
    details: details || {},
    prevHash,
  };
  entry.hash = entryHash(prevHash, entry);
  entries.push(entry);
  store.save('audit', entries);
  return entry;
}

function list() {
  return store.load('audit', []);
}

function verifyChain() {
  const entries = store.load('audit', []);
  let prevHash = GENESIS;
  for (const e of entries) {
    if (e.prevHash !== prevHash || entryHash(prevHash, e) !== e.hash) {
      return { valid: false, brokenAt: e.id, total: entries.length };
    }
    prevHash = e.hash;
  }
  return { valid: true, total: entries.length };
}

module.exports = { log, list, verifyChain };
