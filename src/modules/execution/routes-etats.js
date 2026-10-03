// Module « Exécution de la Surveillance » — états du parc d'activités.
//
// Trois besoins servis ici, tous tournés vers la surveillance du circuit
// plutôt que vers son exécution :
//   1. les délais du processus, qui fondent les alertes de retard ;
//   2. l'archivage des dossiers clôturés, qui sépare l'actif du révolu ;
//   3. les rappels adressés aux responsables d'une activité en attente.
const referentiels = require('../../referentiels');
const { asynchrone } = require('../../route');
const auth = require('../../auth');
const email = require('../../email');
const db = require('./store');
const R = require('./roles');
const refModele = require('./references');
const instances = require('../../instances');
const suitesCare = require('../../suites_care');
const { valider } = require('../../valider');
const { introuvable, requis, reserve, refuser, statutRequis } = require('../../erreurs');

// Délais du processus, en jours (sauf mention). Ils ne bloquent rien : ils
// disent à partir de quand une étape est en retard.
// Relevé des points d'attente des deux processus du module : chaque clé
// correspond à un couple « date de départ enregistrée → événement attendu ».
// Deux attentes n'apparaissent pas ici parce que leur durée se règle ailleurs :
// le délai de solde d'une constatation vient du paramètre « Criticité », et
// l'échéance de chaque action du PAC est saisie action par action.
const DELAIS_DEFAUT = {
  // ── Processus Activité ──
  notification_avant_activite: 30,
  validation_notification: 3,
  confirmation_prestataire: 7,
  accuse_reception: 5,
  redaction_rapport: 15,
  validation_rapport: 7,
  transmission_rapport: 5,
  cloture_dossier: 10,
  archivage_apres_cloture: 30,
  // ── Processus Constatation ──
  soumission_constatation: 10,
  validation_constatation: 5,
  correction_constatation: 7,
  transmission_constatation: 5,
  // ── Plan d'actions correctives ──
  soumission_pac: 15,
  acceptation_pac: 7,
  correction_pac: 10,
  verification_cloture: 10,
  // ── Réglages de surveillance ──
  horizon_a_declencher: 3,           // mois
  seuil_vigilance: 15,
  seuil_urgence: 7,
};

