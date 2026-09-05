// Module « Exécution de la Surveillance » — plans validés, notifications,
// échanges et accord (reprise intégrale des routes PESSCO).
const referentiels = require('../../referentiels');
const services = require('../../services');
const db = require('./store');
const refModele = require('./references');
const { valider } = require('../../valider');
const R = require('./roles');
const acteurs = require('./acteurs');
const transmission = require('./transmission');
const instances = require('../../instances');

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, loadConfig } = deps;

  const refs = () => referentiels.getAll();
  const parId = (coll, id) => (refs()[coll] || []).find((x) => x.id === id) || null;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Non autorisé' });

  // Instance regardée : les listes ne servent que ses activités. Le choix suit
  // le compte réellement connecté, non celui que la vue Prestataire simule.
  const instanceCourante = (req) => instances.courante(req.userReel || req.user, loadConfig);
  const parInstance = (req, rangs) => instances.filtrer(rangs, instanceCourante(req), loadConfig);

  // Domaine et secteur d'un prestataire : base des portées de droits.
  const perimetrePrestataire = (prestataireId) => {
    const p = parId('prestataires', prestataireId) || {};
    const s = parId('secteurs', p.secteur_id) || {};
    return { domaine_id: p.domaine_id || s.domaine_id || '', secteur_id: p.secteur_id || '', prestataire_id: prestataireId || '' };
  };

  // Restriction par processus : l'étape n'est franchie que par les
  // intervenants qui y sont désignés (voir acteurs.js pour les garde-fous).
  const contexteActivite = (n) => {
    const perim = perimetrePrestataire(n.prestataire_id);
    return {
      secteur_id: n.secteur_id || perim.secteur_id || '',
      domaine_id: n.domaine_id || perim.domaine_id || '',
      dossier: db.list('dossiers').find((d) => d.notification_id === n.id) || null,
    };
  };
  const refusProcessus = (req, res, n, cle) => {
    const motif = acteurs.refusEventuel(req.user, 'activite', contexteActivite(n), cle);
    if (!motif) return false;
    res.status(403).json({ error: motif });
    return true;
  };

  // ══════════════════════════════════════
  //  Plans validés (fournis par le module Planification)
  // ══════════════════════════════════════
  // Les activités déjà déclenchées (une notification existe pour elles ou
  // pour leur activité d'origine) sont écartées de la synchronisation et
  // remontées à part pour que l'interface les signale.
  app.get(`${M}/plans-valides`, requireAuth, (req, res) => {
    let scopePrest = null;
    if (R.estPrestataire(req.user)) {
      scopePrest = R.prestatairesDe(req.user);
      if (!scopePrest.length) return res.json([]);
    }

    const declenchees = new Set(db.list('notifications').map((n) => n.activite_id).filter(Boolean));
    const prestataires = refs().prestataires || [];
    const types = refs().types_supervision || [];

    // Les plans viennent de « Planification » avec l'instance qui les a
    // programmés : on ne déclenche que ceux de l'instance dont on tient le
    // poste. En vue régionale, tous.
    const plans = parInstance(req, services.callOr('PLAN.plansValides', []));
    const resultat = [];
    for (const p of plans) {
      let acts = (p.activites || []).map((a) => {
        const pr = prestataires.find((x) => x.id === a.prestataire_id) || {};
        const ts = types.find((x) => x.id === a.type_supervision_id) || {};
        return {
          ...a,
          plan_id: p.id,
          prestataire_nom: pr.nom || '',
          prestataire_code: pr.trigramme || '',
          type_supervision: ts.type_supervision || ts.libelle || '',
        };
      });
      if (scopePrest) acts = acts.filter((a) => scopePrest.includes(a.prestataire_id));

      const retenues = [];
      const exclues = [];
      acts.forEach((a) => {
        const parent = a.parent_activite_id || '';
        if (declenchees.has(a.id) || (parent && declenchees.has(parent))) {
          exclues.push({
            id: a.id,
            parent_activite_id: parent,
            reference: a.reference || a.titre || a.objet || a.id,
            titre: a.titre || a.objet || '',
            prestataire_nom: a.prestataire_nom || '',
            date_debut: a.date_debut || '',
            date_fin: a.date_fin || '',
          });
        } else {
          retenues.push(a);
        }
      });
      if (scopePrest && !retenues.length && !exclues.length) continue;
      resultat.push({ ...p, nb_activites: retenues.length, activites: retenues, excluded_activites: exclues });
    }
    res.json(resultat);
  });

  app.get(`${M}/plans-valides/:planId/activites`, requireAuth, (req, res) => {
    const plans = services.callOr('PLAN.plansValides', []);
    const plan = plans.find((p) => p.id === req.params.planId);
    if (!plan) return res.status(404).json({ error: 'Plan validé non trouvé' });
    const prestataires = refs().prestataires || [];
    const secteurs = refs().secteurs || [];
    const types = refs().types_supervision || [];
    res.json((plan.activites || []).map((a) => {
      const pr = prestataires.find((x) => x.id === a.prestataire_id) || {};
      const s = secteurs.find((x) => x.id === a.secteur_id) || {};
      const ts = types.find((x) => x.id === a.type_supervision_id) || {};
      return {
        ...a,
        prestataire_nom: pr.nom || '', prestataire_code: pr.trigramme || '',
        secteur_nom: s.nom || '', type_supervision: ts.type_supervision || ts.libelle || '',
      };
    }));
  });

  // ══════════════════════════════════════
  //  Notifications
  // ══════════════════════════════════════
  // Nom complet d'un compte, pour l'affichage des intervenants du circuit.
  const nomComplet = (username) => {
    if (!username) return '';
    const u = auth.getUsers().find((x) => x.username === username);
    if (!u) return username;
    return (u.fullName || `${u.prenom || ''} ${u.nom || ''}`.trim()) || username;
  };

  const enrichirNotif = (n) => {
    const pr = parId('prestataires', n.prestataire_id) || {};
    return {
      ...n,
      objet: n.objet_activite || '',
      prestataire_nom: pr.nom || '',
      prestataire_code: pr.trigramme || '',
      cree_par_nom: nomComplet(n.created_by),
      validateur_nom: nomComplet(n.validateur_id),
      envoye_par_nom: nomComplet(n.envoye_par),
    };
  };

  app.get(`${M}/notifications`, requireAuth, (req, res) => {
    let rows = parInstance(req, db.list('notifications'));
    // Un prestataire ne voit que ses notifications, une fois envoyées.
    if (R.estPrestataire(req.user)) {
      const miens = R.prestatairesDe(req.user);
      if (!miens.length) return res.json([]);
      rows = rows.filter((n) => miens.includes(n.prestataire_id) && n.statut === 'envoye');
    }
    if (req.query.statut) rows = rows.filter((n) => n.statut === req.query.statut);
    if (req.query.prestataire_id) rows = rows.filter((n) => n.prestataire_id === req.query.prestataire_id);
    rows = rows.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    res.json(rows.map(enrichirNotif));
  });

  app.get(`${M}/notifications/:id`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (R.estPrestataire(req.user)) {
      if (!R.accedeA(req.user, n.prestataire_id || '') || !['envoye', 'acte', 'cloture'].includes(n.statut)) {
        return refuser(res);
      }
    }
    // Alias de champs attendus par le formulaire PESSCO
    res.json({
      ...enrichirNotif(n),
      type_supervision: n.nature_activite || '',
      date_debut_prevue: n.date_activite || '',
      date_fin_prevue: n.date_fin_effective || '',
      lieu: n.lieu_activite || '',
      perimetre: n.perimetre_activite || '',
      fonction_responsable: n.prestataire_responsable_fonction || '',
      nom_responsable: n.prestataire_dirigeant_nom || '',
      interlocuteur: n.prestataire_interlocuteur || '',
      date_signature: n.date_edition || '',
      equipe: n.equipe_membres || [],
    });
  });

  // Éléments dont se compose une référence : État, domaine, secteur,
  // prestataire, année. Ils sont lus une fois, à la création.
  const contexteReference = (d) => {
    const tous = refs();
    const aac = (loadConfig().aac) || {};
    const perim = perimetrePrestataire(d.prestataire_id) || {};
    const secteur = (tous.secteurs || []).find((x) => x.id === (d.secteur_id || perim.secteur_id)) || {};
    const domaine = (tous.domaines || []).find((x) => x.id === (d.domaine_id || perim.domaine_id || secteur.domaine_id)) || {};
    const prestataire = (tous.prestataires || []).find((x) => x.id === d.prestataire_id) || {};
    return {
      // Code État : le bigramme du portail (Organisation → Détails sur
      // l'Administration), à défaut les premières lettres de l'État.
      etat: String(aac.bigramme || aac.etat || aac.pays || '').slice(0, 3).toUpperCase(),
      domaine: String(domaine.code || '').toUpperCase(),
      secteur: String(secteur.code || '').toUpperCase(),
      prestataire: String(prestataire.trigramme || '').toUpperCase(),
      annee: d.annee || new Date().getFullYear(),
    };
  };

  // Bornes des champs d'une notification : le reste du corps est ignoré.
  const SCHEMA_NOTIFICATION = {
    activite_id: { type: 'texte', max: 40 },
    plan_id: { type: 'texte', max: 40 },
    prestataire_id: { type: 'texte', max: 40 },
    secteur_id: { type: 'texte', max: 40 },
    domaine_id: { type: 'texte', max: 40 },
    objet: { type: 'texte', max: 300 },
    objet_activite: { type: 'texte', max: 300 },
    type_supervision: { type: 'texte', max: 80 },
    type_supervision_id: { type: 'texte', max: 40 },
    nature_activite: { type: 'texte', max: 80 },
    date_debut_prevue: { type: 'date' },
    date_fin_prevue: { type: 'date' },
    date_activite: { type: 'date' },
    date_fin_effective: { type: 'date' },
    lieu: { type: 'texte', max: 200 },
    lieu_activite: { type: 'texte', max: 200 },
    perimetre: { type: 'texte', max: 8000 },
    perimetre_activite: { type: 'texte', max: 8000 },
    programme: { type: 'liste', max: 200 },
    equipe: { type: 'liste', max: 100 },
    equipe_membres: { type: 'liste', max: 100 },
    fonction_responsable: { type: 'texte', max: 160 },
    nom_responsable: { type: 'texte', max: 160 },
    dirigeant: { type: 'texte', max: 160 },
    interlocuteur: { type: 'texte', max: 160 },
    interlocuteur_nom: { type: 'texte', max: 160 },
    interlocuteur_email: { type: 'texte', max: 160 },
    referentiels: { type: 'texte', max: 4000 },
    documents_requis: { type: 'texte', max: 4000 },
    fait_a: { type: 'texte', max: 120 },
    date_signature: { type: 'date' },
    signataire: { type: 'texte', max: 160 },
    hors_plan: { type: 'booleen' },
    annee: { type: 'entier', min: 2000, max: 2100 },
  };

  app.post(`${M}/notifications`, requireAuth, valider(SCHEMA_NOTIFICATION), (req, res) => {
    const d = req.body || {};
    const perim = perimetrePrestataire(d.prestataire_id);
    if (!R.canContribute(req.user, perim, referentiels)) return refuser(res);
    const rec = db.insert('notifications', {
      id: db.uid('notif'),
      // Composition définie dans Paramètres → Autres paramètres.
      reference: refModele.suivante('notification', contexteReference(d)),
      // L'instance sous laquelle l'activité est notifiée : c'est elle qui la
      // verra ensuite, ainsi que le dossier et les constatations qui en
      // naîtront.
      instance: instanceCourante(req),
      activite_id: d.activite_id || '',
      plan_id: d.plan_id || '',
      prestataire_id: d.prestataire_id || '',
      objet_activite: d.objet || d.objet_activite || '',
      nature_activite: d.type_supervision || d.nature_activite || '',
      type_supervision_id: d.type_supervision_id || '',
      date_activite: d.date_debut_prevue || d.date_activite || '',
      date_fin_effective: d.date_fin_prevue || d.date_fin_effective || '',
      lieu_activite: d.lieu || d.lieu_activite || '',
      perimetre_activite: d.perimetre || d.perimetre_activite || '',
      programme: d.programme || [],
      equipe_membres: d.equipe || d.equipe_membres || [],
      prestataire_responsable_fonction: d.fonction_responsable || '',
      prestataire_dirigeant_nom: d.nom_responsable || d.dirigeant || '',
      prestataire_interlocuteur: d.interlocuteur || '',
      interlocuteur_nom: d.interlocuteur_nom || '',
      interlocuteur_email: d.interlocuteur_email || '',
      referentiels: d.referentiels || '',
      documents_requis: d.documents_requis || '',
      fait_a: d.fait_a || '',
      date_edition: d.date_signature || '',
      signataire: d.signataire || '',
      secteur_id: d.secteur_id || perim.secteur_id || '',
      // Activité déclenchée hors plan de surveillance : elle porte elle-même
      // son année, son domaine et son secteur, faute d'activité planifiée.
      hors_plan: !!d.hors_plan,
      annee: d.annee || '',
      domaine_id: d.domaine_id || perim.domaine_id || '',
      statut: 'brouillon',
      created_by: req.user.username,
      date_creation: db.now(),
    });
    res.status(201).json({ status: 'ok', id: rec.id, reference: rec.reference });
  });

  // Correspondance des noms de champs du formulaire vers ceux du modèle
  const CHAMPS = {
    objet: 'objet_activite',
    type_supervision: 'nature_activite',
    date_debut_prevue: 'date_activite',
    date_fin_prevue: 'date_fin_effective',
    lieu: 'lieu_activite',
    perimetre: 'perimetre_activite',
    date_signature: 'date_edition',
    equipe: 'equipe_membres',
    fonction_responsable: 'prestataire_responsable_fonction',
    nom_responsable: 'prestataire_dirigeant_nom',
    interlocuteur: 'prestataire_interlocuteur',
  };
  const FIGES = ['id', 'reference', 'activite_id', 'plan_id', 'hors_plan'];

  app.put(`${M}/notifications/:id`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    const patch = {};
    Object.entries(req.body || {}).forEach(([k, v]) => {
      const cle = CHAMPS[k] || k;
      if (!FIGES.includes(cle)) patch[cle] = v;
    });
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    db.update('notifications', req.params.id, patch);
    res.json({ status: 'ok' });
  });

  // ── Circuit : brouillon → soumis → validé → envoyé → acté ──
  app.put(`${M}/notifications/:id/submit`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    if (n.statut !== 'brouillon') return res.status(400).json({ error: 'Seule une notification en brouillon peut être soumise' });
    if (refusProcessus(req, res, n, 'notification:soumission')) return undefined;
    db.update('notifications', n.id, {
      statut: 'soumis', date_soumission: db.now(), validateur_id: (req.body || {}).validateur_id || '',
    });
    res.json({ status: 'ok', statut: 'soumis' });
  });

  app.put(`${M}/notifications/:id/validate`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canValidate(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à valider');
    if (n.statut !== 'soumis') return res.status(400).json({ error: 'Seule une notification soumise peut être validée' });
    if (refusProcessus(req, res, n, 'notification:validation')) return undefined;
    db.update('notifications', n.id, { statut: 'valide', validateur_id: req.user.username, date_validation: db.now() });
    res.json({ status: 'ok', statut: 'valide' });
  });

  app.put(`${M}/notifications/:id/reject`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canValidate(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à rejeter');
    if (n.statut !== 'soumis') return res.status(400).json({ error: 'Seule une notification soumise peut être rejetée' });
    if (refusProcessus(req, res, n, 'notification:validation')) return undefined;
    db.update('notifications', n.id, { statut: 'brouillon', motif_rejet: (req.body || {}).motif || '', date_rejet: db.now() });
    res.json({ status: 'ok', statut: 'brouillon' });
  });

  app.put(`${M}/notifications/:id/send`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    if (n.statut !== 'valide') return res.status(400).json({ error: 'Seule une notification validée peut être envoyée' });
    if (refusProcessus(req, res, n, 'notification:transmission')) return undefined;
    db.update('notifications', n.id, { statut: 'envoye', date_envoi: db.now(), envoye_par: req.user.username });
    // Les comptes du prestataire à qui la réception des courriels a été
    // confiée en sont avertis ; l'absence de destinataire n'arrête rien.
    transmission.avertirPrestataire(n.prestataire_id, {
      objet: `Notification d'activité ${n.reference || ''} — ${n.objet_activite || ''}`.trim(),
      message: `Une notification d'activité de surveillance vous a été adressée.\n\n`
        + `Référence : ${n.reference || ''}\n`
        + `Objet : ${n.objet_activite || ''}\n`
        + `Période annoncée : du ${n.date_activite || '—'} au ${n.date_fin_effective || '—'}\n\n`
        + "Elle est consultable dans OASIS, menu « Notification d'activité ».",
      origine: 'notification_envoyee',
      reference: n.reference || '',
      journal: { notification_id: n.id },
    });
    res.json({ status: 'ok', statut: 'envoye' });
  });

  app.delete(`${M}/notifications/:id`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (n.statut !== 'brouillon') return res.status(400).json({ error: 'Seul un brouillon peut être supprimé' });
    if (n.created_by !== req.user.username && !R.isAdmin(req.user, referentiels)) {
      return refuser(res, "Seul l'initiateur peut supprimer ce brouillon");
    }
    db.removeWhere('echanges', (e) => e.notification_id === n.id);
    db.remove('notifications', n.id);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/notifications/:id/cancel`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    db.update('notifications', n.id, {
      statut: 'brouillon', motif_rejet: (req.body || {}).motif || 'Annulation', date_rejet: db.now(),
    });
    res.json({ status: 'ok', statut: 'brouillon' });
  });

  // ══════════════════════════════════════
  //  Échanges (négociation avec le prestataire)
  // ══════════════════════════════════════
  app.get(`${M}/notifications/:id/echanges`, requireAuth, (req, res) => {
    const users = auth.getUsers();
    const rows = db.list('echanges')
      .filter((e) => e.notification_id === req.params.id)
      .sort((a, b) => String(a.date_creation || '').localeCompare(String(b.date_creation || '')))
      .map((e) => {
        const u = users.find((x) => x.username === e.auteur_id) || {};
        return { ...e, auteur_nom: u.nom || '', auteur_prenom: u.prenom || '' };
      });
    res.json(rows);
  });

  app.post(`${M}/notifications/:id/echanges`, requireAuth, (req, res) => {
    // Côté prestataire, échanger avec l'Autorité est un droit confié.
    if (!R.compteA(req.user, 'echanges', auth)) return refuser(res, 'Droit non confié à ce compte');
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    const d = req.body || {};
    const rec = db.insert('echanges', {
      id: db.uid('ech'),
      notification_id: n.id,
      auteur_id: req.user.username,
      auteur_type: R.estPrestataire(req.user) ? 'prestataire' : 'aac',
      type_message: d.type_message || 'message',
      contenu: d.contenu || '',
      pieces_jointes: d.pieces_jointes || [],
      date_creation: db.now(),
    });
    // Un message de l'Autorité est signalé au prestataire ; ses propres
    // messages n'ont pas à lui être renvoyés.
    if (!R.estPrestataire(req.user)) {
      transmission.avertirPrestataire(n.prestataire_id, {
        objet: `Échange — notification ${n.reference || ''}`.trim(),
        message: "L'Autorité vous a adressé un message au sujet de la notification "
          + `${n.reference || ''} (${n.objet_activite || ''}).\n\n`
          + "Il est consultable dans OASIS, formulaire d'échange de la notification.",
        origine: 'echange_notification',
        reference: n.reference || '',
        journal: { notification_id: n.id },
      });
    }
    res.status(201).json({ status: 'ok', id: rec.id });
  });

  // ── Accusé de réception, côté prestataire ───────────────────────────
  // Le prestataire acte qu'il a reçu la notification et se dit prêt à
  // recevoir l'équipe aux dates et sur le périmètre annoncés. L'accusé est
  // porté par la notification — il s'imprime au bas de la fiche — et déposé
  // en même temps dans le fil de discussion, où l'Autorité le lira.
  // Le fil de discussion se lit, il ne s'analyse pas : les dates y passent au
  // format du prestataire, pas en ISO.
  const enClair = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
  };

  app.post(`${M}/notifications/:id/accuser-reception`, requireAuth, (req, res) => {
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.estPrestataire(req.user)) {
      return refuser(res, 'Accusé de réception réservé au prestataire notifié');
    }
    if (!R.accedeA(req.user, n.prestataire_id || '')) return refuser(res);
    if (n.statut !== 'envoye') {
      return res.status(400).json({ error: 'La notification n’est pas au stade de la réception' });
    }
    if (Number(n.accuse_reception) === 1) {
      return res.status(400).json({ error: 'Réception déjà accusée' });
    }
    const debut = n.date_debut_effective || n.date_debut_prevue || n.date_activite || '';
    const fin = n.date_fin_effective || n.date_fin_prevue || '';
    const perimetre = n.perimetre_activite || n.perimetre || '';
    const maintenant = db.now();
    db.update('notifications', n.id, {
      accuse_reception: 1,
      accuse_le: maintenant,
      accuse_par: req.user.username,
      // Le nom est figé ici : la fiche doit rester lisible même si le compte
      // est renommé ou désactivé plus tard.
      accuse_par_nom: nomComplet(req.user.username) || req.user.fullName || req.user.username,
      accuse_date_debut: debut,
      accuse_date_fin: fin,
      accuse_perimetre: perimetre,
    });
    // Le message reprend mot pour mot le libellé de l'accusé : le fil de
    // discussion et la fiche disent la même chose.
    db.insert('echanges', {
      id: db.uid('ech'),
      notification_id: n.id,
      auteur_id: req.user.username,
      auteur_type: 'prestataire',
      type_message: 'accuse_reception',
      contenu: `Nous accusons réception de la notification et sommes disposés à vous recevoir `
        + `du ${enClair(debut)} au ${enClair(fin)} dans le cadre de la supervision `
        + `des activités suivantes : ${perimetre}`,
      pieces_jointes: [],
      date_creation: maintenant,
    });
    res.json({ status: 'ok', accuse_le: maintenant });
  });

  // ══════════════════════════════════════
  //  Accord : envoyé → acté, et ouverture du dossier d'exécution
  // ══════════════════════════════════════
  // Enregistrement de l'étape Confirmation sans la franchir : dates confirmées
  // et périmètre validé sont sauvegardés, la notification reste « envoyée ».
  // Les dates retenues deviennent celles de l'activité — c'est le sens même de
  // la confirmation, et le calendrier comme les états les lisent là.
  app.put(`${M}/notifications/:id/accord`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, "Action réservée à l'AAC");
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    if (!['envoye', 'acte'].includes(n.statut)) {
      return res.status(400).json({ error: 'La confirmation n’est pas ouverte à ce stade' });
    }
    const d = req.body || {};
    const patch = { date_maj: db.now() };
    if (d.date_debut_effective !== undefined) {
      patch.date_debut_effective = d.date_debut_effective;
      // La date de l'activité suit la date confirmée : sans cela, les écrans
      // qui lisent `date_activite` continueraient d'annoncer l'ancienne.
      patch.date_activite = d.date_debut_effective || n.date_activite || '';
    }
    if (d.date_fin_effective !== undefined) patch.date_fin_effective = d.date_fin_effective;
    if (d.perimetre_valide !== undefined) patch.perimetre_valide = d.perimetre_valide;
    db.update('notifications', n.id, patch);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/notifications/:id/validate-accord`, requireAuth, (req, res) => {
    if (R.estPrestataire(req.user)) return refuser(res, "Action réservée à l'AAC");
    const n = db.get('notifications', req.params.id);
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    const perim = perimetrePrestataire(n.prestataire_id);
    if (!R.canContribute(req.user, perim, referentiels)) return refuser(res);
    if (n.statut !== 'envoye') return res.status(400).json({ error: "Seule une notification envoyée peut passer en 'acté'" });
    if (refusProcessus(req, res, n, 'confirmation')) return undefined;

    const d = req.body || {};
    const maintenant = db.now();

    // Référence d'activité : composition définie dans les paramètres.
    const refActivite = refModele.suivante('activite', contexteReference({
      prestataire_id: n.prestataire_id, secteur_id: n.secteur_id, domaine_id: perim.domaine_id,
      annee: n.annee || new Date().getFullYear(),
    }));

    const dateDebut = d.date_debut_effective || n.date_activite || '';
    const dateFin = d.date_fin_effective || '';
    db.update('notifications', n.id, {
      statut: 'acte',
      date_debut_effective: dateDebut,
      date_fin_effective: dateFin,
      date_accord: maintenant,
      reference_activite: refActivite,
      perimetre_valide: d.perimetre_valide || n.perimetre_activite || '',
    });

    // Ouverture automatique du dossier : l'étape « réalisation » démarre.
    const dossier = db.insert('dossiers', {
      id: db.uid('dossier'),
      reference: refModele.suivante('dossier', contexteReference(n)),
      notification_id: n.id,
      activite_id: n.activite_id || '',
      plan_id: n.plan_id || '',
      prestataire_id: n.prestataire_id || '',
      date_debut_execution: dateDebut,
      date_fin_execution: dateFin,
      equipe: [], checklists: [], annexes: [],
      introduction: '',
      statut: 'ouvert',
      current_step: 'realisation',
      realisation_equipe: n.equipe_membres || [],
      realisation_activite: n.objet_activite || '',
      realisation_programme: n.programme || [],
      date_maj: maintenant,
      created_by: req.user.username,
      date_creation: maintenant,
    });

    res.json({
      status: 'ok', statut: 'acte', reference_activite: refActivite,
      dossier_id: dossier.id, dossier_ref: dossier.reference,
    });
  });
};
