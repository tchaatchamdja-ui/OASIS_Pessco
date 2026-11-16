// OASIS — « Planification » : la liste des plans et le détail d'un plan,
// publiés pour les fichiers restés en JavaScript (ADR-003, 5.c — n° 5.f.106).
//
// `pl-plans.js` posait dix-neuf noms, dont quatre sur `window` à la main.
// Huit sont lus hors du module : les deux pages par l'aiguillage de
// `pl-shell.js` et la façade `PL` — retirée depuis (n° 5.f.111) ; `planOpenDetail` par quatre fichiers et
// une dizaine de gabarits ; `_applyRoleFilter` par le tableau de bord ;
// l'accordéon — `planAccBasculer`, `planAccClavier` — par les en-têtes que
// trois pages dessinent ; le tri, `_planSortBy`, par les en-têtes de la table,
// et son état `_planTableSort`, posé sur `window` dès l'origine et relu à chaque
// usage. Les onze autres quittent la portée globale.
import {
  _applyRoleFilter, _planSortBy, planAccBasculer, planAccClavier, planRenderPlans,
} from '../liste-plans';
import { planOpenDetail, planRenderPlanDetail } from '../detail-plan';

declare global {
  interface Window {
    /** La liste des plans — posée sur la seule page de PLAN. */
    planRenderPlans?: typeof planRenderPlans;
    /** Le détail du plan ouvert. */
    planRenderPlanDetail?: typeof planRenderPlanDetail;
    /** Ouvrir un plan : le charger, puis rendre son détail. */
    planOpenDetail?: typeof planOpenDetail;
    /** Les plans que le privilège du compte laisse voir. */
    _applyRoleFilter?: typeof _applyRoleFilter;
    /** Un en-tête d'accordéon, ouvert ou refermé. */
    planAccBasculer?: typeof planAccBasculer;
    /** Le même, au clavier. */
    planAccClavier?: typeof planAccClavier;
    /** La table des plans triée par une colonne. */
    _planSortBy?: typeof _planSortBy;
    /** L'état du tri de la table des plans. */
    _planTableSort?: { col: string; dir: string };
  }
}

window._planTableSort = { col: 'annee', dir: 'desc' };
window.planRenderPlans = planRenderPlans;
window.planRenderPlanDetail = planRenderPlanDetail;
window.planOpenDetail = planOpenDetail;
window._applyRoleFilter = _applyRoleFilter;
window.planAccBasculer = planAccBasculer;
window.planAccClavier = planAccClavier;
window._planSortBy = _planSortBy;
