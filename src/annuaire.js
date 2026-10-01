// OASIS — L'annuaire des comptes, pris en instantané une fois par requête.
//
// ── Pourquoi `getUsers()` reste synchrone ──
//
// Les cinq autres collections basculées en base ont été converties en rendant
// asynchrone ce qui les lit. Pour `users`, ce chemin aurait été une faute.
//
// Mesuré avant de choisir : `getUsers()` et `findUser()` sont appelés depuis des
// **prédicats de rôle synchrones** — `compteA`, `canRead`, `canContribute` —
// eux-mêmes employés dans 101 appels et 545 chaînes de tableau à travers les six
// modules. Les rendre asynchrones aurait transformé chaque
// `liste.filter(canRead)` en `await Promise.all(liste.map(…))`. Ce n'aurait plus
// été un portage mais une réécriture de la couche module, et le résultat se
// lirait beaucoup plus mal pour une donnée qu'on lit constamment et qu'on écrit
// une fois par semaine.
//
// ── L'instantané, et quand il est pris ──
//
// L'annuaire est donc tenu en mémoire, et **rafraîchi une fois par requête**, au
// seul endroit déjà asynchrone où le compte est de toute façon résolu :
// `requireAuth`. Les lectures restent synchrones, et toutes celles d'une même
// requête voient le même annuaire.
//
// C'est une garantie **plus forte** que celle d'avant, non plus faible : avec un
// magasin asynchrone, deux `getUsers()` d'un même gestionnaire pourraient sinon
// rendre des listes différentes, et une décision se prendrait sur l'une pendant
// qu'une autre servirait à écrire.
//
// ── Ce que cela ne garantit pas, et il faut le dire ──
//
// À l'intérieur d'une requête, l'instantané **ne voit pas** une écriture
// concurrente. Une décision peut donc se prendre sur un annuaire vieux de
// quelques millisecondes.
//
// Ce n'est pas une régression — c'est exactement ce que le magasin par fichiers
// offrait, où rien ne se relisait au milieu d'un gestionnaire synchrone. Et cela
// ne met rien en péril, parce que **les écritures, elles, sont atomiques** :
// `modifier` relit l'annuaire au moment d'écrire, et rejoue la transformation si
// quelqu'un est passé entre-temps. Une décision peut être prise sur une donnée
// d'un instant ; aucune écriture n'est perdue.
const magasin = require('./magasin');

const NOM = 'users';

// L'instantané. `pris` dit quand, ce que la sonde de santé rend lisible.
let etat = { comptes: [], pris: null };

/**
 * Relit l'annuaire. Appelée une fois par requête, au démarrage, et après chaque
 * écriture que nous faisons nous-mêmes.
 */
async function rafraichir() {
  const comptes = await magasin.load(NOM, []);
  etat = { comptes: Array.isArray(comptes) ? comptes : [], pris: Date.now() };
  return etat.comptes;
}

/** L'annuaire tel qu'il était au dernier rafraîchissement. Synchrone. */
const comptes = () => etat.comptes;

/** Quand l'instantané a été pris — `null` s'il ne l'a jamais été. */
const pris = () => etat.pris;

/**
 * Lire-modifier-réécrire atomique sur l'annuaire. `transformer(comptes)` reçoit
 * l'annuaire que la base vient de rendre — **et non l'instantané** — et rend
 * celui à écrire. Il peut être rejoué : il ne doit donc que calculer.
 *
 * L'instantané est rafraîchi avec ce qui a été écrit, de sorte que la suite du
 * gestionnaire lise ce qu'il vient de poser.
 */
async function modifier(transformer) {
  const apres = await magasin.modifier(NOM, [], transformer);
  etat = { comptes: Array.isArray(apres) ? apres : [], pris: Date.now() };
  return etat.comptes;
}

/**
 * Remplace l'annuaire entier. Réservé à l'amorçage, où il n'y a rien à perdre :
 * partout ailleurs, `modifier` est le geste juste — remplacer une liste entière
 * efface ce qu'un autre y a mis entre la lecture et l'écriture.
 */
async function remplacer(comptesNeufs) {
  await magasin.save(NOM, comptesNeufs);
  etat = { comptes: comptesNeufs, pris: Date.now() };
  return comptesNeufs;
}

/**
 * Les champs qu'un gestionnaire a réellement changés, entre l'enregistrement
 * qu'il a lu et celui qu'il a produit.
 *
 * <p>C'est ce qui permet de reporter une modification sur la version que la base
 * porte **sans écraser ce qu'un autre y a écrit entre-temps**. Un gestionnaire
 * d'administration qui réécrirait l'enregistrement entier remettrait à zéro, par
 * exemple, le décompte de tentatives infructueuses qu'une connexion concurrente
 * vient d'incrémenter — et un compte cesserait de se bloquer.
 *
 * Un champ effacé est reporté comme `undefined` : il disparaît de l'écrit, ce qui
 * est bien ce qu'un `delete` demandait.
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

module.exports = { rafraichir, comptes, pris, modifier, remplacer, champsChanges, NOM };
