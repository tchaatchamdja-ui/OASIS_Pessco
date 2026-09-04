// OASIS — Gestion des droits par module.
// Les personnes concernées sont les utilisateurs du portail dont le module
// figure dans « Accès aux modules » (champ user.modules).
// Privilège général : GESTIONNAIRE (le plus large) ou VALIDATEUR /
// CONTRIBUTEUR / LECTEUR. Défaut : LECTEUR.
// Portées particulières : par domaine (et secteur) le privilège peut être
// relevé, abaissé, ou mis à AUCUN — l'utilisateur n'accède alors pas aux
// données de ce domaine / secteur.
const store = require('./store');
const referentiels = require('./referentiels');
const moduleAudit = require('./module_audit');

const PRIVILEGES = ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR'];
const SCOPE_PRIVILEGES = ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR', 'AUCUN'];
const DEFAULT_PRIVILEGE = 'LECTEUR';
const RANK = ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR', 'AUCUN'];

// Privilèges supplémentaires propres à certains modules. « PRESTATAIRE » n'est
// pas un échelon de l'échelle AAC mais un mode d'accès distinct : l'utilisateur
// ne voit que les données du prestataire auquel son compte est rattaché. Il
// reste donc hors de RANK, si bien que les contrôles AAC (`can`) le refusent,
// et c'est le module qui lui ouvre son propre périmètre.
const PRIVILEGES_MODULE = {
  SURV: [...PRIVILEGES, 'PRESTATAIRE'],
  // SAFA sert les deux mêmes publics : l'autorité, et l'exploitant inspecté.
  SAFA: [...PRIVILEGES, 'PRESTATAIRE'],
};

// Rôles du portail concernés par la gestion des droits : les comptes humains
// de l'autorité. Un module qui ouvre le privilège « Prestataire » y ajoute les
// administrateurs de prestataire, seuls susceptibles de le recevoir ; les
// comptes prestataires simples tirent leurs accès de leur rattachement.
const ROLES_GERES = ['SUPERADMIN', 'ADMIN', 'AAC'];
const ROLES_GERES_MODULE = {
  SURV: [...ROLES_GERES, 'ADMIN_PRESTATAIRE'],
  SAFA: [...ROLES_GERES, 'ADMIN_PRESTATAIRE'],
};

const privilegesDe = (moduleCode) => PRIVILEGES_MODULE[moduleCode] || PRIVILEGES;
const rolesGeresDe = (moduleCode) => ROLES_GERES_MODULE[moduleCode] || ROLES_GERES;

const load = () => store.load('module_rights', {});
const save = (d) => store.save('module_rights', d);

function getRights(moduleCode, username) {
  const rec = (load()[moduleCode] || {})[username];
  if (!rec) return { privilege: DEFAULT_PRIVILEGE, scopes: [], isDefault: true };
  return { privilege: rec.privilege, scopes: rec.scopes || [], isDefault: false, updatedAt: rec.updatedAt, updatedBy: rec.updatedBy };
}

function setRights(moduleCode, username, value) {
  const all = load();
  all[moduleCode] = all[moduleCode] || {};
  if (value === null) delete all[moduleCode][username];
  else all[moduleCode][username] = value;
  save(all);
  return value;
}

// Domaine parent d'un secteur (le contexte ne fournit pas toujours le domaine)
function domaineOfSecteur(secteurId) {
  if (!secteurId) return '';
  const s = (referentiels.getAll().secteurs || []).find((x) => x.id === secteurId);
  return s ? s.domaine_id || '' : '';
}

// Privilège effectif : la portée la plus spécifique l'emporte
// (domaine + secteur > secteur seul > domaine seul > privilège général).
// Le domaine manquant est déduit du secteur, sinon une portée par domaine
// resterait sans effet quand l'appelant ne transmet que le secteur.
function effectivePrivilege(moduleCode, username, domaineId, secteurId) {
  const r = getRights(moduleCode, username);
  const dom = domaineId || domaineOfSecteur(secteurId);
  if (!dom && !secteurId) return r.privilege;
  const scopes = r.scopes || [];
  if (secteurId) {
    const exact = scopes.find((s) => s.secteur_id === secteurId && (!s.domaine_id || !dom || s.domaine_id === dom));
    if (exact) return exact.privilege;
  }
  if (dom) {
    const byDom = scopes.find((s) => s.domaine_id === dom && !s.secteur_id);
    if (byDom) return byDom.privilege;
  }
  return r.privilege;
}

function can(moduleCode, username, privilege, domaineId, secteurId) {
  const eff = effectivePrivilege(moduleCode, username, domaineId, secteurId);
  if (eff === 'AUCUN') return false;
  const need = RANK.indexOf(privilege);
  const have = RANK.indexOf(eff);
  return have >= 0 && need >= 0 && have <= need;
}

