/* ═══════════════════════════════════════════════
   Utils - i18n, API helpers, exports
   ═══════════════════════════════════════════════ */

const TRANSLATIONS = {
  fr: {
    // Login
    login_title:'Profil de Risque', login_subtitle:'Surveillance', login_username:'Utilisateur/Email',
    login_password:'Mot de passe', login_btn:'Se connecter', login_error:'Identifiants incorrects',
    // Nav
    dashboard:'Tableau de Bord', dashboard_subtitle:'Aperçu global de la surveillance',
    risk_profiles:'Profils & Cycles', current_profiles:'Synthèses Profils',
    individual_profile:'Profils détaillés',
    strategic_analyses:'Analyses', eval_archives:'Archives',
    evaluations:'Évaluations', conformity:'Conformité', performance:'Performance',
    complexity:'Complexité', results_synthesis:'Résultats',
    surveillance_plans:'Plans de Surveillance', surveillance_freq:'Fréquences de surveillance', library:'Bibliothèque',
    access_mgmt:'Gestion des Accès', parameters:'Paramètres',
    domains_sectors:'Domaines & Secteurs', indicators:'Indicateurs',
    providers:'Prestataires', indices_cycles:'Indices & Seuils', indices_seuils:'Indices & Seuils', admin_aac:'Administration AAC',
    // Common
    active_profiles:'Profils Actifs', filters:'Filtres',
    coverage_rate:'Taux de Couverture', of_short:'sur', evaluated_short:'évalués',
    due_soon:'Échéances Proches', due_soon_hint:'À évaluer dans les 3 mois',
    deadline_short:'Butoir', due_date_short:'Échéance', scope_hint:'Périmètre couvert',
    validated_hint:'Profils validés en vigueur', high_risk:'Risques Élevés',
    high_risk_hint:'Profils à risque élevé', draft_hint:'Évaluations en cours',
    very_high_risk:'Risques Très Élevés', very_high_risk_hint:'Profils à risque très élevé',
    risk_low:'Faible', risk_high:'Élevé',
    all_domains:'Tous les Domaines', all_sectors:'Tous les Secteurs',
    logout:'Déconnexion', save:'Enregistrer', cancel:'Annuler',
    add:'Ajouter', delete:'Supprimer', edit:'Modifier', search:'Rechercher...',
    export_excel:'Excel', export_pdf:'PDF', import_btn:'Importer',
    draft:'Brouillon', validate:'Valider', submit:'Soumettre', reject:'Rejeter',
    no_data:'Aucune donnée.', loading:'Chargement...',
    confirm_delete:'Confirmer la suppression ?', confirm_action:'Confirmer ?',
    // Entities
    provider:'Prestataire', sector:'Secteur', domain:'Domaine', date:'Date',
    actions:'Actions', index:'Index', cycle:'Cycle', status:'Statut',
    active:'Actif', inactive:'Inactif', user:'Utilisateur', role:'Rôle',
    code:'Code', label:'Libellé', name:'Nom', description:'Description',
    // Evaluations
    new_eval:'Nouvelle Évaluation', global_synthesis:'Synthèse Globale',
    recommended_cycle:'Cycle Recommandé', risk_index:'Index de Risque',
    security:'Sécurité', sub_activities:'Sous-activités', risk:'Risque',
    note:'Note', level1:'Niveau 1', level2:'Niveau 2', level3:'Niveau 3',
    criterion1:'Critère 1', criterion2:'Critère 2', criterion3:'Critère 3',
    indicator:'Indicateur', to_evaluate:'À évaluer',
    validated:'Validé', submitted:'Soumis', rejected:'Rejeté',
    eval_validated_on:'Validée le', draft_saved:'Brouillon enregistré.',
    // Risk
    very_low:'Très Faible', low:'Faible', moderate:'Modéré',
    high:'Élevé', very_high:'Très Élevé', intensity:'Intensité',
    reinforced:'Renforcée', normal:'Normale', lightened:'Allégée',
    reduced:'Réduite', increased:'Augmentée', incoherent:'Incohérant',
    incoherent_msg:'Résultat incohérent - une réévaluation est nécessaire',
    risk_distribution:'Répartition des risques',
    security_perf:'Performance Sécurité',
    // Plans
    planning:'Planification', months:'mois',
    every_x_months:'Tous les {0} mois', x_per_cycle:'{0}x / cycle',
    // Params
    threshold_high:'Seuil Haut', threshold_low:'Seuil Bas',
    full_name:'Nom complet', abbreviation:'Sigle', state:'État', city:'Ville',
    address1:'Adresse 1', address2:'Adresse 2', admin_email:'Email admin',
    logo_label:'Logo (Base64)',
    // Users
    new_user:'Nouvel Utilisateur', password_gen:'Mot de passe généré',
    reset_password:'Réinitialiser MDP', connection_logs:'Logs de connexion',
    password_wrong:'Mot de passe incorrect.',
    password:'Mot de passe', show_password:'Afficher le mot de passe',
    confirm_admin_password:'Confirmation administrateur', admin_password:'Mot de passe administrateur',
    // Documents
    print:'Imprimer',
    document:'Document', upload:'Téléverser', download:'Télécharger',
    no_document:'Aucun document.', file_name:'Nom du fichier',
    // Misc
    total:'Total', statistics:'Statistiques', copyright:'© {0} UEMOA / URSAC',
    csn_months:'CSN (mois)', contact:'Contact', trigramme:'Trigramme',
    telephone:'Téléphone', email_label:'Email',
    all_cycles:'Tous les cycles', all_sa:'Toutes S.A.',
    select_option:'-- Sélectionner --',
    matrix_title:'Matrice de Risque', safety_perf:'Performance Sécurité',
    change_password:'Changer le mot de passe', new_password:'Nouveau mot de passe',
    confirm_password_label:'Confirmer', points_forts:'Points Forts',
    points_faibles:'Points à Améliorer', avg_cycle:'Cycle moyen',
    password_changed:'Mot de passe modifié avec succès.',
    total_analyzed:'Profils analysés',
    // Sidebar & Accordion
    expand_all:'Tout déplier', collapse_all:'Tout replier',
    reset_filters:'Réinitialiser', all_types:'Tous les types',
    all_providers:'Tous les prestataires', all_risk_levels:'Tous les niveaux',
    results_count:'{0} résultat(s)',
    export_word:'Word', export_indicators:'Exporter indicateurs',
    import_indicators:'Importer indicateurs', criteria:'Critères',
    choose_file:'Choisir un fichier', logo_upload:'Charger un logo',
    type:'Type', all_sub_activities:'Toutes les S.A.',
    eval_indicators:'Évaluation des indicateurs',
    evaluations_en_cours:'Évaluations en cours', evaluations_validees:'Évaluations validées',
    tab_generalites:'Généralités',
    capacity_inspecteurs:'Capacité inspecteurs', archives:'Archives',
    gen_introduction:'Introduction',
    gen_resume:'Résumé analytique',
    gen_evaluateurs:'Liste des évaluateurs',
    gen_parties:'Parties prenantes',
    gen_sources:'Sources de données pour les évaluations',
    gen_actions:"Actions d'améliorations proposées suite aux échanges avec les prestataires",
    gen_conclusion:'Conclusion',
    back:'Retour',
    gen_sec_cadre:"Cadre de l'évaluation",
    gen_sec_participants:'Participants',
    gen_sec_analyse:'Analyse et suites',
    eval_tab_conf:'Conformité', eval_tab_perf:'Performance', eval_tab_comp:'Complexité',
    validate_all_required:'Les évaluations doivent être enregistrées pour les 3 indicateurs avant validation.',
    sub_activity:'Sous-activité'
  },
  en: {
    login_title:'Risk Profile', login_subtitle:'Surveillance', login_username:'Username/Email',
    login_password:'Password', login_btn:'Sign in', login_error:'Invalid credentials',
    dashboard:'Dashboard', dashboard_subtitle:'Global surveillance overview',
    risk_profiles:'Profiles', current_profiles:'Profile Summaries',
    individual_profile:'Detailed Profiles',
    strategic_analyses:'Analyses', eval_archives:'Archives',
    evaluations:'Evaluations', conformity:'Conformity', performance:'Performance',
    complexity:'Complexity', results_synthesis:'Results',
    surveillance_plans:'Surveillance Plans', surveillance_freq:'Surveillance Frequencies', library:'Library',
    access_mgmt:'Access Management', parameters:'Parameters',
    domains_sectors:'Domains & Sectors', indicators:'Indicators',
    providers:'Providers', indices_cycles:'Indices & Thresholds', indices_seuils:'Indices & Thresholds', admin_aac:'AAC Admin',
    active_profiles:'Active Profiles', filters:'Filters',
    coverage_rate:'Coverage Rate', of_short:'of', evaluated_short:'assessed',
    due_soon:'Upcoming Deadlines', due_soon_hint:'To assess within 3 months',
    deadline_short:'Deadline', due_date_short:'Due date', scope_hint:'Scope covered',
    validated_hint:'Validated profiles in force', high_risk:'High Risks',
    high_risk_hint:'High risk profiles', draft_hint:'Assessments in progress',
    very_high_risk:'Very High Risks', very_high_risk_hint:'Very high risk profiles',
    risk_low:'Low', risk_high:'High',
    all_domains:'All Domains', all_sectors:'All Sectors',
    logout:'Sign out', save:'Save', cancel:'Cancel',
    add:'Add', delete:'Delete', edit:'Edit', search:'Search...',
    export_excel:'Excel', export_pdf:'PDF', import_btn:'Import',
    draft:'Draft', validate:'Validate', submit:'Submit', reject:'Reject',
    no_data:'No data.', loading:'Loading...',
    confirm_delete:'Confirm deletion?', confirm_action:'Confirm?',
    provider:'Provider', sector:'Sector', domain:'Domain', date:'Date',
    actions:'Actions', index:'Index', cycle:'Cycle', status:'Status',
    active:'Active', inactive:'Inactive', user:'User', role:'Role',
    code:'Code', label:'Label', name:'Name', description:'Description',
    new_eval:'New Evaluation', global_synthesis:'Global Synthesis',
    recommended_cycle:'Recommended Cycle', risk_index:'Risk Index',
    security:'Safety', sub_activities:'Sub-activities', risk:'Risk',
    note:'Score', level1:'Level 1', level2:'Level 2', level3:'Level 3',
    criterion1:'Criterion 1', criterion2:'Criterion 2', criterion3:'Criterion 3',
    indicator:'Indicator', to_evaluate:'To evaluate',
    validated:'Validated', submitted:'Submitted', rejected:'Rejected',
    eval_validated_on:'Validated on', draft_saved:'Draft saved.',
    very_low:'Very Low', low:'Low', moderate:'Moderate',
    high:'High', very_high:'Very High', intensity:'Intensity',
    reinforced:'Reinforced', normal:'Normal', lightened:'Lightened',
    reduced:'Reduced', increased:'Increased', incoherent:'Incoherent',
    incoherent_msg:'Incoherent result - re-evaluation required',
    risk_distribution:'Risk Distribution',
    security_perf:'Security Performance',
    planning:'Planning', months:'months',
    every_x_months:'Every {0} months', x_per_cycle:'{0}x/cycle',
    threshold_high:'High Threshold', threshold_low:'Low Threshold',
    full_name:'Full Name', abbreviation:'Abbreviation', state:'State', city:'City',
    address1:'Address 1', address2:'Address 2', admin_email:'Admin email',
    logo_label:'Logo (Base64)',
    new_user:'New User', password_gen:'Generated password',
    reset_password:'Reset Password', connection_logs:'Connection Logs',
    password_wrong:'Wrong password.',
    password:'Password', show_password:'Show password',
    confirm_admin_password:'Administrator confirmation', admin_password:'Administrator password',
    print:'Print',
    document:'Document', upload:'Upload', download:'Download',
    no_document:'No document.', file_name:'File name',
    total:'Total', statistics:'Statistics', copyright:'© {0} UEMOA / URSAC',
    csn_months:'CSN (months)', contact:'Contact', trigramme:'Trigram',
    telephone:'Phone', email_label:'Email',
    all_cycles:'All cycles', all_sa:'All S.A.',
    select_option:'-- Select --',
    matrix_title:'Risk Matrix', safety_perf:'Safety Performance',
    change_password:'Change Password', new_password:'New password',
    confirm_password_label:'Confirm', points_forts:'Strengths',
    points_faibles:'Weaknesses', avg_cycle:'Avg Cycle',
    password_changed:'Password changed successfully.',
    total_analyzed:'Profiles analyzed',
    expand_all:'Expand all', collapse_all:'Collapse all',
    reset_filters:'Reset', all_types:'All types',
    all_providers:'All providers', all_risk_levels:'All levels',
    results_count:'{0} result(s)',
    export_word:'Word', export_indicators:'Export indicators',
    import_indicators:'Import indicators', criteria:'Criteria',
    choose_file:'Choose file', logo_upload:'Upload logo',
    type:'Type', all_sub_activities:'All S.A.',
    eval_indicators:'Indicator Evaluation',
    evaluations_en_cours:'Ongoing Evaluations', evaluations_validees:'Validated Evaluations',
    tab_generalites:'General',
    capacity_inspecteurs:'Inspector capacity', archives:'Archives',
    gen_introduction:'Introduction',
    gen_resume:'Executive Summary',
    gen_evaluateurs:'List of Evaluators',
    gen_parties:'Stakeholders',
    gen_sources:'Data Sources for Evaluations',
    gen_actions:'Improvement Actions Proposed After Provider Discussions',
    gen_conclusion:'Conclusion',
    back:'Back',
    gen_sec_cadre:'Evaluation Framework',
    gen_sec_participants:'Participants',
    gen_sec_analyse:'Analysis and Follow-up',
    eval_tab_conf:'Conformity', eval_tab_perf:'Performance', eval_tab_comp:'Complexity',
    validate_all_required:'Evaluations must be recorded for all 3 indicators before validation.',
    sub_activity:'Sub-activity'
  },
  pt: {
    login_title:'Perfil de Risco', login_subtitle:'Vigilância', login_username:'Utilizador/Email',
    login_password:'Senha', login_btn:'Entrar', login_error:'Credenciais inválidas',
    dashboard:'Painel', dashboard_subtitle:'Visão geral da vigilância',
    risk_profiles:'Perfis', current_profiles:'Sínteses de Perfis', individual_profile:'Perfis Detalhados',
    strategic_analyses:'Análises', eval_archives:'Arquivos',
    evaluations:'Avaliações', conformity:'Conformidade', performance:'Desempenho',
    complexity:'Complexidade', results_synthesis:'Resultados',
    surveillance_plans:'Planos de Vigilância', surveillance_freq:'Frequências de vigilância', library:'Biblioteca',
    access_mgmt:'Gestão de Acessos', parameters:'Parâmetros',
    domains_sectors:'Domínios e Setores', indicators:'Indicadores',
    providers:'Prestadores', indices_cycles:'Índices e Limiares', indices_seuils:'Índices e Limiares', admin_aac:'Admin AAC',
    active_profiles:'Perfis Ativos', filters:'Filtros',
    coverage_rate:'Taxa de Cobertura', of_short:'de', evaluated_short:'avaliados',
    due_soon:'Prazos Proximos', due_soon_hint:'A avaliar em 3 meses',
    deadline_short:'Prazo', due_date_short:'Vencimento', scope_hint:'Perimetro coberto',
    validated_hint:'Perfis validados em vigor', high_risk:'Riscos Elevados',
    high_risk_hint:'Perfis de risco elevado', draft_hint:'Avaliacoes em curso',
    very_high_risk:'Riscos Muito Elevados', very_high_risk_hint:'Perfis de risco muito elevado',
    risk_low:'Baixo', risk_high:'Elevado',
    all_domains:'Todos os Domínios', all_sectors:'Todos os Setores',
    logout:'Sair', save:'Salvar', cancel:'Cancelar',
    add:'Adicionar', delete:'Excluir', edit:'Editar', search:'Pesquisar...',
    export_excel:'Excel', export_pdf:'PDF', import_btn:'Importar',
    draft:'Rascunho', validate:'Validar', submit:'Submeter', reject:'Rejeitar',
    no_data:'Sem dados.', loading:'Carregando...',
    confirm_delete:'Confirmar exclusão?', confirm_action:'Confirmar?',
    provider:'Prestador', sector:'Setor', domain:'Domínio', date:'Data',
    actions:'Ações', index:'Índice', cycle:'Ciclo', status:'Estado',
    active:'Ativo', inactive:'Inativo', user:'Utilizador', role:'Função',
    code:'Código', label:'Designação', name:'Nome', description:'Descrição',
    new_eval:'Nova Avaliação', global_synthesis:'Síntese Global',
    recommended_cycle:'Ciclo Recomendado', risk_index:'Índice de Risco',
    security:'Segurança', sub_activities:'Sub-atividades', risk:'Risco',
    note:'Nota', level1:'Nível 1', level2:'Nível 2', level3:'Nível 3',
    criterion1:'Critério 1', criterion2:'Critério 2', criterion3:'Critério 3',
    indicator:'Indicador', to_evaluate:'A avaliar',
    validated:'Validado', submitted:'Submetido', rejected:'Rejeitado',
    eval_validated_on:'Validado em', draft_saved:'Rascunho salvo.',
    very_low:'Muito Baixo', low:'Baixo', moderate:'Moderado',
    high:'Elevado', very_high:'Muito Elevado', intensity:'Intensidade',
    reinforced:'Reforçada', normal:'Normal', lightened:'Reduzida',
    reduced:'Reduzida', increased:'Aumentada', incoherent:'Incoerente',
    incoherent_msg:'Resultado incoerente - reavaliação necessária',
    risk_distribution:'Distribuição de riscos',
    security_perf:'Performance de Segurança',
    planning:'Planeamento', months:'meses',
    every_x_months:'A cada {0} meses', x_per_cycle:'{0}x/ciclo',
    threshold_high:'Limiar Alto', threshold_low:'Limiar Baixo',
    full_name:'Nome completo', abbreviation:'Sigla', state:'Estado', city:'Cidade',
    address1:'Endereço 1', address2:'Endereço 2', admin_email:'Email admin',
    logo_label:'Logo (Base64)',
    new_user:'Novo Utilizador', password_gen:'Senha gerada',
    reset_password:'Redefinir Senha', connection_logs:'Logs de conexão',
    password_wrong:'Senha incorreta.',
    password:'Senha', show_password:'Mostrar senha',
    confirm_admin_password:'Confirmação do administrador', admin_password:'Senha do administrador',
    print:'Imprimir',
    document:'Documento', upload:'Carregar', download:'Descarregar',
    no_document:'Nenhum documento.', file_name:'Nome do ficheiro',
    total:'Total', statistics:'Estatísticas', copyright:'© {0} UEMOA / URSAC',
    csn_months:'CSN (meses)', contact:'Contacto', trigramme:'Trigrama',
    telephone:'Telefone', email_label:'Email',
    all_cycles:'Todos os ciclos', all_sa:'Todas S.A.',
    select_option:'-- Selecionar --',
    matrix_title:'Matriz de Risco', safety_perf:'Desempenho de Segurança',
    change_password:'Alterar Senha', new_password:'Nova senha',
    confirm_password_label:'Confirmar', points_forts:'Pontos Fortes',
    points_faibles:'Pontos a Melhorar', avg_cycle:'Ciclo médio',
    password_changed:'Senha alterada com sucesso.',
    total_analyzed:'Perfis analisados',
    expand_all:'Expandir tudo', collapse_all:'Recolher tudo',
    reset_filters:'Redefinir', all_types:'Todos os tipos',
    all_providers:'Todos os prestadores', all_risk_levels:'Todos os níveis',
    results_count:'{0} resultado(s)',
    export_word:'Word', export_indicators:'Exportar indicadores',
    import_indicators:'Importar indicadores', criteria:'Critérios',
    choose_file:'Escolher ficheiro', logo_upload:'Carregar logo',
    type:'Tipo', all_sub_activities:'Todas S.A.',
    eval_indicators:'Avaliação dos indicadores',
    evaluations_en_cours:'Avaliações em curso', evaluations_validees:'Avaliações validadas',
    tab_generalites:'Generalidades',
    capacity_inspecteurs:'Capacidade inspetores', archives:'Arquivos',
    gen_introduction:'Introdução',
    gen_resume:'Resumo analítico',
    gen_evaluateurs:'Lista de avaliadores',
    gen_parties:'Partes interessadas',
    gen_sources:'Fontes de dados das avaliações',
    gen_actions:'Ações de melhoria propostas após discussões com os prestadores',
    gen_conclusion:'Conclusão',
    back:'Voltar',
    gen_sec_cadre:'Enquadramento da avaliação',
    gen_sec_participants:'Participantes',
    gen_sec_analyse:'Análise e seguimento',
    eval_tab_conf:'Conformidade', eval_tab_perf:'Desempenho', eval_tab_comp:'Complexidade',
    validate_all_required:'As avaliações devem ser registadas para os 3 indicadores antes da validação.',
    sub_activity:'Sub-atividade'
  }
};

