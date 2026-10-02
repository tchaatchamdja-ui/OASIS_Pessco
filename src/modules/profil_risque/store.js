// Module « Profils de Risque » — accès aux données.
// Neuf collections dans `profil_risque` : les trois familles d'indicateurs, les
// évaluations, les plans, les réunions, la bibliothèque documentaire et les
// indices de pondération.
//
// ── Premier magasin de module passé en base (ADR-002, jalon n° 13) ──
//
// Tout passe par la façade `src/magasin.js`, qui sait si la collection vit dans
// un fichier ou dans PostgreSQL. Les lectures deviennent donc asynchrones, et
// les écritures atomiques.
//
// **La propagation n'est pas de la même nature que celle des trois collections
// du socle.** `users`, `referentiels` et `module_rights` sont lues par des
// prédicats synchrones — d'où l'instantané par requête de `src/instantane.js`.
// Ici, rien de tel : ces données sont lues dans le corps des gestionnaires, qui
// sont déjà asynchrones. La conversion est donc franche, et l'instantané ne
// conviendrait pas : une évaluation est un acte d'autorité, en écriture
// permanente, où lire un état vieux de quelques millisecondes n'est pas
// acceptable.
//
// ── Ce que la conversion corrige, et qui n'était pas un coût ──
//
// Les quatre mutateurs faisaient « lire, changer, réécrire ». Sur fichiers, le
// geste était sûr parce que `store.load` et `store.save` sont synchrones — rien
// ne s'intercalait. Traduits en `await load()` … `await save()`, deux requêtes
// du même processus se perdraient l'une l'autre. `modifier` rend le geste
// atomique dans les deux régimes.
//
// Mieux : trois gestes du module en faisaient **plusieurs** à la suite — poser
// une décision puis horodater l'étape, supprimer une évaluation puis libérer son
// parent puis ses réunions, ouvrir un cycle puis le rattacher. Chacun laissait
// un état intermédiaire visible, et le dernier laissait un clone orphelin si
// deux réévaluations partaient ensemble. `transformer` les rend d'un seul coup :
// c'est pour cela qu'il est exposé, et non seulement employé ici.
const crypto = require('crypto');
const magasin = require('../../magasin');

const NOM = 'profil_risque';

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
const load = () => magasin.load(NOM, {});
const save = (d) => magasin.save(NOM, d);

// Lire, transformer, réécrire en un seul geste. `transformer` reçoit les neuf
// collections et rend l'ensemble à écrire, ou `magasin.INCHANGE` pour ne rien
// écrire. Il peut être rappelé si quelqu'un est passé entre-temps : il ne doit
// donc que calculer — pas d'écriture au journal, pas d'envoi de courriel.
const transformer = (fn) => magasin.modifier(NOM, {}, fn);

const list = async (coll) => (await load())[coll] || [];
const getColl = list;

async function seed() {
  const d = await magasin.load(NOM, null);
  if (d) return;
  const now = new Date().toISOString();
  await save({
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

// Vocabulaire commun aux magasins des modules : list, get, insert, update,
// remove. Ici l'identifiant est toujours tiré par le magasin — les autres
// modules le tirent eux-mêmes, avec un préfixe parlant, avant d'insérer.
async function get(coll, id) {
  return (await list(coll)).find((r) => r.id === id) || null;
}

async function insert(coll, item) {
  // L'identifiant est posé par le magasin, jamais par l'appelant : placé
  // avant l'enregistrement, un `id` venu du client l'écrasait — il pouvait
  // ainsi choisir sous quelle clé sa création allait vivre.
  //
  // Tiré **hors** de la transformation : celle-ci peut être rejouée, et un
  // identifiant tiré dedans changerait d'un essai à l'autre — l'appelant
  // rendrait alors un `id` que la base ne porte pas.
  const rec = { createdAt: new Date().toISOString(), ...item, id: uid() };
  await transformer((d) => {
    d[coll] = d[coll] || [];
    d[coll].push(rec);
    return d;
  });
  return rec;
}

async function update(coll, id, patch) {
  let apres = null;
  await transformer((d) => {
    const arr = d[coll] || [];
    const i = arr.findIndex((r) => r.id === id);
    // Réaffecté à chaque essai : un rejeu doit rendre ce que le dernier a écrit.
    apres = null;
    if (i < 0) return magasin.INCHANGE;
    arr[i] = { ...arr[i], ...patch, id, updatedAt: new Date().toISOString() };
    apres = arr[i];
    return d;
  });
  return apres;
}

async function remove(coll, id) {
  let ote = false;
  await transformer((d) => {
    const arr = d[coll] || [];
    const i = arr.findIndex((r) => r.id === id);
    ote = i >= 0;
    if (!ote) return magasin.INCHANGE;
    arr.splice(i, 1);
    return d;
  });
  return ote;
}

async function removeWhere(coll, predicat) {
  let otes = 0;
  await transformer((d) => {
    const avant = (d[coll] || []).length;
    const reste = (d[coll] || []).filter((r) => !predicat(r));
    otes = avant - reste.length;
    if (!otes) return magasin.INCHANGE;
    d[coll] = reste;
    return d;
  });
  return otes;
}

module.exports = {
  COLLECTIONS, NOM, uid, load, save, transformer, INCHANGE: magasin.INCHANGE,
  list, get, getColl, seed, insert, update, remove, removeWhere,
};
