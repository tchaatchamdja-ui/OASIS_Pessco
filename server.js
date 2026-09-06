// OASIS — Outils d'Administration et de Supervision Intégrée de la Sécurité (UEMOA/URSAC)
// Socle technique transverse (Phase 1) : authentification, utilisateurs, audit,
// configuration, notifications, registre des modules à intégrer.
const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('./src/store');
const audit = require('./src/audit');
const { valider } = require('./src/valider');
const auth = require('./src/auth');
const email = require('./src/email');
const referentiels = require('./src/referentiels');
const instances = require('./src/instances');
const moduleAudit = require('./src/module_audit');
const moduleLoader = require('./src/module_loader');
const services = require('./src/services');
const mfa = require('./src/mfa');
const XLSX = require('xlsx');
// Taille maximale d'un classeur importé : au-delà, la lecture est refusée
// avant d'être engagée (SEC-07).
const TAILLE_CLASSEUR_MAX = 8 * 1024 * 1024;

// Colonnes importables/exportables par référentiel (Excel)
const IMPORT_COLS = {
  domaines: ['code', 'nom', 'description', 'statut'],
  secteurs: ['code', 'nom', 'domaine_id', 'csn', 'statut'],
  sous_activites: ['code', 'nom', 'secteur_id'],
  themes_supervision: ['code', 'libelle', 'domaine_id', 'secteur_id', 'sous_activite_id', 'description', 'statut'],
  exigences: ['reglement', 'date_adoption', 'reference', 'libelle', 'statut'],
  prestataires: ['nom', 'trigramme', 'dirigeant', 'point_focal', 'email_prestataire', 'ref_agrement', 'statut'],
  inspecteurs: ['ref_personnel', 'nom', 'prenom', 'email', 'numero_inspecteur', 'specialite', 'niveau_qualification', 'statut'],
};

const TEMP_PWD_TTL_MS = 48 * 60 * 60 * 1000; // 48h

