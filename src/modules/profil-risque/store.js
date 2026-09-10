// Module « Profils de Risque » — accès aux données.
// Neuf collections dans data/profil_risque.json : les trois familles
// d'indicateurs, les évaluations, les plans, les réunions, la bibliothèque
// documentaire et les indices de pondération.
const crypto = require('crypto');
const store = require('../../store');

const COLLECTIONS = [
  'indicateurs_conf',
  'indicateurs_perf',
  'indicateurs_complex',
  'evaluations',
  'plans',
  'eval_reunions',
  'eval_reunions_prest',
  'documents',
  'indices',
];

const uid = () => crypto.randomBytes(8).toString('hex');
const load = () => store.load('profil_risque', {});
const save = (d) => store.save('profil_risque', d);
const list = (coll) => load()[coll] || [];
const getColl = (coll) => list(coll);

function seed() {
  const d = store.load('profil_risque', null);
  if (d) return;
  const now = new Date().toISOString();
  save({
    // Les indicateurs sont saisis par l'AAC (aucun exemple pré-rempli).
    indicateurs_conf: [],
    indicateurs_perf: [],
    indicateurs_complex: [],
    evaluations: [],
    plans: [],
    eval_reunions: [],
    eval_reunions_prest: [],
    documents: [],
    indices: [
      { cle: 'poids_conformite', valeur: 0.5 },
      { cle: 'poids_performance', valeur: 0.3 },
      { cle: 'poids_complexite', valeur: 0.2 },
      { cle: 'seuil_faible', valeur: 25 },
      { cle: 'seuil_moyen', valeur: 50 },
      { cle: 'seuil_eleve', valeur: 75 },
    ],
    createdAt: now,
  });
}

function createIn(coll, item) {
  const d = load();
  // L'identifiant est posé par le magasin, jamais par l'appelant : placé
  // avant l'enregistrement, un `id` venu du client l'écrasait — il pouvait
  // ainsi choisir sous quelle clé sa création allait vivre.
  const rec = { createdAt: new Date().toISOString(), ...item, id: uid() };
  d[coll] = d[coll] || [];
  d[coll].push(rec);
  save(d);
  return rec;
}

function updateIn(coll, id, patch) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return null;
  arr[i] = { ...arr[i], ...patch, id, updatedAt: new Date().toISOString() };
  save(d);
  return arr[i];
}

function deleteIn(coll, id) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return false;
  arr.splice(i, 1);
  save(d);
  return true;
}

module.exports = { COLLECTIONS, uid, load, save, list, getColl, seed, createIn, updateIn, deleteIn };
