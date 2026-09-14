/* Module « Profils de Risques » — shell
   Coquille du module : état global, navigation, chargement des données, exports communs.
   Toutes les parties partagent la portée globale de la page : le découpage
   est physique (lisibilité), pas fonctionnel. Ordre de chargement : voir
   index.html. Socle commun : /shared/js/oasis-utils.js
   ─────────────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════
   App.js - Main SPA Controller
   Sidebar Navigation, Accordion, Filters
   ═══════════════════════════════════════════════ */

// ── Global State ──
window.APP_STATE = {
    lang: localStorage.getItem('pr_lang') || 'fr',
    theme: localStorage.getItem('pr_theme') || 'blue-dark',
    user: JSON.parse(localStorage.getItem('pr_user') || 'null'),
    currentPage: 'dashboard',
    currentSub: '',
    sidebarCollapsed: localStorage.getItem('pr_sidebar') === 'true',
    data: {}
};

const NAV_CONFIG = {
    dashboard: { labelKey: 'dashboard', icon: 'dashboard', subs: [] },
    evaluations: { labelKey: 'evaluations', icon: 'evaluations', subs: [
        { id: 'eval_indicateurs', labelKey: 'evaluations_en_cours' },
        { id: 'evaluations_validees', labelKey: 'evaluations_validees' }
    ]},
    profils: { labelKey: 'risk_profiles', icon: 'profiles', subs: [
        { id: 'actifs', labelKey: 'current_profiles' },
        { id: 'individuel', labelKey: 'individual_profile' },
        { id: 'archives', labelKey: 'eval_archives' }
    ]},
    bibliotheque: { labelKey: 'library', icon: 'library', subs: [] },
    parametres: { labelKey: 'parameters', icon: 'params', subs: [
        { id: 'indicateurs', labelKey: 'indicators' },
        { id: 'indices', labelKey: 'indices_seuils' }
    ]}
};

// ── Module API prefix ──
const MODULE_API = '/api/m/profil-risque';

// ── Module role helper ──
// ── Droits du module (Gestion des Droits, espace « PLAN ») ──
// Mêmes règles que le super-menu « Plans de Surveillance » : privilège de
// base plus portées par domaine/secteur. Le rôle portail (M1) ne sert plus
// qu'aux écrans d'administration de l'AAC.
const PR_PRIV_VALIDE = ['GESTIONNAIRE', 'VALIDATEUR'];
const PR_PRIV_CONTRIB = ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR'];

function prPrivilegeOn(secteurId) {
    const a = APP_STATE.access || {};
    if (!a.hasAccess) return '';
    if (secteurId && a.secteurs && a.secteurs[secteurId]) return a.secteurs[secteurId];
    return a.privilege || '';
}
// Meilleur privilège détenu, tous secteurs confondus
function prMeilleurPriv() {
    const a = APP_STATE.access || {};
    if (!a.hasAccess) return '';
    const tous = [a.privilege, ...Object.values(a.secteurs || {})].filter(Boolean);
    return ['GESTIONNAIRE', 'VALIDATEUR', 'CONTRIBUTEUR', 'LECTEUR'].find((p) => tous.includes(p)) || '';
}
function prCanValidate(secteurId) {
    return PR_PRIV_VALIDE.includes(secteurId ? prPrivilegeOn(secteurId) : prMeilleurPriv());
}
// Libellé affiché dans la barre supérieure : le privilège du module.
function prPrivilegeLabel() {
    const p = prMeilleurPriv();
    if (p) return p.charAt(0) + p.slice(1).toLowerCase();
    return APP_STATE.access && APP_STATE.access.hasAccess === false ? t('no_access') : '';
}

function getM1Role() {
    const rm1 = APP_STATE.user?.role_m1 || '';
    return rm1.replace('M1_', '') || APP_STATE.user?.role || 'Consultation';
}
function isM1Admin() {
    return getM1Role() === 'Administrateur' || APP_STATE.user?.role === 'Administrateur';
}

// ── Init (called by shell when module is opened) ──
window.initProfilRisqueModule = function() {
    APP_STATE.user = window.PESSCO?.user || JSON.parse(localStorage.getItem('pr_user') || 'null');
    APP_STATE.lang = window.PESSCO?.lang || localStorage.getItem('pr_lang') || 'fr';
    APP_STATE.theme = window.PESSCO?.theme || localStorage.getItem('pr_theme') || 'blue-dark';
    if (!APP_STATE.user) { window.location.href = '/login'; return; }
    document.body.classList.toggle('app-sidebar-collapsed', !!APP_STATE.sidebarCollapsed);
    document.documentElement.setAttribute('data-theme', APP_STATE.theme);
    loadAllData().then(() => {
        renderApp();
        navigateTo('dashboard');
        prUpdateNotifBadge();
    });
};

