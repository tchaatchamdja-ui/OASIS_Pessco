// OASIS — Authentification multifacteur (MFA).
// Après vérification du mot de passe, un code à usage unique est envoyé sur le
// canal choisi (email ou téléphone du profil). La session n'est créée qu'après
// validation du code.
// Le code n'est jamais stocké en clair : seule son empreinte SHA-256 salée l'est.
const crypto = require('crypto');
const store = require('./store');
const audit = require('./audit');
const email = require('./email');

const CODE_LENGTH = 6;
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const load = () => store.load('mfa_challenges', {});
const save = (d) => store.save('mfa_challenges', d);

const digest = (code, salt) => crypto.createHash('sha256').update(salt + '|' + code).digest('hex');

function purge(d) {
  const now = Date.now();
  for (const [id, c] of Object.entries(d)) {
    if (new Date(c.expiresAt).getTime() < now) delete d[id];
  }
  return d;
}

// Canaux disponibles selon le profil (email toujours, SMS si téléphone renseigné)
function channelsFor(user) {
  const out = [];
  const mail = user.email || user.username;
  if (mail && String(mail).includes('@')) out.push({ id: 'email', label: 'Adresse e-mail', target: mail, masked: maskEmail(mail) });
  if (user.telephone) out.push({ id: 'sms', label: 'Téléphone', target: user.telephone, masked: maskPhone(user.telephone) });
  return out;
}

function maskEmail(v) {
  const [name, domain] = String(v).split('@');
  if (!domain) return v;
  const head = name.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

function maskPhone(v) {
  const s = String(v).replace(/\s+/g, '');
  return s.length <= 4 ? s : `${s.slice(0, Math.min(4, s.length - 2))} •••• ${s.slice(-2)}`;
}

// Crée un défi et envoie le code. Renvoie l'identifiant du défi (pas le code).
function createChallenge(user, channelId) {
  const channels = channelsFor(user);
  const channel = channels.find((c) => c.id === channelId) || channels[0];
  if (!channel) return { ok: false, error: 'no_mfa_channel' };

  const code = String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  const id = crypto.randomBytes(24).toString('hex');
  const d = purge(load());
  d[id] = {
    username: user.username,
    channel: channel.id,
    target: channel.target,
    salt,
    hash: digest(code, salt),
    attempts: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60000).toISOString(),
  };
  save(d);

  // Le canal SMS n'a pas encore de passerelle : le message est journalisé dans
  // data/emails.json comme les autres envois (visible en local via Mailpit).
  email.mfaCode({
    to: channel.target,
    name: user.fullName || user.username,
    code,
    minutes: TTL_MINUTES,
    channel: channel.id,
  });

  audit.log(user.username, 'MFA_CODE_ENVOYE', { canal: channel.id, cible: channel.masked });
  return { ok: true, challengeId: id, channel: channel.id, masked: channel.masked, expiresIn: TTL_MINUTES * 60, channels };
}

// Vérifie un code. Consomme le défi en cas de succès.
function verifyChallenge(challengeId, code) {
  const d = purge(load());
  const c = d[challengeId];
  if (!c) return { ok: false, error: 'mfa_expired' };
  if (c.attempts >= MAX_ATTEMPTS) {
    delete d[challengeId];
    save(d);
    audit.log(c.username, 'MFA_ECHEC', { motif: 'trop de tentatives' });
    return { ok: false, error: 'mfa_too_many_attempts' };
  }
  const given = String(code || '').trim();
  if (digest(given, c.salt) !== c.hash) {
    c.attempts += 1;
    save(d);
    audit.log(c.username, 'MFA_ECHEC', { tentative: c.attempts });
    return { ok: false, error: 'mfa_invalid_code', remaining: MAX_ATTEMPTS - c.attempts };
  }
  const username = c.username;
  delete d[challengeId];
  save(d);
  audit.log(username, 'MFA_VALIDE', { canal: c.channel });
  return { ok: true, username };
}

function resend(challengeId, user, channelId) {
  const d = purge(load());
  if (!d[challengeId]) return { ok: false, error: 'mfa_expired' };
  delete d[challengeId];
  save(d);
  return createChallenge(user, channelId);
}

module.exports = { createChallenge, verifyChallenge, resend, channelsFor, TTL_MINUTES, MAX_ATTEMPTS };
