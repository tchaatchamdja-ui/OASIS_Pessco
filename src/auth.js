// Authentification et gestion des utilisateurs — exigences TDR §F.3 :
// mot de passe 12+ caractères complexes, changement à la première connexion,
// blocage après tentatives infructueuses, session unique, déconnexion après inactivité.
const crypto = require('crypto');
const store = require('./store');
const audit = require('./audit');

const ROLES = ['SUPERADMIN', 'ADMIN', 'ADMIN_PRESTATAIRE', 'AAC', 'PRESTATAIRE', 'INDEPENDANT', 'INSPECTEUR'];
// token -> { username, lastActivity } — persisté pour survivre aux redémarrages du socle
const sessions = new Map(Object.entries(store.load('sessions', {})));

function persistSessions() {
  store.save('sessions', Object.fromEntries(sessions));
}

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function checkPassword(user, password) {
  const { hash } = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.hash));
}
function checkPasswordPublic(user, password) {
  if (!user) return false;
  try { return checkPassword(user, password); } catch { return false; }
}

// Génère un mot de passe conforme à la politique de complexité
function generatePassword(cfg) {
  const len = Math.max((cfg && cfg.security && cfg.security.passwordMinLength) || 12, 12);
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789', S = '!@#$%&*?-';
  const all = U + L + D + S;
  const pick = (set) => set[crypto.randomInt(set.length)];
  let pwd = [pick(U), pick(L), pick(D), pick(S)];
  while (pwd.length < len) pwd.push(pick(all));
  for (let i = pwd.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [pwd[i], pwd[j]] = [pwd[j], pwd[i]]; }
  return pwd.join('');
}

function passwordPolicyErrors(password, cfg) {
  const sec = cfg.security;
  const errors = [];
  if (password.length < sec.passwordMinLength) errors.push(`longueur minimale ${sec.passwordMinLength} caractères`);
  if (sec.passwordRequireUpper && !/[A-Z]/.test(password)) errors.push('au moins une majuscule');
  if (sec.passwordRequireLower && !/[a-z]/.test(password)) errors.push('au moins une minuscule');
  if (sec.passwordRequireDigit && !/[0-9]/.test(password)) errors.push('au moins un chiffre');
  if (sec.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push('au moins un caractère spécial');
  return errors;
}

function getUsers() {
  return store.load('users', []);
}

function saveUsers(users) {
  store.save('users', users);
}

function findUser(username) {
  return getUsers().find((u) => u.username === username);
}

function publicUser(u) {
  const { salt, hash, passwordHistory, ...rest } = u;
  return rest;
}

// Comptes d'amorçage : leurs mots de passe ne vivent pas dans le code. Ils
// sont tirés au hasard au premier démarrage et affichés une seule fois sur la
// console ; l'exploitant peut en imposer un par OASIS_SEED_PASSWORD (utile en
// développement et pour les tests de fumée).
function seedUsers(cfg) {
  if (getUsers().length) return;
  const impose = process.env.OASIS_SEED_PASSWORD || '';
  const secrets = [];
  const motDePasse = () => {
    if (impose) return { valeur: impose, genere: false };
    return { valeur: generatePassword(cfg), genere: true };
  };
  const users = [
    { nom: 'ADMINISTRATEUR', prenom: 'Super', email: 'superadmin@anac.bj', role: 'SUPERADMIN' },
    { nom: 'ADMIN', prenom: 'AAC', email: 'admin@anac.bj', role: 'ADMIN' },
    { nom: 'AHOYO', prenom: 'Marcelin', email: 'm.ahoyo@anac.bj', role: 'AAC' },
  ].map((u) => {
    const { valeur, genere } = motDePasse();
    secrets.push({ email: u.email, password: valeur, genere });
    // Un mot de passe tiré au hasard doit être changé à la première
    // connexion ; un mot de passe voulu par l'exploitant ne s'impose qu'aux
    // comptes autres que le super-administrateur.
    return { ...u, username: u.email, password: valeur, mustChange: genere || u.role !== 'SUPERADMIN' };
  });
  saveUsers(
    users.map((u) => {
      const { salt, hash } = hashPassword(u.password);
      return {
        username: u.username,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        fullName: `${u.nom} ${u.prenom}`.trim(),
        role: u.role,
        salt,
        hash,
        active: true,
        locked: false,
        failedAttempts: 0,
        mustChange: u.mustChange,
        passwordChangedAt: new Date().toISOString(),
        passwordHistory: [hash],
        createdAt: new Date().toISOString(),
        createdBy: 'installation',
      };
    })
  );
  audit.log('système', 'INIT', { message: 'Comptes initiaux créés (superadmin, admin.aac, inspecteur1)' });

  // Les identifiants ne sont montrés qu'ici, au premier démarrage : ils ne
  // sont écrits ni dans le code, ni dans un fichier, ni dans le journal.
  if (secrets.some((x) => x.genere)) {
    console.log('');
    console.log('  ┌─ OASIS — comptes créés au premier démarrage ─────────────────────┐');
    secrets.forEach(({ email, password }) => {
      console.log(`  │  ${email.padEnd(24)} ${password}`);
    });
    console.log('  │  Mot de passe à changer à la première connexion.');
    console.log('  └──────────────────────────────────────────────────────────────────┘');
    console.log('');
  }
}

// ── Sessions ──
function createSession(username, cfg) {
  if (cfg.security.singleSession) {
    for (const [token, s] of sessions) if (s.username === username) sessions.delete(token);
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, lastActivity: Date.now() });
  persistSessions();
  return token;
}

