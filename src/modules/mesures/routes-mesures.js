// Module « Mesures d'Application » — les mesures elles-mêmes.
//
// Circuit d'une mesure, repris de PESSCO :
//   projet → notifiée → (en cours) → clôturée
// La notification et la clôture relèvent du validateur ; la suppression, du
// seul gestionnaire du module. Une mesure clôturée ne se réécrit plus.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const services = require('../../services');
const multipart = require('../../multipart');
const pdf = require('../../pdf');
const rapport = require('./rapport-investigation');
const db = require('./store');
const R = require('./roles');

// Les pièces jointes du module vivent hors de data/ : ce sont des fichiers,
// pas des enregistrements.
const DOSSIER_UPLOADS = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'mesures',
);
const EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.csv'];

// Statuts du circuit. « annulee » clôt une mesure abandonnée sans la
// supprimer : la trace de la décision reste.
const STATUTS = ['projet', 'notifiee', 'en_cours', 'cloturee', 'annulee'];
const CLOS = ['cloturee', 'annulee'];

// Champs que le client peut écrire. Le statut et les dates de décision n'y
// figurent pas : ils sont posés par les transitions, jamais par un PUT.
const CHAMPS = [
  'constatation_id', 'prestataire_id', 'categorie', 'type_mesure', 'objet',
  'description', 'date_emission', 'delai_jours', 'date_echeance',
  'avis_commission', 'motif', 'pieces_jointes',
  'preuves_constatation', 'preuves_cloture', 'montant_amende',
];

const LISTES = ['pieces_jointes', 'preuves_constatation', 'preuves_cloture'];

