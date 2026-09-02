// Module « Inspections d'aéronefs sur aire de trafic » — rôles et droits.
//
// RAMP portait ses propres comptes et trois rôles : Administrateur,
// Coordonnateur Régional, Coordonnateur National. Sur OASIS, le privilège vient
// de « Gestion des Droits » (espace SAFA) et le rôle RAMP s'en déduit :
//
//   GESTIONNAIRE → Administrateur          paramétrage, suppression
//   VALIDATEUR   → Coordonnateur Régional  consultation de tout, pas d'import
//   CONTRIBUTEUR → Coordonnateur National  import et dépôt sur son périmètre
//   LECTEUR      → Consultation
//
// Le Coordonnateur National de RAMP était rattaché à un État, qui bornait ce
// qu'il pouvait gérer. Cet État se lit ici dans les portées du privilège :
// c'est le domaine, ou à défaut le secteur, déclaré à « Gestion des Droits ».
const moduleRights = require('../../module_rights');

const MODULE = 'SAFA';

// Vue Prestataire : le compte tient celui de l'exploitant inspecté. Il consulte
// ce qui le concerne et n'écrit rien dans le module — le rôle est posé par
// `vues.js`, en tête de chaque requête.
const estPrestataire = (user) => !!user && user.role === 'PRESTATAIRE';

function privilege(user, domaineId, secteurId) {
  if (!user) return '';
  return moduleRights.effectivePrivilege(MODULE, user.username, domaineId || '', secteurId || '');
}

function meilleurPrivilege(user, referentiels) {
  if (!user) return '';
  const base = moduleRights.getRights(MODULE, user.username);
  const secteurs = (referentiels.getAll().secteurs || [])
    .map((s) => moduleRights.effectivePrivilege(MODULE, user.username, s.domaine_id || '', s.id));
  const tous = [base.privilege, ...secteurs].filter(Boolean);
  return ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR'].find((p) => tous.includes(p)) || '';
}

// Rôle RAMP attendu par les écrans repris.
function roleRamp(user, referentiels) {
  if (estPrestataire(user)) return 'Prestataire';
  const p = meilleurPrivilege(user, referentiels);
  if (p === 'GESTIONNAIRE') return 'Administrateur';
  if (p === 'VALIDATEUR') return 'Coordonnateur Régional';
  if (p === 'CONTRIBUTEUR') return 'Coordonnateur National';
  if (p === 'LECTEUR') return 'Lecteur';
  return 'Non autorisé';
}

const peut = (user, requis) => moduleRights.can(MODULE, user.username, requis, '', '');

const canContribute = (user) => !estPrestataire(user) && peut(user, 'CONTRIBUTEUR');
const canValidate = (user) => !estPrestataire(user) && peut(user, 'VALIDATEUR');
const isAdmin = (user, referentiels) => !estPrestataire(user)
  && meilleurPrivilege(user, referentiels) === 'GESTIONNAIRE';

// L'État de rattachement du compte, qui borne ce qu'un Coordonnateur National
// peut gérer. Un compte sans portée n'est borné par rien — c'est le cas des
// administrateurs et des coordonnateurs régionaux.
function etatsDe(user, referentiels) {
  const droits = moduleRights.getRights(MODULE, user.username);
  const refs = referentiels.getAll();
  const noms = new Set();
  (droits.scopes || []).forEach((s) => {
    const d = (refs.domaines || []).find((x) => x.id === s.domaine_id);
    if (d && d.nom) noms.add(d.nom);
    const sec = (refs.secteurs || []).find((x) => x.id === s.secteur_id);
    if (sec && sec.nom) noms.add(sec.nom);
  });
  return [...noms];
}

// Peut-on agir sur les données d'un État donné ? Administrateur et
// Coordonnateur Régional : partout. Coordonnateur National : sur le sien.
function couvreEtat(user, referentiels, etat) {
  if (estPrestataire(user)) return false;
  const role = roleRamp(user, referentiels);
  if (['Administrateur', 'Coordonnateur Régional'].includes(role)) return true;
  if (role !== 'Coordonnateur National') return false;
  const etats = etatsDe(user, referentiels);
  return etats.length === 0 || etats.includes(etat);
}

// ── Droits confiés aux comptes d'un exploitant ──
// L'organisme n'ouvre pas les mêmes portes à tous ses agents : son
// administrateur coche, pour chacun, ce qu'il lui confie. Un compte sans liste
// enregistrée les détient tous — c'était l'état de l'application avant que
// ces droits n'existent. Les intitulés suivent les écrans du module :
// inspections, écarts, actions correctives, statistiques.
const DROITS_PRESTATAIRE = [
  { cle: 'inspections', libelle: 'Inspections de l’exploitant',
    aide: 'Consulter les inspections sur aire de trafic et leurs rapports (POI).' },
  { cle: 'ecarts', libelle: 'Écarts et suivi',
    aide: 'Consulter les écarts relevés, leur catégorie et l’état de leur suivi.' },
  { cle: 'pac', libelle: 'Actions correctives',
    aide: 'Renseigner le plan d’actions correctives et suivre sa clôture.' },
  { cle: 'statistiques', libelle: 'Tableau de bord et statistiques',
    aide: 'Consulter les indicateurs, la situation générale et les exports.' },
  { cle: 'utilisateurs', libelle: 'Comptes de l’organisme',
    aide: 'Créer et gérer les comptes rattachés à l’exploitant.' },
];

const normaliserDroits = (liste) => (Array.isArray(liste)
  ? DROITS_PRESTATAIRE.map((d) => d.cle).filter((c) => liste.includes(c))
  : null);

// `compte` est l'enregistrement portail (auth), non `req.user`.
const droitsDe = (compte) => {
  const liste = normaliserDroits(compte && compte.droits_safa);
  if (liste) return liste;
  return DROITS_PRESTATAIRE.map((d) => d.cle);
};

const aLeDroit = (compte, cle) => droitsDe(compte).includes(cle);

// Droit confié au compte courant. Hors vue Prestataire, la question ne se pose
// pas : l'Autorité n'est pas bornée par les droits d'un organisme.
const compteA = (user, cle, auth, userReel) => {
  if (!estPrestataire(user)) return true;
  const compte = auth.findUser(((userReel || user) || {}).username);
  // L'administrateur de l'organisme détient d'office la gestion des comptes.
  if (compte && compte.role === 'ADMIN_PRESTATAIRE' && cle === 'utilisateurs') return true;
  return aLeDroit(compte, cle);
};

// Prestataires dont le compte voit les données ; le périmètre est posé par
// `vues.js` en tête de chaque requête du module.
const prestatairesDe = (user) => {
  if (!user) return [];
  if (Array.isArray(user.prestataires)) return user.prestataires;
  return user.prestataire_id ? [user.prestataire_id] : [];
};

module.exports = {
  MODULE, privilege, meilleurPrivilege, roleRamp, estPrestataire,
  DROITS_PRESTATAIRE, normaliserDroits, droitsDe, aLeDroit, compteA, prestatairesDe,
  canContribute, canValidate, isAdmin, etatsDe, couvreEtat,
};
