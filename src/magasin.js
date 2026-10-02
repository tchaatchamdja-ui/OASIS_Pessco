// OASIS — La façade du magasin : une collection à la fois (ADR-002, jalon n° 9).
//
// La bascule sur PostgreSQL ne se fait pas d'un bloc. 450 appels en dépendent,
// et un `await` oublié rend une promesse là où un tableau est attendu — sans
// erreur, sans trace. On convertit donc **collection par collection**, chacune
// derrière les contrôles qui la gardent.
//
// Cette façade est ce qui rend la chose possible : elle est asynchrone des deux
// côtés. Un appel converti fonctionne sur fichiers comme en base, et les 742
// contrôles tournent sans PostgreSQL comme avec.
//
// ── Une liste d'autorisation, toujours ──
//
// `MIGREES` nomme ce qui est passé en base, jamais ce qui reste. Une collection
// nouvelle reste donc sur fichiers par défaut : on ne bascule que ce qu'on a
// éprouvé. L'inverse enverrait en base des collections que personne n'a
// reprises, et le premier agent le découvrirait.
//
// Sans `DATABASE_URL`, la liste ne s'applique pas : tout reste sur fichiers.
// C'est le régime des contrôles, et celui d'une instance qui n'a pas encore
// basculé.
//
// ── Pourquoi `modifier`, et pas `load` puis `save` ──
//
// Presque tous les appels du socle lisent une collection, y ajoutent ou y
// changent une ligne, et la réécrivent. Sur fichiers, ce geste est sûr pour une
// raison que personne n'avait écrite : `store.load` et `store.save` sont
// **synchrones**, donc rien ne s'intercale entre les deux — Node ne rend la
// main qu'aux `await`, et il n'y en a pas.
//
// Traduire mécaniquement en `await magasin.load(…)` … `await magasin.save(…)`
// **détruit cette garantie**, et pas seulement en base : deux requêtes du même
// processus se perdent alors l'une l'autre. C'est une régression de correction,
// non un simple coût de portage.
//
// `modifier` rend le geste atomique dans les deux régimes : par `rev` comparé à
// l'écriture en base, par une file d'attente par collection sur fichiers — où
// un seul processus sert, le verrou s'en charge (ADR-001).
const store = require('./store');
const journal = require('./journal');
const storePg = require('./store_pg');

// Le symbole « ne rien écrire », défini là où vit la seule implémentation non
// triviale de `modifier`, et rendu ici parce que c'est la façade que les
// appelants connaissent.
const { INCHANGE } = storePg;

// Ce qui est passé en base, et rien d'autre.
//
// `ramp_aeronefs` — la nomenclature des aéronefs. Première convertie parce
// qu'elle est la plus isolée qui soit encore gardée : son propre fichier, un
// seul module, aucun service publié sur le bus, et une quinzaine de contrôles
// qui l'exercent de bout en bout.
//
// `emails` — le registre des envois. Deuxième, et pour deux raisons : `queue`
// rendait déjà une promesse, donc la propagation s'arrête à cinq appelants ; et
// son écriture dérive l'identifiant de la longueur du journal, ce qui en fait le
// cas d'école du lire-modifier-réécrire que `modifier` existe pour tenir.
//
// `notifications` — les avis du socle. Trois appels, deux fichiers, et le même
// identifiant dérivé d'une longueur.
//
// `mfa_challenges` — les défis d'authentification à deux facteurs. Un seul
// fichier, et le geste le plus sensible de tous : **le compteur de tentatives**.
// `verifyChallenge` lit le défi, incrémente son compteur, réécrit. Rendu
// asynchrone sans précaution, dix codes faux envoyés ensemble liraient tous
// `attempts: 0` et n'en écriraient qu'un — le plafond de cinq essais tomberait,
// et une force brute passerait. C'est `modifier` qui le tient.
//
// `users` — l'annuaire des comptes. **La seule dont les lectures sont restées
// synchrones**, et c'est mesuré : elles passent par des prédicats de rôle employés
// dans 101 appels et 545 chaînes de tableau. `src/annuaire.js` en tient un
// instantané, rafraîchi une fois par requête ; les écritures, elles, sont
// atomiques. L'en-tête de ce fichier-là dit le compromis et ce qu'il ne garantit
// pas.
//
// `sessions` — la table des jetons. La table en mémoire fait foi ; le magasin ne
// fait que la garder d'un démarrage à l'autre. Elle ferme le point n° 3 du jalon
// n° 6 : le socle Java peut désormais la lire là où Node l'écrit.
//
// `referentiels` et `module_rights` — mêmes que `users`, et pour la même raison
// mesurée : lues depuis des prédicats synchrones, 45 appels pour la première,
// quatre prédicats pour la seconde. Les trois sont tenues par
// `src/instantane.js`, rafraîchies ensemble une fois par requête.
//
// `profil_risque` — **le premier magasin de module** (jalon n° 13). Choisi parce
// qu'il est le plus petit des cinq : 12 appels, 5 fichiers, 23 contrôles. La
// propagation n'y est pas de la nature des trois précédentes — ces données ne
// sont pas lues par des prédicats mais dans le corps des gestionnaires, déjà
// asynchrones depuis la bascule des journaux. L'instantané ne conviendrait pas :
// une évaluation est un acte d'autorité en écriture permanente.
//
// `planification` — deuxième magasin de module, et celui où la **composition**
// compte : valider un plan faisait jusqu'à une dizaine d'écritures — le statut, les
// avis saisis activité par activité, les versions remplacées avec leur inscription
// au circuit, et la décision elle-même. Un plan validé dont le circuit ne porte pas
// la validation est un acte d'autorité sans sa justification.
//
// Le vocabulaire commun aux cinq magasins de module — `list`, `get`, `insert`,
// `update`, `remove`, `transformer` — vit dans `src/magasin_module.js` depuis ce
// deuxième : écrit cinq fois, il aurait fallu tenir d'accord cinq copies de la
// même subtilité.
const MIGREES = new Set([
  'ramp_aeronefs',
  'emails',
  'notifications',
  'mfa_challenges',
  'users',
  'sessions',
  'referentiels',
  'module_rights',
  'profil_risque',
  'planification',
]);

