/* Module « Exécution de la Surveillance » — surface publique.
   Façade documentée du module ; les gabarits continuent d'appeler les
   fonctions globales reprises de PESSCO.
   ─────────────────────────────────────────────────────────────────────── */

window.EXEC = {
  code: 'SURV',
  init: window.initExecutionModule,
  get state() { return window.EXEC_STATE; },
  navigateTo: window.execNavigateTo,
  renderPage: window.execRenderPage,
  vues: {
    dashboard: typeof execRenderDashboard === 'function' ? execRenderDashboard : null,
    plan_surveillance: typeof execRenderPlans === 'function' ? execRenderPlans : null,
    declenchement: typeof execRenderDeclenchement === 'function' ? execRenderDeclenchement : null,
    execution: typeof execRenderExecution === 'function' ? execRenderExecution : null,
    prestataires: typeof execRenderPrestataires === 'function' ? execRenderPrestataires : null,
    constatations: typeof execRenderConstatations === 'function' ? execRenderConstatations : null,
    rapports: typeof execRenderRapports === 'function' ? execRenderRapports : null,
    parametres: typeof execRenderParametres === 'function' ? execRenderParametres : null,
    mes_utilisateurs: typeof execRenderMesUtilisateurs === 'function' ? execRenderMesUtilisateurs : null,
    prestataire_home: typeof execRenderPrestataireHome === 'function' ? execRenderPrestataireHome : null,
    prestataire_notifications: typeof execRenderPrestataireNotifications === 'function' ? execRenderPrestataireNotifications : null,
  },
};
