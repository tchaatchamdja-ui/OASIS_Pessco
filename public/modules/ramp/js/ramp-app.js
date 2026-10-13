/* OASIS — Module « Inspections d'aéronefs sur aire de trafic » (RAMP, D.8)
 *
 * Reprise de l'application RAMP. Huit menus :
 *   Tableau de Bord · Statistiques · Inspections · Écarts
 *   Importation · Dépôt · Contacts · Paramètres
 *
 * La coquille suit la charte du module « Exécution de la Surveillance » :
 * barre latérale identique (retour portail, entrées, thèmes, langues, repli),
 * barre supérieure « Module / Page » avec identité et rôle, barre inférieure
 * servie par le chrome du socle.
 *
 * Ce fichier porte l'état, la coquille, les filtres et les quatre premiers
 * écrans. Les statistiques sont dans ramp-stats.js, le paramétrage, le dépôt
 * et les contacts dans ramp-parametres.js.
 */

const RAMP_API = '/api/m/ramp';

const RAMP_STATE = {
    user: null,
    privilege: '',
    // Vue active du module : « aac » ou « prestataire ». Le serveur la pose au
    // contexte ; elle commande les menus, les boutons et le périmètre affiché.
    vue: { vue: 'aac', disponible: false, prestataire_id: '', prestataires: [], exploitants: [] },
    // Instance regardée, servie par le contexte : { disponible, locale,
    // courante, instances }. Commune au portail et aux six modules.
    instance: {},
    // Ce que l'organisme a confié au compte, en vue Prestataire.
    droitsPrestataire: [],
    adminPrestataire: false,
    etatsInspection: [],
    etatsContact: [],
    currentPage: 'dashboard',
    sidebarCollapsed: localStorage.getItem('ramp_sidebar') === 'true',
    theme: 'blue-dark',
    lang: 'fr',
    data: {
        inspections: [],
        parametres: { familles: {}, modifiable: false },
        depots: [],
        contacts: [],
    },
    // Onze filtres, communs au tableau de bord, aux statistiques et aux deux
    // listes : c'est le même jeu de données qu'on regarde sous quatre angles.
    filtres: {
        annee: '', trimestre: [], etat: '', exploitant: '', aeronef: '',
        immatriculation: '', categorie: '', action: '', statut: '', recherche: '',
        // États membres retenus par la barre basse des listes : plusieurs à
        // la fois, en plus des critères de la barre haute.
        paysUemoa: [],
        // Filtres propres à l'écran Dépôt.
        depotAnnee: '', depotMois: '', depotAuteur: '', depotRecherche: '',
    },
    // Le carnet des correspondants s'ouvre rangé par État : c'est par là qu'on
    // le parcourt. Les autres tables s'ouvrent dans l'ordre de leurs données.
    tri: { insp: null, ecarts: null, situation: null, contacts: { cle: 'etat', sens: 'asc' } },
    // Écrans à état propre.
    apercu: null,
    // Recherche escamotable des écarts : dépliée ou non.
    rechercheOuverte: false,
    // Panneau des trimestres ouvert.
    trimestresOuvert: false,
    // Parts retirées des anneaux des statistiques, par graphique.
    anneauxMasques: {},
    // États retirés des deux histogrammes « par États » des statistiques.
    etatsExclus: {},
    // Série affichée par ces histogrammes : les deux, ou l'une d'elles.
    etatsSerie: 'toutes',
    // Répartition temporelle : pas de temps, périodes retenues, menu ouvert.
    tempsPas: 'mois',
    tempsSerie: 'toutes',
    tempsSelection: {},
    tempsMenu: '',
    // Année observée par les graphiques mensuel / trimestriel / semestriel.
    tempsAnnee: '',
    // Générateur de tables : catalogue des champs, colonnes posées, forme.
    tableChamps: null,
    tableLiees: {},
    tableColonnes: [],
    // Filtres propres à l'export du générateur.
    tableFiltres: {},
    // Totaux demandés dans la table exportée.
    tableTotaux: { colonnes: true, sousTotaux: true, general: true },
    // Les aéronefs des statistiques : par modèle-variante ou par désignation.
    statsAeronefMode: 'modele',
    aeronefsCorrespondances: null,
    // Catégories retirées de l'anneau du tableau de bord, par un clic sur leur
    // ligne de légende.
    catMasquees: {},
    // Fiche POI d'origine de l'inspection affichée en rapport, si elle existe.
    apercuPoi: null,
    // Sous-menu actif du menu « États ».
    // Volet ouvert : la fonction qui le redessine. Tant qu'elle est posée,
    // `rampRenderPage` la rejoue au lieu de rendre la page sous-jacente.
    voletRejouer: null,
    importPrevisu: [],
    paramOnglet: 'pays',
    // Bande latérale des sous-menus des Paramètres : repliée ou non.
    paramBarreRepliee: false,
    paramEnCours: null,
    depotEnCours: null,
    contactEnCours: null,
    // Groupes de contacts : absent = déplié, `false` = replié à la main.
    groupesOuverts: {},
    // Groupes d'items dépliés à l'écran des paramètres. Absent = déplié.
    groupesItems: {},
    // Nomenclature des aéronefs : servie page par page, elle a son propre état.
    // `ouverts` retient les désignations dépliées — absent = replié, une liste
    // de mille désignations ne s'ouvre pas d'un bloc.
    aeronefs: {
        chargement: false, resultat: null, page: 1, ouverts: {},
        filtres: { designation: '', constructeur: '', etat: '', recherche: '' },
    },
    aeronefEnCours: null,
    // Pays : les 249 entités ISO 3166-1, servies d'un bloc et filtrées ici.
    pays: {
        chargement: false, liste: [], modifiable: false,
        filtres: { uemoa: '', aac: '', recherche: '' },
    },
    paysEnCours: null,
    // Fiches d'inspection (POI) : la liste, le paramétrage qui alimente le
    // formulaire, et la fiche ouverte.
    poi: {
        chargement: false, demande: false, liste: [], contexte: null, peutSaisir: false,
        filtres: { statut: '', etat: '', recherche: '' },
    },
    poiEnCours: null,
    poiGroupesReplies: {},
    // Listes ouvertes du formulaire dont on a demandé la saisie libre.
    poiSaisieLibre: {},
    // Étape de la fiche que l'on consulte, quand elle diffère de l'étape
    // courante du circuit.
    poiVue: '',
    selecteurAeronef: null,
    // Classe d'action choisie à la main : le calcul automatique s'efface alors.
    poiClasseManuelle: false,
    // Commentaires de validation : saisie en cours, versions dépliées, et
    // repli horizontal du panneau.
    poiCommentairesSaisie: [],
    poiVersionsOuvertes: {},
    // Volets de l'étape Transmission : fermés tant qu'on ne les ouvre pas.
    poiVoletsTransmission: {},
    poiCommentairesReplies: false,
    pieceEnCours: null,
    // Aéroports : une cinquantaine de plateformes, servies d'un bloc et
    // filtrées à l'écran. `replies` retient les pays refermés — absent =
    // déplié, huit pays tiennent à l'écran.
    aeroports: {
        chargement: false, liste: [], modifiable: false, replies: {},
        filtres: { pays: '', statut: '', recherche: '' },
    },
    aeroportEnCours: null,
    lignesDepliees: {},
    // Écarts dépliés à l'état « Écarts » : absent = replié.
    ecartsDeplies: {},
    // Inspections dépliées au menu « Inspections » : le rang ouvre la liste de
    // ses écarts. Absent = replié.
    inspectionsDepliees: {},
    // Écart dont on suit le plan d'actions correctives, et action visée par la
    // preuve en cours de dépôt.
    pacEnCours: null,
    preuveAction: 'curative',
    pacEvaluationRepliee: false,
    pacSuiviEdite: '',
};

// ══════════════════════════════════════
//  Requêtes
// ══════════════════════════════════════

// Le client vient du socle (oasis-commun.js), comme celui des Mesures.
function rampApi(chemin, options) { return oasisJson(RAMP_API + chemin, options); }

// ══════════════════════════════════════
//  Échappement
// ══════════════════════════════════════
// `_rEsc` protège le texte ; `_rAttr` protège une valeur d'attribut, où un
// guillemet refermerait l'attribut. Les données viennent d'un classeur Excel
// dont personne ne maîtrise le contenu.

// L'échappement vient du socle (oasis-commun.js) : un seul barème pour tous
// les modules. Le nom demeure, les gabarits n'ont rien à changer.
function _rEsc(v) { return oasisEsc(v); }
const _rAttr = (v) => oasisEsc(v);
// Valeur passée en argument d'un `onclick`. `_rAttr` seul ne suffit pas : il
// rend l'apostrophe en `&#39;`, que l'analyseur HTML redonne telle quelle au
// code — « Côte d'Ivoire » refermait donc la chaîne JavaScript et le clic ne
// faisait rien. On sérialise d'abord la valeur en littéral JavaScript, guillemets
// compris, avant de l'échapper pour l'attribut.
const _rArg = (v) => _rAttr(JSON.stringify(String(v == null ? '' : v)));
const _rNorm = (v) => String(v == null ? '' : v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ══════════════════════════════════════
//  Icônes
// ══════════════════════════════════════

const RAMP_ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
    list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    inbox: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    contacts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4"/><line x1="2" y1="8" x2="4" y2="8"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="2" y1="16" x2="4" y2="16"/><circle cx="11" cy="10" r="2.5"/><path d="M7.5 17a3.5 3.5 0 0 1 7 0"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    // Case vide : ce qui n'est pas retenu. Elle fait paire avec la coche, pour
    // qu'un choix unique se voie — une coche partout n'en désigne aucune.
    caseVide: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    reset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    chevronBas: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    toggle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="22" height="12" rx="6"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>',
    clipboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>',
    // Le partage : un point qui en rejoint deux autres — ce qu'un État met à
    // la disposition des autres. L'icône du carnet d'adresses servait ici et
    // au menu « Contacts » : deux menus, une seule image.
    partage: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    // Sous-menus des Paramètres : un État, une plateforme. Les autres entrées
    // reprennent une icône déjà servie ailleurs dans le module.
    globe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/></svg>',
    tour: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21V9h6v12"/><path d="M10 9 8 3h8l-2 6"/><line x1="6" y1="21" x2="18" y2="21"/><line x1="12" y1="3" x2="12" y2="1"/></svg>',
    plane: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7L8 11l-2 3H3l2 3 3 2 1-3 3-2 3.1 4.1a1 1 0 0 0 1.7-.9z"/></svg>',
};

// ══════════════════════════════════════
//  Navigation
// ══════════════════════════════════════

// Les statistiques n'ont plus d'entrée de menu : elles s'ouvrent en volet
// depuis le bouton « Voir les Statistiques » du tableau de bord, comme dans le
// module « Exécution de la Surveillance ». Le volet occupe toute la largeur
// disponible, ce dont le tableau de situation a besoin.
const RAMP_NAV = {
    dashboard: { cle: 'nav_dashboard', icon: 'dashboard' },
    // Inspections et écarts partagent leurs filtres, mais chacun a sa propre
    // entrée : ce sont deux lectures que l'on ouvre directement.
    etats: { cle: 'nav_inspections', icon: 'list' },
    ecarts: { cle: 'nav_ecarts', icon: 'warning' },
    // Ce que les États membres mettent en commun — écarts régionaux, requêtes,
    // transmissions partagées : hors de la vue Prestataire.
    partages: { cle: 'nav_partages', icon: 'partage', aac: true },
    depot: { cle: 'nav_depot', icon: 'inbox' },
    contacts: { cle: 'nav_contacts', icon: 'contacts' },
    parametres: { cle: 'nav_parametres', icon: 'settings' },
    // Vue Prestataire : l'organisme tient ses propres comptes.
    utilisateurs: { cle: 'nav_mes_utilisateurs', icon: 'contacts', prestataire: true },
};

// ══════════════════════════════════════
//  Droits
// ══════════════════════════════════════
// Les trois rôles de RAMP se déduisent du privilège RAMP du socle.

