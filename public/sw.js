/* OASIS — Service worker : l'application tient sans réseau.
 *
 * Les TDR déclarent le fonctionnement en mode dégradé **obligatoire** pour les
 * activités de terrain — inspections, audits, SAFA/SANA — et pour les
 * environnements à faible bande passante (fiche technique §2, contrainte n° 3).
 * Le module RAMP est précisément cela : un inspecteur sur une aire de trafic,
 * devant un appareil, avec un téléphone qui n'accroche rien.
 *
 * ── Ce que ce fichier fait, et ce qu'il ne fait pas ──
 *
 * Il sert ce qu'il a déjà vu quand le réseau manque. C'est tout, et c'est ce
 * que seul un service worker peut faire : sans lui, une page rechargée hors
 * réseau n'est qu'un écran d'erreur du navigateur.
 *
 * Il ne touche pas aux écritures. Une écriture différée demande une file
 * durable, un rejeu ordonné et un compte rendu à l'agent : cela vit dans la
 * page (`oasis-hors-ligne.js`), où l'on peut le montrer. Un service worker qui
 * avalerait des écritures en silence serait un piège.
 *
 * ── Trois régimes, et pourquoi ──
 *
 *   Navigation      Réseau d'abord, cache ensuite. Une page doit être fraîche
 *                   quand elle le peut ; c'est hors réseau qu'on se rabat.
 *   Ressources      Cache d'abord, rafraîchi derrière. Un script ne change
 *                   qu'au déploiement : l'attendre à chaque écran coûte une
 *                   seconde pour rien sur un réseau lent.
 *   Lectures d'API  Réseau d'abord, cache ensuite — et la réponse servie du
 *                   cache porte un en-tête qui dit son âge, pour que l'écran
 *                   puisse avertir qu'il montre des données d'hier.
 *
 * Les écritures (POST, PUT, DELETE) ne sont jamais mises en cache ni servies
 * depuis lui : elles passent au réseau, et c'est la page qui les rattrape.
 */

const VERSION = 'oasis-v1';
const COQUILLE = `${VERSION}-coquille`;
const DONNEES = `${VERSION}-donnees`;

// L'en-tête que le service worker ajoute à une réponse tirée du cache. La page
// le lit pour dire « données du … » plutôt que de laisser croire au direct.
const ENTETE_CACHE = 'X-OASIS-Cache';

// Ce qui est mis en réserve dès l'installation : de quoi ouvrir la page de
// connexion et le portail sans réseau. Le reste s'ajoute à l'usage — précharger
// les six modules coûterait des mégaoctets à un agent qui n'en ouvre qu'un.
const RESERVE = [
  '/login.html',
  '/css/oasis.css',
  '/shared/css/oasis-shell.css',
  '/img/oasis-logo.svg',
];

const estStatique = (url) => /\.(js|css|svg|png|jpg|jpeg|webp|woff2?|ttf|ico)$/i.test(url.pathname);
const estApi = (url) => url.pathname.startsWith('/api/');

self.addEventListener('install', (e) => {
  // `addAll` échoue en entier si une seule entrée manque : chacune est donc
  // mise en réserve pour son compte, et une absence ne retarde pas le reste.
  e.waitUntil((async () => {
    const cache = await caches.open(COQUILLE);
    await Promise.all(RESERVE.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Les caches d'une version précédente partent : sans cela, un déploiement
    // laisserait servir d'anciens scripts à côté des nouveaux.
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Une réponse du cache, marquée comme telle. Le corps n'est pas relu : on
// reconstruit l'enveloppe autour du même flux.
async function marquee(reponse) {
  const entetes = new Headers(reponse.headers);
  entetes.set(ENTETE_CACHE, 'hit');
  return new Response(await reponse.clone().blob(), {
    status: reponse.status, statusText: reponse.statusText, headers: entetes,
  });
}

async function reseauDAbord(requete, nomCache) {
  const cache = await caches.open(nomCache);
  try {
    const reponse = await fetch(requete);
    // Seules les réponses abouties entrent en réserve : mettre un 401 ou un
    // 500 en cache, c'est le resservir longtemps après sa cause.
    if (reponse && reponse.ok) cache.put(requete, reponse.clone()).catch(() => {});
    return reponse;
  } catch (e) {
    const garde = await cache.match(requete);
    if (garde) return marquee(garde);
    throw e;
  }
}

async function cacheDAbord(requete, nomCache) {
  const cache = await caches.open(nomCache);
  const garde = await cache.match(requete);
  const frais = fetch(requete).then((reponse) => {
    if (reponse && reponse.ok) cache.put(requete, reponse.clone()).catch(() => {});
    return reponse;
  }).catch(() => null);
  if (garde) return garde;
  const reponse = await frais;
  if (reponse) return reponse;
  throw new Error('ressource indisponible hors réseau');
}

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET') return;            // les écritures ne passent pas par ici
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // rien de ce qui est ailleurs

  // La sonde de santé et la politique de session disent l'état du serveur :
  // les servir du cache reviendrait à répondre « tout va bien » hors réseau.
  if (url.pathname === '/api/health' || url.pathname === '/api/politique-session') return;

  if (requete.mode === 'navigate') {
    e.respondWith(reseauDAbord(requete, COQUILLE));
    return;
  }
  if (estStatique(url)) {
    e.respondWith(cacheDAbord(requete, COQUILLE));
    return;
  }
  if (estApi(url)) {
    e.respondWith(reseauDAbord(requete, DONNEES));
  }
});

// La page demande parfois au service worker de prendre la main tout de suite —
// après un déploiement, sans attendre la fermeture de tous les onglets.
self.addEventListener('message', (e) => {
  if (e.data === 'oasis:prendre-la-main') self.skipWaiting();
});
