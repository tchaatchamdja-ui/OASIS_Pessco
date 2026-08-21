// Module « Exécution de la Surveillance » — états du parc d'activités.
//
// Trois besoins servis ici, tous tournés vers la surveillance du circuit
// plutôt que vers son exécution :
//   1. les délais du processus, qui fondent les alertes de retard ;
//   2. l'archivage des dossiers clôturés, qui sépare l'actif du révolu ;
//   3. les rappels adressés aux responsables d'une activité en attente.
const referentiels = require('../../referentiels');
const auth = require('../../auth');
const email = require('../../email');
const db = require('./store');
const R = require('./roles');
const refModele = require('./references');
const { valider } = require('../../valider');

// Délais du processus, en jours (sauf mention). Ils ne bloquent rien : ils
// disent à partir de quand une étape est en retard.
const DELAIS_DEFAUT = {
  notification_avant_activite: 30,
  validation_notification: 3,
  confirmation_prestataire: 7,
  redaction_rapport: 15,
  validation_rapport: 7,
  transmission_rapport: 5,
  archivage_apres_cloture: 30,
  horizon_a_declencher: 3,           // mois
};

function delais() {
  const enregistre = (db.list('parametres') || []).find((p) => p.id === 'delais') || {};
  return { ...DELAIS_DEFAUT, ...(enregistre.valeurs || {}) };
}

