// OASIS — « Planification » : le calendrier, publié pour les fichiers restés
// en JavaScript (ADR-003, 5.c — n° 5.f.104).
//
// `pl-calendrier.js` posait sept fonctions et deux constantes au premier
// niveau. **Une seule** est lue hors du module : `planRenderCalendar`, par le
// volet que `pl-shell.js` ouvre. Les gestes de ses gabarits n'appellent aucun
// de ses noms — ils écrivent `PLAN_STATE` et rappellent `planRenderPage`, qui
// vivent ailleurs. Ce sas pose donc ce seul nom ; les huit autres quittent la
// portée globale, et la photographie du volet le vérifie.
import { planRenderCalendar } from '../calendrier';

declare global {
  interface Window {
    /** Le calendrier — posé sur la seule page de PLAN. */
    planRenderCalendar?: typeof planRenderCalendar;
  }
}

window.planRenderCalendar = planRenderCalendar;
