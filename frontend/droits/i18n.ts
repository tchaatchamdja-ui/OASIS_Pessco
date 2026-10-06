// OASIS — Module « Gestion des Droits » : les traductions, en TypeScript.
//
// Trois langues, comme le portail : français, anglais, portugais.
//
// ── Pourquoi ce fichier est passé en TypeScript, contre ce qui était écrit ──
//
// `frontend/droits/socle.ts` portait, jusqu'au 6 octobre 2026 : « 390 lignes de
// tables, que rien ne gagnerait à passer en TypeScript et qu'un portage
// exposerait à la faute de frappe ». La suite n° 5.b a montré le contraire, et
// la conversion l'a prouvé **avant d'être finie** :
//
//   · les volets sont typés les uns par l'autre — `Record<Cle, string>`. Une
//     traduction oubliée devient une **erreur de construction**, non un libellé
//     français au milieu d'un écran portugais ;
//   · les clés appelées sont typées — `dt(cle: Cle)`. Et c'est ce qui a trouvé
//     `dt('chargement')` dans `App.tsx`, **appelée et absente de la table**
//     depuis la réécriture du 3 octobre. L'écran affichait « chargement » en
//     guise de légende d'attente, dans les trois langues ;
//   · trois affirmations sur `window` disparaissent — `window.dt`,
//     `window.DR`, et les deux globales lexicales `dtPriv` / `dtPrivDesc`.
//     C'est ici que vivait `dtPriv`, le premier des deux mensonges déclaratifs
//     qui ont motivé la suite `frontend`.
//
// Le fichier ne pose **rien** sur `window` et n'a pas de sas : aucun écran resté
// en JavaScript ne lit ces libellés — ils sont à cet écran seul. C'est la
// différence avec le socle commun, que huit écrans lisent encore en globales.
//
// ── La langue et l'espace ──
//
// Ils vivaient dans un global, `window.DR`, posé par React et lu par ce
// fichier. Ce global n'existait que parce que la table n'était pas portée : il
// s'en va avec elle, et rien ne le remplace — voir plus bas pourquoi un état
// local réglé par un appel n'aurait été que le même défaut déplacé.

declare global {
  interface Window {
    /**
     * Le module dont la page règle les droits, posé par `index.html` depuis
     * `?module=`.
     *
     * **Déclaré ici, chez son unique lecteur**, et non au point de
     * rassemblement : la règle posée en 5.b veut que le nom soit déclaré là où
     * il est défini, et à défaut là où il est lu. Celui-ci est posé par une
     * page, non par un module ; ce fichier est le seul à le lire.
     */
    DR_MODULE?: string;
  }
}

export type Langue = 'fr' | 'en' | 'pt';

