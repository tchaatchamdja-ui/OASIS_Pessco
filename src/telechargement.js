// Socle — les téléchargements que le navigateur suit lui-même.
//
// ── Pourquoi ce fichier existe ──
//
// Un téléchargement fabriqué en JavaScript — `fetch`, puis `blob`, puis une
// ancre qu'on clique — **échoue sans bruit**. Entre le clic de l'agent et celui
// du script, l'attente du serveur épuise l'activation utilisateur qui autorise
// l'enregistrement. Rien n'échoue dans le code : le blob se crée, `click()` ne
// lève pas, aucune erreur de console, aucune violation de CSP. Seul le fichier
// n'arrive jamais, et l'écran annonce « opération réussie ».
//
// Constaté le 4 septembre 2026 sur les exports de CARE, où le rendu d'un PDF
// prend quelques secondes — assez pour que l'activation expire. Un export
// instantané, lui, passe : *c'est pourquoi aucune ronde ne l'avait vu.*
//
// Le remède est de ne rien fabriquer : une **navigation**, que le navigateur
// suit toujours, et une réponse qui dit `Content-Disposition: attachment` — il
// l'enregistre alors sans quitter la page.
//
// *Et c'est bien une navigation, non une ancre cliquée par du code.* Ma première
// correction fabriquait l'ancre en se contentant de supprimer le blob : or c'est
// l'attribut `download` posé sur une ancre **cliquée par du script** qui dépend
// de cette activation, de sorte qu'elle reproduisait le défaut qu'elle devait
// fermer, en plus discret. Une navigation de premier niveau n'en dépend pas.
//
// Ce fichier porte les trois obligations que cela crée côté serveur : nommer la
// pièce, mettre un refus en page, et préparer ce qu'un GET ne peut pas demander.
//
// ── La première : nommer la pièce correctement ──
//
// Un nom de fichier qui sort de l'ASCII ne tient pas dans un `filename="…"` :
// la RFC 6266 veut alors un `filename*=UTF-8''<pour-cent-encodé>`. Le dépôt
// portait les trois formes, dont une **hybride et fausse** —
// `filename="${encodeURIComponent(nom)}"` —, qui faisait enregistrer
// « Rapport%20d%27audit » au lieu de « Rapport d'audit ».
//
// ── La deuxième : un refus devient une page ──
//
// Quand le navigateur suit l'ancre, il **affiche** la réponse. Un refus rendu
// en JSON — `{"error":"privilege_insuffisant"}` — s'affiche tel quel, dans un
// onglet nu. L'agent lit du code source là où il attendait un fichier.
//
// `pageDeRefus` convertit donc un corps d'erreur en page lisible, et seulement
// quand la requête vient d'une navigation. Le discriminant est l'en-tête
// `X-OASIS-Request`, que l'appel d'API du socle pose toujours et qu'une
// navigation ne porte jamais : les appels de l'application continuent de
// recevoir leur JSON, que l'écran traduit déjà.

