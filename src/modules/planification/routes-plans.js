// Module « Planification de la Surveillance » — référentiels partagés,
// contexte, statistiques et plans.
const referentiels = require('../../referentiels');
const { valider } = require('../../valider');
const db = require('./store');
const D = require('./domaine');

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, loadConfig, audit } = deps;

  // ── Référentiels partagés attendus par le module ──
  app.get('/api/inspecteurs', requireAuth, (req, res) => res.json(referentiels.getAll().inspecteurs || []));
  app.get('/api/types-supervision', requireAuth, (req, res) => res.json(referentiels.getAll().types_supervision || []));
  app.get('/api/modes-supervision', requireAuth, (req, res) => res.json(referentiels.getAll().modes_supervision || []));
  app.get('/api/themes-supervision', requireAuth, (req, res) => res.json(referentiels.getAll().themes_supervision || []));
  app.get('/api/exigences', requireAuth, (req, res) => res.json(referentiels.getAll().exigences || []));
  app.get('/api/shared/risk-profiles', requireAuth, (req, res) => res.json(D.riskProfiles()));
  // Même contrat, exposé en HTTP pour les fronts des autres modules
  app.get('/api/shared/surveillance-plans', requireAuth, (req, res) => res.json(D.plansValides(req.query)));
  app.get(`${M}/plans-valides`, requireAuth, (req, res) => res.json(D.plansValides(req.query)));
  app.get(`${M}/risk-profiles`, requireAuth, (req, res) => res.json(D.riskProfiles()));

  // Contexte du module (utilisateur + rôle M2)
  app.get(`${M}/context`, requireAuth, (req, res) => {
    const cfg = loadConfig();
    const u = auth.publicUser(req.user);
    res.json({
      user: {
        ...u,
        role_m2: D.roleM2(req.user),
        role: D.roleM2(req.user).replace('M2_', ''),
        nom: u.nom || u.username,
        prenom: u.prenom || '',
      },
      aac: cfg.aac || {},
      instance: cfg.instance,
    });
  });

  // ── Statistiques ──
  app.get(`${M}/stats`, requireAuth, (req, res) => {
    const plans = db.list('plans');
    const acts = db.list('activites');
    res.json({
      total_plans: plans.length,
      plans_valides: plans.filter((p) => D.STATUTS_EN_VIGUEUR.includes(p.statut)).length,
      plans_brouillon: plans.filter((p) => !p.statut || p.statut === 'brouillon').length,
      // Le tableau de bord distingue ce qui attend une décision de ce qui a
      // été refusé : sans ces deux compteurs, ses cartes restaient à zéro.
      plans_soumis: plans.filter((p) => p.statut === 'soumis').length,
      plans_rejetes: plans.filter((p) => p.statut === 'rejete').length,
      plans_archives: plans.filter((p) => p.statut === 'archive').length,
      total_activites: acts.length,
      activites_planifiees: acts.filter((a) => a.statut !== 'realisee').length,
      activites_realisees: acts.filter((a) => a.statut === 'realisee').length,
      prestataires: (referentiels.getAll().prestataires || []).length,
    });
  });

  // ── Plans ──
  // Les plans sont renvoyés avec leur nombre d'activités, et le détail avec
  // ses activités : le client les lit directement sur l'objet plan.
  app.get(`${M}/plans`, requireAuth, (req, res) => {
    const acts = db.list('activites');
    res.json(db.list('plans').map((p) => ({
      ...p, nb_activites: acts.filter((a) => a.plan_id === p.id).length,
    })));
  });

  app.get(`${M}/plans/:id`, requireAuth, (req, res) => {
    const p = db.list('plans').find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    // L'écran de détail lit ses activités ici : le verrou d'exécution doit
    // donc y figurer, comme sur /all-activites.
    const racines = D.racinesDeclenchees();
    const activites = db.list('activites').filter((a) => a.plan_id === p.id)
      .map((a) => ({ ...a, verrouillee: racines.has(D.racine(a)) ? 1 : 0 }));
    return res.json({ ...p, activites, nb_activites: activites.length });
  });

  app.post(`${M}/plans`, requireAuth, valider(D.SCHEMA_PLAN), (req, res) => {
    if (!D.peut(req, 'CONTRIBUTEUR', req.body || {})) return D.refus(res);
    const rec = db.createIn('plans', { statut: 'brouillon', ...(req.body || {}), created_by: req.user.username });
    audit.log(req.user.username, 'PLAN_CREE', { id: rec.id });
    return res.json(rec);
  });

  app.put(`${M}/plans/:id`, requireAuth, (req, res) => {
    if (!D.peut(req, 'CONTRIBUTEUR', D.planDe(req.params.id))) return D.refus(res);
    const rec = db.updateIn('plans', req.params.id, req.body || {});
    return rec ? res.json(rec) : res.status(404).json({ error: 'not_found' });
  });

  app.delete(`${M}/plans/:id`, requireAuth, (req, res) => {
    if (!D.peut(req, 'GESTIONNAIRE', D.planDe(req.params.id))) return D.refus(res);
    if (!db.deleteIn('plans', req.params.id)) return res.status(404).json({ error: 'not_found' });
    const d = db.load();
    d.activites = (d.activites || []).filter((a) => a.plan_id !== req.params.id);
    db.save(d);
    return res.json({ ok: true });
  });
};