// ── Le volet français, et c'est lui qui définit les clés ──
//
// `as const` n'est pas décoratif : c'est de lui que `Cle` est déduite, donc de
// lui que les deux autres volets tiennent leur obligation. Les trois tables sont
// reprises **verbatim** de `dr-i18n.js`, indentation comprise — la leçon de la
// conversion du socle, où désindenter avait changé la sortie.
const FR = {
    // ── Coquille ──
    module_titre: 'Gestion des Droits',
    nav_privileges: 'Privilèges',
    nav_audit: 'Journal d’audit',
    deconnexion: 'Déconnexion',
    etendre: 'Étendre',
    reduire: 'Réduire',

    // ── Espaces réglés par la page ──
    mod_PLAN: 'Planification de la Surveillance',
    mod_SURV: 'Exécution de la Surveillance',
    mod_RAMP: 'RAMP Inspections',
    mod_CARE: 'Mesures d’Application',

    // ── Refus ──
    reserve_autorite: 'Gestion des Droits : réservée aux comptes de l’Autorité.',
    reserve_admin: 'Accès réservé aux SuperAdmin et Admin AAC.',
    module_indisponible: 'Module indisponible : {0}',

    // ── Liste des privilèges ──
    page_titre: 'Gestion des Droits — {0}',
    page_sous_titre: 'Utilisateurs disposant du module dans « Accès aux modules » du portail. Privilège par défaut : Lecteur.',
    rechercher_utilisateur: 'Rechercher un utilisateur…',
    tous_privileges: 'Tous les privilèges',
    compte_utilisateurs: '{0} utilisateur(s) — {1}',
    col_nom: 'Nom',
    col_prenoms: 'Prénoms',
    col_email: 'Email (identifiant)',
    col_role_portail: 'Rôle portail',
    col_privilege_general: 'Privilège général',
    col_portees: 'Portées particulières',
    aucun_utilisateur: 'Aucun utilisateur n’a accès à ce module.',
    defaut_court: '(défaut)',
    aucun_prestataire: 'Aucun prestataire — aucun accès',
    fermer: 'Fermer',
    modifier: 'Modifier',
    journal: 'Journal',
    journal_utilisateur: 'Journal d’audit de cet utilisateur',

    // ── Journal d'audit ──
    audit_titre: 'Journal d’audit — {0}',
    audit_sous_titre: 'Journal inaltérable : chaque entrée est chaînée à la précédente par empreinte SHA-256.',
    integrite_ok: 'Chaîne d’intégrité vérifiée — {0} entrée(s), aucune altération détectée.',
    integrite_ko: 'Chaîne d’intégrité rompue à l’entrée n°{0} — le journal a été altéré.',
    journal_de: 'Journal de',
    voir_tout_module: 'Voir tout le module',
    rechercher: 'Rechercher…',
    tous_utilisateurs: 'Tous les utilisateurs',
    toutes_actions: 'Toutes les actions',
    du: 'Du',
    au: 'Au',
    reinitialiser: 'Réinitialiser',
    compte_entrees: '{0} entrée(s)',
    col_numero: 'N°',
    col_horodatage: 'Horodatage',
    col_utilisateur: 'Utilisateur',
    col_action: 'Action',
    col_objet: 'Objet',
    col_reference: 'Référence',
    col_details: 'Détails',
    col_empreinte: 'Empreinte',
    aucune_entree: 'Aucune entrée.',

    // ── Fiche d'un compte ──
    modal_titre: 'Privilèges — {0}',
    role_portail_court: 'rôle portail',
    par_defaut: '— par défaut',
    portee_prestataires: 'Portée particulière — prestataires',
    hint_prestataires: 'Désignez le ou les prestataires dont ce compte voit les données, par secteur d’activité puis par nom. Sans prestataire retenu, il n’a accès à aucune donnée du module.',
    prestataires_retenus: '{0} prestataire(s) retenu(s).',
    portees_particulieres: 'Portées particulières — domaines et secteurs d’activités',
    hint_portees: 'Sans portée, le privilège général s’applique partout. Une portée « Aucun » retire l’accès aux données du domaine ou du secteur visé.',
    col_secteur: 'Secteur d’activité',
    col_prestataire: 'Prestataire',
    col_domaine: 'Domaine',
    col_privilege: 'Privilège',
    tous_secteurs: 'Tous les secteurs',
    choisir_prestataire: '— Prestataire —',
    choisir_domaine: '— Domaine —',
    tout_domaine: 'Tout le domaine',
    aucun_pas_acces: 'Aucun — pas d’accès',
    retirer_prestataire: 'Retirer le prestataire',
    retirer_portee: 'Retirer la portée',
    ajouter_prestataire: '+ Ajouter un prestataire',
    ajouter_portee: '+ Ajouter une portée',
    annuler: 'Annuler',
    enregistrer: 'Enregistrer',
    err_ligne_prestataire: 'Chaque ligne doit désigner un prestataire, ou être retirée.',
    err_portee_domaine: 'Chaque portée doit désigner un domaine.',

    // ── Échelons ──
    priv_GESTIONNAIRE: 'Gestionnaire',
    priv_VALIDATEUR: 'Validateur',
    priv_CONTRIBUTEUR: 'Contributeur',
    priv_LECTEUR: 'Lecteur',
    priv_AUCUN: 'Aucun',
    priv_PRESTATAIRE: 'Prestataire',

    desc_GESTIONNAIRE: 'Paramètre le module et dispose des droits les plus étendus.',
    desc_VALIDATEUR: 'Valide et approuve les plans de surveillance.',
    desc_CONTRIBUTEUR: 'Crée et modifie les données du module.',
    desc_LECTEUR: 'Consultation seule des données du module.',
    desc_AUCUN: 'Aucun accès aux données de ce domaine ou de ce secteur.',
    desc_PRESTATAIRE: 'Vue Prestataire : accès aux seules données des prestataires retenus en portée.',

    desc_CARE_GESTIONNAIRE: 'Paramètre le module, supprime, et dispose des droits les plus étendus.',
    desc_CARE_VALIDATEUR: 'Notifie et clôture les mesures, classe une carence sans suite.',
    desc_CARE_CONTRIBUTEUR: 'Relève les carences, instruit le traitement et rédige les mesures.',
    desc_CARE_LECTEUR: 'Consultation seule des carences et des mesures.',
    desc_CARE_AUCUN: 'Aucun accès aux carences et aux mesures de ce domaine ou de ce secteur.',

    desc_RAMP_GESTIONNAIRE: 'Administrateur : paramètre le module, importe, supprime, sans limite d’État.',
    desc_RAMP_VALIDATEUR: 'Coordonnateur Régional : consulte les inspections de tous les États, sans importer.',
    desc_RAMP_CONTRIBUTEUR: 'Coordonnateur National : importe et instruit les inspections des États de sa portée.',
    desc_RAMP_LECTEUR: 'Consultation seule des inspections et des écarts.',
    desc_RAMP_AUCUN: 'Aucun accès aux données de cet État.',
    desc_RAMP_PRESTATAIRE: 'Vue Prestataire : l’exploitant ne voit que les inspections et les écarts qui le concernent.',
} as const;

