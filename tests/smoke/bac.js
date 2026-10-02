// OASIS — Le bac à sable du processus de contrôle.
//
// ── Ce que ce fichier existe pour empêcher ──
//
// `src/store.js` **fige son répertoire de données à l'import** : `OASIS_DATA_DIR`
// est lu une fois, et plus jamais. Un module du socle chargé avant que la variable
// soit posée sert donc le vrai `data/` pour toute la durée du processus.
//
// C'est arrivé, et cela a **détruit `data/users.json`** — neuf comptes remplacés
// par un compte d'essai sans mot de passe, et plus personne ne pouvait se
// connecter. Le mécanisme, en trois pas :
//
//   1. `tests/smoke/index.js` construit sa liste de suites avec des `require`.
//      Toutes les suites sont donc chargées, y compris pour un passage filtré ;
//   2. `ramp.smoke.js` requiert `src/modules/ramp/vues`, qui tire `src/store` —
//      le répertoire est figé sur le vrai `data/` ;
//   3. plus tard, `unitaires.smoke.js` posait `OASIS_DATA_DIR` sur un bac
//      temporaire. **Sans aucun effet** : le répertoire était figé depuis
//      longtemps. Son contrôle de l'annuaire écrivait donc dans le vrai fichier.
//
// L'affectation d'`unitaires` était juste en apparence — un commentaire au-dessus
// affirmait même la règle qu'elle enfreignait d'une ligne.
//
// ── Pourquoi un module, et non trois lignes en tête du lanceur ──
//
// Parce que l'ordre doit être **tenu par le graphe des `require`**, et non par la
// place d'une instruction que le prochain déplacement de ligne défera. Qui a
// besoin du bac le requiert ; qui le requiert l'obtient déjà posé.
//
// Et parce qu'un verrou vaut mieux qu'une règle : si `src/store` est déjà chargé
// quand ce fichier s'exécute, il **refuse de continuer** plutôt que de laisser le
// processus écrire dans les données de travail. Le message dit quoi faire.
const fs = require('fs');
const os = require('os');
const path = require('path');

const RACINE = path.join(__dirname, '..', '..');
const DONNEES_DE_TRAVAIL = path.join(RACINE, 'data');

// Le verrou. `require.cache` dit la vérité, qu'on l'ait voulue ou non.
const dejaCharge = Object.keys(require.cache)
  .filter((k) => k.startsWith(path.join(RACINE, 'src') + path.sep));
if (dejaCharge.length) {
  const noms = dejaCharge.map((k) => path.relative(RACINE, k)).slice(0, 6);
  throw new Error(
    'tests/smoke/bac.js chargé trop tard : '
    + `${dejaCharge.length} module(s) du socle le précèdent (${noms.join(', ')}).\n`
    + '  `src/store.js` fige son répertoire de données à l’import : ces modules '
    + 'servent donc déjà le vrai `data/`, et les contrôles y écriraient.\n'
    + '  Remède : requérir `./bac` avant tout `require` d’un module de `src/` — '
    + 'en tête de tests/smoke/index.js, avant la liste des suites.',
  );
}

const BAC = fs.mkdtempSync(path.join(os.tmpdir(), 'oasis-smoke-'));
process.env.OASIS_DATA_DIR = BAC;

// Ce que les suites écrivent en processus va là, et nulle part ailleurs. Les
// serveurs qu'elles lancent, eux, reçoivent leur propre répertoire par
// l'environnement de leur processus fils (`harness.js`).
function effacer() {
  try { fs.rmSync(BAC, { recursive: true, force: true }); } catch { /* déjà parti */ }
}

module.exports = { BAC, DONNEES_DE_TRAVAIL, effacer };
