// Module « Exécution de la Surveillance » — rapports, tableau de bord,
// téléversements et suppressions administrateur.
const fs = require('fs');
const { asynchrone } = require('../../route');
const path = require('path');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const services = require('../../services');
const transmission = require('./transmission');
const multipart = require('../../multipart');
const db = require('./store');
const refModele = require('./references');
const R = require('./roles');
const acteurs = require('./acteurs');
const instances = require('../../instances');
const suitesCare = require('../../suites_care');
const { introuvable, requis, reserve, refuser, statutRequis } = require('../../erreurs');

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

  // Instance regardée : les listes et le tableau de bord ne comptent que ses
  // dossiers. Le choix suit le compte réellement connecté.
  const instanceCourante = (req) => instances.courante(req.userReel || req.user, loadConfig);
  const parInstance = (req, rangs) => instances.filtrer(rangs, instanceCourante(req), loadConfig);

  // Éléments de composition des références, tirés du dossier ou du rapport.
  const contexteRefRapport = (req, d) => {
    const tous = refs();
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
  const parId = (coll, id) => (refs()[coll] || []).find((x) => x.id === id) || null;

  const perimetrePrestataire = (prestataireId) => {
    const p = parId('prestataires', prestataireId) || {};
    const s = parId('secteurs', p.secteur_id) || {};
    return { domaine_id: p.domaine_id || s.domaine_id || '', secteur_id: p.secteur_id || '', prestataire_id: prestataireId || '' };
  };

  // Restriction par processus, sur les étapes décisives du rapport.
  const refusProcessus = async (req, res, r, cle) => {
    const perim = perimetrePrestataire(r.prestataire_id);
    const dossier = await db.get('dossiers', r.dossier_id) || null;
    const motif = await acteurs.refusEventuel(req.user, 'activite', {
      secteur_id: perim.secteur_id, domaine_id: perim.domaine_id, dossier,
    }, cle);
    if (!motif) return false;
    res.status(403).json({ error: motif });
    return true;
  };

  // ══════════════════════════════════════
  //  Rapports
  // ══════════════════════════════════════
  const enrichirRapport = async (r) => {
    const d = await db.get('dossiers', r.dossier_id) || {};
    const n = await db.get('notifications', d.notification_id) || {};
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

  app.get(`${M}/rapports`, requireAuth, asynchrone(async (req, res) => {
    const prestataire = R.estPrestataire(req.user);
    const miens = R.prestatairesDe(req.user);
    if (prestataire && !miens.length) return res.json([]);

    if (!R.canRead(req.userReel || req.user)) return refuser(res);
    let rows = await Promise.all(parInstance(req, await db.list('rapports')).map(enrichirRapport));
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
  }));

  app.get(`${M}/rapports/:id`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    const enrichi = await enrichirRapport(r);
    if (R.estPrestataire(req.user)) {
      if (!R.accedeA(req.user, enrichi.dossier_prestataire_id || '') || r.statut !== 'transmis') {
        return refuser(res);
      }
    }
    res.json(enrichi);
  }));

  app.post(`${M}/rapports`, requireAuth, asynchrone(async (req, res) => {
    const d = req.body || {};
    const dossier = await db.get('dossiers', d.dossier_id || '');
    if (!dossier) return introuvable(res, 'dossier');
    if (!R.canContribute(req.user, perimetrePrestataire(dossier.prestataire_id), referentiels)) return refuser(res);
    const rec = await refModele.insererAvec('rapports', 'rapport', contexteRefRapport(req, req.body || {}), {
      id: db.uid('rpt'),
      dossier_id: dossier.id,
      // Le rapport appartient à l'instance de son dossier.
      instance: instances.de(dossier, loadConfig),
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
  }));

  // Signature du rapport. Aucun écran ne les appelle aujourd'hui — la
  // transmission courante passe par /send et /transmettre — mais le circuit
  // signé reste servi et couvert par le smoke : il attend son écran.
  app.put(`${M}/rapports/:id/sign-inspector`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canContribute(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    await db.update('rapports', r.id, { signe_par_inspecteur: req.user.username, date_signature_inspecteur: db.now() });
    res.json({ status: 'ok', signe_inspecteur: true });
  }));

  app.put(`${M}/rapports/:id/sign-director`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) {
      return refuser(res);
    }
    await db.update('rapports', r.id, { signe_par_directeur: req.user.username, date_signature_directeur: db.now() });
    res.json({ status: 'ok', signe_directeur: true });
  }));

  // Validation : le rapport reçoit la référence définitive du dossier.
  app.put(`${M}/rapports/:id/validate`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (r.statut !== 'soumis') return statutRequis(res, 'rapport', 'soumis');
    if (await refusProcessus(req, res, r, 'validation')) return undefined;
    const dossier = await db.get('dossiers', r.dossier_id) || {};
    // ── La validation du rapport final, d'un seul geste ──
    //
    // Elle pose le statut et la référence finale du rapport, la reporte sur le
    // dossier, **et rend opposables les constatations en brouillon**. C'était une
    // écriture pour le rapport, une pour le dossier, et une par constatation.
    //
    // La référence finale se tire **dans** la transformation : elle se déduit des
    // références existantes, sans compteur persisté, et deux validations
    // simultanées auraient porté la même — or elle désigne un acte de surveillance.
    const maintenantR = db.now();
    let refFinale = dossier.final_reference || '';
    await db.transformer((etat) => {
      if (!dossier.final_reference) {
        refFinale = refModele.suivanteDans(etat, 'rapport_final', contexteRefRapport(req, dossier));
      }
      const rapports = etat.rapports || [];
      const i = rapports.findIndex((x) => x.id === r.id);
      if (i >= 0) {
        // La date et l'auteur de la validation nourrissent l'historique.
        rapports[i] = {
          ...rapports[i],
          statut: 'valide', reference: refFinale,
          date_validation: maintenantR, valide_par: req.user.username,
        };
      }
      if (dossier.id) {
        const dossiers = etat.dossiers || [];
        const j = dossiers.findIndex((x) => x.id === dossier.id);
        if (j >= 0) dossiers[j] = { ...dossiers[j], final_reference: refFinale, date_maj: maintenantR };
      }
      etat.constatations = (etat.constatations || []).map((c) => (c.dossier_id === r.dossier_id && c.statut === 'brouillon'
        ? { ...c, statut: 'ouvert' } : c));
      return etat;
    });
    res.json({ status: 'ok', final_reference: refFinale });
  }));

  // Amendement : un rapport validé repasse en rédaction.
  app.put(`${M}/rapports/:id/amend`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (r.statut !== 'valide') return statutRequis(res, 'rapport', 'valide');
    const observations = (req.body || {}).observations || '';
    // L'amendement défait la validation d'un seul geste, comme elle s'était faite :
    // le rapport, le dossier, et les constatations qui redeviennent inopposables.
    // Trois écritures séparées laissaient un rapport amendé dont les constatations
    // restaient opposables au prestataire — ce qui n'est pas défendable.
    const maintenantA = db.now();
    await db.transformer((etat) => {
      const rapports = etat.rapports || [];
      const i = rapports.findIndex((x) => x.id === r.id);
      if (i >= 0) rapports[i] = { ...rapports[i], statut: 'brouillon', observations_validation: observations };
      const dossiers = etat.dossiers || [];
      const j = dossiers.findIndex((x) => x.id === r.dossier_id);
      if (j >= 0) {
        dossiers[j] = {
          ...dossiers[j],
          statut: 'brouillon', observations_retour: observations, date_maj: maintenantA,
          redaction_closed: 0, current_step: 'redaction',
        };
      }
      // La validation rendait les constatations opposables ; l'amendement les
      // remet en brouillon, le rapport qui les portait n'étant plus validé.
      // Celles qui ont déjà avancé (PAC engagé, soldées) ne sont pas touchées.
      etat.constatations = (etat.constatations || []).map((c) => (c.dossier_id === r.dossier_id && c.statut === 'ouvert'
        ? { ...c, statut: 'brouillon' } : c));
      return etat;
    });
    res.json({ status: 'ok' });
  }));

  app.put(`${M}/rapports/:id/apercu-comments`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    await db.update('rapports', r.id, { commentaires_apercu: (req.body || {}).commentaires || '' });
    res.json({ status: 'ok' });
  }));

  // Transmission : exige les deux signatures.
  // Transmission du rapport signé : elle exige les deux signatures. Voie
  // conservée du portage PESSCO, sans écran à ce jour.
  app.put(`${M}/rapports/:id/transmit`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canContribute(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (!r.signe_par_inspecteur || !r.signe_par_directeur) {
      return res.status(400).json({ error: "Le rapport doit être signé par l'inspecteur et le directeur avant transmission" });
    }
    if (await refusProcessus(req, res, r, 'transmission')) return undefined;
    // La transmission et ce qu'elle rend opposable, d'un seul geste : un rapport
    // transmis dont les constatations ne le sont pas encore laisse le prestataire
    // sans objet à traiter.
    const quand = db.now();
    await db.transformer((etat) => {
      const rapports = etat.rapports || [];
      const i = rapports.findIndex((x) => x.id === r.id);
      if (i >= 0) {
        rapports[i] = {
          ...rapports[i], statut: 'transmis', date_transmission: quand, transmis_par: req.user.username,
        };
      }
      etat.constatations = (etat.constatations || []).map((c) => (c.dossier_id === r.dossier_id && c.statut === 'brouillon'
        ? { ...c, statut: 'ouvert' } : c));
      return etat;
    });
    return res.json({ status: 'ok', statut: 'transmis' });
  }));

  // Transmission simple : le rapport validé passe à « transmis » et ouvre les
  // constatations restées en brouillon. La remise par courriel, avec ses liens
  // de téléchargement, se fait par POST /transmettre.
  app.put(`${M}/rapports/:id/send`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    if (!R.canContribute(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (r.statut !== 'valide') return statutRequis(res, 'rapport', 'valide');
    if (await refusProcessus(req, res, r, 'transmission')) return undefined;
    const maintenant = db.now();
    await db.update('rapports', r.id, { statut: 'transmis', date_transmission: maintenant, transmis_par: req.user.username });
    if (r.dossier_id) await db.update('dossiers', r.dossier_id, { date_maj: maintenant });
    res.json({ status: 'ok', statut: 'transmis' });
  }));

  // Transmission par courriel du rapport validé : le message ne porte que des
  // liens, la mécanique est commune à toutes les remises (voir transmission.js).
  // L'envoi vaut transmission — inutile de l'acter deux fois — et ouvre les
  // constatations restées en brouillon, comme /send.
  app.post(`${M}/rapports/:id/transmettre`, requireAuth, asynchrone(async (req, res) => {
    const r = await db.get('rapports', req.params.id);
    if (!r) return introuvable(res, 'rapport');
    // La transmission part du serveur de messagerie de l'Autorité et fige le
    // document officiel : elle appartient au valideur, jamais à l'organisme
    // surveillé — pour qui « contribuer » ne veut dire que « être concerné ».
    if (R.estPrestataire(req.user)) return refuser(res, "Transmission réservée à l'Autorité");
    if (!R.canValidate(req.user, perimetrePrestataire(r.prestataire_id), referentiels)) return refuser(res);
    if (!['valide', 'transmis'].includes(r.statut)) {
      return statutRequis(res, 'rapport', 'valide');
    }
    if (await refusProcessus(req, res, r, 'transmission')) return undefined;

    let remise;
    try {
      remise = await transmission.transmettre(req.body || {}, {
        dossierUploads: DOSSIER_UPLOADS,
        nomDePresentation,
        base: r.reference || 'rapport',
        origine: 'transmission_rapport',
        reference: r.reference || '',
        prestataire_id: r.prestataire_id || '',
        journal: { rapport_id: r.id },
      });
    } catch (e) {
      return transmission.repondreErreur(res, e);
    }

    const maintenant = db.now();
    // Mêmes raisons : le rapport, ses constatations devenues opposables, et la
    // date du dossier — trois écritures séparées devenues une.
    await db.transformer((etat) => {
      const rapports = etat.rapports || [];
      const i = rapports.findIndex((x) => x.id === r.id);
      if (i >= 0) {
        rapports[i] = {
          ...rapports[i],
          statut: 'transmis', date_transmission: maintenant,
          transmis_par: req.user.username, transmis_a: remise.destinataires.join(', '),
          document: remise.document, pieces_transmises: remise.jointes,
        };
      }
      etat.constatations = (etat.constatations || []).map((c) => (c.dossier_id === r.dossier_id && c.statut === 'brouillon'
        ? { ...c, statut: 'ouvert' } : c));
      if (r.dossier_id) {
        const dossiers = etat.dossiers || [];
        const j = dossiers.findIndex((x) => x.id === r.dossier_id);
        if (j >= 0) dossiers[j] = { ...dossiers[j], date_maj: maintenant };
      }
      return etat;
    });
    return res.json({ status: 'ok', statut: 'transmis', destinataires: remise.destinataires, envoye: remise.envoye });
  }));

  app.delete(`${M}/rapports/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return reserve(res, 'administrateurs');
    if (!await db.get('rapports', req.params.id)) return introuvable(res, 'rapport');
    await db.remove('rapports', req.params.id);
    res.json({ status: 'ok' });
  }));

  // Une activité supprimée redevient « à notifier » : notification, dossier,
  // constatations et rapports associés disparaissent.
  app.delete(`${M}/activites/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return reserve(res, 'administrateurs');
    const notif = (await db.list('notifications')).find((n) => n.activite_id === req.params.id);
    if (notif) {
      const dossier = (await db.list('dossiers')).find((d) => d.notification_id === notif.id);
      // Une constatation reprise par « Mesures d'Application » fonde ce qui y a
      // été décidé : l'acte qui la porte ne se défait plus.
      const fncs = dossier ? (await db.list('constatations')).filter((c) => c.dossier_id === dossier.id).map((c) => c.id) : [];
      if (await suitesCare.refusSiSuites(res, suitesCare.clesSurv(fncs))) return undefined;
      if (dossier) await db.removeDossier(dossier.id, req.user.username);
      await db.removeWhere('echanges', (e) => e.notification_id === notif.id);
      await db.remove('notifications', notif.id);
    }
    res.json({ status: 'ok' });
  }));

  // ══════════════════════════════════════
  //  Tableau de bord
  // ══════════════════════════════════════
  app.get(`${M}/dashboard-stats`, requireAuth, asynchrone(async (req, res) => {
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

    const notifs = parInstance(req, await db.list('notifications'))
      .filter((n) => mien(n) && String(n.date_creation || '') >= debutAnnee);
    const dossiers = parInstance(req, await db.list('dossiers')).filter(mien);
    const idsDossiers = new Set(dossiers.map((d) => d.id));
    const fnc = parInstance(req, await db.list('constatations'))
      .filter((c) => mien(c) || idsDossiers.has(c.dossier_id));
    // Statuts sous lesquels une constatation est notifiée au prestataire.
    const EN_VIGUEUR = ['ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee'];
    const enVigueur = (c) => EN_VIGUEUR.includes(c.statut);
    const rapports = parInstance(req, await db.list('rapports'))
      .filter((r) => (!prestataire || idsDossiers.has(r.dossier_id)) && String(r.date_creation || '') >= debutAnnee);

    // Activités planifiées : le module Planification reste la source, et les
    // plans y portent l'instance qui les a programmés.
    const plans = parInstance(req, await services.callOr('PLAN.plansValides', []));
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
      // Une constatation compte dès qu'elle est notifiée au prestataire, quelle
      // que soit son origine — activité de surveillance ou hors activité. Un
      // brouillon, une soumission ou un rejet n'existent pas pour lui.
      fnc_en_vigueur: fnc.filter(enVigueur).length,
      fnc_hors_activite: fnc.filter((c) => enVigueur(c) && !c.dossier_id).length,
      fnc_ouvertes: fnc.filter((c) => enVigueur(c) && c.statut !== 'soldee').length,
      fnc_critiques: fnc.filter((c) => enVigueur(c) && c.statut !== 'soldee'
        && String(c.criticite || c.gravite || '').toLowerCase() === 'critique').length,
      fnc_soldees_ytd: fnc.filter((c) => c.statut === 'soldee' && String(c.date_solde || '') >= debutAnnee).length,
      rapports_total_ytd: rapports.length,
      rapports_transmis_ytd: rapports.filter((r) => r.statut === 'transmis').length,
    });
  }));

  // ══════════════════════════════════════
  //  Pièces jointes
  // ══════════════════════════════════════
  // Nom de présentation d'une pièce : l'intitulé saisi remplace le nom
  // d'origine. Séparateurs, caractères de contrôle et extension parasite sont
  // écartés ; l'extension réelle du fichier est réappliquée.
  const nomDePresentation = (propose, ext) => {
    const base = String(propose || '')
      .replace(/[\\/\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(new RegExp(`${ext.replace('.', '\\.')}$`, 'i'), '')
      .slice(0, 120)
      .trim();
    return `${base || 'piece-jointe'}${ext}`;
  };

  app.post(`${M}/upload`, requireAuth, multipart(), asynchrone(async (req, res) => {
    if (!R.canContribute(req.user, null, referentiels)) return refuser(res);
    const f = (req.files || {}).file;
    if (!f) return requis(res, 'fichier');
    if (!f.filename) return res.status(400).json({ error: 'Nom de fichier vide' });
    const ext = path.extname(f.filename).toLowerCase();
    if (!EXTENSIONS.includes(ext)) return res.status(400).json({ error: 'Type de fichier non autorisé' });
    fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
    const nom = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_UPLOADS, nom), f.buffer);
    res.status(201).json({
      status: 'ok',
      // Le nom d'origine ne ressort pas : c'est l'intitulé qui nomme la pièce.
      filename: nomDePresentation((req.body || {}).nom, ext),
      path: `/api/m/execution/uploads/${nom}`, size: f.buffer.length,
    });
  }));

  app.get(`${M}/uploads/:fichier`, requireAuth, asynchrone(async (req, res) => {
    const nom = path.basename(req.params.fichier);
    const chemin = path.join(DOSSIER_UPLOADS, nom);
    if (!fs.existsSync(chemin)) return introuvable(res, 'fichier');
    // Ouverture dans l'onglet, sous l'intitulé de la pièce quand il est fourni.
    const affiche = nomDePresentation(req.query.nom || nom, path.extname(nom).toLowerCase());
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(affiche)}`);
    res.sendFile(chemin);
  }));

  // ── Remise d'un document bureautique composé par le front ──
  // Le module s'affiche dans une iframe : selon le navigateur, le
  // téléchargement d'une URL blob: y est ignoré sans le moindre message. Le
  // front dépose donc le document composé, puis le réclame par une requête
  // GET — le chemin qu'empruntent déjà les exports de classeurs.
  // Le dépôt est éphémère, nominatif et à usage unique.
  const documentsEnAttente = new Map();
  const PEREMPTION_DOC_MS = 60 * 1000;
  const proprietaire = (u) => String((u && (u.id || u.email)) || '');
  const purgerDocuments = () => {
    const maintenant = Date.now();
    for (const [jeton, doc] of documentsEnAttente) {
      if (doc.expire < maintenant) documentsEnAttente.delete(jeton);
    }
  };

  app.post(`${M}/documents/word`, requireAuth, asynchrone(async (req, res) => {
    const contenu = String((req.body || {}).contenu || '');
    if (!contenu) return res.status(400).json({ error: 'Document vide' });
    purgerDocuments();
    const jeton = crypto.randomBytes(16).toString('hex');
    documentsEnAttente.set(jeton, {
      contenu,
      nom: nomDePresentation((req.body || {}).nom || 'document', '.doc'),
      auteur: proprietaire(req.user),
      expire: Date.now() + PEREMPTION_DOC_MS,
    });
    res.json({ jeton });
  }));

  app.get(`${M}/documents/word/:jeton`, requireAuth, asynchrone(async (req, res) => {
    purgerDocuments();
    const doc = documentsEnAttente.get(req.params.jeton);
    if (!doc || doc.auteur !== proprietaire(req.user)) {
      return res.status(404).json({ error: 'Document expiré' });
    }
    documentsEnAttente.delete(req.params.jeton);
    // Le document part en pièce jointe, jamais rendu par le navigateur :
    // nosniff interdit de le réinterpréter comme du HTML exécutable.
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(doc.nom)}`);
    res.send(`﻿${doc.contenu}`);
  }));
};
