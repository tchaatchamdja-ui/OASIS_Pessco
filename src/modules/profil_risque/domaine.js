// Module « Profils de Risque » — règles du métier partagées par les routes :
// données du portail projetées pour le front, profils publiés et fil
// d'avancement d'une évaluation. Les droits vivent dans roles.js, comme dans
// les autres modules ; ils sont repris ici pour que les routes n'aient qu'une
// porte d'entrée.
const referentiels = require('../../referentiels');
const roles = require('./roles');
const db = require('./store');

// Statuts qui relèvent d'une décision, non d'une saisie. Le front valide une
// évaluation par un PUT direct (et non par `decision-directeur`) : la garde ne
// peut donc pas interdire `statut` sur le PUT — elle exige le Validateur dès
// que la valeur posée en fait partie.
const STATUTS_DECIDES = [
  'soumis_directeur', 'acceptee', 'cloturee', 'valide', 'rejetee', 'renvoyee',
];

// ── Données partagées : mappées depuis les référentiels du portail ──
const sharedDomaines = () => (referentiels.getAll().domaines || []).map((x) => ({
  id: x.id, code: x.code, nom: x.nom, description: x.description || '', actif: x.statut !== 'inactif',
  // Instances qui voient l'élément ; vide, il se voit partout.
  visibilite: x.visibilite || [],
}));

const sharedSecteurs = () => (referentiels.getAll().secteurs || []).map((x) => ({
  id: x.id, code: x.code, nom: x.nom, domaine_id: x.domaine_id, csn: x.csn || 24, actif: x.statut !== 'inactif',
  visibilite: x.visibilite || [],
}));

const sharedSousActivites = () => (referentiels.getAll().sous_activites || []).map((x) => ({
  id: x.id, code: x.code, nom: x.nom, secteur_id: x.secteur_id,
  visibilite: x.visibilite || [],
}));

const sharedPrestataires = () => (referentiels.getAll().prestataires || []).map((x) => ({
  id: x.id, nom: x.nom, trigramme: x.trigramme || '', domaine_id: x.domaine_id || '', secteur_id: x.secteur_id || '',
  // L'AAC qui surveille l'organisme : la route la lit pour ne servir que les
  // siens. Sans ce champ, tous seraient rendus à l'instance locale.
  instance: x.instance || '',
  dirigeant: x.dirigeant || '', point_focal: x.point_focal || '', email_prestataire: x.email_prestataire || '',
  ref_agrement: x.ref_agrement || '', actif: x.statut !== 'inactif', statut: x.statut || 'actif',
  debut_cycle: x.debut_cycle || '', fin_cycle: x.fin_cycle || '', date_init_surveillance: x.date_init_surveillance || '',
}));

const sharedIndices = () => db.list('indices');

// Service publié : profils de risque en vigueur, consommés par les autres
// modules (Planification…). Même source que la page « Synthèses Profils » : la
// dernière évaluation validée de chaque prestataire, avec les résultats
// consolidés (niveau de risque, matrice, intensité, CSRBO, détail).
//
// Chaque profil porte l'instance de l'évaluation dont il est tiré : le bus ne
// connaît pas le compte qui l'interroge, c'est donc au consommateur d'écarter
// ce qui n'appartient pas à l'instance qu'il regarde — comme pour toute liste.
function riskProfiles() {
  const evals = (db.getColl('evaluations') || []).filter((e) => e.statut === 'valide');
  const dateOf = (e) => e.date_validation || e.decide_le || e.updatedAt || e.createdAt || '';

  const dernier = {};
  evals.forEach((e) => {
    const k = e.prestataire_id;
    if (!k) return;
    if (!dernier[k] || new Date(dateOf(e)) > new Date(dateOf(dernier[k]))) dernier[k] = e;
  });

  const secteurs = referentiels.getAll().secteurs || [];
  return Object.values(dernier).map((e) => {
    const g = (e.resultats || {}).global || {};
    const r = g.globalRisk || {};
    const sec = secteurs.find((s) => s.id === e.secteur_id);
    const csn = Number(g.csn || (sec && sec.csn) || 24);
    return {
      id: e.id,
      instance: e.instance || '',
      prestataire_id: e.prestataire_id,
      secteur_id: e.secteur_id,
      domaine_id: e.domaine_id || (sec && sec.domaine_id) || '',
      niveau: r.risk || '',          // « Élevé », « Modéré », …
      matrice: r.label || '',        // case de la matrice, ex. « 2C »
      intensite: r.intensity || '',
      score: g.ids_g || r.label || '',
      csn,
      csrbo: Number(g.csrbo || Math.round(csn * (r.csnMod || 1))),
      frequence: r.freq || null,
      resultats: e.resultats || {},
      date_validation: dateOf(e),
      cycle: e.cycle || 1,
    };
  });
}

// ── Fil d'avancement : horodatage du lancement de chaque étape ──
// Une étape relancée (renvoi puis nouvelle soumission) est ré-horodatée.
const etapesWith = (rec, patch) => {
  const e = { ...(rec.etapes || {}) };
  Object.entries(patch).forEach(([k, v]) => { if (v === null) delete e[k]; else e[k] = v; });
  return e;
};

// Tous les évaluateurs désignés ont-ils publié leurs notes ?
const toutesNotesSoumises = (ev) => {
  const des = ev.evaluateurs_designes || [];
  if (!des.length) return false;
  const pub = ev.notes_per_evaluator || {};
  return des.every((u) => Object.keys((pub.perf || {})[u] || {}).length > 0
    && Object.keys((pub.comp || {})[u] || {}).length > 0);
};

// Étapes « Notation » (désignation des évaluateurs) et « Soumission » (toutes
// les notes publiées) : déduites de l'état, pas d'une route dédiée.
function stampNotationEtapes(rec) {
  const now = new Date().toISOString();
  const e = { ...(rec.etapes || {}) };
  let touched = false;
  if ((rec.evaluateurs_designes || []).length && !e.notation) { e.notation = now; touched = true; }
  const complet = toutesNotesSoumises(rec);
  if (complet && !e.soumission) { e.soumission = now; touched = true; }
  if (!complet && e.soumission && ['brouillon', 'renvoyee'].includes(rec.statut)) { delete e.soumission; touched = true; }
  // La validation finale passe par un PUT direct, pas par decision-directeur.
  if (rec.statut === 'valide' && !e.validee) { e.validee = rec.date_validation || now; touched = true; }
  if (rec.statut === 'rejetee' && !e.rejetee) { e.rejetee = now; touched = true; }
  return touched ? (db.update('evaluations', rec.id, { etapes: e }) || rec) : rec;
}

module.exports = {
  ...roles,
  sharedDomaines, sharedSecteurs, sharedSousActivites, sharedPrestataires, sharedIndices,
  riskProfiles, etapesWith, stampNotationEtapes, STATUTS_DECIDES
};
