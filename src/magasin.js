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
const storePg = require('./store_pg');

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
const MIGREES = new Set([
  'ramp_aeronefs',
  'emails',
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
async function modifier(nom, defaut, transformer) {
  if (surBase(nom)) return base().modifier(nom, defaut, transformer);
  return enFile(nom, async () => {
    const suivante = await transformer(store.load(nom, defaut));
    store.save(nom, suivante);
    return suivante;
  });
}

async function fermer() {
  if (socle && socle.fermer) await socle.fermer();
  socle = null;
  ouvert = false;
}

module.exports = { load, save, modifier, preparer, surBase, fermer, MIGREES };
