// Module « Exécution de la Surveillance » — dossiers d'exécution et
// constatations FNC/PAC (reprise intégrale des routes PESSCO).
const XLSX = require('xlsx');
const { asynchrone } = require('../../route');
const referentiels = require('../../referentiels');
const db = require('./store');
const refModele = require('./references');
const R = require('./roles');
const acteurs = require('./acteurs');
const transmission = require('./transmission');
const instances = require('../../instances');
const suitesCare = require('../../suites_care');
const { introuvable, requis, inconnu, reserve, refuser, statutRequis, dejaFait } = require('../../erreurs');

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig, auth } = deps;

  const refs = () => referentiels.getAll();
  const parId = (coll, id) => (refs()[coll] || []).find((x) => x.id === id) || null;

  // ── Instance regardée ──
  // Chaque AAC tient son instance ; les listes ne servent que ses dossiers.
  // Le choix suit le compte réellement connecté, non celui que la vue
  // Prestataire simule. Vue régionale : l'instance retenue est vide, et rien
  // n'est écarté.
  const instanceCourante = (req) => instances.courante(req.userReel || req.user, loadConfig);
  const parInstance = (req, rangs) => instances.filtrer(rangs, instanceCourante(req), loadConfig);

  const perimetrePrestataire = (prestataireId) => {
    const p = parId('prestataires', prestataireId) || {};
    const s = parId('secteurs', p.secteur_id) || {};
    return { domaine_id: p.domaine_id || s.domaine_id || '', secteur_id: p.secteur_id || '', prestataire_id: prestataireId || '' };
  };

  // Restriction par processus sur le circuit de la constatation.
  const refusProcessus = async (req, res, c, cle) => {
    const perim = perimetrePrestataire(c.prestataire_id);
    const motif = await acteurs.refusEventuel(req.user, 'constatation', {
      secteur_id: perim.secteur_id,
      domaine_id: c.domaine_id || perim.domaine_id,
      dossier: c.dossier_id ? await db.get('dossiers', c.dossier_id) : null,
    }, cle);
    if (!motif) return false;
    res.status(403).json({ error: motif });
    return true;
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
  const contexteRefDossier = (req, d) => {
    const tous = referentiels.getAll();
    const aac = instances.aac(req.userReel || req.user, loadConfig);
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

  const enrichirDossier = async (d) => {
    const n = await db.get('notifications', d.notification_id) || {};
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

  app.get(`${M}/dossiers`, requireAuth, asynchrone(async (req, res) => {
    if (!R.canRead(req.userReel || req.user)) return refuser(res);
    let rows = parInstance(req, await db.list('dossiers'));
    // Un prestataire ne voit que ses dossiers, une fois clôturés.
    if (R.estPrestataire(req.user)) {
      const miens = R.prestatairesDe(req.user);
      if (!miens.length) return res.json([]);
      rows = rows.filter((d) => miens.includes(d.prestataire_id) && d.statut === 'cloture');
    }
    if (req.query.statut) rows = rows.filter((d) => d.statut === req.query.statut);
    rows = rows.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    // `Promise.all`, et non `.map` seul : l'enrichissement touche la base depuis la
    // bascule, et un tableau de promesses se sérialise en objets **vides** — une
    // liste pleine d'enregistrements sans aucun champ, sans la moindre erreur.
    res.json(await Promise.all(rows.map(enrichirDossier)));
  }));

  app.get(`${M}/dossiers/:id`, requireAuth, asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    const n = await db.get('notifications', d.notification_id) || {};
    const pr = parId('prestataires', d.prestataire_id) || {};
    const constatations = (await db.list('constatations'))
      .filter((c) => c.dossier_id === d.id)
      .sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    const rapports = (await db.list('rapports'))
      .filter((r) => r.dossier_id === d.id)
      .sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    res.json({
      ...await enrichirDossier(d),
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
  }));

  app.post(`${M}/dossiers`, requireAuth, asynchrone(async (req, res) => {
    const d = req.body || {};
    const n = await db.get('notifications', d.notification_id || '');
    if (!n) return introuvable(res, 'notification');
    if (!R.canContribute(req.user, perimetrePrestataire(n.prestataire_id), referentiels)) return refuser(res);
    if (!['envoye', 'acte'].includes(n.statut)) {
      return statutRequis(res, 'notification', ['envoye', 'acte']);
    }
    const maintenant = db.now();
    const rec = await refModele.insererAvec('dossiers', 'dossier', contexteRefDossier(req, d), {
      id: db.uid('dossier'),
      notification_id: n.id,
      // Le dossier appartient à l'instance qui a notifié l'activité.
      instance: instances.de(n, loadConfig),
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
  }));

  app.put(`${M}/dossiers/:id`, requireAuth, asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    if (!R.canContribute(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    const patch = {};
    Object.entries(req.body || {}).forEach(([k, v]) => {
      if (k !== 'id' && k !== 'notification_id') patch[k] = v;
    });
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    patch.date_maj = db.now();
    await db.update('dossiers', d.id, patch);
    res.json({ status: 'ok' });
  }));

  // Réalisation close → l'étape Rédaction s'ouvre.
  app.put(`${M}/dossiers/:id/close-realisation`, requireAuth, asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    if (!R.canContribute(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    await db.update('dossiers', d.id, { realisation_closed: 1, current_step: 'redaction', date_maj: db.now() });
    res.json({ status: 'ok', current_step: 'redaction' });
  }));

  // Soumission : crée le rapport v1, ou une version suivante sur la même
  // référence de base, et bascule le dossier à l'étape Validation.
  app.put(`${M}/dossiers/:id/submit`, requireAuth, asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    if (!R.canContribute(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    const maintenant = db.now();
    const ctxRef = contexteRefDossier(req, d);
    const n = await db.get('notifications', d.notification_id) || {};
    // ── La référence de base, le numéro de version et le rapport, d'un seul geste ──
    //
    // C'était jusqu'à trois écritures, et **deux lectures qui décidaient d'un
    // numéro** : la référence de base, déduite des références existantes, et la
    // version, déduite des rapports du dossier. Deux soumissions parties ensemble
    // auraient produit deux rapports « v1 » sous la même référence.
    let baseRef = d.base_reference || '';
    let version = 1;
    let rap = null;
    const idRap = db.uid('rap');
    await db.transformer((etat) => {
      const dossiers = etat.dossiers || [];
      const j = dossiers.findIndex((x) => x.id === d.id);
      baseRef = (j >= 0 ? dossiers[j].base_reference : d.base_reference) || '';
      if (!baseRef) {
        baseRef = refModele.suivanteDans(etat, 'rapport', ctxRef);
        if (j >= 0) dossiers[j] = { ...dossiers[j], base_reference: baseRef };
      }
      const versions = (etat.rapports || [])
        .filter((r) => r.dossier_id === d.id).map((r) => Number(r.version) || 0);
      version = (versions.length ? Math.max(...versions) : 0) + 1;
      rap = {
      id: idRap,
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
      };
      etat.rapports = (etat.rapports || []).concat([rap]);
      if (j >= 0) {
        dossiers[j] = {
          ...dossiers[j],
          statut: 'soumis', date_soumission: maintenant, date_maj: maintenant,
          redaction_closed: 1, current_step: 'validation', observations_retour: '',
        };
      }
      etat.dossiers = dossiers;
      return etat;
    });
    return res.json({ status: 'ok', statut: 'soumis', rapport_id: rap.id, rapport_ref: rap.reference, version });
  }));

  // Renvoi pour correction : retour à l'étape Rédaction.
  app.put(`${M}/dossiers/:id/return`, requireAuth, asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    if (!R.canValidate(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    const observations = (req.body || {}).observations || '';
    const soumis = (await db.list('rapports'))
      .filter((r) => r.dossier_id === d.id && r.statut === 'soumis')
      .sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0))[0];
    if (soumis) await db.update('rapports', soumis.id, { statut: 'brouillon', observations_validation: observations });
    await db.update('dossiers', d.id, {
      statut: 'brouillon', observations_retour: observations, date_maj: db.now(),
      redaction_closed: 0, current_step: 'redaction',
    });
    res.json({ status: 'ok', statut: 'brouillon' });
  }));

  app.put(`${M}/dossiers/:id/close`, requireAuth, asynchrone(async (req, res) => {
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    if (!R.canValidate(req.user, perimetrePrestataire(d.prestataire_id), referentiels)) return refuser(res);
    if (d.statut === 'cloture') return dejaFait(res, 'dossier', 'cloture');
    // Le dossier ne se clôt qu'une fois le rapport transmis au prestataire.
    const transmis = (await db.list('rapports')).some((r) => r.dossier_id === d.id && r.statut === 'transmis');
    if (!transmis) return res.status(400).json({ error: 'Un rapport transmis est requis pour clôturer' });
    const maintenant = db.now();
    // La clôture et ce qu'elle rend opposable, **d'un seul geste**. Les
    // constatations en brouillon deviennent opposables au prestataire à la
    // clôture : c'était une écriture pour le dossier, puis une par constatation.
    // Entre elles, un dossier clos dont les constatations ne l'étaient pas encore —
    // et un échec au milieu les y laissait, inopposables pour toujours.
    await db.transformer((etat) => {
      const dossiers = etat.dossiers || [];
      const i = dossiers.findIndex((x) => x.id === d.id);
      if (i >= 0) {
        dossiers[i] = {
          ...dossiers[i],
          statut: 'cloture', date_fin_execution: maintenant, date_maj: maintenant, current_step: 'cloture',
        };
      }
      etat.constatations = (etat.constatations || []).map((c) => (c.dossier_id === d.id && c.statut === 'brouillon'
        ? { ...c, statut: 'ouvert' } : c));
      return etat;
    });
    res.json({ status: 'ok', statut: 'cloture' });
  }));

  app.delete(`${M}/dossiers/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return reserve(res, 'administrateurs');
    const d = await db.get('dossiers', req.params.id);
    if (!d) return introuvable(res, 'dossier');
    // Une constatation reprise par « Mesures d'Application » fonde ce qui y a
    // été décidé : le dossier qui la porte ne se supprime plus.
    const fncs = (await db.list('constatations')).filter((c) => c.dossier_id === d.id).map((c) => c.id);
    if (await suitesCare.refusSiSuites(res, suitesCare.clesSurv(fncs))) return undefined;
    await db.removeDossier(d.id, req.user.username);
    // La notification part aussi : l'activité redevient « à notifier ».
    if (d.notification_id) {
      await db.removeWhere('echanges', (e) => e.notification_id === d.notification_id);
      await db.remove('notifications', d.notification_id);
    }
    res.json({ status: 'ok' });
  }));

  // ══════════════════════════════════════
  //  Constatations (FNC) et plans d'actions correctives (PAC)
  // ══════════════════════════════════════
  const enrichirFnc = async (c) => {
    const d = await db.get('dossiers', c.dossier_id) || {};
    const pr = parId('prestataires', c.prestataire_id) || {};
    return { ...c, notification_id: d.notification_id || '', prestataire_nom: pr.nom || '', prestataire_code: pr.trigramme || '' };
  };

  // Évaluation stockée : objet, ou chaîne héritée du portage PESSCO.
  const evaluationDe = (c) => {
    const brut = c && c.commentaire_evaluation;
    if (!brut) return {};
    if (typeof brut === 'object') return brut;
    try { return JSON.parse(brut); } catch { return { legacy_comment: brut }; }
  };

  // Les écrans du prestataire n'affichent pas le bloc d'évaluation de l'AAC :
  // ce qu'ils renvoient est vide. On conserve donc l'évaluation enregistrée et
  // l'on ne retient du corps reçu que les échanges et les mentions de dépôt.
  // `reinitialiser` : l'amendement du plan fait tomber l'acceptation et la
  // vérification, et ramène le circuit à l'étape « Acceptation ».
  const fusionEvaluationPostulant = (c, recu, reinitialiser) => {
    const ancien = evaluationDe(c);
    const sortie = (recu && typeof recu === 'object') ? { ...recu } : {};
    const anac = { ...(ancien.evaluation_anac || {}) };
    if (reinitialiser) { anac.acceptation = {}; anac.verification = {}; }
    sortie.evaluation_anac = anac;
    return sortie;
  };

  app.get(`${M}/constatations`, requireAuth, asynchrone(async (req, res) => {
    if (!R.canRead(req.userReel || req.user)) return refuser(res);
    let rows = parInstance(req, await db.list('constatations'));
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
    res.json(await Promise.all(rows.map(enrichirFnc)));
  }));

  // Avant la route paramétrée : sans quoi « export-xlsx » serait lu comme un
  // identifiant de constatation.

  app.get(`${M}/constatations/:id`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (R.estPrestataire(req.user)) {
      if (!R.accedeA(req.user, c.prestataire_id || '')) return refuser(res);
    }
    res.json(await enrichirFnc(c));
  }));

  // ══════════════════════════════════════
  //  Export des constatations (classeur)
  // ══════════════════════════════════════
  // Le front envoie les identifiants tels que sa liste les affiche : l'export
  // porte donc exactement sur ce que les filtres ont retenu.
  // Deux entrées pour le même classeur : POST (corps JSON) et GET (paramètres
  // d'URL). La seconde laisse le navigateur télécharger nativement le fichier.
  // Enveloppé ici : c'est ce gestionnaire que les deux routes montent, et
  // Express ne regarde pas la promesse d'un middleware `async`.
  const exporterConstatations = asynchrone(async (req, res) => {
    const d = req.method === 'GET'
      ? { ids: String(req.query.ids || '').split(',').filter(Boolean),
          titre: req.query.titre, filtres: req.query.filtres }
      : (req.body || {});
    const demandes = Array.isArray(d.ids) ? d.ids : [];
    let rows = parInstance(req, await db.list('constatations')).filter((c) => demandes.includes(c.id));
    if (R.estPrestataire(req.user)) {
      const miens = R.prestatairesDe(req.user);
      rows = rows.filter((c) => miens.includes(c.prestataire_id));
    }
    // L'ordre d'affichage est conservé.
    rows.sort((a, b) => demandes.indexOf(a.id) - demandes.indexOf(b.id));

    const tous = referentiels.getAll();
    const nomDomaine = (id) => (tous.domaines || []).find((x) => x.id === id || x.code === id)?.nom || id || '';
    const evaluation = (c) => {
      const ev = evaluationDe(c);
      const anac = ev.evaluation_anac || {};
      return { ev, anac, verif: anac.verification || {}, cloture: anac.cloture || {} };
    };
    const dateDue = (c) => {
      if (c.date_due_cloture) return String(c.date_due_cloture).slice(0, 10);
      const delai = parseInt(c.delai_solde || c.delai_correction || '0', 10);
      const ouv = c.date_ouverture || String(c.date_creation || '').slice(0, 10);
      if (!delai || !ouv) return '';
      const dt = new Date(ouv);
      dt.setDate(dt.getDate() + delai);
      return dt.toISOString().slice(0, 10);
    };
    const commentaires = (ev) => [
      ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || [])
        .map((x) => `${String(x.date || '').slice(0, 10)} — ${x.auteur || ''} [${cle}] : ${x.texte || ''}`)),
      ...(ev.suivi_commentaires || []).filter((x) => x.publie)
        .map((x) => `${String(x.date || '').slice(0, 10)} — ${x.auteur || ''} [${(x.items || []).join(', ')}${x.precision ? ` : ${x.precision}` : ''}] : ${x.texte || ''}`),
    ].join('\n');

    const entetes = [
      'Référence', 'Prestataire', 'Domaine', 'Criticité', 'Statut',
      'Date d’ouverture', 'Délai (j)', 'Date due', 'À vérifier sur le terrain',
      'Cause primaire', 'Action curative', 'Date prévue (curative)',
      'Action corrective', 'Date prévue (corrective)',
      'Preuves déposées', 'Commentaires de suivi', 'Commentaire général de suivi',
    ];
    const lignes = rows.map((c) => {
      const { ev, verif } = evaluation(c);
      const pac = (c.actions_correctives || [])[0] || {};
      const preuves = [...(pac.curative_preuves || []), ...(pac.corrective_preuves || [])]
        .map((p, i) => `${i + 1}. ${p.intitule || p.filename || ''}${p.date ? ` (${String(p.date).slice(0, 10)})` : ''}${p.commentaire ? ` — ${p.commentaire}` : ''}`)
        .join('\n');
      return [
        c.reference || '', c.prestataire_nom || '', nomDomaine(c.domaine_id),
        c.criticite || c.gravite || '', c.statut || '',
        c.date_ouverture || String(c.date_creation || '').slice(0, 10),
        Number(c.delai_solde || 0) || '', dateDue(c),
        verif.verification_terrain ? 'Oui' : 'Non',
        pac.cause_primaire || '', pac.action_curative || '', pac.curative_date_prevue || '',
        pac.actions_correctives || '', pac.corrective_date_prevue || '',
        preuves, commentaires(ev),
        (verif.suivis || []).map((s) => `${String(s.date || '').slice(0, 10)} — ${s.auteur || ''} : ${s.texte || ''}`).join('\n'),
      ];
    });

    const aac = instances.aac(req.userReel || req.user, loadConfig);
    const titre = `${aac.sigle || 'AAC'} — ${d.titre || 'Constatations'}`;
    const sousTitre = [d.filtres || '', `Édité le ${new Date().toLocaleDateString('fr-FR')}`, `${rows.length} constatation(s)`]
      .filter(Boolean).join('   ·   ');

    const grille = [[titre], [sousTitre], [], entetes, ...lignes];
    const ws = XLSX.utils.aoa_to_sheet(grille);
    ws['!cols'] = [16, 22, 20, 12, 14, 14, 9, 12, 14, 40, 40, 14, 40, 14, 34, 44, 34]
      .map((wch) => ({ wch }));
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: entetes.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: entetes.length - 1 } },
    ];
    ws['!freeze'] = { xSplit: 1, ySplit: 4 };
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + lignes.length, c: entetes.length - 1 } }) };
    // Les cellules multilignes se lisent sur plusieurs lignes à l'impression.
    grille.forEach((_, r) => {
      if (r < 4) return;
      entetes.forEach((__, col) => {
        const ref = XLSX.utils.encode_cell({ r, c: col });
        if (ws[ref]) ws[ref].s = { alignment: { wrapText: true, vertical: 'top' } };
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Constatations');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const nom = `constatations-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    return res.send(buffer);
  });

  // Montés **après** la déclaration, et non réenveloppés dans une flèche. Deux
  // raisons, l'une après l'autre : l'enveloppe reçoit `next` d'Express, et une
  // flèche à deux arguments le lui retirait — un rejet aurait appelé `undefined` ;
  // et un `const` ne vit qu'à partir de sa déclaration, de sorte que monter la
  // route plus haut arrêtait le démarrage du serveur.
  app.get(`${M}/constatations/export-xlsx`, requireAuth, exporterConstatations);
  app.post(`${M}/constatations/export-xlsx`, requireAuth, exporterConstatations);

  // ══════════════════════════════════════
  //  Échanges attachés à une constatation
  // ══════════════════════════════════════
  // Même fil que la négociation d'une activité, mais rattaché à la
  // constatation : l'AAC et le prestataire s'y répondent sur le PAC.
  app.get(`${M}/constatations/:id/echanges`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (R.estPrestataire(req.user) && !R.accedeA(req.user, c.prestataire_id || '')) {
      return refuser(res);
    }
    const users = auth.getUsers();
    const rows = (await db.list('echanges'))
      .filter((e) => e.constatation_id === c.id)
      .sort((a, b) => String(a.date_creation || '').localeCompare(String(b.date_creation || '')))
      .map((e) => {
        const u = users.find((x) => x.username === e.auteur_id) || {};
        return { ...e, auteur_nom: u.nom || '', auteur_prenom: u.prenom || '' };
      });
    res.json(rows);
  }));

  app.post(`${M}/constatations/:id/echanges`, requireAuth, asynchrone(async (req, res) => {
    if (!R.compteA(req.user, 'echanges', auth)) return refuser(res, 'Droit non confié à ce compte');
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canContribute(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    const contenu = String((req.body || {}).contenu || '').trim();
    if (!contenu) return requis(res, 'message');
    const rec = await db.insert('echanges', {
      id: db.uid('ech'),
      constatation_id: c.id,
      notification_id: '',
      auteur_id: req.user.username,
      auteur_type: R.estPrestataire(req.user) ? 'prestataire' : 'aac',
      type_message: 'message',
      contenu,
      pieces_jointes: (req.body || {}).pieces_jointes || [],
      date_creation: db.now(),
    });
    res.status(201).json({ status: 'ok', id: rec.id });
  }));

  app.post(`${M}/constatations`, requireAuth, asynchrone(async (req, res) => {
    const d = req.body || {};
    const direct = !!d.direct;
    let dossier = null;
    if (!direct) {
      dossier = await db.get('dossiers', d.dossier_id || '');
      if (!dossier) return introuvable(res, 'dossier');
      if (dossier.statut === 'cloture') {
        return res.status(400).json({ error: 'Impossible de créer une FNC sur un dossier clôturé' });
      }
    }
    const prestataireId = d.prestataire_id || (dossier ? dossier.prestataire_id : '') || '';
    if (!R.canContribute(req.user, perimetrePrestataire(prestataireId), referentiels)) return refuser(res);
    const maintenant = db.now();
    const domaine = d.domaine_id || d.domaine || 'GEN';
    const ctxFnc = {
      ...contexteRefDossier(req, { prestataire_id: prestataireId, secteur_id: (dossier || {}).secteur_id }),
      domaine: codeDomaine(domaine) + (direct ? '-DIR' : ''),
    };
    const rec = await refModele.insererAvec('constatations', 'constatation', ctxFnc, {
      id: db.uid('fnc'),
      dossier_id: d.dossier_id || '',
      // Une constatation appartient à l'instance de son dossier ; relevée
      // directement, à celle d'où elle est relevée.
      instance: dossier ? instances.de(dossier, loadConfig) : instanceCourante(req),
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
  }));

  // Une constatation notifiée engage le prestataire : ses termes ne se
  // réécrivent plus au fil de l'eau. Avant, elle est en cours de rédaction.
  const STATUTS_OPPOSABLES = ['ouvert', 'ouverte', 'pac_soumis', 'pac_valide',
    'pac_rejetee', 'soldee'];

  app.put(`${M}/constatations/:id`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canContribute(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    // Champs sur lesquels la constatation engage le prestataire une fois
    // notifiée : ils relèvent alors de /ajuster, jamais de ce PUT.
    const CHAMPS_OPPOSABLES = ['delai_solde', 'criticite', 'date_ouverture',
      'description', 'titre', 'ref_reglementaires', 'domaine_id', 'date_due_cloture'];
    // Ce que l'organisme surveillé n'écrit pas : qui notifie, à qui, et sur
    // quel prestataire porte la constatation.
    const CHAMPS_AAC = ['emis_par', 'adresse_a', 'prestataire_id', 'source', 'direct'];
    // Le statut ne se pose pas à la main : les routes de transition le font,
    // avec leurs gardes propres (submit, validate, close, renvoyer, rejeter).
    const CHAMPS_INTERDITS = ['id', 'reference', 'statut', 'date_solde', 'ajustements',
      'transmis_le', 'transmis_par', 'transmis_a'];
    const estPrest = R.estPrestataire(req.user);
    const opposable = STATUTS_OPPOSABLES.includes(c.statut);
    const patch = {};
    Object.entries(req.body || {}).forEach(([k, v]) => {
      if (CHAMPS_INTERDITS.includes(k)) return;
      if (estPrest && CHAMPS_AAC.includes(k)) return;
      if (opposable && CHAMPS_OPPOSABLES.includes(k)) return;
      patch[k] = v;
    });
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    // Le prestataire n'a pas le bloc d'évaluation à l'écran : ce qu'il renvoie
    // est vide. Sans cette fusion, un simple brouillon effaçait l'acceptation
    // prononcée par l'AAC et bloquait le circuit.
    if (R.estPrestataire(req.user) && patch.commentaire_evaluation !== undefined) {
      patch.commentaire_evaluation = fusionEvaluationPostulant(c, patch.commentaire_evaluation, false);
    }
    await db.update('constatations', c.id, patch);
    res.json({ status: 'ok' });
  }));

  // ── Ajustement d'une constatation déjà opposable ────────────────────
  // Proroger un délai, requalifier une criticité ou reprendre le rappel de la
  // constatation revient sur un engagement notifié au prestataire : réservé
  // aux comptes d'administration, confirmé par mot de passe, et tracé champ
  // par champ. `portee` borne ce que la demande a le droit de toucher.
  const CHAMPS_AJUSTEMENT = {
    prorogation: ['delai_solde'],
    criticite: ['delai_solde', 'criticite'],
    complet: ['delai_solde', 'criticite', 'date_ouverture', 'description',
      'titre', 'ref_reglementaires', 'domaine_id'],
  };
  const LIBELLES_AJUSTEMENT = {
    delai_solde: 'Délai de solde', criticite: 'Criticité',
    date_ouverture: 'Date d’ouverture', description: 'Description',
    titre: 'Intitulé', ref_reglementaires: 'Références réglementaires',
    domaine_id: 'Domaine',
  };

  app.put(`${M}/constatations/:id/ajuster`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');

    const roleReel = ((req.userReel || req.user || {}).role || '');
    if (!['SUPERADMIN', 'ADMIN'].includes(roleReel)
      || !R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) {
      return reserve(res, 'super_admin_aac');
    }

    const b = req.body || {};
    const portee = String(b.portee || '');
    const autorises = CHAMPS_AJUSTEMENT[portee];
    if (!autorises) return inconnu(res, 'portee');

    const motDePasse = String(b.admin_password || '');
    if (!motDePasse) return requis(res, 'mot_de_passe');
    if (!auth.checkPasswordPublic(auth.findUser(req.user.username), motDePasse)) {
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }

    const motif = String(b.motif || '').trim();
    if (!motif) return requis(res, 'motif');

    const patch = {};
    const changements = [];
    autorises.forEach((champ) => {
      if (b.champs === undefined || b.champs[champ] === undefined) return;
      const avant = c[champ] === undefined || c[champ] === null ? '' : String(c[champ]);
      const apres = String(b.champs[champ]);
      if (avant === apres) return;
      patch[champ] = b.champs[champ];
      changements.push({ champ, libelle: LIBELLES_AJUSTEMENT[champ] || champ, avant, apres });
    });
    if (!changements.length) return res.status(400).json({ error: 'Aucune modification' });

    // L'échéance découle du délai et de la date d'ouverture : dès que l'un des
    // deux bouge, elle est refaite — sinon la date affichée mentirait.
    const delai = parseInt(patch.delai_solde !== undefined ? patch.delai_solde : c.delai_solde, 10);
    const ouverture = String(patch.date_ouverture !== undefined
      ? patch.date_ouverture : (c.date_ouverture || c.date_creation || '')).slice(0, 10);
    if (!Number.isNaN(delai) && /^\d{4}-\d{2}-\d{2}$/.test(ouverture)) {
      const d = new Date(`${ouverture}T00:00:00`);
      d.setDate(d.getDate() + delai);
      const echeance = d.toISOString().slice(0, 10);
      if (echeance !== String(c.date_due_cloture || '').slice(0, 10)) {
        patch.date_due_cloture = echeance;
        changements.push({
          champ: 'date_due_cloture', libelle: 'Date d’échéance',
          avant: String(c.date_due_cloture || '').slice(0, 10), apres: echeance,
        });
      }
    }

    const trace = {
      id: `aj_${Date.now().toString(36)}`,
      portee,
      motif,
      auteur: req.user.fullName || req.user.username,
      date: db.now(),
      changements,
    };
    patch.ajustements = [...(c.ajustements || []), trace];
    await db.update('constatations', c.id, patch);
    res.json({ status: 'ok', ajustement: trace });
  }));


  // ══════════════════════════════════════
  //  Circuit de la constatation hors activité de supervision
  // ══════════════════════════════════════
  // Ces transitions étaient posées par le client via le PUT générique : rien
  // ne vérifiait l'enchaînement, l'auteur de la décision n'était pas tracé, et
  // le menu Processus n'avait aucune route où s'appliquer. Chaque passage a
  // désormais la sienne, comme le circuit des notifications.
  const DEPUIS_SOUMISSION = ['direct_brouillon', 'direct_renvoye'];

  app.put(`${M}/constatations/:id/direct-soumettre`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canContribute(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    if (!DEPUIS_SOUMISSION.includes(c.statut)) {
      return statutRequis(res, 'constatation', 'en_preparation');
    }
    if (await refusProcessus(req, res, c, 'preparation')) return undefined;
    await db.update('constatations', c.id, {
      statut: 'direct_soumis',
      date_soumission_pac: db.now(),
      soumis_par: req.user.username,
      motif_rejet_pac: '',
    });
    res.json({ status: 'ok', statut: 'direct_soumis' });
  }));

  // ── Commentaires de validation ──
  // Le valideur annote la constatation champ par champ avant de se prononcer,
  // comme sur la fiche d'inspection du module RAMP. Les commentaires vivent
  // par versions : celle en cours se modifie tant que la constatation est
  // soumise ; la décision la fige, et le tour suivant en ouvre une nouvelle.
  const versionOuverte = (c) => (c.commentaires_validation || []).find((v) => !v.close_le) || null;

  app.put(`${M}/constatations/:id/commentaires-validation`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) {
      return refuser(res);
    }
    if (c.statut !== 'direct_soumis') {
      return statutRequis(res, 'constatation', 'soumis');
    }
    const entrees = (Array.isArray((req.body || {}).entrees) ? req.body.entrees : [])
      .map((e) => ({ cible: String(e.cible || '').trim(), texte: String(e.texte || '').trim() }))
      .filter((e) => e.texte);

    const versions = (c.commentaires_validation || []).slice();
    const ouverte = versionOuverte(c);
    if (ouverte) {
      ouverte.entrees = entrees;
      ouverte.modifie_le = db.now();
    } else {
      versions.push({
        version: versions.length + 1,
        cree_par: req.user.username,
        cree_le: db.now(),
        modifie_le: db.now(),
        entrees,
        close_le: '', close_par: '', issue: '',
      });
    }
    await db.update('constatations', c.id, { commentaires_validation: versions });
    return res.json({ status: 'ok' });
  }));

  // La décision ferme la version en cours : elle devient l'archive de ce qui
  // a été observé à ce tour.
  function clore(c, req, issue) {
    const versions = (c.commentaires_validation || []).slice();
    const ouverte = versions.find((v) => !v.close_le);
    if (!ouverte) return null;
    ouverte.close_le = db.now();
    ouverte.close_par = req.user.username;
    ouverte.issue = issue;
    return versions;
  }

  // Décisions de validation : valider, renvoyer pour correction, rejeter. Le
  // motif est exigé pour les deux dernières — une décision qui arrête ou
  // renvoie un dossier doit se justifier.
  const decision = (route, statut, champs, motifRequis, issue) => {
    app.put(`${M}/constatations/:id/${route}`, requireAuth, asynchrone(async (req, res) => {
      const c = await db.get('constatations', req.params.id);
      if (!c) return introuvable(res, 'constatation');
      if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) {
        return refuser(res);
      }
      if (c.statut !== 'direct_soumis') {
        return statutRequis(res, 'constatation', 'soumis');
      }
      if (await refusProcessus(req, res, c, 'validation')) return undefined;
      const d = req.body || {};
      const motif = String(d.motif || '').trim();
      if (motifRequis && !motif) return requis(res, 'motif');
      const versions = clore(c, req, issue);
      await db.update('constatations', c.id, {
        statut,
        ...champs(motif, req.user.username),
        // Le journal des décisions est composé par le client, qui connaît le
        // fil affiché ; on le reprend tel quel s'il est fourni.
        ...(Array.isArray(d.decisions_validation) ? { decisions_validation: d.decisions_validation } : {}),
        ...(versions ? { commentaires_validation: versions } : {}),
      });
      res.json({ status: 'ok', statut });
    }));
  };

  decision('direct-valider', 'direct_valide',
    (motif, user) => ({ date_validation_pac: db.now(), valide_par: user, motif_rejet_pac: '' }),
    false, 'validation');
  decision('direct-renvoyer', 'direct_renvoye',
    (motif, user) => ({ motif_renvoi: motif, date_renvoi: db.now(), renvoye_par: user }),
    true, 'renvoi');
  decision('direct-rejeter', 'direct_rejete',
    (motif, user) => ({ motif_rejet_pac: motif, date_rejet_pac: db.now(), rejete_par: user }),
    true, 'rejet');

  app.put(`${M}/constatations/:id/submit-pac`, requireAuth, asynchrone(async (req, res) => {
    // Déposer un plan d'actions correctives est un droit confié au compte.
    if (!R.compteA(req.user, 'constatations', auth)) return refuser(res, 'Droit non confié à ce compte');
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    // « pac_valide » : le plan avait été accepté, le prestataire l'amende.
    if (!['ouverte', 'ouvert', 'pac_rejetee', 'pac_valide'].includes(c.statut)) {
      return res.status(400).json({ error: 'La FNC doit être ouverte, PAC rejetée ou PAC accepté pour soumettre un PAC' });
    }
    const d = req.body || {};
    const amendement = c.statut === 'pac_valide';
    const patch = {
      statut: 'pac_soumis',
      actions_correctives: d.actions_correctives || [],
      date_soumission_pac: db.now(),
    };
    patch.commentaire_evaluation = fusionEvaluationPostulant(c, d.evaluation, amendement);
    if (amendement) {
      // Le plan accepté est archivé avec l'acceptation qui le portait, puis
      // l'acceptation tombe : le circuit repart de l'étape « Acceptation ».
      const ancienne = evaluationDe(c);
      // On archive le plan tel qu'il a été accepté, non le plan courant :
      // un brouillon enregistré avant la soumission l'aurait déjà modifié.
      const accepte = ((c.pac_accepte || {}).actions_correctives || c.actions_correctives || []);
      patch.versions_pac = (c.versions_pac || []).concat([{
        date: db.now(),
        auteur: req.user.username,
        actions_correctives: accepte,
        acceptation: (ancienne.evaluation_anac || {}).acceptation || {},
        motifs_amendement: (d.actions_correctives || [{}])[0]
          ? (d.actions_correctives[0].motifs_amendement || null) : null,
      }]);
      // L'empreinte a servi : elle sera reprise à la prochaine acceptation.
      patch.pac_accepte = null;
    }
    await db.update('constatations', c.id, patch);
    res.json({ status: 'ok', statut: 'pac_soumis', amendement });
  }));

  // Dépôt des preuves de mise en oeuvre : le plan accepté ne bouge pas, le
  // circuit reste à l'étape « Mise en oeuvre ».
  app.put(`${M}/constatations/:id/submit-preuves`, requireAuth, asynchrone(async (req, res) => {
    if (!R.compteA(req.user, 'constatations', auth)) return refuser(res, 'Droit non confié à ce compte');
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (c.statut !== 'pac_valide') {
      return statutRequis(res, 'pac', 'accepte');
    }
    const d = req.body || {};
    const patch = {
      actions_correctives: d.actions_correctives || c.actions_correctives || [],
      date_preuves_mise_oeuvre: db.now(),
    };
    patch.commentaire_evaluation = fusionEvaluationPostulant(c, d.evaluation, false);
    await db.update('constatations', c.id, patch);
    res.json({ status: 'ok', statut: c.statut });
  }));

  app.put(`${M}/constatations/:id/validate-pac`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    if (c.statut !== 'pac_soumis') return statutRequis(res, 'pac', 'soumis');
    if (await refusProcessus(req, res, c, 'pac_acceptation')) return undefined;
    await db.update('constatations', c.id, {
      statut: 'pac_valide', valideur_pac_id: req.user.username,
      date_validation_pac: db.now(), commentaire_evaluation: (req.body || {}).evaluation || '',
      // Empreinte du plan au moment de l'acceptation : c'est à elle que se
      // compare un amendement, et non au plan courant — qu'un enregistrement
      // en brouillon aurait déjà modifié.
      pac_accepte: { date: db.now(), actions_correctives: c.actions_correctives || [] },
    });
    res.json({ status: 'ok', statut: 'pac_valide' });
  }));

  app.put(`${M}/constatations/:id/reject-pac`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    if (c.statut !== 'pac_soumis') return statutRequis(res, 'pac', 'soumis');
    if (await refusProcessus(req, res, c, 'pac_acceptation')) return undefined;
    const d = req.body || {};
    await db.update('constatations', c.id, {
      statut: 'pac_rejetee', motif_rejet_pac: d.motif || '',
      date_rejet_pac: db.now(), commentaire_evaluation: d.commentaire_evaluation || '',
    });
    res.json({ status: 'ok', statut: 'pac_rejetee' });
  }));

  app.put(`${M}/constatations/:id/close`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    if (c.statut === 'soldee') return dejaFait(res, 'fnc', 'solde');
    if (await refusProcessus(req, res, c, 'pac_cloture')) return undefined;
    const d = req.body || {};
    await db.update('constatations', c.id, {
      statut: 'soldee',
      commentaire_evaluation: d.evaluation || d.commentaire || '',
      date_solde: db.now(),
    });
    res.json({ status: 'ok', statut: 'soldee' });
  }));

  // Transmission d'une constatation hors activités de supervision. Le courriel
  // ne porte que des liens (voir transmission.js) ; la remise ouvre la
  // constatation, qui entre alors dans le suivi du PAC.
  app.post(`${M}/constatations/:id/transmettre`, requireAuth, asynchrone(async (req, res) => {
    const c = await db.get('constatations', req.params.id);
    if (!c) return introuvable(res, 'constatation');
    // Même règle que pour un rapport : c'est l'Autorité qui notifie.
    if (R.estPrestataire(req.user)) return refuser(res, "Transmission réservée à l'Autorité");
    if (!R.canValidate(req.user, perimetrePrestataire(c.prestataire_id), referentiels)) return refuser(res);
    if (c.statut !== 'direct_valide') {
      return statutRequis(res, 'constatation', 'valide');
    }
    if (await refusProcessus(req, res, c, 'transmission')) return undefined;

    let remise;
    try {
      remise = await transmission.transmettre(req.body || {}, {
        dossierUploads: transmission.DOSSIER_UPLOADS,
        nomDePresentation: transmission.nomDePresentation,
        base: c.reference || 'constatation',
        origine: 'transmission_constatation',
        reference: c.reference || '',
        prestataire_id: c.prestataire_id || '',
        journal: { constatation_id: c.id },
      });
    } catch (e) {
      return transmission.repondreErreur(res, e);
    }

    const maintenant = db.now();
    await db.update('constatations', c.id, {
      statut: 'ouvert',
      date_ouverture: maintenant.slice(0, 10),
      date_transmission: maintenant,
      transmis_par: req.user.username,
      transmis_a: remise.destinataires.join(', '),
      document: remise.document,
      pieces_transmises: remise.jointes,
    });
    res.json({ status: 'ok', statut: 'ouvert', destinataires: remise.destinataires, envoye: remise.envoye });
  }));

  app.delete(`${M}/constatations/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return reserve(res, 'administrateurs');
    if (!await db.get('constatations', req.params.id)) return introuvable(res, 'constatation');
    if (await suitesCare.refusSiSuites(res, suitesCare.clesSurv([req.params.id]))) return undefined;
    // Retirée, non détruite : une mesure d'application a pu être prononcée dessus
    // entre la vérification ci-dessus et cette ligne, et elle garde son fondement
    // (décision du 3 octobre 2026 — voir l'en-tête de `src/suites_care.js`).
    await db.retirer('constatations', req.params.id, req.user.username);
    res.json({ status: 'ok' });
  }));
};
