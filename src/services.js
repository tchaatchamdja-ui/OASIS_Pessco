// OASIS — Bus de services inter-modules.
//
// Un module publie ce qu'il expose aux autres ; les consommateurs passent par
// le nom du service, jamais par un `require` du module voisin. Un module peut
// ainsi être remplacé, désactivé ou développé séparément tant qu'il honore le
// contrat publié.
//
//   // côté producteur (module PLAN)
//   services.publish('PLAN.riskProfiles', riskProfiles, {
//     description: 'Dernier profil de risque validé par prestataire',
//   });
//
//   // côté consommateur
//   const profils = services.call('PLAN.riskProfiles');       // [] si absent
//   if (services.has('PLAN.riskProfiles')) { … }

const registre = new Map();

// ── Éprouver l'étape A : rendre tous les producteurs asynchrones ──
//
//   OASIS_BUS_DIFFERE=1 npm run smoke
//
// Chaque service publié répond alors après un tour de boucle, comme il le fera
// le jour où sa collection lira PostgreSQL. **Toute la campagne doit rester
// verte** : c'est la recette de chaque bascule à venir, et la seule façon de
// vérifier que rien ne consomme le bus sans l'attendre.
//
// Le contrôle de forme de la suite « taille » lit les sources ; celui-ci met
// l'application en situation. L'un attrape ce qui est mal écrit, l'autre ce qui
// est mal écrit *et* réellement emprunté. Relevé du 28 septembre 2026 : 756
// contrôles, tous verts, avec la variable posée.
const DIFFERE = process.env.OASIS_BUS_DIFFERE === '1';
const differer = (fn) => async (...args) => {
  await new Promise((r) => setTimeout(r, 0));
  return fn(...args);
};

// Publie un service. Le nom est préfixé par le code du module producteur.
function publish(nom, fn, meta) {
  if (typeof fn !== 'function') throw new TypeError(`service ${nom} : fonction attendue`);
  registre.set(nom, { fn: DIFFERE ? differer(fn) : fn, meta: meta || {} });
  return fn;
}

function has(nom) {
  return registre.has(nom);
}

// Récupère le service, ou `null` si le module producteur n'est pas monté.
function get(nom) {
  const s = registre.get(nom);
  return s ? s.fn : null;
}

// ── Le bus est asynchrone, par contrat (ADR-002, étape A) ──
//
// `call` et `callOr` rendent une promesse, **même quand le producteur répond
// sans attendre**. Ce n'est pas une anticipation : c'est ce qui rend la bascule
// du magasin possible collection par collection.
//
// Sans cela, un module dont une collection passe en base rendrait soudain une
// promesse à ses consommateurs, qui l'attendaient synchrone. Le jour de la
// bascule, `PLAN` recevrait une promesse au lieu d'un tableau de profils de
// risque : `.filter` lèverait, ou pire, `res.json` sérialiserait `{}` et
// l'écran montrerait une liste vide sans la moindre erreur.
//
// En le déclarant asynchrone **maintenant**, alors que tous les producteurs
// sont encore synchrones, la conversion des consommateurs se fait sous les
// contrôles existants : `await` sur une valeur qui n'est pas une promesse la
// rend telle quelle. Les 753 contrôles sont donc la recette de cette étape, et
// le jour de chaque bascule il n'y aura plus rien à reprendre ici.
//
// `has` et `get` restent synchrones : ils interrogent le registre, non le
// producteur. `get` rend la fonction elle-même — qui l'appelle directement
// court-circuite ce contrat, et le contrôle de forme de la suite « taille » l'y
// reprend.
async function call(nom, ...args) {
  const s = registre.get(nom);
  if (!s) return undefined;
  return s.fn(...args);
}

async function callOr(nom, defaut, ...args) {
  const s = registre.get(nom);
  return s ? s.fn(...args) : defaut;
}

// Inventaire, exposé par le socle sur /api/services (diagnostic).
function list() {
  return [...registre.entries()].map(([nom, s]) => ({ nom, ...s.meta }));
}

module.exports = { publish, has, get, call, callOr, list };
