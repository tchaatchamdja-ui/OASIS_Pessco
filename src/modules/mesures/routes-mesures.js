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
const exports_ = require('./exports');
const etapePdf = require('./etape-pdf');
const db = require('./store');
const R = require('./roles');
const instances = require('../../instances');

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
  const { requireAuth, loadConfig } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const refs = () => referentiels.getAll();

  // ── Instance regardée ──
  // Chaque AAC tient son instance ; les listes ne servent que ses dossiers.
  // Le super-administrateur peut prendre le poste d'une autre, ou demander la
  // vue régionale — l'instance retenue est alors vide, et rien n'est écarté.
  const instanceCourante = (req) => instances.courante(req.user, loadConfig);
  const parInstance = (req, rangs) => instances.filtrer(rangs, instanceCourante(req), loadConfig);

  // Les constatations viennent des modules qui les relèvent, par le bus de
  // services : « Exécution de la Surveillance » pour les constatations de
  // surveillance, « RAMP Inspections » pour les écarts de catégorie 3 relevés
  // sur aire de trafic. Ce module ne lit jamais leurs données directement, et
  // l'absence de l'un comme de l'autre ne l'empêche pas de fonctionner — la
  // liste correspondante est alors vide.
  const SOURCES = ['SURV.constatationsOuvertes', 'RAMP.constatationsCritiques'];
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
    liste = parInstance(req, liste).filter((m) => lisible(req, m));
    liste = liste.slice().sort((a, b) => String(b.date_creation || '').localeCompare(String(a.date_creation || '')));
    const index = indexConstatations();
    res.json(liste.map((m) => enrichir(m, index)));
  });

  // ══════════════════════════════════════
  //  États exportables
  // ══════════════════════════════════════
  // Le classeur part tout de suite ; le PDF passe par le moteur de rendu, qui
  // peut manquer sur un hébergement contraint — le message le dit alors, plutôt
  // qu'une erreur nue.
  const envoyerClasseur = (res, buf, nom) => {
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    return res.send(buf);
  };
  const envoyerPdf = async (res, html, nom) => {
    try {
      // page.pdf() rend un Uint8Array : sans Buffer.from, Express le
      // sérialiserait en JSON.
      const octets = await pdf.depuisHtml(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
      return res.send(Buffer.from(octets));
    } catch (e) {
      // L'état se demande par un lien : le navigateur affichera ce que la
      // route rend. Un objet JSON y serait illisible — d'où cette page.
      const motif = String((e && e.message) || e)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      res.status(503).type('html');
      return res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
        <title>État indisponible</title><style>
          body { font-family: system-ui, sans-serif; margin: 3rem auto; max-width: 34rem;
                 color: #0f172a; line-height: 1.5; }
          h1 { font-size: 1.1rem; } code { background: #f1f5f9; padding: .1rem .3rem; }
        </style></head><body>
        <h1>L’état PDF n’a pas pu être produit</h1>
        <p>Le moteur de rendu a refusé la demande :</p>
        <p><code>${motif}</code></p>
        <p>L’export Excel du même écran reste disponible.</p>
        </body></html>`);
    }
  };
  const jour = () => db.now().slice(0, 10);

  // Les états reprennent les critères de l'écran : exporter ce que l'on voit,
  // non la totalité de la base.
  const criteresLisibles = (paires) => paires.filter((x) => x[1])
    .map((x) => `${x[0]} : ${x[1]}`).join(' · ');

  const carencesFiltrees = (req) => {
    const q = req.query || {};
    const nomPrestataire = (id) => ((refs().prestataires || []).find((p) => p.id === id) || {}).nom || '';
    const cherche = String(q.recherche || '').trim().toLowerCase();
    const liste = parInstance(req, listeCarences()).filter((c) => {
      if (q.origine && (c.origine || 'SURV') !== q.origine) return false;
      if (q.statut && (c.statut_care || 'a_traiter') !== q.statut) return false;
      if (q.prestataire && c.prestataire_id !== q.prestataire) return false;
      if (!cherche) return true;
      return `${c.reference} ${c.titre} ${c.description} ${c.prestataire_nom}`
        .toLowerCase().includes(cherche);
    });
    const criteres = criteresLisibles([
      ['Origine', q.origine ? ({ SURV: 'Exécution de la Surveillance', RAMP: 'RAMP Inspections', CARE: 'Relevée ici' }[q.origine] || q.origine) : ''],
      ['Statut', q.statut || ''],
      ['Prestataire', nomPrestataire(q.prestataire)],
      ['Recherche', String(q.recherche || '').trim()],
    ]);
    return { liste, criteres };
  };

  app.get(`${M}/constatations/export.xlsx`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const { liste } = carencesFiltrees(req);
    return envoyerClasseur(res, exports_.classeurCarences(liste), `carences-${jour()}.xlsx`);
  });

  app.get(`${M}/constatations/export.pdf`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const { liste, criteres } = carencesFiltrees(req);
    return envoyerPdf(res, exports_.htmlCarences(liste, criteres), `carences-${jour()}.pdf`);
  });

  // Statut de suivi effectif d'une mesure — le même calcul qu'à l'écran.
  const suiviCourant = (m) => {
    const connus = ['attendu', 'en_cours', 'solde', 'sans_suite', 'sans_objet', 'recours'];
    if (connus.includes(m.suivi_statut)) return m.suivi_statut;
    if (m.recours_intente) return 'recours';
    if (m.statut === 'annulee') return 'sans_suite';
    if (m.statut === 'cloturee') return 'solde';
    if (m.statut === 'en_cours') return 'en_cours';
    return 'attendu';
  };

  const mesuresFiltrees = (req) => {
    const q = req.query || {};
    const index = indexConstatations();
    const nomPrestataire = (id) => ((refs().prestataires || []).find((p) => p.id === id) || {}).nom || '';
    const cherche = String(q.recherche || '').trim().toLowerCase();
    const liste = parInstance(req, db.list('mesures'))
      .filter((m) => lisible(req, m))
      .map((m) => enrichir(m, index))
      .filter((m) => {
        if (q.categorie && m.categorie !== q.categorie) return false;
        if (q.prestataire && m.prestataire_id !== q.prestataire) return false;
        // Le statut de suivi se déduit comme à l'écran quand il n'est pas posé.
        if (q.suivi && suiviCourant(m) !== q.suivi) return false;
        // Filtre posé depuis le menu Carences : les mesures d'un seul dossier.
        if (q.carence && m.constatation_id !== q.carence) return false;
        if (!cherche) return true;
        return `${m.reference} ${m.objet} ${m.description} ${m.prestataire_nom}`
          .toLowerCase().includes(cherche);
      })
      .sort((a, b) => String(a.reference || '').localeCompare(String(b.reference || '')));
    const libelle = (coll, code) => (db.list(coll).find((x) => x.code === code) || {}).libelle || '';
    const SUIVIS = {
      attendu: 'Plan attendu', en_cours: 'En cours de mise en œuvre', solde: 'Soldé',
      sans_suite: 'Sans suite', sans_objet: 'Suivi sans objet', recours: 'Recours',
    };
    const refCarence = (id) => (constatations().find((c) => c.id === id) || {}).reference || '';
    const criteres = criteresLisibles([
      ['Carence', refCarence(q.carence)],
      ['Catégorie', libelle('categories', q.categorie) || q.categorie || ''],
      ['Statut de suivi', SUIVIS[q.suivi] || ''],
      ['Prestataire', nomPrestataire(q.prestataire)],
      ['Recherche', String(q.recherche || '').trim()],
    ]);
    return {
      liste,
      criteres,
      cat: (code) => libelle('categories', code) || String(code || ''),
      typ: (code) => libelle('types', code) || String(code || ''),
    };
  };

  app.get(`${M}/mesures/export.xlsx`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const { liste, cat, typ } = mesuresFiltrees(req);
    return envoyerClasseur(res, exports_.classeurMesures(liste, cat, typ), `mesures-${jour()}.xlsx`);
  });

  app.get(`${M}/mesures/export.pdf`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    const { liste, criteres, cat, typ } = mesuresFiltrees(req);
    return envoyerPdf(res, exports_.htmlMesures(liste, criteres, cat, typ), `mesures-${jour()}.pdf`);
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
  // Une carence désigne son prestataire par son identifiant : le nom se lit au
  // référentiel. L'écran le reconstituait de son côté, ce que ni l'état exporté
  // ni le document d'étape ne pouvaient faire — d'où cette résolution commune.
  const nomPrestataire = (id) => ((refs().prestataires || [])
    .find((p) => p.id === id) || {}).nom || '';

  const listeCarences = () => {
    const mesures = db.list('mesures');
    const parId = new Map((refs().prestataires || []).map((p) => [p.id, p.nom]));
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
    return constatations().map((c) => {
      const liees = mesures.filter((m) => m.constatation_id === c.id);
      const classee = classements.get(c.id) || null;
      // Statut au sens des mesures d'application : il dit où en est la
      // carence dans ce module, et non dans celui qui l'a relevée — une
      // constatation soldée chez le surveillant reste « à traiter » ici tant
      // qu'aucune décision n'a été prise.
      const closes = liees.filter((m) => CLOS.includes(m.statut)).length;
      const t = traitements.get(c.id) || null;
      // Le statut dit où en est le dossier, dans les mêmes termes que la
      // colonne « Actions ». Il se lisait au seul décompte des mesures : une
      // carence en cours d'investigation restait « à traiter » alors que son
      // bouton annonçait « Investigations », et un dossier déclaré clos
      // paraissait « sous mesure » tant qu'une sanction courait encore.
      const statutDuTraitement = () => {
        if (!t || !t.etape || t.etape === 'suite') {
          // Une mesure peut être prise hors du fil de traitement : la carence
          // n'est plus « à traiter », elle suit ses mesures.
          if (!liees.length) return 'a_traiter';
          return closes === liees.length ? 'traitee' : 'sous_suivi';
        }
        if (t.etape === 'investigations') return 'investigations';
        if (t.etape === 'qualification') return 'qualification';
        // Étape « Suivi des Mesures » : clos par décision, soldé quand toutes
        // les mesures le sont, sous suivi tant qu'il en reste une à conduire.
        if (t.cloture_le) return 'cloturee';
        if (liees.length && closes === liees.length) return 'traitee';
        return 'sous_suivi';
      };
      const statutCare = classee ? 'classee' : statutDuTraitement();
      return {
        ...c,
        prestataire_nom: parId.get(c.prestataire_id) || c.prestataire_nom || '',
        mesures_liees: liees.length,
        mesures_closes: closes,
        classee: !!classee,
        classement_motif: classee ? classee.motif : '',
        traitement_etape: (t || {}).etape || '',
        traitement_decision: (t || {}).decision || '',
        // Le dossier a-t-il été déclaré clos faute de suivi à conduire ? La
        // colonne « Actions » y distingue « Sous suivi » de « Clôturée ».
        traitement_clos: !!(t || {}).cloture_le,
        // Date de cette clôture : le menu États la porte en colonne. La date de
        // clôture calculée plus haut suit les mesures, qui peuvent rester
        // ouvertes alors même que le dossier est clos.
        traitement_cloture_le: (t || {}).cloture_le || '',
        date_cloture: cloture(c, liees),
        statut: classee ? 'classee' : c.statut,
        statut_care: statutCare,
      };
    });
  };

  app.get(`${M}/constatations`, requireAuth, (req, res) => {
    if (!R.canRead(req.user, null)) return refuser(res);
    return res.json(parInstance(req, listeCarences()));
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
  const SOURCES_PAC = ['SURV.pacDeConstatation', 'RAMP.pacDeConstatation'];
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
      // Clôture prononcée à la qualification : les mesures sont arrêtées mais
      // aucune n'appelle de suivi. Le dossier est clos, l'écran le lit ici.
      cloture_le: (t && t.cloture_le) || '',
      cloture_par: (t && t.cloture_par) || '',
      investigation: (t && t.investigation)
        || { equipe: [], travaux: [], autres_texte: '', autres_pieces: [], rapport: '' },
      qualification: (t && t.qualification) || {
        comite_code: '', membres: [], reunions: [],
        infraction_constituee: false, infraction_non_constituee: false,
        renvoi_demande: false, renvoi_motif: '',
        nature: '', caracterisation: '', circonstances: '',
        mesures: [], pieces: [],
      },
      // Suivi des mesures : le commentaire général de l'étape, et les mesures
      // au registre — c'est sur elles que porte le suivi, non sur une copie.
      suivi: (t && t.suivi) || { commentaire_general: '' },
      mesures: db.list('mesures')
        .filter((m) => m.constatation_id === c.id)
        .sort((a, b) => String(a.reference || '').localeCompare(String(b.reference || ''))),
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
        // Le rapport est signé par l'AAC de l'instance qui tient la carence.
        aac: instances.aacDe(instances.de(c, loadConfig), loadConfig),
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

  // Chaque étape du fil se transmet et s'archive telle qu'elle a été
  // renseignée. Le document est composé à la demande : rien n'est stocké, il
  // suit toujours l'état du dossier.
  app.get(`${M}/constatations/:id/etapes/:cle.pdf`, requireAuth, async (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!R.canRead(req.user, perimetre(c))) return refuser(res);
    const cle = String(req.params.cle || '');
    if (!etapePdf.ETAPES[cle]) return res.status(404).json({ error: 'Étape inconnue' });
    const t = traitementDe(c.id);
    if (!t) return res.status(404).json({ error: 'Aucun traitement ouvert sur cette carence' });
    const libelle = (coll, code) => (db.list(coll).find((x) => x.code === code) || {}).libelle
      || String(code || '');
    const cfg = deps.loadConfig ? deps.loadConfig() : {};
    const html = etapePdf.html({
      etape: cle,
      carence: { ...c, prestataire_nom: nomPrestataire(c.prestataire_id) || c.prestataire_nom || '' },
      traitement: t,
      mesures: db.list('mesures')
        .filter((m) => m.constatation_id === c.id)
        .sort((a, b) => String(a.reference || '').localeCompare(String(b.reference || ''))),
      pac: pacDe(c.id),
      aac: instances.aacDe(instances.de(c, loadConfig), loadConfig),
      // Les types d'investigation et de mesure ne partagent pas leur registre :
      // l'étape dit lequel elle nomme.
      libelleType: cle === 'investigations'
        ? (code) => libelle('types_investigation', code)
        : (code) => libelle('types', code),
      libelleCategorie: (code) => libelle('categories', code),
      libelleComite: (code) => libelle('comites', code),
    });
    const nom = `${cle}-${String(c.reference || c.id).replace(/[^\w.-]+/g, '_')}.pdf`;
    return envoyerPdf(res, html, nom);
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
  // Ce qu'un recours porte : l'objet de la contestation d'un côté, son examen
  // par l'instance de l'autre. Trois décisions le closent — maintenir la
  // mesure, la modifier, ou l'annuler.
  const DECISIONS_RECOURS = ['maintenir', 'modifier', 'annuler'];
  const recoursVide = () => ({
    intente_texte: '', pieces: [],
    instance_code: '', membres: [], commentaire: '',
    decision: '', decision_pieces: [],
  });
  const recoursDe = (r) => {
    const o = r && typeof r === 'object' ? r : {};
    return {
      intente_texte: texte(o.intente_texte),
      pieces: Array.isArray(o.pieces) ? o.pieces.map(piece).filter((p) => p.nom || p.path) : [],
      instance_code: texte(o.instance_code),
      membres: Array.isArray(o.membres)
        ? o.membres.map(membre).filter((p) => p.nom || p.prenom || p.email || p.contact) : [],
      commentaire: texte(o.commentaire),
      decision: DECISIONS_RECOURS.includes(texte(o.decision)) ? texte(o.decision) : '',
      decision_pieces: Array.isArray(o.decision_pieces)
        ? o.decision_pieces.map(piece).filter((p) => p.nom || p.path) : [],
    };
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
      // Une mesure appelle-t-elle le suivi de sa mise en œuvre ? Un plan
      // d'action se suit ; un avertissement, une amende acquittée, non. La
      // réponse commande l'issue de l'étape : sans aucun suivi attendu, le
      // dossier se clôt ici plutôt que de passer à l'étape « Suivi ».
      suivi_requis: o.suivi_requis === true || o.suivi_requis === 'true',
      // Recours : présent seulement sur une mesure contestée. Le sort de la
      // mesure — modifiée, annulée — et la version qu'elle avait avant sont
      // posés par le serveur seul : `recoursApplique` les tient à partir de
      // l'enregistrement, non du corps de la requête.
      recours_intente: o.recours_intente === true || o.recours_intente === 'true',
      recours: (o.recours_intente === true || o.recours_intente === 'true')
        ? recoursDe(o.recours) : null,
    };
  };

  // Ce que la décision de recours fait de la mesure. La version précédente est
  // prise sur l'enregistrement au moment où l'instance décide de modifier : un
  // client ne peut ni la forger, ni la faire disparaître.
  const CHAMPS_ARRETES = ['categorie', 'type_mesure', 'date_sanction', 'portee',
    'duree_valeur', 'duree_unite', 'date_fin', 'commentaire', 'suivi_requis'];
  const recoursApplique = (neuve, ancienne) => {
    const avant = ancienne || {};
    if (!neuve.recours_intente) {
      return { ...neuve, statut_recours: '', version_precedente: null };
    }
    const decision = (neuve.recours || {}).decision || '';
    if (decision === 'annuler') {
      return { ...neuve, statut_recours: 'annulee', version_precedente: avant.version_precedente || null };
    }
    if (decision === 'modifier') {
      const version = avant.version_precedente
        || Object.fromEntries(CHAMPS_ARRETES.map((k) => [k, avant[k]]));
      return { ...neuve, statut_recours: 'modifiee', version_precedente: version };
    }
    return { ...neuve, statut_recours: '', version_precedente: avant.version_precedente || null };
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
    // Une décision de recours change le sort de la mesure : elle est modifiée
    // — et l'on garde ce qu'elle était — ou annulée. Le rang fait le lien avec
    // ce qui était enregistré ; le corps de la requête n'y touche pas.
    const avant = ((t.qualification || {}).mesures) || [];
    q.mesures = q.mesures.map((m, rang) => recoursApplique(m, avant[rang]));
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

  // Les mesures arrêtées par l'instance entrent au registre des mesures : c'est
  // là qu'elles se notifient, se suivent et se clôturent. Elles y arrivent en
  // projet, comme toute mesure nouvelle — sauf celles dont l'instance a dit que
  // la mise en œuvre n'appelait pas de suivi : leur suivi est sans objet, et le
  // registre ne doit pas réclamer un plan d'action que nul n'attend.
  const creerLesMesures = (ctx, q, auteur) => {
    const nees = db.list('mesures')
      .filter((m) => m.constatation_id === ctx.c.id && m.issue_de === 'qualification');
    const dejaCreees = new Set(nees.map((m) => m.qualification_rang));
    // Une mesure déjà au registre dont le recours vient d'être tranché suit la
    // décision de l'instance : annulée, elle sort du suivi ; modifiée, elle
    // reprend les termes que l'instance vient d'arrêter. Dans les deux cas la
    // contestation est close, et le suivi peut reprendre son cours.
    nees.forEach((existante) => {
      const arretee = (q.mesures || [])[existante.qualification_rang];
      if (!arretee || !arretee.recours_intente) return;
      const decision = (arretee.recours || {}).decision || '';
      if (!decision) return;
      if (decision === 'annuler') {
        db.update('mesures', existante.id, {
          statut: 'annulee', suivi_statut: 'sans_suite', recours_intente: false,
          date_cloture: db.now().slice(0, 10),
        });
        return;
      }
      const commun = { recours_intente: false, suivi_statut: '' };
      if (decision === 'maintenir') { db.update('mesures', existante.id, commun); return; }
      db.update('mesures', existante.id, {
        ...commun,
        categorie: arretee.categorie || 'administrative',
        type_mesure: arretee.type_mesure || '',
        description: arretee.commentaire || '',
        date_emission: arretee.date_sanction || '',
        date_echeance: arretee.date_fin || '',
        date_sanction: arretee.date_sanction || '',
        date_fin_sanction: arretee.date_fin || '',
        portee: arretee.portee || '',
        duree_valeur: arretee.duree_valeur || 0,
        duree_unite: arretee.duree_unite || '',
        delai_jours: arretee.portee === 'temporelle' && arretee.duree_unite === 'jours'
          ? String(arretee.duree_valeur || '') : '',
      });
    });
    const creees = [];
    (q.mesures || []).forEach((m, rang) => {
      if (dejaCreees.has(rang)) return;
      const nouvelle = {
        id: db.uid('mes'),
        reference: db.prochaineReference(),
        ...Object.fromEntries(CHAMPS.map((k) => [k, LISTES.includes(k) ? [] : ''])),
        constatation_id: ctx.c.id,
        // La mesure appartient à l'instance qui a ouvert la carence.
        instance: instances.de(ctx.c, loadConfig),
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
        // Le terme de la sanction, distinct de l'échéance : l'un dit jusqu'à
        // quand la sanction court, l'autre pour quand la mesure est due. Ils
        // partent égaux, ils ne le restent pas — une échéance se reporte.
        date_fin_sanction: m.date_fin || '',
        delai_jours: m.portee === 'temporelle' && m.duree_unite === 'jours'
          ? String(m.duree_valeur || '') : '',
        motif: q.nature || '',
        avis_commission: (q.caracterisation || ''),
        pieces_jointes: (q.pieces || []).map(piece),
        statut: 'projet',
        suivi_statut: m.suivi_requis ? '' : 'sans_objet',
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
        created_by: auteur,
        date_creation: db.now(),
      };
      db.insert('mesures', nouvelle);
      creees.push(nouvelle.reference);
    });
    return creees;
  };

  app.post(`${M}/constatations/:id/qualification/suivi`, requireAuth, (req, res) => {
    const ctx = carenceAQualifier(req, res);
    if (!ctx) return undefined;
    const q = ctx.t.qualification || {};
    if (!q.infraction_constituee) {
      return res.status(409).json({ error: 'Le suivi ne s’ouvre que sur une infraction constituée' });
    }
    const creees = creerLesMesures(ctx, q, req.user.username);
    db.update('traitements', ctx.t.id, {
      etape: 'suivi', qualifie_le: db.now(), qualifie_par: req.user.username,
    });
    return res.status(201).json({ status: 'ok', etape: 'suivi', mesures: creees });
  });

  // Clôture directe : les mesures sont arrêtées, mais aucune n'appelle le suivi
  // de sa mise en œuvre. Le dossier passe à la dernière étape et s'y ferme, sans
  // ouvrir un suivi que rien n'alimenterait.
  app.post(`${M}/constatations/:id/qualification/cloturer`, requireAuth, (req, res) => {
    const ctx = carenceAQualifier(req, res);
    if (!ctx) return undefined;
    const q = ctx.t.qualification || {};
    if (!q.infraction_constituee) {
      return res.status(409).json({ error: 'La clôture ne vaut que sur une infraction constituée' });
    }
    const mesures = q.mesures || [];
    if (!mesures.length) {
      return res.status(409).json({ error: 'Aucune mesure n’a été arrêtée' });
    }
    if (mesures.some((m) => m.suivi_requis)) {
      return res.status(409).json({
        error: 'Une mesure au moins requiert le suivi de sa mise en œuvre',
      });
    }
    const creees = creerLesMesures(ctx, q, req.user.username);
    db.update('traitements', ctx.t.id, {
      etape: 'suivi',
      qualifie_le: ctx.t.qualifie_le || db.now(),
      qualifie_par: ctx.t.qualifie_par || req.user.username,
      cloture_le: db.now(),
      cloture_par: req.user.username,
    });
    return res.status(201).json({ status: 'ok', etape: 'suivi', clos: true, mesures: creees });
  });

  // ══════════════════════════════════════
  //  Étape « Suivi des Mesures »
  // ══════════════════════════════════════
  // Le suivi ne recopie pas les mesures : il les écrit là où elles vivent, au
  // registre. Ce que l'étape lui ajoute — commentaire de suivi, statut, pièces
  // — s'inscrit sur la mesure elle-même, et le menu Mesures le lit aussitôt.
  const SUIVI_STATUTS = ['attendu', 'en_cours', 'solde', 'sans_suite', 'sans_objet', 'recours'];

  app.put(`${M}/constatations/:id/suivi`, requireAuth, (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Carence non trouvée' });
    if (!peutEcrire(req, c)) return refuser(res);
    const t = traitementDe(c.id);
    if (!t || t.etape !== 'suivi') {
      return res.status(409).json({ error: 'La carence n’est pas à l’étape Suivi des Mesures' });
    }
    // Un dossier clos — classé, ou clôturé faute de suivi à conduire — ne se
    // réécrit plus : l'étape se consulte.
    if (t.classe_le || t.cloture_le) {
      return res.status(409).json({ error: 'Le traitement est clos : le suivi ne se modifie plus' });
    }
    const d = req.body || {};
    // Seules les mesures nées de cette carence sont touchées : un identifiant
    // venu d'ailleurs ne doit pas ouvrir le registre entier.
    const siennes = new Set(db.list('mesures')
      .filter((m) => m.constatation_id === c.id).map((m) => m.id));
    const majes = [];
    (Array.isArray(d.mesures) ? d.mesures : []).forEach((o) => {
      const id = texte(o && o.id);
      if (!siennes.has(id)) return;
      const recours = o.recours_intente === true || o.recours_intente === 'true';
      // Un recours suspend le suivi : le statut ne se choisit plus, il est
      // « Recours » tant que l'instance ne l'a pas examiné.
      const choisi = SUIVI_STATUTS.includes(texte(o.suivi_statut)) ? texte(o.suivi_statut) : '';
      const statut = recours ? 'recours' : (choisi === 'recours' ? '' : choisi);
      db.update('mesures', id, {
        recours_intente: recours,
        suivi_statut: statut,
        suivi_commentaire: texte(o.suivi_commentaire),
        suivi_pieces: (Array.isArray(o.suivi_pieces) ? o.suivi_pieces : []).map(piece),
        suivi_maj_le: db.now(),
        suivi_maj_par: req.user.username,
      });
      majes.push(id);
    });
    db.update('traitements', t.id, {
      suivi: {
        commentaire_general: texte(d.commentaire_general),
        maj_le: db.now(),
        maj_par: req.user.username,
      },
    });
    return res.json({ status: 'ok', mesures: majes.length });
  });

  // Contexte commun aux deux issues du suivi : elles engagent l'autorité, donc
  // relèvent du validateur, et ne valent que sur un dossier ouvert.
  const carenceEnSuivi = (req, res) => {
    const c = constatations().find((x) => x.id === req.params.id);
    if (!c) { res.status(404).json({ error: 'Carence non trouvée' }); return null; }
    if (!R.canValidate(req.user, perimetre(c))) { refuser(res, 'Décision réservée au validateur'); return null; }
    const t = traitementDe(c.id);
    if (!t || t.etape !== 'suivi') {
      res.status(409).json({ error: 'La carence n’est pas à l’étape Suivi des Mesures' });
      return null;
    }
    if (t.classe_le || t.cloture_le) {
      res.status(409).json({ error: 'Le traitement est déjà clos' });
      return null;
    }
    return { c, t };
  };

  // Clôture de la carence : le suivi est terminé. Un recours en cours l'en
  // empêche — le dossier ne se ferme pas sur une contestation non tranchée.
  app.post(`${M}/constatations/:id/suivi/cloturer`, requireAuth, (req, res) => {
    const ctx = carenceEnSuivi(req, res);
    if (!ctx) return undefined;
    const contestees = db.list('mesures')
      .filter((m) => m.constatation_id === ctx.c.id && m.recours_intente);
    if (contestees.length) {
      return res.status(409).json({
        error: 'Un recours est en cours d’examen : la carence ne se clôture pas',
      });
    }
    db.update('traitements', ctx.t.id, {
      cloture_le: db.now(), cloture_par: req.user.username,
    });
    return res.status(201).json({ status: 'ok', clos: true });
  });

  // Action de recours : le prestataire conteste une ou plusieurs mesures. Le
  // fil recule à la qualification, où l'instance examinera chaque recours.
  // Chaque mesure contestée porte sa marque sur la mesure arrêtée qui lui
  // correspond — c'est là que la section « Recours » ira la lire.
  app.post(`${M}/constatations/:id/suivi/recours`, requireAuth, (req, res) => {
    const ctx = carenceEnSuivi(req, res);
    if (!ctx) return undefined;
    const contestees = db.list('mesures')
      .filter((m) => m.constatation_id === ctx.c.id && m.recours_intente);
    if (!contestees.length) {
      return res.status(409).json({ error: 'Aucune mesure n’est contestée' });
    }
    const rangs = new Set(contestees
      .filter((m) => m.issue_de === 'qualification')
      .map((m) => m.qualification_rang));
    const q = ctx.t.qualification || {};
    const mesures = (q.mesures || []).map((m, rang) => (rangs.has(rang)
      ? { ...m, recours_intente: true, recours: m.recours || recoursVide() }
      : m));
    db.update('traitements', ctx.t.id, {
      etape: 'qualification',
      qualification: { ...q, mesures },
      // Le dossier repart de la qualification : la trace de la validation
      // précédente reste, mais l'étape se rouvre.
      recours_ouvert_le: db.now(),
      recours_ouvert_par: req.user.username,
    });
    return res.status(201).json({ status: 'ok', etape: 'qualification', mesures: contestees.length });
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
      // L'instance sous laquelle la carence est ouverte : c'est elle qui la
      // verra ensuite dans ses listes.
      instance: instanceCourante(req),
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
    // Une mesure suit la carence qu'elle sanctionne : elle appartient à
    // l'instance qui a ouvert le dossier, non à celle d'où on la saisit.
    const carence = indexConstatations().get(texte(d.constatation_id));
    const m = {
      id: db.uid('mes'),
      reference: db.prochaineReference(),
      ...Object.fromEntries(CHAMPS.map((k) => [k, LISTES.includes(k) ? [] : ''])),
      ...normaliser(d),
      instance: carence ? instances.de(carence, loadConfig) : instanceCourante(req),
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
    // Une mesure efface une sanction prononcée et le suivi qui l'accompagne :
    // le geste est réservé au compte qui administre l'application, non au
    // gestionnaire du module.
    if (req.user.role !== 'SUPERADMIN') return refuser(res, "Réservé au SuperAdmin");
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

    const consts = parInstance(req, constatations())
      .filter((c) => c.prestataire_id === prestataireId);
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

    const mesures = parInstance(req, db.list('mesures'))
      .filter((m) => m.prestataire_id === prestataireId);
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
