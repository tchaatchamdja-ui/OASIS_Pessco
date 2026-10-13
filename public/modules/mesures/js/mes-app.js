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
    // Instance regardée, servie par le contexte : { disponible, locale,
    // courante, instances }. La barre supérieure en fait une liste déroulante.
    instances: {},
    currentPage: 'dashboard',
    // Menu Paramètres : le sous-menu ouvert, et le repli de sa bande latérale.
    paramSousMenu: 'categories',
    paramBarreRepliee: false,
    sidebarCollapsed: localStorage.getItem('mes_sidebar') === 'true',
    theme: 'blue-dark',
    lang: 'fr',
    data: {
        mesures: [], constatations: [], prestataires: [], domaines: [], secteurs: [],
        parametres: { categories: [], types: [], modifiable: false, supprimable: false },
    },
    filtres: {
        db_prest: '', db_cat: '', db_type: '', db_statut: '', db_echeance: '',
        mes_categorie: '', mes_statut: '', mes_prest: '', mes_recherche: '', mes_carence: '',
        crit_statut: '', crit_prest: '', crit_origine: '', crit_recherche: '',
    },
    mesureEnCours: null,
    // Carence dont le traitement est ouvert, et son fil d'avancement.
    carenceEnCours: null,
    traitement: null,
    // Étape du fil que l'on regarde ; l'étape atteinte vient du traitement.
    etapeVue: '',
    categorieEnCours: null,
    typeEnCours: null,
    sliderOpen: false,
};

// ══════════════════════════════════════
//  Requêtes
// ══════════════════════════════════════

// Le client vient du socle (oasis-commun.js). Il imposait ici un type JSON
// jusque sur les dépôts de fichiers : le corps partait sans sa frontière
// multipart, et le serveur répondait « Aucun fichier fourni ».
function mesApi(chemin, options) { return oasisJson(MES_API + chemin, options); }

// ══════════════════════════════════════
//  Échappement
// ══════════════════════════════════════
// `_mesEsc` protège le texte ; `_mesAttr` protège une valeur d'attribut, où
// un guillemet refermerait l'attribut. Tout libellé saisi peut en contenir.

// L'échappement vient du socle (oasis-commun.js) : un seul barème pour tous
// les modules. Le nom demeure, les gabarits n'ont rien à changer.
function _mesEsc(v) { return oasisEsc(v); }
const _mesAttr = (v) => oasisEsc(v);

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
    // Sous-menus des Paramètres : les quatre listes du module. Les deux autres
    // entrées reprennent une icône déjà servie ailleurs.
    couches: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    loupe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></svg>',
    groupe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
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
    dashboard: { cle: 'nav_dashboard', icon: 'dashboard' },
    // La carence précède la mesure : on la constate, puis on la sanctionne.
    critiques: { cle: 'nav_carences', icon: 'warning' },
    mesures: { cle: 'nav_mesures', icon: 'shield' },
    // Les états ferment la marche : on y va pour savoir quoi faire ensuite,
    // non pour saisir — c'est la lecture d'ensemble des deux listes qui précèdent.
    etats: { cle: 'nav_etats', icon: 'chart' },
    parametres: { cle: 'nav_parametres', icon: 'settings' },
};
// Le libellé d'une page se lit dans la langue retenue, au moment de l'afficher.
const mesNavLabel = (page) => mt((MES_NAV[page] || {}).cle || page);

// D'où vient la carence : chaque module la relève à sa façon, l'écran les
// réunit sous les mêmes intitulés.
// Les trois provenances d'une carence, et les cinq statuts du circuit d'une
// mesure : la clé demeure, le libellé se lit dans la langue retenue.
const MES_CLES_ORIGINE = ['SURV', 'RAMP', 'CARE'];
const mesOrigine = (code) => mt(`origine_${code}`);

// Teintes des catégories de mesure : la gravité se lit à la couleur — l'orange
// clair de la mesure administrative, l'orange franc de la sanction, le rouge du
// pénal. Une
// catégorie ajoutée au paramétrage prend la teinte suivante de la palette.
const MES_COULEURS_CATEGORIE = ['#1d4ed8', '#ea580c', '#7c3aed', '#059669', '#0891b2', '#b45309'];
// Provenance d'une carence : chaque module a sa teinte.
const MES_COULEUR_PAR_SOURCE = {
    SURV: '#1d4ed8',
    RAMP: '#0891b2',
    CARE: '#7c3aed',
};

const MES_COULEUR_PAR_CODE = {
    administrative: '#fb923c',
    sanction: '#ea580c',
    penale: '#dc2626',
};


// Statut d'une carence au sens des mesures d'application : ce que ce module
// en a fait, indépendamment de l'état qu'elle porte dans celui qui l'a
// relevée. Une constatation soldée chez le surveillant reste « à traiter »
// ici tant qu'aucune décision n'a été prise.
// Les statuts d'une carence suivent le fil du traitement, dans les mêmes
// termes que la colonne « Actions » : ce que le bouton annonce, la colonne
// « Statut » le dit. Ils se lisent dans l'ordre du circuit.
// `couleur` sert aux parts du tableau de bord, `classe` à la pastille de la
// colonne « Statut » — de la même facture que celles de la colonne « Actions ».
const MES_STATUT_CARE = {
    a_traiter: { cle: 'care_a_traiter', couleur: '#dc2626', classe: 'st-a-traiter' },
    investigations: { cle: 'care_investigations', couleur: '#ea580c', classe: 'st-investigations' },
    qualification: { cle: 'care_qualification', couleur: '#d97706', classe: 'st-qualification' },
    sous_suivi: { cle: 'care_sous_suivi', couleur: '#0891b2', classe: 'st-sous-suivi' },
    traitee: { cle: 'care_traitee', couleur: '#059669', classe: 'st-traitee' },
    cloturee: { cle: 'care_cloturee', couleur: '#475569', classe: 'st-cloturee' },
    classee: { cle: 'care_classee', couleur: '#7c3aed', classe: 'st-classee' },
};
const mesLibelleCare = (cle) => mt((MES_STATUT_CARE[cle] || MES_STATUT_CARE.a_traiter).cle);

// Le statut se lit en pastille, comme les mentions de la colonne « Actions » :
// les deux colonnes disent la même chose du même dossier, elles le disent de
// la même façon.
const mesBadgeStatutCare = (cle) => {
    const st = MES_STATUT_CARE[cle] || MES_STATUT_CARE.a_traiter;
    return `<span class="mes-badge ${st.classe}">${_mesEsc(mt(st.cle))}</span>`;
};

const MES_CLES_STATUT = ['projet', 'notifiee', 'en_cours', 'cloturee', 'annulee'];
const mesLibelleStatut = (cle) => mt(`mes_${cle}`);

// ══════════════════════════════════════
//  Droits
// ══════════════════════════════════════

