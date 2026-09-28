// Socle — ce que « Mesures d'Application » a bâti sur des constatations.
//
// RAMP et SURV servent leurs constatations au module « Mesures d'Application »,
// qui y rattache des traitements, des classements et des mesures. Supprimer
// une constatation ainsi reprise — ou l'inspection, le dossier, l'activité qui
// la portent — laissait ces suites sans objet : une mesure prononcée perdait
// l'écart qui la fonde. Les modules sources consultent donc ce que le module
// publie avant de supprimer, et refusent comme il le fait lui-même pour ses
// propres carences.
//
// Le service est facultatif : si « Mesures d'Application » n'est pas monté,
// rien n'a pu être bâti, et rien n'est refusé.
//
// ── Une fenêtre que l'asynchrone ouvre, et qu'il faut dire ──
//
// Ces fonctions servent cinq suppressions — trois dans SURV, une dans RAMP,
// plus les constatations. Chacune **vérifie puis efface** : elle demande à
// CARE s'il a bâti quelque chose, et supprime si non.
//
// Tant que le bus était synchrone, rien ne pouvait s'intercaler entre les deux
// gestes, et la vérification valait au moment de l'effacement. Depuis l'étape A
// d'ADR-002, elle ne vaut plus qu'au moment où elle est faite : entre les deux,
// CARE peut avoir prononcé une mesure sur la constatation qu'on s'apprête à
// supprimer.
//
// **Cette fenêtre ne peut pas être fermée ici.** La vérification lit les
// données d'un module, l'effacement écrit celles d'un autre : aucun `modifier`
// ne couvre les deux. Il y faudrait une transaction entre modules — ce que
// PostgreSQL donnera, et qu'un répertoire de fichiers n'a jamais donné.
//
// Ce qui la borne en attendant : la vérification est faite **immédiatement
// avant** l'écriture, sans rien attendre entre les deux ; ces suppressions sont
// réservées aux administrateurs et rares ; et le sens du refus protège du pire
// — une promesse non attendue est toujours vraie, donc un `await` oublié
// refuserait *toutes* les suppressions au lieu de les laisser passer.
//
// Porté aux points ouverts d'ADR-002.
const services = require('./services');

// Asynchrones depuis l'étape A d'ADR-002 : le service interrogé lit les
// données du module « Mesures d'Application », qui passeront en base. Le
// rendre tolérant ici épargne d'y revenir le jour de la bascule — et ces deux
// fonctions gardent cinq suppressions dans SURV et RAMP.
async function suitesDe(cles) {
  const parId = (await services.callOr('CARE.suitesParConstatation', {})) || {};
  return cles.filter((k) => k && parId[k]).map((k) => ({ constatation: k, ...parId[k] }));
}

// Répond 409 et rend vrai si l'une des constatations a une suite.
//
// **Le sens de son retour rend l'oubli d'un `await` dangereux** : une promesse
// est toujours vraie, donc un appelant qui oublierait d'attendre refuserait
// *toutes* les suppressions — bruyant, et c'est heureux. L'inverse aurait été
// pire. Le contrôle de forme de la suite « taille » l'interdit de toute façon.
async function refusSiSuites(res, cles) {
  const suites = await suitesDe(cles);
  if (!suites.length) return false;
  res.status(409).json({ error: 'suites_care', suites });
  return true;
}

// Clés sous lesquelles le module connaît une constatation de SURV : son
// identifiant nu, et la forme préfixée par prudence. RAMP, lui, publie
// toujours « ramp:<écart> ».
const clesSurv = (ids) => ids.flatMap((id) => [id, `surv:${id}`]);

module.exports = { suitesDe, refusSiSuites, clesSurv };
