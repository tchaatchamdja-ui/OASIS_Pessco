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

// ── À quelle instance une inspection appartient-elle ? ──
// À celle qui la tient : l'AAC qui l'a importée ou dont un rapport d'inspection
// l'a fait naître. C'est ce que dit le champ `instance`, posé à l'écriture.
//
// Ce champ n'existe que depuis les instances ; ce qui a été écrit avant n'en
// porte pas, et le socle le rend alors à l'instance installée — toutes les
// inspections du même coup. Le module, lui, sait à qui les rendre : chaque
// inspection nomme depuis toujours l'État sur l'aire de trafic duquel elle a
// été conduite. Sans ce rattrapage, le tableau de bord et les statistiques de
// l'AAC du Bénin comptaient les inspections du Mali et du Togo.
//
// L'État n'est retenu que s'il nomme une instance du dispositif : une
// inspection conduite hors de l'Union — ou dans un État qui n'a pas d'instance
// ouverte — revient à l'instance installée, faute de quoi elle ne se verrait
// de nulle part.
const instanceDe = (i, connues, ici) => String((i || {}).instance || '')
  || connues.get(norm((i || {}).pays)) || ici;

// Inspections visibles de la requête courante — deux cloisonnements
// successifs, qui ne disent pas la même chose : l'instance dit quelle AAC
// tient l'inspection, le périmètre quel exploitant le compte a le droit de
// voir. Un compte prestataire subit les deux.
//
// La liste des instances et l'instance locale sont lues une fois pour toute la
// requête : les relire par rang relirait le fichier de configuration autant de
// fois qu'il y a d'inspections.
const cloisonDe = (req, loadConfig) => {
  const retenue = instances.courante(req.userReel || req.user, loadConfig);
  // Vue régionale : rien n'est écarté, c'est tout le dispositif qu'on regarde.
  if (!retenue) return null;
  const connues = new Map(instances.liste(loadConfig).map((n) => [norm(n), n]));
  return { retenue, connues, ici: instances.locale(loadConfig) };
};

const filtrerInspections = (req, liste, loadConfig) => {
  const cloison = cloisonDe(req, loadConfig);
  const retenues = cloison
    ? liste.filter((i) => instanceDe(i, cloison.connues, cloison.ici) === cloison.retenue)
    : liste;
  const cles = perimetre(req);
  if (!cles) return retenues;
  return retenues.filter((i) => cles.has(norm(i.exploitant)));
};

// Une inspection désignée par son identifiant : les deux mêmes cloisonnements,
// pour que ce qu'une fiche ouvre soit exactement ce qu'une liste montre.
const voitInspection = (req, inspection, loadConfig) => {
  if (!inspection) return false;
  if (!voitExploitant(req, inspection.exploitant)) return false;
  const cloison = cloisonDe(req, loadConfig);
  if (!cloison) return true;
  return instanceDe(inspection, cloison.connues, cloison.ici) === cloison.retenue;
};

module.exports = {
  ...socle,
  perimetre, voitExploitant, voitInspection, filtrerInspections, instanceDe, norm
};