// ── i18n helper ──
function t(key, ...args) {
    const lang = window.APP_STATE?.lang || localStorage.getItem('pr_lang') || 'fr';
    let str = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fr[key] || key;
    args.forEach((arg, i) => { str = str.replace(`{${i}}`, arg); });
    return str;
}


// ══════════════════════════════════════
// ── Scoring & Calculation Functions ──
// ══════════════════════════════════════

/**
 * Calculate taux (rate) = sum_of_notes / (nb_active_indicators * 3)
 * @param {Object} notesObj - {indicator_id: score(1-3), ...}
 * @param {Array} indicateurs - list of indicator objects
 * @param {string} [saId] - if provided, filter conformity keys by SA: "saId_indId"
 * @returns {number} taux between 0 and 1
 */
function calculateTaux(notesObj, indicateurs, saId) {
    const active = (indicateurs || []).filter(i => i?.actif !== false && i?.actif !== 0);
    if (!active.length) return 0;
    let sum = 0;
    active.forEach(ind => {
        let note;
        if (saId) {
            // Conformity mode: key is "saId_indId"
            note = notesObj?.[`${saId}_${ind.id}`];
        } else {
            note = notesObj?.[ind.id];
        }
        if (note) sum += note;
    });
    return sum / (active.length * 3);
}

