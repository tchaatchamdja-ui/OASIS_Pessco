// Module « Mesures d'Application » — contexte et paramétrage.
//
// Le paramétrage tient en deux listes emboîtées : des catégories de mesure, et
// des types rattachés à une catégorie. Ce sont elles qui peuplent les listes
// déroulantes du formulaire de mesure.
const referentiels = require('../../referentiels');
const moduleRights = require('../../module_rights');
const { asynchrone } = require('../../route');
const db = require('./store');
const R = require('./roles');
const instances = require('../../instances');
const { introuvable, requis, inconnu, existant, reserve, refuser, enUsage } = require('../../erreurs');

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
      return res.status(403).json({ error: 'no_module_access' });
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
      return reserve(res, 'super_admin_regional');
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

  // ── Créer et supprimer un paramètre, en une seule transformation ──
  //
  // Six créations et quatre suppressions suivaient la même forme : vérifier,
  // puis écrire. **La vérification était hors de l'écriture qu'elle gardait.**
  // Deux créations du même libellé parties ensemble la passaient toutes deux et
  // posaient deux rangs portant le même `code` — or c'est `code` que les mesures
  // retiennent, précisément pour qu'un renommage ne les orpheline pas. Deux
  // catégories sous un même code rendaient la mesure ambiguë.
  //
  // Le refus se rend donc dans la transformation, et la réponse après : un
  // transformateur peut être rejoué, et répondre dedans répondrait deux fois.
  const creer = async (coll, prefixe, libelle, extra) => {
    const code = codeDepuisLibelle(libelle);
    if (!code) return { refus: { code: 400, corps: { error: 'Libellé inexploitable' } } };
    // Tiré hors de la transformation : rejouée, elle doit reposer le même.
    const id = db.uid(prefixe);
    let doublon = false;
    let rang = null;
    await db.transformer((d) => {
      doublon = false; rang = null;
      const liste = d[coll] || [];
      if (liste.some((x) => x.code === code)) { doublon = true; return db.INCHANGE; }
      rang = { id, code, libelle, ordre: liste.length, ...(extra || {}) };
      liste.push(rang);
      d[coll] = liste;
      return d;
    });
    return doublon ? { doublon: true } : { rang };
  };

  // `empeche(d)` rend le nombre d'emplois qui interdisent le retrait, lu sur
  // l'état qu'on va écrire — un emploi survenu entre la vérification et le
  // retrait passait inaperçu. `aussi` emporte ce qui n'existe que par le rang.
  const supprimer = async (coll, id, empeche, aussi) => {
    let etat = null;
    await db.transformer((d) => {
      etat = null;
      const liste = d[coll] || [];
      const i = liste.findIndex((x) => x.id === id);
      if (i < 0) { etat = { absent: true }; return db.INCHANGE; }
      const employe = empeche ? empeche(d, liste[i]) : 0;
      if (employe) { etat = { employe }; return db.INCHANGE; }
      if (aussi) aussi(d, liste[i]);
      liste.splice(i, 1);
      etat = { ote: true };
      return d;
    });
    return etat;
  };

  app.get(`${M}/parametres`, requireAuth, asynchrone(async (req, res) => {
    // Les quatre listes ensemble : enchaîner quatre allers-retours pour peupler
    // des listes déroulantes quadruplerait l'attente de l'écran.
    const [categories, types, investigation, comites] = await Promise.all(
      ['categories', 'types', 'types_investigation', 'comites'].map((c) => db.list(c)),
    );
    res.json({
      categories: ordonner(categories),
      types: ordonner(types),
      types_investigation: ordonner(investigation),
      comites: ordonner(comites),
      modifiable: editeur(req),
      supprimable: admin(req),
    });
  }));

  // ── Comités décisionnels ──
  // Les instances qui siègent pour qualifier une carence et arrêter la
  // sanction. Une simple liste de noms : le comité retenu sera porté par la
  // mesure, à l'étape « Qualification et Mesures ».
  app.post(`${M}/parametres/comites`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    const issu = await creer('comites', 'mco', libelle);
    if (issu.refus) return res.status(issu.refus.code).json(issu.refus.corps);
    if (issu.doublon) return existant(res, 'comite');
    return res.status(201).json({ status: 'ok', id: issu.rang.id, code: issu.rang.code });
  }));

  app.put(`${M}/parametres/comites/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    // Le code ne suit pas le libellé : une décision déjà rendue le porte.
    const maj = await db.update('comites', req.params.id, { libelle });
    return maj ? res.json({ status: 'ok' }) : introuvable(res, 'comite');
  }));

  app.delete(`${M}/parametres/comites/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!admin(req)) return reserve(res, 'gestionnaire');
    // Un comité qui a siégé ne se retire pas : la mesure perdrait l'instance
    // qui l'a décidée.
    const etat = await supprimer('comites', req.params.id,
      (d, c) => (d.mesures || []).filter((m) => m.comite_code === c.code).length);
    if (etat.absent) return introuvable(res, 'comite');
    if (etat.employe) return res.status(400).json({ error: 'Ce comité a déjà siégé sur une mesure' });
    return res.json({ status: 'ok' });
  }));

  // ── Types d'investigation ──
  // Ce que l'équipe a fait pour établir les faits. Liste plate : un type ne
  // dépend d'aucune catégorie, contrairement aux types de mesure.
  app.post(`${M}/parametres/types-investigation`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    const issu = await creer('types_investigation', 'mti', libelle);
    if (issu.refus) return res.status(issu.refus.code).json(issu.refus.corps);
    if (issu.doublon) return existant(res, 'type');
    return res.status(201).json({ status: 'ok', id: issu.rang.id, code: issu.rang.code });
  }));

  app.put(`${M}/parametres/types-investigation/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    // Le code ne suit pas le libellé : les investigations déjà consignées le
    // portent, et un renommage ne doit pas les détacher de leur type.
    const maj = await db.update('types_investigation', req.params.id, { libelle });
    return maj ? res.json({ status: 'ok' }) : introuvable(res, 'type');
  }));

  app.delete(`${M}/parametres/types-investigation/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!admin(req)) return reserve(res, 'gestionnaire');
    // Un type déjà employé par une investigation ne se retire pas : le travail
    // consigné perdrait son intitulé.
    const etat = await supprimer('types_investigation', req.params.id,
      (d, t) => (d.traitements || []).filter((x) => ((x.investigation || {}).travaux || [])
        .some((w) => w.type === t.code)).length);
    if (etat.absent) return introuvable(res, 'type');
    if (etat.employe) return enUsage(res, 'type', etat.employe);
    return res.json({ status: 'ok' });
  }));

  app.post(`${M}/parametres/categories`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const libelle = String((req.body || {}).libelle || '').trim();
    if (!libelle) return requis(res, 'libelle');
    const issu = await creer('categories', 'mca', libelle);
    if (issu.refus) return res.status(issu.refus.code).json(issu.refus.corps);
    if (issu.doublon) return existant(res, 'categorie');
    return res.status(201).json({ status: 'ok', id: issu.rang.id, code: issu.rang.code });
  }));

  app.put(`${M}/parametres/categories/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
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
    const maj = await db.update('categories', req.params.id, patch);
    return maj ? res.json({ status: 'ok' }) : introuvable(res, 'categorie');
  }));

  app.delete(`${M}/parametres/categories/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!admin(req)) return reserve(res, 'gestionnaire');
    // Une catégorie encore portée par une mesure ne se supprime pas : la
    // mesure deviendrait illisible. Ses types partent avec elle — c'était une
    // écriture par type, plus une : entre elles, des types rattachés à une
    // catégorie disparue, que plus aucun écran n'atteint.
    const etat = await supprimer('categories', req.params.id,
      (d, c) => (d.mesures || []).filter((m) => m.categorie === c.code).length,
      (d, c) => { d.types = (d.types || []).filter((t) => t.categorie_code !== c.code); });
    if (etat.absent) return introuvable(res, 'categorie');
    if (etat.employe) return enUsage(res, 'categorie', etat.employe);
    return res.json({ status: 'ok' });
  }));

  app.post(`${M}/parametres/types`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const d = req.body || {};
    const libelle = String(d.libelle || '').trim();
    const categorie = String(d.categorie_code || '').trim();
    if (!libelle) return requis(res, 'libelle');
    if (!categorie) return requis(res, 'categorie');
    if (!(await db.list('categories')).some((c) => c.code === categorie)) {
      return inconnu(res, 'categorie');
    }
    const issu = await creer('types', 'mty', libelle, { categorie_code: categorie });
    if (issu.refus) return res.status(issu.refus.code).json(issu.refus.corps);
    if (issu.doublon) return existant(res, 'type');
    return res.status(201).json({ status: 'ok', id: issu.rang.id, code: issu.rang.code });
  }));

  app.put(`${M}/parametres/types/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!editeur(req)) return refuser(res);
    const d = req.body || {};
    const patch = {};
    if (d.libelle !== undefined) {
      const libelle = String(d.libelle).trim();
      if (!libelle) return requis(res, 'libelle');
      patch.libelle = libelle;
    }
    if (d.categorie_code !== undefined) {
      const cat = String(d.categorie_code).trim();
      if (!(await db.list('categories')).some((c) => c.code === cat)) {
        return inconnu(res, 'categorie');
      }
      patch.categorie_code = cat;
    }
    if (d.ordre !== undefined) patch.ordre = Number(d.ordre) || 0;
    const maj = await db.update('types', req.params.id, patch);
    return maj ? res.json({ status: 'ok' }) : introuvable(res, 'type');
  }));

  app.delete(`${M}/parametres/types/:id`, requireAuth, asynchrone(async (req, res) => {
    if (!admin(req)) return reserve(res, 'gestionnaire');
    const etat = await supprimer('types', req.params.id,
      (d, t) => (d.mesures || []).filter((m) => m.type_mesure === t.code).length);
    if (etat.absent) return introuvable(res, 'type');
    if (etat.employe) return enUsage(res, 'type', etat.employe);
    return res.json({ status: 'ok' });
  }));
};

module.exports.codeDepuisLibelle = codeDepuisLibelle;