/** Une clé de libellé. Déduite du volet français : il n'y a rien à tenir à jour. */
export type Cle = keyof typeof FR;

// Les deux autres volets doivent porter **exactement** les mêmes clés : une
// manquante ne compile pas, une de trop non plus. Les 101 clés étaient déjà
// complètes dans les trois langues — ce type n'a donc rien réparé, il empêche
// la prochaine. Le garde-fou de forme de la suite « traductions » le vérifie
// aussi, et continue de le faire pour les six modules restés en JavaScript.
const EN: Readonly<Record<Cle, string>> = {
    module_titre: 'Rights Management',
    nav_privileges: 'Privileges',
    nav_audit: 'Audit log',
    deconnexion: 'Sign out',
    etendre: 'Expand',
    reduire: 'Collapse',

    mod_PLAN: 'Surveillance Planning',
    mod_SURV: 'Surveillance Execution',
    mod_RAMP: 'RAMP Inspections',
    mod_CARE: 'Enforcement Measures',

    reserve_autorite: 'Rights Management is reserved for Authority accounts.',
    reserve_admin: 'Restricted to SuperAdmin and CAA Admin accounts.',
    module_indisponible: 'Module unavailable: {0}',

    page_titre: 'Rights Management — {0}',
    page_sous_titre: 'Users holding this module under the portal’s "Module access". Default privilege: Reader.',
    rechercher_utilisateur: 'Search for a user…',
    tous_privileges: 'All privileges',
    compte_utilisateurs: '{0} user(s) — {1}',
    col_nom: 'Surname',
    col_prenoms: 'Given names',
    col_email: 'Email (username)',
    col_role_portail: 'Portal role',
    col_privilege_general: 'General privilege',
    col_portees: 'Specific scopes',
    aucun_utilisateur: 'No user has access to this module.',
    defaut_court: '(default)',
    aucun_prestataire: 'No provider — no access',
    fermer: 'Close',
    modifier: 'Edit',
    journal: 'Log',
    journal_utilisateur: 'Audit log for this user',

    audit_titre: 'Audit log — {0}',
    audit_sous_titre: 'Tamper-evident log: each entry is chained to the previous one by a SHA-256 hash.',
    integrite_ok: 'Integrity chain verified — {0} entry(ies), no alteration detected.',
    integrite_ko: 'Integrity chain broken at entry no. {0} — the log has been altered.',
    journal_de: 'Log of',
    voir_tout_module: 'View the whole module',
    rechercher: 'Search…',
    tous_utilisateurs: 'All users',
    toutes_actions: 'All actions',
    du: 'From',
    au: 'To',
    reinitialiser: 'Reset',
    compte_entrees: '{0} entry(ies)',
    col_numero: 'No.',
    col_horodatage: 'Timestamp',
    col_utilisateur: 'User',
    col_action: 'Action',
    col_objet: 'Object',
    col_reference: 'Reference',
    col_details: 'Details',
    col_empreinte: 'Hash',
    aucune_entree: 'No entry.',

    modal_titre: 'Privileges — {0}',
    role_portail_court: 'portal role',
    par_defaut: '— default',
    portee_prestataires: 'Specific scope — providers',
    hint_prestataires: 'Name the provider or providers whose data this account may see, by sector of activity then by name. With no provider selected, it has access to no data in this module.',
    prestataires_retenus: '{0} provider(s) selected.',
    portees_particulieres: 'Specific scopes — domains and sectors of activity',
    hint_portees: 'Without a scope, the general privilege applies everywhere. A "None" scope removes access to the data of the domain or sector concerned.',
    col_secteur: 'Sector of activity',
    col_prestataire: 'Provider',
    col_domaine: 'Domain',
    col_privilege: 'Privilege',
    tous_secteurs: 'All sectors',
    choisir_prestataire: '— Provider —',
    choisir_domaine: '— Domain —',
    tout_domaine: 'The whole domain',
    aucun_pas_acces: 'None — no access',
    retirer_prestataire: 'Remove the provider',
    retirer_portee: 'Remove the scope',
    ajouter_prestataire: '+ Add a provider',
    ajouter_portee: '+ Add a scope',
    annuler: 'Cancel',
    enregistrer: 'Save',
    err_ligne_prestataire: 'Each row must name a provider, or be removed.',
    err_portee_domaine: 'Each scope must name a domain.',

    priv_GESTIONNAIRE: 'Manager',
    priv_VALIDATEUR: 'Approver',
    priv_CONTRIBUTEUR: 'Contributor',
    priv_LECTEUR: 'Reader',
    priv_AUCUN: 'None',
    priv_PRESTATAIRE: 'Provider',

    desc_GESTIONNAIRE: 'Configures the module and holds the widest rights.',
    desc_VALIDATEUR: 'Approves and endorses surveillance plans.',
    desc_CONTRIBUTEUR: 'Creates and edits the module’s data.',
    desc_LECTEUR: 'Read-only access to the module’s data.',
    desc_AUCUN: 'No access to the data of this domain or sector.',
    desc_PRESTATAIRE: 'Provider view: access limited to the data of the providers held in scope.',

    desc_CARE_GESTIONNAIRE: 'Configures the module, deletes, and holds the widest rights.',
    desc_CARE_VALIDATEUR: 'Notifies and closes measures, dismisses a deficiency without action.',
    desc_CARE_CONTRIBUTEUR: 'Records deficiencies, handles the investigation and drafts the measures.',
    desc_CARE_LECTEUR: 'Read-only access to deficiencies and measures.',
    desc_CARE_AUCUN: 'No access to the deficiencies and measures of this domain or sector.',

    desc_RAMP_GESTIONNAIRE: 'Administrator: configures the module, imports, deletes, with no State limit.',
    desc_RAMP_VALIDATEUR: 'Regional Coordinator: views the inspections of every State, without importing.',
    desc_RAMP_CONTRIBUTEUR: 'National Coordinator: imports and handles the inspections of the States in scope.',
    desc_RAMP_LECTEUR: 'Read-only access to inspections and findings.',
    desc_RAMP_AUCUN: 'No access to the data of this State.',
    desc_RAMP_PRESTATAIRE: 'Provider view: the operator sees only the inspections and findings that concern it.',
};