// Le nom, dans les deux formes que la RFC 6266 prévoit : un repli ASCII pour
// les clients anciens, et la forme pour-cent-encodée qui porte le nom réel.
// Les guillemets et les sauts de ligne sortent du repli — ils refermeraient
// l'en-tête, ou l'ouvriraient sur une seconde ligne.
function dispositionDe(nom, { inline = false } = {}) {
  const propre = String(nom || 'document').replace(/[\r\n]/g, ' ').trim() || 'document';
  const repli = propre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const genre = inline ? 'inline' : 'attachment';
  // `encodeURIComponent` laisse passer `!'()*~` — hors du jeu de caractères que
  // la RFC 5987 autorise dans un `filename*`. Les navigateurs le tolèrent ;
  // l'apostrophe y est pourtant le séparateur du champ lui-même
  // (`UTF-8''valeur`), et un nom de fichier français en porte souvent une.
  const encode = encodeURIComponent(propre)
    .replace(/['()*!~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${genre}; filename="${repli}"; filename*=UTF-8''${encode}`;
}

// Servir une pièce : son type, son nom, et son contenu.
function piece(res, { nom, type, inline = false }, contenu) {
  res.setHeader('Content-Type', type || 'application/octet-stream');
  res.setHeader('Content-Disposition', dispositionDe(nom, { inline }));
  return res.send(contenu);
}

// Vrai quand la réponse sera **affichée** par le navigateur, et non lue par
// l'application : une navigation ne porte pas l'en-tête du socle.
const estNavigation = (req) => req.get('X-OASIS-Request') !== '1';

const esc = (v) => String(v === null || v === undefined ? '' : v)
  .replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

// ── Pourquoi la page ne traduit pas le code du refus ──
//
// Les codes normalisés (`introuvable`, `privilege_insuffisant`, `reserve`…) ont
// leurs phrases dans les trois langues **du côté du socle**
// (`frontend/socle/messages-serveur.ts`), et une suite de fumée vérifie que
// chaque objet cité par le serveur y est nommé. Recopier cette table ici en
// ferait une seconde, qui divergerait le jour où l'une des deux change — et la
// garde ne surveille que la première.
//
// La page se tient donc à ce que le **statut** dit, qui est un ensemble clos de
// cinq cas et ne référence pas le vocabulaire des erreurs. Le code brut reste
// affiché, pour qu'un appel au support le cite tel quel.
const PHRASES = {
  401: 'Votre session a expiré. Reconnectez-vous, puis reprenez le téléchargement.',
  403: 'Votre compte n’a pas le droit de télécharger cette pièce.',
  404: 'La pièce demandée n’existe plus, ou l’adresse a changé.',
  413: 'La pièce dépasse la taille que le serveur accepte de transmettre.',
};
const PHRASE_SERVEUR = 'Le serveur n’a pas pu produire ce fichier.';
const PHRASE_AUTRE = 'Le serveur a refusé ce téléchargement.';

function pageHtml(statut, corps) {
  const code = String((corps && corps.error) || 'refus');
  const phrase = PHRASES[statut] || (statut >= 500 ? PHRASE_SERVEUR : PHRASE_AUTRE);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Téléchargement refusé — OASIS</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
         background: #f5f6f8; color: #1d2433; padding: 24px; }
  @media (prefers-color-scheme: dark) { body { background: #16181d; color: #e6e8ec; } }
  main { max-width: 34rem; }
  h1 { font-size: 1.35rem; margin: 0 0 .75rem; }
  p { margin: 0 0 .75rem; }
  code { font-size: .85em; opacity: .75; }
</style></head>
<body><main>
  <h1>Ce téléchargement n’a pas abouti</h1>
  <p>${esc(phrase)}</p>
  <p>Revenez à l’écran précédent et reprenez le geste. Si le refus persiste,
     citez ce code au support : <code>${esc(statut)} ${esc(code)}</code>.</p>
</main></body></html>`;
}

// Middleware : à poser sur toute route qu'une vraie ancre atteint, **avant**
// les gardes, puisque c'est leur refus qu'il met en forme.
function pageDeRefus(req, res, next) {
  if (!estNavigation(req)) return next();
  const json = res.json.bind(res);
  res.json = (corps) => {
    if (res.statusCode < 400) return json(corps);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pageHtml(res.statusCode, corps));
  };
  return next();
}

// ── Les pièces préparées, que le navigateur vient chercher ──
//
// Tout ne se télécharge pas par un GET : une sélection de plusieurs centaines
// d'identifiants ne tient pas dans une adresse. Il faut alors un POST — et un
// POST ne peut pas être une navigation, puisque le garde d'origine
// (`src/protections.js`, SEC-06) refuse toute écriture qui ne porte pas
// `X-OASIS-Request`, en-tête qu'un formulaire de navigation ne peut pas poser.
// C'est voulu : c'est ce qui arrête un POST forgé depuis un autre site.
//
// Le détour est donc en deux temps, et RAMP l'avait déjà trouvé pour son
// générateur de tables : l'application **prépare** la pièce par un POST en
// règle, le serveur la garde sous un jeton, et la page **navigue** vers un GET
// qui la sert. Aucune attente entre le clic et la navigation, aucun blob, et le
// garde d'origine reste entier.
//
// Ce dépôt vit en mémoire, et c'est un choix : une pièce préparée n'a pas à
// survivre à un redémarrage — elle se redemande. Quatre propriétés :
//
//   · elle **expire** (cinq minutes), sans quoi la mémoire enflerait ;
//   · elle est **liée au compte** qui l'a préparée : un jeton deviné par un
//     autre ne sert rien ;
//   · elle est **à usage unique**, retirée dès qu'elle est servie ;
//   · chaque dépôt **balaie** ce qui a expiré, pour n'avoir pas de minuteur.
const crypto = require('crypto');

const PIECES = new Map();
const DUREE = 5 * 60 * 1000;

function deposer({ contenu, nom, type, utilisateur }) {
  const jeton = crypto.randomBytes(16).toString('hex');
  PIECES.set(jeton, {
    contenu, nom, type, utilisateur, expire: Date.now() + DUREE,
  });
  PIECES.forEach((v, k) => { if (v.expire < Date.now()) PIECES.delete(k); });
  return jeton;
}

// Servir une pièce déposée. Rend `false` quand il n'y a rien à servir — à
// l'appelant de répondre, pour que le refus porte le vocabulaire de son module.
function servir(res, jeton, utilisateur) {
  const item = PIECES.get(jeton);
  if (!item || item.expire < Date.now()) {
    PIECES.delete(jeton);
    return false;
  }
  if (item.utilisateur && item.utilisateur !== utilisateur) return false;
  PIECES.delete(jeton);
  piece(res, { nom: item.nom, type: item.type }, item.contenu);
  return true;
}

module.exports = {
  piece, dispositionDe, pageDeRefus, estNavigation, deposer, servir,
};
