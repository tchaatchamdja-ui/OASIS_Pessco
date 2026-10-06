// OASIS — Protections posées devant l'application.
//
// Compression, en-têtes de sécurité, limitation de débit sur
// l'authentification, origine applicative des écritures, plafond d'écritures
// par compte. Elles vivaient au milieu de server.js, entre le montage des
// modules et les routes de comptes ; elles tiennent maintenant ensemble, là
// où docs/SECURITE.md les cite — SEC-03, SEC-04, SEC-06, SEC-12, SEC-13 et
// PERF-01.
//
// L'ORDRE COMPTE. `poser()` les installe dans celui-ci, et il n'est pas
// indifférent : la compression enveloppe `res.send` avant que quoi que ce
// soit n'écrive, les en-têtes précèdent toute réponse, et le contrôle
// d'origine refuse une écriture avant qu'une route la voie. Deux d'entre
// elles ne sont pas posées ici mais appelées par ailleurs — `limiterAuth` sur
// les routes de connexion, `limiterEcritures` depuis `requireAuth`, seul
// endroit où le compte est connu.
const zlib = require('zlib');

// Posé par `poser()` : le journal d'audit, où s'inscrit un dépassement.
let audit = { log: () => {} };

const EN_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Compression des réponses (PERF-01) ──
// Sans dépendance : gzip est dans la bibliothèque standard. La compression ne
// s'applique qu'aux réponses textuelles d'une taille qui la justifie, et
// seulement si le client l'accepte. Derrière un proxy qui compresse déjà,
// poser OASIS_COMPRESSION=0.
const COMPRESSIBLE = /^(application\/(json|javascript)|text\/)/i;
const SEUIL_COMPRESSION = 1024;

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

// Les pages qu'un visiteur atteint sans être connu — la connexion, les témoins
// — n'ont plus ni gestionnaire en ligne ni bloc inséré : leur politique refuse
// donc tout script qui ne vient pas d'un fichier servi par l'application.
// C'est là que le durcissement vaut le plus, et c'est là qu'il coûte le moins.
// Les écrans internes gardent 'unsafe-inline' le temps que leurs gestionnaires
// hérités du portage soient externalisés, module par module (voir §8 de
// docs/SECURITE.md).
const CSP_STRICTE = CSP.replace("script-src 'self' 'unsafe-inline'", "script-src 'self'");
// La politique s'applique au document, non aux fichiers qu'il charge : seules
// les deux pages sont nommées ici.
const PAGES_STRICTES = new Set(['/login.html', '/cookies.html']);

// ── Limitation de débit sur l'authentification (SEC-03) ──
// Le verrouillage de compte protège un compte ; ceci protège l'application du
// balayage : énumération d'identifiants et essais répartis sur plusieurs
// comptes depuis une même origine.
const FENETRE_AUTH_MS = 15 * 60 * 1000;
const MAX_TENTATIVES_AUTH = 20;
const tentativesAuth = new Map();

// Middleware Express : il ne rend rien à Express, qui attend `next()`. Il est
// enveloppé par `asynchrone` à la pose — sans quoi un rejet laisserait la
// requête ouverte sans trace.
async function limiterAuth(req, res, next) {
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
    await audit.log(String((req.body || {}).username || 'inconnu'), 'AUTH_DEBIT_DEPASSE', { ip });
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
// seul un appel émis par nos pages le porte (voir public/shared/app/oasis-requete.js).
const METHODES_MUTATIVES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ROUTES_SANS_ENTETE = ['/api/login'];   // et ses sous-routes MFA

// ── Plafond d'écritures par compte (SEC-13) ──
// La limitation de débit ne couvrait que l'authentification : elle protège du
// balayage avant la porte, et laisse un compte authentifié appeler les deux
// cent trente-cinq routes mutatives sans compter. Rien d'exploitable par un
// anonyme, mais un script maladroit — une boucle de synchronisation, un import
// relancé en rafale — sature le service pour tout le monde.
//
// Le plafond est par compte, non par adresse : plusieurs agents derrière la
// même sortie Internet ne se pénalisent pas l'un l'autre. Les lectures ne sont
// pas comptées, elles ne coûtent rien au stockage.
//
// Dix écritures par seconde : aucune main ne les atteint, un import vif non
// plus — la suite de fumée, qui joue deux cent trente-cinq écritures d'affilée,
// est passée sous un plafond de deux par seconde et reste loin de celui-ci.
// Une boucle emballée, elle, en demande des centaines par seconde.
const ecritures = new Map();          // compte -> { compte, debut }

// **Asynchrone, et son résultat doit être attendu.** Elle rend un booléen :
// « l'écriture est-elle permise ? ». Appelée sans `await`, elle rend une
// promesse — toujours vraie — et le plafond ne se déclencherait plus jamais.
// Aucune erreur, aucune trace : le garde-fou serait simplement parti. Un
// contrôle de forme interdit désormais de l'appeler sans l'attendre.
async function limiterEcritures(req, res, cfg) {
  if (!METHODES_MUTATIVES.has(req.method)) return true;
  const sec = (cfg && cfg.security) || {};
  const max = Number(sec.maxWritesPerMinute) || 600;
  if (max <= 0) return true;          // 0 : plafond retiré au paramétrage
  const fenetre = 60 * 1000;
  const cle = req.user.username;
  const maintenant = Date.now();
  const t = ecritures.get(cle);
  if (!t || maintenant - t.debut > fenetre) {
    ecritures.set(cle, { compte: 1, debut: maintenant });
    return true;
  }
  t.compte += 1;
  if (t.compte > max) {
    const reste = Math.ceil((fenetre - (maintenant - t.debut)) / 1000);
    res.setHeader('Retry-After', String(reste));
    await audit.log(cle, 'ECRITURE_DEBIT_DEPASSE', { path: req.path, methode: req.method, plafond: max });
    res.status(429).json({ error: 'too_many_attempts', retry_after: reste });
    return false;
  }
  return true;
}

// Purge des compteurs échus, pour que la table ne croisse pas indéfiniment.
setInterval(() => {
  const seuil = Date.now() - 60 * 1000;
  for (const [cle, t] of ecritures) if (t.debut < seuil) ecritures.delete(cle);
}, 60 * 1000).unref();

// Installation, dans l'ordre. `deps.audit` sert aux deux limitations, qui
// inscrivent un dépassement au journal.
function poser(app, deps) {
  audit = deps.audit;

  // 1. Compression (PERF-01) : elle enveloppe `res.send`, donc avant tout ce
  //    qui répond.
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

  // 2. En-têtes de sécurité (SEC-04, SEC-12) : sur toute réponse, la stricte
  //    pour les deux pages publiques.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Content-Security-Policy', PAGES_STRICTES.has(req.path) ? CSP_STRICTE : CSP);
    if (EN_PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // 3. Origine applicative (SEC-06) : une écriture forgée est refusée avant
  //    qu'une route la voie.
  app.use((req, res, next) => {
    if (!METHODES_MUTATIVES.has(req.method) || !req.path.startsWith('/api/')) return next();
    if (ROUTES_SANS_ENTETE.some((r) => req.path === r || req.path.startsWith(`${r}/`))) return next();
    if (req.get('X-OASIS-Request') !== '1') {
      return res.status(403).json({ error: 'origine_non_reconnue' });
    }
    return next();
  });
}

// `SEUIL_COMPRESSION` sort aussi : le service des fichiers statiques
// l'emploie, et deux seuils qui se répondent doivent être le même.
module.exports = {
  poser, limiterAuth, limiterEcritures, EN_PRODUCTION, SEUIL_COMPRESSION,
};