const PT: Readonly<Record<Cle, string>> = {
    module_titre: 'Gestão de Direitos',
    nav_privileges: 'Privilégios',
    nav_audit: 'Registo de auditoria',
    deconnexion: 'Terminar sessão',
    etendre: 'Expandir',
    reduire: 'Reduzir',

    mod_PLAN: 'Planeamento da Vigilância',
    mod_SURV: 'Execução da Vigilância',
    mod_RAMP: 'RAMP Inspections',
    mod_CARE: 'Medidas de Aplicação',

    reserve_autorite: 'Gestão de Direitos: reservada as contas da Autoridade.',
    reserve_admin: 'Acesso reservado as contas SuperAdmin e Admin AAC.',
    module_indisponible: 'Módulo indisponível: {0}',

    page_titre: 'Gestão de Direitos — {0}',
    page_sous_titre: 'Utilizadores com o módulo em «Acesso aos módulos» do portal. Privilégio por defeito: Leitor.',
    rechercher_utilisateur: 'Procurar um utilizador…',
    tous_privileges: 'Todos os privilégios',
    compte_utilisateurs: '{0} utilizador(es) — {1}',
    col_nom: 'Apelido',
    col_prenoms: 'Nomes próprios',
    col_email: 'Email (identificador)',
    col_role_portail: 'Papel no portal',
    col_privilege_general: 'Privilégio geral',
    col_portees: 'Ambitos especificos',
    aucun_utilisateur: 'Nenhum utilizador tem acesso a este módulo.',
    defaut_court: '(defeito)',
    aucun_prestataire: 'Nenhum prestador — sem acesso',
    fermer: 'Fechar',
    modifier: 'Alterar',
    journal: 'Registo',
    journal_utilisateur: 'Registo de auditoria deste utilizador',

    audit_titre: 'Registo de auditoria — {0}',
    audit_sous_titre: 'Registo inalterável: cada entrada está encadeada a anterior por impressão SHA-256.',
    integrite_ok: 'Cadeia de integridade verificada — {0} entrada(s), nenhuma alteração detetada.',
    integrite_ko: 'Cadeia de integridade quebrada na entrada n.º {0} — o registo foi alterado.',
    journal_de: 'Registo de',
    voir_tout_module: 'Ver todo o módulo',
    rechercher: 'Procurar…',
    tous_utilisateurs: 'Todos os utilizadores',
    toutes_actions: 'Todas as ações',
    du: 'De',
    au: 'Até',
    reinitialiser: 'Reiniciar',
    compte_entrees: '{0} entrada(s)',
    col_numero: 'N.º',
    col_horodatage: 'Data e hora',
    col_utilisateur: 'Utilizador',
    col_action: 'Ação',
    col_objet: 'Objeto',
    col_reference: 'Referência',
    col_details: 'Detalhes',
    col_empreinte: 'Impressão',
    aucune_entree: 'Nenhuma entrada.',

    modal_titre: 'Privilégios — {0}',
    role_portail_court: 'papel no portal',
    par_defaut: '— por defeito',
    portee_prestataires: 'Âmbito específico — prestadores',
    hint_prestataires: 'Indique o ou os prestadores cujos dados esta conta pode ver, por setor de atividade e depois por nome. Sem prestador escolhido, não tem acesso a nenhum dado do módulo.',
    prestataires_retenus: '{0} prestador(es) escolhido(s).',
    portees_particulieres: 'Ambitos especificos — domínios e setores de atividade',
    hint_portees: 'Sem âmbito, o privilégio geral aplica-se em toda a parte. Um âmbito «Nenhum» retira o acesso aos dados do domínio ou do setor visado.',
    col_secteur: 'Setor de atividade',
    col_prestataire: 'Prestador',
    col_domaine: 'Domínio',
    col_privilege: 'Privilégio',
    tous_secteurs: 'Todos os setores',
    choisir_prestataire: '— Prestador —',
    choisir_domaine: '— Domínio —',
    tout_domaine: 'Todo o domínio',
    aucun_pas_acces: 'Nenhum — sem acesso',
    retirer_prestataire: 'Retirar o prestador',
    retirer_portee: 'Retirar o âmbito',
    ajouter_prestataire: '+ Adicionar um prestador',
    ajouter_portee: '+ Adicionar um âmbito',
    annuler: 'Cancelar',
    enregistrer: 'Guardar',
    err_ligne_prestataire: 'Cada linha deve indicar um prestador, ou ser retirada.',
    err_portee_domaine: 'Cada âmbito deve indicar um domínio.',

    priv_GESTIONNAIRE: 'Gestor',
    priv_VALIDATEUR: 'Validador',
    priv_CONTRIBUTEUR: 'Contribuidor',
    priv_LECTEUR: 'Leitor',
    priv_AUCUN: 'Nenhum',
    priv_PRESTATAIRE: 'Prestador',

    desc_GESTIONNAIRE: 'Configura o módulo e dispoe dos direitos mais amplos.',
    desc_VALIDATEUR: 'Valida e aprova os planos de vigilância.',
    desc_CONTRIBUTEUR: 'Cria e altera os dados do módulo.',
    desc_LECTEUR: 'Consulta apenas dos dados do módulo.',
    desc_AUCUN: 'Sem acesso aos dados deste domínio ou setor.',
    desc_PRESTATAIRE: 'Vista Prestador: acesso apenas aos dados dos prestadores escolhidos em âmbito.',

    desc_CARE_GESTIONNAIRE: 'Configura o módulo, elimina e dispoe dos direitos mais amplos.',
    desc_CARE_VALIDATEUR: 'Notifica e encerra as medidas, arquiva uma deficiência sem seguimento.',
    desc_CARE_CONTRIBUTEUR: 'Regista as deficiências, instrui o tratamento e redige as medidas.',
    desc_CARE_LECTEUR: 'Consulta apenas das deficiências e das medidas.',
    desc_CARE_AUCUN: 'Sem acesso as deficiências e as medidas deste domínio ou setor.',

    desc_RAMP_GESTIONNAIRE: 'Administrador: configura o módulo, importa, elimina, sem limite de Estado.',
    desc_RAMP_VALIDATEUR: 'Coordenador Regional: consulta as inspeções de todos os Estados, sem importar.',
    desc_RAMP_CONTRIBUTEUR: 'Coordenador Nacional: importa e instrui as inspeções dos Estados do seu âmbito.',
    desc_RAMP_LECTEUR: 'Consulta apenas das inspeções e dos desvios.',
    desc_RAMP_AUCUN: 'Sem acesso aos dados deste Estado.',
    desc_RAMP_PRESTATAIRE: 'Vista Prestador: o operador ve apenas as inspeções e os desvios que lhe dizem respeito.',
};