// Vue Prestataire : le compte tient celui de l'exploitant inspecté. Il ne voit
// que ses propres données, et le module se réduit à ce qui le concerne — pas
// d'ajout ni d'import d'inspection, pas de suppression, pas de dépôt de
// preuves, pas de générateur de tables.
const rampVuePrestataire = () => (RAMP_STATE.vue || {}).vue === 'prestataire';
// Vue régionale : le super-administrateur qui ne tient le poste d'aucune AAC et
// regarde tout le dispositif. C'est la seule vue où plusieurs États se lisent
// ensemble — ailleurs, on est chez une Autorité et une seule.
const rampVueRegionale = () => {
    const inst = RAMP_STATE.instance || {};
    return !!inst.disponible && !(inst.courante || '');
};
// Menus ouverts en vue Prestataire. « Mes Utilisateurs » n'y figure que si
// l'organisme a confié la gestion des comptes — voir `rampPeutGererComptes`.
const RAMP_NAV_PRESTATAIRE = ['dashboard', 'etats', 'ecarts', 'utilisateurs'];

const rampRole = () => (RAMP_STATE.user || {}).role_ramp || 'Non autorisé';
const rampEstAdmin = () => rampRole() === 'Administrateur';
const rampEstRegional = () => rampRole() === 'Coordonnateur Régional';
const rampPeutContribuer = () => ['Administrateur', 'Coordonnateur National'].includes(rampRole());
// Le Coordonnateur Régional consulte tout mais n'importe pas : c'est la règle
// de RAMP, où l'entrée « Importation » lui était retirée du menu.
const rampPeutImporter = () => rampPeutContribuer();

// ══════════════════════════════════════
//  Dates
// ══════════════════════════════════════
// Les dates viennent d'un classeur : elles arrivent en ISO, en JJ/MM/AAAA, ou
// en numéro de série Excel. Les trois se lisent ici.

