// OASIS — l'instance regardée, partagée par les modules.
//
// OASIS s'installe une fois par État : chaque AAC tient la sienne et n'y écrit
// que ses propres dossiers ; `config/oasis.config.json` nomme celle qui tourne
// (`instance.etat`). Un déploiement de démonstration n'en héberge qu'une, si
// bien que les écrans ne montraient que ses données sans jamais le dire.
//
// La barre supérieure porte donc la liste des instances, comme « RAMP
// Inspections » porte celle des postes d'AAC : le super-administrateur y prend
// l'instance d'un État membre, ou les regarde toutes d'un coup — la vue
// régionale.
//
// Le choix est celui d'un compte, pas celui d'un module : il est rangé ici,
// dans data/instances.json, et non dans le magasin de chacun. Sans cela, un
// module en tiendrait une et son voisin une autre — « Exécution de la
// Surveillance », qui lit les plans de « Planification », déclencherait des
// activités d'un État depuis le poste d'un autre. Changer d'instance quelque
// part, c'est en changer partout.
//
// Chaque enregistrement porte l'instance sous laquelle il a été ouvert, et ce
// qui en dépend hérite du sien : un dossier de son activité, une constatation
// de son dossier, une mesure de sa carence. Ce qui a été écrit avant que ce
// champ n'existe n'en porte pas : cela revient à l'instance locale, la seule
// qui ait jamais écrit dans ces fichiers de données — les écrans montrent donc
// exactement ce qu'ils montraient.
const store = require('./store');
const referentiels = require('./referentiels');

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

const choix = () => (store.load('instances', {}) || {}).choix || {};

// Instance retenue par un compte. Aucun choix enregistré : l'instance locale —
// c'est chez elle que l'on travaille, et c'est ce que les écrans montraient
// déjà. Un choix enregistré vide est la vue régionale, demandée expressément.
function choisie(username, loadConfig) {
  const tous = choix();
  if (!Object.prototype.hasOwnProperty.call(tous, username)) return locale(loadConfig);
  return String(tous[username] || '');
}

// Instance sous laquelle une requête travaille. Seul le super-administrateur
// change de poste ; pour tout autre compte c'est l'instance locale, sans
// exception — le choix ne lui est pas offert, il ne saurait donc l'avoir fait,
// quoi qu'un enregistrement resté là raconte.
const courante = (user, loadConfig) => (!user || user.role !== 'SUPERADMIN'
  ? locale(loadConfig) : choisie(user.username, loadConfig));

function definir(username, valeur) {
  const v = String(valeur || '');
  const tout = store.load('instances', {}) || {};
  store.save('instances', {
    ...tout,
    choix: { ...(tout.choix || {}), [username]: v },
    date_maj: new Date().toISOString(),
  });
  return v;
}

// L'instance d'un enregistrement : celle qu'il porte, ou l'instance locale.
const de = (x, loadConfig) => String((x || {}).instance || '') || locale(loadConfig);

// Le tri appliqué aux listes. En vue régionale — instance retenue vide — rien
// n'est écarté : c'est tout le dispositif que l'on regarde.
//
// L'instance locale est lue une seule fois : `de` la relirait pour chaque
// rang, et la lire, c'est relire le fichier de configuration — un import de
// mille inspections en aurait fait mille lectures.
function filtrer(rangs, retenue, loadConfig) {
  if (!retenue) return rangs;
  const ici = locale(loadConfig);
  return rangs.filter((x) => (String((x || {}).instance || '') || ici) === retenue);
}

// ── Le référentiel tel qu'une instance le voit ──
// Ses collections propres — prestataires, inspecteurs, organisation,
// exigences — resserrées sur elle ; les collections communes intactes. C'est
// ce qui fait la différence entre une instance simulée et une vraie : le
// Togo n'a pas les organismes du Bénin dans ses listes déroulantes.
//
// À employer partout où une liste est servie à un écran. Les recherches par
// identifiant continuent de passer par `referentiels.getAll()` : un
// identifiant n'appartient qu'à une instance, le retrouver ne franchit
// aucune frontière.
function refs(user, loadConfig) {
  const tout = referentiels.getAll();
  const retenue = courante(user, loadConfig);
  if (!retenue) return tout;
  const vue = { ...tout };
  referentiels.COLLECTIONS_INSTANCE.forEach((c) => {
    vue[c] = filtrer(tout[c] || [], retenue, loadConfig);
  });
  return vue;
}

// Ce que la barre supérieure a besoin de savoir. Les instances ne sont servies
// qu'à qui peut en changer : les autres comptes lisent la leur.
const etat = (user, loadConfig) => {
  const superadmin = !!user && user.role === 'SUPERADMIN';
  return {
    disponible: superadmin,
    locale: locale(loadConfig),
    courante: courante(user, loadConfig),
    instances: superadmin ? liste(loadConfig) : [],
  };
};

module.exports = { locale, liste, courante, definir, de, filtrer, refs, etat };