// Répertoire de configuration : surchargeable (tests de fumée, instances multiples).
const CONFIG_DIR = process.env.OASIS_CONFIG_DIR || path.join(__dirname, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'oasis.config.json');
const MODULES_PATH = path.join(CONFIG_DIR, 'modules.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}
// Feuille de route métier (10 modules du TDR) ; l'état réellement installé
// provient des manifestes découverts dans src/modules/.
const MODULES = JSON.parse(fs.readFileSync(MODULES_PATH, 'utf-8'));
// Modules montés : renseigné au démarrage par le loader.
let MODULES_MONTES = [];

// Répertoire de données : le point de santé y vérifie l'écriture.
const DATA_DIR_SONDE = process.env.OASIS_DATA_DIR || path.join(__dirname, 'data');

const app = express();
app.use(express.json({ limit: '5mb' }));

// Derrière un proxy inverse, req.ip doit être l'adresse réelle du client :
// sans quoi la limitation de débit compterait tout le trafic sur une seule IP.
if (process.env.OASIS_TRUST_PROXY) app.set('trust proxy', 1);
const EN_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Compression des réponses (PERF-01) ──
// Sans dépendance : gzip est dans la bibliothèque standard. La compression ne
// s'applique qu'aux réponses textuelles d'une taille qui la justifie, et
// seulement si le client l'accepte. Derrière un proxy qui compresse déjà,
// poser OASIS_COMPRESSION=0.
const zlib = require('zlib');
const COMPRESSIBLE = /^(application\/(json|javascript)|text\/)/i;
const SEUIL_COMPRESSION = 1024;

if (process.env.OASIS_COMPRESSION !== '0') {
  app.use((req, res, next) => {
    if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();
    const envoyer = res.send.bind(res);
    res.send = function envoiCompresse(corps) {
      const type = res.getHeader('Content-Type') || '';
      const texte = typeof corps === 'string' || Buffer.isBuffer(corps);
      if (!texte || res.getHeader('Content-Encoding') || !COMPRESSIBLE.test(String(type))) {
        return envoyer(corps);
      }
      const brut = Buffer.isBuffer(corps) ? corps : Buffer.from(corps, 'utf-8');
      if (brut.length < SEUIL_COMPRESSION) return envoyer(corps);
      const compresse = zlib.gzipSync(brut);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.removeHeader('Content-Length');
      return envoyer(compresse);
    };
    return next();
  });
}

// ── En-têtes de sécurité (SEC-04) ──
// Le front ne charge ni script ni feuille de style externes : la politique de
// contenu peut être stricte. Elle admet 'unsafe-inline' pour les styles et les
// gestionnaires d'évènements hérités du portage PESSCO ; à resserrer quand
// ceux-ci auront été externalisés.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', CSP);
  if (EN_PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ── Limitation de débit sur l'authentification (SEC-03) ──
// Le verrouillage de compte protège un compte ; ceci protège l'application du
// balayage : énumération d'identifiants et essais répartis sur plusieurs
// comptes depuis une même origine.
const FENETRE_AUTH_MS = 15 * 60 * 1000;
const MAX_TENTATIVES_AUTH = 20;
const tentativesAuth = new Map();

function limiterAuth(req, res, next) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'inconnu';
  const maintenant = Date.now();
  const t = tentativesAuth.get(ip);
  if (!t || maintenant - t.debut > FENETRE_AUTH_MS) {
    tentativesAuth.set(ip, { compte: 1, debut: maintenant });
    return next();
  }
  t.compte += 1;
  if (t.compte > MAX_TENTATIVES_AUTH) {
    const reste = Math.ceil((FENETRE_AUTH_MS - (maintenant - t.debut)) / 1000);
    res.setHeader('Retry-After', String(reste));
    audit.log(String((req.body || {}).username || 'inconnu'), 'AUTH_DEBIT_DEPASSE', { ip });
    return res.status(429).json({ error: 'too_many_attempts', retry_after: reste });
  }
  return next();
}

// Purge des compteurs échus, pour que la table ne croisse pas indéfiniment.
setInterval(() => {
  const seuil = Date.now() - FENETRE_AUTH_MS;
  for (const [ip, t] of tentativesAuth) if (t.debut < seuil) tentativesAuth.delete(ip);
}, FENETRE_AUTH_MS).unref();

// ── Origine applicative des écritures (SEC-06) ──
// SameSite=Lax écarte déjà l'essentiel des requêtes forgées ; cet en-tête
// ferme les cas restants. Un formulaire d'un autre site ne peut pas l'ajouter,
// seul un appel émis par nos pages le porte (voir public/shared/js/oasis-requete.js).
const METHODES_MUTATIVES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ROUTES_SANS_ENTETE = ['/api/login'];   // et ses sous-routes MFA

app.use((req, res, next) => {
  if (!METHODES_MUTATIVES.has(req.method) || !req.path.startsWith('/api/')) return next();
  if (ROUTES_SANS_ENTETE.some((r) => req.path === r || req.path.startsWith(`${r}/`))) return next();
  if (req.get('X-OASIS-Request') !== '1') {
    return res.status(403).json({ error: 'origine_non_reconnue' });
  }
  return next();
});

// ── Middleware session ──
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function requireAuth(req, res, next) {
  const cfg = loadConfig();
  const token = parseCookies(req).oasis_session;
  const session = auth.getSession(token, cfg);
  if (!session) return res.status(401).json({ error: 'unauthenticated' });
  const user = auth.findUser(session.username);
  if (!user || !user.active) return res.status(401).json({ error: 'unauthenticated' });
  req.user = user;
  req.cfg = cfg;
  req.token = token;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

// ── Point de santé (DEP-02) ──
// Sonde de supervision : ni session, ni donnée sensible. Elle dit si le
// processus répond et si le répertoire de données est accessible en écriture.
app.get('/api/health', (req, res) => {
  const cfg = loadConfig();
  let stockage = 'ok';
  try {
    const sonde = path.join(DATA_DIR_SONDE, '.sonde');
    fs.writeFileSync(sonde, String(Date.now()));
    fs.unlinkSync(sonde);
  } catch { stockage = 'indisponible'; }
  res.json({
    statut: stockage === 'ok' ? 'ok' : 'degrade',
    version: (cfg.platform && cfg.platform.version) || '',
    modules: MODULES_MONTES.map((m) => m.code),
    stockage,
    demarre_depuis_s: Math.round(process.uptime()),
  });
});

// ── Auth ──
// Cookie de session sans Max-Age : la durée de vie est contrôlée côté serveur
// (déconnexion après inactivité, TDR §F.3), pas par une expiration absolue.
function setSessionCookie(res, token) {
  // Secure hors développement : le jeton ne doit pas circuler en clair.
  const secure = EN_PRODUCTION ? '; Secure' : '';
  res.setHeader('Set-Cookie', `oasis_session=${token}; HttpOnly; SameSite=Lax; Path=/${secure}`);
}

app.post('/api/login', limiterAuth, (req, res) => {
  const cfg = loadConfig();
  const { username, password, channel } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'invalid' });
  const mfaOn = !!(cfg.security && cfg.security.mfaEnabled);
  // Une instance désactivée ne laisse plus entrer les siens. Le contrôle est
  // ici, après l'authentification : refuser avant dirait qui existe.
  const compte = auth.findUser(String(username).trim().toLowerCase());
  const result = auth.login(String(username).trim().toLowerCase(), String(password), cfg, { noSession: mfaOn });
  if (!result.ok) return res.status(401).json({ error: result.error });
  if (compte && !instances.estActive(instances.courante(compte, loadConfig))) {
    return res.status(403).json({ error: 'instance_desactivee' });
  }

  if (result.pending) {
    const ch = mfa.createChallenge(result.account, channel);
    if (!ch.ok) return res.status(500).json({ error: ch.error });
    return res.json({
      ok: true, mfaRequired: true, challengeId: ch.challengeId,
      channel: ch.channel, masked: ch.masked, expiresIn: ch.expiresIn,
      channels: ch.channels.map((c) => ({ id: c.id, label: c.label, masked: c.masked })),
    });
  }
  setSessionCookie(res, result.token);
  res.json({ ok: true, user: result.user });
});

// Vérification du code MFA : ouvre la session
app.post('/api/login/mfa', limiterAuth, (req, res) => {
  const cfg = loadConfig();
  const { challengeId, code } = req.body || {};
  const v = mfa.verifyChallenge(challengeId, code);
  if (!v.ok) return res.status(401).json({ error: v.error, remaining: v.remaining });
  const user = auth.findUser(v.username);
  if (!user || !user.active) return res.status(401).json({ error: 'invalid' });
  const token = auth.createSession(user.username, cfg);
  audit.log(user.username, 'LOGIN', { role: user.role, mfa: true });
  setSessionCookie(res, token);
  res.json({ ok: true, user: auth.publicUser(user) });
});

// Renvoi d'un nouveau code (éventuellement sur un autre canal)
app.post('/api/login/mfa/resend', limiterAuth, (req, res) => {
  const { challengeId, username, channel } = req.body || {};
  const user = auth.findUser(String(username || '').trim().toLowerCase());
  if (!user || !user.active) return res.status(401).json({ error: 'invalid' });
  const ch = mfa.resend(challengeId, user, channel);
  if (!ch.ok) return res.status(400).json({ error: ch.error });
  res.json({
    ok: true, challengeId: ch.challengeId, channel: ch.channel,
    masked: ch.masked, expiresIn: ch.expiresIn,
    channels: ch.channels.map((c) => ({ id: c.id, label: c.label, masked: c.masked })),
  });
});

