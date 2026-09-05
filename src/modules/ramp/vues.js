// Module « Inspections d'aéronefs sur aire de trafic » — vue AAC / Prestataire.
//
// Le mécanisme est celui du socle (`src/vues_prestataire.js`) ; ce fichier ne
// porte que ce qui est propre au module : ici, le prestataire du portail est un
// exploitant, et RAMP ne l'a jamais désigné autrement que par son nom — c'est
// donc ce nom, ou son trigramme, qui rapproche les deux répertoires.
const referentiels = require('../../referentiels');
const instances = require('../../instances');
const vuesSocle = require('../../vues_prestataire');
const db = require('./store');
const { MODULE } = require('./roles');

const norm = (v) => String(v == null ? '' : v)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Ce qui, dans les données du module, appartient aux prestataires retenus :
// le nom de l'exploitant, tel qu'il figure sur l'inspection. Le trigramme est
// admis, certains classeurs ne portant que lui.
function clesExploitants(prestataireIds) {
  const liste = referentiels.getAll().prestataires || [];
  const cles = new Set();
  liste.filter((p) => prestataireIds.includes(p.id)).forEach((p) => {
    if (p.nom) cles.add(norm(p.nom));
    if (p.trigramme) cles.add(norm(p.trigramme));
  });
  return cles;
}

// Noms d'exploitants du module qui répondent au périmètre — ce que le front
// affiche en barre supérieure et ce que les écrans annoncent.
function exploitantsDuPerimetre(prestataireIds) {
  const cles = clesExploitants(prestataireIds);
  if (!cles.size) return [];
  const noms = new Set();
  db.list('inspections').forEach((i) => { if (cles.has(norm(i.exploitant))) noms.add(i.exploitant); });
  db.list('parametres')
    .filter((p) => p.type === 'exploitants' && cles.has(norm(p.label)))
    .forEach((p) => noms.add(p.label));
  return [...noms];
}

const socle = vuesSocle.creer({
  module: MODULE,
  db,
  // La bascule appartient à l'Autorité : super-administrateur et
  // administrateur AAC.
  rolesBascule: vuesSocle.ROLES_AAC,
  perimetre: (liste) => ({
    cles: clesExploitants(liste),
    exploitants: exploitantsDuPerimetre(liste),
  }),
});

// ── Cloisonnement des données ──
// `null` : aucune restriction (vue AAC). Sinon, l'ensemble des clés
// d'exploitant que la requête a le droit de voir — vide compris, qui ne
// laisse rien passer.
const perimetre = (req) => (req.vuePrestataire ? req.vuePrestataire.cles : null);

const voitExploitant = (req, exploitant) => {
  const cles = perimetre(req);
  return !cles || cles.has(norm(exploitant));
};

// Inspections visibles de la requête courante — deux cloisonnements
// successifs, qui ne disent pas la même chose : l'instance dit quelle AAC
// tient l'inspection, le périmètre quel exploitant le compte a le droit de
// voir. Un compte prestataire subit les deux.
const filtrerInspections = (req, liste, loadConfig) => {
  const retenues = instances.filtrer(liste,
    instances.courante(req.userReel || req.user, loadConfig), loadConfig);
  const cles = perimetre(req);
  if (!cles) return retenues;
  return retenues.filter((i) => cles.has(norm(i.exploitant)));
};

module.exports = {
  ...socle,
  perimetre, voitExploitant, filtrerInspections, norm
};
