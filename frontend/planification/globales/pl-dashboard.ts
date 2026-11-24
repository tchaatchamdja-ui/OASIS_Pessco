// OASIS — « Planification » : le tableau de bord, publié pour les fichiers
// restés en JavaScript (ADR-003, 5.c — n° 5.f.105).
//
// `pl-dashboard.js` posait onze noms au premier niveau. Trois sont lus hors du
// module : `planRenderDashboard` par l'aiguillage de `pl-shell.js` et la façade
// `PL` — retirée depuis (n° 5.f.111) —, `_applyPlanFilters` par `pl-plans.js` et la page de validation, et
// `planChoisirCarte` par le `onClick` que chaque carte d'indicateur porte. Ce
// sas pose ces trois-là ; les huit autres quittent la portée globale.
import { _applyPlanFilters, planChoisirCarte, planRenderDashboard } from '../tableau-de-bord';

declare global {
  interface Window {
    /** Le tableau de bord — posé sur la seule page de PLAN. */
    planRenderDashboard?: typeof planRenderDashboard;
    /** Une carte d'indicateur choisie, ou refermée. */
    planChoisirCarte?: typeof planChoisirCarte;
    /** Les filtres de la barre appliqués à une liste de plans. */
    _applyPlanFilters?: typeof _applyPlanFilters;
  }
}

window.planRenderDashboard = planRenderDashboard;
window.planChoisirCarte = planChoisirCarte;
window._applyPlanFilters = _applyPlanFilters;
