// Module « Mesures d'Application » — rôles et droits.
//
// PESSCO raisonnait sur un rôle M4 porté par l'utilisateur. Sur OASIS, le
// privilège vient de « Gestion des Droits » (espace CARE) : Gestionnaire,
// Validateur, Contributeur, Lecteur, avec portées par domaine et secteur.
// Le rôle M4 est reconstitué à partir de ce privilège pour que le front repris
// de PESSCO fonctionne sans modification.
const moduleRights = require('../../module_rights');

const MODULE = 'CARE';

function privilege(user, domaineId, secteurId) {
  if (!user) return '';
  return moduleRights.effectivePrivilege(MODULE, user.username, domaineId || '', secteurId || '');
}

// Meilleur privilège détenu, toutes portées confondues.
function meilleurPrivilege(user, referentiels) {
  if (!user) return '';
  const base = moduleRights.getRights(MODULE, user.username);
  const secteurs = (referentiels.getAll().secteurs || [])
    .map((s) => moduleRights.effectivePrivilege(MODULE, user.username, s.domaine_id || '', s.id));
  const tous = [base.privilege, ...secteurs].filter(Boolean);
  return ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR'].find((p) => tous.includes(p)) || '';
}

// Rôle M4 attendu par le front repris de PESSCO.
function roleM4(user, referentiels) {
  const p = meilleurPrivilege(user, referentiels);
  if (p === 'GESTIONNAIRE') return 'M4_Administrateur';
  if (p === 'VALIDATEUR') return 'M4_Validateur';
  if (p === 'CONTRIBUTEUR') return 'M4_Contributeur';
  if (p === 'LECTEUR') return 'M4_Lecteur';
  return 'M4_Non Autorisé';
}

const peut = (user, requis, domaineId, secteurId) =>
  moduleRights.can(MODULE, user.username, requis, domaineId || '', secteurId || '');

// Une mesure vise un prestataire ; sa portée est celle du secteur et du
// domaine de ce prestataire. Une cible inconnue ne restreint rien : le
// privilège général s'applique alors.
function perimetreDuPrestataire(prestataireId, referentiels) {
  const refs = referentiels.getAll();
  const p = (refs.prestataires || []).find((x) => x.id === prestataireId) || {};
  const s = (refs.secteurs || []).find((x) => x.id === p.secteur_id) || {};
  return { domaine_id: p.domaine_id || s.domaine_id || '', secteur_id: p.secteur_id || '' };
}

const canValidate = (user, cible) => peut(user, 'VALIDATEUR', cible && cible.domaine_id, cible && cible.secteur_id);
const canContribute = (user, cible) => peut(user, 'CONTRIBUTEUR', cible && cible.domaine_id, cible && cible.secteur_id);
const isAdmin = (user, referentiels) => meilleurPrivilege(user, referentiels) === 'GESTIONNAIRE';

module.exports = {
  MODULE, privilege, meilleurPrivilege, roleM4,
  canValidate, canContribute, isAdmin, perimetreDuPrestataire,
};
