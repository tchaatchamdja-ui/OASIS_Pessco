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
    /** `pl-plans.js` — la liste des plans. */
    planRenderPlans?: () => string;
    /** `pl-validation.js` — la page de validation. */
    planRenderWorkflow?: () => string;
    /** `pl-validation.js` — l'historique. */
    planRenderHistory?: () => string;
    /** `pl-crud.js` — un message éphémère. */
    planShowEphemeralToast?: (message: string, type?: string, duration?: number) => void;
    /** `pl-crud.js` — la fenêtre d'une activité. */
    planShowActivityModal?: (planId: string, actId?: string, options?: { lecture?: boolean }) => void;
    /** `pl-crud.js` — la durée d'une activité, en jours. */
    _planDureeEntre?: (debut: unknown, fin: unknown) => number | string;
    /** `pl-shell.js` — une date au format du module. */
    planDateFr?: (valeur: unknown) => string;
    /** `pl-actions.js` — l'échappement d'un texte pour le balisage. */
    _esc?: (valeur: unknown) => string;
    /** `pl-actions.js` — la pastille d'un niveau de risque. */
    _riskBadge?: (libelle: unknown) => string;
    /** `pl-shell.js` — le privilège de validation, sur un secteur ou en général. */
    _canValidate?: (secteurId?: string) => boolean;
    /** `pl-shell.js` — la barre de filtres d'une page. */
    _renderFilterBar?: (surChangement: string, options?: Record<string, boolean>) => string;
    /** `pl-shell.js` — la fenêtre modale du module. */
    planShowModal?: (titre: string, corps: string, pied?: string, taille?: string) => void;
    /** `pl-shell.js` — la refermer. */
    planCloseModal?: () => void;
    /** `pl-shell.js` — recharger les données de l'écran. */
    planLoadData?: () => Promise<void>;
    /** `pl-actions.js` — la teinte d'un organisme, stable d'une vue à l'autre. */
    _prestataireColor?: (prestataireId: string | undefined) => string;
    /** `pl-calendrier-bord.js` — le diagramme de l'année. */
    _planCalendrierHtml?: (activites: unknown[], options: Record<string, unknown>) => string;
    /** `pl-shell.js` — les boutons d'années d'une barre de filtres. */
    _planBoutonsAnnees?: (annees: unknown[], retenue: string, geste: (a: unknown) => string) => string;
  }

  /**
   * `pl-shell.js` — les icônes du module. Un `const` de premier niveau : une
   * globale **lexicale**, que l'on atteint par son nom et qui n'est pas sur
   * `window`.
   */
  const PLAN_ICONS: Record<string, string>;
}

export {};
