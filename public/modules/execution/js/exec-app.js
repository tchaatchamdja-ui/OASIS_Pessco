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
        consta_sub_list: 'En Préparation',
        consta_sub_suivi: 'Suivi',
        consta_sub_terrain: 'Suivi Terrain',
        constatation_hors_activites: 'Constatation Hors Activités de Supervision',
        cd_etape_preparation: 'Préparation',
        realisation_intro: 'Confirmez et ajustez les informations de l\'activité menée sur le terrain, puis rédigez le rapport.',
        real_section_cadre: 'Cadre de l\'activité',
        redac_section_introduction: 'Introduction',
        redac_section_synthese: 'Synthèses et Recommandations',
        redac_section_checklists: 'Checklists et autres documents',
        redac_section_constatations: 'Constatations',
        redac_section_conclusion: 'Conclusions',
        redac_section_annexes: 'Annexes',
        constatation: 'Constatation',
        ajouter_constatation: 'Ajouter Constatation',
        fiches_constat: 'Fiches de constatation',
        fiche_suivi_pac: 'Fiche de suivi du PAC',
        a_completer_prestataire: '(à compléter par le prestataire)',
        a_completer_aac: '(réservé à l\'AAC)',
        retour_rapport: 'Retour au Rapport',
        fnc_section_identification: 'Identification',
        fnc_section_constat: 'Constat',
        fnc_section_traitement: 'Traitement attendu',
        fnc_section_preuves: 'Preuves',
        fnc_aide_identification: 'Émetteur, destinataire, date et rattachement de la constatation.',
        cd_aide_identification: 'Prestataire concerné, émetteur, destinataire, date et rattachement.',
        fnc_aide_constat: 'Référentiels applicables et description de l\'écart.',
        fnc_aide_traitement: 'Criticité, délai de solde et recommandation.',
        fnc_aide_preuves: 'Éléments recueillis à l\'appui de la constatation.',
        redac_aide_introduction: 'Cadre du rapport : objet, dates, équipe, périmètre et référentiels.',
        redac_aide_synthese: 'Points forts, points faibles, opportunités et résumé global.',
        redac_aide_checklists: 'Checklists renseignées et documents recueillis.',
        redac_aide_constatations: 'Écarts relevés pendant l\'activité.',
        redac_aide_conclusion: 'Conclusion de l\'activité de surveillance.',
        redac_aide_annexes: 'Pièces annexées au rapport : intitulé, contenu et fichiers.',
        real_section_equipe: 'Équipe d\'audit / inspection',
        real_section_programme: 'Programme de travail',
        real_section_checklists: 'Checklists à utiliser',
        real_section_pj: 'Pièces jointes de l\'activité',
        real_nature: 'Nature de l\'activité',
        real_aide_equipe: 'Inspecteurs mobilisés et rôle de chacun.',
        real_aide_programme: 'Déroulé prévisionnel : date, horaire, actions et correspondant.',
        real_aide_checklists: 'Checklists retenues pour cette activité ; « Renseigner » ouvre la grille de saisie.',
        real_aide_pj: 'Documents recueillis pendant l\'activité.',
        televerser_pj: 'Téléverser des pièces jointes',
        aucune_piece_jointe: 'Aucune pièce jointe.',
        cd_etape_validation: 'Validation',
        cd_etape_transmission: 'Transmission',
        imprimer_constatation: 'Imprimer',
        transmission_constatation: 'Transmission de la constatation au prestataire',
        export_excel: 'Exporter Excel',
        export_route_absente: 'Export indisponible : le serveur doit être redémarré pour charger la route d\'export.',
        exp_annee: 'Année',
        exp_recherche: 'Recherche',
        edite_le: 'Édité le',
        aucun_filtre: 'Aucun filtre',
        visa_inspecteur: 'Visa de l\'inspecteur',
        visa_prestataire: 'Visa du prestataire',
        bloqueur_fenetre: 'Autorisez les fenêtres surgissantes pour produire le PDF',
        a_verifier_terrain: 'constatation(s) à vérifier sur le terrain',
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
        dont: 'dont',
        hors_activite_court: 'hors activité',
        situation_generale: 'Situation Générale',
        statistiques_detaillees: 'Statistiques détaillées',
        periode_analysee: 'Période analysée',
        filtre_temporel: 'Filtre temporel d’inspection',
        periode_examinee: 'Période examinée',
        chrono_date_debut: 'Date Début', chrono_date_fin: 'Date Fin',
        fin: 'Fin',
        cycle_surveillance: 'Cycle de surveillance fixé dans « Plans de Surveillance »',
        cycle_court: 'Cycle',
        chrono_12_mois: '12 mois', chrono_6_mois: '6 mois', chrono_3_mois: '3 mois',
        chrono_tout: 'Tout',
        statistiques: 'Statistiques',
        voir_statistiques: 'Voir les Statistiques',
        indicateurs: 'Indicateurs',
        indicateurs_conformite: 'Indicateurs de conformité',
        detail_indicateur: 'Détail de l’indicateur',
        aucun_indicateur: 'Choisissez un indicateur ci-dessus pour en voir le détail.',
        stats_criticite: 'Constatations critiques & majeures',
        stats_complementaires: 'Indicateurs complémentaires',
        stats_critiques: 'Critiques',
        stats_critiques_aide: 'Constatations de criticité critique',
        stats_critiques_delai: 'Résolues à temps',
        stats_echeance: 'Échéance',
        stats_moyenne_mensuelle: 'Moyenne mensuelle',
        stats_moyenne_aide: 'Critiques et majeures par mois',
        stats_cloture_majeures: 'Clôture majeures',
        stats_recurrentes: 'Récurrentes',
        stats_recurrentes_aide: 'Même objet, même prestataire',
        stats_repetition: 'Répétée', stats_isolee: 'Isolée',
        stats_total_suivi: 'Total suivi',
        stats_total_aide: 'Constatations transmises',
        stats_cloture_globale: 'Clôture globale',
        stats_hors_delai: 'Hors délais',
        stats_hors_delai_aide: 'Non soldées, échéance passée',
        stats_delai_moyen: 'Délai moyen',
        stats_delai_moyen_aide: 'De l’ouverture au solde',
        stats_rapports_aide: 'Remis aux prestataires',
        stats_top_prestataires: 'Top 5 prestataires par nombre de constatations',
        depasse: 'Dépassé',
        debut: 'Début',
        sur: 'sur',
        realisees_court: 'réalisées',
        cloturees_court: 'clôturées',
        action_immediate: 'Nécessitant une action immédiate',
        en_attente_traitement: 'En attente de traitement',
        en_attente: 'En attente',
        en_cours_court: 'En cours',
        cloture_court: 'Clôturé',
        faible: 'Faible',
        eleve: 'Élevé',
        act_en_retard: 'En Retard',
        act_en_retard_aide: 'Début dépassé, non déclenchées',
        a_planifier: 'À Planifier',
        horizon_prochains: 'Prochains',
        mois: 'mois',
        taux_cloture: 'Taux de Clôture',
        critiques: 'Critiques',
        ouvertes: 'Ouvertes',
        en_retard: 'en retard',
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
        reference: 'Référence',
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
        criticite: 'Criticité',
        critique: 'Critique',
        majeur: 'Majeur',
        mineur: 'Mineur',
        // Les constatations portent la forme féminine ; sans ces clés, te()
        // renvoyait « majeure » en minuscules au milieu des autres libellés.
        majeure: 'Majeure',
        mineure: 'Mineure',
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
        details_suivi: 'Évaluations et Suivi (Réservé à l\'AAC)',
        resultats_suivi: 'Résultats du Suivi',
        details_suivi_intro: 'Échanges entre l\'AAC et le postulant sur chaque item du plan d\'actions.',
        suivi_rang: 'Suivi',
        joindre_fichier: 'Joindre un fichier',
        suivi_attente_soumission: 'L’évaluation s’ouvrira dès que le prestataire aura soumis son plan d’actions.',
        soumettre: 'Soumettre',
        renvoyer: 'Renvoyer',
        ajouter_preuves: 'Ajouter les Preuves',
        amender_pac: 'Amender PAC',
        choisir_mode_pac: 'Choisir d\'abord « Ajouter les Preuves » ou « Amender PAC »',
        mode_preuves_actif: 'Dépôt des preuves de mise en oeuvre : seules les zones de preuves du plan d\'actions sont ouvertes.',
        mode_amendement_actif: 'Amendement du plan d\'actions : tous les champs sont rouverts. À la soumission, le plan accepté sera versionné et le circuit reviendra à l\'étape « Acceptation ».',
        mode_mixte_actif: 'Amendement du plan d\'actions et dépôt des preuves : tous les champs sont ouverts. À la soumission, l\'amendement l\'emporte — le plan accepté sera versionné, preuves comprises, et le circuit reviendra à l\'étape « Acceptation ».',
        confirm_quitter_amendement: 'Renoncer à l\'amendement ? Le plan d\'actions revient à la version acceptée : les modifications apportées, y compris celles enregistrées en brouillon, sont abandonnées. Les preuves déposées sont conservées.',
        plan_retabli: 'Plan d\'actions rétabli dans sa version acceptée',
        confirm_soumettre_preuves: 'Soumettre les preuves de mise en oeuvre à l\'AAC ? Le circuit reste à l\'étape « Mise en oeuvre ».',
        confirm_soumettre_amendement: 'Soumettre le plan d\'actions amendé ? L\'acceptation précédente est annulée : le circuit revient à l\'étape « Acceptation ».',
        preuves_soumises: 'Preuves de mise en oeuvre soumises',
        preuves_soumises_titre: 'Preuves de mise en oeuvre soumises',
        pac_amende: 'Plan d\'actions amendé',
        pac_amende_soumis: 'Plan d\'actions amendé soumis à l\'AAC',
        versions_pac: 'Versions précédentes du plan d\'actions',
        version_n: 'Version',
        amende_le: 'amendé le',
        accepter_pac: 'Accepter PAC',
        accepter_pac_preuves: 'Accepter PAC et Preuves',
        confirm_accepter_pac: 'Accepter le plan d\'actions correctives ? L\'étape « Acceptation » sera close et la mise en oeuvre pourra débuter.',
        confirm_accepter_pac_preuves: 'Accepter le plan d\'actions et les preuves de mise en oeuvre ? Les étapes « Acceptation » et « Mise en oeuvre » seront closes ; la constatation se présentera à la clôture.',
        pac_accepte_ok: 'Plan d\'actions accepté',
        pac_preuves_acceptes: 'Plan d\'actions et preuves acceptés',
        volet_deplier: 'Déplier les commentaires',
        volet_replier: 'Replier les commentaires',
        item_label: 'Item',
        reponse_label: 'Réponse du postulant',
        commentaires_label: 'Commentaires',
        cause_root: 'Cause Primaire (Root cause)',
        action_curative_correction: 'Action Curative (Correction immédiate)',
        action_corrective_prevention: 'Action Corrective (Prévention de la récurrence)',
        acceptation_propositions: 'Acceptation du PAC',
        pac_accepte: 'Le PAC est-il accepté ?',
        date_acceptation: 'Date d\'acceptation',
        verification_mise_oeuvre: 'Vérification de la mise en oeuvre',
        isolement_realise: 'Isolement / Information réalisé ?',
        risques_traites: 'Traitement des Risques identifiés ?',
        commentaire_efficacite: 'Commentaire sur la mise en oeuvre et l\'efficacité',
        preuves_mise_oeuvre: 'Preuves de mise en oeuvre fournies par l\'exploitant',
        cloture_fnc: 'Clôture de la Fiche de Non-Conformité',
        mise_oeuvre_effective: 'Mise en oeuvre Effective des Actions',
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
        graph_emises: 'Constatations émises',
        graph_criticite: 'Constatations par criticité',
        emises_ouverte: 'Ouverte',
        emises_cloture: 'Clôturé',
        graph_pac_titre: 'PAC des Constatations Ouvertes',
        voir_donnees_source: 'Voir les données source',
        ouvrir_constatation: 'Ouvrir la constatation',
        archiver: 'Archiver',
        archiver_plan: 'Archiver le plan de surveillance',
        archiver_plan_message: 'Le plan « {plan} » et ses {n} activités quittent les activités de supervision et rejoignent les activités archivées du menu États. Les constatations issues de ces activités poursuivent leur suivi et ne sont pas archivées.',
        demander_changement: 'Demander Changement',
        demander_changement_aide: 'Échanger avec l’AAC avant d’accuser réception',
        accuser_reception: 'Accuser de Réception',
        accuser_reception_aide: 'Accuser réception et confirmer les dates et le périmètre',
        accuser_reception_message: 'Vous accusez réception de la notification et vous déclarez disposé à recevoir l’équipe du {debut} au {fin}, sur le périmètre annoncé. Le message part dans le fil d’échange et l’accusé figure au bas de la fiche.',
        accuse_fait: 'Réception Accusée',
        accuse_deja: 'Réception déjà accusée',
        accuse_ok: 'Réception accusée',
        apercu_notification: 'Aperçu de la Notification',
        secteur_label: 'Secteur',
        chargement: 'Chargement…',
        acces_refuse: 'Accès refusé.',
        processus_intro: 'Intervenants des processus, secteur par secteur.',
        proc_nouveau: 'Nouveau processus',
        proc_modifier: 'Modifier le processus',
        proc_libelle: 'Intitulé',
        proc_libelle_requis: 'L’intitulé est obligatoire.',
        proc_type: 'Type de processus',
        proc_type_activite: 'Processus activité',
        proc_type_constatation: 'Processus constatation',
        proc_tous_types: 'Tous les types',
        proc_etapes: 'Étapes',
        proc_acteurs: 'Acteurs',
        proc_acteurs_par_etape: 'Acteurs par étape',
        proc_ajouter_acteur: 'Ajouter un acteur',
        proc_aucun_acteur: 'Aucun acteur désigné.',
        proc_acteur_non_designe: '— Non désigné —',
        description: 'Description',
        item_requis: 'L’intitulé est obligatoire.',
        enregistre: 'Enregistré',
        supprime: 'Supprimé',
        param_equipe: 'Équipe d’audit / inspection',
        roles_equipe_intro: 'Rôles proposés à la composition de l’équipe, à l’étape Réalisation, et aux acteurs « équipe » des processus.',
        roles_equipe_vide: 'Aucun rôle défini — les rôles d’origine restent proposés.',
        role_equipe_supprimer_message: 'Le rôle « {item} » ne sera plus proposé à la composition des équipes.',
        proc_poste_non_designe: '— Poste non désigné —',
        proc_equipe_non_designe: '— Non désigné (toute l’équipe) —',
        proc_role_libre: 'Intitulé du rôle',
        proc_dupliquer: 'Dupliquer',
        proc_dupliquer_intro: 'Le processus « {source} » sert de patron : ses étapes et ses acteurs sont recopiés.',
        proc_duplique: 'Processus dupliqué',
        proc_enregistre: 'Processus enregistré',
        proc_supprimer: 'Supprimer le processus',
        proc_supprimer_message: 'Le processus « {libelle} » et la désignation de ses acteurs sont supprimés.',
        proc_supprime: 'Processus supprimé',
        version: 'Version',
        reinitialiser: 'Réinitialiser',
        reinitialiser_activite: 'Réinitialiser l’activité comme non déclenchée',
        reinitialiser_activite_message: 'L’activité redevient déclenchable : la notification, le dossier d’exécution et les échanges qui s’y rattachent sont supprimés. Le refus est opposé si des constatations ou un rapport en dépendent.',
        reinitialiser_ok: 'Activité réinitialisée',
        date_edition: 'Date d’édition',
        ajust_prorogation: 'Prorogation',
        ajust_criticite: 'Criticité',
        ajust_complet: 'Modifier',
        ajust_prorogation_aide: 'Modifier le délai de solde',
        ajust_criticite_aide: 'Modifier le délai de solde et la criticité',
        ajust_complet_aide: 'Modifier tous les champs du rappel de la constatation',
        ajust_journal: 'Modification de la Constatation',
        ajust_rang: 'Modification',
        ajust_aucun: 'Aucune modification enregistrée.',
        ajust_motif: 'Motif de la modification',
        ajust_motif_aide: 'Ce motif reste attaché à la constatation.',
        ajust_motif_requis: 'Le motif est obligatoire.',
        ajust_mot_de_passe: 'Confirmez avec votre mot de passe',
        ajust_mot_de_passe_requis: 'Le mot de passe est obligatoire.',
        ajust_intro: 'La constatation est déjà notifiée au prestataire : la modification est tracée et attribuée.',
        ajust_ok: 'Modification enregistrée',
        appliquer: 'Appliquer',
        plan_archive_ok: 'Plan archivé',
        archiver_hors_plan: 'Archiver les autres activités',
        archiver_hors_plan_message: 'Les {n} activités hors plan de surveillance quittent les activités de supervision et rejoignent les activités archivées du menu États, regroupées sous « Autres Activités ». Les constatations qui en sont issues poursuivent leur suivi et ne sont pas archivées.',
        hors_plan_archive_ok: 'Autres activités archivées',
        action_impossible: 'Action impossible',
        graph_pac_non_soumis: 'PAC Non Soumis',
        graph_pac_accepte: 'PAC Accepté',
        graph_pac_rejete: 'PAC Rejeté',
        gantt_titre: 'Calendrier des Activités',
        gantt_aujourdhui: "Aujourd'hui",
        gantt_type_audit: "Type d'activité",
        gantt_dates: 'Dates',
        gantt_lieu: 'Lieu',
        gantt_sans_activite: 'Aucune activité planifiée',
        gantt_hors_plan: 'Hors plan de surveillance',
        gantt_origine: 'Origine',
        gantt_debut: 'Début de la période',
        gantt_fin: 'Fin de la période',
        gantt_reculer: 'Reculer',
        gantt_avancer: 'Avancer',
        gantt_termine: 'Terminée',
        gantt_en_cours: 'En cours',
        gantt_planifie: 'Planifiée',
        gantt_en_retard: 'En retard',
        confirm_renvoyer: 'Confirmer le renvoi du PAC au postulant ? Les champs du PAC seront réactivés.',
        confirm_solder: 'Confirmer la clôture de la constatation ? Tous les champs seront verrouillés.',
        motif_renvoi: 'Motif du renvoi (visible par le postulant)',
        motif_renvoi_titre: 'Motif du renvoi',
        historique_decisions: 'Renvois et rejets',
        transmis_sans_courriel: 'Transmission enregistrée, mais aucun courriel n’est parti : le serveur de messagerie n’est pas configuré.',
        aide_historique_decisions: 'Ce qui avait été demandé aux tours précédents, pour réviser les corrections apportées.',
        motif_rejet_titre: 'Motif du rejet',
        constatation_rejetee_arret: 'La constatation est rejetée : le circuit s’arrête ici, elle ne peut plus être modifiée.',
        brouillon_enregistre: 'Brouillon enregistré',
        fiche_constat: 'Fiche Constat',
        fiche_suivi: 'Fiche Suivi',
        rapport_valide_readonly: 'Rapport validé — modification bloquée',
        delai_label: 'Délai de solde',
        ref_label: 'Référence',
        domaine_label: 'Domaine',
        criticite_label: 'Criticité',
        date_due_label: 'Date d’Échéance',
        ref_reglementaires_label: 'Référentiel(s) réglementaire(s)',
        item_cause: 'Cause Primaire',
        suivi_choisir_item: 'Choisir d\'abord le ou les items concernés',
        suivi_saisir_commentaire: 'Saisir le commentaire de suivi…',
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
        pac_etape_soumission: 'Soumission',
        pac_etape_acceptation: 'Acceptation',
        pac_etape_mise_oeuvre: 'Mise en oeuvre',
        pac_etape_cloture: 'Cloture',
        pac_fil_en_cours: 'En cours',
        pac_fil_cloture: 'Cloture',
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
        ajouter: 'Ajouter',
        supprimer: 'Supprimer',
        preuve_dialogue_titre: 'Pièce jointe',
        champ_amende: 'Champ amendé',
        preuve_date: 'Date de dépôt',
        verifier_terrain: 'À vérifier sur le terrain',
        preuves_non_acceptables: 'Non acceptable',
        cloturer: 'Clôturer',
        votre_message: 'Votre message…',
        modifier: 'Modifier',
        non_transmis: 'Non transmis',
        confirm_supprimer_commentaire: 'Supprimer ce commentaire ?',
        renvoyer_mise_oeuvre: 'Renvoyer à la mise en oeuvre',
        renvoye_mise_oeuvre: 'Renvoyé à l\'étape Mise en oeuvre',
        confirm_annuler_saisie: 'Abandonner les saisies non enregistrées ? Le formulaire se recharge tel qu\'il est enregistré.',
        acceptation: 'Acceptable',
        preuves_recueillies: 'Preuves de mise en oeuvre recueillies',
        commentaire_general_suivi: 'Commentaire général de suivi',
        aucun_suivi: 'Aucun suivi enregistré',
        suivi_placeholder: 'Saisir un commentaire de suivi…',
        ajouter_suivi: 'Ajouter',
        preuves_refusees: 'Preuves refusées',
        preuves_refusees_titre: 'Preuves de mise en oeuvre non acceptables',
        preuves_acceptees_ok: 'Preuves de mise en oeuvre acceptées',
        preuves_acceptees_titre: 'Preuves de mise en oeuvre acceptées',
        verification_terrain_annoncee: 'Une vérification sur le terrain sera effectuée avant la clôture de la constatation.',
        confirm_accepter_preuves: 'Accepter les preuves de mise en oeuvre ? L\'étape « Mise en oeuvre » sera close et la constatation se présentera à la clôture.',
        confirm_accepter_preuves_terrain: 'Accepter les preuves de mise en oeuvre ? L\'étape « Mise en oeuvre » sera close ; une vérification sur le terrain restera à mener avant la clôture.',
        motif_choisir: '— Objet de la modification —',
        motif_preciser: 'Préciser',
        motif_manquant: 'Objet de la modification à renseigner',
        motif_nouvelle_cause: 'Nouvelle cause (ajout à la précédente)',
        motif_nouvelle_action: 'Nouvelle action (ajout à la précédente)',
        motif_refonte_action: 'Refonte de l\'action (en remplacement)',
        motif_modification_date: 'Modification de date',
        motif_observations_aac: 'Prise en compte des observations de l\'AAC',
        motif_correction_mineure: 'Correction mineure (typographie / fautes / clarifications)',
        motif_autres: 'Autres',
        date_prevue_curative: 'Date prévue — action curative',
        date_prevue_corrective: 'Date prévue — action corrective',
        modifier_piece: 'Modifier la pièce',
        ouvrir_piece: 'Ouvrir la pièce jointe',
        enregistrer: 'Enregistrer',
        preuve_intitule: 'Intitulé de la pièce',
        preuve_intitule_exemple: 'Ex. : attestation de formation du 12/08/2026',
        preuve_intitule_requis: 'Intitulé obligatoire',
        preuve_commentaire: 'Commentaire',
        preuve_commentaire_aide: 'À l\'attention de l\'AAC (facultatif)',
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
        taux_execution: 'Taux d’Exécution',
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
        consta_sub_list: 'In preparation',
        consta_sub_suivi: 'Follow-up',
        consta_sub_terrain: 'On-site follow-up',
        constatation_hors_activites: 'Finding Outside Surveillance Activities',
        cd_etape_preparation: 'Preparation',
        realisation_intro: 'Confirm and adjust the details of the on-site activity, then draft the report.',
        real_section_cadre: 'Activity framework',
        redac_section_introduction: 'Introduction',
        redac_section_synthese: 'Summary and recommendations',
        redac_section_checklists: 'Checklists and other documents',
        redac_section_constatations: 'Findings',
        redac_section_conclusion: 'Conclusions',
        redac_section_annexes: 'Appendices',
        constatation: 'Finding',
        ajouter_constatation: 'Add finding',
        fiches_constat: 'Finding sheets',
        fiche_suivi_pac: 'CAP follow-up sheet',
        a_completer_prestataire: '(to be completed by the provider)',
        a_completer_aac: '(CAA use only)',
        retour_rapport: 'Back to report',
        fnc_section_identification: 'Identification',
        fnc_section_constat: 'Finding statement',
        fnc_section_traitement: 'Expected treatment',
        fnc_section_preuves: 'Evidence',
        fnc_aide_identification: 'Issuer, addressee, date and scope of the finding.',
        cd_aide_identification: 'Provider concerned, issuer, addressee, date and scope.',
        fnc_aide_constat: 'Applicable references and description of the gap.',
        fnc_aide_traitement: 'Criticality, closure deadline and recommendation.',
        fnc_aide_preuves: 'Items collected to support the finding.',
        redac_aide_introduction: 'Report framework: purpose, dates, team, scope and references.',
        redac_aide_synthese: 'Strengths, weaknesses, opportunities and overall summary.',
        redac_aide_checklists: 'Completed checklists and collected documents.',
        redac_aide_constatations: 'Findings raised during the activity.',
        redac_aide_conclusion: 'Conclusion of the surveillance activity.',
        redac_aide_annexes: 'Items appended to the report: title, content and files.',
        real_section_equipe: 'Audit / inspection team',
        real_section_programme: 'Work programme',
        real_section_checklists: 'Checklists to use',
        real_section_pj: 'Activity attachments',
        real_nature: 'Nature of the activity',
        real_aide_equipe: 'Inspectors involved and their roles.',
        real_aide_programme: 'Planned schedule: date, time, actions and counterpart.',
        real_aide_checklists: 'Checklists selected for this activity; "Fill in" opens the grid.',
        real_aide_pj: 'Documents collected during the activity.',
        televerser_pj: 'Upload attachments',
        aucune_piece_jointe: 'No attachment.',
        cd_etape_validation: 'Validation',
        cd_etape_transmission: 'Transmission',
        imprimer_constatation: 'Print',
        transmission_constatation: 'Sending the finding to the provider',
        export_excel: 'Export Excel',
        export_route_absente: 'Export unavailable: restart the server to load the export route.',
        exp_annee: 'Year',
        exp_recherche: 'Search',
        edite_le: 'Issued on',
        aucun_filtre: 'No filter',
        visa_inspecteur: 'Inspector signature',
        visa_prestataire: 'Provider signature',
        bloqueur_fenetre: 'Allow pop-ups to produce the PDF',
        a_verifier_terrain: 'finding(s) to be verified on site',
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
        dont: 'of which',
        hors_activite_court: 'off-activity',
        situation_generale: 'Overall Situation',
        statistiques_detaillees: 'Detailed statistics',
        periode_analysee: 'Period analysed',
        filtre_temporel: 'Inspection time filter',
        periode_examinee: 'Period examined',
        chrono_date_debut: 'Start date', chrono_date_fin: 'End date',
        fin: 'End',
        cycle_surveillance: 'Surveillance cycle set in “Surveillance Plans”',
        cycle_court: 'Cycle',
        chrono_12_mois: '12 months', chrono_6_mois: '6 months', chrono_3_mois: '3 months',
        chrono_tout: 'All',
        statistiques: 'Statistics',
        voir_statistiques: 'View Statistics',
        indicateurs: 'Indicators',
        indicateurs_conformite: 'Compliance indicators',
        detail_indicateur: 'Indicator detail',
        aucun_indicateur: 'Pick an indicator above to see its detail.',
        stats_criticite: 'Critical & major findings',
        stats_complementaires: 'Further indicators',
        stats_critiques: 'Critical',
        stats_critiques_aide: 'Findings rated critical',
        stats_critiques_delai: 'Resolved on time',
        stats_echeance: 'Due date',
        stats_moyenne_mensuelle: 'Monthly average',
        stats_moyenne_aide: 'Critical and major per month',
        stats_cloture_majeures: 'Major closure',
        stats_recurrentes: 'Recurring',
        stats_recurrentes_aide: 'Same subject, same provider',
        stats_repetition: 'Repeated', stats_isolee: 'Isolated',
        stats_total_suivi: 'Total tracked',
        stats_total_aide: 'Findings sent to providers',
        stats_cloture_globale: 'Overall closure',
        stats_hors_delai: 'Overdue',
        stats_hors_delai_aide: 'Unclosed, deadline passed',
        stats_delai_moyen: 'Average time',
        stats_delai_moyen_aide: 'From opening to closure',
        stats_rapports_aide: 'Delivered to providers',
        stats_top_prestataires: 'Top 5 providers by number of findings',
        depasse: 'Overdue',
        debut: 'Start',
        sur: 'of',
        realisees_court: 'completed',
        cloturees_court: 'closed',
        action_immediate: 'Requiring immediate action',
        en_attente_traitement: 'Awaiting treatment',
        en_attente: 'Pending',
        en_cours_court: 'In progress',
        cloture_court: 'Closed',
        faible: 'Low',
        eleve: 'High',
        act_en_retard: 'Overdue',
        act_en_retard_aide: 'Start date passed, not triggered',
        a_planifier: 'To Schedule',
        horizon_prochains: 'Next',
        mois: 'months',
        taux_cloture: 'Closure Rate',
        critiques: 'Critical',
        ouvertes: 'Open',
        en_retard: 'overdue',
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
        majeure: 'Major',
        mineure: 'Minor',
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
        details_suivi: 'Assessment and follow-up (CAA only)',
        resultats_suivi: 'Follow-up results',
        details_suivi_intro: 'Exchanges between the CAA and the applicant on each action-plan item.',
        suivi_rang: 'Follow-up',
        joindre_fichier: 'Attach a file',
        suivi_attente_soumission: 'Assessment opens once the provider has submitted the action plan.',
        soumettre: 'Submit',
        renvoyer: 'Return',
        ajouter_preuves: 'Add Evidence',
        amender_pac: 'Amend CAP',
        choisir_mode_pac: 'First choose "Add Evidence" or "Amend CAP"',
        mode_preuves_actif: 'Implementation evidence: only the evidence areas of the action plan are open.',
        mode_amendement_actif: 'Action plan amendment: every field is reopened. On submission the accepted plan is versioned and the workflow returns to the Acceptance stage.',
        mode_mixte_actif: 'Plan amendment and evidence upload: every field is open. On submission the amendment prevails — the accepted plan is versioned, evidence included, and the workflow returns to the Acceptance stage.',
        confirm_quitter_amendement: 'Give up the amendment? The action plan returns to its accepted version: the changes made, including those saved as a draft, are discarded. Uploaded evidence is kept.',
        plan_retabli: 'Action plan restored to its accepted version',
        confirm_soumettre_preuves: 'Submit the implementation evidence to the CAA? The workflow stays at the Implementation stage.',
        confirm_soumettre_amendement: 'Submit the amended action plan? The previous acceptance is cancelled and the workflow returns to the Acceptance stage.',
        preuves_soumises: 'Implementation evidence submitted',
        preuves_soumises_titre: 'Implementation evidence submitted',
        pac_amende: 'Action plan amended',
        pac_amende_soumis: 'Amended action plan submitted to the CAA',
        versions_pac: 'Previous versions of the action plan',
        version_n: 'Version',
        amende_le: 'amended on',
        accepter_pac: 'Accept CAP',
        accepter_pac_preuves: 'Accept CAP and Evidence',
        confirm_accepter_pac: 'Accept the corrective action plan? The Acceptance stage will close and implementation may start.',
        confirm_accepter_pac_preuves: 'Accept the action plan and the implementation evidence? Both the Acceptance and Implementation stages will close; the finding moves to closure.',
        pac_accepte_ok: 'Action plan accepted',
        pac_preuves_acceptes: 'Action plan and evidence accepted',
        volet_deplier: 'Expand comments',
        volet_replier: 'Collapse comments',
        item_label: 'Item',
        reponse_label: 'Applicant response',
        commentaires_label: 'Comments',
        cause_root: 'Root Cause',
        action_curative_correction: 'Curative Action (Immediate correction)',
        action_corrective_prevention: 'Corrective Action (Recurrence prevention)',
        acceptation_propositions: 'CAP acceptance',
        pac_accepte: 'Is the CAP accepted?',
        date_acceptation: 'Acceptance date',
        verification_mise_oeuvre: 'Implementation verification',
        isolement_realise: 'Isolation / Information completed?',
        risques_traites: 'Identified risks treated?',
        commentaire_efficacite: 'Comments on implementation and effectiveness',
        preuves_mise_oeuvre: 'Implementation evidence provided by the operator',
        cloture_fnc: 'Finding closure',
        mise_oeuvre_effective: 'Effective implementation of the actions',
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
        graph_emises: 'Findings issued',
        graph_criticite: 'Findings by criticality',
        emises_ouverte: 'Open',
        emises_cloture: 'Closed',
        graph_pac_titre: 'CAP of open findings',
        voir_donnees_source: 'View source data',
        ouvrir_constatation: 'Open the finding',
        archiver: 'Archive',
        archiver_plan: 'Archive the surveillance plan',
        archiver_plan_message: 'Plan \u00ab {plan} \u00bb and its {n} activities leave the supervision activities and move to the archived activities under States. Findings raised by those activities keep their follow-up and are not archived.',
        demander_changement: 'Request a change',
        demander_changement_aide: 'Discuss with the CAA before acknowledging receipt',
        accuser_reception: 'Acknowledge receipt',
        accuser_reception_aide: 'Acknowledge receipt and confirm the dates and scope',
        accuser_reception_message: 'You acknowledge receipt of the notification and declare yourself ready to host the team from {debut} to {fin}, on the announced scope. The message is posted in the discussion thread and the acknowledgement appears at the bottom of the form.',
        accuse_fait: 'Receipt acknowledged',
        accuse_deja: 'Receipt already acknowledged',
        accuse_ok: 'Receipt acknowledged',
        apercu_notification: 'Notification preview',
        secteur_label: 'Sector',
        chargement: 'Loading…',
        acces_refuse: 'Access denied.',
        processus_intro: 'Process actors, sector by sector.',
        proc_nouveau: 'New process',
        proc_modifier: 'Edit the process',
        proc_libelle: 'Name',
        proc_libelle_requis: 'A name is required.',
        proc_type: 'Process type',
        proc_type_activite: 'Activity process',
        proc_type_constatation: 'Finding process',
        proc_tous_types: 'All types',
        proc_etapes: 'Steps',
        proc_acteurs: 'Actors',
        proc_acteurs_par_etape: 'Actors per step',
        proc_ajouter_acteur: 'Add an actor',
        proc_aucun_acteur: 'No actor assigned.',
        proc_acteur_non_designe: '— Not assigned —',
        description: 'Description',
        item_requis: 'A name is required.',
        enregistre: 'Saved',
        supprime: 'Deleted',
        param_equipe: 'Audit / inspection team',
        roles_equipe_intro: 'Roles offered when composing the team at the Execution step, and to the team actors of processes.',
        roles_equipe_vide: 'No role defined — the built-in roles remain available.',
        role_equipe_supprimer_message: 'Role \u00ab {item} \u00bb will no longer be offered when composing teams.',
        proc_poste_non_designe: '— No position selected —',
        proc_equipe_non_designe: '— Not assigned (whole team) —',
        proc_role_libre: 'Role name',
        proc_dupliquer: 'Duplicate',
        proc_dupliquer_intro: 'Process \u00ab {source} \u00bb is used as a template: its steps and actors are copied.',
        proc_duplique: 'Process duplicated',
        proc_enregistre: 'Process saved',
        proc_supprimer: 'Delete the process',
        proc_supprimer_message: 'Process \u00ab {libelle} \u00bb and its actor assignments are deleted.',
        proc_supprime: 'Process deleted',
        version: 'Version',
        reinitialiser: 'Reset',
        reinitialiser_activite: 'Reset the activity to not triggered',
        reinitialiser_activite_message: 'The activity becomes triggerable again: the notification, the execution file and the related exchanges are deleted. The request is refused if findings or a report depend on it.',
        reinitialiser_ok: 'Activity reset',
        date_edition: 'Issue date',
        ajust_prorogation: 'Extension',
        ajust_criticite: 'Criticality',
        ajust_complet: 'Edit',
        ajust_prorogation_aide: 'Change the settlement deadline',
        ajust_criticite_aide: 'Change the settlement deadline and the criticality',
        ajust_complet_aide: 'Change every field of the finding recap',
        ajust_journal: 'Finding changes',
        ajust_rang: 'Change',
        ajust_aucun: 'No change recorded.',
        ajust_motif: 'Reason for the change',
        ajust_motif_aide: 'This reason stays attached to the finding.',
        ajust_motif_requis: 'A reason is required.',
        ajust_mot_de_passe: 'Confirm with your password',
        ajust_mot_de_passe_requis: 'The password is required.',
        ajust_intro: 'The finding has already been notified to the provider: the change is traced and attributed.',
        ajust_ok: 'Change recorded',
        appliquer: 'Apply',
        plan_archive_ok: 'Plan archived',
        archiver_hors_plan: 'Archive the other activities',
        archiver_hors_plan_message: 'The {n} activities outside the surveillance plan leave the supervision activities and move to the archived activities under States, grouped as \u00ab Autres Activit\u00e9s \u00bb. Findings raised by them keep their follow-up and are not archived.',
        hors_plan_archive_ok: 'Other activities archived',
        action_impossible: 'Action not possible',
        graph_pac_non_soumis: 'CAP not submitted',
        graph_pac_accepte: 'CAP accepted',
        graph_pac_rejete: 'CAP rejected',
        gantt_titre: 'Activity calendar',
        gantt_aujourdhui: 'Today',
        gantt_type_audit: 'Activity type',
        gantt_dates: 'Dates',
        gantt_lieu: 'Location',
        gantt_sans_activite: 'No planned activity',
        gantt_hors_plan: 'Outside the surveillance plan',
        gantt_origine: 'Origin',
        gantt_debut: 'Start of period',
        gantt_fin: 'End of period',
        gantt_reculer: 'Back',
        gantt_avancer: 'Forward',
        gantt_termine: 'Completed',
        gantt_en_cours: 'In progress',
        gantt_planifie: 'Planned',
        gantt_en_retard: 'Overdue',
        confirm_renvoyer: 'Confirm returning the CAP to the applicant? CAP fields will be reactivated.',
        confirm_solder: 'Confirm closing the finding? All fields will be locked.',
        motif_renvoi: 'Reason for return (visible to applicant)',
        motif_renvoi_titre: 'Reason for return',
        historique_decisions: 'Returns and rejections',
        transmis_sans_courriel: 'Transmission recorded, but no e-mail was sent: the mail server is not configured.',
        aide_historique_decisions: 'What was asked in earlier rounds, to review the corrections made.',
        motif_rejet_titre: 'Reason for rejection',
        constatation_rejetee_arret: 'The finding is rejected: the workflow stops here and it can no longer be edited.',
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
        suivi_choisir_item: 'First choose the item(s) concerned',
        suivi_saisir_commentaire: 'Enter the follow-up comment…',
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
        pac_etape_soumission: 'Submission',
        pac_etape_acceptation: 'Acceptance',
        pac_etape_mise_oeuvre: 'Implementation',
        pac_etape_cloture: 'Closure',
        pac_fil_en_cours: 'In progress',
        pac_fil_cloture: 'Closed',
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
        ajouter: 'Add',
        supprimer: 'Delete',
        preuve_dialogue_titre: 'Attachment',
        champ_amende: 'Amended field',
        preuve_date: 'Upload date',
        verifier_terrain: 'To be verified on site',
        preuves_non_acceptables: 'Not acceptable',
        cloturer: 'Close',
        votre_message: 'Your message…',
        modifier: 'Edit',
        non_transmis: 'Not sent',
        confirm_supprimer_commentaire: 'Delete this comment?',
        renvoyer_mise_oeuvre: 'Send back to implementation',
        renvoye_mise_oeuvre: 'Sent back to the Implementation stage',
        confirm_annuler_saisie: 'Discard unsaved entries? The form reloads as stored.',
        acceptation: 'Acceptable',
        preuves_recueillies: 'Implementation evidence collected',
        commentaire_general_suivi: 'General follow-up comment',
        aucun_suivi: 'No follow-up recorded',
        suivi_placeholder: 'Enter a follow-up comment…',
        ajouter_suivi: 'Add',
        preuves_refusees: 'Evidence rejected',
        preuves_refusees_titre: 'Implementation evidence not acceptable',
        preuves_acceptees_ok: 'Implementation evidence accepted',
        preuves_acceptees_titre: 'Implementation evidence accepted',
        verification_terrain_annoncee: 'An on-site verification will be carried out before the finding is closed.',
        confirm_accepter_preuves: 'Accept the implementation evidence? The Implementation stage will close and the finding moves to closure.',
        confirm_accepter_preuves_terrain: 'Accept the implementation evidence? The Implementation stage will close; an on-site verification remains to be carried out before closure.',
        motif_choisir: '— Reason for the change —',
        motif_preciser: 'Specify',
        motif_manquant: 'Reason for the change is required',
        motif_nouvelle_cause: 'New cause (added to the previous one)',
        motif_nouvelle_action: 'New action (added to the previous one)',
        motif_refonte_action: 'Action redesigned (replacement)',
        motif_modification_date: 'Date change',
        motif_observations_aac: 'Taking CAA comments into account',
        motif_correction_mineure: 'Minor correction (typos / wording)',
        motif_autres: 'Other',
        date_prevue_curative: 'Planned date — immediate action',
        date_prevue_corrective: 'Planned date — corrective action',
        modifier_piece: 'Edit attachment',
        ouvrir_piece: 'Open attachment',
        enregistrer: 'Save',
        preuve_intitule: 'Attachment title',
        preuve_intitule_exemple: 'e.g. training certificate dated 12/08/2026',
        preuve_intitule_requis: 'Title required',
        preuve_commentaire: 'Comment',
        preuve_commentaire_aide: 'For the CAA (optional)',
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
        consta_sub_list: 'Em preparacao',
        consta_sub_suivi: 'Acompanhamento',
        consta_sub_terrain: 'Acompanhamento no terreno',
        constatation_hors_activites: 'Constatacao fora das atividades de supervisao',
        cd_etape_preparation: 'Preparacao',
        realisation_intro: 'Confirme e ajuste as informacoes da atividade no terreno, depois redija o relatorio.',
        real_section_cadre: 'Enquadramento da atividade',
        redac_section_introduction: 'Introducao',
        redac_section_synthese: 'Sinteses e recomendacoes',
        redac_section_checklists: 'Checklists e outros documentos',
        redac_section_constatations: 'Constatacoes',
        redac_section_conclusion: 'Conclusoes',
        redac_section_annexes: 'Anexos',
        constatation: 'Constatacao',
        ajouter_constatation: 'Adicionar constatacao',
        fiches_constat: 'Fichas de constatacao',
        fiche_suivi_pac: 'Ficha de acompanhamento do PAC',
        a_completer_prestataire: '(a preencher pelo prestador)',
        a_completer_aac: '(reservado a AAC)',
        retour_rapport: 'Voltar ao relatorio',
        fnc_section_identification: 'Identificacao',
        fnc_section_constat: 'Constatacao',
        fnc_section_traitement: 'Tratamento esperado',
        fnc_section_preuves: 'Provas',
        fnc_aide_identification: 'Emissor, destinatario, data e enquadramento.',
        cd_aide_identification: 'Prestador em causa, emissor, destinatario, data e enquadramento.',
        fnc_aide_constat: 'Referenciais aplicaveis e descricao do desvio.',
        fnc_aide_traitement: 'Criticidade, prazo de encerramento e recomendacao.',
        fnc_aide_preuves: 'Elementos recolhidos em apoio da constatacao.',
        redac_aide_introduction: 'Enquadramento do relatorio: objeto, datas, equipa, ambito e referenciais.',
        redac_aide_synthese: 'Pontos fortes, pontos fracos, oportunidades e resumo global.',
        redac_aide_checklists: 'Checklists preenchidas e documentos recolhidos.',
        redac_aide_constatations: 'Desvios registados durante a atividade.',
        redac_aide_conclusion: 'Conclusao da atividade de supervisao.',
        redac_aide_annexes: 'Pecas anexadas ao relatorio: titulo, conteudo e ficheiros.',
        real_section_equipe: 'Equipa de auditoria / inspecao',
        real_section_programme: 'Programa de trabalho',
        real_section_checklists: 'Checklists a utilizar',
        real_section_pj: 'Anexos da atividade',
        real_nature: 'Natureza da atividade',
        real_aide_equipe: 'Inspetores mobilizados e respetivos papeis.',
        real_aide_programme: 'Programa previsto: data, horario, acoes e interlocutor.',
        real_aide_checklists: 'Checklists retidas para esta atividade.',
        real_aide_pj: 'Documentos recolhidos durante a atividade.',
        televerser_pj: 'Carregar anexos',
        aucune_piece_jointe: 'Sem anexos.',
        cd_etape_validation: 'Validacao',
        cd_etape_transmission: 'Transmissao',
        imprimer_constatation: 'Imprimir',
        transmission_constatation: 'Transmissao da constatacao ao prestador',
        export_excel: 'Exportar Excel',
        export_route_absente: 'Exportacao indisponivel: reinicie o servidor para carregar a rota de exportacao.',
        exp_annee: 'Ano',
        exp_recherche: 'Pesquisa',
        edite_le: 'Emitido em',
        aucun_filtre: 'Sem filtro',
        visa_inspecteur: 'Visto do inspetor',
        visa_prestataire: 'Visto do prestador',
        bloqueur_fenetre: 'Autorize as janelas para gerar o PDF',
        a_verifier_terrain: 'constatacao(oes) a verificar no terreno',
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
        dont: 'dos quais',
        hors_activite_court: 'fora de atividade',
        situation_generale: 'Situacao Geral',
        statistiques_detaillees: 'Estatisticas detalhadas',
        periode_analysee: 'Periodo analisado',
        filtre_temporel: 'Filtro temporal de inspecao',
        periode_examinee: 'Periodo examinado',
        chrono_date_debut: 'Data de inicio', chrono_date_fin: 'Data de fim',
        fin: 'Fim',
        cycle_surveillance: 'Ciclo de vigilancia definido em «Planos de Vigilancia»',
        cycle_court: 'Ciclo',
        chrono_12_mois: '12 meses', chrono_6_mois: '6 meses', chrono_3_mois: '3 meses',
        chrono_tout: 'Tudo',
        statistiques: 'Estatisticas',
        voir_statistiques: 'Ver as Estatisticas',
        indicateurs: 'Indicadores',
        indicateurs_conformite: 'Indicadores de conformidade',
        detail_indicateur: 'Detalhe do indicador',
        aucun_indicateur: 'Escolha um indicador acima para ver o detalhe.',
        stats_criticite: 'Constatacoes criticas e maiores',
        stats_complementaires: 'Indicadores complementares',
        stats_critiques: 'Criticas',
        stats_critiques_aide: 'Constatacoes de criticidade critica',
        stats_critiques_delai: 'Resolvidas no prazo',
        stats_echeance: 'Vencimento',
        stats_moyenne_mensuelle: 'Media mensal',
        stats_moyenne_aide: 'Criticas e maiores por mes',
        stats_cloture_majeures: 'Encerramento das maiores',
        stats_recurrentes: 'Recorrentes',
        stats_recurrentes_aide: 'Mesmo objeto, mesmo prestador',
        stats_repetition: 'Repetida', stats_isolee: 'Isolada',
        stats_total_suivi: 'Total acompanhado',
        stats_total_aide: 'Constatacoes transmitidas',
        stats_cloture_globale: 'Encerramento global',
        stats_hors_delai: 'Fora do prazo',
        stats_hors_delai_aide: 'Nao encerradas, prazo ultrapassado',
        stats_delai_moyen: 'Prazo medio',
        stats_delai_moyen_aide: 'Da abertura ao encerramento',
        stats_rapports_aide: 'Entregues aos prestadores',
        stats_top_prestataires: 'Top 5 prestadores por numero de constatacoes',
        depasse: 'Ultrapassado',
        debut: 'Inicio',
        sur: 'de',
        realisees_court: 'realizadas',
        cloturees_court: 'encerradas',
        action_immediate: 'Exigindo acao imediata',
        en_attente_traitement: 'A aguardar tratamento',
        en_attente: 'Pendente',
        en_cours_court: 'Em curso',
        cloture_court: 'Encerrado',
        faible: 'Baixo',
        eleve: 'Elevado',
        act_en_retard: 'Em atraso',
        act_en_retard_aide: 'Inicio ultrapassado, nao desencadeadas',
        a_planifier: 'A Planear',
        horizon_prochains: 'Proximos',
        mois: 'meses',
        taux_cloture: 'Taxa de Encerramento',
        critiques: 'Criticas',
        ouvertes: 'Abertas',
        en_retard: 'em atraso',
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
        majeure: 'Maior',
        mineure: 'Menor',
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
        details_suivi: 'Avaliacoes e Acompanhamento (Reservado AAC)',
        resultats_suivi: 'Resultados do Acompanhamento',
        details_suivi_intro: 'Trocas entre a AAC e o postulante sobre cada item do plano de acoes.',
        suivi_rang: 'Acompanhamento',
        joindre_fichier: 'Anexar um ficheiro',
        suivi_attente_soumission: 'A avaliacao abre assim que o prestador submeter o plano de acoes.',
        soumettre: 'Submeter',
        renvoyer: 'Devolver',
        ajouter_preuves: 'Adicionar Provas',
        amender_pac: 'Alterar PAC',
        choisir_mode_pac: 'Escolha primeiro Adicionar Provas ou Alterar PAC',
        mode_preuves_actif: 'Deposito das provas de implementacao: apenas as zonas de provas do plano estao abertas.',
        mode_amendement_actif: 'Alteracao do plano de acoes: todos os campos foram reabertos. Na submissao, o plano aceite sera versionado e o circuito volta a etapa Aceitacao.',
        mode_mixte_actif: 'Alteracao do plano e deposito das provas: todos os campos estao abertos. Na submissao, a alteracao prevalece — o plano aceite sera versionado, provas incluidas, e o circuito volta a etapa Aceitacao.',
        confirm_quitter_amendement: 'Desistir da alteracao? O plano volta a versao aceite: as modificacoes, incluindo as guardadas em rascunho, sao descartadas. As provas depositadas sao mantidas.',
        plan_retabli: 'Plano de acoes reposto na versao aceite',
        confirm_soumettre_preuves: 'Submeter as provas de implementacao a AAC? O circuito permanece na etapa Implementacao.',
        confirm_soumettre_amendement: 'Submeter o plano de acoes alterado? A aceitacao anterior e anulada: o circuito volta a etapa Aceitacao.',
        preuves_soumises: 'Provas de implementacao submetidas',
        preuves_soumises_titre: 'Provas de implementacao submetidas',
        pac_amende: 'Plano de acoes alterado',
        pac_amende_soumis: 'Plano de acoes alterado submetido a AAC',
        versions_pac: 'Versoes anteriores do plano de acoes',
        version_n: 'Versao',
        amende_le: 'alterado em',
        accepter_pac: 'Aceitar PAC',
        accepter_pac_preuves: 'Aceitar PAC e Provas',
        confirm_accepter_pac: 'Aceitar o plano de acoes corretivas? A etapa Aceitacao sera encerrada e a implementacao podera comecar.',
        confirm_accepter_pac_preuves: 'Aceitar o plano de acoes e as provas de implementacao? As etapas Aceitacao e Implementacao serao encerradas; a constatacao passa ao encerramento.',
        pac_accepte_ok: 'Plano de acoes aceite',
        pac_preuves_acceptes: 'Plano de acoes e provas aceites',
        volet_deplier: 'Expandir comentarios',
        volet_replier: 'Recolher comentarios',
        item_label: 'Item',
        reponse_label: 'Resposta do postulante',
        commentaires_label: 'Comentarios',
        cause_root: 'Causa Primaria (Root cause)',
        action_curative_correction: 'Acao Curativa (Correcao imediata)',
        action_corrective_prevention: 'Acao Corretiva (Prevencao de recorrencia)',
        acceptation_propositions: 'Aceitacao do PAC',
        pac_accepte: 'O PAC e aceito?',
        date_acceptation: 'Data de aceitacao',
        verification_mise_oeuvre: 'Verificacao da implementacao',
        isolement_realise: 'Isolamento / Informacao realizada?',
        risques_traites: 'Tratamento dos Riscos identificados?',
        commentaire_efficacite: 'Comentario sobre implementacao e eficacia',
        preuves_mise_oeuvre: 'Provas de implementacao fornecidas pelo operador',
        cloture_fnc: 'Encerramento da Ficha de Nao-Conformidade',
        mise_oeuvre_effective: 'Implementacao Efetiva das Acoes',
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
        graph_emises: 'Constatacoes emitidas',
        graph_criticite: 'Constatacoes por criticidade',
        emises_ouverte: 'Aberta',
        emises_cloture: 'Encerrada',
        graph_pac_titre: 'PAC das constatacoes abertas',
        voir_donnees_source: 'Ver os dados de origem',
        ouvrir_constatation: 'Abrir a constatacao',
        archiver: 'Arquivar',
        archiver_plan: 'Arquivar o plano de vigilancia',
        archiver_plan_message: 'O plano \u00ab {plan} \u00bb e as suas {n} atividades saem das atividades de supervisao e passam para as atividades arquivadas do menu Estados. As constatacoes resultantes mantem o seu seguimento e nao sao arquivadas.',
        demander_changement: 'Pedir alteracao',
        demander_changement_aide: 'Dialogar com a AAC antes de acusar a rececao',
        accuser_reception: 'Acusar rececao',
        accuser_reception_aide: 'Acusar rececao e confirmar as datas e o ambito',
        accuser_reception_message: 'Acusa a rececao da notificacao e declara-se disposto a receber a equipa de {debut} a {fin}, no ambito anunciado. A mensagem e publicada no fio de discussao e o aviso figura no fim da ficha.',
        accuse_fait: 'Rececao acusada',
        accuse_deja: 'Rececao ja acusada',
        accuse_ok: 'Rececao acusada',
        apercu_notification: 'Pre-visualizacao da notificacao',
        secteur_label: 'Setor',
        chargement: 'A carregar…',
        acces_refuse: 'Acesso recusado.',
        processus_intro: 'Intervenientes dos processos, setor a setor.',
        proc_nouveau: 'Novo processo',
        proc_modifier: 'Modificar o processo',
        proc_libelle: 'Designacao',
        proc_libelle_requis: 'A designacao e obrigatoria.',
        proc_type: 'Tipo de processo',
        proc_type_activite: 'Processo atividade',
        proc_type_constatation: 'Processo constatacao',
        proc_tous_types: 'Todos os tipos',
        proc_etapes: 'Etapas',
        proc_acteurs: 'Intervenientes',
        proc_acteurs_par_etape: 'Intervenientes por etapa',
        proc_ajouter_acteur: 'Adicionar interveniente',
        proc_aucun_acteur: 'Nenhum interveniente designado.',
        proc_acteur_non_designe: '— Nao designado —',
        description: 'Descricao',
        item_requis: 'A designacao e obrigatoria.',
        enregistre: 'Guardado',
        supprime: 'Eliminado',
        param_equipe: 'Equipa de auditoria / inspecao',
        roles_equipe_intro: 'Papeis propostos na composicao da equipa, na etapa Realizacao, e aos intervenientes de equipa dos processos.',
        roles_equipe_vide: 'Nenhum papel definido — os papeis de origem continuam propostos.',
        role_equipe_supprimer_message: 'O papel \u00ab {item} \u00bb deixara de ser proposto na composicao das equipas.',
        proc_poste_non_designe: '— Cargo nao designado —',
        proc_equipe_non_designe: '— Nao designado (toda a equipa) —',
        proc_role_libre: 'Designacao do papel',
        proc_dupliquer: 'Duplicar',
        proc_dupliquer_intro: 'O processo \u00ab {source} \u00bb serve de modelo: as suas etapas e intervenientes sao copiados.',
        proc_duplique: 'Processo duplicado',
        proc_enregistre: 'Processo guardado',
        proc_supprimer: 'Eliminar o processo',
        proc_supprimer_message: 'O processo \u00ab {libelle} \u00bb e a designacao dos seus intervenientes sao eliminados.',
        proc_supprime: 'Processo eliminado',
        version: 'Versao',
        reinitialiser: 'Reiniciar',
        reinitialiser_activite: 'Reiniciar a atividade como nao desencadeada',
        reinitialiser_activite_message: 'A atividade volta a poder ser desencadeada: a notificacao, o processo de execucao e as trocas associadas sao eliminados. O pedido e recusado se existirem constatacoes ou relatorio dependentes.',
        reinitialiser_ok: 'Atividade reiniciada',
        date_edition: 'Data de emissao',
        ajust_prorogation: 'Prorrogacao',
        ajust_criticite: 'Criticidade',
        ajust_complet: 'Modificar',
        ajust_prorogation_aide: 'Alterar o prazo de encerramento',
        ajust_criticite_aide: 'Alterar o prazo de encerramento e a criticidade',
        ajust_complet_aide: 'Alterar todos os campos do resumo da constatacao',
        ajust_journal: 'Alteracoes da constatacao',
        ajust_rang: 'Alteracao',
        ajust_aucun: 'Nenhuma alteracao registada.',
        ajust_motif: 'Motivo da alteracao',
        ajust_motif_aide: 'Este motivo fica associado a constatacao.',
        ajust_motif_requis: 'O motivo e obrigatorio.',
        ajust_mot_de_passe: 'Confirme com a sua palavra-passe',
        ajust_mot_de_passe_requis: 'A palavra-passe e obrigatoria.',
        ajust_intro: 'A constatacao ja foi notificada ao prestador: a alteracao e registada e atribuida.',
        ajust_ok: 'Alteracao registada',
        appliquer: 'Aplicar',
        plan_archive_ok: 'Plano arquivado',
        archiver_hors_plan: 'Arquivar as outras atividades',
        archiver_hors_plan_message: 'As {n} atividades fora do plano de vigilancia saem das atividades de supervisao e passam para as atividades arquivadas do menu Estados, agrupadas em \u00ab Autres Activit\u00e9s \u00bb. As constatacoes resultantes mantem o seu seguimento e nao sao arquivadas.',
        hors_plan_archive_ok: 'Outras atividades arquivadas',
        action_impossible: 'Acao impossivel',
        graph_pac_non_soumis: 'PAC nao submetido',
        graph_pac_accepte: 'PAC aceite',
        graph_pac_rejete: 'PAC rejeitado',
        gantt_titre: 'Calendario das atividades',
        gantt_aujourdhui: 'Hoje',
        gantt_type_audit: 'Tipo de atividade',
        gantt_dates: 'Datas',
        gantt_lieu: 'Local',
        gantt_sans_activite: 'Sem atividade planeada',
        gantt_hors_plan: 'Fora do plano de vigilancia',
        gantt_origine: 'Origem',
        gantt_debut: 'Inicio do periodo',
        gantt_fin: 'Fim do periodo',
        gantt_reculer: 'Recuar',
        gantt_avancer: 'Avancar',
        gantt_termine: 'Concluida',
        gantt_en_cours: 'Em curso',
        gantt_planifie: 'Planeada',
        gantt_en_retard: 'Em atraso',
        confirm_renvoyer: 'Confirmar a devolucao do PAC ao postulante? Os campos do PAC serao reativados.',
        confirm_solder: 'Confirmar o encerramento da constatacao? Todos os campos serao bloqueados.',
        motif_renvoi: 'Motivo da devolucao (visivel pelo postulante)',
        motif_renvoi_titre: 'Motivo da devolucao',
        historique_decisions: 'Devolucoes e rejeicoes',
        transmis_sans_courriel: 'Transmissao registada, mas nenhum e-mail foi enviado: o servidor de correio nao esta configurado.',
        aide_historique_decisions: 'O que foi pedido nas voltas anteriores, para rever as correcoes feitas.',
        motif_rejet_titre: 'Motivo da rejeicao',
        constatation_rejetee_arret: 'A constatacao foi rejeitada: o circuito para aqui e ja nao pode ser alterada.',
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
        suivi_choisir_item: 'Escolha primeiro os itens em causa',
        suivi_saisir_commentaire: 'Escrever o comentario de acompanhamento…',
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
        pac_etape_soumission: 'Submissao',
        pac_etape_acceptation: 'Aceitacao',
        pac_etape_mise_oeuvre: 'Implementacao',
        pac_etape_cloture: 'Encerramento',
        pac_fil_en_cours: 'Em curso',
        pac_fil_cloture: 'Encerrado',
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
        ajouter: 'Adicionar',
        supprimer: 'Eliminar',
        preuve_dialogue_titre: 'Anexo',
        champ_amende: 'Campo alterado',
        preuve_date: 'Data de deposito',
        verifier_terrain: 'A verificar no terreno',
        preuves_non_acceptables: 'Nao aceitavel',
        cloturer: 'Encerrar',
        votre_message: 'A sua mensagem…',
        modifier: 'Alterar',
        non_transmis: 'Nao enviado',
        confirm_supprimer_commentaire: 'Eliminar este comentario?',
        renvoyer_mise_oeuvre: 'Devolver a implementacao',
        renvoye_mise_oeuvre: 'Devolvido a etapa Implementacao',
        confirm_annuler_saisie: 'Abandonar as entradas nao guardadas? O formulario recarrega como esta guardado.',
        acceptation: 'Aceitavel',
        preuves_recueillies: 'Provas de implementacao recolhidas',
        commentaire_general_suivi: 'Comentario geral de acompanhamento',
        aucun_suivi: 'Nenhum acompanhamento registado',
        suivi_placeholder: 'Escrever um comentario de acompanhamento…',
        ajouter_suivi: 'Adicionar',
        preuves_refusees: 'Provas recusadas',
        preuves_refusees_titre: 'Provas de implementacao nao aceitaveis',
        preuves_acceptees_ok: 'Provas de implementacao aceites',
        preuves_acceptees_titre: 'Provas de implementacao aceites',
        verification_terrain_annoncee: 'Sera realizada uma verificacao no terreno antes do encerramento da constatacao.',
        confirm_accepter_preuves: 'Aceitar as provas de implementacao? A etapa Implementacao sera encerrada e a constatacao passa ao encerramento.',
        confirm_accepter_preuves_terrain: 'Aceitar as provas de implementacao? A etapa Implementacao sera encerrada; falta ainda uma verificacao no terreno antes do encerramento.',
        motif_choisir: '— Objeto da alteracao —',
        motif_preciser: 'Precisar',
        motif_manquant: 'Objeto da alteracao obrigatorio',
        motif_nouvelle_cause: 'Nova causa (acrescimo a anterior)',
        motif_nouvelle_action: 'Nova acao (acrescimo a anterior)',
        motif_refonte_action: 'Reformulacao da acao (substituicao)',
        motif_modification_date: 'Alteracao de data',
        motif_observations_aac: 'Consideracao das observacoes da AAC',
        motif_correction_mineure: 'Correcao menor (tipografia / clareza)',
        motif_autres: 'Outros',
        date_prevue_curative: 'Data prevista — acao imediata',
        date_prevue_corrective: 'Data prevista — acao corretiva',
        modifier_piece: 'Alterar anexo',
        ouvrir_piece: 'Abrir anexo',
        enregistrer: 'Guardar',
        preuve_intitule: 'Titulo do anexo',
        preuve_intitule_exemple: 'Ex.: certificado de formacao de 12/08/2026',
        preuve_intitule_requis: 'Titulo obrigatorio',
        preuve_commentaire: 'Comentario',
        preuve_commentaire_aide: 'A atencao da AAC (facultativo)',
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

function _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Valeur destinée à un attribut : `_esc` laisse passer les guillemets, qui y
// refermeraient l'attribut. Tout texte saisi peut en contenir.
function _escAttr(valeur) {
    return _esc(valeur).replace(/"/g, '&quot;');
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
    const head = includeEmpty !== false ? `<option value="">${te('select_option') || 'Sélectionner'}</option>` : '';
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
        EXEC_STATE.data.plansArchivesPlanif = _buildPlansArchivesFromPlanif(planifPlans, planifActs);
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
    const rendues = {};
    (planifActs || []).forEach(a => {
        if (Number(a.desarchivee) !== 1 || a.plan_statut === 'valide') return;
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

// Plans archivés : ceux qu'on a rangés délibérément. Sont écartés ceux que la
// Planification archive d'elle-même quand une nouvelle version les remplace —
// ils portent `remplace_par`, et leurs activités sont reprises par la version
// suivante : les faire figurer aux archives les compterait deux fois.
function _buildPlansArchivesFromPlanif(planifPlans, planifActs) {
    const plans = (planifPlans || []).filter(p => p.statut === 'archive' && !p.remplace_par);
    if (!plans.length) return [];
    const ids = new Set(plans.map(p => p.id));
    const prestMap = {};
    (EXEC_STATE.data?.prestataires || window.PESSCO?.sharedData?.prestataires || []).forEach(pr => {
        prestMap[pr.id] = pr;
    });
    const byPlanId = {};
    (planifActs || []).forEach(a => {
        if (!ids.has(a.plan_id)) return;
        // Une activité sortie des archives isolément ne figure plus ici :
        // elle a rejoint les activités en cours.
        if (Number(a.desarchivee) === 1) return;
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
    localStorage.setItem('pr_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.theme === theme));
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
            if (config.reserve === 'admin' && !_execPeutProcessus()) continue;
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
            <p style="color:var(--text-muted);">${rows.length} ${te('notifications') || 'notification(s)'}</p>
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
                        <th style="width:95px;">${te('date_edition') || 'Date'}</th>
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

// ══════════════════════════════════════
//  1. DASHBOARD
// ══════════════════════════════════════



// Répartition en table plutôt qu'en anneau : le volume exact se lit dans la
// colonne, la micro-barre ne sert qu'à comparer les lignes entre elles — elle
// est donc calée sur la plus forte, pas sur le total.
// Le total est passé à part : certaines répartitions se recoupent (une
// constatation hors délai est aussi une constatation ouverte), la somme des
// lignes ne vaut donc pas toujours l'effectif.
function _execTableauRepartition(titre, lignes, total) {
    const rows = lignes || [];
    const max = Math.max(1, ...rows.map(s => s.value || 0));
    const somme = total != null ? total : rows.reduce((s, x) => s + (x.value || 0), 0);
    return `
    <div class="exec-crit-bloc">
        <div class="exec-crit-titre">
            <span>${_esc(titre)}</span>
            <strong class="exec-crit-total">${somme}</strong>
        </div>
        <table class="exec-crit-tab">
            <tbody>
                ${rows.map(s => {
                    // Une ligne porteuse d'une clé ouvre le détail sous les
                    // indicateurs, comme les cartes de conformité.
                    const actif = s.cle && s.cle === (EXEC_STATE.statsIndicateur || '');
                    const attrs = s.cle
                        ? ` class="cliquable${actif ? ' actif' : ''}" onclick="execStatsIndicateur('${s.cle}')"
                            role="button" tabindex="0" title="${_escAttr(te('voir_donnees_source'))}"`
                        : '';
                    return `
                <tr${attrs}>
                    <td><span class="exec-crit-badge" style="background:${s.color};">${_esc(s.label)}</span></td>
                    <td class="num">${s.value || 0}</td>
                    <td>
                        <div class="exec-crit-piste">
                            <div class="exec-crit-barre" style="width:${Math.round(((s.value || 0) / max) * 100)}%;background:${s.color};"></div>
                        </div>
                    </td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// ── Ce qu'une constatation pèse dans les indicateurs ─────────────
// Elle compte dès qu'elle est notifiée au prestataire, quelle que soit son
// origine : relevée pendant une activité de surveillance, ou émise hors
// activité. Un brouillon, une soumission en cours de validation ou un rejet
// n'existent pas pour le prestataire — ils ne pèsent pas.
const EXEC_CONSTA_EN_VIGUEUR = new Set(['ouvert', 'ouverte', 'pac_soumis',
    'pac_valide', 'pac_rejetee', 'soldee']);

function _execConstaEnVigueur(c) {
    return EXEC_CONSTA_EN_VIGUEUR.has(String((c || {}).statut || ''));
}

// Constatation hors activité de supervision : elle ne se rattache à aucun
// dossier d'exécution.
function _execConstaHorsActivite(c) {
    return !(c || {}).dossier_id;
}

// Échéance de solde d'une constatation. `delai_solde` est un nombre de jours,
// jamais une date : le confondre avec l'échéance faussait les alertes.
function _execConstaEcheance(c) {
    return (c || {}).date_due_cloture || (c || {}).date_due || '';
}

// ── Situation Générale ───────────────────────────────────────────
// Le regroupement Domaine → Secteur → Prestataire, ses agrégats et son
// accordéon. Le tableau de bord s'en sert pour ses cartes et ses donuts ;
// le formulaire « Statistiques détaillées » l'affiche en propre, avec ses
// propres filtres. Une seule fonction, donc les mêmes chiffres partout.
function _execSituationGenerale(F) {
    F = F || EXEC_STATE.filters || {};
    const isPrest = _execIsPrestataire();
    const scopedPid = (EXEC_STATE.user || {}).prestataire_id || '';
    const notifs = EXEC_STATE.data.notifications || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    let constatations = EXEC_STATE.data.constatations || [];
    const plansValides = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    const POST_TRANSMIT = EXEC_CONSTA_EN_VIGUEUR;
    const secteurs = EXEC_STATE.data.secteurs || [];
    const domaines = EXEC_STATE.data.domaines || [];
    // Compte prestataire : la portée est l’ensemble de ses rattachements,
    // resserrée sur celui qu’il a choisi au filtre.
    const mesPrest = _execPortePrestataire(F.prestataire);
    if (mesPrest) constatations = constatations.filter(c => mesPrest.includes(c.prestataire_id));
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
        allActivities = allActivities.filter(a => mesPrest.includes(a.prestataire_id));
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

    // Les cartes portent sur les constatations en vigueur : brouillons,
    // soumissions et rejets en étaient jusqu'ici comptés comme « ouvertes ».
    const constEnVigueur = filteredConstatations.filter(_execConstaEnVigueur);
    const totalConst = constEnVigueur.length;
    const closedConst = constEnVigueur.filter(c => c.statut === 'soldee').length;
    const tauxClotureConst = totalConst > 0 ? Math.round((closedConst / totalConst) * 100) : 0;

    const ouvertes = constEnVigueur.filter(c => c.statut !== 'soldee');
    const fncOuvertes = ouvertes.length;
    const fncCritiques = ouvertes.filter(c => (c.criticite || c.gravite || '').toLowerCase() === 'critique').length;
    // Part des constatations émises hors activité de supervision.
    const horsActivite = constEnVigueur.filter(_execConstaHorsActivite).length;
    const horsActiviteOuvertes = ouvertes.filter(_execConstaHorsActivite).length;

    // Échéances : les constatations déjà en retard passent devant, puis celles
    // qui arrivent à terme sous quinze jours. Le retard était jusqu'ici exclu.
    const fncAlerts = constEnVigueur
        .filter(c => c.statut !== 'soldee')
        .map(c => ({ ...c, _jours: _daysUntil(_execConstaEcheance(c)) }))
        .filter(c => c._jours !== null && c._jours <= 15)
        .sort((a, b) => a._jours - b._jours)
        .slice(0, 8);
    const fncEnRetard = fncAlerts.filter(c => c._jours < 0).length;
    // Le retard compté sur fncAlerts s'arrête aux huit alertes affichées :
    // pour un effectif, il faut balayer toutes les constatations ouvertes.
    const fncHorsDelai = ouvertes.filter(c => {
        const j = _daysUntil(_execConstaEcheance(c));
        return j !== null && j < 0;
    }).length;

    // Où en est le plan d'actions correctives des constatations ouvertes.
    // Le statut suffit : le PAC suit le cycle ouvert → pac_soumis → pac_valide,
    // avec pac_rejetee en retour vers le prestataire.
    const _st = c => (c.statut || '').toLowerCase();
    const pacNonSoumis = ouvertes.filter(c => _st(c) === 'ouvert' || _st(c) === 'ouverte').length;
    const pacAccepte = ouvertes.filter(c => _st(c) === 'pac_valide').length;
    const pacRejete = ouvertes.filter(c => _st(c) === 'pac_rejetee').length;
    // Reste les PAC soumis en attente d'examen : ils n'entrent dans aucune des
    // trois lignes, la somme ne vaut donc pas toujours l'effectif ouvert.
    const pacEnExamen = ouvertes.filter(c => _st(c) === 'pac_soumis').length;


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

    // ── Activités : ce qui reste à déclencher, ce qui a pris du retard ──
    // La répartition du menu « États » fait foi : mêmes délais, mêmes règles,
    // mêmes chiffres d'un écran à l'autre.
    const etats = typeof execEtatsRepartir === 'function' ? execEtatsRepartir() : null;
    const ligneRetenue = (l) => {
        const pId = l.prestataire_id || '';
        if (mesPrest && !mesPrest.includes(pId)) return false;
        if (F.prestataire && pId !== F.prestataire) return false;
        if (F.domaine && (prestDomaineLookup[pId] || {}).domaine_id !== F.domaine) return false;
        const debut = String(l.debut || '');
        if (F.annee && debut.slice(0, 4) !== String(F.annee)) return false;
        if (F.trimestre) {
            if (debut.length < 7) return false;
            if (String(Math.ceil(parseInt(debut.slice(5, 7)) / 3)) !== String(F.trimestre)) return false;
        }
        return true;
    };
    // Les activités qui attendent d'être déclenchées se partagent en deux :
    // celles dont la date de début est passée — en retard — et celles qui
    // restent à planifier dans l'horizon.
    const attente = etats ? etats.aDeclencher.filter(ligneRetenue) : [];
    const aujourdhuiIso = new Date().toISOString().slice(0, 10);
    const actEnRetard = attente.filter((l) => String(l.debut || '') < aujourdhuiIso).length;
    const aDeclencher = attente.filter((l) => String(l.debut || '') >= aujourdhuiIso);
    const horizonMois = (typeof EXEC_ETATS !== 'undefined' && EXEC_ETATS.delais
        && EXEC_ETATS.delais.horizon_a_declencher) || 3;

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
    if (mesPrest) {
        closedDossiers = closedDossiers.filter(d => !d.prestataire_id || mesPrest.includes(d.prestataire_id));
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

    // Un taux se lit d'abord à sa couleur : vert tenu, ambre à surveiller,
    // rouge en défaut. Le même barème sert aux bandeaux et aux cellules, pour
    // qu'un même chiffre ne change pas de sens selon l'endroit où on le lit.
    const sgNiveau = (pct) => (pct >= 80 ? 'bon' : (pct >= 50 ? 'moyen' : 'faible'));
    const sgTaux = (pct, base) => (base > 0
        ? `<span class="exec-sg-taux ${sgNiveau(pct)}">${pct}%</span>`
        : '<span class="exec-sg-vide">—</span>');
    // Un zéro n'est pas une mesure : il s'efface pour laisser voir les autres.
    const sgNombre = (n) => (n > 0 ? String(n) : '<span class="exec-sg-vide">0</span>');

    // Largeurs déclarées ici : avec table-layout fixed, seule la première
    // rangée compte, et elle porte les regroupements — pas les colonnes.
    const prestTableHeader = `
        <colgroup>
            <col class="sg-col-nom">
            ${[...Array(3 + (criticites.length + 1) * 2)].map(() => '<col class="sg-col-num">').join('')}
        </colgroup>
        <thead>
        <tr class="exec-sg-groupes">
            <th></th>
            <th colspan="3" class="exec-sg-bloc">Activités</th>
            <th colspan="${criticites.length + 1}" class="exec-sg-bloc">Nombre de constatations</th>
            <th colspan="${criticites.length + 1}" class="exec-sg-bloc">Taux de clôture des constatations</th>
        </tr>
        <tr class="exec-sg-colonnes">
            <th class="exec-sg-col-nom">${te('provider')}</th>
            <th class="exec-sg-bloc">Planifiées</th>
            <th>Clôturées</th>
            <th>Taux</th>
            ${criticites.map((cr, i) => `<th${i === 0 ? ' class="exec-sg-bloc"' : ''}>${te(cr) || cr}</th>`).join('')}
            <th>${te('total') || 'Total'}</th>
            ${criticites.map((cr, i) => `<th${i === 0 ? ' class="exec-sg-bloc"' : ''}>${te(cr) || cr}</th>`).join('')}
            <th>${te('total') || 'Total'}</th>
        </tr></thead>`;

    const renderStatsCells = (s, opts) => {
        const fort = (opts && opts.aggregate) ? ' fort' : '';
        const crit = s.byCrit || s.constByCrit;
        return `
            <td class="num${fort} exec-sg-bloc">${sgNombre(s.planned)}</td>
            <td class="num${fort}">${sgNombre(s.closed)}</td>
            <td class="num">${sgTaux(s.execRate, s.planned)}</td>
            ${criticites.map((cr, i) => `<td class="num${fort}${i === 0 ? ' exec-sg-bloc' : ''}">${sgNombre(crit[cr].count)}</td>`).join('')}
            <td class="num total">${sgNombre(s.totalPConst)}</td>
            ${criticites.map((cr, i) => {
                const cell = crit[cr];
                const rate = cell.rate !== undefined ? cell.rate : (cell.count > 0 ? Math.round((cell.closed / cell.count) * 100) : 0);
                return `<td class="num${i === 0 ? ' exec-sg-bloc' : ''}">${sgTaux(rate, cell.count)}</td>`;
            }).join('')}
            <td class="num total">${sgTaux(s.totalClotRate, s.totalPConst)}</td>`;
    };

    // Bandeau de regroupement : le nom à gauche, les mesures en pastilles
    // calées à droite. Deux niveaux, deux graphies, pour qu'on sache sans
    // lire si l'on est devant un domaine ou devant l'un de ses secteurs.
    const sgMesure = (libelle, valeur) =>
        `<span class="exec-sg-mesure"><span class="lib">${_esc(libelle)}</span><span class="val">${valeur}</span></span>`;

    const sgBandeau = (niveau, nom, denombrement, agg) => `
        <div class="exec-accordion-header exec-sg-bandeau ${niveau}"
             onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown || '▾'}</span>
            <span class="exec-sg-etiquette">${niveau === 'domaine' ? 'Domaine' : 'Secteur'}</span>
            <span class="exec-sg-nom">${_esc(nom)}</span>
            <span class="exec-sg-sous">${_esc(denombrement)}</span>
            <span class="exec-sg-mesures">
                ${sgMesure('Activités', sgNombre(agg.planned))}
                ${sgMesure('Clôturées', sgNombre(agg.closed))}
                ${sgMesure('Taux exé.', sgTaux(agg.execRate, agg.planned))}
                ${sgMesure('Constat.', sgNombre(agg.totalPConst))}
                ${sgMesure('Taux clôt.', sgTaux(agg.totalClotRate, agg.totalPConst))}
            </span>
        </div>`;

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
                return `<tr data-domaine="${_escAttr(dName)}" data-secteur="${_escAttr(sName)}">
                    <td>${_esc(s.prestataire_nom)}</td>
                    ${renderStatsCells(s)}
                </tr>`;
            }).join('');

            // Ligne de total : elle n'a de sens qu'à partir de deux prestataires,
            // sinon elle répète mot pour mot la ligne au-dessus.
            const totalHtml = pKeys.length > 1 ? `
                <tfoot><tr>
                    <td>Total ${_esc(sName)}</td>
                    ${renderStatsCells(sAgg, { aggregate: true })}
                </tr></tfoot>` : '';

            // Un domaine à secteur unique n'a rien à replier : on montre la table.
            secteursHtml += `
            <div class="sg-secteur card${sKeys.length === 1 ? ' expanded' : ''}">
                ${sgBandeau('secteur', sName, `${pKeys.length} prestataire${pKeys.length > 1 ? 's' : ''}`, sAgg)}
                <div class="exec-accordion-body">
                    <div class="sg-table-boite">
                        <table class="exec-table sg-prest-table">
                            ${prestTableHeader}
                            <tbody>${rowsHtml}</tbody>
                            ${totalHtml}
                        </table>
                    </div>
                </div>
            </div>`;
        });

        accordionHtml += `
        <div class="sg-domaine card expanded">
            ${sgBandeau('domaine', dName, `${sKeys.length} secteur${sKeys.length > 1 ? 's' : ''}`, dAgg)}
            <div class="exec-accordion-body">
                ${secteursHtml}
            </div>
        </div>`;
    });

    if (!accordionHtml) {
        accordionHtml = `<div class="exec-sg-aucune">${te('no_data')}</div>`;
    }


    return {
        accordionHtml, domaineMap, domaineNameMap, secteurNameMap, criticites,
        computePrestStats, aggregate, closedDossiers, resolveDossierDomaine, resolveSecteur,
        allActivities, filteredConstatations, totalAct, closedAct, tauxClotureAct,
        // Mesures des cartes : le tableau de bord et le formulaire de
        // statistiques les lisent d'ici, jamais recalculées à côté.
        constEnVigueur, totalConst, closedConst, tauxClotureConst,
        fncOuvertes, fncCritiques, horsActivite, horsActiviteOuvertes,
        fncAlerts, fncEnRetard, fncHorsDelai, aDeclencher, actEnRetard, horizonMois,
        pacNonSoumis, pacAccepte, pacRejete, pacEnExamen,
    };
}


// ══════════════════════════════════════
//  SUIVI DES ACTIVITÉS — diagramme de Gantt
// ══════════════════════════════════════
// Chaque activité planifiée tient une barre entre sa date de début et sa date
// de fin. Sa couleur dit où elle en est ; et cet état ne se lit pas sur
// l'activité elle-même — qui n'en porte pas — mais sur le dossier ouvert à son
// déclenchement. Sans dossier, c'est la date de début qui tranche entre une
// activité encore à venir et une activité déjà en retard.
const EXEC_GANTT_ETATS = ['termine', 'en_cours', 'planifie', 'en_retard'];
const EXEC_GANTT_COULEURS = {
    termine: '#16a34a', en_cours: '#f59e0b', planifie: '#2563eb', en_retard: '#dc2626',
};

function _execGanttDate(iso) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function _execGanttEtat(act, dossier, aujourdhuiIso) {
    if (dossier) {
        const st = (dossier.statut || '').toLowerCase();
        return (st === 'cloture' || st === 'cloturee') ? 'termine' : 'en_cours';
    }
    return String(act.date_debut || '') < aujourdhuiIso ? 'en_retard' : 'planifie';
}

function _execGanttTypeLibelle(act) {
    if (act.type_supervision) return String(act.type_supervision);
    const t = (EXEC_STATE.data.typesSupervision || []).find(x => x.id === act.type_supervision_id);
    return (t && (t.type_supervision || t.libelle || t.nom)) || '—';
}

// Bornes de la piste : l'année retenue par les filtres, étendue aux mois
// entiers si une activité déborde de part et d'autre.
function _execGanttBornes(activites, annee) {
    let min = new Date(annee, 0, 1);
    let max = new Date(annee, 11, 31);
    activites.forEach(a => {
        const d = _execGanttDate(a.date_debut);
        const f = _execGanttDate(a.date_fin) || d;
        if (d && d < min) min = new Date(d.getFullYear(), d.getMonth(), 1);
        if (f && f > max) max = new Date(f.getFullYear(), f.getMonth() + 1, 0);
    });
    return { min, max };
}

function _execGanttMois(min, max) {
    const mois = [];
    const c = new Date(min.getFullYear(), min.getMonth(), 1);
    while (c <= max) {
        mois.push({ annee: c.getFullYear(), mois: c.getMonth() });
        c.setMonth(c.getMonth() + 1);
    }
    return mois;
}

// Prépare les lignes du diagramme à partir des activités déjà filtrées par le
// tableau de bord : le Gantt et les cartes montrent ainsi le même périmètre.
function _execSuiviActivitesDonnees() {
    const activites = EXEC_STATE._ganttActivites || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    const prestataires = EXEC_STATE.data.prestataires || [];
    const aujourdhuiIso = new Date().toISOString().slice(0, 10);

    const dossierParActivite = {};
    const dossierParNotif = {};
    dossiers.forEach(d => {
        if (d.activite_id) dossierParActivite[d.activite_id] = d;
        if (d.notification_id) dossierParNotif[d.notification_id] = d;
    });
    const nomPrestataire = (id, repli) => {
        const p = prestataires.find(x => x.id === id);
        return (p && p.nom) || repli || '—';
    };

    const lignes = activites
        .filter(a => a.date_debut)
        .map(a => {
            const dossier = dossierParActivite[a.id];
            const debut = _execGanttDate(a.date_debut);
            const fin = _execGanttDate(a.date_fin) || debut;
            return {
                act: a, dossier,
                debut, fin: fin < debut ? debut : fin,
                etat: _execGanttEtat(a, dossier, aujourdhuiIso),
                type: _execGanttTypeLibelle(a),
                horsPlan: false,
                prestataire_id: a.prestataire_id || 'inconnu',
                prestataire_nom: nomPrestataire(a.prestataire_id, a.prestataire_nom),
            };
        });

    // Une activité hors plan porte ses dates sur la notification elle-même, et
    // son dossier s'y rattache par notification_id — pas par activite_id.
    (EXEC_STATE._ganttHorsPlan || [])
        .filter(n => n.date_activite)
        .forEach(n => {
            const dossier = dossierParNotif[n.id];
            const debut = _execGanttDate(n.date_activite);
            const fin = _execGanttDate(n.date_fin_effective) || debut;
            lignes.push({
                act: {
                    id: n.id,
                    objet: n.objet_activite,
                    lieu_activite: n.lieu_activite,
                    reference: n.reference,
                },
                dossier,
                debut, fin: fin < debut ? debut : fin,
                etat: _execGanttEtat({ date_debut: n.date_activite }, dossier, aujourdhuiIso),
                type: n.nature_activite || _execGanttTypeLibelle(n),
                horsPlan: true,
                prestataire_id: n.prestataire_id || 'inconnu',
                prestataire_nom: nomPrestataire(n.prestataire_id, n.prestataire_nom),
            });
        });

    return { lignes, aujourdhuiIso };
}

function _execSuiviActivitesHtml() {
    const G = EXEC_STATE.gantt || (EXEC_STATE.gantt = { types: [], etats: [] });
    const { lignes, aujourdhuiIso } = _execSuiviActivitesDonnees();

    // Les listes de filtres portent sur toutes les activités, pas seulement
    // sur celles qui restent visibles — sinon cocher une case ferait
    // disparaître les autres cases.
    const tousTypes = [...new Set(lignes.map(l => l.type))].sort((a, b) => a.localeCompare(b));

    const visibles = lignes.filter(l =>
        (!G.types.length || G.types.includes(l.type))
        && (!G.etats.length || G.etats.includes(l.etat)));

    const annee = EXEC_STATE.filters.annee
        ? parseInt(EXEC_STATE.filters.annee, 10) : new Date().getFullYear();
    const { min, max } = _execGanttBornes(visibles, annee);
    const mois = _execGanttMois(min, max);
    const t0 = min.getTime();
    const etendue = Math.max(1, new Date(max.getFullYear(), max.getMonth() + 1, 0).getTime() - t0);
    const pct = (d) => ((d.getTime() - t0) / etendue) * 100;

    // Bandeau des trimestres : les mois consécutifs d'un même trimestre sont
    // regroupés, chaque cellule pesant son nombre de mois.
    const trimestres = [];
    mois.forEach((m) => {
        const t = Math.floor(m.mois / 3) + 1;
        const dernier = trimestres[trimestres.length - 1];
        if (dernier && dernier.annee === m.annee && dernier.t === t) dernier.n += 1;
        else trimestres.push({ annee: m.annee, t, n: 1 });
    });

    // Regroupement par prestataire, dans l'ordre alphabétique. Tous les
    // prestataires du périmètre figurent au calendrier, y compris ceux sans
    // activité : leur ligne vide est une information, leur absence une
    // ambiguïté — on ne saurait pas s'ils manquent ou s'ils n'ont rien.
    const groupes = {};
    (EXEC_STATE._ganttPrestataires || []).forEach(p => {
        groupes[p.id] = { nom: p.nom, lignes: [] };
    });
    visibles.forEach(l => {
        if (!groupes[l.prestataire_id]) groupes[l.prestataire_id] = { nom: l.prestataire_nom, lignes: [] };
        groupes[l.prestataire_id].lignes.push(l);
    });
    const ordre = Object.keys(groupes).sort((a, b) => groupes[a].nom.localeCompare(groupes[b].nom));

    const jour = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    let corps = '';
    ordre.forEach(pid => {
        const g = groupes[pid];
        corps += `
        <div class="g-nom g-groupe">${_esc(g.nom)}
            <span class="g-compte">${g.lignes.length}</span>
        </div>
        <div class="g-piste g-groupe"></div>`;
        if (!g.lignes.length) {
            corps += `<div class="g-nom g-activite g-sans">${te('gantt_sans_activite')}</div>
                      <div class="g-piste"></div>`;
        }
        g.lignes.sort((a, b) => a.debut - b.debut).forEach((l, iLigne) => {
            const paire = iLigne % 2 ? ' g-paire' : '';
            const gauche = Math.max(0, pct(l.debut));
            const largeur = Math.max(1.4, pct(new Date(l.fin.getTime() + 86400000)) - gauche);
            const ref = (l.dossier && l.dossier.reference) || l.act.reference || '';
            corps += `
            <div class="g-nom g-activite${paire}" title="${_escAttr(l.act.objet || l.act.titre || '')}">
                ${l.horsPlan ? `<span class="g-hp" title="${_escAttr(te('gantt_hors_plan'))}">HP</span>` : ''}
                <span class="g-activite-txt">${_esc(l.act.objet || l.act.titre || '—')}</span>
            </div>
            <div class="g-piste${paire}">
                <div class="g-barre etat-${l.etat}" style="left:${gauche.toFixed(2)}%;width:${Math.min(largeur, 100 - gauche).toFixed(2)}%;"
                     onmouseenter="execGanttInfo(this, true)" onmouseleave="execGanttInfo(this, false)">
                    <span class="g-barre-txt">${_esc(l.type)}</span>
                    ${l.etat === 'en_retard' ? '<span class="g-alerte">!</span>' : ''}
                </div>
                <div class="g-infobulle">
                    <div class="t">${_esc(l.act.objet || l.act.titre || '—')}</div>
                    ${ref ? `<div><span>${te('reference')}</span> ${_esc(ref)}</div>` : ''}
                    <div><span>${te('gantt_dates')}</span> ${jour(l.debut)} → ${jour(l.fin)}</div>
                    <div><span>${te('statut')}</span> ${te('gantt_' + l.etat)}</div>
                    <div><span>${te('gantt_type_audit')}</span> ${_esc(l.type)}</div>
                    ${l.horsPlan ? `<div><span>${te('gantt_origine')}</span> ${te('gantt_hors_plan')}</div>` : ''}
                    ${l.act.lieu_activite ? `<div><span>${te('gantt_lieu')}</span> ${_esc(l.act.lieu_activite)}</div>` : ''}
                </div>
            </div>`;
        });
    });

    if (!corps) {
        corps = `<div class="g-nom g-vide"></div><div class="g-piste g-vide">${te('no_data')}</div>`;
    }

    const caseFiltre = (groupe, valeur, libelle, couleur) => `
        <label class="g-case">
            <input type="checkbox" ${((G[groupe] || []).includes(valeur)) ? 'checked' : ''}
                   onchange="execGanttFiltrer('${groupe}', ${JSON.stringify(valeur).replace(/"/g, '&quot;')}, this.checked)">
            ${couleur ? `<span class="g-puce" style="background:${couleur};"></span>` : ''}
            <span>${_esc(libelle)}</span>
        </label>`;

    const aujourdhui = _execGanttDate(aujourdhuiIso);
    const marqueur = (aujourdhui >= min && aujourdhui <= max)
        ? `<div class="g-aujourdhui" style="left:${pct(aujourdhui).toFixed(2)}%;"></div>` : '';

    return `
    <div class="card exec-suivi-carte" id="execSuiviActivitesRoot" style="margin-top:1.25rem;">
        <div class="exec-suivi-entete">
            <h4>${te('gantt_titre')}</h4>
            <div class="exec-suivi-nav">
                <button class="btn btn-sm btn-outline" onclick="execGanttBord(-1)" title="${_escAttr(te('gantt_debut'))}">«</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttDefiler(-1)" title="${_escAttr(te('gantt_reculer'))}">‹</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttAujourdhui()">${te('gantt_aujourdhui')}</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttDefiler(1)" title="${_escAttr(te('gantt_avancer'))}">›</button>
                <button class="btn btn-sm btn-outline" onclick="execGanttBord(1)" title="${_escAttr(te('gantt_fin'))}">»</button>
                <span class="exec-suivi-jour">${jour(aujourdhui)}</span>
            </div>
        </div>
        <div class="exec-suivi-corps">
            <div class="exec-gantt-cadre">
                <div class="exec-gantt" style="min-width:${Math.max(680, mois.length * 62)}px;">
                    <div class="g-nom g-annee">${min.getFullYear()}${max.getFullYear() !== min.getFullYear() ? ` – ${max.getFullYear()}` : ''}</div>
                    <div class="g-piste g-entete">
                        ${trimestres.map(t => `<div class="g-cellule" style="flex-grow:${t.n};">T${t.t}</div>`).join('')}
                    </div>
                    <div class="g-nom g-entete-vide"></div>
                    <div class="g-piste g-entete g-entete-mois">
                        ${mois.map(m => `<div class="g-cellule">${EXEC_CHRONO_MOIS[m.mois]}</div>`).join('')}
                    </div>
                    ${corps}
                    <div class="g-overlay">
                        ${mois.map((m, i) => i ? `<div class="g-trait" style="left:${((i / mois.length) * 100).toFixed(3)}%;"></div>` : '').join('')}
                        ${marqueur}
                    </div>
                </div>
            </div>
            <aside class="exec-gantt-panneau">
                <div class="g-bloc">
                    <div class="g-bloc-titre">${te('gantt_type_audit')}</div>
                    ${tousTypes.length
                        ? tousTypes.map(t => caseFiltre('types', t, t, '')).join('')
                        : `<div class="g-bloc-vide">${te('no_data')}</div>`}
                </div>
                <div class="g-bloc">
                    <div class="g-bloc-titre">${te('statut')}</div>
                    ${EXEC_GANTT_ETATS.map(e => caseFiltre('etats', e, te('gantt_' + e), EXEC_GANTT_COULEURS[e])).join('')}
                </div>
            </aside>
        </div>
    </div>`;
}

// ── Défilement du calendrier ────────────────────────────────────────
// La piste est plus large que son cadre : au-delà de la barre de défilement,
// on donne des commandes explicites, dont un retour à la date du jour.
function _execGanttCadre() {
    return document.querySelector('#execSuiviActivitesRoot .exec-gantt-cadre');
}

function execGanttDefiler(sens) {
    const cadre = _execGanttCadre();
    if (!cadre) return;
    cadre.scrollBy({ left: sens * Math.max(120, cadre.clientWidth * 0.6), behavior: 'smooth' });
}

function execGanttBord(sens) {
    const cadre = _execGanttCadre();
    if (!cadre) return;
    cadre.scrollTo({ left: sens < 0 ? 0 : cadre.scrollWidth, behavior: 'smooth' });
}

// Recentre la piste sur le trait du jour, quand il tombe dans la période.
function execGanttAujourdhui() {
    const cadre = _execGanttCadre();
    const trait = cadre && cadre.querySelector('.g-aujourdhui');
    if (!cadre) return;
    if (!trait) { cadre.scrollTo({ left: 0, behavior: 'smooth' }); return; }
    const piste = cadre.querySelector('.exec-gantt');
    const x = 220 + (parseFloat(trait.style.left) / 100) * (piste.offsetWidth - 220);
    cadre.scrollTo({ left: Math.max(0, x - cadre.clientWidth / 2), behavior: 'smooth' });
}

// La fiche de survol se place à la main, en position fixe : la piste défile
// horizontalement, et tout ce qui reste dans ce cadre s'y trouve rogné.
function execGanttInfo(barre, montrer) {
    const bulle = barre.parentElement.querySelector('.g-infobulle');
    if (!bulle) return;
    if (!montrer) { bulle.style.display = 'none'; return; }
    bulle.style.display = 'block';
    const r = barre.getBoundingClientRect();
    const b = bulle.getBoundingClientRect();
    let x = r.left;
    let y = r.bottom + 6;
    if (x + b.width > window.innerWidth - 8) x = window.innerWidth - b.width - 8;
    if (y + b.height > window.innerHeight - 8) y = r.top - b.height - 6;
    bulle.style.left = Math.max(8, x) + 'px';
    bulle.style.top = Math.max(8, y) + 'px';
}

// Un filtre du panneau : on ne refait que la section, pas le tableau de bord.
function execGanttFiltrer(groupe, valeur, coche) {
    const G = EXEC_STATE.gantt || (EXEC_STATE.gantt = { types: [], etats: [] });
    const liste = G[groupe] || (G[groupe] = []);
    const i = liste.indexOf(valeur);
    if (coche && i === -1) liste.push(valeur);
    if (!coche && i !== -1) liste.splice(i, 1);
    const root = document.getElementById('execSuiviActivitesRoot');
    if (root) root.outerHTML = _execSuiviActivitesHtml();
}

function execRenderDashboard() {
    const stats = EXEC_STATE.data.dashStats || {};
    const notifs = EXEC_STATE.data.notifications || [];
    const dossiers = EXEC_STATE.data.dossiers || [];
    let constatations = EXEC_STATE.data.constatations || [];
    // Source des activités planifiées : identique au menu "Activités de Supervision".
    const plansValides = EXEC_STATE.data.plansValidesPlanif || EXEC_STATE.data.plansValides || [];
    // Base commune aux cartes, aux graphiques et à la table : les
    // constatations en vigueur (voir _execConstaEnVigueur).
    const POST_TRANSMIT = EXEC_CONSTA_EN_VIGUEUR;
    const secteurs = EXEC_STATE.data.secteurs || [];
    const domaines = EXEC_STATE.data.domaines || [];
    const F = EXEC_STATE.filters;
    const isPrest = _execIsPrestataire();
    const scopedPid = (EXEC_STATE.user || {}).prestataire_id || '';

    // For prestataires: narrow the data to their own prestataire before any filter logic
    if (isPrest) {
        constatations = constatations.filter(c => _execPortePrestataire(F.prestataire).includes(c.prestataire_id));
    }

    // Build secteur -> domaine lookup
    const secteurToDomaine = {};
    secteurs.forEach(s => { if (s.domaine_id) secteurToDomaine[s.id] = s.domaine_id; });

    const SG = _execSituationGenerale(EXEC_STATE.filters);
    const {
        accordionHtml, domaineMap, domaineNameMap, secteurNameMap, criticites,
        computePrestStats, aggregate, closedDossiers, resolveDossierDomaine, resolveSecteur,
        allActivities, filteredConstatations, totalAct, closedAct, tauxClotureAct,
        totalConst, closedConst, tauxClotureConst,
        fncOuvertes, fncCritiques, horsActivite, horsActiviteOuvertes,
        fncAlerts, fncEnRetard, fncHorsDelai, aDeclencher, actEnRetard, horizonMois,
        pacNonSoumis, pacAccepte, pacRejete, pacEnExamen,
    } = SG;

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

    // Agrégat des prestataires : les cartes du tableau de bord s'y adossent,
    // comme la section "Situation Générale".
    const _sgStats = [];
    Object.keys(domaineMap).forEach(dId => Object.keys(domaineMap[dId]).forEach(sId =>
        Object.keys(domaineMap[dId][sId]).forEach(pId => _sgStats.push(computePrestStats(dId, sId, pId)))));
    const sgAgg = aggregate(_sgStats);

    // Le Gantt part exactement des activités retenues par les filtres du
    // tableau de bord : on les lui dépose ici plutôt que de refaire le tri.
    // Le regroupement Domaine→Secteur→Prestataire fournit la liste complète
    // des prestataires du périmètre, y compris ceux sans activité planifiée.
    EXEC_STATE._ganttActivites = allActivities;
    const ganttPrest = [];
    Object.keys(domaineMap).forEach(dId => Object.keys(domaineMap[dId]).forEach(sId =>
        Object.keys(domaineMap[dId][sId]).forEach(pId => ganttPrest.push({
            id: pId, nom: domaineMap[dId][sId][pId].prestataire_nom || pId,
        }))));
    EXEC_STATE._ganttPrestataires = ganttPrest;

    // Les activités hors plan — section « Autres Activités » du menu Activités
    // de Supervision — n'existent que sous forme de notification, sans ligne
    // dans un plan validé. Elles tiennent leur place au calendrier : ce sont
    // des activités de surveillance au même titre que les autres. Mêmes
    // filtres que le reste du tableau de bord, appliqués sur leurs champs.
    let ganttHorsPlan = (EXEC_STATE.data.notifications || []).filter(n => n.hors_plan);
    if (isPrest) { const mp = _execPortePrestataire(F.prestataire); ganttHorsPlan = ganttHorsPlan.filter(n => mp.includes(n.prestataire_id)); }
    if (F.annee) {
        ganttHorsPlan = ganttHorsPlan.filter(n =>
            String(n.annee || String(n.date_activite || '').slice(0, 4)) === String(F.annee));
    }
    if (F.domaine) ganttHorsPlan = ganttHorsPlan.filter(n => n.domaine_id === F.domaine);
    if (F.prestataire) ganttHorsPlan = ganttHorsPlan.filter(n => n.prestataire_id === F.prestataire);
    if (F.trimestre) {
        ganttHorsPlan = ganttHorsPlan.filter(n => {
            const m = String(n.date_activite || '').slice(5, 7);
            return m && String(Math.ceil(parseInt(m, 10) / 3)) === String(F.trimestre);
        });
    }
    if (F.search) {
        const q = F.search.toLowerCase();
        ganttHorsPlan = ganttHorsPlan.filter(n =>
            `${n.objet_activite || ''} ${n.prestataire_nom || ''} ${n.nature_activite || ''}`
                .toLowerCase().includes(q));
    }
    EXEC_STATE._ganttHorsPlan = ganttHorsPlan;
    const suiviHtml = _execSuiviActivitesHtml();

    return `
    <div class="page-content">
        <div class="page-header exec-dash-entete">
            <div>
                <h2>${te('dashboard')}</h2>
                <p style="color:var(--text-muted)">${te('module_subtitle')}</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="execShowStatistiquesAdvanced()" title="${_escAttr(te('voir_statistiques'))}">
                ${EXEC_ICONS.dashboard || ''} ${te('voir_statistiques')}
            </button>
        </div>

        <div class="oasis-kpi-groupes">
            ${oasisKpiGroupe(te('activites'), [
                oasisKpiCarte({
                    titre: te('taux_execution'), couleur: '#2563eb',
                    valeur: sgAgg.planned > 0 ? `${sgAgg.execRate}%` : '-',
                    precision: `${sgAgg.closed} ${te('sur')} ${sgAgg.planned} ${te('realisees_court')}`,
                    figure: { type: 'jauge', pct: sgAgg.execRate },
                }),
                oasisKpiCarte({
                    titre: te('act_en_retard'), couleur: '#dc2626', alerte: !!actEnRetard,
                    valeur: actEnRetard, precision: te('act_en_retard_aide'),
                    figure: { type: 'retard', pastille: te('depasse'), legende: te('debut') },
                }),
                oasisKpiCarte({
                    titre: te('a_planifier'), couleur: '#f59e0b',
                    valeur: aDeclencher.length,
                    precision: `${te('horizon_prochains')} ${horizonMois} ${te('mois')}`,
                    figure: { type: 'calendrier', mois: horizonMois },
                }),
            ])}
            ${oasisKpiGroupe(te('constatations'), [
                oasisKpiCarte({
                    titre: te('taux_cloture'), couleur: '#8b5cf6',
                    valeur: totalConst > 0 ? `${tauxClotureConst}%` : '-',
                    precision: `${closedConst}/${totalConst} ${te('cloturees_court')}`
                        + (horsActivite ? ` · ${horsActivite} ${te('hors_activite_court')}` : ''),
                    figure: { type: 'cloture', pct: tauxClotureConst },
                }),
                oasisKpiCarte({
                    titre: te('critiques'), couleur: '#f97316', alerte: !!fncCritiques,
                    valeur: fncCritiques, precision: te('action_immediate'),
                    figure: { type: 'echelle', position: 92, min: te('faible'), max: te('eleve') },
                }),
                oasisKpiCarte({
                    titre: te('ouvertes'), couleur: '#ef4444',
                    valeur: fncOuvertes,
                    precision: te('en_attente_traitement')
                        + (horsActiviteOuvertes ? ` · ${horsActiviteOuvertes} ${te('hors_activite_court')}` : ''),
                    figure: { type: 'etapes', liste: [te('en_attente'), te('en_cours_court'), te('cloture_court')], actif: 0 },
                }),
            ])}
        </div>

        ${_execRenderFilterBar('execRenderPage()', isPrest
            ? { showAnnee: true, showTrimestre: true, showDomaine: false, showSecteur: false, showPrestataire: true, showStatut: false, showSearch: true }
            : { showAnnee: true, showTrimestre: true, showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showSearch: true })}

        ${fncAlerts.length > 0 ? `
        <details class="card" style="border-left:4px solid #ef4444;margin-bottom:1.25rem;">
            <summary style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;list-style:none;">
                ${EXEC_ICONS.alarm}
                <strong style="color:#ef4444">${te('alertes')}</strong>
                <span style="background:#ef4444;color:#fff;border-radius:10px;padding:0.05rem 0.5rem;font-size:0.74rem;font-weight:700;">${fncAlerts.length}</span>
                ${fncEnRetard ? `<span style="background:#7f1d1d;color:#fff;border-radius:10px;padding:0.05rem 0.5rem;font-size:0.74rem;font-weight:700;">${fncEnRetard} ${te('en_retard')}</span>` : ''}
            </summary>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem;">
                ${fncAlerts.map(f => `<div class="exec-alerte-ligne">
                    <span>
                        <strong style="color:var(--text);">${_esc(f.reference || '')}</strong>
                        ${_execConstaHorsActivite(f) ? `<span class="exec-alerte-origine">${te('hors_activite_court')}</span>` : ''}
                        ${_esc(f.titre || f.description || '').substring(0, 60)}
                    </span>
                    ${f._jours < 0
                        ? `<span style="color:#7f1d1d;font-weight:700;">${te('en_retard')} ${Math.abs(f._jours)} j</span>`
                        : _daysUntilBadge(_execConstaEcheance(f))}
                </div>`).join('')}
            </div>
        </details>` : ''}

        ${suiviHtml}

    </div>`;
}

// ── Chronologie ─────────────────────────────────────────────────
// Un curseur à deux poignées borne la période analysée. La graduation porte
// les mois, et les trimestres aux extrémités ; chaque poignée annonce sa date.
// Le glissement ne recalcule rien : les indicateurs se refont au relâchement.
const EXEC_CHRONO_MOIS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

const _execChronoJour = (v) => {
    // Les dates stockées ne sont pas toutes complétées à deux chiffres :
    // « 2026-4-5 » doit se lire comme « 2026-04-05 », sans quoi la
    // chronologie entière disparaîtrait pour une donnée mal formée.
    const m = String(v || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
};
const _execChronoIso = (d) => d.toISOString().slice(0, 10);
const _execChronoIndex = (v, min) => Math.round((_execChronoJour(v) - min) / 86400000);
const _execChronoDate = (i, min) => _execChronoIso(new Date(min.getTime() + i * 86400000));

// « 15 Juin 2026 » : la date telle que la poignée l'annonce.
function _execChronoLisible(v) {
    const d = _execChronoJour(v);
    if (!d) return '';
    return `${d.getDate()} ${EXEC_CHRONO_MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

// Cycle de surveillance d'un prestataire, tel que « Plans de Surveillance »
// le fixe. Sans dates, pas de cycle : la période reste libre.
function _execCyclePrestataire(prestataireId) {
    if (!prestataireId) return null;
    const c = (EXEC_STATE.data.cyclesPrestataires || [])
        .find((x) => x.id === prestataireId);
    if (!c || !c.debut_cycle || !c.fin_cycle) return null;
    return { debut: String(c.debut_cycle), fin: String(c.fin_cycle), nom: c.nom || '' };
}

function _execStatsChronologie(bornes, P, cycle) {
    const min = _execChronoJour(bornes.min);
    const max = _execChronoJour(bornes.max);
    if (!min || !max || max <= min) return '';
    const total = Math.round((max - min) / 86400000);
    const debut = P.debut || bornes.min;
    const fin = P.fin || bornes.max;
    const iDebut = Math.max(0, Math.min(total, _execChronoIndex(debut, min)));
    const iFin = Math.max(iDebut, Math.min(total, _execChronoIndex(fin, min)));
    const pct = (i) => (total ? (i / total) * 100 : 0);
    // Une bulle centrée sur une poignée d'extrémité déborderait de la carte :
    // sa position est retenue dans les bornes lisibles.
    const pctBulle = (i) => Math.min(90, Math.max(10, pct(i)));

    // Graduation : un trait par mois, son nom en dessous ; les trimestres
    // des extrémités encadrent la piste.
    const traits = [];
    // Sur une longue période, les noms de mois se chevaucheraient : on n'en
    // garde qu'un sur N, et l'année remplace le mois en janvier.
    const nbMois = (max.getFullYear() - min.getFullYear()) * 12
        + (max.getMonth() - min.getMonth()) + 1;
    const pasLibelle = nbMois <= 8 ? 1 : (nbMois <= 16 ? 2 : 3);
    let rangMois = -1;
    const curseur = new Date(min.getFullYear(), min.getMonth(), 1);
    while (curseur <= max) {
        rangMois += 1;
        const debutMois = curseur > min ? curseur : min;
        const finMois = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0);
        const milieu = new Date(Math.min(finMois.getTime(), max.getTime()));
        const centre = (debutMois.getTime() + milieu.getTime()) / 2;
        if (curseur > min) {
            traits.push(`<span class="exec-chrono-trait" style="left:${pct((curseur - min) / 86400000)}%;"></span>`);
        }
        if (rangMois % pasLibelle === 0) {
            const libelle = curseur.getMonth() === 0
                ? `${EXEC_CHRONO_MOIS[0]} ${curseur.getFullYear()}`
                : EXEC_CHRONO_MOIS[curseur.getMonth()];
            traits.push(`<span class="exec-chrono-mois-nom" style="left:${pct((centre - min.getTime()) / 86400000)}%;">`
                + `${libelle}</span>`);
        }
        curseur.setMonth(curseur.getMonth() + 1);
    }
    const trimestre = (d) => `T${Math.floor(d.getMonth() / 3) + 1}`;

    return `
    <div class="exec-chrono" id="execChrono"
         data-min="${_execChronoIso(min)}" data-total="${total}">
        <div class="exec-chrono-tete">
            <span class="exec-chrono-titre">${te('periode_examinee')}</span>
            <label class="exec-chrono-date">${te('chrono_date_debut')}
                <input type="date" id="execChronoDateDebut" value="${_escAttr(debut)}"
                       onchange="execChronoDates()">
            </label>
            <label class="exec-chrono-date">${te('chrono_date_fin')}
                <input type="date" id="execChronoDateFin" value="${_escAttr(fin)}"
                       onchange="execChronoDates()">
            </label>
            ${cycle ? `<span class="exec-chrono-cycle" title="${te('cycle_surveillance')}">
                ${te('cycle_court')} ${_formatDate(cycle.debut)} → ${_formatDate(cycle.fin)}
            </span>` : ''}
            <span class="exec-chrono-raccourcis">
                ${[[12, te('chrono_12_mois')], [6, te('chrono_6_mois')], [3, te('chrono_3_mois')]]
                    .map(([n, l]) => `<button class="exec-chrono-btn" onclick="execStatsPeriodeDerniers(${n})">${l}</button>`).join('')}
                <button class="exec-chrono-btn" onclick="execStatsPeriode('','')">${te('chrono_tout')}</button>
            </span>
        </div>

        <div class="exec-chrono-curseur">
            <span class="exec-chrono-bulle" id="execChronoBulleDebut" style="left:${pctBulle(iDebut)}%;">
                <strong>${_execChronoLisible(debut)}</strong> - ${te('debut')}</span>
            <span class="exec-chrono-bulle" id="execChronoBulleFin" style="left:${pctBulle(iFin)}%;">
                <strong>${_execChronoLisible(fin)}</strong> - ${te('fin')}</span>
            <div class="exec-chrono-piste">
                <div class="exec-chrono-selection" id="execChronoSelection"
                     style="left:${pct(iDebut)}%;right:${100 - pct(iFin)}%;"></div>
                <input type="range" class="exec-chrono-poignee" id="execChronoDebut"
                       min="0" max="${total}" value="${iDebut}"
                       oninput="execChronoGlisser()" onchange="execChronoAppliquer()"
                       aria-label="${te('debut')}">
                <input type="range" class="exec-chrono-poignee" id="execChronoFin"
                       min="0" max="${total}" value="${iFin}"
                       oninput="execChronoGlisser()" onchange="execChronoAppliquer()"
                       aria-label="${te('fin')}">
            </div>
            <div class="exec-chrono-graduation">
                <span class="exec-chrono-trimestre gauche">${trimestre(min)}</span>
                <span class="exec-chrono-trimestre droite">${trimestre(max)}</span>
                ${traits.join('')}
            </div>
        </div>
    </div>`;
}

// Glissement : seules les étiquettes et la plage colorée suivent le doigt.
window.execChronoGlisser = function () {
    const boite = document.getElementById('execChrono');
    if (!boite) return;
    const min = _execChronoJour(boite.dataset.min);
    const total = Number(boite.dataset.total) || 1;
    const a = document.getElementById('execChronoDebut');
    const b = document.getElementById('execChronoFin');
    // Les poignées ne se croisent pas : celle qu'on pousse repousse l'autre.
    let i = Number(a.value);
    let j = Number(b.value);
    if (i > j) { if (document.activeElement === a) j = i; else i = j; a.value = i; b.value = j; }
    const pct = (v) => (v / total) * 100;
    const sel = document.getElementById('execChronoSelection');
    if (sel) { sel.style.left = `${pct(i)}%`; sel.style.right = `${100 - pct(j)}%`; }
    const bulle = (id, v, libelle) => {
        const e = document.getElementById(id);
        if (!e) return;
        e.style.left = `${Math.min(90, Math.max(10, pct(v)))}%`;
        e.innerHTML = `<strong>${_execChronoLisible(_execChronoDate(v, min))}</strong> - ${libelle}`;
    };
    bulle('execChronoBulleDebut', i, te('debut'));
    bulle('execChronoBulleFin', j, te('fin'));
};

// Relâchement : la période est arrêtée, les indicateurs se refont.
window.execChronoAppliquer = function () {
    const boite = document.getElementById('execChrono');
    if (!boite) return;
    const min = _execChronoJour(boite.dataset.min);
    const a = Number(document.getElementById('execChronoDebut').value);
    const b = Number(document.getElementById('execChronoFin').value);
    execStatsPeriode(_execChronoDate(Math.min(a, b), min), _execChronoDate(Math.max(a, b), min));
};

// Bornes saisies au clavier : elles arrêtent la période comme les poignées.
window.execChronoDates = function () {
    const a = document.getElementById('execChronoDateDebut');
    const b = document.getElementById('execChronoDateFin');
    let debut = (a && a.value) || '';
    let fin = (b && b.value) || '';
    if (debut && fin && debut > fin) { const t = debut; debut = fin; fin = t; }
    execStatsPeriode(debut, fin);
};

window.execStatsPeriode = function (debut, fin) {
    EXEC_STATE.statsPeriode = { debut, fin };
    execShowStatistiquesAdvanced();
};

// Raccourci : les N derniers mois, à compter d'aujourd'hui.
window.execStatsPeriodeDerniers = function (n) {
    const fin = new Date();
    const debut = new Date();
    debut.setMonth(debut.getMonth() - n);
    execStatsPeriode(_execChronoIso(debut), _execChronoIso(fin));
};

// Détail d'un indicateur de conformité : les constatations qu'il compte,
// présentées sous les cartes, là où le classement des prestataires figurait.
function _execStatsDetailHtml(cle, detail) {
    if (!cle || !detail) {
        return `<p class="exec-stats-invite">${te('aucun_indicateur')}</p>`;
    }
    const lignes = detail.lignes || [];
    return `
    <div class="exec-stats-detail">
        <div class="exec-stats-entete">
            <h4>${te('detail_indicateur')} — ${_esc(detail.titre)}
                <span class="exec-stats-compte">${lignes.length}</span></h4>
            <button class="btn btn-sm btn-outline" onclick="execStatsIndicateur('')">
                ${EXEC_ICONS.x || ''} ${te('cancel') || 'Fermer'}
            </button>
        </div>
        <table class="exec-data-table exec-compact-table" style="width:100%;font-size:0.82rem;">
            <thead><tr>
                <th style="width:140px;">${te('reference')}</th>
                <th>${te('provider')}</th>
                <th style="width:100px;">${te('criticite')}</th>
                <th style="width:120px;">${te('statut')}</th>
                <th style="width:110px;">${te('date_ouverture')}</th>
                <th style="width:110px;">${te('date_due_label')}</th>
                <th style="width:110px;">${te('date_solde')}</th>
                <th style="width:70px;text-align:center;">${te('actions')}</th>
            </tr></thead>
            <tbody>
                ${lignes.length === 0
                    ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>`
                    : lignes.map(c => `<tr>
                        <td><strong>${_esc(c.reference || '')}</strong></td>
                        <td>${_esc(c.prestataire_nom || '')}</td>
                        <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
                        <td>${_execStatusBadge(c.statut)}</td>
                        <td>${_formatDate(String(c.date_ouverture || c.date_creation || '').slice(0, 10))}</td>
                        <td>${_formatDate(String(c.date_due_cloture || '').slice(0, 10))}</td>
                        <td>${_formatDate(String(c.date_solde || '').slice(0, 10))}</td>
                        <td style="text-align:center;">
                            <button class="btn btn-sm btn-outline" onclick="execOuvrirConstatation('${c.id}')"
                                    title="${_escAttr(te('ouvrir_constatation'))}">${EXEC_ICONS.eye || EXEC_ICONS.openFolder || '→'}</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

// Ouvre la constatation là où elle se travaille : son suivi PAC tant qu'elle
// est ouverte, le dossier de l'activité une fois soldée, et le processus
// « hors activité » pour celles qui n'ont pas de dossier. Même aiguillage que
// la table des Constatations, en un seul endroit.
window.execOuvrirConstatation = function (fncId) {
    const c = (EXEC_STATE.data.constatations || []).find(x => x.id === fncId);
    if (!c) { _execToast(te('no_data') || 'Introuvable', 'info'); return; }
    const st = c.statut || '';
    let ouvrir;
    if (st.startsWith('direct_')) ouvrir = () => execOpenConstatationDirecteSlider(fncId);
    else if (st !== 'soldee' && EXEC_CONSTA_EN_VIGUEUR.has(st)) ouvrir = () => execOpenPACSlider(fncId);
    else if (c.dossier_id) ouvrir = () => execOpenDossierSlider(c.dossier_id, 'constatations');
    else ouvrir = () => execOpenConstatationDirecteSlider(fncId);
    // On vient du formulaire de statistiques : son bouton Retour doit y
    // ramener, et non refermer le volet sur le tableau de bord.
    const revenir = EXEC_STATE.voletRejouer;
    // Le formulaire de statistiques occupe déjà le volet : on le referme
    // d'abord, les deux ne peuvent pas y tenir ensemble.
    if (typeof execCloseSlider === 'function') execCloseSlider();
    execArmerRetour(revenir);
    setTimeout(ouvrir, 80);
};

// Choix d'un indicateur : un second clic sur la même carte referme le détail.
window.execStatsIndicateur = function (cle) {
    EXEC_STATE.statsIndicateur = (EXEC_STATE.statsIndicateur === cle) ? '' : cle;
    execShowStatistiquesAdvanced();
};

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
    const mesPrestStats = _execPortePrestataire(F.prestataire);
    if (mesPrestStats) consts = consts.filter(c => mesPrestStats.includes(c.prestataire_id));
    // Filtres du tableau de bord
    if (F.prestataire) consts = consts.filter(c => c.prestataire_id === F.prestataire);
    if (F.domaine) consts = consts.filter(c => (prestDom[c.prestataire_id] || c.domaine_id) === F.domaine);
    if (F.annee) consts = consts.filter(c => String(c.date_creation || c.date_ouverture || '').slice(0, 4) === String(F.annee));
    if (F.trimestre) consts = consts.filter(c => {
        const d = String(c.date_creation || c.date_ouverture || '');
        return d.length >= 7 && String(Math.ceil(parseInt(d.slice(5, 7)) / 3)) === String(F.trimestre);
    });
    // Période retenue : la chronologie sous les filtres borne les données sur
    // lesquelles les indicateurs sont calculés.
    if (!EXEC_STATE.statsPeriode) EXEC_STATE.statsPeriode = { debut: '', fin: '' };
    // Un prestataire retenu impose son cycle de surveillance : c'est la
    // période sur laquelle son suivi se juge. Changer de prestataire réarme
    // ce défaut ; un réglage manuel de la chronologie le remplace.
    const cycle = _execCyclePrestataire(F.prestataire);
    if (F.prestataire !== EXEC_STATE._statsPrestataireCycle) {
        EXEC_STATE._statsPrestataireCycle = F.prestataire;
        EXEC_STATE.statsPeriode = cycle
            ? { debut: cycle.debut.slice(0, 10), fin: cycle.fin.slice(0, 10) }
            : { debut: '', fin: '' };
    }
    const P = EXEC_STATE.statsPeriode;
    const jourDe = (c) => String(c.date_creation || c.date_ouverture || '').slice(0, 10);
    // Étendue offerte au curseur : ce que couvrent les données, élargi au
    // cycle du prestataire quand il déborde.
    const jours = consts.map(jourDe).filter(Boolean).sort();
    // La piste couvre les données, le cycle du prestataire — et la période
    // retenue : une date saisie au clavier hors de ces bornes doit rester
    // atteignable par les poignées, sinon le curseur mentirait sur le filtre.
    const bornes = {
        min: [jours[0], cycle && cycle.debut, P.debut].filter(Boolean).sort()[0] || '',
        max: [jours[jours.length - 1], cycle && cycle.fin, P.fin].filter(Boolean).sort().pop() || '',
    };
    if (P.debut) consts = consts.filter(c => jourDe(c) >= P.debut);
    if (P.fin) consts = consts.filter(c => jourDe(c) <= P.fin);

    const POST = new Set(EXEC_CONSTA_EN_VIGUEUR);
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

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Répartition par mois, pour la vignette de la moyenne mensuelle.
    const parMois = {};
    cm.forEach(c => {
        const m = String(c.date_creation || c.date_ouverture || '').slice(0, 7);
        if (m) parMois[m] = (parMois[m] || 0) + 1;
    });
    const repartitionMois = Object.keys(parMois).sort().slice(-5).map(k => parMois[k]);

    // Ce que chaque indicateur recouvre : la liste qu'il compte. Cliquer la
    // carte affiche cette liste, sous les indicateurs.
    const indicateur = EXEC_STATE.statsIndicateur || '';
    const recurrentes = transmitted.filter(c => {
        const k = (c.prestataire_id || '') + '|'
            + ((c.theme || c.titre || c.description || '').toString().toLowerCase().slice(0, 50));
        return recurMap[k] > 1;
    });
    // ── Répartitions ─────────────────────────────────────────────────
    // Trois lectures d'un même ensemble : par criticité, par avancement, puis
    // par état du plan d'actions. Elles portent sur les données du formulaire,
    // filtres et période compris — et chaque ligne renvoie à sa propre liste.
    const ouvertesStats = transmitted.filter(c => c.statut !== 'soldee');
    const soldeesStats = transmitted.filter(c => c.statut === 'soldee');
    const horsDelaiListe = ouvertesStats.filter(c => c.date_due_cloture
        && new Date(c.date_due_cloture) < today);
    const stConst = c => (c.statut || '').toLowerCase();
    const pacNonSoumisL = ouvertesStats.filter(c => ['ouvert', 'ouverte'].includes(stConst(c)));
    const pacAccepteL = ouvertesStats.filter(c => stConst(c) === 'pac_valide');
    const pacRejeteL = ouvertesStats.filter(c => stConst(c) === 'pac_rejetee');
    const parCriticite = n => transmitted.filter(c => crit(c) === n);

    const repCritSegments = [
        { cle: 'rep_critique', label: te('critique'), value: parCriticite('critique').length, color: '#dc2626' },
        { cle: 'rep_majeure',  label: te('majeure'),  value: parCriticite('majeure').length,  color: '#f97316' },
        { cle: 'rep_mineure',  label: te('mineure'),  value: parCriticite('mineure').length,  color: '#f59e0b' },
    ];
    // « Hors délais » est un sous-ensemble des ouvertes : c'est l'alerte, pas
    // une troisième catégorie — la somme des lignes ne fait pas le total.
    const repEmisesSegments = [
        { cle: 'emis_ouverte',     label: te('emises_ouverte'), value: ouvertesStats.length,   color: '#2563eb' },
        { cle: 'emis_hors_delais', label: te('hors_delais'),    value: horsDelaiListe.length,  color: '#dc2626' },
        { cle: 'emis_cloture',     label: te('emises_cloture'), value: soldeesStats.length,    color: '#16a34a' },
    ];
    const repPacSegments = [
        { cle: 'pac_non_soumis', label: te('graph_pac_non_soumis'), value: pacNonSoumisL.length, color: '#dc2626' },
        { cle: 'pac_accepte',    label: te('graph_pac_accepte'),    value: pacAccepteL.length,   color: '#16a34a' },
        { cle: 'pac_rejete',     label: te('graph_pac_rejete'),     value: pacRejeteL.length,    color: '#f97316' },
    ];

    const DETAILS = {
        critiques: { titre: te('stats_critiques'), lignes: criticals },
        rep_critique: { titre: `${te('graph_criticite')} — ${te('critique')}`, lignes: parCriticite('critique') },
        rep_majeure: { titre: `${te('graph_criticite')} — ${te('majeure')}`, lignes: parCriticite('majeure') },
        rep_mineure: { titre: `${te('graph_criticite')} — ${te('mineure')}`, lignes: parCriticite('mineure') },
        emis_ouverte: { titre: `${te('graph_emises')} — ${te('emises_ouverte')}`, lignes: ouvertesStats },
        emis_hors_delais: { titre: `${te('graph_emises')} — ${te('hors_delais')}`, lignes: horsDelaiListe },
        emis_cloture: { titre: `${te('graph_emises')} — ${te('emises_cloture')}`, lignes: soldeesStats },
        pac_non_soumis: { titre: `${te('graph_pac_titre')} — ${te('graph_pac_non_soumis')}`, lignes: pacNonSoumisL },
        pac_accepte: { titre: `${te('graph_pac_titre')} — ${te('graph_pac_accepte')}`, lignes: pacAccepteL },
        pac_rejete: { titre: `${te('graph_pac_titre')} — ${te('graph_pac_rejete')}`, lignes: pacRejeteL },
        critiques_delai: {
            titre: te('stats_critiques_delai'),
            lignes: criticals.filter(c => c.statut === 'soldee' && c.date_solde && c.date_due_cloture
                && new Date(c.date_solde) <= new Date(c.date_due_cloture)),
        },
        crit_maj: { titre: te('stats_moyenne_mensuelle'), lignes: cm },
        majeures: { titre: te('stats_cloture_majeures'), lignes: majeures },
        recurrentes: { titre: te('stats_recurrentes'), lignes: recurrentes },
    };
    const detail = DETAILS[indicateur] || null;

    // Sous-menus du formulaire : les indicateurs, puis la situation générale.
    const onglet = EXEC_STATE.statsOnglet || 'indicateurs';
    const sousMenus = `<div class="exec-stats-onglets">
        ${[['indicateurs', te('indicateurs')], ['situation', te('situation_generale')]]
            .map(([cle, libelle]) => `<button class="exec-stats-onglet${onglet === cle ? ' actif' : ''}"
                onclick="EXEC_STATE.statsOnglet='${cle}';execShowStatistiquesAdvanced()">${_esc(libelle)}</button>`).join('')}
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
        ${sousMenus}
        ${onglet === 'situation' ? `
        <div class="card" id="execSituationGeneraleCard">
            <div class="exec-stats-entete">
                <h4>${te('situation_generale')}</h4>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-primary btn-sm sg-export-btn" onclick="execExportSituationGenerale('xlsx')" title="Exporter Excel">
                        ${EXEC_ICONS.download || EXEC_ICONS.file || ''} ${te('export_excel')}
                    </button>
                    <button class="btn btn-primary btn-sm sg-export-btn" onclick="execExportSituationGenerale('pdf')" title="Exporter PDF">
                        ${EXEC_ICONS.pdf || EXEC_ICONS.download || ''} ${te('export_pdf')}
                    </button>
                </div>
            </div>
            <div id="execSituationGeneraleRoot">${_execSituationGenerale(F).accordionHtml}</div>
        </div>` : `
        ${filterBar}
        ${_execStatsChronologie(bornes, P, cycle)}
        <div class="oasis-kpi-groupes pleine cinq">
            ${oasisKpiGroupe(te('indicateurs_conformite'), [
                oasisKpiCarte({
                    titre: te('stats_critiques'), couleur: '#dc2626', alerte: !!nbCrit,
                    valeur: nbCrit, precision: te('stats_critiques_aide'),
                    figure: { type: 'echelle', position: 92, min: te('faible'), max: te('eleve') },
                    onClick: "execStatsIndicateur('critiques')", actif: indicateur === 'critiques',
                }),
                oasisKpiCarte({
                    titre: te('stats_critiques_delai'), couleur: '#16a34a',
                    valeur: critResolvedInTime,
                    precision: `${te('sur')} ${nbCrit} ${te('critiques').toLowerCase()}`,
                    figure: { type: 'jauge', pct: nbCrit ? Math.round((critResolvedInTime / nbCrit) * 100) : 0 },
                    onClick: "execStatsIndicateur('critiques_delai')", actif: indicateur === 'critiques_delai',
                }),
                oasisKpiCarte({
                    titre: te('stats_moyenne_mensuelle'), couleur: '#f97316',
                    valeur: moyMensCritMaj, precision: te('stats_moyenne_aide'),
                    figure: { type: 'barres', valeurs: repartitionMois },
                    onClick: "execStatsIndicateur('crit_maj')", actif: indicateur === 'crit_maj',
                }),
                oasisKpiCarte({
                    titre: te('stats_cloture_majeures'), couleur: '#059669',
                    valeur: tauxClotMaj,
                    precision: `${majSolded}/${majeures.length} ${te('cloturees_court')}`,
                    figure: { type: 'cloture', pct: majeures.length ? Math.round((majSolded / majeures.length) * 100) : 0 },
                    onClick: "execStatsIndicateur('majeures')", actif: indicateur === 'majeures',
                }),
                oasisKpiCarte({
                    titre: te('stats_recurrentes'), couleur: '#7c3aed',
                    valeur: nbRecur, precision: te('stats_recurrentes_aide'),
                    figure: { type: 'etapes', liste: [te('stats_repetition'), te('stats_isolee')], actif: nbRecur ? 0 : 1 },
                    onClick: "execStatsIndicateur('recurrentes')", actif: indicateur === 'recurrentes',
                }),
            ])}
        </div>
        <div class="exec-crit-grille" id="execCritGrille">
            ${_execTableauRepartition(te('graph_criticite'), repCritSegments, transmitted.length)}
            ${_execTableauRepartition(te('graph_emises'), repEmisesSegments, transmitted.length)}
            ${_execTableauRepartition(te('graph_pac_titre'), repPacSegments, ouvertesStats.length)}
        </div>
        ${_execStatsDetailHtml(indicateur, detail)}`}
    </div>`;

    // Bandeau : sortie du formulaire à gauche, avant son intitulé ; la croix
    // de fermeture n'a plus lieu d'être.
    const titre = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execCloseSlider()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.dashboard || ''} ${te('statistiques')}`;
    execShowSlider(titre, body, '', 'max');
    // Onglet, indicateur, filtres et période vivent dans EXEC_STATE : rejouer
    // le formulaire suffit à le retrouver dans l'état où on l'a laissé.
    EXEC_STATE.voletRejouer = () => execShowStatistiquesAdvanced();
    // Le formulaire se rejoue à chaque onglet et à chaque indicateur : ni
    // glissement du volet, ni fondu du corps entre deux états.
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
    document.querySelector('#execSlider .exec-slider-close')?.remove();
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
                    <span>· ${te('version')}: <strong style="color:#0f172a;">${_esc(_execVersionPlan(plan))}</strong></span>
                    <span>· ${te('annee') || 'Année'}: <strong style="color:#0f172a;">${plan.annee || '-'}</strong></span>
                    <span>· ${te('domaine') || 'Domaine'}: <strong style="color:#0f172a;">${_esc(domNom)}</strong></span>
                    <span>· ${te('secteur') || 'Secteur'}: <strong style="color:#0f172a;">${_esc(secNom)}</strong></span>
                    <span>· ${te('nb_prestataires')}: <strong style="color:#0f172a;">${nbPrest}</strong></span>
                    <span>· ${te('nb_activites') || te('activites')}: <strong style="color:#0f172a;">${acts.length}</strong></span>
                    <span>· ${te('taux_cloture') || 'Taux clôturé'}: <strong style="color:#166534;">${tauxCloture}%</strong></span>
                </span>
                <span style="margin-left:auto;display:inline-flex;align-items:center;gap:0.4rem;"
                      onclick="event.stopPropagation();">
                    ${_execStatusBadge('valide')}
                    ${_execCanValidate() ? `<button class="btn btn-sm btn-outline"
                        onclick="execArchiverPlan('${plan.id}')"
                        title="${_escAttr(te('archiver_plan'))}">${EXEC_ICONS.folder || ''} ${te('archiver')}</button>` : ''}
                </span>
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
                        // Le déclenchement se fait depuis le processus de
                        // l'activité, ouvert au clic sur la ligne : la colonne
                        // Actions ne le double plus.
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
                                ${(notif && _execAdministreParc()) ? `<button class="btn-icon exec-act-reinit"
                                    onclick="execReinitialiserActivite('${a.id}')"
                                    title="${_escAttr(te('reinitialiser_activite'))}"
                                    aria-label="${_escAttr(te('reinitialiser_activite'))}">${EXEC_ICONS.reset || EXEC_ICONS.back || '↺'}</button>` : ''}
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




// Version du plan, telle que la Planification l'a numérotée à la validation.
function _execVersionPlan(plan) {
    const v = plan && (plan.version !== undefined && plan.version !== null && plan.version !== ''
        ? plan.version : plan.version_plan);
    return (v === undefined || v === null || v === '') ? '—' : `V${v}`;
}

// Réinitialisation d'une activité déclenchée : elle redevient déclenchable.
// Réservé au gestionnaire du module ; le serveur refuse si des constatations
// ou un rapport en dépendent.
window.execReinitialiserActivite = async function (activiteId) {
    const ok = await execProcConfirmer({
        titre: te('reinitialiser_activite'),
        message: te('reinitialiser_activite_message'),
        libelle: te('reinitialiser'),
    });
    if (!ok) return;
    try {
        await api(`${EXEC_MODULE_API}/activites-en-cours/${activiteId}/reinitialiser`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('reinitialiser_ok'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

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
                    <input type="text" class="form-input" id="notif_fonction_resp" value="${_escAttr(prest.fonction_responsable || fonctionRespVal)}">
                </div>
                <div class="form-group">
                    <label>${te('nom_responsable')}</label>
                    <input type="text" class="form-input" id="notif_nom_resp" value="${_escAttr(prest.dirigeant || data.nom_responsable || dirigeantVal)}">
                </div>
            </div>
            <!-- Row 2: Interlocuteur (Fonction) ; Interlocuteur (Nom) ; Interlocuteur (Email) -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label>${te('interlocuteur')}</label>
                    <input type="text" class="form-input" id="notif_interlocuteur" value="${_escAttr(prest.interlocuteur || interlocuteurVal)}">
                </div>
                <div class="form-group">
                    <label>${te('interlocuteur_nom')}</label>
                    <input type="text" class="form-input" id="notif_interlocuteur_nom" value="${_escAttr(data.interlocuteur_nom || prest.point_focal || '')}">
                </div>
                <div class="form-group">
                    <label>${te('interlocuteur_email')}</label>
                    <input type="email" class="form-input" id="notif_interlocuteur_email" value="${_escAttr(data.interlocuteur_email || prest.email_point_focal || '')}">
                </div>
            </div>
        `, true)}

        ${_execFormSection('B', 'section_b_equipe_audit', `
            <div id="notif_equipe_container">
                ${equipe.length === 0 ? `<p style="color:var(--text-muted);font-size:0.83rem;">${te('no_data')}</p>` :
                equipe.map((m, i) => {
                    const nom = typeof m === 'string' ? m : (m.nom || '');
                    const role = typeof m === 'object' ? (m.role || '') : '';
                    const roles = _execRolesEquipe();
                    const inspList = _getFilteredInspecteurs();
                    return `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                    <select class="form-select equipe-nom-select" style="flex:1;">
                        <option value="">-- Inspecteur --</option>
                        ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}" ${nom === (ins.prenom + ' ' + ins.nom) ? 'selected' : ''}>${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
                        ${nom && !inspList.some(ins => (ins.prenom + ' ' + ins.nom) === nom) ? `<option value="${_escAttr(nom)}" selected>${_esc(nom)}</option>` : ''}
                    </select>
                    <select class="form-select" style="flex:1;">
                        <option value="">${te('select_option')}</option>
                        ${roles.map(r => `<option value="${_escAttr(r)}" ${role===r?'selected':''}>${_esc(r)}</option>`).join('')}
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
                    <input type="text" class="form-input" id="notif_lieu" value="${_escAttr(lieuVal)}">
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
                        <td><input type="text" class="form-input" value="${_escAttr(p.horaire || '')}" data-field="horaire" placeholder="09:00-12:00"></td>
                        <td><input type="text" class="form-input" value="${_escAttr(p.actions || '')}" data-field="actions"></td>
                        <td><input type="text" class="form-input" value="${_escAttr(p.correspondant || '')}" data-field="correspondant"></td>
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
                    <input type="text" class="form-input" id="notif_fait_a" value="${_escAttr(data.fait_a || '')}">
                </div>
                <div class="form-group">
                    <label>${te('date_signature')}</label>
                    <input type="date" class="form-input" id="notif_date_sig" value="${dateSigVal}">
                </div>
                <div class="form-group">
                    <label>${te('signataire')}</label>
                    <input type="text" class="form-input" id="notif_signataire" value="${_escAttr(data.signataire || EXEC_STATE.user?.nom || '')}">
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
    const roles = _execRolesEquipe();
    const inspList = _getFilteredInspecteurs();
    div.innerHTML = `
        <select class="form-select equipe-nom-select" style="flex:1;">
            <option value="">-- Inspecteur --</option>
            ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}">${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
        </select>
        <select class="form-select" style="flex:1;">
            <option value="">${te('select_option')}</option>
            ${roles.map(r => `<option value="${_escAttr(r)}">${_esc(r)}</option>`).join('')}
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

// Accusé de réception : le prestataire acte la notification. Le message part
// dans le fil d'échange et la fiche porte l'accusé en pied.
window.execAccuserReception = async function (notifId) {
    const n = (EXEC_STATE.data.notifications || []).find(x => x.id === notifId) || {};
    const debut = n.date_debut_effective || n.date_debut_prevue || n.date_activite || '';
    const fin = n.date_fin_effective || n.date_fin_prevue || '';
    const ok = await execProcConfirmer({
        titre: te('accuser_reception'),
        message: te('accuser_reception_message')
            .replace('{debut}', _formatDate(debut) || '—')
            .replace('{fin}', _formatDate(fin) || '—'),
        libelle: te('accuser_reception'),
    });
    if (!ok) return;
    try {
        await api(`${EXEC_MODULE_API}/notifications/${notifId}/accuser-reception`, {
            method: 'POST', body: JSON.stringify({}),
        });
        await execRefreshDynamic();
        _execToast(te('accuse_ok'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

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
            <div class="form-group"><label>Dirigeant</label><input type="text" class="form-input" id="contact_dirigeant" value="${_escAttr(prest.dirigeant || '')}"></div>
            <div class="form-group"><label>Fonction du Responsable</label><input type="text" class="form-input" id="contact_fonction_resp" value="${_escAttr(prest.fonction_responsable || '')}"></div>
            <div class="form-group"><label>Email Prestataire</label><input type="email" class="form-input" id="contact_email_prest" value="${_escAttr(prest.email_prestataire || '')}"></div>
        </div>
        <!-- Row 2: Nom Point Focal ; Fonction Point Focal ; Email Point Focal ; N° Point Focal -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.75rem;">
            <div class="form-group"><label>Nom Point Focal</label><input type="text" class="form-input" id="contact_point_focal" value="${_escAttr(prest.point_focal || '')}"></div>
            <div class="form-group"><label>Fonction Point Focal</label><input type="text" class="form-input" id="contact_fonction_pf" value="${_escAttr(prest.fonction_point_focal || '')}"></div>
            <div class="form-group"><label>Email Point Focal</label><input type="email" class="form-input" id="contact_email_pf" value="${_escAttr(prest.email_point_focal || '')}"></div>
            <div class="form-group"><label>N° Point Focal</label><input type="text" class="form-input" id="contact_numero_pf" value="${_escAttr(prest.numero_point_focal || '')}"></div>
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
                    <input type="text" class="form-input" value="${_escAttr(c.nom || '')}" placeholder="Nom" style="flex:1;">
                    <input type="text" class="form-input" value="${_escAttr(c.tel || '')}" placeholder="Téléphone" style="flex:1;">
                    <input type="email" class="form-input" value="${_escAttr(c.email || '')}" placeholder="Email" style="flex:1;">
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
    <div class="exec-proc-bloc exec-echange-entete">
        ${execProcLigne(te('reference'), _esc(notif.reference || ''))}
        ${execProcLigne(te('provider'), _esc(notif.prestataire_nom || ''))}
        ${execProcLigne(te('objet'), _esc(notif.objet || notif.objet_activite || ''))}
        ${execProcLigne(te('status'), _execStatusBadge(notif.statut))}
    </div>

    <h4 class="exec-proc-col-titre">${te('discussions')}</h4>
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
    <h4 class="exec-proc-col-titre">${te('valider_accord')}${isPrest
        ? ` <span class="exec-echange-lecture">(${te('lecture_seule') || 'lecture seule'})</span>` : ''}</h4>
    <div class="exec-proc-bloc">
        <div class="exec-echange-dates">
            <div class="form-group">
                <label class="form-label">${te('date_debut')}</label>
                <input type="date" class="form-control" id="exec_accord_debut" value="${notif.date_debut_prevue || notif.date_activite || ''}" ${accordReadOnly}>
            </div>
            <div class="form-group">
                <label class="form-label">${te('date_fin')}</label>
                <input type="date" class="form-control" id="exec_accord_fin" value="${notif.date_fin_prevue || notif.date_fin_effective || ''}" ${accordReadOnly}>
            </div>
        </div>
        <label class="form-label">${te('perimetre')}</label>
        <textarea class="form-control" id="exec_accord_perimetre" rows="6" ${accordReadOnlyAttr}>${_esc(notif.perimetre || notif.perimetre_activite || '')}</textarea>
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
    { id: 'conclusion', label: 'Conclusions' },
    { id: 'annexes', label: 'Annexes' },
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
    // Le formulaire de constatation, s'il était ouvert, se referme avec lui.
    document.getElementById('execFncTiroir')?.remove();
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
                <input type="text" class="form-input" value="${_escAttr(dossier.prestataire_nom || dossier.notif_prestataire_designation || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('fonction_responsable')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_fonction_responsable || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('nom_responsable')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_nom_responsable || '')}" readonly style="${bg}">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
            <div class="form-group">
                <label>${te('interlocuteur')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_interlocuteur || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('interlocuteur_nom')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_interlocuteur_nom || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('interlocuteur_email')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_interlocuteur_email || '')}" readonly style="${bg}">
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
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_nature || '')}" readonly style="${bg}">
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
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_lieu || '')}" readonly style="${bg}">
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
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_fait_a || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('date_signature')}</label>
                <input type="text" class="form-input" value="${_formatDate(dossier.notif_date_edition || '')}" readonly style="${bg}">
            </div>
            <div class="form-group">
                <label>${te('signataire')}</label>
                <input type="text" class="form-input" value="${_escAttr(dossier.notif_signataire || '')}" readonly style="${bg}">
            </div>
        </div>
    `, false)}

    <div style="margin-top:1rem;">
        <label style="font-weight:600;">Fiche de notification</label>
        <div style="margin-top:0.35rem;">
            ${pdfPath ? `<a href="${_escAttr(_execDl(pdfPath))}" download class="btn btn-primary btn-sm" style="text-decoration:none;">${EXEC_ICONS.pdf} Exporter PDF</a>` :
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
    const roles = _execRolesEquipe();

    const equipeHtml = canEdit ? `
        <div id="realisation_equipe_container">
            ${equipe.length === 0 ? `<p style="color:var(--text-muted);font-size:0.83rem;">${te('no_data')}</p>` :
            equipe.map(m => {
                const nom = typeof m === 'string' ? m : (m.nom || '');
                const role = typeof m === 'object' ? (m.role || '') : '';
                return `<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.35rem;">
                <select class="form-select real-equipe-nom" style="flex:1;">
                    <option value="">-- Inspecteur --</option>
                    ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}" ${nom === (ins.prenom + ' ' + ins.nom) ? 'selected' : ''}>${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
                    ${nom && !inspList.some(ins => (ins.prenom + ' ' + ins.nom) === nom) ? `<option value="${_escAttr(nom)}" selected>${_esc(nom)}</option>` : ''}
                </select>
                <select class="form-select real-equipe-role" style="flex:1;">
                    <option value="">${te('select_option')}</option>
                    ${roles.map(r => `<option value="${_escAttr(r)}" ${role===r?'selected':''}>${_esc(r)}</option>`).join('')}
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
                    <td><input type="text" class="form-input" value="${_escAttr(p.horaire || '')}" data-field="horaire" placeholder="09:00-12:00"${ro}></td>
                    <td><textarea class="form-input" rows="2" data-field="actions" style="resize:vertical;"${ro}>${_esc(p.actions || '')}</textarea></td>
                    <td><input type="text" class="form-input" value="${_escAttr(p.correspondant || '')}" data-field="correspondant"${ro}></td>
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

    // Pièces jointes de l'activité
    let pjs = [];
    try {
        pjs = typeof dossier.realisation_pieces_jointes === 'string'
            ? JSON.parse(dossier.realisation_pieces_jointes || '[]')
            : (dossier.realisation_pieces_jointes || []);
    } catch (e) { pjs = []; }
    if (!Array.isArray(pjs)) pjs = [];
    const pjHtml = `<div id="realisation_pj_list">${pjs.map((pj) => _execRealisationPjRow(pj, canEdit)).join('')}</div>
        ${canEdit ? `<div style="margin-top:0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="document.getElementById('realisation_pj_input').click()">
                ${EXEC_ICONS.upload} ${te('televerser_pj')}
            </button>
            <input type="file" id="realisation_pj_input" style="display:none;" multiple onchange="execUploadRealisationPj(this.files)">
        </div>` : (pjs.length ? '' : `<p class="exec-real-vide">${te('aucune_piece_jointe')}</p>`)}`;

    const compteur = (n) => `<span class="exec-real-compteur">${n}</span>`;

    // Cinq sections, chacune avec sa lettre, son intitulé et son compteur :
    // le cadre de l'activité, l'équipe, le programme, les checklists et les
    // pièces jointes.
    return `
    <div class="exec-real">
        <div class="exec-real-bandeau">
            <span>${EXEC_ICONS.info || EXEC_ICONS.alarm || ''}</span>
            <p>${te('realisation_intro')}</p>
            ${canEdit ? '' : `<span class="exec-real-lecture">${te('lecture_seule') || 'lecture seule'}</span>`}
        </div>

        ${_execFormSection('A', 'real_section_cadre', `
            <div class="exec-real-grille-4">
                <div class="form-group">
                    <label>${te('real_nature')}</label>
                    <input type="text" class="form-input" id="realisation_nature" value="${_escAttr(vNature)}" style="${bg}"${ro}>
                </div>
                <div class="form-group">
                    <label>${te('date_debut')}</label>
                    <input type="date" class="form-input" id="realisation_date_debut" value="${_escAttr(vDateDebut)}" style="${bg}"${ro}>
                </div>
                <div class="form-group">
                    <label>${te('date_fin')}</label>
                    <input type="date" class="form-input" id="realisation_date_fin" value="${_escAttr(vDateFin)}" style="${bg}"${ro}>
                </div>
                <div class="form-group">
                    <label>${te('lieu')}</label>
                    <input type="text" class="form-input" id="realisation_lieu" value="${_escAttr(vLieu)}" style="${bg}"${ro}>
                </div>
            </div>
            <div class="exec-real-grille-2">
                <div class="form-group">
                    <label>${te('objet')}</label>
                    <textarea class="form-input" id="realisation_activite" rows="3" style="resize:vertical;${bg}"${ro}>${_esc(vObjet)}</textarea>
                </div>
                <div class="form-group">
                    <label>${te('perimetre')}</label>
                    <textarea class="form-input" id="realisation_perimetre" rows="3" style="resize:vertical;${bg}"${ro}>${_esc(vPerimetre)}</textarea>
                </div>
            </div>
        `, true)}

        ${_execFormSection('B', 'real_section_equipe', equipeHtml, true, compteur(equipe.length), te('real_aide_equipe'))}

        ${_execFormSection('C', 'real_section_programme', programmeHtml, true, compteur(programme.length), te('real_aide_programme'))}

        ${_execFormSection('D', 'real_section_checklists', checklistsHtml, true, compteur(selectedChIds.length), te('real_aide_checklists'))}

        ${_execFormSection('E', 'real_section_pj', pjHtml, true, compteur(pjs.length), te('real_aide_pj'))}
    </div>`;
}

// Rendu d'une ligne de pièce jointe (nom éditable + description + lien fichier)
function _execRealisationPjRow(pj, canEdit) {
    const filename = (pj && (pj.filename || pj.name)) || '';
    const description = (pj && pj.description) || '';
    const path = (pj && pj.path) || '';
    const origName = (pj && pj.orig_name) || filename;
    const dis = canEdit ? '' : ' readonly';
    return `<div class="realisation-pj-item" data-path="${_escAttr(path)}" data-orig="${_escAttr(origName)}"
        style="border:1px solid var(--border);border-radius:8px;padding:0.6rem;margin-bottom:0.5rem;">
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem;">
            ${EXEC_ICONS.file}
            ${path ? `<a href="${_escAttr(_execDl(path))}" download="${_escAttr(origName)}" style="font-size:0.78rem;color:var(--primary);">${_esc(origName)}</a>` : `<span style="font-size:0.78rem;color:var(--text-muted);">${_esc(origName)}</span>`}
            ${canEdit ? `<button class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="this.closest('.realisation-pj-item').remove()">${EXEC_ICONS.x}</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:0.5rem;">
            <input type="text" class="form-input pj-nom" value="${_escAttr(filename)}" placeholder="Nom du fichier"${dis}>
            <input type="text" class="form-input pj-desc" value="${_escAttr(description)}" placeholder="Description (optionnel)"${dis}>
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

    // Les anciennes sous-étapes deviennent des sections : le rapport se lit et
    // se saisit d'une traite, et un enregistrement les couvre toutes — l'onglet
    // actif ne masque plus le reste.
    const sections = REDACTION_SUBTABS.map((sub, i) => {
        const lettre = EXEC_REDACTION_LETTRES[sub.id] || String.fromCharCode(65 + i);
        const corps = _buildRedactionSubtabContent(sub.id, dossier, dossierId, canEdit);
        const badge = sub.id === 'constatations' ? String(constatations.length) : '';
        return _execFormSection(lettre, `redac_section_${sub.id}`, corps, true, badge,
            te(`redac_aide_${sub.id}`));
    }).join('');
    return `${commentsPanel}<div class="exec-real" id="dossier_redaction_sections">`
        + `${_execTypeRapportChamp(dossier, canEdit)}${sections}</div>`;
}

// ── Type de rapport ──────────────────────────────────────────────
// L'intitulé que portera le document produit. Il précède les sections :
// c'est la première chose à arrêter, puisqu'elle nomme tout le rapport.
const EXEC_TYPES_RAPPORT = [
    "RAPPORT D'AUDIT", "RAPPORT D'INSPECTION", 'RAPPORT DE SUIVI',
    "RAPPORT D'ENQUÊTE", 'AUTRE',
];

function _execTypeRapportChamp(dossier, canEdit) {
    const choisi = dossier.type_rapport || '';
    const libre = dossier.type_rapport_autre || '';
    const estAutre = choisi === 'AUTRE';
    const ro = canEdit ? '' : ' readonly';
    const dis = canEdit ? '' : ' disabled';
    const roBg = canEdit ? '' : 'background:var(--bg);';
    return `
    <div class="exec-type-rapport">
        <div class="form-group" id="dossier_type_rapport_autre_group" style="${estAutre ? '' : 'display:none;'}">
            <label>Intitulé du rapport</label>
            <input type="text" class="form-input" id="dossier_type_rapport_autre" value="${_escAttr(libre)}"
                   placeholder="Ex. : RAPPORT DE CONTRÔLE"${ro} style="${roBg}">
        </div>
        <div class="form-group">
            <label>Type de Rapport</label>
            <select class="form-input" id="dossier_type_rapport" onchange="execTypeRapportChange()"${dis} style="${roBg}">
                <option value="">-- Sélectionner --</option>
                ${EXEC_TYPES_RAPPORT.map((t) => `<option value="${_escAttr(t)}"${t === choisi ? ' selected' : ''}>${_esc(t)}</option>`).join('')}
            </select>
        </div>
    </div>`;
}

function execTypeRapportChange() {
    const select = document.getElementById('dossier_type_rapport');
    const groupe = document.getElementById('dossier_type_rapport_autre_group');
    if (!select || !groupe) return;
    const estAutre = select.value === 'AUTRE';
    groupe.style.display = estAutre ? '' : 'none';
    if (estAutre) document.getElementById('dossier_type_rapport_autre')?.focus();
}

// Intitulé porté par le document produit : le choix fait ici prime ; à défaut,
// la nature de l'activité notifiée continue de nommer le rapport.
function _execIntituleRapport(dossier, defaut) {
    const choisi = String((dossier || {}).type_rapport || '').trim();
    if (choisi === 'AUTRE') {
        const libre = String(dossier.type_rapport_autre || '').trim();
        if (libre) return libre.toUpperCase();
    } else if (choisi) {
        return choisi;
    }
    return defaut;
}

// Correspondance sous-étape → lettre de section, pour l'ancrage.
const EXEC_REDACTION_LETTRES = {
    introduction: 'A', synthese: 'B', checklists: 'C', constatations: 'D',
    conclusion: 'E', annexes: 'F',
};

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
    const toutes = (dossier.rapports || []).slice().sort((a,b) => (b.version||0) - (a.version||0));
    // À la Transmission, l'historique des versions n'a plus cours : seule la
    // version validée est en jeu, c'est elle qui part au prestataire.
    const surTransmission = _execSurTransmission();
    const rapports = surTransmission
        ? toutes.filter(r => ['valide', 'transmis'].includes(r.statut))
        : toutes;
    const lastRap = rapports[0];
    const courriel = surTransmission && lastRap ? _execCourrielTransmission(dossier, lastRap) : '';
    return `
    ${rapports.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">${surTransmission ? 'Aucun rapport validé pour le moment.' : 'Aucun rapport soumis pour le moment.'}</p>` : `
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
    </div>`}
    ${courriel}`;
}

// ── Transmission par courriel ────────────────────────────────────
// Consulte-t-on l'étape Transmission ? Le formulaire Dossier ne connaît que
// « Validation » : c'est le fil du processus qui distingue les deux.
function _execSurTransmission() {
    return typeof EXEC_PROC !== 'undefined' && !!EXEC_PROC && !!EXEC_PROC.actif
        && EXEC_PROC.etape === 'transmission';
}

// Adresse du destinataire : celle retenue à la notification, sinon celle du
// point focal du prestataire.
function _execAdressePrestataire(dossier) {
    const prest = (EXEC_STATE.data.prestataires || [])
        .find(p => p.id === dossier.prestataire_id) || {};
    return dossier.notif_interlocuteur_email || dossier.interlocuteur_email
        || prest.email_point_focal || prest.email_prestataire || '';
}

function _execCourrielTransmission(dossier, rapport) {
    const dejaTransmis = rapport.statut === 'transmis';
    const intitule = _execIntituleRapport(dossier, 'RAPPORT DE SURVEILLANCE');
    const objet = `${intitule} ${rapport.reference || ''} — ${dossier.prestataire_nom || ''}`.trim();
    const message = [
        `${dossier.notif_interlocuteur_nom ? `${dossier.notif_interlocuteur_nom},` : 'Madame, Monsieur,'}`,
        '',
        `Le rapport ${rapport.reference || ''} relatif à l'activité de surveillance `
            + `« ${dossier.objet_activite || dossier.notification_objet || ''} » est mis à votre `
            + 'disposition dans OASIS. Les liens de téléchargement figurent au bas de ce message.',
        '',
        'Les constatations qu\'il porte appellent, le cas échéant, un plan d\'actions correctives '
            + 'à soumettre dans les délais indiqués.',
        '',
        'Nous vous prions d\'agréer nos salutations distinguées.',
    ].join('\n');
    const ro = dejaTransmis ? ' readonly' : '';

    return `
    <div class="exec-courriel" id="exec_courriel_transmission">
        <div class="exec-courriel-entete">
            <span>${EXEC_ICONS.send}</span>
            <h4>Transmission du rapport au prestataire</h4>
            ${dejaTransmis ? `<span class="exec-courriel-etat">Transmis le ${_formatDate(rapport.date_transmission)}${
                rapport.transmis_a ? ` à ${_esc(rapport.transmis_a)}` : ''}</span>` : ''}
        </div>
        <div class="form-group">
            <label>Destinataire</label>
            <input type="text" class="form-input" id="courriel_destinataire"
                   value="${_escAttr(dejaTransmis ? (rapport.transmis_a || '') : _execAdressePrestataire(dossier))}"
                   placeholder="adresse@prestataire.bj"${ro}>
        </div>
        <div class="exec-courriel-copies">
            <div class="form-group">
                <label>Copie (Cc)</label>
                <input type="text" class="form-input" id="courriel_copie" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
            <div class="form-group">
                <label>Copie cachée (Cci)</label>
                <input type="text" class="form-input" id="courriel_copie_cachee" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
        </div>
        <div class="form-group">
            <label>Objet</label>
            <input type="text" class="form-input" id="courriel_objet" value="${_escAttr(objet)}"${ro}>
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea class="form-input" id="courriel_message" rows="8" style="resize:vertical;"${ro}>${_esc(message)}</textarea>
        </div>
        <div class="form-group">
            <label>Documents transmis</label>
            <p class="exec-courriel-note">Le message ne porte aucune pièce jointe : il annonce des liens
               de téléchargement, que le prestataire suit depuis son compte OASIS.</p>
            <div id="courriel_pieces">
                <div class="exec-piece exec-piece-rapport">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien((rapport.document || {}).path, `${rapport.reference || 'rapport'}.pdf`,
                        `execDownloadRapport('${rapport.id}', false)`)}
                    <span class="exec-piece-mention">Rapport validé — joint d'office</span>
                </div>
                ${(dejaTransmis ? (rapport.pieces_transmises || []) : []).map(f => `
                <div class="exec-piece">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien(f.path, f.intitule || f.filename || '')}
                    <span class="exec-piece-mention">${_esc(f.filename || '')}</span>
                </div>`).join('')}
            </div>
            ${dejaTransmis ? '' : `
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()" style="margin-top:0.5rem;">
                ${EXEC_ICONS.upload} Ajouter un fichier
            </button>
            <input type="file" style="display:none;" multiple onchange="execCourrielAjouterFichiers(this)">`}
        </div>
        <div class="exec-courriel-pied">
            ${dejaTransmis ? '' : `
            <button class="btn btn-primary btn-sm" id="courriel_envoyer"
                    onclick="execTransmettreRapport('${rapport.id}')">
                ${EXEC_ICONS.send} Envoyer
            </button>`}
        </div>
    </div>`;
}

// Chaque document listé s'ouvre d'un clic, sous son intitulé. Tant que le
// rapport n'est pas parti, son document n'existe pas encore sur le serveur :
// c'est l'aperçu qui en tient lieu.
function _execPieceLien(chemin, intitule, repli) {
    const nom = _esc(intitule || '');
    if (chemin) {
        // La session suffit à autoriser la lecture : rien à porter dans l'URL.
        const url = `${chemin}${chemin.includes('?') ? '&' : '?'}nom=${encodeURIComponent(intitule || '')}`;
        return `<a class="exec-piece-nom" href="${_escAttr(url)}" target="_blank" rel="noopener"
                   title="Ouvrir ${nom}">${nom}</a>`;
    }
    if (repli) {
        return `<a class="exec-piece-nom" href="#" onclick="event.preventDefault();${_escAttr(repli)}"
                   title="Aperçu du rapport">${nom}</a>`;
    }
    return `<span class="exec-piece-nom">${nom}</span>`;
}

// Pièces complémentaires à transmettre : le fichier est déposé dès sa
// sélection ; l'intitulé, modifiable, est ce que le prestataire lira.
async function execCourrielAjouterFichiers(input) {
    const conteneur = document.getElementById('courriel_pieces');
    if (!conteneur || !input.files || !input.files.length) return;
    for (const fichier of [...input.files]) {
        const formData = new FormData();
        formData.append('file', fichier);
        formData.append('nom', fichier.name);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData,
            });
            const data = await res.json();
            if (data.status !== 'ok') throw new Error(data.error || 'Téléversement refusé');
            const ligne = document.createElement('div');
            ligne.className = 'exec-piece';
            ligne.dataset.path = data.path;
            ligne.dataset.filename = data.filename;
            ligne.innerHTML = `
                <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                <input type="text" class="form-input exec-piece-intitule" value="${_escAttr(data.filename)}"
                       placeholder="Intitulé du document">
                <a class="exec-piece-ouvrir" href="${_escAttr(data.path)}" target="_blank" rel="noopener"
                   title="Ouvrir le document">${EXEC_ICONS.eye || 'Ouvrir'}</a>
                <span class="exec-piece-mention">${_esc(_execTaille(data.size))}</span>
                <button class="btn btn-sm btn-ghost exec-piece-retirer" title="Retirer"
                        onclick="this.closest('.exec-piece').remove()">${EXEC_ICONS.x}</button>`;
            conteneur.appendChild(ligne);
        } catch (e) {
            console.error('Téléversement :', e);
            _execToast(`${fichier.name} : ${(e && e.message) || 'téléversement impossible'}`, 'error');
        }
    }
    input.value = '';
}

function _execTaille(octets) {
    const n = Number(octets) || 0;
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function _execCourrielFichiers() {
    return [...document.querySelectorAll('#courriel_pieces .exec-piece[data-path]')].map(l => ({
        path: l.dataset.path,
        filename: l.dataset.filename || '',
        intitule: (l.querySelector('.exec-piece-intitule') || {}).value || l.dataset.filename || '',
    }));
}

async function execTransmettreRapport(rapportId) {
    const val = (id) => (document.getElementById(id) || {}).value || '';
    const destinataire = val('courriel_destinataire').trim();
    if (!destinataire) { _execToast('Indiquez au moins un destinataire', 'error'); return; }
    const bouton = document.getElementById('courriel_envoyer');
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi…'; }
    try {
        // Le document déposé est celui que l'aperçu produit : une seule source.
        const html = await execDownloadRapport(rapportId, false, true);
        if (!html) throw new Error('Rapport indisponible');
        const rapport = ((EXEC_STATE.selectedDossier || {}).rapports || [])
            .find(r => r.id === rapportId) || {};
        const remise = await api(`${EXEC_MODULE_API}/rapports/${rapportId}/transmettre`, {
            method: 'POST',
            body: JSON.stringify({
                destinataire,
                copie: val('courriel_copie'),
                copie_cachee: val('courriel_copie_cachee'),
                objet: val('courriel_objet'),
                message: val('courriel_message'),
                // Le serveur rend cette mise en page en PDF : il lui faut le
                // document tel quel, non enveloppé pour Word.
                piece: { nom: `${rapport.reference || 'rapport'}.pdf`, contenu: html },
                fichiers: _execCourrielFichiers(),
            }),
        });
        // Sans serveur de messagerie configuré, la remise est acquise mais
        // aucun message n'est parti : il faut le dire.
        _execToast(remise && remise.envoye === false
            ? te('transmis_sans_courriel')
            : 'Rapport transmis au prestataire', remise && remise.envoye === false ? 'warning' : 'success');
        // Le fil d'avancement lit son propre exemplaire du dossier : sans
        // rechargement, l'étape resterait « à traiter » après l'envoi.
        if (_execSurTransmission() && typeof execProcRecharger === 'function') {
            await execProcRecharger('transmission');
            return;
        }
        await execRefreshDynamic();
        const d = EXEC_STATE.selectedDossier;
        if (d) execOpenDossierSlider(d.id);
    } catch (e) {
        console.error('Transmission rapport :', e);
        _execToast((e && e.message) || 'Erreur lors de la transmission', 'error');
        if (bouton) { bouton.disabled = false; bouton.innerHTML = `${EXEC_ICONS.send} Envoyer`; }
    }
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
            // Une fois le rapport parti chez le prestataire, il n'est plus
            // amendable : la version transmise fait foi.
            if (!hasTransmitted) {
                buttons += `<button class="btn btn-outline" onclick="execAmendRapport('${lastRap.id}')">${EXEC_ICONS.edit} Amender</button>`;
            }
            // À la Transmission, l'envoi se fait depuis le formulaire de
            // courriel : un second bouton transmettrait sans destinataire.
            if (!hasTransmitted && !_execSurTransmission()) {
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

// Les sous-étapes sont devenues des sections : « aller à » revient à ouvrir la
// section visée et à l'amener sous les yeux.
function execSwitchRedactionSubtab(dossierId, subtabId) {
    EXEC_STATE.dossierRedactionSubtab = subtabId;
    const lettre = EXEC_REDACTION_LETTRES[subtabId];
    const section = lettre && document.getElementById(`exec-section-${lettre}`);
    if (!section) return;
    section.classList.add('expanded');
    section.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
                <input type="text" class="form-input" id="dossier_dates_activite" value="${_escAttr(dossier.dates_activite || notifDates || '')}"${ro} style="${roBg}">
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
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(cl.path || '')}">
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
        <div class="form-group" style="margin-bottom:1rem;">
            <label>${te('opportunites_amelioration')}</label>
            <textarea class="form-input" id="dossier_opportunites" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.opportunites_amelioration || '')}</textarea>
        </div>
        <div class="form-group">
            <label>${te('resume_global')}</label>
            <textarea class="form-input" id="dossier_resume_global" rows="4" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.resume_global_constatations || '')}</textarea>
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
            <button class="btn btn-sm btn-danger" onclick="execOpenFNCForm('${dossierId}')">
                ${EXEC_ICONS.add} ${te('ajouter_constatation')}
            </button>` : ''}
            ${constatations.length > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="execExportConstatations('${dossierId}','xlsx')" title="Exporter Excel">
                ${EXEC_ICONS.download || EXEC_ICONS.file} Exporter Excel
            </button>
            <button class="btn btn-primary btn-sm" onclick="execFichesConstatDossier('${dossierId}')" title="Exporter PDF">
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
                        return fpath ? `<a href="${_escAttr(_execDl(fpath))}" download="${_escAttr(fname)}" style="display:inline-flex;align-items:center;gap:0.2rem;font-size:0.8rem;color:var(--primary);">${EXEC_ICONS.file} ${_esc(fname)}</a>` : `<span style="font-size:0.8rem;">${_esc(fname)}</span>`;
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
        <div class="form-group">
            <textarea class="form-input" id="dossier_conclusion" rows="5" style="resize:vertical;${roBg}"${ro}>${_esc(dossier.conclusion || '')}</textarea>
        </div>`;
    } else if (tab === 'annexes') {
        return `
        <div id="dossier_annexes_list">
            ${(dossier.annexes || []).map((a, i) => {
                const obj = typeof a === 'object' ? a : { intitule: '', contenu: '', filename: a };
                return `
                <div class="dossier-annexe-item" style="border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;">
                    <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
                        <input type="text" class="form-input annexe-intitule" value="${_escAttr(obj.intitule || obj.filename || '')}" placeholder="Intitulé de l'annexe" style="flex:1;">
                        ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="this.closest('.dossier-annexe-item').remove()">${EXEC_ICONS.x}</button>` : ''}
                    </div>
                    <textarea class="form-input annexe-contenu" rows="3" style="resize:vertical;margin-bottom:0.5rem;" placeholder="Contenu...">${_esc(obj.contenu || '')}</textarea>
                    <div class="annexe-files" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        ${(obj.files || []).map(f => `<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.2rem 0.5rem;background:var(--bg);border-radius:4px;font-size:0.8rem;" data-path="${_escAttr(f.path || '')}" data-filename="${_escAttr(f.filename || f)}">${EXEC_ICONS.file} ${_esc(f.filename || f)} <button class="btn btn-sm" style="padding:0;color:#ef4444;" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button></span>`).join('')}
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
    const roles = _execRolesEquipe();
    const inspList = typeof _getFilteredInspecteurs === 'function' ? _getFilteredInspecteurs() : [];
    div.innerHTML = `
        <select class="form-select real-equipe-nom" style="flex:1;">
            <option value="">-- Inspecteur --</option>
            ${inspList.map(ins => `<option value="${_escAttr(ins.prenom + ' ' + ins.nom)}">${_esc(ins.prenom)} ${_esc(ins.nom)}</option>`).join('')}
        </select>
        <select class="form-select real-equipe-role" style="flex:1;">
            <option value="">${te('select_option')}</option>
            ${roles.map(r => `<option value="${_escAttr(r)}">${_esc(r)}</option>`).join('')}
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
    // Type de rapport (au-dessus des sections)
    const typeEl = document.getElementById('dossier_type_rapport');
    const typeLibreEl = document.getElementById('dossier_type_rapport_autre');
    if (typeEl) data.type_rapport = typeEl.value;
    if (typeLibreEl) data.type_rapport_autre = typeLibreEl.value;

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
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
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

// ══════════════════════════════════════
//  Tiroir du formulaire de constatation
// ══════════════════════════════════════
// Volet à part, superposé au rapport : l'écran d'où l'on vient reste affiché
// derrière, à gauche. Bandeau propre, liseré rouge, pied dédié.
function _execFncTiroirAfficher(dossierId, bodyHtml, footerHtml, reference) {
    document.getElementById('execFncTiroir')?.remove();
    const tiroir = document.createElement('div');
    tiroir.id = 'execFncTiroir';
    tiroir.className = 'exec-fnc-tiroir';
    tiroir.innerHTML = `
        <div class="exec-fnc-tiroir-tete">
            <button class="btn btn-outline btn-sm exec-proc-retour" onclick="execFermerFncTiroir()">
                ${EXEC_ICONS.back || ''} ${te('retour_rapport')}
            </button>
            <span class="exec-fnc-tiroir-titre">${EXEC_ICONS.constatations} ${te('constatation')}</span>
            ${reference ? `<span class="exec-form-titre-ref">${_esc(reference)}</span>` : ''}
        </div>
        <div class="exec-fnc-tiroir-corps">${bodyHtml}</div>
        ${footerHtml ? `<div class="exec-slider-footer exec-fnc-tiroir-pied">${footerHtml}</div>` : ''}`;
    document.body.appendChild(tiroir);
    // Le tiroir commence sous la ligne de séparation du fil d'avancement.
    // Ce fil défile avec le corps du volet : s'il est remonté hors de vue, on
    // se rabat sur le bandeau, qui ne bouge pas. Sans ce garde-fou, le tiroir
    // démarrait au-dessus de l'écran et sa fin restait inaccessible.
    const hote = document.getElementById('execSlider');
    const bandeau = hote && hote.querySelector('.exec-slider-header');
    const fil = hote && hote.querySelector('.exec-proc-barre');
    const plancher = bandeau ? Math.round(bandeau.getBoundingClientRect().bottom)
        : (hote ? Math.round(hote.getBoundingClientRect().top) : 0);
    let haut = plancher;
    if (fil) {
        const basFil = Math.round(fil.getBoundingClientRect().bottom);
        // Entre le bandeau et le tiers haut de l'écran : au-delà, le fil a
        // défilé et ne sert plus de repère.
        if (basFil > plancher && basFil < window.innerHeight / 3) haut = basFil;
    }
    tiroir.style.top = `${haut}px`;
    requestAnimationFrame(() => tiroir.classList.add('ouvert'));
}

window.execFermerFncTiroir = function () {
    const tiroir = document.getElementById('execFncTiroir');
    if (!tiroir) return;
    tiroir.classList.remove('ouvert');
    setTimeout(() => tiroir.remove(), 250);
};

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
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');

    const defaultEmisPar = fnc.emis_par || relNotif.equipe_chef || EXEC_STATE.user?.nom || '';
    const defaultAdresseA = fnc.adresse_a || relNotif.prestataire_interlocuteur || '';
    const defaultDateOuverture = fnc.date_ouverture || actDateFin || new Date().toISOString().slice(0, 10);
    const minDate = actDateDebut || '';
    const G = 'gap:0.6rem;', MB = 'margin-bottom:0.5rem;';

    const bodyHtml = `
    <div class="exec-real">
        <input type="hidden" id="fnc_min_date" value="${minDate}">

        ${_execFormSection('A', 'fnc_section_identification', `
        <!-- Row 1: Emis Par ; Adressé a ; Date d'ouverture -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;${G}${MB}">
            <div class="form-group" style="${MB}">
                <label>${te('emis_par')}</label>
                <input type="text" class="form-input" id="fnc_emis_par" value="${_escAttr(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a')}</label>
                <input type="text" class="form-input" id="fnc_adresse_a" value="${_escAttr(defaultAdresseA)}">
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
        `, true, '', te('fnc_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
        <!-- Row 3: Réf. Réglementaires (tag-input) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires')}</label>
            <div id="fnc_ref_tags" style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);min-height:2.2rem;cursor:text;" onclick="document.getElementById('fnc_ref_input').focus()">
                ${(fnc.ref_reglementaires || fnc.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span class="fnc-ref-tag" data-ref="${_escAttr(r)}" title="${_escAttr(exig?.libelle||'')}" style="display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;">${_esc(r)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button></span>`;
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
        `, true, '', te('fnc_aide_constat'))}

        ${_execFormSection('C', 'fnc_section_traitement', `
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
                <input type="number" class="form-input" id="fnc_delai" min="1" value="${_escAttr(fnc.delai_solde || fnc.delai_correction || _execCriticiteDelai(fnc.criticite || fnc.gravite) || '30')}" onchange="execCalcDateDue()" oninput="execCalcDateDue()">
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
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
        <!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves')}</label>
            <div id="fnc_preuves_list">
                ${(fnc.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.4rem;padding:1rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('fnc_proof_input').click()">
                ${EXEC_ICONS.upload} ${te('upload_zone')}
                <input type="file" id="fnc_proof_input" style="display:none;" multiple onchange="execUploadFNCProof(this.files)">
            </div>
        </div>
        `, true, '', te('fnc_aide_preuves'))}
    </div>`;

    const footerHtml = `
        <button class="btn btn-outline" onclick="execFermerFncTiroir()">${te('cancel')}</button>
        <button class="btn btn-primary" onclick="execSaveFNC('${dossierId}', '${fnc.id || ''}')">
            ${EXEC_ICONS.check} ${te('save')}
        </button>
    `;

    // Le formulaire s'ouvre dans son propre tiroir, par-dessus l'écran du
    // rapport : celui-ci reste visible et lisible à gauche.
    _execFncTiroirAfficher(dossierId, bodyHtml, footerHtml, fnc.reference || '');

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
                    return `<span title="${_escAttr(exig?.libelle||'')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
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
                        ? `<div style="padding:0.2rem 0;">${EXEC_ICONS.file||'📎'} <a href="${_escAttr(_execDl(fpath))}" download="${_escAttr(fname)}" style="font-size:0.85rem;color:var(--primary);">${_esc(fname)}</a></div>`
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
        execFermerFncTiroir();
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
    // Le prestataire n'a ni la liste « En Préparation » ni le « Suivi Terrain ».
    if (isPrest) EXEC_STATE.currentConstSub = 'suivi';
    const sub = EXEC_STATE.currentConstSub || 'suivi';
    const all = EXEC_STATE.data.constatations || [];
    const PRE_TRANSMIT  = new Set(['brouillon', 'direct_brouillon', 'direct_soumis', 'direct_valide', 'direct_rejete', 'direct_renvoye']);
    const POST_TRANSMIT = new Set(EXEC_CONSTA_EN_VIGUEUR);
    const countList  = all.filter(c => PRE_TRANSMIT.has(c.statut  || '')).length;
    const countSuivi = all.filter(c => POST_TRANSMIT.has(c.statut || '')).length;
    const countTerrain = _execConstaTerrain(all).length;
    // Suivi d'abord, puis En Préparation, puis Suivi Terrain.
    const subNav = `
    <div class="exec-workflow-tabs" style="margin-bottom:1rem;">
        <button class="exec-tab ${sub==='suivi'?'active':''}" onclick="EXEC_STATE.currentConstSub='suivi';execRenderPage();">
            ${te('consta_sub_suivi')} <span class="exec-tab-badge">${countSuivi}</span>
        </button>
        ${isPrest ? '' : `<button class="exec-tab ${sub==='terrain'?'active':''}" onclick="EXEC_STATE.currentConstSub='terrain';execRenderPage();">
            ${te('consta_sub_terrain')} <span class="exec-tab-badge">${countTerrain}</span>
        </button>`}
        ${isPrest ? '' : `<button class="exec-tab ${sub==='list'?'active':''}" onclick="EXEC_STATE.currentConstSub='list';execRenderPage();">
            ${te('consta_sub_list')} <span class="exec-tab-badge">${countList}</span>
        </button>`}
    </div>`;
    if (sub === 'terrain') return _execRenderConstaTerrain(subNav);
    return sub === 'suivi' ? _execRenderConstaSuivi(subNav) : _execRenderConstaList(subNav);
}

// Constatations à l'étape Clôture dont la vérification sur le terrain a été
// demandée par l'AAC, et qui ne sont pas encore soldées.
function _execConstaTerrain(liste) {
    return (liste || []).filter((c) => {
        if ((c.statut || '') === 'soldee') return false;
        let ev = c.commentaire_evaluation;
        if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
        const anac = (ev || {}).evaluation_anac || {};
        const v = anac.verification || {};
        if (!v.verification_terrain) return false;
        // Étape Clôture : acceptation du plan et des preuves prononcées.
        const accepte = (anac.acceptation || {}).accepte === 'OUI' || c.statut === 'pac_valide';
        const preuves = v.preuves_acceptees === 'OUI'
            || (v.isolement_realise === 'OUI' && v.risques_traites === 'OUI')
            || (anac.cloture || {}).mise_en_oeuvre_effective === 'OUI';
        return accepte && preuves;
    });
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
    const OPEN_STATUTS = new Set(EXEC_CONSTA_EN_VIGUEUR);
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
        // Sous-menu « Suivi » : la ligne ouvre directement le formulaire de
        // suivi ; ailleurs elle déplie le détail sous la ligne.
        const ouvrePac = (EXEC_STATE.currentConstSub === 'suivi') && OPEN_STATUTS.has(c.statut || '');
        const actionLigne = ouvrePac
            ? `execOpenPACSlider('${c.id}')`
            : `document.getElementById('${rowId}').style.display = document.getElementById('${rowId}').style.display === 'none' ? 'table-row' : 'none';`;
        return `<tr style="cursor:pointer;" onclick="${actionLigne}">
            <td><strong>${_esc(c.reference || '')}</strong>${ouvrePac ? ''
                : ` <span style="font-size:0.7rem;color:var(--text-muted);">${EXEC_ICONS.chevronDown}</span>`}</td>
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
                        return ouvrePac ? ''
                            : `<button class="btn btn-sm btn-outline" onclick="execOpenPACSlider('${c.id}')" title="${te('suivi_pac')}">${EXEC_ICONS.clipboard}</button>`;
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
    EXEC_STATE.constaExport = filtered.map((c) => c.id);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('consta_sub_list')}</h2>
            <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            ${_execBoutonsExport()}
            ${canCreateDirect ? `<button class="btn btn-primary exec-btn-27" onclick="execOpenConstatationDirecteForm()">${EXEC_ICONS.plus || '+'} Nouvelle Constatation</button>` : ''}
        </div>
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
    const POST_TRANSMIT = new Set(EXEC_CONSTA_EN_VIGUEUR);
    const base = allConstatations.filter(c => POST_TRANSMIT.has(c.statut || ''));
    const filtered = _execApplyConstaFilters(base);
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    EXEC_STATE.constaExport = filtered.map((c) => c.id);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('consta_sub_suivi')}</h2>
            ${_execBoutonsExport()}
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
//  Export des constatations : classeur et document imprimable
// ══════════════════════════════════════
// Les deux exports portent sur la liste telle qu'elle est affichée : les
// filtres actifs sont donc appliqués, et rappelés en tête du document.
function _execBoutonsExport() {
    return `<div class="exec-export-actions">
        <button class="btn btn-sm btn-primary" onclick="execExporterConstatationsPdf()">
            ${EXEC_ICONS.download} ${te('export_pdf')}
        </button>
        <button class="btn btn-sm btn-primary" onclick="execExporterConstatationsXlsx()">
            ${EXEC_ICONS.download} ${te('export_excel')}
        </button>
    </div>`;
}

function _execFiltresLisibles() {
    const F = EXEC_STATE.filters || {};
    const nom = (coll, id) => (EXEC_STATE.data[coll] || []).find((x) => x.id === id)?.nom || id;
    const parts = [];
    if (F.domaine) parts.push(`${te('domaine')} : ${nom('domaines', F.domaine)}`);
    if (F.prestataire) parts.push(`${te('provider')} : ${nom('prestataires', F.prestataire)}`);
    if (F.annee) parts.push(`${te('exp_annee')} : ${F.annee}`);
    if (F.trimestre) parts.push(`${te('trimestre')} : T${F.trimestre}`);
    if (F.criticite) parts.push(`${te('criticite')} : ${F.criticite}`);
    if (F.statut) parts.push(`${te('statut')} : ${F.statut}`);
    if (F.search) parts.push(`${te('exp_recherche')} : « ${F.search} »`);
    return parts.length ? parts.join('   ·   ') : (te('aucun_filtre') || 'Aucun filtre');
}

function _execTitreSousMenu() {
    const sub = EXEC_STATE.currentConstSub || 'suivi';
    if (sub === 'terrain') return te('consta_sub_terrain');
    if (sub === 'suivi') return `${te('constatations')} — ${te('consta_sub_suivi')}`;
    return `${te('constatations')} — ${te('consta_sub_list')}`;
}

function _execConstatationsExportees() {
    const ids = EXEC_STATE.constaExport || [];
    const par = new Map((EXEC_STATE.data.constatations || []).map((c) => [c.id, c]));
    return ids.map((id) => par.get(id)).filter(Boolean);
}

async function execExporterConstatationsXlsx() {
    const ids = EXEC_STATE.constaExport || [];
    if (!ids.length) { _execToast(te('no_data'), 'warning'); return; }

    // Voie normale : le navigateur télécharge lui-même la réponse, guidé par
    // l'en-tête Content-Disposition. Aucune manipulation de blob, donc rien
    // que le navigateur puisse écarter silencieusement.
    const parametres = new URLSearchParams({
        ids: ids.join(','), titre: _execTitreSousMenu(), filtres: _execFiltresLisibles(),
    });
    const url = `${EXEC_MODULE_API}/constatations/export-xlsx?${parametres}`;
    if (url.length < 6000) { window.location.href = url; return; }

    // Liste trop longue pour une URL : on repasse par le corps de requête.
    try {
        const reponse = await fetch(`${EXEC_MODULE_API}/constatations/export-xlsx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: JSON.stringify({ ids, titre: _execTitreSousMenu(), filtres: _execFiltresLisibles() }),
        });
        // 404 : la route d'export n'est pas montée — serveur à redémarrer.
        if (reponse.status === 404) throw new Error(te('export_route_absente'));
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        const blob = await reponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `constatations-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
        console.error('Export xlsx :', e);
        _execToast((e && e.message) || 'Erreur lors de l\'export', 'error');
    }
}

// Document imprimable : mise en page A4, un dossier par bloc, coupures
// maîtrisées. L'impression du navigateur produit le PDF.
function execExporterConstatationsPdf() {
    const liste = _execConstatationsExportees();
    if (!liste.length) { _execToast(te('no_data'), 'warning'); return; }
    const aac = EXEC_STATE.data.aac || {};
    const entete = `${_esc(aac.sigle || '')}${aac.nom ? ` — ${_esc(aac.nom)}` : ''}`;
    const lieu = [aac.ville, aac.pays].filter(Boolean).map(_esc).join(', ');
    const aujourdhui = new Date().toLocaleDateString('fr-FR');

    const dossiers = liste.map((c, i) => {
        let ev = c.commentaire_evaluation;
        if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
        ev = ev || {};
        const anac = ev.evaluation_anac || {};
        const verif = anac.verification || {};
        const pac = (c.actions_correctives || [])[0] || {};
        const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === c.domaine_id || d.code === c.domaine_id);
        const commentaires = [
            ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
                date: x.date, auteur: x.auteur, items: [cle === 'cause_primaire' ? 'cause' : cle], texte: x.texte,
            }))),
            ...(ev.suivi_commentaires || []).filter((x) => x.publie),
        ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const preuves = [...(pac.curative_preuves || []), ...(pac.corrective_preuves || [])];

        const champ = (l, v) => `<div><span>${l}</span><strong>${v || '—'}</strong></div>`;
        const bloc = (t, corps) => `<section><h3>${t}</h3>${corps || '<p class="vide">—</p>'}</section>`;

        return `<article class="fnc"${i ? ' style="page-break-before:always;"' : ''}>
            <h2>${_esc(c.reference || '')} <small>${_esc(c.prestataire_nom || '')}</small></h2>
            <div class="grille">
                ${champ(te('domaine'), _esc(dom ? dom.nom : (c.domaine_id || '')))}
                ${champ(te('criticite'), _esc(c.criticite || c.gravite || ''))}
                ${champ(te('date_ouverture'), c.date_ouverture ? _formatDate(c.date_ouverture) : '')}
                ${champ(te('delai_label'), `${_esc(c.delai_solde || '')} ${te('jours')}`)}
                ${champ(te('ref_reglementaires_label'), _esc(c.ref_reglementaires || c.exigence_ref || ''))}
                ${champ(te('verifier_terrain'), verif.verification_terrain ? te('oui_label') : te('non_label'))}
            </div>
            ${bloc(te('description_constatation'), `<p>${_esc(c.description || c.titre || '')}</p>`)}
            ${bloc(te('cause_root'), `<p>${_esc(pac.cause_primaire || '')}</p>`)}
            ${bloc(`${te('action_curative_correction')}${pac.curative_date_prevue ? ` — ${te('date_prevue')} : ${_formatDate(pac.curative_date_prevue)}` : ''}`,
                `<p>${_esc(pac.action_curative || '')}</p>`)}
            ${bloc(`${te('action_corrective_prevention')}${pac.corrective_date_prevue ? ` — ${te('date_prevue')} : ${_formatDate(pac.corrective_date_prevue)}` : ''}`,
                `<p>${_esc(pac.actions_correctives || '')}</p>`)}
            ${bloc(te('preuves_action'), preuves.length
                ? `<ol>${preuves.map((p) => `<li>${_esc(p.intitule || p.filename || '')}${p.date ? ` <em>(${_formatDate(String(p.date).slice(0, 10))})</em>` : ''}${p.commentaire ? ` — ${_esc(p.commentaire)}` : ''}</li>`).join('')}</ol>` : '')}
            ${bloc(te('details_suivi'), commentaires.length
                ? `<table><tbody>${commentaires.map((x) => `<tr>
                        <td class="date">${x.date ? _formatDate(String(x.date).slice(0, 10)) : ''}</td>
                        <td class="auteur">${_esc(x.auteur || '')}</td>
                        <td>${(x.items || []).map((k) => `<em>${_esc(k === 'autres' ? (x.precision || te('motif_autres')) : te(`item_${k}`))}</em>`).join(', ')} — ${_esc(x.texte || '')}</td>
                    </tr>`).join('')}</tbody></table>` : '')}
            ${bloc(te('commentaire_general_suivi'), (verif.suivis || []).length
                ? `<table><tbody>${(verif.suivis || []).map((s) => `<tr>
                        <td class="date">${s.date ? _formatDate(String(s.date).slice(0, 10)) : ''}</td>
                        <td class="auteur">${_esc(s.auteur || '')}</td>
                        <td>${_esc(s.texte || '')}</td>
                    </tr>`).join('')}</tbody></table>` : '')}
            <div class="visa">
                <div><span>${te('visa_inspecteur') || 'Visa de l’inspecteur'}</span></div>
                <div><span>${te('visa_prestataire') || 'Visa du prestataire'}</span></div>
            </div>
        </article>`;
    }).join('');

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${te('consta_sub_terrain')} — ${aujourdhui}</title>
    <style>
      @page { size: A4; margin: 14mm 12mm 16mm; }
      /* Sans cela, les navigateurs suppriment les aplats de couleur à
         l'impression : bandeaux de section, pastilles, filets colorés. */
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font: 11px/1.45 "Helvetica Neue", Arial, sans-serif; color: #16202c; margin: 0; }
      header.doc { display: flex; align-items: center; gap: 10px;
                   border-bottom: 2px solid #12406b; padding-bottom: 6px; margin-bottom: 12px; }
      header.doc .logo { height: 46px; width: auto; flex: 0 0 auto; }
      header.doc .titre { flex: 1; }
      header.doc .lieu { font-size: 9.5px; color: #5b6b7d; }
      header.doc .sigle { font-size: 12px; font-weight: 700; color: #12406b; letter-spacing: .02em; }
      header.doc h1 { font-size: 17px; margin: 4px 0 2px; }
      header.doc .meta { font-size: 10px; color: #5b6b7d; }
      article.fnc { border: 1px solid #dde4ec; border-radius: 4px; padding: 8px 10px 10px; margin-bottom: 10px; }
      article.fnc h2 { font-size: 13px; margin: 0 0 6px; color: #12406b; border-bottom: 1px solid #dde4ec; padding-bottom: 4px; }
      article.fnc h2 small { float: right; font-weight: 500; color: #5b6b7d; font-size: 11px; }
      .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 12px; margin-bottom: 8px; }
      .grille span { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d; }
      .grille strong { font-size: 11px; font-weight: 600; }
      section { margin-top: 7px; break-inside: avoid; }
      section h3 { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #5b6b7d;
                   margin: 0 0 3px; border-bottom: 1px dotted #dde4ec; padding-bottom: 2px; }
      section p { margin: 0; }
      section ol { margin: 0; padding-left: 16px; }
      section table { width: 100%; border-collapse: collapse; }
      section td { border-bottom: 1px solid #eef2f6; padding: 2px 4px 2px 0; vertical-align: top; }
      td.date { width: 62px; color: #5b6b7d; white-space: nowrap; }
      td.auteur { width: 110px; font-weight: 600; }
      .vide { color: #98a5b3; }
      .visa { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; break-inside: avoid; }
      .visa div { border-top: 1px solid #98a5b3; padding-top: 3px; height: 42px; }
      .visa span { font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d; }
      footer.doc { position: fixed; bottom: 4mm; left: 0; right: 0; font-size: 8.5px; color: #5b6b7d;
                   border-top: 1px solid #dde4ec; padding-top: 3px; }
      @media print { article.fnc { border-color: #c9d3de; } }
    </style></head><body>
    <header class="doc">
        ${aac.logo ? `<img class="logo" src="${aac.logo}" alt="">` : ''}
        <div class="titre">
            <div class="sigle">${entete}</div>
            ${lieu ? `<div class="lieu">${lieu}</div>` : ''}
            <h1>${te('consta_sub_terrain')}</h1>
            <div class="meta">${_esc(_execFiltresLisibles())} &nbsp;·&nbsp; ${liste.length} ${te('a_verifier_terrain')} &nbsp;·&nbsp; ${te('edite_le')} ${aujourdhui}</div>
        </div>
    </header>
    ${dossiers}
    <footer class="doc">OASIS — ${entete} · ${te('consta_sub_terrain')} · ${aujourdhui}</footer>
    </body></html>`;

    const fenetre = window.open('', '_blank');
    if (!fenetre) { _execToast(te('bloqueur_fenetre') || 'Autorisez les fenêtres surgissantes pour l\'export', 'warning'); return; }
    fenetre.document.write(html);
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 350);
}

// ══════════════════════════════════════
//  Sous-menu « Suivi Terrain »
// ══════════════════════════════════════
// Table des constatations à vérifier sur place, chacune dépliable sur le
// rappel de la constatation, le plan d'actions et les commentaires.
function _execRenderConstaTerrain(subNav) {
    const filtered = _execApplyConstaFilters(_execConstaTerrain(EXEC_STATE.data.constatations || []));
    const isPrest = _execIsPrestataire();
    const filterOpts = isPrest
        ? { showDomaine: false, showSecteur: false, showPrestataire: false, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true }
        : { showDomaine: true, showSecteur: false, showPrestataire: true, showStatut: false, showAnnee: true, showTrimestre: true, showCriticite: true, showSearch: true };
    EXEC_STATE.constaExport = filtered.map((c) => c.id);
    return `<div class="page-content">
        <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <h2 style="margin:0;">${te('consta_sub_terrain')}</h2>
            ${_execBoutonsExport()}
        </div>
        ${subNav}
        ${_execRenderFilterBar('execRenderPage()', filterOpts)}
        <div class="card">
          <div class="exec-etats-corps" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
            <table class="exec-data-table exec-compact-table exec-etats-table"
                style="font-size:0.8rem;table-layout:fixed;min-width:900px;">
              <thead><tr>
                <th style="width:180px;">${te('ref_consta')}</th><th style="width:180px;">${te('provider')}</th>
                <th style="width:190px;">${te('domaine')}</th><th style="width:110px;">${te('criticite')}</th>
                <th style="width:110px;">${te('date_due')}</th>
                <th style="width:120px;text-align:center;">${te('actions')}</th>
              </tr></thead>
              <tbody>${_execTerrainLignes(filtered)}</tbody>
            </table>
          </div>
        </div>
    </div>`;
}

function _execTerrainLignes(liste) {
    if (!liste.length) {
        return `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">${te('no_data')}</td></tr>`;
    }
    return liste.map((c, i) => {
        const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === c.domaine_id || d.code === c.domaine_id);
        let due = c.date_due_cloture;
        if (!due || due.length < 8) {
            const delai = parseInt(c.delai_solde || c.delai_correction || '0', 10);
            const ouv = c.date_ouverture || c.date_creation;
            if (delai > 0 && ouv) { const d = new Date(ouv); d.setDate(d.getDate() + delai); due = d.toISOString().slice(0, 10); }
            else due = '';
        }
        return `<tr class="exec-terrain-ligne" onclick="execTerrainBasculer(${i})">
            <td><span class="exec-terrain-chevron" id="terrain_chev_${i}">${EXEC_ICONS.chevronDown}</span><strong>${_esc(c.reference || '')}</strong></td>
            <td>${_esc(c.prestataire_nom || '')}</td>
            <td>${_esc(dom ? dom.nom : (c.domaine_id || ''))}</td>
            <td>${_execGraviteBadge(c.criticite || c.gravite)}</td>
            <td>${due ? _formatDate(due) : '-'}</td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-outline" title="${te('suivi_pac')}"
                        onclick="event.stopPropagation();execOpenPACSlider('${c.id}')">${EXEC_ICONS.eye || EXEC_ICONS.file}</button>
            </td>
        </tr>
        <tr class="exec-terrain-detail" id="terrain_detail_${i}" hidden>
            <td colspan="6">${_execTerrainDetailHtml(c)}</td>
        </tr>`;
    }).join('');
}

window.execTerrainBasculer = function (i) {
    const ligne = document.getElementById(`terrain_detail_${i}`);
    const chev = document.getElementById(`terrain_chev_${i}`);
    if (!ligne) return;
    ligne.hidden = !ligne.hidden;
    if (chev) chev.classList.toggle('ouvert', !ligne.hidden);
};

// Volet déroulant : rappel de la constatation, plan d'actions, commentaires.
function _execTerrainDetailHtml(c) {
    let ev = c.commentaire_evaluation;
    if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
    ev = ev || {};
    const anac = ev.evaluation_anac || {};
    const pac = (c.actions_correctives || [])[0] || {};
    const suivis = (anac.verification || {}).suivis || [];
    const commentaires = [
        ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
            date: x.date || '', auteur: x.auteur || '', items: [cle === 'cause_primaire' ? 'cause' : cle],
            precision: '', texte: x.texte || '', publie: true,
        }))),
        ...(ev.suivi_commentaires || []).filter((x) => x.publie),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const vide = `<em class="exec-terrain-vide">—</em>`;
    // Un bloc : titre, éventuelle date d'échéance en pastille, contenu.
    const bloc = (titre, contenu, date) => `<div class="exec-terrain-bloc">
        <div class="exec-terrain-bloc-titre">
            <span>${titre}</span>
            ${date ? `<span class="exec-terrain-echeance" title="${te('date_prevue')}">${_formatDate(date)}</span>` : ''}
        </div>
        <div class="exec-terrain-bloc-corps">${contenu || vide}</div>
    </div>`;
    const champ = (libelle, valeur) => `<div class="exec-terrain-champ">
        <span>${libelle}</span><strong>${valeur}</strong>
    </div>`;

    return `<div class="exec-terrain-detail-corps">
        <!-- Rappel de la constatation, pleine largeur -->
        <div class="exec-terrain-bloc exec-terrain-rappel-bloc">
            <div class="exec-terrain-bloc-titre"><span>${te('rappel_constatation')}</span></div>
            <div class="exec-terrain-champs">
                ${champ(te('date_ouverture'), c.date_ouverture ? _formatDate(c.date_ouverture) : '—')}
                ${champ(te('delai_label'), `${_esc(c.delai_solde || '—')} ${te('jours')}`)}
                ${champ(te('date_due_label'), (() => {
                    const delai = parseInt(c.delai_solde || '0', 10);
                    const ouv = c.date_ouverture || (c.date_creation || '').slice(0, 10);
                    if (c.date_due_cloture) return _formatDate(c.date_due_cloture.slice(0, 10));
                    if (!delai || !ouv) return '—';
                    const d = new Date(ouv); d.setDate(d.getDate() + delai);
                    return _formatDate(d.toISOString().slice(0, 10));
                })())}
                ${champ(te('ref_reglementaires_label'), _esc(c.ref_reglementaires || c.exigence_ref || '—'))}
            </div>
            <p class="exec-terrain-description">${_esc(c.description || c.titre || '')}</p>
        </div>

        <!-- Le plan d'actions : cause, action curative, action corrective -->
        <div class="exec-terrain-grille-3">
            ${bloc(te('cause_root'), _esc(pac.cause_primaire || ''))}
            ${bloc(te('action_curative_correction'), _esc(pac.action_curative || ''), pac.curative_date_prevue)}
            ${bloc(te('action_corrective_prevention'), _esc(pac.actions_correctives || ''), pac.corrective_date_prevue)}
        </div>

        <!-- Les deux fils de commentaires -->
        <div class="exec-terrain-grille-2">
            ${bloc(`${te('details_suivi')}${commentaires.length ? ` <b>${commentaires.length}</b>` : ''}`,
                commentaires.length
                    ? `<div class="exec-terrain-fil">${commentaires.map((x) => _execCommentaireSuiviHtml(x, false)).join('')}</div>`
                    : '')}
            ${bloc(`${te('commentaire_general_suivi')}${suivis.length ? ` <b>${suivis.length}</b>` : ''}`,
                suivis.length
                    ? `<div class="exec-terrain-fil">${suivis.map((s) => _execSuiviHtml(s, false)).join('')}</div>`
                    : '')}
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
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
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

// ══════════════════════════════════════
//  Constatation hors activités de supervision : fil d'avancement
// ══════════════════════════════════════
// Trois étapes : Préparation (de la création à la soumission), Validation
// (de la soumission au prononcé) et Transmission (remise au prestataire).
// Un rejet ou un renvoi ramène en préparation.
const EXEC_CD_ETAPES = [
    { id: 'preparation', cle: 'cd_etape_preparation' },
    { id: 'validation', cle: 'cd_etape_validation' },
    { id: 'transmission', cle: 'cd_etape_transmission' },
];

// La constatation est remise au prestataire : elle entre alors dans le suivi
// du PAC, sous les statuts communs aux constatations d'activité.
const EXEC_CD_TRANSMISES = ['ouvert', 'ouverte', 'pac_soumis', 'pac_valide',
    'pac_rejetee', 'soldee'];
function _execCdTransmise(statut) {
    return EXEC_CD_TRANSMISES.includes(String(statut || ''));
}

function execCdEtat(statut) {
    const st = String(statut || 'direct_brouillon');
    // Un renvoi ramène en préparation, pour correction. Un rejet arrête le
    // circuit : la constatation ne repart pas, elle se lit.
    const renvoye = st === 'direct_renvoye';
    const rejete = st === 'direct_rejete';
    const soumis = !renvoye && ['direct_soumis', 'direct_rejete', 'direct_valide',
        'ouvert', 'ouverte', 'pac_soumis', 'pac_valide', 'pac_rejetee', 'soldee'].includes(st);
    const valide = ['direct_valide', 'ouvert', 'ouverte', 'pac_soumis', 'pac_valide',
        'pac_rejetee', 'soldee'].includes(st);
    const faites = { preparation: soumis, validation: valide, transmission: _execCdTransmise(st) };
    return {
        faites,
        renvoye,
        rejete,
        courante: rejete ? 'validation'
            : (EXEC_CD_ETAPES.map((e) => e.id).find((id) => !faites[id]) || null),
    };
}

// Étape consultée dans le formulaire hors activités : le fil sert à la
// parcourir, jamais à agir — comme le fil du processus Activité.
let EXEC_CD = { id: '', etape: '' };

// Une étape n'est consultable qu'une fois atteinte.
function execCdOuvertes(statut) {
    const etat = execCdEtat(statut);
    return {
        preparation: true,
        validation: etat.faites.preparation,
        transmission: etat.faites.validation,
    };
}

// Étape à consulter par défaut : celle où en est la constatation.
function execCdEtapeDefaut(statut) {
    return execCdEtat(statut).courante || 'transmission';
}

window.execCdConsulter = function (etape) {
    if (!EXEC_CD.id) return;
    execOpenConstatationDirecteSlider(EXEC_CD.id, etape);
};

// Le fil se parcourt d'une traite : ni glissement du volet, ni fondu du corps
// entre deux étapes.
// Décisions prises à la Validation : chaque renvoi, chaque rejet, daté,
// signé et motivé. L'historique sert à réviser une constatation corrigée —
// on relit ce qui avait été demandé avant de se prononcer de nouveau.
function _execCdDecisions(c) {
    const journal = Array.isArray(c.decisions_validation) ? c.decisions_validation : [];
    if (journal.length) return journal;
    // Constatations antérieures au journal : le dernier motif en tient lieu.
    if (c.motif_renvoi) {
        return [{ type: 'renvoi', motif: c.motif_renvoi, date: c.date_renvoi || '', auteur: '' }];
    }
    if (c.motif_rejet_pac) {
        return [{ type: 'rejet', motif: c.motif_rejet_pac, date: c.date_rejet_pac || '', auteur: '' }];
    }
    return [];
}

// Consigne une décision sans écraser les précédentes.
function _execCdJournaliser(c, type, motif) {
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim()
        || user.email || user.username || '';
    return [..._execCdDecisions(c), {
        type, motif, auteur, date: new Date().toISOString(),
    }];
}

function _execCdHistoriqueHtml(c) {
    const journal = _execCdDecisions(c);
    if (!journal.length) return '';
    const lignes = journal.slice().reverse().map((d, i) => `
        <div class="exec-cd-decision${d.type === 'rejet' ? ' rejet' : ''}">
            <div class="exec-cd-decision-tete">
                <span class="exec-cd-decision-type">${d.type === 'rejet' ? te('motif_rejet_titre') : te('motif_renvoi_titre')}</span>
                <span class="exec-cd-decision-rang">${journal.length - i}/${journal.length}</span>
                <span>${_esc(d.auteur || '')}</span>
                <span>${d.date ? _formatDate(String(d.date).slice(0, 10)) : ''}</span>
            </div>
            <div class="exec-cd-decision-motif">${_esc(d.motif || '')}</div>
        </div>`).join('');
    // Ce bandeau n'est pas une section du formulaire : il n'en porte ni la
    // lettre ni la hauteur. Rouge, à mi-hauteur, il signale un incident de
    // parcours plutôt qu'une rubrique à remplir.
    return `
    <div class="exec-form-section expanded exec-cd-journal">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-title">${te('historique_decisions')}</span>
            <span class="exec-form-section-aide">${_esc(te('aide_historique_decisions'))}</span>
            <span class="exec-form-section-badge">${journal.length}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">${lignes}</div>
    </div>`;
}

// Motif d'un renvoi ou d'un rejet : c'est la première chose à lire en
// rouvrant le circuit, il coiffe donc l'écran, quelle que soit l'étape.
function _execCdMotifHtml(c) {
    const st = String(c.statut || '');
    if (st === 'direct_renvoye' && c.motif_renvoi) {
        return `<div class="exec-cd-rejet exec-cd-renvoi">
            <strong>${te('motif_renvoi_titre')}${c.date_renvoi ? ` — ${_formatDate(String(c.date_renvoi).slice(0, 10))}` : ''}</strong>
            <div>${_esc(c.motif_renvoi)}</div></div>`;
    }
    if (st === 'direct_rejete' && c.motif_rejet_pac) {
        return `<div class="exec-cd-rejet">
            <strong>${te('motif_rejet_titre')}${c.date_rejet_pac ? ` — ${_formatDate(String(c.date_rejet_pac).slice(0, 10))}` : ''}</strong>
            <div>${_esc(c.motif_rejet_pac)}</div>
            <p class="exec-cd-arret">${te('constatation_rejetee_arret')}</p></div>`;
    }
    return '';
}

function _execCdCourante(fncId) {
    return (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId) || {};
}

function _execCdInstantane() {
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
}

function execCdFilHtml(statut, actionsHtml, consultee) {
    const etat = execCdEtat(statut);
    const ouvertes = execCdOuvertes(statut);
    const selectionnee = consultee || execCdEtapeDefaut(statut);
    const etapes = EXEC_CD_ETAPES.map((e) => {
        const courante = !etat.faites[e.id] && etat.courante === e.id;
        const cls = ['eval-step', 'exec-pac-step',
            etat.faites[e.id] ? 'done' : '',
            courante && ((etat.renvoye && e.id === 'preparation')
                || (etat.rejete && e.id === 'validation')) ? 'rejected' : '',
            courante && !((etat.renvoye && e.id === 'preparation')
                || (etat.rejete && e.id === 'validation')) ? 'current' : '',
            selectionnee === e.id ? 'selected' : '',
            !ouvertes[e.id] ? 'verrouillee' : '',
        ].filter(Boolean).join(' ');
        const label = te(e.cle);
        const action = ouvertes[e.id] && EXEC_CD.id ? ` onclick="execCdConsulter('${e.id}')"` : '';
        return `<button class="${cls}" type="button"${ouvertes[e.id] ? '' : ' disabled'}${action}`
            + ` title="${_escAttr(label)}">${_esc(label)}</button>`;
    }).join('');
    return `<div class="exec-proc-barre exec-pac-barre">
        <div class="eval-steps exec-proc-fil">${etapes}</div>
        ${actionsHtml ? `<div class="exec-proc-actions-etape">${actionsHtml}</div>` : ''}
    </div>`;
}

// Bandeau : sortie du formulaire à gauche, avant son intitulé. La croix est
// retirée par `_execCdInstallerBandeau`.
function _execCdTitre(reference) {
    return `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execRetourVolet()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.constatations} ${te('constatation_hors_activites')}${reference ? ` — ${_esc(reference)}` : ''}`;
}

function _execCdRetirerCroix() {
    document.querySelector('#execSlider .exec-slider-close')?.remove();
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
        `<option value="${_escAttr(e.reference)}" title="${_escAttr(e.libelle)}">${_esc(e.reference)} — ${_esc(e.libelle)}</option>`
    ).join('');

    const G = 'gap:0.6rem;'; // compact gap
    const MB = 'margin-bottom:0.5rem;'; // compact margin

    // Soumettre siège sur la ligne du fil, à l'extrême droite.
    const filActions = `<button class="btn btn-primary btn-sm" onclick="execSaveConstatationDirecte('${c.id || ''}', true)">${EXEC_ICONS.send} ${te('soumettre')}</button>`;

    // Le fil du formulaire navigue lui aussi, dès lors que la constatation
    // existe : sans identifiant, il n'y a rien à consulter ailleurs.
    EXEC_CD = { id: c.id || '', etape: 'preparation' };

    const body = `
    <div class="exec-proc-entete-collant">${execCdFilHtml(c.statut, filActions, 'preparation')}</div>
    <div class="exec-real">
        ${_execCdMotifHtml(c)}

        ${_execFormSection('A', 'fnc_section_identification', `
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
                <input type="text" class="form-input" id="cd_emis_par" value="${_escAttr(defaultEmisPar)}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('adresse_a') || 'Adressé à'}</label>
                <input type="text" class="form-input" id="cd_adresse_a" value="${_escAttr(c.adresse_a || '')}">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_ouverture') || "Date d'ouverture"}</label>
                <input type="date" class="form-input" id="cd_date_ouverture" value="${_escAttr(defaultDateOuverture)}" onchange="execCdCalcDateDue()">
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
        `, true, '', te('cd_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
<!-- Row 3 : Réf. Réglementaires (tag-input multi) -->
        <div class="form-group" style="${MB}">
            <label>${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
            <div id="cd_ref_tags" style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);min-height:2.2rem;cursor:text;" onclick="document.getElementById('cd_ref_input').focus()">
                ${(c.ref_reglementaires || c.exigence_ref || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span class="cd-ref-tag" data-ref="${_escAttr(r)}" title="${_escAttr(exig?.libelle || '')}" style="display:inline-flex;align-items:center;gap:0.25rem;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;white-space:nowrap;">${_esc(r)}<button type="button" onclick="this.parentElement.remove()" style="border:none;background:none;cursor:pointer;color:inherit;padding:0 0 0 0.2rem;font-size:1rem;line-height:1;">&times;</button></span>`;
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
            <input type="text" class="form-input" id="cd_titre" value="${_escAttr(c.titre || '')}">
        </div>

        <!-- Description -->
        <div class="form-group" style="${MB}">
            <label>Description *</label>
            <textarea class="form-input" id="cd_description" rows="3">${_esc(c.description || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_constat'))}

        ${_execFormSection('C', 'fnc_section_traitement', `
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
                <input type="number" class="form-input" id="cd_delai" min="1" value="${_escAttr(c.delai_solde || c.delai_correction || _execCriticiteDelai(c.criticite || c.gravite) || '30')}" oninput="execCdCalcDateDue()" onchange="execCdCalcDateDue()">
            </div>
            <div class="form-group" style="${MB}">
                <label>${te('date_due') || 'Date Due'}</label>
                <input type="date" class="form-input" id="cd_date_due" value="${_escAttr(c.date_due_cloture || c.date_due || '')}" readonly style="background:var(--bg);">
            </div>
        </div>

        <!-- Recommandation -->
        <div class="form-group" style="${MB}">
            <label>${te('recommandation') || 'Recommandation'}</label>
            <textarea class="form-input" id="cd_reco" rows="2">${_esc(c.recommandation || '')}</textarea>
        </div>
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
<!-- Preuves -->
        <div class="form-group">
            <label>${te('preuves') || 'Preuves'}</label>
            <div id="cd_preuves_list">
                ${(c.preuves_constatation || []).map(p => `
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;" data-path="${_escAttr(p.path || '')}">
                    ${EXEC_ICONS.file} <span style="flex:1;">${_esc(p.filename || p)}</span>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>
                </div>`).join('')}
            </div>
            <div style="margin-top:0.5rem;padding:1.25rem;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.85rem;" onclick="document.getElementById('cd_proof_input').click()">
                ${EXEC_ICONS.upload || '↑'} ${te('upload_zone') || 'Glisser ou cliquer pour téléverser'}
                <input type="file" id="cd_proof_input" style="display:none;" multiple onchange="execCdUploadProof(this.files)">
            </div>
        </div>
        `, true, '', te('fnc_aide_preuves'))}
    </div>`;

    // Barre inférieure : sortie, impression de la fiche, brouillon.
    const footer = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>
        ${c.id ? `<button class="btn btn-outline" onclick="execFicheConstatPdf('${c.id}')">${EXEC_ICONS.pdf || EXEC_ICONS.file} ${te('imprimer_constatation')}</button>` : ''}
        <button class="btn btn-outline" onclick="execSaveConstatationDirecte('${c.id || ''}', false)">${te('sauver_brouillon')}</button>
    `;
    execShowSlider(_execCdTitre(c.reference), body, footer, 'max');
    _execCdInstantane();
    _execCdRetirerCroix();
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
            // La constatation part à la validation sans désigner de validateur :
            // qui en a le droit la trouve dans sa liste.
            await execSubmitConstatationDirecteForValidation(savedId);
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

// Soumission à la validation. Aucun validateur n'est désigné : la
// constatation entre dans la file de ceux qui ont qualité pour la prononcer.
async function execSubmitConstatationDirecteForValidation(fncId) {
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-soumettre`, { method: 'PUT' });
        await execRefreshDynamic();
        execCloseSlider();
        _execToast(te('submitted_for_validation') || 'Soumis pour validation', 'success');
        execRenderPage();
    } catch (e) {
        console.error('Submit constatation directe error:', e);
        _execToast('Erreur: ' + ((e && e.message) || ''), 'error');
    }
}

async function execOpenConstatationDirecteSlider(fncId, etapeVoulue) {
    let fnc;
    try { fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`); }
    catch (e) { console.error(e); return; }
    if (!fnc) return;
    execPrendreRetour('cd:' + fncId);
    EXEC_STATE.voletRejouer = () => execOpenConstatationDirecteSlider(fncId, etapeVoulue);
    const me = (EXEC_STATE.user || {}).id || '';
    const isCreator = fnc.created_by === me;
    // Aucun validateur n'est désigné à la soumission : la qualité pour
    // valider suffit.
    const isValidateur = _execCanValidate() || _execIsAdmin();
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

    const transmise = _execCdTransmise(st);
    EXEC_CD = { id: fnc.id, etape: '' };
    // L'étape demandée doit être atteinte ; sinon on retombe sur l'étape en cours.
    const ouvertes = execCdOuvertes(st);
    const etape = ouvertes[etapeVoulue] ? etapeVoulue : execCdEtapeDefaut(st);
    EXEC_CD.etape = etape;

    // Renvoyer, Rejeter puis Valider : les décisions de l'étape se prennent sur
    // la ligne du fil, dans l'ordre où elles s'envisagent.
    const filActions = (etape === 'validation' && isValidateur && st === 'direct_soumis')
        ? `<button class="btn btn-sm btn-outline exec-cd-renvoyer" onclick="execRenvoyerConstatationModal('${fnc.id}')">${EXEC_ICONS.back || ''} Renvoyer</button>`
        + `<button class="btn btn-sm btn-outline exec-cd-rejeter" onclick="execRejeterConstatationModal('${fnc.id}')">${EXEC_ICONS.x} Rejeter</button>`
        + `<button class="btn btn-primary btn-sm" onclick="execValidateConstatationDirecte('${fnc.id}')">${EXEC_ICONS.check} ${te('valider') || 'Valider'}</button>`
        : '';

    // La Transmission ne rejoue pas le formulaire validé : elle ne porte que
    // le courriel de remise.
    const fiche = etape !== 'transmission';

    const body = `
    <div class="exec-proc-entete-collant">${execCdFilHtml(st, filActions, etape)}</div>
    <div class="exec-real">
        ${_execCdMotifHtml(fnc)}
        ${etape === 'validation' ? _execCdHistoriqueHtml(fnc) : ''}

        ${!fiche ? '' : `
        ${_execFormSection('A', 'fnc_section_identification', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('reference') || 'Référence', fnc.reference)}
            ${roField(te('provider') || 'Prestataire', prestataire ? prestataire.nom : fnc.prestataire_id)}
            ${roField(te('emis_par') || 'Émis par', fnc.emis_par)}
            ${roField(te('adresse_a') || 'Adressé à', fnc.adresse_a)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('date_ouverture') || "Date d'ouverture", fnc.date_ouverture ? fnc.date_ouverture.slice(0,10) : '')}
            ${roField(te('source') || 'Source', sourceLabels[fnc.source] || fnc.source)}
            ${roField(te('domaine') || 'Domaine', dom ? (dom.code + ' — ' + dom.nom) : fnc.domaine_id)}
            ${roField('Secteur', secteur ? (secteur.code || secteur.nom) : fnc.secteur_id)}
        </div>
        `, true, '', te('cd_aide_identification'))}

        ${_execFormSection('B', 'fnc_section_constat', `
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('ref_reglementaires') || 'Réf. Réglementaires'}</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0.3rem 0.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg);min-height:2rem;">
                ${refList.length ? refList.map(r => {
                    const exig = allExig.find(e => e.reference === r);
                    return `<span title="${_escAttr(exig?.libelle || '')}" style="display:inline-flex;align-items:center;background:var(--exec-accent-bg,#e0e7ff);color:var(--exec-accent,#3b82f6);padding:0.15rem 0.45rem;border-radius:4px;font-size:0.78rem;font-weight:500;">${_esc(r)}</span>`;
                }).join('') : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        ${roField('Titre', fnc.titre)}
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">Description</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:3rem;white-space:pre-wrap;">${fnc.description ? _esc(fnc.description) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        `, true, '', te('fnc_aide_constat'))}

        ${_execFormSection('C', 'fnc_section_traitement', `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;${G}${MB}">
            ${roField(te('criticite') || 'Criticité', fnc.criticite)}
            ${roField(te('cas') || 'Cas', fnc.cas_type || fnc.cas)}
            ${roField('Délai', fnc.delai_solde ? fnc.delai_solde + ' jours' : '')}
            ${roField(te('date_due') || 'Date Due', fnc.date_due_cloture ? fnc.date_due_cloture.slice(0,10) : '')}
        </div>
        <div class="form-group" style="${MB}">
            <label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);margin-bottom:0.25rem;display:block;">${te('recommandation') || 'Recommandation'}</label>
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.85rem;min-height:2.5rem;white-space:pre-wrap;">${fnc.recommandation ? _esc(fnc.recommandation) : '<span style="color:var(--text-muted);font-style:italic;">—</span>'}</div>
        </div>
        `, true, '', te('fnc_aide_traitement'))}

        ${_execFormSection('D', 'fnc_section_preuves', `
        <div class="form-group">
            <div style="padding:0.4rem 0.6rem;background:var(--bg);border:1px solid var(--border);border-radius:6px;">
                ${(fnc.preuves_constatation || []).length
                    ? fnc.preuves_constatation.map(p => `<div style="display:flex;align-items:center;gap:0.4rem;padding:0.2rem 0;">${EXEC_ICONS.file || ''} ${_execPieceLien(p.path, p.filename || p)}</div>`).join('')
                    : '<span style="color:var(--text-muted);font-style:italic;font-size:0.85rem;">—</span>'}
            </div>
        </div>
        `, true, String((fnc.preuves_constatation || []).length || ''), te('fnc_aide_preuves'))}
        `}

        ${etape === 'transmission' ? _execCourrielConstatation(fnc, prestataire) : ''}
    </div>`;

    // Barre inférieure : sortie, impression, puis les actions de l'étape.
    let footer = `<button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>`;
    footer += `<button class="btn btn-outline" onclick="execFicheConstatPdf('${fnc.id}')">${EXEC_ICONS.pdf || EXEC_ICONS.file} ${te('imprimer_constatation')}</button>`;
    if (etape === 'preparation' && isCreator && ['direct_brouillon', 'direct_renvoye'].includes(st)) {
        footer += `<button class="btn btn-primary" onclick="execCloseSlider();execOpenConstatationDirecteForm(${JSON.stringify(fnc).replace(/"/g,'&quot;')})">${te('edit') || 'Modifier'}</button>`;
    }

    execShowSlider(_execCdTitre(fnc.reference), body, footer, 'max');
    _execCdInstantane();
    _execCdRetirerCroix();
}

// ── Transmission d'une constatation hors activités de supervision ──
// Même remise que pour un rapport d'activité : le courriel ne porte que des
// liens, la fiche de constat et les pièces restent dans OASIS.
function _execCourrielConstatation(fnc, prestataire) {
    const transmise = _execCdTransmise(fnc.statut);
    const nomPrest = (prestataire || {}).nom || fnc.prestataire_nom || '';
    const adresse = transmise ? (fnc.transmis_a || '')
        : ((prestataire || {}).email_point_focal || (prestataire || {}).email_prestataire || '');
    const objet = `${te('fiche_constat')} ${fnc.reference || ''} — ${nomPrest}`.trim();
    const message = [
        'Madame, Monsieur,',
        '',
        `La constatation ${fnc.reference || ''} est mise à votre disposition dans OASIS. `
            + 'Les liens de téléchargement figurent au bas de ce message.',
        '',
        'Elle appelle un plan d\'actions correctives, à soumettre dans le délai indiqué '
            + `(${_esc(fnc.delai_solde || '—')} jours à compter de la date d'ouverture).`,
        '',
        'Nous vous prions d\'agréer nos salutations distinguées.',
    ].join('\n');
    const ro = transmise ? ' readonly' : '';

    return `
    <div class="exec-courriel" id="exec_courriel_transmission">
        <div class="exec-courriel-entete">
            <span>${EXEC_ICONS.send}</span>
            <h4>${te('transmission_constatation')}</h4>
            ${transmise ? `<span class="exec-courriel-etat">Transmise le ${_formatDate(fnc.date_transmission || fnc.date_ouverture)}${
                fnc.transmis_a ? ` à ${_esc(fnc.transmis_a)}` : ''}</span>` : ''}
        </div>
        <div class="form-group">
            <label>Destinataire</label>
            <input type="text" class="form-input" id="courriel_destinataire" value="${_escAttr(adresse)}"
                   placeholder="adresse@prestataire.bj"${ro}>
        </div>
        <div class="exec-courriel-copies">
            <div class="form-group">
                <label>Copie (Cc)</label>
                <input type="text" class="form-input" id="courriel_copie" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
            <div class="form-group">
                <label>Copie cachée (Cci)</label>
                <input type="text" class="form-input" id="courriel_copie_cachee" placeholder="Adresses séparées par des virgules"${ro}>
            </div>
        </div>
        <div class="form-group">
            <label>Objet</label>
            <input type="text" class="form-input" id="courriel_objet" value="${_escAttr(objet)}"${ro}>
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea class="form-input" id="courriel_message" rows="8" style="resize:vertical;"${ro}>${_esc(message)}</textarea>
        </div>
        <div class="form-group">
            <label>Documents transmis</label>
            <p class="exec-courriel-note">Le message ne porte aucune pièce jointe : il annonce des liens
               de téléchargement, que le prestataire suit depuis son compte OASIS.</p>
            <div id="courriel_pieces">
                <div class="exec-piece exec-piece-rapport">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien((fnc.document || {}).path, `${fnc.reference || 'constatation'}.pdf`,
                        `execFicheConstatPdf('${fnc.id}')`)}
                    <span class="exec-piece-mention">${te('fiche_constat')} — jointe d'office</span>
                </div>
                ${(transmise ? (fnc.pieces_transmises || []) : []).map(f => `
                <div class="exec-piece">
                    <span class="exec-piece-icone">${EXEC_ICONS.file}</span>
                    ${_execPieceLien(f.path, f.intitule || f.filename || '')}
                    <span class="exec-piece-mention">${_esc(f.filename || '')}</span>
                </div>`).join('')}
            </div>
            ${transmise ? '' : `
            <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()" style="margin-top:0.5rem;">
                ${EXEC_ICONS.upload} Ajouter un fichier
            </button>
            <input type="file" style="display:none;" multiple onchange="execCourrielAjouterFichiers(this)">`}
        </div>
        <div class="exec-courriel-pied">
            ${transmise ? '' : `
            <button class="btn btn-primary btn-sm" id="courriel_envoyer"
                    onclick="execTransmettreConstatation('${fnc.id}')">
                ${EXEC_ICONS.send} Envoyer
            </button>`}
        </div>
    </div>`;
}

async function execTransmettreConstatation(fncId) {
    const val = (id) => (document.getElementById(id) || {}).value || '';
    const destinataire = val('courriel_destinataire').trim();
    if (!destinataire) { _execToast('Indiquez au moins un destinataire', 'error'); return; }
    const bouton = document.getElementById('courriel_envoyer');
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi…'; }
    try {
        const fnc = (EXEC_STATE.data.constatations || []).find(c => c.id === fncId) || {};
        // Le document remis est la fiche de constat, telle qu'elle s'imprime.
        const html = _execDocHtml(`${te('fiche_constat')} — ${fnc.reference || ''}`,
            _execFicheConstatCorps(fnc, {}));
        const remise = await api(`${EXEC_MODULE_API}/constatations/${fncId}/transmettre`, {
            method: 'POST',
            body: JSON.stringify({
                destinataire,
                copie: val('courriel_copie'),
                copie_cachee: val('courriel_copie_cachee'),
                objet: val('courriel_objet'),
                message: val('courriel_message'),
                piece: { nom: `${fnc.reference || 'constatation'}.pdf`, contenu: html },
                fichiers: _execCourrielFichiers(),
            }),
        });
        _execToast(remise && remise.envoye === false
            ? te('transmis_sans_courriel')
            : 'Constatation transmise au prestataire', remise && remise.envoye === false ? 'warning' : 'success');
        await execRefreshDynamic();
        execOpenConstatationDirecteSlider(fncId);
    } catch (e) {
        console.error('Transmission constatation :', e);
        _execToast((e && e.message) || 'Erreur lors de la transmission', 'error');
        if (bouton) { bouton.disabled = false; bouton.innerHTML = `${EXEC_ICONS.send} Envoyer`; }
    }
}

async function execValidateConstatationDirecte(fncId) {
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-valider`, { method: 'PUT' });
        await execRefreshDynamic();
        _execToast(te('validated') || 'Validé', 'success');
        execRenderPage();
        // La décision prise, le formulaire se rouvre sur l'étape suivante.
        execOpenConstatationDirecteSlider(fncId, 'transmission');
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
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-rejeter`, {
                method: 'PUT',
                body: JSON.stringify({
                    motif,
                    decisions_validation: _execCdJournaliser(_execCdCourante(fncId), 'rejet', motif),
                })
            });
            await execRefreshDynamic();
            _execToast('Constatation rejetée', 'success');
            execRenderPage();
            execOpenConstatationDirecteSlider(fncId, 'validation');
        } catch (e) { _execToast('Erreur: ' + (e?.message || ''), 'error'); }
    });
}

function execRenvoyerConstatationModal(fncId) {
    _execCommentModal('Renvoyer pour correction', '#f97316', async (motif) => {
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/direct-renvoyer`, {
                method: 'PUT',
                body: JSON.stringify({
                    motif,
                    decisions_validation: _execCdJournaliser(_execCdCourante(fncId), 'renvoi', motif),
                })
            });
            await execRefreshDynamic();
            _execToast('Constatation renvoyée pour correction', 'success');
            execOpenConstatationDirecteSlider(fncId, 'preparation');
            execRenderPage();
        } catch (e) { _execToast('Erreur: ' + (e?.message || ''), 'error'); }
    });
}


// ══════════════════════════════════════
//  PAC FOLLOW-UP SLIDER
// ══════════════════════════════════════

// ══════════════════════════════════════
//  Fil d'avancement du Suivi des PAC
// ══════════════════════════════════════
// Quatre étapes, chacune bornée par un jalon vérifiable :
//   Soumission     transmission de la constatation → soumission du PAC par le prestataire
//   Acceptation    soumission du PAC → acceptation du plan par l'AAC
//   Mise en oeuvre acceptation du plan → acceptation des preuves de mise en oeuvre
//   Clôture        l'AAC solde la constatation
// Un PAC renvoyé au prestataire ramène le fil à l'étape Soumission.
const EXEC_PAC_ETAPES = [
    { id: 'soumission', cle: 'pac_etape_soumission' },
    { id: 'acceptation', cle: 'pac_etape_acceptation' },
    { id: 'mise_oeuvre', cle: 'pac_etape_mise_oeuvre' },
    { id: 'cloture', cle: 'pac_etape_cloture' },
];

function execPacEtat(statut, evaluationANAC, submitInfo) {
    const acceptation = (evaluationANAC && evaluationANAC.acceptation) || {};
    const verification = (evaluationANAC && evaluationANAC.verification) || {};
    const cloture = (evaluationANAC && evaluationANAC.cloture) || {};

    const soldee = statut === 'soldee';
    const rejete = statut === 'pac_rejetee';
    // Le statut fait foi autant que la saisie : un PAC porté à « pac_valide »
    // est accepté, même si le bloc d'évaluation a été vidé par un
    // enregistrement antérieur. Sans cela le circuit se retrouvait bloqué,
    // sans action ni côté AAC ni côté prestataire.
    const valide = statut === 'pac_valide';
    // Le PAC a été soumis au moins une fois — un renvoi annule ce jalon, le
    // prestataire devant soumettre de nouveau.
    const soumis = !rejete && (statut === 'pac_soumis' || valide || soldee || !!submitInfo
        || acceptation.accepte === 'OUI');
    const accepte = acceptation.accepte === 'OUI' || valide || soldee;
    // Preuves de mise en oeuvre acceptées : prononcé explicite de l'AAC,
    // isolement et risques traités, ou mise en oeuvre déclarée effective.
    const preuvesAcceptees = verification.preuves_acceptees === 'OUI'
        || (verification.isolement_realise === 'OUI' && verification.risques_traites === 'OUI')
        || cloture.mise_en_oeuvre_effective === 'OUI';

    const faites = {
        soumission: soumis,
        acceptation: accepte,
        // Une constatation soldée a nécessairement franchi la mise en oeuvre.
        mise_oeuvre: (accepte && preuvesAcceptees) || soldee,
        cloture: soldee,
    };
    return {
        faites,
        soldee,
        rejete,
        courante: EXEC_PAC_ETAPES.map((e) => e.id).find((id) => !faites[id]) || null,
    };
}

function execPacFilHtml(statut, evaluationANAC, submitInfo, actionsHtml) {
    const etat = execPacEtat(statut, evaluationANAC, submitInfo);
    const etapes = EXEC_PAC_ETAPES.map((e) => {
        const cls = ['eval-step', 'exec-pac-step',
            etat.faites[e.id] ? 'done' : '',
            // Un PAC renvoyé signale le retour à l'étape Soumission en rouge.
            !etat.faites[e.id] && etat.courante === e.id && etat.rejete && e.id === 'soumission' ? 'rejected' : '',
            !etat.faites[e.id] && etat.courante === e.id && !(etat.rejete && e.id === 'soumission') ? 'current' : '',
        ].filter(Boolean).join(' ');
        const label = te(e.cle);
        return `<div class="${cls}" title="${_escAttr(label)}">${_esc(label)}</div>`;
    }).join('');
    return `<div class="exec-proc-barre exec-pac-barre">
        <div class="eval-steps exec-proc-fil">${etapes}</div>
        ${actionsHtml ? `<div class="exec-proc-actions-etape">${actionsHtml}</div>` : ''}
    </div>`;
}

// ══════════════════════════════════════
//  Amendement du PAC : champs suivis et motifs
// ══════════════════════════════════════
// Comparés à la dernière version acceptée du plan. Toute divergence lève un
// drapeau et réclame le motif de la modification avant toute soumission.
const EXEC_PAC_CHAMPS_SUIVIS = [
    { cle: 'cause_primaire', id: 'pac_cause_primaire', libelle: 'cause_root', ancre: 'pac_cause_primaire' },
    { cle: 'action_curative', id: 'pac_action_curative', libelle: 'action_curative_correction', ancre: 'pac_action_curative' },
    { cle: 'curative_date_prevue', id: 'pac_curative_date_prevue', libelle: 'date_prevue_curative', ancre: 'pac_action_curative' },
    { cle: 'actions_correctives', id: 'pac_actions_correctives', libelle: 'action_corrective_prevention', ancre: 'pac_actions_correctives' },
    { cle: 'corrective_date_prevue', id: 'pac_corrective_date_prevue', libelle: 'date_prevue_corrective', ancre: 'pac_actions_correctives' },
];

const EXEC_PAC_MOTIFS = [
    'motif_nouvelle_cause', 'motif_nouvelle_action', 'motif_refonte_action',
    'motif_modification_date', 'motif_observations_aac', 'motif_correction_mineure', 'motif_autres',
];

// Bloc posé sous le champ : drapeau, intitulé du champ, motif, précision.
function _execPacMotifHtml(champ, valeurInitiale, motif, editable, modifie) {
    const m = motif || {};
    const autre = m.motif === 'motif_autres';
    if (!editable) {
        // Lecture seule (AAC, versions figées) : le motif enregistré s'affiche
        // tel quel, précédé du drapeau.
        if (!m.motif) return '';
        const texte = m.motif === 'motif_autres' ? (m.precision || te('motif_autres')) : te(m.motif);
        return `<div class="exec-pac-motif visible" data-cle="${champ.cle}">
            <span class="exec-pac-drapeau" title="${te('champ_amende')}">${EXEC_ICONS.flag || '⚑'}</span>
            <span class="exec-pac-motif-champ">${te(champ.libelle)}</span>
            <span class="exec-pac-motif-valeur">${_esc(texte)}</span>
        </div>`;
    }
    return `<div class="exec-pac-motif${(modifie || m.motif) ? ' visible' : ''}" id="motif_bloc_${champ.cle}" data-cle="${champ.cle}"
                 data-initial="${_escAttr(valeurInitiale || '')}">
        <span class="exec-pac-drapeau" title="${te('champ_amende')}">${EXEC_ICONS.flag || '⚑'}</span>
        <span class="exec-pac-motif-champ">${te(champ.libelle)}</span>
        <select class="form-input exec-pac-motif-select" id="motif_sel_${champ.cle}"
                onchange="execPacMotifChange('${champ.cle}')">
            <option value="">${te('motif_choisir')}</option>
            ${EXEC_PAC_MOTIFS.map((k) => `<option value="${k}"${m.motif === k ? ' selected' : ''}>${te(k)}</option>`).join('')}
        </select>
        <input type="text" class="form-input exec-pac-motif-precision" id="motif_txt_${champ.cle}"
               placeholder="${te('motif_preciser')}" value="${_escAttr(m.precision || '')}"${autre ? '' : ' hidden'}>
    </div>`;
}

// Affiche ou masque le champ de précision selon le motif retenu.
window.execPacMotifChange = function (cle) {
    const sel = document.getElementById(`motif_sel_${cle}`);
    const txt = document.getElementById(`motif_txt_${cle}`);
    if (!sel || !txt) return;
    txt.hidden = sel.value !== 'motif_autres';
    // Le signalement rouge s'efface dès que le motif est renseigné.
    if (sel.value) sel.classList.remove('exec-pac-manquant');
    if (!txt.hidden) { txt.oninput = () => txt.classList.toggle('exec-pac-manquant', !txt.value.trim()); txt.focus(); }
};

// Un champ suivi vient d'être touché : le bloc de motif suit la divergence
// avec la version acceptée, sans reconstruire le formulaire.
window.execPacSurveillerChamp = function (cle) {
    const champ = EXEC_PAC_CHAMPS_SUIVIS.find((c) => c.cle === cle);
    const saisie = champ && document.getElementById(champ.id);
    const bloc = document.getElementById(`motif_bloc_${cle}`);
    if (!saisie || !bloc) return;
    const modifie = String(saisie.value || '').trim() !== String(bloc.dataset.initial || '').trim();
    bloc.classList.toggle('visible', modifie);
    saisie.classList.toggle('exec-pac-champ-amende', modifie);
    if (!modifie) {
        const sel = document.getElementById(`motif_sel_${cle}`);
        const txt = document.getElementById(`motif_txt_${cle}`);
        if (sel) sel.value = '';
        if (txt) { txt.value = ''; txt.hidden = true; }
    }
};

// Motifs saisis, et champs amendés restés sans motif.
function _execPacMotifs() {
    const motifs = {};
    const manquants = [];
    EXEC_PAC_CHAMPS_SUIVIS.forEach((champ) => {
        const bloc = document.getElementById(`motif_bloc_${champ.cle}`);
        const saisie = document.getElementById(champ.id);
        if (!bloc || !saisie) return;
        if (String(saisie.value || '').trim() === String(bloc.dataset.initial || '').trim()) return;
        const motif = (document.getElementById(`motif_sel_${champ.cle}`) || {}).value || '';
        const precision = ((document.getElementById(`motif_txt_${champ.cle}`) || {}).value || '').trim();
        if (!motif || (motif === 'motif_autres' && !precision)) {
            manquants.push({ champ, motif });
            return;
        }
        motifs[champ.cle] = { motif, precision: motif === 'motif_autres' ? precision : '' };
    });
    return { motifs, manquants };
}

// Bloc repliable des versions du PAC : le bandeau porte l'état de son bloc.
window.execPacBlocToggle = function (bouton) {
    const bloc = bouton && bouton.parentElement;
    if (!bloc) return;
    const ouvert = bloc.classList.toggle('ouvert');
    bouton.setAttribute('aria-expanded', String(ouvert));
};

// Volet des commentaires de suivi : replié par défaut, déplié à la demande.
window.execPacVoletToggle = function () {
    const volet = document.getElementById('execPacVolet');
    if (!volet) return;
    const ouvert = volet.classList.toggle('ouvert');
    const poignee = volet.querySelector('.exec-pac-volet-poignee');
    if (poignee) {
        poignee.setAttribute('aria-expanded', String(ouvert));
        poignee.title = ouvert ? te('volet_replier') : te('volet_deplier');
    }
};

// ══════════════════════════════════════
//  AJUSTEMENT DU RAPPEL DE LA CONSTATATION
// ══════════════════════════════════════
// Revenir sur un délai, une criticité ou l'énoncé d'une constatation déjà
// notifiée engage l'administration : réservé aux comptes SUPERADMIN et ADMIN
// sur leur portée, confirmé par mot de passe, et tracé dans le volet de droite.
const EXEC_AJUST_PORTEES = {
    prorogation: { champs: ['delai_solde'], couleur: '#0284c7' },
    criticite: { champs: ['delai_solde', 'criticite'], couleur: '#f97316' },
    complet: {
        champs: ['delai_solde', 'criticite', 'date_ouverture', 'description', 'ref_reglementaires'],
        couleur: '#7c3aed',
    },
};

function _execPeutAjuster() {
    return ['SUPERADMIN', 'ADMIN'].includes((EXEC_STATE.user || {}).role) && _execCanValidate();
}

function _execAjustBoutons(fnc) {
    if (!_execPeutAjuster()) return '';
    const b = (portee, libelle) => `<button type="button" class="btn btn-sm btn-outline exec-ajust-btn"
        onclick="event.stopPropagation();execAjustOuvrir('${fnc.id}','${portee}')"
        title="${_escAttr(te('ajust_' + portee + '_aide'))}">${_esc(libelle)}</button>`;
    return `<span class="exec-ajust-actions" onclick="event.stopPropagation();">
        ${b('prorogation', te('ajust_prorogation'))}
        ${b('criticite', te('ajust_criticite'))}
        ${b('complet', te('ajust_complet'))}
    </span>`;
}

// Volet de traçabilité, sur le modèle des commentaires de suivi : le dernier
// ajustement déplié, les précédents repliés.
function _execAjustVoletHtml(fnc) {
    const liste = fnc.ajustements || [];
    const cartes = liste.map((a, i) => {
        const deplie = i === liste.length - 1;
        const couleur = (EXEC_AJUST_PORTEES[a.portee] || {}).couleur || '#0284c7';
        return `<div class="exec-suivi-comm exec-ajust-carte${deplie ? '' : ' replie'}"
                     style="border-left-color:${couleur};">
            <div class="exec-suivi-comm-tete" onclick="execSuiviCommToggle(this)">
                <span class="exec-suivi-comm-chevron">${EXEC_ICONS.chevronDown}</span>
                <strong>${te('ajust_rang')} ${i + 1}</strong>
                <span>
                    <em class="exec-suivi-auteur">${_esc(a.auteur || '')}</em>
                    ${a.date ? _formatDate(String(a.date).slice(0, 10)) : ''}
                </span>
            </div>
            <div class="exec-suivi-comm-corps">
                <div class="exec-suivi-comm-items">
                    <span style="background:${couleur}22;color:${couleur};">${te('ajust_' + a.portee)}</span>
                </div>
                <div class="exec-ajust-changements">
                    ${(a.changements || []).map((c) => `<div class="exec-ajust-ligne">
                        <span class="lib">${_esc(c.libelle || c.champ)}</span>
                        <span class="avant">${_esc(c.avant || '—')}</span>
                        ${EXEC_ICONS.next || '→'}
                        <span class="apres">${_esc(c.apres || '—')}</span>
                    </div>`).join('')}
                </div>
                <div class="exec-suivi-comm-texte">${_esc(a.motif || '')}</div>
            </div>
        </div>`;
    }).join('');
    // Volet rabattable à l'horizontale, sur le modèle des détails de suivi :
    // replié il ne montre que sa poignée verticale.
    return `
    <div class="exec-pac-volet exec-rappel-volet" id="execAjustVolet">
        <button type="button" class="exec-pac-volet-poignee" onclick="execAjustVoletToggle()"
                title="${_escAttr(te('volet_deplier'))}" aria-expanded="false" aria-controls="execAjustVoletCorps">
            <span class="exec-pac-volet-chevron">${EXEC_ICONS.chevronDown}</span>
            <span class="exec-pac-volet-titre">${te('ajust_journal')}${liste.length ? ` (${liste.length})` : ''}</span>
        </button>
        <div class="exec-pac-volet-corps" id="execAjustVoletCorps">
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header exec-teinte-ambre" onclick="execAjustVoletToggle()">
                    <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                    <span class="exec-form-section-title">${te('ajust_journal')}</span>
                    <span class="exec-suivi-comm-compte">${liste.length}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                    <div class="exec-ajust-liste">
                        ${cartes || `<em class="exec-ajust-vide">${te('ajust_aucun')}</em>`}
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

window.execAjustVoletToggle = function () {
    const volet = document.getElementById('execAjustVolet');
    if (!volet) return;
    const ouvert = volet.classList.toggle('ouvert');
    const poignee = volet.querySelector('.exec-pac-volet-poignee');
    if (poignee) {
        poignee.setAttribute('aria-expanded', String(ouvert));
        poignee.title = ouvert ? te('volet_replier') : te('volet_deplier');
    }
};

window.execAjustOuvrir = function (fncId, portee) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    const cfg = EXEC_AJUST_PORTEES[portee];
    if (!cfg) return;
    const dateOuv = String(fnc.date_ouverture || fnc.date_creation || '').slice(0, 10);
    const champ = {
        delai_solde: `<div class="form-group">
            <label class="form-label" for="ajust_delai_solde">${te('delai_solde')}</label>
            <input type="number" min="1" class="form-input" id="ajust_delai_solde"
                   value="${_escAttr(fnc.delai_solde || '')}" oninput="execAjustEcheance()">
        </div>`,
        criticite: `<div class="form-group">
            <label class="form-label" for="ajust_criticite">${te('criticite_label')}</label>
            <select class="form-select" id="ajust_criticite">
                ${_execCriticiteOptions(fnc.criticite || fnc.gravite)}
            </select>
        </div>`,
        date_ouverture: `<div class="form-group">
            <label class="form-label" for="ajust_date_ouverture">${te('date_ouverture')}</label>
            <input type="date" class="form-input" id="ajust_date_ouverture"
                   value="${_escAttr(dateOuv)}" onchange="execAjustEcheance()">
        </div>`,
        description: `<div class="form-group">
            <label class="form-label" for="ajust_description">${te('description_constatation')}</label>
            <textarea class="form-input" id="ajust_description" rows="4">${_esc(fnc.description || fnc.titre || '')}</textarea>
        </div>`,
        ref_reglementaires: `<div class="form-group">
            <label class="form-label" for="ajust_ref_reglementaires">${te('ref_reglementaires_label')}</label>
            <input type="text" class="form-input" id="ajust_ref_reglementaires"
                   value="${_escAttr(fnc.ref_reglementaires || fnc.exigence_ref || '')}">
        </div>`,
    };
    // Les mesures de la constatation — date d'ouverture, délai, criticité,
    // échéance — se lisent sur une même grille : ce sont les quatre bornes
    // d'un même engagement, elles doivent s'aligner.
    const mesures = ['date_ouverture', 'delai_solde', 'criticite'].filter((c) => cfg.champs.includes(c));
    const textes = cfg.champs.filter((c) => !mesures.includes(c));
    const corps = `
    <div class="exec-proc-bloc exec-ajust-form" data-date-ouverture="${_escAttr(dateOuv)}">
        <p class="exec-ajust-intro">${te('ajust_intro')}</p>
        <div class="exec-ajust-mesures">
            ${mesures.map((c) => champ[c] || '').join('')}
            <div class="form-group">
                <label class="form-label">${te('date_due_label')}</label>
                <input type="text" class="form-input exec-ajust-echeance" id="ajust_apercu_echeance" readonly>
            </div>
        </div>
        ${textes.map((c) => champ[c] || '').join('')}
        <div class="form-group">
            <label class="form-label" for="ajust_motif">${te('ajust_motif')}</label>
            <textarea class="form-input" id="ajust_motif" rows="3"
                      placeholder="${_escAttr(te('ajust_motif_aide'))}"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label" for="ajust_mdp">${te('ajust_mot_de_passe')}</label>
            <input type="password" class="form-input" id="ajust_mdp" autocomplete="current-password">
        </div>
        <p class="exec-proc-erreur" id="ajust_erreur"></p>
    </div>`;
    const pied = `
        <button class="btn btn-outline" onclick="execAjustRetour('${fncId}')">${te('cancel') || 'Annuler'}</button>
        <button class="btn btn-primary" onclick="execAjustAppliquer('${fncId}','${portee}')">
            ${EXEC_ICONS.check || ''} ${te('appliquer')}
        </button>`;
    // Bandeau : le retour au formulaire de suivi précède l'intitulé, et la
    // croix de fermeture n'a plus lieu d'être.
    const titre = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execAjustRetour('${fncId}')">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.edit || ''} ${te('ajust_' + portee)} — ${_esc(fnc.reference || '')}`;
    execShowSlider(titre, corps, pied, 'third');
    document.querySelector('#execSlider .exec-slider-close')?.remove();
    execAjustEcheance();
};

// Retour : le formulaire de suivi d'où l'on vient reprend la main.
window.execAjustRetour = function (fncId) {
    execCloseSlider();
    setTimeout(() => execOpenPACSlider(fncId), 80);
};

// Aperçu de l'échéance : elle découle du délai et de la date d'ouverture,
// autant la montrer avant de valider.
window.execAjustEcheance = function () {
    const boite = document.querySelector('.exec-ajust-form');
    const apercu = document.getElementById('ajust_apercu_echeance');
    if (!boite || !apercu) return;
    const delai = parseInt((document.getElementById('ajust_delai_solde') || {}).value, 10);
    const ouv = (document.getElementById('ajust_date_ouverture') || {}).value || boite.dataset.dateOuverture;
    if (Number.isNaN(delai) || !/^\d{4}-\d{2}-\d{2}$/.test(String(ouv || ''))) { apercu.value = '—'; return; }
    const d = new Date(`${ouv}T00:00:00`);
    d.setDate(d.getDate() + delai);
    apercu.value = _formatDate(d.toISOString().slice(0, 10));
};

window.execAjustAppliquer = async function (fncId, portee) {
    const cfg = EXEC_AJUST_PORTEES[portee];
    const err = document.getElementById('ajust_erreur');
    const val = (id) => (document.getElementById(id) || {}).value;
    const motif = String(val('ajust_motif') || '').trim();
    const mdp = String(val('ajust_mdp') || '');
    if (!motif) { err.textContent = te('ajust_motif_requis'); return; }
    if (!mdp) { err.textContent = te('ajust_mot_de_passe_requis'); return; }
    const champs = {};
    cfg.champs.forEach((c) => {
        const v = val('ajust_' + c);
        if (v !== undefined) champs[c] = v;
    });
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/ajuster`, {
            method: 'PUT',
            body: JSON.stringify({ portee, champs, motif, admin_password: mdp }),
        });
        execCloseSlider();
        await execRefreshDynamic();
        _execToast(te('ajust_ok'), 'success');
        execOpenPACSlider(fncId);
    } catch (e) {
        err.textContent = (e && e.message) || te('action_impossible');
    }
};

async function execOpenPACSlider(fncId) {
    let fnc;
    let echangesPac = [];
    try {
        [fnc, echangesPac] = await Promise.all([
            api(`${EXEC_MODULE_API}/constatations/${fncId}`),
            api(`${EXEC_MODULE_API}/constatations/${fncId}/echanges`).catch(() => []),
        ]);
    } catch (e) {
        console.error('Load constatation error:', e);
        return;
    }
    if (!fnc) return;
    echangesPac = echangesPac || [];
    EXEC_STATE.selectedConstatation = fnc;
    // Le formulaire se rappelle lui-même à chaque étape : la provenance ne
    // doit se perdre que si l'on passe à une autre constatation.
    execPrendreRetour('pac:' + fncId);

    // ── Role + status flags ──────────────────────────────────────────
    const isAAC = _execIsAAC();
    const isPostulant = !isAAC;
    const statut = fnc.statut || 'ouvert';
    const isSoldee = statut === 'soldee';
    const isPACSoumis = statut === 'pac_soumis';
    const isPACRejete = statut === 'pac_rejetee';
    const isOuverte = statut === 'ouvert' || statut === 'ouverte';

    // ── Évaluation de l'AAC : lue tôt, le fil et les droits d'écriture en dépendent ──
    let evalData = {};
    if (fnc.commentaire_evaluation) {
        if (typeof fnc.commentaire_evaluation === 'object') {
            evalData = fnc.commentaire_evaluation;
        } else {
            try { evalData = JSON.parse(fnc.commentaire_evaluation); } catch (e) {
                evalData = { legacy_comment: fnc.commentaire_evaluation };
            }
        }
    }
    const evaluationANAC = evalData.evaluation_anac || {};
    const submitInfo = evalData.submit_info || null;
    const etatFil = execPacEtat(statut, evaluationANAC, submitInfo);

    // Étape « Mise en oeuvre », côté prestataire : deux modes d'écriture, choisis
    // par bouton. `preuves` n'ouvre que le dépôt des preuves ; `amendement`
    // rouvre tout le plan et remettra l'acceptation en jeu à la soumission.
    const modePac = (EXEC_STATE.pacMode && EXEC_STATE.pacMode.fncId === fncId)
        ? (EXEC_STATE.pacMode.modes || []) : [];
    const enMiseEnOeuvre = isPostulant && !isSoldee && etatFil.courante === 'mise_oeuvre';
    if (!enMiseEnOeuvre && modePac.length) EXEC_STATE.pacMode = null;
    // Les deux modes se cumulent. À la soumission, l'amendement l'emporte :
    // le plan repart en acceptation, preuves comprises.
    const modes = enMiseEnOeuvre ? modePac : [];
    const modeAmendement = modes.includes('amendement');
    const modePreuves = modes.includes('preuves');
    const modeSoumission = modeAmendement ? 'amendement' : (modePreuves ? 'preuves' : null);

    // PAC fields are filled ONLY by the postulant (applicant). AAC users always see them read-only.
    const pacEditable = !isSoldee && isPostulant
        && (isOuverte || isPACRejete || modeAmendement);
    // Dépôt des preuves : ouvert aussi quand le plan est figé mais que le
    // prestataire a demandé à joindre ses preuves de mise en oeuvre.
    const preuvesEditable = pacEditable || modePreuves;
    // L'évaluation n'a pas d'objet tant que le plan n'est pas soumis : les
    // « Résultats du Suivi » et les commentaires restent en lecture seule
    // jusqu'à l'étape Acceptation.
    const evaluationOuverte = etatFil.faites.soumission;
    const aacEditable = isAAC && !isSoldee && evaluationOuverte;
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

    // ── Parse PAC data ───────────────────────────────────────────────
    const actions = fnc.actions_correctives || [];
    const pac = actions[0] || {};

    const acceptation = evaluationANAC.acceptation || {};
    const verification = evaluationANAC.verification || {};
    const cloture = evaluationANAC.cloture || {};
    const itemsComments = evalData.items_comments || {};
    // Commentaires de suivi : le fil courant, précédé des échanges enregistrés
    // item par item dans l'ancienne présentation en table.
    const commentairesSuivi = [
        // Les échanges de l'ancienne table sont réputés transmis.
        ...Object.entries(itemsComments).flatMap(([cle, liste]) => (liste || []).map((c) => ({
            date: c.date || '', auteur: c.auteur || '',
            items: [cle === 'cause_primaire' ? 'cause' : cle], precision: '', texte: c.texte || '',
            publie: true,
        }))),
        ...(evalData.suivi_commentaires || []),
    ]
        .filter((c) => c.publie || isAAC)      // le prestataire ne lit que le transmis
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const rejetInfo = evalData.rejet_info || null;
    const preuvesInfo = evalData.preuves_info || null;
    const preuvesRefus = evalData.preuves_refus || null;
    const retourMiseEnOeuvre = evalData.retour_mise_oeuvre || null;
    const versionsPac = fnc.versions_pac || [];

    // ── Render helpers ───────────────────────────────────────────────
    // Motifs d'amendement : bloc sous le champ, et surveillance de la saisie.
    // La comparaison porte sur l'empreinte du plan accepté, prise au moment de
    // l'acceptation : un brouillon enregistré entre-temps ne fausse donc plus
    // la détection. À défaut d'empreinte (dossiers antérieurs), le plan courant
    // sert de référence.
    const pacAccepte = ((fnc.pac_accepte || {}).actions_correctives || [])[0] || pac;
    const motifsEnregistres = pac.motifs_amendement || {};
    const motifBloc = (cle) => {
        const champ = EXEC_PAC_CHAMPS_SUIVIS.find((c) => c.cle === cle);
        if (!champ) return '';
        const initiale = pacAccepte[cle] || '';
        const modifie = String(pac[cle] || '').trim() !== String(initiale).trim();
        return _execPacMotifHtml(champ, initiale, motifsEnregistres[cle], modeAmendement, modifie);
    };
    const surveille = (cle) => (modeAmendement
        ? `oninput="execPacSurveillerChamp('${cle}')" onchange="execPacSurveillerChamp('${cle}')"` : '');
    // Champ déjà divergent à l'ouverture (brouillon enregistré avant soumission).
    const classeAmendee = (cle) => (modeAmendement
        && String(pac[cle] || '').trim() !== String(pacAccepte[cle] || '').trim()
        ? ' exec-pac-champ-amende' : '');

    const renderProofList = (proofs, containerId, editable) => {
        if (!proofs || !Array.isArray(proofs) || proofs.length === 0) return '';
        return proofs
            .map((p, i) => _execPreuveHtml(typeof p === 'string' ? { filename: p } : p, i + 1, editable))
            .join('');
    };

    const renderUploadZone = (prefix, listId, editable) => {
        if (!editable) return '';
        return `<div style="margin-top:0.35rem;padding:0.5rem;border:2px dashed var(--border);border-radius:6px;text-align:center;color:var(--text-muted);cursor:pointer;font-size:0.75rem;" onclick="execUploadPACProof('${prefix}')">
            ${EXEC_ICONS.upload} ${te('upload_zone')}
            <input type="file" id="${prefix}_input" style="display:none;" multiple onchange="execHandlePACProofUpload(this.files, '${listId}')">
        </div>`;
    };

    // La réponse du postulant se lit dans le formulaire du PAC : la table ne
    // porte plus que l'item et les échanges qui s'y rapportent.
    // Plans acceptés puis amendés : conservés en version, consultables ici.
    // Le bloc n'emprunte pas `.exec-form-section` — la règle du socle ouvre
    // tout corps de section descendant d'une section dépliée, et ce bloc est
    // imbriqué dans celle du plan d'actions. Classes propres, sélecteurs
    // d'enfant direct : chaque niveau se replie pour lui-même.
    const renderVersionsPac = () => {
        if (!versionsPac.length) return '';
        const ligne = (libelle, valeur) => valeur
            ? `<div style="margin-top:0.3rem;"><span style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${libelle}</span><div>${valeur}</div></div>`
            : '';
        return `<div class="exec-pac-versions">
            <button type="button" class="exec-pac-versions-bandeau" aria-expanded="false"
                    onclick="execPacBlocToggle(this)">
                <span class="exec-pac-versions-pastille">${versionsPac.length}</span>
                <span class="exec-pac-versions-titre">${te('versions_pac')}</span>
                <span class="exec-pac-versions-chevron">${EXEC_ICONS.chevronDown}</span>
            </button>
            <div class="exec-pac-versions-corps">
                ${versionsPac.map((v, i) => {
                    const p = (v.actions_correctives || [])[0] || {};
                    const acc = v.acceptation || {};
                    const detail = [
                        `${te('amende_le')} ${_formatDate((v.date || '').slice(0, 10))}`,
                        v.auteur ? _esc(v.auteur) : '',
                        acc.date ? `${te('date_acceptation')} ${_formatDate(acc.date)}` : '',
                    ].filter(Boolean).join(' · ');
                    return `<div class="exec-pac-version">
                        <button type="button" class="exec-pac-versions-bandeau" aria-expanded="false"
                                onclick="execPacBlocToggle(this)">
                            <span class="exec-pac-versions-titre">${te('version_n')} ${i + 1}
                                <span style="font-weight:normal;color:var(--text-muted);">— ${detail}</span>
                            </span>
                            <span class="exec-pac-versions-chevron">${EXEC_ICONS.chevronDown}</span>
                        </button>
                        <div class="exec-pac-version-corps">
                            ${ligne(te('cause_root'), _esc(p.cause_primaire || ''))}
                            ${ligne(te('action_curative_correction'), _esc(p.action_curative || ''))}
                            ${ligne(te('action_corrective_prevention'), _esc(p.actions_correctives || ''))}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    };


    // ── Actions du circuit : elles siègent sur la ligne du fil, à droite ──
    let filActions = '';
    if (isPostulant && (isOuverte || isPACRejete)) {
        filActions = `<button class="btn btn-primary btn-sm" onclick="execSubmitPAC('${fncId}')">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    } else if (isPostulant && isPACSoumis) {
        // État désactivé : le PAC attend l'examen de l'AAC.
        filActions = `<button class="btn btn-primary btn-sm" disabled title="${te('pac_soumis')}">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    }
    // Étape Mise en oeuvre, côté prestataire : joindre les preuves, rouvrir le
    // plan, ou les deux. La soumission n'a de sens qu'un mode au moins choisi.
    if (enMiseEnOeuvre) {
        const btn = (mode, cle) => `<button class="btn btn-sm ${modes.includes(mode) ? 'btn-primary' : 'btn-outline'}"
            aria-pressed="${modes.includes(mode)}" onclick="execPacModeEdition('${fncId}', '${mode}')">${te(cle)}</button>`;
        filActions += ` ${btn('preuves', 'ajouter_preuves')}`;
        filActions += ` ${btn('amendement', 'amender_pac')}`;
        filActions += modeSoumission
            ? ` <button class="btn btn-primary btn-sm" onclick="execSoumettreMiseEnOeuvre('${fncId}', '${modeSoumission}')">${EXEC_ICONS.send} ${te('soumettre')}</button>`
            : ` <button class="btn btn-primary btn-sm" disabled title="${te('choisir_mode_pac')}">${EXEC_ICONS.send} ${te('soumettre')}</button>`;
    }
    if (isAAC && isPACSoumis) {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execReturnPACtoPostulant('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer')}</button>`;
    }
    // Étape Mise en oeuvre, côté AAC : statuer sur les preuves déposées.
    if (isAAC && !isSoldee && etatFil.courante === 'mise_oeuvre') {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execPreuvesNonAcceptables('${fncId}')">${EXEC_ICONS.x} ${te('preuves_non_acceptables')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPreuves('${fncId}')">${EXEC_ICONS.check} ${te('acceptation')}</button>`;
    }
    // Étape Clôture, côté AAC : renvoyer à la mise en oeuvre, ou clôturer.
    if (isAAC && !isSoldee && etatFil.courante === 'cloture') {
        filActions += ` <button class="btn btn-danger btn-sm" onclick="execRenvoyerMiseEnOeuvre('${fncId}')">${EXEC_ICONS.x} ${te('renvoyer')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execCloseFNC('${fncId}')">${EXEC_ICONS.check} ${te('cloturer')}</button>`;
    }
    // Étape Acceptation, côté AAC : accepter le plan seul, ou plan et preuves.
    // Le second jalon clôt d'un coup l'acceptation et la mise en oeuvre.
    if (isAAC && isPACSoumis && etatFil.courante === 'acceptation') {
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPAC('${fncId}', false)">${EXEC_ICONS.check} ${te('accepter_pac')}</button>`;
        filActions += ` <button class="btn btn-success btn-sm" onclick="execAccepterPAC('${fncId}', true)">${EXEC_ICONS.check} ${te('accepter_pac_preuves')}</button>`;
    }

    // ── Body HTML — 2-column layout ──────────────────────────────────
    const bodyHtml = `
    <div class="exec-proc-entete-collant">${execPacFilHtml(statut, evaluationANAC, submitInfo, filActions)}</div>
    ${rejetInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('pac_renvoye_titre')} ${rejetInfo.date ? `(${_formatDate(rejetInfo.date)})` : ''} ${rejetInfo.auteur ? `— ${_esc(rejetInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(rejetInfo.motif || '')}</div>
    </div>` : ''}
    ${submitInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.check} ${te('pac_soumis_titre') || 'PAC soumis pour validation'} ${submitInfo.date ? `(${_formatDate(submitInfo.date)})` : ''} ${submitInfo.auteur ? `— ${_esc(submitInfo.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#14532d;"><strong>${te('motif')} :</strong> ${_esc(submitInfo.motif || '')}</div>
    </div>` : ''}
    ${preuvesInfo ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;">
        <div style="font-weight:600;color:#1e40af;font-size:0.85rem;">${EXEC_ICONS.check} ${te('preuves_soumises_titre')} ${preuvesInfo.date ? `(${_formatDate(preuvesInfo.date)})` : ''} ${preuvesInfo.auteur ? `— ${_esc(preuvesInfo.auteur)}` : ''}</div>
    </div>` : ''}
    ${preuvesRefus ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('preuves_refusees_titre')} ${preuvesRefus.date ? `(${_formatDate(preuvesRefus.date)})` : ''} ${preuvesRefus.auteur ? `— ${_esc(preuvesRefus.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(preuvesRefus.motif || '')}</div>
    </div>` : ''}
    ${verification.preuves_acceptees === 'OUI' ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('preuves_acceptees_titre')} ${verification.date_acceptation_preuves ? `(${_formatDate(verification.date_acceptation_preuves)})` : ''} ${verification.acceptees_par ? `— ${_esc(verification.acceptees_par)}` : ''}</div>
    </div>` : ''}
    ${verification.verification_terrain && !isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;">
        <div style="font-weight:600;color:#92400e;font-size:0.85rem;">${EXEC_ICONS.alarm} ${te('verification_terrain_annoncee')}</div>
    </div>` : ''}
    ${retourMiseEnOeuvre ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
        <div style="font-weight:600;color:#991b1b;margin-bottom:0.2rem;font-size:0.85rem;">${EXEC_ICONS.x} ${te('renvoye_mise_oeuvre')} ${retourMiseEnOeuvre.date ? `(${_formatDate(retourMiseEnOeuvre.date)})` : ''} ${retourMiseEnOeuvre.auteur ? `— ${_esc(retourMiseEnOeuvre.auteur)}` : ''}</div>
        <div style="font-size:0.8rem;color:#7f1d1d;"><strong>${te('motif')} :</strong> ${_esc(retourMiseEnOeuvre.motif || '')}</div>
    </div>` : ''}
    ${modes.length ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#fffbeb;border-left:4px solid #d97706;border-radius:6px;">
        ${modeAmendement && modePreuves
            ? `<div style="font-weight:600;color:#92400e;font-size:0.85rem;">${te('mode_mixte_actif')}</div>`
            : `<div style="font-weight:600;color:#92400e;font-size:0.85rem;">${modeAmendement ? te('mode_amendement_actif') : te('mode_preuves_actif')}</div>`}
    </div>` : ''}
    ${isSoldee ? `<div style="margin-bottom:0.75rem;padding:0.6rem 0.9rem;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <div style="font-weight:600;color:#166534;font-size:0.85rem;">${EXEC_ICONS.check} ${te('constatation_soldee') || 'Constatation soldée'}${fnc.date_solde ? ` — ${te('date_solde')} : ${_formatDate(fnc.date_solde.slice(0,10))}` : ''}</div>
    </div>` : ''}
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- Section A — Rappel de la Constatation (pleine largeur)        -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div class="exec-rappel-rangee">
    <div class="exec-form-section expanded exec-rappel-corps">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">A</span>
            <span class="exec-form-section-title">${te('rappel_constatation')}</span>
            ${_execAjustBoutons(fnc)}
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <div style="display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr 1fr 1fr;gap:0.6rem;font-size:0.78rem;margin-bottom:0.6rem;">
                <div>
                    <div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;">${te('provider')}</div>
                    <div><strong>${_esc(prestataireName)}</strong></div>
                </div>
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
    ${_execAjustVoletHtml(fnc)}
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- Section B — PAC (à gauche) + Commentaires de suivi (à droite) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div class="exec-pac-rangee">

        <div class="exec-pac-col-gauche">
            <!-- Section 2 : Plan d'Actions Correctives -->
            <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <span class="exec-form-section-letter">B</span>
                    <span class="exec-form-section-title">${te('plan_actions_correctives')}${isPACSoumis || isPACRejete || isSoldee ? ` <span style="font-weight:normal;color:var(--text-muted);font-size:0.78rem;">(Soumis par ${_esc(prestataireName)})</span>` : ''}</span>
                    <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
                </div>
                <div class="exec-form-section-body" style="flex:1;">
                    <div class="form-group">
                        <label for="pac_cause_primaire" style="font-size:0.8rem;font-weight:600;">${te('cause_root')}</label>
                        <textarea class="form-input${classeAmendee('cause_primaire')}" id="pac_cause_primaire" rows="2" ${pacRO} ${surveille('cause_primaire')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.cause_primaire || '')}</textarea>
                        ${motifBloc('cause_primaire')}
                    </div>
                    <!-- La date prévue accompagne l'intitulé de l'action, à
                         l'extrême droite de sa ligne ; les preuves occupent
                         ensuite toute la largeur. -->
                    <div class="form-group" style="margin-top:0.55rem;">
                        <div class="exec-pac-ligne-action">
                            <label for="pac_action_curative" style="font-size:0.8rem;font-weight:600;">${te('action_curative_correction')}</label>
                            <div class="exec-pac-date-inline">
                                <label for="pac_curative_date_prevue">${te('date_prevue')}</label>
                                <input type="date" class="form-input${classeAmendee('curative_date_prevue')}" id="pac_curative_date_prevue" value="${_escAttr(pac.curative_date_prevue || '')}" ${pacRO} ${surveille('curative_date_prevue')} style="${lockedBg(pacEditable)}">
                            </div>
                        </div>
                        <textarea class="form-input${classeAmendee('action_curative')}" id="pac_action_curative" rows="2" ${pacRO} ${surveille('action_curative')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.action_curative || '')}</textarea>
                        ${motifBloc('action_curative')}
                        ${motifBloc('curative_date_prevue')}
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                        <div id="pac_curative_preuves_list">${renderProofList(pac.curative_preuves, 'pac_curative_preuves_list', preuvesEditable)}</div>
                        ${renderUploadZone('pac_curative_preuves', 'pac_curative_preuves_list', preuvesEditable)}
                    </div>
                    <div class="form-group" style="margin-top:0.55rem;">
                        <div class="exec-pac-ligne-action">
                            <label for="pac_actions_correctives" style="font-size:0.8rem;font-weight:600;">${te('action_corrective_prevention')}</label>
                            <div class="exec-pac-date-inline">
                                <label for="pac_corrective_date_prevue">${te('date_prevue')}</label>
                                <input type="date" class="form-input${classeAmendee('corrective_date_prevue')}" id="pac_corrective_date_prevue" value="${_escAttr(pac.corrective_date_prevue || '')}" ${pacRO} ${surveille('corrective_date_prevue')} style="${lockedBg(pacEditable)}">
                            </div>
                        </div>
                        <textarea class="form-input${classeAmendee('actions_correctives')}" id="pac_actions_correctives" rows="2" ${pacRO} ${surveille('actions_correctives')} style="font-size:0.8rem;${lockedBg(pacEditable)}">${_esc(pac.actions_correctives || '')}</textarea>
                        ${motifBloc('actions_correctives')}
                        ${motifBloc('corrective_date_prevue')}
                    </div>
                    <div class="form-group" style="margin-top:0.35rem;">
                        <label style="font-size:0.74rem;color:var(--text-muted);">${te('preuves_action')}</label>
                        <div id="pac_corrective_preuves_list">${renderProofList(pac.corrective_preuves, 'pac_corrective_preuves_list', preuvesEditable)}</div>
                        ${renderUploadZone('pac_corrective_preuves', 'pac_corrective_preuves_list', preuvesEditable)}
                    </div>
                    ${renderVersionsPac()}
                </div>
            </div>

        </div>

        <!-- ═══════════════════════════════════════════════════════════ -->
        <!-- RIGHT — Commentaires de suivi : volet rabattable              -->
        <!-- Replié par défaut ; la poignée verticale l'ouvre sur la droite -->
        <!-- ═══════════════════════════════════════════════════════════ -->
        <div class="exec-pac-volet" id="execPacVolet">
            <button type="button" class="exec-pac-volet-poignee" onclick="execPacVoletToggle()"
                    title="${te('volet_deplier')}" aria-expanded="false" aria-controls="execPacVoletCorps">
                <span class="exec-pac-volet-chevron">${EXEC_ICONS.chevronDown}</span>
                <span class="exec-pac-volet-titre">${te('details_suivi')}</span>
            </button>
            <div class="exec-pac-volet-corps" id="execPacVoletCorps">
                <div class="exec-form-section expanded" style="flex:1;display:flex;flex-direction:column;">
                    <div class="exec-form-section-header exec-teinte-ambre" onclick="execPacVoletToggle()">
                        <span class="exec-form-section-letter" style="background:#d97706;">i</span>
                        <span class="exec-form-section-title">${te('details_suivi')}</span>
                    </div>
                    <div class="exec-form-section-body" style="flex:1;display:flex;flex-direction:column;">
                        <p style="font-size:0.74rem;color:var(--text-muted);margin:0 0 0.5rem 0;">${te('details_suivi_intro')}</p>
                        <div id="pac_suivi_liste" class="exec-suivi-liste">
                            ${commentairesSuivi.length
                                ? (() => { let rang = 0; const dernier = commentairesSuivi.length - 1;
                                    return commentairesSuivi
                                        .map((c, i) => _execCommentaireSuiviHtml(c, aacEditable,
                                            c.publie ? ++rang : 0, i === dernier))
                                        .join(''); })()
                                : `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>`}
                        </div>
                        ${isAAC && !isSoldee && !evaluationOuverte ? `
                        <p class="exec-suivi-attente">${te('suivi_attente_soumission')}</p>` : ''}
                        ${aacEditable ? `
                        <!-- Rédaction réservée à l'AAC : items visés, précision, texte -->
                        <div class="exec-suivi-composeur">
                            <div class="exec-suivi-items">
                                ${EXEC_PAC_ITEMS_COMMENTABLES.map((it) => `<label class="exec-suivi-puce">
                                    <input type="checkbox" value="${it}" onchange="execSuiviItemsChange(this)"> <span>${te(`item_${it}`)}</span>
                                </label>`).join('')}
                                <label class="exec-suivi-puce">
                                    <input type="checkbox" value="autres" id="pac_suivi_autres" onchange="execSuiviItemsChange(this)"> <span>${te('motif_autres')}</span>
                                </label>
                                <input type="text" class="form-input exec-suivi-precision" id="pac_suivi_precision"
                                       placeholder="${te('motif_preciser')}" hidden>
                            </div>
                            <div class="exec-suivi-saisie">
                                <textarea class="form-input" id="pac_suivi_texte" rows="2" disabled
                                          placeholder="${te('suivi_choisir_item')}"></textarea>
                                <button class="btn btn-sm btn-primary" id="pac_suivi_ajouter" disabled
                                        onclick="execAjouterCommentaireSuivi()">${te('ajouter_commentaire')}</button>
                            </div>
                            <!-- Pièces jointes du commentaire, déposées avant l'ajout. -->
                            <div class="exec-suivi-pj">
                                <div id="pac_suivi_pj_liste"></div>
                                <button class="btn btn-sm btn-outline" onclick="this.nextElementSibling.click()">
                                    ${EXEC_ICONS.upload} ${te('joindre_fichier')}
                                </button>
                                <input type="file" style="display:none;" multiple
                                       onchange="execSuiviJoindreFichiers(this)">
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${showAACSection ? `
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- Section C — Évaluation et Suivi (AAC), pleine largeur        -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div class="exec-form-section expanded exec-resultats" id="exec_resultats_suivi" style="margin-top:0.6rem;">
        <div class="exec-form-section-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="exec-form-section-letter">C</span>
            <span class="exec-form-section-title">${te('resultats_suivi')}</span>
            <span class="exec-form-section-chevron">${EXEC_ICONS.chevronDown}</span>
        </div>
        <div class="exec-form-section-body">
            <!-- Trois blocs de largeurs 1 / 3 / 2, de hauteurs alignées. -->
            <div style="display:grid;grid-template-columns:1fr 3fr 2fr;gap:0.85rem;align-items:stretch;">

                <!-- C1 Acceptation -->
                <div class="exec-resultats-bloc">
                    <div class="exec-resultats-bloc-titre">${te('acceptation_propositions')}</div>
                    <label class="exec-pac-case">
                        <input type="checkbox" id="anac_pac_accepte" onchange="execPacTeinteResultats()" ${acceptation.accepte === 'OUI' ? 'checked' : ''} ${aacDis}>
                        <span>${te('pac_accepte')}</span>
                    </label>
                    <div class="form-group" style="margin-top:0.45rem;">
                        <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_acceptation')}</label>
                        <input type="date" class="form-input" id="anac_date_acceptation" value="${_escAttr(acceptation.date || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                    </div>
                </div>

                <!-- C2 Commentaire général de suivi : autant d'entrées que de
                     suivis, chacune datée et signée. -->
                <div class="exec-resultats-bloc" style="display:flex;flex-direction:column;">
                    <div class="exec-resultats-bloc-titre">${te('commentaire_general_suivi')}</div>
                    <div id="anac_suivis_list" class="exec-suivis" style="flex:1;">
                        ${(verification.suivis || []).length
                            ? (verification.suivis || []).map((s) => _execSuiviHtml(s, aacEditable)).join('')
                            : `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_suivi')}</em>`}
                    </div>
                    ${aacEditable ? `<div style="display:flex;gap:0.35rem;margin-top:0.45rem;">
                        <textarea class="form-input" id="anac_suivi_saisie" rows="1" placeholder="${te('suivi_placeholder')}" style="flex:1;font-size:0.76rem;padding:0.3rem;"></textarea>
                        <button class="btn btn-sm btn-primary" onclick="execAjouterSuivi()" style="padding:0.3rem 0.55rem;font-size:0.72rem;">${te('ajouter_suivi')}</button>
                    </div>` : ''}
                    <label class="exec-pac-case" style="margin-top:0.45rem;">
                        <input type="checkbox" id="anac_verif_terrain" onchange="execPacTeinteResultats()" ${verification.verification_terrain ? 'checked' : ''} ${aacDis}>
                        <span>${te('verifier_terrain')}</span>
                    </label>
                </div>

                <!-- C3 Preuves de mise en oeuvre recueillies -->
                <div class="exec-resultats-bloc">
                    <div class="exec-resultats-bloc-titre">${te('preuves_recueillies')}</div>
                    <div id="anac_preuves_mise_oeuvre_list">${renderProofList(verification.preuves_mise_oeuvre, 'anac_preuves_mise_oeuvre_list', aacEditable)}</div>
                    ${renderUploadZone('anac_preuves_mise_oeuvre', 'anac_preuves_mise_oeuvre_list', aacEditable)}
                </div>

            </div>

            <!-- 3d Clôture : pleine largeur, sous les trois blocs -->
            <div class="exec-resultats-bloc" style="margin-top:0.85rem;">
                <div class="exec-resultats-bloc-titre">${te('cloture_fnc')}</div>
                    <label class="exec-pac-case">
                        <input type="checkbox" id="anac_mise_effective" onchange="execPacTeinteResultats()" ${cloture.mise_en_oeuvre_effective === 'OUI' ? 'checked' : ''} ${aacDis}>
                        <span>${te('mise_oeuvre_effective')}</span>
                    </label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.45rem;">
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('date_solde')}</label>
                            <input type="date" class="form-input" id="anac_date_solde" value="${_escAttr(cloture.date_solde || (fnc.date_solde ? fnc.date_solde.slice(0,10) : ''))}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.72rem;color:var(--text-muted);">${te('solde_par')}</label>
                            <input type="text" class="form-input" id="anac_solde_par" value="${_escAttr(cloture.solde_par || '')}" ${aacRO} style="font-size:0.78rem;${lockedBg(aacEditable)}">
                        </div>
                    </div>
            </div>
        </div>
    </div>` : ''}`;

    // ── Barre du bas ─────────────────────────────────────────────────
    // Annuler abandonne les saisies en cours sans refermer le formulaire.
    let footerHtml = `<button class="btn btn-outline" onclick="execAnnulerSaisiePAC('${fncId}')">${te('cancel')}</button>`;

    // Brouillon — visible for AAC and Postulant when not soldée
    if (!isSoldee) {
        footerHtml += ` <button class="btn btn-outline" onclick="execSaveDraftPAC('${fncId}')">${te('sauver_brouillon')}</button>`;
    }

    // Soumettre, Renvoyer, Accepter PAC, Accepter PAC et Preuves, Non
    // acceptable, Acceptable, Clôturer : tous sur la ligne du fil.

    // Export PDF de la fiche complète, à tout moment du circuit.
    footerHtml += ` <button class="btn btn-primary" onclick="execExporterFncPdf('${fncId}')">${EXEC_ICONS.download} ${te('export_pdf')}</button>`;

    // Bandeau : sortie du formulaire à l'extrême gauche, avant son intitulé.
    // Retour ramène là d'où l'on vient quand une provenance a été armée, et
    // referme simplement le volet sinon.
    const titreHtml = `<button class="btn btn-outline btn-sm exec-proc-retour" onclick="execRetourVolet()">
            ${EXEC_ICONS.back || ''} ${te('back')}
        </button>${EXEC_ICONS.constatations} ${te('suivi_pac')} — ${_esc(fnc.reference || '')}`;
    execShowSlider(titreHtml, bodyHtml, footerHtml, 'max');
    EXEC_STATE.voletRejouer = () => execOpenPACSlider(fncId);
    // Le formulaire se rejoue à chaque étape : pas de glissement du volet ni de
    // fondu du corps entre deux états.
    document.getElementById('execSlider')?.classList.add('exec-proc-instant');
    document.getElementById('execSliderOverlay')?.classList.add('exec-proc-instant');
    // Le bandeau porte l'accès aux discussions à la place de la croix.
    _execPacInstallerDiscussions(fncId, echangesPac, isSoldee);
    execPacTeinteResultats();
}

function _collectProofsFromContainer(containerId) {
    const proofs = [];
    document.querySelectorAll(`#${containerId} > div`).forEach((div, i) => {
        const d = div.dataset || {};
        if (!d.path) return;
        proofs.push({
            numero: i + 1,
            filename: d.filename || d.intitule || '',
            path: d.path,
            intitule: d.intitule || '',
            commentaire: d.commentaire || '',
            date: d.date || '',
        });
    });
    return proofs;
}

// ── Pièces jointes : intitulé, commentaire, numérotation ─────────
// Une pièce se lit de la même façon qu'elle vienne du serveur ou d'un dépôt
// à l'instant : un seul gabarit, et une renumérotation après chaque retrait.
function _execPreuveHtml(p, numero, editable) {
    const intitule = p.intitule || p.filename || '';
    const fichier = p.filename || '';
    // Le fichier s'ouvre dans un onglet, servi sous l'intitulé de la pièce ;
    // son nom d'origine ne paraît nulle part.
    const lien = p.path
        ? `${p.path}${p.path.includes('?') ? '&' : '?'}nom=${encodeURIComponent(intitule)}`
        : '';
    const date = (p.date || '').slice(0, 10);
    return `<div class="exec-preuve" data-path="${_escAttr(p.path || '')}" data-filename="${_escAttr(fichier)}"
                 data-intitule="${_escAttr(intitule)}" data-commentaire="${_escAttr(p.commentaire || '')}"
                 data-date="${_escAttr(date)}">
        <div class="exec-preuve-tete">
            <span class="exec-preuve-num">${numero}</span>
            ${EXEC_ICONS.file}
            ${lien
                ? `<a class="exec-preuve-intitule" href="${_escAttr(lien)}" target="_blank" rel="noopener"
                       title="${te('ouvrir_piece')}">${_esc(intitule)}</a>`
                : `<span class="exec-preuve-intitule">${_esc(intitule)}</span>`}
            ${date ? `<span class="exec-preuve-date" title="${te('preuve_date')}">${_formatDate(date)}</span>` : ''}
            ${editable ? `<button type="button" class="btn btn-sm btn-outline" title="${te('modifier_piece')}"
                onclick="execPreuveModifier(this)">${EXEC_ICONS.edit}</button>
            <button type="button" class="btn btn-sm btn-danger" title="${te('supprimer') || 'Supprimer'}"
                onclick="execPreuveSupprimer(this)">${EXEC_ICONS.x}</button>` : ''}
        </div>
        <div class="exec-preuve-comm"${p.commentaire ? '' : ' hidden'}>${_esc(p.commentaire || '')}</div>
    </div>`;
}

// Reprise de l'intitulé et du commentaire d'une pièce déjà déposée.
window.execPreuveModifier = async function (bouton) {
    const ligne = bouton.closest('.exec-preuve');
    if (!ligne) return;
    const d = ligne.dataset;
    const saisie = await _execPreuveModal(d.intitule || d.filename || '', {
        titre: te('modifier_piece'),
        intitule: d.intitule || '',
        commentaire: d.commentaire || '',
        valider: te('enregistrer') || 'Enregistrer',
    });
    if (!saisie) return;
    d.intitule = saisie.intitule;
    d.commentaire = saisie.commentaire;
    const titre = ligne.querySelector('.exec-preuve-intitule');
    if (titre) {
        titre.textContent = saisie.intitule;
        if (titre.tagName === 'A' && d.path) {
            titre.href = `${d.path}${d.path.includes('?') ? '&' : '?'}nom=${encodeURIComponent(saisie.intitule)}`;
        }
    }
    const comm = ligne.querySelector('.exec-preuve-comm');
    if (comm) {
        comm.textContent = saisie.commentaire;
        comm.hidden = !saisie.commentaire;
    }
};

function _execRenumeroterPreuves(container) {
    if (!container) return;
    [...container.children].forEach((div, i) => {
        const num = div.querySelector('.exec-preuve-num');
        if (num) num.textContent = String(i + 1);
    });
}

window.execPreuveSupprimer = function (bouton) {
    const ligne = bouton.closest('.exec-preuve');
    const container = ligne && ligne.parentElement;
    if (ligne) ligne.remove();
    _execRenumeroterPreuves(container);
};

// Boîte de dialogue posée avant l'envoi : intitulé de la pièce, puis
// commentaire facultatif adressé à l'AAC. Résout à `null` si l'on renonce.
function _execPreuveModal(nomFichier, reprise) {
    return new Promise((resolve) => {
        document.getElementById('exec_preuve_modal')?.remove();
        const r = reprise || {};
        const defaut = r.intitule !== undefined && r.intitule !== ''
            ? r.intitule
            : String(nomFichier || '').replace(/\.[^.]+$/, '');
        const el = document.createElement('div');
        el.id = 'exec_preuve_modal';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';
        const fermer = (valeur) => { el.remove(); resolve(valeur); };
        el.onclick = (e) => { if (e.target === el) fermer(null); };
        el.innerHTML = `
        <div style="background:var(--bg-card,#fff);border-radius:12px;padding:1.5rem;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 1rem;font-size:1rem;font-weight:700;">${r.titre || te('preuve_dialogue_titre')}</h3>
            <div class="form-group" style="margin-bottom:0.85rem;">
                <label for="exec_preuve_intitule" style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">${te('preuve_intitule')} *</label>
                <input type="text" id="exec_preuve_intitule" class="form-input" value="${_escAttr(defaut)}" placeholder="${te('preuve_intitule_exemple')}">
            </div>
            <div class="form-group" style="margin-bottom:1.25rem;">
                <label for="exec_preuve_commentaire" style="font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;display:block;">${te('preuve_commentaire')}</label>
                <textarea id="exec_preuve_commentaire" class="form-input" rows="3" style="resize:vertical;" placeholder="${te('preuve_commentaire_aide')}">${_esc(r.commentaire || '')}</textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
                <button class="btn btn-outline" id="exec_preuve_annuler">${te('cancel') || 'Annuler'}</button>
                <button class="btn btn-primary" id="exec_preuve_ok">${r.valider || te('ajouter') || 'Ajouter'}</button>
            </div>
        </div>`;
        document.body.appendChild(el);
        const champ = el.querySelector('#exec_preuve_intitule');
        champ.focus();
        champ.select();
        el.querySelector('#exec_preuve_annuler').onclick = () => fermer(null);
        el.querySelector('#exec_preuve_ok').onclick = () => {
            const intitule = (champ.value || '').trim();
            if (!intitule) { _execToast(te('preuve_intitule_requis'), 'warning'); champ.focus(); return; }
            fermer({ intitule, commentaire: (el.querySelector('#exec_preuve_commentaire').value || '').trim() });
        };
        champ.onkeydown = (e) => { if (e.key === 'Enter') el.querySelector('#exec_preuve_ok').click(); };
    });
}

function execUploadPACProof(inputPrefix) {
    document.getElementById(`${inputPrefix}_input`)?.click();
}

async function execHandlePACProofUpload(files, containerId) {
    if (!files || files.length === 0) return;
    const container = document.getElementById(containerId);
    for (const file of files) {
        // L'intitulé est demandé avant l'envoi : renoncer n'envoie rien.
        const saisie = await _execPreuveModal(file.name);
        if (!saisie) continue;
        const formData = new FormData();
        formData.append('file', file);
        // Le serveur enregistre la pièce sous cet intitulé, non sous le nom
        // du fichier choisi sur le poste.
        formData.append('nom', saisie.intitule);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'ok' && container) {
                container.insertAdjacentHTML('beforeend', _execPreuveHtml({
                    filename: data.filename, path: data.path,
                    intitule: saisie.intitule, commentaire: saisie.commentaire,
                    date: new Date().toISOString().slice(0, 10),
                }, container.children.length + 1, true));
                _execRenumeroterPreuves(container);
            }
        } catch (e) {
            console.error('Upload PAC proof error:', e);
            _execToast((e && e.message) || 'Erreur lors du dépôt de la pièce', 'error');
        }
    }
}

// ── Per-item comment thread (Détails du suivi) ───────────────────


// ══════════════════════════════════════
//  Fiche complète d'une constatation, prête à imprimer
// ══════════════════════════════════════
// Reprend l'intégralité du dossier : identification, plan d'actions et ses
// preuves, versions antérieures, évaluation de l'AAC, commentaires, échanges.
// ══════════════════════════════════════
//  Documents imprimables du module
// ══════════════════════════════════════
// Un seul squelette pour toutes les fiches : même en-tête d'autorité, même
// typographie, mêmes règles de coupure. Les documents restent lisibles en
// noir et blanc, et les aplats de couleur s'impriment (print-color-adjust).
function _execDocStyles() {
    return `
      @page { size: A4; margin: 16mm 13mm 18mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font: 10.5pt/1.5 "Helvetica Neue", Arial, sans-serif; color: #16202c; margin: 0; }
      header.doc { display: flex; align-items: center; gap: 12px;
                   border-bottom: 2.5px solid #12406b; padding-bottom: 8px; margin-bottom: 14px; }
      header.doc .logo { height: 52px; width: auto; flex: 0 0 auto; }
      header.doc .ident { flex: 1; min-width: 0; }
      header.doc .sigle { font-size: 11pt; font-weight: 700; color: #12406b; letter-spacing: .01em; }
      header.doc .lieu { font-size: 8pt; color: #5b6b7d; }
      header.doc h1 { font-size: 14pt; margin: 4px 0 2px; letter-spacing: .01em; }
      header.doc .meta { font-size: 8pt; color: #5b6b7d; }
      header.doc .cartouche { flex: 0 0 auto; text-align: right; }
      header.doc .cartouche .ref { font: 700 11pt/1.2 ui-monospace, "SFMono-Regular", Menlo, monospace; color: #12406b; }
      header.doc .cartouche .statut {
          display: inline-block; margin-top: 3px; padding: 1.5px 7px; border-radius: 9px;
          font-size: 8pt; font-weight: 700; background: #12406b14; color: #12406b;
      }
      .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 14px;
                border: 1px solid #dde4ec; border-radius: 4px; padding: 8px 10px; margin-bottom: 10px; }
      .grille > div { min-width: 0; }
      .grille span { display: block; font-size: 7.5pt; text-transform: uppercase;
                     letter-spacing: .05em; color: #5b6b7d; }
      .grille strong { font-size: 10pt; font-weight: 600; overflow-wrap: anywhere; }
      section { margin-top: 10px; break-inside: avoid; }
      section > h2 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .06em; color: #fff;
                     background: #12406b; margin: 0 0 5px; padding: 3.5px 8px; border-radius: 3px;
                     border-left: 3px solid #0b2b48; }
      section h3 { font-size: 8pt; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d;
                   margin: 8px 0 2px; }
      section p, section ol, section ul { margin: 0; }
      section ol, section ul { padding-left: 17px; }
      section li { margin-bottom: 1.5px; }
      table.fiche { width: 100%; border-collapse: collapse; }
      table.fiche td { border-bottom: 1px solid #eef2f6; padding: 2.5px 6px 2.5px 0; vertical-align: top; }
      table.fiche tr:last-child td { border-bottom: none; }
      td.date { width: 68px; color: #5b6b7d; white-space: nowrap; }
      td.auteur { width: 120px; font-weight: 600; }
      .paire { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .encadre { border: 1px solid #dde4ec; border-radius: 4px; padding: 7px 9px; }
      .texte { white-space: pre-wrap; overflow-wrap: anywhere; }
      .vide { color: #98a5b3; }
      .etiquette { display: inline-block; padding: 1px 6px; border-radius: 9px;
                   font-size: 7.5pt; font-weight: 700; background: #0284c71f; color: #075985; }
      .crit-critique, .crit-majeure { background: #dc26261f; color: #991b1b; }
      .crit-mineure { background: #16a34a1f; color: #166534; }
      footer.doc { position: fixed; bottom: 5mm; left: 0; right: 0; font-size: 7.5pt; color: #5b6b7d;
                   border-top: 1px solid #dde4ec; padding-top: 3px; display: flex; justify-content: space-between; }
      @media print {
        section > h2 { background: #12406b !important; color: #fff !important; }
        header.doc { border-bottom-color: #12406b !important; }
      }`;
}

// En-tête d'autorité, commun à toutes les fiches.
function _execDocEntete(titre, reference, statut) {
    const aac = EXEC_STATE.data.aac || {};
    const lieu = [aac.ville, aac.pays].filter(Boolean).map(_esc).join(', ');
    return `<header class="doc">
        ${aac.logo ? `<img class="logo" src="${aac.logo}" alt="">` : ''}
        <div class="ident">
            <div class="sigle">${_esc(aac.sigle || '')}${aac.nom ? ` — ${_esc(aac.nom)}` : ''}</div>
            ${lieu ? `<div class="lieu">${lieu}</div>` : ''}
            <h1>${titre}</h1>
            <div class="meta">${te('edite_le')} ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        ${reference || statut ? `<div class="cartouche">
            ${reference ? `<div class="ref">${_esc(reference)}</div>` : ''}
            ${statut ? `<div class="statut">${_esc(statut)}</div>` : ''}
        </div>` : ''}
    </header>`;
}

// Ouvre le document dans un onglet et présente la boîte d'impression.
// Document complet, prêt à imprimer ou à rendre en PDF côté serveur.
function _execDocHtml(titreOnglet, corps) {
    const aac = EXEC_STATE.data.aac || {};
    const jour = new Date().toLocaleDateString('fr-FR');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${_esc(titreOnglet)}</title><style>${_execDocStyles()}</style></head><body>
    ${corps}
    <footer class="doc"><span>OASIS — ${_esc(aac.sigle || '')}</span><span>${_esc(titreOnglet)}</span><span>${jour}</span></footer>
    </body></html>`;
}

function _execDocOuvrir(titreOnglet, corps) {
    const html = _execDocHtml(titreOnglet, corps);
    const fenetre = window.open('', '_blank');
    if (!fenetre) { _execToast(te('bloqueur_fenetre'), 'warning'); return; }
    fenetre.document.write(html);
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 400);
}

// Petites fabriques partagées par les fiches.
const _execDocJour = (d) => (d ? _formatDate(String(d).slice(0, 10)) : '—');
const _execDocChamp = (libelle, valeur) => `<div><span>${libelle}</span><strong>${valeur || '—'}</strong></div>`;
const _execDocSection = (titre, corps) => `<section><h2>${titre}</h2>${corps || `<p class="vide">—</p>`}</section>`;
const _execDocTexte = (valeur) => (String(valeur || '').trim()
    ? `<p class="texte">${_esc(valeur)}</p>` : '<p class="vide">—</p>');
const _execDocLignes = (lignes) => (lignes.length
    ? `<table class="fiche"><tbody>${lignes.map((l) => `<tr>
            <td class="date">${l[0]}</td><td class="auteur">${_esc(l[1] || '')}</td><td>${l[2]}</td>
        </tr>`).join('')}</tbody></table>`
    : '');
const _execDocPreuves = (liste) => ((liste || []).length
    ? `<ol>${(liste || []).map((p) => `<li>${_esc(p.intitule || p.filename || '')}`
        + `${p.date ? ` <em>(${_execDocJour(p.date)})</em>` : ''}`
        + `${p.commentaire ? ` — ${_esc(p.commentaire)}` : ''}</li>`).join('')}</ol>`
    : '');

// Évaluation d'une constatation, quelle que soit sa forme de stockage.
function _execDocEvaluation(fnc) {
    let ev = fnc && fnc.commentaire_evaluation;
    if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch { ev = {}; } }
    return ev || {};
}

// Date de solde attendue : celle enregistrée, sinon ouverture + délai.
function _execDocDateDue(fnc) {
    if (fnc.date_due_cloture) return String(fnc.date_due_cloture).slice(0, 10);
    const delai = parseInt(fnc.delai_solde || fnc.delai_correction || '0', 10);
    const ouv = fnc.date_ouverture || String(fnc.date_creation || '').slice(0, 10);
    if (!delai || !ouv) return '';
    const d = new Date(ouv);
    d.setDate(d.getDate() + delai);
    return d.toISOString().slice(0, 10);
}

// ── Fiche de constat ─────────────────────────────────────────────
// Le constat lui-même : ce qui a été relevé, au regard de quoi, avec quelle
// échéance de traitement. Une page par constatation.
function _execFicheConstatCorps(fnc, dossier) {
    const ev = _execDocEvaluation(fnc);
    const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const sec = (EXEC_STATE.data.secteurs || []).find((x) => x.id === fnc.secteur_id);
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();
    const preuves = fnc.preuves_constatation || [];
    return `
    ${_execDocEntete(te('fiche_constat'), fnc.reference || '', _execStatutLisible(fnc.statut))}
    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(fnc.prestataire_nom || (dossier || {}).prestataire_nom || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(dom ? dom.nom : (fnc.domaine_id || '')))}
        ${_execDocChamp('Secteur', _esc(sec ? sec.nom : (fnc.secteur_id || '')))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('delai_label'), `${_esc(fnc.delai_solde || '—')} ${te('jours')}`)}
        ${_execDocChamp(te('date_due_label'), _execDocJour(_execDocDateDue(fnc)))}
        ${_execDocChamp(te('emis_par'), _esc(fnc.emis_par || ''))}
        ${_execDocChamp(te('adresse_a'), _esc(fnc.adresse_a || ''))}
    </div>
    ${(dossier && (dossier.reference || dossier.notification_ref)) ? `<div class="grille">
        ${_execDocChamp(te('dossier') || 'Dossier', _esc(dossier.reference || ''))}
        ${_execDocChamp('Notification', _esc(dossier.notification_ref || ''))}
        ${_execDocChamp(te('objet'), _esc(dossier.objet_activite || dossier.notification_objet || ''))}
    </div>` : ''}
    ${_execDocSection(te('ref_reglementaires_label'), _execDocTexte(fnc.ref_reglementaires || fnc.exigence_ref))}
    ${_execDocSection(te('description_constatation'), _execDocTexte(fnc.description || fnc.titre))}
    ${_execDocSection(te('recommandation'), _execDocTexte(fnc.recommandation))}
    ${_execDocSection(te('preuves'), _execDocPreuves(preuves))}
    ${ev.rejet_info ? _execDocSection(te('motif_rejet') || 'Motif de rejet', _execDocTexte(ev.rejet_info.motif)) : ''}`;
}

function execFicheConstatPdf(fncId) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const fnc = (dossier.constatations || []).find((c) => c.id === fncId)
        || (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
    if (!fnc) { _execToast(te('no_data'), 'warning'); return; }
    _execDocOuvrir(`${te('fiche_constat')} — ${fnc.reference || ''}`,
        _execFicheConstatCorps(fnc, dossier));
}

// Toutes les constatations d'un dossier, une fiche par page.
function execFichesConstatDossier(dossierId) {
    const dossier = EXEC_STATE.selectedDossier || {};
    const liste = dossier.constatations || [];
    if (!liste.length) { _execToast(te('no_data'), 'info'); return; }
    const corps = liste.map((c, i) => `<div${i ? ' style="page-break-before:always;"' : ''}>`
        + `${_execFicheConstatCorps(c, dossier)}</div>`).join('');
    _execDocOuvrir(`${te('fiches_constat')} — ${dossier.reference || dossierId}`, corps);
}

// ── Fiche de suivi (plan d'actions correctives) ──────────────────
// Le traitement de la constatation : plan retenu, preuves, évaluation de
// l'AAC et échanges de suivi. Se lit à la suite de la fiche de constat.
async function execExporterFncPdf(fncId) {
    let fnc;
    try {
        fnc = await api(`${EXEC_MODULE_API}/constatations/${fncId}`);
    } catch (e) {
        console.error('Export FNC :', e);
        _execToast((e && e.message) || 'Erreur lors de la préparation du document', 'error');
        return;
    }
    if (!fnc) return;

    const ev = _execDocEvaluation(fnc);
    const anac = ev.evaluation_anac || {};
    const acceptation = anac.acceptation || {};
    const verif = anac.verification || {};
    const cloture = anac.cloture || {};
    const pac = (fnc.actions_correctives || [])[0] || {};
    const dom = (EXEC_STATE.data.domaines || []).find((d) => d.id === fnc.domaine_id || d.code === fnc.domaine_id);
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();

    const commentaires = [
        ...Object.entries(ev.items_comments || {}).flatMap(([cle, l]) => (l || []).map((x) => ({
            date: x.date, auteur: x.auteur, items: [cle === 'cause_primaire' ? 'cause' : cle], texte: x.texte,
        }))),
        ...(ev.suivi_commentaires || []).filter((x) => x.publie),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const corps = `
    ${_execDocEntete(te('fiche_suivi_pac'), fnc.reference || '', _execStatutLisible(fnc.statut))}
    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(fnc.prestataire_nom || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(dom ? dom.nom : (fnc.domaine_id || '')))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('date_due_label'), _execDocJour(_execDocDateDue(fnc)))}
        ${_execDocChamp(te('date_solde'), _execDocJour(cloture.date_solde || fnc.date_solde))}
    </div>

    ${_execDocSection(te('description_constatation'), _execDocTexte(fnc.description || fnc.titre))}

    ${_execDocSection(te('plan_actions_correctives'), `
        <h3>${te('cause_root')}</h3>${_execDocTexte(pac.cause_primaire)}
        <h3>${te('action_curative_correction')}${pac.curative_date_prevue
            ? ` — ${te('date_prevue')} : ${_execDocJour(pac.curative_date_prevue)}` : ''}</h3>
        ${_execDocTexte(pac.action_curative)}
        ${_execDocPreuves(pac.curative_preuves)}
        <h3>${te('action_corrective_prevention')}${pac.corrective_date_prevue
            ? ` — ${te('date_prevue')} : ${_execDocJour(pac.corrective_date_prevue)}` : ''}</h3>
        ${_execDocTexte(pac.actions_correctives)}
        ${_execDocPreuves(pac.corrective_preuves)}`)}

    ${_execDocSection(te('evaluation_suivi_aac'), `
        <div class="paire">
            <div class="encadre">
                <h3 style="margin-top:0;">${te('acceptation_propositions')}</h3>
                <p>${te('pac_accepte')} : <strong>${acceptation.accepte === 'OUI' ? te('oui_label') : '—'}</strong>${
                    acceptation.date ? ` · ${te('date_acceptation')} ${_execDocJour(acceptation.date)}` : ''}</p>
                <p>${te('verifier_terrain')} : <strong>${verif.verification_terrain ? te('oui_label') : te('non_label')}</strong></p>
                <h3>${te('preuves_recueillies')}</h3>
                ${_execDocPreuves(verif.preuves_mise_oeuvre) || '<p class="vide">—</p>'}
            </div>
            <div class="encadre">
                <h3 style="margin-top:0;">${te('cloture_fnc')}</h3>
                <p>${te('mise_oeuvre_effective')} : <strong>${cloture.mise_en_oeuvre_effective === 'OUI' ? te('oui_label') : '—'}</strong></p>
                <p>${te('date_solde')} : ${_execDocJour(cloture.date_solde || fnc.date_solde)}</p>
                <p>${te('solde_par')} : ${_esc(cloture.solde_par || '—')}</p>
            </div>
        </div>
        <h3>${te('commentaire_general_suivi')}</h3>
        ${_execDocLignes((verif.suivis || []).map((x) => [_execDocJour(x.date), x.auteur, _esc(x.texte || '')]))
            || '<p class="vide">—</p>'}`)}

    ${_execDocSection(te('details_suivi'), _execDocLignes(commentaires.map((c) => [
        _execDocJour(c.date), c.auteur,
        `${(c.items || []).map((k) => `<span class="etiquette">${_esc(k === 'autres'
            ? (c.precision || te('motif_autres')) : te(`item_${k}`))}</span>`).join(' ')} ${_esc(c.texte || '')}`,
    ])))}`;

    _execDocOuvrir(`${te('fiche_suivi_pac')} — ${fnc.reference || ''}`, corps);
}

// Libellé lisible d'un statut de constatation.
function _execStatutLisible(statut) {
    const cle = String(statut || '');
    const libelle = te(cle);
    return libelle && libelle !== cle ? libelle : cle;
}

// ══════════════════════════════════════
//  Échanges AAC ↔ prestataire sur une constatation
// ══════════════════════════════════════
// Même présentation que la négociation de l'étape Confirmation : fil de
// bulles, réponse en bas. Sans le volet d'accord, propre à l'activité.
function _execEchangesPacHtml(echanges, fncId, verrouille) {
    const moi = (EXEC_STATE.user || {}).username || '';
    const fil = (echanges || []).map((e, i) => {
        const aMoi = e.auteur_id && e.auteur_id === moi;
        const suivant = echanges[i + 1];
        const dernierDuGroupe = !(suivant && suivant.auteur_id === e.auteur_id);
        const initiales = ((e.auteur_prenom || 'U')[0] + ((e.auteur_nom || '')[0] || '')).toUpperCase();
        const nom = `${_esc(e.auteur_prenom || '')} ${_esc(e.auteur_nom || '')}`.trim();
        const avatar = !aMoi
            ? `<div class="exchange-avatar"${dernierDuGroupe ? '' : ' style="visibility:hidden;"'}>${initiales}</div>`
            : '';
        return `<div class="exchange-bubble-row ${aMoi ? 'self' : 'other'}">
            ${avatar}
            <div class="exchange-bubble">
                <div class="exchange-bubble-body">${_esc(String(e.contenu || '').trim())}</div>
            </div>
        </div>
        ${dernierDuGroupe ? `<div class="exchange-bubble-time ${aMoi ? 'self' : 'other'}">
            <span class="exchange-bubble-auteur">${nom || (e.auteur_type === 'aac' ? te('aac_label') || 'AAC' : '—')}</span>
            <span>${_formatDatetime(e.date_creation)}</span>
        </div>` : ''}`;
    }).join('');

    return `<div class="exchange-chat discussions-chat" id="exec_pac_echanges">
        ${echanges && echanges.length ? fil
            : `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1.25rem 0;">${te('no_data')}</p>`}
    </div>
    ${verrouille ? '' : `<div class="exchange-reply">
        <label>${te('repondre')}</label>
        <div class="exchange-reply-row">
            <textarea class="form-input" id="exec_pac_echange_msg" rows="1" placeholder="${te('votre_message')}"
                      style="resize:none;overflow:hidden;min-height:2.2rem;line-height:1.4;"
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"></textarea>
            <button class="btn btn-primary" onclick="execEnvoyerEchangePac('${fncId}')">
                ${EXEC_ICONS.send} ${te('envoyer')}
            </button>
        </div>
    </div>`}`;
}

// Repère de lecture : dernier passage du compte dans le fil de la
// constatation. Un message d'autrui postérieur est réputé non lu.
function _execPacCleLecture(fncId) {
    const u = (EXEC_STATE.user || {}).username || 'anonyme';
    return `pac_echanges_lu_${fncId}_${u}`;
}

function _execPacNonLus(fncId, echanges) {
    const moi = (EXEC_STATE.user || {}).username || '';
    const repere = localStorage.getItem(_execPacCleLecture(fncId)) || '';
    return (echanges || []).filter((e) => e.auteur_id !== moi
        && String(e.date_creation || '') > repere).length;
}

// Bouton du bandeau + tiroir des discussions, à la place de la croix.
function _execPacInstallerDiscussions(fncId, echanges, verrouille) {
    const entete = document.querySelector('#execSlider .exec-slider-header');
    if (!entete) return;
    entete.querySelector('.exec-slider-close')?.remove();
    entete.querySelector('.exec-pac-discussions')?.remove();

    const nonLus = _execPacNonLus(fncId, echanges);
    const bouton = document.createElement('button');
    bouton.className = `exec-pac-discussions${nonLus ? ' alerte' : ''}`;
    bouton.type = 'button';
    bouton.title = te('discussions');
    bouton.innerHTML = `${EXEC_ICONS.send} <span>${te('discussions')}</span>
        ${nonLus ? `<span class="exec-pac-discussions-pastille">${nonLus}</span>`
            : (echanges || []).length ? `<span class="exec-pac-discussions-compte">${echanges.length}</span>` : ''}`;
    bouton.onclick = () => execPacDiscussionsOuvrir(fncId);
    entete.appendChild(bouton);

    // Tiroir : glisse de la droite, sur le tiers de la largeur.
    document.getElementById('execPacTiroir')?.remove();
    const tiroir = document.createElement('div');
    tiroir.id = 'execPacTiroir';
    tiroir.className = 'exec-pac-tiroir';
    tiroir.innerHTML = `<div class="exec-pac-tiroir-tete">
            <span>${te('discussions')}</span>
            <button type="button" onclick="execPacDiscussionsFermer()" title="${te('close')}">${EXEC_ICONS.close}</button>
        </div>
        <div class="exec-pac-tiroir-corps">${_execEchangesPacHtml(echanges, fncId, verrouille)}</div>`;
    document.body.appendChild(tiroir);
    // Bord supérieur calé sur celui du formulaire, quelle que soit la hauteur
    // du bandeau de l'application.
    const volet = document.getElementById('execSlider');
    if (volet) tiroir.style.top = `${Math.round(volet.getBoundingClientRect().top)}px`;
}

window.execPacDiscussionsOuvrir = function (fncId) {
    const tiroir = document.getElementById('execPacTiroir');
    if (!tiroir) return;
    tiroir.classList.add('ouvert');
    // Tout est lu à l'ouverture : le bouton reprend sa couleur.
    localStorage.setItem(_execPacCleLecture(fncId), new Date().toISOString());
    const bouton = document.querySelector('.exec-pac-discussions');
    if (bouton) {
        bouton.classList.remove('alerte');
        bouton.querySelector('.exec-pac-discussions-pastille')?.classList.add('exec-pac-discussions-compte');
        bouton.querySelector('.exec-pac-discussions-pastille')?.classList.remove('exec-pac-discussions-pastille');
    }
    const fil = tiroir.querySelector('.exchange-chat');
    if (fil) fil.scrollTop = fil.scrollHeight;
    tiroir.querySelector('#exec_pac_echange_msg')?.focus();
};

window.execPacDiscussionsFermer = function () {
    document.getElementById('execPacTiroir')?.classList.remove('ouvert');
};

async function execEnvoyerEchangePac(fncId) {
    const zone = document.getElementById('exec_pac_echange_msg');
    const contenu = (zone && zone.value || '').trim();
    if (!contenu) return;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/echanges`, {
            method: 'POST',
            body: JSON.stringify({ contenu }),
        });
        zone.value = '';
        await execOpenPACSlider(fncId);
        execPacDiscussionsOuvrir(fncId);          // le tiroir reste ouvert
    } catch (e) {
        console.error('Envoi échange PAC :', e);
        _execToast((e && e.message) || 'Erreur lors de l\'envoi du message', 'error');
    }
}

// ══════════════════════════════════════
//  Commentaires de suivi (volet droit du formulaire PAC)
// ══════════════════════════════════════
// Champs du plan pouvant faire l'objet d'un commentaire, plus « Autres ».
// Rédaction réservée à l'AAC ; le prestataire lit.
const EXEC_PAC_ITEMS_COMMENTABLES = [
    'cause', 'action_curative', 'date_curative', 'preuves_curative',
    'action_corrective', 'date_corrective', 'preuves_corrective',
];

// `modifiable` : commentaire encore au brouillon, non transmis au prestataire.
// `rang` numérote les suivis transmis au postulant — 0 pour un brouillon,
// qui n'en porte pas encore. `deplie` n'est vrai que pour le dernier : les
// précédents se consultent d'un clic sur leur en-tête.
function _execCommentaireSuiviHtml(c, modifiable, rang, deplie) {
    const items = (c.items || []).map((k) => (k === 'autres'
        ? (c.precision || te('motif_autres')) : te(`item_${k}`)));
    const brouillon = !c.publie;
    const fichiers = c.fichiers || [];
    return `<div class="exec-suivi-comm${brouillon ? ' brouillon' : ''}${deplie ? '' : ' replie'}" data-date="${_escAttr(c.date || '')}" data-auteur="${_escAttr(c.auteur || '')}"
                 data-items="${_escAttr((c.items || []).join(','))}" data-precision="${_escAttr(c.precision || '')}"
                 data-texte="${_escAttr(c.texte || '')}" data-publie="${c.publie ? '1' : ''}"
                 data-fichiers="${_escAttr(JSON.stringify(fichiers))}">
        <div class="exec-suivi-comm-tete" onclick="execSuiviCommToggle(this)">
            <span class="exec-suivi-comm-chevron">${EXEC_ICONS.chevronDown}</span>
            <strong>${rang ? `${te('suivi_rang')} ${rang}` : _esc(c.auteur || '')}</strong>
            <span>
                ${rang ? `<em class="exec-suivi-auteur">${_esc(c.auteur || '')}</em>` : ''}
                ${brouillon ? `<em class="exec-suivi-brouillon">${te('non_transmis')}</em>` : ''}
                ${c.date ? _formatDate(String(c.date).slice(0, 10)) : ''}
                ${modifiable && brouillon ? `<button type="button" class="exec-suivi-action" title="${te('modifier')}"
                        onclick="event.stopPropagation();execModifierCommentaireSuivi(this)">${EXEC_ICONS.edit}</button>
                    <button type="button" class="exec-suivi-action exec-suivi-supprimer" title="${te('supprimer')}"
                        onclick="event.stopPropagation();execSupprimerCommentaireSuivi(this)">${EXEC_ICONS.x}</button>` : ''}
            </span>
        </div>
        <div class="exec-suivi-comm-corps">
            <div class="exec-suivi-comm-items">${items.map((l) => `<span>${_esc(l)}</span>`).join('')}</div>
            <div class="exec-suivi-comm-texte">${_esc(c.texte || '')}</div>
            ${fichiers.length ? `<div class="exec-suivi-comm-pj">${fichiers.map((f) => `
                <a href="${_escAttr(f.path || '')}?nom=${encodeURIComponent(f.filename || '')}" target="_blank" rel="noopener">
                    ${EXEC_ICONS.file} ${_esc(f.filename || '')}</a>`).join('')}</div>` : ''}
        </div>
    </div>`;
}

// Un suivi se replie et se déplie d'un clic sur son en-tête.
window.execSuiviCommToggle = function (tete) {
    tete.closest('.exec-suivi-comm')?.classList.toggle('replie');
}

// Reprise d'un commentaire non transmis : il repart dans le composeur.
window.execModifierCommentaireSuivi = function (bouton) {
    const bloc = bouton.closest('.exec-suivi-comm');
    const composeur = document.querySelector('.exec-suivi-composeur');
    if (!bloc || !composeur) return;
    const items = (bloc.dataset.items || '').split(',').filter(Boolean);
    composeur.querySelectorAll('.exec-suivi-items input').forEach((i) => {
        i.checked = items.includes(i.value);
    });
    const p = document.getElementById('pac_suivi_precision');
    if (p) p.value = bloc.dataset.precision || '';
    const t = document.getElementById('pac_suivi_texte');
    if (t) t.value = bloc.dataset.texte || '';
    // Les pièces du brouillon repartent avec lui dans le composeur.
    const pj = document.getElementById('pac_suivi_pj_liste');
    if (pj) {
        pj.innerHTML = '';
        let fichiers = [];
        try { fichiers = JSON.parse(bloc.dataset.fichiers || '[]'); } catch { fichiers = []; }
        fichiers.forEach((f) => {
            const ligne = document.createElement('span');
            ligne.className = 'exec-suivi-pj-item';
            ligne.dataset.path = f.path || '';
            ligne.dataset.filename = f.filename || '';
            ligne.innerHTML = `${EXEC_ICONS.file} ${_esc(f.filename || '')}
                <button type="button" title="${te('supprimer')}"
                        onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            pj.appendChild(ligne);
        });
    }
    bloc.remove();
    execSuiviItemsChange();
    if (t) t.focus();
};

window.execSupprimerCommentaireSuivi = function (bouton) {
    if (!confirm(te('confirm_supprimer_commentaire'))) return;
    const liste = document.getElementById('pac_suivi_liste');
    bouton.closest('.exec-suivi-comm')?.remove();
    if (liste && !liste.querySelector('.exec-suivi-comm')) {
        liste.innerHTML = `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_commentaire')}</em>`;
    }
};

// Les commentaires en attente deviennent visibles du prestataire dès que
// l'AAC rend une décision : ils ne sont alors plus modifiables.
function _execPublierCommentairesSuivi(evalData) {
    (evalData.suivi_commentaires || []).forEach((c) => { c.publie = true; });
    return evalData;
}

// Le commentaire ne s'ouvre qu'une fois l'item désigné ; « Autres » réclame
// sa précision.
// Intitulé porté par une case du composeur.
function _execSuiviLibelleItem(cle) {
    return cle === 'autres' ? te('motif_autres') : te(`item_${cle}`);
}

// Les lignes inscrites par les cases se reconnaissent à leur numérotation ;
// ce que l'AAC écrit à leur suite est du texte libre, jamais renuméroté.
const EXEC_SUIVI_LIGNE = /^\s*\d+\.\s/;

// La numérotation suit l'ordre des choix, sans trou : cocher ajoute une ligne,
// décocher retire la sienne, et les lignes restantes se renumérotent.
function _execSuiviRenumeroter(zone) {
    let n = 0;
    zone.value = zone.value.split('\n').map((ligne) => (EXEC_SUIVI_LIGNE.test(ligne)
        ? ligne.replace(EXEC_SUIVI_LIGNE, () => `${++n}. `)
        : ligne)).join('\n');
}

// ── Teinte des « Résultats du Suivi » ────────────────────────────
// La couleur de la section dit où en est la constatation, d'un coup d'œil :
//   PAC refusé                       rouge clair
//   PAC accepté                      orange
//   … et vérification sur le terrain vert clair
//   … et mise en oeuvre effective    vert foncé (comme une clôture)
function execPacTeinteResultats() {
    const section = document.getElementById('exec_resultats_suivi');
    if (!section) return;
    const coche = (id) => !!document.getElementById(id)?.checked;
    const accepte = coche('anac_pac_accepte');
    const effective = coche('anac_mise_effective');
    const soldee = (EXEC_STATE.selectedConstatation || {}).statut === 'soldee';
    const etat = (!accepte && 'refuse')
        || ((effective || soldee) && 'clos')
        || (coche('anac_verif_terrain') && 'terrain')
        || 'accepte';
    section.classList.remove('teinte-refuse', 'teinte-accepte', 'teinte-terrain', 'teinte-clos');
    section.classList.add(`teinte-${etat}`);
}

function execSuiviItemsChange(caseCochee) {
    const composeur = document.querySelector('.exec-suivi-composeur');
    if (!composeur) return;
    const coches = [...composeur.querySelectorAll('.exec-suivi-items input:checked')];
    const autres = document.getElementById('pac_suivi_autres');
    const precision = document.getElementById('pac_suivi_precision');
    if (precision) precision.hidden = !(autres && autres.checked);
    const pret = coches.length > 0;
    const texte = document.getElementById('pac_suivi_texte');
    const bouton = document.getElementById('pac_suivi_ajouter');
    if (texte) {
        texte.disabled = !pret;
        texte.placeholder = pret ? te('suivi_saisir_commentaire') : te('suivi_choisir_item');
    }
    if (bouton) bouton.disabled = !pret;

    // L'item choisi s'inscrit dans la saisie : l'AAC n'a plus qu'à commenter.
    if (texte && caseCochee) {
        const libelle = _execSuiviLibelleItem(caseCochee.value);
        if (caseCochee.checked) {
            const fin = texte.value.replace(/\s+$/, '');
            texte.value = `${fin}${fin ? '\n' : ''}0. ${libelle} : `;
        } else {
            // Décocher retire la ligne de l'item — sauf si l'AAC y a déjà écrit :
            // ses mots priment sur la case.
            const marque = new RegExp(`^\\s*\\d+\\.\\s*${libelle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:(.*)$`);
            texte.value = texte.value.split('\n')
                .filter((l) => { const m = marque.exec(l); return !m || m[1].trim(); })
                .join('\n');
        }
        _execSuiviRenumeroter(texte);
        if (caseCochee.checked) {
            texte.focus();
            texte.setSelectionRange(texte.value.length, texte.value.length);
        }
    }
}

function execAjouterCommentaireSuivi() {
    const composeur = document.querySelector('.exec-suivi-composeur');
    const liste = document.getElementById('pac_suivi_liste');
    if (!composeur || !liste) return;
    const items = [...composeur.querySelectorAll('.exec-suivi-items input:checked')].map((i) => i.value);
    const texte = (document.getElementById('pac_suivi_texte')?.value || '').trim();
    const precision = (document.getElementById('pac_suivi_precision')?.value || '').trim();
    if (!items.length || !texte) return;
    if (items.includes('autres') && !precision) {
        _execToast(te('motif_manquant'), 'warning');
        document.getElementById('pac_suivi_precision')?.focus();
        return;
    }
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    liste.querySelector('.exec-suivi-vide')?.remove();
    liste.insertAdjacentHTML('beforeend', _execCommentaireSuiviHtml({
        date: new Date().toISOString().slice(0, 10), auteur, items, precision, texte,
        fichiers: _execSuiviFichiersDeposes(), publie: false,
    }, true, 0, true));
    liste.querySelectorAll('.exec-suivi-comm:not(:last-child)')
        .forEach((c) => c.classList.add('replie'));
    liste.scrollTop = liste.scrollHeight;
    // Le composeur repart à zéro pour le commentaire suivant.
    composeur.querySelectorAll('.exec-suivi-items input:checked').forEach((i) => { i.checked = false; });
    const p = document.getElementById('pac_suivi_precision');
    if (p) { p.value = ''; p.hidden = true; }
    const t = document.getElementById('pac_suivi_texte');
    if (t) t.value = '';
    const pj = document.getElementById('pac_suivi_pj_liste');
    if (pj) pj.innerHTML = '';
    execSuiviItemsChange();
}

// Pièces déposées dans le composeur, en attente d'être portées au commentaire.
function _execSuiviFichiersDeposes() {
    return [...document.querySelectorAll('#pac_suivi_pj_liste [data-path]')].map((e) => ({
        filename: e.dataset.filename || '', path: e.dataset.path || '',
    }));
}

async function execSuiviJoindreFichiers(input) {
    const liste = document.getElementById('pac_suivi_pj_liste');
    if (!liste || !input.files || !input.files.length) return;
    for (const fichier of [...input.files]) {
        const formData = new FormData();
        formData.append('file', fichier);
        formData.append('nom', fichier.name);
        try {
            const res = await fetch(`${EXEC_MODULE_API}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('pr_token') || ''}` },
                body: formData,
            });
            const data = await res.json();
            if (data.status !== 'ok') throw new Error(data.error || 'Téléversement refusé');
            const ligne = document.createElement('span');
            ligne.className = 'exec-suivi-pj-item';
            ligne.dataset.path = data.path;
            ligne.dataset.filename = data.filename;
            ligne.innerHTML = `${EXEC_ICONS.file} ${_esc(data.filename)}
                <button type="button" title="${te('supprimer')}"
                        onclick="this.parentElement.remove()">${EXEC_ICONS.x}</button>`;
            liste.appendChild(ligne);
        } catch (e) {
            console.error('Pièce jointe du suivi :', e);
            _execToast(`${fichier.name} : ${(e && e.message) || 'téléversement impossible'}`, 'error');
        }
    }
    input.value = '';
}

function _collectCommentairesSuivi() {
    const liste = document.getElementById('pac_suivi_liste');
    if (!liste) return null;
    return [...liste.querySelectorAll('.exec-suivi-comm')].map((d) => ({
        date: d.dataset.date || '',
        auteur: d.dataset.auteur || '',
        items: (d.dataset.items || '').split(',').filter(Boolean),
        precision: d.dataset.precision || '',
        texte: d.dataset.texte || '',
        fichiers: (() => { try { return JSON.parse(d.dataset.fichiers || '[]'); } catch { return []; } })(),
        publie: !!d.dataset.publie,
    })).filter((c) => c.texte);
}

// ── Commentaires généraux de suivi (AAC) ─────────────────────────
// Chaque suivi porte sa date et le nom de qui l'a enregistré.
function _execSuiviHtml(s, modifiable) {
    return `<div class="exec-suivi" data-date="${_escAttr(s.date || '')}" data-auteur="${_escAttr(s.auteur || '')}" data-texte="${_escAttr(s.texte || '')}">
        <div class="exec-suivi-tete">
            <strong>${_esc(s.auteur || '')}</strong>
            <span>
                ${s.date ? _formatDate(String(s.date).slice(0, 10)) : ''}
                ${modifiable ? `<button type="button" class="exec-suivi-action" title="${te('modifier')}"
                        onclick="execModifierSuivi(this)">${EXEC_ICONS.edit}</button>
                    <button type="button" class="exec-suivi-action exec-suivi-supprimer" title="${te('supprimer')}"
                        onclick="execSupprimerSuivi(this)">${EXEC_ICONS.x}</button>` : ''}
            </span>
        </div>
        <div>${_esc(s.texte || '')}</div>
    </div>`;
}

// Un suivi reste amendable tant que la constatation n'est pas clôturée.
window.execModifierSuivi = function (bouton) {
    const bloc = bouton.closest('.exec-suivi');
    const zone = document.getElementById('anac_suivi_saisie');
    if (!bloc || !zone) return;
    zone.value = bloc.dataset.texte || '';
    bloc.remove();
    zone.focus();
};

window.execSupprimerSuivi = function (bouton) {
    if (!confirm(te('confirm_supprimer_commentaire'))) return;
    const liste = document.getElementById('anac_suivis_list');
    bouton.closest('.exec-suivi')?.remove();
    if (liste && !liste.querySelector('.exec-suivi')) {
        liste.innerHTML = `<em class="exec-suivi-vide" style="color:var(--text-muted);font-size:0.75rem;">${te('aucun_suivi')}</em>`;
    }
};

function execAjouterSuivi() {
    const zone = document.getElementById('anac_suivi_saisie');
    const texte = (zone && zone.value || '').trim();
    if (!texte) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'Utilisateur';
    const liste = document.getElementById('anac_suivis_list');
    if (!liste) return;
    liste.querySelector('.exec-suivi-vide')?.remove();       // retire « aucun suivi »
    liste.insertAdjacentHTML('beforeend', _execSuiviHtml({
        date: new Date().toISOString().slice(0, 10), auteur, texte,
    }, true));
    zone.value = '';
    liste.scrollTop = liste.scrollHeight;
}

function _collectSuivis() {
    const liste = document.getElementById('anac_suivis_list');
    if (!liste) return null;
    return [...liste.querySelectorAll('.exec-suivi')].map((d) => ({
        date: d.dataset.date || '', auteur: d.dataset.auteur || '', texte: d.dataset.texte || '',
    })).filter((s) => s.texte);
}

function _collectEvaluationANAC() {
    // Ce que l'écran ne porte plus (isolement, traitement des risques, prononcé
    // sur les preuves) reste tel qu'enregistré : la saisie ne l'efface pas.
    const ancienne = ((EXEC_STATE.selectedConstatation?.commentaire_evaluation || {}).evaluation_anac) || {};
    const coche = (id) => (document.getElementById(id)?.checked ? 'OUI' : '');
    return {
        acceptation: {
            ...(ancienne.acceptation || {}),
            accepte: coche('anac_pac_accepte'),
            date: document.getElementById('anac_date_acceptation')?.value || ''
        },
        verification: {
            ...(ancienne.verification || {}),
            suivis: _collectSuivis() || (ancienne.verification || {}).suivis || [],
            preuves_mise_oeuvre: _collectProofsFromContainer('anac_preuves_mise_oeuvre_list'),
            verification_terrain: !!document.getElementById('anac_verif_terrain')?.checked,
        },
        cloture: {
            ...(ancienne.cloture || {}),
            mise_en_oeuvre_effective: coche('anac_mise_effective'),
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
        // Le fil de commentaires reprend les échanges de l'ancienne table :
        // ils y sont repris à l'affichage, la table n'a plus lieu d'être.
        suivi_commentaires: _collectCommentairesSuivi() || prevObj.suivi_commentaires || [],
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
            corrective_preuves: _collectProofsFromContainer('pac_corrective_preuves_list'),
            // Motifs d'amendement : ceux affichés à l'écran s'ils existent —
            // un brouillon les conserve, même incomplets —, sinon ceux déjà
            // enregistrés avec le plan.
            motifs_amendement: _execPacMotifsSaisis()
                || (EXEC_STATE.selectedConstatation?.actions_correctives || [{}])[0]?.motifs_amendement || null,
        }]
    };
}

// Motifs tels qu'affichés, sans exiger qu'ils soient complets : c'est ce
// qu'un enregistrement en brouillon doit retenir. `null` hors amendement.
function _execPacMotifsSaisis() {
    if (!document.getElementById(`motif_sel_${EXEC_PAC_CHAMPS_SUIVIS[0].cle}`)) return null;
    const motifs = {};
    EXEC_PAC_CHAMPS_SUIVIS.forEach((champ) => {
        const sel = document.getElementById(`motif_sel_${champ.cle}`);
        const bloc = document.getElementById(`motif_bloc_${champ.cle}`);
        if (!sel || !bloc || !bloc.classList.contains('visible')) return;
        const motif = sel.value || '';
        if (!motif) return;
        const precision = ((document.getElementById(`motif_txt_${champ.cle}`) || {}).value || '').trim();
        motifs[champ.cle] = { motif, precision: motif === 'motif_autres' ? precision : '' };
    });
    return motifs;
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
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
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

// ── Étape Mise en oeuvre (prestataire) ───────────────────────────
// Choix du mode d'écriture. Un second clic sur le même bouton le referme.
// Les deux modes se cumulent : chaque bouton ouvre ou referme le sien.
// Renoncer à l'amendement rend le plan à sa version acceptée — y compris ce
// qu'un enregistrement en brouillon avait déjà écrit. Les preuves déposées
// entre-temps ne relèvent pas de l'amendement : elles sont conservées.
async function execPacModeEdition(fncId, mode) {
    const courants = (EXEC_STATE.pacMode && EXEC_STATE.pacMode.fncId === fncId)
        ? (EXEC_STATE.pacMode.modes || []) : [];
    const actif = courants.includes(mode);
    if (!actif && mode === 'amendement') await _execPacAssurerEmpreinte(fncId);
    if (actif && mode === 'amendement') {
        if (!confirm(te('confirm_quitter_amendement'))) return;
        await _execPacRetablirPlanAccepte(fncId);
    }
    const modes = actif ? courants.filter((m) => m !== mode) : courants.concat([mode]);
    EXEC_STATE.pacMode = modes.length ? { fncId, modes } : null;
    execOpenPACSlider(fncId);
}

// Empreinte du plan accepté : posée à l'acceptation depuis cette version du
// module. Les constatations acceptées auparavant n'en ont pas — on la prend
// alors à l'entrée en amendement, avant toute modification : le plan en base
// est encore celui que l'AAC a accepté.
async function _execPacAssurerEmpreinte(fncId) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    if (fnc.id !== fncId || fnc.statut !== 'pac_valide') return;
    if (((fnc.pac_accepte || {}).actions_correctives || []).length) return;
    const empreinte = { date: new Date().toISOString(), actions_correctives: fnc.actions_correctives || [] };
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ pac_accepte: empreinte }),
        });
        fnc.pac_accepte = empreinte;             // disponible sans attendre le rechargement
        await execRefreshDynamic();
    } catch (e) {
        console.error('Empreinte du plan accepté :', e);
    }
}

// Remet les champs amendables à leur valeur acceptée et efface les motifs.
async function _execPacRetablirPlanAccepte(fncId) {
    const fnc = EXEC_STATE.selectedConstatation || {};
    const accepte = ((fnc.pac_accepte || {}).actions_correctives || [])[0];
    if (!accepte) return;                       // aucune empreinte : rien à rendre
    const courant = (fnc.actions_correctives || [])[0] || {};
    const divergent = EXEC_PAC_CHAMPS_SUIVIS
        .some((c) => String(courant[c.cle] || '').trim() !== String(accepte[c.cle] || '').trim());
    if (!divergent && !courant.motifs_amendement) return;

    // Le plan revient à l'accepté ; les pièces jointes du moment demeurent.
    const rendu = { ...courant };
    EXEC_PAC_CHAMPS_SUIVIS.forEach((c) => { rendu[c.cle] = accepte[c.cle] || ''; });
    rendu.motifs_amendement = null;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ actions_correctives: [rendu] }),
        });
        _execToast(te('plan_retabli'), 'success');
        await execRefreshDynamic();
    } catch (e) {
        console.error('Rétablissement du plan accepté :', e);
        _execToast((e && e.message) || 'Erreur lors du rétablissement du plan', 'error');
    }
}

// Soumission depuis l'étape Mise en oeuvre.
//   preuves    : le plan reste tel quel, seules les preuves partent ; le
//                circuit demeure à « Mise en oeuvre ».
//   amendement : le plan est rouvert ; l'acceptation tombe et le circuit
//                revient à « Acceptation ». L'ancien plan est versionné.
async function execSoumettreMiseEnOeuvre(fncId, mode) {
    const amendement = mode === 'amendement';

    // Amendement : tout champ divergent de la version acceptée doit porter son
    // motif. Sans quoi la soumission ne part pas.
    let motifsAmendement = null;
    if (amendement) {
        const { motifs, manquants } = _execPacMotifs();
        if (manquants.length) {
            // Chaque motif absent est encerclé de rouge ; le premier reçoit le
            // curseur.
            document.querySelectorAll('.exec-pac-manquant')
                .forEach((e) => e.classList.remove('exec-pac-manquant'));
            manquants.forEach((m) => {
                const champ = document.getElementById(m.motif === 'motif_autres'
                    ? `motif_txt_${m.champ.cle}` : `motif_sel_${m.champ.cle}`);
                if (champ) champ.classList.add('exec-pac-manquant');
            });
            const premier = manquants[0];
            const cible = document.getElementById(premier.motif === 'motif_autres'
                ? `motif_txt_${premier.champ.cle}` : `motif_sel_${premier.champ.cle}`);
            if (cible) { cible.scrollIntoView({ block: 'center' }); cible.focus(); }
            _execToast(`${te('motif_manquant')} : ${manquants.map((m) => te(m.champ.libelle)).join(', ')}`, 'warning');
            return;
        }
        motifsAmendement = motifs;
    }

    if (!confirm(amendement ? te('confirm_soumettre_amendement') : te('confirm_soumettre_preuves'))) return;

    const pac = _collectPACData();
    if (amendement && pac.actions_correctives[0]) {
        pac.actions_correctives[0].motifs_amendement = motifsAmendement;
    }
    const evalData = _collectFullEvalData();
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || '';
    const aujourdhui = new Date().toISOString().slice(0, 10);

    try {
        if (amendement) {
            // L'acceptation est remise en jeu : le serveur la vide et archive
            // le plan précédent. Le bandeau de dépôt de preuves n'a plus cours.
            delete evalData.preuves_info;
            delete evalData.rejet_info;
            evalData.submit_info = { date: aujourdhui, auteur, motif: te('pac_amende') };
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-pac`, {
                method: 'PUT',
                body: JSON.stringify({ actions_correctives: pac.actions_correctives, evaluation: evalData, amendement: true }),
            });
            _execToast(te('pac_amende_soumis'), 'success');
        } else {
            evalData.preuves_info = { date: aujourdhui, auteur };
            // De nouvelles preuves annulent le refus précédent.
            delete evalData.preuves_refus;
            const anacP = evalData.evaluation_anac || (evalData.evaluation_anac = {});
            if ((anacP.verification || {}).preuves_acceptees === 'NON') {
                anacP.verification = { ...anacP.verification, preuves_acceptees: '' };
            }
            await api(`${EXEC_MODULE_API}/constatations/${fncId}/submit-preuves`, {
                method: 'PUT',
                body: JSON.stringify({ actions_correctives: pac.actions_correctives, evaluation: evalData }),
            });
            _execToast(te('preuves_soumises'), 'success');
        }
        EXEC_STATE.pacMode = null;
        await execRefreshDynamic();
        const maj = (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
        if (maj) EXEC_STATE.selectedConstatation = maj;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Soumission mise en oeuvre error:', e);
        _execToast((e && e.message) || 'Erreur lors de la soumission', 'error');
    }
}

// ── Étape Mise en oeuvre : prononcé de l'AAC sur les preuves ─────
// Refus : le circuit reste à la mise en oeuvre, un bandeau rouge porte le
// motif, et le prestataire reprend la main pour déposer de nouvelles preuves.
function execPreuvesNonAcceptables(fncId) {
    _execCommentModal(te('preuves_non_acceptables'), '#dc2626', async (motif) => {
        const user = EXEC_STATE.user || {};
        const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
        const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
        const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
        anac.verification = { ...(anac.verification || {}), preuves_acceptees: 'NON' };
        evalData.preuves_refus = { date: new Date().toISOString().slice(0, 10), auteur, motif };
        delete evalData.preuves_info;
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ commentaire_evaluation: evalData }),
            });
            _execToast(te('preuves_refusees'), 'success');
            await execRefreshDynamic();
            execOpenPACSlider(fncId);
        } catch (e) {
            console.error('Refus des preuves :', e);
            _execToast((e && e.message) || 'Erreur lors du refus des preuves', 'error');
        }
    });
}

// Acceptation : l'étape « Mise en oeuvre » se ferme et la clôture s'ouvre.
// Si l'AAC a coché « À vérifier sur le terrain », un bandeau l'annonce.
async function execAccepterPreuves(fncId) {
    const terrain = !!document.getElementById('anac_verif_terrain')?.checked;
    if (!confirm(terrain ? te('confirm_accepter_preuves_terrain') : te('confirm_accepter_preuves'))) return;
    const user = EXEC_STATE.user || {};
    const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
    anac.verification = {
        ...(anac.verification || {}),
        preuves_acceptees: 'OUI',
        verification_terrain: terrain,
        date_acceptation_preuves: new Date().toISOString().slice(0, 10),
        acceptees_par: auteur,
    };
    delete evalData.preuves_refus;
    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
            method: 'PUT',
            body: JSON.stringify({ commentaire_evaluation: evalData }),
        });
        _execToast(te('preuves_acceptees_ok'), 'success');
        await execRefreshDynamic();
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Acceptation des preuves :', e);
        _execToast((e && e.message) || 'Erreur lors de l\'acceptation des preuves', 'error');
    }
}

// Annuler : les saisies non enregistrées sont abandonnées et le formulaire se
// recharge tel qu'il est en base. Il ne se referme pas.
function execAnnulerSaisiePAC(fncId) {
    if (!confirm(te('confirm_annuler_saisie'))) return;
    execOpenPACSlider(fncId);
}

// Étape Clôture : l'AAC rend la main au prestataire en rouvrant la mise en
// oeuvre — l'acceptation des preuves est retirée, le motif est consigné.
function execRenvoyerMiseEnOeuvre(fncId) {
    _execCommentModal(te('renvoyer_mise_oeuvre'), '#dc2626', async (motif) => {
        const user = EXEC_STATE.user || {};
        const auteur = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || user.username || 'AAC';
        const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
        const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
        anac.verification = {
            ...(anac.verification || {}),
            preuves_acceptees: '', date_acceptation_preuves: '', acceptees_par: '',
        };
        anac.cloture = { ...(anac.cloture || {}), mise_en_oeuvre_effective: '' };
        evalData.retour_mise_oeuvre = { date: new Date().toISOString().slice(0, 10), auteur, motif };
        try {
            await api(`${EXEC_MODULE_API}/constatations/${fncId}`, {
                method: 'PUT',
                body: JSON.stringify({ commentaire_evaluation: evalData }),
            });
            _execToast(te('renvoye_mise_oeuvre'), 'success');
            await execRefreshDynamic();
            execOpenPACSlider(fncId);
        } catch (e) {
            console.error('Renvoi à la mise en oeuvre :', e);
            _execToast((e && e.message) || 'Erreur lors du renvoi', 'error');
        }
    });
}

// ── Accepter le PAC (AAC) ────────────────────────────────────────
// `avecPreuves` = faux : seul le plan d'actions est accepté ; l'étape
// « Mise en oeuvre » s'ouvre et attend les preuves.
// `avecPreuves` = vrai : plan et preuves acceptés d'un même geste ; les deux
// étapes se ferment et le circuit se présente à la clôture.
async function execAccepterPAC(fncId, avecPreuves) {
    const question = avecPreuves ? te('confirm_accepter_pac_preuves') : te('confirm_accepter_pac');
    if (!confirm(question)) return;

    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
    const anac = evalData.evaluation_anac || (evalData.evaluation_anac = {});
    const aujourdhui = new Date().toISOString().slice(0, 10);

    anac.acceptation = { ...(anac.acceptation || {}), accepte: 'OUI' };
    if (!anac.acceptation.date) anac.acceptation.date = aujourdhui;

    if (avecPreuves) {
        const user = EXEC_STATE.user || {};
        anac.verification = {
            ...(anac.verification || {}),
            preuves_acceptees: 'OUI',
            date_acceptation_preuves: aujourdhui,
            acceptees_par: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username || 'AAC',
        };
    }
    // Le plan est accepté : la mention de renvoi n'a plus lieu d'être.
    delete evalData.rejet_info;

    try {
        await api(`${EXEC_MODULE_API}/constatations/${fncId}/validate-pac`, {
            method: 'PUT',
            body: JSON.stringify({ evaluation: evalData }),
        });
        _execToast(avecPreuves ? te('pac_preuves_acceptes') : te('pac_accepte_ok'), 'success');
        await execRefreshDynamic();
        const maj = (EXEC_STATE.data.constatations || []).find((c) => c.id === fncId);
        if (maj) EXEC_STATE.selectedConstatation = maj;
        execOpenPACSlider(fncId);
    } catch (e) {
        console.error('Accepter PAC error:', e);
        _execToast((e && e.message) || 'Erreur lors de l\'acceptation du PAC', 'error');
    }
}

// ── Solder la Constatation (AAC) ─────────────────────────────────
async function execCloseFNC(fncId) {
    if (!confirm(te('confirm_solder'))) return;
    const evalData = _execPublierCommentairesSuivi(_collectFullEvalData());
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
    // « RAPPORT D’AUDIT » mais « RAPPORT DE SUIVI » : la liaison suit l'initiale.
    const nature = natureActivite.toUpperCase();
    const intituleRapport = _execIntituleRapport(dossier,
        `RAPPORT ${/^[AEIOUYÀÂÉÈÊËÎÏÔÖÙÛÜ]/.test(nature) ? 'D’' : 'DE '}${nature}`);
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
            <div class="doc-hdr-title">${_esc(intituleRapport)}</div>
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
            <div class="doc-hdr-title">${_esc(intituleRapport)}</div>
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
    const crit = String(fnc.criticite || fnc.gravite || '').toLowerCase();
    // Zone à remplir à la main : quelques lignes réglées, ou une seule ligne.
    const zone = (lignes) => `<div class="a-remplir" style="min-height:${lignes * 7}mm;"></div>`;
    const ligne = () => `<div class="a-remplir" style="min-height:7mm;"></div>`;
    const rubrique = (libelle, contenu) => `<div class="rubrique">
        <div class="rubrique-titre">${libelle}</div>${contenu}</div>`;
    const cocher = (libelle) => `<div class="case"><span class="carre"></span>${libelle}</div>`;

    const corps = `
    ${_execDocEntete(title, fnc.reference || '', _execStatutLisible(fnc.statut))}

    <div class="grille">
        ${_execDocChamp(te('provider'), _esc(prestName || ''))}
        ${_execDocChamp(te('domaine_label'), _esc(domaineName || ''))}
        ${_execDocChamp(te('criticite_label'), `<span class="etiquette crit-${_escAttr(crit)}">${_esc(fnc.criticite || fnc.gravite || '—')}</span>`)}
        ${_execDocChamp(te('date_ouverture'), _execDocJour(fnc.date_ouverture || fnc.date_creation))}
        ${_execDocChamp(te('delai_label'), `${_esc(fnc.delai_solde || fnc.delai_correction || '—')} ${te('jours')}`)}
        ${_execDocChamp(te('date_due_label'), dateDue ? _execDocJour(dateDue) : '—')}
    </div>

    ${_execDocSection(`1. ${te('rappel_constatation')}`, `
        <h3>${te('ref_reglementaires_label')}</h3>
        ${_execDocTexte(fnc.ref_reglementaires || fnc.exigence_ref)}
        <h3>${te('description_constatation')}</h3>
        ${_execDocTexte(fnc.description || fnc.titre)}
        ${String(fnc.recommandation || '').trim() ? `<h3>${te('recommandation')}</h3>${_execDocTexte(fnc.recommandation)}` : ''}`)}

    ${showSection2 ? _execDocSection(
        `2. ${te('plan_actions_correctives')} <span class="mention">${te('a_completer_prestataire')}</span>`, `
        ${rubrique(te('item_cause'), zone(3))}
        ${rubrique(te('item_action_curative'), zone(3))}
        <div class="paire">
            ${rubrique(te('item_date_curative'), ligne())}
            ${rubrique(te('item_preuves_curative'), ligne())}
        </div>
        ${rubrique(te('item_action_corrective'), zone(3))}
        <div class="paire">
            ${rubrique(te('item_date_corrective'), ligne())}
            ${rubrique(te('item_preuves_corrective'), ligne())}
        </div>
        <div class="visa">
            <div><span>${te('visa_prestataire')}</span></div>
            <div><span>${te('date')}</span></div>
        </div>`) : ''}

    ${showSection3 ? _execDocSection(
        `3. ${te('evaluation_suivi_aac')}`, `
        <div class="paire">
            <div class="encadre">
                <h3 style="margin-top:0;">${te('acceptation_propositions')}</h3>
                ${cocher(te('pac_accepte'))}
                ${rubrique(te('date_acceptation'), ligne())}
            </div>
            <div class="encadre">
                <h3 style="margin-top:0;">${te('cloture_fnc')}</h3>
                ${cocher(te('mise_oeuvre_effective'))}
                <div class="paire">
                    ${rubrique(te('date_solde'), ligne())}
                    ${rubrique(te('solde_par'), ligne())}
                </div>
            </div>
        </div>
        ${rubrique(te('preuves_recueillies'), zone(2))}
        ${cocher(te('verifier_terrain'))}
        ${rubrique(te('commentaire_general_suivi'), zone(4))}
        <div class="visa">
            <div><span>${te('visa_inspecteur')}</span></div>
            <div><span>${te('date')}</span></div>
        </div>`) : ''}`;

    const stylesFiche = `
      .mention { text-transform: none; letter-spacing: 0; font-weight: 500; opacity: .85; }
      .rubrique { margin-top: 6px; }
      .rubrique-titre { font-size: 8pt; text-transform: uppercase; letter-spacing: .04em;
                        color: #5b6b7d; margin-bottom: 2px; }
      .a-remplir { border: 1px solid #c9d3de; border-radius: 3px; background:
                   repeating-linear-gradient(to bottom, transparent 0 6.5mm, #eef2f6 6.5mm 6.6mm); }
      .case { display: flex; align-items: center; gap: 6px; margin: 4px 0; font-size: 9.5pt; }
      .case .carre { width: 11px; height: 11px; border: 1.2px solid #5b6b7d; border-radius: 2px; flex: 0 0 auto; }
      .visa { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 12px; break-inside: avoid; }
      .visa div { border-top: 1px solid #98a5b3; padding-top: 3px; height: 18mm; }
      .visa span { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .04em; color: #5b6b7d; }`;

    const impression = forWord ? ''
        : `<script>window.onload=()=>{setTimeout(()=>window.print(),400)};<\/script>`;
    const jour = new Date().toLocaleDateString('fr-FR');
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
    <title>${_esc(title)} — ${_esc(fnc.reference || '')}</title>
    <style>${_execDocStyles()}${stylesFiche}</style></head><body>
    ${corps}
    <footer class="doc"><span>OASIS — ${_esc((aac || {}).sigle || '')}</span><span>${_esc(title)} · ${_esc(fnc.reference || '')}</span><span>${jour}</span></footer>
    ${impression}
    </body></html>`;
}

// ── Téléchargement d'un document Word (.doc) composé en HTML ──
// Le module s'affiche dans une iframe, où le téléchargement d'une URL blob:
// est ignoré sans message selon le navigateur. Le document est donc posté au
// serveur, qui le renvoie en pièce jointe : une réponse HTTP ordinaire, que
// tous les navigateurs enregistrent.
// Enveloppe qui fait ouvrir un document HTML par Word.
function _execHtmlVersWord(html) {
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
        + String(html).replace(/^<!DOCTYPE[^>]*>/i, '').replace(/^<html[^>]*>/i, '');
}

async function _execDownloadAsWord(html, filename) {
    const wordHtml = _execHtmlVersWord(html);
    try {
        const reponse = await fetch(`${EXEC_MODULE_API}/documents/word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-OASIS-Request': '1' },
            body: JSON.stringify({ nom: filename, contenu: wordHtml }),
        });
        // 404 : la route n'est pas montée — serveur à redémarrer.
        if (reponse.status === 404) throw new Error(te('export_route_absente'));
        if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
        const { jeton } = await reponse.json();
        // Réponse en pièce jointe : la page courante n'est pas quittée.
        window.location.href = `${EXEC_MODULE_API}/documents/word/${jeton}`;
    } catch (e) {
        console.error('Export Word :', e);
        _execToast((e && e.message) || 'Erreur lors du téléchargement', 'error');
    }
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
            <div class="doc-title">${_esc(_execIntituleRapport(dossier, 'RAPPORT DE SURVEILLANCE'))}</div>
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
    const newLabel = 'Ajouter Utilisateur';
    const searchPh = 'Rechercher';
    return `
    <div class="page-content">
        <div class="portal-page-header" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
            <h2 style="margin:0;">${_esc(title)}</h2>
            <div class="portal-page-actions" style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" class="shell-input" id="mesUsersSearch" placeholder="${_escAttr(searchPh)}" oninput="_pesSearchInput(this, execRenderMesUsersTable)" style="min-width:200px;">
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
        utilisateur: 'Utilisateur',
        email: 'Courriel (identifiant)',
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

    el.innerHTML = `<div class="card"><div class="exec-etats-corps exec-mes-users" style="padding:0 0.75rem 0.75rem;overflow-x:auto;">
      <table class="exec-data-table exec-compact-table exec-etats-table"
        style="font-size:0.8rem;table-layout:fixed;min-width:900px;">
        <thead><tr>
            <th style="width:200px;">${L.utilisateur}</th>
            <th style="width:230px;">${L.email}</th>
            <th style="width:120px;">${L.motDePasse}</th>
            <th style="width:160px;">${L.role}</th>
            <th style="width:110px;">${L.droits}</th>
            <th style="width:90px;">${L.statut}</th>
            <th style="width:110px;text-align:center;">${L.actions}</th>
        </tr></thead>
        <tbody>${users.map(u => {
            const actif = u.actif !== false && u.actif !== 0;
            const droits = u.droits || [];
            const nomComplet = [u.prenom, u.nom].filter(Boolean).join(' ');
            return `<tr class="${!actif ? 'row-inactive' : ''}">
                <td><strong>${_esc(nomComplet || u.nom_utilisateur || u.username || '—')}</strong></td>
                <td class="exec-mes-users-mail">${_esc(u.email || '')}</td>
                <td class="exec-mes-users-pw">
                    <span id="mes-pw-mask-${u.id}" style="font-family:monospace;letter-spacing:2px;">••••••••</span>
                    <span id="mes-pw-clear-${u.id}" style="display:none;font-family:monospace;font-weight:600;color:var(--primary);"></span>
                    ${u.has_temp_password ? `<button class="shell-btn-icon" onclick="execRevealMesUserPassword('${u.id}')" title="${L.voir}">${EXEC_ICONS.eye}</button>` : ''}
                </td>
                <td><span class="shell-badge badge-active">${_esc(libelleRole(u.role))}</span></td>
                <td title="${_escAttr(droits.map(libelleDroit).join(', '))}">
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
    const titre = userId ? 'Modifier l’utilisateur' : 'Ajouter Utilisateur';
    const droitsCoches = user ? (user.droits || []) : _mesDroitsCache.map(d => d.cle);
    const roleCourant = (user && user.role) || 'PRESTATAIRE';

    const roles = _mesRolesCache.length ? _mesRolesCache : [
        { cle: 'ADMIN_PRESTATAIRE', libelle: 'Administrateur du prestataire', aide: '' },
        { cle: 'PRESTATAIRE', libelle: 'Utilisateur du prestataire', aide: '' },
    ];

    const body = `
        <div class="shell-form-row">
            <div class="shell-form-group"><label>Courriel</label>
                <input id="muEmail" class="shell-input" type="email" value="${_escAttr(user?.email || '')}"
                    placeholder="prenom.nom@prestataire.bj">
                <small class="shell-hint">Le courriel sert d’identifiant de connexion.</small>
            </div>
            <div class="shell-form-group"><label>Nom</label>
                <input id="muNom" class="shell-input" value="${_escAttr(user?.nom || '')}">
            </div>
        </div>
        <div class="shell-form-row">
            <div class="shell-form-group"><label>Prénom</label>
                <input id="muPrenom" class="shell-input" value="${_escAttr(user?.prenom || '')}">
            </div>
            <div class="shell-form-group"><label>Statut</label>
                <select id="muActif" class="shell-input">
                    <option value="true" ${user?.actif !== false && user?.actif !== 0 ? 'selected' : ''}>Actif</option>
                    <option value="false" ${user?.actif === false || user?.actif === 0 ? 'selected' : ''}>Inactif</option>
                </select>
            </div>
        </div>
        <div class="shell-form-group"><label>Rôle</label>
            <select id="muRole" class="shell-input">
                ${roles.map(r => `<option value="${r.cle}" ${r.cle === roleCourant ? 'selected' : ''}>${_esc(r.libelle)}</option>`).join('')}
            </select>
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
    const email = document.getElementById('muEmail')?.value.trim() || '';
    const data = {
        // Le courriel fait l'identifiant : un seul champ, une seule vérité.
        nom_utilisateur: email,
        email,
        nom: document.getElementById('muNom')?.value.trim() || '',
        prenom: document.getElementById('muPrenom')?.value.trim() || '',
        actif: document.getElementById('muActif')?.value === 'true',
        role: document.getElementById('muRole')?.value || 'PRESTATAIRE',
        droits: [...document.querySelectorAll('.mu-droit:checked')].map(c => c.value),
    };
    if (!data.email) {
        shellShowToast((typeof pt === 'function' ? pt('required_field') : 'Champs obligatoires manquants'), 'error');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        shellShowToast('Courriel invalide', 'error');
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

// ── Paramètre « Équipe d'audit / inspection » ────────────────────────
// Les rôles créés ici alimentent la composition de l'équipe à l'étape
// Réalisation, et les acteurs « équipe » du menu Processus : une seule liste,
// tenue à un seul endroit.
const EXEC_ROLES_EQUIPE_DEFAUT = [
    "Chef d'équipe", "Membre d'équipe", 'Stagiaire',
    "Formation en cours d'emploi", 'Experts ou Autres',
];

// Rôles disponibles : ceux du paramétrage, ou la liste d'origine tant que rien
// n'a été saisi — un module fraîchement installé ne doit pas offrir un choix vide.
function _execRolesEquipe() {
    const liste = (EXEC_STATE.data.rolesEquipe || [])
        .filter(r => r.actif !== 0 && r.actif !== false)
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
        .map(r => r.item || r.libelle || '')
        .filter(Boolean);
    return liste.length ? liste : EXEC_ROLES_EQUIPE_DEFAUT;
}

function execRenderRolesEquipeTab() {
    const roles = (EXEC_STATE.data.rolesEquipe || [])
        .slice().sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const isAdmin = _execIsAdmin();
    const lignes = roles.length ? roles.map(r => `
        <tr>
            <td style="text-align:center;">${r.ordre || ''}</td>
            <td><strong>${_esc(r.item || '')}</strong></td>
            <td>${_esc(r.description || '')}</td>
            <td style="text-align:right;white-space:nowrap;">
                ${isAdmin ? `
                    <button class="btn btn-sm btn-ghost" title="${te('modifier')}" onclick="execOpenRoleEquipeModal('${r.id}')">${EXEC_ICONS.edit}</button>
                    <button class="btn btn-sm btn-ghost" style="color:#ef4444;" title="${te('supprimer')}" onclick="execDeleteRoleEquipe('${r.id}')">${EXEC_ICONS.delete}</button>` : ''}
            </td>
        </tr>`).join('')
        : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1rem;">${te('roles_equipe_vide')}</td></tr>`;

    return `
    <div class="card" style="margin-top:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;padding:0.5rem 0.7rem;border-bottom:1px solid var(--border);">
            <h3 style="margin:0;font-size:0.9rem;">${te('param_equipe')}</h3>
            ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="execOpenRoleEquipeModal()">${EXEC_ICONS.add} ${te('ajouter')}</button>` : ''}
        </div>
        <p style="padding:0.5rem 0.7rem 0;font-size:0.78rem;color:var(--text-muted);margin:0;">${te('roles_equipe_intro')}</p>
        <div style="overflow-x:auto;">
            <table class="exec-table" style="width:100%;">
                <thead><tr>
                    <th style="width:70px;text-align:center;">${te('ordre')}</th>
                    <th>${te('item')}</th>
                    <th>${te('description')}</th>
                    <th style="width:90px;"></th>
                </tr></thead>
                <tbody>${lignes}</tbody>
            </table>
        </div>
    </div>`;
}

window.execOpenRoleEquipeModal = function (id) {
    const r = (EXEC_STATE.data.rolesEquipe || []).find(x => x.id === id) || {};
    const corps = `
    <div class="exec-proc-bloc">
        <label class="form-label" for="req_item">${te('item')}</label>
        <input type="text" class="form-control" id="req_item" value="${_escAttr(r.item || '')}">
        <label class="form-label" for="req_ordre">${te('ordre')}</label>
        <input type="number" class="form-control" id="req_ordre" min="1" value="${_escAttr(r.ordre || ((EXEC_STATE.data.rolesEquipe || []).length + 1))}">
        <label class="form-label" for="req_description">${te('description')}</label>
        <textarea class="form-control" id="req_description" rows="2">${_esc(r.description || '')}</textarea>
        <p class="exec-proc-erreur" id="req_erreur"></p>
    </div>`;
    const pied = `
        <button class="btn btn-outline" onclick="execCloseSlider()">${te('cancel') || 'Annuler'}</button>
        <button class="btn btn-primary" onclick="execSaveRoleEquipe('${id || ''}')">${EXEC_ICONS.check || ''} ${te('save')}</button>`;
    execShowSlider(`${EXEC_ICONS.add || ''} ${id ? te('modifier') : te('ajouter')} — ${te('param_equipe')}`, corps, pied, 'third');
};

window.execSaveRoleEquipe = async function (id) {
    const val = (x) => (document.getElementById(x) || {}).value || '';
    const err = document.getElementById('req_erreur');
    const item = val('req_item').trim();
    if (!item) { err.textContent = te('item_requis'); return; }
    const corps = { item, ordre: parseInt(val('req_ordre'), 10) || 1, description: val('req_description').trim(), actif: 1 };
    try {
        if (id) await api(`${EXEC_MODULE_API}/exec-roles-equipe/${id}`, { method: 'PUT', body: JSON.stringify(corps) });
        else await api(`${EXEC_MODULE_API}/exec-roles-equipe`, { method: 'POST', body: JSON.stringify(corps) });
        execCloseSlider();
        await execChargerRolesEquipe();
        _execToast(te('enregistre'), 'success');
        execRenderPage();
    } catch (e) {
        err.textContent = (e && e.message) || te('action_impossible');
    }
};

window.execDeleteRoleEquipe = async function (id) {
    const r = (EXEC_STATE.data.rolesEquipe || []).find(x => x.id === id) || {};
    const ok = await execProcConfirmer({
        titre: te('supprimer'),
        message: te('role_equipe_supprimer_message').replace('{item}', r.item || ''),
        libelle: te('supprimer'),
    });
    if (!ok) return;
    try {
        await api(`${EXEC_MODULE_API}/exec-roles-equipe/${id}`, { method: 'DELETE' });
        await execChargerRolesEquipe();
        _execToast(te('supprime'), 'success');
        execRenderPage();
    } catch (e) {
        _execToast((e && e.message) || te('action_impossible'), 'error');
    }
};

async function execChargerRolesEquipe() {
    try { EXEC_STATE.data.rolesEquipe = await api(`${EXEC_MODULE_API}/exec-roles-equipe`) || []; }
    catch (e) { EXEC_STATE.data.rolesEquipe = []; }
}
window.execChargerRolesEquipe = execChargerRolesEquipe;
window.execRenderRolesEquipeTab = execRenderRolesEquipeTab;
window._execRolesEquipe = _execRolesEquipe;

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

// Filtre de recherche de la liste des checklists. Conservé hors du rendu pour
// survivre au re-rendu de la page (thème, langue, retour d'un sous-écran).
let EXEC_CL_RECHERCHE = '';

// Une ligne par checklist. La description passe sous le nom : elle se lit en
// entier au lieu d'être tronquée à 80 caractères dans sa propre colonne, et la
// place ainsi libérée sert à montrer la portée réelle de la checklist.
function _execClLigne(c, D, refs, isAdmin) {
    const _parse = v => { try { return JSON.parse(v || '[]'); } catch { return []; } };
    const itemsCount = D.items.filter(i => i.checklist_id === c.id).length;
    // Portée : on nomme ce qui tient, on compte le reste. Une checklist sans
    // portée s'applique partout — le dire vaut mieux qu'un tiret.
    const puce = (ids, source, classe) => {
        const noms = ids.map(id => {
            const x = source.find(s => s.id === id);
            return x ? (x.code || x.sigle || x.nom || x.libelle || '') : '';
        }).filter(Boolean);
        if (!noms.length) return '';
        const visibles = noms.slice(0, 3).map(n => `<span class="exec-cl-puce ${classe}">${_escAttr(n)}</span>`).join('');
        const reste = noms.length - 3;
        return visibles + (reste > 0
            ? `<span class="exec-cl-puce ${classe}" title="${_escAttr(noms.slice(3).join(', '))}">+${reste}</span>` : '');
    };
    const portee = [
        puce(_parse(c.domaines_ids), refs.domaines, 'dom'),
        puce(_parse(c.secteurs_ids), refs.secteurs, 'sec'),
        puce(_parse(c.sous_activites_ids), refs.sousActivites, 'sa'),
    ].filter(Boolean).join('');

    return `<tr>
        <td><span class="exec-cl-ref">${_esc(c.reference || '—')}</span></td>
        <td>
            <div class="exec-cl-nom">${_esc(c.nom)}</div>
            ${c.description ? `<div class="exec-cl-desc">${_esc(c.description)}</div>` : ''}
        </td>
        <td>${portee || '<span class="exec-cl-partout">Toutes portées</span>'}</td>
        <td style="text-align:center;">
            <span class="exec-cl-compte ${itemsCount ? '' : 'vide'}"
                  title="${itemsCount} item${itemsCount > 1 ? 's' : ''}">${itemsCount}</span>
        </td>
        <td class="exec-etats-actions" style="text-align:right;white-space:nowrap;">
            <button class="btn btn-sm btn-outline btn-icon-only" onclick="execOpenChecklistEditor('${c.id}')"
                    title="Items de la checklist">${EXEC_ICONS.list}</button>
            ${isAdmin ? `<button class="btn btn-sm btn-outline btn-icon-only" onclick="execOpenChecklistModal('${c.id}')"
                    title="${_escAttr(te('modifier') || 'Modifier')}">${EXEC_ICONS.edit}</button>
            <button class="btn btn-sm btn-outline btn-icon-only" onclick="execDeleteChecklist('${c.id}')"
                    style="color:#dc2626;border-color:#dc2626;" title="Supprimer">${EXEC_ICONS.delete}</button>` : ''}
        </td>
    </tr>`;
}

function execRenderChecklistsTab() {
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const D = _execCl_data();
    const shared = window.PESSCO?.sharedData || {};
    const refs = {
        domaines: shared.domaines || [],
        secteurs: shared.secteurs || [],
        sousActivites: shared.sousActivites || [],
    };
    const q = _execNorm(EXEC_CL_RECHERCHE);
    const toutes = D.checklists.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const checklists = q
        ? toutes.filter(c => _execNorm(`${c.reference || ''} ${c.nom || ''} ${c.description || ''}`).includes(q))
        : toutes;

    const rowsHtml = checklists.length
        ? checklists.map(c => _execClLigne(c, D, refs, isAdmin)).join('')
        : `<tr><td colspan="5" class="exec-cl-aucune">
             ${q ? `Aucune checklist ne correspond à « ${_esc(EXEC_CL_RECHERCHE)} ».`
                 : 'Aucune checklist enregistrée.'}
           </td></tr>`;

    return `
        <div class="card exec-cl-card">
            <div class="exec-cl-entete">
                <div class="exec-cl-titre">
                    <h3>Checklists</h3>
                    <span class="exec-cl-total">${toutes.length}</span>
                </div>
                <div class="exec-cl-outils">
                    <div class="exec-cl-recherche">
                        ${EXEC_ICONS.search}
                        <input type="text" id="clRecherche" placeholder="Rechercher une checklist…"
                               value="${_escAttr(EXEC_CL_RECHERCHE)}" oninput="execClRechercher(this.value)">
                    </div>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline" onclick="execOpenStatutsManager()"
                            title="Statuts d'évaluation des items">${EXEC_ICONS.settings} Statuts</button>` : ''}
                    ${isAdmin ? `<button class="btn btn-sm btn-primary" onclick="execOpenChecklistModal()">
                            ${EXEC_ICONS.add} Ajouter</button>` : ''}
                </div>
            </div>
            <div style="overflow-x:auto;">
                <table class="exec-table exec-cl-table">
                    <thead><tr>
                        <th style="width:118px;">Réf.</th>
                        <th style="width:36%;">Checklist</th>
                        <th style="width:auto;">Portée</th>
                        <th style="text-align:center;width:66px;">Items</th>
                        <th style="text-align:right;width:126px;">Actions</th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>`;
}

// La recherche ne redessine que le corps du tableau : re-rendre la page
// entière ferait perdre le curseur à chaque frappe.
function execClRechercher(valeur) {
    EXEC_CL_RECHERCHE = valeur || '';
    const corps = document.querySelector('.exec-cl-table tbody');
    if (!corps) return;
    const isAdmin = (EXEC_STATE.user?.role_m3 === 'M3_Administrateur');
    const D = _execCl_data();
    const shared = window.PESSCO?.sharedData || {};
    const refs = {
        domaines: shared.domaines || [],
        secteurs: shared.secteurs || [],
        sousActivites: shared.sousActivites || [],
    };
    const q = _execNorm(EXEC_CL_RECHERCHE);
    const liste = D.checklists.slice()
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .filter(c => !q || _execNorm(`${c.reference || ''} ${c.nom || ''} ${c.description || ''}`).includes(q));
    corps.innerHTML = liste.length
        ? liste.map(c => _execClLigne(c, D, refs, isAdmin)).join('')
        : `<tr><td colspan="5" class="exec-cl-aucune">Aucune checklist ne correspond à « ${_esc(EXEC_CL_RECHERCHE)} ».</td></tr>`;
}
window.execClRechercher = execClRechercher;

// « Tout / Aucun » d'une grille de cases : cocher un domaine à la fois pour
// dire « tout le domaine » est le geste le plus fréquent du paramétrage.
function _clBoutonsPortee(classe, suite) {
    return `<span class="exec-cl-portee-actions">
        <a href="#" onclick="_clCocherPortee('${classe}',true,'${suite}');return false;">Tout</a>
        <a href="#" onclick="_clCocherPortee('${classe}',false,'${suite}');return false;">Aucun</a>
    </span>`;
}

function _clCocherPortee(classe, valeur, suite) {
    document.querySelectorAll('.' + classe).forEach((c) => { c.checked = valeur; });
    if (suite && typeof window[suite] === 'function') window[suite]();
}
window._clCocherPortee = _clCocherPortee;

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
                <input id="clRef" class="shell-input" value="${_escAttr(item?.reference || '')}" placeholder="ex. CHK-001">
            </div>
            <div class="shell-form-group">
                <label>Nom *</label>
                <input id="clNom" class="shell-input" value="${_escAttr(item?.nom || '')}" placeholder="Nom de la checklist">
            </div>
        </div>
        <div class="shell-form-group">
            <label>Description</label>
            <textarea id="clDesc" class="shell-input" rows="2">${_esc(item?.description || '')}</textarea>
        </div>
        <p class="exec-proc-note" style="margin:.2rem 0 .6rem;">
            La portée se resserre de gauche à droite : les secteurs proposés découlent des
            domaines cochés, les sous-activités des secteurs. Ne rien cocher rend la
            checklist applicable partout.
        </p>
        <div class="shell-form-group">
            <label>Domaines applicables ${_clBoutonsPortee('cl-doms-cb', '_clRefreshSecteurs')}</label>
            <div id="clDomsBox" style="${boxStyle}" onchange="_clRefreshSecteurs()">
                ${domaines.map(d => checkbox(d.id, selDom, (d.code || d.sigle || d.nom || '?'), 'cl-doms-cb')).join('') || '<span style="color:var(--text-muted);font-size:0.75rem;">Aucun domaine</span>'}
            </div>
        </div>
        <div class="shell-form-group">
            <label>Secteurs applicables <span id="clSecsHint" style="color:var(--text-muted);font-size:0.7rem;font-weight:400;"></span>
                ${_clBoutonsPortee('cl-secs-cb', '_clRefreshSousActivites')}</label>
            <div id="clSecsBox" style="${boxStyle}" onchange="_clRefreshSousActivites()"></div>
        </div>
        <div class="shell-form-group">
            <label>Sous-activités applicables <span id="clSasHint" style="color:var(--text-muted);font-size:0.7rem;font-weight:400;"></span>
                ${_clBoutonsPortee('cl-sas-cb', '')}</label>
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
                <div class="exec-cli-ident">
                    <button class="btn btn-sm btn-outline btn-icon-only" onclick="execCloseChecklistEditor()"
                            title="Fermer">${EXEC_ICONS.back}</button>
                    <div>
                        <div class="exec-cli-surtitre">
                            Checklist${cl.reference ? ` · <span class="exec-cl-ref">${_esc(cl.reference)}</span>` : ''}
                        </div>
                        <div class="exec-cli-titre">${_esc(cl.nom || '')}</div>
                    </div>
                    <span class="exec-cl-compte" id="execCliCompte"
                          title="Items de la checklist">${D.items.filter(i => i.checklist_id === clId).length}</span>
                </div>
                <div class="exec-cli-actions">
                    <span id="execCliSaveState" class="exec-cli-etat"></span>
                    <button class="btn btn-sm btn-outline btn-icon-only" onclick="execChecklistExportXlsx('${clId}')"
                            title="Exporter la checklist en Excel">${EXEC_ICONS.download}</button>
                    <button class="btn btn-sm btn-outline btn-icon-only" title="Importer des items depuis Excel"
                            onclick="document.getElementById('execCliImportFile').click()">${EXEC_ICONS.upload}</button>
                    <input type="file" id="execCliImportFile" accept=".xlsx" style="display:none" onchange="execChecklistImportXlsx('${clId}', event)">
                    <button class="btn btn-sm btn-outline" onclick="execOpenSousThemesManager('${clId}')"
                            title="Gérer les sous-thèmes de cette checklist">${EXEC_ICONS.layers} Sous-thèmes</button>
                    <button class="btn btn-sm btn-primary" onclick="execAddChecklistRow('${clId}')">
                        ${EXEC_ICONS.add} Ajouter une ligne</button>
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
                            <th style="width:44px;"></th>
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
        .exec-cli-slicer-header { display:flex; align-items:center; justify-content:space-between; padding:0.7rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-card); gap:0.5rem; flex-wrap:wrap; }
        .exec-cli-ident { display:flex; align-items:center; gap:0.6rem; min-width:0; }
        .exec-cli-surtitre { font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
        .exec-cli-titre { font-weight:700; font-size:1rem; line-height:1.25; }
        .exec-cli-actions { display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap; }
        .exec-cli-etat { font-size:0.75rem; color:var(--text-muted); min-width:0; }
        .exec-cli-slicer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
        .exec-cli-inline-table { width:100%; border-collapse:collapse; font-size:0.78rem; }
        .exec-cli-inline-table tbody tr:nth-child(even) { background:rgba(100,116,139,0.045); }
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
        .exec-cli-inline-table .row-delete { background:transparent; border:none; cursor:pointer; color:#ef4444; line-height:0; padding:0.3rem; border-radius:4px; }
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

    // Le compteur de l'entête suit les ajouts et suppressions faits ici.
    const compteur = document.getElementById('execCliCompte');
    if (compteur) compteur.textContent = items.length;
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
            <td><button class="row-delete" title="Supprimer l'item"
                onclick="execDeleteChecklistItemInline('${it.id}','${clId}')">${EXEC_ICONS.delete}</button></td>
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
            <input id="critItem" class="shell-input" value="${_escAttr(c?.item || '')}" placeholder="Critique / Majeure / Mineure">
        </div>
        <div class="shell-form-group">
            <label>Alias</label>
            <input id="critAlias" class="shell-input" value="${_escAttr(c?.alias || '')}" placeholder="Valeur affichée dans les listes déroulantes (ex. C / M / m)">
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
            <input id="tcItem" class="shell-input" value="${_escAttr(t?.item || '')}" placeholder="Isolé / Récurrent">
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
