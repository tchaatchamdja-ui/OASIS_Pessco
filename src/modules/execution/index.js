// Module « Exécution de la Surveillance » (SURV) — D.7.1
//
// Reprise intégrale du module homonyme de PESSCO, posée sur le socle OASIS :
// authentification et sessions, droits par domaine/secteur (espace SURV),
// référentiels partagés, journal d'audit, stockage JSON. Les activités à
// exécuter proviennent du module Planification via le bus de services
// (`PLAN.plansValides`) : aucun accès direct à ses données.
//
// Les routes sont regroupées par processus métier, dans l'ordre du circuit :
//   1. notifications  — déclenchement, échanges, accord du prestataire
//   2. dossiers       — réalisation, rédaction, constatations FNC/PAC
//   3. rapports       — validation, signatures, transmission, tableau de bord
//   4. paramètres     — checklists, criticités, types de cas, comptes
//   5. états          — délais du processus, archivage, rappels
const auth = require('../../auth');
const moduleRights = require('../../module_rights');
const db = require('./store');
const R = require('./roles');
const vues = require('./vues');

const M = '/api/m/execution';

module.exports = {
  register(app, deps) {
    // Chaque route du module s'authentifie via `requireAuth`, qui repose
    // `req.user` : la vue active (AAC / Prestataire) doit donc s'appliquer
    // juste après, sur chaque route, et non une seule fois en amont.
    const depsVue = { ...deps, requireAuth: [deps.requireAuth, vues.middleware] };

    require('./routes-parametres')(app, depsVue, M);
    require('./routes-notifications')(app, depsVue, M);
    require('./routes-dossiers')(app, depsVue, M);
    require('./routes-rapports')(app, depsVue, M);
    require('./routes-etats')(app, depsVue, M);
  },

  seed() {
    db.seed();
    // Un module fraîchement installé n'a encore aucun droit attribué : sans
    // amorce, le privilège par défaut (Lecteur) empêcherait quiconque — y
    // compris le super-administrateur — d'ouvrir le premier acte et donc
    // d'attribuer les droits depuis l'application. On ne touche qu'aux
    // comptes SUPERADMIN, et seulement s'ils n'ont pas déjà été paramétrés.
    auth.getUsers()
      .filter((u) => u.role === 'SUPERADMIN' && moduleRights.getRights(R.MODULE, u.username).isDefault)
      .forEach((u) => moduleRights.setRights(R.MODULE, u.username, {
        privilege: 'GESTIONNAIRE', scopes: [],
        updatedAt: new Date().toISOString(), updatedBy: 'installation',
      }));
  },
};