app.post('/api/logout', requireAuth, (req, res) => {
  audit.log(req.user.username, 'LOGOUT', {});
  auth.destroySession(req.token);
  res.setHeader('Set-Cookie', 'oasis_session=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const aac = instances.aac(req.user, loadConfig);
  res.json({
    user: auth.publicUser(req.user),
    instance: req.cfg.instance,
    // Instance regardée : le bandeau du portail en fait une liste déroulante.
    instance_vue: instances.etat(req.user, loadConfig),
    platform: req.cfg.platform,
    // Le bigramme sert au bandeau, qui nomme l'instance du compte.
    aac: { sigle: aac.sigle || '', nom: aac.nom || '', bigramme: aac.bigramme || '', logo: aac.logo || '' },
  });
});

// ── Instance regardée ──
// OASIS s'installe une fois par État. Le super-administrateur de l'Union prend
// ici le poste de l'une d'elles, ou les regarde toutes — la vue régionale. Le
// choix vaut pour le portail et pour les six modules à la fois : il est rangé
// dans le socle, non dans le magasin de l'un d'eux.
app.get('/api/instance', requireAuth, (req, res) => res.json(instances.etat(req.user, loadConfig)));

// Ce que chaque instance porte, et son état. Le comptage passe par le bus :
// les modules disent eux-mêmes ce qu'ils tiennent.
const depsInstances = () => ({ services, utilisateurs: auth.getUsers() });

app.get('/api/instances', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  if (!instances.estRegional(req.user)) return res.status(403).json({ error: 'portee_nationale' });
  const ici = instances.locale(loadConfig);
  const d = depsInstances();
  res.json(instances.liste(loadConfig).map((nom) => ({
    nom,
    locale: nom === ici,
    active: instances.estActive(nom),
    donnees: instances.volume(nom, d, loadConfig),
    aac: instances.aacDe(nom, loadConfig).sigle || '',
  })));
});

app.put('/api/instances/:nom/activite', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  if (!instances.estRegional(req.user)) return res.status(403).json({ error: 'portee_nationale' });
  const r = instances.basculerActivite(req.params.nom, loadConfig);
  if (r.error) return res.status(400).json(r);
  audit.log(req.user.username, r.active ? 'INSTANCE_ACTIVEE' : 'INSTANCE_DESACTIVEE', { instance: r.instance });
  return res.json({ ok: true, ...r });
});

app.delete('/api/instances/:nom', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  if (!instances.estRegional(req.user)) return res.status(403).json({ error: 'portee_nationale' });
  const r = instances.supprimer(req.params.nom, loadConfig, depsInstances());
  if (r.error) return res.status(400).json(r);
  audit.log(req.user.username, 'INSTANCE_SUPPRIMEE', { instance: r.instance });
  return res.json({ ok: true, ...r });
});

// Ouvrir une instance : le dispositif s'étend sans toucher au fichier de
// configuration. Réservé au régional, seul à voir au-delà de la sienne.
app.post('/api/instances', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  if (!instances.estRegional(req.user)) return res.status(403).json({ error: 'portee_nationale' });
  const r = instances.ouvrir((req.body || {}).nom, loadConfig);
  if (r.error) return res.status(400).json(r);
  audit.log(req.user.username, 'INSTANCE_OUVERTE', { instance: r.instance });
  return res.json({ ok: true, instance: r.instance, instances: instances.liste(loadConfig) });
});

app.put('/api/instance', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  // Seul le super-administrateur régional change d'instance : le national
  // n'administre que la sienne.
  if (!instances.estRegional(req.user)) return res.status(403).json({ error: 'portee_nationale' });
  // Vide : la vue régionale. Sinon, une instance déclarée — le nom borne ce que
  // les écrans serviront, il ne s'invente pas.
  const demandee = String((req.body || {}).instance || '').trim();
  if (demandee && !instances.liste(loadConfig).includes(demandee)) {
    return res.status(400).json({ error: 'instance_inconnue' });
  }
  if (demandee && !instances.estActive(demandee)) {
    return res.status(400).json({ error: 'instance_desactivee' });
  }
  instances.definir(req.user.username, demandee);
  audit.log(req.user.username, 'INSTANCE_CHANGEE', { instance: demandee || '(régionale)' });
  return res.json({ ok: true, instance: demandee });
});

// ── Profil personnel ──
app.put('/api/me/profile', requireAuth, (req, res) => {
  const users = auth.getUsers();
  const user = users.find((u) => u.username === req.user.username);
  if (!user) return res.status(404).json({ error: 'not_found' });
  const { photo, nom, prenom, telephone, fonction, extra } = req.body || {};
  // L'email est l'identifiant de connexion : non modifiable depuis le profil
  if (typeof photo === 'string') {
    if (photo.length > 3_000_000) return res.status(400).json({ error: 'too_large' });
    user.photo = photo;
  }
  if (extra && typeof extra === 'object') user.extra = { ...(user.extra || {}), ...extra };
  for (const [k, v] of Object.entries({ nom, prenom, telephone, fonction })) {
    if (typeof v === 'string') user[k] = v;
  }
  if (typeof nom === 'string' || typeof prenom === 'string') {
    user.fullName = `${user.nom || ''} ${user.prenom || ''}`.trim() || user.fullName;
  }
  auth.saveUsers(users);
  audit.log(req.user.username, 'PROFIL_MODIFIE', {});
  res.json({ ok: true, user: auth.publicUser(user) });
});

app.post('/api/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const result = auth.changePassword(req.user.username, String(oldPassword || ''), String(newPassword || ''), req.cfg);
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true });
});

// ── Modules (cartes du portail) ──
app.get('/api/modules', requireAuth, (req, res) => {
  res.json(moduleLoader.catalogue(MODULES, MODULES_MONTES, req.cfg.modules || {}));
});

