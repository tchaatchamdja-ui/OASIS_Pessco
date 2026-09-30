// OASIS — Authentification multifacteur (MFA).
// Après vérification du mot de passe, un code à usage unique est envoyé sur le
// canal choisi (email ou téléphone du profil). La session n'est créée qu'après
// validation du code.
// Le code n'est jamais stocké en clair : seule son empreinte SHA-256 salée l'est.
// ── Le compteur de tentatives est le geste sensible (ADR-002, étape B) ──
//
// Les défis vivent en base. `verifyChallenge` lit le défi, incrémente son
// compteur d'essais, réécrit : un lire-modifier-réécrire. Rendu asynchrone sans
// précaution, **dix codes faux envoyés ensemble liraient tous `attempts: 0` et
// n'en écriraient qu'un** — le plafond de cinq essais tomberait, et une force
// brute passerait sans que rien ne le dise.
//
// Tout ce qui touche à un défi passe donc par `magasin.modifier`, qui rend le
// geste atomique : file d'attente sur fichiers, `rev` comparé à l'écriture en
// base.
const crypto = require('crypto');
const magasin = require('./magasin');
const trace = require('./trace');
const audit = require('./audit');
const email = require('./email');

const CODE_LENGTH = 6;
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

// Lire-modifier-réécrire atomique sur la table des défis. `transformer` reçoit
// les défis purgés de ceux qui ont expiré, et rend ceux à écrire ; il peut être
// rejoué, et ne doit donc que calculer.
const modifierDefis = (transformer) => magasin.modifier('mfa_challenges', {},
  (d) => transformer(purge({ ...d })));

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
async function createChallenge(user, channelId) {
  const channels = channelsFor(user);
  const channel = channels.find((c) => c.id === channelId) || channels[0];
  if (!channel) return { ok: false, error: 'no_mfa_channel' };

  const code = String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  const id = crypto.randomBytes(24).toString('hex');
  await modifierDefis((d) => ({
    ...d,
    [id]: {
      username: user.username,
      channel: channel.id,
      target: channel.target,
      salt,
      hash: digest(code, salt),
      attempts: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60000).toISOString(),
    },
  }));

  // Le canal SMS n'a pas encore de passerelle : le message est journalisé dans
  // le registre des envois comme les autres (visible en local via Mailpit).
  //
  // L'envoi n'est pas attendu : le défi est posé, et la réponse peut partir sans
  // que le courriel soit remis. Mais un échec doit se lire — sans quoi un agent
  // attendrait un code qui n'est jamais parti, et rien ne le dirait.
  email.mfaCode({
    to: channel.target,
    name: user.fullName || user.username,
    code,
    minutes: TTL_MINUTES,
    channel: channel.id,
  }).catch((e) => trace.erreur('code à usage unique non envoyé', {
    utilisateur: user.username, canal: channel.id, detail: e.message,
  }));

  await audit.log(user.username, 'MFA_CODE_ENVOYE', { canal: channel.id, cible: channel.masked });
  return { ok: true, challengeId: id, channel: channel.id, masked: channel.masked, expiresIn: TTL_MINUTES * 60, channels };
}

// Vérifie un code. Consomme le défi en cas de succès.
// Le verdict est **arrêté dans la transformation**, sur le défi que la base
// vient de rendre : lire le compteur au-dehors puis l'incrémenter laisserait dix
// essais parallèles n'en compter qu'un. Ce qui suit l'écriture — le journal — se
// fait après, sur ce que la transformation a décidé.
async function verifyChallenge(challengeId, code) {
  const given = String(code || '').trim();
  let verdict = { ok: false, error: 'mfa_expired' };
  let journal = null;

  await modifierDefis((d) => {
    const c = d[challengeId];
    if (!c) { verdict = { ok: false, error: 'mfa_expired' }; return d; }

    if (c.attempts >= MAX_ATTEMPTS) {
      verdict = { ok: false, error: 'mfa_too_many_attempts' };
      journal = [c.username, 'MFA_ECHEC', { motif: 'trop de tentatives' }];
      const reste = { ...d }; delete reste[challengeId];
      return reste;
    }

    if (digest(given, c.salt) !== c.hash) {
      const tentative = c.attempts + 1;
      verdict = { ok: false, error: 'mfa_invalid_code', remaining: MAX_ATTEMPTS - tentative };
      journal = [c.username, 'MFA_ECHEC', { tentative }];
      return { ...d, [challengeId]: { ...c, attempts: tentative } };
    }

    verdict = { ok: true, username: c.username };
    journal = [c.username, 'MFA_VALIDE', { canal: c.channel }];
    const reste = { ...d }; delete reste[challengeId];
    return reste;
  });

  if (journal) await audit.log(...journal);
  return verdict;
}

async function resend(challengeId, user, channelId) {
  let existait = false;
  await modifierDefis((d) => {
    existait = !!d[challengeId];
    if (!existait) return d;
    const reste = { ...d }; delete reste[challengeId];
    return reste;
  });
  if (!existait) return { ok: false, error: 'mfa_expired' };
  return createChallenge(user, channelId);
}

module.exports = { createChallenge, verifyChallenge, resend };
