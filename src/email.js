// File d'attente + envoi d'emails.
// Envoi réel via SMTP (nodemailer) si config.smtp.enabled ; toujours journalisé dans data/emails.json.
// En local : brancher Mailpit (SMTP :1025, UI http://localhost:8025).
const path = require('path');
// Le registre des envois passe par la façade : il est la deuxième collection
// basculée en base (ADR-002, étape B).
const magasin = require('./magasin');

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch { /* fallback fichier seul */ }

const APP = 'OASIS';
// Lien de connexion porté par les courriels. En hébergement, l'adresse
// publique du service fait foi : Render la pose dans RENDER_EXTERNAL_URL, ce
// qui évite d'avoir à la recopier à la main — sans quoi les destinataires
// recevraient un lien vers « localhost ». APP_URL reste prioritaire, pour un
// domaine propre ou un proxy devant le service.
const RACINE_PUBLIQUE = process.env.RENDER_EXTERNAL_URL
  ? `${String(process.env.RENDER_EXTERNAL_URL).replace(/\/+$/, '')}/login.html`
  : 'http://localhost:4750/login.html';
const LOGIN_URL = process.env.APP_URL || RACINE_PUBLIQUE;
const SUPPORT = 'support@anac.bj';

// L'environnement passe devant le paramétrage, comme pour OASIS_MFA. Sans
// cela, la messagerie n'était réglable que dans le dépôt : sur un hébergement,
// le fichier de configuration est cuit dans l'image et le serveur restait
// pointé sur le Mailpit du poste de développement. Le code à usage unique de
// l'authentification multifacteur n'y serait jamais parti.
function surcharge(smtp) {
  const e = process.env;
  const out = { ...smtp };
  if (e.OASIS_SMTP_HOST) out.host = e.OASIS_SMTP_HOST;
  if (e.OASIS_SMTP_PORT) out.port = Number(e.OASIS_SMTP_PORT);
  if (e.OASIS_SMTP_USER) out.user = e.OASIS_SMTP_USER;
  if (e.OASIS_SMTP_PASS) out.pass = e.OASIS_SMTP_PASS;
  if (e.OASIS_SMTP_FROM) out.from = e.OASIS_SMTP_FROM;
  if (e.OASIS_SMTP_SECURE !== undefined) out.secure = /^(1|true)$/i.test(e.OASIS_SMTP_SECURE);
  if (e.OASIS_SMTP_HOST) out.enabled = true;
  return out;
}

function loadSmtp() {
  try {
    // Même répertoire que le serveur, surcharge comprise : sans cela une
    // instance lancée sur une autre configuration (fumée, instance parallèle)
    // lisait tout de même les réglages SMTP du dépôt.
    const dir = process.env.OASIS_CONFIG_DIR || path.join(__dirname, '..', 'config');
    const cfg = JSON.parse(require('fs').readFileSync(path.join(dir, 'oasis.config.json'), 'utf-8'));
    return surcharge(cfg.smtp || {});
  } catch { return surcharge({}); }
}

// Une messagerie joignable ? Le port 1025 sur la boucle locale, c'est le
// Mailpit d'un poste de développement : en production, c'est un envoi qui
// n'arrivera nulle part.
function messagerieCredible() {
  const s = loadSmtp();
  if (!s.enabled || !s.host) return { ok: false, motif: 'messagerie désactivée ou sans hôte' };
  if (/^(localhost|127\.0\.0\.1|::1)$/i.test(String(s.host))) {
    return { ok: false, motif: `hôte « ${s.host} » — serveur de développement` };
  }
  return { ok: true, hote: `${s.host}:${s.port || 1025}` };
}

let _transport = null;
let _transportKey = '';
function transport(smtp) {
  if (!nodemailer || !smtp.enabled || !smtp.host) return null;
  const key = `${smtp.host}:${smtp.port}:${smtp.user}`;
  if (_transport && _transportKey === key) return _transport;
  _transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 1025,
    secure: !!smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    tls: { rejectUnauthorized: false },
  });
  _transportKey = key;
  return _transport;
}

async function record(email, status, error) {
  // Le journal garde la trace des pièces jointes, jamais leur contenu :
  // data/emails.json resterait sinon illisible et grossirait sans fin.
  //
  // Et jamais le corps d'un message qui porte un secret. Trois messages en
  // portent un — mot de passe d'ouverture de compte, mot de passe
  // réinitialisé, code à usage unique — et ils étaient conservés en clair,
  // cinq cents messages durant, sans limite de temps. Un journal d'envois
  // devenait ainsi un trousseau : qui lisait le fichier de données obtenait
  // des mots de passe utilisables, non des empreintes.
  //
  // Le marquage est explicite au lieu d'être deviné : un motif de texte se
  // trompe, une intention non. Un contrôle de fumée refuse qu'un nouveau
  // message porte un secret sans le dire.
  const { attachments, secret, ...entete } = email;
  if (secret) {
    entete.body = '(corps retiré : ce message portait un secret)';
    entete.secret = true;
  }
  const trace = (attachments || []).map((p) => p.filename);
  // `modifier`, et non `load` puis `save` : **l'identifiant dérive de la
  // longueur du journal**. Deux envois simultanés liraient la même liste, y
  // pousseraient chacun une ligne portant le même `id`, et l'un des deux
  // disparaîtrait — sans erreur, dans le registre même qui doit dire ce qui est
  // parti. Le geste était sûr tant que le magasin était synchrone.
  return magasin.modifier('emails', [], (box) => [...box, {
    id: box.length + 1, ts: new Date().toISOString(), status, error: error || null,
    ...entete, ...(trace.length ? { pieces_jointes: trace } : {}),
  }].slice(-500));
}

