// Module « Profils de Risque » — rôles et droits.
//
// Les profils de risque partagent l'espace de privilèges de la Planification
// (`rightsModule: "PLAN"` dans les deux manifestes) : une même personne y tient
// le même rôle. Le module est celui de l'Autorité — noter un organisme n'est
// pas l'affaire de l'organisme noté ; le socle accordant « Lecteur » à tout
// compte, la garde doit être explicite.
const moduleRights = require('../../module_rights');
const { ROLES_PRESTATAIRE } = require('../../vues_prestataire');

const RIGHTS = 'PLAN';

// Rôle module (M1) dérivé du rôle portail OASIS
function roleM1(user) {
  if (!user) return 'Consultation';
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return 'Administrateur';
  if (user.role === 'AAC' || user.role === 'INSPECTEUR') return 'Evaluateur';
  return 'Consultation';
}

const estPrestataire = (user) => !!user && ROLES_PRESTATAIRE.includes(user.role);

const peut = (req, privilege, cible) => !estPrestataire(req.user) && moduleRights.can(
  RIGHTS, req.user.username, privilege,
  (cible && cible.domaine_id) || '', (cible && cible.secteur_id) || '',
);

const peutLire = (req, cible) => !!req.user && !estPrestataire(req.user)
  && moduleRights.effectivePrivilege(
    RIGHTS, req.user.username,
    (cible && cible.domaine_id) || '', (cible && cible.secteur_id) || '',
  ) !== 'AUCUN';

const refus = (res) => res.status(403).json({ error: 'privilege_insuffisant' });

module.exports = { RIGHTS, roleM1, estPrestataire, peut, peutLire, refus };
