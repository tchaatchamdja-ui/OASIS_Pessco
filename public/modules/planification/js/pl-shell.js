/* Module « Plans de Surveillance » — shell
   Icônes, navigation, coquille applicative, barre de filtres.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════
//  ICONS
// ══════════════════════════════════════

const PLAN_ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    plans: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    prestataires: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    workflow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    history: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    import: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    sync: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    pdf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    comment: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    gantt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="8" height="4" rx="1"/><rect x="7" y="10" width="10" height="4" rx="1"/><rect x="5" y="16" width="12" height="4" rx="1"/></svg>',
    reset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    risk_profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    archive: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>'
};

// ══════════════════════════════════════
//  NAVIGATION CONFIG
// ══════════════════════════════════════

const PLAN_NAV = {
    dashboard: { labelKey: 'dashboard', icon: 'dashboard' },
    prestataires: { labelKey: 'profils_de_risques', icon: 'risk_profile' },
    plans: { labelKey: 'nav_plans', icon: 'plans' },
    calendrier: { labelKey: 'calendrier', icon: 'gantt' },
    workflow: { labelKey: 'workflow', icon: 'workflow' },
    historique: { labelKey: 'historique', icon: 'history' },
    // Paramètres removed - managed from portal Configuration
};

// ══════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════

window.initPlanificationModule = function() {
    PLAN_STATE.user = window.PESSCO?.user || JSON.parse(localStorage.getItem('pr_user') || 'null');
    PLAN_STATE.lang = window.PESSCO?.lang || localStorage.getItem('pr_lang') || 'fr';
    PLAN_STATE.theme = window.PESSCO?.theme || localStorage.getItem('pr_theme') || 'blue-dark';
    if (!PLAN_STATE.user) { window.location.href = '/login'; return; }
    document.body.classList.toggle('app-sidebar-collapsed', !!PLAN_STATE.sidebarCollapsed);
    document.documentElement.setAttribute('data-theme', PLAN_STATE.theme);
    planLoadData().then(() => {
        planRenderApp();
        planNavigateTo('dashboard');
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (!window.PESSCO) {
        PLAN_STATE.user = JSON.parse(localStorage.getItem('pr_user') || 'null');
        if (!PLAN_STATE.user) { window.location.href = '/login'; return; }
        document.documentElement.setAttribute('data-theme', PLAN_STATE.theme);
        planLoadData().then(() => {
            planRenderApp();
            planNavigateTo('dashboard');
        });
    }
});

// ── Data Loading ──
async function planLoadData() {
    try {
        const shared = window.PESSCO?.sharedData || {};
        const domaines = shared.domaines || await api('/api/domaines');
        const secteurs = shared.secteurs || await api('/api/secteurs');
        const sousActivites = shared.sousActivites || await api('/api/sous-activites');
        const prestataires = shared.prestataires || await api('/api/prestataires');
        const aac = shared.aac || await api('/api/aac');

        const [plans, stats, inspecteurs, typesSupervision, exigences, riskProfiles,
               modesSupervision, themesSupervision, prestataireRisques, allActivites] = await Promise.all([
            api(`${PLAN_MODULE_API}/plans`),
            api(`${PLAN_MODULE_API}/stats`),
            api('/api/inspecteurs'),
            api('/api/types-supervision'),
            api('/api/exigences'),
            api('/api/shared/risk-profiles').catch(() => []),
            api('/api/modes-supervision').catch(() => []),
            api('/api/themes-supervision').catch(() => []),
            api(`${PLAN_MODULE_API}/prestataires-risques`).catch(() => []),
            api(`${PLAN_MODULE_API}/all-activites`).catch(() => [])
        ]);

        PLAN_STATE.data = {
            domaines, secteurs, sousActivites, prestataires, aac, plans, stats,
            inspecteurs, typesSupervision, exigences, riskProfiles,
            modesSupervision, themesSupervision, prestataireRisques, allActivites
        };

        // Privilèges du module (Gestion des Droits) : ils gouvernent
        // l'édition dans les deux super-menus, au même titre que dans
        // « Profils de Risques ».
        try {
            PLAN_STATE.access = await api('/api/m/droits/PLAN/my-access');
        } catch (e) {
            PLAN_STATE.access = { hasAccess: false, privilege: '', secteurs: {} };
        }
    } catch (e) {
        console.error('Planification data load error:', e);
    }
}

// ══════════════════════════════════════
//  ROLE HELPERS
// ══════════════════════════════════════

// Les droits proviennent de « Gestion des Droits » (module PLAN) : privilège
// de base plus portées par domaine/secteur. Le rôle portail n'intervient que
// pour les actions réservées au DG (approbation, transmission).
const PL_VALIDE = ['GESTIONNAIRE', 'VALIDATEUR'];
const PL_CONTRIB = ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR'];

function _access() {
    return PLAN_STATE.access || { hasAccess: false, privilege: '', secteurs: {} };
}

// Privilège effectif sur un secteur ; sans secteur, le privilège de base.
function _privOn(secteurId) {
    const a = _access();
    if (!a.hasAccess) return '';
    if (secteurId && a.secteurs && a.secteurs[secteurId]) return a.secteurs[secteurId];
    return a.privilege || '';
}

// Meilleur privilège détenu, tous secteurs confondus : autorise l'accès aux
// écrans d'édition, le contrôle fin se faisant ensuite secteur par secteur.
function _meilleurPriv() {
    const a = _access();
    if (!a.hasAccess) return '';
    const tous = [a.privilege, ...Object.values(a.secteurs || {})].filter(Boolean);
    return ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR']
        .find((p) => tous.includes(p)) || '';
}

// Libellé affiché : le privilège du module, comme dans « Profils de Risques ».
function _userM2Role() {
    const p = _meilleurPriv();
    if (p) return p.charAt(0) + p.slice(1).toLowerCase();
    return (PLAN_STATE.access && PLAN_STATE.access.hasAccess === false) ? 'Aucun accès' : '';
}

// Un plan est dans le périmètre si l'utilisateur détient un privilège sur son
// secteur (les portées « Aucun » excluent explicitement).
function _planDansPerimetre(plan) {
    const p = _privOn(plan && plan.secteur_id);
    return !!p && p !== 'AUCUN';
}

// Rôle portail : réservé aux actes du directeur général (approbation,
// transmission). Le libellé peut être le rôle portail brut (SUPERADMIN) ou
// sa transposition module (Administrateur / M2_Administrateur).
function _isAdmin() {
    const r = PLAN_STATE.user?.role || '';
    const m2 = PLAN_STATE.user?.role_m2 || '';
    return ['SUPERADMIN', 'ADMIN', 'Administrateur'].includes(r) || m2 === 'M2_Administrateur';
}
function _isGestionnaire(secteurId) { return _privOn(secteurId) === 'GESTIONNAIRE'; }
function _isValidateur(secteurId) { return PL_VALIDE.includes(_privOn(secteurId)); }
function _isContributeur(secteurId) { return PL_CONTRIB.includes(_privOn(secteurId)); }
function _canValidate(secteurId) {
    return secteurId ? PL_VALIDE.includes(_privOn(secteurId)) : PL_VALIDE.includes(_meilleurPriv());
}
function _canContribute(secteurId) {
    return secteurId ? PL_CONTRIB.includes(_privOn(secteurId)) : PL_CONTRIB.includes(_meilleurPriv());
}
function _isConsultation() { return !_canContribute(); }

// ══════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════

function planNavigateTo(page, sub = '') {
    // Ferme tout modal/slider ouvert avant changement de page
    document.querySelectorAll('.modal-overlay, .pr-slicer, .pr-slicer-overlay').forEach(el => el.remove());
    PLAN_STATE.currentPage = page;
    PLAN_STATE.currentSub = sub;
    if (page !== 'plan-detail') {
        PLAN_STATE.selectedPlan = null;
    }
    planUpdateNavUI();
    planRenderPage();
    document.querySelector('.app-sidebar')?.classList.remove('mobile-open');
    document.querySelector('.sidebar-backdrop')?.classList.remove('show');
}

function planUpdateNavUI() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const p = btn.dataset.page;
        btn.classList.toggle('active', p === PLAN_STATE.currentPage || (PLAN_STATE.currentPage === 'plan-detail' && p === 'plans'));
    });
    // MAJ du titre de la barre supérieure : Module / Page courante
    const _key = PLAN_STATE.currentPage === 'plan-detail' ? 'plans' : PLAN_STATE.currentPage;
    const _cfg = PLAN_NAV[_key];
    const _label = _cfg ? (tp(_cfg.labelKey) || _cfg.labelKey) : '';
    const _span = document.querySelector('.app-header .header-module-title span');
    if (_span) _span.textContent = tp('module_title') + (_label ? ' / ' + _label : '');
}

function planSetTheme(theme) {
    PLAN_STATE.theme = theme;
    localStorage.setItem('pr_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.theme === theme));
}

function planSetLang(lang) {
    PLAN_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    if (window.PESSCO) window.PESSCO.lang = lang;
    planRenderApp();
    planNavigateTo(PLAN_STATE.currentPage, PLAN_STATE.currentSub);
}

function planToggleSidebar() {
    PLAN_STATE.sidebarCollapsed = !PLAN_STATE.sidebarCollapsed;
    localStorage.setItem('plan_sidebar', PLAN_STATE.sidebarCollapsed);
    document.querySelector('.app-sidebar')?.classList.toggle('collapsed', PLAN_STATE.sidebarCollapsed);
    document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed', PLAN_STATE.sidebarCollapsed);
    document.body.classList.toggle('app-sidebar-collapsed', PLAN_STATE.sidebarCollapsed);
    // Update chevron direction
    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = PLAN_STATE.sidebarCollapsed
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    }
}

function planToggleMobileSidebar() {
    document.querySelector('.app-sidebar')?.classList.toggle('mobile-open');
    document.querySelector('.sidebar-backdrop')?.classList.toggle('show');
}

function planLogout() {
    localStorage.removeItem('pr_token');
    localStorage.removeItem('pr_user');
    window.location.href = '/login';
}

function planResetFilters() {
    PLAN_STATE.filters = { domaine: '', secteur: '', prestataire: '', sousActivite: '', theme: '', statut: '', search: '', annee: '' };
    planRenderPage();
}

// ══════════════════════════════════════
//  RENDER APP SHELL
// ══════════════════════════════════════

function planRenderApp() {
    const S = PLAN_STATE;
    const initials = (S.user?.nom || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    let navHtml = '';
    for (const [key, config] of Object.entries(PLAN_NAV)) {
        navHtml += `<button class="nav-btn ${S.currentPage === key ? 'active' : ''}" data-page="${key}" onclick="planNavigateTo('${key}')" title="${tp(config.labelKey)}">
            ${PLAN_ICONS[config.icon] || ''} <span>${tp(config.labelKey)}</span>
        </button>`;
    }

    document.getElementById('app').innerHTML = `
    <div class="app-layout ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header">
                ${window.PESSCO ? `<button class="btn-back-portal" onclick="backToPortal()" title="${pt('back_portal')}">
                    ${PLAN_ICONS.back} <span class="back-portal-label">${pt('back_portal')}</span>
                </button>` : ''}
            </div>
            <nav class="sidebar-nav">${navHtml}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${['blue-dark','orange-dark','violet','green','grey'].map(th =>
                        `<div class="theme-dot ${S.theme===th?'active':''}" data-theme="${th}" onclick="planSetTheme('${th}')" title="${th}"></div>`
                    ).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR','EN','PT'].map(l =>
                        `<button class="lang-btn ${S.lang===l.toLowerCase()?'active':''}" onclick="planSetLang('${l.toLowerCase()}')">${l}</button>`
                    ).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="planToggleSidebar()">
                ${S.sidebarCollapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>' : PLAN_ICONS.chevron}
            </button>
        </aside>
        <div class="sidebar-backdrop" onclick="planToggleMobileSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="planToggleMobileSidebar()">${PLAN_ICONS.menu}</button>
                    <div class="header-module-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--accent)">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>${tp('module_title')}${PLAN_NAV[PLAN_STATE.currentPage] ? ' / ' + (tp(PLAN_NAV[PLAN_STATE.currentPage].labelKey) || PLAN_NAV[PLAN_STATE.currentPage].labelKey) : ''}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="plan-notif-bell" onclick="planToggleNotifPanel()" title="Notifications" style="position:relative;cursor:pointer;padding:0.35rem;">
                        ${PLAN_ICONS.bell}
                        <span class="plan-notif-badge" id="planNotifBadge" style="display:none;"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <span>${((S.user?.prenom || '') + ' ' + (S.user?.nom || '')).trim()}</span>
                        <span class="role-badge">${_userM2Role()}</span>
                    </div>
                    <button class="btn-logout" onclick="planLogout()">${PLAN_ICONS.logout} ${tp('logout')}</button>
                </div>
            </header>
            <main class="main-content" id="planPageContent"></main>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  RENDER PAGE CONTENT
// ══════════════════════════════════════

function planRenderPage() {
    const el = document.getElementById('planPageContent');
    if (!el) return;

    const config = PLAN_NAV[PLAN_STATE.currentPage];
    let subNav = '';
    if (config?.subs?.length) {
        if (!PLAN_STATE.currentSub) PLAN_STATE.currentSub = config.subs[0].id;
        subNav = `<div class="sub-nav">${config.subs.map(s =>
            `<button class="sub-nav-btn ${PLAN_STATE.currentSub===s.id?'active':''}" onclick="PLAN_STATE.currentSub='${s.id}';planRenderPage();">${tp(s.labelKey)}</button>`
        ).join('')}</div>`;
    }

    let content = '';
    switch (PLAN_STATE.currentPage) {
        case 'dashboard': content = planRenderDashboard(); break;
        case 'plans': content = planRenderPlans(); break;
        case 'plan-detail': content = planRenderPlanDetail(); break;
        case 'prestataires': content = planRenderPrestataires(); break;
        case 'calendrier': content = planRenderCalendar(); break;
        case 'workflow': content = planRenderWorkflow(); break;
        case 'historique': content = planRenderHistory(); break;
        default: content = `<div class="text-center">${tp('no_data')}</div>`;
    }
    el.innerHTML = subNav + content;

    // Load comments async after plan detail renders
    if (PLAN_STATE.currentPage === 'plan-detail' && PLAN_STATE.selectedPlan) {
        setTimeout(() => planLoadComments(PLAN_STATE.selectedPlan.id), 100);
    }

    // Update notification badge
    planUpdateNotifBadge();
}

// ── Modal helper ──
function planShowModal(title, bodyHtml, footerHtml = '', size = '') {
    const existing = document.getElementById('planModal');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'planModal';
    // size === 'modal-drawer' : volet latéral sortant de la droite
    const drawer = String(size).includes('modal-drawer');
    div.className = `modal-overlay${drawer ? ' drawer-overlay' : ''}`;
    div.innerHTML = `<div class="modal ${size}">
        <div class="modal-header"><h3>${title}</h3><button class="btn-icon" onclick="planCloseModal()">${PLAN_ICONS.close}</button></div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => { if (e.target === div) planCloseModal(); });
}

function planCloseModal() {
    const m = document.getElementById('planModal');
    if (m) m.remove();
}

// ══════════════════════════════════════
//  FILTER BAR (reusable)
// ══════════════════════════════════════

function _renderFilterBar(onchangeFunc, opts = {}) {
    const F = PLAN_STATE.filters;
    const domaines = PLAN_STATE.data.domaines || [];
    const secteurs = PLAN_STATE.data.secteurs || [];
    const prestataires = PLAN_STATE.data.prestataires || [];
    const sousActivites = PLAN_STATE.data.sousActivites || [];
    const themes = PLAN_STATE.data.themesSupervision || [];
    const plans = PLAN_STATE.data.plans || [];
    const years = [...new Set(plans.map(p => p.annee))].sort((a, b) => b - a);

    let filteredSecteurs = secteurs;
    if (F.domaine) filteredSecteurs = secteurs.filter(s => s.domaine_id === F.domaine);
    let filteredSA = sousActivites;
    if (F.secteur) filteredSA = sousActivites.filter(sa => sa.secteur_id === F.secteur);

    // Collect filter HTML first so we can count filters and decide whether the
    // reset button would end up alone on a new row in a 5-per-row grid.
    const filters = [];

    if (opts.showYearFirst && opts.showYear) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.annee=this.value;${onchangeFunc}">
        <option value="">${tp('all_years')}</option>${years.map(y => `<option value="${y}" ${F.annee==y?'selected':''}>${y}</option>`).join('')}</select>`);

    if (opts.showDomaine !== false) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.domaine=this.value;PLAN_STATE.filters.secteur='';PLAN_STATE.filters.sousActivite='';${onchangeFunc}">
        <option value="">${tp('all_domains')}</option>${domaines.map(d => `<option value="${d.id}" ${F.domaine===d.id?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}</select>`);

    if (opts.showSecteur !== false) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.secteur=this.value;PLAN_STATE.filters.sousActivite='';${onchangeFunc}">
        <option value="">${tp('all_sectors')}</option>${filteredSecteurs.map(s => `<option value="${s.id}" ${F.secteur===s.id?'selected':''}>${s.code} - ${_esc(s.nom)}</option>`).join('')}</select>`);

    if (opts.showPrestataire) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.prestataire=this.value;${onchangeFunc}">
        <option value="">${tp('all_providers')}</option>${prestataires.map(p => `<option value="${p.id}" ${F.prestataire===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}</select>`);

    if (opts.showSousActivite) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.sousActivite=this.value;${onchangeFunc}">
        <option value="">${tp('all_sub_activities')}</option>${filteredSA.map(sa => `<option value="${sa.id}" ${F.sousActivite===sa.id?'selected':''}>${sa.code} - ${_esc(sa.nom)}</option>`).join('')}</select>`);

    if (opts.showTheme) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.theme=this.value;${onchangeFunc}">
        <option value="">${tp('all_themes')}</option>${themes.map(t => `<option value="${t.id}" ${F.theme===t.id?'selected':''}>${_esc(t.libelle)}</option>`).join('')}</select>`);

    if (opts.showStatut) {
        // Optionally force the Statut + Search pair onto a new line.
        if (opts.newLineBeforeStatut) {
            filters.push('<div class="plan-filter-break" aria-hidden="true"></div>');
        }
        filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.statut=this.value;${onchangeFunc}">
        <option value="">${tp('all_statuses')}</option>
        <option value="brouillon" ${F.statut==='brouillon'?'selected':''}>${tp('brouillon')}</option>
        <option value="soumis" ${F.statut==='soumis'?'selected':''}>${tp('soumis')}</option>
        <option value="valide" ${F.statut==='valide'?'selected':''}>${tp('valide')}</option>
        <option value="rejete" ${F.statut==='rejete'?'selected':''}>${tp('rejete')}</option>
        <option value="en_cours_amendement" ${F.statut==='en_cours_amendement'?'selected':''}>${tp('en_cours_amendement')}</option>
        </select>`);
    }

    if (opts.showYear && !opts.showYearFirst) filters.push(`<select class="form-select" onchange="PLAN_STATE.filters.annee=this.value;${onchangeFunc}">
        <option value="">${tp('all_years')}</option>${years.map(y => `<option value="${y}" ${F.annee==y?'selected':''}>${y}</option>`).join('')}</select>`);

    if (opts.showSearch !== false) filters.push(`<input type="text" class="form-input" id="plan-filter-search" placeholder="${tp('search')}" value="${_esc(F.search)}" oninput="_pesSearchInput(this, () => { PLAN_STATE.filters.search=document.getElementById('plan-filter-search').value; ${onchangeFunc} })">`);

    let html = `<div class="plan-filter-bar">`;
    html += filters.join('');
    html += `<button class="btn-icon-reset" onclick="planResetFilters()" title="${tp('reset_filters')}">${PLAN_ICONS.reset}</button>`;
    html += '</div>';
    return html;
}
