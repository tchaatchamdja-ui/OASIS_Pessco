// Module « Planification de la Surveillance » — cycles de surveillance des
// prestataires et synchronisation des profils de risque vers le plan.
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const instances = require('../../instances');
const db = require('./store');
const D = require('./domaine');

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig, audit } = deps;

  // Les profils de risque arrivent du module voisin par le bus, qui ignore le
  // compte : l'instance se pose ici. Ceux d'un plan sont ceux de son instance
  // à lui — un plan validé au Togo ne se compare pas aux notations du Bénin.
  const profilsVus = (req) => instances.filtrer(
    D.riskProfiles(), instances.courante(req.user, loadConfig), loadConfig);
  const profilsDuPlan = (plan) => instances.filtrer(
    D.riskProfiles(), instances.de(plan, loadConfig), loadConfig);

  // ── Cycles de surveillance des prestataires ──
  app.get(`${M}/prestataires-risques`, requireAuth, (req, res) => {
    const profs = profilsVus(req);
    const prest = instances.refs(req.user, loadConfig).prestataires || [];
    // Un prestataire n'apparaît que s'il a un profil de risque validé :
    // la page « Profils de risque » reflète ainsi « Synthèses Profils ».
    res.json(prest.map((p) => {
      const rp = profs.find((r) => r.prestataire_id === p.id);
      if (!rp) return null;
      const cyc = db.list('cycles').find((c) => c.prestataire_id === p.id) || {};
      // Dates de cycle par défaut : issues du dernier profil de risque validé
      // (début = date de validation, fin = début + CSRBO mois).
      const debutDefaut = (rp.date_validation || '').substring(0, 10);
      let finDefaut = '';
      if (debutDefaut && rp.csrbo) {
        const f = new Date(debutDefaut);
        f.setMonth(f.getMonth() + Number(rp.csrbo));
        finDefaut = f.toISOString().substring(0, 10);
      }
      return {
        id: p.id, nom: p.nom, trigramme: p.trigramme || '',
        domaine_id: p.domaine_id || rp.domaine_id || '', secteur_id: p.secteur_id || rp.secteur_id || '',
        evaluation_id: rp.id,
        risk_label: rp.niveau, matrice: rp.matrice, intensite: rp.intensite,
        csn: rp.csn, csrbo: rp.csrbo, frequence: rp.frequence,
        resultats: rp.resultats,
        evaluation_date: rp.date_validation, cycle: rp.cycle,
        // Champs historiques conservés pour les appelants existants
        niveau_risque: rp.niveau, score_risque: rp.score, date_profil: rp.date_validation,
        debut_cycle: cyc.debut_cycle || p.debut_cycle || debutDefaut,
        fin_cycle: cyc.fin_cycle || p.fin_cycle || finDefaut,
      };
    }).filter(Boolean));
  });

  // Le client enregistre les dates de cycle en PUT ; POST conservé pour
  // compatibilité (sans PUT, Express renvoyait une 404 HTML que le client
  // tentait de parser en JSON).
  const majCycle = (req, res) => {
    const pr = (referentiels.getAll().prestataires || []).find((x) => x.id === req.params.id) || {};
    if (!moduleRights.can('PLAN', req.user.username, 'VALIDATEUR', pr.domaine_id || '', pr.secteur_id || '')) {
      return res.status(403).json({ error: 'privilege_insuffisant' });
    }
    const d = db.load();
    d.cycles = d.cycles || [];
    const i = d.cycles.findIndex((c) => c.prestataire_id === req.params.id);
    const rec = { prestataire_id: req.params.id, ...(req.body || {}), updatedAt: new Date().toISOString() };
    if (i >= 0) d.cycles[i] = { ...d.cycles[i], ...rec }; else d.cycles.push({ id: db.uid(), ...rec });
    db.save(d);
    return res.json({ ok: true });
  };
  app.post(`${M}/prestataires/:id/cycle`, requireAuth, majCycle);
  app.put(`${M}/prestataires/:id/cycle`, requireAuth, majCycle);

  // ── Synchronisation des risques → plan ──
  app.get(`${M}/plans/:id/sync-risques`, requireAuth, (req, res) => {
    const plan = db.list('plans').find((x) => x.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'not_found' });
    const changes = D.ecartsRisques(plan, profilsDuPlan(plan));
    return res.json({ has_changes: changes.length > 0, changes });
  });

  // Plan déjà validé : les changements alimentent un amendement (nouvelle
  // version en brouillon) plutôt que le plan en vigueur.
  const cibleDeSynchro = (plan, username) => {
    if (!D.STATUTS_EN_VIGUEUR.includes(plan.statut)) return { cible: plan, amended: false };
    const { id: _old, ...base } = plan;
    const cible = db.createIn('plans', {
      ...base, statut: 'brouillon', version: (plan.version || 1) + 1,
      parent_plan_id: plan.id, createdAt: new Date().toISOString(), created_by: username,
    });
    db.list('activites').filter((a) => a.plan_id === plan.id).forEach((a) => {
      const { id: _aid, ...ab } = a;
      db.createIn('activites', { ...ab, plan_id: cible.id, parent_activite_id: a.parent_activite_id || a.id });
    });
    return { cible, amended: true };
  };

  app.post(`${M}/plans/:id/apply-sync`, requireAuth, (req, res) => {
    const plan = db.list('plans').find((x) => x.id === req.params.id);
    if (!plan) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'CONTRIBUTEUR', plan)) return D.refus(res);
    const ids = (req.body && (req.body.prestataire_ids || req.body.items)) || [];
    const retenus = new Set(ids.map((x) => (typeof x === 'string' ? x : x.prestataire_id)));
    const changes = D.ecartsRisques(plan, profilsDuPlan(plan))
      .filter((c) => retenus.has(c.prestataire_id));

    const { cible, amended } = cibleDeSynchro(plan, req.user.username);
    const prestataires = referentiels.getAll().prestataires || [];
    let created = 0;
    let updated = 0;
    changes.forEach((c) => {
      const acts = db.list('activites').filter((a) => a.plan_id === cible.id && a.prestataire_id === c.prestataire_id);
      if (!acts.length) {
        const pr = prestataires.find((x) => x.id === c.prestataire_id) || {};
        db.createIn('activites', {
          plan_id: cible.id, prestataire_id: c.prestataire_id,
          // Née d'un plan, elle appartient à l'instance de ce plan.
          instance: cible.instance || '',
          secteur_id: pr.secteur_id || '', domaine_id: pr.domaine_id || '',
          objet: `Surveillance ${pr.trigramme || pr.nom || ''}`.trim(),
          titre: `Surveillance ${pr.trigramme || pr.nom || ''}`.trim(),
          risk_label: c.apres.risk_label, cycle_mois: c.apres.csrbo,
          statut: 'planifiee', priorite: 'normale', nombre_inspecteurs: 1,
        });
        created += 1;
      } else {
        acts.forEach((a) => {
          db.updateIn('activites', a.id, { risk_label: c.apres.risk_label, cycle_mois: c.apres.csrbo });
          updated += 1;
        });
      }
    });

    audit.log(req.user.username, 'PLAN_SYNC_RISQUES', { plan: cible.id, created, updated, amended });
    return res.json({ ok: true, created, updated, amended, target_plan_id: cible.id });
  });
};