let socle = null;
let ouvert = false;

// `pg` ne s'ouvre qu'une fois, et seulement si une adresse est donnée.
function base() {
  if (!ouvert) { ouvert = true; socle = storePg.ouvrir(); }
  return socle;
}

const surBase = (nom) => MIGREES.has(nom) && !!base();

// Les tables au démarrage. Sans base, il n'y a rien à préparer.
async function preparer() {
  if (!base()) return false;
  await base().preparer();
  return true;
}

// ── La file d'attente des fichiers ──
//
// Une collection, une file : deux `modifier` sur la même collection ne se
// chevauchent pas, et deux collections différentes n'attendent pas l'une pour
// l'autre. Un échec ne bloque pas la file — le suivant part quand même.
const files = new Map();

function enFile(nom, tache) {
  const precedent = files.get(nom) || Promise.resolve();
  const suite = precedent.then(tache, tache);
  files.set(nom, suite.then(() => {}, () => {}));
  return suite;
}

// ── Le contrat, asynchrone des deux côtés ──

async function load(nom, defaut) {
  if (surBase(nom)) return base().load(nom, defaut);
  return store.load(nom, defaut);
}

async function save(nom, valeur) {
  if (surBase(nom)) return base().save(nom, valeur);
  store.save(nom, valeur);
  return valeur;
}

// Lire, transformer, réécrire — sans qu'une écriture concurrente disparaisse.
// `transformer` reçoit la valeur en place et rend celle à écrire ; il peut être
// asynchrone, et il peut être rappelé si quelqu'un est passé entre-temps. Il ne
// doit donc rien faire d'autre que calculer — pas d'envoi de courriel, pas
// d'écriture au journal : ceux-là se font après, sur ce que `modifier` rend.
//
// `INCHANGE` dit « ne rien écrire » — la ligne visée n'existe pas, ou rien n'a
// changé. La raison du symbole, plutôt que `undefined`, est dans l'en-tête de
// `src/store_pg.js` : un `return` oublié ne doit pas faire disparaître une
// écriture en silence.
//
// ── Le transformateur reçoit une copie, et il le fallait ──
//
// Sur fichiers, `store.load` rend **l'objet du cache**, partagé par tout le
// processus. Un transformateur qui le mute en place — et c'est la façon naturelle
// d'écrire `arr.splice(i, 1)` ou `arr[i] = …` — le mutait donc pour tout le
// monde, avant toute écriture. Deux conséquences, mesurées :
//
//   · s'il échoue, ou s'il rend `INCHANGE`, la valeur en mémoire reste celle
//     qu'il a fabriquée. Elle **diverge du fichier et y reste** : le cache est
//     indexé sur la date du fichier, que rien n'a changée. L'écriture est
//     refusée, et la donnée est fausse quand même ;
//   · s'il contient un `await`, son état intermédiaire est lisible par une autre
//     requête — un enregistrement déjà ôté et son parent pas encore libéré.
//
// La base n'a jamais eu ce défaut : chaque essai y relit le JSON, donc un objet
// neuf. La copie met les deux régimes au même comportement, ce qui est tout
// l'objet de cette façade. Elle coûte un clonage par écriture — quelques
// millisecondes sur la plus grosse collection, pour une trentaine d'écritures
// par jour.
async function modifier(nom, defaut, transformer) {
  if (surBase(nom)) return base().modifier(nom, defaut, transformer);
  return enFile(nom, async () => {
    const valeur = store.load(nom, defaut);
    const suivante = storePg.verifierRendu(nom, await transformer(structuredClone(valeur)));
    if (suivante === INCHANGE) return valeur;
    store.save(nom, suivante);
    return suivante;
  });
}

