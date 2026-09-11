// Module « Planification de la Surveillance » — rôles et droits.
//
// Le privilège de « Gestion des Droits » (espace PLAN) gouverne l'écriture,
// avec ses portées par domaine et secteur. Les deux super-menus — Planification
// et Profils de Risques — partagent le même espace de privilèges.
const moduleRights = require('../../module_rights');
const { ROLES_PRESTATAIRE } = require('../../vues_prestataire');

// Rôle module M2 dérivé du rôle portail
function roleM2(user) {
  if (!user) return 'M2_Non Autorisé';
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return 'M2_Administrateur';
  if (user.role === 'AAC' || user.role === 'INSPECTEUR') return 'M2_Planificateur';
  return 'M2_Consultation';
}

// La planification est l'affaire de l'Autorité : le module n'a pas d'écran
// côté organisme, et le programme annuel — qui sera inspecté, quand, sur quel
// site — n'a pas à être servi à l'un des inspectés. Le socle accorde
// « Lecteur » par défaut à tout compte : sans cette garde, une session
// prestataire lisait le plan national et les dates de visite de ses
// concurrents.
const estPrestataire = (user) => !!user && ROLES_PRESTATAIRE.includes(user.role);

// Espace de privilèges du module, et case correspondante d'« Accès aux
// modules ». Le nom était écrit en clair à chaque appel : la garde du contexte
// le demandait sous `D.RIGHTS`, qui n'existait pas — elle comparait donc
// `undefined` à la liste des modules ouverts, et refusait le module à tout
// compte qui n'est pas super-administrateur.
const RIGHTS = 'PLAN';

const peut = (req, privilege, plan) => !estPrestataire(req.user) && moduleRights.can(
  RIGHTS, req.user.username, privilege,
  (plan && plan.domaine_id) || '', (plan && plan.secteur_id) || '',
);

// Lecture : tout privilège convient, sauf « Aucun » posé sur la portée — et
// sauf un compte rattaché à un organisme surveillé.
const peutLire = (req, plan) => !!req.user && !estPrestataire(req.user)
  && moduleRights.effectivePrivilege(
    RIGHTS, req.user.username,
    (plan && plan.domaine_id) || '', (plan && plan.secteur_id) || '',
  ) !== 'AUCUN';

const refus = (res) => res.status(403).json({ error: 'privilege_insuffisant' });

module.exports = { RIGHTS, roleM2, estPrestataire, peut, peutLire, refus };