/**
 * Calculate conformity taux over ALL sub-activities (for global IDC)
 * Formula: sum_of_ALL_conf_notes / (total_conf_indicators_in_sector * 3)
 * where total = nb_SA * nb_conf_indicators (each indicator evaluated per SA)
 */
function calculateTauxConfGlobal(notesConf, confInds, sas) {
    const active = (confInds || []).filter(i => i?.actif !== false && i?.actif !== 0);
    if (!active.length || !sas.length) return 0;
    let sum = 0;
    const totalSlots = active.length * sas.length;
    sas.forEach(sa => {
        active.forEach(ind => {
            const key = `${sa.id}_${ind.id}`;
            if (notesConf?.[key]) sum += notesConf[key];
        });
    });
    return sum / (totalSlots * 3);
}

/**
 * Calculate complexity taux over ALL sub-activities (for global IDE)
 * Each SA has its own set of complexity indicators
 */
function calculateTauxCompGlobal(notesComp, indComplex) {
    const active = (indComplex || []).filter(i => i?.actif !== false && i?.actif !== 0);
    if (!active.length) return 0;
    let sum = 0;
    active.forEach(ind => {
        if (notesComp?.[ind.id]) sum += notesComp[ind.id];
    });
    return sum / (active.length * 3);
}

/**
 * Convert taux to 3-level index (1, 2, 3)
 * - If limit1 < taux ≤ 1 → 3
 * - If limit2 < taux ≤ limit1 → 2
 * - If 0 < taux ≤ limit2 → 1
 * - If taux = 0 → 0 (no data)
 */
