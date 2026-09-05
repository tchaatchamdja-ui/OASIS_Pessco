// OASIS — Vue AAC / Vue Prestataire, partagée par les modules.
//
// Deux modules servent aujourd'hui les mêmes deux publics : l'Autorité, qui
// conduit la surveillance, et l'organisme surveillé, qui n'a à voir que ce qui
// le concerne. « Exécution de la Surveillance » et « Inspections d'aéronefs sur
// aire de trafic » en avaient chacun leur copie ; elles ont divergé. Le
// mécanisme vit désormais ici, et chaque module n'en déclare que ses écarts :
// qui peut basculer, où l'état est rangé, et comment se reconnaît une donnée
// du périmètre.
//
// La bascule n'est pas cosmétique : le middleware présente l'administrateur
// aux routes comme un compte du prestataire choisi, si bien que le
// cloisonnement des données s'applique réellement — on voit exactement ce que
// verrait ce prestataire.
const referentiels = require('./referentiels');
const moduleRights = require('./module_rights');

const VUES = ['aac', 'prestataire'];

// Rôles portail de l'Autorité : eux seuls basculent de vue et règlent les
// droits du module.
const ROLES_AAC = ['SUPERADMIN', 'ADMIN'];

// Rôles portail rattachés à un organisme : leur périmètre vient du compte.
const ROLES_PRESTATAIRE = ['PRESTATAIRE', 'ADMIN_PRESTATAIRE'];

/**
 * @param {object} o
 * @param {string} o.module        code du module (SURV, SAFA…)
 * @param {object} o.db            store du module ; porte la collection `vues`
 * @param {string[]} [o.rolesBascule]      rôles autorisés à basculer
 * @param {string[]} [o.rolesPrestataire]  rôles portail traités en prestataire
 * @param {(ids: string[]) => object} [o.perimetre]
 *        informations propres au module sur les prestataires retenus (clés de
 *        rapprochement, libellés) ; jointes à `req.vuePrestataire`.
 */
function creer(o) {
  const db = o.db;
  const MODULE = o.module;
  const rolesBascule = o.rolesBascule || ROLES_AAC;
  const rolesPrestataire = o.rolesPrestataire || ROLES_PRESTATAIRE;
  const perimetreDe = o.perimetre || (() => ({}));

  const peutBasculer = (user) => !!user && rolesBascule.includes(user.role);

  // L'État dont on tient le poste ne se règle plus ici : c'est l'instance
  // regardée, commune au portail et aux six modules (`src/instances.js`). Deux
  // mécanismes concurrents laissaient un module sur un État et son voisin sur
  // un autre.
  function vueDe(username) {
    const rec = db.get('vues', username);
    if (!rec || !VUES.includes(rec.vue)) return { vue: 'aac', prestataire_id: '' };
    return { vue: rec.vue, prestataire_id: rec.prestataire_id || '' };
  }

  function definirVue(username, vue, prestataireId) {
    const rec = {
      id: username,
      vue: VUES.includes(vue) ? vue : 'aac',
      prestataire_id: prestataireId || '',
      date_maj: db.now(),
    };
    if (db.get('vues', username)) db.update('vues', username, rec);
    else db.insert('vues', rec);
    return vueDe(username);
  }

  // Prestataire retenu par défaut : le premier actif, pour que la bascule
  // fonctionne sans réglage préalable.
  function prestataireParDefaut() {
    const liste = referentiels.getAll().prestataires || [];
    const actif = liste.find((p) => p.statut !== 'inactif') || liste[0];
    return actif ? actif.id : '';
  }

  // `req.user` n'est jamais modifié en place : c'est l'enregistrement partagé
  // du cache utilisateurs. `req.userReel` conserve le compte réellement
  // connecté — c'est lui, et non la vue simulée, qui décide du droit de
  // basculer. `prestataires` porte le périmètre complet ; `prestataire_id` en
  // garde le premier, valeur par défaut des formulaires.
  const enPrestataire = (req, liste, origine) => {
    req.user = { ...req.user, role: 'PRESTATAIRE', prestataire_id: liste[0] || '', prestataires: liste };
    req.vuePrestataire = { prestataires: liste, origine, ...perimetreDe(liste) };
  };

  function middleware(req, res, next) {
    req.userReel = req.user;

    // Privilège « Prestataire » attribué dans Gestion des Droits : le compte
    // travaille en permanence dans le périmètre des prestataires retenus en
    // portée. Aucune portée renseignée = aucun accès aux données du module.
    if (moduleRights.getRights(MODULE, req.user.username).privilege === 'PRESTATAIRE') {
      enPrestataire(req, moduleRights.prestatairesDuScope(MODULE, req.user.username), 'privilege');
      return next();
    }

    // Compte prestataire du portail : périmètre limité à son rattachement.
    if (rolesPrestataire.includes(req.user.role)) {
      enPrestataire(req, req.user.prestataire_id ? [req.user.prestataire_id] : [], 'compte');
      return next();
    }

    if (!peutBasculer(req.user)) return next();
    const active = vueDe(req.user.username);
    if (active.vue !== 'prestataire') return next();
    const prestataireId = active.prestataire_id || prestataireParDefaut();
    if (!prestataireId) return next();
    enPrestataire(req, [prestataireId], 'bascule');
    return next();
  }

  // Prestataires connus du référentiel, pour les listes du front.
  const listePrestataires = () => (referentiels.getAll().prestataires || [])
    .map((p) => ({ id: p.id, nom: p.nom, trigramme: p.trigramme }));

  const nomsPrestataires = (ids) => (referentiels.getAll().prestataires || [])
    .filter((p) => (ids || []).includes(p.id)).map((p) => p.nom).join(', ');

  return {
    VUES, ROLES_AAC, MODULE,
    peutBasculer, vueDe, definirVue, prestataireParDefaut, middleware,
    listePrestataires, nomsPrestataires,
  };
}

module.exports = { creer, VUES, ROLES_AAC, ROLES_PRESTATAIRE };
