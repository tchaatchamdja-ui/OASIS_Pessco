// Module « RAMP Inspections » — communication entre États membres.
//
// Un État qui relève un écart sur un aéronef exploité par un autre État a
// besoin de lui écrire : demander le suivi d'une inspection, obtenir une
// précision sur un constat, transmettre une preuve. Ce fil d'échanges reste
// attaché à ce dont il parle — une inspection, parfois un écart précis — et se
// clôt quand la question est épuisée.
//
// Une requête part d'un État (l'émetteur) vers un ou plusieurs États. Chacun
// peut répondre, joindre des pièces, et seul l'émetteur — ou le gestionnaire du
// module — referme la discussion.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const referentiels = require('../../referentiels');
const multipart = require('../../multipart');
const db = require('./store');
const R = require('./roles');

// Les pièces jointes vivent hors de data/ : ce sont des fichiers, pas des
// enregistrements.
const DOSSIER_PIECES = path.join(
  process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
  'uploads', 'ramp', 'communication',
);
const EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic',
  '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.zip'];
const TAILLE_MAX = 25 * 1024 * 1024;

module.exports = function register(app, deps, M) {
  const { requireAuth } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const texte = (v) => String(v == null ? '' : v).trim();
  const admin = (req) => R.isAdmin(req.user, referentiels);

  // Le menu n'existe pas en vue Prestataire : les échanges sont entre États.
  const gardeAac = (req, res) => {
    if (R.estPrestataire(req.user)) { refuser(res, 'Réservé à la vue AAC'); return false; }
    return true;
  };

  // États que le compte représente. Un administrateur ou un coordonnateur
  // régional n'est borné par aucun : il voit tout le trafic.
  //
  // Sauf s'il tient le poste d'une AAC : le super-administrateur qui choisit un
  // État en barre supérieure travaille alors comme cette autorité — il n'écrit
  // et ne lit que ce que cet État écrirait et lirait.
  const mesEtats = (req) => (req.etatAac ? [req.etatAac] : R.etatsDe(req.user, referentiels));
  const voitTout = (req) => !req.etatAac
    && (admin(req) || !mesEtats(req).length
      || R.roleRamp(req.user, referentiels) === 'Coordonnateur Régional');

  // Une requête concerne le compte quand il l'a émise, ou qu'elle est adressée
  // à l'un de ses États.
  //
  // Tenir le poste d'une AAC met de côté ce que l'on a écrit soi-même : on ne
  // voit alors que ce que cet État voit — sinon la vue montrerait plus que la
  // réalité de son écran.
  const concerne = (req, r) => {
    const etats = mesEtats(req);
    const parLesEtats = etats.includes(r.etat_emetteur)
      || (r.etats_destinataires || []).some((e) => etats.includes(e));
    if (req.etatAac) return parLesEtats;
    return voitTout(req) || r.cree_par === req.user.username || parLesEtats;
  };

  // Vue publique : les pièces ne rendent jamais leur chemin sur disque.
  const vuePiece = (p) => ({
    id: p.id, intitule: p.intitule, nom_origine: p.nom_origine, taille: p.taille,
    depose_par: p.depose_par, depose_le: p.depose_le,
  });
  const vueEchange = (e) => ({ ...e, pieces: (e.pieces || []).map(vuePiece) });
  const vueRequete = (r) => ({
    ...r,
    pieces: (r.pieces || []).map(vuePiece),
    echanges: (r.echanges || []).map(vueEchange),
  });

  // Inspection visée : la requête en garde un relevé, pour rester lisible même
  // si l'inspection est supprimée plus tard.
  const releveInspection = (inspectionId, ecartId) => {
    const i = db.get('inspections', inspectionId);
    if (!i) return {};
    const e = ecartId ? (db.list('ecarts').find((x) => x.id === ecartId && x.inspection_id === i.id)) : null;
    return {
      inspection_id: i.id,
      ecart_id: e ? e.id : '',
      objet_reference: {
        poi_reference: i.poi_reference || '',
        date: i.date || '',
        pays: i.pays || '',
        exploitant: i.exploitant || '',
        aeronef: i.aeronef || '',
        immatriculation: i.immatriculation || '',
        vol: i.vol || '',
        item: e ? (e.itemCode || '') : '',
        categorie: e ? (e.categorie || '') : '',
        description: e ? (e.description || '') : '',
      },
    };
  };

  // États membres de l'UEMOA, tels que le paramétrage « Pays » les déclare.
  const etatsUemoa = () => {
    const membres = db.list('pays').filter((p) => p.uemoa && p.actif !== false)
      .map((p) => p.nom).sort((a, b) => a.localeCompare(b, 'fr'));
    return membres.length ? membres : db.ETATS_INSPECTION;
  };

  // ══════════════════════════════════════
  //  Requêtes
  // ══════════════════════════════════════

  app.get(`${M}/requetes`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const liste = db.list('requetes')
      .filter((r) => concerne(req, r))
      .sort((a, b) => String(b.cree_le || '').localeCompare(String(a.cree_le || '')))
      .map(vueRequete);
    return res.json({
      requetes: liste,
      // Destinataires possibles : les États cochés « membre de l'UEMOA » dans
      // le paramétrage des pays. À défaut de paramétrage, les États du
      // dispositif — le module reste utilisable avant tout réglage.
      etats: etatsUemoa(),
      mes_etats: mesEtats(req),
      // Ce que l'écran a besoin de savoir pour ouvrir ou fermer un fil.
      peut_ecrire: R.canContribute(req.user) || admin(req),
      voit_tout: voitTout(req),
    });
  });

  app.get(`${M}/requetes/:id`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    return res.json(vueRequete(r));
  });

  app.post(`${M}/requetes`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    if (!R.canContribute(req.user) && !admin(req)) return refuser(res, 'Non autorisé à écrire');
    const d = req.body || {};
    const objet = texte(d.objet);
    const message = texte(d.message);
    const destinataires = (Array.isArray(d.etats_destinataires) ? d.etats_destinataires : [])
      .map(texte).filter((e) => etatsUemoa().includes(e));
    if (!objet) return res.status(400).json({ error: 'Objet requis' });
    if (!message) return res.status(400).json({ error: 'Message requis' });
    if (!destinataires.length) return res.status(400).json({ error: 'Au moins un État destinataire' });

    const emetteur = texte(d.etat_emetteur) || mesEtats(req)[0] || '';
    const rec = {
      id: db.uid('req'),
      objet,
      message,
      etat_emetteur: emetteur,
      etats_destinataires: destinataires,
      ...releveInspection(texte(d.inspection_id), texte(d.ecart_id)),
      statut: 'ouverte',
      pieces: [],
      echanges: [],
      cree_par: req.user.username,
      cree_le: db.now(),
    };
    db.insert('requetes', rec);
    return res.status(201).json({ status: 'ok', id: rec.id });
  });

  // Un échange de plus dans le fil. Émetteur comme destinataires écrivent ;
  // une requête close ne reçoit plus rien.
  app.post(`${M}/requetes/:id/echanges`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    if (r.statut === 'close') return res.status(409).json({ error: 'Discussion close' });
    const message = texte((req.body || {}).message);
    if (!message) return res.status(400).json({ error: 'Message requis' });
    const echange = {
      id: db.uid('ech'),
      message,
      auteur: req.user.username,
      etat: mesEtats(req)[0] || r.etat_emetteur || '',
      date: db.now(),
      pieces: [],
    };
    db.update('requetes', r.id, { echanges: (r.echanges || []).concat([echange]) });
    return res.status(201).json({ status: 'ok', id: echange.id });
  });

  // Clôture : l'émetteur ferme ce qu'il a ouvert ; le gestionnaire du module
  // peut solder un fil laissé en suspens.
  app.post(`${M}/requetes/:id/cloturer`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    if (r.statut === 'close') return res.json({ status: 'ok', deja: true });
    if (r.cree_par !== req.user.username && !admin(req)) {
      return refuser(res, 'Seul l’État émetteur referme la discussion');
    }
    db.update('requetes', r.id, {
      statut: 'close',
      motif_cloture: texte((req.body || {}).motif),
      close_le: db.now(),
      close_par: req.user.username,
    });
    return res.json({ status: 'ok' });
  });

  app.post(`${M}/requetes/:id/rouvrir`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    if (r.cree_par !== req.user.username && !admin(req)) return refuser(res);
    db.update('requetes', r.id, { statut: 'ouverte', close_le: '', close_par: '' });
    return res.json({ status: 'ok' });
  });

  app.delete(`${M}/requetes/:id`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    if (!db.remove('requetes', req.params.id)) return res.status(404).json({ error: 'Requête non trouvée' });
    return res.json({ status: 'ok' });
  });

  // ══════════════════════════════════════
  //  Pièces jointes
  // ══════════════════════════════════════
  // Une pièce accompagne soit la requête elle-même, soit l'un de ses échanges.

  app.post(`${M}/requetes/:id/pieces`, requireAuth, multipart(), (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    if (r.statut === 'close') return res.status(409).json({ error: 'Discussion close' });
    const f = (req.files || {}).file;
    if (!f) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const ext = path.extname(f.filename || '').toLowerCase();
    if (!EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: `Type de fichier non autorisé (${EXTENSIONS.join(', ')})` });
    }
    if (f.buffer.length > TAILLE_MAX) return res.status(400).json({ error: 'Fichier trop volumineux (25 Mo maximum)' });

    fs.mkdirSync(DOSSIER_PIECES, { recursive: true });
    const surDisque = `${crypto.randomBytes(6).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(DOSSIER_PIECES, surDisque), f.buffer);
    const piece = {
      id: db.uid('pcm'),
      intitule: texte((req.body || {}).intitule) || f.filename,
      nom_origine: f.filename, fichier: surDisque, taille: f.buffer.length,
      depose_par: req.user.username, depose_le: db.now(),
    };

    // `echange_id` rattache la pièce à une réponse plutôt qu'à la requête.
    const echangeId = texte((req.body || {}).echange_id);
    if (echangeId) {
      const echanges = (r.echanges || []).map((e) =>
        (e.id === echangeId ? { ...e, pieces: (e.pieces || []).concat([piece]) } : e));
      if (!echanges.some((e) => e.id === echangeId)) return res.status(404).json({ error: 'Échange non trouvé' });
      db.update('requetes', r.id, { echanges });
    } else {
      db.update('requetes', r.id, { pieces: (r.pieces || []).concat([piece]) });
    }
    return res.status(201).json({ status: 'ok', id: piece.id });
  });

  // ══════════════════════════════════════
  //  Partages — transmissions mises à disposition d'autres États
  // ══════════════════════════════════════
  // Une fiche transmise ne se renégocie pas : ce qu'un État met à disposition
  // d'un autre en est une copie figée — la lettre telle qu'elle est partie, et
  // les pièces telles qu'elles ont été jointes. Le destinataire lit et
  // télécharge ; il ne modifie rien.

  // Les pièces d'une fiche vivent dans le dossier du formulaire.
  const DOSSIER_POI = path.join(
    process.env.OASIS_DATA_DIR || path.join(__dirname, '..', '..', '..', 'data'),
    'uploads', 'ramp', 'poi',
  );

  const vuePartage = (pa) => ({
    ...pa,
    pieces: (pa.pieces || []).map((x) => ({
      id: x.id, intitule: x.intitule, nom_origine: x.nom_origine,
      taille: x.taille, depose_le: x.depose_le,
    })),
  });

  // Un partage se lit par les États auxquels il est adressé, par celui qui l'a
  // fait, et par le gestionnaire du module.
  const partageVisible = (req, pa) => {
    const parLesEtats = (pa.etats || []).some((e) => mesEtats(req).includes(e));
    // Même règle que pour les requêtes : au poste d'une AAC, seuls les États
    // comptent.
    if (req.etatAac) return parLesEtats;
    return voitTout(req) || pa.partage_par === req.user.username || parLesEtats;
  };

  app.get(`${M}/partages`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const liste = db.list('partages')
      .filter((pa) => partageVisible(req, pa))
      .sort((a, b) => String(b.partage_le || '').localeCompare(String(a.partage_le || '')))
      .map(vuePartage);
    return res.json({ partages: liste, etats: etatsUemoa() });
  });

  app.get(`${M}/partages/:id`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const pa = db.get('partages', req.params.id);
    if (!pa || !partageVisible(req, pa)) return res.status(404).json({ error: 'Partage non trouvé' });
    return res.json(vuePartage(pa));
  });

  // Ce qu'une fiche a déjà mis à disposition, et à qui : le formulaire de
  // partage le rappelle sous les États destinataires, pour qu'on ne partage
  // pas deux fois et qu'on puisse revenir sur un envoi.
  app.get(`${M}/poi/:id/partages`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const liste = db.list('partages')
      .filter((pa) => pa.poi_id === req.params.id && partageVisible(req, pa))
      .sort((a, b) => String(b.partage_le || '').localeCompare(String(a.partage_le || '')))
      .map((pa) => ({
        id: pa.id,
        etats: pa.etats || [],
        elements: pa.elements || {},
        partage_le: pa.partage_le || '',
        partage_par: pa.partage_par || '',
        communications: (pa.communications || []).length,
        pieces: (pa.pieces || []).length,
        // Le rappel appartient à l'auteur du partage et au gestionnaire.
        rappelable: pa.partage_par === req.user.username || admin(req),
      }));
    return res.json({ partages: liste });
  });

  // Rappel : l'État visé perd l'accès à la copie. Sans État précisé, c'est
  // tout le partage qui est retiré. Le dernier État retiré emporte la copie —
  // un partage sans destinataire n'a plus d'objet.
  app.post(`${M}/partages/:id/rappeler`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const pa = db.get('partages', req.params.id);
    if (!pa) return res.status(404).json({ error: 'Partage non trouvé' });
    if (pa.partage_par !== req.user.username && !admin(req)) return refuser(res);
    const etat = texte((req.body || {}).etat);
    if (!etat) {
      db.remove('partages', pa.id);
      return res.json({ status: 'ok', retire: true, etats: [] });
    }
    if (!(pa.etats || []).includes(etat)) {
      return res.status(400).json({ error: 'Cet État n’est pas destinataire du partage' });
    }
    const restants = (pa.etats || []).filter((e) => e !== etat);
    if (!restants.length) {
      db.remove('partages', pa.id);
      return res.json({ status: 'ok', retire: true, etats: [] });
    }
    db.update('partages', pa.id, { etats: restants, rappel_le: db.now(), rappel_par: req.user.username });
    return res.json({ status: 'ok', retire: false, etats: restants });
  });

  // Mise à disposition depuis l'étape Transmission d'une fiche.
  app.post(`${M}/poi/:id/partager`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    if (!R.canContribute(req.user) && !admin(req)) return refuser(res, 'Non autorisé à partager');
    const p = db.get('poi', req.params.id);
    if (!p) return res.status(404).json({ error: 'Formulaire non trouvé' });
    if (p.statut !== 'validee') {
      return res.status(400).json({ error: 'Seule une fiche validée se partage' });
    }
    const d = req.body || {};
    const demandes = (Array.isArray(d.etats) ? d.etats : [])
      .map(texte).filter((e) => etatsUemoa().includes(e));
    if (!demandes.length) return res.status(400).json({ error: 'Au moins un État destinataire' });
    // Un État qui tient déjà une copie de cette fiche n'en reçoit pas une
    // seconde : il aurait deux entrées identiques à consulter, et deux
    // rappels à faire pour s'en défaire.
    const dejaServis = new Set(db.list('partages')
      .filter((pa) => pa.poi_id === p.id)
      .flatMap((pa) => pa.etats || []));
    const etats = demandes.filter((e) => !dejaServis.has(e));
    if (!etats.length) {
      return res.status(400).json({ error: 'Ces États ont déjà reçu cette transmission' });
    }

    const el = d.elements || {};
    const veut = { exploitant: !!el.exploitant, autorite: !!el.autorite, pieces: !!el.pieces };
    if (!veut.exploitant && !veut.autorite && !veut.pieces) {
      return res.status(400).json({ error: 'Au moins un élément à partager' });
    }

    // Copie figée : la communication telle qu'elle est partie.
    const communications = (p.communications || [])
      .filter((c) => veut[c.cible])
      .map((c) => ({
        id: c.id, cible: c.cible, objet: c.objet, message: c.message,
        destinataire: c.destinataire, copie: c.copie,
        envoye: !!c.envoye, envoye_le: c.envoye_le, envoye_par: c.envoye_par,
      }));
    const pieces = veut.pieces ? (p.pieces || []).map((x) => ({
      id: x.id, intitule: x.intitule, nom_origine: x.nom_origine,
      fichier: x.fichier, taille: x.taille, depose_le: x.depose_le,
    })) : [];

    const e = p.entete || {};
    const rec = {
      id: db.uid('par'),
      poi_id: p.id,
      reference: p.reference || '',
      etats,
      elements: veut,
      // Ce que le destinataire doit lire pour situer la fiche.
      objet_reference: {
        poi_reference: p.reference || '',
        date: e.date_inspection || '',
        pays: e.etat_inspection || '',
        exploitant: e.exploitant || '',
        aeronef: e.type_aeronef || '',
        immatriculation: e.immatriculation || '',
        vol: [e.route_depuis, e.route_vers].filter(Boolean).join(' → '),
        classe_action: p.classe_action || '',
      },
      communications,
      pieces,
      partage_par: req.user.username,
      partage_etat: mesEtats(req)[0] || e.etat_inspection || '',
      partage_le: db.now(),
    };
    db.insert('partages', rec);
    return res.status(201).json({ status: 'ok', id: rec.id, communications: communications.length, pieces: pieces.length });
  });

  // Retrait d'une mise à disposition : celui qui l'a faite, ou le gestionnaire.
  app.delete(`${M}/partages/:id`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const pa = db.get('partages', req.params.id);
    if (!pa) return res.status(404).json({ error: 'Partage non trouvé' });
    if (pa.partage_par !== req.user.username && !admin(req)) return refuser(res);
    db.remove('partages', pa.id);
    return res.json({ status: 'ok' });
  });

  // Les pièces partagées se téléchargent, jamais ne se modifient.
  app.get(`${M}/partages/:id/pieces/:pid/fichier`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const pa = db.get('partages', req.params.id);
    if (!pa || !partageVisible(req, pa)) return res.status(404).json({ error: 'Partage non trouvé' });
    const pj = (pa.pieces || []).find((x) => x.id === req.params.pid);
    if (!pj) return res.status(404).json({ error: 'Pièce non trouvée' });
    const chemin = path.join(DOSSIER_POI, path.basename(pj.fichier || ''));
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    res.setHeader('Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(pj.nom_origine || pj.fichier)}`);
    return res.sendFile(chemin);
  });

  const trouverPiece = (r, pid) => (r.pieces || []).find((p) => p.id === pid)
    || (r.echanges || []).flatMap((e) => e.pieces || []).find((p) => p.id === pid);

  app.get(`${M}/requetes/:id/pieces/:pid/fichier`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    const p = trouverPiece(r, req.params.pid);
    if (!p) return res.status(404).json({ error: 'Pièce non trouvée' });
    const chemin = path.join(DOSSIER_PIECES, path.basename(p.fichier || ''));
    if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    res.setHeader('Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(p.nom_origine || p.fichier)}`);
    return res.sendFile(chemin);
  });

  app.delete(`${M}/requetes/:id/pieces/:pid`, requireAuth, (req, res) => {
    if (!gardeAac(req, res)) return undefined;
    const r = db.get('requetes', req.params.id);
    if (!r || !concerne(req, r)) return res.status(404).json({ error: 'Requête non trouvée' });
    const p = trouverPiece(r, req.params.pid);
    if (!p) return res.status(404).json({ error: 'Pièce non trouvée' });
    // On ne retire que ce qu'on a déposé, sauf pour le gestionnaire du module.
    if (p.depose_par !== req.user.username && !admin(req)) return refuser(res);
    try { fs.unlinkSync(path.join(DOSSIER_PIECES, path.basename(p.fichier || ''))); }
    catch (e) { /* le fichier a déjà disparu */ }
    db.update('requetes', r.id, {
      pieces: (r.pieces || []).filter((x) => x.id !== p.id),
      echanges: (r.echanges || []).map((e) => ({ ...e, pieces: (e.pieces || []).filter((x) => x.id !== p.id) })),
    });
    return res.json({ status: 'ok' });
  });
};