// Le module ne se monte qu'une fois, depuis index.html, qui attend le contexte
// du serveur. Ce second démarrage montait l'écran sur le seul compte gardé en
// mémoire du navigateur : il s'ouvrait donc à un compte dont le contexte
// venait d'être refusé.

// ── Data Loading ──
async function loadAllData() {
    try {
        // Shared data from shell (or fallback to direct API for standalone)
        const shared = window.PESSCO?.sharedData || {};
        const domaines = shared.domaines || await api('/api/domaines');
        const secteurs = shared.secteurs || await api('/api/secteurs');
        const sousActivites = shared.sousActivites || await api('/api/sous-activites');
        const prestataires = shared.prestataires || await api('/api/prestataires');
        const indices = shared.indices || await api('/api/indices');
        const aac = shared.aac || await api('/api/aac');

        // Module-specific data (always from module API)
        const [indConf, indPerf, indComplex, evaluations, plans, documents] = await Promise.all([
            api(`${MODULE_API}/indicateurs-conf`), api(`${MODULE_API}/indicateurs-perf`), api(`${MODULE_API}/indicateurs-complex`),
            api(`${MODULE_API}/evaluations`), api(`${MODULE_API}/plans`),
            api('/api/documents')
        ]);
        // Users list (for multi-evaluator designation) — only available to admins; ignore failures.
        let users = [];
        try { users = await api('/api/users') || []; } catch (e) { /* not admin */ }
        // Privilèges du module (Gestion des Droits) : secteur par secteur.
        try { APP_STATE.access = await api('/api/m/droits/PLAN/my-access'); }
        catch (e) { APP_STATE.access = { hasAccess: false, privilege: '', secteurs: {} }; }
        APP_STATE.data = { domaines, secteurs, sousActivites, indConf, indPerf, indComplex,
                           prestataires, evaluations, plans, documents, indices, aac, users };
        // Keep unfiltered copies so the eval detail view always has the full structure
        // (sub-activités / secteurs) even for designated evaluators outside the eval's domain.
        APP_STATE.data._rawSousActivites = sousActivites;
        APP_STATE.data._rawSecteurs = secteurs;
        APP_STATE.data._rawDomaines = domaines;
        // Domain-based access filtering (use role_m1 for this module)
        const roleM1 = APP_STATE.user?.role_m1 || APP_STATE.user?.role || '';
        const role = roleM1.replace('M1_', '') || APP_STATE.user?.role;
        const userDomaines = APP_STATE.user?.domaines || [];
        if ((role === 'Consultation' || role === 'Evaluateur' || role === 'Contributeur') && userDomaines.length > 0) {
            const D = APP_STATE.data;
            const allowedSecteurs = (D.secteurs || []).filter(s => userDomaines.includes(s.domaine_id)).map(s => s.id);
            D.evaluations = (D.evaluations || []).filter(e => allowedSecteurs.includes(e.secteur_id));
            D.prestataires = (D.prestataires || []).filter(p => allowedSecteurs.includes(p.secteur_id));
            // Filter domaines/secteurs in dropdowns
            D.domaines = (D.domaines || []).filter(d => userDomaines.includes(d.id));
            D.secteurs = (D.secteurs || []).filter(s => userDomaines.includes(s.domaine_id));
            D.sousActivites = (D.sousActivites || []).filter(sa => allowedSecteurs.includes(sa.secteur_id));
        }
        // Store allowed domaines/secteurs for edit permission checks (Validateur)
        if (role === 'Validateur' && userDomaines.length > 0) {
            const D = APP_STATE.data;
            APP_STATE.allowedSecteurs = (D.secteurs || []).filter(s => userDomaines.includes(s.domaine_id)).map(s => s.id);
        } else if (role === 'Administrateur') {
            APP_STATE.allowedSecteurs = null; // no restriction
        } else {
            APP_STATE.allowedSecteurs = (APP_STATE.data.secteurs || []).map(s => s.id);
        }
    } catch (e) {
        console.error('Data load error:', e);
    }
}

// ── Navigation ──
function navigateTo(page, sub = '') {
    // Ferme tout slicer/modale ouvert avant de changer de page
    document.querySelectorAll('.pr-slicer, .pr-slicer-overlay, .modal-overlay').forEach(el => el.remove());
    APP_STATE.currentPage = page;
    APP_STATE.currentSub = sub || (NAV_CONFIG[page]?.subs?.[0]?.id || '');
    updateNavUI();
    renderPage();
    // Close mobile sidebar
    document.querySelector('.app-sidebar')?.classList.remove('mobile-open');
    document.querySelector('.sidebar-backdrop')?.classList.remove('show');
}