function getIndice3Levels(taux, limit1, limit2) {
    if (taux > limit1 && taux <= 1) return 3;
    if (taux > limit2 && taux <= limit1) return 2;
    if (taux > 0 && taux <= limit2) return 1;
    return 0;
}

/**
 * Determine Security Index (IDS) from conformity + performance indices.
 * Combinations (idc, idp):
 *   (2,3)|(3,3) → a/A  Performance élevée
 *   (2,2)|(3,2) → b/B  Performance moyen
 *   (1,2)|(2,1)|(3,1) → c/C  Performance faible
 *   (1,1) → d/D  Performance très faible
 *   (1,3) → Incohérant (réévaluation nécessaire)
 *
 * @param {number} idc - conformity index (1-3)
 * @param {number} idp - performance index (1-3)
 * @param {boolean} isGlobal - true for uppercase (A-D), false for lowercase (a-d)
 */
function getSecurityIndex(idc, idp, isGlobal) {
    const map = {
        '2,3': { grade: 'a', desc: 'Performance de sécurité élevée', descKey: 'high' },
        '3,3': { grade: 'a', desc: 'Performance de sécurité élevée', descKey: 'high' },
        '2,2': { grade: 'b', desc: 'Performance de sécurité moyen', descKey: 'moderate' },
        '3,2': { grade: 'b', desc: 'Performance de sécurité moyen', descKey: 'moderate' },
        '1,2': { grade: 'c', desc: 'Performance de sécurité faible', descKey: 'low' },
        '2,1': { grade: 'c', desc: 'Performance de sécurité faible', descKey: 'low' },
        '3,1': { grade: 'c', desc: 'Performance de sécurité faible', descKey: 'low' },
        '1,1': { grade: 'd', desc: 'Performance de sécurité très faible', descKey: 'very_low' },
        '1,3': { grade: 'inc', desc: 'Incohérant - réévaluation nécessaire', descKey: 'incoherent' }
    };
    const key = `${idc},${idp}`;
    const entry = map[key];
    if (!entry) return { val: '-', desc: 'N/A', isIncoherent: false };
    if (entry.grade === 'inc') {
        return { val: 'Incohérant', desc: entry.desc, isIncoherent: true };
    }
    const val = isGlobal ? entry.grade.toUpperCase() : entry.grade;
    return { val, desc: entry.desc, isIncoherent: false };
}