module.exports = function register(app, deps, M) {
  const { requireAuth } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const admin = (req) => R.isAdmin(req.user, referentiels);

  // Arrêter ou archiver une activité relève de l'administration : les rôles
  // portail SUPERADMIN et ADMIN (Admin AAC) seuls en disposent, et seulement
  // sur les domaines et secteurs de leur portée dans l'espace SURV.
  const roleReel = (req) => ((req.userReel || req.user || {}).role || '');
  const administreLeParc = (req) => ['SUPERADMIN', 'ADMIN'].includes(roleReel(req));
  const perimetreActivite = (n) => {
    const secteur = (referentiels.getAll().secteurs || []).find((s) => s.id === n.secteur_id) || {};
    return { domaine_id: n.domaine_id || secteur.domaine_id || '', secteur_id: n.secteur_id || '' };
  };
  // `true` si le compte administre le parc et couvre le domaine/secteur visé.
  const peutAdministrer = (req, n) => administreLeParc(req)
    && R.canValidate(req.user, perimetreActivite(n), referentiels);

  // ── Délais du processus ──
  app.get(`${M}/parametres/delais`, requireAuth, (req, res) => {
    res.json({ valeurs: delais(), defauts: DELAIS_DEFAUT, modifiable: admin(req) });
  });

  app.put(`${M}/parametres/delais`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Seul un administrateur modifie les délais');
    const recu = (req.body || {}).valeurs || req.body || {};
    const valeurs = {};
    Object.keys(DELAIS_DEFAUT).forEach((cle) => {
      const v = Number(recu[cle]);
      valeurs[cle] = Number.isFinite(v) && v >= 0 ? Math.round(v) : DELAIS_DEFAUT[cle];
    });
    const existant = (db.list('parametres') || []).find((p) => p.id === 'delais');
    const enregistrement = {
      id: 'delais', valeurs, date_maj: db.now(), maj_par: req.user.username,
    };
    if (existant) db.update('parametres', 'delais', enregistrement);
    else db.insert('parametres', enregistrement);
    res.json({ status: 'ok', valeurs });
  });

  // ── Composition des références (Paramètres → Autres paramètres) ──
  app.get(`${M}/parametres/references`, requireAuth, (req, res) => {
    res.json({
      modeles: refModele.modeles(),
      defauts: refModele.MODELES_DEFAUT,
      segments: Object.entries(refModele.SEGMENTS)
        .map(([cle, s]) => ({ cle, libelle: s.libelle, saisie: !!s.saisie, longueur: !!s.longueur })),
      modifiable: admin(req),
    });
  });

  app.put(`${M}/parametres/references`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Seul un administrateur compose les références');
    const recu = (req.body || {}).modeles || {};
    const modeles = {};
    Object.keys(refModele.MODELES_DEFAUT).forEach((type) => {
      const m = recu[type];
      if (!m || !Array.isArray(m.segments)) { modeles[type] = refModele.MODELES_DEFAUT[type]; return; }
      const segments = m.segments
        .filter((s) => s && refModele.SEGMENTS[s.type])
        .map((s) => {
          const seg = { type: s.type };
          if (refModele.SEGMENTS[s.type].saisie) seg.valeur = String(s.valeur || '').trim();
          if (s.type === 'numero') seg.longueur = Math.min(8, Math.max(1, Number(s.longueur) || 3));
          return seg;
        });
      // Une référence sans numéro d'ordre ne distinguerait plus deux objets.
      if (!segments.some((s) => s.type === 'numero')) segments.push({ type: 'numero', longueur: 3 });
      modeles[type] = { separateur: String(m.separateur === undefined ? '-' : m.separateur).slice(0, 3), segments };
    });
    const enregistrement = { id: 'references', modeles, date_maj: db.now(), maj_par: req.user.username };
    if ((db.list('parametres') || []).some((p) => p.id === 'references')) {
      db.update('parametres', 'references', enregistrement);
    } else {
      db.insert('parametres', enregistrement);
    }
    res.json({ status: 'ok', modeles });
  });

  // ── Archivage d'un dossier clôturé ──
  // Un dossier archivé quitte les affaires courantes ; ses pièces restent
  // consultables, rien n'est effacé. Les constatations (FNC, PAC) nées de
  // l'activité ne suivent pas : leur suivi se poursuit indépendamment, tant
  // qu'elles ne sont pas soldées.
  const basculerArchive = (archive) => (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    const notif = db.get('notifications', d.notification_id) || { secteur_id: d.secteur_id };
    if (!peutAdministrer(req, notif)) {
      return refuser(res, 'Archivage réservé au super-administrateur et à l’administrateur AAC, sur leur portée');
    }
    if (archive && d.statut !== 'cloture') {
      return res.status(400).json({ error: 'Seul un dossier clôturé peut être archivé' });
    }
    db.update('dossiers', d.id, {
      archive: archive ? 1 : 0,
      date_archivage: archive ? db.now() : '',
      archive_par: archive ? req.user.username : '',
      date_maj: db.now(),
    });
    res.json({ status: 'ok', archive: archive ? 1 : 0 });
  };
  app.put(`${M}/dossiers/:id/archiver`, requireAuth, basculerArchive(true));
  app.put(`${M}/dossiers/:id/desarchiver`, requireAuth, basculerArchive(false));

  // ── Activités en cours : arrêt, archivage, suppression ──
  // Un processus qui ne peut pas se poursuivre — activité annulée, prestataire
  // disparu, plan revu — est arrêté plutôt que laissé en suspens. Rien n'est
  // effacé : l'arrêt est un état, réversible, et l'activité s'archive ensuite.
  const notifDeLActivite = (id) => db.get('notifications', id)
    || db.list('notifications').find((n) => n.activite_id === id) || null;

  const A = `${M}/activites-en-cours`;

  app.put(`${A}/:id/arreter`, requireAuth, (req, res) => {
    const n = notifDeLActivite(req.params.id);
    if (!n) return res.status(404).json({ error: 'Activité non trouvée' });
    if (!peutAdministrer(req, n)) {
      return refuser(res, 'Arrêt réservé au super-administrateur et à l’administrateur AAC, sur leur portée');
    }
    const dossier = db.list('dossiers').find((d) => d.notification_id === n.id);
    if (dossier && dossier.statut === 'cloture') {
      return res.status(400).json({ error: 'Un dossier clôturé ne s’arrête pas' });
    }
    const maintenant = db.now();
    db.update('notifications', n.id, {
      arret: 1, motif_arret: (req.body || {}).motif || '',
      date_arret: maintenant, arrete_par: req.user.username,
    });
    if (dossier) {
      db.update('dossiers', dossier.id, {
        statut_avant_arret: dossier.statut, statut: 'arrete', date_maj: maintenant,
      });
    }
    res.json({ status: 'ok', arret: 1 });
  });

  app.put(`${A}/:id/reprendre`, requireAuth, (req, res) => {
    const n = notifDeLActivite(req.params.id);
    if (!n) return res.status(404).json({ error: 'Activité non trouvée' });
    if (!peutAdministrer(req, n)) {
      return refuser(res, 'Reprise réservée au super-administrateur et à l’administrateur AAC, sur leur portée');
    }
    db.update('notifications', n.id, { arret: 0, date_arret: '', arrete_par: '' });
    const dossier = db.list('dossiers').find((d) => d.notification_id === n.id);
    if (dossier && dossier.statut === 'arrete') {
      db.update('dossiers', dossier.id, {
        statut: dossier.statut_avant_arret || 'ouvert', statut_avant_arret: '', date_maj: db.now(),
      });
    }
    res.json({ status: 'ok', arret: 0 });
  });

  // Archivage d'une activité arrêtée : elle rejoint les activités archivées,
  // pièces comprises.
  const archiverActivite = (archive) => (req, res) => {
    const n = notifDeLActivite(req.params.id);
    if (!n) return res.status(404).json({ error: 'Activité non trouvée' });
    if (!peutAdministrer(req, n)) {
      return refuser(res, 'Archivage réservé au super-administrateur et à l’administrateur AAC, sur leur portée');
    }
    const dossier = db.list('dossiers').find((d) => d.notification_id === n.id);
    const arretee = Number(n.arret) === 1 || (dossier && dossier.statut === 'arrete');
    const close = dossier && dossier.statut === 'cloture';
    if (archive && !arretee && !close) {
      return res.status(400).json({ error: 'Seule une activité arrêtée ou clôturée s’archive' });
    }
    const maintenant = db.now();
    db.update('notifications', n.id, {
      archive: archive ? 1 : 0,
      date_archivage: archive ? maintenant : '',
      archive_par: archive ? req.user.username : '',
    });
    if (dossier) {
      db.update('dossiers', dossier.id, {
        archive: archive ? 1 : 0,
        date_archivage: archive ? maintenant : '',
        archive_par: archive ? req.user.username : '',
        date_maj: maintenant,
      });
    }
    res.json({ status: 'ok', archive: archive ? 1 : 0 });
  };
  app.put(`${A}/:id/archiver`, requireAuth, archiverActivite(true));
  app.put(`${A}/:id/desarchiver`, requireAuth, archiverActivite(false));

  // Suppression définitive : le super-administrateur du portail seul en
  // répond. Tout ce qui a été produit pour l'activité disparaît avec elle.
  app.delete(`${A}/:id`, requireAuth, (req, res) => {
    const reel = req.userReel || req.user;
    if (!reel || reel.role !== 'SUPERADMIN') {
      return refuser(res, 'Suppression réservée au super-administrateur');
    }
    const n = notifDeLActivite(req.params.id);
    if (!n) return res.status(404).json({ error: 'Activité non trouvée' });
    const dossier = db.list('dossiers').find((d) => d.notification_id === n.id);
    if (dossier) {
      db.removeWhere('constatations', (c) => c.dossier_id === dossier.id);
      db.removeWhere('rapports', (r) => r.dossier_id === dossier.id);
      db.remove('dossiers', dossier.id);
    }
    db.removeWhere('echanges', (e) => e.notification_id === n.id);
    db.removeWhere('rappels', (r) => r.notification_id === n.id);
    db.remove('notifications', n.id);
    res.json({ status: 'ok' });
  });

  // ── Rappels aux responsables ──
  app.get(`${M}/rappels`, requireAuth, (req, res) => {
    let rows = db.list('rappels');
    if (req.query.activite_id) rows = rows.filter((r) => r.activite_id === req.query.activite_id);
    res.json(rows.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))));
  });

  app.post(`${M}/rappels`, requireAuth, valider({
    destinataire: { type: 'texte', requis: true, max: 160 },
    objet: { type: 'texte', max: 200 },
    message: { type: 'texte', max: 4000 },
    motif: { type: 'texte', max: 200 },
    activite_id: { type: 'texte', max: 40 },
    notification_id: { type: 'texte', max: 40 },
    dossier_id: { type: 'texte', max: 40 },
  }), (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res);
    const d = req.body || {};
    const destinataire = String(d.destinataire || '').trim();
    if (!destinataire) return res.status(400).json({ error: 'Destinataire requis' });

    const utilisateur = auth.getUsers()
      .find((u) => u.username === destinataire || u.email === destinataire);
    const adresse = (utilisateur && utilisateur.email) || destinataire;
    const objet = d.objet || 'Activité de surveillance à déclencher';
    const corps = d.message || 'Une activité de surveillance appelle votre attention.';

    if (adresse.includes('@')) {
      email.queue({ to: adresse, subject: `[OASIS] ${objet}`, body: corps });
    }
    auth.notify(`Rappel adressé à ${adresse} — ${objet}`, 'info');

    const rec = db.insert('rappels', {
      id: db.uid('rap'),
      activite_id: d.activite_id || '',
      notification_id: d.notification_id || '',
      dossier_id: d.dossier_id || '',
      motif: d.motif || '',
      objet,
      message: corps,
      destinataire: adresse,
      envoye_par: req.user.username,
      date: db.now(),
    });
    res.status(201).json({ status: 'ok', id: rec.id, destinataire: adresse });
  });
};