module.exports = function register(app, deps, M) {
  const { requireAuth } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const refs = () => referentiels.getAll();

  // Les constatations viennent des modules qui les relèvent, par le bus de
  // services : « Exécution de la Surveillance » pour les constatations de
  // surveillance, « RAMP Inspections » pour les écarts de catégorie 3 relevés
  // sur aire de trafic. Ce module ne lit jamais leurs données directement, et
  // l'absence de l'un comme de l'autre ne l'empêche pas de fonctionner — la
  // liste correspondante est alors vide.
  const SOURCES = ['SURV.constatationsOuvertes', 'SAFA.constatationsCritiques'];
  // S'y ajoutent celles que le module relève lui-même : tout ne vient pas d'un
  // acte de surveillance ou d'une inspection sur aire de trafic — un
  // signalement, un contrôle inopiné, une saisine appellent aussi une mesure.
  const constatations = () => SOURCES
    .flatMap((nom) => services.callOr(nom, []))
    .filter(Boolean)
    .concat(db.list('constatations').map((c) => ({ ...c, origine: 'CARE' })));

  const perimetre = (m) => R.perimetreDuPrestataire((m || {}).prestataire_id, referentiels);
  const peutEcrire = (req, m) => R.canContribute(req.user, perimetre(m));
  const peutDecider = (req, m) => R.canValidate(req.user, perimetre(m));

  // Index des constatations, construit une fois par requête. Le rebâtir pour
  // chaque mesure ferait reparcourir tous les écarts du module RAMP autant de
  // fois qu'il y a de mesures.
  const indexConstatations = () => new Map(constatations().map((c) => [c.id, c]));

  // Une mesure sort enrichie : le nom du prestataire et la référence de la
  // constatation liée se lisent à l'affichage, ils ne sont pas stockés.
  // `index` est l'index des constatations ; sans lui, il est construit ici —
  // ce qui ne vaut que pour une mesure isolée.
  const enrichir = (m, index) => {
    if (!m) return m;
    const p = (refs().prestataires || []).find((x) => x.id === m.prestataire_id) || {};
    const c = (index || indexConstatations()).get(m.constatation_id) || {};
    return {
      ...m,
      // Le référentiel nomme le prestataire quand la mesure l'identifie. Une
      // carence venue de « RAMP Inspections » nomme parfois l'exploitant sans
      // le rattacher au référentiel : le nom retenu à la carence prend alors
      // le relais, plutôt que de laisser la colonne vide.
      prestataire_nom: p.nom || m.prestataire_nom || c.prestataire_nom || '',
      prestataire_trigramme: p.trigramme || '',
      constatation_ref: c.reference || '',
      constatation_criticite: c.criticite || '',
    };
  };

  // Une pièce jointe désigne un fichier que ce module a reçu : son chemin est
  // celui que /upload a rendu, et rien d'autre. Sans ce contrôle, un « path »
  // choisi par l'appelant devenait le lien qu'un autre agent allait suivre.
  const texte = (v) => String(v === undefined || v === null ? '' : v).trim();
  const CHEMIN_PIECE = /^\/api\/m\/mesures\/uploads\/[A-Za-z0-9._-]+$/;
  const piece = (p) => {
    const o = p && typeof p === 'object' ? p : {};
    const chemin = String(o.path || '');
    return {
      nom: String(o.nom || o.filename || ''),
      path: CHEMIN_PIECE.test(chemin) ? chemin : '',
      size: Number(o.size) || 0,
    };
  };

  const normaliser = (d) => {
    const patch = {};
    CHAMPS.forEach((k) => {
      if (!(k in d)) return;
      let v = d[k];
      if (LISTES.includes(k)) v = (Array.isArray(v) ? v : []).map(piece);
      else if (k === 'delai_jours' || k === 'montant_amende') v = String(v == null ? '' : v);
      else v = String(v == null ? '' : v);
      patch[k] = v;
    });
    return patch;
  };

  // ══════════════════════════════════════
  //  Lecture
  // ══════════════════════════════════════

  // Une mesure ne se lit que par un compte de l'Autorité, et dans sa portée.
  const lisible = (req, m) => R.canRead(req.user, perimetre(m));

  app.get(`${M}/mesures`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const q = req.query || {};
    let liste = db.list('mesures');
    if (q.statut) liste = liste.filter((m) => m.statut === q.statut);
    if (q.categorie) liste = liste.filter((m) => m.categorie === q.categorie);
    if (q.prestataire_id) liste = liste.filter((m) => m.prestataire_id === q.prestataire_id);
    if (q.constatation_id) liste = liste.filter((m) => m.constatation_id === q.constatation_id);
    liste = liste.filter((m) => lisible(req, m));
    liste = liste.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    const index = indexConstatations();
    res.json(liste.map((m) => enrichir(m, index)));
  });

  app.get(`${M}/mesures/:id`, requireAuth, (req, res) => {
    const m = db.get('mesures', req.params.id);
    if (!m) return res.status(404).json({ error: 'Mesure non trouvée' });
    if (!lisible(req, m)) return refuser(res);
    res.json(enrichir(m));
  });

  // Constatations sur lesquelles une mesure peut être prise. Le module
  // Exécution les fournit ; il en donne aussi la criticité, dont dépend
  // l'écran « Constatations Critiques ».
  app.get(`${M}/constatations`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const mesures = db.list('mesures');
    const classements = new Map(db.list('classements').map((x) => [x.constatation_id, x]));
    // Étape du traitement, servie avec la carence : l'écran y lit le libellé
    // de son bouton d'action, sans interroger chaque dossier un à un.
    const traitements = new Map(db.list('traitements').map((x) => [x.constatation_id, x]));
    // Une infraction est close quand elle a été classée, ou quand toutes les
    // mesures qu'elle a values sont clôturées : c'est cette date que l'écran
    // porte en colonne « Clôture ».
    const cloture = (c, liees) => {
      const classee = classements.get(c.id);
      if (classee) return classee.date_cloture || '';
      if (!liees.length || !liees.every((m) => m.statut === 'cloturee' || m.statut === 'annulee')) return '';
      return liees.map((m) => m.date_cloture || '').filter(Boolean).sort().pop() || '';
    };
    res.json(constatations().map((c) => {
      const liees = mesures.filter((m) => m.constatation_id === c.id);
      const classee = classements.get(c.id) || null;
      // Statut au sens des mesures d'application : il dit où en est la
      // carence dans ce module, et non dans celui qui l'a relevée — une
      // constatation soldée chez le surveillant reste « à traiter » ici tant
      // qu'aucune décision n'a été prise.
      const closes = liees.filter((m) => CLOS.includes(m.statut)).length;
      const statutCare = classee ? 'classee'
        : (!liees.length ? 'a_traiter'
          : (closes === liees.length ? 'traitee' : 'sous_mesure'));
      return {
        ...c,
        mesures_liees: liees.length,
        mesures_closes: closes,
        classee: !!classee,
        classement_motif: classee ? classee.motif : '',
        traitement_etape: (traitements.get(c.id) || {}).etape || '',
        traitement_decision: (traitements.get(c.id) || {}).decision || '',
        date_cloture: cloture(c, liees),
        statut: classee ? 'classee' : c.statut,
        statut_care: statutCare,
      };
    }));
  });

  // Classement : l'autorité décide qu'aucune mesure ne sera prise. La décision
  // est consignée ici, quelle que soit l'origine de l'infraction.
  app.post(`${M}/constatations/:id/classer`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Infraction non trouvée' });
    if (!R.canValidate(req.user, perimetre(c))) return refuser(res, 'Classement réservé au validateur');
    if (db.list('mesures').some((m) => m.constatation_id === c.id)) {
      return res.status(400).json({ error: 'Une mesure a déjà été prise sur cette infraction' });
    }
    if (db.list('classements').some((x) => x.constatation_id === c.id)) {
      return res.status(400).json({ error: 'Infraction déjà classée' });
    }
    const motif = String((req.body || {}).motif || '').trim();
    db.insert('classements', {
      id: db.uid('cla'),
      constatation_id: c.id,
      motif,
      date_cloture: db.now().slice(0, 10),
      classe_par: req.user.username,
      date_creation: db.now(),
    });
    return res.status(201).json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Traitement d'une carence — fil d'avancement
  // ══════════════════════════════════════
  //
  // Quatre étapes : « Suite à donner », puis Investigations, Qualification et
  // Mesures, et Suivi des Mesures. Seule la première est instruite ici ; les
  // trois suivantes sont déclarées pour que le fil se lise en entier.
  const ETAPES = ['suite', 'investigations', 'qualification', 'suivi'];

  // La décision commande l'étape atteinte : classer clôt le fil, investiguer
  // et prendre des mesures le poussent d'un cran.
  const ETAPE_APRES_DECISION = {
    classer: 'suite',
    investiguer: 'investigations',
    mesures: 'qualification',
  };
  const DECISIONS = Object.keys(ETAPE_APRES_DECISION);

  // Le plan d'actions correctives vient du module qui a relevé la carence,
  // par le bus. Aucun des deux producteurs n'est requis : sans eux, la section
  // se présente vide plutôt que de faire échouer l'écran.
  const SOURCES_PAC = ['SURV.pacDeConstatation', 'SAFA.pacDeConstatation'];
  const pacDe = (id) => SOURCES_PAC
    .map((nom) => services.callOr(nom, {}))
    .map((tout) => (tout || {})[id])
    .find(Boolean) || null;

  const traitementDe = (id) => db.list('traitements').find((t) => t.constatation_id === id) || null;

  // Le traitement sort avec le plan d'actions qui l'a motivé : l'écran les lit
  // ensemble, il n'a pas à les demander séparément.
  app.get(`${M}/constatations/:id/traitement`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!R.canRead(req.user, perimetre(c))) return refuser(res);
    const t = traitementDe(c.id);
    res.json({
      constatation_id: c.id,
      etape: (t && t.etape) || 'suite',
      informations: (t && t.informations) || '',
      pieces: (t && t.pieces) || [],
      decision: (t && t.decision) || '',
      decision_motif: (t && t.decision_motif) || '',
      decide_le: (t && t.decide_le) || '',
      decide_par: (t && t.decide_par) || '',
      // Classement prononcé à la qualification : il clôt l'étape, qui passe
      // alors en lecture. Sans ces deux champs, l'écran ne pouvait pas le voir.
      classe_le: (t && t.classe_le) || '',
      classe_par: (t && t.classe_par) || '',
      qualifie_le: (t && t.qualifie_le) || '',
      qualifie_par: (t && t.qualifie_par) || '',
      investigation: (t && t.investigation)
        || { equipe: [], travaux: [], autres_texte: '', autres_pieces: [], rapport: '' },
      qualification: (t && t.qualification) || {
        comite_code: '', membres: [], reunions: [],
        infraction_constituee: false, infraction_non_constituee: false,
        renvoi_demande: false, renvoi_motif: '',
        nature: '', caracterisation: '', circonstances: '',
        mesures: [], pieces: [],
      },
      pac: pacDe(c.id),
      etapes: ETAPES,
    });
  });

  // Informations recueillies et pièces jointes : de la contribution. La
  // décision, elle, engage l'autorité — elle relève du validateur et passe par
  // sa propre route.
  app.put(`${M}/constatations/:id/traitement`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!peutEcrire(req, c)) return refuser(res);
    const d = req.body || {};
    const patch = {
      informations: texte(d.informations),
      pieces: Array.isArray(d.pieces) ? d.pieces.map(piece).filter((p) => p.nom || p.path) : [],
    };
    const t = traitementDe(c.id);
    if (t) db.update('traitements', t.id, patch);
    else {
      db.insert('traitements', {
        id: db.uid('trt'), constatation_id: c.id, etape: 'suite',
        decision: '', decision_motif: '', date_creation: db.now(), ...patch,
      });
    }
    return res.json({ status: 'ok' });
  });

  // ── Investigation ──
  // Rassembler les preuves matérielles et documentaires pour établir les faits :
  // qui a mené l'investigation, ce qui a été fait et trouvé, ce qui a été
  // collecté par ailleurs, et le rapport qui en tire l'analyse.
  const CHAMPS_ENQUETEUR = ['nom', 'prenom', 'email', 'contact'];
  const enqueteur = (p) => Object.fromEntries(CHAMPS_ENQUETEUR.map((k) => [k, texte((p || {})[k])]));

  const travail = (t) => ({
    type: texte((t || {}).type),
    resultats: texte((t || {}).resultats),
    pieces: Array.isArray((t || {}).pieces) ? (t || {}).pieces.map(piece).filter((p) => p.nom || p.path) : [],
  });

  const investigation = (d) => ({
    equipe: Array.isArray(d.equipe)
      ? d.equipe.map(enqueteur).filter((p) => p.nom || p.prenom || p.email || p.contact) : [],
    travaux: Array.isArray(d.travaux) ? d.travaux.map(travail).filter((t) => t.type || t.resultats || t.pieces.length) : [],
    autres_texte: texte(d.autres_texte),
    autres_pieces: Array.isArray(d.autres_pieces)
      ? d.autres_pieces.map(piece).filter((p) => p.nom || p.path) : [],
    rapport: texte(d.rapport),
  });

  app.put(`${M}/constatations/:id/investigation`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!peutEcrire(req, c)) return refuser(res);
    const t = traitementDe(c.id);
    // L'investigation ne s'ouvre qu'une fois la suite décidée : on ne consigne
    // pas des actes d'enquête sur une carence dont le sort n'est pas tranché.
    if (!t || t.decision !== 'investiguer') {
      return res.status(409).json({ error: 'La carence n’est pas à l’étape Investigations' });
    }
    // Une investigation soumise est close : elle se consulte, elle ne se
    // réécrit plus.
    const avant = t.investigation || {};
    if (avant.soumise_le) return res.status(409).json({ error: 'Investigation soumise : elle ne se modifie plus' });
    db.update('traitements', t.id, { investigation: investigation(req.body || {}) });
    return res.json({ status: 'ok' });
  });

  // Soumettre l'investigation : elle est close, ses éléments ne se réécrivent
  // plus, et le traitement passe à « Qualification et Mesures ». Comme la
  // décision qui l'avait ouverte, ce geste fait avancer le fil : il relève du
  // validateur.
  app.post(`${M}/constatations/:id/investigation/soumettre`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!R.canValidate(req.user, perimetre(c))) return refuser(res, 'Soumission réservée au validateur');
    const t = traitementDe(c.id);
    if (!t || t.decision !== 'investiguer' || t.etape !== 'investigations') {
      return res.status(409).json({ error: 'La carence n’est pas à l’étape Investigations' });
    }
    const inv = t.investigation || {};
    if (inv.soumise_le) return res.status(409).json({ error: 'Investigation déjà soumise' });
    db.update('traitements', t.id, {
      etape: 'qualification',
      investigation: { ...inv, soumise_le: db.now(), soumise_par: req.user.username },
    });
    return res.status(201).json({ status: 'ok', etape: 'qualification' });
  });

  // Rapport d'investigation en PDF : l'instance décisionnelle reçoit
  // l'investigation entière sous une forme qui se transmet et s'archive. Le
  // document est composé à la demande — rien n'est stocké, il suit toujours
  // l'état de l'investigation.
  app.get(`${M}/constatations/:id/rapport-investigation.pdf`, requireAuth, async (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!R.canRead(req.user, perimetre(c))) return refuser(res);
    const t = traitementDe(c.id);
    if (!t || !t.investigation) return res.status(404).json({ error: 'Aucune investigation' });
    if (!pdf.disponible()) {
      return res.status(503).json({ error: 'Moteur de rendu PDF indisponible sur ce serveur' });
    }
    const types = new Map(db.list('types_investigation').map((x) => [x.code, x.libelle]));
    const cfg = deps.loadConfig ? deps.loadConfig() : {};
    try {
      const octets = await pdf.depuisHtml(rapport.html({
        carence: c,
        traitement: t,
        aac: (cfg && cfg.aac) || {},
        libelleType: (code) => types.get(code) || code,
      }));
      const nom = `rapport-investigation-${String(c.reference || c.id).replace(/[^\w.-]+/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(nom)}`);
      // `page.pdf()` rend un Uint8Array : sans cette conversion, Express le
      // sérialise en JSON et le fichier reçu n'est pas un PDF.
      return res.send(Buffer.from(octets));
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Rendu du rapport impossible' });
    }
  });

  // ── Qualification et mesures ──
  // L'instance décisionnelle qualifie la carence — l'infraction est constituée
  // ou non — et arrête, le cas échéant, les mesures d'application.
  const membre = (p) => Object.fromEntries(CHAMPS_ENQUETEUR.map((k) => [k, texte((p || {})[k])]));
  const reunion = (r) => ({
    date: texte((r || {}).date).slice(0, 10),
    objet: texte((r || {}).objet),
    resultat: texte((r || {}).resultat),
  });
  // « sans_objet » : une mesure qui ne court pas — un avertissement est
  // prononcé, il ne dure pas. Ni durée ni terme ne s'y attachent.
  const PORTEES = ['temporelle', 'illimitee', 'sans_objet'];
  const UNITES = ['jours', 'mois'];

  // Terme d'une sanction temporelle : la date de sanction augmentée de sa
  // durée. Le calendrier fait le reste — trois mois après le 31 janvier
  // tombent au 30 avril, et non au 31.
  const ajouter = (depart, valeur, unite) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(depart) || !valeur) return '';
    const d = new Date(`${depart}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    if (unite === 'mois') {
      const jour = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + valeur);
      const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(jour, dernier));
    } else {
      d.setUTCDate(d.getUTCDate() + valeur);
    }
    return d.toISOString().slice(0, 10);
  };
  const mesureArretee = (m) => {
    const o = m || {};
    const portee = PORTEES.includes(texte(o.portee)) ? texte(o.portee) : '';
    return {
      categorie: texte(o.categorie),
      type_mesure: texte(o.type_mesure),
      date_sanction: texte(o.date_sanction).slice(0, 10),
      portee,
      // Une sanction sans terme n'a ni durée ni date de fin : les garder
      // laisserait croire qu'elle en a une.
      duree_valeur: portee === 'temporelle' ? Math.max(0, Math.round(Number(o.duree_valeur) || 0)) : 0,
      duree_unite: portee === 'temporelle' && UNITES.includes(texte(o.duree_unite))
        ? texte(o.duree_unite) : (portee === 'temporelle' ? 'jours' : ''),
      date_fin: portee === 'temporelle' ? texte(o.date_fin).slice(0, 10) : '',
      commentaire: texte(o.commentaire),
    };
  };

  const vrai = (v) => v === true || v === 'true';

  const qualification = (d) => {
    // Les deux faces d'une même décision : elles ne se cochent pas ensemble.
    // « Constituée » l'emporte si les deux arrivent — c'est la seule des deux
    // qui ouvre des champs, et la laisser gagner ne perd aucune saisie.
    // Trois faces d'une même décision — l'infraction est constituée, elle ne
    // l'est pas, ou l'instance veut en savoir plus avant de trancher. Elles
    // s'excluent ; la première l'emporte si plusieurs arrivent ensemble, car
    // c'est la seule qui ouvre des champs.
    const constituee = vrai(d.infraction_constituee);
    const nonConstituee = !constituee && vrai(d.infraction_non_constituee);
    const renvoi = !constituee && !nonConstituee && vrai(d.renvoi_demande);
    return {
      comite_code: texte(d.comite_code),
      membres: Array.isArray(d.membres)
        ? d.membres.map(membre).filter((p) => p.nom || p.prenom || p.email || p.contact) : [],
      reunions: Array.isArray(d.reunions)
        ? d.reunions.map(reunion).filter((r) => r.date || r.objet || r.resultat) : [],
      infraction_constituee: constituee,
      infraction_non_constituee: nonConstituee,
      renvoi_demande: renvoi,
      renvoi_motif: renvoi ? texte(d.renvoi_motif) : '',
      // Les trois qualifications ne valent que si l'infraction est constituée :
      // les conserver sur un dossier classé laisserait croire le contraire.
      nature: constituee ? texte(d.nature) : '',
      caracterisation: constituee ? texte(d.caracterisation) : '',
      circonstances: constituee ? texte(d.circonstances) : '',
      mesures: constituee && Array.isArray(d.mesures)
        ? d.mesures.map(mesureArretee)
          .map((m) => (m.portee === 'temporelle' && m.duree_valeur && !m.date_fin
            // Le terme se déduit de la durée quand le client ne l'a pas posé :
            // les deux doivent s'accorder, quel qu'ait été le champ saisi.
            ? { ...m, date_fin: ajouter(m.date_sanction, m.duree_valeur, m.duree_unite) } : m))
          .filter((m) => m.categorie || m.type_mesure || m.commentaire || m.date_sanction) : [],
      pieces: Array.isArray(d.pieces) ? d.pieces.map(piece).filter((p) => p.nom || p.path) : [],
    };
  };

  app.put(`${M}/constatations/:id/qualification`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!peutEcrire(req, c)) return refuser(res);
    const t = traitementDe(c.id);
    if (!t || t.etape !== 'qualification') {
      return res.status(409).json({ error: 'La carence n’est pas à l’étape Qualification et Mesures' });
    }
    const q = qualification(req.body || {});
    // Le comité retenu doit exister : la mesure qui en découlera le portera.
    if (q.comite_code && !db.list('comites').some((x) => x.code === q.comite_code)) {
      return res.status(400).json({ error: 'Comité décisionnel inconnu' });
    }
    db.update('traitements', t.id, { qualification: q });
    return res.json({ status: 'ok' });
  });

  // ── Issues de l'étape « Qualification et Mesures » ──
  // Trois sorties : renvoyer pour complément d'enquête, classer faute
  // d'infraction, ou passer au suivi des mesures. Chacune fait avancer — ou
  // reculer — le fil : elles relèvent du validateur, comme les décisions.
  const carenceAQualifier = (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) { res.status(404).json({ error: 'Carence non trouvée' }); return null; }
    if (!R.canValidate(req.user, perimetre(c))) { refuser(res, 'Décision réservée au validateur'); return null; }
    const t = traitementDe(c.id);
    if (!t || t.etape !== 'qualification') {
      res.status(409).json({ error: 'La carence n’est pas à l’étape Qualification et Mesures' });
      return null;
    }
    return { c, t };
  };

  // Renvoi : l'instance veut un complément d'enquête. Le fil recule d'une
  // étape, l'investigation redevient modifiable, et le motif du renvoi s'y
  // affiche — l'équipe doit savoir ce qui lui est demandé.
  app.post(`${M}/constatations/:id/qualification/renvoyer`, requireAuth, (req, res) => {
    const ctx = carenceAQualifier(req, res);
    if (!ctx) return undefined;
    const q = ctx.t.qualification || {};
    if (!q.renvoi_demande) {
      return res.status(409).json({ error: 'Le renvoi n’a pas été demandé par l’instance' });
    }
    const inv = ctx.t.investigation || {};
    const renvois = (inv.renvois || []).concat([{
      motif: q.renvoi_motif || '',
      renvoye_le: db.now(),
      renvoye_par: req.user.username,
    }]);
    db.update('traitements', ctx.t.id, {
      etape: 'investigations',
      // L'investigation se rouvre : la marque de soumission tombe.
      investigation: { ...inv, soumise_le: '', soumise_par: '', renvois },
      qualification: { ...q, renvoi_demande: false, renvoi_motif: '' },
    });
    return res.status(201).json({ status: 'ok', etape: 'investigations' });
  });

  // Classement : l'infraction n'est pas constituée, aucune mesure ne sera
  // prise. La carence est close ici, comme au classement de la suite à donner.
  app.post(`${M}/constatations/:id/qualification/classer`, requireAuth, (req, res) => {
    const ctx = carenceAQualifier(req, res);
    if (!ctx) return undefined;
    const q = ctx.t.qualification || {};
    if (!q.infraction_non_constituee) {
      return res.status(409).json({ error: 'L’infraction n’a pas été déclarée non constituée' });
    }
    if (db.list('mesures').some((m) => m.constatation_id === ctx.c.id)) {
      return res.status(400).json({ error: 'Une mesure a déjà été prise sur cette carence' });
    }
    if (!db.list('classements').some((x) => x.constatation_id === ctx.c.id)) {
      db.insert('classements', {
        id: db.uid('cla'), constatation_id: ctx.c.id,
        motif: texte(req.body && req.body.motif) || 'Infraction non constituée',
        date_cloture: db.now().slice(0, 10),
        classe_par: req.user.username, date_creation: db.now(),
      });
    }
    db.update('traitements', ctx.t.id, {
      classe_le: db.now(), classe_par: req.user.username,
    });
    return res.status(201).json({ status: 'ok' });
  });

  app.post(`${M}/constatations/:id/qualification/suivi`, requireAuth, (req, res) => {
    const ctx = carenceAQualifier(req, res);
    if (!ctx) return undefined;
    const q = ctx.t.qualification || {};
    if (!q.infraction_constituee) {
      return res.status(409).json({ error: 'Le suivi ne s’ouvre que sur une infraction constituée' });
    }
    // Les mesures arrêtées par l'instance entrent au registre des mesures :
    // c'est là qu'elles se notifient, se suivent et se clôturent. Elles y
    // arrivent en projet, comme toute mesure nouvelle.
    const dejaCreees = new Set(db.list('mesures')
      .filter((m) => m.constatation_id === ctx.c.id && m.issue_de === 'qualification')
      .map((m) => m.qualification_rang));
    const creees = [];
    (q.mesures || []).forEach((m, rang) => {
      if (dejaCreees.has(rang)) return;
      const nouvelle = {
        id: db.uid('mes'),
        reference: db.prochaineReference(),
        ...Object.fromEntries(CHAMPS.map((k) => [k, LISTES.includes(k) ? [] : ''])),
        constatation_id: ctx.c.id,
        prestataire_id: ctx.c.prestataire_id || '',
        // Nom porté par la carence : il sert quand l'exploitant n'est pas
        // rattaché au référentiel.
        prestataire_nom: ctx.c.prestataire_nom || '',
        categorie: m.categorie || 'administrative',
        type_mesure: m.type_mesure || '',
        objet: ctx.c.titre || ctx.c.reference || '',
        description: m.commentaire || '',
        date_emission: m.date_sanction || '',
        date_echeance: m.date_fin || '',
        delai_jours: m.portee === 'temporelle' && m.duree_unite === 'jours'
          ? String(m.duree_valeur || '') : '',
        motif: q.nature || '',
        avis_commission: (q.caracterisation || ''),
        pieces_jointes: (q.pieces || []).map(piece),
        statut: 'projet',
        decision_par: '', date_decision: '',
        date_notification: '', date_cloture: '',
        // Portée de la sanction, telle que l'instance l'a arrêtée : le registre
        // des mesures la montre, et le suivi s'y adosse.
        date_sanction: m.date_sanction || '',
        portee: m.portee || '',
        duree_valeur: m.duree_valeur || 0,
        duree_unite: m.duree_unite || '',
        // Trace de l'origine : une mesure née ici ne se recrée pas si la
        // validation est rejouée.
        issue_de: 'qualification',
        qualification_rang: rang,
        created_by: req.user.username,
        date_creation: db.now(),
      };
      db.insert('mesures', nouvelle);
      creees.push(nouvelle.reference);
    });
    db.update('traitements', ctx.t.id, {
      etape: 'suivi', qualifie_le: db.now(), qualifie_par: req.user.username,
    });
    return res.status(201).json({ status: 'ok', etape: 'suivi', mesures: creees });
  });

  app.post(`${M}/constatations/:id/decision`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!R.canValidate(req.user, perimetre(c))) return refuser(res, 'Décision réservée au validateur');
    const d = req.body || {};
    const decision = texte(d.decision);
    if (!DECISIONS.includes(decision)) {
      return res.status(400).json({ error: 'Décision inconnue', attendu: DECISIONS });
    }
    const motif = texte(d.motif);
    // Classer, c'est décider qu'aucune mesure d'application ne sera prise : la
    // carence reste suivie par le plan d'actions de son module d'origine. La
    // décision et le classement sont une seule et même chose, consignés
    // ensemble pour que l'écran « Carences » les voie tous deux.
    if (decision === 'classer') {
      if (db.list('mesures').some((m) => m.constatation_id === c.id)) {
        return res.status(400).json({ error: 'Une mesure a déjà été prise sur cette carence' });
      }
      if (!db.list('classements').some((x) => x.constatation_id === c.id)) {
        db.insert('classements', {
          id: db.uid('cla'), constatation_id: c.id, motif,
          date_cloture: db.now().slice(0, 10),
          classe_par: req.user.username, date_creation: db.now(),
        });
      }
    }
    const patch = {
      decision,
      decision_motif: motif,
      etape: ETAPE_APRES_DECISION[decision],
      decide_le: db.now(),
      decide_par: req.user.username,
    };
    const t = traitementDe(c.id);
    if (t) db.update('traitements', t.id, patch);
    else {
      db.insert('traitements', {
        id: db.uid('trt'), constatation_id: c.id, informations: '', pieces: [],
        date_creation: db.now(), ...patch,
      });
    }
    return res.status(201).json({ status: 'ok', etape: patch.etape });
  });

  // Le classement se retire : une décision prise par erreur ne doit pas
  // enfermer l'infraction.
  app.delete(`${M}/constatations/:id/classer`, requireAuth, (req, res) => {
    const x = db.list('classements').find((c) => c.constatation_id === req.params.id);
    if (!x) return res.status(404).json({ error: 'Infraction non classée' });
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, 'Retrait réservé au gestionnaire');
    db.remove('classements', x.id);
    return res.json({ status: 'ok' });
  });

  // ── Constatations propres au module ──
  // Elles n'appartiennent à aucun autre module : celui-ci les tient, et lui
  // seul les modifie. Les constatations reçues par le bus restent en lecture.
  const CHAMPS_CONSTAT = ['titre', 'description', 'prestataire_id', 'origine_libelle',
    'date_ouverture', 'delai_jours', 'date_due_cloture'];
  const constatPropre = (d) => Object.fromEntries(CHAMPS_CONSTAT.map((k) => [k, texte(d[k])]));

  app.post(`${M}/constatations`, requireAuth, (req, res) => {
    const d = req.body || {};
    if (!peutEcrire(req, d)) return refuser(res, 'Non autorisé à ajouter une constatation');
    const champs = constatPropre(d);
    if (!champs.titre) return res.status(400).json({ error: 'Objet requis' });
    const c = {
      id: db.uid('cst'),
      reference: db.prochaineReferenceConstat(),
      ...champs,
      // Ce qui est saisi ici appelle une mesure : c'est une constatation
      // critique, comme celles que l'écran recense.
      criticite: 'critique',
      statut: 'ouverte',
      date_ouverture: champs.date_ouverture || db.now().slice(0, 10),
      created_by: req.user.username,
      date_creation: db.now(),
    };
    db.insert('constatations', c);
    return res.status(201).json({ status: 'ok', id: c.id, reference: c.reference });
  });

  app.put(`${M}/constatations/:id`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!peutEcrire(req, c)) return refuser(res, 'Non autorisé à modifier cette constatation');
    const champs = constatPropre({ ...c, ...(req.body || {}) });
    if (!champs.titre) return res.status(400).json({ error: 'Objet requis' });
    const statut = texte((req.body || {}).statut);
    db.update('constatations', c.id, {
      ...champs,
      statut: ['ouverte', 'soldee'].includes(statut) ? statut : c.statut,
      date_maj: db.now(),
    });
    return res.json({ status: 'ok' });
  });

  // Une constatation qui porte déjà une mesure ne se supprime pas : la mesure
  // perdrait ce qui la motive.
  app.delete(`${M}/constatations/:id`, requireAuth, (req, res) => {
    const c = db.get('constatations', req.params.id);
    if (!c) return res.status(404).json({ error: 'Constatation non trouvée' });
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, 'Suppression réservée au gestionnaire');
    if (db.list('mesures').some((m) => m.constatation_id === c.id)) {
      return res.status(400).json({ error: 'Des mesures sont rattachées à cette infraction' });
    }
    if (db.list('classements').some((x) => x.constatation_id === c.id)) {
      return res.status(400).json({ error: 'Cette infraction a été classée' });
    }
    db.remove('constatations', c.id);
    return res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Écriture
  // ══════════════════════════════════════

  app.post(`${M}/mesures`, requireAuth, (req, res) => {
    const d = req.body || {};
    if (!peutEcrire(req, d)) return refuser(res, 'Non autorisé à créer une mesure');
    const m = {
      id: db.uid('mes'),
      reference: db.prochaineReference(),
      ...Object.fromEntries(CHAMPS.map((k) => [k, LISTES.includes(k) ? [] : ''])),
      ...normaliser(d),
      categorie: d.categorie || 'administrative',
      statut: 'projet',
      decision_par: '', date_decision: '',
      date_notification: '', date_cloture: '',
      created_by: req.user.username,
      date_creation: db.now(),
    };
    db.insert('mesures', m);
    res.status(201).json({ status: 'ok', id: m.id, reference: m.reference });
  });

  app.put(`${M}/mesures/:id`, requireAuth, (req, res) => {
    const m = db.get('mesures', req.params.id);
    if (!m) return res.status(404).json({ error: 'Mesure non trouvée' });
    if (!peutEcrire(req, m)) return refuser(res, 'Non autorisé à modifier cette mesure');
    // Une mesure clôturée ou annulée est un acte pris : elle ne se réécrit pas.
    if (CLOS.includes(m.statut)) {
      return res.status(400).json({ error: 'Une mesure clôturée ou annulée ne se modifie plus' });
    }
    const patch = normaliser(req.body || {});
    if (!Object.keys(patch).length) return res.json({ status: 'ok' });
    db.update('mesures', m.id, patch);
    res.json({ status: 'ok' });
  });

  app.delete(`${M}/mesures/:id`, requireAuth, (req, res) => {
    if (!R.isAdmin(req.user, referentiels)) return refuser(res, "Réservé au gestionnaire du module");
    if (!db.remove('mesures', req.params.id)) {
      return res.status(404).json({ error: 'Mesure non trouvée' });
    }
    res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Transitions du circuit
  // ══════════════════════════════════════
  // Chacune vérifie le statut de départ : sans cette garde, un double clic
  // notifierait deux fois, et une mesure clôturée pourrait être « notifiée ».

  const transition = (route, depuis, vers, champs) => {
    app.post(`${M}/mesures/:id/${route}`, requireAuth, (req, res) => {
      const m = db.get('mesures', req.params.id);
      if (!m) return res.status(404).json({ error: 'Mesure non trouvée' });
      if (!peutDecider(req, m)) return refuser(res, 'Réservé au validateur et au gestionnaire');
      if (!depuis.includes(m.statut)) {
        return res.status(400).json({
          error: `Transition impossible depuis le statut « ${m.statut} »`,
        });
      }
      db.update('mesures', m.id, {
        statut: vers,
        ...champs(req.user.username, (req.body || {}).motif || ''),
      });
      res.json({ status: 'ok', statut: vers });
    });
  };

  transition('notifier', ['projet'], 'notifiee', (user) => ({
    date_notification: db.now(), decision_par: user, date_decision: db.now(),
  }));
  transition('engager', ['notifiee'], 'en_cours', () => ({}));
  transition('cloturer', ['notifiee', 'en_cours'], 'cloturee', () => ({
    date_cloture: db.now(),
  }));
  transition('annuler', ['projet', 'notifiee', 'en_cours'], 'annulee', (user, motif) => ({
    date_cloture: db.now(), decision_par: user, motif_annulation: motif,
  }));
  // Rouvrir une mesure clôturée à tort : la trace de la clôture est effacée,
  // la mesure repart au stade où elle avait été notifiée.
  transition('rouvrir', ['cloturee'], 'en_cours', () => ({ date_cloture: '' }));

  // ══════════════════════════════════════
  //  Pièces jointes
  // ══════════════════════════════════════

  const nomDePresentation = (propose, ext) => {
    const base = String(propose || '')
      .replace(/[\\/ -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(new RegExp(`${ext.replace('.', '\\.')}$`, 'i'), '')
      .slice(0, 120)
      .trim();
    return `${base || 'piece-jointe'}${ext}`;
  };

  app.post(`${M}/upload`, requireAuth, multipart(), (req, res) => {
    if (!R.canContribute(req.user, null)) return refuser(res);
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    if (!f.filename) return res.status(400).json({ error: 'Nom de fichier vide' });
    const ext = path.extname(f.filename).toLowerCase();
    if (!EXTENSIONS.includes(ext)) return res.status(400).json({ error: 'Type de fichier non autorisé' });
    fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
    const nom = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_UPLOADS, nom), f.buffer);
    res.status(201).json({
      status: 'ok',
      filename: nomDePresentation((req.body || {}).nom || f.filename, ext),
      path: `/api/m/mesures/uploads/${nom}`,
      size: f.buffer.length,
    });
  });

  app.get(`${M}/uploads/:fichier`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const nom = path.basename(req.params.fichier);
    const chemin = path.join(DOSSIER_UPLOADS, nom);
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier non trouvé' });
    const affiche = nomDePresentation(req.query.nom || nom, path.extname(nom).toLowerCase());
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(affiche)}`);
    res.sendFile(chemin);
  });

  // ══════════════════════════════════════
  //  Indicateurs par prestataire
  // ══════════════════════════════════════

  app.get(`${M}/indicateurs`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const prestataireId = String((req.query || {}).prestataire_id || '');
    if (!prestataireId) return res.status(400).json({ error: 'prestataire_id requis' });
    const aujourdhui = new Date().toISOString().slice(0, 10);

    const consts = constatations().filter((c) => c.prestataire_id === prestataireId);
    const soldees = consts.filter((c) => c.statut === 'soldee');
    const enRetard = consts.filter((c) => c.statut !== 'soldee'
      && c.date_due_cloture && c.date_due_cloture < aujourdhui);

    const parCriticite = {};
    consts.forEach((c) => {
      const k = c.criticite || 'mineure';
      parCriticite[k] = (parCriticite[k] || 0) + 1;
    });
    const parAnnee = {};
    consts.forEach((c) => {
      const a = String(c.date_ouverture || '').slice(0, 4);
      if (a) parAnnee[a] = (parAnnee[a] || 0) + 1;
    });

    const mesures = db.list('mesures').filter((m) => m.prestataire_id === prestataireId);
    const parStatut = {};
    STATUTS.forEach((s) => { parStatut[s] = mesures.filter((m) => m.statut === s).length; });

    res.json({
      total_constatations: consts.length,
      soldees: soldees.length,
      en_retard: enRetard.length,
      taux_cloture: consts.length ? Math.round((soldees.length / consts.length) * 1000) / 10 : 0,
      par_criticite: parCriticite,
      par_annee: parAnnee,
      total_mesures: mesures.length,
      mesures_par_statut: parStatut,
    });
  });
};

module.exports.STATUTS = STATUTS;
