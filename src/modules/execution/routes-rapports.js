// Module « Exécution de la Surveillance » — rapports, tableau de bord,
// téléversements et suppressions administrateur.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const services = require('../../services');
const multipart = require('../../multipart');
const db = require('./store');
const refModele = require('./references');
const R = require('./roles');

// Les pièces jointes du module vivent hors de data/ : ce sont des fichiers,
// pas des enregistrements.
const DOSSIER_UPLOADS = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'execution',
);
const EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.csv'];

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;

  const refs = () => referentiels.getAll();

  // Éléments de composition des références, tirés du dossier ou du rapport.
  const contexteRefRapport = (d) => {
    const tous = refs();
    const aac = (typeof loadConfig === 'function' ? (loadConfig().aac || {}) : {});
    const prest = (tous.prestataires || []).find((x) => x.id === d.prestataire_id) || {};
    const secteur = (tous.secteurs || []).find((x) => x.id === (d.secteur_id || prest.secteur_id)) || {};
    const dom = (tous.domaines || []).find((x) => x.id === (d.domaine_id || prest.domaine_id || secteur.domaine_id)) || {};
    return {
      etat: String(aac.bigramme || aac.etat || aac.pays || '').slice(0, 3).toUpperCase(),
      domaine: String(dom.code || '').toUpperCase(),
      secteur: String(secteur.code || '').toUpperCase(),
      prestataire: String(prest.trigramme || '').toUpperCase(),
      annee: new Date().getFullYear(),
    };
  };
  const parId = (coll, id) => (refs()[coll] || []).find((x) => x.id === id) || null;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Non autorisé' });

  const perimetrePrestataire = (prestataireId) => {
    const p = parId('prestataires', prestataireId) || {};
    const s = parId('secteurs', p.secteur_id) || {};
    return { domaine_id: p.domaine_id || s.domaine_id || '', secteur_id: p.secteur_id || '', prestataire_id: prestataireId || '' };
  };

  // ══════════════════════════════════════
  //  Rapports
  // ══════════════════════════════════════
  const enrichirRapport = (r) => {
    const d = db.get('dossiers', r.dossier_id) || {};
    const n = db.get('notifications', d.notification_id) || {};
    const pr = parId('prestataires', d.prestataire_id || r.prestataire_id) || {};
    const s = parId('secteurs', pr.secteur_id) || {};
    const dom = parId('domaines', pr.domaine_id || s.domaine_id) || {};
    return {
      ...r,
      notification_id: d.notification_id || '',
      dossier_prestataire_id: d.prestataire_id || '',
      notification_ref: n.reference || '',
      prestataire_nom: pr.nom || '',
      prestataire_code: pr.trigramme || '',
      prestataire_domaine_id: dom.id || '',
      prestataire_domaine_code: dom.code || '',
      prestataire_domaine_nom: dom.nom || '',
    };
  };

  // Le titre est parfois porté par le JSON `contenu` ; on l'en extrait pour la
  // liste, dont on retire ce même contenu (volumineux, chargé au détail).
  const titreDe = (r) => {
    const c = r.contenu;
    if (typeof c === 'string' && c.includes('"titre"')) {
      try { return JSON.parse(c).titre || ''; } catch (e) { return ''; }
    }
    return r.titre || '';
  };

  app.get(`${M}/rapports`, requireAuth, (req, res) => {
    const prestataire = R.estPrestataire(req.user);
    const miens = R.prestatairesDe(req.user);
    if (prestataire && !miens.length) return res.json([]);

    let rows = db.list('rapports').map(enrichirRapport);
    if (prestataire) {
      rows = rows.filter((r) => miens.includes(r.dossier_prestataire_id) && r.statut === 'transmis');
    } else {
      // Hors prestataire, la visibilité suit les portées de droits SURV.
      rows = rows.filter((r) => R.privilege(req.user, r.prestataire_domaine_id, '')
        || R.meilleurPrivilege(req.user, referentiels));
    }
    if (req.query.statut) rows = rows.filter((r) => r.statut === req.query.statut);
    rows = rows.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    res.json(rows.map((r) => {
      const copie = { ...r, titre: titreDe(r) };
      delete copie.contenu;
      return copie;
    }));
  });

  app.get(`${M}/rapports/:id`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    const enrichi = enrichirRapport(r);
    if (R.estPrestataire(req.user)) {
      if (!R.accedeA(req.user, enrichi.dossier_prestataire_id || '') || r.statut !== 'transmis') {
        return refuser(res, 'Accès refusé à ce rapport');
      }
    }
    res.json(enrichi);
  });

  app.post(`${M}/rapports`, requireAuth, (req, res) => {
    const d = req.body || {};
    const dossier = db.get('dossiers', d.dossier_id || '');
    if (!dossier) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(dossier.prestataire_id), referentiels)) return refuser(res);
    const rec = db.insert('rapports', {
      id: db.uid('rpt'),
      reference: refModele.suivante('rapport', contexteRefRapport(req.body || {})),
      dossier_id: dossier.id,
      notification_id: dossier.notification_id || '',
      prestataire_id: dossier.prestataire_id || '',
      contenu: JSON.stringify({
        titre: d.titre || '', introduction: d.introduction || '', synthese: d.synthese || '',
        conclusion: d.conclusion || '', recommandations: d.recommandations || '', annexes: d.annexes || [],
      }),
      statut: 'brouillon',
      created_by: req.user.username,
      date_creation: db.now(),
    });
    res.status(201).json({ status: 'ok', id: rec.id, reference: rec.reference });
  });

  app.put(`${M}/rapports/:id/sign-inspector`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    db.update('rapports', r.id, { signe_par_inspecteur: req.user.username, date_signature_inspecteur: db.now() });
    res.json({ status: 'ok', signe_inspecteur: true });
  });

  app.put(`${M}/rapports/:id/sign-director`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) {
      return refuser(res, 'Non autorisé à signer en tant que directeur');
    }
    db.update('rapports', r.id, { signe_par_directeur: req.user.username, date_signature_directeur: db.now() });
    res.json({ status: 'ok', signe_directeur: true });
  });

  // Validation : le rapport reçoit la référence définitive du dossier.
  app.put(`${M}/rapports/:id/validate`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (r.statut !== 'soumis') return res.status(400).json({ error: 'Seul un rapport soumis peut être validé' });
    const dossier = db.get('dossiers', r.dossier_id) || {};
    const refFinale = dossier.final_reference
      || refModele.suivante('rapport_final', contexteRefRapport(dossier));
    // La date et l'auteur de la validation nourrissent l'historique de l'activité.
    db.update('rapports', r.id, {
      statut: 'valide', reference: refFinale,
      date_validation: db.now(), valide_par: req.user.username,
    });
    if (dossier.id) db.update('dossiers', dossier.id, { final_reference: refFinale, date_maj: db.now() });
    db.list('constatations')
      .filter((c) => c.dossier_id === r.dossier_id && c.statut === 'brouillon')
      .forEach((c) => db.update('constatations', c.id, { statut: 'ouvert' }));
    res.json({ status: 'ok', final_reference: refFinale });
  });

  // Amendement : un rapport validé repasse en rédaction.
  app.put(`${M}/rapports/:id/amend`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (r.statut !== 'valide') return res.status(400).json({ error: 'Seul un rapport validé peut être amendé' });
    const observations = (req.body || {}).observations || '';
    db.update('rapports', r.id, { statut: 'brouillon', observations_validation: observations });
    db.update('dossiers', r.dossier_id, {
      statut: 'brouillon', observations_retour: observations, date_maj: db.now(),
      redaction_closed: 0, current_step: 'redaction',
    });
    // La validation rendait les constatations opposables ; l'amendement les
    // remet en brouillon, le rapport qui les portait n'étant plus validé.
    // Celles qui ont déjà avancé (PAC engagé, soldées) ne sont pas touchées.
    db.list('constatations')
      .filter((c) => c.dossier_id === r.dossier_id && c.statut === 'ouvert')
      .forEach((c) => db.update('constatations', c.id, { statut: 'brouillon' }));
    res.json({ status: 'ok' });
  });

  app.put(`${M}/rapports/:id/apercu-comments`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    db.update('rapports', r.id, { commentaires_apercu: (req.body || {}).commentaires || '' });
    res.json({ status: 'ok' });
  });

  // Transmission : exige les deux signatures.
  app.put(`${M}/rapports/:id/transmit`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (!r.signe_par_inspecteur || !r.signe_par_directeur) {
      return res.status(400).json({ error: "Le rapport doit être signé par l'inspecteur et le directeur avant transmission" });
    }
    db.update('rapports', r.id, { statut: 'transmis', date_transmission: db.now(), transmis_par: req.user.username });
    db.list('constatations')
      .filter((c) => c.dossier_id === r.dossier_id && c.statut === 'brouillon')
      .forEach((c) => db.update('constatations', c.id, { statut: 'ouvert' }));
    res.json({ status: 'ok', statut: 'transmis' });
  });

  // Envoi simple, sans exigence de signature.
  app.put(`${M}/rapports/:id/send`, requireAuth, (req, res) => {
    const r = db.get('rapports', req.params.id);
    if (!r) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (r.statut !== 'valide') return res.status(400).json({ error: 'Seul un rapport validé peut être envoyé' });
    const maintenant = db.now();
    db.update('rapports', r.id, { statut: 'transmis', date_transmission: maintenant, transmis_par: req.user.username });
    if (r.dossier_id) db.update('dossiers', r.dossier_id, { date_maj: maintenant });
    res.json({ status: 'ok', statut: 'transmis' });
  });

  app.delete(`${M}/rapports/:id`, requireAuth, (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, 'Réservé aux administrateurs');
    if (!db.get('rapports', req.params.id)) return res.status(404).json({ error: 'Rapport non trouvé' });
    db.remove('rapports', req.params.id);
    res.json({ status: 'ok' });
  });

  // Une activité supprimée redevient « à notifier » : notification, dossier,
  // constatations et rapports associés disparaissent.
  app.delete(`${M}/activites/:id`, requireAuth, (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, 'Réservé aux administrateurs');
    const notif = db.list('notifications').find((n) => n.activite_id === req.params.id);
    if (notif) {
      const dossier = db.list('dossiers').find((d) => d.notification_id === notif.id);
      if (dossier) {
        db.removeWhere('constatations', (c) => c.dossier_id === dossier.id);
        db.removeWhere('rapports', (r) => r.dossier_id === dossier.id);
        db.remove('dossiers', dossier.id);
      }
      db.removeWhere('echanges', (e) => e.notification_id === notif.id);
      db.remove('notifications', notif.id);
    }
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Tableau de bord
  // ══════════════════════════════════════
  app.get(`${M}/dashboard-stats`, requireAuth, (req, res) => {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const debutAnnee = `${annee}-01-01`;
    const jour = (d) => d.toISOString().slice(0, 10);
    const aujourdhui = jour(maintenant);
    const dans30j = jour(new Date(maintenant.getTime() + 30 * 86400000));

    const prestataire = R.estPrestataire(req.user);
    const miens = R.prestatairesDe(req.user);
    if (prestataire && !miens.length) return res.json({});
    const mien = (r) => !prestataire || miens.includes(r.prestataire_id);

    const notifs = db.list('notifications').filter((n) => mien(n) && String(n.date_creation || '') >= debutAnnee);
    const dossiers = db.list('dossiers').filter(mien);
    const idsDossiers = new Set(dossiers.map((d) => d.id));
    const fnc = db.list('constatations').filter((c) => mien(c) || idsDossiers.has(c.dossier_id));
    const rapports = db.list('rapports')
      .filter((r) => (!prestataire || idsDossiers.has(r.dossier_id)) && String(r.date_creation || '') >= debutAnnee);

    // Activités planifiées : le module Planification reste la source.
    const plans = services.callOr('PLAN.plansValides', []);
    let activites = [];
    plans.forEach((p) => { activites = activites.concat((p.activites || []).map((a) => ({ ...a, annee: p.annee }))); });
    if (prestataire) activites = activites.filter((a) => miens.includes(a.prestataire_id));

    res.json({
      activites_ytd: activites.filter((a) => Number(a.annee) === annee).length,
      activites_a_venir_30j: activites.filter((a) => a.date_debut >= aujourdhui && a.date_debut <= dans30j).length,
      notifications_total: notifs.length,
      notifications_envoyees: notifs.filter((n) => n.statut === 'envoye').length,
      notifications_actees: notifs.filter((n) => n.statut === 'acte').length,
      dossiers_ouverts: dossiers.filter((d) => d.statut === 'ouvert').length,
      dossiers_clotures_ytd: dossiers.filter((d) => d.statut === 'cloture' && String(d.date_fin_execution || '') >= debutAnnee).length,
      fnc_ouvertes: fnc.filter((c) => ['ouverte', 'ouvert', 'pac_soumis', 'pac_rejetee'].includes(c.statut)).length,
      fnc_critiques: fnc.filter((c) => c.criticite === 'critique' && c.statut !== 'soldee').length,
      fnc_soldees_ytd: fnc.filter((c) => c.statut === 'soldee' && String(c.date_solde || '') >= debutAnnee).length,
      rapports_total_ytd: rapports.length,
      rapports_transmis_ytd: rapports.filter((r) => r.statut === 'transmis').length,
    });
  });

  // ══════════════════════════════════════
  //  Pièces jointes
  // ══════════════════════════════════════
  app.post(`${M}/upload`, requireAuth, multipart(), (req, res) => {
    if (!R.canContribute(req.user, null, referentiels)) return refuser(res);
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    if (!f.filename) return res.status(400).json({ error: 'Nom de fichier vide' });
    const ext = path.extname(f.filename).toLowerCase();
    if (!EXTENSIONS.includes(ext)) return res.status(400).json({ error: 'Type de fichier non autorisé' });
    fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
    const nom = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_UPLOADS, nom), f.buffer);
    res.status(201).json({
      status: 'ok', filename: f.filename,
      path: `/api/m/execution/uploads/${nom}`, size: f.buffer.length,
    });
  });

  app.get(`${M}/uploads/:fichier`, requireAuth, (req, res) => {
    const nom = path.basename(req.params.fichier);
    const chemin = path.join(DOSSIER_UPLOADS, nom);
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier non trouvé' });
    res.sendFile(chemin);
  });
};
