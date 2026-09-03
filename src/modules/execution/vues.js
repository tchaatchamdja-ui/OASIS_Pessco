// Module « Exécution de la Surveillance » — vue AAC / Vue Prestataire.
//
// Le mécanisme est celui du socle (`src/vues_prestataire.js`). Le module ne
// déclare ici que ses écarts : l'état des bascules est rangé dans son propre
// store, et seul le super-administrateur bascule — les dossiers de surveillance
// ne se recettent pas depuis un compte d'administration ordinaire.
const vuesSocle = require('../../vues_prestataire');
const db = require('./store');
const { MODULE } = require('./roles');

const socle = vuesSocle.creer({
  module: MODULE,
  db,
  rolesBascule: ['SUPERADMIN'],
  // Le module raisonne directement sur `prestataire_id` : aucune clé de
  // rapprochement supplémentaire n'est nécessaire.
  // Les deux rôles d'organisme, comme dans le socle : un administrateur de
  // prestataire reste un prestataire. L'omettre le faisait passer à travers
  // tous les cloisonnements du module.
  rolesPrestataire: vuesSocle.ROLES_PRESTATAIRE,
});

module.exports = socle;
