// OASIS — « Planification » : les fenêtres de saisie — un plan, une activité,
// la synchronisation des risques —, publiées pour les fichiers restés en
// JavaScript (ADR-003, 5.c — n° 5.f.107).
//
// `pl-crud.js` posait vingt-deux fonctions au premier niveau. Dix-huit sont
// lues hors du module : onze par d'autres fichiers — la liste des plans, son
// détail, « Mes activités », les profils de risque, l'instance —, et les autres
// par les boutons que ses propres fenêtres portent : « Enregistrer » d'un plan
// créé ou modifié, d'une activité — composé selon qu'elle est neuve ou non —,
// « Appliquer » d'une synchronisation, le tri d'une table de thèmes, et
// « Activité pour ce prestataire ». Les quatre autres — la fin déduite d'une
// durée, la liaison des dates, l'année d'une activité, la lecture du
// formulaire — quittent la portée globale.
import {
  planApplySyncSelection, planArchivePlan, planCreatePlan, planDeletePlan, planOpenDetailForPrestataire,
  planPrestThemesPanel, planShowCreateModal, planShowEditModal, planShowEphemeralToast, planSortThemeTable,
  planSyncRisksSelective, planTogglePrestRow, planUpdatePlan,
} from '../saisie-plan';
import {
  _planDureeEntre, planCreateActivity, planDeleteActivity, planShowActivityModal, planUpdateActivity,
} from '../saisie-activite';

declare global {
  interface Window {
    /** La fenêtre de création d'un plan — posée sur la seule page de PLAN. */
    planShowCreateModal?: typeof planShowCreateModal;
    /** Le volet des prestataires du secteur d'un plan périodique. */
    planPrestThemesPanel?: typeof planPrestThemesPanel;
    /** Une table de thèmes triée sur place. */
    planSortThemeTable?: typeof planSortThemeTable;
    /** Le volet d'un plan déplié ou replié. */
    planTogglePrestRow?: typeof planTogglePrestRow;
    /** Le plan ouvert avec un prestataire mémorisé. */
    planOpenDetailForPrestataire?: typeof planOpenDetailForPrestataire;
    /** L'enregistrement d'un plan créé. */
    planCreatePlan?: typeof planCreatePlan;
    /** La fenêtre d'édition d'un plan. */
    planShowEditModal?: typeof planShowEditModal;
    /** L'enregistrement d'un plan modifié. */
    planUpdatePlan?: typeof planUpdatePlan;
    /** La suppression d'un plan, sur confirmation. */
    planDeletePlan?: typeof planDeletePlan;
    /** L'archivage d'un plan, sur confirmation. */
    planArchivePlan?: typeof planArchivePlan;
    /** La durée d'une activité, en jours. */
    _planDureeEntre?: typeof _planDureeEntre;
    /** La fenêtre d'une activité — saisie ou lecture. */
    planShowActivityModal?: typeof planShowActivityModal;
    /** L'enregistrement d'une activité neuve. */
    planCreateActivity?: typeof planCreateActivity;
    /** L'enregistrement d'une activité modifiée. */
    planUpdateActivity?: typeof planUpdateActivity;
    /** La suppression d'une activité, sur confirmation. */
    planDeleteActivity?: typeof planDeleteActivity;
    /** Un message éphémère. */
    planShowEphemeralToast?: typeof planShowEphemeralToast;
    /** Les écarts de risque d'un plan, à synchroniser. */
    planSyncRisksSelective?: typeof planSyncRisksSelective;
    /** La synchronisation des écarts retenus. */
    planApplySyncSelection?: typeof planApplySyncSelection;
  }
}

window.planShowCreateModal = planShowCreateModal;
window.planPrestThemesPanel = planPrestThemesPanel;
window.planSortThemeTable = planSortThemeTable;
window.planTogglePrestRow = planTogglePrestRow;
window.planOpenDetailForPrestataire = planOpenDetailForPrestataire;
window.planCreatePlan = planCreatePlan;
window.planShowEditModal = planShowEditModal;
window.planUpdatePlan = planUpdatePlan;
window.planDeletePlan = planDeletePlan;
window.planArchivePlan = planArchivePlan;
window._planDureeEntre = _planDureeEntre;
window.planShowActivityModal = planShowActivityModal;
window.planCreateActivity = planCreateActivity;
window.planUpdateActivity = planUpdateActivity;
window.planDeleteActivity = planDeleteActivity;
window.planShowEphemeralToast = planShowEphemeralToast;
window.planSyncRisksSelective = planSyncRisksSelective;
window.planApplySyncSelection = planApplySyncSelection;
