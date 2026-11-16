// OASIS — « Planification » : la page de validation et l'historique, publiés
// pour les fichiers restés en JavaScript (ADR-003, 5.c — n° 5.f.105).
//
// `pl-validation.js` posait dix noms au premier niveau. Trois sont lus hors du
// module : les deux pages par l'aiguillage de `pl-shell.js` et la façade `PL`,
// et `_normalizeList` par `pl-actions.js`. Les sept autres — les champs
// comparés et le calcul des écarts entre versions — quittent la portée globale.
import { _normalizeList, planRenderHistory, planRenderWorkflow } from '../validation';

declare global {
  interface Window {
    /** La page de validation — posée sur la seule page de PLAN. */
    planRenderWorkflow?: typeof planRenderWorkflow;
    /** L'historique des plans. */
    planRenderHistory?: typeof planRenderHistory;
    /** Une liste, quelle que soit sa forme stockée. */
    _normalizeList?: typeof _normalizeList;
  }
}

window.planRenderWorkflow = planRenderWorkflow;
window.planRenderHistory = planRenderHistory;
window._normalizeList = _normalizeList;
