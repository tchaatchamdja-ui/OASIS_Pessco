// Module « Inspections d'aéronefs sur aire de trafic » — inspections et écarts.
//
// Une inspection porte l'acte : date, État, exploitant, aéronef,
// immatriculation, vol, nombre d'items inspectés et statut de suivi. Les écarts
// relevés lui sont rattachés.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const multipart = require('../../multipart');
const db = require('./store');
const R = require('./roles');
const instances = require('../../instances');
const suitesCare = require('../../suites_care');
const vues = require('./vues');
const { introuvable } = require('../../erreurs');

// Preuves des actions correctives : des fichiers, déposés hors de data/.
const DOSSIER_PREUVES = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'ramp', 'preuves',
);
const EXTENSIONS_PREUVES = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic',
  '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.zip'];
const TAILLE_PREUVE_MAX = 25 * 1024 * 1024;

// Champs du plan d'actions correctives, repris du suivi des PAC du module
// « Exécution de la Surveillance » et ramenés à ce qu'une inspection sur aire
// de trafic appelle : la cause, la correction immédiate, la mesure qui
// empêche la répétition, et les échéances de l'une et de l'autre.
const CHAMPS_PAC = ['cause_primaire', 'action_curative', 'curative_date_prevue',
  'actions_correctives', 'corrective_date_prevue',
  // Ce que l'inspecteur dit des preuves qu'il dépose.
  'commentaire_preuves'];

// Les six champs qui identifient une inspection. Deux lignes qui les partagent
// désignent la même inspection : c'est là-dessus que l'import reconnaît un
// doublon, comme le faisait `findFirst` sur ces mêmes clés dans RAMP.
const CLES = ['date', 'pays', 'exploitant', 'aeronef', 'immatriculation', 'vol'];

