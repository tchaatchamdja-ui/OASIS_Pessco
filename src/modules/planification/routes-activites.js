// Module « Planification de la Surveillance » — activités d'un plan.
// Une activité déclenchée dans « Exécution de la Surveillance » ne se réécrit
// plus : le verrou est porté par `domaine.js` et appliqué ici.
const { valider } = require('../../valider');
const db = require('./store');
const D = require('./domaine');
const instances = require('../../instances');

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;

  // Instance regardée : le calendrier ne montre que les activités de
  // l'instance dont on tient le poste ; en vue régionale, toutes.
  const parInstance = (req, rangs) => instances.filtrer(rangs,
    instances.courante(req.user, loadConfig), loadConfig);

  app.get(`${M}/plans/:id/activites`, requireAuth, (req, res) => {
    const plan = D.planDe(req.params.id);
    if (!D.peutLire(req, plan)) return D.refus(res);
    return res.json(db.list('activites').filter((a) => a.plan_id === req.params.id)
      .map((a) => ({ ...a, verrouillee: D.estVerrouillee(a) ? 1 : 0 })));
  });

  // Les deux règles communes aux dates : une activité commence dans l'année de
  // son plan — c'est le plan qui la déclare — et ne se termine pas avant
  // d'avoir commencé. Les formulaires les posent déjà ; la saisie au clavier
  // passe outre les bornes d'un champ de date, la règle tient donc ici aussi.
  const refusDates = (res, plan, a) => {
    const annee = plan && plan.annee ? String(plan.annee) : '';
    const debut = String(a.date_debut || '');
    const fin = String(a.date_fin || '');
    if (debut && annee && debut.slice(0, 4) !== annee) {
      res.status(400).json({ error: `La date de début doit être dans l’année ${annee}.` });
      return true;
    }
    if (debut && fin && fin < debut) {
      res.status(400).json({ error: 'La date de fin doit être postérieure ou égale à la date de début.' });
      return true;
    }
    return false;
  };

  app.post(`${M}/plans/:id/activites`, requireAuth, valider(D.SCHEMA_ACTIVITE), (req, res) => {
    const plan = D.planDe(req.params.id);
    if (!D.peut(req, 'CONTRIBUTEUR', plan)) return D.refus(res);
    if (refusDates(res, plan, req.valide)) return undefined;
    // L'activité appartient à l'instance de son plan.
    return res.json(db.insert('activites', {
      ...req.valide, plan_id: req.params.id, instance: instances.de(plan, loadConfig),
    }));
  });

  // Statut et version du plan portés par chaque activité (vue Calendrier)
  app.get(`${M}/all-activites`, requireAuth, (req, res) => {
    if (!D.peutLire(req)) return D.refus(res);
    const plans = {};
    db.list('plans').forEach((p) => { plans[p.id] = p; });
    const racines = D.racinesDeclenchees();
    return res.json(parInstance(req, db.list('activites')).filter((a) => D.peutLire(req, plans[a.plan_id])).map((a) => ({
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
    if (refusDates(res, act && D.planDe(act.plan_id), { ...act, ...req.valide })) return undefined;
    const rec = db.update('activites', req.params.id, req.valide);
    return rec ? res.json(rec) : res.status(404).json({ error: 'not_found' });
  });

  // Sortie des archives d'une activité prise isolément. Son plan reste
  // archivé : l'exception est portée par l'activité, que « Exécution de la
  // Surveillance » remet alors parmi les activités en cours.
  app.put(`${M}/activites/:id/desarchiver`, requireAuth, (req, res) => {
    const act = db.list('activites').find((a) => a.id === req.params.id);
    if (!act) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'VALIDATEUR', D.planDe(act.plan_id))) return D.refus(res);
    return res.json(db.update('activites', act.id, {
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
    return res.json(db.update('activites', act.id, { desarchivee: 0, desarchiver_le: '', desarchiver_par: '' }));
  });

  app.delete(`${M}/activites/:id`, requireAuth, (req, res) => {
    const act = db.list('activites').find((a) => a.id === req.params.id);
    if (!D.peut(req, 'CONTRIBUTEUR', act && D.planDe(act.plan_id))) return D.refus(res);
    if (act && D.estVerrouillee(act)) return D.refusVerrou(res);
    return res.json({ ok: db.remove('activites', req.params.id) });
  });
};
