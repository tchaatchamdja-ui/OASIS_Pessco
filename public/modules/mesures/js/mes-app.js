/* OASIS — Module « Mesures d'Application » (CARE, D.7.2)
 *
 * Reprise du module « Suivi des Carences » de PESSCO. Cinq menus :
 *   Tableau de Bord · Carences · Mesures · Paramètres
 *
 * La coquille suit la charte du module « Exécution de la Surveillance » :
 * même barre latérale (retour portail, entrées, sélecteurs de thème et de
 * langue, bouton de repli), même barre supérieure (titre « Module / Page »,
 * identité, rôle, déconnexion), même pied.
 */

const MES_API = '/api/m/mesures';

const MES_STATE = {
    user: null,
    privilege: '',
    currentPage: 'dashboard',
    sidebarCollapsed: localStorage.getItem('mes_sidebar') === 'true',
    theme: 'blue-dark',
    lang: 'fr',
    data: {
        mesures: [], constatations: [], prestataires: [], domaines: [], secteurs: [],
        parametres: { categories: [], types: [], modifiable: false, supprimable: false },
    },
    filtres: {
        db_prest: '', db_cat: '', db_type: '', db_statut: '', db_echeance: '',
        mes_categorie: '', mes_statut: '', mes_prest: '', mes_recherche: '',
        crit_statut: '', crit_prest: '', crit_origine: '', crit_recherche: '',
    },
    mesureEnCours: null,
    categorieEnCours: null,
    typeEnCours: null,
    sliderOpen: false,
};

// ══════════════════════════════════════
//  Requêtes
// ══════════════════════════════════════

async function mesApi(chemin, options) {
    const o = { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(options || {}) };
    const r = await fetch(MES_API + chemin, o);
    if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error || r.statusText);
    }
    return r.status === 204 ? null : r.json();
}

// ══════════════════════════════════════
//  Échappement
// ══════════════════════════════════════
// `_mesEsc` protège le texte ; `_mesAttr` protège une valeur d'attribut, où
// un guillemet refermerait l'attribut. Tout libellé saisi peut en contenir.