const mesRole = () => (MES_STATE.user || {}).role_m4 || 'M4_Non Autorisé';
const mesEstAdmin = () => mesRole() === 'M4_Administrateur';
// Supprimer une mesure efface une sanction prononcée : le geste ne relève pas
// du module mais du compte qui administre l'application. Le serveur pose la
// même garde — sans quoi ce test ne ferait que cacher un bouton.
const mesEstSuperAdmin = () => (MES_STATE.user || {}).role === 'SUPERADMIN';
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

// ══════════════════════════════════════
//  Dates et badges
// ══════════════════════════════════════

const mesJour = () => oasisJour();
const mesDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

const MES_CLOS = ['cloturee', 'annulee'];
const mesEnRetard = (m) => !!m.date_echeance && m.date_echeance < mesJour() && !MES_CLOS.includes(m.statut);

// Statut de suivi d'une mesure : où en est le plan d'action que le prestataire
// doit conduire. Les statuts du circuit interne — projet, notifiée, en cours —
// disaient ce que l'Autorité en avait fait, non ce que la mesure était devenue
// chez celui qu'elle vise. C'est ce dernier état que la table porte.
//
// L'étape « Suivi des Mesures » les posera ; tant qu'elle n'existe pas, une
// mesure arrêtée attend l'ouverture de son suivi, et le dit.
// Les six états du suivi : la table ne retient que la classe d'affichage, le
// libellé et l'explication viennent du répertoire de traduction.
const MES_SUIVI = {
    attendu: { classe: 'notifiee' },
    en_cours: { classe: 'en_cours' },
    solde: { classe: 'cloturee' },
    sans_suite: { classe: 'annulee' },
    sans_objet: { classe: 'cloturee' },
    recours: { classe: 'majeure' },
};
const mesLibelleSuivi = (cle) => mt(`suivi_${cle}`);
const mesAideSuivi = (cle) => mt(`suivi_${cle}_aide`);

// Tant que le suivi n'est pas ouvert, l'état se déduit du circuit de la
// mesure — une mesure annulée ne sera jamais suivie, une mesure clôturée l'a
// été. Dès que l'étape « Suivi des Mesures » écrira `suivi_statut`, c'est lui
// qui fera foi.
function mesStatutSuivi(m) {
    if (MES_SUIVI[m.suivi_statut]) return m.suivi_statut;
    // Un recours prime : il suspend le suivi, quel que soit l'état du circuit.
    if (m.recours_intente) return 'recours';
    if (m.statut === 'annulee') return 'sans_suite';
    if (m.statut === 'cloturee') return 'solde';
    if (m.statut === 'en_cours') return 'en_cours';
    return 'attendu';
}

