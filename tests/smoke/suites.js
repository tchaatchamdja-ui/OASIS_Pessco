// OASIS — La table des suites de fumée : leur nom, leur port, leur fichier.
//
// ── Pourquoi une table à part, et pas dans le lanceur ──
//
// Elle y était, construite avec des `require` : lire la table **chargeait les
// vingt suites**, puppeteer compris. Rien ne pouvait donc l'éprouver — un
// contrôle qui veut vérifier que deux suites ne partagent pas un port n'a pas à
// monter un navigateur pour le savoir.
//
// Ici, une suite est trois chaînes. Le lanceur en tire ses modules ; le contrôle
// des ports la lit sans rien charger (`unitaires`, « la table des suites »).
//
// ── Un port par suite, et ce que le partage coûtait ──
//
// Sept suites tenaient le port **4797** : `ramp` en HTTP et les six suites de
// navigateur. La campagne les joue l'une après l'autre, de sorte que cela
// marchait — mais **deux ne pouvaient pas tourner ensemble**. Conséquence
// mesurée le 10 novembre 2026 : impossible de rejouer une suite seule pendant
// qu'une campagne tourne, ni de lancer une contre-épreuve sans attendre la fin
// de l'essai précédent. Quatre lancements ont été perdus dans la journée pour
// n'avoir pas attendu — l'erreur était la mienne, mais c'est le partage qui la
// rendait possible.
//
// *Une suite est indépendante, ou elle ne l'est pas.* Chacune a donc son port,
// et un contrôle refuse qu'il s'en partage à nouveau.
//
// Les dix premiers gardent celui qu'ils avaient — les documents et les notes qui
// les nomment restent vrais. Les suites de navigateur reçoivent 4800 à 4806.
//
// `port: 0` : la suite ne démarre aucun serveur. Elle lit des sources, ou
// éprouve des règles en processus.
//
// 4850 et au-delà appartiennent à `scripts/passerelle.js` : ne pas y empiéter.
const SUITES = [
  // ── Les suites HTTP : une par module, plus le socle ──
  { nom: 'socle', port: 4791, fichier: './socle.smoke' },
  { nom: 'profil-risque', port: 4792, fichier: './profil-risque.smoke' },
  { nom: 'planification', port: 4793, fichier: './planification.smoke' },
  { nom: 'droits', port: 4794, fichier: './droits.smoke' },
  { nom: 'execution', port: 4795, fichier: './execution.smoke' },
  { nom: 'mesures', port: 4796, fichier: './mesures.smoke' },
  { nom: 'ramp', port: 4797, fichier: './ramp.smoke' },

  // ── Les garde-fous : aucun serveur, ils lisent les sources ──
  // Taille des fichiers et des fonctions, noms globaux, appels au magasin.
  { nom: 'taille', port: 0, fichier: './taille.smoke' },
  // Les tables de libellés : une clé demandée doit exister, dans les trois langues.
  { nom: 'traductions', port: 0, fichier: './traductions.smoke' },
  // Les règles prises à part, sans passer par HTTP.
  { nom: 'unitaires', port: 0, fichier: './unitaires.smoke' },
  // Le magasin PostgreSQL : cinq contrôles lisent le schéma ; les douze autres
  // demandent OASIS_PG_ESSAI.
  { nom: 'magasin-pg', port: 0, fichier: './magasin-pg.smoke' },

  // ── Authentification à deux facteurs : son propre serveur, avec OASIS_MFA=1.
  // Aucune autre suite ne la traverse — elle est éteinte partout ailleurs.
  { nom: 'mfa', port: 4799, fichier: './mfa.smoke' },

  // ── Les suites de navigateur ──
  // Le portail et les deux pages qui l'entourent, console comprise.
  { nom: 'parcours', port: 4798, fichier: './parcours.smoke' },
  // Ce que le TypeScript affirme du socle global, vérifié dans un navigateur.
  // Une déclaration n'est pas une mesure — deux défauts l'ont dit.
  { nom: 'frontend', port: 4790, fichier: './frontend.smoke' },
  // Les six écrans de module, un par suite (ADR-003, 5.f.1). « Un écran, une
  // suite » : `parcours` porte déjà trois mille lignes, et le relevé des gestes
  // lance la suite de l'écran qu'il mesure.
  //
  // Leur nom porte « navigateur » pour que le filtre de l'argument les
  // distingue des suites HTTP du même module — le relevé lance la suite par son
  // nom, et deux noms dont l'un contient l'autre lui en feraient lancer deux.
  { nom: 'surv', port: 4800, fichier: './surv.smoke' },
  // ── SURV en porte trois, et c'est son découpage ──
  //
  // « Un écran, une suite » tenait tant qu'une suite restait lisible. Celle de
  // SURV a atteint 8 726 lignes, et le garde-fou de taille l'a dit deux tours
  // de suite. Les trois partagent leur mise en place (`surv-socle.js`), et le
  // relevé des gestes les lance **toutes** — `relever-gestes.js` accepte une
  // liste depuis le 12 novembre 2026, faute de quoi la couverture de l'écran
  // aurait chuté d'autant sans qu'un geste cesse d'être exercé.
  { nom: 'surv-pieces', port: 4806, fichier: './surv-pieces.smoke' },
  // La troisième : le paramétrage des checklists, détaché pour la même raison
  // que les pièces — il bâtit sa chaîne et l'efface, sans rien lire de ce que
  // les autres laissent.
  { nom: 'surv-parametres', port: 4807, fichier: './surv-parametres.smoke' },
  // La quatrième : la coquille de l'écran — thème, langue, panneaux — et sa
  // barre de filtres. La plus indépendante de toutes : elle ne bâtit aucune
  // chaîne, et rend l'écran dans l'état où elle l'a trouvé.
  { nom: 'surv-coquille', port: 4808, fichier: './surv-coquille.smoke' },
  // La cinquième : le circuit guidé d'une activité, sortie de `surv.smoke.js`
  // sans rien changer — elle y bâtissait déjà sa propre chaîne.
  { nom: 'surv-circuit', port: 4809, fichier: './surv-circuit.smoke' },
  // La sixième : la page des plans — export, historique, réinitialisation,
  // archivage. Elle bâtit sa notification, l'efface par le geste qu'elle
  // éprouve, et rend le plan désarchivé.
  { nom: 'surv-plans', port: 4810, fichier: './surv-plans.smoke' },
  // La septième : la configuration des processus, sortie de `surv.smoke.js`
  // sans rien changer — elle y bâtissait déjà son processus et le retirait.
  { nom: 'surv-processus', port: 4811, fichier: './surv-processus.smoke' },
  // La huitième : les documents imprimables — la fiche et le rapport, dans
  // leur vraie fenêtre, le mouchard posé dedans.
  { nom: 'surv-documents', port: 4812, fichier: './surv-documents.smoke' },
  { nom: 'ramp-navigateur', port: 4801, fichier: './ramp.navigateur.smoke' },
  { nom: 'droits-navigateur', port: 4802, fichier: './droits.navigateur.smoke' },
  { nom: 'planification-navigateur', port: 4803, fichier: './planification.navigateur.smoke' },
  { nom: 'mesures-navigateur', port: 4804, fichier: './mesures.navigateur.smoke' },
  { nom: 'profil-risque-navigateur', port: 4805, fichier: './profil-risque.navigateur.smoke' },
];

// ── Choisir une suite par son nom : l'exact l'emporte ──
//
// Le lanceur choisissait par **inclusion**, et cela a tenu tant qu'aucun nom
// n'était contenu dans un autre. Le découpage de SURV y a mis fin : `surv` est
// contenu dans `surv-pieces`, et `npm run smoke -- surv` en lançait **deux** —
// ce qui, pour le relevé des gestes, faisait écraser le journal de la première
// par celui de la seconde. Une couverture plausible, et fausse de moitié.
//
// Un nom exact désigne donc sa suite, et rien d'autre ; à défaut, l'inclusion
// reste, qui sert à lancer une famille (`-- navigateur`).
//
// Cette fonction est **la** règle : le lanceur l'appelle, et le garde-fou qui
// vérifie qu'un nom lancé par le relevé ne désigne qu'une suite l'appelle
// aussi. Deux endroits qui décideraient séparément finiraient par décider
// différemment — c'est la faute que ce dépôt a payée le plus souvent.
const choisir = (suites, filtre) => {
  if (!filtre) return suites;
  const exact = suites.filter((s) => s.nom === filtre);
  return exact.length ? exact : suites.filter((s) => s.nom.includes(filtre));
};

module.exports = { SUITES, choisir };
