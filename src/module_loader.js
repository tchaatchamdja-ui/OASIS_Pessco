// OASIS — Découverte et montage des modules.
//
// Un module = un dossier `src/modules/<dossier>/` contenant :
//   module.json  manifeste (code, libellés, préfixes d'API, entrée front,
//                services fournis/requis, module d'audit et de droits)
//   index.js     `register(app, deps)` et, si le module a des données, `seed()`
//
// Ajouter un module fini ne demande donc aucune modification du socle :
// déposer le dossier suffit. Le catalogue métier (config/modules.json) reste
// la feuille de route ; le loader y adosse l'état réellement installé.
const fs = require('fs');
const path = require('path');
const valider = require('./valider');

const MODULES_DIR = path.join(__dirname, 'modules');
const METHODES_MUTATIVES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Lecture des manifestes, triés par priorité puis par code.
function discover() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(MODULES_DIR, e.name);
      const manifestePath = path.join(dir, 'module.json');
      if (!fs.existsSync(manifestePath)) return null;
      let manifeste;
      try {
        manifeste = JSON.parse(fs.readFileSync(manifestePath, 'utf-8'));
      } catch (err) {
        console.error(`[modules] manifeste illisible : ${e.name} — ${err.message}`);
        return null;
      }
      return { ...manifeste, dossier: e.name, chemin: dir };
    })
    .filter(Boolean)
    .sort((a, b) => (a.priority || 9) - (b.priority || 9) || String(a.code).localeCompare(String(b.code)));
}

// Monte tous les modules découverts : middleware d'audit sur leurs préfixes
// d'API, puis `register`. Renvoie la liste des modules montés.
function mount(app, deps, moduleAudit) {
  const modules = discover();
  const montes = [];

  modules.forEach((m) => {
    let impl;
    try {
      impl = require(path.join(m.chemin, 'index.js'));
    } catch (err) {
      console.error(`[modules] ${m.code} non monté — ${err.message}`);
      return;
    }
    if (typeof impl.register !== 'function') {
      console.error(`[modules] ${m.code} non monté — register() manquant`);
      return;
    }
    (m.apiPrefixes || []).forEach((prefix) => {
      // Forme du corps sur toutes les écritures du module : elle ne dit pas ce
      // qu'un champ doit contenir, chaque route le sait mieux, mais refuse ce
      // qui n'a pas la forme d'un enregistrement. Les modules validaient champ
      // par champ, à la main, sans filet commun.
      app.use(prefix, (req, res, next) => (
        METHODES_MUTATIVES.has(req.method) ? valider.enveloppe(req, res, next) : next()
      ));
      // Journal d'audit inaltérable sur les mutations de chaque préfixe déclaré
      if (moduleAudit && m.auditModule) app.use(prefix, moduleAudit.middleware(m.auditModule, prefix));
    });
    impl.register(app, deps);
    montes.push({ ...m, impl });
  });

  // Contrôle des dépendances de services : un manque n'est pas bloquant, le
  // consommateur reçoit une valeur vide, mais il doit être signalé au
  // démarrage pour éviter un diagnostic difficile.
  if (deps.services) {
    montes.forEach((m) => {
      (m.requires || []).forEach((svc) => {
        if (!deps.services.has(svc)) {
          console.warn(`[modules] ${m.code} attend le service « ${svc} » : aucun producteur monté`);
        }
      });
    });
  }
  return montes;
}

// Initialisation des données de chaque module (idempotent).
function seedAll(montes) {
  montes.forEach((m) => {
    if (typeof m.impl.seed === 'function') m.impl.seed();
  });
}

// Catalogue exposé au portail : feuille de route (config/modules.json)
// enrichie de l'état d'installation, plus les modules installés hors
// feuille de route.
// `portalCode` permet à plusieurs modules d'être présentés sous une même
// carte du portail (ils y apparaissent alors comme super-menus).
const carteDe = (m) => m.portalCode || m.code;

function catalogue(roadmap, montes, enabled) {
  const restants = new Map();
  montes.forEach((m) => {
    const carte = carteDe(m);
    if (!restants.has(carte)) restants.set(carte, []);
    restants.get(carte).push(m);
  });
  const listeRoadmap = (roadmap || []).map((m) => {
    const inst = restants.get(m.code) || [];
    restants.delete(m.code);
    return { ...m, installed: inst.length > 0, enabled: !!(enabled || {})[m.code] };
  });
  const horsRoadmap = [...restants.entries()].map(([carte, liste]) => {
    const m = liste[0];
    return {
      code: carte, tdr: m.tdr, priority: m.priority, icon: m.icon, theme: m.theme,
      name: m.name, desc: m.desc, installed: true,
      enabled: (enabled || {})[carte] !== false,
    };
  });
  return [...listeRoadmap, ...horsRoadmap];
}

// Association carte du portail → clé du module à ouvrir (le premier de la
// carte, dans l'ordre déclaré par les manifestes).
function cartesPortail(montes) {
  const parCarte = {};
  montes
    .filter((m) => m.front && m.front.superMenu)
    .sort((a, b) => (a.front.order || 99) - (b.front.order || 99))
    .forEach((m) => {
      const carte = carteDe(m);
      if (!parCarte[carte]) parCarte[carte] = m.front.key;
    });
  return parCarte;
}

// Entrées de super-menu déclarées par les modules installés (barre supérieure
// des modules et cartes du portail).
// `portal` rappelle la carte d'appartenance : les super-menus ne se
// naviguent qu'entre modules d'une même carte du portail. Un module seul sur
// sa carte n'affiche donc aucun onglet — on n'y accède que par le portail.
function superMenus(montes) {
  return montes
    .filter((m) => m.front && m.front.superMenu)
    .sort((a, b) => (a.front.order || 99) - (b.front.order || 99))
    .map((m) => ({
      key: m.front.key,
      code: m.code,
      portal: carteDe(m),
      label: (m.name && m.name.fr) || m.code,
      src: m.front.url,
      roles: m.front.roles || null,
    }));
}

module.exports = { mount, seedAll, catalogue, superMenus, cartesPortail };