// ── Les journaux d'audit ──
//
// Ils ne passent pas par `store` mais par `src/journal.js` — une entrée par
// ligne, en ajout seul — et la base les range dans sa table `journal`, une
// ligne par entrée. Le contrat est donc distinct de celui des collections, et
// la liste de ce qui est migré l'est aussi.
//
// **Ce qui les rend particuliers n'est pas l'ajout, c'est le chaînage.**
// Ajouter est sans danger : cent insertions concurrentes donnent cent lignes,
// des deux côtés. Mais inscrire une entrée chaînée, c'est lire la dernière, en
// dériver l'empreinte, puis ajouter — un lire-modifier-réécrire. Deux
// inscriptions qui liraient la même dernière entrée poseraient deux entrées
// prétendant le même prédécesseur : **la chaîne forcherait, et rien ne pourrait
// la réparer** puisqu'une entrée inscrite ne se réécrit jamais.
//
// Ce geste était sûr sur fichiers sans que rien ne le dise : `log` n'avait aucun
// `await`. `journalChainer` le rend sûr explicitement — par une condition sur le
// bout de la chaîne en base, par une file d'attente sur fichiers.
const JOURNAUX_MIGRES = new Set([
  'audit',
  'module_audit',
]);

const journalSurBase = (nom) => JOURNAUX_MIGRES.has(nom) && !!base();

// Toutes les entrées d'un journal, de la plus ancienne à la plus récente.
async function journalLire(nom) {
  if (journalSurBase(nom)) return base().lire(nom);
  return journal.lire(nom);
}

// Les entrées d'une seule chaîne. Sur fichiers, le filtre se fait en mémoire —
// c'est ce que faisait déjà le regroupement par module.
async function journalLireChaine(nom, cle) {
  if (journalSurBase(nom)) return base().lireChaine(nom, cle);
  const tout = journal.lire(nom);
  return cle === undefined || cle === null || cle === ''
    ? tout
    : tout.filter((e) => (e.codeModule || '') === cle);
}

// Inscrit une entrée au bout d'une chaîne, sans qu'une inscription concurrente
// la rompe. `construire(entrees)` reçoit les entrées de la chaîne et rend celle
// à inscrire ; elle peut être rappelée, et ne doit donc que calculer.
async function journalChainer(nom, cle, construire) {
  if (journalSurBase(nom)) return base().chainer(nom, cle, construire);
  // Une file par journal, et non par chaîne : deux chaînes du même journal
  // écrivent dans le même fichier, et c'est lui qu'il faut sérialiser.
  return enFile(`journal:${nom}`, async () => {
    const tout = journal.lire(nom);
    const chaine = cle ? tout.filter((e) => (e.codeModule || '') === cle) : tout;
    const entree = await construire(chaine);
    journal.ajouter(nom, entree);
    return entree;
  });
}

// Reprise du format hérité : elle écrit un journal entier, et n'a donc lieu
// qu'une fois, avant que quoi que ce soit s'y ajoute. Sur base, la reprise des
// données est faite par scripts/migrer-pg.js, non ici.
async function journalReprendre(nom, entrees) {
  if (journalSurBase(nom)) {
    if (await base().compte(nom)) return false;
    for (const e of entrees) await base().ajouter(nom, e, e.codeModule || '');
    return true;
  }
  journal.ecrireTout(nom, entrees);
  return true;
}

// Un journal déjà repris n'est pas repris deux fois.
async function journalConverti(nom) {
  if (journalSurBase(nom)) return (await base().compte(nom)) > 0;
  return journal.converti(nom);
}

async function fermer() {
  if (socle && socle.fermer) await socle.fermer();
  socle = null;
  ouvert = false;
}

module.exports = {
  load, save, modifier, preparer, surBase, fermer, MIGREES, INCHANGE,
  journalLire, journalLireChaine, journalChainer, journalReprendre, journalConverti,
  journalSurBase, JOURNAUX_MIGRES,
  // Alias du contrat, pour que la suite « magasin-pg » éprouve le même nom que
  // celui qu'emploie `src/store_pg.js`.
  chainer: journalChainer,
};
