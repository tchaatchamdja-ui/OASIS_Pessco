// Module « Exécution de la Surveillance » — accès aux données.
//
// Reprise du module PESSCO (Flask + SQLite) sur le socle OASIS (JSON via
// src/store.js). Les tables `exec_*` deviennent les collections de ce module,
// dans data/execution.json ; les jointures SQL sont remplacées par des
// enrichissements explicites au moment de la lecture.
const crypto = require('crypto');
const store = require('../../store');
const magasin = require('../../magasin');

const COLLECTIONS = [
  'notifications',      // exec_notifications
  'echanges',           // exec_echanges
  'dossiers',           // exec_dossiers
  'constatations',      // exec_constatations (FNC / PAC)
  'rapports',           // exec_rapports
  'criticites',         // exec_criticites
  'types_cas',          // exec_types_cas
  'checklists',         // exec_checklists
  'checklist_items',    // exec_checklist_items
  'checklist_statuts',  // exec_checklist_statuts
  'checklist_sous_themes', // exec_checklist_sous_themes
  'checklist_responses',   // exec_checklist_responses
  'vues',               // vue active (AAC / Prestataire) par utilisateur
  'parametres',         // délais du processus et autres réglages du module
  'rappels',            // rappels adressés aux responsables d'activités
  'processus',          // intervenants par secteur, étape par étape
  'roles_equipe',       // rôles d'une équipe d'audit / inspection
];

const load = () => store.load('execution', {});
const save = (d) => store.save('execution', d);
const list = (coll) => load()[coll] || [];

// ── `transformer`, avant la bascule de ce module ──
//
// Lire, changer, réécrire en un seul geste. Ce module est le dernier à rester sur
// fichiers (ADR-002, jalon n° 13) ; cette fonction y passe quand même par la
// façade, pour deux raisons :
//
//   · le socle des vues (`src/vues_prestataire.js`) est partagé avec RAMP, qui est
//     en base. Il écrit le choix de vue par une transformation, et ce magasin-ci
//     doit donc savoir en faire une ;
//   · sur fichiers, la façade sérialise par une file d'attente par collection :
//     deux bascules simultanées du même compte ne s'écrasent plus.
//
// Le jour où ce module basculera, la seule chose à changer sera son nom dans la
// liste d'autorisation.
const transformer = (fn) => magasin.modifier('execution', {}, fn);

const uid = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();

function seed() {
  const d = store.load('execution', null);
  if (d) return;
  const vide = {};
  COLLECTIONS.forEach((c) => { vide[c] = []; });
  save({ ...vide, createdAt: now() });
}

function get(coll, id) {
  return list(coll).find((r) => r.id === id) || null;
}

function insert(coll, item) {
  const d = load();
  d[coll] = d[coll] || [];
  d[coll].push(item);
  save(d);
  return item;
}

function update(coll, id, patch) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return null;
  arr[i] = { ...arr[i], ...patch, id };
  save(d);
  return arr[i];
}

function remove(coll, id) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return false;
  arr.splice(i, 1);
  save(d);
  return true;
}

function removeWhere(coll, predicat) {
  const d = load();
  const avant = (d[coll] || []).length;
  d[coll] = (d[coll] || []).filter((r) => !predicat(r));
  save(d);
  return avant - d[coll].length;
}

// Retrait d'un dossier et de tout ce qui n'existe que par lui.
//
// Constatations, rapports et réponses de checklist ne se lisent que sous
// l'identifiant du dossier : laissés derrière, ils ne reparaissent jamais et
// s'accumulent. Deux routes suppriment un dossier — la suppression directe et
// la remise à zéro d'une activité ; l'une des deux oubliait les réponses, et la
// base en portait trente et une d'un dossier disparu. Le retrait s'écrit donc
// une fois, ici.
function removeDossier(id) {
  if (!id) return false;
  removeWhere('constatations', (c) => c.dossier_id === id);
  removeWhere('rapports', (r) => r.dossier_id === id);
  removeWhere('checklist_responses', (r) => r.dossier_id === id);
  return remove('dossiers', id);
}

// Référence séquentielle « PREFIXE-ANNÉE-001 », identique à PESSCO.
module.exports = {
  COLLECTIONS, load, save, transformer, list, get, insert, update, remove, removeWhere,
  removeDossier, uid, now, seed,
};
