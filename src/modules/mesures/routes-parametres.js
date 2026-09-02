// Module « Mesures d'Application » — contexte et paramétrage.
//
// Le paramétrage tient en deux listes emboîtées : des catégories de mesure, et
// des types rattachés à une catégorie. Ce sont elles qui peuplent les listes
// déroulantes du formulaire de mesure.
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const db = require('./store');
const R = require('./roles');

// Code technique dérivé d'un libellé : c'est lui qui est stocké sur la mesure,
// de sorte qu'un libellé renommé n'orpheline pas les mesures existantes.
const codeDepuisLibelle = (libelle) => String(libelle || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 40);

module.exports = function register(app, deps, M) {
  const { requireAuth } = deps;
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

  app.get(`${M}/context`, requireAuth, (req, res) => {
    res.json({
      user: vueUtilisateur(req.user),
      privilege: R.meilleurPrivilege(req.user, referentiels),
    });
  });

  app.get(`${M}/moi`, requireAuth, (req, res) => res.json(vueUtilisateur(req.user)));

  // Référentiels dont le module a besoin, servis en un seul appel.
  app.get(`${M}/referentiels`, requireAuth, (req, res) => {
    const refs = referentiels.getAll();
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
      modifiable: editeur(req),
      supprimable: admin(req),
    });
  });

  app.post(`${M}/parametres/categories`, requireAuth, (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return res.status(400).json({ error: 'Libellé requis' });
    const code = codeDepuisLibelle(libelle);
    if (!code) return res.status(400).json({ error: 'Libellé inexploitable' });
    if (db.list('categories').some((c) => c.code === code)) {
      return res.status(400).json({ error: 'Une catégorie porte déjà ce libellé' });
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
    if (!c) return res.status(404).json({ error: 'Catégorie non trouvée' });
    const d = req.body || {};
    const patch = {};
    // Le code ne change pas avec le libellé : les mesures déjà prises le
    // portent, et un renommage ne doit pas les détacher de leur catégorie.
    if (d.libelle !== undefined) {
      const libelle = String(d.libelle).trim();
      if (!libelle) return res.status(400).json({ error: 'Libellé requis' });
      patch.libelle = libelle;
    }
    if (d.ordre !== undefined) patch.ordre = Number(d.ordre) || 0;
    db.update('categories', c.id, patch);
    res.json({ status: 'ok' });
  });

  app.delete(`${M}/parametres/categories/:id`, requireAuth, (req, res) => {
    if (!admin(req)) return refuser(res, 'Réservé au gestionnaire du module');
    const c = db.get('categories', req.params.id);
    if (!c) return res.status(404).json({ error: 'Catégorie non trouvée' });
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
    if (!libelle) return res.status(400).json({ error: 'Libellé requis' });
    if (!categorie) return res.status(400).json({ error: 'Catégorie requise' });
    if (!db.list('categories').some((c) => c.code === categorie)) {
      return res.status(400).json({ error: 'Catégorie inconnue' });
    }
    const code = codeDepuisLibelle(libelle);
    if (!code) return res.status(400).json({ error: 'Libellé inexploitable' });
    if (db.list('types').some((t) => t.code === code)) {
      return res.status(400).json({ error: 'Un type porte déjà ce libellé' });
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
    if (!t) return res.status(404).json({ error: 'Type non trouvé' });
    const d = req.body || {};
    const patch = {};
    if (d.libelle !== undefined) {
      const libelle = String(d.libelle).trim();
      if (!libelle) return res.status(400).json({ error: 'Libellé requis' });
      patch.libelle = libelle;
    }
    if (d.categorie_code !== undefined) {
      const cat = String(d.categorie_code).trim();
      if (!db.list('categories').some((c) => c.code === cat)) {
        return res.status(400).json({ error: 'Catégorie inconnue' });
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
    if (!t) return res.status(404).json({ error: 'Type non trouvé' });
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