async function delais() {
  const enregistre = ((await db.list('parametres')) || []).find((p) => p.id === 'delais') || {};
  return { ...DELAIS_DEFAUT, ...(enregistre.valeurs || {}) };
}

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;

  // Un geste groupé ne sort pas de l'instance regardée : archiver « toutes les
  // activités hors plan » depuis le poste d'un État ne range pas celles des
  // autres. Le choix suit le compte réellement connecté.
  const parInstance = (req, rangs) => instances.filtrer(rangs,
    instances.courante(req.userReel || req.user, loadConfig), loadConfig);
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
  app.get(`${M}/parametres/delais`, requireAuth, asynchrone(async (req, res) => {
    res.json({ valeurs: await delais(), defauts: DELAIS_DEFAUT, modifiable: admin(req) });
  }));

  app.put(`${M}/parametres/delais`, requireAuth, asynchrone(async (req, res) => {
    if (!admin(req)) return reserve(res, 'administrateurs');
    const recu = (req.body || {}).valeurs || req.body || {};
    const valeurs = {};
    Object.keys(DELAIS_DEFAUT).forEach((cle) => {
      const v = Number(recu[cle]);
      valeurs[cle] = Number.isFinite(v) && v >= 0 ? Math.round(v) : DELAIS_DEFAUT[cle];
    });
    const enregistrement = {
      id: 'delais', valeurs, date_maj: db.now(), maj_par: req.user.username,
    };
    // « Chercher, puis créer si absent » en une transformation : deux
    // enregistrements de délais parties ensemble en posaient deux, et la lecture
    // n'en rend qu'un — le second réglage devenait invisible.
    await db.transformer((etat) => {
      const liste = etat.parametres || [];
      const i = liste.findIndex((p) => p.id === 'delais');
      if (i >= 0) liste[i] = { ...liste[i], ...enregistrement };
      else liste.push(enregistrement);
      etat.parametres = liste;
      return etat;
    });
    return res.json({ status: 'ok', valeurs });
  }));

  // ── Composition des références (Paramètres → Autres paramètres) ──
  app.get(`${M}/parametres/references`, requireAuth, asynchrone(async (req, res) => {
    res.json({
      modeles: await refModele.modeles(),
      defauts: refModele.MODELES_DEFAUT,
      segments: Object.entries(refModele.SEGMENTS)
        .map(([cle, s]) => ({ cle, libelle: s.libelle, saisie: !!s.saisie, longueur: !!s.longueur })),
      modifiable: admin(req),
    });
  }));

  app.put(`${M}/parametres/references`, requireAuth, asynchrone(async (req, res) => {
    if (!admin(req)) return reserve(res, 'administrateurs');
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
    // Même geste unique. Et le `await` manquait ici : le garde-fou l'avait laissé
    // passer, sa parenthèse ouvrante masquant l'appel — c'est le balayage manuel
    // qui l'a trouvé, et la composition des références en dépend entièrement.
    await db.transformer((etat) => {
      const liste = etat.parametres || [];
      const i = liste.findIndex((p) => p.id === 'references');
      if (i >= 0) liste[i] = { ...liste[i], ...enregistrement };
      else liste.push(enregistrement);
      etat.parametres = liste;
      return etat;
    });
    return res.json({ status: 'ok', modeles });
  }));

  // ── Archivage d'un dossier clôturé ──
  // Un dossier archivé quitte les affaires courantes ; ses pièces restent
  // consultables, rien n'est effacé. Les constatations (FNC, PAC) nées de
  // l'activité ne suivent pas : leur suivi se poursuit indépendamment, tant
  // qu'elles ne sont pas soldées.
  // La fabrique rend un gestionnaire : c'est **lui** qui doit être enveloppé, et
  // non la fabrique — Express appelle le gestionnaire, et un rejet non pris
  // laisserait la requête ouverte sans erreur ni trace.
  const basculerArchive = (archive) => asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    const notif = await db.get('notifications', d.notification_id) || { secteur_id: d.secteur_id };
    if (!peutAdministrer(req, notif)) {
      return reserve(res, 'super_admin_aac');
    }
    if (archive && d.statut !== 'cloture') {
      return statutRequis(res, 'dossier', 'cloture');
    }
    await db.update('dossiers', d.id, {
      archive: archive ? 1 : 0,
      date_archivage: archive ? db.now() : '',
      archive_par: archive ? req.user.username : '',
      date_maj: db.now(),
    });
    return res.json({ status: 'ok', archive: archive ? 1 : 0 });
  });
  app.put(`${M}/dossiers/:id/archiver`, requireAuth, basculerArchive(true));
  app.put(`${M}/dossiers/:id/desarchiver`, requireAuth, basculerArchive(false));

  // ── Activités en cours : arrêt, archivage, suppression ──
  // Un processus qui ne peut pas se poursuivre — activité annulée, prestataire
  // disparu, plan revu — est arrêté plutôt que laissé en suspens. Rien n'est
  // effacé : l'arrêt est un état, réversible, et l'activité s'archive ensuite.
  const notifDeLActivite = async (id) => await db.get('notifications', id)
    || (await db.list('notifications')).find((n) => n.activite_id === id) || null;

  const A = `${M}/activites-en-cours`;

  app.put(`${A}/:id/arreter`, requireAuth, asynchrone(async (req, res) => {
    const n = await notifDeLActivite(req.params.id);
    if (!n) return introuvable(res, 'activite');
    if (!peutAdministrer(req, n)) {
      return reserve(res, 'super_admin_aac');
    }
    const dossier = (await db.list('dossiers')).find((d) => d.notification_id === n.id);
    if (dossier && dossier.statut === 'cloture') {
      return res.status(400).json({ error: 'Un dossier clôturé ne s’arrête pas' });
    }
    const maintenant = db.now();
    await db.update('notifications', n.id, {
      arret: 1, motif_arret: (req.body || {}).motif || '',
      date_arret: maintenant, arrete_par: req.user.username,
    });
    if (dossier) {
      await db.update('dossiers', dossier.id, {
        statut_avant_arret: dossier.statut, statut: 'arrete', date_maj: maintenant,
      });
    }
    res.json({ status: 'ok', arret: 1 });
  }));

  app.put(`${A}/:id/reprendre`, requireAuth, asynchrone(async (req, res) => {
    const n = await notifDeLActivite(req.params.id);
    if (!n) return introuvable(res, 'activite');
    if (!peutAdministrer(req, n)) {
      return reserve(res, 'super_admin_aac');
    }
    await db.update('notifications', n.id, { arret: 0, date_arret: '', arrete_par: '' });
    const dossier = (await db.list('dossiers')).find((d) => d.notification_id === n.id);
    if (dossier && dossier.statut === 'arrete') {
      await db.update('dossiers', dossier.id, {
        statut: dossier.statut_avant_arret || 'ouvert', statut_avant_arret: '', date_maj: db.now(),
      });
    }
    res.json({ status: 'ok', arret: 0 });
  }));

  // Archivage d'une activité arrêtée : elle rejoint les activités archivées,
  // pièces comprises.
  const archiverActivite = (archive) => asynchrone(async (req, res) => {
    const n = await notifDeLActivite(req.params.id);
    if (!n) return introuvable(res, 'activite');
    if (!peutAdministrer(req, n)) {
      return reserve(res, 'super_admin_aac');
    }
    const dossier = (await db.list('dossiers')).find((d) => d.notification_id === n.id);
    const arretee = Number(n.arret) === 1 || (dossier && dossier.statut === 'arrete');
    const close = dossier && dossier.statut === 'cloture';
    if (archive && !arretee && !close) {
      return statutRequis(res, 'activite', ['arrete', 'cloture']);
    }
    const maintenant = db.now();
    await db.update('notifications', n.id, {
      archive: archive ? 1 : 0,
      date_archivage: archive ? maintenant : '',
      archive_par: archive ? req.user.username : '',
    });
    if (dossier) {
      await db.update('dossiers', dossier.id, {
        archive: archive ? 1 : 0,
        date_archivage: archive ? maintenant : '',
        archive_par: archive ? req.user.username : '',
        date_maj: maintenant,
      });
    }
    return res.json({ status: 'ok', archive: archive ? 1 : 0 });
  });
  app.put(`${A}/:id/archiver`, requireAuth, archiverActivite(true));
  app.put(`${A}/:id/desarchiver`, requireAuth, archiverActivite(false));

  // Archivage groupé des activités hors plan — le pendant, pour « Autres
  // Activités », de l'archivage d'un plan de surveillance entier. La règle
  // « seule une activité arrêtée ou clôturée s'archive » ne s'applique pas
  // ici : ranger le porteur range ce qu'il porte, quel qu'en soit l'état.
  // Les constatations issues de ces activités ne sont pas touchées.
  app.put(`${A}/hors-plan-archiver`, requireAuth, asynchrone(async (req, res) => {
    const archive = req.body && req.body.archive === false ? 0 : 1;
    const lot = parInstance(req, await db.list('notifications')).filter((n) => n.hors_plan);
    if (!lot.length) return res.json({ status: 'ok', archive, nombre: 0 });
    const refuses = lot.filter((n) => !peutAdministrer(req, n));
    if (refuses.length) {
      return reserve(res, 'super_admin_aac');
    }
    const maintenant = db.now();
    const champs = {
      archive,
      date_archivage: archive ? maintenant : '',
      archive_par: archive ? req.user.username : '',
    };
    // Tout le lot d'un seul geste : c'était deux écritures par activité. Un
    // archivage de masse en laissait la moitié rangée et l'autre non, et l'écran
    // montrait les deux états mêlés.
    const ids = new Set(lot.map((n) => n.id));
    await db.transformer((etat) => {
      etat.notifications = (etat.notifications || [])
        .map((n) => (ids.has(n.id) ? { ...n, ...champs } : n));
      etat.dossiers = (etat.dossiers || [])
        .map((d) => (ids.has(d.notification_id) ? { ...d, ...champs, date_maj: maintenant } : d));
      return etat;
    });
    return res.json({ status: 'ok', archive, nombre: lot.length });
  }));

  // ── Réinitialisation d'une activité déclenchée ──────────────────────
  // L'activité revient à l'état « non déclenchée » : notification, dossier et
  // échanges disparaissent, la ligne du plan redevient déclenchable. Réservé
  // au Gestionnaire du module. Une activité qui a déjà produit des
  // constatations ou un rapport n'est pas réinitialisable : ces pièces
  // survivraient sans dossier, et le prestataire les a déjà reçues.
  app.put(`${A}/:id/reinitialiser`, requireAuth, asynchrone(async (req, res) => {
    const n = await notifDeLActivite(req.params.id);
    if (!n) return introuvable(res, 'activite');
    if (!R.isAdmin(req.user, referentiels)
      || !R.canValidate(req.user, perimetreActivite(n), referentiels)) {
      return reserve(res, 'gestionnaire_portee');
    }
    const dossier = (await db.list('dossiers')).find((d) => d.notification_id === n.id);
    if (dossier) {
      const constats = (await db.list('constatations')).filter((c) => c.dossier_id === dossier.id);
      const rapports = (await db.list('rapports')).filter((r) => r.dossier_id === dossier.id);
      if (constats.length || rapports.length) {
        return res.status(400).json({
          error: `Activité non réinitialisable : ${constats.length} constatation(s) et `
            + `${rapports.length} rapport(s) en dépendent`,
        });
      }
      // Sans constatation ni rapport, il peut rester des réponses de
      // checklist : elles partent avec le dossier.
      await db.removeDossier(dossier.id, req.user.username);
    }
    await db.removeWhere('echanges', (e) => e.notification_id === n.id);
    await db.removeWhere('rappels', (r) => r.notification_id === n.id);
    await db.remove('notifications', n.id);
    res.json({ status: 'ok' });
  }));

  // Suppression définitive : le super-administrateur du portail seul en
  // répond. Tout ce qui a été produit pour l'activité disparaît avec elle.
  app.delete(`${A}/:id`, requireAuth, asynchrone(async (req, res) => {
    const reel = req.userReel || req.user;
    if (!reel || reel.role !== 'SUPERADMIN') {
      return reserve(res, 'super_admin');
    }
    const n = await notifDeLActivite(req.params.id);
    if (!n) return introuvable(res, 'activite');
    const dossier = (await db.list('dossiers')).find((d) => d.notification_id === n.id);
    // Une constatation reprise par « Mesures d'Application » fonde ce qui y a
    // été décidé : l'activité qui la porte ne se supprime plus.
    const fncs = dossier ? (await db.list('constatations')).filter((c) => c.dossier_id === dossier.id).map((c) => c.id) : [];
    if (await suitesCare.refusSiSuites(res, suitesCare.clesSurv(fncs))) return undefined;
    if (dossier) await db.removeDossier(dossier.id, req.user.username);
    await db.removeWhere('echanges', (e) => e.notification_id === n.id);
    await db.removeWhere('rappels', (r) => r.notification_id === n.id);
    await db.remove('notifications', n.id);
    res.json({ status: 'ok' });
  }));

  // ── Rappels aux responsables ──
  app.get(`${M}/rappels`, requireAuth, asynchrone(async (req, res) => {
    let rows = await db.list('rappels');
    if (req.query.activite_id) rows = rows.filter((r) => r.activite_id === req.query.activite_id);
    res.json(rows.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))));
  }));

  app.post(`${M}/rappels`, requireAuth, valider({
    destinataire: { type: 'texte', requis: true, max: 160 },
    objet: { type: 'texte', max: 200 },
    message: { type: 'texte', max: 4000 },
    motif: { type: 'texte', max: 200 },
    activite_id: { type: 'texte', max: 40 },
    notification_id: { type: 'texte', max: 40 },
    dossier_id: { type: 'texte', max: 40 },
  }), asynchrone(async (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res);
    const d = req.body || {};
    const destinataire = String(d.destinataire || '').trim();
    if (!destinataire) return requis(res, 'destinataire');

    const utilisateur = auth.getUsers()
      .find((u) => u.username === destinataire || u.email === destinataire);
    const adresse = (utilisateur && utilisateur.email) || destinataire;
    const objet = d.objet || 'Activité de surveillance à déclencher';
    const corps = d.message || 'Une activité de surveillance appelle votre attention.';

    if (adresse.includes('@')) {
      email.queue({ to: adresse, subject: `[OASIS] ${objet}`, body: corps });
    }
    await auth.notify(`Rappel adressé à ${adresse} — ${objet}`, 'info');

    const rec = await db.insert('rappels', {
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
  }));
};

