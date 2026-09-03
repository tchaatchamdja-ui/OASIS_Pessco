// Module « Mesures d'Application » — accès aux données.
//
// Reprise du module PESSCO (Flask + SQLite) sur le socle OASIS (JSON via
// src/store.js). Les tables du module deviennent les collections de
// data/mesures.json :
//   mesures_application → mesures
//   mes_categories      → categories
//   mes_types           → types
const crypto = require('crypto');
const store = require('../../store');

// « constatations » : celles que le module relève lui-même, faute d'un module
// producteur — un signalement, un contrôle inopiné, une saisine. Celles des
// autres modules arrivent par le bus de services et ne sont jamais stockées ici.
// « classements » : la décision de ne donner aucune suite à une infraction.
// Elle est prise ici, y compris sur une infraction reçue d'un autre module —
// dont les données ne sont jamais modifiées.
// « traitements » : le fil d'avancement d'une carence — ce que l'autorité a
// recueilli en plus du plan d'actions, et la décision sur la suite à donner.
// Un enregistrement par carence, quelle que soit son origine ; les données du
// module producteur ne sont jamais touchées.
// « types_investigation » : ce que l'équipe a fait pour établir les faits —
// une visite, un entretien, l'examen d'enregistrements. La liste est
// paramétrable au menu du module ; les trois valeurs d'origine couvrent les
// moyens ordinaires d'une investigation.
const COLLECTIONS = ['mesures', 'categories', 'types', 'constatations', 'classements',
  'traitements', 'types_investigation'];

const TYPES_INVESTIGATION_DEFAUT = [
  ['inspection_terrain', 'Inspection / Observations sur le terrain'],
  ['entretien', 'Entretien'],
  ['analyse_enregistrements', 'Analyse des enregistrements'],
];

// Catégories et types livrés d'origine : ce sont les valeurs du formulaire
// « Nouvelle mesure » de PESSCO. Elles restent modifiables au menu Paramètres.
const CATEGORIES_DEFAUT = [
  { code: 'administrative', libelle: 'Mesure administrative' },
  { code: 'sanction', libelle: 'Sanction administrative' },
  { code: 'penale', libelle: 'Sanction pénale' },
];

const TYPES_DEFAUT = [
  ['administrative', 'recommandation_verbale', 'Recommandation verbale'],
  ['administrative', 'recommandation_ecrite', 'Recommandation écrite'],
  ['administrative', 'reunion_securite', 'Réunion de sécurité'],
  ['administrative', 'lettre_correction', 'Lettre de correction'],
  ['administrative', 'preavis', 'Préavis'],
  ['administrative', 'surveillance_renforcee', 'Surveillance renforcée'],
  ['administrative', 'formation_recyclage', 'Formation de recyclage'],
  ['administrative', 'action_urgence', "Action d'urgence"],
  ['sanction', 'avertissement', 'Avertissement'],
  ['sanction', 'blame', 'Blâme'],
  ['sanction', 'restriction', 'Restriction'],
  ['sanction', 'suspension', 'Suspension'],
  ['sanction', 'revocation', 'Révocation'],
  ['sanction', 'amende_administrative', 'Amende administrative'],
  ['penale', 'saisine_judiciaire', 'Saisine judiciaire'],
];

const load = () => store.load('mesures', {});
const save = (d) => store.save('mesures', d);
const list = (coll) => load()[coll] || [];

const uid = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
const now = () => new Date().toISOString();

function seed() {
  const d = store.load('mesures', null);
  if (d) return;
  const vide = {};
  COLLECTIONS.forEach((c) => { vide[c] = []; });
  vide.categories = CATEGORIES_DEFAUT.map((c, i) => ({
    id: `mca_${c.code}`, code: c.code, libelle: c.libelle, ordre: i,
  }));
  vide.types = TYPES_DEFAUT.map(([cat, code, libelle], i) => ({
    id: `mty_${code}`, categorie_code: cat, code, libelle, ordre: i,
  }));
  vide.types_investigation = TYPES_INVESTIGATION_DEFAUT.map(([code, libelle], i) => ({
    id: `mti_${code}`, code, libelle, ordre: i,
  }));
  save({ ...vide, createdAt: now() });
}

// Les instances déjà installées n'ont pas la liste : on l'amorce au démarrage
// plutôt que d'ouvrir un écran de paramétrage vide.
function seedTypesInvestigation() {
  const d = load();
  if (!d || (d.types_investigation || []).length) return;
  d.types_investigation = TYPES_INVESTIGATION_DEFAUT.map(([code, libelle], i) => ({
    id: `mti_${code}`, code, libelle, ordre: i,
  }));
  save(d);
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
  arr[i] = { ...arr[i], ...patch };
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

// Numérotation continue : MES-0001, MES-0002… Le rang est conservé à part et
// jamais recalculé depuis les mesures présentes : une mesure supprimée rendrait
// sinon sa référence, qui a pu être notifiée à un prestataire.
// Le plus grand numéro en base sert de plancher, pour les données antérieures
// à ce compteur.
function prochaineReference() {
  const d = load();
  const plancher = (d.mesures || []).reduce((n, m) => {
    const c = /^MES-(\d+)$/.exec(String(m.reference || ''));
    return c ? Math.max(n, Number(c[1])) : n;
  }, 0);
  const rang = Math.max(Number(d.dernier_numero) || 0, plancher) + 1;
  d.dernier_numero = rang;
  save(d);
  return `MES-${String(rang).padStart(4, '0')}`;
}

// Numérotation des constatations propres : CST-0001, CST-0002… Même règle que
// pour les mesures — un numéro rendu ne se réattribue pas.
function prochaineReferenceConstat() {
  const d = load();
  const plancher = (d.constatations || []).reduce((n, c) => {
    const m = /^CST-(\d+)$/.exec(String(c.reference || ''));
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  const rang = Math.max(Number(d.dernier_numero_constat) || 0, plancher) + 1;
  d.dernier_numero_constat = rang;
  save(d);
  return `CST-${String(rang).padStart(4, '0')}`;
}

module.exports = {
  COLLECTIONS, CATEGORIES_DEFAUT, TYPES_DEFAUT, TYPES_INVESTIGATION_DEFAUT,
  seed, seedTypesInvestigation, list, get, insert, update, remove, uid, now,
  prochaineReference, prochaineReferenceConstat,
};
