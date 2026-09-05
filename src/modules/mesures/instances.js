// Module « Mesures d'Application » — instances et vue régionale.
//
// OASIS s'installe une fois par État : chaque AAC tient la sienne et n'y écrit
// que ses propres carences ; `config/oasis.config.json` nomme celle qui tourne
// (`instance.etat`). Le déploiement de démonstration n'en héberge qu'une, si
// bien que les menus « Carences » et « Mesures » ne montraient que ses données
// sans jamais le dire.
//
// La barre supérieure porte donc la liste des instances, comme « RAMP
// Inspections » porte celle des postes d'AAC : le super-administrateur y prend
// l'instance d'un État membre, ou les regarde toutes d'un coup — la vue
// régionale. Le choix se garde par compte et survit au rechargement.
//
// Une carence relevée ici, une mesure prise ici portent l'instance sous
// laquelle elles ont été ouvertes. Ce qui a été écrit avant que ce champ
// n'existe n'en porte pas : cela revient à l'instance locale, la seule qui ait
// jamais écrit dans ce fichier de données.
const db = require('./store');

// États membres de l'UEMOA, à défaut de liste au fichier de configuration.
const ETATS_UEMOA = ['Bénin', 'Burkina Faso', "Côte d'Ivoire", 'Guinée-Bissau',
  'Mali', 'Niger', 'Sénégal', 'Togo'];

const config = (loadConfig) => (typeof loadConfig === 'function' ? (loadConfig() || {}) : {});

// L'instance qui tourne ici. Une configuration muette la laisse vide : rien
// n'est alors cloisonné, et les écrans se comportent comme avant.
const locale = (loadConfig) => String((config(loadConfig).instance || {}).etat || '').trim();

// Instances connues : celles que la configuration déclare, à défaut les États
// membres. L'instance locale en fait toujours partie, fût-elle absente.
function liste(loadConfig) {
  const inst = config(loadConfig).instance || {};
  const declarees = Array.isArray(inst.etatsMembres) ? inst.etatsMembres : ETATS_UEMOA;
  const noms = declarees.map((e) => String(e || '').trim()).filter(Boolean);
  const ici = locale(loadConfig);
  if (ici && !noms.includes(ici)) noms.push(ici);
  return [...new Set(noms)].sort((a, b) => a.localeCompare(b, 'fr'));
}

// Instance retenue par un compte. Aucun choix enregistré : l'instance locale —
// c'est chez elle que l'on travaille, et c'est ce que les écrans montraient
// déjà. Un choix enregistré vide est la vue régionale, demandée expressément.
function choisie(username, loadConfig) {
  const rec = db.get('vues', username);
  if (!rec || rec.instance === undefined) return locale(loadConfig);
  return String(rec.instance || '');
}

// Instance sous laquelle une requête travaille. Seul le super-administrateur
// change de poste ; pour tout autre compte, c'est l'instance locale, sans
// exception — le choix ne lui est pas offert, il ne saurait donc l'avoir fait.
function courante(user, loadConfig) {
  if (!user || user.role !== 'SUPERADMIN') return locale(loadConfig);
  return choisie(user.username, loadConfig);
}

function definir(username, valeur) {
  const rec = { id: username, instance: String(valeur || ''), date_maj: db.now() };
  if (db.get('vues', username)) db.update('vues', username, rec);
  else db.insert('vues', rec);
  return rec.instance;
}

// L'instance d'un enregistrement, celle qu'il porte ou l'instance locale.
const de = (x, loadConfig) => String((x || {}).instance || '') || locale(loadConfig);

// Le tri appliqué aux listes. En vue régionale — instance retenue vide — rien
// n'est écarté : c'est tout le dispositif que l'on regarde.
const filtrer = (rangs, retenue, loadConfig) => (!retenue ? rangs
  : rangs.filter((x) => de(x, loadConfig) === retenue));

module.exports = { locale, liste, courante, definir, de, filtrer };
