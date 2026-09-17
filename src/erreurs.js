// Socle — réponses d'erreur normalisées.
//
// Les routes répondaient chacune par sa phrase : « Carence non trouvée »,
// « Dossier non trouvé », « Pièce non trouvée »… Trente et une phrases pour un
// seul cas, à traduire une à une. Une erreur normalisée porte un code et
// l'objet qu'elle concerne ; l'écran compose la phrase dans la langue de
// l'agent (oasis-commun.js, avec les noms d'objets d'oasis-messages-serveur.js).
//
// La suite de fumée « traductions » vérifie que chaque objet cité ici a son
// nom dans les trois langues.

// L'enregistrement demandé n'existe pas (404).
function introuvable(res, objet) {
  return res.status(404).json({ error: 'introuvable', objet });
}

// Un champ obligatoire est resté vide (400). Le nom du champ se lit dans la
// même table que les objets.
function requis(res, objet) {
  return res.status(400).json({ error: 'requis', objet });
}

// La valeur reçue ne désigne rien que le serveur connaisse (400) : une
// famille, une vue, une instance… `suite` joint ce qui aide à corriger
// (les valeurs attendues).
function inconnu(res, objet, suite = {}) {
  return res.status(400).json({ ...suite, error: 'inconnu', objet });
}

// L'enregistrement existe déjà : même libellé, même compte (409).
function existant(res, objet) {
  return res.status(409).json({ error: 'existant', objet });
}

// L'enregistrement existe, mais hors de ce que le compte couvre (403).
// `precision` nomme ce qui le place au dehors — l'État, le plus souvent.
function horsPerimetre(res, objet, precision) {
  const corps = { error: 'hors_perimetre', objet };
  if (precision) corps.precision = String(precision);
  return res.status(403).json(corps);
}

module.exports = { introuvable, requis, inconnu, existant, horsPerimetre };
