// OASIS — « Planification de la Surveillance » : ce que les fichiers restés en
// JavaScript définissent, et que les fichiers convertis lisent.
//
// La frontière de la cohabitation, écrite à un seul endroit. Un `function` de
// premier niveau d'un script classique se pose sur `window` : les fichiers
// convertis l'y lisent. Le TypeScript ne peut pas les voir — il n'y a rien à
// importer —, il les **déclare**.
//
// **Tous optionnels**, parce que c'est la vérité : le programme TypeScript est
// un seul ensemble, et ces noms n'existent que sur la page de PLAN, une fois
// ses scripts chargés. Chaque ligne part avec la conversion du fichier qui
// définit le nom : alors c'est lui, et lui seul, qui le déclarera — la règle de
// 5.b (ADR-003, n° 5.f.102).
declare global {
  interface Window {
    /** `pl-shell.js` — le démarrage en mode hébergé (PESSCO). */
    initPlanificationModule?: () => void;
    /** `pl-shell.js` — aller à une page de l'écran. */
    planNavigateTo?: (page: string, sub?: string) => void;
    /** `pl-shell.js` — redessiner la page courante. */
    planRenderPage?: () => void;
    /** `pl-dashboard.js` — la page d'accueil. */
    planRenderDashboard?: () => string;
    /** `pl-prestataires.js` — les profils de risque. */
    planRenderPrestataires?: () => string;
    /** `pl-plans.js` — la liste des plans. */
    planRenderPlans?: () => string;
    /** `pl-calendrier.js` — le calendrier. */
    planRenderCalendar?: () => string;
    /** `pl-validation.js` — la page de validation. */
    planRenderWorkflow?: () => string;
    /** `pl-validation.js` — l'historique. */
    planRenderHistory?: () => string;
    /** `pl-crud.js` — un message éphémère. */
    planShowEphemeralToast?: (message: string, type?: string, duration?: number) => void;
  }
}

export {};
