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
const services = require('./services');

function suitesDe(cles) {
  const parId = services.callOr('CARE.suitesParConstatation', {}) || {};
  return cles.filter((k) => k && parId[k]).map((k) => ({ constatation: k, ...parId[k] }));
}

// Répond 409 et rend vrai si l'une des constatations a une suite.
function refusSiSuites(res, cles) {
  const suites = suitesDe(cles);
  if (!suites.length) return false;
  res.status(409).json({ error: 'suites_care', suites });
  return true;
}

// Clés sous lesquelles le module connaît une constatation de SURV : son
// identifiant nu, et la forme préfixée par prudence. RAMP, lui, publie
// toujours « ramp:<écart> ».
const clesSurv = (ids) => ids.flatMap((id) => [id, `surv:${id}`]);

module.exports = { suitesDe, refusSiSuites, clesSurv };
