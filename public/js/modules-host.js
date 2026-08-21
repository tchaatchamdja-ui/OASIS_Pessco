// OASIS — Hôte des modules dans le portail.
//
// Le portail ne connaît aucun module en particulier : il interroge
// /api/modules/super-menus (alimenté par les manifestes de src/modules/) et
// enregistre une vue `mod_<CODE>` par module installé. Chaque module est
// chargé en iframe : isolation des globals, de la charte et des formulaires.
// La barre supérieure du module (super-menus, « Retour au Portail ») est
// injectée côté module par /shared/js/module-chrome.js.

const MODULE_HOST = {
  registre: [],      // [{ key, code, label, src, roles }]
  cartes: {},        // { <code carte portail>: <clé de module à ouvrir> }
  courant: null,     // clé du module affiché
};

// Chargement (une fois) du registre des modules installés.
async function moduleHostLoadRegistry() {
  if (MODULE_HOST.registre.length) return MODULE_HOST.registre;
  try {
    // `api()` du portail renvoie la réponse brute : on lit le JSON ici.
    const [rSupers, rCartes] = await Promise.all([
      api('/api/modules/super-menus'),
      api('/api/modules/cartes'),
    ]);
    const registre = await rSupers.json();
    const cartes = await rCartes.json();
    MODULE_HOST.registre = registre || [];
    MODULE_HOST.cartes = cartes || {};
  } catch (e) {
    MODULE_HOST.registre = [];
    MODULE_HOST.cartes = {};
  }
  return MODULE_HOST.registre;
}

// Affiche le module dans la surface principale.
async function moduleHostRender(key) {
  const mv = document.getElementById('mainView');
  const registre = await moduleHostLoadRegistry();
  const m = registre.find((x) => x.key === key || x.code === key);
  if (!m) {
    mv.innerHTML = '<div class="shell-card">Module indisponible.</div>';
    return;
  }
  MODULE_HOST.courant = m.key;
  moduleHostChrome(true);
  mv.innerHTML = `<iframe id="prFrame" class="pr-frame pr-frame-full" src="${m.src}" title="${esc(m.label)}"></iframe>`;
}

// Le portail masque son propre entête pendant l'affichage d'un module ;
// le module réaffiche son titre via postMessage.
function moduleHostChrome(on, subtitle) {
  document.body.classList.toggle('module-fullscreen', !!on);
  const tag = document.querySelector('.portal-header-brand-tagline');
  if (!tag) return;
  if (on) {
    if (!tag.dataset.orig) tag.dataset.orig = tag.textContent;
    const courant = MODULE_HOST.registre.find((x) => x.key === MODULE_HOST.courant);
    tag.textContent = (courant ? courant.label : 'Module') + (subtitle ? ' · ' + subtitle : '');
  } else if (tag.dataset.orig) {
    tag.textContent = tag.dataset.orig;
  }
}

window.planSetModuleChrome = moduleHostChrome;   // nom conservé : utilisé par app.js

window.planBackToPortal = function () {
  moduleHostChrome(false);
  MODULE_HOST.courant = null;
  document.body.classList.remove('app-sidebar-collapsed'); // barre latérale étendue au retour
  navigate('home');
};

// Messages remontés par l'iframe du module.
window.addEventListener('message', (ev) => {
  if (!ev.data) return;
  if (ev.data.type === 'oasis:back-portal') { planBackToPortal(); return; }
  // <prefixe>:page → sous-titre de la barre supérieure du portail
  if (typeof ev.data.type === 'string' && ev.data.type.endsWith(':page')) {
    moduleHostChrome(true, String(ev.data.page || '').replace(/_/g, ' '));
  }
});

// Enregistrement des vues : une par module installé, plus l'alias historique
// mod_PLAN qui ouvre le premier module (compatibilité des cartes du portail).
// Rejouable : le registre n'est lisible qu'une fois la session ouverte, donc
// le portail le redemande après connexion et, au besoin, au clic sur une carte.
async function moduleHostRegisterViews(force) {
  if (force) MODULE_HOST.registre = [];
  const registre = await moduleHostLoadRegistry();
  // Une vue par module, pour l'accès direct…
  registre.forEach((m) => {
    VIEWS[`mod_${m.code}`] = () => moduleHostRender(m.key);
  });
  // …et une par carte du portail, qui ouvre le premier module de la carte.
  Object.entries(MODULE_HOST.cartes).forEach(([carte, cle]) => {
    VIEWS[`mod_${carte}`] = () => moduleHostRender(cle);
  });
  return registre;
}
window.moduleHostRegisterViews = moduleHostRegisterViews;

moduleHostRegisterViews();
