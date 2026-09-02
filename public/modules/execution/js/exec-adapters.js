/* Module « Exécution de la Surveillance » — adaptations au socle OASIS.
   Chargé après exec-app.js : le portage PESSCO reste intact, et ce fichier
   redéfinit les seuls points où l'infrastructure diffère.
   ─────────────────────────────────────────────────────────────────────── */

// ── Données de référence partagées ──
// Dans PESSCO, le portail hébergeait le module et lui passait les
// référentiels via `window.PESSCO.sharedData` ; de nombreux écrans (thèmes,
// sous-activités, exigences, domaines) les lisent sans repli. OASIS charge ces
// mêmes référentiels dans `EXEC_STATE.data` : on rebranche donc la coquille
// attendue dessus, une fois pour toutes.
// `EXEC_STATE` est un `const` de exec-app.js : visible des autres scripts,
// mais absent de `window`. On l'expose pour la page hôte, puis on branche la
// coquille dessus.
window.EXEC_STATE = EXEC_STATE;

window.PESSCO = {
  get sharedData() { return EXEC_STATE.data || {}; },
  get user() { return EXEC_STATE.user; },
  set user(v) { EXEC_STATE.user = v; },
  get lang() { return EXEC_STATE.lang; },
  set lang(v) { EXEC_STATE.lang = v; },
  get theme() { return EXEC_STATE.theme; },
  portalSidebarCollapsed: false,
};

// Le module est affiché dans un cadre : le retour au portail passe par l'hôte.
window.backToPortal = function () {
  parent.postMessage({ type: 'oasis:back-portal' }, '*');
};

// PESSCO produisait le PDF du rapport côté serveur (fpdf2). OASIS génère
// tous ses documents côté client, via la fenêtre d'impression : on réutilise
// donc l'aperçu imprimable déjà porté.
window.execDownloadRapportFile = function (rapportId) {
  return window.execDownloadRapport(rapportId, true);
};

// ── Bascule Vue AAC / Vue Prestataire ──
// Le module sert l'autorité et les prestataires. Le super-administrateur peut
// passer de l'une à l'autre depuis la barre supérieure : le serveur le présente
// alors aux routes comme un utilisateur du prestataire retenu, si bien que les
// cloisonnements de données s'appliquent réellement.
const EXEC_VUES = {
  aac: {
    label: 'Vue AAC',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  },
  prestataire: {
    label: 'Vue Prestataire',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-6h4v6"/></svg>',
  },
};

let execVueActive = null;

async function execAppliquerVue(vue, prestataireId) {
  if (!execVueActive) return;
  if (execVueActive.vue === vue && !prestataireId) return;
  if (prestataireId && prestataireId === execVueActive.prestataire_id) return;
  try {
    await api(`${EXEC_MODULE_API}/vue`, {
      method: 'PUT',
      body: JSON.stringify(prestataireId ? { vue, prestataire_id: prestataireId } : { vue }),
    });
  } catch (e) {
    _execToast((e && e.message) || 'Bascule impossible', 'error');
    return;
  }
  // Le rôle conditionne la navigation, les menus et le périmètre des données :
  // on recharge le module plutôt que de rafraîchir écran par écran.
  window.location.reload();
}

// ── Gestion des droits du module ──
// Même écran que pour la carte D.6, appliqué à l'espace SURV. Réservé aux
// administrateurs du portail, comme le super-menu « Gestion des Droits ».
const EXEC_DROITS_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';

const execPeutGererDroits = () => ['SUPERADMIN', 'ADMIN'].includes((EXEC_STATE.user || {}).role);

function execDessinerActions() {
  if (typeof oasisModuleActions !== 'function') return;
  const actions = [];
  if (execVueActive && execVueActive.disponible) {
    Object.entries(EXEC_VUES).forEach(([key, v]) => actions.push({
      key, label: v.label, icon: v.icon,
      active: execVueActive.vue === key,
      onClick: (k) => execAppliquerVue(k),
    }));
    // En vue Prestataire, le compte tenu se choisit dans la barre : l'Autorité
    // surveille plusieurs organismes et passe de l'un à l'autre.
    if (execVueActive.vue === 'prestataire') {
      actions.push({
        key: 'prestataire_choix', type: 'select',
        label: 'Prestataire dont les données sont affichées',
        value: execVueActive.prestataire_id || '',
        options: (execVueActive.prestataires || []).map((p) => ({
          value: p.id, label: p.trigramme ? `${p.nom} (${p.trigramme})` : p.nom,
        })),
        onChange: (id) => execAppliquerVue('prestataire', id),
      });
    }
  }
  if (execPeutGererDroits()) {
    actions.push({
      key: 'droits', label: 'Gestion des Droits', icon: EXEC_DROITS_ICON,
      onClick: () => { window.location.href = '/modules/droits/index.html?module=SURV'; },
    });
  }
  oasisModuleActions(actions);
  execDessinerMention();
}

// Vue Prestataire : la barre porte le nom du prestataire dont on tient le
// compte — c'est lui qui décide de ce que l'écran montre.
function execNomPrestataireCourant() {
  const u = (window.EXEC_STATE && EXEC_STATE.user) || {};
  const enVue = execVueActive && execVueActive.vue === 'prestataire';
  const id = (enVue && execVueActive.prestataire_id) || u.prestataire_id || '';
  if (!id) return '';
  const liste = (execVueActive && execVueActive.prestataires)
    || (window.EXEC_STATE && EXEC_STATE.data && EXEC_STATE.data.prestataires) || [];
  const p = liste.find((x) => x.id === id);
  return p ? (p.nom || p.trigramme || '') : '';
}

function execDessinerMention() {
  if (typeof oasisModuleMention !== 'function') return;
  const prestataire = typeof _execIsPrestataire === 'function' && _execIsPrestataire();
  // La liste déroulante nomme déjà le prestataire : la mention ne sert qu'aux
  // comptes qui n'en changent pas.
  const choixEnBarre = !!(execVueActive && execVueActive.disponible);
  oasisModuleMention(prestataire && !choixEnBarre ? execNomPrestataireCourant() : '');
}

// L'état peut arriver avant ou après la mise en place de la barre, et le rôle
// n'est connu qu'après le chargement du contexte : on (re)dessine à chaque
// étape, l'opération étant idempotente.
api(`${EXEC_MODULE_API}/vue`)
  .then((etat) => { execVueActive = etat; execDessinerActions(); })
  .catch(() => {});
window.addEventListener('DOMContentLoaded', () => {
  execDessinerActions();
  window.EXEC_BOOT && window.EXEC_BOOT.then(execDessinerActions).catch(() => {});
});
