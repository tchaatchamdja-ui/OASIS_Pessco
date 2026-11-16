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
  // `indices` n'est pas une collection d'enregistrements mais le barème lui-même
  // (un objet de six seuils) : il se lit par `load`, jamais par `list`, qui y
  // appellerait `.filter`. Il figure ici parce que la liste nomme les clés du
  // magasin, non parce qu'elle nomme des listes.
  'indices',
];

// ── Les six seuils du barème, et les trois vocabulaires qui ne se parlaient pas ──
//
// `indices` portait un **tableau** de six paires `{cle, valeur}` — trois poids
// et trois paliers. Personne ne les lisait : seul ce semis les écrivait.
//
// L'écran, lui, emploie un **objet** de six seuils, deux par axe, et ce sont
// **eux** que six endroits du calcul lisent — `prSeuils` des profils, et quatre
// calculs de la fiche d'évaluation (indices de conformité, de performance et
// d'exposition). Comme la route rendait le tableau, chacune de ces lectures
// retombait sur `|| 0.8` et `|| 0.5` ; et comme `PUT /api/indices` attendait un
// tableau là où l'écran envoie un objet, la saisie était perdue en silence —
// avec un « OK » à l'écran.
//
// Le barème qui classe un organisme en « Élevé » ou « Modéré » n'était donc pas
// réglable, et la page prétendait le contraire. La maîtrise d'ouvrage a tranché
// le 5 novembre 2026 : **le modèle de l'écran fait loi**, puisque c'est lui que
// le calcul lit.
const SEUILS = ['conf1', 'conf2', 'perf1', 'perf2', 'expo1', 'expo2'];
// Les mêmes valeurs que les repliements du code : adopter le modèle ne change
// aucun calcul tant que personne ne règle les seuils.
const SEUILS_DEFAUT = {
  conf1: 0.8, conf2: 0.5, perf1: 0.8, perf2: 0.5, expo1: 0.8, expo2: 0.5,
};

// Les instances déjà installées portent le tableau : on le convertit au
// démarrage, plutôt que d'ouvrir une page de réglages sur six champs vides.
// Les paires de l'ancien modèle ne sont pas reprises — elles ne disaient pas la
// même chose, et personne ne les lisait.
async function seedSeuils() {
  await base.transformer((d) => {
    const i = d.indices;
    if (i && !Array.isArray(i) && SEUILS.every((c) => typeof i[c] === 'number')) {
      return base.INCHANGE;
    }
    d.indices = { ...SEUILS_DEFAUT };
    return d;
  });
}

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
    indices: { ...SEUILS_DEFAUT },
    createdAt: new Date().toISOString(),
  });
}

module.exports = { ...base, COLLECTIONS, seed, seedSeuils, SEUILS, SEUILS_DEFAUT };