function mesStatutMesure(m) {
    const cle = mesStatutSuivi(m);
    const e = MES_SUIVI[cle];
    const quand = cle === 'solde' ? m.date_cloture : (cle === 'attendu' ? m.date_notification : '');
    return `<span class="mes-badge ${e.classe}" title="${_mesAttr(mesAideSuivi(cle))}">${_mesEsc(mesLibelleSuivi(cle))}</span>
        ${quand ? `<div class="mes-cell-suite">${_mesEsc(mesDate(quand))}</div>` : ''}`;
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

const mesTypesInvestigation = () => ((MES_STATE.data.parametres || {}).types_investigation) || [];
const mesComites = () => ((MES_STATE.data.parametres || {}).comites) || [];

async function mesRechargerParametres() {
    MES_STATE.data.parametres = await mesApi('/parametres')
        .catch(() => MES_STATE.data.parametres);
    mesRenderPage();
}

// ══════════════════════════════════════
//  Coquille — barre latérale, barre supérieure, pied
// ══════════════════════════════════════

// Chevron du bouton de repli : il montre le geste suivant, pas l'état courant.
function mesChevronRepli() {
    return MES_STATE.sidebarCollapsed
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
        : MES_ICONS.chevron;
}

function mesRenderApp() {
    const S = MES_STATE;
    // Ce qui est saisi dans un volet ouvert n'existe que dans le DOM : on le
    // relève avant de réécrire `#app`, sinon il partirait avec.
    if (S.sliderOpen) {
        mesMajTraitement();
        if (typeof mesMajQualification === 'function') mesMajQualification();
    }
    if (S.constatEnCours) S.constatEnCours = { ...S.constatEnCours, ...mesCollecterConstat() };
    document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
    const u = S.user || {};
    const initiales = ((u.prenom || u.nom || 'U')[0] + ((u.nom || '')[1] || '')).toUpperCase();

    const nav = Object.entries(MES_NAV).map(([cle, cfg]) => `
        <button class="nav-btn ${S.currentPage === cle ? 'active' : ''}" data-page="${cle}"
                onclick="mesNavigateTo('${cle}')" title="${_mesAttr(mt(cfg.cle))}">
            ${MES_ICONS[cfg.icon] || ''} <span>${_mesEsc(mt(cfg.cle))}</span>
        </button>`).join('');

    const titrePage = MES_NAV[S.currentPage] ? mesNavLabel(S.currentPage) : '';
    const titre = titrePage ? mt('module_titre_page', titrePage) : mt('module_titre');

    document.getElementById('app').innerHTML = `
    <div class="app-layout mes-module ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header">
                <button class="btn-back-portal" onclick="mesRetourPortail()" title="${_mesAttr(mt('retour_portail'))}">
                    ${MES_ICONS.back} <span class="back-portal-label">${_mesEsc(mt('retour_portail'))}</span>
                </button>
            </div>
            <nav class="sidebar-nav">${nav}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${OASIS_THEMES.map((th) =>
                        `<div class="theme-dot ${S.theme === th ? 'active' : ''}" data-theme="${th}"
                              onclick="mesSetTheme('${th}')" title="${oasisNomTheme(th)}"></div>`).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR', 'EN', 'PT'].map((l) =>
                        `<button class="lang-btn ${S.lang === l.toLowerCase() ? 'active' : ''}"
                                 onclick="mesSetLang('${l.toLowerCase()}')">${l}</button>`).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="mesToggleSidebar()">${mesChevronRepli()}</button>
        </aside>
        <div class="sidebar-backdrop" onclick="mesToggleSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="mesToggleSidebar()" aria-label="${_mesAttr(mt("ouvrir_menu"))}" title="${_mesAttr(mt("ouvrir_menu"))}">${MES_ICONS.menu}</button>
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

    // Les volets sont remontés dans l'état où on les avait laissés, sans
    // rejouer leur glissement — un volet déjà ouvert n'a pas à s'ouvrir une
    // seconde fois.
    if (S.sliderOpen) mesAfficherSlider({ anime: false });
    if (S.constatEnCours) mesAfficherVolet({ anime: false });
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
    // La table se redessine une fois la frappe arrêtée, non à chaque touche.
    oasisSaisieDifferee(`mes_${cle}`, () => mesRechercherMaintenant());
}

function mesRechercherMaintenant() {
    const corps = document.querySelector('[data-corps]');
    if (!corps) { mesRenderPage(); return; }
    corps.innerHTML = corps.dataset.corps === 'mesures'
        ? mesLignesMesures() : mesLignesCritiques();
    if (typeof mesMajLiensExport === 'function') mesMajLiensExport();
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
    F.mes_carence = '';
    mesRenderPage();
}

function mesResetFiltresCritiques() {
    const F = MES_STATE.filtres;
    F.crit_origine = ''; F.crit_statut = ''; F.crit_prest = ''; F.crit_recherche = '';
    mesRenderPage();
}

function mesNavigateTo(page) {
    // Changer d'écran referme le volet : il appartient à la page qu'on quitte,
    // et le laisser ouvert par-dessus la suivante n'aurait pas de sens.
    if (MES_STATE.sliderOpen) mesFermerSlider();
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
        case 'etats': corps = mesRenderEtats(); break;
        case 'parametres': corps = mesRenderParametres(); break;
        default: corps = mesRenderDashboard();
    }
    // Le pied de page vient du chrome du socle (`module-chrome.js`), qui
    // l'injecte dans .app-content : le module n'en pose pas de second.
    el.innerHTML = corps;
}

// Replier la barre, changer de thème ou de langue ne redessine plus la
// coquille entière : `mesRenderApp` réécrit tout `#app`, volets compris, et
// une saisie en cours partait avec eux. Chacune de ces trois commandes ne
// touche désormais que ce qui la concerne.
function mesToggleSidebar() {
    const S = MES_STATE;
    S.sidebarCollapsed = !S.sidebarCollapsed;
    localStorage.setItem('mes_sidebar', String(S.sidebarCollapsed));
    document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
    // `.mes-module` habille aussi le body : c'est « .app-layout » qu'il faut
    // viser, sinon la classe se pose sur le body et la colonne de contenu ne
    // reprend jamais la largeur libérée par la barre.
    document.querySelector('.app-layout')?.classList.toggle('sidebar-collapsed', !!S.sidebarCollapsed);
    document.querySelector('.app-sidebar')?.classList.toggle('collapsed', !!S.sidebarCollapsed);
    // La flèche du bouton indique le geste suivant : elle seule change de sens.
    const bouton = document.querySelector('.sidebar-toggle');
    if (bouton) bouton.innerHTML = mesChevronRepli();
}

function mesSetTheme(theme) {
    MES_STATE.theme = theme;
    oasisAppliquerTheme(theme);
}

function mesSetLang(lang) {
    MES_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    // L'attribut `lang` de la page suit : un lecteur d'écran prononce alors
    // l'écran dans la langue où il est écrit.
    oasisPoserLangue(lang);
    // Les libellés changent : la coquille doit être redessinée. Les volets
    // ouverts sont alors remontés tels quels, saisie comprise. Les commandes
    // posées dans la barre supérieure — instance regardée, gestion des droits —
    // vivent hors de la coquille : elles se redessinent à part, sans quoi elles
    // gardaient la langue d'avant.
    mesRenderApp();
    mesRenderPage();
    if (typeof mesDessinerActions === 'function') mesDessinerActions();
}

function mesRetourPortail() {
    // Le nom du message est celui que l'hôte écoute : `oasis:back-portal`
    // (`frontend/portail/modules-hote.ts`). Il disait `oasis:back-to-portal`,
    // que rien n'écoutait — le message partait et tombait. Corrigé le
    // 13 octobre 2026, et un contrôle statique refuse désormais tout type
    // adressé au portail dont aucun écouteur du dépôt ne répond.
    parent.postMessage({ type: 'oasis:back-portal' }, '*');
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
            retenue: MES_STATE.categorieGraphe || '', infobulle: mt('infobulle_filtrer_types'),
        })
        : `<div class="mes-preuve-vide">${mt('aucune_categorie_param')}</div>`;

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
        : `<div class="mes-preuve-vide">${mt('aucune_donnee')}</div>`;


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
    const volumeStatut = MES_CLES_STATUT.map((s) => compte(s));

    // ── Côté constatations ──
    // C'est l'écart relevé qui appelle la mesure : le tableau de bord montre
    // les deux bouts de la chaîne. Les constatations viennent du module
    // « Exécution de la Surveillance » par le bus de services.
    const constatations = MES_STATE.data.constatations || [];
    const constPortee = F.db_prest
        ? constatations.filter((c) => c.prestataire_id === F.db_prest) : constatations;
    // Ce que le module en a fait, et non l'état que la carence porte chez celui
    // qui l'a relevée : une constatation soldée chez le surveillant reste à
    // traiter ici tant qu'aucune décision n'a été prise. La carte disait « 0
    // soldée » sur trente-deux carences dont huit sont pourtant réglées.
    const reglees = constPortee.filter((c) => c.classee || c.traitement_clos).length;
    const tauxRegle = constPortee.length ? Math.round((reglees / constPortee.length) * 100) : 0;
    const classees = constPortee.filter((c) => c.classee).length;
    const partClassees = constPortee.length ? Math.round((classees / constPortee.length) * 100) : 0;

    const segmentsSource = MES_CLES_ORIGINE.map((cle) => ({
        cle,
        label: mesOrigine(cle),
        value: constPortee.filter((c) => (c.origine || 'SURV') === cle).length,
        color: MES_COULEUR_PAR_SOURCE[cle],
    }));
    const parSource = constPortee.length
        ? mesRepartition(segmentsSource, {
            camembert: false, action: 'mesGrapheSource',
            retenue: MES_STATE.sourceGraphe || '', infobulle: mt('infobulle_filtrer_statuts'),
        })
        : `<div class="mes-preuve-vide">${mt('aucune_carence')}</div>`;

    // Le graphique dit ce que la colonne « Statut » du menu Carences affiche :
    // l'état de la carence dans ce module, non celui qu'elle porte ailleurs.
    // Une source retenue au graphique voisin resserre les statuts sur elle.
    const sourceRetenue = MES_STATE.sourceGraphe || '';
    const carencesStatut = sourceRetenue
        ? constPortee.filter((c) => (c.origine || 'SURV') === sourceRetenue) : constPortee;
    const segmentsStatutConstat = Object.entries(MES_STATUT_CARE).map(([cle, st]) => ({
        // Le statut se nomme par sa clé de traduction, comme la pastille et la
        // colonne « Statut » : la table ne porte plus de libellé en dur.
        label: mt(st.cle),
        value: carencesStatut.filter((c) => (c.statut_care || 'a_traiter') === cle).length,
        color: st.couleur,
    }));
    const parStatutConstat = carencesStatut.length
        ? mesRepartition(segmentsStatutConstat, { camembert: true, unite: 'carence' })
        : `<div class="mes-preuve-vide">${mt('aucune_carence')}</div>`;
    // Carences dont le traitement n'est pas ouvert : c'est ce qui reste à faire,
    // et c'est ce que la colonne « Statut » du menu Carences appelle « À
    // traiter ». La carte comptait les carences sans mesure — elle rangeait
    // donc là un dossier en cours d'investigation, et en sortait un dossier
    // clos dont une sanction courait encore.
    const aTraiter = constPortee
        .filter((c) => (c.statut_care || 'a_traiter') === 'a_traiter').length;
    // Part de ce qui reste à faire, sur l'échelle de la carte : au-delà du
    // quart, l'aiguille est au rouge.
    const positionATraiter = constPortee.length
        ? Math.min(100, Math.round((aTraiter / constPortee.length) * 400)) : 0;

    const cartes = `
    <div class="oasis-kpi-groupes">
        ${oasisKpiGroupe(mt('grp_mesures'), [
            oasisKpiCarte({
                titre: mt('kpi_mesures_prises'), couleur: '#b91c1c',
                valeur: liste.length,
                precision: mt('kpi_visees', visees),
                figure: { type: 'barres', valeurs: volumeStatut },
            }),
            oasisKpiCarte({
                titre: mt('kpi_echeance_depassee'), couleur: '#dc2626', alerte: !!enRetard,
                valeur: enRetard,
                precision: proche ? mt('kpi_proche', proche) : mt('kpi_aucune_proche'),
                figure: { type: 'retard', pastille: mt('kpi_depassee'), legende: mt('kpi_emission') },
            }),
            oasisKpiCarte({
                titre: mt('kpi_taux_cloture'), couleur: '#059669',
                valeur: `${tauxCloture} %`,
                precision: mt('kpi_cloturees_sur', clos, liste.length),
                figure: { type: 'cloture', pct: tauxCloture },
            }),
        ])}
        ${oasisKpiGroupe(mt('grp_carences'), [
            oasisKpiCarte({
                titre: mt('kpi_constatations'), couleur: '#ea580c',
                valeur: constPortee.length,
                precision: mt('kpi_reglees', reglees, tauxRegle),
                figure: { type: 'jauge', pct: tauxRegle },
            }),
            oasisKpiCarte({
                titre: mt('kpi_a_traiter'), couleur: '#dc2626', alerte: !!aTraiter,
                valeur: aTraiter,
                precision: mt('kpi_sur_carences', constPortee.length),
                figure: { type: 'echelle', position: positionATraiter, min: mt('kpi_maitrise'), max: mt('kpi_a_traiter') },
            }),
            // Classée : l'autorité a décidé qu'aucune mesure ne serait prise.
            oasisKpiCarte({
                titre: mt('kpi_classees'), couleur: '#7c3aed',
                valeur: classees,
                precision: mt('kpi_sur_carences', constPortee.length),
                figure: { type: 'jauge', pct: partClassees },
            }),
        ])}
    </div>`;

    return `
    <div class="mes-page-header">
        <h2>${mt('nav_dashboard')}</h2>
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select" onchange="mesSetFiltre('db_prest',this.value)">
                <option value="">${mt('tous_prestataires')}</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.db_prest)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_cat',this.value)">
                <option value="">${mt('toutes_categories')}</option>
                ${mesCategories().map((c) => opt(c.code, c.libelle, F.db_cat)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_type',this.value)">
                <option value="">${mt('tous_types')}</option>
                ${mesTypes().map((t) => opt(t.code, t.libelle, F.db_type)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_statut',this.value)">
                <option value="">${mt('tous_statuts')}</option>
                ${MES_CLES_STATUT.map((v) => opt(v, mesLibelleStatut(v), F.db_statut)).join('')}
            </select>
            <select class="mes-select" onchange="mesSetFiltre('db_echeance',this.value)">
                <option value="">${mt('toutes_echeances')}</option>
                ${opt('retard', mt('ech_retard'), F.db_echeance)}
                ${opt('proche', mt('ech_proche'), F.db_echeance)}
                ${opt('sans', mt('ech_sans'), F.db_echeance)}
            </select>
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresDashboard()"
                    title="${_mesAttr(mt('reinit_filtres'))}" aria-label="${_mesAttr(mt('reinit_filtres'))}">${MES_ICONS.reset}</button>
        </div>
    </div>
    ${cartes}
    <div class="mes-grille-2">
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_categorie')}</div>${parCategorie}
        </div>
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_source')}</div>${parSource}
        </div>
    </div>
    <div class="mes-grille-2">
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_type_mesure')}${catRetenue
                ? ` — ${_mesEsc(mesLibelleCategorie(catRetenue))}` : ''}</div>${parType}
        </div>
        <div class="mes-card">
            <div class="mes-card-titre">${mt('par_statut_carence')}${sourceRetenue
                ? ` — ${_mesEsc(mesOrigine(sourceRetenue))}` : ''}</div>${parStatutConstat}
        </div>
    </div>
    `;
}

