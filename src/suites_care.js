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
// ── Une fenêtre qui ne fait plus de dégât — 3 octobre 2026 ──
//
// Ces fonctions servent cinq suppressions — trois dans SURV, une dans RAMP,
// plus les constatations. Chacune **vérifie puis écrit** : elle demande à CARE
// s'il a bâti quelque chose, et poursuit si non.
//
// Tant que le bus était synchrone, rien ne pouvait s'intercaler entre les deux
// gestes. Depuis l'étape A d'ADR-002, la vérification ne vaut plus qu'au moment
// où elle est faite : entre les deux, CARE peut avoir prononcé une mesure sur la
// constatation visée.
//
// **Cette fenêtre ne peut pas être fermée ici**, et elle ne l'est pas. La
// vérification lit les données d'un module, l'écriture touche celles d'un autre :
// aucun `modifier` ne couvre les deux, et une transaction entre modules ferait
// divergir les deux régimes — les fichiers n'ont pas d'équivalent.
//
// Ce qui a changé, c'est **ce qui se passe dans la fenêtre**. Sur décision de la
// maîtrise d'ouvrage, les constatations et les écarts ne sont plus détruits : ils
// sont *retirés*. L'enregistrement porte `retire_le`, disparaît de toutes les
// listes, et subsiste. Une mesure prononcée dans la fenêtre garde donc l'écart
// qui la fonde — et les contrats du bus continuent de le servir, avec sa marque,
// précisément pour que le consommateur ne perde pas le fondement de sa propre
// décision.
//
// **La fenêtre existe toujours. Il ne s'y passe plus rien d'irréversible.**
// C'est la seule chose qui comptait.
//
// Le refus que ces fonctions opposent n'est donc plus ce qui tient l'intégrité :
// il reste pour l'agent, à qui l'on dit pourquoi son geste n'aboutit pas, plutôt
// que de retirer en silence ce qu'une sanction fonde. Et le sens de son retour
// protège toujours du pire — une promesse non attendue est toujours vraie, donc
// un `await` oublié refuserait *toutes* les suppressions au lieu de les laisser
// passer. Le contrôle de forme de la suite « taille » l'interdit de toute façon.
//
// Ce que cela coûte, et qu'il faut dire : rien ne purge les enregistrements
// retirés. C'est voulu — la politique de conservation (`src/retention.js`) range
// déjà ces collections sous « conserver », au motif qu'« un logiciel qui
// effacerait de lui-même un acte de surveillance serait une faute ». Le volume en
// jeu est celui de quelques suppressions d'administrateur par an.
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