const VOLETS: Readonly<Record<Langue, Readonly<Record<Cle, string>>>> = { fr: FR, en: EN, pt: PT };

// ── La langue et l'espace se lisent de leur source, au chargement ──
//
// Ils vivaient dans `window.DR`, que React posait et que ce fichier lisait.
// Première réécriture : un état local, réglé par un `poser(lang, module)` que
// `main.tsx` appelait avant le premier rendu. **C'était le même défaut déplacé.**
//
// Un état qui doit être réglé avant d'être lu a un état « pas encore réglé », et
// le secours d'un tel état est toujours plausible : français, espace `PLAN`. Un
// écran portugais rendu en français ne lève pas, ne trace rien, et se lit
// comme un écran correct. L'ancien code, lui, **levait** — « DR is not
// defined » —, et c'est ainsi qu'on l'avait trouvé.
//
// Alors plutôt que de garder le secours et d'en faire un garde, l'état n'existe
// plus : les deux valeurs se lisent de leur source au chargement du module. La
// langue vient de `localStorage`, comme la lisent déjà `loader.ts`, `commun.ts`,
// `dates.ts` et `chrome.ts` — c'est la **même clé**, et c'est pourquoi la
// légende d'attente est dans la bonne langue avant que cet écran ne démarre.
// L'espace vient de `window.DR_MODULE`, que la page pose depuis l'URL.
//
// Il ne reste donc d'ordre à tenir pour personne, et `poser` ne sert plus qu'au
// **changement** de langue, qui est un événement et non un amorçage.