// ══════════════════════════════════════
//  Page 2 — Mesures
// ══════════════════════════════════════

// Le menu Mesures peut être ouvert sur les seules mesures d'une carence : la
// mention le dit, faute de quoi la table paraîtrait incomplète sans raison.
function mesFiltreCarence() {
    const id = MES_STATE.filtres.mes_carence;
    if (!id) return '';
    const c = (MES_STATE.data.constatations || []).find((x) => x.id === id) || {};
    return `<span class="mes-filtre-carence">${_mesEsc(mt('carence_ref', c.reference || id))}
        <button class="btn-nu" title="${_mesAttr(mt('retirer_filtre'))}"
                onclick="mesSetFiltre('mes_carence','')">${MES_ICONS.x}</button></span>`;
}

function mesMesuresFiltrees() {
    const F = MES_STATE.filtres;
    const q = _mesNorm(F.mes_recherche);
    return MES_STATE.data.mesures.filter((m) => {
        if (F.mes_categorie && m.categorie !== F.mes_categorie) return false;
        if (F.mes_statut && mesStatutSuivi(m) !== F.mes_statut) return false;
        if (F.mes_prest && m.prestataire_id !== F.mes_prest) return false;
        // Filtre posé depuis le menu Carences : les mesures d'un seul dossier.
        if (F.mes_carence && m.constatation_id !== F.mes_carence) return false;
        if (!q) return true;
        return _mesNorm(`${m.reference} ${m.objet} ${m.description} ${m.prestataire_nom} ${mesLibelleType(m.type_mesure)}`).includes(q);
    });
}

