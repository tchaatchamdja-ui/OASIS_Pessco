// Module « Profils de Risque » — accès aux données.
// Neuf collections dans `profil_risque` : les trois familles d'indicateurs, les
// évaluations, les plans, les réunions, la bibliothèque documentaire et les
// indices de pondération.
//
// ── Premier magasin de module passé en base (ADR-002, jalon n° 13) ──
//
// Le vocabulaire commun — `list`, `get`, `insert`, `update`, `remove`,
// `transformer` — vit dans `src/magasin_module.js`, qui le porte pour les cinq
// modules. L'en-tête de ce fichier-là dit ce que `transformer` existe pour
// empêcher, et ce qu'un transformateur ne doit pas faire.
//
// **La propagation n'est pas de la nature de celle des trois collections du
// socle.** `users`, `referentiels` et `module_rights` sont lues par des prédicats
// synchrones — d'où l'instantané par requête de `src/instantane.js`. Ici, rien de
// tel : ces données sont lues dans le corps des gestionnaires, qui sont déjà
// asynchrones. La conversion est donc franche, et l'instantané ne conviendrait
// pas : une évaluation est un acte d'autorité, en écriture permanente, où lire un
// état vieux de quelques millisecondes n'est pas acceptable.
const { magasinDeModule } = require('../../magasin_module');

const base = magasinDeModule('profil_risque');

const COLLECTIONS = [
  'indicateurs_conf',
  'indicateurs_perf',
  'indicateurs_complex',
  'evaluations',
  'plans',
  'eval_reunions',
  'eval_reunions_prest',
  'documents',
  'indices',
];

// Amorçage : une seule fois, et seulement si la collection est vide. `load` rend
// `{}` quand elle n'existe pas — c'est cette absence de clé qu'on lit, et non un
// `null`, puisque le défaut de la façade est l'objet vide.
async function seed() {
  const existant = await base.load();
  if (Object.keys(existant).length) return;
  await base.save({
    // Les indicateurs sont saisis par l'AAC (aucun exemple pré-rempli).
    indicateurs_conf: [],
    indicateurs_perf: [],
    indicateurs_complex: [],
    evaluations: [],
    plans: [],
    eval_reunions: [],
    eval_reunions_prest: [],
    documents: [],
    indices: [
      { cle: 'poids_conformite', valeur: 0.5 },
      { cle: 'poids_performance', valeur: 0.3 },
      { cle: 'poids_complexite', valeur: 0.2 },
      { cle: 'seuil_faible', valeur: 25 },
      { cle: 'seuil_moyen', valeur: 50 },
      { cle: 'seuil_eleve', valeur: 75 },
    ],
    createdAt: new Date().toISOString(),
  });
}

module.exports = { ...base, COLLECTIONS, seed };