const CONNUES: readonly Langue[] = ['fr', 'en', 'pt'];
const normaliser = (lg: string): Langue => {
  const court = lg.slice(0, 2);
  return CONNUES.find((l) => l === court) ?? 'fr';
};

const langueEnregistree = (): Langue => {
  // Le `try` n'est pas décoratif : en navigation privée, `localStorage` lève à
  // l'accès, et un répertoire de traduction qui lève au chargement laisse la
  // page à son source — ce qu'elle a déjà montré une fois.
  try { return normaliser(localStorage.getItem('pr_lang') ?? 'fr'); } catch { return 'fr'; }
};

let langue: Langue = langueEnregistree();

/**
 * L'espace dont la page règle les droits, lu de `window.DR_MODULE` au
 * chargement. Il ne change pas au cours d'une visite : la page le tient de son
 * URL. Exporté pour que `socle.ts` et `api.ts` le lisent **d'ici** — il était
 * calculé en deux endroits, et deux endroits divergent.
 */
export const MODULE: string = (window.DR_MODULE || 'PLAN').toUpperCase();

/**
 * Change la langue. Appelée quand l'agent en choisit une autre, et par elle
 * seule : l'amorçage n'a plus besoin de personne.
 */
export function poser(lg: string): void {
  langue = normaliser(lg);
}