// La table du menu « Mesures » montre ce que l'instance décisionnelle a arrêté
// à l'étape « Qualification et Mesures » : la sanction, sa portée, son terme.
// Une seule action pour l'instant — ouvrir le suivi de la mesure.
function mesLignesMesures() {
    const liste = mesMesuresFiltrees();
    if (!liste.length) {
        return `<tr><td colspan="8" class="mes-table-vide">${mt('aucune_mesure_corresp')}</td></tr>`;
    }
    return liste.map((m) => {
        const retard = mesEnRetard(m);
        // Un suivi soldé, sans suite ou sans objet n'appelle plus de geste :
        // le bouton reste, pour ouvrir le dossier, mais cesse d'inviter.
        const suiviClos = ['solde', 'sans_suite', 'sans_objet'].includes(mesStatutSuivi(m));
        const portee = m.portee === 'illimitee'
            ? `<span class="mes-badge annulee">${mt('illimitee')}</span>`
            : (m.portee === 'sans_objet'
                ? `<span class="mes-badge">${mt('sans_objet')}</span>`
                : m.portee === 'temporelle'
                ? `<span class="mes-badge en_cours">${mt('limitee_temps')}</span>${m.duree_valeur
                    ? `<div style="font-size:.75rem;color:var(--text-muted);">${_mesEsc(
                        `${m.duree_valeur} ${m.duree_unite || 'jours'}`)}</div>` : ''}`
                : '<span class="mes-preuve-vide">—</span>');
        return `<tr>
            <td><strong>${_mesEsc(m.reference)}</strong>${m.constatation_ref
                ? `<div style="font-size:.75rem;color:var(--text-muted);">${_mesEsc(m.constatation_ref)}</div>` : ''}</td>
            <td>${_mesEsc(m.prestataire_nom || '—')}</td>
            <td class="mes-cell-mesure">
                <div class="mes-cell-categorie">${_mesEsc(mesLibelleCategorie(m.categorie))}</div>
                <div class="mes-cell-type">${_mesEsc(mesLibelleType(m.type_mesure) || '—')}${
                    // La description de la sanction dit ce qu'elle impose ;
                    // l'objet ne sert que si elle manque, la carence étant déjà
                    // nommée par sa référence en première colonne. Elle suit le
                    // type sur la même ligne, séparée par un deux-points.
                    m.description || m.objet
                        ? ` : <span class="mes-cell-description">${_mesEsc(m.description || m.objet)}</span>` : ''}</div>
            </td>
            <td>${m.date_sanction ? mesDate(m.date_sanction) : mesDate(m.date_emission)}</td>
            <td>${portee}</td>
            <td>${retard
                ? `<span class="mes-date-retard" title="${_mesAttr(mt('echeance_depassee'))}">${mesDate(m.date_echeance)}</span>`
                : mesDate(m.date_echeance)}</td>
            <td>${mesStatutMesure(m)}</td>
            <td class="mes-actions">
                <div class="mes-actions-duo">
                    <button class="btn btn-sm ${suiviClos ? 'mes-btn-consulter' : 'mes-btn-mesure'}"
                            onclick="mesFaireLeSuivi('${m.id}')"
                            title="${_mesAttr(suiviClos ? mt('suivi_termine_consulte') : mt('ouvre_suivi'))}">
                        ${MES_ICONS.check} ${suiviClos ? mt('consulte') : mt('suivi')}</button>
                    ${mesEstSuperAdmin() ? `<button class="btn btn-outline btn-sm mes-btn-icone mes-btn-danger"
                        title="${_mesAttr(mt('supprimer_mesure'))}" aria-label="${_mesAttr(mt('supprimer_mesure'))}"
                        onclick="mesSupprimerMesure('${m.id}')">${MES_ICONS.delete}</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Ouvre le menu « Mesures » sur les seules mesures d'une carence. Le volet qui
// les résume se ferme : c'est la table qui prend le relais.
function mesOuvrirTableMesures(constatationId) {
    if (typeof mesFermerHistorique === 'function') mesFermerHistorique();
    const F = MES_STATE.filtres;
    F.mes_carence = constatationId;
    F.mes_categorie = ''; F.mes_statut = ''; F.mes_prest = ''; F.mes_recherche = '';
    mesNavigateTo('mesures');
}

// « Faire le suivi » rouvre le traitement de la carence dont la mesure est
// issue, à l'étape du suivi : la mesure ne se suit pas seule, elle se suit
// dans le dossier qui l'a value.
async function mesFaireLeSuivi(id) {
    const m = (MES_STATE.data.mesures || []).find((x) => x.id === id);
    if (!m) return;
    if (!m.constatation_id) {
        mesToast(mt('mesure_sans_carence'), 'error');
        return;
    }
    const c = (MES_STATE.data.constatations || []).find((x) => x.id === m.constatation_id);
    if (!c) {
        mesToast(mt('carence_introuvable'), 'error');
        return;
    }
    MES_STATE.carenceEnCours = c;
    MES_STATE.mesureEnCours = null;
    try { MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`); }
    catch (e) { mesToast(e.message || mt('traitement_illisible'), 'error'); return; }
    // On ouvre là où le suivi se fait, quelle que soit l'étape atteinte.
    MES_STATE.etapeVue = 'suivi';
    mesAfficherSlider();
}

function mesRenderMesures() {
    const F = MES_STATE.filtres;
    const opt = (v, l, cur) => `<option value="${_mesAttr(v)}" ${cur === v ? 'selected' : ''}>${_mesEsc(l)}</option>`;
    return `
    <div class="mes-page-header">
        <h2>${mt('nav_mesures')}</h2>
        ${mesBoutonsExport('mesures')}
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_categorie',this.value)">
                <option value="">${mt('toutes_categories')}</option>
                ${mesCategories().map((c) => opt(c.code, c.libelle, F.mes_categorie)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_statut',this.value)">
                <option value="">${mt('tous_suivis')}</option>
                ${Object.keys(MES_SUIVI).map((v) => opt(v, mt(`suivi_${v}`), F.mes_statut)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('mes_prest',this.value)">
                <option value="">${mt('tous_prestataires')}</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.mes_prest)).join('')}
            </select>
            <input class="mes-input mes-filtre-large" type="text" placeholder="${_mesAttr(mt('rechercher'))}" value="${_mesAttr(F.mes_recherche)}"
                   oninput="mesRechercher('mes_recherche', this.value)">
            ${mesFiltreCarence()}
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresMesures()"
                    title="${_mesAttr(mt('reinit_filtres'))}" aria-label="${_mesAttr(mt('reinit_filtres'))}">${MES_ICONS.reset}</button>
        </div>
    </div>
    <div class="mes-card" style="padding:0;">
        <div class="mes-table-wrap">
            <table class="mes-table mes-table-plate">
                <thead><tr>
                    <th style="width:120px;">${mt('col_reference')}</th>
                    <th style="width:150px;">${mt('col_prestataire')}</th>
                    <th style="width:28%;">${mt('col_cat_type_desc')}</th>
                    <th style="width:105px;">${mt('col_date_sanction')}</th>
                    <th style="width:120px;">${mt('col_portee')}</th>
                    <th style="width:105px;">${mt('col_echeance')}</th>
                    <th style="width:140px;">${mt('col_statut_suivi')}</th>
                    <th style="width:140px;text-align:center;">${mt('col_actions')}</th>
                </tr></thead>
                <tbody data-corps="mesures">${mesLignesMesures()}</tbody>
            </table>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  Page 3 — Carences
// ══════════════════════════════════════

// Le bouton d'action dit où en est le traitement, plutôt que d'inviter
// indistinctement à « traiter » un dossier déjà bien avancé. Une carence
// classée s'ouvre aussi : son dossier se consulte, il ne se modifie plus.
const MES_LIBELLE_ETAPE = {
    suite: 'etape_suite',
    investigations: 'etape_investigations',
    qualification: 'etape_qualification',
    suivi: 'etape_suivi',
};
// La table ne retient que la clé : l'étape se nomme dans la langue retenue.
const mesLibelleEtape = (etape) => mt(MES_LIBELLE_ETAPE[etape] || MES_LIBELLE_ETAPE.suite);

function mesBoutonTraitement(c) {
    const etape = c.traitement_etape || 'suite';
    // Le dossier est clos quand il a été déclaré tel, ou quand la carence a été
    // classée. Atteindre l'étape « Suivi des Mesures » ne le clôt pas : le
    // bouton l'annonçait pourtant, quand le badge sous lui disait « Sous Suivi ».
    const clos = c.classee || (etape === 'suivi' && c.traitement_clos);
    const libelle = clos ? mt('traitement_cloture') : mesLibelleEtape(etape);
    // Un dossier clos se consulte : le bouton reste, sans l'accent de l'action.
    const classe = clos ? 'btn-outline' : 'mes-btn-mesure';
    if (!mesPeutEcrire() && !clos) return '';
    // Pas d'icône : le libellé porte seul le sens, et se centre dans le bouton
    // qu'il tienne sur une ligne ou deux.
    return `<button class="btn btn-sm ${classe}"
        title="${_mesAttr(clos ? mt('consulter_dossier')
            : mt('poursuivre_traitement', mesLibelleEtape(etape)))}"
        onclick="mesMesureDepuisConstatation('${c.id}')">${_mesEsc(libelle)}</button>`;
}

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
        return `<tr><td colspan="8" class="mes-table-vide">${mt('aucune_carence_point')}</td></tr>`;
    }
    const prests = MES_STATE.data.prestataires;
    const aujourdhui = mesJour();
    return liste.map((c) => {
        const p = prests.find((x) => x.id === c.prestataire_id) || {};
        const retard = c.statut !== 'soldee' && c.date_due_cloture && c.date_due_cloture < aujourdhui;
        return `<tr>
            <td><strong>${_mesEsc(c.reference)}</strong>
                ${c.origine === 'RAMP'
                    ? `<div class="mes-sous-titre">${mt('ramp_cat3')}</div>` : ''}
                ${c.origine === 'CARE'
                    ? `<div class="mes-sous-titre">${mt('origine_CARE')}${c.origine_libelle
                        ? ` · ${_mesEsc(c.origine_libelle)}` : ''}</div>` : ''}</td>
            <td>
                <strong>${_mesEsc(c.titre || '—')}</strong>
                ${c.description
                    ? `<div class="mes-sous-titre">${_mesEsc(c.description)}</div>` : ''}
            </td>
            <td>${_mesEsc(p.nom || c.prestataire_nom || '—')}</td>
            <td>${mesDate(c.date_ouverture)}</td>
            <td>${retard
                // Une échéance dépassée reste signalée — c'est une information,
                // non une décoration — mais par la seule couleur du texte : la
                // pastille pleine pesait plus que ce qu'elle disait.
                ? `<span class="mes-date-retard" title="${_mesAttr(mt('echeance_depassee'))}">${mesDate(c.date_due_cloture)}</span>`
                : mesDate(c.date_due_cloture)}</td>
            <td class="mes-cell-statut">${mesBadgeStatutCare(c.statut_care)}</td>
            <td>${c.date_cloture ? mesDate(c.date_cloture) : '—'}</td>
            <td class="mes-actions">
              <div class="mes-actions-pile">
                <div class="mes-actions-grille">
                  <span class="mes-actions-case-bouton">${mesBoutonTraitement(c)}</span>
                  <span class="mes-actions-secondaires">
                    <button class="btn btn-outline btn-sm mes-btn-icone"
                            title="${_mesAttr(mt('historique_traitement'))}" aria-label="${_mesAttr(mt('historique_traitement'))}"
                            onclick="mesHistorique('${c.id}')">${MES_ICONES_ETAT.clock}</button>
                    ${c.mesures_liees ? `<button class="btn btn-outline btn-sm mes-btn-icone"
                            title="${_mesAttr(mt('voir_mesures_liees', c.mesures_liees))}" aria-label="${_mesAttr(mt('voir_mesures_liees', c.mesures_liees))}"
                            onclick="mesMesuresDeCarence('${c.id}')">${MES_ICONS.shield}</button>` : ''}
                    ${c.origine === 'CARE' && mesPeutEcrire() ? `
                    <button class="btn btn-outline btn-sm mes-btn-icone" title="${_mesAttr(mt('modifier'))}" aria-label="${_mesAttr(mt('modifier'))}"
                            onclick="mesOuvrirConstat('${c.id}')">${MES_ICONS.edit}</button>` : ''}
                    ${c.origine === 'CARE' && mesPeutEcrire() && mesEstAdmin()
                        && !c.mesures_liees && !c.classee
                        ? `<button class="btn btn-outline btn-sm mes-btn-icone mes-btn-danger" title="${_mesAttr(mt('supprimer'))}" aria-label="${_mesAttr(mt('supprimer'))}"
                                   onclick="mesSupprimerConstat('${c.id}')">${MES_ICONS.delete}</button>` : ''}
                  </span>
                </div>
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
        <h2>${mt('nav_carences')}</h2>
        <div class="mes-page-actions">
            ${mesPeutEcrire()
                ? `<button class="btn btn-primary btn-sm" onclick="mesOuvrirConstat()">
                       ${MES_ICONS.add} ${mt('ajouter_carence')}</button>` : ''}
            ${mesBoutonsExport('constatations')}
        </div>
    </div>
    <div class="mes-action-bar">
        <div class="mes-filtres">
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_origine',this.value)">
                <option value="">${mt('toutes_origines')}</option>
                ${MES_CLES_ORIGINE.map((cle) => [cle, mesOrigine(cle)])
                    .map(([cle, lib]) => opt(cle, lib, F.crit_origine)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_statut',this.value)">
                <option value="">${mt('tous_statuts')}</option>
                ${Object.keys(MES_STATUT_CARE)
                    .map((cle) => opt(cle, mesLibelleCare(cle), F.crit_statut)).join('')}
            </select>
            <select class="mes-select mes-filtre-court" onchange="mesSetFiltre('crit_prest',this.value)">
                <option value="">${mt('tous_prestataires')}</option>
                ${MES_STATE.data.prestataires.map((p) => opt(p.id, p.nom, F.crit_prest)).join('')}
            </select>
            <input class="mes-input mes-filtre-large" type="text" placeholder="${_mesAttr(mt('rechercher'))}"
                   value="${_mesAttr(F.crit_recherche)}"
                   oninput="mesRechercher('crit_recherche', this.value)">
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesResetFiltresCritiques()"
                    title="${_mesAttr(mt('reinit_filtres'))}" aria-label="${_mesAttr(mt('reinit_filtres'))}">${MES_ICONS.reset}</button>
        </div>
    </div>
    <p class="mes-note">${mt('note_carences')}</p>

    <div class="mes-card" style="padding:0;">
        <div class="mes-table-wrap">
            <table class="mes-table mes-table-plate">
                <thead><tr>
                    <th style="width:150px;">${mt('col_reference')}</th>
                    <th>${mt('col_objet_desc')}</th>
                    <th style="width:120px;">${mt('col_prestataire')}</th>
                    <th style="width:110px;">${mt('col_ouverture')}</th>
                    <th style="width:110px;">${mt('col_echeance')}</th>
                    <th style="width:130px;text-align:center;">${mt('col_statut')}</th>
                    <th style="width:110px;">${mt('col_cloture')}</th>
                    <th style="width:135px;text-align:center;">${mt('col_actions')}</th>
                </tr></thead>
                <tbody data-corps="critiques">${mesLignesCritiques()}</tbody>
            </table>
        </div>
    </div>`;
}

async function mesMesureDepuisConstatation(constatationId) {
    const c = MES_STATE.data.constatations.find((x) => x.id === constatationId);
    if (!c) return;
    const premiere = mesCategories()[0] || {};
    MES_STATE.mesureEnCours = {
        categorie: premiere.code || '',
        constatation_id: c.id,
        prestataire_id: c.prestataire_id || '',
        objet: c.titre || c.reference || '',
    };
    MES_STATE.carenceEnCours = c;
    MES_STATE.etapeVue = '';
    // Le plan d'actions vient du module qui a relevé la carence : il arrive
    // avec le traitement, en une seule demande.
    try { MES_STATE.traitement = await mesApi(`/constatations/${encodeURIComponent(c.id)}/traitement`); }
    catch (e) { MES_STATE.traitement = null; mesToast(e.message || mt('traitement_illisible'), 'error'); }
    mesAfficherSlider();
}

function mesFermerSlider() {
    MES_STATE.mesureEnCours = null;
    MES_STATE.carenceEnCours = null;
    MES_STATE.traitement = null;
    MES_STATE.etapeVue = '';
    MES_STATE.sliderOpen = false;
    document.getElementById('mesSlider')?.classList.remove('open');
    document.getElementById('mesSliderOverlay')?.classList.remove('open');
}

// `anime: false` remonte un volet déjà ouvert après un redessin de la coquille :
// il se pose à sa place sans rejouer son glissement.
//
// L'ordre compte. On coupe la transition, on pose la classe d'ouverture, puis
// une lecture forcée acquiert la position finale avant de rendre la transition.
// Figer après coup ne servait à rien : la position d'arrivée était déjà connue,
// et le glissement se rejouait.
const mesFiger = (el) => el && el.classList.add('mes-sans-glissement');
function mesDegeler(el) {
    if (!el) return;
    void el.offsetWidth;
    el.classList.remove('mes-sans-glissement');
}

// Hauteur réelle du bandeau UEMOA, relevée sur la page : le volet s'arrête
// juste au-dessus. La mesurer vaut mieux que la deviner — le bandeau grandit
// d'une ligne dès que la fenêtre se resserre.
function mesMesurerPied() {
    const pied = document.querySelector('.oasis-module-footer');
    const h = pied ? Math.round(pied.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--mes-pied', `${h || 44}px`);
}

// Le bandeau passe sur deux lignes quand la fenêtre se resserre : le volet
// suit, sinon il le recouvrirait de nouveau.
window.addEventListener('resize', () => { if (MES_STATE.sliderOpen) mesMesurerPied(); });

function mesAfficherSlider(o) {
    const el = document.getElementById('mesSlider');
    if (!el) return;
    mesMesurerPied();
    // Ajouter une ligne ou cocher une case redessine le volet entier : sans
    // cela, la page remontait en haut à chaque geste et il fallait redescendre
    // à l'endroit où l'on travaillait. La position de lecture est reprise.
    const corpsAvant = el.querySelector('.mes-slider-body');
    const defilement = corpsAvant ? corpsAvant.scrollTop : 0;
    el.innerHTML = mesFormulaireMesure();
    if (defilement) {
        const corps = el.querySelector('.mes-slider-body');
        if (corps) corps.scrollTop = defilement;
    }
    const fond = document.getElementById('mesSliderOverlay');
    const sansAnimation = !!(o && o.anime === false);
    if (sansAnimation) { mesFiger(el); mesFiger(fond); }
    el.classList.add('open');
    fond?.classList.add('open');
    if (sansAnimation) { mesDegeler(el); mesDegeler(fond); }
    MES_STATE.sliderOpen = true;
}

// Volet du traitement d'une carence. Il n'affiche que les sections de l'étape
// regardée : le formulaire de mesure autonome qu'il portait jadis n'avait plus
// de porte d'entrée depuis que la mesure se décide à la qualification.
function mesFormulaireMesure() {
    const m = MES_STATE.mesureEnCours || {};
    const clos = MES_CLOS.includes(m.statut);
    // Une mesure clôturée ou annulée se consulte, elle ne se réécrit plus.
    const ro = clos || !mesPeutEcrire();

    // Le volet suit le fil de la carence : tant que la suite à donner n'est
    // pas décidée, ce sont les sections de la première étape qui s'affichent.
    const etape = mesEtapeCourante();

    return `
    <div class="mes-slider-header">
        <button class="btn btn-outline btn-sm mes-btn-retour" onclick="mesFermerSlider()"
                title="${_mesAttr(mt('retour'))}">${MES_ICONS.back} ${mt('retour')}</button>
        <span class="mes-slider-titre">${mt('traitement_carence')}</span>
    </div>
    ${mesFilAvancement()}
    <div class="mes-slider-body">
        ${clos ? `<p class="mes-note">${mt('mesure_close_consulte')}</p>` : ''}
        ${etape === 'suite' ? `
            ${mesSectionCarence()}
            ${mesSectionPac()}
            ${mesSectionInformations()}
            ${mesSectionDecision()}` : ''}
        ${etape === 'qualification' ? mesQualCorps() : ''}
        ${etape === 'investigations' ? `
            ${mesRenvoisInvestigation()}
            ${mesSectionEquipe()}
            ${mesSectionTravaux()}
            ${mesSectionAutresElements()}
            ${mesSectionRapport()}` : ''}
        ${etape === 'suivi' ? `
            ${mesSectionSuiviMesures()}
            ${mesSectionPlanAction()}` : ''}
        <p class="mes-erreur" id="mesFormErreur"></p>
    </div>
    ${mesBarreInferieure(ro, etape)}`;
}

// Saisie en cours du volet « carence », relevée dans le DOM — même lecture que
// l'enregistrement, pour que rien ne se perde quand la coquille est redessinée.
function mesCollecterConstat() {
    const v = (id) => (document.getElementById(id) || {}).value;
    if (document.getElementById('mesConstTitre') === null) return {};
    return {
        titre: v('mesConstTitre'),
        description: v('mesConstDesc'),
        prestataire_id: v('mesConstPrest'),
        origine_libelle: v('mesConstSource'),
        delai_jours: v('mesConstDelai'),
        date_ouverture: v('mesConstOuverture'),
        date_due_cloture: v('mesConstEcheance'),
    };
}

async function mesSupprimerMesure(id) {
    const m = MES_STATE.data.mesures.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(mt('confirmer_suppr_mesure', m.reference || ''))) return;
    try {
        await mesApi(`/mesures/${id}`, { method: 'DELETE' });
        await mesRechargerMesures();
        mesToast(mt('mesure_supprimee'));
    } catch (e) { mesToast(e.message || mt('suppression_impossible'), 'error'); }
}

// ══════════════════════════════════════
//  Exports globaux
// ══════════════════════════════════════
// Les gestionnaires `onclick` du balisage cherchent ces fonctions sur `window` ;
// dans l'iframe, une déclaration `const` de haut niveau n'y figure pas.

Object.assign(window, {
    MES_STATE, MES_API, MES_ICONS, MES_NAV, MES_CLES_STATUT, mesLibelleStatut, mesOrigine,
    mesApi, mesLoadData, mesRenderApp, mesRenderPage, mesNavigateTo,
    mesToggleSidebar, mesSetTheme, mesSetLang, mesRetourPortail, mesDeconnexion,
    mesSetFiltre, mesRechercher, mesResetFiltresDashboard,
    mesResetFiltresMesures, mesResetFiltresCritiques,
    mesFermerSlider, mesAfficherSlider, mesFaireLeSuivi,
    mesStatutMesure, mesStatutSuivi, MES_SUIVI, mt, mesLibelleCare, mesLibelleEtape,
    mesLibelleSuivi, mesAideSuivi,
    mesSupprimerMesure, mesMesureDepuisConstatation, mesBoutonTraitement,
    mesTypesInvestigation, mesComites, mesRechargerParametres,
    mesFiltreCarence, mesOuvrirTableMesures,
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
function mesAfficherVolet(o) {
    const el = document.getElementById('mesVoletRoot');
    if (!el) return;
    const k = MES_STATE.constatEnCours;
    if (!k) { el.innerHTML = ''; return; }
    el.innerHTML = mesConstatFormulaire(k);
    const volet = el.querySelector('.mes-volet');
    const fond = el.querySelector('.mes-volet-fond');
    if (o && o.anime === false) {
        mesFiger(volet); mesFiger(fond);
        volet?.classList.add('ouvert'); fond?.classList.add('ouvert');
        mesDegeler(volet); mesDegeler(fond);
        return;
    }
    requestAnimationFrame(() => {
        volet?.classList.add('ouvert');
        fond?.classList.add('ouvert');
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
    <div class="mes-volet" role="dialog" aria-label="${_mesAttr(mt('carence'))}">
        <div class="mes-volet-entete">
            <span style="flex:1;">${k.id ? mt('modifier_carence') : mt('nouvelle_carence')}</span>
            <button class="btn btn-outline btn-sm mes-btn-icone" onclick="mesFermerVolet()" aria-label="${_mesAttr(mt("fermer"))}" title="${_mesAttr(mt("fermer"))}">${MES_ICONS.close}</button>
        </div>
        <div class="mes-volet-corps">
            <p class="mes-note">${mt('note_carence_saisie')}</p>
            ${champ('mesConstTitre', mt('objet'), k.titre, `placeholder="${_mesAttr(mt('objet_exemple'))}"`)}
            <div class="mes-champ">
                <label>${mt('description')}</label>
                <textarea class="mes-input" id="mesConstDesc" rows="5"
                          placeholder="${_mesAttr(mt('description_exemple'))}">${_mesEsc(k.description || '')}</textarea>
            </div>
            <div class="mes-champ">
                <label>${mt('prestataire')}</label>
                <select class="mes-select" id="mesConstPrest">
                    <option value="">—</option>
                    ${MES_STATE.data.prestataires.map((p) => `<option value="${_mesAttr(p.id)}"
                        ${k.prestataire_id === p.id ? 'selected' : ''}>${_mesEsc(p.nom)}</option>`).join('')}
                </select>
            </div>
            ${champ('mesConstSource', mt('origine_constat'), k.origine_libelle,
                `placeholder="${_mesAttr(mt('origine_exemple'))}"`)}
            <div class="mes-grille-3">
                ${champ('mesConstOuverture', mt('ouverture'), k.date_ouverture,
                    'type="date" oninput="mesConstatDelai(\'ouverture\')"')}
                ${champ('mesConstDelai', mt('delai_jours'), k.delai_jours,
                    `type="number" min="0" placeholder="${_mesAttr(mt('delai_exemple'))}" oninput="mesConstatDelai('delai')"`)}
                ${champ('mesConstEcheance', mt('cloture'), k.date_due_cloture,
                    'type="date" oninput="mesConstatDelai(\'echeance\')"')}
            </div>
            <p class="mes-erreur" id="mesConstErreur"></p>
        </div>
        <div class="mes-volet-pied">
            <button class="btn btn-outline btn-sm" onclick="mesFermerVolet()">${mt('annuler')}</button>
            <button class="btn btn-primary btn-sm" onclick="mesEnregistrerConstat()">
                ${MES_ICONS.check} ${mt('enregistrer')}</button>
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
    if (!corps.titre) { if (err) err.textContent = mt('objet_requis'); return; }
    try {
        await mesApi(k.id ? `/constatations/${k.id}` : '/constatations', {
            method: k.id ? 'PUT' : 'POST',
            body: JSON.stringify(corps),
        });
        mesFermerVolet();
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesRenderPage();
        mesToast(k.id ? mt('carence_modifiee') : mt('carence_ajoutee'));
    } catch (e) {
        if (err) err.textContent = e.message || mt('enregistrement_impossible');
    }
}

async function mesSupprimerConstat(id) {
    const c = MES_STATE.data.constatations.find((x) => x.id === id) || {};
    if (!await oasisConfirmer(mt('confirmer_suppr_carence', c.reference || ''))) return;
    try {
        await mesApi(`/constatations/${id}`, { method: 'DELETE' });
        MES_STATE.data.constatations = await mesApi('/constatations');
        mesRenderPage();
        mesToast(mt('carence_supprimee'));
    } catch (e) { mesToast(e.message || mt('suppression_impossible'), 'error'); }
}

// Classer : l'autorité décide qu'aucune suite ne sera donnée. La carence
// reste inscrite — c'est la décision qui la clôt, non son effacement.

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
        el('mesConstEcheance').value = oasisJour(new Date(debut.getTime() + jours * jour));
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
    const infobulle = o.infobulle || mt('filtrer');
    // Ce que le creux du camembert compte : des mesures par défaut, mais la
    // répartition des carences en compte d'autres — elle annonçait « 32
    // mesures » sur trente-deux carences.
    const unite = o.unite || 'mesure';
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
                   <span>${_mesEsc(unite)}${total > 1 ? 's' : ''}</span>
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