/**
 * Determine Risk Index from complexity index + security index.
 *
 * GLOBAL level (uppercase): IDE_g + IDS_g → e.g. "2B"
 *   1A → Très Faible | 2A,1B → Faible | 3A,2B,1C → Modéré | 3B,2C,1D → Élevé | 3C,2D,3D → Très Élevé
 *
 * SA level (lowercase): ide_s + ids_s → e.g. "2b"
 *   1a,2a,1b → Faible | 3a,2b,1c → Modéré | 3b,2c,1d → Élevé | 3c,2d,3d → Très Élevé
 *
 * @param {number} complexityIndex - IDE (1-3)
 * @param {string} securityVal - security grade letter (A-D or a-d)
 * @param {boolean} isGlobal - true for global level
 */
function getRiskIndex(complexityIndex, securityVal, isGlobal) {
    if (!complexityIndex || !securityVal || securityVal === '-' || securityVal === 'Incohérant') {
        return { risk: 'N/A', label: securityVal === 'Incohérant' ? 'Incohérant' : '-', csnMod: 1, freq: 1, intensity: '-' };
    }

    const idx = String(complexityIndex);
    const sec = securityVal;
    const combo = `${idx}${sec}`;

    if (isGlobal) {
        // Global risk index (uppercase): determines CSRBO cycle
        const globalMap = {
            '1A': { risk: t('very_low'),  label: '1A', csnMod: 2,    freq: 1, intensity: t('reduced') },
            '2A': { risk: t('low'),       label: '2A', csnMod: 1.5,  freq: 1, intensity: t('moderate') },
            '1B': { risk: t('low'),       label: '1B', csnMod: 1.5,  freq: 1, intensity: t('moderate') },
            '3A': { risk: t('moderate'),  label: '3A', csnMod: 1,    freq: 2, intensity: t('normal') },
            '2B': { risk: t('moderate'),  label: '2B', csnMod: 1,    freq: 2, intensity: t('normal') },
            '1C': { risk: t('moderate'),  label: '1C', csnMod: 1,    freq: 2, intensity: t('normal') },
            '3B': { risk: t('high'),      label: '3B', csnMod: 0.75, freq: 3, intensity: t('increased') },
            '2C': { risk: t('high'),      label: '2C', csnMod: 0.75, freq: 3, intensity: t('increased') },
            '1D': { risk: t('high'),      label: '1D', csnMod: 0.75, freq: 3, intensity: t('increased') },
            '3C': { risk: t('very_high'), label: '3C', csnMod: 0.5,  freq: 4, intensity: t('reinforced') },
            '2D': { risk: t('very_high'), label: '2D', csnMod: 0.5,  freq: 4, intensity: t('reinforced') },
            '3D': { risk: t('very_high'), label: '3D', csnMod: 0.5,  freq: 4, intensity: t('reinforced') }
        };
        return globalMap[combo] || { risk: 'N/A', label: '-', csnMod: 1, freq: 1, intensity: '-' };
    } else {
        // SA risk index (lowercase): determines frequency
        const saMap = {
            '1a': { risk: t('low'),       label: '1a', freq: 1 },
            '2a': { risk: t('low'),       label: '2a', freq: 1 },
            '1b': { risk: t('low'),       label: '1b', freq: 1 },
            '3a': { risk: t('moderate'),  label: '3a', freq: 2 },
            '2b': { risk: t('moderate'),  label: '2b', freq: 2 },
            '1c': { risk: t('moderate'),  label: '1c', freq: 2 },
            '3b': { risk: t('high'),      label: '3b', freq: 3 },
            '2c': { risk: t('high'),      label: '2c', freq: 3 },
            '1d': { risk: t('high'),      label: '1d', freq: 3 },
            '3c': { risk: t('very_high'), label: '3c', freq: 4 },
            '2d': { risk: t('very_high'), label: '2d', freq: 4 },
            '3d': { risk: t('very_high'), label: '3d', freq: 4 }
        };
        return saMap[combo] || { risk: 'N/A', label: '-', freq: 1 };
    }
}


