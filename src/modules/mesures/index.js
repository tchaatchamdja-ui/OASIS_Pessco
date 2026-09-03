// Module « Mesures d'Application » (CARE) — D.7.2
//
// Reprise intégrale du module homonyme de PESSCO (« Suivi des Carences »),
// posée sur le socle OASIS : authentification et sessions, droits par
// domaine/secteur (espace CARE), référentiels partagés, journal d'audit,
// stockage JSON.
//
// Les constatations sur lesquelles portent les mesures appartiennent au module
// « Exécution de la Surveillance » : elles arrivent par le bus de services
// (`SURV.constatationsOuvertes`). Aucun accès direct à ses données — un module
// absent laisse celui-ci fonctionner, avec une liste vide.
//
// Routes groupées par objet :
//   1. paramètres — contexte utilisateur, catégories et types de mesure
//   2. mesures    — circuit d'une mesure, pièces jointes, indicateurs
const auth = require('../../auth');
const moduleRights = require('../../module_rights');
const db = require('./store');

const M = '/api/m/mesures';

module.exports = {
  register(app, deps) {
    require('./routes-parametres')(app, deps, M);
    require('./routes-mesures')(app, deps, M);

    // Combien de mesures pèsent sur une constatation : le module Exécution
    // l'affiche en regard de chaque constatation, sans lire les données d'ici.
    if (deps.services) {
      deps.services.publish('CARE.mesuresParConstatation', () => {
        const parId = {};
        db.list('mesures').forEach((m) => {
          if (!m.constatation_id) return;
          parId[m.constatation_id] = (parId[m.constatation_id] || 0) + 1;
        });
        return parId;
      }, {
        description: 'Nombre de mesures d’application prises par constatation',
      });
    }
  },

  seed() {
    db.seed();
    // Instance déjà installée : la liste des types d'investigation n'existait
    // pas encore, on l'amorce plutôt que d'ouvrir un paramétrage vide.
    db.seedTypesInvestigation();
    // Un module fraîchement installé n'a encore aucun droit attribué : sans
    // amorce, le privilège par défaut (Lecteur) empêcherait quiconque — y
    // compris le super-administrateur — de prendre la première mesure et donc
    // d'attribuer les droits depuis l'application. On ne touche qu'aux comptes
    // SUPERADMIN, et seulement s'ils n'ont pas déjà été paramétrés.
    auth.getUsers()
      .filter((u) => u.role === 'SUPERADMIN' && moduleRights.getRights('CARE', u.username).isDefault)
      .forEach((u) => moduleRights.setRights('CARE', u.username, {
        privilege: 'GESTIONNAIRE', scopes: [],
        updatedAt: new Date().toISOString(), updatedBy: 'installation',
      }));
  },
};