function getSession(token, cfg) {
  if (!token || !sessions.has(token)) return null;
  const s = sessions.get(token);
  const timeoutMs = cfg.security.sessionTimeoutMinutes * 60 * 1000;
  if (Date.now() - s.lastActivity > timeoutMs) {
    sessions.delete(token);
    persistSessions();
    return null;
  }
  s.lastActivity = Date.now();
  return s;
}

function destroySession(token) {
  sessions.delete(token);
  persistSessions();
}

// ── Login ──
function login(username, password, cfg, opts) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user || !user.active) {
    audit.log(username, 'LOGIN_ECHEC', { motif: 'compte inconnu ou inactif' });
    return { ok: false, error: 'invalid' };
  }
  if (user.locked) {
    audit.log(username, 'LOGIN_ECHEC', { motif: 'compte bloqué' });
    return { ok: false, error: 'locked' };
  }
  // Mot de passe temporaire expiré (48h) et non encore utilisé
  if (user.mustChange && user.tempExpiresAt && Date.now() > new Date(user.tempExpiresAt).getTime()) {
    audit.log(username, 'LOGIN_ECHEC', { motif: 'mot de passe temporaire expiré' });
    return { ok: false, error: 'temp_expired' };
  }
  if (!checkPassword(user, password)) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    let error = 'invalid';
    if (user.failedAttempts >= cfg.security.maxFailedAttempts) {
      user.locked = true;
      error = 'locked';
      audit.log(username, 'COMPTE_BLOQUE', { tentatives: user.failedAttempts });
      notify(`Compte « ${username} » bloqué après ${user.failedAttempts} tentatives infructueuses.`, 'warning');
    } else {
      audit.log(username, 'LOGIN_ECHEC', { tentative: user.failedAttempts });
    }
    saveUsers(users);
    return { ok: false, error };
  }
  user.failedAttempts = 0;
  saveUsers(users);
  // MFA : le mot de passe est validé mais la session n'est ouverte qu'après le code
  if (opts && opts.noSession) return { ok: true, pending: true, account: user };
  const token = createSession(user.username, cfg);
  audit.log(username, 'LOGIN', { role: user.role });
  return { ok: true, token, user: publicUser(user) };
}

function changePassword(username, oldPassword, newPassword, cfg) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return { ok: false, error: 'invalid' };
  if (!checkPassword(user, oldPassword)) return { ok: false, error: 'wrong_old' };
  const errors = passwordPolicyErrors(newPassword, cfg);
  if (errors.length) return { ok: false, error: 'policy', details: errors };
  const { hash: newHash } = hashPassword(newPassword, user.salt);
  const history = user.passwordHistory || [];
  if (history.includes(newHash)) return { ok: false, error: 'reused' };
  const { salt, hash } = hashPassword(newPassword);
  user.salt = salt;
  user.hash = hash;
  user.mustChange = false;
  user.tempExpiresAt = null;
  user.passwordChangedAt = new Date().toISOString();
  user.passwordHistory = [...history, newHash].slice(-cfg.security.passwordHistoryCount);
  saveUsers(users);
  audit.log(username, 'MOT_DE_PASSE_CHANGE', {});
  return { ok: true };
}

// ── Notifications globales (socle) ──
function notify(message, type) {
  const notifications = store.load('notifications', []);
  notifications.push({ id: notifications.length + 1, ts: new Date().toISOString(), message, type: type || 'info' });
  store.save('notifications', notifications.slice(-100));
}

module.exports = {
  ROLES,
  sessions,
  hashPassword,
  checkPasswordPublic,
  generatePassword,
  getUsers,
  saveUsers,
  findUser,
  publicUser,
  seedUsers,
  getSession,
  createSession,
  destroySession,
  login,
  changePassword,
  notify
};
