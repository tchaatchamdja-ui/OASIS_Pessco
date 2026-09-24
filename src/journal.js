// OASIS — Support des journaux d'audit : une entrée par ligne, en ajout seul.
//
// Un journal ne fait que croître, et chaque acte de surveillance y ajoute une
// ligne. Il était rangé comme le reste — un tableau JSON réécrit en entier à
// chaque ajout : 555 Ko relus, réindentés et réécrits pour une ligne de plus,
// soit 2 ms de boucle d'évènements bloquée par geste, et davantage chaque
// semaine. Node n'ayant qu'un fil, tout le monde attendait.
//
// Ici, une entrée par ligne (JSON Lines) : l'ajout ne relit ni ne réécrit ce
// qui précède, et coûte le même temps au bout de dix ans qu'au premier jour.
// La lecture reste rare — l'écran d'audit, la vérification d'une chaîne — et
// peut se permettre de tout relire.
//
// Le format fait aussi ce que le précédent promettait : le fichier n'est
// jamais réécrit, seulement complété.
//
// Ce support ignore ce qu'une entrée contient. La forme héritée — un tableau
// pour le socle, un objet par module pour les modules — est convertie par
// celui qui la connaît (src/audit.js, src/module_audit.js).
const fs = require('fs');
const path = require('path');

const DATA_DIR = () => process.env.OASIS_DATA_DIR || path.join(__dirname, '..', 'data');

const chemin = (nom) => path.join(DATA_DIR(), `${nom}.jsonl`);
// Le tableau JSON d'avant. Il n'est pas supprimé par la reprise : il reste
// comme témoin, et rien ne le relit une fois le journal en lignes écrit.
const cheminHerite = (nom) => path.join(DATA_DIR(), `${nom}.json`);

// Cache mémoire des entrées lues, invalidé quand le fichier change de taille
// ou de date — deux processus servant le même répertoire ne s'aveuglent pas.
const cache = new Map();

function etat(f) {
  try {
    const st = fs.statSync(f);
    return `${st.size}:${st.mtimeMs}`;
  } catch { return ''; }
}

const converti = (nom) => !!etat(chemin(nom));

// Les entrées d'un journal, de la plus ancienne à la plus récente. Une ligne
// illisible est ignorée plutôt que de faire échouer la lecture entière : elle
// rompra la chaîne, ce que la vérification dira — c'est son rôle, pas celui
// de la lecture.
function lire(nom) {
  const f = chemin(nom);
  const marque = etat(f);
  if (!marque) return [];
  const enCache = cache.get(nom);
  if (enCache && enCache.marque === marque) return enCache.entrees;
  const entrees = [];
  for (const ligne of fs.readFileSync(f, 'utf-8').split('\n')) {
    if (!ligne.trim()) continue;
    try { entrees.push(JSON.parse(ligne)); } catch { /* ligne abîmée */ }
  }
  cache.set(nom, { marque, entrees });
  return entrees;
}

// Le contenu hérité, tel quel — tableau ou objet, selon le journal. `null`
// quand il n'y en a pas.
function lireHerite(nom) {
  try {
    return JSON.parse(fs.readFileSync(cheminHerite(nom), 'utf-8'));
  } catch { return null; }
}

// Ajout d'une entrée. `appendFileSync` ouvre en mode « a » : le noyau écrit à
// la fin du fichier, sans que le processus ait à connaître sa taille.
function ajouter(nom, entree) {
  const dossier = DATA_DIR();
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  const entrees = lire(nom);
  fs.appendFileSync(chemin(nom), `${JSON.stringify(entree)}\n`);
  entrees.push(entree);
  cache.set(nom, { marque: etat(chemin(nom)), entrees });
}

// Écrit un journal entier. Réservé à la reprise du format : une entrée déjà
// inscrite n'est jamais réécrite par l'application.
function ecrireTout(nom, entrees) {
  const dossier = DATA_DIR();
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  const tmp = `${chemin(nom)}.tmp`;
  const corps = entrees.map((e) => JSON.stringify(e)).join('\n');
  fs.writeFileSync(tmp, entrees.length ? `${corps}\n` : '');
  fs.renameSync(tmp, chemin(nom));
  cache.delete(nom);
}

module.exports = { lire, lireHerite, ajouter, ecrireTout, converti, chemin, cheminHerite };
