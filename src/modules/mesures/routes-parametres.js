// Module « Mesures d'Application » — contexte et paramétrage.
//
// Le paramétrage tient en deux listes emboîtées : des catégories de mesure, et
// des types rattachés à une catégorie. Ce sont elles qui peuplent les listes
// déroulantes du formulaire de mesure.
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const db = require('./store');
const R = require('./roles');
const instances = require('../../instances');
const { introuvable, requis, inconnu, existant } = require('../../erreurs');

// Code technique dérivé d'un libellé : c'est lui qui est stocké sur la mesure,
// de sorte qu'un libellé renommé n'orpheline pas les mesures existantes.
const codeDepuisLibelle = (libelle) => String(libelle || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 40);

module.exports = function register(app, deps, M) {
  const { requireAuth, loadConfig } = deps;
  const refuser = (res, msg) => res.status(403).json({ error: msg || 'Accès refusé' });
  const admin = (req) => R.isAdmin(req.user, referentiels);
  // Le paramétrage se tient à jour au fil des décisions : un contributeur y
  // ajoute un type manquant sans attendre. La suppression reste au gestionnaire.
  const editeur = (req) => R.canContribute(req.user, null);

  // ══════════════════════════════════════
  //  Contexte utilisateur
  // ══════════════════════════════════════

  const vueUtilisateur = (u) => {
    const droits = moduleRights.getRights(R.MODULE, u.username);
    const domaines = [...new Set((droits.scopes || []).map((s) => s.domaine_id).filter(Boolean))];
    return {
      id: u.username, username: u.username,
      nom: u.nom || '', prenom: u.prenom || '', email: u.email || '',
      role: u.role, role_m4: R.roleM4(u, referentiels),
      domaines, actif: u.active !== false, photo: u.photo || '',
    };
  };

  // ── Instance regardée ──
  // L'application tourne pour une AAC ; les menus « Carences » et « Mesures »
  // ne montrent que ses dossiers. Le super-administrateur prend en barre
  // supérieure le poste d'une autre instance, ou les regarde toutes — la vue
  // régionale. Les autres comptes n'ont que la leur, et la barre la nomme.
  const etatInstances = (req) => instances.etat(req.user, loadConfig);

  app.get(`${M}/context`, requireAuth, (req, res) => {
    // Sans accès au module, l'écran ne s'ouvre pas : il s'ouvrait vide, et
    // laissait croire à une panne plutôt qu'à un refus.
    if (!moduleRights.accesAuModule(R.MODULE, req.user.username)) {
      return refuser(res, 'Ce module ne vous est pas ouvert. Veuillez contacter l’administrateur.');
    }
    return res.json({
      user: vueUtilisateur(req.user),
      privilege: R.meilleurPrivilege(req.user, referentiels),
      instance: etatInstances(req),
    });
  });

  app.get(`${M}/instance`, requireAuth, (req, res) => res.json(etatInstances(req)));

  app.put(`${M}/instance`, requireAuth, (req, res) => {
    if (!instances.estRegional(req.user)) {
      return refuser(res, 'Choix de l’instance réservé au super-administrateur régional');
    }
    // Vide : la vue régionale. Sinon, une instance déclarée — le nom borne ce
    // que les écrans serviront, il ne s'invente pas.
    const demandee = String((req.body || {}).instance || '').trim();
    if (demandee && !instances.liste(loadConfig).includes(demandee)) {
      return inconnu(res, 'instance');
    }
    instances.definir(req.user.username, demandee);
    return res.json({ status: 'ok', instance: demandee });
  });

  app.get(`${M}/moi`, requireAuth, (req, res) => res.json(vueUtilisateur(req.user)));

  // Référentiels dont le module a besoin, servis en un seul appel.
  app.get(`${M}/referentiels`, requireAuth, (req, res) => {
    // Vue de l'instance regardée : ses organismes, la taxinomie commune.
    const refs = instances.refs(req.user, loadConfig);
    res.json({
      prestataires: (refs.prestataires || []).map((p) => ({
        id: p.id, nom: p.nom, trigramme: p.trigramme,
        domaine_id: p.domaine_id || '', secteur_id: p.secteur_id || '',
      })),
      domaines: (refs.domaines || []).map((d) => ({ id: d.id, code: d.code, nom: d.nom })),
      secteurs: (refs.secteurs || []).map((s) => ({
        id: s.id, code: s.code, nom: s.nom, domaine_id: s.domaine_id || '',
      })),
    });
  });

  // ══════════════════════════════════════
  //  Catégories et types
  // ══════════════════════════════════════

  const ordonner = (l) => l.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  app.get(`${M}/parametres`, requireAuth, (req, res) => {
    res.json({
      categories: ordonner(db.list('categories')),
      types: ordonner(db.list('types')),
      types_investigation: ordonner(db.list('types_investigation')),
      comites: ordonner(db.list('comites')),
      modifiable: editeur(req),
      supprimable: admin(req),
    });
  });

  // ── Comités décisionnels ──
  // Les instances qui siègent pour qualifier une carence et arrêter la
  // sanction. Une simple liste de noms : le comité retenu sera porté par la
  // mesure, à l'étape « Qualification et Mesures ».
  app.post(`${M}/parametres/comites`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    const code = codeDepuisLibelle(libelle);
    if (!code) return res.status(400).json({ error: 'Libellé inexploitable' });
    if (db.list('comites').some((c) => c.code === code)) {
      return existant(res, 'comite');
    }
    const c = { id: db.uid('mco'), code, libelle, ordre: db.list('comites').length };
    db.insert('comites', c);
    return res.status(201).json({ status: 'ok', id: c.id, code: c.code });
  });

  app.put(`${M}/parametres/comites/:id`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const c = db.get('comites', req.params.id);
    if (!c) return introuvable(res, 'comite');
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    // Le code ne suit pas le libellé : une décision déjà rendue le porte.
    db.update('comites', c.id, { libelle });
    return res.json({ status: 'ok' });
  });

  app.delete(`${M}/parametres/comites/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Suppression réservée au gestionnaire');
    const c = db.get('comites', req.params.id);
    if (!c) return introuvable(res, 'comite');
    // Un comité qui a siégé ne se retire pas : la mesure perdrait l'instance
    // qui l'a décidée.
    if (db.list('mesures').some((m) => m.comite_code === c.code)) {
      return res.status(400).json({ error: 'Ce comité a déjà siégé sur une mesure' });
    }
    db.remove('comites', c.id);
    return res.json({ status: 'ok' });
  });

  // ── Types d'investigation ──
  // Ce que l'équipe a fait pour établir les faits. Liste plate : un type ne
  // dépend d'aucune catégorie, contrairement aux types de mesure.
  app.post(`${M}/parametres/types-investigation`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    const code = codeDepuisLibelle(libelle);
    if (!code) return res.status(400).json({ error: 'Libellé inexploitable' });
    if (db.list('types_investigation').some((t) => t.code === code)) {
      return existant(res, 'type');
    }
    const t = { id: db.uid('mti'), code, libelle, ordre: db.list('types_investigation').length };
    db.insert('types_investigation', t);
    return res.status(201).json({ status: 'ok', id: t.id, code: t.code });
  });

  app.put(`${M}/parametres/types-investigation/:id`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const t = db.get('types_investigation', req.params.id);
    if (!t) return introuvable(res, 'type');
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    // Le code ne suit pas le libellé : les investigations déjà consignées le
    // portent, et un renommage ne doit pas les détacher de leur type.
    db.update('types_investigation', t.id, { libelle });
    return res.json({ status: 'ok' });
  });

  app.delete(`${M}/parametres/types-investigation/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Suppression réservée au gestionnaire');
    const t = db.get('types_investigation', req.params.id);
    if (!t) return introuvable(res, 'type');
    // Un type déjà employé par une investigation ne se retire pas : le travail
    // consigné perdrait son intitulé.
    const employe = db.list('traitements').some((x) => ((x.investigation || {}).travaux || [])
      .some((w) => w.type === t.code));
    if (employe) return res.status(400).json({ error: 'Ce type est employé par une investigation' });
    db.remove('types_investigation', t.id);
    return res.json({ status: 'ok' });
  });

  app.post(`${M}/parametres/categories`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    const code = codeDepuisLibelle(libelle);
    if (!code) return res.status(400).json({ error: 'Libellé inexploitable' });
    if (db.list('categories').some((c) => c.code === code)) {
      return existant(res, 'categorie');
    }
    const c = {
      id: db.uid('mca'), code, libelle,
      ordre: db.list('categories').length,
    };
    db.insert('categories', c);
    res.status(201).json({ status: 'ok', id: c.id, code: c.code });
  });

  app.put(`${M}/parametres/categories/:id`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const c = db.get('categories', req.params.id);
    if (!c) return introuvable(res, 'categorie');
    const d = req.body || {};
    const patch = {};
    // Le code ne change pas avec le libellé : les mesures déjà prises le
    // portent, et un renommage ne doit pas les détacher de leur catégorie.
    if (d.libelle !== undefined) {
      const libelle = String(d.libelle).trim();
      if (!libelle) return requis(res, 'libelle');
      patch.libelle = libelle;
    }
    if (d.ordre !== undefined) patch.ordre = Number(d.ordre) || 0;
    db.update('categories', c.id, patch);
    res.json({ status: 'ok' });
  });

  app.delete(`${M}/parametres/categories/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const c = db.get('categories', req.params.id);
    if (!c) return introuvable(res, 'categorie');
    // Une catégorie encore portée par une mesure ne se supprime pas : la
    // mesure deviendrait illisible.
    const utilisee = db.list('mesures').filter((m) => m.categorie === c.code).length;
    if (utilisee) {
      return res.status(400).json({
        error: `Catégorie utilisée par ${utilisee} mesure${utilisee > 1 ? 's' : ''}`,
      });
    }
    db.list('types').filter((t) => t.categorie_code === c.code)
      .forEach((t) => db.remove('types', t.id));
    db.remove('categories', c.id);
    res.json({ status: 'ok' });
  });

  app.post(`${M}/parametres/types`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const d = req.body || {};
    const libelle = String(d.libelle || '').trim();
    const categorie = String(d.categorie_code || '').trim();
    if (!libelle) return requis(res, 'libelle');
    if (!categorie) return requis(res, 'categorie');
    if (!db.list('categories').some((c) => c.code === categorie)) {
      return inconnu(res, 'categorie');
    }
    const code = codeDepuisLibelle(libelle);
    if (!code) return res.status(400).json({ error: 'Libellé inexploitable' });
    if (db.list('types').some((t) => t.code === code)) {
      return existant(res, 'type');
    }
    const t = {
      id: db.uid('mty'), categorie_code: categorie, code, libelle,
      ordre: db.list('types').length,
    };
    db.insert('types', t);
    res.status(201).json({ status: 'ok', id: t.id, code: t.code });
  });

  app.put(`${M}/parametres/types/:id`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const t = db.get('types', req.params.id);
    if (!t) return introuvable(res, 'type');
    const d = req.body || {};
    const patch = {};
    if (d.libelle !== undefined) {
      const libelle = String(d.libelle).trim();
      if (!libelle) return requis(res, 'libelle');
      patch.libelle = libelle;
    }
    if (d.categorie_code !== undefined) {
      const cat = String(d.categorie_code).trim();
      if (!db.list('categories').some((c) => c.code === cat)) {
        return inconnu(res, 'categorie');
      }
      patch.categorie_code = cat;
    }
    if (d.ordre !== undefined) patch.ordre = Number(d.ordre) || 0;
    db.update('types', t.id, patch);
    res.json({ status: 'ok' });
  });

  app.delete(`${M}/parametres/types/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const t = db.get('types', req.params.id);
    if (!t) return introuvable(res, 'type');
    const utilise = db.list('mesures').filter((m) => m.type_mesure === t.code).length;
    if (utilise) {
      return res.status(400).json({
        error: `Type utilisé par ${utilise} mesure${utilise > 1 ? 's' : ''}`,
      });
    }
    db.remove('types', t.id);
    res.json({ status: 'ok' });
  });
};

module.exports.codeDepuisLibelle = codeDepuisLibelle;
