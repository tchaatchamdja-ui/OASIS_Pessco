// Module « Profils de Risque » — circuit d'une évaluation (repris de PESSCO) :
// soumission au directeur, décision, et lancement d'un nouveau cycle.
const db = require('./store');
const { asynchrone } = require('../../route');
const D = require('./domaine');

// Décisions du directeur. Chaque décision a son statut : « accepter » ouvre la
// réunion prestataire, « cloturer » la verrouille, « valider » clôt le circuit.
// Seuls « rejeter » et « renvoyer » interrompent ou renvoient.
const DECISION_STATUT = {
  accepter: 'acceptee',
  cloturer: 'cloturee',
  valider: 'valide',
  approuve: 'valide',      // compatibilité ascendante
  renvoyer: 'renvoyee',
  rejeter: 'rejetee',
};

module.exports = function register(app, deps, M) {
  const { requireAuth, audit } = deps;

  // Soumettre relève de l'évaluateur, décider du directeur. Ni l'une ni
  // l'autre de ces deux routes ne vérifiait quoi que ce soit : une session
  // quelconque rendait la décision du directeur sur n'importe quelle
  // évaluation, et « valider » suffisait à en faire le profil en vigueur.
  const portee = (ev) => ({ domaine_id: (ev && ev.domaine_id) || '', secteur_id: (ev && ev.secteur_id) || '' });

  app.post(`${M}/evaluations/:id/soumettre-directeur`, requireAuth, asynchrone(async (req, res) => {
    const cur = db.getColl('evaluations').find((x) => x.id === req.params.id);
    if (!cur) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'CONTRIBUTEUR', portee(cur))) return D.refus(res);
    const now = new Date().toISOString();
    const rec = db.update('evaluations', req.params.id, {
      statut: 'soumis_directeur', soumis_le: now, soumis_par: req.user.username,
      etapes: D.etapesWith(cur, { soumission: (cur.etapes || {}).soumission || now, acceptation: now }),
    });
    if (!rec) return res.status(404).json({ error: 'not_found' });
    await audit.log(req.user.username, 'PR_SOUMISSION_DIRECTEUR', { id: rec.id });
    return res.json(rec);
  }));

  app.post(`${M}/evaluations/:id/decision-directeur`, requireAuth, asynchrone(async (req, res) => {
    const body = req.body || {};
    const decision = String(body.decision || '').toLowerCase();
    const commentaire = body.commentaire || body.motif || '';
    const statut = DECISION_STATUT[decision];
    if (!statut) return res.status(400).json({ error: 'decision_inconnue', decision });

    const cur = db.getColl('evaluations').find((x) => x.id === req.params.id);
    if (!cur) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'VALIDATEUR', portee(cur))) return D.refus(res);
    const now = new Date().toISOString();
    // Chaque décision lance l'étape suivante du fil d'avancement.
    const ETAPE_DECISION = {
      accepter: { reunion: now },
      cloturer: { validation: now },
      valider: { validee: now },
      approuve: { validee: now },
      rejeter: { rejetee: now },
      renvoyer: { notation: now, soumission: null, acceptation: null, reunion: null, validation: null },
    };
    const patch = {
      statut, decision_directeur: decision, motif_decision: commentaire,
      commentaire_directeur: commentaire,
      date_revue_directeur: now,
      decide_le: now, decide_par: req.user.username,
      etapes: D.etapesWith(cur, ETAPE_DECISION[decision] || {}),
    };
    // La validation par le directeur est la date de validation de l'évaluation
    // (affichée dans « Évaluations validées », les archives et les rapports).
    if (statut === 'valide') patch.date_validation = now;
    // Renvoi : l'évaluation redevient modifiable par les évaluateurs
    if (decision === 'renvoyer') { patch.soumis_le = ''; patch.decide_le = ''; }

    const rec = db.update('evaluations', req.params.id, patch);
    if (!rec) return res.status(404).json({ error: 'not_found' });
    await audit.log(req.user.username, 'PR_DECISION_DIRECTEUR', { id: rec.id, decision, statut });
    return res.json(rec);
  }));

  app.post(`${M}/evaluations/:id/reevaluer`, requireAuth, asynchrone(async (req, res) => {
    const src = db.getColl('evaluations').find((x) => x.id === req.params.id);
    if (!src) return res.status(404).json({ error: 'not_found' });
    // Réservé aux Gestionnaire / Validateur couvrant le domaine et le secteur
    if (!D.peut(req, 'VALIDATEUR', portee(src))) return D.refus(res);
    if (src.reevalue_le) return res.status(409).json({ error: 'reevaluation_deja_lancee' });
    // L'évaluation validée reste en place : elle demeure le profil de risque en
    // vigueur tant que la nouvelle n'est pas validée. On la marque seulement
    // comme réévaluée pour tracer le lien avec le nouveau cycle.
    // `id` retiré avant copie : le laisser à undefined écrasait l'identifiant
    // généré par insert et rendait la nouvelle évaluation inexploitable.
    const { id: _srcId, ...srcData } = src;
    const clone = db.insert('evaluations', {
      ...srcData, statut: 'brouillon', parent_id: src.id,
      cycle: (src.cycle || 1) + 1, createdAt: new Date().toISOString(), created_by: req.user.username,
      // Le nouveau cycle repart d'un circuit vierge
      soumis_le: '', soumis_par: '', decide_le: '', decide_par: '',
      decision_directeur: '', motif_decision: '', commentaire_directeur: '',
      date_revue_directeur: '', date_validation: '', etapes: {},
    });
    db.update('evaluations', src.id, {
      reevalue_le: new Date().toISOString(), reevalue_par: req.user.username, enfant_id: clone.id,
    });
    await audit.log(req.user.username, 'PR_REEVALUATION', { source: src.id, nouvelle: clone.id });
    return res.json(clone);
  }));
};
