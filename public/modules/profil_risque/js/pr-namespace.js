/* Module « Profils de Risques » — surface publique
   Point d'entrée unique du module, à charger en dernier.

   Les gestionnaires `onclick` des gabarits appellent encore les fonctions
   globales : la portée globale reste donc partagée. `window.PR` en est la
   façade documentée — c'est elle, et elle seule, que le portail, le chrome
   partagé ou un autre module doivent utiliser.
   ─────────────────────────────────────────────────────────────────────── */

window.PR = {
  code: 'PR',
  // Cycle de vie
  init: window.initProfilRisqueModule,
  // État
  get state() { return window.APP_STATE; },
  // Navigation
  navigateTo: window.navigateTo,
  renderPage: window.renderPage,
  // Vues principales
  vues: {
    dashboard: typeof renderDashboard === 'function' ? renderDashboard : null,
    profils: typeof renderProfils === 'function' ? renderProfils : null,
    evaluations: typeof renderEvaluations === 'function' ? renderEvaluations : null,
    bibliotheque: typeof renderBibliotheque === 'function' ? renderBibliotheque : null,
    parametres: typeof renderParametres === 'function' ? renderParametres : null,
  },
};
