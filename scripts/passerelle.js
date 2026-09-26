#!/usr/bin/env node
// OASIS — La passerelle de l'étranglement (ADR-002, jalon n° 4).
//
// Pendant la réécriture, deux socles servent la même application : le Node
// historique et le Java qui le remplace route par route. Le navigateur, lui,
// ne doit rien en savoir — c'est la condition pour que le front, 62 979 lignes
// qui ne bougent pas, continue de fonctionner sans être touché.
//
// Cette passerelle écoute sur un port, et pour chaque requête choisit qui
// répond : la table `MIGRE` dit ce qui est passé au Java. Tout le reste va au
// Node.
//
//   scripts/passerelle.js                 4850 → Node 4899, Java 4900
//   PASSERELLE_PORT=8080 scripts/passerelle.js
//
// ── Une liste d'autorisation, encore ──
//
// La table nomme ce qui est migré, jamais ce qui ne l'est pas. Une route
// nouvelle va donc au Node par défaut : on ne bascule que ce qu'on a
// éprouvé. L'inverse — tout au Java sauf exceptions — enverrait au Java des
// routes que personne n'a encore écrites, et le premier agent le découvrirait.
//
// ── L'écriture reste au Node, et c'est écrit ici ──
//
// `PUT /api/m/droits/:module/users/:username` n'est pas dans la table. Le
// magasin par fichiers n'a pas de verrou : deux écrivains s'y perdent l'un
// l'autre, et deux rédacteurs sur une chaîne d'audit la rompent. La lecture
// bascule ; l'écriture attend le magasin partagé.
const http = require('http');

const PORT = Number(process.env.PASSERELLE_PORT || 4850);
const NODE = { hote: 'localhost', port: Number(process.env.PASSERELLE_NODE || 4899) };
const JAVA = { hote: 'localhost', port: Number(process.env.PASSERELLE_JAVA || 4900) };

// Ce qui est passé au Java, et rien d'autre.
const MIGRE = [
  { methode: 'GET', motif: /^\/api\/m\/droits\/context$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/refs$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/[^/]+\/users$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/[^/]+\/evaluateurs$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/[^/]+\/me$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/[^/]+\/my-access$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/[^/]+\/audit$/ },
  { methode: 'GET', motif: /^\/api\/m\/droits\/[^/]+\/audit\/verify$/ },
];

const chemin = (url) => String(url || '').split('?')[0];
const versJava = (req) => MIGRE.some((r) => r.methode === req.method && r.motif.test(chemin(req.url)));

// Compte rendu : combien de requêtes chacun a servies. C'est la seule façon de
// voir, en fin d'épreuve, que la bascule a réellement eu lieu — une table mal
// écrite enverrait tout au Node, et tout passerait au vert sans rien prouver.
const compte = { node: 0, java: 0 };

const serveur = http.createServer((req, res) => {
  const cible = versJava(req) ? JAVA : NODE;
  compte[cible === JAVA ? 'java' : 'node'] += 1;

  const relais = http.request({
    host: cible.hote,
    port: cible.port,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `${cible.hote}:${cible.port}` },
  }, (reponse) => {
    // L'en-tête dit qui a répondu : sans lui, on ne saurait pas distinguer
    // une réponse du Java d'une réponse du Node, et c'est précisément ce
    // qu'une bascule demande de vérifier.
    res.writeHead(reponse.statusCode, {
      ...reponse.headers,
      'X-OASIS-Servi-Par': cible === JAVA ? 'java' : 'node',
    });
    reponse.pipe(res);
  });

  relais.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      error: 'socle_injoignable',
      socle: cible === JAVA ? 'java' : 'node',
      port: cible.port,
      detail: e.message,
    }));
  });

  req.pipe(relais);
});

serveur.listen(PORT, () => {
  console.log(`passerelle sur http://localhost:${PORT}`);
  console.log(`  Node ${NODE.port} — tout ce qui n'est pas migré`);
  console.log(`  Java ${JAVA.port} — ${MIGRE.length} routes de « Gestion des Droits », en lecture`);
});

// Au premier signal d'arrêt, le compte rendu : qui a servi quoi.
['SIGINT', 'SIGTERM'].forEach((signal) => process.once(signal, () => {
  console.log(`\nrequêtes servies — Node : ${compte.node} · Java : ${compte.java}`);
  process.exit(0);
}));
