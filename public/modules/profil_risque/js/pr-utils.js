/* ═══════════════════════════════════════════════
   Utils - i18n, API helpers, exports
   ═══════════════════════════════════════════════ */

const TRANSLATIONS = {
  fr: {
    chargement_impossible: "Chargement impossible : {0}",
    aucun_minimum: "0 = pas de minimum imposé",
    televersement_en_cours: "Téléversement…",
    reevaluation_privilege: "Réévaluation réservée aux privilèges Gestionnaire et Validateur couvrant ce domaine et ce secteur.",
    reevaluation_en_cours: "Une réévaluation est déjà en cours pour ce prestataire.",
    confirmer_consolidation: "Démarrer la consolidation ?\nLes notes des indicateurs (Conformité, Performance, Complexité) deviendront éditables pour permettre les modifications. Le suivi s'arrête à l'enregistrement de la réunion.",
    reunion_enregistree_verrou: "Réunion enregistrée — indicateurs verrouillés en lecture seule",
    reunion_enregistree: "Réunion enregistrée",
    confirmer_soumettre_notes: "Soumettre vos notes au validateur ? Elles deviendront visibles et ne pourront plus être modifiées.",
    confirmer_soumettre_evaluation: "Soumettre cette évaluation à la validation ?",
    confirmer_rejet_evaluation: "Rejeter cette évaluation arrête le processus. Confirmer ?",
    confirmer_renvoi_observations: "Renvoyer pour prise en compte des observations ?",
    confirmer_cloture_reunion: "Clôturer la réunion prestataire ? Cela verrouille tous les onglets en lecture seule jusqu'à la validation finale.",
    motif_reevaluation: "Motif de la réévaluation",
    reevaluer_titre: "Réévaluer",
    fin_de_cycle: "Fin de cycle",
    instance_changement_impossible: "Changement d’instance impossible",
    televersement_impossible: 'Téléversement impossible',
    fichier_trop_volumineux_max: 'Fichier trop volumineux (maximum {0} Mo).',
    import_refuse: 'Import refusé',
    import_format_excel: 'Erreur serveur ({0}). Vérifiez le format du fichier Excel. Les onglets attendus sont : Conformite, Performance, Complexite.',
    evaluation_verrouillee_import: 'Évaluation verrouillée : import impossible après soumission ou validation.',
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
    sous_menu_replier:'Replier le sous-menu', sous_menu_deplier:'Déplier le sous-menu',
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
    close:'Fermer', ouvrir_menu:'Ouvrir le menu', deplier_replier:'Déplier ou replier',
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
    sub_activity:'Sous-activité',
    no_file_selected:'Aucun fichier sélectionné',
    no_provider_in_scope:'Aucun prestataire dans les domaines et secteurs couverts par vos privilèges.',
    loading_eligible:'Chargement des évaluateurs éligibles…',
    no_eligible_user:'Aucun utilisateur éligible : aucun privilège Contributeur, Validateur ou Administrateur ne couvre ce domaine et ce secteur.',
    no_change_since_start:'Aucun changement depuis le démarrage. Allez sur Conformité / Performance / Complexité pour modifier les notes.',
    no_minutes:'Aucun compte rendu saisi',
    no_meeting:'Aucune réunion enregistrée',
    no_score_change:'Aucun changement de note enregistré. Cliquez sur le bouton pour démarrer une consolidation.',
    no_score_change_meeting:'Aucun changement de note rattaché à cette réunion.',
    no_inspector:'Aucun inspecteur recensé',
    no_validated_eval:'Aucune évaluation validée',
    no_peer_indicator:'Aucun prestataire pair évalué sur cet indicateur.',
    no_peer_group:'Aucun prestataire pair évalué sur ce groupe.',
    no_indicator:'Aucun indicateur.',
    no_access:'Aucun accès',
    name_required:'Nom requis',
    eval_not_found:'Évaluation introuvable',
    word_downloaded:'Rapport Word téléchargé',
    allow_popups_pdf:'Autorisez les fenêtres surgissantes pour générer le PDF.',
    create_reserved:'Création réservée aux privilèges Gestionnaire ou Validateur.',
    select_provider_sector:'Sélectionnez un prestataire et un secteur',
    consolidation_on:'Consolidation activée — vous pouvez modifier les notes',
    meeting_saved:'Réunion enregistrée',
    minutes_not_found:'Compte-rendu introuvable',
    provider_meeting_saved:'Réunion prestataire enregistrée',
    not_designated:'Vous n\'êtes pas évaluateur désigné pour cette évaluation.',
    scores_submitted:'Vos notes ont été soumises au validateur.',
    submitted_validation:'Soumis à la validation',
    cycle_dates_reserved:'Seuls les privilèges Validateur ou Gestionnaire peuvent modifier les dates de cycle.',
    new_revision:'Nouvelle révision créée en brouillon — l’évaluation validée reste disponible',
    delete_reserved:'Suppression réservée au privilège Gestionnaire couvrant ce domaine et ce secteur.',
    file_too_large:'« {0} » fait {1} Mo : maximum {2} Mo.',
    file_uploaded:'« {0} » téléversé',
    export_failed:'Export impossible : {0}',
    submit_missing_scores:'Impossible de soumettre : {0} indicateur(s) Performance et {1} indicateur(s) Complexité non notés.',
    submit_error:'Erreur lors de la soumission : {0}',
    reason_required_for:'Motif requis pour {0}',
    dates_save_error:'Erreur lors de l’enregistrement des dates : {0}',
    import_scores:'Import : {0} note(s) reprise(s)',
    synthesis:'Synthèse',
    reevaluer_btn:'↻ Réévaluer',
    agenda:'Ordre du jour',
    no_previous_eval:'Pas d\'évaluation antérieure',
    trend_vs_previous:'Tendance vs évaluation précédente',
    position_vs_peers:'Situation par rapport aux autres prestataires du secteur',
    detail_by_provider:'Détail par prestataire',
    summary_tab:'📊 Synthèse',
    risk_matrix_title:'Matrice des profils de risque',
    add_comment_btn:'💬 Ajouter un commentaire',
    loading_meetings:'Chargement des réunions...',
    eval_returned_banner:'↩ Évaluation renvoyée pour prise en compte des observations',
    provider_meeting_tab:'Réunion prestataire',
    min_assessors:'Nombre minimal d\'évaluateurs requis',
    designated_assessors:'Évaluateurs désignés',
    perf_comp_hint:'(Performance &amp; Complexité)',
    scores_already_submitted:'✓ Notes déjà soumises',
    consolidation_active:'⚙ Consolidation active — sera attachée au prochain compte-rendu enregistré',
    refresh_consolidation:'⚙ Actualiser Évaluation — Consolidation',
    linked_consolidation:'Consolidation associée',
    new_meeting_btn:'+ Nouvelle réunion',
    ref_short:'Réf.',
    new_f:'Nouvelle',
    close_meeting_btn:'🔒 Clôturer',
    meeting_date:'Date de réunion',
    participants_caa:'Participants AAC (un par ligne)',
    participants_provider:'Participants prestataire (un par ligne)',
    exchanges_summary:'Résumé des échanges',
    signature_provider:'Signature prestataire (nom du représentant)',
    signature_caa:'Signature AAC (nom du représentant)',
    close_btn:'Fermer',
    participants_one_per_line:'Participants (un par ligne)',
    back_arrow:'← Retour',
    provider_name_label:'Nom du Prestataire :',
    sector_label:'Secteur :',
    meeting_date_label:'Date de la réunion :',
    eval_ref_label:'Référence évaluation :',
    submit_my_scores:'Soumettre mes notes au validateur (elles deviendront visibles)',
    synthesis_by_sa:'Synthèse par Sous-activité',
    rejected_f:'Rejetée',
    in_preparation:'En préparation',
    returned_for_observations:'↩ Renvoyée pour prise en compte des observations',
    cycle_start_label:'Début Cycle :',
    reassess_not_allowed:'Réévaluation non autorisée',
    eval_rejected_stopped:'Évaluation rejetée — circuit interrompu',
    no_assessor_yet:'Aucun évaluateur désigné : la notation n\'est pas encore ouverte',
    eval_progress:'Avancement de l\'évaluation',
    details:'Détails',
    view_indicators_scores:'Consulter les indicateurs et notes',
    reserved_manager_validator:'Réservé aux privilèges Gestionnaire et Validateur couvrant ce domaine et ce secteur.',
    inspectors_capacity:'Capacité des inspecteurs',
    inspectors_capacity_hint:'Charge de chaque inspecteur — nombre d\'évaluations où il est désigné. 🟢 ≤2  🟡 3-4  🔴 ≥5',
    m1_role:'Rôle M1',
    active_assessments:'Évaluations actives',
    expired:'Expiré',
    retained:'Conservé',
    archives_retention:'Archives — politique de rétention',
    validation_date:'Date validation',
    retained_until:'Conservation jusqu\'au',
    rbs_title:'Surveillance basée sur le risque (Chap. 4 §4.2.1)',
    certification_date:'Date de certification / agrément',
    new_provider_rbs:'Nouveau prestataire (2 ans avant SBR)',
    rbs_deadline:'Date butoir SBR (auto-calculée si vide)',
    assessment_criteria:'Critères d\'évaluation',
    peers_assessed:'Pairs évalués',
    scores_distribution:'Distribution des notes (pairs)',
    the_bar:'La barre',
    represents_current_band:'représente la tranche du prestataire courant.',
    group_summary:'Synthèse de groupe',
    group_indicators:'Indicateurs du groupe',
    no_validated_eval_provider:'Aucune évaluation validée pour le prestataire sélectionné.',
    not_scored:'non noté',
    conformity_indicators_detail:'Conformité — Détail des indicateurs',
    performance_indicators_detail:'Performance — Détail des indicateurs',
    complexity_indicators_detail:'Complexité — Détail des indicateurs',
    period_start:'Période — Début',
    period_end:'Période — Fin',
    improvement_points:'POINTS À AMÉLIORER',
    selection_label:'Sélection :',
    click_bar_filter:'Cliquez une barre pour filtrer les graphiques par sous-activité',
    group_summary_peers:'Synthèse du groupe et comparaison aux pairs',
    perf_summary_peers:'Synthèse Performance et comparaison aux pairs',
},
  en: {
    chargement_impossible: "Could not load: {0}",
    aucun_minimum: "0 = no minimum required",
    televersement_en_cours: "Uploading…",
    reevaluation_privilege: "Re-assessment is reserved for Manager and Approver privileges covering this domain and sector.",
    reevaluation_en_cours: "A re-assessment is already under way for this provider.",
    confirmer_consolidation: "Start consolidation?\nThe indicator scores (Compliance, Performance, Complexity) become editable so they can be changed. Monitoring stops once the meeting is recorded.",
    reunion_enregistree_verrou: "Meeting recorded — indicators locked read-only",
    reunion_enregistree: "Meeting recorded",
    confirmer_soumettre_notes: "Submit your scores to the approver? They become visible and can no longer be changed.",
    confirmer_soumettre_evaluation: "Submit this assessment for approval?",
    confirmer_rejet_evaluation: "Rejecting this assessment stops the process. Confirm?",
    confirmer_renvoi_observations: "Send back for the comments to be addressed?",
    confirmer_cloture_reunion: "Close the provider meeting? This locks every tab read-only until final approval.",
    motif_reevaluation: "Reason for re-assessment",
    reevaluer_titre: "Re-assess",
    fin_de_cycle: "End of cycle",
    instance_changement_impossible: "Instance switch not possible",
    televersement_impossible: 'Upload failed',
    fichier_trop_volumineux_max: 'File too large (maximum {0} MB).',
    import_refuse: 'Import refused',
    import_format_excel: 'Server error ({0}). Check the Excel file format. The expected sheets are: Conformite, Performance, Complexite.',
    evaluation_verrouillee_import: 'Assessment locked: import is not possible after submission or validation.',
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
    sous_menu_replier:'Collapse the sub-menu', sous_menu_deplier:'Expand the sub-menu',
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
    close:'Close', ouvrir_menu:'Open the menu', deplier_replier:'Expand or collapse',
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
    sub_activity:'Sub-activity',
    no_file_selected:'No file selected',
    no_provider_in_scope:'No provider in the domains and sectors covered by your privileges.',
    loading_eligible:'Loading eligible assessors…',
    no_eligible_user:'No eligible user: no Contributor, Validator or Administrator privilege covers this domain and sector.',
    no_change_since_start:'No change since the start. Go to Conformity / Performance / Complexity to change the scores.',
    no_minutes:'No minutes entered',
    no_meeting:'No meeting recorded',
    no_score_change:'No score change recorded. Click the button to start a consolidation.',
    no_score_change_meeting:'No score change linked to this meeting.',
    no_inspector:'No inspector listed',
    no_validated_eval:'No validated assessment',
    no_peer_indicator:'No peer provider assessed on this indicator.',
    no_peer_group:'No peer provider assessed on this group.',
    no_indicator:'No indicator.',
    no_access:'No access',
    name_required:'Name required',
    eval_not_found:'Assessment not found',
    word_downloaded:'Word report downloaded',
    allow_popups_pdf:'Allow pop-ups to generate the PDF.',
    create_reserved:'Creation is reserved for Manager or Validator privileges.',
    select_provider_sector:'Select a provider and a sector',
    consolidation_on:'Consolidation enabled — you can change the scores',
    meeting_saved:'Meeting saved',
    minutes_not_found:'Minutes not found',
    provider_meeting_saved:'Provider meeting saved',
    not_designated:'You are not a designated assessor for this assessment.',
    scores_submitted:'Your scores have been submitted to the validator.',
    submitted_validation:'Submitted for validation',
    cycle_dates_reserved:'Only Validator or Manager privileges can change cycle dates.',
    new_revision:'New revision created as draft — the validated assessment remains available',
    delete_reserved:'Deletion is reserved for the Manager privilege covering this domain and sector.',
    file_too_large:'“{0}” is {1} MB: maximum {2} MB.',
    file_uploaded:'“{0}” uploaded',
    export_failed:'Export failed: {0}',
    submit_missing_scores:'Cannot submit: {0} Performance indicator(s) and {1} Complexity indicator(s) not scored.',
    submit_error:'Error while submitting: {0}',
    reason_required_for:'Reason required for {0}',
    dates_save_error:'Error while saving the dates: {0}',
    import_scores:'Import: {0} score(s) loaded',
    synthesis:'Summary',
    reevaluer_btn:'↻ Re-assess',
    agenda:'Agenda',
    no_previous_eval:'No previous assessment',
    trend_vs_previous:'Trend vs previous assessment',
    position_vs_peers:'Position compared with the other providers of the sector',
    detail_by_provider:'Detail by provider',
    summary_tab:'📊 Summary',
    risk_matrix_title:'Risk profile matrix',
    add_comment_btn:'💬 Add a comment',
    loading_meetings:'Loading meetings...',
    eval_returned_banner:'↩ Assessment sent back for the observations to be addressed',
    provider_meeting_tab:'Provider meeting',
    min_assessors:'Minimum number of assessors required',
    designated_assessors:'Designated assessors',
    perf_comp_hint:'(Performance &amp; Complexity)',
    scores_already_submitted:'✓ Scores already submitted',
    consolidation_active:'⚙ Consolidation under way — it will be attached to the next minutes saved',
    refresh_consolidation:'⚙ Update assessment — consolidation',
    linked_consolidation:'Linked consolidation',
    new_meeting_btn:'+ New meeting',
    ref_short:'Ref.',
    new_f:'New',
    close_meeting_btn:'🔒 Close',
    meeting_date:'Meeting date',
    participants_caa:'CAA participants (one per line)',
    participants_provider:'Provider participants (one per line)',
    exchanges_summary:'Summary of the discussion',
    signature_provider:'Provider signature (representative name)',
    signature_caa:'CAA signature (representative name)',
    close_btn:'Close',
    participants_one_per_line:'Participants (one per line)',
    back_arrow:'← Back',
    provider_name_label:'Provider name:',
    sector_label:'Sector:',
    meeting_date_label:'Meeting date:',
    eval_ref_label:'Assessment reference:',
    submit_my_scores:'Submit my scores to the validator (they will become visible)',
    synthesis_by_sa:'Synthesis by sub-activity',
    rejected_f:'Rejected',
    in_preparation:'In preparation',
    returned_for_observations:'↩ Sent back for the observations to be addressed',
    cycle_start_label:'Cycle start:',
    reassess_not_allowed:'Re-assessment not allowed',
    eval_rejected_stopped:'Assessment rejected — process stopped',
    no_assessor_yet:'No assessor designated: scoring is not open yet',
    eval_progress:'Assessment progress',
    details:'Details',
    view_indicators_scores:'View the indicators and scores',
    reserved_manager_validator:'Reserved for the Manager and Validator privileges covering this domain and sector.',
    inspectors_capacity:'Inspector capacity',
    inspectors_capacity_hint:'Workload of each inspector — number of assessments they are designated for. 🟢 ≤2  🟡 3-4  🔴 ≥5',
    m1_role:'M1 role',
    active_assessments:'Active assessments',
    expired:'Expired',
    retained:'Retained',
    archives_retention:'Archives — retention policy',
    validation_date:'Validation date',
    retained_until:'Retained until',
    rbs_title:'Risk-based surveillance (Chap. 4 §4.2.1)',
    certification_date:'Certification / approval date',
    new_provider_rbs:'New provider (2 years before RBS)',
    rbs_deadline:'RBS deadline (calculated when left empty)',
    assessment_criteria:'Assessment criteria',
    peers_assessed:'Peers assessed',
    scores_distribution:'Score distribution (peers)',
    the_bar:'The bar',
    represents_current_band:'shows the band of the current provider.',
    group_summary:'Group summary',
    group_indicators:'Group indicators',
    no_validated_eval_provider:'No validated assessment for the selected provider.',
    not_scored:'not scored',
    conformity_indicators_detail:'Conformity — indicator detail',
    performance_indicators_detail:'Performance — indicator detail',
    complexity_indicators_detail:'Complexity — indicator detail',
    period_start:'Period — start',
    period_end:'Period — end',
    improvement_points:'AREAS FOR IMPROVEMENT',
    selection_label:'Selection:',
    click_bar_filter:'Click a bar to filter the charts by sub-activity',
    group_summary_peers:'Group summary and comparison with peers',
    perf_summary_peers:'Performance summary and comparison with peers',
},
  pt: {
    chargement_impossible: "Impossível carregar: {0}",
    aucun_minimum: "0 = sem mínimo imposto",
    televersement_en_cours: "A carregar…",
    reevaluation_privilege: "A reavaliação está reservada aos privilégios de Gestor e Validador que cubram este domínio e setor.",
    reevaluation_en_cours: "Já está em curso uma reavaliação para este prestador.",
    confirmer_consolidation: "Iniciar a consolidação?\nAs notas dos indicadores (Conformidade, Desempenho, Complexidade) passam a ser editáveis para permitir alterações. O acompanhamento termina com o registo da reunião.",
    reunion_enregistree_verrou: "Reunião registada — indicadores bloqueados em leitura",
    reunion_enregistree: "Reunião registada",
    confirmer_soumettre_notes: "Submeter as suas notas ao validador? Passam a ser visíveis e deixam de poder ser alteradas.",
    confirmer_soumettre_evaluation: "Submeter esta avaliação a validação?",
    confirmer_rejet_evaluation: "Rejeitar esta avaliação interrompe o processo. Confirmar?",
    confirmer_renvoi_observations: "Devolver para consideração das observações?",
    confirmer_cloture_reunion: "Encerrar a reunião com o prestador? Isto bloqueia todos os separadores em leitura até à validação final.",
    motif_reevaluation: "Motivo da reavaliação",
    reevaluer_titre: "Reavaliar",
    fin_de_cycle: "Fim de ciclo",
    instance_changement_impossible: "Mudança de instância impossível",
    televersement_impossible: 'Carregamento impossível',
    fichier_trop_volumineux_max: 'Ficheiro demasiado grande (máximo {0} MB).',
    import_refuse: 'Importação recusada',
    import_format_excel: 'Erro do servidor ({0}). Verifique o formato do ficheiro Excel. Os separadores esperados são: Conformite, Performance, Complexite.',
    evaluation_verrouillee_import: 'Avaliação bloqueada: importação impossível após submissão ou validação.',
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
    sous_menu_replier:'Recolher o submenu', sous_menu_deplier:'Expandir o submenu',
    providers:'Prestadores', indices_cycles:'Índices e Limiares', indices_seuils:'Índices e Limiares', admin_aac:'Admin AAC',
    active_profiles:'Perfis Ativos', filters:'Filtros',
    coverage_rate:'Taxa de Cobertura', of_short:'de', evaluated_short:'avaliados',
    due_soon:'Prazos Proximos', due_soon_hint:'A avaliar em 3 meses',
    deadline_short:'Prazo', due_date_short:'Vencimento', scope_hint:'Perímetro coberto',
    validated_hint:'Perfis validados em vigor', high_risk:'Riscos Elevados',
    high_risk_hint:'Perfis de risco elevado', draft_hint:'Avaliações em curso',
    very_high_risk:'Riscos Muito Elevados', very_high_risk_hint:'Perfis de risco muito elevado',
    risk_low:'Baixo', risk_high:'Elevado',
    all_domains:'Todos os Domínios', all_sectors:'Todos os Setores',
    logout:'Sair', save:'Salvar', cancel:'Cancelar',
    close:'Fechar', ouvrir_menu:'Abrir o menu', deplier_replier:'Expandir ou recolher',
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
    address1:'Endereço 1', address2:'Endereço 2', admin_email:'Email do administrador',
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
    sub_activity:'Sub-atividade',
    no_file_selected:'Nenhum ficheiro selecionado',
    no_provider_in_scope:'Nenhum prestador nos domínios e setores cobertos pelos seus privilégios.',
    loading_eligible:'A carregar os avaliadores elegíveis…',
    no_eligible_user:'Nenhum utilizador elegível: nenhum privilégio de Contribuidor, Validador ou Administrador cobre este domínio e este setor.',
    no_change_since_start:'Nenhuma alteração desde o início. Vá a Conformidade / Desempenho / Complexidade para modificar as notas.',
    no_minutes:'Nenhuma ata registada',
    no_meeting:'Nenhuma reunião registada',
    no_score_change:'Nenhuma alteração de nota registada. Clique no botão para iniciar uma consolidação.',
    no_score_change_meeting:'Nenhuma alteração de nota associada a esta reunião.',
    no_inspector:'Nenhum inspetor recenseado',
    no_validated_eval:'Nenhuma avaliação validada',
    no_peer_indicator:'Nenhum prestador par avaliado neste indicador.',
    no_peer_group:'Nenhum prestador par avaliado neste grupo.',
    no_indicator:'Nenhum indicador.',
    no_access:'Sem acesso',
    name_required:'Nome obrigatório',
    eval_not_found:'Avaliação não encontrada',
    word_downloaded:'Relatório Word descarregado',
    allow_popups_pdf:'Autorize as janelas pop-up para gerar o PDF.',
    create_reserved:'Criação reservada aos privilégios Gestor ou Validador.',
    select_provider_sector:'Selecione um prestador e um setor',
    consolidation_on:'Consolidação ativada — pode modificar as notas',
    meeting_saved:'Reunião gravada',
    minutes_not_found:'Ata não encontrada',
    provider_meeting_saved:'Reunião do prestador gravada',
    not_designated:'Não é avaliador designado para esta avaliação.',
    scores_submitted:'As suas notas foram submetidas ao validador.',
    submitted_validation:'Submetido para validação',
    cycle_dates_reserved:'Só os privilégios Validador ou Gestor podem modificar as datas do ciclo.',
    new_revision:'Nova revisão criada em rascunho — a avaliação validada continua disponível',
    delete_reserved:'Eliminação reservada ao privilégio Gestor que cobre este domínio e este setor.',
    file_too_large:'« {0} » tem {1} MB: máximo {2} MB.',
    file_uploaded:'« {0} » carregado',
    export_failed:'Exportação impossível: {0}',
    submit_missing_scores:'Impossível submeter: {0} indicador(es) de Desempenho e {1} indicador(es) de Complexidade sem nota.',
    submit_error:'Erro na submissão: {0}',
    reason_required_for:'Motivo obrigatório para {0}',
    dates_save_error:'Erro ao gravar as datas: {0}',
    import_scores:'Importação: {0} nota(s) retomada(s)',
    synthesis:'Síntese',
    reevaluer_btn:'↻ Reavaliar',
    agenda:'Ordem do dia',
    no_previous_eval:'Sem avaliação anterior',
    trend_vs_previous:'Tendência face à avaliação anterior',
    position_vs_peers:'Situação face aos outros prestadores do setor',
    detail_by_provider:'Detalhe por prestador',
    summary_tab:'📊 Síntese',
    risk_matrix_title:'Matriz dos perfis de risco',
    add_comment_btn:'💬 Adicionar um comentário',
    loading_meetings:'A carregar as reuniões...',
    eval_returned_banner:'↩ Avaliação devolvida para consideração das observações',
    provider_meeting_tab:'Reunião do prestador',
    min_assessors:'Número mínimo de avaliadores exigido',
    designated_assessors:'Avaliadores designados',
    perf_comp_hint:'(Desempenho &amp; Complexidade)',
    scores_already_submitted:'✓ Notas já submetidas',
    consolidation_active:'⚙ Consolidação ativa — será anexada à próxima ata gravada',
    refresh_consolidation:'⚙ Atualizar avaliação — consolidação',
    linked_consolidation:'Consolidação associada',
    new_meeting_btn:'+ Nova reunião',
    ref_short:'Ref.',
    new_f:'Nova',
    close_meeting_btn:'🔒 Encerrar',
    meeting_date:'Data da reunião',
    participants_caa:'Participantes da AAC (um por linha)',
    participants_provider:'Participantes do prestador (um por linha)',
    exchanges_summary:'Resumo das trocas',
    signature_provider:'Assinatura do prestador (nome do representante)',
    signature_caa:'Assinatura da AAC (nome do representante)',
    close_btn:'Fechar',
    participants_one_per_line:'Participantes (um por linha)',
    back_arrow:'← Voltar',
    provider_name_label:'Nome do prestador:',
    sector_label:'Setor:',
    meeting_date_label:'Data da reunião:',
    eval_ref_label:'Referência da avaliação:',
    submit_my_scores:'Submeter as minhas notas ao validador (ficarão visíveis)',
    synthesis_by_sa:'Síntese por subatividade',
    rejected_f:'Rejeitada',
    in_preparation:'Em preparação',
    returned_for_observations:'↩ Devolvida para consideração das observações',
    cycle_start_label:'Início do ciclo:',
    reassess_not_allowed:'Reavaliação não autorizada',
    eval_rejected_stopped:'Avaliação rejeitada — circuito interrompido',
    no_assessor_yet:'Nenhum avaliador designado: a notação ainda não está aberta',
    eval_progress:'Progresso da avaliação',
    details:'Detalhes',
    view_indicators_scores:'Consultar os indicadores e notas',
    reserved_manager_validator:'Reservado aos privilégios Gestor e Validador que cobrem este domínio e este setor.',
    inspectors_capacity:'Capacidade dos inspetores',
    inspectors_capacity_hint:'Carga de cada inspetor — número de avaliações em que está designado. 🟢 ≤2  🟡 3-4  🔴 ≥5',
    m1_role:'Papel M1',
    active_assessments:'Avaliações ativas',
    expired:'Expirado',
    retained:'Conservado',
    archives_retention:'Arquivos — política de retenção',
    validation_date:'Data de validação',
    retained_until:'Conservado até',
    rbs_title:'Vigilância baseada no risco (Cap. 4 §4.2.1)',
    certification_date:'Data de certificação / aprovação',
    new_provider_rbs:'Novo prestador (2 anos antes da VBR)',
    rbs_deadline:'Data limite VBR (calculada se vazia)',
    assessment_criteria:'Critérios de avaliação',
    peers_assessed:'Pares avaliados',
    scores_distribution:'Distribuição das notas (pares)',
    the_bar:'A barra',
    represents_current_band:'representa o escalão do prestador atual.',
    group_summary:'Síntese do grupo',
    group_indicators:'Indicadores do grupo',
    no_validated_eval_provider:'Nenhuma avaliação validada para o prestador selecionado.',
    not_scored:'sem nota',
    conformity_indicators_detail:'Conformidade — detalhe dos indicadores',
    performance_indicators_detail:'Desempenho — detalhe dos indicadores',
    complexity_indicators_detail:'Complexidade — detalhe dos indicadores',
    period_start:'Período — início',
    period_end:'Período — fim',
    improvement_points:'PONTOS A MELHORAR',
    selection_label:'Seleção:',
    click_bar_filter:'Clique numa barra para filtrar os gráficos por subatividade',
    group_summary_peers:'Síntese do grupo e comparação com os pares',
    perf_summary_peers:'Síntese de desempenho e comparação com os pares',
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
