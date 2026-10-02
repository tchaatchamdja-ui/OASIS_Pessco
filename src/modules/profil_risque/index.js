// OASIS — Backend du module « Profils de Risque » (reprise intégrale PESSCO).
// Le module n'expose ici que son montage ; les routes sont rangées par objet :
//   1. partage   — données du portail, documents, contexte, CRUD des collections
//   2. excel     — modèles, exports et imports de classeurs
//   3. workflow  — circuit d'une évaluation et réévaluation
//
// Endpoints attendus par le front PESSCO :
//   /api/m/profil-risque/*  (données du module)
//   /api/domaines, /api/secteurs, /api/sous-activites, /api/prestataires,
//   /api/indices, /api/aac, /api/documents  (données partagées du portail)
const services = require('../../services');
const db = require('./store');
const D = require('./domaine');

const M = '/api/m/profil-risque';

function register(app, deps) {
  // Contrat exposé aux autres modules : la dernière évaluation validée de
  // chaque prestataire, avec niveau de risque, CSRBO et résultats détaillés.
  services.publish('PR.riskProfiles', D.riskProfiles, {
    module: 'PR',
    description: 'Dernier profil de risque validé par prestataire',
    retour: '[{ instance, prestataire_id, secteur_id, domaine_id, niveau, matrice, intensite, csn, csrbo, frequence, resultats, date_validation, cycle }]',
  });

  require('./routes-partage')(app, deps, M);
  require('./routes-excel')(app, deps, M);
  require('./routes-workflow')(app, deps, M);
}

module.exports = {
  register,
  // Asynchrone depuis que `profil_risque` vit en base (ADR-002, jalon n° 13).
  seed: db.seed,
  COLLECTIONS: db.COLLECTIONS,
  getColl: db.getColl,
  insert: db.insert,
  update: db.update,
  remove: db.remove,
  riskProfiles: D.riskProfiles,
};