function rampParseDate(v) {
    if (!v) return null;
    if (typeof v === 'number') {
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const s = String(v).trim();
    let d = new Date(s);
    if (!Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s)) return d;
    const p = s.split(/[-/.]/);
    if (p.length >= 3) {
        let jour; let mois; let an;
        if (p[0].length === 4) { an = +p[0]; mois = +p[1] - 1; jour = +p[2]; }
        else { jour = +p[0]; mois = +p[1] - 1; an = +p[2]; if (an < 100) an += 2000; }
        d = new Date(an, mois, jour);
        if (!Number.isNaN(d.getTime())) return d;
    }
    d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

const rampDate = (v) => {
    const d = rampParseDate(v);
    return d ? d.toLocaleDateString('fr-FR') : (v || '—');
};
const rampISO = (v) => {
    const d = rampParseDate(v);
    // Une date ISO se rend telle quelle ; une date saisie « jj/mm/aaaa » est
    // construite en heure locale, et se lit donc en heure locale.
    if (/^\d{4}-\d{2}-\d{2}/.test(String(v || '').trim())) return String(v).trim().slice(0, 10);
    return d ? oasisJour(d) : '';
};

const RAMP_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const RAMP_MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ══════════════════════════════════════
//  Paramètres
// ══════════════════════════════════════

const rampFamille = (nom) => ((RAMP_STATE.data.parametres.familles || {})[nom] || []);

// Pondération d'une catégorie : elle donne son poids à un écart dans le score
// d'un exploitant. Une catégorie inconnue pèse 1 — c'est la règle de RAMP.
function rampPonderations() {
    const p = {};
    rampFamille('categories').forEach((c) => {
        p[c.code] = c.ponderation === null || c.ponderation === undefined ? 1 : Number(c.ponderation);
    });
    return p;
}

// Libellé d'un item SAFA, pour les écrans qui le nomment en entier.
function rampLibelleItem(code) {
    const it = rampFamille('items').find((x) => x.code === code);
    return it ? it.label : '';
}

// Groupe d'items auquel appartient un item relevé. Il se lit d'abord sur le
// paramètre — c'est là qu'il est tenu — et l'on ne retombe sur la lettre du
// code que pour un item absent du paramétrage : A pour le poste de pilotage,
// B pour la cabine, C pour l'état de l'aéronef, D pour le fret.
const RAMP_GROUPES_PAR_LETTRE = {
    A: 'Flight Deck', B: 'Safety/Cabin', C: 'Aircraft Condition', D: 'Cargo', E: 'General',
};
function rampGroupeDeLItem(code) {
    const item = rampFamille('items').find((x) => x.code === code);
    if (item && item.cat) {
        const g = rampFamille('groupes').find((x) => x.code === item.cat);
        return g ? g.label : item.cat;
    }
    return RAMP_GROUPES_PAR_LETTRE[String(code || '').charAt(0)] || 'Sans groupe';
}

// Un écart est clos quand le statut de son inspection le dit. Le classeur vient
// de neuf États, qui ne l'écrivent pas deux fois de la même façon : on accepte
// donc plusieurs formulations.
//
// Le « c » seul est une abréviation courante, mais il ne se cherche qu'en
// entier : RAMP le passait à `includes`, si bien qu'« En cours » — un statut
// livré d'origine — comptait pour clos.
const RAMP_CODES_CLOS = ['c', 'f'];
const RAMP_MOTS_CLOS = ['clos', 'closed', 'cloture', 'ferme', 'solde', 'termine'];
function rampEstClos(statut) {
    const s = _rNorm(statut);
    if (!s) return false;
    if (RAMP_CODES_CLOS.includes(s)) return true;
    // « en cours » dit précisément le contraire : il ne doit pas être happé
    // par « cours » ni par aucun autre mot de la liste.
    if (/\ben cours\b/.test(s)) return false;
    return RAMP_MOTS_CLOS.some((k) => s.includes(k));
}

// ══════════════════════════════════════
//  Chargement
// ══════════════════════════════════════

async function rampLoadData() {
    const [inspections, parametres] = await Promise.all([
        rampApi('/inspections').catch(() => []),
        rampApi('/parametres').catch(() => ({ familles: {} })),
    ]);
    RAMP_STATE.data.inspections = inspections || [];
    RAMP_STATE.data.parametres = parametres || { familles: {} };
}

async function rampRecharger() {
    RAMP_STATE.data.inspections = await rampApi('/inspections').catch(() => RAMP_STATE.data.inspections);
    rampRenderPage();
}

// ══════════════════════════════════════
//  Filtres
// ══════════════════════════════════════
// Un même jeu d'onze filtres sert le tableau de bord, les statistiques et les
// deux listes. `rampFiltrer()` rend les inspections retenues et les écarts qui
// en découlent, chacun portant son inspection.

function rampAnnees() {
    const a = new Set();
    RAMP_STATE.data.inspections.forEach((i) => {
        const d = rampParseDate(i.date);
        if (d) a.add(d.getFullYear());
    });
    return [...a].sort((x, y) => y - x);
}

const rampValeurs = (champ) => [...new Set(RAMP_STATE.data.inspections
    .map((i) => i[champ]).filter(Boolean))].sort();


function rampFiltrer() { return rampFiltrerAvec(RAMP_STATE.filtres); }

// Le tri des données à un jeu de critères donné. `rampFiltrer` s'en sert pour
// l'affichage ; les listes de filtres s'en servent pour ne proposer que ce qui
// reste atteignable une fois les autres critères posés.
function rampFiltrerAvec(criteres) {
    const F = criteres || {};
    const q = _rNorm(F.recherche || '');

    // Les critères de liste d'abord ; la recherche s'applique ensuite, à part,
    // car elle ne porte pas sur les mêmes colonnes selon qu'on regarde les
    // inspections ou les écarts.
    const retenues = RAMP_STATE.data.inspections.filter((i) => {
        const d = rampParseDate(i.date);
        if (F.annee) {
            if (!d || String(d.getFullYear()) !== String(F.annee)) return false;
        }
        // Le trimestre se choisit à plusieurs : la liste retenue vaut « l'un
        // de ceux-ci ». Une valeur seule reste acceptée, pour les anciens états.
        const trims = rampTrimestresRetenus(F);
        if (trims.length) {
            if (!d) return false;
            if (!trims.includes(String(Math.floor(d.getMonth() / 3) + 1))) return false;
        }
        if (F.etat && i.pays !== F.etat) return false;
        // La barre basse retient un ou plusieurs États membres ; elle s'ajoute
        // aux critères de la barre haute.
        if ((F.paysUemoa || []).length && !F.paysUemoa.includes(i.pays)) return false;
        if (F.exploitant && i.exploitant !== F.exploitant) return false;
        if (F.aeronef && i.aeronef !== F.aeronef) return false;
        if (F.immatriculation && i.immatriculation !== F.immatriculation) return false;
        if (F.statut && i.status !== F.statut) return false;
        // Filtrer sur une catégorie ou une action retient l'inspection dès
        // qu'un seul de ses écarts correspond : c'est l'inspection qui est
        // concernée, pas seulement la ligne.
        if (F.categorie && !(i.anomalies || []).some((a) => String(a.categorie) === F.categorie)) return false;
        if (F.action && !(i.anomalies || []).some((a) => String(a.action) === F.action)) return false;
        return true;
    });

    // Sur la liste des inspections, la recherche porte sur l'acte lui-même,
    // mais aussi sur ce que ses écarts disent : un item ou une description
    // recherchés doivent ramener l'inspection qui les porte.
    const inspections = !q ? retenues : retenues.filter((i) => {
        const acte = _rNorm(`${i.exploitant} ${i.immatriculation} ${i.pays} ${i.aeronef} ${i.vol} ${i.poi_reference || ''}`);
        if (acte.includes(q)) return true;
        return (i.anomalies || []).some((a) => _rNorm(
            `${a.itemCode} ${a.description} ${a.stdRef}`,
        ).includes(q));
    });

    // Les écarts se cherchent sur leurs propres colonnes : ils partent donc de
    // toutes les inspections retenues, non de celles que la recherche a gardées.
    let ecarts = [];
    retenues.forEach((i) => (i.anomalies || []).forEach((a) => ecarts.push({ ...a, inspection: i })));
    // Sur les écarts, catégorie et action s'appliquent ligne à ligne.
    if (F.categorie) ecarts = ecarts.filter((a) => String(a.categorie) === F.categorie);
    if (F.action) ecarts = ecarts.filter((a) => String(a.action) === F.action);
    if (q) {
        ecarts = ecarts.filter((a) => _rNorm(
            `${a.itemCode} ${a.description} ${a.stdRef} ${a.inspection.exploitant} ${a.inspection.immatriculation}`,
        ).includes(q));
    }
    return { inspections, ecarts };
}

// ── Filtres dynamiques ──
// Une liste ne propose que les valeurs encore atteignables : on rejoue le tri
// sans son propre critère, et on relève ce qui subsiste. La valeur choisie
// reste toujours proposée, sinon on ne pourrait plus la voir ni la lever.
const RAMP_FACETTES = {
    annee: { source: 'inspections', valeur: (i) => { const d = rampParseDate(i.date); return d ? String(d.getFullYear()) : ''; } },
    trimestre: { source: 'inspections', valeur: (i) => { const d = rampParseDate(i.date); return d ? String(Math.floor(d.getMonth() / 3) + 1) : ''; } },
    etat: { source: 'inspections', valeur: (i) => i.pays },
    exploitant: { source: 'inspections', valeur: (i) => i.exploitant },
    aeronef: { source: 'inspections', valeur: (i) => i.aeronef },
    immatriculation: { source: 'inspections', valeur: (i) => i.immatriculation },
    statut: { source: 'inspections', valeur: (i) => i.status },
    categorie: { source: 'ecarts', valeur: (a) => (a.categorie === undefined ? '' : String(a.categorie)) },
    action: { source: 'ecarts', valeur: (a) => (a.action === undefined ? '' : String(a.action)) },
};

// Les trimestres retenus, quelle que soit la forme du filtre.
function rampTrimestresRetenus(F) {
    const v = (F || {}).trimestre;
    if (Array.isArray(v)) return v.map(String);
    return v ? [String(v)] : [];
}

function rampFacette(cle) {
    const def = RAMP_FACETTES[cle];
    if (!def) return [];
    const F = RAMP_STATE.filtres;
    // Le choix d'un État ne restreint aucune autre liste : on inspecte les
    // mêmes exploitants, aéronefs et immatriculations d'un pays à l'autre, et
    // les voir disparaître empêcherait de passer directement de l'un à l'autre.
    const sansLui = { ...F, [cle]: cle === 'trimestre' ? [] : '', etat: '', paysUemoa: [] };
    // Catégorie et action se croisent entre elles sur la ligne d'écart : les
    // écarts du tri sans le critère courant portent déjà la restriction.
    const jeu = rampFiltrerAvec(sansLui)[def.source] || [];
    const valeurs = new Set();
    jeu.forEach((x) => { const v = def.valeur(x); if (v) valeurs.add(String(v)); });
    // La valeur retenue reste proposée, pour pouvoir la lever ; un critère à
    // choix multiples en apporte autant qu'il en porte.
    const retenu = F[cle];
    if (Array.isArray(retenu)) retenu.forEach((v) => { if (v) valeurs.add(String(v)); });
    else if (retenu) valeurs.add(String(retenu));
    return [...valeurs];
}

function rampSetFiltre(cle, valeur) {
    RAMP_STATE.filtres[cle] = valeur;
    rampRenderPage();
}

// Ne remet à zéro que les filtres de la barre commune : ceux du Dépôt vivent
// dans le même objet mais sur un autre écran, et n'ont pas à disparaître avec.
const RAMP_FILTRES_COMMUNS = ['annee', 'trimestre', 'etat', 'exploitant', 'aeronef',
    'immatriculation', 'categorie', 'action', 'statut', 'recherche'];

function rampResetFiltres() {
    RAMP_FILTRES_COMMUNS.forEach((k) => { RAMP_STATE.filtres[k] = ''; });
    RAMP_STATE.filtres.paysUemoa = [];
    RAMP_STATE.filtres.trimestre = [];
    rampRenderPage();
}

// ── Barre des États membres ──
// Les huit États de l'UEMOA, au bas de l'écran : on en retient autant qu'on
// veut, et cela se cumule avec les filtres de la barre haute.
const RAMP_UEMOA = ['Bénin', 'Burkina Faso', 'Côte d’Ivoire', 'Guinée-Bissau',
    'Mali', 'Niger', 'Sénégal', 'Togo'];

// Les relevés écrivent « Côte d'Ivoire » avec l'apostrophe droite ou courbe :
// on compare sur une forme normalisée.
const rampMemePays = (a, b) => _rNorm(String(a || '').replace(/[’']/g, "'"))
    === _rNorm(String(b || '').replace(/[’']/g, "'"));

// Le nom tel qu'il figure dans les données, pour que le filtre porte.
function rampNomPaysData(nom) {
    const connu = RAMP_STATE.data.inspections.find((i) => rampMemePays(i.pays, nom));
    return connu ? connu.pays : nom;
}

function rampBasculerPaysUemoa(nom) {
    const F = RAMP_STATE.filtres;
    const cible = rampNomPaysData(nom);
    const liste = F.paysUemoa || [];
    F.paysUemoa = liste.some((x) => rampMemePays(x, cible))
        ? liste.filter((x) => !rampMemePays(x, cible))
        : [...liste, cible];
    rampRenderPage();
}

function rampViderPaysUemoa() {
    RAMP_STATE.filtres.paysUemoa = [];
    rampRenderPage();
}

function rampBarrePays(dansVolet) {
    // Filtrer par État membre n'a de sens qu'en vue régionale : sous le poste
    // d'une AAC, les inspections regardées sont les siennes, et la barre
    // n'aurait qu'un État à proposer. La page se réserve sa hauteur par
    // « :has(.ramp-barre-pays) » — absente, elle ne réserve rien.
    if (!rampVueRegionale()) return '';
    const F = RAMP_STATE.filtres;
    const retenus = F.paysUemoa || [];
    const boutons = RAMP_UEMOA.map((nom) => {
        const actif = retenus.some((x) => rampMemePays(x, nom));
        return `<button class="ramp-pays-btn${actif ? ' actif' : ''}" type="button"
                    aria-pressed="${actif}"
                    onclick="rampBasculerPaysUemoa(${_rArg(nom)})">${_rEsc(nom)}</button>`;
    }).join('');

    return `
    <div class="ramp-barre-pays${dansVolet ? ' dans-volet' : ''}">
        <span class="ramp-barre-pays-titre">${rt('etats_membres')}</span>
        <div class="ramp-barre-pays-liste">${boutons}</div>
        ${retenus.length ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                onclick="rampViderPaysUemoa()" title="${_rAttr(rt('retirer_selection_etats'))}" aria-label="${_rAttr(rt('retirer_selection_etats'))}">
            ${RAMP_ICONS.reset}</button>` : ''}
    </div>`;
}

// ── Recherche escamotable ──
// Un rond bordé de la couleur du thème, une loupe au centre ; au clic il
// s'étire sur la moitié de la page et découvre son champ, suivi d'un bouton qui
// le vide. Vide et quitté, il se referme.
// Ce que la recherche parcourt sur les écarts : le champ le dit, pour qu'on
// sache ce qu'on peut y taper.
const RAMP_RECHERCHE_ECARTS = () => rt('recherche_ecarts');
// Sur les inspections, la recherche couvre l'acte et ce que ses écarts portent.
const RAMP_RECHERCHE_INSPECTIONS = () => rt('recherche_inspections');

function rampRechercheRonde(champs) {
    const F = RAMP_STATE.filtres;
    const ouverte = RAMP_STATE.rechercheOuverte || !!F.recherche;
    const couverture = champs || RAMP_RECHERCHE_ECARTS();
    return `
    <div class="ramp-recherche-ronde${ouverte ? ' ouverte' : ''}" id="rampRechercheRonde">
        <button class="ramp-recherche-loupe" type="button"
                title="${_rAttr(rt('f_rechercher'))} — ${_rAttr(couverture)}"
                aria-label="${_rAttr(rt('f_rechercher'))} : ${_rAttr(couverture)}"
                onclick="rampOuvrirRecherche()">
            ${RAMP_ICONS.search}<span class="ramp-recherche-mot">${rt('f_rechercher')}</span>
        </button>
        <input type="text" class="ramp-recherche-champ"
               placeholder="${_rAttr(rt('f_rechercher'))} : ${_rAttr(couverture.toLowerCase())}…"
               title="${_rAttr(couverture)}"
               value="${_rAttr(F.recherche)}" aria-label="Rechercher : ${_rAttr(couverture)}"
               oninput="rampChercher(this.value)" onblur="rampFermerRechercheSiVide()">
        ${ouverte ? `<button class="btn btn-outline btn-sm ramp-btn-icone ramp-recherche-reset"
                type="button" title="${_rAttr(rt('vider_recherche'))}" aria-label="${_rAttr(rt('vider_recherche'))}"
                onmousedown="event.preventDefault()"
                onclick="rampViderRecherche()">${RAMP_ICONS.reset}</button>` : ''}
    </div>`;
}

function rampOuvrirRecherche() {
    RAMP_STATE.rechercheOuverte = true;
    const boite = document.getElementById('rampRechercheRonde');
    if (!boite) { rampRenderPage(); return; }
    boite.outerHTML = rampRechercheRonde();
    const champ = document.querySelector('#rampRechercheRonde .ramp-recherche-champ');
    if (champ) champ.focus();
}

function rampFermerRechercheSiVide() {
    if (RAMP_STATE.filtres.recherche) return;
    RAMP_STATE.rechercheOuverte = false;
    const boite = document.getElementById('rampRechercheRonde');
    if (boite) boite.outerHTML = rampRechercheRonde();
}

function rampViderRecherche() {
    RAMP_STATE.filtres.recherche = '';
    RAMP_STATE.rechercheOuverte = false;
    rampRenderPage();
}

// La recherche ne redessine que le corps du tableau : re-rendre la page
// entière ferait perdre le curseur à chaque frappe.
function rampChercher(valeur) {
    RAMP_STATE.filtres.recherche = valeur;
    // La liste se redessine une fois la frappe arrêtée, non à chaque touche :
    // sur le tableau de bord, c'est la page entière qui se refait.
    oasisSaisieDifferee('ramp_recherche', () => rampChercherMaintenant());
}

function rampChercherMaintenant() {
    const corps = document.querySelector('[data-corps]');
    // Là où un tableau est affiché, seul son corps se redessine.
    if (corps && ['inspections', 'ecarts'].includes(corps.dataset.corps)) {
        const quoi = corps.dataset.corps;
        const rendreDefilement = rampMemoriserDefilement();
        corps.innerHTML = quoi === 'inspections' ? rampLignesInspections() : rampLignesEcarts();
        rendreDefilement();
        const resume = document.querySelector('[data-resume]');
        if (resume) resume.innerHTML = rampResumeHtml(quoi);
        return;
    }
    // Ailleurs — tableau de bord, statistiques — la page entière se refait :
    // les cartes et les figures dépendent des mêmes données. Le champ perdrait
    // alors le curseur à chaque frappe ; on le lui rend, au même endroit.
    const position = document.activeElement === null ? null
        : document.activeElement.selectionStart;
    rampRenderPage();
    // Le volet ouvert se superpose à la page : c'est son champ qu'il faut
    // viser, non celui du tableau de bord resté dessous.
    const champ = document.querySelector('.ramp-slider.open .ramp-recherche-boite input')
        || document.querySelector('.ramp-recherche-boite input');
    if (!champ) return;
    champ.focus();
    if (position !== null && position !== undefined) {
        try { champ.setSelectionRange(position, position); } catch (e) { /* champ non textuel */ }
    }
}

// Barre de filtres. Chaque écran choisit ceux qui lui parlent.
// ── Trimestres : plusieurs à la fois ──
// Une liste à cocher : le bouton dit ce qui est retenu, le panneau laisse en
// choisir autant qu'on veut.
function rampListeTrimestres() {
    const retenus = rampTrimestresRetenus(RAMP_STATE.filtres);
    const proposes = rampFacette('trimestre').sort();
    const ouvert = !!RAMP_STATE.trimestresOuvert;
    const intitule = retenus.length
        ? retenus.sort().map((t) => `T${t}`).join(', ')
        : rt('f_trimestres');

    return `
    <div class="ramp-multi${ouvert ? ' ouvert' : ''}" id="rampMultiTrimestres">
        <button type="button" class="ramp-select ramp-multi-bouton"
                aria-expanded="${ouvert}" onclick="rampBasculerTrimestres()">
            <span>${_rEsc(intitule)}</span>${RAMP_ICONS.chevronBas}
        </button>
        ${ouvert ? `<div class="ramp-multi-panneau">
            ${proposes.map((t) => `
            <label class="ramp-multi-choix">
                <input type="checkbox" ${retenus.includes(String(t)) ? 'checked' : ''}
                       onchange="rampBasculerTrimestre(${_rArg(String(t))})">
                <span>T${_rEsc(t)}</span>
            </label>`).join('')}
            ${proposes.length ? '' : `<span class="ramp-sous-titre">${rt('f_aucun_trimestre')}</span>`}
            ${retenus.length ? `<button class="btn btn-outline btn-sm ramp-multi-vider"
                    onclick="rampViderTrimestres()">${rt('f_tout_retirer')}</button>` : ''}
        </div>` : ''}
    </div>`;
}

function rampBasculerTrimestres() {
    RAMP_STATE.trimestresOuvert = !RAMP_STATE.trimestresOuvert;
    rampRenderPage();
}

function rampBasculerTrimestre(t) {
    const retenus = rampTrimestresRetenus(RAMP_STATE.filtres);
    RAMP_STATE.filtres.trimestre = retenus.includes(String(t))
        ? retenus.filter((x) => x !== String(t))
        : [...retenus, String(t)];
    rampRenderPage();
}

function rampViderTrimestres() {
    RAMP_STATE.filtres.trimestre = [];
    rampRenderPage();
}

function rampBarreFiltres(options) {
    const o = options || {};
    const F = RAMP_STATE.filtres;
    const opt = (v, l, cur) => `<option value="${_rAttr(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${_rEsc(l)}</option>`;
    const liste = (cle, vide, valeurs, libelle) => `
        <select class="ramp-select" onchange="rampSetFiltre('${cle}', this.value)">
            <option value="">${_rEsc(vide)}</option>
            ${valeurs.map((v) => opt(v, libelle ? libelle(v) : v, F[cle])).join('')}
        </select>`;

    // Les listes d'abord, sur une grille aux colonnes égales ; la recherche
    // en dernier, seule sur son rang et flexible.
    // Chaque liste ne montre que ce qui reste atteignable compte tenu des
    // autres critères : filtrer sur un exploitant réduit ses aéronefs, ses
    // immatriculations, ses années.
    const morceaux = [];
    const num = (t) => t.sort((a, b) => Number(b) - Number(a));
    const txt = (t) => t.sort((a, b) => String(a).localeCompare(String(b), 'fr'));

    const listeCategorie = () => {
        const cats = rampFamille('categories');
        const codes = txt(rampFacette('categorie'));
        return `<select class="ramp-select" onchange="rampSetFiltre('categorie', this.value)">
            <option value="">${rt('f_categories')}</option>
            ${codes.map((c) => {
                const t = cats.find((x) => String(x.code) === String(c));
                return opt(c, t ? t.label : c, F.categorie);
            }).join('')}
        </select>`;
    };

    morceaux.push(liste('annee', rt('f_annees'), num(rampFacette('annee'))));
    // Trimestre et État ne figurent plus sur les écrans de suivi : la période
    // se lit à l'année, et les États se choisissent dans la barre du bas.
    if (o.trimestre !== false) morceaux.push(rampListeTrimestres());
    if (o.etat !== false) morceaux.push(liste('etat', rt('f_etats'), txt(rampFacette('etat'))));
    morceaux.push(liste('exploitant', rt('f_exploitants'), txt(rampFacette('exploitant'))));
    morceaux.push(liste('aeronef', rt('f_aeronefs'), txt(rampFacette('aeronef'))));
    if (o.immatriculation !== false) {
        morceaux.push(liste('immatriculation', rt('f_immat'), txt(rampFacette('immatriculation'))));
    }
    if (o.categorie !== false) morceaux.push(listeCategorie());
    if (o.action !== false) {
        const actions = rampFamille('actions');
        const codes = txt(rampFacette('action'));
        morceaux.push(`<select class="ramp-select" onchange="rampSetFiltre('action', this.value)">
            <option value="">${rt('f_actions')}</option>
            ${codes.map((c) => {
                const a = actions.find((x) => String(x.code) === String(c));
                return opt(c, a ? `${c} — ${a.label}` : c, F.action);
            }).join('')}
        </select>`);
    }
    if (o.statut !== false) {
        morceaux.push(liste('statut', rt('f_statuts'), txt(rampFacette('statut'))));
    }
    // La recherche suit les listes dans le même flux : elle occupe ce qui
    // reste du dernier rang, et le bouton de remise à zéro la referme. Certains
    // écrans la sortent de la barre pour la poser près de leurs actions.
    // Sur les statistiques, la barre se range en cinq colonnes égales : cinq
    // listes au premier rang, trois au second, et la recherche sur les deux
    // colonnes qui restent, bouton de remise à zéro compris.
    const recherche = o.recherche === false ? '' : `
        <div class="ramp-recherche-boite">
            <input type="text" placeholder="${_rAttr(rt('f_rechercher'))}…" value="${_rAttr(F.recherche)}"
                   oninput="rampChercher(this.value)">
        </div>`;
    const reset = `<button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampResetFiltres()"
                title="${_rAttr(rt('f_reinitialiser'))}" aria-label="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>`;

    if (o.cinq) {
        return `
        <div class="ramp-filtres ramp-filtres-5">
            ${morceaux.join('')}
            <div class="ramp-filtres-fin">${recherche}${reset}</div>
        </div>`;
    }

    return `
    <div class="ramp-filtres">
        ${morceaux.join('')}
        ${recherche}
        <button class="btn btn-outline btn-sm ramp-btn-icone" onclick="rampResetFiltres()"
                title="${_rAttr(rt('f_reinitialiser'))}" aria-label="${_rAttr(rt('f_reinitialiser'))}">${RAMP_ICONS.reset}</button>
    </div>`;
}

// ══════════════════════════════════════
//  Tri des colonnes
// ══════════════════════════════════════
// RAMP triait chaque tableau au clic sur l'entête. Le tri est mémorisé par
// écran pour survivre au redessin.

function rampTrier(ecran, cle) {
    const t = RAMP_STATE.tri[ecran];
    RAMP_STATE.tri[ecran] = (t && t.cle === cle && t.sens === 'asc')
        ? { cle, sens: 'desc' }
        : { cle, sens: 'asc' };
    rampRenderPage();
}

function rampAppliquerTri(liste, ecran, valeurDe) {
    const t = RAMP_STATE.tri[ecran];
    if (!t) return liste;
    const signe = t.sens === 'asc' ? 1 : -1;
    return liste.slice().sort((a, b) => {
        const va = valeurDe(a, t.cle);
        const vb = valeurDe(b, t.cle);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * signe;
        return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'fr', { numeric: true }) * signe;
    });
}

function rampTh(ecran, cle, libelle, style) {
    const t = RAMP_STATE.tri[ecran];
    const actif = t && t.cle === cle;
    const fleche = actif ? (t.sens === 'asc' ? '▲' : '▼') : '↕';
    // L'intitulé est porté par son propre élément : trop long pour la colonne,
    // il s'abrège d'un point de suite au lieu de rejeter la flèche de tri à la
    // ligne suivante.
    return `<th class="triable" ${style ? `style="${style}"` : ''} onclick="rampTrier('${ecran}','${cle}')">`
        + `<span class="ramp-th-texte">${_rEsc(libelle)}</span> <span class="ramp-tri ${actif ? 'actif' : ''}">${fleche}</span></th>`;
}

// ══════════════════════════════════════
//  Coquille
// ══════════════════════════════════════

function rampRenderApp() {
    const S = RAMP_STATE;
    document.body.classList.toggle('app-sidebar-collapsed', !!S.sidebarCollapsed);
    const u = S.user || {};
    const initiales = ((u.prenom || u.nom || 'U')[0] + ((u.nom || '')[1] || '')).toUpperCase();

    // Le traitement des fiches n'a plus d'entrée propre : il se rattache aux
    // inspections, dont il est la suite.
    const pageMenu = S.currentPage === 'inspection' ? 'etats' : S.currentPage;
    const nav = Object.entries(RAMP_NAV).map(([cle, cfg]) => {
        if (cfg.reserve === 'contribuer' && !rampPeutImporter()) return '';
        if (rampVuePrestataire() && !RAMP_NAV_PRESTATAIRE.includes(cle)) return '';
        // Écrans propres à la vue Prestataire, et soumis à un droit confié.
        if (cfg.prestataire && !(typeof rampPeutGererComptes === 'function' && rampPeutGererComptes())) return '';
        if (cfg.aac && rampVuePrestataire()) return '';
        const label = rt(cfg.cle);
        return `<button class="nav-btn ${pageMenu === cle ? 'active' : ''}" data-page="${cle}"
                onclick="rampNavigateTo('${cle}')" title="${_rAttr(label)}">
            ${RAMP_ICONS[cfg.icon] || ''} <span>${_rEsc(label)}</span>
        </button>`;
    }).join('');

    const titrePage = RAMP_NAV[S.currentPage] ? rt(RAMP_NAV[S.currentPage].cle) : '';
    const titre = titrePage ? `RAMP Inspections / ${titrePage}` : 'RAMP Inspections';

    document.getElementById('app').innerHTML = `
    <div class="app-layout ramp-module ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header">
                <button class="btn-back-portal" onclick="rampRetourPortail()" title="${_rAttr(rt('retour_portail'))}">
                    ${RAMP_ICONS.back} <span class="back-portal-label">${rt('retour_portail')}</span>
                </button>
            </div>
            <nav class="sidebar-nav">${nav}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${OASIS_THEMES.map((th) =>
                        `<div class="theme-dot ${S.theme === th ? 'active' : ''}" data-theme="${th}"
                              onclick="rampSetTheme('${th}')" title="${oasisNomTheme(th)}"></div>`).join('')}
                </div>
                <div class="lang-selector sidebar-lang-selector">
                    ${['FR', 'EN', 'PT'].map((l) =>
                        `<button class="lang-btn ${S.lang === l.toLowerCase() ? 'active' : ''}"
                                 onclick="rampSetLang('${l.toLowerCase()}')">${l}</button>`).join('')}
                </div>
            </div>
            <button class="sidebar-toggle" onclick="rampToggleSidebar()">
                ${S.sidebarCollapsed
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>'
                    : RAMP_ICONS.chevron}
            </button>
        </aside>
        <div class="sidebar-backdrop" onclick="rampToggleSidebar()"></div>
        <div class="app-content">
            <header class="app-header">
                <div class="header-left">
                    <button class="btn-icon mobile-menu-btn" onclick="rampToggleSidebar()" aria-label="${_rAttr(rt("ouvrir_menu"))}" title="${_rAttr(rt("ouvrir_menu"))}">${RAMP_ICONS.menu}</button>
                    <div class="header-module-title">
                        <span style="color:var(--ramp-accent);display:flex;">${RAMP_ICONS.plane}</span>
                        <span>${_rEsc(titre)}</span>
                    </div>
                </div>
                <div class="header-right">
                    <div class="user-info">
                        <div class="user-avatar">${_rEsc(initiales)}</div>
                        <span>${_rEsc(`${u.prenom || ''} ${u.nom || ''}`.trim())}</span>
                        <span class="role-badge">${_rEsc(rampRole())}</span>
                    </div>
                    <button class="btn-logout" onclick="rampDeconnexion()">${RAMP_ICONS.logout} Déconnexion</button>
                </div>
            </header>
            <main class="main-content" id="ramp-content"></main>
        </div>
    </div>
    <div class="ramp-slider-overlay" id="rampSliderOverlay" onclick="rampFermerSlider()"></div>
    <div class="ramp-slider" id="rampSlider"></div>
    <div id="rampModalRoot"></div>`;
}

function rampNavigateTo(page) {
    // Un écran fermé à la vue Prestataire ne s'ouvre pas non plus par un lien.
    if (rampVuePrestataire() && !RAMP_NAV_PRESTATAIRE.includes(page)) page = 'dashboard';
    if (page === 'utilisateurs'
        && !(typeof rampPeutGererComptes === 'function' && rampPeutGererComptes())) page = 'dashboard';
    RAMP_STATE.currentPage = page;
    RAMP_STATE.apercu = null;
    // Quitter le menu ferme la fiche ouverte en volet : on ne la retrouverait
    // pas sur un autre écran.
    RAMP_STATE.poiEnCours = null;
    // Changer de menu referme le volet : on ne rejoue que ce qu'on n'a pas quitté.
    RAMP_STATE.voletRejouer = null;
    rampRenderApp();
    rampRenderPage();
    document.querySelector('.app-content')?.scrollTo(0, 0);
    parent.postMessage({ type: 'ramp:page', page }, '*');
}

// Déplier un bandeau redessine la page : sans précaution, le contenu remplacé
// est plus court un instant, le navigateur ramène le défilement à zéro et le
// bandeau qu'on vient d'ouvrir se retrouve hors de l'écran. On relève donc les
// positions avant, et on les rend après.
// Trois choses défilent : la colonne de contenu, le volet, et chaque tableau
// dans sa propre boîte — c'est ce dernier qui remontait, le tableau des items
// tenant deux mille pixels dans une fenêtre de quatre cents.
const RAMP_ZONES_DEFILEMENT = ['.app-content', '.main-content', '.ramp-slider-body', '.ramp-table-wrap'];

function rampMemoriserDefilement() {
    const avant = RAMP_ZONES_DEFILEMENT.map((sel) =>
        [sel, [...document.querySelectorAll(sel)].map((z) => z.scrollTop)]);
    const page = window.scrollY;
    return () => {
        // Après le redessin, on retrouve les zones par leur sélecteur et leur
        // rang : les nœuds d'avant ont été remplacés. Le rendu n'est pas encore
        // mesuré au moment où l'on rend la position — d'où le second passage à
        // la trame suivante, quand la hauteur est connue.
        const rendre = () => {
            avant.forEach(([sel, hauteurs]) => {
                const zones = document.querySelectorAll(sel);
                hauteurs.forEach((haut, i) => { if (haut && zones[i]) zones[i].scrollTop = haut; });
            });
            if (page) window.scrollTo(0, page);
        };
        rendre();
        requestAnimationFrame(rendre);
    };
}

// Ce qui identifie l'écran affiché. Changer d'écran remet la vue en haut ;
// redessiner le même la laisse où elle est.
const rampVueCourante = () => [RAMP_STATE.currentPage,
    RAMP_STATE.paramOnglet, RAMP_STATE.apercu ? 'apercu' : '',
    RAMP_STATE.poiEnCours ? `poi:${RAMP_STATE.poiEnCours.id || 'nouvelle'}:${RAMP_STATE.poiVue || ''}` : ''].join('|');

function rampRenderPage() {
    const vueAvant = rampVueCourante();
    const rendreDefilement = rampMemoriserDefilement();
    // Un volet ouvert commande l'affichage : changer un filtre, un thème ou la
    // langue doit le redessiner, non le refermer. `rampRenderApp` reconstruit
    // `#app` — donc le volet — et c'est ici qu'on le rejoue.
    if (RAMP_STATE.voletRejouer) { RAMP_STATE.voletRejouer(); rendreDefilement(); return; }
    const el = document.getElementById('ramp-content');
    if (!el) return;
    if (RAMP_STATE.apercu) { el.innerHTML = rampRenderApercu(); rendreDefilement(); return; }
    let corps = '';
    try {
        corps = rampCorpsDeLaPage();
    } catch (err) {
        // Sans cela, une erreur de rendu laisse l'écran précédent affiché :
        // l'agent clique, rien ne change, et rien ne le dit.
        console.error('[RAMP] rendu de la page', RAMP_STATE.currentPage, err);
        corps = `<div class="ramp-card">
            <p class="ramp-erreur">Cet écran n'a pas pu s'afficher : ${_rEsc(err && err.message)}.</p>
            <p class="ramp-sous-titre">Rechargez la page (Ctrl+Maj+R) ; si le message revient,
            signalez-le avec le nom de l'écran.</p>
        </div>`;
    }
    el.innerHTML = corps;
    // Après la mise en page : la hauteur du contenu décide de ce qui défile,
    // et donc du calage du bandeau collant.
    requestAnimationFrame(() => { rampMesurerEntete(); rampMesurerPied(); });
    // Un autre écran commence en haut : sinon la fiche qu'on vient d'ouvrir
    // s'affiche à la hauteur où l'on avait laissé la liste, et paraît ne pas
    // s'être ouverte.
    if (rampVueCourante() === vueAvant) rendreDefilement();
    else rampRemonter();
    if (RAMP_STATE.currentPage === 'depot') rampChargerDepots();
    if (RAMP_STATE.currentPage === 'contacts') rampChargerContacts();
    // Les fiches d'inspection se chargent à l'arrivée sur leur menu.
    // Une fois demandées, les fiches ne se redemandent pas : sans ce garde-fou,
    // un module sans aucune fiche relancerait la requête à chaque redessin —
    // et chaque réponse provoque un redessin.
    if (RAMP_STATE.currentPage === 'inspection' && !RAMP_STATE.poi.demande
        && !RAMP_STATE.poiEnCours) {
        RAMP_STATE.poi.demande = true;
        setTimeout(rampChargerPoi, 0);
    }
}

// Le corps de l'écran courant. Isolé du reste pour que `rampRenderPage`
// puisse l'entourer d'un filet : une page qui échoue au rendu doit le dire.
function rampCorpsDeLaPage() {
    switch (RAMP_STATE.currentPage) {
        case 'inspection': return rampRenderPoi();
        case 'etats': return rampRenderEtats();
        case 'ecarts': return rampRenderPageEcarts();
        case 'depot': return rampRenderDepot();
        case 'contacts': return rampRenderContacts();
        case 'parametres': return rampRenderParametres();
        case 'utilisateurs': return rampRenderMesUtilisateurs();
        case 'partages': return rampRenderCommunication();
        default: return rampRenderDashboard();
    }
}

// L'entête du module est collant : les bandeaux qui doivent rester visibles
// sous lui ont besoin de sa hauteur, que la barre de titre peut faire varier.
function rampMesurerEntete() {
    const entete = document.querySelector('.ramp-module .app-header');
    const contenu = document.getElementById('ramp-content');
    if (!entete || !contenu) return;
    // Ce qui défile réellement : la colonne de contenu, ou la zone intérieure.
    // La zone de contenu défile parfois elle-même : on part d'elle, pas de son
    // parent, sans quoi on remonterait jusqu'au document et le calage serait
    // celui d'une page qui ne défile pas.
    let scroller = contenu;
    while (scroller && scroller.scrollHeight - scroller.clientHeight <= 40
           && scroller !== document.body) {
        scroller = scroller.parentElement;
    }
    const haut = scroller ? scroller.getBoundingClientRect().top : 0;
    // L'écart entre le bas de l'entête et le haut de ce qui défile : nul quand
    // l'entête est au-dessus de la zone qui défile, égal à sa hauteur quand
    // elle glisse par-dessus. Le bandeau collant se cale là.
    const decalage = Math.max(0, Math.round(entete.getBoundingClientRect().bottom - haut));
    document.documentElement.style.setProperty('--ramp-entete-h', `${decalage}px`);
}

// La barre inférieure du socle est collante : la barre des États se pose
// juste au-dessus d'elle, sur sa hauteur réelle.
function rampMesurerPied() {
    const pied = document.querySelector('.oasis-module-footer');
    const h = pied ? Math.round(pied.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--ramp-pied-h', `${h}px`);
}

// Les hauteurs changent avec la largeur : on remesure au redimensionnement.
window.addEventListener('resize', () => requestAnimationFrame(() => {
    rampMesurerEntete(); rampMesurerPied();
}));

// Remet en haut la colonne de contenu et les tableaux qui défilent en propre.
function rampRemonter() {
    RAMP_ZONES_DEFILEMENT.forEach((sel) => {
        document.querySelectorAll(sel).forEach((z) => { z.scrollTop = 0; });
    });
    window.scrollTo(0, 0);
}

function rampToggleSidebar() {
    RAMP_STATE.sidebarCollapsed = !RAMP_STATE.sidebarCollapsed;
    localStorage.setItem('ramp_sidebar', String(RAMP_STATE.sidebarCollapsed));
    // Même traitement qu'un changement de langue : la coquille est reconstruite,
    // le volet ouvert reste ouvert et sans glissement — plier la barre de menu
    // n'est pas quitter l'écran.
    rampRafraichir();
}

// Une modale ouverte ne survit pas au redessin de la coquille : on la met de
// côté et on la repose ensuite, saisies comprises. Les valeurs tapées ne
// figurent pas dans le HTML tant qu'on ne les y inscrit pas — d'où le report
// des `value`, `checked` et `selected` avant la copie.
function rampConserverModale() {
    const racine = document.getElementById('rampModalRoot');
    if (!racine || !racine.innerHTML.trim()) return () => {};
    racine.querySelectorAll('input, textarea, select').forEach((champ) => {
        if (champ.type === 'checkbox' || champ.type === 'radio') {
            if (champ.checked) champ.setAttribute('checked', 'checked');
            else champ.removeAttribute('checked');
            return;
        }
        if (champ.tagName === 'SELECT') {
            [...champ.options].forEach((o) => {
                if (o.selected) o.setAttribute('selected', 'selected');
                else o.removeAttribute('selected');
            });
            return;
        }
        if (champ.tagName === 'TEXTAREA') { champ.textContent = champ.value; return; }
        champ.setAttribute('value', champ.value);
    });
    const html = racine.innerHTML;
    return () => {
        const cible = document.getElementById('rampModalRoot');
        if (cible && !cible.innerHTML.trim()) cible.innerHTML = html;
    };
}

// Saisies en cours dans le volet ou la modale. Le volet est rejoué dans la
// nouvelle langue : son HTML est reconstruit, mais les champs portent les mêmes
// identifiants — on y repose donc ce qui était tapé.
function rampSaisiesEnCours() {
    const champs = [...document.querySelectorAll('#rampSlider [id], #rampModalRoot [id]')]
        .filter((el) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
    const etat = champs.map((el) => ({ id: el.id, type: el.type, valeur: el.value, coche: el.checked }));
    const actif = document.activeElement && document.activeElement.id;
    return () => {
        etat.forEach(({ id, type, valeur, coche }) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (type === 'checkbox' || type === 'radio') el.checked = coche;
            else el.value = valeur;
        });
        // Le curseur revient dans le champ que l'on était en train de remplir.
        if (actif) document.getElementById(actif)?.focus();
    };
}

// Changer de langue ne quitte pas l'écran en cours : on garde le volet ouvert
// (rejoué par `rampRenderPage`), la modale, les saisies et le défilement.
function rampRafraichir() {
    const rendreDefilement = rampMemoriserDefilement();
    const rendreModale = rampConserverModale();
    const rendreSaisies = rampSaisiesEnCours();
    rampRenderApp();
    // Le volet était déjà ouvert : il est reconstruit puis rouvert dans la même
    // trame, et le navigateur en rejouerait le glissement. Ici rien n'entre —
    // le contenu change de langue, sur place.
    const sansGlissement = ['rampSlider', 'rampSliderOverlay']
        .map((id) => document.getElementById(id)).filter(Boolean);
    sansGlissement.forEach((el) => el.classList.add('ramp-sans-transition'));
    rampRenderPage();
    rendreModale();
    rendreSaisies();
    rendreDefilement();
    // Une fois la trame peinte, le volet retrouve ses transitions : la
    // fermeture, elle, doit continuer de glisser.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        ['rampSlider', 'rampSliderOverlay'].forEach((id) =>
            document.getElementById(id)?.classList.remove('ramp-sans-transition'));
    }));
}

// Le thème ne tient qu'à des variables CSS : rien à redessiner, seule la
// pastille active change.
function rampSetTheme(theme) {
    RAMP_STATE.theme = theme;
    oasisAppliquerTheme(theme);
}

// La langue, elle, change les textes : le redessin est nécessaire, mais il ne
// doit rien fermer.
function rampSetLang(lang) {
    RAMP_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    // L'attribut `lang` de la page suit : un lecteur d'écran prononce alors
    // l'écran dans la langue où il est écrit.
    oasisPoserLangue(lang);
    rampRafraichir();
}

function rampRetourPortail() {
    // Le nom du message est celui que l'hôte écoute : `oasis:back-portal`
    // (`frontend/portail/modules-hote.ts`). Il disait `oasis:back-to-portal`,
    // que rien n'écoutait — le message partait et tombait. Corrigé le
    // 13 octobre 2026, et un contrôle statique refuse désormais tout type
    // adressé au portail dont aucun écouteur du dépôt ne répond.
    parent.postMessage({ type: 'oasis:back-portal' }, '*');
    if (parent === window) window.location.href = '/';
}

async function rampDeconnexion() {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); }
    catch (e) { /* déconnexion locale */ }
    window.top.location.href = '/login.html';
}

