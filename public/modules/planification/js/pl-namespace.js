/* Module « Plans de Surveillance » — surface publique
   Point d'entrée unique du module, à charger en dernier.

   Les gestionnaires `onclick` des gabarits appellent encore les fonctions
   globales : la portée globale reste donc partagée. `window.PL` en est la
   façade documentée — c'est elle, et elle seule, que le portail, le chrome
   partagé ou un autre module doivent utiliser.
   ─────────────────────────────────────────────────────────────────────── */

window.PL = {
  code: 'PLAN',
  // Cycle de vie
  init: window.initPlanificationModule,
  // État
  get state() { return window.PLAN_STATE; },
  // Navigation
  navigateTo: window.planNavigateTo,
  renderPage: window.planRenderPage,
  // Vues principales
  vues: {
    dashboard: typeof planRenderDashboard === 'function' ? planRenderDashboard : null,
    prestataires: typeof planRenderPrestataires === 'function' ? planRenderPrestataires : null,
    plans: typeof planRenderPlans === 'function' ? planRenderPlans : null,
    calendrier: typeof planRenderCalendar === 'function' ? planRenderCalendar : null,
    validation: typeof planRenderWorkflow === 'function' ? planRenderWorkflow : null,
    historique: typeof planRenderHistory === 'function' ? planRenderHistory : null,
  },
};
