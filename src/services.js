// OASIS — Bus de services inter-modules.
//
// Un module publie ce qu'il expose aux autres ; les consommateurs passent par
// le nom du service, jamais par un `require` du module voisin. Un module peut
// ainsi être remplacé, désactivé ou développé séparément tant qu'il honore le
// contrat publié.
//
//   // côté producteur (module PLAN)
//   services.publish('PLAN.riskProfiles', riskProfiles, {
//     description: 'Dernier profil de risque validé par prestataire',
//   });
//
//   // côté consommateur
//   const profils = services.call('PLAN.riskProfiles');       // [] si absent
//   if (services.has('PLAN.riskProfiles')) { … }

const registre = new Map();

// Publie un service. Le nom est préfixé par le code du module producteur.
function publish(nom, fn, meta) {
  if (typeof fn !== 'function') throw new TypeError(`service ${nom} : fonction attendue`);
  registre.set(nom, { fn, meta: meta || {} });
  return fn;
}

function has(nom) {
  return registre.has(nom);
}

// Récupère le service, ou `null` si le module producteur n'est pas monté.
function get(nom) {
  const s = registre.get(nom);
  return s ? s.fn : null;
}

// Appelle le service s'il existe. Sans producteur, renvoie `defaut`
// (par défaut un tableau vide) : un module consommateur reste fonctionnel
// même si le module producteur n'est pas déployé.
function call(nom, ...args) {
  const s = registre.get(nom);
  if (!s) return undefined;
  return s.fn(...args);
}

function callOr(nom, defaut, ...args) {
  const s = registre.get(nom);
  return s ? s.fn(...args) : defaut;
}

// Inventaire, exposé par le socle sur /api/services (diagnostic).
function list() {
  return [...registre.entries()].map(([nom, s]) => ({ nom, ...s.meta }));
}

module.exports = { publish, has, get, call, callOr, list };
