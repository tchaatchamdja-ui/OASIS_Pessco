// OASIS — « Planification de la Surveillance » : sa façade, `window.PL`
// (ADR-003, 5.c — n° 5.f.102).
//
// Le point d'entrée documenté du module : « c'est elle, et elle seule, que le
// portail, le chrome partagé ou un autre module doivent utiliser », disait
// `pl-namespace.js`. **Mesuré le 14 novembre 2026 : aucun fichier du dépôt ne
// la lit.** Elle est convertie telle quelle — retirer un nom n'est pas l'objet
// d'une conversion —, et son absence de lecteur est dite ici pour qu'on la
// pèse le jour où PLAN n'aura plus de fichier en JavaScript.
//
// ── Ce qu'elle capture, et quand ──
//
// Les fonctions sont lues **au chargement de ce sas**, à la position de
// l'ancien fichier : après `pl-actions.js`, avant que la page n'enveloppe
// `planNavigateTo` pour prévenir son hôte. `PL.navigateTo` est donc la fonction
// d'origine, non l'enveloppe — c'était vrai avant, la photographie de la page le
// vérifie, et le sas le garde. `state` est un accesseur : il rend l'état vivant.
//
// Les noms qu'elle lit sont définis par des fichiers restés en JavaScript :
// voir `../restant.d.ts`.
type Rendu = (() => string) | null;

/** La façade du module. */
export interface FacadePlan {
  code: 'PLAN';
  init: (() => void) | undefined;
  readonly state: unknown;
  navigateTo: ((page: string, sub?: string) => void) | undefined;
  renderPage: (() => void) | undefined;
  vues: Record<'dashboard' | 'prestataires' | 'plans' | 'calendrier' | 'validation' | 'historique', Rendu>;
}

declare global {
  interface Window {
    /** La façade de PLAN — posée sur sa seule page. */
    PL?: FacadePlan;
  }
}

const rendu = (f: (() => string) | undefined): Rendu => (typeof f === 'function' ? f : null);

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
    dashboard: rendu(window.planRenderDashboard),
    prestataires: rendu(window.planRenderPrestataires),
    plans: rendu(window.planRenderPlans),
    calendrier: rendu(window.planRenderCalendar),
    validation: rendu(window.planRenderWorkflow),
    historique: rendu(window.planRenderHistory),
  },
};
