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
//
// Deux options, parce que les modules ne tiennent pas tous leurs enregistrements
// de la même façon et que **changer leur forme en passant n'est pas une
// conversion, c'est une migration de données** :
//
//   · `identifiantParLeMagasin` — `insert` tire l'identifiant et le pose en
//     dernier, pour qu'un `id` venu du client ne le choisisse pas. « Mesures
//     d'Application » le tire lui-même, avec un préfixe parlant (`mes_`, `cst_`),
//     avant d'insérer : l'option l'en laisse maître ;
//   · `horodater` — `insert` pose `createdAt`, `update` pose `updatedAt`. Les
//     mesures d'application portent leurs propres dates, nommées autrement.
function magasinDeModule(nom, { identifiantParLeMagasin = true, horodater = true } = {}) {
  const load = () => magasin.load(nom, {});
  const save = (d) => magasin.save(nom, d);
  const transformer = (fn) => magasin.modifier(nom, {}, fn);

  // ── Retirer sans détruire ──
  //
  // Certains enregistrements fondent ce qu'un **autre module** a décidé. Une
  // constatation de la surveillance, un écart relevé sur aire de trafic : les
  // « Mesures d'Application » y rattachent des mesures, des classements, des
  // traitements. Les détruire laisserait une sanction sans l'écart qui la fonde.
  //
  // Les modules sources demandaient donc à CARE, avant de supprimer, s'il avait
  // bâti quelque chose. **Cette question ne protège plus rien depuis que le bus
  // est asynchrone** : entre la question et la suppression, CARE peut avoir
  // prononcé une mesure. Et la fenêtre ne se ferme pas par une transaction — la
  // vérification lit les données d'un module, l'effacement écrit celles d'un autre.
  //
  // D'où ce geste, décidé par la maîtrise d'ouvrage le 3 octobre 2026 : **on
  // marque au lieu d'effacer**. L'enregistrement porte `retire_le`, disparaît de
  // toutes les listes, et ne se détruit pas. La fenêtre existe toujours ; elle ne
  // fait plus de dégât, parce qu'il ne s'y passe plus rien d'irréversible.
  //
  // C'est aussi ce que dit déjà la politique de conservation (`src/retention.js`)
  // de ces collections : « conserver » — « un logiciel qui effacerait de lui-même
  // un acte de surveillance serait une faute, non une fonctionnalité ».
  const estRetire = (r) => !!(r && r.retire_le);

  // Marquer un enregistrement retiré, dans l'état qu'on écrit. Pure : une route
  // la compose avec le reste de son geste.
  const marquerRetire = (d, coll, predicat, par) => {
    const liste = d[coll] || [];
    let marques = 0;
    liste.forEach((r, i) => {
      if (estRetire(r) || !predicat(r)) return;
      liste[i] = { ...r, retire_le: new Date().toISOString(), retire_par: par || '' };
      marques += 1;
    });
    d[coll] = liste;
    return marques;
  };

  // Marquer un enregistrement retiré, pour qui n'a que ce geste à faire.
  async function retirer(coll, id, par) {
    let marques = 0;
    await transformer((d) => {
      marques = marquerRetire(d, coll, (r) => r.id === id, par);
      return marques ? d : magasin.INCHANGE;
    });
    return marques > 0;
  }

  // Les lectures ignorent ce qui est retiré. **Une seule règle, et rien à
  // déclarer collection par collection** : un enregistrement sans `retire_le`
  // n'est pas concerné, donc rien ne change pour les collections qui n'en portent
  // pas. Une règle qu'on peut oublier de poser ne garde rien — c'est la leçon du
  // garde-fou qui avait cessé de couvrir « Mesures d'Application » en silence.
  //
  // `listTout` voit tout, et il faut dire qui en a besoin : la politique de
  // conservation, qui compte ce qui existe ; et les contrats du bus, parce qu'un
  // autre module peut avoir bâti sur ce qu'on vient de retirer — lui cacher le
  // fondement de sa propre décision serait le pire des deux maux.
  const listTout = async (coll) => (await load())[coll] || [];
  const list = async (coll) => (await listTout(coll)).filter((r) => !estRetire(r));
  const get = async (coll, id) => (await list(coll)).find((r) => r.id === id) || null;
  const getTout = async (coll, id) => (await listTout(coll)).find((r) => r.id === id) || null;

  // L'identifiant est posé par le magasin, jamais par l'appelant : placé avant
  // l'enregistrement, un `id` venu du client l'écrasait — il pouvait ainsi
  // choisir sous quelle clé sa création allait vivre.
  async function insert(coll, item) {
    const rec = {
      ...(horodater ? { createdAt: new Date().toISOString() } : {}),
      ...item,
      ...(identifiantParLeMagasin ? { id: uid() } : {}),
    };
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
      arr[i] = {
        ...arr[i], ...patch, id,
        ...(horodater ? { updatedAt: new Date().toISOString() } : {}),
      };
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
    estRetire, marquerRetire, retirer,
    load, save, transformer,
    list, getColl: list, get, listTout, getTout, insert, update, remove, removeWhere,
  };
}

module.exports = { magasinDeModule, uid };
