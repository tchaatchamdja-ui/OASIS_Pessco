// Module « Profils de Risque » — données partagées du portail, bibliothèque
// documentaire, contexte et collections du module (CRUD générique).
const moduleRights = require('../../module_rights');
const db = require('./store');
const D = require('./domaine');

// Collections du module servies par le CRUD générique.
const CRUD = {
  'indicateurs-conf': 'indicateurs_conf',
  'indicateurs-perf': 'indicateurs_perf',
  'indicateurs-complex': 'indicateurs_complex',
  evaluations: 'evaluations',
  plans: 'plans',
  'eval-reunions': 'eval_reunions',
  'eval-reunions-prest': 'eval_reunions_prest',
};

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, loadConfig, audit } = deps;

  // ── Données partagées attendues par le front PESSCO ──
  app.get('/api/domaines', requireAuth, (req, res) => res.json(D.sharedDomaines()));
  app.get('/api/secteurs', requireAuth, (req, res) => res.json(D.sharedSecteurs()));
  app.get('/api/sous-activites', requireAuth, (req, res) => res.json(D.sharedSousActivites()));
  app.get('/api/prestataires', requireAuth, (req, res) => res.json(D.sharedPrestataires()));
  app.get('/api/indices', requireAuth, (req, res) => res.json(D.sharedIndices()));

  app.put('/api/indices', requireAuth, (req, res) => {
    const d = db.load();
    d.indices = Array.isArray(req.body) ? req.body : (req.body && req.body.indices) || d.indices;
    db.save(d);
    res.json({ ok: true, indices: d.indices });
  });

  app.get('/api/aac', requireAuth, (req, res) => {
    const cfg = loadConfig();
    res.json({ ...(cfg.aac || {}), logo_data: (cfg.aac && cfg.aac.logo) || '' });
  });

  // ── Bibliothèque documentaire ──
  // Le contenu est stocké en base64 dans l'enregistrement mais n'est jamais
  // renvoyé par la liste : seul /download le restitue.
  const MAX_DOC_BYTES = 3_500_000; // marge sous la limite express.json (5 Mo)
  const publicDoc = ({ contenu, ...d }) => ({ ...d, taille: d.taille || 0 });

  app.get('/api/documents', requireAuth, (req, res) => res.json(db.getColl('documents').map(publicDoc)));

  app.post('/api/documents', requireAuth, (req, res) => {
    const { nom, type, mime, fileB64 } = req.body || {};
    if (!nom) return res.status(400).json({ error: 'nom_requis' });
    const contenu = String(fileB64 || '').split(',').pop();
    if (!contenu) return res.status(400).json({ error: 'fichier_requis' });
    const taille = Math.round((contenu.length * 3) / 4);
    if (taille > MAX_DOC_BYTES) return res.status(413).json({ error: 'fichier_trop_volumineux', maxMo: 3.5 });
    const rec = db.createIn('documents', {
      nom, type: type || '', mime: mime || 'application/octet-stream', taille, contenu,
      date_upload: new Date().toISOString(), uploade_par: req.user.username,
    });
    audit.log(req.user.username, 'PR_DOCUMENT_AJOUT', { id: rec.id, nom, taille });
    return res.json(publicDoc(rec));
  });

  app.get('/api/documents/:id/download', requireAuth, (req, res) => {
    const doc = db.getColl('documents').find((d) => d.id === req.params.id);
    if (!doc || !doc.contenu) return res.status(404).json({ error: 'not_found' });
    const buf = Buffer.from(doc.contenu, 'base64');
    res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nom)}"`);
    return res.send(buf);
  });

  app.delete('/api/documents/:id', requireAuth, (req, res) => {
    const ok = db.deleteIn('documents', req.params.id);
    if (ok) audit.log(req.user.username, 'PR_DOCUMENT_SUPPRIME', { id: req.params.id });
    res.json({ ok });
  });

  // Utilisateur courant enrichi pour le module (rôle M1, domaines)
  app.get(`${M}/me`, requireAuth, (req, res) => {
    const u = auth.publicUser(req.user);
    res.json({
      ...u, role: D.roleM1(req.user), role_m1: `M1_${D.roleM1(req.user)}`,
      domaines: u.domaines || [], prenom: u.prenom || '', nom: u.nom || u.username,
    });
  });

  // ── Collections du module (CRUD générique) ──
  Object.entries(CRUD).forEach(([route, coll]) => {
    app.get(`${M}/${route}`, requireAuth, (req, res) => {
      let rows = db.getColl(coll);
      if (req.query.eval_id) rows = rows.filter((r) => r.eval_id === req.query.eval_id);
      if (req.query.prestataire_id) rows = rows.filter((r) => r.prestataire_id === req.query.prestataire_id);
      res.json(rows);
    });

    app.get(`${M}/${route}/:id`, requireAuth, (req, res) => {
      const r = db.getColl(coll).find((x) => x.id === req.params.id);
      return r ? res.json(r) : res.status(404).json({ error: 'not_found' });
    });

    app.post(`${M}/${route}`, requireAuth, (req, res) => {
      // Création d'évaluation : réservée aux Gestionnaire / Validateur, et
      // limitée aux domaines-secteurs couverts par leurs privilèges.
      if (coll === 'evaluations') {
        const { secteur_id: sec, domaine_id: dom } = req.body || {};
        if (!moduleRights.can('PLAN', req.user.username, 'VALIDATEUR', dom || '', sec || '')) {
          return res.status(403).json({ error: 'privilege_insuffisant' });
        }
      }
      const rec = db.createIn(coll, { ...(req.body || {}), created_by: req.user.username });
      audit.log(req.user.username, 'PR_CREATE', { coll, id: rec.id });
      return res.json(rec);
    });

    app.put(`${M}/${route}/:id`, requireAuth, (req, res) => {
      let rec = db.updateIn(coll, req.params.id, req.body || {});
      if (!rec) return res.status(404).json({ error: 'not_found' });
      // Les deux premières étapes du fil d'avancement ne passent pas par une
      // route dédiée : elles se déduisent de l'état de l'évaluation.
      if (coll === 'evaluations') rec = D.stampNotationEtapes(rec);
      audit.log(req.user.username, 'PR_UPDATE', { coll, id: rec.id });
      return res.json(rec);
    });

    app.delete(`${M}/${route}/:id`, requireAuth, (req, res) => {
      // Supprimer une réévaluation libère l'évaluation d'origine : sans cela
      // elle resterait marquée « réévaluation en cours » sans cycle suivant.
      let parentId = null;
      if (coll === 'evaluations') {
        const src = db.getColl('evaluations').find((x) => x.id === req.params.id);
        if (!src) return res.status(404).json({ error: 'not_found' });
        // Suppression réservée au Gestionnaire du domaine/secteur du prestataire
        const priv = moduleRights.effectivePrivilege('PLAN', req.user.username, src.domaine_id || '', src.secteur_id || '');
        if (priv !== 'GESTIONNAIRE') return res.status(403).json({ error: 'privilege_insuffisant' });
        parentId = src.parent_id;
      }
      if (!db.deleteIn(coll, req.params.id)) return res.status(404).json({ error: 'not_found' });
      if (parentId) db.updateIn('evaluations', parentId, { reevalue_le: '', reevalue_par: '', enfant_id: '' });
      audit.log(req.user.username, 'PR_DELETE', { coll, id: req.params.id, parent_libere: parentId || null });
      return res.json({ ok: true });
    });
  });

  // ── Contexte agrégé (chargement initial rapide) ──
  app.get(`${M}/context`, requireAuth, (req, res) => {
    const cfg = loadConfig();
    res.json({
      user: { ...auth.publicUser(req.user), role: D.roleM1(req.user), role_m1: `M1_${D.roleM1(req.user)}` },
      aac: cfg.aac || {},
      instance: cfg.instance,
      shared: {
        domaines: D.sharedDomaines(), secteurs: D.sharedSecteurs(),
        sousActivites: D.sharedSousActivites(), prestataires: D.sharedPrestataires(),
        indices: D.sharedIndices(),
      },
    });
  });
};
