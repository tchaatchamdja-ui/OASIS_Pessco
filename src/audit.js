// Journal d'audit inaltérable (TDR §F.3) : ajout seul + chaînage
// cryptographique. Chaque entrée embarque l'empreinte de la précédente ; toute
// altération rompt la chaîne.
//
// Le support est `src/magasin.js`, qui sert selon la configuration le fichier en
// lignes (`src/journal.js`) ou la table `journal` de PostgreSQL. Le tableau JSON
// d'origine est converti à la première écriture, entrée par entrée et sans
// toucher à un seul caractère — empreintes comprises, de sorte que
// `verifyChain()` reste vérifiable sur tout l'historique.
//
// ── Asynchrone depuis ADR-002, étape B, et pourquoi ──
//
// `log` lit la dernière entrée, en dérive une empreinte, puis ajoute : c'est un
// lire-modifier-réécrire. Il était sûr pour une raison que personne n'avait
// écrite — aucun `await` entre les deux gestes, donc aucune intercalation
// possible. Le magasin devenu asynchrone, cette garantie tombe : deux
// inscriptions concurrentes poseraient deux entrées prétendant le même
// prédécesseur, et **une chaîne forchée ne se répare pas** — une entrée inscrite
// ne se réécrit jamais.
//
// L'inscription passe donc par `magasin.journalChainer`, qui rend le geste
// atomique : file d'attente sur fichiers, contrainte d'unicité en base.
const crypto = require('crypto');
const magasin = require('./magasin');
const horloge = require('./horloge');
const journal = require('./journal');

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
//
// Le drapeau évite de le redemander au magasin à chaque écriture : en base, la
// question coûterait une requête par entrée inscrite.
let repriseFaite = false;
async function reprendre() {
  if (repriseFaite) return false;
  if (await magasin.journalConverti(NOM)) { repriseFaite = true; return false; }
  const herite = journal.lireHerite(NOM);
  if (!Array.isArray(herite)) { repriseFaite = true; return false; }
  await magasin.journalReprendre(NOM, herite);
  repriseFaite = true;
  return true;
}

// Une seule chaîne pour le socle : sa clé est vide.
const CHAINE = '';

async function log(user, action, details) {
  await reprendre();
  // Tout ce qui suit est **rejoué** si une autre inscription est passée
  // entre-temps : l'horodatage comme l'empreinte. C'est voulu — une entrée doit
  // porter l'heure à laquelle elle a réellement pris sa place dans la chaîne.
  return magasin.journalChainer(NOM, CHAINE, (entries) => {
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
    return entry;
  });
}

async function list() {
  await reprendre();
  return magasin.journalLire(NOM);
}

async function verifyChain() {
  const entries = await list();
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