// Super-menus déclarés par les modules installés : le front construit sa
// barre supérieure à partir de cette liste (aucun module codé en dur).
// Le paramètre `module` restreint la liste à la carte du portail dont ce
// module fait partie : la barre supérieure d'un module ne propose que ses
// voisins de carte, jamais les modules ouverts depuis une autre carte.
app.get('/api/modules/super-menus', requireAuth, (req, res) => {
  const role = req.user.role;
  let liste = moduleLoader.superMenus(MODULES_MONTES)
    .filter((m) => !m.roles || m.roles.includes(role));
  const cle = req.query.module;
  if (cle) {
    const courant = liste.find((m) => m.key === cle || m.code === cle);
    liste = courant ? liste.filter((m) => m.portal === courant.portal) : [];
  }
  res.json(liste);
});

// Carte du portail → module ouvert au clic (plusieurs modules peuvent
// partager une carte : ils y sont alors présentés en super-menus).
app.get('/api/modules/cartes', requireAuth, (req, res) => res.json(moduleLoader.cartesPortail(MODULES_MONTES)));

// Inventaire des services inter-modules (diagnostic).
app.get('/api/services', requireAuth, requireRole('SUPERADMIN'), (req, res) => res.json(services.list()));

app.put('/api/modules/:code', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  const cfg = loadConfig();
  const code = req.params.code;
  if (!(code in cfg.modules)) return res.status(404).json({ error: 'unknown_module' });
  cfg.modules[code] = !!req.body.enabled;
  saveConfig(cfg);
  audit.log(req.user.username, cfg.modules[code] ? 'MODULE_ACTIVE' : 'MODULE_DESACTIVE', { module: code });
  auth.notify(`Module ${code} ${cfg.modules[code] ? 'activé' : 'désactivé'} par ${req.user.username}.`, 'info');
  res.json({ ok: true, code, enabled: cfg.modules[code] });
});

// ── Utilisateurs (ADMIN et SUPERADMIN) ──
// Un compte appartient à l'AAC qui l'a ouvert : la liste ne montre que ceux de
// l'instance regardée. La connexion, elle, n'est jamais bornée — un agent
// togolais s'authentifie quel que soit le poste tenu ici.
app.get('/api/users', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const retenue = instances.courante(req.user, loadConfig);
  res.json(instances.filtrer(auth.getUsers(), retenue, loadConfig).map(auth.publicUser));
});

// Un compte ne s'administre que depuis son instance. Le super-administrateur
// régional passe partout — c'est sa fonction ; les autres, y compris le
// national et l'administrateur AAC, ne touchent qu'aux comptes de la leur. La
// liste était déjà cloisonnée ; sans cette garde, un identifiant connu suffisait
// à contourner le cloisonnement.
function memeInstance(req, cible) {
  if (instances.estRegional(req.user)) return true;
  return instances.de(cible, loadConfig) === instances.courante(req.user, loadConfig);
}

// Instance à laquelle rattacher un compte : celle que le créateur regarde, ou
// celle qu'un super-administrateur régional désigne expressément.
function instanceVoulue(req) {
  const demandee = String((req.body || {}).instance || '').trim();
  if (demandee && instances.estRegional(req.user)
      && instances.liste(loadConfig).includes(demandee)) return demandee;
  return instances.courante(req.user, loadConfig);
}

// Portée d'un super-administrateur. Seul un régional en désigne un autre :
// sans cette garde, un national se donnerait le dispositif entier.
function porteeVoulue(req) {
  const demandee = String((req.body || {}).portee || '').trim();
  if (!instances.estRegional(req.user)) return 'nationale';
  return instances.PORTEES.includes(demandee) ? demandee : 'nationale';
}

app.post('/api/users', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), valider({
  email: { type: 'texte', requis: true, max: 160 },
  nom: { type: 'texte', requis: true, max: 80 },
  prenom: { type: 'texte', max: 80 },
  role: { type: 'texte', requis: true, max: 24 },
  modules: { type: 'liste', max: 20 },
  prestataire_id: { type: 'texte', max: 40 },
  // Portée d'un super-administrateur, et instance qu'il administre. Le second
  // n'est accepté que d'un régional : lui seul voit au-delà de la sienne.
  portee: { type: 'texte', max: 12 },
  instance: { type: 'texte', max: 60 },
}), (req, res) => {
  const { nom, prenom, role, modules } = req.body || {};
  const username = String(req.body.email || '').trim().toLowerCase();
  if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) return res.status(400).json({ error: 'invalid_email' });
  if (!nom || !auth.ROLES.includes(role)) return res.status(400).json({ error: 'invalid' });
  if (auth.findUser(username)) return res.status(409).json({ error: 'exists' });
  // Mot de passe temporaire généré automatiquement par le système
  const tempPassword = auth.generatePassword(req.cfg);
  const { salt, hash } = auth.hashPassword(tempPassword);
  const users = auth.getUsers();
  users.push({
    username,
    nom: String(nom),
    prenom: String(prenom || ''),
    email: username,
    fullName: `${nom} ${prenom || ''}`.trim(),
    role,
    // L'AAC qui ouvre le compte le tient : c'est dans sa liste qu'il figurera.
    // Un super-administrateur régional peut en désigner une autre — c'est ainsi
    // qu'on nomme le super-administrateur national d'un État.
    instance: instanceVoulue(req),
    // Portée de super-administration ; sans objet pour les autres rôles.
    ...(role === 'SUPERADMIN' ? { portee: porteeVoulue(req) } : {}),
    modules: Array.isArray(modules) ? modules : [],
    prestataire_id: String(req.body.prestataire_id || ''),
    salt,
    hash,
    active: true,
    locked: false,
    failedAttempts: 0,
    mustChange: true,
    tempExpiresAt: new Date(Date.now() + TEMP_PWD_TTL_MS).toISOString(),
    passwordChangedAt: new Date().toISOString(),
    passwordHistory: [hash],
    createdAt: new Date().toISOString(),
    createdBy: req.user.username,
  });
  auth.saveUsers(users);
  email.accountCreated({ to: username, name: `${nom} ${prenom || ''}`.trim(), username, password: tempPassword });
  audit.log(req.user.username, 'UTILISATEUR_CREE', { cible: username, role });
  auth.notify(`Utilisateur « ${username} » créé par ${req.user.username} — email d'identifiants envoyé.`, 'success');
  res.json({ ok: true });
});

