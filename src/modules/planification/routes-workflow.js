// Module « Planification de la Surveillance » — circuit du plan.
// Soumission, validation, approbation DG, transmission, rejet et archivage ;
// amendement (nouvelle version), désarchivage, versions et commentaires.
const db = require('./store');
const D = require('./domaine');
const { valider } = require('../../valider');

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

  // Une version validée remplace la précédente, qui se retire. Elle n'est pas
  // archivée : on range aux archives un plan arrivé à son terme, et confondre
  // les deux sorts faisait passer chaque amendement pour une fin de plan.
  // La version retirée garde sa place dans la lignée — versions, historique,
  // processus déjà menés — mais ne figure plus ni parmi les plans en vigueur
  // ni parmi les archives.
  const retirerAncetres = (rec, username) => {
    let ancetre = db.list('plans').find((p) => p.id === rec.parent_plan_id);
    const vus = new Set();
    while (ancetre && !vus.has(ancetre.id)) {
      vus.add(ancetre.id);
      if (D.STATUTS_EN_VIGUEUR.includes(ancetre.statut)) {
        db.update('plans', ancetre.id, {
          statut: D.STATUT_REMPLACE, remplace_le: new Date().toISOString(),
          remplace_par_qui: username, remplace_par: rec.id,
        });
        D.wf(ancetre.id, 'remplacer', username,
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
      const rec = db.update('plans', req.params.id, {
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
        if (act) db.update('activites', act.id, { commentaire_validation: c.commentaire });
      });
      if (route === 'valider' && rec.parent_plan_id) retirerAncetres(rec, req.user.username);
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
    // Un plan n'a qu'un amendement à la fois. Ouvrir le second donnerait deux
    // héritiers de la même version : chacun copierait les activités d'alors,
    // et valider l'un effacerait le travail fait dans l'autre. La demande est
    // donc refusée — l'amendement en cours est nommé dans le refus, pour que
    // l'écran sache où renvoyer.
    const enCours = db.list('plans').find((p) => p.parent_plan_id === src.id
      && D.STATUTS_AMENDEMENT.includes(p.statut));
    if (enCours) {
      return res.status(409).json({
        error: 'amendement_en_cours', amendement: enCours.id, version: enCours.version,
      });
    }

    const motif = (req.body && req.body.motif) || '';
    const { id: _old, ...base } = src;
    const child = db.insert('plans', {
      ...base, statut: 'brouillon', version: (src.version || 1) + 1,
      parent_plan_id: src.id, motif_amendement: motif,
      createdAt: new Date().toISOString(), created_by: req.user.username,
      date_soumission: '', date_validation: '',
    });
    // parent_activite_id = identifiant racine, il relie une activité à ses
    // copies dans les versions suivantes (comparaison des amendements).
    db.list('activites').filter((a) => a.plan_id === src.id).forEach((a) => {
      const { id: _aid, ...ab } = a;
      db.insert('activites', { ...ab, plan_id: child.id, parent_activite_id: a.parent_activite_id || a.id });
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
    const rec = db.update('plans', p.id, {
      statut: 'valide',
      desarchiver_le: new Date().toISOString(),
      desarchiver_par: req.user.username,
    });
    // Le plan revenant en entier, les exceptions posées activité par activité
    // n'ont plus d'objet.
    db.list('activites').filter((a) => a.plan_id === p.id && Number(a.desarchivee) === 1)
      .forEach((a) => db.update('activites', a.id, { desarchivee: 0 }));
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

  // Le circuit, les versions et le fil de discussion suivent le sort du plan :
  // les lire suppose d'avoir accès au plan, y écrire suppose d'y contribuer.
  // Ces quatre routes n'opposaient aucun refus — n'importe quelle session
  // écrivait dans le fil d'un plan et en effaçait les avis.
  const lecturePlan = (req, res, next) => (D.peutLire(req, D.planDe(req.params.id)) ? next() : D.refus(res));
  const ecriturePlan = (req, res, next) => (D.peut(req, 'CONTRIBUTEUR', D.planDe(req.params.id)) ? next() : D.refus(res));

  app.get(`${M}/plans/:id/workflow`, requireAuth, lecturePlan, (req, res) =>
    res.json(db.list('workflow').filter((w) => w.plan_id === req.params.id)
      .map((w) => ({ ...w, user_display_name: nomComplet(w.user) }))));

  // ── Versions & commentaires ──
  app.get(`${M}/plans/:id/versions`, requireAuth, lecturePlan, (req, res) =>
    res.json(db.list('versions').filter((v) => v.plan_id === req.params.id)));

  // Ce qu'une version consignée retient : son numéro, ce qui l'a motivée, et
  // le commentaire du rédacteur. Le plan et l'auteur viennent de la requête.
  const SCHEMA_VERSION = {
    version: { type: 'texte', max: 20 },
    motif: { type: 'texte', max: 500 },
    commentaire: { type: 'texte', max: 4000 },
  };

  app.post(`${M}/plans/:id/versions`, requireAuth, ecriturePlan, valider(SCHEMA_VERSION), (req, res) =>
    res.json(db.insert('versions', { ...req.valide, plan_id: req.params.id, auteur: req.user.username })));

  app.get(`${M}/plans/:id/commentaires`, requireAuth, lecturePlan, (req, res) => {
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

  // Un avis au fil de discussion, et rien d'autre : le plan vient du chemin,
  // l'auteur de la session, la date du magasin. Le corps n'apportait aucune
  // borne — ni sur la taille de l'avis, ni sur les champs qui l'accompagnaient.
  app.post(`${M}/plans/:id/commentaires`, requireAuth, ecriturePlan,
    valider({ contenu: { type: 'texte', requis: true, max: 4000 } }), (req, res) =>
      res.json(db.insert('commentaires', {
        ...req.valide, plan_id: req.params.id, auteur: req.user.username,
      })));

  // Retirer un avis du fil : son auteur, ou le Gestionnaire du plan. Un
  // contributeur voisin n'efface pas la remarque d'un autre.
  app.delete(`${M}/commentaires/:id`, requireAuth, (req, res) => {
    const c = db.list('commentaires').find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'not_found' });
    const plan = D.planDe(c.plan_id);
    const sien = (c.auteur || c.user_id) === req.user.username;
    if (!D.peut(req, sien ? 'CONTRIBUTEUR' : 'GESTIONNAIRE', plan)) return D.refus(res);
    return res.json({ ok: db.remove('commentaires', req.params.id) });
  });
};
