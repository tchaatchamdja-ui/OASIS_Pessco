// OASIS — Journal d'audit inaltérable par module (TDR §F.3).
// Append-only + chaînage SHA-256 : chaque entrée embarque le hash de la
// précédente, toute altération rompt la chaîne.
// Alimenté automatiquement par un middleware qui journalise les requêtes
// mutatives abouties des modules (création, enregistrement, soumission,
// validation, suppression…).
const crypto = require('crypto');
const store = require('./store');

const GENESIS = 'OASIS-MODULE-GENESIS';
const KEY = 'module_audit';

const ACTIONS = {
  CREATION: 'Création',
  MODIFICATION: 'Enregistrement',
  SUPPRESSION: 'Suppression',
  SOUMISSION: 'Soumission',
  VALIDATION: 'Validation',
  APPROBATION: 'Approbation',
  REJET: 'Rejet',
  TRANSMISSION: 'Transmission',
  ARCHIVAGE: 'Archivage',
  AMENDEMENT: 'Amendement',
  REEVALUATION: 'Réévaluation',
  IMPORT: 'Import',
  SYNCHRONISATION: 'Synchronisation',
  DROITS: 'Modification des droits',
};

// Mots-clés d'URL → action métier (le plus spécifique l'emporte)
const PATH_ACTIONS = [
  [/\/soumettre/i, 'SOUMISSION'],
  [/\/valider|\/decision-directeur/i, 'VALIDATION'],
  [/\/approuver/i, 'APPROBATION'],
  [/\/rejeter/i, 'REJET'],
  [/\/transmettre/i, 'TRANSMISSION'],
  [/\/archiver/i, 'ARCHIVAGE'],
  [/\/amender|\/annuler-amendement/i, 'AMENDEMENT'],
  [/\/reevaluer/i, 'REEVALUATION'],
  [/\/import/i, 'IMPORT'],
  [/\/sync|\/apply-sync/i, 'SYNCHRONISATION'],
  [/\/m\/droits\//i, 'DROITS'],
];

const all = () => store.load(KEY, {});

function entryHash(prevHash, e) {
  return crypto
    .createHash('sha256')
    .update([prevHash, e.ts, e.user, e.action, e.objet, e.ref, JSON.stringify(e.details || {})].join('|'))
    .digest('hex');
}

function log(moduleCode, user, action, objet, ref, details) {
  const data = all();
  const entries = data[moduleCode] || [];
  const prevHash = entries.length ? entries[entries.length - 1].hash : GENESIS;
  const entry = {
    id: entries.length + 1,
    ts: new Date().toISOString(),
    user: user || 'système',
    action,
    actionLabel: ACTIONS[action] || action,
    objet: objet || '',
    ref: ref || '',
    details: details || {},
    prevHash,
  };
  entry.hash = entryHash(prevHash, entry);
  entries.push(entry);
  data[moduleCode] = entries;
  store.save(KEY, data);
  return entry;
}

function list(moduleCode) {
  return all()[moduleCode] || [];
}

function verifyChain(moduleCode) {
  const entries = list(moduleCode);
  let prevHash = GENESIS;
  for (const e of entries) {
    if (e.prevHash !== prevHash || entryHash(prevHash, e) !== e.hash) {
      return { valid: false, brokenAt: e.id, total: entries.length };
    }
    prevHash = e.hash;
  }
  return { valid: true, total: entries.length };
}

// ── Déduction de l'action et de l'objet à partir de la requête ──
function inferAction(req) {
  for (const [re, action] of PATH_ACTIONS) if (re.test(req.originalUrl)) return action;
  if (req.method === 'POST') return 'CREATION';
  if (req.method === 'DELETE') return 'SUPPRESSION';
  return 'MODIFICATION';
}

// Segment de collection : /api/m/planification/plans/:id/activites → « plans »
function inferObjet(req, prefix) {
  const p = req.originalUrl.split('?')[0].replace(prefix, '').replace(/^\/+/, '');
  const seg = p.split('/').filter(Boolean);
  return (seg[0] || '').replace(/-/g, ' ');
}

function inferRef(req) {
  const ids = Object.values(req.params || {}).filter((v) => typeof v === 'string');
  return ids.length ? ids[ids.length - 1] : '';
}

// Middleware : journalise les mutations abouties (2xx) d'un préfixe d'API.
function middleware(moduleCode, prefix) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const details = {};
      for (const k of ['statut', 'annee', 'libelle', 'nom', 'privilege', 'commentaire', 'decision']) {
        if (body[k] !== undefined) details[k] = body[k];
      }
      details.methode = req.method;
      details.url = req.originalUrl.split('?')[0];
      log(
        moduleCode,
        (req.user && req.user.username) || 'anonyme',
        inferAction(req),
        inferObjet(req, prefix),
        inferRef(req),
        details
      );
    });
    next();
  };
}

module.exports = { log, list, verifyChain, middleware, ACTIONS };
