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
    currentConstSub: 'list',
    sidebarCollapsed: localStorage.getItem('exec_sidebar') === 'true',
    data: {},
    filters: {
        domaine: '', secteur: '', prestataire: '', statut: '', search: '', annee: String(new Date().getFullYear()), trimestre: '', criticite: '',
        type_supervision: '', mode_supervision: ''
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
//  TRANSLATIONS
// ══════════════════════════════════════

const EXEC_TR = {
    fr: {
        module_title: 'Exécution de la Surveillance et Suivi',
        module_subtitle: 'Gestion de l\'execution des activites de surveillance',
        dashboard: 'Tableau de Bord',
        plan_surveillance: 'Activites de Supervision',
        etats: 'Etats',
        declenchement: 'Declenchement',
        execution: 'Execution',
        prestataires: 'Dossiers',
        tab_plan_surveillance: 'Plan de Surveillance',
        tab_liste_activites: 'Liste des Activites',
        processus: 'Processus',
        details: 'Details',
        responsable: 'Responsable',
        constatations: 'Constatations',
        consta_sub_list: 'Constatations',
        consta_sub_suivi: 'Suivi',
        rapports: 'Rapports',
        parametres: 'Paramètres',
        mes_taches: 'Mes Tâches',
        mes_taches_activites: 'Mes activités à réaliser',
        mes_taches_notifications: 'Mes notifications applicables',
        mes_taches_constatations: 'Mes constatations à suivre',
        aucune_tache: 'Aucune tâche en attente',
        niveau_constatations: 'Niveau de constatations',
        types_cas: 'Types de cas',
        item: 'Item',
        niveau: 'Niveau',
        delai_cloture: 'Délai de clôture',
        delai_cloture_jours: 'Délai de clôture (jours)',
        ordre: 'Ordre',
        // KPI labels
        activites_realisees: 'Activités réalisées (YTD)',
        constatations_ouvertes: 'Constatations ouvertes',
        risques_critiques: 'Risques critiques',
        dossiers_ouverts: 'Dossiers ouverts',
        notifications_envoyees: 'Notifications envoyées',
        rapports_transmis: 'Rapports transmis',
        // Notification statuses
        brouillon: 'Brouillon',
        soumis: 'Soumis',
        valide: 'Valide',
        rejete: 'Rejete',
        envoye: 'Envoye',
        acte: 'Acte',
        // FNC statuses
        direct_brouillon: 'Brouillon', direct_soumis: 'Soumis', direct_valide: 'Validé', direct_rejete: 'Rejeté', direct_renvoye: 'Renvoyé',
        ouverte: 'Ouvert', ouvert: 'Ouvert',
        pac_soumis: 'PAC Soumis',
        pac_valide: 'PAC Valide',
        pac_rejetee: 'PAC Rejete',
        soldee: 'Soldee',
        // Dossier statuses
        cloture: 'Cloture',
        en_cours: 'En Cours',
        // Tabs
        a_notifier: 'A Notifier',
        brouillons: 'Brouillons',
        soumis_tab: 'Soumis (Interne)',
        envoyes_echanges: 'Notification',
        // Form labels - Notification
        section_a_prestataire: 'Prestataire',
        section_b_administration: 'Administration de l\'Aviation',
        section_c1_activite: 'Activite',
        section_c2_programme: 'Programme de Travail',
        section_d_referentiels: 'Referentiels',
        section_e_documents: 'Documents Requis',
        section_f_signature: 'Signature',
        designation: 'Designation',
        fonction_responsable: 'Fonction du 1er Responsable',
        nom_responsable: 'Nom du 1er Responsable',
        dirigeant: 'Dirigeant',
        interlocuteur: 'Interlocuteur Principal (Fonction)',
        interlocuteur_nom: 'Interlocuteur Principal (Nom)',
        interlocuteur_email: 'Interlocuteur Principal (Email)',
        section_b_equipe_audit: 'Equipe d\'audit/inspection',
        equipe: 'Equipe',
        nature_activite: 'Nature de l\'Activite',
        reference: 'Reference',
        date_activite: 'Date',
        lieu: 'Lieu',
        objet: 'Objet',
        perimetre: 'Perimetre',
        date: 'Date',
        horaire: 'Horaire',
        actions_prevues: 'Actions Prevues',
        correspondant: 'Correspondant',
        referentiels: 'Referentiels',
        documents_requis: 'Documents Requis',
        fait_a: 'Fait a',
        date_signature: 'Date',
        signataire: 'Signataire',
        // Form labels - Constatation/FNC
        emis_par: 'Emis Par',
        adresse_a: 'Adresse a',
        ref_reglementaires: 'Ref. Reglementaires',
        date_ouverture: 'Date d\'Ouverture',
        source: 'Source',
        source_audit: 'Audit',
        source_inspection: 'Inspection',
        source_autre: 'Autre',
        domaine: 'Domaine',
        criticite: 'Criticite',
        critique: 'Critique',
        majeur: 'Majeur',
        mineur: 'Mineur',
        cas: 'Cas',
        description_constatation: 'Description de la Constatation',
        delai_solde: 'Delai de Solde (jours)',
        date_due: 'Date Due',
        recommandation: 'Recommandation',
        preuves: 'Preuves',
        // PAC
        cause_primaire: 'Cause Primaire',
        action_curative: 'Action Curative',
        actions_correctives: 'Actions Correctives',
        commentaires_anac: 'Commentaires ANAC',
        evaluation_pac: 'Evaluation du PAC',
        commentaires_suivi: 'Commentaires de suivi',
        acceptable: 'Acceptable',
        non_acceptable: 'Non acceptable',
        date_prevue: 'Date prevue de mise en oeuvre',
        preuves_action: 'Preuves',
        ajouter_commentaire: 'Ajouter',
        eval_cause_primaire: 'Cause primaire',
        eval_action_curative: 'Action curative',
        eval_action_corrective: 'Action corrective',
        validation_pac: 'Validation PAC',
        signature_pac: 'Signature',
        solde_fnc: 'Solder la FNC',
        // Nouveau PAC layout
        rappel_constatation: 'Rappel de la Constatation',
        plan_actions_correctives: 'Plan d\'Actions Correctives',
        evaluation_suivi_aac: 'Évaluation et Suivi (Réservé à l\'AAC)',
        details_suivi: 'Détails du suivi',
        details_suivi_intro: 'Items, réponses du postulant et échanges entre l\'AAC et le postulant.',
        item_label: 'Item',
        reponse_label: 'Réponse du postulant',
        commentaires_label: 'Commentaires',
        cause_root: 'Cause Primaire (Root cause)',
        action_curative_correction: 'Action Curative (Correction immédiate)',
        action_corrective_prevention: 'Action Corrective (Prévention de la récurrence)',
        acceptation_propositions: 'Acceptation des propositions d\'actions',
        pac_accepte: 'Le PAC est-il accepté ?',
        date_acceptation: 'Date d\'acceptation',
        verification_mise_oeuvre: 'Vérification de la mise en oeuvre',
        isolement_realise: 'Isolement / Information réalisé ?',
        risques_traites: 'Traitement des Risques identifiés ?',
        commentaire_efficacite: 'Commentaire sur la mise en oeuvre et l\'efficacité',
        preuves_mise_oeuvre: 'Preuves de mise en oeuvre fournies par l\'exploitant',
        cloture_fnc: 'Clôture de la Fiche de Non-Conformité',
        mise_oeuvre_effective: 'Mise en oeuvre Effective ?',
        date_solde: 'Date de Solde',
        solde_par: 'Soldé par (Inspecteur)',
        oui_label: 'OUI',
        non_label: 'NON',
        partie_pac: 'Partie réservée au PAC',
        sauver_brouillon: 'Brouillon',
        renvoyer_postulant: 'Renvoyer au postulant',
        solder_constatation: 'Solder la Constatation',
        ajouter_un_commentaire: 'Ajouter un commentaire...',
        aucun_commentaire: 'Aucun commentaire pour cet item',
        pac_renvoye_titre: 'PAC renvoyé au postulant',
        pac_soumis_titre: 'PAC soumis pour validation',
        motif: 'Motif',
        pac_renvoye_motif: 'Motif',
        aucune_modification: 'Aucune modification',
        constatation_soldee: 'Constatation soldée',
        cloturee_dans_delais: 'Clôturée dans les délais',
        hors_delais: 'Hors délais',
        confirm_renvoyer: 'Confirmer le renvoi du PAC au postulant ? Les champs du PAC seront réactivés.',
        confirm_solder: 'Confirmer la clôture de la constatation ? Tous les champs seront verrouillés.',
        motif_renvoi: 'Motif du renvoi (visible par le postulant)',
        brouillon_enregistre: 'Brouillon enregistré',
        fiche_constat: 'Fiche Constat',
        fiche_suivi: 'Fiche Suivi',
        rapport_valide_readonly: 'Rapport validé — modification bloquée',
        delai_label: 'Délai de solde',
        ref_label: 'Référence',
        domaine_label: 'Domaine',
        criticite_label: 'Criticité',
        date_due_label: 'Due Date',
        ref_reglementaires_label: 'Référentiel(s) réglementaire(s)',
        item_cause: 'Cause Primaire',
        item_action_curative: 'Action Curative',
        item_date_curative: 'Date prévue (Curative)',
        item_preuves_curative: 'Preuves (Curative)',
        item_action_corrective: 'Action Corrective',
        item_date_corrective: 'Date prévue (Corrective)',
        item_preuves_corrective: 'Preuves (Corrective)',
        // Rapports
        ref_rapport: 'Ref. Rapport',
        titre_rapport: 'Titre',
        introduction: 'Introduction',
        synthese: 'Synthese',
        conclusion: 'Conclusion',
        recommandations: 'Recommandations',
        annexes: 'Annexes',
        signer_inspecteur: 'Signer (Inspecteur)',
        signer_directeur: 'Signer (Directeur)',
        transmettre: 'Transmettre',
        date_emission: 'Date d\'Emission',
        date_transmission: 'Date T.',
        statut_validation: 'Statut',
        statut: 'Statut',
        // Buttons
        sauvegarder_brouillon: 'Sauvegarder Brouillon',
        apercu_fiche: 'Apercu Fiche Officielle',
        retour_formulaire: 'Retour au Formulaire',
        soumettre_validation: 'Soumettre à la Validation',
        repondre: 'Repondre',
        valider_accord: 'Valider l\'Accord',
        declencher: 'Declencher',
        continuer_edition: 'Continuer l\'Edition',
        confirm_submit: 'Soumettre cette notification pour validation ?',
        notification_submitted: 'Notification soumise avec succes',
        apercu: 'Apercu',
        gerer_echange: 'Echanges',
        ouvrir_dossier: 'Dossier',
        creer_fnc: 'Creer Constatation',
        suivi_pac: 'Suivi PAC',
        contacts: 'Contacts',
        renseigner: 'Renseigner l\'Activite',
        generer_rapport: 'Generer Rapport',
        valider: 'Valider',
        rejeter: 'Rejeter',
        envoyer: 'Envoyer',
        // Common
        search: 'Rechercher...',
        all_domains: 'Tous les domaines',
        all_sectors: 'Tous les secteurs',
        all_providers: 'Tous les prestataires',
        all_statuses: 'Tous les statuts',
        all_years: 'Toutes les annees',
        all_types_supervision: 'Tous les types',
        all_modes_supervision: 'Tous les modes',
        planifie: 'Planifiée',
        notifie: 'Notifiée',
        declenche: 'Déclenchée',
        status: 'Statut',
        actions: 'Actions',
        type: 'Type',
        sector: 'Secteur',
        provider: 'Prestataire',
        year: 'Annee',
        save: 'Enregistrer',
        cancel: 'Annuler',
        back: 'Retour',
        close: 'Fermer',
        edit: 'Modifier',
        delete: 'Supprimer',
        no_data: 'Aucune donnee',
        sync_plans: 'Synchroniser Plans',
        sync_plans_ok: 'Plans synchronises avec succes',
        sync_plans_error: 'Erreur de synchronisation des plans',
        sync_partial_excluded: 'Synchronisation partielle : certaines activites deja declenchees ont ete exclues.',
        sync_excluded_title: 'Activites exclues de la synchronisation',
        sync_excluded_intro: 'Les activites suivantes sont deja declenchees et ne sont donc pas resynchronisees depuis les plans amendes :',
        lecture_seule: 'lecture seule',
        reserve_aac: "Reserve a l'AAC",
        apercu: 'Apercu',
        notifs_en_attente_dossier: 'Notifications envoyees (en attente de dossier)',
        loading: 'Chargement...',
        confirm: 'Confirmer',
        confirm_delete: 'Etes-vous sur de vouloir supprimer ?',
        select_option: '-- Selectionner --',
        logout: 'Deconnexion',
        reset_filters: 'Reinitialiser les filtres',
        export_pdf: 'Export PDF',
        download_pdf: 'Telecharger PDF',
        telecharger: 'Telecharger',
        rapports_closed_intro: 'Rapports clôturés accessibles au téléchargement.',
        prestataire_home_title: 'Espace Prestataire',
        prestataire_home_intro: 'Consultez vos notifications pour traiter vos plans d\'actions correctives.',
        mes_activites: 'Mes Activités',
        mes_utilisateurs: 'Mes Utilisateurs',
        notification_activite: "Notification d'activité",
        all_criticalities: 'Toutes les criticités',
        date_debut: 'Date Debut',
        date_fin: 'Date Fin',
        delai_restant: 'Delai Restant',
        jours: 'jours',
        plan: 'Plan',
        activites: 'Activites',
        nb_activites: 'Nb Activites',
        nb_prestataires: 'Nb Prestataires',
        prochaines_activites: 'Prochaines Activites',
        alertes: 'Alertes & Echeances',
        heatmap: 'Carte de Chaleur',
        taux_cloture_activites: 'Taux de clôture activités',
        taux_cloture_constatations: 'Taux de clôture constatations',
        trimestre: 'Trimestre',
        all_trimestres: 'Tous les trimestres',
        activites_planifiees: 'Activites Planifiees',
        activites_non_declenchees: 'Non Declenchees',
        activites_en_cours: 'En Cours',
        activites_cloturees: 'Cloturees',
        taux_execution: 'Taux Execution',
        nb_constatations: 'Constatations',
        taux_cloture_const: 'Taux Clot. Const.',
        total: 'Total',
        points_forts: 'Points Forts',
        points_faibles: 'Points Faibles',
        checklists: 'Checklists',
        ajouter_programme: 'Ajouter Ligne',
        ajouter_membre: 'Ajouter Membre',
        supprimer_ligne: 'Supprimer',
        dossier: 'Dossier',
        rappel_fnc: 'Description de la constatation',
        synthese_recommandations: 'Syntheses et Recommandations',
        opportunites_amelioration: 'Opportunites d\'amelioration',
        resume_global: 'Resume global des constatations',
        modifier_fnc: 'Modifier',
        pac_exploitant: 'PAC de l\'Exploitant',
        evaluation_anac: 'Evaluation ANAC',
        risque: 'Risque',
        dernier_audit: 'Dernier Audit',
        localisation: 'Localisation',
        historique: 'Historique',
        discussions: 'Discussions',
        transmis: 'Transmis',
        upload_zone: 'Glissez vos fichiers ici ou cliquez pour selectionner',
        aucun_fichier: 'Aucun fichier',
        gravite: 'Criticite',
        echeance: 'Echeance',
        statut_pac: 'Statut',
        supprimer_activite: 'Supprimer',
        confirm_delete_activite: 'Supprimer cette activite ? Les constatations et rapports associes seront egalement supprimes.',
        confirm_delete_constatation: 'Supprimer cette constatation ?',
        confirm_delete_rapport: 'Supprimer ce rapport ?',
        envoyer_prestataire: 'Envoyer',
        ref_consta: 'Ref. CONSTA'
    },
    en: {
        module_title: 'Surveillance Execution',
        module_subtitle: 'Surveillance activity execution management',
        dashboard: 'Dashboard',
        plan_surveillance: 'Supervision Activities',
        etats: 'Status',
        declenchement: 'Triggering',
        execution: 'Execution',
        prestataires: 'Files',
        tab_plan_surveillance: 'Surveillance Plans',
        tab_liste_activites: 'Activities List',
        processus: 'Process',
        details: 'Details',
        responsable: 'Responsible',
        constatations: 'Findings & Follow-up',
        consta_sub_list: 'Findings',
        consta_sub_suivi: 'Follow-up',
        rapports: 'Reports',
        parametres: 'Settings',
        mes_taches: 'My Tasks',
        mes_taches_activites: 'My activities to perform',
        mes_taches_notifications: 'My applicable notifications',
        mes_taches_constatations: 'My findings to follow up',
        aucune_tache: 'No pending task',
        niveau_constatations: 'Finding level',
        types_cas: 'Case types',
        item: 'Item',
        niveau: 'Level',
        delai_cloture: 'Closure deadline',
        delai_cloture_jours: 'Closure deadline (days)',
        ordre: 'Order',
        activites_realisees: 'Activities completed (YTD)',
        constatations_ouvertes: 'Open findings',
        risques_critiques: 'Critical risks',
        dossiers_ouverts: 'Open Dossiers',
        notifications_envoyees: 'Notifications Sent',
        rapports_transmis: 'Reports transmitted',
        brouillon: 'Draft',
        soumis: 'Submitted',
        valide: 'Validated',
        rejete: 'Rejected',
        envoye: 'Sent',
        acte: 'Acknowledged',
        direct_brouillon: 'Draft', direct_soumis: 'Submitted', direct_valide: 'Validated', direct_rejete: 'Rejected', direct_renvoye: 'Returned',
        ouverte: 'Open', ouvert: 'Open',
        pac_soumis: 'CAP Submitted',
        pac_valide: 'CAP Validated',
        pac_rejetee: 'CAP Rejected',
        soldee: 'Closed',
        cloture: 'Closed',
        en_cours: 'In Progress',
        a_notifier: 'To Notify',
        brouillons: 'Drafts',
        soumis_tab: 'Submitted (Internal)',
        envoyes_echanges: 'Notification',
        section_a_prestataire: 'Provider',
        section_b_equipe_audit: 'Audit/Inspection Team',
        section_b_administration: 'Aviation Administration',
        section_c1_activite: 'Activity',
        section_c2_programme: 'Work Program',
        section_d_referentiels: 'References',
        section_e_documents: 'Required Documents',
        section_f_signature: 'Signature',
        designation: 'Designation',
        fonction_responsable: 'Responsible Function',
        dirigeant: 'Director',
        interlocuteur: 'Contact Person',
        equipe: 'Team',
        nature_activite: 'Activity Nature',
        reference: 'Reference',
        date_activite: 'Date',
        lieu: 'Location',
        objet: 'Subject',
        perimetre: 'Scope',
        date: 'Date',
        horaire: 'Schedule',
        actions_prevues: 'Planned Actions',
        correspondant: 'Contact',
        referentiels: 'References',
        documents_requis: 'Required Documents',
        fait_a: 'Made at',
        date_signature: 'Date',
        signataire: 'Signatory',
        emis_par: 'Issued By',
        adresse_a: 'Addressed To',
        ref_reglementaires: 'Regulatory Ref.',
        date_ouverture: 'Opening Date',
        source: 'Source',
        source_audit: 'Audit',
        source_inspection: 'Inspection',
        source_autre: 'Other',
        domaine: 'Domain',
        criticite: 'Criticality',
        critique: 'Critical',
        majeur: 'Major',
        mineur: 'Minor',
        cas: 'Case',
        description_constatation: 'Finding Description',
        delai_solde: 'Settlement Deadline',
        date_due: 'Due Date',
        recommandation: 'Recommendation',
        preuves: 'Evidence',
        cause_primaire: 'Root Cause',
        action_curative: 'Curative Action',
        actions_correctives: 'Corrective Actions',
        commentaires_anac: 'ANAC Comments',
        validation_pac: 'CAP Validation',
        signature_pac: 'Signature',
        solde_fnc: 'Close Finding',
        // New PAC layout
        rappel_constatation: 'Finding Recap',
        plan_actions_correctives: 'Corrective Action Plan',
        evaluation_suivi_aac: 'Evaluation and Follow-up (CAA only)',
        details_suivi: 'Follow-up Details',
        details_suivi_intro: 'Items, applicant responses, and exchanges between the CAA and the applicant.',
        item_label: 'Item',
        reponse_label: 'Applicant response',
        commentaires_label: 'Comments',
        cause_root: 'Root Cause',
        action_curative_correction: 'Curative Action (Immediate correction)',
        action_corrective_prevention: 'Corrective Action (Recurrence prevention)',
        acceptation_propositions: 'Acceptance of proposed actions',
        pac_accepte: 'Is the CAP accepted?',
        date_acceptation: 'Acceptance date',
        verification_mise_oeuvre: 'Implementation verification',
        isolement_realise: 'Isolation / Information completed?',
        risques_traites: 'Identified risks treated?',
        commentaire_efficacite: 'Comments on implementation and effectiveness',
        preuves_mise_oeuvre: 'Implementation evidence provided by the operator',
        cloture_fnc: 'Finding closure',
        mise_oeuvre_effective: 'Effective implementation?',
        date_solde: 'Closure date',
        solde_par: 'Closed by (Inspector)',
        oui_label: 'YES',
        non_label: 'NO',
        partie_pac: 'CAP section',
        sauver_brouillon: 'Draft',
        renvoyer_postulant: 'Return to applicant',
        solder_constatation: 'Close finding',
        ajouter_un_commentaire: 'Add a comment...',
        aucun_commentaire: 'No comments for this item',
        pac_renvoye_titre: 'CAP returned to applicant',
        pac_soumis_titre: 'CAP submitted for validation',
        motif: 'Reason',
        pac_renvoye_motif: 'Reason',
        aucune_modification: 'No changes',
        constatation_soldee: 'Finding closed',
        cloturee_dans_delais: 'Closed on time',
        hors_delais: 'Overdue',
        confirm_renvoyer: 'Confirm returning the CAP to the applicant? CAP fields will be reactivated.',
        confirm_solder: 'Confirm closing the finding? All fields will be locked.',
        motif_renvoi: 'Reason for return (visible to applicant)',
        brouillon_enregistre: 'Draft saved',
        fiche_constat: 'Finding Sheet',
        fiche_suivi: 'Follow-up Sheet',
        rapport_valide_readonly: 'Report validated — editing locked',
        delai_label: 'Closure deadline',
        ref_label: 'Reference',
        domaine_label: 'Domain',
        criticite_label: 'Criticality',
        date_due_label: 'Due Date',
        ref_reglementaires_label: 'Regulatory reference(s)',
        item_cause: 'Root Cause',
        item_action_curative: 'Curative Action',
        item_date_curative: 'Planned date (Curative)',
        item_preuves_curative: 'Evidence (Curative)',
        item_action_corrective: 'Corrective Action',
        item_date_corrective: 'Planned date (Corrective)',
        item_preuves_corrective: 'Evidence (Corrective)',
        ref_rapport: 'Report Ref.',
        titre_rapport: 'Title',
        introduction: 'Introduction',
        synthese: 'Summary',
        conclusion: 'Conclusion',
        recommandations: 'Recommendations',
        annexes: 'Annexes',
        signer_inspecteur: 'Sign (Inspector)',
        signer_directeur: 'Sign (Director)',
        transmettre: 'Transmit',
        date_emission: 'Issue Date',
        date_transmission: 'Transmission Date',
        statut_validation: 'Status',
        statut: 'Status',
        sauvegarder_brouillon: 'Save Draft',
        apercu_fiche: 'Official Form Preview',
        retour_formulaire: 'Back to Form',
        soumettre_validation: 'Submit for Validation',
        repondre: 'Reply',
        valider_accord: 'Validate Agreement',
        declencher: 'Trigger',
        continuer_edition: 'Continue Editing',
        apercu: 'Preview',
        gerer_echange: 'Exchanges',
        ouvrir_dossier: 'Dossier',
        creer_fnc: 'Create Finding',
        suivi_pac: 'CAP Follow-up',
        contacts: 'Contacts',
        renseigner: 'Fill Activity',
        generer_rapport: 'Generate Report',
        valider: 'Validate',
        rejeter: 'Reject',
        envoyer: 'Send',
        search: 'Search...',
        all_domains: 'All domains',
        all_sectors: 'All sectors',
        all_providers: 'All providers',
        all_statuses: 'All statuses',
        all_types_supervision: 'All types',
        all_modes_supervision: 'All modes',
        planifie: 'Planned',
        notifie: 'Notified',
        declenche: 'Triggered',
        all_years: 'All years',
        status: 'Status',
        actions: 'Actions',
        type: 'Type',
        sector: 'Sector',
        provider: 'Provider',
        year: 'Year',
        save: 'Save',
        cancel: 'Cancel',
        back: 'Back',
        close: 'Close',
        edit: 'Edit',
        delete: 'Delete',
        no_data: 'No data',
        sync_plans: 'Sync Plans',
        sync_plans_ok: 'Plans synchronized successfully',
        sync_plans_error: 'Plan synchronization error',
        sync_partial_excluded: 'Partial sync: some already-triggered activities were excluded.',
        sync_excluded_title: 'Activities excluded from sync',
        sync_excluded_intro: 'The following activities have already been triggered and will not be re-synced from the amended plans:',
        lecture_seule: 'read only',
        reserve_aac: 'Restricted to CAA',
        apercu: 'Preview',
        notifs_en_attente_dossier: 'Sent notifications (awaiting dossier)',
        loading: 'Loading...',
        confirm: 'Confirm',
        confirm_delete: 'Are you sure you want to delete?',
        select_option: '-- Select --',
        logout: 'Logout',
        reset_filters: 'Reset filters',
        export_pdf: 'Export PDF',
        download_pdf: 'Download PDF',
        telecharger: 'Download',
        rapports_closed_intro: 'Closed reports available for download.',
        prestataire_home_title: 'Provider workspace',
        prestataire_home_intro: 'Check your notifications to handle your corrective action plans.',
        mes_activites: 'My Activities',
        mes_utilisateurs: 'My Users',
        notification_activite: 'Activity notification',
        all_criticalities: 'All criticalities',
        date_debut: 'Start Date',
        date_fin: 'End Date',
        delai_restant: 'Remaining Time',
        jours: 'days',
        plan: 'Plan',
        activites: 'Activities',
        nb_activites: 'Activities Count',
        nb_prestataires: 'Providers Count',
        prochaines_activites: 'Upcoming Activities',
        alertes: 'Alerts & Deadlines',
        heatmap: 'Heat Map',
        taux_cloture_activites: 'Activity closure rate',
        taux_cloture_constatations: 'Findings closure rate',
        trimestre: 'Quarter',
        all_trimestres: 'All quarters',
        activites_planifiees: 'Planned Activities',
        activites_non_declenchees: 'Not Triggered',
        activites_en_cours: 'In Progress',
        activites_cloturees: 'Closed',
        taux_execution: 'Execution Rate',
        nb_constatations: 'Findings',
        taux_cloture_const: 'Findings Close Rate',
        total: 'Total',
        points_forts: 'Strengths',
        points_faibles: 'Weaknesses',
        checklists: 'Checklists',
        ajouter_programme: 'Add Line',
        supprimer_ligne: 'Remove',
        dossier: 'Dossier',
        rappel_fnc: 'Finding Reminder',
        pac_exploitant: 'Operator CAP',
        evaluation_anac: 'ANAC Evaluation',
        risque: 'Risk',
        dernier_audit: 'Last Audit',
        localisation: 'Location',
        historique: 'History',
        discussions: 'Discussions',
        transmis: 'Transmitted',
        upload_zone: 'Drag files here or click to select',
        aucun_fichier: 'No file',
        gravite: 'Criticality',
        echeance: 'Deadline',
        statut_pac: 'Status',
        supprimer_activite: 'Delete',
        confirm_delete_activite: 'Delete this activity? Associated findings and reports will also be deleted.',
        confirm_delete_constatation: 'Delete this finding?',
        confirm_delete_rapport: 'Delete this report?',
        envoyer_prestataire: 'Send',
        ref_consta: 'Ref. FIND'
    },
    pt: {
        module_title: 'Execucao da Vigilancia',
        module_subtitle: 'Gestao da execucao das atividades de vigilancia',
        dashboard: 'Painel',
        plan_surveillance: 'Atividades de Supervisao',
        etats: 'Estados',
        declenchement: 'Acionamento',
        execution: 'Execucao',
        prestataires: 'Dossiês',
        tab_plan_surveillance: 'Planos de Vigilancia',
        tab_liste_activites: 'Lista de Atividades',
        processus: 'Processo',
        details: 'Detalhes',
        responsable: 'Responsavel',
        constatations: 'Constatações e Acompanhamento',
        consta_sub_list: 'Constatações',
        consta_sub_suivi: 'Acompanhamento',
        rapports: 'Relatorios',
        parametres: 'Parâmetros',
        mes_taches: 'Minhas Tarefas',
        mes_taches_activites: 'Minhas atividades a realizar',
        mes_taches_notifications: 'Minhas notificações aplicáveis',
        mes_taches_constatations: 'Minhas constatações a acompanhar',
        aucune_tache: 'Nenhuma tarefa pendente',
        niveau_constatations: 'Nível de constatações',
        types_cas: 'Tipos de caso',
        item: 'Item',
        niveau: 'Nível',
        delai_cloture: 'Prazo de encerramento',
        delai_cloture_jours: 'Prazo de encerramento (dias)',
        ordre: 'Ordem',
        activites_realisees: 'Atividades realizadas (YTD)',
        constatations_ouvertes: 'Constatações abertas',
        risques_critiques: 'Riscos críticos',
        dossiers_ouverts: 'Dosses Abertos',
        notifications_envoyees: 'Notificacoes Enviadas',
        rapports_transmis: 'Relatórios transmitidos',
        brouillon: 'Rascunho',
        soumis: 'Submetido',
        valide: 'Validado',
        rejete: 'Rejeitado',
        envoye: 'Enviado',
        acte: 'Confirmado',
        direct_brouillon: 'Rascunho', direct_soumis: 'Submetido', direct_valide: 'Validado', direct_rejete: 'Rejeitado', direct_renvoye: 'Devolvido',
        ouverte: 'Aberto', ouvert: 'Aberto',
        pac_soumis: 'PAC Submetido',
        pac_valide: 'PAC Validado',
        pac_rejetee: 'PAC Rejeitado',
        soldee: 'Encerrada',
        cloture: 'Encerrado',
        en_cours: 'Em Andamento',
        a_notifier: 'A Notificar',
        brouillons: 'Rascunhos',
        soumis_tab: 'Submetidos (Interno)',
        envoyes_echanges: 'Notificação',
        section_a_prestataire: 'Prestador',
        section_b_equipe_audit: 'Equipa de Auditoria/Inspecao',
        section_b_administration: 'Administracao da Aviacao',
        section_c1_activite: 'Atividade',
        section_c2_programme: 'Programa de Trabalho',
        section_d_referentiels: 'Referenciais',
        section_e_documents: 'Documentos Exigidos',
        section_f_signature: 'Assinatura',
        designation: 'Designacao',
        fonction_responsable: 'Funcao do Responsavel',
        dirigeant: 'Dirigente',
        interlocuteur: 'Interlocutor',
        equipe: 'Equipa',
        nature_activite: 'Natureza da Atividade',
        reference: 'Referencia',
        date_activite: 'Data',
        lieu: 'Local',
        objet: 'Objeto',
        perimetre: 'Perimetro',
        date: 'Data',
        horaire: 'Horario',
        actions_prevues: 'Acoes Previstas',
        correspondant: 'Correspondente',
        referentiels: 'Referenciais',
        documents_requis: 'Documentos Exigidos',
        fait_a: 'Feito em',
        date_signature: 'Data',
        signataire: 'Signatario',
        emis_par: 'Emitido Por',
        adresse_a: 'Enderecado a',
        ref_reglementaires: 'Ref. Regulamentares',
        date_ouverture: 'Data de Abertura',
        source: 'Fonte',
        source_audit: 'Auditoria',
        source_inspection: 'Inspecao',
        source_autre: 'Outro',
        domaine: 'Dominio',
        criticite: 'Criticidade',
        critique: 'Critico',
        majeur: 'Maior',
        mineur: 'Menor',
        cas: 'Caso',
        description_constatation: 'Descricao da Constatacao',
        delai_solde: 'Prazo de Encerramento',
        date_due: 'Data Limite',
        recommandation: 'Recomendacao',
        preuves: 'Provas',
        cause_primaire: 'Causa Primaria',
        action_curative: 'Acao Curativa',
        actions_correctives: 'Acoes Corretivas',
        commentaires_anac: 'Comentarios ANAC',
        validation_pac: 'Validacao PAC',
        signature_pac: 'Assinatura',
        solde_fnc: 'Encerrar Constatacao',
        // Novo layout PAC
        rappel_constatation: 'Resumo da Constatacao',
        plan_actions_correctives: 'Plano de Acoes Corretivas',
        evaluation_suivi_aac: 'Avaliacao e Acompanhamento (Reservado AAC)',
        details_suivi: 'Detalhes do acompanhamento',
        details_suivi_intro: 'Items, respostas do postulante e trocas entre AAC e o postulante.',
        item_label: 'Item',
        reponse_label: 'Resposta do postulante',
        commentaires_label: 'Comentarios',
        cause_root: 'Causa Primaria (Root cause)',
        action_curative_correction: 'Acao Curativa (Correcao imediata)',
        action_corrective_prevention: 'Acao Corretiva (Prevencao de recorrencia)',
        acceptation_propositions: 'Aceitacao das propostas de acoes',
        pac_accepte: 'O PAC e aceito?',
        date_acceptation: 'Data de aceitacao',
        verification_mise_oeuvre: 'Verificacao da implementacao',
        isolement_realise: 'Isolamento / Informacao realizada?',
        risques_traites: 'Tratamento dos Riscos identificados?',
        commentaire_efficacite: 'Comentario sobre implementacao e eficacia',
        preuves_mise_oeuvre: 'Provas de implementacao fornecidas pelo operador',
        cloture_fnc: 'Encerramento da Ficha de Nao-Conformidade',
        mise_oeuvre_effective: 'Implementacao Efetiva?',
        date_solde: 'Data de Encerramento',
        solde_par: 'Encerrado por (Inspetor)',
        oui_label: 'SIM',
        non_label: 'NAO',
        partie_pac: 'Parte reservada ao PAC',
        sauver_brouillon: 'Rascunho',
        renvoyer_postulant: 'Devolver ao postulante',
        solder_constatation: 'Encerrar a Constatacao',
        ajouter_un_commentaire: 'Adicionar um comentario...',
        aucun_commentaire: 'Nenhum comentario para este item',
        pac_renvoye_titre: 'PAC devolvido ao postulante',
        pac_soumis_titre: 'PAC submetido para validação',
        motif: 'Motivo',
        pac_renvoye_motif: 'Motivo',
        aucune_modification: 'Nenhuma alteração',
        constatation_soldee: 'Constatação encerrada',
        cloturee_dans_delais: 'Encerrada dentro do prazo',
        hors_delais: 'Fora do prazo',
        confirm_renvoyer: 'Confirmar a devolucao do PAC ao postulante? Os campos do PAC serao reativados.',
        confirm_solder: 'Confirmar o encerramento da constatacao? Todos os campos serao bloqueados.',
        motif_renvoi: 'Motivo da devolucao (visivel pelo postulante)',
        brouillon_enregistre: 'Rascunho salvo',
        fiche_constat: 'Ficha de Constatação',
        fiche_suivi: 'Ficha de Acompanhamento',
        rapport_valide_readonly: 'Relatório validado — edição bloqueada',
        delai_label: 'Prazo de encerramento',
        ref_label: 'Referencia',
        domaine_label: 'Dominio',
        criticite_label: 'Criticidade',
        date_due_label: 'Data Limite',
        ref_reglementaires_label: 'Referencia(s) regulamentar(es)',
        item_cause: 'Causa Primaria',
        item_action_curative: 'Acao Curativa',
        item_date_curative: 'Data prevista (Curativa)',
        item_preuves_curative: 'Provas (Curativa)',
        item_action_corrective: 'Acao Corretiva',
        item_date_corrective: 'Data prevista (Corretiva)',
        item_preuves_corrective: 'Provas (Corretiva)',
        ref_rapport: 'Ref. Relatorio',
        titre_rapport: 'Titulo',
        introduction: 'Introducao',
        synthese: 'Sintese',
        conclusion: 'Conclusao',
        recommandations: 'Recomendacoes',
        annexes: 'Anexos',
        signer_inspecteur: 'Assinar (Inspetor)',
        signer_directeur: 'Assinar (Diretor)',
        transmettre: 'Transmitir',
        date_emission: 'Data de Emissao',
        date_transmission: 'Data de Transmissão',
        statut_validation: 'Status',
        statut: 'Status',
        sauvegarder_brouillon: 'Salvar Rascunho',
        apercu_fiche: 'Pre-visualizacao Oficial',
        retour_formulaire: 'Voltar ao Formulario',
        soumettre_validation: 'Submeter para Validacao',
        repondre: 'Responder',
        valider_accord: 'Validar Acordo',
        declencher: 'Acionar',
        continuer_edition: 'Continuar Edicao',
        apercu: 'Pre-visualizar',
        gerer_echange: 'Trocas',
        ouvrir_dossier: 'Dossi',
        creer_fnc: 'Criar Constatacao',
        suivi_pac: 'Acompanhamento PAC',
        contacts: 'Contatos',
        renseigner: 'Preencher Atividade',
        generer_rapport: 'Gerar Relatorio',
        valider: 'Validar',
        rejeter: 'Rejeitar',
        envoyer: 'Enviar',
        search: 'Pesquisar...',
        all_domains: 'Todos os dominios',
        all_sectors: 'Todos os setores',
        all_types_supervision: 'Todos os tipos',
        all_modes_supervision: 'Todos os modos',
        planifie: 'Planeada',
        notifie: 'Notificada',
        declenche: 'Desencadeada',
        all_providers: 'Todos os prestadores',
        all_statuses: 'Todos os status',
        all_years: 'Todos os anos',
        status: 'Status',
        actions: 'Acoes',
        type: 'Tipo',
        sector: 'Setor',
        provider: 'Prestador',
        year: 'Ano',
        save: 'Salvar',
        cancel: 'Cancelar',
        back: 'Voltar',
        close: 'Fechar',
        edit: 'Editar',
        delete: 'Excluir',
        no_data: 'Sem dados',
        sync_plans: 'Sincronizar Planos',
        sync_plans_ok: 'Planos sincronizados com sucesso',
        sync_plans_error: 'Erro de sincronizacao dos planos',
        sync_partial_excluded: 'Sincronizacao parcial: algumas atividades ja desencadeadas foram excluidas.',
        sync_excluded_title: 'Atividades excluidas da sincronizacao',
        sync_excluded_intro: 'As atividades seguintes ja foram desencadeadas e nao serao sincronizadas a partir dos planos alterados:',
        lecture_seule: 'somente leitura',
        reserve_aac: 'Reservado a AAC',
        apercu: 'Pre-visualizar',
        notifs_en_attente_dossier: 'Notificacoes enviadas (aguardando dossie)',
        loading: 'Carregando...',
        confirm: 'Confirmar',
        confirm_delete: 'Tem certeza que deseja excluir?',
        select_option: '-- Selecionar --',
        logout: 'Sair',
        reset_filters: 'Redefinir filtros',
        export_pdf: 'Exportar PDF',
        download_pdf: 'Baixar PDF',
        telecharger: 'Descarregar',
        rapports_closed_intro: 'Relatórios encerrados disponíveis para descarregar.',
        prestataire_home_title: 'Área do Prestador',
        prestataire_home_intro: 'Consulte as suas notificações para tratar os seus planos de ações corretivas.',
        mes_activites: 'Minhas Atividades',
        mes_utilisateurs: 'Meus Utilizadores',
        notification_activite: 'Notificação de atividade',
        all_criticalities: 'Todas as criticidades',
        date_debut: 'Data Inicio',
        date_fin: 'Data Fim',
        delai_restant: 'Prazo Restante',
        jours: 'dias',
        plan: 'Plano',
        activites: 'Atividades',
        nb_activites: 'Qtd Atividades',
        nb_prestataires: 'Qtd Prestadores',
        prochaines_activites: 'Proximas Atividades',
        alertes: 'Alertas & Prazos',
        heatmap: 'Mapa de Calor',
        taux_cloture_activites: 'Taxa de encerramento atividades',
        taux_cloture_constatations: 'Taxa de encerramento constatações',
        trimestre: 'Trimestre',
        all_trimestres: 'Todos os trimestres',
        activites_planifiees: 'Atividades Planejadas',
        activites_non_declenchees: 'Nao Acionadas',
        activites_en_cours: 'Em Andamento',
        activites_cloturees: 'Encerradas',
        taux_execution: 'Taxa de Execucao',
        nb_constatations: 'Constatacoes',
        taux_cloture_const: 'Taxa Encerr. Const.',
        total: 'Total',
        points_forts: 'Pontos Fortes',
        points_faibles: 'Pontos Fracos',
        checklists: 'Checklists',
        ajouter_programme: 'Adicionar Linha',
        supprimer_ligne: 'Remover',
        dossier: 'Dossi',
        rappel_fnc: 'Lembrete da FNC',
        pac_exploitant: 'PAC do Operador',
        evaluation_anac: 'Avaliacao ANAC',
        risque: 'Risco',
        dernier_audit: 'Ultima Auditoria',
        localisation: 'Localizacao',
        historique: 'Historico',
        discussions: 'Discussoes',
        transmis: 'Transmitido',
        upload_zone: 'Arraste ficheiros aqui ou clique para selecionar',
        aucun_fichier: 'Nenhum ficheiro',
        gravite: 'Criticidade',
        echeance: 'Prazo',
        statut_pac: 'Status',
        supprimer_activite: 'Excluir',
        confirm_delete_activite: 'Excluir esta atividade? Constatacoes e relatorios associados serao excluidos.',
        confirm_delete_constatation: 'Excluir esta constatacao?',
        confirm_delete_rapport: 'Excluir este relatorio?',
        envoyer_prestataire: 'Enviar',
        ref_consta: 'Ref. CONST'
    }
};

function te(key, ...args) {
    let str = (EXEC_TR[EXEC_STATE.lang] || EXEC_TR.fr)[key] || (EXEC_TR.fr)[key] || key;
    args.forEach((a, i) => { str = str.replace(`{${i}}`, a); });
    return str;
}

function et(key) {
    const lang = EXEC_STATE.lang || window.PESSCO?.lang || 'fr';
    const shared = (typeof PORTAL_TRANSLATIONS !== 'undefined') ? (PORTAL_TRANSLATIONS[lang] || PORTAL_TRANSLATIONS.fr || {}) : {};
    return shared[key] || key;
}

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

function _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

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
        return `<option value="${_esc(val)}" data-delai="${c.delai_cloture || ''}" ${sel === val ? 'selected' : ''}>${_esc(c.alias || c.item)}</option>`;
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
    const head = includeEmpty !== false ? `<option value="">${te('select_option') || 'Sélectionner'}</option>` : '';
    if (!tcs.length) {
        return head + ['isole', 'recurrent'].map(v =>
            `<option value="${v}" ${sel === v ? 'selected' : ''}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`
        ).join('');
    }
    return head + tcs.map(t => {
        const val = _execNorm(t.item);
        return `<option value="${_esc(val)}" ${sel === val ? 'selected' : ''}>${_esc(t.item)}</option>`;
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
function _execIsAdmin() { return _userM3Role() === 'M3_Administrateur'; }
function _execIsPrestataire() { return _userM3Role() === 'M3_Prestataire'; }

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

document.addEventListener('DOMContentLoaded', () => {
    if (!window.PESSCO) {
        EXEC_STATE.user = JSON.parse(localStorage.getItem('pr_user') || 'null');
        if (!EXEC_STATE.user) { window.location.href = '/login'; return; }
        document.documentElement.setAttribute('data-theme', EXEC_STATE.theme);
        _execHydrateUser().then(() => execLoadData()).then(() => {
            execRenderApp();
            execNavigateTo('dashboard');
            execUpdateNotifBadge();
        });
    }
});

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
        // Charge les checklists (mode minimal — chargement séparé, ignoré si tables vides)
        execRefreshChecklists().catch(() => {});
    } catch (e) {
        console.error('Execution data load error:', e);
    }
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
    return plans.map(p => ({
        ...p,
        activites: byPlanId[p.id] || [],
        nb_activites: (byPlanId[p.id] || []).length
    }));
}

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
    if (page === 'constatations') EXEC_STATE.currentConstSub = _execIsPrestataire() ? 'suivi' : 'list';
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
    localStorage.setItem('pr_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.theme === theme));
}

function execSetLang(lang) {
    EXEC_STATE.lang = lang;
    localStorage.setItem('pr_lang', lang);
    if (window.PESSCO) window.PESSCO.lang = lang;
    execRenderApp();
    execNavigateTo(EXEC_STATE.currentPage);
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

function execResetFilters() {
    EXEC_STATE.filters = { domaine: '', secteur: '', prestataire: '', statut: '', search: '', annee: '', trimestre: '', criticite: '', type_supervision: '', mode_supervision: '' };
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
            navHtml += `<button class="nav-btn ${S.currentPage === key ? 'active' : ''}" data-page="${key}" onclick="execNavigateTo('${key}')" title="${te(config.labelKey)}">
                ${EXEC_ICONS[config.icon] || ''} <span>${te(config.labelKey)}</span>
            </button>`;
        }
    }

    document.getElementById('app').innerHTML = `
    <div class="app-layout exec-module ${S.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="app-sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
            <div class="sidebar-header">
                ${window.PESSCO ? `<button class="btn-back-portal" onclick="backToPortal()" title="${et('back_portal')}">
                    ${EXEC_ICONS.back} <span class="back-portal-label">${et('back_portal')}</span>
                </button>` : ''}
            </div>
            <nav class="sidebar-nav">${navHtml}</nav>
            <div class="sidebar-footer">
                <div class="theme-selector sidebar-theme-selector">
                    ${['blue-dark','orange-dark','violet','green','grey'].map(th =>
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
        case 'parametres': content = execRenderParametres(); break;
        case 'prestataire_home': content = execRenderPrestataireHome(); break;
        case 'prestataire_notifications': content = execRenderPrestataireNotifications(); break;
        case 'mes_utilisateurs': content = execRenderMesUtilisateurs(); break;
        default: content = `<div class="text-center">${te('no_data')}</div>`;
    }
    el.innerHTML = content;
    if (EXEC_STATE.currentPage === 'mes_utilisateurs') execLoadMesUtilisateurs();
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
    let rows = all.filter(n => n.statut === 'envoye' && (!scopedPid || n.prestataire_id === scopedPid));

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
            <p style="color:var(--text-muted);">${rows.length} ${te('notifications') || 'notification(s)'}</p>
        </div>

        ${_execRenderFilterBar('execRenderPage()', { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showSearch: true })}

        <div class="card">
            <table class="exec-data-table">
                <thead>
                    <tr>
                        <th>${te('reference')}</th>
                        <th>${te('objet')}</th>
                        <th>${te('date_edition') || 'Date'}</th>
                        <th>${te('status')}</th>
                        <th>${te('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    rows.map(n => `<tr>
                        <td><strong>${_esc(n.reference || '')}</strong></td>
                        <td>${_esc((n.objet || n.objet_activite || '').substring(0, 80))}</td>
                        <td>${_formatDate(n.date_edition || n.date_creation)}</td>
                        <td>${_execStatusBadge(n.statut)}</td>
                        <td style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                            <button class="btn btn-sm btn-outline" onclick="execPreviewNotification('${n.id}')" title="${te('apercu') || 'Aperçu'}">
                                ${EXEC_ICONS.eye || EXEC_ICONS.file} ${te('apercu') || 'Aperçu'}
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execOpenExchangeSlider('${n.id}')" title="${te('gerer_echange')}">
                                ${EXEC_ICONS.chat}
                            </button>
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

    // Sort: overdue first, then by days ascending
    alerts.sort((a, b) => (a.days || 999) - (b.days || 999));
    return alerts;
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
    type = type || 'success';
    const toast = document.createElement('div');
    toast.className = `exec-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
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

function execCloseSlider(immediate) {
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
            { value: 'critique', label: te('critique') || 'Critique' },
            { value: 'majeure',  label: te('majeur')  || 'Majeure'  },
            { value: 'mineure',  label: te('mineur')  || 'Mineure'  }
        ];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.criticite=this.value;${onchangeFunc}">
            <option value="">${te('all_criticalities') || 'Toutes les criticités'}</option>
            ${crits.map(c => `<option value="${c.value}" ${F.criticite===c.value?'selected':''}>${c.label}</option>`).join('')}
        </select>`);
    }

    if (opts.showTypeSupervision) {
        const typesSup = EXEC_STATE.data.typesSupervision || [];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.type_supervision=this.value;${onchangeFunc}">
            <option value="">${te('all_types_supervision') || 'Tous les types'}</option>
            ${typesSup.map(t => `<option value="${t.id}" ${F.type_supervision===t.id?'selected':''}>${_esc(t.type_supervision || t.libelle || t.nom || t.id)}</option>`).join('')}
        </select>`);
    }

    if (opts.showModeSupervision) {
        const modesSup = EXEC_STATE.data.modesSupervision || [];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.mode_supervision=this.value;${onchangeFunc}">
            <option value="">${te('all_modes_supervision') || 'Tous les modes'}</option>
            ${modesSup.map(m => `<option value="${m.id}" ${F.mode_supervision===m.id?'selected':''}>${_esc(m.mode || m.libelle || m.nom || m.id)}</option>`).join('')}
        </select>`);
    }

    if (opts.showStatut) {
        const statuts = opts.statutOptions || ['brouillon','soumis','valide','rejete','envoye','acte'];
        filters.push(`<select class="form-select" onchange="EXEC_STATE.filters.statut=this.value;${onchangeFunc}">
            <option value="">${te('all_statuses')}</option>${statuts.map(s => `<option value="${s}" ${F.statut===s?'selected':''}>${te(s)}</option>`).join('')}</select>`);
    }

    if (opts.showSearch !== false) filters.push(`<input type="text" class="form-input" id="exec-filter-search" placeholder="${te('search')}" value="${_esc(F.search)}" oninput="_pesSearchInput(this, () => { EXEC_STATE.filters.search=document.getElementById('exec-filter-search').value; ${onchangeFunc} })">`);

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

function _execFormSection(letter, titleKey, bodyHtml, expanded) {
    const exp = expanded ? ' expanded' : '';
    return `
    <div class="exec-form-section${exp}" id="exec-section-${letter}">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">${letter}</span>
            <span class="exec-form-section-title">${te(titleKey)}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">${bodyHtml}</div>
    </div>`;
}

// ══════════════════════════════════════
//  1. DASHBOARD
// ══════════════════════════════════════


// Donut simple. segments = [{label, value, color}]
function _execSvgDonut(segments, opts) {
    opts = opts || {};
    const size = 140;
    const r = 55;
    const cx = size / 2;
    const cy = size / 2;
    const strokeW = 22;
    const total = segments.reduce((s, x) => s + x.value, 0);
    if (total === 0) {
        return `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-size:0.8rem;">${opts.emptyMsg || 'Aucune donnée'}</div>`;
    }
    const C = 2 * Math.PI * r;
    let offset = 0;
    const arcs = segments.map(s => {
        const len = (s.value / total) * C;
        const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${strokeW}"
            stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
        offset += len;
        return circle;
    }).join('');
    const centerLabel = opts.centerValue != null
        ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${opts.centerValue}</text>
           <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${_esc(opts.centerLabel || '')}</text>`
        : '';
    const legend = segments.map(s =>
        `<div style="display:flex;align-items:center;gap:0.35rem;font-size:0.72rem;color:var(--text);">
            <span style="width:10px;height:10px;background:${s.color};border-radius:2px;display:inline-block;flex-shrink:0;"></span>
            <span style="flex:1;color:var(--text-muted);">${_esc(s.label)}</span>
            <strong>${s.value}</strong>
        </div>`
    ).join('');
    return `
        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
            <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex-shrink:0;">
                ${arcs}
                ${centerLabel}
            </svg>
            <div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:0.25rem;">${legend}</div>
        </div>`;
}

function execRenderDashboard() {
    const stats = EXEC_STATE.data.dashStats || {};
    const notifs = EXEC_STATE.data.notifications || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    let constatations = EXEC_STATE.data.constatations || [];
    // Source des activités planifiées : identique au menu "Activités de Supervision".
    const plansValides = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    // Statuts post-transmission — base de la table du sous-menu "Suivi".
    const POST_TRANSMIT = new Set(['ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee']);
    const secteurs = EXEC_STATE.data.secteurs || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const F = EXEC_STATE.filters;
    const isPrest = _execIsPrestataire();
    const scopedPid = (EXEC_STATE.user || {}).prestataire_id || '';

    // For prestataires: narrow the data to their own prestataire before any filter logic
    if (isPrest) {
        constatations = constatations.filter(c => c.prestataire_id === scopedPid);
    }

    // Build secteur -> domaine lookup
    const secteurToDomaine = {};
    secteurs.forEach(s => { if (s.domaine_id) secteurToDomaine[s.id] = s.domaine_id; });

    // Collect all activities from validated plans with filtering
    let allActivities = [];
    plansValides.forEach(p => {
        if (F.annee && String(p.annee) !== String(F.annee)) return;
        (p.activites || []).forEach(a => {
            const domaineId = a.domaine_id || secteurToDomaine[a.secteur_id] || '';
            allActivities.push({ ...a, plan_annee: p.annee, domaine_id_resolved: domaineId });
        });
    });

    if (isPrest) {
        allActivities = allActivities.filter(a => a.prestataire_id === scopedPid);
    }

    // Apply trimestre filter
    if (F.trimestre) {
        const q = parseInt(F.trimestre);
        const qStart = (q - 1) * 3; // 0,3,6,9
        allActivities = allActivities.filter(a => {
            if (!a.date_debut) return false;
            const m = new Date(a.date_debut).getMonth();
            return m >= qStart && m < qStart + 3;
        });
    }

    // Apply domaine filter
    if (F.domaine) {
        allActivities = allActivities.filter(a => a.domaine_id_resolved === F.domaine);
    }

    // Apply prestataire filter
    if (F.prestataire) {
        allActivities = allActivities.filter(a => a.prestataire_id === F.prestataire);
    }

    // Apply search filter
    if (F.search) {
        const s = F.search.toLowerCase();
        allActivities = allActivities.filter(a =>
            (a.objet || '').toLowerCase().includes(s) ||
            (a.prestataire_nom || '').toLowerCase().includes(s) ||
            (a.type_supervision || '').toLowerCase().includes(s)
        );
    }

    // Filter constatations by same criteria
    let filteredConstatations = [...constatations];
    if (F.annee) {
        filteredConstatations = filteredConstatations.filter(c => {
            const y = (c.date_creation || c.date_ouverture || '').substring(0, 4);
            return y === String(F.annee);
        });
    }
    if (F.trimestre) {
        filteredConstatations = filteredConstatations.filter(c => {
            const d = c.date_creation || c.date_ouverture || '';
            if (d.length < 7) return false;
            return String(Math.ceil(parseInt(d.slice(5, 7)) / 3)) === String(F.trimestre);
        });
    }
    if (F.domaine) {
        filteredConstatations = filteredConstatations.filter(c => c.domaine_id === F.domaine);
    }
    if (F.prestataire) {
        filteredConstatations = filteredConstatations.filter(c => c.prestataire_id === F.prestataire);
    }
    if (F.search) {
        const cs = F.search.toLowerCase();
        filteredConstatations = filteredConstatations.filter(c =>
            (c.reference || '').toLowerCase().includes(cs) ||
            (c.titre || '').toLowerCase().includes(cs) ||
            (c.description || '').toLowerCase().includes(cs) ||
            (c.prestataire_nom || '').toLowerCase().includes(cs)
        );
    }

    // Compute KPIs
    const totalAct = allActivities.length;
    const closedAct = allActivities.filter(a => a.statut === 'cloture' || a.statut === 'cloturee').length;
    const tauxClotureAct = totalAct > 0 ? Math.round((closedAct / totalAct) * 100) : 0;

    const totalConst = filteredConstatations.length;
    const closedConst = filteredConstatations.filter(c => c.statut === 'soldee').length;
    const tauxClotureConst = totalConst > 0 ? Math.round((closedConst / totalConst) * 100) : 0;

    const fncOuvertes = filteredConstatations.filter(c => c.statut !== 'soldee').length;
    const fncCritiques = filteredConstatations.filter(c => (c.criticite || '').toLowerCase() === 'critique' && c.statut !== 'soldee').length;

    // Alerts: FNC approaching deadline
    const fncAlerts = constatations.filter(c => {
        if (c.statut === 'soldee') return false;
        const days = _daysUntil(c.delai_correction || c.date_due_cloture);
        return days !== null && days >= 0 && days <= 15;
    }).slice(0, 5);

    // ── Build activities table grouped by Domaine → Secteur → Prestataire ──
    // Lookup prestataire (domaine + secteur + nom) pour résoudre les éléments
    // qui ne portent pas directement ces infos (dossiers/constatations cloturés).
    const prestList = EXEC_STATE.data.prestataires || [];
    const prestDomaineLookup = {};
    prestList.forEach(p => {
        const sec = secteurs.find(s => s.id === p.secteur_id);
        prestDomaineLookup[p.id] = {
            domaine_id: p.domaine_id || (sec ? sec.domaine_id : ''),
            secteur_id: p.secteur_id || '',
            nom: p.nom || p.trigramme || p.id
        };
    });

    // Groupement : domaineMap[dId][sId][pId] = { activities, prestataire_nom }.
    const domaineMap = {};
    const resolveSecteur = (obj, fallbackPid) => {
        if (obj && obj.secteur_id) return obj.secteur_id;
        const info = prestDomaineLookup[fallbackPid] || {};
        return info.secteur_id || 'unknown';
    };
    const ensureEntry = (dId, sId, pId, pNom) => {
        if (!domaineMap[dId]) domaineMap[dId] = {};
        if (!domaineMap[dId][sId]) domaineMap[dId][sId] = {};
        if (!domaineMap[dId][sId][pId]) domaineMap[dId][sId][pId] = { activities: [], prestataire_nom: pNom || pId };
    };
    // Regroupement prestataire-centré : chaque prestataire apparaît dans un seul
    // groupe Domaine→Secteur (déduit de son rattachement), ce qui garantit que
    // les décomptes correspondent aux listes des menus dédiés.
    allActivities.forEach(a => {
        const pId = a.prestataire_id || 'unknown';
        const pInfo = prestDomaineLookup[pId] || {};
        const dId = pInfo.domaine_id || a.domaine_id_resolved || 'unknown';
        const sId = pInfo.secteur_id || resolveSecteur(a, pId);
        ensureEntry(dId, sId, pId, a.prestataire_nom);
        domaineMap[dId][sId][pId].activities.push(a);
    });

    // Closed execution dossiers — the authoritative "activité réalisée clôturée" counter.
    // NB: backend already scopes /dossiers for M3_Prestataire (only closed + own prestataire),
    // so we must NOT re-filter by scopedPid here (it may be empty when cached localStorage
    // didn't persist prestataire_id — we rely on server-side scoping instead).
    let closedDossiers = (dossiers || []).filter(d => d.statut === 'cloture');
    if (isPrest && scopedPid) {
        closedDossiers = closedDossiers.filter(d => !d.prestataire_id || d.prestataire_id === scopedPid);
    }
    // Cohérence avec les filtres du tableau de bord (domaine / prestataire / année / trimestre).
    if (F.prestataire) {
        closedDossiers = closedDossiers.filter(d => d.prestataire_id === F.prestataire);
    }
    if (F.domaine) {
        closedDossiers = closedDossiers.filter(d =>
            (prestDomaineLookup[d.prestataire_id] || {}).domaine_id === F.domaine);
    }
    if (F.annee) {
        closedDossiers = closedDossiers.filter(d =>
            String(d.date_fin_execution || d.date_creation || '').slice(0, 4) === String(F.annee));
    }
    if (F.trimestre) {
        closedDossiers = closedDossiers.filter(d => {
            const dt = String(d.date_fin_execution || d.date_creation || '');
            if (dt.length < 7) return false;
            return String(Math.ceil(parseInt(dt.slice(5, 7)) / 3)) === String(F.trimestre);
        });
    }

    // Build a set of transmitted rapport dossier_ids — a constatation is considered
    // "transmise au postulant" when a rapport covering its dossier has been transmitted.
    const transmittedDossierIds = new Set(
        (EXEC_STATE.data.rapports || [])
            .filter(r => r.statut === 'transmis')
            .map(r => r.dossier_id)
            .filter(Boolean)
    );

    const resolveDossierDomaine = (d) => {
        const pInfo = prestDomaineLookup[d.prestataire_id] || {};
        return d.domaine_id
            || secteurToDomaine[d.secteur_id]
            || pInfo.domaine_id
            || 'unknown';
    };
    closedDossiers.forEach(d => {
        const pInfo = prestDomaineLookup[d.prestataire_id] || {};
        const dId = pInfo.domaine_id || resolveDossierDomaine(d);
        const pId = d.prestataire_id || 'unknown';
        const sId = pInfo.secteur_id || resolveSecteur(d, pId);
        ensureEntry(dId, sId, pId, d.prestataire_nom || pInfo.nom);
    });
    filteredConstatations.filter(c => POST_TRANSMIT.has(c.statut || '')).forEach(c => {
        const pInfo = prestDomaineLookup[c.prestataire_id] || {};
        const pId = c.prestataire_id || 'unknown';
        const dId = pInfo.domaine_id || c.domaine_id || secteurToDomaine[c.secteur_id] || 'unknown';
        const sId = pInfo.secteur_id || resolveSecteur(c, pId);
        ensureEntry(dId, sId, pId, c.prestataire_nom || pInfo.nom);
    });

    // Libellés : domaines affichés par sigle/code, secteurs par code/nom.
    const domaineNameMap = {};
    domaines.forEach(d => { domaineNameMap[d.id] = d.code || d.sigle || d.nom || d.id; });
    const secteurNameMap = {};
    secteurs.forEach(s => { secteurNameMap[s.id] = s.code || s.nom || s.id; });

    // Criticite levels for columns — values MUST match DB storage (see FNC form).
    const criticites = ['critique', 'majeure', 'mineure'];

    // ── Accordion Domaine → Secteur → table prestataires ────────────────
    // Helper : stats par prestataire (activités + constatations par criticité).
    const computePrestStats = (dId, sId, pId) => {
        const entry = domaineMap[dId][sId][pId];
        // Activités planifiées : liste "Activités de Supervision" du prestataire.
        const planned = entry.activities.length;
        // Activités clôturées : dossiers clôturés du prestataire (sous-menu "Dossiers Clôturés").
        const closed = closedDossiers.filter(d => d.prestataire_id === pId).length;
        const execRate = planned > 0 ? Math.round((closed / planned) * 100) : 0;

        // Constatations : décompte par criticité depuis la table du sous-menu "Suivi".
        const pConsts = filteredConstatations.filter(c =>
            c.prestataire_id === pId && POST_TRANSMIT.has(c.statut || ''));
        const totalPConst = pConsts.length;
        const totalPClosed = pConsts.filter(c => c.statut === 'soldee').length;
        const constByCrit = {};
        criticites.forEach(cr => {
            const matching = pConsts.filter(c => ((c.criticite || c.gravite || '') + '').toLowerCase() === cr);
            const matchClosed = matching.filter(c => c.statut === 'soldee').length;
            constByCrit[cr] = {
                count: matching.length,
                closed: matchClosed,
                rate: matching.length > 0 ? Math.round((matchClosed / matching.length) * 100) : 0
            };
        });
        const totalClotRate = totalPConst > 0 ? Math.round((totalPClosed / totalPConst) * 100) : 0;
        return {
            prestataire_nom: entry.prestataire_nom,
            planned, closed, execRate,
            constByCrit, totalPConst, totalPClosed, totalClotRate
        };
    };

    // Helper : agrège un tableau de stats prestataires en totaux domaine/secteur.
    const aggregate = (statsList) => {
        const agg = { planned: 0, closed: 0, totalPConst: 0, totalPClosed: 0 };
        const byCrit = {};
        criticites.forEach(cr => { byCrit[cr] = { count: 0, closed: 0 }; });
        statsList.forEach(s => {
            agg.planned += s.planned;
            agg.closed += s.closed;
            agg.totalPConst += s.totalPConst;
            agg.totalPClosed += s.totalPClosed;
            criticites.forEach(cr => {
                byCrit[cr].count += s.constByCrit[cr].count;
                byCrit[cr].closed += s.constByCrit[cr].closed;
            });
        });
        agg.execRate = agg.planned > 0 ? Math.round((agg.closed / agg.planned) * 100) : 0;
        agg.totalClotRate = agg.totalPConst > 0 ? Math.round((agg.totalPClosed / agg.totalPConst) * 100) : 0;
        agg.byCrit = byCrit;
        return agg;
    };

    const _thN = 'text-align:center;width:54px;';
    const prestTableHeader = `
        <thead><tr>
            <th style="width:160px;">${te('provider')}</th>
            <th style="${_thN}">Planifiées</th>
            <th style="${_thN}">Clôturées</th>
            <th style="${_thN}">Taux</th>
            ${criticites.map(cr => `<th style="${_thN}">${te(cr) || cr}</th>`).join('')}
            <th style="${_thN}">${te('total') || 'Total'}</th>
            ${criticites.map(cr => `<th style="${_thN}">${te(cr) || cr}</th>`).join('')}
            <th style="${_thN}">${te('total') || 'Total'}</th>
        </tr>
        <tr style="font-size:0.7rem;color:var(--text-muted);">
            <th></th>
            <th colspan="3" style="text-align:center;font-weight:500;">Activités</th>
            <th colspan="4" style="text-align:center;font-weight:500;">Nb Constatations</th>
            <th colspan="4" style="text-align:center;font-weight:500;">Taux Clôture Const.</th>
        </tr></thead>`;

    const renderStatsCells = (s, opts) => {
        const emphasize = opts && opts.aggregate;
        const fw = emphasize ? 'font-weight:700;' : '';
        return `
            <td style="text-align:center;${fw}">${s.planned}</td>
            <td style="text-align:center;${fw}">${s.closed}</td>
            <td style="text-align:center;font-weight:600;">${s.planned > 0 ? s.execRate + '%' : '-'}</td>
            ${criticites.map(cr => `<td style="text-align:center;${fw}">${(s.byCrit || s.constByCrit)[cr].count}</td>`).join('')}
            <td style="text-align:center;font-weight:600;">${s.totalPConst}</td>
            ${criticites.map(cr => {
                const cell = (s.byCrit || s.constByCrit)[cr];
                const rate = cell.rate !== undefined ? cell.rate : (cell.count > 0 ? Math.round((cell.closed / cell.count) * 100) : 0);
                return `<td style="text-align:center;${fw}">${cell.count > 0 ? rate + '%' : '-'}</td>`;
            }).join('')}
            <td style="text-align:center;font-weight:600;">${s.totalPConst > 0 ? s.totalClotRate + '%' : '-'}</td>`;
    };

    let accordionHtml = '';
    const dKeys = Object.keys(domaineMap).sort((a, b) => (domaineNameMap[a] || a).localeCompare(domaineNameMap[b] || b));

    dKeys.forEach(dId => {
        const dName = domaineNameMap[dId] || dId || '—';
        const secteurEntries = domaineMap[dId];
        const sKeys = Object.keys(secteurEntries).sort((a, b) => (secteurNameMap[a] || a).localeCompare(secteurNameMap[b] || b));

        // Aggrégat domaine = tous les prestataires de tous les secteurs du domaine.
        const domaineStats = [];
        sKeys.forEach(sId => {
            Object.keys(secteurEntries[sId]).forEach(pId => domaineStats.push(computePrestStats(dId, sId, pId)));
        });
        const dAgg = aggregate(domaineStats);

        let secteursHtml = '';
        sKeys.forEach(sId => {
            const sName = secteurNameMap[sId] || sId || '—';
            const pKeys = Object.keys(secteurEntries[sId]);
            const secteurStatsList = pKeys.map(pId => computePrestStats(dId, sId, pId));
            const sAgg = aggregate(secteurStatsList);

            const rowsHtml = pKeys.map((pId, idx) => {
                const s = secteurStatsList[idx];
                return `<tr data-domaine="${_esc(dName)}" data-secteur="${_esc(sName)}">
                    <td>${_esc(s.prestataire_nom)}</td>
                    ${renderStatsCells(s)}
                </tr>`;
            }).join('');

            secteursHtml += `
            <div class="sg-secteur card" style="margin:0.5rem 0;">
                <div class="exec-accordion-header" onclick="this.parentElement.classList.toggle('expanded')"
                     style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;padding:0.5rem 0.75rem;font-weight:600;flex-wrap:wrap;background:color-mix(in srgb, var(--primary) 6%, var(--bg));border-radius:6px 6px 0 0;font-size:0.85rem;">
                    <span class="exec-form-section-chevron" style="transition:transform 0.2s;">${EXEC_ICONS.chevronDown || '▸'}</span>
                    <strong>${_esc(sName)}</strong>
                    <span style="color:var(--text-muted);font-weight:500;font-size:0.76rem;display:inline-flex;flex-wrap:wrap;gap:0.5rem;">
                        <span>· ${pKeys.length} prestataire${pKeys.length > 1 ? 's' : ''}</span>
                        <span>· Activités: <strong style="color:var(--text);">${sAgg.planned}</strong></span>
                        <span>· Clôt.: <strong style="color:var(--text);">${sAgg.closed}</strong></span>
                        <span>· Taux: <strong style="color:var(--text);">${sAgg.planned > 0 ? sAgg.execRate + '%' : '-'}</strong></span>
                        <span>· Const.: <strong style="color:var(--text);">${sAgg.totalPConst}</strong></span>
                        <span>· Taux clôt.: <strong style="color:var(--text);">${sAgg.totalPConst > 0 ? sAgg.totalClotRate + '%' : '-'}</strong></span>
                    </span>
                </div>
                <div class="exec-accordion-body" style="padding:0.5rem 0.75rem 0.75rem;">
                    <div style="overflow-x:auto;">
                        <table class="exec-table sg-prest-table" style="font-size:0.8rem;white-space:nowrap;width:100%;table-layout:fixed;min-width:760px;">
                            ${prestTableHeader}
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        });

        // Domaines repliés par défaut (évite une page longue quand il y en a beaucoup).
        accordionHtml += `
        <div class="sg-domaine card expanded" style="margin-bottom:0.75rem;">
            <div class="exec-accordion-header" onclick="this.parentElement.classList.toggle('expanded')"
                 style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;padding:0.55rem 0.75rem;font-weight:700;flex-wrap:wrap;background:color-mix(in srgb, var(--primary) 14%, var(--bg));border-radius:6px 6px 0 0;font-size:0.9rem;">
                <span class="exec-form-section-chevron" style="transition:transform 0.2s;">${EXEC_ICONS.chevronDown || '▾'}</span>
                <span style="color:var(--primary);font-weight:800;letter-spacing:0.03em;">${_esc(dName)}</span>
                <span style="color:var(--text-muted);font-weight:500;font-size:0.78rem;display:inline-flex;flex-wrap:wrap;gap:0.5rem;">
                    <span>· ${sKeys.length} secteur${sKeys.length > 1 ? 's' : ''}</span>
                    <span>· Activités: <strong style="color:var(--text);">${dAgg.planned}</strong></span>
                    <span>· Clôt.: <strong style="color:var(--text);">${dAgg.closed}</strong></span>
                    <span>· Taux exé.: <strong style="color:#166534;">${dAgg.planned > 0 ? dAgg.execRate + '%' : '-'}</strong></span>
                    <span>· Const.: <strong style="color:var(--text);">${dAgg.totalPConst}</strong></span>
                    <span>· Taux clôt.: <strong style="color:#166534;">${dAgg.totalPConst > 0 ? dAgg.totalClotRate + '%' : '-'}</strong></span>
                </span>
            </div>
            <div class="exec-accordion-body" style="padding:0.5rem 0.75rem 0.75rem;">
                ${secteursHtml}
            </div>
        </div>`;
    });

    if (!accordionHtml) {
        accordionHtml = `<div style="padding:2rem;text-align:center;color:var(--text-muted);">${te('no_data')}</div>`;
    }

    // ── Données pour les graphiques (dérivées des mêmes variables filtrées) ──
    // Barres : activités planifiées vs clôturées par domaine (sigle).
    const chartDomaineRows = Object.keys(domaineMap).sort((a, b) =>
        (domaineNameMap[a] || a).localeCompare(domaineNameMap[b] || b)
    ).map(dId => {
        let planned = 0, closed = 0;
        Object.keys(domaineMap[dId]).forEach(sId => {
            Object.keys(domaineMap[dId][sId]).forEach(pId => {
                planned += domaineMap[dId][sId][pId].activities.length;
                closed += closedDossiers.filter(d => {
                    const ddId = resolveDossierDomaine(d);
                    const dsId = resolveSecteur(d, d.prestataire_id);
                    return d.prestataire_id === pId && ddId === dId && dsId === sId;
                }).length;
            });
        });
        return { label: domaineNameMap[dId] || dId || '—', values: [planned, closed] };
    });

    // Donut : statut d'exécution des activités.
    const actPlanOnly = Math.max(0, totalAct - closedAct);
    const chartExecutionSegments = [
        { label: 'Clôturées', value: closedAct, color: '#10b981' },
        { label: 'En cours / Planifiées', value: actPlanOnly, color: '#3b82f6' }
    ];

    // Statistiques graphiques basées sur la section "Situation Générale".
    const _sgStats = [];
    Object.keys(domaineMap).forEach(dId => Object.keys(domaineMap[dId]).forEach(sId =>
        Object.keys(domaineMap[dId][sId]).forEach(pId => _sgStats.push(computePrestStats(dId, sId, pId)))));
    const sgAgg = aggregate(_sgStats);
    const sgExecSegments = [
        { label: 'Clôturées',    value: sgAgg.closed, color: '#10b981' },
        { label: 'Non clôturées', value: Math.max(0, sgAgg.planned - sgAgg.closed), color: '#3b82f6' }
    ];
    const sgConstStatutSegments = [
        { label: 'Soldées',     value: sgAgg.totalPClosed, color: '#059669' },
        { label: 'Non soldées', value: Math.max(0, sgAgg.totalPConst - sgAgg.totalPClosed), color: '#ef4444' }
    ];
    const sgCritSegments = [
        { label: te('critique') || 'Critique', value: sgAgg.byCrit.critique.count, color: '#dc2626' },
        { label: te('majeure') || 'Majeure',   value: sgAgg.byCrit.majeure.count,  color: '#f97316' },
        { label: te('mineure') || 'Mineure',   value: sgAgg.byCrit.mineure.count,  color: '#f59e0b' }
    ];

    const chartsHtml = `
    <div class="card" id="execDashboardChartsCard" style="margin-top:1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;gap:0.5rem;flex-wrap:wrap;">
            <h4 style="margin:0;">Statistiques graphiques</h4>
            <button class="btn btn-primary btn-sm" onclick="execShowStatistiquesAdvanced()" title="Statistiques détaillées">
                ${EXEC_ICONS.dashboard || ''} Statistiques
            </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;">
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;">
                <div style="font-size:0.82rem;font-weight:600;margin-bottom:0.4rem;color:var(--primary);">Taux d'exécution des activités</div>
                ${_execSvgDonut(sgExecSegments, {
                    centerValue: sgAgg.planned > 0 ? `${sgAgg.execRate}%` : '-',
                    centerLabel: 'Clôturé',
                    emptyMsg: te('no_data')
                })}
            </div>
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;">
                <div style="font-size:0.82rem;font-weight:600;margin-bottom:0.4rem;color:var(--primary);">Taux de clôture des const.</div>
                ${_execSvgDonut(sgConstStatutSegments, {
                    centerValue: sgAgg.totalPConst > 0 ? `${sgAgg.totalClotRate}%` : '-',
                    centerLabel: 'Soldé',
                    emptyMsg: te('no_data')
                })}
            </div>
            <div style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;">
                <div style="font-size:0.82rem;font-weight:600;margin-bottom:0.4rem;color:var(--primary);">Constatations par criticité</div>
                ${_execSvgDonut(sgCritSegments, {
                    centerValue: sgAgg.totalPConst,
                    centerLabel: 'Total',
                    emptyMsg: te('no_data')
                })}
            </div>
        </div>
    </div>`;

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('dashboard')}</h2>
            <p style="color:var(--text-muted)">${te('module_subtitle')}</p>
        </div>

        <div class="exec-kpi-grid">
            <div class="exec-kpi-card" style="--kpi-color:#10b981">
                <div class="exec-kpi-value">${stats.dossiers_clotures_ytd || 0}</div>
                <div class="exec-kpi-label">${te('activites_realisees')}</div>
            </div>
            <div class="exec-kpi-card" style="--kpi-color:#ef4444">
                <div class="exec-kpi-value">${fncOuvertes}</div>
                <div class="exec-kpi-label">${te('constatations_ouvertes')}</div>
            </div>
            <div class="exec-kpi-card" style="--kpi-color:#f97316">
                <div class="exec-kpi-value">${fncCritiques}</div>
                <div class="exec-kpi-label">${te('risques_critiques')}</div>
            </div>
            <div class="exec-kpi-card" style="--kpi-color:#3b82f6">
                <div class="exec-kpi-value">${tauxClotureAct}%</div>
                <div class="exec-kpi-label">${te('taux_cloture_activites')}</div>
            </div>
            <div class="exec-kpi-card" style="--kpi-color:#8b5cf6">
                <div class="exec-kpi-value">${tauxClotureConst}%</div>
                <div class="exec-kpi-label">${te('taux_cloture_constatations')}</div>
            </div>
            <div class="exec-kpi-card" style="--kpi-color:#059669">
                <div class="exec-kpi-value">${stats.rapports_transmis_ytd || 0}</div>
                <div class="exec-kpi-label">${te('rapports_transmis')}</div>
            </div>
        </div>

        ${_execRenderFilterBar('execRenderPage()', isPrest
            ? { showAnnee: true, showTrimestre: true, showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showSearch: true }
            : { showAnnee: true, showTrimestre: true, showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showSearch: true })}

        ${fncAlerts.length > 0 ? `
        <details class="card" style="border-left:4px solid #ef4444;margin-bottom:1.25rem;">
            <summary style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;list-style:none;">
                ${EXEC_ICONS.alarm}
                <strong style="color:#ef4444">${te('alertes')}</strong>
                <span style="background:#ef4444;color:#fff;border-radius:10px;padding:0.05rem 0.5rem;font-size:0.74rem;font-weight:700;">${fncAlerts.length}</span>
            </summary>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem;">
                ${fncAlerts.map(f => `<div style="padding:0.3rem 0;display:flex;justify-content:space-between;align-items:center;">
                    <span>${_esc(f.reference || '')} - ${_esc(f.titre || f.description || '').substring(0, 60)}</span>
                    ${_daysUntilBadge(f.delai_correction || f.date_due_cloture)}
                </div>`).join('')}
            </div>
        </details>` : ''}

        ${chartsHtml}

        <div class="card" style="margin-top:1.5rem;" id="execSituationGeneraleCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;gap:0.5rem;flex-wrap:wrap;">
                <h4 style="margin:0;">Situation Générale</h4>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-primary btn-sm sg-export-btn" onclick="execExportSituationGenerale('xlsx')" title="Exporter Excel">
                        ${EXEC_ICONS.download || EXEC_ICONS.file || ''} Exporter Excel
                    </button>
                    <button class="btn btn-primary btn-sm sg-export-btn" onclick="execExportSituationGenerale('pdf')" title="Exporter PDF">
                        ${EXEC_ICONS.pdf || EXEC_ICONS.download || ''} Exporter PDF
                    </button>
                </div>
            </div>
            <div id="execSituationGeneraleRoot">
                ${accordionHtml}
            </div>
        </div>
    </div>`;
}

// Statistiques avancées — ouvre un slider plein, basé sur les données filtrées du tableau de bord.
function execShowStatistiquesAdvanced() {
    // Filtres propres au formulaire (initialisés depuis ceux du tableau de bord à la 1re ouverture).
    if (!EXEC_STATE.statsFilters) {
        const f = EXEC_STATE.filters || {};
        EXEC_STATE.statsFilters = { domaine: f.domaine || '', prestataire: f.prestataire || '', annee: f.annee || '', trimestre: f.trimestre || '' };
    }
    const F = EXEC_STATE.statsFilters;
    const isPrest = _execIsPrestataire();
    const scopedPid = (EXEC_STATE.user || {}).prestataire_id || '';
    const secteurs = EXEC_STATE.data.secteurs || [];
    const sec2dom = {}; secteurs.forEach(s => { sec2dom[s.id] = s.domaine_id; });
    const prests = EXEC_STATE.data.prestataires || [];
    const prestDom = {}; prests.forEach(p => {
        prestDom[p.id] = p.domaine_id || (secteurs.find(s => s.id === p.secteur_id) || {}).domaine_id || '';
    });
    let consts = EXEC_STATE.data.constatations || [];
    if (isPrest && scopedPid) consts = consts.filter(c => c.prestataire_id === scopedPid);
    // Filtres du tableau de bord
    if (F.prestataire) consts = consts.filter(c => c.prestataire_id === F.prestataire);
    if (F.domaine) consts = consts.filter(c => (prestDom[c.prestataire_id] || c.domaine_id) === F.domaine);
    if (F.annee) consts = consts.filter(c => String(c.date_creation || c.date_ouverture || '').slice(0, 4) === String(F.annee));
    if (F.trimestre) consts = consts.filter(c => {
        const d = String(c.date_creation || c.date_ouverture || '');
        return d.length >= 7 && String(Math.ceil(parseInt(d.slice(5, 7)) / 3)) === String(F.trimestre);
    });
    const POST = new Set(['ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee']);
    const transmitted = consts.filter(c => POST.has(c.statut || ''));
    const crit = c => (c.criticite || c.gravite || '').toLowerCase();

    // --- KPIs requis ---
    const criticals = transmitted.filter(c => crit(c) === 'critique');
    const nbCrit = criticals.length;
    const critResolvedInTime = criticals.filter(c => {
        if (c.statut !== 'soldee' || !c.date_solde || !c.date_due_cloture) return false;
        return new Date(c.date_solde) <= new Date(c.date_due_cloture);
    }).length;
    // Moyenne mensuelle Critique + Majeure
    const cm = transmitted.filter(c => ['critique', 'majeure'].includes(crit(c)));
    const monthSet = new Set(cm.map(c => String(c.date_creation || c.date_ouverture || '').slice(0, 7)).filter(Boolean));
    const moyMensCritMaj = monthSet.size > 0 ? (cm.length / monthSet.size).toFixed(1) : '-';
    // Taux clôture majeures
    const majeures = transmitted.filter(c => crit(c) === 'majeure');
    const majSolded = majeures.filter(c => c.statut === 'soldee').length;
    const tauxClotMaj = majeures.length > 0 ? Math.round((majSolded / majeures.length) * 100) + '%' : '-';
    // Récurrentes : clé prestataire + thème/description (50 prem. car.) — paquets avec count > 1
    const recurMap = {};
    transmitted.forEach(c => {
        const k = (c.prestataire_id || '') + '|' + ((c.theme || c.titre || c.description || '').toString().toLowerCase().slice(0, 50));
        recurMap[k] = (recurMap[k] || 0) + 1;
    });
    const nbRecur = Object.values(recurMap).filter(n => n > 1).reduce((a, b) => a + b, 0);

    // --- KPIs additionnels (proposés à partir des données du module) ---
    const totalConst = transmitted.length;
    const totalSolded = transmitted.filter(c => c.statut === 'soldee').length;
    const tauxClotGlobal = totalConst > 0 ? Math.round((totalSolded / totalConst) * 100) + '%' : '-';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horsDelai = transmitted.filter(c => c.statut !== 'soldee' && c.date_due_cloture && new Date(c.date_due_cloture) < today).length;
    const delais = transmitted
        .filter(c => c.statut === 'soldee' && c.date_solde && (c.date_creation || c.date_ouverture))
        .map(c => (new Date(c.date_solde) - new Date(c.date_creation || c.date_ouverture)) / 86400000);
    const delaiMoyen = delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) + ' j' : '-';
    const nbRapportsTransmis = (EXEC_STATE.data.rapports || []).filter(r => r.statut === 'transmis').length;
    // Top criticité par prestataire
    const byPrest = {};
    transmitted.forEach(c => {
        const k = c.prestataire_nom || (prests.find(p => p.id === c.prestataire_id) || {}).nom || '—';
        byPrest[k] = (byPrest[k] || 0) + 1;
    });
    const topPrest = Object.entries(byPrest).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const kpi = (label, value, color) => `<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:0.9rem 1rem;">
        <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
        <div style="font-size:1.7rem;font-weight:800;color:${color || 'var(--primary)'};margin-top:0.25rem;">${value}</div>
    </div>`;

    // Options du filtre propre
    const domaines = EXEC_STATE.data.domaines || [];
    const allConstYears = new Set((EXEC_STATE.data.constatations || [])
        .map(c => String(c.date_creation || c.date_ouverture || '').slice(0, 4)).filter(Boolean));
    const years = [...allConstYears].sort((a, b) => b.localeCompare(a));
    const filterBar = `
    <div style="display:flex;flex-wrap:nowrap;gap:0.5rem;margin-bottom:1rem;padding:0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;align-items:center;">
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.domaine=this.value;execShowStatistiquesAdvanced()">
            <option value="">Tous les domaines</option>
            ${domaines.map(d => `<option value="${d.id}" ${F.domaine===d.id?'selected':''}>${_esc(d.code || d.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.prestataire=this.value;execShowStatistiquesAdvanced()">
            <option value="">Tous les prestataires</option>
            ${prests.map(p => `<option value="${p.id}" ${F.prestataire===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.annee=this.value;execShowStatistiquesAdvanced()">
            <option value="">Toutes les années</option>
            ${years.map(y => `<option value="${y}" ${F.annee===y?'selected':''}>${y}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;min-width:0;" onchange="EXEC_STATE.statsFilters.trimestre=this.value;execShowStatistiquesAdvanced()">
            <option value="">Tous les trimestres</option>
            ${['1','2','3','4'].map(t => `<option value="${t}" ${String(F.trimestre)===t?'selected':''}>T${t}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-outline" style="flex-shrink:0;" onclick="EXEC_STATE.statsFilters={domaine:'',prestataire:'',annee:'',trimestre:''};execShowStatistiquesAdvanced()" title="Réinitialiser">${EXEC_ICONS.reset || '↺'}</button>
    </div>`;

    const body = `
    <div style="padding:1rem 1.25rem;">
        ${filterBar}
        <h4 style="margin:0 0 0.5rem;color:#0f172a;">Constatations critiques &amp; majeures</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem;margin-bottom:1.25rem;">
            ${kpi('Constatations critiques', nbCrit, '#dc2626')}
            ${kpi('Critiques résolues dans les délais', critResolvedInTime, '#16a34a')}
            ${kpi('Moy. mensuelle (Crit. + Maj.)', moyMensCritMaj, '#f97316')}
            ${kpi('Taux clôture majeures', tauxClotMaj, '#059669')}
            ${kpi('Constatations récurrentes', nbRecur, '#7c3aed')}
        </div>
        <h4 style="margin:0 0 0.5rem;color:#0f172a;">Indicateurs complémentaires</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem;margin-bottom:1.25rem;">
            ${kpi('Total constatations (suivi)', totalConst)}
            ${kpi('Taux clôture global', tauxClotGlobal, '#059669')}
            ${kpi('Hors délais (non soldées)', horsDelai, '#dc2626')}
            ${kpi('Délai moyen de clôture', delaiMoyen, '#0284c7')}
            ${kpi('Rapports transmis', nbRapportsTransmis, '#1d4ed8')}
        </div>
        <h4 style="margin:0 0 0.5rem;color:#0f172a;">Top 5 prestataires par nb. constatations</h4>
        <table class="exec-data-table" style="width:100%;font-size:0.85rem;">
            <thead><tr><th>Prestataire</th><th style="text-align:right;width:120px;">Constatations</th></tr></thead>
            <tbody>
                ${topPrest.length === 0 ? `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">Aucune donnée</td></tr>` :
                  topPrest.map(([n, v]) => `<tr><td>${_esc(n)}</td><td style="text-align:right;font-weight:700;">${v}</td></tr>`).join('')}
            </tbody>
        </table>
    </div>`;

    execShowSlider(`${EXEC_ICONS.dashboard || ''} Statistiques détaillées`, body, '', 'max');
}

// ══════════════════════════════════════
//  2. PLANS DE SURVEILLANCE (from M2)
// ══════════════════════════════════════

function execRenderPlans() {
    // Source of truth for validated plans + their activities is the
    // Planification module (Module 2). We fetched it in execLoadData via
    // /api/planification/plans and /api/planification/all-activites, then
    // stored the merged structure under plansValidesPlanif.
    const plans = EXEC_STATE.data.plansValidesPlanif || [];
    const F = EXEC_STATE.filters;

    return `
    <div class="page-content">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h2>${te('plan_surveillance')}</h2>
            <div style="display:flex;gap:0.5rem;">
                ${_execCanContribute() ? `<button class="btn btn-accent btn-sm" onclick="execProcNouvelleActivite()" title="Déclencher une activité hors plan">
                    ${EXEC_ICONS.plus || EXEC_ICONS.send || ''} Nouvelles Activités
                </button>` : ''}
                <button class="btn btn-primary btn-sm" onclick="execExportPlansPdf()" title="Exporter PDF">
                    ${EXEC_ICONS.pdf || EXEC_ICONS.download || EXEC_ICONS.folder} Exporter PDF
                </button>
            </div>
        </div>

        ${_execRenderFilterBar('execRenderPage()', {
            showDomaine: true, showSecteur: false, showPrestataire: true, showAnnee: true,
            showTypeSupervision: true, showModeSupervision: true,
            showStatut: true, statutOptions: ['planifie','notifie','declenche','cloture']
        })}

        <div id="execPlansExportRoot">
            ${_renderPlansWithActivitesAccordion(plans, F)}
            ${typeof execProcGroupeHorsPlan === 'function' ? execProcGroupeHorsPlan(F) : ''}
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  PDF EXPORT — "Activités de Supervision"
// ══════════════════════════════════════
// Export the currently-rendered plans/activities accordion as a PDF using
// the browser's print-to-PDF facility. Opens a temporary popup window with
// a print-friendly layout and triggers print(); the user chooses "Save as
// PDF" in the native dialog. No external library required.
function execExportPlansPdf() {
    try {
        const root = document.getElementById('execPlansExportRoot');
        if (!root) { _execToast('Rien à exporter', 'warning'); return; }

        // Build a standalone HTML document containing a print-friendly copy.
        // We expand all accordions and hide action buttons.
        const clone = root.cloneNode(true);
        // Force every card to expanded so content prints
        clone.querySelectorAll('.card').forEach(c => c.classList.add('expanded'));
        // Remove action buttons column contents (last td of each row) + Actions header
        clone.querySelectorAll('table.exec-data-table').forEach(tbl => {
            const thead = tbl.querySelector('thead tr');
            if (thead) {
                const ths = thead.querySelectorAll('th');
                if (ths.length > 0) ths[ths.length - 1].remove();
            }
            tbl.querySelectorAll('tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length > 0) tds[tds.length - 1].remove();
            });
        });

        const now = new Date();
        const ts = now.toLocaleString('fr-FR');
        const title = (te('plan_surveillance') || 'Plans de surveillance') + ' — ' + ts;

        const style = `
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color:#0f172a; font-size:11px; margin:0; padding:0; }
            h1 { font-size: 14px; margin: 0 0 8px 0; }
            .meta { font-size: 10px; color:#475569; margin-bottom: 10px; }
            .card { border:1px solid #cbd5e1; border-radius:6px; margin-bottom:10px; padding:0; page-break-inside:avoid; }
            .exec-accordion-header { background:#e0f2fe !important; padding:5px 8px; font-weight:600; border-radius:5px 5px 0 0; font-size:11px; }
            .exec-accordion-header span { font-size:10px; }
            .exec-accordion-body { padding:6px 8px 8px 8px; }
            table { width:100%; border-collapse:collapse; font-size:10px; }
            th, td { border:1px solid #cbd5e1; padding:3px 5px; text-align:left; vertical-align:top; }
            th { background:#f1f5f9; }
            .exec-form-section-chevron, .btn-icon, button { display:none !important; }
            svg { display:none !important; }
        `;

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${_esc(title)}</title><style>${style}</style></head>
        <body>
            <h1>${_esc(title)}</h1>
            <div class="meta">${_esc(te('generated_on') || 'Généré le')} ${_esc(ts)}</div>
            ${clone.innerHTML}
        </body></html>`;

        const w = window.open('', '_blank', 'width=1100,height=800');
        if (!w) { _execToast('Le popup est bloqué par le navigateur', 'error'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
        // Wait for DOM to settle, then trigger print
        w.onload = () => {
            setTimeout(() => { try { w.focus(); w.print(); } catch (e) { console.error(e); } }, 200);
        };
        // Fallback if onload already fired
        setTimeout(() => {
            try { if (w.document.readyState === 'complete') { w.focus(); w.print(); } } catch (e) { /* noop */ }
        }, 600);
    } catch (e) {
        console.error('execExportPlansPdf error:', e);
        _execToast('Erreur lors de l\'export PDF', 'error');
    }
}

// Single unified view: one accordion per validated plan; body shows its
// activities with realization status + Processus/Historique icon actions.
function _renderPlansWithActivitesAccordion(plans, F) {
    const notifs = EXEC_STATE.data.notifications || [];
    const notifByActId = {};
    notifs.forEach(n => { if (n.activite_id) notifByActId[n.activite_id] = n; });

    // Apply top-level filters on plans (year + title search)
    let filteredPlans = plans;
    if (F && F.annee) filteredPlans = filteredPlans.filter(p => String(p.annee) === String(F.annee));
    if (F && F.search) {
        const s = F.search.toLowerCase();
        filteredPlans = filteredPlans.filter(p =>
            (p.titre || '').toLowerCase().includes(s) ||
            String(p.annee || '').includes(s) ||
            (p.activites || []).some(a =>
                (a.objet || a.description || '').toLowerCase().includes(s) ||
                (a.prestataire_nom || '').toLowerCase().includes(s)));
    }
    // Apply activity-level filters (domaine / prestataire) by keeping only
    // activities that match, and then plans with at least one matching activity.
    const secteurs = EXEC_STATE.data.secteurs || [];
    const secteurToDomaine = {};
    secteurs.forEach(s => { secteurToDomaine[s.id] = s.domaine_id; });

    const planActsFiltered = filteredPlans.map(p => {
        let acts = (p.activites || []).map(a => ({
            ...a,
            _domaine_id: a.domaine_id || secteurToDomaine[a.secteur_id] || ''
        }));
        if (F && F.domaine) acts = acts.filter(a => a._domaine_id === F.domaine);
        if (F && F.prestataire) acts = acts.filter(a => a.prestataire_id === F.prestataire);
        if (F && F.type_supervision) acts = acts.filter(a => a.type_supervision_id === F.type_supervision);
        if (F && F.mode_supervision) acts = acts.filter(a => a.mode_supervision_id === F.mode_supervision);
        if (F && F.statut) {
            acts = acts.filter(a => {
                const n = notifByActId[a.id];
                const dos = n ? (EXEC_STATE.data.dossiers || []).find(d => d.notification_id === n.id) : null;
                let effective;
                if (dos && dos.statut === 'cloture') effective = 'cloture';
                else if (n && n.statut === 'acte') effective = 'declenche';
                else if (n) effective = 'notifie';
                else effective = 'planifie';
                return effective === F.statut;
            });
        }
        return { plan: p, acts };
    });
    // Keep all validated plans — if activity-level filters are set we still
    // show the plan accordion with zero activities so the user can see that
    // no activities match. Only hide plans when no activity-level filter is
    // set AND the plan genuinely has zero activities (edge case).
    const hasActFilter = !!(F && (F.domaine || F.prestataire || F.type_supervision || F.mode_supervision || F.statut));
    const visiblePlans = hasActFilter
        ? planActsFiltered
        : planActsFiltered.filter(x => x.acts.length > 0 || true);

    if (visiblePlans.length === 0) {
        return `<div class="card"><p style="color:var(--text-muted);text-align:center;padding:2rem;">${te('no_data')}</p></div>`;
    }

    // Build a map responsable_id -> "Prenom Nom" from the loaded inspecteurs.
    const inspecteurs = EXEC_STATE.data.inspecteurs || [];
    const respMap = {};
    inspecteurs.forEach(i => {
        const full = ((i.prenom || '') + ' ' + (i.nom || '')).trim();
        respMap[i.id] = full || i.nom || i.id;
    });
    // Fallback for legacy entries where responsable might be a user id
    const users = EXEC_STATE.data.users || [];
    users.forEach(u => {
        if (!respMap[u.id]) {
            const full = ((u.prenom || '') + ' ' + (u.nom || '')).trim();
            respMap[u.id] = full || u.nom || u.id;
        }
    });

    const canContribute = (typeof _execCanContribute === 'function') ? _execCanContribute() : true;

    // Lookups for Domaine / Secteur display in the plan header bar
    const allDomaines = EXEC_STATE.data.domaines || [];
    const allSecteurs = EXEC_STATE.data.secteurs || [];
    const domMap = {}; allDomaines.forEach(d => { domMap[d.id] = d; });
    const secMap = {}; allSecteurs.forEach(s => { secMap[s.id] = s; });

    // Dossiers indexed by notification_id for closure-rate computation
    const dossiers = EXEC_STATE.data.dossiers || [];
    const dossierByNotif = {};
    dossiers.forEach(d => { if (d.notification_id) dossierByNotif[d.notification_id] = d; });

    let html = '';
    visiblePlans.forEach(({ plan, acts }) => {
        const nbPrest = [...new Set(acts.map(a => a.prestataire_id))].length;
        // Taux de clôture : ratio d'activités dont la notif est "acte" OU le dossier "cloture"
        const closedCount = acts.reduce((n, a) => {
            const notif = notifByActId[a.id];
            if (!notif) return n;
            if (notif.statut === 'acte') return n + 1;
            const dos = dossierByNotif[notif.id];
            if (dos && dos.statut === 'cloture') return n + 1;
            return n;
        }, 0);
        const tauxCloture = acts.length > 0 ? Math.round((closedCount / acts.length) * 100) : 0;
        const domNom = plan.domaine_id && domMap[plan.domaine_id] ? (domMap[plan.domaine_id].code || domMap[plan.domaine_id].sigle || domMap[plan.domaine_id].nom) : '-';
        const secNom = plan.secteur_id && secMap[plan.secteur_id] ? (secMap[plan.secteur_id].code || secMap[plan.secteur_id].sigle || secMap[plan.secteur_id].nom) : '-';
        // Plans étendus par défaut.
        const expanded = ' expanded';
        html += `
        <div class="card${expanded}" style="margin-bottom:0.75rem;">
            <div class="exec-accordion-header" onclick="this.parentElement.classList.toggle('expanded')" style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;padding:0.35rem 0.6rem;font-weight:600;flex-wrap:wrap;background:#e0f2fe;border-radius:6px 6px 0 0;font-size:0.85rem;">
                <span class="exec-form-section-chevron" style="transition:transform 0.2s;">${EXEC_ICONS.chevronDown}</span>
                ${EXEC_ICONS.plans} <span>${_esc(plan.titre || plan.reference || plan.id)}</span>
                <span style="color:#334155;font-weight:500;font-size:0.78rem;display:inline-flex;flex-wrap:wrap;gap:0.4rem;align-items:center;text-transform:uppercase;letter-spacing:0.02em;">
                    <span>· ${te('annee') || 'Année'}: <strong style="color:#0f172a;">${plan.annee || '-'}</strong></span>
                    <span>· ${te('domaine') || 'Domaine'}: <strong style="color:#0f172a;">${_esc(domNom)}</strong></span>
                    <span>· ${te('secteur') || 'Secteur'}: <strong style="color:#0f172a;">${_esc(secNom)}</strong></span>
                    <span>· ${te('nb_prestataires')}: <strong style="color:#0f172a;">${nbPrest}</strong></span>
                    <span>· ${te('nb_activites') || te('activites')}: <strong style="color:#0f172a;">${acts.length}</strong></span>
                    <span>· ${te('taux_cloture') || 'Taux clôturé'}: <strong style="color:#166534;">${tauxCloture}%</strong></span>
                </span>
                <span style="margin-left:auto;">${_execStatusBadge('valide')}</span>
            </div>
            <div class="exec-accordion-body" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
                <table class="exec-data-table exec-compact-table" style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
                    <thead><tr>
                        <th style="width:160px;">${te('provider')}</th>
                        <th style="width:300px;">${te('objet')}</th>
                        <th style="width:95px;">${te('date_debut')}</th>
                        <th style="width:95px;">${te('date_fin')}</th>
                        <th style="width:150px;">${te('responsable')}</th>
                        <th style="width:110px;">${te('status')}</th>
                        <th style="width:110px;text-align:center;">${te('actions')}</th>
                    </tr></thead>
                    <tbody>
                    ${acts.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data')}</td></tr>` :
                    acts.map(a => {
                        const notif = notifByActId[a.id];
                        const statut = notif ? notif.statut : 'planifie';
                        const dos = notif ? dossierByNotif[notif.id] : null;
                        const isCloture = (dos && dos.statut === 'cloture') || statut === 'acte';
                        // Days until date_debut (negative = already past)
                        let daysUntil = null;
                        if (a.date_debut) {
                            const d = new Date(String(a.date_debut).substring(0, 10));
                            if (!isNaN(d.getTime())) {
                                const t0 = new Date(); t0.setHours(0,0,0,0);
                                daysUntil = Math.ceil((d - t0) / (24*60*60*1000));
                            }
                        }
                        // Row color rules (priorité descendante)
                        //  1. Clôturée (dossier cloture OU notif acte) → vert
                        //  2. Déclenchée (notif existe) mais pas clôturée → bleu
                        //  3. Non déclenchée + date_debut passée → rouge gras
                        //  4. Non déclenchée + <=15 jours → rouge
                        //  5. Non déclenchée + <=30 jours → orange
                        // NB: !important requis car .exec-data-table td { color: var(--text); }
                        // a une spécificité supérieure à `color` hérité depuis <tr>.
                        let rowColor = '', rowWeight = '';
                        if (isCloture) {
                            rowColor = '#166534';                                   // vert foncé
                        } else if (notif) {
                            rowColor = '#1d4ed8';                                   // bleu
                        } else if (daysUntil !== null && daysUntil < 0) {
                            rowColor = '#b91c1c'; rowWeight = '700';                // rouge gras
                        } else if (daysUntil !== null && daysUntil <= 15) {
                            rowColor = '#dc2626';                                   // rouge
                        } else if (daysUntil !== null && daysUntil <= 30) {
                            rowColor = '#ea580c';                                   // orange
                        }
                        const tdColorStyle = rowColor ? `color:${rowColor} !important;${rowWeight ? `font-weight:${rowWeight} !important;` : ''}` : '';
                        // Responsable: prefer responsable_id (FK to inspecteurs/users),
                        // fallback to first entry of legacy inspecteurs array.
                        let resp = '-';
                        if (a.responsable_id && respMap[a.responsable_id]) {
                            resp = _esc(respMap[a.responsable_id]);
                        } else {
                            let rawInsp = a.inspecteurs || [];
                            if (typeof rawInsp === 'string') { try { rawInsp = JSON.parse(rawInsp); } catch(e) { rawInsp = []; } }
                            if (Array.isArray(rawInsp) && rawInsp.length > 0) {
                                const first = rawInsp[0];
                                if (typeof first === 'string') {
                                    resp = _esc(respMap[first] || first);
                                } else if (first && typeof first === 'object') {
                                    resp = _esc(first.nom || respMap[first.id] || '-');
                                }
                            }
                        }
                        // "Déclencher" action: only shown when no notification exists
                        // yet for this activity (triggering creates the notification).
                        const canTrigger = canContribute && !notif;
                        return `<tr class="exec-act-row" style="cursor:pointer;" onclick="if(!event.target.closest('button'))execOpenActiviteProcessus('${plan.id}','${a.id}')" title="Ouvrir le processus de l'activité">
                            <td style="${tdColorStyle}">${_esc(a.prestataire_nom || '-')}</td>
                            <td style="${tdColorStyle}">${_esc(a.objet || a.description || '-')}</td>
                            <td style="${tdColorStyle}">${_formatDate(a.date_debut)}</td>
                            <td style="${tdColorStyle}">${_formatDate(a.date_fin)}</td>
                            <td style="${tdColorStyle}">${resp}</td>
                            <td>${typeof execProcStatutBadge === 'function'
                                // Statut exprimé dans les termes du fil d'avancement du processus.
                                ? execProcStatutBadge(notif, dos)
                                : (dos
                                    ? `<span class="status-badge" style="background:#3b82f615;color:#1d4ed8;border:1px solid #3b82f640;">${_esc(_dossierStepLabel(dos))}</span>`
                                    : _execStatusBadge(statut))}</td>
                            <td style="white-space:nowrap;text-align:center;">
                                ${canTrigger ? `<button class="btn-icon" onclick="execStartNotification('${plan.id}','${a.id}')" title="${te('declencher')}">${EXEC_ICONS.send}</button>` : ''}
                                <button class="btn-icon" onclick="execShowActiviteHistorique('${a.id}','${plan.id}')" title="${te('historique')}">${EXEC_ICONS.clock}</button>
                            </td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    });
    return html;
}




async function execStartNotification(planId, activiteId) {
    const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    const plan = plans.find(p => p.id === planId);
    const act = plan ? (plan.activites || []).find(a => a.id === activiteId) : null;
    if (!act) return;

    // Build perimetre from sous-activités + thèmes couverts
    const sousActs = EXEC_STATE.data.sousActivites || [];
    const allThemes = EXEC_STATE.data.themesSupervision || [];
    let sousActIds = [];
    try { sousActIds = JSON.parse(act.sous_activite_ids || '[]'); } catch(e) {}
    if (!sousActIds.length && act.sous_activite_id) sousActIds = [act.sous_activite_id];
    let selectedThemeIds = [];
    try { selectedThemeIds = JSON.parse(act.themes_couverts || '[]'); } catch(e) {}

    // Format: each sous-activité on its own line, with associated themes in parentheses
    const perimetreLines = sousActIds.map(saId => {
        const sa = sousActs.find(x => x.id === saId);
        const saName = sa ? sa.nom : saId;
        // Find themes linked to this sous-activité AND selected in the activity
        const saThemes = allThemes.filter(t => t.sous_activite_id === saId && (selectedThemeIds.length === 0 || selectedThemeIds.includes(t.id)));
        const themeLabels = saThemes.map(t => t.libelle || t.nom || t.id);
        return themeLabels.length > 0 ? `- ${saName} (${themeLabels.join(' ; ')})` : `- ${saName}`;
    });
    const perimetreVal = act.perimetre || perimetreLines.join('\n') || '';

    // ─── Inopiné : bypass notification workflow ───────────────────────────
    // Pour une activité de type « Inopiné », il n'y a pas de notification au
    // postulant. Le clic sur « Déclencher » saute les étapes du menu
    // Déclenchement et crée directement un dossier dans le menu Exécution.
    const typesSup = EXEC_STATE.data.typesSupervision || [];
    const tsEntry = typesSup.find(t => t.id === act.type_supervision_id);
    const tsLabel = (act.type_supervision || (tsEntry && tsEntry.type_supervision) || '').toString().toLowerCase();
    const isInopine = tsLabel.indexOf('inopin') !== -1 || act.type_supervision_id === 'TCAT_INO';
    if (isInopine) {
        try {
            // 1. Crée la notification (le backend force statut='brouillon' à la création).
            const notifPayload = {
                activite_id: activiteId,
                plan_id: planId,
                prestataire_id: act.prestataire_id || '',
                secteur_id: act.secteur_id || '',
                objet: act.objet || act.description || '',
                objet_activite: act.objet || act.description || '',
                perimetre: perimetreVal,
                type_supervision: act.type_supervision || (tsEntry && tsEntry.type_supervision) || 'Inopiné',
                date_debut_prevue: act.date_debut || '',
                date_fin_prevue: act.date_fin || '',
                lieu: act.lieu_activite || '',
                programme: [],
                equipe: [],
                pieces_jointes: []
            };
            const notif = await api(`${EXEC_MODULE_API}/notifications`, { method: 'POST', body: JSON.stringify(notifPayload) });
            if (!notif || !notif.id) throw new Error('Notification id manquant');
            // 2. Force la notification au statut 'acte' (pré-requis pour créer
            //    un dossier). Pour une activité inopinée on saute les étapes
            //    soumission/validation/envoi qui n'ont pas lieu d'être.
            const nowIso = new Date().toISOString();
            // On renseigne aussi date_debut_effective / date_fin_effective : le
            // backend create_dossier lit ces champs en priorité pour remplir la
            // date de début d'exécution du dossier. Sans ça, le dossier se
            // crée avec une date_debut vide même si l'activité en a une.
            await api(`${EXEC_MODULE_API}/notifications/${notif.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    statut: 'acte',
                    date_envoi: nowIso,
                    date_validation: nowIso,
                    date_accord: nowIso,
                    date_debut_effective: act.date_debut || '',
                    date_fin_effective: act.date_fin || ''
                })
            });
            // 3. Crée immédiatement le dossier d'exécution lié.
            const dossier = await api(`${EXEC_MODULE_API}/dossiers`, {
                method: 'POST',
                body: JSON.stringify({ notification_id: notif.id })
            });
            await execRefreshDynamic();
            _execToast(te('dossier_inopine_cree') || 'Dossier inopiné créé', 'success');
            execRenderPage();
            if (dossier && dossier.id) execOpenDossierSlider(dossier.id, 'realisation');
        } catch (e) {
            console.error('execStartNotification inopine error:', e);
            _execToast('Erreur lors du déclenchement inopiné: ' + ((e && e.message) || ''), 'error');
        }
        return;
    }

    execCloseSlider();
    execOpenNotificationForm({
        activite_id: activiteId,
        plan_id: planId,
        prestataire_id: act.prestataire_id || '',
        prestataire_nom: act.prestataire_nom || '',
        secteur_id: act.secteur_id || '',
        objet: act.objet || act.description || '',
        perimetre: perimetreVal,
        type_supervision: act.type_supervision || '',
        date_debut_prevue: act.date_debut || '',
        date_fin_prevue: act.date_fin || '',
        lieu: act.lieu_activite || '',
        programme: [],
        equipe: [],
        pieces_jointes: []
    });
}

// Historique : chronological list of every action on the activity, from
// triggering to closure. Built from the data already present in EXEC_STATE
// (plan validation, notification lifecycle, dossier lifecycle, rapports, etc.).
function execShowActiviteHistorique(activiteId, planId) {
    const plans = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    const plan = plans.find(p => p.id === planId);
    const act = plan ? (plan.activites || []).find(a => a.id === activiteId) : null;
    if (!act) return;

    const notifs = EXEC_STATE.data.notifications || [];
    const notif = notifs.find(n => n.activite_id === activiteId) || null;
    const dossiers = EXEC_STATE.data.dossiers || [];
    const dossier = notif ? dossiers.find(d => d.notification_id === notif.id) : null;
    const rapports = EXEC_STATE.data.rapports || [];
    const actRapports = rapports.filter(r =>
        (r.dossier_id && dossier && r.dossier_id === dossier.id) ||
        (r.activite_id && r.activite_id === activiteId));

    // Résolution acteur : id utilisateur -> "Prénom Nom"
    const _userMap = {};
    (EXEC_STATE.data.inspecteurs || []).forEach(u => {
        _userMap[u.id] = `${u.prenom || ''} ${u.nom || ''}`.trim();
    });
    (EXEC_STATE.data.users || []).forEach(u => {
        _userMap[u.id] = `${u.prenom || ''} ${u.nom || ''}`.trim();
    });
    const _cu = EXEC_STATE.user || {};
    if (_cu.id) _userMap[_cu.id] = `${_cu.prenom || ''} ${_cu.nom || ''}`.trim() || _cu.nom || _cu.id;
    const _actor = a => a ? (_userMap[a] || a) : '';

    // Each event: { date, label, actor }
    const events = [];
    const pushEvt = (date, label, actor) => { if (label) events.push({ date: date || '', label, actor: _actor(actor) }); };

    // Planification → validated plan
    pushEvt(plan?.date_validation || plan?.date_mise_a_jour, `${te('plan')} validé : ${_esc(plan?.titre || '')}`, plan?.valide_par || '');

    if (notif) {
        pushEvt(notif.date_creation || notif.created_at, 'Notification créée', notif.created_by || notif.auteur_nom);
        if (notif.date_soumission) pushEvt(notif.date_soumission, 'Notification soumise', notif.soumis_par || '');
        if (notif.date_validation) pushEvt(notif.date_validation, 'Notification validée', notif.valideur_id || notif.valide_par || '');
        if (notif.date_rejet) pushEvt(notif.date_rejet, 'Notification rejetée', notif.rejete_par || '');
        if (notif.date_envoi) pushEvt(notif.date_envoi, 'Notification envoyée', notif.envoye_par || '');
        if (notif.date_acte) pushEvt(notif.date_acte, 'Notification actée (accusé de réception)', notif.acte_par || '');
    }

    if (dossier) {
        pushEvt(dossier.date_ouverture || dossier.date_creation, 'Dossier ouvert', dossier.created_by || '');
        if (dossier.realisation_date_debut || dossier.date_debut_execution)
            pushEvt(dossier.realisation_date_debut || dossier.date_debut_execution, 'Réalisation — début terrain', dossier.created_by || '');
        if (dossier.date_fin_execution)
            pushEvt(dossier.date_fin_execution, 'Réalisation — clôture terrain', dossier.created_by || '');
        if (dossier.date_soumission)
            pushEvt(dossier.date_soumission, 'Rapport soumis pour validation', dossier.created_by || '');
        if (dossier.statut === 'cloture') {
            pushEvt(dossier.date_maj, 'Dossier clôturé', dossier.created_by || '');
        } else {
            const _sl = DOSSIER_WORKFLOW_STEPS.find(x => x.id === (dossier.current_step || ''));
            if (_sl) pushEvt(dossier.date_maj, `Étape en cours : ${_sl.label}`, dossier.created_by || '');
        }
    }

    (actRapports || []).forEach(r => {
        if (r.date_creation) pushEvt(r.date_creation, `Rapport ${_esc(r.reference || r.titre || '')} créé`, r.auteur_nom || r.created_by || '');
        if (r.date_validation) pushEvt(r.date_validation, `Rapport ${_esc(r.reference || '')} validé`, r.valide_par || '');
    });

    // Sort chronologically (empty dates sink to the top as 'planned')
    events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Couleur dégradée vert → bleu selon la position de l'étape.
    const _histColor = (i, n) => {
        const g = [34, 197, 94], b = [37, 99, 235];
        const t = n <= 1 ? 0 : i / (n - 1);
        const c = g.map((v, k) => Math.round(v + (b[k] - v) * t));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    };
    const _n = events.length;
    const bodyHtml = `
    <div style="padding:1.5rem 1.25rem;background:#f4f5f7;min-height:100%;">
        <div style="text-align:center;margin-bottom:1.75rem;">
            <div style="font-size:0.68rem;letter-spacing:0.22em;text-transform:uppercase;color:#94a3b8;">${_esc(act.objet || act.description || '')}</div>
            <div style="font-size:0.74rem;color:#94a3b8;margin-top:0.35rem;">${_esc(act.prestataire_nom || '')} · ${_formatDate(act.date_debut)} – ${_formatDate(act.date_fin)}</div>
        </div>
        ${_n === 0 ? `<p style="color:#94a3b8;text-align:center;padding:1.5rem 0;">${te('no_data')}</p>` : `
        <div style="display:flex;flex-direction:column;">
            ${events.map((e, i) => {
                const col = _histColor(i, _n);
                const last = i === _n - 1;
                return `<div style="display:flex;gap:0.9rem;align-items:stretch;">
                <div style="position:relative;width:48px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;">
                    ${!last ? `<div style="position:absolute;top:23px;bottom:-6px;width:7px;background:${col};border-radius:4px;"></div>` : ''}
                    <div style="position:relative;width:46px;height:46px;border-radius:50%;background:#fff;border:3px solid ${col};display:flex;align-items:center;justify-content:center;font-weight:800;color:${col};font-size:0.92rem;box-shadow:0 2px 7px rgba(0,0,0,0.13);">${String(i + 1).padStart(2, '0')}</div>
                </div>
                <div style="flex:1;min-width:0;padding-top:0.35rem;padding-bottom:${last ? '0' : '1.5rem'};">
                    <div style="font-size:0.92rem;font-weight:700;color:${col};">${e.label}</div>
                    <div style="font-size:0.78rem;color:#94a3b8;margin-top:0.15rem;">${_formatDatetime ? _formatDatetime(e.date) : _formatDate(e.date)}${e.actor ? ' · ' + _esc(e.actor) : ''}</div>
                </div>
            </div>`;
            }).join('')}
        </div>`}
    </div>`;

    execShowSlider(`${EXEC_ICONS.clock} ${te('historique')}`, bodyHtml, '', 'third');
}

// ══════════════════════════════════════
//  3. DECLENCHEMENT & NOTIFICATIONS
// ══════════════════════════════════════


function execRenderDeclenchement() {
    const tab = EXEC_STATE.triggerTab;
    const notifs = EXEC_STATE.data.notifications || [];
    const plansValides = EXEC_STATE.data.plansValides || [];

    // Classify notifications
    const brouillons = notifs.filter(n => n.statut === 'brouillon');
    const soumis = notifs.filter(n => n.statut === 'soumis' || n.statut === 'valide');
    const envoyes = notifs.filter(n => n.statut === 'envoye');

    // All activities from validated plans not yet notified
    const notifiedActIds = new Set(notifs.map(n => n.activite_id));
    let aNotifier = [];
    plansValides.forEach(p => {
        (p.activites || []).forEach(a => {
            if (!notifiedActIds.has(a.id)) {
                const days = _daysUntil(a.date_debut);
                // Onglet "A Notifier" : seulement délai restant <= 31 jours
                if (days !== null && days <= 31) {
                    aNotifier.push({ ...a, plan_id: p.id, plan_titre: p.titre, daysUntil: days });
                }
            }
        });
    });
    aNotifier.sort((a, b) => {
        const da = a.daysUntil ?? 9999;
        const db = b.daysUntil ?? 9999;
        return da - db;
    });

    const counts = {
        a_notifier: aNotifier.length,
        brouillons: brouillons.length,
        soumis: soumis.length,
        envoyes: envoyes.length
    };

    let tabContent = '';
    switch (tab) {
        case 'a_notifier': tabContent = _renderTabANotifier(aNotifier); break;
        case 'brouillons': tabContent = _renderTabBrouillons(brouillons); break;
        case 'soumis': tabContent = _renderTabSoumis(soumis); break;
        case 'envoyes': tabContent = _renderTabEnvoyes(envoyes); break;
    }

    // Map tab to workflow step for visualization
    const tabToStep = { a_notifier: 'a_notifier', brouillons: 'brouillon', soumis: 'soumis', envoyes: 'envoye' };

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('declenchement')}</h2>
        </div>

        <div class="exec-workflow-tabs">
            ${['a_notifier', 'brouillons', 'soumis', 'envoyes'].map(t => {
                const keys = { a_notifier: 'a_notifier', brouillons: 'brouillons', soumis: 'soumis_tab', envoyes: 'envoyes_echanges' };
                return `<button class="exec-tab ${tab === t ? 'active' : ''}" onclick="EXEC_STATE.triggerTab='${t}';execRenderPage();">
                    ${te(keys[t])} <span class="exec-tab-badge">${counts[t]}</span>
                </button>`;
            }).join('')}
        </div>

        ${tabContent}
    </div>`;
}

function _renderTabANotifier(items) {
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('date_debut')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('type')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('delai_restant')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                items.map(a => `<tr>
                    <td>${_formatDate(a.date_debut)}</td>
                    <td><strong>${_esc(a.prestataire_nom || '')}</strong></td>
                    <td>${_esc(a.type_supervision || '')}</td>
                    <td>${_esc(a.objet || '').substring(0, 50)}</td>
                    <td>${_daysUntilBadge(a.date_debut)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execShowContacts('${a.prestataire_id || ''}')" title="${te('contacts')}">${EXEC_ICONS.contact}</button>
                        <button class="btn btn-sm btn-accent" onclick="execStartNotification('${a.plan_id}', '${a.id}')" title="${te('renseigner')}">${EXEC_ICONS.fillForm}</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function _renderTabBrouillons(items) {
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('reference')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('date')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                items.map(n => `<tr>
                    <td>
                        <strong>${_esc(n.reference || '')}</strong>
                        ${n.motif_rejet ? `<div style="margin-top:0.3rem;padding:0.3rem 0.5rem;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:4px;font-size:0.78rem;color:#ef4444;">
                            <strong>Motif de rejet :</strong> ${_esc(n.motif_rejet)}
                        </div>` : ''}
                    </td>
                    <td>${_esc(n.prestataire_nom || '')}</td>
                    <td>${_esc(n.objet || '').substring(0, 50)}</td>
                    <td>${_formatDate(n.date_creation)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execEditNotification('${n.id}')" title="${te('continuer_edition')}">
                            ${EXEC_ICONS.edit}
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="execSubmitBrouillon('${n.id}')" title="${te('soumettre_validation')}">
                            ${EXEC_ICONS.send}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="execDeleteBrouillon('${n.id}')" title="${te('delete')}">
                            ${EXEC_ICONS.delete}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function _renderTabSoumis(items) {
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('reference')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('status')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                items.map(n => `<tr>
                    <td><strong>${_esc(n.reference || '')}</strong></td>
                    <td>${_esc(n.prestataire_nom || '')}</td>
                    <td>${_esc(n.objet || '').substring(0, 50)}</td>
                    <td>${_execStatusBadge(n.statut)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execPreviewNotification('${n.id}')" title="${te('apercu')}">
                            ${EXEC_ICONS.eye}
                        </button>
                        ${_execCanValidate() && n.statut === 'soumis' ? `
                        <button class="btn btn-sm btn-success" onclick="execValidateNotification('${n.id}')" title="${te('valider')}">${EXEC_ICONS.check}</button>
                        <button class="btn btn-sm btn-danger" onclick="execRejectNotification('${n.id}')" title="${te('rejeter')}">${EXEC_ICONS.x}</button>
                        ` : ''}
                        ${n.statut === 'valide' ? `
                        <button class="btn btn-sm btn-accent" onclick="execSendNotification('${n.id}')">
                            ${EXEC_ICONS.send} ${te('envoyer')}
                        </button>` : ''}
                        <button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="execCancelNotification('${n.id}', 'soumis')" title="Annuler et retourner en brouillon">
                            ${EXEC_ICONS.undo}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

function _renderTabEnvoyes(items) {
    // Filter out "acte" status - those move to Execution page
    const envoyeItems = items.filter(n => n.statut !== 'acte');
    return `
    <div class="card">
        <table class="exec-data-table">
            <thead>
                <tr>
                    <th>${te('reference')}</th>
                    <th>${te('provider')}</th>
                    <th>${te('objet')}</th>
                    <th>${te('status')}</th>
                    <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${envoyeItems.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                envoyeItems.map(n => {
                    const isPrest = _execIsPrestataire();
                    const roAttr = 'readonly disabled';
                    const accDebut = n.date_debut_effective || n.date_activite || '';
                    const accFin = n.date_fin_effective || '';
                    const accPerim = _esc(n.perimetre_valide || n.perimetre_activite || '');
                    return `<tr>
                    <td><strong>${_esc(n.reference || '')}</strong></td>
                    <td>${_esc(n.prestataire_nom || '')}</td>
                    <td>${_esc(n.objet || '').substring(0, 50)}</td>
                    <td>${_execStatusBadge(n.statut)}</td>
                    <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                        <button class="btn btn-sm btn-outline" onclick="execToggleEnvoiPanel('${n.id}', this)" title="${te('valider_accord')}">
                            ${EXEC_ICONS.chevronDown}
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="execOpenExchangeSlider('${n.id}')" title="${te('gerer_echange')}">
                            ${EXEC_ICONS.chat}
                        </button>
                        ${!isPrest ? `
                        <button class="btn btn-sm btn-accent" onclick="execValidateAccordRow('${n.id}')" title="${te('valider_accord')}">
                            ${EXEC_ICONS.check}
                        </button>` : ''}
                        <button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="execCancelNotification('${n.id}', 'envoyes')" title="Annuler et retourner en brouillon">
                            ${EXEC_ICONS.undo}
                        </button>
                    </td>
                </tr>
                <tr id="exec_envoi_panel_${n.id}" style="display:none;">
                    <td colspan="5" style="background:var(--bg);padding:0.55rem 0.75rem;">
                        <div style="display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap;">
                            <div style="display:flex;flex-direction:column;gap:0.15rem;">
                                <label style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">${te('date_debut')}</label>
                                <input type="date" class="form-input" id="exec_row_debut_${n.id}" value="${accDebut}" style="height:30px;padding:0.2rem 0.45rem;font-size:0.8rem;" ${roAttr}>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.15rem;">
                                <label style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">${te('date_fin')}</label>
                                <input type="date" class="form-input" id="exec_row_fin_${n.id}" value="${accFin}" style="height:30px;padding:0.2rem 0.45rem;font-size:0.8rem;" ${roAttr}>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.15rem;flex:1;min-width:220px;">
                                <label style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">Valider ${te('perimetre')}</label>
                                <textarea class="form-input" id="exec_row_perimetre_${n.id}" rows="2" style="resize:vertical;padding:0.25rem 0.45rem;font-size:0.8rem;line-height:1.3;min-height:42px;height:42px;" ${roAttr}>${accPerim}</textarea>
                            </div>
                        </div>
                    </td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// ══════════════════════════════════════
//  NOTIFICATION FORM SLIDER
// ══════════════════════════════════════

function execOpenNotificationForm(data) {
    data = data || {};
    EXEC_STATE.selectedNotification = data;

    const prestataires = EXEC_STATE.data.prestataires || [];
    const inspecteurs = EXEC_STATE.data.inspecteurs || [];
    const typesSupervision = EXEC_STATE.data.typesSupervision || [];
    const aac = EXEC_STATE.data.aac || {};
    const prest = prestataires.find(p => p.id === data.prestataire_id) || {};

    const programme = data.programme || [];
    const equipe = data.equipe || [];

    // Map DB column names to form-friendly names for loading
    const dateFinVal = data.date_fin_prevue || data.date_fin_effective || '';
    const dateDebutVal = data.date_debut_prevue || data.date_activite || '';
    const natureVal = data.type_supervision || data.nature_activite || '';
    const objetVal = data.objet || data.objet_activite || '';
    const lieuVal = data.lieu || data.lieu_activite || '';
    const perimetreVal = data.perimetre || data.perimetre_activite || '';
    const fonctionRespVal = data.fonction_responsable || data.prestataire_responsable_fonction || '';
    const dirigeantVal = data.dirigeant || data.prestataire_dirigeant_nom || '';
    const interlocuteurVal = data.interlocuteur || prest.fonction_point_focal || data.prestataire_interlocuteur || '';
    const dateSigVal = data.date_signature || data.date_edition || new Date().toISOString().slice(0, 10);

    const bodyHtml = `
    <div class="exec-form-sections">

        ${_execFormSection('A', 'section_a_prestataire', `
            <!-- Row 1: Designation ; Fonction 1er Responsable ; Nom 1er Responsable -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div class="form-group">
                    <label>${te('designation')}</label>
                    <select class="form-select" id="notif_prestataire_id" onchange="execUpdatePrestataireFields()">
                        <option value="">${te('select_option')}</option>
                        ${prestataires.map(p => `<option value="${p.id}" ${data.prestataire_id === p.id ? 'selected' : ''}>${_esc(p.nom)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${te('fonction_responsable')}</label>
                    <input type="text" class="form-input" id="notif_fonction_resp" value="${_esc(prest.fonction_responsable || fonctionRespVal)}">
                </div>
                <div class="form-group">
                    <label>${te('nom_responsable')}</label>
                    <input type="text" class="form-input" id="notif_nom_resp" value="${_esc(prest.dirigeant || data.nom_responsable || dirigeantVal)}">
                </div>
            </div>
            <!-- Row 2: Interlocuteur (Fonction) ; Interlocuteur (Nom) ; Interlocuteur (Email) -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('interlocuteur')}</label>
                    <input type="text" class="form-input" id="notif_interlocuteur" value="${_esc(prest.interlocuteur || interlocuteurVal)}">
                </div>
                <div class="form-group">
                    <label>${te('interlocuteur_nom')}</label>
                    <input type="text" class="form-input" id="notif_interlocuteur_nom" value="${_esc(data.interlocuteur_nom || prest.point_focal || '')}">
                </div>
                <div class="form-group">
                    <label>${te('interlocuteur_email')}</label>
                    <input type="email" class="form-input" id="notif_interlocuteur_email" value="${_esc(data.interlocuteur_email || prest.email_point_focal || '')}">
                </div>
            </div>
        `, true)}

        ${_execFormSection('B', 'section_b_equipe_audit', `
            <div id="notif_equipe_container">
                ${equipe.length === 0 ? `<p style="color:var(--text-muted);font-size:0.83rem;">${te('no_data')}</p>` :
                equipe.map((m, i) => {
                    const nom = typeof m === 'string' ? m : (m.nom || '');
                    const role = typeof m === 'object' ? (m.role || '') : '';
                    const roles = ["Chef d'équipe", "Membre d'équipe", "Stagiaire", "Formation en cours d'emploi", "Experts ou Autres"];
                    const inspList = _getFilteredInspecteurs();
                    return `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                    <select class="form-select equipe-nom-select" style="flex:1;">
                        <option value="">-- Inspecteur --</option>
                        ${inspList.map(ins => `<option value="${_esc(ins.prenom + ' ' + ins.nom)}" ${nom === (ins.prenom + ' ' + ins.nom) ? 'selected' : ''}>${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
                        ${nom && !inspList.some(ins => (ins.prenom + ' ' + ins.nom) === nom) ? `<option value="${_esc(nom)}" selected>${_esc(nom)}</option>` : ''}
                    </select>
                    <select class="form-select" style="flex:1;">
                        <option value="">${te('select_option')}</option>
                        ${roles.map(r => `<option value="${_esc(r)}" ${role===r?'selected':''}>${_esc(r)}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`;
                }).join('')}
            </div>
            <button class="btn btn-sm btn-outline" onclick="execAddEquipeMember()" style="margin-top:0.35rem;">
                ${EXEC_ICONS.add} ${te('ajouter_membre')}
            </button>
        `, true)}

        ${_execFormSection('C1', 'section_c1_activite', `
            <!-- Row 1: Nature ; Date Debut ; Date Fin ; Lieu -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div class="form-group">
                    <label>${te('nature_activite')}</label>
                    <select class="form-select" id="notif_type_supervision">
                        <option value="">${te('select_option')}</option>
                        <option value="audit" ${natureVal === 'audit' ? 'selected' : ''}>Audit</option>
                        <option value="inspection" ${natureVal === 'inspection' ? 'selected' : ''}>Inspection</option>
                        <option value="autres" ${natureVal === 'autres' ? 'selected' : ''}>Autres</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${te('date_debut')}</label>
                    <input type="date" class="form-input" id="notif_date_debut" value="${dateDebutVal}">
                </div>
                <div class="form-group">
                    <label>${te('date_fin')}</label>
                    <input type="date" class="form-input" id="notif_date_fin" value="${dateFinVal}">
                </div>
                <div class="form-group">
                    <label>${te('lieu')}</label>
                    <input type="text" class="form-input" id="notif_lieu" value="${_esc(lieuVal)}">
                </div>
            </div>
            <!-- Row 2: Objet ; Perimetre -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div class="form-group">
                    <label>${te('objet')}</label>
                    <textarea class="form-input" id="notif_objet" rows="1">${_esc(objetVal)}</textarea>
                </div>
                <div class="form-group">
                    <label>${te('perimetre')}</label>
                    <textarea class="form-input" id="notif_perimetre" rows="4" style="resize:vertical;">${_esc(perimetreVal)}</textarea>
                </div>
            </div>
            <!-- Row 3: Referentiels ; Documents Requis -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('referentiels')}</label>
                    <textarea class="form-input" id="notif_referentiels" rows="1" placeholder="OACI Annexe, RAG, Circulaires...">${_esc(data.referentiels || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>${te('documents_requis')}</label>
                    <textarea class="form-input" id="notif_documents" rows="1" placeholder="Manuel d'exploitation, certificats...">${_esc(data.documents_requis || '')}</textarea>
                </div>
            </div>
        `, true)}

        ${_execFormSection('C2', 'section_c2_programme', `
            <table class="exec-data-table" id="notif_programme_table">
                <thead>
                    <tr>
                        <th>${te('date')}</th>
                        <th>${te('horaire')}</th>
                        <th>${te('actions_prevues')}</th>
                        <th>${te('correspondant')}</th>
                        <th style="width:60px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${programme.length === 0 ? `<tr id="notif_prog_empty"><td colspan="5" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    programme.map((p, i) => `<tr data-prog-idx="${i}">
                        <td><input type="date" class="form-input" value="${p.date || ''}" data-field="date"></td>
                        <td><input type="text" class="form-input" value="${_esc(p.horaire || '')}" data-field="horaire" placeholder="09:00-12:00"></td>
                        <td><input type="text" class="form-input" value="${_esc(p.actions || '')}" data-field="actions"></td>
                        <td><input type="text" class="form-input" value="${_esc(p.correspondant || '')}" data-field="correspondant"></td>
                        <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <button class="btn btn-sm btn-outline" onclick="execAddProgrammeLine()" style="margin-top:0.5rem;">
                ${EXEC_ICONS.add} ${te('ajouter_programme')}
            </button>
        `, false)}

        ${_execFormSection('F', 'section_f_signature', `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('fait_a')}</label>
                    <input type="text" class="form-input" id="notif_fait_a" value="${_esc(data.fait_a || '')}">
                </div>
                <div class="form-group">
                    <label>${te('date_signature')}</label>
                    <input type="date" class="form-input" id="notif_date_sig" value="${dateSigVal}">
                </div>
                <div class="form-group">
                    <label>${te('signataire')}</label>
                    <input type="text" class="form-input" id="notif_signataire" value="${_esc(data.signataire || EXEC_STATE.user?.nom || '')}">
                </div>
            </div>
        `, false)}
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel')}</button>
        <button class="btn btn-primary" onclick="execSaveNotificationDraft()">
            ${EXEC_ICONS.clipboard} ${te('sauvegarder_brouillon')}
        </button>
        <button class="btn btn-accent" onclick="execPreviewNotificationFromForm()">
            ${EXEC_ICONS.eye} ${te('apercu_fiche')}
        </button>
    `;

    execShowSlider(`${EXEC_ICONS.trigger} Notification`, bodyHtml, footerHtml, 'max');
}

function _getFilteredInspecteurs() {
    const inspecteurs = EXEC_STATE.data.inspecteurs || [];
    // Get domain of the selected prestataire
    const prestId = document.getElementById('notif_prestataire_id')?.value || EXEC_STATE.selectedNotification?.prestataire_id || '';
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestId);
    let domaineId = '';
    if (prest) {
        // Get domaine from prestataire's secteur
        const secteur = (EXEC_STATE.data.secteurs || []).find(s => s.id === prest.secteur_id);
        domaineId = secteur ? secteur.domaine_id : '';
    }
    if (!domaineId) return inspecteurs.filter(i => i.statut !== 'inactif');
    // Filter inspectors whose domaines array includes this domaine
    return inspecteurs.filter(i => {
        if (i.statut === 'inactif') return false;
        let doms = i.domaines;
        if (typeof doms === 'string') { try { doms = JSON.parse(doms); } catch(e) { doms = []; } }
        if (!Array.isArray(doms)) return true; // No domain filter if not set
        return doms.length === 0 || doms.includes(domaineId);
    });
}

function execAddEquipeMember() {
    const container = document.getElementById('notif_equipe_container');
    if (!container) return;
    const emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;';
    const roles = ["Chef d'équipe", "Membre d'équipe", "Stagiaire", "Formation en cours d'emploi", "Experts ou Autres"];
    const inspList = _getFilteredInspecteurs();
    div.innerHTML = `
        <select class="form-select equipe-nom-select" style="flex:1;">
            <option value="">-- Inspecteur --</option>
            ${inspList.map(ins => `<option value="${_esc(ins.prenom + ' ' + ins.nom)}">${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;">
            <option value="">${te('select_option')}</option>
            ${roles.map(r => `<option value="${_esc(r)}">${_esc(r)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
    `;
    container.appendChild(div);
}

function execAddProgrammeLine() {
    const tbody = document.querySelector('#notif_programme_table tbody');
    if (!tbody) return;
    const empty = document.getElementById('notif_prog_empty');
    if (empty) empty.remove();
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" class="form-input" data-field="date"></td>
        <td><input type="text" class="form-input" data-field="horaire" placeholder="09:00-12:00"></td>
        <td><input type="text" class="form-input" data-field="actions"></td>
        <td><input type="text" class="form-input" data-field="correspondant"></td>
        <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>
    `;
    tbody.appendChild(tr);
}

function execUpdatePrestataireFields() {
    const sel = document.getElementById('notif_prestataire_id');
    if (!sel) return;
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === sel.value) || {};
    const fields = {
        notif_fonction_resp: 'fonction_responsable',
        notif_nom_resp: 'dirigeant',
        notif_interlocuteur: 'fonction_point_focal',
        notif_interlocuteur_nom: 'point_focal',
        notif_interlocuteur_email: 'email_point_focal'
    };
    for (const [elId, key] of Object.entries(fields)) {
        const el = document.getElementById(elId);
        if (el) el.value = prest[key] || '';
    }
}

function _collectNotificationForm() {
    const programme = [];
    document.querySelectorAll('#notif_programme_table tbody tr:not(#notif_prog_empty)').forEach(tr => {
        const row = {};
        tr.querySelectorAll('input[data-field]').forEach(inp => { row[inp.dataset.field] = inp.value; });
        if (row.date || row.actions) programme.push(row);
    });

    const equipe = [];
    document.querySelectorAll('#notif_equipe_container > div').forEach(div => {
        const selects = div.querySelectorAll('select');
        const nomSel = selects[0]; // first select = inspector name
        const roleSel = selects[1]; // second select = role
        const nom = nomSel ? nomSel.value.trim() : '';
        if (nom) equipe.push({ nom, role: roleSel ? roleSel.value : '' });
    });

    return {
        prestataire_id: document.getElementById('notif_prestataire_id')?.value || '',
        fonction_responsable: document.getElementById('notif_fonction_resp')?.value || '',
        nom_responsable: document.getElementById('notif_nom_resp')?.value || '',
        interlocuteur: document.getElementById('notif_interlocuteur')?.value || '',
        interlocuteur_nom: document.getElementById('notif_interlocuteur_nom')?.value || '',
        interlocuteur_email: document.getElementById('notif_interlocuteur_email')?.value || '',
        equipe,
        type_supervision: document.getElementById('notif_type_supervision')?.value || '',
        date_debut_prevue: document.getElementById('notif_date_debut')?.value || '',
        date_fin_prevue: document.getElementById('notif_date_fin')?.value || '',
        lieu: document.getElementById('notif_lieu')?.value || '',
        objet: document.getElementById('notif_objet')?.value || '',
        perimetre: document.getElementById('notif_perimetre')?.value || '',
        programme,
        referentiels: document.getElementById('notif_referentiels')?.value || '',
        documents_requis: document.getElementById('notif_documents')?.value || '',
        fait_a: document.getElementById('notif_fait_a')?.value || '',
        date_signature: document.getElementById('notif_date_sig')?.value || '',
        signataire: document.getElementById('notif_signataire')?.value || '',
        activite_id: EXEC_STATE.selectedNotification?.activite_id || '',
        plan_id: EXEC_STATE.selectedNotification?.plan_id || '',
        secteur_id: EXEC_STATE.selectedNotification?.secteur_id || ''
    };
}

async function execSaveNotificationDraft() {
    const data = _collectNotificationForm();
    const existing = EXEC_STATE.selectedNotification;
    try {
        if (existing && existing.id) {
            await api(`${EXEC_MODULE_API}/notifications/${existing.id}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            const res = await api(`${EXEC_MODULE_API}/notifications`, { method: 'POST', body: JSON.stringify(data) });
            if (res && res.id) {
                EXEC_STATE.selectedNotification = { ...data, id: res.id, reference: res.reference };
            }
        }
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Save notification error:', e);
        alert('Erreur lors de la sauvegarde.');
    }
}

async function execEditNotification(notifId) {
    try {
        const notif = await api(`${EXEC_MODULE_API}/notifications/${notifId}`);
        if (notif) {
            EXEC_STATE.selectedNotification = notif;
            execOpenNotificationForm(notif);
        }
    } catch (e) {
        console.error('Load notification error:', e);
    }
}

// ══════════════════════════════════════
//  NOTIFICATION PREVIEW (A4 paper)
// ══════════════════════════════════════

function execPreviewNotificationFromForm() {
    const data = _collectNotificationForm();
    // Preserve existing id/reference so submission works
    const existing = EXEC_STATE.selectedNotification || {};
    data.id = existing.id || data.id;
    data.reference = existing.reference || data.reference;
    data.prestataire_nom = existing.prestataire_nom || data.prestataire_nom;
    EXEC_STATE.selectedNotification = Object.assign({}, existing, data);
    _showNotificationPreview(EXEC_STATE.selectedNotification, true);
}

async function execPreviewNotification(notifId) {
    try {
        const notif = await api(`${EXEC_MODULE_API}/notifications/${notifId}`);
        if (notif) {
            EXEC_STATE.selectedNotification = notif;
            _showNotificationPreview(notif, false);
        }
    } catch (e) {
        console.error('Preview error:', e);
    }
}

function _showNotificationPreview(data, fromForm) {
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === data.prestataire_id) || {};
    const aac = EXEC_STATE.data.aac || {};
    const programme = data.programme || [];
    const equipe = data.equipe || [];
    const ref = data.reference || EXEC_STATE.selectedNotification?.reference || 'NOTIF-XXXX-XXX';
    // Build sub-activities / périmètre lines
    const perimetreText = data.perimetre || data.perimetre_activite || '';
    const perimetreLines = perimetreText ? perimetreText.split('\n').filter(l => l.trim()) : [];

    const bodyHtml = `
    <div class="official-doc-form">
        <div class="official-doc-page" style="font-family:Calibri,Arial,sans-serif;font-size:0.9rem;color:#111;">
            <!-- ── Titre ── -->
            <div style="background:#DAE9F7;padding:0.6rem 1rem;text-align:center;font-weight:700;font-size:1.15rem;margin-bottom:0.4rem;">
                FICHE DE NOTIFICATION
            </div>
            <div style="text-align:right;font-size:0.85rem;color:#555;margin-bottom:1rem;">
                ${_esc(ref)}
            </div>

            <!-- ── 1. PRESTATAIRE ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                1. PRESTATAIRE
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                <tr style="height:28px;"><td style="width:42%;font-weight:600;padding:0.2rem 0;">Désignation :</td><td>${_esc(prest.nom || data.prestataire_nom || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Nom du 1er Responsable :</td><td>${_esc(data.nom_responsable || data.dirigeant || prest.dirigeant || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Fonction du 1er Responsable :</td><td>${_esc(data.fonction_responsable || prest.fonction_responsable || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Interlocuteur Principal (Nom) :</td><td>${_esc(data.interlocuteur_nom || prest.point_focal || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Interlocuteur Principal (Email) :</td><td>${_esc(data.interlocuteur_email || prest.email_point_focal || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Interlocuteur Principal (Fonction) :</td><td>${_esc(data.interlocuteur || prest.fonction_point_focal || '')}</td></tr>
            </table>

            <!-- ── 2. EQUIPE D'AUDIT/INSPECTION ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                2. EQUIPE D'AUDIT/INSPECTION
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                ${equipe.length > 0 ? equipe.map((m, i) => {
                    const nom = typeof m === 'object' ? (m.nom || '') : m;
                    const role = typeof m === 'object' ? (m.role || m.fonction || '') : '';
                    return `<tr style="height:28px;"><td style="width:42%;padding:0.2rem 0;">${_esc(nom)}</td><td>${_esc(role)}</td></tr>`;
                }).join('') : '<tr><td style="color:#999;font-style:italic;">-</td></tr>'}
            </table>

            <!-- ── 3. ACTIVITE ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                3. ACTIVITE
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.35rem;">
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Nature de l'Activité :</td><td>${_esc(data.type_supervision || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Dates :</td><td>${_formatDate(data.date_debut_prevue || data.date_activite)} — ${_formatDate(data.date_fin_prevue || data.date_fin_effective)}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Lieu :</td><td>${_esc(data.lieu || data.lieu_activite || '')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Objet :</td><td>${_esc(data.objet || data.objet_activite || '')}</td></tr>
                <tr><td style="font-weight:600;padding:0.2rem 0;vertical-align:top;">Périmètre :</td><td></td></tr>
            </table>
            ${perimetreLines.length > 0 ? `<ul style="margin:0 0 0.75rem 1.5rem;font-size:0.85rem;list-style:disc;">
                ${perimetreLines.map(l => `<li style="margin-bottom:0.15rem;">${_esc(l.trim())}</li>`).join('')}
            </ul>` : '<p style="margin:0 0 0.75rem 1rem;color:#999;font-style:italic;">-</p>'}

            <!-- ── 4. PROGRAMME DE TRAVAIL ── -->
            <div style="font-weight:700;font-size:0.92rem;border-bottom:1px solid #333;padding-bottom:0.15rem;margin-bottom:0.5rem;">
                4. PROGRAMME DE TRAVAIL
            </div>
            ${programme.length > 0 ? `
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:0.75rem;border:1px solid #999;">
                <thead><tr style="background:#f3f4f6;">
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('date')}</th>
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('horaire')}</th>
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('actions_prevues')}</th>
                    <th style="border:1px solid #999;padding:0.3rem 0.5rem;text-align:left;">${te('correspondant')}</th>
                </tr></thead>
                <tbody>
                    ${programme.map(p => `<tr>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.date || '')}</td>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.horaire || '')}</td>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.actions || '')}</td>
                        <td style="border:1px solid #999;padding:0.25rem 0.5rem;">${_esc(p.correspondant || '')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : '<p style="font-style:italic;color:#999;margin-bottom:0.75rem;">-</p>'}

            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                <tr style="height:28px;"><td style="font-weight:600;width:42%;padding:0.2rem 0;">Référentiels :</td><td>${_esc(data.referentiels || '-')}</td></tr>
                <tr style="height:28px;"><td style="font-weight:600;padding:0.2rem 0;">Documents requis :</td><td>${_esc(data.documents_requis || '-')}</td></tr>
            </table>

            <!-- ── SIGNATURE ── -->
            <div style="margin-top:1.5rem;font-size:0.85rem;">
                <div style="margin-bottom:0.25rem;"><strong>Fait à :</strong> ${_esc(data.fait_a || '')}</div>
                <div style="margin-bottom:0.25rem;"><strong>Date :</strong> ${_formatDate(data.date_signature)}</div>
                <div style="margin-top:1.5rem;text-align:right;width:50%;margin-left:auto;">
                    <div style="border-bottom:1px solid #333;padding-bottom:2.5rem;margin-bottom:0.3rem;"></div>
                    <div style="font-size:0.82rem;color:#555;">${_esc(data.signataire || '')}</div>
                </div>
            </div>
        </div>
    </div>`;

    let footerHtml = '';
    if (fromForm) {
        footerHtml = `
            <button class="btn btn-outline" onclick="execOpenNotificationForm(EXEC_STATE.selectedNotification)">
                ${EXEC_ICONS.back} ${te('retour_formulaire')}
            </button>
            <button class="btn btn-primary" onclick="execSubmitNotificationForValidation()">
                ${EXEC_ICONS.send} ${te('soumettre_validation')}
            </button>
        `;
    } else {
        footerHtml = `
            <button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
            ${_execCanValidate() && data.statut === 'soumis' ? `
                <button class="btn btn-success" onclick="execValidateNotification('${data.id}')">${te('valider')}</button>
                <button class="btn btn-danger" onclick="execRejectNotification('${data.id}')">${te('rejeter')}</button>
            ` : ''}
        `;
    }

    execSwitchSlider(`${EXEC_ICONS.eye} ${te('apercu_fiche')}`, bodyHtml, footerHtml, 'xl');
}

async function execSubmitNotificationForValidation() {
    // Use stored data from preview (form DOM no longer exists at this point)
    const existing = EXEC_STATE.selectedNotification || {};
    const data = Object.assign({}, existing);
    _showValidatorPicker(async (validateurId) => {
        try {
            let notifId = existing?.id;
            if (!notifId) {
                const res = await api(`${EXEC_MODULE_API}/notifications`, { method: 'POST', body: JSON.stringify(data) });
                notifId = res?.id;
            } else {
                await api(`${EXEC_MODULE_API}/notifications/${notifId}`, { method: 'PUT', body: JSON.stringify(data) });
            }
            if (notifId) {
                await api(`${EXEC_MODULE_API}/notifications/${notifId}/submit`, {
                    method: 'PUT',
                    body: JSON.stringify({ validateur_id: validateurId })
                });
            }
            await execRefreshDynamic();
            execCloseSlider();
            EXEC_STATE.triggerTab = 'soumis';
            execRenderPage();
        } catch (e) {
            console.error('Submit notification error:', e);
            alert('Erreur lors de la soumission.');
        }
    });
}

async function execValidateNotification(notifId) {
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/validate`, { method: 'PUT' });
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Validate notification error:', e);
    }
}

async function execRejectNotification(notifId) {
    const motif = prompt('Motif du rejet :');
    if (motif === null) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/reject`, { method: 'PUT', body: JSON.stringify({ motif }) });
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Reject notification error:', e);
    }
}

async function execSendNotification(notifId) {
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        EXEC_STATE.triggerTab = 'envoyes';
        execRenderPage();
    } catch (e) {
        console.error('Send notification error:', e);
    }
}

async function execSubmitBrouillon(notifId) {
    // Show validator selection dialog
    _showValidatorPicker(async (validateurId) => {
        try {
            await api(`${EXEC_MODULE_API}/notifications/${notifId}/submit`, {
                method: 'PUT',
                body: JSON.stringify({ validateur_id: validateurId })
            });
            await execRefreshDynamic();
            EXEC_STATE.triggerTab = 'soumis';
            execRenderPage();
            if (typeof showNotification === 'function') showNotification(te('notification_submitted') || 'Notification soumise', 'success');
        } catch (e) {
            console.error('Submit brouillon error:', e);
            alert(e.message || 'Erreur lors de la soumission');
        }
    });
}

function _showValidatorPicker(onConfirm) {
    // Fetch users to get validators
    api('/api/users').then(users => {
        const validators = (users || []).filter(u =>
            u.role_m3 === 'M3_Validateur' || u.role_m3 === 'M3_Administrateur'
        );
        const overlay = document.createElement('div');
        overlay.id = 'validator-picker-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
        <div style="background:var(--card-bg,#fff);border-radius:12px;padding:1.5rem;width:400px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 1rem;">Soumettre pour validation</h3>
            <div class="form-group">
                <label style="font-weight:600;margin-bottom:0.5rem;display:block;">Validateur</label>
                <select class="form-select" id="validator_picker_select" style="width:100%;">
                    <option value="">-- Sélectionner un validateur --</option>
                    ${validators.map(u => `<option value="${u.id}">${_esc(u.prenom || '')} ${_esc(u.nom || '')} (${_esc(u.role_m3 || '')})</option>`).join('')}
                </select>
            </div>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem;">
                <button class="btn btn-outline" id="validator_picker_cancel">${te('cancel')}</button>
                <button class="btn btn-primary" id="validator_picker_confirm">${EXEC_ICONS.send} ${te('soumettre_validation')}</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('validator_picker_cancel').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.getElementById('validator_picker_confirm').onclick = () => {
            const sel = document.getElementById('validator_picker_select')?.value || '';
            if (!sel) { alert('Veuillez sélectionner un validateur'); return; }
            overlay.remove();
            onConfirm(sel);
        };
    }).catch(() => {
        // Fallback: submit without validator
        if (confirm(te('confirm_submit') || 'Soumettre cette notification pour validation ?')) {
            onConfirm('');
        }
    });
}

async function execDeleteBrouillon(notifId) {
    if (!confirm('Supprimer ce brouillon ? L\'activité sera de nouveau disponible dans "A Notifier".')) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        EXEC_STATE.triggerTab = 'brouillons';
        execRenderPage();
        if (typeof showNotification === 'function') showNotification('Brouillon supprimé', 'success');
    } catch (e) {
        console.error('Delete brouillon error:', e);
        alert(e.message || 'Erreur lors de la suppression');
    }
}

async function execCancelNotification(notifId, fromTab) {
    const motif = prompt('Motif de l\'annulation :');
    if (motif === null) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ motif: motif || 'Annulation' })
        });
        await execRefreshDynamic();
        EXEC_STATE.triggerTab = fromTab || 'brouillons';
        execRenderPage();
        if (typeof showNotification === 'function') showNotification('Notification annulée', 'success');
    } catch (e) {
        console.error('Cancel notification error:', e);
        alert(e.message || 'Erreur lors de l\'annulation');
    }
}

function execShowContacts(prestataireId) {
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestataireId);
    if (!prest) {
        execShowSlider(`${EXEC_ICONS.prestataires} ${te('contacts')}`, `<p>${te('no_data')}</p>`, '', 'xl');
        return;
    }
    const bodyHtml = `
    <div class="exec-contact-form" style="display:flex;flex-direction:column;gap:1rem;">
        <h4 style="margin-bottom:0;">${_esc(prest.nom || '')} (${_esc(prest.trigramme || '')})</h4>
        <!-- Row 1: Dirigeant ; Fonction du Responsable ; Email Prestataire -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;">
            <div class="form-group"><label>Dirigeant</label><input type="text" class="form-input" id="contact_dirigeant" value="${_esc(prest.dirigeant || '')}"></div>
            <div class="form-group"><label>Fonction du Responsable</label><input type="text" class="form-input" id="contact_fonction_resp" value="${_esc(prest.fonction_responsable || '')}"></div>
            <div class="form-group"><label>Email Prestataire</label><input type="email" class="form-input" id="contact_email_prest" value="${_esc(prest.email_prestataire || '')}"></div>
        </div>
        <!-- Row 2: Nom Point Focal ; Fonction Point Focal ; Email Point Focal ; N° Point Focal -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.75rem;">
            <div class="form-group"><label>Nom Point Focal</label><input type="text" class="form-input" id="contact_point_focal" value="${_esc(prest.point_focal || '')}"></div>
            <div class="form-group"><label>Fonction Point Focal</label><input type="text" class="form-input" id="contact_fonction_pf" value="${_esc(prest.fonction_point_focal || '')}"></div>
            <div class="form-group"><label>Email Point Focal</label><input type="email" class="form-input" id="contact_email_pf" value="${_esc(prest.email_point_focal || '')}"></div>
            <div class="form-group"><label>N° Point Focal</label><input type="text" class="form-input" id="contact_numero_pf" value="${_esc(prest.numero_point_focal || '')}"></div>
        </div>
        <hr style="border:0;border-top:1px solid var(--border);margin:0.25rem 0;">
        <!-- Row 3: Contacts additionnels -->
        <h4 style="margin-bottom:0;">${te('contacts')} ${te('additional') || 'supplémentaires'}</h4>
        <div id="contacts_additional_container">
            ${(() => {
                let addContacts = prest.contacts_additionnels || '[]';
                if (typeof addContacts === 'string') { try { addContacts = JSON.parse(addContacts); } catch(e) { addContacts = []; } }
                if (!Array.isArray(addContacts) || addContacts.length === 0) {
                    if (prest.contact_nom) addContacts = [{nom: prest.contact_nom, tel: prest.contact_tel, email: prest.contact_email}];
                }
                return addContacts.map(c => `
                <div class="contact-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                    <input type="text" class="form-input" value="${_esc(c.nom || '')}" placeholder="Nom" style="flex:1;">
                    <input type="text" class="form-input" value="${_esc(c.tel || '')}" placeholder="Téléphone" style="flex:1;">
                    <input type="email" class="form-input" value="${_esc(c.email || '')}" placeholder="Email" style="flex:1;">
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('');
            })()}
        </div>
        <button class="btn btn-sm btn-outline" onclick="execAddContactRow()" style="margin-top:0.25rem;">
            ${EXEC_ICONS.add} Ajouter un contact
        </button>
    </div>`;
    const footerHtml = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
        <button class="btn btn-primary" onclick="execSaveContactChanges('${prestataireId}')">
            ${EXEC_ICONS.check} ${te('save') || 'Enregistrer'}
        </button>`;
    execShowSlider(`${EXEC_ICONS.prestataires} ${te('contacts')}`, bodyHtml, footerHtml, 'xl');
}

function execAddContactRow() {
    const container = document.getElementById('contacts_additional_container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'contact-row';
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;';
    div.innerHTML = `
        <input type="text" class="form-input" value="" placeholder="Nom" style="flex:1;">
        <input type="text" class="form-input" value="" placeholder="Téléphone" style="flex:1;">
        <input type="email" class="form-input" value="" placeholder="Email" style="flex:1;">
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
    `;
    container.appendChild(div);
}

async function execSaveContactChanges(prestataireId) {
    const data = {
        dirigeant: document.getElementById('contact_dirigeant')?.value || '',
        fonction_responsable: document.getElementById('contact_fonction_resp')?.value || '',
        point_focal: document.getElementById('contact_point_focal')?.value || '',
        fonction_point_focal: document.getElementById('contact_fonction_pf')?.value || '',
        email_prestataire: document.getElementById('contact_email_prest')?.value || '',
        email_point_focal: document.getElementById('contact_email_pf')?.value || '',
        numero_point_focal: document.getElementById('contact_numero_pf')?.value || ''
    };
    // Collect all additional contacts
    const rows = document.querySelectorAll('#contacts_additional_container .contact-row');
    const additionalContacts = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const nom = inputs[0]?.value || '';
        const tel = inputs[1]?.value || '';
        const email = inputs[2]?.value || '';
        if (nom || tel || email) additionalContacts.push({ nom, tel, email });
    });
    // Store first contact in legacy columns + all in JSON
    if (additionalContacts.length > 0) {
        data.contact_nom = additionalContacts[0].nom;
        data.contact_tel = additionalContacts[0].tel;
        data.contact_email = additionalContacts[0].email;
    }
    data.contacts_additionnels = JSON.stringify(additionalContacts);
    try {
        await api(`/api/prestataires/${prestataireId}`, { method: 'PUT', body: JSON.stringify(data) });
        // Refresh shared data
        if (typeof loadSharedData === 'function') await loadSharedData();
        EXEC_STATE.data.prestataires = window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires;
        execCloseSlider();
        if (typeof showNotification === 'function') showNotification('Contacts mis à jour', 'success');
    } catch (e) {
        console.error('Save contacts error:', e);
        alert(e.message || 'Erreur');
    }
}

// ══════════════════════════════════════
//  EXCHANGE SLIDER
// ══════════════════════════════════════

async function execOpenExchangeSlider(notifId) {
    let notif, echanges;
    try {
        [notif, echanges] = await Promise.all([
            api(`${EXEC_MODULE_API}/notifications/${notifId}`).catch(e => { console.error('Load notif error:', e); return null; }),
            api(`${EXEC_MODULE_API}/notifications/${notifId}/echanges`).catch(e => { console.error('Load echanges error:', e); return []; })
        ]);
    } catch (e) {
        console.error('Load exchange error:', e);
        return;
    }
    if (!notif) { alert('Notification non trouvée'); return; }
    echanges = echanges || [];
    EXEC_STATE.selectedNotification = notif;

    const isPrest = _execIsPrestataire();
    const myId = EXEC_STATE.user?.id || '';
    const accordReadOnly = isPrest ? 'readonly disabled' : '';
    const accordReadOnlyAttr = isPrest ? 'disabled' : '';

    const bodyHtml = `
    <div style="margin-bottom:1rem;">
        <div style="display:flex;gap:1rem;margin-bottom:0.75rem;">
            <div><strong>${te('reference')} :</strong> ${_esc(notif.reference || '')}</div>
            <div><strong>${te('provider')} :</strong> ${_esc(notif.prestataire_nom || '')}</div>
            <div>${_execStatusBadge(notif.statut)}</div>
        </div>
        <div style="font-size:0.85rem;color:var(--text-muted);">${_esc(notif.objet || '')}</div>
    </div>

    <h4 style="margin-bottom:0.5rem;">${te('discussions')}</h4>
    <div class="exchange-chat discussions-chat" id="exec_exchange_timeline">
        ${(!echanges || echanges.length === 0) ? `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.5rem 0;">${te('no_data')}</p>` :
        echanges.map((e, idx) => {
            const isMe = e.auteur_id && myId && e.auteur_id === myId;
            const prev = echanges[idx - 1];
            const next = echanges[idx + 1];
            const sameAsPrev = prev && (prev.auteur_id === e.auteur_id);
            const sameAsNext = next && (next.auteur_id === e.auteur_id);
            const isLastOfGroup = !sameAsNext;
            const initials = ((e.auteur_prenom || 'U')[0] + ((e.auteur_nom || '')[0] || '')).toUpperCase();
            const fullName = `${_esc(e.auteur_prenom || '')} ${_esc(e.auteur_nom || '')}`.trim();
            const avatarHtml = !isMe
                ? (isLastOfGroup ? `<div class="exchange-avatar">${initials}</div>` : `<div class="exchange-avatar" style="visibility:hidden;"></div>`)
                : '';
            return `
        <div class="exchange-bubble-row ${isMe ? 'self' : 'other'}">
            ${avatarHtml}
            <div class="exchange-bubble">
                <div class="exchange-bubble-body">${_esc(
                    String(e.contenu || '')
                        .replace(/<br\s*\/?>/gi, '\n')          // convertit d'éventuels <br> stockés
                        .split(/\r?\n/)
                        .map(l => l.replace(/\s+$/, ''))        // retire les espaces en fin de ligne
                        .filter(l => l.trim() !== '')           // supprime toutes les lignes vides
                        .join('\n')
                )}</div>
                ${(e.pieces_jointes && e.pieces_jointes.length > 0) ? `
                <div class="exchange-bubble-attachments">
                    ${e.pieces_jointes.map(pj => `<span class="exchange-attachment">${EXEC_ICONS.file} ${_esc(pj.filename || pj)}</span>`).join('')}
                </div>` : ''}
            </div>
        </div>
        ${isLastOfGroup ? `<div class="exchange-bubble-time ${isMe ? 'self' : 'other'}">
          <span class="exchange-bubble-auteur">${fullName || '—'}</span>
          <span>${_formatDatetime(e.date_creation)}</span>
        </div>` : ''}`;
        }).join('')}
    </div>

    <div class="exchange-reply">
        <label>${te('repondre')}</label>
        <div class="exchange-reply-row">
            <textarea class="form-input" id="exec_exchange_msg" rows="1" placeholder="Votre message..."
                      style="resize:none;overflow:hidden;min-height:2.2rem;line-height:1.4;"
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"></textarea>
            <button class="btn btn-primary" onclick="execSendExchangeMessage('${notifId}')">
                ${EXEC_ICONS.send} Envoyer
            </button>
        </div>
    </div>

    ${notif.statut === 'envoye' ? `
    <div style="margin-top:1.25rem;padding:1rem;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
        <h4 style="margin-bottom:0.75rem;">${te('valider_accord')}${isPrest ? ` <span style="font-size:0.72rem;font-weight:500;color:var(--text-muted);">(${te('lecture_seule') || 'lecture seule'})</span>` : ''}</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('date_debut')}</label>
                <input type="date" class="form-input" id="exec_accord_debut" value="${notif.date_debut_prevue || notif.date_activite || ''}" ${accordReadOnly}>
            </div>
            <div class="form-group">
                <label>${te('date_fin')}</label>
                <input type="date" class="form-input" id="exec_accord_fin" value="${notif.date_fin_prevue || notif.date_fin_effective || ''}" ${accordReadOnly}>
            </div>
        </div>
        <div class="form-group">
            <label>Valider ${te('perimetre')}</label>
            <textarea class="form-input" id="exec_accord_perimetre" rows="4" style="resize:vertical;" ${accordReadOnlyAttr}>${_esc(notif.perimetre || notif.perimetre_activite || '')}</textarea>
        </div>
    </div>` : ''}`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>
    `;

    execShowSlider(`${EXEC_ICONS.chat} ${te('gerer_echange')}`, bodyHtml, footerHtml, 'third');
    // Scroll the chat container to the latest message (WhatsApp-like behaviour)
    setTimeout(() => {
        const tl = document.getElementById('exec_exchange_timeline');
        if (tl) tl.scrollTop = tl.scrollHeight;
    }, 50);
}

async function execSendExchangeMessage(notifId) {
    const msg = document.getElementById('exec_exchange_msg')?.value?.trim();
    if (!msg) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/echanges`, {
            method: 'POST',
            body: JSON.stringify({ contenu: msg, type_message: 'message' })
        });
        execOpenExchangeSlider(notifId);
    } catch (e) {
        console.error('Send exchange error:', e);
    }
}

async function execValidateAccord(notifId) {
    const dateDebut = document.getElementById('exec_accord_debut')?.value || '';
    const dateFin = document.getElementById('exec_accord_fin')?.value || '';
    const perimetre = document.getElementById('exec_accord_perimetre')?.value || '';
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/validate-accord`, {
            method: 'PUT',
            body: JSON.stringify({ date_debut_effective: dateDebut, date_fin_effective: dateFin, perimetre_valide: perimetre })
        });
        await execRefreshDynamic();
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Validate accord error:', e);
    }
}

// Volet rétractable d'une ligne « Notification » (onglet Déclenchement / Envoyés).
function execToggleEnvoiPanel(notifId, btn) {
    const panel = document.getElementById('exec_envoi_panel_' + notifId);
    if (!panel) return;
    const open = panel.style.display === 'none';
    panel.style.display = open ? '' : 'none';
    if (btn) btn.classList.toggle('active', open);
}

// Validation de l'accord directement depuis la ligne (mêmes effets que « Valider l'Accord »).
async function execValidateAccordRow(notifId) {
    const dateDebut = document.getElementById('exec_row_debut_' + notifId)?.value || '';
    const dateFin = document.getElementById('exec_row_fin_' + notifId)?.value || '';
    const perimetre = document.getElementById('exec_row_perimetre_' + notifId)?.value || '';
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/validate-accord`, {
            method: 'PUT',
            body: JSON.stringify({ date_debut_effective: dateDebut, date_fin_effective: dateFin, perimetre_valide: perimetre })
        });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Validate accord error:', e);
    }
}

// ══════════════════════════════════════
//  4. EXECUTION DES ACTIVITES
// ══════════════════════════════════════

function execRenderExecution() {
    const dossiers = EXEC_STATE.data.dossiers || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const plansValides = EXEC_STATE.data.plansValides || [];
    const F = EXEC_STATE.filters;

    // Hide closed dossiers by default (unless explicitly filtering for 'cloture')
    let filtered = F.statut === 'cloture' ? dossiers : dossiers.filter(d => d.statut !== 'cloture');
    if (F.prestataire) filtered = filtered.filter(d => d.prestataire_id === F.prestataire);
    if (F.statut) filtered = filtered.filter(d => d.statut === F.statut);
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(d =>
            (d.notification_objet || '').toLowerCase().includes(s) ||
            (d.prestataire_nom || '').toLowerCase().includes(s) ||
            (d.notification_ref || '').toLowerCase().includes(s)
        );
    }

    const notifs = EXEC_STATE.data.notifications || [];

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('execution')}</h2>
        </div>

        ${_execRenderFilterBar('execRenderPage()', { showPrestataire: true, showStatut: true, statutOptions: ['ouvert', 'soumis', 'cloture'] })}

        <div class="card" style="overflow-x:auto;">
            <table class="exec-data-table">
                <thead>
                    <tr>
                        <th>Réf. Activité</th>
                        <th>${te('provider')}</th>
                        <th>Dom. &amp; Sec.</th>
                        <th style="min-width:230px;">${te('objet')}</th>
                        <th>Date Activité</th>
                        <th>Dernière Maj</th>
                        <th>${te('status')}</th>
                        <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    filtered.map(d => {
                        const relNotif = notifs.find(n => n.id === d.notification_id) || {};
                        const dSecteurId = d.secteur_id || relNotif.secteur_id || '';
                        const secObj = secteurs.find(s => s.id === dSecteurId) || {};
                        const dDomaineId = secObj.domaine_id || '';
                        const domObj = (EXEC_STATE.data.domaines || []).find(x => x.id === dDomaineId) || {};
                        const dDomaine = domObj.code || domObj.nom || dDomaineId || '';
                        const dSecteur = secObj.code || secObj.nom || dSecteurId || '';
                        // Dates de l'étape Réalisation (priorité) sinon dates notifiées
                        const actDebut = (d.realisation_date_debut || relNotif.date_debut_effective || relNotif.date_activite || d.date_debut_execution || d.date_debut || '').slice(0, 10);
                        const actFin = (d.realisation_date_fin || relNotif.date_fin_effective || d.date_fin_execution || '').slice(0, 10);
                        return `<tr>
                        <td><strong style="color:var(--exec-accent);">${_esc(d.reference || relNotif.reference_activite || '')}</strong></td>
                        <td>${_esc(d.prestataire_nom || '')}</td>
                        <td style="white-space:nowrap;">
                            <div>${_esc(dDomaine || '-')}</div>
                            <div style="color:var(--text-muted);font-size:0.78rem;">${_esc(dSecteur || '-')}</div>
                        </td>
                        <td style="white-space:normal;word-break:break-word;">${_esc(d.notification_objet || '')}</td>
                        <td style="white-space:nowrap;">
                            ${actDebut ? `<div>${_formatDate(actDebut)}</div>` : ''}
                            ${(actFin && actFin !== actDebut) ? `<div>${_formatDate(actFin)}</div>` : ''}
                        </td>
                        <td>${_formatDate(d.date_maj || d.date_creation || '')}</td>
                        <td style="white-space:nowrap;">
                            <div>${_execStatusBadge(d.statut)}</div>
                            <div style="color:var(--text-muted);font-size:0.78rem;margin-top:0.15rem;">${_esc(_dossierStepLabel(d))}</div>
                        </td>
                        <td style="display:flex;gap:0.4rem;justify-content:center;white-space:nowrap;">
                            <button class="btn btn-sm btn-outline" onclick="execOpenExchangeSlider('${d.notification_id}')" title="${te('gerer_echange')}">
                                ${EXEC_ICONS.chat}
                            </button>
                            <button class="btn btn-sm btn-accent" onclick="execOpenDossierSlider('${d.id}')" title="Ouvrir le dossier">
                                ${EXEC_ICONS.openFolder}
                            </button>
                            ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.25rem 0.4rem;" onclick="execDeleteDossier('${d.id}')" title="${te('delete')}">
                                ${EXEC_ICONS.x}
                            </button>` : ''}
                        </td>
                    </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}


// Workflow step definitions for the dossier form
const DOSSIER_WORKFLOW_STEPS = [
    { id: 'notification', label: 'Notification' },
    { id: 'realisation', label: 'Réalisation' },
    { id: 'redaction', label: 'Rédaction du rapport' },
    { id: 'validation', label: 'Validation et Transmission' }
];
const REDACTION_SUBTABS = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'synthese', label: 'Synthèses et Recommandations' },
    { id: 'checklists', label: 'Checklist et autres doc.' },
    { id: 'constatations', label: 'Constatations' },
    { id: 'conclusion', label: 'Conclusions et Annexes' }
];

function _dossierStepLabel(dossier) {
    if (dossier.statut === 'cloture') return 'Clôturé';
    const cs = dossier.current_step || 'realisation';
    const s = DOSSIER_WORKFLOW_STEPS.find(x => x.id === cs);
    return s ? s.label : cs;
}

function _dossierStepOrder(stepId) {
    const idx = DOSSIER_WORKFLOW_STEPS.findIndex(s => s.id === stepId);
    return idx < 0 ? 99 : idx;
}

function _dossierStepState(dossier, stepId) {
    // Returns { unlocked, closed, editable }
    const isCloture = dossier.statut === 'cloture';
    const hasTransmitted = (dossier.rapports || []).some(r => r.statut === 'transmis');
    const current = dossier.current_step || 'realisation';
    const currentIdx = _dossierStepOrder(current);
    const thisIdx = _dossierStepOrder(stepId);
    let closed = false;
    let unlocked = false;
    if (stepId === 'notification') {
        unlocked = true; closed = true; // always closed & read-only
    } else if (stepId === 'realisation') {
        unlocked = true;
        closed = !!(dossier.realisation_closed) || currentIdx > thisIdx;
    } else if (stepId === 'redaction') {
        unlocked = !!(dossier.realisation_closed) || currentIdx >= thisIdx;
        closed = !!(dossier.redaction_closed) && dossier.statut !== 'brouillon';
    } else if (stepId === 'validation') {
        unlocked = !!(dossier.redaction_closed) || currentIdx >= thisIdx || (dossier.rapports || []).length > 0;
        closed = isCloture;
    }
    const canContribute = _execCanContribute();
    let editable = false;
    if (!isCloture && !hasTransmitted && canContribute) {
        if (stepId === 'realisation' && !closed) editable = true;
        if (stepId === 'redaction' && !closed && unlocked && ['ouvert','brouillon'].includes(dossier.statut)) editable = true;
    }
    return { unlocked, closed, editable };
}

async function execOpenDossierSlider(dossierId, activeTab) {
    // Guard against stale responses when clicking rapidly between dossiers
    const requestId = ++EXEC_STATE._dossierRequestId;
    let dossier;
    try {
        dossier = await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`);
    } catch (e) {
        console.error('Load dossier error:', e);
        return;
    }
    // Discard stale response if another dossier was requested in the meantime
    if (requestId !== EXEC_STATE._dossierRequestId) return;
    if (!dossier) return;
    EXEC_STATE.selectedDossier = dossier;

    // Map legacy activeTab (sub-tab of redaction) to a step + sub-tab
    let step, redactionSubtab;
    if (activeTab && REDACTION_SUBTABS.some(s => s.id === activeTab)) {
        step = 'redaction';
        redactionSubtab = activeTab;
    } else if (activeTab === 'rapports') {
        step = 'validation';
    } else if (activeTab && DOSSIER_WORKFLOW_STEPS.some(s => s.id === activeTab)) {
        step = activeTab;
    } else {
        step = dossier.current_step || EXEC_STATE.dossierStep || 'realisation';
    }
    // Ensure step is unlocked; fall back to current_step
    if (!_dossierStepState(dossier, step).unlocked) {
        step = dossier.current_step || 'realisation';
    }
    EXEC_STATE.dossierStep = step;
    EXEC_STATE.dossierRedactionSubtab = redactionSubtab || EXEC_STATE.dossierRedactionSubtab || 'introduction';

    execShowSlider(`${EXEC_ICONS.folder} ${te('dossier')}`, '', '', 'max');
    const slider = document.getElementById('execSlider');
    if (slider) slider.setAttribute('data-hide-close', '1');
    _renderDossierSliderContent(dossierId);
}

function _renderDossierSliderContent(dossierId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier) return;
    const step = EXEC_STATE.dossierStep || 'realisation';
    const subtab = EXEC_STATE.dossierRedactionSubtab || 'introduction';

    const notifObjet = dossier.notification_objet || dossier.objet_activite || '';
    const obsRetour = dossier.observations_retour || '';

    // Build compact slider title combining meta info (moved from body header)
    const titleHtml = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;flex:1;font-size:0.85rem;font-weight:400;">
        <span style="font-weight:600;font-size:0.95rem;">${EXEC_ICONS.folder} ${te('dossier')}</span>
        <span><strong>Ref :</strong> ${_esc(dossier.reference || dossierId)}</span>
        <span><strong>Prestataire :</strong> ${_esc(dossier.prestataire_nom || '')}</span>
        <span>${_execStatusBadge(dossier.statut)}</span>
        <span style="color:var(--text-muted);font-style:italic;">${_esc(notifObjet)}</span>
        <button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="execCloseSlider()" title="Retour à la liste d'activités">
            ${EXEC_ICONS.back} Retour à la liste d'activités
        </button>
    </div>`;
    const headerHtml = `
    ${obsRetour && dossier.statut === 'brouillon' && step === 'redaction' ? `
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;">
        <div style="font-weight:600;color:#92400e;margin-bottom:0.25rem;">${EXEC_ICONS.alarm} Observations du validateur :</div>
        <div style="color:#78350f;white-space:pre-wrap;">${_esc(obsRetour)}</div>
    </div>` : ''}`;

    // Workflow stepper (numbered circles with connectors)
    const stepperHtml = `<div class="exec-wf-stepper" id="dossier_step_bar">
        ${DOSSIER_WORKFLOW_STEPS.map((s, i) => {
            const st = _dossierStepState(dossier, s.id);
            const isActive = step === s.id;
            const cls = isActive ? 'active' : (st.closed ? 'completed' : (st.unlocked ? '' : 'locked'));
            const inner = st.closed && !isActive ? '✓' : (i + 1);
            return `<button class="exec-wf-step ${cls}" ${st.unlocked ? `onclick="execSwitchDossierStep('${dossierId}','${s.id}')"` : 'disabled'}>
                <div class="wf-circle">${inner}</div>
                <div class="wf-label">${_esc(s.label)}</div>
            </button>`;
        }).join('')}
    </div>`;

    const bodyInner = _buildDossierStepContent(step, dossier, dossierId, subtab);
    const bodyHtml = `${headerHtml}${stepperHtml}<div id="dossier_step_content">${bodyInner}</div>`;

    const footerHtml = _buildDossierFooter(step, dossier, dossierId);

    _execFadeSliderContent(titleHtml, bodyHtml, footerHtml, 'max');
    const slider = document.getElementById('execSlider');
    if (slider) slider.setAttribute('data-hide-close', '1');
    // Ensure footer exists even if empty when first rendered
    if (slider && !slider.querySelector('.exec-slider-footer') && footerHtml) {
        const footerDiv = document.createElement('div');
        footerDiv.className = 'exec-slider-footer';
        footerDiv.innerHTML = footerHtml;
        slider.appendChild(footerDiv);
    }
}

function _buildDossierStepContent(step, dossier, dossierId, subtab) {
    if (step === 'notification') return _buildStepNotification(dossier, dossierId);
    if (step === 'realisation') return _buildStepRealisation(dossier, dossierId);
    if (step === 'redaction') return _buildStepRedaction(dossier, dossierId, subtab);
    if (step === 'validation') return _buildStepValidation(dossier, dossierId);
    return '';
}

function _buildStepNotification(dossier, dossierId) {
    // Read-only view of all notification data (mirrors the notification form)
    const bg = 'background:var(--bg);';
    const notifObjet = dossier.notification_objet || dossier.objet_activite || '';
    const notifDateDebut = dossier.notif_date_debut || dossier.date_debut_execution || '';
    const notifDateFin = dossier.notif_date_fin || dossier.date_fin_execution || '';
    const notifPerimetre = dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const notifRefs = dossier.notif_referentiels || '';
    const notifDocs = dossier.notif_documents_requis || '';

    // Parse equipe
    let equipeHtml = '<span style="color:var(--text-muted);">-</span>';
    try {
        const eq = typeof dossier.notif_equipe === 'string' ? JSON.parse(dossier.notif_equipe || '[]') : (dossier.notif_equipe || []);
        if (eq.length > 0) {
            equipeHtml = `<table class="exec-data-table" style="font-size:0.83rem;">
                <thead><tr><th>Nom</th><th>Rôle</th></tr></thead>
                <tbody>${eq.map(m => {
                    const nom = typeof m === 'string' ? m : (m.nom || '');
                    const role = typeof m === 'object' ? (m.role || '') : '';
                    return `<tr><td>${_esc(nom)}</td><td>${_esc(role)}</td></tr>`;
                }).join('')}</tbody>
            </table>`;
        }
    } catch(e) {}

    // Parse programme
    let programmeHtml = '<span style="color:var(--text-muted);">-</span>';
    try {
        const prog = typeof dossier.notif_programme === 'string' ? JSON.parse(dossier.notif_programme || '[]') : (dossier.notif_programme || []);
        if (Array.isArray(prog) && prog.length > 0) {
            programmeHtml = `<table class="exec-data-table" style="font-size:0.83rem;">
                <thead><tr><th>${te('date')}</th><th>${te('horaire')}</th><th>${te('actions_prevues')}</th><th>${te('correspondant')}</th></tr></thead>
                <tbody>${prog.map(p => `<tr>
                    <td>${_formatDate(p.date || '')}</td>
                    <td>${_esc(p.horaire || '')}</td>
                    <td>${_esc(p.actions || '')}</td>
                    <td>${_esc(p.correspondant || '')}</td>
                </tr>`).join('')}</tbody>
            </table>`;
        }
    } catch(e) {}

    const pdfPath = dossier.notification_pdf_path || '';

    return `
    ${_execFormSection('A', 'section_a_prestataire', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('provider')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.prestataire_nom || dossier.notif_prestataire_designation || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('fonction_responsable')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_fonction_responsable || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('nom_responsable')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_nom_responsable || '')}" readonly style="${bg}">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('interlocuteur')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_interlocuteur || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('interlocuteur_nom')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_interlocuteur_nom || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('interlocuteur_email')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_interlocuteur_email || '')}" readonly style="${bg}">
            </div>
        </div>
    `, true)}

    ${_execFormSection('B', 'section_b_equipe_audit', `
        ${equipeHtml}
    `, true)}

    ${_execFormSection('C1', 'section_c1_activite', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('nature_activite')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_nature || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_debut')}</label>
                <input type="text" class="form-input" value="${_formatDate(notifDateDebut)}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_fin')}</label>
                <input type="text" class="form-input" value="${_formatDate(notifDateFin)}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('lieu')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_lieu || '')}" readonly style="${bg}">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('objet')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifObjet)}</textarea>
            </div>
            <div class="form-group">
                <label>${te('perimetre')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifPerimetre)}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('referentiels')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifRefs)}</textarea>
            </div>
            <div class="form-group">
                <label>${te('documents_requis')}</label>
                <textarea class="form-input" rows="2" readonly style="${bg}">${_esc(notifDocs)}</textarea>
            </div>
        </div>
    `, true)}

    ${_execFormSection('C2', 'section_c2_programme', `
        ${programmeHtml}
    `, false)}

    ${_execFormSection('F', 'section_f_signature', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('fait_a')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_fait_a || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_signature')}</label>
                <input type="text" class="form-input" value="${_formatDate(dossier.notif_date_edition || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('signataire')}</label>
                <input type="text" class="form-input" value="${_esc(dossier.notif_signataire || '')}" readonly style="${bg}">
            </div>
        </div>
    `, false)}

    <div style="margin-top:1rem;">
        <label style="font-weight:600;">Fiche de notification</label>
        <div style="margin-top:0.35rem;">
            ${pdfPath ? `<a href="${_esc(_execDl(pdfPath))}" download class="btn btn-primary btn-sm" style="text-decoration:none;">${EXEC_ICONS.pdf} Exporter PDF</a>` :
            `<button class="btn btn-primary btn-sm" onclick="execGenerateNotificationPdf('${dossierId}')">${EXEC_ICONS.pdf} Exporter PDF</button>`}
        </div>
    </div>`;
}

function _buildStepRealisation(dossier, dossierId) {
    const st = _dossierStepState(dossier, 'realisation');
    const canEdit = st.editable;
    const ro = canEdit ? '' : ' readonly';
    const dis = canEdit ? '' : ' disabled';
    const bg = canEdit ? '' : 'background:var(--bg);';

    // Parse equipe (JSON array or fallback to string)
    let equipe = [];
    try {
        equipe = typeof dossier.realisation_equipe === 'string'
            ? JSON.parse(dossier.realisation_equipe || '[]')
            : (dossier.realisation_equipe || []);
    } catch(e) {
        // Legacy: plain text - convert to single entry
        if (dossier.realisation_equipe) equipe = [{ nom: dossier.realisation_equipe, role: '' }];
    }
    if (!Array.isArray(equipe)) equipe = [];

    // Parse programme (JSON array or fallback to string)
    let programme = [];
    try {
        programme = typeof dossier.realisation_programme === 'string'
            ? JSON.parse(dossier.realisation_programme || '[]')
            : (dossier.realisation_programme || []);
    } catch(e) {
        programme = [];
    }
    if (!Array.isArray(programme)) programme = [];

    const inspList = typeof _getFilteredInspecteurs === 'function' ? _getFilteredInspecteurs() : [];
    const roles = ["Chef d'équipe", "Membre d'équipe", "Stagiaire", "Formation en cours d'emploi", "Experts ou Autres"];

    const equipeHtml = canEdit ? `
        <div id="realisation_equipe_container">
            ${equipe.length === 0 ? `<p style="color:var(--text-muted);font-size:0.83rem;">${te('no_data')}</p>` :
            equipe.map(m => {
                const nom = typeof m === 'string' ? m : (m.nom || '');
                const role = typeof m === 'object' ? (m.role || '') : '';
                return `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                <select class="form-select real-equipe-nom" style="flex:1;">
                    <option value="">-- Inspecteur --</option>
                    ${inspList.map(ins => `<option value="${_esc(ins.prenom + ' ' + ins.nom)}" ${nom === (ins.prenom + ' ' + ins.nom) ? 'selected' : ''}>${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
                    ${nom && !inspList.some(ins => (ins.prenom + ' ' + ins.nom) === nom) ? `<option value="${_esc(nom)}" selected>${_esc(nom)}</option>` : ''}
                </select>
                <select class="form-select real-equipe-role" style="flex:1;">
                    <option value="">${te('select_option')}</option>
                    ${roles.map(r => `<option value="${_esc(r)}" ${role===r?'selected':''}>${_esc(r)}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
            </div>`;
            }).join('')}
        </div>
        <button class="btn btn-sm btn-outline" onclick="execAddRealisationEquipeMember()" style="margin-top:0.35rem;">
            ${EXEC_ICONS.add} ${te('ajouter_membre')}
        </button>` : `
        <table class="exec-data-table" style="font-size:0.83rem;">
            <thead><tr><th>Nom</th><th>Rôle</th></tr></thead>
            <tbody>${equipe.length === 0 ? `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">-</td></tr>` :
            equipe.map(m => {
                const nom = typeof m === 'string' ? m : (m.nom || '');
                const role = typeof m === 'object' ? (m.role || '') : '';
                return `<tr><td>${_esc(nom)}</td><td>${_esc(role)}</td></tr>`;
            }).join('')}</tbody>
        </table>`;

    const programmeHtml = `
        <table class="exec-data-table exec-prog-table" id="realisation_programme_table" style="width:100%;">
            <thead><tr>
                <th style="width:130px;">${te('date')}</th>
                <th style="width:90px;">${te('horaire')}</th>
                <th>${te('actions_prevues')}</th>
                <th style="width:170px;">${te('correspondant')}</th>
                ${canEdit ? '<th style="width:44px;"></th>' : ''}
            </tr></thead>
            <tbody>
                ${programme.length === 0 ? `<tr id="real_prog_empty"><td colspan="${canEdit ? 5 : 4}" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                programme.map((p, i) => `<tr data-prog-idx="${i}">
                    <td><input type="date" class="form-input" value="${p.date || ''}" data-field="date"${ro}></td>
                    <td><input type="text" class="form-input" value="${_esc(p.horaire || '')}" data-field="horaire" placeholder="09:00-12:00"${ro}></td>
                    <td><textarea class="form-input" rows="2" data-field="actions" style="resize:vertical;"${ro}>${_esc(p.actions || '')}</textarea></td>
                    <td><input type="text" class="form-input" value="${_esc(p.correspondant || '')}" data-field="correspondant"${ro}></td>
                    ${canEdit ? `<td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>` : ''}
                </tr>`).join('')}
            </tbody>
        </table>
        ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="execAddRealisationProgrammeLine()" style="margin-top:0.4rem;">
            ${EXEC_ICONS.add} ${te('ajouter_programme')}
        </button>` : ''}
        <style>
            .exec-prog-table th, .exec-prog-table td { padding:0.2rem 0.35rem; }
            .exec-prog-table .form-input { padding:0.25rem 0.35rem; font-size:0.8rem; }
            .exec-prog-table textarea.form-input { min-height:34px; line-height:1.25; }
        </style>`;

    // ── Section Checklists — sélection via modal + boutons « Renseigner » ──
    const allChecklists = EXEC_STATE.data.checklists || [];
    let selectedChIds = [];
    try {
        selectedChIds = typeof dossier.realisation_checklists === 'string'
            ? JSON.parse(dossier.realisation_checklists || '[]')
            : (Array.isArray(dossier.realisation_checklists) ? dossier.realisation_checklists : []);
    } catch (e) { selectedChIds = []; }
    if (!Array.isArray(selectedChIds)) selectedChIds = [];

    const selectedHtml = selectedChIds.length === 0
        ? `<p style="color:var(--text-muted);font-size:0.83rem;margin:0;">Aucune checklist sélectionnée — utilisez le bouton ci-dessous pour en ajouter.</p>`
        : selectedChIds.map(id => {
            const c = allChecklists.find(x => x.id === id);
            if (!c) return '';
            return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.6rem;border:1px solid var(--border);border-radius:6px;background:#fff;">
                <strong style="font-size:0.83rem;flex:1;">${c.reference ? _esc(c.reference) + ' — ' : ''}${_esc(c.nom)}</strong>
                <button type="button" class="btn btn-sm btn-primary" onclick="execOpenChecklistFiller('${dossierId}','${c.id}')">📝 Renseigner la Checklist</button>
                ${canEdit ? `<button type="button" class="btn btn-sm btn-ghost" onclick="execRemoveDossierChecklist('${dossierId}','${c.id}')" title="Retirer" style="color:#ef4444;">✕</button>` : ''}
            </div>`;
        }).filter(Boolean).join('');
    const checklistsHtml = `<div style="display:flex;flex-direction:column;gap:0.4rem;">
        ${selectedHtml}
        ${canEdit ? `<div style="margin-top:0.4rem;">
            <button type="button" class="btn btn-sm btn-outline" onclick="execOpenChecklistsPicker('${dossierId}')">
                ${EXEC_ICONS.add} Sélectionner des checklists
            </button>
        </div>` : ''}
    </div>`;

    // Valeurs pré-remplies depuis la Notification (réutilisées si la réalisation n'a pas encore été modifiée)
    const vNature = dossier.realisation_nature || dossier.notif_nature || '';
    const vDateDebut = (dossier.realisation_date_debut || dossier.notif_date_debut || '').slice(0, 10);
    const vDateFin = (dossier.realisation_date_fin || dossier.notif_date_fin || '').slice(0, 10);
    const vLieu = dossier.realisation_lieu || dossier.notif_lieu || dossier.notif_fait_a || '';
    const vPerimetre = dossier.realisation_perimetre || dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const vObjet = dossier.realisation_activite || dossier.notification_objet || dossier.objet_activite || '';

    return `
    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">Confirmez et ajustez les informations pour l'activité sur le terrain.</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
            <label>Nature de l'activité</label>
            <input type="text" class="form-input" id="realisation_nature" value="${_esc(vNature)}" style="${bg}"${ro}>
        </div>
        <div class="form-group">
            <label>Date Début</label>
            <input type="date" class="form-input" id="realisation_date_debut" value="${_esc(vDateDebut)}" style="${bg}"${ro}>
        </div>
        <div class="form-group">
            <label>Date Fin</label>
            <input type="date" class="form-input" id="realisation_date_fin" value="${_esc(vDateFin)}" style="${bg}"${ro}>
        </div>
        <div class="form-group">
            <label>Lieu</label>
            <input type="text" class="form-input" id="realisation_lieu" value="${_esc(vLieu)}" style="${bg}"${ro}>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 3fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
            <label>Objet</label>
            <textarea class="form-input" id="realisation_activite" rows="3" style="resize:vertical;${bg}"${ro}>${_esc(vObjet)}</textarea>
        </div>
        <div class="form-group">
            <label style="font-weight:600;">Équipe d'audit/inspection</label>
            ${equipeHtml}
        </div>
    </div>
    <div class="form-group" style="margin-bottom:1rem;">
        <label>Périmètre</label>
        <textarea class="form-input" id="realisation_perimetre" rows="3" style="resize:vertical;${bg}"${ro}>${_esc(vPerimetre)}</textarea>
    </div>
    <div class="form-group" style="margin-bottom:1rem;">
        <label style="font-weight:600;">Programme de travail</label>
        ${programmeHtml}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
            <label style="font-weight:600;">Checklists à utiliser</label>
            ${checklistsHtml}
        </div>
        <div class="form-group">
            <label style="font-weight:600;">Pièces jointes de l'activité</label>
            ${(() => {
                let pjs = [];
                try {
                    pjs = typeof dossier.realisation_pieces_jointes === 'string'
                        ? JSON.parse(dossier.realisation_pieces_jointes || '[]')
                        : (dossier.realisation_pieces_jointes || []);
                } catch (e) { pjs = []; }
                if (!Array.isArray(pjs)) pjs = [];
                const rowsPj = pjs.map(pj => _execRealisationPjRow(pj, canEdit)).join('');
                return `<div id="realisation_pj_list">${rowsPj}</div>
                ${canEdit ? `
                <div style="margin-top:0.5rem;">
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('realisation_pj_input').click()">
                        ${EXEC_ICONS.upload} Téléverser des pièces jointes
                    </button>
                    <input type="file" id="realisation_pj_input" style="display:none;" multiple onchange="execUploadRealisationPj(this.files)">
                </div>` : (pjs.length ? '' : '<p style="color:var(--text-muted);font-size:0.83rem;">Aucune pièce jointe.</p>')}`;
            })()}
        </div>
    </div>`;
}

// Rendu d'une ligne de pièce jointe (nom éditable + description + lien fichier)
function _execRealisationPjRow(pj, canEdit) {
    const filename = (pj && (pj.filename || pj.name)) || '';
    const description = (pj && pj.description) || '';
    const path = (pj && pj.path) || '';
    const origName = (pj && pj.orig_name) || filename;
    const dis = canEdit ? '' : ' readonly';
    return `<div class="realisation-pj-item" data-path="${_esc(path)}" data-orig="${_esc(origName)}"
        style="border:1px solid var(--border);border-radius:8px;padding:0.6rem;margin-bottom:0.5rem;">
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem;">
            ${EXEC_ICONS.file}
            ${path ? `<a href="${_esc(_execDl(path))}" download="${_esc(origName)}" style="font-size:0.78rem;color:var(--primary);">${_esc(origName)}</a>` : `<span style="font-size:0.78rem;color:var(--text-muted);">${_esc(origName)}</span>`}
            ${canEdit ? `<button class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="this.closest('.realisation-pj-item').remove()">${EXEC_ICONS.x}</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:0.5rem;">
            <input type="text" class="form-input pj-nom" value="${_esc(filename)}" placeholder="Nom du fichier"${dis}>
            <input type="text" class="form-input pj-desc" value="${_esc(description)}" placeholder="Description (optionnel)"${dis}>
        </div>
    </div>`;
}

// Téléverse une ou plusieurs pièces jointes et les ajoute à la liste de la Réalisation.
async function execUploadRealisationPj(files) {
    if (!files || !files.length) return;
    const container = document.getElementById('realisation_pj_list');
    if (!container) return;
    for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: fd
            });
            const data = await res.json();
            if (data.status === 'ok') {
                container.insertAdjacentHTML('beforeend', _execRealisationPjRow({
                    filename: data.filename || file.name,
                    orig_name: data.filename || file.name,
                    description: '',
                    path: data.path || ''
                }, true));
            }
        } catch (e) { console.error('Upload PJ error:', e); }
    }
}

// Collecte les pièces jointes saisies dans le DOM
function _collectRealisationPj() {
    return Array.from(document.querySelectorAll('#realisation_pj_list .realisation-pj-item')).map(el => ({
        filename: (el.querySelector('.pj-nom')?.value || '').trim(),
        description: (el.querySelector('.pj-desc')?.value || '').trim(),
        path: el.dataset.path || '',
        orig_name: el.dataset.orig || ''
    }));
}

// Enregistre les pièces jointes de l'activité depuis l'étape Rédaction du rapport.
async function execSaveRedactionPj(dossierId) {
    const pjs = _collectRealisationPj();
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ realisation_pieces_jointes: JSON.stringify(pjs) })
        });
        if (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId) {
            EXEC_STATE.selectedDossier.realisation_pieces_jointes = JSON.stringify(pjs);
        }
        await execRefreshDynamic();
        _execToast('Pièces jointes enregistrées', 'success');
    } catch (e) {
        console.error('Save redaction PJ error:', e);
        _execToast('Erreur lors de l\'enregistrement', 'error');
    }
}

function _buildStepRedaction(dossier, dossierId, subtab) {
    const st = _dossierStepState(dossier, 'redaction');
    const canEdit = st.editable;
    const constatations = dossier.constatations || [];

    // Show collapsible comments panel if rapport was returned with comments
    let commentsPanel = '';
    const rapports = (dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0));
    const lastRap = rapports[0];
    if (lastRap && lastRap.commentaires_apercu && lastRap.commentaires_apercu.trim() && dossier.statut === 'brouillon') {
        commentsPanel = `
        <details open style="margin-bottom:1rem;border:1px solid #f59e0b;border-radius:8px;background:#fef3c7;">
            <summary style="cursor:pointer;padding:0.75rem;font-weight:600;color:#92400e;font-size:0.85rem;">
                ${EXEC_ICONS.alarm} Commentaires du validateur sur le rapport (v${lastRap.version || 1})
            </summary>
            <div style="padding:0 0.75rem 0.75rem;white-space:pre-wrap;font-size:0.83rem;color:#78350f;">${_esc(lastRap.commentaires_apercu)}</div>
        </details>`;
    }

    // sub-tabs bar
    const subTabsHtml = `<div class="exec-workflow-tabs" id="dossier_redaction_subtab_bar" style="margin-bottom:1rem;flex-wrap:wrap;">
        ${REDACTION_SUBTABS.map(s => {
            const label = s.id === 'constatations' ? `${s.label} (${constatations.length})` : s.label;
            return `<button class="exec-tab ${subtab === s.id ? 'active' : ''}" onclick="execSwitchRedactionSubtab('${dossierId}','${s.id}')">${_esc(label)}</button>`;
        }).join('')}
    </div>`;
    const content = _buildRedactionSubtabContent(subtab, dossier, dossierId, canEdit);
    return `${commentsPanel}${subTabsHtml}<div id="dossier_redaction_subtab_content">${content}</div>`;
}

function _buildRedactionSubtabContent(tab, dossier, dossierId, canEdit) {
    return _buildDossierTabContent(tab, dossier, dossierId, canEdit, _dossierDefaults(dossier));
}

function _dossierDefaults(dossier) {
    // Prefer realisation data (most up-to-date) over notification data
    const notifObjet = dossier.realisation_activite || dossier.notification_objet || dossier.objet_activite || '';
    const notifDateDebut = dossier.notif_date_debut || dossier.date_debut_execution || '';
    const notifDateFin = dossier.notif_date_fin || dossier.date_fin_execution || '';
    const notifDates = notifDateDebut ? `${_formatDate(notifDateDebut)} - ${_formatDate(notifDateFin)}` : '';

    // Equipe: prefer realisation equipe over notification equipe
    let notifEquipe = '';
    try {
        let eq = [];
        const realEq = dossier.realisation_equipe;
        if (realEq) {
            eq = typeof realEq === 'string' ? JSON.parse(realEq || '[]') : (realEq || []);
        }
        if (!Array.isArray(eq) || eq.length === 0) {
            eq = typeof dossier.notif_equipe === 'string' ? JSON.parse(dossier.notif_equipe || '[]') : (dossier.notif_equipe || []);
        }
        notifEquipe = (eq || []).map(m => {
            const nom = typeof m === 'string' ? m : (m.nom || '');
            const role = typeof m === 'object' ? (m.role || '') : '';
            return nom ? `- ${nom}${role ? ', ' + role : ''}` : '';
        }).filter(Boolean).join('\n');
    } catch(e) {}

    const notifPerimetre = dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const notifRefs = [dossier.notif_referentiels || '', dossier.notif_documents_requis || ''].filter(Boolean).join('\n');

    // Programme: prefer realisation programme
    let notifProgramme = [];
    try {
        const realProg = dossier.realisation_programme;
        if (realProg) {
            notifProgramme = typeof realProg === 'string' ? JSON.parse(realProg || '[]') : (realProg || []);
        }
        if (!Array.isArray(notifProgramme) || notifProgramme.length === 0) {
            const np = dossier.notif_programme;
            notifProgramme = typeof np === 'string' ? JSON.parse(np || '[]') : (np || []);
        }
    } catch(e) {}
    if (!Array.isArray(notifProgramme)) notifProgramme = [];

    return { notifObjet, notifDates, notifEquipe, notifPerimetre, notifRefs, notifProgramme };
}

function _buildStepValidation(dossier, dossierId) {
    const rapports = (dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0));
    const lastRap = rapports[0];
    return `
    ${rapports.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">Aucun rapport soumis pour le moment.</p>` : `
    <div style="overflow-x:auto;">
    <table class="exec-data-table">
        <thead><tr>
            <th>${te('ref_rapport')}</th>
            <th>Version</th>
            <th>${te('titre_rapport')}</th>
            <th>${te('date_emission')}</th>
            <th>${te('statut_validation')}</th>
            <th>${te('actions')}</th>
        </tr></thead>
        <tbody>
            ${rapports.map(r => {
                const isLast = lastRap && r.id === lastRap.id;
                const hasComments = r.commentaires_apercu && r.commentaires_apercu.trim();
                return `<tr>
                <td><strong>${_esc(r.reference || '')}</strong></td>
                <td>v${r.version || 1}</td>
                <td>${_esc(r.titre || '')}</td>
                <td>${_formatDate(r.date_creation)}</td>
                <td>${_execStatusBadge(r.statut)}</td>
                <td style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-outline" onclick="execPreviewRapport('${r.id}')">
                        ${EXEC_ICONS.eye} ${te('apercu')}
                    </button>
                    ${isLast && r.statut === 'soumis' && _execCanValidate() ? `
                    <button class="btn btn-sm btn-outline" style="color:#d97706;border-color:#d97706;" onclick="execReturnDossier('${dossierId}')">
                        ${EXEC_ICONS.back} Renvoyer
                    </button>` : ''}
                </td>
            </tr>
            ${hasComments ? `<tr>
                <td colspan="6" style="padding:0;">
                    <details style="padding:0.5rem 1rem;background:var(--bg);border-radius:4px;margin:0.25rem 0;">
                        <summary style="cursor:pointer;font-size:0.83rem;font-weight:600;color:var(--text-muted);">
                            ${EXEC_ICONS.clipboard} Commentaires sur le rapport (v${r.version || 1})
                        </summary>
                        <div style="white-space:pre-wrap;font-size:0.83rem;margin-top:0.5rem;padding:0.5rem;background:var(--surface);border-radius:4px;border:1px solid var(--border);">${_esc(r.commentaires_apercu)}</div>
                    </details>
                </td>
            </tr>` : ''}`;}).join('')}
        </tbody>
    </table>
    </div>`}`;
}

function _buildDossierFooter(step, dossier, dossierId) {
    const isCloture = dossier.statut === 'cloture';
    const hasTransmitted = (dossier.rapports || []).some(r => r.statut === 'transmis');
    const realSt = _dossierStepState(dossier, 'realisation');
    const redSt = _dossierStepState(dossier, 'redaction');
    const lastRap = ((dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0)))[0];
    const hasValidated = (dossier.rapports || []).some(r => ['valide','transmis'].includes(r.statut));

    let buttons = '';
    if (step === 'realisation' && realSt.editable) {
        buttons += `
        <button class="btn btn-primary" onclick="execSaveRealisation('${dossierId}')">${EXEC_ICONS.clipboard} Enregistrer</button>
        <button class="btn btn-accent" onclick="execCloseRealisation('${dossierId}')">${EXEC_ICONS.check} Clôturer Exécution sur le Terrain</button>`;
    }
    if (step === 'redaction' && redSt.editable) {
        buttons += `
        <button class="btn btn-primary" onclick="execSaveDossier('${dossierId}')">${EXEC_ICONS.clipboard} Brouillon</button>
        <button class="btn btn-accent" onclick="execSubmitDossier('${dossierId}')">${EXEC_ICONS.send} Soumettre</button>`;
    }
    if (step === 'validation' && _execCanValidate() && !isCloture) {
        if (lastRap && lastRap.statut === 'soumis') {
            buttons += `<button class="btn btn-success" onclick="execValidateRapport('${lastRap.id}')">${EXEC_ICONS.check} Valider</button>`;
        }
        if (hasValidated && lastRap) {
            buttons += `<button class="btn btn-outline" onclick="execAmendRapport('${lastRap.id}')">${EXEC_ICONS.edit} Amender</button>`;
            if (!hasTransmitted) {
                buttons += `<button class="btn btn-accent" onclick="execSendRapportValidated('${lastRap.id}')">${EXEC_ICONS.send} Envoyer</button>`;
            }
            // La clôture n'est offerte qu'une fois le rapport transmis.
            if (hasTransmitted) {
                buttons += `<button class="btn btn-success" onclick="execCloseDossier('${dossierId}')">${EXEC_ICONS.check} ${te('cloture')}</button>`;
            }
        }
    }
    return buttons;
}

function execSwitchDossierStep(dossierId, stepId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier) return;
    const st = _dossierStepState(dossier, stepId);
    if (!st.unlocked) return;
    EXEC_STATE.dossierStep = stepId;
    // Full re-render to refresh stepper visual state + phase title + footer
    _renderDossierSliderContent(dossierId);
}

function execSwitchRedactionSubtab(dossierId, subtabId) {
    EXEC_STATE.dossierRedactionSubtab = subtabId;
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier) return;
    const st = _dossierStepState(dossier, 'redaction');
    const content = _buildRedactionSubtabContent(subtabId, dossier, dossierId, st.editable);
    const container = document.getElementById('dossier_redaction_subtab_content');
    if (container) {
        container.style.animation = 'none';
        container.offsetHeight;
        container.style.animation = 'execFadeIn 0.3s ease';
        container.innerHTML = content;
    }
    const bar = document.getElementById('dossier_redaction_subtab_bar');
    if (bar) {
        bar.querySelectorAll('.exec-tab').forEach(btn => {
            btn.classList.toggle('active', (btn.getAttribute('onclick') || '').includes(`'${subtabId}'`));
        });
    }
}

function _buildDossierTabContent(tab, dossier, dossierId, canEdit, defaults) {
    const { notifObjet, notifDates, notifEquipe, notifPerimetre, notifRefs, notifProgramme } = defaults || {};
    const constatations = dossier.constatations || [];
    const ro = canEdit ? '' : ' readonly';
    const dis = canEdit ? '' : ' disabled';
    const roBg = canEdit ? '' : 'background:var(--bg);';

    if (tab === 'introduction') {
        return `
        <div style="display:grid;grid-template-columns:1fr 3fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>Date d'exécution</label>
                <input type="text" class="form-input" id="dossier_dates_activite" value="${_esc(dossier.dates_activite || notifDates || '')}"${ro} style="${roBg}">
            </div>
            <div class="form-group">
                <label>Objet de l'activité</label>
                <textarea class="form-input" id="dossier_objet_activite" rows="1" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.objet_activite || notifObjet || '')}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>Description générale de l'activité</label>
                <textarea class="form-input" id="dossier_description_activite" rows="3" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.description_activite || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Équipe d'inspection</label>
                <textarea class="form-input" id="dossier_equipe_inspection" rows="3" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.equipe_inspection || notifEquipe || '')}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>Aspects couverts par l'inspection</label>
                <textarea class="form-input" id="dossier_aspects_couverts" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.aspects_couverts || notifPerimetre || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Référentiel</label>
                <textarea class="form-input" id="dossier_referentiel" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.referentiel || notifRefs || '')}</textarea>
            </div>
        </div>`;
    } else if (tab === 'checklists') {
        // ── Section Checklists renseignées (issues de l'étape Réalisation) ──
        const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
        const realChkIds = _parse(dossier.realisation_checklists);
        const validees = _parse(dossier.checklists_validees);
        const allChecklists = EXEC_STATE.data.checklists || [];
        const allItems = EXEC_STATE.data.checklistItems || [];
        const chkSectionHtml = realChkIds.length
            ? realChkIds.map(cid => {
                const c = allChecklists.find(x => x.id === cid);
                if (!c) return '';
                const nbItems = allItems.filter(i => i.checklist_id === cid).length;
                const isVal = validees.includes(cid);
                return `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.7rem;border:1px solid var(--border);border-radius:6px;margin-bottom:0.4rem;background:#fff;">
                    <span style="font-weight:600;font-size:0.85rem;flex:1;">${c.reference ? _esc(c.reference) + ' — ' : ''}${_esc(c.nom)}
                        <span style="color:var(--text-muted);font-weight:400;font-size:0.75rem;">(${nbItems} item${nbItems>1?'s':''})</span>
                    </span>
                    ${isVal
                        ? `<span style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.74rem;font-weight:700;">✓ Validée</span>`
                        : ''}
                    <button class="btn btn-sm btn-outline" onclick="execOpenChecklistFiller('${dossierId}','${cid}')">${isVal ? '👁 Consulter' : '📝 Renseigner'}</button>
                    ${canEdit ? (isVal
                        ? `<button class="btn btn-sm btn-ghost" onclick="execSetDossierChecklistValidee('${dossierId}','${cid}',false)" title="Annuler la validation">↩</button>`
                        : `<button class="btn btn-sm btn-primary" onclick="execSetDossierChecklistValidee('${dossierId}','${cid}',true)">✓ Checklist Validée</button>`) : ''}
                </div>`;
            }).filter(Boolean).join('')
            : `<p style="color:var(--text-muted);font-size:0.83rem;font-style:italic;">Aucune checklist sélectionnée à l'étape Réalisation.</p>`;

        // ── Section Pièces jointes de l'activité (issues de l'étape Réalisation) ──
        let realPjs = [];
        try {
            realPjs = typeof dossier.realisation_pieces_jointes === 'string'
                ? JSON.parse(dossier.realisation_pieces_jointes || '[]')
                : (dossier.realisation_pieces_jointes || []);
        } catch (e) { realPjs = []; }
        if (!Array.isArray(realPjs)) realPjs = [];
        const pjRowsHtml = realPjs.map(pj => _execRealisationPjRow(pj, canEdit)).join('');
        const pjSectionHtml = `<div id="realisation_pj_list">${pjRowsHtml}</div>
            ${canEdit ? `
            <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="document.getElementById('realisation_pj_input').click()">${EXEC_ICONS.upload} Ajouter / remplacer</button>
                <button class="btn btn-sm btn-primary" onclick="execSaveRedactionPj('${dossierId}')">${EXEC_ICONS.check} Enregistrer</button>
                <input type="file" id="realisation_pj_input" style="display:none;" multiple onchange="execUploadRealisationPj(this.files)">
            </div>`
            : (realPjs.length ? '' : `<p style="color:var(--text-muted);font-size:0.83rem;font-style:italic;">Aucune pièce jointe ajoutée à l'étape Réalisation.</p>`)}`;

        return `
        <div style="margin-bottom:1.25rem;">
            <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">Checklists renseignées</h4>
            ${chkSectionHtml}
            ${canEdit ? `<button class="btn btn-sm btn-outline" style="margin-top:0.5rem;" onclick="execOpenChecklistsPicker('${dossierId}','checklists')">${EXEC_ICONS.add} Ajouter des checklists</button>` : ''}
        </div>
        <div style="margin-bottom:1.25rem;">
            <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">Pièces jointes de l'activité</h4>
            ${pjSectionHtml}
        </div>
        <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#1a365d;">Autres documents</h4>
        <div id="dossier_checklists_list">
            ${(dossier.checklists || []).map(cl => `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_esc(cl.path || '')}">
                ${EXEC_ICONS.file} <span style="flex:1;">${_esc(cl.filename || cl)}</span>
                ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>` : ''}
            </div>`).join('')}
        </div>
        ${canEdit ? `
        <div class="exec-upload-zone" style="margin-top:0.75rem;padding:1.5rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('dossier_checklist_input').click()">
            ${EXEC_ICONS.upload} ${te('upload_zone')}
            <input type="file" id="dossier_checklist_input" style="display:none;" multiple onchange="execUploadDossierFile(this.files, 'checklist')">
        </div>` : ''}`;
    } else if (tab === 'synthese') {
        return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
            <div class="form-group">
                <label>${te('points_forts')}</label>
                <textarea class="form-input" id="dossier_points_forts" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.synthese_points_forts || '')}</textarea>
            </div>
            <div class="form-group">
                <label>${te('points_faibles')}</label>
                <textarea class="form-input" id="dossier_points_faibles" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.synthese_points_faibles || '')}</textarea>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('opportunites_amelioration')}</label>
                <textarea class="form-input" id="dossier_opportunites" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.opportunites_amelioration || '')}</textarea>
            </div>
            <div class="form-group">
                <label>${te('resume_global')}</label>
                <textarea class="form-input" id="dossier_resume_global" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.resume_global_constatations || '')}</textarea>
            </div>
        </div>`;
    } else if (tab === 'constatations') {
        // Determine rapport validation status for the Modifier button
        const rapports = dossier.rapports || [];
        const hasRapportValide = rapports.some(r => r.statut === 'valide');
        const hasRapportTransmis = rapports.some(r => r.statut === 'transmis');
        const isAdmin = _execIsAdmin();
        return `
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
            ${canEdit ? `
            <button class="btn btn-sm btn-accent" onclick="execOpenFNCForm('${dossierId}')">
                ${EXEC_ICONS.add} ${te('creer_fnc')}
            </button>` : ''}
            ${constatations.length > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="execExportConstatations('${dossierId}','xlsx')" title="Exporter Excel">
                ${EXEC_ICONS.download || EXEC_ICONS.file} Exporter Excel
            </button>
            <button class="btn btn-primary btn-sm" onclick="execExportConstatations('${dossierId}','pdf')" title="Exporter PDF">
                ${EXEC_ICONS.pdf || EXEC_ICONS.download || EXEC_ICONS.file} Exporter PDF
            </button>` : ''}
        </div>
        ${constatations.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${te('no_data')}</p>` : `
        <div style="overflow-x:auto;">
        <table class="exec-data-table" id="exec_constatations_table">
            <thead><tr>
                <th>${te('reference')}</th>
                <th>${te('criticite')}</th>
                <th style="min-width:180px;">${te('description_constatation')}</th>
                <th>Date Ouv.</th>
                <th>Delai</th>
                <th>${te('date_due')}</th>
                <th>${te('preuves')}</th>
                <th>${te('status')}</th>
                <th style="width:1%;white-space:nowrap;text-align:center;">${te('actions')}</th>
            </tr></thead>
            <tbody>
                ${constatations.map(c => {
                    const preuves = c.preuves_constatation || [];
                    const preuvesHtml = preuves.length > 0 ? preuves.map(p => {
                        const fname = typeof p === 'object' ? (p.filename || p.name || '') : p;
                        const fpath = typeof p === 'object' ? (p.path || '') : '';
                        return fpath ? `<a href="${_esc(_execDl(fpath))}" download="${_esc(fname)}" style="display:inline-flex;align-items:center;gap:0.2rem;font-size:0.8rem;color:var(--primary);">${EXEC_ICONS.file} ${_esc(fname)}</a>` : `<span style="font-size:0.8rem;">${_esc(fname)}</span>`;
                    }).join('<br>') : '-';
                    // Read-only when rapport validé/transmis or dossier clôturé (admin bypass)
                    const isConstReadOnly = (hasRapportValide || hasRapportTransmis || dossier.statut === 'cloture') && !isAdmin;
                    let modifierBtn = '';
                    if (isConstReadOnly) {
                        modifierBtn = `<button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;" onclick="execViewFNC('${dossierId}','${c.id}')" title="${te('consulter')||'Consulter'}">${EXEC_ICONS.eye||'👁'}</button>`;
                    } else {
                        modifierBtn = `<button class="btn btn-sm btn-outline" style="padding:0.2rem 0.4rem;" onclick="execEditFNC('${dossierId}','${c.id}')" title="${te('modifier_fnc')||'Modifier'}">${EXEC_ICONS.edit}</button>`;
                    }
                    const autoGenFlag = c.checklist_item_id
                        ? ` <span title="Cette constatation a été générée automatiquement à partir d'une checklist. Une revue de la constatation est nécessaire ainsi que sa validation." style="cursor:help;color:#f59e0b;font-size:0.95rem;">&#9888;</span>`
                        : '';
                    return `<tr>
                    <td><strong>${_esc(c.reference || '')}</strong>${autoGenFlag}</td>
                    <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
                    <td style="white-space:normal;word-break:break-word;">${_esc(c.description || c.titre || '')}</td>
                    <td>${_formatDate(c.date_ouverture || '')}</td>
                    <td>${_esc(c.delai_solde || c.delai_correction || '-')}</td>
                    <td>${_formatDate(c.date_due_cloture || c.date_due || '')}</td>
                    <td>${preuvesHtml}</td>
                    <td>${_execStatusBadge(c.statut)}</td>
                    <td style="display:flex;gap:0.25rem;justify-content:center;align-items:center;white-space:nowrap;">
                        ${modifierBtn}
                        <button class="btn btn-sm btn-outline" id="fiches_btn_${c.id}" style="padding:0.2rem 0.4rem;" onclick="_execToggleFiches('${c.id}')" title="Fiches">
                            ${EXEC_ICONS.file}<span class="caret" style="display:inline-block;transition:transform 0.15s;">▸</span>
                        </button>
                        ${(!isConstReadOnly || isAdmin) ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.2rem 0.4rem;" onclick="execDeleteConstatation('${c.id}')" title="${te('delete') || 'Supprimer'}">${EXEC_ICONS.x || '✕'}</button>` : ''}
                    </td>
                </tr>
                <tr id="fiches_row_${c.id}" style="display:none;">
                    <td colspan="9" style="background:var(--bg);padding:0.6rem 0.8rem;border-top:none;">
                        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
                            <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600;margin-right:0.4rem;">Fiches :</span>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheConstat('${c.id}','pdf')">
                                ${EXEC_ICONS.pdf||EXEC_ICONS.file} ${te('fiche_constat')||'Fiche Constat'} (PDF)
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheConstat('${c.id}','word')">
                                ${EXEC_ICONS.file} ${te('fiche_constat')||'Fiche Constat'} (Word)
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheSuivi('${c.id}','pdf')">
                                ${EXEC_ICONS.pdf||EXEC_ICONS.clipboard} ${te('fiche_suivi')||'Fiche Suivi'} (PDF)
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="execExportFicheSuivi('${c.id}','word')">
                                ${EXEC_ICONS.clipboard} ${te('fiche_suivi')||'Fiche Suivi'} (Word)
                            </button>
                        </div>
                    </td>
                </tr>`}).join('')}
            </tbody>
        </table>
        </div>`}`;
    } else if (tab === 'conclusion') {
        return `
        <div class="form-group" style="margin-bottom:1.5rem;">
            <label style="font-weight:600;">Conclusions</label>
            <textarea class="form-input" id="dossier_conclusion" rows="5" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.conclusion || '')}</textarea>
        </div>
        <h4 style="margin-bottom:0.75rem;">${te('annexes')}</h4>
        <div id="dossier_annexes_list">
            ${(dossier.annexes || []).map((a, i) => {
                const obj = typeof a === 'object' ? a : { intitule: '', contenu: '', filename: a };
                return `
                <div class="dossier-annexe-item" style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;">
                    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
                        <input type="text" class="form-input annexe-intitule" value="${_esc(obj.intitule || obj.filename || '')}" placeholder="Intitulé de l'annexe" style="flex:1;">
                        ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="this.closest('.dossier-annexe-item').remove()">${EXEC_ICONS.x}</button>` : ''}
                    </div>
                    <textarea class="form-input annexe-contenu" rows="3" style="resize:vertical;margin-bottom:0.5rem;" placeholder="Contenu...">${_esc(obj.contenu || '')}</textarea>
                    <div class="annexe-files" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        ${(obj.files || []).map(f => `<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.5rem;background:var(--bg);border-radius:4px;font-size:0.8rem;" data-path="${_esc(f.path || '')}" data-filename="${_esc(f.filename || f)}">${EXEC_ICONS.file} ${_esc(f.filename || f)} <button class="btn btn-sm" style="padding:0;color:#ef4444;" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button></span>`).join('')}
                    </div>
                    <div style="margin-top:0.5rem;">
                        <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click();">${EXEC_ICONS.upload} Pièces jointes</button>
                        <input type="file" style="display:none;" multiple onchange="execUploadAnnexeFile(this)">
                    </div>
                </div>`;
            }).join('')}
        </div>
        ${canEdit ? `
        <button class="btn btn-sm btn-outline" onclick="execAddAnnexeBlock()" style="margin-top:0.5rem;">
            ${EXEC_ICONS.add} Ajouter une annexe
        </button>` : ''}`;
    } else if (tab === 'rapports') {
        const rapports = dossier.rapports || [];
        return `
        ${rapports.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${te('no_data')}</p>` : `
        <table class="exec-data-table">
            <thead><tr>
                <th>${te('ref_rapport')}</th>
                <th>${te('titre_rapport')}</th>
                <th>${te('date_emission')}</th>
                <th>${te('statut_validation')}</th>
                <th>${te('actions')}</th>
            </tr></thead>
            <tbody>
                ${rapports.map(r => `<tr>
                    <td><strong>${_esc(r.reference || '')}</strong></td>
                    <td>${_esc(r.titre || '')}</td>
                    <td>${_formatDate(r.date_creation)}</td>
                    <td>${_execStatusBadge(r.statut)}</td>
                    <td style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-outline" onclick="execPreviewRapport('${r.id}')">
                            ${EXEC_ICONS.eye} ${te('apercu')}
                        </button>
                        ${_execCanContribute() && r.statut !== 'transmis' ? `
                        <button class="btn btn-sm btn-accent" onclick="execSendRapport('${r.id}')">
                            ${EXEC_ICONS.send} ${te('envoyer_prestataire')}
                        </button>` : ''}
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`}`;
    }
    return '';
}

async function execUploadDossierFile(files, type) {
    if (!files || files.length === 0) return;
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const listId = type === 'checklist' ? 'dossier_checklists_list' : 'dossier_annexes_list';
                const container = document.getElementById(listId);
                if (container) {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;';
                    div.innerHTML = `${EXEC_ICONS.file} <span style="flex:1;">${_esc(data.filename)}</span>
                        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
                    div.dataset.path = data.path;
                    container.appendChild(div);
                }
            }
        } catch (e) {
            console.error('Upload error:', e);
        }
    }
}

function execAddAnnexeBlock() {
    const container = document.getElementById('dossier_annexes_list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'dossier-annexe-item';
    div.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;';
    div.innerHTML = `
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
            <input type="text" class="form-input annexe-intitule" value="" placeholder="Intitulé de l'annexe" style="flex:1;">
            <button class="btn btn-sm btn-danger" onclick="this.closest('.dossier-annexe-item').remove()">${EXEC_ICONS.x}</button>
        </div>
        <textarea class="form-input annexe-contenu" rows="3" style="resize:vertical;margin-bottom:0.5rem;" placeholder="Contenu..."></textarea>
        <div class="annexe-files" style="display:flex;gap:0.5rem;flex-wrap:wrap;"></div>
        <div style="margin-top:0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click();">${EXEC_ICONS.upload} Pièces jointes</button>
            <input type="file" style="display:none;" multiple onchange="execUploadAnnexeFile(this)">
        </div>`;
    container.appendChild(div);
}

async function execUploadAnnexeFile(input) {
    if (!input.files || input.files.length === 0) return;
    const annexeItem = input.closest('.dossier-annexe-item');
    const filesContainer = annexeItem?.querySelector('.annexe-files');
    if (!filesContainer) return;
    for (const file of input.files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const span = document.createElement('span');
                span.style.cssText = 'display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.5rem;background:var(--bg);border-radius:4px;font-size:0.8rem;';
                span.dataset.path = data.path;
                span.dataset.filename = data.filename;
                span.innerHTML = `${EXEC_ICONS.file} ${_esc(data.filename)} <button class="btn btn-sm" style="padding:0;color:#ef4444;" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
                filesContainer.appendChild(span);
            }
        } catch (e) {
            console.error('Annexe upload error:', e);
        }
    }
    input.value = '';
}

async function execSubmitDossier(dossierId) {
    if (!confirm('Soumettre ce rapport pour validation ?')) return;
    // Save first, also clear observations
    await execSaveDossier(dossierId, true);
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ observations_retour: '' })
        });
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/submit`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Rapport soumis avec succès', 'success');
        // Reload dossier and navigate to validation step
        EXEC_STATE.dossierStep = 'validation';
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Submit dossier error:', e);
        _execToast('Erreur lors de la soumission', 'error');
    }
}

function _collectRealisationEquipe() {
    const equipe = [];
    const container = document.getElementById('realisation_equipe_container');
    if (container) {
        container.querySelectorAll('div[style]').forEach(div => {
            const selects = div.querySelectorAll('select');
            const nom = selects[0] ? selects[0].value.trim() : '';
            const role = selects[1] ? selects[1].value : '';
            if (nom) equipe.push({ nom, role });
        });
    }
    return equipe;
}

function _collectRealisationProgramme() {
    const programme = [];
    document.querySelectorAll('#realisation_programme_table tbody tr:not(#real_prog_empty)').forEach(tr => {
        const row = {};
        // Inclut input ET textarea (la colonne « Actions prévues » est multiligne)
        tr.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => { row[inp.dataset.field] = inp.value; });
        if (row.date || row.actions) programme.push(row);
    });
    return programme;
}

function execAddRealisationEquipeMember() {
    const container = document.getElementById('realisation_equipe_container');
    if (!container) return;
    const emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;';
    const roles = ["Chef d'équipe", "Membre d'équipe", "Stagiaire", "Formation en cours d'emploi", "Experts ou Autres"];
    const inspList = typeof _getFilteredInspecteurs === 'function' ? _getFilteredInspecteurs() : [];
    div.innerHTML = `
        <select class="form-select real-equipe-nom" style="flex:1;">
            <option value="">-- Inspecteur --</option>
            ${inspList.map(ins => `<option value="${_esc(ins.prenom + ' ' + ins.nom)}">${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
        </select>
        <select class="form-select real-equipe-role" style="flex:1;">
            <option value="">${te('select_option')}</option>
            ${roles.map(r => `<option value="${_esc(r)}">${_esc(r)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
    `;
    container.appendChild(div);
}

function execAddRealisationProgrammeLine() {
    const tbody = document.querySelector('#realisation_programme_table tbody');
    if (!tbody) return;
    const empty = document.getElementById('real_prog_empty');
    if (empty) empty.remove();
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" class="form-input" data-field="date"></td>
        <td><input type="text" class="form-input" data-field="horaire" placeholder="09:00-12:00"></td>
        <td><textarea class="form-input" rows="2" data-field="actions" style="resize:vertical;"></textarea></td>
        <td><input type="text" class="form-input" data-field="correspondant"></td>
        <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">${EXEC_ICONS.x}</button></td>
    `;
    tbody.appendChild(tr);
}

async function execSaveRealisation(dossierId) {
    const act = document.getElementById('realisation_activite');
    const payload = {};
    // Collect structured equipe
    const equipe = _collectRealisationEquipe();
    payload.realisation_equipe = JSON.stringify(equipe);
    if (act) payload.realisation_activite = act.value;
    // Nouveaux champs (repris de la Notification, éditables)
    const _v = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
    ['realisation_nature', 'realisation_date_debut', 'realisation_date_fin',
     'realisation_lieu', 'realisation_perimetre'].forEach(f => {
        const val = _v(f);
        if (val !== undefined) payload[f] = val;
    });
    // Pièces jointes de l'activité
    if (document.getElementById('realisation_pj_list')) {
        payload.realisation_pieces_jointes = JSON.stringify(_collectRealisationPj());
    }
    // Collect structured programme
    const programme = _collectRealisationProgramme();
    payload.realisation_programme = JSON.stringify(programme);
    // Selected checklists : la sélection est persistée via le picker modal (execOpenChecklistsPicker)
    // — pas besoin de la recalculer ici. Conserve la valeur actuelle.
    if (!Object.keys(payload).length) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'PUT', body: JSON.stringify(payload) });
        Object.assign(EXEC_STATE.selectedDossier || {}, payload);
        await execRefreshDynamic();
        _execToast('Informations enregistrées', 'success');
    } catch (e) {
        console.error('Save realisation error:', e);
        _execToast('Erreur lors de l\'enregistrement', 'error');
    }
}

async function execCloseRealisation(dossierId) {
    if (!confirm('Clôturer l\'exécution sur le terrain ? La rédaction du rapport sera activée.')) return;
    await execSaveRealisation(dossierId);
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/close-realisation`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Exécution sur le terrain clôturée', 'success');
        EXEC_STATE.dossierStep = 'redaction';
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Close realisation error:', e);
        _execToast('Erreur lors de la clôture', 'error');
    }
}

// ── Checklists attachées au dossier (étape Réalisation) ──

// Persiste la liste des checklists du dossier puis re-rend l'étape.
async function _execSetDossierChecklists(dossierId, ids, returnTab) {
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ realisation_checklists: JSON.stringify(ids) })
        });
        if (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId) {
            EXEC_STATE.selectedDossier.realisation_checklists = JSON.stringify(ids);
        }
        await execRefreshDynamic();
        execOpenDossierSlider(dossierId, returnTab || 'realisation');
    } catch (e) { _execToast('Erreur enregistrement sélection', 'error'); }
}

// Ouvre une modale listant les checklists applicables au secteur de l'activité.
function execOpenChecklistsPicker(dossierId, returnTab) {
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    // Déduit le secteur de l'activité via le prestataire (fallback : tous)
    const prest = (window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires || [])
        .find(p => p.id === dossier.prestataire_id);
    const secteurId = prest?.secteur_id || dossier.secteur_id || '';
    const allChecklists = EXEC_STATE.data.checklists || [];
    const filtered = secteurId
        ? allChecklists.filter(c => {
            const secs = _parse(c.secteurs_ids);
            // Inclut si la checklist cible explicitement ce secteur, ou si elle n'a aucune restriction de secteur
            return secs.length === 0 || secs.includes(secteurId);
        })
        : allChecklists;
    const current = new Set(_parse(dossier.realisation_checklists));
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const list = filtered.length
        ? filtered.map(c => `<label class="exec-chk-pick-row">
            <input type="checkbox" class="picker-chk-cb" value="${c.id}" ${current.has(c.id)?'checked':''}>
            <span class="pick-row-text">
                <strong>${c.reference ? _esc2(c.reference) + ' — ' : ''}${_esc2(c.nom)}</strong>
                ${c.description ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.1rem;">${_esc2(c.description.slice(0, 120))}${c.description.length>120?'…':''}</div>` : ''}
            </span>
        </label>`).join('')
        : `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-style:italic;">Aucune checklist applicable${secteurId ? ' au secteur de cette activité' : ''}.</div>`;

    const hint = secteurId
        ? `Checklists filtrées par le secteur de l'activité (${filtered.length} disponible${filtered.length>1?'s':''}).`
        : `Aucun secteur identifié — toutes les checklists sont listées.`;

    shellShowModal('Sélectionner les checklists à utiliser', `
        <style>
            #execChkPickerList { text-align:left !important; display:block !important; }
            #execChkPickerList label.exec-chk-pick-row {
                display:block !important;
                padding:0.5rem 0.7rem !important;
                border-bottom:1px solid var(--border) !important;
                font-size:0.83rem !important;
                cursor:pointer !important;
                width:auto !important;
                margin:0 !important;
                text-align:left !important;
                box-sizing:border-box !important;
                white-space:normal !important;
            }
            #execChkPickerList label.exec-chk-pick-row:hover { background:rgba(59,130,246,0.04); }
            #execChkPickerList label.exec-chk-pick-row input[type="checkbox"] {
                margin:0 0.55rem 0 0 !important;
                vertical-align:top !important;
                width:auto !important;
                display:inline-block !important;
            }
            #execChkPickerList label.exec-chk-pick-row .pick-row-text {
                display:inline-block !important;
                vertical-align:top !important;
                width:calc(100% - 28px) !important;
                text-align:left !important;
            }
            #execChkPickerList label.exec-chk-pick-row strong { display:block !important; text-align:left !important; }
            #execChkPickerList label.exec-chk-pick-row .pick-row-text > div { text-align:left !important; }
        </style>
        <div style="text-align:left;">
            <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 0.5rem;text-align:left;">${hint}</p>
            <div id="execChkPickerList" style="max-height:50vh;overflow:auto;border:1px solid var(--border);border-radius:6px;">${list}</div>
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveChecklistsPicker('${dossierId}','${returnTab || ''}')">Valider la sélection</button>
    `);
}

async function execSaveChecklistsPicker(dossierId, returnTab) {
    const ids = Array.from(document.querySelectorAll('.picker-chk-cb'))
        .filter(c => c.checked).map(c => c.value);
    shellCloseModal();
    await _execSetDossierChecklists(dossierId, ids, returnTab || undefined);
}

// Retire une checklist de la sélection du dossier (depuis la section déployée).
async function execRemoveDossierChecklist(dossierId, checklistId) {
    if (!confirm('Retirer cette checklist de la sélection ?')) return;
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const ids = _parse(dossier.realisation_checklists).filter(id => id !== checklistId);
    await _execSetDossierChecklists(dossierId, ids);
}

// Ouvre un slicer plein écran pour renseigner les items d'une checklist du dossier.
async function execOpenChecklistFiller(dossierId, checklistId) {
    // Recharge si nécessaire (le cache peut être vide juste après création)
    if (!(EXEC_STATE.data.checklists || []).length) {
        try { await execRefreshChecklists(); } catch (e) {}
    }
    const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
    if (!cl) {
        _execToast('Checklist introuvable (id : ' + checklistId + ')', 'error');
        console.error('Checklist not found', checklistId, EXEC_STATE.data.checklists);
        return;
    }
    // Auto-rétracte la barre de menu du portail (mémorise l'état pour le restaurer à la fermeture)
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        const wasCollapsed = wrapper ? wrapper.classList.contains('sidebar-collapsed') : false;
        window._execChkFillerPrevCollapsed = wasCollapsed;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = true;
        if (wrapper) wrapper.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.classList.add('collapsed');
    } catch (e) {}
    const items = (EXEC_STATE.data.checklistItems || [])
        .filter(i => i.checklist_id === checklistId)
        .slice()
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const statuts = (EXEC_STATE.data.checklistStatuts || []).slice()
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    // Charge les réponses déjà saisies pour ce couple (dossier, checklist)
    let responses = [];
    try {
        const all = await api('/api/exec-checklist-responses');
        responses = (all || []).filter(r => r.dossier_id === dossierId && r.checklist_id === checklistId);
    } catch (e) { responses = []; }
    const respByItem = {};
    responses.forEach(r => { respByItem[r.item_id] = r; });
    // Sous-thèmes pour libellés
    const sousThemes = (EXEC_STATE.data.checklistSousThemes || []).filter(s => s.checklist_id === checklistId);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themeLbl = id => allThemes.find(t => t.id === id)?.libelle || '-';
    const sousThLbl = id => sousThemes.find(s => s.id === id)?.libelle || '-';
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    document.getElementById('execChkFillerWrap')?.remove();

    // Couleur associée à un statut (vide => non évalué => gris clair)
    const statutColor = id => {
        const s = statuts.find(x => x.id === id);
        return s && s.couleur ? s.couleur : '';
    };
    // Statut par défaut = celui dont le libellé est « Non Évalué » (depuis la liste configurée)
    const _normL = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const defaultStatut = statuts.find(s => _normL(s.libelle) === 'non evalue'
        || _normL(s.libelle) === 'non evaluee');
    const defaultStatutId = defaultStatut ? defaultStatut.id : '';

    // ── Regroupement Sous-Domaine (sous-activité) › Thème › Sous-thème ──
    const sousActs = (window.PESSCO?.sharedData?.sousActivites) || [];
    const saLbl = id => { const s = sousActs.find(x => x.id === id); return s ? (s.code || s.nom || '—') : ''; };
    const themeSaId = themeId => allThemes.find(t => t.id === themeId)?.sous_activite_id || '';

    // Construit l'arbre : { saKey: { label, themes: { thKey: { label, sousThemes: { stKey: { label, items[] } } } } } }
    const tree = {};
    items.forEach(it => {
        const saId = themeSaId(it.theme_id) || '_';
        const thId = it.theme_id || '_';
        const stId = it.sous_theme_id || '_';
        if (!tree[saId]) tree[saId] = { label: saId === '_' ? '(Sans sous-domaine)' : (saLbl(saId) || '(Sous-domaine)'), themes: {} };
        const tn = tree[saId].themes;
        if (!tn[thId]) tn[thId] = { label: thId === '_' ? '(Sans thème)' : themeLbl(thId), sousThemes: {} };
        const sn = tn[thId].sousThemes;
        if (!sn[stId]) sn[stId] = { label: stId === '_' ? '(Sans sous-thème)' : sousThLbl(stId), items: [] };
        sn[stId].items.push(it);
    });

    // Statuts « non satisfaisant » → déclenchent la possibilité de générer une constatation
    const nonSatIds = new Set(statuts
        .filter(s => _normL(s.libelle).includes('non satisfaisant') || _normL(s.libelle).includes('non-satisfaisant'))
        .map(s => s.id));

    const _itemRow = it => {
        const r = respByItem[it.id] || {};
        const effStatut = r.statut_id || defaultStatutId;
        const col = statutColor(effStatut);
        const rowBg = col ? `background:${col}22;` : '';
        const _esc3 = s => _esc2(s);
        // Réf. Règlement : peut être un tableau JSON d'ids d'exigences ou du texte libre
        const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
        let regDisplay = '';
        const rawReg = String(it.ref_reglement || '').trim();
        if (rawReg.startsWith('[')) {
            try {
                const arr = JSON.parse(rawReg);
                if (Array.isArray(arr)) {
                    regDisplay = arr.map(id => {
                        const e = exigencesAll.find(x => x.id === id);
                        return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '';
                    }).filter(Boolean).join('\n');
                }
            } catch (e) { regDisplay = rawReg; }
        } else {
            regDisplay = rawReg;
        }
        return `<tr data-item-id="${it.id}" data-ref="${_esc3((it.ref_item||'')+' '+(it.description||''))}" style="${rowBg}">
            <td><strong>${_esc3(it.ref_item || '-')}</strong></td>
            <td style="white-space:pre-wrap;font-size:0.72rem;color:#555;">${_esc3(regDisplay)}</td>
            <td style="white-space:pre-wrap;">${_esc3(it.description || '')}</td>
            <td style="white-space:pre-wrap;font-size:0.72rem;color:#555;">${_esc3(it.directives || '')}</td>
            <td><select class="exec-chk-fill-statut" data-item="${it.id}">
                ${statuts.map(s => `<option value="${s.id}" ${effStatut===s.id?'selected':''}>${_esc3(s.alias || s.libelle)}</option>`).join('')}
            </select></td>
            <td><textarea class="exec-chk-fill-obs" data-item="${it.id}" rows="2" placeholder="Observations terrain…">${_esc3(r.observations || '')}</textarea></td>
            <td style="text-align:center;">
                <div class="exec-chk-row-state" data-item="${it.id}" style="font-size:0.7rem;color:var(--text-muted);"></div>
                <button class="btn btn-sm btn-danger exec-chk-gen-btn" data-item="${it.id}"
                    title="Générer une constatation"
                    style="${nonSatIds.has(effStatut) ? '' : 'display:none;'}margin-top:0.2rem;padding:0.2rem 0.4rem;font-size:0.8rem;line-height:1;"
                    onclick="execChkFillGenConstatation('${dossierId}','${it.id}')">⚠</button>
            </td>
        </tr>`;
    };
    const _leafTable = grpItems => `<table class="exec-cli-inline-table" style="margin-top:0.3rem;">
        <thead><tr>
            <th style="width:90px;">Réf. Item</th>
            <th style="min-width:170px;">Réf. Règlement</th>
            <th style="min-width:280px;">Description</th>
            <th style="min-width:200px;">Directives</th>
            <th style="width:170px;">Statut</th>
            <th style="min-width:220px;">Observations</th>
            <th style="width:60px;"></th>
        </tr></thead>
        <tbody>${grpItems.map(_itemRow).join('')}</tbody>
    </table>`;

    let groupsHtml = '';
    if (!items.length) {
        groupsHtml = `<div style="text-align:center;color:var(--text-muted);padding:1.5rem;font-style:italic;">Cette checklist ne contient aucun item.</div>`;
    } else {
        // Bouton d'activation/désactivation d'un regroupement
        const _grpToggleBtn = `<button type="button" class="exec-chk-grp-toggle" title="Activer / désactiver ce regroupement"
            onclick="event.preventDefault();event.stopPropagation();execChkToggleGroup(this);">◉</button>`;
        groupsHtml = Object.keys(tree).map(saId => {
            const sa = tree[saId];
            const themesHtml = Object.keys(sa.themes).map(thId => {
                const th = sa.themes[thId];
                const stsHtml = Object.keys(th.sousThemes).map(stId => {
                    const st = th.sousThemes[stId];
                    // Masquer le bandeau « (Sans sous-thème) » : items affichés directement
                    if (stId === '_') {
                        return `<div class="exec-chk-grp-body" style="padding:0.3rem;">${_leafTable(st.items)}</div>`;
                    }
                    return `<details class="exec-chk-grp exec-chk-grp-st" open>
                        <summary>${_grpToggleBtn}<span class="exec-chk-grp-label">${_esc2(st.label)}</span> <span class="exec-chk-grp-count">${st.items.length}</span></summary>
                        <div class="exec-chk-grp-body">${_leafTable(st.items)}</div>
                    </details>`;
                }).join('');
                const thCount = Object.values(th.sousThemes).reduce((n, s) => n + s.items.length, 0);
                return `<details class="exec-chk-grp exec-chk-grp-th" open>
                    <summary>${_grpToggleBtn}<span class="exec-chk-grp-label">${_esc2(th.label)}</span> <span class="exec-chk-grp-count">${thCount}</span></summary>
                    <div class="exec-chk-grp-body">${stsHtml}</div>
                </details>`;
            }).join('');
            const saCount = Object.values(sa.themes).reduce((n, t) =>
                n + Object.values(t.sousThemes).reduce((m, s) => m + s.items.length, 0), 0);
            return `<details class="exec-chk-grp exec-chk-grp-sd" open>
                <summary>${_grpToggleBtn}<span class="exec-chk-grp-label">${_esc2(sa.label)}</span> <span class="exec-chk-grp-count">${saCount}</span></summary>
                <div class="exec-chk-grp-body">${themesHtml}</div>
            </details>`;
        }).join('');
    }

    // Contexte conservé pour les recalculs de synthèse / couleurs après chaque changement
    window._execChkFillerCtx = {
        dossierId, checklistId,
        totalItems: items.length,
        statuts: statuts.map(s => ({ id: s.id, libelle: s.libelle, couleur: s.couleur || '' })),
        nonSatIds: Array.from(nonSatIds)
    };

    // ── Section rétractable « Activité » : renseignements du dossier courant ──
    // Priorité au dossier détaillé (selectedDossier) : il contient les champs joints
    // de la Notification (notif_nature, notif_lieu, notif_perimetre…) absents de la liste.
    let dossier = (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId)
        ? EXEC_STATE.selectedDossier
        : (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId) || {};
    // Si le dossier courant n'a pas les champs joints de notification, on le re-fetch unitairement.
    if (dossier && dossier.id && dossier.notif_nature === undefined && dossier.notif_lieu === undefined) {
        try {
            const full = await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`);
            if (full && full.id) dossier = full;
        } catch (e) { /* repli silencieux */ }
    }
    const _dval = v => (v === null || v === undefined || v === '') ? '—' : String(v);
    const refDossier = dossier.final_reference || dossier.base_reference || dossier.reference || dossier.id || '';
    const _prestObj = (window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires || [])
        .find(p => p.id === dossier.prestataire_id) || {};
    const prestNom = dossier.prestataire_nom || _prestObj.nom || '';
    const refAgrement = _prestObj.ref_agrement || '';
    let equipeStr = '';
    try {
        let eq = dossier.realisation_equipe;
        eq = typeof eq === 'string' ? JSON.parse(eq || '[]') : (eq || []);
        if (!Array.isArray(eq) || !eq.length) {
            let ne = dossier.notif_equipe;
            ne = typeof ne === 'string' ? JSON.parse(ne || '[]') : (ne || []);
            eq = Array.isArray(ne) ? ne : [];
        }
        equipeStr = eq.map(m => {
            const nom = typeof m === 'string' ? m : (m.nom || '');
            const role = typeof m === 'object' ? (m.role || '') : '';
            return nom ? (' - ' + nom + (role ? ` (${role})` : '')) : '';
        }).filter(Boolean).join('\n');
    } catch (e) {}
    // Domaine = domaine de rattachement du secteur ; Secteur = secteur de rattachement du prestataire
    const _domSec = _execResolveDossierDomSec(dossier);
    // Priorité aux données saisies à l'étape Réalisation, repli sur la Notification
    const dateDebut = dossier.realisation_date_debut || dossier.notif_date_debut || dossier.date_debut_execution || '';
    const dateFin = dossier.realisation_date_fin || dossier.notif_date_fin || dossier.date_fin_execution || '';
    const lieu = dossier.realisation_lieu || dossier.notif_lieu || dossier.notif_fait_a || '';
    let nature = dossier.realisation_nature || dossier.notif_nature || '';
    if (nature) nature = nature.charAt(0).toUpperCase() + nature.slice(1);
    const objet = dossier.realisation_activite || dossier.objet_activite || dossier.notification_objet || '';
    const perimetre = dossier.realisation_perimetre || dossier.notif_perimetre_valide || dossier.notif_perimetre || '';
    const _fld = (lbl, val, flex) => `<div style="flex:${flex || '1 1 140px'};min-width:0;">
        <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.03em;">${lbl}</div>
        <div style="font-size:0.8rem;font-weight:600;color:#1f2937;white-space:pre-wrap;word-break:break-word;">${_esc2(_dval(val))}</div>
    </div>`;
    const activiteHtml = `<details class="exec-chk-activite" open style="border:1px solid var(--border);border-radius:6px;margin-bottom:0.6rem;background:#fff;">
        <summary style="cursor:pointer;padding:0.4rem 0.7rem;font-weight:700;font-size:0.82rem;background:var(--primary, #1a365d);color:#fff;border-radius:6px 6px 0 0;list-style:none;">▸ Activité${_domSec.domaineNom ? ' - ' + _esc2(_domSec.domaineNom) : ''}</summary>
        <div style="padding:0.5rem 0.7rem;display:flex;flex-direction:column;gap:0.45rem;">
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld('Référence du dossier', refDossier)}
                ${_fld('Prestataire', prestNom)}
                ${_fld('Réf Agrément', refAgrement)}
                ${_fld('Secteur', _domSec.secteurNom)}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld("Nature de l'activité", nature)}
                ${_fld('Date Début', dateDebut ? _formatDate(dateDebut) : '')}
                ${_fld('Date Fin', dateFin ? _formatDate(dateFin) : '')}
                ${_fld('Lieu', lieu)}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld('Objet', objet, '1 1 0')}
                ${_fld('Périmètre', perimetre, '3 1 0')}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem 1rem;">
                ${_fld("Équipe d'audit / inspection", equipeStr, '1 1 100%')}
            </div>
        </div>
    </details>`;

    const html = `
    <div id="execChkFillerWrap" class="exec-cli-slicer-wrap">
        <style>
            #execChkFillerWrap { position:fixed; top:var(--topbar-height, 56px); left:var(--sidebar-width, 240px); right:0; bottom:0; z-index:1100; transition:left 0.3s ease; }
            body.app-sidebar-collapsed #execChkFillerWrap { left:var(--sidebar-collapsed, 60px); }
            #execChkFillerWrap .exec-cli-slicer-overlay { position:absolute; inset:0; background:rgba(15,23,42,0.35); }
            #execChkFillerWrap .exec-cli-slicer { position:absolute; top:0; right:0; bottom:0; left:0; width:auto; max-width:100%;
                background:var(--bg, #fff); box-shadow:-8px 0 30px rgba(0,0,0,0.18);
                display:flex; flex-direction:column; animation:execCliSlideIn 0.25s ease; }
            @media (max-width: 640px) {
                #execChkFillerWrap { left:0; }
            }
            @keyframes execCliSlideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
            #execChkFillerWrap .exec-cli-slicer-header { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-card); gap:0.5rem; flex-wrap:wrap; }
            #execChkFillerWrap .exec-cli-slicer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
            #execChkFillerWrap .exec-cli-inline-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
            #execChkFillerWrap .exec-cli-inline-table thead th { background:var(--primary, #1a365d); color:#fff; text-align:left; padding:0.45rem 0.55rem; font-weight:600; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; position:sticky; top:0; z-index:1; }
            #execChkFillerWrap .exec-cli-inline-table tbody td { border-bottom:1px solid var(--border); padding:0.35rem 0.45rem; vertical-align:top; }
            #execChkFillerWrap .exec-cli-inline-table tbody tr:hover { background:rgba(59,130,246,0.04); }
            #execChkFillerWrap .exec-cli-inline-table select, #execChkFillerWrap .exec-cli-inline-table textarea {
                width:100%; border:1px solid var(--border); border-radius:4px; padding:0.3rem 0.4rem; font-size:0.78rem;
                background:#fff; font-family:inherit; resize:vertical;
            }
            #execChkFillerWrap .exec-cli-inline-table select:focus, #execChkFillerWrap .exec-cli-inline-table textarea:focus {
                outline:none; border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,0.15);
            }
            #execChkFillerWrap .exec-cli-inline-table textarea { min-height:36px; max-height:160px; line-height:1.3; }
            #execChkFillerWrap .exec-chk-grp { border:1px solid var(--border); border-radius:6px; margin-bottom:0.4rem; background:#fff; }
            #execChkFillerWrap .exec-chk-grp > summary { cursor:pointer; padding:0.4rem 0.7rem; font-weight:700; font-size:0.82rem; list-style:none; user-select:none; display:flex; align-items:center; gap:0.4rem; }
            #execChkFillerWrap .exec-chk-grp > summary::-webkit-details-marker { display:none; }
            #execChkFillerWrap .exec-chk-grp > summary::before { content:'▸'; font-size:0.7rem; transition:transform 0.15s; }
            #execChkFillerWrap .exec-chk-grp[open] > summary::before { transform:rotate(90deg); }
            #execChkFillerWrap .exec-chk-grp-sd > summary { background:var(--primary, #1a365d); color:#fff; border-radius:6px 6px 0 0; }
            #execChkFillerWrap .exec-chk-grp-th > summary { background:#e2e8f0; color:#1a365d; }
            #execChkFillerWrap .exec-chk-grp-st > summary { background:#f1f5f9; color:#334155; font-weight:600; }
            #execChkFillerWrap .exec-chk-grp-count { background:rgba(0,0,0,0.12); color:inherit; border-radius:10px; padding:0 0.45rem; font-size:0.7rem; font-weight:600; }
            #execChkFillerWrap .exec-chk-grp-sd > .exec-chk-grp-body { padding:0.4rem 0.4rem 0.4rem 0.8rem; }
            #execChkFillerWrap .exec-chk-grp-th > .exec-chk-grp-body { padding:0.35rem 0.35rem 0.35rem 0.7rem; }
            #execChkFillerWrap .exec-chk-grp-st > .exec-chk-grp-body { padding:0.3rem; }
            #execChkFillerWrap .exec-chk-grp.exec-chk-hidden { display:none; }
            #execChkFillerWrap .exec-chk-activite > summary::-webkit-details-marker { display:none; }
            #execChkFillerWrap .exec-chk-activite > summary { display:flex; align-items:center; gap:0.35rem; }
            #execChkFillerWrap .exec-chk-grp-toggle { background:none; border:none; cursor:pointer; font-size:0.9rem; color:inherit; padding:0 0.2rem; line-height:1; opacity:0.85; }
            #execChkFillerWrap .exec-chk-grp-toggle:hover { opacity:1; }
            #execChkFillerWrap .exec-chk-grp.exec-chk-grp-off > summary { opacity:0.5; }
            #execChkFillerWrap .exec-chk-grp.exec-chk-grp-off > summary .exec-chk-grp-label { text-decoration:line-through; }
            #execChkFillerWrap tr.exec-chk-row-off { opacity:0.4; }
            #execChkFillerWrap tr.exec-chk-row-off select, #execChkFillerWrap tr.exec-chk-row-off textarea,
            #execChkFillerWrap tr.exec-chk-row-off .exec-chk-gen-btn { pointer-events:none; }
        </style>
        <div class="exec-cli-slicer-overlay" onclick="execCloseChecklistFiller('${dossierId}')"></div>
        <aside class="exec-cli-slicer" role="dialog" aria-modal="true">
            <header class="exec-cli-slicer-header">
                <div>
                    <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Renseigner la checklist (brouillon)</div>
                    <div style="font-weight:700;font-size:1rem;">${cl.reference ? _esc2(cl.reference) + ' — ' : ''}${_esc2(cl.nom)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                    <span id="execChkFillerSaveState" style="font-size:0.75rem;color:var(--text-muted);"></span>
                    <button class="btn btn-sm btn-outline" onclick="execChkFillExportPdf('${dossierId}','${checklistId}')" title="Exporter en PDF">📄 PDF</button>
                    <button class="btn btn-sm btn-outline" onclick="execChkFillExportXlsx('${dossierId}','${checklistId}')" title="Exporter en Excel">📥 Excel</button>
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('execChkFillImportFile').click()" title="Importer depuis Excel">📤 Importer</button>
                    <input type="file" id="execChkFillImportFile" accept=".xlsx" style="display:none" onchange="execChkFillImportXlsx('${dossierId}','${checklistId}',event)">
                    <button class="btn btn-sm btn-ghost" onclick="execCloseChecklistFiller('${dossierId}')" title="Fermer">✕</button>
                </div>
            </header>
            <div class="exec-cli-slicer-body">
                ${activiteHtml}
                <div style="display:flex;align-items:flex-end;gap:0.7rem;margin-bottom:0.6rem;flex-wrap:wrap;">
                    <div id="execChkFillerSummary" style="display:flex;flex-wrap:wrap;gap:0.6rem;"></div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;flex:1 1 340px;min-width:240px;">
                        <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
                            <button class="btn btn-sm btn-primary" onclick="execChkFillExpandAll(true)">▼ Tout déplier</button>
                            <button class="btn btn-sm btn-primary" onclick="execChkFillExpandAll(false)">▲ Tout plier</button>
                        </div>
                        <div style="display:flex;gap:0.4rem;align-items:center;">
                            <input type="text" id="execChkFillSearch" placeholder="🔎 Rechercher…" oninput="execChkFillApplyFilter()"
                                style="padding:0.32rem 0.5rem;border:1px solid var(--border);border-radius:5px;font-size:0.78rem;flex:2 1 140px;min-width:110px;">
                            <select id="execChkFillStatutFilter" onchange="execChkFillApplyFilter()"
                                style="padding:0.32rem 0.5rem;border:1px solid var(--border);border-radius:5px;font-size:0.78rem;flex:1 1 110px;min-width:90px;">
                                <option value="">Tous statuts</option>
                                ${statuts.map(s => `<option value="${s.id}">${_esc2(s.alias || s.libelle)}</option>`).join('')}
                            </select>
                            <button class="btn btn-sm btn-ghost" title="Réinitialiser les filtres" style="flex:0 0 auto;"
                                onclick="document.getElementById('execChkFillSearch').value='';document.getElementById('execChkFillStatutFilter').value='';execChkFillApplyFilter();">↺</button>
                        </div>
                    </div>
                </div>
                <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 0.5rem;">Les réponses sont enregistrées en <strong>brouillon</strong> à mesure de la saisie et restent attachées au dossier.</p>
                <div id="execChkFillerGroups" style="overflow:auto;">${groupsHtml}</div>
            </div>
        </aside>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    // Câblage des autosaves (event delegation sur le conteneur des groupes)
    const groupsEl = document.getElementById('execChkFillerGroups');
    groupsEl?.addEventListener('change', ev => {
        const t = ev.target;
        if (!t.dataset.item) return;
        const itemId = t.dataset.item;
        const isStatut = t.classList.contains('exec-chk-fill-statut');
        const isObs = t.classList.contains('exec-chk-fill-obs');
        if (!isStatut && !isObs) return;
        _execChkFillAutosave(dossierId, checklistId, itemId, isStatut ? 'statut_id' : 'observations', t.value);
        if (isStatut) {
            _execChkFillerApplyRowColor(itemId, t.value);
            _execChkFillerUpdateSummary();
            execChkFillApplyFilter();
            // Affiche/masque le bouton « Générer une constatation » selon le statut
            const ctx = window._execChkFillerCtx;
            const isNonSat = ctx && (ctx.nonSatIds || []).includes(t.value);
            const btn = document.querySelector(`#execChkFillerGroups .exec-chk-gen-btn[data-item="${itemId}"]`);
            if (btn) btn.style.display = isNonSat ? '' : 'none';
        }
    });
    // Restaure l'état désactivé persistant des regroupements
    _execChkApplyDisabledState(respByItem);
    // Synthèse initiale + état des boutons « Générer une constatation »
    _execChkFillerUpdateSummary();
    _execChkFillSyncGenButtons(dossierId);
}

// Restaure, à l'ouverture, l'état désactivé des items / regroupements à partir des réponses.
function _execChkApplyDisabledState(respByItem) {
    if (!respByItem) return;
    // 1) Marque les lignes d'items dont la réponse porte disabled=1
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        const r = respByItem[tr.getAttribute('data-item-id')];
        if (r && (r.disabled === 1 || r.disabled === '1' || r.disabled === true)) {
            tr.classList.add('exec-chk-row-off');
        }
    });
    // 2) Un regroupement dont TOUTES les lignes sont désactivées est marqué « off » et replié
    document.querySelectorAll('#execChkFillerGroups details.exec-chk-grp').forEach(grp => {
        const rows = grp.querySelectorAll('tr[data-item-id]');
        if (!rows.length) return;
        const allOff = Array.from(rows).every(tr => tr.classList.contains('exec-chk-row-off'));
        if (allOff) {
            grp.classList.add('exec-chk-grp-off');
            grp.open = false;
            const btn = grp.querySelector(':scope > summary .exec-chk-grp-toggle');
            if (btn) { btn.textContent = '◯'; btn.title = 'Réactiver ce regroupement'; }
        }
    });
}

// Marque (ou annule) une checklist comme « Validée » au niveau du dossier.
async function execSetDossierChecklistValidee(dossierId, checklistId, validee) {
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    let ids = _parse(dossier.checklists_validees);
    if (validee) { if (!ids.includes(checklistId)) ids.push(checklistId); }
    else { ids = ids.filter(id => id !== checklistId); }
    if (validee && !confirm('Confirmer que cette checklist a été vérifiée et validée ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, {
            method: 'PUT', body: JSON.stringify({ checklists_validees: JSON.stringify(ids) })
        });
        if (EXEC_STATE.selectedDossier && EXEC_STATE.selectedDossier.id === dossierId) {
            EXEC_STATE.selectedDossier.checklists_validees = JSON.stringify(ids);
        }
        await execRefreshDynamic();
        // Re-rend l'onglet « Checklist et autres doc. » du dossier
        if (typeof execSwitchRedactionSubtab === 'function') {
            execSwitchRedactionSubtab(dossierId, 'checklists');
        } else {
            execOpenDossierSlider(dossierId);
        }
        _execToast(validee ? 'Checklist marquée comme validée.' : 'Validation annulée.', 'success');
    } catch (e) {
        _execToast('Erreur : ' + (e.message || e), 'error');
    }
}

// Résout le domaine et le secteur de rattachement d'un dossier.
// Secteur = secteur de rattachement du prestataire ; Domaine = domaine de rattachement du secteur.
function _execResolveDossierDomSec(dossier) {
    const prest = (window.PESSCO?.sharedData?.prestataires || EXEC_STATE.data.prestataires || [])
        .find(p => p.id === (dossier || {}).prestataire_id) || {};
    const secId = prest.secteur_id || (dossier || {}).secteur_id || '';
    const secObj = (EXEC_STATE.data.secteurs || []).find(s => s.id === secId) || {};
    const domObj = (EXEC_STATE.data.domaines || []).find(d => d.id === secObj.domaine_id) || {};
    return {
        secteurId: secId,
        secteurNom: secObj.nom || secObj.code || '',
        domaineId: secObj.domaine_id || '',
        domaineNom: domObj.nom || domObj.code || '',
        domaineCode: domObj.code || ''
    };
}

// Génère une constatation brouillon à partir d'un item « non satisfaisant » de la checklist.
async function execChkFillGenConstatation(dossierId, itemId) {
    const item = (EXEC_STATE.data.checklistItems || []).find(i => i.id === itemId);
    if (!item) { _execToast('Item introuvable', 'error'); return; }
    const dossier = (EXEC_STATE.data.dossiers || []).find(d => d.id === dossierId)
        || EXEC_STATE.selectedDossier || {};
    // Réf. réglementaires : résout les ids d'exigences en texte lisible
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    let refReg = String(item.ref_reglement || '').trim();
    if (refReg.startsWith('[')) {
        try {
            const arr = JSON.parse(refReg);
            if (Array.isArray(arr)) refReg = arr.map(id => {
                const e = exigencesAll.find(x => x.id === id);
                return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '';
            }).filter(Boolean).join('\n');
        } catch (e) {}
    }
    // Observation terrain saisie pour cet item (état courant du DOM)
    const obsEl = document.querySelector(`#execChkFillerGroups .exec-chk-fill-obs[data-item="${itemId}"]`);
    const observation = obsEl ? obsEl.value : '';
    if (!confirm('Générer une constatation (brouillon) pour cet item non satisfaisant ?')) return;
    try {
        const _ds = _execResolveDossierDomSec(dossier);
        const payload = {
            dossier_id: dossierId,
            domaine_id: _ds.domaineCode || dossier.domaine_id || dossier.domaine || 'GEN',
            prestataire_id: dossier.prestataire_id || '',
            source: 'audit',
            criticite: '',  // laissé vide — à renseigner manuellement dans la FNC
            cas_type: `Checklist — ${item.ref_item || 'item'}`,
            description: (item.description || '') + (observation ? '\n\nObservation terrain : ' + observation : ''),
            ref_reglementaires: refReg,
            recommandation: item.directives || ''
        };
        const res = await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(payload) });
        // Lie la constatation à l'item de checklist (permet de désactiver le bouton)
        if (res.id) {
            try {
                await api(`${EXEC_MODULE_API}/constatations/${res.id}`, {
                    method: 'PUT', body: JSON.stringify({ checklist_item_id: itemId, checklist_id: item.checklist_id })
                });
            } catch (e) { /* non bloquant */ }
        }
        await execRefreshDynamic();
        // Désactive le bouton de génération pour cet item
        _execChkFillSyncGenButtons(dossierId);
        // Marque qu'une constatation a été générée → le dossier sera rafraîchi à la fermeture du filler
        window._execChkFillerConstatGenerated = true;
        _execToast(`Constatation brouillon créée (${res.reference || ''}). Visible dans l'onglet Constatations du dossier.`, 'success');
    } catch (e) {
        _execToast('Création de la constatation échouée : ' + (e.message || e), 'error');
    }
}

// Synchronise l'état des boutons « Générer une constatation » : désactivés pour les
// items ayant déjà une constatation liée, réactivés sinon (constatation supprimée).
function _execChkFillSyncGenButtons(dossierId) {
    const constats = (EXEC_STATE.data.constatations || [])
        .filter(c => c.dossier_id === dossierId && c.checklist_item_id);
    const linkedItems = new Set(constats.map(c => c.checklist_item_id));
    document.querySelectorAll('#execChkFillerGroups .exec-chk-gen-btn').forEach(btn => {
        const itemId = btn.getAttribute('data-item');
        if (linkedItems.has(itemId)) {
            btn.disabled = true;
            btn.title = 'Constatation déjà générée pour cet item';
            btn.style.opacity = '0.45';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.disabled = false;
            btn.title = 'Générer une constatation';
            btn.style.opacity = '';
            btn.style.cursor = '';
        }
    });
}

// Active / désactive un regroupement (sous-domaine, thème ou sous-thème).
// Les items d'un regroupement désactivé sont exclus des décomptes et du taux.
function execChkToggleGroup(btn) {
    const grp = btn.closest('details.exec-chk-grp');
    if (!grp) return;
    const off = grp.classList.toggle('exec-chk-grp-off');
    btn.textContent = off ? '◯' : '◉';
    btn.title = off ? 'Réactiver ce regroupement' : 'Désactiver ce regroupement';
    // Applique l'état désactivé à toutes les lignes d'items du regroupement
    const itemIds = [];
    grp.querySelectorAll('tr[data-item-id]').forEach(tr => {
        tr.classList.toggle('exec-chk-row-off', off);
        itemIds.push(tr.getAttribute('data-item-id'));
    });
    // Repli automatique d'un regroupement désactivé
    if (off) grp.open = false;
    _execChkFillerUpdateSummary();
    execChkFillApplyFilter();
    // Persiste l'état (disabled) de chaque item du regroupement
    _execChkPersistGroupDisabled(itemIds, off);
}

// Persiste le drapeau « disabled » des réponses pour une liste d'items.
async function _execChkPersistGroupDisabled(itemIds, disabled) {
    const ctx = window._execChkFillerCtx;
    if (!ctx || !itemIds || !itemIds.length) return;
    const stateEl = document.getElementById('execChkFillerSaveState');
    if (stateEl) { stateEl.textContent = '… enregistrement'; stateEl.style.color = '#d97706'; }
    try {
        const all = await api('/api/exec-checklist-responses');
        const byItem = {};
        (all || []).filter(r => r.dossier_id === ctx.dossierId && r.checklist_id === ctx.checklistId)
            .forEach(r => { byItem[r.item_id] = r; });
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        for (const itemId of itemIds) {
            const ex = byItem[itemId];
            if (ex) {
                await api('/api/exec-checklist-responses/' + ex.id, {
                    method: 'PUT', body: JSON.stringify({ disabled: disabled ? 1 : 0, date_maj: now })
                });
            } else {
                await api('/api/exec-checklist-responses', {
                    method: 'POST', body: JSON.stringify({
                        dossier_id: ctx.dossierId, checklist_id: ctx.checklistId, item_id: itemId,
                        statut_resp: 'brouillon', disabled: disabled ? 1 : 0, date_maj: now
                    })
                });
            }
        }
        if (stateEl) { stateEl.textContent = '✓ enregistré'; stateEl.style.color = '#059669'; }
    } catch (e) {
        if (stateEl) { stateEl.textContent = '⚠ erreur'; stateEl.style.color = '#ef4444'; }
    }
}

// Plie / déplie tous les accordéons (Sous-domaine / Thème / Sous-thème).
function execChkFillExpandAll(open) {
    document.querySelectorAll('#execChkFillerGroups details.exec-chk-grp').forEach(d => { d.open = !!open; });
}

// Filtre les items par recherche texte + statut, puis masque les groupes vides.
function execChkFillApplyFilter() {
    const term = (document.getElementById('execChkFillSearch')?.value || '').toLowerCase().trim();
    const statutF = document.getElementById('execChkFillStatutFilter')?.value || '';
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        let show = true;
        if (term) {
            const ref = (tr.getAttribute('data-ref') || '').toLowerCase();
            if (!ref.includes(term)) show = false;
        }
        if (show && statutF) {
            const sel = tr.querySelector('.exec-chk-fill-statut');
            if (!sel || sel.value !== statutF) show = false;
        }
        tr.style.display = show ? '' : 'none';
    });
    // Masque les groupes (details) qui n'ont plus aucune ligne visible
    document.querySelectorAll('#execChkFillerGroups details.exec-chk-grp').forEach(d => {
        const visibleRows = d.querySelectorAll('tr[data-item-id]:not([style*="display: none"])');
        d.classList.toggle('exec-chk-hidden', visibleRows.length === 0);
    });
}

// Applique la couleur de fond d'une ligne selon le statut sélectionné.
function _execChkFillerApplyRowColor(itemId, statutId) {
    const ctx = window._execChkFillerCtx; if (!ctx) return;
    const row = document.querySelector(`#execChkFillerGroups tr[data-item-id="${itemId}"]`);
    if (!row) return;
    const st = ctx.statuts.find(s => s.id === statutId);
    row.style.background = (st && st.couleur) ? (st.couleur + '22') : '';
}

// Recalcule la synthèse : une carte par statut + une carte « Non Évalué » + taux de conformité.
function _execChkFillerUpdateSummary() {
    const ctx = window._execChkFillerCtx; if (!ctx) return;
    const box = document.getElementById('execChkFillerSummary'); if (!box) return;
    // Exclut les lignes appartenant à un regroupement désactivé (exec-chk-row-off)
    const selects = Array.from(document.querySelectorAll('#execChkFillerGroups .exec-chk-fill-statut'))
        .filter(sel => !sel.closest('tr.exec-chk-row-off'));
    const total = selects.length;
    const _norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    // Décompte par statut
    const countByStatut = {};
    ctx.statuts.forEach(s => { countByStatut[s.id] = 0; });
    let nonEvalue = 0;
    selects.forEach(sel => {
        const id = sel.value;
        if (!id) { nonEvalue++; return; }
        if (countByStatut[id] === undefined) countByStatut[id] = 0;
        countByStatut[id]++;
    });

    // Identifie les statuts par libellé : Satisfaisant, Non Évalué, Non Applicable
    let nbSatisfaisant = 0, nbNonEvalue = 0, nbNonApplicable = 0;
    ctx.statuts.forEach(s => {
        const lbl = _norm(s.libelle);
        const n = countByStatut[s.id] || 0;
        if (lbl.includes('non satisfaisant') || lbl.includes('non-satisfaisant')) {
            // non satisfaisant — ne compte ni au numérateur ni en exclusion
        } else if (lbl.includes('satisfaisant')) {
            nbSatisfaisant += n;
        }
        if (lbl.includes('non evalue') || lbl.includes('non evaluee')) nbNonEvalue += n;
        if (lbl.includes('non applicable') || lbl.includes('non-applicable')) nbNonApplicable += n;
    });

    // Taux de conformité = nbr Satisfaisant / (nbr items activés - Non Évalué - Non Applicable)
    const denom = total - nbNonEvalue - nbNonApplicable;
    const taux = denom > 0 ? (nbSatisfaisant / denom) * 100 : 0;
    const tauxStr = taux.toFixed(2);
    const tauxColor = taux >= 80 ? '#059669' : (taux >= 50 ? '#d97706' : '#ef4444');

    const card = (label, value, color, accent) => `<div style="background:var(--bg-card);border:1px solid var(--border);border-left:4px solid ${accent || color};border-radius:8px;padding:0.4rem 0.7rem;min-width:120px;">
        <div style="font-size:0.66rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.03em;">${label}</div>
        <div style="font-size:1.1rem;font-weight:800;color:${color};">${value}</div>
    </div>`;

    // Une carte par statut configuré + carte « Non Évalué » + carte Taux
    let html = '';
    ctx.statuts.forEach(s => {
        const c = s.couleur || '#475569';
        html += card(s.libelle, `${countByStatut[s.id] || 0} <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted);">/ ${total}</span>`, c, c);
    });
    html += card('Taux de conformité', tauxStr + ' %', tauxColor, tauxColor);
    box.innerHTML = html;
}

// ── Export / Import de la checklist renseignée ──
async function execChkFillExportXlsx(dossierId, checklistId) {
    const token = localStorage.getItem('pr_token');
    try {
        const res = await fetch(`/api/m/execution/checklist-fill/${dossierId}/${checklistId}/export-xlsx`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
        a.href = url;
        a.download = `checklist_renseignee_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 60)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { _execToast('Export Excel échoué : ' + (e.message || e), 'error'); }
}

async function execChkFillImportXlsx(dossierId, checklistId, ev) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('pr_token');
    const fd = new FormData();
    fd.append('file', file);
    try {
        const res = await fetch(`/api/m/execution/checklist-fill/${dossierId}/${checklistId}/import-xlsx`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
        _execToast(`Import OK : ${j.imported} réponse(s) mise(s) à jour.`, 'success');
        // Recharge le filler pour refléter les réponses importées
        execOpenChecklistFiller(dossierId, checklistId);
    } catch (e) {
        _execToast('Import échoué : ' + (e.message || e), 'error');
    } finally {
        if (ev?.target) ev.target.value = '';
    }
}

// Export PDF : fenêtre d'impression dédiée (l'utilisateur choisit « Enregistrer en PDF »).
function execChkFillExportPdf(dossierId, checklistId) {
    const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === checklistId);
    if (!cl) { _execToast('Checklist introuvable', 'error'); return; }
    const items = (EXEC_STATE.data.checklistItems || [])
        .filter(i => i.checklist_id === checklistId)
        .slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const statuts = (EXEC_STATE.data.checklistStatuts || []);
    const sousThemes = (EXEC_STATE.data.checklistSousThemes || []).filter(s => s.checklist_id === checklistId);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themeLbl = id => allThemes.find(t => t.id === id)?.libelle || '-';
    const sousThLbl = id => sousThemes.find(s => s.id === id)?.libelle || '-';
    const stLbl = id => statuts.find(s => s.id === id)?.libelle || 'Non Évalué';
    const stCol = id => statuts.find(s => s.id === id)?.couleur || '#9ca3af';
    const _e = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Lit les statuts/observations directement depuis le DOM du filler (état courant)
    const respByItem = {};
    document.querySelectorAll('#execChkFillerGroups tr[data-item-id]').forEach(tr => {
        const id = tr.getAttribute('data-item-id');
        respByItem[id] = {
            statut_id: tr.querySelector('.exec-chk-fill-statut')?.value || '',
            observations: tr.querySelector('.exec-chk-fill-obs')?.value || ''
        };
    });
    const today = new Date().toISOString().slice(0, 10);
    const w = window.open('', '_blank');
    if (!w) { _execToast('Veuillez autoriser les pop-ups pour l\'export PDF.', 'error'); return; }
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    const _regDisplay = raw => {
        const s = String(raw || '').trim();
        if (s.startsWith('[')) {
            try {
                const arr = JSON.parse(s);
                if (Array.isArray(arr)) return arr.map(id => {
                    const e = exigencesAll.find(x => x.id === id);
                    return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '';
                }).filter(Boolean).join('\n');
            } catch (e) {}
        }
        return s;
    };
    const rows = items.map(it => {
        const r = respByItem[it.id] || {};
        const c = stCol(r.statut_id);
        return `<tr>
            <td>${_e(it.ref_item || '-')}</td>
            <td style="font-size:7.5pt;">${_e(_regDisplay(it.ref_reglement))}</td>
            <td>${_e(themeLbl(it.theme_id))}${it.sous_theme_id ? ' › ' + _e(sousThLbl(it.sous_theme_id)) : ''}</td>
            <td>${_e(it.description || '')}</td>
            <td>${_e(it.directives || '')}</td>
            <td style="background:${c}22;font-weight:600;">${_e(stLbl(r.statut_id))}</td>
            <td>${_e(r.observations || '')}</td>
        </tr>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Checklist — ${_e(cl.nom)}</title>
        <style>
            body { font-family:Arial,sans-serif; margin:1cm; color:#1f2937; }
            h1 { font-size:14pt; color:#1a365d; margin:0 0 0.2cm; }
            .meta { font-size:9pt; color:#6b7280; margin-bottom:0.4cm; }
            table { width:100%; border-collapse:collapse; font-size:8.5pt; }
            th { background:#1a365d; color:#fff; padding:5px 6px; text-align:left; border:1px solid #999; }
            td { padding:4px 6px; border:1px solid #ccc; vertical-align:top; white-space:pre-wrap; }
            @page { size:A4 landscape; margin:1cm; }
        </style></head><body>
        <h1>${cl.reference ? _e(cl.reference) + ' — ' : ''}${_e(cl.nom)}</h1>
        <div class="meta">Checklist renseignée (brouillon) — ${items.length} item(s) — Édité le ${today}</div>
        <table>
            <thead><tr><th>Réf. Item</th><th>Réf. Règlement</th><th>Thème / Sous-thème</th><th>Description</th><th>Directives</th><th>Statut</th><th>Observations</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7">Aucun item.</td></tr>'}</tbody>
        </table>
        <script>window.onload=function(){setTimeout(function(){window.print();},200);};</script>
    </body></html>`);
    w.document.close();
}

function execCloseChecklistFiller(dossierId) {
    document.getElementById('execChkFillerWrap')?.remove();
    // Restaure l'état antérieur de la barre de menu (déployé / replié)
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        const prev = !!window._execChkFillerPrevCollapsed;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = prev;
        if (wrapper) wrapper.classList.toggle('sidebar-collapsed', prev);
        if (sidebar) sidebar.classList.toggle('collapsed', prev);
    } catch (e) {}
    // Si des constatations ont été générées depuis le filler, ré-affiche le dossier
    // pour que la section Constatations soit immédiatement à jour.
    if (dossierId && window._execChkFillerConstatGenerated) {
        window._execChkFillerConstatGenerated = false;
        execRefreshDynamic().then(() => execOpenDossierSlider(dossierId));
    }
}

// Autosave d'une réponse (création upsert) — toujours en brouillon à ce stade.
async function _execChkFillAutosave(dossierId, checklistId, itemId, field, value) {
    const stateEl = document.getElementById('execChkFillerSaveState');
    const rowEl = document.querySelector(`.exec-chk-row-state[data-item="${itemId}"]`);
    if (stateEl) { stateEl.textContent = '… enregistrement'; stateEl.style.color = '#d97706'; }
    if (rowEl) { rowEl.textContent = '…'; rowEl.style.color = '#d97706'; }
    try {
        // Cherche une réponse existante pour ce (dossier, checklist, item)
        const all = await api('/api/exec-checklist-responses');
        const existing = (all || []).find(r => r.dossier_id === dossierId && r.checklist_id === checklistId && r.item_id === itemId);
        const payload = {
            dossier_id: dossierId,
            checklist_id: checklistId,
            item_id: itemId,
            statut_resp: 'brouillon',
            date_maj: new Date().toISOString().slice(0, 19).replace('T', ' '),
            [field]: value
        };
        if (existing) {
            await api('/api/exec-checklist-responses/' + existing.id, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await api('/api/exec-checklist-responses', { method: 'POST', body: JSON.stringify(payload) });
        }
        if (stateEl) { stateEl.textContent = '✓ enregistré'; stateEl.style.color = '#059669'; }
        if (rowEl) { rowEl.textContent = '✓'; rowEl.style.color = '#059669'; }
    } catch (e) {
        if (stateEl) { stateEl.textContent = '⚠ erreur'; stateEl.style.color = '#ef4444'; }
        if (rowEl) { rowEl.textContent = '⚠'; rowEl.style.color = '#ef4444'; }
    }
}

async function execValidateRapport(rapportId) {
    if (!confirm('Valider ce rapport ? Un numéro de rapport final sera généré.')) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/validate`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Rapport validé', 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Validate rapport error:', e);
        _execToast('Erreur lors de la validation', 'error');
    }
}

async function execAmendRapport(rapportId) {
    const observations = prompt('Observations pour l\'amendement (points à corriger) :');
    if (observations === null) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/amend`, {
            method: 'PUT', body: JSON.stringify({ observations })
        });
        await execRefreshDynamic();
        _execToast('Rapport renvoyé en brouillon pour amendement', 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) { EXEC_STATE.dossierStep = 'redaction'; execOpenDossierSlider(d.id); }
    } catch (e) {
        console.error('Amend rapport error:', e);
        _execToast('Erreur lors de l\'amendement', 'error');
    }
}

async function execSendRapportValidated(rapportId) {
    if (!confirm('Envoyer ce rapport à l\'organisme ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Rapport envoyé', 'success');
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Send rapport error:', e);
        _execToast('Erreur lors de l\'envoi', 'error');
    }
}

async function execGenerateNotificationPdf(dossierId) {
    const dossier = EXEC_STATE.selectedDossier;
    if (!dossier || !dossier.notification_id) {
        _execToast('Aucune notification liée à ce dossier', 'error');
        return;
    }
    try {
        const res = await api(`${EXEC_MODULE_API}/notifications/${dossier.notification_id}/pdf`);
        if (res && res.path) {
            const a = document.createElement('a');
            a.href = res.path;
            a.download = `notification_${dossier.notification_ref || dossier.notification_id}.pdf`;
            a.click();
        } else {
            _execToast('PDF non disponible', 'info');
        }
    } catch (e) {
        // Fallback: open the notification preview for printing
        _execToast('Utilisez Ctrl+P pour imprimer depuis l\'aperçu', 'info');
        if (dossier.notification_id) {
            execPreviewNotification(dossier.notification_id);
        }
    }
}

async function execReturnDossier(dossierId) {
    if (!confirm('Confirmer le renvoi du dossier pour correction ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/return`, {
            method: 'PUT',
            body: JSON.stringify({ observations: '' })
        });
        await execRefreshDynamic();
        _execToast('Dossier renvoyé pour correction', 'success');
        execOpenDossierSlider(dossierId);
    } catch (e) {
        console.error('Return dossier error:', e);
        _execToast('Erreur lors du renvoi', 'error');
    }
}

function _collectDossierAnnexes() {
    const annexes = [];
    document.querySelectorAll('#dossier_annexes_list > .dossier-annexe-item').forEach(item => {
        const intitule = item.querySelector('.annexe-intitule')?.value || '';
        const contenu = item.querySelector('.annexe-contenu')?.value || '';
        const files = [];
        item.querySelectorAll('.annexe-files span[data-path]').forEach(sp => {
            files.push({ filename: sp.dataset.filename || '', path: sp.dataset.path || '' });
        });
        annexes.push({ intitule, contenu, files });
    });
    return annexes;
}

async function execSaveDossier(dossierId, silent) {
    const data = {};

    // Introduction tab fields (IDs match the form)
    const descEl = document.getElementById('dossier_description_activite');
    const objEl = document.getElementById('dossier_objet_activite');
    const datesEl = document.getElementById('dossier_dates_activite');
    const equipeEl = document.getElementById('dossier_equipe_inspection');
    const aspectsEl = document.getElementById('dossier_aspects_couverts');
    const refEl = document.getElementById('dossier_referentiel');
    if (descEl) data.description_activite = descEl.value;
    if (objEl) data.objet_activite = objEl.value;
    if (datesEl) data.dates_activite = datesEl.value;
    if (equipeEl) data.equipe_inspection = equipeEl.value;
    if (aspectsEl) data.aspects_couverts = aspectsEl.value;
    if (refEl) data.referentiel = refEl.value;

    // Synthese tab fields
    const pfEl = document.getElementById('dossier_points_forts');
    const pfaEl = document.getElementById('dossier_points_faibles');
    const oppEl = document.getElementById('dossier_opportunites');
    const rgEl = document.getElementById('dossier_resume_global');
    if (pfEl) data.synthese_points_forts = pfEl.value;
    if (pfaEl) data.synthese_points_faibles = pfaEl.value;
    if (oppEl) data.opportunites_amelioration = oppEl.value;
    if (rgEl) data.resume_global_constatations = rgEl.value;

    // Conclusion
    const concEl = document.getElementById('dossier_conclusion');
    if (concEl) data.conclusion = concEl.value;

    // Checklists
    const checklistsEl = document.getElementById('dossier_checklists_list');
    if (checklistsEl) {
        const checklists = [];
        checklistsEl.querySelectorAll('div[data-path]').forEach(div => {
            checklists.push({ filename: div.querySelector('span')?.textContent || '', path: div.dataset.path });
        });
        data.checklists = checklists;
    }

    // Annexes (structured)
    const annexesEl = document.getElementById('dossier_annexes_list');
    if (annexesEl) {
        data.annexes = _collectDossierAnnexes();
    }

    // Skip if no data to save
    if (Object.keys(data).length === 0) {
        if (!silent) _execToast('Aucun champ à enregistrer', 'info');
        return;
    }

    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'PUT', body: JSON.stringify(data) });
        // Update local state
        if (EXEC_STATE.selectedDossier) {
            Object.assign(EXEC_STATE.selectedDossier, data);
        }
        await execRefreshDynamic();
        if (!silent) {
            _execToast('Brouillon enregistré avec succès', 'success');
        }
    } catch (e) {
        console.error('Save dossier error:', e);
        if (!silent) _execToast('Erreur lors de la sauvegarde', 'error');
    }
}

async function execCloseDossier(dossierId) {
    if (!confirm('Cloturer ce dossier ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}/close`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast('Dossier clôturé avec succès', 'success');
        execCloseSlider();
        execRenderPage();
    } catch (e) {
        console.error('Close dossier error:', e);
        _execToast('Erreur lors de la clôture', 'error');
    }
}


// ══════════════════════════════════════
//  FNC CREATION FORM SLIDER
// ══════════════════════════════════════

// ── Helpers FNC form: secteur/exigences ─────────────────────────────────────
function execFncOnSecteurChange() {
    const secteurId = document.getElementById('fnc_secteur')?.value || '';
    execFncUpdateExigences(secteurId);
}

function execFncUpdateExigences(secteurId) {
    const all = EXEC_STATE.data.exigences || [];
    const filtered = secteurId
        ? all.filter(e => e.secteur_id === secteurId && (e.statut || 'actif') !== 'inactif')
        : all.filter(e => (e.statut || 'actif') !== 'inactif');
    const list = document.getElementById('fnc_exig_list');
    if (!list) return;
    list.innerHTML = filtered.map(e =>
        `<option value="${_esc(e.reference)}" title="${_esc(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');
}

function execFncAddRef(raw) {
    const ref = (raw || '').split(' — ')[0].trim();
    if (!ref) return;
    const container = document.getElementById('fnc_ref_tags');
    const input = document.getElementById('fnc_ref_input');
    if (!container || !input) return;
    const existing = Array.from(container.querySelectorAll('.fnc-ref-tag')).map(t => t.dataset.ref);
    if (existing.includes(ref)) return;
    const exig = (EXEC_STATE.data.exigences || []).find(e => e.reference === ref);
    const tag = document.createElement('span');
    tag.className = 'fnc-ref-tag';
    tag.dataset.ref = ref;
    if (exig?.libelle) tag.title = exig.libelle;
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;';
    tag.innerHTML = `${_esc(ref)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button>`;
    container.insertBefore(tag, input);
}

function execOpenFNCForm(dossierId, existingFnc) {
    const fnc = existingFnc || {};
    const domaines = EXEC_STATE.data.domaines || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const allExig = EXEC_STATE.data.exigences || [];

    // Get dossier context for pre-filling
    const dossier = EXEC_STATE.selectedDossier || {};
    const relNotif = (EXEC_STATE.data.notifications || []).find(n => n.id === dossier.notification_id) || {};
    let actDateFin = '', actDateDebut = relNotif.date_debut_effective || '';
    if (dossier.activite_id || relNotif.activite_id) {
        const aId = dossier.activite_id || relNotif.activite_id;
        for (const p of (EXEC_STATE.data.plansValides || [])) {
            const act = (p.activites || []).find(a => a.id === aId);
            if (act) { actDateFin = act.date_fin || ''; actDateDebut = actDateDebut || act.date_debut || ''; break; }
        }
    }

    // Resolve prestataire → secteur → domaine
    const prestataires = EXEC_STATE.data.prestataires || [];
    const prestId = dossier.prestataire_id || relNotif.prestataire_id || '';
    const prest = prestataires.find(p => p.id === prestId);
    const defaultSecteurId = fnc.secteur_id || prest?.secteur_id || '';
    const defSecteur = secteurs.find(s => s.id === defaultSecteurId);
    const defaultDomaineId = fnc.domaine_id || fnc.domaine || defSecteur?.domaine_id || '';

    // Initial exigences
    const initExig = defaultSecteurId
        ? allExig.filter(e => e.secteur_id === defaultSecteurId && (e.statut || 'actif') !== 'inactif')
        : allExig.filter(e => (e.statut || 'actif') !== 'inactif');
    const exigOptions = initExig.map(e =>
        `<option value="${_esc(e.reference)}" title="${_esc(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');

    const defaultEmisPar = fnc.emis_par || relNotif.equipe_chef || EXEC_STATE.user?.nom || '';
    const defaultAdresseA = fnc.adresse_a || relNotif.prestataire_interlocuteur || '';
    const defaultDateOuverture = fnc.date_ouverture || actDateFin || new Date().toISOString().slice(0, 10);
    const minDate = actDateDebut || '';
    const G = 'gap:0.6rem;', MB = 'margin-bottom:0.5rem;';

    const bodyHtml = `
    <div class="exec-form-sections" style="padding:0.25rem 0;">
        <input type="hidden" id="fnc_min_date" value="${minDate}">
        <!-- Row 1: Emis Par ; Adressé a ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('emis_par')}</label>
                <input type="text" class="form-input" id="fnc_emis_par" value="${_esc(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a')}</label>
                <input type="text" class="form-input" id="fnc_adresse_a" value="${_esc(defaultAdresseA)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_ouverture')}</label>
                <input type="date" class="form-input" id="fnc_date_ouverture" value="${defaultDateOuverture}"${minDate ? ` min="${minDate}"` : ''} onchange="execValidateDateOuverture()">
            </div>
        </div>

        <!-- Row 2: Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('source')}</label>
                <select class="form-select" id="fnc_source">
                    <option value="audit" ${(fnc.source||'audit')==='audit'?'selected':''}>${te('source_audit')}</option>
                    <option value="inspection" ${fnc.source==='inspection'?'selected':''}>${te('source_inspection')}</option>
                    <option value="autre" ${fnc.source==='autre'?'selected':''}>${te('source_autre')}</option>
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('domaine')}</label>
                <select class="form-select" id="fnc_domaine">
                    <option value="">${te('select_option')}</option>
                    ${domaines.map(d => `<option value="${d.code || d.id}" ${(defaultDomaineId===d.id||defaultDomaineId===d.code)?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>Secteur</label>
                <select class="form-select" id="fnc_secteur" onchange="execFncOnSecteurChange()">
                    <option value="">${te('select_option')}</option>
                    ${secteurs.map(s => `<option value="${s.id}" ${defaultSecteurId===s.id?'selected':''}>${_esc(s.code || s.nom)}</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Row 3: Réf. Réglementaires (tag-input) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires')}</label>
            <div id="fnc_ref_tags" style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);min-height:2.2rem;cursor:text;" onclick="document.getElementById('fnc_ref_input').focus()">
                ${(fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span class="fnc-ref-tag" data-ref="${_esc(r)}" title="${_esc(exig?.libelle||'')}" style="display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;">${_esc(r)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button></span>`;
                }).join('')}
                <input type="text" id="fnc_ref_input" list="fnc_exig_list" autocomplete="off"
                    placeholder="${(fnc.ref_reglementaires||'')?'':'Ajouter une référence…'}"
                    style="border:none;outline:none;background:transparent;flex:1;min-width:10rem;font-size:0.85rem;padding:0.1rem 0;"
                    onchange="execFncAddRef(this.value);this.value='';"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();execFncAddRef(this.value);this.value='';}">
            </div>
            <datalist id="fnc_exig_list">${exigOptions}</datalist>
        </div>

        <!-- Row 4: Description -->
        <div class="form-group" style="${MB}">
            <label>${te('description_constatation')}</label>
            <textarea class="form-input" id="fnc_description" rows="3">${_esc(fnc.description || '')}</textarea>
        </div>

        <!-- Row 5: Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('criticite')}</label>
                <select class="form-select" id="fnc_gravite" onchange="execApplyCriticiteDelai('fnc_gravite','fnc_delai','execCalcDateDue')">
                    ${_execCriticiteOptions(fnc.criticite || fnc.gravite)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('cas')}</label>
                <select class="form-select" id="fnc_cas">
                    ${_execTypeCasOptions(fnc.cas_type || fnc.cas, true)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('delai_solde')}</label>
                <input type="number" class="form-input" id="fnc_delai" min="1" value="${_esc(fnc.delai_solde || fnc.delai_correction || _execCriticiteDelai(fnc.criticite || fnc.gravite) || '30')}" onchange="execCalcDateDue()" oninput="execCalcDateDue()">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_due')}</label>
                <input type="date" class="form-input" id="fnc_date_due" value="${fnc.date_due_cloture || fnc.date_due || ''}" readonly style="background:var(--bg);">
            </div>
        </div>

        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label>${te('recommandation')}</label>
            <textarea class="form-input" id="fnc_recommandation" rows="2">${_esc(fnc.recommandation || '')}</textarea>
        </div>

        <!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves')}</label>
            <div id="fnc_preuves_list">
                ${(fnc.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_esc(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.4rem;padding:1rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('fnc_proof_input').click()">
                ${EXEC_ICONS.upload} ${te('upload_zone')}
                <input type="file" id="fnc_proof_input" style="display:none;" multiple onchange="execUploadFNCProof(this.files)">
            </div>
        </div>
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execOpenDossierSlider('${dossierId}','constatations')">${EXEC_ICONS.back} ${te('back')}</button>
        <button class="btn btn-primary" onclick="execSaveFNC('${dossierId}', '${fnc.id || ''}')">
            ${EXEC_ICONS.check} ${te('save')}
        </button>
    `;

    _execFadeSliderContent(`${EXEC_ICONS.constatations} ${te('creer_fnc')}`, bodyHtml, footerHtml, 'max');

    // Calculate initial date due
    setTimeout(() => execCalcDateDue(), 100);
}

async function execEditFNC(dossierId, fncId) {
    try {
        const fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`);
        if (fnc) execOpenFNCForm(dossierId, fnc);
    } catch (e) {
        console.error('Load FNC for edit error:', e);
    }
}

async function execViewFNC(dossierId, fncId) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); _execToast('Erreur chargement', 'error'); return; }
    if (!fnc) return;

    const domaines = EXEC_STATE.data.domaines || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const allExig = EXEC_STATE.data.exigences || [];
    const dom = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const secteur = secteurs.find(s => s.id === fnc.secteur_id);
    const refList = (fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean);
    const sourceLabels = { audit: 'Audit', inspection: 'Inspection', autre: 'Autre' };
    const G = 'gap:0.6rem;', MB = 'margin-bottom:0.75rem;';

    const roField = (label, val) => `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${label}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2rem;">${val || '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>`;

    const body = `
    <div style="padding:0.5rem 0.25rem;">
        <div style="${MB}">${_execStatusBadge(fnc.statut)}</div>
        <!-- Row 1 : Émis par ; Adressé à ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            ${roField(te('emis_par') || 'Émis par', fnc.emis_par)}
            ${roField(te('adresse_a') || 'Adressé à', fnc.adresse_a)}
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
        </div>
        <!-- Row 2 : Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            ${roField(te('source') || 'Source', sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine') || 'Domaine', dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        <!-- Réf. Réglementaires -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);min-height:2rem;">
                ${refList.length ? refList.map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span title="${_esc(exig?.libelle||'')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
                }).join('') : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('description_constatation') || 'Description'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:3rem;white-space:pre-wrap;">${fnc.description ? _esc(fnc.description) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Row 3 : Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('criticite') || 'Criticité', fnc.criticite || fnc.gravite)}
            ${roField(te('cas') || 'Cas', fnc.cas_type || fnc.cas)}
            ${roField(te('delai_solde') || 'Délai', fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due') || 'Date Due', fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : (fnc.date_due ? fnc.date_due.slice(0,10) : ''))}
        </div>
        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation') || 'Recommandation'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2.5rem;white-space:pre-wrap;">${fnc.recommandation ? _esc(fnc.recommandation) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Preuves -->
        ${(fnc.preuves_constatation && fnc.preuves_constatation.length) ? `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('preuves') || 'Preuves'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;">
                ${fnc.preuves_constatation.map(p => {
                    const fname = typeof p === 'object' ? (p.filename || p.name || '') : p;
                    const fpath = typeof p === 'object' ? (p.path || '') : '';
                    return fpath
                        ? `<div style="padding:0.2rem 0;">${EXEC_ICONS.file||'📎'} <a href="${_esc(_execDl(fpath))}" download="${_esc(fname)}" style="font-size:0.85rem;color:var(--primary);">${_esc(fname)}</a></div>`
                        : `<div style="padding:0.2rem 0;">${EXEC_ICONS.file||'📎'} <span style="font-size:0.85rem;">${_esc(fname)}</span></div>`;
                }).join('')}
            </div>
        </div>` : ''}
    </div>`;

    const footer = `<button class="btn btn-outline" onclick="execOpenDossierSlider('${dossierId}','constatations')">${EXEC_ICONS.back||''} ${te('back')||'Retour'}</button>`;
    _execFadeSliderContent(`${EXEC_ICONS.constatations||''} ${te('constatation')||'Constatation'} — ${_esc(fnc.reference||'')}`, body, footer, 'max');
}

function execCalcDateDue() {
    const delai = parseInt(document.getElementById('fnc_delai')?.value || '30');
    const dateOuv = document.getElementById('fnc_date_ouverture')?.value;
    const dueDateEl = document.getElementById('fnc_date_due');
    if (dateOuv && dueDateEl) {
        const d = new Date(dateOuv);
        d.setDate(d.getDate() + delai);
        dueDateEl.value = d.toISOString().slice(0, 10);
    }
}

function execValidateDateOuverture() {
    const dateInput = document.getElementById('fnc_date_ouverture');
    const minDateInput = document.getElementById('fnc_min_date');
    if (!dateInput || !minDateInput) return;
    const minDate = minDateInput.value;
    if (minDate && dateInput.value && dateInput.value < minDate) {
        alert(`La date d'ouverture ne peut pas être antérieure au début de l'activité (${minDate}).`);
        dateInput.value = minDate;
    }
    execCalcDateDue();
}

let _fncProofPendingName = '';


async function execUploadFNCProof(files) {
    if (!files || files.length === 0) return;
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const container = document.getElementById('fnc_preuves_list');
                if (container) {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;';
                    div.innerHTML = `${EXEC_ICONS.file} <span style="flex:1;">${_esc(data.filename)}</span>
                        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
                    div.dataset.path = data.path;
                    container.appendChild(div);
                }
            }
        } catch (e) {
            console.error('Upload proof error:', e);
        }
    }
}

async function execSaveFNC(dossierId, fncId) {
    const preuves = [];
    document.querySelectorAll('#fnc_preuves_list > div').forEach(div => {
        const path = div.dataset?.path;
        const name = div.querySelector('span')?.textContent || '';
        preuves.push(path ? { filename: name, path } : name);
    });

    const data = {
        dossier_id: dossierId,
        domaine_id: document.getElementById('fnc_domaine')?.value || '',
        emis_par: document.getElementById('fnc_emis_par')?.value || '',
        adresse_a: document.getElementById('fnc_adresse_a')?.value || '',
        date_ouverture: document.getElementById('fnc_date_ouverture')?.value || '',
        source: document.getElementById('fnc_source')?.value || 'audit',
        cas_type: document.getElementById('fnc_cas')?.value || '',
        description: document.getElementById('fnc_description')?.value || '',
        criticite: document.getElementById('fnc_gravite')?.value || 'mineure',
        ref_reglementaires: (() => {
            const tags = Array.from(document.querySelectorAll('#fnc_ref_tags .fnc-ref-tag')).map(t => t.dataset.ref);
            const inp = (document.getElementById('fnc_ref_input')?.value || '').split(' — ')[0].trim();
            if (inp && !tags.includes(inp)) tags.push(inp);
            return tags.join(', ');
        })(),
        delai_solde: document.getElementById('fnc_delai')?.value || '30',
        date_due_cloture: document.getElementById('fnc_date_due')?.value || '',
        recommandation: document.getElementById('fnc_recommandation')?.value || '',
        preuves_constatation: preuves
    };

    try {
        if (fncId) {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'PUT', body: JSON.stringify(data) });
            _execToast('Constatation modifiée avec succès', 'success');
        } else {
            await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(data) });
            _execToast('Constatation créée avec succès', 'success');
        }
        await execRefreshDynamic();
        EXEC_STATE.dossierTab = 'constatations';
        execOpenDossierSlider(dossierId, 'constatations');
    } catch (e) {
        console.error('Save FNC error:', e);
        _execToast('Erreur lors de la sauvegarde de la constatation', 'error');
    }
}

// ══════════════════════════════════════
//  DELETE FUNCTIONS (Admin only)
// ══════════════════════════════════════

async function execDeleteConstatation(fncId) {
    if (!confirm(te('confirm_delete_constatation'))) return;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        // Si un dossier est ouvert, ré-affiche son slider (onglet Constatations) ; sinon page courante.
        const openDossier = document.getElementById('execDossierSlider') || document.querySelector('.exec-dossier-slider');
        const dId = EXEC_STATE.selectedDossier?.id;
        if (openDossier && dId && typeof execSwitchRedactionSubtab === 'function') {
            execSwitchRedactionSubtab(dId, 'constatations');
        } else {
            execRenderPage();
        }
    } catch (e) {
        console.error('Delete constatation error:', e);
        alert('Erreur lors de la suppression.');
    }
}


async function execDeleteDossier(dossierId) {
    if (!confirm(te('confirm_delete_activite'))) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Delete dossier error:', e);
        alert('Erreur lors de la suppression.');
    }
}

async function execSendRapport(rapportId) {
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/send`, { method: 'PUT' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        console.error('Send rapport error:', e);
        alert('Erreur lors de l\'envoi.');
    }
}

// ══════════════════════════════════════
//  5. PRESTATAIRES
// ══════════════════════════════════════

function execRenderPrestataires() {
    const prestataires = EXEC_STATE.data.prestataires || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    const notifications = EXEC_STATE.data.notifications || [];
    const F = EXEC_STATE.filters;
    const subTab = EXEC_STATE.dossierPageTab || 'en_cours';

    let filtered = prestataires;
    if (F.domaine) filtered = filtered.filter(p => p.domaine_id === F.domaine);
    if (F.secteur) filtered = filtered.filter(p => p.secteur_id === F.secteur);
    if (F.prestataire) filtered = filtered.filter(p => p.id === F.prestataire);
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(p => (p.nom || '').toLowerCase().includes(s) || (p.code || '').toLowerCase().includes(s));
    }

    // Décompte par onglet : nombre de DOSSIERS (des prestataires filtrés).
    const filteredPrestIds = new Set(filtered.map(p => p.id));
    const scopedDoss = dossiers.filter(d => filteredPrestIds.has(d.prestataire_id));
    const enCoursCount = scopedDoss.filter(d => d.statut !== 'cloture' && d.statut !== 'archive').length;
    const cloturesCount = scopedDoss.filter(d => d.statut === 'cloture').length;
    const archivesCount = scopedDoss.filter(d => d.statut === 'archive').length;

    const subTabs = [
        { id: 'en_cours', label: `Dossiers en cours (${enCoursCount})` },
        { id: 'clotures', label: `Dossiers clôturés (${cloturesCount})` },
        { id: 'archives', label: `Dossiers Archivés (${archivesCount})` }
    ];

    let content = '';
    if (subTab === 'en_cours') {
        content = _renderDossiersEnCours(filtered, dossiers, notifications, domaines);
    } else if (subTab === 'clotures') {
        content = _renderDossiersClotures(filtered, dossiers, notifications, domaines);
    } else if (subTab === 'archives') {
        content = _renderDossiersArchives(filtered, dossiers, domaines);
    }

    return `
    <div class="page-content">
        <div class="page-header" style="margin-bottom:0.4rem;">
            <h2 style="margin:0;">${te('prestataires')}</h2>
        </div>

        ${_execRenderFilterBar('execRenderPage()', { showSecteur: true, showPrestataire: true, showStatut: false })}

        <div class="exec-workflow-tabs" style="margin-bottom:0.5rem;">
            ${subTabs.map(t => `<button class="exec-tab ${subTab === t.id ? 'active' : ''}" onclick="EXEC_STATE.dossierPageTab='${t.id}';execRenderPage()">
                ${t.label}
            </button>`).join('')}
        </div>

        <div id="dossier_page_content" style="animation: execFadeIn 0.3s ease;">
            ${content}
        </div>
    </div>`;
}

// Tri de la table "Dossiers en cours" (regroupée par domaine).
function execSortDossiersEnCours(col) {
    const s = EXEC_STATE.dossierEnCoursSort || (EXEC_STATE.dossierEnCoursSort = { col: 'date', dir: 'asc' });
    if (s.col === col) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
    else { s.col = col; s.dir = 'asc'; }
    execRenderPage();
}

function _renderDossiersEnCours(prestataires, dossiers, notifications, domaines) {
    const sort = EXEC_STATE.dossierEnCoursSort || (EXEC_STATE.dossierEnCoursSort = { col: 'date', dir: 'asc' });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    // Dossiers en cours des prestataires filtrés
    const enCours = dossiers.filter(d => d.statut !== 'cloture' && d.statut !== 'archive' && prestById[d.prestataire_id]);
    if (enCours.length === 0) return `<div class="card"><p style="color:var(--text-muted);">${te('no_data')}</p></div>`;
    // Regroupement par domaine (domaine de rattachement du prestataire)
    const groups = {};
    enCours.forEach(d => {
        const domId = (prestById[d.prestataire_id] || {}).domaine_id || '';
        (groups[domId] = groups[domId] || []).push(d);
    });
    const _domNom = id => (domaines.find(x => x.id === id) || {}).nom || 'Domaine non défini';
    const domIds = Object.keys(groups).sort((a, b) => _domNom(a).localeCompare(_domNom(b)));
    const _val = (d, col) => {
        const p = prestById[d.prestataire_id] || {};
        if (col === 'ref') return (d.reference || d.id || '').toLowerCase();
        if (col === 'prest') return (d.prestataire_nom || p.nom || '').toLowerCase();
        if (col === 'objet') return (d.notification_objet || d.objet_activite || '').toLowerCase();
        if (col === 'date') return d.date_debut_execution || d.date_creation || '';
        if (col === 'statut') return (d.statut || '').toLowerCase();
        return '';
    };
    const sortList = list => {
        const s = [...list].sort((a, b) => { const va = _val(a, sort.col), vb = _val(b, sort.col); return va < vb ? -1 : va > vb ? 1 : 0; });
        return sort.dir === 'desc' ? s.reverse() : s;
    };
    const arrow = col => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (col, label, extra) => `<th style="cursor:pointer;${extra || ''}" onclick="execSortDossiersEnCours('${col}')">${label}${arrow(col)}</th>`;

    return domIds.map(domId => {
        const rows = sortList(groups[domId]);
        return `
        <div class="card" style="margin-bottom:0.5rem;padding:0.6rem 0.75rem;overflow-x:auto;">
            <div style="margin-bottom:0.35rem;"><strong style="font-size:1rem;">${_esc(_domNom(domId))}</strong></div>
            <table class="exec-data-table exec-compact-table" style="margin-bottom:0;table-layout:fixed;">
                <thead><tr>
                    ${th('ref', te('reference'), 'width:120px;')}
                    ${th('prest', te('provider'), 'width:160px;')}
                    ${th('objet', te('objet'), 'width:300px;')}
                    ${th('date', te('date_debut'), 'width:110px;')}
                    ${th('statut', te('status'), 'width:120px;')}
                    <th style="width:150px;text-align:center;">${te('actions')}</th>
                </tr></thead>
                <tbody>
                    ${rows.map(d => `<tr>
                        <td><strong>${_esc(d.reference || d.id)}</strong></td>
                        <td>${_esc(d.prestataire_nom || (prestById[d.prestataire_id] || {}).nom || '')}</td>
                        <td>${_esc((d.notification_objet || d.objet_activite || '').substring(0, 50))}</td>
                        <td>${_formatDate(d.date_debut_execution || d.date_creation)}</td>
                        <td>${_execStatusBadge(d.statut)}</td>
                        <td style="text-align:center;white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${d.id}','realisation')" title="${te('ouvrir_dossier')}">${EXEC_ICONS.openFolder}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

// Tri des tables "Dossiers clôturés" / "Dossiers archivés" (regroupées par domaine).
function execSortDossiersClotures(col) {
    const s = EXEC_STATE.dossierCloturesSort || (EXEC_STATE.dossierCloturesSort = { col: 'date', dir: 'asc' });
    if (s.col === col) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
    else { s.col = col; s.dir = 'asc'; }
    execRenderPage();
}
function execSortDossiersArchives(col) {
    const s = EXEC_STATE.dossierArchivesSort || (EXEC_STATE.dossierArchivesSort = { col: 'date', dir: 'asc' });
    if (s.col === col) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; }
    else { s.col = col; s.dir = 'asc'; }
    execRenderPage();
}

function _renderDossiersClotures(prestataires, dossiers, notifications, domaines) {
    const sort = EXEC_STATE.dossierCloturesSort || (EXEC_STATE.dossierCloturesSort = { col: 'date', dir: 'asc' });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    const list = dossiers.filter(d => d.statut === 'cloture' && prestById[d.prestataire_id]);
    if (list.length === 0) return `<div class="card"><p style="color:var(--text-muted);">${te('no_data')}</p></div>`;
    const groups = {};
    list.forEach(d => {
        const domId = (prestById[d.prestataire_id] || {}).domaine_id || '';
        (groups[domId] = groups[domId] || []).push(d);
    });
    const _domNom = id => (domaines.find(x => x.id === id) || {}).nom || 'Domaine non défini';
    const domIds = Object.keys(groups).sort((a, b) => _domNom(a).localeCompare(_domNom(b)));
    const _val = (d, col) => {
        const p = prestById[d.prestataire_id] || {};
        const rn = notifications.find(n => n.id === d.notification_id) || {};
        if (col === 'ref') return (d.reference || d.id || '').toLowerCase();
        if (col === 'prest') return (d.prestataire_nom || p.nom || '').toLowerCase();
        if (col === 'notif') return (rn.reference || '').toLowerCase();
        if (col === 'objet') return (d.notification_objet || d.objet_activite || rn.objet_activite || '').toLowerCase();
        if (col === 'date') return d.date_fin_execution || '';
        if (col === 'statut') return (d.statut || '').toLowerCase();
        return '';
    };
    const sortList = l => {
        const s = [...l].sort((a, b) => { const va = _val(a, sort.col), vb = _val(b, sort.col); return va < vb ? -1 : va > vb ? 1 : 0; });
        return sort.dir === 'desc' ? s.reverse() : s;
    };
    const arrow = col => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (col, label, extra) => `<th style="cursor:pointer;${extra || ''}" onclick="execSortDossiersClotures('${col}')">${label}${arrow(col)}</th>`;

    return domIds.map(domId => {
        const rows = sortList(groups[domId]);
        return `
        <div class="card" style="margin-bottom:0.5rem;padding:0.6rem 0.75rem;overflow-x:auto;">
            <div style="margin-bottom:0.35rem;"><strong style="font-size:1rem;">${_esc(_domNom(domId))}</strong></div>
            <table class="exec-data-table exec-compact-table" style="margin-bottom:0;table-layout:fixed;">
                <thead><tr>
                    ${th('ref', te('reference'), 'width:120px;')}
                    ${th('prest', te('provider'), 'width:150px;')}
                    ${th('objet', te('objet'), 'width:300px;')}
                    ${th('date', 'Date clôture', 'width:105px;')}
                    ${th('statut', te('status'), 'width:110px;')}
                    <th style="width:275px;text-align:center;">${te('actions')}</th>
                </tr></thead>
                <tbody>
                    ${rows.map(d => {
                        const relNotif = notifications.find(n => n.id === d.notification_id) || {};
                        return `<tr>
                        <td><strong>${_esc(d.reference || d.id)}</strong></td>
                        <td>${_esc(d.prestataire_nom || (prestById[d.prestataire_id] || {}).nom || '')}</td>
                        <td>${_esc(d.notification_objet || d.objet_activite || relNotif.objet_activite || '').substring(0, 50)}</td>
                        <td>${_formatDate(d.date_fin_execution || '')}</td>
                        <td>${_execStatusBadge(d.statut)}</td>
                        <td style="display:flex;gap:0.25rem;justify-content:center;white-space:nowrap;">
                            <button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${d.id}','notification')" title="${te('ouvrir_dossier')}">${EXEC_ICONS.openFolder}</button>
                            ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:var(--exec-accent);border-color:var(--exec-accent);" onclick="execArchiveDossier('${d.id}')" title="Archiver">${EXEC_ICONS.folder}</button>` : ''}
                        </td>
                    </tr>`}).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

function _renderDossiersArchives(prestataires, dossiers, domaines) {
    const sort = EXEC_STATE.dossierArchivesSort || (EXEC_STATE.dossierArchivesSort = { col: 'date', dir: 'asc' });
    const prestById = {};
    prestataires.forEach(p => { prestById[p.id] = p; });
    const list = dossiers.filter(d => d.statut === 'archive' && prestById[d.prestataire_id]);
    if (list.length === 0) return `<div class="card"><p style="color:var(--text-muted);">${te('no_data')}</p></div>`;
    const groups = {};
    list.forEach(d => {
        const domId = (prestById[d.prestataire_id] || {}).domaine_id || '';
        (groups[domId] = groups[domId] || []).push(d);
    });
    const _domNom = id => (domaines.find(x => x.id === id) || {}).nom || 'Domaine non défini';
    const domIds = Object.keys(groups).sort((a, b) => _domNom(a).localeCompare(_domNom(b)));
    const _val = (d, col) => {
        const p = prestById[d.prestataire_id] || {};
        if (col === 'ref') return (d.reference || d.id || '').toLowerCase();
        if (col === 'prest') return (d.prestataire_nom || p.nom || '').toLowerCase();
        if (col === 'objet') return (d.notification_objet || d.objet_activite || '').toLowerCase();
        if (col === 'date') return d.date_fin_execution || '';
        return '';
    };
    const sortList = l => {
        const s = [...l].sort((a, b) => { const va = _val(a, sort.col), vb = _val(b, sort.col); return va < vb ? -1 : va > vb ? 1 : 0; });
        return sort.dir === 'desc' ? s.reverse() : s;
    };
    const arrow = col => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    const th = (col, label, extra) => `<th style="cursor:pointer;${extra || ''}" onclick="execSortDossiersArchives('${col}')">${label}${arrow(col)}</th>`;

    return domIds.map(domId => {
        const rows = sortList(groups[domId]);
        return `
        <div class="card" style="margin-bottom:0.5rem;padding:0.6rem 0.75rem;overflow-x:auto;">
            <div style="margin-bottom:0.35rem;"><strong style="font-size:1rem;">${_esc(_domNom(domId))}</strong></div>
            <table class="exec-data-table exec-compact-table" style="margin-bottom:0;table-layout:fixed;">
                <thead><tr>
                    ${th('ref', te('reference'), 'width:120px;')}
                    ${th('prest', te('provider'), 'width:160px;')}
                    ${th('objet', te('objet'), 'width:300px;')}
                    ${th('date', 'Date clôture', 'width:105px;')}
                    <th style="width:160px;text-align:center;">${te('actions')}</th>
                </tr></thead>
                <tbody>
                    ${rows.map(d => `<tr>
                        <td><strong>${_esc(d.reference || d.id)}</strong></td>
                        <td>${_esc(d.prestataire_nom || (prestById[d.prestataire_id] || {}).nom || '')}</td>
                        <td>${_esc((d.notification_objet || d.objet_activite || '').substring(0, 50))}</td>
                        <td>${_formatDate(d.date_fin_execution || '')}</td>
                        <td style="text-align:center;white-space:nowrap;"><button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${d.id}','notification')" title="${te('ouvrir_dossier')}">${EXEC_ICONS.openFolder}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

async function execArchiveDossier(dossierId) {
    if (!confirm('Archiver ce dossier ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/dossiers/${dossierId}`, { method: 'PUT', body: JSON.stringify({ statut: 'archive' }) });
        await execRefreshDynamic();
        _execToast('Dossier archivé avec succès', 'success');
        execRenderPage();
    } catch (e) {
        console.error('Archive dossier error:', e);
        _execToast('Erreur lors de l\'archivage', 'error');
    }
}


// ══════════════════════════════════════
//  6. CONSTATATIONS / PAC
// ══════════════════════════════════════

// Sub-nav for Constatations
function execRenderConstatations() {
    const isPrest = _execIsPrestataire();
    // Prestataires n'ont pas accès au sous-menu "Constatations" (liste)
    if (isPrest) EXEC_STATE.currentConstSub = 'suivi';
    const sub = EXEC_STATE.currentConstSub || 'list';
    const all = EXEC_STATE.data.constatations || [];
    const PRE_TRANSMIT  = new Set(['brouillon', 'direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const POST_TRANSMIT = new Set(['ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee']);
    const countList  = all.filter(c => PRE_TRANSMIT.has(c.statut  || '')).length;
    const countSuivi = all.filter(c => POST_TRANSMIT.has(c.statut || '')).length;
    const subNav = `
    <div class="exec-workflow-tabs" style="margin-bottom:1rem;">
        ${isPrest ? '' : `<button class="exec-tab ${sub==='list'?'active':''}" onclick="EXEC_STATE.currentConstSub='list';execRenderPage();">
            ${te('consta_sub_list')} <span class="exec-tab-badge">${countList}</span>
        </button>`}
        <button class="exec-tab ${sub==='suivi'?'active':''}" onclick="EXEC_STATE.currentConstSub='suivi';execRenderPage();">
            ${te('consta_sub_suivi')} <span class="exec-tab-badge">${countSuivi}</span>
        </button>
    </div>`;
    return sub === 'suivi' ? _execRenderConstaSuivi(subNav) : _execRenderConstaList(subNav);
}

// Shared: apply common filters to a constatation list
function _execApplyConstaFilters(list) {
    const F = EXEC_STATE.filters;
    let filtered = list;
    if (F.statut) filtered = filtered.filter(c => c.statut === F.statut);
    if (F.prestataire) filtered = filtered.filter(c => c.prestataire_id === F.prestataire || (EXEC_STATE.data.dossiers || []).find(d => d.id === c.dossier_id && d.prestataire_id === F.prestataire));
    if (F.domaine) filtered = filtered.filter(c => c.domaine_id === F.domaine || c.domaine === F.domaine);
    if (F.annee) filtered = filtered.filter(c => { const d = c.date_ouverture || c.date_creation || ''; return d.slice(0, 4) === String(F.annee); });
    if (F.trimestre) filtered = filtered.filter(c => { const d = c.date_ouverture || c.date_creation || ''; if (d.length < 7) return false; const m = parseInt(d.slice(5, 7)); return String(Math.ceil(m / 3)) === String(F.trimestre); });
    if (F.criticite) filtered = filtered.filter(c => (c.criticite || c.gravite || '').toLowerCase() === String(F.criticite).toLowerCase());
    if (F.search) { const s = F.search.toLowerCase(); filtered = filtered.filter(c => (c.reference || '').toLowerCase().includes(s) || (c.titre || '').toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s) || (c.prestataire_nom || '').toLowerCase().includes(s)); }
    return filtered;
}

// Shared: render constatation table rows
function _execRenderConstaRows(filtered) {
    const DIRECT_STATUTS = new Set(['direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const OPEN_STATUTS = new Set(['ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee']);
    if (!filtered.length) return `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>`;
    return filtered.map(c => {
        const domNom = (EXEC_STATE.data.domaines || []).find(d => d.id === c.domaine_id || d.code === c.domaine_id)?.nom || c.domaine_id || c.domaine || '';
        let dueDate = c.date_due_cloture;
        if (!dueDate || dueDate.length < 8 || isNaN(new Date(dueDate).getTime())) {
            const delai = parseInt(c.delai_solde || c.delai_correction || '0');
            const dateOuv = c.date_ouverture || c.date_creation;
            if (delai > 0 && dateOuv) { const dt = new Date(dateOuv); dt.setDate(dt.getDate() + delai); dueDate = dt.toISOString().slice(0, 10); }
            else { dueDate = ''; }
        }
        const isSoldee = (c.statut || '') === 'soldee';
        const dateSolde = c.date_solde ? c.date_solde.slice(0, 10) : '';
        let delaiInfo = '';
        if (isSoldee && dateSolde && dueDate) {
            const diffDays = Math.round((new Date(dateSolde) - new Date(dueDate)) / 86400000);
            delaiInfo = diffDays <= 0
                ? `<span style="color:#16a34a;font-weight:600;">${te('cloturee_dans_delais') || 'Clôturée dans les délais'}</span>`
                : `<span style="color:#dc2626;font-weight:600;">${te('hors_delais') || 'Hors délais'} (+${diffDays} ${te('jours') || 'jours'})</span>`;
        }
        const dateOuv = c.date_ouverture || (c.date_creation ? c.date_creation.slice(0, 10) : '');
        const rowId = `fnc_accordion_${c.id}`;
        return `<tr style="cursor:pointer;" onclick="document.getElementById('${rowId}').style.display = document.getElementById('${rowId}').style.display === 'none' ? 'table-row' : 'none';">
            <td><strong>${_esc(c.reference || '')}</strong> <span style="font-size:0.7rem;color:var(--text-muted);">${EXEC_ICONS.chevronDown}</span></td>
            <td>${_esc(c.prestataire_nom || '')}</td>
            <td>${_esc(domNom)}</td>
            <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
            <td>${dueDate ? _formatDate(dueDate) : '-'}</td>
            <td>${dueDate ? _daysUntilBadge(dueDate) : '-'}</td>
            <td>${_execStatusBadge(c.statut)}</td>
            <td class="exec-etats-actions" onclick="event.stopPropagation();">
                ${(() => {
                    const st = c.statut || '';
                    const meId = (EXEC_STATE.user || {}).id || '';
                    const isVal = c.valideur_pac_id === meId || _execCanValidate();
                    if (st === 'direct_brouillon' || st === 'direct_renvoye')
                        return `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteFormById('${c.id}')" title="${te('modifier_fnc')||'Modifier'}">${EXEC_ICONS.edit||''}</button>`;
                    if (st === 'direct_soumis')
                        return isVal
                            ? `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Valider">${EXEC_ICONS.check||''}</button>`
                            : `<button class="btn btn-sm btn-outline" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Consulter">${EXEC_ICONS.eye||''}</button>`;
                    if (st === 'direct_valide')
                        return `<button class="btn btn-sm btn-primary" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Transmettre">${EXEC_ICONS.send||''}</button>`;
                    if (st === 'direct_rejete')
                        return `<button class="btn btn-sm btn-outline" onclick="execOpenConstatationDirecteSlider('${c.id}')" title="Consulter">${EXEC_ICONS.eye||''}</button>`;
                    if (OPEN_STATUTS.has(st))
                        return `<button class="btn btn-sm btn-outline" onclick="execOpenPACSlider('${c.id}')" title="${te('suivi_pac')}">${EXEC_ICONS.clipboard}</button>`;
                    return `<button class="btn btn-sm btn-outline" onclick="execOpenDossierSlider('${c.dossier_id}','constatations')" title="${te('dossier')||'Dossier'}">${EXEC_ICONS.file}</button>`;
                })()}
                ${_execIsAdmin() ? `<button class="btn btn-sm btn-outline" style="color:#ef4444;border-color:#ef4444;padding:0.25rem 0.4rem;" onclick="execDeleteConstatation('${c.id}')" title="${te('delete')}">${EXEC_ICONS.x}</button>` : ''}
            </td>
        </tr>
        <tr id="${rowId}" style="display:none;">
            <td colspan="8" style="padding:0.6rem 1rem;background:var(--bg);border-top:none;">
                <div style="display:grid;gap:0.5rem;font-size:0.8rem;">
                    <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('description_constatation') || 'Description'}</span>
                    <p style="margin:0.2rem 0 0;">${_esc(c.description || c.titre || '-')}</p></div>
                    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;">
                        <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_ouverture') || "Date d'ouverture"}</span><div>${dateOuv ? _formatDate(dateOuv) : '-'}</div></div>
                        <div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_due_label') || 'Due Date'}</span><div style="color:#dc2626;font-weight:600;">${dueDate ? _formatDate(dueDate) : '-'}</div></div>
                        ${isSoldee ? `<div><span style="font-weight:600;color:var(--text-muted);font-size:0.72rem;text-transform:uppercase;">${te('date_solde')}</span><div style="color:#16a34a;font-weight:600;">${dateSolde ? _formatDate(dateSolde) : '-'}</div></div>` : ''}
                        ${delaiInfo ? `<div>${delaiInfo}</div>` : ''}
                    </div>
                    ${c.motif_rejet_pac && c.statut === 'direct_rejete' ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:#fef2f2;border-left:3px solid #dc2626;border-radius:3px;font-size:0.8rem;"><strong style="color:#dc2626;">Motif de rejet :</strong> ${_esc(c.motif_rejet_pac)}</div>` : ''}
                    ${c.motif_renvoi && c.statut === 'direct_renvoye' ? `<div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:#fff7ed;border-left:3px solid #f97316;border-radius:3px;font-size:0.8rem;"><strong style="color:#f97316;">Motif de renvoi :</strong> ${_esc(c.motif_renvoi)}</div>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Sub-menu 1 : Constatations — brouillons (avant transmission)
function _execRenderConstaList(subNav) {
    const allConstatations = EXEC_STATE.data.constatations || [];
    const isPrest = _execIsPrestataire();
    // Statuts pré-transmission : brouillon normal + workflow direct avant transmit
    const PRE_TRANSMIT = new Set(['brouillon', 'direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const base = allConstatations.filter(c => PRE_TRANSMIT.has(c.statut || ''));
    const filtered = _execApplyConstaFilters(base);
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    const canCreateDirect = !isPrest && (typeof _execCanContribute === 'function' ? _execCanContribute() : true);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('constatations')}</h2>
            ${canCreateDirect ? `<button class="btn btn-primary exec-btn-27" onclick="execOpenConstatationDirecteForm()">${EXEC_ICONS.plus || '+'} Nouvelle Constatation</button>` : ''}
        </div>
        ${subNav}
        ${_execRenderFilterBar('execRenderPage()', filterOpts)}
        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
              <thead><tr>
                <th style="width:160px;">${te('ref_consta')}</th><th style="width:180px;">${te('provider')}</th>
                <th style="width:190px;">${te('domaine')}</th><th style="width:110px;">${te('criticite')}</th>
                <th style="width:100px;">${te('date_due')}</th><th style="width:100px;">${te('echeance')}</th>
                <th style="width:130px;">${te('statut_pac')}</th>
                <th style="width:130px;text-align:center;">${te('actions')}</th>
              </tr></thead>
              <tbody>${_execRenderConstaRows(filtered)}</tbody>
            </table>
          </div>
        </div>
    </div>`;
}

// Sub-menu 2 : Suivi — constatations ouvertes (post-transmission) + PAC workflow
function _execRenderConstaSuivi(subNav) {
    const allConstatations = EXEC_STATE.data.constatations || [];
    const isPrest = _execIsPrestataire();
    // Statuts post-transmission : ouvert/ouverte (compat) + PAC + soldée
    const POST_TRANSMIT = new Set(['ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee']);
    const base = allConstatations.filter(c => POST_TRANSMIT.has(c.statut || ''));
    const filtered = _execApplyConstaFilters(base);
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    return `<div class="page-content">
        <div class="page-header">
            <h2 style="margin:0;">${te('constatations')}</h2>
            <p style="color:var(--text-muted);margin:0.2rem 0 0;">Tour de Controle - ${filtered.length} FNC</p>
        </div>
        ${subNav}
        ${_execRenderFilterBar('execRenderPage()', filterOpts)}
        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
              <thead><tr>
                <th style="width:160px;">${te('ref_consta')}</th><th style="width:180px;">${te('provider')}</th>
                <th style="width:190px;">${te('domaine')}</th><th style="width:110px;">${te('criticite')}</th>
                <th style="width:100px;">${te('date_due')}</th><th style="width:100px;">${te('echeance')}</th>
                <th style="width:130px;">${te('statut_pac')}</th>
                <th style="width:130px;text-align:center;">${te('actions')}</th>
              </tr></thead>
              <tbody>${_execRenderConstaRows(filtered)}</tbody>
            </table>
          </div>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  CONSTATATION DIRECTE — create + workflow
// ══════════════════════════════════════
// Workflow Directe: direct_brouillon → direct_soumis → direct_valide/direct_rejete
//                  → ouvert (transmitted) → PAC workflow (pac_soumis → pac_valide → soldee).
// Workflow Normal:  brouillon (created in dossier) → ouvert (when rapport transmitted)
//                  → PAC workflow.

// Open direct constatation form in edit mode (fetches fresh data by ID)
async function execOpenConstatationDirecteFormById(fncId) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); _execToast('Erreur chargement', 'error'); return; }
    execOpenConstatationDirecteForm(fnc);
}


// ── Helpers: Secteur/Exigences dynamic update ───────────────────────────────
function execCdOnPrestataireChange() {
    const prestId = document.getElementById('cd_prestataire')?.value || '';
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestId);
    const secteurId = prest?.secteur_id || '';
    const secteur = (EXEC_STATE.data.secteurs || []).find(s => s.id === secteurId);
    const domaineId = secteur?.domaine_id || '';
    const secteurSel = document.getElementById('cd_secteur');
    if (secteurSel) secteurSel.value = secteurId;
    const domaineSel = document.getElementById('cd_domaine');
    if (domaineSel) domaineSel.value = domaineId;
    execCdUpdateExigences(secteurId);
}

function execCdOnSecteurChange() {
    const secteurId = document.getElementById('cd_secteur')?.value || '';
    execCdUpdateExigences(secteurId);
}

function execCdUpdateExigences(secteurId) {
    const all = EXEC_STATE.data.exigences || [];
    const filtered = secteurId
        ? all.filter(e => e.secteur_id === secteurId && (e.statut || 'actif') !== 'inactif')
        : all.filter(e => (e.statut || 'actif') !== 'inactif');
    const list = document.getElementById('cd_exig_list');
    if (!list) return;
    list.innerHTML = filtered.map(e =>
        `<option value="${_esc(e.reference)}" title="${_esc(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');
}

function execCdAddRef(raw) {
    const ref = (raw || '').split(' — ')[0].trim();
    if (!ref) return;
    const container = document.getElementById('cd_ref_tags');
    const input = document.getElementById('cd_ref_input');
    if (!container || !input) return;
    // Deduplicate
    const existing = Array.from(container.querySelectorAll('.cd-ref-tag')).map(t => t.dataset.ref);
    if (existing.includes(ref)) return;
    const exig = (EXEC_STATE.data.exigences || []).find(e => e.reference === ref);
    const tag = document.createElement('span');
    tag.className = 'cd-ref-tag';
    tag.dataset.ref = ref;
    if (exig?.libelle) tag.title = exig.libelle;
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;';
    tag.innerHTML = `${_esc(ref)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button>`;
    container.insertBefore(tag, input);
}

function execOpenConstatationDirecteForm(existing) {
    const c = existing || {};
    const prestataires = EXEC_STATE.data.prestataires || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const secteurs = EXEC_STATE.data.secteurs || [];
    const today = new Date().toISOString().slice(0, 10);
    const defaultEmisPar = c.emis_par || (EXEC_STATE.user && EXEC_STATE.user.nom) || '';
    const defaultDateOuverture = c.date_ouverture ? (c.date_ouverture.slice ? c.date_ouverture.slice(0, 10) : c.date_ouverture) : today;

    // Resolve default secteur + domaine from prestataire
    const selectedPrest = prestataires.find(p => p.id === c.prestataire_id);
    const defaultSecteurId = c.secteur_id || selectedPrest?.secteur_id || '';
    const defSecteur = secteurs.find(s => s.id === defaultSecteurId);
    const defaultDomaineId = c.domaine_id || defSecteur?.domaine_id || '';

    // Source default: 'autre' for new, keep existing for edit
    const defaultSource = c.source && c.source !== 'source_direct' ? c.source : 'autre';

    // Initial exigences filtered by default secteur
    const allExig = EXEC_STATE.data.exigences || [];
    const initExig = defaultSecteurId
        ? allExig.filter(e => e.secteur_id === defaultSecteurId && (e.statut || 'actif') !== 'inactif')
        : allExig.filter(e => (e.statut || 'actif') !== 'inactif');
    const exigOptions = initExig.map(e =>
        `<option value="${_esc(e.reference)}" title="${_esc(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');

    const G = 'gap:0.6rem;'; // compact gap
    const MB = 'margin-bottom:0.5rem;'; // compact margin

    const body = `
    <div class="exec-form-sections" style="padding:0.25rem 0;">
        <!-- Row 1 : Prestataire ; Emis Par ; Adressé à ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('provider') || 'Prestataire'} *</label>
                <select class="form-select" id="cd_prestataire" onchange="execCdOnPrestataireChange()">
                    <option value="">${te('select_option') || 'Sélectionner'}</option>
                    ${prestataires.map(p => `<option value="${p.id}" ${c.prestataire_id===p.id?'selected':''}>${_esc(p.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('emis_par') || 'Émis par'}</label>
                <input type="text" class="form-input" id="cd_emis_par" value="${_esc(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a') || 'Adressé à'}</label>
                <input type="text" class="form-input" id="cd_adresse_a" value="${_esc(c.adresse_a || '')}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_ouverture') || "Date d'ouverture"}</label>
                <input type="date" class="form-input" id="cd_date_ouverture" value="${_esc(defaultDateOuverture)}" onchange="execCdCalcDateDue()">
            </div>
        </div>

        <!-- Row 2 : Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('source') || 'Source'}</label>
                <select class="form-select" id="cd_source">
                    <option value="audit" ${defaultSource === 'audit' ? 'selected' : ''}>${te('source_audit') || 'Audit'}</option>
                    <option value="inspection" ${defaultSource === 'inspection' ? 'selected' : ''}>${te('source_inspection') || 'Inspection'}</option>
                    <option value="autre" ${defaultSource === 'autre' ? 'selected' : ''}>${te('source_autre') || 'Autre'}</option>
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('domaine') || 'Domaine'} *</label>
                <select class="form-select" id="cd_domaine">
                    <option value="">${te('select_option') || 'Sélectionner'}</option>
                    ${domaines.map(d => `<option value="${d.id}" ${defaultDomaineId===d.id?'selected':''}>${d.code} - ${_esc(d.nom)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>Secteur</label>
                <select class="form-select" id="cd_secteur" onchange="execCdOnSecteurChange()">
                    <option value="">${te('select_option') || 'Sélectionner'}</option>
                    ${secteurs.map(s => `<option value="${s.id}" ${defaultSecteurId===s.id?'selected':''}>${_esc(s.code || s.nom)}</option>`).join('')}
                </select>
            </div>
        </div>

        <!-- Row 3 : Réf. Réglementaires (tag-input multi) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
            <div id="cd_ref_tags" style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);min-height:2.2rem;cursor:text;" onclick="document.getElementById('cd_ref_input').focus()">
                ${(c.ref_reglementaires || c.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span class="cd-ref-tag" data-ref="${_esc(r)}" title="${_esc(exig?.libelle || '')}" style="display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;">${_esc(r)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button></span>`;
                }).join('')}
                <input type="text" id="cd_ref_input" list="cd_exig_list" autocomplete="off"
                    placeholder="${(c.ref_reglementaires || '') ? '' : 'Ajouter une référence…'}"
                    style="border:none;outline:none;background:transparent;flex:1;min-width:10rem;font-size:0.85rem;padding:0.1rem 0;"
                    onchange="execCdAddRef(this.value);this.value='';"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();execCdAddRef(this.value);this.value='';}">
            </div>
            <datalist id="cd_exig_list">${exigOptions}</datalist>
        </div>

        <!-- Titre -->
        <div class="form-group" style="${MB}">
            <label>Titre</label>
            <input type="text" class="form-input" id="cd_titre" value="${_esc(c.titre || '')}">
        </div>

        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label>Description *</label>
            <textarea class="form-input" id="cd_description" rows="3">${_esc(c.description || '')}</textarea>
        </div>

        <!-- Row 4 : Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('criticite') || 'Criticité'} *</label>
                <select class="form-select" id="cd_criticite" onchange="execApplyCriticiteDelai('cd_criticite','cd_delai','execCdCalcDateDue')">
                    ${_execCriticiteOptions(c.criticite || c.gravite)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('cas') || 'Cas'}</label>
                <select class="form-select" id="cd_cas">
                    ${_execTypeCasOptions(c.cas_type || c.cas, true)}
                </select>
            </div>
            <div class="form-group" style="${MB}">
                <label>Délai</label>
                <input type="number" class="form-input" id="cd_delai" min="1" value="${_esc(c.delai_solde || c.delai_correction || _execCriticiteDelai(c.criticite || c.gravite) || '30')}" oninput="execCdCalcDateDue()" onchange="execCdCalcDateDue()">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_due') || 'Date Due'}</label>
                <input type="date" class="form-input" id="cd_date_due" value="${_esc(c.date_due_cloture || c.date_due || '')}" readonly style="background:var(--bg);">
            </div>
        </div>

        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label>${te('recommandation') || 'Recommandation'}</label>
            <textarea class="form-input" id="cd_reco" rows="2">${_esc(c.recommandation || '')}</textarea>
        </div>

        <!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves') || 'Preuves'}</label>
            <div id="cd_preuves_list">
                ${(c.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_esc(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.5rem;padding:1.25rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('cd_proof_input').click()">
                ${EXEC_ICONS.upload || '↑'} ${te('upload_zone') || 'Glisser ou cliquer pour téléverser'}
                <input type="file" id="cd_proof_input" style="display:none;" multiple onchange="execCdUploadProof(this.files)">
            </div>
        </div>

        ${c.motif_rejet_pac && (c.statut === 'direct_rejete') ? `<div style="margin-top:0.75rem;padding:0.6rem 0.8rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;">
            <strong style="color:#dc2626;">${te('motif_rejet') || 'Motif de rejet'}:</strong>
            <div style="margin-top:0.3rem;white-space:pre-wrap;">${_esc(c.motif_rejet_pac)}</div>
        </div>` : ''}
    </div>`;

    const footer = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>
        <button class="btn btn-primary" onclick="execSaveConstatationDirecte('${c.id || ''}', false)">Brouillon</button>
        <button class="btn btn-primary" onclick="execSaveConstatationDirecte('${c.id || ''}', true)">${te('soumettre_validation')}</button>
    `;
    execShowSlider(`Constatation Directe${c.reference ? ' — ' + _esc(c.reference) : ''}`, body, footer, 'max');
    setTimeout(() => execCdCalcDateDue(), 100);
}

// Compute date_due from date_ouverture + délai (same logic as execCalcDateDue for FNC).
function execCdCalcDateDue() {
    const delai = parseInt(document.getElementById('cd_delai')?.value || '30');
    const dateOuv = document.getElementById('cd_date_ouverture')?.value;
    const out = document.getElementById('cd_date_due');
    if (!out) return;
    if (!dateOuv || isNaN(delai) || delai < 1) { out.value = ''; return; }
    const dt = new Date(dateOuv);
    if (isNaN(dt.getTime())) { out.value = ''; return; }
    dt.setDate(dt.getDate() + delai);
    out.value = dt.toISOString().slice(0, 10);
}

// Uploads proofs for the Constatation Directe form; stores returned paths on
// the preview row so the save picks them up.
async function execCdUploadProof(files) {
    if (!files || !files.length) return;
    const list = document.getElementById('cd_preuves_list');
    for (const f of files) {
        try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await api(`${EXEC_MODULE_API}/upload`, { method: 'POST', body: fd, isFormData: true });
            const path = (res && (res.path || res.filepath || res.url)) || '';
            const filename = f.name;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;';
            row.dataset.path = path;
            row.innerHTML = `${EXEC_ICONS.file} <span style="flex:1;">${_esc(filename)}</span>
                <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            list.appendChild(row);
        } catch (e) { console.error('Upload proof error:', e); }
    }
}

async function execSaveConstatationDirecte(fncId, thenSubmit) {
    // Collect preuves from the list (items added via execCdUploadProof)
    const preuves = Array.from(document.querySelectorAll('#cd_preuves_list > div')).map(el => ({
        path: el.dataset.path || '',
        filename: (el.querySelector('span')?.textContent || '').trim()
    })).filter(p => p.filename);

    const payload = {
        prestataire_id: document.getElementById('cd_prestataire')?.value || '',
        emis_par: document.getElementById('cd_emis_par')?.value || '',
        adresse_a: document.getElementById('cd_adresse_a')?.value || '',
        date_ouverture: document.getElementById('cd_date_ouverture')?.value || '',
        source: document.getElementById('cd_source')?.value || 'direct',
        domaine_id: document.getElementById('cd_domaine')?.value || '',
        ref_reglementaires: (() => {
            const tags = Array.from(document.querySelectorAll('#cd_ref_tags .cd-ref-tag')).map(t => t.dataset.ref);
            const inp = (document.getElementById('cd_ref_input')?.value || '').split(' — ')[0].trim();
            if (inp && !tags.includes(inp)) tags.push(inp);
            return tags.join(', ');
        })(),
        description: document.getElementById('cd_description')?.value || '',
        criticite: document.getElementById('cd_criticite')?.value || 'mineure',
        cas_type: document.getElementById('cd_cas')?.value || '',
        titre: document.getElementById('cd_titre')?.value || '',
        delai_solde: document.getElementById('cd_delai')?.value || '30',
        date_due_cloture: document.getElementById('cd_date_due')?.value || '',
        recommandation: document.getElementById('cd_reco')?.value || '',
        preuves_constatation: preuves,
        direct: true
    };
    if (!payload.prestataire_id || !payload.domaine_id || !payload.description) {
        _execToast(te('fill_required') || 'Remplir les champs obligatoires', 'warning');
        return;
    }
    try {
        let savedId = fncId;
        if (fncId) {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            const res = await api(`${EXEC_MODULE_API}/constatations`, { method: 'POST', body: JSON.stringify(payload) });
            savedId = res.id;
        }
        await execRefreshDynamic();
        if (thenSubmit && savedId) {
            execOpenSelectValidateurForConstatation(savedId);
        } else {
            execCloseSlider();
            _execToast(te('saved') || 'Enregistré', 'success');
            execRenderPage();
        }
    } catch (e) {
        console.error('Save constatation directe error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

function execOpenSelectValidateurForConstatation(fncId) {
    // Resolve domaine (by ID and code) from constatation → prestataire → secteur
    const fnc = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId) || {};
    const prestId = fnc.prestataire_id || '';
    const prest = (EXEC_STATE.data.prestataires || []).find(p => p.id === prestId);
    const secteur = (EXEC_STATE.data.secteurs || []).find(s => s.id === prest?.secteur_id);
    const rawDomaineId = fnc.domaine_id || secteur?.domaine_id || '';
    // Normalize: resolve both id and code of the domaine for robust matching
    const domaine = (EXEC_STATE.data.domaines || []).find(d => d.id === rawDomaineId || d.code === rawDomaineId);
    const domaineId   = domaine?.id   || rawDomaineId;
    const domaineCode = domaine?.code || '';

    api('/api/users').then(allUsers => {
        const validators = (allUsers || []).filter(u => {
            if (u.actif === 0 || u.actif === false || u.actif === '0') return false;
            const r = (u.role_m3 || '').toString();
            if (r !== 'M3_Validateur' && r !== 'M3_Administrateur') return false;
            if (!domaineId && !domaineCode) return true; // pas de filtre domaine si inconnu
            let uDoms = [];
            try { uDoms = JSON.parse(u.domaines || '[]'); } catch(e) {}
            if (!uDoms.length) return true; // utilisateur sans restriction de domaine
            return uDoms.some(d => d === domaineId || d === domaineCode);
        });

        document.getElementById('exec_validateur_modal')?.remove();
        const el = document.createElement('div');
        el.id = 'exec_validateur_modal';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
        el.onclick = e => { if (e.target === el) el.remove(); };
        el.innerHTML = `
        <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:420px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;">${te('soumettre_validation')}</h3>
                <button onclick="document.getElementById('exec_validateur_modal').remove()" style="border:none;background:none;cursor:pointer;font-size:1.3rem;color:var(--text-muted);">&times;</button>
            </div>
            <div class="form-group" style="margin-bottom:1.25rem;">
                <label style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">Sélectionner un validateur</label>
                <select id="cd_validateur" class="form-select">
                    <option value="">— Sélectionner —</option>
                    ${validators.map(u => `<option value="${u.id}">${_esc((u.prenom||'')+' '+(u.nom||u.username||u.id))} (${_esc(u.role_m3||u.module_role_m3||'')})</option>`).join('')}
                </select>
                ${!validators.length ? `<p style="font-size:0.8rem;color:#ef4444;margin-top:0.4rem;">Aucun validateur disponible pour ce domaine.</p>` : ''}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
                <button class="btn btn-outline" onclick="document.getElementById('exec_validateur_modal').remove()">${te('cancel')||'Annuler'}</button>
                <button class="btn btn-primary" onclick="execSubmitConstatationDirecteForValidation('${fncId}')">${EXEC_ICONS.send} ${te('soumettre_validation')}</button>
            </div>
        </div>`;
        document.body.appendChild(el);
    }).catch(() => _execToast('Erreur chargement utilisateurs', 'error'));
}

async function execSubmitConstatationDirecteForValidation(fncId) {
    const validateurId = document.getElementById('cd_validateur')?.value || '';
    if (!validateurId) { _execToast('Sélectionnez un validateur', 'warning'); return; }
    try {
        const now = new Date().toISOString();
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ statut: 'direct_soumis', valideur_pac_id: validateurId, date_soumission_pac: now, motif_rejet_pac: '' })
        });
        await execRefreshDynamic();
        document.getElementById('exec_validateur_modal')?.remove();
        execCloseSlider();
        _execToast(te('submitted_for_validation') || 'Soumis pour validation', 'success');
        execRenderPage();
    } catch (e) {
        console.error('Submit constatation directe error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

async function execOpenConstatationDirecteSlider(fncId) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); return; }
    if (!fnc) return;
    const me = (EXEC_STATE.user || {}).id || '';
    const isCreator = fnc.created_by === me;
    const isValidateur = fnc.valideur_pac_id === me || _execIsAdmin();
    const st = fnc.statut || '';
    const prestataires = EXEC_STATE.data.prestataires || [];
    const prestataire = prestataires.find(p => p.id === fnc.prestataire_id);
    const domaines = EXEC_STATE.data.domaines || [];
    const dom = domaines.find(d => d.id === fnc.domaine_id);

    const secteurs = EXEC_STATE.data.secteurs || [];
    const secteur = secteurs.find(s => s.id === fnc.secteur_id);
    const allExig = EXEC_STATE.data.exigences || [];
    const refList = (fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean);
    const G = 'gap:0.6rem;'; const MB = 'margin-bottom:0.75rem;';
    const roField = (label, val) => `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${label}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2rem;white-space:pre-wrap;">${val || '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>`;

    const sourceLabels = { audit: 'Audit', inspection: 'Inspection', autre: 'Autre' };

    const body = `
    <div style="padding:0.5rem 0.25rem;">
        <!-- Statut -->
        <div style="${MB}">
            ${_execStatusBadge(st)}
        </div>
        <!-- Row 1 : Référence ; Prestataire ; Émis par ; Adressé à -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('reference') || 'Référence', fnc.reference)}
            ${roField(te('provider') || 'Prestataire', prestataire ? prestataire.nom : fnc.prestataire_id)}
            ${roField(te('emis_par') || 'Émis par', fnc.emis_par)}
            ${roField(te('adresse_a') || 'Adressé à', fnc.adresse_a)}
        </div>
        <!-- Row 2 : Date ouverture ; Source ; Domaine ; Secteur -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
            ${roField(te('source') || 'Source', sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine') || 'Domaine', dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        <!-- Réf. Réglementaires -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);min-height:2rem;">
                ${refList.length ? refList.map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span title="${_esc(exig?.libelle || '')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
                }).join('') : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        <!-- Titre -->
        ${roField('Titre', fnc.titre)}
        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">Description</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:3rem;white-space:pre-wrap;">${fnc.description ? _esc(fnc.description) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Row 3 : Criticité ; Cas ; Délai ; Date Due -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('criticite') || 'Criticité', fnc.criticite)}
            ${roField(te('cas') || 'Cas', fnc.cas_type || fnc.cas)}
            ${roField('Délai', fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due') || 'Date Due', fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : '')}
        </div>
        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation') || 'Recommandation'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2.5rem;white-space:pre-wrap;">${fnc.recommandation ? _esc(fnc.recommandation) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        <!-- Preuves -->
        ${(fnc.preuves_constatation && fnc.preuves_constatation.length) ? `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('preuves') || 'Preuves'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;">
                ${fnc.preuves_constatation.map(p => `<div style="display:flex;align-items:center;gap:0.4rem;padding:0.2rem 0;">${EXEC_ICONS.file || '📎'} <span style="font-size:0.85rem;">${_esc(p.filename || p)}</span></div>`).join('')}
            </div>
        </div>` : ''}
        <!-- Motif rejet / renvoi -->
        ${st === 'direct_rejete' && fnc.motif_rejet_pac ? `<div style="margin-top:0.5rem;padding:0.6rem 0.8rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;">
            <strong style="color:#dc2626;">Motif de rejet :</strong>
            <div style="margin-top:0.3rem;white-space:pre-wrap;font-size:0.85rem;">${_esc(fnc.motif_rejet_pac)}</div>
        </div>` : ''}
        ${st === 'direct_renvoye' && fnc.motif_renvoi ? `<div style="margin-top:0.5rem;padding:0.6rem 0.8rem;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;">
            <strong style="color:#f97316;">Motif de renvoi :</strong>
            <div style="margin-top:0.3rem;white-space:pre-wrap;font-size:0.85rem;">${_esc(fnc.motif_renvoi)}</div>
        </div>` : ''}
    </div>`;

    let footer = `<button class="btn btn-outline" onclick="execCloseSlider()">${te('close') || 'Fermer'}</button>`;
    if (isCreator && st === 'direct_brouillon') {
        footer += `<button class="btn btn-primary" onclick="execCloseSlider();execOpenConstatationDirecteForm(${JSON.stringify(fnc).replace(/"/g,'&quot;')})">${te('edit') || 'Modifier'}</button>`;
    }
    if (isCreator && st === 'direct_rejete') {
        footer += `<button class="btn btn-primary" disabled style="opacity:0.45;cursor:not-allowed;">Modifier</button>`;
    }
    if (isValidateur && st === 'direct_soumis') {
        footer += `<button class="btn btn-outline" style="color:#ef4444;border-color:#ef4444;" onclick="execRejeterConstatationModal('${fnc.id}')">Rejeter</button>`;
        footer += `<button class="btn btn-outline" style="color:#f97316;border-color:#f97316;" onclick="execRenvoyerConstatationModal('${fnc.id}')">Renvoyer</button>`;
        footer += `<button class="btn btn-primary" onclick="execValidateConstatationDirecte('${fnc.id}')">Valider</button>`;
    }
    if ((isCreator || isValidateur) && st === 'direct_valide') {
        footer += `<button class="btn btn-primary" onclick="execTransmitConstatationDirecte('${fnc.id}')">Transmettre au Prestataire</button>`;
    }

    execShowSlider(`Constatation Directe — ${_esc(fnc.reference || '')}`, body, footer, 'xxl');
}

async function execValidateConstatationDirecte(fncId) {
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ statut: 'direct_valide', date_validation_pac: new Date().toISOString(), motif_rejet_pac: '' })
        });
        await execRefreshDynamic();
        execCloseSlider();
        _execToast(te('validated') || 'Validé', 'success');
        execRenderPage();
    } catch (e) {
        console.error('Validate error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

function _execCommentModal(title, color, onConfirm) {
    document.getElementById('exec_comment_modal')?.remove();
    const el = document.createElement('div');
    el.id = 'exec_comment_modal';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
    el.onclick = e => { if (e.target === el) el.remove(); };
    el.innerHTML = `
    <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:420px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 1rem;font-size:1rem;font-weight:700;color:${color};">${title}</h3>
        <div class="form-group" style="margin-bottom:1rem;">
            <label style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">Commentaire *</label>
            <textarea id="exec_comment_text" class="form-input" rows="3" placeholder="Saisir le motif…" style="resize:vertical;"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
            <button class="btn btn-outline" onclick="document.getElementById('exec_comment_modal').remove()">Annuler</button>
            <button class="btn" style="background:${color};color:#fff;border:none;" id="exec_comment_confirm">Confirmer</button>
        </div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#exec_comment_confirm').onclick = () => {
        const txt = (document.getElementById('exec_comment_text')?.value || '').trim();
        if (!txt) { _execToast('Commentaire obligatoire', 'warning'); return; }
        el.remove();
        onConfirm(txt);
    };
}

function execRejeterConstatationModal(fncId) {
    _execCommentModal('Rejeter la constatation', '#dc2626', async (motif) => {
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ statut: 'direct_rejete', motif_rejet_pac: motif, date_rejet_pac: new Date().toISOString() })
            });
            await execRefreshDynamic();
            execCloseSlider();
            _execToast('Constatation rejetée', 'success');
            execRenderPage();
        } catch (e) { _execToast('Erreur: ' + (e?.message || ''), 'error'); }
    });
}

function execRenvoyerConstatationModal(fncId) {
    _execCommentModal('Renvoyer pour correction', '#f97316', async (motif) => {
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ statut: 'direct_renvoye', motif_renvoi: motif })
            });
            await execRefreshDynamic();
            execCloseSlider();
            _execToast('Constatation renvoyée pour correction', 'success');
            execRenderPage();
        } catch (e) { _execToast('Erreur: ' + (e?.message || ''), 'error'); }
    });
}

async function execTransmitConstatationDirecte(fncId) {
    // Transmit to postulant: statut becomes 'ouvert' so it enters the
    // normal PAC workflow visible to the prestataire.
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ statut: 'ouvert', date_ouverture: new Date().toISOString().slice(0, 10) })
        });
        await execRefreshDynamic();
        execCloseSlider();
        _execToast(te('transmitted_postulant') || 'Transmis au postulant', 'success');
        execRenderPage();
    } catch (e) {
        console.error('Transmit error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

// ══════════════════════════════════════
//  PAC FOLLOW-UP SLIDER
// ══════════════════════════════════════

async function execOpenPACSlider(fncId) {
    let fnc;
    try {
        fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`);
    } catch (e) {
        console.error('Load constatation error:', e);
        return;
    }
    if (!fnc) return;
    EXEC_STATE.selectedConstatation = fnc;

    // ── Role + status flags ──────────────────────────────────────────
    const isAAC = _execIsAAC();
    const isPostulant = !isAAC;
    const statut = fnc.statut || 'ouvert';
    const isSoldee = statut === 'soldee';
    const isPACSoumis = statut === 'pac_soumis';
    const isPACRejete = statut === 'pac_rejetee';
    const isOuverte = statut === 'ouvert' || statut === 'ouverte';

    // PAC fields are filled ONLY by the postulant (applicant). AAC users always see them read-only.
    const pacEditable = !isSoldee && isPostulant && (isOuverte || isPACRejete);
    // AAC evaluation/closure fields editable only by AAC and not soldée.
    const aacEditable = isAAC && !isSoldee;
    // Postulant only sees the AAC evaluation section once the FNC is soldée.
    const showAACSection = isAAC || isSoldee;

    const pacRO = pacEditable ? '' : 'readonly';
    const aacRO = aacEditable ? '' : 'readonly';
    const aacDis = aacEditable ? '' : 'disabled';
    const lockedBg = (editable) => editable ? '' : 'background:var(--bg);';

    // ── Resolve domaine + prestataire ────────────────────────────────
    const domaines = EXEC_STATE.data.domaines || [];
    const domaineObj = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const domaineName = domaineObj ? domaineObj.nom : (fnc.domaine || fnc.domaine_id || '-');

    const prestataires = EXEC_STATE.data.prestataires || [];
    let prestataireName = '-';
    if (fnc.prestataire_id) {
        const prestObj = prestataires.find(p => p.id === fnc.prestataire_id);
        prestataireName = prestObj ? prestObj.nom : (fnc.prestataire_nom || fnc.prestataire_id);
    } else if (fnc.prestataire_nom) {
        prestataireName = fnc.prestataire_nom;
    } else if (fnc.dossier_id) {
        const dossiers = EXEC_STATE.data.dossiers || [];
        const rel = dossiers.find(d => d.id === fnc.dossier_id);
        if (rel) prestataireName = rel.prestataire_nom || '-';
    }

    // ── Compute date due ─────────────────────────────────────────────
    let dateDue = fnc.date_due_cloture;
    if (!dateDue || dateDue.length < 8 || isNaN(new Date(dateDue).getTime())) {
        const dl = parseInt(fnc.delai_solde || fnc.delai_correction || '0');
        const dO = fnc.date_ouverture || fnc.date_creation;
        if (dl > 0 && dO) { const d = new Date(dO); d.setDate(d.getDate() + dl); dateDue = d.toISOString().slice(0,10); } else { dateDue = ''; }
    }

    // ── Parse PAC + evaluation data ──────────────────────────────────
    const actions = fnc.actions_correctives || [];
    const pac = actions[0] || {};

    let evalData = {};
    if (fnc.commentaire_evaluation) {
        if (typeof fnc.commentaire_evaluation === 'object') {
            evalData = fnc.commentaire_evaluation;
        } else {
            try { evalData = JSON.parse(fnc.commentaire_evaluation); } catch(e) {
                evalData = { legacy_comment: fnc.commentaire_evaluation };
            }
        }
    }
    const evaluationANAC = evalData.evaluation_anac || {};
    const acceptation = evaluationANAC.acceptation || {};
    const verification = evaluationANAC.verification || {};
    const cloture = evaluationANAC.cloture || {};
    const itemsComments = evalData.items_comments || {};
    const rejetInfo = evalData.rejet_info || null;
    const submitInfo = evalData.submit_info || null;

    // ── Render helpers ───────────────────────────────────────────────
    const renderProofList = (proofs, containerId, editable) => {
        if (!proofs || !Array.isArray(proofs) || proofs.length === 0) return '';
        return proofs.map(p => `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_esc(p.path || '')}">
            ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
            ${editable ? `<button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>` : ''}
        </div>`).join('');
    };

    const renderUploadZone = (prefix, listId, editable) => {
        if (!editable) return '';
        return `<div style="margin-top:0.35rem;padding:0.5rem;border:2px dashed var(--border);border-radius:6px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.75rem;" onclick="execUploadPACProof('${prefix}')">
            ${EXEC_ICONS.upload} ${te('upload_zone')}
            <input type="file" id="${prefix}_input" style="display:none;" multiple onchange="execHandlePACProofUpload(this.files, '${listId}')">
        </div>`;
    };

    const formatProofs = (proofs) => {
        if (!proofs || !Array.isArray(proofs) || proofs.length === 0) return '';
        return proofs.map(p => `<div style="display:flex;align-items:center;gap:0.35rem;margin-bottom:0.2rem;">${EXEC_ICONS.file} <span>${_esc(p.filename || p)}</span></div>`).join('');
    };

    const renderItemRow = (itemKey, label, response) => {
        const comments = itemsComments[itemKey] || [];
        const hasResponse = response && response !== '-';
        return `<tr data-item-key="${itemKey}">
            <td style="font-weight:600;width:22%;vertical-align:top;font-size:0.78rem;">${label}</td>
            <td style="width:33%;vertical-align:top;font-size:0.78rem;">
                <div class="pac-item-response">${hasResponse ? response : '<em style="color:var(--text-muted);">—</em>'}</div>
            </td>
            <td style="width:45%;vertical-align:top;">
                <div class="pac-item-comments" id="pac_item_comments_${itemKey}">
                    ${comments.length === 0 ? `<em style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>` :
                      comments.map(c => {
                          const cRole = c.role || '';
                          const bg = cRole === 'AAC' ? '#e0f2fe' : '#f0fdf4';
                          const border = cRole === 'AAC' ? '#0284c7' : '#16a34a';
                          return `<div class="pac-comment" data-auteur="${_esc(c.auteur || '')}" data-role="${_esc(cRole)}" data-date="${_esc(c.date || '')}" data-texte="${_esc(c.texte || '')}" style="padding:0.4rem 0.5rem;margin-bottom:0.3rem;background:${bg};border-left:3px solid ${border};border-radius:4px;font-size:0.75rem;">
                              <div style="display:flex;justify-content:space-between;margin-bottom:0.15rem;">
                                  <strong>${_esc(c.auteur || '')} <span style="font-weight:normal;color:var(--text-muted);">(${_esc(cRole)})</span></strong>
                                  <span style="color:var(--text-muted);font-size:0.7rem;">${_formatDate(c.date || '')}</span>
                              </div>
                              <div>${_esc(c.texte || '')}</div>
                          </div>`;
                      }).join('')
                    }
                </div>
                ${!isSoldee ? `<div style="display:flex;gap:0.35rem;margin-top:0.35rem;">
                    <textarea class="form-input" id="pac_item_input_${itemKey}" rows="1" placeholder="${te('ajouter_un_commentaire')}" style="flex:1;font-size:0.75rem;padding:0.3rem;"></textarea>
                    <button class="btn btn-sm btn-primary" onclick="execAddItemComment('${itemKey}')" style="padding:0.3rem 0.55rem;font-size:0.72rem;">${te('ajouter_commentaire')}</button>
                </div>` : ''}
            </td>
        </tr>`;
    };

    // ── Body HTML — 2-column layout ──────────────────────────────────
    const bodyHtml = `
    ${rejetInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('pac_renvoye_titre')} ${rejetInfo.date ? `(${_formatDate(rejetInfo.date)})` : ''} ${rejetInfo.auteur ? `— ${_esc(rejetInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(rejetInfo.motif || '')}</div>
    </div>` : ''}
    ${submitInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.check} ${te('pac_soumis_titre') || 'PAC soumis pour validation'} ${submitInfo.date ? `(${_formatDate(submitInfo.date)})` : ''} ${submitInfo.auteur ? `— ${_esc(submitInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#14532d;"><strong>${te('motif')} :</strong> ${_esc(submitInfo.motif || '')}</div>
    </div>` : ''}
    ${isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('constatation_soldee') || 'Constatation soldée'}${fnc.date_solde ? ` — ${te('date_solde')} : ${_formatDate(fnc.date_solde.slice(0,10))}` : ''}</div>
    </div>` : ''}
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- ROW 1 — Rappel de la Constatation (full-width)                -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div class="exec-form-section expanded">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">1</span>
            <span class="exec-form-section-title">${te('rappel_constatation')}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;gap:0.6rem;font-size:0.78rem;margin-bottom:0.6rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('domaine_label')}</div>
                    <div>${_esc(domaineName)}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('date_ouverture')}</div>
                    <div>${fnc.date_ouverture ? _formatDate(fnc.date_ouverture) : (fnc.date_creation ? _formatDate(fnc.date_creation.slice(0,10)) : '-')}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('delai_label')}</div>
                    <div><strong>${_esc(fnc.delai_solde || '-')} ${te('jours')}</strong></div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('criticite_label')}</div>
                    <div>${_execGraviteBadge(fnc.criticite || fnc.gravite)}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('date_due_label')}</div>
                    <div style="color:#dc2626;font-weight:600;">${dateDue ? _formatDate(dateDue) : '-'}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:0.85rem;margin-top:0.4rem;font-size:0.8rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;font-weight:600;">${te('description_constatation')}</div>
                    <p style="margin:0.2rem 0 0 0;color:var(--text);">${_esc(fnc.description || fnc.titre || '')}</p>
                </div>
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;font-weight:600;">${te('ref_reglementaires_label')}</div>
                    <div>${_esc(fnc.ref_reglementaires || fnc.exigence_ref || '-')}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- ROW 2 — PAC (left)  +  Détails du suivi (right)              -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div style="display:grid;grid-template-columns:1.05fr 1fr;gap:0.85rem;align-items:stretch;margin-top:0.6rem;">

        <div style="display:flex;flex-direction:column;">
            <!-- Section 2 : Plan d'Actions Correctives -->
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <span class="exec-form-section-letter">2</span>
                    <span class="exec-form-section-title">${te('plan_actions_correctives')}${isPACSoumis || isPACRejete || isSoldee ? ` <span style="font-weight:normal;color:var(--text-muted);font-size:0.78rem;">(Soumis par ${_esc(prestataireName)})</span>` : ''}</span>
                    <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;">
                    <div class="form-group">
                        <label style="font-size:0.8rem;font-weight:600;">${te('cause_root')}</label>
                        <textarea class="form-input" id="pac_cause_primaire" rows="2" ${pacRO} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.cause_primaire || '')}</textarea>
                    </div>
                    <div class="form-group" style="margin-top:0.55rem;">
                        <label style="font-size:0.8rem;font-weight:600;">${te('action_curative_correction')}</label>
                        <textarea class="form-input" id="pac_action_curative" rows="2" ${pacRO} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.action_curative || '')}</textarea>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.35rem;">
                        <div class="form-group">
                            <label style="font-size:0.74rem;color:var(--text-muted);">${te('date_prevue')}</label>
                            <input type="date" class="form-input" id="pac_curative_date_prevue" value="${_esc(pac.curative_date_prevue || '')}" ${pacRO} style="font-size:0.8rem;${lockedBg(pacEditable)}">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                            <div id="pac_curative_preuves_list">${renderProofList(pac.curative_preuves, 'pac_curative_preuves_list', pacEditable)}</div>
                            ${renderUploadZone('pac_curative_preuves', 'pac_curative_preuves_list', pacEditable)}
                        </div>
                    </div>
                    <div class="form-group" style="margin-top:0.55rem;">
                        <label style="font-size:0.8rem;font-weight:600;">${te('action_corrective_prevention')}</label>
                        <textarea class="form-input" id="pac_actions_correctives" rows="2" ${pacRO} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.actions_correctives || '')}</textarea>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.35rem;">
                        <div class="form-group">
                            <label style="font-size:0.74rem;color:var(--text-muted);">${te('date_prevue')}</label>
                            <input type="date" class="form-input" id="pac_corrective_date_prevue" value="${_esc(pac.corrective_date_prevue || '')}" ${pacRO} style="font-size:0.8rem;${lockedBg(pacEditable)}">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                            <div id="pac_corrective_preuves_list">${renderProofList(pac.corrective_preuves, 'pac_corrective_preuves_list', pacEditable)}</div>
                            ${renderUploadZone('pac_corrective_preuves', 'pac_corrective_preuves_list', pacEditable)}
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- RIGHT — Détails du suivi                                     -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div style="display:flex;flex-direction:column;">
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')" style="background:#fef3c7;">
                    <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                    <span class="exec-form-section-title">${te('details_suivi')}</span>
                    <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                    <p style="font-size:0.74rem;color:var(--text-muted);margin:0 0 0.5rem 0;">${te('details_suivi_intro')}</p>
                    <div style="flex:1;overflow-x:auto;max-height:65vh;overflow-y:auto;border:1px solid var(--border);border-radius:6px;">
                    <table class="exec-data-table" style="font-size:0.78rem;margin:0;">
                        <thead style="position:sticky;top:0;background:var(--bg-secondary);z-index:1;">
                            <tr>
                                <th>${te('item_label')}</th>
                                <th>${te('reponse_label')}</th>
                                <th>${te('commentaires_label')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderItemRow('cause_primaire', te('item_cause'), _esc(pac.cause_primaire || ''))}
                            ${renderItemRow('action_curative', te('item_action_curative'), `${_esc(pac.action_curative || '')}${pac.curative_date_prevue ? `<br><span style="font-size:0.72rem;color:var(--text-muted);">${te('date_prevue')} : ${_formatDate(pac.curative_date_prevue)}</span>` : ''}`)}
                            ${renderItemRow('preuves_curative', te('item_preuves_curative'), formatProofs(pac.curative_preuves))}
                            ${renderItemRow('action_corrective', te('item_action_corrective'), `${_esc(pac.actions_correctives || '')}${pac.corrective_date_prevue ? `<br><span style="font-size:0.72rem;color:var(--text-muted);">${te('date_prevue')} : ${_formatDate(pac.corrective_date_prevue)}</span>` : ''}`)}
                            ${renderItemRow('preuves_corrective', te('item_preuves_corrective'), formatProofs(pac.corrective_preuves))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${showAACSection ? `
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- ROW 3 — Évaluation et Suivi (AAC) — full-width landscape     -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div class="exec-form-section expanded" style="margin-top:0.6rem;border-color:#10b981;">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')" style="background:#ecfdf5;">
            <span class="exec-form-section-letter" style="background:#10b981;">3</span>
            <span class="exec-form-section-title">${te('evaluation_suivi_aac')}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <div style="display:grid;grid-template-columns:1fr 1.5fr 1.2fr;gap:0.85rem;align-items:start;">

                <!-- 3a Acceptation -->
                <div style="border:1px solid #d1fae5;border-radius:6px;padding:0.55rem 0.65rem;background:#f0fdf4;">
                    <div style="font-weight:600;font-size:0.8rem;margin-bottom:0.4rem;color:#065f46;">${te('acceptation_propositions')}</div>
                    <div class="form-group">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('pac_accepte')}</label>
                        <select class="form-input" id="anac_pac_accepte" ${aacDis} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                            <option value=""></option>
                            <option value="OUI" ${acceptation.accepte === 'OUI' ? 'selected' : ''}>${te('oui_label')}</option>
                            <option value="NON" ${acceptation.accepte === 'NON' ? 'selected' : ''}>${te('non_label')}</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_acceptation')}</label>
                        <input type="date" class="form-input" id="anac_date_acceptation" value="${_esc(acceptation.date || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                    </div>
                </div>

                <!-- 3b Vérification de la mise en oeuvre -->
                <div style="border:1px solid #d1fae5;border-radius:6px;padding:0.55rem 0.65rem;background:#f0fdf4;">
                    <div style="font-weight:600;font-size:0.8rem;margin-bottom:0.4rem;color:#065f46;">${te('verification_mise_oeuvre')}</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('isolement_realise')}</label>
                            <select class="form-input" id="anac_isolement" ${aacDis} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                                <option value=""></option>
                                <option value="OUI" ${verification.isolement_realise === 'OUI' ? 'selected' : ''}>${te('oui_label')}</option>
                                <option value="NON" ${verification.isolement_realise === 'NON' ? 'selected' : ''}>${te('non_label')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('risques_traites')}</label>
                            <select class="form-input" id="anac_risques" ${aacDis} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                                <option value=""></option>
                                <option value="OUI" ${verification.risques_traites === 'OUI' ? 'selected' : ''}>${te('oui_label')}</option>
                                <option value="NON" ${verification.risques_traites === 'NON' ? 'selected' : ''}>${te('non_label')}</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('commentaire_efficacite')}</label>
                        <textarea class="form-input" id="anac_commentaire_efficacite" rows="2" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">${_esc(verification.commentaire_efficacite || '')}</textarea>
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('preuves_mise_oeuvre')}</label>
                        <div id="anac_preuves_mise_oeuvre_list">${renderProofList(verification.preuves_mise_oeuvre, 'anac_preuves_mise_oeuvre_list', aacEditable)}</div>
                        ${renderUploadZone('anac_preuves_mise_oeuvre', 'anac_preuves_mise_oeuvre_list', aacEditable)}
                    </div>
                </div>

                <!-- 3c Clôture -->
                <div style="border:1px solid #d1fae5;border-radius:6px;padding:0.55rem 0.65rem;background:#f0fdf4;">
                    <div style="font-weight:600;font-size:0.8rem;margin-bottom:0.4rem;color:#065f46;">${te('cloture_fnc')}</div>
                    <div class="form-group">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('mise_oeuvre_effective')}</label>
                        <select class="form-input" id="anac_mise_effective" ${aacDis} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                            <option value=""></option>
                            <option value="OUI" ${cloture.mise_en_oeuvre_effective === 'OUI' ? 'selected' : ''}>${te('oui_label')}</option>
                            <option value="NON" ${cloture.mise_en_oeuvre_effective === 'NON' ? 'selected' : ''}>${te('non_label')}</option>
                        </select>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.35rem;">
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_solde')}</label>
                            <input type="date" class="form-input" id="anac_date_solde" value="${_esc(cloture.date_solde || (fnc.date_solde ? fnc.date_solde.slice(0,10) : ''))}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('solde_par')}</label>
                            <input type="text" class="form-input" id="anac_solde_par" value="${_esc(cloture.solde_par || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>` : ''}`;

    // ── Footer buttons (role-based visibility) ───────────────────────
    let footerHtml = `<button class="btn btn-outline" onclick="execCloseSlider()">${te('close')}</button>`;

    // Brouillon — visible for AAC and Postulant when not soldée
    if (!isSoldee) {
        footerHtml += ` <button class="btn btn-outline" onclick="execSaveDraftPAC('${fncId}')">${EXEC_ICONS.edit} ${te('sauver_brouillon')}</button>`;
    }

    // Soumettre pour Validation — Postulant only, when ouverte/pac_rejetee
    if (isPostulant && (isOuverte || isPACRejete)) {
        footerHtml += ` <button class="btn btn-primary" onclick="execSubmitPAC('${fncId}')">${EXEC_ICONS.send} ${te('soumettre_validation')}</button>`;
    } else if (isPostulant && isPACSoumis) {
        // disabled state: shows the user the PAC is awaiting AAC review
        footerHtml += ` <button class="btn btn-primary" disabled title="${te('pac_soumis')}">${EXEC_ICONS.send} ${te('soumettre_validation')}</button>`;
    }

    // Renvoyer au postulant — AAC only, when pac_soumis
    if (isAAC && isPACSoumis) {
        footerHtml += ` <button class="btn btn-danger" onclick="execReturnPACtoPostulant('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer_postulant')}</button>`;
    }

    // Solder la Constatation — AAC only, when not soldée
    if (isAAC && !isSoldee) {
        footerHtml += ` <button class="btn btn-success" onclick="execCloseFNC('${fncId}')">${EXEC_ICONS.check} ${te('solder_constatation')}</button>`;
    }

    // Export PDF — visible always when soldée (placeholder for now)
    if (isSoldee) {
        footerHtml += ` <button class="btn btn-primary" onclick="alert('Export PDF à venir')">${EXEC_ICONS.download} ${te('export_pdf')}</button>`;
    }

    execShowSlider(`${EXEC_ICONS.constatations} ${te('suivi_pac')} — ${_esc(fnc.reference || '')}`, bodyHtml, footerHtml, 'max');
}

function _collectProofsFromContainer(containerId) {
    const proofs = [];
    document.querySelectorAll(`#${containerId} > div`).forEach(div => {
        const path = div.dataset?.path;
        const name = div.querySelector('span')?.textContent || '';
        if (path) proofs.push({ filename: name, path });
    });
    return proofs;
}

function execUploadPACProof(inputPrefix) {
    document.getElementById(`${inputPrefix}_input`)?.click();
}

async function execHandlePACProofUpload(files, containerId) {
    if (!files || files.length === 0) return;
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok') {
                const container = document.getElementById(containerId);
                if (container) {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;';
                    div.innerHTML = `${EXEC_ICONS.file} <span style="flex:1;">${_esc(data.filename)}</span>
                        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
                    div.dataset.path = data.path;
                    container.appendChild(div);
                }
            }
        } catch (e) {
            console.error('Upload PAC proof error:', e);
        }
    }
}

// ── Per-item comment thread (Détails du suivi) ───────────────────
function execAddItemComment(itemKey) {
    const textarea = document.getElementById(`pac_item_input_${itemKey}`);
    const texte = textarea?.value?.trim();
    if (!texte) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    const role = _execIsAAC() ? 'AAC' : 'Postulant';
    const date = new Date().toISOString().slice(0, 10);
    const container = document.getElementById(`pac_item_comments_${itemKey}`);
    if (!container) return;

    // Drop the "no comment" placeholder if present
    const placeholder = container.querySelector('em');
    if (placeholder && container.children.length === 1) container.innerHTML = '';

    const bg = role === 'AAC' ? '#e0f2fe' : '#f0fdf4';
    const border = role === 'AAC' ? '#0284c7' : '#16a34a';
    const div = document.createElement('div');
    div.className = 'pac-comment';
    div.style.cssText = `padding:0.4rem 0.5rem;margin-bottom:0.3rem;background:${bg};border-left:3px solid ${border};border-radius:4px;font-size:0.75rem;`;
    div.dataset.auteur = auteur;
    div.dataset.role = role;
    div.dataset.date = date;
    div.dataset.texte = texte;
    div.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:0.15rem;">
        <strong>${_esc(auteur)} <span style="font-weight:normal;color:var(--text-muted);">(${role})</span></strong>
        <span style="color:var(--text-muted);font-size:0.7rem;">${_formatDate(date)}</span>
    </div>
    <div>${_esc(texte)}</div>`;
    container.appendChild(div);
    textarea.value = '';
}

function _collectItemsComments() {
    const itemKeys = ['cause_primaire', 'action_curative', 'date_curative', 'preuves_curative',
                      'action_corrective', 'date_corrective', 'preuves_corrective'];
    const out = {};
    itemKeys.forEach(k => {
        const container = document.getElementById(`pac_item_comments_${k}`);
        if (!container) return;
        const arr = [];
        container.querySelectorAll('.pac-comment').forEach(div => {
            const texte = div.dataset?.texte || '';
            if (!texte) return;
            arr.push({
                auteur: div.dataset?.auteur || '',
                role: div.dataset?.role || '',
                date: div.dataset?.date || '',
                texte
            });
        });
        if (arr.length) out[k] = arr;
    });
    return out;
}

function _collectEvaluationANAC() {
    return {
        acceptation: {
            accepte: document.getElementById('anac_pac_accepte')?.value || '',
            date: document.getElementById('anac_date_acceptation')?.value || ''
        },
        verification: {
            isolement_realise: document.getElementById('anac_isolement')?.value || '',
            risques_traites: document.getElementById('anac_risques')?.value || '',
            commentaire_efficacite: document.getElementById('anac_commentaire_efficacite')?.value || '',
            preuves_mise_oeuvre: _collectProofsFromContainer('anac_preuves_mise_oeuvre_list')
        },
        cloture: {
            mise_en_oeuvre_effective: document.getElementById('anac_mise_effective')?.value || '',
            date_solde: document.getElementById('anac_date_solde')?.value || '',
            solde_par: document.getElementById('anac_solde_par')?.value || ''
        }
    };
}

function _collectFullEvalData() {
    // Preserve any pre-existing rejet_info from the loaded constatation.
    const prev = EXEC_STATE.selectedConstatation?.commentaire_evaluation;
    let prevObj = {};
    if (prev) {
        if (typeof prev === 'object') prevObj = prev;
        else { try { prevObj = JSON.parse(prev); } catch (e) { prevObj = {}; } }
    }
    const out = {
        evaluation_anac: _collectEvaluationANAC(),
        items_comments: _collectItemsComments()
    };
    if (prevObj.rejet_info) out.rejet_info = prevObj.rejet_info;
    return out;
}

function _collectPACData() {
    return {
        actions_correctives: [{
            cause_primaire: document.getElementById('pac_cause_primaire')?.value || '',
            action_curative: document.getElementById('pac_action_curative')?.value || '',
            curative_date_prevue: document.getElementById('pac_curative_date_prevue')?.value || '',
            curative_preuves: _collectProofsFromContainer('pac_curative_preuves_list'),
            actions_correctives: document.getElementById('pac_actions_correctives')?.value || '',
            corrective_date_prevue: document.getElementById('pac_corrective_date_prevue')?.value || '',
            corrective_preuves: _collectProofsFromContainer('pac_corrective_preuves_list')
        }]
    };
}

// ── Brouillon: PUT without changing status ───────────────────────
async function execSaveDraftPAC(fncId) {
    const pac = _collectPACData();
    const evalData = _collectFullEvalData();
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({
                actions_correctives: pac.actions_correctives,
                commentaire_evaluation: evalData
            })
        });
        _execToast(te('brouillon_enregistre'), 'success');
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Save draft PAC error:', e);
    }
}

// ── Soumettre pour Validation (Postulant) ────────────────────────
async function execSubmitPAC(fncId) {
    const pac = _collectPACData();
    const evalData = _collectFullEvalData();
    // Detect modified fields by comparing current form values with saved PAC
    const fnc = EXEC_STATE.selectedConstatation || {};
    const prevPac = (fnc.actions_correctives || [])[0] || {};
    const newPac = pac.actions_correctives[0] || {};
    const fieldLabels = {
        cause_primaire: te('item_cause'),
        action_curative: te('item_action_curative'),
        curative_date_prevue: te('item_date_curative'),
        actions_correctives: te('item_action_corrective'),
        corrective_date_prevue: te('item_date_corrective')
    };
    const modifiedFields = [];
    for (const [key, label] of Object.entries(fieldLabels)) {
        const prev = (prevPac[key] || '').toString().trim();
        const curr = (newPac[key] || '').toString().trim();
        if (curr !== prev) modifiedFields.push(label);
    }
    // Build submit_info (green notification, replaces rejet_info)
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || '';
    evalData.submit_info = {
        date: new Date().toISOString().slice(0, 10),
        auteur,
        motif: modifiedFields.length > 0 ? modifiedFields.join(', ') : te('aucune_modification') || 'Aucune modification'
    };
    // Clear any previous rejet_info since postulant is resubmitting
    delete evalData.rejet_info;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-pac`, {
            method: 'PUT',
            body: JSON.stringify({
                actions_correctives: pac.actions_correctives,
                evaluation: evalData
            })
        });
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Submit PAC error:', e);
    }
}

// ── Renvoyer au postulant (AAC) ──────────────────────────────────
async function execReturnPACtoPostulant(fncId) {
    if (!confirm(te('confirm_renvoyer'))) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
    const evalData = _collectFullEvalData();
    // Build motif from items that have comments
    const itemsComments = evalData.items_comments || {};
    const itemLabels = {
        cause_primaire: te('item_cause'),
        action_curative: te('item_action_curative'),
        date_curative: te('item_date_curative'),
        preuves_curative: te('item_preuves_curative'),
        action_corrective: te('item_action_corrective'),
        date_corrective: te('item_date_corrective'),
        preuves_corrective: te('item_preuves_corrective')
    };
    const commentedItems = [];
    for (const [key, label] of Object.entries(itemLabels)) {
        if (itemsComments[key] && itemsComments[key].length > 0) commentedItems.push(label);
    }
    evalData.rejet_info = {
        date: new Date().toISOString().slice(0, 10),
        auteur,
        motif: commentedItems.length > 0 ? commentedItems.join(', ') : ''
    };
    // Clear any previous submit_info since AAC is rejecting
    delete evalData.submit_info;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/reject-pac`, {
            method: 'PUT',
            body: JSON.stringify({
                motif: evalData.rejet_info.motif,
                commentaire_evaluation: evalData
            })
        });
        _execToast(te('pac_renvoye_titre'), 'success');
        await execRefreshDynamic();
        // Refresh the slider with the updated FNC state
        const updated = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId);
        if (updated) EXEC_STATE.selectedConstatation = updated;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Return PAC error:', e);
        _execToast((e && e.message) || 'Erreur lors du renvoi du PAC', 'error');
    }
}

// ── Solder la Constatation (AAC) ─────────────────────────────────
async function execCloseFNC(fncId) {
    if (!confirm(te('confirm_solder'))) return;
    const evalData = _collectFullEvalData();
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/close`, {
            method: 'PUT',
            body: JSON.stringify({ evaluation: evalData })
        });
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Close FNC error:', e);
    }
}

// ══════════════════════════════════════
//  7. RAPPORTS D'AUDIT
// ══════════════════════════════════════

function execRenderRapports() {
    // Only closed (transmitted) reports are listed on this page
    const allRapports = (EXEC_STATE.data.rapports || []).filter(r => r.statut === 'transmis');
    const F = EXEC_STATE.filters;
    const isPrest = _execIsPrestataire();
    const prestataires = EXEC_STATE.data.prestataires || [];
    const secteurs = EXEC_STATE.data.secteurs || [];

    // Build prestataire -> secteur/domaine lookup
    const prestInfo = {};
    prestataires.forEach(p => {
        const sec = secteurs.find(s => s.id === p.secteur_id);
        prestInfo[p.id] = { secteur_id: p.secteur_id || '', domaine_id: sec ? sec.domaine_id : '' };
    });

    let filtered = allRapports;
    if (F.domaine) filtered = filtered.filter(r => {
        const info = prestInfo[r.prestataire_id];
        return (info && info.domaine_id === F.domaine) || r.prestataire_domaine_id === F.domaine;
    });
    if (F.secteur) filtered = filtered.filter(r => {
        const info = prestInfo[r.prestataire_id];
        return info && info.secteur_id === F.secteur;
    });
    if (F.prestataire) filtered = filtered.filter(r => r.prestataire_id === F.prestataire);
    if (F.annee) filtered = filtered.filter(r => {
        const d = r.date_transmission || r.date_creation || '';
        return d.slice(0, 4) === String(F.annee);
    });
    if (F.trimestre) filtered = filtered.filter(r => {
        const d = r.date_transmission || r.date_creation || '';
        if (d.length < 7) return false;
        const m = parseInt(d.slice(5, 7));
        const t = Math.ceil(m / 3);
        return String(t) === String(F.trimestre);
    });
    if (F.search) {
        const s = F.search.toLowerCase();
        filtered = filtered.filter(r =>
            (r.reference || '').toLowerCase().includes(s) ||
            (r.titre || '').toLowerCase().includes(s) ||
            (r.prestataire_nom || '').toLowerCase().includes(s) ||
            (r.prestataire_domaine_nom || '').toLowerCase().includes(s)
        );
    }

    // Prestataire view: only show their own data and a restricted filter set
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showSearch: true }
        : { showDomaine: true, showSecteur: true, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showSearch: true };

    return `
    <div class="page-content">
        <div class="page-header">
            <h2>${te('rapports')}</h2>
            <p style="color:var(--text-muted);">${te('rapports_closed_intro') || 'Rapports clôturés accessibles au téléchargement.'}</p>
        </div>

        ${_execRenderFilterBar('execRenderPage()', filterOpts)}

        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
                <thead>
                    <tr>
                        <th style="width:150px;">${te('ref_rapport')}</th>
                        <th style="width:320px;">${te('titre_rapport')} & ${te('provider')}</th>
                        <th style="width:170px;">${te('domaine')}</th>
                        <th style="width:130px;">${te('date_transmission') || 'Date de Transmission'}</th>
                        <th style="width:120px;">${te('statut') || 'Statut'}</th>
                        <th style="width:130px;text-align:center;">${te('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>` :
                    filtered.map(r => {
                        return `<tr>
                            <td><strong>${_esc(r.reference || '')}</strong></td>
                            <td>
                                <div>${_esc(r.titre || '')}</div>
                                <div style="font-size:0.78rem;color:var(--text-muted);">${_esc(r.prestataire_nom || '')}${r.notification_ref ? ' | ' + _esc(r.notification_ref) : ''}</div>
                            </td>
                            <td>${_esc(r.prestataire_domaine_nom || r.prestataire_domaine_code || '-')}</td>
                            <td>${_formatDate(r.date_transmission || '')}</td>
                            <td>${_execStatusBadge(r.statut)}</td>
                            <td class="exec-etats-actions">
                                <button class="btn btn-outline btn-sm" onclick="execDownloadRapport('${r.id}')" title="Aperçu PDF">
                                    ${EXEC_ICONS.eye}
                                </button>
                                <a href="javascript:void(0)"
                                   onclick="execDownloadRapport('${r.id}', true)"
                                   title="Télécharger le PDF (identique à l'aperçu)"
                                   style="display:inline-flex;align-items:center;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#1e293b;text-decoration:none;cursor:pointer;transition:all 0.15s;"
                                   onmouseover="this.style.background='#e0f2fe';this.style.borderColor='#0284c7';"
                                   onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
                                    <svg width="18" height="22" viewBox="0 0 24 24" fill="#dc2626" stroke="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6" fill="#fee2e2"/><text x="12" y="17" font-size="6" font-weight="700" fill="#fff" text-anchor="middle">PDF</text></svg>
                                </a>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
          </div>
        </div>
    </div>`;
}

// ── Download the rapport as a real PDF file (backend fpdf2) ─────
async function execDownloadRapportFile(rapportId) {
    try {
        const token = localStorage.getItem('pr_token') || '';
        const url = `${EXEC_MODULE_API}/rapports/${rapportId}/pdf`;
        console.log('[PDF] Downloading from:', url);
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('[PDF] Response status:', res.status, 'Content-Type:', res.headers.get('Content-Type'));
        if (!res.ok) {
            let msg = `Erreur ${res.status}`;
            try {
                const ct = res.headers.get('Content-Type') || '';
                if (ct.includes('application/json')) {
                    const j = await res.json();
                    msg = j.error || msg;
                } else {
                    const txt = await res.text();
                    console.error('[PDF] Server response:', txt.slice(0, 500));
                    msg += ' (voir console)';
                }
            } catch (e) { console.error('[PDF] Parse error:', e); }
            _execToast(msg, 'error'); return;
        }
        const blob = await res.blob();
        let fname = 'Rapport.pdf';
        const cd = res.headers.get('Content-Disposition') || '';
        const m = cd.match(/filename="?([^";]+)"?/i);
        if (m) fname = m[1];
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = fname;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 200);
        _execToast('PDF téléchargé', 'success');
    } catch (e) {
        console.error('[PDF] Download error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

// ── Download a transmitted report as a printable HTML file ─────
async function execDownloadRapport(rapportId, autoPrint, retournerHtml) {
    let rapport;
    try {
        rapport = await api(`${EXEC_MODULE_API}/rapports/${rapportId}`);
    } catch (e) {
        console.error('Load rapport error:', e);
        _execToast((e && e.message) || 'Erreur lors du chargement du rapport', 'error');
        return;
    }
    if (!rapport) return;

    // Load dossier for full context
    let dossier = EXEC_STATE.selectedDossier || {};
    if (rapport.dossier_id && rapport.dossier_id !== dossier.id) {
        try { dossier = await api(`${EXEC_MODULE_API}/dossiers/${rapport.dossier_id}`); } catch { /* use cached */ }
    }
    const aac = EXEC_STATE.data.aac || {};
    const constatations = dossier.constatations || [];
    const logoImg = aac.logo_data ? `<img src="${aac.logo_data}" style="max-height:70px;">` : '';
    const notifRef = rapport.notification_ref || dossier.notif_reference || '';
    const natureActivite = dossier.notif_nature || 'Inspection';
    const prestNom = rapport.prestataire_nom || dossier.prestataire_nom || '';
    const prestCode = rapport.prestataire_code || dossier.prestataire_code || '';
    const refAgrement = dossier.ref_agrement || prestCode || '';
    const secteur = (() => {
        const sid = dossier.notif_secteur_id || '';
        const s = (EXEC_STATE.data.secteurs || []).find(x => x.id === sid);
        return s ? (s.code + ' - ' + s.nom) : sid;
    })();
    const refActivite = dossier.notif_reference_activite || notifRef || '';
    const lieu = dossier.notif_lieu || dossier.notif_fait_a || aac.ville || '';
    const dateExec = dossier.dates_activite || ((dossier.notif_date_debut || '') + (dossier.notif_date_fin ? (' au ' + dossier.notif_date_fin) : ''));
    const objet = dossier.objet_activite || dossier.notification_objet || '';

    // Équipe d'inspection - parse from dossier
    const equipeText = dossier.equipe_inspection || '';
    const equipeRows = equipeText.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(/[;:,\-–—]+/).map(s => s.trim());
        return { nom: parts[0] || line.trim(), role: parts[1] || '' };
    });

    // Périmètre (aspects couverts)
    const perimetre = dossier.aspects_couverts || dossier.notif_perimetre || '';
    const perimetreLines = perimetre.split('\n').filter(l => l.trim());

    // Référentiel
    const referentiel = dossier.referentiel || '';
    const refLines = referentiel.split('\n').filter(l => l.trim());

    // Constatations count by criticité
    const nbCritique = constatations.filter(c => (c.criticite || '').toLowerCase().includes('critique')).length;
    const nbMajeure = constatations.filter(c => (c.criticite || '').toLowerCase().includes('majeur')).length;
    const nbMineure = constatations.filter(c => (c.criticite || '').toLowerCase().includes('mineur')).length;

    // Chef d'équipe
    const chefEquipe = dossier.equipe_chef || (equipeRows.length > 0 ? equipeRows[0].nom : '');
    const interlocuteur = dossier.notif_interlocuteur_nom || dossier.notif_interlocuteur || '';
    const interlocuteurFonction = dossier.notif_fonction_responsable || '';

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${_esc(rapport.reference || 'Rapport')}</title>
<style>
    @page { size: A4; margin: 2cm 1.5cm; }
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.45; margin: 0; padding: 0; }
    .page { max-width: 720px; margin: 0 auto; padding: 1.5cm; }
    /* Header */
    .doc-hdr { display: flex; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 0.5cm; }
    .doc-hdr-logo { flex: 0 0 180px; text-align: center; }
    .doc-hdr-logo img { max-height: 70px; }
    .doc-hdr-right { flex: 1; text-align: right; }
    .doc-hdr-title { font-size: 20pt; font-weight: 700; margin-bottom: 2px; }
    .doc-hdr-ref { color: #ee0000; font-weight: 700; font-size: 11pt; }
    .doc-hdr-notif { font-size: 10pt; color: #555; }
    .doc-hdr-admin { font-size: 10pt; text-align: center; color: #333; margin-top: 4px; }
    /* Info box */
    .info-box { background: #f2f2f2; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 12px 16px; margin-bottom: 1cm; }
    .info-box table { width: 100%; border-collapse: collapse; }
    .info-box td { padding: 3px 6px; font-size: 10.5pt; vertical-align: top; }
    .info-box .lbl { font-weight: 700; }
    .info-box .cat { font-weight: 700; color: #156082; font-size: 11pt; padding-bottom: 2px; }
    /* Sections */
    .sec-title { font-size: 13pt; font-weight: 700; margin: 1cm 0 0.3cm; padding-bottom: 4px; border-bottom: 1.5px solid #333; text-transform: uppercase; }
    .sub-label { font-weight: 700; margin: 0.3cm 0 0.1cm; font-size: 10.5pt; }
    p, li { font-size: 10.5pt; margin: 0.1cm 0; }
    ul { padding-left: 1.2em; margin: 0.15cm 0; }
    /* Tables */
    table.data-tbl { width: 100%; border-collapse: collapse; margin: 0.2cm 0 0.4cm; font-size: 10pt; }
    table.data-tbl th, table.data-tbl td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
    table.data-tbl th { background: #e8e8e8; font-weight: 700; }
    /* SWOT */
    .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3cm; margin: 0.2cm 0 0.4cm; }
    .swot-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; font-size: 10pt; }
    .swot-box strong { display: block; margin-bottom: 4px; color: #156082; }
    /* Signatures */
    .sig-block { margin-top: 1cm; }
    .sig-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5cm; text-align: center; font-size: 9.5pt; margin-top: 0.5cm; }
    .sig-item { padding-top: 0.5cm; }
    .sig-line { border-top: 1px solid #111; margin: 0.5cm auto 0; width: 80%; }
    /* Annexe */
    .page-break { page-break-before: always; }
    .annexe-title { font-size: 14pt; font-weight: 700; text-align: center; margin: 0.5cm 0 0.5cm; color: #156082; }
    .attestation { font-size: 10pt; line-height: 1.5; margin: 0.3cm 0; font-style: italic; }
    .visa-box { display: grid; grid-template-columns: 1fr 1fr; gap: 1cm; margin-top: 0.5cm; font-size: 10pt; }
    .visa-box .v-label { font-weight: 700; }
    @page { size: A4; margin: 10mm 12mm; }
    @media print {
        html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        .page { padding: 0 !important; max-width: none !important; box-shadow: none !important; margin: 0 !important; background: #fff !important; }
        .page + .page { page-break-before: always; }
        .no-print, .preview-toolbar, .page-offset, #print-tip { display: none !important; visibility: hidden !important; height: 0 !important; }
        tr, .swot-box, .info-box, .sig-block, .visa-box { page-break-inside: avoid; break-inside: avoid; }
        .sec-title, .sub-label, .annexe-title { page-break-after: avoid; break-after: avoid; }
    }
    @media screen {
        body { background: #e5e5e5; }
        .page { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.15); margin: 1cm auto; }
        .preview-toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #1e293b; padding: 10px 20px; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.4); }
        .preview-toolbar-title { color: #94a3b8; font-size: 13px; }
        .preview-toolbar-ref { color: #fff; font-weight: 700; font-size: 14px; margin-right: auto; }
        .preview-toolbar-spacer { flex: 1; }
        .preview-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
        .preview-btn-primary { background: #2563eb; color: #fff; }
        .preview-btn-primary:hover { background: #1d4ed8; }
        .preview-btn-success { background: #059669; color: #fff; }
        .preview-btn-success:hover { background: #047857; }
        .preview-btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #334155; }
        .preview-btn-ghost:hover { background: #334155; color: #fff; }
        .preview-btn:disabled { opacity: 0.5; cursor: wait; }
        .preview-toolbar-status { color: #fbbf24; font-size: 12px; font-style: italic; margin-right: 6px; }
        .page-offset { height: 110px; }
    }
</style>
</head><body>
<div class="no-print preview-toolbar">
    <span class="preview-toolbar-title">Aperçu •</span>
    <span class="preview-toolbar-ref">${_esc(rapport.reference || 'Rapport')}</span>
    <button class="preview-btn preview-btn-success" onclick="window.print()" title="Dans la boîte de dialogue : choisir 'Enregistrer au format PDF'">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Télécharger PDF
    </button>
    <button class="preview-btn preview-btn-ghost" onclick="window.close()">✕ Fermer</button>
</div>
<div id="print-tip" class="no-print" style="position:fixed;top:56px;left:0;right:0;z-index:998;background:#fef3c7;color:#92400e;padding:8px 20px;font-size:13px;border-bottom:1px solid #fbbf24;display:flex;align-items:center;gap:10px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span><strong>Astuce :</strong> dans la boîte de dialogue, ouvrez « Plus de paramètres » et décochez « En-têtes et pieds de page » pour un PDF sans URL ni date (à faire une seule fois — votre navigateur retient le réglage).</span>
    <button onclick="this.parentElement.style.display='none'" style="margin-left:auto;background:transparent;border:none;color:#92400e;cursor:pointer;font-size:18px;font-weight:700;">×</button>
</div>
<div class="no-print page-offset"></div>
<div id="report-content">
<div class="page">
    <!-- HEADER -->
    <div class="doc-hdr">
        <div class="doc-hdr-logo">
            ${logoImg}
            <div class="doc-hdr-admin">${_esc(aac.nom || '')}</div>
        </div>
        <div class="doc-hdr-right">
            <div class="doc-hdr-title">RAPPORT D\u2019${_esc(natureActivite.toUpperCase())}</div>
            <div class="doc-hdr-ref">${_esc(rapport.reference || '')}</div>
            <div class="doc-hdr-notif">${notifRef ? 'Réf. Notification : ' + _esc(notifRef) : ''}</div>
        </div>
    </div>

    <!-- INFO BOX -->
    <div class="info-box">
        <table>
            <tr><td class="cat" width="50%">Prestataire</td><td class="cat">Activité</td></tr>
            <tr><td><span class="lbl">Nom du prestataire</span> : ${_esc(prestNom)}</td>
                <td><span class="lbl">Nature de l\u2019activité</span> : ${_esc(natureActivite)}</td></tr>
            <tr><td><span class="lbl">Réf Agrément</span> : ${_esc(refAgrement)}</td>
                <td><span class="lbl">Objet de l\u2019activité</span> : ${_esc(objet)}</td></tr>
            <tr><td><span class="lbl">Lieu</span> : ${_esc(lieu)}</td>
                <td><span class="lbl">Date d\u2019exécution</span> : ${_esc(dateExec)}</td></tr>
            <tr><td><span class="lbl">Secteur d\u2019activité</span> : ${_esc(secteur)}</td>
                <td><span class="lbl">Réf Activité</span> : ${_esc(refActivite)}</td></tr>
        </table>
    </div>

    <!-- 1. INTRODUCTION -->
    <div class="sec-title">INTRODUCTION</div>
    <p class="sub-label">Description générale de l\u2019activité :</p>
    <p>${_esc(dossier.description_activite || objet || '-')}</p>

    <p class="sub-label">Équipe d\u2019inspection :</p>
    ${equipeRows.length > 0 ? `<table class="data-tbl">
        <thead><tr><th>Nom et Prénom</th><th>Rôle</th></tr></thead>
        <tbody>${equipeRows.map(m => `<tr><td>${_esc(m.nom)}</td><td>${_esc(m.role)}</td></tr>`).join('')}</tbody>
    </table>` : '<p>-</p>'}

    <p class="sub-label">Périmètre de l\u2019activité :</p>
    ${perimetreLines.length > 0 ? `<ul>${perimetreLines.map(l => `<li><strong>${_esc(l)}</strong></li>`).join('')}</ul>` : '<p>-</p>'}

    <p class="sub-label">Référentiel :</p>
    ${refLines.length > 0 ? `<ul>${refLines.map(l => `<li>${_esc(l)}</li>`).join('')}</ul>` : '<p>-</p>'}

    <!-- 2. SYNTHESE ET RECOMMANDATIONS -->
    <div class="sec-title">SYNTHÈSE ET RECOMMANDATIONS</div>
    <div class="swot-grid">
        <div class="swot-box"><strong>Points Forts</strong>${_esc(dossier.synthese_points_forts || '-')}</div>
        <div class="swot-box"><strong>Points Faibles</strong>${_esc(dossier.synthese_points_faibles || '-')}</div>
    </div>
    <p class="sub-label">Opportunités d\u2019amélioration :</p>
    <p>${_esc(dossier.opportunites_amelioration || '-')}</p>
    <p class="sub-label">Résumé global des constatations :</p>
    <p>${_esc(dossier.resume_global_constatations || '-')}</p>

    <!-- 3. LISTE DES CONSTATATIONS -->
    <div class="sec-title">LISTE DES CONSTATATIONS</div>
    ${constatations.length === 0 ? '<p>Aucune constatation.</p>' : `
    <table class="data-tbl">
        <thead><tr><th>Réf</th><th>Criticité</th><th>Description</th><th>Statut</th></tr></thead>
        <tbody>${constatations.map(c => `<tr>
            <td>${_esc(c.reference || '')}</td>
            <td>${_esc(c.criticite || '')}</td>
            <td>${_esc(c.description || '')}</td>
            <td>${_esc(c.statut || '')}</td>
        </tr>`).join('')}</tbody>
    </table>
    <p style="font-size:9.5pt;color:#555;font-style:italic;">Note : La fiche détaillée de chaque constatation est jointe en Annexe B.</p>`}

    <!-- 4. CONCLUSION -->
    <div class="sec-title">CONCLUSION</div>
    <p>${_esc(dossier.conclusion || '-')}</p>

    <!-- Signatures -->
    <div class="sig-block">
        <p>${_esc(lieu)}, le _______________</p>
        ${equipeRows.length > 1 ? `<div class="sig-grid">
            ${equipeRows.slice(1).reverse().map(m => `<div class="sig-item">${_esc(m.nom)}<div class="sig-line"></div></div>`).join('')}
        </div>` : ''}
        <div style="text-align:center;margin-top:0.7cm;">
            <p style="font-weight:700;">Le Chef d\u2019équipe</p>
            <p>${_esc(chefEquipe)}</p>
            <div class="sig-line" style="width:200px;margin:0.5cm auto 0;"></div>
        </div>
    </div>
</div>

<!-- ═══════ ANNEXE A ═══════ -->
<div class="page page-break">
    <div class="doc-hdr">
        <div class="doc-hdr-logo">${logoImg}<div class="doc-hdr-admin">${_esc(aac.nom || '')}</div></div>
        <div class="doc-hdr-right">
            <div class="doc-hdr-title">RAPPORT D\u2019${_esc(natureActivite.toUpperCase())}</div>
            <div class="doc-hdr-ref">${_esc(rapport.reference || '')}</div>
        </div>
    </div>
    <div class="annexe-title">ANNEXES AU RAPPORT</div>
    <div class="annexe-title" style="font-size:12pt;">Annexe A \u2013 Fiche d\u2019acceptation des constatations</div>

    <div class="info-box">
        <table>
            <tr><td class="cat" width="50%">Prestataire</td><td class="cat">Activité</td></tr>
            <tr><td><span class="lbl">Nom du prestataire</span> : ${_esc(prestNom)}</td>
                <td><span class="lbl">Nature de l\u2019activité</span> : ${_esc(natureActivite)}</td></tr>
            <tr><td><span class="lbl">Réf Agrément</span> : ${_esc(refAgrement)}</td>
                <td><span class="lbl">Objet de l\u2019activité</span> : ${_esc(objet)}</td></tr>
            <tr><td><span class="lbl">Lieu</span> : ${_esc(lieu)}</td>
                <td><span class="lbl">Date d\u2019exécution</span> : ${_esc(dateExec)}</td></tr>
            <tr><td><span class="lbl">Secteur d\u2019activité</span> : ${_esc(secteur)}</td>
                <td><span class="lbl">Réf Activité</span> : ${_esc(refActivite)}</td></tr>
        </table>
    </div>

    <p class="sub-label">Équipe d\u2019inspection :</p>
    ${equipeRows.length > 0 ? `<table class="data-tbl">
        <thead><tr><th>Nom et Prénom</th><th>Rôle</th></tr></thead>
        <tbody>${equipeRows.map(m => `<tr><td>${_esc(m.nom)}</td><td>${_esc(m.role)}</td></tr>`).join('')}</tbody>
    </table>` : ''}

    <p class="sub-label">Point Focal Prestataire :</p>
    <table class="data-tbl">
        <tr><td><strong>${_esc(interlocuteur || '-')}</strong></td><td>${_esc(interlocuteurFonction || '-')}</td></tr>
    </table>

    <p class="sub-label">Périmètre de l\u2019activité :</p>
    ${perimetreLines.length > 0 ? `<ul>${perimetreLines.map(l => `<li><strong>${_esc(l)}</strong></li>`).join('')}</ul>` : '<p>-</p>'}

    <p class="sub-label">Résultat :</p>
    <table class="data-tbl">
        <tr><td><strong>Nombre de constatation Critique</strong></td><td>${nbCritique}</td></tr>
        <tr><td><strong>Nombre de constatation Majeure</strong></td><td>${nbMajeure}</td></tr>
        <tr><td><strong>Nombre de constatation Mineure</strong></td><td>${nbMineure}</td></tr>
        <tr><td><strong>Nombre Total de constatation</strong></td><td>${constatations.length}</td></tr>
    </table>

    <div style="margin-top:0.7cm;">
        <p class="sub-label">Visa du Chef d\u2019équipe</p>
        <p><strong>${_esc(chefEquipe)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; __________________________</p>
    </div>

    <div style="margin-top:0.7cm;border-top:1px solid #ccc;padding-top:0.3cm;">
        <p class="sub-label">Visa d\u2019acceptation des constatations de la Personne habilitée du Prestataire</p>
        <p class="attestation">Nous attestons avoir pris connaissance des constatations relevées. Par ce visa, nous confirmons avoir accepté les constatations relevées. Un plan d\u2019action vous sera soumis dans les délais. Les preuves de mise en \u0153uvre de plans d\u2019actions acceptés seront transmises en vue de la clôture des constatations.</p>
        <p class="sub-label">Personne habilitée</p>
        <div class="visa-box">
            <div><span class="v-label">Nom :</span> _______________________</div>
            <div><span class="v-label">Date :</span> _______________________</div>
            <div><span class="v-label">Fonction :</span> ___________________</div>
            <div><span class="v-label">Visa :</span> ______________________</div>
        </div>
    </div>
</div>

<!-- ═══════ ANNEXE B ═══════ -->
${constatations.length > 0 ? `
<div class="page page-break">
    <div class="annexe-title">Annexe B - Fiches de Constatations Détaillées</div>
    ${constatations.map((c, idx) => `
    ${idx > 0 ? '<div class="page-break"></div>' : ''}
    <div style="margin-bottom:1cm;">
        <p style="font-weight:700;font-size:12pt;color:#156082;margin-bottom:0.3cm;">Fiche détaillée Constatation ${idx + 1} — ${_esc(c.reference || '')}</p>
        <table class="data-tbl">
            <tr><td width="30%"><strong>Référence</strong></td><td>${_esc(c.reference || '')}</td></tr>
            <tr><td><strong>Criticité</strong></td><td>${_esc(c.criticite || '')}</td></tr>
            <tr><td><strong>Description</strong></td><td>${_esc(c.description || '')}</td></tr>
            <tr><td><strong>Réf. Réglementaires</strong></td><td>${_esc(c.ref_reglementaires || c.exigence_ref || '')}</td></tr>
            <tr><td><strong>Date d\u2019ouverture</strong></td><td>${_esc(c.date_ouverture || '')}</td></tr>
            <tr><td><strong>Délai de correction</strong></td><td>${_esc(c.delai_solde || c.delai_correction || '')} jours</td></tr>
            <tr><td><strong>Date due</strong></td><td>${_esc(c.date_due_cloture || c.date_due || '')}</td></tr>
            <tr><td><strong>Statut</strong></td><td>${_esc(c.statut || '')}</td></tr>
        </table>
    </div>`).join('')}
</div>` : ''}
</div><!-- /#report-content -->
<script>
// Set document title to empty so the browser print header shows nothing
// (the URL/date may still appear unless user disables headers/footers in dialog).
try { document.title = ' '; } catch (e) {}
${autoPrint ? `// Auto-trigger print dialog (user picks "Save as PDF")
window.addEventListener('load', () => { setTimeout(() => { try { window.focus(); window.print(); } catch (e) {} }, 600); });` : ''}
<\/script>
</body></html>`;

    // Le même document sert à l'aperçu intégré : on le renvoie sur demande.
    if (retournerHtml) return html;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    _execToast(te('telecharger') || 'Téléchargement lancé', 'success');
    return html;
}

// ── Export constatations list (xlsx / pdf) ───────────────────────
function execExportConstatations(dossierId, format) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const constatations = dossier.constatations || [];
    if (constatations.length === 0) { _execToast(te('no_data'), 'info'); return; }
    const aac = EXEC_STATE.data.aac || {};
    const headers = [te('reference'), te('criticite'), te('description_constatation'), 'Date Ouv.', 'Délai', te('date_due'), te('status')];
    const rows = constatations.map(c => [
        c.reference || '',
        c.criticite || c.gravite || '',
        c.description || c.titre || '',
        c.date_ouverture || '',
        c.delai_solde || c.delai_correction || '',
        c.date_due_cloture || c.date_due || '',
        c.statut || ''
    ]);
    const title = `Constatations — ${_esc(dossier.reference || dossierId)}`;
    if (format === 'xlsx') {
        _exportTableXLSX(title, headers, rows, `constatations_${dossier.reference || dossierId}`);
    } else {
        _exportTablePDF(title, headers, rows, `constatations_${dossier.reference || dossierId}`, aac);
    }
}

function _exportTableXLSX(title, headers, rows, filename) {
    let csv = headers.join('\t') + '\n';
    rows.forEach(r => { csv += r.map(c => String(c).replace(/\t/g, ' ')).join('\t') + '\n'; });
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    _execToast(te('telecharger') || 'Téléchargement lancé', 'success');
}

function _exportTablePDF(title, headers, rows, filename, aac) {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${_esc(title)}</title>
        <style>body{font-family:Arial,sans-serif;margin:1.5rem;color:#111;font-size:0.85rem;}
        h1{font-size:1.1rem;text-align:center;margin-bottom:1rem;}
        .header{display:flex;justify-content:space-between;font-size:0.78rem;color:#555;margin-bottom:0.5rem;}
        table{width:100%;border-collapse:collapse;font-size:0.78rem;}
        th,td{border:1px solid #999;padding:0.35rem 0.5rem;text-align:left;}
        th{background:#f3f4f6;font-weight:600;}
        @media print{body{margin:0.5cm;}}</style></head><body>
        <div class="header"><div>${_esc((aac||{}).pays || '')}<br>${_esc((aac||{}).designation || '')}</div><div>${new Date().toLocaleDateString('fr-FR')}</div></div>
        <h1>${_esc(title)}</h1>
        <table><thead><tr>${headers.map(h => `<th>${_esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${_esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <script>window.onload=()=>{setTimeout(()=>window.print(),300)};<\/script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}

// ── Export "Situation Générale" du tableau de bord (xlsx / pdf) ────────
// Lit les accordéons Domaine/Secteur rendus dans le DOM pour exporter
// exactement ce que voit l'utilisateur (y compris les filtres actifs).
function execExportSituationGenerale(format) {
    const root = document.getElementById('execSituationGeneraleRoot');
    if (!root) { _execToast(te('no_data') || 'Aucune donnée', 'info'); return; }

    const criticites = ['critique', 'majeure', 'mineure'];
    const flatHeaders = [
        te('domaine') || 'Domaine',
        te('secteur') || 'Secteur',
        te('provider') || 'Prestataire',
        'Activités Planifiées',
        'Activités Clôturées',
        'Taux Exécution',
        ...criticites.map(cr => `Constats ${te(cr) || cr}`),
        'Constats Total',
        ...criticites.map(cr => `Taux Clôture ${te(cr) || cr}`),
        'Taux Clôture Total',
    ];

    // Chaque ligne prestataire porte data-domaine / data-secteur sur le <tr>.
    const rows = [];
    root.querySelectorAll('table.sg-prest-table tbody tr').forEach(tr => {
        const d = tr.getAttribute('data-domaine') || '';
        const s = tr.getAttribute('data-secteur') || '';
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        if (cells.length === 1 && tr.querySelector('td[colspan]')) return;
        rows.push([d, s, ...cells]);
    });

    if (!rows.length) { _execToast(te('no_data') || 'Aucune donnée', 'info'); return; }

    const now = new Date();
    const stamp = now.toISOString().slice(0, 10);
    const title = 'Situation Générale';
    const filename = `situation_generale_${stamp}`;

    if (format === 'xlsx') {
        _exportTableXLSX(title, flatHeaders, rows, filename);
    } else {
        const aac = EXEC_STATE.data.aac || {};
        _exportTablePDF(title, flatHeaders, rows, filename, aac);
    }
}

// ── Volet rétractable des fiches (par constatation) ──
function _execToggleFiches(fncId) {
    const row = document.getElementById('fiches_row_' + fncId);
    const btn = document.getElementById('fiches_btn_' + fncId);
    if (!row) return;
    const open = row.style.display !== 'none';
    row.style.display = open ? 'none' : 'table-row';
    const caret = btn?.querySelector('.caret');
    if (caret) caret.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
}

// ── Helper: résout les métadonnées communes pour Fiche Constat / Fiche Suivi ──
function _execResolveFicheCtx(fncId) {
    const fnc = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId);
    if (!fnc) { _execToast('Constatation non trouvée', 'error'); return null; }
    const aac = EXEC_STATE.data.aac || {};
    const domaines = EXEC_STATE.data.domaines || [];
    const domaineObj = domaines.find(d => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const domaineName = domaineObj ? domaineObj.nom : (fnc.domaine || fnc.domaine_id || '-');
    const prestataires = EXEC_STATE.data.prestataires || [];
    const prestObj = prestataires.find(p => p.id === fnc.prestataire_id);
    const prestName = prestObj ? prestObj.nom : (fnc.prestataire_nom || '-');
    let dateDue = fnc.date_due_cloture;
    if (!dateDue || isNaN(new Date(dateDue).getTime())) {
        const dl = parseInt(fnc.delai_solde || fnc.delai_correction || '0');
        const dO = fnc.date_ouverture || fnc.date_creation;
        if (dl > 0 && dO) { const d = new Date(dO); d.setDate(d.getDate() + dl); dateDue = d.toISOString().slice(0,10); }
    }
    return { fnc, aac, domaineName, prestName, dateDue };
}

// ── Fiche Constat (Section 1 + Section 2 vide) ──────────────────
// format: 'pdf' (impression navigateur, par défaut) ou 'word' (téléchargement .doc)
function execExportFicheConstat(fncId, format) {
    const ctx = _execResolveFicheCtx(fncId); if (!ctx) return;
    const fmt = format || 'pdf';
    const html = _buildFicheHTML(ctx.aac, {
        title: te('fiche_constat') || 'Fiche Constat',
        fnc: ctx.fnc, domaineName: ctx.domaineName, prestName: ctx.prestName, dateDue: ctx.dateDue,
        showSection2: true, showSection3: false, forWord: fmt === 'word'
    });
    if (fmt === 'word') {
        _execDownloadAsWord(html, `Fiche_Constat_${ctx.fnc.reference || ctx.fnc.id}.doc`);
    } else {
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    }
}

// ── Fiche Suivi (Section 1 + Section 3 vide) ────────────────────
function execExportFicheSuivi(fncId, format) {
    const ctx = _execResolveFicheCtx(fncId); if (!ctx) return;
    const fmt = format || 'pdf';
    const html = _buildFicheHTML(ctx.aac, {
        title: te('fiche_suivi') || 'Fiche Suivi',
        fnc: ctx.fnc, domaineName: ctx.domaineName, prestName: ctx.prestName, dateDue: ctx.dateDue,
        showSection2: false, showSection3: true, forWord: fmt === 'word'
    });
    if (fmt === 'word') {
        _execDownloadAsWord(html, `Fiche_Suivi_${ctx.fnc.reference || ctx.fnc.id}.doc`);
    } else {
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    }
}

function _buildFicheHTML(aac, opts) {
    const { title, fnc, domaineName, prestName, dateDue, showSection2, showSection3, forWord } = opts;
    const dateOuv = fnc.date_ouverture || (fnc.date_creation ? fnc.date_creation.slice(0,10) : '-');
    const ref = fnc.reference || '-';
    const desc = fnc.description || fnc.titre || '-';
    const refRegl = fnc.ref_reglementaires || fnc.exigence_ref || '-';
    const criticite = fnc.criticite || fnc.gravite || '-';
    const delai = fnc.delai_solde || fnc.delai_correction || '-';
    // Cellules vides : hauteur ~5 lignes (≈ 5em). Cellule simple (1 ligne) pour les dates.
    const tallEmpty = '<td style="height:5em;">&nbsp;</td>';
    const shortEmpty = '<td>&nbsp;</td>';
    const printScript = forWord ? '' : `<script>window.onload=()=>{setTimeout(()=>window.print(),400)};<\/script>`;
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${_esc(title)} — ${_esc(ref)}</title>
    <style>
        body{font-family:Arial,sans-serif;max-width:800px;margin:1.5rem auto;padding:1rem;color:#111;font-size:0.85rem;}
        h1{font-size:1.15rem;text-align:center;margin:0.5rem 0 1rem;border-bottom:2px solid #333;padding-bottom:0.4rem;}
        .section{margin-top:1rem;padding:0.6rem 0.8rem;border:1px solid #ccc;border-radius:6px;}
        .section-title{font-weight:700;font-size:0.95rem;margin-bottom:0.5rem;color:#333;border-bottom:1px solid #ddd;padding-bottom:0.25rem;}
        .field{margin:0.35rem 0;font-size:0.82rem;}
        .field-label{font-weight:600;color:#555;display:inline-block;min-width:160px;}
        table{width:100%;border-collapse:collapse;font-size:0.78rem;margin-top:0.5rem;}
        th,td{border:1px solid #999;padding:0.35rem 0.5rem;text-align:left;vertical-align:top;}
        th{background:#f3f4f6;font-weight:600;}
        @media print{body{margin:0.5cm;}}
    </style></head><body>
    <h1>${_esc(title)}</h1>

    <div class="section">
        <div class="section-title">1. ${te('rappel_constatation') || 'Rappel de la Constatation'}</div>
        <div class="field"><span class="field-label">${te('reference')} :</span> ${_esc(ref)}</div>
        <div class="field"><span class="field-label">${te('domaine_label') || 'Domaine'} :</span> ${_esc(domaineName)}</div>
        <div class="field"><span class="field-label">${te('provider') || 'Prestataire'} :</span> ${_esc(prestName)}</div>
        <div class="field"><span class="field-label">${te('criticite_label') || 'Criticité'} :</span> ${_esc(criticite)}</div>
        <div class="field"><span class="field-label">${te('date_ouverture') || "Date d'ouverture"} :</span> ${dateOuv}</div>
        <div class="field"><span class="field-label">${te('delai_label') || 'Délai'} :</span> ${_esc(delai)} ${te('jours') || 'jours'}</div>
        <div class="field"><span class="field-label">${te('date_due_label') || 'Due Date'} :</span> ${dateDue || '-'}</div>
        <div class="field"><span class="field-label">${te('description_constatation') || 'Description'} :</span> ${_esc(desc)}</div>
        <div class="field"><span class="field-label">${te('ref_reglementaires_label') || 'Référentiel(s)'} :</span> ${_esc(refRegl)}</div>
    </div>

    ${showSection2 ? `
    <div class="section">
        <div class="section-title">2. ${te('plan_actions_correctives') || "Plan d'Actions Correctives"}</div>
        <table>
            <tr><th style="width:30%;">${te('item_cause') || 'Cause Primaire'}</th>${tallEmpty}</tr>
            <tr><th>${te('item_action_curative') || 'Action Curative'}</th>${tallEmpty}</tr>
            <tr><th>${te('item_date_curative') || 'Date prévue (Curative)'}</th>${shortEmpty}</tr>
            <tr><th>${te('item_preuves_curative') || 'Preuves (Curative)'}</th>${tallEmpty}</tr>
            <tr><th>${te('item_action_corrective') || 'Action Corrective'}</th>${tallEmpty}</tr>
            <tr><th>${te('item_date_corrective') || 'Date prévue (Corrective)'}</th>${shortEmpty}</tr>
            <tr><th>${te('item_preuves_corrective') || 'Preuves (Corrective)'}</th>${tallEmpty}</tr>
        </table>
    </div>` : ''}

    ${showSection3 ? `
    <div class="section">
        <div class="section-title">3. ${te('evaluation_suivi_aac') || 'Évaluation et Suivi (AAC)'}</div>
        <table>
            <tr><th style="width:30%;">${te('pac_accepte') || 'PAC accepté'}</th>${shortEmpty}</tr>
            <tr><th>${te('date_acceptation') || 'Date acceptation'}</th>${shortEmpty}</tr>
            <tr><th>${te('isolement_realise') || 'Isolement réalisé'}</th>${shortEmpty}</tr>
            <tr><th>${te('risques_traites') || 'Risques traités'}</th>${shortEmpty}</tr>
            <tr><th>${te('commentaire_efficacite') || "Commentaire d'efficacité"}</th>${shortEmpty}</tr>
            <tr><th>${te('preuves_mise_oeuvre') || 'Preuves de mise en oeuvre'}</th>${shortEmpty}</tr>
            <tr><th>${te('mise_oeuvre_effective') || 'Mise en oeuvre effective'}</th>${shortEmpty}</tr>
            <tr><th>${te('date_solde') || 'Date de solde'}</th>${shortEmpty}</tr>
            <tr><th>${te('solde_par') || 'Soldé par'}</th>${shortEmpty}</tr>
        </table>
    </div>` : ''}

    ${printScript}
    </body></html>`;
}

// Trigger Word (.doc) download from HTML content
function _execDownloadAsWord(html, filename) {
    const wordHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' + html.replace(/^<!DOCTYPE[^>]*>/i, '').replace(/^<html[^>]*>/i, '') ;
    const blob = new Blob(['﻿', wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

async function execPreviewRapport(rapportId) {
    let rapport;
    try {
        rapport = await api(`${EXEC_MODULE_API}/rapports/${rapportId}`);
    } catch (e) {
        console.error('Load rapport error:', e);
        return;
    }
    if (!rapport) return;
    EXEC_STATE.selectedRapport = rapport;

    const aac = EXEC_STATE.data.aac || {};
    const dossier = EXEC_STATE.selectedDossier || {};
    const dossierId = dossier.id || '';
    const canComment = _execCanValidate() && rapport.statut === 'soumis';
    const existingComments = rapport.commentaires_apercu || '';

    const previewHtml = `
    <div class="official-doc-form">
        <div class="official-doc-page">
            <div class="doc-header">
                <div class="doc-header-left">
                    ${_esc(aac.pays || 'REPUBLIQUE')}<br>
                    ${_esc(aac.designation || 'Autorite Aeronautique Civile')}
                </div>
                <div class="doc-header-right">${_esc(rapport.reference || '')}</div>
            </div>
            <div class="doc-title">RAPPORT DE SURVEILLANCE</div>
            <div class="doc-ref">${_esc(rapport.notification_ref || '')}</div>

            <div class="doc-section-title">1. INTRODUCTION</div>
            <p><strong>Objet :</strong> ${_esc(dossier.objet_activite || '-')}</p>
            <p><strong>Date d'exécution :</strong> ${_esc(dossier.dates_activite || '-')}</p>
            <p><strong>Équipe :</strong> ${_esc(dossier.equipe_inspection || '-')}</p>
            <p><strong>Aspects couverts :</strong> ${_esc(dossier.aspects_couverts || '-')}</p>
            <p><strong>Référentiel :</strong> ${_esc(dossier.referentiel || '-')}</p>

            <div class="doc-section-title">2. SYNTHÈSE ET RECOMMANDATIONS</div>
            <p><strong>Points forts :</strong> ${_esc(dossier.synthese_points_forts || '-')}</p>
            <p><strong>Points faibles :</strong> ${_esc(dossier.synthese_points_faibles || '-')}</p>
            <p><strong>Opportunités d'amélioration :</strong> ${_esc(dossier.opportunites_amelioration || '-')}</p>
            <p><strong>Résumé global :</strong> ${_esc(dossier.resume_global_constatations || '-')}</p>

            <div class="doc-section-title">3. CONSTATATIONS</div>
            ${(dossier.constatations || []).length === 0 ? '<p>-</p>' : (dossier.constatations || []).map(c => `
                <p><strong>${_esc(c.reference || '')}</strong> (${_esc(c.criticite || '')}) - ${_esc(c.description || '')}</p>
            `).join('')}

            <div class="doc-section-title">4. CONCLUSION</div>
            <p>${_esc(dossier.conclusion || '-')}</p>
        </div>
    </div>`;

    const bodyHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start;">
        <div style="position:sticky;top:0;">
            <h4 style="margin-bottom:0.5rem;">Commentaires sur le rapport</h4>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">Rapport : <strong>${_esc(rapport.reference || '')}</strong> (v${rapport.version || 1}) — ${_execStatusBadge(rapport.statut)}</p>
            <textarea id="apercu_commentaires" class="form-input" rows="18" style="resize:vertical;width:100%;${!canComment ? 'background:var(--bg);' : ''}" placeholder="${canComment ? 'Saisir vos observations...' : ''}" ${canComment ? '' : 'readonly'}>${_esc(existingComments)}</textarea>
            ${canComment ? `<button class="btn btn-primary btn-sm" style="margin-top:0.5rem;" onclick="execSaveApercuComments('${rapportId}')">${EXEC_ICONS.clipboard} Enregistrer les observations</button>` : ''}
        </div>
        <div style="border-left:1px solid var(--border);padding-left:1rem;max-height:80vh;overflow-y:auto;">
            <h4 style="margin-bottom:0.5rem;">Prévisualisation</h4>
            ${previewHtml}
        </div>
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execBackToValidation('${dossierId}')">${EXEC_ICONS.back} Retour</button>
        <button class="btn btn-primary btn-sm" onclick="window.print()" title="Exporter PDF">${EXEC_ICONS.pdf} Exporter PDF</button>
    `;

    execShowSlider(`${EXEC_ICONS.rapports} ${te('apercu')}`, bodyHtml, footerHtml, 'max');
}

function execBackToValidation(dossierId) {
    if (dossierId) {
        EXEC_STATE.dossierStep = 'validation';
        execOpenDossierSlider(dossierId, 'validation');
    } else {
        execCloseSlider();
    }
}

async function execSaveApercuComments(rapportId) {
    const ta = document.getElementById('apercu_commentaires');
    if (!ta) return;
    try {
        await api(`${EXEC_MODULE_API}/rapports/${rapportId}/apercu-comments`, {
            method: 'PUT', body: JSON.stringify({ commentaires: ta.value })
        });
        _execToast('Observations enregistrées', 'success');
    } catch (e) {
        console.error('Save apercu error:', e);
        _execToast('Erreur lors de l\'enregistrement', 'error');
    }
}




// ══════════════════════════════════════
//  MES UTILISATEURS (prestataire-scoped)
//  Accessible uniquement aux utilisateurs M3_Prestataire.
//  Les utilisateurs créés ici sont rattachés au même prestataire
//  et ont uniquement rôle M3_Prestataire.
// ══════════════════════════════════════

// Comptes de l'organisme, plus les rôles et droits que l'administrateur peut
// confier — la route les décrit, l'écran n'en fixe aucun en dur.
let _mesUtilisateursCache = [];
let _mesRolesCache = [];
let _mesDroitsCache = [];

function execRenderMesUtilisateurs() {
    if (!_execIsPrestataire()) {
        return `<div class="page-content"><div class="text-center">${te('no_data')}</div></div>`;
    }
    const title = te('mes_utilisateurs') || 'Mes Utilisateurs';
    const newLabel = 'Nouvel utilisateur';
    const searchPh = 'Rechercher';
    return `
    <div class="page-content">
        <div class="portal-page-header" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
            <h2 style="margin:0;">${_esc(title)}</h2>
            <div class="portal-page-actions" style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" class="shell-input" id="mesUsersSearch" placeholder="${_esc(searchPh)}" oninput="_pesSearchInput(this, execRenderMesUsersTable)" style="min-width:200px;">
                <button class="shell-btn shell-btn-primary" onclick="execOpenMesUserModal()">${EXEC_ICONS.add || '+'} ${_esc(newLabel)}</button>
            </div>
        </div>
        <div id="mesUsersTable"><div class="loading-spinner"></div></div>
    </div>`;
}

async function execLoadMesUtilisateurs() {
    try {
        const r = await api(`${EXEC_MODULE_API}/mes-utilisateurs`);
        _mesUtilisateursCache = Array.isArray(r) ? r : (r.utilisateurs || []);
        _mesRolesCache = (r && r.roles) || [];
        _mesDroitsCache = (r && r.droits) || [];
        execRenderMesUsersTable();
    } catch (e) {
        console.error('Mes utilisateurs load error:', e);
        const el = document.getElementById('mesUsersTable');
        if (el) el.innerHTML = `<div class="text-center" style="color:var(--danger);">${e.message || 'Erreur'}</div>`;
    }
}

function execRenderMesUsersTable() {
    const el = document.getElementById('mesUsersTable');
    if (!el) return;
    const searchVal = (document.getElementById('mesUsersSearch')?.value || '').toLowerCase();
    const users = _mesUtilisateursCache.filter(u => !searchVal
        || (u.nom_utilisateur || u.nom || '').toLowerCase().includes(searchVal)
        || (u.nom || '').toLowerCase().includes(searchVal)
        || (u.prenom || '').toLowerCase().includes(searchVal)
        || (u.email || '').toLowerCase().includes(searchVal));

    // Intitulés de colonnes : ce que chacune contient réellement.
    const L = {
        identifiant: 'Identifiant',
        nom: 'Nom',
        prenom: 'Prénom',
        email: 'Courriel',
        motDePasse: 'Mot de passe',
        role: 'Rôle',
        droits: 'Droits confiés',
        statut: 'Statut',
        actions: 'Actions',
        actif: 'Actif',
        inactif: 'Inactif',
        editer: 'Modifier',
        reinitialiser: 'Réinitialiser le mot de passe',
        desactiver: 'Désactiver le compte',
        activer: 'Activer le compte',
        voir: 'Voir le mot de passe temporaire',
    };

    if (!users.length) {
        el.innerHTML = `<div class="text-center" style="padding:2rem;color:var(--text-muted);">${te('no_data') || 'Aucun utilisateur'}</div>`;
        return;
    }

    const libelleRole = (cle) => {
        const r = _mesRolesCache.find(x => x.cle === cle);
        return r ? r.libelle : (cle || '').replace('M3_', '');
    };
    const libelleDroit = (cle) => {
        const d = _mesDroitsCache.find(x => x.cle === cle);
        return d ? d.libelle : cle;
    };

    el.innerHTML = `<div class="card"><div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
      <table class="exec-data-table exec-compact-table exec-etats-table"
        style="font-size:0.8rem;table-layout:fixed;min-width:1020px;">
        <thead><tr>
            <th style="width:150px;">${L.identifiant}</th>
            <th style="width:110px;">${L.nom}</th>
            <th style="width:110px;">${L.prenom}</th>
            <th style="width:180px;">${L.email}</th>
            <th style="width:110px;">${L.motDePasse}</th>
            <th style="width:150px;">${L.role}</th>
            <th style="width:120px;">${L.droits}</th>
            <th style="width:80px;">${L.statut}</th>
            <th style="width:110px;text-align:center;">${L.actions}</th>
        </tr></thead>
        <tbody>${users.map(u => {
            const actif = u.actif !== false && u.actif !== 0;
            const droits = u.droits || [];
            return `<tr class="${!actif ? 'row-inactive' : ''}">
                <td><strong>${_esc(u.nom_utilisateur || u.username || '')}</strong></td>
                <td>${_esc(u.nom || '')}</td>
                <td>${_esc(u.prenom || '')}</td>
                <td>${_esc(u.email || '')}</td>
                <td>
                    <span id="mes-pw-mask-${u.id}" style="font-family:monospace;letter-spacing:2px;">••••••••</span>
                    <span id="mes-pw-clear-${u.id}" style="display:none;font-family:monospace;font-weight:600;color:var(--primary);"></span>
                    ${u.has_temp_password ? `<button class="shell-btn-icon" onclick="execRevealMesUserPassword('${u.id}')" title="${L.voir}">${EXEC_ICONS.eye}</button>` : ''}
                </td>
                <td><span class="shell-badge badge-active">${_esc(libelleRole(u.role))}</span></td>
                <td title="${_esc(droits.map(libelleDroit).join(', '))}">
                    ${droits.length === _mesDroitsCache.length
                        ? '<span class="exec-statut-etape">Tous</span>'
                        : (droits.length
                            ? `<span class="exec-statut-etape">${droits.length} sur ${_mesDroitsCache.length}</span>`
                            : '<span class="exec-statut-etape arrete">Aucun</span>')}
                </td>
                <td><span class="shell-badge ${actif ? 'badge-active' : 'badge-inactive'}">${actif ? L.actif : L.inactif}</span></td>
                <td class="exec-etats-actions">
                    <button class="shell-btn-icon" onclick="execOpenMesUserModal('${u.id}')" title="${L.editer}">${EXEC_ICONS.edit}</button>
                    <button class="shell-btn-icon" onclick="execResetMesUserPw('${u.id}')" title="${L.reinitialiser}">${EXEC_ICONS.reset || EXEC_ICONS.sync}</button>
                    <button class="shell-btn-icon" onclick="execToggleMesUser('${u.id}', ${actif ? 'false' : 'true'})"
                        title="${actif ? L.desactiver : L.activer}">${actif ? EXEC_ICONS.x || EXEC_ICONS.close : EXEC_ICONS.check}</button>
                </td>
            </tr>`;
        }).join('')}</tbody>
      </table>
    </div></div>`;
}

function execOpenMesUserModal(userId) {
    const user = userId ? _mesUtilisateursCache.find(u => u.id === userId) : null;
    const titre = userId ? 'Modifier l’utilisateur' : 'Nouvel utilisateur';
    const droitsCoches = user ? (user.droits || []) : _mesDroitsCache.map(d => d.cle);
    const roleCourant = (user && user.role) || 'PRESTATAIRE';

    const roles = _mesRolesCache.length ? _mesRolesCache : [
        { cle: 'ADMIN_PRESTATAIRE', libelle: 'Administrateur du prestataire', aide: '' },
        { cle: 'PRESTATAIRE', libelle: 'Utilisateur du prestataire', aide: '' },
    ];

    const body = `
        <div class="shell-form-row">
            <div class="shell-form-group"><label>Identifiant</label>
                <input id="muNomUtilisateur" class="shell-input" value="${_esc(user?.nom_utilisateur || user?.username || '')}"
                    ${userId ? 'readonly disabled style="background:var(--surface-2,#f4f4f5);cursor:not-allowed;"' : ''}>
            </div>
            <div class="shell-form-group"><label>Courriel</label>
                <input id="muEmail" class="shell-input" type="email" value="${_esc(user?.email || '')}">
            </div>
        </div>
        <div class="shell-form-row">
            <div class="shell-form-group"><label>Nom</label>
                <input id="muNom" class="shell-input" value="${_esc(user?.nom || '')}">
            </div>
            <div class="shell-form-group"><label>Prénom</label>
                <input id="muPrenom" class="shell-input" value="${_esc(user?.prenom || '')}">
            </div>
        </div>
        <div class="shell-form-row">
            <div class="shell-form-group"><label>Statut</label>
                <select id="muActif" class="shell-input">
                    <option value="true" ${user?.actif !== false && user?.actif !== 0 ? 'selected' : ''}>Actif</option>
                    <option value="false" ${user?.actif === false || user?.actif === 0 ? 'selected' : ''}>Inactif</option>
                </select>
            </div>
            <div class="shell-form-group"><label>Rôle</label>
                <select id="muRole" class="shell-input">
                    ${roles.map(r => `<option value="${r.cle}" ${r.cle === roleCourant ? 'selected' : ''}>${_esc(r.libelle)}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="shell-form-group">
            <label>Droits confiés</label>
            <div class="exec-droits-liste">
                ${_mesDroitsCache.map(d => `
                    <label class="exec-droit">
                        <input type="checkbox" class="mu-droit" value="${d.cle}" ${droitsCoches.includes(d.cle) ? 'checked' : ''}>
                        <span><strong>${_esc(d.libelle)}</strong><em>${_esc(d.aide || '')}</em></span>
                    </label>`).join('')}
            </div>
        </div>
    `;
    const footer = `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveMesUser('${userId || ''}')">Enregistrer</button>
    `;
    shellShowModal(titre, body, footer);
}

// Désactiver un compte plutôt que le supprimer : l'historique reste lisible.
async function execToggleMesUser(userId, actif) {
    try {
        await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}`, {
            method: 'PUT', body: JSON.stringify({ actif }),
        });
        shellShowToast(actif ? 'Compte activé' : 'Compte désactivé', 'success');
        await execLoadMesUtilisateurs();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

async function execSaveMesUser(userId) {
    const data = {
        nom_utilisateur: document.getElementById('muNomUtilisateur')?.value.trim() || '',
        email: document.getElementById('muEmail')?.value.trim() || '',
        nom: document.getElementById('muNom')?.value.trim() || '',
        prenom: document.getElementById('muPrenom')?.value.trim() || '',
        actif: document.getElementById('muActif')?.value === 'true',
        role: document.getElementById('muRole')?.value || 'PRESTATAIRE',
        droits: [...document.querySelectorAll('.mu-droit:checked')].map(c => c.value),
    };
    if (!data.nom_utilisateur || !data.email) {
        shellShowToast((typeof pt === 'function' ? pt('required_field') : 'Champs obligatoires manquants'), 'error');
        return;
    }
    try {
        if (userId) {
            await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}`, {
                method: 'PUT', body: JSON.stringify(data)
            });
        } else {
            const res = await api(`${EXEC_MODULE_API}/mes-utilisateurs`, {
                method: 'POST', body: JSON.stringify(data)
            });
            if (res.temp_password) {
                shellShowToast(`${(typeof pt === 'function' ? pt('password_gen') : 'Mot de passe')}: ${res.temp_password}`, 'warning');
            }
        }
        shellCloseModal();
        await execLoadMesUtilisateurs();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

async function execResetMesUserPw(userId) {
    if (!confirm((typeof pt === 'function' ? pt('confirm_action') : 'Confirmer ?'))) return;
    try {
        const res = await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}/reset-password`, { method: 'POST' });
        shellShowToast(`${(typeof pt === 'function' ? pt('password_gen') : 'Mot de passe')}: ${res.new_password}`, 'warning');
        const user = _mesUtilisateursCache.find(u => u.id === userId);
        if (user?.email) {
            const subject = encodeURIComponent('Réinitialisation de mot de passe - PESSCO');
            const body = encodeURIComponent(`Bonjour,\n\nVotre mot de passe a été réinitialisé.\n\nNom d'utilisateur : ${user.email}\nNouveau mot de passe : ${res.new_password}\n\nVeuillez changer votre mot de passe lors de votre prochaine connexion.\n\nCordialement`);
            window.location.href = `mailto:${user.email}?subject=${subject}&body=${body}`;
        }
        await execLoadMesUtilisateurs();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}


function execRevealMesUserPassword(userId) {
    const L = {
        title: (typeof pt === 'function' ? pt('confirm_admin_password') : 'Confirmer mot de passe'),
        pw: (typeof pt === 'function' ? pt('password') : 'Mot de passe'),
        cancel: (typeof pt === 'function' ? pt('cancel') : 'Annuler'),
        confirm: (typeof pt === 'function' ? pt('confirm_password_label') : 'Confirmer')
    };
    shellShowModal(L.title, `
        <div class="shell-form-group">
            <label>${L.pw}</label>
            <input type="password" id="mesAdminPwConfirm" class="shell-input" placeholder="${L.pw}">
        </div>
    `, `<button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">${L.cancel}</button>
        <button class="shell-btn shell-btn-primary" onclick="execDoRevealMesUserPassword('${userId}')">${L.confirm}</button>`);
    setTimeout(() => document.getElementById('mesAdminPwConfirm')?.focus(), 200);
}

async function execDoRevealMesUserPassword(userId) {
    const adminPw = document.getElementById('mesAdminPwConfirm')?.value || '';
    if (!adminPw) { shellShowToast((typeof pt === 'function' ? pt('required_field') : 'Requis'), 'error'); return; }
    try {
        const res = await api(`${EXEC_MODULE_API}/mes-utilisateurs/${userId}/reveal-password`, {
            method: 'POST', body: JSON.stringify({ admin_password: adminPw })
        });
        shellCloseModal();
        const maskEl = document.getElementById(`mes-pw-mask-${userId}`);
        const clearEl = document.getElementById(`mes-pw-clear-${userId}`);
        if (maskEl && clearEl && res.temp_password) {
            maskEl.style.display = 'none';
            clearEl.textContent = res.temp_password;
            clearEl.style.display = 'inline';
            setTimeout(() => {
                maskEl.style.display = 'inline';
                clearEl.style.display = 'none';
                clearEl.textContent = '';
            }, 10000);
        }
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}



// ══════════════════════════════════════
//  Paramètres M3 : Niveau de constatations + Types de cas
// ══════════════════════════════════════

function execRenderParametres() {
    if (!window._execParamSub) window._execParamSub = 'constatations';
    const sub = window._execParamSub;
    // Compteurs sur chaque onglet (à l'image des onglets de la page Déclenchement)
    const counts = {
        constatations: (EXEC_STATE.data.criticites || []).length + (EXEC_STATE.data.typesCas || []).length,
        checklists: (EXEC_STATE.data.checklists || []).length
    };
    const tabs = `<div class="exec-workflow-tabs">
        <button class="exec-tab ${sub==='constatations'?'active':''}" onclick="window._execParamSub='constatations';execRenderPage();">
            Constatations <span class="exec-tab-badge">${counts.constatations}</span>
        </button>
        <button class="exec-tab ${sub==='checklists'?'active':''}" onclick="window._execParamSub='checklists';execRenderPage();">
            Checklists <span class="exec-tab-badge">${counts.checklists}</span>
        </button>
        <button class="exec-tab ${sub==='delais'?'active':''}" onclick="window._execParamSub='delais';execRenderPage();">
            Délais
        </button>
        <button class="exec-tab ${sub==='autres'?'active':''}" onclick="window._execParamSub='autres';execRenderPage();">
            Autres paramètres
        </button>
    </div>`;
    const compactCss = `<style>
        .exec-params-compact .exec-table { font-size: 0.78rem; }
        .exec-params-compact .exec-table th { font-size: 0.72rem; padding: 0.35rem 0.55rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .exec-params-compact .exec-table td { padding: 0.32rem 0.55rem; }
        .exec-params-compact .card { margin-bottom: 0.75rem; }
        .exec-params-compact .card h3 { font-size: 0.86rem !important; }
    </style>`;
    const body = sub === 'checklists' ? execRenderChecklistsTab()
        : sub === 'delais' ? execRenderDelaisTab()
        : sub === 'autres' ? execRenderAutresParametresTab()
        : execRenderConstatationsTab();
    return `<div class="page-content exec-params-compact">
        ${compactCss}
        <div class="page-header"><h2>${te('parametres')}</h2></div>
        ${tabs}
        ${body}
    </div>`;
}

function execRenderConstatationsTab() {
    const crits = EXEC_STATE.data.criticites || [];
    const tcs   = EXEC_STATE.data.typesCas || [];
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const addBtn = (onclick, label) => isAdmin
        ? `<button class="btn btn-sm btn-primary" onclick="${onclick}" style="display:inline-flex;align-items:center;gap:0.3rem;">
               ${EXEC_ICONS.add} ${label}
           </button>`
        : '';

    // ── Table 1 : Niveau de constatations
    const critRows = crits.length
        ? crits.map(c => `
            <tr>
                <td><strong>${_esc(c.item)}</strong></td>
                <td>${c.alias ? _esc(c.alias) : '<span style="color:var(--text-muted);">—</span>'}</td>
                <td style="text-align:center;">${c.niveau}</td>
                <td style="text-align:center;">${c.delai_cloture} ${te('days') || 'jours'}</td>
                <td style="text-align:right;white-space:nowrap;">
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-ghost" title="${te('edit') || 'Modifier'}" onclick="execOpenCriticiteModal('${c.id}')">${EXEC_ICONS.edit}</button>
                        <button class="btn btn-sm btn-ghost" title="${te('delete') || 'Supprimer'}" onclick="execDeleteCriticite('${c.id}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
                    ` : ''}
                </td>
            </tr>`).join('')
        : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data') || 'Aucune donnée'}</td></tr>`;

    // ── Table 2 : Types de cas
    const tcRows = tcs.length
        ? tcs.map(t => `
            <tr>
                <td><strong>${_esc(t.item)}</strong></td>
                <td>${_esc(t.description || '')}</td>
                <td style="text-align:right;white-space:nowrap;">
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-ghost" title="${te('edit') || 'Modifier'}" onclick="execOpenTypeCasModal('${t.id}')">${EXEC_ICONS.edit}</button>
                        <button class="btn btn-sm btn-ghost" title="${te('delete') || 'Supprimer'}" onclick="execDeleteTypeCas('${t.id}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
                    ` : ''}
                </td>
            </tr>`).join('')
        : `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('no_data') || 'Aucune donnée'}</td></tr>`;

    return `
        <div class="card" style="margin-bottom:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
                <h3 style="margin:0;font-size:0.9rem;">${te('niveau_constatations')}</h3>
                ${addBtn('execOpenCriticiteModal()', 'Ajouter')}
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>${te('item')}</th>
                            <th>Alias</th>
                            <th style="text-align:center;">${te('niveau')}</th>
                            <th style="text-align:center;">${te('delai_cloture')}</th>
                            <th style="text-align:right;width:90px;"></th>
                        </tr>
                    </thead>
                    <tbody>${critRows}</tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
                <h3 style="margin:0;font-size:0.9rem;">${te('types_cas')}</h3>
                ${addBtn('execOpenTypeCasModal()', 'Ajouter')}
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>${te('item')}</th>
                            <th>${te('description') || 'Description'}</th>
                            <th style="text-align:right;width:90px;"></th>
                        </tr>
                    </thead>
                    <tbody>${tcRows}</tbody>
                </table>
            </div>
        </div>`;
}

// ══════════════════════════════════════
//  Paramètres M3 : Checklists
// ══════════════════════════════════════

function _execCl_data() {
    return {
        checklists: EXEC_STATE.data.checklists || [],
        items: EXEC_STATE.data.checklistItems || [],
        statuts: EXEC_STATE.data.checklistStatuts || [],
        sousThemes: EXEC_STATE.data.checklistSousThemes || []
    };
}

function execRenderChecklistsTab() {
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const D = _execCl_data();
    const checklists = D.checklists.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const domaines = (window.PESSCO?.sharedData?.domaines) || [];

    const rowsHtml = checklists.length ? checklists.map(c => {
        const doms = _parse(c.domaines_ids).map(id => (domaines.find(d => d.id === id)?.code || '')).filter(Boolean).join(', ') || '-';
        const itemsCount = D.items.filter(i => i.checklist_id === c.id).length;
        return `<tr>
            <td><span style="font-family:ui-monospace,Menlo,monospace;font-weight:600;">${_esc2(c.reference || '-')}</span></td>
            <td><strong>${_esc2(c.nom)}</strong></td>
            <td>${_esc2((c.description || '').slice(0, 80))}${(c.description||'').length>80?'…':''}</td>
            <td>${doms}</td>
            <td style="text-align:center;">${itemsCount}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-sm btn-ghost" onclick="execOpenChecklistEditor('${c.id}')" style="display:inline-flex;align-items:center;gap:0.25rem;">${EXEC_ICONS.view || EXEC_ICONS.edit} Items</button>
                ${isAdmin ? `<button class="btn btn-sm btn-ghost" onclick="execOpenChecklistModal('${c.id}')" style="display:inline-flex;align-items:center;gap:0.25rem;">${EXEC_ICONS.edit} Modifier</button>
                <button class="btn btn-sm btn-ghost" onclick="execDeleteChecklist('${c.id}')" style="color:#ef4444;display:inline-flex;align-items:center;gap:0.25rem;">${EXEC_ICONS.delete} Supprimer</button>` : ''}
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1rem;">Aucune checklist.</td></tr>`;

    return `
        <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
                <h3 style="margin:0;font-size:0.9rem;">Checklists</h3>
                <div style="display:flex;gap:0.4rem;">
                    ${isAdmin ? `<button class="btn btn-sm btn-outline" onclick="execOpenStatutsManager()">⚙ Statuts d'évaluation</button>` : ''}
                    ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="execOpenChecklistModal()">${EXEC_ICONS.add} Ajouter</button>` : ''}
                </div>
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table" style="width:100%;">
                    <thead><tr>
                        <th style="width:110px;">Réf.</th>
                        <th>Nom</th><th>Description</th><th>Domaines</th>
                        <th style="text-align:center;width:70px;">Items</th>
                        <th style="text-align:right;width:280px;">Actions</th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>`;
}

// ── Modal Checklist (entête) ──
function execOpenChecklistModal(clId) {
    const D = _execCl_data();
    const item = clId ? D.checklists.find(c => c.id === clId) : null;
    const shared = window.PESSCO?.sharedData || {};
    const domaines = shared.domaines || [];
    const secteurs = shared.secteurs || [];
    const sousActivites = shared.sousActivites || [];
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const selDom = _parse(item?.domaines_ids);
    const selSec = _parse(item?.secteurs_ids);
    const selSa  = _parse(item?.sous_activites_ids);
    // Une case par cellule de grille (5 colonnes), alignée à gauche, libellé = sigle/code.
    const checkbox = (id, arr, lbl, cls) => `<label style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;text-align:left;white-space:nowrap;">
        <input type="checkbox" class="${cls}" value="${id}" ${arr.includes(id)?'checked':''}>
        <span>${lbl}</span>
    </label>`;
    // 5 colonnes auto-largeur, packées à gauche (justify-content:start) — chaque case juste assez large pour son sigle.
    const boxStyle = 'display:grid;grid-template-columns:repeat(5, max-content);justify-content:start;gap:0.25rem 1.4rem;max-height:160px;overflow:auto;border:1px solid var(--border);border-radius:4px;padding:0.45rem 0.6rem;';
    // Pré-stocke les listes pour les refresh dynamiques sans refaire de fetch.
    window._clModalCtx = { domaines, secteurs, sousActivites, item };
    shellShowModal((item ? 'Modifier' : 'Ajouter') + ' — Checklist', `
        <div class="shell-form-row" style="display:grid;grid-template-columns:140px 1fr;gap:0.6rem;">
            <div class="shell-form-group">
                <label>Réf.</label>
                <input id="clRef" class="shell-input" value="${(item?.reference || '').replace(/"/g, '&quot;')}" placeholder="ex. CHK-001">
            </div>
            <div class="shell-form-group">
                <label>Nom *</label>
                <input id="clNom" class="shell-input" value="${(item?.nom || '').replace(/"/g, '&quot;')}" placeholder="Nom de la checklist">
            </div>
        </div>
        <div class="shell-form-group">
            <label>Description</label>
            <textarea id="clDesc" class="shell-input" rows="2">${item?.description || ''}</textarea>
        </div>
        <div class="shell-form-group">
            <label>Domaines applicables</label>
            <div id="clDomsBox" style="${boxStyle}" onchange="_clRefreshSecteurs()">
                ${domaines.map(d => checkbox(d.id, selDom, (d.code || d.sigle || d.nom || '?'), 'cl-doms-cb')).join('') || '<span style="color:var(--text-muted);font-size:0.75rem;">Aucun domaine</span>'}
            </div>
        </div>
        <div class="shell-form-group">
            <label>Secteurs applicables <span id="clSecsHint" style="color:var(--text-muted);font-size:0.7rem;font-weight:400;"></span></label>
            <div id="clSecsBox" style="${boxStyle}" onchange="_clRefreshSousActivites()"></div>
        </div>
        <div class="shell-form-group">
            <label>Sous-activités applicables <span id="clSasHint" style="color:var(--text-muted);font-size:0.7rem;font-weight:400;"></span></label>
            <div id="clSasBox" style="${boxStyle}"></div>
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveChecklist('${clId || ''}')">Enregistrer</button>
    `);
    // Initialisation des deux listes dépendantes après l'ouverture du modal
    setTimeout(() => _clRefreshSecteurs(), 0);
}

// Refresh dynamique des listes selon les sélections en cascade
//   Domaines  → Secteurs (filtre par domaine_id)
//   Secteurs  → Sous-activités (filtre par secteur_id)
function _clRefreshSecteurs() {
    const ctx = window._clModalCtx; if (!ctx) return;
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const initSec = _parse(ctx.item?.secteurs_ids);
    const selDom = Array.from(document.querySelectorAll('.cl-doms-cb')).filter(c => c.checked).map(c => c.value);
    // Préserve les coches déjà visibles
    const prevChecked = new Set(Array.from(document.querySelectorAll('.cl-secs-cb')).filter(c => c.checked).map(c => c.value));
    const checkedSec = (prevChecked.size || document.querySelector('.cl-secs-cb')) ? prevChecked : new Set(initSec);
    const filtered = selDom.length
        ? ctx.secteurs.filter(s => selDom.includes(s.domaine_id))
        : ctx.secteurs;
    const box = document.getElementById('clSecsBox'); if (!box) return;
    box.innerHTML = filtered.length
        ? filtered.map(s => `<label style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;white-space:nowrap;">
            <input type="checkbox" class="cl-secs-cb" value="${s.id}" ${checkedSec.has(s.id)?'checked':''}>
            <span>${s.code || s.sigle || s.nom || '?'}</span>
        </label>`).join('')
        : `<span style="color:var(--text-muted);font-size:0.75rem;grid-column:1/-1;">${selDom.length?'Aucun secteur pour les domaines sélectionnés':'Sélectionnez un domaine'}</span>`;
    const hint = document.getElementById('clSecsHint');
    if (hint) hint.textContent = selDom.length ? `(${filtered.length} disponible${filtered.length>1?'s':''})` : '';
    _clRefreshSousActivites();
}

function _clRefreshSousActivites() {
    const ctx = window._clModalCtx; if (!ctx) return;
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const initSa = _parse(ctx.item?.sous_activites_ids);
    const selSec = Array.from(document.querySelectorAll('.cl-secs-cb')).filter(c => c.checked).map(c => c.value);
    const prevChecked = new Set(Array.from(document.querySelectorAll('.cl-sas-cb')).filter(c => c.checked).map(c => c.value));
    const checkedSa = (prevChecked.size || document.querySelector('.cl-sas-cb')) ? prevChecked : new Set(initSa);
    const filtered = selSec.length
        ? ctx.sousActivites.filter(sa => selSec.includes(sa.secteur_id))
        : ctx.sousActivites;
    const box = document.getElementById('clSasBox'); if (!box) return;
    box.innerHTML = filtered.length
        ? filtered.map(sa => `<label style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;white-space:nowrap;">
            <input type="checkbox" class="cl-sas-cb" value="${sa.id}" ${checkedSa.has(sa.id)?'checked':''}>
            <span>${sa.code || sa.sigle || sa.nom || '?'}</span>
        </label>`).join('')
        : `<span style="color:var(--text-muted);font-size:0.75rem;grid-column:1/-1;">${selSec.length?'Aucune sous-activité pour les secteurs sélectionnés':'Sélectionnez un secteur'}</span>`;
    const hint = document.getElementById('clSasHint');
    if (hint) hint.textContent = selSec.length ? `(${filtered.length} disponible${filtered.length>1?'s':''})` : '';
}

async function execSaveChecklist(clId) {
    const collect = cls => Array.from(document.querySelectorAll('.' + cls)).filter(c => c.checked).map(c => c.value);
    const data = {
        reference: document.getElementById('clRef')?.value.trim() || '',
        nom: document.getElementById('clNom')?.value.trim() || '',
        description: document.getElementById('clDesc')?.value.trim() || '',
        domaines_ids: JSON.stringify(collect('cl-doms-cb')),
        secteurs_ids: JSON.stringify(collect('cl-secs-cb')),
        sous_activites_ids: JSON.stringify(collect('cl-sas-cb'))
    };
    if (!data.nom) { shellShowToast('Nom requis', 'error'); return; }
    try {
        if (clId) await api('/api/exec-checklists/' + clId, { method: 'PUT', body: JSON.stringify(data) });
        else      await api('/api/exec-checklists',          { method: 'POST', body: JSON.stringify(data) });
        shellCloseModal();
        await execRefreshChecklists();
        execRenderPage();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

async function execDeleteChecklist(clId) {
    if (!confirm('Supprimer cette checklist et tous ses items ?')) return;
    try {
        // Cascade : supprime items + sous-thèmes liés
        const D = _execCl_data();
        await Promise.all(D.items.filter(i => i.checklist_id === clId)
            .map(i => api('/api/exec-checklist-items/' + i.id, { method: 'DELETE' }).catch(() => {})));
        await Promise.all(D.sousThemes.filter(s => s.checklist_id === clId)
            .map(s => api('/api/exec-checklist-sous-themes/' + s.id, { method: 'DELETE' }).catch(() => {})));
        await api('/api/exec-checklists/' + clId, { method: 'DELETE' });
        await execRefreshChecklists();
        execRenderPage();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Statuts d'évaluation manager ──
function execOpenStatutsManager() {
    const D = _execCl_data();
    const rows = D.statuts.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const rowsHtml = rows.length ? rows.map(s => `<tr>
        <td>${s.libelle}</td>
        <td>${s.alias ? s.alias : '<span style="color:var(--text-muted);">—</span>'}</td>
        <td style="text-align:center;"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${s.couleur || '#9ca3af'};"></span></td>
        <td style="text-align:center;">${s.ordre || 0}</td>
        <td style="text-align:right;">
            <button class="btn btn-sm btn-ghost" onclick="execOpenStatutModal('${s.id}')">${EXEC_ICONS.edit}</button>
            <button class="btn btn-sm btn-ghost" onclick="execDeleteStatut('${s.id}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
        </td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:0.6rem;">Aucun statut défini.</td></tr>';
    shellShowModal("Statuts d'évaluation des questions", `
        <div style="margin-bottom:0.5rem;text-align:right;">
            <button class="btn btn-sm btn-primary" onclick="execOpenStatutModal()">${EXEC_ICONS.add} Ajouter un statut</button>
        </div>
        <table class="exec-table" style="width:100%;font-size:0.8rem;">
            <thead><tr><th>Libellé</th><th>Alias</th><th style="text-align:center;width:60px;">Couleur</th><th style="text-align:center;width:60px;">Ordre</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <p style="font-size:0.74rem;color:var(--text-muted);margin-top:0.4rem;">L'alias (s'il est renseigné) est la valeur affichée dans les listes déroulantes des checklists à renseigner.</p>
    `, `<button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Fermer</button>`);
}

function execOpenStatutModal(sId) {
    const D = _execCl_data();
    const s = sId ? D.statuts.find(x => x.id === sId) : null;
    const nextOrder = D.statuts.length ? Math.max(...D.statuts.map(x => x.ordre || 0)) + 1 : 1;
    shellShowModal((s ? 'Modifier' : 'Ajouter') + " — Statut d'évaluation", `
        <div class="shell-form-group">
            <label>Libellé *</label>
            <input id="stLib" class="shell-input" value="${(s?.libelle || '').replace(/"/g, '&quot;')}" placeholder="ex. Satisfaisant / Non Satisfaisant / Non Applicable">
        </div>
        <div class="shell-form-group">
            <label>Alias</label>
            <input id="stAlias" class="shell-input" value="${(s?.alias || '').replace(/"/g, '&quot;')}" placeholder="Valeur affichée dans les checklists (ex. S / NS / NA)">
        </div>
        <div class="shell-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
            <div class="shell-form-group">
                <label>Couleur</label>
                <input id="stCol" type="color" class="shell-input" value="${s?.couleur || '#3b82f6'}">
            </div>
            <div class="shell-form-group">
                <label>Ordre</label>
                <input id="stOrd" type="number" class="shell-input" value="${s?.ordre ?? nextOrder}" min="0">
            </div>
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="execOpenStatutsManager()">Retour</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveStatut('${sId || ''}')">Enregistrer</button>
    `);
}

async function execSaveStatut(sId) {
    const data = {
        libelle: document.getElementById('stLib')?.value.trim() || '',
        alias: document.getElementById('stAlias')?.value.trim() || '',
        couleur: document.getElementById('stCol')?.value || '',
        ordre: parseInt(document.getElementById('stOrd')?.value || '0', 10) || 0
    };
    if (!data.libelle) { shellShowToast('Libellé requis', 'error'); return; }
    try {
        if (sId) await api('/api/exec-checklist-statuts/' + sId, { method: 'PUT', body: JSON.stringify(data) });
        else     await api('/api/exec-checklist-statuts',         { method: 'POST', body: JSON.stringify(data) });
        await execRefreshChecklists();
        execOpenStatutsManager();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

async function execDeleteStatut(sId) {
    if (!confirm('Supprimer ce statut ?')) return;
    try {
        await api('/api/exec-checklist-statuts/' + sId, { method: 'DELETE' });
        await execRefreshChecklists();
        execOpenStatutsManager();
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Éditeur Items d'une checklist — SLICER plein largeur avec édition inline ──
function execOpenChecklistEditor(clId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    if (!cl) { shellShowToast('Checklist introuvable', 'error'); return; }
    // Ferme un éventuel slicer existant
    document.getElementById('execCliEditorWrap')?.remove();
    // Auto-rétracte la barre de menu (mémorise l'état pour le restaurer à la fermeture)
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        window._execCliEditorPrevCollapsed = wrapper ? wrapper.classList.contains('sidebar-collapsed') : false;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = true;
        if (wrapper) wrapper.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.classList.add('collapsed');
    } catch (e) {}
    const html = `
    <div id="execCliEditorWrap" class="exec-cli-slicer-wrap">
        <div class="exec-cli-slicer-overlay" onclick="execCloseChecklistEditor()"></div>
        <aside class="exec-cli-slicer" role="dialog" aria-modal="true">
            <header class="exec-cli-slicer-header">
                <div>
                    <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Checklist</div>
                    <div style="font-weight:700;font-size:1rem;">Items — ${(cl.nom || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                    <span id="execCliSaveState" style="font-size:0.75rem;color:var(--text-muted);"></span>
                    <button class="btn btn-sm btn-outline" onclick="execChecklistExportXlsx('${clId}')" title="Exporter en Excel">📥 Exporter</button>
                    <button class="btn btn-sm btn-outline" onclick="document.getElementById('execCliImportFile').click()" title="Importer depuis Excel">📤 Importer</button>
                    <input type="file" id="execCliImportFile" accept=".xlsx" style="display:none" onchange="execChecklistImportXlsx('${clId}', event)">
                    <button class="btn btn-sm btn-outline" onclick="execOpenSousThemesManager('${clId}')">📑 Sous-thèmes</button>
                    <button class="btn btn-sm btn-primary" onclick="execAddChecklistRow('${clId}')">${EXEC_ICONS.add} Ajouter une ligne</button>
                    <button class="btn btn-sm btn-ghost" onclick="execCloseChecklistEditor()" title="Fermer">✕</button>
                </div>
            </header>
            <div class="exec-cli-slicer-body" style="padding:0.75rem 1rem;">
                <div style="overflow:auto;">
                    <table id="execCliItemsTable" class="exec-cli-inline-table">
                        <thead><tr>
                            <th style="width:55px;">Ordre</th>
                            <th style="width:85px;">Réf. Item</th>
                            <th style="width:110px;">Thème</th>
                            <th style="width:130px;">Sous-thème</th>
                            <th style="width:170px;">Réf. Règlement</th>
                            <th style="min-width:320px;">Description</th>
                            <th style="min-width:320px;">Directives</th>
                            <th style="width:50px;"></th>
                        </tr></thead>
                        <tbody id="execCliItemsBody"></tbody>
                    </table>
                </div>
            </div>
        </aside>
    </div>
    <style>
        .exec-cli-slicer-wrap { position:fixed; top:var(--topbar-height, 56px); left:var(--sidebar-width, 240px); right:0; bottom:0; z-index:1100; transition:left 0.3s ease; }
        body.app-sidebar-collapsed .exec-cli-slicer-wrap { left:var(--sidebar-collapsed, 60px); }
        .exec-cli-slicer-overlay { position:absolute; inset:0; background:rgba(15,23,42,0.35); }
        .exec-cli-slicer { position:absolute; top:0; right:0; bottom:0; left:0; width:auto; max-width:100%;
            background:var(--bg, #fff); box-shadow:-8px 0 30px rgba(0,0,0,0.18);
            display:flex; flex-direction:column; animation:execCliSlideIn 0.25s ease; }
        @media (max-width: 640px) { .exec-cli-slicer-wrap { left:0; } }
        @keyframes execCliSlideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        .exec-cli-slicer-header { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-card); gap:0.5rem; flex-wrap:wrap; }
        .exec-cli-slicer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
        .exec-cli-inline-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
        .exec-cli-inline-table thead th { background:#1a365d; color:#fff; text-align:left; padding:0.45rem 0.55rem; font-weight:600; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.04em; position:sticky; top:0; z-index:1; }
        .exec-cli-inline-table tbody td { border-bottom:1px solid var(--border); padding:0.25rem 0.35rem; vertical-align:top; }
        .exec-cli-inline-table tbody tr:hover { background:rgba(59,130,246,0.04); }
        .exec-cli-inline-table input, .exec-cli-inline-table select, .exec-cli-inline-table textarea {
            width:100%; border:1px solid transparent; border-radius:4px; padding:0.25rem 0.35rem; font-size:0.76rem; background:transparent; resize:vertical; font-family:inherit;
        }
        .exec-cli-inline-table input:focus, .exec-cli-inline-table select:focus, .exec-cli-inline-table textarea:focus {
            outline:none; border-color:#3b82f6; background:#fff; box-shadow:0 0 0 2px rgba(59,130,246,0.15);
        }
        .exec-cli-inline-table textarea { min-height:32px; max-height:140px; line-height:1.3; }
        .exec-cli-inline-table .ord-input { width:50px; text-align:center; }
        .exec-cli-inline-table .ref-input { width:80px; }
        .exec-cli-inline-table .row-delete { background:transparent; border:none; cursor:pointer; color:#ef4444; font-size:0.95rem; padding:0.2rem 0.4rem; border-radius:4px; }
        .exec-cli-inline-table .row-delete:hover { background:#fee2e2; }
        .exec-cli-empty { text-align:center; color:var(--text-muted); font-style:italic; padding:1.2rem; }
    </style>`;
    document.body.insertAdjacentHTML('beforeend', html);
    _execCliRenderRows(clId);
}

function execCloseChecklistEditor() {
    document.getElementById('execCliEditorWrap')?.remove();
    // Restaure l'état antérieur de la barre de menu
    try {
        const wrapper = document.querySelector('.portal-wrapper');
        const sidebar = document.querySelector('.portal-sidebar');
        const prev = !!window._execCliEditorPrevCollapsed;
        if (window.PESSCO) PESSCO.portalSidebarCollapsed = prev;
        if (wrapper) wrapper.classList.toggle('sidebar-collapsed', prev);
        if (sidebar) sidebar.classList.toggle('collapsed', prev);
    } catch (e) {}
}

// Rendu (ou re-rendu) du corps de la table d'items en mode édition inline
function _execCliRenderRows(clId) {
    const tbody = document.getElementById('execCliItemsBody');
    if (!tbody) return;
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    if (!cl) return;
    const items = D.items.filter(i => i.checklist_id === clId).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const statuts = D.statuts.slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId);
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="exec-cli-empty">Aucun item — cliquez sur « Ajouter une ligne » pour commencer.</td></tr>';
        return;
    }
    // Construit un sigle (initiales) à partir du libellé d'un thème, pour ne pas
    // élargir la colonne — le libellé complet reste accessible via le `title`.
    const _sigle = lbl => {
        const s = String(lbl || '').trim();
        if (!s) return '—';
        const words = s.split(/\s+/).filter(w => w && !/^(de|des|du|le|la|les|et|à|au|aux|en|sur|d')$/i.test(w));
        if (words.length >= 2) return words.slice(0, 4).map(w => w.charAt(0).toUpperCase()).join('');
        return s.length > 6 ? s.substring(0, 6) : s;
    };
    // Statut + Observations sont volontairement omis ici : ils sont renseignés
    // uniquement lors de l'exécution de la checklist, pas au paramétrage.
    tbody.innerHTML = items.map(it => {
        const subOpts = sousThemes.filter(s => !it.theme_id || s.theme_id === it.theme_id);
        const themeCurrent = themes.find(t => t.id === it.theme_id);
        const themeTooltip = themeCurrent ? _esc2(themeCurrent.libelle) : '';
        return `<tr data-item-id="${it.id}">
            <td><input type="number" class="ord-input" value="${it.ordre || 0}" min="0" onchange="_execCliAutosave('${it.id}','ordre',parseInt(this.value)||0)"></td>
            <td><input class="ref-input" value="${_esc2(it.ref_item || '')}" onchange="_execCliAutosave('${it.id}','ref_item',this.value)"></td>
            <td><select title="${themeTooltip}" onchange="_execCliAutosave('${it.id}','theme_id',this.value);_execCliRowThemeChanged('${clId}','${it.id}')">
                <option value="" title="">—</option>
                ${themes.map(t => `<option value="${t.id}" ${it.theme_id===t.id?'selected':''} title="${_esc2(t.libelle)}">${_esc2(_sigle(t.libelle))}</option>`).join('')}
            </select></td>
            <td><select onchange="_execCliAutosave('${it.id}','sous_theme_id',this.value)">
                <option value="">—</option>
                ${subOpts.map(s => `<option value="${s.id}" ${it.sous_theme_id===s.id?'selected':''} title="${_esc2(s.libelle)}">${_esc2(s.libelle)}</option>`).join('')}
            </select></td>
            <td>${_execCliRefReglementCell(it, clId)}</td>
            <td><textarea rows="3" onchange="_execCliAutosave('${it.id}','description',this.value)">${_esc2(it.description || '')}</textarea></td>
            <td><textarea rows="3" onchange="_execCliAutosave('${it.id}','directives',this.value)">${_esc2(it.directives || '')}</textarea></td>
            <td><button class="row-delete" title="Supprimer" onclick="execDeleteChecklistItemInline('${it.id}','${clId}')">🗑</button></td>
        </tr>`;
    }).join('');
}

// ── Export / Import xlsx d'une checklist ──
async function execChecklistExportXlsx(clId) {
    const token = localStorage.getItem('pr_token');
    try {
        const res = await fetch(`/api/m/execution/checklists/${clId}/export-xlsx`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === clId);
        a.href = url;
        a.download = `checklist_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 60)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { shellShowToast('Export échoué : ' + (e.message || e), 'error'); }
}

async function execChecklistImportXlsx(clId, ev) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const replace = confirm('Mode « Remplacer » :\n- OK = supprime tous les items existants avant l\'import.\n- Annuler = ajoute les lignes du fichier aux items existants.');
    const mode = replace ? 'replace' : 'append';
    const token = localStorage.getItem('pr_token');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mode', mode);
    try {
        const res = await fetch(`/api/m/execution/checklists/${clId}/import-xlsx`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
        shellShowToast(`Import OK : ${j.imported} ligne(s) — mode ${j.mode}.`, 'success');
        await execRefreshChecklists();
        _execCliRenderRows(clId);
    } catch (e) {
        shellShowToast('Import échoué : ' + (e.message || e), 'error');
    } finally {
        // Réinitialise l'input pour permettre une nouvelle sélection du même fichier
        if (ev?.target) ev.target.value = '';
    }
}

// ── Réf. Règlement : sélecteur multi-exigences ──
// Le champ ref_reglement peut contenir soit :
//   - un texte libre (legacy), affiché tel quel ;
//   - un tableau JSON d'ids d'exigences (nouveau), résolu en libellés via la liste partagée.
function _execCliParseReglement(raw) {
    if (!raw) return { isList: false, list: [], text: '' };
    const s = String(raw).trim();
    if (s.startsWith('[')) {
        try {
            const arr = JSON.parse(s);
            if (Array.isArray(arr)) return { isList: true, list: arr.map(String), text: '' };
        } catch (e) { /* fallthrough */ }
    }
    return { isList: false, list: [], text: s };
}

function _execCliExigencesForChecklist(clId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const secIds = _parse(cl?.secteurs_ids);
    const domIds = _parse(cl?.domaines_ids);
    const allExigences = (window.PESSCO?.sharedData?.exigences) || [];
    // Une exigence s'applique si elle correspond à une SA, à défaut un secteur, à défaut un domaine de la checklist.
    return allExigences.filter(e => {
        if (saIds.length && e.sous_activite_id) return saIds.includes(e.sous_activite_id);
        if (secIds.length && e.secteur_id) return secIds.includes(e.secteur_id);
        if (domIds.length && e.domaine_id) return domIds.includes(e.domaine_id);
        return true; // pas de restriction
    });
}

function _execCliRefReglementCell(it, clId) {
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const parsed = _execCliParseReglement(it.ref_reglement);
    const exigencesAll = (window.PESSCO?.sharedData?.exigences) || [];
    const labels = parsed.isList
        ? parsed.list.map(id => {
              const e = exigencesAll.find(x => x.id === id);
              return e ? (e.reference + (e.libelle ? ' — ' + e.libelle : '')) : '(?)';
          })
        : parsed.text.split('\n').filter(Boolean);
    const preview = labels.length
        ? `<div style="display:flex;flex-direction:column;gap:0.1rem;font-size:0.72rem;line-height:1.25;max-height:60px;overflow:auto;">
              ${labels.map(l => `<span>• ${_esc2(l)}</span>`).join('')}
           </div>`
        : `<span style="color:var(--text-muted);font-style:italic;font-size:0.72rem;">Aucune disposition</span>`;
    return `<div style="display:flex;flex-direction:column;gap:0.2rem;">
        ${preview}
        <button class="btn btn-sm btn-ghost" style="padding:0.15rem 0.4rem;font-size:0.7rem;align-self:flex-start;" onclick="execOpenRefReglementPicker('${it.id}','${clId}')">✎ Choisir</button>
    </div>`;
}

function execOpenRefReglementPicker(itId, clId) {
    const D = _execCl_data();
    const it = D.items.find(i => i.id === itId);
    if (!it) return;
    const parsed = _execCliParseReglement(it.ref_reglement);
    const selected = new Set(parsed.list);
    const exigences = _execCliExigencesForChecklist(clId).slice().sort((a, b) =>
        (a.reference || '').localeCompare(b.reference || ''));
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const list = exigences.length
        ? exigences.map(e => `<label style="display:flex;align-items:flex-start;gap:0.4rem;padding:0.25rem 0.35rem;border-bottom:1px solid var(--border);font-size:0.78rem;cursor:pointer;">
              <input type="checkbox" class="exg-cb" value="${e.id}" ${selected.has(e.id) ? 'checked' : ''}>
              <span><strong>${_esc2(e.reference || '')}</strong>${e.libelle ? ' — ' + _esc2(e.libelle) : ''}${e.theme ? `<span style="color:var(--text-muted);font-size:0.72rem;"> [${_esc2(e.theme)}]</span>` : ''}</span>
          </label>`).join('')
        : '<div style="padding:1rem;text-align:center;color:var(--text-muted);font-style:italic;">Aucune exigence applicable aux domaines/secteurs/sous-activités de cette checklist.</div>';

    // Champ libre legacy proposé en complément si l'utilisateur souhaite saisir du texte libre.
    const legacyText = parsed.isList ? '' : parsed.text;

    shellShowModal('Réf. Règlement — sélection des exigences', `
        <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.4rem;">
            <input id="exgSearch" class="shell-input" placeholder="Filtrer…" oninput="_execCliRefRegFilter()">
            <span style="color:var(--text-muted);font-size:0.75rem;">${exigences.length} disposition${exigences.length>1?'s':''} disponibles</span>
        </div>
        <div id="exgListWrap" style="max-height:46vh;overflow:auto;border:1px solid var(--border);border-radius:6px;">
            ${list}
        </div>
        <details style="margin-top:0.5rem;">
            <summary style="font-size:0.78rem;cursor:pointer;color:var(--text-muted);">Texte libre (compatibilité)</summary>
            <textarea id="exgLegacy" class="shell-input" rows="2" placeholder="Saisi librement — utilisé si aucune exigence cochée">${_esc2(legacyText)}</textarea>
        </details>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">Annuler</button>
        <button class="shell-btn shell-btn-primary" onclick="_execCliRefRegSave('${itId}','${clId}')">Valider</button>
    `);
}

function _execCliRefRegFilter() {
    const term = (document.getElementById('exgSearch')?.value || '').toLowerCase();
    document.querySelectorAll('#exgListWrap label').forEach(l => {
        l.style.display = l.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}

async function _execCliRefRegSave(itId, clId) {
    const ids = Array.from(document.querySelectorAll('.exg-cb')).filter(c => c.checked).map(c => c.value);
    const legacy = (document.getElementById('exgLegacy')?.value || '').trim();
    // Priorité au multi-select ; fallback texte libre si rien de coché.
    const value = ids.length ? JSON.stringify(ids) : legacy;
    await _execCliAutosave(itId, 'ref_reglement', value);
    shellCloseModal();
    _execCliRenderRows(clId);
}

// Ajoute une nouvelle ligne vide (création immédiate côté serveur) et rend la table.
async function execAddChecklistRow(clId) {
    const D = _execCl_data();
    const items = D.items.filter(i => i.checklist_id === clId);
    const nextOrdre = items.length ? Math.max(...items.map(i => i.ordre || 0)) + 1 : 1;
    try {
        await api('/api/exec-checklist-items', { method: 'POST', body: JSON.stringify({
            checklist_id: clId, ref_item: '', description: '', ordre: nextOrdre
        }) });
        await execRefreshChecklists();
        _execCliRenderRows(clId);
        // Focus la première cellule éditable de la dernière ligne
        setTimeout(() => {
            const rows = document.querySelectorAll('#execCliItemsBody tr');
            const last = rows[rows.length - 1];
            last?.querySelector('input, textarea')?.focus();
        }, 30);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// Suppression d'une ligne depuis la table inline (re-rend la table en place)
async function execDeleteChecklistItemInline(itId, clId) {
    if (!confirm('Supprimer cette ligne ?')) return;
    try {
        await api('/api/exec-checklist-items/' + itId, { method: 'DELETE' });
        await execRefreshChecklists();
        _execCliRenderRows(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// Quand le thème d'une ligne change, recalcule les sous-thèmes éligibles de la même ligne.
function _execCliRowThemeChanged(clId, itId) {
    const row = document.querySelector(`#execCliItemsBody tr[data-item-id="${itId}"]`);
    if (!row) return;
    // Nouvelle disposition : Thème = col 2, Sous-thème = col 3
    const themeSel = row.cells[2]?.querySelector('select');
    const subSel = row.cells[3]?.querySelector('select');
    if (!themeSel || !subSel) return;
    const tId = themeSel.value || '';
    const D = _execCl_data();
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId && (!tId || s.theme_id === tId));
    const prev = subSel.value;
    subSel.innerHTML = '<option value="">—</option>' + sousThemes.map(s =>
        `<option value="${s.id}">${(s.libelle || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</option>`).join('');
    if (Array.from(subSel.options).some(o => o.value === prev)) {
        subSel.value = prev;
    } else if (prev) {
        subSel.value = '';
        _execCliAutosave(itId, 'sous_theme_id', '');
    }
}

// ── Slicer Item (autosave, plein largeur droite jusqu'au bord du menu) ──
// L'ancienne fonction modale est remplacée par un slicer ; on garde un alias pour
// la compatibilité avec les boutons existants.
const execOpenChecklistItemModal = (clId, itId) => execOpenChecklistItemSlicer(clId, itId);

async function execOpenChecklistItemSlicer(clId, itId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    if (!cl) { shellShowToast('Checklist introuvable', 'error'); return; }

    // Pour un nouvel item : on crée une coquille vide immédiatement et on bascule
    // en mode édition pour que l'autosave puisse opérer sur un id stable.
    let item = itId ? D.items.find(i => i.id === itId) : null;
    if (!itId) {
        try {
            const res = await api('/api/exec-checklist-items', { method: 'POST', body: JSON.stringify({
                checklist_id: clId, ref_item: '', description: '', ordre: 0
            }) });
            itId = res.id;
            await execRefreshChecklists();
            item = (EXEC_STATE.data.checklistItems || []).find(i => i.id === itId);
        } catch (e) { shellShowToast(e.message || 'Erreur création', 'error'); return; }
    }

    const statuts = (EXEC_STATE.data.checklistStatuts || []).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const sousThemes = (EXEC_STATE.data.checklistSousThemes || []).filter(s => s.checklist_id === clId);
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    // Évite les doublons : ferme une éventuelle instance ouverte avant d'en créer une.
    document.getElementById('execCliSlicerWrap')?.remove();

    const slicerHtml = `
    <div id="execCliSlicerWrap" class="exec-cli-slicer-wrap">
        <div class="exec-cli-slicer-overlay" onclick="execCloseChecklistItemSlicer('${clId}')"></div>
        <aside class="exec-cli-slicer" role="dialog" aria-modal="true">
            <header class="exec-cli-slicer-header">
                <div>
                    <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Checklist — ${_esc2(cl.nom)}</div>
                    <div style="font-weight:700;font-size:1rem;">Item de checklist</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span id="execCliSaveState" style="font-size:0.75rem;color:var(--text-muted);">●</span>
                    <button class="btn btn-sm btn-ghost" onclick="execCloseChecklistItemSlicer('${clId}')" title="Fermer">✕</button>
                </div>
            </header>
            <div class="exec-cli-slicer-body">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem;">
                    <div class="shell-form-group">
                        <label>Réf. Item</label>
                        <input id="itRef" class="shell-input" value="${_esc2(item?.ref_item || '')}" onchange="_execCliAutosave('${itId}','ref_item',this.value)">
                    </div>
                    <div class="shell-form-group">
                        <label>Ordre</label>
                        <input id="itOrd" type="number" class="shell-input" value="${item?.ordre ?? 0}" min="0" onchange="_execCliAutosave('${itId}','ordre',parseInt(this.value)||0)">
                    </div>
                    <div class="shell-form-group">
                        <label>Statut d'évaluation</label>
                        <select id="itStatut" class="shell-input" onchange="_execCliAutosave('${itId}','statut_id',this.value)">
                            <option value="">—</option>
                            ${statuts.map(s => `<option value="${s.id}" ${item?.statut_id===s.id?'selected':''}>${_esc2(s.libelle)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="shell-form-group">
                    <label>Réf. Règlement</label>
                    <textarea id="itReg" class="shell-input" rows="2" placeholder="Une référence par ligne" onchange="_execCliAutosave('${itId}','ref_reglement',this.value)">${_esc2(item?.ref_reglement || '')}</textarea>
                </div>
                <div class="shell-form-group">
                    <label>Description *</label>
                    <textarea id="itDesc" class="shell-input" rows="3" onchange="_execCliAutosave('${itId}','description',this.value)">${_esc2(item?.description || '')}</textarea>
                </div>
                <div class="shell-form-group">
                    <label>Directives</label>
                    <textarea id="itDirectives" class="shell-input" rows="3" placeholder="Directives détaillées pour l'évaluation de cet item" onchange="_execCliAutosave('${itId}','directives',this.value)">${_esc2(item?.directives || '')}</textarea>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
                    <div class="shell-form-group">
                        <label>Thème</label>
                        <select id="itTheme" class="shell-input" onchange="_execCliAutosave('${itId}','theme_id',this.value);execItemThemeChanged('${clId}','${itId}')">
                            <option value="">—</option>
                            ${themes.map(t => `<option value="${t.id}" ${item?.theme_id===t.id?'selected':''}>${_esc2(t.libelle)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="shell-form-group">
                        <label>Sous-thème</label>
                        <select id="itSousTheme" class="shell-input" onchange="_execCliAutosave('${itId}','sous_theme_id',this.value)">
                            <option value="">—</option>
                            ${sousThemes.filter(s => !item?.theme_id || s.theme_id === item.theme_id)
                                .map(s => `<option value="${s.id}" ${item?.sous_theme_id===s.id?'selected':''}>${_esc2(s.libelle)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="shell-form-group">
                    <label>Observations / Remarques</label>
                    <textarea id="itObs" class="shell-input" rows="3" onchange="_execCliAutosave('${itId}','observations',this.value)">${_esc2(item?.observations || '')}</textarea>
                </div>
            </div>
            <footer class="exec-cli-slicer-footer">
                <button class="btn btn-ghost" onclick="execDeleteChecklistItem('${itId}','${clId}')" style="color:#ef4444;">${EXEC_ICONS.delete} Supprimer</button>
                <button class="btn btn-primary" onclick="execCloseChecklistItemSlicer('${clId}')">${EXEC_ICONS.check || ''} Fermer</button>
            </footer>
        </aside>
    </div>
    <style>
        .exec-cli-slicer-wrap { position:fixed; inset:0; z-index:1100; }
        .exec-cli-slicer-overlay { position:absolute; inset:0; background:rgba(15,23,42,0.35); }
        .exec-cli-slicer { position:absolute; top:0; right:0; bottom:0;
            width: calc(100vw - var(--sidebar-width, 0px)); max-width:100vw;
            background:var(--bg, #fff); border-left:1px solid var(--border); box-shadow:-8px 0 30px rgba(0,0,0,0.18);
            display:flex; flex-direction:column; animation:execCliSlideIn 0.25s ease; }
        @keyframes execCliSlideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        .exec-cli-slicer-header { display:flex; align-items:center; justify-content:space-between; padding:0.85rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-card); }
        .exec-cli-slicer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.6rem; max-width:1100px; }
        .exec-cli-slicer-footer { display:flex; justify-content:space-between; padding:0.65rem 1.25rem; border-top:1px solid var(--border); background:var(--bg-card); }
        .exec-cli-slicer .shell-form-group label { font-size:0.78rem; font-weight:600; color:#374151; }
    </style>`;

    document.body.insertAdjacentHTML('beforeend', slicerHtml);
}

function execCloseChecklistItemSlicer(clId) {
    document.getElementById('execCliSlicerWrap')?.remove();
    // Rafraîchit la liste des items derrière le slicer
    if (clId) {
        execRefreshChecklists().then(() => execOpenChecklistEditor(clId));
    }
}

// Sauvegarde immédiate d'un champ — appelé sur `onchange` de chaque input/select/textarea.
async function _execCliAutosave(itId, field, value) {
    const stateEl = document.getElementById('execCliSaveState');
    if (stateEl) { stateEl.textContent = '… enregistrement'; stateEl.style.color = '#d97706'; }
    try {
        await api('/api/exec-checklist-items/' + itId, { method: 'PUT', body: JSON.stringify({ [field]: value }) });
        if (stateEl) { stateEl.textContent = '✓ enregistré'; stateEl.style.color = '#059669'; }
        // Met à jour le cache local
        const it = (EXEC_STATE.data.checklistItems || []).find(i => i.id === itId);
        if (it) it[field] = value;
    } catch (e) {
        if (stateEl) { stateEl.textContent = '⚠ erreur'; stateEl.style.color = '#ef4444'; }
        shellShowToast(e.message || 'Erreur d\'enregistrement', 'error');
    }
}

function execItemThemeChanged(clId, itId) {
    const tId = document.getElementById('itTheme')?.value || '';
    const D = _execCl_data();
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId && (!tId || s.theme_id === tId));
    const sel = document.getElementById('itSousTheme');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">—</option>' + sousThemes.map(s => `<option value="${s.id}">${s.libelle}</option>`).join('');
    // Réinitialise la valeur si elle n'est plus présente après le changement de thème
    if (!Array.from(sel.options).some(o => o.value === currentVal)) {
        sel.value = '';
        if (itId) _execCliAutosave(itId, 'sous_theme_id', '');
    } else {
        sel.value = currentVal;
    }
}


async function execDeleteChecklistItem(itId, clId) {
    if (!confirm('Supprimer cet item ?')) return;
    try {
        await api('/api/exec-checklist-items/' + itId, { method: 'DELETE' });
        // Ferme le slicer s'il est ouvert
        document.getElementById('execCliSlicerWrap')?.remove();
        await execRefreshChecklists();
        execOpenChecklistEditor(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Manager des sous-thèmes pour une checklist ──
function execOpenSousThemesManager(clId) {
    const D = _execCl_data();
    const cl = D.checklists.find(c => c.id === clId);
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const sousThemes = D.sousThemes.filter(s => s.checklist_id === clId).slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const themeLabel = id => themes.find(t => t.id === id)?.libelle || (allThemes.find(t => t.id === id)?.libelle || '-');
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const rowsHtml = sousThemes.length ? sousThemes.map(s => `<tr>
        <td>${_esc2(themeLabel(s.theme_id))}</td>
        <td>${_esc2(s.libelle)}</td>
        <td style="text-align:center;">${s.ordre || 0}</td>
        <td style="text-align:right;">
            <button class="btn btn-sm btn-ghost" onclick="execOpenSousThemeModal('${clId}','${s.id}')">${EXEC_ICONS.edit}</button>
            <button class="btn btn-sm btn-ghost" onclick="execDeleteSousTheme('${s.id}','${clId}')" style="color:#ef4444;">${EXEC_ICONS.delete}</button>
        </td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:0.8rem;">Aucun sous-thème.</td></tr>';

    shellShowModal('Sous-thèmes — ' + (cl?.nom || ''), `
        <div style="display:flex;gap:0.4rem;justify-content:flex-end;margin-bottom:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-outline" onclick="execSousThemesExportXlsx('${clId}')" title="Exporter en Excel">📥 Exporter</button>
            <button class="btn btn-sm btn-outline" onclick="document.getElementById('execSousThemesImportFile').click()" title="Importer depuis Excel">📤 Importer</button>
            <input type="file" id="execSousThemesImportFile" accept=".xlsx" style="display:none" onchange="execSousThemesImportXlsx('${clId}',event)">
            <button class="btn btn-sm btn-primary" onclick="execOpenSousThemeModal('${clId}')">${EXEC_ICONS.add} Ajouter</button>
        </div>
        <table class="exec-table" style="width:100%;font-size:0.78rem;">
            <thead><tr><th>Thème</th><th>Sous-thème</th><th style="text-align:center;width:60px;">Ordre</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `, `<button class="shell-btn shell-btn-outline" onclick="shellCloseModal();execOpenChecklistEditor('${clId}')">Retour à la checklist</button>`);
}

// ── Export / Import xlsx des sous-thèmes d'une checklist ──
async function execSousThemesExportXlsx(clId) {
    const token = localStorage.getItem('pr_token');
    try {
        const res = await fetch(`${EXEC_MODULE_API}/checklists/${clId}/sous-themes/export-xlsx`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || ('HTTP ' + res.status));
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cl = (EXEC_STATE.data.checklists || []).find(c => c.id === clId);
        a.href = url;
        a.download = `sous_themes_${(cl?.nom || 'export').replace(/[^\w\-]/g, '_').slice(0, 50)}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { shellShowToast('Export échoué : ' + (e.message || e), 'error'); }
}

async function execSousThemesImportXlsx(clId, ev) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const token = localStorage.getItem('pr_token');
    const fd = new FormData();
    fd.append('file', file);
    try {
        const res = await fetch(`${EXEC_MODULE_API}/checklists/${clId}/sous-themes/import-xlsx`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
        shellShowToast(`Import OK : ${j.imported} sous-thème(s).`, 'success');
        await execRefreshChecklists();
        execOpenSousThemesManager(clId);
    } catch (e) {
        shellShowToast('Import échoué : ' + (e.message || e), 'error');
    } finally {
        if (ev?.target) ev.target.value = '';
    }
}

function execOpenSousThemeModal(clId, stId) {
    const D = _execCl_data();
    const item = stId ? D.sousThemes.find(s => s.id === stId) : null;
    const cl = D.checklists.find(c => c.id === clId);
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const saIds = _parse(cl?.sous_activites_ids);
    const allThemes = (window.PESSCO?.sharedData?.themesSupervision) || [];
    const themes = saIds.length
        ? allThemes.filter(t => !t.sous_activite_id || saIds.includes(t.sous_activite_id))
        : allThemes;
    const _esc2 = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    shellShowModal((item ? 'Modifier' : 'Ajouter') + ' — Sous-thème', `
        <div class="shell-form-group">
            <label>Thème *</label>
            <select id="stTheme" class="shell-input">
                ${themes.map(t => `<option value="${t.id}" ${item?.theme_id===t.id?'selected':''}>${_esc2(t.libelle)}</option>`).join('')}
            </select>
        </div>
        <div class="shell-form-group">
            <label>Libellé du sous-thème *</label>
            <input id="stLib2" class="shell-input" value="${_esc2(item?.libelle || '')}">
        </div>
        <div class="shell-form-group">
            <label>Ordre</label>
            <input id="stOrd2" type="number" class="shell-input" value="${item?.ordre ?? 0}" min="0">
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="execOpenSousThemesManager('${clId}')">Retour</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveSousTheme('${clId}','${stId || ''}')">Enregistrer</button>
    `);
}

async function execSaveSousTheme(clId, stId) {
    const data = {
        checklist_id: clId,
        theme_id: document.getElementById('stTheme')?.value || '',
        libelle: document.getElementById('stLib2')?.value.trim() || '',
        ordre: parseInt(document.getElementById('stOrd2')?.value || '0', 10) || 0
    };
    if (!data.theme_id || !data.libelle) { shellShowToast('Thème et libellé requis', 'error'); return; }
    try {
        if (stId) await api('/api/exec-checklist-sous-themes/' + stId, { method: 'PUT', body: JSON.stringify(data) });
        else      await api('/api/exec-checklist-sous-themes',          { method: 'POST', body: JSON.stringify(data) });
        await execRefreshChecklists();
        execOpenSousThemesManager(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

async function execDeleteSousTheme(stId, clId) {
    if (!confirm('Supprimer ce sous-thème ?')) return;
    try {
        await api('/api/exec-checklist-sous-themes/' + stId, { method: 'DELETE' });
        await execRefreshChecklists();
        execOpenSousThemesManager(clId);
    } catch (e) { shellShowToast(e.message || 'Erreur', 'error'); }
}

// ── Chargement / refresh checklists ──
async function execRefreshChecklists() {
    try {
        const [checklists, items, statuts, sousThemes] = await Promise.all([
            api('/api/exec-checklists').catch(() => []),
            api('/api/exec-checklist-items').catch(() => []),
            api('/api/exec-checklist-statuts').catch(() => []),
            api('/api/exec-checklist-sous-themes').catch(() => [])
        ]);
        EXEC_STATE.data.checklists = checklists || [];
        EXEC_STATE.data.checklistItems = items || [];
        EXEC_STATE.data.checklistStatuts = statuts || [];
        EXEC_STATE.data.checklistSousThemes = sousThemes || [];
    } catch (e) { console.warn('Checklists refresh failed', e); }
}

function execOpenCriticiteModal(critId) {
    const crits = EXEC_STATE.data.criticites || [];
    const c = critId ? crits.find(x => x.id === critId) : null;
    const title = (c ? 'Modifier' : 'Ajouter') + ' — ' + te('niveau_constatations');
    shellShowModal(title, `
        <div class="shell-form-group">
            <label>${te('item')} *</label>
            <input id="critItem" class="shell-input" value="${_esc(c?.item || '')}" placeholder="Critique / Majeure / Mineure">
        </div>
        <div class="shell-form-group">
            <label>Alias</label>
            <input id="critAlias" class="shell-input" value="${_esc(c?.alias || '')}" placeholder="Valeur affichée dans les listes déroulantes (ex. C / M / m)">
        </div>
        <div class="shell-form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
            <div class="shell-form-group">
                <label>${te('niveau')}</label>
                <input id="critNiveau" type="number" class="shell-input" value="${c?.niveau ?? 0}" min="0">
            </div>
            <div class="shell-form-group">
                <label>${te('delai_cloture_jours')}</label>
                <input id="critDelai" type="number" class="shell-input" value="${c?.delai_cloture ?? 0}" min="0">
            </div>
        </div>
        <div class="shell-form-group">
            <label>${te('ordre')}</label>
            <input id="critOrdre" type="number" class="shell-input" value="${c?.ordre ?? 0}" min="0">
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">${te('cancel') || 'Annuler'}</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveCriticite('${critId || ''}')">${te('save') || 'Enregistrer'}</button>
    `);
}

async function execSaveCriticite(critId) {
    const data = {
        item: document.getElementById('critItem')?.value.trim() || '',
        alias: document.getElementById('critAlias')?.value.trim() || '',
        niveau: parseInt(document.getElementById('critNiveau')?.value || '0', 10) || 0,
        delai_cloture: parseInt(document.getElementById('critDelai')?.value || '0', 10) || 0,
        ordre: parseInt(document.getElementById('critOrdre')?.value || '0', 10) || 0
    };
    if (!data.item) {
        shellShowToast(te('required_field') || 'Champ requis', 'error');
        return;
    }
    try {
        if (critId) {
            await api(`${EXEC_MODULE_API}/criticites/${critId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await api(`${EXEC_MODULE_API}/criticites`, { method: 'POST', body: JSON.stringify(data) });
        }
        shellCloseModal();
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

async function execDeleteCriticite(critId) {
    if (!confirm(te('confirm_delete') || 'Confirmer la suppression ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/criticites/${critId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

function execOpenTypeCasModal(tcId) {
    const tcs = EXEC_STATE.data.typesCas || [];
    const t = tcId ? tcs.find(x => x.id === tcId) : null;
    const title = (t ? 'Modifier' : 'Ajouter') + ' — ' + te('types_cas');
    shellShowModal(title, `
        <div class="shell-form-group">
            <label>${te('item')} *</label>
            <input id="tcItem" class="shell-input" value="${_esc(t?.item || '')}" placeholder="Isolé / Récurrent">
        </div>
        <div class="shell-form-group">
            <label>${te('description') || 'Description'}</label>
            <textarea id="tcDesc" class="shell-input" rows="2">${_esc(t?.description || '')}</textarea>
        </div>
        <div class="shell-form-group">
            <label>${te('ordre')}</label>
            <input id="tcOrdre" type="number" class="shell-input" value="${t?.ordre ?? 0}" min="0">
        </div>
    `, `
        <button class="shell-btn shell-btn-outline" onclick="shellCloseModal()">${te('cancel') || 'Annuler'}</button>
        <button class="shell-btn shell-btn-primary" onclick="execSaveTypeCas('${tcId || ''}')">${te('save') || 'Enregistrer'}</button>
    `);
}

async function execSaveTypeCas(tcId) {
    const data = {
        item: document.getElementById('tcItem')?.value.trim() || '',
        description: document.getElementById('tcDesc')?.value.trim() || '',
        ordre: parseInt(document.getElementById('tcOrdre')?.value || '0', 10) || 0
    };
    if (!data.item) {
        shellShowToast(te('required_field') || 'Champ requis', 'error');
        return;
    }
    try {
        if (tcId) {
            await api(`${EXEC_MODULE_API}/types-cas/${tcId}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await api(`${EXEC_MODULE_API}/types-cas`, { method: 'POST', body: JSON.stringify(data) });
        }
        shellCloseModal();
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

async function execDeleteTypeCas(tcId) {
    if (!confirm(te('confirm_delete') || 'Confirmer la suppression ?')) return;
    try {
        await api(`${EXEC_MODULE_API}/types-cas/${tcId}`, { method: 'DELETE' });
        await execRefreshDynamic();
        execRenderPage();
    } catch (e) {
        shellShowToast(e.message || 'Erreur', 'error');
    }
}

// Propage le délai de clôture du paramètre criticité sélectionné vers le champ
// "Délai" du formulaire FNC / clôture, puis déclenche le recalcul de la date due.
function execApplyCriticiteDelai(selectId, delaiId, recomputeFnName) {
    const sel = document.getElementById(selectId);
    const delai = document.getElementById(delaiId);
    if (!sel || !delai) return;
    const opt = sel.options[sel.selectedIndex];
    const d = opt ? parseInt(opt.getAttribute('data-delai') || '0', 10) : 0;
    if (d > 0) delai.value = d;
    if (recomputeFnName && typeof window[recomputeFnName] === 'function') {
        window[recomputeFnName]();
    }
}