// Renvoie une promesse : les envois ordinaires l'ignorent (file d'attente),
// ceux qui engagent l'administration — la transmission d'un rapport — peuvent
// l'attendre pour ne rien acter qui ne soit parti.
function queue(email) {
  const smtp = loadSmtp();
  const tr = transport(smtp);
  // L'inscription au registre est **attendue** avant de rendre l'état : dire
  // « en attente » avant d'avoir noté qu'on l'est laisserait un message parti
  // de la file sans trace nulle part.
  if (!tr) return record(email, 'queued').then(() => ({ status: 'queued' }));
  return tr.sendMail({
    from: smtp.from || `${APP} <no-reply@localhost>`,
    to: email.to,
    cc: email.cc || undefined,
    bcc: email.bcc || undefined,
    subject: email.subject,
    text: email.body,
    attachments: (email.attachments || []).length ? email.attachments : undefined,
  })
    .then(async (info) => {
      await record({ ...email, messageId: info.messageId }, 'sent');
      return { status: 'sent', messageId: info.messageId };
    })
    .catch(async (err) => {
      const motif = String((err && err.message) || err);
      await record(email, 'error', motif);
      return { status: 'error', error: motif };
    });
}

function accountCreated({ to, name, username, password }) {
  return queue({
    // Ce message porte un secret : son corps ne sera pas conservé.
    secret: true,
    to,
    subject: `Bienvenue sur ${APP} - Vos identifiants de connexion`,
    body: `Bonjour ${name},
Votre compte a été créé avec succès. Vous pouvez désormais vous connecter à notre application en utilisant les identifiants temporaires ci-dessous :

* Lien d'accès : ${LOGIN_URL}
* Nom d'utilisateur : ${username}
* Mot de passe temporaire : ${password}

Pour des raisons de sécurité, nous vous demandons de modifier ce mot de passe dès votre première connexion.
Si vous n'avez pas demandé la création de ce compte, veuillez ignorer cet e-mail ou contacter notre support à l'adresse ${SUPPORT}.
À bientôt, L'équipe ${APP}`,
  });
}

function passwordReset({ to, name, username, password }) {
  return queue({
    // Ce message porte un secret : son corps ne sera pas conservé.
    secret: true,
    to,
    subject: `${APP} - Votre nouveau mot de passe`,
    body: `Bonjour ${name},
Conformément à votre demande, votre mot de passe a été réinitialisé. Voici vos nouveaux identifiants pour vous connecter en toute sécurité :

* Nom d'utilisateur : ${username}
* Nouveau mot de passe : ${password}

Pour des raisons de sécurité, nous vous demandons de modifier ce mot de passe à votre prochaine connexion.
Si vous n'êtes pas à l'origine de cette demande, veuillez vous connecter immédiatement pour changer votre mot de passe et signaler l'incident à ${SUPPORT}.
Cordialement,
L'équipe ${APP}`,
  });
}

function mfaCode({ to, name, code, minutes, channel }) {
  return queue({
    // Ce message porte un secret : son corps ne sera pas conservé.
    secret: true,
    to,
    subject: `${APP} - Code de vérification`,
    body: `Bonjour ${name},
Voici votre code de vérification à usage unique pour finaliser votre connexion à ${APP} :

* Code : ${code}
* Validité : ${minutes} minutes
${channel === 'sms' ? `* Envoyé au numéro : ${to}` : ''}

Ne communiquez ce code à personne. Si vous n'êtes pas à l'origine de cette connexion,
changez immédiatement votre mot de passe et signalez l'incident à ${SUPPORT}.
Cordialement,
L'équipe ${APP}`,
  });
}

// Vérifie la connexion SMTP (bouton test admin)
async function verify() {
  const smtp = loadSmtp();
  const tr = transport(smtp);
  if (!tr) return { ok: false, reason: 'smtp_disabled' };
  try { await tr.verify(); return { ok: true, host: smtp.host, port: smtp.port }; }
  catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}

async function list() {
  return magasin.load('emails', []);
}

// État du canal d'envoi, pour que l'appelant sache si un message peut partir.
function etatSmtp() {
  const smtp = loadSmtp();
  return {
    actif: !!(nodemailer && smtp.enabled && smtp.host),
    host: smtp.host || '',
    port: smtp.port || 0,
    raison: !nodemailer ? 'nodemailer_absent'
      : (!smtp.enabled ? 'smtp_desactive' : (!smtp.host ? 'hote_manquant' : '')),
  };
}

module.exports = {
  messagerieCredible, queue, accountCreated, passwordReset, mfaCode, verify, list, etatSmtp };
