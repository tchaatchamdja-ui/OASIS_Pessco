// Module « Exécution de la Surveillance » — dossiers d'exécution et
// constatations FNC/PAC (reprise intégrale des routes PESSCO).
const referentiels = require('../../referentiels');
const db = require('./store');
const refModele = require('./references');
const R = require('./roles');

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig, auth } = deps;

  const refs = () => referentiels.getAll();
  const parId = (coll, id) => (refs()[coll] || []).find((x) => x.id === id) || null;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Non autorisé' });

  const perimetrePrestataire = (prestataireId) => {
    const p = parId('prestataires', prestataireId) || {};
    const s = parId('secteurs', p.secteur_id) || {};
    return { domaine_id: p.domaine_id || s.domaine_id || '', secteur_id: p.secteur_id || '', prestataire_id: prestataireId || '' };
  };

  // ══════════════════════════════════════
  //  Dossiers d'exécution
  // ══════════════════════════════════════
  // Contexte de composition des références, tiré du dossier ou de son
  // prestataire : État, domaine, secteur, prestataire, année.
  const codeDomaine = (id) => {
    const dom = (referentiels.getAll().domaines || []).find((x) => x.id === id);
    return String((dom && dom.code) || id || '').toUpperCase();
  };
  const contexteRefDossier = (d) => {
    const tous = referentiels.getAll();
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

  const enrichirDossier = (d) => {
    const n = db.get('notifications', d.notification_id) || {};
    const pr = parId('prestataires', d.prestataire_id) || {};
    return {
      ...d,
      notification_ref: n.reference || '',
      notification_objet: n.objet_activite || '',
      secteur_id: n.secteur_id || '',
      date_fin_effective: n.date_fin_effective || '',
      prestataire_nom: pr.nom || '',
    };
  };

  app.get(`${M}/dossiers`, requireAuth, (req, res) => {
    let rows = db.list('dossiers');
    // Un prestataire ne voit que ses dossiers, une fois clôturés.
    if (R.estPrestataire(req.user)) {
      const miens = R.prestatairesDe(req.user);
      if (!miens.length) return res.json([]);
      rows = rows.filter((d) => miens.includes(d.prestataire_id) && d.statut === 'cloture');
    }
    if (req.query.statut) rows = rows.filter((d) => d.statut === req.query.statut);
    rows = rows.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    res.json(rows.map(enrichirDossier));
  });

  app.get(`${M}/dossiers/:id`, requireAuth, (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    const n = db.get('notifications', d.notification_id) || {};
    const pr = parId('prestataires', d.prestataire_id) || {};
    const constatations = db.list('constatations')
      .filter((c) => c.dossier_id === d.id)
      .sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    const rapports = db.list('rapports')
      .filter((r) => r.dossier_id === d.id)
      .sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    res.json({
      ...enrichirDossier(d),
      // Champs de la notification, préfixés `notif_` comme dans PESSCO
      notif_perimetre: n.perimetre_activite || '',
      notif_perimetre_valide: n.perimetre_valide || '',
      notif_referentiels: n.referentiels || '',
      notif_documents_requis: n.documents_requis || '',
      notif_equipe: n.equipe_membres || [],
      notif_date_debut: n.date_debut_effective || '',
      notif_date_fin: n.date_fin_effective || '',
      notif_reference: n.reference || '',
      notif_nature: n.nature_activite || '',
      notif_lieu: n.lieu_activite || '',
      notif_programme: n.programme || [],
      notif_prestataire_designation: n.prestataire_designation || '',
      notif_fonction_responsable: n.prestataire_responsable_fonction || '',
      notif_nom_responsable: n.prestataire_dirigeant_nom || '',
      notif_interlocuteur: n.prestataire_interlocuteur || '',
      notif_interlocuteur_nom: n.interlocuteur_nom || '',
      notif_interlocuteur_email: n.interlocuteur_email || '',
      notif_fait_a: n.fait_a || '',
      notif_date_edition: n.date_edition || '',
      notif_signataire: n.signataire || '',
      notif_reference_activite: n.reference_activite || '',
      notif_secteur_id: n.secteur_id || '',
      prestataire_nom: pr.nom || '',
      prestataire_code: pr.trigramme || '',
      constatations,
      rapports,
      rapport: rapports[0] || null,
    });
  });

  app.post(`${M}/dossiers`, requireAuth, (req, res) => {
    const d = req.body || {};
    const n = db.get('notifications', d.notification_id || '');
    if (!n) return res.status(404).json({ error: 'Notification non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    if (!['envoye', 'acte'].includes(n.statut)) {
      return res.status(400).json({ error: "La notification doit être au statut 'envoyé' ou 'acté'" });
    }
    const maintenant = db.now();
    const rec = db.insert('dossiers', {
      id: db.uid('dossier'),
      reference: refModele.suivante('dossier', contexteRefDossier(d)),
      notification_id: n.id,
      activite_id: n.activite_id || '',
      plan_id: n.plan_id || '',
      prestataire_id: n.prestataire_id || '',
      date_debut_execution: n.date_debut_effective || n.date_activite || '',
      date_fin_execution: n.date_fin_effective || '',
      equipe: d.equipe || [],
      checklists: d.checklists || [],
      annexes: d.annexes || [],
      introduction: d.introduction || '',
      statut: 'ouvert',
      current_step: 'realisation',
      date_maj: maintenant,
      created_by: req.user.username,
      date_creation: maintenant,
    });
    res.status(201).json({ status: 'ok', id: rec.id, reference: rec.reference });
  });

  app.put(`${M}/dossiers/:id`, requireAuth, (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    const patch = {};
    Object.entries(req.body || {}).forEach(([k, v]) => {
      if (k !== 'id' && k !== 'notification_id') patch[k] = v;
    });
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    patch.date_maj = db.now();
    db.update('dossiers', d.id, patch);
    res.json({ status: 'ok' });
  });

  // Réalisation close → l'étape Rédaction s'ouvre.
  app.put(`${M}/dossiers/:id/close-realisation`, requireAuth, (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    db.update('dossiers', d.id, { realisation_closed: 1, current_step: 'redaction', date_maj: db.now() });
    res.json({ status: 'ok', current_step: 'redaction' });
  });

  // Soumission : crée le rapport v1, ou une version suivante sur la même
  // référence de base, et bascule le dossier à l'étape Validation.
  app.put(`${M}/dossiers/:id/submit`, requireAuth, (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!R.canContribute(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    const maintenant = db.now();
    let baseRef = d.base_reference || '';
    if (!baseRef) {
      baseRef = refModele.suivante('rapport', contexteRefDossier(d));
      db.update('dossiers', d.id, { base_reference: baseRef });
    }
    const versions = db.list('rapports').filter((r) => r.dossier_id === d.id).map((r) => Number(r.version) || 0);
    const version = (versions.length ? Math.max(...versions) : 0) + 1;
    const n = db.get('notifications', d.notification_id) || {};
    const rap = db.insert('rapports', {
      id: db.uid('rap'),
      reference: `${baseRef}-v${version}`,
      dossier_id: d.id,
      notification_id: d.notification_id || '',
      prestataire_id: d.prestataire_id || '',
      titre: `Rapport - ${n.objet_activite || ''}`,
      contenu: '',
      date_debut: d.date_debut_execution || '',
      date_fin: d.date_fin_execution || '',
      statut: 'soumis',
      version,
      created_by: req.user.username,
      date_creation: maintenant,
    });
    db.update('dossiers', d.id, {
      statut: 'soumis', date_soumission: maintenant, date_maj: maintenant,
      redaction_closed: 1, current_step: 'validation', observations_retour: '',
    });
    res.json({ status: 'ok', statut: 'soumis', rapport_id: rap.id, rapport_ref: rap.reference, version });
  });

  // Renvoi pour correction : retour à l'étape Rédaction.
  app.put(`${M}/dossiers/:id/return`, requireAuth, (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!R.canValidate(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à renvoyer');
    const observations = (req.body || {}).observations || '';
    const soumis = db.list('rapports')
      .filter((r) => r.dossier_id === d.id && r.statut === 'soumis')
      .sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0))[0];
    if (soumis) db.update('rapports', soumis.id, { statut: 'brouillon', observations_validation: observations });
    db.update('dossiers', d.id, {
      statut: 'brouillon', observations_retour: observations, date_maj: db.now(),
      redaction_closed: 0, current_step: 'redaction',
    });
    res.json({ status: 'ok', statut: 'brouillon' });
  });

  app.put(`${M}/dossiers/:id/close`, requireAuth, (req, res) => {
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!R.canValidate(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à clôturer');
    if (d.statut === 'cloture') return res.status(400).json({ error: 'Dossier déjà clôturé' });
    // Le dossier ne se clôt qu'une fois le rapport transmis au prestataire.
    const transmis = db.list('rapports').some((r) => r.dossier_id === d.id && r.statut === 'transmis');
    if (!transmis) return res.status(400).json({ error: 'Un rapport transmis est requis pour clôturer' });
    const maintenant = db.now();
    db.update('dossiers', d.id, {
      statut: 'cloture', date_fin_execution: maintenant, date_maj: maintenant, current_step: 'cloture',
    });
    // Les constatations en brouillon deviennent opposables à la clôture.
    db.list('constatations')
      .filter((c) => c.dossier_id === d.id && c.statut === 'brouillon')
      .forEach((c) => db.update('constatations', c.id, { statut: 'ouvert' }));
    res.json({ status: 'ok', statut: 'cloture' });
  });

  app.delete(`${M}/dossiers/:id`, requireAuth, (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, 'Réservé aux administrateurs');
    const d = db.get('dossiers', req.params.id);
    if (!d) return res.status(404).json({ error: 'Dossier non trouvé' });
    db.removeWhere('constatations', (c) => c.dossier_id === d.id);
    db.removeWhere('rapports', (r) => r.dossier_id === d.id);
    db.remove('dossiers', d.id);
    // La notification part aussi : l'activité redevient « à notifier ».
    if (d.notification_id) {
      db.removeWhere('echanges', (e) => e.notification_id === d.notification_id);
      db.remove('notifications', d.notification_id);
    }
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Constatations (FNC) et plans d'actions correctives (PAC)
  // ══════════════════════════════════════
  const enrichirFnc = (c) => {
    const d = db.get('dossiers', c.dossier_id) || {};
    const pr = parId('prestataires', c.prestataire_id) || {};
    return { ...c, notification_id: d.notification_id || '', prestataire_nom: pr.nom || '', prestataire_code: pr.trigramme || '' };
  };

  app.get(`${M}/constatations`, requireAuth, (req, res) => {
    let rows = db.list('constatations');
    if (R.estPrestataire(req.user)) {
      const miens = R.prestatairesDe(req.user);
      if (!miens.length) return res.json([]);
      rows = rows.filter((c) => miens.includes(c.prestataire_id));
    }
    const criticite = req.query.criticite || req.query.gravite;
    if (req.query.statut) rows = rows.filter((c) => c.statut === req.query.statut);
    if (req.query.dossier_id) rows = rows.filter((c) => c.dossier_id === req.query.dossier_id);
    if (criticite) rows = rows.filter((c) => c.criticite === criticite);
    rows = rows.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    res.json(rows.map(enrichirFnc));
  });

  app.get(`${M}/constatations/:id`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (R.estPrestataire(req.user)) {
      if (!R.accedeA(req.user, c.prestataire_id || '')) return refuser(res, 'Accès refusé à cette constatation');
    }
    res.json(enrichirFnc(c));
  });

  app.post(`${M}/constatations`, requireAuth, (req, res) => {
    const d = req.body || {};
    const direct = !!d.direct;
    let dossier = null;
    if (!direct) {
      dossier = db.get('dossiers', d.dossier_id || '');
      if (!dossier) return res.status(404).json({ error: 'Dossier non trouvé' });
      if (dossier.statut === 'cloture') {
        return res.status(400).json({ error: 'Impossible de créer une FNC sur un dossier clôturé' });
      }
    }
    const prestataireId = d.prestataire_id || (dossier ? dossier.prestataire_id : '') || '';
    if (!R.canContribute(req.user, perimetrePrestataire(prestataireId), referentiels)) return refuser(res);
    const maintenant = db.now();
    const domaine = d.domaine_id || d.domaine || 'GEN';
    const rec = db.insert('constatations', {
      id: db.uid('fnc'),
      reference: refModele.suivante('constatation', {
        ...contexteRefDossier({ prestataire_id: prestataireId, secteur_id: (dossier || {}).secteur_id }),
        domaine: codeDomaine(domaine) + (direct ? '-DIR' : ''),
      }),
      dossier_id: d.dossier_id || '',
      domaine_id: domaine,
      prestataire_id: prestataireId,
      emis_par: d.emis_par || '',
      adresse_a: d.adresse_a || '',
      date_ouverture: d.date_ouverture || maintenant.slice(0, 10),
      source: d.source || (direct ? 'direct' : 'audit'),
      criticite: d.criticite || d.gravite || 'mineur',
      cas_type: d.cas_type || d.titre || '',
      description: d.description || '',
      ref_reglementaires: d.ref_reglementaires || d.exigence_ref || '',
      delai_solde: d.delai_solde || d.delai_correction || '30',
      date_due_cloture: d.date_due_cloture || '',
      recommandation: d.recommandation || '',
      preuves_constatation: d.preuves_constatation || [],
      actions_correctives: d.actions_correctives || [],
      // Une FNC directe suit son propre circuit avant de devenir opposable.
      statut: direct ? 'direct_brouillon' : 'brouillon',
      created_by: req.user.username,
      date_creation: maintenant,
    });
    res.status(201).json({ status: 'ok', id: rec.id, reference: rec.reference, statut: rec.statut });
  });

  app.put(`${M}/constatations/:id`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!R.canContribute(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    const patch = {};
    Object.entries(req.body || {}).forEach(([k, v]) => {
      if (!['id', 'reference', 'direct'].includes(k)) patch[k] = v;
    });
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    db.update('constatations', c.id, patch);
    res.json({ status: 'ok' });
  });

  app.put(`${M}/constatations/:id/submit-pac`, requireAuth, (req, res) => {
    // Déposer un plan d'actions correctives est un droit confié au compte.
    if (!R.compteA(req.user, 'constatations', auth)) return refuser(res, 'Droit non confié à ce compte');
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!['ouverte', 'ouvert', 'pac_rejetee'].includes(c.statut)) {
      return res.status(400).json({ error: 'La FNC doit être ouverte ou PAC rejetée pour soumettre un PAC' });
    }
    const d = req.body || {};
    const patch = {
      statut: 'pac_soumis',
      actions_correctives: d.actions_correctives || [],
      date_soumission_pac: db.now(),
    };
    if (d.evaluation) patch.commentaire_evaluation = d.evaluation;
    db.update('constatations', c.id, patch);
    res.json({ status: 'ok', statut: 'pac_soumis' });
  });

  app.put(`${M}/constatations/:id/validate-pac`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à valider le PAC');
    if (c.statut !== 'pac_soumis') return res.status(400).json({ error: 'Le PAC doit être soumis pour être validé' });
    db.update('constatations', c.id, {
      statut: 'pac_valide', valideur_pac_id: req.user.username,
      date_validation_pac: db.now(), commentaire_evaluation: (req.body || {}).evaluation || '',
    });
    res.json({ status: 'ok', statut: 'pac_valide' });
  });

  app.put(`${M}/constatations/:id/reject-pac`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à renvoyer le PAC');
    if (c.statut !== 'pac_soumis') return res.status(400).json({ error: 'Le PAC doit être soumis pour être renvoyé' });
    const d = req.body || {};
    db.update('constatations', c.id, {
      statut: 'pac_rejetee', motif_rejet_pac: d.motif || '',
      date_rejet_pac: db.now(), commentaire_evaluation: d.commentaire_evaluation || '',
    });
    res.json({ status: 'ok', statut: 'pac_rejetee' });
  });

  app.put(`${M}/constatations/:id/close`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res, 'Non autorisé à clôturer la FNC');
    if (c.statut === 'soldee') return res.status(400).json({ error: 'La FNC est déjà soldée' });
    const d = req.body || {};
    db.update('constatations', c.id, {
      statut: 'soldee',
      commentaire_evaluation: d.evaluation || d.commentaire || '',
      date_solde: db.now(),
    });
    res.json({ status: 'ok', statut: 'soldee' });
  });

  app.delete(`${M}/constatations/:id`, requireAuth, (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, 'Réservé aux administrateurs');
    if (!db.get('constatations', req.params.id)) return res.status(404).json({ error: 'Constatation non trouvée' });
    db.remove('constatations', req.params.id);
    res.json({ status: 'ok' });
  });
};
