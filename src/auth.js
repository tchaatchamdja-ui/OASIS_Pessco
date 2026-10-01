// Authentification et gestion des utilisateurs — exigences TDR §F.3 :
// mot de passe 12+ caractères complexes, changement à la première connexion,
// blocage après tentatives infructueuses, session unique, déconnexion après inactivité.
const crypto = require('crypto');
const trace = require('./trace');
const store = require('./store');
// Les avis du socle vivent dans une collection migrée : ils passent par la
// façade (ADR-002, étape B).
const magasin = require('./magasin');
const annuaire = require('./annuaire');
const audit = require('./audit');

const ROLES = ['SUPERADMIN', 'ADMIN', 'ADMIN_PRESTATAIRE', 'AAC', 'PRESTATAIRE', 'INDEPENDANT', 'INSPECTEUR'];
// token -> { username, lastActivity } — persisté pour survivre aux redémarrages
// du socle.
//
// ── La table en mémoire fait foi, le magasin ne fait que la garder ──
//
// `getSession` reste **synchrone** : il lit la table, pas le magasin. C'est ce
// qui permet à `requireAuth` de rester léger — une requête sur deux n'écrit
// rien, et il n'y a donc rien à attendre.
//
// Seules trois écritures persistent : l'ouverture, la fermeture, et l'expiration
// constatée. Elles sont asynchrones depuis que `sessions` vit en base (ADR-002,
// étape B), et la table est chargée au démarrage avant que le serveur écoute.
const sessions = new Map();

async function chargerSessions() {
  const posees = await magasin.load('sessions', {});
  sessions.clear();
  Object.entries(posees || {}).forEach(([jeton, s]) => sessions.set(jeton, s));
  return sessions.size;
}

