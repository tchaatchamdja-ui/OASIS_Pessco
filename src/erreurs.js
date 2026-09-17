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

module.exports = { introuvable };
