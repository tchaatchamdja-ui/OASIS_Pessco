// OASIS — Envelopper un gestionnaire de route asynchrone (ADR-002, jalon n° 9).
//
// Express 4 ne sait rien des promesses. Un gestionnaire déclaré `async` dont le
// corps échoue rend une promesse rejetée qu'Express ne regarde pas : **la
// requête reste ouverte jusqu'à expiration**, et le dernier filet de `server.js`
// — celui qui journalise et rend une erreur avec sa référence — n'est jamais
// atteint. Côté écran, une roue qui tourne sans fin, et rien dans les traces.
//
// Le cas n'existait presque pas tant que cinq gestionnaires sur 386 étaient
// asynchrones. La bascule du magasin les rend tous asynchrones, un module à la
// fois : l'ennui deviendrait alors systématique.
//
//   app.get(chemin, requireAuth, asynchrone(async (req, res) => { … }));
//
// Ce qui échoue part à `next(e)`, donc au gestionnaire d'erreurs du socle, qui
// inscrit la trace et rend `erreur_serveur` avec sa référence — exactement ce
// qu'un gestionnaire synchrone obtient déjà en levant.
const asynchrone = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asynchrone };
