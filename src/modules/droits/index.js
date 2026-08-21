// OASIS — Module « Gestion des Droits ».
// Le moteur de droits (`src/module_rights.js`) appartient au socle : il est
// utilisé par tous les modules. Ce module n'en est que la façade — routes
// d'administration et interface.
const moduleRights = require('../../module_rights');

function register(app, deps) {
  moduleRights.register(app, deps);
}

// Aucune collection propre : les droits vivent dans data/module_rights.json,
// initialisé par le socle.
function seed() {}

module.exports = { register, seed };