const CHAMPS_ECART = ['itemCode', 'stdRef', 'description', 'categorie', 'action', 'suivi'];

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const admin = (req) => R.isAdmin(req.user, referentiels);

  // Instance regardée : le poste d'AAC tenu, commun au portail et aux six
  // modules. Le choix suit le compte réellement connecté, non celui que la vue
  // Prestataire simule.
  const instanceCourante = (req) => instances.courante(req.userReel || req.user, loadConfig);

  const texte = (v) => String(v == null ? '' : v).trim();
  // Le séparateur est le caractère nul : il ne peut figurer dans une valeur
  // saisie, donc deux écarts distincts ne peuvent pas partager une empreinte.
  // Il s'écrit échappé — posé en clair dans le fichier, il le faisait passer
  // pour un binaire aux yeux des outils de recherche, qui n'en montraient
  // plus une seule ligne.
  const empreinte = (o) => CLES.map((k) => texte(o[k])).join('\u0000');

  // Une inspection ressort avec ses écarts : le front les affiche ensemble, et
  // la relation n'existe plus au stockage que par `inspection_id`.
  const avecEcarts = (inspections, ecarts) => {
    const parInspection = new Map();
    ecarts.forEach((e) => {
      if (!parInspection.has(e.inspection_id)) parInspection.set(e.inspection_id, []);
      parInspection.get(e.inspection_id).push(e);
    });
    return inspections.map((i) => ({ ...i, anomalies: parInspection.get(i.id) || [] }));
  };

  // ══════════════════════════════════════
  //  Lecture
  // ══════════════════════════════════════

  app.get(`${M}/inspections`, requireAuth, (req, res) => {
    // En vue Prestataire, la liste se réduit aux inspections de l'exploitant :
    // le cloisonnement est posé ici, non à l'écran.
    if (!R.canRead(req.userReel || req.user)) return refuser(res);
    const inspections = vues.filtrerInspections(req, db.list('inspections'), loadConfig).slice()
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    res.json(avecEcarts(inspections, db.list('ecarts')));
  });

  app.get(`${M}/inspections/:id`, requireAuth, (req, res) => {
    const i = db.get('inspections', req.params.id);
    if (!i || !vues.voitExploitant(req, i.exploitant)) {
      return introuvable(res, 'inspection');
    }
    res.json(avecEcarts([i], db.list('ecarts'))[0]);
  });

  // ══════════════════════════════════════
  //  Import
  // ══════════════════════════════════════
  // Le classeur est lu par le navigateur, qui envoie ici des inspections déjà
  // regroupées avec leurs écarts. Trois issues par ligne, comme dans RAMP :
  //   nouvelle    — aucune inspection ne partage ses six clés
  //   mise à jour — les six clés correspondent, le statut ou le nombre
  //                 d'items inspectés diffère
  //   doublon     — tout correspond ; la ligne est ignorée

  app.post(`${M}/inspections/import`, requireAuth, (req, res) => {
    if (!R.canContribute(req.user)) return refuser(res, "Non autorisé à importer");
    const lignes = (req.body || {}).data;
    if (!Array.isArray(lignes)) return res.status(400).json({ error: 'Aucune donnée à importer' });
    if (!lignes.length) return res.json({ creees: 0, majs: 0, doublons: 0, message: 'Rien à importer' });

    const etatsCouverts = (etat) => R.couvreEtat(req.user, referentiels, etat);
    const refuses = [...new Set(lignes.map((l) => texte(l.pays)).filter((p) => p && !etatsCouverts(p)))];
    if (refuses.length) {
      return refuser(res, `Import refusé pour : ${refuses.join(', ')} — hors de votre périmètre`);
    }

    const existantes = db.list('inspections');
    const index = new Map(existantes.map((i) => [empreinte(i), i]));

    const nouvellesInspections = [];
    const nouveauxEcarts = [];
    const majs = [];
    let doublons = 0;

    lignes.forEach((l) => {
      const cle = empreinte(l);
      const dejaVue = index.get(cle);
      const statut = texte(l.status) || 'Inconnu';
      const items = parseInt(l.itemsInspectes, 10) || 0;

      const refPoi = texte(l.poi_reference);

      if (dejaVue) {
        const statutChange = (dejaVue.status || 'Inconnu') !== statut;
        const itemsChanges = items > 0 && (dejaVue.itemsInspectes || 0) !== items;
        // Une référence POI apportée par le classeur complète l'inspection déjà
        // enregistrée ; elle n'en remplace jamais une existante.
        const refAjoutee = !!refPoi && !dejaVue.poi_reference;
        if (statutChange || itemsChanges || refAjoutee) {
          majs.push({
            id: dejaVue.id,
            ...(statutChange ? { status: statut } : {}),
            ...(itemsChanges ? { itemsInspectes: items } : {}),
            ...(refAjoutee ? { poi_reference: refPoi } : {}),
          });
        } else {
          doublons += 1;
        }
        return;
      }

      const id = db.uid('ins');
      const inspection = {
        id, status: statut, itemsInspectes: items,
        // L'instance qui importe l'inspection la tient : ses écarts, et les
        // carences que « Mesures d'Application » en tirera, la suivront.
        instance: instanceCourante(req),
        poi_reference: refPoi, date_creation: db.now(),
      };
      CLES.forEach((k) => { inspection[k] = texte(l[k]); });
      nouvellesInspections.push(inspection);
      // L'index accueille la nouvelle inspection : deux lignes identiques dans
      // le même classeur ne doivent pas produire deux inspections.
      index.set(cle, inspection);

      (l.anomalies || []).forEach((a) => {
        const e = { id: db.uid('eca'), inspection_id: id };
        CHAMPS_ECART.forEach((k) => { e[k] = texte(a[k]); });
        nouveauxEcarts.push(e);
      });
    });

    if (nouvellesInspections.length || nouveauxEcarts.length) {
      db.insertMany({ inspections: nouvellesInspections, ecarts: nouveauxEcarts });
    }
    majs.forEach((m) => {
      const { id, ...patch } = m;
      db.update('inspections', id, patch);
    });

    res.status(201).json({
      creees: nouvellesInspections.length,
      majs: majs.length,
      doublons,
      message: `${nouvellesInspections.length} inspection(s) créée(s), ${majs.length} mise(s) à jour, ${doublons} doublon(s) ignoré(s).`,
    });
  });

  // ══════════════════════════════════════
  //  Écriture à l'unité
  // ══════════════════════════════════════

  app.put(`${M}/inspections/:id`, requireAuth, (req, res) => {
    const i = db.get('inspections', req.params.id);
    if (!i) return introuvable(res, 'inspection');
    if (!R.canContribute(req.user)) return refuser(res);
    if (!R.couvreEtat(req.user, referentiels, i.pays)) {
      return refuser(res, `Inspection hors de votre périmètre (${i.pays})`);
    }
    const d = req.body || {};
    const patch = {};
    if (d.status !== undefined) patch.status = texte(d.status);
    if (d.itemsInspectes !== undefined) patch.itemsInspectes = parseInt(d.itemsInspectes, 10) || 0;
    if (!Object.keys(patch).length) return res.json({ status: 'ok' });
    db.update('inspections', i.id, patch);
    res.json({ status: 'ok' });
  });

  app.delete(`${M}/inspections/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, "Réservé au gestionnaire du module");
    const ecarts = db.list('ecarts').filter((e) => e.inspection_id === req.params.id);
    // Un écart repris par « Mesures d'Application » fonde ce qui y a été
    // décidé : l'inspection qui le porte ne se supprime plus.
    if (suitesCare.refusSiSuites(res, ecarts.map((e) => `ramp:${e.id}`))) return undefined;
    if (!db.removeInspection(req.params.id)) {
      return introuvable(res, 'inspection');
    }
    // Les preuves des écarts partent avec eux, comme celles d'une fiche : les
    // laisser sur le disque accumulerait des fichiers que plus rien ne désigne.
    ecarts.forEach((e) => (e.preuves || []).forEach((pj) => {
      try { fs.unlinkSync(path.join(DOSSIER_PREUVES, path.basename(pj.fichier || ''))); }
      catch (err) { /* le fichier a déjà disparu */ }
    }));
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Plan d'actions correctives d'un écart
  // ══════════════════════════════════════
  // L'exploitant répond à l'écart : ce qu'il a corrigé sur-le-champ, ce qu'il
  // engage pour que cela ne se reproduise pas, et à quelle échéance. Les
  // preuves suivent, au fil de la mise en œuvre.

  app.put(`${M}/ecarts/:id/pac`, requireAuth, (req, res) => {
    const e = db.get('ecarts', req.params.id);
    if (!e) return introuvable(res, 'ecart');
    if (!R.canContribute(req.user)) return refuser(res);
    const i = db.get('inspections', e.inspection_id) || {};
    if (!R.couvreEtat(req.user, referentiels, i.pays)) {
      return refuser(res, `Écart hors de votre périmètre (${i.pays || '—'})`);
    }
    const d = req.body || {};
    const pac = { ...(e.pac || {}) };
    CHAMPS_PAC.forEach((k) => { if (d[k] !== undefined) pac[k] = texte(d[k]); });
    // Soumettre fige la date et l'auteur ; enregistrer sans soumettre laisse
    // le plan en préparation.
    if (d.soumettre) {
      if (!texte(pac.action_curative) && !texte(pac.actions_correctives)) {
        return res.status(400).json({ error: 'Renseignez au moins une action avant de soumettre' });
      }
      pac.soumis_le = db.now();
      pac.soumis_par = req.user.username;
    }
    db.update('ecarts', e.id, {
      pac,
      // Le suivi de l'écart suit le plan : soumis, il n'est plus simplement
      // ouvert.
      ...(d.soumettre && !e.suivi ? { suivi: 'En cours' } : {}),
    });
    return res.json({ status: 'ok', soumis: !!pac.soumis_le });
  });

  // ══════════════════════════════════════
  //  Évaluation et suivi de l'écart (AAC)
  // ══════════════════════════════════════
  // Ce que l'autorité prononce sur le plan : l'accepte-t-elle, que constate-t-elle
  // au fil du suivi, la mise en œuvre est-elle effective. Repris du suivi des
  // PAC du module « Exécution de la Surveillance ».

  const evaluationDe = (e) => ({
    acceptation: { accepte: '', date: '', ...(e.evaluation || {}).acceptation },
    verification: { terrain: false, suivis: [], ...(e.evaluation || {}).verification },
    cloture: { effective: '', date_solde: '', solde_par: '', ...(e.evaluation || {}).cloture },
  });

  function ecartPourEvaluation(req, res) {
    const e = db.get('ecarts', req.params.id);
    if (!e) { introuvable(res, 'ecart'); return null; }
    // Se prononcer sur un plan relève du valideur, non de qui l'a rédigé.
    if (!R.canValidate(req.user)) { refuser(res, 'Réservé au valideur du module'); return null; }
    const i = db.get('inspections', e.inspection_id) || {};
    if (!R.couvreEtat(req.user, referentiels, i.pays)) {
      refuser(res, `Écart hors de votre périmètre (${i.pays || '—'})`);
      return null;
    }
    return e;
  }

  app.put(`${M}/ecarts/:id/evaluation`, requireAuth, (req, res) => {
    const e = ecartPourEvaluation(req, res);
    if (!e) return undefined;
    const d = req.body || {};
    const ev = evaluationDe(e);
    if (d.accepte !== undefined) ev.acceptation.accepte = d.accepte ? 'OUI' : '';
    if (d.date_acceptation !== undefined) ev.acceptation.date = texte(d.date_acceptation);
    if (d.verification_terrain !== undefined) ev.verification.terrain = !!d.verification_terrain;
    if (d.mise_oeuvre_effective !== undefined) ev.cloture.effective = d.mise_oeuvre_effective ? 'OUI' : '';
    if (d.date_solde !== undefined) ev.cloture.date_solde = texte(d.date_solde);
    if (d.solde_par !== undefined) ev.cloture.solde_par = texte(d.solde_par);

    // La clôture prononcée solde l'écart : son suivi le dit.
    const patch = { evaluation: ev };
    if (ev.cloture.effective === 'OUI') patch.suivi = 'Clôturé';
    else if (ev.acceptation.accepte === 'OUI' && (!e.suivi || e.suivi === 'Ouvert')) patch.suivi = 'En cours';
    db.update('ecarts', e.id, patch);
    return res.json({ status: 'ok', evaluation: ev });
  });

  app.post(`${M}/ecarts/:id/evaluation/suivi`, requireAuth, (req, res) => {
    const e = ecartPourEvaluation(req, res);
    if (!e) return undefined;
    const commentaire = texte((req.body || {}).texte);
    if (!commentaire) return res.status(400).json({ error: 'Commentaire vide' });
    const ev = evaluationDe(e);
    // Les suivis s'ajoutent, ne s'écrasent pas : chacun daté et signé.
    ev.verification.suivis = (ev.verification.suivis || []).concat([{
      id: db.uid('sui'), texte: commentaire,
      auteur: req.user.username, date: db.now(),
    }]);
    db.update('ecarts', e.id, { evaluation: ev });
    return res.status(201).json({ status: 'ok' });
  });

  // Le circuit de l'écart tient en deux temps : le plan se rédige et se soumet,
  // puis l'autorité le renvoie pour reprise ou solde l'écart.

  app.post(`${M}/ecarts/:id/pac/renvoyer`, requireAuth, (req, res) => {
    const e = ecartPourEvaluation(req, res);
    if (!e) return undefined;
    if (!((e.pac || {}).soumis_le)) return res.status(409).json({ error: 'Plan non soumis' });
    const ev = evaluationDe(e);
    if (ev.cloture.effective === 'OUI') return res.status(409).json({ error: 'Écart clôturé' });
    // Le plan repasse en rédaction ; la date de soumission tombe, le renvoi est
    // consigné pour que l'auteur sache ce qui est attendu.
    const pac = {
      ...(e.pac || {}), soumis_le: '', soumis_par: '',
      renvoye_le: db.now(), renvoye_par: req.user.username,
    };
    db.update('ecarts', e.id, { pac, suivi: 'En cours' });
    return res.json({ status: 'ok' });
  });

  app.post(`${M}/ecarts/:id/cloturer`, requireAuth, (req, res) => {
    const e = ecartPourEvaluation(req, res);
    if (!e) return undefined;
    if (!((e.pac || {}).soumis_le)) return res.status(409).json({ error: 'Plan non soumis' });
    const ev = evaluationDe(e);
    ev.cloture.effective = 'OUI';
    ev.cloture.date_solde = texte((req.body || {}).date_solde) || db.now().slice(0, 10);
    ev.cloture.solde_par = texte((req.body || {}).solde_par) || ev.cloture.solde_par || req.user.username;
    db.update('ecarts', e.id, { evaluation: ev, suivi: 'Clôturé' });
    return res.json({ status: 'ok', evaluation: ev });
  });

  // Un suivi reste amendable tant que le plan n'a pas été soumis : passé la
  // soumission, il fait partie du dossier et ne bouge plus.
  const suiviOuvert = (e) => !((e.pac || {}).soumis_le);

  app.put(`${M}/ecarts/:id/evaluation/suivi/:sid`, requireAuth, (req, res) => {
    const e = ecartPourEvaluation(req, res);
    if (!e) return undefined;
    if (!suiviOuvert(e)) return res.status(409).json({ error: 'Plan soumis : suivi figé' });
    const commentaire = texte((req.body || {}).texte);
    if (!commentaire) return res.status(400).json({ error: 'Commentaire vide' });
    const ev = evaluationDe(e);
    const cible = (ev.verification.suivis || []).find((x) => x.id === req.params.sid);
    if (!cible) return introuvable(res, 'suivi');
    ev.verification.suivis = ev.verification.suivis.map((x) => (x.id === cible.id
      ? { ...x, texte: commentaire, modifie_le: db.now(), modifie_par: req.user.username } : x));
    db.update('ecarts', e.id, { evaluation: ev });
    return res.json({ status: 'ok' });
  });

  app.delete(`${M}/ecarts/:id/evaluation/suivi/:sid`, requireAuth, (req, res) => {
    const e = ecartPourEvaluation(req, res);
    if (!e) return undefined;
    if (!suiviOuvert(e)) return res.status(409).json({ error: 'Plan soumis : suivi figé' });
    const ev = evaluationDe(e);
    const avant = (ev.verification.suivis || []).length;
    ev.verification.suivis = ev.verification.suivis.filter((x) => x.id !== req.params.sid);
    if (ev.verification.suivis.length === avant) return introuvable(res, 'suivi');
    db.update('ecarts', e.id, { evaluation: ev });
    return res.json({ status: 'ok' });
  });

  const preuve = (e, pid) => (e.preuves || []).find((x) => x.id === pid);

  function ecartPourPreuve(req, res) {
    const e = db.get('ecarts', req.params.id);
    if (!e) { introuvable(res, 'ecart'); return null; }
    if (!R.canContribute(req.user)) { refuser(res); return null; }
    const i = db.get('inspections', e.inspection_id) || {};
    if (!R.couvreEtat(req.user, referentiels, i.pays)) {
      refuser(res, `Écart hors de votre périmètre (${i.pays || '—'})`);
      return null;
    }
    return e;
  }

  app.post(`${M}/ecarts/:id/preuves`, requireAuth, multipart(), (req, res) => {
    const e = ecartPourPreuve(req, res);
    if (!e) return undefined;
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const ext = path.extname(f.filename || '').toLowerCase();
    if (!EXTENSIONS_PREUVES.includes(ext)) {
      return res.status(400).json({ error: `Type de fichier non autorisé (${EXTENSIONS_PREUVES.join(', ')})` });
    }
    if (f.buffer.length > TAILLE_PREUVE_MAX) {
      return res.status(400).json({ error: 'Fichier trop volumineux (25 Mo maximum)' });
    }
    fs.mkdirSync(DOSSIER_PREUVES, { recursive: true });
    const surDisque = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_PREUVES, surDisque), f.buffer);

    const d = req.body || {};
    const pj = {
      id: db.uid('prv'),
      // Une preuve se rattache à l'action qu'elle établit.
      // Trois rattachements : l'action curative, l'action corrective, ou les
      // preuves de mise en œuvre recueillies par l'autorité.
      action: ['curative', 'corrective', 'verification'].includes(texte(d.action))
        ? texte(d.action) : 'curative',
      intitule: texte(d.intitule) || f.filename,
      commentaire: texte(d.commentaire),
      nom_origine: f.filename, fichier: surDisque, taille: f.buffer.length,
      depose_par: req.user.username, depose_le: db.now(),
    };
    db.update('ecarts', e.id, { preuves: (e.preuves || []).concat([pj]) });
    return res.status(201).json({ status: 'ok', id: pj.id });
  });

  app.delete(`${M}/ecarts/:id/preuves/:pid`, requireAuth, (req, res) => {
    const e = ecartPourPreuve(req, res);
    if (!e) return undefined;
    const pj = preuve(e, req.params.pid);
    if (!pj) return introuvable(res, 'preuve');
    try { fs.unlinkSync(path.join(DOSSIER_PREUVES, path.basename(pj.fichier || ''))); }
    catch (err) { /* le fichier a déjà disparu */ }
    db.update('ecarts', e.id, { preuves: (e.preuves || []).filter((x) => x.id !== pj.id) });
    return res.json({ status: 'ok' });
  });

  app.get(`${M}/ecarts/:id/preuves/:pid/fichier`, requireAuth, (req, res) => {
    const e = db.get('ecarts', req.params.id);
    if (!e) return introuvable(res, 'ecart');
    const inspection = db.get('inspections', e.inspection_id) || {};
    if (!vues.voitExploitant(req, inspection.exploitant)) {
      return introuvable(res, 'ecart');
    }
    const pj = preuve(e, req.params.pid);
    if (!pj) return introuvable(res, 'preuve');
    const chemin = path.join(DOSSIER_PREUVES, path.basename(pj.fichier || ''));
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    res.setHeader('Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(pj.nom_origine || pj.fichier)}`);
    return res.sendFile(chemin);
  });

  // Suivi d'un écart : c'est la seule donnée que l'autorité renseigne après
  // l'import, les autres venant du classeur.
  app.put(`${M}/ecarts/:id`, requireAuth, (req, res) => {
    const e = db.get('ecarts', req.params.id);
    if (!e) return introuvable(res, 'ecart');
    if (!R.canContribute(req.user)) return refuser(res);
    const i = db.get('inspections', e.inspection_id) || {};
    if (!R.couvreEtat(req.user, referentiels, i.pays)) {
      return refuser(res, `Écart hors de votre périmètre (${i.pays || '—'})`);
    }
    db.update('ecarts', e.id, { suivi: texte((req.body || {}).suivi) });
    res.json({ status: 'ok' });
  });
};

module.exports.CLES = CLES;