app.put('/api/users/:username', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const users = auth.getUsers();
  const user = users.find((u) => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: 'not_found' });
  // Hors de son instance, le compte est aussi introuvable qu'inexistant : le
  // dire autrement révélerait qui existe ailleurs.
  if (!memeInstance(req, user)) return res.status(404).json({ error: 'not_found' });
  const { action } = req.body || {};
  if (action === 'unlock') {
    user.locked = false;
    user.failedAttempts = 0;
    audit.log(req.user.username, 'COMPTE_DEBLOQUE', { cible: user.username });
  } else if (action === 'toggle-active') {
    if (user.username === req.user.username) return res.status(400).json({ error: 'self' });
    // Un Admin AAC ne peut pas désactiver un autre Admin AAC ni un SuperAdmin
    if (req.user.role === 'ADMIN' && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) return res.status(403).json({ error: 'forbidden_target' });
    user.active = !user.active;
    audit.log(req.user.username, user.active ? 'COMPTE_ACTIVE' : 'COMPTE_DESACTIVE', { cible: user.username });
  } else if (action === 'reset-password') {
    // Nouveau mot de passe temporaire généré automatiquement + email
    const tempPassword = auth.generatePassword(req.cfg);
    const { salt, hash } = auth.hashPassword(tempPassword);
    user.salt = salt;
    user.hash = hash;
    user.mustChange = true;
    user.tempExpiresAt = new Date(Date.now() + TEMP_PWD_TTL_MS).toISOString();
    user.passwordChangedAt = new Date().toISOString();
    email.passwordReset({ to: user.email || user.username, name: user.fullName || user.username, username: user.username, password: tempPassword });
    audit.log(req.user.username, 'MOT_DE_PASSE_REINITIALISE', { cible: user.username });
    auth.notify(`Mot de passe réinitialisé pour « ${user.username} » — email envoyé.`, 'info');
  } else if (action === 'set-modules') {
    if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });
    user.modules = Array.isArray(req.body.modules) ? req.body.modules : [];
    audit.log(req.user.username, 'ACCES_MODULES_MODIFIE', { cible: user.username, modules: user.modules });
  } else if (action === 'set-prestataire') {
    if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });
    user.prestataire_id = String(req.body.prestataire_id || '');
    audit.log(req.user.username, 'PRESTATAIRE_MODIFIE', { cible: user.username, prestataire: user.prestataire_id });
  } else if (action === 'edit') {
    if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });
    const b = req.body;
    const newUsername = String(b.email || '').trim().toLowerCase();
    // Tout changement d'identifiant (email) exige la confirmation du mot de passe du SuperAdmin
    if (newUsername && newUsername !== user.username) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUsername)) return res.status(400).json({ error: 'invalid_email' });
      if (auth.findUser(newUsername)) return res.status(409).json({ error: 'exists' });
      const me = auth.findUser(req.user.username);
      if (!b.adminPassword || !auth.checkPasswordPublic(me, String(b.adminPassword))) return res.status(403).json({ error: 'admin_password' });
      const oldU = user.username;
      user.username = newUsername;
      user.email = newUsername;
      audit.log(req.user.username, 'IDENTIFIANT_MODIFIE', { ancien: oldU, nouveau: newUsername });
    }
    for (const k of ['nom', 'prenom', 'telephone', 'fonction']) if (typeof b[k] === 'string') user[k] = b[k];
    if (typeof b.prestataire_id === 'string') user.prestataire_id = b.prestataire_id;
    if (auth.ROLES.includes(b.role)) user.role = b.role;
    // Portée de super-administration et instance rattachée : seul un régional
    // les désigne, et un compte qui n'est plus super-administrateur n'en garde
    // pas la trace.
    if (instances.estRegional(req.user)) {
      if (user.role === 'SUPERADMIN' && instances.PORTEES.includes(String(b.portee || ''))) {
        user.portee = String(b.portee);
      } else if (user.role !== 'SUPERADMIN') {
        delete user.portee;
      }
      const inst = String(b.instance || '').trim();
      if (inst && instances.liste(loadConfig).includes(inst)) user.instance = inst;
    }
    user.fullName = `${user.nom || ''} ${user.prenom || ''}`.trim() || user.fullName;
    audit.log(req.user.username, 'UTILISATEUR_MODIFIE', {
      cible: user.username, portee: user.portee || '', instance: user.instance || '',
    });
  } else {
    return res.status(400).json({ error: 'invalid_action' });
  }
  auth.saveUsers(users);
  res.json({ ok: true, user: auth.publicUser(user) });
});

// Générer un équivalent dans la Liste du personnel de l'Administration (référentiel inspecteurs)
app.post('/api/users/:username/to-personnel', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const user = auth.findUser(req.params.username);
  if (!user || !memeInstance(req, user)) return res.status(404).json({ error: 'not_found' });
  const em = (user.email || user.username).toLowerCase();
  const existing = (referentiels.getAll().inspecteurs || []).find((p) => (p.email || '').toLowerCase() === em);
  if (existing) return res.status(409).json({ error: 'exists' });
  const rec = referentiels.createItem('inspecteurs', {
    ref_personnel: '', nom: user.nom || '', prenom: user.prenom || '', numero_inspecteur: '',
    email: user.email || user.username, telephone: user.telephone || '', specialite: '',
    est_inspecteur: 'non', domaines: [], specialites: [], niveau_qualification: '', statut: 'actif', user_id: user.username,
  }, instances.de(user, loadConfig));
  audit.log(req.user.username, 'PERSONNEL_GENERE', { cible: user.username });
  res.json({ ok: true, record: rec });
});

