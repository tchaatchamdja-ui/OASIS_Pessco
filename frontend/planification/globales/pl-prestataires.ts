// OASIS — « Planification » : la page des profils de risque, publiée pour les
// fichiers restés en JavaScript (ADR-003, 5.c — n° 5.f.104).
//
// ── La surface, mesurée ──
//
// `pl-prestataires.js` posait neuf fonctions sur `window`. Huit sont lues hors
// du module : `planRenderPrestataires` par l'aiguillage de `pl-shell.js`, les
// sept autres par les `onclick` et `onchange` de son propre balisage — la page,
// la fenêtre d'ajout d'un profil. La neuvième, `_parseSADetails`, n'est lue par
// personne d'autre, et quitte la portée globale : c'est la différence déclarée,
// que la photographie de la page vérifie.
import {
  planPrestBasculer, planRenderPrestataires, planRPFillDefaults, planRPRenderSARows,
  planSaveRiskProfile, planShowAddRiskProfileModal, planSyncPrestatairesRisques, planUpdateCycleDate,
} from '../prestataires';

declare global {
  interface Window {
    /** La page des profils de risque — posée sur la seule page de PLAN. */
    planRenderPrestataires?: typeof planRenderPrestataires;
    /** Le volet des sous-activités d'un prestataire. */
    planPrestBasculer?: typeof planPrestBasculer;
    /** Une date de cycle, saisie en ligne. */
    planUpdateCycleDate?: typeof planUpdateCycleDate;
    /** La fenêtre d'ajout d'un profil. */
    planShowAddRiskProfileModal?: typeof planShowAddRiskProfileModal;
    /** Le secteur repris du prestataire choisi. */
    planRPFillDefaults?: typeof planRPFillDefaults;
    /** Les lignes de sous-activités du secteur. */
    planRPRenderSARows?: typeof planRPRenderSARows;
    /** L'enregistrement du profil. */
    planSaveRiskProfile?: typeof planSaveRiskProfile;
    /** La relecture des profils validés. */
    planSyncPrestatairesRisques?: typeof planSyncPrestatairesRisques;
  }
}

window.planRenderPrestataires = planRenderPrestataires;
window.planPrestBasculer = planPrestBasculer;
window.planUpdateCycleDate = planUpdateCycleDate;
window.planShowAddRiskProfileModal = planShowAddRiskProfileModal;
window.planRPFillDefaults = planRPFillDefaults;
window.planRPRenderSARows = planRPRenderSARows;
window.planSaveRiskProfile = planSaveRiskProfile;
window.planSyncPrestatairesRisques = planSyncPrestatairesRisques;
