// OASIS — Journal d'audit inaltérable par module (TDR §F.3).
// Append-only + chaînage SHA-256 : chaque entrée embarque le hash de la
// précédente, toute altération rompt la chaîne.
// Alimenté automatiquement par un middleware qui journalise les requêtes
// mutatives abouties des modules (création, enregistrement, soumission,
// validation, suppression…).
// Asynchrone depuis ADR-002, étape B : l'inscription est un
// lire-modifier-réécrire — lire la dernière entrée de la chaîne du module, en
// dériver l'empreinte, ajouter. Deux inscriptions concurrentes la forcheraient,
// et une chaîne forchée ne se répare pas. Elle passe donc par
// `magasin.journalChainer` : file d'attente sur fichiers, contrainte d'unicité
// en base.
//
// Chaque module a **sa** chaîne, numérotée depuis un et scellée depuis sa propre
// genèse. La clé de chaîne est le code du module : deux modules qui écrivent en
// même temps ne se gênent donc pas en base, et ne rompent rien sur fichiers.
const crypto = require('crypto');
const journal = require('./journal');
const magasin = require('./magasin');
const trace = require('./trace');
const horloge = require('./horloge');

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

// Reprise du format : l'objet hérité — un tableau par code de module — est
// recopié en lignes, module par module et dans l'ordre d'origine. Chaque
// entrée est écrite telle quelle, empreinte comprise ; elle gagne seulement le
// code sous lequel elle avait été inscrite, qui ne participe pas au calcul de
// l'empreinte. Idempotente : si le journal en lignes existe, il fait foi.
// Le drapeau évite de redemander au magasin à chaque écriture si la reprise est
// faite : en base, la question coûterait une requête par entrée inscrite.
let repriseFaite = false;
async function reprendre() {
  if (repriseFaite) return false;
  if (await magasin.journalConverti(KEY)) { repriseFaite = true; return false; }
  const herite = journal.lireHerite(KEY);
  if (!herite || typeof herite !== 'object' || Array.isArray(herite)) {
    repriseFaite = true;
    return false;
  }
  const lignes = [];
  Object.keys(herite).forEach((code) => {
    (herite[code] || []).forEach((e) => lignes.push({ ...e, codeModule: code }));
  });
  await magasin.journalReprendre(KEY, lignes);
  repriseFaite = true;
  return true;
}

// Les entrées d'une chaîne, sous le code où elles ont été inscrites.
//
// Le regroupement de tout le journal a disparu : il n'était là que pour
// retrouver la chaîne d'un module, ce que le magasin fait désormais lui-même —
// par un filtre en mémoire sur fichiers, par un index en base. Surtout, il
// n'est plus sur le chemin d'écriture : inscrire une entrée ne relit plus que
// sa propre chaîne, non le journal entier.
async function chaineDe(code) {
  await reprendre();
  return magasin.journalLireChaine(KEY, code);
}

function entryHash(prevHash, e) {
  return crypto
    .createHash('sha256')
    .update([prevHash, e.ts, e.user, e.action, e.objet, e.ref, JSON.stringify(e.details || {})].join('|'))
    .digest('hex');
}

async function log(moduleCode, user, action, objet, ref, details) {
  await reprendre();
  // Rejoué si une autre inscription est passée entre-temps — horodatage
  // compris. C'est voulu : une entrée porte l'heure à laquelle elle a
  // réellement pris sa place dans la chaîne.
  return magasin.journalChainer(KEY, moduleCode, (entries) => {
    const prevHash = entries.length ? entries[entries.length - 1].hash : GENESIS;
    const entry = {
      id: entries.length + 1,
      ts: horloge.maintenant(),
      user: user || 'système',
      action,
      actionLabel: ACTIONS[action] || action,
      objet: objet || '',
      ref: ref || '',
      details: details || {},
      prevHash,
    };
    entry.hash = entryHash(prevHash, entry);
    // `codeModule` est posé **après** le calcul : il ne participe pas au sceau.
    entry.codeModule = moduleCode;
    return entry;
  });
}

// Un module a pu changer de nom : ses entrées d'alors portent l'ancien code.
// Elles ne se réécrivent pas — chaque chaîne tient par ses hachages, et les
// toucher effacerait ce qu'elles attestent — mais elles se lisent avec les
// nouvelles, sans quoi l'historique disparaîtrait de l'écran le jour du
// renommage. Les entrées nouvelles s'écrivent toujours sous le code courant.
const ANCIENS_CODES = { RAMP: ['SAFA'] };

// Du plus ancien nom au nom courant : l'ordre des chaînes suit celui du temps.
const codesDe = (moduleCode) => [...(ANCIENS_CODES[moduleCode] || []), moduleCode];

async function list(moduleCode) {
  const codes = codesDe(moduleCode);
  if (codes.length === 1) return chaineDe(moduleCode);
  // `codeModule` dit sous quel nom l'entrée a été écrite : deux chaînes
  // distinctes numérotent chacune à partir de un.
  const parCode = await Promise.all(codes.map(async (c) => ({ c, entrees: await chaineDe(c) })));
  return parCode
    .flatMap(({ c, entrees }) => entrees.map((e) => ({ ...e, codeModule: c })))
    .sort((x, y) => String(x.ts).localeCompare(String(y.ts)));
}

// Une chaîne se vérifie seule : elle part de sa propre genèse.
function chaineValide(entries) {
  let prevHash = GENESIS;
  for (const e of entries) {
    if (e.prevHash !== prevHash || entryHash(prevHash, e) !== e.hash) {
      return { valid: false, brokenAt: e.id, total: entries.length };
    }
    prevHash = e.hash;
  }
  return { valid: true, total: entries.length };
}

// Plusieurs noms, plusieurs chaînes : chacune est vérifiée pour elle-même, et
// le module n'est déclaré intègre que si toutes le sont.
async function verifyChain(moduleCode) {
  let total = 0;
  for (const c of codesDe(moduleCode)) {
    const r = chaineValide(await chaineDe(c));
    total += r.total;
    if (!r.valid) return { valid: false, brokenAt: r.brokenAt, codeModule: c, total };
  }
  return { valid: true, total };
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
      // `res.on('finish')` est appelé **après** la réponse : l'inscription ne
      // peut plus être attendue par la requête, et c'était déjà le cas quand
      // elle était synchrone. Ce qui change, c'est qu'une promesse rejetée ne
      // mène nulle part : un échec d'écriture du journal disparaîtrait sans
      // bruit, dans le registre même qui doit dire ce qui a eu lieu.
      //
      // Il est donc inscrit aux traces, avec de quoi retrouver l'acte qui n'a
      // pas été journalisé. On ne peut pas faire mieux d'ici — la réponse est
      // partie, et l'acte a eu lieu.
      log(
        moduleCode,
        (req.user && req.user.username) || 'anonyme',
        inferAction(req),
        inferObjet(req, prefix),
        inferRef(req),
        details
      ).catch((e) => trace.erreur('journal du module non inscrit', {
        module: moduleCode,
        url: details.url,
        methode: details.methode,
        utilisateur: (req.user && req.user.username) || 'anonyme',
        detail: e.message,
      }));
    });
    next();
  };
}

module.exports = { log, list, verifyChain, middleware, reprendre, ACTIONS };