/**
 * Get CSS badge class from risk label or index label
 */
function getRiskBadgeClass(riskLabel) {
    const l = (riskLabel || '').toLowerCase();
    if (l.includes('incoh')) return 'badge-risk-incoherent';
    if (l.includes('très faible') || l.includes('very low') || l.includes('muito baixo')) return 'badge-risk-very-low';
    if (l.includes('très élevé') || l.includes('very high') || l.includes('muito elevado')) return 'badge-risk-very-high';
    if (l.includes('faible') || l.includes('low') || l.includes('baixo')) return 'badge-risk-low';
    if (l.includes('modéré') || l.includes('moderate') || l.includes('moderado')) return 'badge-risk-moderate';
    if (l.includes('élevé') || l.includes('high') || l.includes('elevado')) return 'badge-risk-high';
    return '';
}

/**
 * Get intensity label from csnMod
 */
function getIntensityLabel(csnMod) {
    if (csnMod >= 2) return t('reduced');         // Réduite: 2*CSn
    if (csnMod >= 1.5) return t('moderate');      // Modérée: (3/2)*CSn
    if (csnMod === 1) return t('normal');          // Normale: CSn
    if (csnMod >= 0.75) return t('increased');     // Augmentée: (3/4)*CSn
    if (csnMod > 0) return t('reinforced');        // Renforcée: CSn/2
    return '-';
}

// ── Date formatter ──
