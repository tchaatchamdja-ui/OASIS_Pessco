// OASIS — Le magasin d'un module, en base (ADR-002, jalon n° 13).
//
// Les cinq modules métier rangent leurs données de la même façon : une
// collection du magasin par module, contenant des tableaux d'enregistrements
// sous des clés — `plans`, `activites`, `evaluations`… Et ils les manipulent avec
// le même vocabulaire : `list`, `get`, `insert`, `update`, `remove`.
//
// Ce fichier porte ce vocabulaire **une fois**. Écrit cinq fois, il aurait fallu
// tenir d'accord cinq copies de la même subtilité ; or la subtilité est réelle, et
// elle a coûté trois défauts au premier module converti.
//
// ── Ce que `transformer` existe pour empêcher ──
//
// Presque tous ces appels lisent la collection, y changent une ligne et la
// réécrivent. Sur fichiers, le geste était sûr sans que rien ne le dise :
// `store.load` et `store.save` sont **synchrones**, donc rien ne s'intercalait.
// Traduit en `await load()` … `await save()`, deux requêtes du même processus se
// perdent l'une l'autre — une régression de correction, non un coût de portage.
//
// `transformer` rend le geste atomique dans les deux régimes : par `rev` comparé
// en base, par une file d'attente par collection sur fichiers.
//
// ── Et pourquoi il est exposé, non seulement employé ──
//
// Un geste du métier en vaut souvent plusieurs d'ici. Valider un plan, c'est
// poser son statut, reporter les avis saisis activité par activité, retirer les
// versions qu'il remplace, **et** inscrire la décision au circuit — jusqu'à une
// dizaine d'écritures. Entre elles, l'application montre des états que personne
// n'a voulus : un plan validé dont le circuit ne porte pas la validation, une
// version retirée sans que rien ne dise pourquoi. Un échec au milieu les y laisse.
//
// Les routes composent donc leur geste dans **une seule** transformation, et
// c'est `transformer` qui le permet. Les quatre mutateurs ci-dessous ne sont que
// le cas simple.
//
// ── Ce qu'un transformateur ne doit pas faire ──
//
// Il peut être **rejoué** si quelqu'un écrit entre-temps. Il ne doit donc que
// calculer : pas d'inscription au journal, pas d'envoi de courriel, pas de
// réponse HTTP. Et ce qu'il doit rendre à l'appelant — l'enregistrement créé, un
// refus — se pose dans une variable réaffectée à chaque essai, lue après.
//
// Un identifiant se tire **hors** de la transformation : tiré dedans, il
// changerait d'un essai à l'autre, et l'appelant rendrait un `id` que la base ne
// porte pas.
const crypto = require('crypto');
const magasin = require('./magasin');

const uid = () => crypto.randomBytes(8).toString('hex');

// `nom` est la collection du magasin — celle que `src/magasin.js` nomme dans sa
// liste d'autorisation, et qui décide du régime, fichier ou base.
function magasinDeModule(nom) {
  const load = () => magasin.load(nom, {});
  const save = (d) => magasin.save(nom, d);
  const transformer = (fn) => magasin.modifier(nom, {}, fn);

  const list = async (coll) => (await load())[coll] || [];
  const get = async (coll, id) => (await list(coll)).find((r) => r.id === id) || null;

  // L'identifiant est posé par le magasin, jamais par l'appelant : placé avant
  // l'enregistrement, un `id` venu du client l'écrasait — il pouvait ainsi
  // choisir sous quelle clé sa création allait vivre.
  async function insert(coll, item) {
    const rec = { createdAt: new Date().toISOString(), ...item, id: uid() };
    await transformer((d) => {
      d[coll] = d[coll] || [];
      d[coll].push(rec);
      return d;
    });
    return rec;
  }

  async function update(coll, id, patch) {
    let apres = null;
    await transformer((d) => {
      const arr = d[coll] || [];
      const i = arr.findIndex((r) => r.id === id);
      apres = null;
      if (i < 0) return magasin.INCHANGE;
      arr[i] = { ...arr[i], ...patch, id, updatedAt: new Date().toISOString() };
      apres = arr[i];
      return d;
    });
    return apres;
  }

  async function remove(coll, id) {
    let ote = false;
    await transformer((d) => {
      const arr = d[coll] || [];
      const i = arr.findIndex((r) => r.id === id);
      ote = i >= 0;
      if (!ote) return magasin.INCHANGE;
      arr.splice(i, 1);
      return d;
    });
    return ote;
  }

  async function removeWhere(coll, predicat) {
    let otes = 0;
    await transformer((d) => {
      const avant = (d[coll] || []).length;
      const reste = (d[coll] || []).filter((r) => !predicat(r));
      otes = avant - reste.length;
      if (!otes) return magasin.INCHANGE;
      d[coll] = reste;
      return d;
    });
    return otes;
  }

  return {
    NOM: nom, uid, INCHANGE: magasin.INCHANGE,
    load, save, transformer,
    list, getColl: list, get, insert, update, remove, removeWhere,
  };
}

module.exports = { magasinDeModule, uid };
