// OASIS — Les collections lues en mémoire, prises en instantané par requête.
//
// ── Trois collections ne pouvaient pas devenir asynchrones ──
//
// La bascule sur PostgreSQL s'est faite collection par collection (ADR-002,
// étape B), en rendant asynchrone ce qui lit chacune. Pour trois d'entre elles,
// ce chemin aurait été une faute, et c'est mesuré :
//
//   · `users` — lu par `getUsers()` et `findUser()` depuis des **prédicats de
//     rôle synchrones** (`compteA`, `canRead`, `canContribute`), eux-mêmes
//     employés dans 101 appels et 545 chaînes de tableau à travers les six
//     modules ;
//   · `referentiels` — lu par `getAll()`, **45 fois** hors de son module, dont
//     depuis les mêmes prédicats ;
//   · `module_rights` — lu par `getRights`, `can`, `effectivePrivilege` et
//     `accesAuModule`, qui sont eux-mêmes des prédicats.
//
// Les rendre asynchrones aurait transformé chaque `liste.filter(canRead)` en
// `await Promise.all(liste.map(…))`. Ce n'aurait plus été un portage mais une
// réécriture de la couche module, et le résultat se lirait beaucoup plus mal pour
// des données qu'on lit constamment et qu'on écrit rarement.
//
// ── L'instantané, et quand il est pris ──
//
// Ces trois collections sont donc tenues en mémoire et **rafraîchies ensemble,
// une fois par requête**, au seul endroit déjà asynchrone par lequel toute route
// protégée passe : `requireAuth`. Les lectures restent synchrones, et toutes
// celles d'une même requête voient le même état.
//
// C'est une garantie **plus forte** que celle d'avant, non plus faible : avec un
// magasin asynchrone, deux lectures d'un même gestionnaire pourraient sinon
// rendre des états différents, et une décision se prendrait sur l'un pendant
// qu'un autre servirait à écrire.
//
// ── Ce que cela ne garantit pas, et il faut le dire ──
//
// À l'intérieur d'une requête, l'instantané **ne voit pas** une écriture
// concurrente. Une décision peut donc se prendre sur un état vieux de quelques
// millisecondes.
//
// Ce n'est pas une régression — c'est exactement ce que le magasin par fichiers
// offrait, où rien ne se relisait au milieu d'un gestionnaire synchrone. Et cela
// ne met rien en péril, parce que **les écritures, elles, sont atomiques** :
// `modifier` relit la collection au moment d'écrire, et rejoue la transformation
// si quelqu'un est passé entre-temps. Une décision peut être prise sur un état
// d'un instant ; aucune écriture n'est perdue.
//
// ── Les lectures rendent l'instantané lui-même, non une copie ──
//
// Copier 45 fois par requête un objet de 25 Ko pour rien serait coûteux. Les
// appelants ne font que lire — vérifié —, et ceux qui écrivent passent par
// `modifier`, qui travaille sur ce que la base vient de rendre. Un contrôle de
// forme interdit de muter ce que ces lectures rendent.
const magasin = require('./magasin');

// Ce qui est tenu en mémoire, et le défaut de chacune. Le défaut compte : une
// collection absente doit se lire comme vide de la bonne forme, et non comme
// `undefined` — la moitié des appelants enchaînent aussitôt un `.filter`.
const SUIVIES = {
  users: () => [],
  referentiels: () => ({}),
  module_rights: () => ({}),
};

const etat = {};
let priseLe = null;

/**
 * Relit les trois collections. Appelée une fois par requête, au démarrage, et
 * après chaque écriture que nous faisons nous-mêmes.
 *
 * Les trois lectures partent ensemble : ce sont trois allers-retours vers la
 * même base, et les enchaîner tripleraient la latence de chaque requête.
 */
async function rafraichir() {
  const noms = Object.keys(SUIVIES);
  const valeurs = await Promise.all(noms.map((n) => magasin.load(n, SUIVIES[n]())));
  noms.forEach((n, i) => { etat[n] = valeurs[i]; });
  priseLe = Date.now();
  return etat;
}

/**
 * Une collection telle qu'elle était au dernier rafraîchissement. Synchrone.
 *
 * Avant le premier rafraîchissement, le défaut : jamais `undefined`. Un
 * démarrage qui servirait avant d'avoir lu rendrait des listes vides, ce qui est
 * déjà fâcheux — mais `undefined` ferait tomber les appelants sur un `.filter`,
 * et l'on chercherait la cause ailleurs.
 */
const lire = (nom) => (nom in etat ? etat[nom] : SUIVIES[nom]());

/** Quand l'instantané a été pris — `null` s'il ne l'a jamais été. */
const pris = () => priseLe;

/**
 * Lire-modifier-réécrire atomique. `transformer(valeur)` reçoit ce que la base
 * vient de rendre — **et non l'instantané** — et rend ce qu'il faut écrire. Il
 * peut être rejoué : il ne doit donc que calculer.
 *
 * L'instantané de cette collection est mis à jour avec ce qui a été écrit, de
 * sorte que la suite du gestionnaire lise ce qu'il vient de poser.
 */
async function modifier(nom, transformer) {
  const apres = await magasin.modifier(nom, SUIVIES[nom](), transformer);
  etat[nom] = apres;
  priseLe = Date.now();
  return apres;
}

/**
 * Remplace une collection entière. Réservé à l'amorçage, où il n'y a rien à
 * perdre : partout ailleurs, `modifier` est le geste juste — remplacer efface ce
 * qu'un autre a mis entre la lecture et l'écriture.
 */
async function remplacer(nom, valeur) {
  await magasin.save(nom, valeur);
  etat[nom] = valeur;
  priseLe = Date.now();
  return valeur;
}

/**
 * Les champs qu'un gestionnaire a réellement changés, entre l'enregistrement
 * qu'il a lu et celui qu'il a produit.
 *
 * C'est ce qui permet de reporter une modification sur la version que la base
 * porte **sans écraser ce qu'un autre y a écrit entre-temps**. Un gestionnaire
 * d'administration qui réécrirait l'enregistrement entier remettrait à zéro, par
 * exemple, le décompte de tentatives infructueuses qu'une connexion concurrente
 * vient d'incrémenter — et un compte cesserait de se bloquer.
 *
 * Un champ effacé est reporté comme `undefined` : il disparaît de l'écrit, ce
 * qui est bien ce qu'un `delete` demandait.
 */
function champsChanges(avant, apres) {
  const changes = {};
  const cles = new Set([...Object.keys(avant || {}), ...Object.keys(apres || {})]);
  for (const k of cles) {
    if (JSON.stringify((avant || {})[k]) !== JSON.stringify((apres || {})[k])) {
      changes[k] = (apres || {})[k];
    }
  }
  return changes;
}

module.exports = { rafraichir, lire, pris, modifier, remplacer, champsChanges, SUIVIES };