function normalizeScopes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      domaine_id: String(s.domaine_id || '').trim(),
      secteur_id: String(s.secteur_id || '').trim(),
      privilege: String(s.privilege || '').toUpperCase(),
    }))
    .filter((s) => s.domaine_id && SCOPE_PRIVILEGES.includes(s.privilege))
    .filter((s, i, a) => a.findIndex((x) => x.domaine_id === s.domaine_id && x.secteur_id === s.secteur_id) === i);
}

// Portées du privilège « Prestataire » : la liste des prestataires dont le
// compte voit les données. Elle remplace les portées domaine/secteur, sans
// objet ici. Liste vide = aucun accès aux données du module.
function normalizeScopesPrestataire(raw) {
  if (!Array.isArray(raw)) return [];
  const connus = new Set((referentiels.getAll().prestataires || []).map((p) => p.id));
  return raw
    .map((s) => ({ prestataire_id: String((s && s.prestataire_id) || s || '').trim() }))
    .filter((s) => s.prestataire_id && connus.has(s.prestataire_id))
    .filter((s, i, a) => a.findIndex((x) => x.prestataire_id === s.prestataire_id) === i);
}

// Prestataires accessibles à un compte au titre du privilège « Prestataire ».
function prestatairesDuScope(moduleCode, username) {
  const r = getRights(moduleCode, username);
  if (r.privilege !== 'PRESTATAIRE') return [];
  return (r.scopes || []).map((s) => s.prestataire_id).filter(Boolean);
}