// Remplacement de la table entière : c'est elle qui fait foi, et un seul
// processus l'écrit (le verrou d'ADR-001 l'impose). `modifier` n'aurait rien à
// réconcilier — la version en base n'est qu'une copie de celle-ci.
function persistSessions() {
  return magasin.save('sessions', Object.fromEntries(sessions));
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

// Les règles non tenues sortent en codes, non en phrases : le serveur ne sait
// pas dans quelle langue l'écran les affichera. `n` porte la longueur attendue.
function passwordPolicyErrors(password, cfg) {
  const sec = cfg.security;
  const errors = [];
  if (password.length < sec.passwordMinLength) errors.push({ regle: 'longueur', n: sec.passwordMinLength });
  if (sec.passwordRequireUpper && !/[A-Z]/.test(password)) errors.push({ regle: 'majuscule' });
  if (sec.passwordRequireLower && !/[a-z]/.test(password)) errors.push({ regle: 'minuscule' });
  if (sec.passwordRequireDigit && !/[0-9]/.test(password)) errors.push({ regle: 'chiffre' });
  if (sec.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push({ regle: 'special' });
  return errors;
}

// ── Lire l'annuaire : synchrone, et pourquoi (ADR-002, étape B) ──
//
// `users` vit en base, mais `getUsers()` et `findUser()` restent synchrones :
// ils lisent l'instantané que `src/annuaire.js` tient en mémoire et que
// `requireAuth` rafraîchit une fois par requête. Les rendre asynchrones aurait
// atteint 101 prédicats de rôle et 545 chaînes de tableau dans les modules —
// l'en-tête d'`annuaire.js` dit pourquoi ce n'était pas la bonne voie.
function getUsers() {
  return annuaire.comptes();
}

// Remplace l'annuaire entier. **Réservé à l'amorçage** : partout ailleurs,
// `modifierUsers` est le geste juste. Remplacer une liste entière efface ce
// qu'une écriture concurrente y a mis entre la lecture et l'écriture.
async function saveUsers(users) {
  await annuaire.remplacer(users);
}

// Lire-modifier-réécrire atomique. `transformer(comptes)` reçoit l'annuaire que
// la base vient de rendre — non l'instantané — et rend celui à écrire. Il peut
// être rejoué : il ne doit donc que calculer.
const modifierUsers = (transformer) => annuaire.modifier(transformer);

// Un seul compte, modifié en place sur la version que la base vient de rendre.
// `transformer` reçoit une **copie** de l'enregistrement frais et rend celui à
// écrire ; il peut donc garder la forme d'une mutation, qui est celle qu'avaient
// tous les appelants, et il peut être rejoué sans risque.
//
// C'est le geste courant : douze écritures sur treize ne touchent qu'un compte.
const modifierUn = (username, transformer) => annuaire.modifier(
  (comptes) => comptes.map((u) => (u.username === username ? transformer({ ...u }) : u)),
);

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
async function seedUsers(cfg) {
  // L'annuaire n'a pas encore été lu au démarrage : on le lit ici.
  if ((await annuaire.rafraichir()).length) return;
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
  await saveUsers(
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
  await audit.log('système', 'INIT', { message: 'Comptes initiaux créés (superadmin, admin.aac, inspecteur1)' });

  // Les identifiants ne sont montrés qu'ici, au premier démarrage : ils ne
  // sont écrits ni dans le code, ni dans un fichier, ni dans le journal.
  if (secrets.some((x) => x.genere)) {
    // Volontairement hors des traces structurées : un mot de passe qui part
    // vers un collecteur de journaux y reste. Ce bandeau s'adresse à la
    // personne devant le terminal, une fois, et à personne d'autre.
    trace.brut('');
    trace.brut('  ┌─ OASIS — comptes créés au premier démarrage ─────────────────────┐');
    secrets.forEach(({ email, password }) => {
      trace.brut(`  │  ${email.padEnd(24)} ${password}`);
    });
    trace.brut('  │  Mot de passe à changer à la première connexion.');
    trace.brut('  └──────────────────────────────────────────────────────────────────┘');
    trace.brut('');
  }
}

// ── Sessions ──
async function createSession(username, cfg) {
  if (cfg.security.singleSession) {
    for (const [token, s] of sessions) if (s.username === username) sessions.delete(token);
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, lastActivity: Date.now() });
  await persistSessions();
  return token;
}

// Synchrone, et c'est voulu : la table fait foi. L'expiration constatée écrit,
// mais son écriture n'a pas besoin d'être attendue pour que la session soit
// refusée — elle l'est déjà, en mémoire. Un échec de persistance part donc aux
// traces : la session restera refusée ici, et sera refusée de nouveau au
// prochain démarrage puisque son horodatage n'aura pas bougé.
function getSession(token, cfg) {
  if (!token || !sessions.has(token)) return null;
  const s = sessions.get(token);
  const timeoutMs = cfg.security.sessionTimeoutMinutes * 60 * 1000;
  if (Date.now() - s.lastActivity > timeoutMs) {
    sessions.delete(token);
    persistSessions().catch((e) => trace.erreur('session expirée non retirée du magasin',
      { detail: e.message }));
    return null;
  }
  s.lastActivity = Date.now();
  return s;
}

async function destroySession(token) {
  sessions.delete(token);
  await persistSessions();
}

// ── Login ──
async function login(username, password, cfg, opts) {
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user || !user.active) {
    await audit.log(username, 'LOGIN_ECHEC', { motif: 'compte inconnu ou inactif' });
    return { ok: false, error: 'invalid' };
  }
  if (user.locked) {
    await audit.log(username, 'LOGIN_ECHEC', { motif: 'compte bloqué' });
    return { ok: false, error: 'locked' };
  }
  // Mot de passe temporaire expiré (48h) et non encore utilisé
  if (user.mustChange && user.tempExpiresAt && Date.now() > new Date(user.tempExpiresAt).getTime()) {
    await audit.log(username, 'LOGIN_ECHEC', { motif: 'mot de passe temporaire expiré' });
    return { ok: false, error: 'temp_expired' };
  }
  if (!checkPassword(user, password)) {
    // Le décompte est arrêté **dans** la transformation, sur l'annuaire que la
    // base vient de rendre. Lu au-dehors, dix mots de passe faux envoyés
    // ensemble liraient tous le même compteur et n'en écriraient qu'un : le
    // blocage après N tentatives ne se déclencherait jamais, et une force brute
    // passerait. Même raison que le compteur du second facteur.
    let tentatives = 0;
    let bloque = false;
    await modifierUsers((comptes) => comptes.map((u) => {
      if (u.username !== username) return u;
      tentatives = (u.failedAttempts || 0) + 1;
      bloque = tentatives >= cfg.security.maxFailedAttempts;
      return { ...u, failedAttempts: tentatives, ...(bloque ? { locked: true } : {}) };
    }));
    if (bloque) {
      await audit.log(username, 'COMPTE_BLOQUE', { tentatives });
      await notify(`Compte « ${username} » bloqué après ${tentatives} tentatives infructueuses.`, 'warning');
    } else {
      await audit.log(username, 'LOGIN_ECHEC', { tentative: tentatives });
    }
    return { ok: false, error: bloque ? 'locked' : 'invalid' };
  }
  await modifierUsers((comptes) => comptes.map(
    (u) => (u.username === username ? { ...u, failedAttempts: 0 } : u),
  ));
  // MFA : le mot de passe est validé mais la session n'est ouverte qu'après le code
  if (opts && opts.noSession) return { ok: true, pending: true, account: user };
  const token = await createSession(user.username, cfg);
  await audit.log(username, 'LOGIN', { role: user.role });
  return { ok: true, token, user: publicUser(user) };
}

async function changePassword(username, oldPassword, newPassword, cfg) {
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
  await modifierUsers((comptes) => comptes.map((u) => (u.username !== username ? u : {
    ...u,
    salt,
    hash,
    mustChange: false,
    tempExpiresAt: null,
    passwordChangedAt: new Date().toISOString(),
    passwordHistory: [...(u.passwordHistory || []), newHash]
      .slice(-cfg.security.passwordHistoryCount),
  })));
  await audit.log(username, 'MOT_DE_PASSE_CHANGE', {});
  return { ok: true };
}

// ── Notifications globales (socle) ──
// `modifier`, et non `load` puis `save` : l'identifiant dérive de la longueur de
// la liste. Deux avis simultanés porteraient le même numéro, et l'un des deux
// disparaîtrait.
async function notify(message, type) {
  await magasin.modifier('notifications', [], (liste) => [...liste, {
    id: liste.length + 1, ts: new Date().toISOString(), message, type: type || 'info',
  }].slice(-100));
}

module.exports = {
  ROLES,
  sessions,
  hashPassword,
  checkPasswordPublic,
  generatePassword,
  getUsers,
  saveUsers,
  modifierUsers,
  modifierUn,
  champsChanges: annuaire.champsChanges,
  findUser,
  publicUser,
  seedUsers,
  getSession,
  createSession,
  destroySession,
  chargerSessions,
  // L'instantané de l'annuaire : rafraîchi une fois par requête par `requireAuth`,
  // et au démarrage. Voir `src/annuaire.js`.
  rafraichirAnnuaire: annuaire.rafraichir,
  annuairePrisLe: annuaire.pris,
  login,
  changePassword,
  notify
};
