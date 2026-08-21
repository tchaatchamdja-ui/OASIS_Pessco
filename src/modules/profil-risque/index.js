// OASIS — Backend du module « Profils de Risque » (reprise intégrale PESSCO).
// Expose les endpoints attendus par le front PESSCO :
//   /api/m/profil-risque/*  (données du module)
//   /api/domaines, /api/secteurs, /api/sous-activites, /api/prestataires,
//   /api/indices, /api/aac, /api/documents  (données partagées du portail)
const crypto = require('crypto');
const XLSX = require('xlsx');
const store = require('../../store');
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const services = require('../../services');

const COLLECTIONS = [
  'indicateurs_conf',
  'indicateurs_perf',
  'indicateurs_complex',
  'evaluations',
  'plans',
  'eval_reunions',
  'eval_reunions_prest',
  'documents',
  'indices',
];

const uid = () => crypto.randomBytes(8).toString('hex');
const load = () => store.load('profil_risque', {});
const save = (d) => store.save('profil_risque', d);
const list = (coll) => load()[coll] || [];

function seed() {
  const d = store.load('profil_risque', null);
  if (d) return;
  const now = new Date().toISOString();
  save({
    // Les indicateurs sont saisis par l'AAC (aucun exemple pré-rempli).
    indicateurs_conf: [],
    indicateurs_perf: [],
    indicateurs_complex: [],
    evaluations: [],
    plans: [],
    eval_reunions: [],
    eval_reunions_prest: [],
    documents: [],
    indices: [
      { cle: 'poids_conformite', valeur: 0.5 },
      { cle: 'poids_performance', valeur: 0.3 },
      { cle: 'poids_complexite', valeur: 0.2 },
      { cle: 'seuil_faible', valeur: 25 },
      { cle: 'seuil_moyen', valeur: 50 },
      { cle: 'seuil_eleve', valeur: 75 },
    ],
    createdAt: now,
  });
}

function getColl(coll) {
  return list(coll);
}
function createIn(coll, item) {
  const d = load();
  const rec = { id: uid(), createdAt: new Date().toISOString(), ...item };
  d[coll] = d[coll] || [];
  d[coll].push(rec);
  save(d);
  return rec;
}
function updateIn(coll, id, patch) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return null;
  arr[i] = { ...arr[i], ...patch, id, updatedAt: new Date().toISOString() };
  save(d);
  return arr[i];
}
function deleteIn(coll, id) {
  const d = load();
  const arr = d[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i < 0) return false;
  arr.splice(i, 1);
  save(d);
  return true;
}

// ── Données partagées : mappées depuis les référentiels du portail ──
function sharedDomaines() {
  return (referentiels.getAll().domaines || []).map((x) => ({ id: x.id, code: x.code, nom: x.nom, description: x.description || '', actif: x.statut !== 'inactif' }));
}
function sharedSecteurs() {
  return (referentiels.getAll().secteurs || []).map((x) => ({ id: x.id, code: x.code, nom: x.nom, domaine_id: x.domaine_id, csn: x.csn || 24, actif: x.statut !== 'inactif' }));
}
function sharedSousActivites() {
  return (referentiels.getAll().sous_activites || []).map((x) => ({ id: x.id, code: x.code, nom: x.nom, secteur_id: x.secteur_id }));
}
function sharedPrestataires() {
  return (referentiels.getAll().prestataires || []).map((x) => ({
    id: x.id, nom: x.nom, trigramme: x.trigramme || '', domaine_id: x.domaine_id || '', secteur_id: x.secteur_id || '',
    dirigeant: x.dirigeant || '', point_focal: x.point_focal || '', email_prestataire: x.email_prestataire || '',
    ref_agrement: x.ref_agrement || '', actif: x.statut !== 'inactif', statut: x.statut || 'actif',
    debut_cycle: x.debut_cycle || '', fin_cycle: x.fin_cycle || '', date_init_surveillance: x.date_init_surveillance || '',
  }));
}
function sharedIndices() {
  return list('indices');
}

// Rôle module (M1) dérivé du rôle portail OASIS
function roleM1(user) {
  if (!user) return 'Consultation';
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return 'Administrateur';
  if (user.role === 'AAC' || user.role === 'INSPECTEUR') return 'Evaluateur';
  return 'Consultation';
}