// ══════════════════════════════════════
//  Écran 1 — Tableau de Bord
// ══════════════════════════════════════

function rampRenderDashboard() {
    const { inspections, ecarts } = rampFiltrer();
    const pond = rampPonderations();

    const exploitants = new Set(inspections.map((i) => i.exploitant || 'Inconnu')).size;
    const items = inspections.reduce((s, i) => s + (Number(i.itemsInspectes) || 0), 0);
    const ratio = inspections.length ? (ecarts.length / inspections.length).toFixed(2) : '0.00';

    const parCat = { 1: 0, 2: 0, 3: 0, G: 0 };
    ecarts.forEach((a) => {
        if (parCat[a.categorie] === undefined) parCat.G += 1;
        else parCat[a.categorie] += 1;
    });

    // Top 5 des items, décomposés par catégorie.
    const parItem = {};
    ecarts.forEach((a) => {
        const c = a.itemCode || 'Inconnu';
        if (!parItem[c]) parItem[c] = { total: 0, 1: 0, 2: 0, 3: 0, G: 0 };
        parItem[c].total += 1;
        if (parItem[c][a.categorie] === undefined) parItem[c].G += 1;
        else parItem[c][a.categorie] += 1;
    });
    const topItems = Object.entries(parItem).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
    const maxItem = topItems.length ? Math.max(...topItems.map((i) => i[1].total)) : 1;

    // Top 5 des exploitants, classés au score normalisé.
    const parExp = {};
    inspections.forEach((i) => {
        const e = i.exploitant || 'Inconnu';
        if (!parExp[e]) parExp[e] = { total: 0, score: 0, items: 0, 1: 0, 2: 0, 3: 0, G: 0 };
        parExp[e].items += Number(i.itemsInspectes) || 0;
    });
    ecarts.forEach((a) => {
        const e = a.inspection.exploitant || 'Inconnu';
        if (!parExp[e]) parExp[e] = { total: 0, score: 0, items: 0, 1: 0, 2: 0, 3: 0, G: 0 };
        parExp[e].total += 1;
        parExp[e].score += pond[a.categorie] === undefined ? 1 : pond[a.categorie];
        if (parExp[e][a.categorie] === undefined) parExp[e].G += 1;
        else parExp[e][a.categorie] += 1;
    });
    const topExp = Object.entries(parExp)
        .map(([nom, c]) => ({ nom, ...c, scoreNorm: c.items > 0 ? c.score / c.items : 0 }))
        .filter((e) => e.total > 0)
        .sort((a, b) => b.scoreNorm - a.scoreNorm)
        .slice(0, 5);
    const triExp = rampAppliquerTri(topExp, 'situation', (o, k) => o[k]);

    // ── Cartes d'indicateurs ──
    // Elles reprennent celles du tableau de bord d'« Exécution de la
    // Surveillance » : le socle les rend (`oasisKpiCarte`), chacune porte son
    // intitulé, la mesure, une précision et une figure qui dit de quoi il
    // s'agit. Deux groupes titrés, comme là-bas.
    const sansEcart = inspections.filter((i) => (i.anomalies || []).length === 0).length;
    const couverture = inspections.length ? Math.round((sansEcart / inspections.length) * 100) : 0;
    // La part des écarts déjà clos donne la mesure du suivi engagé.
    const closEcarts = ecarts.filter((a) => rampEstClos(a.inspection.status)).length;
    const tauxCloture = ecarts.length ? Math.round((closEcarts / ecarts.length) * 100) : 0;
    // Le ratio situé sur l'échelle de gravité : trois écarts par inspection
    // et au-delà, l'aiguille est au rouge.
    const positionRatio = Math.min(100, Math.round((Number(ratio) / 3) * 100));
    // Volume par trimestre, pour la figure en barres.
    const parTrimestre = [0, 0, 0, 0];
    inspections.forEach((i) => {
        const d = rampParseDate(i.date);
        if (d) parTrimestre[Math.floor(d.getMonth() / 3)] += 1;
    });

    const cartes = `
    <div class="oasis-kpi-groupes">
        ${oasisKpiGroupe(rt('groupe_inspections'), [
            oasisKpiCarte({
                titre: rt('kpi_inspections'), couleur: '#1d4ed8',
                valeur: inspections.length,
                precision: `${exploitants} ${rtn(exploitants, 'kpi_exploitant', 'kpi_exploitants')}`,
                figure: { type: 'barres', valeurs: parTrimestre },
            }),
            oasisKpiCarte({
                titre: rt('kpi_items'), couleur: '#0d9488',
                valeur: items,
                precision: inspections.length
                    ? `${Math.round(items / inspections.length)} ${rt('kpi_par_inspection')}`
                    : rt('kpi_aucune_inspection'),
                figure: { type: 'calendrier', mois: 12 },
            }),
            oasisKpiCarte({
                titre: rt('kpi_sans_ecart'), couleur: '#16a34a',
                valeur: `${couverture} %`,
                precision: `${sansEcart} ${rt('kpi_sur')} ${inspections.length}`,
                figure: { type: 'cloture', pct: couverture },
            }),
        ])}
        ${oasisKpiGroupe(rt('groupe_ecarts'), [
            oasisKpiCarte({
                titre: rt('kpi_total_ecarts'), couleur: '#dc2626', alerte: !!parCat['3'],
                valeur: ecarts.length,
                precision: parCat['3'] ? rt('kpi_dont_cat3', parCat['3']) : rt('kpi_aucun_cat3'),
                // Les quatre catégories en volume : la figure dit la forme de
                // la répartition, pas seulement le total.
                figure: { type: 'barres', valeurs: [parCat['1'], parCat['2'], parCat['3'], parCat.G] },
            }),
            oasisKpiCarte({
                titre: rt('kpi_ratio'), couleur: '#f59e0b',
                valeur: ratio,
                precision: rt('kpi_ratio_precision'),
                figure: { type: 'echelle', position: positionRatio,
                    min: rt('kpi_faible'), max: rt('kpi_eleve') },
            }),
            oasisKpiCarte({
                titre: rt('kpi_clotures'), couleur: '#059669',
                valeur: `${tauxCloture} %`,
                precision: `${closEcarts} ${rt('kpi_sur')} ${ecarts.length}`,
                figure: { type: 'jauge', pct: tauxCloture },
            }),
        ])}
    </div>`;

    // Répartition par catégorie : la légende commande l'anneau — un clic retire
    // une catégorie du disque, un autre la remet. Le total et les parts suivent
    // ce qui reste affiché.
    const totalGeneral = parCat['1'] + parCat['2'] + parCat['3'] + parCat.G;
    const visible = (cle) => !RAMP_STATE.catMasquees[cle];
    const totalCat = ['1', '2', '3', 'G'].reduce((n, c) => n + (visible(c) ? parCat[c] : 0), 0);
    const ligneCat = (cle, libelle, cls) => {
        const n = parCat[cle];
        const off = !visible(cle);
        const pct = totalCat && !off ? Math.round((n / totalCat) * 100) : 0;
        return `<button type="button" class="ramp-cat-ligne${off ? ' masquee' : ''}"
                    aria-pressed="${!off}"
                    title="${off ? rt('afficher_graphe') : rt('retirer_graphe')}"
                    onclick="rampBasculerCategorie(${_rArg(cle)})">
            <span class="ramp-cat-nom"><i class="ramp-pastille ${cls}"></i>${_rEsc(libelle)}</span>
            <span class="ramp-cat-val">${n}</span>
            <span class="ramp-cat-pct">${off ? '—' : `${pct} %`}</span>
        </button>`;
    };

    return `
    <div class="ramp-page-header">
        <h2>${rt('nav_dashboard')}</h2>
        <button class="btn btn-primary btn-sm" onclick="rampOuvrirStatistiques()"
                title="${rt('stats_sous_titre')}">
            ${RAMP_ICONS.chart} ${rt('voir_statistiques')}
        </button>
    </div>
    ${cartes}
    ${rampBarreFiltres({ immatriculation: false, action: false, etat: false, trimestre: false })}
    <div class="ramp-rang-graphes">
    <div class="ramp-card ramp-carte-anneau">
        <div class="ramp-card-titre">
            ${rt('repartition_categories')}
            <span class="ramp-sous-titre">${totalGeneral} ${rtn(totalGeneral, 'ecarts_unite', 'ecarts_unites')}</span>
        </div>
        ${totalGeneral === 0 ? `<div class="ramp-vide">${rt('aucun_ecart_constate')}</div>` : `
        <div class="ramp-anneau-bloc">
            ${rampAnneauCategories(parCat, totalCat)}
            <div class="ramp-anneau-legende">
                ${ligneCat('1', rt('cat_1'), 'c1')}
                ${ligneCat('2', rt('cat_2'), 'c2')}
                ${ligneCat('3', rt('cat_3'), 'c3')}
                ${ligneCat('G', rt('cat_g'), 'cg')}
            </div>
        </div>`}
    </div>
    <div class="ramp-card ramp-carte-items">
        <div class="ramp-card-titre">${rt('cinq_items')}</div>
        ${topItems.length === 0 ? `<div class="ramp-vide">${rt('aucun_ecart_constate')}</div>` : topItems.map(([code, c]) => {
            // La légende a été retirée : la catégorie d'un segment se lit au
            // survol, et s'y dit dans la langue de l'agent.
            const seg = (n, cls, cle) => (n > 0
                ? `<div class="ramp-barre-seg ${cls}" style="width:${(n / maxItem) * 100}%;"
                        title="${_rAttr(rt(cle))} : ${n}"></div>` : '');
            return `<div class="ramp-barre-ligne">
                <div class="ramp-barre-entete">
                    <span><strong>${_rEsc(code)}</strong>${rampLibelleItem(code)
                        ? ` <span style="color:var(--text-muted);">${_rEsc(rampLibelleItem(code))}</span>` : ''}</span>
                    <strong>${c.total}</strong>
                </div>
                <div class="ramp-barre-piste">
                    ${seg(c['1'], 'c1', 'cat_court_1')}${seg(c['2'], 'c2', 'cat_court_2')}
                    ${seg(c['3'], 'c3', 'cat_court_3')}${seg(c.G, 'cg', 'cat_court_g')}
                </div>
            </div>`;
        }).join('')}
    </div>
    </div>
    ${rampVuePrestataire() ? '' : `
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-card-titre" style="padding:.7rem 1rem;margin:0;">
            ${rt('cinq_exploitants')}
            <span class="ramp-sous-titre">${rt('score_formule')}</span>
        </div>
        <div class="ramp-table-wrap">
            <table class="ramp-table">
                <thead><tr>
                    ${rampTh('situation', 'nom', rt('c_exploitant'))}
                    ${rampTh('situation', 'items', rt('items_insp'), 'width:110px;text-align:center;')}
                    ${rampTh('situation', '1', rt('cat_court_1'), 'width:80px;text-align:center;')}
                    ${rampTh('situation', '2', rt('cat_court_2'), 'width:80px;text-align:center;')}
                    ${rampTh('situation', '3', rt('cat_court_3'), 'width:80px;text-align:center;')}
                    ${rampTh('situation', 'G', rt('cat_court_g'), 'width:80px;text-align:center;')}
                    ${rampTh('situation', 'scoreNorm', 'Score', 'width:110px;text-align:center;')}
                </tr></thead>
                <tbody>
                    ${triExp.length === 0
                        ? `<tr><td colspan="7" class="ramp-table-vide">${rt('aucun_ecart_constate')}</td></tr>`
                        : triExp.map((e) => `<tr>
                            <td><strong>${_rEsc(e.nom)}</strong></td>
                            <td style="text-align:center;">${e.items}</td>
                            <td style="text-align:center;">${e['1'] || 0}</td>
                            <td style="text-align:center;">${e['2'] || 0}</td>
                            <td style="text-align:center;"><strong style="color:#b91c1c;">${e['3'] || 0}</strong></td>
                            <td style="text-align:center;color:var(--text-muted);">${e.G || 0}</td>
                            <td style="text-align:center;"><strong>${e.scoreNorm.toFixed(3)}</strong></td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`}
    ${rampBarrePays()}`;
}

// ══════════════════════════════════════
//  Écran 3 — Inspections
// ══════════════════════════════════════

// Cartes d'indicateurs des écrans de liste : les mêmes que le tableau de bord,
// rendues par le socle, mais réduites à ce que l'écran montre — les inspections
// d'un côté, les écarts de l'autre. Elles suivent les filtres en cours.
// Répartition en anneau : chaque catégorie occupe l'arc de sa part, et le
// nombre total d'écarts se lit au centre. Un cercle unique tracé en pointillés
// calculés — pas de bibliothèque, pas d'image.
// L'orange de la catégorie 2 se tient à distance du rouge de la catégorie 3 :
// au ton soutenu (#ea580c), les deux parts d'un anneau se confondaient.
const RAMP_COULEURS_CAT = { 1: '#fbbf24', 2: '#fb923c', 3: '#dc2626', G: '#94a3b8' };

function rampBasculerCategorie(cle) {
    RAMP_STATE.catMasquees[cle] = !RAMP_STATE.catMasquees[cle];
    rampRenderPage();
}

function rampAnneauCategories(parCat, total) {
    const r = 54;
    const circonference = 2 * Math.PI * r;
    let debut = 0;
    const arcs = ['1', '2', '3', 'G'].map((cle) => {
        const n = RAMP_STATE.catMasquees[cle] ? 0 : (parCat[cle] || 0);
        if (!n || !total) return '';
        const part = (n / total) * circonference;
        // Le décalage recule d'autant qu'on a déjà parcouru : les arcs se
        // suivent sans se chevaucher.
        const arc = `<circle class="ramp-anneau-arc" cx="70" cy="70" r="${r}" fill="none"
                stroke="${RAMP_COULEURS_CAT[cle]}" stroke-width="18"
                stroke-dasharray="${part.toFixed(2)} ${(circonference - part).toFixed(2)}"
                stroke-dashoffset="${(-debut).toFixed(2)}"
                transform="rotate(-90 70 70)"><title>Catégorie ${cle} : ${n}</title></circle>`;
        debut += part;
        return arc;
    }).join('');

    return `
    <svg class="ramp-anneau" viewBox="0 0 140 140" role="img"
         aria-label="Répartition des ${total} écarts par catégorie">
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--border)" stroke-width="18"/>
        ${arcs}
        <text x="70" y="79" class="ramp-anneau-total">${total}</text>
    </svg>`;
}

function rampCartesInspections() {
    const { inspections, ecarts } = rampFiltrer();
    const exploitants = new Set(inspections.map((i) => i.exploitant || 'Inconnu')).size;
    const items = inspections.reduce((n, i) => n + (Number(i.itemsInspectes) || 0), 0);
    const sansEcart = inspections.filter((i) => (i.anomalies || []).length === 0).length;
    const couverture = inspections.length ? Math.round((sansEcart / inspections.length) * 100) : 0;
    const parTrimestre = [0, 0, 0, 0];
    inspections.forEach((i) => {
        const d = rampParseDate(i.date);
        if (d) parTrimestre[Math.floor(d.getMonth() / 3)] += 1;
    });
    const ratio = inspections.length ? (ecarts.length / inspections.length).toFixed(2) : '0.00';

    return `<div class="oasis-kpi-groupes ramp-kpi-ligne">${oasisKpiGroupe('', [
        oasisKpiCarte({
            titre: rt('kpi_inspections'), couleur: '#1d4ed8',
            valeur: inspections.length,
            precision: `${exploitants} ${rtn(exploitants, 'kpi_exploitant', 'kpi_exploitants')}`,
            figure: { type: 'barres', valeurs: parTrimestre },
        }),
        oasisKpiCarte({
            titre: rt('kpi_items'), couleur: '#0d9488',
            valeur: items,
            precision: inspections.length
                ? `${Math.round(items / inspections.length)} ${rt('kpi_par_inspection')}`
                : rt('kpi_aucune_inspection'),
            figure: { type: 'calendrier', mois: 12 },
        }),
        oasisKpiCarte({
            titre: rt('kpi_sans_ecart'), couleur: '#16a34a',
            valeur: `${couverture} %`,
            precision: `${sansEcart} ${rt('kpi_sur')} ${inspections.length}`,
            figure: { type: 'cloture', pct: couverture },
        }),
        oasisKpiCarte({
            titre: rt('kpi_ecarts'), couleur: '#dc2626',
            valeur: ecarts.length,
            precision: `${ratio} ${rt('kpi_par_inspection')}`,
            figure: { type: 'echelle', position: Math.min(100, Math.round((Number(ratio) / 3) * 100)),
                min: 'Faible', max: 'Élevé' },
        }),
    ])}</div>`;
}

function rampCartesEcarts() {
    const { inspections, ecarts } = rampFiltrer();
    const parCat = { 1: 0, 2: 0, 3: 0, G: 0 };
    ecarts.forEach((a) => {
        if (parCat[a.categorie] === undefined) parCat.G += 1; else parCat[a.categorie] += 1;
    });
    const clos = ecarts.filter((a) => rampEstClos(a.inspection.status)).length;
    const tauxCloture = ecarts.length ? Math.round((clos / ecarts.length) * 100) : 0;
    const insp = new Set(ecarts.map((a) => a.inspection.id)).size;
    const ratio = inspections.length ? (ecarts.length / inspections.length).toFixed(2) : '0.00';

    return `<div class="oasis-kpi-groupes ramp-kpi-ligne">${oasisKpiGroupe('', [
        oasisKpiCarte({
            titre: rt('kpi_total_ecarts'), couleur: '#dc2626', alerte: !!parCat['3'],
            valeur: ecarts.length,
            precision: `${rt('kpi_sur')} ${insp} ${rt('kpi_inspections').toLowerCase()}`,
            figure: { type: 'barres', valeurs: [parCat['1'], parCat['2'], parCat['3'], parCat.G] },
        }),
        oasisKpiCarte({
            titre: rt('cat_3'), couleur: '#b91c1c', alerte: !!parCat['3'],
            valeur: parCat['3'],
            precision: ecarts.length
                ? `${Math.round((parCat['3'] / ecarts.length) * 100)} % · ${rt('c_ecarts').toLowerCase()}`
                : rt('aucun_ecart'),
            figure: { type: 'jauge', pct: ecarts.length ? Math.round((parCat['3'] / ecarts.length) * 100) : 0 },
        }),
        oasisKpiCarte({
            titre: rt('kpi_clotures'), couleur: '#059669',
            valeur: `${tauxCloture} %`,
            precision: `${clos} ${rt('kpi_sur')} ${ecarts.length}`,
            figure: { type: 'cloture', pct: tauxCloture },
        }),
        oasisKpiCarte({
            titre: rt('kpi_ratio'), couleur: '#f59e0b',
            valeur: ratio,
            precision: rt('kpi_ratio_precision'),
            figure: { type: 'echelle', position: Math.min(100, Math.round((Number(ratio) / 3) * 100)),
                min: rt('kpi_faible'), max: rt('kpi_eleve') },
        }),
    ])}</div>`;
}

function rampResumeHtml(quoi) {
    const { inspections, ecarts } = rampFiltrer();
    const exploitants = new Set(inspections.map((i) => i.exploitant || 'Inconnu')).size;
    const items = inspections.reduce((s, i) => s + (Number(i.itemsInspectes) || 0), 0);
    if (quoi === 'ecarts') {
        const insp = new Set(ecarts.map((a) => a.inspection.id)).size;
        return `<strong>${ecarts.length}</strong> ${rt('ecarts_rattaches_a')} <strong>${insp}</strong> `
            + `inspection(s) sur <strong>${exploitants}</strong> exploitant(s).`;
    }
    return `<strong>${inspections.length}</strong> inspection(s), <strong>${exploitants}</strong> exploitant(s), `
        + `<strong>${items}</strong> ${rt('items_inspectes')} <strong>${ecarts.length}</strong> écart(s).`;
}

function rampLignesInspections() {
    const { inspections } = rampFiltrer();
    const liste = rampAppliquerTri(inspections, 'insp', (o, k) => {
        if (k === 'date') return rampISO(o.date);
        if (k === 'ecarts') return (o.anomalies || []).length;
        if (k === 'itemsInspectes') return Number(o.itemsInspectes) || 0;
        return o[k];
    });
    if (!liste.length) return `<tr><td colspan="10" class="ramp-table-vide">${rt('aucune_inspection')}</td></tr>`;
    return liste.map((i) => {
        const n = (i.anomalies || []).length;
        const ouvert = !!RAMP_STATE.inspectionsDepliees[i.id];
        return `<tr class="ramp-depliant" onclick="rampBasculerInspection(${_rArg(i.id)})">
            <td>
                <button class="ramp-extension${ouvert ? ' ouvert' : ''}" type="button"
                        aria-expanded="${ouvert}" title="${ouvert ? rt('replier') : rt('deplier')}" aria-label="${ouvert ? rt('replier') : rt('deplier')}"
                        onclick="event.stopPropagation();rampBasculerInspection(${_rArg(i.id)})">
                    ${RAMP_ICONS.chevronBas}
                </button>
            </td>
            <td>${i.poi_reference ? `<strong class="ramp-code">${_rEsc(i.poi_reference)}</strong>`
                : '<span class="ramp-vide">—</span>'}</td>
            <td style="white-space:nowrap;">${_rEsc(rampDate(i.date))}</td>
            <td>${_rEsc(i.pays || '—')}</td>
            <td><strong>${_rEsc(i.exploitant || '—')}</strong></td>
            <td>
                ${_rEsc(i.aeronef || '—')}
                <span class="ramp-sous-ligne">${_rEsc(i.immatriculation || '—')}</span>
            </td>
            <td>${_rEsc(i.vol || '—')}</td>
            <td style="text-align:center;"><span class="ramp-badge items">${Number(i.itemsInspectes) || 0}</span></td>
            <td style="text-align:center;"><span class="ramp-badge ${n ? 'ecarts' : 'zero'}">${n}</span></td>
            <td class="ramp-cell-actions">
                <button class="btn btn-outline btn-sm ramp-btn-icone"
                        onclick="event.stopPropagation();rampOuvrirApercu('${i.id}')"
                        title="${_rAttr(rt('apercu_rapport'))}" aria-label="${_rAttr(rt('apercu_rapport'))}">${RAMP_ICONS.eye}</button>
                ${rampEstAdmin() && !rampVuePrestataire() ? `<button class="btn btn-outline btn-sm ramp-btn-icone"
                        style="color:#dc2626;border-color:#dc2626;"
                        onclick="event.stopPropagation();rampSupprimerInspection('${i.id}')"
                        title="${rt('supprimer')}" aria-label="${rt('supprimer')}">${RAMP_ICONS.delete}</button>` : ''}
            </td>
        </tr>
        ${ouvert ? `<tr class="ramp-ecart-detail">
            <td></td>
            <td colspan="9">${rampEcartsDeLInspection(i)}</td>
        </tr>` : ''}`;
    }).join('');
}

// Les écarts d'une inspection, tels que son rang les déplie : un par ligne,
// l'item d'abord, le constat ensuite, la catégorie au bout. Une inspection
// sans écart le dit plutôt que d'ouvrir un volet vide.
function rampEcartsDeLInspection(i) {
    const ecarts = i.anomalies || [];
    if (!ecarts.length) return `<span class="ramp-sous-titre">${rt('aucun_ecart')}</span>`;
    return `<ul class="ramp-insp-ecarts">
        ${ecarts.map((a) => `<li>
            <strong class="ramp-code">${_rEsc(a.itemCode || '—')}</strong>
            <span class="ramp-insp-constat">${_rEsc(a.description || rampLibelleItem(a.itemCode) || '—')}</span>
            ${rampBadgeCat(a.categorie)}
        </li>`).join('')}
    </ul>`;
}

// Déplier une inspection ne touche qu'au corps du tableau : la page ne bouge
// pas, et le défilement reste où il était.
function rampBasculerInspection(id) {
    RAMP_STATE.inspectionsDepliees[id] = !RAMP_STATE.inspectionsDepliees[id];
    const corps = document.querySelector('[data-corps="inspections"]');
    if (!corps) { rampRenderPage(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    corps.innerHTML = rampLignesInspections();
    rendreDefilement();
}

// ══════════════════════════════════════
//  Menu « États » — deux sous-menus
// ══════════════════════════════════════
// Le même jeu de données sous deux angles : l'acte d'inspection, ou l'écart
// relevé. Les filtres sont communs et se conservent d'un sous-menu à l'autre.

function rampRenderEtats() {
    return `
    <div class="ramp-page-header">
        <h2>${rt('nav_inspections')}</h2>
        <!-- Les trois commandes de la page tiennent la même ligne, en haut à
             droite : importer, ajouter, puis traiter. -->
        ${rampVuePrestataire() ? '' : `<div class="ramp-page-actions">
        ${rampPeutImporter() ? `<button class="btn btn-primary btn-sm" onclick="rampOuvrirImportation()">
            ${RAMP_ICONS.upload} ${rt('importer_inspections')}</button>` : ''}
        ${(RAMP_STATE.poi.peutSaisir || rampPeutContribuer())
            ? `<button class="btn btn-primary btn-sm" onclick="rampAjouterInspection()">
            ${RAMP_ICONS.add} ${rt('ajouter_inspection')}</button>` : ''}
        <button class="btn btn-sm ramp-btn-traiter" onclick="rampNavigateTo('inspection')">
            ${RAMP_ICONS.clipboard} ${rt('traiter_inspections')}</button></div>`}
    </div>
    ${rampRenderInspections()}
    ${rampBarrePays()}`;
}

// Les écarts ont leur propre entrée de menu : on y va directement, sans passer
// par les inspections. Les filtres restent communs aux deux vues.
function rampRenderPageEcarts() {
    return `
    <div class="ramp-page-header">
        <h2>${rt('nav_ecarts')}</h2>
    </div>
    ${rampRenderEcarts()}
    ${rampBarrePays()}`;
}

function rampRenderInspections() {
    return `
    ${rampCartesInspections()}
    ${rampBarreFiltres({ action: false, etat: false, trimestre: false, recherche: false })}
    <div class="ramp-actions-bar">
        ${rampRechercheRonde(RAMP_RECHERCHE_INSPECTIONS())}
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampExporterInspections()">
            ${RAMP_ICONS.download} ${rt('exporter_excel')}</button>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <!-- Largeurs fixées : l'exploitant prend ce que les autres colonnes
                 laissent, au lieu d'être rogné parce que son nom sait se
                 replier. Le rang s'ouvre sur les écarts de l'inspection. -->
            <table class="ramp-table ramp-table-fixe">
                <thead><tr>
                    <th style="width:38px;"></th>
                    ${rampTh('insp', 'poi_reference', rt('c_poi'), 'width:88px;')}
                    ${rampTh('insp', 'date', rt('c_date'), 'width:100px;')}
                    ${rampTh('insp', 'pays', rt('c_etat'), 'width:92px;')}
                    ${rampTh('insp', 'exploitant', rt('c_exploitant'))}
                    ${rampTh('insp', 'aeronef', rt('c_aeronef'), 'width:108px;')}
                    ${rampTh('insp', 'vol', rt('c_vol'), 'width:80px;')}
                    ${rampTh('insp', 'itemsInspectes', rt('c_items'), 'width:80px;text-align:center;')}
                    ${rampTh('insp', 'ecarts', rt('c_ecarts_court'), 'width:96px;text-align:center;')}
                    <th style="width:92px;text-align:center;">${rt('c_voir')}</th>
                </tr></thead>
                <tbody data-corps="inspections">${rampLignesInspections()}</tbody>
            </table>
        </div>
    </div>`;
}

async function rampSupprimerInspection(id) {
    const i = RAMP_STATE.data.inspections.find((x) => x.id === id) || {};
    const n = (i.anomalies || []).length;
    if (!await oasisConfirmer(rt('confirmer_suppr_inspection', rampDate(i.date), i.exploitant || '—', n))) return;
    try {
        await rampApi(`/inspections/${id}`, { method: 'DELETE' });
        await rampRecharger();
        rampToast(rt('m_inspection_supprimee'));
    } catch (e) { rampToast(e.message || rt('m_suppression_impossible'), 'error'); }
}

// ══════════════════════════════════════
//  Écran 4 — Écarts
// ══════════════════════════════════════

const rampBadgeCat = (c) => {
    const cls = { 1: 'c1', 2: 'c2', 3: 'c3' }[c] || 'cg';
    return `<span class="ramp-badge ${cls}">${_rEsc(c || 'G')}</span>`;
};

function rampLignesEcarts() {
    const { ecarts } = rampFiltrer();
    const liste = rampAppliquerTri(ecarts, 'ecarts', (o, k) => {
        if (k === 'date') return rampISO(o.inspection.date);
        if (k.startsWith('insp.')) return o.inspection[k.slice(5)];
        // Le statut montré est celui du constat, à défaut celui de l'inspection.
        if (k === 'suivi') return o.suivi || o.inspection.status || '';
        return o[k];
    });
    if (!liste.length) return `<tr><td colspan="8" class="ramp-table-vide">${rt('aucun_ecart')}</td></tr>`;
    return liste.map((a) => {
        const i = a.inspection;
        const clos = rampEstClos(i.status);
        // L'item et son référentiel se lisent au dépliage : ce qui identifie
        // l'écart au premier regard, c'est l'exploitant, l'appareil et le
        // constat lui-même.
        const ouvert = !!RAMP_STATE.ecartsDeplies[a.id];
        const pieces = (a.preuves || []).length;
        // État du plan d'actions, dit par une pastille : rien de déposé, déposé,
        // ou soldé. Les trois couleurs sont celles du suivi dans tout le module.
        const pac = a.pac || {};
        const soldee = ((a.evaluation || {}).cloture || {}).effective === 'OUI';
        const etatPac = soldee ? 'clos' : (pac.soumis_le ? 'soumis' : 'sans');
        return `<tr class="ramp-depliant" onclick="rampBasculerEcart(${_rArg(a.id)})">
            <td>
                <button class="ramp-extension${ouvert ? ' ouvert' : ''}" type="button"
                        aria-expanded="${ouvert}" title="${ouvert ? rt('replier') : rt('deplier')}" aria-label="${ouvert ? rt('replier') : rt('deplier')}"
                        onclick="event.stopPropagation();rampBasculerEcart(${_rArg(a.id)})">
                    ${RAMP_ICONS.chevronBas}
                </button>
            </td>
            <td>
                <strong>${_rEsc(i.exploitant || '—')}</strong>
                <span class="ramp-sous-ligne">${_rEsc(i.immatriculation || '—')}</span>
            </td>
            <td style="white-space:nowrap;">${_rEsc(rampDate(i.date))}</td>
            <td class="ramp-ecart-desc">${_rEsc(a.description || '—')}</td>
            <td style="text-align:center;">${rampBadgeCat(a.categorie)}</td>
            <td style="text-align:center;">${_rEsc(a.action || '—')}</td>
            <td>${_rEsc(a.suivi || i.status || '—')}${clos ? ' <span class="ramp-badge zero">clos</span>' : ''}</td>
            <td class="ramp-cell-actions">
                <button class="btn btn-outline btn-sm ramp-btn-icone"
                        onclick="event.stopPropagation();rampOuvrirApercu('${i.id}')"
                        title="${_rAttr(rt('apercu_rapport'))}" aria-label="${_rAttr(rt('apercu_rapport'))}">${RAMP_ICONS.eye}</button>
                <button class="btn btn-outline btn-sm ramp-btn-icone ramp-btn-marque"
                        onclick="event.stopPropagation();rampOuvrirPac(${_rArg(a.id)})"
                        title="${_rAttr(rt(`pac_etat_${etatPac}`))}" aria-label="${_rAttr(rt(`pac_etat_${etatPac}`))}">
                    ${RAMP_ICONS.clipboard}
                    <!-- L'état se dit aussi dans l'infobulle du bouton : la
                         pastille est un repère, non la seule source. -->
                    <span class="ramp-btn-pastille ${etatPac}" aria-hidden="true"></span>
                </button>
                ${rampVuePrestataire() ? '' : `
                <button class="btn btn-outline btn-sm ramp-btn-icone ramp-btn-marque"
                        onclick="event.stopPropagation();rampOuvrirPreuves(${_rArg(a.id)})"
                        title="${_rAttr(rt('preuves_ajouter'))}${pieces
                            ? ` (${pieces} ${rtn(pieces, 'pr_piece', 'pr_pieces')})` : ''}" aria-label="${_rAttr(rt('preuves_ajouter'))}${pieces
                            ? ` (${pieces} ${rtn(pieces, 'pr_piece', 'pr_pieces')})` : ''}">
                    ${RAMP_ICONS.upload}
                    ${pieces ? `<span class="ramp-btn-badge">${pieces}</span>` : ''}
                </button>`}
            </td>
        </tr>
        ${ouvert ? `<tr class="ramp-ecart-detail">
            <td></td>
            <td colspan="7">
                <div class="ramp-ecart-detail-grille">
                    <div><i>${rt('c_poi')}</i><div>${i.poi_reference
                        ? `<strong class="ramp-code">${_rEsc(i.poi_reference)}</strong>`
                        : '<span class="ramp-vide">—</span>'}</div></div>
                    <div><i>${rt('c_aeronef')}</i><div>${_rEsc(i.aeronef || '—')}</div></div>
                    <div><i>${rt('c_item')}</i><div><strong class="ramp-code">${_rEsc(a.itemCode || '—')}</strong>
                        ${rampLibelleItem(a.itemCode) ? ` — ${_rEsc(rampLibelleItem(a.itemCode))}` : ''}</div></div>
                    <div><i>${rt('c_ref_std')}</i><div>${_rEsc(a.stdRef || '—')}</div></div>
                </div>
            </td>
        </tr>` : ''}`;
    }).join('');
}

// Déplier un écart n'affecte que le corps du tableau : la page reste en place.
function rampBasculerEcart(id) {
    RAMP_STATE.ecartsDeplies[id] = !RAMP_STATE.ecartsDeplies[id];
    const corps = document.querySelector('[data-corps="ecarts"]');
    if (!corps) { rampRenderPage(); return; }
    const rendreDefilement = rampMemoriserDefilement();
    corps.innerHTML = rampLignesEcarts();
    rendreDefilement();
}

function rampRenderEcarts() {
    return `
    ${rampCartesEcarts()}
    ${rampBarreFiltres({ etat: false, trimestre: false, recherche: false })}
    <div class="ramp-actions-bar">
        ${rampRechercheRonde()}
        <span style="flex:1;"></span>
        <button class="btn btn-primary btn-sm" onclick="rampExporterEcarts()">
            ${RAMP_ICONS.download} ${rt('exporter_excel')}</button>
    </div>
    <div class="ramp-card" style="padding:0;">
        <div class="ramp-table-wrap">
            <!-- Colonnes fixées : sans cela, le navigateur les répartit sur ce
                 que chacune contient, et la description — seule à pouvoir se
                 replier — se retrouvait la plus étroite du tableau. -->
            <table class="ramp-table ramp-table-fixe ramp-table-ecarts">
                <thead><tr>
                    <th style="width:32px;"></th>
                    ${rampTh('ecarts', 'insp.exploitant', rt('c_exploitant_immat'), 'width:174px;')}
                    ${rampTh('ecarts', 'date', rt('c_date'), 'width:88px;')}
                    ${rampTh('ecarts', 'description', rt('c_description'))}
                    ${rampTh('ecarts', 'categorie', rt('c_cat_court'), 'width:66px;text-align:center;')}
                    ${rampTh('ecarts', 'action', rt('c_action_court'), 'width:86px;text-align:center;')}
                    ${rampTh('ecarts', 'suivi', rt('c_statut'), 'width:88px;')}
                    <th style="width:138px;text-align:center;">${rt('c_voir')}</th>
                </tr></thead>
                <tbody data-corps="ecarts">${rampLignesEcarts()}</tbody>
            </table>
        </div>
    </div>`;
}
