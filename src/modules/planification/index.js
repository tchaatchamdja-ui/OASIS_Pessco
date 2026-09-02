// OASIS — Backend du module « Planification de la Surveillance » (reprise
// intégrale PESSCO). Le module n'expose ici que son montage ; les routes sont
// rangées par objet :
//   1. plans       — référentiels partagés, contexte, statistiques, plans
//   2. activités   — activités d'un plan et verrou d'exécution
//   3. workflow    — circuit, amendement, versions et commentaires
//   4. risques     — cycles de surveillance et synchronisation des profils
//
// Endpoints attendus par le front PESSCO :
//   /api/m/planification/*  (plans, activités, workflow, versions, commentaires)
//   /api/inspecteurs, /api/types-supervision, /api/exigences,
//   /api/modes-supervision, /api/themes-supervision, /api/shared/risk-profiles
const services = require('../../services');
const db = require('./store');
const D = require('./domaine');

const M = '/api/m/planification';

function register(app, deps) {
  // Contrat exposé aux autres modules (Exécution de la Surveillance…)
  services.publish('PLAN.plansValides', D.plansValides, {
    module: 'PLAN',
    description: 'Plans de surveillance en vigueur (validés, approuvés DG, transmis) et leurs activités',
    parametres: '{ annee?, domaine_id?, secteur_id?, prestataire_id? }',
    retour: '[{ id, titre, annee, type, domaine_id, secteur_id, version, statut, date_validation, nb_activites, activites[] }]',
  });

  require('./routes-plans')(app, deps, M);
  require('./routes-activites')(app, deps, M);
  require('./routes-workflow')(app, deps, M);
  require('./routes-risques')(app, deps, M);
}

module.exports = {
  register,
  seed: db.seed,
  riskProfiles: D.riskProfiles,
  plansValides: D.plansValides,
};
