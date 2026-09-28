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

// Instances ouvertes après coup par le super-administrateur régional. Le
// fichier de configuration déclare les États membres à l'installation ; le
// dispositif s'étend ensuite sans y toucher — une AAC qui rejoint l'Union,
// une instance d'essai.
const ajoutees = () => ((store.load('instances', {}) || {}).ajoutees || [])
  .map((e) => String(e || '').trim()).filter(Boolean);

// Instances retirées du dispositif. Le fichier de configuration déclare les
// États membres à l'installation et le socle ne le réécrit pas : supprimer une
// instance déclarée, c'est la retenir ici.
const retirees = () => ((store.load('instances', {}) || {}).retirees || [])
  .map((e) => String(e || '').trim()).filter(Boolean);

// Instances connues : celles que la configuration déclare — à défaut les États
// membres —, celles ouvertes depuis, et l'instance locale, qui en fait
// toujours partie, fût-elle absente des deux.
function liste(loadConfig) {
  const inst = config(loadConfig).instance || {};
  const declarees = Array.isArray(inst.etatsMembres) ? inst.etatsMembres : ETATS_UEMOA;
  const noms = declarees.map((e) => String(e || '').trim()).filter(Boolean)
    .concat(ajoutees());
  const hors = new Set(retirees());
  const ici = locale(loadConfig);
  const restantes = noms.filter((n) => !hors.has(n));
  // L'instance installée ici ne se retire pas : le déploiement tourne pour elle.
  if (ici && !restantes.includes(ici)) restantes.push(ici);
  return [...new Set(restantes)].sort((a, b) => a.localeCompare(b, 'fr'));
}

// Instances mises en sommeil. Une instance désactivée reste dans le
// dispositif — ses données ne sont pas touchées — mais elle ne se prend plus
// en barre supérieure, et ses comptes ne se connectent plus. C'est le geste
// réversible ; la suppression, elle, ne l'est pas.
const desactivees = () => ((store.load('instances', {}) || {}).desactivees || [])
  .map((e) => String(e || '').trim()).filter(Boolean);

const estActive = (nom) => !desactivees().includes(String(nom || '').trim());

// L'instance installée ici ne se désactive ni ne se supprime : le déploiement
// tourne pour elle, et la fermer fermerait l'application sur elle-même.
function basculerActivite(nom, loadConfig) {
  const n = String(nom || '').trim();
  if (!n || !liste(loadConfig).includes(n)) return { error: 'instance_inconnue' };
  if (n === locale(loadConfig)) return { error: 'instance_locale' };
  const tout = store.load('instances', {}) || {};
  const off = new Set(tout.desactivees || []);
  const active = off.has(n);
  if (active) off.delete(n); else off.add(n);
  store.save('instances', { ...tout, desactivees: [...off], date_maj: new Date().toISOString() });
  return { instance: n, active };
}

