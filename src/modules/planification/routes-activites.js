// Module « Planification de la Surveillance » — activités d'un plan.
// Une activité déclenchée dans « Exécution de la Surveillance » ne se réécrit
// plus : le verrou est porté par `domaine.js` et appliqué ici.
const { valider } = require('../../valider');
const db = require('./store');
const D = require('./domaine');

module.exports = function register(app, deps, M) {
  const { requireAuth } = deps;

  app.get(`${M}/plans/:id/activites`, requireAuth, (req, res) =>
    res.json(db.list('activites').filter((a) => a.plan_id === req.params.id)
      .map((a) => ({ ...a, verrouillee: D.estVerrouillee(a) ? 1 : 0 }))));

  app.post(`${M}/plans/:id/activites`, requireAuth, valider(D.SCHEMA_ACTIVITE), (req, res) => {
    if (!D.peut(req, 'CONTRIBUTEUR', D.planDe(req.params.id))) return D.refus(res);
    return res.json(db.createIn('activites', { ...(req.body || {}), plan_id: req.params.id }));
  });

  // Statut et version du plan portés par chaque activité (vue Calendrier)
  app.get(`${M}/all-activites`, requireAuth, (req, res) => {
    const plans = {};
    db.list('plans').forEach((p) => { plans[p.id] = p; });
    const racines = D.racinesDeclenchees();
    res.json(db.list('activites').map((a) => ({
      ...a,
      plan_statut: (plans[a.plan_id] || {}).statut || '',
      plan_titre: (plans[a.plan_id] || {}).titre || '',
      plan_version: (plans[a.plan_id] || {}).version || 1,
      verrouillee: racines.has(D.racine(a)) ? 1 : 0,
    })));
  });

  app.put(`${M}/activites/:id`, requireAuth, valider(D.SCHEMA_ACTIVITE), (req, res) => {
    const act = db.list('activites').find((a) => a.id === req.params.id);
    if (!D.peut(req, 'CONTRIBUTEUR', act && D.planDe(act.plan_id))) return D.refus(res);
    if (act && D.estVerrouillee(act)) return D.refusVerrou(res);
    const rec = db.updateIn('activites', req.params.id, req.body || {});
    return rec ? res.json(rec) : res.status(404).json({ error: 'not_found' });
  });

  // Sortie des archives d'une activité prise isolément. Son plan reste
  // archivé : l'exception est portée par l'activité, que « Exécution de la
  // Surveillance » remet alors parmi les activités en cours.
  app.put(`${M}/activites/:id/desarchiver`, requireAuth, (req, res) => {
    const act = db.list('activites').find((a) => a.id === req.params.id);
    if (!act) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'VALIDATEUR', D.planDe(act.plan_id))) return D.refus(res);
    return res.json(db.updateIn('activites', act.id, {
      desarchivee: 1,
      desarchiver_le: new Date().toISOString(),
      desarchiver_par: req.user.username,
    }));
  });

  // Retour aux archives : l'exception est levée, l'activité suit de nouveau
  // le sort de son plan.
  app.put(`${M}/activites/:id/rearchiver`, requireAuth, (req, res) => {
    const act = db.list('activites').find((a) => a.id === req.params.id);
    if (!act) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'VALIDATEUR', D.planDe(act.plan_id))) return D.refus(res);
    return res.json(db.updateIn('activites', act.id, { desarchivee: 0, desarchiver_le: '', desarchiver_par: '' }));
  });

  app.delete(`${M}/activites/:id`, requireAuth, (req, res) => {
    const act = db.list('activites').find((a) => a.id === req.params.id);
    if (!D.peut(req, 'CONTRIBUTEUR', act && D.planDe(act.plan_id))) return D.refus(res);
    if (act && D.estVerrouillee(act)) return D.refusVerrou(res);
    return res.json({ ok: db.deleteIn('activites', req.params.id) });
  });
};