function updateNavUI() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === APP_STATE.currentPage);
    });
    // MAJ du titre de la barre supérieure : Module / Page courante
    const _cfg = NAV_CONFIG[APP_STATE.currentPage];
    const _label = _cfg ? (t(_cfg.labelKey) || _cfg.labelKey) : '';
    const _span = document.querySelector('.app-header .header-module-title span');
    if (_span) _span.textContent = t('login_title') + (_label ? ' / ' + _label : '');
}

// ── Theme & Language ──
function setTheme(theme) {
    APP_STATE.theme = theme;
    oasisAppliquerTheme(theme);
}

function setLang(lang) {
    APP_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.trim().toLowerCase() === lang);
    });
    renderApp();
    navigateTo(APP_STATE.currentPage, APP_STATE.currentSub);
}

function handleLogout() {
    localStorage.removeItem('pr_token');
    localStorage.removeItem('pr_user');
    window.location.href = '/login';
}

// ── Sidebar Toggle ──
function toggleSidebar() {
    APP_STATE.sidebarCollapsed = !APP_STATE.sidebarCollapsed;
    localStorage.setItem('pr_sidebar', APP_STATE.sidebarCollapsed);
    const layout = document.querySelector('.app-layout');
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed', APP_STATE.sidebarCollapsed);
    if (layout) layout.classList.toggle('sidebar-collapsed', APP_STATE.sidebarCollapsed);
    document.body.classList.toggle('app-sidebar-collapsed', APP_STATE.sidebarCollapsed);
    // Update chevron direction
    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = APP_STATE.sidebarCollapsed
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    }
}

function toggleMobileSidebar() {
    document.querySelector('.app-sidebar')?.classList.toggle('mobile-open');
    document.querySelector('.sidebar-backdrop')?.classList.toggle('show');
}

