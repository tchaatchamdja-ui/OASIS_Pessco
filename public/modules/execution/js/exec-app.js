/**
 * PESSCO - Module 3 : Execution de la Surveillance
 * SPA: Dashboard, Plans Valides, Declenchement & Notifications, Execution,
 *      Prestataires, Constatations (FNC/PAC), Rapports d'Audit
 */

const EXEC_MODULE_API = '/api/m/execution';

// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════

const EXEC_STATE = {
    user: null,
    lang: 'fr',
    theme: 'blue-dark',
    currentPage: 'dashboard',
    currentConstSub: 'suivi',
    sidebarCollapsed: localStorage.getItem('exec_sidebar') === 'true',
    data: {},
    filters: {
        domaine: '', secteur: '', prestataire: '', statut: '', search: '', annee: String(new Date().getFullYear()), trimestre: '', criticite: '',
        type_supervision: '', mode_supervision: '', avancement: ''
    },
    // Plan surveillance tabs
    planTab: 'plan', // plan | liste_activites
    // Declenchement tabs
    triggerTab: 'a_notifier', // a_notifier | brouillons | soumis | envoyes
    // Current open items
    selectedNotification: null,
    selectedDossier: null,
    selectedConstatation: null,
    selectedRapport: null,
    // Slider state
    sliderOpen: false,
    sliderContent: '',
    sliderSize: 'lg',
    // Async request guard for dossier loading
    _dossierRequestId: 0
};

// ══════════════════════════════════════
//  ICONS
// ══════════════════════════════════════

const EXEC_ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    plans: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    trigger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>',
    execution: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    prestataires: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    constatations: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    rapports: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    sync: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    pdf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    clipboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
    folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
    alarm: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6"/><path d="M22 6l-3-3"/></svg>',
    flag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 15V4h13l-2 4 2 4H4z"/><line x1="4" y1="4" x2="4" y2="21" fill="none"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    reset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    tasks: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    // Icône « Échanges » : deux bulles de discussion
    chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13a5 5 0 0 1 5-5h4a5 5 0 0 1 0 10h-1v3l-4-3h-3a5 5 0 0 1-1-9.9"/><path d="M16 8V7a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v4a5 5 0 0 0 3 4.58"/></svg>',
    // Icône « Ouvrir » : dossier ouvert
    openFolder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l1.5-3.5A2 2 0 0 1 9.3 9H21a1 1 0 0 1 .95 1.32l-1.9 5.66A2 2 0 0 1 18.16 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h7a2 2 0 0 1 2 2v1"/></svg>',
    // Icône « Contact » : carte de contact / répertoire
    contact: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4"/><line x1="2" y1="8" x2="4" y2="8"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="2" y1="16" x2="4" y2="16"/><circle cx="11" cy="10" r="2.5"/><path d="M7.5 17a3.5 3.5 0 0 1 7 0"/></svg>',
    // Icône « Annuler / retour brouillon » : flèche de retour en arrière
    undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
    // Icône « Items » : liste à puces — le contenu d'une checklist.
    list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor"/></svg>',
    // Icône « Sous-thèmes » : strates empilées.
    layers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8 12 14 2 8 12 2"/><polyline points="2 13 12 19 22 13"/></svg>',
    // Icône « Renseigner l'activité » : formulaire avec crayon
    fillForm: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="12" y2="13"/><line x1="8" y1="17" x2="10" y2="17"/><path d="M18.5 13.5a1.6 1.6 0 0 1 2.3 2.3L16.8 19.8 14 20.5l0.7-2.8z"/></svg>'
};

// ══════════════════════════════════════
//  NAVIGATION CONFIG
// ══════════════════════════════════════

// Le menu « États » remplace « Déclenchement », « Dossiers » et « Exécution » :
// il reprend leurs listes pour donner la situation d'ensemble des activités,
// dont le détail se conduit depuis le processus d'une activité.
const EXEC_NAV = {
    dashboard: { labelKey: 'dashboard', icon: 'dashboard' },
    plan_surveillance: { labelKey: 'plan_surveillance', icon: 'plans' },
    etats: { labelKey: 'etats', icon: 'folder' },
    constatations: { labelKey: 'constatations', icon: 'constatations' },
    rapports: { labelKey: 'rapports', icon: 'rapports' },
    // Réservé aux administrateurs et gestionnaires : execUpdateNavUI le retire
    // de la barre pour les autres.
    processus: { labelKey: 'processus', icon: 'trigger', reserve: 'admin' },
    parametres: { labelKey: 'parametres', icon: 'settings' }
};

// Navigation for M3_Prestataire users — the "Mes Activités" workspace.
// Uses the same page keys as AAC (dashboard, constatations, rapports) so
// the existing rendering functions can be reused, plus a dedicated
// 'prestataire_notifications' page for the "Notification d'activité" entry.
const EXEC_NAV_PRESTATAIRE = {
    dashboard: { labelKey: 'dashboard', icon: 'dashboard' },
    prestataire_notifications: { labelKey: 'notification_activite', icon: 'trigger' },
    rapports: { labelKey: 'rapports', icon: 'rapports' },
    constatations: { labelKey: 'constatations', icon: 'constatations' },
    mes_utilisateurs: { labelKey: 'mes_utilisateurs', icon: 'prestataires' }
};

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

// L'échappement vient du socle (oasis-commun.js) : un seul barème pour tous
// les modules. Le nom demeure, les gabarits n'ont rien à changer.
function _esc(v) { return oasisEsc(v); }

// Valeur destinée à un attribut : `_esc` laisse passer les guillemets, qui y
// refermeraient l'attribut. Tout texte saisi peut en contenir.
function _escAttr(v) { return oasisEsc(v); }