// Ouvre une instance. Elle part vide : ni organismes, ni inspecteurs, ni
// nomenclatures — c'est son super-administrateur national qui la garnira.
function ouvrir(nom, loadConfig) {
  const n = String(nom || '').trim();
  if (!n || n.length > 60) return { error: 'nom_invalide' };
  if (liste(loadConfig).includes(n)) return { error: 'instance_existe' };
  const tout = store.load('instances', {}) || {};
  store.save('instances', {
    ...tout,
    ajoutees: [...(tout.ajoutees || []), n],
    date_maj: new Date().toISOString(),
  });
  return { instance: n };
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

// ── Deux portées de super-administration ──
// Le super-administrateur régional administre le dispositif entier : c'est lui
// qui prend le poste d'une instance en barre supérieure, ou les regarde toutes.
// Le super-administrateur national n'administre que la sienne — celle de son
// compte — et n'a donc aucun choix à faire : la barre se contente de la nommer.
//
// Un compte dont la portée n'est pas déclarée est régional. C'est ce qu'était
// tout super-administrateur avant que la distinction n'existe ; le rendre
// national d'office enfermerait le seul compte capable de désigner les autres.
const PORTEES = ['regionale', 'nationale'];

const portee = (user) => (String((user || {}).portee || '') === 'nationale'
  ? 'nationale' : 'regionale');

const estSuperadmin = (user) => !!user && user.role === 'SUPERADMIN';

// Qui peut changer d'instance, et lui seul.
const estRegional = (user) => estSuperadmin(user) && portee(user) === 'regionale';

// Instance sous laquelle une requête travaille.
//   — super-administrateur régional : celle qu'il a prise en barre supérieure,
//     à défaut l'instance installée ici ; vide, c'est la vue régionale ;
//   — tout autre compte, super-administrateur national compris : celle de son
//     propre compte. Le choix ne lui est pas offert, il ne saurait donc l'avoir
//     fait, quoi qu'un enregistrement resté là raconte.
const courante = (user, loadConfig) => (estRegional(user)
  ? choisie(user.username, loadConfig)
  : (String((user || {}).instance || '') || locale(loadConfig)));

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

// Les comptes d'une instance, tels qu'un écran d'administration les montre.
// Un compte ordinaire appartient à l'AAC qui l'a ouvert ; le
// super-administrateur régional, lui, n'appartient à aucune en particulier :
// il les administre toutes. Il figure donc dans la liste de chacune, et non
// dans la seule vue régionale — d'où il était, sinon, le seul à se voir.
//
// `estRegional` est appelé par rang, mais ne lit que le compte lui-même :
// aucune lecture de fichier ne s'y cache.
function utilisateursDe(users, retenue, loadConfig) {
  if (!retenue) return users;
  const ici = locale(loadConfig);
  return users.filter((u) => estRegional(u)
    || (String((u || {}).instance || '') || ici) === retenue);
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
  // La taxinomie est commune, mais chaque élément peut n'être offert qu'à
  // certaines instances : ce qui ne l'est pas ici disparaît des listes, donc
  // des filtres et des écrans des modules. La restriction suit les
  // rattachements — un secteur ne survit pas à son domaine.
  const vus = referentiels.idsVisibles(retenue);
  referentiels.COLLECTIONS_VISIBILITE.forEach((c) => {
    vue[c] = (tout[c] || []).filter((r) => vus[c].has(r.id));
  });
  return vue;
}

// ── Identité de l'autorité, par instance ──
// « Détails sur l'Administration » : le nom de l'AAC, son sigle, son bigramme,
// sa ville, ses adresses, son logo. Chaque État a la sienne, et elle se lit
// partout — en-tête des rapports, composition des références, bandeau des
// modules.
//
// Le fichier de configuration porte celle de l'instance installée ici ; les
// autres sont tenues dans le magasin du socle. Une instance qu'on n'a pas
// encore renseignée se présente vide, sous le seul nom de son État : lui
// prêter l'identité de l'AAC voisine ferait signer ses rapports par une
// autorité qui n'en est pas l'auteur.
const CHAMPS_AAC = ['nom', 'sigle', 'etat', 'bigramme', 'pays', 'ville',
  'adresse1', 'adresse2', 'emailAdmin', 'logo'];

const identites = () => (store.load('instances', {}) || {}).aac || {};

function aacDe(instance, loadConfig) {
  const cfg = config(loadConfig);
  const propre = identites()[instance] || null;
  // Vue régionale, ou instance installée ici : l'AAC du fichier de
  // configuration, complétée de ce qui a pu être saisi depuis.
  if (!instance || instance === locale(loadConfig)) {
    return { ...(cfg.aac || {}), ...(propre || {}) };
  }
  return propre ? { ...propre } : { etat: instance };
}

const aac = (user, loadConfig) => aacDe(courante(user, loadConfig), loadConfig);

// Enregistre l'identité d'une instance autre que celle installée ici. Celle de
// l'instance locale reste au fichier de configuration, avec le reste de son
// paramétrage.
function definirAac(instance, patch) {
  const tout = store.load('instances', {}) || {};
  const avant = (tout.aac || {})[instance] || {};
  const suite = { ...avant };
  CHAMPS_AAC.forEach((k) => { if (typeof patch[k] === 'string') suite[k] = patch[k]; });
  suite.etat = suite.etat || instance;
  store.save('instances', {
    ...tout,
    aac: { ...(tout.aac || {}), [instance]: suite },
    date_maj: new Date().toISOString(),
  });
  return suite;
}

// Éléments d'une collection de la taxinomie que l'instance regardée voit. À
// employer quand la liste a déjà été mise en forme et ne peut plus passer par
// `refs` ; le rapprochement se fait sur l'identifiant.
function visibles(rangs, coll, user, loadConfig) {
  const retenue = courante(user, loadConfig);
  if (!retenue) return rangs;
  const vus = referentiels.idsVisibles(retenue)[coll];
  return vus ? rangs.filter((r) => vus.has(r.id)) : rangs;
}

// ── Ce qu'une instance porte ──
// Référentiels et comptes se comptent ici ; les modules comptent eux-mêmes ce
// qu'ils tiennent et le publient au bus. Le socle ne lit pas leurs données —
// il leur demande.
// Asynchrone depuis l'étape A d'ADR-002 : `volumeParInstance` est publié par
// chacun des six modules, et un module dont une collection passe en base rend
// un compte par le réseau. C'est le seul point du socle que **tous** les
// modules traversent — le rendre tolérant une fois évite de le reprendre à
// chaque bascule.
async function volume(nom, deps, loadConfig) {
  const n = String(nom || '').trim();
  const ici = locale(loadConfig);
  // Un enregistrement sans champ `instance` revient à l'instance locale : il
  // compte pour elle, sans quoi elle paraîtrait vide et supprimable.
  const sien = (r) => (String((r || {}).instance || '') || ici) === n;
  const tout = referentiels.getAll();
  let compte = 0;
  referentiels.COLLECTIONS_INSTANCE.forEach((c) => {
    compte += (tout[c] || []).filter(sien).length;
  });
  compte += ((deps && deps.utilisateurs) || []).filter(sien).length;
  const publies = ((deps && deps.services) ? deps.services.list() : [])
    .filter((s) => /\.volumeParInstance$/.test(s.nom || ''));
  // En série, et non par `Promise.all` : l'ordre des comptes n'a pas
  // d'importance, mais six requêtes simultanées sur la même base pour une page
  // d'administration n'en ont pas davantage.
  for (const s of publies) {
    const par = (await deps.services.callOr(s.nom, {})) || {};
    // Les modules comptent par valeur portée : la clé vide est la locale.
    compte += Number(par[n] || 0) + (n === ici ? Number(par[''] || 0) : 0);
  }
  return compte;
}

// Supprimer une instance : seulement si rien ne s'y rattache. Les données
// d'une instance ne se déplacent pas ; les effacer avec elle ferait
// disparaître des dossiers de surveillance sans trace.
// Asynchrone par `volume`, qu'elle interroge avant d'effacer.
async function supprimer(nom, loadConfig, deps) {
  const n = String(nom || '').trim();
  if (!n || !liste(loadConfig).includes(n)) return { error: 'instance_inconnue' };
  if (n === locale(loadConfig)) return { error: 'instance_locale' };
  const porte = await volume(n, deps, loadConfig);
  if (porte) return { error: 'instance_non_vide', donnees: porte };
  const tout = store.load('instances', {}) || {};
  store.save('instances', {
    ...tout,
    ajoutees: (tout.ajoutees || []).filter((e) => e !== n),
    retirees: [...new Set([...(tout.retirees || []), n])],
    desactivees: (tout.desactivees || []).filter((e) => e !== n),
    aac: Object.fromEntries(Object.entries(tout.aac || {}).filter(([k]) => k !== n)),
    choix: Object.fromEntries(Object.entries(tout.choix || {}).map(([k, v]) => [k, v === n ? '' : v])),
    date_maj: new Date().toISOString(),
  });
  return { instance: n };
}

// Ce que la barre supérieure a besoin de savoir. Les instances ne sont servies
// qu'à qui peut en changer : les autres comptes lisent la leur.
const etat = (user, loadConfig) => {
  const regional = estRegional(user);
  return {
    disponible: regional,
    // Portée du compte, pour que l'écran des utilisateurs la montre et que la
    // barre sache s'il y a un choix à offrir.
    portee: estSuperadmin(user) ? portee(user) : '',
    locale: locale(loadConfig),
    courante: courante(user, loadConfig),
    instances: regional ? liste(loadConfig).filter(estActive) : [],
  };
};

module.exports = {
  locale, liste, courante, definir, de, filtrer, utilisateursDe, refs, visibles, etat,
  aac, aacDe, definirAac, CHAMPS_AAC,
  ouvrir, supprimer, basculerActivite, estActive, desactivees, volume,
  PORTEES, portee, estSuperadmin, estRegional,
};
