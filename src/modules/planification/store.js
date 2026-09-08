// Module « Planification de la Surveillance » — accès aux données.
// Six collections dans data/planification.json : plans, activités, workflow,
// versions, commentaires et cycles de surveillance.
const crypto = require('crypto');
const store = require('../../store');

const uid = () => crypto.randomBytes(8).toString('hex');
const load = () => store.load('planification', {});
const save = (d) => store.save('planification', d);
const list = (coll) => load()[coll] || [];

function seed() {
  if (store.load('planification', null)) { retirerLesVersionsRemplacees(); return; }
  save({ plans: [], activites: [], workflow: [], versions: [], commentaires: [], cycles: [] });
}

// Une version remplacée par la suivante était rangée aux archives, avec les
// plans qu'on y range à leur terme : deux sorts distincts sous un même statut.
// Elle porte désormais le sien — « remplace » —, et les données déjà en place
// le reprennent au démarrage.
function retirerLesVersionsRemplacees() {
  const d = load();
  let touche = 0;
  (d.plans || []).forEach((p) => {
    if (p.statut === 'archive' && p.remplace_par) { p.statut = 'remplace'; touche += 1; }
  });
  if (touche) save(d);
}

function createIn(coll, item) {
  const d = load();
  const rec = { id: uid(), createdAt: new Date().toISOString(), ...item };
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

module.exports = { uid, load, save, list, seed, createIn, updateIn, deleteIn };
