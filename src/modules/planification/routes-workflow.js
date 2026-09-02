// Module « Planification de la Surveillance » — circuit du plan.
// Soumission, validation, approbation DG, transmission, rejet et archivage ;
// amendement (nouvelle version), désarchivage, versions et commentaires.
const db = require('./store');
const D = require('./domaine');

// Une transition = un statut. Soumettre relève du contributeur ; décider
// (valider, rejeter, archiver, approuver, transmettre) relève du validateur.
const TRANSITIONS = {
  soumettre: 'soumis',
  valider: 'valide',
  'approuver-dg': 'approuve_dg',
  transmettre: 'transmis',
  rejeter: 'rejete',
  // Rejet définitif : le plan reste consultable mais n'est plus modifiable
  'rejeter-annuler': 'rejete_clos',
  archiver: 'archive',
};

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, audit } = deps;
  const nomComplet = D.nomComplet(auth);

  // Motif de rejet déjà enregistré (conservé lors des autres transitions)
  const commentaireRejet = (id) => {
    const p = db.list('plans').find((x) => x.id === id);
    return p ? p.commentaire_rejet : undefined;
  };

  // Une version validée remplace la précédente, qui passe aux archives.
  const archiverAncetres = (rec, username) => {
    let ancetre = db.list('plans').find((p) => p.id === rec.parent_plan_id);
    const vus = new Set();
    while (ancetre && !vus.has(ancetre.id)) {
      vus.add(ancetre.id);
      if (D.STATUTS_EN_VIGUEUR.includes(ancetre.statut)) {
        db.updateIn('plans', ancetre.id, {
          statut: 'archive', archiver_le: new Date().toISOString(),
          archiver_par: username, remplace_par: rec.id,
        });
        D.wf(ancetre.id, 'archiver', username,
          { commentaire: `Remplacé par la version ${rec.version || ''}`.trim() });
      }
      ancetre = ancetre.parent_plan_id
        ? db.list('plans').find((p) => p.id === ancetre.parent_plan_id) : null;
    }
  };

  Object.entries(TRANSITIONS).forEach(([route, statut]) => {
    app.post(`${M}/plans/:id/${route}`, requireAuth, (req, res) => {
      const requis = route === 'soumettre' ? 'CONTRIBUTEUR' : 'VALIDATEUR';
      if (!D.peut(req, requis, D.planDe(req.params.id))) return D.refus(res);
      const body = req.body || {};
      const commentaire = body.commentaire || body.motif || '';
      const rec = db.updateIn('plans', req.params.id, {
        statut,
        [`${route.replace(/-/g, '_')}_le`]: new Date().toISOString(),
        [`${route.replace(/-/g, '_')}_par`]: req.user.username,
        motif: body.motif || undefined,
        // Le motif du dernier rejet reste visible pour la reprise du plan
        commentaire_rejet: ['rejeter', 'rejeter-annuler'].includes(route) ? commentaire
          : (route === 'soumettre' ? '' : commentaireRejet(req.params.id)),
      });
      if (!rec) return res.status(404).json({ error: 'not_found' });
      // Commentaires de validation saisis activité par activité
      (body.activity_comments || []).forEach((c) => {
        const act = db.list('activites').find((a) => a.id === c.activity_id
          || (c.activity_objet && (a.objet || a.titre) === c.activity_objet && a.plan_id === rec.id));
        if (act) db.updateIn('activites', act.id, { commentaire_validation: c.commentaire });
      });
      if (route === 'valider' && rec.parent_plan_id) archiverAncetres(rec, req.user.username);
      D.wf(rec.id, route, req.user.username, { motif: body.motif || '', commentaire });
      audit.log(req.user.username, `PLAN_${route.toUpperCase().replace(/-/g, '_')}`, { id: rec.id });
      return res.json(rec);
    });
  });

  // ── Amendement ──
  // Amender un plan en vigueur crée une nouvelle version en brouillon
  // (copie des activités) ; le plan validé reste la référence tant que
  // l'amendement n'est pas validé à son tour.
  app.post(`${M}/plans/:id/amender`, requireAuth, (req, res) => {
    const src = db.list('plans').find((x) => x.id === req.params.id);
    if (!src) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'CONTRIBUTEUR', src)) return D.refus(res);
    if (!D.STATUTS_EN_VIGUEUR.includes(src.statut)) {
      return res.status(409).json({ error: 'plan_non_amendable', statut: src.statut });
    }
    const enCours = db.list('plans').find((p) => p.parent_plan_id === src.id
      && ['brouillon', 'soumis', 'en_revue', 'rejete'].includes(p.statut));
    if (enCours) return res.json({ ok: true, new_plan_id: enCours.id, deja_en_cours: true });

    const motif = (req.body && req.body.motif) || '';
    const { id: _old, ...base } = src;
    const child = db.createIn('plans', {
      ...base, statut: 'brouillon', version: (src.version || 1) + 1,
      parent_plan_id: src.id, motif_amendement: motif,
      createdAt: new Date().toISOString(), created_by: req.user.username,
      date_soumission: '', date_validation: '',
    });
    // parent_activite_id = identifiant racine, il relie une activité à ses
    // copies dans les versions suivantes (comparaison des amendements).
    db.list('activites').filter((a) => a.plan_id === src.id).forEach((a) => {
      const { id: _aid, ...ab } = a;
      db.createIn('activites', { ...ab, plan_id: child.id, parent_activite_id: a.parent_activite_id || a.id });
    });
    D.wf(child.id, 'amender', req.user.username, { motif, source: src.id });
    audit.log(req.user.username, 'PLAN_AMENDER', { source: src.id, amendement: child.id });
    return res.json({ ok: true, new_plan_id: child.id, parent_plan_id: src.id, plan: child });
  });

  // Sortie des archives : le plan revient parmi les plans validés, avec ses
  // activités. Une version remplacée par une autre n'y a pas droit — elle a
  // été archivée par le versionnement, pas par une décision de rangement.
  app.post(`${M}/plans/:id/desarchiver`, requireAuth, (req, res) => {
    const p = db.list('plans').find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'VALIDATEUR', p)) return D.refus(res);
    if (p.statut !== 'archive') return res.status(409).json({ error: 'plan_non_archive' });
    if (p.remplace_par) return res.status(409).json({ error: 'version_remplacee' });
    const rec = db.updateIn('plans', p.id, {
      statut: 'valide',
      desarchiver_le: new Date().toISOString(),
      desarchiver_par: req.user.username,
    });
    // Le plan revenant en entier, les exceptions posées activité par activité
    // n'ont plus d'objet.
    db.list('activites').filter((a) => a.plan_id === p.id && Number(a.desarchivee) === 1)
      .forEach((a) => db.updateIn('activites', a.id, { desarchivee: 0 }));
    D.wf(p.id, 'desarchiver', req.user.username, {});
    audit.log(req.user.username, 'PLAN_DESARCHIVER', { id: p.id });
    return res.json(rec);
  });

  // Annuler l'amendement : la version en brouillon et ses activités sont
  // supprimées, le plan d'origine reste en vigueur.
  app.post(`${M}/plans/:id/annuler-amendement`, requireAuth, (req, res) => {
    const child = db.list('plans').find((x) => x.id === req.params.id);
    if (!child) return res.status(404).json({ error: 'not_found' });
    if (!child.parent_plan_id) return res.status(409).json({ error: 'pas_un_amendement' });
    if (!D.peut(req, 'CONTRIBUTEUR', child)) return D.refus(res);
    const d = db.load();
    d.activites = (d.activites || []).filter((a) => a.plan_id !== child.id);
    d.plans = (d.plans || []).filter((p) => p.id !== child.id);
    db.save(d);
    D.wf(child.parent_plan_id, 'annuler-amendement', req.user.username,
      { commentaire: (req.body && req.body.commentaire) || '', amendement: child.id });
    audit.log(req.user.username, 'PLAN_ANNULER_AMENDEMENT', { amendement: child.id, plan: child.parent_plan_id });
    return res.json({ ok: true, parent_plan_id: child.parent_plan_id });
  });

  app.get(`${M}/plans/:id/workflow`, requireAuth, (req, res) =>
    res.json(db.list('workflow').filter((w) => w.plan_id === req.params.id)
      .map((w) => ({ ...w, user_display_name: nomComplet(w.user) }))));

  // ── Versions & commentaires ──
  app.get(`${M}/plans/:id/versions`, requireAuth, (req, res) =>
    res.json(db.list('versions').filter((v) => v.plan_id === req.params.id)));

  app.post(`${M}/plans/:id/versions`, requireAuth, (req, res) =>
    res.json(db.createIn('versions', { ...(req.body || {}), plan_id: req.params.id, auteur: req.user.username })));

  app.get(`${M}/plans/:id/commentaires`, requireAuth, (req, res) => {
    // Le fil reprend toutes les versions du plan, depuis la première.
    const chaine = D.familleDuPlan(req.params.id);
    const versions = {};
    chaine.forEach((p) => { versions[p.id] = p.version || 1; });
    const ids = new Set(Object.keys(versions).length ? Object.keys(versions) : [req.params.id]);

    const commentaires = db.list('commentaires')
      .filter((c) => ids.has(c.plan_id))
      .map((c) => ({ ...c, plan_version: versions[c.plan_id], user_display_name: nomComplet(c.auteur || c.user_id) }));
    // Les décisions de validation / rejet rejoignent le fil de discussion
    const decisions = db.list('workflow')
      .filter((w) => ids.has(w.plan_id) && w.commentaire
        && ['valider', 'rejeter', 'rejeter-annuler', 'validation', 'rejet'].includes(w.action))
      .map((w) => ({ ...w, timeline_type: 'workflow', plan_version: versions[w.plan_id], user_display_name: nomComplet(w.user) }));
    const tri = (x) => x.date_action || x.date_creation || x.createdAt || '';
    res.json([...commentaires, ...decisions].sort((a, b) => String(tri(a)).localeCompare(String(tri(b)))));
  });

  app.post(`${M}/plans/:id/commentaires`, requireAuth, (req, res) =>
    res.json(db.createIn('commentaires', { ...(req.body || {}), plan_id: req.params.id, auteur: req.user.username })));

  app.delete(`${M}/commentaires/:id`, requireAuth, (req, res) =>
    res.json({ ok: db.deleteIn('commentaires', req.params.id) }));
};