function register(app, deps) {
  const { requireAuth, requireRole, auth, loadConfig, audit } = deps;
  const R = '/api/m/droits';
  const canManage = requireRole('SUPERADMIN', 'ADMIN');

  // `module` permet d'obtenir la liste de privilèges propre au module géré.
  app.get(`${R}/context`, requireAuth, (req, res) => {
    const cfg = loadConfig();
    res.json({
      user: auth.publicUser(req.user),
      aac: cfg.aac || {},
      instance: cfg.instance,
      privileges: privilegesDe(String(req.query.module || '').toUpperCase()),
      scopePrivileges: SCOPE_PRIVILEGES,
      defaultPrivilege: DEFAULT_PRIVILEGE,
      auditActions: moduleAudit.ACTIONS,
    });
  });

  // ── Journal d'audit du module (inaltérable) ──
  app.get(`${R}/:module/audit`, requireAuth, canManage, (req, res) => {
    const code = req.params.module.toUpperCase();
    const { user, action, from, to, q, limit } = req.query;
    const ql = (q || '').toLowerCase();
    let rows = moduleAudit.list(code).slice().reverse();
    if (user) rows = rows.filter((e) => e.user === user);
    if (action) rows = rows.filter((e) => e.action === action);
    if (from) rows = rows.filter((e) => e.ts >= from);
    if (to) rows = rows.filter((e) => e.ts <= to + 'T23:59:59.999Z');
    if (ql) {
      rows = rows.filter((e) =>
        [e.user, e.actionLabel, e.objet, e.ref, JSON.stringify(e.details)].join(' ').toLowerCase().includes(ql)
      );
    }
    const total = rows.length;
    const n = Math.min(parseInt(limit, 10) || 500, 2000);
    res.json({ total, entries: rows.slice(0, n), integrity: moduleAudit.verifyChain(code) });
  });

  app.get(`${R}/:module/audit/verify`, requireAuth, canManage, (req, res) => {
    res.json(moduleAudit.verifyChain(req.params.module.toUpperCase()));
  });

  // Privilège de l'utilisateur courant (lisible par tous : affiché en barre supérieure)
  app.get(`${R}/:module/me`, requireAuth, (req, res) => {
    const code = req.params.module.toUpperCase();
    const hasModule = Array.isArray(req.user.modules) && req.user.modules.includes(code);
    if (!hasModule) return res.json({ module: code, hasAccess: false, privilege: '', scopes: [] });
    const r = getRights(code, req.user.username);
    res.json({ module: code, hasAccess: true, ...r });
  });

  // Évaluateurs éligibles : utilisateurs du module dont le privilège effectif
  // sur le domaine/secteur visé est Contributeur, Validateur ou Gestionnaire.
  // Les SuperAdmin du portail sont exclus (compte technique, pas évaluateur).
  app.get(`${R}/:module/evaluateurs`, requireAuth, (req, res) => {
    const code = req.params.module.toUpperCase();
    const { domaine_id: dom, secteur_id: sec } = req.query;
    const list = auth
      .getUsers()
      .filter((u) => u.active !== false)
      .filter((u) => u.role !== 'SUPERADMIN')
      .filter((u) => Array.isArray(u.modules) && u.modules.includes(code))
      .map((u) => ({ u, priv: effectivePrivilege(code, u.username, dom || '', sec || '') }))
      .filter(({ priv }) => ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR'].includes(priv))
      .map(({ u, priv }) => ({
        id: u.username,
        username: u.username,
        nom: u.nom || '',
        prenom: u.prenom || '',
        fullName: u.fullName || u.username,
        email: u.email || u.username,
        role: u.role,
        privilege: priv,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    res.json(list);
  });

  // Accès de l'utilisateur courant, secteur par secteur : base des règles
  // d'affichage et de création côté module.
  app.get(`${R}/:module/my-access`, requireAuth, (req, res) => {
    const code = req.params.module.toUpperCase();
    const hasModule = Array.isArray(req.user.modules) && req.user.modules.includes(code);
    if (!hasModule) return res.json({ hasAccess: false, privilege: '', secteurs: {} });
    const base = getRights(code, req.user.username);
    const secteurs = {};
    for (const s of referentiels.getAll().secteurs || []) {
      secteurs[s.id] = effectivePrivilege(code, req.user.username, s.domaine_id || '', s.id);
    }
    res.json({ hasAccess: true, privilege: base.privilege, isDefault: base.isDefault, secteurs });
  });

  app.get(`${R}/refs`, requireAuth, canManage, (req, res) => {
    const refs = referentiels.getAll();
    res.json({
      domaines: refs.domaines || [],
      secteurs: refs.secteurs || [],
      // Portées du privilège « Prestataire »
      prestataires: (refs.prestataires || [])
        .map((p) => ({ id: p.id, nom: p.nom, trigramme: p.trigramme, secteur_id: p.secteur_id || '' }))
        .sort((a, b) => String(a.nom).localeCompare(String(b.nom))),
    });
  });

  // Utilisateurs ayant le module dans « Accès aux modules »
  app.get(`${R}/:module/users`, requireAuth, canManage, (req, res) => {
    const code = req.params.module.toUpperCase();
    const users = auth
      .getUsers()
      .filter((u) => rolesGeresDe(code).includes(u.role))
      .filter((u) => Array.isArray(u.modules) && u.modules.includes(code))
      .map((u) => {
        const r = getRights(code, u.username);
        return {
          username: u.username,
          nom: u.nom || '',
          prenom: u.prenom || '',
          fullName: u.fullName || u.username,
          email: u.email || u.username,
          role: u.role,
          active: u.active !== false,
          prestataire_id: u.prestataire_id || '',
          privilege: r.privilege,
          scopes: r.scopes,
          isDefault: r.isDefault,
          updatedAt: r.updatedAt || null,
          updatedBy: r.updatedBy || null,
        };
      });
    res.json(users);
  });

  app.put(`${R}/:module/users/:username`, requireAuth, canManage, (req, res) => {
    const code = req.params.module.toUpperCase();
    const username = req.params.username;
    const target = auth.getUsers().find((u) => u.username === username);
    if (!target) return res.status(404).json({ error: 'unknown_user' });
    if (!Array.isArray(target.modules) || !target.modules.includes(code)) {
      return res.status(400).json({ error: 'no_module_access' });
    }
    // Même population que la liste : on ne règle pas les droits d'un compte
    // qui n'y figure pas.
    if (!rolesGeresDe(code).includes(target.role)) {
      return res.status(400).json({ error: 'role_hors_perimetre' });
    }

    const privilege = String((req.body || {}).privilege || DEFAULT_PRIVILEGE).toUpperCase();
    if (!privilegesDe(code).includes(privilege)) return res.status(400).json({ error: 'unknown_privilege' });

    // En mode prestataire, la portée désigne les prestataires accessibles ;
    // les portées domaine/secteur n'ont pas de sens et sont écartées.
    const scopes = privilege === 'PRESTATAIRE'
      ? normalizeScopesPrestataire((req.body || {}).scopes)
      : normalizeScopes((req.body || {}).scopes);

    // Défaut (Lecteur sans portée particulière) : aucun enregistrement à conserver
    if (privilege === DEFAULT_PRIVILEGE && !scopes.length) {
      setRights(code, username, null);
      audit.log(req.user.username, 'DROITS_MODULE_DEFAUT', { module: code, cible: username });
      return res.json({ ok: true, privilege: DEFAULT_PRIVILEGE, scopes: [], isDefault: true });
    }

    const value = { privilege, scopes, updatedAt: new Date().toISOString(), updatedBy: req.user.username };
    setRights(code, username, value);
    audit.log(req.user.username, 'DROITS_MODULE_MODIFIES', { module: code, cible: username, privilege, scopes });
    res.json({ ok: true, ...value, isDefault: false });
  });

  return { can, getRights, effectivePrivilege };
}

module.exports = {
  register, can, getRights, setRights, effectivePrivilege, prestatairesDuScope
  };