const trous = (texte: string, valeurs: readonly unknown[]): string =>
  valeurs.reduce<string>((t, v, i) => t.split(`{${i}}`).join(String(v)), texte);

/**
 * Le libellé d'une clé connue, avec textes à trou : `dt('compte_entrees', 12)`.
 *
 * **Le repli sur le français a disparu, et c'est le type qui l'a rendu mort.**
 * `DR_TR[langue][cle] ?? DR_TR.fr[cle]` existait parce qu'un volet pouvait être
 * incomplet ; `Record<Cle, string>` l'interdit. Garder un repli inatteignable
 * aurait laissé croire qu'il protège de quelque chose.
 */
export function dt(cle: Cle, ...valeurs: unknown[]): string {
  return trous(VOLETS[langue][cle], valeurs);
}

/**
 * Le libellé d'une clé **construite à l'exécution** — `priv_LECTEUR`,
 * `desc_RAMP_PRESTATAIRE`, `mod_PLAN`. Celles-là peuvent manquer pour de bonnes
 * raisons : un privilège que le référentiel ajoute, un module sans description
 * propre. Le repli complet est donc gardé ici — volet, puis français, puis la
 * clé elle-même.
 *
 * **Nommée à part plutôt que confondue avec `dt`** : la tolérance est le propre
 * de ces trois appels, et non une facilité offerte aux quatre-vingts autres, qui
 * doivent se tromper à la construction.
 */
export function dtSouple(cle: string, ...valeurs: unknown[]): string {
  const volet: Readonly<Record<string, string | undefined>> = VOLETS[langue];
  const secours: Readonly<Record<string, string | undefined>> = FR;
  return trous(volet[cle] ?? secours[cle] ?? cle, valeurs);
}

/** Vrai si la clé existe dans le volet retenu ou en français. */
const connue = (cle: string): boolean => {
  const volet: Readonly<Record<string, string | undefined>> = VOLETS[langue];
  const secours: Readonly<Record<string, string | undefined>> = FR;
  return volet[cle] !== undefined || secours[cle] !== undefined;
};

/**
 * Le libellé d'un échelon de privilège : le référentiel les nomme en majuscules,
 * l'écran les nomme dans la langue retenue.
 */
export const dtPriv = (p: string): string => dtSouple(`priv_${p}`);

/**
 * Ce qu'un échelon ouvre dépend du module : la description du module l'emporte
 * sur la description commune.
 */
export const dtPrivDesc = (p: string): string => {
  const cleModule = `desc_${MODULE}_${p}`;
  return connue(cleModule) ? dtSouple(cleModule) : dtSouple(`desc_${p}`);
};

/** Le libellé de l'espace réglé par la page. À défaut, son code. */
export const dtModule = (): string => {
  const cle = `mod_${MODULE}`;
  return connue(cle) ? dtSouple(cle) : MODULE;
};
