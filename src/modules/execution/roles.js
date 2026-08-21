// Module « Exécution de la Surveillance » — rôles et droits.
//
// PESSCO raisonnait sur un rôle M3 porté par l'utilisateur. Sur OASIS, le
// privilège vient de « Gestion des Droits » (espace SURV) : Gestionnaire,
// Validateur, Contributeur, Lecteur, avec portées par domaine et secteur.
// Le rôle M3 est reconstitué à partir de ce privilège pour que le front
// repris de PESSCO fonctionne sans modification.
const moduleRights = require('../../module_rights');

const MODULE = 'SURV';

// Un prestataire (rôle portail PRESTATAIRE) ne voit que ses propres dossiers.
const estPrestataire = (user) => user && user.role === 'PRESTATAIRE';

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

// Rôle M3 attendu par le front PESSCO.
function roleM3(user, referentiels) {
  if (estPrestataire(user)) return 'M3_Prestataire';
  const p = meilleurPrivilege(user, referentiels);
  if (p === 'GESTIONNAIRE') return 'M3_Administrateur';
  if (p === 'VALIDATEUR') return 'M3_Validateur';
  if (p === 'CONTRIBUTEUR') return 'M3_Contributeur';
  if (p === 'LECTEUR') return 'M3_Lecteur';
  return 'M3_Non Autorisé';
}

const peut = (user, requis, domaineId, secteurId) =>
  moduleRights.can(MODULE, user.username, requis, domaineId || '', secteurId || '');

// Prestataires dont le compte voit les données (le périmètre est posé par
// `vues.js` en tête de chaque requête du module).
const prestatairesDe = (user) => {
  if (!user) return [];
  if (Array.isArray(user.prestataires)) return user.prestataires;
  return user.prestataire_id ? [user.prestataire_id] : [];
};

const accedeA = (user, prestataireId) => prestatairesDe(user).includes(prestataireId);

// Contrôles utilisés par les routes. `cible` porte éventuellement le domaine,
// le secteur et le prestataire concernés, pour appliquer les portées.
const canValidate = (user, cible, referentiels) => !estPrestataire(user)
  && peut(user, 'VALIDATEUR', cible && cible.domaine_id, cible && cible.secteur_id);

// Un compte en mode prestataire n'écrit que sur les données de son périmètre.
// Une cible sans prestataire désigné (téléversement, réponse de checklist)
// n'est pas rattachable : elle reste ouverte.
// Droit confié au compte courant (`req.user` porte le nom d'utilisateur).
const compteA = (user, cle, auth) => {
  if (!estPrestataire(user)) return true;
  const compte = auth.findUser(user.username);
  return aLeDroit(compte, cle);
};

const canContribute = (user, cible, referentiels) => (estPrestataire(user)
  ? (!cible || !cible.prestataire_id || accedeA(user, cible.prestataire_id))
  : peut(user, 'CONTRIBUTEUR', cible && cible.domaine_id, cible && cible.secteur_id));

const isAdmin = (user, referentiels) => !estPrestataire(user)
  && meilleurPrivilege(user, referentiels) === 'GESTIONNAIRE';

// ── Droits confiés aux comptes d'un prestataire ──
// Un organisme n'ouvre pas les mêmes portes à tous ses agents : l'administrateur
// du prestataire coche, pour chacun, ce qu'il lui confie. Un compte sans liste
// enregistrée les détient tous — c'était l'état de l'application avant que
// ces droits n'existent.
const DROITS_PRESTATAIRE = [
  { cle: 'notifications', libelle: 'Notifications d’activité',
    aide: 'Consulter les notifications adressées à l’organisme.' },
  { cle: 'echanges', libelle: 'Échanges et confirmation',
    aide: 'Répondre à l’Autorité et confirmer les dates de l’activité.' },
  { cle: 'rapports', libelle: 'Rapports transmis',
    aide: 'Consulter et télécharger les rapports de surveillance reçus.' },
  { cle: 'constatations', libelle: 'Constatations et PAC',
    aide: 'Suivre les constatations et déposer les plans d’actions correctives.' },
  { cle: 'utilisateurs', libelle: 'Comptes de l’organisme',
    aide: 'Créer et gérer les comptes rattachés au prestataire.' },
];

const normaliserDroits = (liste) => (Array.isArray(liste)
  ? DROITS_PRESTATAIRE.map((d) => d.cle).filter((c) => liste.includes(c))
  : null);

// `compte` est l'enregistrement portail (auth), non `req.user`.
const droitsDe = (compte) => {
  const liste = normaliserDroits(compte && compte.droits_surv);
  if (liste) return liste;
  return DROITS_PRESTATAIRE.map((d) => d.cle);
};

const aLeDroit = (compte, cle) => droitsDe(compte).includes(cle);

module.exports = {
  MODULE, estPrestataire, privilege, meilleurPrivilege, roleM3,
  prestatairesDe, accedeA, canValidate, canContribute, isAdmin,
  DROITS_PRESTATAIRE, droitsDe, aLeDroit, normaliserDroits, compteA,
};