app.get('/api/emails', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  res.json(email.list().slice(-50).reverse());
});

app.get('/api/emails/verify', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  res.json(await email.verify());
});

// ── Journal d'audit ──
app.get('/api/audit', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  res.json(audit.list().slice(-500).reverse());
});

app.get('/api/audit/verify', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  res.json(audit.verifyChain());
});

// ── Notifications ──
app.get('/api/notifications', requireAuth, (req, res) => {
  res.json(store.load('notifications', []).slice(-30).reverse());
});

app.post('/api/notifications', requireAuth, (req, res) => {
  const message = String((req.body && req.body.message) || '').slice(0, 300);
  if (!message) return res.status(400).json({ error: 'invalid' });
  auth.notify(message, (req.body && req.body.type) || 'info');
  res.json({ ok: true });
});

// ── Configuration (SUPERADMIN) ──
app.get('/api/config', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  const cfg = loadConfig();
  const retenue = instances.courante(req.user, loadConfig);
  // « Détails sur l'Administration » : celle de l'instance regardée, non celle
  // du fichier de configuration — qui n'est que l'identité installée ici.
  res.json({
    ...cfg,
    aac: instances.aac(req.user, loadConfig),
    instance: { ...cfg.instance, etat: retenue || cfg.instance.etat },
    instance_locale: instances.locale(loadConfig),
    instance_vue: instances.etat(req.user, loadConfig),
  });
});

app.put('/api/config', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  const cfg = loadConfig();
  const { instance, security, replication, aac } = req.body || {};
  // « Détails sur l'Administration » : chaque État a la sienne. Celle de
  // l'instance installée ici reste au fichier de configuration, avec le reste
  // de son paramétrage ; celle des autres est tenue dans le magasin du socle.
  const retenue = instances.courante(req.user, loadConfig);
  const ailleurs = !!retenue && retenue !== instances.locale(loadConfig);
  if (aac && ailleurs) {
    instances.definirAac(retenue, aac);
  } else if (aac) {
    cfg.aac = cfg.aac || {};
    for (const key of instances.CHAMPS_AAC) {
      if (typeof aac[key] === 'string') cfg.aac[key] = aac[key];
    }
  }
  // Le bloc « instance » nomme l'État installé ici : au poste d'un autre, on
  // ne le réécrit pas — sinon régler l'identité du Togo déplacerait le
  // déploiement tout entier.
  if (instance && !ailleurs) {
    Object.assign(cfg.instance, {
      etat: instance.etat, codeEtat: instance.codeEtat, defaultLang: instance.defaultLang,
    });
  }
  if (security) {
    for (const key of ['passwordMinLength', 'passwordMaxAgeDays', 'maxFailedAttempts', 'sessionTimeoutMinutes', 'passwordHistoryCount']) {
      const n = parseInt(security[key], 10);
      if (!Number.isNaN(n) && n > 0) cfg.security[key] = n;
    }
    for (const key of ['singleSession', 'forceChangeOnFirstLogin', 'mfaEnabled']) {
      if (typeof security[key] === 'boolean') cfg.security[key] = security[key];
    }
  }
  if (replication) {
    if (typeof replication.enabled === 'boolean') cfg.replication.enabled = replication.enabled;
    if (replication.centralUrl) cfg.replication.centralUrl = String(replication.centralUrl);
  }
  saveConfig(cfg);
  audit.log(req.user.username, 'CONFIGURATION_MODIFIEE', { instance: retenue || '(régionale)' });
  auth.notify(`Configuration modifiée par ${req.user.username}.`, 'info');
  res.json({ ok: true, config: { ...cfg, aac: instances.aac(req.user, loadConfig) } });
});

// ── Référentiels du portail (Configuration PESSCO) ──
// Servis dans la vue de l'instance regardée : ses organismes, ses inspecteurs,
// son organisation et sa réglementation ; la taxinomie et les nomenclatures,
// communes à l'Union, restent entières.
app.get('/api/referentiels', requireAuth, (req, res) => {
  res.json(instances.refs(req.user, loadConfig));
});

app.post('/api/referentiels/:coll', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const record = referentiels.createItem(req.params.coll, req.body || {},
    instances.courante(req.user, loadConfig));
  if (!record) return res.status(404).json({ error: 'unknown_collection' });
  if (record.error) return res.status(409).json({ error: record.error });
  audit.log(req.user.username, 'REFERENTIEL_AJOUT', { collection: req.params.coll, id: record.id });
  res.json({ ok: true, record });
});

app.put('/api/referentiels/:coll/:id', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const record = referentiels.updateItem(req.params.coll, req.params.id, req.body || {});
  if (!record) return res.status(404).json({ error: 'not_found' });
  if (record.error) return res.status(409).json({ error: record.error });
  audit.log(req.user.username, 'REFERENTIEL_MODIFIE', { collection: req.params.coll, id: req.params.id });
  res.json({ ok: true, record });
});

app.delete('/api/referentiels/:coll/:id', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const removed = referentiels.deleteItem(req.params.coll, req.params.id);
  if (!removed) return res.status(404).json({ error: 'not_found' });
  audit.log(req.user.username, 'REFERENTIEL_SUPPRIME', { collection: req.params.coll, id: req.params.id, supprimes: removed });
  res.json({ ok: true, removed });
});