function _mesEsc(v) {
    if (v === null || v === undefined || v === '') return '';
    const d = document.createElement('div');
    d.textContent = String(v);
    return d.innerHTML;
}
const _mesAttr = (v) => _mesEsc(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Chemin d'une pièce jointe servie par ce module. Échapper l'attribut ne suffit
// pas : « javascript:… » y tiendrait sans guillemet. Seul le chemin que
// /upload rend devient un lien.
const _mesChemin = (v) => (/^\/api\/m\/mesures\/uploads\/[A-Za-z0-9._-]+$/.test(String(v || ''))
    ? String(v) : '');

// Comparaison tolérante aux accents et à la casse, pour les recherches.
const _mesNorm = (v) => String(v == null ? '' : v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ══════════════════════════════════════
//  Icônes
// ══════════════════════════════════════

const MES_ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    reset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
};

// ══════════════════════════════════════
//  Navigation
// ══════════════════════════════════════

// Les indicateurs par prestataire n'ont plus d'entrée de menu : ils se lisent
// au tableau de bord, dans le bandeau qui s'ouvre dès qu'un prestataire est
// retenu au filtre. Un écran de moins, et la mesure au même endroit que le
// reste du pilotage.
const MES_NAV = {
    dashboard: { label: 'Tableau de Bord', icon: 'dashboard' },
    // La carence précède la mesure : on la constate, puis on la sanctionne.
    critiques: { label: 'Carences', icon: 'warning' },
    mesures: { label: 'Mesures', icon: 'shield' },
    parametres: { label: 'Paramètres', icon: 'settings' },
};

// D'où vient la carence : chaque module la relève à sa façon, l'écran les
// réunit sous les mêmes intitulés.
const MES_ORIGINES = {
    SURV: 'Exécution de la Surveillance',
    SAFA: 'RAMP Inspections',
    CARE: 'Relevée ici',
};

// Statuts que portent les carences reçues ou relevées.
// Teintes des catégories de mesure : la gravité se lit à la couleur — l'orange
// clair de la mesure administrative, l'orange franc de la sanction, le rouge du
// pénal. Une
// catégorie ajoutée au paramétrage prend la teinte suivante de la palette.
const MES_COULEURS_CATEGORIE = ['#1d4ed8', '#ea580c', '#7c3aed', '#059669', '#0891b2', '#b45309'];
// Provenance d'une carence : chaque module a sa teinte.
const MES_COULEUR_PAR_SOURCE = {
    SURV: '#1d4ed8',
    SAFA: '#0891b2',
    CARE: '#7c3aed',
};

const MES_COULEUR_PAR_CODE = {
    administrative: '#fb923c',
    sanction: '#ea580c',
    penale: '#dc2626',
};

const MES_STATUTS_CONSTAT = {
    ouverte: 'Ouverte', soldee: 'Soldée', classee: 'Classée',
    en_cours: 'En cours', close: 'Close',
};

// Statut d'une carence au sens des mesures d'application : ce que ce module
// en a fait, indépendamment de l'état qu'elle porte dans celui qui l'a
// relevée. Une constatation soldée chez le surveillant reste « à traiter »
// ici tant qu'aucune décision n'a été prise.
const MES_STATUT_CARE = {
    a_traiter: { libelle: 'À traiter', couleur: '#dc2626' },
    sous_mesure: { libelle: 'Sous mesure', couleur: '#d97706' },
    traitee: { libelle: 'Traitée', couleur: '#059669' },
    classee: { libelle: 'Classée', couleur: '#7c3aed' },
};

const mesBadgeStatutCare = (cle) => {
    const st = MES_STATUT_CARE[cle] || MES_STATUT_CARE.a_traiter;
    return `<span class="mes-badge-care" style="background:${st.couleur};">${st.libelle}</span>`;
};

const MES_STATUTS = {
    projet: 'Projet', notifiee: 'Notifiée', en_cours: 'En cours',
    cloturee: 'Clôturée', annulee: 'Annulée',
};

// ══════════════════════════════════════
//  Droits
// ══════════════════════════════════════

const mesRole = () => (MES_STATE.user || {}).role_m4 || 'M4_Non Autorisé';
const mesEstAdmin = () => mesRole() === 'M4_Administrateur';
const mesPeutDecider = () => ['M4_Validateur', 'M4_Administrateur'].includes(mesRole());
const mesPeutEcrire = () => ['M4_Contributeur', 'M4_Validateur', 'M4_Administrateur'].includes(mesRole());

// ══════════════════════════════════════
//  Paramétrage : catégories et types
// ══════════════════════════════════════

const mesCategories = () => (MES_STATE.data.parametres.categories || []);
const mesTypes = () => (MES_STATE.data.parametres.types || []);
const mesTypesDe = (categorie) => mesTypes().filter((t) => t.categorie_code === categorie);
const mesLibelleCategorie = (code) => {
    const c = mesCategories().find((x) => x.code === code);
    return c ? c.libelle : (code || '—');
};
const mesLibelleType = (code) => {
    const t = mesTypes().find((x) => x.code === code);
    return t ? t.libelle : (code || '—');
};

// Une amende se reconnaît à son code ou à son libellé : le paramétrage étant
// libre, on ne peut pas s'en tenir à une liste figée de codes.
const mesEstAmende = (code) => !!code && /amende/i.test(`${code} ${mesLibelleType(code)}`);

// ══════════════════════════════════════
//  Dates et badges
// ══════════════════════════════════════

const mesJour = () => new Date().toISOString().slice(0, 10);
const mesDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

const MES_CLOS = ['cloturee', 'annulee'];
const mesEnRetard = (m) => !!m.date_echeance && m.date_echeance < mesJour() && !MES_CLOS.includes(m.statut);

function mesBadgeStatut(statut) {
    return `<span class="mes-badge ${_mesAttr(statut)}">${_mesEsc(MES_STATUTS[statut] || statut)}</span>`;
}

function mesBadgeCriticite(v) {
    const n = _mesNorm(v);
    const cls = n.startsWith('crit') ? 'critique' : (n.startsWith('maj') ? 'majeure' : 'mineure');
    const lib = v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '—';
    return `<span class="mes-badge ${cls}">${_mesEsc(lib)}</span>`;
}

function mesToast(message, type) {
    if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
    return window.oasisToast(message, type);
}

// ══════════════════════════════════════
//  Chargement des données
// ══════════════════════════════════════

async function mesLoadData() {
    const [mesures, constatations, refs, parametres] = await Promise.all([
        mesApi('/mesures').catch(() => []),
        mesApi('/constatations').catch(() => []),
        mesApi('/referentiels').catch(() => ({})),
        mesApi('/parametres').catch(() => ({ categories: [], types: [] })),
    ]);
    MES_STATE.data.mesures = mesures || [];
    MES_STATE.data.constatations = constatations || [];
    MES_STATE.data.prestataires = refs.prestataires || [];
    MES_STATE.data.domaines = refs.domaines || [];
    MES_STATE.data.secteurs = refs.secteurs || [];
    MES_STATE.data.parametres = parametres || { categories: [], types: [] };
}

async function mesRechargerMesures() {
    MES_STATE.data.mesures = await mesApi('/mesures').catch(() => MES_STATE.data.mesures);
    mesRenderPage();
}

async function mesRechargerParametres() {
    MES_STATE.data.parametres = await mesApi('/parametres')
        .catch(() => MES_STATE.data.parametres);
    mesRenderPage();
}

// ══════════════════════════════════════
//  Coquille — barre latérale, barre supérieure, pied
// ══════════════════════════════════════

function mesRenderApp() {
    const S = MES_STATE;
    document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
    const u = S.user || {};
    const initiales = ((u.prenom || u.nom || 'U')[0] + ((u.nom || '')[1] || '')).toUpperCase();

    const nav = Object.entries(MES_NAV).map(([cle, cfg]) => `
        <button class="nav-btn ${S.currentPage === cle ? 'active' : ''}" data-page="${cle}"
                onclick="mesNavigateTo('${cle}')" title="${_mesAttr(cfg.label)}">
            ${MES_ICONS[cfg.icon] || ''} <span>${_mesEsc(cfg.label)}</span>
        </button>`).join('');

    const titrePage = (MES_NAV[S.currentPage] || {}).label || '';
    const titre = titrePage ? `Mesures d'Application / ${titrePage}` : "Mesures d'Application";

    document.getElementById('app').innerHTML = `
    <div class="app-layout mes-module ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header">
                <button class="btn-back-portal" onclick="mesRetourPortail()" title="Retour au portail">
                    ${MES_ICONS.back} <span class="back-portal-label">Retour au portail</span>
                </button>
            </div>
            <nav class="sidebar-nav">${nav}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${['blue-dark', 'corporate', 'grey'].map((th) =>
                        `<div class="theme-dot ${S.theme === th ? 'active' : ''}" data-theme="${th}"
                              onclick="mesSetTheme('${th}')" title="${th}"></div>`).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR', 'EN', 'PT'].map((l) =>
                        `<button class="lang-btn ${S.lang === l.toLowerCase() ? 'active' : ''}"
                                 onclick="mesSetLang('${l.toLowerCase()}')">${l}</button>`).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="mesToggleSidebar()">
                ${S.sidebarCollapsed
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
                    : MES_ICONS.chevron}
            </button>
        </aside>
        <div class="sidebar-backdrop" onclick="mesToggleSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="mesToggleSidebar()">${MES_ICONS.menu}</button>
                    <div class="header-module-title">
                        <span style="color:var(--mes-accent);display:flex;">${MES_ICONS.shield}</span>
                        <span>${_mesEsc(titre)}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="user-info">
                        <div class="user-avatar">${_mesEsc(initiales)}</div>
                        <span>${_mesEsc(`${u.prenom || ''} ${u.nom || ''}`.trim())}</span>
                        <span class="role-badge">${_mesEsc(mesRole())}</span>
                    </div>
                    <button class="btn-logout" onclick="mesDeconnexion()">${MES_ICONS.logout} Déconnexion</button>
                </div>
            </header>
            <main class="main-content" id="mes-content"></main>
        </div>
    </div>
    <div class="mes-slider-overlay" id="mesSliderOverlay" onclick="mesFermerSlider()"></div>
    <div class="mes-slider" id="mesSlider"></div>
    <div id="mesModalRoot"></div>
    <div id="mesVoletRoot"></div>`;
}

// ── Filtres ──
// Un filtre retenu redessine l'écran ; la recherche, elle, ne redessine que le
// corps du tableau — re-rendre la page entière ferait perdre le curseur à
// chaque frappe.
function mesSetFiltre(cle, valeur) {
    MES_STATE.filtres[cle] = valeur;
    mesRenderPage();
}

function mesRechercher(cle, valeur) {
    MES_STATE.filtres[cle] = valeur;
    const corps = document.querySelector('[data-corps]');
    if (!corps) { mesRenderPage(); return; }
    corps.innerHTML = corps.dataset.corps === 'mesures'
        ? mesLignesMesures() : mesLignesCritiques();
}

// Remises à zéro, écran par écran : chacun ne relâche que ses propres filtres.
function mesResetFiltresDashboard() {
    const F = MES_STATE.filtres;
    F.db_prest = ''; F.db_cat = ''; F.db_type = ''; F.db_statut = ''; F.db_echeance = '';
    mesRenderPage();
}

function mesResetFiltresMesures() {
    const F = MES_STATE.filtres;
    F.mes_categorie = ''; F.mes_statut = ''; F.mes_prest = ''; F.mes_recherche = '';
    mesRenderPage();
}

function mesResetFiltresCritiques() {
    const F = MES_STATE.filtres;
    F.crit_origine = ''; F.crit_statut = ''; F.crit_prest = ''; F.crit_recherche = '';
    mesRenderPage();
}

function mesNavigateTo(page) {
    MES_STATE.currentPage = page;
    mesRenderApp();
    mesRenderPage();
    parent.postMessage({ type: 'mes:page', page }, '*');
}

function mesRenderPage() {
    const el = document.getElementById('mes-content');
    if (!el) return;
    let corps = '';
    switch (MES_STATE.currentPage) {
        case 'mesures': corps = mesRenderMesures(); break;
        case 'critiques': corps = mesRenderCritiques(); break;
        case 'parametres': corps = mesRenderParametres(); break;
        default: corps = mesRenderDashboard();
    }
    // Le pied de page vient du chrome du socle (`module-chrome.js`), qui
    // l'injecte dans .app-content : le module n'en pose pas de second.
    el.innerHTML = corps;
}

function mesToggleSidebar() {
    MES_STATE.sidebarCollapsed = !MES_STATE.sidebarCollapsed;
    localStorage.setItem('mes_sidebar', String(MES_STATE.sidebarCollapsed));
    mesRenderApp();
    mesRenderPage();
}

function mesSetTheme(theme) {
    MES_STATE.theme = theme;
    localStorage.setItem('pr_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    mesRenderApp();
    mesRenderPage();
}

function mesSetLang(lang) {
    MES_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    mesRenderApp();
    mesRenderPage();
}

function mesRetourPortail() {
    parent.postMessage({ type: 'oasis:back-to-portal' }, '*');
    if (parent === window) window.location.href = '/';
}

async function mesDeconnexion() {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { /* déconnexion locale */ }
    window.top.location.href = '/login.html';
}

// ══════════════════════════════════════
//  Page 1 — Tableau de Bord
// ══════════════════════════════════════

function mesRenderDashboard() {
    const F = MES_STATE.filtres;
    const aujourdhui = mesJour();
    let liste = MES_STATE.data.mesures;

    const echeance = (m, genre) => {
        const clos = MES_CLOS.includes(m.statut);
        if (genre === 'sans') return !m.date_echeance;
        if (genre === 'retard') return !!m.date_echeance && m.date_echeance < aujourdhui && !clos;
        if (genre === 'proche') {
            if (!m.date_echeance || clos) return false;
            const j = (new Date(m.date_echeance) - new Date(aujourdhui)) / 86400000;
            return j >= 0 && j <= 30;
        }
        return true;
    };
    if (F.db_prest) liste = liste.filter((m) => m.prestataire_id === F.db_prest);
    if (F.db_cat) liste = liste.filter((m) => m.categorie === F.db_cat);
    if (F.db_type) liste = liste.filter((m) => m.type_mesure === F.db_type);
    if (F.db_statut) liste = liste.filter((m) => m.statut === F.db_statut);
    if (F.db_echeance) liste = liste.filter((m) => echeance(m, F.db_echeance));

    const compte = (s) => liste.filter((m) => m.statut === s).length;
    const enRetard = liste.filter(mesEnRetard).length;
    const proche = liste.filter((m) => echeance(m, 'proche')).length;

    const segmentsCategorie = mesCategories().map((c, i) => ({
        cle: c.code,
        label: c.libelle,
        value: liste.filter((m) => m.categorie === c.code).length,
        color: MES_COULEUR_PAR_CODE[c.code] || MES_COULEURS_CATEGORIE[i % MES_COULEURS_CATEGORIE.length],
    }));
    const parCategorie = mesCategories().length
        ? mesRepartition(segmentsCategorie, {
            camembert: false, action: 'mesGrapheCategorie',
            retenue: MES_STATE.categorieGraphe || '', infobulle: 'Filtrer les types de mesure',
        })
        : '<div class="mes-preuve-vide">Aucune catégorie paramétrée</div>';

    // Les types affichés suivent la catégorie retenue au graphique voisin :
    // cliquer sur « Sanction administrative » ne montre plus que ses types.
    const catRetenue = MES_STATE.categorieGraphe || '';
    const listeType = catRetenue ? liste.filter((m) => m.categorie === catRetenue) : liste;
    const compteurType = {};
    listeType.forEach((m) => { compteurType[m.type_mesure] = (compteurType[m.type_mesure] || 0) + 1; });
    const segmentsType = Object.entries(compteurType).sort((x, y) => y[1] - x[1])
        .map(([t, n], i) => ({
            label: mesLibelleType(t), value: n,
            color: MES_COULEURS_CATEGORIE[i % MES_COULEURS_CATEGORIE.length],
        }));
    const parType = segmentsType.length
        ? mesRepartition(segmentsType, { camembert: true })
        : '<div class="mes-preuve-vide">Aucune donnée</div>';


    const opt = (v, l, cur) => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;

    // ── Cartes d'indicateurs ──
    // Elles reprennent celles du tableau de bord d'« Exécution de la
    // Surveillance » : le socle les rend (`oasisKpiCarte`), chacune porte son
    // intitulé, la mesure, une précision et une figure qui dit de quoi il
    // s'agit. Deux groupes titrés — ce que l'Autorité a décidé, et ce qui
    // l'appelait à décider.
    const clos = liste.filter((m) => MES_CLOS.includes(m.statut)).length;
    const tauxCloture = liste.length ? Math.round((clos / liste.length) * 100) : 0;
    const visees = new Set(liste.map((m) => m.prestataire_id).filter(Boolean)).size;
    const volumeStatut = Object.keys(MES_STATUTS).map((s) => compte(s));
    // Le retard se situe sur l'échelle : au-delà d'un quart des mesures en
    // souffrance, l'aiguille est au rouge.
    const positionRetard = liste.length
        ? Math.min(100, Math.round((enRetard / liste.length) * 400)) : 0;

    // ── Côté constatations ──
    // C'est l'écart relevé qui appelle la mesure : le tableau de bord montre
    // les deux bouts de la chaîne. Les constatations viennent du module
    // « Exécution de la Surveillance » par le bus de services.
    const constatations = MES_STATE.data.constatations || [];
    const constPortee = F.db_prest
        ? constatations.filter((c) => c.prestataire_id === F.db_prest) : constatations;
    const soldees = constPortee.filter((c) => c.statut === 'soldee').length;
    const tauxSolde = constPortee.length ? Math.round((soldees / constPortee.length) * 100) : 0;
    const critiques = constPortee.filter((c) => _mesNorm(c.criticite).startsWith('crit')).length;
    const classees = constPortee.filter((c) => c.classee).length;
    const partClassees = constPortee.length ? Math.round((classees / constPortee.length) * 100) : 0;

    const segmentsSource = Object.entries(MES_ORIGINES).map(([cle, libelle]) => ({
        cle,
        label: libelle,
        value: constPortee.filter((c) => (c.origine || 'SURV') === cle).length,
        color: MES_COULEUR_PAR_SOURCE[cle],
    }));
    const parSource = constPortee.length
        ? mesRepartition(segmentsSource, {
            camembert: false, action: 'mesGrapheSource',
            retenue: MES_STATE.sourceGraphe || '', infobulle: 'Filtrer les statuts de carence',
        })
        : '<div class="mes-preuve-vide">Aucune carence</div>';

    // Le graphique dit ce que la colonne « Statut » du menu Carences affiche :
    // l'état de la carence dans ce module, non celui qu'elle porte ailleurs.
    // Une source retenue au graphique voisin resserre les statuts sur elle.
    const sourceRetenue = MES_STATE.sourceGraphe || '';
    const carencesStatut = sourceRetenue
        ? constPortee.filter((c) => (c.origine || 'SURV') === sourceRetenue) : constPortee;
    const segmentsStatutConstat = Object.entries(MES_STATUT_CARE).map(([cle, st]) => ({
        label: st.libelle,
        value: carencesStatut.filter((c) => (c.statut_care || 'a_traiter') === cle).length,
        color: st.couleur,
    }));
    const parStatutConstat = carencesStatut.length
        ? mesRepartition(segmentsStatutConstat, { camembert: true })
        : '<div class="mes-preuve-vide">Aucune carence</div>';
    // Constatations critiques encore sans mesure : c'est ce qui reste à faire.
    const critiquesSansMesure = constPortee
        .filter((c) => _mesNorm(c.criticite).startsWith('crit') && !c.mesures_liees).length;

    const cartes = `
    <div class="oasis-kpi-groupes">
        ${oasisKpiGroupe("Mesures d'application", [
            oasisKpiCarte({
                titre: 'Mesures prises', couleur: '#b91c1c',
                valeur: liste.length,
                precision: `${visees} prestataire${visees > 1 ? 's' : ''} visé${visees > 1 ? 's' : ''}`,
                figure: { type: 'barres', valeurs: volumeStatut },
            }),
            oasisKpiCarte({
                titre: 'Échéance dépassée', couleur: '#dc2626', alerte: !!enRetard,
                valeur: enRetard,
                precision: proche ? `${proche} à échéance sous 30 j` : 'aucune à échéance proche',
                figure: { type: 'retard', pastille: 'Dépassée', legende: 'Émission' },
            }),
            oasisKpiCarte({
                titre: 'Taux de clôture', couleur: '#059669',
                valeur: `${tauxCloture} %`,
                precision: `${clos} clôturée${clos > 1 ? 's' : ''} sur ${liste.length}`,
                figure: { type: 'cloture', pct: tauxCloture },
            }),
        ])}
        ${oasisKpiGroupe('Carences Graves Suivies', [
            oasisKpiCarte({
                titre: 'Constatations', couleur: '#ea580c',
                valeur: constPortee.length,
                precision: `${soldees} soldée${soldees > 1 ? 's' : ''} · ${tauxSolde} %`,
                figure: { type: 'jauge', pct: tauxSolde },
            }),
            oasisKpiCarte({
                titre: 'À traiter', couleur: '#dc2626', alerte: !!critiquesSansMesure,
                valeur: critiquesSansMesure,
                precision: `sur ${critiques} constatation${critiques > 1 ? 's' : ''} critique${critiques > 1 ? 's' : ''}`,
                figure: { type: 'echelle', position: positionRetard, min: 'Maîtrisé', max: 'À traiter' },
            }),
            // Classée : l'autorité a décidé qu'aucune mesure ne serait prise.
            oasisKpiCarte({
                titre: 'Classées', couleur: '#7c3aed',
                valeur: classees,
                precision: `sur ${constPortee.length} carence${constPortee.length > 1 ? 's' : ''}`,
                figure: { type: 'jauge', pct: partClassees },
            }),
        ])}
    </div>`;

    return `
    <div class="mes-page-header">
        <h2>Tableau de Bord</h2>
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select" onchange="mesSetFiltre('db_prest',this.value)">
                <option value="">Tous prestataires</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.db_prest)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_cat',this.value)">
                <option value="">Toutes catégories</option>
                ${mesCategories().map((c) => opt(c.code, c.libelle, F.db_cat)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_type',this.value)">
                <option value="">Tous types</option>
                ${mesTypes().map((t) => opt(t.code, t.libelle, F.db_type)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_statut',this.value)">
                <option value="">Tous statuts</option>
                ${Object.entries(MES_STATUTS).map(([v, l]) => opt(v, l, F.db_statut)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_echeance',this.value)">
                <option value="">Toutes échéances</option>
                ${opt('retard', 'Échéance dépassée', F.db_echeance)}
                ${opt('proche', 'Échéance ≤ 30 j', F.db_echeance)}
                ${opt('sans', 'Sans échéance', F.db_echeance)}
            </select>
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresDashboard()"
                    title="Réinitialiser les filtres">${MES_ICONS.reset}</button>
        </div>
    </div>
    ${cartes}
    <div class="mes-grille-2">
        <div class="mes-card">
            <div class="mes-card-titre">Par catégorie</div>${parCategorie}
        </div>
        <div class="mes-card">
            <div class="mes-card-titre">Par source de carence</div>${parSource}
        </div>
    </div>
    <div class="mes-grille-2">
        <div class="mes-card">
            <div class="mes-card-titre">Par type de mesure${catRetenue
                ? ` — ${_mesEsc(mesLibelleCategorie(catRetenue))}` : ''}</div>${parType}
        </div>
        <div class="mes-card">
            <div class="mes-card-titre">Par statut de carence${sourceRetenue
                ? ` — ${_mesEsc(MES_ORIGINES[sourceRetenue] || sourceRetenue)}` : ''}</div>${parStatutConstat}
        </div>
    </div>
    `;
}

// ══════════════════════════════════════
//  Page 2 — Mesures
// ══════════════════════════════════════

function mesMesuresFiltrees() {
    const F = MES_STATE.filtres;
    const q = _mesNorm(F.mes_recherche);
    return MES_STATE.data.mesures.filter((m) => {
        if (F.mes_categorie && m.categorie !== F.mes_categorie) return false;
        if (F.mes_statut && m.statut !== F.mes_statut) return false;
        if (F.mes_prest && m.prestataire_id !== F.mes_prest) return false;
        if (!q) return true;
        return _mesNorm(`${m.reference} ${m.objet} ${m.description} ${m.prestataire_nom} ${mesLibelleType(m.type_mesure)}`).includes(q);
    });
}

function mesLignesMesures() {
    const liste = mesMesuresFiltrees();
    if (!liste.length) {
        return `<tr><td colspan="7" class="mes-table-vide">Aucune mesure ne correspond.</td></tr>`;
    }
    return liste.map((m) => {
        const retard = mesEnRetard(m);
        return `<tr>
            <td><strong>${_mesEsc(m.reference)}</strong>${m.constatation_ref
                ? `<div style="font-size:.75rem;color:var(--text-muted);">${_mesEsc(m.constatation_ref)}</div>` : ''}</td>
            <td>${_mesEsc(mesLibelleCategorie(m.categorie))}</td>
            <td>${_mesEsc(mesLibelleType(m.type_mesure))}${m.objet
                ? `<div style="font-size:.75rem;color:var(--text-muted);">${_mesEsc(m.objet)}</div>` : ''}</td>
            <td>${_mesEsc(m.prestataire_nom || '—')}</td>
            <td>${retard
                ? `<span class="mes-badge retard">${mesDate(m.date_echeance)}</span>`
                : mesDate(m.date_echeance)}</td>
            <td>${mesBadgeStatut(m.statut)}</td>
            <td class="mes-actions">
                <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesOuvrirMesure('${m.id}')"
                        title="${MES_CLOS.includes(m.statut) ? 'Consulter' : 'Modifier'}">${MES_ICONS.edit}</button>
                ${m.statut === 'projet' && mesPeutDecider()
                    ? `<button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesTransition('${m.id}','notifier')"
                               title="Notifier au prestataire">${MES_ICONS.send}</button>` : ''}
                ${['notifiee', 'en_cours'].includes(m.statut) && mesPeutDecider()
                    ? `<button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesTransition('${m.id}','cloturer')"
                               title="Clôturer">${MES_ICONS.check}</button>` : ''}
                ${m.statut === 'cloturee' && mesPeutDecider()
                    ? `<button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesTransition('${m.id}','rouvrir')"
                               title="Rouvrir">${MES_ICONS.undo}</button>` : ''}
                ${mesEstAdmin()
                    ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                               onclick="mesSupprimerMesure('${m.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function mesRenderMesures() {
    const F = MES_STATE.filtres;
    const opt = (v, l, cur) => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;
    return `
    <div class="mes-page-header">
        <h2>Mesures</h2>
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_categorie',this.value)">
                <option value="">Toutes catégories</option>
                ${mesCategories().map((c) => opt(c.code, c.libelle, F.mes_categorie)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_statut',this.value)">
                <option value="">Tous statuts</option>
                ${Object.entries(MES_STATUTS).map(([v, l]) => opt(v, l, F.mes_statut)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_prest',this.value)">
                <option value="">Tous prestataires</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.mes_prest)).join('')}
            </select>
            <input class="mes-input mes-filtre-large" type="text" placeholder="Rechercher…" value="${_mesAttr(F.mes_recherche)}"
                   oninput="mesRechercher('mes_recherche', this.value)">
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresMesures()"
                    title="Réinitialiser les filtres">${MES_ICONS.reset}</button>
        </div>
    </div>
    <div class="mes-card" style="padding:0;">
        <div class="mes-table-wrap">
            <table class="mes-table">
                <thead><tr>
                    <th style="width:130px;">Référence</th>
                    <th style="width:160px;">Catégorie</th>
                    <th>Type et objet</th>
                    <th style="width:180px;">Prestataire</th>
                    <th style="width:110px;">Échéance</th>
                    <th style="width:100px;">Statut</th>
                    <th style="width:170px;text-align:center;">Actions</th>
                </tr></thead>
                <tbody data-corps="mesures">${mesLignesMesures()}</tbody>
            </table>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  Page 3 — Carences
// ══════════════════════════════════════

function mesCritiquesFiltrees() {
    const F = MES_STATE.filtres;
    const q = _mesNorm(F.crit_recherche);
    return MES_STATE.data.constatations.filter((c) => {
        if (!_mesNorm(c.criticite).startsWith('crit')) return false;
        if (F.crit_statut && (c.statut_care || 'a_traiter') !== F.crit_statut) return false;
        if (F.crit_prest && c.prestataire_id !== F.crit_prest) return false;
        if (F.crit_origine && (c.origine || 'SURV') !== F.crit_origine) return false;
        if (!q) return true;
        const p = MES_STATE.data.prestataires.find((x) => x.id === c.prestataire_id) || {};
        return _mesNorm(`${c.reference} ${c.titre} ${c.description} ${p.nom || c.prestataire_nom || ''}`)
            .includes(q);
    });
}

function mesLignesCritiques() {
    const liste = mesCritiquesFiltrees();
    if (!liste.length) {
        return `<tr><td colspan="8" class="mes-table-vide">Aucune carence.</td></tr>`;
    }
    const prests = MES_STATE.data.prestataires;
    const aujourdhui = mesJour();
    return liste.map((c) => {
        const p = prests.find((x) => x.id === c.prestataire_id) || {};
        const retard = c.statut !== 'soldee' && c.date_due_cloture && c.date_due_cloture < aujourdhui;
        return `<tr>
            <td><strong>${_mesEsc(c.reference)}</strong>
                ${c.origine === 'SAFA'
                    ? '<div class="mes-sous-titre">RAMP · catégorie 3</div>' : ''}
                ${c.origine === 'CARE'
                    ? `<div class="mes-sous-titre">Relevée ici${c.origine_libelle
                        ? ` · ${_mesEsc(c.origine_libelle)}` : ''}</div>` : ''}</td>
            <td>
                <strong>${_mesEsc(c.titre || '—')}</strong>
                ${c.description
                    ? `<div class="mes-sous-titre">${_mesEsc(c.description)}</div>` : ''}
            </td>
            <td>${_mesEsc(p.nom || c.prestataire_nom || '—')}</td>
            <td>${mesDate(c.date_ouverture)}</td>
            <td>${retard
                ? `<span class="mes-badge retard">${mesDate(c.date_due_cloture)}</span>`
                : mesDate(c.date_due_cloture)}</td>
            <td>${mesBadgeStatutCare(c.statut_care)}</td>
            <td>${c.date_cloture
                ? `<span class="mes-badge cloturee">${mesDate(c.date_cloture)}</span>` : '—'}</td>
            <td class="mes-actions">
              <div class="mes-actions-pile">
                ${mesPeutEcrire() && !c.classee
                    ? `<button class="btn btn-sm mes-btn-mesure" onclick="mesMesureDepuisConstatation('${c.id}')">
                           ${MES_ICONS.add} Mesure</button>` : ''}
                ${mesPeutDecider() && !c.classee && !c.mesures_liees
                    ? `<button class="btn btn-sm mes-btn-classer" onclick="mesClasserCarence('${c.id}')"
                               title="Aucune suite ne sera donnée">${MES_ICONS.check} Classer</button>` : ''}
                ${c.classee
                    ? `<span class="mes-badge cloturee" title="${_mesAttr(c.classement_motif || '')}">Classée</span>` : ''}
                ${c.origine === 'CARE' && mesPeutEcrire() ? `<span class="mes-actions-icones">
                    <button class="btn btn-outline btn-sm mes-btn-icone" title="Modifier"
                            onclick="mesOuvrirConstat('${c.id}')">${MES_ICONS.edit}</button>
                    ${mesEstAdmin() && !c.mesures_liees && !c.classee
                        ? `<button class="btn btn-outline btn-sm mes-btn-icone" title="Supprimer"
                                   style="color:#dc2626;border-color:#dc2626;"
                                   onclick="mesSupprimerConstat('${c.id}')">${MES_ICONS.delete}</button>` : ''}
                </span>` : ''}
              </div>
            </td>
        </tr>`;
    }).join('');
}

function mesRenderCritiques() {
    const F = MES_STATE.filtres;
    const opt = (v, l, cur) => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;
    return `
    <div class="mes-page-header">
        <h2>Carences</h2>
        ${mesPeutEcrire()
            ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirConstat()">
                   ${MES_ICONS.add} Ajouter une Carence</button>` : ''}
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_origine',this.value)">
                <option value="">Toutes origines</option>
                ${Object.entries(MES_ORIGINES)
                    .map(([cle, lib]) => opt(cle, lib, F.crit_origine)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_statut',this.value)">
                <option value="">Tous statuts</option>
                ${Object.entries(MES_STATUT_CARE)
                    .map(([cle, st]) => opt(cle, st.libelle, F.crit_statut)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_prest',this.value)">
                <option value="">Tous prestataires</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.crit_prest)).join('')}
            </select>
            <input class="mes-input mes-filtre-large" type="text" placeholder="Rechercher…"
                   value="${_mesAttr(F.crit_recherche)}"
                   oninput="mesRechercher('crit_recherche', this.value)">
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresCritiques()"
                    title="Réinitialiser les filtres">${MES_ICONS.reset}</button>
        </div>
    </div>
    <p class="mes-note">
        Les carences proviennent du module « Exécution de la Surveillance », des écarts de
        catégorie 3 relevés par « RAMP Inspections », et de celles relevées ici. Prendre une
        mesure ouvre le formulaire déjà rattaché à la carence et à son prestataire.
    </p>

    <div class="mes-card" style="padding:0;">
        <div class="mes-table-wrap">
            <table class="mes-table">
                <thead><tr>
                    <th style="width:150px;">Référence</th>
                    <th>Objet / Description</th>
                    <th style="width:180px;">Prestataire</th>
                    <th style="width:110px;">Ouverture</th>
                    <th style="width:110px;">Échéance</th>
                    <th style="width:130px;">Statut</th>
                    <th style="width:110px;">Clôture</th>
                    <th style="width:130px;text-align:center;">Actions</th>
                </tr></thead>
                <tbody data-corps="critiques">${mesLignesCritiques()}</tbody>
            </table>
        </div>
    </div>`;
}

function mesMesureDepuisConstatation(constatationId) {
    const c = MES_STATE.data.constatations.find((x) => x.id === constatationId);
    if (!c) return;
    const premiere = mesCategories()[0] || {};
    MES_STATE.mesureEnCours = {
        categorie: premiere.code || '',
        constatation_id: c.id,
        prestataire_id: c.prestataire_id || '',
        objet: c.titre || c.reference || '',
    };
    mesAfficherSlider();
}

// ══════════════════════════════════════
//  Page 5 — Paramètres
// ══════════════════════════════════════

function mesRenderParametres() {
    const P = MES_STATE.data.parametres;
    const editeur = !!P.modifiable;
    const supprimable = !!P.supprimable;

    const lignesCat = mesCategories().map((c) => `<tr>
        <td><strong>${_mesEsc(c.libelle)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);font-family:ui-monospace,Menlo,monospace;">${_mesEsc(c.code)}</div></td>
        <td style="text-align:center;">${mesTypesDe(c.code).length}</td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirCategorie('${c.id}')" title="Modifier">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerCategorie('${c.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">Aucune catégorie.</td></tr>`;

    const lignesType = mesTypes().map((t) => `<tr>
        <td>${_mesEsc(mesLibelleCategorie(t.categorie_code))}</td>
        <td><strong>${_mesEsc(t.libelle)}</strong></td>
        <td class="mes-actions">
            ${editeur ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                onclick="mesOuvrirType('${t.id}')" title="Modifier">${MES_ICONS.edit}</button>` : ''}
            ${supprimable ? `<button class="btn btn-outline btn-sm mes-btn-icone" style="color:#dc2626;border-color:#dc2626;"
                onclick="mesSupprimerType('${t.id}')" title="Supprimer">${MES_ICONS.delete}</button>` : ''}
        </td></tr>`).join('')
        || `<tr><td colspan="3" class="mes-table-vide">Aucun type.</td></tr>`;

    return `
    <div class="mes-page-header">
        <h2>Paramètres</h2>
        <span class="mes-sous-titre">Catégories et types de mesure d'application</span>
    </div>
    <p class="mes-note">
        Ces deux listes peuplent le formulaire de mesure : une mesure porte une catégorie,
        et un type rattaché à cette catégorie. Le code technique ne change pas avec le
        libellé — renommer un type ne détache pas les mesures déjà prises.
    </p>
    <div class="mes-grille-2">
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">Catégories</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirCategorie()">${MES_ICONS.add} Ajouter</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr><th>Libellé</th><th style="width:70px;text-align:center;">Types</th><th style="width:110px;">Actions</th></tr></thead>
                <tbody>${lignesCat}</tbody>
            </table></div>
        </div>
        <div class="mes-card" style="padding:0;">
            <div class="mes-action-bar" style="margin:0;padding:.6rem .8rem;border-bottom:1px solid var(--border);">
                <div class="mes-card-titre" style="margin:0;border:none;padding:0;flex:1;">Types de mesure</div>
                ${editeur ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirType()">${MES_ICONS.add} Ajouter</button>` : ''}
            </div>
            <div class="mes-table-wrap"><table class="mes-table">
                <thead><tr><th style="width:170px;">Catégorie</th><th>Libellé</th><th style="width:110px;">Actions</th></tr></thead>
                <tbody>${lignesType}</tbody>
            </table></div>
        </div>
    </div>`;
}

// ── Modales de paramétrage ──

function mesOuvrirCategorie(id) {
    MES_STATE.categorieEnCours = id
        ? { ...(mesCategories().find((c) => c.id === id) || {}) } : {};
    mesAfficherModal();
}

function mesOuvrirType(id) {
    if (!id && !mesCategories().length) {
        mesToast("Créez d'abord une catégorie.", 'error');
        return;
    }
    MES_STATE.typeEnCours = id ? { ...(mesTypes().find((t) => t.id === id) || {}) } : {};
    mesAfficherModal();
}

function mesFermerModal() {
    MES_STATE.categorieEnCours = null;
    MES_STATE.typeEnCours = null;
    MES_STATE.constatEnCours = null;
    const el = document.getElementById('mesModalRoot');
    if (el) el.innerHTML = '';
}

function mesAfficherModal() {
    const el = document.getElementById('mesModalRoot');
    if (!el) return;
    const c = MES_STATE.categorieEnCours;
    const t = MES_STATE.typeEnCours;
    if (c) {
        el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${c.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>Libellé de la catégorie</label>
                        <input class="mes-input" id="mesCatLib" value="${_mesAttr(c.libelle || '')}"
                               placeholder="ex. Mesure administrative">
                    </div>
                    <p class="mes-erreur" id="mesCatErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">Annuler</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerCategorie()">${MES_ICONS.check} Enregistrer</button>
                </div>
            </div>
        </div>`;
        return;
    }
    if (t) {
        el.innerHTML = `
        <div class="mes-modal-fond" onclick="mesFermerModal()">
            <div class="mes-modal" onclick="event.stopPropagation();">
                <div class="mes-modal-header">
                    <span style="flex:1;">${t.id ? 'Modifier le type' : 'Nouveau type de mesure'}</span>
                    <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerModal()">${MES_ICONS.close}</button>
                </div>
                <div class="mes-modal-body">
                    <div class="mes-champ">
                        <label>Catégorie de rattachement</label>
                        <select class="mes-select" id="mesTypeCat">
                            <option value="">—</option>
                            ${mesCategories().map((x) => `<option value="${_mesAttr(x.code)}"
                                ${t.categorie_code === x.code ? 'selected' : ''}>${_mesEsc(x.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mes-champ">
                        <label>Libellé du type</label>
                        <input class="mes-input" id="mesTypeLib" value="${_mesAttr(t.libelle || '')}"
                               placeholder="ex. Avertissement">
                    </div>
                    <p class="mes-erreur" id="mesTypeErreur"></p>
                </div>
                <div class="mes-modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="mesFermerModal()">Annuler</button>
                    <button class="btn btn-primary btn-sm" onclick="mesEnregistrerType()">${MES_ICONS.check} Enregistrer</button>
                </div>
            </div>
        </div>`;
    }
}

async function mesEnregistrerCategorie() {
    const c = MES_STATE.categorieEnCours || {};
    const libelle = (document.getElementById('mesCatLib') || {}).value || '';
    const err = document.getElementById('mesCatErreur');
    if (!libelle.trim()) { err.textContent = 'Libellé requis'; return; }
    try {
        if (c.id) await mesApi(`/parametres/categories/${c.id}`, { method: 'PUT', body: JSON.stringify({ libelle }) });
        else await mesApi('/parametres/categories', { method: 'POST', body: JSON.stringify({ libelle }) });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast('Catégorie enregistrée');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function mesEnregistrerType() {
    const t = MES_STATE.typeEnCours || {};
    const libelle = (document.getElementById('mesTypeLib') || {}).value || '';
    const categorie = (document.getElementById('mesTypeCat') || {}).value || '';
    const err = document.getElementById('mesTypeErreur');
    if (!categorie) { err.textContent = 'Catégorie requise'; return; }
    if (!libelle.trim()) { err.textContent = 'Libellé requis'; return; }
    const corps = JSON.stringify({ libelle, categorie_code: categorie });
    try {
        if (t.id) await mesApi(`/parametres/types/${t.id}`, { method: 'PUT', body: corps });
        else await mesApi('/parametres/types', { method: 'POST', body: corps });
        mesFermerModal();
        await mesRechargerParametres();
        mesToast('Type enregistré');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

async function mesSupprimerCategorie(id) {
    const c = mesCategories().find((x) => x.id === id) || {};
    if (!confirm(`Supprimer la catégorie « ${c.libelle} » et tous ses types ?`)) return;
    try {
        await mesApi(`/parametres/categories/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast('Catégorie supprimée');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

async function mesSupprimerType(id) {
    const t = mesTypes().find((x) => x.id === id) || {};
    if (!confirm(`Supprimer le type « ${t.libelle} » ?`)) return;
    try {
        await mesApi(`/parametres/types/${id}`, { method: 'DELETE' });
        await mesRechargerParametres();
        mesToast('Type supprimé');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

// ══════════════════════════════════════
//  Formulaire de mesure (volet latéral)
// ══════════════════════════════════════

async function mesOuvrirMesure(id) {
    if (id) {
        try { MES_STATE.mesureEnCours = await mesApi(`/mesures/${id}`); }
        catch (e) { mesToast(e.message || 'Mesure introuvable', 'error'); return; }
    } else {
        const premiere = mesCategories()[0] || {};
        MES_STATE.mesureEnCours = { categorie: premiere.code || '' };
    }
    mesAfficherSlider();
}

function mesFermerSlider() {
    MES_STATE.mesureEnCours = null;
    MES_STATE.sliderOpen = false;
    document.getElementById('mesSlider')?.classList.remove('open');
    document.getElementById('mesSliderOverlay')?.classList.remove('open');
}

function mesAfficherSlider() {
    const el = document.getElementById('mesSlider');
    if (!el) return;
    el.innerHTML = mesFormulaireMesure();
    el.classList.add('open');
    document.getElementById('mesSliderOverlay')?.classList.add('open');
    MES_STATE.sliderOpen = true;
}

function mesFormulaireMesure() {
    const m = MES_STATE.mesureEnCours || {};
    const nouvelle = !m.id;
    const clos = MES_CLOS.includes(m.statut);
    // Une mesure clôturée ou annulée se consulte, elle ne se réécrit plus.
    const ro = clos || !mesPeutEcrire();
    const off = ro ? 'disabled' : '';
    const cat = m.categorie || (mesCategories()[0] || {}).code || '';

    const opt = (v, l, cur) => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;
    const champ = (label, inner) => `<div class="mes-champ"><label>${_mesEsc(label)}</label>${inner}</div>`;

    // Les constatations proposées sont celles du prestataire retenu : lier une
    // mesure à la constatation d'un autre organisme n'aurait pas de sens.
    const consts = MES_STATE.data.constatations
        .filter((c) => !m.prestataire_id || c.prestataire_id === m.prestataire_id);

    const preuves = (genre, label) => {
        const liste = Array.isArray(m[`preuves_${genre}`]) ? m[`preuves_${genre}`] : [];
        const lignes = liste.map((p, i) => `
            <div class="mes-preuve" data-genre="${genre}" data-chemin="${_mesAttr(p.path || '')}">
                <input class="mes-input" value="${_mesAttr(p.nom || p.filename || '')}"
                       placeholder="Intitulé de la pièce" ${off}>
                ${_mesChemin(p.path) ? `<a class="btn btn-outline btn-sm mes-btn-icone" target="_blank"
                    href="${_mesAttr(_mesChemin(p.path))}?nom=${encodeURIComponent(p.nom || '')}" title="Ouvrir">${MES_ICONS.download}</a>` : ''}
                ${ro ? '' : `<button class="btn btn-outline btn-sm mes-btn-icone" title="Retirer"
                    onclick="mesRetirerPreuve('${genre}',${i})">${MES_ICONS.x}</button>`}
            </div>`).join('');
        return champ(label, `
            <div>${lignes || '<div class="mes-preuve-vide">Aucune pièce</div>'}</div>
            ${ro ? '' : `<input type="file" id="mesFichier_${genre}" multiple style="display:none;"
                    onchange="mesTeleverserPreuve('${genre}', this.files)">
                <button class="btn btn-outline btn-sm" style="margin-top:.3rem;"
                        onclick="document.getElementById('mesFichier_${genre}').click()">
                    ${MES_ICONS.add} Ajouter une pièce</button>`}`);
    };

    return `
    <div class="mes-slider-header">
        <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerSlider()"
                title="Retour">${MES_ICONS.back}</button>
        <span class="mes-slider-titre">
            ${nouvelle ? 'Nouvelle mesure' : `Mesure ${_mesEsc(m.reference || '')}`}
        </span>
        ${m.statut ? mesBadgeStatut(m.statut) : ''}
    </div>
    <div class="mes-slider-body">
        ${clos ? '<p class="mes-note">Mesure clôturée ou annulée : elle se consulte, elle ne se modifie plus.</p>' : ''}
        <div class="mes-paire">
            ${champ('Catégorie', `<select class="mes-select" id="mesf_categorie" ${off} onchange="mesFormCategorie(this.value)">
                ${mesCategories().map((c) => opt(c.code, c.libelle, cat)).join('')}</select>`)}
            ${champ('Type de mesure', `<select class="mes-select" id="mesf_type" ${off} onchange="mesFormType(this.value)">
                <option value="">—</option>
                ${mesTypesDe(cat).map((t) => opt(t.code, t.libelle, m.type_mesure)).join('')}</select>`)}
        </div>
        ${mesEstAmende(m.type_mesure)
            ? champ("Montant de l'amende (F CFA)",
                `<input type="number" min="0" class="mes-input" id="mesf_montant"
                        value="${_mesAttr(m.montant_amende || '')}" ${off} placeholder="ex. 500000">`) : ''}
        <div class="mes-paire">
            ${champ('Prestataire', `<select class="mes-select" id="mesf_prestataire" ${off} onchange="mesFormPrestataire(this.value)">
                <option value="">—</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, m.prestataire_id)).join('')}</select>`)}
            ${champ('Constatation liée', `<select class="mes-select" id="mesf_constatation" ${off}>
                <option value="">— Aucune —</option>
                ${consts.map((c) => opt(c.id, `${c.reference}${c.titre ? ` · ${c.titre}` : ''}`, m.constatation_id)).join('')}</select>`)}
        </div>
        ${champ('Objet', `<input class="mes-input" id="mesf_objet" value="${_mesAttr(m.objet || '')}" ${off}>`)}
        ${champ('Description', `<textarea class="mes-input" id="mesf_description" rows="3" ${off}>${_mesEsc(m.description || '')}</textarea>`)}
        <div class="mes-paire">
            ${champ('Niveau de risque', `<select class="mes-select" id="mesf_risque" ${off}>
                ${['', 'faible', 'modéré', 'élevé'].map((r) => opt(r, r || '—', m.niveau_risque)).join('')}</select>`)}
            ${champ('Délai (jours)', `<input type="number" min="0" class="mes-input" id="mesf_delai"
                value="${_mesAttr(m.delai_jours || '')}" ${off} oninput="mesFormDelai()">`)}
        </div>
        <div class="mes-paire">
            ${champ("Date d'émission", `<input type="date" class="mes-input" id="mesf_emission"
                value="${_mesAttr(String(m.date_emission || '').slice(0, 10))}" ${off} onchange="mesFormDelai()">`)}
            ${champ("Date d'échéance", `<input type="date" class="mes-input" id="mesf_echeance"
                value="${_mesAttr(String(m.date_echeance || '').slice(0, 10))}" ${off}>`)}
        </div>
        <div class="mes-paire">
            ${preuves('constatation', 'Pièces à l’appui')}
            ${preuves('cloture', 'Pièces de clôture')}
        </div>
        ${champ('Avis de la Commission administrative',
            `<textarea class="mes-input" id="mesf_avis" rows="2" ${off}>${_mesEsc(m.avis_commission || '')}</textarea>`)}
        ${champ('Motif et considérants',
            `<textarea class="mes-input" id="mesf_motif" rows="2" ${off}>${_mesEsc(m.motif || '')}</textarea>`)}
        ${!nouvelle ? `<p class="mes-preuve-vide">
            ${m.date_notification ? `Notifiée le ${mesDate(m.date_notification)}. ` : ''}
            ${m.date_cloture ? `Clôturée le ${mesDate(m.date_cloture)}.` : ''}
        </p>` : ''}
        <p class="mes-erreur" id="mesFormErreur"></p>
    </div>
    ${ro ? '' : `<div class="mes-slider-footer">
        <button class="btn btn-outline btn-sm" onclick="mesFermerSlider()">Annuler</button>
        <button class="btn btn-primary btn-sm" onclick="mesEnregistrerMesure()">${MES_ICONS.check} Enregistrer</button>
    </div>`}`;
}

// Relit le formulaire sans le redessiner : les changements de catégorie, de
// type et de prestataire doivent conserver ce qui a déjà été saisi.
function mesCollecterFormulaire() {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    if (!document.getElementById('mesf_categorie')) return {};
    const preuves = (genre) => [...document.querySelectorAll(`.mes-preuve[data-genre="${genre}"]`)]
        .map((r) => ({ nom: (r.querySelector('input')?.value || '').trim(), path: r.dataset.chemin || '' }));
    return {
        categorie: v('mesf_categorie'),
        type_mesure: v('mesf_type'),
        prestataire_id: v('mesf_prestataire'),
        constatation_id: v('mesf_constatation'),
        objet: v('mesf_objet'),
        description: v('mesf_description'),
        niveau_risque: v('mesf_risque'),
        delai_jours: v('mesf_delai'),
        date_emission: v('mesf_emission'),
        date_echeance: v('mesf_echeance'),
        avis_commission: v('mesf_avis'),
        motif: v('mesf_motif'),
        montant_amende: v('mesf_montant'),
        preuves_constatation: preuves('constatation'),
        preuves_cloture: preuves('cloture'),
    };
}

const mesMajFormulaire = (patch) => {
    MES_STATE.mesureEnCours = { ...(MES_STATE.mesureEnCours || {}), ...mesCollecterFormulaire(), ...patch };
    mesAfficherSlider();
};

// Changer de catégorie vide le type : les types sont propres à leur catégorie.
const mesFormCategorie = (v) => mesMajFormulaire({ categorie: v, type_mesure: '' });
const mesFormType = (v) => mesMajFormulaire({ type_mesure: v });
// Le champ « Constatation liée » dépend du prestataire — la sélection tombe.
const mesFormPrestataire = (v) => mesMajFormulaire({ prestataire_id: v, constatation_id: '' });

// L'échéance se déduit de la date d'émission et du délai : la saisir deux fois
// ouvre la porte à l'incohérence.
function mesFormDelai() {
    const emission = (document.getElementById('mesf_emission') || {}).value || '';
    const delai = parseInt((document.getElementById('mesf_delai') || {}).value, 10);
    const champ = document.getElementById('mesf_echeance');
    if (!champ || !emission || !Number.isFinite(delai)) return;
    const d = new Date(emission);
    if (Number.isNaN(d.getTime())) return;
    d.setDate(d.getDate() + delai);
    champ.value = d.toISOString().slice(0, 10);
}

async function mesTeleverserPreuve(genre, fichiers) {
    if (!fichiers || !fichiers.length) return;
    const courant = { ...(MES_STATE.mesureEnCours || {}), ...mesCollecterFormulaire() };
    const cle = `preuves_${genre}`;
    courant[cle] = Array.isArray(courant[cle]) ? courant[cle] : [];
    for (const f of fichiers) {
        const fd = new FormData();
        fd.append('file', f);
        try {
            const r = await fetch(`${MES_API}/upload`, { method: 'POST', credentials: 'same-origin', body: fd });
            const d = await r.json();
            if (r.ok && d.status === 'ok') courant[cle].push({ nom: d.filename, path: d.path });
            else mesToast(d.error || 'Téléversement refusé', 'error');
        } catch (e) { mesToast(e.message || 'Téléversement impossible', 'error'); }
    }
    MES_STATE.mesureEnCours = courant;
    mesAfficherSlider();
}

function mesRetirerPreuve(genre, index) {
    const courant = { ...(MES_STATE.mesureEnCours || {}), ...mesCollecterFormulaire() };
    const cle = `preuves_${genre}`;
    if (Array.isArray(courant[cle])) courant[cle].splice(index, 1);
    MES_STATE.mesureEnCours = courant;
    mesAfficherSlider();
}

async function mesEnregistrerMesure() {
    const m = MES_STATE.mesureEnCours || {};
    const data = mesCollecterFormulaire();
    const err = document.getElementById('mesFormErreur');
    if (!data.categorie) { err.textContent = 'Catégorie requise'; return; }
    if (!data.type_mesure) { err.textContent = 'Type de mesure requis'; return; }
    if (!data.prestataire_id) { err.textContent = 'Prestataire requis'; return; }
    if (!data.objet.trim()) { err.textContent = "Objet requis"; return; }
    try {
        if (m.id) await mesApi(`/mesures/${m.id}`, { method: 'PUT', body: JSON.stringify(data) });
        else await mesApi('/mesures', { method: 'POST', body: JSON.stringify(data) });
        mesFermerSlider();
        await mesRechargerMesures();
        mesToast('Mesure enregistrée');
    } catch (e) { err.textContent = e.message || 'Enregistrement impossible'; }
}

// ══════════════════════════════════════
//  Transitions du circuit
// ══════════════════════════════════════

const MES_TRANSITIONS = {
    notifier: { question: 'Notifier cette mesure au prestataire ?', fait: 'Mesure notifiée' },
    engager: { question: 'Engager la mise en œuvre de cette mesure ?', fait: 'Mesure engagée' },
    cloturer: { question: 'Clôturer cette mesure ?', fait: 'Mesure clôturée' },
    annuler: { question: 'Annuler cette mesure ? La trace de la décision reste.', fait: 'Mesure annulée' },
    rouvrir: { question: 'Rouvrir cette mesure clôturée ?', fait: 'Mesure rouverte' },
};

async function mesTransition(id, action) {
    const t = MES_TRANSITIONS[action];
    if (!t || !confirm(t.question)) return;
    try {
        await mesApi(`/mesures/${id}/${action}`, { method: 'POST', body: JSON.stringify({}) });
        await mesRechargerMesures();
        mesToast(t.fait);
    } catch (e) { mesToast(e.message || 'Action impossible', 'error'); }
}

async function mesSupprimerMesure(id) {
    const m = MES_STATE.data.mesures.find((x) => x.id === id) || {};
    if (!confirm(`Supprimer définitivement la mesure ${m.reference || ''} ?`)) return;
    try {
        await mesApi(`/mesures/${id}`, { method: 'DELETE' });
        await mesRechargerMesures();
        mesToast('Mesure supprimée');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

// ══════════════════════════════════════
//  Exports globaux
// ══════════════════════════════════════
// Les gestionnaires `onclick` du balisage cherchent ces fonctions sur `window` ;
// dans l'iframe, une déclaration `const` de haut niveau n'y figure pas.

Object.assign(window, {
    MES_STATE, MES_API, MES_ICONS, MES_NAV, MES_STATUTS,
    mesApi, mesLoadData, mesRenderApp, mesRenderPage, mesNavigateTo,
    mesToggleSidebar, mesSetTheme, mesSetLang, mesRetourPortail, mesDeconnexion,
    mesSetFiltre, mesRechercher, mesResetFiltresDashboard,
    mesResetFiltresMesures, mesResetFiltresCritiques,
    mesOuvrirMesure, mesFermerSlider, mesAfficherSlider, mesEnregistrerMesure,
    mesFormCategorie, mesFormType, mesFormPrestataire, mesFormDelai,
    mesTeleverserPreuve, mesRetirerPreuve,
    mesTransition, mesSupprimerMesure, mesMesureDepuisConstatation,
    mesOuvrirCategorie, mesOuvrirType, mesFermerModal,
    mesEnregistrerCategorie, mesEnregistrerType,
    mesSupprimerCategorie, mesSupprimerType,
});

// ══════════════════════════════════════
//  Constatations relevées par le module
// ══════════════════════════════════════
// Tout ne vient pas d'un acte de surveillance ou d'une inspection sur aire de
// trafic : un signalement, un contrôle inopiné, une saisine appellent aussi une
// mesure. Ces constatations-là se saisissent ici ; celles reçues des autres
// modules restent en lecture seule, chez celui qui les relève.

function mesOuvrirConstat(id) {
    const c = id ? MES_STATE.data.constatations.find((x) => x.id === id) : null;
    MES_STATE.constatEnCours = c ? { ...c } : {};
    mesAfficherVolet();
}

// Volet de saisie : la moitié de l'écran, bordé de rouge — c'est une
// carence qu'on inscrit, la couleur le dit avant le titre.
function mesAfficherVolet() {
    const el = document.getElementById('mesVoletRoot');
    if (!el) return;
    const k = MES_STATE.constatEnCours;
    if (!k) { el.innerHTML = ''; return; }
    el.innerHTML = mesConstatFormulaire(k);
    requestAnimationFrame(() => {
        el.querySelector('.mes-volet')?.classList.add('ouvert');
        el.querySelector('.mes-volet-fond')?.classList.add('ouvert');
    });
}

function mesFermerVolet() {
    MES_STATE.constatEnCours = null;
    const el = document.getElementById('mesVoletRoot');
    if (el) el.innerHTML = '';
}

function mesConstatFormulaire(k) {
    const champ = (id, label, valeur, extra) => `
        <div class="mes-champ">
            <label>${_mesEsc(label)}</label>
            <input class="mes-input" id="${id}" value="${_mesAttr(valeur || '')}" ${extra || ''}>
        </div>`;
    return `
    <div class="mes-volet-fond" onclick="mesFermerVolet()"></div>
    <div class="mes-volet" role="dialog" aria-label="Carence">
        <div class="mes-volet-entete">
            <span style="flex:1;">${k.id ? 'Modifier la carence' : 'Nouvelle carence'}</span>
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerVolet()">${MES_ICONS.close}</button>
        </div>
        <div class="mes-volet-corps">
            <p class="mes-note">
                Une carence saisie ici ne provient d'aucun autre module : elle appelle une
                mesure au même titre que les écarts critiques reçus.
            </p>
            ${champ('mesConstTitre', 'Objet', k.titre, 'placeholder="ex. Défaut de suivi de navigabilité"')}
            <div class="mes-champ">
                <label>Description</label>
                <textarea class="mes-input" id="mesConstDesc" rows="5"
                          placeholder="Ce qui a été constaté">${_mesEsc(k.description || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>Prestataire</label>
                <select class="mes-select" id="mesConstPrest">
                    <option value="">—</option>
                    ${MES_STATE.data.prestataires.map((p) => `<option value="${_mesAttr(p.id)}"
                        ${k.prestataire_id === p.id ? 'selected' : ''}>${_mesEsc(p.nom)}</option>`).join('')}
                </select>
            </div>
            ${champ('mesConstSource', 'Origine du constat', k.origine_libelle,
                'placeholder="ex. Signalement, contrôle inopiné, saisine"')}
            <div class="mes-grille-3">
                ${champ('mesConstOuverture', 'Ouverture', k.date_ouverture,
                    'type="date" oninput="mesConstatDelai(\'ouverture\')"')}
                ${champ('mesConstDelai', 'Délai (jours)', k.delai_jours,
                    'type="number" min="0" placeholder="ex. 30" oninput="mesConstatDelai(\'delai\')"')}
                ${champ('mesConstEcheance', 'Clôture', k.date_due_cloture,
                    'type="date" oninput="mesConstatDelai(\'echeance\')"')}
            </div>
            <p class="mes-erreur" id="mesConstErreur"></p>
        </div>
        <div class="mes-volet-pied">
            <button class="btn btn-outline btn-sm" onclick="mesFermerVolet()">Annuler</button>
            <button class="btn btn-primary btn-sm" onclick="mesEnregistrerConstat()">
                ${MES_ICONS.check} Enregistrer</button>
        </div>
    </div>`;
}

async function mesEnregistrerConstat() {
    const k = MES_STATE.constatEnCours || {};
    const err = document.getElementById('mesConstErreur');
    const val = (id) => (document.getElementById(id) || {}).value || '';
    const corps = {
        delai_jours: val('mesConstDelai'),
        titre: val('mesConstTitre').trim(),
        description: val('mesConstDesc').trim(),
        prestataire_id: val('mesConstPrest'),
        origine_libelle: val('mesConstSource').trim(),
        date_ouverture: val('mesConstOuverture'),
        date_due_cloture: val('mesConstEcheance'),
    };
    if (!corps.titre) { if (err) err.textContent = 'Objet requis'; return; }
    try {
        await mesApi(k.id ? `/constatations/${k.id}` : '/constatations', {
            method: k.id ? 'PUT' : 'POST',
            body: JSON.stringify(corps),
        });
        mesFermerVolet();
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesRenderPage();
        mesToast(k.id ? 'Carence modifiée' : 'Carence ajoutée');
    } catch (e) {
        if (err) err.textContent = e.message || 'Enregistrement impossible';
    }
}

async function mesSupprimerConstat(id) {
    const c = MES_STATE.data.constatations.find((x) => x.id === id) || {};
    if (!confirm(`Supprimer la carence ${c.reference || ''} ?`)) return;
    try {
        await mesApi(`/constatations/${id}`, { method: 'DELETE' });
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesRenderPage();
        mesToast('Carence supprimée');
    } catch (e) { mesToast(e.message || 'Suppression impossible', 'error'); }
}

// Classer : l'autorité décide qu'aucune suite ne sera donnée. La carence
// reste inscrite — c'est la décision qui la clôt, non son effacement.
async function mesClasserCarence(id) {
    const c = MES_STATE.data.constatations.find((x) => x.id === id) || {};
    const motif = prompt(`Classer la carence ${c.reference || ''} sans suite.\nMotif :`, '');
    if (motif === null) return;
    try {
        await mesApi(`/constatations/${id}/classer`, {
            method: 'POST', body: JSON.stringify({ motif: motif.trim() }),
        });
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesRenderPage();
        mesToast('Carence classée sans suite');
    } catch (e) { mesToast(e.message || 'Classement impossible', 'error'); }
}

// Délai et échéance disent la même chose de deux façons : renseigner l'un
// remplit l'autre, à partir de la date d'ouverture. La dernière saisie
// commande — on ne réécrit jamais le champ que l'agent est en train de remplir.
function mesConstatDelai(source) {
    const el = (id) => document.getElementById(id);
    const ouverture = (el('mesConstOuverture') || {}).value || '';
    if (!ouverture) return;
    const jour = 86400000;
    const debut = new Date(`${ouverture}T00:00:00`);
    if (Number.isNaN(debut.getTime())) return;

    if (source !== 'echeance') {
        const jours = Number((el('mesConstDelai') || {}).value);
        if (!Number.isFinite(jours) || jours < 0) return;
        el('mesConstEcheance').value = new Date(debut.getTime() + jours * jour)
            .toISOString().slice(0, 10);
        return;
    }
    const echeance = (el('mesConstEcheance') || {}).value || '';
    const fin = new Date(`${echeance}T00:00:00`);
    if (Number.isNaN(fin.getTime())) return;
    el('mesConstDelai').value = Math.max(0, Math.round((fin - debut) / jour));
}

// ── Répartition : le modèle du module « Exécution de la Surveillance » ──
// Un camembert porte le total en son centre — il suit les filtres du tableau
// de bord — et, à côté, chaque part se lit en clair : intitulé, effectif, et
// une barre qui dit son poids relatif.
function mesRepartition(segments, options) {
    const o = options || {};
    const avecCamembert = o.camembert !== false;
    // Une part cliquable commande un autre graphique : l'appelant dit lequel.
    const action = o.action || '';
    const retenue = o.retenue || '';
    const infobulle = o.infobulle || 'Filtrer';
    const parts = (segments || []).filter((s) => s && s.value > 0);
    const total = (segments || []).reduce((n, s) => n + (s.value || 0), 0);
    const max = Math.max(1, ...(segments || []).map((s) => s.value || 0));

    // Le camembert se dessine en dégradé conique : aucune bibliothèque, et la
    // part se calcule au pourcentage près.
    let angle = 0;
    const tranches = parts.map((s) => {
        const debut = angle;
        angle += (s.value / total) * 100;
        return `${s.color} ${debut}% ${angle}%`;
    });
    const camembert = !avecCamembert ? '' : (total
        ? `<div class="mes-camembert" style="background:conic-gradient(${tranches.join(', ')});">
               <div class="mes-camembert-creux">
                   <strong>${total}</strong>
                   <span>mesure${total > 1 ? 's' : ''}</span>
               </div>
           </div>`
        : '<div class="mes-camembert vide"><div class="mes-camembert-creux"><strong>0</strong></div></div>');

    return `
    <div class="mes-repartition">
        ${camembert}
        <table class="mes-repartition-tab">
            <tbody>
                ${(segments || []).map((s) => {
                    // Une part porteuse d'une clé commande un autre graphique :
                    // on la désigne comme telle, et un second clic la relâche.
                    const actif = s.cle && s.cle === retenue;
                    const attrs = s.cle && action
                        ? ` class="cliquable${actif ? ' actif' : ''}" role="button" tabindex="0"
                            title="${_mesAttr(infobulle)}" onclick="${action}('${s.cle}')"`
                        : '';
                    return `
                <tr${attrs}>
                    <td><span class="mes-repartition-badge" style="background:${s.color};">${_mesEsc(s.label)}</span></td>
                    <td class="num">${s.value || 0}</td>
                    <td>
                        <div class="mes-repartition-piste">
                            <div class="mes-repartition-barre"
                                 style="width:${Math.round(((s.value || 0) / max) * 100)}%;background:${s.color};"></div>
                        </div>
                    </td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// Retenir une source de carence, ou la relâcher si elle l'était déjà.
function mesGrapheSource(cle) {
    MES_STATE.sourceGraphe = MES_STATE.sourceGraphe === cle ? '' : cle;
    mesRenderPage();
}

// Retenir une catégorie, ou la relâcher si elle l'était déjà.
function mesGrapheCategorie(code) {
    MES_STATE.categorieGraphe = MES_STATE.categorieGraphe === code ? '' : code;
    mesRenderPage();
}
