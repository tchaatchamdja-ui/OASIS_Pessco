// Module « Profils de Risque » — échanges Excel.
// Format du classeur (modèle AAC) : une feuille par type, colonnes en clair et
// portée désignée par le CODE du secteur / de la sous-activité, pas par un id.
const XLSX = require('xlsx');
const { asynchrone } = require('../../route');
const referentiels = require('../../referentiels');
const db = require('./store');
const D = require('./domaine');

const IND_SHEETS = [
  { coll: 'indicateurs_conf', sheet: 'Conformite', scope: { col: 'Secteur_ID', field: 'secteur_id', ref: 'secteurs' } },
  { coll: 'indicateurs_perf', sheet: 'Performance', scope: null },
  { coll: 'indicateurs_complex', sheet: 'Complexite', scope: { col: 'SousActivite_ID', field: 'sous_activite_id', ref: 'sous_activites' } },
];
const IND_HEADERS = (scope) => ['Code', 'Label', ...(scope ? [scope.col] : []), 'Critere 1', 'Critere 2', 'Critere 3'];
// Champs comparés pour détecter un enregistrement réellement modifié
const IND_FIELDS = ['label', 'c1', 'c2', 'c3', 'secteur_id', 'sous_activite_id'];

// Notes d'une évaluation : trois feuilles, la conformité seule est portée par
// sous-activité.
const EVAL_TYPES = [
  { key: 'notes_conf', coll: 'indicateurs_conf', sheet: 'Conformite', scoped: true },
  { key: 'notes_perf', coll: 'indicateurs_perf', sheet: 'Performance', scoped: false },
  { key: 'notes_comp', coll: 'indicateurs_complex', sheet: 'Complexite', scoped: false },
];

// Statuts qui ferment une évaluation aux notes : soumise au directeur, ou
// validée. Nommés parce que le verrou se vérifie désormais deux fois — avant
// pour répondre vite, et dans la transformation pour qu'il tienne.
const VERROUILLEE = ['valide', 'soumis_directeur'];

const refRows = (name) => referentiels.getAll()[name] || [];
const normCode = (v) => String(v == null ? '' : v).trim().toUpperCase();
const refCode = (name, id) => { const r = refRows(name).find((x) => x.id === id); return r ? r.code || '' : ''; };
const refId = (name, code) => {
  const c = normCode(code);
  if (!c) return '';
  const r = refRows(name).find((x) => normCode(x.code) === c)
    || refRows(name).find((x) => x.id === String(code).trim());
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
  try { return { wb: XLSX.read(contenu, { type: 'buffer' }) }; } catch { return { error: 'parse_error' }; }
}