// Contrôle d'intégrité : enregistrements dont le parent a été supprimé
app.get('/api/referentiels/orphans', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  res.json({ orphans: referentiels.orphans(false) });
});
app.post('/api/referentiels/orphans/purge', requireAuth, requireRole('SUPERADMIN'), (req, res) => {
  const removed = referentiels.orphans(true);
  audit.log(req.user.username, 'REFERENTIELS_PURGE_ORPHELINS', removed);
  res.json({ ok: true, removed });
});

// Lecture d'une seule collection : les modules n'ont pas à charger tout le
// référentiel pour un besoin ciblé. Déclarée après /orphans, qui est une
// route fixe et doit rester prioritaire.
app.get('/api/referentiels/:coll', requireAuth, (req, res) => {
  const all = instances.refs(req.user, loadConfig);
  if (!Object.prototype.hasOwnProperty.call(all, req.params.coll)) {
    return res.status(404).json({ error: 'unknown_collection' });
  }
  res.json(all[req.params.coll]);
});

// « activites » = collection virtuelle regroupant Domaines / Secteurs / Sous-activités / Thèmes
const ACT_SHEETS = ['domaines', 'secteurs', 'sous_activites', 'themes_supervision'];
const SHEET_NAME = { domaines: 'Domaines', secteurs: 'Secteurs', sous_activites: 'Sous-activites', themes_supervision: 'Themes' };

// ── Import / Export Excel des référentiels ──
function collsFor(coll) {
  return coll === 'activites' ? ACT_SHEETS : (IMPORT_COLS[coll] ? [coll] : null);
}
// Les fichiers Excel manipulent des CODES, jamais les identifiants techniques :
// la colonne « domaine_id » est exportée/importée sous l'intitulé « domaine »
// et contient le code du domaine. Un export est donc réimportable tel quel.
const FK_TO_COLL = { domaine_id: 'domaines', secteur_id: 'secteurs', sous_activite_id: 'sous_activites' };
const FK_HEADER = { domaine_id: 'domaine', secteur_id: 'secteur', sous_activite_id: 'sous_activite' };
const headerFor = (c) => FK_HEADER[c] || c;

// id → code (pour l'export)
function codeOf(all, coll, id) {
  const r = (all[coll] || []).find((x) => x.id === id);
  return r ? r.code || '' : '';
}
// code → id (pour l'import) ; accepte aussi un identifiant brut par tolérance
function idOfCode(all, coll, value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return '';
  const byCode = (all[coll] || []).find((x) => referentiels.normCode(x.code) === referentiels.normCode(v));
  if (byCode) return byCode.id;
  const byId = (all[coll] || []).find((x) => x.id === v);
  return byId ? byId.id : '';
}

function sheetify(colName, rows, all) {
  const cols = IMPORT_COLS[colName];
  const header = cols.map(headerFor);
  const body = rows.map((r) => cols.map((c) => {
    if (FK_TO_COLL[c]) return codeOf(all, FK_TO_COLL[c], r[c]);
    const v = r[c];
    return v == null ? '' : Array.isArray(v) ? v.join(', ') : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws['!cols'] = header.map((h) => ({ wch: Math.max(14, Math.min(40, h.length + 10)) }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(body.length, 1), c: header.length - 1 } }) };
  return ws;
}
function sendWorkbook(res, coll, withData, filename) {
  const sheets = collsFor(coll);
  const all = referentiels.getAll();
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => XLSX.utils.book_append_sheet(wb, sheetify(s, withData ? (all[s] || []) : [], all), SHEET_NAME[s] || s));
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
}

app.get('/api/referentiels/:coll/export', requireAuth, (req, res) => {
  if (!collsFor(req.params.coll)) return res.status(404).json({ error: 'unknown_collection' });
  sendWorkbook(res, req.params.coll, true, `${req.params.coll}.xlsx`);
});

app.get('/api/referentiels/:coll/template', requireAuth, (req, res) => {
  if (!collsFor(req.params.coll)) return res.status(404).json({ error: 'unknown_collection' });
  sendWorkbook(res, req.params.coll, false, `modele_${req.params.coll}.xlsx`);
});

