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

// Vocabulaire commun aux magasins des modules : list, get, insert, update,
// remove. Ici l'identifiant est toujours tiré par le magasin — les autres
// modules le tirent eux-mêmes, avec un préfixe parlant, avant d'insérer.
function get(coll, id) {
  return list(coll).find((r) => r.id === id) || null;
}

function insert(coll, item) {
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

function update(coll, id, patch) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return null;
  arr[i] = { ...arr[i], ...patch, id, updatedAt: new Date().toISOString() };
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

module.exports = { uid, load, save, list, get, seed, insert, update, remove };