// Indicateurs — export (données) ou modèle (entêtes seules).
//
// `for…of` et non `forEach` : le corps attend le magasin depuis qu'il vit en
// base, et `forEach` lancerait les trois feuilles sans les attendre — le
// classeur partirait vide.
async function indicateursWorkbook(withData) {
  const wb = XLSX.utils.book_new();
  for (const { coll, sheet, scope } of IND_SHEETS) {
    const header = IND_HEADERS(scope);
    const body = withData
      ? (await db.getColl(coll)).slice()
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

// Import d'une feuille d'indicateurs : ajoute, met à jour, ou laisse tel quel.
function importerFeuille(d, { coll, sheet, scope }, ws, stats, errors) {
  d[coll] = d[coll] || [];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const seen = new Set();
  let ajoutes = 0; let majs = 0; let inchanges = 0;

  rows.forEach((raw, n) => {
    const line = n + 2;
    const get = (k) => String(raw[k] == null ? '' : raw[k]).trim();
    const code = normCode(get('Code'));
    const label = get('Label');
    if (!code && !label) return; // ligne vide
    if (!code) { errors.push(`${sheet} ligne ${line} : code manquant`); stats.ignored += 1; return; }
    if (seen.has(code)) {
      errors.push(`${sheet} ligne ${line} : code « ${code} » en doublon dans le fichier`);
      stats.ignored += 1;
      return;
    }
    seen.add(code);

    const item = { code, label, c1: get('Critere 1'), c2: get('Critere 2'), c3: get('Critere 3') };
    if (scope) {
      const brut = get(scope.col);
      const id = refId(scope.ref, brut);
      if (brut && !id) {
        errors.push(`${sheet} ligne ${line} : ${scope.col} « ${brut} » introuvable`);
        stats.ignored += 1;
        return;
      }
      item[scope.field] = id;
    }

    const existing = d[coll].find((r) => normCode(r.code) === code);
    if (!existing) {
      d[coll].push({ id: db.uid(), createdAt: new Date().toISOString(), actif: true, ordre: d[coll].length + 1, ...item });
      ajoutes += 1; stats.added += 1;
      return;
    }
    // Enregistrement inchangé : ignoré (aucune écriture, aucun horodatage)
    const changed = IND_FIELDS.filter((f) => (item[f] !== undefined) && String(existing[f] || '') !== String(item[f] || ''));
    if (!changed.length) { inchanges += 1; stats.unchanged += 1; return; }
    Object.assign(existing, item, { updatedAt: new Date().toISOString() });
    majs += 1; stats.updated += 1;
  });

  return { ajoutes, majs, inchanges };
}

module.exports = function register(app, deps, M) {
  const { requireAuth, audit } = deps;

  // Mêmes gardes que le reste du module : un classeur n'est pas une porte
  // dérobée sur les notes ni sur la bibliothèque d'indicateurs.
  const lecture = (req, res, next) => (D.peutLire(req) ? next() : D.refus(res));
  const gerer = (req, res, next) => (D.peut(req, 'GESTIONNAIRE') ? next() : D.refus(res));
  const portee = (ev) => ({ domaine_id: (ev && ev.domaine_id) || '', secteur_id: (ev && ev.secteur_id) || '' });

  app.get(`${M}/indicateurs/export`, requireAuth, lecture, asynchrone(async (req, res) => {
    sendWorkbook(res, await indicateursWorkbook(true), 'indicateurs.xlsx');
  }));

  app.get(`${M}/indicateurs/template`, requireAuth, lecture, asynchrone(async (req, res) => {
    sendWorkbook(res, await indicateursWorkbook(false), 'modele_indicateurs.xlsx');
  }));

  // Un classeur d'indicateurs réécrit la bibliothèque entière : Gestionnaire.
  app.post(`${M}/indicateurs/import`, requireAuth, gerer, asynchrone(async (req, res) => {
    const { wb, error } = readUpload(req);
    if (error) return res.status(400).json({ error });
    // Le compte rendu est **remis à zéro à chaque essai** : la transformation
    // peut être rejouée si quelqu'un écrit entre-temps, et des compteurs
    // conservés rendraient « 24 ajouts » pour douze lignes.
    let stats = null;
    let detail = [];
    let errors = [];

    await db.transformer((d) => {
      stats = { added: 0, updated: 0, unchanged: 0, ignored: 0 };
      detail = [];
      errors = [];
      IND_SHEETS.forEach((feuille, i) => {
        const wsName = wb.SheetNames.find((n) => n.toLowerCase() === feuille.sheet.toLowerCase()) || wb.SheetNames[i];
        const ws = wsName && wb.Sheets[wsName];
        if (!ws) return;
        const { ajoutes, majs, inchanges } = importerFeuille(d, feuille, ws, stats, errors);
        if (ajoutes || majs || inchanges) {
          detail.push({ sheet: feuille.sheet, added: ajoutes, updated: majs, unchanged: inchanges });
        }
      });
      return (stats.added || stats.updated) ? d : db.INCHANGE;
    });

    await audit.log(req.user.username, 'PR_IMPORT_INDICATEURS', stats);
    return res.json({ ok: true, ...stats, detail, errors });
  }));

  // Évaluation — export des notes et import
  app.get(`${M}/evaluations/:id/export-excel`, requireAuth, asynchrone(async (req, res) => {
    const ev = await db.get('evaluations', req.params.id);
    if (!ev) return res.status(404).json({ error: 'not_found' });
    if (!D.peutLire(req, portee(ev))) return D.refus(res);
    const sas = D.sharedSousActivites().filter((s) => s.secteur_id === ev.secteur_id);
    const wb = XLSX.utils.book_new();

    // `for…of` : le corps attend le magasin, et `forEach` partirait sans lui.
    for (const t of EVAL_TYPES) {
      const inds = (await db.getColl(t.coll)).filter((i) => i.actif !== false);
      const notes = ev[t.key] || {};
      const rows = [];
      if (t.scoped) {
        sas.forEach((sa) => {
          inds.filter((i) => !i.secteur_id || i.secteur_id === ev.secteur_id).forEach((ind) => {
            rows.push({
              cle: `${sa.id}_${ind.id}`, sous_activite: sa.nom, code: ind.code || '',
              indicateur: ind.label || '', note: notes[`${sa.id}_${ind.id}`] || '',
            });
          });
        });
      } else {
        inds.forEach((ind) => rows.push({
          cle: ind.id, sous_activite: '', code: ind.code || '', indicateur: ind.label || '', note: notes[ind.id] || '',
        }));
      }
      const ws = XLSX.utils.json_to_sheet(rows, { header: ['cle', 'sous_activite', 'code', 'indicateur', 'note'] });
      XLSX.utils.book_append_sheet(wb, ws, t.sheet);
    }
    return sendWorkbook(res, wb, `evaluation_${ev.id}.xlsx`);
  }));

  app.post(`${M}/evaluations/:id/import-excel`, requireAuth, asynchrone(async (req, res) => {
    const { wb, error } = readUpload(req);
    if (error) return res.status(400).json({ error });
    const avant = await db.get('evaluations', req.params.id);
    if (!avant) return res.status(404).json({ error: 'not_found' });
    if (!D.peut(req, 'CONTRIBUTEUR', portee(avant))) return D.refus(res);
    if (VERROUILLEE.includes(avant.statut)) return res.status(409).json({ error: 'evaluation_verrouillee' });

    // Le verrou est **relu dans la transformation**, sur l'état que l'on va
    // écrire. Vérifié seulement avant, un classeur de notes parti au moment où le
    // directeur valide se posait sur une évaluation validée : les notes qui
    // fondent la décision changeaient après elle, et le profil servi à la
    // Planification n'était plus celui qui avait été arrêté.
    let updated = 0;
    let refus = '';
    await db.transformer((d) => {
      updated = 0; refus = '';
      const evs = d.evaluations || [];
      const i = evs.findIndex((x) => x.id === req.params.id);
      if (i < 0) { refus = 'not_found'; return db.INCHANGE; }
      if (VERROUILLEE.includes(evs[i].statut)) { refus = 'evaluation_verrouillee'; return db.INCHANGE; }
      const ev = { ...evs[i] };
      EVAL_TYPES.forEach((t) => {
        const wsName = wb.SheetNames.find((n) => n.toLowerCase() === t.sheet.toLowerCase());
        if (!wsName) return;
        ev[t.key] = { ...(ev[t.key] || {}) };
        XLSX.utils.sheet_to_json(wb.Sheets[wsName], { defval: '' }).forEach((raw) => {
          const cle = String(raw.cle || '').trim();
          const note = Number(raw.note);
          if (!cle || !Number.isFinite(note) || note < 0 || note > 3) return;
          ev[t.key][cle] = note;
          updated += 1;
        });
      });
      ev.updatedAt = new Date().toISOString();
      evs[i] = ev;
      d.evaluations = evs;
      return d;
    });
    if (refus === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (refus) return res.status(409).json({ error: refus });
    await audit.log(req.user.username, 'PR_IMPORT_EVALUATION', { id: req.params.id, notes: updated });
    return res.json({ ok: true, updated });
  }));
};