app.post('/api/referentiels/:coll/import', requireAuth, requireRole('SUPERADMIN', 'ADMIN'), (req, res) => {
  const sheets = collsFor(req.params.coll);
  if (!sheets) return res.status(404).json({ error: 'unknown_collection' });
  const b64 = String((req.body && req.body.fileB64) || '').split(',').pop();
  if (!b64) return res.status(400).json({ error: 'no_file' });
  const contenu = Buffer.from(b64, 'base64');
  if (contenu.length > TAILLE_CLASSEUR_MAX) return res.status(413).json({ error: 'fichier_trop_volumineux' });
  let wb;
  try { wb = XLSX.read(contenu, { type: 'buffer' }); }
  catch (e) { return res.status(400).json({ error: 'parse_error' }); }
  // Le code fait office de clé : une ligne dont le code existe déjà est mise à
  // jour, jamais dupliquée. Les feuilles sont traitées dans l'ordre parent →
  // enfant pour que les codes parents créés soient résolvables.
  const added = {};
  const updated = {};
  const errors = [];
  sheets.forEach((coll, i) => {
    const cols = IMPORT_COLS[coll];
    // feuille par nom, sinon par position
    const wsName = wb.SheetNames.find((n) => n === (SHEET_NAME[coll] || coll)) || wb.SheetNames[sheets.length > 1 ? i : 0];
    const ws = wb.Sheets[wsName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    rows.forEach((raw, n) => {
      const all = referentiels.getAll();
      const item = {};
      let hasData = false;
      let rowError = null;
      for (const c of cols) {
        // accepte l'intitulé « domaine » comme « domaine_id »
        let v = raw[headerFor(c)];
        if (v === undefined) v = raw[c];
        if (v === undefined) v = '';
        if (typeof v === 'string') v = v.trim();
        if (c === 'domaines') {
          v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
        } else if (FK_TO_COLL[c] && v !== '') {
          const resolved = idOfCode(all, FK_TO_COLL[c], v);
          if (!resolved) rowError = `${SHEET_NAME[coll] || coll} ligne ${n + 2} : ${headerFor(c)} « ${v} » introuvable`;
          v = resolved;
        }
        if (v !== '' && !(Array.isArray(v) && !v.length)) hasData = true;
        item[c] = v;
      }
      if (!hasData) return;
      if (rowError) { errors.push(rowError); return; }
      if (cols.includes('statut') && !item.statut) item.statut = 'actif';

      // Upsert sur le code lorsque la collection en possède un
      const existing = referentiels.CODE_KEYED.includes(coll)
        ? referentiels.findByCode(coll, item.code, null, all)
        : null;
      if (existing) {
        const r = referentiels.updateItem(coll, existing.id, item);
        if (r && r.error) errors.push(`${SHEET_NAME[coll] || coll} ligne ${n + 2} : ${r.error}`);
        else updated[coll] = (updated[coll] || 0) + 1;
        return;
      }
      const r = referentiels.createItem(coll, item, instances.courante(req.user, loadConfig));
      if (r && r.error) errors.push(`${SHEET_NAME[coll] || coll} ligne ${n + 2} : ${r.error === 'code_required' ? 'code manquant' : r.error}`);
      else added[coll] = (added[coll] || 0) + 1;
    });
  });
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  audit.log(req.user.username, 'REFERENTIEL_IMPORT', {
    collection: req.params.coll, ajouts: sum(added), maj: sum(updated), erreurs: errors.length,
  });
  res.json({ ok: true, imported: sum(added) + sum(updated), added: sum(added), updated: sum(updated), detail: { added, updated }, errors });
});

// ── Statistiques du portail ──
app.get('/api/stats', requireAuth, (req, res) => {
  const users = auth.getUsers();
  const enabled = Object.values(req.cfg.modules).filter(Boolean).length;
  res.json({
    users: users.filter((u) => u.active).length,
    modulesEnabled: enabled,
    modulesTotal: MODULES.length,
    auditEntries: audit.list().length,
  });
});

// ── Montage des modules ──
// Découverte des manifestes, middleware d'audit par préfixe d'API, puis
// `register`. Le socle ne connaît aucun module en particulier.
MODULES_MONTES = moduleLoader.mount(
  app,
  { requireAuth, requireRole, auth, loadConfig, audit, referentiels, services },
  moduleAudit,
);

// ── Frontend ──
// ── Fichiers statiques compressés (PERF-01) ──
// express.static sert en flux : le middleware de compression, qui enveloppe
// res.send, ne le voit pas. Les fichiers texte sont donc compressés ici, une
// fois, et gardés en mémoire tant que leur date de modification ne change pas.
const RACINE_PUBLIC = path.join(__dirname, 'public');
const TEXTE_STATIQUE = /\.(js|css|html|json|svg|map)$/i;
const cacheGzip = new Map();     // chemin -> { mtimeMs, corps, type }

const TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json; charset=utf-8',
};

if (process.env.OASIS_COMPRESSION !== '0') {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (!TEXTE_STATIQUE.test(req.path) || req.path.includes('..')) return next();
    if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();

    const chemin = path.join(RACINE_PUBLIC, decodeURIComponent(req.path));
    if (!chemin.startsWith(RACINE_PUBLIC)) return next();
    let stat;
    try { stat = fs.statSync(chemin); } catch { return next(); }
    if (!stat.isFile() || stat.size < SEUIL_COMPRESSION) return next();

    let entree = cacheGzip.get(chemin);
    if (!entree || entree.mtimeMs !== stat.mtimeMs) {
      entree = {
        mtimeMs: stat.mtimeMs,
        corps: zlib.gzipSync(fs.readFileSync(chemin)),
        type: TYPES[path.extname(chemin).toLowerCase()] || 'application/octet-stream',
      };
      cacheGzip.set(chemin, entree);
    }
    res.setHeader('Content-Type', entree.type);
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('ETag', `W/"${stat.size}-${Math.round(stat.mtimeMs)}-gz"`);
    // Les pages HTML se revalident toujours : elles listent les scripts du
    // module, et une coquille gardée en cache pendant qu'un script nouveau
    // apparaît donne une page à moitié chargée — un menu présent dont l'écran
    // ne s'ouvre pas.
    const estHtml = path.extname(chemin).toLowerCase() === '.html';
    res.setHeader('Cache-Control', EN_PRODUCTION && !estHtml ? 'public, max-age=3600' : 'no-cache');
    if (req.headers['if-none-match'] === res.getHeader('ETag')) return res.status(304).end();
    return res.end(req.method === 'HEAD' ? undefined : entree.corps);
  });
}

// Fichiers statiques non compressés (images, polices, petits fichiers) :
// cache court en production, revalidation par ETag.
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: EN_PRODUCTION ? '1h' : 0,
  etag: true,
  lastModified: true,
  // Même règle que pour les fichiers compressés : la coquille HTML se
  // revalide, le reste peut dormir en cache.
  setHeaders: (res, chemin) => {
    if (path.extname(chemin).toLowerCase() === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

const PORT = process.env.PORT || 4750;
auth.seedUsers(loadConfig());
referentiels.seedReferentiels();
moduleLoader.seedAll(MODULES_MONTES);
// Écoute sur toutes les interfaces : les plateformes d'hébergement routent le
// trafic vers le conteneur, une écoute sur la seule boucle locale y serait
// injoignable.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`OASIS — socle Phase 1 démarré sur le port ${PORT}`);
  console.log(`Modules montés : ${MODULES_MONTES.map((m) => m.code).join(', ') || 'aucun'}`);
});
