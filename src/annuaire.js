// OASIS — L'annuaire des comptes : la vue « users » de l'instantané.
//
// Ce fichier portait la mécanique de l'instantané quand une seule collection en
// avait besoin. `referentiels` et `module_rights` relèvent du même cas — lus
// depuis des prédicats synchrones —, et trois mécaniques pour une seule idée en
// auraient fait trois à tenir d'accord.
//
// La mécanique vit donc dans `src/instantane.js`, qui dit le compromis et ce
// qu'il ne garantit pas. Il reste ici le nom des comptes, parce que c'est sous ce
// nom que `src/auth.js` le lit et que les contrôles l'éprouvent.
const instantane = require('./instantane');

const NOM = 'users';

/** Relit **les trois** collections tenues en mémoire, dont l'annuaire. */
const rafraichir = async () => (await instantane.rafraichir())[NOM];

/** L'annuaire tel qu'il était au dernier rafraîchissement. Synchrone. */
const comptes = () => instantane.lire(NOM);

/** Quand l'instantané a été pris — `null` s'il ne l'a jamais été. */
const pris = () => instantane.pris();

/** Lire-modifier-réécrire atomique sur l'annuaire. */
const modifier = (transformer) => instantane.modifier(NOM, transformer);

/** Remplace l'annuaire entier. Réservé à l'amorçage. */
const remplacer = (comptesNeufs) => instantane.remplacer(NOM, comptesNeufs);

module.exports = {
  rafraichir,
  comptes,
  pris,
  modifier,
  remplacer,
  champsChanges: instantane.champsChanges,
  NOM,
};