// ── Render App Shell (Sidebar + Top Header) ──
function renderApp() {
    const S = APP_STATE;
    const isAdmin = S.user?.role === 'Administrateur';
    const initials = (S.user?.nom || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    let navHtml = '';
    for (const [key, config] of Object.entries(NAV_CONFIG)) {
        if (config.adminOnly && !isAdmin) continue;
        navHtml += `<button class="nav-btn ${S.currentPage === key ? 'active' : ''}" data-page="${key}" onclick="navigateTo('${key}')" title="${t(config.labelKey)}">
            ${ICONS[config.icon] || ''} <span>${t(config.labelKey)}</span>
        </button>`;
    }

    // En-tête vide : voir pl-shell.js — le retour au portail vient de la
    // coquille commune, et la version locale, conditionnée à `window.PESSCO`
    // que ce module met à null, appelait une fonction absente d'ici.
    document.getElementById('app').innerHTML = `
    <div class="app-layout ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header"></div>
            <nav class="sidebar-nav">${navHtml}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${['blue-dark','corporate','grey'].map(th =>
                        `<div class="theme-dot ${S.theme===th?'active':''}" data-theme="${th}" onclick="setTheme('${th}')" title="${th}"></div>`
                    ).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR','EN','PT'].map(l =>
                        `<button class="lang-btn ${S.lang===l.toLowerCase()?'active':''}" onclick="setLang('${l.toLowerCase()}')">${l}</button>`
                    ).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="toggleSidebar()" title="${S.sidebarCollapsed ? t('expand_all') : t('collapse_all')}">
                ${S.sidebarCollapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>'}
            </button>
        </aside>
        <div class="sidebar-backdrop" onclick="toggleMobileSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="toggleMobileSidebar()">${ICONS.menu}</button>
                    <div class="header-module-title">
                        ${ICONS.shield}
                        <span>${t('login_title')}${NAV_CONFIG[APP_STATE.currentPage] ? ' / ' + (t(NAV_CONFIG[APP_STATE.currentPage].labelKey) || NAV_CONFIG[APP_STATE.currentPage].labelKey) : ''}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="pr-notif-bell" onclick="prToggleNotifPanel()" title="Notifications" style="position:relative;cursor:pointer;padding:0.35rem;">
                        ${ICONS.bell}
                        <span class="pr-notif-badge" id="prNotifBadge" style="display:none;"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <span>${((S.user?.prenom || '') + ' ' + (S.user?.nom || '')).trim()}</span>
                        <span class="role-badge">${prPrivilegeLabel() || S.user?.role || ''}</span>
                    </div>
                    <button class="btn-logout" onclick="handleLogout()">${ICONS.logout} ${t('logout')}</button>
                </div>
            </header>
            <main class="main-content" id="pageContent"></main>
        </div>
    </div>`;
}

// ── Render Page Content ──
function renderPage() {
    const S = APP_STATE;
    const el = document.getElementById('pageContent');
    if (!el) return;
    // If a modal just closed, capture its pending scroll target now and re-apply it
    // after the DOM is rebuilt (so the user lands back on the same view).
    const pendingScrollY = (typeof window._pendingScrollY === 'number') ? window._pendingScrollY : null;

    const config = NAV_CONFIG[S.currentPage];
    let subNav = '';
    if (config?.subs?.length) {
        const isAdmin = S.user?.role === 'Administrateur';
        const visibleSubs = config.subs.filter(s => !s.adminOnly || isAdmin);
        subNav = `<div class="sub-nav">${visibleSubs.map(s =>
            `<button class="sub-nav-btn ${S.currentSub===s.id?'active':''}" onclick="APP_STATE.currentSub='${s.id}';renderPage();">${t(s.labelKey)}</button>`
        ).join('')}</div>`;
    }

    let content = '';
    switch (S.currentPage) {
        case 'dashboard': content = renderDashboard(); break;
        case 'profils': content = renderProfils(); break;
        case 'evaluations': content = renderEvaluations(); break;
        case 'plans': content = renderPlans(); break;
        case 'bibliotheque': content = renderBibliotheque(); break;
        case 'parametres': content = renderParametres(); break;
        default: content = `<div class="text-center">${t('no_data')}</div>`;
    }

    el.innerHTML = subNav + content;

    // Post-render hooks: restore previously expanded accordions and scroll position
    // if a modal-triggered restore is pending.
    const pendingAccs = Array.isArray(window._pendingExpandedAccs) ? window._pendingExpandedAccs : null;
    if (pendingAccs && pendingAccs.length) {
        pendingAccs.forEach(id => {
            const body = document.getElementById(`acc-body-${id}`);
            if (body) body.classList.add('expanded');
            const header = document.querySelector(`[data-acc-id="${id}"]`);
            if (header) header.classList.add('expanded');
            const btn = document.querySelector(`[onclick*="toggleAccordion('${id}')"]`);
            if (btn) btn.classList.add('expanded');
        });
        window._pendingExpandedAccs = undefined;
    }

    if (pendingScrollY !== null) {
        const apply = () => {
            window.scrollTo(0, pendingScrollY);
            document.documentElement.scrollTop = pendingScrollY;
            document.body.scrollTop = pendingScrollY;
        };
        apply();
        requestAnimationFrame(apply);
        setTimeout(apply, 0);
        setTimeout(apply, 50);
        // Clear the flag so subsequent renders (sub-nav clicks, etc.) are unaffected.
        window._pendingScrollY = undefined;
    }
}

// ── Modal helper ──
function showModal(title, bodyHtml, footerHtml = '', size = '') {
    const existing = document.getElementById('appModal');
    if (existing) existing.remove();
    // Preserve current scroll position so it can be restored when the modal closes.
    // (Stored as both a window property AND a pending-restore flag picked up by renderPage.)
    window._modalScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const div = document.createElement('div');
    div.id = 'appModal';
    div.className = 'modal-overlay';
    const resizable = size === 'modal-xl' ? 'style="resize:horizontal;overflow:auto;min-width:400px;max-width:95vw;"' : '';
    div.innerHTML = `<div class="modal ${size}" ${resizable}>
        <div class="modal-header"><h3>${title}</h3><button class="btn-icon" onclick="closeModal()">${ICONS.close}</button></div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => { if (e.target === div) closeModal(); });
    // Auto-grow any textarea marked with the .auto-grow class as the user types.
    setTimeout(() => {
        div.querySelectorAll('textarea.auto-grow').forEach(ta => {
            const grow = () => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
            ta.addEventListener('input', grow);
            grow();
        });
    }, 0);
}

function closeModal() {
    const m = document.getElementById('appModal');
    if (m) m.remove();
    // Capture which accordions are currently expanded so renderPage() can restore
    // them after rebuilding the DOM (preserves the user's view of the page).
    const expanded = [];
    document.querySelectorAll('.accordion-body.expanded').forEach(b => {
        const id = b.id || '';
        if (id.startsWith('acc-body-')) expanded.push(id.slice('acc-body-'.length));
    });
    if (expanded.length) window._pendingExpandedAccs = expanded;
    // Mark a pending scroll restore. renderPage() (called after the modal closes
    // by saveEntity / deleteEntity) will pick it up and restore the position.
    if (typeof window._modalScrollY === 'number') {
        const targetY = window._modalScrollY;
        window._pendingScrollY = targetY;
        const restore = () => {
            window.scrollTo(0, targetY);
            document.documentElement.scrollTop = targetY;
            document.body.scrollTop = targetY;
        };
        restore();
        requestAnimationFrame(restore);
        setTimeout(restore, 0);
        setTimeout(restore, 50);
    }
}

// ── Slicer (right drawer) helpers ──
function openSlicer(title, bodyHtml, footerHtml = '', opts = {}) {
    // Le volet se reconstruit à chaque rendu : changement d'onglet,
    // enregistrement, décision du circuit. Rejouer le glissement à chacun
    // faisait sortir le panneau pour le faire aussitôt revenir — l'écran
    // tressautait à la moindre action. Le glissement n'appartient qu'à la
    // première ouverture ; un volet déjà présent est remplacé en place.
    const ouvert = document.getElementById('prSlicer');
    if (ouvert) {
        ouvert.remove();
        document.getElementById('prSlicerOverlay')?.remove();
    } else {
        closeSlicer();
    }
    const overlay = document.createElement('div');
    overlay.id = 'prSlicerOverlay';
    overlay.className = 'pr-slicer-overlay';
    overlay.addEventListener('click', closeSlicer);

    const slicer = document.createElement('div');
    slicer.id = 'prSlicer';
    slicer.className = 'pr-slicer' + (opts.drawer ? ' pr-slicer-drawer' : '');
    // `opts.retour` : un panneau assez vaste pour qu'on y perde le fil — le
    // formulaire d'évaluation en est un — porte son retour en tête de bandeau,
    // avant le titre. La croix reste à droite : elle ferme, elle ne revient pas.
    const retour = opts.retour
        ? `<button class="pr-slicer-back" onclick="closeSlicer()">${ICONS.back}<span>${t('back')}</span></button>`
        : '';
    slicer.innerHTML = `
        <div class="pr-slicer-header">
            <div class="pr-slicer-titre">${retour}<h3>${title}</h3></div>
            <button class="pr-slicer-close" onclick="closeSlicer()">${ICONS.close}</button>
        </div>
        <div class="pr-slicer-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="pr-slicer-footer">${footerHtml}</div>` : ''}`;

    // Remplacement : le panneau est posé déjà ouvert. Une transition ne part
    // pas du premier rendu d'un élément, rien ne glisse donc.
    if (ouvert) {
        overlay.classList.add('open');
        slicer.classList.add('open');
    }
    document.body.appendChild(overlay);
    document.body.appendChild(slicer);
    // Première ouverture : le volet entre par la droite.
    if (!ouvert) {
        requestAnimationFrame(() => {
            overlay.classList.add('open');
            slicer.classList.add('open');
        });
    }
    // Activate auto-grow on any textarea marked .auto-grow inside the slicer.
    setTimeout(() => {
        slicer.querySelectorAll('textarea.auto-grow').forEach(ta => {
            const grow = () => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
            ta.addEventListener('input', grow);
            grow();
        });
    }, 0);
}

function closeSlicer() {
    const overlay = document.getElementById('prSlicerOverlay');
    const slicer = document.getElementById('prSlicer');
    if (slicer) {
        slicer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        setTimeout(() => { slicer.remove(); overlay?.remove(); }, 350);
    }
}

// ── Accordion helpers ──
function toggleAccordion(id) {
    const header = document.querySelector(`[data-acc-id="${id}"]`);
    const body = document.getElementById(`acc-body-${id}`);
    if (body) {
        body.classList.toggle('expanded');
        if (header) header.classList.toggle('expanded');
        // Also toggle the chevron button that triggered this
        const btn = document.querySelector(`[onclick*="toggleAccordion('${id}')"]`);
        if (btn) btn.classList.toggle('expanded');
    }
}

function expandCollapseAll(containerId, expand) {
    const container = containerId ? document.getElementById(containerId) : document.querySelector('.page-content, main');
    if (!container) return;
    container.querySelectorAll('.accordion-header').forEach(h => {
        if (expand) h.classList.add('expanded'); else h.classList.remove('expanded');
    });
    container.querySelectorAll('.accordion-body').forEach(b => {
        if (expand) b.classList.add('expanded'); else b.classList.remove('expanded');
    });
    // Also toggle chevron buttons
    container.querySelectorAll('[onclick*="toggleAccordion"]').forEach(btn => {
        if (expand) btn.classList.add('expanded'); else btn.classList.remove('expanded');
    });
}