// URL de téléchargement d'une pièce jointe — ajoute le token (route /uploads protégée).
function _execDl(p) {
    if (!p) return '';
    return p + (p.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(localStorage.getItem('pr_token') || '');
}

// Normalise une valeur (minuscule + suppression accents) pour comparer à une
// valeur stockée historiquement (ex. "mineure", "isole"...).
function _execNorm(v) {
    return (v == null ? '' : String(v)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Options <option> pour la criticité — source : paramètres exec_criticites.
// value = item normalisé (pour rester compatible avec les anciennes valeurs
// stockées critique/majeure/mineure), label = item (affiché).
function _execCriticiteOptions(selected) {
    const crits = EXEC_STATE.data.criticites || [];
    const sel = _execNorm(selected);
    if (!crits.length) {
        // Fallback si les paramètres ne sont pas encore chargés.
        return ['critique', 'majeure', 'mineure'].map(v =>
            `<option value="${v}" ${sel === v ? 'selected' : ''}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`
        ).join('');
    }
    return crits.map(c => {
        const val = _execNorm(c.item);
        // L'alias (s'il est défini) est la valeur affichée dans la liste déroulante
        return `<option value="${_escAttr(val)}" data-delai="${c.delai_cloture || ''}" ${sel === val ? 'selected' : ''}>${_esc(c.alias || c.item)}</option>`;
    }).join('');
}

// Retourne le délai de clôture (jours) paramétré pour une valeur de criticité.
// Si aucune valeur n'est fournie (ou introuvable), retourne le délai de la 1re
// criticité définie en paramètres — qui correspond à l'option sélectionnée par
// défaut dans le <select>.
function _execCriticiteDelai(criticiteValue) {
    const crits = EXEC_STATE.data.criticites || [];
    if (!crits.length) return '';
    const v = _execNorm(criticiteValue);
    const match = v ? crits.find(c => _execNorm(c.item) === v) : null;
    const c = match || crits[0];
    return (c && c.delai_cloture) ? String(c.delai_cloture) : '';
}

// Options <option> pour le type de cas — source : paramètres exec_types_cas.
function _execTypeCasOptions(selected, includeEmpty) {
    const tcs = EXEC_STATE.data.typesCas || [];
    const sel = _execNorm(selected);
    const head = includeEmpty !== false ? `<option value="">${te('select_option')}</option>` : '';
    if (!tcs.length) {
        return head + ['isole', 'recurrent'].map(v =>
            `<option value="${v}" ${sel === v ? 'selected' : ''}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`
        ).join('');
    }
    return head + tcs.map(t => {
        const val = _execNorm(t.item);
        return `<option value="${_escAttr(val)}" ${sel === val ? 'selected' : ''}>${_esc(t.item)}</option>`;
    }).join('');
}

function _execStatusColor(status) {
    const colors = {
        brouillon: '#f59e0b', soumis: '#3b82f6', valide: '#10b981', rejete: '#ef4444',
        envoye: '#8b5cf6', acte: '#059669',
        direct_brouillon: '#f59e0b', direct_soumis: '#3b82f6', direct_valide: '#10b981', direct_rejete: '#ef4444', direct_renvoye: '#f97316',
        ouverte: '#3b82f6', ouvert: '#3b82f6', pac_soumis: '#8b5cf6', pac_valide: '#10b981',
        pac_rejetee: '#f97316', soldee: '#6b7280',
        cloture: '#10b981', en_cours: '#f59e0b',
        transmis: '#059669',
        critique: '#ef4444', majeur: '#f97316', mineur: '#eab308'
    };
    return colors[status] || '#6b7280';
}

function _execStatusBadge(status) {
    const color = _execStatusColor(status);
    const label = te(status) || status;
    return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

function _execGraviteBadge(gravite) {
    const map = { critique: '#ef4444', majeure: '#f97316', majeur: '#f97316', mineure: '#eab308', mineur: '#eab308' };
    const color = map[gravite] || '#6b7280';
    const label = gravite ? gravite.charAt(0).toUpperCase() + gravite.slice(1) : '-';
    return `<span class="status-badge" style="background:${color}15;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

function _formatDate(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

function _formatDatetime(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return d; }
}

function _daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
}

function _daysUntilBadge(dateStr) {
    const days = _daysUntil(dateStr);
    if (days === null) return '-';
    let color = '#10b981';
    if (days <= 7) color = '#ef4444';
    else if (days <= 15) color = '#f59e0b';
    else if (days <= 30) color = '#3b82f6';
    return `<span style="color:${color};font-weight:600;">J-${Math.max(0, days)}</span>`;
}

// ══════════════════════════════════════
//  ROLE HELPERS
// ══════════════════════════════════════

function _userM3Role() {
    return EXEC_STATE.user?.role_m3 || 'M3_Non Autorise';
}

function _execCanValidate() { return ['M3_Validateur', 'M3_Administrateur'].includes(_userM3Role()); }
function _execCanContribute() { return ['M3_Contributeur', 'M3_Validateur', 'M3_Administrateur', 'M3_Prestataire'].includes(_userM3Role()); }
// ── Les deux seules notions d'autorité du module ─────────────────────
// Elles étaient trois, appliquées sans règle à des actions de même gravité :
// un agent pouvait réinitialiser une activité sans pouvoir configurer un
// processus, ou l'inverse. Deux suffisent, et elles se nomment.
//
//   gouverne le module  — le Gestionnaire au sens de « Gestion des Droits » :
//     il paramètre, supprime, réinitialise, configure les processus, et sert
//     de porte de sortie quand un processus est mal renseigné.
//   administre le parc  — un compte portail SUPERADMIN ou ADMIN, dans sa
//     portée de validation : il range (archivage) et arrête des circuits, sur
//     les domaines et secteurs qui lui sont confiés. Le serveur revérifie.
function _execGouverneModule() { return _userM3Role() === 'M3_Administrateur'; }
function _execAdministreParc() {
    return ['SUPERADMIN', 'ADMIN'].includes((EXEC_STATE.user || {}).role) && _execCanValidate();
}
// Nom historique, conservé pour les écrans repris de PESSCO.
function _execIsAdmin() { return _execGouverneModule(); }
function _execIsPrestataire() { return _userM3Role() === 'M3_Prestataire'; }

// Prestataires auxquels un compte en mode prestataire est rattaché — `null`
// pour tous les autres comptes, qui ne sont bornés par rien ici.
// Un compte peut en porter plusieurs : `prestataires` prime, `prestataire_id`
// reste la forme historique à un seul rattachement.
function _execPrestatairesDuCompte() {
    if (!_execIsPrestataire()) return null;
    const u = EXEC_STATE.user || {};
    let liste = u.prestataires;
    if (typeof liste === 'string') { try { liste = JSON.parse(liste); } catch (e) { liste = null; } }
    if (Array.isArray(liste) && liste.length) return liste;
    return u.prestataire_id ? [u.prestataire_id] : [];
}

// Le filtre prestataire du compte : celui qu'il a choisi, ou tous les siens.
function _execPortePrestataire(choisi) {
    const miens = _execPrestatairesDuCompte();
    if (!miens) return null;
    if (choisi && miens.includes(choisi)) return [choisi];
    return miens;
}

// Role distinction for the PAC follow-up workflow.
// AAC = inspector that can validate / reject / close. Postulant = applicant filling the PAC.
function _execIsAAC() { return _execCanValidate(); }

// ══════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════

window.initExecutionModule = function() {
    EXEC_STATE.user = window.PESSCO?.user || JSON.parse(localStorage.getItem('pr_user') || 'null');
    EXEC_STATE.lang = window.PESSCO?.lang || localStorage.getItem('pr_lang') || 'fr';
    EXEC_STATE.theme = window.PESSCO?.theme || localStorage.getItem('pr_theme') || 'blue-dark';
    if (!EXEC_STATE.user) { window.location.href = '/login'; return; }
    document.documentElement.setAttribute('data-theme', EXEC_STATE.theme);
    // Hydrate any fields that may be missing from older cached login payloads
    // (notably prestataire_id for M3_Prestataire users).
    _execHydrateUser().then(() => execLoadData()).then(() => {
        execRenderApp();
        execNavigateTo('dashboard');
        execUpdateNotifBadge();
    });
};

async function _execHydrateUser() {
    try {
        const u = EXEC_STATE.user || {};
        // Always refresh from /api/auth/me so prestataire_id and role_m3 are up to date.
        const me = await api('/api/auth/me').catch(() => null);
        if (me && me.id) {
            EXEC_STATE.user = { ...u, ...me };
            try {
                const cached = JSON.parse(localStorage.getItem('pr_user') || 'null') || {};
                localStorage.setItem('pr_user', JSON.stringify({ ...cached, ...me }));
            } catch (_) {}
            if (window.PESSCO) window.PESSCO.user = { ...(window.PESSCO.user || {}), ...me };
        }
    } catch (e) {
        console.warn('Could not hydrate user profile', e);
    }
}

// Le module ne se monte qu'une fois, depuis index.html, qui attend le contexte
// du serveur. Ce second démarrage montait l'écran sur le seul compte gardé en
// mémoire du navigateur : il s'ouvrait donc à un compte dont le contexte
// venait d'être refusé.

// ══════════════════════════════════════
//  DATA LOADING
// ══════════════════════════════════════

async function execLoadData() {
    try {
        const shared = window.PESSCO?.sharedData || {};
        const cached = EXEC_STATE.data || {};

        // ── Parallel fetch: dynamic (always) + static reference (once per session)
        const needsStatic = !cached._staticLoaded;
        const fetches = [
            api(`${EXEC_MODULE_API}/dashboard-stats`).catch(() => ({})),   // 0
            api(`${EXEC_MODULE_API}/plans-valides`).catch(() => []),        // 1
            api(`${EXEC_MODULE_API}/notifications`).catch(() => []),        // 2
            api(`${EXEC_MODULE_API}/dossiers`).catch(() => []),             // 3
            api(`${EXEC_MODULE_API}/constatations`).catch(() => []),        // 4
            api(`${EXEC_MODULE_API}/rapports`).catch(() => []),             // 5
            api('/api/m/planification/plans').catch(() => []),              // 6
            api('/api/m/planification/all-activites').catch(() => []),      // 7
        ];
        if (needsStatic) {
            fetches.push(
                api(`${EXEC_MODULE_API}/criticites`).catch(() => []),       // 8
                api(`${EXEC_MODULE_API}/types-cas`).catch(() => []),        // 9
                shared.domaines      ? Promise.resolve(shared.domaines)      : api('/api/domaines').catch(() => []),
                shared.secteurs      ? Promise.resolve(shared.secteurs)      : api('/api/secteurs').catch(() => []),
                shared.sousActivites ? Promise.resolve(shared.sousActivites) : api('/api/sous-activites').catch(() => []),
                shared.prestataires  ? Promise.resolve(shared.prestataires)  : api('/api/prestataires').catch(() => []),
                shared.inspecteurs   ? Promise.resolve(shared.inspecteurs)   : api('/api/inspecteurs').catch(() => []),
                shared.aac           ? Promise.resolve(shared.aac)           : api('/api/aac').catch(() => ({})),
                shared.typesSupervision  ? Promise.resolve(shared.typesSupervision)  : api('/api/types-supervision').catch(() => []),
                shared.modesSupervision  ? Promise.resolve(shared.modesSupervision)  : api('/api/modes-supervision').catch(() => []),
                shared.themesSupervision ? Promise.resolve(shared.themesSupervision) : api('/api/themes-supervision').catch(() => []),
                shared.exigences     ? Promise.resolve(shared.exigences)     : api('/api/exigences').catch(() => [])
            );
        }

        const results = await Promise.all(fetches);
        const [dashStats, plansValides, notifications, dossiers, constatations, rapports,
               planifPlans, planifActs] = results;

        EXEC_STATE.data = Object.assign(cached, {
            dashStats, plansValides, notifications, dossiers, constatations, rapports,
        });

        if (needsStatic) {
            const [criticites, typesCas, domaines, secteurs, sousActivites, prestataires,
                   inspecteurs, aac, typesSupervision, modesSupervision, themesSupervision, exigences]
                = results.slice(8);
            Object.assign(EXEC_STATE.data, {
                criticites, typesCas, domaines, secteurs, sousActivites, prestataires,
                inspecteurs, aac, typesSupervision, modesSupervision, themesSupervision, exigences,
                _staticLoaded: true
            });
        }

        EXEC_STATE.data.plansValidesPlanif = _buildPlansValidesFromPlanif(planifPlans, planifActs);
        EXEC_STATE.data.plansArchivesPlanif = _buildPlansArchivesFromPlanif(planifPlans, planifActs);
        // Lignée des activités : amender un plan recopie ses activités dans la
        // version suivante, la copie portant la racine de l'originale. Une
        // activité déjà déclenchée ne s'amende pas — sa copie est donc la même
        // activité, et le processus ouvert sur la version précédente lui
        // appartient. La table dit, pour chaque identifiant connu, la racine de
        // sa lignée ; les écrans y résolvent notification et dossier.
        EXEC_STATE.data.racineActivite = {};
        (planifActs || []).forEach((a) => {
            if (a && a.id) EXEC_STATE.data.racineActivite[a.id] = a.parent_activite_id || a.id;
        });
        // Cycles de surveillance : ils bornent la période d'analyse dès qu'un
        // prestataire est retenu. La source reste « Plans de Surveillance ».
        api('/api/m/planification/prestataires-risques')
            .then((liste) => { EXEC_STATE.data.cyclesPrestataires = liste || []; })
            .catch(() => { EXEC_STATE.data.cyclesPrestataires = []; });
        // Charge les checklists (mode minimal — chargement séparé, ignoré si tables vides)
        execRefreshChecklists().catch(() => {});
        // Rôles d'équipe : ils garnissent la composition de l'équipe à
        // l'étape Réalisation, donc dès le premier écran ouvert.
        execChargerRolesEquipe().catch(() => {});
    } catch (e) {
        console.error('Execution data load error:', e);
    }
}

// ── Lignée d'une activité ──
// `racine` : l'identifiant partagé par toutes les copies d'une même activité au
// fil des versions du plan. Une notification ouverte sur une version archivée
// suit sa lignée : la version suivante retrouve son processus, déjà avancé,
// plutôt que de le rouvrir à zéro.
function execRacineActivite(activite) {
    const a = activite || {};
    const id = typeof a === 'string' ? a : a.id;
    const table = (EXEC_STATE.data && EXEC_STATE.data.racineActivite) || {};
    return (typeof a === 'object' && a.parent_activite_id) || table[id] || id || '';
}

function execNotifDeActivite(activite, notifications) {
    const racine = execRacineActivite(activite);
    if (!racine) return null;
    const liste = notifications || (EXEC_STATE.data && EXEC_STATE.data.notifications) || [];
    // La notification de la copie courante prime ; à défaut, celle qu'une
    // version précédente de la même activité a ouverte.
    const id = (typeof activite === 'object' ? activite.id : activite) || '';
    return liste.find((n) => n.activite_id === id)
        || liste.find((n) => execRacineActivite(n.activite_id) === racine)
        || null;
}

/**
 * Lightweight post-mutation refresh: re-fetches only the 5 mutable collections
 * (dossiers, constatations, rapports, notifications, dashStats) without reloading
 * static reference data (domaines, secteurs, prestataires…).
 * Use this instead of execLoadData() after create/update/delete operations.
 */
async function execRefreshDynamic() {
    try {
        const [dashStats, notifications, dossiers, constatations, rapports] = await Promise.all([
            api(`${EXEC_MODULE_API}/dashboard-stats`).catch(() => EXEC_STATE.data.dashStats || {}),
            api(`${EXEC_MODULE_API}/notifications`).catch(() => EXEC_STATE.data.notifications || []),
            api(`${EXEC_MODULE_API}/dossiers`).catch(() => EXEC_STATE.data.dossiers || []),
            api(`${EXEC_MODULE_API}/constatations`).catch(() => EXEC_STATE.data.constatations || []),
            api(`${EXEC_MODULE_API}/rapports`).catch(() => EXEC_STATE.data.rapports || []),
        ]);
        Object.assign(EXEC_STATE.data, { dashStats, notifications, dossiers, constatations, rapports });
        // Les délais du processus (menu Paramètres) fondent l'horizon « à
        // déclencher » et les retards : ils se chargent avec le reste.
        if (typeof execEtatsChargerDelais === 'function') await execEtatsChargerDelais();
        // Keep selectedDossier in sync if open. On re-fetch le dossier *unitairement*
        // car l'endpoint /dossiers (liste) n'attache pas les sous-tableaux
        // (constatations, rapports) — sinon la section Constatations resterait obsolète.
        if (EXEC_STATE.selectedDossier?.id) {
            const did = EXEC_STATE.selectedDossier.id;
            try {
                const fullDossier = await api(`${EXEC_MODULE_API}/dossiers/${did}`);
                if (fullDossier && fullDossier.id) EXEC_STATE.selectedDossier = fullDossier;
            } catch (e) {
                const fresh = dossiers.find(d => d.id === did);
                if (fresh) EXEC_STATE.selectedDossier = fresh;
            }
        }
    } catch (e) {
        console.error('execRefreshDynamic error:', e);
    }
}

// Build a [{...plan, activites: [...]}] list from Module 2 data, keeping only
// plans whose statut is 'valide'. Activities are enriched with prestataire_nom
// (looked up from the shared prestataires list) so the accordion view can
// display them without relying on the execution-side sync.
function _buildPlansValidesFromPlanif(planifPlans, planifActs) {
    const plans = (planifPlans || []).filter(p => p.statut === 'valide');
    const prestMap = {};
    (EXEC_STATE.data?.prestataires || window.PESSCO?.sharedData?.prestataires || []).forEach(pr => {
        prestMap[pr.id] = pr;
    });
    const byPlanId = {};
    (planifActs || []).forEach(a => {
        if (a.plan_statut !== 'valide') return;
        const pid = a.plan_id;
        if (!byPlanId[pid]) byPlanId[pid] = [];
        const pr = prestMap[a.prestataire_id];
        byPlanId[pid].push({
            ...a,
            prestataire_nom: a.prestataire_nom || (pr ? pr.nom : ''),
            prestataire_code: a.prestataire_code || (pr ? pr.trigramme : '')
        });
    });
    const valides = plans.map(p => ({
        ...p,
        activites: byPlanId[p.id] || [],
        nb_activites: (byPlanId[p.id] || []).length
    }));

    // Activités sorties des archives une à une : leur plan reste archivé, mais
    // elles reviennent parmi les activités en cours. Le plan reparaît alors
    // réduit à ces seules lignes — sans quoi elles n'auraient nulle part où
    // s'afficher.
    //
    // Sauf si la version en vigueur porte déjà la même activité : une lignée
    // reprise par un amendement s'y trouve à jour, et la ressortir des archives
    // faisait paraître deux versions du même plan sur l'écran des activités,
    // avec deux fois la même ligne. L'activité reste alors aux archives, où
    // elle se consulte.
    const racinesEnVigueur = new Set();
    valides.forEach(p => (p.activites || []).forEach(a => {
        racinesEnVigueur.add(a.parent_activite_id || a.id);
    }));
    const rendues = {};
    (planifActs || []).forEach(a => {
        if (Number(a.desarchivee) !== 1 || a.plan_statut === 'valide') return;
        if (racinesEnVigueur.has(a.parent_activite_id || a.id)) return;
        const pr = prestMap[a.prestataire_id];
        (rendues[a.plan_id] = rendues[a.plan_id] || []).push({
            ...a,
            prestataire_nom: a.prestataire_nom || (pr ? pr.nom : ''),
            prestataire_code: a.prestataire_code || (pr ? pr.trigramme : ''),
        });
    });
    Object.keys(rendues).forEach(pid => {
        const p = (planifPlans || []).find(x => x.id === pid);
        if (!p) return;
        valides.push({
            ...p, _planArchive: true,
            activites: rendues[pid], nb_activites: rendues[pid].length,
        });
    });
    return valides;
}

// Racine d'un plan : le premier de sa lignée de versions. Toutes les versions
// d'un même plan la partagent, quelle qu'ait été leur fin.
function _execRacinePlan(plan, parId, vus) {
    const seen = vus || new Set();
    let courant = plan;
    while (courant && courant.parent_plan_id && !seen.has(courant.id)) {
        seen.add(courant.id);
        const parent = parId[courant.parent_plan_id];
        if (!parent) break;
        courant = parent;
    }
    return courant ? courant.id : (plan && plan.id) || '';
}

// Plans archivés : ceux qu'on a rangés délibérément, et dont aucune version
// suivante n'est en vigueur. Une version plus ancienne d'un plan en cours n'a
// rien à faire ici : le suivi des versions appartient à « Planification », et
// le processus d'une activité déjà déclenchée se retrouve sur la version en
// vigueur, qui l'a reprise. Sont donc écartées les versions retirées — statut
// « remplace », ou `remplace_par` pour les données antérieures — et toute
// version archivée dont la lignée compte un plan en vigueur.
function _buildPlansArchivesFromPlanif(planifPlans, planifActs) {
    const parId = {};
    (planifPlans || []).forEach(p => { parId[p.id] = p; });
    const racinesEnVigueur = new Set();
    (planifPlans || []).forEach(p => {
        if (p.statut === 'valide') racinesEnVigueur.add(_execRacinePlan(p, parId));
    });
    const plans = (planifPlans || []).filter(p => p.statut === 'archive' && !p.remplace_par
        && !racinesEnVigueur.has(_execRacinePlan(p, parId)));
    if (!plans.length) return [];
    const ids = new Set(plans.map(p => p.id));
    const prestMap = {};
    (EXEC_STATE.data?.prestataires || window.PESSCO?.sharedData?.prestataires || []).forEach(pr => {
        prestMap[pr.id] = pr;
    });
    // Lignées d'activités portées par une version en vigueur : une activité
    // sortie des archives dont la lignée y figure déjà reste rangée ici, faute
    // de quoi elle ne se consulterait plus nulle part.
    const racinesActivitesEnVigueur = new Set();
    (planifActs || []).forEach(a => {
        if (a.plan_statut === 'valide') racinesActivitesEnVigueur.add(a.parent_activite_id || a.id);
    });
    const byPlanId = {};
    (planifActs || []).forEach(a => {
        if (!ids.has(a.plan_id)) return;
        // Une activité sortie des archives isolément ne figure plus ici :
        // elle a rejoint les activités en cours — à moins que la version en
        // vigueur ne porte déjà sa lignée, auquel cas elle n'en est jamais
        // ressortie.
        if (Number(a.desarchivee) === 1 && !racinesActivitesEnVigueur.has(a.parent_activite_id || a.id)) return;
        const pr = prestMap[a.prestataire_id];
        (byPlanId[a.plan_id] = byPlanId[a.plan_id] || []).push({
            ...a,
            prestataire_nom: a.prestataire_nom || (pr ? pr.nom : ''),
            prestataire_code: a.prestataire_code || (pr ? pr.trigramme : ''),
        });
    });
    return plans
        .map(p => ({
            ...p,
            activites: byPlanId[p.id] || [],
            nb_activites: (byPlanId[p.id] || []).length,
        }))
        .filter(p => p.activites.length);
}

// Archivage d'un plan entier : il quitte « Activités de Supervision » avec
// toutes ses activités, et se retrouve dans les activités archivées du menu
// États. Les constatations issues de ces activités poursuivent leur suivi —
// une non-conformité ne se range pas en même temps que le plan qui l'a
// révélée.
window.execArchiverPlan = async function (planId) {
    const plan = (EXEC_STATE.data.plansValidesPlanif || []).find(p => p.id === planId);
    if (!plan) return;
    const nb = (plan.activites || []).length;
    const ok = await execProcConfirmer({
        titre: te('archiver_plan'),
        message: `${te('archiver_plan_message')
            .replace('{plan}', plan.titre || plan.reference || planId)
            .replace('{n}', nb)}`,
        libelle: te('archiver'),
    });
    if (!ok) return;
    try {
        await api(`/api/m/planification/plans/${planId}/archiver`, {
            method: 'POST', body: JSON.stringify({}),
        });
        await execLoadData();
        _execToast(te('plan_archive_ok'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

// ══════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════

function execNavigateTo(page) {
    // Prestataires ("Mes Activités" workspace) can navigate only among their 4 pages.
    if (_execIsPrestataire()) {
        const allowed = ['dashboard', 'prestataire_notifications', 'rapports', 'constatations', 'mes_utilisateurs'];
        if (!allowed.includes(page)) page = 'dashboard';
    }
    // Close any open slider to avoid stale dossier forms persisting across pages
    if (EXEC_STATE.sliderOpen) execCloseSlider();
    // Close also the checklist filler / items editor if open
    document.getElementById('execChkFillerWrap')?.remove();
    document.getElementById('execCliEditorWrap')?.remove();
    EXEC_STATE.currentPage = page;
    EXEC_STATE.selectedDossier = null;
    // Le menu Constatations s'ouvre toujours sur « Suivi ».
    if (page === 'constatations') EXEC_STATE.currentConstSub = 'suivi';
    execUpdateNavUI();
    execRenderPage();
    document.querySelector('.app-sidebar')?.classList.remove('mobile-open');
    document.querySelector('.sidebar-backdrop')?.classList.remove('show');
}

function execUpdateNavUI() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const p = btn.dataset.page;
        btn.classList.toggle('active', p === EXEC_STATE.currentPage);
    });
    // MAJ du titre de la barre supérieure : Module / Page courante
    const _isPrest = _execIsPrestataire();
    const _cfg = (_isPrest ? EXEC_NAV_PRESTATAIRE : EXEC_NAV)[EXEC_STATE.currentPage];
    const _label = _cfg ? (te(_cfg.labelKey) || _cfg.labelKey) : '';
    const _span = document.querySelector('.app-header .header-module-title span');
    if (_span) _span.textContent = te('module_title') + (_label ? ' / ' + _label : '');
}

function execSetTheme(theme) {
    EXEC_STATE.theme = theme;
    oasisAppliquerTheme(theme);
}

function execSetLang(lang) {
    EXEC_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    if (window.PESSCO) window.PESSCO.lang = lang;
    // Changer de langue n'est pas quitter le formulaire ouvert : on le rejoue
    // dans la nouvelle langue. execNavigateTo referme le volet au passage,
    // d'où la capture avant l'appel.
    const rejouer = EXEC_STATE.voletRejouer;
    const retour = EXEC_STATE.retourVolet;
    execRenderApp();
    execNavigateTo(EXEC_STATE.currentPage);
    if (typeof rejouer === 'function') {
        EXEC_STATE.retourVolet = retour;
        setTimeout(rejouer, 0);
    }
}

function execToggleSidebar() {
    EXEC_STATE.sidebarCollapsed = !EXEC_STATE.sidebarCollapsed;
    localStorage.setItem('exec_sidebar', EXEC_STATE.sidebarCollapsed);
    document.querySelector('.app-sidebar')?.classList.toggle('collapsed', EXEC_STATE.sidebarCollapsed);
    document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed', EXEC_STATE.sidebarCollapsed);
    // Le slider (appended to body) doit aussi connaître l'état pour adapter sa largeur.
    document.body.classList.toggle('exec-sidebar-collapsed', EXEC_STATE.sidebarCollapsed);
    document.body.classList.toggle('app-sidebar-collapsed', EXEC_STATE.sidebarCollapsed);
    // Update chevron direction
    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = EXEC_STATE.sidebarCollapsed
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    }
}

function execToggleMobileSidebar() {
    document.querySelector('.app-sidebar')?.classList.toggle('mobile-open');
    document.querySelector('.sidebar-backdrop')?.classList.toggle('show');
}

function execLogout() {
    localStorage.removeItem('pr_token');
    localStorage.removeItem('pr_user');
    window.location.href = '/login';
}

// ── Champ de recherche des barres de filtres ──
// Le re-rendu est différé de 300 ms, puis le focus et la position du curseur
// sont rendus au champ, que le rendu a recréé. La fonction vient du socle
// (`/shared/js/oasis-utils.js`), que ce module ne charge pas — il tient ses
// propres helpers — et son absence faisait échouer le `oninput` sans bruit :
// la recherche ne filtrait rien, dans toutes les barres du module.
// L'anti-rebond vient du socle (oasis-commun.js).
function _pesSearchInput(input, apply) { oasisSaisieDifferee(input, apply); }

function execResetFilters() {
    EXEC_STATE.filters = { domaine: '', secteur: '', prestataire: '', statut: '', search: '', annee: '', trimestre: '', criticite: '', type_supervision: '', mode_supervision: '', avancement: '' };
    execRenderPage();
}

// ══════════════════════════════════════
//  RENDER APP SHELL
// ══════════════════════════════════════

function execRenderApp() {
    const S = EXEC_STATE;
    document.body.classList.toggle('exec-sidebar-collapsed', !!S.sidebarCollapsed);
    document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
    const initials = (S.user?.nom || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    // Prestataires see a dedicated "Mes Activités" workspace with 4 scoped pages.
    const isPrestataire = _execIsPrestataire();

    // Build header title : Module / Page (+ prestataire si M3_Prestataire)
    const _navCfg = (isPrestataire ? EXEC_NAV_PRESTATAIRE : EXEC_NAV)[S.currentPage];
    const _pageLabel = _navCfg ? (te(_navCfg.labelKey) || _navCfg.labelKey) : '';
    let headerTitle = te('module_title');
    if (_pageLabel) headerTitle = `${headerTitle} / ${_pageLabel}`;
    if (isPrestataire) {
        const _pid = S.user?.prestataire_id || '';
        const _prest = (S.data?.prestataires || []).find(p => p.id === _pid);
        const _pname = _prest ? (_prest.nom || _prest.trigramme || '') : '';
        if (_pname) headerTitle = `${headerTitle} | ${_pname}`;
    }

    let navHtml = '';
    if (isPrestataire) {
        // Pas d'intitulé de section : les entrées parlent d'elles-mêmes.
        for (const [key, config] of Object.entries(EXEC_NAV_PRESTATAIRE)) {
            navHtml += `<button class="nav-btn ${S.currentPage === key ? 'active' : ''}" data-page="${key}" onclick="execNavigateTo('${key}')" title="${te(config.labelKey)}">
                ${EXEC_ICONS[config.icon] || ''} <span>${te(config.labelKey)}</span>
            </button>`;
        }
    } else {
        for (const [key, config] of Object.entries(EXEC_NAV)) {
            if (config.reserve === 'admin' && !_execPeutProcessus()) continue;
            navHtml += `<button class="nav-btn ${S.currentPage === key ? 'active' : ''}" data-page="${key}" onclick="execNavigateTo('${key}')" title="${te(config.labelKey)}">
                ${EXEC_ICONS[config.icon] || ''} <span>${te(config.labelKey)}</span>
            </button>`;
        }
    }

    // En-tête vide : le retour au portail vient de la coquille commune, qui
    // remplace le bouton de déconnexion. Ce module posait en plus le sien, sous
    // condition de `window.PESSCO` — qu'il met, lui, bel et bien —, si bien que
    // les deux paraissaient. La Planification et les Profils de Risque n'ont
    // plus le leur ; celui-ci suit.
    document.getElementById('app').innerHTML = `
    <div class="app-layout exec-module ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header"></div>
            <nav class="sidebar-nav">${navHtml}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${['blue-dark','corporate','grey'].map(th =>
                        `<div class="theme-dot ${S.theme===th?'active':''}" data-theme="${th}" onclick="execSetTheme('${th}')" title="${th}"></div>`
                    ).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR','EN','PT'].map(l =>
                        `<button class="lang-btn ${S.lang===l.toLowerCase()?'active':''}" onclick="execSetLang('${l.toLowerCase()}')">${l}</button>`
                    ).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="execToggleSidebar()">
                ${S.sidebarCollapsed ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>' : EXEC_ICONS.chevron}
            </button>
        </aside>
        <div class="sidebar-backdrop" onclick="execToggleMobileSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="execToggleMobileSidebar()">${EXEC_ICONS.menu}</button>
                    <div class="header-module-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--exec-accent, var(--accent))">
                            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        <span>${_esc(headerTitle)}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="exec-notif-bell" onclick="execToggleNotifPanel()" title="Notifications" style="position:relative;cursor:pointer;padding:0.35rem;">
                        ${EXEC_ICONS.bell}
                        <span class="exec-notif-badge" id="execNotifBadge" style="display:none;"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <span>${((S.user?.prenom || '') + ' ' + (S.user?.nom || '')).trim()}</span>
                        <span class="role-badge">${_userM3Role()}</span>
                    </div>
                    <button class="btn-logout" onclick="execLogout()">${EXEC_ICONS.logout} ${te('logout')}</button>
                </div>
            </header>
            <main class="main-content" id="exec-content"></main>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  RENDER PAGE CONTENT
// ══════════════════════════════════════

function execRenderPage() {
    const el = document.getElementById('exec-content');
    if (!el) return;

    let content = '';
    switch (EXEC_STATE.currentPage) {
        case 'dashboard': content = execRenderDashboard(); break;
        case 'plan_surveillance': content = execRenderPlans(); break;
        case 'declenchement': content = execRenderDeclenchement(); break;
        case 'execution': content = execRenderExecution(); break;
        case 'prestataires': content = execRenderPrestataires(); break;
        case 'constatations': content = execRenderConstatations(); break;
        case 'rapports': content = execRenderRapports(); break;
        case 'etats': content = execRenderEtats(); break;
        case 'processus': content = execRenderProcessus(); break;
        case 'parametres': content = execRenderParametres(); break;
        case 'prestataire_home': content = execRenderPrestataireHome(); break;
        case 'prestataire_notifications': content = execRenderPrestataireNotifications(); break;
        case 'mes_utilisateurs': content = execRenderMesUtilisateurs(); break;
        default: content = `<div class="text-center">${te('no_data')}</div>`;
    }
    el.innerHTML = content;
    if (EXEC_STATE.currentPage === 'mes_utilisateurs') execLoadMesUtilisateurs();
    // Le calendrier s'ouvre sur la date du jour : c'est de là qu'on regarde.
    if (EXEC_STATE.currentPage === 'dashboard') execGanttAujourdhui();
}

function execRenderPrestataireHome() {
    const user = EXEC_STATE.user || {};
    const prests = EXEC_STATE.data.prestataires || [];
    const myPrest = prests.find(p => p.id === user.prestataire_id);
    const myName = myPrest ? (myPrest.nom || myPrest.trigramme) : '';
    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('prestataire_home_title')}</h2>
            ${myName ? `<p style="color:var(--text-muted);">${_esc(myName)}</p>` : ''}
        </div>
        <div class="card" style="text-align:center;padding:2rem;">
            <div style="font-size:3rem;color:var(--text-muted);">${EXEC_ICONS.bell || ''}</div>
            <p style="color:var(--text-muted);margin-top:1rem;">${te('prestataire_home_intro')}</p>
        </div>
    </div>`;
}

// ── "Notification d'activité" page (Mes Activités > prestataire_notifications) ─────
// Shows only sent notifications addressed to the connected prestataire.
function execRenderPrestataireNotifications() {
    const F = EXEC_STATE.filters;
    const user = EXEC_STATE.user || {};
    const scopedPid = user.prestataire_id || '';
    const all = EXEC_STATE.data.notifications || [];
    // Keep only notifications sent (envoye) for this prestataire
    const mesPrest = _execPrestatairesDuCompte();
    let rows = all.filter(n => n.statut === 'envoye' && (!mesPrest || mesPrest.includes(n.prestataire_id)));

    if (F.annee) rows = rows.filter(n => {
        const d = n.date_edition || n.date_creation || '';
        return d.slice(0, 4) === String(F.annee);
    });
    if (F.trimestre) rows = rows.filter(n => {
        const d = n.date_edition || n.date_creation || '';
        if (d.length < 7) return false;
        const m = parseInt(d.slice(5, 7));
        return String(Math.ceil(m / 3)) === String(F.trimestre);
    });
    if (F.search) {
        const s = F.search.toLowerCase();
        rows = rows.filter(n =>
            (n.reference || '').toLowerCase().includes(s) ||
            (n.objet || n.objet_activite || '').toLowerCase().includes(s) ||
            (n.prestataire_nom || '').toLowerCase().includes(s)
        );
    }

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('notification_activite') || "Notification d'activité"}</h2>
            <p style="color:var(--text-muted);">${rows.length} ${te('notifications')}</p>
        </div>

        ${_execRenderFilterBar('execRenderPage()', { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showSearch: true })}

        <div class="card">
            <table class="exec-data-table">
                <thead>
                    <tr>
                        <th>${te('reference')}</th>
                        <th>${te('objet')}</th>
                        <th style="width:95px;">${te('date_debut')}</th>
                        <th style="width:95px;">${te('date_fin')}</th>
                        <th style="width:95px;">${te('date_edition')}</th>
                        <th>${te('status')}</th>
                        <th>${te('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    rows.map(n => `<tr>
                        <td><strong>${_esc(n.reference || '')}</strong></td>
                        <td>${_esc((n.objet || n.objet_activite || '').substring(0, 80))}</td>
                        <td>${_formatDate(n.date_debut_effective || n.date_debut_prevue || n.date_activite)}</td>
                        <td>${_formatDate(n.date_fin_effective || n.date_fin_prevue)}</td>
                        <td>${_formatDate(n.date_edition || n.date_creation)}</td>
                        <td>${_execStatusBadge(n.statut)}</td>
                        <td>
                            <div class="exec-notif-actions">
                                <button class="exec-notif-btn changement" onclick="execOpenExchangeSlider('${n.id}')"
                                        ${Number(n.accuse_reception) === 1 ? 'disabled' : ''}
                                        title="${_escAttr(te('demander_changement_aide'))}">
                                    ${te('demander_changement')}
                                </button>
                                <button class="exec-notif-btn accuser" onclick="execAccuserReception('${n.id}')"
                                        ${Number(n.accuse_reception) === 1 ? 'disabled' : ''}
                                        title="${_escAttr(Number(n.accuse_reception) === 1
                                            ? te('accuse_deja') : te('accuser_reception_aide'))}">
                                    ${Number(n.accuse_reception) === 1 ? te('accuse_fait') : te('accuser_reception')}
                                </button>
                                <button class="exec-notif-btn apercu" onclick="execPreviewNotification('${n.id}')"
                                        title="${_escAttr(te('apercu_notification'))}">
                                    ${te('apercu_notification')}
                                </button>
                            </div>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  NOTIFICATION BELL
// ══════════════════════════════════════

function _getNotifAlerts() {
    const alerts = [];
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const userId = EXEC_STATE.user?.id || '';

    // 1. Task reminders: notifications assigned to user (soumis for validators, envoye needing action)
    const notifs = EXEC_STATE.data.notifications || [];
    notifs.forEach(n => {
        // Pending validation tasks for validators
        if ((n.statut === 'soumis' || n.statut === 'valide') && n.valideur_id === userId) {
            alerts.push({ type: 'task', icon: EXEC_ICONS.send, label: `${te('soumettre_validation')}: ${_esc(n.reference || n.objet_activite || '')}`, date: n.date_creation || '', ref: n.reference });
        }
        // Notifications created by user that were rejected
        if (n.statut === 'rejete' && n.created_by === userId) {
            alerts.push({ type: 'task', icon: EXEC_ICONS.x, label: `${te('rejete')}: ${_esc(n.reference || n.objet_activite || '')}`, date: n.date_creation || '', ref: n.reference });
        }
    });

    // 2. Activités validées non déclenchées dont la date_debut est proche ou passée.
    //    Règles (miroir du code couleur des lignes) :
    //      · date_debut passée → 'overdue' (rouge gras)
    //      · date_debut dans <=15j → 'red'
    //      · date_debut dans <=30j → 'orange'
    const triggeredActIds = new Set(notifs.map(n => n && n.activite_id).filter(Boolean));
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const in30d = new Date(today0); in30d.setDate(in30d.getDate() + 30);
    const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    plans.forEach(p => {
        (p.activites || []).forEach(a => {
            if (triggeredActIds.has(a.id)) return;          // déjà déclenchée → ignorer
            if (!a.date_debut) return;
            const d = new Date(String(a.date_debut).substring(0, 10));
            if (isNaN(d.getTime())) return;
            if (d > in30d) return;                           // hors fenêtre (>30j)
            const days = Math.ceil((d - today0) / (24 * 60 * 60 * 1000));
            let sev = 'orange';
            if (days < 0) sev = 'overdue';
            else if (days <= 15) sev = 'red';
            alerts.push({
                type: sev === 'overdue' ? 'overdue' : 'deadline',
                severity: sev,
                icon: EXEC_ICONS.clock,
                label: `${_esc(a.objet || '')} - ${_esc(a.prestataire_nom || '')}`,
                date: a.date_debut,
                days
            });
        });
    });

    // 3. Constatations with upcoming due dates
    const constatations = EXEC_STATE.data.constatations || [];
    constatations.forEach(c => {
        if (c.statut === 'soldee') return;
        const dDue = c.date_due ? new Date(c.date_due) : null;
        if (dDue && dDue >= now && dDue <= in30) {
            const days = Math.ceil((dDue - now) / (24 * 60 * 60 * 1000));
            alerts.push({ type: 'deadline', icon: EXEC_ICONS.clock, label: `FNC ${_esc(c.reference || '')}: ${_esc(c.description || c.titre || '').substring(0, 50)}`, date: c.date_due, days });
        }
        // Overdue constatations
        if (dDue && dDue < now) {
            const daysLate = Math.ceil((now - dDue) / (24 * 60 * 60 * 1000));
            alerts.push({ type: 'overdue', icon: EXEC_ICONS.x, label: `FNC ${_esc(c.reference || '')} - ${te('echeance')} ${te('date_due')}: ${daysLate}j`, date: c.date_due, days: -daysLate });
        }
    });

    // 4. Étapes du circuit d'une constatation restées en attente au-delà du
    //    délai paramétré. L'échéance de solde (point 3) dit quand l'action
    //    corrective est due ; ceci dit quand le circuit lui-même s'enlise.
    _execAlertesEtapesConstatation(constatations, today0).forEach(a => alerts.push(a));

    // Sort: overdue first, then by days ascending
    alerts.sort((a, b) => (a.days || 999) - (b.days || 999));
    return alerts;
}

// Chaque statut de constatation attend un geste, à partir d'une date connue.
// La table ci-dessous nomme, pour chacun, le délai qui s'applique et la date
// dont il court : un statut absent de la table n'attend rien de chronométré.
const EXEC_CONSTA_ATTENTES = {
    direct_brouillon: { delai: 'soumission_constatation', depuis: c => c.date_ouverture, quoi: 'à soumettre' },
    direct_renvoye: { delai: 'correction_constatation', depuis: c => c.date_renvoi, quoi: 'à corriger' },
    direct_soumis: { delai: 'validation_constatation', depuis: c => c.date_soumission_pac, quoi: 'à valider' },
    direct_valide: { delai: 'transmission_constatation', depuis: c => c.date_validation_pac, quoi: 'à transmettre' },
    ouvert: { delai: 'soumission_pac', depuis: c => c.date_transmission, quoi: 'PAC attendu' },
    ouverte: { delai: 'soumission_pac', depuis: c => c.date_transmission, quoi: 'PAC attendu' },
    pac_soumis: { delai: 'acceptation_pac', depuis: c => c.date_soumission_pac, quoi: 'PAC à examiner' },
    pac_rejetee: { delai: 'correction_pac', depuis: c => c.date_rejet_pac, quoi: 'PAC à reprendre' },
    pac_valide: { delai: 'verification_cloture', depuis: c => c.date_due_cloture || c.date_due, quoi: 'à vérifier et clôturer' },
};

function _execAlertesEtapesConstatation(constatations, jour) {
    const D = (window.EXEC_ETATS && EXEC_ETATS.delais) || null;
    if (!D) return [];
    const alertes = [];
    constatations.forEach(c => {
        const attente = EXEC_CONSTA_ATTENTES[String(c.statut || '')];
        if (!attente) return;
        const depart = attente.depuis(c);
        if (!depart) return;
        const limite = new Date(String(depart).substring(0, 10));
        if (isNaN(limite.getTime())) return;
        limite.setDate(limite.getDate() + (D[attente.delai] || 0));
        limite.setHours(0, 0, 0, 0);
        const jours = Math.round((limite - jour) / 86400000);
        // Seules les étapes déjà en retard sont remontées : la cloche signale
        // ce qui bloque, pas tout ce qui court encore.
        if (jours >= 0) return;
        alertes.push({
            type: 'overdue', severity: 'overdue', icon: EXEC_ICONS.alarm,
            // La référence porte déjà « FNC » : la répéter alourdit la ligne.
            label: `${_esc(c.reference || 'Constatation')} — ${attente.quoi} : ${Math.abs(jours)} j de retard`,
            date: limite.toISOString().substring(0, 10), days: jours,
        });
    });
    return alertes;
}

function execUpdateNotifBadge() {
    const alerts = _getNotifAlerts();
    const badge = document.getElementById('execNotifBadge');
    if (badge) {
        if (alerts.length > 0) {
            badge.textContent = alerts.length > 99 ? '99+' : alerts.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function execToggleNotifPanel() {
    const existing = document.getElementById('execNotifPanel');
    if (existing) { existing.remove(); return; }

    const alerts = _getNotifAlerts();
    const panel = document.createElement('div');
    panel.id = 'execNotifPanel';
    panel.className = 'exec-notif-panel';
    panel.innerHTML = `
        <div class="exec-notif-panel-header">
            <strong>${EXEC_ICONS.bell} Notifications (${alerts.length})</strong>
            <button class="btn-icon-reset" onclick="document.getElementById('execNotifPanel')?.remove()" style="border:none;background:none;cursor:pointer;">${EXEC_ICONS.close}</button>
        </div>
        <div class="exec-notif-panel-body">
            ${alerts.length === 0 ? `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">${te('no_data')}</div>` :
            alerts.map(a => {
                const sev = a.severity || '';
                const col = sev === 'overdue' ? '#b91c1c' : (sev === 'red' ? '#dc2626' : (sev === 'orange' ? '#ea580c' : ''));
                const wgt = sev === 'overdue' ? '700' : '';
                const labelStyle = col ? `color:${col};${wgt ? `font-weight:${wgt};` : ''}` : '';
                return `
                <div class="exec-notif-item ${a.type}">
                    <div class="exec-notif-item-icon"${col ? ` style="color:${col};"` : ''}>${a.icon}</div>
                    <div class="exec-notif-item-content">
                        <div class="exec-notif-item-label" style="${labelStyle}">${a.label}</div>
                        <div class="exec-notif-item-meta">
                            ${a.days !== undefined ? (a.days < 0 ? `<span style="color:#b91c1c;font-weight:700;">${Math.abs(a.days)}j en retard</span>` : `<span>J-${a.days}</span>`) : ''}
                            ${a.date ? `<span>${_formatDate(a.date)}</span>` : ''}
                        </div>
                    </div>
                </div>`;}).join('')}
        </div>`;

    // Position below the bell
    const bell = document.querySelector('.exec-notif-bell');
    if (bell) {
        const rect = bell.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
    }
    document.body.appendChild(panel);

    // Close on outside click
    setTimeout(() => {
        const handler = (e) => {
            if (!panel.contains(e.target) && !e.target.closest('.exec-notif-bell')) {
                panel.remove();
                document.removeEventListener('click', handler);
            }
        };
        document.addEventListener('click', handler);
    }, 100);
}

// ══════════════════════════════════════
//  SLIDER SYSTEM (offcanvas from right)
// ══════════════════════════════════════

function _execFadeSliderContent(title, bodyHtml, footerHtml, size) {
    const slider = document.getElementById('execSlider');
    if (!slider) { execShowSlider(title, bodyHtml, footerHtml, size); return; }
    // Update size class in one pass
    slider.className = `exec-slider slider-${size || 'lg'} open`;
    // Batch DOM writes in one rAF to minimise reflows
    requestAnimationFrame(() => {
        const header = slider.querySelector('.exec-slider-header h3');
        const body   = slider.querySelector('.exec-slider-body');
        const footer = slider.querySelector('.exec-slider-footer');
        if (header) header.innerHTML = title;
        if (body) {
            body.innerHTML = bodyHtml;
            body.style.animation = 'none';
            body.offsetHeight; // single forced reflow for animation restart
            body.style.animation = 'execFadeIn 0.3s ease';
        }
        if (footer) {
            footer.innerHTML = footerHtml || '';
        } else if (footerHtml) {
            const fd = document.createElement('div');
            fd.className = 'exec-slider-footer';
            fd.innerHTML = footerHtml;
            slider.appendChild(fd);
        }
    });
}

function _execToast(message, type) {
    if (typeof window.oasisToast !== 'function') { console.warn('[toast]', type, message); return null; }
    return window.oasisToast(message, type);
}

function execShowSlider(title, bodyHtml, footerHtml, size) {
    size = size || 'lg';
    execCloseSlider(true);
    const sizeClass = `slider-${size}`;

    const overlay = document.createElement('div');
    overlay.className = 'exec-slider-overlay';
    overlay.id = 'execSliderOverlay';
    overlay.onclick = () => execCloseSlider();
    document.body.appendChild(overlay);

    const slider = document.createElement('div');
    slider.className = `exec-slider ${sizeClass}`;
    slider.id = 'execSlider';
    slider.innerHTML = `
        <div class="exec-slider-header">
            <h3>${title}</h3>
            <button class="exec-slider-close" onclick="execCloseSlider()">${EXEC_ICONS.close}</button>
        </div>
        <div class="exec-slider-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="exec-slider-footer">${footerHtml}</div>` : ''}
    `;
    document.body.appendChild(slider);

    EXEC_STATE.sliderOpen = true;
    requestAnimationFrame(() => {
        overlay.classList.add('open');
        slider.classList.add('open');
    });
}

// ── Provenance et rejeu du volet ─────────────────────────────────────
// Deux besoins voisins : savoir d'où un formulaire a été ouvert, pour que son
// bouton Retour y ramène ; et savoir le rejouer tel quel, pour qu'un
// changement de langue ne le fasse pas disparaître.
//   `_retourEnAttente` est posé par l'appelant juste avant l'ouverture, puis
//   consommé par le formulaire qui s'ouvre — sinon un retour resterait armé
//   d'une ouverture à l'autre.
function execArmerRetour(rejouerAppelant) {
    EXEC_STATE._retourEnAttente = rejouerAppelant || null;
}

// Consommation côté formulaire. `cle` identifie ce qui est affiché : le
// formulaire se rappelant lui-même à chaque étape, la provenance ne doit
// survivre que tant qu'on reste sur le même objet.
function execPrendreRetour(cle) {
    const attendu = EXEC_STATE._retourEnAttente;
    EXEC_STATE._retourEnAttente = null;
    if (attendu) EXEC_STATE.retourVolet = attendu;
    else if (EXEC_STATE._retourCle !== cle) EXEC_STATE.retourVolet = null;
    EXEC_STATE._retourCle = cle;
}

window.execRetourVolet = function () {
    const retour = EXEC_STATE.retourVolet;
    EXEC_STATE.retourVolet = null;
    EXEC_STATE._retourCle = null;
    execCloseSlider();
    if (typeof retour === 'function') setTimeout(retour, 80);
};

function execCloseSlider(immediate) {
    EXEC_STATE.voletRejouer = null;
    document.getElementById('execPacTiroir')?.remove();
    document.getElementById('execFncTiroir')?.remove();
    const overlay = document.getElementById('execSliderOverlay');
    const slider = document.getElementById('execSlider');
    if (overlay) {
        overlay.classList.remove('open');
        if (immediate) overlay.remove();
        else setTimeout(() => overlay.remove(), 350);
    }
    if (slider) {
        slider.classList.remove('open');
        if (immediate) slider.remove();
        else setTimeout(() => slider.remove(), 350);
    }
    EXEC_STATE.sliderOpen = false;
}

function execSwitchSlider(title, bodyHtml, footerHtml, size) {
    const slider = document.getElementById('execSlider');
    if (slider) {
        // Remove old slider immediately to avoid id collision, then create new one
        slider.remove();
        const newSlider = document.createElement('div');
        newSlider.className = `exec-slider slider-${size || 'lg'}`;
        newSlider.id = 'execSlider';
        newSlider.innerHTML = `
            <div class="exec-slider-header">
                <h3>${title}</h3>
                <button class="exec-slider-close" onclick="execCloseSlider()">${EXEC_ICONS.close}</button>
            </div>
            <div class="exec-slider-body">${bodyHtml}</div>
            ${footerHtml ? `<div class="exec-slider-footer">${footerHtml}</div>` : ''}
        `;
        document.body.appendChild(newSlider);
        requestAnimationFrame(() => newSlider.classList.add('open'));
    } else {
        execShowSlider(title, bodyHtml, footerHtml, size);
    }
}

// ══════════════════════════════════════
//  FILTER BAR (reusable)
// ══════════════════════════════════════

function _execRenderFilterBar(onchangeFunc, opts) {
    opts = opts || {};
    const F = EXEC_STATE.filters;
    let domaines = EXEC_STATE.data.domaines || [];
    let secteurs = EXEC_STATE.data.secteurs || [];
    let prestataires = EXEC_STATE.data.prestataires || [];

    // Compte prestataire : la liste se borne aux prestataires auxquels il est
    // rattaché. « Tous les prestataires » ne vaut donc que pour les siens.
    const mesPrest = _execPrestatairesDuCompte();
    if (mesPrest) prestataires = prestataires.filter(p => mesPrest.includes(p.id));

    // Restrict domaines (and secteurs + prestataires) to those granted to the
    // user in the Portal "Gestion des accès". user.domaines is a JSON array of
    // domaine ids. An empty list means "no restriction" (admins see all).
    let userDomIds = (EXEC_STATE.user && EXEC_STATE.user.domaines) || [];
    if (typeof userDomIds === 'string') { try { userDomIds = JSON.parse(userDomIds); } catch(e) { userDomIds = []; } }
    if (Array.isArray(userDomIds) && userDomIds.length > 0) {
        const allowed = new Set(userDomIds);
        domaines = domaines.filter(d => allowed.has(d.id));
        secteurs = secteurs.filter(s => allowed.has(s.domaine_id));
        prestataires = prestataires.filter(p => allowed.has(p.domaine_id));
    }

    // ─── Dynamic cascading filters ─────────────────────────────────────────
    // Build a "tuples" dataset representing every available combination of
    // (domaine, secteur, prestataire, annee). For each filter dropdown, we
    // then narrow its options to values that still appear in tuples that
    // match the OTHER currently-selected filters (dynamic behaviour).
    const secToDom = {};
    secteurs.forEach(s => { secToDom[s.id] = s.domaine_id; });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    const plansForFilters = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    const rapports = EXEC_STATE.data.rapports || [];
    const constatations = EXEC_STATE.data.constatations || [];

    const tuples = [];
    // From validated plans + their activities
    plansForFilters.forEach(pl => {
        (pl.activites || []).forEach(a => {
            const presta = prestById[a.prestataire_id];
            const dom = a.domaine_id || secToDom[a.secteur_id] || (presta && presta.domaine_id) || '';
            const sec = a.secteur_id || (presta && presta.secteur_id) || '';
            tuples.push({
                domaine: dom || '',
                secteur: sec || '',
                prestataire: a.prestataire_id || '',
                annee: pl.annee ? String(pl.annee) : ''
            });
        });
    });
    // From prestataires themselves (so they appear even without activities)
    prestataires.forEach(p => {
        tuples.push({
            domaine: p.domaine_id || '',
            secteur: p.secteur_id || '',
            prestataire: p.id,
            annee: ''
        });
    });
    // Years from rapports / constatations so showAnnee works outside "Plans"
    rapports.forEach(r => {
        const d = r.date_transmission || r.date_creation;
        if (d && String(d).length >= 4) {
            tuples.push({ domaine: '', secteur: '', prestataire: r.prestataire_id || '', annee: String(d).slice(0, 4) });
        }
    });
    constatations.forEach(c => {
        const d = c.date_ouverture || c.date_creation;
        if (d && String(d).length >= 4) {
            tuples.push({ domaine: '', secteur: '', prestataire: c.prestataire_id || '', annee: String(d).slice(0, 4) });
        }
    });

    const matches = (t, excludeKey) => {
        if (excludeKey !== 'domaine'     && F.domaine     && t.domaine     !== F.domaine)                  return false;
        if (excludeKey !== 'secteur'     && F.secteur     && t.secteur     !== F.secteur)                  return false;
        if (excludeKey !== 'prestataire' && F.prestataire && t.prestataire !== F.prestataire)              return false;
        if (excludeKey !== 'annee'       && F.annee       && String(t.annee) !== String(F.annee))          return false;
        return true;
    };
    const availDom   = new Set();
    const availSec   = new Set();
    const availPrest = new Set();
    const availAnnee = new Set();
    tuples.forEach(t => {
        if (t.domaine     && matches(t, 'domaine'))     availDom.add(t.domaine);
        if (t.secteur     && matches(t, 'secteur'))     availSec.add(t.secteur);
        if (t.prestataire && matches(t, 'prestataire')) availPrest.add(t.prestataire);
        if (t.annee       && matches(t, 'annee'))       availAnnee.add(String(t.annee));
    });

    // Apply dynamic narrowing. Keep currently-selected value always visible
    // (so we don't orphan une sélection). Si aucune valeur ne correspond aux
    // autres filtres actifs, la liste est vide (option « Tous » uniquement) —
    // ne PAS retomber sur la liste complète, sinon des éléments hors filtre
    // (ex. un prestataire) réapparaissent quel que soit le filtre.
    const narrow = (list, idKey, availSet, currentVal) => {
        return list.filter(x => availSet.has(x[idKey]) || x[idKey] === currentVal);
    };
    const filteredDomaines    = narrow(domaines, 'id', availDom,   F.domaine);
    let   filteredSecteurs    = narrow(secteurs, 'id', availSec,   F.secteur);
    // Keep legacy behaviour: if domaine is selected, secteurs stay limited to it.
    if (F.domaine) filteredSecteurs = filteredSecteurs.filter(s => s.domaine_id === F.domaine);
    const filteredPrestataires = narrow(prestataires, 'id', availPrest, F.prestataire);

    // Collect filter HTML so we can count them and place the reset button
    // appropriately (avoid leaving it alone on a new row).
    const filters = [];

    if (opts.showDomaine !== false) filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.domaine=this.value;EXEC_STATE.filters.secteur='';${onchangeFunc}">
        <option value="">${te('all_domains')}</option>${filteredDomaines.map(d => `<option value="${d.id}" ${F.domaine===d.id?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}</select>`);

    if (opts.showSecteur !== false) filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.secteur=this.value;${onchangeFunc}">
        <option value="">${te('all_sectors')}</option>${filteredSecteurs.map(s => `<option value="${s.id}" ${F.secteur===s.id?'selected':''}>${s.code} - ${_esc(s.nom)}</option>`).join('')}</select>`);

    if (opts.showPrestataire) filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.prestataire=this.value;${onchangeFunc}">
        <option value="">${te('all_providers')}</option>${filteredPrestataires.map(p => `<option value="${p.id}" ${F.prestataire===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}</select>`);

    if (opts.showAnnee) {
        // Use dynamically-narrowed set of years, with fallback to full list.
        let years;
        if (availAnnee.size > 0) {
            years = [...availAnnee];
            if (F.annee && !availAnnee.has(String(F.annee))) years.push(String(F.annee));
        } else {
            const yearSet = new Set(plansForFilters.map(p => p.annee).filter(Boolean).map(String));
            rapports.forEach(r => {
                const d = r.date_transmission || r.date_creation;
                if (d && String(d).length >= 4) yearSet.add(String(d).slice(0, 4));
            });
            constatations.forEach(c => {
                const d = c.date_ouverture || c.date_creation;
                if (d && String(d).length >= 4) yearSet.add(String(d).slice(0, 4));
            });
            years = [...yearSet];
        }
        years = years.filter(Boolean).sort((a, b) => Number(b) - Number(a));
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.annee=this.value;${onchangeFunc}">
            <option value="">${te('all_years')}</option>${years.map(y => `<option value="${y}" ${String(F.annee)===String(y)?'selected':''}>${y}</option>`).join('')}</select>`);
    }

    if (opts.showTrimestre) {
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.trimestre=this.value;${onchangeFunc}">
            <option value="">${te('all_trimestres')}</option>
            <option value="1" ${F.trimestre==='1'?'selected':''}>T1 (Jan-Mar)</option>
            <option value="2" ${F.trimestre==='2'?'selected':''}>T2 (Avr-Jun)</option>
            <option value="3" ${F.trimestre==='3'?'selected':''}>T3 (Jul-Sep)</option>
            <option value="4" ${F.trimestre==='4'?'selected':''}>T4 (Oct-Dec)</option>
        </select>`);
    }

    if (opts.showCriticite) {
        // Values must match what is stored in the DB (see FNC form): mineure/majeure/critique
        const crits = [
            { value: 'critique', label: te('critique') },
            { value: 'majeure',  label: te('majeur')  },
            { value: 'mineure',  label: te('mineur')  }
        ];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.criticite=this.value;${onchangeFunc}">
            <option value="">${te('all_criticalities')}</option>
            ${crits.map(c => `<option value="${c.value}" ${F.criticite===c.value?'selected':''}>${c.label}</option>`).join('')}
        </select>`);
    }

    if (opts.showTypeSupervision) {
        const typesSup = EXEC_STATE.data.typesSupervision || [];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.type_supervision=this.value;${onchangeFunc}">
            <option value="">${te('all_types_supervision')}</option>
            ${typesSup.map(t => `<option value="${t.id}" ${F.type_supervision===t.id?'selected':''}>${_esc(t.type_supervision || t.libelle || t.nom || t.id)}</option>`).join('')}
        </select>`);
    }

    if (opts.showModeSupervision) {
        const modesSup = EXEC_STATE.data.modesSupervision || [];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.mode_supervision=this.value;${onchangeFunc}">
            <option value="">${te('all_modes_supervision')}</option>
            ${modesSup.map(m => `<option value="${m.id}" ${F.mode_supervision===m.id?'selected':''}>${_esc(m.mode || m.libelle || m.nom || m.id)}</option>`).join('')}
        </select>`);
    }

    // Avancement : les quatre niveaux du module, là où le statut du circuit
    // demandait de connaître les étapes une à une.
    if (opts.showAvancement) {
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.avancement=this.value;${onchangeFunc}">
            <option value="">${te('tous_avancements')}</option>
            ${EXEC_AVANCEMENTS.map(n => `<option value="${n}" ${F.avancement === n ? 'selected' : ''}>${te('avancement_' + n)}</option>`).join('')}
        </select>`);
    }

    if (opts.showStatut) {
        const statuts = opts.statutOptions || ['brouillon','soumis','valide','rejete','envoye','acte'];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.statut=this.value;${onchangeFunc}">
            <option value="">${te('all_statuses')}</option>${statuts.map(s => `<option value="${s}" ${F.statut===s?'selected':''}>${te(s)}</option>`).join('')}</select>`);
    }

    if (opts.showSearch !== false) filters.push(`<input type="text" class="form-input" id="exec-filter-search" placeholder="${te('search')}" value="${_escAttr(F.search)}" oninput="_pesSearchInput(this, () => { EXEC_STATE.filters.search=document.getElementById('exec-filter-search').value; ${onchangeFunc} })">`);

    const barClass = (filters.length > 0 && filters.length % 6 === 0) ? 'filter-bar filter-bar--align-reset' : 'filter-bar';
    let html = `<div class="${barClass}">`;
    html += filters.join('');
    html += `<button class="btn-icon-reset" onclick="execResetFilters()" title="${te('reset_filters')}">${EXEC_ICONS.reset}</button>`;
    html += '</div>';
    return html;
}

// ══════════════════════════════════════
//  FORM SECTION ACCORDION
// ══════════════════════════════════════

// `badge` : compteur ou mention affichée à droite du titre ; `aide` : ligne
// d'explication sous l'en-tête de la section.
function _execFormSection(letter, titleKey, bodyHtml, expanded, badge, aide) {
    const exp = expanded ? ' expanded' : '';
    return `
    <div class="exec-form-section${exp}" id="exec-section-${letter}">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">${letter}</span>
            <span class="exec-form-section-title">${te(titleKey)}</span>
            ${aide ? `<span class="exec-form-section-aide" title="${_escAttr(aide)}">${aide}</span>` : ''}
            ${badge ? `<span class="exec-form-section-badge">${badge}</span>` : ''}
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">${bodyHtml}</div>
    </div>`;
}