// Service publié : profils de risque en vigueur, consommés par les autres
// modules (Planification…). Contrat : voir services.publish plus bas.
// Même source que la page « Synthèses Profils » : la dernière évaluation
// validée de chaque prestataire, avec les résultats consolidés
// (niveau de risque, matrice, intensité, CSRBO, détail par sous-activité).
function riskProfiles() {
  const evals = (getColl('evaluations') || []).filter((e) => e.statut === 'valide');
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
    const csn = Number(g.csn || sec?.csn || 24);
    return {
      id: e.id,
      prestataire_id: e.prestataire_id,
      secteur_id: e.secteur_id,
      domaine_id: e.domaine_id || sec?.domaine_id || '',
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

function register(app, deps) {
  // Contrat exposé aux autres modules : la dernière évaluation validée de
  // chaque prestataire, avec niveau de risque, CSRBO et résultats détaillés.
  services.publish('PR.riskProfiles', riskProfiles, {
    module: 'PR',
    description: 'Dernier profil de risque validé par prestataire',
    retour: '[{ prestataire_id, secteur_id, domaine_id, niveau, matrice, intensite, csn, csrbo, frequence, resultats, date_validation, cycle }]',
  });

  const { requireAuth, auth, loadConfig, audit } = deps;
  const M = '/api/m/profil-risque';

  // ── Données partagées attendues par le front PESSCO ──
  app.get('/api/domaines', requireAuth, (req, res) => res.json(sharedDomaines()));
  app.get('/api/secteurs', requireAuth, (req, res) => res.json(sharedSecteurs()));
  app.get('/api/sous-activites', requireAuth, (req, res) => res.json(sharedSousActivites()));
  app.get('/api/prestataires', requireAuth, (req, res) => res.json(sharedPrestataires()));
  app.get('/api/indices', requireAuth, (req, res) => res.json(sharedIndices()));
  app.put('/api/indices', requireAuth, (req, res) => {
    const d = load();
    d.indices = Array.isArray(req.body) ? req.body : (req.body && req.body.indices) || d.indices;
    save(d);
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

  app.get('/api/documents', requireAuth, (req, res) => res.json(getColl('documents').map(publicDoc)));

  app.post('/api/documents', requireAuth, (req, res) => {
    const { nom, type, mime, fileB64 } = req.body || {};
    if (!nom) return res.status(400).json({ error: 'nom_requis' });
    const contenu = String(fileB64 || '').split(',').pop();
    if (!contenu) return res.status(400).json({ error: 'fichier_requis' });
    const taille = Math.round((contenu.length * 3) / 4);
    if (taille > MAX_DOC_BYTES) return res.status(413).json({ error: 'fichier_trop_volumineux', maxMo: 3.5 });
    const rec = createIn('documents', {
      nom, type: type || '', mime: mime || 'application/octet-stream', taille, contenu,
      date_upload: new Date().toISOString(), uploade_par: req.user.username,
    });
    audit.log(req.user.username, 'PR_DOCUMENT_AJOUT', { id: rec.id, nom, taille });
    res.json(publicDoc(rec));
  });

  app.get('/api/documents/:id/download', requireAuth, (req, res) => {
    const doc = getColl('documents').find((d) => d.id === req.params.id);
    if (!doc || !doc.contenu) return res.status(404).json({ error: 'not_found' });
    const buf = Buffer.from(doc.contenu, 'base64');
    res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nom)}"`);
    res.send(buf);
  });

  app.delete('/api/documents/:id', requireAuth, (req, res) => {
    const ok = deleteIn('documents', req.params.id);
    if (ok) audit.log(req.user.username, 'PR_DOCUMENT_SUPPRIME', { id: req.params.id });
    res.json({ ok });
  });

  // Utilisateur courant enrichi pour le module (rôle M1, domaines)
  app.get(`${M}/me`, requireAuth, (req, res) => {
    const u = auth.publicUser(req.user);
    res.json({ ...u, role: roleM1(req.user), role_m1: 'M1_' + roleM1(req.user), domaines: u.domaines || [], prenom: u.prenom || '', nom: u.nom || u.username });
  });

  // ── Collections du module (CRUD générique) ──
  const map = {
    'indicateurs-conf': 'indicateurs_conf',
    'indicateurs-perf': 'indicateurs_perf',
    'indicateurs-complex': 'indicateurs_complex',
    evaluations: 'evaluations',
    plans: 'plans',
    'eval-reunions': 'eval_reunions',
    'eval-reunions-prest': 'eval_reunions_prest',
  };
  Object.entries(map).forEach(([route, coll]) => {
    app.get(`${M}/${route}`, requireAuth, (req, res) => {
      let rows = getColl(coll);
      if (req.query.eval_id) rows = rows.filter((r) => r.eval_id === req.query.eval_id);
      if (req.query.prestataire_id) rows = rows.filter((r) => r.prestataire_id === req.query.prestataire_id);
      res.json(rows);
    });
    app.get(`${M}/${route}/:id`, requireAuth, (req, res) => {
      const r = getColl(coll).find((x) => x.id === req.params.id);
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
      const rec = createIn(coll, { ...(req.body || {}), created_by: req.user.username });
      audit.log(req.user.username, 'PR_CREATE', { coll, id: rec.id });
      res.json(rec);
    });
    app.put(`${M}/${route}/:id`, requireAuth, (req, res) => {
      let rec = updateIn(coll, req.params.id, req.body || {});
      if (!rec) return res.status(404).json({ error: 'not_found' });
      // Les deux premières étapes du fil d'avancement ne passent pas par une
      // route dédiée : elles se déduisent de l'état de l'évaluation.
      if (coll === 'evaluations') rec = stampNotationEtapes(rec);
      audit.log(req.user.username, 'PR_UPDATE', { coll, id: rec.id });
      res.json(rec);
    });
    app.delete(`${M}/${route}/:id`, requireAuth, (req, res) => {
      // Supprimer une réévaluation libère l'évaluation d'origine : sans cela
      // elle resterait marquée « réévaluation en cours » sans cycle suivant.
      let parentId = null;
      if (coll === 'evaluations') {
        const src = getColl('evaluations').find((x) => x.id === req.params.id);
        if (!src) return res.status(404).json({ error: 'not_found' });
        // Suppression réservée au Gestionnaire du domaine/secteur du prestataire
        const priv = moduleRights.effectivePrivilege('PLAN', req.user.username, src.domaine_id || '', src.secteur_id || '');
        if (priv !== 'GESTIONNAIRE') return res.status(403).json({ error: 'privilege_insuffisant' });
        parentId = src.parent_id;
      }
      if (!deleteIn(coll, req.params.id)) return res.status(404).json({ error: 'not_found' });
      if (parentId) updateIn('evaluations', parentId, { reevalue_le: '', reevalue_par: '', enfant_id: '' });
      audit.log(req.user.username, 'PR_DELETE', { coll, id: req.params.id, parent_libere: parentId || null });
      res.json({ ok: true });
    });
  });

  // ══════════ Export / Import Excel ══════════
  // Format du classeur (modèle AAC) : une feuille par type, colonnes en clair et
  // portée désignée par le CODE du secteur / de la sous-activité, pas par un id.
  const IND_SHEETS = [
    { coll: 'indicateurs_conf', sheet: 'Conformite', scope: { col: 'Secteur_ID', field: 'secteur_id', ref: 'secteurs' } },
    { coll: 'indicateurs_perf', sheet: 'Performance', scope: null },
    { coll: 'indicateurs_complex', sheet: 'Complexite', scope: { col: 'SousActivite_ID', field: 'sous_activite_id', ref: 'sous_activites' } },
  ];
  const IND_HEADERS = (scope) =>
    ['Code', 'Label', ...(scope ? [scope.col] : []), 'Critere 1', 'Critere 2', 'Critere 3'];
  // Champs comparés pour détecter un enregistrement réellement modifié
  const IND_FIELDS = ['label', 'c1', 'c2', 'c3', 'secteur_id', 'sous_activite_id'];

  const refRows = (name) => referentiels.getAll()[name] || [];
  const normCode = (v) => String(v == null ? '' : v).trim().toUpperCase();
  const refCode = (name, id) => { const r = refRows(name).find((x) => x.id === id); return r ? r.code || '' : ''; };
  const refId = (name, code) => {
    const c = normCode(code);
    if (!c) return '';
    const r = refRows(name).find((x) => normCode(x.code) === c) || refRows(name).find((x) => x.id === String(code).trim());
    return r ? r.id : '';
  };

  function sendWorkbook(res, wb, filename) {
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  }

  function readUpload(req) {
    const b64 = String((req.body && (req.body.fileB64 || req.body.file)) || '').split(',').pop();
    if (!b64) return { error: 'no_file' };
    const contenu = Buffer.from(b64, 'base64');
    // Un classeur d'import reste de taille modeste : au-delà, on refuse
    // plutôt que d'engager la lecture.
    if (contenu.length > 8 * 1024 * 1024) return { error: 'fichier_trop_volumineux' };
    try { return { wb: XLSX.read(contenu, { type: 'buffer' }) }; }
    catch { return { error: 'parse_error' }; }
  }

  // Indicateurs — export (données), modèle (entêtes seules) et import
  function indicateursWorkbook(withData) {
    const wb = XLSX.utils.book_new();
    for (const { coll, sheet, scope } of IND_SHEETS) {
      const header = IND_HEADERS(scope);
      const body = withData
        ? getColl(coll)
            .slice()
            .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
            .map((r) => [
              r.code || '', r.label || '',
              ...(scope ? [refCode(scope.ref, r[scope.field]) || r[scope.field] || ''] : []),
              r.c1 || '', r.c2 || '', r.c3 || '',
            ])
        : [];
      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws['!cols'] = header.map((h) => ({ wch: /Critere|Label/.test(h) ? 60 : 16 }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(body.length, 1), c: header.length - 1 } }),
      };
      XLSX.utils.book_append_sheet(wb, ws, sheet);
    }
    return wb;
  }

  app.get(`${M}/indicateurs/export`, requireAuth, (req, res) => {
    sendWorkbook(res, indicateursWorkbook(true), 'indicateurs.xlsx');
  });
  app.get(`${M}/indicateurs/template`, requireAuth, (req, res) => {
    sendWorkbook(res, indicateursWorkbook(false), 'modele_indicateurs.xlsx');
  });

  app.post(`${M}/indicateurs/import`, requireAuth, (req, res) => {
    const { wb, error } = readUpload(req);
    if (error) return res.status(400).json({ error });
    const d = load();
    const stats = { added: 0, updated: 0, unchanged: 0, ignored: 0 };
    const detail = [];
    const errors = [];

    IND_SHEETS.forEach(({ coll, sheet, scope }, i) => {
      const wsName = wb.SheetNames.find((n) => n.toLowerCase() === sheet.toLowerCase()) || wb.SheetNames[i];
      const ws = wsName && wb.Sheets[wsName];
      if (!ws) return;
      d[coll] = d[coll] || [];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const seen = new Set();
      let a = 0; let u = 0; let s = 0;

      rows.forEach((raw, n) => {
        const line = n + 2;
        const get = (k) => String(raw[k] == null ? '' : raw[k]).trim();
        const code = normCode(get('Code'));
        const label = get('Label');
        if (!code && !label) return; // ligne vide
        if (!code) { errors.push(`${sheet} ligne ${line} : code manquant`); stats.ignored++; return; }
        if (seen.has(code)) { errors.push(`${sheet} ligne ${line} : code « ${code} » en doublon dans le fichier`); stats.ignored++; return; }
        seen.add(code);

        const item = { code, label, c1: get('Critere 1'), c2: get('Critere 2'), c3: get('Critere 3') };
        if (scope) {
          const raw2 = get(scope.col);
          const id = refId(scope.ref, raw2);
          if (raw2 && !id) { errors.push(`${sheet} ligne ${line} : ${scope.col} « ${raw2} » introuvable`); stats.ignored++; return; }
          item[scope.field] = id;
        }

        const existing = d[coll].find((r) => normCode(r.code) === code);
        if (!existing) {
          d[coll].push({ id: uid(), createdAt: new Date().toISOString(), actif: true, ordre: d[coll].length + 1, ...item });
          a++; stats.added++;
          return;
        }
        // Enregistrement inchangé : ignoré (aucune écriture, aucun horodatage)
        const changed = IND_FIELDS.filter((f) => (item[f] !== undefined) && String(existing[f] || '') !== String(item[f] || ''));
        if (!changed.length) { s++; stats.unchanged++; return; }
        Object.assign(existing, item, { updatedAt: new Date().toISOString() });
        u++; stats.updated++;
      });

      if (a || u || s) detail.push({ sheet, added: a, updated: u, unchanged: s });
    });

    if (stats.added || stats.updated) save(d);
    audit.log(req.user.username, 'PR_IMPORT_INDICATEURS', stats);
    res.json({ ok: true, ...stats, detail, errors });
  });

  // Évaluation — export des notes et import
  const EVAL_TYPES = [
    { key: 'notes_conf', coll: 'indicateurs_conf', sheet: 'Conformite', scoped: true },
    { key: 'notes_perf', coll: 'indicateurs_perf', sheet: 'Performance', scoped: false },
    { key: 'notes_comp', coll: 'indicateurs_complex', sheet: 'Complexite', scoped: false },
  ];

  app.get(`${M}/evaluations/:id/export-excel`, requireAuth, (req, res) => {
    const ev = getColl('evaluations').find((x) => x.id === req.params.id);
    if (!ev) return res.status(404).json({ error: 'not_found' });
    const sas = sharedSousActivites().filter((s) => s.secteur_id === ev.secteur_id);
    const wb = XLSX.utils.book_new();

    for (const t of EVAL_TYPES) {
      const inds = getColl(t.coll).filter((i) => i.actif !== false);
      const notes = ev[t.key] || {};
      const rows = [];
      if (t.scoped) {
        for (const sa of sas) {
          for (const ind of inds.filter((i) => !i.secteur_id || i.secteur_id === ev.secteur_id)) {
            rows.push({
              cle: `${sa.id}_${ind.id}`, sous_activite: sa.nom, code: ind.code || '',
              indicateur: ind.label || '', note: notes[`${sa.id}_${ind.id}`] || '',
            });
          }
        }
      } else {
        for (const ind of inds) {
          rows.push({ cle: ind.id, sous_activite: '', code: ind.code || '', indicateur: ind.label || '', note: notes[ind.id] || '' });
        }
      }
      const ws = XLSX.utils.json_to_sheet(rows, { header: ['cle', 'sous_activite', 'code', 'indicateur', 'note'] });
      XLSX.utils.book_append_sheet(wb, ws, t.sheet);
    }
    sendWorkbook(res, wb, `evaluation_${ev.id}.xlsx`);
  });

  app.post(`${M}/evaluations/:id/import-excel`, requireAuth, (req, res) => {
    const { wb, error } = readUpload(req);
    if (error) return res.status(400).json({ error });
    const d = load();
    const ev = (d.evaluations || []).find((x) => x.id === req.params.id);
    if (!ev) return res.status(404).json({ error: 'not_found' });
    if (['valide', 'soumis_directeur'].includes(ev.statut)) return res.status(409).json({ error: 'evaluation_verrouillee' });

    let updated = 0;
    for (const t of EVAL_TYPES) {
      const wsName = wb.SheetNames.find((n) => n.toLowerCase() === t.sheet.toLowerCase());
      if (!wsName) continue;
      ev[t.key] = ev[t.key] || {};
      for (const raw of XLSX.utils.sheet_to_json(wb.Sheets[wsName], { defval: '' })) {
        const cle = String(raw.cle || '').trim();
        const note = Number(raw.note);
        if (!cle || !Number.isFinite(note) || note < 0 || note > 3) continue;
        ev[t.key][cle] = note;
        updated++;
      }
    }
    ev.updatedAt = new Date().toISOString();
    save(d);
    audit.log(req.user.username, 'PR_IMPORT_EVALUATION', { id: ev.id, notes: updated });
    res.json({ ok: true, updated });
  });

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
    return des.every((u) =>
      Object.keys((pub.perf || {})[u] || {}).length > 0 &&
      Object.keys((pub.comp || {})[u] || {}).length > 0);
  };

  // Étapes « Notation » (désignation des évaluateurs) et « Soumission »
  // (toutes les notes publiées) : déduites de l'état, pas d'une route dédiée.
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
    return touched ? (updateIn('evaluations', rec.id, { etapes: e }) || rec) : rec;
  }

  // ── Workflow d'évaluation (repris de PESSCO) ──
  app.post(`${M}/evaluations/:id/soumettre-directeur`, requireAuth, (req, res) => {
    const cur = getColl('evaluations').find((x) => x.id === req.params.id);
    if (!cur) return res.status(404).json({ error: 'not_found' });
    const now = new Date().toISOString();
    const rec = updateIn('evaluations', req.params.id, {
      statut: 'soumis_directeur', soumis_le: now, soumis_par: req.user.username,
      etapes: etapesWith(cur, { soumission: cur.etapes?.soumission || now, acceptation: now }),
    });
    if (!rec) return res.status(404).json({ error: 'not_found' });
    audit.log(req.user.username, 'PR_SOUMISSION_DIRECTEUR', { id: rec.id });
    res.json(rec);
  });
  // Décisions du directeur. Chaque décision a son statut : « accepter » ouvre
  // la réunion prestataire, « cloturer » la verrouille, « valider » clôt le
  // circuit. Seuls « rejeter » et « renvoyer » interrompent ou renvoient.
  const DECISION_STATUT = {
    accepter: 'acceptee',
    cloturer: 'cloturee',
    valider: 'valide',
    approuve: 'valide',      // compatibilité ascendante
    renvoyer: 'renvoyee',
    rejeter: 'rejetee',
  };

  app.post(`${M}/evaluations/:id/decision-directeur`, requireAuth, (req, res) => {
    const body = req.body || {};
    const decision = String(body.decision || '').toLowerCase();
    const commentaire = body.commentaire || body.motif || '';
    const statut = DECISION_STATUT[decision];
    if (!statut) return res.status(400).json({ error: 'decision_inconnue', decision });

    const cur = getColl('evaluations').find((x) => x.id === req.params.id);
    if (!cur) return res.status(404).json({ error: 'not_found' });
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
      etapes: etapesWith(cur, ETAPE_DECISION[decision] || {}),
    };
    // La validation par le directeur est la date de validation de l'évaluation
    // (affichée dans « Évaluations validées », les archives et les rapports).
    if (statut === 'valide') patch.date_validation = now;
    // Renvoi : l'évaluation redevient modifiable par les évaluateurs
    if (decision === 'renvoyer') { patch.soumis_le = ''; patch.decide_le = ''; }

    const rec = updateIn('evaluations', req.params.id, patch);
    if (!rec) return res.status(404).json({ error: 'not_found' });
    audit.log(req.user.username, 'PR_DECISION_DIRECTEUR', { id: rec.id, decision, statut });
    res.json(rec);
  });
  app.post(`${M}/evaluations/:id/reevaluer`, requireAuth, (req, res) => {
    const src = getColl('evaluations').find((x) => x.id === req.params.id);
    if (!src) return res.status(404).json({ error: 'not_found' });
    // Réservé aux Gestionnaire / Validateur couvrant le domaine et le secteur
    if (!moduleRights.can('PLAN', req.user.username, 'VALIDATEUR', src.domaine_id || '', src.secteur_id || '')) {
      return res.status(403).json({ error: 'privilege_insuffisant' });
    }
    if (src.reevalue_le) return res.status(409).json({ error: 'reevaluation_deja_lancee' });
    // L'évaluation validée reste en place : elle demeure le profil de risque en
    // vigueur tant que la nouvelle n'est pas validée. On la marque seulement
    // comme réévaluée pour tracer le lien avec le nouveau cycle.
    // `id` retiré avant copie : le laisser à undefined écrasait l'identifiant
    // généré par createIn et rendait la nouvelle évaluation inexploitable.
    const { id: _srcId, ...srcData } = src;
    const clone = createIn('evaluations', {
      ...srcData, statut: 'brouillon', parent_id: src.id,
      cycle: (src.cycle || 1) + 1, createdAt: new Date().toISOString(), created_by: req.user.username,
      // Le nouveau cycle repart d'un circuit vierge
      soumis_le: '', soumis_par: '', decide_le: '', decide_par: '',
      decision_directeur: '', motif_decision: '', commentaire_directeur: '',
      date_revue_directeur: '', date_validation: '', etapes: {},
    });
    updateIn('evaluations', src.id, {
      reevalue_le: new Date().toISOString(), reevalue_par: req.user.username, enfant_id: clone.id,
    });
    audit.log(req.user.username, 'PR_REEVALUATION', { source: src.id, nouvelle: clone.id });
    res.json(clone);
  });

  // ── Contexte agrégé (chargement initial rapide) ──
  app.get(`${M}/context`, requireAuth, (req, res) => {
    const cfg = loadConfig();
    res.json({
      user: { ...auth.publicUser(req.user), role: roleM1(req.user), role_m1: 'M1_' + roleM1(req.user) },
      aac: cfg.aac || {},
      instance: cfg.instance,
      shared: {
        domaines: sharedDomaines(), secteurs: sharedSecteurs(),
        sousActivites: sharedSousActivites(), prestataires: sharedPrestataires(),
        indices: sharedIndices(),
      },
    });
  });
}

module.exports = { register, seed, COLLECTIONS, getColl, createIn, updateIn, deleteIn, riskProfiles };
