// Module « Profils de Risque » — données partagées du portail, bibliothèque
// documentaire, contexte et collections du module (CRUD générique).
const moduleRights = require('../../module_rights');
const instances = require('../../instances');
const db = require('./store');
const D = require('./domaine');
const { enregistrement } = require('../../valider');

// Collections du module servies par le CRUD générique.
const CRUD = {
  'indicateurs-conf': 'indicateurs_conf',
  'indicateurs-perf': 'indicateurs_perf',
  'indicateurs-complex': 'indicateurs_complex',
  evaluations: 'evaluations',
  plans: 'plans',
  'eval-reunions': 'eval_reunions',
  'eval-reunions-prest': 'eval_reunions_prest',
};

// Ce qui appartient à une AAC : la notation d'un organisme, ses plans de
// vérification et les comptes rendus des réunions qui l'ont arrêtée. Le barème
// — indicateurs et indices — reste commun : c'est la règle du calcul, non son
// résultat, et l'écrire pour un État l'écrirait pour tous.
const COLLECTIONS_INSTANCE = ['evaluations', 'plans', 'eval_reunions', 'eval_reunions_prest'];

module.exports = function register(app, deps, M) {
  const { requireAuth, auth, loadConfig, audit } = deps;

  // ── Instance regardée ──
  // Chaque AAC tient son instance ; les évaluations qu'elle a conduites ne sont
  // servies qu'à elle. Le super-administrateur régional prend en barre
  // supérieure le poste d'une autre, ou les regarde toutes — la vue régionale,
  // où l'instance retenue est vide et rien n'est écarté.
  const instanceCourante = (req) => instances.courante(req.user, loadConfig);
  const parInstance = (req, rangs) => instances.filtrer(rangs, instanceCourante(req), loadConfig);

  // Gardes du module. Les nomenclatures du portail (domaines, secteurs,
  // sous-activités, prestataires) restent ouvertes : elles décrivent
  // l'organisation du pays, sont servies aux fronts des autres modules, et ne
  // disent rien de la surveillance. Tout le reste — notes, évaluations,
  // barèmes, bibliothèque — appartient à l'Autorité.
  const lecture = (req, res, next) => (D.peutLire(req) ? next() : D.refus(res));
  const contribuer = (req, res, next) => (D.peut(req, 'CONTRIBUTEUR') ? next() : D.refus(res));
  const gerer = (req, res, next) => (D.peut(req, 'GESTIONNAIRE') ? next() : D.refus(res));

  // ── Données partagées attendues par le front PESSCO ──
  // Taxinomie commune, mais chaque élément peut n'être offert qu'à certaines
  // instances : ce qui n'est pas offert ici n'apparaît dans aucun filtre.
  app.get('/api/domaines', requireAuth,
    (req, res) => res.json(instances.visibles(D.sharedDomaines(), 'domaines', req.user, loadConfig)));
  app.get('/api/secteurs', requireAuth,
    (req, res) => res.json(instances.visibles(D.sharedSecteurs(), 'secteurs', req.user, loadConfig)));
  app.get('/api/sous-activites', requireAuth,
    (req, res) => res.json(instances.visibles(D.sharedSousActivites(), 'sous_activites', req.user, loadConfig)));
  // Les organismes appartiennent à l'AAC qui les surveille : la liste suit
  // l'instance regardée, à la différence de la taxinomie au-dessus.
  app.get('/api/prestataires', requireAuth, (req, res) => res.json(
    parInstance(req, D.sharedPrestataires())));
  app.get('/api/indices', requireAuth, lecture, (req, res) => res.json(D.sharedIndices()));

  // Les indices commandent le calcul de tous les profils de risque : les
  // réécrire, c'est refaire le barème de la surveillance. Réservé au
  // Gestionnaire — la route n'opposait jusqu'ici aucun refus.
  app.put('/api/indices', requireAuth, gerer, (req, res) => {
    const d = db.load();
    d.indices = Array.isArray(req.body) ? req.body : (req.body && req.body.indices) || d.indices;
    db.save(d);
    audit.log(req.user.username, 'PR_INDICES_MODIFIES', { nb: (d.indices || []).length });
    res.json({ ok: true, indices: d.indices });
  });

  app.get('/api/aac', requireAuth, (req, res) => {
    const cfg = { aac: instances.aac(req.user, loadConfig) };
    res.json({ ...(cfg.aac || {}), logo_data: (cfg.aac && cfg.aac.logo) || '' });
  });

  // ── Bibliothèque documentaire ──
  // Le contenu est stocké en base64 dans l'enregistrement mais n'est jamais
  // renvoyé par la liste : seul /download le restitue.
  const MAX_DOC_BYTES = 3_500_000; // marge sous la limite express.json (5 Mo)
  const publicDoc = ({ contenu, ...d }) => ({ ...d, taille: d.taille || 0 });

  app.get('/api/documents', requireAuth, lecture, (req, res) => res.json(db.getColl('documents').map(publicDoc)));

  app.post('/api/documents', requireAuth, contribuer, (req, res) => {
    const { nom, type, mime, fileB64 } = req.body || {};
    if (!nom) return res.status(400).json({ error: 'nom_requis' });
    const contenu = String(fileB64 || '').split(',').pop();
    if (!contenu) return res.status(400).json({ error: 'fichier_requis' });
    const taille = Math.round((contenu.length * 3) / 4);
    if (taille > MAX_DOC_BYTES) return res.status(413).json({ error: 'fichier_trop_volumineux', maxMo: 3.5 });
    const rec = db.createIn('documents', {
      nom, type: type || '', mime: mime || 'application/octet-stream', taille, contenu,
      date_upload: new Date().toISOString(), uploade_par: req.user.username,
    });
    audit.log(req.user.username, 'PR_DOCUMENT_AJOUT', { id: rec.id, nom, taille });
    return res.json(publicDoc(rec));
  });

  app.get('/api/documents/:id/download', requireAuth, lecture, (req, res) => {
    const doc = db.getColl('documents').find((d) => d.id === req.params.id);
    if (!doc || !doc.contenu) return res.status(404).json({ error: 'not_found' });
    const buf = Buffer.from(doc.contenu, 'base64');
    res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nom)}"`);
    return res.send(buf);
  });

  // Retirer une pièce de la bibliothèque est définitif : réservé au
  // Gestionnaire. Toute session pouvait jusqu'ici vider la bibliothèque.
  app.delete('/api/documents/:id', requireAuth, gerer, (req, res) => {
    const ok = db.deleteIn('documents', req.params.id);
    if (ok) audit.log(req.user.username, 'PR_DOCUMENT_SUPPRIME', { id: req.params.id });
    res.json({ ok });
  });

  // Utilisateur courant enrichi pour le module (rôle M1, domaines)
  app.get(`${M}/me`, requireAuth, (req, res) => {
    const u = auth.publicUser(req.user);
    res.json({
      ...u, role: D.roleM1(req.user), role_m1: `M1_${D.roleM1(req.user)}`,
      domaines: u.domaines || [], prenom: u.prenom || '', nom: u.nom || u.username,
    });
  });

  // ── Collections du module (CRUD générique) ──
  // Le périmètre d'un enregistrement est celui de son domaine et de son
  // secteur ; les collections qui n'en portent pas relèvent du privilège
  // général. Une évaluation lue, écrite ou supprimée reste dans les portées
  // du compte.
  const portee = (r) => ({ domaine_id: (r && r.domaine_id) || '', secteur_id: (r && r.secteur_id) || '' });

  Object.entries(CRUD).forEach(([route, coll]) => {
    app.get(`${M}/${route}`, requireAuth, lecture, (req, res) => {
      let rows = db.getColl(coll).filter((r) => D.peutLire(req, portee(r)));
      if (COLLECTIONS_INSTANCE.includes(coll)) rows = parInstance(req, rows);
      if (req.query.eval_id) rows = rows.filter((r) => r.eval_id === req.query.eval_id);
      if (req.query.prestataire_id) rows = rows.filter((r) => r.prestataire_id === req.query.prestataire_id);
      res.json(rows);
    });

    app.get(`${M}/${route}/:id`, requireAuth, lecture, (req, res) => {
      const r = db.getColl(coll).find((x) => x.id === req.params.id);
      if (!r) return res.status(404).json({ error: 'not_found' });
      return D.peutLire(req, portee(r)) ? res.json(r) : D.refus(res);
    });

    // Ces collections n'ont pas de forme arrêtée — le barème suit ce que
    // l'administrateur y met — mais un enregistrement se borne : le socle
    // refuse ce qui n'en est pas un et retire les champs que le serveur seul
    // écrit, à commencer par l'identifiant.
    app.post(`${M}/${route}`, requireAuth, enregistrement(), (req, res) => {
      // Créer une évaluation engage la notation d'un organisme : Validateur.
      // Les autres collections — indicateurs, comptes rendus de réunion —
      // relèvent de la contribution, mais aucune n'était gardée.
      const requis = coll === 'evaluations' ? 'VALIDATEUR' : 'CONTRIBUTEUR';
      if (!D.peut(req, requis, portee(req.body))) return D.refus(res);
      // L'enregistrement appartient à l'instance sous laquelle il est ouvert :
      // c'est elle qui le reverra. En vue régionale, l'instance retenue est
      // vide et le champ retombe sur l'instance locale, comme partout.
      const marque = COLLECTIONS_INSTANCE.includes(coll) ? { instance: instanceCourante(req) } : {};
      const rec = db.createIn(coll, { ...req.valide, ...marque, created_by: req.user.username });
      audit.log(req.user.username, 'PR_CREATE', { coll, id: rec.id });
      return res.json(rec);
    });

    app.put(`${M}/${route}/:id`, requireAuth, enregistrement(), (req, res) => {
      const avant = db.getColl(coll).find((x) => x.id === req.params.id);
      if (!avant) return res.status(404).json({ error: 'not_found' });
      // Le statut d'une évaluation dit une décision — acceptation, clôture,
      // validation, rejet. La poser demande un Validateur ; la route ne
      // demandait rien, et un compte quelconque validait le profil de risque
      // d'un organisme, profil aussitôt servi à la Planification.
      const statut = req.body && req.body.statut;
      const decide = coll === 'evaluations' && statut && statut !== avant.statut
        && D.STATUTS_DECIDES.includes(statut);
      if (!D.peut(req, decide ? 'VALIDATEUR' : 'CONTRIBUTEUR', portee(avant))) return D.refus(res);
      let rec = db.updateIn(coll, req.params.id, req.valide);
      if (!rec) return res.status(404).json({ error: 'not_found' });
      // Les deux premières étapes du fil d'avancement ne passent pas par une
      // route dédiée : elles se déduisent de l'état de l'évaluation.
      if (coll === 'evaluations') rec = D.stampNotationEtapes(rec);
      audit.log(req.user.username, 'PR_UPDATE', { coll, id: rec.id });
      return res.json(rec);
    });

    app.delete(`${M}/${route}/:id`, requireAuth, (req, res) => {
      // Supprimer une réévaluation libère l'évaluation d'origine : sans cela
      // elle resterait marquée « réévaluation en cours » sans cycle suivant.
      let parentId = null;
      const cible = db.getColl(coll).find((x) => x.id === req.params.id);
      if (!cible) return res.status(404).json({ error: 'not_found' });
      if (coll === 'evaluations') {
        // Suppression réservée au Gestionnaire du domaine/secteur du prestataire
        const priv = moduleRights.effectivePrivilege(D.RIGHTS, req.user.username, cible.domaine_id || '', cible.secteur_id || '');
        if (D.estPrestataire(req.user) || priv !== 'GESTIONNAIRE') return D.refus(res);
        parentId = cible.parent_id;
      // Les autres collections tenaient la porte ouverte : un indicateur du
      // barème s'y supprimait sans le moindre privilège.
      } else if (!D.peut(req, 'GESTIONNAIRE', portee(cible))) {
        return D.refus(res);
      }
      if (!db.deleteIn(coll, req.params.id)) return res.status(404).json({ error: 'not_found' });
      if (parentId) db.updateIn('evaluations', parentId, { reevalue_le: '', reevalue_par: '', enfant_id: '' });
      audit.log(req.user.username, 'PR_DELETE', { coll, id: req.params.id, parent_libere: parentId || null });
      return res.json({ ok: true });
    });
  });

  // ── Contexte agrégé (chargement initial rapide) ──
  app.get(`${M}/context`, requireAuth, (req, res) => {
    // Les profils de risque partagent la carte et l'espace de droits de la
    // Planification : c'est la même case d'« Accès aux modules » qui les ouvre.
    // Noter un organisme n'est pas l'affaire de l'organisme noté : son compte
    // n'ouvre pas l'écran, quand bien même la case serait cochée.
    if (D.estPrestataire(req.user) || !moduleRights.accesAuModule(D.RIGHTS, req.user.username)) {
      return res.status(403).json({ error: 'Ce module ne vous est pas ouvert. Veuillez contacter l’administrateur.' });
    }
    const cfg = loadConfig();
    res.json({
      user: { ...auth.publicUser(req.user), role: D.roleM1(req.user), role_m1: `M1_${D.roleM1(req.user)}` },
      aac: instances.aac(req.user, loadConfig),
      instance: cfg.instance,
      // Instance regardée : la barre supérieure en fait une liste déroulante.
      instance_vue: instances.etat(req.user, loadConfig),
      // Le contexte sert les mêmes listes que les routes dédiées : sans le
      // filtre, il rendait la taxinomie masquée et les organismes des autres
      // États — le front lit celles-ci en priorité, et n'appelle les routes
      // que faute de contexte.
      shared: {
        domaines: instances.visibles(D.sharedDomaines(), 'domaines', req.user, loadConfig),
        secteurs: instances.visibles(D.sharedSecteurs(), 'secteurs', req.user, loadConfig),
        sousActivites: instances.visibles(D.sharedSousActivites(), 'sous_activites', req.user, loadConfig),
        prestataires: parInstance(req, D.sharedPrestataires()),
        indices: D.sharedIndices(),
      },
    });
  });

  app.get(`${M}/instance`, requireAuth, (req, res) => res.json(instances.etat(req.user, loadConfig)));

  app.put(`${M}/instance`, requireAuth, (req, res) => {
    if (!instances.estRegional(req.user)) {
      return res.status(403).json({ error: 'Choix de l’instance réservé au super-administrateur régional' });
    }
    // Vide : la vue régionale. Sinon, une instance déclarée — le nom borne ce
    // que les écrans serviront, il ne s'invente pas.
    const demandee = String((req.body || {}).instance || '').trim();
    if (demandee && !instances.liste(loadConfig).includes(demandee)) {
      return res.status(400).json({ error: 'Instance inconnue' });
    }
    instances.definir(req.user.username, demandee);
    return res.json({ status: 'ok', instance: demandee });
  });
};
